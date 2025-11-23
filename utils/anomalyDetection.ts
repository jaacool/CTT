import { User, TimeEntry, AbsenceRequest, Anomaly, AnomalyType, AbsenceStatus } from '../types';
import { getHolidays } from './holidays';

// Helper: Datum zu YYYY-MM-DD String in Berlin Zeit
const toBerlinISOString = (date: Date): string => {
  // Nutze toLocaleString mit Europe/Berlin Zeitzone
  const berlinStr = date.toLocaleString('en-CA', { 
    timeZone: 'Europe/Berlin',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
  // en-CA gibt uns YYYY-MM-DD Format
  return berlinStr;
};

// Helper: Hole Stunde in Berlin Zeit
const getBerlinHour = (date: Date): number => {
  const berlinStr = date.toLocaleString('en-US', {
    timeZone: 'Europe/Berlin',
    hour: '2-digit',
    hour12: false
  });
  return parseInt(berlinStr);
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
  
  // PERFORMANCE: Filtere timeEntries einmal am Anfang für diesen User
  const userEntries = timeEntries.filter(e => e.user.id === user.id);
  
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
      const dailyEntries = userEntries.filter(e => {
          // Prüfe ob der Eintrag in Berlin-Zeit an diesem Tag startet
          const berlinStart = toBerlinISOString(new Date(e.startTime));
          return berlinStart === dateStr;
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

      // 5. Stoppen vergessen - Gilt für ALLE User inkl. Admins
      // Ein Eintrag ist eine Anomalie wenn:
      // - Er über Nacht läuft (Start-Datum ≠ End-Datum)
      // - UND er den Zeitraum 0-6 Uhr überschneidet
      // - UND die Gesamtdauer ≥ 6h ist
      // - UND mindestens 6h innerhalb des 0-6 Uhr Fensters liegen
      // WICHTIG: Anomalie wird für das START-Datum geloggt (da wurde vergessen zu stoppen)
      const nightEntry = userEntries.find(entry => {
        const startTime = new Date(entry.startTime);
        const startDateStr = toBerlinISOString(startTime);
        
        // FALL 1: Laufender Timer (kein endTime)
        if (!entry.endTime) {
          // Nur wenn Timer an diesem Tag gestartet wurde
          if (startDateStr !== dateStr) return false;
          if (!isToday) return false;
          
          // Berechne wie lange der Timer im 0-6 Uhr Fenster von morgen läuft
          const now = new Date();
          const tomorrow = new Date(now);
          tomorrow.setDate(tomorrow.getDate() + 1);
          const tomorrowMidnight = new Date(tomorrow);
          tomorrowMidnight.setHours(0, 0, 0, 0);
          const tomorrow6AM = new Date(tomorrow);
          tomorrow6AM.setHours(6, 0, 0, 0);
          
          // Wenn Timer noch nicht bis morgen läuft, keine Anomalie
          if (now < tomorrowMidnight) return false;
          
          // Timer läuft seit heute, also zählt die Zeit von morgen 0:00 bis jetzt (max 6:00)
          const effectiveEnd = now < tomorrow6AM ? now : tomorrow6AM;
          const hoursInWindow = (effectiveEnd.getTime() - tomorrowMidnight.getTime()) / (1000 * 60 * 60);
          
          // Gesamtdauer
          const totalHours = (now.getTime() - startTime.getTime()) / (1000 * 60 * 60);
          
          return totalHours >= 6 && hoursInWindow >= 6;
        }
        
        // FALL 2: Beendeter Eintrag
        const endTime = new Date(entry.endTime);
        const endDateStr = toBerlinISOString(endTime);
        
        // Muss über Nacht laufen
        if (startDateStr === endDateStr) return false;
        
        // Muss an diesem Tag STARTEN (nicht enden!)
        if (startDateStr !== dateStr) return false;
        
        // Gesamtdauer muss >= 6h sein
        const totalHours = (endTime.getTime() - startTime.getTime()) / (1000 * 60 * 60);
        if (totalHours < 6) return false;
        
        // Berechne wie viel Zeit im 0-6 Uhr Fenster liegt (am Folgetag)
        const endDateMidnight = new Date(endTime);
        endDateMidnight.setHours(0, 0, 0, 0);
        const endDate6AM = new Date(endTime);
        endDate6AM.setHours(6, 0, 0, 0);
        
        // Überschneidung mit 0-6 Uhr Fenster berechnen
        const windowStart = endDateMidnight;
        const windowEnd = endDate6AM;
        
        // Effektiver Start im Fenster (entweder Mitternacht oder tatsächlicher Start)
        const effectiveStart = startTime > windowStart ? startTime : windowStart;
        // Effektives Ende im Fenster (entweder 6 Uhr oder tatsächliches Ende)
        const effectiveEnd = endTime < windowEnd ? endTime : windowEnd;
        
        // Wenn kein Overlap, dann false
        if (effectiveStart >= effectiveEnd) return false;
        
        const hoursInWindow = (effectiveEnd.getTime() - effectiveStart.getTime()) / (1000 * 60 * 60);
        
        return hoursInWindow >= 6;
      });
      
      if (nightEntry) {
        anomalies.push({
          date: dateStr, // dateStr ist hier das START-Datum
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
