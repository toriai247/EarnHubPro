
import React from 'react';
import GlassCard from '../components/GlassCard';
import { useTheme, ThemeId } from '../context/ThemeContext';
import { Check, Palette, Sparkles, Moon, Sun, Terminal, Zap, Code, Ghost, Layout } from 'lucide-react';
import { motion } from 'framer-motion';

const Themes: React.FC = () => {
  const { theme, setTheme } = useTheme();

  const themes: { id: ThemeId; name: string; code: string; description: string; colors: string[]; icon: any }[] = [
    {
      id: 'default',
      name: 'Dark Blue (Classic)',
      code: 'Standard',
      description: 'The original high-contrast dark mode optimized for focus.',
      colors: ['#050505', '#111111', '#0055FF'],
      icon: Moon
    },
    {
      id: 'premium',
      name: 'Premium Future',
      code: 'Pro',
      description: 'Futuristic gradients, glassmorphism, and neon depth.',
      colors: ['#3B2CC9', '#6A30D9', '#8D4DFF'],
      icon: Sparkles
    },
    {
      id: 'lite',
      name: 'Lite Mode (Fast)',
      code: '001',
      description: 'Clean white UI. No animations. Zero lag. Optimized for slow devices.',
      colors: ['#FFFFFF', '#F3F4F6', '#2563EB'],
      icon: Sun
    },
    {
      id: 'midnight',
      name: 'Midnight (Yellow)',
      code: '002',
      description: 'Pure black AMOLED. Yellow accents. Battery saver. No effects.',
      colors: ['#000000', '#121212', '#FACC15'],
      icon: Zap
    },
    {
      id: 'terminal',
      name: 'Terminal (Retro)',
      code: '003',
      description: 'Hacker aesthetic. Green text on black. Minimalist. No effects.',
      colors: ['#0C0C0C', '#052E16', '#22C55E'],
      icon: Terminal
    },
    {
      id: 'solarized',
      name: 'Solarized Dark',
      code: '004',
      description: 'Precision colors for machines and people. Low contrast.',
      colors: ['#002b36', '#073642', '#268bd2'],
      icon: Code
    },
    {
      id: 'dracula',
      name: 'Dracula',
      code: '005',
      description: 'A dark theme for vampires. High contrast, vibrant colors.',
      colors: ['#282a36', '#44475a', '#bd93f9'],
      icon: Ghost
    },
    {
      id: 'material',
      name: 'Material Design',
      code: '006',
      description: 'Google Material Design inspired dark theme with purple accents.',
      colors: ['#121212', '#1E1E1E', '#BB86FC'],
      icon: Layout
    }
  ];

  return (
    <div className="pb-24 sm:pl-20 sm:pt-6 space-y-6 px-4 sm:px-0 animate-fade-in">
      <header className="pt-4">
        <h1 className="text-2xl font-display font-bold text-main flex items-center gap-2">
          <Palette className="text-brand" /> Theme Select
        </h1>
        <p className="text-muted text-sm">Customize UI. Themes sync to your profile.</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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
                    : t.id === 'premium'
                    ? 'linear-gradient(135deg, #1a0b2e 0%, #3B2CC9 50%, #6A30D9 100%)'
                    : t.colors[0]
                }}
              >
                {/* Mock UI Elements */}
                <div className={`absolute top-4 left-4 right-4 h-4 rounded-full backdrop-blur-md ${t.id === 'lite' ? 'bg-white border border-gray-200' : 'bg-white/10 border border-white/5'}`}></div>
                <div className={`absolute top-12 left-4 w-1/2 h-20 rounded-xl backdrop-blur-md ${t.id === 'lite' ? 'bg-white border border-gray-200' : 'bg-white/5 border border-white/5'}`}></div>
                <div 
                    className="absolute top-12 right-4 w-1/3 h-20 rounded-xl shadow-lg opacity-80"
                    style={{ backgroundColor: t.colors[2] }}
                ></div>
                
                {theme === t.id && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-sm transition-opacity">
                    <div className="bg-brand text-white p-2 rounded-full shadow-xl">
                      <Check size={24} strokeWidth={4} />
                    </div>
                  </div>
                )}
                
                <div className="absolute bottom-2 right-2 bg-black/50 text-white text-[10px] px-2 py-0.5 rounded font-mono">
                    ID: {t.code}
                </div>
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
                    className="w-6 h-6 rounded-full border border-gray-500/20 shadow-sm"
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
