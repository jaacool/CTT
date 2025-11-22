import React, { useState, useRef, useEffect, useLayoutEffect } from 'react';
import { ChatChannel, ChatMessage, Project, User, ChatChannelType, ChatAttachment } from '../types';
import { XIcon, SendIcon, HashIcon, FolderIcon, ChevronDownIcon, EditIcon, TrashIcon, MicIcon } from './Icons';
import { LinkPreview } from './LinkPreview';
import { ConfirmModal } from './ConfirmModal';
import { uploadChatFiles, getFileIcon, isImageFile, isVideoFile, isAudioFile } from '../utils/fileUpload';
import { supabase } from '../utils/supabaseClient';

interface ChatModalV2Props {
  isOpen: boolean;
  onClose: () => void;
  channels: ChatChannel[];
  messages: ChatMessage[];
  projects: Project[];
  currentUser: User;
  currentProject: Project | null;
  currentChannel: ChatChannel | null;
  onSendMessage: (content: string, channelId: string, projectId: string, attachments?: ChatAttachment[], messageId?: string) => void;
  onEditMessage: (messageId: string, newContent: string) => void;
  onUpdateMessageAttachments: (messageId: string, attachments: ChatAttachment[]) => void;
  onDeleteMessage: (messageId: string) => void;
  onCreateChannel: (name: string, description: string, memberIds: string[], isPrivate: boolean) => void;
  onSwitchChannel: (channelId: string) => void;
  onSwitchProject: (projectId: string) => void;
  onReactToMessage: (messageId: string, emoji: string) => void;
  allUsers: User[];
  showAdminsInDMs?: boolean;
  maxUploadSize?: number; // MB
  onMaxUploadSizeChange?: (size: number) => void;
  onDeleteAllMessages?: () => void;
}

// Custom Audio Player Component
const AudioPlayer: React.FC<{ url: string; name: string; hasText: boolean }> = ({ url, name, hasText }) => {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  const togglePlay = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration);
    }
  };

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    if (audioRef.current) {
      const rect = e.currentTarget.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const percentage = x / rect.width;
      audioRef.current.currentTime = percentage * duration;
    }
  };

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = url;
    link.download = name;
    link.click();
  };

  return (
    <div className={`flex flex-col space-y-2 p-3 bg-overlay rounded-lg w-full overflow-visible ${
      hasText ? 'max-w-sm' : 'max-w-[384px]'
    }`}>
      <audio
        ref={audioRef}
        src={url}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={() => setIsPlaying(false)}
      />
      <div className="flex items-center space-x-3">
        {/* Play/Pause Button */}
        <button
          onClick={togglePlay}
          className="flex-shrink-0 w-10 h-10 flex items-center justify-center bg-transparent hover:bg-glow-purple/20 rounded-full transition-colors"
        >
          {isPlaying ? (
            <svg className="w-6 h-6 text-glow-purple" fill="currentColor" viewBox="0 0 24 24">
              <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z"/>
            </svg>
          ) : (
            <svg className="w-6 h-6 text-glow-purple ml-0.5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z"/>
            </svg>
          )}
        </button>

        {/* Timeline */}
        <div
          className="flex-1 h-1 bg-surface/50 rounded-full cursor-pointer relative"
          onClick={handleSeek}
        >
          <div
            className="h-full bg-glow-purple rounded-full"
            style={{ width: `${(currentTime / duration) * 100}%` }}
          />
          {/* Playhead - Vertical Line */}
          <div
            className="absolute pointer-events-none"
            style={{ 
              left: `${(currentTime / duration) * 100}%`, 
              top: '-4px',
              bottom: '-4px',
              transform: 'translateX(-50%)'
            }}
          >
            <div className="w-0.5 h-full bg-white"></div>
          </div>
        </div>

        {/* Current Time */}
        <div className="flex-shrink-0 text-xs text-text-secondary font-mono">
          {formatTime(currentTime)}
        </div>

        {/* Download Button */}
        <button
          onClick={handleDownload}
          className="flex-shrink-0 w-8 h-8 flex items-center justify-center hover:bg-transparent rounded-full transition-colors"
          title="Herunterladen"
        >
          <svg className="w-5 h-5 text-text-secondary hover:text-glow-purple transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
        </button>
      </div>

      {/* Filename */}
      <div className="text-xs text-text-secondary truncate">
        {name}
      </div>
    </div>
  );
};

