import React, { useState, useEffect, useCallback } from 'react';
import { Project, Task, TaskStatus, Subtask, User, Activity, TaskList, ProjectStatus, TimeEntry } from './types';
import { MOCK_PROJECTS, MOCK_USER, MOCK_USER_2 } from './constants';
import { Sidebar } from './components/Sidebar';
import { TaskArea } from './components/TaskArea';
import { TaskDetailPanel } from './components/TaskDetailPanel';
import { TimerMenu } from './components/TimerMenu';
import { statusToText, formatTime } from './components/utils';

const addActivity = (projects: Project[], itemId: string, user: User, text: string): Project[] => {
  const newActivity: Activity = {
    id: `act-${Date.now()}`,
    user,
    text,
    timestamp: new Date().toISOString(),
  };

  return projects.map(p => ({
    ...p,
    taskLists: p.taskLists.map(list => ({
      ...list,
      tasks: list.tasks.map(t => {
        if (t.id === itemId) {
          return { ...t, activity: [newActivity, ...t.activity] };
        }
        const subtaskIndex = t.subtasks.findIndex(st => st.id === itemId);
        if (subtaskIndex > -1) {
          const updatedSubtask = {
            ...t.subtasks[subtaskIndex],
            activity: [newActivity, ...t.subtasks[subtaskIndex].activity],
          };
          const newSubtasks = [...t.subtasks];
          newSubtasks[subtaskIndex] = updatedSubtask;
          return { ...t, subtasks: newSubtasks };
        }
        return t;
      })
    }))
  }));
};


