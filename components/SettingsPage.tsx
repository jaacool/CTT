import React, { useState, useEffect, useRef } from 'react';
import { User, UserStatus, Role } from '../types';
import { AddUserModal } from './AddUserModal';
import { EditUserModal } from './EditUserModal';
import { RolesPage } from './RolesPage';
import { useGlow } from '../contexts/GlowContext';

interface SettingsPageProps {
  users: User[];
  roles: Role[];
  onAddUser: (userData: { name: string; title?: string; email: string; tags?: string[]; status: UserStatus }) => void;
  onUpdateUser: (userId: string, userData: Partial<User>) => void;
  onDeleteUser: (userId: string) => void;
  onChangeRole: (userId: string, roleId: string) => void;
}

const UserRow: React.FC<{ user: User; roles: Role[]; onEdit: (user: User) => void; onDelete: (userId: string) => void; onChangeRole: (userId: string, roleId: string) => void }> = ({ user, roles, onEdit, onDelete, onChangeRole }) => {
  const [showMenu, setShowMenu] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [showRoleMenu, setShowRoleMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const roleMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowMenu(false);
      }
      if (roleMenuRef.current && !roleMenuRef.current.contains(event.target as Node)) {
        setShowRoleMenu(false);
      }
    };

    if (showMenu || showRoleMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showMenu, showRoleMenu]);
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
    <div className="grid grid-cols-12 gap-4 items-center py-3 px-4 border-b border-overlay/50 text-sm">
      {/* Teams */}
      <div className="col-span-4 flex items-center space-x-3">
        <img src={user.avatarUrl} alt={user.name} className="w-9 h-9 rounded-full" />
        <div>
          {user.title && <div className="text-xs text-text-secondary">{user.title}</div>}
          <div className="font-semibold text-text-primary">{user.name}</div>
        </div>
      </div>

      {/* Tags / Role */}
      <div className="col-span-3 flex items-center space-x-2 relative" ref={roleMenuRef}>
        {userRole && (
          <button
            onClick={() => setShowRoleMenu(!showRoleMenu)}
            className={`px-2 py-1 rounded-md text-xs font-semibold cursor-pointer hover:opacity-80 transition-opacity ${getTagColor(userRole.name)}`}
          >
            {userRole.name}
          </button>
        )}
        {user.tags?.map(tag => (
          <span key={tag} className={`px-2 py-1 rounded-md text-xs font-semibold ${getTagColor(tag)}`}>
            {tag}
          </span>
        ))}
        
        {/* Role Selection Menu */}
        {showRoleMenu && (
          <div className="absolute left-0 top-8 bg-surface border border-overlay rounded-lg shadow-xl z-50 min-w-[160px] p-2">
            {roles.map(role => (
              <button
                key={role.id}
                onClick={() => {
                  onChangeRole(user.id, role.id);
                  setShowRoleMenu(false);
                }}
                className={`w-full px-3 py-2 text-left text-sm hover:bg-overlay rounded-md transition-colors ${
                  user.role === role.id ? 'bg-overlay text-glow-cyan font-semibold' : 'text-text-primary'
                }`}
              >
                {role.name}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* E-Mail */}
      <div className="col-span-3 text-text-secondary">{user.email}</div>

      {/* Status */}
      <div className="col-span-1">
        <span className={`px-3 py-1 rounded-full text-xs font-bold ${user.status === UserStatus.Active ? 'bg-green-500/20 text-green-500' : 'bg-red-500/20 text-red-500'}`}>
          {user.status}
        </span>
      </div>

      {/* Actions */}
      <div className="col-span-1 flex justify-end relative" ref={menuRef}>
        <button 
          onClick={() => setShowMenu(!showMenu)}
          className="text-text-secondary hover:text-text-primary"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="1"/><circle cx="12" cy="5" r="1"/><circle cx="12" cy="19" r="1"/></svg>
        </button>
        
        {/* Context Menu */}
        {showMenu && (
          <div className="absolute right-0 top-8 bg-surface border border-overlay rounded-lg shadow-xl z-50 min-w-[200px] p-2">
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
          </div>
        )}
      </div>
    </div>
  );
};

export const SettingsPage: React.FC<SettingsPageProps> = ({ users, roles, onAddUser, onUpdateUser, onDeleteUser, onChangeRole }) => {
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState<'users' | 'roles' | 'appearance'>('users');
  const { themeMode, setThemeMode } = useGlow();

  return (
    <div className="p-8 w-full">
      <div className="flex space-x-4 mb-6">
        <button
          onClick={() => setActiveTab('users')}
          className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
            activeTab === 'users' ? 'glow-button text-text-primary' : 'bg-background text-text-primary hover:bg-overlay'
          }`}
        >
          User
        </button>
        <button
          onClick={() => setActiveTab('roles')}
          className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
            activeTab === 'roles' ? 'glow-button text-text-primary' : 'bg-background text-text-primary hover:bg-overlay'
          }`}
        >
          Rollen
        </button>
        <button
          onClick={() => setActiveTab('appearance')}
          className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
            activeTab === 'appearance' ? 'glow-button text-text-primary' : 'bg-background text-text-primary hover:bg-overlay'
          }`}
        >
          Erscheinungsbild
        </button>
      </div>

      {activeTab === 'users' ? (
        <>
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-2xl font-bold glow-text">User</h1>
        <button 
          onClick={() => setShowAddUserModal(true)}
          className="glow-button text-text-primary font-semibold px-4 py-2 rounded-lg hover:opacity-80 transition-colors"
        >
          + User hinzufügen
        </button>
      </div>

      <div className="glow-card rounded-lg border border-overlay/50">
        {/* Header */}
        <div className="grid grid-cols-12 gap-4 py-3 px-4 text-xs font-semibold text-text-secondary border-b border-overlay/50">
          <div className="col-span-4">Teams</div>
          <div className="col-span-3">Tags</div>
          <div className="col-span-3">E-Mail</div>
          <div className="col-span-1">Status</div>
          <div className="col-span-1"></div>
        </div>

        {/* User List */}
        <div>
          {users.map(user => <UserRow key={user.id} user={user} roles={roles} onEdit={setEditingUser} onDelete={onDeleteUser} onChangeRole={onChangeRole} />)}
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
      ) : (
        <div>
          <h1 className="text-2xl font-bold glow-text mb-8">Erscheinungsbild</h1>
          <div className="glow-card rounded-lg p-6">
            <div>
              <h3 className="text-lg font-semibold text-text-primary mb-3">Design-Modus</h3>
              <p className="text-sm text-text-secondary mb-4">
                Wähle zwischen verschiedenen visuellen Stilen
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setThemeMode('glow')}
                  className={`flex-1 px-4 py-3 rounded-lg border-2 transition-all ${
                    themeMode === 'glow'
                      ? 'border-purple-500 bg-purple-500/20 text-purple-400'
                      : 'border-border bg-surface text-text-secondary hover:border-overlay'
                  }`}
                >
                  <div className="font-semibold mb-1">Glow Glass</div>
                  <div className="text-xs opacity-75">Liquid Glass Effekte</div>
                </button>
                <button
                  onClick={() => setThemeMode('blue')}
                  className={`flex-1 px-4 py-3 rounded-lg border-2 transition-all ${
                    themeMode === 'blue'
                      ? 'border-blue-500 bg-blue-500/20 text-blue-400'
                      : 'border-border bg-surface text-text-secondary hover:border-overlay'
                  }`}
                >
                  <div className="font-semibold mb-1">Blau</div>
                  <div className="text-xs opacity-75">AI Design mit Orbs</div>
                </button>
                <button
                  onClick={() => setThemeMode('original')}
                  className={`flex-1 px-4 py-3 rounded-lg border-2 transition-all ${
                    themeMode === 'original'
                      ? 'border-gray-500 bg-gray-500/20 text-gray-400'
                      : 'border-border bg-surface text-text-secondary hover:border-overlay'
                  }`}
                >
                  <div className="font-semibold mb-1">Original</div>
                  <div className="text-xs opacity-75">Cleanes Design</div>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
