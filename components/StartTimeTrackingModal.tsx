import React, { useState, useMemo } from 'react';
import { Project, Task, ProjectStatus } from '../types';

interface StartTimeTrackingModalProps {
  isOpen: boolean;
  onClose: () => void;
  projects: Project[];
  onStartTracking: (projectId: string, taskId: string) => void;
}

export const StartTimeTrackingModal: React.FC<StartTimeTrackingModalProps> = ({
  isOpen,
  onClose,
  projects,
  onStartTracking,
}) => {
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [selectedTaskId, setSelectedTaskId] = useState<string>('');
  const [projectSearchTerm, setProjectSearchTerm] = useState<string>('');

  // Alle Projekte (sortiert: Aktive zuerst)
  const sortedProjects = useMemo(() => {
    return [...projects].sort((a, b) => {
      // Aktive Projekte zuerst
      if (a.status === ProjectStatus.Active && b.status !== ProjectStatus.Active) return -1;
      if (a.status !== ProjectStatus.Active && b.status === ProjectStatus.Active) return 1;
      // Dann alphabetisch
      return a.name.localeCompare(b.name);
    });
  }, [projects]);

  // Gefilterte Projekte basierend auf Suchbegriff
  const filteredProjects = useMemo(() => {
    if (!projectSearchTerm) return sortedProjects;
    const term = projectSearchTerm.toLowerCase();
    return sortedProjects.filter(p => 
      p.name.toLowerCase().includes(term) || 
      p.icon.includes(term)
    );
  }, [sortedProjects, projectSearchTerm]);

  // Alle Tasks des ausgewählten Projekts (inkl. Subtasks)
  const availableTasks = useMemo(() => {
    if (!selectedProjectId) return [];
    
    const project = projects.find(p => p.id === selectedProjectId);
    if (!project) return [];

    const tasks: Array<{ id: string; title: string; listTitle: string; isSubtask: boolean }> = [];
    
    project.taskLists.forEach(list => {
      list.tasks.forEach(task => {
        // Haupttask
        tasks.push({
          id: task.id,
          title: task.title,
          listTitle: list.title,
          isSubtask: false,
        });
        
        // Subtasks
        task.subtasks.forEach(subtask => {
          tasks.push({
            id: subtask.id,
            title: `${task.title} → ${subtask.title}`,
            listTitle: list.title,
            isSubtask: true,
          });
        });
      });
    });
    
    return tasks;
  }, [selectedProjectId, projects]);

  const handleStart = () => {
    if (selectedProjectId && selectedTaskId) {
      onStartTracking(selectedProjectId, selectedTaskId);
      onClose();
      // Reset
      setSelectedProjectId('');
      setSelectedTaskId('');
    }
  };

  const handleProjectChange = (projectId: string) => {
    setSelectedProjectId(projectId);
    setSelectedTaskId(''); // Reset task selection
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-surface rounded-xl shadow-2xl w-full max-w-lg border border-glow-purple/20">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-700">
          <h2 className="text-xl font-bold text-text-primary flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6 text-glow-purple">
              <circle cx="12" cy="12" r="10"></circle>
              <polyline points="12 6 12 12 16 14"></polyline>
            </svg>
            Time Tracking starten
          </h2>
          <button
            onClick={onClose}
            className="text-text-secondary hover:text-text-primary transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Projekt auswählen */}
          <div>
            <label className="block text-sm font-medium text-text-primary mb-2">
              Projekt auswählen
            </label>
            
            {/* Suchfeld */}
            <div className="relative mb-2">
              <input
                type="text"
                placeholder="Projekt suchen..."
                value={projectSearchTerm}
                onChange={(e) => setProjectSearchTerm(e.target.value)}
                className="w-full bg-overlay border border-gray-700 rounded-lg px-4 py-2 text-text-primary focus:outline-none focus:ring-2 focus:ring-glow-purple/50 transition-all pr-10"
              />
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="absolute right-3 top-1/2 transform -translate-y-1/2 text-text-secondary">
                <circle cx="11" cy="11" r="8"></circle>
                <path d="m21 21-4.35-4.35"></path>
              </svg>
            </div>
            
            {/* Dropdown */}
            <select
              value={selectedProjectId}
              onChange={(e) => handleProjectChange(e.target.value)}
              className="w-full bg-overlay border border-gray-700 rounded-lg px-4 py-3 text-text-primary focus:outline-none focus:ring-2 focus:ring-glow-purple/50 transition-all"
            >
              <option value="">-- Projekt wählen --</option>
              {filteredProjects.map(project => (
                <option key={project.id} value={project.id}>
                  {project.icon} {project.name} {project.status !== ProjectStatus.Active ? `(${project.status})` : ''}
                </option>
              ))}
            </select>
            
            {filteredProjects.length === 0 && projectSearchTerm && (
              <p className="text-sm text-text-secondary mt-2">
                Keine Projekte gefunden für "{projectSearchTerm}"
              </p>
            )}
            
            {projects.length === 0 && (
              <p className="text-sm text-text-secondary mt-2">
                Keine Projekte vorhanden.
              </p>
            )}
          </div>

          {/* Aufgabe auswählen */}
          {selectedProjectId && (
            <div>
              <label className="block text-sm font-medium text-text-primary mb-2">
                Aufgabe auswählen
              </label>
              <select
                value={selectedTaskId}
                onChange={(e) => setSelectedTaskId(e.target.value)}
                className="w-full bg-overlay border border-gray-700 rounded-lg px-4 py-3 text-text-primary focus:outline-none focus:ring-2 focus:ring-glow-purple/50 transition-all"
              >
                <option value="">-- Aufgabe wählen --</option>
                {availableTasks.map(task => (
                  <option key={task.id} value={task.id}>
                    {task.isSubtask ? '  ↳ ' : ''}{task.title} ({task.listTitle})
                  </option>
                ))}
              </select>
              
              {availableTasks.length === 0 && (
                <p className="text-sm text-text-secondary mt-2">
                  Keine Aufgaben in diesem Projekt vorhanden.
                </p>
              )}
            </div>
          )}

          {/* Info Text */}
          {!selectedProjectId && (
            <div className="bg-glow-purple/10 border border-glow-purple/30 rounded-lg p-4">
              <p className="text-sm text-text-secondary">
                💡 Wähle zuerst ein Projekt aus, dann kannst du eine Aufgabe auswählen.
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-700">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-overlay text-text-secondary hover:text-text-primary transition-colors"
          >
            Abbrechen
          </button>
          <button
            onClick={handleStart}
            disabled={!selectedProjectId || !selectedTaskId}
            className="px-6 py-2 rounded-lg glow-button-highlight text-text-primary font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            Tracking starten
          </button>
        </div>
      </div>
    </div>
  );
};
