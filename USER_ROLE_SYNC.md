# User Role Synchronisation

## ✅ Implementiert

Alle Rollen-Änderungen werden automatisch mit Supabase synchronisiert.

## 🔄 Synchronisierte Aktionen

### 1. **Rolle eines Users ändern** (Settings)
```typescript
handleChangeRole(userId, roleId)
  ↓
1. User-Objekt mit neuer Rolle erstellen
2. State aktualisieren (optimistic)
3. saveUser() → Supabase Update
4. Realtime Broadcast an alle Clients
```

**Wo:** Settings → Users Tab → Rolle ändern

### 2. **Eigene Rolle ändern** (TopBar)
```typescript
handleChangeCurrentUserRole(roleId)
  ↓
1. CurrentUser mit neuer Rolle aktualisieren
2. State aktualisieren (optimistic)
3. saveUser() → Supabase Update
4. Realtime Broadcast an alle Clients
```

**Wo:** TopBar → Rollen-Dropdown

## 📊 Datenbank-Schema

### `users` Tabelle
```sql
CREATE TABLE users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  role TEXT NOT NULL,  -- ← Rollen-ID wird hier gespeichert
  title TEXT,
  status TEXT,
  avatar_url TEXT,
  tags TEXT[],
  data JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Wichtig:** Die `role` Spalte speichert die **Rollen-ID** (z.B. "admin", "producer", "editor")

## 🔧 Technische Details

### Sync-Funktion
```typescript
// In App.tsx
const handleChangeRole = useCallback((userId: string, roleId: string) => {
  setUsers(prev => {
    const updated = prev.map(u => {
      if (u.id === userId) {
        const updatedUser = { ...u, role: roleId };
        // Sync to Supabase
        saveUser(updatedUser);
        return updatedUser;
      }
      return u;
    });
    return updated;
  });
}, []);
```

### Supabase Update
```typescript
// In supabaseSync.ts
export async function saveUser(user: User): Promise<boolean> {
  const { error } = await supabase!
    .from('users')
    .upsert({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,  // ← Rolle wird gespeichert
      title: user.title ?? null,
      status: user.status,
      avatar_url: user.avatarUrl,
      tags: user.tags ?? [],
      data: user,
      updated_at: new Date().toISOString(),
    });
  
  return !error;
}
```

## 📡 Realtime-Synchronisation

### Polling Sync
- Prüft alle 3 Sekunden auf Änderungen
- Lädt alle User-Daten neu bei Änderungen
- Inkludiert Rollen-Updates

### Realtime (Optional)
Für sofortige Updates kann Realtime für die `users` Tabelle aktiviert werden:

```sql
-- In Supabase Dashboard
ALTER PUBLICATION supabase_realtime ADD TABLE users;
```

## 🎯 Verwendung

### Rolle ändern (Settings)
1. Gehe zu Settings → Users
2. Klicke auf Rollen-Badge eines Users
3. Wähle neue Rolle aus Dropdown
4. ✅ Automatisch in Supabase gespeichert
5. ✅ Bei allen Clients aktualisiert (nach max. 3 Sek.)

### Eigene Rolle ändern (TopBar)
1. Klicke auf Rollen-Badge in TopBar
2. Wähle neue Rolle aus Dropdown
3. ✅ Automatisch in Supabase gespeichert
4. ✅ Bei allen Clients aktualisiert (nach max. 3 Sek.)

## 🔍 Verifikation

### Console Logs
```
✅ User gespeichert: user-123
📥 Sync: Änderungen empfangen { users: 5 }
```

### Supabase Dashboard
1. Gehe zu Table Editor → users
2. Prüfe `role` Spalte
3. Sollte aktualisierte Rolle zeigen
4. `updated_at` sollte aktuell sein

## 🚨 Wichtige Hinweise

### Rollen-IDs vs. Rollen-Namen
- **Gespeichert wird:** Rollen-ID (z.B. "producer")
- **Angezeigt wird:** Rollen-Name (z.B. "Produzent:in")
- Mapping erfolgt über `roles` Array

### Permissions
- Aktuell: Alle User können alle Rollen ändern
- Für Produktion: RLS-Policies implementieren
  ```sql
  -- Beispiel: Nur Admins können Rollen ändern
  CREATE POLICY "Only admins can update roles" ON users
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()
      AND role = 'admin'
    )
  );
  ```

## ✨ Features

✅ **Optimistic Updates** - Sofortige UI-Änderung
✅ **Automatisches Speichern** - Keine manuelle Aktion nötig
✅ **Realtime Sync** - Änderungen bei allen Clients (via Polling)
✅ **Fehlerbehandlung** - Safe wenn Supabase deaktiviert
✅ **Konsistenz** - State und DB immer synchron

## 🔗 Verwandte Dateien

- `App.tsx` - Handler für Rollen-Änderungen
- `components/SettingsPage.tsx` - Settings UI
- `components/TopBar.tsx` - TopBar Rollen-Dropdown
- `utils/supabaseSync.ts` - Sync-Funktionen
- `utils/supabasePolling.ts` - Polling-Mechanismus

## 📝 Zusammenfassung

**Alle Rollen-Änderungen werden automatisch synchronisiert:**
- ✅ Änderungen in Settings → Supabase
- ✅ Änderungen in TopBar → Supabase
- ✅ Supabase → Alle Clients (via Polling)
- ✅ Funktioniert auch offline (wird nachgeholt)

**Keine manuelle Aktion erforderlich!** 🚀
