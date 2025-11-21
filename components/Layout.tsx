
import React, { useEffect, useState, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  Home, PieChart, Gamepad2, User, Bell, Crown, Trophy, Globe, Menu, X, 
  ArrowRightLeft, Wallet, HelpCircle, FileText, Headphones, LogOut, ChevronRight, Grid, Sun, Moon
} from 'lucide-react';
import { supabase } from '../integrations/supabase/client';
import { useCurrency } from '../context/CurrencyContext';
import { useTheme } from '../context/ThemeContext';
import BalanceDisplay from './BalanceDisplay';
import { motion, AnimatePresence } from 'framer-motion';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const location = useLocation();
  const [balance, setBalance] = useState<number>(0);
  const [unreadCount, setUnreadCount] = useState(0);
  const [level, setLevel] = useState(1);
  const [userId, setUserId] = useState('');
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  
  // Currency & Theme State
  const { currency } = useCurrency();
  const { theme, toggleTheme } = useTheme();
  
  const isVideoPage = location.pathname === '/video';
  const isHomePage = location.pathname === '/';

  const navItems = [
    { path: '/', icon: Home, label: 'Home' },
    { path: '/invest', icon: PieChart, label: 'Invest' },
    { path: '/leaderboard', icon: Trophy, label: 'Top 10' },
    { path: '/games', icon: Gamepad2, label: 'Games' },
    { path: '/profile', icon: User, label: 'Profile' },
  ];

  const menuItems = [
      { path: '/transfer', icon: ArrowRightLeft, label: 'Transfer Funds', color: 'text-blue-400', bg: 'bg-blue-500/10' },
      { path: '/exchange', icon: Globe, label: 'Currency Exchange', color: 'text-green-400', bg: 'bg-green-500/10' },
      { path: '/deposit', icon: Wallet, label: 'Deposit Funds', color: 'text-white dark:text-white text-slate-800', bg: 'bg-slate-200/50 dark:bg-white/10' },
      { path: '/withdraw', icon: Wallet, label: 'Withdraw Funds', color: 'text-yellow-400', bg: 'bg-yellow-500/10' },
      { path: '/support', icon: Headphones, label: 'Support Chat', color: 'text-purple-400', bg: 'bg-purple-500/10' },
      { path: '/faq', icon: HelpCircle, label: 'FAQ & Help', color: 'text-cyan-400', bg: 'bg-cyan-500/10' },
      { path: '/terms', icon: FileText, label: 'Terms & Policy', color: 'text-gray-400', bg: 'bg-gray-500/10' },
  ];

  useEffect(() => {
    const fetchData = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      setUserId(session.user.id);

      const [walletRes, notifRes, profileRes] = await Promise.allSettled([
        supabase.from('wallets').select('balance').eq('user_id', session.user.id).single(),
        supabase.from('notifications').select('*', { count: 'exact', head: true }).eq('user_id', session.user.id).eq('is_read', false),
        supabase.from('profiles').select('level_1').eq('id', session.user.id).single()
      ]);

      if (walletRes.status === 'fulfilled' && walletRes.value.data) {
        setBalance(walletRes.value.data.balance);
      }

      if (notifRes.status === 'fulfilled') {
        setUnreadCount(notifRes.value.count || 0);
      }

      if (profileRes.status === 'fulfilled' && profileRes.value.data) {
        setLevel(profileRes.value.data.level_1);
      }
    };

    fetchData();

    const handleWalletUpdate = () => fetchData();
    window.addEventListener('wallet_updated', handleWalletUpdate);

    return () => {
      window.removeEventListener('wallet_updated', handleWalletUpdate);
    };
  }, [location.pathname]);

  const handleLogout = async () => {
      await supabase.auth.signOut();
      window.location.reload();
  };

  return (
    <div className="min-h-screen flex flex-col relative pb-20 sm:pb-0 bg-slate-50 dark:bg-dark-950 text-slate-900 dark:text-white overflow-hidden font-sans transition-colors duration-500">
      {!isVideoPage && (
        <header className="sticky top-0 z-40 glass-panel border-b border-slate-200/20 dark:border-white/5 px-4 py-3 flex justify-between items-center">
          
          {/* Left: Menu & Logo */}
          <div className="flex items-center gap-3">
            <button 
                onClick={() => setIsMenuOpen(true)}
                className="p-2 rounded-xl bg-slate-200/50 dark:bg-white/5 border border-slate-200 dark:border-white/10 hover:bg-slate-300 dark:hover:bg-white/10 transition active:scale-95"
            >
                <Menu size={20} className="text-slate-600 dark:text-gray-300" />
            </button>
            <Link to="/" className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-royal-600 to-neon-green flex items-center justify-center font-bold font-display text-lg text-white shadow-lg shadow-neon-green/20">
                E
                </div>
                <span className="font-display font-bold text-lg tracking-wide hidden sm:inline text-slate-900 dark:text-white">EarnHub<span className="text-neon-glow">Pro</span></span>
            </Link>
          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-2 sm:gap-3">
            
            {/* Theme Toggle */}
            <button 
                onClick={toggleTheme}
                className="p-2 rounded-full bg-slate-200/50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-600 dark:text-yellow-400 transition active:scale-90 relative overflow-hidden"
            >
                <AnimatePresence mode='wait'>
                    <motion.div
                        key={theme}
                        initial={{ y: -20, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ y: 20, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                    >
                        {theme === 'dark' ? <Moon size={18} className="fill-yellow-400"/> : <Sun size={18} className="text-orange-500 fill-orange-500"/>}
                    </motion.div>
                </AnimatePresence>
            </button>

            {!isHomePage && (
              <>
                <div className="hidden sm:flex px-3 py-1 rounded-full glass-panel border border-yellow-500/30 text-xs font-bold text-yellow-600 dark:text-yellow-400 items-center gap-1 animate-fade-in">
                    <Crown size={12} /> Lvl {level}
                </div>
                <div className="px-3 py-1 rounded-full glass-panel border border-neon-green/30 text-xs font-bold text-emerald-700 dark:text-neon-glow flex items-center gap-1 animate-fade-in">
                    <BalanceDisplay amount={balance} isHeader={true} />
                </div>
              </>
            )}
            
            <Link to="/notifications" className="relative p-2 rounded-full hover:bg-slate-200 dark:hover:bg-white/5 transition">
              <Bell size={20} className="text-slate-600 dark:text-gray-300" />
              {unreadCount > 0 && (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
              )}
            </Link>
          </div>
        </header>
      )}

      {/* MAIN CONTENT */}
      <main className={`flex-1 ${!isVideoPage ? 'px-4 pt-4' : ''}`}>
        {children}
      </main>

      {/* BOTTOM NAV (MOBILE) */}
      <nav className="fixed bottom-0 left-0 right-0 z-30 glass-panel border-t border-slate-200 dark:border-white/10 pb-safe sm:hidden">
        <div className="flex justify-around items-center h-16">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex flex-col items-center justify-center w-full h-full transition-all duration-300 ${
                  isActive ? 'text-royal-600 dark:text-neon-glow' : 'text-slate-400 dark:text-gray-500 hover:text-slate-600 dark:hover:text-gray-300'
                }`}
              >
                <div className={`relative p-1.5 rounded-xl transition-all duration-300 ${isActive ? 'bg-royal-100 dark:bg-neon-green/10 -translate-y-1' : ''}`}>
                  <item.icon size={22} strokeWidth={isActive ? 2.5 : 2} />
                  {isActive && <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 bg-royal-600 dark:bg-neon-glow rounded-full shadow-[0_0_8px_currentColor]"></span>}
                </div>
                <span className={`text-[10px] mt-0.5 font-medium ${isActive ? 'opacity-100' : 'opacity-70'}`}>
                  {item.label}
                </span>
              </Link>
            );
          })}
        </div>
      </nav>

      {/* SIDEBAR NAV (DESKTOP) */}
      <nav className="hidden sm:flex fixed left-0 top-0 bottom-0 w-20 glass-panel border-r border-slate-200 dark:border-white/10 flex-col items-center py-6 z-30">
        <div className="mb-8 w-10 h-10 rounded-xl bg-gradient-to-tr from-royal-600 to-neon-green flex items-center justify-center font-bold font-display text-xl text-white">E</div>
        <div className="flex flex-col gap-6 w-full">
          {navItems.map((item) => {
             const isActive = location.pathname === item.path;
             return (
              <Link key={item.path} to={item.path} className={`p-3 rounded-xl mx-auto transition-all ${isActive ? 'bg-royal-600 text-white shadow-lg shadow-royal-600/30' : 'text-slate-400 dark:text-gray-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-white/5'}`}>
                <item.icon size={24} />
              </Link>
             )
          })}
        </div>
      </nav>

      {/* SLIDE-OUT DRAWER MENU */}
      <AnimatePresence>
          {isMenuOpen && (
              <>
                  {/* Backdrop */}
                  <motion.div 
                      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                      onClick={() => setIsMenuOpen(false)}
                      className="fixed inset-0 bg-black/50 dark:bg-black/80 z-50 backdrop-blur-sm"
                  />
                  
                  {/* Drawer */}
                  <motion.div 
                      initial={{ x: '-100%' }} animate={{ x: 0 }} exit={{ x: '-100%' }}
                      transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                      className="fixed top-0 left-0 bottom-0 w-[80%] max-w-[300px] bg-slate-50 dark:bg-dark-950 border-r border-slate-200 dark:border-white/10 z-50 flex flex-col shadow-2xl"
                  >
                      {/* Drawer Header */}
                      <div className="p-6 border-b border-slate-200 dark:border-white/10 flex justify-between items-center">
                          <div>
                              <h2 className="font-display font-bold text-xl text-slate-900 dark:text-white">Menu</h2>
                              <p className="text-xs text-slate-500 dark:text-gray-400">Quick Access</p>
                          </div>
                          <button onClick={() => setIsMenuOpen(false)} className="p-2 bg-slate-200/50 dark:bg-white/5 rounded-full text-slate-500 dark:text-gray-400 hover:text-slate-900 dark:hover:text-white">
                              <X size={20} />
                          </button>
                      </div>

                      {/* Drawer Items */}
                      <div className="flex-1 overflow-y-auto p-4 space-y-2">
                          {menuItems.map((item, idx) => (
                              <Link 
                                  key={idx} 
                                  to={item.path} 
                                  onClick={() => setIsMenuOpen(false)}
                                  className="flex items-center gap-4 p-3 rounded-xl hover:bg-slate-200/50 dark:hover:bg-white/5 transition group border border-transparent hover:border-slate-200 dark:hover:border-white/5"
                              >
                                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${item.bg} ${item.color}`}>
                                      <item.icon size={20} />
                                  </div>
                                  <div className="flex-1">
                                      <h4 className="text-sm font-bold text-slate-700 dark:text-gray-200 group-hover:text-royal-600 dark:group-hover:text-white">{item.label}</h4>
                                  </div>
                                  <ChevronRight size={16} className="text-slate-400 dark:text-gray-600 group-hover:text-slate-900 dark:group-hover:text-white" />
                              </Link>
                          ))}
                      </div>

                      {/* Drawer Footer */}
                      <div className="p-4 border-t border-slate-200 dark:border-white/10">
                          <button 
                              onClick={handleLogout}
                              className="w-full flex items-center justify-center gap-2 p-3 rounded-xl bg-red-500/10 text-red-500 dark:text-red-400 font-bold hover:bg-red-500/20 transition"
                          >
                              <LogOut size={18} /> Log Out
                          </button>
                          <div className="mt-4 text-center text-[10px] text-slate-400 dark:text-gray-600">
                              EarnHub Pro v2.6.0
                          </div>
                      </div>
                  </motion.div>
              </>
          )}
      </AnimatePresence>

    </div>
  );
};

export default Layout;
