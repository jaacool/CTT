-- ============================================================================
-- CHAT FEATURES: Markieren & Als ungelesen markieren
-- ============================================================================
-- Dieses Script fügt die notwendigen Felder zur chat_messages Tabelle hinzu
-- für die "Markieren" und "Als ungelesen markieren" Funktionen
-- ============================================================================

-- 1. Füge starred_by Feld hinzu (Array von User-IDs die Nachricht markiert haben)
ALTER TABLE chat_messages 
ADD COLUMN IF NOT EXISTS starred_by TEXT[] DEFAULT '{}';

-- 2. Füge read Feld hinzu (Boolean ob Nachricht gelesen wurde)
ALTER TABLE chat_messages 
ADD COLUMN IF NOT EXISTS read BOOLEAN DEFAULT false;

-- 3. Füge read_at Feld hinzu (Zeitstempel wann gelesen)
ALTER TABLE chat_messages 
ADD COLUMN IF NOT EXISTS read_at TIMESTAMPTZ;

-- 4. Index für schnelle Suche nach markierten Nachrichten
CREATE INDEX IF NOT EXISTS idx_chat_messages_starred_by 
ON chat_messages USING GIN (starred_by);

-- 5. Index für ungelesene Nachrichten
CREATE INDEX IF NOT EXISTS idx_chat_messages_read 
ON chat_messages (read, user_id);

-- 6. Kommentare für Dokumentation
COMMENT ON COLUMN chat_messages.starred_by IS 'Array von User-IDs die diese Nachricht markiert haben';
COMMENT ON COLUMN chat_messages.read IS 'Ob die Nachricht vom Empfänger gelesen wurde';
COMMENT ON COLUMN chat_messages.read_at IS 'Zeitstempel wann die Nachricht gelesen wurde';

-- ============================================================================
-- FERTIG! Die Chat-Features sind jetzt einsatzbereit.
-- ============================================================================
