
import React from 'react';
import GlassCard from '../components/GlassCard';
import { useTheme, ThemeId } from '../context/ThemeContext';
import { Check, Palette, Sparkles, Moon } from 'lucide-react';
import { motion } from 'framer-motion';

const Themes: React.FC = () => {
  const { theme, setTheme } = useTheme();

  const themes: { id: ThemeId; name: string; description: string; colors: string[]; icon: any }[] = [
    {
      id: 'default',
      name: 'Dark Blue (Classic)',
      description: 'The original high-contrast dark mode optimized for focus.',
      colors: ['#050505', '#111111', '#0055FF'],
      icon: Moon
    },
    {
      id: 'premium',
      name: 'Premium Future',
      description: 'Futuristic gradients, glassmorphism, and neon depth.',
      colors: ['#3B2CC9', '#6A30D9', '#8D4DFF'],
      icon: Sparkles
    }
  ];

  return (
    <div className="pb-24 sm:pl-20 sm:pt-6 space-y-6 px-4 sm:px-0 animate-fade-in">
      <header className="pt-4">
        <h1 className="text-2xl font-display font-bold text-main flex items-center gap-2">
          <Palette className="text-brand" /> Theme Select
        </h1>
        <p className="text-muted text-sm">Customize the look and feel of your dashboard.</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {themes.map((t) => (
          <motion.div
            key={t.id}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setTheme(t.id)}
            className="cursor-pointer relative group"
          >
            <GlassCard className={`relative overflow-hidden border-2 transition-all h-full ${theme === t.id ? 'border-brand shadow-glow' : 'border-border-base opacity-80 hover:opacity-100'}`}>
              
              {/* Preview Background */}
              <div 
                className="h-32 w-full rounded-xl mb-4 relative overflow-hidden"
                style={{
                  background: t.id === 'default' 
                    ? 'linear-gradient(to bottom right, #050505, #111111)' 
                    : 'linear-gradient(135deg, #1a0b2e 0%, #3B2CC9 50%, #6A30D9 100%)'
                }}
              >
                {/* Mock UI Elements */}
                <div className="absolute top-4 left-4 right-4 h-4 rounded-full bg-white/10 backdrop-blur-md"></div>
                <div className="absolute top-12 left-4 w-1/2 h-20 rounded-xl bg-white/5 backdrop-blur-md border border-white/5"></div>
                <div className="absolute top-12 right-4 w-1/3 h-20 rounded-xl bg-brand opacity-80 shadow-lg"></div>
                
                {theme === t.id && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-sm transition-opacity">
                    <div className="bg-brand text-white p-2 rounded-full shadow-xl">
                      <Check size={24} strokeWidth={4} />
                    </div>
                  </div>
                )}
              </div>

              <div className="flex items-start justify-between">
                <div>
                  <h3 className={`text-lg font-bold ${theme === t.id ? 'text-brand' : 'text-main'}`}>{t.name}</h3>
                  <p className="text-sm text-muted mt-1 leading-relaxed">{t.description}</p>
                </div>
                <t.icon size={24} className={theme === t.id ? 'text-brand' : 'text-muted'} />
              </div>

              {/* Color Swatches */}
              <div className="flex gap-2 mt-4">
                {t.colors.map((c, i) => (
                  <div 
                    key={i} 
                    className="w-6 h-6 rounded-full border border-white/10 shadow-sm"
                    style={{ backgroundColor: c }}
                  ></div>
                ))}
              </div>

            </GlassCard>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

export default Themes;
