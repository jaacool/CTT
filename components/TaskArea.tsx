import React, { useMemo, useState } from 'react';
import { Project, TimeEntry, Task, Subtask, TaskStatus, User, AbsenceRequest, TaskList as ITaskList } from '../types';
import { MoreHorizontalIcon, ClockIcon, PlusIcon, SearchIcon, ArrowRightIcon, CalendarIcon, PrinterIcon, ThumbsUpIcon, CheckIcon, ChevronDownIcon, PlayIcon, PauseIcon, MessageCircleIcon } from './Icons';
import { formatTime, formatTimeCompact } from './utils';
import { TimeView } from './TimeView';
import { TaskContextMenu } from './TaskContextMenu';
import { AssigneeSelector } from './AssigneeSelector';
import { BottomBar } from './BottomBar';

type RenameFn = (id: string, newName: string, type: 'project' | 'list' | 'task' | 'subtask') => void;

interface TaskAreaProps {
    project: Project;
    timeEntries: TimeEntry[];
    selectedItem: Task | Subtask | null;
    onSelectItem: (item: Task | Subtask | null) => void;
    taskTimers: { [taskId: string]: number };
    activeTimerTaskId: string | null;
    onToggleTimer: (taskId: string) => void;
    onSetTaskStatus: (taskId: string, newStatus: TaskStatus) => void;
    onAddNewList: (title: string) => void;
    onAddTask: (listId: string, title: string) => void;
    onRenameItem: RenameFn;
    onUpdateTimeEntry: (entryId: string, startTime: string, endTime: string) => void;
    onBillableChange: (taskId: string, billable: boolean) => void;
    defaultBillable: boolean;
    onToggleDefaultBillable: () => void;
    onPinTask?: (taskId: string) => void;
    pinnedTaskIds?: string[];
    onDeleteTask?: (taskId: string) => void;
    onOpenCreateProject?: () => void;
    onOpenSearchProjects?: () => void;
    onDeleteTimeEntry?: (entryId: string) => void;
    onDuplicateTimeEntry?: (entry: TimeEntry) => void;
    onImportEntries?: (entries: Omit<TimeEntry, 'id'>[]) => void;
    onImportAbsences?: (absences: Omit<AbsenceRequest, 'id' | 'createdAt' | 'updatedAt' | 'status'>[]) => void;
    currentUser?: any;
    allUsers?: User[];
    onUpdateTaskAssignees?: (taskId: string, assignees: User[]) => void;
    onOpenChat?: () => void;
    onOpenTimeTracking?: () => void;
    unreadMessagesCount?: number;
    onEditEntry?: (entry: TimeEntry) => void;
    onUpdateProject?: (project: Project) => void;
    favoriteProjectIds?: string[];
    onToggleFavorite?: (projectId: string) => void;
}

