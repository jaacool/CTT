// =====================================================
// ANOMALY SYNC - Supabase Synchronization
// =====================================================
// Robuste CRUD-Operationen für Anomalien mit Supabase
// Graceful Degradation: Funktioniert auch ohne Supabase

import { supabase, isSupabaseAvailable } from './supabaseClient';
import { Anomaly, AnomalyStatus, AnomalyComment, AnomalyType } from '../types';

// =====================================================
// TYPES
// =====================================================

interface SupabaseAnomalyRecord {
  id: string;
  user_id: string;
  date: string;
  type: string;
  status: string;
  details: any;
  created_at?: string;
  updated_at?: string;
  resolved_at?: string | null;
  resolved_by?: string | null;
  muted_at?: string | null;
  muted_by?: string | null;
}

interface SupabaseAnomalyComment {
  id: string;
  anomaly_id: string;
  user_id: string;
  user_name: string;
  user_avatar: string;
  text: string;
  created_at?: string;
}

// =====================================================
// HELPER FUNCTIONS
// =====================================================

function toSupabaseRecord(anomaly: Anomaly): SupabaseAnomalyRecord {
  // ID generieren: userId-date-type
  const id = `${anomaly.userId}-${anomaly.date}-${anomaly.type}`;
  
  return {
    id,
    user_id: anomaly.userId,
    date: anomaly.date,
    type: anomaly.type,
    status: anomaly.status || AnomalyStatus.Open,
    details: anomaly.details,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    resolved_at: null,
    resolved_by: null,
    muted_at: null,
    muted_by: null,
  };
}

function fromSupabaseRecord(record: SupabaseAnomalyRecord): Anomaly {
  return {
    userId: record.user_id,
    date: record.date,
    type: record.type as AnomalyType,
    status: record.status as AnomalyStatus,
    details: record.details,
    comments: [], // Wird separat geladen
  };
}

function toSupabaseComment(comment: AnomalyComment, anomalyId: string): SupabaseAnomalyComment {
  return {
    id: comment.id,
    anomaly_id: anomalyId,
    user_id: comment.userId,
    user_name: comment.user?.name || 'Unknown',
    user_avatar: comment.user?.avatarUrl || '',
    text: comment.message,
    created_at: comment.timestamp,
  };
}

function fromSupabaseComment(record: SupabaseAnomalyComment): AnomalyComment {
  return {
    id: record.id,
    userId: record.user_id,
    message: record.text,
    timestamp: record.created_at || new Date().toISOString(),
    user: {
      id: record.user_id,
      name: record.user_name,
      avatarUrl: record.user_avatar,
    },
  };
}

// =====================================================
// CRUD OPERATIONS
// =====================================================

/**
 * Lädt alle Anomalien aus Supabase
 * Falls Supabase nicht verfügbar: Gibt leeres Array zurück
 */
export async function loadAllAnomalies(): Promise<Anomaly[]> {
  if (!isSupabaseAvailable()) {
    console.warn('⚠️ Supabase not available, returning empty anomalies');
    return [];
  }

  try {
    console.log('📊 Loading anomalies from Supabase...');

    // 1. Lade alle Anomalien
    const { data: anomaliesData, error: anomaliesError } = await supabase!
      .from('anomalies')
      .select('*')
      .order('created_at', { ascending: false });

    if (anomaliesError) {
      console.error('❌ Failed to load anomalies:', anomaliesError);
      return [];
    }

    if (!anomaliesData || anomaliesData.length === 0) {
      console.log('✅ No anomalies found in Supabase');
      return [];
    }

    // 2. Lade alle Kommentare
    const { data: commentsData, error: commentsError } = await supabase!
      .from('anomaly_comments')
      .select('*')
      .order('created_at', { ascending: true });

    if (commentsError) {
      console.warn('⚠️ Failed to load comments:', commentsError);
    }

    // 3. Mappe Anomalien und füge Kommentare hinzu
    const anomalies = anomaliesData.map((record: any) => {
      const anomaly = fromSupabaseRecord(record);
      
      // Füge Kommentare hinzu
      if (commentsData) {
        const anomalyId = `${anomaly.userId}-${anomaly.date}-${anomaly.type}`;
        anomaly.comments = commentsData
          .filter((c: any) => c.anomaly_id === anomalyId)
          .map((c: any) => fromSupabaseComment(c));
      }

      return anomaly;
    });

    console.log(`✅ Loaded ${anomalies.length} anomalies from Supabase`);
    return anomalies;
  } catch (error) {
    console.error('❌ Failed to load anomalies:', error);
    return [];
  }
}

/**
 * Speichert mehrere Anomalien in Supabase (Batch)
 * Verwendet UPSERT für effizientes Update/Insert
 */
export async function saveAnomaliesBatch(anomalies: Anomaly[]): Promise<void> {
  if (!isSupabaseAvailable()) {
    console.warn('⚠️ Supabase not available, skipping batch save');
    return;
  }

  if (anomalies.length === 0) {
    return;
  }

  try {
    console.log(`💾 Saving ${anomalies.length} anomalies to Supabase...`);

    const records = anomalies.map(toSupabaseRecord);

    const { error } = await supabase!
      .from('anomalies')
      .upsert(records, {
        onConflict: 'user_id,date,type',
        ignoreDuplicates: false,
      });

    if (error) {
      console.error('❌ Failed to save anomalies batch:', error);
      return;
    }

    console.log(`✅ Saved ${anomalies.length} anomalies to Supabase`);
  } catch (error) {
    console.error('❌ Failed to save anomalies batch:', error);
  }
}

