# Auto-Sync (Polling)

## Übersicht

Die App nutzt **Polling** um Änderungen automatisch zwischen mehreren Browsern/Tabs zu synchronisieren. Alle **3 Sekunden** wird geprüft ob es neue Daten gibt.

## Funktionsweise

1. **Beim App-Start**: Daten werden aus Supabase geladen
2. **Polling-Loop**: Alle 3 Sekunden wird geprüft ob es Änderungen gibt
3. **Automatische Updates**: Änderungen in Browser A werden nach max. 3 Sekunden in Browser B angezeigt

## Synchronisierte Tabellen

- ✅ `absence_requests` - Urlaubsanträge & Abwesenheiten
- ✅ `projects` - Projekte
- ✅ `time_entries` - Zeiteinträge
- ✅ `users` - Benutzer

## Supabase Setup

### Schritt 1: RLS Policies konfigurieren

Stelle sicher, dass die Row Level Security (RLS) Policies korrekt konfiguriert sind:

```sql
-- Beispiel: Alle können lesen
CREATE POLICY "Enable read access for all users" ON absence_requests
FOR SELECT USING (true);

-- Beispiel: Alle können schreiben
CREATE POLICY "Enable insert access for all users" ON absence_requests
FOR INSERT WITH CHECK (true);

CREATE POLICY "Enable update access for all users" ON absence_requests
FOR UPDATE USING (true);

CREATE POLICY "Enable delete access for all users" ON absence_requests
FOR DELETE USING (true);
```

### Schritt 2: Polling testen

Öffne die Browser-Konsole und prüfe die Logs:

```
🔄 Initialisiere Polling Sync (alle 3 Sekunden)...
✅ Polling Sync aktiv
📥 Sync: Änderungen empfangen
```

## Debugging

### Problem: Sync funktioniert nicht

**Lösung 1**: Prüfe RLS Policies
- Stelle sicher, dass SELECT/INSERT/UPDATE/DELETE erlaubt sind
- Führe `SUPABASE_REALTIME_SETUP.sql` aus

**Lösung 2**: Prüfe Browser-Konsole
- Suche nach Fehlermeldungen mit "Polling" oder "Sync"
- Prüfe ob Intervall läuft

**Lösung 3**: Prüfe Netzwerk
- Öffne DevTools → Network Tab
- Prüfe ob Supabase-Requests erfolgreich sind

### Problem: Änderungen werden nicht angezeigt

**Mögliche Ursachen**:
1. RLS Policies blockieren den Zugriff
2. Netzwerkprobleme (Firewall, VPN)
3. Polling-Intervall ist zu lang (Standard: 3 Sekunden)

## Implementierung

### Datei: `utils/supabasePolling.ts`

Enthält die Polling-Logik:
- `startPollingSync()` - Startet die Synchronisation (Standard: 3 Sekunden)
- `stopPollingSync()` - Stoppt die Synchronisation
- `isPollingSyncActive()` - Prüft ob aktiv
- `forceSyncNow()` - Erzwingt sofortigen Sync

### Datei: `App.tsx`

Integriert Polling in die App:
- Startet Polling nach dem Laden der Daten
- Lädt nur geänderte Daten (basierend auf `updated_at`)
- Stoppt Polling beim Unmount

## Performance

- **Latenz**: Max. 3 Sekunden zwischen Browsern
- **Overhead**: Sehr gering, nur bei Änderungen werden Daten geladen
- **Ressourcen**: Minimal (nur HTTP-Requests, keine WebSocket-Verbindung)
- **Skalierung**: Unbegrenzt viele Clients möglich

## Intervall anpassen

Du kannst das Intervall in `App.tsx` anpassen:

```typescript
startPollingSync((data) => {
  // ...
}, 5); // 5 Sekunden statt 3
```

## Sicherheit

- Polling nutzt die gleichen RLS Policies wie normale Queries
- Keine zusätzliche Authentifizierung nötig
- Daten werden nur an autorisierte Clients gesendet

## Weitere Informationen

- [Supabase Docs](https://supabase.com/docs)
- [Supabase JavaScript Client](https://supabase.com/docs/reference/javascript)
