import React, { createContext, useContext, useState, useEffect } from 'react';

export type ThemeMode = 'glow' | 'blue' | 'original' | 'light';

interface GlowContextType {
  themeMode: ThemeMode;
  setThemeMode: (mode: ThemeMode) => void;
  // Legacy support
  glowEnabled: boolean;
  toggleGlow: () => void;
}

const GlowContext = createContext<GlowContextType | undefined>(undefined);

export const GlowProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [themeMode, setThemeModeState] = useState<ThemeMode>(() => {
    const saved = localStorage.getItem('themeMode');
    return (saved as ThemeMode) || 'glow';
  });

  useEffect(() => {
    localStorage.setItem('themeMode', themeMode);
    
    // Remove all theme classes
    document.body.classList.remove('glow-enabled', 'glow-disabled', 'theme-blue', 'theme-original', 'theme-light');
    
    // Add appropriate class
    if (themeMode === 'glow') {
      document.body.classList.add('glow-enabled');
    } else if (themeMode === 'blue') {
      document.body.classList.add('theme-blue');
    } else if (themeMode === 'light') {
      document.body.classList.add('theme-light');
    } else {
      document.body.classList.add('theme-original');
    }
  }, [themeMode]);

  const setThemeMode = (mode: ThemeMode) => {
    setThemeModeState(mode);
  };

  // Legacy support for old toggle
  const glowEnabled = themeMode === 'glow';
  const toggleGlow = () => {
    setThemeModeState(prev => prev === 'glow' ? 'original' : 'glow');
  };

  return (
    <GlowContext.Provider value={{ themeMode, setThemeMode, glowEnabled, toggleGlow }}>
      {children}
    </GlowContext.Provider>
  );
};

export const useGlow = () => {
  const context = useContext(GlowContext);
  if (!context) {
    // Return default values if context is not available
    return {
      themeMode: 'glow' as ThemeMode,
      setThemeMode: () => console.warn('GlowProvider not found'),
      glowEnabled: true,
      toggleGlow: () => console.warn('GlowProvider not found')
    };
  }
  return context;
};