/**
 * Aktualisiert den Status einer Anomalie (Resolve/Mute)
 */
export async function updateAnomalyStatus(
  anomalyId: string,
  status: AnomalyStatus,
  userId: string
): Promise<void> {
  if (!isSupabaseAvailable()) {
    console.warn('⚠️ Supabase not available, skipping status update');
    return;
  }

  try {
    console.log(`🔄 Updating anomaly ${anomalyId} to status ${status}...`);

    const updates: any = {
      status,
      updated_at: new Date().toISOString(),
    };

    if (status === AnomalyStatus.Resolved) {
      updates.resolved_at = new Date().toISOString();
      updates.resolved_by = userId;
      updates.muted_at = null;
      updates.muted_by = null;
    } else if (status === AnomalyStatus.Muted) {
      updates.muted_at = new Date().toISOString();
      updates.muted_by = userId;
      updates.resolved_at = null;
      updates.resolved_by = null;
    }

    const { error } = await supabase!
      .from('anomalies')
      .update(updates)
      .eq('id', anomalyId);

    if (error) {
      console.error('❌ Failed to update anomaly status:', error);
      return;
    }

    console.log(`✅ Updated anomaly ${anomalyId} to status ${status}`);
  } catch (error) {
    console.error('❌ Failed to update anomaly status:', error);
  }
}

/**
 * Fügt einen Kommentar zu einer Anomalie hinzu
 */
export async function addAnomalyComment(
  anomalyId: string,
  comment: AnomalyComment
): Promise<void> {
  if (!isSupabaseAvailable()) {
    console.warn('⚠️ Supabase not available, skipping comment add');
    return;
  }

  try {
    console.log(`💬 Adding comment to anomaly ${anomalyId}...`);

    const record = toSupabaseComment(comment, anomalyId);

    const { error } = await supabase!
      .from('anomaly_comments')
      .insert(record);

    if (error) {
      console.error('❌ Failed to add comment:', error);
      return;
    }

    console.log(`✅ Added comment to anomaly ${anomalyId}`);
  } catch (error) {
    console.error('❌ Failed to add comment:', error);
  }
}

/**
 * Löscht eine Anomalie aus Supabase
 * Wird verwendet wenn eine Anomalie nicht mehr zutrifft (z.B. nach TimeEntry-Änderung)
 */
export async function deleteAnomaly(
  userId: string,
  date: string,
  type: AnomalyType
): Promise<void> {
  if (!isSupabaseAvailable()) {
    console.warn('⚠️ Supabase not available, skipping anomaly delete');
    return;
  }

  try {
    const anomalyId = `${userId}-${date}-${type}`;
    console.log(`🗑️ Deleting anomaly ${anomalyId}...`);

    const { error } = await supabase!
      .from('anomalies')
      .delete()
      .eq('id', anomalyId);

    if (error) {
      console.error('❌ Failed to delete anomaly:', error);
      return;
    }

    console.log(`✅ Deleted anomaly ${anomalyId}`);
  } catch (error) {
    console.error('❌ Failed to delete anomaly:', error);
  }
}

// =====================================================
// REALTIME SYNC
// =====================================================

/**
 * Startet Realtime-Synchronisation für Anomalien
 * Gibt Cleanup-Funktion zurück
 */
export function startAnomalyRealtime(callbacks: {
  onAnomalyUpsert?: (anomaly: Anomaly) => void;
  onAnomalyDelete?: (anomalyId: string) => void;
  onCommentInsert?: (userId: string, date: string, type: string, comment: AnomalyComment) => void;
}): () => void {
  if (!isSupabaseAvailable()) {
    console.warn('⚠️ Supabase not available, realtime sync disabled');
    return () => {};
  }

  try {
    console.log('🔄 Starting anomaly realtime sync...');

    const channel = supabase!
      .channel('anomalies-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'anomalies',
        },
        async (payload) => {
          console.log('🔔 Anomaly change detected:', payload);

          if (payload.eventType === 'DELETE') {
            if (callbacks.onAnomalyDelete) {
              callbacks.onAnomalyDelete(payload.old.id);
            }
          } else {
            // INSERT oder UPDATE
            const record = payload.new as SupabaseAnomalyRecord;
            const anomaly = fromSupabaseRecord(record);

            // Lade Kommentare für diese Anomalie
            const anomalyId = `${anomaly.userId}-${anomaly.date}-${anomaly.type}`;
            const { data: commentsData } = await supabase!
              .from('anomaly_comments')
              .select('*')
              .eq('anomaly_id', anomalyId)
              .order('created_at', { ascending: true });

            if (commentsData) {
              anomaly.comments = commentsData.map((c: any) => fromSupabaseComment(c));
            }

            if (callbacks.onAnomalyUpsert) {
              callbacks.onAnomalyUpsert(anomaly);
            }
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'anomaly_comments',
        },
        (payload) => {
          console.log('🔔 Anomaly comment inserted:', payload);
          const record = payload.new as SupabaseAnomalyComment;
          const comment = fromSupabaseComment(record);
          
          // Parse anomaly_id: userId-date-type
          const parts = record.anomaly_id.split('-');
          if (parts.length >= 3 && callbacks.onCommentInsert) {
            const userId = parts[0];
            const date = parts[1];
            const type = parts.slice(2).join('-');
            callbacks.onCommentInsert(userId, date, type, comment);
          }
        }
      )
      .subscribe();

    // Cleanup-Funktion
    return () => {
      console.log('🛑 Stopping anomaly realtime sync...');
      supabase!.removeChannel(channel);
    };
  } catch (error) {
    console.error('❌ Failed to start realtime sync:', error);
    return () => {};
  }
}
