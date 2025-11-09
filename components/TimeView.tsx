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
        <h2 className="text-xl font-bold text-white">Zeiterfassung</h2>
        <div className="text-c-subtle text-sm">
          Gesamt: <span className="text-white font-bold">{formatTime(totalDuration)}</span>
        </div>
      </div>

      {Object.entries(entriesByDate).reverse().map(([date, entries]: [string, TimeEntry[]]) => (
        <div key={date} className="space-y-2">
          <div className="text-xs text-c-subtle font-bold uppercase px-2">{date}</div>
          {entries.sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime()).map((entry) => (
            <div
              key={entry.id}
              className="bg-c-surface rounded-lg p-4 hover:bg-c-highlight transition-colors"
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
                      <div className="text-white font-semibold">{entry.taskTitle}</div>
                      <div className="text-xs text-c-subtle">{entry.projectName}</div>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-c-subtle block mb-1">Start</label>
                      <input
                        type="datetime-local"
                        value={new Date(editStartTime).toISOString().slice(0, 16)}
                        onChange={(e) => setEditStartTime(new Date(e.target.value).toISOString())}
                        className="w-full bg-c-bg border border-c-highlight rounded px-2 py-1 text-xs text-c-text outline-none focus:ring-1 focus:ring-c-blue"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-c-subtle block mb-1">Ende</label>
                      <input
                        type="datetime-local"
                        value={new Date(editEndTime).toISOString().slice(0, 16)}
                        onChange={(e) => setEditEndTime(new Date(e.target.value).toISOString())}
                        className="w-full bg-c-bg border border-c-highlight rounded px-2 py-1 text-xs text-c-text outline-none focus:ring-1 focus:ring-c-blue"
                      />
                    </div>
                  </div>
                  
                  <div className="flex space-x-2">
                    <button
                      onClick={() => handleSave(entry.id)}
                      className="px-3 py-1 bg-c-blue text-white text-xs rounded hover:bg-blue-600"
                    >
                      Speichern
                    </button>
                    <button
                      onClick={() => setEditingEntryId(null)}
                      className="px-3 py-1 bg-c-highlight text-c-text text-xs rounded hover:bg-c-overlay"
                    >
                      Abbrechen
                    </button>
                  </div>
                </div>
              ) : (
                <div
                  onClick={() => handleEditClick(entry)}
                  className="cursor-pointer flex items-center space-x-3"
                >
                  <img
                    src={entry.user.avatarUrl}
                    alt={entry.user.name}
                    className="w-8 h-8 rounded-full"
                  />
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2">
                      <span className="w-2 h-2 rounded-full bg-c-yellow"></span>
                      <span className="text-white font-semibold truncate">{entry.taskTitle}</span>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2 text-xs text-c-subtle">
                    <span className="truncate">{entry.projectName}</span>
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
                          isBillable ? 'bg-green-500/20 text-green-500' : 'bg-red-500/20 text-red-400'
                        } hover:opacity-90 transition-opacity cursor-pointer`}
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
                  
                  <div className="flex items-center space-x-2 text-xs text-c-subtle">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                      <line x1="16" y1="2" x2="16" y2="6"></line>
                      <line x1="8" y1="2" x2="8" y2="6"></line>
                      <line x1="3" y1="10" x2="21" y2="10"></line>
                    </svg>
                    <span>{formatDateTime(entry.startTime)}</span>
                  </div>
                  
                  <div className="flex items-center space-x-2 text-xs text-c-subtle">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10"></circle>
                      <polyline points="12 6 12 12 16 14"></polyline>
                    </svg>
                    <span>{formatTimeRange(entry.startTime, entry.endTime)}</span>
                  </div>
                  
                  <div className={`px-3 py-1 rounded font-bold text-sm ${
                    entry.endTime ? 'bg-c-magenta/20 text-c-magenta' : 'bg-c-blue/20 text-c-blue'
                  }`}>
                    {formatDuration(entry.duration)}
                  </div>
                  
                  <button className="text-c-subtle hover:text-c-text">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="1"></circle>
                      <circle cx="12" cy="5" r="1"></circle>
                      <circle cx="12" cy="19" r="1"></circle>
                    </svg>
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      ))}
      
      {timeEntries.length === 0 && (
        <div className="text-center py-12 text-c-subtle">
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
