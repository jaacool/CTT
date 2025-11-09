import React, { useState } from 'react';
import { Task, Project } from '../types';

interface DeleteTaskModalProps {
  task: Task;
  projects: Project[];
  timeEntriesCount: number;
  totalHours: number;
  onClose: () => void;
  onDelete: (moveTimeEntriesTo?: string) => void;
}

export const DeleteTaskModal: React.FC<DeleteTaskModalProps> = ({
  task,
  projects,
  timeEntriesCount,
  totalHours,
  onClose,
  onDelete
}) => {
  const [deleteOption, setDeleteOption] = useState<'delete' | 'move'>('delete');
  const [selectedTaskId, setSelectedTaskId] = useState<string>('');

  // Alle Tasks aus allen Projekten sammeln (außer der zu löschenden)
  const allTasks = projects.flatMap(p =>
    p.taskLists.flatMap(list =>
      list.tasks.filter(t => t.id !== task.id)
    )
  );

  const handleConfirm = () => {
    if (deleteOption === 'move' && selectedTaskId) {
      onDelete(selectedTaskId);
    } else {
      onDelete();
    }
  };

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/70 z-[70]"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
        <div 
          className="bg-[#1a1d2e] rounded-2xl w-full max-w-lg shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="p-6 border-b border-c-highlight">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 rounded-full bg-red-500/20 flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-red-500">
                  <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
                  <line x1="12" y1="9" x2="12" y2="13"></line>
                  <line x1="12" y1="17" x2="12.01" y2="17"></line>
                </svg>
              </div>
              <div className="flex-1">
                <h2 className="text-white text-xl font-bold">Aufgabe löschen?</h2>
                <p className="text-c-subtle text-sm">"{task.title}"</p>
              </div>
              <button
                onClick={onClose}
                className="text-c-subtle hover:text-white p-2"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="p-6 space-y-4">
            {/* Time Entries Info */}
            {timeEntriesCount > 0 && (
              <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4">
                <div className="flex items-start space-x-3">
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-yellow-500 flex-shrink-0 mt-0.5">
                    <circle cx="12" cy="12" r="10"></circle>
                    <line x1="12" y1="8" x2="12" y2="12"></line>
                    <line x1="12" y1="16" x2="12.01" y2="16"></line>
                  </svg>
                  <div>
                    <p className="text-yellow-500 font-semibold text-sm">
                      {timeEntriesCount} Zeiteintrag{timeEntriesCount !== 1 ? 'e' : ''} vorhanden
                    </p>
                    <p className="text-c-subtle text-xs mt-1">
                      Insgesamt {totalHours.toFixed(2)} Stunden erfasst
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Options */}
            <div className="space-y-3">
              <label className="flex items-start space-x-3 p-3 rounded-lg border-2 border-c-highlight hover:border-red-500/50 cursor-pointer transition-colors">
                <input
                  type="radio"
                  name="deleteOption"
                  checked={deleteOption === 'delete'}
                  onChange={() => setDeleteOption('delete')}
                  className="mt-1"
                />
                <div className="flex-1">
                  <div className="text-white font-semibold">Zeiteinträge löschen</div>
                  <div className="text-c-subtle text-xs mt-1">
                    Alle {timeEntriesCount} Zeiteinträge werden unwiderruflich gelöscht
                  </div>
                </div>
              </label>

              {timeEntriesCount > 0 && (
                <label className="flex items-start space-x-3 p-3 rounded-lg border-2 border-c-highlight hover:border-c-blue cursor-pointer transition-colors">
                  <input
                    type="radio"
                    name="deleteOption"
                    checked={deleteOption === 'move'}
                    onChange={() => setDeleteOption('move')}
                    className="mt-1"
                  />
                  <div className="flex-1">
                    <div className="text-white font-semibold">Zeiteinträge verschieben</div>
                    <div className="text-c-subtle text-xs mt-1">
                      Zeiteinträge auf eine andere Aufgabe übertragen
                    </div>
                    
                    {deleteOption === 'move' && (
                      <select
                        value={selectedTaskId}
                        onChange={(e) => setSelectedTaskId(e.target.value)}
                        className="w-full mt-3 bg-c-bg text-white rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-c-blue text-sm"
                      >
                        <option value="">Aufgabe auswählen...</option>
                        {allTasks.map(t => (
                          <option key={t.id} value={t.id}>
                            {t.title}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>
                </label>
              )}
            </div>

            {/* Warning */}
            <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3">
              <p className="text-red-500 text-xs">
                ⚠️ Diese Aktion kann nicht rückgängig gemacht werden!
              </p>
            </div>
          </div>

          {/* Footer */}
          <div className="p-6 border-t border-c-highlight flex space-x-3">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2 bg-c-surface text-white rounded-lg hover:bg-c-highlight transition-colors"
            >
              Abbrechen
            </button>
            <button
              onClick={handleConfirm}
              disabled={deleteOption === 'move' && !selectedTaskId}
              className="flex-1 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-semibold"
            >
              Aufgabe löschen
            </button>
          </div>
        </div>
      </div>
    </>
  );
};
