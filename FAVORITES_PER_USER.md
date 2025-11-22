# Favoriten pro User

## Änderungen (22. Nov 2024)

### Problem
- Favoriten wurden global in localStorage gespeichert
- Alle User teilten sich die gleichen Favoriten
- Beim User-Wechsel blieben die Favoriten gleich

### Lösung
Favoriten werden jetzt **pro User** gespeichert:
- Im User-Objekt als `favoriteProjects: string[]`
- Sync mit Supabase über User-Update
- Automatisches Laden beim User-Wechsel

---

## Implementierung

### 1. **User-Interface erweitert** ✅

**Datei: `types.ts` (Zeile 71)**
```typescript
export interface User {
  // ... andere Felder
  pinnedTasks?: string[]; // IDs of pinned tasks for dashboard
  dashboardNote?: string; // Personal note on dashboard
  favoriteProjects?: string[]; // IDs of favorite projects (per user) ✨ NEU
  workSchedule?: WorkSchedule;
  // ...
}
```

---

### 2. **State-Initialisierung** ✅

**Vorher:**
```typescript
const [favoriteProjectIds, setFavoriteProjectIds] = useState<string[]>(() => {
  const saved = localStorage.getItem('ctt_favorite_projects'); // ❌ Global
  return saved ? JSON.parse(saved) : [];
});
```

**Nachher:**
```typescript
const [favoriteProjectIds, setFavoriteProjectIds] = useState<string[]>(
  currentUser?.favoriteProjects || [] // ✅ Pro User
);
```

**Änderung (App.tsx Zeile 118-121):**
- Favoriten werden aus `currentUser.favoriteProjects` geladen
- Kein globales localStorage mehr

---

### 3. **Toggle-Handler mit User-Update** ✅

**Vorher:**
```typescript
const handleToggleFavorite = useCallback((projectId: string) => {
  setFavoriteProjectIds(prev => {
    const newFavorites = /* ... */;
    localStorage.setItem('ctt_favorite_projects', JSON.stringify(newFavorites)); // ❌
    return newFavorites;
  });
}, []);
```

**Nachher:**
```typescript
const handleToggleFavorite = useCallback((projectId: string) => {
  if (!currentUser) return;
  
  setFavoriteProjectIds(prev => {
    const newFavorites = prev.includes(projectId)
      ? prev.filter(id => id !== projectId)
      : [...prev, projectId];
    
    // Update User mit neuen Favoriten
    const updatedUser = { ...currentUser, favoriteProjects: newFavorites };
    setCurrentUser(updatedUser);
    
    // Update auch in users-Array
    setUsers(prevUsers => prevUsers.map(u => 
      u.id === currentUser.id ? updatedUser : u
    ));
    
    // Sync mit Supabase ✅
    saveUser(updatedUser);
    
    return newFavorites;
  });
}, [currentUser]);
```

**Änderung (App.tsx Zeile 1875-1898):**
- ✅ User-Objekt wird aktualisiert
- ✅ Users-Array wird aktualisiert
- ✅ Sync mit Supabase
- ❌ Kein localStorage mehr

---

### 4. **User-Wechsel Handler** ✅

**Vorher:**
```typescript
const handleChangeUser = useCallback((userId: string) => {
  const newUser = users.find(u => u.id === userId);
  if (newUser) {
    setCurrentUser(newUser);
    localStorage.setItem('ctt_last_user_id', newUser.id);
  }
}, [users]);
```

**Nachher:**
```typescript
const handleChangeUser = useCallback((userId: string) => {
  const newUser = users.find(u => u.id === userId);
  if (newUser) {
    setCurrentUser(newUser);
    // Lade Favoriten des neuen Users ✅
    setFavoriteProjectIds(newUser.favoriteProjects || []);
    localStorage.setItem('ctt_last_user_id', newUser.id);
  }
}, [users]);
```

**Änderung (App.tsx Zeile 1829-1838):**
- ✅ Favoriten werden beim User-Wechsel geladen

---

### 5. **User-Change Effect** ✅

**Vorher:**
```typescript
useEffect(() => {
  if (currentUser) {
    localStorage.setItem('ctt_last_user_id', currentUser.id);
  }
}, [currentUser]);
```

**Nachher:**
```typescript
useEffect(() => {
  if (currentUser) {
    localStorage.setItem('ctt_last_user_id', currentUser.id);
    // Update Favoriten wenn User sich ändert ✅
    setFavoriteProjectIds(currentUser.favoriteProjects || []);
  }
}, [currentUser]);
```

**Änderung (App.tsx Zeile 1841-1847):**
- ✅ Favoriten werden automatisch aktualisiert

---

## Datenfluss

### Favorit hinzufügen:
```
User klickt Stern-Icon
  ↓
handleToggleFavorite(projectId)
  ↓
Berechne newFavorites
  ↓
Update currentUser.favoriteProjects
  ↓
Update users-Array
  ↓
saveUser(updatedUser) → Supabase
  ↓
setFavoriteProjectIds(newFavorites)
  ↓
UI aktualisiert sich
```

