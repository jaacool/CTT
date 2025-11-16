# Urlaubsverwaltungssystem

## Übersicht

Das Urlaubsverwaltungssystem berechnet automatisch die verfügbaren Urlaubstage für jeden Mitarbeiter basierend auf:
- **Anstellungsdatum** (anteilige Berechnung im ersten Jahr)
- **Arbeitszeitregelung** (Arbeitstage pro Woche, Stunden pro Tag)
- **Genommene Urlaubstage** (genehmigte Abwesenheitsanträge)
- **Beantragte Urlaubstage** (ausstehende Anträge)
- **Getrackte Arbeitszeit** (Überstunden/Minderstunden)

## Datenmodell

### User-Erweiterungen

```typescript
interface User {
  // ... bestehende Felder
  workSchedule?: WorkSchedule;
  employmentStartDate?: string; // ISO 8601 - Anstellungsdatum
}

interface WorkSchedule {
  monday: boolean;
  tuesday: boolean;
  wednesday: boolean;
  thursday: boolean;
  friday: boolean;
  saturday: boolean;
  sunday: boolean;
  hoursPerDay: number;           // Geregelte Stunden pro Tag
  vacationDaysPerYear: number;   // Urlaubstage pro Jahr
}
```

### VacationBalance

```typescript
interface VacationBalance {
  userId: string;
  year: number;
  totalEntitlement: number;      // Gesamtanspruch (anteilig bei Eintritt)
  used: number;                  // Bereits genommene Urlaubstage
  pending: number;               // Beantragte aber nicht genehmigte Tage
  available: number;             // Verfügbare Urlaubstage
  overtimeHours: number;         // Überstunden/Minderstunden
  overtimeDaysEquivalent: number; // Überstunden als Ausgleichstage
}
```

## Berechnungslogik

### 1. Anteilige Urlaubstage bei Eintritt

Wenn ein Mitarbeiter während des Jahres eintritt, werden die Urlaubstage anteilig berechnet:

```typescript
// Beispiel: Eintritt am 1. Juli 2024, 30 Tage Jahresurlaub
// Verbleibende Tage im Jahr: 184 (Juli-Dezember)
// Anteilige Tage: (30 / 365) * 184 ≈ 15 Tage
```

### 2. Arbeitstage-Berechnung

Urlaubsanträge werden in Arbeitstage umgerechnet basierend auf dem individuellen Arbeitsplan:

```typescript
// Beispiel: User arbeitet Mo-Do (4 Tage/Woche)
// Urlaubsantrag: Mo 10.06. - Fr 14.06. (5 Kalendertage)
// Tatsächliche Urlaubstage: 4 (Fr ist kein Arbeitstag)
```

### 3. Überstunden-Berechnung

```typescript
// Gesamtarbeitszeit (aus TimeEntries) - Sollarbeitszeit = Überstunden
// Sollarbeitszeit = Arbeitstage im Jahr × Stunden pro Tag

// Beispiel:
// - 220 Arbeitstage × 8h = 1760h Sollzeit
// - 1840h getrackte Zeit
// - 80h Überstunden = 10 Ausgleichstage (bei 8h/Tag)
```

### 4. Verfügbare Tage

```typescript
// Gesamt verfügbar = Urlaubsanspruch - Genommen - Beantragt + Ausgleichstage
totalAvailable = balance.available + Math.max(0, balance.overtimeDaysEquivalent)
```

## Verwendung

### Urlaubsbilanz berechnen

```typescript
import { calculateVacationBalance } from './utils/vacationCalculations';

const balance = calculateVacationBalance(
  user,              // User-Objekt
  absenceRequests,   // Alle Abwesenheitsanträge
  timeEntries,       // Alle Time Entries
  2024              // Jahr
);
```

### Urlaubsbilanz anzeigen

```typescript
import { VacationBalanceCard } from './components/VacationBalanceCard';

<VacationBalanceCard balance={balance} />
// oder kompakt:
<VacationBalanceCard balance={balance} compact />
```

### Prüfung vor Urlaubsantrag

```typescript
import { canRequestVacation } from './utils/vacationCalculations.example';

const result = canRequestVacation(user, absenceRequests, timeEntries, 5);
if (!result.canRequest) {
  alert(result.reason); // "Nicht genügend Urlaubstage verfügbar..."
}
```

