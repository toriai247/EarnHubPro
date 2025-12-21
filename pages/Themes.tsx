
import React from 'react';
import GlassCard from '../components/GlassCard';
import { useTheme, ThemeId } from '../context/ThemeContext';
import { Check, Palette, Sparkles, Moon, Sun, Terminal, Zap, Code, Ghost, Layout, CreditCard } from 'lucide-react';
import { motion } from 'framer-motion';

const Themes: React.FC = () => {
  const { theme, setTheme } = useTheme();

  const themes: { id: ThemeId; name: string; code: string; description: string; colors: string[]; icon: any }[] = [
    {
      id: 'midnight',
      name: 'Cyber Gold OLED',
      code: '001',
      description: 'True black background for OLED screens with premium cyber-gold accents. Sharp and focused.',
      colors: ['#000000', '#FACC15', '#18181b'],
      icon: Zap
    },
    {
      id: 'lite',
      name: 'Daylight Ice',
      code: '005',
      description: 'Ultra-clean "frosted" light theme with digital azure highlights. Optimized for high readability.',
      colors: ['#f1f5f9', '#0ea5e9', '#ffffff'],
      icon: Sun
    },
    {
      id: 'default',
      name: 'Deep Slate',
      code: '002',
      description: 'The standard institutional dark theme with professional blue highlights.',
      colors: ['#020617', '#3b82f6', '#1e293b'],
      icon: Moon
    },
    {
      id: 'premium',
      name: 'Purple Nebula',
      code: '003',
      description: 'Futuristic gradients, glassmorphism, and neon purple depth.',
      colors: ['#0a0118', '#8b5cf6', '#1d0f3d'],
      icon: Sparkles
    },
    {
      id: 'terminal',
      name: 'Cyber Terminal',
      code: '004',
      description: 'Retro hacker aesthetic. Matrix green text on pure black surface.',
      colors: ['#020202', '#22c55e', '#0a0a0a'],
      icon: Terminal
    },
    {
      id: 'solarized',
      name: 'Solarized Dark',
      code: '006',
      description: 'Based on the precision color palette for developers and designers.',
      colors: ['#002b36', '#268bd2', '#073642'],
      icon: Code
    },
    {
      id: 'dracula',
      name: 'Dracula Pro',
      code: '007',
      description: 'A darker theme for vampires and power users. Vibrant neon colors.',
      colors: ['#282a36', '#bd93f9', '#44475a'],
      icon: Ghost
    },
    {
      id: 'material',
      name: 'Google Material',
      code: '008',
      description: 'Material Design inspired dark theme with flat surfaces and depth.',
      colors: ['#121212', '#bb86fc', '#1e1e1e'],
      icon: Layout
    }
  ];

  return (
    <div className="pb-24 sm:pl-20 sm:pt-6 space-y-6 px-4 sm:px-0 animate-fade-in">
      <header className="pt-4">
        <h1 className="text-3xl font-display font-black text-main flex items-center gap-3">
          <Palette className="text-brand" size={32} /> Visual <span className="text-brand">Identity</span>
        </h1>
        <p className="text-muted text-sm mt-1">Configure your personal UI environment. Preferences sync across nodes.</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {themes.map((t) => (
          <motion.div
            key={t.id}
            whileHover={{ y: -5 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setTheme(t.id)}
            className="cursor-pointer h-full"
          >
            <div className={`relative rounded-5xl overflow-hidden border-2 transition-all h-full bg-card flex flex-col ${theme === t.id ? 'border-brand shadow-glow' : 'border-border-base opacity-80 hover:opacity-100'}`}>
              
              {/* --- PREVIEW MOCKUP --- */}
              <div className={`${t.id} h-40 w-full relative overflow-hidden bg-void border-b border-border-base`}>
                  <div className="absolute inset-0 bg-void opacity-100"></div>
                  
                  {/* Mock Navbar */}
                  <div className="absolute top-3 left-4 right-4 h-6 flex justify-between items-center z-10">
                      <div className="w-12 h-2 rounded-full bg-muted/20"></div>
                      <div className="flex gap-1.5">
                          <div className="w-4 h-4 rounded-md bg-brand shadow-glow"></div>
                          <div className="w-4 h-4 rounded-md bg-muted/20"></div>
                      </div>
                  </div>

                  {/* Mock Balance Card */}
                  <div className="absolute top-12 left-4 right-4 bottom-4 rounded-2xl bg-card border border-border-base p-3 flex flex-col justify-between z-10 shadow-sm">
                      <div className="space-y-1">
                          <div className="w-16 h-1.5 rounded-full bg-muted/20"></div>
                          <div className="w-24 h-4 rounded-lg bg-brand/10 flex items-center px-1">
                              <div className="w-full h-1 bg-brand rounded-full"></div>
                          </div>
                      </div>
                      <div className="flex gap-2">
                          <div className="h-4 flex-1 rounded bg-brand/20"></div>
                          <div className="h-4 flex-1 rounded bg-muted/10"></div>
                      </div>
                  </div>

                  {/* Active Indicator Overlay */}
                  {theme === t.id && (
                      <div className="absolute inset-0 bg-brand/5 backdrop-blur-[1px] flex items-center justify-center z-20">
                          <div className="bg-brand text-black p-3 rounded-3xl shadow-2xl border-4 border-void scale-110">
                              <Check size={28} strokeWidth={4} />
                          </div>
                      </div>
                  )}
              </div>

              {/* --- THEME DETAILS --- */}
              <div className="p-6 space-y-4 flex-1 flex flex-col">
                <div className="flex justify-between items-start">
                    <div>
                        <h3 className={`text-lg font-black uppercase tracking-tight ${theme === t.id ? 'text-brand' : 'text-main'}`}>{t.name}</h3>
                        <p className="text-[10px] text-muted font-black uppercase tracking-widest mt-1">NODE_CFG: {t.code}</p>
                    </div>
                    <t.icon size={22} className={theme === t.id ? 'text-brand' : 'text-muted'} />
                </div>

                <p className="text-sm text-muted leading-relaxed flex-1">{t.description}</p>

                {/* Swatches */}
                <div className="flex items-center justify-between pt-4 border-t border-border-base">
                    <div className="flex gap-1.5">
                        {t.colors.map((c, i) => (
                            <div 
                                key={i} 
                                className="w-5 h-5 rounded-full border border-black/10 shadow-inner"
                                style={{ backgroundColor: c }}
                            ></div>
                        ))}
                    </div>
                    <span className={`text-[9px] font-black uppercase tracking-widest ${theme === t.id ? 'text-brand' : 'text-muted'}`}>
                        {theme === t.id ? 'ACTIVE PROTOCOL' : 'SELECT THEME'}
                    </span>
                </div>
              </div>

            </div>
          </motion.div>
        ))}
      </div>
      
      <div className="bg-blue-900/10 border border-blue-500/20 p-6 rounded-5xl flex items-start gap-4">
          <div className="p-3 bg-blue-500/20 rounded-2xl text-blue-400">
              <CreditCard size={24} />
          </div>
          <div className="space-y-1">
              <h4 className="font-bold text-white">Custom UI Engine</h4>
              <p className="text-sm text-gray-400 leading-relaxed">
                  Our CSS Core v5.2 allows for theme-level variable overrides. Switching themes does not reload the application, ensuring a seamless high-performance experience.
              </p>
          </div>
      </div>
    </div>
  );
};

export default Themes;
