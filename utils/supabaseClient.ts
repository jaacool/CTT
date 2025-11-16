import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Feature Flag: Einfach auf false setzen um Supabase zu deaktivieren
export const SUPABASE_ENABLED = true;

// Supabase Konfiguration
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

let supabase: SupabaseClient | null = null;

// Initialisiere Supabase Client nur wenn aktiviert und Credentials vorhanden
if (SUPABASE_ENABLED && SUPABASE_URL && SUPABASE_ANON_KEY) {
  supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  console.log('✅ Supabase Client initialisiert');
} else if (SUPABASE_ENABLED) {
  console.warn('⚠️ Supabase aktiviert, aber Credentials fehlen. Bitte .env Datei erstellen.');
} else {
  console.log('ℹ️ Supabase ist deaktiviert');
}

export { supabase };

/**
 * Prüft ob Supabase verfügbar ist
 */
export function isSupabaseAvailable(): boolean {
  return SUPABASE_ENABLED && supabase !== null;
}
