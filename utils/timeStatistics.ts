import { TimeEntry, User, WorkSchedule, AbsenceRequest, AbsenceStatus, AbsenceType } from '../types';
import { getHolidays } from './holidays';

/**
 * Berechnet die Arbeitstage pro Woche basierend auf WorkSchedule
 */
export function getWorkDaysPerWeek(schedule: WorkSchedule): number {
  let count = 0;
  if (schedule.monday) count++;
  if (schedule.tuesday) count++;
  if (schedule.wednesday) count++;
  if (schedule.thursday) count++;
  if (schedule.friday) count++;
  if (schedule.saturday) count++;
  if (schedule.sunday) count++;
  return count;
}

/**
 * Berechnet die Soll-Stunden für einen Zeitraum
 * Berücksichtigt: Arbeitstage, Feiertage, Urlaub
 */
export function calculateTargetHours(
  user: User,
  startDate: Date,
  endDate: Date,
  absenceRequests: AbsenceRequest[]
): number {
  if (!user.workSchedule) return 0;

  const schedule = user.workSchedule;
  const hoursPerDay = schedule.hoursPerDay;
  const holidays = getHolidays(startDate.getFullYear());
  
  let totalTargetHours = 0;
  const currentDate = new Date(startDate);
  
  while (currentDate <= endDate) {
    const dayOfWeek = currentDate.getDay(); // 0 = Sunday, 1 = Monday, ...
    const dateStr = currentDate.toISOString().split('T')[0];
    
    // Prüfe ob Arbeitstag
    let isWorkDay = false;
    if (dayOfWeek === 0 && schedule.sunday) isWorkDay = true;
    if (dayOfWeek === 1 && schedule.monday) isWorkDay = true;
    if (dayOfWeek === 2 && schedule.tuesday) isWorkDay = true;
    if (dayOfWeek === 3 && schedule.wednesday) isWorkDay = true;
    if (dayOfWeek === 4 && schedule.thursday) isWorkDay = true;
    if (dayOfWeek === 5 && schedule.friday) isWorkDay = true;
    if (dayOfWeek === 6 && schedule.saturday) isWorkDay = true;
    
    // Prüfe ob Feiertag
    const isHoliday = holidays.has(dateStr);
    
    // Prüfe ob Urlaub/Abwesenheit
    const isAbsent = absenceRequests.some(req => 
      req.user.id === user.id &&
      req.status === AbsenceStatus.Approved &&
      (req.type === AbsenceType.Vacation || req.type === AbsenceType.Sick) &&
      new Date(req.startDate) <= currentDate &&
      new Date(req.endDate) >= currentDate
    );
    
    if (isWorkDay && !isHoliday && !isAbsent) {
      totalTargetHours += hoursPerDay;
    }
    
    currentDate.setDate(currentDate.getDate() + 1);
  }
  
  return totalTargetHours;
}

/**
 * Aggregiert TimeEntries nach Jahr (12 Monate)
 */
export function aggregateByYear(
  timeEntries: TimeEntry[],
  user: User,
  year: number
): { month: string; hours: number; targetHours: number }[] {
  const months = [
    'Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun',
    'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez'
  ];
  
  const result = months.map((month, index) => {
    const monthStart = new Date(year, index, 1);
    const monthEnd = new Date(year, index + 1, 0, 23, 59, 59);
    
    // Filtere TimeEntries für diesen Monat und User
    const monthEntries = timeEntries.filter(entry => {
      if (entry.user.id !== user.id) return false;
      const entryDate = new Date(entry.startTime);
      return entryDate >= monthStart && entryDate <= monthEnd;
    });
    
    // Summiere Stunden
    const totalSeconds = monthEntries.reduce((sum, entry) => sum + entry.duration, 0);
    const hours = totalSeconds / 3600;
    
    // Berechne Soll-Stunden (ohne Abwesenheiten hier, da wir keine haben)
    const targetHours = calculateTargetHours(user, monthStart, monthEnd, []);
    
    return {
      month,
      hours: Math.round(hours * 10) / 10,
      targetHours: Math.round(targetHours * 10) / 10
    };
  });
  
  return result;
}

