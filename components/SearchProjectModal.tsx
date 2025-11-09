import React, { useState } from 'react';
import { Project } from '../types';

interface SearchProjectModalProps {
  projects: Project[];
  onClose: () => void;
  onSelectProject: (projectId: string) => void;
}

export const SearchProjectModal: React.FC<SearchProjectModalProps> = ({ projects, onClose, onSelectProject }) => {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredProjects = projects.filter(p =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.client?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSelectProject = (projectId: string) => {
    onSelectProject(projectId);
    onClose();
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
          className="bg-[#1a1d2e] rounded-2xl w-full max-w-2xl shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Search Header */}
          <div className="p-6 border-b border-c-highlight">
            <div className="flex items-center space-x-3">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-c-subtle">
                <circle cx="11" cy="11" r="8"></circle>
                <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
              </svg>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Nach Projekten suchen..."
                className="flex-1 bg-transparent text-white text-lg outline-none placeholder-c-subtle"
                autoFocus
              />
              <button
                onClick={onClose}
                className="text-c-subtle hover:text-white p-2"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            </div>
          </div>

          {/* Results */}
          <div className="max-h-96 overflow-y-auto">
            {filteredProjects.length > 0 ? (
              <div className="p-2">
                {filteredProjects.map(project => (
                  <button
                    key={project.id}
                    onClick={() => handleSelectProject(project.id)}
                    className="w-full flex items-center space-x-3 p-3 hover:bg-c-highlight rounded-lg transition-colors text-left"
                  >
                    <span className="text-2xl">{project.icon}</span>
                    <div className="flex-1 min-w-0">
                      <div className="text-white font-semibold truncate">{project.name}</div>
                      {project.client && (
                        <div className="text-c-subtle text-sm truncate">{project.client}</div>
                      )}
                    </div>
                    <div className="text-c-subtle text-xs">
                      {project.taskLists.flatMap(l => l.tasks).length} Aufgaben
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <div className="p-12 text-center">
                <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mx-auto text-c-subtle mb-4">
                  <circle cx="11" cy="11" r="8"></circle>
                  <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                </svg>
                <p className="text-c-subtle">
                  {searchTerm ? 'Keine Projekte gefunden' : 'Beginne mit der Suche...'}
                </p>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-c-highlight">
            <div className="flex items-center justify-between text-xs text-c-subtle">
              <div className="flex items-center space-x-4">
                <span>↑↓ Navigieren</span>
                <span>↵ Auswählen</span>
                <span>ESC Schließen</span>
              </div>
              <span>{filteredProjects.length} Ergebnisse</span>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};