// Voice Message Player Component - Compact Waveform Design
const VoiceMessagePlayer: React.FC<{ url: string; hasText: boolean }> = ({ url, hasText }) => {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1);

  const togglePlay = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration);
    }
  };

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    if (audioRef.current) {
      const rect = e.currentTarget.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const percentage = x / rect.width;
      audioRef.current.currentTime = percentage * duration;
    }
  };

  const togglePlaybackRate = () => {
    const rates = [1, 1.5, 2];
    const currentIndex = rates.indexOf(playbackRate);
    const nextRate = rates[(currentIndex + 1) % rates.length];
    setPlaybackRate(nextRate);
    if (audioRef.current) {
      audioRef.current.playbackRate = nextRate;
    }
  };

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  // Generate fake waveform bars ONCE - useMemo verhindert Re-Rendering
  const waveformBars = React.useMemo(() => {
    return Array.from({ length: 40 }, (_, i) => {
      // Create a more natural waveform pattern
      const position = i / 40;
      const baseHeight = 0.3 + Math.sin(position * Math.PI * 4) * 0.3;
      const noise = Math.random() * 0.4;
      return Math.min(1, baseHeight + noise);
    });
  }, []); // Leeres Array = nur einmal beim Mount generieren

  return (
    <div className={`flex items-center space-x-3 p-3 bg-overlay rounded-lg ${
      hasText ? 'max-w-[360px]' : 'max-w-[400px]'
    }`}>
      <audio
        ref={audioRef}
        src={url}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={() => setIsPlaying(false)}
      />
      
      {/* Play/Pause Button */}
      <button
        onClick={togglePlay}
        className="flex-shrink-0 w-8 h-8 flex items-center justify-center bg-transparent hover:bg-glow-purple/20 rounded-full transition-colors"
      >
        {isPlaying ? (
          <svg className="w-5 h-5 text-glow-purple" fill="currentColor" viewBox="0 0 24 24">
            <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z"/>
          </svg>
        ) : (
          <svg className="w-5 h-5 text-glow-purple ml-0.5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M8 5v14l11-7z"/>
          </svg>
        )}
      </button>

      {/* Waveform Container */}
      <div className="flex-1 flex items-center space-x-3">
        {/* WRAPPER für Waveform + Playhead - WICHTIG: relative position */}
        <div 
          className="flex-1 relative cursor-pointer"
          style={{ height: '32px' }}
          onClick={handleSeek}
        >
          {/* Statische lila Waveform - Balken nebeneinander */}
          <div className="flex items-center gap-[2px] h-full">
            {waveformBars.map((level, index) => {
              const amplifiedLevel = Math.min(1, level * 2);
              const height = Math.max(3, amplifiedLevel * 32);
              
              return (
                <div
                  key={index}
                  className="rounded-full flex-shrink-0"
                  style={{
                    height: `${height}px`,
                    backgroundColor: '#A855F7',
                    opacity: 0.6,
                    width: '3px',
                  }}
                />
              );
            })}
          </div>
          
          {/* Weißer Playhead - SEPARATER Layer, bewegt sich ÜBER die Waveform */}
          {duration > 0 && (
            <div
              className="absolute top-0 bottom-0 w-[2px] rounded-full pointer-events-none"
              style={{ 
                left: `${(currentTime / duration) * 100}%`,
                backgroundColor: '#FFFFFF',
                boxShadow: '0 0 8px rgba(255, 255, 255, 0.9)',
                zIndex: 10
              }}
            />
          )}
        </div>
        
        {/* Time Display */}
        <div className="text-xs text-text-secondary font-mono whitespace-nowrap">
          {duration > 0 ? formatTime(currentTime) : '0:00'}
        </div>
      </div>

      {/* Playback Speed Button */}
      <button
        onClick={togglePlaybackRate}
        className="flex-shrink-0 w-10 h-8 flex items-center justify-center bg-surface/50 hover:bg-glow-purple/20 rounded-lg transition-colors text-xs font-semibold text-text-secondary hover:text-glow-purple"
      >
        {playbackRate}x
      </button>
    </div>
  );
};

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
  onUpdateMessageAttachments,
  onDeleteMessage,
  onCreateChannel,
  onSwitchChannel,
  onSwitchProject,
  onReactToMessage,
  allUsers,
  showAdminsInDMs = true,
  maxUploadSize: maxUploadSizeProp = 100,
  onMaxUploadSizeChange,
  onDeleteAllMessages,
}) => {
  const [messageInput, setMessageInput] = useState('');
  const [showProjectDropdown, setShowProjectDropdown] = useState(false);
  const [projectSearchQuery, setProjectSearchQuery] = useState('');
  const [channelSearchQuery, setChannelSearchQuery] = useState('');
  const [showMessageSearch, setShowMessageSearch] = useState(false);
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
  const [emojiSearchQuery, setEmojiSearchQuery] = useState<string>('');
  const [menuPosition, setMenuPosition] = useState<'top' | 'bottom'>('bottom');
  const [replyToMessage, setReplyToMessage] = useState<ChatMessage | null>(null);
  const [showThreadView, setShowThreadView] = useState<string | null>(null);
  const [highlightedMessageId, setHighlightedMessageId] = useState<string | null>(null);
  const [channelContextMenu, setChannelContextMenu] = useState<{ x: number; y: number; channelId: string } | null>(null);
  const [manuallyUnreadChannels, setManuallyUnreadChannels] = useState<Set<string>>(new Set());
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [uploadProgress, setUploadProgress] = useState<{[key: string]: number}>({});
  const [maxUploadSize, setMaxUploadSize] = useState<number>(maxUploadSizeProp); // MB
  const [showFileSizeWarning, setShowFileSizeWarning] = useState<{fileName: string, fileSize: number} | null>(null);
  const [previewAttachment, setPreviewAttachment] = useState<ChatAttachment | null>(null);
  const [previewZoom, setPreviewZoom] = useState<number>(1);
  const [previewPosition, setPreviewPosition] = useState<{x: number, y: number}>({x: 0, y: 0});
  const [showDeleteAllConfirm, setShowDeleteAllConfirm] = useState(false);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [dragStart, setDragStart] = useState<{x: number, y: number}>({x: 0, y: 0});
  const previewImageRef = useRef<HTMLImageElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Voice recording state
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [isPlayingRecording, setIsPlayingRecording] = useState(false);
  const [recordedWaveform, setRecordedWaveform] = useState<number[]>([]); // Aufgezeichnete Waveform-Historie
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const audioPlaybackRef = useRef<HTMLAudioElement | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  // Quick reaction emojis
  const quickReactions = ['👍', '❤️', '😊', '🎉', '🔥'];
  
  // All emojis for picker - organized by categories
  const emojiCategories = {
    'Häufig genutzt': ['👍', '❤️', '😊', '🎉'],
    'Smileys & Emotionen': [
      '😀', '😃', '😄', '😁', '😆', '😅', '🤣', '😂', 
      '🙂', '🙃', '😉', '😊', '😇', '🥰', '😍', '🤩',
      '😘', '😗', '😚', '😙', '😋', '😛', '😜', '🤪',
      '😝', '🤑', '🤗', '🤭', '🤫', '🤔', '🤐', '🤨',
      '😐', '😑', '😶', '😏', '😒', '🙄', '😬', '🤥',
      '😌', '😔', '😪', '🤤', '😴', '😷', '🤒', '🤕',
      '🤢', '🤮', '🤧', '🥵', '🥶', '😵', '🤯', '🤠',
      '🥳', '😎', '🤓', '🧐', '😕', '😟', '🙁', '☹️',
      '😮', '😯', '😲', '😳', '🥺', '😦', '😧', '😨',
      '😰', '😥', '😢', '😭', '😱', '😖', '😣', '😞'
    ],
    'Gesten & Körper': [
      '👋', '🤚', '🖐️', '✋', '🖖', '👌', '🤏', '✌️',
      '🤞', '🤟', '🤘', '🤙', '👈', '👉', '👆', '🖕',
      '👇', '☝️', '👍', '👎', '✊', '👊', '🤛', '🤜',
      '👏', '🙌', '👐', '🤲', '🤝', '🙏', '💪', '🦾'
    ],
    'Herzen': [
      '❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍',
      '🤎', '💔', '❣️', '💕', '💞', '💓', '💗', '💖',
      '💘', '💝', '💟'
    ],
    'Objekte': [
      '🎉', '🎊', '🎈', '🎁', '🏆', '🥇', '🥈', '🥉',
      '⚽', '🏀', '🏈', '⚾', '🎾', '🏐', '🏉', '🎱',
      '🎯', '🎮', '🎲', '🎰', '🎳', '🎸', '🎹', '🎺',
      '🎻', '🥁', '🎤', '🎧', '🎬', '🎨', '🎭', '🎪',
      '💡', '🔦', '🕯️', '💰', '💵', '💴', '💶', '💷',
      '⏰', '⏱️', '⏲️', '🕐', '📱', '💻', '⌨️', '🖥️',
      '🖨️', '🖱️', '🖲️', '📷', '📹', '🎥', '📞', '☎️'
    ],
    'Symbole': [
      '✨', '⭐', '🌟', '💫', '✅', '❌', '⚠️', '🚀',
      '🔥', '💯', '💢', '💥', '💦', '💨', '🌈', '☀️',
      '⛅', '☁️', '⚡', '❄️', '🔔', '🔕', '🎵', '🎶',
      '♻️', '⚡', '🔋', '🔌', '💡', '🔦', '🕯️'
    ]
  };
  
  const [selectedEmojiCategory, setSelectedEmojiCategory] = useState<string>('Häufig genutzt');

  // Scroll to bottom when opening chat or switching channels (instant, no animation)
  // useLayoutEffect runs before browser paint, preventing flash of old scroll position
  useLayoutEffect(() => {
    if (isOpen && currentChannel) {
      // Immediate scroll
      messagesEndRef.current?.scrollIntoView({ behavior: 'auto' });
      
      // Additional scroll after messages are rendered (ensures DOM is ready)
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'auto' });
      }, 0);
    }
  }, [isOpen, currentChannel?.id, messages.length]);

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
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      
      // Check if click is inside any menu or hover menu
      const isInsideEmojiPicker = target.closest('.emoji-picker-menu');
      const isInsideMoreMenu = target.closest('.more-options-menu');
      const isInsideHoverMenu = target.closest('.message-hover-menu');
      
      if (!isInsideEmojiPicker && !isInsideMoreMenu && !isInsideHoverMenu) {
        // Klick außerhalb aller Menüs - schließe alles
        setShowEmojiPicker(null);
        setShowMoreMenu(null);
        setHoveredMessageId(null);
      }
    };

    if (showEmojiPicker || showMoreMenu || hoveredMessageId) {
      setTimeout(() => {
        document.addEventListener('mousedown', handleClickOutside);
      }, 0);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showEmojiPicker, showMoreMenu, hoveredMessageId]);

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

  // Auto-focus textarea when replying to a message
  useEffect(() => {
    if (replyToMessage && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [replyToMessage]);

  // Reset zoom when preview changes
  useEffect(() => {
    if (previewAttachment) {
      setPreviewZoom(1);
      setPreviewPosition({x: 0, y: 0});
      setIsDragging(false);
    }
  }, [previewAttachment]);

  // Scroll to bottom when project filter changes (instant, no animation)
  // useLayoutEffect runs before browser paint, preventing flash of old scroll position
  useLayoutEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'auto' });
  }, [currentProject?.id]);

  // Scroll to bottom when composer height changes (messageInput, selectedFiles, replyToMessage)
  // This ensures the distance from the newest message to the composer stays constant
  useLayoutEffect(() => {
    if (isOpen && currentChannel) {
      // Use requestAnimationFrame to ensure DOM has updated with new composer height
      requestAnimationFrame(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'auto' });
      });
    }
  }, [messageInput, selectedFiles.length, replyToMessage, isOpen, currentChannel?.id]);

  // Handle wheel zoom
  const handleWheel = (e: React.WheelEvent) => {
    if (!previewAttachment || !isImageFile(previewAttachment.type)) return;
    e.preventDefault();
    const delta = e.deltaY * -0.01;
    const newZoom = Math.min(Math.max(1, previewZoom + delta), 5);
    setPreviewZoom(newZoom);
    if (newZoom === 1) {
      setPreviewPosition({x: 0, y: 0});
    }
  };

  // Handle mouse drag
  const handleMouseDown = (e: React.MouseEvent) => {
    if (!previewAttachment || !isImageFile(previewAttachment.type) || previewZoom === 1) return;
    setIsDragging(true);
    setDragStart({x: e.clientX - previewPosition.x, y: e.clientY - previewPosition.y});
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setPreviewPosition({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };


  // Get accessible channels
  const accessibleChannels = channels.filter(channel =>
    channel.members.some(member => member.id === currentUser.id)
  );

  // Separate channels by type
  const groupChannels = accessibleChannels.filter(c => c.type === ChatChannelType.Group);
  const directMessages = accessibleChannels.filter(c => c.type === ChatChannelType.Direct);

  // Search messages globally across all channels
  const searchedMessages = React.useMemo(() => {
    if (!channelSearchQuery.trim()) return [];
    
    const query = channelSearchQuery.toLowerCase();
    const results: Array<{
      message: ChatMessage;
      channel: ChatChannel;
      matchType: 'content' | 'sender';
    }> = [];
    
    // Search through all accessible channels
    accessibleChannels.forEach(channel => {
      const channelMessages = messages.filter(msg => msg.channelId === channel.id);
      
      channelMessages.forEach(message => {
        // Check if message content matches
        if (message.content.toLowerCase().includes(query)) {
          results.push({ message, channel, matchType: 'content' });
        }
        // Check if sender name matches
        else if (message.sender.name.toLowerCase().includes(query)) {
          results.push({ message, channel, matchType: 'sender' });
        }
      });
    });
    
    // Sort by timestamp (newest first)
    return results.sort((a, b) => 
      new Date(b.message.timestamp).getTime() - new Date(a.message.timestamp).getTime()
    );
  }, [channelSearchQuery, messages, accessibleChannels]);

  // Filter channels by search (only when not in message search mode)
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
    // Wenn Channel manuell als ungelesen markiert wurde, zähle alle Nachrichten als ungelesen
    if (manuallyUnreadChannels.has(channelId)) {
      return messages.filter(msg =>
        msg.channelId === channelId &&
        msg.sender.id !== currentUser.id
      ).length;
    }
    
    // Normale Unread-Logik
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
  const handleSendMessage = async () => {
    if ((messageInput.trim() || selectedFiles.length > 0) && currentChannel) {
      try {
        // Im Thread-Modus: Automatisch auf die letzte Nachricht im Thread antworten
        let messageToReplyTo = replyToMessage;
        
        if (showThreadView && !replyToMessage) {
          // Hole die letzte Nachricht im Thread
          const threadChain = buildThreadChain(showThreadView);
          if (threadChain.length > 0) {
            messageToReplyTo = threadChain[threadChain.length - 1];
          }
        }
        
        // Use project ID from reply message if replying, otherwise use current project
        const projectId = messageToReplyTo?.projectId || currentProject?.id || '';
        let content = messageInput.trim();
        
        // Add reply reference if replying to a message - nur die DIREKTE Nachricht zitieren
        if (messageToReplyTo) {
          // Extrahiere nur den eigentlichen Inhalt, ohne verschachtelte Zitate
          let quotedContent = messageToReplyTo.content;
          const reply = parseReply(messageToReplyTo.content);
          if (reply) {
            // Wenn die Nachricht selbst eine Antwort ist, zitiere nur den actualContent
            quotedContent = reply.actualContent;
          }
          
          // Prüfe ob die Nachricht Anhänge hat (Medien)
          if (messageToReplyTo.attachments && messageToReplyTo.attachments.length > 0) {
            const attachment = messageToReplyTo.attachments[0];
            let mediaType = 'file';
            let mediaLabel = attachment.name;
            
            if (isImageFile(attachment.type)) {
              mediaType = 'image';
              mediaLabel = 'Bild';
            } else if (isVideoFile(attachment.type)) {
              mediaType = 'video';
              mediaLabel = 'Video';
            } else if (isAudioFile(attachment.type)) {
              if (attachment.name.startsWith('voice-')) {
                mediaType = 'voice';
                mediaLabel = 'Sprachnachricht';
              } else {
                mediaType = 'audio';
                mediaLabel = 'Audio';
              }
            } else {
              mediaLabel = attachment.name;
            }
            
            // Wenn die Nachricht nur ein Anhang ist (kein Text), verwende Medien-Format
            if (!quotedContent.trim()) {
              quotedContent = `[MEDIA:${mediaType}:${mediaLabel}]`;
            }
          }
          
          content = `@${messageToReplyTo.sender.name}: "${quotedContent}"\n\n${content}`;
        }
        
        const filesToUpload = [...selectedFiles];
        
        // Send text and files as SEPARATE messages
        // 1. Send text message first (if there is text)
        if (content.trim()) {
          onSendMessage(content, currentChannel.id, projectId, undefined);
        }
        
        // 2. Send each file as a separate message with Blob URL for instant preview
        // Store mapping: filename -> messageId for later update
        const fileMessageMap = new Map<string, string>();
        if (filesToUpload.length > 0) {
          filesToUpload.forEach((file, idx) => {
            const messageId = `msg-${Date.now()}-${idx}`;
            fileMessageMap.set(file.name, messageId);
            
            const placeholderAttachment: ChatAttachment = {
              id: `uploading-${Date.now()}-${idx}`,
              name: file.name,
              size: file.size,
              type: file.type,
              url: URL.createObjectURL(file), // Local blob URL for instant preview!
            };
            
            // Send empty message with single attachment (Blob URL)
            onSendMessage('', currentChannel.id, projectId, [placeholderAttachment], messageId);
          });
        }
        
        // Clear input immediately for better UX
        setMessageInput('');
        setReplyToMessage(null);
        setSelectedFiles([]);
        
        // Reset textarea height
        if (textareaRef.current) {
          textareaRef.current.style.height = '44px';
        }
        
        // Scroll to bottom immediately (instant, no animation like channel switch)
        setTimeout(() => {
          messagesEndRef.current?.scrollIntoView({ behavior: 'auto' });
        }, 50);
        
        // 3. Upload files in background and update messages with real URLs
        if (filesToUpload.length > 0) {
          uploadChatFiles(filesToUpload, currentChannel.id, (fileIndex, progress) => {
            setUploadProgress(prev => ({
              ...prev,
              [filesToUpload[fileIndex].name]: progress
            }));
          }).then(uploadedAttachments => {
            console.log('✅ Upload complete, updating messages with real URLs:', uploadedAttachments);
            
            // Update each message with real Supabase URLs using stored messageId
            uploadedAttachments.forEach((attachment, idx) => {
              const messageId = fileMessageMap.get(attachment.name);
              
              if (messageId) {
                console.log('✅ Updating message:', messageId, 'with real URL for:', attachment.name);
                onUpdateMessageAttachments(messageId, [attachment]);
              } else {
                console.error('❌ No messageId found for attachment:', attachment.name);
                console.error('Available mappings:', Array.from(fileMessageMap.entries()));
              }
            });
            setUploadProgress({});
          }).catch(error => {
            console.error('❌ Error uploading files:', error);
            alert('Fehler beim Hochladen der Dateien.');
            setUploadProgress({});
          });
        }
      } catch (error) {
        console.error('Error sending message:', error);
        alert('Fehler beim Senden der Nachricht. Bitte versuche es erneut.');
      }
    }
  };

  // Audio visualization function - scrolling waveform
  const analyzeAudio = () => {
    if (!analyserRef.current) return;

    const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
    analyserRef.current.getByteFrequencyData(dataArray);

    // Calculate average level from frequency data
    let sum = 0;
    for (let i = 0; i < dataArray.length; i++) {
      sum += dataArray[i];
    }
    const average = sum / dataArray.length;
    const normalizedLevel = average / 255; // Normalize to 0-1

    // Add new level to the end of the waveform history
    setRecordedWaveform(prev => [...prev, normalizedLevel]);

    animationFrameRef.current = requestAnimationFrame(analyzeAudio);
  };

  // Voice recording functions
  const startRecording = async () => {
    try {
      console.log('🎤 Starting recording...');
      
      // Check if mediaDevices is available
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Dein Browser unterstützt keine Audio-Aufnahme. Bitte verwende einen modernen Browser wie Chrome, Firefox oder Safari.');
      }

      // Check if MediaRecorder is available
      if (typeof MediaRecorder === 'undefined') {
        throw new Error('MediaRecorder API ist nicht verfügbar. Bitte verwende einen modernen Browser.');
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      console.log('✅ Got media stream');
      
      // Setup audio analysis for visualization
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const analyser = audioContext.createAnalyser();
      const source = audioContext.createMediaStreamSource(stream);
      
      analyser.fftSize = 256;
      source.connect(analyser);
      
      audioContextRef.current = audioContext;
      analyserRef.current = analyser;
      
      // Start visualization
      analyzeAudio();
      
      // Detect supported MIME type
      let mimeType = 'audio/webm';
      if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
        mimeType = 'audio/webm;codecs=opus';
      } else if (MediaRecorder.isTypeSupported('audio/webm')) {
        mimeType = 'audio/webm';
      } else if (MediaRecorder.isTypeSupported('audio/mp4')) {
        mimeType = 'audio/mp4';
      } else if (MediaRecorder.isTypeSupported('audio/ogg;codecs=opus')) {
        mimeType = 'audio/ogg;codecs=opus';
      }
      console.log('🎵 Using MIME type:', mimeType);

      const mediaRecorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        console.log('📦 Data available:', event.data.size, 'bytes');
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        console.log('⏹️ Recording stopped, chunks:', audioChunksRef.current.length);
        const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
        console.log('🎵 Audio blob created:', audioBlob.size, 'bytes');
        setAudioBlob(audioBlob);
        stream.getTracks().forEach(track => track.stop());
        
        // Stop visualization
        if (animationFrameRef.current) {
          cancelAnimationFrame(animationFrameRef.current);
        }
        if (audioContextRef.current) {
          audioContextRef.current.close();
        }
      };

      mediaRecorder.onerror = (event: Event) => {
        console.error('❌ MediaRecorder error:', event);
        alert('Fehler während der Aufnahme. Bitte versuche es erneut.');
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);
      setRecordedWaveform([]); // Reset waveform history
      console.log('🎤 Recording started!');

      // Start timer
      recordingIntervalRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
    } catch (error) {
      console.error('❌ Error starting recording:', error);
      
      let errorMessage = 'Unbekannter Fehler';
      if (error instanceof Error) {
        errorMessage = error.message;
      } else if (error && typeof error === 'object' && 'name' in error) {
        const domError = error as DOMException;
        if (domError.name === 'NotAllowedError') {
          errorMessage = 'Mikrofon-Zugriff wurde verweigert. Bitte erlaube den Zugriff in deinen Browser-Einstellungen.';
        } else if (domError.name === 'NotFoundError') {
          errorMessage = 'Kein Mikrofon gefunden. Bitte schließe ein Mikrofon an.';
        } else if (domError.name === 'NotReadableError') {
          errorMessage = 'Mikrofon wird bereits von einer anderen Anwendung verwendet.';
        } else {
          errorMessage = `Fehler: ${domError.name} - ${domError.message}`;
        }
      }
      
      alert(`Fehler beim Starten der Aufnahme:\n${errorMessage}`);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
      }
    }
  };

  const cancelRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
      }
      // Stop visualization
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    }
    setAudioBlob(null);
    setRecordingTime(0);
    setRecordedWaveform([]);
  };

  const playRecording = () => {
    if (audioBlob) {
      const audio = new Audio(URL.createObjectURL(audioBlob));
      audioPlaybackRef.current = audio;
      audio.play();
      setIsPlayingRecording(true);
      audio.onended = () => {
        setIsPlayingRecording(false);
      };
    }
  };

  const pausePlayback = () => {
    if (audioPlaybackRef.current) {
      audioPlaybackRef.current.pause();
      setIsPlayingRecording(false);
    }
  };

  const sendVoiceMessage = async () => {
    if (!audioBlob || !currentChannel) return;

    try {
      // Create File from Blob
      const audioFile = new File([audioBlob], `voice-${Date.now()}.webm`, { type: 'audio/webm' });
      
      // Upload to Supabase
      const { uploadChatFiles } = await import('../utils/fileUpload');
      const uploadedAttachments = await uploadChatFiles([audioFile], currentChannel.id);
      
      // Send as message
      if (uploadedAttachments.length > 0) {
        onSendMessage('', currentChannel.id, currentProject?.id || '', uploadedAttachments);
      }

      // Reset
      setAudioBlob(null);
      setRecordingTime(0);

      // Scroll to bottom
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'auto' });
      }, 50);
    } catch (error) {
      console.error('Error sending voice message:', error);
      alert('Fehler beim Senden der Sprachnachricht.');
    }
  };

  const formatRecordingTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Handle file selection
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    console.log('📎 File selection triggered, files:', files);
    if (!files) return;

    const validFiles: File[] = [];
    const maxSizeBytes = maxUploadSize * 1024 * 1024; // Convert MB to bytes

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      console.log(`📎 Checking file: ${file.name}, size: ${file.size} bytes`);
      if (file.size > maxSizeBytes) {
        // Zeige Warnung mit Google Drive Vorschlag
        setShowFileSizeWarning({
          fileName: file.name,
          fileSize: Math.round(file.size / (1024 * 1024)) // Convert to MB
        });
        continue;
      }
      validFiles.push(file);
    }

    console.log('📎 Valid files:', validFiles.length);
    setSelectedFiles(prev => {
      const newFiles = [...prev, ...validFiles];
      console.log('📎 Updated selectedFiles:', newFiles.length);
      return newFiles;
    });
    
    // Reset input
    if (event.target) {
      event.target.value = '';
    }
  };

  // Remove selected file
  const removeSelectedFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  // Format file size
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
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
    setShowEmojiPicker(null);
    // Hover-Menü bleibt offen, wird nur durch onMouseLeave geschlossen
  };
  
  // Handle reply to message
  const handleReplyToMessage = (message: ChatMessage) => {
    setReplyToMessage(message);
    // Hover-Menü bleibt offen, wird nur durch onMouseLeave geschlossen
  };
  
  // Handle mark channel as unread
  const handleMarkChannelAsUnread = (channelId: string) => {
    setManuallyUnreadChannels(prev => new Set(prev).add(channelId));
    setChannelContextMenu(null);
    console.log('✅ Channel als ungelesen markiert:', channelId);
  };
  
  // Handle channel context menu
  const handleChannelContextMenu = (e: React.MouseEvent, channelId: string) => {
    e.preventDefault();
    setChannelContextMenu({
      x: e.clientX,
      y: e.clientY,
      channelId
    });
  };
  
  // Wrapper für onSwitchChannel - entfernt "ungelesen"-Markierung beim Wechsel
  const handleSwitchChannel = (channelId: string) => {
    // Entferne Channel aus manuell-ungelesen-Liste
    setManuallyUnreadChannels(prev => {
      const newSet = new Set(prev);
      newSet.delete(channelId);
      return newSet;
    });
    onSwitchChannel(channelId);
  };
  
  // Handle star message
  const handleStarMessage = async (messageId: string) => {
    try {
      const message = messages.find(m => m.id === messageId);
      if (!message) return;
      
      // Prüfe ob Nachricht bereits markiert ist
      const isStarred = message.starredBy?.includes(currentUser.id);
      
      let updatedStarredBy: string[];
      if (isStarred) {
        // Entferne Stern
        updatedStarredBy = (message.starredBy || []).filter(id => id !== currentUser.id);
      } else {
        // Füge Stern hinzu
        updatedStarredBy = [...(message.starredBy || []), currentUser.id];
      }
      
      // Update data JSON und starred_by Spalte
      const updatedData = { ...message, starredBy: updatedStarredBy };
      
      const { error } = await supabase
        .from('chat_messages')
        .update({ 
          data: updatedData,
          starred_by: updatedStarredBy 
        })
        .eq('id', messageId);
      
      if (error) throw error;
      
      console.log(isStarred ? '⭐ Stern entfernt' : '⭐ Nachricht markiert:', messageId);
      setShowMoreMenu(null);
      
      // Trigger refresh (wird durch Realtime-Subscription automatisch aktualisiert)
    } catch (error) {
      console.error('❌ Fehler beim Markieren:', error);
    }
  };
  
  // Handle copy message link
  const handleCopyMessageLink = (messageId: string) => {
    const link = `${window.location.origin}/chat/${currentChannel?.id}/${messageId}`;
    navigator.clipboard.writeText(link);
    setShowMoreMenu(null);
    alert('Link kopiert!');
  };
  
  // Handle download attachment
  const handleDownloadAttachment = async (attachment: ChatAttachment) => {
    try {
      const response = await fetch(attachment.url);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = attachment.name;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      console.log('✅ Datei heruntergeladen:', attachment.name);
    } catch (error) {
      console.error('❌ Fehler beim Herunterladen:', error);
      alert('Fehler beim Herunterladen der Datei');
    }
  };
  
  // Handle pin message
  const handlePinMessage = (messageId: string) => {
    console.log('Pin message:', messageId);
    setShowMoreMenu(null);
    // TODO: Implement pin message functionality
    alert('Funktion "An Pinnwand anheften" wird noch implementiert.');
  };
  
  // Handle mouse enter on message - cancel any pending timeout
  const handleMessageMouseEnter = (messageId: string) => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = null;
    }
    setHoveredMessageId(messageId);
  };
  
  // Handle mouse leave on message - delay before closing
  const handleMessageMouseLeave = () => {
    // Delay 300ms before closing to allow moving to menu
    hoverTimeoutRef.current = setTimeout(() => {
      // Don't close if a submenu is open
      if (!showEmojiPicker && !showMoreMenu) {
        setHoveredMessageId(null);
      }
    }, 300);
  };
  
  // Calculate menu position based on click position in chat window
  const calculateMenuPosition = (event: React.MouseEvent) => {
    const chatContainer = event.currentTarget.closest('.overflow-y-auto');
    if (chatContainer) {
      const rect = chatContainer.getBoundingClientRect();
      const clickY = event.clientY;
      const containerMiddle = rect.top + rect.height / 2;
      
      // If click is in bottom half, open menu upwards
      setMenuPosition(clickY > containerMiddle ? 'top' : 'bottom');
    }
  };
  
  // Emoji name mapping for search
  const emojiNames: { [key: string]: string } = {
    '😀': 'grinning lachen freude',
    '😃': 'smile lächeln freude',
    '😄': 'lachen freude happy',
    '😁': 'grinsen freude',
    '😆': 'lachen freude',
    '😅': 'schweiß lachen',
    '🤣': 'lachen tränen',
    '😂': 'tränen lachen',
    '🙂': 'lächeln smile',
    '🙃': 'umgedreht',
    '😉': 'zwinkern',
    '😊': 'lächeln glücklich',
    '😇': 'engel heilig',
    '🥰': 'liebe herzen',
    '😍': 'liebe herzen augen',
    '🤩': 'sterne augen wow',
    '😘': 'kuss',
    '😗': 'kuss',
    '😚': 'kuss',
    '😙': 'kuss',
    '🥲': 'träne lächeln',
    '😋': 'lecker',
    '😛': 'zunge',
    '😜': 'zwinkern zunge',
    '🤪': 'verrückt',
    '😝': 'zunge',
    '🤑': 'geld dollar',
    '🤗': 'umarmung',
    '🤭': 'hand mund',
    '🤫': 'leise psst',
    '🤔': 'denken nachdenken',
    '🤐': 'schweigen',
    '🤨': 'skeptisch',
    '😐': 'neutral',
    '😑': 'expressionslos',
    '😶': 'stumm',
    '😏': 'smirk',
    '😒': 'unzufrieden',
    '🙄': 'augenrollen',
    '😬': 'grimasse',
    '🤥': 'lüge pinocchio',
    '😌': 'erleichtert',
    '😔': 'nachdenklich traurig',
    '😪': 'müde schlafen',
    '🤤': 'sabbern',
    '😴': 'schlafen',
    '😷': 'maske krank',
    '🤒': 'krank fieber',
    '🤕': 'verletzt',
    '🤢': 'übel',
    '🤮': 'kotzen',
    '🤧': 'niesen',
    '🥵': 'heiß schwitzen',
    '🥶': 'kalt frieren',
    '😵': 'schwindelig',
    '🤯': 'mind blown',
    '🤠': 'cowboy',
    '🥳': 'party feier',
    '🥸': 'verkleidung',
    '😎': 'cool sonnenbrille',
    '🤓': 'nerd brille',
    '🧐': 'monokel',
    '😕': 'verwirrt',
    '😟': 'besorgt',
    '🙁': 'traurig',
    '😮': 'überrascht',
    '😯': 'überrascht',
    '😲': 'schock',
    '😳': 'verlegen',
    '🥺': 'bitte flehen',
    '😦': 'besorgt',
    '😧': 'angst',
    '😨': 'angst',
    '😰': 'angst schweiß',
    '😥': 'traurig schweiß',
    '😢': 'weinen tränen',
    '😭': 'weinen laut',
    '😱': 'schrei angst',
    '😖': 'verzweifelt',
    '😣': 'angestrengt',
    '😞': 'enttäuscht',
    '😓': 'schweiß',
    '😩': 'müde erschöpft',
    '😫': 'müde erschöpft',
    '🥱': 'gähnen müde',
    '😤': 'triumph',
    '😡': 'wütend',
    '😠': 'wütend',
    '🤬': 'fluchen',
    '👍': 'daumen hoch gut',
    '👎': 'daumen runter schlecht',
    '👏': 'klatschen applaus',
    '🙌': 'hände hoch feier',
    '👐': 'offene hände',
    '🤲': 'hände',
    '🤝': 'händedruck',
    '🙏': 'beten danke',
    '✌️': 'peace victory',
    '🤞': 'finger gekreuzt glück',
    '🤟': 'liebe hand',
    '🤘': 'rock',
    '🤙': 'call me',
    '👌': 'ok perfekt',
    '🤌': 'italienisch',
    '🤏': 'klein wenig',
    '👈': 'links zeigen',
    '👉': 'rechts zeigen',
    '👆': 'oben zeigen',
    '👇': 'unten zeigen',
    '☝️': 'finger hoch',
    '✋': 'hand stop',
    '🤚': 'hand',
    '🖐️': 'hand offen',
    '🖖': 'vulkan spock',
    '👋': 'winken hallo tschüss',
    '🤛': 'faust links',
    '🤜': 'faust rechts',
    '✊': 'faust',
    '👊': 'faust bump',
    '💪': 'muskel stark',
    '🦾': 'arm roboter',
    '🦿': 'bein roboter',
    '🦵': 'bein',
    '🦶': 'fuß',
    '👂': 'ohr',
    '🦻': 'hörgerät',
    '👃': 'nase',
    '🧠': 'gehirn',
    '🫀': 'herz organ',
    '🫁': 'lunge',
    '🦷': 'zahn',
    '🦴': 'knochen',
    '👀': 'augen schauen',
    '👁️': 'auge',
    '👅': 'zunge',
    '👄': 'lippen mund',
    '💋': 'kuss lippen',
    '🩸': 'blut',
    '❤️': 'herz liebe rot',
    '🧡': 'herz orange',
    '💛': 'herz gelb',
    '💚': 'herz grün',
    '💙': 'herz blau',
    '💜': 'herz lila',
    '🖤': 'herz schwarz',
    '🤍': 'herz weiß',
    '🤎': 'herz braun',
    '💔': 'herz gebrochen',
    '❣️': 'herz ausrufezeichen',
    '💕': 'herzen zwei',
    '💞': 'herzen',
    '💓': 'herz schlagen',
    '💗': 'herz wachsen',
    '💖': 'herz funkeln',
    '💘': 'herz pfeil',
    '💝': 'herz geschenk',
    '💟': 'herz dekoration',
    '☮️': 'peace frieden',
    '✝️': 'kreuz',
    '☪️': 'islam',
    '🕉️': 'om',
    '☸️': 'dharma',
    '✡️': 'david stern',
    '🔯': 'stern',
    '🕎': 'menora',
    '☯️': 'yin yang',
    '☦️': 'kreuz orthodox',
    '🛐': 'beten',
    '⛎': 'sternzeichen',
    '♈': 'widder',
    '♉': 'stier',
    '♊': 'zwillinge',
    '♋': 'krebs',
    '♌': 'löwe',
    '♍': 'jungfrau',
    '♎': 'waage',
    '♏': 'skorpion',
    '♐': 'schütze',
    '♑': 'steinbock',
    '♒': 'wassermann',
    '♓': 'fische',
    '🔀': 'shuffle',
    '🔁': 'repeat',
    '🔂': 'repeat one',
    '▶️': 'play',
    '⏩': 'forward',
    '⏭️': 'next',
    '⏯️': 'play pause',
    '◀️': 'reverse',
    '⏪': 'rewind',
    '⏮️': 'previous',
    '🔼': 'up',
    '⏫': 'up double',
    '🔽': 'down',
    '⏬': 'down double',
    '⏸️': 'pause',
    '⏹️': 'stop',
    '⏺️': 'record',
    '⏏️': 'eject',
    '🎦': 'kino film',
    '🔅': 'hell dimmen',
    '🔆': 'hell',
    '📶': 'signal',
    '📳': 'vibration',
    '📴': 'handy aus',
    '♀️': 'weiblich',
    '♂️': 'männlich',
    '⚧️': 'transgender',
    '✖️': 'mal kreuz',
    '➕': 'plus',
    '➖': 'minus',
    '➗': 'geteilt',
    '♾️': 'unendlich',
    '‼️': 'ausrufezeichen doppelt',
    '⁉️': 'frage ausrufezeichen',
    '❓': 'frage',
    '❔': 'frage weiß',
    '❕': 'ausrufezeichen weiß',
    '❗': 'ausrufezeichen',
    '〰️': 'welle',
    '💱': 'währung',
    '💲': 'dollar',
    '⚕️': 'medizin',
    '♻️': 'recycling',
    '⚜️': 'fleur de lis',
    '🔱': 'dreizack',
    '📛': 'name schild',
    '🔰': 'anfänger',
    '⭕': 'kreis rot',
    '✅': 'check haken grün',
    '☑️': 'check box',
    '✔️': 'check haken',
    '❌': 'kreuz rot',
    '❎': 'kreuz grün',
    '➰': 'schleife',
    '➿': 'doppel schleife',
    '〽️': 'part alternation',
    '✳️': 'stern acht',
    '✴️': 'stern acht schwarz',
    '❇️': 'funkeln',
    '©️': 'copyright',
    '®️': 'registered',
    '™️': 'trademark',
    '🔟': 'zehn',
    '🔠': 'großbuchstaben',
    '🔡': 'kleinbuchstaben',
    '🔢': 'zahlen',
    '🔣': 'symbole',
    '🔤': 'abc',
    '🅰️': 'a blut',
    '🆎': 'ab blut',
    '🅱️': 'b blut',
    '🆑': 'cl',
    '🆒': 'cool',
    '🆓': 'free kostenlos',
    'ℹ️': 'info',
    '🆔': 'id',
    'Ⓜ️': 'm metro',
    '🆕': 'new neu',
    '🆖': 'ng',
    '🅾️': 'o blut',
    '🆗': 'ok',
    '🅿️': 'p parken',
    '🆘': 'sos hilfe',
    '🆙': 'up',
    '🆚': 'vs versus',
    '🈁': 'japanisch hier',
    '🈂️': 'japanisch service',
    '🈷️': 'japanisch monat',
    '🈶': 'japanisch haben',
    '🈯': 'japanisch reserviert',
    '🉐': 'japanisch schnäppchen',
    '🈹': 'japanisch rabatt',
    '🈚': 'japanisch kostenlos',
    '🈲': 'japanisch verboten',
    '🉑': 'japanisch akzeptabel',
    '🈸': 'japanisch anwendung',
    '🈴': 'japanisch zusammen',
    '🈳': 'japanisch frei',
    '㊗️': 'japanisch glückwunsch',
    '㊙️': 'japanisch geheim',
    '🈺': 'japanisch offen',
    '🈵': 'japanisch voll',
    '🔴': 'kreis rot',
    '🟠': 'kreis orange',
    '🟡': 'kreis gelb',
    '🟢': 'kreis grün',
    '🔵': 'kreis blau',
    '🟣': 'kreis lila',
    '🟤': 'kreis braun',
    '⚫': 'kreis schwarz',
    '⚪': 'kreis weiß',
    '🟥': 'quadrat rot',
    '🟧': 'quadrat orange',
    '🟨': 'quadrat gelb',
    '🟩': 'quadrat grün',
    '🟦': 'quadrat blau',
    '🟪': 'quadrat lila',
    '🟫': 'quadrat braun',
    '⬛': 'quadrat schwarz',
    '⬜': 'quadrat weiß',
    '🔶': 'raute orange',
    '🔷': 'raute blau',
    '🔸': 'raute klein orange',
    '🔹': 'raute klein blau',
    '🔺': 'dreieck rot oben',
    '🔻': 'dreieck rot unten',
    '💠': 'diamant',
    '🔘': 'radio button',
    '🔳': 'quadrat weiß button',
    '🔲': 'quadrat schwarz button',
    '🏁': 'flagge kariert',
    '🚩': 'flagge rot',
    '🎌': 'flaggen gekreuzt',
    '🏴': 'flagge schwarz',
    '🏳️': 'flagge weiß',
    '🏳️‍🌈': 'regenbogen pride',
    '🏳️‍⚧️': 'transgender flagge',
    '🏴‍☠️': 'pirat flagge',
    '🔥': 'feuer flamme',
    '💧': 'tropfen wasser',
    '🌊': 'welle meer',
    '🎃': 'kürbis halloween',
    '🎄': 'weihnachtsbaum',
    '🎆': 'feuerwerk',
    '🎇': 'wunderkerze',
    '🧨': 'feuerwerkskörper',
    '✨': 'funkeln sterne',
    '🎈': 'ballon',
    '🎉': 'party konfetti',
    '🎊': 'konfetti ball',
    '🎋': 'tanabata baum',
    '🎍': 'bambus dekoration',
    '🎎': 'puppen',
    '🎏': 'karpfen fahne',
    '🎐': 'windspiel',
    '🎑': 'mond zeremonie',
    '🧧': 'roter umschlag',
    '🎀': 'schleife',
    '🎁': 'geschenk',
    '🎗️': 'erinnerung band',
    '🎟️': 'ticket',
    '🎫': 'ticket',
    '🎖️': 'medaille militär',
    '🏆': 'pokal trophy',
    '🏅': 'medaille',
    '🥇': 'gold medaille',
    '🥈': 'silber medaille',
    '🥉': 'bronze medaille',
    '⚽': 'fußball',
    '⚾': 'baseball',
    '🥎': 'softball',
    '🏀': 'basketball',
    '🏐': 'volleyball',
    '🏈': 'american football',
    '🏉': 'rugby',
    '🎾': 'tennis',
    '🥏': 'frisbee',
    '🎳': 'bowling',
    '🏏': 'cricket',
    '🏑': 'hockey',
    '🏒': 'eishockey',
    '🥍': 'lacrosse',
    '🏓': 'tischtennis ping pong',
    '🏸': 'badminton',
    '🥊': 'boxen',
    '🥋': 'kampfsport',
    '🥅': 'tor',
    '⛳': 'golf',
    '⛸️': 'schlittschuh',
    '🎣': 'angeln',
    '🤿': 'tauchen',
    '🎽': 'laufshirt',
    '🎿': 'ski',
    '🛷': 'schlitten',
    '🥌': 'curling',
    '🎯': 'ziel dartscheibe',
    '🪀': 'jojo',
    '🪁': 'drachen',
    '🎱': 'billard 8',
    '🔮': 'kristallkugel',
    '🪄': 'zauberstab',
    '🧿': 'nazar amulett',
    '🎮': 'controller gaming',
    '🕹️': 'joystick',
    '🎰': 'spielautomat',
    '🎲': 'würfel',
    '🧩': 'puzzle',
    '🧸': 'teddy bär',
    '🪅': 'pinata',
    '🪆': 'matroschka',
    '♠️': 'pik',
    '♥️': 'herz karte',
    '♦️': 'karo',
    '♣️': 'kreuz karte',
    '♟️': 'schach bauer',
    '🃏': 'joker karte',
    '🀄': 'mahjong',
    '🎴': 'blumen karten',
    '🎭': 'theater masken',
    '🖼️': 'bild rahmen',
    '🎨': 'palette kunst',
    '🧵': 'faden',
    '🪡': 'nadel',
    '🧶': 'wolle',
    '🪢': 'knoten'
  };

  // Filter emojis based on search query
  const getFilteredEmojis = () => {
    const allEmojis = Object.values(emojiCategories).flat();
    if (!emojiSearchQuery.trim()) {
      return allEmojis;
    }
    
    const query = emojiSearchQuery.toLowerCase();
    return allEmojis.filter(emoji => {
      // Suche in Emoji-Namen
      const names = emojiNames[emoji] || '';
      return names.toLowerCase().includes(query);
    });
  };
  
  // Parse reply from message content - nur die DIREKTE Nachricht extrahieren
  const parseReply = (content: string) => {
    const replyMatch = content.match(/^@(.+?): "(.+?)"\n\n(.+)$/s);
    if (replyMatch) {
      let replyContent = replyMatch[2];
      let mediaType: 'image' | 'video' | 'audio' | 'voice' | 'file' | null = null;
      
      // Prüfe ob es sich um ein Medien-Zitat handelt
      if (replyContent.startsWith('[MEDIA:') && replyContent.endsWith(']')) {
        const mediaMatch = replyContent.match(/^\[MEDIA:(image|video|audio|voice|file):(.+?)\]$/);
        if (mediaMatch) {
          mediaType = mediaMatch[1] as 'image' | 'video' | 'audio' | 'voice' | 'file';
          replyContent = mediaMatch[2]; // Dateiname oder Beschreibung
        }
      }
      
      // Wenn das Zitat selbst ein verschachteltes Zitat enthält, extrahiere nur den Text NACH dem verschachtelten Zitat
      const nestedReplyMatch = replyContent.match(/^@.+?: ".+?"\n\n(.+)$/s);
      if (nestedReplyMatch) {
        replyContent = nestedReplyMatch[1];
      }
      
      return {
        senderName: replyMatch[1],
        replyContent: replyContent,
        actualContent: replyMatch[3],
        mediaType: mediaType,
      };
    }
    return null;
  };
  
  // Build thread chain - finde alle Nachrichten in einem Reply-Thread
  const buildThreadChain = (messageId: string): ChatMessage[] => {
    const chain: ChatMessage[] = [];
    const message = messages.find(m => m.id === messageId);
    
    if (!message) return chain;
    
    // Füge die aktuelle Nachricht hinzu
    chain.push(message);
    
    // 1. RÜCKWÄRTS: Finde die ursprüngliche Nachricht durch Rückwärtsverfolgung
    let currentMsg = message;
    while (currentMsg) {
      const reply = parseReply(currentMsg.content);
      if (!reply) break;
      
      // Finde die Nachricht, auf die geantwortet wurde
      const parentMsg = messages.find(m => 
        m.sender.name === reply.senderName && 
        m.content.includes(reply.replyContent)
      );
      
      if (parentMsg && !chain.find(m => m.id === parentMsg.id)) {
        chain.unshift(parentMsg);
        currentMsg = parentMsg;
      } else {
        break;
      }
    }
    
    // 2. VORWÄRTS: Finde alle Nachrichten, die auf Thread-Nachrichten antworten
    const findReplies = (threadMessages: ChatMessage[]) => {
      const newReplies: ChatMessage[] = [];
      
      for (const threadMsg of threadMessages) {
        // Extrahiere den Inhalt der Thread-Nachricht
        const threadReply = parseReply(threadMsg.content);
        const threadContent = threadReply ? threadReply.actualContent : threadMsg.content;
        
        // Finde alle Nachrichten, die auf diese Thread-Nachricht antworten
        const replies = messages.filter(m => {
          if (chain.find(cm => cm.id === m.id)) return false; // Bereits im Thread
          if (newReplies.find(nr => nr.id === m.id)) return false; // Bereits gefunden
          
          const reply = parseReply(m.content);
          if (!reply) return false;
          
          // Prüfe ob diese Nachricht auf die Thread-Nachricht antwortet
          return reply.senderName === threadMsg.sender.name && 
                 reply.replyContent === threadContent;
        });
        
        newReplies.push(...replies);
      }
      
      return newReplies;
    };
    
    // Iterativ alle Antworten finden
    let foundNewReplies = true;
    while (foundNewReplies) {
      const newReplies = findReplies(chain);
      if (newReplies.length > 0) {
        chain.push(...newReplies);
      } else {
        foundNewReplies = false;
      }
    }
    
    // Sortiere die gesamte Chain chronologisch nach Timestamp
    chain.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
    
    return chain;
  };
  
  // Convert URLs in text to clickable links
  const renderTextWithLinks = (text: string) => {
    // Match URLs with or without protocol
    const urlRegex = /(https?:\/\/[^\s]+|www\.[^\s]+|[a-zA-Z0-9-]+\.[a-zA-Z]{2,}[^\s]*)/g;
    const parts = text.split(urlRegex);
    
    return parts.map((part, index) => {
      if (part.match(urlRegex)) {
        // Add https:// if no protocol is present
        const href = part.match(/^https?:\/\//) ? part : `https://${part}`;
        
        return (
          <a
            key={index}
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="underline transition-all hover:drop-shadow-[0_0_5px_rgba(168,85,247,1)] hover:drop-shadow-[0_0_5px_rgba(168,85,247,1)] hover:drop-shadow-[0_0_5px_rgba(168,85,247,1)]"
            style={{
              background: 'linear-gradient(135deg, #A855F7, #EC4899)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {part}
          </a>
        );
      }
      return part;
    });
  };
  
  // Scroll to message with glow effect
  const scrollToMessage = (messageId: string) => {
    console.log('📜 scrollToMessage aufgerufen:', messageId);
    const messageElement = document.getElementById(`message-${messageId}`);
    console.log('🎯 Element gefunden:', messageElement ? 'JA' : 'NEIN', messageElement);
    if (messageElement) {
      messageElement.scrollIntoView({ behavior: 'auto', block: 'center' });
      console.log('✅ Scroll durchgeführt');
      // Add glow effect
      setHighlightedMessageId(messageId);
      console.log('✨ Glow-Effekt aktiviert für:', messageId);
      setTimeout(() => {
        setHighlightedMessageId(null);
        console.log('💤 Glow-Effekt deaktiviert');
      }, 2000);
    } else {
      console.error('❌ Element nicht gefunden! ID:', `message-${messageId}`);
      console.log('📋 Alle message-* IDs im DOM:', 
        Array.from(document.querySelectorAll('[id^="message-"]')).map(el => el.id)
      );
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-surface rounded-lg shadow-2xl w-full max-w-5xl h-[80vh] flex flex-col overflow-hidden relative">
        
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border bg-surface/95 backdrop-blur relative z-[9999]">
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

          {/* Right Side Actions */}
          <div className="flex items-center space-x-2">
            {/* Project Filter Dropdown - NEU GEBAUT */}
            <div className="relative" ref={dropdownRef}>
              <div className="flex items-center bg-overlay rounded-lg overflow-hidden">
                <button
                  onClick={() => setShowProjectDropdown(!showProjectDropdown)}
                  className="flex items-center space-x-2 px-3 py-2 text-sm hover:bg-overlay/80 transition-colors"
                >
                  <FolderIcon className="w-4 h-4" />
                  <span className="hidden md:inline">
                    {currentProject ? currentProject.name : 'Alle Projekte'}
                  </span>
                  <span className="md:hidden">{currentProject ? currentProject.icon : '📁'}</span>
                  <ChevronDownIcon className="w-4 h-4" />
                </button>
                
                {/* Reset Button - nur anzeigen wenn ein Projekt ausgewählt ist */}
                {currentProject && (
                  <>
                    <div className="w-px h-6 bg-border"></div>
                    <button
                      onClick={() => {
                        onSwitchProject('');
                        setTimeout(() => {
                          messagesEndRef.current?.scrollIntoView({ behavior: 'auto' });
                        }, 0);
                      }}
                      className="px-2 py-2 hover:bg-overlay/80 transition-colors"
                      title="Filter zurücksetzen"
                    >
                      <svg className="w-4 h-4 text-text-secondary hover:text-text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </>
                )}
              </div>

            {showProjectDropdown && (
              <div className="absolute left-1/2 -translate-x-1/2 mt-2 w-80 bg-surface border border-border rounded-lg shadow-2xl z-[2000] overflow-hidden">
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
                placeholder="Channels & Nachrichten durchsuchen..."
                value={channelSearchQuery}
                onChange={(e) => setChannelSearchQuery(e.target.value)}
                className="w-full px-3 py-2 bg-overlay rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-glow-purple"
              />
            </div>

            {/* Message Search Results */}
            {channelSearchQuery && searchedMessages.length > 0 && (
              <div className="mb-6">
                <div className="flex items-center justify-between mb-3">
                  <div className="text-xs text-text-secondary font-semibold uppercase">
                    Nachrichten ({searchedMessages.length})
                  </div>
                  <button
                    onClick={() => setChannelSearchQuery('')}
                    className="text-xs text-glow-purple hover:text-glow-purple/80"
                  >
                    Zurücksetzen
                  </button>
                </div>
                <div className="space-y-3 max-h-[60vh] overflow-y-auto">
                  {searchedMessages.map(({ message, channel }) => {
                    const isOwnMessage = message.sender.id === currentUser.id;
                    const channelName = channel.type === ChatChannelType.Direct 
                      ? getDMPartnerName(channel)
                      : channel.name;
                    
                    return (
                      <button
                        key={message.id}
                        onClick={() => {
                          handleSwitchChannel(channel.id);
                          setShowSidebar(false);
                          setChannelSearchQuery('');
                          // Highlight the message after switching
                          setTimeout(() => {
                            setHighlightedMessageId(message.id);
                            const messageElement = document.getElementById(`message-${message.id}`);
                            messageElement?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                            setTimeout(() => setHighlightedMessageId(null), 2000);
                          }, 100);
                        }}
                        className="w-full text-left p-3 bg-overlay hover:bg-overlay/80 rounded-lg transition-colors"
                      >
                        {/* Channel Info */}
                        <div className="flex items-center space-x-2 mb-2">
                          {channel.type === ChatChannelType.Group ? (
                            <HashIcon className="w-3 h-3 text-text-secondary flex-shrink-0" />
                          ) : (
                            <img 
                              src={channel.members.find(m => m.id !== currentUser.id)?.avatarUrl} 
                              alt="" 
                              className="w-3 h-3 rounded-full flex-shrink-0" 
                            />
                          )}
                          <span className="text-xs text-text-secondary truncate">{channelName}</span>
                          <span className="text-xs text-text-secondary">•</span>
                          <span className="text-xs text-text-secondary">
                            {formatTimestamp(message.timestamp)}
                          </span>
                        </div>
                        
                        {/* Message Bubble */}
                        <div className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'}`}>
                          <div className={`
                            max-w-[85%] rounded-2xl px-3 py-2
                            ${isOwnMessage 
                              ? 'bg-glow-purple text-white rounded-br-sm' 
                              : 'bg-surface border border-border rounded-bl-sm'
                            }
                          `}>
                            {/* Sender Name (only for group chats and not own messages) */}
                            {!isOwnMessage && channel.type === ChatChannelType.Group && (
                              <div className="text-xs font-semibold text-glow-purple mb-1 flex items-center space-x-1">
                                <span>{message.sender.name}</span>
                                {message.starredBy?.includes(currentUser.id) && (
                                  <svg className="w-3 h-3 text-yellow-400 fill-current" viewBox="0 0 24 24">
                                    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                                  </svg>
                                )}
                              </div>
                            )}
                            
                            {/* Message Content */}
                            <div className="text-sm break-words">
                              {message.content.length > 100 
                                ? `${message.content.substring(0, 100)}...` 
                                : message.content
                              }
                            </div>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Show "No results" if searching but no messages found */}
            {channelSearchQuery && searchedMessages.length === 0 && filteredGroupChannels.length === 0 && (
              <div className="text-center py-8 text-text-secondary text-sm">
                Keine Ergebnisse gefunden
              </div>
            )}

            {/* Group Channels - only show when not searching messages */}
            {(!channelSearchQuery || searchedMessages.length === 0) && (
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
                        handleSwitchChannel(channel.id);
                        setShowSidebar(false);
                      }}
                      onContextMenu={(e) => handleChannelContextMenu(e, channel.id)}
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
            )}

            {/* Direct Messages - only show when not searching messages */}
            {(!channelSearchQuery || searchedMessages.length === 0) && (
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
                            handleSwitchChannel(existingDM.id);
                            setShowSidebar(false);
                          } else {
                            console.warn(`⚠️ Kein DM-Channel gefunden für User ${user.name}`);
                          }
                        }}
                        onContextMenu={(e) => existingDM && handleChannelContextMenu(e, existingDM.id)}
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
            )}
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
                  {/* Zurück-Button im Thread-Modus */}
                  {showThreadView && (
                    <button
                      onClick={() => {
                        setShowThreadView(null);
                        // Scrolle zur neuesten Nachricht (ganz unten)
                        requestAnimationFrame(() => {
                          messagesEndRef.current?.scrollIntoView({ behavior: 'auto' });
                        });
                      }}
                      className="p-2 hover:bg-overlay rounded-lg transition-colors"
                      title="Zurück zum Haupt-Chat"
                    >
                      <svg className="w-5 h-5 text-text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                      </svg>
                    </button>
                  )}
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
              className="flex-1 overflow-y-auto overflow-x-visible p-4 scrollbar-thin scrollbar-thumb-white/20 scrollbar-track-transparent hover:scrollbar-thumb-white/30"
              onClick={() => setContextMenu(null)}
            >
              {/* Im Thread-Modus: Zeige nur Thread-Nachrichten, sonst alle Nachrichten */}
              {(() => {
                const messagesToShow = showThreadView ? buildThreadChain(showThreadView) : filteredMessages;
                
                if (messagesToShow.length === 0) {
                  return (
                    <div className="flex items-center justify-center h-full text-text-secondary">
                      <div className="text-center">
                        <p className="text-lg mb-2">Noch keine Nachrichten</p>
                        <p className="text-sm">Starte eine Unterhaltung!</p>
                      </div>
                    </div>
                  );
                }
                
                return messagesToShow.map((message, index) => {
                  const isOwnMessage = message.sender.id === currentUser.id;
                  const prevMessage = index > 0 ? messagesToShow[index - 1] : null;
                  // Show avatar/timestamp if sender changed OR project changed
                  const showAvatar = !prevMessage || prevMessage.sender.id !== message.sender.id || prevMessage.projectId !== message.projectId;
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
                        id={`message-${message.id}`}
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
                          {/* Projekt-Tag & Timestamp */}
                          {showAvatar && (
                            <div className="flex items-center space-x-2 mb-1 px-1">
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
                              {/* Wrapper für Bubble und Hover-Menü */}
                              <div 
                                id={`message-${message.id}`}
                                className="relative transition-all duration-500"
                                onMouseEnter={() => handleMessageMouseEnter(message.id)}
                                onMouseLeave={handleMessageMouseLeave}
                              >
                                {/* Message Content Bubble */}
                                <div className={`rounded-2xl text-sm break-words bg-transparent text-text-primary rounded-br-md border border-transparent overflow-hidden ${
                                  message.content.trim() ? 'px-4 py-2.5' : 'p-0'
                                } ${highlightedMessageId === message.id ? 'glow-pulse' : ''}`}
                                  style={{
                                    background: 'linear-gradient(#141414, #141414) padding-box, linear-gradient(135deg, rgba(168, 85, 247, 0.3), rgba(236, 72, 153, 0.3), rgba(168, 85, 247, 0.3)) border-box',
                                    border: '1px solid transparent'
                                  }}
                                >
                                {(() => {
                                  const reply = parseReply(message.content);
                                  
                                  // Im Thread-Modus: Zeige nur actualContent ohne Reply-Referenz
                                  if (showThreadView) {
                                    const contentToShow = reply ? reply.actualContent : message.content;
                                    return (
                                      <>
                                        <div className="whitespace-pre-wrap">{renderTextWithLinks(contentToShow)}</div>
                                        {contentToShow.match(/https?:\/\/[^\s]+/) && (
                                          <div className="mt-2">
                                            <LinkPreview url={contentToShow.match(/https?:\/\/[^\s]+/)?.[0] || ''} />
                                          </div>
                                        )}
                                      </>
                                    );
                                  }
                                  
                                  // Haupt-Chat: Zeige Reply-Referenz wie gewohnt
                                  if (reply) {
                                    return (
                                      <>
                                        {/* Reply Reference */}
                                        <div 
                                          className="-mx-4 -mt-2.5 mb-2 px-4 pt-2.5 pb-2.5 bg-glow-purple/10 rounded-t-2xl cursor-pointer hover:bg-glow-purple/15 transition-all"
                                          onClick={() => {
                                            console.log('🔍 Suche Original-Nachricht:', {
                                              senderName: reply.senderName,
                                              replyContent: reply.replyContent,
                                              mediaType: reply.mediaType
                                            });
                                            
                                            const originalMsg = messages.find(m => {
                                              if (m.sender.name !== reply.senderName) return false;
                                              
                                              console.log('📝 Prüfe Nachricht:', {
                                                id: m.id,
                                                content: m.content.substring(0, 50),
                                                hasAttachments: !!m.attachments,
                                                attachments: m.attachments?.map(a => ({ name: a.name, type: a.type }))
                                              });
                                              
                                              // Für Medien-Nachrichten - prüfe zuerst ob es ein Medien-Zitat ist
                                              if (reply.mediaType && m.attachments && m.attachments.length > 0) {
                                                const match = m.attachments.some(att => {
                                                  // Prüfe nach Medien-Typ
                                                  if (reply.mediaType === 'image' && isImageFile(att.type)) return true;
                                                  if (reply.mediaType === 'video' && isVideoFile(att.type)) return true;
                                                  if (reply.mediaType === 'voice' && att.name.startsWith('voice-')) return true;
                                                  if (reply.mediaType === 'audio' && isAudioFile(att.type) && !att.name.startsWith('voice-')) return true;
                                                  // Für Dateien: prüfe nach Namen
                                                  if (reply.mediaType === 'file' && att.name === reply.replyContent) return true;
                                                  return false;
                                                });
                                                if (match) {
                                                  console.log('✅ Medien-Match gefunden!');
                                                  return true;
                                                }
                                              }
                                              
                                              // Für Text-Nachrichten
                                              if (m.content.includes(reply.replyContent)) {
                                                console.log('✅ Text-Match gefunden!');
                                                return true;
                                              }
                                              
                                              return false;
                                            });
                                            
                                            console.log('🎯 Ergebnis:', originalMsg ? `Gefunden: ${originalMsg.id}` : 'Nicht gefunden');
                                            if (originalMsg) scrollToMessage(originalMsg.id);
                                          }}
                                        >
                                          <div className="flex items-center justify-between mb-1">
                                            <div className="flex items-center space-x-2">
                                              {/* Icon basierend auf Medien-Typ */}
                                              {reply.mediaType === 'image' ? (
                                                <svg className="w-3.5 h-3.5 text-glow-purple" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                                </svg>
                                              ) : reply.mediaType === 'video' ? (
                                                <svg className="w-3.5 h-3.5 text-glow-purple" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                                </svg>
                                              ) : reply.mediaType === 'voice' ? (
                                                <svg className="w-3.5 h-3.5 text-glow-purple" fill="currentColor" viewBox="0 0 24 24">
                                                  <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z"/>
                                                  <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/>
                                                </svg>
                                              ) : reply.mediaType === 'audio' ? (
                                                <svg className="w-3.5 h-3.5 text-glow-purple" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
                                                </svg>
                                              ) : reply.mediaType === 'file' ? (
                                                <svg className="w-3.5 h-3.5 text-glow-purple" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                                                </svg>
                                              ) : (
                                                <svg className="w-3.5 h-3.5 text-glow-purple" fill="currentColor" viewBox="0 0 24 24">
                                                  <path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10h-9.983zm-14.017 0v-7.391c0-5.704 3.748-9.57 9-10.609l.996 2.151c-2.433.917-3.996 3.638-3.996 5.849h3.983v10h-9.983z"/>
                                                </svg>
                                              )}
                                              <span className="text-xs text-glow-purple font-semibold">{reply.senderName}</span>
                                            </div>
                                            {/* Thread View Button - nur anzeigen wenn mehr als 1 Reply (also > 2 Nachrichten) */}
                                            {buildThreadChain(message.id).length > 2 && (
                                              <button
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  e.preventDefault();
                                                  setShowThreadView(message.id);
                                                }}
                                                className="p-1 hover:bg-glow-purple/20 rounded transition-colors"
                                                title="Thread anzeigen"
                                              >
                                                <svg className="w-3.5 h-3.5 text-glow-purple" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                                                </svg>
                                              </button>
                                            )}
                                          </div>
                                          <div className="text-xs text-text-secondary/90 line-clamp-2">{reply.replyContent}</div>
                                        </div>
                                        {/* Actual Message Content */}
                                        <div className="whitespace-pre-wrap">{renderTextWithLinks(reply.actualContent)}</div>
                                        {/* Link Preview - only for actual content, not reply */}
                                        {reply.actualContent.match(/https?:\/\/[^\s]+/) && (
                                          <div className="mt-2">
                                            <LinkPreview url={reply.actualContent.match(/https?:\/\/[^\s]+/)?.[0] || ''} />
                                          </div>
                                        )}
                                      </>
                                    );
                                  }
                                  return (
                                    <>
                                      <div className="whitespace-pre-wrap">{renderTextWithLinks(message.content)}</div>
                                      {/* Link Preview - for non-reply messages */}
                                      {message.content.match(/https?:\/\/[^\s]+/) && (
                                        <div className="mt-2">
                                          <LinkPreview url={message.content.match(/https?:\/\/[^\s]+/)?.[0] || ''} />
                                        </div>
                                      )}
                                    </>
                                  );
                                })()}
                                
                                {/* Attachments */}
                                {message.attachments && message.attachments.length > 0 && (
                                  <div className={`space-y-2 flex flex-col items-center ${message.content.trim() ? 'mt-2' : ''} ${highlightedMessageId === message.id ? 'glow-pulse' : ''}`}>
                                    {message.attachments.map((attachment, idx) => (
                                      <div key={idx} className="w-full flex justify-center">
                                        {isImageFile(attachment.type) ? (
                                          // Image Preview - Click to enlarge
                                          <img 
                                            src={attachment.url} 
                                            alt={attachment.name}
                                            onClick={() => setPreviewAttachment(attachment)}
                                            className={`cursor-pointer ${
                                              message.content.trim() ? 'max-w-[192px] rounded-lg' : 'max-w-[320px] rounded-2xl rounded-br-md'
                                            }`}
                                          />
                                        ) : isVideoFile(attachment.type) ? (
                                          // Video Preview - Click to enlarge
                                          <div 
                                            className="relative cursor-pointer group"
                                            onClick={() => setPreviewAttachment(attachment)}
                                          >
                                            <video 
                                              src={attachment.url} 
                                              className={`${
                                                message.content.trim() ? 'max-w-[192px] rounded-lg w-full' : 'max-w-[320px] rounded-2xl rounded-br-md'
                                              }`}
                                            />
                                            {/* Play Button Overlay */}
                                            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                              <div className="w-16 h-16 bg-black/60 rounded-full flex items-center justify-center">
                                                <svg className="w-8 h-8 text-white ml-1" fill="currentColor" viewBox="0 0 24 24">
                                                  <path d="M8 5v14l11-7z"/>
                                                </svg>
                                              </div>
                                            </div>
                                          </div>
                                        ) : isAudioFile(attachment.type) ? (
                                          // Audio Player - Different design for voice messages
                                          attachment.name.startsWith('voice-') ? (
                                            <VoiceMessagePlayer 
                                              url={attachment.url}
                                              hasText={!!message.content.trim()}
                                            />
                                          ) : (
                                            <AudioPlayer 
                                              url={attachment.url}
                                              name={attachment.name}
                                              hasText={!!message.content.trim()}
                                            />
                                          )
                                        ) : (
                                          // File Download Button
                                          <a
                                            href={attachment.url}
                                            download={attachment.name}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="flex items-center space-x-3 p-3 bg-overlay/50 hover:bg-overlay rounded-lg transition-colors max-w-xs"
                                          >
                                            <span className="text-2xl">{getFileIcon(attachment.type)}</span>
                                            <div className="flex-1 min-w-0">
                                              <div className="text-sm text-text-primary truncate">{attachment.name}</div>
                                              <div className="text-xs text-text-secondary">{formatFileSize(attachment.size)}</div>
                                            </div>
                                            <svg className="w-5 h-5 text-text-secondary flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                            </svg>
                                          </a>
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                )}
                                
                                {message.edited && (
                                  <span className="text-xs ml-2 italic text-text-secondary">
                                    (bearbeitet)
                                  </span>
                                )}
                              </div>
                              
                              {/* Emoji Reaction Bar für eigene Nachrichten - rechts unten an der Bubble (Overlay) */}
                              {/* Im Thread-Modus: Kein Hover-Menü anzeigen */}
                              {/* Zeige Menü wenn gehovered ODER wenn ein Untermenü offen ist */}
                              {(hoveredMessageId === message.id || showEmojiPicker === message.id || showMoreMenu === message.id) && isOwnMessage && !showThreadView && (
                                <div 
                                  className="message-hover-menu absolute -bottom-8 right-0 flex items-center bg-surface border border-border rounded-lg shadow-lg z-[100]"
                                  onMouseEnter={() => handleMessageMouseEnter(message.id)}
                                  onMouseLeave={handleMessageMouseLeave}
                                >
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
                                          calculateMenuPosition(e);
                                          // Schließe More Menu wenn Emoji Picker geöffnet wird
                                          if (showEmojiPicker !== message.id) {
                                            setShowMoreMenu(null);
                                          }
                                          setShowEmojiPicker(showEmojiPicker === message.id ? null : message.id);
                                          setEmojiSearchQuery(''); // Reset search when opening
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
                                        <div 
                                          className={`emoji-picker-menu absolute right-0 bg-surface border border-border rounded-lg shadow-2xl z-[500] w-64 ${
                                            menuPosition === 'top' ? 'bottom-full mb-2' : 'top-full mt-2'
                                          }`}
                                          onClick={(e) => e.stopPropagation()}
                                        >
                                          {/* Search Bar */}
                                          <div className="p-2 border-b border-border">
                                            <input
                                              type="text"
                                              value={emojiSearchQuery}
                                              onChange={(e) => setEmojiSearchQuery(e.target.value)}
                                              placeholder="Emoji suchen..."
                                              className="w-full px-2 py-1.5 bg-overlay rounded text-xs focus:outline-none focus:ring-1 focus:ring-glow-purple"
                                            />
                                          </div>
                                          
                                          {/* Emoji Grid - Alle Kategorien zusammen */}
                                          <div className="p-2 max-h-64 overflow-y-auto">
                                            <div className="grid grid-cols-8 gap-0.5">
                                              {getFilteredEmojis().map((emoji, index) => (
                                                <button
                                                  key={`${emoji}-${index}`}
                                                  onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleReaction(message.id, emoji);
                                                  }}
                                                  className="text-lg hover:bg-overlay rounded p-1 transition-all hover:scale-110"
                                                  title={`Mit ${emoji} reagieren`}
                                                >
                                                  {emoji}
                                                </button>
                                              ))}
                                            </div>
                                            {getFilteredEmojis().length === 0 && (
                                              <div className="text-center text-text-secondary text-xs py-4">
                                                Keine Emojis gefunden
                                              </div>
                                            )}
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
                                          calculateMenuPosition(e);
                                          // Schließe Emoji Picker wenn More Menu geöffnet wird
                                          if (showMoreMenu !== message.id) {
                                            setShowEmojiPicker(null);
                                          }
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
                                        <div 
                                          className={`more-options-menu absolute right-0 bg-surface border border-border rounded-lg shadow-2xl py-0.5 z-[500] min-w-[200px] ${
                                            menuPosition === 'top' ? 'bottom-full mb-2' : 'top-full mt-2'
                                          }`}
                                          onClick={(e) => e.stopPropagation()}
                                        >
                                          {/* Markieren */}
                                          <button
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              handleStarMessage(message.id);
                                            }}
                                            className="w-full px-3 py-1.5 text-left text-xs hover:bg-overlay transition-colors flex items-center space-x-2"
                                          >
                                            <svg className="w-3.5 h-3.5 text-text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                                            </svg>
                                            <span className="text-text-primary">Markieren</span>
                                          </button>
                                          
                                          <div className="border-t border-border my-1"></div>
                                          
                                          {/* Kopieren */}
                                          <button
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              navigator.clipboard.writeText(message.content);
                                              setShowMoreMenu(null);
                                            }}
                                            className="w-full px-3 py-1.5 text-left text-xs hover:bg-overlay transition-colors flex items-center space-x-2"
                                          >
                                            <svg className="w-3.5 h-3.5 text-text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                            </svg>
                                            <span className="text-text-primary">Kopieren</span>
                                          </button>
                                          
                                          <div className="border-t border-border my-1"></div>
                                          
                                          {/* Dateien herunterladen (wenn Attachments vorhanden) */}
                                          {message.attachments && message.attachments.length > 0 && (
                                            <>
                                              {message.attachments.map((attachment, idx) => (
                                                <button
                                                  key={idx}
                                                  onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleDownloadAttachment(attachment);
                                                  }}
                                                  className="w-full px-3 py-1.5 text-left text-xs hover:bg-overlay transition-colors flex items-center space-x-2"
                                                >
                                                  <svg className="w-3.5 h-3.5 text-text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                                  </svg>
                                                  <span className="text-text-primary">Herunterladen</span>
                                                </button>
                                              ))}
                                              <div className="border-t border-border my-1"></div>
                                            </>
                                          )}
                                          
                                          {/* Bearbeiten (nur eigene Nachrichten) */}
                                          {isOwnMessage && canEditMessage(message.timestamp) && (
                                            <button
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                setEditingMessageId(message.id);
                                                setEditingContent(message.content);
                                                setShowMoreMenu(null);
                                              }}
                                              className="w-full px-3 py-1.5 text-left text-xs hover:bg-overlay transition-colors flex items-center space-x-2"
                                            >
                                              <EditIcon className="w-3.5 h-3.5 text-text-secondary" />
                                              <span className="text-text-primary">Nachricht bearbeiten</span>
                                            </button>
                                          )}
                                          
                                          {/* Löschen (nur eigene Nachrichten) */}
                                          {isOwnMessage && canEditMessage(message.timestamp) && (
                                            <button
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                setDeleteConfirmMessageId(message.id);
                                                setShowMoreMenu(null);
                                              }}
                                              className="w-full px-3 py-1.5 text-left text-xs hover:bg-overlay transition-colors flex items-center space-x-2 text-red-500"
                                            >
                                              <TrashIcon className="w-3.5 h-3.5" />
                                              <span>Löschen</span>
                                            </button>
                                          )}
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              )}
                            </div>

                            {/* Reactions Display für eigene Nachrichten */}
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
                                  <div className="flex items-center space-x-1">
                                    <span className="font-semibold text-xs text-text-primary">{message.sender.name}</span>
                                    {message.starredBy?.includes(currentUser.id) && (
                                      <svg className="w-3 h-3 text-yellow-400 fill-current" viewBox="0 0 24 24">
                                        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                                      </svg>
                                    )}
                                  </div>
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
                                  id={`message-${message.id}`}
                                  className="relative transition-all duration-500"
                                  onMouseEnter={() => handleMessageMouseEnter(message.id)}
                                  onMouseLeave={handleMessageMouseLeave}
                                >
                                  {/* Message Content Bubble */}
                                  <div className={`rounded-2xl text-sm break-words bg-overlay text-text-primary rounded-bl-md overflow-hidden ${
                                    message.content.trim() ? 'px-4 py-2.5' : 'p-0'
                                  } ${highlightedMessageId === message.id ? 'glow-pulse' : ''}`}>
                                    {(() => {
                                      const reply = parseReply(message.content);
                                      
                                      // Im Thread-Modus: Zeige nur actualContent ohne Reply-Referenz
                                      if (showThreadView) {
                                        const contentToShow = reply ? reply.actualContent : message.content;
                                        return (
                                          <>
                                            <div className="whitespace-pre-wrap">{renderTextWithLinks(contentToShow)}</div>
                                            {contentToShow.match(/https?:\/\/[^\s]+/) && (
                                              <div className="mt-2">
                                                <LinkPreview url={contentToShow.match(/https?:\/\/[^\s]+/)?.[0] || ''} />
                                              </div>
                                            )}
                                          </>
                                        );
                                      }
                                      
                                      // Haupt-Chat: Zeige Reply-Referenz wie gewohnt
                                      if (reply) {
                                        return (
                                          <>
                                            {/* Reply Reference */}
                                            <div 
                                              className="-mx-4 -mt-2.5 mb-2 px-4 pt-2.5 pb-2.5 bg-glow-purple/10 rounded-t-2xl cursor-pointer hover:bg-glow-purple/15 transition-all"
                                              onClick={() => {
                                                // Find original message and scroll to it
                                                const originalMsg = messages.find(m => {
                                                  if (m.sender.name !== reply.senderName) return false;
                                                  
                                                  // Für Medien-Nachrichten - prüfe zuerst ob es ein Medien-Zitat ist
                                                  if (reply.mediaType && m.attachments && m.attachments.length > 0) {
                                                    const match = m.attachments.some(att => {
                                                      // Prüfe nach Medien-Typ
                                                      if (reply.mediaType === 'image' && isImageFile(att.type)) return true;
                                                      if (reply.mediaType === 'video' && isVideoFile(att.type)) return true;
                                                      if (reply.mediaType === 'voice' && att.name.startsWith('voice-')) return true;
                                                      if (reply.mediaType === 'audio' && isAudioFile(att.type) && !att.name.startsWith('voice-')) return true;
                                                      // Für Dateien: prüfe nach Namen
                                                      if (reply.mediaType === 'file' && att.name === reply.replyContent) return true;
                                                      return false;
                                                    });
                                                    if (match) return true;
                                                  }
                                                  
                                                  // Für Text-Nachrichten
                                                  if (m.content.includes(reply.replyContent)) return true;
                                                  
                                                  return false;
                                                });
                                                if (originalMsg) scrollToMessage(originalMsg.id);
                                              }}
                                            >
                                              <div className="flex items-center justify-between mb-1">
                                                <div className="flex items-center space-x-2">
                                                  {/* Icon basierend auf Medien-Typ */}
                                                  {reply.mediaType === 'image' ? (
                                                    <svg className="w-3.5 h-3.5 text-glow-purple" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                                    </svg>
                                                  ) : reply.mediaType === 'video' ? (
                                                    <svg className="w-3.5 h-3.5 text-glow-purple" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                                    </svg>
                                                  ) : reply.mediaType === 'voice' ? (
                                                    <svg className="w-3.5 h-3.5 text-glow-purple" fill="currentColor" viewBox="0 0 24 24">
                                                      <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z"/>
                                                      <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/>
                                                    </svg>
                                                  ) : reply.mediaType === 'audio' ? (
                                                    <svg className="w-3.5 h-3.5 text-glow-purple" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
                                                    </svg>
                                                  ) : reply.mediaType === 'file' ? (
                                                    <svg className="w-3.5 h-3.5 text-glow-purple" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                                                    </svg>
                                                  ) : (
                                                    <svg className="w-3.5 h-3.5 text-glow-purple" fill="currentColor" viewBox="0 0 24 24">
                                                      <path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10h-9.983zm-14.017 0v-7.391c0-5.704 3.748-9.57 9-10.609l.996 2.151c-2.433.917-3.996 3.638-3.996 5.849h3.983v10h-9.983z"/>
                                                    </svg>
                                                  )}
                                                  <span className="text-xs text-glow-purple font-semibold">{reply.senderName}</span>
                                                </div>
                                                {/* Thread View Button - nur anzeigen wenn mehr als 1 Reply (also > 2 Nachrichten) */}
                                                {buildThreadChain(message.id).length > 2 && (
                                                  <button
                                                    onClick={(e) => {
                                                      e.stopPropagation();
                                                      e.preventDefault();
                                                      setShowThreadView(message.id);
                                                    }}
                                                    className="p-1 hover:bg-glow-purple/20 rounded transition-colors"
                                                    title="Thread anzeigen"
                                                  >
                                                    <svg className="w-3.5 h-3.5 text-glow-purple" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                                                    </svg>
                                                  </button>
                                                )}
                                              </div>
                                              <div className="text-xs text-text-secondary/90 line-clamp-2">{reply.replyContent}</div>
                                            </div>
                                            {/* Actual Message Content */}
                                            <div className="whitespace-pre-wrap">{renderTextWithLinks(reply.actualContent)}</div>
                                            {/* Link Preview - only for actual content, not reply */}
                                            {reply.actualContent.match(/https?:\/\/[^\s]+/) && (
                                              <div className="mt-2">
                                                <LinkPreview url={reply.actualContent.match(/https?:\/\/[^\s]+/)?.[0] || ''} />
                                              </div>
                                            )}
                                          </>
                                        );
                                      }
                                      return (
                                        <>
                                          <div className="whitespace-pre-wrap">{renderTextWithLinks(message.content)}</div>
                                          {/* Link Preview - for non-reply messages */}
                                          {message.content.match(/https?:\/\/[^\s]+/) && (
                                            <div className="mt-2">
                                              <LinkPreview url={message.content.match(/https?:\/\/[^\s]+/)?.[0] || ''} />
                                            </div>
                                          )}
                                        </>
                                      );
                                    })()}
                                    
                                    {/* Attachments */}
                                    {message.attachments && message.attachments.length > 0 && (
                                      <div className={`space-y-2 flex flex-col items-center ${message.content.trim() ? 'mt-2' : ''} ${highlightedMessageId === message.id ? 'glow-pulse' : ''}`}>
                                        {message.attachments.map((attachment, idx) => (
                                          <div key={idx} className="w-full flex justify-center">
                                            {attachment.url.startsWith('blob:') ? (
                                              // Uploading - Show clean loader animation only
                                              <div className="flex items-center justify-center py-12 px-16">
                                                <div className="upload-loader" style={{ transform: 'scale(0.7)' }}></div>
                                              </div>
                                            ) : isImageFile(attachment.type) ? (
                                              // Image Preview - Click to enlarge
                                              <img 
                                                src={attachment.url} 
                                                alt={attachment.name}
                                                onClick={() => setPreviewAttachment(attachment)}
                                                onError={(e) => {
                                                  console.error('❌ Image load error:', {
                                                    url: attachment.url,
                                                    name: attachment.name,
                                                    type: attachment.type
                                                  });
                                                  // Fallback: Zeige Dateinamen wenn Bild nicht lädt
                                                  e.currentTarget.style.display = 'none';
                                                }}
                                                onLoad={() => {
                                                  console.log('✅ Image loaded successfully:', attachment.url);
                                                }}
                                                className={`cursor-pointer ${
                                                  message.content.trim() ? 'max-w-[192px] rounded-lg' : 'max-w-[320px] rounded-2xl rounded-bl-md'
                                                }`}
                                              />
                                            ) : isVideoFile(attachment.type) ? (
                                              // Video Preview - Click to enlarge
                                              <div 
                                                className="relative cursor-pointer group"
                                                onClick={() => setPreviewAttachment(attachment)}
                                              >
                                                <video 
                                                  src={attachment.url} 
                                                  className={`${
                                                    message.content.trim() ? 'max-w-[192px] rounded-lg w-full' : 'max-w-[320px] rounded-2xl rounded-bl-md'
                                                  }`}
                                                />
                                                {/* Play Button Overlay */}
                                                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                                  <div className="w-16 h-16 bg-black/60 rounded-full flex items-center justify-center">
                                                    <svg className="w-8 h-8 text-white ml-1" fill="currentColor" viewBox="0 0 24 24">
                                                      <path d="M8 5v14l11-7z"/>
                                                    </svg>
                                                  </div>
                                                </div>
                                              </div>
                                            ) : isAudioFile(attachment.type) ? (
                                              // Audio Player - Different design for voice messages
                                              attachment.name.startsWith('voice-') ? (
                                                <VoiceMessagePlayer 
                                                  url={attachment.url}
                                                  hasText={!!message.content.trim()}
                                                />
                                              ) : (
                                                <AudioPlayer 
                                                  url={attachment.url}
                                                  name={attachment.name}
                                                  hasText={!!message.content.trim()}
                                                />
                                              )
                                            ) : (
                                              // File Download Button
                                              <a
                                                href={attachment.url}
                                                download={attachment.name}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="flex items-center space-x-3 p-3 bg-surface/50 hover:bg-surface rounded-lg transition-colors max-w-xs"
                                              >
                                                <span className="text-2xl">{getFileIcon(attachment.type)}</span>
                                                <div className="flex-1 min-w-0">
                                                  <div className="text-sm text-text-primary truncate">{attachment.name}</div>
                                                  <div className="text-xs text-text-secondary">{formatFileSize(attachment.size)}</div>
                                                </div>
                                                <svg className="w-5 h-5 text-text-secondary flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                                </svg>
                                              </a>
                                            )}
                                          </div>
                                        ))}
                                      </div>
                                    )}
                                    
                                    {message.edited && (
                                      <span className="text-xs ml-2 italic text-text-secondary">
                                        (bearbeitet)
                                      </span>
                                    )}
                                  </div>
                                  
                                  {/* Emoji Reaction Bar - rechts unten an der Bubble (Overlay) */}
                                  {/* Im Thread-Modus: Kein Hover-Menü anzeigen */}
                                  {/* Zeige Menü wenn gehovered ODER wenn ein Untermenü offen ist */}
                                  {(hoveredMessageId === message.id || showEmojiPicker === message.id || showMoreMenu === message.id) && !isOwnMessage && !showThreadView && (
                                    <div 
                                      className="message-hover-menu absolute -bottom-8 left-0 flex items-center bg-surface border border-border rounded-lg shadow-lg z-[100]"
                                      onMouseEnter={() => handleMessageMouseEnter(message.id)}
                                      onMouseLeave={handleMessageMouseLeave}
                                    >
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
                                              calculateMenuPosition(e);
                                              // Schließe More Menu wenn Emoji Picker geöffnet wird
                                              if (showEmojiPicker !== message.id) {
                                                setShowMoreMenu(null);
                                              }
                                              setShowEmojiPicker(showEmojiPicker === message.id ? null : message.id);
                                              setEmojiSearchQuery('');
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
                                            <div 
                                              className={`emoji-picker-menu absolute left-0 bg-surface border border-border rounded-lg shadow-2xl z-[500] w-64 ${
                                                menuPosition === 'top' ? 'bottom-full mb-2' : 'top-full mt-2'
                                              }`}
                                              onClick={(e) => e.stopPropagation()}
                                            >
                                              {/* Search Bar */}
                                              <div className="p-2 border-b border-border">
                                                <input
                                                  type="text"
                                                  value={emojiSearchQuery}
                                                  onChange={(e) => setEmojiSearchQuery(e.target.value)}
                                                  placeholder="Emoji suchen..."
                                                  className="w-full px-2 py-1.5 bg-overlay rounded text-xs focus:outline-none focus:ring-1 focus:ring-glow-purple"
                                                />
                                              </div>
                                              
                                              {/* Emoji Grid - Alle Kategorien zusammen */}
                                              <div className="p-2 max-h-64 overflow-y-auto">
                                                <div className="grid grid-cols-8 gap-0.5">
                                                  {getFilteredEmojis().map((emoji, index) => (
                                                    <button
                                                      key={`${emoji}-${index}`}
                                                      onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleReaction(message.id, emoji);
                                                      }}
                                                      className="text-lg hover:bg-overlay rounded p-1 transition-all hover:scale-110"
                                                      title={`Mit ${emoji} reagieren`}
                                                    >
                                                      {emoji}
                                                    </button>
                                                  ))}
                                                </div>
                                                {getFilteredEmojis().length === 0 && (
                                                  <div className="text-center text-text-secondary text-xs py-4">
                                                    Keine Emojis gefunden
                                                  </div>
                                                )}
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
                                              calculateMenuPosition(e);
                                              // Schließe Emoji Picker wenn More Menu geöffnet wird
                                              if (showMoreMenu !== message.id) {
                                                setShowEmojiPicker(null);
                                              }
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
                                            <div 
                                              className={`more-options-menu absolute left-0 bg-surface border border-border rounded-lg shadow-2xl py-0.5 z-[500] min-w-[200px] ${
                                                menuPosition === 'top' ? 'bottom-full mb-2' : 'top-full mt-2'
                                              }`}
                                              onClick={(e) => e.stopPropagation()}
                                            >
                                              {/* Markieren */}
                                              <button
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  handleStarMessage(message.id);
                                                }}
                                                className="w-full px-3 py-1.5 text-left text-xs hover:bg-overlay transition-colors flex items-center space-x-2"
                                              >
                                                <svg className="w-3.5 h-3.5 text-text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                                                </svg>
                                                <span className="text-text-primary">Markieren</span>
                                              </button>
                                              
                                              <div className="border-t border-border my-0.5"></div>
                                              
                                              {/* Kopieren */}
                                              <button
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  navigator.clipboard.writeText(message.content);
                                                  setShowMoreMenu(null);
                                                }}
                                                className="w-full px-3 py-1.5 text-left text-xs hover:bg-overlay transition-colors flex items-center space-x-2"
                                              >
                                                <svg className="w-3.5 h-3.5 text-text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                                </svg>
                                                <span className="text-text-primary">Kopieren</span>
                                              </button>
                                              
                                              <div className="border-t border-border my-0.5"></div>
                                              
                                              {/* Dateien herunterladen (wenn Attachments vorhanden) */}
                                              {message.attachments && message.attachments.length > 0 && (
                                                <>
                                                  {message.attachments.map((attachment, idx) => (
                                                    <button
                                                      key={idx}
                                                      onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleDownloadAttachment(attachment);
                                                      }}
                                                      className="w-full px-3 py-1.5 text-left text-xs hover:bg-overlay transition-colors flex items-center space-x-2"
                                                    >
                                                      <svg className="w-3.5 h-3.5 text-text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                                      </svg>
                                                      <span className="text-text-primary">Herunterladen</span>
                                                    </button>
                                                  ))}
                                                </>
                                              )}
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                  )}
                                </div>

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
                });
              })()}
              {/* Spacer for hover menu - ensures last message has room for the hover menu */}
              <div className="h-4" />
              <div ref={messagesEndRef} />
            </div>

            {/* Message Input */}
            {currentChannel && (
              <div className="p-4 border-t border-transparent bg-transparent">
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
                
                {/* Selected Files Preview */}
                {selectedFiles.length > 0 && (
                  <div className="mb-3 flex flex-wrap gap-2">
                    {selectedFiles.map((file, index) => (
                      <div key={index} className="flex items-center space-x-2 bg-overlay px-3 py-2 rounded-lg">
                        <span className="text-xs text-text-primary truncate max-w-[150px]">{file.name}</span>
                        <span className="text-xs text-text-secondary">{formatFileSize(file.size)}</span>
                        <button
                          onClick={() => removeSelectedFile(index)}
                          className="text-text-secondary hover:text-red-500 transition-colors"
                        >
                          <XIcon className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex items-center space-x-3">
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                  
                  {/* Datei-Button - bleibt immer gleich */}
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="p-3 rounded-full bg-overlay hover:bg-overlay/80 transition-colors flex-shrink-0"
                    title="Datei anhängen"
                  >
                    <svg className="w-5 h-5 text-text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                    </svg>
                  </button>
                  
                  {/* Mittlerer Bereich - Text oder Audio-Tool */}
                  {isRecording ? (
                    // Aufnahme-Modus
                    <div className="flex-1 flex items-center space-x-3 bg-overlay px-4 rounded-full" style={{ height: '44px' }}>
                      {/* Scrolling Waveform - volle Breite */}
                      <div className="flex items-center justify-between flex-1 min-w-0 overflow-hidden" style={{ height: '28px' }}>
                        {(() => {
                          // Immer 100 Balken anzeigen, von rechts nach links scrollend
                          const targetBars = 100;
                          let displayWaveform: number[];
                          
                          if (recordedWaveform.length === 0) {
                            // Zu Beginn: leere Balken
                            displayWaveform = new Array(targetBars).fill(0);
                          } else if (recordedWaveform.length < targetBars) {
                            // Auffüllen: alte Samples links (0), neue rechts
                            displayWaveform = [
                              ...new Array(targetBars - recordedWaveform.length).fill(0),
                              ...recordedWaveform
                            ];
                          } else {
                            // Voll: nur die letzten 100 Samples
                            displayWaveform = recordedWaveform.slice(-targetBars);
                          }
                          
                          return displayWaveform.map((level, index) => {
                            const amplifiedLevel = Math.min(1, level * 2);
                            const height = Math.max(3, amplifiedLevel * 28);
                            const opacity = level === 0 ? 0.1 : 0.3 + (amplifiedLevel * 0.7);
                            return (
                              <div
                                key={index}
                                className="bg-red-500 rounded-full"
                                style={{
                                  height: `${height}px`,
                                  opacity: opacity,
                                  width: '2px',
                                  flex: '1 1 0',
                                }}
                              />
                            );
                          });
                        })()}
                      </div>
                      
                      {/* Time Display */}
                      <span className="text-sm font-mono text-text-primary whitespace-nowrap">{formatRecordingTime(recordingTime)}</span>
                    </div>
                  ) : audioBlob ? (
                    // Wiedergabe-Modus
                    <div className="flex-1 flex items-center space-x-3 bg-overlay px-4 rounded-full" style={{ height: '44px' }}>
                      {/* Play/Pause Button - Links */}
                      <button
                        onClick={isPlayingRecording ? pausePlayback : playRecording}
                        className="p-2 hover:bg-glow-purple/20 rounded-full transition-colors flex-shrink-0"
                        title={isPlayingRecording ? "Pause" : "Abspielen"}
                      >
                        {isPlayingRecording ? (
                          <svg className="w-5 h-5 text-glow-purple" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z"/>
                          </svg>
                        ) : (
                          <svg className="w-5 h-5 text-glow-purple" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M8 5v14l11-7z"/>
                          </svg>
                        )}
                      </button>
                      
                      {/* Recorded Waveform */}
                      <div className="flex items-center justify-between flex-1 min-w-0 overflow-hidden" style={{ height: '28px' }}>
                        {(() => {
                          const targetBars = 100;
                          let displayWaveform: number[];
                          
                          if (recordedWaveform.length === 0) {
                            displayWaveform = new Array(targetBars).fill(0);
                          } else if (recordedWaveform.length <= targetBars) {
                            displayWaveform = [];
                            const repeatFactor = targetBars / recordedWaveform.length;
                            for (let i = 0; i < recordedWaveform.length; i++) {
                              const repeats = Math.ceil(repeatFactor);
                              for (let j = 0; j < repeats && displayWaveform.length < targetBars; j++) {
                                displayWaveform.push(recordedWaveform[i]);
                              }
                            }
                          } else {
                            const step = recordedWaveform.length / targetBars;
                            displayWaveform = [];
                            for (let i = 0; i < targetBars; i++) {
                              const index = Math.floor(i * step);
                              displayWaveform.push(recordedWaveform[index]);
                            }
                          }
                          
                          return displayWaveform.map((level, index) => {
                            const amplifiedLevel = Math.min(1, level * 2);
                            const height = Math.max(3, amplifiedLevel * 28);
                            return (
                              <div
                                key={index}
                                className="bg-glow-purple rounded-full"
                                style={{
                                  height: `${height}px`,
                                  opacity: 0.5,
                                  width: '2px',
                                  flex: '1 1 0',
                                }}
                              />
                            );
                          });
                        })()}
                      </div>
                      
                      {/* Time Display */}
                      <span className="text-sm font-mono text-text-primary whitespace-nowrap">{formatRecordingTime(recordingTime)}</span>
                      
                      {/* Delete Button */}
                      <button
                        onClick={cancelRecording}
                        className="p-2 hover:bg-red-500/20 rounded-full transition-colors flex-shrink-0"
                        title="Löschen"
                      >
                        <TrashIcon className="w-5 h-5 text-red-500" />
                      </button>
                    </div>
                  ) : (
                    // Normal Text-Modus
                    <div 
                      className="flex-1 relative"
                      onDragOver={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                      }}
                      onDrop={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        const files = Array.from(e.dataTransfer.files);
                        if (files.length > 0) {
                          setSelectedFiles(prev => [...prev, ...files]);
                        }
                      }}
                    >
                      <textarea
                        ref={textareaRef}
                        value={messageInput}
                        onChange={(e) => {
                          setMessageInput(e.target.value);
                          const target = e.target as HTMLTextAreaElement;
                          target.style.height = 'auto';
                          const newHeight = Math.max(44, Math.min(target.scrollHeight, 200));
                          target.style.height = newHeight + 'px';
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            handleSendMessage();
                          }
                        }}
                        placeholder={`Nachricht an ${currentChannel.type === ChatChannelType.Direct ? getDMPartnerName(currentChannel) : `#${currentChannel.name}`}...`}
                        className="w-full px-4 bg-overlay rounded-2xl text-sm focus:outline-none focus:ring-0 focus:border-transparent focus:shadow-none transition-all resize-none overflow-y-auto flex items-center caret-glow-purple placeholder:opacity-40"
                        rows={1}
                        style={{
                          height: '44px',
                          minHeight: '44px',
                          maxHeight: '200px',
                          paddingTop: '11px',
                          paddingBottom: '11px',
                          lineHeight: '22px',
                          boxShadow: 'none',
                        }}
                      />
                    </div>
                  )}
                  
                  {/* Rechter Button - Mikrofon/Stop/Send */}
                  <button
                    onClick={() => {
                      if (isRecording) {
                        stopRecording();
                      } else if (audioBlob) {
                        sendVoiceMessage();
                      } else if (messageInput.trim().length > 0 || selectedFiles.length > 0) {
                        handleSendMessage();
                      } else {
                        startRecording();
                      }
                    }}
                    disabled={false}
                    className="p-2.5 rounded-full transition-all relative overflow-hidden flex-shrink-0"
                    style={{
                      background: isRecording 
                        ? '#EF4444'
                        : (audioBlob || messageInput.trim().length > 0 || selectedFiles.length > 0)
                          ? 'linear-gradient(135deg, #A855F7, #EC4899, #A855F7)'
                          : 'var(--color-overlay)'
                    }}
                    title={isRecording ? "Aufnahme beenden" : audioBlob ? "Senden" : (messageInput.trim().length > 0 || selectedFiles.length > 0) ? "Senden" : "Aufnahme starten"}
                  >
                    {isRecording ? (
                      <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                        <rect x="6" y="6" width="12" height="12" />
                      </svg>
                    ) : (audioBlob || messageInput.trim().length > 0 || selectedFiles.length > 0) ? (
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

      {/* File Size Warning Modal */}
      {showFileSizeWarning && (
        <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4">
          <div className="bg-surface rounded-lg shadow-xl w-full max-w-md p-6">
            <div className="flex items-start space-x-3 mb-4">
              <div className="flex-shrink-0 w-10 h-10 bg-red-500/20 rounded-full flex items-center justify-center">
                <svg className="w-6 h-6 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-bold mb-2">Datei zu groß</h3>
                <p className="text-text-secondary text-sm mb-3">
                  Die Datei <span className="font-semibold text-text-primary">"{showFileSizeWarning.fileName}"</span> ist zu groß ({showFileSizeWarning.fileSize} MB).
                </p>
                <p className="text-text-secondary text-sm mb-4">
                  Das Upload-Limit beträgt <span className="font-semibold text-text-primary">{maxUploadSize} MB</span>.
                </p>
                <div className="bg-overlay rounded-lg p-3 mb-4">
                  <p className="text-sm text-text-secondary mb-2">
                    💡 <span className="font-semibold">Tipp:</span> Für größere Dateien empfehlen wir:
                  </p>
                  <a
                    href="https://drive.google.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center space-x-2 text-sm text-glow-purple hover:text-glow-purple/80 transition-colors"
                  >
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12.545 10.239v3.821h5.445c-.712 2.315-2.647 3.972-5.445 3.972a6.033 6.033 0 110-12.064c1.498 0 2.866.549 3.921 1.453l2.814-2.814A9.969 9.969 0 0012.545 2C7.021 2 2.543 6.477 2.543 12s4.478 10 10.002 10c8.396 0 10.249-7.85 9.426-11.748l-9.426-.013z"/>
                    </svg>
                    <span>Google Drive öffnen</span>
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                  </a>
                </div>
              </div>
            </div>

            <div className="flex justify-end space-x-2">
              <button
                onClick={() => setShowFileSizeWarning(null)}
                className="px-4 py-2 glow-button rounded-lg"
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Attachment Preview Modal */}
      {previewAttachment && (
        <div 
          className="fixed inset-0 bg-black/90 z-[100] flex items-center justify-center p-4"
          onClick={() => setPreviewAttachment(null)}
        >
          <div className="relative max-w-7xl max-h-[90vh] w-full h-full flex items-center justify-center">
            {/* Close Button */}
            <button
              onClick={() => setPreviewAttachment(null)}
              className="absolute top-4 right-4 p-2 bg-surface/80 hover:bg-surface rounded-full transition-colors z-10"
            >
              <XIcon className="w-6 h-6 text-text-primary" />
            </button>

            {/* Download Button */}
            <a
              href={previewAttachment.url}
              download={previewAttachment.name}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="absolute top-4 left-4 p-2 bg-surface/80 hover:bg-surface rounded-full transition-colors z-10"
              title="Herunterladen"
            >
              <svg className="w-6 h-6 text-text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
            </a>

            {/* File Info */}
            <div className="absolute bottom-4 left-4 right-4 bg-surface/80 backdrop-blur-sm rounded-lg p-4 z-10">
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-text-primary truncate">{previewAttachment.name}</div>
                  <div className="text-xs text-text-secondary">{formatFileSize(previewAttachment.size)}</div>
                </div>
              </div>
            </div>

            {/* Preview Content */}
            <div 
              className="flex items-center justify-center w-full h-full overflow-hidden"
              onWheel={handleWheel}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
              style={{ cursor: previewZoom > 1 ? (isDragging ? 'grabbing' : 'grab') : 'default' }}
            >
              {isImageFile(previewAttachment.type) ? (
                <img 
                  ref={previewImageRef}
                  src={previewAttachment.url} 
                  alt={previewAttachment.name}
                  className="max-w-full max-h-full object-contain rounded-lg transition-transform"
                  style={{
                    transform: `scale(${previewZoom}) translate(${previewPosition.x / previewZoom}px, ${previewPosition.y / previewZoom}px)`,
                    transformOrigin: 'center',
                    userSelect: 'none'
                  }}
                  onClick={(e) => e.stopPropagation()}
                  onDragStart={(e) => e.preventDefault()}
                />
              ) : isVideoFile(previewAttachment.type) ? (
                <video 
                  src={previewAttachment.url} 
                  controls
                  autoPlay
                  className="max-w-full max-h-full rounded-lg"
                  onClick={(e) => e.stopPropagation()}
                />
              ) : null}
            </div>
          </div>
        </div>
      )}

      {/* Delete All Messages Confirmation Modal */}
      {showDeleteAllConfirm && (
        <ConfirmModal
          title="Alle Nachrichten löschen?"
          message="Möchtest du wirklich alle Chat-Nachrichten löschen? Diese Aktion kann nicht rückgängig gemacht werden. Die Channels bleiben erhalten."
          confirmText="Alle löschen"
          cancelText="Abbrechen"
          onConfirm={() => {
            if (onDeleteAllMessages) {
              onDeleteAllMessages();
            }
            setShowDeleteAllConfirm(false);
          }}
          onCancel={() => setShowDeleteAllConfirm(false)}
          isDangerous={true}
        />
      )}
      
      {/* Channel Context Menu */}
      {channelContextMenu && (
        <>
          {/* Backdrop zum Schließen */}
          <div 
            className="fixed inset-0 z-[9998]" 
            onClick={() => setChannelContextMenu(null)}
          />
          
          {/* Context Menu */}
          <div
            className="fixed bg-surface border border-border rounded-lg shadow-2xl py-1 z-[9999] min-w-[200px]"
            style={{
              left: `${channelContextMenu.x}px`,
              top: `${channelContextMenu.y}px`,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => handleMarkChannelAsUnread(channelContextMenu.channelId)}
              className="w-full px-4 py-2 text-left text-sm hover:bg-overlay transition-colors flex items-center space-x-2"
            >
              <svg className="w-4 h-4 text-text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              <span className="text-text-primary">Als ungelesen markieren</span>
            </button>
          </div>
        </>
      )}
    </div>
  );
};