/**
 * Aggregiert TimeEntries nach Monat (4-5 Wochen)
 */
export function aggregateByMonth(
  timeEntries: TimeEntry[],
  user: User,
  year: number,
  month: number // 0-11
): { week: string; hours: number; targetHours: number }[] {
  const monthStart = new Date(year, month, 1);
  const monthEnd = new Date(year, month + 1, 0);
  
  const weeks: { week: string; hours: number; targetHours: number }[] = [];
  
  let weekStart = new Date(monthStart);
  let weekNumber = 1;
  
  while (weekStart <= monthEnd) {
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);
    
    // Begrenze auf Monatsende
    const effectiveEnd = weekEnd > monthEnd ? monthEnd : weekEnd;
    
    // Filtere TimeEntries für diese Woche und User
    const weekEntries = timeEntries.filter(entry => {
      if (entry.user.id !== user.id) return false;
      const entryDate = new Date(entry.startTime);
      return entryDate >= weekStart && entryDate <= effectiveEnd;
    });
    
    // Summiere Stunden
    const totalSeconds = weekEntries.reduce((sum, entry) => sum + entry.duration, 0);
    const hours = totalSeconds / 3600;
    
    // Berechne Soll-Stunden
    const targetHours = calculateTargetHours(user, weekStart, effectiveEnd, []);
    
    weeks.push({
      week: `KW ${weekNumber}`,
      hours: Math.round(hours * 10) / 10,
      targetHours: Math.round(targetHours * 10) / 10
    });
    
    weekStart.setDate(weekStart.getDate() + 7);
    weekNumber++;
  }
  
  return weeks;
}

/**
 * Aggregiert TimeEntries nach Woche (7 Tage)
 */
export function aggregateByWeek(
  timeEntries: TimeEntry[],
  user: User,
  weekStart: Date
): { day: string; hours: number; targetHours: number }[] {
  const days = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];
  
  const result = [];
  
  for (let i = 0; i < 7; i++) {
    const dayDate = new Date(weekStart);
    dayDate.setDate(dayDate.getDate() + i);
    
    const dayEnd = new Date(dayDate);
    dayEnd.setHours(23, 59, 59, 999);
    
    // Filtere TimeEntries für diesen Tag und User
    const dayEntries = timeEntries.filter(entry => {
      if (entry.user.id !== user.id) return false;
      const entryDate = new Date(entry.startTime);
      return entryDate >= dayDate && entryDate <= dayEnd;
    });
    
    // Summiere Stunden
    const totalSeconds = dayEntries.reduce((sum, entry) => sum + entry.duration, 0);
    const hours = totalSeconds / 3600;
    
    // Berechne Soll-Stunden
    const targetHours = calculateTargetHours(user, dayDate, dayEnd, []);
    
    result.push({
      day: days[dayDate.getDay()],
      hours: Math.round(hours * 10) / 10,
      targetHours: Math.round(targetHours * 10) / 10
    });
  }
  
  return result;
}

/**
 * Berechnet Durchschnittswerte für einen Datensatz
 */
export function calculateAverage(data: { hours: number }[]): number {
  if (data.length === 0) return 0;
  const sum = data.reduce((acc, item) => acc + item.hours, 0);
  return Math.round((sum / data.length) * 10) / 10;
}

/**
 * Berechnet Durchschnittswerte nur für Arbeitstage (Wochenansicht)
 * Berücksichtigt WorkSchedule und Anstellungsdatum
 */
