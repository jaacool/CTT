import React, { useState } from 'react';
import { Project, TimeEntry, Task, Subtask, User } from '../types';
import { formatTime } from './utils';

interface DashboardProps {
  user: User;
  projects: Project[];
  pinnedTaskIds: string[];
  onUnpinTask: (taskId: string) => void;
  onUpdateNote: (note: string) => void;
  onToggleTimer: (taskId: string) => void;
  activeTimerTaskId: string | null;
  taskTimers: { [taskId: string]: number };
}

export const Dashboard: React.FC<DashboardProps> = ({
  user,
  projects,
  pinnedTaskIds,
  onUnpinTask,
  onUpdateNote,
  onToggleTimer,
  activeTimerTaskId,
  taskTimers
}) => {
  const [note, setNote] = useState(user.dashboardNote || '');

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

  // Hole heute's TimeEntries
  const today = new Date().toLocaleDateString('de-DE');
  const todayEntries = projects.flatMap(p => 
    p.timeEntries.filter(entry => 
      new Date(entry.startTime).toLocaleDateString('de-DE') === today
    )
  );

  const totalTodaySeconds = todayEntries.reduce((sum, entry) => sum + entry.duration, 0);

  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}:${minutes.toString().padStart(2, '0')}`;
  };

  return (
    <div className="w-full max-w-7xl mx-auto p-6">
      <div className="grid grid-cols-2 gap-6">
        {/* Linke Spalte: Zeiterfassung */}
        <div className="space-y-6" data-testid="dashboard-left-column">
          {/* Meine Zeiterfassung */}
          <div className="bg-c-surface rounded-xl p-6" data-testid="my-time-tracking">
            <h2 className="text-white text-xl font-bold mb-6">Meine Zeiterfassung</h2>
            
            {/* Kreis mit Zeit */}
            <div className="flex justify-center mb-8">
              <div className="relative w-48 h-48">
                <svg className="w-full h-full transform -rotate-90">
                  <circle
                    cx="96"
                    cy="96"
                    r="88"
                    stroke="#2a2d3e"
                    strokeWidth="16"
                    fill="none"
                  />
                  <circle
                    cx="96"
                    cy="96"
                    r="88"
                    stroke="#e91e63"
                    strokeWidth="16"
                    fill="none"
                    strokeDasharray={`${(totalTodaySeconds / 28800) * 552} 552`}
                    strokeLinecap="round"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <div className="text-white text-4xl font-bold">{formatDuration(totalTodaySeconds)}</div>
                  <div className="text-c-subtle text-sm">{today}</div>
                </div>
              </div>
            </div>

            {/* Heute's Einträge */}
            <div className="space-y-2" data-testid="today-entries">
              {todayEntries.map(entry => (
                <div key={entry.id} className="flex items-center justify-between p-3 bg-c-bg rounded-lg" data-testid={`time-entry-${entry.id}`}>
                  <div className="flex items-center space-x-3">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-c-magenta">
                      <circle cx="12" cy="12" r="10"></circle>
                      <polyline points="12 6 12 12 16 14"></polyline>
                    </svg>
                    <div>
                      <div className="text-white text-sm font-semibold">{entry.taskTitle}</div>
                      <div className="text-c-subtle text-xs">{entry.projectName}</div>
                    </div>
                  </div>
                  <div className="text-c-magenta font-bold">{formatDuration(entry.duration)}</div>
                </div>
              ))}
              {todayEntries.length === 0 && (
                <div className="text-center text-c-subtle py-8">
                  Noch keine Zeiteinträge heute
                </div>
              )}
            </div>
          </div>

          {/* Notizen */}
          <div className="bg-c-surface rounded-xl p-6" data-testid="notes-section">
            <h3 className="text-white text-lg font-bold mb-4">Heute (manuell)</h3>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              onBlur={() => onUpdateNote(note)}
              placeholder="Notizen für heute..."
              className="w-full bg-c-bg text-white placeholder-c-subtle rounded-lg p-4 outline-none focus:ring-2 focus:ring-c-blue resize-none"
              rows={6}
              data-testid="dashboard-notes"
            />
          </div>
        </div>

        {/* Rechte Spalte: Täglich */}
        <div className="bg-c-surface rounded-xl p-6" data-testid="shortcuts-section">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-white text-xl font-bold">Shortcuts</h2>
            <div className="flex items-center space-x-2">
              <button className="p-2 hover:bg-c-highlight rounded-lg">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-c-subtle">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                </svg>
              </button>
              <button className="p-2 hover:bg-c-highlight rounded-lg">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-c-subtle">
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
              <button className="p-2 hover:bg-c-highlight rounded-lg">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-c-subtle">
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
                
                return (
                  <div 
                    key={task.id} 
                    className="relative flex items-center space-x-3 p-3 bg-c-bg rounded-lg hover:bg-c-highlight transition-colors group"
                    title={listTitle}
                    data-testid={`shortcut-task-${task.id}`}
                  >
                    <span className="w-8 h-8 rounded-full bg-c-yellow flex items-center justify-center text-xl">
                      😊
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="text-white font-semibold truncate">{task.title}</div>
                      <div className="text-c-subtle text-xs truncate">{projectName}</div>
                    </div>
                    
                    {/* Timer Info */}
                    {elapsedSeconds > 0 && (
                      <div className="flex items-center space-x-2 text-xs text-c-subtle">
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
                        className={`p-1.5 rounded transition-colors ${isActive ? 'bg-c-magenta text-white' : 'hover:bg-c-magenta hover:text-white text-c-subtle'}`}
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
                        className="p-1.5 hover:bg-c-surface rounded text-c-subtle opacity-0 group-hover:opacity-100 transition-opacity"
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
                <div className="text-center text-c-subtle py-8">
                  Keine gepinnten Aufgaben
                  <div className="text-xs mt-2">Rechtsklick auf Aufgabe → "Zum Dashboard hinzufügen"</div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
