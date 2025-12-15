
import React, { useEffect, useState } from 'react';
import GlassCard from '../components/GlassCard';
import { 
  Trophy, Crown, TrendingUp, Medal, Flame, RefreshCw, 
  Search, ShieldCheck, User, ArrowUp, Star 
} from 'lucide-react';
import { supabase } from '../integrations/supabase/client';
import { motion, AnimatePresence } from 'framer-motion';
import Skeleton from '../components/Skeleton';
import BalanceDisplay from '../components/BalanceDisplay';
import GoogleAd from '../components/GoogleAd';
import { Link } from 'react-router-dom';

interface LeaderboardUser {
    id: string;
    uid: number;
    name: string;
    avatar?: string;
    amount: number;
    rank: number;
    level: number;
    isCurrentUser: boolean;
    badge?: string;
}

interface ProfileData {
    id: string;
    user_uid: number;
    name_1: string | null;
    avatar_1: string | null;
    level_1: number;
    is_kyc_1: boolean;
    is_dealer: boolean;
}

const Leaderboard: React.FC = () => {
  const [filter, setFilter] = useState<'earning' | 'invest'>('earning');
  const [leaders, setLeaders] = useState<LeaderboardUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<LeaderboardUser | null>(null);
  const [totalPool, setTotalPool] = useState(0);

  useEffect(() => {
      fetchData();
  }, [filter]);

  const fetchData = async () => {
      setLoading(true);
      try {
          const { data: { session } } = await supabase.auth.getSession();
          const userId = session?.user?.id;

          const sortField = filter === 'earning' ? 'total_earning' : 'investment_balance';

          // 1. Fetch Top 100 Wallets
          const { data: wallets, error } = await supabase
              .from('wallets')
              .select(`user_id, ${sortField}`)
              .order(sortField, { ascending: false })
              .limit(100);

          if (error) throw error;
          if (!wallets) {
             setLeaders([]);
             setLoading(false);
             return;
          }

          // 2. Fetch Associated Profiles
          const userIds = wallets.map((w: any) => w.user_id);
          const { data: profiles } = await supabase
              .from('profiles')
              .select('id, user_uid, name_1, avatar_1, level_1, is_kyc_1, is_dealer')
              .in('id', userIds);

          const profileMap = new Map<string, ProfileData>();
          if (profiles) {
              (profiles as any[]).forEach((p) => {
                  profileMap.set(p.id, p as ProfileData);
              });
          }

          // 3. Construct Leader List
          const list: LeaderboardUser[] = wallets.map((w: any, index: number) => {
              const p = profileMap.get(w.user_id) as ProfileData | undefined;
              return {
                  id: w.user_id,
                  uid: p?.user_uid || 0,
                  name: p?.name_1 || `User ${p?.user_uid || 'Unknown'}`,
                  avatar: p?.avatar_1 || undefined,
                  amount: w[sortField] || 0,
                  rank: index + 1,
                  level: p?.level_1 || 1,
                  isCurrentUser: w.user_id === userId,
                  badge: p?.is_dealer ? 'dealer' : p?.is_kyc_1 ? 'verified' : undefined
              };
          });

          setLeaders(list);

          // 4. Determine Current User Rank (if logged in)
          if (userId) {
              const userInTop = list.find(u => u.isCurrentUser);
              if (userInTop) {
                  setCurrentUser(userInTop);
              } else {
                  // Calculate rank if outside top 100
                  const { data: myWallet } = await supabase
                      .from('wallets')
                      .select(sortField)
                      .eq('user_id', userId)
                      .single();
                  
                  const myAmount = myWallet ? myWallet[sortField as keyof typeof myWallet] : 0;
                  
                  // Count how many have more than me
                  const { count } = await supabase
                      .from('wallets')
                      .select('*', { count: 'exact', head: true })
                      .gt(sortField, myAmount);
                  
                  const { data: myProfile } = await supabase
                      .from('profiles')
                      .select('name_1, avatar_1, level_1, user_uid')
                      .eq('id', userId)
                      .single();

                  setCurrentUser({
                      id: userId,
                      uid: myProfile?.user_uid || 0,
                      name: myProfile?.name_1 || 'You',
                      avatar: myProfile?.avatar_1,
                      amount: myAmount as number,
                      rank: (count || 0) + 1,
                      level: myProfile?.level_1 || 1,
                      isCurrentUser: true
                  });
              }
          }

          // Calculate Pool (Visual only)
          const pool = list.reduce((acc, curr) => acc + curr.amount, 0);
          setTotalPool(pool);

      } catch (e) {
          console.error("Leaderboard Error:", e);
      } finally {
          setLoading(false);
      }
  };

  const TopThree = () => {
      if (leaders.length === 0) return null;
      const [first, second, third] = leaders;

      return (
          <div className="flex justify-center items-end gap-2 sm:gap-4 mb-8 pt-4">
              {/* 2ND PLACE */}
              <div className="w-1/3 flex flex-col items-center">
                  {second && (
                      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="flex flex-col items-center relative">
                          <div className="relative mb-2">
                              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full border-4 border-slate-400 overflow-hidden shadow-[0_0_20px_rgba(148,163,184,0.3)] bg-[#1a1a1a]">
                                  <img src={second.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${second.name}`} className="w-full h-full object-cover" />
                              </div>
                              <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-slate-500 text-black text-xs font-black w-6 h-6 flex items-center justify-center rounded-full border-2 border-[#111]">2</div>
                          </div>
                          <p className="text-slate-300 font-bold text-xs truncate max-w-[80px]">{second.name.split(' ')[0]}</p>
                          <p className="text-slate-500 font-mono text-[10px] font-bold"><BalanceDisplay amount={second.amount} compact /></p>
                      </motion.div>
                  )}
              </div>

              {/* 1ST PLACE */}
              <div className="w-1/3 flex flex-col items-center pb-6">
                  {first && (
                      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col items-center relative">
                          <Crown size={32} className="text-yellow-400 mb-1 absolute -top-10 drop-shadow-lg animate-bounce" fill="currentColor" />
                          <div className="relative mb-2">
                              <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full border-4 border-yellow-400 overflow-hidden shadow-[0_0_30px_rgba(250,204,21,0.4)] bg-[#1a1a1a]">
                                  <img src={first.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${first.name}`} className="w-full h-full object-cover" />
                              </div>
                              <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-yellow-400 text-black text-sm font-black w-7 h-7 flex items-center justify-center rounded-full border-2 border-[#111]">1</div>
                          </div>
                          <p className="text-yellow-400 font-bold text-sm truncate max-w-[100px]">{first.name.split(' ')[0]}</p>
                          <p className="text-yellow-600 font-mono text-xs font-bold"><BalanceDisplay amount={first.amount} compact /></p>
                      </motion.div>
                  )}
              </div>

              {/* 3RD PLACE */}
              <div className="w-1/3 flex flex-col items-center">
                  {third && (
                      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="flex flex-col items-center relative">
                          <div className="relative mb-2">
                              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full border-4 border-orange-600 overflow-hidden shadow-[0_0_20px_rgba(234,88,12,0.3)] bg-[#1a1a1a]">
                                  <img src={third.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${third.name}`} className="w-full h-full object-cover" />
                              </div>
                              <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-orange-600 text-black text-xs font-black w-6 h-6 flex items-center justify-center rounded-full border-2 border-[#111]">3</div>
                          </div>
                          <p className="text-orange-400 font-bold text-xs truncate max-w-[80px]">{third.name.split(' ')[0]}</p>
                          <p className="text-orange-600 font-mono text-[10px] font-bold"><BalanceDisplay amount={third.amount} compact /></p>
                      </motion.div>
                  )}
              </div>
          </div>
      );
  };

  const getRankColor = (rank: number) => {
      if (rank === 1) return 'text-yellow-400';
      if (rank === 2) return 'text-slate-300';
      if (rank === 3) return 'text-orange-400';
      return 'text-gray-500';
  };

  if (loading) {
      return (
        <div className="pb-24 sm:pl-20 sm:pt-6 space-y-6 px-4 sm:px-0">
            <div className="flex justify-center pt-8">
                <Skeleton className="w-32 h-8" />
            </div>
            <div className="flex justify-center gap-4 mt-8 items-end">
                <Skeleton className="w-20 h-20 rounded-full" />
                <Skeleton className="w-24 h-24 rounded-full" />
                <Skeleton className="w-20 h-20 rounded-full" />
            </div>
            <div className="space-y-2 mt-8">
                {[1,2,3,4,5].map(i => <Skeleton key={i} className="h-16 rounded-xl" />)}
            </div>
        </div>
      );
  }

  return (
    <div className="pb-24 sm:pl-20 sm:pt-6 space-y-6 px-4 sm:px-0 relative min-h-screen">
       
       {/* Header */}
       <header className="flex flex-col items-center justify-center pt-4 relative z-10">
           <h1 className="text-2xl font-display font-black text-white uppercase tracking-wider flex items-center gap-2 mb-1">
               <Trophy className="text-yellow-400" /> Leaderboard
           </h1>
           <p className="text-gray-400 text-xs font-medium">Top 100 Users by {filter === 'earning' ? 'Total Income' : 'Portfolio Value'}</p>

           {/* Toggle */}
           <div className="flex bg-[#1a1a1a] p-1 rounded-xl border border-white/10 mt-6 shadow-lg">
               <button 
                   onClick={() => setFilter('earning')}
                   className={`px-6 py-2 rounded-lg text-xs font-bold uppercase transition flex items-center gap-2 ${filter === 'earning' ? 'bg-gradient-to-r from-green-600 to-emerald-600 text-white shadow' : 'text-gray-500 hover:text-white'}`}
               >
                   <TrendingUp size={14}/> Top Earners
               </button>
               <button 
                   onClick={() => setFilter('invest')}
                   className={`px-6 py-2 rounded-lg text-xs font-bold uppercase transition flex items-center gap-2 ${filter === 'invest' ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow' : 'text-gray-500 hover:text-white'}`}
               >
                   <ShieldCheck size={14}/> Top Investors
               </button>
           </div>
           
           <div className="mt-3 flex items-center gap-2 text-[10px] text-gray-500 font-mono">
               <Flame size={12} className="text-orange-500"/> Pool Volume: <span className="text-white"><BalanceDisplay amount={totalPool} /></span>
           </div>
       </header>

       {/* AD PLACEMENT */}
       <GoogleAd slot="4491147378" layoutKey="-gu-c+w-3l+7t" />

       {/* Podium */}
       <TopThree />

       {/* List */}
       <div className="space-y-2 relative z-10 max-w-2xl mx-auto pb-20">
           {leaders.slice(3).map((user) => (
               <motion.div 
                   key={user.id}
                   initial={{ opacity: 0, y: 10 }} 
                   animate={{ opacity: 1, y: 0 }}
                   className={`flex items-center gap-4 py-3 px-4 rounded-xl border transition-all ${user.isCurrentUser ? 'bg-blue-900/20 border-blue-500/50 shadow-[0_0_15px_rgba(59,130,246,0.1)]' : 'bg-[#111] border-white/5 hover:bg-white/5'}`}
               >
                   <div className={`font-black text-sm w-6 text-center ${getRankColor(user.rank)}`}>{user.rank}</div>
                   
                   <div className="w-10 h-10 rounded-full bg-black/40 overflow-hidden border border-white/10 shrink-0">
                       <img src={user.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.name}`} className="w-full h-full object-cover" loading="lazy" />
                   </div>

                   <div className="flex-1 min-w-0">
                       <div className="flex items-center gap-2">
                           <h4 className={`font-bold text-sm truncate ${user.isCurrentUser ? 'text-blue-400' : 'text-white'}`}>
                               {user.name}
                           </h4>
                           {user.badge === 'verified' && <ShieldCheck size={12} className="text-green-500" />}
                           {user.badge === 'dealer' && <Star size={12} className="text-yellow-500" fill="currentColor" />}
                       </div>
                       <p className="text-[10px] text-gray-500">Level {user.level}</p>
                   </div>

                   <div className="text-right">
                       <p className={`font-mono font-bold text-sm ${filter === 'earning' ? 'text-green-400' : 'text-blue-400'}`}>
                           <BalanceDisplay amount={user.amount} />
                       </p>
                   </div>
               </motion.div>
           ))}
           
           {leaders.length === 0 && (
               <div className="text-center py-10 text-gray-500 text-sm">No data available yet.</div>
           )}
       </div>

       {/* Sticky User Rank (If not in top 3 visible) */}
       {currentUser && currentUser.rank > 3 && (
           <div className="fixed bottom-0 left-0 right-0 p-4 z-50 bg-gradient-to-t from-black via-black/95 to-transparent pb-safe">
               <div className="max-w-2xl mx-auto">
                    <GlassCard className="flex items-center gap-4 py-3 px-4 border-t-2 border-t-blue-500 bg-[#1a1a1a] shadow-2xl relative overflow-hidden">
                        <div className="absolute inset-0 bg-blue-500/5 animate-pulse pointer-events-none"></div>
                        
                        <div className="font-black text-lg text-blue-400 w-8 text-center">{currentUser.rank}</div>
                        
                        <div className="w-10 h-10 rounded-full bg-black/40 overflow-hidden border border-white/10 shrink-0">
                            <img src={currentUser.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${currentUser.name}`} className="w-full h-full object-cover" />
                        </div>

                        <div className="flex-1 min-w-0">
                            <h4 className="font-bold text-white text-sm">You</h4>
                            <p className="text-[10px] text-gray-400">Level {currentUser.level}</p>
                        </div>

                        <div className="text-right">
                            <p className="font-mono font-bold text-sm text-white">
                                <BalanceDisplay amount={currentUser.amount} />
                            </p>
                            <p className="text-[9px] text-gray-500 uppercase">Your Stat</p>
                        </div>
                    </GlassCard>
               </div>
           </div>
       )}

    </div>
  );
};

export default Leaderboard;
