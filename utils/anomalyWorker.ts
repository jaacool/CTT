// =====================================================
// ANOMALY WORKER - Background Processing
// =====================================================
// Web Worker für nicht-blockierende Anomalie-Berechnung
// Läuft in separatem Thread und hält UI responsive

import { User, TimeEntry, AbsenceRequest, Anomaly, AnomalyType, AnomalyStatus, AbsenceStatus, UserStatus } from '../types';

// Helper: Datum zu YYYY-MM-DD String in Berlin Zeit
const toBerlinISOString = (date: Date): string => {
  const berlinStr = date.toLocaleString('en-CA', { 
    timeZone: 'Europe/Berlin',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
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

// Helper: Einfache Feiertags-Erkennung (Subset für Worker)
const getHolidays = (year: number): Set<string> => {
  const holidays = new Set<string>();
  
  // Feste Feiertage
  holidays.add(`${year}-01-01`); // Neujahr
  holidays.add(`${year}-05-01`); // Tag der Arbeit
  holidays.add(`${year}-10-03`); // Tag der Deutschen Einheit
  holidays.add(`${year}-12-25`); // 1. Weihnachtstag
  holidays.add(`${year}-12-26`); // 2. Weihnachtstag
  
  return holidays;
};

// =====================================================
// OPTIMIERTE ANOMALIE-BERECHNUNG
// =====================================================

interface AnomalyCache {
  userId: string;
  date: string;
  trackedHours: number;
  hasShoot: boolean;
  isWorkDay: boolean;
  isHoliday: boolean;
  hasAbsence: boolean;
  lastCalculated: number;
}

// Cache für bereits berechnete Tage (verhindert Re-Calculation)
const dayCache = new Map<string, AnomalyCache>();

function getCacheKey(userId: string, date: string): string {
  return `${userId}-${date}`;
}

export function detectAnomaliesOptimized(
  user: User,
  timeEntries: TimeEntry[],
  absenceRequests: AbsenceRequest[],
  startDate: Date,
  endDate: Date,
  useCache: boolean = true
): Anomaly[] {
  const anomalies: Anomaly[] = [];
  const holidays = getHolidays(startDate.getFullYear());
  
  // PERFORMANCE: Filtere timeEntries einmal am Anfang für diesen User
  const userEntries = timeEntries.filter(e => e.user.id === user.id);
  
  // OPTIMIZATION 1: Pre-Index TimeEntries by Date (O(n) statt O(n²))
  const entriesByDate = new Map<string, TimeEntry[]>();
  userEntries.forEach(entry => {
    const berlinStart = toBerlinISOString(new Date(entry.startTime));
    if (!entriesByDate.has(berlinStart)) {
      entriesByDate.set(berlinStart, []);
    }
    entriesByDate.get(berlinStart)!.push(entry);
  });
  
  // OPTIMIZATION 2: Pre-Index "Stoppen vergessen" Kandidaten
  // Nur Einträge die potenziell über Nacht laufen oder laufende Timer
  const nightCandidates = new Map<string, TimeEntry[]>();
  const today = new Date();
  const todayStr = toBerlinISOString(today);
  
  userEntries.forEach(entry => {
    const startTime = new Date(entry.startTime);
    const startDateStr = toBerlinISOString(startTime);
    
    // FALL 1: Laufender Timer (kein endTime)
    if (!entry.endTime) {
      // Nur wenn Timer vor heute gestartet wurde
      if (startDateStr < todayStr) {
        if (!nightCandidates.has(todayStr)) {
          nightCandidates.set(todayStr, []);
        }
        nightCandidates.get(todayStr)!.push(entry);
      }
      return;
    }
    
    // FALL 2: Beendeter Eintrag zwischen 0-9 Uhr
    const endTime = new Date(entry.endTime);
    const endDateStr = toBerlinISOString(endTime);
    const endHour = getBerlinHour(endTime);
    
    // Prüfe ob Ende zwischen 0:00 und 8:59 Uhr liegt UND über Nacht
    if (endHour >= 0 && endHour < 9 && startDateStr !== endDateStr) {
      if (!nightCandidates.has(endDateStr)) {
        nightCandidates.set(endDateStr, []);
      }
      nightCandidates.get(endDateStr)!.push(entry);
    }
  });
  
  // Klone Startdatum um nicht zu mutieren
  let currentDate = new Date(startDate);

  while (currentDate <= endDate) {
    // Nicht in die Zukunft schauen
    if (currentDate > today) break;

    const dateStr = toBerlinISOString(currentDate);
    const cacheKey = getCacheKey(user.id, dateStr);
    
    // OPTIMIZATION 3: Cache-Check
    const cached = dayCache.get(cacheKey);
    const now = Date.now();
    const isToday = dateStr === todayStr;
    
    // Cache ist nur für vergangene Tage gültig (heute ändert sich ständig)
    if (useCache && cached && !isToday && (now - cached.lastCalculated) < 3600000) {
      // Cache ist < 1h alt, verwende gecachte Werte
      // Anomalien werden basierend auf gecachten Werten neu erstellt
      const { trackedHours, hasShoot, isWorkDay, isHoliday, hasAbsence } = cached;
      const dailyTarget = user.workSchedule?.hoursPerDay || 8;
      
      // Wende Regeln an (ohne Re-Calculation)
      if (!isToday && isWorkDay && !isHoliday && !hasAbsence && trackedHours === 0) {
        anomalies.push({
          date: dateStr,
          userId: user.id,
          type: AnomalyType.MISSING_ENTRY,
          details: { trackedHours, targetHours: dailyTarget, hasShoot }
        });
      }
      
      if (trackedHours > 0 && hasShoot && trackedHours > 15) {
        anomalies.push({
          date: dateStr,
          userId: user.id,
          type: AnomalyType.EXCESS_WORK_SHOOT,
          details: { trackedHours, targetHours: dailyTarget, hasShoot }
        });
      }
      
      if (trackedHours > 0 && !hasShoot && trackedHours > 9) {
        anomalies.push({
          date: dateStr,
          userId: user.id,
          type: AnomalyType.EXCESS_WORK_REGULAR,
          details: { trackedHours, targetHours: dailyTarget, hasShoot }
        });
      }
      
      if (!isToday && isWorkDay && !isHoliday && !hasAbsence && trackedHours > 0 && trackedHours < (dailyTarget * 0.5)) {
        anomalies.push({
          date: dateStr,
          userId: user.id,
          type: AnomalyType.UNDER_PERFORMANCE,
          details: { trackedHours, targetHours: dailyTarget, hasShoot }
        });
      }
      
      // Stoppen vergessen prüfen (immer neu, da sich Timer ändern können)
      const hasNightEntry = nightCandidates.has(dateStr);
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
      continue;
    }
    
    // FULL CALCULATION (Cache Miss oder heute)
    
    // 1. Daten für diesen Tag sammeln (O(1) durch Pre-Indexing)
    const dailyEntries = entriesByDate.get(dateStr) || [];
    
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
    const absence = absenceRequests.find(req => {
      if (req.user.id !== user.id) return false;
      if (req.status !== AbsenceStatus.Approved) return false; // Nur genehmigte Abwesenheiten
      
      const reqStart = req.startDate.split('T')[0];
      const reqEnd = req.endDate.split('T')[0];
      
      return reqStart <= dateStr && reqEnd >= dateStr;
    });
    
    const hasAbsence = !!absence;
    const dailyTarget = user.workSchedule?.hoursPerDay || 8;

    // OPTIMIZATION 4: Cache Update (nur für vergangene Tage)
    if (!isToday) {
      dayCache.set(cacheKey, {
        userId: user.id,
        date: dateStr,
        trackedHours,
        hasShoot,
        isWorkDay,
        isHoliday,
        hasAbsence,
        lastCalculated: now
      });
    }

    // --- ANALYSE REGELN ---

    // 1. Missing Entry (Nur für vergangene Tage)
    if (!isToday && isWorkDay && !isHoliday && !hasAbsence && trackedHours === 0) {
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
    if (!isToday && isWorkDay && !isHoliday && !hasAbsence && trackedHours > 0 && trackedHours < (dailyTarget * 0.5)) {
      anomalies.push({
        date: dateStr,
        userId: user.id,
        type: AnomalyType.UNDER_PERFORMANCE,
        details: { trackedHours, targetHours: dailyTarget, hasShoot }
      });
    }

    // 5. Stoppen vergessen (O(1) durch Pre-Indexing)
    const hasNightEntry = nightCandidates.has(dateStr);
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

// =====================================================
// CACHE MANAGEMENT
// =====================================================

export function clearAnomalyCache(): void {
  dayCache.clear();
}

export function invalidateCacheForUser(userId: string): void {
  const keysToDelete: string[] = [];
  dayCache.forEach((_, key) => {
    if (key.startsWith(`${userId}-`)) {
      keysToDelete.push(key);
    }
  });
  keysToDelete.forEach(key => dayCache.delete(key));
}

export function invalidateCacheForDate(date: string): void {
  const keysToDelete: string[] = [];
  dayCache.forEach((_, key) => {
    if (key.endsWith(`-${date}`)) {
      keysToDelete.push(key);
    }
  });
  keysToDelete.forEach(key => dayCache.delete(key));
}

export function getCacheStats(): { size: number; entries: string[] } {
  return {
    size: dayCache.size,
    entries: Array.from(dayCache.keys())
  };
}
