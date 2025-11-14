import React, { createContext, useContext, useState, useEffect } from 'react';

interface GlowContextType {
  glowEnabled: boolean;
  toggleGlow: () => void;
}

const GlowContext = createContext<GlowContextType | undefined>(undefined);

export const GlowProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [glowEnabled, setGlowEnabled] = useState(() => {
    const saved = localStorage.getItem('glowEnabled');
    return saved !== null ? JSON.parse(saved) : true;
  });

  useEffect(() => {
    localStorage.setItem('glowEnabled', JSON.stringify(glowEnabled));
    
    // Toggle CSS class on body
    if (glowEnabled) {
      document.body.classList.add('glow-enabled');
      document.body.classList.remove('glow-disabled');
    } else {
      document.body.classList.add('glow-disabled');
      document.body.classList.remove('glow-enabled');
    }
  }, [glowEnabled]);

  const toggleGlow = () => {
    console.log('Toggle glow called, current state:', glowEnabled);
    setGlowEnabled(prev => {
      console.log('Setting glow to:', !prev);
      return !prev;
    });
  };

  return (
    <GlowContext.Provider value={{ glowEnabled, toggleGlow }}>
      {children}
    </GlowContext.Provider>
  );
};

export const useGlow = () => {
  const context = useContext(GlowContext);
  if (!context) {
    // Return default values if context is not available
    return {
      glowEnabled: true,
      toggleGlow: () => console.warn('GlowProvider not found')
    };
  }
  return context;
};
