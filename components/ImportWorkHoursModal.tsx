import React, { useState } from 'react';
import { TimeEntry, User, AbsenceRequest } from '../types';
import { XIcon } from './Icons';
import * as XLSX from 'xlsx';
import { parseHanWorkHoursExcel } from '../utils/parseHanWorkHours';

interface ImportWorkHoursModalProps {
  onClose: () => void;
  onImport: (entries: Omit<TimeEntry, 'id'>[]) => void;
  onImportAbsences?: (absences: Omit<AbsenceRequest, 'id' | 'createdAt' | 'updatedAt' | 'status'>[]) => void;
  user: User;
}

export const ImportWorkHoursModal: React.FC<ImportWorkHoursModalProps> = ({
  onClose,
  onImport,
  onImportAbsences,
  user,
}) => {
  const [csvData, setCsvData] = useState('');
  const [error, setError] = useState('');
  const [useHanFormat, setUseHanFormat] = useState(false);
  const [parsedData, setParsedData] = useState<{ timeEntries: number; absences: number } | null>(null);
  const [hanData, setHanData] = useState<{ timeEntries: Omit<TimeEntry, 'id'>[]; absenceRequests: Omit<AbsenceRequest, 'id' | 'createdAt' | 'updatedAt' | 'status'>[] } | null>(null);

  const parseExcelFile = (data: ArrayBuffer | string, isXLSX: boolean): string => {
    try {
      if (isXLSX) {
        // Parse XLSX file
        const workbook = XLSX.read(data, { type: typeof data === 'string' ? 'string' : 'array' });
        
        // Get first worksheet
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        
        // Convert to CSV
        const csv = XLSX.utils.sheet_to_csv(worksheet);
        
        if (!csv || csv.trim().length === 0) {
          throw new Error('Keine Daten in der Excel-Datei gefunden');
        }
        
        return csv;
      } else {
        // Parse XML
        const xmlContent = typeof data === 'string' ? data : new TextDecoder().decode(data);
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(xmlContent, 'text/xml');
        
        // Check for parsing errors
        const parserError = xmlDoc.querySelector('parsererror');
        if (parserError) {
          throw new Error('XML parsing error');
        }

        // Try to find worksheet data (Excel XML format)
        const rows = xmlDoc.querySelectorAll('Row');
        if (rows.length === 0) {
          throw new Error('Keine Zeilen im XML gefunden');
        }

        const csvLines: string[] = [];
        
        rows.forEach((row, rowIndex) => {
          const cells = row.querySelectorAll('Cell');
          const rowData: string[] = [];
          
          cells.forEach(cell => {
            const data = cell.querySelector('Data');
            rowData.push(data?.textContent?.trim() || '');
          });
          
          // Skip empty rows
          if (rowData.some(cell => cell !== '')) {
            csvLines.push(rowData.map(cell => `"${cell}"`).join(','));
          }
        });

        return csvLines.join('\n');
      }
    } catch (err) {
      console.error('File parsing error:', err);
      throw new Error('Fehler beim Parsen der Datei: ' + (err as Error).message);
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const fileName = file.name.toLowerCase();
    const isXLSX = fileName.endsWith('.xlsx') || fileName.endsWith('.xls');
    const isXML = fileName.endsWith('.xml');

    if (isXLSX) {
      // Read as ArrayBuffer for XLSX
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = e.target?.result as ArrayBuffer;
          
          // Prüfe ob es Han's Format ist (enthält Monats-Sheets wie 01_JAN, 02_FEB)
          const workbook = XLSX.read(data, { type: 'array' });
          const hasMonthSheets = workbook.SheetNames.some(name => 
            /^\d{2}_[A-Z]+$/.test(name) || name === 'RAW-DATA'
          );
          
          if (hasMonthSheets) {
            // Han's spezielles Format
            const parsed = parseHanWorkHoursExcel(data, user);
            setHanData(parsed);
            setParsedData({
              timeEntries: parsed.timeEntries.length,
              absences: parsed.absenceRequests.length
            });
            setUseHanFormat(true);
            setCsvData(''); // Clear CSV data
            setError('');
          } else {
            // Normales Excel → CSV
            const csvContent = parseExcelFile(data, true);
            setCsvData(csvContent);
            setUseHanFormat(false);
            setParsedData(null);
            setError('');
          }
        } catch (err) {
          setError((err as Error).message);
        }
      };
      reader.onerror = () => {
        setError('Fehler beim Lesen der Datei');
      };
      reader.readAsArrayBuffer(file);
    } else {
      // Read as text for CSV/XML
      const reader = new FileReader();
      reader.onload = (e) => {
        const text = e.target?.result as string;
        
        if (isXML || text.trim().startsWith('<?xml')) {
          try {
            const csvContent = parseExcelFile(text, false);
            setCsvData(csvContent);
            setError('');
          } catch (err) {
            setError((err as Error).message);
          }
        } else {
          setCsvData(text);
          setError('');
        }
      };
      reader.onerror = () => {
        setError('Fehler beim Lesen der Datei');
      };
      reader.readAsText(file);
    }
  };

  const parseCSV = (csv: string): Omit<TimeEntry, 'id'>[] => {
    const lines = csv.trim().split('\n');
    const entries: Omit<TimeEntry, 'id'>[] = [];

    // Skip header line
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      // Expected format: Datum,Start,Ende,Pause,Projekt,Beschreibung
      const parts = line.split(',').map(p => p.trim().replace(/^"|"$/g, ''));
      
      if (parts.length < 4) continue;

      const [dateStr, startStr, endStr, pauseStr, project, description] = parts;

      try {
        // Parse date (DD.MM.YYYY or YYYY-MM-DD)
        const dateParts = dateStr.includes('.') 
          ? dateStr.split('.').reverse() 
          : dateStr.split('-');
        const date = new Date(
          parseInt(dateParts[0]),
          parseInt(dateParts[1]) - 1,
          parseInt(dateParts[2])
        );

        // Parse times (HH:MM)
        const [startHour, startMin] = startStr.split(':').map(Number);
        const [endHour, endMin] = endStr.split(':').map(Number);
        
        const start = new Date(date);
        start.setHours(startHour, startMin, 0, 0);
        
        const end = new Date(date);
        end.setHours(endHour, endMin, 0, 0);

        // Parse pause (in minutes or HH:MM)
        let pauseMinutes = 0;
        if (pauseStr) {
          if (pauseStr.includes(':')) {
            const [pauseHour, pauseMin] = pauseStr.split(':').map(Number);
            pauseMinutes = pauseHour * 60 + pauseMin;
          } else {
            pauseMinutes = parseInt(pauseStr) || 0;
          }
        }

        const duration = Math.floor((end.getTime() - start.getTime()) / 1000) - (pauseMinutes * 60);
        
        entries.push({
          taskId: `import-${Date.now()}-${i}`,
          taskTitle: description || 'Arbeitszeit',
          listTitle: 'Importiert',
          projectId: `import-project-${project || 'default'}`,
          projectName: project || 'Importiert',
          startTime: start.toISOString(),
          endTime: end.toISOString(),
          duration,
          user,
          billable: true,
          note: pauseMinutes > 0 ? `Pause: ${pauseMinutes} Min.` : undefined,
        });
      } catch (err) {
        console.error('Fehler beim Parsen der Zeile:', line, err);
      }
    }

    return entries;
  };

  const handleImport = () => {
    try {
      if (useHanFormat && hanData) {
        // Import Han's data
        if (hanData.timeEntries.length > 0) {
          onImport(hanData.timeEntries);
        }
        if (hanData.absenceRequests.length > 0 && onImportAbsences) {
          onImportAbsences(hanData.absenceRequests);
        }
        onClose();
      } else {
        // Import CSV data
        if (!csvData.trim()) {
          setError('Bitte füge CSV-Daten ein oder lade eine Datei hoch');
          return;
        }

        const entries = parseCSV(csvData);
        if (entries.length === 0) {
          setError('Keine gültigen Einträge gefunden');
          return;
        }

        onImport(entries);
        onClose();
      }
    } catch (err) {
      setError('Fehler beim Importieren: ' + (err as Error).message);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-surface rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-border">
        {/* Header */}
        <div className="sticky top-0 bg-surface border-b border-border p-6 flex items-center justify-between">
          <h2 className="text-xl font-bold text-text-primary">Arbeitszeiten importieren</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-overlay rounded-lg transition-colors"
          >
            <XIcon className="w-5 h-5 text-text-secondary" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Instructions */}
          <div className="bg-overlay rounded-lg p-4 border border-border">
            <h3 className="font-semibold text-text-primary mb-2">CSV-Format:</h3>
            <code className="text-xs text-text-secondary block whitespace-pre">
{`Datum,Start,Ende,Pause,Projekt,Beschreibung
16.11.2025,09:00,17:00,30,Projekt A,Entwicklung
17.11.2025,08:30,16:30,45,Projekt B,Meeting`}
            </code>
            <p className="text-sm text-text-secondary mt-2">
              • Datum: DD.MM.YYYY oder YYYY-MM-DD<br />
              • Start/Ende: HH:MM<br />
              • Pause: Minuten oder HH:MM
            </p>
          </div>

          {/* File Upload */}
          <div>
            <label className="block text-sm font-medium text-text-primary mb-2">
              Datei hochladen
            </label>
            <input
              type="file"
              accept=".csv,.txt,.xml,.xlsx,.xls"
              onChange={handleFileUpload}
              className="block w-full text-sm text-text-secondary
                file:mr-4 file:py-2 file:px-4
                file:rounded-lg file:border-0
                file:text-sm file:font-semibold
                file:bg-glow-purple/20 file:text-glow-purple
                hover:file:bg-glow-purple/30
                cursor-pointer"
            />
            <p className="text-xs text-text-secondary mt-1">
              Unterstützt: CSV, TXT, XML, XLSX, XLS
            </p>
          </div>

          {/* Manual Input */}
          <div>
            <label className="block text-sm font-medium text-text-primary mb-2">
              Oder CSV-Daten einfügen
            </label>
            <textarea
              value={csvData}
              onChange={(e) => setCsvData(e.target.value)}
              placeholder="Datum,Start,Ende,Pause,Projekt,Beschreibung&#10;16.11.2025,09:00,17:00,30,Projekt,Beschreibung"
              className="w-full h-48 px-4 py-3 bg-background border border-border rounded-lg
                text-text-primary placeholder-text-secondary
                focus:outline-none focus:ring-2 focus:ring-glow-purple/50
                font-mono text-sm"
            />
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4">
              <p className="text-sm text-red-500">{error}</p>
            </div>
          )}

          {/* Preview */}
          {parsedData && !error && (
            <div className="bg-green-500/10 rounded-lg p-4 border border-green-500/30">
              <p className="text-sm font-semibold text-green-500 mb-2">
                ✓ Han's Arbeitszeiten-Datei erkannt!
              </p>
              <p className="text-sm text-text-secondary">
                • {parsedData.timeEntries} Zeiteinträge gefunden<br />
                • {parsedData.absences} Abwesenheiten gefunden (Urlaub, Krank, Feiertage)
              </p>
            </div>
          )}
          {csvData && !error && !useHanFormat && (
            <div className="bg-overlay rounded-lg p-4 border border-border">
              <p className="text-sm text-text-secondary">
                {parseCSV(csvData).length} Einträge gefunden
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-surface border-t border-border p-6 flex justify-end space-x-3">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg border border-border text-text-secondary hover:bg-overlay transition-colors"
          >
            Abbrechen
          </button>
          <button
            onClick={handleImport}
            className="px-4 py-2 rounded-lg bg-glow-purple/20 text-glow-purple border border-glow-purple/30 hover:bg-glow-purple/30 transition-colors font-semibold"
          >
            Importieren
          </button>
        </div>
      </div>
    </div>
  );
};
