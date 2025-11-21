import { User, TimeEntry, AbsenceRequest, Anomaly, AnomalyType, AbsenceStatus } from '../types';
import { getHolidays } from './holidays';

// Helper: Datum zu YYYY-MM-DD String
const toISOString = (date: Date) => {
  const offset = date.getTimezoneOffset();
  const adjusted = new Date(date.getTime() - (offset * 60 * 1000));
  return adjusted.toISOString().split('T')[0];
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
  const todayStr = toISOString(today);

  while (currentDate <= endDate) {
      // Nicht in die Zukunft schauen (außer für Überlast, aber das ist unwahrscheinlich)
      if (currentDate > today) break;

      const dateStr = toISOString(currentDate);
      
      // 1. Daten für diesen Tag sammeln
      // TimeEntry startTime ist ISO String (z.B. 2023-10-27T09:00:00)
      const dailyEntries = timeEntries.filter(e => {
          return e.user.id === user.id && e.startTime.startsWith(dateStr);
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

      // Nächster Tag
      currentDate.setDate(currentDate.getDate() + 1);
  }
  
  return anomalies;
}