const ProjectHeader: React.FC<{ 
    project: Project; 
    timeEntries: TimeEntry[]; 
    taskTimers: { [taskId: string]: number }; 
    defaultBillable: boolean; 
    onToggleDefaultBillable: () => void;
    allUsers: User[];
    onUpdateProjectMembers: (members: User[]) => void;
    isFavorite?: boolean;
    onToggleFavorite?: (projectId: string) => void;
}> = React.memo(({ project, timeEntries, taskTimers, defaultBillable, onToggleDefaultBillable, allUsers, onUpdateProjectMembers, isFavorite, onToggleFavorite }) => {
    
    const allTasks = useMemo(() => project.taskLists.flatMap(list => list.tasks), [project.taskLists]);
    const totalTasks = allTasks.length;
    const completedTasks = useMemo(() => allTasks.filter(task => task.status === TaskStatus.Done).length, [allTasks]);
    const progress = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;
    
    // PERFORMANCE: Summiere alle TimeEntries für dieses Projekt (memoized)
    const totalTrackedSeconds = useMemo(() => 
        timeEntries.filter(e => e.projectId === project.id).reduce((sum, entry) => sum + entry.duration, 0),
        [timeEntries, project.id]
    );

    const formatDate = (dateString: string) => new Date(dateString).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });

    return (
        <header className="mb-6 bg-surface p-4 rounded-xl">
            <div className="flex justify-between items-start gap-4">
                <div className="flex flex-col min-w-0 flex-1">
                    <div className="flex items-start space-x-3">
                        <h1 className="text-2xl font-bold text-text-primary break-words">{project.name}</h1>
                        {onToggleFavorite && (
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onToggleFavorite(project.id);
                                }}
                                className="p-1.5 mt-1 rounded-md hover:bg-overlay transition-colors flex-shrink-0"
                                title={isFavorite ? 'Aus Favoriten entfernen' : 'Zu Favoriten hinzufügen'}
                            >
                                <svg 
                                    xmlns="http://www.w3.org/2000/svg" 
                                    width="20" 
                                    height="20" 
                                    viewBox="0 0 24 24" 
                                    fill={isFavorite ? 'currentColor' : 'none'}
                                    stroke="currentColor" 
                                    strokeWidth="2" 
                                    strokeLinecap="round" 
                                    strokeLinejoin="round"
                                    className={isFavorite ? 'text-yellow-500' : 'text-text-secondary'}
                                >
                                    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
                                </svg>
                            </button>
                        )}
                    </div>
                    <div className="flex flex-wrap items-center gap-4 text-text-secondary text-xs mt-2">
                        <span className={`px-2 py-0.5 rounded-full text-text-primary ${project.status === 'AKTIV' ? 'glow-button' : 'bg-overlay'}`}>{project.status}</span>
                         <div className="flex items-center space-x-1.5">
                            <CalendarIcon className="w-4 h-4"/>
                            <span>{formatDate(project.startDate)} - {formatDate(project.endDate)}</span>
                        </div>
                    </div>
                </div>
                <div className="flex-shrink-0 pt-1">
                    <AssigneeSelector
                        assignees={project.members || []}
                        allUsers={allUsers}
                        onAssigneesChange={onUpdateProjectMembers}
                        size="medium"
                    />
                </div>
            </div>
            <div className="mt-4">
                 <div className="flex justify-between items-center text-xs text-text-secondary mb-1">
                    <span>Fortschritt</span>
                    <span>{completedTasks}/{totalTasks} Erledigt</span>
                </div>
                <div className="w-full bg-overlay rounded-full h-2">
                    <div className="glow-button h-2 rounded-full" style={{ width: `${progress}%` }}></div>
                </div>
            </div>
            <div className="mt-4 flex space-x-4">
                <div className="flex-1">
                    <div className="text-xs text-text-secondary">Erfasste Zeit</div>
                    <div className="text-text-primary font-bold">{formatTime(totalTrackedSeconds)}</div>
                </div>
                 <div className="flex-1">
                    <div className="text-xs text-text-secondary">Geplantes Budget</div>
                    <div className="text-text-primary font-bold">{project.budgetHours || ''} Stunden</div>
                </div>
                <div className="flex-1">
                    <div className="text-xs text-text-secondary mb-1">Standard</div>
                    <button
                        onClick={onToggleDefaultBillable}
                        className={`flex items-center space-x-2 px-3 py-1 rounded text-xs font-bold transition-all cursor-pointer ${
                            defaultBillable 
                                ? 'glow-button-highlight-green-v5 text-green-500' 
                                : 'glow-button-highlight-red-v5 text-red-500'
                        }`}
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            {defaultBillable ? (
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
                        <span>{defaultBillable ? 'Abrechenbar' : 'Nicht abrechenbar'}</span>
                    </button>
                </div>
            </div>
        </header>
    );
}, (prevProps, nextProps) => {
    // Custom comparison für optimales Re-Rendering
    return (
        prevProps.project === nextProps.project &&
        prevProps.defaultBillable === nextProps.defaultBillable &&
        prevProps.isFavorite === nextProps.isFavorite &&
        prevProps.timeEntries === nextProps.timeEntries &&
        prevProps.taskTimers === nextProps.taskTimers
    );
});

