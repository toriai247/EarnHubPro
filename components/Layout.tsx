
import React, { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Home, PieChart, Gamepad2, PlaySquare, User, Bell, Crown, Trophy } from 'lucide-react';
import { supabase } from '../integrations/supabase/client';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const location = useLocation();
  const [balance, setBalance] = useState<number>(0);
  const [unreadCount, setUnreadCount] = useState(0);
  const [level, setLevel] = useState(1);
  
  const isVideoPage = location.pathname === '/video';
  const isHomePage = location.pathname === '/';

  const navItems = [
    { path: '/', icon: Home, label: 'Home' },
    { path: '/invest', icon: PieChart, label: 'Invest' },
    { path: '/leaderboard', icon: Trophy, label: 'Top 10' },
    { path: '/games', icon: Gamepad2, label: 'Games' },
    { path: '/profile', icon: User, label: 'Profile' },
  ];

  useEffect(() => {
    const fetchData = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      // Parallel fetch for better performance
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

    // Listen for global wallet updates
    const handleWalletUpdate = () => fetchData();
    window.addEventListener('wallet_updated', handleWalletUpdate);

    return () => {
      window.removeEventListener('wallet_updated', handleWalletUpdate);
    };
  }, [location.pathname]);

  return (
    <div className="min-h-screen flex flex-col relative pb-20 sm:pb-0 bg-dark-950 text-white overflow-hidden font-sans">
      {!isVideoPage && (
        <header className="sticky top-0 z-40 glass-panel border-b border-white/5 px-4 py-3 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-royal-600 to-neon-green flex items-center justify-center font-bold font-display text-lg">
              E
            </div>
            <span className="font-display font-bold text-lg tracking-wide">EarnHub<span className="text-neon-glow">Pro</span></span>
          </div>
          <div className="flex items-center gap-4">
            {!isHomePage && (
              <>
                <div className="hidden sm:flex px-3 py-1 rounded-full glass-panel border border-yellow-500/30 text-xs font-bold text-yellow-400 items-center gap-1 animate-fade-in">
                    <Crown size={12} /> Lvl {level}
                </div>
                <div className="px-3 py-1 rounded-full glass-panel border border-neon-green/30 text-xs font-bold text-neon-glow flex items-center gap-1 animate-fade-in">
                    ${balance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
              </>
            )}
            <Link to="/notifications" className="relative p-2 rounded-full hover:bg-white/5 transition">
              <Bell size={20} className="text-gray-300" />
              {unreadCount > 0 && (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
              )}
            </Link>
          </div>
        </header>
      )}

      <main className={`flex-1 ${!isVideoPage ? 'px-4 pt-4' : ''}`}>
        {children}
      </main>

      <nav className="fixed bottom-0 left-0 right-0 z-50 glass-panel border-t border-white/10 pb-safe sm:hidden">
        <div className="flex justify-around items-center h-16">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex flex-col items-center justify-center w-full h-full transition-all duration-300 ${
                  isActive ? 'text-neon-glow' : 'text-gray-500 hover:text-gray-300'
                }`}
              >
                <div className={`relative p-1.5 rounded-xl transition-all duration-300 ${isActive ? 'bg-neon-green/10 -translate-y-1' : ''}`}>
                  <item.icon size={22} strokeWidth={isActive ? 2.5 : 2} />
                  {isActive && <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 bg-neon-glow rounded-full shadow-[0_0_8px_#34d399]"></span>}
                </div>
                <span className={`text-[10px] mt-0.5 font-medium ${isActive ? 'opacity-100' : 'opacity-70'}`}>
                  {item.label}
                </span>
              </Link>
            );
          })}
        </div>
      </nav>

      <nav className="hidden sm:flex fixed left-0 top-0 bottom-0 w-20 glass-panel border-r border-white/10 flex-col items-center py-6 z-50">
        <div className="mb-8 w-10 h-10 rounded-xl bg-gradient-to-tr from-royal-600 to-neon-green flex items-center justify-center font-bold font-display text-xl">E</div>
        <div className="flex flex-col gap-6 w-full">
          {navItems.map((item) => {
             const isActive = location.pathname === item.path;
             return (
              <Link key={item.path} to={item.path} className={`p-3 rounded-xl mx-auto transition-all ${isActive ? 'bg-royal-600 text-white shadow-lg shadow-royal-600/30' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}>
                <item.icon size={24} />
              </Link>
             )
          })}
        </div>
      </nav>
    </div>
  );
};

export default Layout;
