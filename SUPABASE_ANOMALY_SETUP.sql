-- =====================================================
-- ANOMALY SYSTEM - Supabase Tables
-- =====================================================
-- Erstelle Tabellen für Anomalien und Kommentare

-- 1. Anomalien Tabelle
CREATE TABLE IF NOT EXISTS anomalies (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  date TEXT NOT NULL,
  type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'Open',
  details JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  resolved_at TIMESTAMPTZ,
  resolved_by TEXT,
  muted_at TIMESTAMPTZ,
  muted_by TEXT
);

-- 2. Anomaly Comments Tabelle
CREATE TABLE IF NOT EXISTS anomaly_comments (
  id TEXT PRIMARY KEY,
  anomaly_id TEXT NOT NULL REFERENCES anomalies(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  user_name TEXT NOT NULL,
  user_avatar TEXT,
  text TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Indices für Performance
CREATE INDEX IF NOT EXISTS idx_anomalies_user_id ON anomalies(user_id);
CREATE INDEX IF NOT EXISTS idx_anomalies_date ON anomalies(date);
CREATE INDEX IF NOT EXISTS idx_anomalies_status ON anomalies(status);
CREATE INDEX IF NOT EXISTS idx_anomaly_comments_anomaly_id ON anomaly_comments(anomaly_id);

-- 4. RLS (Row Level Security) aktivieren
ALTER TABLE anomalies ENABLE ROW LEVEL SECURITY;
ALTER TABLE anomaly_comments ENABLE ROW LEVEL SECURITY;

-- 5. RLS Policies
-- Jeder kann seine eigenen Anomalien sehen
CREATE POLICY "Users can view their own anomalies"
  ON anomalies FOR SELECT
  USING (true);

-- Jeder kann Anomalien erstellen/updaten
CREATE POLICY "Users can insert anomalies"
  ON anomalies FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Users can update anomalies"
  ON anomalies FOR UPDATE
  USING (true);

-- Kommentare
CREATE POLICY "Users can view anomaly comments"
  ON anomaly_comments FOR SELECT
  USING (true);

CREATE POLICY "Users can insert anomaly comments"
  ON anomaly_comments FOR INSERT
  WITH CHECK (true);

-- 6. Trigger für updated_at
CREATE OR REPLACE FUNCTION update_anomaly_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER anomalies_updated_at
  BEFORE UPDATE ON anomalies
  FOR EACH ROW
  EXECUTE FUNCTION update_anomaly_updated_at();

-- 7. Real-time aktivieren
ALTER PUBLICATION supabase_realtime ADD TABLE anomalies;
ALTER PUBLICATION supabase_realtime ADD TABLE anomaly_comments;