const TaskStatusControl: React.FC<{
    status: TaskStatus;
    onSetStatus: (newStatus: TaskStatus) => void;
}> = ({ status, onSetStatus }) => {
    const [isMenuOpen, setIsMenuOpen] = useState(false);

    const handleSetStatus = (e: React.MouseEvent, newStatus: TaskStatus) => {
        e.stopPropagation();
        onSetStatus(newStatus);
        setIsMenuOpen(false);
    };

    const baseClasses = "w-6 h-6 rounded-full flex items-center justify-center text-black shrink-0";
    let iconContent;
    switch (status) {
        case TaskStatus.InProgress:
            iconContent = <div className={`${baseClasses} glow-button-highlight-yellow-v4 text-black`}><ArrowRightIcon className="w-4 h-4"/></div>;
            break;
        case TaskStatus.Done:
            iconContent = <div className={`${baseClasses} glow-button-highlight-green-v4 text-black`}><CheckIcon className="w-4 h-4"/></div>;
            break;
        case TaskStatus.Todo:
        default:
            iconContent = <div className="w-6 h-6 rounded-full border-2 border-dashed border-text-secondary shrink-0"></div>;
            break;
    }

    return (
        <div 
            className="relative"
            onMouseEnter={() => setIsMenuOpen(true)}
            onMouseLeave={() => setIsMenuOpen(false)}
        >
            <div className="cursor-pointer">
                {iconContent}
            </div>
            {isMenuOpen && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 z-10 bg-overlay p-1 rounded-full flex items-center space-x-1 shadow-lg transform transition-all duration-150 ease-in-out">
                    <button onClick={(e) => handleSetStatus(e, TaskStatus.Todo)} className="w-7 h-7 rounded-full border-2 border-text-secondary hover:bg-surface flex items-center justify-center"></button>
                    <button onClick={(e) => handleSetStatus(e, TaskStatus.InProgress)} className="w-7 h-7 rounded-full glow-button-highlight-yellow-v4 text-black flex items-center justify-center"><ArrowRightIcon className="w-4 h-4"/></button>
                    <button className="w-7 h-7 rounded-full glow-button-highlight-pink-v4 text-white flex items-center justify-center"><PrinterIcon className="w-4 h-4"/></button>
                    <button className="w-7 h-7 rounded-full glow-button-highlight-green-v4 text-black flex items-center justify-center"><ThumbsUpIcon className="w-4 h-4"/></button>
                    <button onClick={(e) => handleSetStatus(e, TaskStatus.Done)} className="w-7 h-7 rounded-full glow-button-highlight-green-v4 text-black flex items-center justify-center"><CheckIcon className="w-4 h-4"/></button>
                </div>
            )}
        </div>
    );
};


const EditableTitle: React.FC<{ id: string, title: string, onRename: (newName: string) => void, onNameClick?: (e: React.MouseEvent) => void, children: (isEditing: boolean, name: string, handleDoubleClick: (e: React.MouseEvent) => void) => React.ReactNode}> = ({ id, title, onRename, onNameClick, children }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [currentTitle, setCurrentTitle] = useState(title);
    const [clickTimer, setClickTimer] = useState<NodeJS.Timeout | null>(null);

    const handleDoubleClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        e.preventDefault();
        if (clickTimer) {
            clearTimeout(clickTimer);
            setClickTimer(null);
        }
        setIsEditing(true);
    };
    
    const handleClick = (e: React.MouseEvent) => {
        // Rufe onNameClick auf falls vorhanden (mit Delay-Logik)
        if (onNameClick) {
            onNameClick(e);
        }
    };

    const handleBlur = () => {
        if (currentTitle.trim() && currentTitle !== title) {
            onRename(currentTitle.trim());
        }
        setIsEditing(false);
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') handleBlur();
        if (e.key === 'Escape') {
            setCurrentTitle(title);
            setIsEditing(false);
        }
    };
    
    if (isEditing) {
        return (
            <input
                type="text"
                value={currentTitle}
                onChange={(e) => setCurrentTitle(e.target.value)}
                onBlur={handleBlur}
                onKeyDown={handleKeyDown}
                className="bg-surface text-text-primary border-none outline-none focus:ring-1 focus:ring-glow-purple rounded px-1 py-0 w-full"
                autoFocus
                onClick={e => e.stopPropagation()}
            />
        );
    }

    return <div onClick={handleClick} onDoubleClick={handleDoubleClick} className="flex-1 truncate">{children(isEditing, currentTitle, handleDoubleClick)}</div>;
};

