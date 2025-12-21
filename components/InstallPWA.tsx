
import React, { useEffect, useState } from 'react';
import { Download, X, Smartphone, Share, Zap } from 'lucide-react';
import { useSystem } from '../context/SystemContext';
import { motion, AnimatePresence } from 'framer-motion';

const InstallPWA: React.FC = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const { config, loading } = useSystem();

  useEffect(() => {
    // 1. Check Config
    if (!loading && config && config.is_pwa_enabled === false) return;

    // 2. Check Standalone Mode
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
    if (isStandalone) return;

    // 3. Detect IOS
    const ios = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
    setIsIOS(ios);

    // 4. Check Dismissal History (7 Day Cooldown)
    const dismissed = localStorage.getItem('pwa_install_dismissed');
    if (dismissed) {
        const dismissTime = parseInt(dismissed);
        const now = Date.now();
        const cooldown = 7 * 24 * 60 * 60 * 1000; 
        if (now - dismissTime < cooldown) return;
    }

    // 5. Listen for Install Event (Android/Chrome)
    const handler = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      // Show prompt after a small delay for better conversion
      setTimeout(() => setShowPrompt(true), 5000);
    };

    window.addEventListener('beforeinstallprompt', handler);
    
    // 6. Handle iOS Logic
    if (ios && !isStandalone) {
        setTimeout(() => setShowPrompt(true), 10000);
    }

    // 7. Listen for Successful Install
    window.addEventListener('appinstalled', () => {
      setShowPrompt(false);
      setDeferredPrompt(null);
    });

    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, [config, loading]);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setShowPrompt(false);
    }
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    localStorage.setItem('pwa_install_dismissed', Date.now().toString());
  };

  return (
    <AnimatePresence>
        {showPrompt && (
            <motion.div 
                initial={{ y: 100, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: 100, opacity: 0 }}
                className="fixed bottom-20 left-4 right-4 z-[999] md:left-auto md:right-6 md:w-96"
            >
                <div className="bg-[#111] border border-brand/20 p-5 rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] flex flex-col gap-4 relative overflow-hidden">
                    {/* Background Glow */}
                    <div className="absolute -top-10 -right-10 w-32 h-32 bg-brand/5 blur-3xl rounded-full"></div>
                    
                    <div className="flex items-start gap-4">
                        <div className="w-14 h-14 bg-gradient-to-br from-brand to-yellow-600 rounded-2xl flex items-center justify-center text-black shrink-0 shadow-lg shadow-brand/20">
                            <Smartphone size={28} />
                        </div>
                        
                        <div className="flex-1 min-w-0 pr-6">
                            <h4 className="text-white font-black text-base uppercase tracking-tight">Switch to App</h4>
                            <p className="text-gray-400 text-xs leading-relaxed mt-1">
                                {isIOS 
                                    ? "Install Naxxivo on your home screen for faster access and offline mode." 
                                    : "Get the full Naxxivo experience with native features and instant payouts."}
                            </p>
                        </div>

                        <button 
                            onClick={handleDismiss}
                            className="absolute top-4 right-4 p-1 text-gray-600 hover:text-white transition"
                        >
                            <X size={20} />
                        </button>
                    </div>
                    
                    {isIOS ? (
                        <div className="bg-white/5 p-3 rounded-xl border border-white/5 flex items-center gap-3">
                            <div className="bg-brand text-black p-1.5 rounded-lg"><Share size={14}/></div>
                            <p className="text-[10px] text-gray-300 font-bold uppercase">
                                Tap <span className="text-white">Share</span> then <span className="text-white">'Add to Home Screen'</span>
                            </p>
                        </div>
                    ) : (
                        <div className="flex gap-2">
                            <button 
                                onClick={handleInstall}
                                className="flex-1 bg-white text-black py-3 rounded-xl text-xs font-black uppercase tracking-wider hover:bg-brand transition flex items-center justify-center gap-2 shadow-lg active:scale-95"
                            >
                                <Zap size={14} fill="currentColor" /> Install Application
                            </button>
                        </div>
                    )}
                </div>
            </motion.div>
        )}
    </AnimatePresence>
  );
};

export default InstallPWA;
