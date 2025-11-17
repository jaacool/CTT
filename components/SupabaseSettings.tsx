import React, { useState } from 'react';
import { saveAllData, deleteAllData } from '../utils/supabaseSync';
import { saveToLocalStorage } from '../utils/dataBackup';
import { saveCompressedBackupToSupabase } from '../utils/supabaseBackup';
import { Project, TimeEntry, User, AbsenceRequest } from '../types';

// Prüfe ob Supabase konfiguriert ist
const SUPABASE_ENABLED = !!(import.meta as any).env?.VITE_SUPABASE_URL && !!(import.meta as any).env?.VITE_SUPABASE_ANON_KEY;

interface SupabaseSettingsProps {
  projects: Project[];
  timeEntries: TimeEntry[];
  users: User[];
  absenceRequests: AbsenceRequest[];
}

export const SupabaseSettings: React.FC<SupabaseSettingsProps> = ({
  projects,
  timeEntries,
  users,
  absenceRequests
}) => {
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [showTestModal, setShowTestModal] = useState(false);
  const [showClearCacheModal, setShowClearCacheModal] = useState(false);
  const [saveProgress, setSaveProgress] = useState({ current: 0, total: 0, phase: '' });

  const handleDeleteAll = async () => {
    console.log('🗑️ Delete All Button geklickt');
    
    if (!confirm('⚠️ Wirklich ALLE Daten aus Supabase löschen? Dies kann nicht rückgängig gemacht werden!')) {
      console.log('ℹ️ Löschen abgebrochen');
      return;
    }

    console.log('🔄 Starte Löschvorgang...');
    setIsDeleting(true);
    setMessage(null);

    try {
      const success = await deleteAllData();
      
      if (success) {
        console.log('✅ Daten erfolgreich gelöscht');
        setMessage({ type: 'success', text: '✅ Alle Daten wurden aus Supabase gelöscht' });
      } else {
        console.log('❌ Löschen fehlgeschlagen');
        setMessage({ type: 'error', text: '❌ Fehler beim Löschen der Daten' });
      }
    } catch (error) {
      console.error('❌ Fehler beim Löschen:', error);
      setMessage({ type: 'error', text: '❌ Fehler: ' + (error instanceof Error ? error.message : 'Unbekannter Fehler') });
    }

    setIsDeleting(false);
  };

  const handleSaveAll = async () => {
    console.log('💾 Save All Button geklickt');
    console.log(`Daten: ${users.length} Users, ${projects.length} Projekte, ${timeEntries.length} TimeEntries, ${absenceRequests.length} Abwesenheiten`);
    // Öffne eigenes Modal
    setShowSaveModal(true);
  };

  const confirmSaveAll = async () => {
    console.log('🔄 Starte Speichervorgang...');
    setIsSaving(true);
    setMessage(null);
    setSaveProgress({ current: 0, total: 0, phase: 'Starte...' });

    const success = await saveAllData(
      projects, 
      timeEntries, 
      users, 
      absenceRequests,
      (current, total, phase) => {
        setSaveProgress({ current, total, phase });
      }
    );
    
    console.log('✅ Speichervorgang abgeschlossen, success:', success);
    
    if (success) {
      // Setze das Initial-Sync-Flag, damit es nicht nochmal läuft
      localStorage.setItem('supabase_initial_sync', 'true');
      
      // Aktualisiere localStorage Cache
      console.log('💾 Aktualisiere localStorage Cache...');
      try {
        saveToLocalStorage(users, projects, timeEntries, absenceRequests);
      } catch (error) {
        console.error('⚠️ Fehler beim Speichern in localStorage (nicht kritisch):', error);
      }
      
      // Speichere auch komprimiertes Backup in Supabase Storage (optional, nicht kritisch)
      console.log('📦 Speichere komprimiertes Backup in Supabase...');
      try {
        await saveCompressedBackupToSupabase(users, projects, timeEntries, absenceRequests);
      } catch (error) {
        console.error('⚠️ Fehler beim Speichern des Backups (nicht kritisch):', error);
      }
      
      setMessage({ 
        type: 'success', 
        text: `✅ Alle Daten gespeichert (${users.length} Users, ${projects.length} Projekte, ${timeEntries.length} Zeiteinträge, ${absenceRequests.length} Abwesenheiten)` 
      });
      
      // Schließe Modal sofort (nicht warten)
      setIsSaving(false);
      setShowSaveModal(false);
    } else {
      setMessage({ type: 'error', text: '❌ Fehler beim Speichern der Daten' });
      setIsSaving(false);
      // Modal bleibt offen bei Fehler
    }
  };
  
  const handleResetSyncFlag = () => {
    localStorage.removeItem('supabase_initial_sync');
    setMessage({ type: 'info', text: 'ℹ️ Sync-Flag zurückgesetzt. Seite neu laden für erneuten Initial-Sync.' });
  };

  const handleClearCache = () => {
    localStorage.removeItem('ctt_backup');
    localStorage.removeItem('supabase_initial_sync');
    setShowClearCacheModal(true);
    
    // Schließe Modal nach 3 Sekunden
    setTimeout(() => {
      setShowClearCacheModal(false);
    }, 3000);
  };

  if (!SUPABASE_ENABLED) {
    return (
      <div className="p-6">
        <div className="bg-overlay rounded-lg p-4 border border-yellow-500/30">
          <div className="flex items-start space-x-3">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-yellow-500 flex-shrink-0">
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="12" y1="8" x2="12" y2="12"></line>
              <line x1="12" y1="16" x2="12.01" y2="16"></line>
            </svg>
            <div>
              <h3 className="text-text-primary font-semibold mb-1">Supabase ist deaktiviert</h3>
              <p className="text-text-secondary text-sm">
                Um Supabase zu aktivieren, setze <code className="bg-background px-1 py-0.5 rounded">SUPABASE_ENABLED = true</code> in <code className="bg-background px-1 py-0.5 rounded">utils/supabaseClient.ts</code>
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const isAvailable = SUPABASE_ENABLED;

  return (
    <div className="p-6 space-y-6">
      {/* Status */}
      <div className={`bg-overlay rounded-lg p-4 border ${isAvailable ? 'border-green-500/30' : 'border-red-500/30'}`}>
        <div className="flex items-start space-x-3">
          {isAvailable ? (
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-green-500 flex-shrink-0">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
              <polyline points="22 4 12 14.01 9 11.01"></polyline>
            </svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-red-500 flex-shrink-0">
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="15" y1="9" x2="9" y2="15"></line>
              <line x1="9" y1="9" x2="15" y2="15"></line>
            </svg>
          )}
          <div>
            <h3 className="text-text-primary font-semibold mb-1">
              {isAvailable ? 'Supabase verbunden' : 'Supabase nicht verfügbar'}
            </h3>
            <p className="text-text-secondary text-sm">
              {isAvailable 
                ? 'Auto-Save ist aktiv. Änderungen werden automatisch gespeichert.'
                : 'Bitte .env Datei mit Supabase Credentials erstellen (siehe .env.example)'
              }
            </p>
          </div>
        </div>
      </div>

      {/* Modals */}
      {showSaveModal && (
        <div 
          className="fixed inset-0 flex items-center justify-center"
          style={{ zIndex: 9999, backgroundColor: 'rgba(0,0,0,0.7)' }}
          onClick={() => !isSaving && setShowSaveModal(false)}
        >
          <div 
            className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-md p-6 m-4"
            style={{ zIndex: 10000 }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              Alle Daten in Supabase speichern?
            </h3>
            <p className="text-gray-600 dark:text-gray-300 mb-4">
              Dies überschreibt bestehende Datensätze. Zu speichern: {users?.length || 0} Users, {projects?.length || 0} Projekte, {timeEntries?.length || 0} Zeiteinträge, {absenceRequests?.length || 0} Abwesenheiten.
            </p>
            
            {/* Progress Bar */}
            {isSaving && saveProgress.total > 0 && (
              <div className="mb-4">
                <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-300 mb-2">
                  <span>{saveProgress.phase}</span>
                  <span>{saveProgress.current} / {saveProgress.total} ({Math.round((saveProgress.current / saveProgress.total) * 100)}%)</span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5">
                  <div 
                    className="bg-green-500 h-2.5 rounded-full transition-all duration-300"
                    style={{ width: `${(saveProgress.current / saveProgress.total) * 100}%` }}
                  />
                </div>
              </div>
            )}
            
            <div className="flex items-center justify-end space-x-2">
              <button
                onClick={() => setShowSaveModal(false)}
                disabled={isSaving}
                className="px-4 py-2 rounded-md border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50"
              >
                Abbrechen
              </button>
              <button
                onClick={confirmSaveAll}
                disabled={isSaving}
                className="px-4 py-2 rounded-md bg-green-500 text-white hover:bg-green-600 disabled:opacity-50 flex items-center space-x-2"
              >
                {isSaving && (
                  <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                )}
                <span>{isSaving ? 'Speichere…' : 'Jetzt speichern'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {showTestModal && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center">
          <div className="absolute inset-0 bg-black/60" onClick={() => setShowTestModal(false)} />
          <div className="relative bg-surface border border-border rounded-xl shadow-2xl w-full max-w-sm p-6">
            <h3 className="text-lg font-semibold text-text-primary mb-2">Test-Modal</h3>
            <p className="text-text-secondary mb-4">Der Button funktioniert. Dieses Modal wurde per Klick geöffnet.</p>
            <div className="flex items-center justify-end">
              <button
                onClick={() => setShowTestModal(false)}
                className="px-4 py-2 rounded-md bg-primary text-white hover:bg-primary/90"
              >Schließen</button>
            </div>
          </div>
        </div>
      )}
      {/* Message */}
      {message && (
        <div className={`bg-overlay rounded-lg p-4 border ${
          message.type === 'success' ? 'border-green-500/30' :
          message.type === 'error' ? 'border-red-500/30' :
          'border-blue-500/30'
        }`}>
          <p className={`text-sm ${
            message.type === 'success' ? 'text-green-500' :
            message.type === 'error' ? 'text-red-500' :
            'text-blue-500'
          }`}>
            {message.text}
          </p>
        </div>
      )}

      {/* Actions */}
      {isAvailable && (
        <div className="space-y-4">
          <div>
            <h3 className="text-text-primary font-semibold mb-3">Daten-Verwaltung</h3>
            
            <div className="space-y-3">
              {/* TEST Button */}
              <button
                onClick={() => {
                  console.log('🧪 TEST BUTTON CLICKED!');
                  setShowTestModal(true);
                }}
                className="w-full px-4 py-3 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/30 rounded-lg text-blue-500 font-semibold transition-colors"
              >
                🧪 Test Button (zum Debuggen)
              </button>

              {/* Save All Button */}
              <button
                onClick={() => {
                  console.log('🖱️ Save Button Click Event');
                  setShowSaveModal(true);
                }}
                className={`w-full px-4 py-3 bg-green-500/10 hover:bg-green-500/20 border border-green-500/30 rounded-lg text-green-500 font-semibold transition-colors flex items-center justify-center space-x-2 ${isSaving ? 'opacity-70 cursor-wait' : ''}`}
              >
                {isSaving ? (
                  <>
                    <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span>Speichere...</span>
                  </>
                ) : (
                  <>
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path>
                      <polyline points="17 21 17 13 7 13 7 21"></polyline>
                      <polyline points="7 3 7 8 15 8"></polyline>
                    </svg>
                    <span>Alle Daten in Supabase speichern</span>
                  </>
                )}
              </button>

              {/* Clear Cache Button */}
              <button
                onClick={handleClearCache}
                className="w-full px-4 py-3 bg-yellow-500/10 hover:bg-yellow-500/20 border border-yellow-500/30 rounded-lg text-yellow-500 font-semibold transition-colors flex items-center justify-center space-x-2"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 6h18"></path>
                  <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path>
                  <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path>
                  <line x1="10" y1="11" x2="10" y2="17"></line>
                  <line x1="14" y1="11" x2="14" y2="17"></line>
                </svg>
                <span>localStorage Cache löschen</span>
              </button>

              {/* Delete All Button */}
              <button
                onClick={(e) => {
                  console.log('🖱️ Button Click Event:', e);
                  handleDeleteAll();
                }}
                disabled={isDeleting}
                className="w-full px-4 py-3 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 rounded-lg text-red-500 font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
              >
                {isDeleting ? (
                  <>
                    <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span>Lösche...</span>
                  </>
                ) : (
                  <>
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="3 6 5 6 21 6"></polyline>
                      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                      <line x1="10" y1="11" x2="10" y2="17"></line>
                      <line x1="14" y1="11" x2="14" y2="17"></line>
                    </svg>
                    <span>Alle Daten aus Supabase löschen</span>
                  </>
                )}
              </button>
              
              {/* Reset Sync Flag Button */}
              <button
                onClick={handleResetSyncFlag}
                className="w-full px-4 py-3 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/30 rounded-lg text-blue-500 font-semibold transition-colors flex items-center justify-center space-x-2"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="23 4 23 10 17 10"></polyline>
                  <polyline points="1 20 1 14 7 14"></polyline>
                  <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
                </svg>
                <span>Sync-Flag zurücksetzen</span>
              </button>
            </div>
          </div>

          {/* Info */}
          <div className="bg-overlay rounded-lg p-4 border border-blue-500/30">
            <div className="flex items-start space-x-3">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-blue-500 flex-shrink-0 mt-0.5">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="12" y1="16" x2="12" y2="12"></line>
                <line x1="12" y1="8" x2="12.01" y2="8"></line>
              </svg>
              <div className="text-sm text-text-secondary">
                <p className="mb-2"><strong className="text-text-primary">Auto-Save:</strong> Änderungen werden automatisch in Supabase gespeichert.</p>
                <p className="mb-2"><strong className="text-text-primary">Bulk Upload:</strong> Speichert alle lokalen Daten auf einmal.</p>
                <p><strong className="text-text-primary">Reset:</strong> Löscht alle Daten aus der Cloud (lokale Daten bleiben erhalten).</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Clear Cache Success Modal */}
      {showClearCacheModal && (
        <div 
          className="fixed inset-0 flex items-center justify-center"
          style={{ zIndex: 9999, backgroundColor: 'rgba(0,0,0,0.7)' }}
          onClick={() => setShowClearCacheModal(false)}
        >
          <div 
            className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-md p-6 m-4"
            style={{ zIndex: 10000 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-center mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-green-500">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                <polyline points="22 4 12 14.01 9 11.01"></polyline>
              </svg>
            </div>
            
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2 text-center">
              ✅ Cache gelöscht!
            </h3>
            
            <p className="text-gray-600 dark:text-gray-300 mb-4 text-center">
              Der localStorage Cache wurde erfolgreich gelöscht.
            </p>
            
            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3 mb-4">
              <p className="text-sm text-blue-600 dark:text-blue-400 text-center">
                💡 Lade die Seite neu (F5), um Daten aus Supabase zu laden
              </p>
            </div>
            
            <button
              onClick={() => setShowClearCacheModal(false)}
              className="w-full px-4 py-2 rounded-md bg-green-500 text-white hover:bg-green-600 transition-colors"
            >
              OK
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
