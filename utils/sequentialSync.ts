// =====================================================
// SEQUENTIAL SYNC STRATEGY
// =====================================================
// Intelligente Sync-Strategie mit sequentiellen Intervallen
// Verhindert parallele Requests und reduziert Server-Last

import { supabase, isSupabaseAvailable } from './supabaseClient';
import { AbsenceRequest, Project, TimeEntry, User } from '../types';

type SyncCallback = (data: {
  absenceRequests: AbsenceRequest[];
  projects: Project[];
  timeEntries: TimeEntry[];
  users: User[];
}) => void;

interface SyncConfig {
  users: { interval: number; enabled: boolean };
  projects: { interval: number; enabled: boolean };
  timeEntries: { interval: number; enabled: boolean };
  absenceRequests: { interval: number; enabled: boolean };
}

const DEFAULT_CONFIG: SyncConfig = {
  users: { interval: 30, enabled: true },           // Alle 30 Sekunden
  projects: { interval: 10, enabled: true },        // Alle 10 Sekunden
  timeEntries: { interval: 5, enabled: true },      // Alle 5 Sekunden
  absenceRequests: { interval: 20, enabled: true }, // Alle 20 Sekunden
};

let syncIntervals: Record<string, ReturnType<typeof setInterval> | null> = {
  users: null,
  projects: null,
  timeEntries: null,
  absenceRequests: null,
};

let lastSyncTimestamps: Record<string, string> = {
  users: new Date().toISOString(),
  projects: new Date().toISOString(),
  timeEntries: new Date().toISOString(),
  absenceRequests: new Date().toISOString(),
};

let isCurrentlySyncing = false;

/**
 * Startet sequentielle Sync-Strategie
 * Jede Datenquelle hat ihr eigenes Intervall
 */
export function startSequentialSync(
  callback: SyncCallback,
  config: Partial<SyncConfig> = {}
): void {
  if (!isSupabaseAvailable()) {
    console.log('ℹ️ Supabase nicht verfügbar - Sequential Sync deaktiviert');
    return;
  }

  // Merge mit Default-Config
  const finalConfig: SyncConfig = {
    users: { ...DEFAULT_CONFIG.users, ...config.users },
    projects: { ...DEFAULT_CONFIG.projects, ...config.projects },
    timeEntries: { ...DEFAULT_CONFIG.timeEntries, ...config.timeEntries },
    absenceRequests: { ...DEFAULT_CONFIG.absenceRequests, ...config.absenceRequests },
  };

  console.log('🔄 Starte Sequential Sync mit Config:', finalConfig);

  // Stoppe existierende Intervals
  stopSequentialSync();

  // Starte Intervals für jede Datenquelle
  Object.keys(finalConfig).forEach((key) => {
    const syncKey = key as keyof SyncConfig;
    const { interval, enabled } = finalConfig[syncKey];

    if (!enabled) {
      console.log(`⏸️ ${syncKey} Sync deaktiviert`);
      return;
    }

    console.log(`✅ ${syncKey} Sync: alle ${interval}s`);

    syncIntervals[syncKey] = setInterval(async () => {
      // Verhindere parallele Syncs
      if (isCurrentlySyncing) {
        console.log(`⏳ Sync läuft bereits, überspringe ${syncKey}`);
        return;
      }

      try {
        isCurrentlySyncing = true;
        await syncDataSource(syncKey, callback);
      } catch (error) {
        console.error(`❌ Fehler beim Sync von ${syncKey}:`, error);
      } finally {
        isCurrentlySyncing = false;
      }
    }, interval * 1000);
  });

  console.log('✅ Sequential Sync aktiv');
}

/**
 * Synchronisiert eine einzelne Datenquelle
 */
async function syncDataSource(
  source: keyof SyncConfig,
  callback: SyncCallback
): Promise<void> {
  if (!isSupabaseAvailable()) return;

  const tableName = getTableName(source);
  const lastSync = lastSyncTimestamps[source];

  try {
    // Prüfe auf Updates seit letztem Sync
    const { data: updates, error } = await supabase!
      .from(tableName)
      .select('data, updated_at')
      .gte('updated_at', lastSync)
      .limit(100);

    if (error) throw error;

    // Wenn Updates vorhanden, lade alle Daten dieser Quelle
    if (updates && updates.length > 0) {
      console.log(`📥 ${source}: ${updates.length} Änderungen gefunden`);

      const { data: allData, error: allError } = await supabase!
        .from(tableName)
        .select('data');

      if (allError) throw allError;

      // Callback mit aktualisierten Daten
      const parsedData = allData?.map((row) => row.data) || [];
      
      // Erstelle Update-Objekt mit nur dieser Datenquelle
      const updateData: any = {
        absenceRequests: [],
        projects: [],
        timeEntries: [],
        users: [],
      };
      
      updateData[source] = parsedData;
      
      callback(updateData);
      console.log(`✅ ${source} synchronisiert: ${parsedData.length} Einträge`);
    }

    // Update Timestamp
    lastSyncTimestamps[source] = new Date().toISOString();
  } catch (error) {
    console.error(`❌ Fehler beim Sync von ${source}:`, error);
  }
}

/**
 * Mappt Datenquelle zu Tabellennamen
 */
function getTableName(source: keyof SyncConfig): string {
  const mapping: Record<keyof SyncConfig, string> = {
    users: 'users',
    projects: 'projects',
    timeEntries: 'time_entries',
    absenceRequests: 'absence_requests',
  };
  return mapping[source];
}

/**
 * Stoppt alle Sync-Intervals
 */
export function stopSequentialSync(): void {
  console.log('🛑 Stoppe Sequential Sync...');

  Object.keys(syncIntervals).forEach((key) => {
    if (syncIntervals[key]) {
      clearInterval(syncIntervals[key]!);
      syncIntervals[key] = null;
    }
  });

  console.log('✅ Sequential Sync gestoppt');
}

/**
 * Erzwingt sofortigen Sync einer bestimmten Datenquelle
 */
export async function forceSyncSource(
  source: keyof SyncConfig,
  callback: SyncCallback
): Promise<void> {
  if (!isSupabaseAvailable()) {
    console.log('ℹ️ Supabase nicht verfügbar');
    return;
  }

  console.log(`🔄 Erzwinge sofortigen Sync von ${source}...`);
  await syncDataSource(source, callback);
}

/**
 * Prüft ob Sequential Sync aktiv ist
 */
export function isSequentialSyncActive(): boolean {
  return Object.values(syncIntervals).some((interval) => interval !== null);
}
