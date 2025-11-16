# Supabase Auto-Save Setup

## 🎯 Übersicht

Diese Implementierung bietet Auto-Save-Funktionalität mit Supabase. Alle Änderungen werden automatisch in der Cloud gespeichert.

## 🔧 Feature Flag

Das Feature kann einfach ein-/ausgeschaltet werden:

```typescript
// utils/supabaseClient.ts
export const SUPABASE_ENABLED = true; // auf false setzen zum Deaktivieren
```

## 📋 Setup-Schritte

### 1. Supabase Projekt erstellen

1. Gehe zu [supabase.com](https://supabase.com)
2. Erstelle ein neues Projekt
3. Notiere dir:
   - Project URL
   - Anon/Public Key

### 2. Environment Variables

Erstelle eine `.env` Datei im Root-Verzeichnis:

```bash
cp .env.example .env
```

Füge deine Credentials ein:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

### 3. Datenbank-Schema erstellen

Führe folgendes SQL in Supabase SQL Editor aus:

```sql
-- Users Table
CREATE TABLE users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT,
  role TEXT,
  avatar_url TEXT,
  employment_start_date TEXT,
  data JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Projects Table
CREATE TABLE projects (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  icon TEXT,
  status TEXT,
  start_date TEXT,
  end_date TEXT,
  budget_hours INTEGER,
  client TEXT,
  data JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Time Entries Table
CREATE TABLE time_entries (
  id TEXT PRIMARY KEY,
  task_id TEXT NOT NULL,
  task_title TEXT NOT NULL,
  list_title TEXT,
  project_id TEXT NOT NULL,
  project_name TEXT NOT NULL,
  start_time TIMESTAMP WITH TIME ZONE NOT NULL,
  end_time TIMESTAMP WITH TIME ZONE, -- NULL erlaubt für laufende Timer
  duration INTEGER NOT NULL,
  user_id TEXT NOT NULL,
  billable BOOLEAN DEFAULT false,
  note TEXT,
  data JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);

-- Absence Requests Table
CREATE TABLE absence_requests (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  type TEXT NOT NULL,
  start_date TEXT NOT NULL,
  end_date TEXT NOT NULL,
  reason TEXT,
  status TEXT NOT NULL,
  half_day BOOLEAN DEFAULT false,
  sick_leave_reported BOOLEAN DEFAULT false,
  data JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Indexes für bessere Performance
CREATE INDEX idx_time_entries_user_id ON time_entries(user_id);
CREATE INDEX idx_time_entries_project_id ON time_entries(project_id);
CREATE INDEX idx_time_entries_start_time ON time_entries(start_time);
CREATE INDEX idx_absence_requests_user_id ON absence_requests(user_id);
CREATE INDEX idx_absence_requests_start_date ON absence_requests(start_date);
```

### 4. Row Level Security (RLS) aktivieren

```sql
-- Enable RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE time_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE absence_requests ENABLE ROW LEVEL SECURITY;

-- Allow all operations for now (später kannst du das verfeinern)
CREATE POLICY "Allow all for users" ON users FOR ALL USING (true);
CREATE POLICY "Allow all for projects" ON projects FOR ALL USING (true);
CREATE POLICY "Allow all for time_entries" ON time_entries FOR ALL USING (true);
CREATE POLICY "Allow all for absence_requests" ON absence_requests FOR ALL USING (true);
```

## 🚀 Verwendung

### Auto-Save

Wenn Supabase aktiviert ist, werden alle Änderungen automatisch gespeichert:

- ✅ Neue Projekte
- ✅ Neue Zeiteinträge
- ✅ Neue User
- ✅ Neue Abwesenheitsanträge
- ✅ Updates an bestehenden Daten
- ✅ Gelöschte Einträge

### Manuelle Verwaltung

In den Settings → Supabase Tab:

1. **Alle Daten speichern**: Bulk-Upload aller lokalen Daten
2. **Alle Daten löschen**: Reset der Cloud-Daten (lokale Daten bleiben)

## 🔄 Deaktivieren

Um Supabase zu deaktivieren:

```typescript
// utils/supabaseClient.ts
export const SUPABASE_ENABLED = false;
```

Die App funktioniert dann wieder komplett lokal ohne Cloud-Sync.

## 📝 Hinweise

- Die `data` JSONB-Spalte speichert das komplette Objekt als Backup
- Alle Funktionen sind "safe" - wenn Supabase deaktiviert ist, passiert nichts
- Fehler werden in der Console geloggt, brechen aber die App nicht ab
- Später kann das durch ein vollständiges Backend ersetzt werden

## 🔮 Zukünftige Erweiterungen

- Real-time Sync zwischen Clients
- Konflikt-Auflösung bei gleichzeitigen Änderungen
- Offline-First mit Sync-Queue
- Granulare Permissions mit RLS
- Audit Log / History
