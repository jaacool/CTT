import React, { useState, useEffect, useCallback } from 'react';
import { Project, Task, TaskStatus, Subtask, User, Activity, TaskList, ProjectStatus, TimeEntry, UserStatus, Role } from './types';
import { ADMIN_USER, MOCK_PROJECTS, MOCK_USER, MOCK_USER_2, MOCK_USERS, MOCK_ROLES } from './constants';
import { hasPermission } from './utils/permissions';
import { Sidebar } from './components/Sidebar';
import { TaskArea } from './components/TaskArea';
import { TaskDetailPanel } from './components/TaskDetailPanel';
import { TimerMenu } from './components/TimerMenu';
import { Dashboard } from './components/Dashboard';
import { ProjectsOverview } from './components/ProjectsOverview';
import { CreateProjectModal } from './components/CreateProjectModal';
import { SearchProjectModal } from './components/SearchProjectModal';
import { LoginScreen } from './components/LoginScreen';
import { TopBar } from './components/TopBar';
import { SettingsPage } from './components/SettingsPage';
import { statusToText, formatTime } from './components/utils';
import { GlowProvider } from './contexts/GlowContext';

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
  const [timeEntries, setTimeEntries] = useState<TimeEntry[]>([]); // Globaler Zeiteintrag-Speicher
  const [defaultBillableByProject, setDefaultBillableByProject] = useState<Record<string, boolean>>({});
  const [history, setHistory] = useState<Project[][]>([MOCK_PROJECTS]);
  const [historyIndex, setHistoryIndex] = useState(0);
  const [selectedProject, setSelectedProject] = useState<Project | null>(MOCK_PROJECTS.find(p => p.name === 'AARON') || null);
  const [selectedTask, setSelectedTask] = useState<Task | Subtask | null>(null);
  const [taskTimers, setTaskTimers] = useState<{ [taskId: string]: number }>({});
  const [activeTimerTaskId, setActiveTimerTaskId] = useState<string | null>(null);
  const [activeTimeEntryId, setActiveTimeEntryId] = useState<string | null>(null);
  const [showTimerMenu, setShowTimerMenu] = useState(false);
  const [timerMenuAnchor, setTimerMenuAnchor] = useState<{top:number;right:number;bottom:number;left:number} | null>(null);
  const [timerHovered, setTimerHovered] = useState(false);
  const [showDashboard, setShowDashboard] = useState(false);
  const [showProjectsOverview, setShowProjectsOverview] = useState(false);
  const [showCreateProjectModal, setShowCreateProjectModal] = useState(false);
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [pinnedTasks, setPinnedTasks] = useState<string[]>([]);
  const [dashboardNote, setDashboardNote] = useState('');
  const [currentUser, setCurrentUser] = useState<User | null>(ADMIN_USER);
  const [showSettings, setShowSettings] = useState(false);
  const [users, setUsers] = useState<User[]>(MOCK_USERS);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Undo/Redo system
  const saveToHistory = useCallback((newProjects: Project[]) => {
    setHistory(prev => {
      const newHistory = prev.slice(0, historyIndex + 1);
      newHistory.push(newProjects);
      // Limit history to 50 states
      if (newHistory.length > 50) {
        newHistory.shift();
        setHistoryIndex(prev => prev);
        return newHistory;
      }
      setHistoryIndex(newHistory.length - 1);
      return newHistory;
    });
  }, [historyIndex]);

  const undo = useCallback(() => {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1;
      setHistoryIndex(newIndex);
      setProjects(history[newIndex]);
    }
  }, [historyIndex, history]);

  const redo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      const newIndex = historyIndex + 1;
      setHistoryIndex(newIndex);
      setProjects(history[newIndex]);
    }
  }, [historyIndex, history]);

  const canUndo = historyIndex > 0;
  const canRedo = historyIndex < history.length - 1;

  const getProjectDefaultBillable = useCallback((projectId: string) => {
    return (defaultBillableByProject[projectId] ?? true);
  }, [defaultBillableByProject]);

  const toggleProjectDefaultBillable = useCallback((projectId: string) => {
    setDefaultBillableByProject(prev => ({
      ...prev,
      [projectId]: !(prev[projectId] ?? true),
    }));
  }, []);

  // Keyboard shortcuts for undo/redo
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        undo();
      } else if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
        e.preventDefault();
        redo();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undo, redo]);

  // Wrapper for setProjects that saves to history
  const updateProjects = useCallback((updater: Project[] | ((prev: Project[]) => Project[]), skipHistory = false) => {
    setProjects(prev => {
      const newProjects = typeof updater === 'function' ? updater(prev) : updater;
      if (!skipHistory) {
        saveToHistory(newProjects);
      }
      return newProjects;
    });
  }, [saveToHistory]);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | null = null;
    if (activeTimerTaskId && activeTimeEntryId) {
      interval = setInterval(() => {
        setTaskTimers(prev => ({
          ...prev,
          [activeTimerTaskId]: (prev[activeTimerTaskId] || 0) + 1,
        }));
        
        // Update duration in the active TimeEntry
        setTimeEntries(prev => prev.map(entry =>
          entry.id === activeTimeEntryId
            ? { ...entry, duration: entry.duration + 1 }
            : entry
        ));
        
        setProjects(prevProjects => prevProjects.map(p => ({
          ...p,
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
    setShowDashboard(false);
    setShowProjectsOverview(false);
    setShowSettings(false);
  }, [projects]);

  const handleSelectTask = useCallback((task: Task | Subtask | null) => {
    if (task === null) {
      setSelectedTask(null);
    } else {
      setSelectedTask(prev => (prev?.id === task.id ? null : task));
    }
  }, []);

  const handleDeleteTask = useCallback((taskId: string) => {
    updateProjects(prev => prev.map(p => ({
      ...p,
      taskLists: p.taskLists.map(list => ({
        ...list,
        tasks: list.tasks.filter(t => t.id !== taskId)
      })),
    })));
    // Remove time entries linked to the deleted task
    setTimeEntries(prev => prev.filter(te => te.taskId !== taskId));
    setSelectedTask(prev => (prev && 'id' in prev && prev.id === taskId ? null : prev));
  }, [updateProjects]);

  const handleBillableChange = useCallback((taskId: string, billable: boolean) => {
    updateProjects(prev => prev.map(p => ({
      ...p,
      taskLists: p.taskLists.map(list => ({
        ...list,
        tasks: list.tasks.map(t => 
          t.id === taskId 
            ? { ...t, billable }
            : {
                ...t,
                subtasks: t.subtasks.map(st => 
                  st.id === taskId ? { ...st, billable } : st
                )
              }
        )
      }))
    })));
  }, [updateProjects]);

  const handleToggleTimer = useCallback((taskId: string) => {
    if (activeTimerTaskId === taskId) {
      // Stop timer - set endTime on active TimeEntry
      if (activeTimeEntryId) {
        setTimeEntries(prev => prev.map(entry =>
          entry.id === activeTimeEntryId
            ? { ...entry, endTime: new Date().toISOString() }
            : entry
        ));
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
      let listTitle = '';
      let projectId = '';
      let projectName = '';
      
      projects.forEach(p => {
        p.taskLists.forEach(list => {
          list.tasks.forEach(task => {
            if (task.id === taskId) {
              taskTitle = task.title;
              listTitle = list.title;
              projectId = p.id;
              projectName = p.name;
            }
            task.subtasks.forEach(subtask => {
              if (subtask.id === taskId) {
                taskTitle = subtask.title;
                listTitle = list.title;
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
        listTitle,
        projectId,
        projectName,
        startTime: now,
        endTime: null,
        duration: 0,
        user: currentUser!,
        billable: false,
      };
      
      setTimeEntries(prev => [...prev, newEntry]);
      
      setActiveTimerTaskId(taskId);
      setActiveTimeEntryId(newEntryId);
      setTaskTimers(prev => ({ ...prev, [taskId]: 0 }));
    }
  }, [activeTimerTaskId, activeTimeEntryId, projects]);

  const handleSetTaskStatus = useCallback((itemId: string, newStatus: TaskStatus) => {
    updateProjects(prevProjects => {
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
        if (currentUser) return addActivity(updatedProjects, itemId, currentUser, text);
      }

      return updatedProjects;
    });
  }, [updateProjects]);

  const handleTaskUpdate = (updatedItem: Task | Subtask) => {
    updateProjects(prevProjects => prevProjects.map(p => ({
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
     updateProjects(prevProjects => {
        const updatedProjectsWithDesc = prevProjects.map(p => ({
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

        if (currentUser) {
          return addActivity(updatedProjectsWithDesc, itemId, currentUser, "hat die Beschreibung aktualisiert.");
        }
        return updatedProjectsWithDesc;
     });
  };

  const handleAddNewProject = () => {
    setShowCreateProjectModal(true);
  };

  const handleCreateProject = useCallback((projectData: any) => {
    const newProject: Project = {
      id: `project-${Date.now()}`,
      name: projectData.name,
      icon: projectData.icon || '📁',
      status: ProjectStatus.Active,
      taskLists: [],
      startDate: new Date().toISOString(),
      endDate: null,
      budgetHours: null,
      members: [currentUser!],
    };
    updateProjects(prev => [...prev, newProject]);
    setSelectedProject(newProject);
    setShowDashboard(false);
    setShowProjectsOverview(false);
  }, [updateProjects]);

  const handleAddNewList = (projectId: string, title: string) => {
    const newList: TaskList = {
      id: `list-${Date.now()}`,
      title,
      tasks: [],
    };
    updateProjects(prev => prev.map(p => {
      if (p.id === projectId) {
        return { ...p, taskLists: [...p.taskLists, newList] };
      }
      return p;
    }));
  };

  const handleAddTask = (listId: string, title: string) => {
     // Find the project for this list to pick default billable
     let parentProjectId: string | null = null;
     projects.forEach(p => {
       p.taskLists.forEach(l => { if (l.id === listId) parentProjectId = p.id; });
     });
     const projectDefault = parentProjectId ? getProjectDefaultBillable(parentProjectId) : true;

     const newTask: Task = {
        id: `task-${Date.now()}`,
        title,
        description: '',
        status: TaskStatus.Todo,
        assignee: currentUser!,
        timeTrackedSeconds: 0,
        timeBudgetHours: null,
        dueDate: null,
        activity: [],
        subtasks: [],
        todos: [],
        billable: projectDefault,
     };
     updateProjects(prev => prev.map(p => ({
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
      updateProjects(prev => prev.map(p => {
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
    // Find parent project for default billable
    let parentProjectId: string | null = null;
    projects.forEach(p => {
      p.taskLists.forEach(list => {
        list.tasks.forEach(t => {
          if (t.id === taskId) parentProjectId = p.id;
        });
      });
    });
    const projectDefault = parentProjectId ? getProjectDefaultBillable(parentProjectId) : true;

    const newSubtask: Subtask = {
      id: `subtask-${Date.now()}`,
      title,
      description: '',
      status: TaskStatus.Todo,
      assignee: currentUser!,
      timeTrackedSeconds: 0,
      timeBudgetHours: null,
      dueDate: null,
      activity: [],
      todos: [],
      billable: projectDefault,
    };
    
    updateProjects(prev => prev.map(p => ({
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

  const handlePinTask = useCallback((taskId: string) => {
    setPinnedTasks(prev => 
      prev.includes(taskId) 
        ? prev.filter(id => id !== taskId)
        : [...prev, taskId]
    );
  }, []);

  const handleUpdateDashboardNote = useCallback((note: string) => {
    setDashboardNote(note);
  }, []);

  const handleUpdateTimeEntry = useCallback((entryId: string, startTime: string, endTime: string, note?: string) => {
    setTimeEntries(prev => prev.map(entry => {
      if (entry.id === entryId) {
        const start = new Date(startTime);
        
        // Wenn endTime leer ist, Timer läuft weiter - berechne duration bis jetzt
        if (!endTime) {
          const now = new Date();
          const duration = Math.floor((now.getTime() - start.getTime()) / 1000);
          // Update taskTimers mit neuer duration
          setTaskTimers(prev => ({ ...prev, [entry.taskId]: duration }));
          return { ...entry, startTime, duration, note };
        }
        
        // Ansonsten normale Berechnung mit endTime
        const end = new Date(endTime);
        const duration = Math.floor((end.getTime() - start.getTime()) / 1000);
        return { ...entry, startTime, endTime, duration, note };
      }
      return entry;
    }));
  }, []);

  const handleDeleteTimeEntry = useCallback((entryId: string) => {
    // Stoppe aktiven Timer falls dieser Eintrag gerade läuft
    if (activeTimeEntryId === entryId) {
      setActiveTimerTaskId(null);
      setActiveTimeEntryId(null);
    }
    
    setTimeEntries(prev => prev.filter(entry => entry.id !== entryId));
  }, [activeTimeEntryId]);

  const handleDuplicateTimeEntry = useCallback((entry: TimeEntry) => {
    const now = new Date();
    const startTime = new Date(now.getTime() - (entry.duration * 1000)); // Berechne Startzeit basierend auf Original-Duration
    
    const newEntry: TimeEntry = {
      ...entry,
      id: `entry-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      user: currentUser!, // Verwende den aktuellen User
      startTime: startTime.toISOString(),
      endTime: now.toISOString(), // Abgeschlossener Eintrag
      duration: entry.duration // Gleiche Duration wie Original
    };
    
    setTimeEntries(prev => [...prev, newEntry]);
  }, [currentUser]);

  const handleAddTodo = (itemId: string, text: string) => {
    const newTodo = {
      id: `todo-${Date.now()}`,
      text,
      completed: false,
    };
    
    updateProjects(prev => prev.map(p => ({
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

  const handleAddUser = useCallback((userData: { name: string; title?: string; email: string; tags?: string[]; status: UserStatus }) => {
    const newUser: User = {
      id: `user-${Date.now()}`,
      name: userData.name,
      title: userData.title,
      email: userData.email,
      avatarUrl: `https://i.pravatar.cc/150?u=${userData.email}`,
      tags: userData.tags,
      status: userData.status,
    };
    setUsers(prev => [...prev, newUser]);
  }, []);

  const handleUpdateUser = useCallback((userId: string, userData: Partial<User>) => {
    setUsers(prev => prev.map(u => u.id === userId ? { ...u, ...userData } : u));
  }, []);

  const handleDeleteUser = useCallback((userId: string) => {
    setUsers(prev => prev.filter(u => u.id !== userId));
  }, []);

  const handleChangeRole = useCallback((userId: string, roleId: string) => {
    setUsers(prev => prev.map(u => u.id === userId ? { ...u, role: roleId } : u));
  }, []);

  const handleChangeCurrentUserRole = useCallback((roleId: string) => {
    if (currentUser) {
      const updatedUser = { ...currentUser, role: roleId };
      setCurrentUser(updatedUser);
      setUsers(prev => prev.map(u => u.id === currentUser.id ? updatedUser : u));
    }
  }, [currentUser]);

  const handleChangeUser = useCallback((userId: string) => {
    const newUser = users.find(u => u.id === userId);
    if (newUser) {
      setCurrentUser(newUser);
    }
  }, [users]);

  const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);

  // Removed login screen - always logged in as admin

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
    <div className="flex flex-col h-screen font-sans text-sm">
      <TopBar
        user={currentUser}
        users={users}
        roles={MOCK_ROLES}
        canUndo={canUndo}
        canRedo={canRedo}
        onUndo={undo}
        onRedo={redo}
        onChangeRole={handleChangeCurrentUserRole}
        onChangeUser={handleChangeUser}
        onToggleSidebar={toggleSidebar}
      />
      
      <div className="flex flex-1 overflow-hidden">
        <Sidebar 
        isOpen={isSidebarOpen}
        onClose={toggleSidebar}
        projects={projects}
        selectedProject={selectedProject}
        currentUser={currentUser}
        roles={MOCK_ROLES}
        onSelectProject={(projectId) => {
          handleSelectProject(projectId);
          setIsSidebarOpen(false); // Close sidebar on selection
        }}
        onAddNewProject={() => {
          handleAddNewProject();
          setIsSidebarOpen(false); // Close sidebar
        }}
        onRenameProject={(id, newName) => handleRenameItem(id, newName, 'project')}
        onSelectDashboard={() => {
          setShowDashboard(true);
          setShowProjectsOverview(false);
          setSelectedProject(null);
          setSelectedTask(null);
          setShowSettings(false);
          setIsSidebarOpen(false); // Close sidebar
        }}
        onSelectProjectsOverview={() => {
          setShowProjectsOverview(true);
          setShowDashboard(false);
          setSelectedProject(null);
          setSelectedTask(null);
          setShowSettings(false);
          setIsSidebarOpen(false); // Close sidebar
        }}
        onSelectSettings={() => {
          setShowSettings(true);
          setShowDashboard(false);
          setShowProjectsOverview(false);
          setSelectedProject(null);
          setSelectedTask(null);
          setIsSidebarOpen(false); // Close sidebar
        }}
      />
      
        <main className="flex-1 flex flex-col p-4 md:p-6 overflow-y-auto transition-all duration-300">
        {showDashboard ? (
          <Dashboard
            user={currentUser}
            projects={projects}
            timeEntries={timeEntries}
            pinnedTaskIds={pinnedTasks}
            onUnpinTask={handlePinTask}
            onUpdateNote={handleUpdateDashboardNote}
            onToggleTimer={handleToggleTimer}
            activeTimerTaskId={activeTimerTaskId}
            taskTimers={taskTimers}
            onUpdateTimeEntry={handleUpdateTimeEntry}
            onBillableChange={handleBillableChange}
          />
        ) : showProjectsOverview ? (
          <ProjectsOverview
            projects={projects}
            onSelectProject={handleSelectProject}
          />
        ) : selectedProject ? (
          <TaskArea 
            project={selectedProject}
            timeEntries={timeEntries}
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
            onBillableChange={handleBillableChange}
            defaultBillable={getProjectDefaultBillable(selectedProject.id)}
            onToggleDefaultBillable={() => toggleProjectDefaultBillable(selectedProject.id)}
            onPinTask={handlePinTask}
            pinnedTaskIds={pinnedTasks}
            onDeleteTask={handleDeleteTask}
            onOpenCreateProject={() => setShowCreateProjectModal(true)}
            onOpenSearchProjects={() => setShowSearchModal(true)}
            onDeleteTimeEntry={handleDeleteTimeEntry}
            onDuplicateTimeEntry={handleDuplicateTimeEntry}
            currentUser={currentUser}
          />
        ) : (
          showSettings ? (
            <SettingsPage 
              users={users}
              roles={MOCK_ROLES}
              onAddUser={handleAddUser}
              onUpdateUser={handleUpdateUser}
              onDeleteUser={handleDeleteUser}
              onChangeRole={handleChangeRole}
            />
          ) :
          <div className="flex items-center justify-center h-full text-text-secondary">
            <p>Wählen Sie ein Projekt aus, um Aufgaben anzuzeigen.</p>
          </div>
        )}
        </main>

        <div className={`fixed top-16 right-0 h-full w-96 bg-surface shadow-2xl transform transition-transform duration-300 ease-in-out md:relative md:top-auto md:right-auto md:h-auto md:w-auto md:shadow-none md:transform-none md:transition-none ${selectedTask ? 'translate-x-0' : 'translate-x-full'} md:translate-x-0 md:block`}>
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
            onBillableChange={handleBillableChange}
          />
        </div>

      {activeTimerTaskId && (() => {
        const activeEntry = timeEntries.find(e => e.id === activeTimeEntryId);
        
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
                <div className="absolute bottom-full right-0 mb-3 bg-overlay text-text-primary px-4 py-2 rounded-lg shadow-xl whitespace-nowrap">
                  <div className="text-xs text-gray-500 mb-1">{activeEntry.projectName}</div>
                  <div className="font-bold">{activeEntry.taskTitle}</div>
                  <div className="absolute top-full right-8 w-0 h-0 border-l-8 border-r-8 border-t-8 border-transparent border-t-overlay"></div>
                </div>
              )}
              
              <button
                onClick={(e) => {
                  if (!hasPermission(currentUser, MOCK_ROLES, 'Zeit bearbeiten')) return;
                  const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                  setTimerMenuAnchor(rect);
                  setShowTimerMenu(true);
                }}
                className="flex items-center space-x-3 px-4 py-3 rounded-full glow-button-highlight text-text-primary font-bold"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
                  <circle cx="12" cy="12" r="10"></circle>
                  <polyline points="12 6 12 12 16 14"></polyline>
                </svg>
                <span onClick={(e) => { 
                  e.stopPropagation(); 
                  if (!hasPermission(currentUser, MOCK_ROLES, 'Zeit bearbeiten')) return; 
                  const parent = (e.currentTarget as HTMLElement).closest('button');
                  if (parent) setTimerMenuAnchor((parent as HTMLElement).getBoundingClientRect());
                  setShowTimerMenu(true); 
                }}>
                  {formatTime(taskTimers[activeTimerTaskId] || 0)}
                </span>
                <div 
                  onClick={(e) => { e.stopPropagation(); handleToggleTimer(activeTimerTaskId); }} 
                  className="relative group w-5 h-5"
                >
                  {/* Pause Icon - default */}
                  <svg 
                    xmlns="http://www.w3.org/2000/svg" 
                    width="24" 
                    height="24" 
                    viewBox="0 0 24 24" 
                    fill="none" 
                    stroke="currentColor" 
                    strokeWidth="2" 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    className="w-5 h-5 cursor-pointer transition-opacity group-hover:opacity-0 absolute"
                  >
                    <rect x="6" y="4" width="4" height="16"></rect>
                    <rect x="14" y="4" width="4" height="16"></rect>
                  </svg>
                  {/* Stop Icon - on hover */}
                  <svg 
                    xmlns="http://www.w3.org/2000/svg" 
                    width="24" 
                    height="24" 
                    viewBox="0 0 24 24" 
                    fill="none" 
                    stroke="currentColor" 
                    strokeWidth="3" 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    className="w-5 h-5 cursor-pointer transition-opacity opacity-0 group-hover:opacity-100 absolute"
                  >
                    <rect width="14" height="14" x="5" y="5" rx="2"/>
                  </svg>
                </div>
              </button>
            </div>
            
            {showTimerMenu && hasPermission(currentUser, MOCK_ROLES, 'Zeit bearbeiten') && (() => {
              // Finde Task/Subtask für Billable-Status
              let taskBillable = true;
              projects.forEach(proj => {
                proj.taskLists.forEach(list => {
                  list.tasks.forEach(task => {
                    if (task.id === activeTimerTaskId) {
                      taskBillable = task.billable ?? true;
                    }
                    task.subtasks.forEach(subtask => {
                      if (subtask.id === activeTimerTaskId) {
                        taskBillable = subtask.billable ?? task.billable ?? true;
                      }
                    });
                  });
                });
              });
              
              return (
                <TimerMenu
                  timeEntry={activeEntry}
                  elapsedSeconds={taskTimers[activeTimerTaskId] || 0}
                  onClose={() => setShowTimerMenu(false)}
                  onUpdate={handleUpdateTimeEntry}
                  onStop={() => handleToggleTimer(activeTimerTaskId)}
                  anchorRect={timerMenuAnchor}
                  taskBillable={taskBillable}
                  onBillableChange={handleBillableChange}
                />
              );
            })()}
          </>
        );
      })()}
      
      {/* Modals */}
      {showCreateProjectModal && (
        <CreateProjectModal
          onClose={() => setShowCreateProjectModal(false)}
          onCreateProject={handleCreateProject}
        />
      )}
      
      {showSearchModal && (
        <SearchProjectModal
          projects={projects}
          onClose={() => setShowSearchModal(false)}
          onSelectProject={handleSelectProject}
        />
      )}
      </div>
    </div>
  );
};

const AppWithGlow = () => (
  <GlowProvider>
    <App />
  </GlowProvider>
);

export default AppWithGlow;