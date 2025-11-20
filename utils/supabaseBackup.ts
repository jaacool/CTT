import { createClient } from '@supabase/supabase-js';
import { Project, TimeEntry, User, AbsenceRequest } from '../types';
import pako from 'pako';

const SUPABASE_URL = (import.meta as any).env?.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY;

const supabase = SUPABASE_URL && SUPABASE_ANON_KEY 
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  : null;

interface BackupData {
  version: string;
  timestamp: string;
  users: User[];
  projects: Project[];
  timeEntries: TimeEntry[];
  absenceRequests: AbsenceRequest[];
}

/**
 * Speichert alle Daten als komprimierte JSON-Datei in Supabase Storage
 */
export async function saveCompressedBackupToSupabase(
  users: User[],
  projects: Project[],
  timeEntries: TimeEntry[],
  absenceRequests: AbsenceRequest[]
): Promise<boolean> {
  if (!supabase) return false;

  try {
    console.log('📦 Erstelle komprimiertes Backup...');

    const backup: BackupData = {
      version: '1.0',
      timestamp: new Date().toISOString(),
      users,
      projects,
      timeEntries,
      absenceRequests
    };

    // Konvertiere zu JSON
    const jsonString = JSON.stringify(backup);
    console.log(`📦 Original Größe: ${(jsonString.length / 1024 / 1024).toFixed(2)} MB`);

    // Komprimiere mit gzip
    const compressed = pako.gzip(jsonString);
    console.log(`📦 Komprimiert: ${(compressed.length / 1024 / 1024).toFixed(2)} MB`);

    // Speichere in Supabase Storage
    const { error } = await supabase.storage
      .from('backups')
      .upload('latest-backup.json.gz', compressed, {
        contentType: 'application/gzip',
        upsert: true // Überschreibe existierendes Backup
      });

    if (error) {
      // Wenn Bucket nicht existiert, ist das OK - Feature ist optional
      if (error.message?.includes('Bucket not found') || error.message?.includes('not found')) {
        console.log('ℹ️ Storage Bucket "backups" existiert nicht (optional)');
        return false;
      }
      throw error;
    }

    console.log('✅ Komprimiertes Backup in Supabase gespeichert');
    return true;
  } catch (error) {
    console.error('❌ Fehler beim Speichern des Backups:', error);
    return false;
  }
}

/**
 * Lädt alle Daten aus dem komprimierten Backup in Supabase Storage
 */
export async function loadCompressedBackupFromSupabase(): Promise<BackupData | null> {
  if (!supabase) return null;

  try {
    console.log('📥 Lade komprimiertes Backup aus Supabase...');

    // Lade Datei aus Storage
    const { data, error } = await supabase.storage
      .from('backups')
      .download('latest-backup.json.gz');

    if (error) {
      // Wenn Bucket oder Datei nicht existiert, ist das OK - Feature ist optional
      if (error.message?.includes('not found') || 
          error.message?.includes('Bucket not found') ||
          (error as any).__isStorageError) {
        console.log('ℹ️ Kein Backup gefunden (Storage Bucket oder Datei existiert nicht - optional)');
        return null;
      }
      throw error;
    }
    
    if (!data) {
      console.log('ℹ️ Keine Backup-Daten vorhanden');
      return null;
    }

    // Konvertiere Blob zu ArrayBuffer
    const arrayBuffer = await data.arrayBuffer();
    const compressed = new Uint8Array(arrayBuffer);

    console.log(`📦 Komprimierte Größe: ${(compressed.length / 1024 / 1024).toFixed(2)} MB`);

    // Dekomprimiere
    const decompressed = pako.ungzip(compressed, { to: 'string' });
    console.log(`📦 Dekomprimierte Größe: ${(decompressed.length / 1024 / 1024).toFixed(2)} MB`);

    // Parse JSON
    const backup: BackupData = JSON.parse(decompressed);

    console.log(`✅ Backup geladen: ${backup.users.length} Users, ${backup.projects.length} Projekte, ${backup.timeEntries.length} TimeEntries`);

    return backup;
  } catch (error) {
    console.error('❌ Fehler beim Laden des Backups:', error);
    return null;
  }
}
