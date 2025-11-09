import React, { useState } from 'react';
import { UserStatus } from '../types';

interface AddUserModalProps {
  onClose: () => void;
  onAddUser: (userData: {
    name: string;
    title?: string;
    email: string;
    tags?: string[];
    status: UserStatus;
  }) => void;
}

export const AddUserModal: React.FC<AddUserModalProps> = ({ onClose, onAddUser }) => {
  const [name, setName] = useState('');
  const [title, setTitle] = useState('');
  const [email, setEmail] = useState('');
  const [tags, setTags] = useState('');
  const [status, setStatus] = useState<UserStatus>(UserStatus.Active);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name || !email) {
      alert('Name und E-Mail sind erforderlich');
      return;
    }

    const tagsArray = tags.split(',').map(t => t.trim()).filter(t => t);

    onAddUser({
      name,
      title: title || undefined,
      email,
      tags: tagsArray.length > 0 ? tagsArray : undefined,
      status,
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-c-surface rounded-lg p-6 w-full max-w-md border border-c-highlight">
        <h2 className="text-xl font-bold text-c-text mb-4">Neuen Benutzer hinzufügen</h2>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-c-text mb-1">Name *</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 bg-c-bg border border-c-highlight rounded-md text-c-text focus:outline-none focus:ring-2 focus:ring-c-blue"
              placeholder="Max Mustermann"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-c-text mb-1">Titel</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 bg-c-bg border border-c-highlight rounded-md text-c-text focus:outline-none focus:ring-2 focus:ring-c-blue"
              placeholder="Creative Director"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-c-text mb-1">E-Mail *</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 bg-c-bg border border-c-highlight rounded-md text-c-text focus:outline-none focus:ring-2 focus:ring-c-blue"
              placeholder="max@jaa.cool"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-c-text mb-1">Tags (kommagetrennt)</label>
            <input
              type="text"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              className="w-full px-3 py-2 bg-c-bg border border-c-highlight rounded-md text-c-text focus:outline-none focus:ring-2 focus:ring-c-blue"
              placeholder="editor, Produktion"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-c-text mb-1">Status</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as UserStatus)}
              className="w-full px-3 py-2 bg-c-bg border border-c-highlight rounded-md text-c-text focus:outline-none focus:ring-2 focus:ring-c-blue"
            >
              <option value={UserStatus.Active}>Aktiv</option>
              <option value={UserStatus.Inactive}>Deaktiviert</option>
            </select>
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-c-bg text-c-text rounded-md hover:bg-c-highlight transition-colors"
            >
              Abbrechen
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-c-blue text-white rounded-md hover:bg-blue-600 transition-colors"
            >
              Hinzufügen
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
