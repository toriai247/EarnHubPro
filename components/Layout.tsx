
import React, { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { 
  Home, User, Bell, 
  Wallet, Briefcase, BarChart3, PlusCircle, Globe, Shield, Inbox
} from 'lucide-react';
import { supabase } from '../integrations/supabase/client';
import BalanceDisplay from './BalanceDisplay';
import { useSystem } from '../context/SystemContext';
import MaintenanceScreen from './MaintenanceScreen';
import SuspendedView from './SuspendedView';
import Logo from './Logo';
import ReviewModal from './ReviewModal';
import Footer from './Footer'; 
import { motion, AnimatePresence } from 'framer-motion';
import { UserProfile } from '../types';

const GlobalAlertBanner = ({ message }: { message: string }) => {
    if (!message) return null;
    return (
        <div className="w-full px-4 py-2 text-xs font-bold uppercase border-b flex items-center justify-center gap-2 bg-yellow-900/50 text-yellow-200 border-yellow-800">
            <span>{message}</span>
        </div>
    );
};

interface LayoutProps {
  children: React.ReactNode;
  session?: any;
}

const Layout: React.FC<LayoutProps> = ({ children, session }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { isFeatureEnabled, config } = useSystem();
  const [balance, setBalance] = useState<number>(0);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isDealer, setIsDealer] = useState(false); 
  const [isAdmin, setIsAdmin] = useState(false);
  const [isSuspended, setIsSuspended] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(false);
  
  // NOTE: We allow the nav to show on video pages now per user request
  const isVideoPage = location.pathname.startsWith('/video/watch'); 
  const isGuest = !session;

  // --- NAVIGATION CONFIGURATION ---
  const dealerNavItems = [
      { path: '/dealer/dashboard', icon: BarChart3, label: 'DASH' },
      { path: '/dealer/inbox', icon: Inbox, label: 'INBOX' },
      { path: '/dealer/campaigns', icon: Briefcase, label: 'ADS' },
      { path: '/dealer/create', icon: PlusCircle, label: 'NEW' },
  ];

  // SIMPLIFIED USER NAV - CORE PILLARS ONLY
  const userNavItems = [
    { path: '/', icon: Home, label: 'Home', enabled: true },
    { path: '/wallet', icon: Wallet, label: 'Wallet', enabled: true, protected: true },
    { path: '/tasks', icon: Globe, label: 'Earn', enabled: isFeatureEnabled('is_tasks_enabled'), protected: true },
    { path: '/profile', icon: User, label: 'Profile', enabled: true, protected: true },
  ].filter(i => i.enabled);

  const isDealerRoute = location.pathname.startsWith('/dealer');
  const activeNavItems = (isDealer && isDealerRoute) ? dealerNavItems : userNavItems;

  useEffect(() => {
    // ADSTERRA SCRIPT INJECTION (Blocked for Admins)
    const injectAds = async () => {
        if (!isAdmin && !document.getElementById('adsterra-popunder')) {
            const script = document.createElement('script');
            script.id = 'adsterra-popunder';
            script.src = "//pl28239628.effectivegatecpm.com/13/6e/86/136e8611d131c94ee0c19190cf3bce9a.js";
            script.type = "text/javascript";
            document.body.appendChild(script);
        } else if (isAdmin) {
            // Cleanup if became admin
            const existing = document.getElementById('adsterra-popunder');
            if (existing) existing.remove();
        }
    };
    // Only inject if session exists and role check is complete, or if guest (guests see ads)
    if (session) {
        if (isAdmin === false) injectAds();
    } else {
        injectAds(); // Guests see ads
    }
  }, [isAdmin, session]);

  useEffect(() => {
    if (!session) {
        setBalance(0);
        setUnreadCount(0);
        setIsDealer(false);
        setIsAdmin(false);
        return;
    }

    const fetchData = async () => {
      try {
        const { data, error } = await supabase.from('profiles').select('*').eq('id', session.user.id).single();
        if (error) return; 

        const profile = data as UserProfile | null;
        
        if (profile) {
            if (profile.is_suspended) {
                setIsSuspended(true);
                return; 
            }
            setIsDealer(!!profile.is_dealer);
            setIsAdmin(profile.role === 'admin' || profile.role === 'moderator' || profile.admin_user === true);
        }

        const [walletRes, notifRes] = await Promise.allSettled([
          supabase.from('wallets').select('balance').eq('user_id', session.user.id).single(),
          supabase.from('notifications').select('*', { count: 'exact', head: true }).eq('user_id', session.user.id).eq('is_read', false),
        ]);

        if (walletRes.status === 'fulfilled' && (walletRes.value as any).data) {
            setBalance((walletRes.value as any).data.balance || 0);
        }
        if (notifRes.status === 'fulfilled') {
            // @ts-ignore
            setUnreadCount((notifRes.value as any).count || 0);
        }
      } catch (err) {
        console.error("Layout data fetch error:", err);
      }
    };

    fetchData();
    const handleWalletUpdate = () => fetchData();
    window.addEventListener('wallet_updated', handleWalletUpdate);
    return () => window.removeEventListener('wallet_updated', handleWalletUpdate);
  }, [location.pathname, session]);

  if (isSuspended) return <SuspendedView session={session} />;
  if (config?.maintenance_mode && !location.pathname.includes('/admin')) return <MaintenanceScreen />;

  return (
    <div className="min-h-screen flex flex-col bg-void text-main font-sans transition-colors duration-500">
      
      {config?.global_alert && <GlobalAlertBanner message={config.global_alert} />}

      {!isVideoPage && (
        <header className="sticky top-0 z-40 bg-void/90 backdrop-blur-md border-b border-border-base px-4 py-3 flex justify-between items-center transition-colors duration-500">
          <div className="flex items-center gap-3">
            <Link to="/" className="flex items-center gap-2 active:scale-95 transition-transform">
                <Logo size="sm" showText={true} />
            </Link>
          </div>

          <div className="flex items-center gap-3">
            {isGuest ? (
                <Link to="/login" className="px-4 py-2 bg-brand text-white text-xs font-bold rounded hover:bg-brand-hover">
                    Sign In
                </Link>
            ) : (
                <>
                    {/* Admin Icon */}
                    {isAdmin && (
                        <Link 
                            to="/admin/dashboard" 
                            className="p-2 text-muted hover:text-red-500 transition-colors active:scale-90"
                            title="Admin Panel"
                        >
                            <Shield size={20} />
                        </Link>
                    )}

                    {/* Dealer Toggle */}
                    {isDealer && (
                        <Link 
                            to={isDealerRoute ? "/" : "/dealer/dashboard"} 
                            className={`p-2 rounded-lg border transition ${isDealerRoute ? 'bg-amber-500/10 border-amber-500/30 text-amber-400' : 'bg-card border-border-base text-muted'}`}
                            title={isDealerRoute ? "Exit Dealer Mode" : "Enter Dealer Mode"}
                        >
                            <Briefcase size={20} />
                        </Link>
                    )}
                    
                    <div className="hidden sm:flex px-2 py-1 bg-card border border-border-base rounded text-xs font-mono text-main transition-colors">
                        <BalanceDisplay amount={balance} isHeader={true} isNative={true} />
                    </div>
                    <Link to="/notifications" className="relative p-2 text-muted hover:text-main transition-colors active:scale-90 duration-200">
                      <Bell size={20} />
                      {unreadCount > 0 && <span className="absolute top-1 right-1 w-2 h-2 bg-brand rounded-full"></span>}
                    </Link>
                    <Link to="/profile" className="p-2 text-muted hover:text-main sm:hidden active:scale-90">
                        <User size={20} />
                    </Link>
                </>
            )}
          </div>
        </header>
      )}

      <main className={`flex-1 ${!isVideoPage ? 'pt-4' : ''} w-full max-w-5xl mx-auto sm:px-4 sm:pl-24 overflow-x-hidden flex flex-col`}>
        <AnimatePresence mode="wait">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -10 }}
            transition={{ duration: 0.15, ease: "linear" }}
            className="w-full flex-1"
          >
            {children}
          </motion.div>
        </AnimatePresence>
        
        {/* Footer is always visible now except for full-screen interactions if needed, but keeping it visible ensures buttons are there */}
        <Footer onOpenReview={() => setShowReviewModal(true)} />
      </main>

      {/* BOTTOM NAV (Mobile) */}
      <nav className={`fixed bottom-0 left-0 right-0 z-50 sm:hidden border-t border-border-base pb-safe transition-colors duration-500 ${isDealerRoute ? 'bg-[#1a1500] border-amber-900/30' : 'bg-card'}`}>
        <div className="flex justify-around items-center h-16">
          {activeNavItems.map((item) => {
            const isActive = location.pathname === item.path;
            const colorClass = isDealerRoute 
                ? (isActive ? 'text-amber-400' : 'text-gray-500 hover:text-amber-200')
                : (isActive ? 'text-brand' : 'text-muted hover:text-main');

            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={(e) => { 
                    // @ts-ignore
                    if (item.protected && isGuest) { e.preventDefault(); navigate('/login'); } 
                }}
                className={`flex flex-col items-center justify-center w-full h-full ${colorClass} active:scale-90 transition-transform duration-200`}
              >
                <item.icon size={22} strokeWidth={isActive ? 2.5 : 2} className={isActive ? 'drop-shadow-[0_0_8px_rgba(var(--color-brand),0.5)]' : ''} />
                <span className="text-[10px] font-bold mt-1 uppercase">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>

      {/* SIDE NAV (Desktop) */}
      <nav className={`hidden sm:flex fixed left-0 top-0 bottom-0 w-20 border-r border-border-base flex-col items-center py-6 z-30 transition-colors duration-500 ${isDealerRoute ? 'bg-[#0f0a00] border-amber-900/20' : 'bg-card'}`}>
        <div className="mb-8">
            <Logo size="sm" showText={false} />
        </div>
        <div className="flex flex-col gap-6 w-full px-2">
          {activeNavItems.map((item) => {
             const isActive = location.pathname === item.path;
             const bgClass = isDealerRoute
                ? (isActive ? 'bg-amber-500 text-black' : 'text-gray-500 hover:bg-amber-900/20 hover:text-amber-400')
                : (isActive ? 'bg-brand text-white' : 'text-muted hover:bg-input hover:text-main');

             return (
              <Link 
                key={item.path} 
                to={item.path} 
                onClick={(e) => { 
                    // @ts-ignore
                    if (item.protected && isGuest) { e.preventDefault(); navigate('/login'); } 
                }}
                className={`p-3 rounded-lg mx-auto flex flex-col items-center justify-center transition-all duration-200 hover:scale-105 active:scale-95 ${bgClass}`}
                title={item.label}
              >
                <item.icon size={24} />
              </Link>
             )
          })}
        </div>
      </nav>

      <ReviewModal isOpen={showReviewModal} onClose={() => setShowReviewModal(false)} />
    </div>
  );
};

export default Layout;
