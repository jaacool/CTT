import React, { useMemo, useState } from 'react';
import { TimeEntry, Project, Task, Subtask } from '../types';

interface TimerMenuProps {
  timeEntry: TimeEntry;
  elapsedSeconds: number;
  onClose: () => void;
  onUpdate: (entryId: string, startTime: string, endTime: string, note?: string, projectId?: string, taskId?: string) => void;
  onStop: () => void;
  anchorRect?: { top: number; right: number; bottom: number; left: number } | null;
  taskBillable?: boolean;
  onBillableChange?: (taskId: string, billable: boolean) => void;
  projects?: Project[];
  onProjectChange?: (projectId: string, taskId: string) => void;
  onNavigateToTask?: (projectId: string, taskId: string) => void;
  onDelete?: (entryId: string) => void;
}

export const TimerMenu: React.FC<TimerMenuProps> = ({ timeEntry, elapsedSeconds, onClose, onUpdate, onStop, anchorRect, taskBillable, onBillableChange, projects = [], onProjectChange, onNavigateToTask, onDelete }) => {
  const [note, setNote] = useState(timeEntry.note || '');
  const isBillable = taskBillable ?? timeEntry.billable ?? true;
  const [startTime, setStartTime] = useState(new Date(timeEntry.startTime).toTimeString().slice(0, 5));
  const [startDate, setStartDate] = useState(new Date(timeEntry.startTime).toISOString().split('T')[0]); // YYYY-MM-DD
  const originalStartTime = new Date(timeEntry.startTime).toTimeString().slice(0, 5);
  const originalStartDate = new Date(timeEntry.startTime).toISOString().split('T')[0];
  const [totalMinutes, setTotalMinutes] = useState(Math.floor(elapsedSeconds / 60));
  const [endTime, setEndTime] = useState(timeEntry.endTime ? new Date(timeEntry.endTime).toTimeString().slice(0, 5) : '');
  const [endDate, setEndDate] = useState(timeEntry.endTime ? new Date(timeEntry.endTime).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]);
  const [sliderMinutes, setSliderMinutes] = useState(0); // Slider für End Zeit (0-720 min = 0-12h)
  const isRunning = !timeEntry.endTime;
  
  // Dropdown States
  const [showProjectDropdown, setShowProjectDropdown] = useState(false);
  const [showTaskDropdown, setShowTaskDropdown] = useState(false);
  const [projectSearch, setProjectSearch] = useState('');
  const [taskSearch, setTaskSearch] = useState('');
  const [selectedProjectId, setSelectedProjectId] = useState(timeEntry.projectId);
  const [selectedTaskId, setSelectedTaskId] = useState(timeEntry.taskId);

  const inlineStyle = useMemo<React.CSSProperties | undefined>(() => {
    if (anchorRect === undefined) return undefined; // use default CSS positioning
    if (anchorRect === null) {
      // Center on screen
      return {
        position: 'fixed',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        width: 600,
        maxWidth: 'calc(100vw - 32px)',
        maxHeight: 'calc(100vh - 120px)',
        zIndex: 1000,
      } as React.CSSProperties;
    }
    // Position relative to anchor (above button, right-aligned)
    const right = Math.max(8, window.innerWidth - anchorRect.right);
    const bottom = Math.max(8, window.innerHeight - anchorRect.top + 8);
    return {
      position: 'fixed',
      right,
      bottom,
      width: 600,
      maxHeight: 'calc(100vh - 120px)',
      zIndex: 1000,
    } as React.CSSProperties;
  }, [anchorRect]);

  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${minutes.toString().padStart(2, '0')}m`;
  };

  const handleTotalTimeChange = (newTotalMinutes: number) => {
    setTotalMinutes(newTotalMinutes);
    
    // Berechne neue Startzeit basierend auf der Gesamtzeit
    const now = new Date();
    const newStartDate = new Date(now.getTime() - newTotalMinutes * 60 * 1000);
    const newStartTimeStr = newStartDate.toTimeString().slice(0, 5);
    setStartTime(newStartTimeStr);
  };

  const handleSliderChange = (minutes: number) => {
    setSliderMinutes(minutes);
    
    // Berechne End Zeit basierend auf Start Zeit + Slider Wert
    const [hours, mins] = startTime.split(':').map(Number);
    const startDateTime = new Date(startDate);
    startDateTime.setHours(hours, mins, 0, 0);
    
    const endDateTime = new Date(startDateTime.getTime() + minutes * 60 * 1000);
    
    // Setze End Zeit und Datum
    setEndTime(endDateTime.toTimeString().slice(0, 5));
    setEndDate(endDateTime.toISOString().split('T')[0]);
  };

  const handleFinish = () => {
    // Berechne neue Startzeit falls Zeit oder Datum geändert wurde
    if (startTime !== originalStartTime || startDate !== originalStartDate) {
      const [hours, minutes] = startTime.split(':').map(Number);
      const newStartDate = new Date(startDate);
      newStartDate.setHours(hours, minutes, 0, 0);
      
      // Update TimeEntry mit neuer Startzeit und Notiz (aber kein endTime - Timer läuft weiter)
      onUpdate(timeEntry.id, newStartDate.toISOString(), '', note);
    } else {
      // Nur Notiz aktualisieren
      onUpdate(timeEntry.id, timeEntry.startTime, timeEntry.endTime || '', note);
    }
    onClose();
  };

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/50 z-40"
        onClick={onClose}
      />
      
      {/* Menu */}
      <div
        className={"glow-card rounded-2xl shadow-2xl p-6 " + (!inlineStyle ? 'fixed bottom-24 right-8 w-[600px] max-h-[calc(100vh-120px)] overflow-y-auto z-[1000]' : '')}
        style={inlineStyle}
      >
        {/* Header mit Close Button */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-text-primary text-xl font-bold">Timer</h2>
          <button
            onClick={onClose}
            className="text-text-secondary hover:text-text-primary transition-colors p-1 rounded-lg hover:bg-overlay"
            title="Schließen ohne Speichern"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>
        
        {/* Projekt & Task Auswahl */}
        <div className="flex flex-wrap gap-2 mb-6">
          {/* Projekt Dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowProjectDropdown(!showProjectDropdown)}
              className="flex items-center space-x-2 bg-overlay px-4 py-2 rounded-lg hover:bg-surface transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-text-secondary">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                <line x1="16" y1="2" x2="16" y2="6"></line>
                <line x1="8" y1="2" x2="8" y2="6"></line>
                <line x1="3" y1="10" x2="21" y2="10"></line>
              </svg>
              <span className="text-text-secondary text-sm">{timeEntry.projectName}</span>
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-text-secondary">
                <polyline points="6 9 12 15 18 9"></polyline>
              </svg>
            </button>
            
            {showProjectDropdown && (
              <div className="absolute top-full left-0 mt-2 w-80 bg-surface border border-overlay rounded-lg shadow-2xl z-50 max-h-96 overflow-hidden flex flex-col">
                <div className="p-3 border-b border-overlay">
                  <div className="relative">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary">
                      <circle cx="11" cy="11" r="8"></circle>
                      <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                    </svg>
                    <input
                      type="text"
                      placeholder="Projekt suchen..."
                      value={projectSearch}
                      onChange={(e) => setProjectSearch(e.target.value)}
                      className="w-full bg-overlay text-text-primary placeholder-text-secondary/50 rounded-lg pl-10 pr-3 py-2 outline-none focus:ring-2 focus:ring-glow-purple text-sm"
                      autoFocus
                    />
                  </div>
                </div>
                <div className="overflow-y-auto flex-1">
                  {projects
                    .filter(p => p.name.toLowerCase().includes(projectSearch.toLowerCase()))
                    .map(project => (
                      <button
                        key={project.id}
                        onClick={() => {
                          setSelectedProjectId(project.id);
                          setShowProjectDropdown(false);
                          setProjectSearch('');
                          if (onProjectChange) {
                            // Wähle ersten Task des Projekts
                            const firstTask = project.taskLists[0]?.tasks[0];
                            if (firstTask) {
                              onProjectChange(project.id, firstTask.id);
                            }
                          }
                        }}
                        className={`w-full text-left px-4 py-3 hover:bg-overlay transition-colors ${
                          selectedProjectId === project.id ? 'bg-overlay' : ''
                        }`}
                      >
                        <div className="text-text-primary font-medium text-sm">{project.name}</div>
                        <div className="text-text-secondary text-xs mt-0.5">
                          {project.taskLists.reduce((sum, list) => sum + list.tasks.length, 0)} Aufgaben
                        </div>
                      </button>
                    ))}
                </div>
              </div>
            )}
          </div>
          
          {/* Task Dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowTaskDropdown(!showTaskDropdown)}
              className="flex items-center space-x-2 bg-overlay px-4 py-2 rounded-lg hover:bg-surface transition-colors"
            >
              <span className="text-xl">😊</span>
              <span className="text-text-primary text-sm font-semibold">{timeEntry.taskTitle}</span>
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-text-secondary">
                <polyline points="6 9 12 15 18 9"></polyline>
              </svg>
            </button>
            
            {showTaskDropdown && (() => {
              const currentProject = projects.find(p => p.id === selectedProjectId);
              if (!currentProject) return null;
              
              const allTasks: Array<{id: string; title: string; listTitle: string}> = [];
              currentProject.taskLists.forEach(list => {
                list.tasks.forEach(task => {
                  allTasks.push({ id: task.id, title: task.title, listTitle: list.title });
                  task.subtasks.forEach(subtask => {
                    allTasks.push({ id: subtask.id, title: `${task.title} → ${subtask.title}`, listTitle: list.title });
                  });
                });
              });
              
              const filteredTasks = allTasks.filter(t => 
                t.title.toLowerCase().includes(taskSearch.toLowerCase())
              );
              
              return (
                <div className="absolute top-full left-0 mt-2 w-96 bg-surface border border-overlay rounded-lg shadow-2xl z-50 max-h-96 overflow-hidden flex flex-col">
                  <div className="p-3 border-b border-overlay">
                    <div className="relative">
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary">
                        <circle cx="11" cy="11" r="8"></circle>
                        <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                      </svg>
                      <input
                        type="text"
                        placeholder="Aufgabe suchen..."
                        value={taskSearch}
                        onChange={(e) => setTaskSearch(e.target.value)}
                        className="w-full bg-overlay text-text-primary placeholder-text-secondary/50 rounded-lg pl-10 pr-3 py-2 outline-none focus:ring-2 focus:ring-glow-purple text-sm"
                        autoFocus
                      />
                    </div>
                  </div>
                  <div className="overflow-y-auto flex-1">
                    {filteredTasks.map(task => (
                      <button
                        key={task.id}
                        onClick={() => {
                          setSelectedTaskId(task.id);
                          setShowTaskDropdown(false);
                          setTaskSearch('');
                          if (onProjectChange) {
                            onProjectChange(selectedProjectId, task.id);
                          }
                        }}
                        className={`w-full text-left px-4 py-3 hover:bg-overlay transition-colors ${
                          selectedTaskId === task.id ? 'bg-overlay' : ''
                        }`}
                      >
                        <div className="text-text-primary font-medium text-sm">{task.title}</div>
                        <div className="text-text-secondary text-xs mt-0.5">{task.listTitle}</div>
                      </button>
                    ))}
                    {filteredTasks.length === 0 && (
                      <div className="px-4 py-8 text-center text-text-secondary text-sm">
                        Keine Aufgaben gefunden
                      </div>
                    )}
                  </div>
                </div>
              );
            })()}
          </div>
          
          {/* Navigate to Task Button */}
          {onNavigateToTask && (
            <button
              onClick={() => onNavigateToTask(timeEntry.projectId, timeEntry.taskId)}
              className="flex items-center space-x-2 bg-overlay px-4 py-2 rounded-lg hover:bg-surface transition-colors"
              title="Zur Aufgabe springen"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-text-secondary">
                <circle cx="12" cy="12" r="10"></circle>
                <polyline points="12 16 16 12 12 8"></polyline>
                <line x1="8" y1="12" x2="16" y2="12"></line>
              </svg>
              <span className="text-text-primary text-sm font-semibold">Anzeigen</span>
            </button>
          )}
          
          <div className="flex items-center space-x-2 bg-overlay px-4 py-2 rounded-lg">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-text-secondary">
              <circle cx="12" cy="12" r="10"></circle>
              <polyline points="12 6 12 12 16 14"></polyline>
            </svg>
            <span className="text-text-secondary text-sm">CREATIVE-DIRECTOR</span>
          </div>
          
          <button
            onClick={() => {
              if (onBillableChange) {
                onBillableChange(timeEntry.taskId, !isBillable);
              }
            }}
            className={`flex items-center space-x-2 px-3 py-1 rounded text-xs font-bold transition-all cursor-pointer ${
              isBillable ? 'glow-button-highlight-green-v5 text-green-500' : 'glow-button-highlight-red-v5 text-red-500'
            }`}
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
            <span className="flex-1 text-left">{isBillable ? 'Abrechenbar' : 'Nicht abrechenbar'}</span>
          </button>
        </div>
        
        {/* Note */}
        <div className="mb-4">
          <label className="text-text-secondary text-sm mb-2 block">Notiz</label>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Woran arbeitest du gerade?"
            className="w-full bg-overlay text-text-primary placeholder-text-secondary/50 rounded-xl px-4 py-2 outline-none focus:ring-2 focus:ring-glow-purple resize-none"
            rows={2}
          />
        </div>
        
        {/* Time Controls */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div>
            <label className="text-text-secondary text-sm mb-2 block">Timer Startzeit</label>
            <div className="flex items-center space-x-3 bg-overlay rounded-xl px-4 py-3 mb-2">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-text-secondary">
                <circle cx="12" cy="12" r="10"></circle>
                <polyline points="12 6 12 12 16 14"></polyline>
              </svg>
              <input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="bg-transparent text-text-primary text-lg font-bold outline-none flex-1"
              />
            </div>
            <div className="flex items-center space-x-3 bg-overlay rounded-xl px-4 py-3">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-text-secondary">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                <line x1="16" y1="2" x2="16" y2="6"></line>
                <line x1="8" y1="2" x2="8" y2="6"></line>
                <line x1="3" y1="10" x2="21" y2="10"></line>
              </svg>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="bg-transparent text-text-primary text-sm font-semibold outline-none flex-1"
              />
            </div>
          </div>
          
          <div>
            <label className="text-text-secondary text-sm mb-2 block">Gesamtzeit</label>
            <div className="flex items-center space-x-3 bg-overlay rounded-xl px-4 py-3 mb-2">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-text-secondary">
                <circle cx="12" cy="12" r="10"></circle>
                <polyline points="12 6 12 12 16 14"></polyline>
              </svg>
              <input
                type="number"
                value={totalMinutes}
                onChange={(e) => handleTotalTimeChange(parseInt(e.target.value) || 0)}
                className="bg-transparent text-text-primary text-lg font-bold outline-none flex-1 w-16"
                min="0"
              />
              <span className="text-text-secondary text-sm">min</span>
            </div>
            {/* Slider für End Zeit (0-12h in 5min Schritten) */}
            <div className="bg-overlay rounded-xl px-4 py-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-text-secondary text-xs">0h</span>
                <span className="text-text-primary text-xs font-semibold">
                  {Math.floor(sliderMinutes / 60)}h {sliderMinutes % 60}m
                </span>
                <span className="text-text-secondary text-xs">12h</span>
              </div>
              <input
                type="range"
                min="0"
                max="720"
                step="5"
                value={sliderMinutes}
                onChange={(e) => handleSliderChange(parseInt(e.target.value))}
                disabled={isRunning}
                className="w-full h-2 bg-surface rounded-lg appearance-none cursor-pointer accent-glow-purple disabled:opacity-50 disabled:cursor-not-allowed"
                style={{
                  background: isRunning ? undefined : `linear-gradient(to right, rgb(168, 85, 247) 0%, rgb(168, 85, 247) ${(sliderMinutes / 720) * 100}%, rgb(30, 30, 46) ${(sliderMinutes / 720) * 100}%, rgb(30, 30, 46) 100%)`
                }}
              />
            </div>
          </div>
          
          <div>
            <label className="text-text-secondary text-sm mb-2 block">End Zeit</label>
            <div className={`flex items-center space-x-3 rounded-xl px-4 py-3 mb-2 ${isRunning ? 'bg-overlay/50' : 'bg-overlay'}`}>
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-text-secondary">
                <circle cx="12" cy="12" r="10"></circle>
                <polyline points="12 6 12 12 16 14"></polyline>
              </svg>
              <input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                disabled={isRunning}
                className={`bg-transparent text-lg font-bold outline-none flex-1 ${isRunning ? 'text-text-secondary cursor-not-allowed' : 'text-text-primary'}`}
                placeholder="--:--"
              />
            </div>
            <div className={`flex items-center space-x-3 rounded-xl px-4 py-3 ${isRunning ? 'bg-overlay/50' : 'bg-overlay'}`}>
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-text-secondary">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                <line x1="16" y1="2" x2="16" y2="6"></line>
                <line x1="8" y1="2" x2="8" y2="6"></line>
                <line x1="3" y1="10" x2="21" y2="10"></line>
              </svg>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                disabled={isRunning}
                className={`bg-transparent text-sm font-semibold outline-none flex-1 ${isRunning ? 'text-text-secondary cursor-not-allowed' : 'text-text-primary'}`}
              />
            </div>
          </div>
        </div>
        
        {/* Bottom Actions */}
        <div className="flex items-center justify-between">
          {/* Löschen-Button nur wenn Timer nicht läuft */}
          {!isRunning && onDelete ? (
            <button 
              onClick={() => {
                if (window.confirm('Möchtest du diesen Zeiteintrag wirklich löschen?')) {
                  onDelete(timeEntry.id);
                  onClose();
                }
              }}
              className="text-red-500 hover:text-red-400 p-2 transition-colors"
              title="Eintrag löschen"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="3 6 5 6 21 6"></polyline>
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
              </svg>
            </button>
          ) : (
            <div className="w-10" />
          )}
          
          <button
            onClick={handleFinish}
            className="flex items-center space-x-3 glow-button hover:opacity-80 text-text-primary px-8 py-3 rounded-full font-bold transition-all"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12"></polyline>
            </svg>
            <span>Fertig</span>
          </button>
        </div>
      </div>
    </>
  );
};
