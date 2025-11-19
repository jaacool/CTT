# Supabase Chat Integration

## ✅ Vollständig implementiert

Alle Chat-Daten (Channels, Mitglieder, Nachrichten) werden automatisch über Supabase gespeichert und in Echtzeit zwischen allen Clients synchronisiert.

## 🗄️ Datenbank-Setup

### 1. SQL-Schema ausführen
Führe das SQL-Script in deinem Supabase Dashboard aus:
```bash
SUPABASE_CHAT_SETUP.sql
```

**Erstellt folgende Tabellen:**
- `chat_channels` - Gruppenchannels und Direktnachrichten
- `chat_channel_members` - Zuordnung User ↔ Channel
- `chat_messages` - Alle Chat-Nachrichten mit Projekt-Tags

### 2. Realtime aktivieren
Im Supabase Dashboard unter **Database → Replication → Realtime**:
- ✅ `chat_channels`
- ✅ `chat_channel_members`
- ✅ `chat_messages`

Oder via SQL:
```sql
ALTER PUBLICATION supabase_realtime ADD TABLE chat_channels;
ALTER PUBLICATION supabase_realtime ADD TABLE chat_channel_members;
ALTER PUBLICATION supabase_realtime ADD TABLE chat_messages;
```

## 🔄 Automatische Synchronisation

### Was wird synchronisiert?

#### Channels
- **Erstellen**: Neuer Channel → sofort in Supabase gespeichert
- **Bearbeiten**: Name, Beschreibung, Mitglieder → Update in Supabase
- **Löschen**: Channel entfernen → Cascade-Delete (inkl. Messages)
- **Realtime**: Änderungen erscheinen sofort bei allen Nutzern

#### Nachrichten
- **Senden**: Nachricht → sofort in Supabase gespeichert
- **Realtime**: Neue Nachrichten erscheinen sofort bei allen Channel-Mitgliedern
- **Projekt-Tags**: Jede Nachricht ist mit einem Projekt verknüpft

#### Mitglieder
- **Hinzufügen/Entfernen**: Automatisch synchronisiert
- **DM-Channels**: Werden automatisch für alle Nutzerpaare erstellt

## 📡 Realtime-Funktionen

### Implementierte Callbacks

```typescript
startChatRealtime({
  onChannelUpsert: (channel) => {
    // Neuer/aktualisierter Channel empfangen
    // → State wird automatisch aktualisiert
  },
  onChannelDelete: (channelId) => {
    // Channel wurde gelöscht
    // → Wird aus Liste entfernt
  },
  onMessageInsert: (message) => {
    // Neue Nachricht empfangen
    // → Erscheint sofort im Chat
  },
});
```

### Duplikat-Vermeidung
- **Optimistic Updates**: Änderungen erscheinen sofort lokal
- **Realtime Merge**: Eingehende Updates werden intelligent gemergt
- **ID-Check**: Verhindert doppelte Nachrichten

## 🔧 Technische Details

### Dateien

**SQL-Setup:**
- `SUPABASE_CHAT_SETUP.sql` - Tabellen, Indizes, RLS-Policies

**Sync-Funktionen:**
- `utils/supabaseSync.ts` - CRUD-Operationen für Chat
  - `saveChatChannel()` - Channel speichern/aktualisieren
  - `updateChatChannel()` - Channel bearbeiten
  - `deleteChatChannel()` - Channel löschen
  - `saveChatMessage()` - Nachricht speichern
  - `loadAllChatData()` - Alle Chat-Daten laden

**Realtime:**
- `utils/chatRealtime.ts` - Realtime-Subscriptions
  - `startChatRealtime()` - Subscriptions starten
  - Callbacks für Channel/Message-Events

**App-Integration:**
- `App.tsx` - Handler mit Supabase verknüpft
  - `handleSendMessage()` → `supaSaveChatMessage()`
  - `handleCreateChannel()` → `saveChatChannel()`
  - `handleUpdateChannel()` → `supaUpdateChatChannel()`
  - `handleDeleteChannel()` → `supaDeleteChatChannel()`

### Datenfluss

```
User-Aktion (z.B. Nachricht senden)
    ↓
Handler in App.tsx
    ↓
1. Optimistic Update (sofort im UI)
2. Supabase Save (async)
    ↓
Supabase speichert in DB
    ↓
Realtime Broadcast an alle Clients
    ↓
Andere Clients empfangen Update
    ↓
State wird automatisch aktualisiert
```

