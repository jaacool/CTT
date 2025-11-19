import React, { useState, useRef, useEffect } from 'react';
import { ChatChannel, ChatMessage, ChatViewMode, Project, User, ChatChannelType } from '../types';
import { XIcon, SendIcon, HashIcon, FolderIcon, ChevronDownIcon, MessageCircleIcon } from './Icons';

interface ChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  channels: ChatChannel[];
  messages: ChatMessage[];
  projects: Project[];
  currentUser: User;
  currentProject: Project | null;
  currentChannel: ChatChannel | null;
  onSendMessage: (content: string, channelId: string, projectId: string) => void;
  onCreateChannel: (name: string, description: string, memberIds: string[]) => void;
  onSwitchChannel: (channelId: string) => void;
  onSwitchProject: (projectId: string) => void;
  allUsers: User[];
}

export const ChatModal: React.FC<ChatModalProps> = ({
  isOpen,
  onClose,
  channels,
  messages,
  projects,
  currentUser,
  currentProject,
  currentChannel,
  onSendMessage,
  onCreateChannel,
  onSwitchChannel,
  onSwitchProject,
  allUsers,
}) => {
  const [viewMode, setViewMode] = useState<ChatViewMode>(ChatViewMode.ByProject);
  const [messageInput, setMessageInput] = useState('');
  const [suggestedChannel, setSuggestedChannel] = useState<ChatChannel | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [showChannelDropdown, setShowChannelDropdown] = useState(false);
  const [showProjectDropdown, setShowProjectDropdown] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Get channels user has access to (calculate early for useEffect)
  const accessibleChannels = channels.filter(channel =>
    channel.members.some(member => member.id === currentUser.id)
  );

  // Separate Direct Messages and Group Channels
  const directMessages = accessibleChannels.filter(c => c.type === ChatChannelType.Direct);
  const groupChannels = accessibleChannels.filter(c => c.type === ChatChannelType.Group);

  // Filter channels by search query
  const filteredGroupChannels = groupChannels.filter(channel => {
    if (!searchQuery) return true;
    return channel.name.toLowerCase().includes(searchQuery.toLowerCase());
  });

  const filteredDirectMessages = directMessages.filter(channel => {
    if (!searchQuery) return true;
    const partner = channel.members.find(m => m.id !== currentUser.id);
    return partner?.name.toLowerCase().includes(searchQuery.toLowerCase());
  });

  // Auto-select channel based on current project
  useEffect(() => {
    if (currentProject && viewMode === ChatViewMode.ByProject && accessibleChannels.length > 0) {
      // Versuche den letzten verwendeten Channel für dieses Projekt zu laden
      const lastUsedChannelId = localStorage.getItem(`lastChannel_${currentProject.id}`);
      if (lastUsedChannelId) {
        const channel = channels.find(c => c.id === lastUsedChannelId);
        if (channel && channel.id !== currentChannel?.id) {
          // Automatisch zu diesem Channel wechseln
          onSwitchChannel(lastUsedChannelId);
          setSuggestedChannel(channel);
          return;
        }
      }
      
      // Falls kein gespeicherter Channel: Wähle den ersten verfügbaren Gruppenchannel
      if (!currentChannel) {
        const firstGroupChannel = accessibleChannels.find(c => c.type === ChatChannelType.Group);
        if (firstGroupChannel) {
          onSwitchChannel(firstGroupChannel.id);
          setSuggestedChannel(firstGroupChannel);
        } else if (accessibleChannels.length > 0) {
          // Falls keine Gruppenchannels: Nimm irgendeinen Channel
          onSwitchChannel(accessibleChannels[0].id);
          setSuggestedChannel(accessibleChannels[0]);
        }
      }
    }
  }, [currentProject, viewMode, channels, accessibleChannels.length]);

  if (!isOpen) return null;

  // Filter messages based on view mode
  const filteredMessages = messages.filter(msg => {
    if (viewMode === ChatViewMode.ByProject) {
      return msg.projectId === currentProject?.id && msg.channelId === currentChannel?.id;
    } else {
      return msg.channelId === currentChannel?.id;
    }
  });

  // Get DM partner name for Direct channels
  const getDMPartnerName = (channel: ChatChannel) => {
    if (channel.type !== ChatChannelType.Direct) return channel.name;
    const partner = channel.members.find(m => m.id !== currentUser.id);
    return partner?.name || 'Unbekannt';
  };

  const handleSendMessage = () => {
    if (messageInput.trim() && currentChannel) {
      // Projekt-ID ist optional (null = ohne Projekt)
      const projectId = currentProject?.id || '';
      onSendMessage(messageInput.trim(), currentChannel.id, projectId);
      setMessageInput('');
      
      // Save last used channel for this project (wenn Projekt gesetzt)
      if (currentProject) {
        localStorage.setItem(`lastChannel_${currentProject.id}`, currentChannel.id);
      }
    }
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'Gerade eben';
    if (diffMins < 60) return `vor ${diffMins}m`;
    if (diffMins < 1440) return `vor ${Math.floor(diffMins / 60)}h`;
    
    return date.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-background rounded-2xl shadow-2xl w-full max-w-5xl h-[80vh] flex flex-col border border-border">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div className="flex items-center space-x-4">
            <h2 className="text-xl font-bold text-text-primary">Chat</h2>
            
            {/* View Mode Toggle */}
            <div className="flex space-x-1 bg-overlay rounded-lg p-1">
              <button
                onClick={() => setViewMode(ChatViewMode.ByProject)}
                className={`px-3 py-1 rounded text-xs font-semibold transition-colors ${
                  viewMode === ChatViewMode.ByProject
                    ? 'glow-button text-text-primary'
                    : 'text-text-secondary hover:text-text-primary'
                }`}
              >
                Nach Projekt
              </button>
              <button
                onClick={() => setViewMode(ChatViewMode.ByChannel)}
                className={`px-3 py-1 rounded text-xs font-semibold transition-colors ${
                  viewMode === ChatViewMode.ByChannel
                    ? 'glow-button text-text-primary'
                    : 'text-text-secondary hover:text-text-primary'
                }`}
              >
                Nach Channel
              </button>
            </div>
          </div>
          
          <button onClick={onClose} className="text-text-secondary hover:text-text-primary">
            <XIcon className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="flex flex-1 overflow-hidden">
          {/* Sidebar */}
          <div className="w-64 border-r border-border bg-surface p-4 overflow-y-auto">
            {viewMode === ChatViewMode.ByProject ? (
              <>
                {/* Search */}
                <div className="mb-4">
                  <input
                    type="text"
                    placeholder="Channels durchsuchen..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full px-3 py-2 bg-overlay rounded-lg text-text-primary text-sm placeholder-text-secondary focus:outline-none focus:ring-2 focus:ring-glow-purple"
                  />
                </div>

                {/* Project Selector */}
                <div className="mb-4">
                  <div className="text-xs text-text-secondary mb-2">Projekt (optional)</div>
                  <div className="relative">
                    <button
                      onClick={() => setShowProjectDropdown(!showProjectDropdown)}
                      className="w-full flex items-center justify-between bg-overlay p-2 rounded-lg hover-glow"
                    >
                      <div className="flex items-center space-x-2">
                        <FolderIcon className="w-4 h-4 text-text-secondary" />
                        <span className="text-text-primary text-sm truncate">
                          {currentProject?.name || 'Ohne Projekt'}
                        </span>
                      </div>
                      <ChevronDownIcon className="w-4 h-4 text-text-secondary" />
                    </button>
                    
                    {showProjectDropdown && (
                      <div className="absolute top-full left-0 right-0 mt-1 bg-overlay rounded-lg shadow-lg border border-border max-h-48 overflow-y-auto z-10">
                        <button
                          onClick={() => {
                            onSwitchProject('');
                            setShowProjectDropdown(false);
                          }}
                          className="w-full flex items-center space-x-2 p-2 hover:bg-surface text-left border-b border-border"
                        >
                          <span className="text-text-secondary text-sm italic">Ohne Projekt</span>
                        </button>
                        {projects.map(project => (
                          <button
                            key={project.id}
                            onClick={() => {
                              onSwitchProject(project.id);
                              setShowProjectDropdown(false);
                            }}
                            className="w-full flex items-center space-x-2 p-2 hover:bg-surface text-left"
                          >
                            <FolderIcon className="w-4 h-4 text-text-secondary" />
                            <span className="text-text-primary text-sm truncate">{project.name}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Group Channels Section */}
                <div className="mb-4">
                  <div className="text-xs text-text-secondary mb-2 font-semibold">
                    Channels {searchQuery && `(${filteredGroupChannels.length})`}
                  </div>
                  <div className="space-y-1">
                    {filteredGroupChannels.length === 0 ? (
                      <div className="text-text-secondary text-xs italic p-2">
                        {searchQuery ? 'Keine Channels gefunden' : 'Keine Channels vorhanden'}
                      </div>
                    ) : (
                      filteredGroupChannels.map(channel => (
                        <button
                          key={channel.id}
                          onClick={() => onSwitchChannel(channel.id)}
                          className={`w-full flex items-center space-x-2 p-2 rounded-lg text-left transition-colors ${
                            currentChannel?.id === channel.id
                              ? 'glow-button text-text-primary'
                              : 'hover-glow text-text-secondary'
                          }`}
                        >
                          <HashIcon className="w-4 h-4" />
                          <span className="text-sm truncate">{channel.name}</span>
                        </button>
                      ))
                    )}
                  </div>
                </div>

                {/* Direct Messages Section */}
                <div>
                  <div className="text-xs text-text-secondary mb-2 font-semibold">
                    Direktnachrichten {searchQuery && `(${filteredDirectMessages.length})`}
                  </div>
                  <div className="space-y-1">
                    {filteredDirectMessages.length === 0 ? (
                      <div className="text-text-secondary text-xs italic p-2">
                        {searchQuery ? 'Keine DMs gefunden' : 'Keine DMs vorhanden'}
                      </div>
                    ) : (
                      filteredDirectMessages.map(channel => {
                        const partner = channel.members.find(m => m.id !== currentUser.id);
                        return (
                          <button
                            key={channel.id}
                            onClick={() => onSwitchChannel(channel.id)}
                            className={`w-full flex items-center space-x-2 p-2 rounded-lg text-left transition-colors ${
                              currentChannel?.id === channel.id
                                ? 'glow-button text-text-primary'
                                : 'hover-glow text-text-secondary'
                            }`}
                          >
                            {partner && (
                              <img
                                src={partner.avatarUrl}
                                alt={partner.name}
                                className="w-5 h-5 rounded-full"
                              />
                            )}
                            <span className="text-sm truncate">{getDMPartnerName(channel)}</span>
                          </button>
                        );
                      })
                    )}
                  </div>
                </div>
              </>
            ) : (
              <>
                {/* Search */}
                <div className="mb-4">
                  <input
                    type="text"
                    placeholder="Channels durchsuchen..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full px-3 py-2 bg-overlay rounded-lg text-text-primary text-sm placeholder-text-secondary focus:outline-none focus:ring-2 focus:ring-glow-purple"
                  />
                </div>

                {/* Group Channels Section */}
                <div className="mb-4">
                  <div className="text-xs text-text-secondary mb-2 font-semibold">
                    Channels {searchQuery && `(${filteredGroupChannels.length})`}
                  </div>
                  <div className="space-y-1">
                    {filteredGroupChannels.length === 0 ? (
                      <div className="text-text-secondary text-xs italic p-2">
                        {searchQuery ? 'Keine Channels gefunden' : 'Keine Channels vorhanden'}
                      </div>
                    ) : (
                      filteredGroupChannels.map(channel => (
                        <button
                          key={channel.id}
                          onClick={() => onSwitchChannel(channel.id)}
                          className={`w-full flex items-center space-x-2 p-2 rounded-lg text-left transition-colors ${
                            currentChannel?.id === channel.id
                              ? 'glow-button text-text-primary'
                              : 'hover-glow text-text-secondary'
                          }`}
                        >
                          <HashIcon className="w-4 h-4" />
                          <span className="text-sm truncate">{channel.name}</span>
                        </button>
                      ))
                    )}
                  </div>
                </div>

                {/* Direct Messages Section */}
                <div>
                  <div className="text-xs text-text-secondary mb-2 font-semibold">
                    Direktnachrichten {searchQuery && `(${filteredDirectMessages.length})`}
                  </div>
                  <div className="space-y-1">
                    {filteredDirectMessages.length === 0 ? (
                      <div className="text-text-secondary text-xs italic p-2">
                        {searchQuery ? 'Keine DMs gefunden' : 'Keine DMs vorhanden'}
                      </div>
                    ) : (
                      filteredDirectMessages.map(channel => {
                        const partner = channel.members.find(m => m.id !== currentUser.id);
                        return (
                          <button
                            key={channel.id}
                            onClick={() => onSwitchChannel(channel.id)}
                            className={`w-full flex items-center space-x-2 p-2 rounded-lg text-left transition-colors ${
                              currentChannel?.id === channel.id
                                ? 'glow-button text-text-primary'
                                : 'hover-glow text-text-secondary'
                            }`}
                          >
                            {partner && (
                              <img
                                src={partner.avatarUrl}
                                alt={partner.name}
                                className="w-5 h-5 rounded-full"
                              />
                            )}
                            <span className="text-sm truncate">{getDMPartnerName(channel)}</span>
                          </button>
                        );
                      })
                    )}
                  </div>
                </div>

                {/* Projects List */}
                <div>
                  <div className="text-xs text-text-secondary mb-2">Projekte</div>
                  <div className="space-y-1">
                    {projects.map(project => (
                      <button
                        key={project.id}
                        onClick={() => onSwitchProject(project.id)}
                        className={`w-full flex items-center space-x-2 p-2 rounded-lg text-left transition-colors ${
                          currentProject?.id === project.id
                            ? 'glow-button text-text-primary'
                            : 'hover-glow text-text-secondary'
                        }`}
                      >
                        <FolderIcon className="w-4 h-4" />
                        <span className="text-sm truncate">{project.name}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Messages Area */}
          <div className="flex-1 flex flex-col">
            {/* Messages Header */}
            <div className="p-4 border-b border-border">
              <div className="flex items-center space-x-2">
                {viewMode === ChatViewMode.ByProject ? (
                  <>
                    {currentChannel?.type === ChatChannelType.Direct ? (
                      <>
                        <MessageCircleIcon className="w-5 h-5 text-text-secondary" />
                        <span className="font-semibold text-text-primary">{getDMPartnerName(currentChannel)}</span>
                        <span className="text-text-secondary text-sm">in {currentProject?.name}</span>
                      </>
                    ) : (
                      <>
                        <HashIcon className="w-5 h-5 text-text-secondary" />
                        <span className="font-semibold text-text-primary">{currentChannel?.name}</span>
                        <span className="text-text-secondary text-sm">in {currentProject?.name}</span>
                      </>
                    )}
                  </>
                ) : (
                  <>
                    <FolderIcon className="w-5 h-5 text-text-secondary" />
                    <span className="font-semibold text-text-primary">{currentProject?.name}</span>
                    {currentChannel?.type === ChatChannelType.Direct ? (
                      <span className="text-text-secondary text-sm">mit {getDMPartnerName(currentChannel)}</span>
                    ) : (
                      <span className="text-text-secondary text-sm">in #{currentChannel?.name}</span>
                    )}
                  </>
                )}
              </div>
              {currentChannel?.description && currentChannel.type !== ChatChannelType.Direct && (
                <p className="text-text-secondary text-xs mt-1">{currentChannel.description}</p>
              )}
            </div>

            {/* Messages List */}
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
                  <div key={message.id} className="flex space-x-3">
                    <img
                      src={message.sender.avatarUrl}
                      alt={message.sender.name}
                      className="w-10 h-10 rounded-full"
                    />
                    <div className="flex-1">
                      <div className="flex items-baseline space-x-2">
                        <span className="font-semibold text-text-primary">{message.sender.name}</span>
                        <span className="text-xs text-text-secondary">{formatTimestamp(message.timestamp)}</span>
                        {viewMode === ChatViewMode.ByChannel && (
                          <span className="text-xs px-2 py-0.5 rounded bg-overlay text-text-secondary">
                            {projects.find(p => p.id === message.projectId)?.name}
                          </span>
                        )}
                      </div>
                      <p className="text-text-primary mt-1">{message.content}</p>
                    </div>
                  </div>
                ))
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Message Input */}
            <div className="p-4 border-t border-border">
              {suggestedChannel && currentChannel?.id !== suggestedChannel.id && viewMode === ChatViewMode.ByProject && (
                <div className="mb-2 text-xs text-text-secondary">
                  Vorgeschlagener Channel: 
                  <button
                    onClick={() => onSwitchChannel(suggestedChannel.id)}
                    className="ml-1 text-glow-purple hover:underline"
                  >
                    #{suggestedChannel.name}
                  </button>
                </div>
              )}
              <div className="flex space-x-2">
                <input
                  type="text"
                  value={messageInput}
                  onChange={(e) => setMessageInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage();
                    }
                  }}
                  placeholder={`Nachricht in #${currentChannel?.name || '...'}`}
                  className="flex-1 bg-overlay text-text-primary border border-border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-glow-purple"
                  disabled={!currentChannel || !currentProject}
                />
                <button
                  onClick={handleSendMessage}
                  disabled={!messageInput.trim() || !currentChannel || !currentProject}
                  className="glow-button p-2 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <SendIcon className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