const SubtaskItem: React.FC<{
    subtask: Subtask;
    isSelected: boolean;
    onSelect: () => void;
    elapsedSeconds: number;
    isActive: boolean;
    onToggleTimer: (id: string) => void;
    onSetTaskStatus: (id: string, newStatus: TaskStatus) => void;
    onRenameItem: RenameFn;
    allUsers?: User[];
    onUpdateTaskAssignees?: (taskId: string, assignees: User[]) => void;
}> = React.memo(({ subtask, isSelected, onSelect, elapsedSeconds, isActive, onToggleTimer, onSetTaskStatus, onRenameItem, allUsers, onUpdateTaskAssignees }) => {
    const [clickTimer, setClickTimer] = useState<NodeJS.Timeout | null>(null);
    const [timerHovered, setTimerHovered] = useState(false);
    
    const handleDirectClick = () => {
        if (clickTimer) {
            clearTimeout(clickTimer);
            setClickTimer(null);
        }
        onSelect();
    };
    
    const handleNameClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (clickTimer) {
            clearTimeout(clickTimer);
            setClickTimer(null);
        } else {
            const timer = setTimeout(() => {
                onSelect();
                setClickTimer(null);
            }, 100);
            setClickTimer(timer);
        }
    };
    
    return (
        <div 
            onClick={handleDirectClick}
            className={`flex items-center space-x-4 p-2 pl-8 rounded-lg cursor-pointer ${isSelected ? 'glow-button' : 'hover-glow'}`}
        >
            <TaskStatusControl status={subtask.status} onSetStatus={(newStatus) => onSetTaskStatus(subtask.id, newStatus)} />
             <EditableTitle id={subtask.id} title={subtask.title} onRename={(newName) => onRenameItem(subtask.id, newName, 'subtask')} onNameClick={handleNameClick}>
                {() => <span className="flex-1 truncate text-text-primary">{subtask.title}</span>}
            </EditableTitle>
            <div className="flex items-center space-x-4 text-text-secondary">
                <button 
                    onClick={(e) => { e.stopPropagation(); onToggleTimer(subtask.id); }}
                    onMouseEnter={() => setTimerHovered(true)}
                    onMouseLeave={() => setTimerHovered(false)}
                    className={`flex items-center space-x-2 px-2 py-1 rounded-md cursor-pointer border border-transparent bg-gradient-to-r from-transparent to-transparent will-change-[background-image,border-color,color] transition-[background-image,border-color,color] duration-300 ease-in-out ${isActive ? 'glow-button-highlight text-text-primary' : 'hover:from-glow-cyan/10 hover:to-glow-magenta/10 hover:border-glow-purple/10 hover:text-text-primary hover:shadow-[inset_0_0_30px_10px_rgba(0,0,0,0.5),inset_0_0_20px_rgba(168,85,247,0.15),0_0_15px_-3px_rgba(168,85,247,0.3)]'}`}
                >
                    {timerHovered ? (
                        isActive ? (
                            <PauseIcon className="w-4 h-4" />
                        ) : (
                            <PlayIcon className="w-4 h-4" />
                        )
                    ) : (
                        isActive ? (
                            <ClockIcon className="w-4 h-4" />
                        ) : (
                            <PlayIcon className="w-4 h-4" />
                        )
                    )}
                    <span className="hidden md:inline">{formatTimeCompact(elapsedSeconds)}</span>
                </button>
                <AssigneeSelector
                    assignees={subtask.assignees}
                    allUsers={allUsers || []}
                    onAssigneesChange={(assignees) => onUpdateTaskAssignees?.(subtask.id, assignees)}
                    size="small"
                />
            </div>
        </div>
    );
});

interface TaskItemProps {
    task: Task; 
    selectedItem: Task | Subtask | null;
    onSelectItem: (item: Task | Subtask | null) => void; 
    elapsedSeconds: number; 
    isActive: boolean; 
    onToggleTimer: (id: string) => void;
    onSetTaskStatus: (id: string, newStatus: TaskStatus) => void;
    taskTimers: { [taskId: string]: number };
    activeTimerTaskId: string | null;
    onRenameItem: RenameFn;
    project: Project;
    onPinTask?: (taskId: string) => void;
    pinnedTaskIds?: string[];
    onDeleteTask?: (taskId: string) => void;
    allUsers?: User[];
    onUpdateTaskAssignees?: (taskId: string, assignees: User[]) => void;
    taskTimeMap: Map<string, number>;
    timeEntries: TimeEntry[];
}

