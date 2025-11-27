


import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  TrendingUp, Gift, Zap, Users, ArrowRight, Sparkles, 
  Activity as ActivityIcon, AlertCircle, RefreshCw, ArrowDownLeft, ArrowUpRight, Trophy
} from 'lucide-react';
import GlassCard from '../components/GlassCard';
import Skeleton from '../components/Skeleton';
import TrendChart from '../components/TrendChart';
import BalanceDisplay from '../components/BalanceDisplay';
import { motion } from 'framer-motion';
import { Activity, WalletData, UserProfile } from '../types';
import { supabase } from '../integrations/supabase/client';
import { createUserProfile } from '../lib/actions';
import { useSystem } from '../context/SystemContext';

const MotionDiv = motion.div as any;

const Home: React.FC = () => {
  const { isFeatureEnabled } = useSystem();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [wallet, setWallet] = useState<WalletData | null>(null);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [chartData, setChartData] = useState<number[]>([]);
  
  const [aiMotivation] = useState<string>('The future belongs to the bold.');

  useEffect(() => {
    fetchData();
  }, []);

  // Safety Timeout
  useEffect(() => {
      if (loading) {
          const timer = setTimeout(() => {
              if (loading) {
                  setLoading(false);
                  if (!wallet) setError("Network timeout. Please refresh.");
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
         <Skeleton variant="rectangular" className="w-full h-64 rounded-2xl" />
         <div className="grid grid-cols-4 gap-3">
             {[1, 2, 3, 4].map(i => <Skeleton key={i} variant="rectangular" className="aspect-square rounded-2xl" />)}
         </div>
      </div>
    );
  }
  
  if (error || !wallet) {
      return (
        <div className="min-h-[60vh] flex flex-col items-center justify-center p-6 text-center space-y-4">
            <div className="w-16 h-16 bg-neo-red/10 rounded-full flex items-center justify-center text-neo-red border border-neo-red/20">
                <AlertCircle size={32} />
            </div>
            <div className="max-w-md w-full">
                <h2 className="text-xl font-bold text-white">System Offline</h2>
                <p className="text-gray-400 text-xs mt-2">{error}</p>
                <button onClick={fetchData} className="mt-4 w-full py-3 bg-electric-500 text-white rounded-xl font-bold shadow-neo-accent active:shadow-none active:translate-y-1 transition border-b-4 border-electric-600">
                    <RefreshCw size={18} className="inline mr-2" /> Reconnect
                </button>
            </div>
        </div>
      );
  }

  return (
    <MotionDiv variants={container} initial="hidden" animate="show" className="space-y-8 pb-24 relative">
      
      {/* Header Section */}
      <MotionDiv variants={item} className="flex justify-between items-center pt-2">
        <div className="flex items-center gap-4">
          <div className="relative">
            <div className="w-12 h-12 rounded-lg border-2 border-electric-500 p-0.5 bg-surface overflow-hidden shadow-[3px_3px_0px_0px_#0066FF]">
              <img src={user?.avatar_1 || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.name_1 || 'User'}`} alt="User" className="w-full h-full rounded bg-black/50" />
            </div>
            <div className="absolute -bottom-2 -right-2 w-6 h-6 bg-electric-600 text-white text-[10px] font-bold flex items-center justify-center rounded border border-white shadow-sm">
              {user?.level_1 || 1}
            </div>
          </div>
          <div>
            <h2 className="font-display font-black text-xl text-white leading-none mb-1">
                {user?.name_1?.split(' ')[0] || 'User'}
            </h2>
            <div className="flex items-center gap-1.5 text-xs text-electric-400 font-bold">
              <Sparkles size={10} />
              <span className="uppercase tracking-wide">"{aiMotivation}"</span>
            </div>
          </div>
        </div>
        <button onClick={fetchData} className="p-3 bg-surface border border-border-neo rounded-xl text-gray-400 hover:text-white hover:border-white transition shadow-neo-sm active:shadow-none active:translate-y-0.5">
          <RefreshCw size={20} />
        </button>
      </MotionDiv>

      {/* Main Balance Card */}
      <MotionDiv variants={item}>
        <div className="relative overflow-hidden rounded-xl bg-[#111] border border-[#333] shadow-neo p-1">
          {/* Inner Content */}
          <div className="bg-gradient-metallic rounded-lg p-6 relative z-10 border border-white/5">
            <div className="flex justify-between items-start mb-6">
              <div>
                <p className="text-gray-500 text-[10px] font-black uppercase tracking-widest mb-2">Asset Value</p>
                <h1 className="text-4xl font-display font-black text-white tracking-tight">
                  <BalanceDisplay amount={wallet.balance} isNative={true} />
                </h1>
              </div>
              <div className="bg-electric-500/10 px-3 py-1.5 rounded border border-electric-500/30 text-xs font-bold text-electric-400 flex items-center gap-1">
                <TrendingUp size={14} /> +{wallet.today_earning > 0 && wallet.balance > 0 ? ((wallet.today_earning/wallet.balance)*100).toFixed(1) : '0.0'}%
              </div>
            </div>

            {/* Mini Chart */}
            <div className="mb-6 h-12 opacity-50 grayscale hover:grayscale-0 transition-all duration-500">
                <TrendChart data={chartData} color="#0066FF" height={48} />
            </div>

            {/* Breakdown */}
            <div className="grid grid-cols-3 gap-3 mb-6">
              <div className="bg-black/40 rounded p-3 border border-white/5">
                <p className="text-[9px] text-gray-500 uppercase font-bold mb-1">Deposit</p>
                <p className="font-bold text-white text-sm font-mono"><BalanceDisplay amount={wallet.deposit} isNative={true} /></p>
              </div>
              <div className="bg-black/40 rounded p-3 border border-white/5">
                <p className="text-[9px] text-gray-500 uppercase font-bold mb-1">Withdrawable</p>
                <p className="font-bold text-white text-sm font-mono"><BalanceDisplay amount={wallet.withdrawable} isNative={true} /></p>
              </div>
              <div className="bg-electric-900/20 rounded p-3 border border-electric-500/20">
                <p className="text-[9px] text-electric-400 uppercase font-bold mb-1">Today</p>
                <p className="font-bold text-electric-400 text-sm font-mono">+<BalanceDisplay amount={wallet.today_earning} isNative={true} /></p>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-4">
              {isFeatureEnabled('is_deposit_enabled') ? (
                  <Link to="/deposit" className="flex-1 py-3 bg-electric-500 text-white rounded-lg text-sm font-black flex items-center justify-center gap-2 border-b-4 border-electric-600 active:border-b-0 active:translate-y-1 transition shadow-neo-accent">
                    <ArrowDownLeft size={16} /> DEPOSIT
                  </Link>
              ) : (
                  <button disabled className="flex-1 py-3 bg-gray-800 text-gray-500 rounded-lg text-sm font-black flex items-center justify-center gap-2 border-b-4 border-gray-900 cursor-not-allowed">
                    DEPOSIT
                  </button>
              )}
              
              {isFeatureEnabled('is_withdraw_enabled') ? (
                  <Link to="/withdraw" className="flex-1 py-3 bg-surface text-white rounded-lg text-sm font-black flex items-center justify-center gap-2 border border-border-neo border-b-4 active:border-b active:translate-y-1 transition">
                    <ArrowUpRight size={16} /> WITHDRAW
                  </Link>
              ) : (
                  <button disabled className="flex-1 py-3 bg-gray-800 text-gray-500 rounded-lg text-sm font-black flex items-center justify-center gap-2 border border-border-neo border-b-4 cursor-not-allowed">
                    WITHDRAW
                  </button>
              )}
            </div>
          </div>
        </div>
      </MotionDiv>

      {/* Quick Actions Grid - Hide if disabled */}
      <MotionDiv variants={item}>
        <h3 className="text-sm font-black text-white mb-4 uppercase tracking-wider px-1 flex items-center gap-2">
            <span className="w-2 h-2 bg-electric-500 rounded-full"></span> Quick Access
        </h3>
        <div className="grid grid-cols-4 gap-4">
          
          {isFeatureEnabled('is_invite_enabled') && (
              <Link to="/invite" className="flex flex-col items-center gap-2 group">
                <div className="w-full aspect-square rounded-xl bg-surface border border-border-neo flex flex-col items-center justify-center transition-all group-hover:-translate-y-1 group-hover:shadow-neo-sm group-active:translate-y-0 group-active:shadow-none">
                  <Users size={24} className="text-purple-500 mb-1" />
                </div>
                <span className="text-[10px] font-bold text-gray-400 group-hover:text-white transition uppercase">Invite</span>
              </Link>
          )}

          {isFeatureEnabled('is_tasks_enabled') && (
              <Link to="/tasks" className="flex flex-col items-center gap-2 group">
                <div className="w-full aspect-square rounded-xl bg-surface border border-border-neo flex flex-col items-center justify-center transition-all group-hover:-translate-y-1 group-hover:shadow-neo-sm group-active:translate-y-0 group-active:shadow-none">
                  <Zap size={24} className="text-electric-500 mb-1" />
                </div>
                <span className="text-[10px] font-bold text-gray-400 group-hover:text-white transition uppercase">Tasks</span>
              </Link>
          )}

          <Link to="/leaderboard" className="flex flex-col items-center gap-2 group">
            <div className="w-full aspect-square rounded-xl bg-surface border border-border-neo flex flex-col items-center justify-center transition-all group-hover:-translate-y-1 group-hover:shadow-neo-sm group-active:translate-y-0 group-active:shadow-none">
              <Trophy size={24} className="text-neo-yellow mb-1" />
            </div>
            <span className="text-[10px] font-bold text-gray-400 group-hover:text-white transition uppercase">Rank</span>
          </Link>

          {isFeatureEnabled('is_games_enabled') && (
              <Link to="/games" className="flex flex-col items-center gap-2 group w-full">
                <div className="w-full aspect-square rounded-xl bg-surface border border-border-neo flex flex-col items-center justify-center transition-all group-hover:-translate-y-1 group-hover:shadow-neo-sm group-active:translate-y-0 group-active:shadow-none">
                  <Gift size={24} className="text-neo-green mb-1" />
                </div>
                <span className="text-[10px] font-bold text-gray-400 group-hover:text-white transition uppercase">Games</span>
              </Link>
          )}
        </div>
      </MotionDiv>

      {/* Recent Activity */}
      <MotionDiv variants={item}>
         <div className="flex justify-between items-center mb-4 px-1">
           <h2 className="font-display font-black text-white text-lg uppercase tracking-tight">Recent Log</h2>
           <Link to="/wallet" className="text-xs text-electric-400 font-bold flex items-center gap-1 hover:text-white transition uppercase">
               View All <ArrowRight size={12}/>
           </Link>
        </div>
        <div className="space-y-3">
          {activities.length === 0 ? (
             <div className="text-center py-10 bg-surface rounded-xl border border-dashed border-border-neo">
                 <ActivityIcon className="mx-auto text-gray-600 mb-2" size={24}/>
                 <p className="text-gray-500 text-sm font-bold">No recent activity.</p>
             </div>
          ) : (
            activities.slice(0,5).map((act) => (
              <GlassCard key={act.id} className="flex items-center justify-between py-4 px-5 hover:bg-surface-hover transition" onClick={() => {}}>
                 <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 rounded flex items-center justify-center border-2 ${
                      act.type === 'earn' || act.type === 'bonus' ? 'bg-neo-green/10 border-neo-green text-neo-green' : 
                      act.type === 'withdraw' || act.type === 'invest' ? 'bg-neo-red/10 border-neo-red text-neo-red' : 
                      'bg-electric-500/10 border-electric-500 text-electric-500'
                    }`}>
                      {act.type === 'earn' || act.type === 'bonus' ? <Zap size={18} /> : 
                       act.type === 'withdraw' || act.type === 'invest' ? <ArrowUpRight size={18} /> : 
                       <ActivityIcon size={18} />}
                    </div>
                    <div>
                      <h4 className="font-bold text-sm text-white uppercase tracking-tight">{act.title}</h4>
                      <p className="text-[10px] text-gray-500 font-bold font-mono">
                        {new Date(act.time).toLocaleDateString()}
                      </p>
                    </div>
                 </div>
                 {act.amount && (
                   <span className={`text-sm font-black font-mono ${
                       act.type === 'withdraw' || act.type === 'invest' || act.type === 'game_loss' 
                       ? 'text-white' 
                       : 'text-neo-green'
                   }`}>
                     {act.type === 'withdraw' || act.type === 'invest' || act.type === 'game_loss' ? '-' : '+'}
                     <BalanceDisplay amount={act.amount} isNative={true} />
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