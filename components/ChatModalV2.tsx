import React, { useState, useRef, useEffect } from 'react';
import { ChatChannel, ChatMessage, Project, User, ChatChannelType } from '../types';
import { XIcon, SendIcon, HashIcon, FolderIcon, ChevronDownIcon, EditIcon, TrashIcon } from './Icons';
import { LinkPreview } from './LinkPreview';
import { ConfirmModal } from './ConfirmModal';

interface ChatModalV2Props {
  isOpen: boolean;
  onClose: () => void;
  channels: ChatChannel[];
  messages: ChatMessage[];
  projects: Project[];
  currentUser: User;
  currentProject: Project | null;
  currentChannel: ChatChannel | null;
  onSendMessage: (content: string, channelId: string, projectId: string) => void;
  onEditMessage: (messageId: string, newContent: string) => void;
  onDeleteMessage: (messageId: string) => void;
  onCreateChannel: (name: string, description: string, memberIds: string[], isPrivate: boolean) => void;
  onSwitchChannel: (channelId: string) => void;
  onSwitchProject: (projectId: string) => void;
  allUsers: User[];
}

export const ChatModalV2: React.FC<ChatModalV2Props> = ({
  isOpen,
  onClose,
  channels,
  messages,
  projects,
  currentUser,
  currentProject,
  currentChannel,
  onSendMessage,
  onEditMessage,
  onDeleteMessage,
  onCreateChannel,
  onSwitchChannel,
  onSwitchProject,
  allUsers,
}) => {
  const [messageInput, setMessageInput] = useState('');
  const [showProjectDropdown, setShowProjectDropdown] = useState(false);
  const [projectSearchQuery, setProjectSearchQuery] = useState('');
  const [channelSearchQuery, setChannelSearchQuery] = useState('');
  const [showSidebar, setShowSidebar] = useState(false);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editingContent, setEditingContent] = useState('');
  const [deleteConfirmMessageId, setDeleteConfirmMessageId] = useState<string | null>(null);
  const [showAddDMModal, setShowAddDMModal] = useState(false);
  const [dmUserSearch, setDmUserSearch] = useState('');
  const [showAddChannelModal, setShowAddChannelModal] = useState(false);
  const [draggedChannelId, setDraggedChannelId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Click outside to close dropdown - PROFESSIONELL
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowProjectDropdown(false);
        setProjectSearchQuery('');
      }
    };

    if (showProjectDropdown) {
      // Delay um zu verhindern dass der öffnende Klick sofort schließt
      setTimeout(() => {
        document.addEventListener('mousedown', handleClickOutside);
      }, 0);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showProjectDropdown]);

  // Get accessible channels
  const accessibleChannels = channels.filter(channel =>
    channel.members.some(member => member.id === currentUser.id)
  );

  // Separate channels by type
  const groupChannels = accessibleChannels.filter(c => c.type === ChatChannelType.Group);
  const directMessages = accessibleChannels.filter(c => c.type === ChatChannelType.Direct);

  // Filter channels by search
  const filteredGroupChannels = groupChannels.filter(channel =>
    !channelSearchQuery || channel.name.toLowerCase().includes(channelSearchQuery.toLowerCase())
  );

  const filteredDirectMessages = directMessages.filter(channel => {
    if (!channelSearchQuery) return true;
    const partner = channel.members.find(m => m.id !== currentUser.id);
    return partner?.name.toLowerCase().includes(channelSearchQuery.toLowerCase());
  });

  // Filter projects by search
  const filteredProjects = projects
    .filter(p => !projectSearchQuery || p.name.toLowerCase().includes(projectSearchQuery.toLowerCase()))
    .sort((a, b) => {
      // Active projects first
      if (a.status === 'AKTIV' && b.status !== 'AKTIV') return -1;
      if (a.status !== 'AKTIV' && b.status === 'AKTIV') return 1;
      return a.name.localeCompare(b.name);
    });

  // Filter messages: by channel and optionally by project
  const filteredMessages = messages.filter(msg => {
    if (msg.channelId !== currentChannel?.id) return false;
    if (currentProject && msg.projectId !== currentProject.id) return false;
    return true;
  });

  // Count unread messages per channel
  const getUnreadCountForChannel = (channelId: string) => {
    return messages.filter(msg =>
      msg.channelId === channelId &&
      msg.sender.id !== currentUser.id &&
      !msg.readBy.includes(currentUser.id)
    ).length;
  };

  // Get DM partner name
  const getDMPartnerName = (channel: ChatChannel) => {
    if (channel.type !== ChatChannelType.Direct) return channel.name;
    const partner = channel.members.find(m => m.id !== currentUser.id);
    return partner?.name || 'Unbekannt';
  };


  // Format timestamp
  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'Gerade eben';
    if (diffMins < 60) return `vor ${diffMins}min`;
    if (diffMins < 1440) return `vor ${Math.floor(diffMins / 60)}h`;
    return date.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' });
  };

  // Handle send message
  const handleSendMessage = () => {
    if (messageInput.trim() && currentChannel) {
      const projectId = currentProject?.id || '';
      onSendMessage(messageInput.trim(), currentChannel.id, projectId);
      setMessageInput('');
    }
  };

  // Handle edit message
  const handleEditMessage = (messageId: string) => {
    if (editingContent.trim()) {
      onEditMessage(messageId, editingContent.trim());
      setEditingMessageId(null);
      setEditingContent('');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-surface rounded-lg shadow-2xl w-full max-w-5xl h-[80vh] flex flex-col overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border bg-surface/95 backdrop-blur">
          <div className="flex items-center space-x-4">
            {/* Mobile Menu Toggle */}
            <button
              onClick={() => setShowSidebar(!showSidebar)}
              className="md:hidden text-text-secondary hover:text-text-primary"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            
            <h2 className="text-xl font-bold text-text-primary">Chat</h2>
          </div>

          {/* Project Filter Dropdown - NEU GEBAUT */}
          <div className="relative mr-2" ref={dropdownRef}>
            <button
              onClick={() => setShowProjectDropdown(!showProjectDropdown)}
              className="flex items-center space-x-2 px-3 py-2 bg-overlay rounded-lg text-sm hover:bg-overlay/80 transition-colors"
            >
              <FolderIcon className="w-4 h-4" />
              <span className="hidden md:inline">
                {currentProject ? currentProject.name : 'Alle Projekte'}
              </span>
              <span className="md:hidden">{currentProject ? currentProject.icon : '📁'}</span>
              <ChevronDownIcon className="w-4 h-4" />
            </button>

            {showProjectDropdown && (
              <div className="absolute left-1/2 -translate-x-1/2 mt-2 w-80 bg-surface border border-border rounded-lg shadow-2xl z-50 overflow-hidden">
                {/* Suchfeld */}
                <div className="p-3 border-b border-border">
                  <input
                    type="text"
                    placeholder="Projekt suchen..."
                    value={projectSearchQuery}
                    onChange={(e) => setProjectSearchQuery(e.target.value)}
                    className="w-full px-3 py-2 bg-overlay rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-glow-purple"
                    autoFocus
                  />
                </div>
                
                {/* Projekt-Liste */}
                <div className="max-h-80 overflow-y-auto">
                  {/* Alle Projekte Option */}
                  <button
                    onClick={() => {
                      onSwitchProject('');
                      setShowProjectDropdown(false);
                      setProjectSearchQuery('');
                    }}
                    className={`w-full flex items-center space-x-3 p-3 text-left transition-colors ${
                      !currentProject 
                        ? 'bg-glow-purple/20 text-text-primary' 
                        : 'hover:bg-overlay text-text-secondary'
                    }`}
                  >
                    <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                    </svg>
                    <span className="text-sm font-semibold">Alle Projekte</span>
                  </button>
                  
                  {/* Gefilterte Projekte */}
                  {filteredProjects.length === 0 ? (
                    <div className="p-4 text-center text-text-secondary text-sm">
                      Keine Projekte gefunden
                    </div>
                  ) : (
                    filteredProjects.map(project => {
                      // Prüfe ob icon ein Farbcode ist (wie in Sidebar)
                      const isColorCode = project.icon?.startsWith('#');
                      
                      return (
                        <button
                          key={project.id}
                          onClick={() => {
                            onSwitchProject(project.id);
                            setShowProjectDropdown(false);
                            setProjectSearchQuery('');
                          }}
                          className={`w-full flex items-center space-x-3 p-3 text-left transition-colors ${
                            currentProject?.id === project.id 
                              ? 'bg-glow-purple/20 text-text-primary' 
                              : 'hover:bg-overlay text-text-secondary'
                          }`}
                        >
                          {/* Icon-Rendering GENAU wie in Sidebar */}
                          {isColorCode ? (
                            <div 
                              className="w-5 h-5 rounded-md flex-shrink-0" 
                              style={{ backgroundColor: project.icon }}
                            />
                          ) : (
                            <span className="text-xl flex-shrink-0">{project.icon}</span>
                          )}
                          
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium truncate">{project.name}</div>
                            {project.status === 'AKTIV' && (
                              <div className="text-xs text-glow-purple">Aktiv</div>
                            )}
                          </div>
                        </button>
                      );
                    })
                  
                  )}
                </div>
              </div>
            )}
          </div>

          <button onClick={onClose} className="text-text-secondary hover:text-text-primary">
            <XIcon className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="flex flex-1 overflow-hidden">
          
          {/* Sidebar */}
          <div className={`
            fixed md:relative inset-y-0 left-0 z-40
            w-64 border-r border-border bg-surface p-4 overflow-y-auto
            transform transition-transform duration-300
            ${showSidebar ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
          `}>
            {/* Search */}
            <div className="mb-4">
              <input
                type="text"
                placeholder="Channels durchsuchen..."
                value={channelSearchQuery}
                onChange={(e) => setChannelSearchQuery(e.target.value)}
                className="w-full px-3 py-2 bg-overlay rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-glow-purple"
              />
            </div>

            {/* Group Channels */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-2">
                <div className="text-xs text-text-secondary font-semibold uppercase">Channels</div>
                {currentUser.role === 'admin' && (
                  <button
                    onClick={() => setShowAddChannelModal(true)}
                    className="text-glow-purple hover:text-glow-purple/80 transition-colors"
                    title="Neuen Channel erstellen"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                  </button>
                )}
              </div>
              <div className="space-y-1">
                {filteredGroupChannels.map(channel => {
                  const unreadCount = getUnreadCountForChannel(channel.id);
                  return (
                    <button
                      key={channel.id}
                      draggable
                      onDragStart={() => setDraggedChannelId(channel.id)}
                      onDragEnd={() => setDraggedChannelId(null)}
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={(e) => {
                        e.preventDefault();
                        // TODO: Implement channel reordering
                        console.log('Dropped', draggedChannelId, 'onto', channel.id);
                      }}
                      onClick={() => {
                        onSwitchChannel(channel.id);
                        setShowSidebar(false);
                      }}
                      className={`w-full flex items-center justify-between p-2 rounded-lg transition-colors cursor-move ${
                        currentChannel?.id === channel.id ? 'glow-button' : 'hover-glow'
                      } ${draggedChannelId === channel.id ? 'opacity-50' : ''}`}
                    >
                      <div className="flex items-center space-x-2 flex-1 min-w-0">
                        <HashIcon className="w-4 h-4 flex-shrink-0" />
                        <span className="text-sm truncate">{channel.name}</span>
                      </div>
                      {unreadCount > 0 && (
                        <span className="ml-2 bg-red-500 text-white text-xs font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1">
                          {unreadCount > 99 ? '99+' : unreadCount}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Direct Messages */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="text-xs text-text-secondary font-semibold uppercase">Direktnachrichten</div>
                <button
                  onClick={() => setShowAddDMModal(true)}
                  className="text-glow-purple hover:text-glow-purple/80 transition-colors"
                  title="Neue Direktnachricht starten"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                </button>
              </div>
              <div className="space-y-1">
                {filteredDirectMessages.map(channel => {
                  const partner = channel.members.find(m => m.id !== currentUser.id);
                  const unreadCount = getUnreadCountForChannel(channel.id);
                  return (
                    <button
                      key={channel.id}
                      onClick={() => {
                        onSwitchChannel(channel.id);
                        setShowSidebar(false);
                      }}
                      className={`w-full flex items-center justify-between p-2 rounded-lg transition-colors ${
                        currentChannel?.id === channel.id ? 'glow-button' : 'hover-glow'
                      }`}
                    >
                      <div className="flex items-center space-x-2 flex-1 min-w-0">
                        {partner && (
                          <img src={partner.avatarUrl} alt={partner.name} className="w-5 h-5 rounded-full" />
                        )}
                        <span className="text-sm truncate">{getDMPartnerName(channel)}</span>
                      </div>
                      {unreadCount > 0 && (
                        <span className="ml-2 bg-red-500 text-white text-xs font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1">
                          {unreadCount > 99 ? '99+' : unreadCount}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Mobile Overlay */}
          {showSidebar && (
            <div
              className="md:hidden fixed inset-0 bg-black/50 z-30"
              onClick={() => setShowSidebar(false)}
            />
          )}

          {/* Main Chat Area */}
          <div className="flex-1 flex flex-col overflow-hidden">
            
            {/* Chat Header */}
            {currentChannel && (
              <div className="p-4 border-b border-border">
                <div className="flex items-center space-x-2">
                  {currentChannel.type === ChatChannelType.Direct ? (
                    <>
                      {(() => {
                        const partner = currentChannel.members.find(m => m.id !== currentUser.id);
                        return partner ? (
                          <>
                            <img src={partner.avatarUrl} alt={partner.name} className="w-8 h-8 rounded-full" />
                            <div>
                              <div className="font-semibold">{partner.name}</div>
                              <div className="text-xs text-text-secondary">{partner.role}</div>
                            </div>
                          </>
                        ) : null;
                      })()}
                    </>
                  ) : (
                    <>
                      <HashIcon className="w-6 h-6" />
                      <div>
                        <div className="font-semibold">{currentChannel.name}</div>
                        {currentChannel.description && (
                          <div className="text-xs text-text-secondary">{currentChannel.description}</div>
                        )}
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {filteredMessages.length === 0 ? (
                <div className="flex items-center justify-center h-full text-text-secondary">
                  <div className="text-center">
                    <p className="text-lg mb-2">Noch keine Nachrichten</p>
                    <p className="text-sm">Starte eine Unterhaltung!</p>
                  </div>
                </div>
              ) : (
                filteredMessages.map(message => (
                  <div key={message.id} className="flex space-x-3 group">
                    <img
                      src={message.sender.avatarUrl}
                      alt={message.sender.name}
                      className="w-8 h-8 rounded-full flex-shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline space-x-2">
                        <span className="font-semibold text-sm">{message.sender.name}</span>
                        <span className="text-xs text-text-secondary">{formatTimestamp(message.timestamp)}</span>
                        {message.edited && (
                          <span className="text-xs text-text-secondary italic">(bearbeitet)</span>
                        )}
                      </div>
                      
                      {editingMessageId === message.id ? (
                        <div className="mt-1">
                          <input
                            type="text"
                            value={editingContent}
                            onChange={(e) => setEditingContent(e.target.value)}
                            onKeyPress={(e) => e.key === 'Enter' && handleEditMessage(message.id)}
                            className="w-full px-3 py-2 bg-overlay rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-glow-purple"
                            autoFocus
                          />
                          <div className="flex space-x-2 mt-2">
                            <button
                              onClick={() => handleEditMessage(message.id)}
                              className="px-3 py-1 bg-glow-purple rounded text-xs"
                            >
                              Speichern
                            </button>
                            <button
                              onClick={() => {
                                setEditingMessageId(null);
                                setEditingContent('');
                              }}
                              className="px-3 py-1 bg-overlay rounded text-xs"
                            >
                              Abbrechen
                            </button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div className="mt-1 text-sm break-words">
                            {message.content}
                            {message.content.match(/https?:\/\/[^\s]+/) && (
                              <LinkPreview url={message.content.match(/https?:\/\/[^\s]+/)?.[0] || ''} />
                            )}
                          </div>
                          
                          {message.sender.id === currentUser.id && (
                            <div className="opacity-0 group-hover:opacity-100 transition-opacity mt-1 flex space-x-2">
                              <button
                                onClick={() => {
                                  setEditingMessageId(message.id);
                                  setEditingContent(message.content);
                                }}
                                className="text-xs text-text-secondary hover:text-text-primary"
                              >
                                <EditIcon className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => setDeleteConfirmMessageId(message.id)}
                                className="text-xs text-text-secondary hover:text-red-500"
                              >
                                <TrashIcon className="w-4 h-4" />
                              </button>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                ))
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Message Input */}
            {currentChannel && (
              <div className="p-4 border-t border-border">
                <div className="flex space-x-2">
                  <input
                    type="text"
                    value={messageInput}
                    onChange={(e) => setMessageInput(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                    placeholder={`Nachricht in ${currentChannel.type === ChatChannelType.Direct ? getDMPartnerName(currentChannel) : currentChannel.name}...`}
                    className="flex-1 px-4 py-2 bg-overlay rounded-lg focus:outline-none focus:ring-2 focus:ring-glow-purple"
                  />
                  <button
                    onClick={handleSendMessage}
                    disabled={!messageInput.trim()}
                    className="px-4 py-2 glow-button rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <SendIcon className="w-5 h-5" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {deleteConfirmMessageId && (
        <ConfirmModal
          isOpen={true}
          title="Nachricht löschen"
          message="Möchtest du diese Nachricht wirklich löschen?"
          onConfirm={() => {
            onDeleteMessage(deleteConfirmMessageId);
            setDeleteConfirmMessageId(null);
          }}
          onCancel={() => setDeleteConfirmMessageId(null)}
        />
      )}

      {/* Add Direct Message Modal */}
      {showAddDMModal && (
        <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4">
          <div className="bg-surface rounded-lg shadow-xl w-full max-w-md p-6">
            <h3 className="text-lg font-bold mb-4">Neue Direktnachricht</h3>
            
            <input
              type="text"
              placeholder="Mitarbeiter suchen..."
              value={dmUserSearch}
              onChange={(e) => setDmUserSearch(e.target.value)}
              className="w-full px-4 py-2 bg-overlay rounded-lg mb-4 focus:outline-none focus:ring-2 focus:ring-glow-purple"
              autoFocus
            />

            <div className="max-h-64 overflow-y-auto space-y-2 mb-4">
              {allUsers
                .filter(user => 
                  user.id !== currentUser.id &&
                  (!dmUserSearch || user.name.toLowerCase().includes(dmUserSearch.toLowerCase()))
                )
                .map(user => (
                  <button
                    key={user.id}
                    onClick={() => {
                      // Finde existierenden DM-Channel
                      const existingDM = directMessages.find(channel => 
                        channel.members.some(m => m.id === user.id)
                      );
                      
                      if (existingDM) {
                        // Wechsle zu existierendem Channel
                        onSwitchChannel(existingDM.id);
                      } else {
                        // Erstelle neuen DM-Channel
                        const channelName = `${currentUser.name} & ${user.name}`;
                        onCreateChannel(
                          channelName,
                          '',
                          [currentUser.id, user.id],
                          false
                        );
                        
                        // Der neue Channel wird automatisch in App.tsx erstellt
                        // und sollte sofort in der Liste erscheinen
                        // Warte kurz und wechsle zum neuen Channel
                        setTimeout(() => {
                          const newDM = channels.find(c => 
                            c.type === ChatChannelType.Direct &&
                            c.members.length === 2 &&
                            c.members.some(m => m.id === user.id) &&
                            c.members.some(m => m.id === currentUser.id)
                          );
                          if (newDM) {
                            onSwitchChannel(newDM.id);
                          }
                        }, 100);
                      }
                      
                      setShowAddDMModal(false);
                      setDmUserSearch('');
                    }}
                    className="w-full flex items-center space-x-3 p-3 rounded-lg hover:bg-overlay transition-colors"
                  >
                    <img src={user.avatarUrl} alt={user.name} className="w-8 h-8 rounded-full" />
                    <div className="text-left">
                      <div className="font-medium">{user.name}</div>
                      <div className="text-xs text-text-secondary">{user.role}</div>
                    </div>
                  </button>
                ))}
            </div>

            <div className="flex justify-end space-x-2">
              <button
                onClick={() => {
                  setShowAddDMModal(false);
                  setDmUserSearch('');
                }}
                className="px-4 py-2 bg-overlay rounded-lg hover:bg-overlay/80"
              >
                Abbrechen
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Channel Modal */}
      {showAddChannelModal && (
        <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4">
          <div className="bg-surface rounded-lg shadow-xl w-full max-w-md p-6">
            <h3 className="text-lg font-bold mb-4">Neuen Channel erstellen</h3>
            
            <div className="text-text-secondary mb-4">
              Feature kommt bald! Hier können Admins neue Channels erstellen.
            </div>

            <div className="flex justify-end">
              <button
                onClick={() => setShowAddChannelModal(false)}
                className="px-4 py-2 glow-button rounded-lg"
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
