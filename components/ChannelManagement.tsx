import React, { useState } from 'react';
import { ChatChannel, ChatChannelType, User } from '../types';
import { XIcon, PlusIcon, HashIcon, TrashIcon, EditIcon, UsersIcon } from './Icons';
import { ConfirmModal } from './ConfirmModal';

interface ChannelManagementProps {
  channels: ChatChannel[];
  users: User[];
  currentUser: User;
  onCreateChannel: (name: string, description: string, memberIds: string[], isPrivate: boolean) => void;
  onUpdateChannel: (channelId: string, name: string, description: string, memberIds: string[], isPrivate: boolean) => void;
  onDeleteChannel: (channelId: string) => void;
  showAdminsInDMs?: boolean;
  onToggleShowAdminsInDMs?: (show: boolean) => void;
  onDeleteAllMessages?: () => void;
}

export const ChannelManagement: React.FC<ChannelManagementProps> = ({
  channels,
  users,
  currentUser,
  onCreateChannel,
  onUpdateChannel,
  onDeleteChannel,
  showAdminsInDMs = true,
  onToggleShowAdminsInDMs,
  onDeleteAllMessages,
}) => {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingChannel, setEditingChannel] = useState<ChatChannel | null>(null);
  const [channelName, setChannelName] = useState('');
  const [channelDescription, setChannelDescription] = useState('');
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [isPrivate, setIsPrivate] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [deleteConfirmChannel, setDeleteConfirmChannel] = useState<ChatChannel | null>(null);
  const [showDeleteAllConfirm, setShowDeleteAllConfirm] = useState(false);

  // Filter nur Group Channels (keine Direct Messages)
  const groupChannels = channels.filter(c => c.type === ChatChannelType.Group);

  const handleOpenCreate = () => {
    setChannelName('');
    setChannelDescription('');
    setSelectedMembers([currentUser.id]);
    setIsPrivate(false);
    setEditingChannel(null);
    setShowCreateModal(true);
  };

  const handleOpenEdit = (channel: ChatChannel) => {
    setChannelName(channel.name);
    setChannelDescription(channel.description || '');
    setSelectedMembers(channel.members.map(m => m.id));
    setIsPrivate(channel.isPrivate || false);
    setEditingChannel(channel);
    setShowCreateModal(true);
  };

  const handleSave = () => {
    if (!channelName.trim() || selectedMembers.length === 0) return;

    if (editingChannel) {
      onUpdateChannel(
        editingChannel.id,
        channelName.trim(),
        channelDescription.trim(),
        selectedMembers,
        isPrivate
      );
    } else {
      onCreateChannel(
        channelName.trim(),
        channelDescription.trim(),
        selectedMembers,
        isPrivate
      );
    }

    setShowCreateModal(false);
  };

  const toggleMember = (userId: string) => {
    if (selectedMembers.includes(userId)) {
      setSelectedMembers(selectedMembers.filter(id => id !== userId));
    } else {
      setSelectedMembers([...selectedMembers, userId]);
    }
  };

  const filteredChannels = groupChannels.filter(channel =>
    channel.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    channel.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Channel Verwaltung</h1>
          <p className="text-text-secondary text-sm mt-1">
            Erstelle und verwalte Channels für dein Team
          </p>
        </div>
        <button
          onClick={handleOpenCreate}
          className="glow-button px-4 py-2 rounded-lg flex items-center space-x-2"
        >
          <PlusIcon className="w-5 h-5" />
          <span>Neuer Channel</span>
        </button>
      </div>

      {/* DM Settings */}
      {onToggleShowAdminsInDMs && (
        <div className="mb-6 p-4 bg-surface border border-border rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-text-primary mb-1">
                Administratoren in Direktnachrichten
              </h3>
              <p className="text-xs text-text-secondary">
                Lege fest, ob Administratoren in den DMs aller User sichtbar sein sollen
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={showAdminsInDMs}
                onChange={(e) => onToggleShowAdminsInDMs(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-overlay peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-glow-purple/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-glow-purple"></div>
            </label>
          </div>
        </div>
      )}

      {/* Dangerous Actions */}
      {onDeleteAllMessages && (
        <div className="mb-6 p-4 bg-surface border border-red-500/20 rounded-lg">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <h3 className="text-sm font-semibold text-text-primary mb-1">
                Gefährliche Aktionen
              </h3>
              <p className="text-xs text-text-secondary">
                Alle Chat-Nachrichten löschen (Channels bleiben erhalten)
              </p>
            </div>
            <button
              onClick={() => setShowDeleteAllConfirm(true)}
              className="px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-lg transition-colors flex items-center space-x-2 ml-4"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              <span className="font-semibold">Alle Nachrichten löschen</span>
            </button>
          </div>
        </div>
      )}

      {/* Search */}
      <div className="mb-6">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Channels durchsuchen..."
          className="w-full bg-surface text-text-primary border border-border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-glow-purple"
        />
      </div>

      {/* Channels Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredChannels.map(channel => (
          <div
            key={channel.id}
            className="glow-card rounded-xl p-4 hover:shadow-lg transition-shadow"
          >
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center space-x-2 flex-1 min-w-0">
                <HashIcon className="w-5 h-5 text-glow-purple shrink-0" />
                <h3 className="font-semibold text-text-primary truncate">{channel.name}</h3>
              </div>
              <div className="flex items-center space-x-1">
                <button
                  onClick={() => handleOpenEdit(channel)}
                  className="p-1.5 hover:bg-overlay rounded-lg text-text-secondary hover:text-text-primary transition-colors"
                >
                  <EditIcon className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setDeleteConfirmChannel(channel)}
                  className="p-1.5 hover:bg-overlay rounded-lg text-text-secondary hover:text-red-500 transition-colors"
                >
                  <TrashIcon className="w-4 h-4" />
                </button>
              </div>
            </div>

            {channel.description && (
              <p className="text-text-secondary text-sm mb-3 line-clamp-2">
                {channel.description}
              </p>
            )}

            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center space-x-1 text-text-secondary">
                <UsersIcon className="w-4 h-4" />
                <span>{channel.members.length} Mitglieder</span>
              </div>
              {channel.isPrivate && (
                <span className="px-2 py-0.5 rounded bg-overlay text-text-secondary">
                  Privat
                </span>
              )}
            </div>

            {/* Members Preview */}
            <div className="flex items-center mt-3 -space-x-2">
              {channel.members.slice(0, 5).map(member => (
                <img
                  key={member.id}
                  src={member.avatarUrl}
                  alt={member.name}
                  title={member.name}
                  className="w-6 h-6 rounded-full border-2 border-surface"
                />
              ))}
              {channel.members.length > 5 && (
                <div className="w-6 h-6 rounded-full border-2 border-surface bg-overlay flex items-center justify-center text-xs text-text-secondary">
                  +{channel.members.length - 5}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {filteredChannels.length === 0 && (
        <div className="text-center py-12">
          <HashIcon className="w-12 h-12 text-text-secondary mx-auto mb-3 opacity-50" />
          <p className="text-text-secondary">
            {searchQuery ? 'Keine Channels gefunden' : 'Noch keine Channels vorhanden'}
          </p>
        </div>
      )}

      {/* Create/Edit Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-background rounded-2xl shadow-2xl w-full max-w-2xl border border-border">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-border">
              <h2 className="text-xl font-bold text-text-primary">
                {editingChannel ? 'Channel bearbeiten' : 'Neuer Channel'}
              </h2>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-text-secondary hover:text-text-primary"
              >
                <XIcon className="w-6 h-6" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 space-y-4">
              {/* Channel Name */}
              <div>
                <label className="block text-sm font-medium text-text-primary mb-2">
                  Channel Name *
                </label>
                <input
                  type="text"
                  value={channelName}
                  onChange={(e) => setChannelName(e.target.value)}
                  placeholder="z.B. entwicklung, marketing, allgemein"
                  className="w-full bg-surface text-text-primary border border-border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-glow-purple"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-text-primary mb-2">
                  Beschreibung
                </label>
                <textarea
                  value={channelDescription}
                  onChange={(e) => setChannelDescription(e.target.value)}
                  placeholder="Wofür ist dieser Channel?"
                  rows={3}
                  className="w-full bg-surface text-text-primary border border-border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-glow-purple resize-none"
                />
              </div>

              {/* Privacy */}
              <div className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  id="isPrivate"
                  checked={isPrivate}
                  onChange={(e) => setIsPrivate(e.target.checked)}
                  className="w-4 h-4 rounded border-border text-glow-purple focus:ring-glow-purple"
                />
                <label htmlFor="isPrivate" className="text-sm text-text-primary">
                  Privater Channel (nur eingeladene Mitglieder können beitreten)
                </label>
              </div>

              {/* Members */}
              <div>
                <label className="block text-sm font-medium text-text-primary mb-2">
                  Mitglieder * ({selectedMembers.length} ausgewählt)
                </label>
                <div className="bg-surface border border-border rounded-lg p-3 max-h-64 overflow-y-auto space-y-2">
                  {users.map(user => (
                    <label
                      key={user.id}
                      className="flex items-center space-x-3 p-2 hover:bg-overlay rounded-lg cursor-pointer transition-colors"
                    >
                      <input
                        type="checkbox"
                        checked={selectedMembers.includes(user.id)}
                        onChange={() => toggleMember(user.id)}
                        className="w-4 h-4 rounded border-border text-glow-purple focus:ring-glow-purple"
                      />
                      <img
                        src={user.avatarUrl}
                        alt={user.name}
                        className="w-8 h-8 rounded-full"
                      />
                      <div className="flex-1">
                        <div className="text-sm text-text-primary">{user.name}</div>
                        <div className="text-xs text-text-secondary">{user.email}</div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-end space-x-3 p-6 border-t border-border">
              <button
                onClick={() => setShowCreateModal(false)}
                className="px-4 py-2 rounded-lg bg-overlay text-text-primary hover:bg-surface transition-colors"
              >
                Abbrechen
              </button>
              <button
                onClick={handleSave}
                disabled={!channelName.trim() || selectedMembers.length === 0}
                className="glow-button px-4 py-2 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {editingChannel ? 'Speichern' : 'Erstellen'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmChannel && (
        <ConfirmModal
          isOpen={true}
          title="Channel löschen"
          message={`Möchtest du den Channel "${deleteConfirmChannel.name}" wirklich löschen? Diese Aktion kann nicht rückgängig gemacht werden.`}
          onConfirm={() => {
            onDeleteChannel(deleteConfirmChannel.id);
            setDeleteConfirmChannel(null);
          }}
          onCancel={() => setDeleteConfirmChannel(null)}
        />
      )}

      {/* Delete All Messages Confirmation Modal */}
      {showDeleteAllConfirm && (
        <ConfirmModal
          isOpen={true}
          title="Alle Nachrichten löschen?"
          message="Möchtest du wirklich alle Chat-Nachrichten löschen? Diese Aktion kann nicht rückgängig gemacht werden. Die Channels bleiben erhalten."
          confirmText="Alle löschen"
          cancelText="Abbrechen"
          onConfirm={() => {
            if (onDeleteAllMessages) {
              onDeleteAllMessages();
            }
            setShowDeleteAllConfirm(false);
          }}
          onCancel={() => setShowDeleteAllConfirm(false)}
          isDangerous={true}
        />
      )}
    </div>
  );
};
