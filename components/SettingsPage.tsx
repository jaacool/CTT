import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { saveUserSettings } from '../utils/supabaseSync';
import { User, UserStatus, Role, TimeEntry, Project, AbsenceRequest, ChatChannel } from '../types';
import { AddUserModal } from './AddUserModal';
import { EditUserModal } from './EditUserModal';
import { RolesPage } from './RolesPage';
import { TimeReportImportExport } from './TimeReportImportExport';
import { SupabaseSettings } from './SupabaseSettings';
import { ChannelManagement } from './ChannelManagement';
import { ImportResult } from '../utils/timeReportImportExport';
import { useGlow } from '../contexts/GlowContext';
import { GermanState, GERMAN_STATE_NAMES } from '../utils/holidays';

interface SettingsPageProps {
  users: User[];
  roles: Role[];
  timeEntries: TimeEntry[];
  projects: Project[];
  absenceRequests: AbsenceRequest[];
  onAddUser: (userData: { name: string; title?: string; email: string; tags?: string[]; status: UserStatus }) => void;
  onUpdateUser: (userId: string, userData: Partial<User>) => void;
  onDeleteUser: (userId: string) => void;
  onChangeRole: (userId: string, roleId: string) => void;
  onChangeUserStatus: (userId: string, status: UserStatus) => void;
  onImportComplete: (result: ImportResult) => void;
  chatChannels?: ChatChannel[];
  currentUser?: User;
  onCreateChannel?: (name: string, description: string, memberIds: string[], isPrivate: boolean) => void;
  onUpdateChannel?: (channelId: string, name: string, description: string, memberIds: string[], isPrivate: boolean) => void;
  onDeleteChannel?: (channelId: string) => void;
  selectedState?: GermanState;
  onSelectedStateChange: (state: GermanState | undefined) => void;
  separateHomeOffice: boolean;
  onSeparateHomeOfficeChange: (value: boolean) => void;
  showAdminsInDMs?: boolean;
  onToggleShowAdminsInDMs?: (show: boolean) => void;
  onDeleteAllMessages?: () => void;
  maxUploadSize?: number;
  onMaxUploadSizeChange?: (size: number) => void;
}

