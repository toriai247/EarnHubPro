
import React, { useEffect, useState } from 'react';
import { Download, X, Smartphone } from 'lucide-react';
import { useSystem } from '../context/SystemContext';

const InstallPWA: React.FC = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const { config, loading } = useSystem();

  useEffect(() => {
    // 1. Check Config
    if (!loading && config && config.is_pwa_enabled === false) return;

    // 2. Check Standalone Mode
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
    if (isStandalone) return;

    // 3. Check Dismissal History (3 Day Cooldown)
    const dismissed = localStorage.getItem('pwa_dismiss_timestamp');
    if (dismissed) {
        const dismissTime = parseInt(dismissed);
        const now = Date.now();
        const cooldown = 3 * 24 * 60 * 60 * 1000; // 3 Days
        if (now - dismissTime < cooldown) return;
    }

    // 4. Listen for Event
    const handler = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      // Small delay to not be annoying immediately on load
      setTimeout(() => setShowPrompt(true), 3000);
    };

    window.addEventListener('beforeinstallprompt', handler);
    
    // 5. Listen for Successful Install
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
    // Save timestamp for cooldown
    localStorage.setItem('pwa_dismiss_timestamp', Date.now().toString());
  };

  if (!showPrompt) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 z-[999] md:left-auto md:right-6 md:w-96 animate-fade-in">
      <div className="bg-[#111] border border-[#222] p-4 rounded-xl shadow-2xl flex items-center gap-4">
        <div className="w-12 h-12 bg-[#0055FF] rounded-lg flex items-center justify-center text-white shrink-0 shadow-lg">
            <Smartphone size={24} />
        </div>
        
        <div className="flex-1 min-w-0">
            <h4 className="text-white font-bold text-sm">Install App</h4>
            <p className="text-[#888] text-xs leading-tight mt-0.5">Add to home screen for a better experience.</p>
        </div>
        
        <div className="flex items-center gap-2">
            <button 
                onClick={handleDismiss}
                className="p-2 text-[#666] hover:text-white transition rounded-lg hover:bg-[#222]"
                title="Dismiss"
            >
                <X size={18} />
            </button>
            <button 
                onClick={handleInstall}
                className="bg-white text-black px-4 py-2 rounded-lg text-xs font-bold hover:bg-gray-200 transition flex items-center gap-2"
            >
                <Download size={14} /> Install
            </button>
        </div>
      </div>
    </div>
  );
};

export default InstallPWA;
