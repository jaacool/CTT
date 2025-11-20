import React, { useState, useMemo } from 'react';
import { Project, User, Role } from '../types';
import { PlannerIcon, ClockIcon, ChartIcon, ChevronDownIcon, SearchIcon, StarIcon, PlusIcon, UmbrellaIcon } from './Icons';
import { hasPermission } from '../utils/permissions';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  projects: Project[];
  selectedProject: Project | null;
  currentUser: User | null;
  roles: Role[];
  onSelectProject: (projectId: string) => void;
  onAddNewProject: () => void;
  onRenameProject: (projectId: string, newName: string) => void;
  onSelectDashboard: () => void;
  onSelectProjectsOverview: () => void;
  onSelectVacationAbsence: () => void;
  onSelectTimeTracking: () => void;
  onSelectTimeStatistics: () => void;
  onSelectSettings: () => void;
}

const EditableProjectName: React.FC<{ project: Project; onRename: (id: string, newName: string) => void }> = ({ project, onRename }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [name, setName] = useState(project.name);

    const handleDoubleClick = () => setIsEditing(true);
    
    const handleBlur = () => {
        if (name.trim() && name !== project.name) {
            onRename(project.id, name.trim());
        }
        setIsEditing(false);
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            handleBlur();
        } else if (e.key === 'Escape') {
            setName(project.name);
            setIsEditing(false);
        }
    };
    
    if (isEditing) {
        return (
            <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                onBlur={handleBlur}
                onKeyDown={handleKeyDown}
                className="w-full bg-overlay text-text-primary border-none outline-none focus:ring-1 focus:ring-glow-purple rounded px-0 py-0"
                autoFocus
            />
        );
    }
    
    return (
        <span onDoubleClick={handleDoubleClick} className="flex-1 truncate">{project.name}</span>
    );
};


