# Time Report Import/Export System

## Übersicht

Das System ermöglicht den nahtlosen Import und Export von Zeiteinträgen im standardisierten Excel-Format. Es ist kompatibel mit anderen Zeittracking-Systemen und ermöglicht die Migration von Daten zwischen Systemen.

## Dateien

### Core-Funktionen
- **`utils/timeReportImportExport.ts`**: Import/Export-Logik
  - `importTimeReport()`: Importiert Excel-Datei und erstellt Projekte, Listen, Tasks und Zeiteinträge
  - `exportTimeReport()`: Exportiert Zeiteinträge als Excel-Datei

### UI-Komponente
- **`components/TimeReportImportExport.tsx`**: React-Komponente für Import/Export-UI
  - Drag & Drop Upload
  - Export-Button mit Statistiken
  - Erfolgs-/Fehlermeldungen

### Icons
- **`components/Icons.tsx`**: Erweitert um `UploadIcon` und `DownloadIcon`

## Excel-Format

### Spalten

Die Excel-Datei enthält folgende Spalten:

| Spalte | Beschreibung | Beispiel |
|--------|--------------|----------|
| `User` | Benutzername | "AARON" |
| `Date` | Datum | "11/14/25 0:00" |
| `Start Time` | Startzeit | "19:54:51" |
| `End Time` | Endzeit | "19:55:01" |
| `Duration in Seconds` | Dauer in Sekunden | "10" |
| `Duration in Hours` | Dauer in Stunden | "0.00277778" |
| `Duration Formatted` | Formatierte Dauer | "00:00h" |
| `Timezone` | Zeitzone | "Europe/Berlin" |
| `Is Billable` | Abrechenbar? | "TRUE"/"FALSE" |
| `Is Billed` | Abgerechnet? | "TRUE"/"FALSE" |
| `Type` | Benutzerrolle | "CREATIVE-DIRECTOR" |
| `Note` | Notiz | "" |
| `Project Name` | Projektname | "AARON" |
| `Company Name` | Firmenname | "PRIVAT" |
| `Task Name` | Task-Name | "test" |
| `Created On` | Erstellungsdatum | "11/14/25 0:00" |
| `Updated On` | Änderungsdatum | "11/14/25 0:00" |
| `Id` | Zeiteintrag-ID | UUID |
| `Project Id` | Projekt-ID | UUID |
| `Task Id` | Task-ID | UUID |
| `Parent Task Id` | Parent-Task-ID (für Subtasks) | UUID oder leer |
| `Parent Task Name` | Parent-Task-Name | "App: Tracking-Clone" |
| `Start Date UTC` | Start-Datum UTC | "11/14/25 0:00" |
| `Start Time UTC` | Start-Zeit UTC | "18:54:51" |
| `End Date UTC` | End-Datum UTC | "11/14/25 0:00" |
| `End Time UTC` | End-Zeit UTC | "18:55:01" |
| `Task Lists` | Listen-Name | "Kunst, Spaß & Experimente" |
| `Task Tags` | Tags | "" |
| `TaskList` | Listen-Name (Duplikat) | "Kunst, Spaß & Experimente" |
| `Task test` | Test-Feld | "" |
| `Task MOCO Projekt ID` | MOCO-ID | "" |

## Import-Prozess

### 1. Datei-Upload
```typescript
const result = importTimeReport(arrayBuffer, existingProjects, users);
```

### 2. Automatische Erstellung

Der Import erstellt automatisch:

- **Projekte**: Falls nicht vorhanden (basierend auf `Project Id`)
  - Name: `Project Name`
  - Client: `Company Name`
  - Icon: Automatisch generierte Farbe

- **Listen**: Falls nicht vorhanden (basierend auf `TaskList`)
  - Titel: `TaskList` oder `Task Lists`
  - Zuordnung zum Projekt

- **Tasks**: Falls nicht vorhanden (basierend auf `Task Id`)
  - Titel: `Task Name`
  - Zuordnung zur Liste
  - Billable-Status

- **Subtasks**: Falls `Parent Task Id` vorhanden
  - Titel: `Task Name`
  - Zuordnung zum Parent Task

- **Zeiteinträge**: Immer neu erstellt
  - Alle Zeitdaten
  - Zuordnung zu User, Task, Projekt

### 3. User-Matching

User müssen bereits im System existieren. Matching erfolgt über:
- Case-insensitive Namensvergleich
- Exakte Übereinstimmung erforderlich

### 4. Rückgabe

