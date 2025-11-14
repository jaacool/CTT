import React, { useMemo, useState } from 'react';
import { Project, TimeEntry } from '../types';
import { formatTime } from './utils';

interface TimeViewProps {
  project: Project;
  timeEntries: TimeEntry[];
  onUpdateEntry: (entryId: string, startTime: string, endTime: string) => void;
  onBillableChange: (taskId: string, billable: boolean) => void;
}

export const TimeView: React.FC<TimeViewProps> = ({ project, timeEntries, onUpdateEntry, onBillableChange }) => {
  const [editingEntryId, setEditingEntryId] = useState<string | null>(null);
  const [editStartTime, setEditStartTime] = useState('');
  const [editEndTime, setEditEndTime] = useState('');

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

  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
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

  // Group entries by date
  const entriesByDate = timeEntries.reduce((acc, entry) => {
    const date = new Date(entry.startTime).toLocaleDateString('de-DE');
    if (!acc[date]) acc[date] = [];
    acc[date].push(entry);
    return acc;
  }, {} as Record<string, TimeEntry[]>);

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold glow-text">Zeiterfassung</h2>
        <div className="text-text-secondary text-sm">
          Gesamt: <span className="text-text-primary font-bold">{formatTime(totalDuration)}</span>
        </div>
      </div>

      {Object.entries(entriesByDate).reverse().map(([date, entries]: [string, TimeEntry[]]) => (
        <div key={date} className="space-y-2">
          <div className="text-xs text-text-secondary font-bold uppercase px-2">{date}</div>
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
                        className="w-full bg-background border border-overlay rounded px-2 py-1 text-xs text-text-primary outline-none focus:ring-1 focus:ring-glow-cyan"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-text-secondary block mb-1">Ende</label>
                      <input
                        type="datetime-local"
                        value={new Date(editEndTime).toISOString().slice(0, 16)}
                        onChange={(e) => setEditEndTime(new Date(e.target.value).toISOString())}
                        className="w-full bg-background border border-overlay rounded px-2 py-1 text-xs text-text-primary outline-none focus:ring-1 focus:ring-glow-cyan"
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
                        <div className="text-text-primary font-semibold truncate text-sm leading-tight">{entry.taskTitle}</div>
                      </div>
                    </div>
                    
                    <div className="flex flex-col items-end space-y-1 flex-shrink-0">
                      <div className="flex items-center space-x-1.5">
                        <div className={`px-1.5 py-0.5 rounded font-bold text-xs ${
                          entry.endTime ? 'glow-button-highlight-pink-v6 text-pink-500' : 'glow-button-highlight-cyan-v6 text-cyan-500'
                        }`}>
                          {formatDuration(entry.duration)}
                        </div>
                        
                        {(() => {
                          const isBillable = billableByTaskId.get(entry.taskId) ?? (entry as any).billable ?? true;
                          return (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onBillableChange(entry.taskId, !isBillable);
                              }}
                              className={`p-1 rounded ${
                                isBillable ? 'glow-button-highlight-green-v6 text-green-500' : 'glow-button-highlight-red-v6 text-red-500'
                              } transition-all cursor-pointer`}
                              title={isBillable ? 'Als nicht abrechenbar markieren' : 'Als abrechenbar markieren'}
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
                            </button>
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
                      <div className="text-text-primary font-semibold truncate leading-tight">{entry.taskTitle}</div>
                    </div>
                    
                    {(() => {
                      const isBillable = billableByTaskId.get(entry.taskId) ?? (entry as any).billable ?? true;
                      return (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onBillableChange(entry.taskId, !isBillable);
                          }}
                          className={`flex items-center space-x-2 px-3 py-1 rounded text-xs font-bold ${
                            isBillable ? 'glow-button-highlight-green-v6 text-green-500' : 'glow-button-highlight-red-v6 text-red-500'
                          } transition-all cursor-pointer`}
                          title={isBillable ? 'Als nicht abrechenbar markieren' : 'Als abrechenbar markieren'}
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
                        </button>
                      );
                    })()}
                    
                    <div className="flex items-center space-x-2 text-xs text-text-secondary">
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="10"></circle>
                        <polyline points="12 6 12 12 16 14"></polyline>
                      </svg>
                      <span>{formatTimeRange(entry.startTime, entry.endTime)}</span>
                    </div>
                    
                    <div className={`px-3 py-1 rounded font-bold text-sm ${
                      entry.endTime ? 'glow-button-highlight-pink-v6 text-pink-500' : 'glow-button-highlight-cyan-v6 text-cyan-500'
                    }`}>
                      {formatDuration(entry.duration)}
                    </div>
                    
                    <button className="text-text-secondary hover:text-text-primary">
                      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="1"></circle>
                        <circle cx="12" cy="5" r="1"></circle>
                        <circle cx="12" cy="19" r="1"></circle>
                      </svg>
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      ))}
      
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
