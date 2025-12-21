
import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../integrations/supabase/client';

export type ThemeId = 'default' | 'premium' | 'lite' | 'midnight' | 'terminal' | 'solarized' | 'dracula' | 'material';

interface ThemeContextType {
  theme: ThemeId;
  setTheme: (theme: ThemeId) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setThemeState] = useState<ThemeId>(() => {
    const saved = localStorage.getItem('eh_theme_id');
    const validThemes = ['default', 'premium', 'lite', 'midnight', 'terminal', 'solarized', 'dracula', 'material'];
    return (validThemes.includes(saved as string)) ? (saved as ThemeId) : 'midnight';
  });

  useEffect(() => {
    const root = window.document.documentElement;
    const validThemes = ['default', 'premium', 'lite', 'midnight', 'terminal', 'solarized', 'dracula', 'material'];
    root.classList.remove(...validThemes);
    root.classList.add(theme);
    localStorage.setItem('eh_theme_id', theme);
  }, [theme]);

  useEffect(() => {
    const loadThemeFromDB = async () => {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
            const { data } = await supabase
                .from('profiles')
                .select('theme_id')
                .eq('id', session.user.id)
                .maybeSingle();
            
            if (data?.theme_id) {
                const dbTheme = data.theme_id as ThemeId;
                const validThemes = ['default', 'premium', 'lite', 'midnight', 'terminal', 'solarized', 'dracula', 'material'];
                if (validThemes.includes(dbTheme)) {
                    setThemeState(dbTheme);
                }
            }
        }
    };
    loadThemeFromDB();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
        if (event === 'SIGNED_IN') loadThemeFromDB();
    });

    return () => subscription.unsubscribe();
  }, []);

  const setTheme = async (newTheme: ThemeId) => {
    setThemeState(newTheme);
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
        await supabase.from('profiles').update({ theme_id: newTheme }).eq('id', session.user.id);
    }
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
