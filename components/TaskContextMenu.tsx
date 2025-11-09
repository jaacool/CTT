import React, { useEffect, useRef, useState } from 'react';
import { DeleteTaskModal } from './DeleteTaskModal';
import { Task, Project } from '../types';

interface TaskContextMenuProps {
  x: number;
  y: number;
  onClose: () => void;
  onPinToDashboard: () => void;
  onDeleteTask?: (moveTimeEntriesTo?: string) => void;
  isPinned: boolean;
  task?: Task;
  projects?: Project[];
  timeEntriesCount?: number;
  totalHours?: number;
}

export const TaskContextMenu: React.FC<TaskContextMenuProps> = ({
  x,
  y,
  onClose,
  onPinToDashboard,
  onDeleteTask,
  isPinned,
  task,
  projects,
  timeEntriesCount = 0,
  totalHours = 0
}) => {
  const menuRef = useRef<HTMLDivElement>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [onClose]);

  return (
    <>
    <div
      ref={menuRef}
      className="fixed bg-c-surface border border-c-highlight rounded-lg shadow-2xl py-2 z-50 min-w-[200px]"
      style={{ left: x, top: y }}
      onContextMenu={(e) => e.stopPropagation()}
    >
      <button
        onClick={() => {
          onPinToDashboard();
          onClose();
        }}
        className="w-full flex items-center space-x-3 px-4 py-2 text-white hover:bg-c-highlight transition-colors text-left"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          {isPinned ? (
            <>
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </>
          ) : (
            <>
              <rect x="3" y="3" width="7" height="7"></rect>
              <rect x="14" y="3" width="7" height="7"></rect>
              <rect x="14" y="14" width="7" height="7"></rect>
              <rect x="3" y="14" width="7" height="7"></rect>
            </>
          )}
        </svg>
        <span>{isPinned ? 'Vom Dashboard entfernen' : 'Zum Dashboard hinzufügen'}</span>
      </button>
      
      {onDeleteTask && task && (
        <>
          <div className="border-t border-c-highlight my-1"></div>
          <button
            onClick={() => setShowDeleteModal(true)}
            className="w-full flex items-center space-x-3 px-4 py-2 text-red-500 hover:bg-red-500/10 transition-colors text-left"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="3 6 5 6 21 6"></polyline>
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
              <line x1="10" y1="11" x2="10" y2="17"></line>
              <line x1="14" y1="11" x2="14" y2="17"></line>
            </svg>
            <span>Aufgabe löschen</span>
          </button>
        </>
      )}
    </div>
    
    {/* Delete Modal */}
    {showDeleteModal && task && projects && (
      <DeleteTaskModal
        task={task}
        projects={projects}
        timeEntriesCount={timeEntriesCount}
        totalHours={totalHours}
        onClose={() => setShowDeleteModal(false)}
        onDelete={(moveTimeEntriesTo) => {
          onDeleteTask?.(moveTimeEntriesTo);
          setShowDeleteModal(false);
          onClose();
        }}
      />
    )}
    </>
  );
};
