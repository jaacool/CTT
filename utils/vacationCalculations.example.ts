/**
 * Beispiel-Verwendung der Urlaubsberechnungen
 * 
 * Diese Datei zeigt, wie die Urlaubsberechnung in der Anwendung verwendet werden kann.
 */

import { User, AbsenceRequest, TimeEntry, VacationBalance } from '../types';
import { calculateVacationBalance, getTotalAvailableDays } from './vacationCalculations';

// Beispiel 1: Berechnung für einen User
export function exampleCalculateUserVacation(
  user: User,
  absenceRequests: AbsenceRequest[],
  timeEntries: TimeEntry[]
): VacationBalance {
  const currentYear = new Date().getFullYear();
  
  // Filtere nur die Daten des Users
  const userAbsences = absenceRequests.filter(req => req.user.id === user.id);
  const userTimeEntries = timeEntries.filter(entry => entry.user.id === user.id);
  
  // Berechne Urlaubsbilanz
  const balance = calculateVacationBalance(user, userAbsences, userTimeEntries, currentYear);
  
  console.log(`Urlaubsbilanz für ${user.name} (${currentYear}):`);
  console.log(`- Gesamtanspruch: ${balance.totalEntitlement} Tage`);
  console.log(`- Genommen: ${balance.used} Tage`);
  console.log(`- Beantragt: ${balance.pending} Tage`);
  console.log(`- Verfügbar: ${balance.available} Tage`);
  console.log(`- Überstunden: ${balance.overtimeHours.toFixed(1)} h`);
  console.log(`- Ausgleichstage: ${balance.overtimeDaysEquivalent.toFixed(1)} Tage`);
  console.log(`- Gesamt verfügbar: ${getTotalAvailableDays(balance).toFixed(1)} Tage`);
  
  return balance;
}

// Beispiel 2: Prüfung ob genug Urlaubstage für einen Antrag vorhanden sind
export function canRequestVacation(
  user: User,
  absenceRequests: AbsenceRequest[],
  timeEntries: TimeEntry[],
  requestedDays: number
): { canRequest: boolean; reason?: string } {
  const currentYear = new Date().getFullYear();
  const balance = calculateVacationBalance(
    user,
    absenceRequests.filter(req => req.user.id === user.id),
    timeEntries.filter(entry => entry.user.id === user.id),
    currentYear
  );
  
  const totalAvailable = getTotalAvailableDays(balance);
  
  if (totalAvailable >= requestedDays) {
    return { canRequest: true };
  }
  
  return {
    canRequest: false,
    reason: `Nicht genügend Urlaubstage verfügbar. Verfügbar: ${totalAvailable.toFixed(1)} Tage, Beantragt: ${requestedDays} Tage`
  };
}

// Beispiel 3: Berechnung für alle User (z.B. für Admin-Dashboard)
export function calculateAllUsersVacationBalance(
  users: User[],
  absenceRequests: AbsenceRequest[],
  timeEntries: TimeEntry[],
  year?: number
): Map<string, VacationBalance> {
  const targetYear = year || new Date().getFullYear();
  const balances = new Map<string, VacationBalance>();
  
  users.forEach(user => {
    const userAbsences = absenceRequests.filter(req => req.user.id === user.id);
    const userTimeEntries = timeEntries.filter(entry => entry.user.id === user.id);
    
    const balance = calculateVacationBalance(user, userAbsences, userTimeEntries, targetYear);
    balances.set(user.id, balance);
  });
  
  return balances;
}

// Beispiel 4: Warnung bei niedrigem Urlaubsstand
export function checkVacationWarnings(
  user: User,
  absenceRequests: AbsenceRequest[],
  timeEntries: TimeEntry[]
): { hasWarning: boolean; message?: string; severity?: 'info' | 'warning' | 'critical' } {
  const currentYear = new Date().getFullYear();
  const balance = calculateVacationBalance(
    user,
    absenceRequests.filter(req => req.user.id === user.id),
    timeEntries.filter(entry => entry.user.id === user.id),
    currentYear
  );
  
  const usagePercentage = (balance.used / balance.totalEntitlement) * 100;
  const monthsRemaining = 12 - new Date().getMonth();
  
  // Kritisch: Über 90% verbraucht
  if (usagePercentage > 90) {
    return {
      hasWarning: true,
      message: `Fast alle Urlaubstage verbraucht (${usagePercentage.toFixed(0)}%)`,
      severity: 'critical'
    };
  }
  
  // Warnung: Zu wenig Urlaub genommen
  if (monthsRemaining <= 3 && balance.available > 10) {
    return {
      hasWarning: true,
      message: `Noch ${balance.available} Urlaubstage übrig. Bitte bis Jahresende nehmen!`,
      severity: 'warning'
    };
  }
  
  // Info: Viele Überstunden
  if (balance.overtimeHours > 40) {
    return {
      hasWarning: true,
      message: `${balance.overtimeHours.toFixed(0)} Überstunden (≈ ${balance.overtimeDaysEquivalent.toFixed(1)} Ausgleichstage)`,
      severity: 'info'
    };
  }
  
  return { hasWarning: false };
}
