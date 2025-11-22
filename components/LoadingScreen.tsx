import React from 'react';

interface LoadingScreenProps {
  message?: string;
}

export const LoadingScreen: React.FC<LoadingScreenProps> = ({ message = 'Daten werden geladen...' }) => {
  return (
    <div className="fixed inset-0 bg-background" style={{ willChange: 'opacity' }}>
      {/* Upload Loader Animation - absolut zentriert */}
      <div 
        className="upload-loader" 
        style={{ 
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%) scale(1.2)',
          marginTop: '-40px', // Leicht nach oben verschieben für optische Balance
          willChange: 'transform'
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
          animation: 'fadeIn 0.6s cubic-bezier(0.4, 0.0, 0.2, 1) 0.4s forwards', // Smooth fade-in
          willChange: 'opacity'
        }}
      >
        <p className="text-text-primary font-medium text-base tracking-wide whitespace-nowrap">{message}</p>
      </div>
    </div>
  );
};
