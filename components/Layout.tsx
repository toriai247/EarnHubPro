
import React, { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  Home, PieChart, Gamepad2, User, Bell, Crown, Trophy, Globe, Menu, X, 
  ArrowRightLeft, Wallet, HelpCircle, FileText, Headphones, LogOut, ChevronRight, Sun, Moon
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
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  
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
      { path: '/transfer', icon: ArrowRightLeft, label: 'Transfer Funds', color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-100 dark:bg-blue-500/10' },
      { path: '/exchange', icon: Globe, label: 'Currency Exchange', color: 'text-emerald-600 dark:text-green-400', bg: 'bg-emerald-100 dark:bg-green-500/10' },
      { path: '/deposit', icon: Wallet, label: 'Deposit Funds', color: 'text-slate-700 dark:text-white', bg: 'bg-slate-200 dark:bg-white/10' },
      { path: '/withdraw', icon: Wallet, label: 'Withdraw Funds', color: 'text-amber-600 dark:text-yellow-400', bg: 'bg-amber-100 dark:bg-yellow-500/10' },
      { path: '/support', icon: Headphones, label: 'Support Chat', color: 'text-purple-600 dark:text-purple-400', bg: 'bg-purple-100 dark:bg-purple-500/10' },
      { path: '/faq', icon: HelpCircle, label: 'FAQ & Help', color: 'text-cyan-600 dark:text-cyan-400', bg: 'bg-cyan-100 dark:bg-cyan-500/10' },
      { path: '/terms', icon: FileText, label: 'Terms & Policy', color: 'text-gray-600 dark:text-gray-400', bg: 'bg-gray-100 dark:bg-gray-500/10' },
  ];

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

  return (
    <div className="min-h-screen flex flex-col relative pb-20 sm:pb-0 bg-slate-50 dark:bg-dark-950 text-slate-900 dark:text-white overflow-hidden font-sans transition-colors duration-500">
      
      {/* TOP BAR */}
      {!isVideoPage && (
        <header className="sticky top-0 z-40 glass-panel border-b border-slate-200 dark:border-white/5 px-4 py-3 flex justify-between items-center">
          
          <div className="flex items-center gap-3">
            <button 
                onClick={() => setIsMenuOpen(true)}
                className="p-2.5 rounded-xl bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-white/10 transition active:scale-95 text-slate-600 dark:text-gray-300 shadow-sm"
            >
                <Menu size={20} />
            </button>
            <Link to="/" className="flex items-center gap-2 group">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-royal-600 to-royal-500 flex items-center justify-center font-bold font-display text-lg text-white shadow-lg shadow-royal-500/20 group-hover:scale-105 transition">
                  E
                </div>
                <span className="font-display font-bold text-xl tracking-wide hidden sm:inline text-slate-900 dark:text-white">
                  EarnHub<span className="text-royal-600 dark:text-neon-glow">Pro</span>
                </span>
            </Link>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <button 
                onClick={toggleTheme}
                className="p-2.5 rounded-full bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-600 dark:text-yellow-400 transition active:scale-90 shadow-sm hover:shadow-md"
            >
                <AnimatePresence mode='wait'>
                    <motion.div
                        key={theme}
                        initial={{ rotate: -90, opacity: 0 }}
                        animate={{ rotate: 0, opacity: 1 }}
                        exit={{ rotate: 90, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                    >
                        {theme === 'dark' ? <Moon size={18} className="fill-current"/> : <Sun size={18} className="text-orange-500 fill-current"/>}
                    </motion.div>
                </AnimatePresence>
            </button>

            {!isHomePage && (
              <>
                <div className="hidden sm:flex px-3 py-1.5 rounded-full bg-white dark:bg-white/5 border border-amber-200 dark:border-yellow-500/30 text-xs font-bold text-amber-700 dark:text-yellow-400 items-center gap-1 shadow-sm">
                    <Crown size={14} className="fill-current" /> Lvl {level}
                </div>
                <div className="px-3 py-1.5 rounded-full bg-white dark:bg-white/5 border border-slate-200 dark:border-neon-green/30 text-xs font-bold text-slate-800 dark:text-neon-glow flex items-center gap-1 shadow-sm">
                    <BalanceDisplay amount={balance} isHeader={true} />
                </div>
              </>
            )}
            
            <Link to="/notifications" className="relative p-2.5 rounded-full bg-white dark:bg-transparent hover:bg-slate-100 dark:hover:bg-white/5 transition text-slate-600 dark:text-gray-300 border border-slate-200 dark:border-transparent shadow-sm dark:shadow-none">
              <Bell size={20} />
              {unreadCount > 0 && (
                <span className="absolute top-2 right-2.5 w-2.5 h-2.5 bg-red-500 border-2 border-white dark:border-dark-900 rounded-full animate-pulse"></span>
              )}
            </Link>
          </div>
        </header>
      )}

      {/* MAIN CONTENT */}
      <main className={`flex-1 ${!isVideoPage ? 'px-4 pt-4' : ''} max-w-7xl mx-auto w-full`}>
        {children}
      </main>

      {/* MOBILE BOTTOM NAV */}
      <nav className="fixed bottom-0 left-0 right-0 z-30 glass-panel border-t border-slate-200 dark:border-white/10 pb-safe sm:hidden bg-white/90 dark:bg-dark-950/80">
        <div className="flex justify-around items-center h-16">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex flex-col items-center justify-center w-full h-full transition-all duration-300 ${
                  isActive ? 'text-royal-600 dark:text-neon-glow' : 'text-slate-400 dark:text-gray-500'
                }`}
              >
                <div className={`relative p-1.5 rounded-xl transition-all duration-300 ${isActive ? 'bg-royal-50 dark:bg-neon-green/10 -translate-y-1' : ''}`}>
                  <item.icon size={22} strokeWidth={isActive ? 2.5 : 2} />
                  {isActive && <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 bg-royal-600 dark:bg-neon-glow rounded-full shadow-[0_0_8px_currentColor]"></span>}
                </div>
                <span className={`text-[10px] mt-0.5 font-medium ${isActive ? 'font-bold opacity-100' : 'opacity-70'}`}>
                  {item.label}
                </span>
              </Link>
            );
          })}
        </div>
      </nav>

      {/* DESKTOP SIDEBAR */}
      <nav className="hidden sm:flex fixed left-0 top-0 bottom-0 w-20 glass-panel border-r border-slate-200 dark:border-white/10 flex-col items-center py-6 z-30 bg-white/90 dark:bg-dark-950/80">
        <div className="mb-8 w-10 h-10 rounded-xl bg-gradient-to-tr from-royal-600 to-royal-500 flex items-center justify-center font-bold font-display text-xl text-white shadow-lg shadow-royal-500/30">E</div>
        <div className="flex flex-col gap-6 w-full px-2">
          {navItems.map((item) => {
             const isActive = location.pathname === item.path;
             return (
              <Link key={item.path} to={item.path} className={`p-3 rounded-xl mx-auto transition-all relative group ${isActive ? 'bg-royal-600 text-white shadow-lg shadow-royal-600/30' : 'text-slate-400 dark:text-gray-400 hover:text-slate-800 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5'}`}>
                <item.icon size={24} />
                <div className="absolute left-14 top-1/2 -translate-y-1/2 px-2 py-1 bg-slate-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 pointer-events-none transition whitespace-nowrap z-50">
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
                  <motion.div 
                      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                      onClick={() => setIsMenuOpen(false)}
                      className="fixed inset-0 bg-slate-900/20 dark:bg-black/80 z-50 backdrop-blur-sm"
                  />
                  <motion.div 
                      initial={{ x: '-100%' }} animate={{ x: 0 }} exit={{ x: '-100%' }}
                      transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                      className="fixed top-0 left-0 bottom-0 w-[80%] max-w-[300px] bg-white dark:bg-dark-950 border-r border-slate-200 dark:border-white/10 z-50 flex flex-col shadow-2xl"
                  >
                      <div className="p-6 border-b border-slate-100 dark:border-white/10 flex justify-between items-center bg-slate-50/50 dark:bg-transparent">
                          <div>
                              <h2 className="font-display font-bold text-xl text-slate-900 dark:text-white">Menu</h2>
                              <p className="text-xs text-slate-500 dark:text-gray-400">Quick Access</p>
                          </div>
                          <button onClick={() => setIsMenuOpen(false)} className="p-2 bg-slate-100 dark:bg-white/5 rounded-full text-slate-500 dark:text-gray-400 hover:text-slate-900 dark:hover:text-white">
                              <X size={20} />
                          </button>
                      </div>

                      <div className="flex-1 overflow-y-auto p-4 space-y-2">
                          {menuItems.map((item, idx) => (
                              <Link 
                                  key={idx} 
                                  to={item.path} 
                                  onClick={() => setIsMenuOpen(false)}
                                  className="flex items-center gap-4 p-3 rounded-xl hover:bg-slate-50 dark:hover:bg-white/5 transition group border border-transparent hover:border-slate-200 dark:hover:border-white/5"
                              >
                                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${item.bg} ${item.color}`}>
                                      <item.icon size={20} />
                                  </div>
                                  <div className="flex-1">
                                      <h4 className="text-sm font-bold text-slate-700 dark:text-gray-200 group-hover:text-royal-600 dark:group-hover:text-white">{item.label}</h4>
                                  </div>
                                  <ChevronRight size={16} className="text-slate-300 dark:text-gray-600 group-hover:text-slate-900 dark:group-hover:text-white" />
                              </Link>
                          ))}
                      </div>

                      <div className="p-4 border-t border-slate-100 dark:border-white/10 bg-slate-50/50 dark:bg-transparent">
                          <button 
                              onClick={handleLogout}
                              className="w-full flex items-center justify-center gap-2 p-3 rounded-xl bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400 font-bold hover:bg-red-100 dark:hover:bg-red-500/20 transition"
                          >
                              <LogOut size={18} /> Log Out
                          </button>
                          <div className="mt-4 text-center text-[10px] text-slate-400 dark:text-gray-600 font-medium">
                              EarnHub Pro v3.0.0
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
