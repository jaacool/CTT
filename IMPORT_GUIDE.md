# Arbeitszeiten Import-Anleitung

## Für Han's Excel-Datei

### Direkt in der App (Empfohlen)

Die App kann Excel-Dateien (.xlsx, .xls) automatisch konvertieren:

1. Öffne die CTT-App
2. Gehe zur Zeiterfassung (Uhr-Icon)
3. Klicke auf "Importieren"
4. Lade die Datei `2025_HAN-LOEBS_ARBEITSZEITEN.xlsx` direkt hoch
5. Die App konvertiert automatisch zu CSV
6. Klicke auf "Importieren"

**Keine manuelle Konvertierung nötig!**

### Erkannte Abwesenheitstypen

Die App erkennt automatisch verschiedene Abwesenheiten in der TÄTIGKEIT-Spalte:

- **URLAUB** → Urlaub (orange, durchgezogen)
- **AUSGLEICHSTAG** → Ausgleichstag (orange, gestrichelt)
- **KRANK** → Krankmeldung (rot)
- **FEIERTAG** → Sonstige (grau)
- **FREI** → Sonstige (grau)

Alle importierten Abwesenheiten werden automatisch genehmigt und im Kalender angezeigt.

### Alternative: Manuell konvertieren

Wenn du die Datei vorher konvertieren möchtest:

```bash
# Python-Abhängigkeiten installieren (falls noch nicht vorhanden)
pip install pandas openpyxl

# Excel-Datei konvertieren
python scripts/convert_excel_to_csv.py /Users/aaron/Downloads/2025_HAN-LOEBS_ARBEITSZEITEN.xlsx
```

Das Script erstellt automatisch eine CSV-Datei: `2025_HAN-LOEBS_ARBEITSZEITEN_converted.csv`

### Import in die App

1. Öffne die CTT-App
2. Gehe zur Zeiterfassung (Time View)
3. Klicke auf "Importieren" Button
4. Lade die generierte CSV-Datei hoch ODER
5. Kopiere den Inhalt der CSV und füge ihn in das Textfeld ein
6. Klicke auf "Importieren"

## CSV-Format

Die CSV-Datei sollte folgendes Format haben:

```csv
Datum,Start,Ende,Pause,Projekt,Beschreibung
16.11.2025,09:00,17:00,30,Projekt A,Entwicklung
17.11.2025,08:30,16:30,45,Projekt B,Meeting
```

### Felder:

- **Datum**: DD.MM.YYYY oder YYYY-MM-DD
- **Start**: HH:MM (Startzeit)
- **Ende**: HH:MM (Endzeit)
- **Pause**: Minuten (z.B. 30) oder HH:MM (z.B. 00:30)
- **Projekt**: Projektname (optional)
- **Beschreibung**: Beschreibung der Tätigkeit (optional)

## Manuelle Anpassung

Falls das automatische Konvertierungs-Script nicht funktioniert, kannst du die Excel-Datei manuell in CSV konvertieren:

1. Öffne die Excel-Datei
2. Wähle "Datei" → "Speichern unter"
3. Format: "CSV UTF-8 (durch Kommas getrennt) (.csv)"
4. Stelle sicher, dass die Spalten in dieser Reihenfolge sind:
   - Datum, Start, Ende, Pause, Projekt, Beschreibung

## Fehlerbehebung

### "Keine gültigen Einträge gefunden"
- Prüfe, ob die CSV-Datei die richtige Struktur hat
- Stelle sicher, dass die erste Zeile die Spaltenüberschriften enthält
- Prüfe, ob Datum und Uhrzeiten im richtigen Format sind

### "Fehler beim Parsen"
- Prüfe, ob alle Datumsangaben gültig sind
- Prüfe, ob alle Zeitangaben im Format HH:MM sind
- Stelle sicher, dass keine leeren Zeilen in der CSV sind

### Encoding-Probleme
- Stelle sicher, dass die CSV-Datei in UTF-8 kodiert ist
- Bei Excel: "CSV UTF-8" statt "CSV" wählen

## Beispiel-CSV

Eine Beispiel-CSV-Datei zum Testen:

```csv
Datum,Start,Ende,Pause,Projekt,Beschreibung
01.11.2025,08:00,12:00,0,CTT,Frontend Entwicklung
01.11.2025,13:00,17:00,0,CTT,Backend Entwicklung
02.11.2025,09:00,17:30,30,Kunde A,Meeting und Konzeption
03.11.2025,08:30,16:00,45,Kunde B,Implementierung
```
