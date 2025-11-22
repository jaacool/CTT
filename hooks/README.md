# 🎣 Custom Hooks

Performance-optimierte Custom Hooks für die CTT-App.

---

## 📦 Verfügbare Hooks

### 1. `useDebouncedCallback`

Verzögert die Ausführung eines Callbacks um eine bestimmte Zeit.

**Use Case:** Verhindert zu häufige Aufrufe bei schnellen Updates (z.B. Input, Scroll, Resize).

**Beispiel:**
```typescript
import { useDebouncedCallback } from './hooks/useDebouncedCallback';

const MyComponent = () => {
  const debouncedSave = useDebouncedCallback(
    (data) => {
      saveToDatabase(data);
    },
    2000 // 2 Sekunden Debounce
  );

  return (
    <input onChange={(e) => debouncedSave(e.target.value)} />
  );
};
```

**Parameter:**
- `callback`: Die zu verzögernde Funktion
- `delay`: Verzögerung in Millisekunden

**Verhalten:**
- Wartet `delay` ms nach dem letzten Aufruf
- Führt dann den Callback aus
- Resettet Timer bei jedem neuen Aufruf

---

### 2. `useThrottledCallback`

Führt einen Callback maximal einmal pro Intervall aus.

**Use Case:** Limitiert die Frequenz von Aufrufen (z.B. Scroll-Events, API-Calls).

**Beispiel:**
```typescript
import { useThrottledCallback } from './hooks/useDebouncedCallback';

const MyComponent = () => {
  const throttledScroll = useThrottledCallback(
    () => {
      console.log('Scroll event');
    },
    1000 // Maximal 1x pro Sekunde
  );

  return (
    <div onScroll={throttledScroll}>
      {/* Content */}
    </div>
  );
};
```

**Parameter:**
- `callback`: Die zu throttelnde Funktion
- `delay`: Minimales Intervall in Millisekunden

**Verhalten:**
- Führt sofort aus wenn möglich
- Wartet dann `delay` ms bis zum nächsten Aufruf
- Queued Calls werden verzögert ausgeführt

---

### 3. `useTimerOptimized`

Optimierter Timer Hook mit isolierten Updates.

**Use Case:** Timer-Funktionalität ohne massive Re-Renders.

**Beispiel:**
```typescript
import { useTimerOptimized } from './hooks/useTimerOptimized';

const MyComponent = () => {
  const {
    activeTimerTaskId,
    activeTimeEntryId,
    taskTimers,
    startTimer,
    stopTimer,
    getElapsedTime
  } = useTimerOptimized(
    (taskId, entryId) => {
      // onTimerStart
      console.log('Timer started:', taskId);
    },
    (taskId, entryId, duration) => {
      // onTimerStop
      console.log('Timer stopped:', taskId, duration);
    },
    (taskId, duration) => {
      // onTimerTick (alle 5 Sekunden)
      saveToDatabase(taskId, duration);
    }
  );

  return (
    <div>
      <button onClick={() => startTimer('task-1', 'entry-1')}>
        Start Timer
      </button>
      <button onClick={stopTimer}>
        Stop Timer
      </button>
      <div>Elapsed: {getElapsedTime('task-1')}s</div>
    </div>
  );
};
```

**Parameter:**
- `onTimerStart`: Callback beim Start (optional)
- `onTimerStop`: Callback beim Stop (optional)
- `onTimerTick`: Callback alle 5 Sekunden (optional)

**Return:**
- `activeTimerTaskId`: ID des aktiven Tasks
- `activeTimeEntryId`: ID des aktiven TimeEntry
- `taskTimers`: Objekt mit Timer-Werten
- `startTimer(taskId, entryId)`: Timer starten
- `stopTimer()`: Timer stoppen
- `getElapsedTime(taskId)`: Verstrichene Zeit abrufen

**Features:**
- ⚡ Minimale Re-Renders
- 💾 Auto-Save alle 5 Sekunden
- 🎯 Isolierter Timer-State
- 🧹 Automatisches Cleanup

---

## 🎯 Best Practices

### Debouncing vs Throttling

**Debouncing:**
- ✅ Input-Felder (Search, Autocomplete)
- ✅ Window Resize
- ✅ Cache-Speicherung
- ✅ API-Calls nach User-Input

**Throttling:**
- ✅ Scroll-Events
- ✅ Mouse-Move
- ✅ Realtime-Updates
- ✅ Animation-Frames

### Performance-Tipps

1. **Wähle die richtige Delay:**
   - Input: 300-500ms
   - Cache: 1000-2000ms
   - Scroll: 100-200ms
   - API: 500-1000ms

2. **Cleanup beachten:**
   - Hooks cleanen automatisch auf
   - Kein manuelles clearTimeout nötig

3. **Callback-Referenzen:**
   - Callbacks werden automatisch aktualisiert
   - Keine Dependency-Probleme

---

## 📊 Performance-Gewinn

### Vorher (ohne Hooks):
```typescript
// Jeder Keystroke triggert API-Call
const handleInput = (value) => {
  saveToAPI(value); // 100+ Calls pro Sekunde
};
```

### Nachher (mit useDebouncedCallback):
```typescript
// Nur 1 API-Call nach 500ms Pause
const handleInput = useDebouncedCallback(
  (value) => saveToAPI(value),
  500
);
```

**Ergebnis:**
- 📉 99% weniger API-Calls
- ⚡ Bessere Performance
- 💰 Niedrigere Kosten
- 🎯 Bessere UX

---

## 🔧 Troubleshooting

### Problem: Callback wird nicht ausgeführt
**Lösung:** Prüfe ob Component unmountet wird bevor Delay abläuft.

### Problem: Zu viele Aufrufe
**Lösung:** Erhöhe Delay oder nutze Throttling statt Debouncing.

### Problem: Veraltete Daten im Callback
**Lösung:** Callback-Referenz wird automatisch aktualisiert, kein Problem.

---

## 📝 Weitere Ressourcen

- [React Performance Optimization](https://react.dev/learn/render-and-commit)
- [Debouncing vs Throttling](https://css-tricks.com/debouncing-throttling-explained-examples/)
- [Custom Hooks Best Practices](https://react.dev/learn/reusing-logic-with-custom-hooks)

---

**Entwickelt für die CTT-App Performance-Optimierung** 🚀
