import React, { useState, useRef } from 'react';
import { TimeEntry, User, Project } from '../types';
import { importTimeReport, exportTimeReport, ImportResult } from '../utils/timeReportImportExport';
import { UploadIcon, DownloadIcon, CheckCircleIcon, XCircleIcon } from './Icons';

interface TimeReportImportExportProps {
  timeEntries: TimeEntry[];
  projects: Project[];
  users: User[];
  onImportComplete: (result: ImportResult) => void;
}

export const TimeReportImportExport: React.FC<TimeReportImportExportProps> = ({
  timeEntries,
  projects,
  users,
  onImportComplete,
}) => {
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setImporting(true);
    setImportError(null);
    setImportResult(null);

    try {
      const arrayBuffer = await file.arrayBuffer();
      const result = importTimeReport(arrayBuffer, projects, users);
      
      setImportResult(result);
      onImportComplete(result);
      
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (error) {
      console.error('Import failed:', error);
      setImportError(error instanceof Error ? error.message : 'Import fehlgeschlagen');
    } finally {
      setImporting(false);
    }
  };

  const handleExport = () => {
    try {
      const arrayBuffer = exportTimeReport(timeEntries, projects);
      const blob = new Blob([arrayBuffer], { 
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
      });
      
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      
      const today = new Date().toISOString().split('T')[0];
      link.download = `${today}-time-report-raw.xlsx`;
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Export failed:', error);
      alert('Export fehlgeschlagen: ' + (error instanceof Error ? error.message : 'Unbekannter Fehler'));
    }
  };

  return (
    <div className="space-y-4">
      <div className="bg-surface rounded-xl p-6 border border-border">
        <h3 className="text-lg font-bold text-text-primary mb-4">Zeiteinträge Import/Export</h3>
        <p className="text-sm text-text-secondary mb-6">
          Importiere oder exportiere Zeiteinträge im standardisierten Excel-Format. 
          Das Format ist kompatibel mit anderen Zeittracking-Systemen.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Import */}
          <div className="bg-overlay rounded-lg p-4 border border-border">
            <div className="flex items-center space-x-2 mb-3">
              <UploadIcon className="w-5 h-5 text-glow-purple" />
              <h4 className="font-semibold text-text-primary">Import</h4>
            </div>
            <p className="text-xs text-text-secondary mb-4">
              Lade eine Excel-Datei hoch, um Zeiteinträge, Projekte, Listen und Tasks zu importieren.
            </p>
            
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls"
              onChange={handleImport}
              className="hidden"
              id="time-report-import"
            />
            
            <label
              htmlFor="time-report-import"
              className={`flex items-center justify-center space-x-2 px-4 py-2 rounded-lg border-2 border-dashed transition-all cursor-pointer ${
                importing
                  ? 'border-text-secondary/30 bg-overlay cursor-not-allowed'
                  : 'border-glow-purple/50 hover:border-glow-purple hover:bg-glow-purple/10'
              }`}
            >
              <UploadIcon className="w-4 h-4" />
              <span className="text-sm font-medium">
                {importing ? 'Importiere...' : 'Excel-Datei auswählen'}
              </span>
            </label>
          </div>

          {/* Export */}
          <div className="bg-overlay rounded-lg p-4 border border-border">
            <div className="flex items-center space-x-2 mb-3">
              <DownloadIcon className="w-5 h-5 text-glow-cyan" />
              <h4 className="font-semibold text-text-primary">Export</h4>
            </div>
            <p className="text-xs text-text-secondary mb-4">
              Exportiere alle Zeiteinträge als Excel-Datei im standardisierten Format.
            </p>
            
            <button
              onClick={handleExport}
              disabled={timeEntries.length === 0}
              className={`w-full flex items-center justify-center space-x-2 px-4 py-2 rounded-lg transition-all ${
                timeEntries.length === 0
                  ? 'bg-overlay border border-border text-text-secondary cursor-not-allowed'
                  : 'glow-button'
              }`}
            >
              <DownloadIcon className="w-4 h-4" />
              <span className="text-sm font-medium">
                Zeiteinträge exportieren ({timeEntries.length})
              </span>
            </button>
          </div>
        </div>

        {/* Import Result */}
        {importResult && (
          <div className="mt-6 bg-green-500/10 border border-green-500/30 rounded-lg p-4">
            <div className="flex items-start space-x-3">
              <CheckCircleIcon className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h4 className="font-semibold text-green-500 mb-2">Import erfolgreich!</h4>
                <div className="grid grid-cols-2 gap-2 text-sm text-text-secondary">
                  <div>
                    <span className="font-medium text-text-primary">{importResult.stats.projectsCreated}</span> Projekte erstellt
                  </div>
                  <div>
                    <span className="font-medium text-text-primary">{importResult.stats.listsCreated}</span> Listen erstellt
                  </div>
                  <div>
                    <span className="font-medium text-text-primary">{importResult.stats.tasksCreated}</span> Tasks erstellt
                  </div>
                  <div>
                    <span className="font-medium text-text-primary">{importResult.stats.subtasksCreated}</span> Subtasks erstellt
                  </div>
                  <div className="col-span-2">
                    <span className="font-medium text-text-primary">{importResult.stats.timeEntriesImported}</span> Zeiteinträge importiert
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Import Error */}
        {importError && (
          <div className="mt-6 bg-red-500/10 border border-red-500/30 rounded-lg p-4">
            <div className="flex items-start space-x-3">
              <XCircleIcon className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h4 className="font-semibold text-red-500 mb-1">Import fehlgeschlagen</h4>
                <p className="text-sm text-text-secondary">{importError}</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Format Information */}
      <div className="bg-surface rounded-xl p-6 border border-border">
        <h3 className="text-lg font-bold text-text-primary mb-3">Excel-Format Details</h3>
        <div className="space-y-2 text-sm text-text-secondary">
          <p>
            <strong className="text-text-primary">Struktur:</strong> Die Excel-Datei enthält eine Zeile pro Zeiteintrag mit folgenden Spalten:
          </p>
          <ul className="list-disc list-inside space-y-1 ml-4">
            <li>User, Date, Start Time, End Time, Duration</li>
            <li>Project Name, Company Name, Task Name</li>
            <li>Parent Task (für Subtasks)</li>
            <li>Task Lists (Liste/Kategorie)</li>
            <li>Is Billable, Note</li>
          </ul>
          <p className="mt-3">
            <strong className="text-text-primary">Import:</strong> Beim Import werden automatisch fehlende Projekte, Listen, Tasks und Subtasks erstellt.
            User müssen bereits im System existieren (Matching über Namen).
          </p>
          <p>
            <strong className="text-text-primary">Export:</strong> Exportiert alle Zeiteinträge mit vollständiger Projekt- und Task-Hierarchie.
          </p>
        </div>
      </div>
    </div>
  );
};
