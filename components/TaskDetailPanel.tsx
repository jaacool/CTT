import React, { useState, useEffect } from 'react';
import { Task, Subtask, Activity, User } from '../types';
import { formatTime, formatRelativeTime } from './utils';
import { ClockIcon, PaperclipIcon, MessageSquareIcon, CheckSquareIcon, PlannerIcon, PlayIcon, PauseIcon } from './Icons';
import { useGlow } from '../contexts/GlowContext';
import { AssigneeSelector } from './AssigneeSelector';

interface TaskDetailPanelProps {
  item: Task | Subtask | null;
  onItemUpdate: (item: Task | Subtask) => void;
  onDescriptionUpdate: (itemId: string, description: string) => void;
  onRenameItem: (itemId: string, newName: string) => void;
  trackedTime: number;
  activeTimerTaskId: string | null;
  onToggleTimer: (itemId: string) => void;
  onAddSubtask: (taskId: string, title: string) => void;
  onAddTodo: (itemId: string, text: string) => void;
  itemContext: { projectName: string; listTitle: string } | null;
  onSelectItem?: (item: Subtask | null) => void;
  onBillableChange: (itemId: string, billable: boolean) => void;
  allUsers?: User[];
  onUpdateAssignees?: (taskId: string, assignees: User[]) => void;
}

const InfoCard: React.FC<{ label: string; value: string; color: string, textColor: string, icon: React.ReactNode }> = ({ label, value, color, textColor, icon }) => (
  <div className={`flex-1 p-3 rounded-lg ${color}`}>
    <div className={`flex items-center space-x-2 text-xs mb-1 ${textColor}`}>
        {icon}
        <span>{label}</span>
    </div>
    <span className={`text-xl font-bold ${textColor}`}>{value}</span>
  </div>
);

const Section: React.FC<{ title: string, icon: React.ReactNode, children: React.ReactNode }> = ({ title, icon, children }) => (
    <div className="pt-4">
        <h4 className="flex items-center space-x-2 text-sm font-bold text-text-primary mb-2">
            {icon}
            <span>{title}</span>
        </h4>
        {children}
    </div>
);


