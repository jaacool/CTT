# CTT → Next.js/Supabase Integration Plan

## 📋 Übersicht

Migration der aktuellen CTT React/Vite SPA zu einer Next.js/Supabase Full-Stack Anwendung mit dem Ziel, beide Codebasen später zu fusionieren.

## 🎯 Zielsetzung

- ✅ React/TSX Komponenten 1:1 übernehmen
- ✅ Tailwind CSS Styling erhalten
- ✅ TypeScript Types & Utils wiederverwenden
- 🔄 Build-System: Vite → Next.js
- 🔄 Daten: Mock → Supabase PostgreSQL
- 🔄 Auth: Custom → Supabase Auth
- 🔄 Routing: SPA → File-Based Routing

---

## 📅 Phase 1: Next.js Projekt Setup

### 1.1 Next.js Projekt initialisieren
- [x] `npx create-next-app@latest ctt-nextjs --typescript --tailwind --eslint --app --src-dir --import-alias "@/*"`
- [x] Projekt in separatem Verzeichnis erstellt
- [x] Grundkonfiguration geprüft (Next.js 16.0.3, React 19.2.0, Tailwind v4)

### 1.2 Tailwind CSS Konfiguration migrieren
- [x] Custom Colors aus `index.html` in `globals.css` übernommen (Tailwind v4 @theme)
- [x] Theme-Erweiterungen eingerichtet (alle CTT-Colors: c-bg, c-surface, etc.)
- [x] CDN-Referenzen entfernt (nutzt jetzt PostCSS)

### 1.3 TypeScript Konfiguration anpassen
- [x] `tsconfig.json` bereits korrekt konfiguriert (ES2017, strict mode)
- [x] Path Aliases (`@/*`) bereits eingerichtet
- [x] Next.js spezifische Types vorhanden (next-env.d.ts)

---

## 📦 Phase 2: Komponenten Migration

### 2.1 Grundlegende Komponenten übernehmen
- [x] `Icons.tsx` → `components/Icons.tsx`
- [x] `types.ts` → `types/index.ts`
- [x] `constants.ts` → `lib/constants.ts`
- [x] `utils/permissions.ts` → `lib/permissions.ts`
- [x] `components/utils.ts` → `lib/utils.ts`

### 2.2 UI Komponenten migrieren
- [x] `TopBar.tsx` → `components/TopBar.tsx`
- [x] `Sidebar.tsx` → `components/Sidebar.tsx`
- [x] `LoginScreen.tsx` → `components/LoginScreen.tsx`
- [x] `SettingsPage.tsx` → `components/SettingsPage.tsx`

### 2.3 Core Feature Komponenten
- [x] `Dashboard.tsx` → `components/Dashboard.tsx`
- [x] `ProjectsOverview.tsx` → `components/ProjectsOverview.tsx`
- [x] `TaskArea.tsx` → `components/TaskArea.tsx`
- [x] `TaskDetailPanel.tsx` → `components/TaskDetailPanel.tsx`

### 2.4 Modal & Form Komponenten
- [x] `CreateProjectModal.tsx` → `components/CreateProjectModal.tsx`
- [x] `SearchProjectModal.tsx` → `components/SearchProjectModal.tsx`
- [x] `AddUserModal.tsx` → `components/AddUserModal.tsx`
- [x] `EditUserModal.tsx` → `components/EditUserModal.tsx`
- [x] `DeleteTaskModal.tsx` → `components/DeleteTaskModal.tsx`

### 2.5 Spezialisierte Komponenten
- [x] `TimerMenu.tsx` → `components/TimerMenu.tsx`
- [x] `TimeView.tsx` → `components/TimeView.tsx`
- [x] `TaskContextMenu.tsx` → `components/TaskContextMenu.tsx`
- [x] `ClientSelector.tsx` → `components/ClientSelector.tsx`
- [x] `RolesPage.tsx` → `components/RolesPage.tsx`

---

## 🛣️ Phase 3: Next.js Routing Setup

### 3.1 App Router Struktur erstellen
- [x] Verzeichnisse erstellt (login, projects, settings, api)
```
src/app/
├── layout.tsx          (Root Layout mit Tailwind)
├── page.tsx           (Dashboard Startseite)
├── login/page.tsx     (Login Seite)
├── projects/
│   ├── page.tsx       (Projektübersicht)
│   └── [id]/page.tsx  (Projekt Details)
├── settings/
│   └── page.tsx       (Einstellungen)
└── api/               (API Routes)
```

### 3.2 Layout Komponente erstellen
- [x] Root Layout mit Tailwind Body Classes (globals.css)
- [ ] Navigation Provider (folgt in Phase 3.3)
- [ ] Auth Provider Setup (folgt in Phase 4)
- [ ] Supabase Client Provider (folgt in Phase 4)

### 3.3 Seiten implementieren
- [x] `page.tsx` → CTT Landing Page mit Navigation
- [x] `login/page.tsx` → Login Screen mit Router
- [x] `projects/page.tsx` → Projects Overview (vereinfacht)
- [x] `settings/page.tsx` → Settings Page (vereinfacht)

---

## 🗄️ Phase 4: Supabase Integration

### 4.1 Supabase Projekt Setup
- [ ] Supabase Projekt erstellen
- [ ] Database Schema designen
- [ ] Authentication konfigurieren
- [ ] Environment Variables setzen

