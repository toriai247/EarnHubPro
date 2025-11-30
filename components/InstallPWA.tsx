
import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Download, X } from 'lucide-react';
import GlassCard from './GlassCard';
import { useSystem } from '../context/SystemContext';
import Logo from './Logo';

const InstallPWA: React.FC = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const { config, loading } = useSystem();

  useEffect(() => {
    // Check system config - if PWA prompt disabled, do nothing
    if (!loading && config && config.is_pwa_enabled === false) {
      return;
    }

    // Check if already in standalone mode
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
    if (isStandalone) {
      return; 
    }

    // Check if user dismissed recently (e.g. within 24h) to avoid spam
    const lastDismiss = localStorage.getItem('pwa_dismiss_timestamp');
    if (lastDismiss) {
      const hoursSince = (Date.now() - parseInt(lastDismiss)) / (1000 * 60 * 60);
      if (hoursSince < 24) return;
    }

    const handler = (e: any) => {
      // Prevent the mini-infobar from appearing on mobile
      e.preventDefault();
      // Stash the event so it can be triggered later.
      setDeferredPrompt(e);
      // Update UI notify the user they can install the PWA
      // Add a small delay so it doesn't pop up instantly
      setTimeout(() => setShowPrompt(true), 3000);
    };

    window.addEventListener('beforeinstallprompt', handler);

    window.addEventListener('appinstalled', () => {
      // Log install to analytics
      setIsInstalled(true);
      setShowPrompt(false);
      setDeferredPrompt(null);
    });

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
    };
  }, [config, loading]);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;

    // Show the install prompt
    deferredPrompt.prompt();

    // Wait for the user to respond to the prompt
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === 'accepted') {
      console.log('User accepted the install prompt');
      setIsInstalled(true);
    } else {
      console.log('User dismissed the install prompt');
    }
    
    // We've used the prompt, and can't use it again, throw it away
    setDeferredPrompt(null);
    setShowPrompt(false);
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    // Save dismiss timestamp
    localStorage.setItem('pwa_dismiss_timestamp', Date.now().toString());
  };

  // Only show if config allows
  if (!loading && config && config.is_pwa_enabled === false) return null;

  return (
    <AnimatePresence>
      {showPrompt && !isInstalled && (
        <motion.div 
          initial={{ y: 150, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 150, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 200, damping: 25 }}
          className="fixed bottom-0 left-0 right-0 z-[999] p-4 pb-safe flex justify-center"
        >
          <GlassCard className="w-full max-w-md p-5 bg-dark-900/95 backdrop-blur-2xl border-electric-500/50 shadow-[0_-10px_40px_rgba(0,0,0,0.5)] flex items-center gap-5 relative overflow-hidden group">
            
            {/* Animated Gloss Effect on Card */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent skew-x-[-20deg] animate-shine pointer-events-none"></div>
            
            {/* App Icon / Logo */}
            <div className="w-14 h-14 bg-gradient-to-br from-electric-600 to-electric-800 rounded-2xl flex items-center justify-center text-white border border-electric-400/30 shadow-lg shrink-0 relative z-10">
                <Logo size="md" showText={false} />
            </div>

            <div className="flex-1 relative z-10">
                <h3 className="font-display font-black text-white text-lg tracking-tight leading-none mb-1">
                    Install App
                </h3>
                <p className="text-xs text-gray-400 leading-tight">
                    Add to Home Screen for the best fullscreen experience.
                </p>
            </div>

            <div className="flex flex-col gap-2 relative z-10 shrink-0">
                <button 
                    onClick={handleInstallClick}
                    className="px-5 py-2.5 bg-white text-black text-xs font-black uppercase tracking-wider rounded-xl shadow-lg hover:bg-gray-200 transition active:scale-95 flex items-center justify-center gap-2"
                >
                    <Download size={14} strokeWidth={3} /> Install
                </button>
                <button 
                    onClick={handleDismiss}
                    className="text-[10px] text-gray-500 font-bold uppercase hover:text-white transition text-center"
                >
                    Maybe Later
                </button>
            </div>
          </GlassCard>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default InstallPWA;
