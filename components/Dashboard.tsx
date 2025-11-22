import React, { useState, useMemo } from 'react';
import { Project, TimeEntry, Task, Subtask, User } from '../types';
import { formatTime } from './utils';
import { TimerMenu } from './TimerMenu';
import { ConfirmModal } from './ConfirmModal';

interface DashboardProps {
  user: User;
  projects: Project[];
  timeEntries: TimeEntry[];
  pinnedTaskIds: string[];
  onUnpinTask: (taskId: string) => void;
  onUpdateNote: (note: string) => void;
  onToggleTimer: (taskId: string) => void;
  activeTimerTaskId: string | null;
  taskTimers: { [taskId: string]: number };
  onUpdateTimeEntry?: (entryId: string, startTime: string, endTime: string) => void;
  onBillableChange?: (taskId: string, billable: boolean) => void;
  onDeleteTimeEntry?: (entryId: string) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({
  user,
  projects,
  timeEntries,
  pinnedTaskIds,
  onUnpinTask,
  onUpdateNote,
  onToggleTimer,
  activeTimerTaskId,
  taskTimers,
  onUpdateTimeEntry,
  onBillableChange,
  onDeleteTimeEntry
}) => {
  const [note, setNote] = useState(user.dashboardNote || '');
  const [selectedTimeEntry, setSelectedTimeEntry] = useState<TimeEntry | null>(null);
  const [selectedAnchorRect, setSelectedAnchorRect] = useState<{top:number;right:number;bottom:number;left:number} | null>(null);
  const [contextMenuEntry, setContextMenuEntry] = useState<TimeEntry | null>(null);
  const [contextMenuPosition, setContextMenuPosition] = useState<{x: number; y: number} | null>(null);
  const [deleteConfirmEntry, setDeleteConfirmEntry] = useState<TimeEntry | null>(null);

  // PERFORMANCE: Erstelle Lookup-Map für billable Status (nur einmal pro projects-Änderung)
  const billableMap = useMemo(() => {
    const map = new Map<string, boolean>();
    projects.forEach(proj => {
      proj.taskLists.forEach(list => {
        list.tasks.forEach(task => {
          map.set(task.id, task.billable ?? true);
          task.subtasks.forEach(subtask => {
            map.set(subtask.id, subtask.billable ?? task.billable ?? true);
          });
        });
      });
    });
    return map;
  }, [projects]);

  // PERFORMANCE: Erstelle Lookup-Map für Projects (nur einmal pro projects-Änderung)
  const projectMap = useMemo(() => {
    const map = new Map<string, Project>();
    projects.forEach(p => map.set(p.id, p));
    return map;
  }, [projects]);

  // Finde alle gepinnten Tasks
  const pinnedTasks: (Task | Subtask)[] = [];
  projects.forEach(project => {
    project.taskLists.forEach(list => {
      list.tasks.forEach(task => {
        if (pinnedTaskIds.includes(task.id)) {
          pinnedTasks.push(task);
        }
        task.subtasks.forEach(subtask => {
          if (pinnedTaskIds.includes(subtask.id)) {
            pinnedTasks.push(subtask);
          }
        });
      });
    });
  });

  // Hole heute's TimeEntries - jeder User sieht nur seine eigenen
  const today = new Date().toLocaleDateString('de-DE');
  const todayEntries = timeEntries.filter(entry => 
    new Date(entry.startTime).toLocaleDateString('de-DE') === today &&
    entry.user.id === user.id
  ).sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime());

  // Gesamtzeit heute: abgeschlossene Einträge + laufender Timer in Echtzeit
  const baseSeconds = todayEntries.reduce((sum, entry) => {
    const isActive = activeTimerTaskId === entry.taskId && !entry.endTime;
    // Laufender Eintrag wird separat über taskTimers gezählt
    if (isActive) return sum;
    return sum + entry.duration;
  }, 0);

