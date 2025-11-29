
import React, { useEffect, useState } from 'react';
import GlassCard from '../components/GlassCard';
import { Trophy, Crown, User, TrendingUp, Sparkles, Zap, Hexagon, Shield, Star, Flame, ChevronUp, ChevronDown, Medal } from 'lucide-react';
import { supabase } from '../integrations/supabase/client';
import { motion, AnimatePresence } from 'framer-motion';
import Skeleton from '../components/Skeleton';
import { Link } from 'react-router-dom';
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

      // Fetch top 50 wallets
      const { data: wallets } = await supabase
          .from('wallets')
          .select('user_id, today_earning, total_earning')
          .order(sortColumn, { ascending: false })
          .limit(50);

      if (wallets) {
          // Calculate "Live Pool" based on top earners to simulate ecosystem activity
          const pool = wallets.reduce((sum, w) => sum + (period === 'daily' ? w.today_earning : w.total_earning), 0);
          setTotalPool(pool * 1.2); 

          const userIds = wallets.map(w => w.user_id);
          const { data: profiles } = await supabase
              .from('profiles')
              .select('id, name_1, avatar_1, level_1')
              .in('id', userIds);
          
          const profileMap = new Map((profiles || []).map(p => [p.id, p]));
          
          const rankedList: LeaderboardUser[] = wallets.map((w, index) => {
              const profile = profileMap.get(w.user_id) as any;
              const amount = period === 'daily' ? w.today_earning : w.total_earning;
              
              // Logic System for Tiers
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
                  winRate: 45 + Math.random() * 50, // Simulated Stat for "Futures UI" feel
                  trend: Math.random() > 0.5 ? 'up' : 'down'
              };
          });

          setLeaders(rankedList);

          if (userId) {
              const me = rankedList.find(u => u.isCurrentUser);
              if (me) {
                  setMyRank(me);
              } else {
                  const { data: myWallet } = await supabase
                      .from('wallets')
                      .select('today_earning, total_earning')
                      .eq('user_id', userId)
                      .single();
                  
                  if (myWallet) {
                      setMyRank({
                          id: userId,
                          name: 'You',
                          amount: period === 'daily' ? myWallet.today_earning : myWallet.total_earning,
                          rank: 999,
                          tier: 'ROOKIE',
                          winRate: 0,
                          trend: 'neutral'
                      });
                  }
              }
          }
      }
      setLoading(false);
  };

  const getTierStyle = (tier: string) => {
      switch(tier) {
          case 'GOD': return { bg: 'bg-yellow-500', text: 'text-black', border: 'border-yellow-400', glow: 'shadow-[0_0_20px_rgba(250,204,21,0.4)]', ring: 'ring-yellow-500/50' };
          case 'LEGEND': return { bg: 'bg-red-500', text: 'text-white', border: 'border-red-500', glow: 'shadow-[0_0_15px_rgba(239,68,68,0.4)]', ring: 'ring-red-500/50' };
          case 'DIAMOND': return { bg: 'bg-cyan-400', text: 'text-black', border: 'border-cyan-400', glow: 'shadow-[0_0_15px_rgba(34,211,238,0.4)]', ring: 'ring-cyan-400/50' };
          case 'GOLD': return { bg: 'bg-amber-400', text: 'text-black', border: 'border-amber-400', glow: 'shadow-[0_0_10px_rgba(251,191,36,0.3)]', ring: 'ring-amber-400/50' };
          default: return { bg: 'bg-slate-700', text: 'text-gray-300', border: 'border-slate-600', glow: 'shadow-none', ring: 'ring-white/10' };
      }
  };

  // --- VFX COMPONENTS ---
  const FuturesBackground = () => (
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
          {/* Deep Space Grid - Moving */}
          <motion.div 
              initial={{ backgroundPosition: "0 0" }}
              animate={{ backgroundPosition: "40px 40px" }}
              transition={{ repeat: Infinity, duration: 4, ease: "linear" }}
              className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff_1px,transparent_1px),linear-gradient(to_bottom,#ffffff_1px,transparent_1px)] bg-[size:40px_40px] [mask-image:radial-gradient(ellipse_80%_50%_at_50%_0%,#000_70%,transparent_100%)] opacity-[0.03]"
          />
          
          {/* Nebula Glows - Dynamic */}
          <motion.div 
             animate={{ 
                 scale: [1, 1.2, 1], 
                 opacity: [0.1, 0.3, 0.1],
                 rotate: [0, 90, 0]
             }}
             transition={{ duration: 15, repeat: Infinity, ease: "easeInOut" }}
             className="absolute top-[-20%] left-[20%] w-[600px] h-[600px] bg-purple-600/20 blur-[120px] rounded-full mix-blend-screen"
          />
          <motion.div 
             animate={{ 
                 scale: [1, 1.3, 1], 
                 opacity: [0.1, 0.2, 0.1],
                 rotate: [0, -45, 0]
             }}
             transition={{ duration: 20, repeat: Infinity, ease: "easeInOut", delay: 2 }}
             className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-blue-600/10 blur-[100px] rounded-full mix-blend-screen"
          />
          
          {/* Floating Particles - Cyber Dust */}
          {Array.from({ length: 25 }).map((_, i) => (
              <motion.div
                  key={i}
                  className="absolute w-0.5 h-0.5 bg-white rounded-full box-shadow-[0_0_5px_white]"
                  initial={{ x: Math.random() * window.innerWidth, y: Math.random() * window.innerHeight, opacity: 0 }}
                  animate={{ 
                      y: [null, Math.random() * -200], 
                      opacity: [0, Math.random() * 0.5, 0] 
                  }}
                  transition={{ duration: Math.random() * 5 + 5, repeat: Infinity, ease: "linear", delay: Math.random() * 5 }}
              />
          ))}
      </div>
  );

  const Podium = () => {
      if (leaders.length < 3) return null;
      const [first, second, third] = [leaders[0], leaders[1], leaders[2]];

      return (
          <div className="relative pt-12 pb-8 mb-4 flex justify-center items-end gap-3 sm:gap-8 z-10 perspective-[1000px]">
              
              {/* RANK 2 */}
              <motion.div 
                 initial={{ opacity: 0, y: 100 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2, type: 'spring' }}
                 className="flex flex-col items-center group relative z-20"
              >
                  <div className="relative z-20">
                      <motion.div 
                        animate={{ y: [0, -8, 0] }} transition={{ duration: 4, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
                        className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl border-2 border-slate-300 bg-slate-800 overflow-hidden relative shadow-[0_0_30px_rgba(203,213,225,0.3)]"
                      >
                          <img src={second?.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${second.name}`} className="w-full h-full object-cover" />
                      </motion.div>
                      <div className="absolute -top-3 -right-3 w-8 h-8 bg-slate-200 text-slate-900 font-black flex items-center justify-center rounded-lg border-2 border-white shadow-lg transform rotate-12 z-30">
                          2
                      </div>
                  </div>
                  <div className="mt-[-10px] pt-4 pb-2 px-4 bg-gradient-to-b from-slate-800 to-slate-900/80 backdrop-blur-md rounded-b-xl border-x border-b border-slate-500/30 text-center min-w-[100px] shadow-lg">
                      <p className="text-slate-200 font-bold text-xs truncate max-w-[80px] mx-auto">{second.name.split(' ')[0]}</p>
                      <p className="text-slate-400 font-mono text-[10px]"><BalanceDisplay amount={second.amount} compact /></p>
                  </div>
                  <div className="h-16 w-full bg-gradient-to-t from-slate-900/80 to-slate-700/50 mt-1 rounded-t-lg mx-auto border-t border-slate-500/30"></div>
              </motion.div>

              {/* RANK 1 (Winner) */}
              <motion.div 
                 initial={{ opacity: 0, y: 100, scale: 0.8 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ delay: 0.1, type: 'spring' }}
                 className="flex flex-col items-center z-30 -mx-2 sm:mx-0 relative"
              >
                   {/* GOD AURA */}
                   <motion.div 
                      animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0.8, 0.5] }}
                      transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                      className="absolute -top-16 left-1/2 -translate-x-1/2 w-48 h-48 bg-yellow-500/20 rounded-full blur-3xl pointer-events-none"
                   ></motion.div>
                   
                   <div className="relative z-20">
                       <div className="absolute -top-14 left-1/2 -translate-x-1/2 z-40">
                           <motion.div animate={{ y: [0, -5, 0] }} transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}>
                                <Crown size={48} className="text-yellow-400 drop-shadow-[0_0_15px_rgba(250,204,21,0.8)]" fill="currentColor" />
                           </motion.div>
                       </div>
                       
                       <motion.div 
                         animate={{ y: [0, -10, 0], boxShadow: ["0 0 30px rgba(234,179,8,0.3)", "0 0 50px rgba(234,179,8,0.6)", "0 0 30px rgba(234,179,8,0.3)"] }} 
                         transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                         className="w-24 h-24 sm:w-32 sm:h-32 rounded-2xl border-4 border-yellow-400 bg-yellow-900 overflow-hidden relative"
                       >
                           <img src={first?.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${first?.name}`} className="w-full h-full object-cover" />
                           <div className="absolute inset-0 bg-gradient-to-tr from-yellow-500/20 to-transparent"></div>
                       </motion.div>
                       
                       <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 bg-gradient-to-r from-yellow-600 to-yellow-400 text-black font-black text-xs px-4 py-1.5 rounded-full border-2 border-white shadow-[0_0_20px_rgba(250,204,21,0.5)] z-40 whitespace-nowrap tracking-wider">
                           CHAMPION
                       </div>
                   </div>
                   
                   <div className="mt-4 pt-6 pb-3 px-6 bg-gradient-to-b from-yellow-900/80 to-slate-900/80 backdrop-blur-md rounded-b-xl border-x border-b border-yellow-500/50 text-center min-w-[120px] relative overflow-hidden shadow-[0_10px_30px_rgba(0,0,0,0.5)]">
                        <div className="absolute inset-0 bg-yellow-400/10 animate-pulse"></div>
                        <p className="text-yellow-400 font-black text-sm truncate max-w-[100px] mx-auto relative z-10">{first?.name.split(' ')[0]}</p>
                        <p className="text-yellow-200 font-mono text-xs font-bold relative z-10"><BalanceDisplay amount={first?.amount} compact /></p>
                   </div>
                   <div className="h-24 w-full bg-gradient-to-t from-yellow-900/40 to-yellow-600/20 mt-1 rounded-t-lg mx-auto border-t border-yellow-500/30 shadow-[0_0_30px_rgba(234,179,8,0.2)]"></div>
              </motion.div>

              {/* RANK 3 */}
              <motion.div 
                 initial={{ opacity: 0, y: 100 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3, type: 'spring' }}
                 className="flex flex-col items-center group relative z-20"
              >
                  <div className="relative z-20">
                      <motion.div 
                        animate={{ y: [0, -8, 0] }} transition={{ duration: 4.5, repeat: Infinity, ease: "easeInOut", delay: 1 }}
                        className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl border-2 border-orange-400 bg-orange-900 overflow-hidden relative shadow-[0_0_30px_rgba(251,146,60,0.3)]"
                      >
                          <img src={third?.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${third?.name}`} className="w-full h-full object-cover" />
                      </motion.div>
                      <div className="absolute -top-3 -left-3 w-8 h-8 bg-orange-400 text-orange-900 font-black flex items-center justify-center rounded-lg border-2 border-white shadow-lg transform -rotate-12 z-30">
                          3
                      </div>
                  </div>
                  <div className="mt-[-10px] pt-4 pb-2 px-4 bg-gradient-to-b from-orange-900/50 to-slate-900/80 backdrop-blur-md rounded-b-xl border-x border-b border-orange-500/30 text-center min-w-[100px] shadow-lg">
                      <p className="text-orange-300 font-bold text-xs truncate max-w-[80px] mx-auto">{third?.name.split(' ')[0]}</p>
                      <p className="text-orange-400 font-mono text-[10px]"><BalanceDisplay amount={third?.amount} compact /></p>
                  </div>
                  <div className="h-12 w-full bg-gradient-to-t from-slate-900/80 to-orange-900/20 mt-1 rounded-t-lg mx-auto border-t border-orange-500/30"></div>
              </motion.div>
          </div>
      );
  };

  if (loading) {
      return (
        <div className="pb-48 sm:pl-20 sm:pt-6 space-y-6 px-4 sm:px-0">
            <div className="flex justify-center gap-4 pt-10 items-end">
                <Skeleton className="w-24 h-40 rounded-2xl" />
                <Skeleton className="w-32 h-56 rounded-2xl" />
                <Skeleton className="w-24 h-32 rounded-2xl" />
            </div>
            <div className="space-y-3">
                {[1,2,3,4,5].map(i => <Skeleton key={i} className="h-20 rounded-xl" />)}
            </div>
        </div>
      );
  }

  return (
    <div className="pb-48 sm:pb-24 sm:pl-20 sm:pt-6 space-y-6 px-4 sm:px-0 relative min-h-screen overflow-x-hidden">
       {/* Enhanced VFX Background */}
       <FuturesBackground />

       {/* HEADER */}
       <header className="flex flex-col items-center justify-center pt-6 relative z-10">
           <motion.div 
             initial={{ scale: 0.8, opacity: 0 }} 
             animate={{ scale: 1, opacity: 1 }}
             className="inline-flex items-center gap-2 bg-white/5 border border-white/10 px-4 py-1.5 rounded-full mb-4 backdrop-blur-md shadow-sm"
           >
                <Trophy size={14} className="text-yellow-400" />
                <span className="text-[10px] font-bold text-gray-300 uppercase tracking-widest">Global Rankings</span>
           </motion.div>
           
           <motion.h1 
             initial={{ y: -20, opacity: 0 }}
             animate={{ y: 0, opacity: 1 }}
             className="text-4xl md:text-5xl font-display font-black text-white text-center mb-6 drop-shadow-[0_0_25px_rgba(255,255,255,0.2)]"
           >
               HALL OF <span className="text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 to-yellow-600">FAME</span>
           </motion.h1>

           {/* Toggle Controls */}
           <div className="bg-black/60 p-1.5 rounded-2xl border border-white/10 flex gap-1 relative z-20 backdrop-blur-xl shadow-xl">
               <button 
                 onClick={() => setPeriod('daily')} 
                 className={`relative px-6 py-2.5 rounded-xl text-xs font-black uppercase transition-all overflow-hidden ${period === 'daily' ? 'text-black' : 'text-gray-400 hover:text-white'}`}
               >
                   {period === 'daily' && (
                       <motion.div layoutId="bg-pill" className="absolute inset-0 bg-white rounded-xl shadow-[0_0_15px_rgba(255,255,255,0.5)]" />
                   )}
                   <span className="relative z-10">Daily Race</span>
               </button>
               <button 
                 onClick={() => setPeriod('all_time')} 
                 className={`relative px-6 py-2.5 rounded-xl text-xs font-black uppercase transition-all overflow-hidden ${period === 'all_time' ? 'text-black' : 'text-gray-400 hover:text-white'}`}
               >
                   {period === 'all_time' && (
                       <motion.div layoutId="bg-pill" className="absolute inset-0 bg-white rounded-xl shadow-[0_0_15px_rgba(255,255,255,0.5)]" />
                   )}
                   <span className="relative z-10">All Time</span>
               </button>
           </div>

           {/* Live Pool Info */}
           <motion.div 
                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                className="mt-6 flex items-center gap-3 text-xs font-bold text-gray-400 bg-black/40 px-6 py-2.5 rounded-xl border border-white/10 backdrop-blur-sm shadow-inner"
           >
                <div className="flex items-center gap-1.5 text-orange-500">
                    <Flame size={14} className="animate-pulse" fill="currentColor" />
                    <span className="uppercase tracking-wide text-[10px]">Live Pool</span>
                </div>
                <div className="h-4 w-px bg-white/10"></div>
                <span className="text-white font-mono text-lg tracking-tight drop-shadow-[0_0_8px_rgba(255,255,255,0.3)]">
                    <BalanceDisplay amount={totalPool} />
                </span>
           </motion.div>
       </header>

       {/* PODIUM */}
       <Podium />

       {/* RANK LIST */}
       <div className="space-y-3 relative z-10 max-w-2xl mx-auto">
           <AnimatePresence mode="popLayout">
           {leaders.slice(3).map((user, idx) => {
               const style = getTierStyle(user.tier);
               return (
                   <motion.div 
                     initial={{ opacity: 0, x: -20, y: 20 }} 
                     whileInView={{ opacity: 1, x: 0, y: 0 }} 
                     viewport={{ once: true, margin: "-50px" }}
                     transition={{ delay: idx * 0.05 }}
                     key={user.id}
                   >
                       <GlassCard className={`flex items-center gap-4 py-3 px-4 group hover:bg-white/10 transition border-l-4 ${style.border} ${user.isCurrentUser ? 'bg-white/10 border-l-white shadow-[inset_0_0_20px_rgba(255,255,255,0.05)]' : ''} relative overflow-hidden`}>
                           
                           {/* Rank Number */}
                           <div className="font-display font-black text-lg text-gray-500 w-8 text-center">{user.rank}</div>
                           
                           {/* Avatar & Tier */}
                           <div className="relative">
                               <div className={`w-12 h-12 rounded-xl bg-black/30 overflow-hidden border-2 ${style.border} group-hover:scale-110 transition duration-300 ring-2 ${style.ring}`}>
                                   <img src={user.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.name}`} className="w-full h-full object-cover" />
                               </div>
                               <div className={`absolute -bottom-2 -right-2 px-1.5 py-0.5 rounded text-[8px] font-black uppercase ${style.bg} ${style.text} border border-black shadow-sm z-10`}>
                                   {user.tier}
                               </div>
                           </div>

                           {/* User Info */}
                           <div className="flex-1 min-w-0 pl-2">
                               <div className="flex items-center gap-2">
                                   <h4 className={`font-bold text-sm truncate ${user.isCurrentUser ? 'text-white' : 'text-gray-200'} group-hover:text-white transition`}>
                                       {user.name} {user.isCurrentUser && <span className="text-[10px] text-neon-green ml-1 bg-neon-green/10 px-1 rounded">(YOU)</span>}
                                   </h4>
                                   {user.rank <= 10 && <Sparkles size={12} className="text-yellow-400 animate-pulse" />}
                               </div>
                               
                               <div className="flex items-center gap-3 text-[10px] text-gray-500 mt-1">
                                   <span className="flex items-center gap-1 bg-white/5 px-1.5 py-0.5 rounded border border-white/5">
                                       <Hexagon size={10} /> WR: {user.winRate?.toFixed(0)}%
                                   </span>
                                   {user.trend && (
                                       <span className={`flex items-center gap-0.5 ${user.trend === 'up' ? 'text-green-400' : 'text-red-400'}`}>
                                           {user.trend === 'up' ? <ChevronUp size={12}/> : <ChevronDown size={12}/>}
                                       </span>
                                   )}
                               </div>
                           </div>

                           {/* Amount */}
                           <div className="text-right">
                               <div className={`font-mono font-black text-base ${user.rank <= 10 ? 'text-neon-green' : 'text-white'} drop-shadow-md`}>
                                   <BalanceDisplay amount={user.amount} />
                               </div>
                               <div className="text-[9px] text-gray-600 uppercase font-bold tracking-wider">Total Earned</div>
                           </div>
                       </GlassCard>
                   </motion.div>
               );
           })}
           </AnimatePresence>
           
           {leaders.length === 0 && (
               <div className="text-center py-10 text-gray-500">No data available.</div>
           )}
       </div>

       {/* MY RANK STICKY FOOTER */}
       {!isGuest && myRank && (
           <motion.div 
             initial={{ y: 100, opacity: 0 }} 
             animate={{ y: 0, opacity: 1 }}
             transition={{ type: "spring", stiffness: 300, damping: 30, delay: 1 }}
             className="fixed bottom-[90px] sm:bottom-6 left-4 right-4 z-40 max-w-xl mx-auto"
           >
               <GlassCard className="border-electric-500/50 flex items-center justify-between p-3 sm:p-4 shadow-[0_0_30px_rgba(0,102,255,0.4)] bg-dark-900/95 backdrop-blur-xl relative overflow-hidden group ring-1 ring-electric-500/50">
                   {/* Animated Background */}
                   <div className="absolute inset-0 bg-electric-500/5 animate-pulse-slow"></div>
                   
                   {/* Shimmer Effect */}
                   <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:animate-shimmer pointer-events-none" />
                   
                   <div className="flex items-center gap-4 relative z-10">
                       <div className="flex flex-col items-center justify-center w-12 h-12 bg-black/60 rounded-xl border border-electric-500/30 shadow-inner">
                           <span className="text-[9px] text-electric-400 uppercase font-bold">Rank</span>
                           <span className="text-xl font-black text-white">{myRank.rank > 999 ? '999+' : myRank.rank}</span>
                       </div>
                       <div>
                           <p className="text-white font-bold text-sm">Your Position</p>
                           <p className="text-[10px] text-electric-300 flex items-center gap-1 font-bold bg-electric-500/10 px-2 py-0.5 rounded-full w-fit mt-1 border border-electric-500/20">
                               <Shield size={10} /> {myRank.tier} LEAGUE
                           </p>
                       </div>
                   </div>
                   <div className="text-right relative z-10">
                       <p className="text-neon-green font-black font-mono text-xl drop-shadow-[0_0_10px_rgba(16,185,129,0.5)]">
                           <BalanceDisplay amount={myRank.amount} />
                       </p>
                       <p className="text-[9px] text-gray-400 uppercase font-bold tracking-widest">Lifetime Earnings</p>
                   </div>
               </GlassCard>
           </motion.div>
       )}
    </div>
  );
};

export default Leaderboard;
