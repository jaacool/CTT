import React from 'react';

interface LoadingScreenProps {
  message?: string;
}

export const LoadingScreen: React.FC<LoadingScreenProps> = ({ message = 'Daten werden geladen...' }) => {
  return (
    <div className="flex flex-col items-center justify-center h-full min-h-screen bg-background">
      {/* Logo/Icon mit subtiler Animation */}
      <div className="text-7xl mb-12 animate-fade-in">
        📊
      </div>
      
      {/* Upload Loader Animation - gleiche wie im Chat */}
      <div className="upload-loader mb-12" style={{ transform: 'scale(1.2)' }}></div>
      
      {/* Message - minimalistisch und clean */}
      <div className="text-center space-y-2 animate-fade-in" style={{ animationDelay: '200ms' }}>
        <p className="text-text-primary font-medium text-base tracking-wide">{message}</p>
      </div>
    </div>
  );
};