export const TaskDetailPanel: React.FC<TaskDetailPanelProps> = ({ item, onItemUpdate, onDescriptionUpdate, onRenameItem, trackedTime, activeTimerTaskId, onToggleTimer, onAddSubtask, onAddTodo, itemContext, onSelectItem, onBillableChange, allUsers, onUpdateAssignees }) => {
  const { themeMode } = useGlow();
  const [description, setDescription] = useState(item?.description || '');
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [title, setTitle] = useState(item?.title || '');
  const [isAddingTodo, setIsAddingTodo] = useState(false);
  const [newTodoText, setNewTodoText] = useState('');
  const [isAddingSubtask, setIsAddingSubtask] = useState(false);
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('');
  const [isBillable, setIsBillable] = useState(item?.billable ?? true);


  useEffect(() => {
    setDescription(item?.description || '');
    setTitle(item?.title || '');
    setIsBillable(item?.billable ?? true);
    setIsAddingTodo(false);
    setNewTodoText('');
    setIsAddingSubtask(false);
    setNewSubtaskTitle('');
  }, [item]);

  if (!item) {
    return null;
  }
  
  const handleDescriptionBlur = () => {
    if (description !== item.description) {
      onDescriptionUpdate(item.id, description);
    }
  };

  const handleTitleBlur = () => {
      if (title.trim() && title !== item.title) {
          onRenameItem(item.id, title.trim());
      }
      setIsEditingTitle(false);
  }

  const handleTitleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') handleTitleBlur();
      if (e.key === 'Escape') {
          setTitle(item.title);
          setIsEditingTitle(false);
      }
  }

  const toggleTodo = (todoId: string) => {
    const updatedTodos = item.todos.map(t => t.id === todoId ? { ...t, completed: !t.completed } : t);
    onItemUpdate({ ...item, todos: updatedTodos });
  };

  const deleteTodo = (todoId: string) => {
    const updatedTodos = item.todos.filter(t => t.id !== todoId);
    onItemUpdate({ ...item, todos: updatedTodos });
  };
  
  const isTask = (item: Task | Subtask): item is Task => {
    return (item as Task).subtasks !== undefined;
  };

  const progress = item.timeBudgetHours ? (trackedTime / (item.timeBudgetHours * 3600)) * 100 : 0;
  
  const isTimerActive = activeTimerTaskId === item.id;

  return (
    <aside className={`bg-surface flex-shrink-0 border-l border-overlay px-6 pb-6 flex flex-col space-y-6 overflow-y-auto overflow-x-hidden h-full
      fixed inset-0 z-50 md:relative md:w-96 md:inset-auto md:z-auto transition-transform duration-300 ease-in-out 
      ${item ? 'translate-x-0' : 'translate-x-full md:translate-x-0'}`}>

      {/* Sticky Header with Title, Info and Billable Toggle */}
      <div className="sticky top-0 bg-surface z-10 border-b border-overlay pb-3 -mx-6 px-6 pt-6">
        <button onClick={() => onSelectItem?.(null)} className="md:hidden absolute top-3 right-4 p-2 text-text-secondary hover:text-text-primary">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
        </button>
        <div className="mb-3">
          {isEditingTitle ? (
              <input
                  type="text"
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  onBlur={handleTitleBlur}
                  onKeyDown={handleTitleKeyDown}
                  className="w-full bg-overlay text-lg font-bold text-text-primary border-none outline-none focus:ring-1 focus:ring-glow-purple rounded px-1 -ml-1"
                  autoFocus
              />
          ) : (
              <h3 onDoubleClick={() => setIsEditingTitle(true)} className="text-lg font-bold text-text-primary mb-1">{item.title}</h3>
          )}
          {itemContext && (
            <p className="text-xs text-text-secondary">
              In Projekt: <span className="font-semibold">{itemContext.projectName}</span> → Liste: <span className="font-semibold">{itemContext.listTitle}</span>
            </p>
          )}
        </div>
        
        {/* Billable Toggle */}
        <div>
        <button
          onClick={() => {
            const newBillable = !isBillable;
            setIsBillable(newBillable);
            onBillableChange(item.id, newBillable);
          }}
          className={`flex items-center space-x-2 px-3 py-1 rounded text-xs font-bold transition-all cursor-pointer ${
            isBillable 
              ? 'glow-button-highlight-green-v5 text-green-500' 
              : 'glow-button-highlight-red-v5 text-red-500'
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
        
        {/* Bearbeiter Section */}
        {allUsers && onUpdateAssignees && (
          <div className="mt-4">
            <h4 className="text-xs font-bold text-text-secondary mb-2">BEARBEITER</h4>
            <AssigneeSelector
              assignees={item.assignees}
              allUsers={allUsers}
              onAssigneesChange={(assignees) => onUpdateAssignees(item.id, assignees)}
              size="medium"
            />
          </div>
        )}
      </div>
      
      <Section title="Beschreibung" icon={<MessageSquareIcon className="w-4 h-4"/>}>
        <div className="rounded-lg focus-within:ring-2 focus-within:ring-glow-purple p-2">
          <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              onBlur={handleDescriptionBlur}
              placeholder="Beschreibung hinzufügen..."
              className="w-full bg-transparent border-none outline-none focus:outline-none focus:ring-0 text-text-primary placeholder-text-secondary text-sm h-24 resize-none"
              style={{ 
                border: 'none',
                outline: 'none',
                boxShadow: 'none'
              }}
          />
        </div>
      </Section>

      <Section title="Checkliste" icon={<CheckSquareIcon className="w-5 h-5"/>}>
        <div className="space-y-2.5">
          {item.todos.map(todo => (
            <div key={todo.id} onClick={() => toggleTodo(todo.id)} className="flex items-center space-x-3 group cursor-pointer">
              {todo.completed ? (
                <div className="w-5 h-5 rounded-full bg-glow-lime flex items-center justify-center text-black">
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                </div>
              ) : (
                <div className="w-5 h-5 rounded-full border-2 border-text-secondary"></div>
              )}
              <span className={`flex-1 text-sm ${todo.completed ? 'text-text-secondary' : 'text-text-primary'}`}>{todo.text}</span>
            </div>
          ))}
          {isAddingTodo ? (
            <div className="flex items-center space-x-3">
              <div className="w-5 h-5 border-2 border-dashed border-text-secondary rounded-full"></div>
              <input
                type="text"
                value={newTodoText}
                onChange={(e) => setNewTodoText(e.target.value)}
                onBlur={() => {
                  if (newTodoText.trim()) onAddTodo(item.id, newTodoText.trim());
                  setIsAddingTodo(false); setNewTodoText('');
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    if (newTodoText.trim()) onAddTodo(item.id, newTodoText.trim());
                    setIsAddingTodo(false); setNewTodoText('');
                  } else if (e.key === 'Escape') {
                    setIsAddingTodo(false); setNewTodoText('');
                  }
                }}
                placeholder="Eintrag hinzufügen..."
                className="flex-1 bg-transparent text-sm text-text-primary placeholder-text-secondary outline-none"
                autoFocus
              />
            </div>
          ) : (
            <div onClick={() => setIsAddingTodo(true)} className="flex items-center space-x-3 text-text-secondary cursor-pointer hover:text-text-primary">
              <div className="w-5 h-5 border-2 border-dashed border-text-secondary rounded-full"></div>
              <span className="text-sm">Eintrag hinzufügen</span>
            </div>
          )}
        </div>
      </Section>

      {isTask(item) && (
        <Section title={`Unteraufgaben (${item.subtasks.length})`} icon={<PlannerIcon className="w-5 h-5"/>}>
          <div className="space-y-2.5">
            {item.subtasks.map(subtask => (
              <div key={subtask.id} className="flex items-center space-x-3 text-text-primary text-sm">
                <div 
                  onClick={(e) => {
                    e.stopPropagation();
                    // Toggle Status: TODO -> IN_PROGRESS -> DONE -> TODO
                    const statusCycle = {
                      'TODO': 'IN_PROGRESS',
                      'IN_PROGRESS': 'DONE',
                      'DONE': 'TODO'
                    };
                    const newStatus = statusCycle[subtask.status] || 'TODO';
                    onItemUpdate({ ...subtask, status: newStatus as any });
                  }}
                  className="w-5 h-5 rounded-full border-2 border-text-secondary cursor-pointer hover:border-glow-purple transition-colors flex items-center justify-center"
                >
                  {subtask.status === 'DONE' && (
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="text-glow-lime">
                      <polyline points="20 6 9 17 4 12"></polyline>
                    </svg>
                  )}
                  {subtask.status === 'IN_PROGRESS' && (
                    <div className="w-2 h-2 rounded-full bg-glow-purple"></div>
                  )}
                </div>
                <span 
                  onClick={() => onSelectItem?.(subtask)}
                  className="flex-1 cursor-pointer hover:text-glow-purple transition-colors"
                >
                  {subtask.title}
                </span>
              </div>
            ))}
            {isAddingSubtask ? (
              <div className="flex items-center space-x-3">
                <div className="w-5 h-5 border-2 border-dashed border-text-secondary rounded-full"></div>
                <input
                  type="text"
                  value={newSubtaskTitle}
                  onChange={(e) => setNewSubtaskTitle(e.target.value)}
                  onBlur={() => {
                    if (newSubtaskTitle.trim()) onAddSubtask(item.id, newSubtaskTitle.trim());
                    setIsAddingSubtask(false); setNewSubtaskTitle('');
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      if (newSubtaskTitle.trim()) onAddSubtask(item.id, newSubtaskTitle.trim());
                      setIsAddingSubtask(false); setNewSubtaskTitle('');
                    } else if (e.key === 'Escape') {
                      setIsAddingSubtask(false); setNewSubtaskTitle('');
                    }
                  }}
                  placeholder="Neue Unteraufgabe..."
                  className="flex-1 bg-transparent text-sm text-text-primary placeholder-text-secondary outline-none"
                  autoFocus
                />
              </div>
            ) : (
              <div onClick={() => setIsAddingSubtask(true)} className="flex items-center space-x-3 text-text-secondary cursor-pointer hover:text-text-primary">
                <div className="w-5 h-5 border-2 border-dashed border-text-secondary rounded-full"></div>
                <span className="text-sm">Neue Unteraufgabe</span>
              </div>
            )}
          </div>
        </Section>
      )}

      <Section title="Anhänge" icon={<PaperclipIcon className="w-4 h-4"/>}>
          <div className="flex items-center space-x-3 text-text-secondary cursor-pointer hover:text-text-primary text-xs bg-overlay p-3 rounded-md border-2 border-dashed border-text-secondary">
              <span>Datei hinzufügen...</span>
          </div>
      </Section>

      <div className="grid grid-cols-2 gap-3">
          <InfoCard label="Fällig bis" value={item.dueDate ? new Date(item.dueDate).toLocaleDateString('de-DE') : '-'} color="glow-button-highlight-red-v5" textColor={themeMode === 'blue' ? 'text-white' : 'text-red-500'} icon={<ClockIcon className="w-3 h-3"/>}/>
          <InfoCard label="Geplant" value={`${item.timeBudgetHours || 0}h`} color="glow-button-highlight-yellow-v5" textColor={themeMode === 'blue' ? 'text-white' : 'text-yellow-500'} icon={<ClockIcon className="w-3 h-3"/>}/>
          <InfoCard label="Erfasst" value={formatTime(trackedTime)} color="glow-button-highlight-green-v5" textColor={themeMode === 'blue' ? 'text-white' : 'text-green-500'} icon={<ClockIcon className="w-3 h-3"/>}/>
          <div className="flex-1 p-3 rounded-lg glow-button-highlight-cyan-v5">
              <div className={`flex items-center space-x-2 text-xs mb-1 ${themeMode === 'blue' ? 'text-white' : 'text-cyan-500'}`}>
                  <ClockIcon className="w-3 h-3"/>
                  <span>Fortschritt</span>
              </div>
              <div className="flex items-center justify-between">
                <span className={`text-xl font-bold ${themeMode === 'blue' ? 'text-white' : 'text-cyan-500'}`}>{Math.min(100, Math.round(progress))}%</span>
                <div className="w-1/2 bg-overlay rounded-full h-1.5">
                    <div className="bg-glow-purple h-1.5 rounded-full" style={{width: `${Math.min(100, progress)}%`}}></div>
                </div>
              </div>
          </div>
      </div>

       <Section title="Aktivität" icon={<MessageSquareIcon className="w-4 h-4"/>}>
        <div className="space-y-3">
          {item.activity.map((act: Activity) => (
            <div key={act.id} className="flex items-start space-x-3 text-xs">
              <img src={act.user.avatarUrl} alt={act.user.name} className="w-6 h-6 rounded-full mt-0.5" />
              <div>
                <p className="text-text-primary">
                  <span className="font-bold text-text-primary">{act.user.name}</span> {act.text}
                </p>
                <span className="text-text-secondary">{formatRelativeTime(new Date(act.timestamp))}</span>
              </div>
            </div>
          ))}
        </div>
       </Section>

    </aside>
  );
};