```typescript
interface ImportResult {
  projects: Project[];
  timeEntries: TimeEntry[];
  stats: {
    projectsCreated: number;
    listsCreated: number;
    tasksCreated: number;
    subtasksCreated: number;
    timeEntriesImported: number;
  };
}
```

## Export-Prozess

### 1. Export starten
```typescript
const arrayBuffer = exportTimeReport(timeEntries, projects);
```

### 2. Datei-Download

- Format: `.xlsx`
- Dateiname: `YYYY-MM-DD-time-report-raw.xlsx`
- Kompatibel mit Import-Format

### 3. Hierarchie-Auflösung

Der Export:
- Findet automatisch Parent Tasks für Subtasks
- Löst Projekt- und Listen-Zuordnungen auf
- Formatiert Zeiten im korrekten Format

## Integration in die App

### Verwendung der Komponente

```tsx
import { TimeReportImportExport } from './components/TimeReportImportExport';

<TimeReportImportExport
  timeEntries={timeEntries}
  projects={projects}
  users={users}
  onImportComplete={(result) => {
    // Verarbeite importierte Daten
    // result.projects enthält neue/aktualisierte Projekte
    // result.timeEntries enthält neue Zeiteinträge
    // result.stats enthält Statistiken
  }}
/>
```

### Beispiel-Integration in App.tsx

```tsx
const handleImportComplete = (result: ImportResult) => {
  // Merge neue Projekte
  const updatedProjects = [...projects];
  result.projects.forEach(newProject => {
    const existingIndex = updatedProjects.findIndex(p => p.id === newProject.id);
    if (existingIndex >= 0) {
      updatedProjects[existingIndex] = newProject;
    } else {
      updatedProjects.push(newProject);
    }
  });
  setProjects(updatedProjects);
  
  // Füge neue Zeiteinträge hinzu
  setTimeEntries([...timeEntries, ...result.timeEntries]);
  
  // Zeige Erfolgsm eldung
  console.log(`Import erfolgreich: ${result.stats.timeEntriesImported} Einträge`);
};
```

## Kompatibilität

### Unterstützte Formate
- ✅ Excel 2007+ (.xlsx)
- ✅ Excel 97-2003 (.xls)

### Zeitzone-Handling
- Standard: `Europe/Berlin`
- UTC-Konvertierung automatisch
- Konfigurierbar über Parameter

### Datenvalidierung

Der Import validiert:
- ✅ User existiert im System
- ✅ Zeitdaten sind gültig (Start < End)
- ✅ Duration > 0
- ✅ Pflichtfelder vorhanden

Fehlerhafte Einträge werden:
- ⚠️ Übersprungen
- 📝 In Console geloggt
- ❌ Nicht importiert

## Fehlerbehandlung

### Import-Fehler

```typescript
try {
  const result = importTimeReport(data, projects, users);
} catch (error) {
  console.error('Import failed:', error);
  // Zeige Fehlermeldung
}
```

### Häufige Fehler

1. **User nicht gefunden**
   - Lösung: User im System anlegen
   - Warning in Console

2. **Ungültige Zeitdaten**
   - Lösung: Excel-Daten prüfen
   - Eintrag wird übersprungen

3. **Fehlende Pflichtfelder**
   - Lösung: Excel-Format prüfen
   - Zeile wird übersprungen

## Performance

### Optimierungen

- **Batch-Processing**: Alle Einträge in einem Durchgang
- **Map-basierte Lookups**: O(1) für Projekt/Task-Suche
- **Deduplizierung**: Automatisch für Projekte/Listen/Tasks

### Limits

- Empfohlen: < 10.000 Einträge pro Import
- Browser-Limit: ~50 MB Excel-Datei
- Memory: ~2x Dateigröße

## Testing

### Manueller Test

1. Exportiere bestehende Daten
2. Importiere Export-Datei
3. Vergleiche Daten

### Test-Datei

Verwende die bereitgestellte Datei:
```
/Users/aaron/Downloads/2025_11_15-time-report-raw.xlsx
```

## Zukünftige Erweiterungen

### Geplant
- [ ] CSV-Import/Export
- [ ] Mapping-Konfiguration für User
- [ ] Bulk-Edit vor Import
- [ ] Import-Preview
- [ ] Konflikt-Auflösung UI
- [ ] Incremental Import (nur neue Einträge)

### Ideen
- [ ] API-basierter Import
- [ ] Automatischer Sync
- [ ] Multi-File Import
- [ ] Template-System
