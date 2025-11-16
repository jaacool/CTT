import React, { useState } from 'react';
import { isSupabaseAvailable, SUPABASE_ENABLED } from '../utils/supabaseClient';
import { deleteAllData, saveAllData } from '../utils/supabaseSync';
import { Project, TimeEntry, User, AbsenceRequest } from '../types';

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

  const handleDeleteAll = async () => {
    if (!confirm('⚠️ Wirklich ALLE Daten aus Supabase löschen? Dies kann nicht rückgängig gemacht werden!')) {
      return;
    }

    setIsDeleting(true);
    setMessage(null);

    const success = await deleteAllData();
    
    if (success) {
      setMessage({ type: 'success', text: '✅ Alle Daten wurden aus Supabase gelöscht' });
    } else {
      setMessage({ type: 'error', text: '❌ Fehler beim Löschen der Daten' });
    }

    setIsDeleting(false);
  };

  const handleSaveAll = async () => {
    if (!confirm('💾 Alle lokalen Daten in Supabase speichern? Bestehende Daten werden überschrieben.')) {
      return;
    }

    setIsSaving(true);
    setMessage(null);

    const success = await saveAllData(projects, timeEntries, users, absenceRequests);
    
    if (success) {
      setMessage({ 
        type: 'success', 
        text: `✅ Alle Daten gespeichert (${users.length} Users, ${projects.length} Projekte, ${timeEntries.length} Zeiteinträge, ${absenceRequests.length} Abwesenheiten)` 
      });
    } else {
      setMessage({ type: 'error', text: '❌ Fehler beim Speichern der Daten' });
    }

    setIsSaving(false);
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

  const isAvailable = isSupabaseAvailable();

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
              {/* Save All Button */}
              <button
                onClick={handleSaveAll}
                disabled={isSaving}
                className="w-full px-4 py-3 bg-green-500/10 hover:bg-green-500/20 border border-green-500/30 rounded-lg text-green-500 font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
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

              {/* Delete All Button */}
              <button
                onClick={handleDeleteAll}
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
    </div>
  );
};
