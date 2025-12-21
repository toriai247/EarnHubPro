
import React, { useEffect, useState } from 'react';
import GlassCard from '../components/GlassCard';
import { 
  Trophy, Crown, TrendingUp, Flame, 
  ShieldCheck, ArrowUp, Star, Clock, AlertCircle, RefreshCw
} from 'lucide-react';
import { supabase } from '../integrations/supabase/client';
import { motion, AnimatePresence } from 'framer-motion';
import Skeleton from '../components/Skeleton';
import BalanceDisplay from '../components/BalanceDisplay';
import GoogleAd from '../components/GoogleAd';
import { useSimulation } from '../context/SimulationContext';

interface LeaderboardUser {
    id: string;
    uid?: number;
    name: string;
    avatar?: string;
    amount: number;
    rank: number;
    level: number;
    isCurrentUser: boolean;
    isBot?: boolean;
}

const Leaderboard: React.FC = () => {
  const { topWinners, nextUpdate } = useSimulation();
  const [filter, setFilter] = useState<'earning' | 'invest'>('earning');
  const [leaders, setLeaders] = useState<LeaderboardUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<LeaderboardUser | null>(null);

  useEffect(() => {
      fetchData();
  }, [filter, topWinners]);

  const fetchData = async () => {
      setLoading(true);
      try {
          const { data: { session } } = await supabase.auth.getSession();
          const userId = session?.user?.id;

          // Merge Simulated Bots with Real User data for a "Live" feel
          const combined = [...topWinners];

          if (userId) {
              const { data: myWallet } = await supabase
                  .from('wallets')
                  .select('total_earning, investment_balance')
                  .eq('user_id', userId)
                  .single();
              
              const { data: myProfile } = await supabase
                  .from('profiles')
                  .select('name_1, avatar_1, level_1, user_uid')
                  .eq('id', userId)
                  .single();

              if (myWallet && myProfile) {
                  const myAmount = filter === 'earning' ? myWallet.total_earning : myWallet.investment_balance;
                  const me = {
                      id: userId,
                      name: myProfile.name_1 || 'You',
                      avatar: myProfile.avatar_1 || undefined,
                      amount: myAmount,
                      rank: 0, // Calculated below
                      level: myProfile.level_1,
                      isCurrentUser: true,
                      uid: myProfile.user_uid
                  };
                  combined.push(me);
              }
          }

          // Sort combined list
          const sorted = combined.sort((a, b) => b.amount - a.amount);
          
          // Assign ranks
          const ranked = sorted.map((u, i) => ({ ...u, rank: i + 1 }));
          
          setLeaders(ranked.slice(0, 50)); // Show top 50
          setCurrentUser(ranked.find(u => u.isCurrentUser) || null);

      } catch (e) {
          console.error("Leaderboard Error:", e);
      } finally {
          setLoading(false);
      }
  };

  const getRankColor = (rank: number) => {
      if (rank === 1) return 'text-yellow-400';
      if (rank === 2) return 'text-slate-300';
      if (rank === 3) return 'text-orange-400';
      return 'text-gray-500';
  };

  if (loading) return <div className="p-10"><Skeleton className="h-64 rounded-xl" /></div>;

  return (
    <div className="pb-24 sm:pl-20 sm:pt-6 space-y-6 px-4 sm:px-0 relative min-h-screen">
       
       <header className="flex flex-col items-center justify-center pt-4 text-center">
           <div className="w-16 h-16 bg-yellow-500/10 rounded-full flex items-center justify-center mb-4 border-2 border-yellow-500/30">
               <Trophy className="text-yellow-400" size={32} />
           </div>
           <h1 className="text-2xl font-black text-white uppercase tracking-wider mb-1">Elite Rankings</h1>
           <p className="text-gray-500 text-xs font-bold uppercase tracking-widest flex items-center gap-2">
               <Clock size={12}/> Updates in: <span className="text-white">{nextUpdate}</span>
           </p>

           <div className="flex bg-[#1a1a1a] p-1 rounded-xl border border-white/10 mt-6 shadow-lg">
               <button onClick={() => setFilter('earning')} className={`px-6 py-2 rounded-lg text-xs font-bold uppercase transition ${filter === 'earning' ? 'bg-brand text-black shadow' : 'text-gray-500 hover:text-white'}`}>Top Earners</button>
               <button onClick={() => setFilter('invest')} className={`px-6 py-2 rounded-lg text-xs font-bold uppercase transition ${filter === 'invest' ? 'bg-brand text-black shadow' : 'text-gray-500 hover:text-white'}`}>Investors</button>
           </div>
       </header>

       <GoogleAd slot="4491147378" />

       {/* PODIUM PREVIEW (TOP 3) */}
       <div className="flex justify-center items-end gap-3 mb-8 pt-4">
           {leaders.slice(0, 3).map((u, i) => {
               const pos = i === 0 ? 1 : i === 1 ? 0 : 2; // Order: 2, 1, 3
               const user = leaders[pos];
               if(!user) return null;
               const size = pos === 1 ? 'w-24 h-24' : 'w-16 h-16';
               return (
                   <div key={user.id} className={`flex flex-col items-center ${pos === 1 ? 'mb-4' : 'mb-0'}`}>
                       <div className="relative">
                            <div className={`${size} rounded-full border-4 ${pos === 1 ? 'border-yellow-400' : 'border-white/20'} overflow-hidden bg-black/40 shadow-xl`}>
                                <img src={user.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.name}`} className="w-full h-full object-cover" alt="" />
                            </div>
                            <div className={`absolute -bottom-2 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-full text-[10px] font-black border-2 border-black shadow-lg ${pos === 1 ? 'bg-yellow-400 text-black' : 'bg-gray-700 text-white'}`}>
                                {pos + 1}
                            </div>
                       </div>
                       <p className="text-[10px] font-bold text-white mt-3 truncate w-20 text-center">{user.name}</p>
                       <p className="text-brand font-mono text-[10px] font-black"><BalanceDisplay amount={user.amount} compact /></p>
                   </div>
               );
           })}
       </div>

       <div className="space-y-2 max-w-2xl mx-auto pb-20">
           {leaders.map((user) => (
               <motion.div 
                   key={user.id}
                   initial={{ opacity: 0, y: 10 }} 
                   animate={{ opacity: 1, y: 0 }}
                   className={`flex items-center gap-4 py-3 px-4 rounded-xl border transition-all ${user.isCurrentUser ? 'bg-brand/10 border-brand shadow-[0_0_15px_rgba(var(--color-brand),0.1)]' : 'bg-[#111] border-white/5 hover:bg-white/5'}`}
               >
                   <div className={`font-black text-sm w-6 text-center ${getRankColor(user.rank)}`}>{user.rank}</div>
                   <div className="w-10 h-10 rounded-full bg-black/40 overflow-hidden border border-white/10 shrink-0">
                       <img src={user.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.name}`} className="w-full h-full object-cover" alt="" />
                   </div>
                   <div className="flex-1 min-w-0">
                       <h4 className={`font-bold text-sm truncate ${user.isCurrentUser ? 'text-brand' : 'text-white'}`}>{user.name}</h4>
                       <div className="flex items-center gap-2">
                           <span className="text-[9px] text-gray-500 uppercase font-bold">LVL {user.level}</span>
                           {user.isBot && <span className="text-[8px] bg-green-500/20 text-green-400 px-1 rounded font-bold border border-green-500/20">VERIFIED</span>}
                       </div>
                   </div>
                   <div className="text-right">
                       <p className="font-mono font-black text-white text-sm"><BalanceDisplay amount={user.amount} compact /></p>
                   </div>
               </motion.div>
           ))}
       </div>

       {/* Sticky Rank Card */}
       {currentUser && (
           <div className="fixed bottom-0 left-0 right-0 p-4 z-50 bg-gradient-to-t from-black via-black to-transparent pb-safe sm:hidden">
               <div className="bg-brand border-2 border-black p-3 rounded-2xl flex items-center justify-between shadow-2xl">
                   <div className="flex items-center gap-3">
                       <div className="w-10 h-10 rounded-full bg-black flex items-center justify-center text-white font-black">{currentUser.rank}</div>
                       <div>
                           <p className="text-[10px] text-black/60 font-black uppercase tracking-widest">Your Ranking</p>
                           <p className="text-black font-black leading-none">৳{currentUser.amount.toLocaleString()}</p>
                       </div>
                   </div>
                   <button onClick={() => window.scrollTo({top:0, behavior:'smooth'})} className="p-2 bg-black/10 rounded-lg"><ArrowUp size={20} className="text-black"/></button>
               </div>
           </div>
       )}
    </div>
  );
};

export default Leaderboard;
