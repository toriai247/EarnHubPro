
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  ArrowDownLeft, ArrowUpRight, ArrowRightLeft, ShieldCheck, Zap, Globe, Lock, TrendingUp, Users, ArrowRight, Star, Server, Smartphone, Play, 
  Gamepad2, DollarSign, CheckCircle2, Award, Briefcase, RefreshCw, Send, Search, LayoutGrid, HelpCircle, FileText
} from 'lucide-react';
import GlassCard from '../components/GlassCard';
import BalanceDisplay from '../components/BalanceDisplay';
import DailyBonus from '../components/DailyBonus';
import SmartImage from '../components/SmartImage';
import { WalletData, UserProfile } from '../types';
import { supabase } from '../integrations/supabase/client';
import { createUserProfile } from '../lib/actions';
import { useSystem } from '../context/SystemContext';
import { motion } from 'framer-motion';

const MotionDiv = motion.div as any;

const Home: React.FC = () => {
  const { isFeatureEnabled, config } = useSystem();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [wallet, setWallet] = useState<WalletData | null>(null);
  const [loading, setLoading] = useState(true);
  const [isGuest, setIsGuest] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
          setIsGuest(true);
          setLoading(false);
          return;
      }

      setIsGuest(false);
      let { data: walletData } = await supabase.from('wallets').select('*').eq('user_id', session.user.id).maybeSingle();

      if (!walletData) {
         try {
             await createUserProfile(session.user.id, session.user.email || '', 'User');
             const res = await supabase.from('wallets').select('*').eq('user_id', session.user.id).single();
             walletData = res.data;
         } catch (e) {}
      }

      if (walletData) setWallet(walletData as WalletData);
      
      const { data: userRes } = await supabase.from('profiles').select('*').eq('id', session.user.id).single();
      if (userRes) setUser(userRes as UserProfile);

    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const container = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.05 } }
  };

  const item = {
    hidden: { opacity: 0, y: 10 },
    show: { opacity: 1, y: 0 }
  };

  // --- GUEST VIEW ---
  if (isGuest) {
      return (
        <div className="pb-0 pt-0 min-h-screen bg-void relative overflow-x-hidden font-sans selection:bg-brand selection:text-white flex flex-col justify-center items-center">
             <div className="absolute inset-0 z-0 pointer-events-none bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-brand/20 via-void to-void"></div>
             <main className="relative z-10 px-6 max-w-md w-full space-y-8 text-center">
                <div className="w-20 h-20 bg-brand rounded-2xl mx-auto flex items-center justify-center shadow-glow">
                    <span className="text-4xl font-black text-white">N</span>
                </div>
                <div>
                    <h1 className="text-4xl font-black text-white mb-2">Welcome to Naxxivo</h1>
                    <p className="text-muted text-sm">The all-in-one platform for earning, gaming, and investing.</p>
                </div>
                <div className="space-y-3 w-full">
                    <Link to="/signup" className="block w-full py-4 bg-brand text-white font-bold rounded-xl shadow-lg hover:scale-[1.02] transition">
                        Create Account
                    </Link>
                    <Link to="/login" className="block w-full py-4 bg-card border border-border-base text-main font-bold rounded-xl">
                        Log In
                    </Link>
                </div>
             </main>
        </div>
      );
  }

  // --- USER DASHBOARD (GRID LAYOUT) ---
  return (
    <MotionDiv variants={container} initial="hidden" animate="show" className="space-y-6 pb-20 pt-2">
      {user && <DailyBonus userId={user.id} />}

      {/* 1. Header & Balance */}
      <MotionDiv variants={item} className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full overflow-hidden border border-border-base bg-card">
                      <SmartImage src={user?.avatar_1 || undefined} alt="User" className="w-full h-full object-cover" />
                  </div>
                  <div>
                      <p className="text-xs text-muted">Welcome back,</p>
                      <h2 className="font-bold text-main leading-tight">{user?.name_1?.split(' ')[0]}</h2>
                  </div>
              </div>
              <div className="px-3 py-1.5 bg-card border border-border-base rounded-full flex items-center gap-2">
                  <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                  <span className="text-[10px] font-bold text-muted uppercase">Lvl {user?.level_1 || 1}</span>
              </div>
          </div>

          <GlassCard className="p-5 border-brand/30 relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4 opacity-10"><DollarSign size={80} /></div>
              <p className="text-[10px] text-muted font-bold uppercase mb-1">Total Assets</p>
              <h1 className="text-3xl font-black text-main tracking-tight mb-4">
                  <BalanceDisplay amount={wallet?.balance || 0} />
              </h1>
              <div className="flex gap-2">
                  <Link to="/deposit" className="flex-1 py-2 bg-brand text-white rounded-lg text-xs font-bold flex items-center justify-center gap-1 shadow-lg active:scale-95 transition">
                      <ArrowDownLeft size={14}/> Deposit
                  </Link>
                  <Link to="/withdraw" className="flex-1 py-2 bg-white/10 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-1 border border-white/10 active:scale-95 transition">
                      <ArrowUpRight size={14}/> Withdraw
                  </Link>
              </div>
          </GlassCard>
      </MotionDiv>

      {/* 2. Earning Zone */}
      <MotionDiv variants={item}>
          <h3 className="text-xs font-bold text-muted uppercase tracking-wider mb-3 px-1">Earning Zone</h3>
          <div className="grid grid-cols-4 gap-2">
              <ShortcutItem to="/tasks" icon={Briefcase} color="text-yellow-400" bg="bg-yellow-400/10" label="Tasks" />
              <ShortcutItem to="/invest" icon={TrendingUp} color="text-green-400" bg="bg-green-400/10" label="Invest" />
              <ShortcutItem to="/video" icon={Play} color="text-red-400" bg="bg-red-400/10" label="Watch" />
              <ShortcutItem to="/invite" icon={Users} color="text-blue-400" bg="bg-blue-400/10" label="Invite" />
          </div>
      </MotionDiv>

      {/* 3. Entertainment */}
      <MotionDiv variants={item}>
          <h3 className="text-xs font-bold text-muted uppercase tracking-wider mb-3 px-1">Entertainment</h3>
          <div className="grid grid-cols-2 gap-3">
              <Link to="/games" className="p-4 rounded-2xl bg-gradient-to-br from-purple-900/40 to-card border border-purple-500/20 flex items-center justify-between group">
                  <div className="flex flex-col">
                      <span className="font-bold text-white mb-1">Game Hub</span>
                      <span className="text-[10px] text-gray-400">Play & Win</span>
                  </div>
                  <Gamepad2 size={24} className="text-purple-400 group-hover:scale-110 transition" />
              </Link>
              <Link to="/leaderboard" className="p-4 rounded-2xl bg-gradient-to-br from-amber-900/40 to-card border border-amber-500/20 flex items-center justify-between group">
                  <div className="flex flex-col">
                      <span className="font-bold text-white mb-1">Top Ranked</span>
                      <span className="text-[10px] text-gray-400">Leaderboard</span>
                  </div>
                  <Award size={24} className="text-amber-400 group-hover:scale-110 transition" />
              </Link>
          </div>
      </MotionDiv>

      {/* 4. Financial Utilities */}
      <MotionDiv variants={item}>
          <h3 className="text-xs font-bold text-muted uppercase tracking-wider mb-3 px-1">Financial</h3>
          <div className="grid grid-cols-3 gap-2">
              <div className="bg-card border border-border-base p-3 rounded-xl flex flex-col items-center gap-2" onClick={() => {}}>
                  <Link to="/send-money" className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-400">
                      <Send size={18} />
                  </Link>
                  <span className="text-[10px] font-bold text-gray-400">Send</span>
              </div>
              <div className="bg-card border border-border-base p-3 rounded-xl flex flex-col items-center gap-2">
                  <Link to="/exchange" className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-400">
                      <ArrowRightLeft size={18} />
                  </Link>
                  <span className="text-[10px] font-bold text-gray-400">Exchange</span>
              </div>
              <div className="bg-card border border-border-base p-3 rounded-xl flex flex-col items-center gap-2">
                  <Link to="/transfer" className="w-10 h-10 rounded-full bg-purple-500/10 flex items-center justify-center text-purple-400">
                      <RefreshCw size={18} />
                  </Link>
                  <span className="text-[10px] font-bold text-gray-400">Transfer</span>
              </div>
          </div>
      </MotionDiv>

      {/* 5. Support & More */}
      <MotionDiv variants={item}>
          <h3 className="text-xs font-bold text-muted uppercase tracking-wider mb-3 px-1">More</h3>
          <div className="grid grid-cols-4 gap-2">
              <ShortcutItem to="/search" icon={Search} color="text-gray-300" bg="bg-white/5" label="Search" />
              <ShortcutItem to="/support" icon={HelpCircle} color="text-gray-300" bg="bg-white/5" label="Help" />
              <ShortcutItem to="/faq" icon={FileText} color="text-gray-300" bg="bg-white/5" label="FAQ" />
              <ShortcutItem to="/terms" icon={ShieldCheck} color="text-gray-300" bg="bg-white/5" label="Legal" />
          </div>
      </MotionDiv>

    </MotionDiv>
  );
};

const ShortcutItem = ({ to, icon: Icon, color, bg, label }: { to: string, icon: any, color: string, bg: string, label: string }) => (
    <Link to={to} className="flex flex-col items-center gap-2 p-3 rounded-xl bg-card border border-border-base hover:bg-input transition active:scale-95">
        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${bg} ${color}`}>
            <Icon size={18} />
        </div>
        <span className="text-[10px] font-bold text-main">{label}</span>
    </Link>
);

export default Home;
