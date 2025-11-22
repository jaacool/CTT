import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Project, Task, TaskStatus, Subtask, User, Activity, TaskList, ProjectStatus, TimeEntry, UserStatus, Role, AbsenceRequest, AbsenceStatus, AbsenceType, ChatChannel, ChatMessage, ChatChannelType, ChatAttachment, Anomaly, AnomalyType, AnomalyStatus, AnomalyComment, AnomalyRecord } from './types';
import { saveChatChannel, updateChatChannel as supaUpdateChatChannel, deleteChatChannel as supaDeleteChatChannel, saveChatMessage as supaSaveChatMessage, updateChatMessageAttachments as supaUpdateChatMessageAttachments, loadAllChatData } from './utils/supabaseSync';
import { startChatRealtime } from './utils/chatRealtime';
import { MOCK_PROJECTS, MOCK_USER, MOCK_USER_2, MOCK_USERS, MOCK_ROLES, MOCK_ABSENCE_REQUESTS } from './constants';
import { hasPermission } from './utils/permissions';
import { Sidebar } from './components/Sidebar';
import { TaskArea } from './components/TaskArea';
import { TaskDetailPanel } from './components/TaskDetailPanel';
import { TimerMenu } from './components/TimerMenu';
import { Dashboard } from './components/Dashboard';
import { ProjectsOverview } from './components/ProjectsOverview';
import { VacationAbsence } from './components/VacationAbsence';
import { TimeTracking } from './components/TimeTracking';
import { TimeStatistics } from './components/TimeStatistics';
import { NotificationsModal } from './components/NotificationsModal';
import { CreateProjectModal } from './components/CreateProjectModal';
import { SearchProjectModal } from './components/SearchProjectModal';
import { ChatModalV2 as ChatModal } from './components/ChatModalV2';
import { StartTimeTrackingModal } from './components/StartTimeTrackingModal';
import { LoginScreen } from './components/LoginScreen';
import { TopBar } from './components/TopBar';
import { SettingsPage } from './components/SettingsPage';
import { BottomBar } from './components/BottomBar';
import { LoadingScreen } from './components/LoadingScreen';
import { statusToText, formatTime } from './components/utils';
import { GlowProvider } from './contexts/GlowContext';
import { saveProject, saveTimeEntry, saveUser, saveAbsenceRequest, deleteProject as deleteProjectFromSupabase, deleteTimeEntry, deleteUser as deleteUserFromSupabase, deleteAbsenceRequest, loadAllData } from './utils/supabaseSync';
import { saveToLocalStorage, loadFromLocalStorage } from './utils/dataBackup';
import { loadCompressedBackupFromSupabase } from './utils/supabaseBackup';
import { startSequentialSync, stopSequentialSync } from './utils/sequentialSync';
import { loadAllAnomalies, saveAnomaliesBatch, updateAnomalyStatus, startAnomalyRealtime, addAnomalyComment } from './utils/anomalySync';
import { useDebouncedCallback } from './hooks/useDebouncedCallback';
import { useAnomalyDetection } from './hooks/useAnomalyDetection';

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
  const [editingTimeEntry, setEditingTimeEntry] = useState<TimeEntry | null>(null);
  const [timerHovered, setTimerHovered] = useState(false);
  const [showDashboard, setShowDashboard] = useState(true);
  const [showProjectsOverview, setShowProjectsOverview] = useState(false);
  const [showCreateProjectModal, setShowCreateProjectModal] = useState(false);
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [pinnedTasks, setPinnedTasks] = useState<string[]>([]);
  const [dashboardNote, setDashboardNote] = useState('');
  const [users, setUsers] = useState<User[]>(MOCK_USERS);
  
  // Load last user from localStorage or default to MOCK_USER (Aaron)
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    const lastUserId = localStorage.getItem('ctt_last_user_id');
    if (lastUserId) {
      const user = MOCK_USERS.find(u => u.id === lastUserId);
      if (user) return user;
    }
    return MOCK_USER;
  });
  
  const [showSettings, setShowSettings] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [showVacationAbsence, setShowVacationAbsence] = useState(false);
  const [showTimeTracking, setShowTimeTracking] = useState(false);
  const [showTimeStatistics, setShowTimeStatistics] = useState(false);
  
  // Loading State - initial false, wird auf true gesetzt sobald Daten geladen sind
  const [isDataLoaded, setIsDataLoaded] = useState(false);
  const [absenceRequests, setAbsenceRequests] = useState<AbsenceRequest[]>(MOCK_ABSENCE_REQUESTS);
  const [showNotifications, setShowNotifications] = useState(false);
  const [selectedNotificationRequestId, setSelectedNotificationRequestId] = useState<string | undefined>(undefined);
  const [showStartTimeTrackingModal, setShowStartTimeTrackingModal] = useState(false);
  
  // Kalender-Einstellungen
  const [selectedState, setSelectedState] = useState<import('./utils/holidays').GermanState | undefined>('BE'); // Default: Berlin
  const [separateHomeOffice, setSeparateHomeOffice] = useState(false);
  
  // Favoriten-System pro User (aus currentUser.favoriteProjects)
  const [favoriteProjectIds, setFavoriteProjectIds] = useState<string[]>(
    currentUser?.favoriteProjects || []
  );
  
  // Chat State
  const [showChat, setShowChat] = useState(false);
  const [chatChannels, setChatChannels] = useState<ChatChannel[]>([]);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [currentChatChannel, setCurrentChatChannel] = useState<ChatChannel | null>(null);
  const [currentChatProject, setCurrentChatProject] = useState<Project | null>(selectedProject);
  const [chatProjectLocked, setChatProjectLocked] = useState<boolean>(false);
  const [showAdminsInDMs, setShowAdminsInDMs] = useState<boolean>(() => {
    const saved = localStorage.getItem('ctt_show_admins_in_dms');
    if (!saved) return true; // Default: Admins werden angezeigt
    try {
      return JSON.parse(saved);
    } catch (e) {
      console.warn('Invalid JSON in ctt_show_admins_in_dms, resetting to default');
      localStorage.removeItem('ctt_show_admins_in_dms');
      return true;
    }
  });
  const [maxUploadSize, setMaxUploadSize] = useState<number>(() => {
    const saved = localStorage.getItem('ctt_max_upload_size');
    return saved ? parseInt(saved) : 100; // Default: 100 MB
  });
  
  // Anomaly Detection State
  const {
    anomalies,
    isCalculating: isCalculatingAnomalies,
    performanceMetrics: anomalyMetrics,
    clearCache: clearAnomalyCache,
    forceRecalculate: forceRecalculateAnomalies,
    updateAnomalyStatus: updateAnomalyStatusLocal,
    updateAnomalyComments: updateAnomalyCommentsLocal
  } = useAnomalyDetection(currentUser, users, timeEntries, absenceRequests, {
    debounceMs: 3000,
    enableCache: true,
    enablePerformanceMonitoring: true
  });

  const [notificationsReady, setNotificationsReady] = useState(false);
  const [targetAnomaly, setTargetAnomaly] = useState<Anomaly | null>(null);

  // OPTIMIZED: Anomaly detection now handled by useAnomalyDetection hook
  // - Intelligent caching (nur geänderte Daten neu berechnen)
  // - Pre-indexing (O(n) statt O(n²))
  // - Performance monitoring
  
  // Sync anomalies to Supabase when they change
  useEffect(() => {
    if (anomalies.length > 0) {
      saveAnomaliesBatch(anomalies).catch(err => {
        console.error('Failed to save anomalies batch:', err);
      });
      
      // Erste Anomalien-Berechnung abgeschlossen → Notifications können angezeigt werden
      if (!notificationsReady) {
        setNotificationsReady(true);
      }
    }
  }, [anomalies, notificationsReady]);

  // Berechne ungelesene Nachrichten (Gesamt-Badge)
  const unreadMessagesCount = useMemo(() => {
    if (!currentUser) return 0;
    return chatMessages.filter(msg => 
      msg.sender.id !== currentUser.id && // Nicht eigene Nachrichten
      !msg.readBy.includes(currentUser.id) // Noch nicht gelesen
    ).length;
  }, [chatMessages, currentUser]);

  // Initialize chat channels (Group channels + Direct message channels for each user pair)
  useEffect(() => {
    if (chatChannels.length === 0 && users.length > 0) {
      const initialChannels: ChatChannel[] = [
        {
          id: 'channel-1',
          name: 'allgemein',
          description: 'Allgemeiner Channel für alle',
          members: users,
          createdAt: new Date().toISOString(),
          createdBy: MOCK_USER,
          type: ChatChannelType.Group,
          isPrivate: false,
        },
        {
          id: 'channel-2',
          name: 'entwicklung',
          description: 'Entwicklungs-Diskussionen',
          members: users.filter(u => u.id === 'user-1' || u.id === 'user-2'),
          createdAt: new Date().toISOString(),
          createdBy: MOCK_USER,
          type: ChatChannelType.Group,
          isPrivate: false,
        },
      ];

      // Create Direct Message channels for each user pair
      const dmChannels: ChatChannel[] = [];
      for (let i = 0; i < users.length; i++) {
        for (let j = i + 1; j < users.length; j++) {
          const user1 = users[i];
          const user2 = users[j];
          dmChannels.push({
            id: `dm-${user1.id}-${user2.id}`,
            name: `${user1.name} & ${user2.name}`,
            members: [user1, user2],
            createdAt: new Date().toISOString(),
            createdBy: MOCK_USER,
            type: ChatChannelType.Direct,
          });
        }
      }

      setChatChannels([...initialChannels, ...dmChannels]);
    }
  }, [users, chatChannels.length]);

  // Load from localStorage/Supabase beim App-Start
  useEffect(() => {
    const loadFromSupabase = async () => {
      // Setze Loading State
      setIsDataLoaded(false);
      
      // Versuche zuerst aus localStorage zu laden (instant!)
      console.log('🔍 Prüfe localStorage Cache...');
      let cachedData = null;
      try {
        cachedData = loadFromLocalStorage();
      } catch (error) {
        console.error('❌ Fehler beim Laden aus localStorage:', error);
        // Cache ist korrupt, lösche ihn
        console.log('🗑️ Lösche korrupten localStorage Cache...');
        localStorage.removeItem('ctt_users');
        localStorage.removeItem('ctt_projects');
        localStorage.removeItem('ctt_timeEntries');
        localStorage.removeItem('ctt_absenceRequests');
      }
      
      if (cachedData) {
        console.log('⚡ Lade Daten aus localStorage Cache (instant)');
        console.log(`   📊 ${cachedData.users.length} Users, ${cachedData.projects.length} Projekte, ${cachedData.timeEntries.length} TimeEntries`);
        // Lade aus Cache
        if (cachedData.users.length > 0) {
          setUsers(cachedData.users);
          const activeUsers = cachedData.users.filter(u => u.status === UserStatus.Active);
          const lastUserId = localStorage.getItem('ctt_last_user_id');
          const lastUser = lastUserId ? activeUsers.find(u => u.id === lastUserId) : null;
          const adminUser = activeUsers.find(u => u.role === 'role-1' || u.role === 'admin');
          const fallbackUser = activeUsers[0] || null;
          setCurrentUser(lastUser || adminUser || fallbackUser || null);
        }
        
        if (cachedData.projects.length > 0) {
          setProjects(cachedData.projects);
          setHistory([cachedData.projects]);
          setHistoryIndex(0);
        }
        
        if (cachedData.timeEntries.length > 0) {
          setTimeEntries(cachedData.timeEntries);
        }
        
        if (cachedData.absenceRequests.length > 0) {
          setAbsenceRequests(cachedData.absenceRequests);
        }
        
        // Lade Session-Daten aus Cache
        if (cachedData.favoriteProjectIds) {
          setFavoriteProjectIds(cachedData.favoriteProjectIds);
        }
        if (cachedData.pinnedTasks) {
          setPinnedTasks(cachedData.pinnedTasks);
        }
        if (cachedData.dashboardNote) {
          setDashboardNote(cachedData.dashboardNote);
        }
        if (cachedData.selectedState) {
          setSelectedState(cachedData.selectedState as any);
        }
        if (cachedData.separateHomeOffice !== undefined) {
          setSeparateHomeOffice(cachedData.separateHomeOffice);
        }
        if (cachedData.showAdminsInDMs !== undefined) {
          setShowAdminsInDMs(cachedData.showAdminsInDMs);
        }
        if (cachedData.maxUploadSize) {
          setMaxUploadSize(cachedData.maxUploadSize);
        }
        
        console.log('✅ Daten aus Cache geladen!');
        setIsDataLoaded(true);
        return; // Fertig, kein Supabase-Load nötig
      }
      
      // Fallback: Versuche komprimiertes Backup aus Supabase (schnell!)
      console.log('📥 Kein Cache gefunden, versuche Supabase Backup...');
      const backupData = await loadCompressedBackupFromSupabase();
      
      if (backupData) {
        console.log('⚡ Lade aus Supabase Backup (schnell!)');
        // Lade aus Backup
        if (backupData.users.length > 0) {
          setUsers(backupData.users);
          const activeUsers = backupData.users.filter(u => u.status === UserStatus.Active);
          const lastUserId = localStorage.getItem('ctt_last_user_id');
          const lastUser = lastUserId ? activeUsers.find(u => u.id === lastUserId) : null;
          const adminUser = activeUsers.find(u => u.role === 'role-1' || u.role === 'admin');
          const fallbackUser = activeUsers[0] || null;
          setCurrentUser(lastUser || adminUser || fallbackUser || null);
        }
        
        if (backupData.projects.length > 0) {
          setProjects(backupData.projects);
          setHistory([backupData.projects]);
          setHistoryIndex(0);
        }
        
        if (backupData.timeEntries.length > 0) {
          setTimeEntries(backupData.timeEntries);
        }
        
        if (backupData.absenceRequests.length > 0) {
          setAbsenceRequests(backupData.absenceRequests);
        }
        
        console.log('✅ Daten aus Supabase Backup geladen!');
        setIsDataLoaded(true);
        
        // Speichere auch in localStorage Cache
        saveToLocalStorage(backupData.users, backupData.projects, backupData.timeEntries, backupData.absenceRequests, getSessionData());
        
        // Lade Chat-Daten aus Supabase (NACH Users, um Foreign Key zu erfüllen)
        if (backupData.users.length > 0) {
          console.log('💬 Lade Chat-Daten aus Supabase...');
          const chatData = await loadAllChatData();
          if (chatData) {
            console.log(`✅ Chat geladen: ${chatData.channels.length} Channels, ${chatData.messages.length} Messages`);
            setChatChannels(chatData.channels);
            // Markiere alle geladenen Nachrichten als gelesen (sind alte Nachrichten beim App-Start)
            const messagesWithReadStatus = chatData.messages.map(msg => {
              const readBy = msg.readBy || [];
              // Füge currentUser hinzu wenn nicht bereits vorhanden (alte Nachrichten sind immer gelesen)
              if (currentUser && !readBy.includes(currentUser.id)) {
                return { ...msg, readBy: [...readBy, currentUser.id] };
              }
              return { ...msg, readBy };
            });
            setChatMessages(messagesWithReadStatus);
          }
        }
        
        return;
      }
      
      // Letzter Fallback: Lade aus einzelnen Tabellen
      console.log('📥 Kein Backup gefunden, lade aus Tabellen...');
      const data = await loadAllData();
      
      if (data) {
        console.log(`✅ Daten aus Supabase Tabellen geladen: ${data.users.length} Users, ${data.projects.length} Projekte, ${data.timeEntries.length} TimeEntries`);
        
        // WICHTIG: Setze Daten auch wenn Arrays leer sind
        setUsers(data.users.length > 0 ? data.users : users);
        setProjects(data.projects.length > 0 ? data.projects : projects);
        setTimeEntries(data.timeEntries.length > 0 ? data.timeEntries : timeEntries);
        setAbsenceRequests(data.absenceRequests.length > 0 ? data.absenceRequests : absenceRequests);
        
        // Setze currentUser wenn vorhanden (nur aktive User, keine Maresa etc.)
        if (data.users.length > 0) {
          const activeUsers = data.users.filter(u => u.status === UserStatus.Active);
          const lastUserId = localStorage.getItem('ctt_last_user_id');
          const lastUser = lastUserId ? activeUsers.find(u => u.id === lastUserId) : null;
          const adminUser = activeUsers.find(u => u.role === 'role-1' || u.role === 'admin');
          const fallbackUser = activeUsers[0] || null;
          setCurrentUser(lastUser || adminUser || fallbackUser || null);
        }
        
        // Setze History wenn Projekte vorhanden
        if (data.projects.length > 0) {
          setHistory([data.projects]);
          setHistoryIndex(0);
        }
        
        console.log('🎉 Daten aus Supabase geladen!');
        setIsDataLoaded(true);
        
        // Lade Chat-Daten aus Supabase (NACH Users, um Foreign Key zu erfüllen)
        if (data.users.length > 0) {
          console.log('💬 Lade Chat-Daten aus Supabase...');
          const chatData = await loadAllChatData();
          if (chatData) {
            console.log(`✅ Chat geladen: ${chatData.channels.length} Channels, ${chatData.messages.length} Messages`);
            setChatChannels(chatData.channels);
            // Markiere alle geladenen Nachrichten als gelesen (sind alte Nachrichten beim App-Start)
            const messagesWithReadStatus = chatData.messages.map(msg => {
              const readBy = msg.readBy || [];
              // Füge currentUser hinzu wenn nicht bereits vorhanden (alte Nachrichten sind immer gelesen)
              if (currentUser && !readBy.includes(currentUser.id)) {
                return { ...msg, readBy: [...readBy, currentUser.id] };
              }
              return { ...msg, readBy };
            });
            setChatMessages(messagesWithReadStatus);
          }
        }
        
        // Speichere in localStorage Cache für nächsten Load (nur wenn Daten vorhanden)
        if (data.users.length > 0 || data.projects.length > 0 || data.timeEntries.length > 0) {
          console.log('💾 Speichere in localStorage Cache...');
          try {
            saveToLocalStorage(data.users, data.projects, data.timeEntries, data.absenceRequests, getSessionData());
            console.log('✅ Cache gespeichert');
          } catch (error) {
            console.error('⚠️ Fehler beim Speichern des Cache:', error);
          }
        } else {
          console.log('ℹ️ Keine Daten zum Cachen vorhanden');
        }
      } else {
        console.log('❌ Fehler beim Laden aus Supabase - verwende Mock-Daten');
      }
    };
    
    loadFromSupabase();
  }, []); // Leeres Dependency Array = nur beim Mount

  // Sequential Sync - Intelligente Sync-Strategie mit gestaffelten Intervallen
  useEffect(() => {
    console.log('🔄 Initialisiere Sequential Sync...');
    
    startSequentialSync((data) => {
      console.log('📥 Sync: Änderungen empfangen', {
        absenceRequests: data.absenceRequests.length,
        projects: data.projects.length,
        timeEntries: data.timeEntries.length,
        users: data.users.length,
      });
      
      // Update State mit neuen Daten (nur wenn vorhanden)
      if (data.absenceRequests.length > 0) {
        setAbsenceRequests(data.absenceRequests);
      }
      if (data.projects.length > 0) {
        setProjects(data.projects);
      }
      if (data.timeEntries.length > 0) {
        // WICHTIG: Nicht überschreiben, sondern MERGEN
        setTimeEntries(prev => {
          const map = new Map<string, TimeEntry>();
          prev.forEach(e => map.set(e.id, e));
          data.timeEntries.forEach(e => map.set(e.id, e));
          return Array.from(map.values());
        });
      }
      if (data.users.length > 0) {
        setUsers(data.users);
      }
      
      // Update localStorage Cache (debounced)
      debouncedSaveToCache();
    }, {
      // Gestaffelte Intervalle für optimale Performance
      timeEntries: { interval: 5, enabled: true },      // Alle 5s (häufig)
      projects: { interval: 10, enabled: true },        // Alle 10s
      absenceRequests: { interval: 20, enabled: true }, // Alle 20s
      users: { interval: 30, enabled: true },           // Alle 30s (selten)
    });
    
    // Cleanup beim Unmount
    return () => {
      console.log('🛑 Stoppe Sequential Sync (Component Unmount)');
      stopSequentialSync();
    };
  }, []); // Leeres Dependency Array = nur beim Mount/Unmount

  // Chat Realtime Sync - Empfängt Änderungen in Echtzeit
  useEffect(() => {
    const cleanup = startChatRealtime({
      onChannelUpsert: (channel) => {
        console.log('📥 Realtime: Channel Update empfangen', channel.name);
        setChatChannels(prev => {
          const exists = prev.find(c => c.id === channel.id);
          if (exists) {
            return prev.map(c => c.id === channel.id ? channel : c);
          } else {
            return [...prev, channel];
          }
        });
      },
      onChannelDelete: (channelId) => {
        console.log('📥 Realtime: Channel Löschung empfangen', channelId);
        setChatChannels(prev => prev.filter(c => c.id !== channelId));
        if (currentChatChannel?.id === channelId) {
          setCurrentChatChannel(null);
        }
      },
      onMessageInsert: (message) => {
        console.log('📥 Realtime: Neue Nachricht empfangen', message.content.substring(0, 30));
        setChatMessages(prev => {
          // Verhindere Duplikate (optimistic update könnte bereits existieren)
          if (prev.find(m => m.id === message.id)) return prev;
          return [...prev, message];
        });
      },
    });

    return cleanup;
  }, [currentChatChannel]); // Re-subscribe wenn currentChatChannel sich ändert

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
      
      // DEAKTIVIERT: Auto-Save aller Projekte bei jedem Update
      // Das führt zu zu vielen Schreiboperationen und Race Conditions
      // Stattdessen: Gezieltes Speichern nur bei wichtigen Operationen
      
      return newProjects;
    });
  }, [saveToHistory]);

  // OPTIMIERT: Timer-Update mit reduziertem Re-Rendering
  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | null = null;
    let tickCount = 0;
    
    if (activeTimerTaskId && activeTimeEntryId) {
      interval = setInterval(() => {
        tickCount++;
        
        // PERFORMANCE: taskTimers updaten (UI für Floating Button)
        setTaskTimers(prev => ({
          ...prev,
          [activeTimerTaskId]: (prev[activeTimerTaskId] || 0) + 1,
        }));
        
        // Update TimeEntry duration jede Sekunde für Echtzeit-Anzeige
        setTimeEntries(prev => {
          const index = prev.findIndex(entry => entry.id === activeTimeEntryId);
          if (index === -1) return prev;
          
          const newEntries = [...prev];
          const updatedEntry = { ...newEntries[index], duration: newEntries[index].duration + 1 };
          newEntries[index] = updatedEntry;
          
          // Auto-Save nur alle 5 Sekunden (DB-Sync)
          if (tickCount % 5 === 0) {
            saveTimeEntry(updatedEntry);
          }
          
          return newEntries;
        });
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
    setShowVacationAbsence(false);
    setShowTimeTracking(false);
    setShowTimeStatistics(false);
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
        setTimeEntries(prev => prev.map(entry => {
          if (entry.id === activeTimeEntryId) {
            const updatedEntry = { ...entry, endTime: new Date().toISOString() };
            saveTimeEntry(updatedEntry); // Auto-Save when timer stops
            return updatedEntry;
          }
          return entry;
        }));
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
      
      saveTimeEntry(newEntry); // Auto-Save when timer starts
      setTimeEntries(prev => [...prev, newEntry]);
      
      setActiveTimerTaskId(taskId);
      setActiveTimeEntryId(newEntryId);
      setTaskTimers(prev => ({ ...prev, [taskId]: 0 }));
    }
  }, [activeTimerTaskId, activeTimeEntryId, projects, currentUser]);

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
    
    // Auto-Save zu Supabase
    saveProject(newProject);
  }, [updateProjects]);

  const handleDeleteProject = useCallback((projectId: string) => {
    // Lösche aus State
    updateProjects(prev => prev.filter(p => p.id !== projectId));
    
    // Lösche zugehörige TimeEntries
    setTimeEntries(prev => prev.filter(te => te.projectId !== projectId));
    
    // Wenn das gelöschte Projekt ausgewählt war, deselektiere es
    if (selectedProject?.id === projectId) {
      setSelectedProject(null);
      setSelectedTask(null);
    }
    
    // Lösche aus Supabase
    deleteProjectFromSupabase(projectId);
  }, [updateProjects, selectedProject]);

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
        assignees: [currentUser!],
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
      assignees: [currentUser!],
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

  // Vacation & Absence Handlers
  const handleCreateAbsenceRequest = useCallback((request: Omit<AbsenceRequest, 'id' | 'createdAt' | 'updatedAt' | 'status'>, autoApprove?: boolean) => {
    const newRequest: AbsenceRequest = {
      ...request,
      id: `absence-${Date.now()}-${Math.random()}`,
      status: autoApprove ? AbsenceStatus.Approved : AbsenceStatus.Pending,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    saveAbsenceRequest(newRequest); // Auto-Save
    setAbsenceRequests(prev => [...prev, newRequest]);
  }, []);

  const handleApproveRequest = useCallback((requestId: string) => {
    setAbsenceRequests(prev => prev.map(req => {
      if (req.id === requestId) {
        const updatedRequest = { 
          ...req, 
          status: AbsenceStatus.Approved, 
          approvedBy: currentUser!,
          approvedAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        saveAbsenceRequest(updatedRequest); // Auto-Save
        return updatedRequest;
      }
      return req;
    }));
  }, [currentUser]);

  const handleRejectRequest = useCallback((requestId: string, reason: string) => {
    setAbsenceRequests(prev => prev.map(req => {
      if (req.id === requestId) {
        const updatedRequest = { 
          ...req, 
          status: AbsenceStatus.Rejected, 
          rejectedReason: reason,
          updatedAt: new Date().toISOString()
        };
        saveAbsenceRequest(updatedRequest); // Auto-Save
        return updatedRequest;
      }
      return req;
    }));
  }, []);

  const handleCancelRequest = useCallback((requestId: string) => {
    setAbsenceRequests(prev => prev.map(req => {
      if (req.id === requestId) {
        const updatedRequest = { 
          ...req, 
          status: AbsenceStatus.Cancelled,
          updatedAt: new Date().toISOString()
        };
        saveAbsenceRequest(updatedRequest); // Auto-Save
        return updatedRequest;
      }
      return req;
    }));
  }, []);

  const handleDeleteRequest = useCallback((requestId: string) => {
    deleteAbsenceRequest(requestId); // Auto-Delete from Supabase
    setAbsenceRequests(prev => prev.filter(req => req.id !== requestId));
  }, []);

  const handleMarkSickLeaveReported = (requestId: string) => {
    setAbsenceRequests(prev => prev.map(req => 
      req.id === requestId ? { ...req, sickLeaveReported: true } : req
    ));
  };

  // Chat Handlers
  const handleSendMessage = (content: string, channelId: string, projectId: string, attachments?: ChatAttachment[], messageId?: string) => {
    if (!currentUser) return;
    
    const newMessage: ChatMessage = {
      id: messageId || `msg-${Date.now()}`, // Verwende übergebene ID oder generiere neue
      channelId,
      projectId,
      content,
      sender: currentUser,
      timestamp: new Date().toISOString(),
      readBy: [currentUser.id],
      attachments: attachments || undefined,
    };
    
    // Optimistic update
    setChatMessages(prev => [...prev, newMessage]);
    
    // WICHTIG: Nur in Supabase speichern wenn KEINE Blob-URLs vorhanden sind!
    // Nachrichten mit Blob-URLs werden erst nach dem Upload gespeichert
    const hasBlobUrls = attachments?.some(att => att.url.startsWith('blob:'));
    if (!hasBlobUrls) {
      supaSaveChatMessage(newMessage);
    } else {
      console.log('⏳ Nachricht mit Blob-URL wird NICHT gespeichert, warte auf Upload:', newMessage.id);
    }
  };

  // Erstelle automatisch DM-Channels für alle User-Paare
  const ensureDirectMessageChannels = useCallback(() => {
    if (!currentUser || users.length === 0) return;
    
    const newChannels: ChatChannel[] = [];
    
    // Für jeden User (außer currentUser) prüfe ob ein DM-Channel existiert
    users.forEach(otherUser => {
      if (otherUser.id === currentUser.id) return;
      
      // Prüfe ob bereits ein DM-Channel zwischen diesen beiden Usern existiert
      const existingDM = chatChannels.find(channel => 
        channel.type === ChatChannelType.Direct &&
        channel.members.length === 2 &&
        channel.members.some(m => m.id === otherUser.id) &&
        channel.members.some(m => m.id === currentUser.id)
      );
      
      // Wenn kein Channel existiert, erstelle einen
      if (!existingDM) {
        const newChannel: ChatChannel = {
          id: `dm-${currentUser.id}-${otherUser.id}-${Date.now()}`,
          name: `${currentUser.name} & ${otherUser.name}`,
          description: '',
          members: [currentUser, otherUser],
          createdAt: new Date().toISOString(),
          createdBy: currentUser,
          type: ChatChannelType.Direct,
          isPrivate: true,
        };
        newChannels.push(newChannel);
      }
    });
    
    // Füge alle neuen Channels hinzu
    if (newChannels.length > 0) {
      console.log(`📨 Erstelle ${newChannels.length} neue DM-Channels`);
      setChatChannels(prev => [...prev, ...newChannels]);
      // Persist alle neuen Channels
      newChannels.forEach(channel => saveChatChannel(channel));
    }
  }, [currentUser, users, chatChannels]);

  // Stelle sicher, dass DM-Channels existieren wenn Users sich ändern
  // OPTIMIERT: Debounced um häufige Updates zu vermeiden
  const debouncedEnsureDMChannels = useDebouncedCallback(
    () => {
      ensureDirectMessageChannels();
    },
    1000 // 1 Sekunde Debounce
  );

  useEffect(() => {
    debouncedEnsureDMChannels();
  }, [users, debouncedEnsureDMChannels]);

  const handleCreateChannel = (name: string, description: string, memberIds: string[], isPrivate: boolean = false) => {
    if (!currentUser) return;
    
    const members = users.filter(u => memberIds.includes(u.id));
    const newChannel: ChatChannel = {
      id: `channel-${Date.now()}`,
      name,
      description,
      members,
      createdAt: new Date().toISOString(),
      createdBy: currentUser,
      type: ChatChannelType.Group,
      isPrivate,
    };
    
    // Optimistic add
    setChatChannels(prev => [...prev, newChannel]);
    // Persist
    saveChatChannel(newChannel);
  };

  const handleUpdateChannel = (channelId: string, name: string, description: string, memberIds: string[], isPrivate: boolean) => {
    const members = users.filter(u => memberIds.includes(u.id));
    const updated = (prev: ChatChannel) => ({ ...prev, name, description, members, isPrivate });
    setChatChannels(prev => prev.map(channel =>
      channel.id === channelId
        ? updated(channel)
        : channel
    ));
    const channelObj = chatChannels.find(c => c.id === channelId);
    if (channelObj) {
      const merged: ChatChannel = { ...channelObj, name, description, members, isPrivate };
      supaUpdateChatChannel(merged);
    }
  };

  const handleDeleteChannel = (channelId: string) => {
    setChatChannels(prev => prev.filter(c => c.id !== channelId));
    // Wenn der gelöschte Channel aktuell ausgewählt ist, wechsle zu einem anderen
    if (currentChatChannel?.id === channelId) {
      const remainingChannels = chatChannels.filter(c => c.id !== channelId);
      setCurrentChatChannel(remainingChannels.length > 0 ? remainingChannels[0] : null);
    }
    // Persist delete
    supaDeleteChatChannel(channelId);
  };

  const handleSwitchChatChannel = (channelId: string) => {
    const channel = chatChannels.find(c => c.id === channelId);
    if (channel) {
      setCurrentChatChannel(channel);
    }
  };

  const handleSwitchChatProject = (projectId: string) => {
    if (!projectId) {
      // Ohne Projekt: Nutzer hat explizit entfernt -> locken
      setCurrentChatProject(null);
      setChatProjectLocked(true);
    } else {
      const project = projects.find(p => p.id === projectId);
      if (project) {
        setCurrentChatProject(project);
        setChatProjectLocked(false);
      }
    }
  };

  const handleToggleShowAdminsInDMs = (show: boolean) => {
    setShowAdminsInDMs(show);
    localStorage.setItem('ctt_show_admins_in_dms', JSON.stringify(show));
  };

  const handleMaxUploadSizeChange = (size: number) => {
    setMaxUploadSize(size);
    localStorage.setItem('ctt_max_upload_size', size.toString());
  };

  const handleEditMessage = (messageId: string, newContent: string) => {
    setChatMessages(prev => prev.map(msg =>
      msg.id === messageId
        ? { ...msg, content: newContent, edited: true, editedAt: new Date().toISOString() }
        : msg
    ));
    // TODO: Persist to Supabase
    console.log('Edit message:', messageId, newContent);
  };

  const handleUpdateMessageAttachments = (messageId: string, attachments: ChatAttachment[]) => {
    // Optimistic update - sofort im UI anzeigen
    setChatMessages(prev => prev.map(msg => {
      if (msg.id === messageId) {
        const updatedMsg = { ...msg, attachments };
        
        // WICHTIG: Jetzt wo wir echte URLs haben, speichere die Nachricht in Supabase!
        // Das ist der erste Zeitpunkt wo die Nachricht mit echten URLs existiert
        const hasBlobUrls = attachments.some(att => att.url.startsWith('blob:'));
        if (!hasBlobUrls) {
          console.log('✅ Speichere Nachricht mit echten URLs in Supabase:', messageId);
          supaSaveChatMessage(updatedMsg);
        }
        
        return updatedMsg;
      }
      return msg;
    }));
    
    // Update auch die Attachments in Supabase (falls Nachricht schon existiert)
    supaUpdateChatMessageAttachments(messageId, attachments);
    console.log('Updated message attachments:', messageId, attachments);
  };

  const handleDeleteMessage = async (messageId: string) => {
    // Find message to get attachments
    const message = chatMessages.find(msg => msg.id === messageId);
    
    // Delete attachments from storage if any
    // BUT: Only delete if no other message uses the same attachment URL
    if (message?.attachments && message.attachments.length > 0) {
      const { deleteChatFile } = await import('./utils/fileUpload');
      for (const attachment of message.attachments) {
        try {
          // Check if any other message uses this attachment
          const isUsedElsewhere = chatMessages.some(msg => 
            msg.id !== messageId && 
            msg.attachments?.some(att => att.url === attachment.url)
          );
          
          // Only delete if not used by other messages
          if (!isUsedElsewhere) {
            await deleteChatFile(attachment.url);
            console.log('Deleted attachment:', attachment.name);
          } else {
            console.log('Attachment still in use, keeping:', attachment.name);
          }
        } catch (error) {
          console.error('Error deleting attachment:', error);
        }
      }
    }
    
    setChatMessages(prev => prev.filter(msg => msg.id !== messageId));
    // TODO: Persist to Supabase
    console.log('Delete message:', messageId);
  };

  const handleDeleteAllMessages = async () => {
    const { deleteAllChatMessages } = await import('./utils/supabaseSync');
    const success = await deleteAllChatMessages();
    
    if (success) {
      // Clear local state
      setChatMessages([]);
      console.log('✅ Alle Chat-Nachrichten gelöscht');
    } else {
      console.error('❌ Fehler beim Löschen der Nachrichten');
    }
  };

  const handleReactToMessage = (messageId: string, emoji: string) => {
    setChatMessages(prev => prev.map(msg => {
      if (msg.id !== messageId) return msg;
      
      const reactions = { ...msg.reactions };
      const userIds = reactions[emoji] || [];
      
      // Toggle reaction: add if not present, remove if present
      if (userIds.includes(currentUser!.id)) {
        reactions[emoji] = userIds.filter(id => id !== currentUser!.id);
        if (reactions[emoji].length === 0) {
          delete reactions[emoji];
        }
      } else {
        reactions[emoji] = [...userIds, currentUser!.id];
      }
      
      return { ...msg, reactions };
    }));
    // TODO: Persist to Supabase
    console.log('React to message:', messageId, emoji);
  };

  // Initialize chat channel and project when opening chat
  useEffect(() => {
    if (showChat && !currentChatChannel && chatChannels.length > 0) {
      setCurrentChatChannel(chatChannels[0]);
    }
    // Setze nur beim Öffnen bzw. wenn kein Lock aktiv ist
    if (showChat && !currentChatProject && selectedProject && !chatProjectLocked) {
      setCurrentChatProject(selectedProject);
    }
  }, [showChat, currentChatChannel, chatChannels, currentChatProject, selectedProject, chatProjectLocked]);

  // Markiere Nachrichten als gelesen nach 1 Sekunde wenn Channel geöffnet ist
  useEffect(() => {
    if (!showChat || !currentChatChannel || !currentUser) return;

    // Warte 1 Sekunde bevor Nachrichten als gelesen markiert werden
    const timer = setTimeout(() => {
      setChatMessages(prev => {
        const hasUnread = prev.some(msg => 
          msg.channelId === currentChatChannel.id && 
          msg.sender.id !== currentUser.id && 
          !msg.readBy.includes(currentUser.id)
        );
        
        // Nur updaten wenn es tatsächlich ungelesene Nachrichten gibt
        if (!hasUnread) return prev;
        
        console.log(`✅ Markiere Nachrichten in Channel ${currentChatChannel.name} als gelesen (nach 1 Sek.)`);
        
        return prev.map(msg => {
          if (msg.channelId === currentChatChannel.id && 
              msg.sender.id !== currentUser.id && 
              !msg.readBy.includes(currentUser.id)) {
            return { ...msg, readBy: [...msg.readBy, currentUser.id] };
          }
          return msg;
        });
      });
    }, 1000); // 1 Sekunde warten

    // Cleanup: Timer abbrechen wenn Channel gewechselt wird
    return () => clearTimeout(timer);
  }, [showChat, currentChatChannel?.id, currentUser?.id]);

  const handleAddComment = useCallback((requestId: string, message: string) => {
    setAbsenceRequests(prev => prev.map(req => 
      req.id === requestId 
        ? { 
            ...req, 
            comments: [
              ...(req.comments || []),
              {
                id: `comment-${Date.now()}`,
                user: currentUser!,
                message,
                timestamp: new Date().toISOString(),
                read: false,
              }
            ],
            updatedAt: new Date().toISOString()
          }
        : req
    ));
  }, [currentUser]);

  const handleMarkCommentsRead = useCallback((requestId: string) => {
    setAbsenceRequests(prev => prev.map(req => 
      req.id === requestId 
        ? { 
            ...req, 
            comments: req.comments?.map(c => ({ ...c, read: true })),
            updatedAt: new Date().toISOString()
          }
        : req
    ));
  }, []);

  // Berechne ausstehende Anträge für Admins
  const pendingAbsenceRequests = useMemo(() => {
    return absenceRequests.filter(req => req.status === AbsenceStatus.Pending);
  }, [absenceRequests]);

  const isAdmin = currentUser?.role === 'role-1';

  const handleUpdateTimeEntry = useCallback((entryId: string, startTime: string, endTime: string, note?: string, projectId?: string, taskId?: string) => {
    setTimeEntries(prev => prev.map(entry => {
      if (entry.id === entryId) {
        const start = new Date(startTime);
        
        // Finde Projekt- und Task-Namen wenn IDs übergeben wurden
        let projectName = entry.projectName;
        let taskTitle = entry.taskTitle;
        let actualProjectId = entry.projectId;
        let actualTaskId = entry.taskId;
        
        if (projectId && taskId) {
          const project = projects.find(p => p.id === projectId);
          if (project) {
            projectName = project.name;
            actualProjectId = projectId;
            actualTaskId = taskId;
            
            // Finde Task oder Subtask
            for (const list of project.taskLists) {
              const task = list.tasks.find(t => t.id === taskId);
              if (task) {
                taskTitle = task.title;
                break;
              }
              for (const task of list.tasks) {
                const subtask = task.subtasks.find(st => st.id === taskId);
                if (subtask) {
                  taskTitle = `${task.title} → ${subtask.title}`;
                  break;
                }
              }
            }
          }
        }
        
        // Wenn endTime leer ist, Timer läuft weiter - berechne duration bis jetzt
        if (!endTime) {
          const now = new Date();
          const duration = Math.floor((now.getTime() - start.getTime()) / 1000);
          // Update taskTimers mit neuer duration
          setTaskTimers(prev => ({ ...prev, [actualTaskId]: duration }));
          const updatedEntry = { ...entry, startTime, duration, note, projectId: actualProjectId, projectName, taskId: actualTaskId, taskTitle };
          saveTimeEntry(updatedEntry); // Auto-Save
          return updatedEntry;
        }
        
        // Ansonsten normale Berechnung mit endTime
        const end = new Date(endTime);
        const duration = Math.floor((end.getTime() - start.getTime()) / 1000);
        const updatedEntry = { ...entry, startTime, endTime, duration, note, projectId: actualProjectId, projectName, taskId: actualTaskId, taskTitle };
        saveTimeEntry(updatedEntry); // Auto-Save
        return updatedEntry;
      }
      return entry;
    }));
  }, [projects]);

  const handleDeleteTimeEntry = useCallback((entryId: string) => {
    // Stoppe aktiven Timer falls dieser Eintrag gerade läuft
    if (activeTimeEntryId === entryId) {
      setActiveTimerTaskId(null);
      setActiveTimeEntryId(null);
    }
    
    deleteTimeEntry(entryId); // Auto-Delete from Supabase
    setTimeEntries(prev => prev.filter(entry => entry.id !== entryId));
  }, [activeTimeEntryId]);

  const handleEditTimeEntry = useCallback((entry: TimeEntry) => {
    setEditingTimeEntry(entry);
    setTimerMenuAnchor(null); // Center on screen
    setShowTimerMenu(true);
  }, []);

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
    
    saveTimeEntry(newEntry); // Auto-Save
    setTimeEntries(prev => [...prev, newEntry]);
  }, [currentUser]);

  const handleImportTimeEntries = useCallback((entries: Omit<TimeEntry, 'id'>[]) => {
    const newEntries = entries.map((entry, index) => ({
      ...entry,
      id: `import-${Date.now()}-${index}`,
    }));
    
    // DEAKTIVIERT: Auto-Save beim Import führt zu zu vielen parallelen Requests
    // und Foreign Key Errors wenn User nicht in Supabase existieren.
    // Stattdessen: Nutze "Alle Daten in Supabase speichern" nach dem Import.
    // newEntries.forEach(entry => saveTimeEntry(entry));
    
    console.log(`✅ ${newEntries.length} TimeEntries importiert (noch nicht in Supabase gespeichert)`);
    console.log(`ℹ️ Gehe zu Settings → Supabase → "Alle Daten in Supabase speichern" um die Daten zu persistieren`);
    
    setTimeEntries(prev => [...prev, ...newEntries]);
  }, []);

  const handleImportAbsences = useCallback((absences: Omit<AbsenceRequest, 'id' | 'createdAt' | 'updatedAt' | 'status'>[]) => {
    const newAbsences = absences.map((absence, index) => ({
      ...absence,
      id: `import-absence-${Date.now()}-${index}`,
      status: AbsenceStatus.Approved, // Auto-approve imported absences
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }));
    
    // Auto-Save: importierte Abwesenheiten direkt in Supabase speichern
    newAbsences.forEach(abs => saveAbsenceRequest(abs));

    setAbsenceRequests(prev => [...prev, ...newAbsences]);
  }, []);

  const handleUpdateTaskAssignees = useCallback((taskId: string, assignees: User[]) => {
    updateProjects(prevProjects => {
      const updatedProjects = prevProjects.map(p => {
        const updatedProject = {
          ...p,
          taskLists: p.taskLists.map(list => ({
            ...list,
            tasks: list.tasks.map(t => {
              if (t.id === taskId) {
                return { ...t, assignees };
              }
              // Check subtasks
              const subtaskIndex = t.subtasks.findIndex(st => st.id === taskId);
              if (subtaskIndex > -1) {
                const updatedSubtasks = [...t.subtasks];
                updatedSubtasks[subtaskIndex] = { ...updatedSubtasks[subtaskIndex], assignees };
                return { ...t, subtasks: updatedSubtasks };
              }
              return t;
            })
          }))
        };
        
        // Sync to Supabase if this project was modified
        const wasModified = updatedProject.taskLists.some(list => 
          list.tasks.some(t => 
            t.id === taskId || t.subtasks.some(st => st.id === taskId)
          )
        );
        if (wasModified) {
          saveProject(updatedProject);
        }
        
        return updatedProject;
      });
      return updatedProjects;
    });
  }, [updateProjects]);

  const handleUpdateProject = useCallback((updatedProject: Project) => {
    updateProjects(prevProjects => prevProjects.map(p => 
      p.id === updatedProject.id ? updatedProject : p
    ));
    // Sync to Supabase
    saveProject(updatedProject);
  }, [updateProjects]);

  const handleStartTimeTracking = useCallback((projectId: string, taskId: string) => {
    // Stoppe aktiven Timer falls vorhanden
    if (activeTimerTaskId && activeTimeEntryId) {
      setTimeEntries(prev => prev.map(entry => {
        if (entry.id === activeTimeEntryId) {
          const updatedEntry = { ...entry, endTime: new Date().toISOString() };
          saveTimeEntry(updatedEntry);
          return updatedEntry;
        }
        return entry;
      }));
    }

    // Starte neuen Timer
    const newEntryId = `entry-${Date.now()}`;
    const now = new Date().toISOString();
    
    // Finde Task-Informationen
    let taskTitle = '';
    let listTitle = '';
    let projectName = '';
    
    const project = projects.find(p => p.id === projectId);
    if (project) {
      projectName = project.name;
      project.taskLists.forEach(list => {
        list.tasks.forEach(task => {
          if (task.id === taskId) {
            taskTitle = task.title;
            listTitle = list.title;
          }
          task.subtasks.forEach(subtask => {
            if (subtask.id === taskId) {
              taskTitle = subtask.title;
              listTitle = list.title;
            }
          });
        });
      });
    }
    
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
    
    saveTimeEntry(newEntry);
    setTimeEntries(prev => [...prev, newEntry]);
    
    setActiveTimerTaskId(taskId);
    setActiveTimeEntryId(newEntryId);
    setTaskTimers(prev => ({ ...prev, [taskId]: 0 }));
  }, [activeTimerTaskId, activeTimeEntryId, projects, currentUser]);

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
    saveUser(newUser); // Auto-Save
    setUsers(prev => [...prev, newUser]);
  }, []);

  const handleUpdateUser = useCallback((userId: string, userData: Partial<User>) => {
    setUsers(prev => prev.map(u => {
      if (u.id === userId) {
        const updatedUser = { ...u, ...userData };
        saveUser(updatedUser); // Auto-Save
        return updatedUser;
      }
      return u;
    }));
  }, []);

  const handleDeleteUser = useCallback((userId: string) => {
    deleteUserFromSupabase(userId); // Auto-Delete from Supabase
    setUsers(prev => {
      const updatedUsers = prev.filter(u => u.id !== userId);
      // Update localStorage Cache sofort
      saveToLocalStorage(updatedUsers, projects, timeEntries, absenceRequests, getSessionData());
      return updatedUsers;
    });
  }, [projects, timeEntries, absenceRequests]);

  const handleChangeRole = useCallback((userId: string, roleId: string) => {
    setUsers(prev => {
      const updated = prev.map(u => {
        if (u.id === userId) {
          const updatedUser = { ...u, role: roleId };
          // Sync to Supabase
          saveUser(updatedUser);
          return updatedUser;
        }
        return u;
      });
      return updated;
    });
  }, []);

  const handleChangeUserStatus = useCallback((userId: string, status: UserStatus) => {
    setUsers(prev => {
      const updated = prev.map(u => {
        if (u.id === userId) {
          const updatedUser = { ...u, status };
          // Sync to Supabase
          saveUser(updatedUser);
          return updatedUser;
        }
        return u;
      });
      return updated;
    });
  }, []);

  const handleChangeCurrentUserRole = useCallback((roleId: string) => {
    if (currentUser) {
      const updatedUser = { ...currentUser, role: roleId };
      setCurrentUser(updatedUser);
      setUsers(prev => prev.map(u => u.id === currentUser.id ? updatedUser : u));
      // Sync to Supabase
      saveUser(updatedUser);
    }
  }, [currentUser]);

  const handleChangeUser = useCallback((userId: string) => {
    const newUser = users.find(u => u.id === userId);
    if (newUser) {
      setCurrentUser(newUser);
      // Beim User-Wechsel Notifications kurz deaktivieren bis neu berechnet
      setNotificationsReady(false);
      // Lade Favoriten des neuen Users
      setFavoriteProjectIds(newUser.favoriteProjects || []);
      // Save to localStorage
      localStorage.setItem('ctt_last_user_id', newUser.id);
    }
  }, [users]);
  
  // Save current user to localStorage whenever it changes
  useEffect(() => {
    if (currentUser) {
      localStorage.setItem('ctt_last_user_id', currentUser.id);
      // Update Favoriten wenn User sich ändert
      setFavoriteProjectIds(currentUser.favoriteProjects || []);
    }
  }, [currentUser]);

  const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);

  // Helper: Sammle alle Session-Daten für Cache
  const getSessionData = useCallback(() => ({
    favoriteProjectIds,
    pinnedTasks,
    dashboardNote,
    selectedState,
    separateHomeOffice,
    showAdminsInDMs,
    maxUploadSize
  }), [favoriteProjectIds, pinnedTasks, dashboardNote, selectedState, separateHomeOffice, showAdminsInDMs, maxUploadSize]);

  // Debounced Cache-Speicherung (verhindert zu häufige Schreibzugriffe)
  const debouncedSaveToCache = useDebouncedCallback(
    () => {
      try {
        saveToLocalStorage(users, projects, timeEntries, absenceRequests, getSessionData());
        console.log('✅ Cache gespeichert (debounced)');
      } catch (error) {
        console.error('⚠️ Fehler beim Speichern des Cache:', error);
      }
    },
    2000 // 2 Sekunden Debounce
  );

  // Favoriten Toggle Handler mit User-Update
  const handleToggleFavorite = useCallback((projectId: string) => {
    if (!currentUser) return;
    
    setFavoriteProjectIds(prev => {
      const newFavorites = prev.includes(projectId)
        ? prev.filter(id => id !== projectId) // Entfernen
        : [...prev, projectId]; // Hinzufügen
      
      // Update User mit neuen Favoriten
      const updatedUser = { ...currentUser, favoriteProjects: newFavorites };
      setCurrentUser(updatedUser);
      
      // Update auch in users-Array
      setUsers(prevUsers => prevUsers.map(u => 
        u.id === currentUser.id ? updatedUser : u
      ));
      
      // Sync mit Supabase
      saveUser(updatedUser);
      
      return newFavorites;
    });
  }, [currentUser]);

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

  const handleResolveAnomaly = useCallback(async (anomaly: Anomaly) => {
    // Toggle Status: OPEN <-> RESOLVED
    const nextStatus = anomaly.status === AnomalyStatus.Resolved
      ? AnomalyStatus.Open
      : AnomalyStatus.Resolved;
    
    // Update local state immediately for instant UI feedback
    updateAnomalyStatusLocal(anomaly.userId, anomaly.date, anomaly.type, nextStatus);
    
    // Update in Supabase (Realtime sync will keep other clients in sync)
    const anomalyId = `${anomaly.userId}-${anomaly.date}-${anomaly.type}`;
    await updateAnomalyStatus(
      anomalyId,
      nextStatus,
      currentUser?.id || ''
    );
  }, [currentUser, updateAnomalyStatusLocal]);
  
  const handleMuteAnomaly = useCallback(async (anomaly: Anomaly) => {
    // Toggle Status: OPEN <-> MUTED
    const nextStatus = anomaly.status === AnomalyStatus.Muted
      ? AnomalyStatus.Open
      : AnomalyStatus.Muted;
    
    // Update local state immediately for instant UI feedback
    updateAnomalyStatusLocal(anomaly.userId, anomaly.date, anomaly.type, nextStatus);
    
    // Update in Supabase (Realtime sync will keep other clients in sync)
    const anomalyId = `${anomaly.userId}-${anomaly.date}-${anomaly.type}`;
    await updateAnomalyStatus(
      anomalyId,
      nextStatus,
      currentUser?.id || ''
    );
  }, [currentUser, updateAnomalyStatusLocal]);

  const handleAddAnomalyComment = useCallback(async (anomaly: Anomaly, message: string) => {
    if (!currentUser) return;
    
    const newComment: AnomalyComment = {
      id: `comment-${Date.now()}`,
      userId: currentUser.id,
      message,
      timestamp: new Date().toISOString(),
      user: {
        id: currentUser.id,
        name: currentUser.name,
        avatarUrl: currentUser.avatarUrl
      }
    };
    
    // Update local state immediately for instant UI feedback
    const updatedComments = [...(anomaly.comments || []), newComment];
    updateAnomalyCommentsLocal(anomaly.userId, anomaly.date, anomaly.type, updatedComments);
    
    // Speichere in Supabase (Realtime sync will keep other clients in sync)
    const anomalyId = `${anomaly.userId}-${anomaly.date}-${anomaly.type}`;
    await addAnomalyComment(anomalyId, newComment);
  }, [currentUser, updateAnomalyCommentsLocal]);

  const handleSelectAnomaly = useCallback((anomaly: Anomaly) => {
    setTargetAnomaly(anomaly);
    setShowNotifications(false);
    
    const isAdmin = currentUser?.role === 'role-1';
    
    if (isAdmin) {
      setShowTimeStatistics(true);
      setShowDashboard(false);
      setShowProjectsOverview(false);
      setShowVacationAbsence(false);
      setShowTimeTracking(false);
      setShowSettings(false);
    } else {
      // User -> TimeTracking (Meine Zeiten) in Übersicht mit Scroll zu Wochenansicht
      setShowTimeTracking(true);
      setShowTimeStatistics(false);
      setShowDashboard(false);
      setShowProjectsOverview(false);
      setShowVacationAbsence(false);
      setShowSettings(false);
      
      // Scroll zur Wochenansicht nach kurzer Verzögerung (damit Component gemountet ist)
      setTimeout(() => {
        const weekChartElement = document.getElementById('week-chart-section');
        if (weekChartElement) {
          weekChartElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 100);
    }
  }, [currentUser]);

  if (!currentUser) {
    return <LoginScreen users={users} onLogin={setCurrentUser} />;
  }

  return (
    <div className="flex flex-col h-screen font-sans text-sm relative">
      {/* Loading Screen Overlay - fadet aus wenn Daten geladen */}
      <div 
        className="absolute inset-0 z-50"
        style={{
          opacity: isDataLoaded ? 0 : 1,
          pointerEvents: isDataLoaded ? 'none' : 'auto',
          transition: 'opacity 2s cubic-bezier(0.16, 1, 0.3, 1)',
          willChange: 'opacity',
          backfaceVisibility: 'hidden',
          transform: 'translateZ(0)'
        }}
      >
        <LoadingScreen message="Projekte werden geladen..." />
      </div>
      
      {/* Main App Content - wird im Hintergrund gerendert */}
      <div className="flex flex-col h-screen font-sans text-sm">
      <TopBar
        user={currentUser}
        users={users}
        roles={MOCK_ROLES}
        canUndo={canUndo}
        canRedo={canRedo}
        onUndo={undo}
        onRedo={redo}
        onChangeRole={(roleId) => {
          const role = MOCK_ROLES.find(r => r.id === roleId);
          if (currentUser && role) {
            // Temporäres Update für UI
            setCurrentUser({ ...currentUser, role: roleId });
          }
        }}
        onChangeUser={(userId) => {
          const user = users.find(u => u.id === userId);
          if (user) {
            setCurrentUser(user);
            // Speichere Auswahl
            localStorage.setItem('ctt_last_user_id', userId);
            // Reset selection
            setSelectedProject(null);
            setSelectedTask(null);
          }
        }}
        onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
        absenceRequests={absenceRequests}
        anomalies={anomalies}
        onOpenNotifications={() => setShowNotifications(true)}
        notificationsReady={notificationsReady}
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
          setShowVacationAbsence(false);
          setShowTimeTracking(false);
          setShowTimeStatistics(false);
          setSelectedProject(null);
          setSelectedTask(null);
          setShowSettings(false);
          setIsSidebarOpen(false); // Close sidebar
        }}
        onSelectProjectsOverview={() => {
          setShowProjectsOverview(true);
          setShowDashboard(false);
          setShowVacationAbsence(false);
          setShowTimeTracking(false);
          setShowTimeStatistics(false);
          setSelectedProject(null);
          setSelectedTask(null);
          setShowSettings(false);
          setIsSidebarOpen(false); // Close sidebar
        }}
        onSelectVacationAbsence={() => {
          setShowVacationAbsence(true);
          setShowDashboard(false);
          setShowProjectsOverview(false);
          setShowTimeTracking(false);
          setShowTimeStatistics(false);
          setSelectedProject(null);
          setSelectedTask(null);
          setShowSettings(false);
          setIsSidebarOpen(false); // Close sidebar
        }}
        onSelectTimeTracking={() => {
          setShowTimeTracking(true);
          setShowDashboard(false);
          setShowProjectsOverview(false);
          setShowVacationAbsence(false);
          setShowTimeStatistics(false);
          setSelectedProject(null);
          setSelectedTask(null);
          setShowSettings(false);
          setIsSidebarOpen(false); // Close sidebar
        }}
        onSelectTimeStatistics={() => {
          setShowTimeStatistics(true);
          setShowDashboard(false);
          setShowProjectsOverview(false);
          setShowVacationAbsence(false);
          setShowTimeTracking(false);
          setSelectedProject(null);
          setSelectedTask(null);
          setShowSettings(false);
          setIsSidebarOpen(false); // Close sidebar
        }}
        onSelectSettings={() => {
          setShowSettings(true);
          setShowDashboard(false);
          setShowProjectsOverview(false);
          setShowVacationAbsence(false);
          setShowTimeTracking(false);
          setShowTimeStatistics(false);
          setSelectedProject(null);
          setSelectedTask(null);
          setIsSidebarOpen(false); // Close sidebar
        }}
        favoriteProjectIds={favoriteProjectIds}
        onToggleFavorite={handleToggleFavorite}
      />
      
        <main className="flex-1 flex flex-col p-4 md:p-6 overflow-y-auto transition-all duration-300">
        {!currentUser ? (
          <div className="flex items-center justify-center h-full text-text-secondary">
            <p>Laden...</p>
          </div>
        ) : showDashboard ? (
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
            onDeleteTimeEntry={handleDeleteTimeEntry}
            onNavigateToTask={(projectId, taskId) => {
              // Finde das Projekt
              const project = projects.find(p => p.id === projectId);
              if (project) {
                setSelectedProject(project);
                
                // Finde die Task oder Subtask
                let foundTask: Task | Subtask | null = null;
                for (const list of project.taskLists) {
                  const task = list.tasks.find(t => t.id === taskId);
                  if (task) {
                    foundTask = task;
                    break;
                  }
                  for (const task of list.tasks) {
                    const subtask = task.subtasks.find(st => st.id === taskId);
                    if (subtask) {
                      foundTask = subtask;
                      break;
                    }
                  }
                  if (foundTask) break;
                }
                
                if (foundTask) {
                  setSelectedTask(foundTask);
                }
                
                // Schließe Dashboard
                setShowDashboard(false);
              }
            }}
            onProjectChange={(projectId, taskId) => {
              // Finde den aktuell bearbeiteten TimeEntry
              const currentEntry = timeEntries.find(e => e.id === (editingTimeEntry?.id || activeTimeEntryId));
              if (currentEntry) {
                handleUpdateTimeEntry(currentEntry.id, currentEntry.startTime, currentEntry.endTime || '', currentEntry.note, projectId, taskId);
              }
            }}
          />
        ) : showProjectsOverview ? (
          isDataLoaded ? (
            <ProjectsOverview
              projects={projects}
              onSelectProject={handleSelectProject}
              onDeleteProject={handleDeleteProject}
              favoriteProjectIds={favoriteProjectIds}
              onToggleFavorite={handleToggleFavorite}
            />
          ) : (
            <LoadingScreen message="Projekte werden geladen..." />
          )
        ) : showVacationAbsence ? (
          isDataLoaded ? (
            <VacationAbsence
            absenceRequests={absenceRequests}
            currentUser={currentUser}
            allUsers={users}
            timeEntries={timeEntries}
            onCreateRequest={handleCreateAbsenceRequest}
            onApproveRequest={handleApproveRequest}
            onRejectRequest={handleRejectRequest}
            onCancelRequest={handleCancelRequest}
            onDeleteRequest={handleDeleteRequest}
            onMarkSickLeaveReported={handleMarkSickLeaveReported}
            onOpenRequestChat={(request) => {
              setSelectedNotificationRequestId(request.id);
              setShowNotifications(true);
            }}
            isAdmin={currentUser?.role === 'role-1'}
            selectedState={selectedState}
            separateHomeOffice={separateHomeOffice}
          />
          ) : (
            <LoadingScreen message="Urlaub & Abwesenheit werden geladen..." />
          )
        ) : showTimeTracking ? (
          isDataLoaded ? (
            <TimeTracking
            timeEntries={timeEntries}
            currentUser={currentUser}
            absenceRequests={absenceRequests}
            users={users}
            anomalies={anomalies}
            targetAnomaly={targetAnomaly}
            onUpdateTimeEntry={handleUpdateTimeEntry}
            onBillableChange={handleBillableChange}
            onToggleTimer={handleToggleTimer}
            onDeleteTimeEntry={handleDeleteTimeEntry}
            onDuplicateTimeEntry={handleDuplicateTimeEntry}
            onEditEntry={handleEditTimeEntry}
            activeTimerTaskId={activeTimerTaskId}
          />
          ) : (
            <LoadingScreen message="Zeiterfassung wird geladen..." />
          )
        ) : showTimeStatistics ? (
          isDataLoaded ? (
            <TimeStatistics
            users={users}
            timeEntries={timeEntries}
            absenceRequests={absenceRequests}
            currentUser={currentUser}
            targetAnomaly={targetAnomaly}
            projects={projects}
            anomalies={anomalies}
            onUpdateTimeEntry={handleUpdateTimeEntry}
            onBillableChange={handleBillableChange}
            onToggleTimer={handleToggleTimer}
            onDeleteTimeEntry={handleDeleteTimeEntry}
            onDuplicateTimeEntry={handleDuplicateTimeEntry}
            onEditEntry={handleEditTimeEntry}
            onResolveAnomaly={handleResolveAnomaly}
            onMuteAnomaly={handleMuteAnomaly}
            onAddAnomalyComment={handleAddAnomalyComment}
          />
          ) : (
            <LoadingScreen message="Zeitauswertungen werden geladen..." />
          )
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
            onEditEntry={handleEditTimeEntry}
            onImportEntries={handleImportTimeEntries}
            onImportAbsences={handleImportAbsences}
            currentUser={currentUser}
            allUsers={MOCK_USERS}
            onUpdateTaskAssignees={handleUpdateTaskAssignees}
            onUpdateProject={handleUpdateProject}
            favoriteProjectIds={favoriteProjectIds}
            onToggleFavorite={handleToggleFavorite}
            onOpenChat={() => {
              setShowChat(true);
              // Setze das aktuelle Projekt für den Chat
              if (selectedProject) {
                setCurrentChatProject(selectedProject);
              }
            }}
            onOpenTimeTracking={() => setShowStartTimeTrackingModal(true)}
            unreadMessagesCount={unreadMessagesCount}
          />
        ) : (
          showSettings ? (
            <SettingsPage 
              users={users}
              roles={MOCK_ROLES}
              timeEntries={timeEntries}
              projects={projects}
              absenceRequests={absenceRequests}
              onAddUser={handleAddUser}
              onUpdateUser={handleUpdateUser}
              onDeleteUser={handleDeleteUser}
              onChangeRole={handleChangeRole}
              onChangeUserStatus={handleChangeUserStatus}
              chatChannels={chatChannels}
              currentUser={currentUser || undefined}
              onCreateChannel={handleCreateChannel}
              onUpdateChannel={handleUpdateChannel}
              onDeleteChannel={handleDeleteChannel}
              selectedState={selectedState}
              onSelectedStateChange={setSelectedState}
              separateHomeOffice={separateHomeOffice}
              onSeparateHomeOfficeChange={setSeparateHomeOffice}
              showAdminsInDMs={showAdminsInDMs}
              onToggleShowAdminsInDMs={handleToggleShowAdminsInDMs}
              onDeleteAllMessages={handleDeleteAllMessages}
              maxUploadSize={maxUploadSize}
              onMaxUploadSizeChange={handleMaxUploadSizeChange}
              onImportComplete={(result) => {
                // Merge neue Projekte
                const updatedProjects = [...projects];
                result.projects.forEach(newProject => {
                  const existingIndex = updatedProjects.findIndex(p => p.id === newProject.id);
                  if (existingIndex >= 0) {
                    updatedProjects[existingIndex] = newProject;
                  } else {
                    updatedProjects.push(newProject);
                  }
                });
                setProjects(updatedProjects);
                
                // DEAKTIVIERT: Auto-Save beim Import - zu viele parallele Requests
                // result.projects.forEach(p => saveProject(p));
                // result.timeEntries.forEach(te => saveTimeEntry(te));
                
                console.log(`✅ Import abgeschlossen: ${result.projects.length} Projekte, ${result.timeEntries.length} TimeEntries`);
                console.log(`ℹ️ Gehe zu Settings → Supabase → "Alle Daten in Supabase speichern" um die Daten zu persistieren`);
                
                // Füge neue Zeiteinträge hinzu (nur lokal)
                setTimeEntries([...timeEntries, ...result.timeEntries]);
              }}
            />
          ) :
          <div className="flex items-center justify-center h-full text-text-secondary">
            <p>Wählen Sie ein Projekt aus, um Aufgaben anzuzeigen.</p>
          </div>
        )}

        {/* Floating actions (global) - Neue BottomBar Komponente */}
        {!selectedProject && (
          <BottomBar
            onOpenChat={() => {
              setShowChat(true);
              if (selectedProject) {
                setCurrentChatProject(selectedProject);
              } else {
                setCurrentChatProject(null);
              }
            }}
            onOpenTimeTracking={() => setShowStartTimeTrackingModal(true)}
            unreadMessagesCount={unreadMessagesCount}
          />
        )}
        </main>

        <div className={`fixed top-16 right-0 h-full w-96 bg-surface shadow-2xl transform transition-transform duration-300 ease-in-out md:relative md:top-auto md:right-auto md:h-auto md:w-auto md:shadow-none md:transform-none md:transition-none ${selectedTask ? 'translate-x-0 pointer-events-auto' : 'translate-x-full pointer-events-none'} md:translate-x-0 md:block`}>
          <TaskDetailPanel 
            item={selectedTask}
            onItemUpdate={handleTaskUpdate}
            onDescriptionUpdate={handleDescriptionUpdate}
            onRenameItem={(id, newName) => handleRenameItem(id, newName, 'task')}
            trackedTime={selectedTask ? (() => {
              // Berechne Gesamtzeit aus allen TimeEntries für diese Task
              const totalFromEntries = timeEntries
                .filter(e => e.taskId === selectedTask.id)
                .reduce((sum, e) => sum + e.duration, 0);
              
              // Addiere laufenden Timer falls vorhanden
              const runningTimer = activeTimerTaskId === selectedTask.id ? (taskTimers[selectedTask.id] || 0) : 0;
              
              return totalFromEntries + runningTimer;
            })() : 0}
            activeTimerTaskId={activeTimerTaskId}
            onToggleTimer={handleToggleTimer}
            onAddSubtask={handleAddSubtask}
            onAddTodo={handleAddTodo}
            itemContext={selectedTask ? findItemContext(selectedTask.id) : null}
            onSelectItem={handleSelectTask}
            onBillableChange={handleBillableChange}
            allUsers={MOCK_USERS}
            onUpdateAssignees={handleUpdateTaskAssignees}
          />
        </div>

      {activeTimerTaskId && (() => {
        const activeEntry = timeEntries.find(e => e.id === activeTimeEntryId);
        if (!activeEntry) return null;

        return (
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
        );
      })()}

      {showTimerMenu && hasPermission(currentUser, MOCK_ROLES, 'Zeit bearbeiten') && (() => {
        // Quelle für zu bearbeitenden Eintrag: zuerst explizit gewählter (TimeView), sonst aktiver Timer-Eintrag
        const fallbackActiveEntry = timeEntries.find(e => e.id === activeTimeEntryId);
        const entryToEdit = editingTimeEntry || fallbackActiveEntry;
        if (!entryToEdit) return null;

        // Finde Task/Subtask für Billable-Status
        let taskBillable = true;
        const taskIdToCheck = entryToEdit.taskId;
        projects.forEach(proj => {
          proj.taskLists.forEach(list => {
            list.tasks.forEach(task => {
              if (task.id === taskIdToCheck) {
                taskBillable = task.billable ?? true;
              }
              task.subtasks.forEach(subtask => {
                if (subtask.id === taskIdToCheck) {
                  taskBillable = subtask.billable ?? task.billable ?? true;
                }
              });
            });
          });
        });

        const elapsedSeconds = editingTimeEntry
          ? entryToEdit.duration
          : (activeTimerTaskId ? (taskTimers[activeTimerTaskId] || 0) : entryToEdit.duration);

        return (
          <TimerMenu
            timeEntry={entryToEdit}
            elapsedSeconds={elapsedSeconds}
            onClose={() => {
              setShowTimerMenu(false);
              setEditingTimeEntry(null);
            }}
            onUpdate={handleUpdateTimeEntry}
            onStop={editingTimeEntry || !activeTimerTaskId ? undefined : () => handleToggleTimer(activeTimerTaskId)}
            anchorRect={timerMenuAnchor}
            taskBillable={taskBillable}
            onBillableChange={handleBillableChange}
            projects={projects}
            onProjectChange={(projectId, taskId) => {
              // Update den TimeEntry mit neuem Projekt und Task
              handleUpdateTimeEntry(entryToEdit.id, entryToEdit.startTime, entryToEdit.endTime || '', entryToEdit.note, projectId, taskId);
            }}
            onNavigateToTask={(projectId, taskId) => {
              // Finde das Projekt
              const project = projects.find(p => p.id === projectId);
              if (project) {
                setSelectedProject(project);
                
                // Finde die Task oder Subtask
                let foundTask: Task | Subtask | null = null;
                for (const list of project.taskLists) {
                  const task = list.tasks.find(t => t.id === taskId);
                  if (task) {
                    foundTask = task;
                    break;
                  }
                  for (const task of list.tasks) {
                    const subtask = task.subtasks.find(st => st.id === taskId);
                    if (subtask) {
                      foundTask = subtask;
                      break;
                    }
                  }
                  if (foundTask) break;
                }
                
                if (foundTask) {
                  setSelectedTask(foundTask);
                }
                
                // Schließe alle anderen Views
                setShowDashboard(false);
                setShowProjectsOverview(false);
                setShowVacationAbsence(false);
                setShowTimeTracking(false);
                setShowTimeStatistics(false);
                setShowSettings(false);
                
                // Schließe das Timer Menu
                setShowTimerMenu(false);
                setEditingTimeEntry(null);
              }
            }}
          />
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

      {showNotifications && (
        <NotificationsModal
          onClose={() => {
            setShowNotifications(false);
            setSelectedNotificationRequestId(undefined);
          }}
          absenceRequests={absenceRequests}
          anomalies={anomalies}
          onSelectAnomaly={handleSelectAnomaly}
          onResolveAnomaly={handleResolveAnomaly}
          onMuteAnomaly={handleMuteAnomaly}
          onAddAnomalyComment={handleAddAnomalyComment}
          users={users}
          onApproveRequest={(requestId) => {
            const request = absenceRequests.find(r => r.id === requestId);
            if (request) {
              const updatedRequest = { ...request, status: AbsenceStatus.Approved, approvedBy: currentUser, approvedAt: new Date().toISOString() };
              saveAbsenceRequest(updatedRequest);
              setAbsenceRequests(prev => prev.map(r => r.id === requestId ? updatedRequest : r));
            }
          }}
          onRejectRequest={(requestId, reason) => {
            const request = absenceRequests.find(r => r.id === requestId);
            if (request) {
              const updatedRequest = { ...request, status: AbsenceStatus.Rejected, rejectedReason: reason };
              saveAbsenceRequest(updatedRequest);
              setAbsenceRequests(prev => prev.map(r => r.id === requestId ? updatedRequest : r));
            }
          }}
          onAddComment={(requestId, message) => {
            const request = absenceRequests.find(r => r.id === requestId);
            if (request && currentUser) {
              const newComment = {
                id: `comment-${Date.now()}`,
                user: currentUser,
                message,
                timestamp: new Date().toISOString(),
                read: false
              };
              const updatedRequest = { 
                ...request, 
                comments: [...(request.comments || []), newComment] 
              };
              saveAbsenceRequest(updatedRequest);
              setAbsenceRequests(prev => prev.map(r => r.id === requestId ? updatedRequest : r));
            }
          }}
          onMarkCommentsRead={(requestId) => {
            const request = absenceRequests.find(r => r.id === requestId);
            if (request && request.comments) {
              const updatedComments = request.comments.map(c => 
                c.user.id !== currentUser?.id ? { ...c, read: true } : c
              );
              const updatedRequest = { ...request, comments: updatedComments };
              saveAbsenceRequest(updatedRequest);
              setAbsenceRequests(prev => prev.map(r => r.id === requestId ? updatedRequest : r));
            }
          }}
          onDeleteRequest={(requestId) => {
            deleteAbsenceRequest(requestId);
            setAbsenceRequests(prev => prev.filter(r => r.id !== requestId));
          }}
          onMarkSickLeaveReported={(requestId) => {
            const request = absenceRequests.find(r => r.id === requestId);
            if (request) {
              const updatedRequest = { ...request, sickLeaveReported: true };
              saveAbsenceRequest(updatedRequest);
              setAbsenceRequests(prev => prev.map(r => r.id === requestId ? updatedRequest : r));
            }
          }}
          currentUser={currentUser!}
          initialSelectedRequestId={selectedNotificationRequestId}
        />
      )}

      {showChat && currentUser && (
        <ChatModal
          isOpen={showChat}
          onClose={() => setShowChat(false)}
          channels={chatChannels}
          messages={chatMessages}
          projects={projects}
          currentUser={currentUser}
          currentProject={currentChatProject}
          currentChannel={currentChatChannel}
          onSendMessage={handleSendMessage}
          onEditMessage={handleEditMessage}
          onUpdateMessageAttachments={handleUpdateMessageAttachments}
          onDeleteMessage={handleDeleteMessage}
          onCreateChannel={handleCreateChannel}
          onSwitchChannel={handleSwitchChatChannel}
          onSwitchProject={handleSwitchChatProject}
          onReactToMessage={handleReactToMessage}
          allUsers={users}
          showAdminsInDMs={showAdminsInDMs}
          maxUploadSize={maxUploadSize}
          onMaxUploadSizeChange={handleMaxUploadSizeChange}
          onDeleteAllMessages={handleDeleteAllMessages}
        />
      )}

      {showStartTimeTrackingModal && (
        <StartTimeTrackingModal
          isOpen={showStartTimeTrackingModal}
          onClose={() => setShowStartTimeTrackingModal(false)}
          projects={projects}
          onStartTracking={handleStartTimeTracking}
        />
      )}
      </div>
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