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
}

const ProjectHeader: React.FC<{ 
    project: Project; 
    timeEntries: TimeEntry[]; 
    taskTimers: { [taskId: string]: number }; 
    defaultBillable: boolean; 
    onToggleDefaultBillable: () => void;
    allUsers: User[];
    onUpdateProjectMembers: (members: User[]) => void;
}> = ({ project, timeEntries, taskTimers, defaultBillable, onToggleDefaultBillable, allUsers, onUpdateProjectMembers }) => {
    
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
            <div className="flex justify-between items-start">
                <div>
                    <h1 className="text-2xl font-bold text-text-primary">{project.name}</h1>
                    <div className="flex items-center space-x-4 text-text-secondary text-xs mt-2">
                        <span className={`px-2 py-0.5 rounded-full text-text-primary ${project.status === 'AKTIV' ? 'glow-button' : 'bg-overlay'}`}>{project.status}</span>
                         <div className="flex items-center space-x-1.5">
                            <CalendarIcon className="w-4 h-4"/>
                            <span>{formatDate(project.startDate)} - {formatDate(project.endDate)}</span>
                        </div>
                    </div>
                </div>
                <AssigneeSelector
                    assignees={project.members || []}
                    allUsers={allUsers}
                    onAssigneesChange={onUpdateProjectMembers}
                    size="medium"
                />
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
};

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
}> = ({ subtask, isSelected, onSelect, elapsedSeconds, isActive, onToggleTimer, onSetTaskStatus, onRenameItem, allUsers, onUpdateTaskAssignees }) => {
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
};

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
}

const TaskItem: React.FC<TaskItemProps> = (props) => {
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
                // Summiere alle TimeEntries für diese Unteraufgabe
                const timeEntriesSum = props.timeEntries
                    .filter(entry => entry.projectId === project.id && entry.taskId === subtask.id)
                    .reduce((sum, entry) => sum + entry.duration, 0);
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
                totalHours={props.timeEntries.filter(te => te.projectId === project.id && te.taskId === task.id).reduce((sum, te) => sum + te.duration, 0) / 3600}
            />
        )}
    </>
    );
};

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

const TaskList: React.FC<Omit<TaskAreaProps, 'project' | 'onAddNewList'> & { taskList: ITaskList }> = (props) => {
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
                    // Summiere alle TimeEntries für diese Aufgabe
                    const timeEntriesSum = props.timeEntries
                        .filter(entry => entry.projectId === props.project.id && entry.taskId === task.id)
                        .reduce((sum, entry) => sum + entry.duration, 0);
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
                        />
                    );
                })}
            </div>
        </div>
    );
};

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
                    onDeleteEntry={props.onDeleteTimeEntry}
                    onDuplicateEntry={props.onDuplicateTimeEntry}
                    onImportEntries={props.onImportEntries}
                    onImportAbsences={props.onImportAbsences}
                    onEditEntry={props.onEditEntry}
                    currentUser={props.currentUser}
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