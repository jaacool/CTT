import { supabase, isSupabaseAvailable } from './supabaseClient';
import { AbsenceRequest, Project, TimeEntry, User } from '../types';

/**
 * Polling-basierter Sync Service für Supabase
 * Prüft alle 3 Sekunden auf Änderungen (ressourcenschonender als Realtime)
 */

type SyncCallback = (data: {
  absenceRequests: AbsenceRequest[];
  projects: Project[];
  timeEntries: TimeEntry[];
  users: User[];
}) => void;

let pollingInterval: ReturnType<typeof setInterval> | null = null;
let lastSyncTimestamp: string | null = null;

/**
 * Startet Polling-Sync (alle 3 Sekunden)
 */
export function startPollingSync(callback: SyncCallback, intervalSeconds: number = 3): void {
  if (!isSupabaseAvailable()) {
    console.log('ℹ️ Supabase nicht verfügbar - Polling Sync deaktiviert');
    return;
  }

  // Cleanup existing interval
  if (pollingInterval) {
    console.log('🔄 Stoppe existierendes Polling...');
    stopPollingSync();
  }

  console.log(`🔄 Starte Polling Sync (alle ${intervalSeconds} Sekunden)...`);
  
  // Setze initialen Timestamp
  lastSyncTimestamp = new Date().toISOString();

  // Polling Loop
  pollingInterval = setInterval(async () => {
    try {
      await checkForUpdates(callback);
    } catch (error) {
      console.error('❌ Fehler beim Polling:', error);
    }
  }, intervalSeconds * 1000);

  console.log('✅ Polling Sync aktiv');
}

/**
 * Prüft auf Updates seit dem letzten Sync
 */
async function checkForUpdates(callback: SyncCallback): Promise<void> {
  if (!isSupabaseAvailable() || !lastSyncTimestamp) return;

  try {
    // Lade nur Daten die seit dem letzten Sync geändert wurden
    const [absenceRequestsResult, projectsResult, timeEntriesResult, usersResult] = await Promise.all([
      supabase!
        .from('absence_requests')
        .select('data, updated_at')
        .gte('updated_at', lastSyncTimestamp),
      supabase!
        .from('projects')
        .select('data, updated_at')
        .gte('updated_at', lastSyncTimestamp),
      supabase!
        .from('time_entries')
        .select('data, updated_at')
        .gte('updated_at', lastSyncTimestamp)
        .limit(100), // Limit für Performance
      supabase!
        .from('users')
        .select('data, updated_at')
        .gte('updated_at', lastSyncTimestamp),
    ]);

    // Prüfe auf Fehler
    if (absenceRequestsResult.error) throw absenceRequestsResult.error;
    if (projectsResult.error) throw projectsResult.error;
    if (timeEntriesResult.error) throw timeEntriesResult.error;
    if (usersResult.error) throw usersResult.error;

    // Zähle Updates
    const updateCount = 
      (absenceRequestsResult.data?.length || 0) +
      (projectsResult.data?.length || 0) +
      (timeEntriesResult.data?.length || 0) +
      (usersResult.data?.length || 0);

    // Wenn es Updates gibt, lade alle Daten neu
    if (updateCount > 0) {
      console.log(`📥 ${updateCount} Änderungen gefunden, lade Daten neu...`);
      
      // Lade alle Daten (nicht nur die geänderten)
      const [allAbsenceRequests, allProjects, allUsers] = await Promise.all([
        supabase!.from('absence_requests').select('data'),
        supabase!.from('projects').select('data'),
        supabase!.from('users').select('data'),
      ]);

      // TimeEntries in Batches laden (kann sehr groß sein)
      const allTimeEntries: any[] = [];
      let from = 0;
      const batchSize = 1000;
      let hasMore = true;
      
      while (hasMore) {
        const { data, error } = await supabase!
          .from('time_entries')
          .select('data')
          .range(from, from + batchSize - 1);
        
        if (error) throw error;
        
        if (data && data.length > 0) {
          allTimeEntries.push(...data);
          from += batchSize;
          hasMore = data.length === batchSize;
        } else {
          hasMore = false;
        }
      }

      // Callback mit allen Daten
      callback({
        absenceRequests: allAbsenceRequests.data?.map(row => row.data as AbsenceRequest) || [],
        projects: allProjects.data?.map(row => row.data as Project) || [],
        timeEntries: allTimeEntries.map(row => row.data as TimeEntry),
        users: allUsers.data?.map(row => row.data as User) || [],
      });

      console.log('✅ Daten synchronisiert');
    }

    // Update Timestamp für nächsten Check
    lastSyncTimestamp = new Date().toISOString();
  } catch (error) {
    console.error('❌ Fehler beim Prüfen auf Updates:', error);
  }
}

/**
 * Stoppt Polling-Sync
 */
export function stopPollingSync(): void {
  if (pollingInterval) {
    console.log('🛑 Stoppe Polling Sync...');
    clearInterval(pollingInterval);
    pollingInterval = null;
    lastSyncTimestamp = null;
    console.log('✅ Polling Sync gestoppt');
  }
}

/**
 * Prüft ob Polling-Sync aktiv ist
 */
export function isPollingSyncActive(): boolean {
  return pollingInterval !== null;
}

/**
 * Erzwingt einen sofortigen Sync (außerhalb des Intervalls)
 */
export async function forceSyncNow(callback: SyncCallback): Promise<void> {
  if (!isSupabaseAvailable()) {
    console.log('ℹ️ Supabase nicht verfügbar');
    return;
  }

  console.log('🔄 Erzwinge sofortigen Sync...');
  await checkForUpdates(callback);
}
