
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  TrendingUp, Gift, Zap, PlayCircle, Users, ArrowRight, Sparkles, Crown, 
  Activity as ActivityIcon, AlertCircle, RefreshCw, Wallet, ArrowDownLeft, ArrowUpRight, Trophy, Copy, Terminal
} from 'lucide-react';
import GlassCard from '../../components/GlassCard';
import Skeleton from '../../components/Skeleton';
import TrendChart from '../../components/TrendChart';
import BalanceDisplay from '../../components/BalanceDisplay';
import { motion } from 'framer-motion';
import { Activity, WalletData, UserProfile } from '../../types';
import { supabase } from '../../integrations/supabase/client';
import { createUserProfile } from '../../lib/actions';

const MotionDiv = motion.div as any;

const Home: React.FC = () => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [wallet, setWallet] = useState<WalletData | null>(null);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [chartData, setChartData] = useState<number[]>([]);
  
  const [aiMotivation] = useState<string>('Future wealth is built today.');

  useEffect(() => {
    fetchData();
  }, []);

  // Safety Timeout: If data fetching hangs for 15 seconds, force stop loading
  useEffect(() => {
      if (loading) {
          const timer = setTimeout(() => {
              if (loading) {
                  setLoading(false);
                  if (!wallet) setError("Network timeout. Please swipe down or tap refresh.");
              }
          }, 15000);
          return () => clearTimeout(timer);
      }
  }, [loading, wallet]);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      let { data: walletData } = await supabase.from('wallets').select('*').eq('user_id', session.user.id).maybeSingle();

      if (!walletData) {
         try {
             await createUserProfile(
                 session.user.id, 
                 session.user.email || '', 
                 session.user.user_metadata?.full_name || 'User'
             );
             const res = await supabase.from('wallets').select('*').eq('user_id', session.user.id).single();
             walletData = res.data;
         } catch (recErr: any) {
             throw new Error("Initialization failed: " + (recErr?.message || "Unknown"));
         }
      }

      if (walletData) {
        setWallet(walletData as WalletData);
        
        const [userRes, txRes] = await Promise.all([
            supabase.from('profiles').select('*').eq('id', session.user.id).single(),
            supabase.from('transactions').select('*').eq('user_id', session.user.id).order('created_at', { ascending: false }).limit(10)
        ]);

        if (userRes.data) setUser(userRes.data as UserProfile);

        if (txRes.data) {
           const txns = txRes.data;
           const acts: Activity[] = txns.map((t: any) => ({
              id: t.id,
              title: t.description || t.type.toUpperCase(),
              type: t.type,
              amount: t.amount,
              time: t.created_at,
              timestamp: new Date(t.created_at).getTime(),
              status: t.status
            }));
            setActivities(acts);

           const days = 7;
           const chartHistory: number[] = [];
           let currentBal = (walletData as WalletData).balance;
           const dailyChanges: {[key: string]: number} = {};
           txns.forEach((t: any) => {
              const date = new Date(t.created_at).toDateString();
              let change = 0;
              if (['deposit', 'earn', 'bonus', 'game_win'].includes(t.type)) change += t.amount;
              if (['withdraw', 'invest', 'game_loss'].includes(t.type)) change -= t.amount;
              dailyChanges[date] = (dailyChanges[date] || 0) + change;
           });

           for (let i = 0; i < days; i++) {
              const d = new Date();
              d.setDate(d.getDate() - i);
              const dateStr = d.toDateString();
              chartHistory.unshift(currentBal);
              const change = dailyChanges[dateStr] || 0;
              currentBal -= change;
           }
           setChartData(chartHistory);
        }
      } else {
        throw new Error("Failed to load wallet data.");
      }

    } catch (e: any) {
      console.error(e);
      let msg = e.message || "Unknown error.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const container = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.05 } }
  };

  const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 }
  };

  if (loading) {
    return (
      <div className="space-y-6 pb-24 relative">
         <div className="flex justify-between items-center">
             <div className="flex items-center gap-3">
                 <Skeleton variant="circular" className="w-12 h-12" />
                 <div className="space-y-2">
                     <Skeleton variant="text" className="w-32" />
                     <Skeleton variant="text" className="w-24 h-3" />
                 </div>
             </div>
             <Skeleton variant="rectangular" className="w-10 h-10" />
         </div>
         <Skeleton variant="rectangular" className="w-full h-72 rounded-2xl" />
         <div className="grid grid-cols-4 gap-3">
             {[1, 2, 3, 4].map(i => <Skeleton key={i} variant="rectangular" className="aspect-square rounded-2xl" />)}
         </div>
      </div>
    );
  }
  
  if (error || !wallet) {
      return (
        <div className="min-h-[60vh] flex flex-col items-center justify-center p-6 text-center space-y-4">
            <div className="w-16 h-16 bg-red-100 dark:bg-red-500/10 rounded-full flex items-center justify-center text-red-500">
                <AlertCircle size={32} />
            </div>
            <div className="max-w-md w-full">
                <h2 className="text-xl font-bold text-slate-800 dark:text-white">Connection Issue</h2>
                <p className="text-slate-500 dark:text-gray-400 text-xs mt-2">{error}</p>
                <button onClick={fetchData} className="mt-4 px-6 py-3 bg-royal-600 text-white rounded-xl text-sm font-bold shadow-lg hover:bg-royal-700 transition flex items-center justify-center gap-2 mx-auto">
                    <RefreshCw size={18} /> Retry Connection
                </button>
            </div>
        </div>
      );
  }

  return (
    <MotionDiv variants={container} initial="hidden" animate="show" className="space-y-6 pb-24 relative">
      
      {/* Header Section */}
      <MotionDiv variants={item} className="flex justify-between items-center">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-12 h-12 rounded-full border-2 border-royal-500 p-0.5">
              <img src={user?.avatar_1 || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.name_1 || 'User'}`} alt="User" className="w-full h-full rounded-full bg-slate-200 dark:bg-white/10" />
            </div>
            <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-neon-green text-black text-[10px] font-bold flex items-center justify-center rounded-full border border-white dark:border-dark-950">
              {user?.level_1 || 1}
            </div>
          </div>
          <div>
            <h2 className="font-display font-bold text-lg text-slate-900 dark:text-white leading-tight">
                Hello, {user?.name_1?.split(' ')[0] || 'User'}
            </h2>
            <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-royal-300">
              <Sparkles size={10} className="text-amber-500 dark:text-neon-glow" />
              <span className="italic opacity-80">"{aiMotivation}"</span>
            </div>
          </div>
        </div>
        <button onClick={fetchData} className="p-2.5 glass-panel rounded-xl text-royal-600 dark:text-royal-400 hover:bg-slate-100 dark:hover:text-white transition relative group shadow-sm">
          <RefreshCw size={20} />
        </button>
      </MotionDiv>

      {/* Main Balance Card */}
      <MotionDiv variants={item}>
        <GlassCard glow className="bg-gradient-royal border-none relative overflow-hidden shadow-xl shadow-royal-900/20">
          <div className="absolute top-0 right-0 p-3 opacity-10">
            <Wallet size={120} className="text-white" />
          </div>
          
          <div className="relative z-10">
            <div className="flex justify-between items-start mb-1">
              <div>
                <p className="text-blue-100 text-xs font-bold uppercase tracking-wider mb-1 opacity-80">Total Asset Balance</p>
                <h1 className="text-4xl font-display font-bold text-white tracking-tight">
                  <BalanceDisplay amount={wallet.balance} />
                </h1>
              </div>
              <div className="bg-white/20 backdrop-blur-md px-3 py-1 rounded-lg border border-white/20 text-xs font-medium text-white flex items-center gap-1 shadow-sm">
                <TrendingUp size={12} /> +{wallet.today_earning > 0 && wallet.balance > 0 ? ((wallet.today_earning/wallet.balance)*100).toFixed(1) : '0.0'}%
              </div>
            </div>

            <div className="mb-4">
                <TrendChart data={chartData} color="#60a5fa" />
            </div>

            <div className="grid grid-cols-3 gap-2 mb-6">
              <div className="bg-black/20 rounded-xl p-2.5 backdrop-blur-sm border border-white/5">
                <p className="text-[10px] text-blue-200 mb-1">Deposit</p>
                <p className="font-bold text-white text-sm"><BalanceDisplay amount={wallet.deposit} /></p>
              </div>
              <div className="bg-black/20 rounded-xl p-2.5 backdrop-blur-sm border border-white/5">
                <p className="text-[10px] text-blue-200 mb-1">Withdrawable</p>
                <p className="font-bold text-white text-sm"><BalanceDisplay amount={wallet.withdrawable} /></p>
              </div>
              <div className="bg-emerald-500/20 rounded-xl p-2.5 backdrop-blur-sm border border-emerald-500/30">
                <p className="text-[10px] text-emerald-300 mb-1">Today Earn</p>
                <p className="font-bold text-white text-sm">+<BalanceDisplay amount={wallet.today_earning} /></p>
              </div>
            </div>

            <div className="flex gap-3">
              <Link to="/deposit" className="flex-1 bg-white text-royal-900 font-bold py-3 rounded-xl shadow-lg hover:bg-blue-50 transition flex items-center justify-center gap-2 text-sm active:scale-95">
                <ArrowDownLeft size={16} /> Deposit
              </Link>
              <Link to="/withdraw" className="flex-1 bg-white/10 text-white font-bold py-3 rounded-xl border border-white/20 hover:bg-white/20 transition flex items-center justify-center gap-2 text-sm active:scale-95">
                <ArrowUpRight size={16} /> Withdraw
              </Link>
            </div>
          </div>
        </GlassCard>
      </MotionDiv>

      {/* Quick Actions Grid */}
      <MotionDiv variants={item}>
        <div className="grid grid-cols-4 gap-3">
          <Link to="/invite" className="flex flex-col items-center gap-2 group">
            <div className="w-full aspect-square rounded-2xl bg-purple-50 dark:bg-purple-500/10 flex flex-col items-center justify-center border border-purple-100 dark:border-white/5 glass-card-hover transition-all duration-300 group-hover:scale-105 shadow-sm">
              <Users size={22} className="text-purple-600 dark:text-purple-400 mb-1" />
              <span className="text-[10px] font-bold text-slate-700 dark:text-white">Invite</span>
            </div>
          </Link>
          <Link to="/tasks" className="flex flex-col items-center gap-2 group">
            <div className="w-full aspect-square rounded-2xl bg-blue-50 dark:bg-blue-500/10 flex flex-col items-center justify-center border border-blue-100 dark:border-white/5 glass-card-hover transition-all duration-300 group-hover:scale-105 shadow-sm">
              <Zap size={22} className="text-blue-600 dark:text-blue-400 mb-1" />
              <span className="text-[10px] font-bold text-slate-700 dark:text-white">Tasks</span>
            </div>
          </Link>
          <Link to="/leaderboard" className="flex flex-col items-center gap-2 group">
            <div className="w-full aspect-square rounded-2xl bg-amber-50 dark:bg-yellow-500/10 flex flex-col items-center justify-center border border-amber-100 dark:border-white/5 glass-card-hover transition-all duration-300 group-hover:scale-105 shadow-sm">
              <Trophy size={22} className="text-amber-600 dark:text-yellow-400 mb-1" />
              <span className="text-[10px] font-bold text-slate-700 dark:text-white">Top 10</span>
            </div>
          </Link>
          <Link to="/games" className="flex flex-col items-center gap-2 group w-full">
            <div className="w-full aspect-square rounded-2xl bg-emerald-50 dark:bg-neon-green/10 flex flex-col items-center justify-center border border-emerald-100 dark:border-white/5 glass-card-hover transition-all duration-300 group-hover:scale-105 shadow-sm">
              <Gift size={22} className="text-emerald-600 dark:text-neon-glow mb-1" />
              <span className="text-[10px] font-bold text-slate-700 dark:text-white">Spin</span>
            </div>
          </Link>
        </div>
      </MotionDiv>

      {/* Recent Activity */}
      <MotionDiv variants={item}>
         <div className="flex justify-between items-center mb-3 px-1">
           <h2 className="font-display font-bold text-slate-800 dark:text-white text-lg">Recent Activity</h2>
           <Link to="/wallet" className="text-xs text-royal-600 dark:text-royal-400 font-bold flex items-center gap-1 hover:underline">
               View All <ArrowRight size={12}/>
           </Link>
        </div>
        <div className="space-y-2.5">
          {activities.length === 0 ? (
             <div className="text-center py-8 bg-white dark:bg-white/5 rounded-xl border border-slate-200 dark:border-white/5">
                 <ActivityIcon className="mx-auto text-slate-300 dark:text-gray-600 mb-2" size={24}/>
                 <p className="text-slate-500 dark:text-gray-500 text-sm">No recent activity.</p>
             </div>
          ) : (
            activities.slice(0,5).map((act) => (
              <GlassCard key={act.id} className="flex items-center justify-between py-3 px-4 hover:bg-slate-50 dark:hover:bg-white/10 transition" onClick={() => {}}>
                 <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                      act.type === 'earn' || act.type === 'bonus' ? 'bg-emerald-100 text-emerald-600 dark:bg-green-500/20 dark:text-green-400' : 
                      act.type === 'withdraw' || act.type === 'invest' ? 'bg-red-100 text-red-600 dark:bg-red-500/20 dark:text-red-400' : 
                      'bg-blue-100 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400'
                    }`}>
                      {act.type === 'earn' || act.type === 'bonus' ? <Zap size={18} /> : 
                       act.type === 'withdraw' || act.type === 'invest' ? <ArrowUpRight size={18} /> : 
                       <ActivityIcon size={18} />}
                    </div>
                    <div>
                      <h4 className="font-bold text-sm text-slate-800 dark:text-white">{act.title}</h4>
                      <p className="text-[10px] text-slate-500 dark:text-gray-500 font-medium">
                        {new Date(act.time).toLocaleDateString()} • {new Date(act.time).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}
                      </p>
                    </div>
                 </div>
                 {act.amount && (
                   <span className={`text-sm font-bold font-mono ${
                       act.type === 'withdraw' || act.type === 'invest' || act.type === 'game_loss' 
                       ? 'text-slate-800 dark:text-white' 
                       : 'text-emerald-600 dark:text-neon-glow'
                   }`}>
                     {act.type === 'withdraw' || act.type === 'invest' || act.type === 'game_loss' ? '-' : '+'}
                     <BalanceDisplay amount={act.amount} />
                   </span>
                 )}
              </GlassCard>
            ))
          )}
        </div>
      </MotionDiv>
    </MotionDiv>
  );
};

export default Home;
