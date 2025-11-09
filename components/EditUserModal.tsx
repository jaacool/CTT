import React, { useState, useEffect } from 'react';
import { User, Gender, UserStatus } from '../types';

interface EditUserModalProps {
  user: User;
  onClose: () => void;
  onUpdateUser: (userId: string, userData: Partial<User>) => void;
}

export const EditUserModal: React.FC<EditUserModalProps> = ({ user, onClose, onUpdateUser }) => {
  const [formData, setFormData] = useState<Partial<User>>(user);

  useEffect(() => {
    setFormData(user);
  }, [user]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateUser(user.id, formData);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-c-surface rounded-2xl p-8 w-full max-w-2xl border border-c-highlight max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-c-text">'{user.name}' bearbeiten</h2>
          <button onClick={onClose} className="text-c-subtle hover:text-c-text">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-c-highlight mb-6">
          <button className="px-4 py-2 text-c-text border-b-2 border-c-blue font-semibold flex items-center space-x-2">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
            <span>Details</span>
          </button>
          <button className="px-4 py-2 text-c-subtle hover:text-c-text flex items-center space-x-2">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>
            <span>Kontakt</span>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Avatar */}
          <div className="flex items-center justify-center">
            <div className="relative">
              <img src={user.avatarUrl} alt={user.name} className="w-24 h-24 rounded-full" />
              <button type="button" className="absolute bottom-0 left-0 bg-c-bg p-1 rounded-full border border-c-highlight">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path><circle cx="12" cy="13" r="4"></circle></svg>
              </button>
              <button type="button" className="absolute top-0 right-0 bg-c-bg p-1 rounded-full border border-c-highlight">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
              </button>
            </div>
          </div>

          {/* Form Fields */}
          <div>
            <label className="block text-sm font-medium text-c-subtle mb-1">Titel</label>
            <input type="text" name="title" value={formData.title || ''} onChange={handleChange} className="w-full px-3 py-2 bg-c-bg border border-c-highlight rounded-md text-c-text" />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-c-subtle mb-1">Vorname</label>
              <input type="text" name="firstName" value={formData.firstName || ''} onChange={handleChange} className="w-full px-3 py-2 bg-c-bg border border-c-highlight rounded-md text-c-text" />
            </div>
            <div>
              <label className="block text-sm font-medium text-c-subtle mb-1">Nachname</label>
              <input type="text" name="lastName" value={formData.lastName || ''} onChange={handleChange} className="w-full px-3 py-2 bg-c-bg border border-c-highlight rounded-md text-c-text" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-c-subtle mb-1">Position</label>
            <input type="text" name="position" value={formData.position || ''} onChange={handleChange} className="w-full px-3 py-2 bg-c-bg border border-c-highlight rounded-md text-c-text" />
          </div>

          <div>
            <label className="block text-sm font-medium text-c-subtle mb-1">Geburtstag</label>
            <div className="relative">
              <input type="text" name="birthday" value={formData.birthday || ''} onChange={handleChange} className="w-full px-3 py-2 bg-c-bg border border-c-highlight rounded-md text-c-text" />
              <svg className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-c-subtle" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-c-subtle mb-1">Passwort</label>
            <input type="password" name="password" value={formData.password || ''} onChange={handleChange} className="w-full px-3 py-2 bg-c-bg border border-c-highlight rounded-md text-c-text" />
          </div>

          <div>
            <label className="block text-sm font-medium text-c-subtle mb-1">Tags</label>
            <div className="flex items-center space-x-2">
              {/* TODO: Implement tag editing */}
              <button type="button" className="flex items-center space-x-2 px-3 py-2 border-2 border-dashed border-c-highlight rounded-md text-c-subtle">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                <span>Hinzufügen</span>
              </button>
            </div>
          </div>

          {/* Footer Buttons */}
          <div className="flex justify-end space-x-4 pt-4">
            <button type="button" onClick={onClose} className="px-6 py-2 bg-c-bg text-c-text rounded-lg hover:bg-c-highlight transition-colors">Abbrechen</button>
            <button type="submit" className="px-6 py-2 bg-c-blue text-white rounded-lg hover:bg-blue-600 transition-colors">Speichern</button>
          </div>
        </form>
      </div>
    </div>
  );
};
