import React from 'react';

interface LoadingScreenProps {
  message?: string;
}

export const LoadingScreen: React.FC<LoadingScreenProps> = ({ message = 'Daten werden geladen...' }) => {
  return (
    <div className="flex flex-col items-center justify-center h-full min-h-[400px] space-y-4">
      {/* Spinner */}
      <div className="relative w-16 h-16">
        <div className="absolute inset-0 border-4 border-overlay rounded-full"></div>
        <div className="absolute inset-0 border-4 border-glow-purple border-t-transparent rounded-full animate-spin"></div>
      </div>
      
      {/* Message */}
      <div className="text-center space-y-2">
        <p className="text-text-primary font-semibold">{message}</p>
        <p className="text-text-secondary text-sm">Einen Moment bitte...</p>
      </div>
      
      {/* Pulsing dots */}
      <div className="flex space-x-2">
        <div className="w-2 h-2 bg-glow-purple rounded-full animate-pulse" style={{ animationDelay: '0ms' }}></div>
        <div className="w-2 h-2 bg-glow-purple rounded-full animate-pulse" style={{ animationDelay: '150ms' }}></div>
        <div className="w-2 h-2 bg-glow-purple rounded-full animate-pulse" style={{ animationDelay: '300ms' }}></div>
      </div>
    </div>
  );
};
