# Auto-Entfernung von FORGOT_TO_STOP Anomalien

## Übersicht

Dieses Feature entfernt automatisch `FORGOT_TO_STOP` Anomalien, wenn ein TimeEntry geändert oder gelöscht wird und die Anomalie danach nicht mehr zutrifft.

## Problem

Wenn ein User einen TimeEntry korrigiert (z.B. Endzeit anpasst) oder löscht, der als "Stoppen vergessen" markiert wurde, blieb die Anomalie-Benachrichtigung bestehen, obwohl das Problem behoben war.

## Lösung

### Ressourcenschonender Ansatz

Statt eine separate Liste zu pflegen, prüfen wir **gezielt nur die betroffenen Anomalien** bei TimeEntry-Änderungen:

1. **Bei TimeEntry-Update/Delete**: Prüfe ob für User + Datum eine `FORGOT_TO_STOP` Anomalie existiert
2. **Re-Check**: Führe Detection-Logik nur für diesen spezifischen Eintrag aus
3. **Auto-Delete**: Wenn Anomalie nicht mehr zutrifft → Aus Supabase löschen

**Vorteile**:
- ✅ Keine zusätzliche Liste pflegen
- ✅ Nur betroffene Anomalien werden geprüft (O(1) statt O(n))
- ✅ Supabase-Sync automatisch
- ✅ Realtime-Updates funktionieren

## Implementierung

### 1. Neue Funktionen

#### `anomalySync.ts`
```typescript
export async function deleteAnomaly(
  userId: string,
  date: string,
  type: AnomalyType
): Promise<void>
```
Löscht eine Anomalie aus Supabase.

#### `anomalyDetection.ts`
```typescript
export function shouldKeepForgotToStopAnomaly(
  timeEntry: TimeEntry,
  allTimeEntries: TimeEntry[]
): boolean
```
Prüft ob eine FORGOT_TO_STOP Anomalie nach TimeEntry-Änderung noch gültig ist.

#### `useAnomalyDetection.ts`
```typescript
const removeAnomaly = useCallback((userId: string, date: string, type: string) => {
  setAnomalies(prev => prev.filter(a => 
    !(a.userId === userId && a.date === date && a.type === type)
  ));
}, []);
```
Entfernt Anomalie aus lokalem State.

### 2. Integration in App.tsx

#### handleUpdateTimeEntry
```typescript
// ⚡ AUTO-REMOVE FORGOT_TO_STOP ANOMALY
const entryStartDate = new Date(updatedEntry.startTime).toISOString().split('T')[0];
const existingAnomaly = anomalies.find(
  a => a.userId === updatedEntry.user.id && 
       a.date === entryStartDate && 
       a.type === AnomalyType.FORGOT_TO_STOP
);

if (existingAnomaly) {
  const shouldKeep = shouldKeepForgotToStopAnomaly(updatedEntry, updatedEntries);
  if (!shouldKeep) {
    deleteAnomaly(updatedEntry.user.id, entryStartDate, AnomalyType.FORGOT_TO_STOP);
    removeAnomalyLocal(updatedEntry.user.id, entryStartDate, AnomalyType.FORGOT_TO_STOP);
    console.log('✅ FORGOT_TO_STOP Anomalie automatisch entfernt nach TimeEntry-Änderung');
  }
}
```

#### handleDeleteTimeEntry
```typescript
// ⚡ AUTO-REMOVE FORGOT_TO_STOP ANOMALY
const entryToDelete = timeEntries.find(e => e.id === entryId);
if (entryToDelete) {
  const entryStartDate = new Date(entryToDelete.startTime).toISOString().split('T')[0];
  const existingAnomaly = anomalies.find(
    a => a.userId === entryToDelete.user.id && 
         a.date === entryStartDate && 
         a.type === AnomalyType.FORGOT_TO_STOP
  );
  
  if (existingAnomaly) {
    const remainingEntries = timeEntries.filter(e => e.id !== entryId);
    const shouldKeep = shouldKeepForgotToStopAnomaly(entryToDelete, remainingEntries);
    
    if (!shouldKeep) {
      deleteAnomaly(entryToDelete.user.id, entryStartDate, AnomalyType.FORGOT_TO_STOP);
      removeAnomalyLocal(entryToDelete.user.id, entryStartDate, AnomalyType.FORGOT_TO_STOP);
      console.log('✅ FORGOT_TO_STOP Anomalie automatisch entfernt nach TimeEntry-Löschung');
    }
  }
}
```

