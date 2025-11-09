import React, { useState, useEffect } from 'react';
import { Task, Subtask, Activity } from '../types';
import { formatTime, formatRelativeTime } from './utils';
import { ClockIcon, PaperclipIcon, MessageSquareIcon, CheckSquareIcon, PlannerIcon, PlayIcon, PauseIcon } from './Icons';

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
  onSelectItem?: (item: Subtask) => void;
}

const InfoCard: React.FC<{ label: string; value: string; color: string, icon: React.ReactNode }> = ({ label, value, color, icon }) => (
  <div className={`flex-1 p-3 rounded-lg bg-opacity-20 ${color}`}>
    <div className="flex items-center space-x-2 text-xs text-c-subtle mb-1">
        {icon}
        <span>{label}</span>
    </div>
    <span className="text-xl font-bold text-white">{value}</span>
  </div>
);

const Section: React.FC<{ title: string, icon: React.ReactNode, children: React.ReactNode }> = ({ title, icon, children }) => (
    <div className="border-t border-c-highlight pt-4">
        <h4 className="flex items-center space-x-2 text-sm font-bold text-white mb-2">
            {icon}
            <span>{title}</span>
        </h4>
        {children}
    </div>
);


export const TaskDetailPanel: React.FC<TaskDetailPanelProps> = ({ item, onItemUpdate, onDescriptionUpdate, onRenameItem, trackedTime, activeTimerTaskId, onToggleTimer, onAddSubtask, onAddTodo, itemContext, onSelectItem }) => {
  const [description, setDescription] = useState(item?.description || '');
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [title, setTitle] = useState(item?.title || '');
  const [isAddingTodo, setIsAddingTodo] = useState(false);
  const [newTodoText, setNewTodoText] = useState('');
  const [isAddingSubtask, setIsAddingSubtask] = useState(false);
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('');


  useEffect(() => {
    setDescription(item?.description || '');
    setTitle(item?.title || '');
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
    <aside className="w-96 bg-c-surface flex-shrink-0 border-l border-c-highlight p-6 flex flex-col space-y-6 overflow-y-auto">
      <div>
        {isEditingTitle ? (
            <input
                type="text"
                value={title}
                onChange={e => setTitle(e.target.value)}
                onBlur={handleTitleBlur}
                onKeyDown={handleTitleKeyDown}
                className="w-full bg-c-highlight text-lg font-bold text-white border-none outline-none focus:ring-1 focus:ring-c-blue rounded px-1 -ml-1"
                autoFocus
            />
        ) : (
            <h3 onDoubleClick={() => setIsEditingTitle(true)} className="text-lg font-bold text-white mb-1">{item.title}</h3>
        )}
        {itemContext && (
          <p className="text-xs text-c-subtle">
            In Projekt: <span className="font-semibold">{itemContext.projectName}</span> → Liste: <span className="font-semibold">{itemContext.listTitle}</span>
          </p>
        )}
      </div>
      
      <Section title="Beschreibung" icon={<MessageSquareIcon className="w-4 h-4"/>}>
        <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            onBlur={handleDescriptionBlur}
            placeholder="Beschreibung hinzufügen..."
            className="w-full bg-c-bg border border-c-highlight rounded-md p-2 outline-none focus:ring-2 focus:ring-c-blue text-c-text text-xs h-24 resize-none"
        />
      </Section>

      <Section title="Checkliste" icon={<CheckSquareIcon className="w-4 h-4"/>}>
        <div className="space-y-2">
          {item.todos.map(todo => (
            <div key={todo.id} className="flex items-center space-x-3 group">
              <input
                type="checkbox"
                checked={todo.completed}
                onChange={() => toggleTodo(todo.id)}
                className="w-4 h-4 rounded bg-c-highlight border-c-muted text-c-blue focus:ring-c-blue"
              />
              <span className={`flex-1 text-xs ${todo.completed ? 'line-through text-c-muted' : ''}`}>{todo.text}</span>
              <button
                onClick={() => deleteTodo(todo.id)}
                className="opacity-0 group-hover:opacity-100 text-c-muted hover:text-red-500 text-xs transition-opacity"
              >
                ×
              </button>
            </div>
          ))}
          {isAddingTodo ? (
            <div className="flex items-center space-x-2">
              <input
                type="text"
                value={newTodoText}
                onChange={(e) => setNewTodoText(e.target.value)}
                onBlur={() => {
                  if (newTodoText.trim()) {
                    onAddTodo(item.id, newTodoText.trim());
                  }
                  setIsAddingTodo(false);
                  setNewTodoText('');
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && newTodoText.trim()) {
                    onAddTodo(item.id, newTodoText.trim());
                    setIsAddingTodo(false);
                    setNewTodoText('');
                  } else if (e.key === 'Escape') {
                    setIsAddingTodo(false);
                    setNewTodoText('');
                  }
                }}
                placeholder="To-Do eingeben..."
                className="flex-1 bg-c-bg border border-c-highlight rounded px-2 py-1 text-xs outline-none focus:ring-1 focus:ring-c-blue"
                autoFocus
              />
            </div>
          ) : (
            <div 
              onClick={() => setIsAddingTodo(true)}
              className="flex items-center space-x-3 text-c-muted cursor-pointer hover:text-c-text text-xs"
            >
              <div className="w-4 h-4 border-2 border-dashed border-c-muted rounded"></div>
              <span>Eintrag hinzufügen</span>
            </div>
          )}
        </div>
      </Section>
      
      {isTask(item) && (
         <Section title={`Unteraufgaben (${item.subtasks.length})`} icon={<PlannerIcon className="w-4 h-4"/>}>
            <div className="space-y-2">
                {item.subtasks.map(subtask => (
                    <div 
                      key={subtask.id} 
                      onClick={() => onSelectItem?.(subtask)}
                      className="flex items-center space-x-3 text-c-text text-xs cursor-pointer hover:bg-c-highlight p-1 rounded transition-colors"
                    >
                        <div className="w-4 h-4 rounded-full border-2 border-c-muted"></div>
                        <span>{subtask.title}</span>
                    </div>
                ))}
                {isAddingSubtask ? (
                  <div className="flex items-center space-x-2">
                    <input
                      type="text"
                      value={newSubtaskTitle}
                      onChange={(e) => setNewSubtaskTitle(e.target.value)}
                      onBlur={() => {
                        if (newSubtaskTitle.trim()) {
                          onAddSubtask(item.id, newSubtaskTitle.trim());
                        }
                        setIsAddingSubtask(false);
                        setNewSubtaskTitle('');
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && newSubtaskTitle.trim()) {
                          onAddSubtask(item.id, newSubtaskTitle.trim());
                          setIsAddingSubtask(false);
                          setNewSubtaskTitle('');
                        } else if (e.key === 'Escape') {
                          setIsAddingSubtask(false);
                          setNewSubtaskTitle('');
                        }
                      }}
                      placeholder="Unteraufgabe eingeben..."
                      className="flex-1 bg-c-bg border border-c-highlight rounded px-2 py-1 text-xs outline-none focus:ring-1 focus:ring-c-blue"
                      autoFocus
                    />
                  </div>
                ) : (
                  <div 
                    onClick={() => setIsAddingSubtask(true)}
                    className="flex items-center space-x-3 text-c-muted cursor-pointer hover:text-c-text text-xs"
                  >
                    <div className="w-4 h-4 border-2 border-dashed border-c-muted rounded"></div>
                    <span>Neue Unteraufgabe</span>
                  </div>
                )}
            </div>
        </Section>
      )}

      <Section title="Anhänge" icon={<PaperclipIcon className="w-4 h-4"/>}>
          <div className="flex items-center space-x-3 text-c-muted cursor-pointer hover:text-c-text text-xs bg-c-highlight p-3 rounded-md border-2 border-dashed border-c-muted">
              <span>Datei hinzufügen...</span>
          </div>
      </Section>

      <div className="grid grid-cols-2 gap-3">
          <InfoCard label="Fällig bis" value={item.dueDate ? new Date(item.dueDate).toLocaleDateString('de-DE') : '-'} color="bg-red-500" icon={<ClockIcon className="w-3 h-3"/>}/>
          <InfoCard label="Geplant" value={`${item.timeBudgetHours || 0}h`} color="bg-yellow-500" icon={<ClockIcon className="w-3 h-3"/>}/>
          <InfoCard label="Erfasst" value={`${Math.floor(trackedTime / 3600)}h`} color="bg-green-500" icon={<ClockIcon className="w-3 h-3"/>}/>
          <div className={`flex-1 p-3 rounded-lg bg-opacity-20 bg-blue-500`}>
              <div className="flex items-center space-x-2 text-xs text-c-subtle mb-1">
                  <ClockIcon className="w-3 h-3"/>
                  <span>Fortschritt</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xl font-bold text-white">{Math.min(100, Math.round(progress))}%</span>
                <div className="w-1/2 bg-c-highlight rounded-full h-1.5">
                    <div className="bg-c-blue h-1.5 rounded-full" style={{width: `${Math.min(100, progress)}%`}}></div>
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
                <p className="text-c-text">
                  <span className="font-bold text-white">{act.user.name}</span> {act.text}
                </p>
                <span className="text-c-subtle">{formatRelativeTime(new Date(act.timestamp))}</span>
              </div>
            </div>
          ))}
        </div>
       </Section>

    </aside>
  );
};