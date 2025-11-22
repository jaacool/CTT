// =====================================================
// DEBOUNCED CALLBACK HOOK
// =====================================================
// Verzögert häufige Callbacks um Performance zu verbessern

import { useCallback, useRef, useEffect } from 'react';

/**
 * Hook für verzögerte Callbacks
 * Verhindert zu häufige Aufrufe (z.B. bei Scroll, Input, etc.)
 */
export function useDebouncedCallback<T extends (...args: any[]) => any>(
  callback: T,
  delay: number
): (...args: Parameters<T>) => void {
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const callbackRef = useRef(callback);

  // Update callback ref wenn sich callback ändert
  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  // Cleanup bei Unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return useCallback(
    (...args: Parameters<T>) => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      timeoutRef.current = setTimeout(() => {
        callbackRef.current(...args);
      }, delay);
    },
    [delay]
  );
}

/**
 * Hook für throttled Callbacks
 * Führt Callback maximal einmal pro Intervall aus
 */
export function useThrottledCallback<T extends (...args: any[]) => any>(
  callback: T,
  delay: number
): (...args: Parameters<T>) => void {
  const lastRunRef = useRef<number>(0);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const callbackRef = useRef(callback);

  // Update callback ref wenn sich callback ändert
  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  // Cleanup bei Unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return useCallback(
    (...args: Parameters<T>) => {
      const now = Date.now();
      const timeSinceLastRun = now - lastRunRef.current;

      if (timeSinceLastRun >= delay) {
        // Führe sofort aus
        callbackRef.current(...args);
        lastRunRef.current = now;
      } else {
        // Verzögere bis delay abgelaufen ist
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
        }

        timeoutRef.current = setTimeout(() => {
          callbackRef.current(...args);
          lastRunRef.current = Date.now();
        }, delay - timeSinceLastRun);
      }
    },
    [delay]
  );
}
