-- ============================================
-- CHAT MESSAGES: Starred & Read Status
-- ============================================
-- Fügt die Spalten starred_by und read zur chat_messages Tabelle hinzu

-- 1) Spalte starred_by hinzufügen (Array von User-IDs)
ALTER TABLE chat_messages 
ADD COLUMN IF NOT EXISTS starred_by text[] DEFAULT '{}';

-- 2) Spalte read hinzufügen (Array von User-IDs, die die Nachricht gelesen haben)
ALTER TABLE chat_messages 
ADD COLUMN IF NOT EXISTS read text[] DEFAULT '{}';

-- 3) Index für starred_by (für schnelle Suche nach markierten Nachrichten)
CREATE INDEX IF NOT EXISTS idx_chat_messages_starred_by 
ON chat_messages USING GIN (starred_by);

-- 4) Index für read (für schnelle Suche nach ungelesenen Nachrichten)
CREATE INDEX IF NOT EXISTS idx_chat_messages_read 
ON chat_messages USING GIN (read);

-- 5) RLS Policy für Update (damit User die Arrays updaten können)
DROP POLICY IF EXISTS "chat_messages_update" ON chat_messages;
CREATE POLICY "chat_messages_update" 
ON chat_messages 
FOR UPDATE 
USING (true) 
WITH CHECK (true);

-- Hinweis: In Produktion sollten die Policies restriktiver sein
-- z.B. nur der Sender darf content ändern, aber jeder darf starred_by/read updaten