## Integration in bestehende Komponenten

### EditUserModal

Das Modal wurde erweitert um:
- **Angestellt ab**: Datumseingabe für Anstellungsdatum
- **Arbeitszeitregelung**: Wochentage, Stunden/Tag, Urlaubstage/Jahr

### Absences/Vacation Management

Bei der Anzeige von Abwesenheiten sollte die Urlaubsbilanz eingebunden werden:

```typescript
const balance = calculateVacationBalance(currentUser, absences, timeEntries, currentYear);

// Warnung anzeigen wenn zu wenig Tage
if (balance.available < requestedDays) {
  showWarning(`Nur noch ${balance.available} Tage verfügbar`);
}
```

### Dashboard

Urlaubsbilanz als Widget:

```typescript
<VacationBalanceCard balance={userBalance} compact />
```

### Admin-Übersicht

Alle Mitarbeiter-Bilanzen:

```typescript
const allBalances = calculateAllUsersVacationBalance(users, absences, timeEntries);
// Anzeige als Tabelle oder Karten
```

## Beispiel-Szenarien

### Szenario 1: Neuer Mitarbeiter

```
Mitarbeiter: Max Mustermann
Eintritt: 01.07.2024
Arbeitszeit: Mo-Fr, 8h/Tag
Jahresurlaub: 30 Tage

Berechnung 2024:
- Anteiliger Anspruch: 15 Tage (Juli-Dezember)
- Genommen: 5 Tage
- Verfügbar: 10 Tage
```

### Szenario 2: Überstunden

```
Mitarbeiter: Anna Schmidt
Sollarbeitszeit 2024: 1760h (220 Tage × 8h)
Getrackte Zeit: 1840h
Überstunden: 80h = 10 Ausgleichstage

Urlaubsbilanz:
- Jahresurlaub: 30 Tage
- Genommen: 20 Tage
- Verfügbar: 10 Tage
- Ausgleichstage: 10 Tage
- Gesamt verfügbar: 20 Tage
```

### Szenario 3: Teilzeit (4-Tage-Woche)

```
Mitarbeiter: Tom Weber
Arbeitszeit: Mo-Do, 8h/Tag
Jahresurlaub: 24 Tage (anteilig für 4-Tage-Woche)

Urlaubsantrag: Mo 10.06. - Fr 14.06.
Berechnete Urlaubstage: 4 (Fr ist kein Arbeitstag)
```

## Wartung & Erweiterungen

### Feiertage

Aktuell werden Feiertage nicht berücksichtigt. Erweiterung möglich durch:

```typescript
interface WorkSchedule {
  // ... bestehende Felder
  holidays?: string[]; // ISO Datumsstrings
}

// In calculateWorkDays() prüfen:
if (holidays.includes(current.toISOString().split('T')[0])) {
  continue; // Feiertag überspringen
}
```

### Resturlaub aus Vorjahr

```typescript
interface VacationBalance {
  // ... bestehende Felder
  carriedOver?: number; // Übertragene Tage aus Vorjahr
}
```

### Urlaubssperren

```typescript
interface WorkSchedule {
  // ... bestehende Felder
  blockedPeriods?: Array<{ start: string; end: string }>; // Zeiträume mit Urlaubssperre
}
```

## Testing

Beispiel-Tests in `vacationCalculations.example.ts`:
- Anteilige Berechnung bei Eintritt
- Arbeitstage-Berechnung mit verschiedenen Arbeitsplänen
- Überstunden-Berechnung
- Warnungen bei niedrigem Urlaubsstand

## Technische Details

### Performance

- Berechnungen sind optimiert für einzelne User
- Für große Datenmengen: Caching der Bilanzen empfohlen
- Time Entries sollten nach User und Jahr indiziert sein

### Datenintegrität

- Alle Datumsangaben in ISO 8601 Format
- Zeitdauern in Sekunden (TimeEntry.duration)
- Validierung der Arbeitspläne (mind. 1 Arbeitstag)

### Browser-Kompatibilität

- Verwendet native Date-API
- Keine externen Dependencies für Berechnungen
- Kompatibel mit allen modernen Browsern