function areTaskItemPropsEqual(prevProps: TaskItemProps, nextProps: TaskItemProps) {
    // 1. Einfache Props und Callbacks Check
    if (prevProps.task.id !== nextProps.task.id) return false;
    if (prevProps.task !== nextProps.task) return false; // Task Inhalt geändert
    if (prevProps.selectedItem !== nextProps.selectedItem) return false;
    if (prevProps.elapsedSeconds !== nextProps.elapsedSeconds) return false; // Eigene Zeit geändert
    if (prevProps.isActive !== nextProps.isActive) return false; // Eigener Timer Status
    if (prevProps.activeTimerTaskId !== nextProps.activeTimerTaskId) return false; // Timer gewechselt
    if (prevProps.project !== nextProps.project) return false;
    
    // 2. Pinned Status
    const wasPinned = prevProps.pinnedTaskIds?.includes(prevProps.task.id);
    const isPinned = nextProps.pinnedTaskIds?.includes(nextProps.task.id);
    if (wasPinned !== isPinned) return false;

    // 3. Subtasks prüfen
    // Wir müssen wissen, ob sich für IRGENDEINEN Subtask etwas Relevantes geändert hat.
    // Relevant = Zeit in taskTimeMap geändert ODER Timer aktiv.
    const activeId = nextProps.activeTimerTaskId;
    
    // Check ob sich taskTimeMap Referenz geändert hat (passiert oft)
    // Wenn ja, müssen wir Werte vergleichen
    if (prevProps.taskTimeMap !== nextProps.taskTimeMap) {
        for (const subtask of nextProps.task.subtasks) {
            // Check 1: Hat sich die gespeicherte Zeit geändert?
            const prevTime = prevProps.taskTimeMap.get(subtask.id);
            const nextTime = nextProps.taskTimeMap.get(subtask.id);
            if (prevTime !== nextTime) return false;
            
            // Check 2: Ist dieser Subtask gerade aktiv?
            // Wenn ja, läuft sein Timer -> taskTimers hat sich geändert -> Re-render nötig
            if (activeId === subtask.id) return false;
        }
    } else if (activeId) {
        // Map gleich, aber Timer läuft -> Check ob Subtask aktiv
         for (const subtask of nextProps.task.subtasks) {
            if (activeId === subtask.id) return false;
        }
    }

    // Alles scheint gleich geblieben zu sein für diesen Task und seine Subtasks
    return true;
}

const TaskItem: React.FC<TaskItemProps> = React.memo((props) => {
    const { task, selectedItem, onSelectItem, elapsedSeconds, isActive, onToggleTimer, onSetTaskStatus, taskTimers, activeTimerTaskId, onRenameItem, project, onPinTask, pinnedTaskIds, onDeleteTask } = props;
    const isSelected = selectedItem?.id === task.id;
    const [clickTimer, setClickTimer] = useState<NodeJS.Timeout | null>(null);
    const [timerHovered, setTimerHovered] = useState(false);
    const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);
    const [isContextMenuOpen, setIsContextMenuOpen] = useState(false);
    
    const handleDirectClick = () => {
        // Sofortiger Klick - kein Delay
        if (clickTimer) {
            clearTimeout(clickTimer);
            setClickTimer(null);
        }
        onSelectItem(task);
    };
    
    const handleNameClick = (e: React.MouseEvent) => {
        e.stopPropagation(); // Verhindere direkten Parent-Click
        // Warte auf möglichen Doppelklick
        if (clickTimer) {
            clearTimeout(clickTimer);
            setClickTimer(null);
        } else {
            const timer = setTimeout(() => {
                onSelectItem(task);
                setClickTimer(null);
            }, 100);
            setClickTimer(timer);
        }
    };
    
    return (
        <>
        <div>
            <div 
                onClick={handleDirectClick}
                onContextMenu={(e) => {
                    e.preventDefault();
                    // Positioniere Menü über der Aufgabe (y - 60px)
                    setContextMenu({ x: e.clientX, y: e.clientY - 60 });
                    setIsContextMenuOpen(true);
                }}
                className={`flex items-center space-x-4 p-2 rounded-lg cursor-pointer ${isSelected || isContextMenuOpen ? 'glow-button' : 'hover-glow'}`}
            >
                <TaskStatusControl status={task.status} onSetStatus={(newStatus) => onSetTaskStatus(task.id, newStatus)} />
                <EditableTitle id={task.id} title={task.title} onRename={(newName) => onRenameItem(task.id, newName, 'task')} onNameClick={handleNameClick}>
                    {() => <span className="flex-1 truncate">{task.title}</span>}
                </EditableTitle>
                <div className="flex items-center space-x-4 text-text-secondary">
                    {task.subtasks.length > 0 && <span className="text-xs">{task.subtasks.length}</span>}
                    <button 
                        onClick={(e) => { e.stopPropagation(); onToggleTimer(task.id); }}
                        onMouseEnter={() => setTimerHovered(true)}
                        onMouseLeave={() => setTimerHovered(false)}
                        className={`flex items-center space-x-2 px-2 py-1 rounded-md cursor-pointer border border-transparent bg-gradient-to-r from-transparent to-transparent will-change-[background-image,border-color,color] transition-[background-image,border-color,color] duration-300 ease-in-out ${isActive ? 'glow-button-highlight text-text-primary' : 'hover:from-glow-cyan/10 hover:to-glow-magenta/10 hover:border-glow-purple/10 hover:text-text-primary hover:shadow-[inset_0_0_30px_10px_rgba(0,0,0,0.5),inset_0_0_20px_rgba(168,85,247,0.15),0_0_15px_-3px_rgba(168,85,247,0.3)]'}`}
                    >
                        {timerHovered ? (
                            isActive ? (
                                <PauseIcon className="w-4 h-4" />
                            ) : (
                                <PlayIcon className="w-4 h-4" />
                            )
                        ) : (
                            isActive ? (
                                <ClockIcon className="w-4 h-4" />
                            ) : (
                                <PlayIcon className="w-4 h-4" />
                            )
                        )}
                        <span className="hidden md:inline">{formatTimeCompact(elapsedSeconds)}</span>
                    </button>
                    <AssigneeSelector
                        assignees={task.assignees}
                        allUsers={props.allUsers || []}
                        onAssigneesChange={(assignees) => props.onUpdateTaskAssignees?.(task.id, assignees)}
                        size="small"
                    />
                </div>
            </div>
            {task.subtasks.map(subtask => {
                // PERFORMANCE: O(1) Lookup statt filter().reduce()
                const timeEntriesSum = props.taskTimeMap.get(subtask.id) || 0;
                // Addiere aktuellen Timer falls aktiv
                const currentTimer = activeTimerTaskId === subtask.id ? (taskTimers[subtask.id] || 0) : 0;
                const totalSeconds = timeEntriesSum + currentTimer;
                
                return (
                    <SubtaskItem
                        key={subtask.id}
                        subtask={subtask}
                        isSelected={selectedItem?.id === subtask.id}
                        onSelect={() => onSelectItem(subtask)}
                        elapsedSeconds={totalSeconds}
                        isActive={activeTimerTaskId === subtask.id}
                        onToggleTimer={onToggleTimer}
                        onSetTaskStatus={onSetTaskStatus}
                        onRenameItem={onRenameItem}
                        allUsers={props.allUsers}
                        onUpdateTaskAssignees={props.onUpdateTaskAssignees}
                    />
                );
            })}
        </div>
        
        {contextMenu && onPinTask && (
            <TaskContextMenu
                x={contextMenu.x}
                y={contextMenu.y}
                onClose={() => {
                    setContextMenu(null);
                    setIsContextMenuOpen(false);
                }}
                onPinToDashboard={() => onPinTask(task.id)}
                onDeleteTask={onDeleteTask ? () => onDeleteTask(task.id) : undefined}
                isPinned={pinnedTaskIds?.includes(task.id) || false}
                task={task}
                projects={[project]}
                timeEntriesCount={props.timeEntries.filter(te => te.projectId === project.id && te.taskId === task.id).length}
                totalHours={(props.taskTimeMap.get(task.id) || 0) / 3600}
            />
        )}
    </>
    );
}, areTaskItemPropsEqual);

