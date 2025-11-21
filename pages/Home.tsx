
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  TrendingUp, Gift, Zap, PlayCircle, Users, ArrowRight, Sparkles, Crown, 
  Activity as ActivityIcon, AlertCircle, RefreshCw, Wallet, ArrowDownLeft, ArrowUpRight, Trophy, Copy, Terminal
} from 'lucide-react';
import GlassCard from '../components/GlassCard';
import Loader from '../components/Loader';
import Skeleton from '../components/Skeleton';
import TrendChart from '../components/TrendChart';
import { motion } from 'framer-motion';
import { Activity, WalletData, UserProfile } from '../types';
import { supabase } from '../integrations/supabase/client';
import { createUserProfile } from '../lib/actions';

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

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      // 1. Try to fetch wallet directly first
      let { data: walletData, error: walletFetchError } = await supabase.from('wallets').select('*').eq('user_id', session.user.id).maybeSingle();

      // 2. If wallet is missing (Zombie Session), attempt recovery
      if (!walletData) {
         console.log("Wallet missing, attempting recovery...");
         try {
             await createUserProfile(
                 session.user.id, 
                 session.user.email || '', 
                 session.user.user_metadata?.full_name || 'User'
             );
             // Retry fetch after creation
             const res = await supabase.from('wallets').select('*').eq('user_id', session.user.id).single();
             walletData = res.data;
         } catch (recErr: any) {
             const errMsg = recErr?.message || JSON.stringify(recErr);
             console.error("Recovery failed:", errMsg);
             throw new Error("Initialization failed: " + errMsg);
         }
      }

      if (walletData) {
        setWallet(walletData as WalletData);
        
        // Fetch other data in parallel
        const [userRes, txRes] = await Promise.all([
            supabase.from('profiles').select('*').eq('id', session.user.id).single(),
            supabase.from('transactions').select('*').eq('user_id', session.user.id).order('created_at', { ascending: false }).limit(10)
        ]);

        if (userRes.data) {
            setUser(userRes.data as UserProfile);
        }

        if (txRes.data) {
           const txns = txRes.data;
           
           // Process Activities
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

           // Process Chart History
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
      // Extract meaningful error message
      let msg = e.message || JSON.stringify(e);
      if (typeof e === 'object' && e !== null && 'code' in e) {
          msg = `Database Error: ${e.message} (Code: ${e.code})`;
      }
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

  const copySqlFix = () => {
      const sql = `ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
CREATE POLICY "Users can view own profile" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;`;
      navigator.clipboard.writeText(sql);
      alert("SQL copied! Run this in Supabase SQL Editor.");
  };

  if (loading) {
    return (
      <div className="space-y-6 pb-24 sm:pl-20 sm:pt-6 relative px-4 sm:px-0">
         {/* Header Skeleton */}
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

         {/* Balance Card Skeleton */}
         <div className="rounded-2xl bg-white/5 border border-white/5 p-5 h-72 space-y-4">
             <div className="flex justify-between">
                 <Skeleton variant="text" className="w-32" />
                 <Skeleton variant="rectangular" className="w-16 h-6" />
             </div>
             <Skeleton variant="text" className="w-48 h-10" />
             <Skeleton variant="rectangular" className="w-full h-24" />
             <div className="grid grid-cols-3 gap-2">
                 <Skeleton variant="rectangular" className="h-12" />
                 <Skeleton variant="rectangular" className="h-12" />
                 <Skeleton variant="rectangular" className="h-12" />
             </div>
         </div>

         {/* Quick Actions Grid Skeleton */}
         <div className="grid grid-cols-4 gap-3">
             {[1, 2, 3, 4].map(i => <Skeleton key={i} variant="rectangular" className="aspect-square" />)}
         </div>

         {/* Activity List Skeleton */}
         <div className="space-y-3">
             <div className="flex justify-between items-center">
                 <Skeleton variant="text" className="w-32" />
                 <Skeleton variant="text" className="w-16" />
             </div>
             {[1, 2, 3, 4].map(i => (
                 <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-white/5">
                     <div className="flex items-center gap-3">
                         <Skeleton variant="circular" className="w-8 h-8" />
                         <div className="space-y-1.5">
                             <Skeleton variant="text" className="w-24" />
                             <Skeleton variant="text" className="w-16 h-3" />
                         </div>
                     </div>
                     <Skeleton variant="text" className="w-12" />
                 </div>
             ))}
         </div>
      </div>
    );
  }
  
  if (error || !wallet) {
      const isRecursionError = error && (error.includes('Infinite Recursion') || error.includes('42P17'));

      return (
        <div className="min-h-[60vh] flex flex-col items-center justify-center p-6 text-center space-y-4">
            <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center text-red-500">
                <AlertCircle size={32} />
            </div>
            <div className="max-w-md w-full">
                <h2 className="text-xl font-bold text-white">Failed to load data</h2>
                <p className="text-gray-400 text-xs font-mono bg-black/30 p-3 rounded mt-2 break-all border border-red-500/20">
                    {error || "Unknown error occurred."}
                </p>
                
                {isRecursionError && (
                    <div className="mt-4 text-left bg-white/5 p-4 rounded-xl border border-white/10">
                        <h3 className="text-white font-bold text-sm flex items-center gap-2 mb-2">
                            <Terminal size={14} className="text-neon-green"/> Database Fix Required
                        </h3>
                        <p className="text-xs text-gray-400 mb-3">
                            Your database policies are causing an infinite loop. Run this SQL in Supabase:
                        </p>
                        <div className="relative">
                            <pre className="bg-black/50 p-3 rounded-lg text-[10px] text-gray-300 overflow-x-auto font-mono border border-white/5">
                                {`ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
... (click copy for full script)`}
                            </pre>
                            <button 
                                onClick={copySqlFix}
                                className="absolute top-2 right-2 p-1.5 bg-white/10 hover:bg-white/20 rounded text-white transition"
                                title="Copy SQL"
                            >
                                <Copy size={14} />
                            </button>
                        </div>
                    </div>
                )}

                <p className="text-gray-500 text-xs mt-2">Try logging out or refreshing.</p>
            </div>
            <div className="flex gap-2 mt-2">
                <button 
                    onClick={() => window.location.reload()} 
                    className="flex items-center gap-2 px-6 py-3 bg-royal-600 text-white rounded-xl font-bold hover:bg-royal-700 transition active:scale-95"
                >
                    <RefreshCw size={18} /> Retry
                </button>
                <button 
                    onClick={async () => { await supabase.auth.signOut(); window.location.href='/login'; }} 
                    className="flex items-center gap-2 px-6 py-3 bg-white/5 text-white rounded-xl font-bold hover:bg-white/10 transition active:scale-95"
                >
                    Log Out
                </button>
            </div>
        </div>
      );
  }

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-6 pb-24 sm:pl-20 sm:pt-6 relative">
      
      <motion.div variants={item} className="flex justify-between items-center">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-12 h-12 rounded-full border-2 border-royal-500 p-0.5">
              <img src={user?.avatar_1 || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.name_1 || 'User'}`} alt="User" className="w-full h-full rounded-full bg-white/10" />
            </div>
            <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-neon-green text-dark-950 text-[10px] font-bold flex items-center justify-center rounded-full border border-dark-950">
              L{user?.level_1 || 1}
            </div>
          </div>
          <div>
            <h2 className="font-display font-bold text-lg leading-tight">Hello, {user?.name_1?.split(' ')[0] || 'User'}</h2>
            <div className="flex items-center gap-1.5 text-xs text-royal-300">
              <Sparkles size={10} className="text-neon-glow" />
              <span className="italic opacity-80">"{aiMotivation}"</span>
            </div>
          </div>
        </div>
        <Link to="/profile" className="p-2 glass-panel rounded-xl text-royal-400 hover:text-white transition relative group">
          <Crown size={20} />
          {user && user.level_1 > 1 && <span className="absolute top-0 right-0 w-2 h-2 bg-neon-green rounded-full"></span>}
        </Link>
      </motion.div>

      <motion.div variants={item}>
        <GlassCard glow className="bg-gradient-royal border-royal-500/30 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-3 opacity-10">
            <Wallet size={120} />
          </div>
          
          <div className="relative z-10">
            <div className="flex justify-between items-start mb-1">
              <div>
                <p className="text-royal-200 text-xs font-bold uppercase tracking-wider mb-1">Total Asset Balance</p>
                <h1 className="text-4xl font-display font-bold text-white tracking-tight">
                  ${wallet.balance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </h1>
              </div>
              <div className="bg-white/10 backdrop-blur-md px-3 py-1 rounded-lg border border-white/10 text-xs font-medium text-neon-glow flex items-center gap-1">
                <TrendingUp size={12} /> +{wallet.today_earning > 0 && wallet.balance > 0 ? ((wallet.today_earning/wallet.balance)*100).toFixed(1) : '0.0'}%
              </div>
            </div>

            <div className="mb-4">
                <TrendChart data={chartData} />
            </div>

            <div className="grid grid-cols-3 gap-2 mb-6">
              <div className="bg-black/20 rounded-xl p-2.5 backdrop-blur-sm">
                <p className="text-[10px] text-gray-400 mb-1">Deposit</p>
                <p className="font-bold text-white text-sm">${wallet.deposit.toFixed(2)}</p>
              </div>
              <div className="bg-black/20 rounded-xl p-2.5 backdrop-blur-sm">
                <p className="text-[10px] text-gray-400 mb-1">Withdrawable</p>
                <p className="font-bold text-white text-sm">${wallet.withdrawable.toFixed(2)}</p>
              </div>
              <div className="bg-neon-green/10 rounded-xl p-2.5 backdrop-blur-sm border border-neon-green/20">
                <p className="text-[10px] text-neon-glow mb-1">Today Earn</p>
                <p className="font-bold text-white text-sm">+${wallet.today_earning.toFixed(2)}</p>
              </div>
            </div>

            <div className="flex gap-3">
              <Link to="/wallet" className="flex-1 bg-white text-royal-900 font-bold py-3 rounded-xl shadow-lg hover:bg-gray-100 transition flex items-center justify-center gap-2 text-sm">
                <ArrowDownLeft size={16} /> Deposit
              </Link>
              <Link to="/wallet" className="flex-1 bg-white/10 text-white font-bold py-3 rounded-xl border border-white/10 hover:bg-white/20 transition flex items-center justify-center gap-2 text-sm">
                <ArrowUpRight size={16} /> Withdraw
              </Link>
            </div>
          </div>
        </GlassCard>
      </motion.div>

      <motion.div variants={item}>
        <div className="grid grid-cols-4 gap-3">
          <Link to="/invite" className="flex flex-col items-center gap-2 group">
            <div className="w-full aspect-square rounded-2xl bg-purple-500/10 flex flex-col items-center justify-center border border-white/5 glass-card-hover transition-all duration-300 group-hover:scale-105">
              <Users size={22} className="text-purple-400 mb-1" />
              <span className="text-[10px] font-bold text-white">Invite</span>
            </div>
          </Link>
          <Link to="/tasks" className="flex flex-col items-center gap-2 group">
            <div className="w-full aspect-square rounded-2xl bg-blue-500/10 flex flex-col items-center justify-center border border-white/5 glass-card-hover transition-all duration-300 group-hover:scale-105">
              <Zap size={22} className="text-blue-400 mb-1" />
              <span className="text-[10px] font-bold text-white">Tasks</span>
            </div>
          </Link>
          <Link to="/leaderboard" className="flex flex-col items-center gap-2 group">
            <div className="w-full aspect-square rounded-2xl bg-yellow-500/10 flex flex-col items-center justify-center border border-white/5 glass-card-hover transition-all duration-300 group-hover:scale-105">
              <Trophy size={22} className="text-yellow-400 mb-1" />
              <span className="text-[10px] font-bold text-white">Top 10</span>
            </div>
          </Link>
          <Link to="/games" className="flex flex-col items-center gap-2 group w-full">
            <div className="w-full aspect-square rounded-2xl bg-neon-green/10 flex flex-col items-center justify-center border border-white/5 glass-card-hover transition-all duration-300 group-hover:scale-105">
              <Gift size={22} className="text-neon-glow mb-1" />
              <span className="text-[10px] font-bold text-white">Spin</span>
            </div>
          </Link>
        </div>
      </motion.div>

      <motion.div variants={item}>
         <div className="flex justify-between items-center mb-3 px-1">
           <h2 className="font-display font-bold text-white">Recent Activity</h2>
           <Link to="/wallet" className="text-xs text-royal-400 flex items-center gap-1">View All <ArrowRight size={12}/></Link>
        </div>
        <div className="space-y-2">
          {activities.length === 0 ? (
             <p className="text-gray-500 text-sm text-center py-4">No recent activity.</p>
          ) : (
            activities.slice(0,5).map((act) => (
              <GlassCard key={act.id} className="flex items-center justify-between py-2.5 px-3 bg-white/5 hover:bg-white/10" onClick={() => {}}>
                 <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                      act.type === 'earn' || act.type === 'bonus' ? 'bg-green-500/20 text-green-400' : 
                      act.type === 'withdraw' || act.type === 'invest' ? 'bg-red-500/20 text-red-400' : 
                      'bg-blue-500/20 text-blue-400'
                    }`}>
                      {act.type === 'earn' || act.type === 'bonus' ? <Zap size={14} /> : 
                       act.type === 'withdraw' || act.type === 'invest' ? <ArrowUpRight size={14} /> : 
                       <ActivityIcon size={14} />}
                    </div>
                    <div>
                      <h4 className="font-medium text-xs text-white">{act.title}</h4>
                      <p className="text-[10px] text-gray-500">
                        {new Date(act.time).toLocaleDateString()}
                      </p>
                    </div>
                 </div>
                 {act.amount && (
                   <span className={`text-xs font-bold font-mono ${act.type === 'withdraw' || act.type === 'invest' || act.type === 'game_loss' ? 'text-white' : 'text-neon-glow'}`}>
                     {act.type === 'withdraw' || act.type === 'invest' || act.type === 'game_loss' ? '-' : '+'}${act.amount.toFixed(2)}
                   </span>
                 )}
              </GlassCard>
            ))
          )}
        </div>
      </motion.div>
    </motion.div>
  );
};

export default Home;
