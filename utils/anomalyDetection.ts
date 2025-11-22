import { User, TimeEntry, AbsenceRequest, Anomaly, AnomalyType, AbsenceStatus } from '../types';
import { getHolidays } from './holidays';

// Helper: Datum explizit als Europe/Berlin interpretieren
const toBerlinDate = (dateStr: string | Date): Date => {
  const date = new Date(dateStr);
  // Wir nutzen die Intl API um die Zeit in Berlin zu bekommen
  const berlinDateStr = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Europe/Berlin',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  }).format(date);
  
  // Parse den Berlin-String zurück in ein Date Objekt (lokal)
  // Format von Intl ist MM/DD/YYYY, HH:mm:ss
  const [datePart, timePart] = berlinDateStr.split(', ');
  const [month, day, year] = datePart.split('/');
  const [hour, minute, second] = timePart.split(':');
  
  return new Date(
    parseInt(year),
    parseInt(month) - 1,
    parseInt(day),
    parseInt(hour === '24' ? '0' : hour),
    parseInt(minute),
    parseInt(second)
  );
};

// Helper: Datum zu YYYY-MM-DD String in Berlin Zeit
const toBerlinISOString = (date: Date) => {
  const berlinDate = toBerlinDate(date);
  const year = berlinDate.getFullYear();
  const month = String(berlinDate.getMonth() + 1).padStart(2, '0');
  const day = String(berlinDate.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export function detectAnomalies(
  user: User,
  timeEntries: TimeEntry[],
  absenceRequests: AbsenceRequest[],
  startDate: Date,
  endDate: Date
): Anomaly[] {
  const anomalies: Anomaly[] = [];
  const holidays = getHolidays(startDate.getFullYear());
  
  // Klone Startdatum um nicht zu mutieren
  let currentDate = new Date(startDate);
  const today = new Date();
  const todayStr = toBerlinISOString(today);

  while (currentDate <= endDate) {
      // Nicht in die Zukunft schauen (außer für Überlast, aber das ist unwahrscheinlich)
      if (currentDate > today) break;

      const dateStr = toBerlinISOString(currentDate);
      
      // 1. Daten für diesen Tag sammeln
      // TimeEntry startTime ist ISO String (z.B. 2023-10-27T09:00:00)
      const dailyEntries = timeEntries.filter(e => {
          // Prüfe ob der Eintrag in Berlin-Zeit an diesem Tag startet
          const berlinStart = toBerlinISOString(new Date(e.startTime));
          return e.user.id === user.id && berlinStart === dateStr;
      });
      
      // Summe Stunden
      const trackedSeconds = dailyEntries.reduce((sum, e) => sum + e.duration, 0);
      const trackedHours = Math.round((trackedSeconds / 3600) * 10) / 10;
      
      // Check ob Dreh/Produktion
      const hasShoot = dailyEntries.some(e => {
          const text = (
              (e.taskTitle || '') + 
              (e.listTitle || '') + 
              (e.projectName || '') + 
              (e.note || '')
          ).toLowerCase();
          return text.includes('dreh') || text.includes('produktion');
      });
      
      // 2. Prüfen ob Arbeitstag/Feiertag/Urlaub
      const isHoliday = holidays.has(dateStr);
      
      // Wochentag (0=So, 1=Mo...)
      const dayOfWeek = currentDate.getDay();
      
      // Ist es ein regulärer Arbeitstag laut Schedule?
      let isWorkDay = false;
      if (user.workSchedule) {
          if (dayOfWeek === 1 && user.workSchedule.monday) isWorkDay = true;
          if (dayOfWeek === 2 && user.workSchedule.tuesday) isWorkDay = true;
          if (dayOfWeek === 3 && user.workSchedule.wednesday) isWorkDay = true;
          if (dayOfWeek === 4 && user.workSchedule.thursday) isWorkDay = true;
          if (dayOfWeek === 5 && user.workSchedule.friday) isWorkDay = true;
          if (dayOfWeek === 6 && user.workSchedule.saturday) isWorkDay = true;
          if (dayOfWeek === 0 && user.workSchedule.sunday) isWorkDay = true;
      } else {
          // Fallback: Mo-Fr
          isWorkDay = dayOfWeek >= 1 && dayOfWeek <= 5;
      }

      // Prüfe Abwesenheit
      // AbsenceRequest Dates sind oft ISO Strings. Wir normalisieren auf YYYY-MM-DD
      const absence = absenceRequests.find(req => {
        if (req.user.id !== user.id) return false;
        if (req.status !== AbsenceStatus.Approved) return false;
        
        const reqStart = req.startDate.split('T')[0];
        const reqEnd = req.endDate.split('T')[0];
        
        return reqStart <= dateStr && reqEnd >= dateStr;
      });
      
      const dailyTarget = user.workSchedule?.hoursPerDay || 8;

      // --- ANALYSE REGELN ---

      // Nur prüfen wenn Tag schon vorbei ist (oder heute)
      // Für "Missing Entry" sollten wir warten bis der Tag vorbei ist, oder? 
      // Nein, User will "Anomalien Erkennung". Wenn heute 18 Uhr ist und 0h getrackt, ist das auffällig.
      // Aber "Missing Entry" für HEUTE ist nervig. Besser nur bis GESTERN prüfen für "Missing".
      
      const isToday = dateStr === todayStr;

      // 1. Missing Entry (Nur für vergangene Tage)
      if (!isToday && isWorkDay && !isHoliday && !absence && trackedHours === 0) {
          anomalies.push({
              date: dateStr,
              userId: user.id,
              type: AnomalyType.MISSING_ENTRY,
              details: { trackedHours, targetHours: dailyTarget, hasShoot }
          });
      }

      // 2. Überlast Dreh (> 15h)
      if (trackedHours > 0 && hasShoot && trackedHours > 15) {
          anomalies.push({
              date: dateStr,
              userId: user.id,
              type: AnomalyType.EXCESS_WORK_SHOOT,
              details: { trackedHours, targetHours: dailyTarget, hasShoot }
          });
      }

      // 3. Überlast Büro (> 9h)
      if (trackedHours > 0 && !hasShoot && trackedHours > 9) {
           anomalies.push({
              date: dateStr,
              userId: user.id,
              type: AnomalyType.EXCESS_WORK_REGULAR,
              details: { trackedHours, targetHours: dailyTarget, hasShoot }
          });
      }

      // 4. Unterperformance (< 50% Soll) - Nur vergangene Tage
      if (!isToday && isWorkDay && !isHoliday && !absence && trackedHours > 0 && trackedHours < (dailyTarget * 0.5)) {
           anomalies.push({
              date: dateStr,
              userId: user.id,
              type: AnomalyType.UNDER_PERFORMANCE,
              details: { trackedHours, targetHours: dailyTarget, hasShoot }
          });
      }

      // 5. Stoppen vergessen (Zeiteinträge zwischen 0-9 Uhr) - Gilt für ALLE User inkl. Admins
      // Prüfe ALLE Einträge des Users (nicht nur dailyEntries die am aktuellen Tag starten)
      const allUserEntries = timeEntries.filter(e => e.user.id === user.id);
      const hasNightEntry = allUserEntries.some(entry => {
        if (!entry.endTime) return false; // Laufende Einträge ignorieren
        
        // Parse Start- und Endzeit in Berlin-Zeit
        const startTime = toBerlinDate(new Date(entry.startTime));
        const endTime = toBerlinDate(new Date(entry.endTime));
        
        // Prüfe ob der Eintrag am aktuellen Tag zwischen 0-9 Uhr endet (Berlin Zeit)
        const endDateStr = toBerlinISOString(new Date(entry.endTime));
        if (endDateStr !== dateStr) return false; // Nur Einträge die an diesem Tag enden
        
        // Verwende Stunden des Berlin-Dates
        const endHour = endTime.getHours();
        
        // Prüfe ob Ende zwischen 0:00 und 8:59 Uhr liegt
        const endInNightRange = endHour >= 0 && endHour < 9;
        
        // Prüfe ob der Eintrag am Vortag gestartet wurde (über Nacht)
        const startDateStr = toBerlinISOString(new Date(entry.startTime));
        const isOvernight = startDateStr !== endDateStr;
        
        return endInNightRange && isOvernight;
      });
      
      if (hasNightEntry) {
        anomalies.push({
          date: dateStr,
          userId: user.id,
          type: AnomalyType.FORGOT_TO_STOP,
          details: { trackedHours, targetHours: dailyTarget, hasShoot }
        });
      }

      // Nächster Tag
      currentDate.setDate(currentDate.getDate() + 1);
  }
  
  return anomalies;
}
