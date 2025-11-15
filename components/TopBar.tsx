import React, { useState, useRef, useEffect } from 'react';
import { User, Role } from '../types';

interface TopBarProps {
  user: User;
  users: User[];
  roles: Role[];
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  onChangeRole: (roleId: string) => void;
  onChangeUser: (userId: string) => void;
  onToggleSidebar: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({ user, users, roles, canUndo, canRedo, onUndo, onRedo, onChangeRole, onChangeUser, onToggleSidebar }) => {
  const [showRoleMenu, setShowRoleMenu] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const roleMenuRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (roleMenuRef.current && !roleMenuRef.current.contains(event.target as Node)) {
        setShowRoleMenu(false);
      }
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setShowUserMenu(false);
      }
    };

    if (showRoleMenu || showUserMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showRoleMenu, showUserMenu]);

  const currentRole = roles.find(r => r.id === user.role);

  return (
    <div className="w-full h-14 bg-surface border-b border-border flex items-center justify-between px-4 md:px-6">
      {/* Left Side: Hamburger on mobile, User Info on desktop */}
      <div className="flex items-center space-x-3">
        <button onClick={onToggleSidebar} className="md:hidden p-2 rounded-md hover:bg-overlay">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="3" y1="12" x2="21" y2="12"></line>
            <line x1="3" y1="6" x2="21" y2="6"></line>
            <line x1="3" y1="18" x2="21" y2="18"></line>
          </svg>
        </button>
        <div className="hidden md:flex items-center space-x-3 relative" ref={userMenuRef}>
          <button
            onClick={() => setShowUserMenu(!showUserMenu)}
            className="flex items-center space-x-3 hover:bg-overlay rounded-lg p-1 pr-3 transition-colors"
          >
            <img 
              src={user.avatarUrl} 
              alt={user.name}
              className="w-9 h-9 rounded-full border-2 border-border cursor-pointer"
            />
            <div className="flex flex-col">
              <span className="text-sm font-semibold text-text-primary">{user.name}</span>
              <span className="text-xs text-text-secondary">{user.email}</span>
            </div>
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-text-secondary">
              <polyline points="6 9 12 15 18 9"></polyline>
            </svg>
          </button>

          {/* User Selection Menu */}
          {showUserMenu && (
            <div className="absolute top-12 left-0 bg-surface border border-border rounded-lg shadow-xl z-50 min-w-[280px] p-2">
              <div className="px-3 py-2 text-xs text-text-secondary border-b border-border mb-2">
                Nutzer wechseln (Test-Modus)
              </div>
              {users.map(u => (
                <button
                  key={u.id}
                  onClick={() => {
                    onChangeUser(u.id);
                    setShowUserMenu(false);
                  }}
                  className={`w-full px-3 py-2 text-left text-sm hover:bg-overlay rounded-md transition-colors flex items-center space-x-3 ${
                    user.id === u.id ? 'bg-overlay' : ''
                  }`}
                >
                  <img 
                    src={u.avatarUrl} 
                    alt={u.name}
                    className="w-8 h-8 rounded-full border border-border"
                  />
                  <div className="flex-1">
                    <div className={`font-medium ${
                      user.id === u.id ? 'text-glow-cyan' : 'text-text-primary'
                    }`}>{u.name}</div>
                    <div className="text-xs text-text-secondary">{u.email}</div>
                  </div>
                  {user.id === u.id && (
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-glow-cyan">
                      <polyline points="20 6 9 17 4 12"></polyline>
                    </svg>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Role Switcher - Center (hidden on mobile) */}
      <div className="hidden md:flex relative" ref={roleMenuRef}>
        <button
          onClick={() => setShowRoleMenu(!showRoleMenu)}
          className="flex items-center space-x-2 px-3 py-1.5 bg-background hover:bg-overlay rounded-lg transition-colors border border-border"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
            <circle cx="9" cy="7" r="4"></circle>
            <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
            <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
          </svg>
          <span className="text-sm font-medium text-text-primary">{currentRole?.name || 'Keine Rolle'}</span>
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="6 9 12 15 18 9"></polyline>
          </svg>
        </button>

        {/* Role Selection Menu */}
        {showRoleMenu && (
          <div className="absolute top-12 left-0 bg-surface border border-border rounded-lg shadow-xl z-50 min-w-[200px] p-2">
            <div className="px-3 py-2 text-xs text-text-secondary border-b border-border mb-2">
              Rolle wechseln (Test-Modus)
            </div>
            {roles.map(role => (
              <button
                key={role.id}
                onClick={() => {
                  onChangeRole(role.id);
                  setShowRoleMenu(false);
                }}
                className={`w-full px-3 py-2 text-left text-sm hover:bg-overlay rounded-md transition-colors flex items-center justify-between ${
                  user.role === role.id ? 'bg-overlay text-glow-cyan font-semibold' : 'text-text-primary'
                }`}
              >
                <span>{role.name}</span>
                {user.role === role.id && (
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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
          className={`flex items-center justify-center w-9 h-9 rounded-lg transition-all ${
            canUndo 
              ? 'bg-background hover:bg-overlay text-text-primary cursor-pointer' 
              : 'bg-background text-text-secondary cursor-not-allowed opacity-50'
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
          className={`flex items-center justify-center w-9 h-9 rounded-lg transition-all ${
            canRedo 
              ? 'bg-background hover:bg-overlay text-text-primary cursor-pointer' 
              : 'bg-background text-text-secondary cursor-not-allowed opacity-50'
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
