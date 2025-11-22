// =====================================================
// OPTIMIZED TIMER HOOK
// =====================================================
// Isoliert Timer-Updates vom Rest der App
// Verhindert massive Re-Renders bei laufendem Timer

import { useState, useEffect, useRef, useCallback } from 'react';

interface TimerState {
  activeTaskId: string | null;
  activeEntryId: string | null;
  elapsed: number;
}

interface UseTimerOptimizedReturn {
  activeTimerTaskId: string | null;
  activeTimeEntryId: string | null;
  taskTimers: Record<string, number>;
  startTimer: (taskId: string, entryId: string) => void;
  stopTimer: () => void;
  getElapsedTime: (taskId: string) => number;
}

/**
 * Optimierter Timer Hook
 * - Verwendet lokalen State für Timer-Updates
 * - Minimiert Re-Renders der Parent-Komponente
 * - Callback nur bei Start/Stop, nicht bei jedem Tick
 */
export function useTimerOptimized(
  onTimerStart?: (taskId: string, entryId: string) => void,
  onTimerStop?: (taskId: string, entryId: string, duration: number) => void,
  onTimerTick?: (taskId: string, duration: number) => void
): UseTimerOptimizedReturn {
  const [timerState, setTimerState] = useState<TimerState>({
    activeTaskId: null,
    activeEntryId: null,
    elapsed: 0,
  });

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const tickCountRef = useRef(0);

  // Cleanup bei Unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  // Timer-Interval
  useEffect(() => {
    if (timerState.activeTaskId && timerState.activeEntryId) {
      intervalRef.current = setInterval(() => {
        setTimerState((prev) => {
          const newElapsed = prev.elapsed + 1;
          
          // Callback nur alle 5 Sekunden für DB-Updates
          tickCountRef.current++;
          if (tickCountRef.current % 5 === 0 && onTimerTick && prev.activeTaskId) {
            onTimerTick(prev.activeTaskId, newElapsed);
          }
          
          return { ...prev, elapsed: newElapsed };
        });
      }, 1000);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [timerState.activeTaskId, timerState.activeEntryId, onTimerTick]);

  const startTimer = useCallback(
    (taskId: string, entryId: string) => {
      // Stoppe vorherigen Timer falls vorhanden
      if (timerState.activeTaskId && timerState.activeEntryId) {
        if (onTimerStop) {
          onTimerStop(timerState.activeTaskId, timerState.activeEntryId, timerState.elapsed);
        }
      }

      // Starte neuen Timer
      setTimerState({
        activeTaskId: taskId,
        activeEntryId: entryId,
        elapsed: 0,
      });

      tickCountRef.current = 0;

      if (onTimerStart) {
        onTimerStart(taskId, entryId);
      }
    },
    [timerState, onTimerStart, onTimerStop]
  );

  const stopTimer = useCallback(() => {
    if (timerState.activeTaskId && timerState.activeEntryId) {
      if (onTimerStop) {
        onTimerStop(timerState.activeTaskId, timerState.activeEntryId, timerState.elapsed);
      }

      setTimerState({
        activeTaskId: null,
        activeEntryId: null,
        elapsed: 0,
      });

      tickCountRef.current = 0;
    }
  }, [timerState, onTimerStop]);

  const getElapsedTime = useCallback(
    (taskId: string): number => {
      if (timerState.activeTaskId === taskId) {
        return timerState.elapsed;
      }
      return 0;
    },
    [timerState]
  );

  // Erstelle taskTimers-Objekt für Kompatibilität
  const taskTimers = {
    [timerState.activeTaskId || '']: timerState.elapsed,
  };

  return {
    activeTimerTaskId: timerState.activeTaskId,
    activeTimeEntryId: timerState.activeEntryId,
    taskTimers,
    startTimer,
    stopTimer,
    getElapsedTime,
  };
}
