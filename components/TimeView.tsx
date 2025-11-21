import React, { useMemo, useState } from 'react';
import { Project, TimeEntry, User } from '../types';
import { formatTime } from './utils';

interface TimeViewProps {
  project: Project;
  timeEntries: TimeEntry[];
  currentUser?: User;
  onUpdateEntry: (entryId: string, startTime: string, endTime: string) => void;
  onBillableChange: (taskId: string, billable: boolean) => void;
  onStartTimer?: (taskId: string) => void;
  onDeleteEntry?: (entryId: string) => void;
  onDuplicateEntry?: (entry: TimeEntry) => void;
}

export const TimeView: React.FC<TimeViewProps> = ({ project, timeEntries, currentUser, onUpdateEntry, onBillableChange, onStartTimer, onDeleteEntry, onDuplicateEntry }) => {
  const [editingEntryId, setEditingEntryId] = useState<string | null>(null);
  const [editStartTime, setEditStartTime] = useState('');
  const [editEndTime, setEditEndTime] = useState('');
  const [contextMenuEntryId, setContextMenuEntryId] = useState<string | null>(null);
  const [deleteConfirmEntryId, setDeleteConfirmEntryId] = useState<string | null>(null);

  // Build a lookup for billable by taskId from current project tasks/subtasks
  const billableByTaskId = useMemo(() => {
    const map = new Map<string, boolean>();
    project.taskLists.forEach(list => {
      list.tasks.forEach(t => {
        map.set(t.id, t.billable ?? true);
        t.subtasks.forEach(st => map.set(st.id, st.billable ?? t.billable ?? true));
      });
    });
    return map;
  }, [project]);

  const formatDateTime = (isoString: string) => {
    const date = new Date(isoString);
    return date.toLocaleString('de-DE', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatTimeRange = (start: string, end: string | null) => {
    const startDate = new Date(start);
    const startTime = startDate.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
    
    if (!end) return `${startTime} - läuft`;
    
    const endDate = new Date(end);
    const endTime = endDate.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
    
    return `${startTime} - ${endTime}`;
  };

  const formatDuration = (seconds: number, showSeconds: boolean = false) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (showSeconds) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${hours}:${minutes.toString().padStart(2, '0')}`;
  };

  const handleEditClick = (entry: TimeEntry) => {
    setEditingEntryId(entry.id);
    setEditStartTime(entry.startTime);
    setEditEndTime(entry.endTime || new Date().toISOString());
  };

  const handleSave = (entryId: string) => {
    onUpdateEntry(entryId, editStartTime, editEndTime);
    setEditingEntryId(null);
  };

  const totalDuration = timeEntries.reduce((sum, entry) => sum + entry.duration, 0);

  // Check if user can edit time entries (only admins and producers)
  const canEditTimeEntries = currentUser && (currentUser.role === 'role-1' || currentUser.role === 'role-5');

  // Group entries by date
  const entriesByDate = timeEntries.reduce((acc, entry) => {
    const date = new Date(entry.startTime).toLocaleDateString('de-DE');
    if (!acc[date]) acc[date] = [];
    acc[date].push(entry);
    return acc;
  }, {} as Record<string, TimeEntry[]>);

  return (
    <div className="space-y-2">
      {Object.entries(entriesByDate).reverse().map(([date, entries]: [string, TimeEntry[]]) => (
        <React.Fragment key={date}>
          {entries.sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime()).map((entry) => (
            <div
              key={entry.id}
              className="glow-card rounded-lg p-3 sm:p-4 hover:bg-overlay transition-colors"
            >
              {editingEntryId === entry.id ? (
                <div className="space-y-3">
                  <div className="flex items-center space-x-3">
                    <img
                      src={entry.user.avatarUrl}
                      alt={entry.user.name}
                      className="w-8 h-8 rounded-full"
                    />
                    <div className="flex-1">
                      <div className="text-text-primary font-semibold">{entry.taskTitle}</div>
                      <div className="text-xs text-text-secondary">{entry.projectName}</div>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-text-secondary block mb-1">Start</label>
                      <input
                        type="datetime-local"
                        value={new Date(editStartTime).toISOString().slice(0, 16)}
                        onChange={(e) => setEditStartTime(new Date(e.target.value).toISOString())}
                        className="w-full bg-background border border-overlay rounded px-2 py-1 text-xs text-text-primary outline-none focus:ring-1 focus:ring-glow-purple"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-text-secondary block mb-1">Ende</label>
                      <input
                        type="datetime-local"
                        value={new Date(editEndTime).toISOString().slice(0, 16)}
                        onChange={(e) => setEditEndTime(new Date(e.target.value).toISOString())}
                        className="w-full bg-background border border-overlay rounded px-2 py-1 text-xs text-text-primary outline-none focus:ring-1 focus:ring-glow-purple"
                      />
                    </div>
                  </div>
                  
                  <div className="flex space-x-2">
                    <button
                      onClick={() => handleSave(entry.id)}
                      className="px-3 py-1 glow-button text-text-primary text-xs rounded hover:opacity-80"
                    >
                      Speichern
                    </button>
                    <button
                      onClick={() => setEditingEntryId(null)}
                      className="px-3 py-1 bg-overlay text-text-primary text-xs rounded hover:bg-surface"
                    >
                      Abbrechen
                    </button>
                  </div>
                </div>
              ) : (
                <div
                  onClick={() => handleEditClick(entry)}
                  className="cursor-pointer"
                >
                  {/* Mobile: Compact Layout */}
                  <div className="flex items-start justify-between gap-2 sm:hidden">
                    <div className="flex items-center space-x-2 flex-1 min-w-0">
                      <img
                        src={entry.user.avatarUrl}
                        alt={entry.user.name}
                        className="w-7 h-7 rounded-full flex-shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="text-xs text-text-secondary truncate leading-tight">{entry.projectName}</div>
                        <div className="text-text-primary font-semibold truncate text-sm leading-tight">
                          {entry.taskTitle}
                          {entry.note && <span className="text-text-secondary font-normal"> ({entry.note})</span>}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex flex-col items-end space-y-1 flex-shrink-0">
                      <div className="flex items-center space-x-1.5">
                        <div 
                          onClick={(e) => {
                            e.stopPropagation();
                            if (onStartTimer) onStartTimer(entry.taskId);
                          }}
                          className={`px-2 py-1 rounded-md font-bold text-xs cursor-pointer group flex items-center justify-center min-w-[50px] ${
                            entry.endTime ? 'glow-button-highlight-pink-v5 text-pink-500 space-x-0' : 'glow-button-highlight text-text-primary space-x-2'
                          }`}
                        >
                          {entry.endTime ? (
                            <>
                              <span className="group-hover:hidden">{formatDuration(entry.duration, false)}</span>
                              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="hidden group-hover:block">
                                <polygon points="5 3 19 12 5 21 5 3"></polygon>
                              </svg>
                            </>
                          ) : (
                            <>
                              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 group-hover:hidden">
                                <circle cx="12" cy="12" r="10"></circle>
                                <polyline points="12 6 12 12 16 14"></polyline>
                              </svg>
                              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 hidden group-hover:block">
                                <rect x="6" y="4" width="4" height="16"></rect>
                                <rect x="14" y="4" width="4" height="16"></rect>
                              </svg>
                              <span>{formatDuration(entry.duration, true)}</span>
                            </>
                          )}
                        </div>
                        
                        {(() => {
                          const isBillable = billableByTaskId.get(entry.taskId) ?? (entry as any).billable ?? true;
                          return (
                            <div
                              className={`p-1 rounded ${
                                isBillable ? 'glow-button-highlight-green-v5 text-green-500' : 'glow-button-highlight-red-v5 text-red-500'
                              }`}
                              title={isBillable ? 'Abrechenbar' : 'Nicht abrechenbar'}
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                {isBillable ? (
                                  <>
                                    <line x1="12" y1="19" x2="12" y2="5"></line>
                                    <polyline points="5 12 12 5 19 12"></polyline>
                                  </>
                                ) : (
                                  <>
                                    <line x1="12" y1="5" x2="12" y2="19"></line>
                                    <polyline points="19 12 12 19 5 12"></polyline>
                                  </>
                                )}
                              </svg>
                            </div>
                          );
                        })()}
                      </div>
                      
                      <div className="flex items-center space-x-1 text-text-secondary text-xs">
                        <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0">
                          <circle cx="12" cy="12" r="10"></circle>
                          <polyline points="12 6 12 12 16 14"></polyline>
                        </svg>
                        <span>{formatTimeRange(entry.startTime, entry.endTime)}</span>
                      </div>
                    </div>
                  </div>
                  
                  {/* Tablet/Desktop: Horizontal Layout */}
                  <div className="hidden sm:flex items-center space-x-3">
                    <img
                      src={entry.user.avatarUrl}
                      alt={entry.user.name}
                      className="w-8 h-8 rounded-full"
                    />
                    
                    <div className="flex-1 min-w-0">
                      <div className="text-xs text-text-secondary truncate leading-tight mb-0.5">{entry.projectName}</div>
                      <div className="text-text-primary font-semibold truncate leading-tight">
                        {entry.taskTitle}
                        {entry.note && <span className="text-text-secondary font-normal"> ({entry.note})</span>}
                      </div>
                    </div>
                    
                    {(() => {
                      const isBillable = billableByTaskId.get(entry.taskId) ?? (entry as any).billable ?? true;
                      return (
                        <div
                          className={`flex items-center space-x-2 px-3 py-1 rounded text-xs font-bold ${
                            isBillable ? 'glow-button-highlight-green-v5 text-green-500' : 'glow-button-highlight-red-v5 text-red-500'
                          }`}
                          title={isBillable ? 'Abrechenbar' : 'Nicht abrechenbar'}
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            {isBillable ? (
                              <>
                                <line x1="12" y1="19" x2="12" y2="5"></line>
                                <polyline points="5 12 12 5 19 12"></polyline>
                              </>
                            ) : (
                              <>
                                <line x1="12" y1="5" x2="12" y2="19"></line>
                                <polyline points="19 12 12 19 5 12"></polyline>
                              </>
                            )}
                          </svg>
                          <span>{isBillable ? 'Abrechenbar' : 'Nicht abrechenbar'}</span>
                        </div>
                      );
                    })()}
                    
                    <div className="flex items-center space-x-2 text-xs text-text-secondary">
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="10"></circle>
                        <polyline points="12 6 12 12 16 14"></polyline>
                      </svg>
                      <span>{formatTimeRange(entry.startTime, entry.endTime)}</span>
                    </div>
                    
                    <div 
                      onClick={(e) => {
                        e.stopPropagation();
                        if (onStartTimer) onStartTimer(entry.taskId);
                      }}
                      className={`px-2 py-1 rounded-md font-bold text-sm cursor-pointer group flex items-center justify-center min-w-[70px] ${
                        entry.endTime ? 'glow-button-highlight-pink-v5 text-pink-500 space-x-0' : 'glow-button-highlight text-text-primary space-x-2'
                      }`}
                    >
                      {entry.endTime ? (
                        <>
                          <span className="group-hover:hidden">{formatDuration(entry.duration, false)}</span>
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="hidden group-hover:block">
                            <polygon points="5 3 19 12 5 21 5 3"></polygon>
                          </svg>
                        </>
                      ) : (
                        <>
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 group-hover:hidden">
                            <circle cx="12" cy="12" r="10"></circle>
                            <polyline points="12 6 12 12 16 14"></polyline>
                          </svg>
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 hidden group-hover:block">
                            <rect x="6" y="4" width="4" height="16"></rect>
                            <rect x="14" y="4" width="4" height="16"></rect>
                          </svg>
                          <span>{formatDuration(entry.duration, true)}</span>
                        </>
                      )}
                    </div>
                    
                    {canEditTimeEntries && (
                      <div className="relative">
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            setContextMenuEntryId(contextMenuEntryId === entry.id ? null : entry.id);
                          }}
                          className="text-text-secondary hover:text-text-primary"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="12" cy="12" r="1"></circle>
                            <circle cx="12" cy="5" r="1"></circle>
                            <circle cx="12" cy="19" r="1"></circle>
                          </svg>
                        </button>
                        
                        {contextMenuEntryId === entry.id && (
                        <>
                          <div 
                            className="fixed inset-0 z-40" 
                            onClick={() => setContextMenuEntryId(null)}
                          />
                          <div className="absolute right-0 top-8 z-50 bg-surface border border-overlay rounded-lg shadow-xl py-1 min-w-[150px]">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                if (onDuplicateEntry) {
                                  onDuplicateEntry(entry);
                                }
                                setContextMenuEntryId(null);
                              }}
                              className="w-full px-4 py-2 text-left text-text-primary hover:bg-overlay flex items-center space-x-2 text-sm"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                              </svg>
                              <span>Duplizieren</span>
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setDeleteConfirmEntryId(entry.id);
                                setContextMenuEntryId(null);
                              }}
                              className="w-full px-4 py-2 text-left text-red-500 hover:bg-overlay flex items-center space-x-2 text-sm"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="3 6 5 6 21 6"></polyline>
                                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                              </svg>
                              <span>Löschen</span>
                            </button>
                          </div>
                        </>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
        </React.Fragment>
      ))}
      
      {/* Delete confirmation modal */}
      {deleteConfirmEntryId && (() => {
        const entry = timeEntries.find(e => e.id === deleteConfirmEntryId);
        if (!entry) return null;
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="absolute inset-0 bg-black/50" onClick={() => setDeleteConfirmEntryId(null)} />
            <div className="relative z-50 bg-surface border border-overlay rounded-xl p-5 w-full max-w-sm shadow-2xl">
              <div className="text-text-primary font-bold mb-2">Zeiteintrag löschen?</div>
              <div className="text-text-secondary text-sm mb-4 space-y-1">
                <div className="font-semibold text-text-primary">{entry.taskTitle}</div>
                <div>{formatDuration(entry.duration, false)}</div>
                <div>{formatTimeRange(entry.startTime, entry.endTime)}</div>
              </div>
              <div className="flex justify-end space-x-2">
                <button
                  onClick={() => setDeleteConfirmEntryId(null)}
                  className="px-3 py-1 bg-overlay hover:bg-surface rounded text-text-primary text-sm"
                >
                  Abbrechen
                </button>
                <button
                  onClick={() => {
                    if (onDeleteEntry) onDeleteEntry(entry.id);
                    setDeleteConfirmEntryId(null);
                  }}
                  className="px-3 py-1 glow-button text-text-primary rounded text-sm"
                >
                  Löschen
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {timeEntries.length === 0 && (
        <div className="text-center py-12 text-text-secondary">
          <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mx-auto mb-4 opacity-50">
            <circle cx="12" cy="12" r="10"></circle>
            <polyline points="12 6 12 12 16 14"></polyline>
          </svg>
          <p>Noch keine Zeiteinträge erfasst</p>
        </div>
      )}
    </div>
  );
};
