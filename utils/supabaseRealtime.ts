import { supabase, isSupabaseAvailable } from './supabaseClient';
import { AbsenceRequest, Project, TimeEntry, User } from '../types';
import { RealtimeChannel } from '@supabase/supabase-js';

/**
 * Realtime Sync Service für Supabase
 * Synchronisiert Änderungen zwischen mehreren Browsern/Tabs
 */

type AbsenceRequestCallback = (request: AbsenceRequest) => void;
type ProjectCallback = (project: Project) => void;
type TimeEntryCallback = (entry: TimeEntry) => void;
type UserCallback = (user: User) => void;

interface RealtimeCallbacks {
  onAbsenceRequestInsert?: AbsenceRequestCallback;
  onAbsenceRequestUpdate?: AbsenceRequestCallback;
  onAbsenceRequestDelete?: (id: string) => void;
  onProjectInsert?: ProjectCallback;
  onProjectUpdate?: ProjectCallback;
  onProjectDelete?: (id: string) => void;
  onTimeEntryInsert?: TimeEntryCallback;
  onTimeEntryUpdate?: TimeEntryCallback;
  onTimeEntryDelete?: (id: string) => void;
  onUserInsert?: UserCallback;
  onUserUpdate?: UserCallback;
  onUserDelete?: (id: string) => void;
}

let realtimeChannel: RealtimeChannel | null = null;

/**
 * Startet Realtime-Synchronisation für alle Tabellen
 */
export function startRealtimeSync(callbacks: RealtimeCallbacks): void {
  if (!isSupabaseAvailable()) {
    console.log('ℹ️ Supabase nicht verfügbar - Realtime Sync deaktiviert');
    return;
  }

  // Cleanup existing channel
  if (realtimeChannel) {
    console.log('🔄 Stoppe existierenden Realtime Channel...');
    stopRealtimeSync();
  }

  console.log('🔄 Starte Realtime Sync...');

  // Create a single channel for all tables
  realtimeChannel = supabase!
    .channel('db-changes')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'absence_requests' },
      (payload) => {
        console.log('📥 Realtime: absence_requests', payload.eventType, payload);
        
        if (payload.eventType === 'INSERT' && callbacks.onAbsenceRequestInsert) {
          const request = payload.new.data as AbsenceRequest;
          callbacks.onAbsenceRequestInsert(request);
        } else if (payload.eventType === 'UPDATE' && callbacks.onAbsenceRequestUpdate) {
          const request = payload.new.data as AbsenceRequest;
          callbacks.onAbsenceRequestUpdate(request);
        } else if (payload.eventType === 'DELETE' && callbacks.onAbsenceRequestDelete) {
          callbacks.onAbsenceRequestDelete(payload.old.id as string);
        }
      }
    )
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'projects' },
      (payload) => {
        console.log('📥 Realtime: projects', payload.eventType, payload);
        
        if (payload.eventType === 'INSERT' && callbacks.onProjectInsert) {
          const project = payload.new.data as Project;
          callbacks.onProjectInsert(project);
        } else if (payload.eventType === 'UPDATE' && callbacks.onProjectUpdate) {
          const project = payload.new.data as Project;
          callbacks.onProjectUpdate(project);
        } else if (payload.eventType === 'DELETE' && callbacks.onProjectDelete) {
          callbacks.onProjectDelete(payload.old.id as string);
        }
      }
    )
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'time_entries' },
      (payload) => {
        console.log('📥 Realtime: time_entries', payload.eventType, payload);
        
        if (payload.eventType === 'INSERT' && callbacks.onTimeEntryInsert) {
          const entry = payload.new.data as TimeEntry;
          callbacks.onTimeEntryInsert(entry);
        } else if (payload.eventType === 'UPDATE' && callbacks.onTimeEntryUpdate) {
          const entry = payload.new.data as TimeEntry;
          callbacks.onTimeEntryUpdate(entry);
        } else if (payload.eventType === 'DELETE' && callbacks.onTimeEntryDelete) {
          callbacks.onTimeEntryDelete(payload.old.id as string);
        }
      }
    )
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'users' },
      (payload) => {
        console.log('📥 Realtime: users', payload.eventType, payload);
        
        if (payload.eventType === 'INSERT' && callbacks.onUserInsert) {
          const user = payload.new.data as User;
          callbacks.onUserInsert(user);
        } else if (payload.eventType === 'UPDATE' && callbacks.onUserUpdate) {
          const user = payload.new.data as User;
          callbacks.onUserUpdate(user);
        } else if (payload.eventType === 'DELETE' && callbacks.onUserDelete) {
          callbacks.onUserDelete(payload.old.id as string);
        }
      }
    )
    .subscribe((status) => {
      console.log('🔄 Realtime Status:', status);
      if (status === 'SUBSCRIBED') {
        console.log('✅ Realtime Sync aktiv');
      } else if (status === 'CHANNEL_ERROR') {
        console.error('❌ Realtime Sync Fehler');
      } else if (status === 'TIMED_OUT') {
        console.error('⏱️ Realtime Sync Timeout');
      } else if (status === 'CLOSED') {
        console.log('🔒 Realtime Sync geschlossen');
      }
    });
}

/**
 * Stoppt Realtime-Synchronisation
 */
export function stopRealtimeSync(): void {
  if (realtimeChannel) {
    console.log('🛑 Stoppe Realtime Sync...');
    realtimeChannel.unsubscribe();
    realtimeChannel = null;
    console.log('✅ Realtime Sync gestoppt');
  }
}

/**
 * Prüft ob Realtime-Sync aktiv ist
 */
export function isRealtimeSyncActive(): boolean {
  return realtimeChannel !== null;
}