const AddNewTask: React.FC<{ listId: string; onAddTask: (listId: string, title: string) => void; }> = ({ listId, onAddTask }) => {
    const [isAdding, setIsAdding] = useState(false);
    const [title, setTitle] = useState('');

    const handleSubmit = () => {
        if (title.trim()) {
            onAddTask(listId, title.trim());
            setTitle('');
            setIsAdding(false);
        }
    };
    
    if (!isAdding) {
        return (
            <button onClick={() => setIsAdding(true)} className="flex items-center space-x-4 p-2 text-text-secondary cursor-pointer hover:text-text-primary w-full">
                <div className="w-6 h-6 rounded-full border-2 border-dashed border-text-secondary flex items-center justify-center"><PlusIcon className="w-4 h-4"/></div>
                <span className="flex-1 text-left">Neue Aufgabe</span>
            </button>
        );
    }
    
    return (
        <div className="p-2">
            <input
                type="text"
                value={title}
                onChange={e => setTitle(e.target.value)}
                onBlur={handleSubmit}
                onKeyDown={e => e.key === 'Enter' && handleSubmit()}
                className="bg-surface text-text-primary border-none outline-none focus:ring-1 focus:ring-glow-purple rounded px-2 py-1 w-full"
                placeholder="Aufgabentitel eingeben..."
                autoFocus
            />
        </div>
    );
};

