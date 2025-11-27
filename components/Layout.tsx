
import React, { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  Home, PieChart, Gamepad2, User, Bell, Crown, Trophy, Globe, Menu, X, 
  ArrowRightLeft, Wallet, HelpCircle, FileText, Headphones, LogOut, ChevronRight, Fingerprint, Lock
} from 'lucide-react';
import { supabase } from '../integrations/supabase/client';
import { useTheme } from '../context/ThemeContext';
import BalanceDisplay from './BalanceDisplay';
import { motion, AnimatePresence } from 'framer-motion';
import { useSystem } from '../context/SystemContext';

const MotionDiv = motion.div as any;

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const location = useLocation();
  const { isFeatureEnabled, config } = useSystem();
  const [balance, setBalance] = useState<number>(0);
  const [unreadCount, setUnreadCount] = useState(0);
  const [level, setLevel] = useState(1);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  
  const isVideoPage = location.pathname === '/video';
  const isHomePage = location.pathname === '/';

  // Dynamic Navigation Items based on System Config
  const navItems = [
    { path: '/', icon: Home, label: 'HUB', enabled: true },
    { path: '/invest', icon: PieChart, label: 'INVEST', enabled: isFeatureEnabled('is_invest_enabled') },
    { path: '/leaderboard', icon: Trophy, label: 'TOP', enabled: true },
    { path: '/games', icon: Gamepad2, label: 'PLAY', enabled: isFeatureEnabled('is_games_enabled') },
    { path: '/profile', icon: User, label: 'ME', enabled: true },
  ].filter(i => i.enabled);

  const menuItems = [
      { path: '/transfer', icon: ArrowRightLeft, label: 'Transfer Funds', color: 'text-electric-400', bg: 'bg-electric-500/10', enabled: true },
      { path: '/exchange', icon: Globe, label: 'Exchange', color: 'text-neo-green', bg: 'bg-neo-green/10', enabled: true },
      { path: '/deposit', icon: Wallet, label: 'Deposit', color: 'text-white', bg: 'bg-white/10', enabled: isFeatureEnabled('is_deposit_enabled') },
      { path: '/withdraw', icon: Wallet, label: 'Withdraw', color: 'text-neo-yellow', bg: 'bg-neo-yellow/10', enabled: isFeatureEnabled('is_withdraw_enabled') },
      { path: '/biometric-setup', icon: Fingerprint, label: 'Fingerprint Setup', color: 'text-neon-green', bg: 'bg-green-500/10', enabled: true },
      { path: '/support', icon: Headphones, label: 'Support', color: 'text-purple-400', bg: 'bg-purple-500/10', enabled: true },
      { path: '/faq', icon: HelpCircle, label: 'FAQ', color: 'text-cyan-400', bg: 'bg-cyan-500/10', enabled: true },
      { path: '/terms', icon: FileText, label: 'Terms', color: 'text-gray-400', bg: 'bg-gray-500/10', enabled: true },
  ].filter(i => i.enabled);

  useEffect(() => {
    const fetchData = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const [walletRes, notifRes, profileRes] = await Promise.allSettled([
        supabase.from('wallets').select('balance').eq('user_id', session.user.id).single(),
        supabase.from('notifications').select('*', { count: 'exact', head: true }).eq('user_id', session.user.id).eq('is_read', false),
        supabase.from('profiles').select('level_1').eq('id', session.user.id).single()
      ]);

      if (walletRes.status === 'fulfilled' && walletRes.value.data) setBalance(walletRes.value.data.balance);
      if (notifRes.status === 'fulfilled') setUnreadCount(notifRes.value.count || 0);
      if (profileRes.status === 'fulfilled' && profileRes.value.data) setLevel(profileRes.value.data.level_1);
    };

    fetchData();
    const handleWalletUpdate = () => fetchData();
    window.addEventListener('wallet_updated', handleWalletUpdate);
    return () => window.removeEventListener('wallet_updated', handleWalletUpdate);
  }, [location.pathname]);

  const handleLogout = async () => {
      await supabase.auth.signOut();
      window.location.reload();
  };

  if (config?.maintenance_mode) {
      return (
          <div className="min-h-screen bg-void flex flex-col items-center justify-center p-6 text-center">
              <Lock size={48} className="text-neo-red mb-4" />
              <h1 className="text-2xl font-black text-white uppercase">System Offline</h1>
              <p className="text-gray-400 mt-2">We are currently undergoing scheduled maintenance. Please check back later.</p>
          </div>
      )
  }

  return (
    <div className="min-h-screen flex flex-col relative pb-24 sm:pb-0 bg-void text-white font-sans selection:bg-electric-500 selection:text-white">
      
      {/* Global Alert */}
      {config?.global_alert && (
          <div className="bg-neo-yellow/10 border-b border-neo-yellow/20 px-4 py-2 text-center">
              <p className="text-xs font-bold text-neo-yellow">{config.global_alert}</p>
          </div>
      )}

      {/* TOP BAR */}
      {!isVideoPage && (
        <header className="sticky top-0 z-40 bg-void/95 border-b border-border-neo px-4 py-3 flex justify-between items-center shadow-neo-sm">
          
          <div className="flex items-center gap-3">
            <button 
                onClick={() => setIsMenuOpen(true)}
                className="p-2 rounded-lg bg-surface border border-border-neo hover:bg-surface-hover transition text-white shadow-neo-sm active:shadow-none active:translate-y-0.5"
            >
                <Menu size={20} />
            </button>
            <Link to="/" className="flex items-center gap-2 group">
                <div className="w-8 h-8 rounded bg-electric-500 flex items-center justify-center font-black font-display text-lg text-white border border-electric-600 shadow-[2px_2px_0px_0px_#004499]">
                  E
                </div>
                <span className="font-display font-black text-lg tracking-tight hidden sm:inline text-white uppercase">
                  Earn<span className="text-electric-500">Hub</span>
                </span>
            </Link>
          </div>

          <div className="flex items-center gap-3">
            {!isHomePage && (
              <>
                <div className="hidden sm:flex px-3 py-1.5 rounded bg-surface border border-neo-yellow/50 text-xs font-bold text-neo-yellow items-center gap-1 shadow-[2px_2px_0px_0px_rgba(255,204,0,0.3)]">
                    <Crown size={14} className="fill-current" /> LVL {level}
                </div>
                <div className="px-3 py-1.5 rounded bg-surface border border-border-neo text-xs font-bold text-white flex items-center gap-1 shadow-neo-sm font-mono">
                    <BalanceDisplay amount={balance} isHeader={true} />
                </div>
              </>
            )}
            
            <Link to="/notifications" className="relative p-2 rounded-lg bg-surface hover:bg-surface-hover transition text-white border border-border-neo shadow-neo-sm active:translate-y-0.5 active:shadow-none">
              <Bell size={20} />
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-neo-red rounded-full border-2 border-surface"></span>
              )}
            </Link>
          </div>
        </header>
      )}

      {/* MAIN CONTENT */}
      <main className={`flex-1 ${!isVideoPage ? 'px-4 pt-6' : ''} max-w-6xl mx-auto w-full`}>
        {children}
      </main>

      {/* MOBILE BOTTOM NAV */}
      <nav className="fixed bottom-0 left-0 right-0 z-30 sm:hidden bg-surface border-t border-border-neo px-4 pb-safe pt-2 shadow-[0_-4px_0px_0px_rgba(0,0,0,0.5)]">
        <div className="flex justify-between items-center h-16">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex flex-col items-center justify-center w-full h-full transition-all duration-200 ${
                  isActive ? 'text-electric-500' : 'text-gray-500 hover:text-gray-300'
                }`}
              >
                <div className={`relative p-1.5 rounded-lg transition-all ${isActive ? '-translate-y-2 bg-electric-500 text-white shadow-[3px_3px_0px_0px_#000] border border-black' : ''}`}>
                    <item.icon size={isActive ? 22 : 24} strokeWidth={isActive ? 2.5 : 2} />
                </div>
                <span className={`text-[10px] font-black uppercase mt-1 ${isActive ? 'text-electric-500' : 'opacity-0'}`}>
                  {item.label}
                </span>
              </Link>
            );
          })}
        </div>
      </nav>

      {/* DESKTOP SIDEBAR */}
      <nav className="hidden sm:flex fixed left-0 top-0 bottom-0 w-20 bg-surface border-r border-border-neo flex-col items-center py-6 z-30">
        <div className="mb-10 w-10 h-10 rounded bg-electric-500 flex items-center justify-center font-black font-display text-xl text-white shadow-[3px_3px_0px_0px_#004499] border border-electric-600">E</div>
        <div className="flex flex-col gap-8 w-full px-3">
          {navItems.map((item) => {
             const isActive = location.pathname === item.path;
             return (
              <Link key={item.path} to={item.path} className={`p-3 rounded-xl mx-auto transition-all relative group ${isActive ? 'bg-electric-500 text-white shadow-neo-accent border-2 border-electric-600' : 'text-gray-500 hover:text-white hover:bg-white/5'}`}>
                <item.icon size={24} />
                <div className="absolute left-16 top-1/2 -translate-y-1/2 px-3 py-1.5 bg-black border border-white/20 text-white text-xs font-bold rounded opacity-0 group-hover:opacity-100 pointer-events-none transition whitespace-nowrap z-50 shadow-xl">
                    {item.label}
                </div>
              </Link>
             )
          })}
        </div>
      </nav>

      {/* DRAWER MENU */}
      <AnimatePresence>
          {isMenuOpen && (
              <>
                  <MotionDiv 
                      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                      onClick={() => setIsMenuOpen(false)}
                      className="fixed inset-0 bg-black/80 z-50 backdrop-blur-sm"
                  />
                  <MotionDiv 
                      initial={{ x: '-100%' }} animate={{ x: 0 }} exit={{ x: '-100%' }}
                      transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                      className="fixed top-0 left-0 bottom-0 w-[85%] max-w-[320px] bg-surface border-r border-border-neo z-50 flex flex-col shadow-[10px_0_0_0_rgba(0,0,0,0.5)]"
                  >
                      <div className="p-6 border-b border-border-neo flex justify-between items-center bg-void">
                          <div>
                              <h2 className="font-display font-black text-2xl text-white uppercase tracking-tight">Menu</h2>
                          </div>
                          <button onClick={() => setIsMenuOpen(false)} className="p-2 bg-white/5 rounded text-gray-400 hover:text-white border border-white/10">
                              <X size={20} />
                          </button>
                      </div>

                      <div className="flex-1 overflow-y-auto p-4 space-y-3">
                          {menuItems.map((item, idx) => (
                              <Link 
                                  key={idx} 
                                  to={item.path} 
                                  onClick={() => setIsMenuOpen(false)}
                                  className="flex items-center gap-4 p-4 rounded-lg bg-void border border-border-neo hover:border-electric-500 hover:translate-x-1 transition group shadow-neo-sm"
                              >
                                  <div className={`w-8 h-8 rounded flex items-center justify-center ${item.color}`}>
                                      <item.icon size={20} />
                                  </div>
                                  <div className="flex-1">
                                      <h4 className="text-sm font-bold text-gray-200 group-hover:text-white uppercase tracking-wide">{item.label}</h4>
                                  </div>
                                  <ChevronRight size={16} className="text-gray-600 group-hover:text-electric-500" />
                              </Link>
                          ))}
                      </div>

                      <div className="p-4 border-t border-border-neo bg-void">
                          <button 
                              onClick={handleLogout}
                              className="w-full flex items-center justify-center gap-2 p-4 rounded-lg bg-neo-red text-white font-bold hover:bg-red-600 transition border-b-4 border-red-800 active:border-b-0 active:translate-y-1 shadow-neo-red"
                          >
                              <LogOut size={18} /> LOG OUT
                          </button>
                          <div className="mt-4 text-center text-[10px] text-gray-600 font-black font-mono">
                              EARNHUB PRO v3.6.0
                          </div>
                      </div>
                  </MotionDiv>
              </>
          )}
      </AnimatePresence>

    </div>
  );
};

export default Layout;
