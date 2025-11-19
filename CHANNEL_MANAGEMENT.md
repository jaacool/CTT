# Channel Management System

## 📍 Wo kann ich Channels verwalten?

### Channel-Verwaltung in Settings
1. Öffne **Settings** (Zahnrad-Icon in der Sidebar)
2. Klicke auf den Tab **"Channels"**
3. Hier kannst du:
   - **Neue Gruppenchannels erstellen** mit dem "+ Neuer Channel" Button
   - **Channel-Namen und Beschreibung** festlegen
   - **Mitglieder auswählen** (mehrere User gleichzeitig möglich)
   - Channels als **privat** markieren
   - Bestehende Channels **bearbeiten** (Edit-Icon ✏️)
   - Channels **löschen** (Trash-Icon 🗑️)

### Direktnachrichten (DMs)
- Werden **automatisch** für alle Nutzerpaare erstellt
- Erscheinen im Chat unter "Direktnachrichten"
- Können nicht bearbeitet oder gelöscht werden
- Zeigen den Namen und Avatar des Chat-Partners

## 🔄 Automatische Channel-Auswahl

### Wie funktioniert es?
Wenn du den Chat öffnest (Chat-Icon 💬 neben der Suche):
1. Das **aktuelle Projekt** wird automatisch gesetzt
2. Der **zuletzt verwendete Channel** für dieses Projekt wird automatisch ausgewählt
3. Falls kein Channel gespeichert ist: Der erste Gruppenchannel wird gewählt

### Projekt-basierte Channels
- Jedes Projekt "merkt" sich den zuletzt verwendeten Channel
- Beim Wechsel zwischen Projekten wechselt auch der Channel automatisch
- Nachrichten werden mit **Projekt-Tags** versehen

## 📋 Channel-Typen

### Gruppenchannels (Group)
- Mehrere Mitglieder möglich
- Name und Beschreibung anpassbar
- Optional privat (nur für Mitglieder sichtbar)
- Icon: # (Hashtag)

### Direktnachrichten (Direct)
- Immer genau 2 Mitglieder
- Automatisch für alle Nutzerpaare erstellt
- Name = Partner-Name
- Icon: 💬 (Message Circle)

## 🎯 Verwendung im Chat

### Chat-Modi
1. **Nach Projekt** (Standard)
   - Zeigt Direktnachrichten und Channels gruppiert
   - Filtert Nachrichten nach Projekt UND Channel
   - Projekt-Auswahl oben, Channel-Liste darunter

2. **Nach Channel**
   - Zeigt alle Nachrichten eines Channels (projekt-übergreifend)
   - Channel-Auswahl oben, Projekt-Liste darunter
   - Nachrichten haben Projekt-Tags

### Nachrichten senden
- Nachrichten werden immer mit dem **aktuellen Projekt** verknüpft
- Der verwendete Channel wird für das Projekt gespeichert
- Beim nächsten Öffnen des Projekts wird dieser Channel vorgeschlagen

## 🔧 Technische Details

### Dateien
- `components/ChannelManagement.tsx` - Channel-Verwaltungs-UI
- `components/ChatModal.tsx` - Chat-Interface mit Auto-Select
- `types.ts` - ChatChannel, ChatChannelType Definitionen
- `App.tsx` - Channel-State und Handler

### State Management
- Channels werden in `App.tsx` verwaltet
- Auto-Erstellung von DM-Channels beim App-Start
- LocalStorage für Channel-Präferenzen pro Projekt

### Handler
- `handleCreateChannel` - Neue Gruppenchannels erstellen
- `handleUpdateChannel` - Channels bearbeiten
- `handleDeleteChannel` - Channels löschen
- `handleSwitchChannel` - Channel wechseln (manuell oder automatisch)
