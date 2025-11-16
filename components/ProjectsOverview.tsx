import React, { useState } from 'react';
import { Project, TaskStatus } from '../types';

interface ProjectsOverviewProps {
  projects: Project[];
  onSelectProject: (projectId: string) => void;
}

export const ProjectsOverview: React.FC<ProjectsOverviewProps> = ({ projects, onSelectProject }) => {
  const [view, setView] = useState<'list' | 'timeline'>('list');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterStandard, setFilterStandard] = useState<string>('all');

  // Berechne Projekt-Statistiken
  const getProjectStats = (project: Project) => {
    const allTasks = project.taskLists.flatMap(list => list.tasks);
    const totalTasks = allTasks.length;
    const completedTasks = allTasks.filter(t => t.status === TaskStatus.Done).length;
    const progress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
    
    return {
      totalTasks,
      completedTasks,
      progress,
      taskText: `${completedTasks} / ${totalTasks}`
    };
  };

  // Gruppiere Projekte nach Status
  const groupedProjects = projects.reduce((acc, project) => {
    const status = project.status || 'Noch nicht gestartet';
    if (!acc[status]) acc[status] = [];
    acc[status].push(project);
    return acc;
  }, {} as Record<string, Project[]>);

  return (
    <div className="w-full max-w-7xl mx-auto p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-4">
          <h1 className="text-2xl font-bold glow-text flex items-center space-x-2">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>
            </svg>
            <span>Projekte</span>
          </h1>
          <button className="px-4 py-2 glow-button text-text-primary rounded-lg hover:opacity-80 transition-colors flex items-center space-x-2">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19"></line>
              <line x1="5" y1="12" x2="19" y2="12"></line>
            </svg>
            <span>Projekt</span>
          </button>
        </div>

        <div className="flex items-center space-x-4">
          {/* View Toggle */}
          <div className="flex glow-card rounded-lg p-1">
            <button
              onClick={() => setView('list')}
              className={`px-4 py-2 rounded-md text-sm font-semibold transition-colors ${
                view === 'list' ? 'glow-button text-text-primary' : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              Liste
            </button>
            <button
              onClick={() => setView('timeline')}
              className={`px-4 py-2 rounded-md text-sm font-semibold transition-colors ${
                view === 'timeline' ? 'glow-button text-text-primary' : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              Timeline
            </button>
          </div>

          {/* Filter Buttons */}
          <div className="flex items-center space-x-2">
            <button className="px-3 py-2 glow-button text-text-primary rounded-lg text-sm flex items-center space-x-2">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="8" y1="6" x2="21" y2="6"></line>
                <line x1="8" y1="12" x2="21" y2="12"></line>
                <line x1="8" y1="18" x2="21" y2="18"></line>
                <line x1="3" y1="6" x2="3.01" y2="6"></line>
                <line x1="3" y1="12" x2="3.01" y2="12"></line>
                <line x1="3" y1="18" x2="3.01" y2="18"></line>
              </svg>
              <span>Projektstatus-Typ</span>
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
            
            <button className="px-3 py-2 glow-button text-text-primary rounded-lg text-sm flex items-center space-x-2">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon>
              </svg>
              <span>Standard</span>
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>

            <button className="p-2 hover:glow-card rounded-lg">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-text-secondary">
                <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon>
              </svg>
            </button>

            <button className="p-2 hover:glow-card rounded-lg">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-text-secondary">
                <rect x="3" y="3" width="7" height="7"></rect>
                <rect x="14" y="3" width="7" height="7"></rect>
                <rect x="14" y="14" width="7" height="7"></rect>
                <rect x="3" y="14" width="7" height="7"></rect>
              </svg>
            </button>

            <button className="p-2 hover:glow-card rounded-lg">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-text-secondary">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                <polyline points="7 10 12 15 17 10"></polyline>
                <line x1="12" y1="15" x2="12" y2="3"></line>
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Table Header */}
      <div className="glow-card rounded-t-xl">
        <div className="grid grid-cols-12 gap-4 px-6 py-3 text-text-secondary text-xs font-semibold border-b border-overlay">
          <div className="col-span-4">Projekt</div>
          <div className="col-span-2">Typ</div>
          <div className="col-span-1">Tags</div>
          <div className="col-span-1">Fällig</div>
          <div className="col-span-3">Aufgaben</div>
          <div className="col-span-1">Verantwortlich</div>
        </div>
      </div>

      {/* Projects List */}
      <div className="glow-card rounded-b-xl">
        {Object.entries(groupedProjects).map(([status, projectsInGroup]: [string, Project[]]) => (
          <div key={status} className="mb-4">
            {/* Status Header */}
            <div className="flex items-center space-x-2 px-6 py-2">
              <div className={`w-2 h-2 rounded-full ${
                status === 'AKTIV' ? 'bg-glow-purple' : 
                status === 'GEPLANT' ? 'bg-yellow-400' : 
                'bg-text-secondary'
              }`}></div>
              <span className="text-text-secondary text-sm font-semibold">{status}</span>
            </div>

            {/* Projects */}
            {projectsInGroup.map((project) => {
              const stats = getProjectStats(project);
              
              return (
                <div
                  key={project.id}
                  onClick={() => onSelectProject(project.id)}
                  className="grid grid-cols-12 gap-4 px-6 py-4 hover:bg-overlay transition-colors cursor-pointer border-b border-overlay/50"
                >
                  {/* Projekt Name */}
                  <div className="col-span-4 flex items-center space-x-3">
                    <div 
                      className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold text-sm"
                      style={{ backgroundColor: project.icon }}
                    >
                      {project.name.substring(0, 2).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <div className="text-text-primary font-semibold truncate">{project.name}</div>
                      <div className="text-text-secondary text-xs truncate">{project.client || '-'}</div>
                    </div>
                  </div>

                  {/* Typ */}
                  <div className="col-span-2 flex items-center">
                    <span className="text-text-secondary text-sm">PROJEKTARB...</span>
                  </div>

                  {/* Tags */}
                  <div className="col-span-1 flex items-center">
                    <span className="px-2 py-1 bg-overlay text-text-secondary text-xs rounded">None</span>
                  </div>

                  {/* Fällig */}
                  <div className="col-span-1 flex items-center">
                    <span className="text-text-secondary text-sm">-</span>
                  </div>

                  {/* Aufgaben */}
                  <div className="col-span-3 flex items-center space-x-4">
                    <span className="text-text-primary text-sm">{stats.taskText}</span>
                    {stats.progress > 0 && (
                      <div className="flex items-center space-x-2 flex-1">
                        <div className="flex-1 bg-overlay rounded-full h-2 max-w-[120px]">
                          <div
                            className={`h-2 rounded-full ${
                              stats.progress === 100 ? 'bg-red-500' :
                              stats.progress > 50 ? 'bg-glow-purple' :
                              'bg-glow-purple'
                            }`}
                            style={{ width: `${stats.progress}%` }}
                          ></div>
                        </div>
                        <span className="text-text-secondary text-xs">{stats.progress}%</span>
                      </div>
                    )}
                  </div>

                  {/* Verantwortlich */}
                  <div className="col-span-1 flex items-center justify-between">
                    <img
                      src={project.owner?.avatarUrl || 'https://i.pravatar.cc/150?u=default'}
                      alt={project.owner?.name || 'User'}
                      className="w-6 h-6 rounded-full"
                    />
                    <button className="text-text-secondary hover:text-text-primary">
                      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="1"></circle>
                        <circle cx="12" cy="5" r="1"></circle>
                        <circle cx="12" cy="19" r="1"></circle>
                      </svg>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
};
