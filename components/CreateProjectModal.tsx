import React, { useState } from 'react';
import { ClientSelector } from './ClientSelector';

interface CreateProjectModalProps {
  onClose: () => void;
  onCreateProject: (projectData: any) => void;
}

export const CreateProjectModal: React.FC<CreateProjectModalProps> = ({ onClose, onCreateProject }) => {
  const [projectName, setProjectName] = useState('');
  const [selectedIcon, setSelectedIcon] = useState('📁');
  const [selectedClient, setSelectedClient] = useState<any>(null);
  const [showClientSelector, setShowClientSelector] = useState(false);

  const quickActions = [
    { icon: '🔗', label: 'Connect' },
    { icon: '👤', label: 'Kunde' },
    { icon: '📅', label: 'Fälligkeitsdatum' },
    { icon: '👥', label: 'Mitglieder' },
    { icon: '➕', label: 'Details hinzufügen' },
  ];

  const handleSubmit = () => {
    if (projectName.trim()) {
      onCreateProject({
        name: projectName,
        icon: selectedIcon,
      });
      onClose();
    }
  };

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/70 z-50"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-start justify-center pt-20">
        <div 
          className="bg-surface rounded-2xl w-full max-w-3xl shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-overlay">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-overlay rounded-lg flex items-center justify-center text-2xl">
                {selectedIcon}
              </div>
              <input
                type="text"
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                placeholder="Projekt benennen"
                className="bg-transparent text-text-primary text-xl font-semibold outline-none placeholder-text-secondary"
                autoFocus
              />
            </div>
            
            <div className="flex items-center space-x-3">
              <button
                onClick={onClose}
                className="text-text-secondary hover:text-text-primary p-2"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
              <button
                onClick={handleSubmit}
                disabled={!projectName.trim()}
                className="px-6 py-2 bg-gradient-to-r from-glow-cyan to-glow-magenta text-text-primary rounded-lg hover:opacity-80 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-semibold"
              >
                Weiter
              </button>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="p-6 border-b border-overlay">
            <div className="flex items-center space-x-3">
              <img
                src="https://i.pravatar.cc/150?u=current-user"
                alt="User"
                className="w-8 h-8 rounded-full"
              />
              {quickActions.map((action, index) => (
                <button
                  key={index}
                  onClick={() => {
                    if (action.label === 'Kunde') {
                      setShowClientSelector(true);
                    }
                  }}
                  className={`flex items-center space-x-2 px-3 py-2 rounded-lg transition-colors border border-dashed ${
                    action.label === 'Kunde' && selectedClient
                      ? 'bg-glow-cyan/20 border-glow-cyan text-text-primary'
                      : 'bg-overlay hover:bg-surface border-text-secondary'
                  }`}
                >
                  <span>{action.icon}</span>
                  <span className={`text-sm ${action.label === 'Kunde' && selectedClient ? 'text-text-primary' : 'text-text-secondary'}`}>
                    {action.label === 'Kunde' && selectedClient ? selectedClient.name : action.label}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Quick Start Section */}
          <div className="p-6">
            <div className="bg-overlay rounded-xl p-8 text-center">
              <h3 className="text-text-primary text-lg font-semibold mb-2">
                Details super-schnell hinzufügen
              </h3>
              <p className="text-text-secondary text-sm mb-4">
                Tippe <kbd className="px-2 py-1 bg-surface rounded text-xs">/</kbd> um Befehle zu starten
              </p>
              
              <div className="space-y-3 text-left max-w-md mx-auto">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-text-secondary">Mitglieder, Teams, Kunde, Projekttyp</span>
                  <span className="text-text-secondary">/name</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-text-secondary">Tags auswählen</span>
                  <span className="text-text-secondary">/#</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-text-secondary">Fällig bis</span>
                  <span className="text-text-secondary">/10.10.22</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-text-secondary">Beschreibung</span>
                  <span className="text-text-secondary">//</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-text-secondary">Budget</span>
                  <span className="text-text-secondary">/12h</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-text-secondary"></span>
                  <span className="text-text-secondary">/budget</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-text-secondary">API Client</span>
                  <span className="text-text-secondary">/neu</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-text-secondary">Bild auswählen</span>
                  <span className="text-text-secondary">/bild</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-text-secondary">Als privat markieren</span>
                  <span className="text-text-secondary">/privat</span>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-center space-x-4 p-4 border-t border-overlay">
            <button className="flex items-center space-x-2 px-4 py-2 text-text-secondary hover:text-text-primary transition-colors">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                <polyline points="17 8 12 3 7 8"></polyline>
                <line x1="12" y1="3" x2="12" y2="15"></line>
              </svg>
              <span className="text-sm">Schließen</span>
              <kbd className="px-2 py-1 bg-overlay rounded text-xs">⌘K</kbd>
            </button>
            <button className="flex items-center space-x-2 px-4 py-2 text-text-secondary hover:text-text-primary transition-colors">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path>
                <polyline points="17 21 17 13 7 13 7 21"></polyline>
                <polyline points="7 3 7 8 15 8"></polyline>
              </svg>
              <span className="text-sm">Speichern</span>
              <kbd className="px-2 py-1 bg-overlay rounded text-xs">⌘S</kbd>
            </button>
          </div>
        </div>
      </div>
      
      {/* Client Selector Modal */}
      {showClientSelector && (
        <ClientSelector
          onClose={() => setShowClientSelector(false)}
          onSelectClient={(client) => setSelectedClient(client)}
          existingClients={[
            { id: '1', name: 'Acme GmbH', email: 'kontakt@acme.de' },
            { id: '2', name: 'TechCorp AG', email: 'info@techcorp.com' },
            { id: '3', name: 'StartUp Inc.', email: 'hello@startup.io' },
          ]}
        />
      )}
    </>
  );
};
