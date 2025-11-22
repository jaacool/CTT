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
        perspective: 1000,
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
          transform: 'translate3d(-50%, -50%, 0) scale(1.2)',
          marginTop: '-40px',
          willChange: 'transform',
          backfaceVisibility: 'hidden',
          WebkitFontSmoothing: 'antialiased',
          MozOsxFontSmoothing: 'grayscale'
        }}
      ></div>
      
      {/* Message - absolut positioniert unter der Animation */}
      <div 
        className="text-center opacity-0"
        style={{ 
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate3d(-50%, -50%, 0)',
          marginTop: '80px',
          animation: 'fadeIn 0.8s cubic-bezier(0.16, 1, 0.3, 1) 0.3s forwards',
          willChange: 'opacity',
          backfaceVisibility: 'hidden'
        }}
      >
        <p className="text-text-primary font-medium text-base tracking-wide whitespace-nowrap">{message}</p>
      </div>
    </div>
  );
};
