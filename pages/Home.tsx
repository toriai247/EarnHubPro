
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  ArrowDownLeft, ArrowUpRight, ArrowRightLeft, ShieldCheck, Zap, Globe, Lock, TrendingUp, Users, ArrowRight, Star, Server, Smartphone, Play, 
  Gamepad2, DollarSign, CheckCircle2, Award, Briefcase, RefreshCw, Send, Search, LayoutGrid, HelpCircle, FileText, Grid, Eye, EyeOff, History, Wallet, Megaphone
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
  const [showBalance, setShowBalance] = useState(true);

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

  // --- GUEST VIEW (Midnight 002 Style) ---
  if (isGuest) {
      return (
        <div className="pb-0 pt-0 min-h-screen bg-black relative overflow-x-hidden font-sans selection:bg-yellow-500 selection:text-black flex flex-col justify-center items-center">
             <main className="relative z-10 px-6 max-w-md w-full space-y-10 text-center">
                <div className="w-20 h-20 bg-black border-2 border-yellow-500 rounded-2xl mx-auto flex items-center justify-center shadow-[0_0_20px_rgba(250,204,21,0.2)]">
                    <span className="text-4xl font-black text-yellow-500 tracking-tighter">N</span>
                </div>
                <div className="space-y-2">
                    <h1 className="text-4xl font-black text-white tracking-tight uppercase">
                        Naxxivo <span className="text-yellow-500">002</span>
                    </h1>
                    <p className="text-gray-500 text-sm font-medium tracking-wide">
                        The minimalist earning ecosystem.<br/>Fast. Secure. OLED Optimized.
                    </p>
                </div>
                <div className="space-y-4 w-full pt-4">
                    <Link to="/signup" className="block w-full py-4 bg-yellow-500 text-black font-black uppercase tracking-wider rounded-xl hover:bg-yellow-400 active:scale-95 transition-transform shadow-lg">
                        Create ID
                    </Link>
                    <Link to="/login" className="block w-full py-4 bg-black border border-gray-800 text-white font-bold uppercase tracking-wider rounded-xl hover:border-yellow-500 hover:text-yellow-500 transition-colors">
                        Access Account
                    </Link>
                </div>
                <div className="pt-8 flex justify-center gap-6 opacity-50">
                    <div className="flex flex-col items-center gap-1">
                        <Zap size={20} className="text-white"/>
                        <span className="text-[10px] text-gray-500 uppercase font-bold">Fast</span>
                    </div>
                    <div className="flex flex-col items-center gap-1">
                        <ShieldCheck size={20} className="text-white"/>
                        <span className="text-[10px] text-gray-500 uppercase font-bold">Secure</span>
                    </div>
                    <div className="flex flex-col items-center gap-1">
                        <Globe size={20} className="text-white"/>
                        <span className="text-[10px] text-gray-500 uppercase font-bold">Global</span>
                    </div>
                </div>
             </main>
        </div>
      );
  }

  // --- USER DASHBOARD ---
  return (
    <MotionDiv variants={container} initial="hidden" animate="show" className="space-y-8 pb-24 pt-4 px-4 sm:px-0">
      
      {user && <DailyBonus userId={user.id} />}

      {/* 1. ASSET CARD */}
      <MotionDiv variants={item}>
          <div className="flex justify-between items-center mb-4">
              <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full border border-white/10 bg-white/5 overflow-hidden">
                      <SmartImage src={user?.avatar_1 || undefined} alt="User" className="w-full h-full object-cover" />
                  </div>
                  <div>
                      <p className="text-xs text-gray-400">Hello,</p>
                      <h2 className="font-bold text-white leading-none">{user?.name_1?.split(' ')[0]}</h2>
                  </div>
              </div>
              <Link to="/menu" className="p-2 bg-white/5 rounded-full border border-white/5 text-gray-300 hover:text-white transition">
                  <Grid size={20} />
              </Link>
          </div>

          <GlassCard className="p-6 border-yellow-500/20 bg-gradient-to-br from-yellow-900/10 to-black relative overflow-hidden shadow-2xl">
              <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none"><DollarSign size={120} /></div>
              
              <div className="relative z-10">
                  <div className="flex justify-between items-start mb-2">
                      <p className="text-[10px] text-yellow-500/80 font-bold uppercase tracking-widest flex items-center gap-1">
                          Total Balance
                      </p>
                      <button onClick={() => setShowBalance(!showBalance)} className="text-gray-500 hover:text-white transition">
                          {showBalance ? <Eye size={16}/> : <EyeOff size={16}/>}
                      </button>
                  </div>
                  
                  <h1 className="text-4xl font-black text-white tracking-tight mb-6 font-mono">
                      {showBalance ? <BalanceDisplay amount={wallet?.balance || 0} /> : '****'}
                  </h1>

                  <div className="grid grid-cols-2 gap-3">
                      <Link to="/deposit" className="py-3 bg-green-500 text-black rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 hover:bg-green-400 transition active:scale-95 shadow-lg shadow-green-900/20">
                          <ArrowDownLeft size={16} strokeWidth={3}/> Deposit
                      </Link>
                      <Link to="/withdraw" className="py-3 bg-white/10 text-white rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 border border-white/10 hover:bg-white/20 transition active:scale-95">
                          <ArrowUpRight size={16} strokeWidth={3}/> Withdraw
                      </Link>
                  </div>
              </div>
          </GlassCard>
      </MotionDiv>

      {/* 2. QUICK OPERATIONS ROW */}
      <MotionDiv variants={item}>
          <div className="flex justify-between gap-2 overflow-x-auto no-scrollbar pb-2">
              <QuickAction to="/send-money" icon={Send} label="Send" color="text-blue-400" />
              <QuickAction to="/transfer" icon={RefreshCw} label="Transfer" color="text-purple-400" />
              <QuickAction to="/exchange" icon={ArrowRightLeft} label="Exchange" color="text-green-400" />
              <QuickAction to="/wallet" icon={History} label="History" color="text-orange-400" />
          </div>
      </MotionDiv>

      {/* 3. START EARNING */}
      <MotionDiv variants={item}>
          <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3 flex items-center gap-2">
              <Zap size={12} className="text-yellow-500" /> Start Earning
          </h3>
          <div className="grid grid-cols-2 gap-3 mb-3">
              <Link to="/tasks" className="p-4 bg-[#111] border border-white/5 rounded-2xl hover:border-yellow-500/30 transition group relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-2 opacity-10 group-hover:opacity-20 transition"><Briefcase size={40}/></div>
                  <Briefcase size={24} className="text-yellow-500 mb-2" />
                  <h4 className="font-bold text-white text-sm">Tasks</h4>
                  <p className="text-[10px] text-gray-500 mt-0.5">Micro Jobs</p>
              </Link>
              <Link to="/invest" className="p-4 bg-[#111] border border-white/5 rounded-2xl hover:border-green-500/30 transition group relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-2 opacity-10 group-hover:opacity-20 transition"><TrendingUp size={40}/></div>
                  <TrendingUp size={24} className="text-green-500 mb-2" />
                  <h4 className="font-bold text-white text-sm">Invest</h4>
                  <p className="text-[10px] text-gray-500 mt-0.5">Grow Assets</p>
              </Link>
          </div>
          <Link to="/video" className="block w-full p-4 bg-gradient-to-r from-red-900/20 to-black border border-red-500/20 rounded-2xl flex items-center justify-between hover:border-red-500/40 transition">
              <div className="flex items-center gap-3">
                  <div className="p-2 bg-red-500/10 rounded-lg text-red-500"><Play size={20} /></div>
                  <div>
                      <h4 className="font-bold text-white text-sm">Watch & Earn</h4>
                      <p className="text-[10px] text-gray-400">Get paid for viewing ads</p>
                  </div>
              </div>
              <ArrowRight size={16} className="text-gray-600" />
          </Link>
      </MotionDiv>

      {/* 4. PLAY ZONE */}
      <MotionDiv variants={item}>
          <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3 flex items-center gap-2">
              <Gamepad2 size={12} className="text-purple-500" /> Play Zone
          </h3>
          <div className="grid grid-cols-2 gap-3">
              <Link to="/games" className="p-4 bg-gradient-to-br from-purple-900/20 to-black border border-purple-500/20 rounded-2xl hover:scale-[1.02] transition">
                  <Gamepad2 size={24} className="text-purple-400 mb-2" />
                  <h4 className="font-bold text-white text-sm">Game Hub</h4>
                  <p className="text-[10px] text-gray-500">Win Real Cash</p>
              </Link>
              <Link to="/leaderboard" className="p-4 bg-gradient-to-br from-amber-900/20 to-black border border-amber-500/20 rounded-2xl hover:scale-[1.02] transition">
                  <Award size={24} className="text-amber-400 mb-2" />
                  <h4 className="font-bold text-white text-sm">Top 10</h4>
                  <p className="text-[10px] text-gray-500">Weekly Winners</p>
              </Link>
          </div>
      </MotionDiv>

      {/* 5. ESSENTIALS GRID */}
      <MotionDiv variants={item}>
          <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">Essentials</h3>
          <div className="grid grid-cols-4 gap-2">
              <GridItem to="/invite" icon={Users} label="Invite" />
              <GridItem to="/profile" icon={CheckCircle2} label="Profile" />
              <GridItem to="/support" icon={HelpCircle} label="Help" />
              <GridItem to="/menu" icon={Grid} label="More" />
          </div>
      </MotionDiv>

    </MotionDiv>
  );
};

const QuickAction = ({ to, icon: Icon, label, color }: { to: string, icon: any, label: string, color: string }) => (
    <Link to={to} className="flex flex-col items-center gap-2 min-w-[70px] group">
        <div className="w-12 h-12 rounded-full bg-[#111] border border-white/5 flex items-center justify-center group-hover:bg-white/5 transition shadow-lg">
            <Icon size={20} className={color} />
        </div>
        <span className="text-[10px] font-bold text-gray-400 uppercase group-hover:text-white transition">{label}</span>
    </Link>
);

const GridItem = ({ to, icon: Icon, label }: { to: string, icon: any, label: string }) => (
    <Link to={to} className="flex flex-col items-center justify-center p-3 bg-[#111] border border-white/5 rounded-xl hover:bg-white/5 transition active:scale-95">
        <Icon size={20} className="text-gray-300 mb-1" />
        <span className="text-[10px] font-bold text-gray-400">{label}</span>
    </Link>
);

export default Home;
