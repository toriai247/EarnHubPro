
import React, { useEffect, useState } from 'react';
import GlassCard from '../components/GlassCard';
import { Trophy, Crown, TrendingUp, Hexagon, ChevronUp, ChevronDown, Medal, Flame, RefreshCw } from 'lucide-react';
import { supabase } from '../integrations/supabase/client';
import { motion, AnimatePresence } from 'framer-motion';
import Skeleton from '../components/Skeleton';
import BalanceDisplay from '../components/BalanceDisplay';

interface LeaderboardUser {
    id: string;
    name: string;
    avatar?: string;
    amount: number;
    rank: number;
    isCurrentUser?: boolean;
    tier: string;
    winRate?: number;
    trend?: 'up' | 'down' | 'neutral';
}

const Leaderboard: React.FC = () => {
  const [period, setPeriod] = useState<'daily' | 'all_time'>('daily');
  const [leaders, setLeaders] = useState<LeaderboardUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [myRank, setMyRank] = useState<LeaderboardUser | null>(null);
  const [isGuest, setIsGuest] = useState(true);
  const [totalPool, setTotalPool] = useState(0);

  useEffect(() => {
      fetchLeaders();
  }, [period]);

  const fetchLeaders = async () => {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      const userId = session?.user?.id;
      setIsGuest(!userId);

      const sortColumn = period === 'daily' ? 'today_earning' : 'total_earning';

      try {
          // Fetch Top 50
          const { data: wallets } = await supabase
              .from('wallets')
              .select('user_id, today_earning, total_earning')
              .order(sortColumn, { ascending: false })
              .limit(50);

          if (wallets) {
              const pool = wallets.reduce((sum: number, w: any) => sum + (period === 'daily' ? w.today_earning : w.total_earning), 0);
              setTotalPool(pool * 1.2); 

              const userIds = wallets.map((w: any) => w.user_id);
              const { data: profiles } = await supabase
                  .from('profiles')
                  .select('id, name_1, avatar_1, level_1')
                  .in('id', userIds);
              
              const profileMap = new Map((profiles || []).map((p: any) => [p.id, p]));
              
              const rankedList: LeaderboardUser[] = wallets.map((w: any, index: number) => {
                  const profile = profileMap.get(w.user_id) as any;
                  const amount = period === 'daily' ? w.today_earning : w.total_earning;
                  
                  let tier = 'IRON';
                  if (index === 0) tier = 'GOD';
                  else if (index < 3) tier = 'LEGEND';
                  else if (index < 10) tier = 'DIAMOND';
                  else if (index < 25) tier = 'GOLD';
                  else if (index < 40) tier = 'SILVER';
                  
                  return {
                      id: w.user_id,
                      name: profile?.name_1 || `User ${w.user_id.slice(0,4)}`,
                      avatar: profile?.avatar_1 || undefined,
                      amount: amount,
                      rank: index + 1,
                      isCurrentUser: w.user_id === userId,
                      tier,
                      winRate: 45 + Math.random() * 50,
                      trend: Math.random() > 0.5 ? 'up' : 'down'
                  };
              });

              setLeaders(rankedList);

              if (userId) {
                  const meIndex = rankedList.findIndex(u => u.isCurrentUser);
                  if (meIndex !== -1) {
                      setMyRank(rankedList[meIndex]);
                  } else {
                      // Calculate real rank if not in top 50
                      const { data: myWallet } = await supabase
                          .from('wallets')
                          .select(`today_earning, total_earning`)
                          .eq('user_id', userId)
                          .single();
                      
                      if (myWallet) {
                          const myVal = period === 'daily' ? myWallet.today_earning : myWallet.total_earning;
                          
                          // Count how many users have MORE earnings than current user
                          const { count } = await supabase
                              .from('wallets')
                              .select('*', { count: 'exact', head: true })
                              .gt(sortColumn, myVal);
                          
                          const realRank = (count || 0) + 1;

                          setMyRank({
                              id: userId,
                              name: 'You',
                              amount: myVal,
                              rank: realRank,
                              tier: 'ROOKIE',
                              winRate: 0,
                              trend: 'neutral'
                          });
                      }
                  }
              }
          }
      } catch (e) {
          console.error("Leaderboard Error:", e);
      } finally {
          setLoading(false);
      }
  };

  const getTierColor = (tier: string) => {
      switch(tier) {
          case 'GOD': return 'text-yellow-400 border-yellow-500';
          case 'LEGEND': return 'text-red-400 border-red-500';
          case 'DIAMOND': return 'text-cyan-400 border-cyan-500';
          case 'GOLD': return 'text-amber-400 border-amber-500';
          default: return 'text-gray-400 border-gray-600';
      }
  };

  const Podium = () => {
      if (leaders.length === 0) return null;
      
      const first = leaders[0];
      const second = leaders.length > 1 ? leaders[1] : null;
      const third = leaders.length > 2 ? leaders[2] : null;

      return (
          <div className="flex justify-center items-end gap-4 sm:gap-6 mb-8 mt-4 px-4 min-h-[180px]">
              {/* RANK 2 */}
              <div className="w-1/3 max-w-[100px] flex flex-col items-center">
                  {second ? (
                      <motion.div 
                         initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
                         className="flex flex-col items-center w-full"
                      >
                          <div className="relative mb-2">
                              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full border-4 border-slate-400 overflow-hidden shadow-lg bg-surface">
                                  <img src={second.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${second.name}`} className="w-full h-full object-cover" loading="lazy" />
                              </div>
                              <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-slate-500 text-white text-xs font-bold w-6 h-6 flex items-center justify-center rounded-full border-2 border-surface">2</div>
                          </div>
                          <p className="text-white font-bold text-xs truncate w-full text-center">{second.name.split(' ')[0]}</p>
                          <p className="text-slate-400 font-mono text-[10px] font-bold"><BalanceDisplay amount={second.amount} compact /></p>
                      </motion.div>
                  ) : <div className="w-full h-full"/>}
              </div>

              {/* RANK 1 */}
              <div className="w-1/3 max-w-[120px] flex flex-col items-center pb-4">
                  {first ? (
                      <motion.div 
                         initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0 }}
                         className="flex flex-col items-center w-full"
                      >
                           <div className="relative mb-3">
                               <Crown size={32} className="absolute -top-8 left-1/2 -translate-x-1/2 text-yellow-400 drop-shadow-md" fill="currentColor" />
                               <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full border-4 border-yellow-400 overflow-hidden shadow-[0_0_20px_rgba(250,204,21,0.3)] bg-surface">
                                   <img src={first.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${first.name}`} className="w-full h-full object-cover" loading="lazy" />
                               </div>
                               <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-yellow-500 text-black text-sm font-black w-7 h-7 flex items-center justify-center rounded-full border-2 border-surface">1</div>
                           </div>
                           <p className="text-yellow-400 font-bold text-sm truncate w-full text-center">{first.name.split(' ')[0]}</p>
                           <p className="text-yellow-200 font-mono text-xs font-bold"><BalanceDisplay amount={first.amount} compact /></p>
                      </motion.div>
                  ) : null}
              </div>

              {/* RANK 3 */}
              <div className="w-1/3 max-w-[100px] flex flex-col items-center">
                  {third ? (
                      <motion.div 
                         initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
                         className="flex flex-col items-center w-full"
                      >
                          <div className="relative mb-2">
                              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full border-4 border-orange-500 overflow-hidden shadow-lg bg-surface">
                                  <img src={third.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${third.name}`} className="w-full h-full object-cover" loading="lazy" />
                              </div>
                              <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-orange-600 text-white text-xs font-bold w-6 h-6 flex items-center justify-center rounded-full border-2 border-surface">3</div>
                          </div>
                          <p className="text-white font-bold text-xs truncate w-full text-center">{third.name.split(' ')[0]}</p>
                          <p className="text-orange-400 font-mono text-[10px] font-bold"><BalanceDisplay amount={third.amount} compact /></p>
                      </motion.div>
                  ) : <div className="w-full h-full"/>}
              </div>
          </div>
      );
  };

  if (loading) {
      return (
        <div className="pb-48 sm:pl-20 sm:pt-6 space-y-6 px-4 sm:px-0">
            <div className="flex justify-center gap-4 pt-10 items-end">
                <Skeleton className="w-24 h-24 rounded-full" />
                <Skeleton className="w-32 h-32 rounded-full" />
                <Skeleton className="w-24 h-24 rounded-full" />
            </div>
            <div className="space-y-3">
                {[1,2,3,4,5].map(i => <Skeleton key={i} className="h-16 rounded-xl" />)}
            </div>
        </div>
      );
  }

  return (
    <div className="pb-24 sm:pl-20 sm:pt-6 space-y-6 px-4 sm:px-0 relative min-h-screen">
       {/* Simple Background Gradient */}
       <div className="fixed inset-0 pointer-events-none z-0 bg-gradient-to-b from-electric-900/10 to-void"></div>

       {/* HEADER */}
       <header className="flex flex-col items-center justify-center pt-6 relative z-10">
           <div className="flex items-center gap-2 mb-3 w-full justify-between px-6 max-w-md">
                <div className="w-8"></div> {/* Spacer */}
                <div className="inline-flex items-center gap-2 bg-surface/50 border border-white/10 px-4 py-1 rounded-full shadow-sm">
                        <Trophy size={14} className="text-yellow-400" />
                        <span className="text-[10px] font-bold text-gray-300 uppercase tracking-widest">Global Rankings</span>
                </div>
                <button onClick={fetchLeaders} className="p-2 rounded-full bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition">
                    <RefreshCw size={16} />
                </button>
           </div>
           
           <h1 className="text-3xl font-display font-black text-white text-center mb-6">
               LEADER<span className="text-electric-500">BOARD</span>
           </h1>

           {/* Toggle Controls */}
           <div className="bg-surface p-1 rounded-lg border border-border-neo flex gap-1 relative z-20 shadow-neo-sm mb-4">
               <button 
                 onClick={() => setPeriod('daily')} 
                 className={`px-6 py-2 rounded text-xs font-bold uppercase transition-all ${period === 'daily' ? 'bg-electric-500 text-white shadow-sm' : 'text-gray-400 hover:text-white'}`}
               >
                   Daily
               </button>
               <button 
                 onClick={() => setPeriod('all_time')} 
                 className={`px-6 py-2 rounded text-xs font-bold uppercase transition-all ${period === 'all_time' ? 'bg-electric-500 text-white shadow-sm' : 'text-gray-400 hover:text-white'}`}
               >
                   All Time
               </button>
           </div>

           {/* Live Pool Info */}
           <div className="flex items-center gap-2 text-xs font-bold text-gray-400 mb-4">
                <Flame size={14} className="text-orange-500" fill="currentColor" />
                <span className="uppercase tracking-wide text-[10px]">Live Pool</span>
                <span className="text-white font-mono tracking-tight ml-1">
                    <BalanceDisplay amount={totalPool} />
                </span>
           </div>
       </header>

       {/* MY RANKING - TOP POSITION */}
       {!isGuest && myRank && (
           <motion.div 
             initial={{ opacity: 0, scale: 0.95 }} 
             animate={{ opacity: 1, scale: 1 }}
             className="relative z-20 max-w-md mx-auto w-full px-2 sm:px-0"
           >
               <GlassCard className="bg-gradient-to-r from-electric-900/40 to-purple-900/40 border-electric-500/30 p-4 flex items-center justify-between shadow-neo-lg">
                   <div className="flex items-center gap-4">
                       <div className="flex flex-col items-center justify-center w-12 h-12 bg-electric-600 text-white rounded-xl shadow-lg border-2 border-electric-400">
                           <span className="text-[8px] font-bold uppercase opacity-90">Rank</span>
                           <span className="text-lg font-black leading-none">{myRank.rank > 999 ? '999+' : myRank.rank}</span>
                       </div>
                       <div>
                           <p className="text-white font-bold text-sm">Your Position</p>
                           <p className="text-[10px] text-gray-400 font-bold tracking-wide">{myRank.tier} LEAGUE</p>
                       </div>
                   </div>
                   <div className="text-right">
                       <p className="text-neon-green font-black font-mono text-lg">
                           <BalanceDisplay amount={myRank.amount} />
                       </p>
                       <p className="text-[9px] text-gray-500 uppercase font-bold tracking-wider">Earnings</p>
                   </div>
               </GlassCard>
           </motion.div>
       )}

       <Podium />

       {/* RANK LIST */}
       <div className="space-y-2 relative z-10 max-w-2xl mx-auto">
           {leaders.slice(3).map((user, idx) => {
               const tierColor = getTierColor(user.tier);
               return (
                   <motion.div 
                     initial={{ opacity: 0, y: 10 }} 
                     animate={{ opacity: 1, y: 0 }} 
                     transition={{ delay: 0.05 * idx }}
                     key={user.id}
                   >
                       <div className={`flex items-center gap-4 py-3 px-4 rounded-xl bg-surface border border-border-neo ${user.isCurrentUser ? 'border-electric-500 bg-electric-900/10' : ''}`}>
                           
                           {/* Rank */}
                           <div className="font-display font-black text-lg text-gray-500 w-8 text-center">{user.rank}</div>
                           
                           {/* Avatar */}
                           <div className={`w-10 h-10 rounded-full bg-black/30 overflow-hidden border ${tierColor.split(' ')[1]}`}>
                               <img src={user.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.name}`} className="w-full h-full object-cover" loading="lazy" />
                           </div>

                           {/* Info */}
                           <div className="flex-1 min-w-0">
                               <div className="flex items-center gap-2">
                                   <h4 className={`font-bold text-sm truncate ${user.isCurrentUser ? 'text-white' : 'text-gray-200'}`}>
                                       {user.name} {user.isCurrentUser && <span className="text-[10px] text-electric-400 bg-electric-500/10 px-1 rounded ml-1">YOU</span>}
                                   </h4>
                               </div>
                               
                               <div className="flex items-center gap-3 text-[10px] text-gray-500 mt-0.5">
                                   <span className={`font-bold ${tierColor.split(' ')[0]}`}>{user.tier}</span>
                                   <span className="flex items-center gap-1">
                                       <Hexagon size={10} /> {user.winRate?.toFixed(0)}% WR
                                   </span>
                               </div>
                           </div>

                           {/* Amount */}
                           <div className="text-right">
                               <div className="font-mono font-bold text-white text-sm">
                                   <BalanceDisplay amount={user.amount} />
                               </div>
                               {user.trend && (
                                   <div className={`flex items-center justify-end text-[10px] ${user.trend === 'up' ? 'text-green-500' : 'text-red-500'}`}>
                                       {user.trend === 'up' ? <ChevronUp size={10}/> : <ChevronDown size={10}/>}
                                   </div>
                                )}
                           </div>
                       </div>
                   </motion.div>
               );
           })}
           
           {leaders.length === 0 && (
               <div className="text-center py-10 text-gray-500 text-sm">No ranking data available.</div>
           )}
       </div>
    </div>
  );
};

export default Leaderboard;
