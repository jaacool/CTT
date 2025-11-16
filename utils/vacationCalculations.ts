import { User, VacationBalance, AbsenceRequest, AbsenceStatus, AbsenceType, TimeEntry } from '../types';

/**
 * Berechnet die anteiligen Urlaubstage basierend auf dem Anstellungsdatum
 * @param employmentStartDate ISO 8601 Startdatum der Anstellung
 * @param vacationDaysPerYear Volle Urlaubstage pro Jahr
 * @param year Jahr für die Berechnung
 * @returns Anteilige Urlaubstage für das Jahr
 */
export function calculateProRataVacationDays(
  employmentStartDate: string,
  vacationDaysPerYear: number,
  year: number
): number {
  // Parse das Datum im Format YYYY-MM-DD ohne Timezone-Probleme
  const [yearStr, monthStr, dayStr] = employmentStartDate.split('T')[0].split('-');
  const startDate = new Date(parseInt(yearStr), parseInt(monthStr) - 1, parseInt(dayStr));
  const startYear = startDate.getFullYear();
  
  // Wenn vor dem Jahr angestellt, volle Tage
  if (startYear < year) {
    return vacationDaysPerYear;
  }
  
  // Wenn nach dem Jahr angestellt, keine Tage
  if (startYear > year) {
    return 0;
  }
  
  // Im Anstellungsjahr: anteilig berechnen
  const yearStart = new Date(year, 0, 1);
  const yearEnd = new Date(year, 11, 31, 23, 59, 59);
  const daysInYear = 365 + (isLeapYear(year) ? 1 : 0);
  
  const startOfPeriod = startDate > yearStart ? startDate : yearStart;
  const remainingDays = Math.ceil((yearEnd.getTime() - startOfPeriod.getTime()) / (1000 * 60 * 60 * 24)) + 1;
  
  // Berechne anteilige Urlaubstage
  const proRataDays = (vacationDaysPerYear / daysInYear) * remainingDays;
  
  // Runde auf eine Dezimalstelle
  return Math.round(proRataDays * 10) / 10;
}

/**
 * Prüft ob ein Jahr ein Schaltjahr ist
 */
function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || (year % 400 === 0);
}

/**
 * Berechnet die Anzahl der Arbeitstage zwischen zwei Daten basierend auf dem Arbeitsplan
 * @param startDate Startdatum
 * @param endDate Enddatum
 * @param workSchedule Arbeitsplan des Users
 * @returns Anzahl der Arbeitstage
 */
export function calculateWorkDays(
  startDate: string,
  endDate: string,
  workSchedule?: { monday: boolean; tuesday: boolean; wednesday: boolean; thursday: boolean; friday: boolean; saturday: boolean; sunday: boolean }
): number {
  if (!workSchedule) {
    // Standard: Mo-Fr
    workSchedule = {
      monday: true,
      tuesday: true,
      wednesday: true,
      thursday: true,
      friday: true,
      saturday: false,
      sunday: false
    };
  }

  const start = new Date(startDate);
  const end = new Date(endDate);
  let workDays = 0;
  
  const current = new Date(start);
  while (current <= end) {
    const dayOfWeek = current.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
    
    const isWorkDay = (
      (dayOfWeek === 1 && workSchedule.monday) ||
      (dayOfWeek === 2 && workSchedule.tuesday) ||
      (dayOfWeek === 3 && workSchedule.wednesday) ||
      (dayOfWeek === 4 && workSchedule.thursday) ||
      (dayOfWeek === 5 && workSchedule.friday) ||
      (dayOfWeek === 6 && workSchedule.saturday) ||
      (dayOfWeek === 0 && workSchedule.sunday)
    );
    
    if (isWorkDay) {
      workDays++;
    }
    
    current.setDate(current.getDate() + 1);
  }
  
  return workDays;
}

/**
 * Berechnet die Überstunden eines Users für ein Jahr
 * @param timeEntries Alle Time Entries des Users
 * @param absenceRequests Alle Abwesenheitsanträge des Users (für Abzug von Urlaubstagen etc.)
 * @param workSchedule Arbeitsplan des Users
 * @param employmentStartDate Anstellungsdatum (optional)
 * @param year Jahr für die Berechnung
 * @returns Überstunden in Stunden
 */