const TaskList: React.FC<Omit<TaskAreaProps, 'project' | 'onAddNewList'> & { taskList: ITaskList }> = React.memo((props) => {
    const { taskList, onRenameItem, project, taskTimers, activeTimerTaskId } = props;
    
    // PERFORMANCE: Berechne summierte Zeit aus TimeEntries für alle Aufgaben in dieser Liste (memoized)
    const taskIds = useMemo(() => 
        taskList.tasks.flatMap(task => [task.id, ...task.subtasks.map(st => st.id)]),
        [taskList.tasks]
    );
    
    const timeEntriesSum = useMemo(() => 
        props.timeEntries
            .filter(entry => entry.projectId === project.id && taskIds.includes(entry.taskId))
            .reduce((sum, entry) => sum + entry.duration, 0),
        [props.timeEntries, project.id, taskIds]
    );
    
    // Addiere aktuelle Timer
    const currentTimerSum = useMemo(() => 
        taskIds.reduce((sum, id) => {
            if (activeTimerTaskId === id) {
                return sum + (taskTimers[id] || 0);
            }
            return sum;
        }, 0),
        [taskIds, activeTimerTaskId, taskTimers]
    );
    
    const totalTrackedSeconds = timeEntriesSum + currentTimerSum;
    
    // PERFORMANCE: Erstelle Map für schnelle TimeEntry-Lookups pro Task
    const taskTimeMap = useMemo(() => {
        const map = new Map<string, number>();
        props.timeEntries.forEach(entry => {
            if (entry.projectId === project.id) {
                const current = map.get(entry.taskId) || 0;
                map.set(entry.taskId, current + entry.duration);
            }
        });
        return map;
    }, [props.timeEntries, project.id]);
    
    // Formatiere Zeit im H:MM Format
    const formatListTime = (seconds: number): string => {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        return `${hours}:${String(minutes).padStart(2, '0')}`;
    };
    
    const totalTrackedTime = formatListTime(totalTrackedSeconds);
    
    // Berechne Budget (Summe aller Task-Budgets)
    const totalBudgetHours = taskList.tasks.reduce((acc, task) => acc + (task.timeBudgetHours || 0), 0);
    const completedTasks = taskList.tasks.filter(t => t.status === TaskStatus.Done).length;
    
    return (
        <div className="glow-card rounded-xl p-4">
            <div className="flex justify-between items-center mb-4">
                <div className="flex items-center space-x-3 flex-1 min-w-0">
                     <EditableTitle id={taskList.id} title={taskList.title} onRename={(newName) => onRenameItem(taskList.id, newName, 'list')}>
                        {() => <h2 className="font-bold text-text-primary truncate">{taskList.title}</h2>}
                    </EditableTitle>
                </div>
                <div className="flex items-center space-x-4 text-text-secondary text-xs">
                    <div className="flex items-center space-x-1">
                        <ClockIcon className="w-4 h-4" />
                        <span>{totalTrackedTime}h{totalBudgetHours > 0 ? ` / ${totalBudgetHours}h` : ''}</span>
                    </div>
                    <div className="flex items-center space-x-1">
                        <CheckIcon className="w-4 h-4" />
                        <span>{completedTasks}/{taskList.tasks.length}</span>
                    </div>
                    <button className="text-text-secondary hover:text-text-primary"><MoreHorizontalIcon className="w-5 h-5" /></button>
                </div>
            </div>
            <div className="space-y-1">
                 <AddNewTask listId={taskList.id} onAddTask={props.onAddTask} />
                 {taskList.tasks.length > 0 && <div className="border-t border-overlay my-2"></div>}
                {taskList.tasks.map(task => {
                    // PERFORMANCE: O(1) Lookup statt filter().reduce()
                    const timeEntriesSum = taskTimeMap.get(task.id) || 0;
                    // Addiere aktuellen Timer falls aktiv
                    const currentTimer = props.activeTimerTaskId === task.id ? (props.taskTimers[task.id] || 0) : 0;
                    const totalSeconds = timeEntriesSum + currentTimer;
                    
                    return (
                        <TaskItem 
                            key={task.id} 
                            task={task}
                            elapsedSeconds={totalSeconds}
                            isActive={props.activeTimerTaskId === task.id}
                            {...props}
                            taskTimeMap={taskTimeMap}
                        />
                    );
                })}
            </div>
        </div>
    );
}, (prevProps, nextProps) => {
    // Custom comparison für TaskList
    return (
        prevProps.taskList === nextProps.taskList &&
        prevProps.activeTimerTaskId === nextProps.activeTimerTaskId &&
        prevProps.taskTimers === nextProps.taskTimers &&
        prevProps.timeEntries === nextProps.timeEntries &&
        prevProps.selectedItem === nextProps.selectedItem
    );
});

