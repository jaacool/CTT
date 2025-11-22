# Anomalie-Erkennungs-System

## Übersicht

Das Anomalie-System erkennt automatisch Auffälligkeiten in der Zeiterfassung und speichert diese persistent in Supabase. Benachrichtigungen werden über alle Clients hinweg synchronisiert.

## Features

### 1. **Persistente Speicherung**
- Anomalien werden in Supabase gespeichert
- Status (Open, Resolved, Muted) wird synchronisiert
- Kommentare zu Anomalien werden gespeichert
- Realtime-Updates über alle Clients

### 2. **Schnelles Laden**
- **Phase 1**: Beim App-Start werden gespeicherte Anomalien SOFORT geladen
- **Phase 2**: Nach 2 Sekunden startet die Background-Berechnung neuer Anomalien
- Benachrichtigungen erscheinen innerhalb von 500ms

### 3. **Mute-Funktionalität**
- User können Benachrichtigungen stummschalten
- Stummgeschaltete Anomalien werden nicht mehr angezeigt
- Status wird über Supabase synchronisiert
- Mute-Button in NotificationsModal verfügbar

### 4. **Erkannte Anomalien**

#### MISSING_ENTRY
- Arbeitstag ohne Zeiterfassung
- Keine Abwesenheit eingetragen
- Nur für vergangene Tage

#### EXCESS_WORK_SHOOT
- Über 15 Stunden bei Dreh/Produktion
- Warnung vor Überlastung

#### EXCESS_WORK_REGULAR
- Über 9 Stunden ohne Dreh/Produktion
- Warnung vor Überlastung

#### UNDER_PERFORMANCE
- Unter 50% des Tagessolls
- Nur für vergangene Tage

#### FORGOT_TO_STOP
- **Neu**: Erkennt laufende Timer die gestern oder früher gestartet wurden
- Erkennt beendete Einträge zwischen 0-9 Uhr (über Nacht)
- Gilt für ALLE User inkl. Admins

## Setup

### 1. Supabase-Tabellen erstellen

```bash
# SQL-Script ausführen
cat SUPABASE_ANOMALY_SETUP.sql | supabase db execute
```

Oder manuell in Supabase SQL Editor:
1. Öffne Supabase Dashboard
2. Gehe zu SQL Editor
3. Kopiere Inhalt von `SUPABASE_ANOMALY_SETUP.sql`
4. Führe aus

### 2. Migration (Optional)

Falls du bereits localStorage-basierte Anomalien hast:

```typescript
import { migrateLocalStorageAnomalies } from './utils/anomalySync';

// Einmalig ausführen
await migrateLocalStorageAnomalies();
```

## Verwendung

### Status ändern

```typescript
// Resolved
await updateAnomalyStatus(userId, date, type, AnomalyStatus.Resolved, currentUser.id);

// Muted
await updateAnomalyStatus(userId, date, type, AnomalyStatus.Muted, currentUser.id);

// Zurück zu Open
await updateAnomalyStatus(userId, date, type, AnomalyStatus.Open, currentUser.id);
```

### Kommentar hinzufügen

```typescript
const comment: AnomalyComment = {
  id: `comment-${Date.now()}`,
  userId: currentUser.id,
  message: 'Meine Nachricht',
  timestamp: new Date().toISOString(),
  user: {
    id: currentUser.id,
    name: currentUser.name,
    avatarUrl: currentUser.avatarUrl
  }
};

await addAnomalyComment(userId, date, type, comment);
```

### Alte Anomalien löschen

```typescript
// Lösche Anomalien älter als 90 Tage
await deleteOldAnomalies(90);
```

## Realtime-Synchronisation

Das System nutzt Supabase Realtime für Live-Updates:

- **Anomalie erstellt/geändert**: Alle Clients werden sofort aktualisiert
- **Anomalie gelöscht**: Wird aus allen Clients entfernt
- **Kommentar hinzugefügt**: Erscheint sofort bei allen Beteiligten

## Performance

### Optimierungen

1. **Lazy Loading**: Gespeicherte Anomalien werden sofort geladen
2. **Background-Berechnung**: Neue Anomalien werden nach 2s im Hintergrund berechnet
3. **Debouncing**: Timer-Updates triggern nicht sofort Neuberechnung (500ms Delay)
4. **Batch-Speicherung**: Mehrere Anomalien werden in einem Request gespeichert

### Datenbankindizes

```sql
-- Optimiert für schnelle Abfragen
CREATE INDEX idx_anomalies_user_date ON anomalies(user_id, date);
CREATE INDEX idx_anomalies_status ON anomalies(status);
CREATE INDEX idx_anomalies_created_at ON anomalies(created_at DESC);
```

## Benachrichtigungen

### TopBar Badge

Zeigt Anzahl der offenen Anomalien:
- Admins: Alle offenen Anomalien (außer eigene)
- User: Nur eigene offenen Anomalien
- **Muted-Anomalien werden NICHT gezählt**

### NotificationsModal

- Zeigt alle relevanten Anomalien
- Muted-Anomalien werden ausgeblendet
- Buttons:
  - **Erledigt** (nur Admin): Markiert als Resolved
  - **Stumm** (alle): Schaltet Benachrichtigung stumm
  - **Besprechen/Untersuchen**: Öffnet Kommentar-Thread

## Datenstruktur

### Anomaly

```typescript
interface Anomaly {
  date: string; // YYYY-MM-DD
  userId: string;
  type: AnomalyType;
  status?: AnomalyStatus;
  details: {
    trackedHours: number;
    targetHours: number;
    hasShoot: boolean;
  };
  comments?: AnomalyComment[];
}
```

### AnomalyStatus

```typescript
enum AnomalyStatus {
  Open = 'OPEN',       // Neu, noch nicht bearbeitet
  Resolved = 'RESOLVED', // Erledigt (nur Admin)
  Muted = 'MUTED'      // Stummgeschaltet (alle)
}
```

### AnomalyComment

```typescript
interface AnomalyComment {
  id: string;
  userId: string;
  message: string;
  timestamp: string;
  user?: {
    id: string;
    name: string;
    avatarUrl: string;
  };
}
```

## Troubleshooting

### Anomalien werden nicht angezeigt

1. Prüfe ob Supabase-Tabellen existieren
2. Prüfe Browser Console auf Fehler
3. Prüfe ob `anomaliesLoaded` State true ist

### Realtime funktioniert nicht

1. Prüfe Supabase Realtime-Konfiguration
2. Stelle sicher dass Tabellen zu Publication hinzugefügt wurden:
   ```sql
   ALTER PUBLICATION supabase_realtime ADD TABLE anomalies;
   ALTER PUBLICATION supabase_realtime ADD TABLE anomaly_comments;
   ```

### Performance-Probleme

1. Reduziere Zeitraum für Anomalie-Berechnung (aktuell 30 Tage)
2. Erhöhe Debounce-Delay in App.tsx
3. Lösche alte Anomalien regelmäßig mit `deleteOldAnomalies()`

## Zukünftige Erweiterungen

- [ ] Email-Benachrichtigungen bei kritischen Anomalien
- [ ] Automatisches Resolved nach X Tagen
- [ ] Anomalie-Statistiken im Dashboard
- [ ] Export von Anomalien als CSV/PDF
- [ ] Benutzerdefinierte Anomalie-Regeln
