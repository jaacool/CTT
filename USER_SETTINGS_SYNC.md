# User Settings Sync

## 🎯 Übersicht

User-spezifische Einstellungen werden jetzt in Supabase gespeichert und synchronisiert. Jeder User hat seine eigenen Präferenzen, die geräteübergreifend verfügbar sind.

## 📋 Gespeicherte Einstellungen

### 1. Theme-Modus (`theme_mode`)
- **Werte**: `'glow'`, `'blue'`, `'original'`, `'light'`
- **Default**: `'glow'`
- **Speicherort**: Settings → Erscheinungsbild
- **Beschreibung**: Visueller Stil der Anwendung

### 2. Bundesland für Feiertage (`selected_state`)
- **Werte**: Bundesland-Kürzel (z.B. `'BW'`, `'BY'`, `'BE'`) oder `null`
- **Default**: `null` (keine Feiertage)
- **Speicherort**: Settings → Kalender → Feiertage anzeigen
- **Beschreibung**: Zeigt regionale Feiertage im Kalender an

### 3. Home Office Ansicht (`separate_home_office`)
- **Werte**: `true` / `false`
- **Default**: `false`
- **Speicherort**: Settings → Kalender → Home Office Ansicht
- **Beschreibung**: Separate Anzeige für Home Office in Admin-Kalenderansicht (nur für Admins)

## 🔧 Technische Implementierung

### Datenbank-Schema

```sql
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS selected_state TEXT,
ADD COLUMN IF NOT EXISTS theme_mode TEXT DEFAULT 'glow',
ADD COLUMN IF NOT EXISTS separate_home_office BOOLEAN DEFAULT false;
```

### API-Funktionen

#### Speichern
```typescript
import { saveUserSettings } from './utils/supabaseSync';

await saveUserSettings(userId, {
  themeMode: 'blue',
  selectedState: 'BW',
  separateHomeOffice: true
});
```

#### Laden
```typescript
import { loadUserSettings } from './utils/supabaseSync';

const settings = await loadUserSettings(userId);
// { themeMode: 'blue', selectedState: 'BW', separateHomeOffice: true }
```

## 🚀 Verwendung

### Automatisches Speichern

Alle Einstellungen werden **automatisch** gespeichert, wenn der User sie ändert:

1. **Theme-Modus**: Beim Klick auf einen Theme-Button in Settings → Erscheinungsbild
2. **Bundesland**: Beim Ändern des Dropdowns in Settings → Kalender
3. **Home Office**: Beim Toggle des Schalters in Settings → Kalender

### Fallback-Verhalten

- Wenn Supabase nicht verfügbar ist, werden Einstellungen nur lokal gespeichert
- Beim nächsten Login werden die Einstellungen aus Supabase geladen
- Falls keine Einstellungen in Supabase vorhanden sind, werden die lokalen Werte verwendet

## 📝 Komponenten-Integration

### SettingsPage.tsx
```typescript
// Theme-Modus mit Auto-Save
<button onClick={() => setThemeMode('glow', currentUser?.id)}>
  Glow Glass
</button>

// Bundesland mit Auto-Save
<select onChange={(e) => {
  const newState = e.target.value;
  onSelectedStateChange(newState);
  if (currentUser) {
    saveUserSettings(currentUser.id, { selectedState: newState });
  }
}}>
```

### GlowContext.tsx
```typescript
// Theme-Modus speichert automatisch in Supabase
const setThemeMode = (mode: ThemeMode, userId?: string) => {
  setThemeModeState(mode);
  if (userId) {
    saveUserSettings(userId, { themeMode: mode });
  }
};
```

## 🔄 Sync-Verhalten

1. **Beim Login**: User Settings werden aus Supabase geladen
2. **Bei Änderung**: Sofortiges Speichern in Supabase
3. **Fallback**: LocalStorage als Backup, wenn Supabase nicht verfügbar

## 🎨 UI-Verbesserungen

### Portal-basierte Menüs

Alle Dropdown-Menüs (Rolle, Status, Kontext-Menü) werden jetzt mit React Portals außerhalb des Containers gerendert:

- ✅ Keine Abschneidung durch `overflow: hidden`
- ✅ Korrekte Positionierung mit `getBoundingClientRect()`
- ✅ Z-Index `9999` für Overlay über allen Elementen
- ✅ Click-Outside-Detection funktioniert korrekt

## 🐛 Bekannte Einschränkungen

- User Settings werden nur gespeichert, wenn ein `currentUser` vorhanden ist
- Beim ersten Setup müssen die Spalten in Supabase manuell hinzugefügt werden (siehe `SUPABASE_USER_SETTINGS_SETUP.sql`)

## 📚 Setup-Anleitung

1. SQL-Script in Supabase ausführen:
   ```bash
   # In Supabase SQL Editor
   cat SUPABASE_USER_SETTINGS_SETUP.sql
   ```

2. Bestehende User aktualisieren (optional):
   ```sql
   UPDATE users SET theme_mode = 'glow' WHERE theme_mode IS NULL;
   ```

3. Fertig! Settings werden automatisch synchronisiert.