### 4.2 Database Schema Design
```sql
-- Projects
CREATE TABLE projects (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL,
  client_id UUID REFERENCES clients(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Task Lists
CREATE TABLE task_lists (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  position INTEGER NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Tasks
CREATE TABLE tasks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  task_list_id UUID REFERENCES task_lists(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL,
  priority TEXT,
  assigned_to UUID REFERENCES auth.users(id),
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Subtasks
CREATE TABLE subtasks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  completed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Users (via Supabase Auth)
-- Roles
CREATE TABLE roles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  permissions JSONB NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- User Roles
CREATE TABLE user_roles (
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  role_id UUID REFERENCES roles(id) ON DELETE CASCADE,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  PRIMARY KEY (user_id, role_id, project_id)
);

-- Activity Log
CREATE TABLE activities (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  project_id UUID REFERENCES projects(id),
  task_id UUID REFERENCES tasks(id),
  subtask_id UUID REFERENCES subtasks(id),
  text TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Time Entries
CREATE TABLE time_entries (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  task_id UUID REFERENCES tasks(id),
  start_time TIMESTAMP NOT NULL,
  end_time TIMESTAMP,
  duration_seconds INTEGER,
  description TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);
```

### 4.3 Supabase Client Setup
- [ ] `lib/supabase.ts` erstellen
- [ ] Client-Side und Server-Side Clients
- [ ] Auth Helper Funktionen
- [ ] Row Level Security (RLS) Policies

### 4.4 Database Functions & Triggers
- [ ] `update_updated_at_column()` Trigger
- [ ] `create_activity()` Function
- [ ] Time Tracking Functions

---

## ⚡ Phase 5: Server Actions & API Routes

### 5.1 CRUD Server Actions
- [ ] `projects/actions.ts` → Project CRUD
- [ ] `tasks/actions.ts` → Task CRUD
- [ ] `users/actions.ts` → User Management
- [ ] `time/actions.ts` → Time Tracking

### 5.2 Authentication Actions
- [ ] `auth/actions.ts` → Login/Logout/Register
- [ ] Session Management
- [ ] Protected Route Middleware

### 5.3 Real-time Features
- [ ] Supabase Realtime Subscriptions
- [ ] Live Task Updates
- [ ] Activity Feed

---

## 🔄 Phase 6: State Management Migration

### 6.1 Mock Data entfernen
- [ ] `constants.ts` Mock-Daten auskommentieren
- [ ] Supabase Queries integrieren
- [ ] Error Handling implementieren

### 6.2 React Query/SWR Setup
- [ ] Data Fetching Library wählen
- [ ] Query Keys definieren
- [ ] Caching Strategy

### 6.3 Form Handling
- [ ] React Hook Form Integration
- [ ] Zod Validation
- [ ] Optimistic Updates

---

## 🎨 Phase 7: UI/UX Anpassungen

### 7.1 Responsive Design
- [ ] Mobile Optimierung
- [ ] Touch Gestures
- [ ] PWA Features

### 7.2 Loading States
- [ ] Skeleton Components
- [ ] Loading Spinners
- [ ] Error Boundaries

### 7.3 Accessibility
- [ ] ARIA Labels
- [ ] Keyboard Navigation
- [ ] Screen Reader Support

---

## 🧪 Phase 8: Testing & Deployment

### 8.1 Unit Tests
- [ ] Component Tests mit Jest/React Testing Library
- [ ] Server Action Tests
- [ ] Utility Function Tests

### 8.2 Integration Tests
- [ ] API Route Tests
- [ ] Database Tests
- [ ] E2E Tests mit Playwright

### 8.3 Deployment
- [ ] Vercel Deployment Setup
- [ ] Environment Variables
- [ ] Database Migrations
- [ ] CI/CD Pipeline

---

## 📊 Migration Checklist

### Vor der Migration
- [ ] Git Branch erstellt ✅
- [ ] Plan.md erstellt ✅
- [ ] Backup des aktuellen CTT Codes
- [ ] Dependencies dokumentieren

### Während der Migration
- [ ] Jede Phase committen
- [ ] Tests nach jeder Phase
- [ ] Dokumentation aktualisieren
- [ ] Performance Checks

### Nach der Migration
- [ ] Full Test Suite durchführen
- [ ] Production Deployment
- [ ] User Acceptance Testing
- [ ] Altes CTT archivieren

---

## 🔧 Technical Notes

### Package.json Changes
```json
{
  "dependencies": {
    "next": "^14.0.0",
    "@supabase/supabase-js": "^2.38.0",
    "@supabase/auth-helpers-nextjs": "^0.8.0",
    "@tanstack/react-query": "^5.0.0",
    "react-hook-form": "^7.47.0",
    "zod": "^3.22.0"
  }
}
```

### Environment Variables
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

### File Structure After Migration
```
ctt-nextjs/
├── src/
│   ├── app/                 # Next.js App Router
│   ├── components/          # Migrated CTT Components
│   ├── lib/                 # Utilities & Supabase Client
│   ├── types/               # TypeScript Types
│   └── hooks/               # Custom Hooks
├── supabase/                # Database Migrations
├── public/                  # Static Assets
└── docs/                    # Documentation
```

---

## 🚀 Next Steps

1. **Phase 1 starten**: Next.js Projekt initialisieren
2. **Daily Commits**: Fortschritt dokumentieren
3. **Testing**: Kontinuierlich testen
4. **Review**: Regelmäßige Code Reviews
5. **Deployment**: Early Deployment zu Testzwecken

---

*Letzte Aktualisierung: 13.11.2025*
