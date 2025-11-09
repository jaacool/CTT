import React, { useState, useMemo } from 'react';
import { Project } from '../types';
import { PlannerIcon, ClockIcon, ChartIcon, ChevronDownIcon, SearchIcon, StarIcon, PlusIcon } from './Icons';

interface SidebarProps {
  projects: Project[];
  selectedProject: Project | null;
  onSelectProject: (projectId: string) => void;
  onAddNewProject: () => void;
  onRenameProject: (projectId: string, newName: string) => void;
  onSelectDashboard: () => void;
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
                className="w-full bg-c-highlight text-c-text border-none outline-none focus:ring-1 focus:ring-c-blue rounded px-0 py-0"
                autoFocus
            />
        );
    }
    
    return (
        <span onDoubleClick={handleDoubleClick} className="flex-1 truncate">{project.name}</span>
    );
};


const ProjectItem: React.FC<{ project: Project; isSelected: boolean; onClick: () => void; onRename: (id: string, newName: string) => void }> = ({ project, isSelected, onClick, onRename }) => (
  <button
    onClick={onClick}
    className={`w-full flex items-center space-x-3 px-3 py-2 text-left rounded-md transition-colors ${
      isSelected ? 'bg-c-blue text-white' : 'hover:bg-c-highlight'
    }`}
  >
    <span className="text-lg">{project.icon}</span>
    <EditableProjectName project={project} onRename={onRename} />
  </button>
);

const NavItem: React.FC<{ icon: React.ReactNode; label: string }> = ({ icon, label }) => (
  <a href="#" className="flex items-center space-x-3 px-3 py-2 text-c-text hover:bg-c-highlight rounded-md transition-colors">
    {icon}
    <span>{label}</span>
  </a>
);


export const Sidebar: React.FC<SidebarProps> = ({ projects, selectedProject, onSelectProject, onAddNewProject, onRenameProject, onSelectDashboard }) => {
  const [searchTerm, setSearchTerm] = useState('');
  
  const filteredProjects = useMemo(() => 
      projects.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase())),
      [projects, searchTerm]
  );
  
  const favoriteProjects = filteredProjects.slice(0, 3);
  const myProjects = filteredProjects.slice(3);

  return (
    <aside className="w-64 bg-c-surface flex-shrink-0 p-4 flex flex-col space-y-4">
      <div className="flex-shrink-0">
        <nav className="space-y-1">
          <button 
                onClick={onSelectDashboard}
                className="w-full flex items-center space-x-3 px-3 py-2 text-c-text hover:bg-c-highlight rounded-md transition-colors"
            >
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
                    <rect x="3" y="3" width="7" height="7"></rect>
                    <rect x="14" y="3" width="7" height="7"></rect>
                    <rect x="14" y="14" width="7" height="7"></rect>
                    <rect x="3" y="14" width="7" height="7"></rect>
                </svg>
                <span>Mein Dashboard</span>
            </button>
          <NavItem icon={<ClockIcon className="w-5 h-5" />} label="Zeiten" />
          <NavItem icon={<ChartIcon className="w-5 h-5" />} label="Zeitauswertungen" />
            <a href="#" className="flex items-center space-x-3 px-3 py-2 text-c-subtle hover:text-c-text">
                <ChevronDownIcon className="w-5 h-5" />
                <span>Mehr anzeigen</span>
            </a>
        </nav>
      </div>

      <div className="relative flex-shrink-0">
        <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-c-muted" />
        <input
          type="text"
          placeholder="Suchen..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full bg-c-bg border border-c-highlight rounded-md pl-10 pr-4 py-2 outline-none focus:ring-2 focus:ring-c-blue"
        />
      </div>
      
      <div className="flex-1 overflow-y-auto pr-1">
        <div className="space-y-4">
          <div>
            <h3 className="flex items-center space-x-2 px-3 py-2 text-c-subtle text-xs font-bold uppercase">
              <ChevronDownIcon className="w-4 h-4" />
              <StarIcon className="w-4 h-4 text-c-yellow" />
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
                <h3 className="flex items-center space-x-2 px-3 py-2 text-c-subtle text-xs font-bold uppercase">
                <ChevronDownIcon className="w-4 h-4" />
                <span>🙂</span>
                <span>Meine Projekte</span>
                </h3>
                <button onClick={onAddNewProject} className="p-1 rounded-md hover:bg-c-highlight text-c-subtle hover:text-c-text">
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
    </aside>
  );
};