export function calculateAverageForWorkDays(
  data: { day: string; hours: number; targetHours: number }[],
  user: User,
  weekStart: Date
): number {
  if (!user.workSchedule) return calculateAverage(data);
  
  const schedule = user.workSchedule;
  const employmentStart = user.employmentStartDate ? new Date(user.employmentStartDate) : null;
  
  // Filtere nur Arbeitstage
  const workDaysData = data.filter((item, index) => {
    const dayDate = new Date(weekStart);
    dayDate.setDate(dayDate.getDate() + index);
    
    // Prüfe ob vor Anstellungsdatum
    if (employmentStart && dayDate < employmentStart) {
      return false;
    }
    
    const dayOfWeek = dayDate.getDay(); // 0 = Sunday, 1 = Monday, ...
    
    // Prüfe ob Arbeitstag laut Schedule
    if (dayOfWeek === 0 && !schedule.sunday) return false;
    if (dayOfWeek === 1 && !schedule.monday) return false;
    if (dayOfWeek === 2 && !schedule.tuesday) return false;
    if (dayOfWeek === 3 && !schedule.wednesday) return false;
    if (dayOfWeek === 4 && !schedule.thursday) return false;
    if (dayOfWeek === 5 && !schedule.friday) return false;
    if (dayOfWeek === 6 && !schedule.saturday) return false;
    
    return true;
  });
  
  if (workDaysData.length === 0) return 0;
  
  const sum = workDaysData.reduce((acc, item) => acc + item.hours, 0);
  return Math.round((sum / workDaysData.length) * 10) / 10;
}

/**
 * Berechnet den Durchschnitt der Soll-Stunden nur für Arbeitstage
 */
export function calculateAverageTargetForWorkDays(
  data: { day: string; hours: number; targetHours: number }[],
  user: User,
  weekStart: Date
): number {
  if (!user.workSchedule) {
    const totalTarget = calculateTotalTarget(data);
    return data.length > 0 ? totalTarget / data.length : 0;
  }
  
  const schedule = user.workSchedule;
  const employmentStart = user.employmentStartDate ? new Date(user.employmentStartDate) : null;
  
  // Filtere nur Arbeitstage
  const workDaysData = data.filter((item, index) => {
    const dayDate = new Date(weekStart);
    dayDate.setDate(dayDate.getDate() + index);
    
    // Prüfe ob vor Anstellungsdatum
    if (employmentStart && dayDate < employmentStart) {
      return false;
    }
    
    const dayOfWeek = dayDate.getDay();
    
    if (dayOfWeek === 0 && !schedule.sunday) return false;
    if (dayOfWeek === 1 && !schedule.monday) return false;
    if (dayOfWeek === 2 && !schedule.tuesday) return false;
    if (dayOfWeek === 3 && !schedule.wednesday) return false;
    if (dayOfWeek === 4 && !schedule.thursday) return false;
    if (dayOfWeek === 5 && !schedule.friday) return false;
    if (dayOfWeek === 6 && !schedule.saturday) return false;
    
    return true;
  });
  
  if (workDaysData.length === 0) return 0;
  
  const sum = workDaysData.reduce((acc, item) => acc + item.targetHours, 0);
  return Math.round((sum / workDaysData.length) * 10) / 10;
}

/**
 * Berechnet die Gesamtsumme der Soll-Stunden
 */
export function calculateTotalTarget(data: { targetHours: number }[]): number {
  const sum = data.reduce((acc, item) => acc + item.targetHours, 0);
  return Math.round(sum * 10) / 10;
}

/**
 * Berechnet die Gesamtsumme der tatsächlichen Stunden
 */
export function calculateTotalHours(data: { hours: number }[]): number {
  const sum = data.reduce((acc, item) => acc + item.hours, 0);
  return Math.round(sum * 10) / 10;
}

/**
 * Hilfsfunktion: Gibt den ersten Tag der Woche zurück (Montag)
 */
export function getWeekStart(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Montag
  return new Date(d.setDate(diff));
}

/**
 * Hilfsfunktion: Formatiert ein Datum als String
 */
export function formatDateRange(start: Date, end: Date): string {
  const options: Intl.DateTimeFormatOptions = { day: '2-digit', month: '2-digit', year: 'numeric' };
  return `${start.toLocaleDateString('de-DE', options)} - ${end.toLocaleDateString('de-DE', options)}`;
}
