-- ============================================
-- SUPABASE REALTIME SETUP
-- ============================================
-- Dieses Script aktiviert Realtime für alle Tabellen
-- und konfiguriert die notwendigen RLS Policies

-- ============================================
-- 1. REALTIME AKTIVIEREN
-- ============================================
-- WICHTIG: Diese Befehle müssen im Supabase Dashboard ausgeführt werden
-- unter Database → Replication → Realtime

-- Aktiviere Realtime für alle Tabellen:
-- ✅ absence_requests
-- ✅ projects
-- ✅ time_entries
-- ✅ users

-- Alternativ: Via SQL (falls verfügbar)
-- ALTER PUBLICATION supabase_realtime ADD TABLE absence_requests;
-- ALTER PUBLICATION supabase_realtime ADD TABLE projects;
-- ALTER PUBLICATION supabase_realtime ADD TABLE time_entries;
-- ALTER PUBLICATION supabase_realtime ADD TABLE users;

-- ============================================
-- 2. RLS POLICIES PRÜFEN/ERSTELLEN
-- ============================================

-- Prüfe ob RLS aktiviert ist
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('absence_requests', 'projects', 'time_entries', 'users');

-- Falls RLS nicht aktiviert ist, aktiviere es:
-- ALTER TABLE absence_requests ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE time_entries ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 3. POLICIES FÜR ABSENCE_REQUESTS
-- ============================================

-- Lösche alte Policies (falls vorhanden)
DROP POLICY IF EXISTS "Enable read access for all users" ON absence_requests;
DROP POLICY IF EXISTS "Enable insert access for all users" ON absence_requests;
DROP POLICY IF EXISTS "Enable update access for all users" ON absence_requests;
DROP POLICY IF EXISTS "Enable delete access for all users" ON absence_requests;

-- Erstelle neue Policies
CREATE POLICY "Enable read access for all users" ON absence_requests
FOR SELECT USING (true);

CREATE POLICY "Enable insert access for all users" ON absence_requests
FOR INSERT WITH CHECK (true);

CREATE POLICY "Enable update access for all users" ON absence_requests
FOR UPDATE USING (true);

CREATE POLICY "Enable delete access for all users" ON absence_requests
FOR DELETE USING (true);

-- ============================================
-- 4. POLICIES FÜR PROJECTS
-- ============================================

DROP POLICY IF EXISTS "Enable read access for all users" ON projects;
DROP POLICY IF EXISTS "Enable insert access for all users" ON projects;
DROP POLICY IF EXISTS "Enable update access for all users" ON projects;
DROP POLICY IF EXISTS "Enable delete access for all users" ON projects;

CREATE POLICY "Enable read access for all users" ON projects
FOR SELECT USING (true);

CREATE POLICY "Enable insert access for all users" ON projects
FOR INSERT WITH CHECK (true);

CREATE POLICY "Enable update access for all users" ON projects
FOR UPDATE USING (true);

CREATE POLICY "Enable delete access for all users" ON projects
FOR DELETE USING (true);

-- ============================================
-- 5. POLICIES FÜR TIME_ENTRIES
-- ============================================

DROP POLICY IF EXISTS "Enable read access for all users" ON time_entries;
DROP POLICY IF EXISTS "Enable insert access for all users" ON time_entries;
DROP POLICY IF EXISTS "Enable update access for all users" ON time_entries;
DROP POLICY IF EXISTS "Enable delete access for all users" ON time_entries;

CREATE POLICY "Enable read access for all users" ON time_entries
FOR SELECT USING (true);

CREATE POLICY "Enable insert access for all users" ON time_entries
FOR INSERT WITH CHECK (true);

CREATE POLICY "Enable update access for all users" ON time_entries
FOR UPDATE USING (true);

CREATE POLICY "Enable delete access for all users" ON time_entries
FOR DELETE USING (true);

-- ============================================
-- 6. POLICIES FÜR USERS
-- ============================================

DROP POLICY IF EXISTS "Enable read access for all users" ON users;
DROP POLICY IF EXISTS "Enable insert access for all users" ON users;
DROP POLICY IF EXISTS "Enable update access for all users" ON users;
DROP POLICY IF EXISTS "Enable delete access for all users" ON users;

CREATE POLICY "Enable read access for all users" ON users
FOR SELECT USING (true);

CREATE POLICY "Enable insert access for all users" ON users
FOR INSERT WITH CHECK (true);

CREATE POLICY "Enable update access for all users" ON users
FOR UPDATE USING (true);

CREATE POLICY "Enable delete access for all users" ON users
FOR DELETE USING (true);

-- ============================================
-- 7. VERIFIZIERUNG
-- ============================================

-- Prüfe ob alle Policies erstellt wurden
SELECT schemaname, tablename, policyname, permissive, roles, cmd
FROM pg_policies
WHERE schemaname = 'public'
AND tablename IN ('absence_requests', 'projects', 'time_entries', 'users')
ORDER BY tablename, policyname;

-- Erwartetes Ergebnis: 4 Policies pro Tabelle (SELECT, INSERT, UPDATE, DELETE)

-- ============================================
-- 8. TEST
-- ============================================

-- Teste ob Realtime funktioniert:
-- 1. Öffne die App in zwei Browsern
-- 2. Erstelle eine Abwesenheit in Browser A
-- 3. Prüfe ob sie in Browser B erscheint (< 1 Sekunde)

-- Prüfe Logs in der Browser-Konsole:
-- ✅ "🔄 Initialisiere Realtime Sync..."
-- ✅ "🔄 Realtime Status: SUBSCRIBED"
-- ✅ "✅ Realtime Sync aktiv"
-- ✅ "📥 Realtime: Neue Abwesenheit empfangen"

-- ============================================
-- FERTIG! 🎉
-- ============================================
-- Realtime ist jetzt aktiviert und konfiguriert.
-- Änderungen werden automatisch zwischen allen Browsern synchronisiert.
