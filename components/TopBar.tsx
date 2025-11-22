import React, { useState, useRef, useEffect } from 'react';
import { User, Role, AbsenceRequest, UserStatus, Anomaly, AnomalyStatus, AbsenceStatus, AbsenceType } from '../types';

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
  absenceRequests?: AbsenceRequest[];
  anomalies?: Anomaly[];
  onOpenNotifications?: () => void;
  notificationsReady?: boolean;
}

export const TopBar: React.FC<TopBarProps> = ({ user, users, roles, canUndo, canRedo, onUndo, onRedo, onChangeRole, onChangeUser, onToggleSidebar, absenceRequests = [], anomalies = [], onOpenNotifications, notificationsReady = false }) => {
  const [showRoleMenu, setShowRoleMenu] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const roleMenuRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const [cachedNotificationCount, setCachedNotificationCount] = useState<number | null>(null);

  const isAdmin = user.role === 'role-1';
  
  // ===============================
  // Zähl-Logik wie im NotificationsModal
  // ===============================
  // Relevante Anträge für aktuellen User
  const relevantRequests = absenceRequests.filter(req => {
    // Admins sehen alle ausstehenden Anträge
    if (isAdmin && req.status === AbsenceStatus.Pending) return true;

    // Admins sehen alle genehmigten Krankmeldungen (auch gemeldete)
    if (isAdmin && req.type === AbsenceType.Sick && req.status === AbsenceStatus.Approved) return true;

    // User sehen ihre eigenen Anträge
    if (req.user.id === user.id) return true;

    return false;
  });

  // Pending-Anträge wie im Modal (inkl. spezieller Krankmeldungs-Logik)
  const pendingRequests = relevantRequests.filter(req =>
    req.status === AbsenceStatus.Pending ||
    (req.type === AbsenceType.Sick && req.status === AbsenceStatus.Approved && !req.sickLeaveReported)
  );

  // Aktive Anomalien: nur OPEN, gleiche Filter wie im Modal
  const activeAnomalies = anomalies.filter(a =>
    (isAdmin || a.userId === user.id) &&
    a.status === AnomalyStatus.Open
  );

  const totalNotificationCount = pendingRequests.length + activeAnomalies.length;

  // Anzeige-Wert: vor erster Berechnung gecachten Wert verwenden, danach Live-Wert
  const displayNotificationCount = notificationsReady
    ? totalNotificationCount
    : (cachedNotificationCount ?? 0);

  // Cache-Handling pro User
  useEffect(() => {
    const storageKey = `ctt_last_notification_count_${user.id}`;

    if (!notificationsReady) {
      // Beim Initial-Render (oder nach User-Wechsel) letzten Wert aus localStorage laden
      try {
        const saved = localStorage.getItem(storageKey);
        if (saved) {
          const parsed = parseInt(saved, 10);
          if (!Number.isNaN(parsed)) {
            setCachedNotificationCount(parsed);
          } else {
            setCachedNotificationCount(null);
          }
        } else {
          setCachedNotificationCount(null);
        }
      } catch (e) {
        setCachedNotificationCount(null);
      }
    } else {
      // Sobald die neue Zahl berechnet ist, in localStorage persistieren
      try {
        localStorage.setItem(storageKey, String(totalNotificationCount));
      } catch (e) {
        // Ignorieren, wenn localStorage nicht verfügbar ist
      }
      setCachedNotificationCount(totalNotificationCount);
    }
  }, [notificationsReady, totalNotificationCount, user.id]);

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
      {/* Left Side: Hamburger on mobile, User Info */}
      <div className="flex items-center space-x-3">
        <button onClick={onToggleSidebar} className="md:hidden p-2 rounded-md hover:bg-overlay text-text-primary">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="3" y1="12" x2="21" y2="12"></line>
            <line x1="3" y1="6" x2="21" y2="6"></line>
            <line x1="3" y1="18" x2="21" y2="18"></line>
          </svg>
        </button>
        
        <div className="relative" ref={userMenuRef}>
          <button
            onClick={() => setShowUserMenu(!showUserMenu)}
            className="flex items-center space-x-2 md:space-x-3 hover:bg-overlay rounded-lg p-1 pr-2 md:pr-3 transition-colors"
          >
            <img 
              src={user.avatarUrl} 
              alt={user.name}
              className="w-8 h-8 md:w-9 md:h-9 rounded-full border-2 border-border cursor-pointer"
            />
            <div className="hidden md:flex flex-col text-left">
              <span className="text-sm font-semibold text-text-primary">{user.name}</span>
              <span className="text-xs text-text-secondary">{user.email}</span>
            </div>
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-text-secondary hidden md:block">
              <polyline points="6 9 12 15 18 9"></polyline>
            </svg>
          </button>

          {/* User Selection Menu */}
          {showUserMenu && (
            <div className="absolute top-12 left-0 bg-surface border border-border rounded-lg shadow-xl z-50 min-w-[280px] p-2">
              <div className="px-3 py-2 text-xs text-text-secondary border-b border-border mb-2">
                Nutzer wechseln (Test-Modus)
              </div>
              {users.filter(u => u.status !== UserStatus.Inactive).map(u => (
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
                      user.id === u.id ? 'text-glow-purple' : 'text-text-primary'
                    }`}>{u.name}</div>
                    <div className="text-xs text-text-secondary">{u.email}</div>
                  </div>
                  {user.id === u.id && (
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-glow-purple">
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
                  user.role === role.id ? 'bg-overlay text-glow-purple font-semibold' : 'text-text-primary'
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

      {/* Notifications & Undo/Redo Buttons - Right Side */}
      <div className="flex items-center space-x-2">
        {/* Notification Bell */}
        {onOpenNotifications && (
          <button
            onClick={onOpenNotifications}
            className="relative flex items-center justify-center w-9 h-9 rounded-lg bg-background hover:bg-overlay text-text-primary transition-all"
            title="Benachrichtigungen"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
              <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
            </svg>
            {displayNotificationCount > 0 && (
              <span className="absolute -top-1 -right-1 flex items-center justify-center w-5 h-5 text-[10px] font-bold text-white bg-red-500 rounded-full border-2 border-surface">
                {displayNotificationCount}
              </span>
            )}
          </button>
        )}
        
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