  const activeTodayEntry = todayEntries.find(entry => activeTimerTaskId === entry.taskId && !entry.endTime);
  const activeTodaySeconds = activeTodayEntry ? (taskTimers[activeTodayEntry.taskId] || 0) : 0;

  const totalTodaySeconds = baseSeconds + activeTodaySeconds;

  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}:${minutes.toString().padStart(2, '0')}`;
  };

  const renderProjectAvatar = (project: Project | undefined, sizeClasses: string, textSize: string = '') => {
    const icon = project?.icon;
    const isHex = typeof icon === 'string' && /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/.test(icon);
    return (
      <span
        className={`rounded-full flex items-center justify-center flex-shrink-0 ${sizeClasses} ${textSize}`}
        style={isHex ? { backgroundColor: icon as string } : undefined}
      >
        {!isHex ? (icon || '📋') : null}
      </span>
    );
  };

  return (
    <div className="w-full max-w-7xl mx-auto p-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Linke Spalte: Zeiterfassung */}
        <div className="space-y-6 order-2 md:order-1" data-testid="dashboard-left-column">
          {/* Meine Zeiterfassung */}
          <div className="glow-card rounded-xl p-6" data-testid="my-time-tracking">
            <h2 className="glow-text text-xl font-bold mb-6">Meine Zeiterfassung</h2>
            
            {/* Kreis mit Zeit */}
            <div className="flex justify-center mb-8">
              <div className="relative w-48 h-48">
                <svg className="w-full h-full transform -rotate-90">
                  <defs>
                    <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" style={{stopColor: '#00FFFF', stopOpacity: 1}} />
                      <stop offset="100%" style={{stopColor: '#FF00FF', stopOpacity: 1}} />
                    </linearGradient>
                  </defs>
                  <circle
                    cx="96"
                    cy="96"
                    r="88"
                    stroke="#1A1A1A"
                    strokeWidth="16"
                    fill="none"
                  />
                  <circle
                    cx="96"
                    cy="96"
                    r="88"
                    stroke="url(#gradient)"
                    strokeWidth="16"
                    fill="none"
                    strokeDasharray={`${(totalTodaySeconds / 28800) * 552} 552`}
                    strokeLinecap="round"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <div className="text-text-primary text-4xl font-bold">{formatDuration(totalTodaySeconds)}</div>
                  <div className="text-text-secondary text-sm">{today}</div>
                </div>
              </div>
            </div>

            {/* Heute's Einträge - Max 5 sichtbar, Rest scrollbar */}
            <div className="space-y-2 max-h-[500px] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-overlay scrollbar-track-transparent" data-testid="today-entries">
              {todayEntries.map(entry => {
                const isActive = activeTimerTaskId === entry.taskId && !entry.endTime;
                const currentSeconds = taskTimers[entry.taskId] || 0;
                const project = projectMap.get(entry.projectId);
                
                // PERFORMANCE: O(1) Lookup statt nested loops
                const isBillable = billableMap.get(entry.taskId) ?? true;
                
                return (
                  <div
                    key={entry.id}
                    className="glow-card rounded-lg p-3 sm:p-4 hover:bg-overlay transition-colors"
                  >
                    <div 
                      className="cursor-pointer"
                      onClick={(e) => {
                        setSelectedAnchorRect(null);
                        setSelectedTimeEntry(entry);
                      }}
                    >
                      {/* Mobile Layout */}
                      <div className="flex items-start justify-between gap-2 sm:hidden">
                        <div className="flex items-center space-x-2 flex-1 min-w-0">
                          {renderProjectAvatar(project, 'w-7 h-7', 'text-lg')}
                          <div className="flex-1 min-w-0">
                            <div className="text-xs text-text-secondary truncate leading-tight">{entry.projectName}</div>
                            <div className="text-text-primary font-semibold truncate text-sm leading-tight">{entry.taskTitle}</div>
                          </div>
                        </div>
                        
                        <div className="flex items-center space-x-1.5 flex-shrink-0">
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
                          
                          <div 
                            onClick={(e) => {
                              e.stopPropagation();
                              onToggleTimer(entry.taskId);
                            }}
                            className={`px-2 py-1 rounded-md font-bold text-xs cursor-pointer group flex items-center justify-center min-w-[50px] ${
                              isActive ? 'glow-button-highlight text-text-primary space-x-2' : 'glow-button-highlight-pink-v5 text-pink-500 space-x-0'
                            }`}
                          >
                            {isActive ? (
                              <>
                                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 group-hover:hidden">
                                  <circle cx="12" cy="12" r="10"></circle>
                                  <polyline points="12 6 12 12 16 14"></polyline>
                                </svg>
                                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 hidden group-hover:block">
                                  <rect x="6" y="4" width="4" height="16"></rect>
                                  <rect x="14" y="4" width="4" height="16"></rect>
                                </svg>
                                <span>{formatDuration(currentSeconds)}</span>
                              </>
                            ) : (
                              <>
                                <span className="group-hover:hidden">{formatDuration(entry.duration)}</span>
                                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="hidden group-hover:block">
                                  <polygon points="5 3 19 12 5 21 5 3"></polygon>
                                </svg>
                              </>
                            )}
                          </div>
                          
                          <div className="relative">
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                                setContextMenuEntry(entry);
                                setContextMenuPosition({ x: rect.left, y: rect.bottom + 5 });
                              }}
                              className="text-text-secondary hover:text-text-primary"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <circle cx="12" cy="12" r="1"></circle>
                                <circle cx="12" cy="5" r="1"></circle>
                                <circle cx="12" cy="19" r="1"></circle>
                              </svg>
                            </button>
                          </div>
                        </div>
                      </div>
                      
                      {/* Desktop Layout */}
                      <div className="hidden sm:flex items-center space-x-3">
                        {renderProjectAvatar(project, 'w-8 h-8', 'text-xl')}
                        
                        <div className="flex-1 min-w-0">
                          <div className="text-xs text-text-secondary truncate leading-tight mb-0.5">{entry.projectName}</div>
                          <div className="text-text-primary font-semibold truncate leading-tight">{entry.taskTitle}</div>
                        </div>
                        
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
                        
                        <div 
                          onClick={(e) => {
                            e.stopPropagation();
                            onToggleTimer(entry.taskId);
                          }}
                          className={`px-2 py-1 rounded-md font-bold text-sm cursor-pointer group flex items-center justify-center min-w-[70px] ${
                            isActive ? 'glow-button-highlight text-text-primary space-x-2' : 'glow-button-highlight-pink-v5 text-pink-500 space-x-0'
                          }`}
                        >
                          {isActive ? (
                            <>
                              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 group-hover:hidden">
                                <circle cx="12" cy="12" r="10"></circle>
                                <polyline points="12 6 12 12 16 14"></polyline>
                              </svg>
                              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 hidden group-hover:block">
                                <rect x="6" y="4" width="4" height="16"></rect>
                                <rect x="14" y="4" width="4" height="16"></rect>
                              </svg>
                              <span>{formatDuration(currentSeconds)}</span>
                            </>
                          ) : (
                            <>
                              <span className="group-hover:hidden">{formatDuration(entry.duration)}</span>
                              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="hidden group-hover:block">
                                <polygon points="5 3 19 12 5 21 5 3"></polygon>
                              </svg>
                            </>
                          )}
                        </div>
                        
                        <div className="relative">
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                              setContextMenuEntry(entry);
                              setContextMenuPosition({ x: rect.left, y: rect.bottom + 5 });
                            }}
                            className="text-text-secondary hover:text-text-primary"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <circle cx="12" cy="12" r="1"></circle>
                              <circle cx="12" cy="5" r="1"></circle>
                              <circle cx="12" cy="19" r="1"></circle>
                            </svg>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
              {todayEntries.length === 0 && (
                <div className="text-center text-text-secondary py-8">
                  Noch keine Zeiteinträge heute
                </div>
              )}
            </div>
          </div>

          {/* Notizen */}
          <div className="glow-card rounded-xl p-6" data-testid="notes-section">
            <h3 className="glow-text text-lg font-bold mb-4">Heute (manuell)</h3>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              onBlur={() => onUpdateNote(note)}
              placeholder="Notizen für heute..."
              className="w-full glow-input text-text-primary placeholder-text-secondary/50 rounded-lg p-4 resize-none"
              rows={6}
              data-testid="dashboard-notes"
            />
          </div>
        </div>

        {/* Rechte Spalte: Täglich */}
        <div className="glow-card rounded-xl p-6 order-1 md:order-2" data-testid="shortcuts-section">
          <div className="flex items-center justify-between mb-6">
            <h2 className="glow-text text-xl font-bold">Shortcuts</h2>
            <div className="flex items-center space-x-2">
              <button className="p-2 hover-glow rounded-lg">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-text-secondary">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                </svg>
              </button>
              <button className="p-2 hover-glow rounded-lg">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-text-secondary">
                  <line x1="4" y1="21" x2="4" y2="14"></line>
                  <line x1="4" y1="10" x2="4" y2="3"></line>
                  <line x1="12" y1="21" x2="12" y2="12"></line>
                  <line x1="12" y1="8" x2="12" y2="3"></line>
                  <line x1="20" y1="21" x2="20" y2="16"></line>
                  <line x1="20" y1="12" x2="20" y2="3"></line>
                  <line x1="1" y1="14" x2="7" y2="14"></line>
                  <line x1="9" y1="8" x2="15" y2="8"></line>
                  <line x1="17" y1="16" x2="23" y2="16"></line>
                </svg>
              </button>
              <button className="p-2 hover-glow rounded-lg">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-text-secondary">
                  <line x1="8" y1="6" x2="21" y2="6"></line>
                  <line x1="8" y1="12" x2="21" y2="12"></line>
                  <line x1="8" y1="18" x2="21" y2="18"></line>
                  <line x1="3" y1="6" x2="3.01" y2="6"></line>
                  <line x1="3" y1="12" x2="3.01" y2="12"></line>
                  <line x1="3" y1="18" x2="3.01" y2="18"></line>
                </svg>
              </button>
            </div>
          </div>

          {/* Shortcuts */}
          <div className="mb-6" data-testid="shortcuts-list">
            <div className="space-y-2">
              {pinnedTasks.map(task => {
                const isActive = activeTimerTaskId === task.id;
                const elapsedSeconds = taskTimers[task.id] || 0;
                
                // Finde Projekt und Liste für diese Aufgabe
                let projectName = '';
                let listTitle = '';
                projects.forEach(p => {
                  p.taskLists.forEach(list => {
                    list.tasks.forEach(t => {
                      if (t.id === task.id) {
                        projectName = p.name;
                        listTitle = list.title;
                      }
                      t.subtasks.forEach(st => {
                        if (st.id === task.id) {
                          projectName = p.name;
                          listTitle = list.title;
                        }
                      });
                    });
                  });
                });
                
                // Finde Projekt-Icon
                const project = projects.find(p => p.id === task.id || 
                  p.taskLists.some(list => 
                    list.tasks.some(t => t.id === task.id || t.subtasks.some(st => st.id === task.id))
                  )
                );
                
                return (
                  <div 
                    key={task.id} 
                    className="relative flex items-center space-x-3 p-3 bg-background rounded-lg hover-glow group"
                    title={listTitle}
                    data-testid={`shortcut-task-${task.id}`}
                  >
                    {renderProjectAvatar(project, 'w-8 h-8', 'text-xl')}
                    <div className="flex-1 min-w-0">
                      <div className="text-text-primary font-semibold truncate">{task.title}</div>
                      <div className="text-text-secondary text-xs truncate">{projectName}</div>
                    </div>
                    
                    {/* Timer Info */}
                    {elapsedSeconds > 0 && (
                      <div className="flex items-center space-x-2 text-xs text-text-secondary">
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <circle cx="12" cy="12" r="10"></circle>
                          <polyline points="12 6 12 12 16 14"></polyline>
                        </svg>
                        <span>{formatTime(elapsedSeconds)}</span>
                      </div>
                    )}
                    
                    {/* Actions */}
                    <div className="flex items-center space-x-1">
                      <button
                        onClick={() => onToggleTimer(task.id)}
                        className={`p-1.5 rounded ${isActive ? 'glow-button text-text-primary' : 'hover-glow text-text-primary'}`}
                      >
                        {isActive ? (
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <rect x="6" y="4" width="4" height="16"></rect>
                            <rect x="14" y="4" width="4" height="16"></rect>
                          </svg>
                        ) : (
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <polygon points="5 3 19 12 5 21 5 3"></polygon>
                          </svg>
                        )}
                      </button>
                      <button
                        onClick={() => onUnpinTask(task.id)}
                        className="p-1.5 hover:glow-card rounded text-text-secondary opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <line x1="18" y1="6" x2="6" y2="18"></line>
                          <line x1="6" y1="6" x2="18" y2="18"></line>
                        </svg>
                      </button>
                    </div>
                  </div>
                );
              })}
              {pinnedTasks.length === 0 && (
                <div className="text-center text-text-secondary py-8">
                  Keine gepinnten Aufgaben
                  <div className="text-xs mt-2">Rechtsklick auf Aufgabe → "Zum Dashboard hinzufügen"</div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      
      {/* TimerMenu für Zeiteintrag-Bearbeitung */}
      {selectedTimeEntry && (
        <TimerMenu
          timeEntry={selectedTimeEntry}
          elapsedSeconds={selectedTimeEntry.duration}
          onClose={() => { setSelectedTimeEntry(null); setSelectedAnchorRect(null); }}
          onUpdate={onUpdateTimeEntry || (() => {})}
          onStop={() => {
            setSelectedTimeEntry(null); setSelectedAnchorRect(null);
          }}
          anchorRect={selectedAnchorRect}
        />
      )}

      {/* Kontext-Menü für Zeiteinträge */}
      {contextMenuEntry && contextMenuPosition && (
        <>
          <div 
            className="fixed inset-0 z-40"
            onClick={() => {
              setContextMenuEntry(null);
              setContextMenuPosition(null);
            }}
          />
          <div
            className="fixed z-50 bg-surface border border-border rounded-lg shadow-xl py-1 min-w-[160px]"
            style={{
              left: `${contextMenuPosition.x}px`,
              top: `${contextMenuPosition.y}px`,
            }}
          >
            <button
              onClick={() => {
                setDeleteConfirmEntry(contextMenuEntry);
                setContextMenuEntry(null);
                setContextMenuPosition(null);
              }}
              className="w-full px-4 py-2 text-left text-sm text-red-500 hover:bg-overlay transition-colors flex items-center space-x-2"
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

      {/* Lösch-Bestätigungs-Modal */}
      <ConfirmModal
        isOpen={!!deleteConfirmEntry}
        title="Zeiteintrag löschen"
        message="Möchtest du diesen Zeiteintrag wirklich löschen? Diese Aktion kann nicht rückgängig gemacht werden."
        confirmText="Löschen"
        cancelText="Abbrechen"
        isDangerous={true}
        onConfirm={() => {
          if (deleteConfirmEntry && onDeleteTimeEntry) {
            onDeleteTimeEntry(deleteConfirmEntry.id);
          }
          setDeleteConfirmEntry(null);
        }}
        onCancel={() => setDeleteConfirmEntry(null)}
      />
    </div>
  );
};
