import React from 'react';

interface BottomBarProps {
  onOpenChat: () => void;
  onOpenTimeTracking?: () => void;
  unreadMessagesCount?: number;
}

export const BottomBar: React.FC<BottomBarProps> = ({
  onOpenChat,
  onOpenTimeTracking,
  unreadMessagesCount = 0,
}) => {
  return (
    <div className="fixed bottom-8 left-1/2 transform -translate-x-1/2 flex items-center space-x-2 transition-all duration-300 ease-in-out">
      {/* Chat Button */}
      <button
        onClick={onOpenChat}
        className="glow-button-highlight p-3 rounded-full shadow-lg relative"
      >
        <svg 
          xmlns="http://www.w3.org/2000/svg" 
          width="24" 
          height="24" 
          viewBox="0 0 24 24" 
          fill="none" 
          stroke="currentColor" 
          strokeWidth="2" 
          strokeLinecap="round" 
          strokeLinejoin="round" 
          className="w-6 h-6 text-text-primary"
        >
          <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path>
        </svg>
        
        {/* Unread Badge */}
        {unreadMessagesCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1 shadow-lg">
            {unreadMessagesCount > 99 ? '99+' : unreadMessagesCount}
          </span>
        )}
      </button>

      {/* Time Tracking Button (optional) */}
      {onOpenTimeTracking && (
        <button
          onClick={onOpenTimeTracking}
          className="glow-button backdrop-blur-md p-3 rounded-full shadow-lg hover:opacity-80 transition-all border border-glow-purple/30"
          title="Time Tracking starten"
        >
          <svg 
            xmlns="http://www.w3.org/2000/svg" 
            width="24" 
            height="24" 
            viewBox="0 0 24 24" 
            fill="none" 
            stroke="currentColor" 
            strokeWidth="2" 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            className="w-6 h-6 text-text-primary"
          >
            <circle cx="12" cy="12" r="10"></circle>
            <polyline points="12 6 12 12 16 14"></polyline>
          </svg>
        </button>
      )}
    </div>
  );
};
