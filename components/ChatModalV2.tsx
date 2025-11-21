import React, { useState, useRef, useEffect } from 'react';
import { ChatChannel, ChatMessage, Project, User, ChatChannelType } from '../types';
import { XIcon, SendIcon, HashIcon, FolderIcon, ChevronDownIcon, EditIcon, TrashIcon, MicIcon } from './Icons';
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
  onReactToMessage: (messageId: string, emoji: string) => void;
  allUsers: User[];
  showAdminsInDMs?: boolean;
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
  onReactToMessage,
  allUsers,
  showAdminsInDMs = true,
}) => {
  const [messageInput, setMessageInput] = useState('');
  const [showProjectDropdown, setShowProjectDropdown] = useState(false);
  const [projectSearchQuery, setProjectSearchQuery] = useState('');
  const [channelSearchQuery, setChannelSearchQuery] = useState('');
  const [showSidebar, setShowSidebar] = useState(false);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editingContent, setEditingContent] = useState('');
  const [deleteConfirmMessageId, setDeleteConfirmMessageId] = useState<string | null>(null);
  const [showAddChannelModal, setShowAddChannelModal] = useState(false);
  const [draggedChannelId, setDraggedChannelId] = useState<string | null>(null);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; messageId: string } | null>(null);
  const [hoveredMessageId, setHoveredMessageId] = useState<string | null>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState<string | null>(null);
  const [showMoreMenu, setShowMoreMenu] = useState<string | null>(null);
  const [replyToMessage, setReplyToMessage] = useState<ChatMessage | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Quick reaction emojis
  const quickReactions = ['👍', '❤️', '😊', '🎉', '🔥'];
  
  // All emojis for picker
  const allEmojis = [
    '👍', '❤️', '😊', '🎉', '🔥', '😂', '😍', '🤔', '👏', '🙏',
    '💯', '✨', '🚀', '💪', '👌', '🎯', '💡', '⭐', '🌟', '💖'
  ];

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
  
  // Close emoji picker and more menu when clicking outside
  useEffect(() => {
    const handleClickOutside = () => {
      setShowEmojiPicker(null);
      setShowMoreMenu(null);
    };

    if (showEmojiPicker || showMoreMenu) {
      setTimeout(() => {
        document.addEventListener('mousedown', handleClickOutside);
      }, 0);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showEmojiPicker, showMoreMenu]);

  // Close context menu on escape or scroll
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setContextMenu(null);
    };
    
    if (contextMenu) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [contextMenu]);

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


  // Format timestamp - nur Uhrzeit
  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
  };

  // Format date for day separator
  const formatDateSeparator = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    const isYesterday = date.toDateString() === yesterday.toDateString();
    
    if (isToday) return 'Heute';
    if (isYesterday) return 'Gestern';
    return date.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  // Check if two messages are on different days
  const isDifferentDay = (timestamp1: string, timestamp2: string) => {
    const date1 = new Date(timestamp1);
    const date2 = new Date(timestamp2);
    return date1.toDateString() !== date2.toDateString();
  };

  // Check if message can be edited/deleted (within 5 hours)
  const canEditMessage = (timestamp: string) => {
    const messageTime = new Date(timestamp).getTime();
    const now = new Date().getTime();
    const fiveHoursInMs = 5 * 60 * 60 * 1000;
    return (now - messageTime) < fiveHoursInMs;
  };

  // Handle send message
  const handleSendMessage = () => {
    if (messageInput.trim() && currentChannel) {
      const projectId = currentProject?.id || '';
      let content = messageInput.trim();
      
      // Add reply reference if replying to a message
      if (replyToMessage) {
        content = `@${replyToMessage.sender.name}: "${replyToMessage.content}"\n\n${content}`;
      }
      
      onSendMessage(content, currentChannel.id, projectId);
      setMessageInput('');
      setReplyToMessage(null);
      
      // Reset textarea height
      if (textareaRef.current) {
        textareaRef.current.style.height = '48px';
      }
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

  // Handle reaction
  const handleReaction = (messageId: string, emoji: string) => {
    onReactToMessage(messageId, emoji);
    setHoveredMessageId(null);
    setShowEmojiPicker(null);
  };
  
  // Handle reply to message
  const handleReplyToMessage = (message: ChatMessage) => {
    setReplyToMessage(message);
    setHoveredMessageId(null);
  };
  
  // Handle mark as unread (placeholder)
  const handleMarkAsUnread = (messageId: string) => {
    console.log('Mark as unread:', messageId);
    setShowMoreMenu(null);
    setHoveredMessageId(null);
    // TODO: Implement mark as unread functionality
  };
  
  // Handle star message (placeholder)
  const handleStarMessage = (messageId: string) => {
    console.log('Star message:', messageId);
    setShowMoreMenu(null);
    setHoveredMessageId(null);
    // TODO: Implement star message functionality
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-surface rounded-lg shadow-2xl w-full max-w-5xl h-[80vh] flex flex-col overflow-hidden relative">
        
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border bg-surface/95 backdrop-blur relative z-10">
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
              <div className="absolute left-1/2 -translate-x-1/2 mt-2 w-80 bg-surface border border-border rounded-lg shadow-2xl z-[1000] overflow-hidden">
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
              </div>
              <div className="space-y-1">
                {allUsers
                  .filter(user => user.id !== currentUser.id)
                  .filter(user => user.status === 'Aktiv') // Nur aktive User anzeigen (UserStatus.Active)
                  .filter(user => {
                    // Wenn showAdminsInDMs false ist:
                    // 1. Normale User sehen keine Admins
                    // 2. Admins sehen keine normalen User (damit sie nicht schreiben können)
                    // showAdminsInDMs = true -> Alle sehen alle
                    // showAdminsInDMs = false -> Admins und normale User sind getrennt
                    
                    if (showAdminsInDMs === false) {
                      const currentUserIsAdmin = currentUser.role === 'role-1';
                      const otherUserIsAdmin = user.role === 'role-1';
                      
                      // Wenn currentUser Admin ist und der andere User KEIN Admin -> ausblenden
                      if (currentUserIsAdmin && !otherUserIsAdmin) {
                        return false;
                      }
                      
                      // Wenn currentUser KEIN Admin ist und der andere User Admin -> ausblenden
                      if (!currentUserIsAdmin && otherUserIsAdmin) {
                        return false;
                      }
                    }
                    
                    return true;
                  })
                  .filter(user => !channelSearchQuery || user.name.toLowerCase().includes(channelSearchQuery.toLowerCase()))
                  .sort((a, b) => {
                    // Finde DM-Channels für beide User - muss GENAU diese beiden User enthalten
                    const channelA = directMessages.find(channel => 
                      channel.members.length === 2 &&
                      channel.members.some(m => m.id === a.id) &&
                      channel.members.some(m => m.id === currentUser.id)
                    );
                    const channelB = directMessages.find(channel => 
                      channel.members.length === 2 &&
                      channel.members.some(m => m.id === b.id) &&
                      channel.members.some(m => m.id === currentUser.id)
                    );
                    
                    // Finde neueste Nachricht für jeden User
                    const lastMessageA = channelA 
                      ? messages
                          .filter(msg => msg.channelId === channelA.id)
                          .sort((m1, m2) => new Date(m2.timestamp).getTime() - new Date(m1.timestamp).getTime())[0]
                      : null;
                    const lastMessageB = channelB 
                      ? messages
                          .filter(msg => msg.channelId === channelB.id)
                          .sort((m1, m2) => new Date(m2.timestamp).getTime() - new Date(m1.timestamp).getTime())[0]
                      : null;
                    
                    // Sortiere nach neuester Nachricht
                    if (lastMessageA && lastMessageB) {
                      return new Date(lastMessageB.timestamp).getTime() - new Date(lastMessageA.timestamp).getTime();
                    }
                    if (lastMessageA) return -1;
                    if (lastMessageB) return 1;
                    
                    // Wenn keine Nachrichten, alphabetisch sortieren
                    return a.name.localeCompare(b.name);
                  })
                  .map(user => {
                    // Finde existierenden DM-Channel - muss GENAU diese beiden User enthalten
                    const existingDM = directMessages.find(channel => 
                      channel.members.length === 2 &&
                      channel.members.some(m => m.id === user.id) &&
                      channel.members.some(m => m.id === currentUser.id)
                    );
                    const unreadCount = existingDM ? getUnreadCountForChannel(existingDM.id) : 0;
                    
                    return (
                      <button
                        key={user.id}
                        onClick={() => {
                          // DM-Channel sollte bereits existieren (wird automatisch in App.tsx erstellt)
                          if (existingDM) {
                            onSwitchChannel(existingDM.id);
                            setShowSidebar(false);
                          } else {
                            console.warn(`⚠️ Kein DM-Channel gefunden für User ${user.name}`);
                          }
                        }}
                        className={`w-full flex items-center justify-between p-2 rounded-lg transition-colors ${
                          currentChannel?.id === existingDM?.id ? 'glow-button' : 'hover-glow'
                        }`}
                      >
                        <div className="flex items-center space-x-2 flex-1 min-w-0">
                          <img src={user.avatarUrl} alt={user.name} className="w-5 h-5 rounded-full" />
                          <span className="text-sm truncate">{user.name}</span>
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
              <div className="p-4 border-b border-border bg-surface/80 backdrop-blur-sm">
                <div className="flex items-center space-x-3">
                  {currentChannel.type === ChatChannelType.Direct ? (
                    <>
                      {(() => {
                        const partner = currentChannel.members.find(m => m.id !== currentUser.id);
                        return partner ? (
                          <>
                            <div className="relative">
                              <img src={partner.avatarUrl} alt={partner.name} className="w-10 h-10 rounded-full ring-2 ring-border" />
                              <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full ring-2 ring-surface"></div>
                            </div>
                            <div>
                              <div className="font-semibold text-base text-text-primary">{partner.name}</div>
                              <div className="text-xs text-text-secondary">{partner.role}</div>
                            </div>
                          </>
                        ) : null;
                      })()}
                    </>
                  ) : (
                    <>
                      <div className="w-10 h-10 rounded-full bg-overlay flex items-center justify-center">
                        <HashIcon className="w-5 h-5 text-glow-purple" />
                      </div>
                      <div>
                        <div className="font-semibold text-base text-text-primary">{currentChannel.name}</div>
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
            <div 
              className="flex-1 overflow-y-auto p-4 scrollbar-thin scrollbar-thumb-white/20 scrollbar-track-transparent hover:scrollbar-thumb-white/30"
              onClick={() => setContextMenu(null)}
            >
              {filteredMessages.length === 0 ? (
                <div className="flex items-center justify-center h-full text-text-secondary">
                  <div className="text-center">
                    <p className="text-lg mb-2">Noch keine Nachrichten</p>
                    <p className="text-sm">Starte eine Unterhaltung!</p>
                  </div>
                </div>
              ) : (
                filteredMessages.map((message, index) => {
                  const isOwnMessage = message.sender.id === currentUser.id;
                  const prevMessage = index > 0 ? filteredMessages[index - 1] : null;
                  const showAvatar = !prevMessage || prevMessage.sender.id !== message.sender.id;
                  const showDaySeparator = prevMessage && isDifferentDay(prevMessage.timestamp, message.timestamp);
                  
                  return (
                    <React.Fragment key={message.id}>
                      {/* Day Separator */}
                      {showDaySeparator && (
                        <div className="flex items-center my-4">
                          <div className="flex-1 h-px bg-border"></div>
                          <span className="px-3 text-xs text-text-secondary">{formatDateSeparator(message.timestamp)}</span>
                          <div className="flex-1 h-px bg-border"></div>
                        </div>
                      )}
                      
                      <div 
                        className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'} group mt-1.5`}
                        onContextMenu={(e) => {
                          if (isOwnMessage && canEditMessage(message.timestamp)) {
                            e.preventDefault();
                            setContextMenu({ x: e.clientX, y: e.clientY, messageId: message.id });
                          }
                        }}
                      >
                      {/* Eigene Nachrichten: kein Avatar, kein Username */}
                      {isOwnMessage ? (
                        <div className="flex flex-col items-end max-w-[75%]">
                          {/* Nur Timestamp, kein Name */}
                          {showAvatar && (
                            <div className="flex items-center mb-1 px-1">
                              <span className="text-[10px] text-text-secondary">{formatTimestamp(message.timestamp)}</span>
                            </div>
                          )}

                          {editingMessageId === message.id ? (
                            <div className="w-full">
                              <input
                                type="text"
                                value={editingContent}
                                onChange={(e) => setEditingContent(e.target.value)}
                                onKeyPress={(e) => e.key === 'Enter' && handleEditMessage(message.id)}
                                className="w-full px-4 py-2 bg-overlay rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-glow-purple"
                                autoFocus
                              />
                              <div className="flex space-x-2 mt-2">
                                <button
                                  onClick={() => handleEditMessage(message.id)}
                                  className="px-3 py-1 bg-glow-purple rounded-lg text-xs"
                                >
                                  Speichern
                                </button>
                                <button
                                  onClick={() => {
                                    setEditingMessageId(null);
                                    setEditingContent('');
                                  }}
                                  className="px-3 py-1 bg-overlay rounded-lg text-xs"
                                >
                                  Abbrechen
                                </button>
                              </div>
                            </div>
                          ) : (
                            <>
                              {/* Message Content Bubble */}
                              <div
                                className="px-4 py-2.5 rounded-2xl text-sm break-words bg-transparent text-text-primary rounded-br-md border border-transparent whitespace-pre-wrap"
                                style={{
                                  background: 'linear-gradient(#141414, #141414) padding-box, linear-gradient(135deg, rgba(168, 85, 247, 0.3), rgba(236, 72, 153, 0.3), rgba(168, 85, 247, 0.3)) border-box',
                                  border: '1px solid transparent'
                                }}
                              >
                                {message.content}
                                {message.edited && (
                                  <span className="text-xs ml-2 italic text-text-secondary">
                                    (bearbeitet)
                                  </span>
                                )}
                              </div>

                              {/* Link Preview */}
                              {message.content.match(/https?:\/\/[^\s]+/) && (
                                <div className="mt-2">
                                  <LinkPreview url={message.content.match(/https?:\/\/[^\s]+/)?.[0] || ''} />
                                </div>
                              )}
                            </>
                          )}
                        </div>
                      ) : (
                        /* Fremde Nachrichten: Avatar links oben bündig mit Bubble */
                        <div className="flex flex-row items-start space-x-2 max-w-[75%] relative">
                          {/* Avatar - nur in Channels, nicht in DMs */}
                          {currentChannel?.type !== ChatChannelType.Direct && (
                            <div className="flex-shrink-0 w-7">
                              {showAvatar ? (
                                <img
                                  src={message.sender.avatarUrl}
                                  alt={message.sender.name}
                                  className="w-7 h-7 rounded-full"
                                />
                              ) : (
                                <div className="w-7 h-7" />
                              )}
                            </div>
                          )}

                          {/* Message Content */}
                          <div className="flex flex-col items-start">
                            {/* Name & Timestamp & Projekt-Tag */}
                            {showAvatar && (
                              <div className="flex items-center space-x-2 mb-1 px-1">
                                {/* Name nur in Channels */}
                                {currentChannel?.type !== ChatChannelType.Direct && (
                                  <span className="font-semibold text-xs text-text-primary">{message.sender.name}</span>
                                )}
                                <span className="text-[10px] text-text-secondary">{formatTimestamp(message.timestamp)}</span>
                                {/* Projekt-Tag */}
                                {message.projectId && (
                                  <button
                                    onClick={() => onSwitchProject(message.projectId)}
                                    className="text-[10px] px-1.5 py-0.5 rounded bg-overlay/50 text-text-secondary hover:bg-overlay hover:text-text-primary transition-colors"
                                    title="Zu diesem Projekt wechseln"
                                  >
                                    {projects.find(p => p.id === message.projectId)?.name || 'Projekt'}
                                  </button>
                                )}
                              </div>
                            )}

                            {editingMessageId === message.id ? (
                              <div className="w-full">
                                <input
                                  type="text"
                                  value={editingContent}
                                  onChange={(e) => setEditingContent(e.target.value)}
                                  onKeyPress={(e) => e.key === 'Enter' && handleEditMessage(message.id)}
                                  className="w-full px-4 py-2 bg-overlay rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-glow-purple"
                                  autoFocus
                                />
                                <div className="flex space-x-2 mt-2">
                                  <button
                                    onClick={() => handleEditMessage(message.id)}
                                    className="px-3 py-1 bg-glow-purple rounded-lg text-xs"
                                  >
                                    Speichern
                                  </button>
                                  <button
                                    onClick={() => {
                                      setEditingMessageId(null);
                                      setEditingContent('');
                                    }}
                                    className="px-3 py-1 bg-overlay rounded-lg text-xs"
                                  >
                                    Abbrechen
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <>
                                {/* Wrapper für Bubble und Emoji-Bar */}
                                <div 
                                  className="relative"
                                  onMouseEnter={() => setHoveredMessageId(message.id)}
                                  onMouseLeave={() => setHoveredMessageId(null)}
                                >
                                  {/* Message Content Bubble */}
                                  <div className="px-4 py-2.5 rounded-2xl text-sm break-words bg-overlay text-text-primary rounded-bl-md whitespace-pre-wrap">
                                    {message.content}
                                    {message.edited && (
                                      <span className="text-xs ml-2 italic text-text-secondary">
                                        (bearbeitet)
                                      </span>
                                    )}
                                  </div>
                                  
                                  {/* Emoji Reaction Bar - rechts unten an der Bubble (Overlay) */}
                                  {hoveredMessageId === message.id && !isOwnMessage && (
                                    <div className="absolute -bottom-8 left-0 flex items-center bg-surface border border-border rounded-lg shadow-lg z-[5] overflow-hidden">
                                      {/* Quick Reactions */}
                                      <div className="flex items-center space-x-1 px-2 py-1 border-r border-border">
                                        {quickReactions.map((emoji) => (
                                          <button
                                            key={emoji}
                                            onClick={() => handleReaction(message.id, emoji)}
                                            className="text-lg hover:scale-125 transition-transform"
                                            title={`Mit ${emoji} reagieren`}
                                          >
                                            {emoji}
                                          </button>
                                        ))}
                                      </div>
                                      
                                      {/* Action Buttons */}
                                      <div className="flex items-center space-x-1 px-2 py-1 relative">
                                        {/* Emoji Picker Button */}
                                        <div className="relative">
                                          <button
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              console.log('Emoji Picker clicked, current:', showEmojiPicker, 'message:', message.id);
                                              setShowEmojiPicker(showEmojiPicker === message.id ? null : message.id);
                                            }}
                                            className="p-1 hover:bg-overlay rounded transition-colors"
                                            title="Weitere Reaktionen"
                                          >
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                            </svg>
                                          </button>
                                          
                                          {/* Emoji Picker Dropdown */}
                                          {showEmojiPicker === message.id && (
                                            <div className="absolute top-full right-0 mt-2 bg-surface border border-border rounded-lg shadow-2xl p-3 z-[1000] w-64">
                                              <div className="text-xs text-text-secondary mb-2 font-semibold">Reaktion auswählen</div>
                                              <div className="grid grid-cols-5 gap-2">
                                                {allEmojis.map((emoji) => (
                                                  <button
                                                    key={emoji}
                                                    onClick={(e) => {
                                                      e.stopPropagation();
                                                      handleReaction(message.id, emoji);
                                                    }}
                                                    className="text-2xl hover:bg-overlay rounded p-2 transition-all hover:scale-110"
                                                    title={`Mit ${emoji} reagieren`}
                                                  >
                                                    {emoji}
                                                  </button>
                                                ))}
                                              </div>
                                            </div>
                                          )}
                                        </div>
                                        
                                        {/* Reply Button */}
                                        <button
                                          onClick={() => handleReplyToMessage(message)}
                                          className="p-1 hover:bg-overlay rounded transition-colors"
                                          title="Antworten"
                                        >
                                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                                          </svg>
                                        </button>
                                        
                                        {/* More Options (3 dots) */}
                                        <div className="relative">
                                          <button
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              console.log('More Menu clicked, current:', showMoreMenu, 'message:', message.id);
                                              setShowMoreMenu(showMoreMenu === message.id ? null : message.id);
                                            }}
                                            className="p-1 hover:bg-overlay rounded transition-colors"
                                            title="Mehr Optionen"
                                          >
                                            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                                              <path d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                                            </svg>
                                          </button>
                                          
                                          {/* More Options Menu */}
                                          {showMoreMenu === message.id && (
                                            <div className="absolute top-full right-0 mt-2 bg-surface border border-border rounded-lg shadow-2xl py-1 z-[1000] min-w-[220px]">
                                              <button
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  handleMarkAsUnread(message.id);
                                                }}
                                                className="w-full px-4 py-2.5 text-left text-sm hover:bg-overlay transition-colors flex items-center space-x-3"
                                              >
                                                <svg className="w-4 h-4 text-text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                                </svg>
                                                <span className="text-text-primary">Als ungelesen markieren</span>
                                              </button>
                                              <button
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  handleStarMessage(message.id);
                                                }}
                                                className="w-full px-4 py-2.5 text-left text-sm hover:bg-overlay transition-colors flex items-center space-x-3"
                                              >
                                                <svg className="w-4 h-4 text-text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                                                </svg>
                                                <span className="text-text-primary">Markieren</span>
                                              </button>
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                  )}
                                </div>

                                {/* Link Preview */}
                                {message.content.match(/https?:\/\/[^\s]+/) && (
                                  <div className="mt-2">
                                    <LinkPreview url={message.content.match(/https?:\/\/[^\s]+/)?.[0] || ''} />
                                  </div>
                                )}

                                {/* Reactions Display */}
                                {message.reactions && Object.keys(message.reactions).length > 0 && (
                                  <div className="flex flex-wrap gap-1 mt-1">
                                    {Object.entries(message.reactions).map(([emoji, userIds]) => (
                                      <button
                                        key={emoji}
                                        onClick={() => handleReaction(message.id, emoji)}
                                        className="flex items-center space-x-1 px-2 py-0.5 rounded-full bg-overlay/50 hover:bg-overlay text-xs transition-colors"
                                      >
                                        <span>{emoji}</span>
                                        <span className="text-text-secondary">{(userIds as string[]).length}</span>
                                      </button>
                                    ))}
                                  </div>
                                )}
                              </>
                            )}
                          </div>
                        </div>
                      )}
                      </div>
                    </React.Fragment>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Message Input */}
            {currentChannel && (
              <div className="p-4 border-t border-border bg-surface/50">
                {/* Reply To Message Preview */}
                {replyToMessage && (
                  <div className="mb-2 p-2 bg-overlay rounded-lg flex items-center justify-between">
                    <div className="flex items-center space-x-2 text-sm">
                      <svg className="w-4 h-4 text-text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                      </svg>
                      <span className="text-text-secondary">Antwort auf {replyToMessage.sender.name}:</span>
                      <span className="text-text-primary truncate max-w-md">{replyToMessage.content}</span>
                    </div>
                    <button
                      onClick={() => setReplyToMessage(null)}
                      className="p-1 hover:bg-surface rounded transition-colors"
                    >
                      <XIcon className="w-4 h-4 text-text-secondary" />
                    </button>
                  </div>
                )}
                
                <div className="flex items-end space-x-3">
                  <div className="flex-1 relative">
                    <textarea
                      ref={textareaRef}
                      value={messageInput}
                      onChange={(e) => {
                        setMessageInput(e.target.value);
                        // Dynamische Höhenanpassung
                        const target = e.target as HTMLTextAreaElement;
                        target.style.height = '48px';
                        target.style.height = Math.min(target.scrollHeight, 200) + 'px';
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handleSendMessage();
                        }
                      }}
                      placeholder={`Nachricht an ${currentChannel.type === ChatChannelType.Direct ? getDMPartnerName(currentChannel) : `#${currentChannel.name}`}...`}
                      className="w-full px-4 py-3 bg-overlay rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all resize-none overflow-y-auto"
                      rows={1}
                      style={{
                        minHeight: '48px',
                        maxHeight: '200px',
                      }}
                    />
                  </div>
                  <button
                    onClick={handleSendMessage}
                    disabled={!messageInput.trim()}
                    className="p-3 rounded-full transition-all relative overflow-hidden self-end mb-1"
                    style={{
                      background: messageInput.trim() 
                        ? 'linear-gradient(135deg, #A855F7, #EC4899, #A855F7)'
                        : 'var(--color-overlay)'
                    }}
                  >
                    {messageInput.trim() ? (
                      <SendIcon className="w-5 h-5 text-white" />
                    ) : (
                      <MicIcon className="w-5 h-5 text-text-secondary" />
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Context Menu */}
      {contextMenu && (
        <div
          className="fixed bg-surface border border-border rounded-lg shadow-2xl py-1 z-[70] min-w-[160px]"
          style={{ left: contextMenu.x, top: contextMenu.y }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={() => {
              const message = messages.find(m => m.id === contextMenu.messageId);
              if (message) {
                setEditingMessageId(message.id);
                setEditingContent(message.content);
              }
              setContextMenu(null);
            }}
            className="w-full flex items-center space-x-3 px-4 py-2 hover:bg-overlay transition-colors text-left"
          >
            <EditIcon className="w-4 h-4 text-text-secondary" />
            <span className="text-sm text-text-primary">Bearbeiten</span>
          </button>
          <button
            onClick={() => {
              setDeleteConfirmMessageId(contextMenu.messageId);
              setContextMenu(null);
            }}
            className="w-full flex items-center space-x-3 px-4 py-2 hover:bg-overlay transition-colors text-left"
          >
            <TrashIcon className="w-4 h-4 text-red-500" />
            <span className="text-sm text-red-500">Löschen</span>
          </button>
        </div>
      )}

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
