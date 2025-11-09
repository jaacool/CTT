<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

# CTT - Collaborative Time Tracking & Project Management

Ein modernes Projektmanagement- und Zeiterfassungstool, entwickelt mit React, TypeScript und Vite.

## 🚀 Getting Started

```bash
npm install
npm run dev
```

Die Anwendung läuft unter [http://localhost:3000](http://localhost:3000).

## 📋 Funktionsübersicht

### Projektstruktur

CTT organisiert Arbeit in einer mehrstufigen Hierarchie:

```
Workspace
  └── Projekte
       └── Listen
            └── Aufgaben
                 ├── Unteraufgaben
                 └── To-Dos (Checkliste)
```

### Hauptfunktionen

#### 🗂️ Projekte
- **Erstellen**: Klick auf "+" in der Sidebar unter "Meine Projekte"
- **Umbenennen**: Doppelklick auf Projektnamen
- **Projektdetails**: Status, Zeitraum, Budget, Teammitglieder
- **Fortschrittsanzeige**: Automatische Berechnung basierend auf erledigten Aufgaben

#### 📝 Listen & Aufgaben
- **Liste erstellen**: Button "Neue Liste hinzufügen" im Projektbereich
- **Aufgabe erstellen**: Button "Neue Aufgabe" in jeder Liste
- **Umbenennen**: Doppelklick auf Listen-/Aufgabentitel
- **Status ändern**: Hover über Status-Icon links → Auswahl aus:
  - ⚪ To Do (leer)
  - 🟡 In Arbeit (Pfeil)
  - 🟢 Erledigt (Haken)

#### 🔄 Unteraufgaben
- **Erstellen**: Im Detail Panel (rechts) → "Neue Unteraufgabe"
- **Anzeigen**: Werden eingerückt unter der Hauptaufgabe angezeigt
- **Bearbeiten**: Klick auf Unteraufgabe öffnet Detail Panel
- **Eigener Status**: Jede Unteraufgabe hat eigenen Status und Zeit-Tracking

#### ✅ To-Dos (Checkliste)
- **Hinzufügen**: Im Detail Panel → "Eintrag hinzufügen"
- **Abhaken**: Checkbox anklicken
- **Löschen**: Hover über To-Do → "×" Button
- **Verwendung**: Für kleine Schritte innerhalb einer Aufgabe

#### ⏱️ Zeit-Tracking
- **Timer starten/stoppen**: Play-Button rechts neben Aufgabe
- **Aktiver Timer**: Zeigt lila Hintergrund
- **Zeitanzeige**: Automatische Formatierung (HH:MM:SS)
- **Zuordnung**: Zeit wird automatisch Projekt und Budget zugeordnet
- **Detail Panel**: Großer Timer-Button unten für aktuelle Aufgabe

#### 📊 Detail Panel (rechts)
Zeigt beim Klick auf eine Aufgabe:
- **Kontext**: Projekt und Liste der Aufgabe
- **Beschreibung**: Freitext-Editor
- **Checkliste**: To-Dos mit Checkbox
- **Unteraufgaben**: Liste aller Unteraufgaben (anklickbar)
- **Anhänge**: Platzhalter für Dateien
- **Zeitinformationen**:
  - Fälligkeitsdatum
  - Geplante Zeit (Budget)
  - Erfasste Zeit
  - Fortschritt in %
- **Aktivitätsverlauf**: Automatische Protokollierung von Änderungen

### 🎨 UI-Features

- **Inline-Editing**: Doppelklick auf Namen/Titel zum Umbenennen
- **Keyboard-Shortcuts**: 
  - `Enter` → Speichern
  - `Escape` → Abbrechen
- **Hover-Effekte**: Zusätzliche Optionen bei Mouse-Over
- **Responsive Design**: Anpassung an verschiedene Bildschirmgrößen
- **Dark Theme**: Moderne dunkle Oberfläche

## 🏗️ Technischer Aufbau

### Architektur
- **React 19** mit TypeScript
- **State Management**: React Hooks (useState, useEffect, useCallback)
- **Styling**: TailwindCSS mit Custom Design System
- **Build Tool**: Vite für schnelle Entwicklung

### Datenmodell
```typescript
Workspace
  ├── Projects[]
       ├── TaskLists[]
            ├── Tasks[]
                 ├── Subtasks[]
                 ├── Todos[]
                 └── Activity[]
```

### Komponenten
- `App.tsx` - Hauptkomponente mit State Management
- `Sidebar.tsx` - Projektnavigation und Suche
- `TaskArea.tsx` - Listen und Aufgaben-Ansicht
- `TaskDetailPanel.tsx` - Detailansicht und Bearbeitung
- `Icons.tsx` - SVG Icon-Bibliothek
- `utils.ts` - Hilfsfunktionen (Zeitformatierung, etc.)

## 🔄 Workflow-Beispiel

### Filmprojekt "TV-Spot Winterkampagne"

1. **Projekt erstellen**: "TV-Spot Winterkampagne"
2. **Listen anlegen**:
   - Konzeptphase
   - Drehvorbereitung
   - Produktion
   - Postproduktion
3. **Aufgabe in "Postproduktion"**: "Final Cut erstellen"
4. **Unteraufgaben hinzufügen**:
   - Rohschnitt
   - Feinschnitt
   - Farbkorrektur
   - Sounddesign
5. **To-Dos in Aufgabe**:
   - Musiklizenz prüfen
   - Freigabe vom Kunden einholen
6. **Zeit erfassen**: Timer bei "Feinschnitt" starten
7. **Status aktualisieren**: Von "To Do" → "In Arbeit" → "Erledigt"

## 📈 Reporting

- **Projektübersicht**: Fortschritt, Zeitaufwand vs. Budget
- **Zeitauswertung**: Erfasste Zeit pro Projekt/Aufgabe/Mitarbeiter
- **Aktivitätsverlauf**: Automatische Dokumentation aller Änderungen

## 🎯 Best Practices

1. **Projekte strukturieren**: Nutze Listen für Projektphasen
2. **Aufgaben aufteilen**: Große Aufgaben in Unteraufgaben gliedern
3. **To-Dos nutzen**: Für kleine Schritte innerhalb einer Aufgabe
4. **Zeit erfassen**: Immer Timer nutzen für genaue Zeiterfassung
5. **Status aktualisieren**: Regelmäßig Status der Aufgaben pflegen

## 🛠️ Entwicklung

```bash
# Development Server
npm run dev

# Production Build
npm run build

# Preview Production Build
npm run preview
```

## Run Locally

**Prerequisites:**  Node.js

1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`
