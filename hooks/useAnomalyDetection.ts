// =====================================================
// USE ANOMALY DETECTION HOOK
// =====================================================
// Optimierter Hook für Anomalie-Berechnung mit:
// - Intelligentes Caching
// - Debouncing
// - Inkrementelle Updates
// - Performance Monitoring

import { useState, useEffect, useCallback, useRef } from 'react';
import { User, TimeEntry, AbsenceRequest, Anomaly, AnomalyStatus, UserStatus } from '../types';
import { 
  detectAnomaliesOptimized, 
  clearAnomalyCache, 
  invalidateCacheForUser,
  invalidateCacheForDate,
  getCacheStats 
} from '../utils/anomalyWorker';
import { useDebouncedCallback } from './useDebouncedCallback';

interface UseAnomalyDetectionOptions {
  debounceMs?: number;
  enableCache?: boolean;
  enablePerformanceMonitoring?: boolean;
}

interface PerformanceMetrics {
  lastCalculationTime: number;
  averageCalculationTime: number;
  totalCalculations: number;
  cacheHitRate: number;
}

export function useAnomalyDetection(
  currentUser: User | null,
  users: User[],
  timeEntries: TimeEntry[],
  absenceRequests: AbsenceRequest[],
  options: UseAnomalyDetectionOptions = {}
) {
  const {
    debounceMs = 3000,
    enableCache = true,
    enablePerformanceMonitoring = true
  } = options;

  const [anomalies, setAnomalies] = useState<Anomaly[]>([]);
  const [isCalculating, setIsCalculating] = useState(false);
  const [performanceMetrics, setPerformanceMetrics] = useState<PerformanceMetrics>({
    lastCalculationTime: 0,
    averageCalculationTime: 0,
    totalCalculations: 0,
    cacheHitRate: 0
  });

  // Refs für Performance-Tracking
  const calculationTimes = useRef<number[]>([]);
  const lastTimeEntriesHash = useRef<string>('');
  const lastAbsenceRequestsHash = useRef<string>('');

  // Helper: Erstelle Hash für Change Detection
  const createHash = useCallback((data: any[]): string => {
    return `${data.length}-${data.map(d => d.id).join(',')}`;
  }, []);

  // Helper: Prüfe ob Daten sich geändert haben
  const hasDataChanged = useCallback((): boolean => {
    const timeEntriesHash = createHash(timeEntries);
    const absenceRequestsHash = createHash(absenceRequests);
    
    const changed = 
      timeEntriesHash !== lastTimeEntriesHash.current ||
      absenceRequestsHash !== lastAbsenceRequestsHash.current;
    
    if (changed) {
      lastTimeEntriesHash.current = timeEntriesHash;
      lastAbsenceRequestsHash.current = absenceRequestsHash;
    }
    
    return changed;
  }, [timeEntries, absenceRequests, createHash]);

  // Hauptberechnung (optimiert)
  const calculateAnomalies = useCallback(async () => {
    if (!currentUser || users.length === 0) return;
    
    // Sicherheitsnetz: Für inaktive User NIE Anomalien berechnen
    if (currentUser.status === UserStatus.Inactive) return;

    // Performance-Tracking starten
    const startTime = performance.now();
    setIsCalculating(true);

    try {
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 30); // Last 30 days

      let newAnomalies: Anomaly[] = [];
      
      const isAdmin = currentUser.role === 'role-1' || currentUser.role === 'admin';
      
      // WICHTIG:
      // - Admins bekommen selbst KEINE Anomalien, sehen aber die der aktiven Mitarbeitenden
      // - Inaktive User werden komplett ignoriert
      const usersToCheck = isAdmin
        ? users.filter(u => u.status === UserStatus.Active && u.role !== 'role-1' && u.role !== 'admin')
        : (currentUser.status === UserStatus.Active ? [currentUser] : []);
      
      // OPTIMIZATION: Berechne Anomalien für alle User (nutzt Caching)
      usersToCheck.forEach(user => {
        const userAnomalies = detectAnomaliesOptimized(
          user, 
          timeEntries, 
          absenceRequests, 
          startDate, 
          endDate,
          enableCache
        );
        newAnomalies = [...newAnomalies, ...userAnomalies];
      });
      
      // Merge mit existierenden Anomalien (Status & Kommentare behalten)
      setAnomalies(prev => {
        const merged = newAnomalies.map(newA => {
          const existing = prev.find(
            a => a.userId === newA.userId && 
                 a.date === newA.date && 
                 a.type === newA.type
          );
          
          return {
            ...newA,
            status: existing?.status || AnomalyStatus.Open,
            comments: existing?.comments || []
          };
        });
        
        return merged;
      });

      // Performance-Tracking beenden
      const endTime = performance.now();
      const calculationTime = endTime - startTime;
      
      if (enablePerformanceMonitoring) {
        calculationTimes.current.push(calculationTime);
        
        // Behalte nur die letzten 10 Messungen
        if (calculationTimes.current.length > 10) {
          calculationTimes.current.shift();
        }
        
        const avgTime = calculationTimes.current.reduce((a, b) => a + b, 0) / calculationTimes.current.length;
        const cacheStats = getCacheStats();
        
        setPerformanceMetrics({
          lastCalculationTime: Math.round(calculationTime),
          averageCalculationTime: Math.round(avgTime),
          totalCalculations: calculationTimes.current.length,
          cacheHitRate: cacheStats.size > 0 ? Math.round((cacheStats.size / (usersToCheck.length * 30)) * 100) : 0
        });
        
        console.log('📊 Anomaly Detection Performance:', {
          calculationTime: `${Math.round(calculationTime)}ms`,
          averageTime: `${Math.round(avgTime)}ms`,
          cacheSize: cacheStats.size,
          cacheHitRate: `${Math.round((cacheStats.size / (usersToCheck.length * 30)) * 100)}%`,
          usersChecked: usersToCheck.length,
          anomaliesFound: newAnomalies.length
        });
      }
    } catch (error) {
      console.error('❌ Anomaly detection failed:', error);
    } finally {
      setIsCalculating(false);
    }
  }, [currentUser, users, timeEntries, absenceRequests, enableCache, enablePerformanceMonitoring]);

  // Debounced Berechnung
  const debouncedCalculate = useDebouncedCallback(calculateAnomalies, debounceMs);

  // Trigger Berechnung bei Datenänderungen
  useEffect(() => {
    // Nur neu berechnen wenn sich Daten tatsächlich geändert haben
    if (hasDataChanged()) {
      debouncedCalculate();
    }
  }, [timeEntries, absenceRequests, users, currentUser, hasDataChanged, debouncedCalculate]);

  // Cache Management Funktionen
  const clearCache = useCallback(() => {
    clearAnomalyCache();
    console.log('🗑️ Anomaly cache cleared');
  }, []);

  const invalidateUserCache = useCallback((userId: string) => {
    invalidateCacheForUser(userId);
    console.log(`🗑️ Cache invalidated for user: ${userId}`);
  }, []);

  const invalidateDateCache = useCallback((date: string) => {
    invalidateCacheForDate(date);
    console.log(`🗑️ Cache invalidated for date: ${date}`);
  }, []);

  const forceRecalculate = useCallback(() => {
    clearCache();
    calculateAnomalies();
  }, [clearCache, calculateAnomalies]);

  return {
    anomalies,
    isCalculating,
    performanceMetrics,
    clearCache,
    invalidateUserCache,
    invalidateDateCache,
    forceRecalculate
  };
}