### User wechseln:
```
User wählt anderen User
  ↓
handleChangeUser(userId)
  ↓
Finde newUser in users
  ↓
setCurrentUser(newUser)
  ↓
setFavoriteProjectIds(newUser.favoriteProjects)
  ↓
UI zeigt Favoriten des neuen Users
```

### App-Start:
```
App lädt
  ↓
currentUser aus localStorage
  ↓
favoriteProjectIds = currentUser.favoriteProjects
  ↓
UI zeigt User-spezifische Favoriten
```

---

## Persistierung

### Vorher (Global):
```
localStorage:
  ctt_favorite_projects: ["project-1", "project-2"] ❌ Für alle User
```

### Nachher (Pro User):
```
Supabase users table:
  user-1: { favoriteProjects: ["project-1", "project-3"] } ✅
  user-2: { favoriteProjects: ["project-2", "project-4"] } ✅
  user-3: { favoriteProjects: [] } ✅
```

**Vorteile:**
- ✅ Jeder User hat eigene Favoriten
- ✅ Sync über alle Geräte (Supabase)
- ✅ Keine Konflikte beim User-Wechsel
- ✅ Persistiert in Datenbank

---

## Migration

### Alte Favoriten migrieren (optional):

Wenn User bereits Favoriten in localStorage haben:

```typescript
// Einmalig beim ersten Login nach Update
const oldFavorites = localStorage.getItem('ctt_favorite_projects');
if (oldFavorites && currentUser && !currentUser.favoriteProjects) {
  const favorites = JSON.parse(oldFavorites);
  const updatedUser = { ...currentUser, favoriteProjects: favorites };
  setCurrentUser(updatedUser);
  saveUser(updatedUser);
  localStorage.removeItem('ctt_favorite_projects'); // Cleanup
}
```

**Hinweis:** Nicht implementiert, da alte Favoriten nicht kritisch sind.

---

## Testing

### Test-Szenarien:

1. **User A favorisiert Projekt 1:**
   - ✅ Stern wird gelb
   - ✅ Projekt erscheint in Favoriten-Liste
   - ✅ User-Objekt wird aktualisiert
   - ✅ Sync mit Supabase

2. **Wechsel zu User B:**
   - ✅ Favoriten von User A verschwinden
   - ✅ Favoriten von User B erscheinen
   - ✅ Projekt 1 ist NICHT favorisiert (außer User B hat es auch)

3. **User B favorisiert Projekt 2:**
   - ✅ Stern wird gelb
   - ✅ Projekt 2 in User B's Favoriten
   - ✅ Projekt 1 bleibt NICHT favorisiert

4. **Zurück zu User A:**
   - ✅ Projekt 1 ist wieder favorisiert
   - ✅ Projekt 2 ist NICHT favorisiert
   - ✅ Favoriten von User A bleiben erhalten

5. **App-Neustart:**
   - ✅ Favoriten werden aus Supabase geladen
   - ✅ Jeder User hat seine eigenen Favoriten

---

## Technische Details

### State-Management:
```typescript
// Global State (für aktuellen User)
const [favoriteProjectIds, setFavoriteProjectIds] = useState<string[]>(
  currentUser?.favoriteProjects || []
);

// User State (persistiert in Supabase)
const [currentUser, setCurrentUser] = useState<User | null>(/* ... */);
const [users, setUsers] = useState<User[]>(/* ... */);
```

### Sync-Strategie:
1. **Lokaler State:** `favoriteProjectIds` (für UI-Performance)
2. **User-Objekt:** `currentUser.favoriteProjects` (Source of Truth)
3. **Users-Array:** Alle User mit ihren Favoriten
4. **Supabase:** Persistierung über `saveUser()`

### Performance:
- ✅ Keine zusätzlichen DB-Queries
- ✅ User-Update nutzt existierenden Sync
- ✅ Lokaler State für schnelle UI-Updates
- ✅ Debounced Sync (bereits implementiert)

---

## Dateien geändert

1. **`types.ts`** (1 Zeile)
   - Zeile 71: `favoriteProjects?: string[]` hinzugefügt

2. **`App.tsx`** (4 Änderungen)
   - Zeile 118-121: State-Initialisierung
   - Zeile 1829-1838: User-Wechsel Handler
   - Zeile 1841-1847: User-Change Effect
   - Zeile 1875-1898: Toggle-Handler

---

## Zusammenfassung

**Vorher:**
- ❌ Globale Favoriten für alle User
- ❌ localStorage-basiert
- ❌ Keine User-spezifische Persistierung

**Nachher:**
- ✅ Favoriten pro User
- ✅ Supabase-basiert
- ✅ Automatischer Wechsel beim User-Login
- ✅ Sync über alle Geräte

**Ergebnis:**
- Jeder User hat seine eigenen Favoriten
- Favoriten bleiben beim User-Wechsel erhalten
- Sync mit Supabase funktioniert automatisch

---

**Entwickelt am:** 22. November 2024  
**Status:** ✅ Abgeschlossen
