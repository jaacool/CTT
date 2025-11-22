-- ============================================
-- SUPABASE USER SETTINGS SETUP
-- ============================================
-- Erweitert die users Tabelle um Einstellungen

-- 1) Erweitere users Tabelle um Settings-Spalten
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS selected_state TEXT,
ADD COLUMN IF NOT EXISTS theme_mode TEXT DEFAULT 'glow' CHECK (theme_mode IN ('glow', 'blue', 'original', 'light')),
ADD COLUMN IF NOT EXISTS separate_home_office BOOLEAN DEFAULT false;

-- 2) Kommentare für Dokumentation
COMMENT ON COLUMN users.selected_state IS 'Ausgewähltes Bundesland für Feiertage (z.B. BW, BY, BE, etc.)';
COMMENT ON COLUMN users.theme_mode IS 'Design-Modus: glow, blue, original oder light';
COMMENT ON COLUMN users.separate_home_office IS 'Separate Home Office Ansicht in Admin-Kalender (nur für Admins)';

-- 3) Index für Performance (optional, falls viele User)
CREATE INDEX IF NOT EXISTS idx_users_theme_mode ON users(theme_mode);

-- 4) Beispiel-Update für bestehende User (optional)
-- UPDATE users SET theme_mode = 'glow' WHERE theme_mode IS NULL;
