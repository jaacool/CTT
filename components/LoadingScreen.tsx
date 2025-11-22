import React from 'react';

interface LoadingScreenProps {
  message?: string;
}

export const LoadingScreen: React.FC<LoadingScreenProps> = ({ message = 'Daten werden geladen...' }) => {
  return (
    <div className="fixed inset-0 bg-background">
      {/* Upload Loader Animation - absolut zentriert */}
      <div 
        className="upload-loader" 
        style={{ 
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%) scale(1.2)',
          marginTop: '-40px' // Leicht nach oben verschieben für optische Balance
        }}
      ></div>
      
      {/* Message - absolut positioniert unter der Animation */}
      <div 
        className="text-center opacity-0"
        style={{ 
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          marginTop: '80px',
          animation: 'fadeIn 0.3s ease-in-out 0.5s forwards' // Verzögert einblenden
        }}
      >
        <p className="text-text-primary font-medium text-base tracking-wide whitespace-nowrap">{message}</p>
      </div>
    </div>
  );
};
