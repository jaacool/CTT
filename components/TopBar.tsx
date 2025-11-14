import React, { useState, useRef, useEffect } from 'react';
import { User, Role } from '../types';

interface TopBarProps {
  user: User;
  roles: Role[];
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  onChangeRole: (roleId: string) => void;
  onToggleSidebar: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({ user, roles, canUndo, canRedo, onUndo, onRedo, onChangeRole, onToggleSidebar }) => {
  const [showRoleMenu, setShowRoleMenu] = useState(false);
  const roleMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (roleMenuRef.current && !roleMenuRef.current.contains(event.target as Node)) {
        setShowRoleMenu(false);
      }
    };

    if (showRoleMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showRoleMenu]);

  const currentRole = roles.find(r => r.id === user.role);

  return (
    <div className="w-full h-14 glass border-b border-ai-border flex items-center justify-between px-4 md:px-6 relative z-10">
      {/* Left Side: Hamburger on mobile, User Info on desktop */}
      <div className="flex items-center space-x-3">
        <button onClick={onToggleSidebar} className="md:hidden p-2 rounded-lg hover:bg-ai-surface-light transition-smooth hover-lift">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="3" y1="12" x2="21" y2="12"></line>
            <line x1="3" y1="6" x2="21" y2="6"></line>
            <line x1="3" y1="18" x2="21" y2="18"></line>
          </svg>
        </button>
        <div className="hidden md:flex items-center space-x-3">
          <div className="relative">
            <img 
              src={user.avatarUrl} 
              alt={user.name}
              className="w-9 h-9 rounded-full border-2 border-ai-purple shadow-ai-glow"
            />
            <div className="absolute inset-0 rounded-full border-gradient"></div>
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-semibold text-ai-text">{user.name}</span>
            <span className="text-xs text-ai-text-muted">{user.email}</span>
          </div>
        </div>
      </div>

      {/* Role Switcher - Center (hidden on mobile) */}
      <div className="hidden md:flex relative" ref={roleMenuRef}>
        <button
          onClick={() => setShowRoleMenu(!showRoleMenu)}
          className="flex items-center space-x-2 px-4 py-2 glass-light hover:glass rounded-xl transition-smooth border border-ai-border hover:border-ai-purple hover-lift"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-ai-purple">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
            <circle cx="9" cy="7" r="4"></circle>
            <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
            <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
          </svg>
          <span className="text-sm font-medium text-ai-text">{currentRole?.name || 'Keine Rolle'}</span>
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-ai-text-muted">
            <polyline points="6 9 12 15 18 9"></polyline>
          </svg>
        </button>

        {/* Role Selection Menu */}
        {showRoleMenu && (
          <div className="absolute top-14 left-0 glass-strong border border-ai-border-strong rounded-2xl shadow-ai-card z-50 min-w-[220px] p-2 fade-in">
            <div className="px-4 py-3 text-xs text-ai-text-subtle border-b border-ai-border mb-2">
              Rolle wechseln (Test-Modus)
            </div>
            {roles.map(role => (
              <button
                key={role.id}
                onClick={() => {
                  onChangeRole(role.id);
                  setShowRoleMenu(false);
                }}
                className={`w-full px-4 py-3 text-left text-sm rounded-xl transition-smooth flex items-center justify-between hover-lift ${
                  user.role === role.id 
                    ? 'glass text-ai-purple font-semibold shadow-ai-glow' 
                    : 'text-ai-text hover:glass-light'
                }`}
              >
                <span>{role.name}</span>
                {user.role === role.id && (
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-ai-purple">
                    <polyline points="20 6 9 17 4 12"></polyline>
                  </svg>
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Undo/Redo Buttons - Right Side */}
      <div className="flex items-center space-x-2">
        <button
          onClick={onUndo}
          disabled={!canUndo}
          className={`flex items-center justify-center w-10 h-10 rounded-xl transition-smooth ${
            canUndo 
              ? 'glass-light hover:glass hover:shadow-ai-glow text-ai-text cursor-pointer hover-lift' 
              : 'glass-light text-ai-text-subtle cursor-not-allowed opacity-40'
          }`}
          title="Rückgängig (Strg+Z)"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="1 4 1 10 7 10"></polyline>
            <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"></path>
          </svg>
        </button>
        <button
          onClick={onRedo}
          disabled={!canRedo}
          className={`flex items-center justify-center w-10 h-10 rounded-xl transition-smooth ${
            canRedo 
              ? 'glass-light hover:glass hover:shadow-ai-glow text-ai-text cursor-pointer hover-lift' 
              : 'glass-light text-ai-text-subtle cursor-not-allowed opacity-40'
          }`}
          title="Wiederherstellen (Strg+Y)"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="23 4 23 10 17 10"></polyline>
            <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path>
          </svg>
        </button>
      </div>
    </div>
  );
};
