-- Fix für die time_entries Tabelle
-- Führe dieses SQL in Supabase aus, um die Tabelle zu aktualisieren

-- Ändere end_time zu NULL erlaubt (für laufende Timer)
ALTER TABLE time_entries ALTER COLUMN end_time DROP NOT NULL;
