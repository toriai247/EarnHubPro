
import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Download, X, Smartphone, CheckCircle2 } from 'lucide-react';
import GlassCard from './GlassCard';

const InstallPWA: React.FC = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    // Check if already in standalone mode
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
    if (isStandalone) {
      return; 
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
  }, []);

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
  };

  return (
    <AnimatePresence>
      {showPrompt && !isInstalled && (
        <motion.div 
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          className="fixed bottom-20 sm:bottom-6 left-4 right-4 z-50 flex justify-center"
        >
          <GlassCard className="w-full max-w-md p-4 bg-dark-900/95 backdrop-blur-xl border-electric-500/50 shadow-[0_0_30px_rgba(0,102,255,0.2)] flex items-center gap-4 relative overflow-hidden">
            {/* Gloss Effect */}
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-electric-600 via-electric-400 to-electric-600 opacity-50 animate-pulse"></div>

            <div className="w-12 h-12 bg-electric-500/20 rounded-xl flex items-center justify-center text-electric-400 border border-electric-500/30 shadow-lg shrink-0">
                <Smartphone size={24} />
            </div>

            <div className="flex-1">
                <h3 className="font-display font-bold text-white text-sm">Install App</h3>
                <p className="text-[10px] text-gray-400 leading-tight mt-0.5">
                    Add Naxxivo to your home screen for a better experience.
                </p>
            </div>

            <div className="flex items-center gap-2">
                <button 
                    onClick={handleInstallClick}
                    className="px-4 py-2 bg-electric-600 hover:bg-electric-500 text-white text-xs font-bold rounded-lg shadow-neo-sm transition active:scale-95 flex items-center gap-1"
                >
                    <Download size={14} /> Install
                </button>
                <button 
                    onClick={handleDismiss}
                    className="p-2 bg-white/5 hover:bg-white/10 rounded-lg text-gray-400 hover:text-white transition"
                >
                    <X size={16} />
                </button>
            </div>
          </GlassCard>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default InstallPWA;