## 🚀 Verwendung

### Beim App-Start
```typescript
// Chat-Daten werden automatisch geladen
useEffect(() => {
  const chatData = await loadAllChatData();
  if (chatData) {
    setChatChannels(chatData.channels);
    setChatMessages(chatData.messages);
  }
}, []);
```

### Realtime-Subscriptions
```typescript
// Werden automatisch beim Mount gestartet
useEffect(() => {
  const cleanup = startChatRealtime({
    onChannelUpsert: (channel) => { /* ... */ },
    onChannelDelete: (channelId) => { /* ... */ },
    onMessageInsert: (message) => { /* ... */ },
  });
  return cleanup; // Cleanup beim Unmount
}, []);
```

### Channel erstellen
```typescript
handleCreateChannel(name, description, memberIds, isPrivate);
// → Wird automatisch in Supabase gespeichert
// → Erscheint bei allen Nutzern in Echtzeit
```

### Nachricht senden
```typescript
handleSendMessage(content, channelId, projectId);
// → Wird automatisch in Supabase gespeichert
// → Erscheint bei allen Channel-Mitgliedern in Echtzeit
```

## 🔐 Sicherheit

### RLS-Policies
Aktuell: **Offen für Prototyping** (alle User können alles lesen/schreiben)

Für Produktion anpassen:
```sql
-- Beispiel: Nur Channel-Mitglieder können Nachrichten lesen
CREATE POLICY "Members can read messages" ON chat_messages
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM chat_channel_members
    WHERE channel_id = chat_messages.channel_id
    AND user_id = auth.uid()
  )
);
```

## 📊 Performance

### Optimierungen
- **Indizes**: Auf `channel_id`, `project_id`, `timestamp`
- **Batch-Loading**: Messages werden effizient geladen
- **Optimistic Updates**: Sofortiges UI-Feedback
- **Smart Merging**: Verhindert Duplikate

### Monitoring
Logs in der Browser-Konsole:
```
💬 Lade Chat-Daten aus Supabase...
✅ Chat geladen: 5 Channels, 42 Messages
🔄 Chat Realtime Status: SUBSCRIBED
📥 Realtime: Neue Nachricht empfangen
```

## 🐛 Troubleshooting

### Nachrichten erscheinen nicht in Echtzeit
1. Prüfe Realtime-Aktivierung im Supabase Dashboard
2. Prüfe Browser-Konsole auf Fehler
3. Prüfe RLS-Policies (müssen `true` sein für Prototyping)

### Channels werden nicht gespeichert
1. Prüfe `.env` Datei (VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY)
2. Prüfe SQL-Schema wurde ausgeführt
3. Prüfe Browser-Konsole auf Fehler

### Duplikate bei Nachrichten
- Sollte nicht vorkommen (ID-Check implementiert)
- Falls doch: Prüfe `chatRealtime.ts` → `onMessageInsert`

## ✨ Features

✅ **Automatisches Speichern** - Alle Änderungen werden sofort gespeichert
✅ **Echtzeit-Sync** - Änderungen erscheinen bei allen Nutzern sofort
✅ **Optimistic Updates** - Sofortiges UI-Feedback
✅ **Duplikat-Vermeidung** - Intelligentes Merging
✅ **Projekt-Tags** - Nachrichten sind mit Projekten verknüpft
✅ **DM-Channels** - Automatisch für alle Nutzerpaare erstellt
✅ **Gruppenchannels** - Mit mehreren Mitgliedern
✅ **Cascade-Delete** - Channels löschen entfernt auch Messages
✅ **Safe Mode** - Funktioniert auch wenn Supabase deaktiviert ist

## 🎯 Nächste Schritte

### Optional (für Produktion):
1. **RLS-Policies verschärfen** - Nur Channel-Mitglieder können lesen
2. **Rate Limiting** - Spam-Schutz für Nachrichten
3. **Message Pagination** - Für Channels mit vielen Nachrichten
4. **Read Receipts** - Tracking wer Nachrichten gelesen hat
5. **Typing Indicators** - Zeige wer gerade tippt
6. **File Uploads** - Anhänge in Nachrichten
7. **Reactions** - Emoji-Reaktionen auf Nachrichten
