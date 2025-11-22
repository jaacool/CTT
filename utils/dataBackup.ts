import { Project, TimeEntry, User, AbsenceRequest } from '../types';
import pako from 'pako';

interface BackupData {
  version: string;
  timestamp: string;
  users: User[];
  projects: Project[];
  timeEntries: TimeEntry[]; // Limitiert auf letzte 1500
  absenceRequests: AbsenceRequest[];
  // Session-Daten
  favoriteProjectIds?: string[];
  pinnedTasks?: string[];
  dashboardNote?: string;
  selectedState?: string;
  separateHomeOffice?: boolean;
  showAdminsInDMs?: boolean;
  maxUploadSize?: number;
}

/**
 * Exportiert alle Daten als komprimierte JSON-Datei
 */
export function exportDataToFile(
  users: User[],
  projects: Project[],
  timeEntries: TimeEntry[],
  absenceRequests: AbsenceRequest[]
): void {
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

  // Erstelle Blob und Download
  const blob = new Blob([compressed], { type: 'application/gzip' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `ctt-backup-${new Date().toISOString().split('T')[0]}.json.gz`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);

  console.log('✅ Backup-Datei heruntergeladen');
}

/**
 * Importiert Daten aus einer komprimierten JSON-Datei
 */
export async function importDataFromFile(file: File): Promise<BackupData | null> {
  try {
    console.log('📥 Lade Backup-Datei...');
    
    // Lese Datei als ArrayBuffer
    const arrayBuffer = await file.arrayBuffer();
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
    console.error('❌ Fehler beim Laden der Backup-Datei:', error);
    return null;
  }
}

/**
 * Speichert Daten in localStorage (für schnellen Zugriff)
 */
export function saveToLocalStorage(
  users: User[],
  projects: Project[],
  timeEntries: TimeEntry[],
  absenceRequests: AbsenceRequest[],
  sessionData?: {
    favoriteProjectIds?: string[];
    pinnedTasks?: string[];
    dashboardNote?: string;
    selectedState?: string;
    separateHomeOffice?: boolean;
    showAdminsInDMs?: boolean;
    maxUploadSize?: number;
  }
): void {
  try {
    // Limitiere timeEntries auf letzte 1500 für Performance
    const limitedTimeEntries = timeEntries
      .sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime())
      .slice(0, 1500);
    
    const backup: BackupData = {
      version: '1.0',
      timestamp: new Date().toISOString(),
      users,
      projects,
      timeEntries: limitedTimeEntries,
      absenceRequests,
      ...sessionData
    };

    const jsonString = JSON.stringify(backup);
    console.log(`📦 JSON Größe: ${(jsonString.length / 1024 / 1024).toFixed(2)} MB`);
    
    const compressed = pako.gzip(jsonString);
    console.log(`📦 Komprimiert: ${(compressed.length / 1024).toFixed(2)} KB`);
    
    // Prüfe ob Daten zu groß für localStorage sind (>5MB komprimiert)
    if (compressed.length > 5 * 1024 * 1024) {
      console.warn('⚠️ Daten zu groß für localStorage (>5MB). Überspringe localStorage Cache.');
      console.log('💡 Verwende stattdessen Supabase Storage Backup für schnellen Load.');
      return;
    }
    
    // Konvertiere zu Base64 in kleineren Chunks (verhindert Stack Overflow)
    const chunkSize = 8192;
    let base64 = '';
    for (let i = 0; i < compressed.length; i += chunkSize) {
      const chunk = compressed.slice(i, i + chunkSize);
      base64 += btoa(String.fromCharCode(...chunk));
    }
    console.log(`📦 Base64: ${(base64.length / 1024).toFixed(2)} KB`);
    
    localStorage.setItem('ctt_backup', base64);
    
    console.log(`✅ Daten in localStorage gespeichert!`);
    console.log(`   🗜️ Kompressionsrate: ${((1 - compressed.length / jsonString.length) * 100).toFixed(1)}%`);
  } catch (error) {
    console.error('❌ Fehler beim Speichern in localStorage:', error);
    console.error('Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      name: error instanceof Error ? error.name : 'Unknown',
      stack: error instanceof Error ? error.stack : undefined,
      type: typeof error,
      error: error
    });
    
    // Prüfe localStorage Quota
    if (error instanceof Error && error.name === 'QuotaExceededError') {
      console.error('⚠️ localStorage ist voll! localStorage hat meist nur 5-10 MB Platz');
    }
  }
}

/**
 * Lädt Daten aus localStorage
 */
export function loadFromLocalStorage(): BackupData | null {
  try {
    const base64 = localStorage.getItem('ctt_backup');
    if (!base64) {
      console.log('ℹ️ Keine Daten in localStorage gefunden');
      return null;
    }

    // Validiere Base64 Format
    if (!/^[A-Za-z0-9+/]*={0,2}$/.test(base64)) {
      console.warn('⚠️ Ungültiges Base64 Format in localStorage, lösche korrupte Daten');
      localStorage.removeItem('ctt_backup');
      return null;
    }

    // Dekodiere Base64 in kleineren Chunks (verhindert atob Fehler bei großen Strings)
    const chunkSize = 8192;
    const chunks: number[] = [];
    
    for (let i = 0; i < base64.length; i += chunkSize) {
      const chunk = base64.slice(i, i + chunkSize);
      try {
        const decoded = atob(chunk);
        for (let j = 0; j < decoded.length; j++) {
          chunks.push(decoded.charCodeAt(j));
        }
      } catch (e) {
        console.warn('⚠️ Fehler beim Dekodieren von Base64 Chunk, lösche korrupte Daten');
        localStorage.removeItem('ctt_backup');
        return null;
      }
    }
    
    const compressed = new Uint8Array(chunks);
    const decompressed = pako.ungzip(compressed, { to: 'string' });
    const backup: BackupData = JSON.parse(decompressed);
    
    console.log(`✅ Daten aus localStorage geladen: ${backup.users.length} Users, ${backup.projects.length} Projekte, ${backup.timeEntries.length} TimeEntries`);
    
    return backup;
  } catch (error) {
    console.error('❌ Fehler beim Laden aus localStorage:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      name: error instanceof Error ? error.name : 'Unknown'
    });
    // Lösche korrupte Daten
    try {
      localStorage.removeItem('ctt_backup');
      console.log('🗑️ Korrupte localStorage Daten entfernt');
    } catch (e) {
      // Ignore cleanup errors
    }
    return null;
  }
}