const UserRow: React.FC<{ 
  user: User; 
  roles: Role[]; 
  onEdit: (user: User) => void; 
  onDelete: (userId: string) => void; 
  onChangeRole: (userId: string, roleId: string) => void;
  onChangeStatus: (userId: string, status: UserStatus) => void;
}> = ({ user, roles, onEdit, onDelete, onChangeRole, onChangeStatus }) => {
  const [showMenu, setShowMenu] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [showRoleMenu, setShowRoleMenu] = useState(false);
  const [showStatusMenu, setShowStatusMenu] = useState(false);
  const [menuPosition, setMenuPosition] = useState<{ top: number; left: number } | null>(null);
  const [roleMenuPosition, setRoleMenuPosition] = useState<{ top: number; left: number } | null>(null);
  const [statusMenuPosition, setStatusMenuPosition] = useState<{ top: number; left: number } | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const roleMenuRef = useRef<HTMLDivElement>(null);
  const statusMenuRef = useRef<HTMLDivElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const roleButtonRef = useRef<HTMLButtonElement>(null);
  const statusButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node) && 
          menuButtonRef.current && !menuButtonRef.current.contains(event.target as Node)) {
        setShowMenu(false);
        setConfirming(false);
      }
      if (roleMenuRef.current && !roleMenuRef.current.contains(event.target as Node) &&
          roleButtonRef.current && !roleButtonRef.current.contains(event.target as Node)) {
        setShowRoleMenu(false);
      }
      if (statusMenuRef.current && !statusMenuRef.current.contains(event.target as Node) &&
          statusButtonRef.current && !statusButtonRef.current.contains(event.target as Node)) {
        setShowStatusMenu(false);
      }
    };

    if (showMenu || showRoleMenu || showStatusMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showMenu, showRoleMenu, showStatusMenu]);

  const handleMenuToggle = () => {
    if (!showMenu && menuButtonRef.current) {
      const rect = menuButtonRef.current.getBoundingClientRect();
      setMenuPosition({
        top: rect.bottom + 4,
        left: rect.right - 200 // 200px = min-w-[200px] des Menüs
      });
    }
    setShowMenu(!showMenu);
  };

  const handleRoleMenuToggle = () => {
    if (!showRoleMenu && roleButtonRef.current) {
      const rect = roleButtonRef.current.getBoundingClientRect();
      setRoleMenuPosition({
        top: rect.bottom + 4,
        left: rect.left
      });
    }
    setShowRoleMenu(!showRoleMenu);
  };

  const handleStatusMenuToggle = () => {
    if (!showStatusMenu && statusButtonRef.current) {
      const rect = statusButtonRef.current.getBoundingClientRect();
      setStatusMenuPosition({
        top: rect.bottom + 4,
        left: rect.left
      });
    }
    setShowStatusMenu(!showStatusMenu);
  };
  const getTagColor = (tag: string) => {
    switch (tag.toLowerCase()) {
      case 'editor':
        return 'bg-yellow-500/20 text-yellow-500';
      case 'produktion':
        return 'bg-purple-500/20 text-purple-500';
      default:
        return 'bg-blue-500/20 text-blue-500';
    }
  };

  const userRole = roles.find(r => r.id === user.role);

  return (
    <div className="grid grid-cols-12 gap-4 items-center py-2 px-4 border-b border-overlay/50 text-sm hover:bg-overlay/30 transition-colors">
      {/* Teams */}
      <div className="col-span-4 flex items-center space-x-3">
        <img src={user.avatarUrl} alt={user.name} className="w-9 h-9 rounded-full" />
        <div>
          {user.title && <div className="text-xs text-text-secondary">{user.title}</div>}
          <div className="font-semibold text-text-primary">{user.name}</div>
        </div>
      </div>

      {/* Role */}
      <div className="col-span-3 flex items-center space-x-2">
        {userRole ? (
          <button
            ref={roleButtonRef}
            onClick={handleRoleMenuToggle}
            className={`px-2 py-1 rounded-md text-xs font-semibold cursor-pointer hover:opacity-80 transition-opacity ${getTagColor(userRole.name)}`}
          >
            {userRole.name}
          </button>
        ) : (
          <span className="text-xs text-text-secondary italic">Keine Rolle</span>
        )}
        
        {/* Role Selection Menu - Portal */}
        {showRoleMenu && roleMenuPosition && createPortal(
          <div 
            ref={roleMenuRef}
            className="fixed bg-surface border border-overlay rounded-lg shadow-xl z-[9999] min-w-[160px] p-2"
            style={{
              top: `${roleMenuPosition.top}px`,
              left: `${roleMenuPosition.left}px`
            }}
          >
            {roles.map(role => (
              <button
                key={role.id}
                onClick={() => {
                  onChangeRole(user.id, role.id);
                  setShowRoleMenu(false);
                }}
                className={`w-full px-3 py-2 text-left text-sm hover:bg-overlay rounded-md transition-colors ${
                  user.role === role.id ? 'bg-overlay text-glow-purple font-semibold' : 'text-text-primary'
                }`}
              >
                {role.name}
              </button>
            ))}
          </div>,
          document.body
        )}
      </div>

      {/* E-Mail */}
      <div className="col-span-2 text-text-secondary truncate">{user.email}</div>

      {/* Status */}
      <div className="col-span-2">
        <button
          ref={statusButtonRef}
          onClick={handleStatusMenuToggle}
          className={`px-3 py-1 rounded-full text-xs font-bold cursor-pointer hover:opacity-80 transition-opacity ${
            user.status === UserStatus.Active ? 'bg-green-500/20 text-green-500' : 'bg-red-500/20 text-red-500'
          }`}
        >
          {user.status === UserStatus.Active ? 'Aktiv' : 'Deaktiviert'}
        </button>
        
        {/* Status Selection Menu - Portal */}
        {showStatusMenu && statusMenuPosition && createPortal(
          <div 
            ref={statusMenuRef}
            className="fixed bg-surface border border-overlay rounded-lg shadow-xl z-[9999] min-w-[140px] p-2"
            style={{
              top: `${statusMenuPosition.top}px`,
              left: `${statusMenuPosition.left}px`
            }}
          >
            <button
              onClick={() => {
                onChangeStatus(user.id, UserStatus.Active);
                setShowStatusMenu(false);
              }}
              className={`w-full px-3 py-2 text-left text-sm hover:bg-overlay rounded-md transition-colors flex items-center space-x-2 ${
                user.status === UserStatus.Active ? 'bg-overlay text-glow-purple font-semibold' : 'text-text-primary'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-green-500"></span>
              <span>Aktiv</span>
            </button>
            <button
              onClick={() => {
                onChangeStatus(user.id, UserStatus.Inactive);
                setShowStatusMenu(false);
              }}
              className={`w-full px-3 py-2 text-left text-sm hover:bg-overlay rounded-md transition-colors flex items-center space-x-2 ${
                user.status === UserStatus.Inactive ? 'bg-overlay text-glow-purple font-semibold' : 'text-text-primary'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-red-500"></span>
              <span>Deaktiviert</span>
            </button>
          </div>,
          document.body
        )}
      </div>

      {/* Actions */}
      <div className="col-span-1 flex justify-end">
        <button 
          ref={menuButtonRef}
          onClick={handleMenuToggle}
          className="text-text-secondary hover:text-text-primary"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="1"/><circle cx="12" cy="5" r="1"/><circle cx="12" cy="19" r="1"/></svg>
        </button>
        
        {/* Context Menu - Portal */}
        {showMenu && menuPosition && createPortal(
          <div 
            ref={menuRef}
            className="fixed bg-surface border border-overlay rounded-lg shadow-xl z-[9999] min-w-[200px] p-2"
            style={{
              top: `${menuPosition.top}px`,
              left: `${menuPosition.left}px`
            }}
          >
            <button
              onClick={() => {
                onEdit(user);
                setShowMenu(false);
              }}
              className="w-full px-3 py-2 text-left text-text-primary hover:bg-overlay rounded-md transition-colors flex items-center space-x-2"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
              <span>Bearbeiten</span>
            </button>
            <div className="border-t border-overlay my-1"></div>
            {!confirming ? (
              <button
                onClick={() => setConfirming(true)}
                className="w-full px-3 py-2 text-left text-red-500 hover:bg-overlay rounded-md transition-colors flex items-center space-x-2"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="3 6 5 6 21 6"></polyline>
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                </svg>
                <span>Benutzer löschen</span>
              </button>
            ) : (
              <div className="space-y-2">
                <div className="px-2 text-sm text-text-primary">Sicher löschen?</div>
                <div className="flex justify-end space-x-2">
                  <button
                    onClick={() => { setConfirming(false); setShowMenu(false); }}
                    className="px-3 py-1 text-sm bg-background text-text-primary rounded-md hover:bg-overlay"
                  >
                    Abbrechen
                  </button>
                  <button
                    onClick={() => { onDelete(user.id); setShowMenu(false); setConfirming(false); }}
                    className="px-3 py-1 text-sm bg-red-600 text-white rounded-md hover:bg-red-700"
                  >
                    Löschen
                  </button>
                </div>
              </div>
            )}
          </div>,
          document.body
        )}
      </div>
    </div>
  );
};

export const SettingsPage: React.FC<SettingsPageProps> = ({ users, roles, timeEntries, projects, absenceRequests, onAddUser, onUpdateUser, onDeleteUser, onChangeRole, onChangeUserStatus, onImportComplete, chatChannels, currentUser, onCreateChannel, onUpdateChannel, onDeleteChannel, selectedState, onSelectedStateChange, separateHomeOffice, onSeparateHomeOfficeChange, showAdminsInDMs, onToggleShowAdminsInDMs, onDeleteAllMessages, maxUploadSize, onMaxUploadSizeChange }) => {
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState<'users' | 'roles' | 'appearance' | 'import-export' | 'supabase' | 'channels' | 'calendar'>('users');
  const { themeMode, setThemeMode } = useGlow();
  
  const isAdmin = currentUser?.role === 'role-1';

  return (
    <div className="p-4 md:p-6 w-full max-h-screen overflow-hidden flex flex-col">
      <div className="flex space-x-2 md:space-x-4 mb-6 overflow-x-auto pb-2 scrollbar-hide flex-shrink-0">
        <button
          onClick={() => setActiveTab('users')}
          className={`px-3 py-1.5 md:px-4 md:py-2 rounded-lg font-semibold transition-colors whitespace-nowrap flex-shrink-0 text-sm md:text-base ${
            activeTab === 'users' ? 'glow-button text-text-primary' : 'bg-background text-text-primary hover:bg-overlay'
          }`}
        >
          User
        </button>
        <button
          onClick={() => setActiveTab('roles')}
          className={`px-3 py-1.5 md:px-4 md:py-2 rounded-lg font-semibold transition-colors whitespace-nowrap flex-shrink-0 text-sm md:text-base ${
            activeTab === 'roles' ? 'glow-button text-text-primary' : 'bg-background text-text-primary hover:bg-overlay'
          }`}
        >
          Rollen
        </button>
        <button
          onClick={() => setActiveTab('appearance')}
          className={`px-3 py-1.5 md:px-4 md:py-2 rounded-lg font-semibold transition-colors whitespace-nowrap flex-shrink-0 text-sm md:text-base ${
            activeTab === 'appearance' ? 'glow-button text-text-primary' : 'bg-background text-text-primary hover:bg-overlay'
          }`}
        >
          Erscheinungsbild
        </button>
        <button
          onClick={() => setActiveTab('import-export')}
          className={`px-3 py-1.5 md:px-4 md:py-2 rounded-lg font-semibold transition-colors whitespace-nowrap flex-shrink-0 text-sm md:text-base ${
            activeTab === 'import-export' ? 'glow-button text-text-primary' : 'bg-background text-text-primary hover:bg-overlay'
          }`}
        >
          Import/Export
        </button>
        <button
          onClick={() => setActiveTab('supabase')}
          className={`px-3 py-1.5 md:px-4 md:py-2 rounded-lg font-semibold transition-colors whitespace-nowrap flex-shrink-0 text-sm md:text-base ${
            activeTab === 'supabase' ? 'glow-button text-text-primary' : 'bg-background text-text-primary hover:bg-overlay'
          }`}
        >
          Supabase
        </button>
        <button
          onClick={() => setActiveTab('channels')}
          className={`px-3 py-1.5 md:px-4 md:py-2 rounded-lg font-semibold transition-colors whitespace-nowrap flex-shrink-0 text-sm md:text-base ${
            activeTab === 'channels' ? 'glow-button text-text-primary' : 'bg-background text-text-primary hover:bg-overlay'
          }`}
        >
          Chat
        </button>
        <button
          onClick={() => setActiveTab('calendar')}
          className={`px-3 py-1.5 md:px-4 md:py-2 rounded-lg font-semibold transition-colors whitespace-nowrap flex-shrink-0 text-sm md:text-base ${
            activeTab === 'calendar' ? 'glow-button text-text-primary' : 'bg-background text-text-primary hover:bg-overlay'
          }`}
        >
          Kalender
        </button>
      </div>

      {/* Scrollable Content Area */}
      <div className="flex-1 overflow-y-auto">
      {activeTab === 'users' ? (
        <>
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-xl font-bold glow-text">User</h1>
        <button 
          onClick={() => setShowAddUserModal(true)}
          className="glow-button text-text-primary font-semibold px-3 py-1.5 text-sm rounded-lg hover:opacity-80 transition-colors"
        >
          + User hinzufügen
        </button>
      </div>

      <div className="glow-card rounded-lg border border-overlay/50 flex-1 overflow-hidden flex flex-col">
        {/* Header */}
        <div className="grid grid-cols-12 gap-4 py-2 px-4 text-xs font-semibold text-text-secondary border-b border-overlay/50">
          <div className="col-span-4">Teams</div>
          <div className="col-span-3">Rollen</div>
          <div className="col-span-2">E-Mail</div>
          <div className="col-span-2">Status</div>
          <div className="col-span-1"></div>
        </div>

        {/* User List - Scrollable */}
        <div className="overflow-y-auto flex-1">
          {users.map(user => <UserRow key={user.id} user={user} roles={roles} onEdit={setEditingUser} onDelete={onDeleteUser} onChangeRole={onChangeRole} onChangeStatus={onChangeUserStatus} />)}
        </div>
      </div>

      {showAddUserModal && (
        <AddUserModal
          onClose={() => setShowAddUserModal(false)}
          onAddUser={onAddUser}
        />
      )}

      {editingUser && (
        <EditUserModal
          user={editingUser}
          onClose={() => setEditingUser(null)}
          onUpdateUser={onUpdateUser}
        />
      )}
        </>
      ) : activeTab === 'roles' ? (
        <RolesPage roles={roles} />
      ) : activeTab === 'import-export' ? (
        <div>
          <h1 className="text-2xl font-bold glow-text mb-8">Import/Export</h1>
          <TimeReportImportExport
            timeEntries={timeEntries}
            projects={projects}
            users={users}
            onImportComplete={onImportComplete}
          />
        </div>
      ) : activeTab === 'supabase' ? (
        <div>
          <h1 className="text-2xl font-bold glow-text mb-8">Supabase Cloud Sync</h1>
          <SupabaseSettings
            projects={projects}
            timeEntries={timeEntries}
            users={users}
            absenceRequests={absenceRequests}
          />
        </div>
      ) : activeTab === 'channels' ? (
        chatChannels && currentUser && onCreateChannel && onUpdateChannel && onDeleteChannel ? (
          <ChannelManagement
            channels={chatChannels}
            users={users}
            currentUser={currentUser}
            onCreateChannel={onCreateChannel}
            onUpdateChannel={onUpdateChannel}
            onDeleteChannel={onDeleteChannel}
            showAdminsInDMs={showAdminsInDMs}
            onToggleShowAdminsInDMs={onToggleShowAdminsInDMs}
            onDeleteAllMessages={onDeleteAllMessages}
            maxUploadSize={maxUploadSize}
            onMaxUploadSizeChange={onMaxUploadSizeChange}
          />
        ) : (
          <div className="text-center py-12 text-text-secondary">
            Channel-Verwaltung nicht verfügbar
          </div>
        )
      ) : activeTab === 'calendar' ? (
        <div>
          <h1 className="text-2xl font-bold glow-text mb-8">Kalender-Einstellungen</h1>
          <div className="space-y-6">
            {/* Feiertage */}
            <div className="glow-card rounded-lg p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-text-primary mb-1">Feiertage anzeigen</h3>
                  <p className="text-sm text-text-secondary">
                    Wähle ein Bundesland für regionale Feiertage im Kalender
                  </p>
                </div>
                <select
                  value={selectedState || ''}
                  onChange={(e) => {
                    const newState = e.target.value as GermanState || undefined;
                    onSelectedStateChange(newState);
                    if (currentUser) {
                      saveUserSettings(currentUser.id, { selectedState: newState || undefined }).catch(console.error);
                    }
                  }}
                  className="bg-overlay border border-border rounded-lg px-3 py-2 text-text-primary text-sm focus:ring-2 focus:ring-glow-purple outline-none"
                >
                  <option value="">Keine Feiertage</option>
                  {(Object.keys(GERMAN_STATE_NAMES) as GermanState[]).map((state) => (
                    <option key={state} value={state}>
                      {GERMAN_STATE_NAMES[state]}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Home Office Ansicht - Nur für Admins */}
            {isAdmin && (
              <div className="glow-card rounded-lg p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-text-primary mb-1">Home Office Ansicht</h3>
                    <p className="text-sm text-text-secondary">
                      Separate Anzeige für Home Office in der Admin-Kalenderansicht
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      const newValue = !separateHomeOffice;
                      onSeparateHomeOfficeChange(newValue);
                      if (currentUser) {
                        saveUserSettings(currentUser.id, { separateHomeOffice: newValue }).catch(console.error);
                      }
                    }}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      separateHomeOffice ? 'bg-glow-purple' : 'bg-overlay'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        separateHomeOffice ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div>
          <h1 className="text-2xl font-bold glow-text mb-8">Erscheinungsbild</h1>
          <div className="glow-card rounded-lg p-6">
            <div>
              <h3 className="text-lg font-semibold text-text-primary mb-3">Design-Modus</h3>
              <p className="text-sm text-text-secondary mb-4">
                Wähle zwischen verschiedenen visuellen Stilen
              </p>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setThemeMode('glow', currentUser?.id)}
                  className={`px-4 py-3 rounded-lg border-2 transition-all ${
                    themeMode === 'glow'
                      ? 'border-purple-500 bg-purple-500/20 text-purple-400'
                      : 'border-border bg-surface text-text-secondary hover:border-overlay'
                  }`}
                >
                  <div className="font-semibold mb-1">Glow Glass</div>
                  <div className="text-xs opacity-75">Liquid Glass Effekte</div>
                </button>
                <button
                  onClick={() => setThemeMode('blue', currentUser?.id)}
                  className={`px-4 py-3 rounded-lg border-2 transition-all ${
                    themeMode === 'blue'
                      ? 'border-blue-500 bg-blue-600 text-white'
                      : 'border-border bg-surface text-text-secondary hover:border-overlay'
                  }`}
                >
                  <div className="font-semibold mb-1">Blau</div>
                  <div className="text-xs opacity-75">AI Design mit Orbs</div>
                </button>
                <button
                  onClick={() => setThemeMode('original', currentUser?.id)}
                  className={`px-4 py-3 rounded-lg border-2 transition-all ${
                    themeMode === 'original'
                      ? 'border-gray-500 bg-gray-500/20 text-gray-400'
                      : 'border-border bg-surface text-text-secondary hover:border-overlay'
                  }`}
                >
                  <div className="font-semibold mb-1">Original</div>
                  <div className="text-xs opacity-75">Cleanes Design</div>
                </button>
                <button
                  onClick={() => setThemeMode('light', currentUser?.id)}
                  className={`px-4 py-3 rounded-lg border-2 transition-all ${
                    themeMode === 'light'
                      ? 'border-blue-400 bg-blue-100 text-blue-600'
                      : 'border-border bg-surface text-text-secondary hover:border-overlay'
                  }`}
                >
                  <div className="font-semibold mb-1">Hell</div>
                  <div className="text-xs opacity-75">Light Mode</div>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  );
};
