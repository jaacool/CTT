import React from 'react';

interface LoadingScreenProps {
  message?: string;
}

export const LoadingScreen: React.FC<LoadingScreenProps> = ({ message = 'Daten werden geladen...' }) => {
  return (
    <div 
      className="fixed inset-0 bg-background" 
      style={{ 
        willChange: 'opacity',
        backfaceVisibility: 'hidden',
        WebkitFontSmoothing: 'antialiased',
        transform: 'translateZ(0)'
      }}
    >
      {/* Upload Loader Animation - absolut zentriert */}
      <div 
        className="upload-loader" 
        style={{ 
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%) scale(1.2) translateZ(0)',
          marginTop: '-40px',
          willChange: 'transform',
          backfaceVisibility: 'hidden'
        }}
      ></div>
      
      {/* Message - absolut positioniert unter der Animation */}
      <div 
        className="text-center opacity-0"
        style={{ 
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%) translateZ(0)',
          marginTop: '80px',
          animation: 'fadeIn 0.8s ease-out 0.5s forwards',
          willChange: 'opacity',
          backfaceVisibility: 'hidden'
        }}
      >
        <p className="text-text-primary font-medium text-base tracking-wide whitespace-nowrap">{message}</p>
      </div>
    </div>
  );
};
