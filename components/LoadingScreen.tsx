import React, { useState, useEffect } from 'react';

interface LoadingScreenProps {
  message?: string;
}

export const LoadingScreen: React.FC<LoadingScreenProps> = ({ message = 'Daten werden geladen...' }) => {
  const [loadingSteps, setLoadingSteps] = useState<string[]>([]);
  
  useEffect(() => {
    // Simuliere Lade-Schritte für besseres Feedback
    const steps = [
      'Cache wird geprüft...',
      'Daten werden geladen...',
      'Fast fertig...'
    ];
    
    let currentStep = 0;
    const interval = setInterval(() => {
      if (currentStep < steps.length) {
        setLoadingSteps(prev => [...prev, steps[currentStep]]);
        currentStep++;
      }
    }, 500);
    
    return () => clearInterval(interval);
  }, []);
  
  return (
    <div className="flex flex-col items-center justify-center h-full min-h-[400px] space-y-6">
      {/* Logo/Icon */}
      <div className="text-6xl mb-4">📊</div>
      
      {/* Spinner */}
      <div className="relative w-20 h-20">
        <div className="absolute inset-0 border-4 border-overlay rounded-full"></div>
        <div className="absolute inset-0 border-4 border-glow-purple border-t-transparent rounded-full animate-spin"></div>
        {/* Inner spinner */}
        <div className="absolute inset-2 border-4 border-glow-cyan border-b-transparent rounded-full animate-spin" style={{ animationDirection: 'reverse', animationDuration: '1s' }}></div>
      </div>
      
      {/* Message */}
      <div className="text-center space-y-3">
        <p className="text-text-primary font-bold text-lg">{message}</p>
        <p className="text-text-secondary text-sm">Einen Moment bitte...</p>
        
        {/* Loading Steps */}
        <div className="mt-4 space-y-1 min-h-[60px]">
          {loadingSteps.map((step, index) => (
            <div 
              key={index} 
              className="text-text-secondary text-xs animate-fade-in"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              ✓ {step}
            </div>
          ))}
        </div>
      </div>
      
      {/* Pulsing dots */}
      <div className="flex space-x-2">
        <div className="w-3 h-3 bg-glow-purple rounded-full animate-pulse" style={{ animationDelay: '0ms' }}></div>
        <div className="w-3 h-3 bg-glow-cyan rounded-full animate-pulse" style={{ animationDelay: '150ms' }}></div>
        <div className="w-3 h-3 bg-glow-magenta rounded-full animate-pulse" style={{ animationDelay: '300ms' }}></div>
      </div>
    </div>
  );
};