export function calculateOvertimeHours(
  timeEntries: TimeEntry[],
  absenceRequests: AbsenceRequest[],
  workSchedule: { hoursPerDay: number; monday: boolean; tuesday: boolean; wednesday: boolean; thursday: boolean; friday: boolean; saturday: boolean; sunday: boolean },
  employmentStartDate: string | undefined,
  year: number
): number {
  // Filtere Time Entries für das Jahr
  const yearEntries = timeEntries.filter(entry => {
    const entryDate = new Date(entry.startTime);
    return entryDate.getFullYear() === year;
  });

  // Berechne Gesamtarbeitszeit in Stunden
  const totalWorkedHours = yearEntries.reduce((sum, entry) => {
    return sum + (entry.duration / 3600); // duration ist in Sekunden
  }, 0);

  // Berechne Sollarbeitszeit für das Jahr
  let yearStart = new Date(year, 0, 1);
  const yearEnd = new Date(year, 11, 31);
  
  // Berücksichtige Anstellungsdatum
  if (employmentStartDate) {
    const [yearStr, monthStr, dayStr] = employmentStartDate.split('T')[0].split('-');
    const startDate = new Date(parseInt(yearStr), parseInt(monthStr) - 1, parseInt(dayStr));
    if (startDate.getFullYear() === year && startDate > yearStart) {
      yearStart = startDate;
    }
  }
  
  // Berechne Arbeitstage im Zeitraum
  const workDays = calculateWorkDays(
    yearStart.toISOString(),
    yearEnd.toISOString(),
    workSchedule
  );
  
  // Berechne genehmigte Urlaubstage und Krankheitstage (diese zählen nicht als Sollarbeitszeit)
  const absenceDays = absenceRequests
    .filter(request => {
      const requestYear = new Date(request.startDate).getFullYear();
      return requestYear === year && 
             request.status === AbsenceStatus.Approved &&
             (request.type === AbsenceType.Vacation || 
              request.type === AbsenceType.Sick ||
              request.type === AbsenceType.CompensatoryDay);
    })
    .reduce((sum, request) => {
      if (request.halfDay) {
        return sum + 0.5;
      }
      const days = calculateWorkDays(request.startDate, request.endDate, workSchedule);
      return sum + days;
    }, 0);
  
  // Sollarbeitszeit = (Arbeitstage - Abwesenheitstage) * Stunden pro Tag
  const expectedHours = (workDays - absenceDays) * workSchedule.hoursPerDay;

  return totalWorkedHours - expectedHours;
}

/**
 * Berechnet die Urlaubsbilanz eines Users für ein Jahr
 * @param user User-Objekt
 * @param absenceRequests Alle Abwesenheitsanträge des Users
 * @param timeEntries Alle Time Entries des Users
 * @param year Jahr für die Berechnung
 * @returns VacationBalance-Objekt
 */
export function calculateVacationBalance(
  user: User,
  absenceRequests: AbsenceRequest[],
  timeEntries: TimeEntry[],
  year: number
): VacationBalance {
  const workSchedule = user.workSchedule || {
    monday: true,
    tuesday: true,
    wednesday: true,
    thursday: true,
    friday: true,
    saturday: false,
    sunday: false,
    hoursPerDay: 8,
    vacationDaysPerYear: 30
  };

  // Berechne Gesamtanspruch basierend auf Anstellungsdatum
  const totalEntitlement = user.employmentStartDate
    ? calculateProRataVacationDays(user.employmentStartDate, workSchedule.vacationDaysPerYear, year)
    : workSchedule.vacationDaysPerYear;

  // Filtere Urlaubsanträge für das Jahr
  const yearVacationRequests = absenceRequests.filter(request => {
    const requestYear = new Date(request.startDate).getFullYear();
    return requestYear === year && request.type === AbsenceType.Vacation;
  });

  // Berechne genommene Urlaubstage (genehmigte Anträge)
  const used = yearVacationRequests
    .filter(request => request.status === AbsenceStatus.Approved)
    .reduce((sum, request) => {
      // Wenn halfDay gesetzt ist, ist es immer 0.5 Tage
      if (request.halfDay) {
        return sum + 0.5;
      }
      // Sonst berechne die tatsächlichen Arbeitstage
      const days = calculateWorkDays(request.startDate, request.endDate, workSchedule);
      return sum + days;
    }, 0);

  // Berechne beantragte aber noch nicht genehmigte Tage
  const pending = yearVacationRequests
    .filter(request => request.status === AbsenceStatus.Pending)
    .reduce((sum, request) => {
      // Wenn halfDay gesetzt ist, ist es immer 0.5 Tage
      if (request.halfDay) {
        return sum + 0.5;
      }
      // Sonst berechne die tatsächlichen Arbeitstage
      const days = calculateWorkDays(request.startDate, request.endDate, workSchedule);
      return sum + days;
    }, 0);

  // Berechne Überstunden
  const overtimeHours = calculateOvertimeHours(
    timeEntries, 
    absenceRequests, 
    workSchedule, 
    user.employmentStartDate,
    year
  );
  
  // Umrechnung Überstunden in Ausgleichstage
  const overtimeDaysEquivalent = overtimeHours / workSchedule.hoursPerDay;

  // Verfügbare Tage
  const available = totalEntitlement - used - pending;

  return {
    userId: user.id,
    year,
    totalEntitlement,
    used,
    pending,
    available,
    overtimeHours,
    overtimeDaysEquivalent
  };
}

/**
 * Berechnet die verfügbaren Urlaubstage inklusive Ausgleichstage
 * @param vacationBalance Urlaubsbilanz
 * @returns Gesamtverfügbare Tage (Urlaub + Ausgleichstage)
 */
export function getTotalAvailableDays(vacationBalance: VacationBalance): number {
  return vacationBalance.available + Math.max(0, vacationBalance.overtimeDaysEquivalent);
}
