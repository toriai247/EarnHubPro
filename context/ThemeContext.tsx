
import React, { createContext, useContext, useState, useEffect } from 'react';

export type ThemeId = 'default' | 'premium';

interface ThemeContextType {
  theme: ThemeId;
  setTheme: (theme: ThemeId) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setThemeState] = useState<ThemeId>(() => {
    const saved = localStorage.getItem('eh_theme_id');
    return (saved === 'default' || saved === 'premium') ? saved : 'default';
  });

  useEffect(() => {
    const root = window.document.documentElement;
    
    // Remove all known theme classes
    root.classList.remove('default', 'premium');
    
    // Add selected theme class
    root.classList.add(theme);
    
    // Save to local storage
    localStorage.setItem('eh_theme_id', theme);
  }, [theme]);

  const setTheme = (newTheme: ThemeId) => {
    setThemeState(newTheme);
  };

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