const AddNewList: React.FC<{ onAddNewList: (title: string) => void }> = ({ onAddNewList }) => {
    const [isAdding, setIsAdding] = useState(false);
    const [title, setTitle] = useState("");

    const handleAdd = () => {
        if (title.trim()) {
            onAddNewList(title.trim());
            setTitle("");
            setIsAdding(false);
        }
    };
    
    if (!isAdding) {
        return (
            <button onClick={() => setIsAdding(true)} className="w-full bg-overlay/50 hover-glow p-3 rounded-lg text-text-secondary flex items-center justify-center space-x-2">
                <PlusIcon className="w-5 h-5" />
                <span>Neue Liste hinzufügen</span>
            </button>
        )
    }
    
    return (
        <div className="glow-card rounded-xl p-4">
            <input 
                type="text"
                value={title}
                onChange={e => setTitle(e.target.value)}
                onBlur={handleAdd}
                onKeyDown={e => e.key === 'Enter' && handleAdd()}
                placeholder="Listentitel eingeben..."
                className="bg-surface text-text-primary border-none outline-none focus:ring-1 focus:ring-glow-purple rounded px-2 py-2 w-full"
                autoFocus
            />
        </div>
    )
};

export const TaskArea: React.FC<TaskAreaProps> = (props) => {
    const [activeTab, setActiveTab] = useState<'tasks' | 'time'>('tasks');
    
    return (
        <div className="w-full max-w-4xl mx-auto">
            <ProjectHeader 
                project={props.project} 
                timeEntries={props.timeEntries} 
                taskTimers={props.taskTimers} 
                defaultBillable={props.defaultBillable} 
                onToggleDefaultBillable={props.onToggleDefaultBillable}
                allUsers={props.allUsers || []}
                onUpdateProjectMembers={(members) => {
                    if (props.onUpdateProject) {
                        props.onUpdateProject({ ...props.project, members });
                    }
                }}
                isFavorite={props.favoriteProjectIds?.includes(props.project.id)}
                onToggleFavorite={props.onToggleFavorite}
            />
            
            {/* Tab Navigation */}
            <div className="flex space-x-1 mb-6 bg-overlay rounded-lg p-1 border border-border">
                <button
                    onClick={() => setActiveTab('tasks')}
                    className={`flex-1 px-2 sm:px-4 py-2 rounded-md text-xs sm:text-sm font-semibold transition-colors ${
                        activeTab === 'tasks'
                            ? 'glow-button text-text-primary'
                            : 'text-text-secondary hover:text-text-primary'
                    }`}
                >
                    Aufgaben
                </button>
                <button
                    onClick={() => {
                        setActiveTab('time');
                        // Schließe Detail Panel beim Wechsel zur Zeit-Ansicht
                        if (props.selectedItem) {
                            props.onSelectItem(null);
                        }
                    }}
                    className={`flex-1 px-2 sm:px-4 py-2 rounded-md text-xs sm:text-sm font-semibold transition-colors ${
                        activeTab === 'time'
                            ? 'glow-button text-text-primary'
                            : 'text-text-secondary hover:text-text-primary'
                    }`}
                >
                    Zeit
                </button>
            </div>
            
            {/* Content */}
            {activeTab === 'tasks' ? (
                <div className="space-y-6">
                    {props.project.taskLists.map(list => (
                        <TaskList key={list.id} taskList={list} {...props} />
                    ))}
                    <AddNewList onAddNewList={props.onAddNewList} />
                </div>
            ) : (
                <TimeView 
                    project={props.project}
                    timeEntries={props.timeEntries.filter(entry => {
                        // Admin hat role-ID 'role-1'
                        const isAdmin = props.currentUser?.role === 'role-1';
                        return entry.projectId === props.project.id &&
                            (isAdmin || (props.currentUser && entry.user.id === props.currentUser.id));
                    })}
                    onUpdateEntry={props.onUpdateTimeEntry}
                    onBillableChange={props.onBillableChange}
                    onStartTimer={props.onToggleTimer}
                    onDeleteEntry={props.onDeleteTimeEntry}
                    onDuplicateEntry={props.onDuplicateTimeEntry}
                    onImportEntries={props.onImportEntries}
                    onImportAbsences={props.onImportAbsences}
                    onEditEntry={props.onEditEntry}
                    currentUser={props.currentUser}
                    activeTimerTaskId={props.activeTimerTaskId}
                />
            )}
            
             <BottomBar
                onOpenChat={props.onOpenChat}
                onOpenTimeTracking={props.onOpenTimeTracking}
                unreadMessagesCount={props.unreadMessagesCount || 0}
             />
        </div>
    );
};