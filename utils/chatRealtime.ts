import { supabase, isSupabaseAvailable } from './supabaseClient';
import type { ChatChannel, ChatMessage } from '../types';

export interface ChatRealtimeCallbacks {
  onChannelUpsert?: (channel: ChatChannel) => void;
  onChannelDelete?: (channelId: string) => void;
  onMessageInsert?: (message: ChatMessage) => void;
}

/**
 * Startet Realtime Subscriptions für Chat (Channels, Messages).
 * Gibt eine Cleanup-Funktion zurück, um die Subscriptions zu stoppen.
 */
export function startChatRealtime(callbacks: ChatRealtimeCallbacks = {}) {
  if (!isSupabaseAvailable() || !supabase) {
    console.log('ℹ️ Supabase nicht verfügbar – Chat Realtime nicht aktiviert');
    return () => {};
  }

  console.log('🔄 Initialisiere Chat Realtime Sync...');

  const channel = supabase.channel('chat-realtime');

  // Channels: INSERT/UPDATE
  channel.on(
    'postgres_changes',
    { event: '*', schema: 'public', table: 'chat_channels' },
    (payload: any) => {
      if (payload.eventType === 'DELETE') {
        const id = payload.old?.id as string | undefined;
        if (id && callbacks.onChannelDelete) callbacks.onChannelDelete(id);
      } else {
        const data = (payload.new?.data ?? payload.new) as ChatChannel | undefined;
        if (data && callbacks.onChannelUpsert) callbacks.onChannelUpsert(data as ChatChannel);
      }
    }
  );

  // Messages: INSERT
  channel.on(
    'postgres_changes',
    { event: 'INSERT', schema: 'public', table: 'chat_messages' },
    (payload: any) => {
      const data = (payload.new?.data ?? payload.new) as ChatMessage | undefined;
      if (data && callbacks.onMessageInsert) callbacks.onMessageInsert(data as ChatMessage);
    }
  );

  channel.subscribe(status => {
    console.log('🔄 Chat Realtime Status:', status);
  });

  console.log('✅ Chat Realtime aktiviert');

  return () => {
    try {
      supabase.removeChannel(channel);
      console.log('🛑 Chat Realtime gestoppt');
    } catch (e) {
      console.warn('⚠️ Konnte Chat Realtime nicht entfernen:', e);
    }
  };
}
