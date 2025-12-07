
import React, { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { 
  Home, PieChart, Gamepad2, User, Bell, Trophy, Menu, X, 
  ArrowRightLeft, Wallet, HelpCircle, FileText, Headphones, LogOut, 
  ChevronRight, Fingerprint, LayoutDashboard, Send, Search, LogIn, Megaphone, ShieldAlert, Info, AlertTriangle, Globe, Briefcase, BarChart3, PlusCircle, Users, Palette
} from 'lucide-react';
import { supabase } from '../integrations/supabase/client';
import BalanceDisplay from './BalanceDisplay';
import { useSystem } from '../context/SystemContext';
import MaintenanceScreen from './MaintenanceScreen';
import SuspendedView from './SuspendedView';
import { useUI } from '../context/UIContext';
import Logo from './Logo';
import { motion, AnimatePresence } from 'framer-motion';
import { UserProfile } from '../types';

// Static Alert Banner
const GlobalAlertBanner = ({ message }: { message: string }) => {
    if (!message) return null;

    let type = 'warning';
    let cleanMessage = message;
    let Icon = AlertTriangle;
    let colorClass = 'bg-yellow-900/50 text-yellow-200 border-yellow-800';

    if (message.startsWith('[URGENT]')) {
        type = 'error';
        cleanMessage = message.replace('[URGENT]', '').trim();
        Icon = ShieldAlert;
        colorClass = 'bg-red-900/50 text-red-200 border-red-800';
    } else if (message.startsWith('[INFO]')) {
        type = 'info';
        cleanMessage = message.replace('[INFO]', '').trim();
        Icon = Info;
        colorClass = 'bg-blue-900/50 text-blue-200 border-blue-800';
    } else if (message.startsWith('[SUCCESS]')) {
        type = 'success';
        cleanMessage = message.replace('[SUCCESS]', '').trim();
        Icon = Info;
        colorClass = 'bg-green-900/50 text-green-200 border-green-800';
    }

    return (
        <div className={`w-full px-4 py-2 text-xs font-bold uppercase border-b flex items-center justify-center gap-2 ${colorClass}`}>
            <Icon size={14} />
            <span>{cleanMessage}</span>
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
  const { toast } = useUI();
  const { isFeatureEnabled, config } = useSystem();
  const [balance, setBalance] = useState<number>(0);
  const [unreadCount, setUnreadCount] = useState(0);
  const [level, setLevel] = useState(1);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isModerator, setIsModerator] = useState(false);
  const [isDealer, setIsDealer] = useState(false); 
  const [isStaff, setIsStaff] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isSuspended, setIsSuspended] = useState(false);
  
  const isVideoPage = location.pathname === '/video';
  const isGuest = !session;

  // --- DEALER NAVIGATION ---
  const dealerNavItems = [
      { path: '/dealer/dashboard', icon: BarChart3, label: 'DASH' },
      { path: '/dealer/campaigns', icon: Briefcase, label: 'ADS' },
      { path: '/dealer/create', icon: PlusCircle, label: 'NEW' },
      { path: '/dealer/profile', icon: User, label: 'CORP' },
  ];

  // Normal User Navigation
  const userNavItems = [
    { path: '/', icon: Home, label: 'HUB', enabled: true },
    { path: '/tasks', icon: Globe, label: 'EARN', enabled: isFeatureEnabled('is_tasks_enabled'), protected: true },
    { path: '/leaderboard', icon: Trophy, label: 'TOP', enabled: true },
    { path: '/advertise', icon: Megaphone, label: 'ADS', enabled: true, protected: true },
    { path: '/profile', icon: User, label: 'ME', enabled: true, protected: true },
  ].filter(i => i.enabled);

  // Determine active nav based on role
  // If user is dealer and currently in /dealer route, show dealer nav
  const isDealerRoute = location.pathname.startsWith('/dealer');
  const activeNavItems = (isDealer && isDealerRoute) ? dealerNavItems : userNavItems;

  const menuItems = [
      ...((isAdmin || isModerator) ? [{ path: '/admin/dashboard', icon: LayoutDashboard, label: 'Admin Panel', enabled: true }] : []),
      ...(isDealer ? [{ path: '/dealer/dashboard', icon: Briefcase, label: 'Dealer Console', enabled: true }] : []),
      ...(isStaff ? [{ path: '/staff/dashboard', icon: Users, label: 'Influencer Hub', enabled: true }] : []),
      { path: '/advertise', icon: Megaphone, label: 'Create Ads', enabled: true, protected: true },
      { path: '/invest', icon: PieChart, label: 'Invest', enabled: isFeatureEnabled('is_invest_enabled'), protected: true },
      { path: '/games', icon: Gamepad2, label: 'Games', enabled: isFeatureEnabled('is_games_enabled'), protected: true },
      { path: '/search', icon: Search, label: 'Find User', enabled: true },
      { path: '/send-money', icon: Send, label: 'Send Money', enabled: true, protected: true },
      { path: '/transfer', icon: ArrowRightLeft, label: 'Transfer Funds', enabled: true, protected: true },
      { path: '/biometric-setup', icon: Fingerprint, label: 'Security Setup', enabled: true, protected: true },
      { path: '/themes', icon: Palette, label: 'Themes', enabled: true },
      { path: '/support', icon: Headphones, label: 'Support', enabled: true },
      { path: '/faq', icon: HelpCircle, label: 'FAQ', enabled: true },
      { path: '/terms', icon: FileText, label: 'Terms', enabled: true },
  ].filter(i => i.enabled);

  useEffect(() => {
    if (!session) {
        setBalance(0);
        setUnreadCount(0);
        setLevel(1);
        setIsAdmin(false);
        setIsModerator(false);
        setIsDealer(false);
        setIsStaff(false);
        return;
    }

    const fetchData = async () => {
      // Explicitly cast the returned data
      const { data } = await supabase.from('profiles').select('*').eq('id', session.user.id).single();
      const profile = data as UserProfile | null;
      
      if (profile) {
          if (profile.is_suspended) {
              setIsSuspended(true);
              return; 
          }
          setLevel(profile.level_1);
          // Fallback to admin_user boolean if role is undefined
          setIsAdmin(profile.admin_user || profile.role === 'admin');
          setIsModerator(profile.role === 'moderator');
          setIsDealer(profile.is_dealer || false);
          setIsStaff(profile.role === 'staff');
      }

      // Fetch appropriate wallet balance
      // If Dealer, maybe show Deposit Balance? For now showing Main.
      const [walletRes, notifRes] = await Promise.allSettled([
        supabase.from('wallets').select('balance').eq('user_id', session.user.id).single(),
        supabase.from('notifications').select('*', { count: 'exact', head: true }).eq('user_id', session.user.id).eq('is_read', false),
      ]);

      if (walletRes.status === 'fulfilled' && (walletRes.value as any).data) {
          setBalance((walletRes.value as any).data.balance);
      }
      if (notifRes.status === 'fulfilled') {
          // @ts-ignore
          setUnreadCount((notifRes.value as any).count || 0);
      }
    };

    fetchData();
    const handleWalletUpdate = () => fetchData();
    window.addEventListener('wallet_updated', handleWalletUpdate);
    return () => window.removeEventListener('wallet_updated', handleWalletUpdate);
  }, [location.pathname, session]);

  const handleLogout = async () => {
      await supabase.auth.signOut();
      navigate('/login');
  };

  if (isSuspended) return <SuspendedView session={session} />;
  if (config?.maintenance_mode && !isAdmin) return <MaintenanceScreen />;

  return (
    <div className="min-h-screen flex flex-col bg-void text-main font-sans transition-colors duration-500">
      
      {config?.global_alert && <GlobalAlertBanner message={config.global_alert} />}

      {!isVideoPage && (
        <header className="sticky top-0 z-40 bg-void/90 backdrop-blur-md border-b border-border-base px-4 py-3 flex justify-between items-center transition-colors duration-500">
          <div className="flex items-center gap-3">
            <button 
                onClick={() => setIsMenuOpen(true)}
                className="p-2 text-muted hover:text-main border border-border-base rounded bg-card hover:bg-input transition-colors"
            >
                <Menu size={20} />
            </button>
            <Link to="/" className="flex items-center gap-2">
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
                    {/* Switch View Button for Dealers */}
                    {isDealer && (
                        <Link 
                            to={isDealerRoute ? "/" : "/dealer/dashboard"} 
                            className={`p-2 rounded-lg border transition ${isDealerRoute ? 'bg-amber-500/10 border-amber-500/30 text-amber-400' : 'bg-card border-border-base text-muted'}`}
                            title={isDealerRoute ? "Exit Dealer Mode" : "Enter Dealer Mode"}
                        >
                            <Briefcase size={20} />
                        </Link>
                    )}

                    <Link to="/search" className="p-2 text-muted hover:text-main transition-colors">
                        <Search size={20} />
                    </Link>
                    
                    <div className="hidden sm:flex px-2 py-1 bg-card border border-border-base rounded text-xs font-mono text-main transition-colors">
                        <BalanceDisplay amount={balance} isHeader={true} isNative={true} />
                    </div>
                    <Link to="/notifications" className="relative p-2 text-muted hover:text-main transition-colors">
                      <Bell size={20} />
                      {unreadCount > 0 && <span className="absolute top-1 right-1 w-2 h-2 bg-brand rounded-full"></span>}
                    </Link>
                </>
            )}
          </div>
        </header>
      )}

      <main className={`flex-1 ${!isVideoPage ? 'pt-4' : ''} w-full max-w-5xl mx-auto sm:px-4 sm:pl-24 overflow-x-hidden`}>
        <AnimatePresence mode="wait">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.15, ease: "linear" }}
            className="w-full h-full"
          >
            {children}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* MOBILE NAV */}
      <nav className={`fixed bottom-0 left-0 right-0 z-30 sm:hidden border-t border-border-base pb-safe transition-colors duration-500 ${isDealerRoute ? 'bg-[#1a1500] border-amber-900/30' : 'bg-card'}`}>
        <div className="flex justify-around items-center h-14">
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
                className={`flex flex-col items-center justify-center w-full h-full ${colorClass}`}
              >
                <item.icon size={20} strokeWidth={isActive ? 2.5 : 2} />
                <span className="text-[9px] font-bold mt-1 uppercase">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>

      {/* DESKTOP SIDEBAR */}
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
                className={`p-3 rounded-lg mx-auto flex flex-col items-center justify-center transition-colors ${bgClass}`}
                title={item.label}
              >
                <item.icon size={24} />
              </Link>
             )
          })}
        </div>
      </nav>

      {/* DRAWER MENU */}
      <AnimatePresence>
      {isMenuOpen && (
          <div className="fixed inset-0 z-50 flex">
              <motion.div 
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="absolute inset-0 bg-black/50 backdrop-blur-sm" 
                onClick={() => setIsMenuOpen(false)}
              />
              <motion.div 
                initial={{ x: '-100%' }} animate={{ x: 0 }} exit={{ x: '-100%' }}
                transition={{ type: "spring", damping: 25, stiffness: 200 }}
                className="relative w-[75%] max-w-[260px] bg-card h-full border-r border-border-base flex flex-col shadow-2xl"
              >
                  <div className="p-4 border-b border-border-base flex justify-between items-center">
                      <span className="font-bold text-main">Menu</span>
                      <button onClick={() => setIsMenuOpen(false)} className="text-muted hover:text-main"><X size={20}/></button>
                  </div>
                  <div className="flex-1 overflow-y-auto p-2">
                      {menuItems.map((item, idx) => {
                          if (isGuest && (item as any).protected) return null;
                          return (
                              <Link 
                                  key={idx} 
                                  to={item.path} 
                                  onClick={() => setIsMenuOpen(false)}
                                  className="flex items-center gap-3 p-3 rounded-lg hover:bg-input text-sm font-medium text-muted hover:text-main mb-1 transition-colors"
                              >
                                  <item.icon size={18} />
                                  {item.label}
                              </Link>
                          );
                      })}
                  </div>
                  <div className="p-4 border-t border-border-base flex flex-col gap-2">
                      {isGuest ? (
                          <button onClick={() => { setIsMenuOpen(false); navigate('/login'); }} className="w-full py-3 bg-brand text-white font-bold text-sm rounded-lg">Sign In</button>
                      ) : (
                          <button onClick={handleLogout} className="w-full py-3 bg-input hover:bg-danger hover:text-white text-muted font-bold text-sm rounded-lg flex items-center justify-center gap-2 border border-border-base transition-colors">
                              <LogOut size={16} /> Sign Out
                          </button>
                      )}
                  </div>
              </motion.div>
          </div>
      )}
      </AnimatePresence>
    </div>
  );
};

export default Layout;