## Workflow

### Szenario 1: TimeEntry-Änderung

1. User ändert einen TimeEntry (z.B. korrigiert Endzeit)
2. `handleUpdateTimeEntry` wird aufgerufen
3. System prüft: Existiert FORGOT_TO_STOP Anomalie für diesen Tag?
4. Falls ja: `shouldKeepForgotToStopAnomaly` prüft ob Muster noch zutrifft
5. Falls nein: Anomalie wird aus Supabase gelöscht
6. Lokaler State wird aktualisiert
7. Benachrichtigung verschwindet automatisch

### Szenario 2: TimeEntry-Löschung

1. User löscht einen TimeEntry
2. `handleDeleteTimeEntry` wird aufgerufen
3. System prüft: Existiert FORGOT_TO_STOP Anomalie für diesen Tag?
4. Falls ja: Prüfe ob andere Einträge das Muster noch erfüllen
5. Falls nein: Anomalie wird aus Supabase gelöscht
6. Lokaler State wird aktualisiert
7. Benachrichtigung verschwindet automatisch

## Supabase-Synchronisation

### DELETE Operation
```typescript
const { error } = await supabase!
  .from('anomalies')
  .delete()
  .eq('id', anomalyId);
```

### Realtime-Updates
- DELETE-Events werden automatisch an alle Clients propagiert
- Andere User sehen die Änderung in Echtzeit
- Keine manuelle Synchronisation nötig

## Performance

### Optimierungen
- **Gezieltes Prüfen**: Nur betroffene Anomalien werden geprüft
- **Keine Neuberechnung**: Keine vollständige Anomalie-Detection nötig
- **Lokaler Cache**: State wird sofort aktualisiert
- **Async Delete**: Supabase-Delete blockiert nicht die UI

### Komplexität
- **Prüfung**: O(1) - Nur eine Anomalie wird geprüft
- **Re-Check**: O(n) - Nur Einträge des gleichen Tages
- **Delete**: O(1) - Direkte Supabase-Operation

## Testing

### Testfälle

1. **TimeEntry korrigieren**
   - Erstelle TimeEntry über Nacht (z.B. 22:00 - 02:00)
   - Warte auf FORGOT_TO_STOP Anomalie
   - Korrigiere Endzeit auf 23:59
   - ✅ Anomalie sollte verschwinden

2. **TimeEntry löschen**
   - Erstelle TimeEntry über Nacht
   - Warte auf FORGOT_TO_STOP Anomalie
   - Lösche TimeEntry
   - ✅ Anomalie sollte verschwinden

3. **Mehrere Einträge**
   - Erstelle 2 TimeEntries über Nacht am gleichen Tag
   - Warte auf FORGOT_TO_STOP Anomalie
   - Lösche einen Eintrag
   - ✅ Anomalie sollte BLEIBEN (anderer Eintrag erfüllt noch Muster)
   - Lösche zweiten Eintrag
   - ✅ Anomalie sollte verschwinden

4. **Realtime-Sync**
   - User A korrigiert TimeEntry
   - User B sollte Anomalie-Entfernung sehen
   - ✅ Benachrichtigung verschwindet bei beiden

## Logs

Das System loggt alle Auto-Entfernungen:
```
✅ FORGOT_TO_STOP Anomalie automatisch entfernt nach TimeEntry-Änderung
✅ FORGOT_TO_STOP Anomalie automatisch entfernt nach TimeEntry-Löschung
```

## Zukünftige Erweiterungen

- [ ] Auto-Entfernung für andere Anomalie-Typen (EXCESS_WORK, UNDER_PERFORMANCE)
- [ ] Benachrichtigung an User wenn Anomalie automatisch entfernt wurde
- [ ] Statistik über Auto-Entfernungen im Dashboard
- [ ] Undo-Funktion für versehentlich entfernte Anomalien
