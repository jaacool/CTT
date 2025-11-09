import React, { useEffect, useRef } from 'react';

interface TaskContextMenuProps {
  x: number;
  y: number;
  onClose: () => void;
  onPinToDashboard: () => void;
  isPinned: boolean;
}

export const TaskContextMenu: React.FC<TaskContextMenuProps> = ({
  x,
  y,
  onClose,
  onPinToDashboard,
  isPinned
}) => {
  const menuRef = useRef<HTMLDivElement>(null);

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
    </div>
  );
};
