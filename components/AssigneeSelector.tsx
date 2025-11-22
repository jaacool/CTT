import React, { useState, useRef, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { User, UserStatus } from '../types';

interface AssigneeSelectorProps {
    assignees: User[];
    allUsers: User[];
    onAssigneesChange: (assignees: User[]) => void;
    size?: 'small' | 'medium';
}

export const AssigneeSelector: React.FC<AssigneeSelectorProps> = ({ 
    assignees, 
    allUsers, 
    onAssigneesChange,
    size = 'small'
}) => {
    const [showMenu, setShowMenu] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [menuPosition, setMenuPosition] = useState<{ top: number; left: number } | null>(null);
    const buttonRef = useRef<HTMLDivElement>(null);

    const avatarSize = size === 'small' ? 'w-6 h-6' : 'w-8 h-8';
    const avatarOffset = size === 'small' ? '-ml-2' : '-ml-3';

    // Berechne Menu-Position wenn es geöffnet wird
    useEffect(() => {
        if (showMenu && buttonRef.current) {
            const rect = buttonRef.current.getBoundingClientRect();
            setMenuPosition({
                top: rect.bottom + window.scrollY + 8,
                left: rect.right + window.scrollX - 320 // 320px = w-80
            });
        }
    }, [showMenu]);

    const toggleAssignee = (user: User) => {
        const isAssigned = assignees.some(a => a.id === user.id);
        if (isAssigned) {
            onAssigneesChange(assignees.filter(a => a.id !== user.id));
        } else {
            onAssigneesChange([...assignees, user]);
        }
    };

    const removeAllAssignees = () => {
        onAssigneesChange([]);
        setShowMenu(false);
    };

    const filteredUsers = allUsers.filter(user =>
        // Nur aktive User anzeigen
        user.status !== UserStatus.Inactive &&
        (user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    return (
        <div className="relative">
            <div 
                ref={buttonRef}
                className="flex items-center cursor-pointer hover:opacity-80 transition-opacity"
                onClick={(e) => {
                    e.stopPropagation();
                    setShowMenu(!showMenu);
                }}
            >
                {assignees.length === 0 ? (
                    <div className={`${avatarSize} rounded-full border-2 border-dashed border-text-secondary flex items-center justify-center`}>
                        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path>
                            <circle cx="9" cy="7" r="4"></circle>
                            <line x1="19" y1="8" x2="19" y2="14"></line>
                            <line x1="22" y1="11" x2="16" y2="11"></line>
                        </svg>
                    </div>
                ) : (
                    <div className="flex items-center">
                        {assignees.slice(0, 3).map((assignee, index) => (
                            <img
                                key={assignee.id}
                                src={assignee.avatarUrl}
                                alt={assignee.name}
                                title={assignee.name}
                                className={`${avatarSize} rounded-full border-2 border-surface ${index > 0 ? avatarOffset : ''}`}
                                style={{ zIndex: assignees.length - index }}
                            />
                        ))}
                        {assignees.length > 3 && (
                            <div className={`${avatarSize} ${avatarOffset} rounded-full bg-overlay border-2 border-surface flex items-center justify-center text-xs text-text-primary font-bold`}
                                style={{ zIndex: 0 }}>
                                +{assignees.length - 3}
                            </div>
                        )}
                    </div>
                )}
            </div>

            {showMenu && menuPosition && ReactDOM.createPortal(
                <>
                    <div 
                        className="fixed inset-0 z-[9998]" 
                        onClick={(e) => {
                            e.stopPropagation();
                            setShowMenu(false);
                        }}
                    />
                    <div 
                        className="fixed z-[9999] bg-surface border border-overlay rounded-xl shadow-2xl w-80 max-h-96 overflow-hidden flex flex-col"
                        style={{ top: `${menuPosition.top}px`, left: `${menuPosition.left}px` }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="p-3 border-b border-overlay">
                            <h4 className="text-sm font-bold text-text-primary mb-2">Bearbeiter</h4>
                            {assignees.length > 0 && (
                                <div className="space-y-1 mb-3">
                                    {assignees.map(assignee => (
                                        <div key={assignee.id} className="flex items-center justify-between p-2 bg-overlay rounded-lg">
                                            <div className="flex items-center space-x-2">
                                                <img src={assignee.avatarUrl} alt={assignee.name} className="w-7 h-7 rounded-full" />
                                                <div className="flex-1 min-w-0">
                                                    <div className="text-sm font-semibold text-text-primary truncate">{assignee.name}</div>
                                                    <div className="text-xs text-text-secondary truncate">{assignee.email}</div>
                                                </div>
                                            </div>
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    toggleAssignee(assignee);
                                                }}
                                                className="p-1 hover:bg-surface rounded transition-colors"
                                            >
                                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-text-secondary">
                                                    <line x1="18" y1="6" x2="6" y2="18"></line>
                                                    <line x1="6" y1="6" x2="18" y2="18"></line>
                                                </svg>
                                            </button>
                                        </div>
                                    ))}
                                    <button
                                        onClick={removeAllAssignees}
                                        className="w-full text-center text-xs text-glow-purple hover:text-glow-magenta transition-colors py-1"
                                    >
                                        Alle entfernen
                                    </button>
                                </div>
                            )}
                            <div className="relative">
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary">
                                    <circle cx="11" cy="11" r="8"></circle>
                                    <path d="m21 21-4.35-4.35"></path>
                                </svg>
                                <input
                                    type="text"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    placeholder="Suchen"
                                    className="w-full bg-background text-text-primary text-sm pl-10 pr-3 py-2 rounded-lg border border-border focus:outline-none focus:ring-1 focus:ring-glow-purple"
                                    onClick={(e) => e.stopPropagation()}
                                />
                            </div>
                        </div>
                        <div className="flex-1 overflow-y-auto p-2">
                            {filteredUsers.map(user => {
                                const isAssigned = assignees.some(a => a.id === user.id);
                                return (
                                    <button
                                        key={user.id}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            toggleAssignee(user);
                                        }}
                                        className={`w-full flex items-center justify-between p-2 rounded-lg hover:bg-overlay transition-colors ${
                                            isAssigned ? 'bg-overlay' : ''
                                        }`}
                                    >
                                        <div className="flex items-center space-x-2 flex-1 min-w-0">
                                            <img src={user.avatarUrl} alt={user.name} className="w-8 h-8 rounded-full flex-shrink-0" />
                                            <div className="flex-1 min-w-0 text-left">
                                                <div className={`text-sm font-medium truncate ${
                                                    isAssigned ? 'text-glow-purple' : 'text-text-primary'
                                                }`}>{user.name}</div>
                                                <div className="text-xs text-text-secondary truncate">{user.email}</div>
                                            </div>
                                        </div>
                                        {isAssigned && (
                                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-glow-purple flex-shrink-0">
                                                <polyline points="20 6 9 17 4 12"></polyline>
                                            </svg>
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </>,
                document.body
            )}
        </div>
    );
};