const App: React.FC = () => {
  const [projects, setProjects] = useState<Project[]>(MOCK_PROJECTS);
  const [selectedProject, setSelectedProject] = useState<Project | null>(MOCK_PROJECTS.find(p => p.name === 'AARON') || null);
  const [selectedTask, setSelectedTask] = useState<Task | Subtask | null>(null);
  const [taskTimers, setTaskTimers] = useState<{ [taskId: string]: number }>({});
  const [activeTimerTaskId, setActiveTimerTaskId] = useState<string | null>(null);
  const [activeTimeEntryId, setActiveTimeEntryId] = useState<string | null>(null);
  const [showTimerMenu, setShowTimerMenu] = useState(false);
  const [timerHovered, setTimerHovered] = useState(false);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | null = null;
    if (activeTimerTaskId && activeTimeEntryId) {
      interval = setInterval(() => {
        setTaskTimers(prev => ({
          ...prev,
          [activeTimerTaskId]: (prev[activeTimerTaskId] || 0) + 1,
        }));
        
        // Update duration in the active TimeEntry
        setProjects(prevProjects => prevProjects.map(p => ({
          ...p,
          timeEntries: p.timeEntries.map(entry =>
            entry.id === activeTimeEntryId
              ? { ...entry, duration: entry.duration + 1 }
              : entry
          ),
          taskLists: p.taskLists.map(list => ({
            ...list,
            tasks: list.tasks.map(t => {
              if (t.id === activeTimerTaskId) {
                return { ...t, timeTrackedSeconds: t.timeTrackedSeconds + 1 };
              }
              return {
                ...t,
                subtasks: t.subtasks.map(st => 
                  st.id === activeTimerTaskId 
                    ? { ...st, timeTrackedSeconds: st.timeTrackedSeconds + 1 }
                    : st
                )
              };
            })
          }))
        })));
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [activeTimerTaskId, activeTimeEntryId]);

  useEffect(() => {
    if (selectedProject) {
      const updatedProject = projects.find(p => p.id === selectedProject.id);
      setSelectedProject(updatedProject || null);

      if (selectedTask) {
        let foundTask: Task | Subtask | undefined;
        updatedProject?.taskLists.forEach(list => {
          list.tasks.forEach(task => {
            if (task.id === selectedTask.id) {
              foundTask = task;
            } else {
              const foundSubtask = task.subtasks.find(st => st.id === selectedTask.id);
              if (foundSubtask) {
                foundTask = foundSubtask;
              }
            }
          });
        });
        setSelectedTask(foundTask || null);
      }
    }
  }, [projects, selectedProject?.id, selectedTask?.id]);


  const handleSelectProject = useCallback((projectId: string) => {
    const project = projects.find(p => p.id === projectId) || null;
    setSelectedProject(project);
    setSelectedTask(null);
  }, [projects]);

  const handleSelectTask = useCallback((task: Task | Subtask) => {
    setSelectedTask(prev => (prev?.id === task.id ? null : task));
  }, []);

  const handleToggleTimer = useCallback((taskId: string) => {
    if (activeTimerTaskId === taskId) {
      // Stop timer - set endTime on active TimeEntry
      if (activeTimeEntryId) {
        setProjects(prevProjects => prevProjects.map(p => ({
          ...p,
          timeEntries: p.timeEntries.map(entry =>
            entry.id === activeTimeEntryId
              ? { ...entry, endTime: new Date().toISOString() }
              : entry
          )
        })));
      }
      setActiveTimerTaskId(null);
      setActiveTimeEntryId(null);
      setTaskTimers(prev => ({ ...prev, [taskId]: 0 }));
    } else {
      // Start new timer - create new TimeEntry
      const newEntryId = `entry-${Date.now()}`;
      const now = new Date().toISOString();
      
      // Find task info
      let taskTitle = '';
      let projectId = '';
      let projectName = '';
      
      projects.forEach(p => {
        p.taskLists.forEach(list => {
          list.tasks.forEach(task => {
            if (task.id === taskId) {
              taskTitle = task.title;
              projectId = p.id;
              projectName = p.name;
            }
            task.subtasks.forEach(subtask => {
              if (subtask.id === taskId) {
                taskTitle = subtask.title;
                projectId = p.id;
                projectName = p.name;
              }
            });
          });
        });
      });
      
      const newEntry: TimeEntry = {
        id: newEntryId,
        taskId,
        taskTitle,
        projectId,
        projectName,
        startTime: now,
        endTime: null,
        duration: 0,
        user: MOCK_USER,
        billable: false,
      };
      
      setProjects(prevProjects => prevProjects.map(p =>
        p.id === projectId
          ? { ...p, timeEntries: [...p.timeEntries, newEntry] }
          : p
      ));
      
      setActiveTimerTaskId(taskId);
      setActiveTimeEntryId(newEntryId);
      setTaskTimers(prev => ({ ...prev, [taskId]: 0 }));
    }
  }, [activeTimerTaskId, activeTimeEntryId, projects]);

  const handleSetTaskStatus = useCallback((itemId: string, newStatus: TaskStatus) => {
    setProjects(prevProjects => {
      let oldStatus: TaskStatus | undefined;

      const updatedProjects = prevProjects.map(p => ({
        ...p,
        taskLists: p.taskLists.map(list => ({
          ...list,
          tasks: list.tasks.map(t => {
            if (t.id === itemId) {
              oldStatus = t.status;
              return { ...t, status: newStatus };
            }
            
            const subtaskIndex = t.subtasks.findIndex(st => st.id === itemId);
            if (subtaskIndex > -1) {
              const originalSubtask = t.subtasks[subtaskIndex];
              oldStatus = originalSubtask.status;
              const updatedSubtask = { ...originalSubtask, status: newStatus };
              const newSubtasks = [...t.subtasks];
              newSubtasks[subtaskIndex] = updatedSubtask;
              return { ...t, subtasks: newSubtasks };
            }
            return t;
          })
        }))
      }));
      
      if (oldStatus && newStatus && oldStatus !== newStatus) {
        const text = `hat den Status von "${statusToText(oldStatus)}" zu "${statusToText(newStatus)}" geändert.`;
        return addActivity(updatedProjects, itemId, MOCK_USER, text);
      }

      return updatedProjects;
    });
  }, []);

  const handleTaskUpdate = (updatedItem: Task | Subtask) => {
    setProjects(prevProjects => prevProjects.map(p => ({
        ...p,
        taskLists: p.taskLists.map(list => ({
            ...list,
            tasks: list.tasks.map(t => {
              if (t.id === updatedItem.id) {
                return updatedItem as Task;
              }
              return {
                ...t,
                subtasks: t.subtasks.map(st => st.id === updatedItem.id ? updatedItem as Subtask : st)
              };
            })
        }))
    })));
  };
  
  const handleDescriptionUpdate = (itemId: string, description: string) => {
     setProjects(prevProjects => {
        const updatedProjects = prevProjects.map(p => ({
        ...p,
        taskLists: p.taskLists.map(list => ({
            ...list,
            tasks: list.tasks.map(t => {
              if (t.id === itemId) {
                return { ...t, description };
              }
              return {
                ...t,
                subtasks: t.subtasks.map(st => st.id === itemId ? { ...st, description } : st)
              };
            })
        }))
    }));
        return addActivity(updatedProjects, itemId, MOCK_USER, "hat die Beschreibung aktualisiert.");
     });
  };

  const handleAddNewProject = () => {
    const newProject: Project = {
      id: `proj-${Date.now()}`,
      name: 'Neues Projekt',
      icon: '💡',
      taskLists: [],
      status: ProjectStatus.Planned,
      startDate: new Date().toISOString(),
      endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      budgetHours: 0,
      members: [MOCK_USER],
      timeEntries: [],
    };
    setProjects(prev => [...prev, newProject]);
    setSelectedProject(newProject);
    setSelectedTask(null);
  };

  const handleAddNewList = (projectId: string, title: string) => {
    const newList: TaskList = {
      id: `list-${Date.now()}`,
      title,
      tasks: [],
    };
    setProjects(prev => prev.map(p => {
      if (p.id === projectId) {
        return { ...p, taskLists: [...p.taskLists, newList] };
      }
      return p;
    }));
  };

  const handleAddTask = (listId: string, title: string) => {
     const newTask: Task = {
        id: `task-${Date.now()}`,
        title,
        description: '',
        status: TaskStatus.Todo,
        assignee: MOCK_USER,
        timeTrackedSeconds: 0,
        timeBudgetHours: null,
        dueDate: null,
        activity: [],
        subtasks: [],
        todos: [],
     };
     setProjects(prev => prev.map(p => ({
         ...p,
         taskLists: p.taskLists.map(list => {
             if (list.id === listId) {
                 return { ...list, tasks: [newTask, ...list.tasks] };
             }
             return list;
         })
     })));
  };

  const handleRenameItem = (id: string, newName: string, type: 'project' | 'list' | 'task' | 'subtask') => {
      setProjects(prev => prev.map(p => {
          if (type === 'project' && p.id === id) {
              return { ...p, name: newName };
          }
          return {
              ...p,
              taskLists: p.taskLists.map(list => {
                  if (type === 'list' && list.id === id) {
                      return { ...list, title: newName };
                  }
                  return {
                      ...list,
                      tasks: list.tasks.map(t => {
                          if (type === 'task' && t.id === id) {
                              return { ...t, title: newName };
                          }
                           if (type === 'subtask') {
                              const subtaskIndex = t.subtasks.findIndex(st => st.id === id);
                              if (subtaskIndex > -1) {
                                const newSubtasks = [...t.subtasks];
                                newSubtasks[subtaskIndex] = { ...newSubtasks[subtaskIndex], title: newName };
                                return { ...t, subtasks: newSubtasks };
                              }
                           }
                          return t;
                      })
                  };
              })
          };
      }));
  };

  const handleAddSubtask = (taskId: string, title: string) => {
    const newSubtask: Subtask = {
      id: `subtask-${Date.now()}`,
      title,
      description: '',
      status: TaskStatus.Todo,
      assignee: MOCK_USER,
      timeTrackedSeconds: 0,
      timeBudgetHours: null,
      dueDate: null,
      activity: [],
      todos: [],
    };
    
    setProjects(prev => prev.map(p => ({
      ...p,
      taskLists: p.taskLists.map(list => ({
        ...list,
        tasks: list.tasks.map(t => {
          if (t.id === taskId) {
            return { ...t, subtasks: [...t.subtasks, newSubtask] };
          }
          return t;
        })
      }))
    })));
  };

  const handleUpdateTimeEntry = useCallback((entryId: string, startTime: string, endTime: string) => {
    setProjects(prevProjects => prevProjects.map(p => ({
      ...p,
      timeEntries: p.timeEntries.map(entry => {
        if (entry.id === entryId) {
          const start = new Date(startTime);
          
          // Wenn endTime leer ist, Timer läuft weiter - berechne duration bis jetzt
          if (!endTime) {
            const now = new Date();
            const duration = Math.floor((now.getTime() - start.getTime()) / 1000);
            // Update taskTimers mit neuer duration
            setTaskTimers(prev => ({ ...prev, [entry.taskId]: duration }));
            return { ...entry, startTime, duration };
          }
          
          // Ansonsten normale Berechnung mit endTime
          const end = new Date(endTime);
          const duration = Math.floor((end.getTime() - start.getTime()) / 1000);
          return { ...entry, startTime, endTime, duration };
        }
        return entry;
      })
    })));
  }, []);

  const handleAddTodo = (itemId: string, text: string) => {
    const newTodo = {
      id: `todo-${Date.now()}`,
      text,
      completed: false,
    };
    
    setProjects(prev => prev.map(p => ({
      ...p,
      taskLists: p.taskLists.map(list => ({
        ...list,
        tasks: list.tasks.map(t => {
          if (t.id === itemId) {
            return { ...t, todos: [...t.todos, newTodo] };
          }
          const subtaskIndex = t.subtasks.findIndex(st => st.id === itemId);
          if (subtaskIndex > -1) {
            const updatedSubtask = {
              ...t.subtasks[subtaskIndex],
              todos: [...t.subtasks[subtaskIndex].todos, newTodo],
            };
            const newSubtasks = [...t.subtasks];
            newSubtasks[subtaskIndex] = updatedSubtask;
            return { ...t, subtasks: newSubtasks };
          }
          return t;
        })
      }))
    })));
  };

  const findItemContext = (itemId: string): { projectName: string; listTitle: string } | null => {
    for (const project of projects) {
      for (const list of project.taskLists) {
        for (const task of list.tasks) {
          if (task.id === itemId) {
            return { projectName: project.name, listTitle: list.title };
          }
          const subtask = task.subtasks.find(st => st.id === itemId);
          if (subtask) {
            return { projectName: project.name, listTitle: list.title };
          }
        }
      }
    }
    return null;
  };

  return (
    <div className="flex h-screen font-sans text-sm">
      <Sidebar 
        projects={projects}
        selectedProject={selectedProject}
        onSelectProject={handleSelectProject}
        onAddNewProject={handleAddNewProject}
        onRenameProject={(id, newName) => handleRenameItem(id, newName, 'project')}
      />
      <main className="flex-1 flex flex-col p-6 overflow-y-auto">
        {selectedProject ? (
          <TaskArea 
            project={selectedProject} 
            selectedItem={selectedTask}
            onSelectItem={handleSelectTask}
            taskTimers={taskTimers}
            activeTimerTaskId={activeTimerTaskId}
            onToggleTimer={handleToggleTimer}
            onSetTaskStatus={handleSetTaskStatus}
            onAddNewList={(title) => handleAddNewList(selectedProject.id, title)}
            onAddTask={handleAddTask}
            onRenameItem={handleRenameItem}
            onUpdateTimeEntry={handleUpdateTimeEntry}
          />
        ) : (
          <div className="flex items-center justify-center h-full text-c-muted">
            <p>Wählen Sie ein Projekt aus, um Aufgaben anzuzeigen.</p>
          </div>
        )}
      </main>
      <TaskDetailPanel 
        item={selectedTask}
        onItemUpdate={handleTaskUpdate}
        onDescriptionUpdate={handleDescriptionUpdate}
        onRenameItem={(id, newName) => handleRenameItem(id, newName, 'task')}
        trackedTime={selectedTask ? taskTimers[selectedTask.id] : 0}
        activeTimerTaskId={activeTimerTaskId}
        onToggleTimer={handleToggleTimer}
        onAddSubtask={handleAddSubtask}
        onAddTodo={handleAddTodo}
        itemContext={selectedTask ? findItemContext(selectedTask.id) : null}
        onSelectItem={handleSelectTask}
      />
      
      {activeTimerTaskId && (() => {
        const activeEntry = projects
          .flatMap(p => p.timeEntries)
          .find(e => e.id === activeTimeEntryId);
        
        if (!activeEntry) return null;
        
        return (
          <>
            <div 
              className="fixed bottom-8 right-8 transition-all duration-300 ease-in-out"
              onMouseEnter={() => setTimerHovered(true)}
              onMouseLeave={() => setTimerHovered(false)}
            >
              {/* Hover Tooltip */}
              {timerHovered && (
                <div className="absolute bottom-full right-0 mb-3 bg-white text-black px-4 py-2 rounded-lg shadow-xl whitespace-nowrap">
                  <div className="text-xs text-gray-500 mb-1">{activeEntry.projectName}</div>
                  <div className="font-bold">{activeEntry.taskTitle}</div>
                  <div className="absolute top-full right-8 w-0 h-0 border-l-8 border-r-8 border-t-8 border-transparent border-t-white"></div>
                </div>
              )}
              
              <button
                onClick={() => setShowTimerMenu(!showTimerMenu)}
                className="flex items-center space-x-3 px-4 py-3 rounded-full shadow-lg text-white font-bold transition-all bg-c-magenta hover:bg-purple-600"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
                  <circle cx="12" cy="12" r="10"></circle>
                  <polyline points="12 6 12 12 16 14"></polyline>
                </svg>
                <span onClick={(e) => { e.stopPropagation(); setShowTimerMenu(true); }}>
                  {formatTime(taskTimers[activeTimerTaskId] || 0)}
                </span>
                <svg 
                  onClick={(e) => { e.stopPropagation(); handleToggleTimer(activeTimerTaskId); }}
                  xmlns="http://www.w3.org/2000/svg" 
                  width="24" 
                  height="24" 
                  viewBox="0 0 24 24" 
                  fill="none" 
                  stroke="currentColor" 
                  strokeWidth="2" 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  className="w-5 h-5 cursor-pointer hover:scale-110 transition-transform"
                >
                  <rect x="6" y="4" width="4" height="16"></rect>
                  <rect x="14" y="4" width="4" height="16"></rect>
                </svg>
              </button>
            </div>
            
            {showTimerMenu && (
              <TimerMenu
                timeEntry={activeEntry}
                elapsedSeconds={taskTimers[activeTimerTaskId] || 0}
                onClose={() => setShowTimerMenu(false)}
                onUpdate={handleUpdateTimeEntry}
                onStop={() => handleToggleTimer(activeTimerTaskId)}
              />
            )}
          </>
        );
      })()}
    </div>
  );
};

export default App;