const ProjectItem: React.FC<{ project: Project; isSelected: boolean; onClick: () => void; onRename: (id: string, newName: string) => void }> = ({ project, isSelected, onClick, onRename }) => {
  // Prüfe ob icon ein Farbcode ist (z.B. #d946ef)
  const isColorCode = project.icon?.startsWith('#');
  
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center space-x-3 px-3 py-2 text-left rounded-md ${
        isSelected ? 'glow-button text-white' : 'hover-glow text-text-primary'
      }`}
    >
      {isColorCode ? (
        <div 
          className="w-5 h-5 rounded-md flex-shrink-0" 
          style={{ backgroundColor: project.icon }}
        />
      ) : (
        <span className="text-lg">{project.icon}</span>
      )}
      <EditableProjectName project={project} onRename={onRename} />
    </button>
  );
};

const NavItem: React.FC<{ icon: React.ReactNode; label: string }> = ({ icon, label }) => (
  <a href="#" className="flex items-center space-x-3 px-3 py-2 text-text-primary hover-glow rounded-md">
    {icon}
    <span>{label}</span>
  </a>
);


export const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose, projects, selectedProject, currentUser, roles, onSelectProject, onAddNewProject, onRenameProject, onSelectDashboard, onSelectProjectsOverview, onSelectVacationAbsence, onSelectTimeTracking, onSelectTimeStatistics, onSelectSettings }) => {
  const canAccessSettings = hasPermission(currentUser, roles, 'Einstellungen');
  const [searchTerm, setSearchTerm] = useState('');
  
  const filteredProjects = useMemo(() => 
      projects.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase())),
      [projects, searchTerm]
  );
  
  const favoriteProjects = filteredProjects.slice(0, 3);
  const myProjects = filteredProjects.slice(3);

  return (
    <>
      {/* Overlay for mobile */}
      <div 
        className={`fixed inset-0 bg-black bg-opacity-50 z-30 transition-opacity md:hidden ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        onClick={onClose}
      ></div>

      <aside className={`w-64 bg-surface p-4 flex flex-col space-y-4 
        fixed top-0 left-0 h-full z-40 transform transition-transform md:relative md:translate-x-0 md:flex-shrink-0
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}>

      <div className="flex-shrink-0">
        <nav className="space-y-1">
          <button 
                onClick={onSelectDashboard}
                className="w-full flex items-center space-x-3 px-3 py-2 text-text-primary hover-glow rounded-md"
            >
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
                    <rect x="3" y="3" width="7" height="7"></rect>
                    <rect x="14" y="3" width="7" height="7"></rect>
                    <rect x="14" y="14" width="7" height="7"></rect>
                    <rect x="3" y="14" width="7" height="7"></rect>
                </svg>
                <span>Mein Dashboard</span>
            </button>
            <button 
                onClick={onSelectTimeTracking}
                className="w-full flex items-center space-x-3 px-3 py-2 text-text-primary hover-glow rounded-md"
            >
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
                  <circle cx="12" cy="12" r="10"></circle>
                  <polyline points="12 6 12 12 16 14"></polyline>
                </svg>
                <span>Meine Zeiten</span>
            </button>
            {/* Zeitauswertungen nur für Admins */}
            {currentUser?.role === 'role-1' && (
              <button 
                  onClick={onSelectTimeStatistics}
                  className="w-full flex items-center space-x-3 px-3 py-2 text-text-primary hover-glow rounded-md"
              >
                  <ChartIcon className="w-5 h-5" />
                  <span>Zeitauswertungen</span>
              </button>
            )}
            <button 
                onClick={onSelectProjectsOverview}
                className="w-full flex items-center space-x-3 px-3 py-2 text-text-primary hover-glow rounded-md"
            >
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
                  <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>
                </svg>
                <span>Projekte</span>
            </button>
            <button 
                onClick={onSelectVacationAbsence}
                className="w-full flex items-center space-x-3 px-3 py-2 text-text-primary hover-glow rounded-md"
            >
                <UmbrellaIcon className="w-5 h-5" />
                <span>Urlaub & Absent</span>
            </button>
        </nav>
      </div>

      <div className="relative flex-shrink-0">
        <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-text-secondary" />
        <input
          type="text"
          placeholder="Suchen..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full bg-background/50 backdrop-blur-sm border border-border rounded-md pl-10 pr-4 py-2 text-text-primary outline-none focus:glow-border transition-all placeholder-text-secondary/50"
        />
      </div>
      
      <div className="flex-1 overflow-y-auto pr-1">
        <div className="space-y-4">
          <div>
            <h3 className="flex items-center space-x-2 px-3 py-2 text-text-secondary text-xs font-bold uppercase">
              <ChevronDownIcon className="w-4 h-4" />
              <StarIcon className="w-4 h-4 text-glow-lime" />
              <span>Favoriten</span>
            </h3>
            <div className="space-y-1 mt-1">
              {favoriteProjects.map(p => (
                <ProjectItem key={p.id} project={p} isSelected={selectedProject?.id === p.id} onClick={() => onSelectProject(p.id)} onRename={onRenameProject} />
              ))}
            </div>
          </div>
          <div>
            <div className="flex justify-between items-center">
                <h3 className="flex items-center space-x-2 px-3 py-2 text-text-secondary text-xs font-bold uppercase">
                <ChevronDownIcon className="w-4 h-4" />
                <span>🙂</span>
                <span>Meine Projekte</span>
                </h3>
                <button onClick={onAddNewProject} className="p-1 rounded-md hover-glow text-text-secondary">
                    <PlusIcon className="w-4 h-4" />
                </button>
            </div>
            <div className="space-y-1 mt-1">
              {myProjects.map(p => (
                <ProjectItem key={p.id} project={p} isSelected={selectedProject?.id === p.id} onClick={() => onSelectProject(p.id)} onRename={onRenameProject} />
              ))}
            </div>
          </div>
        </div>
      </div>
      
      {/* Settings Button - Fixed at Bottom */}
      <div className="flex-shrink-0 border-t border-border pt-4">
        {canAccessSettings && (
          <button onClick={onSelectSettings} className="w-full flex items-center space-x-3 px-3 py-2 text-text-primary hover-glow rounded-md">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
              <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.106-3.105c.32-.322.863-.22.983.218a6 6 0 0 1-8.259 7.057l-7.91 7.91a1 1 0 0 1-2.999-3l7.91-7.91a6 6 0 0 1 7.057-8.259c.438.12.54.662.219.984z"/>
            </svg>
            <span>Einstellungen</span>
          </button>
        )}
      </div>
    </aside>
    </>
  );
};