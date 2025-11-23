import React, { useEffect, useMemo, useState } from 'react';
import { Project, TimeEntry, User, Anomaly, AnomalyType } from '../types';
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
  onEditEntry?: (entry: TimeEntry) => void;
  activeTimerTaskId?: string | null;
  projects?: Project[];
  anomalies?: Anomaly[];
}

export const TimeView: React.FC<TimeViewProps> = ({ project, timeEntries, currentUser, onUpdateEntry, onBillableChange, onStartTimer, onDeleteEntry, onDuplicateEntry, onEditEntry, activeTimerTaskId, projects = [], anomalies = [] }) => {
  const [editingEntryId, setEditingEntryId] = useState<string | null>(null);
  const [editStartTime, setEditStartTime] = useState('');
  const [editEndTime, setEditEndTime] = useState('');
  const [contextMenuEntryId, setContextMenuEntryId] = useState<string | null>(null);
  const [deleteConfirmEntryId, setDeleteConfirmEntryId] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  
  // Multi-Selection State
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedEntries, setSelectedEntries] = useState<Set<string>>(new Set());
  const [longPressTimer, setLongPressTimer] = useState<NodeJS.Timeout | null>(null);
  const [showBulkActionModal, setShowBulkActionModal] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStartId, setDragStartId] = useState<string | null>(null);
  const [showReassignModal, setShowReassignModal] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [selectedTaskId, setSelectedTaskId] = useState<string>('');
  const [projectSearchTerm, setProjectSearchTerm] = useState('');
  const [taskSearchTerm, setTaskSearchTerm] = useState('');
  const [showProjectList, setShowProjectList] = useState(false);
  const [showTaskList, setShowTaskList] = useState(false);

  // Reset Pagination wenn sich die Anzahl der Einträge ändert
  useEffect(() => {
    setPage(0);
  }, [timeEntries.length]);

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
    if (onEditEntry) {
      onEditEntry(entry);
      return;
    }
    setEditingEntryId(entry.id);
    setEditStartTime(entry.startTime);
    setEditEndTime(entry.endTime || new Date().toISOString());
  };

  const handleSave = (entryId: string) => {
    onUpdateEntry(entryId, editStartTime, editEndTime);
    setEditingEntryId(null);
  };

  // Multi-Selection Handlers
  const handleLongPressStart = (entryId: string) => {
    const timer = setTimeout(() => {
      setSelectionMode(true);
      setSelectedEntries(new Set([entryId]));
    }, 500); // 500ms long press
    setLongPressTimer(timer);
  };

  const handleLongPressEnd = () => {
    if (longPressTimer) {
      clearTimeout(longPressTimer);
      setLongPressTimer(null);
    }
  };

  const toggleEntrySelection = (entryId: string) => {
    if (!selectionMode) return;
    
    setSelectedEntries(prev => {
      const newSet = new Set(prev);
      if (newSet.has(entryId)) {
        newSet.delete(entryId);
      } else {
        newSet.add(entryId);
      }
      return newSet;
    });
  };

  const handleDragStart = (entryId: string) => {
    if (!selectionMode) return;
    setIsDragging(true);
    setDragStartId(entryId);
    // Toggle the start entry
    toggleEntrySelection(entryId);
  };

  const handleDragEnter = (entryId: string) => {
    if (!selectionMode || !isDragging || !dragStartId) return;
    
    // Get all entries in order
    const allEntries = pagedEntries.map(e => e.id);
    const startIndex = allEntries.indexOf(dragStartId);
    const currentIndex = allEntries.indexOf(entryId);
    
    if (startIndex === -1 || currentIndex === -1) return;
    
    // Select all entries between start and current
    const minIndex = Math.min(startIndex, currentIndex);
    const maxIndex = Math.max(startIndex, currentIndex);
    
    setSelectedEntries(prev => {
      const newSet = new Set(prev);
      for (let i = minIndex; i <= maxIndex; i++) {
        newSet.add(allEntries[i]);
      }
      return newSet;
    });
  };

  const handleDragEnd = () => {
    setIsDragging(false);
    setDragStartId(null);
  };

  const exitSelectionMode = () => {
    setSelectionMode(false);
    setSelectedEntries(new Set());
  };

  const handleBulkDelete = () => {
    if (onDeleteEntry) {
      selectedEntries.forEach(entryId => onDeleteEntry(entryId));
    }
    exitSelectionMode();
    setShowBulkActionModal(false);
  };

  const selectAll = () => {
    setSelectedEntries(new Set(pagedEntries.map(e => e.id)));
  };

  const deselectAll = () => {
    setSelectedEntries(new Set());
  };

  const handleBulkReassign = () => {
    if (!selectedProjectId || !selectedTaskId || !onUpdateEntry) return;
    
    // Update all selected entries
    selectedEntries.forEach(entryId => {
      const entry = timeEntries.find(e => e.id === entryId);
      if (entry) {
        onUpdateEntry(entryId, entry.startTime, entry.endTime || '', entry.note, selectedProjectId, selectedTaskId);
      }
    });
    
    exitSelectionMode();
    setShowReassignModal(false);
    setShowBulkActionModal(false);
    setSelectedProjectId('');
    setSelectedTaskId('');
    setProjectSearchTerm('');
    setTaskSearchTerm('');
  };

  // Get selected project name
  const selectedProjectName = useMemo(() => {
    if (!selectedProjectId) return '';
    const allProjects = projects.length > 0 ? projects : [project];
    const proj = allProjects.find(p => p.id === selectedProjectId);
    return proj?.name || '';
  }, [selectedProjectId, projects, project]);

  // Filtered projects based on search
  const filteredProjects = useMemo(() => {
    const allProjects = projects.length > 0 ? projects : [project];
    if (!projectSearchTerm) return allProjects;
    return allProjects.filter(p => 
      p.name.toLowerCase().includes(projectSearchTerm.toLowerCase())
    );
  }, [projects, project, projectSearchTerm]);

  // Get tasks from selected project
  const availableTasks = useMemo(() => {
    if (!selectedProjectId) return [];
    
    // Find the selected project from all projects
    const allProjects = projects.length > 0 ? projects : [project];
    const selectedProject = allProjects.find(p => p.id === selectedProjectId);
    if (!selectedProject) return [];
    
    const tasks: Array<{id: string, title: string, isSubtask: boolean}> = [];
    selectedProject.taskLists.forEach(list => {
      list.tasks.forEach(task => {
        tasks.push({ id: task.id, title: task.title, isSubtask: false });
        task.subtasks.forEach(subtask => {
          tasks.push({ id: subtask.id, title: `${task.title} > ${subtask.title}`, isSubtask: true });
        });
      });
    });
    
    if (!taskSearchTerm) return tasks;
    return tasks.filter(t => 
      t.title.toLowerCase().includes(taskSearchTerm.toLowerCase())
    );
  }, [selectedProjectId, projects, project, taskSearchTerm]);

  // Get selected task name
  const selectedTaskName = useMemo(() => {
    if (!selectedTaskId) return '';
    const task = availableTasks.find(t => t.id === selectedTaskId);
    return task?.title || '';
  }, [selectedTaskId, availableTasks]);

  const totalDuration = timeEntries.reduce((sum, entry) => sum + entry.duration, 0);

  // Check if user can edit time entries (only admins and producers)
  const canEditTimeEntries = currentUser && (currentUser.role === 'role-1' || currentUser.role === 'role-5');

  // Pagination Einstellungen
  const PAGE_SIZE = 50;

  // Einträge global nach Startzeit sortieren (neueste zuerst)
  const sortedEntries = useMemo(() => {
    return [...timeEntries].sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime());
  }, [timeEntries]);

  const totalEntries = sortedEntries.length;
  const totalPages = Math.max(1, Math.ceil(totalEntries / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages - 1);

  const pagedEntries = useMemo(() => {
    const startIndex = currentPage * PAGE_SIZE;
    const endIndex = startIndex + PAGE_SIZE;
    return sortedEntries.slice(startIndex, endIndex);
  }, [sortedEntries, currentPage]);

  const pageStartIndex = totalEntries === 0 ? 0 : currentPage * PAGE_SIZE + 1;
  const pageEndIndex = Math.min(totalEntries, (currentPage + 1) * PAGE_SIZE);

  // Group nur die Einträge der aktuellen Seite nach Datum
  const entriesByDate = pagedEntries.reduce((acc, entry) => {
    const date = new Date(entry.startTime).toLocaleDateString('de-DE');
    if (!acc[date]) acc[date] = [];
    acc[date].push(entry);
    return acc;
  }, {} as Record<string, TimeEntry[]>);

  // Sortiere Datum-Gruppen nach Datum (neueste zuerst)
  const sortedDateEntries = useMemo(() => {
    return Object.entries(entriesByDate).sort(([dateA], [dateB]) => {
      const [dayA, monthA, yearA] = dateA.split('.');
      const [dayB, monthB, yearB] = dateB.split('.');
      const timeA = new Date(parseInt(yearA), parseInt(monthA) - 1, parseInt(dayA)).getTime();
      const timeB = new Date(parseInt(yearB), parseInt(monthB) - 1, parseInt(dayB)).getTime();
      return timeB - timeA; // Neueste zuerst
    });
  }, [entriesByDate]);

  // Helper: Check if entry is part of a selection group
  const getSelectionGroupPosition = (entries: TimeEntry[], index: number): 'single' | 'first' | 'middle' | 'last' => {
    if (!selectionMode) return 'single';
    
    const entry = entries[index];
    const isSelected = selectedEntries.has(entry.id);
    if (!isSelected) return 'single';
    
    const prevSelected = index > 0 && selectedEntries.has(entries[index - 1].id);
    const nextSelected = index < entries.length - 1 && selectedEntries.has(entries[index + 1].id);
    
    if (!prevSelected && !nextSelected) return 'single';
    if (!prevSelected && nextSelected) return 'first';
    if (prevSelected && nextSelected) return 'middle';
    if (prevSelected && !nextSelected) return 'last';
    
    return 'single';
  };

  return (
    <div className="space-y-3">
      {/* Selection Mode Toolbar */}
      {selectionMode && (
        <div className="sticky top-0 z-10 bg-surface border border-border rounded-lg p-3 flex items-center justify-between shadow-lg">
          <div className="flex items-center space-x-3">
            <button
              onClick={exitSelectionMode}
              className="p-2 hover:bg-overlay rounded-lg transition-colors"
              title="Abbrechen"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
            <span className="text-text-primary font-semibold">
              {selectedEntries.size} {selectedEntries.size === 1 ? 'Eintrag' : 'Einträge'} ausgewählt
            </span>
          </div>
          
          <div className="flex items-center space-x-2">
            {selectedEntries.size < pagedEntries.length ? (
              <button
                onClick={selectAll}
                className="px-3 py-2 text-sm text-text-primary hover:bg-overlay rounded-lg transition-colors"
              >
                Alle auswählen
              </button>
            ) : (
              <button
                onClick={deselectAll}
                className="px-3 py-2 text-sm text-text-primary hover:bg-overlay rounded-lg transition-colors"
              >
                Alle abwählen
              </button>
            )}
            
            <button
              onClick={() => setShowBulkActionModal(true)}
              disabled={selectedEntries.size === 0}
              className="px-4 py-2 glow-button text-text-primary rounded-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Aktionen
            </button>
          </div>
        </div>
      )}
      
      {sortedDateEntries.map(([date, entries]: [string, TimeEntry[]]) => (
        <div key={date} className="space-y-1">
          <div className="px-1 text-xs font-semibold text-text-secondary mt-1">
            {date}
          </div>
          {entries
            .slice()
            .sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime())
            .map((entry, index) => {
              const sortedEntries = entries.slice().sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime());
              const groupPosition = getSelectionGroupPosition(sortedEntries, index);
              const isSelected = selectedEntries.has(entry.id);
              
              return (
            <div
              key={entry.id}
              onMouseDown={(e) => {
                if (selectionMode) {
                  handleDragStart(entry.id);
                } else {
                  handleLongPressStart(entry.id);
                }
              }}
              onMouseEnter={() => selectionMode && handleDragEnter(entry.id)}
              onMouseUp={() => {
                handleDragEnd();
                handleLongPressEnd();
              }}
              onMouseLeave={handleLongPressEnd}
              onTouchStart={(e) => {
                if (selectionMode) {
                  handleDragStart(entry.id);
                } else {
                  handleLongPressStart(entry.id);
                }
              }}
              onTouchMove={(e) => {
                if (!selectionMode || !isDragging) return;
                const touch = e.touches[0];
                const element = document.elementFromPoint(touch.clientX, touch.clientY);
                const entryElement = element?.closest('[data-entry-id]');
                if (entryElement) {
                  const entryId = entryElement.getAttribute('data-entry-id');
                  if (entryId) handleDragEnter(entryId);
                }
              }}
              onTouchEnd={() => {
                handleDragEnd();
                handleLongPressEnd();
              }}
              data-entry-id={entry.id}
              className={`p-3 sm:p-4 transition-all ${
                isSelected && selectionMode
                  ? `bg-glow-purple/10 border-2 border-glow-purple shadow-lg shadow-glow-purple/20 ${
                      groupPosition === 'single' ? 'rounded-lg my-1' :
                      groupPosition === 'first' ? 'rounded-t-lg border-b-0 mb-0' :
                      groupPosition === 'middle' ? 'rounded-none border-y-0 my-0' :
                      'rounded-b-lg border-t-0 mt-0 mb-1'
                    }`
                  : (() => {
                      // Prüfe ob dieser Eintrag eine FORGOT_TO_STOP Anomalie hat
                      const entryStartDate = new Date(entry.startTime).toISOString().split('T')[0];
                      const hasForgotToStopAnomaly = anomalies.some(a => 
                        a.type === AnomalyType.FORGOT_TO_STOP && 
                        a.userId === entry.user.id && 
                        a.date === entryStartDate
                      );
                      return hasForgotToStopAnomaly 
                        ? 'glow-card hover:bg-overlay rounded-lg border-2 border-red-500 shadow-lg shadow-red-500/20' 
                        : 'glow-card hover:bg-overlay rounded-lg';
                    })()
              }`}
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
                  onClick={(e) => {
                    if (!selectionMode && !isDragging) {
                      handleEditClick(entry);
                    }
                    e.stopPropagation();
                  }}
                  className={`cursor-pointer transition-all duration-200 ${selectionMode ? 'pl-2' : ''}`}
                >
                  {/* Mobile: Compact Layout */}
                  <div className="flex items-start justify-between gap-2 sm:hidden">
                    <div className="flex items-center space-x-2 flex-1 min-w-0">
                      {/* Checkbox im Selection Mode */}
                      {selectionMode && (
                        <div 
                          className="flex-shrink-0 w-5 h-5 rounded border-2 border-glow-purple flex items-center justify-center cursor-pointer"
                          style={{ backgroundColor: selectedEntries.has(entry.id) ? 'var(--glow-purple)' : 'transparent' }}
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleEntrySelection(entry.id);
                          }}
                        >
                          {selectedEntries.has(entry.id) && (
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                              <polyline points="20 6 9 17 4 12"></polyline>
                            </svg>
                          )}
                        </div>
                      )}
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
                            (!entry.endTime && activeTimerTaskId === entry.taskId) ? 'glow-button-highlight text-text-primary space-x-2' : 'glow-button-highlight-pink-v5 text-pink-500 space-x-0'
                          }`}
                        >
                          {(!entry.endTime && activeTimerTaskId === entry.taskId) ? (
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
                          ) : (
                            <>
                              <span className="group-hover:hidden">{formatDuration(entry.duration, false)}</span>
                              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="hidden group-hover:block">
                                <polygon points="5 3 19 12 5 21 5 3"></polygon>
                              </svg>
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
                    {/* Checkbox im Selection Mode */}
                    {selectionMode && (
                      <div 
                        className="flex-shrink-0 w-5 h-5 rounded border-2 border-glow-purple flex items-center justify-center cursor-pointer"
                        style={{ backgroundColor: selectedEntries.has(entry.id) ? 'var(--glow-purple)' : 'transparent' }}
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleEntrySelection(entry.id);
                        }}
                      >
                        {selectedEntries.has(entry.id) && (
                          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="20 6 9 17 4 12"></polyline>
                          </svg>
                        )}
                      </div>
                    )}
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
                        (!entry.endTime && activeTimerTaskId === entry.taskId) ? 'glow-button-highlight text-text-primary space-x-2' : 'glow-button-highlight-pink-v5 text-pink-500 space-x-0'
                      }`}
                    >
                      {(!entry.endTime && activeTimerTaskId === entry.taskId) ? (
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
                      ) : (
                        <>
                          <span className="group-hover:hidden">{formatDuration(entry.duration, false)}</span>
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="hidden group-hover:block">
                            <polygon points="5 3 19 12 5 21 5 3"></polygon>
                          </svg>
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
          );
        })}
        </div>
      ))}
      
      {/* Pagination */}
      {totalEntries > PAGE_SIZE && (
        <div className="flex items-center justify-between mt-4 text-xs text-text-secondary">
          <div>
            Einträge {pageStartIndex}
            {" "}-{" "}
            {pageEndIndex} von {totalEntries}
          </div>
          <div className="space-x-2">
            <button
              onClick={() => setPage(p => Math.max(0, p - 1))}
              disabled={currentPage === 0}
              className={`px-3 py-1 rounded border border-overlay ${
                currentPage === 0 ? 'opacity-50 cursor-not-allowed' : 'hover:bg-overlay'
              }`}
            >
              Zurück
            </button>
            <button
              onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
              disabled={currentPage >= totalPages - 1}
              className={`px-3 py-1 rounded border border-overlay ${
                currentPage >= totalPages - 1 ? 'opacity-50 cursor-not-allowed' : 'hover:bg-overlay'
              }`}
            >
              Weiter
            </button>
          </div>
        </div>
      )}
      
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
      
      {/* Bulk Action Modal */}
      {showBulkActionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowBulkActionModal(false)} />
          <div className="relative z-50 bg-surface border border-overlay rounded-xl p-6 w-full max-w-md shadow-2xl">
            <h3 className="text-text-primary font-bold text-lg mb-4">
              Aktionen für {selectedEntries.size} {selectedEntries.size === 1 ? 'Eintrag' : 'Einträge'}
            </h3>
            
            <div className="space-y-2 mb-6">
              <button
                onClick={() => {
                  setShowBulkActionModal(false);
                  setShowReassignModal(true);
                  setShowProjectList(true);
                  setShowTaskList(false);
                }}
                className="w-full px-4 py-3 text-left hover:bg-overlay rounded-lg flex items-center space-x-3 transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-glow-purple">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                  <polyline points="14 2 14 8 20 8"></polyline>
                  <line x1="12" y1="18" x2="12" y2="12"></line>
                  <line x1="9" y1="15" x2="15" y2="15"></line>
                </svg>
                <div>
                  <div className="text-text-primary font-semibold">Aufgabe zuordnen</div>
                  <div className="text-xs text-text-secondary">Alle Einträge einer neuen Aufgabe zuordnen</div>
                </div>
              </button>
              
              <button
                onClick={handleBulkDelete}
                className="w-full px-4 py-3 text-left hover:bg-overlay rounded-lg flex items-center space-x-3 transition-colors text-red-500"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="3 6 5 6 21 6"></polyline>
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                </svg>
                <div>
                  <div className="font-semibold">Alle löschen</div>
                  <div className="text-xs text-text-secondary">Ausgewählte Einträge unwiderruflich löschen</div>
                </div>
              </button>
            </div>
            
            <div className="flex justify-end">
              <button
                onClick={() => setShowBulkActionModal(false)}
                className="px-4 py-2 bg-overlay hover:bg-surface rounded-lg text-text-primary transition-colors"
              >
                Abbrechen
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Reassign Modal */}
      {showReassignModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowReassignModal(false)} />
          <div className="relative z-50 bg-surface border border-overlay rounded-xl p-6 w-full max-w-lg shadow-2xl max-h-[80vh] overflow-y-auto">
            <h3 className="text-text-primary font-bold text-lg mb-4">
              Aufgabe zuordnen für {selectedEntries.size} {selectedEntries.size === 1 ? 'Eintrag' : 'Einträge'}
            </h3>
            
            {/* Project Selection */}
            <div className="mb-4">
              <label className="block text-sm font-semibold text-text-primary mb-2">Projekt auswählen</label>
              <input
                type="text"
                placeholder="Projekt suchen..."
                value={showProjectList ? projectSearchTerm : selectedProjectName}
                onChange={(e) => setProjectSearchTerm(e.target.value)}
                onFocus={() => {
                  setShowProjectList(true);
                  setProjectSearchTerm('');
                }}
                className="w-full bg-background border border-overlay rounded-lg px-3 py-2 text-text-primary outline-none focus:ring-2 focus:ring-glow-purple mb-2"
              />
              {showProjectList && (
                <div className="max-h-40 overflow-y-auto space-y-1 border border-overlay rounded-lg">
                  {filteredProjects.map(proj => (
                    <div
                      key={proj.id}
                      onClick={() => {
                        setSelectedProjectId(proj.id);
                        setSelectedTaskId('');
                        setTaskSearchTerm('');
                        setShowProjectList(false);
                        setShowTaskList(false);
                      }}
                      className={`px-3 py-2 cursor-pointer transition-colors ${
                        selectedProjectId === proj.id
                          ? 'bg-glow-purple/20 text-glow-purple font-semibold'
                          : 'hover:bg-overlay text-text-primary'
                      }`}
                    >
                      {proj.name}
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            {/* Task Selection */}
            {selectedProjectId && (
              <div className="mb-6">
                <label className="block text-sm font-semibold text-text-primary mb-2">Aufgabe auswählen</label>
                <input
                  type="text"
                  placeholder="Aufgabe suchen..."
                  value={showTaskList ? taskSearchTerm : selectedTaskName}
                  onChange={(e) => setTaskSearchTerm(e.target.value)}
                  onFocus={() => {
                    setShowTaskList(true);
                    setTaskSearchTerm('');
                  }}
                  className="w-full bg-background border border-overlay rounded-lg px-3 py-2 text-text-primary outline-none focus:ring-2 focus:ring-glow-purple mb-2"
                />
                {showTaskList && (
                  <div className="max-h-60 overflow-y-auto space-y-1 border border-overlay rounded-lg">
                    {availableTasks.length > 0 ? (
                      availableTasks.map(task => (
                        <div
                          key={task.id}
                          onClick={() => {
                            setSelectedTaskId(task.id);
                            setShowTaskList(false);
                          }}
                          className={`px-3 py-2 cursor-pointer transition-colors ${
                            selectedTaskId === task.id
                              ? 'bg-glow-purple/20 text-glow-purple font-semibold'
                              : 'hover:bg-overlay text-text-primary'
                          } ${task.isSubtask ? 'pl-6 text-sm' : ''}`}
                        >
                          {task.title}
                        </div>
                      ))
                    ) : (
                      <div className="px-3 py-4 text-center text-text-secondary text-sm">
                        Keine Aufgaben gefunden
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
            
            {/* Actions */}
            <div className="flex justify-end space-x-2">
              <button
                onClick={() => {
                  setShowReassignModal(false);
                  setSelectedProjectId('');
                  setSelectedTaskId('');
                  setProjectSearchTerm('');
                  setTaskSearchTerm('');
                }}
                className="px-4 py-2 bg-overlay hover:bg-surface rounded-lg text-text-primary transition-colors"
              >
                Abbrechen
              </button>
              <button
                onClick={handleBulkReassign}
                disabled={!selectedProjectId || !selectedTaskId}
                className="px-4 py-2 glow-button text-text-primary rounded-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Zuordnen
              </button>
            </div>
          </div>
        </div>
      )}

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
