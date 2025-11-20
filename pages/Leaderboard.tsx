
import React, { useEffect, useState } from 'react';
import GlassCard from '../components/GlassCard';
import { Trophy, Crown, User, TrendingUp, Calendar, Filter, Medal } from 'lucide-react';
import { supabase } from '../integrations/supabase/client';
import { motion } from 'framer-motion';
import Skeleton from '../components/Skeleton';

interface LeaderboardUser {
    id: string;
    name: string;
    avatar?: string;
    amount: number;
    rank?: number;
    isCurrentUser?: boolean;
}

const Leaderboard: React.FC = () => {
  const [period, setPeriod] = useState<'daily' | 'all_time'>('daily');
  const [leaders, setLeaders] = useState<LeaderboardUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [myRank, setMyRank] = useState<LeaderboardUser | null>(null);

  useEffect(() => {
      fetchLeaders();
  }, [period]);

  const fetchLeaders = async () => {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      const userId = session?.user?.id;

      // Determine sort column based on period
      const sortColumn = period === 'daily' ? 'today_earning' : 'total_earning';

      // Fetch top 50 wallets
      const { data: wallets, error } = await supabase
          .from('wallets')
          .select('user_id, today_earning, total_earning')
          .order(sortColumn, { ascending: false })
          .limit(50);

      if (wallets) {
          // Fetch Profile Data for these wallets
          // Note: We can't do a JOIN easily without RLS setups that might block reading other profiles
          // Ideally, you'd have a public_profiles view. For now, assuming we can read minimal profile data or use Edge Function.
          // If RLS blocks reading others, this will return nulls. Assuming RLS allows reading basic profile info (name/avatar).
          
          const userIds = wallets.map(w => w.user_id);
          const { data: profiles } = await supabase
              .from('profiles')
              .select('id, name_1, avatar_1')
              .in('id', userIds);
          
          const profileMap = new Map((profiles || []).map(p => [p.id, p]));
          
          const rankedList: LeaderboardUser[] = wallets.map((w, index) => {
              const profile = profileMap.get(w.user_id) as { name_1: string | null, avatar_1: string | null } | undefined;
              const amount = period === 'daily' ? w.today_earning : w.total_earning;
              
              return {
                  id: w.user_id,
                  name: profile?.name_1 || `User ${w.user_id.slice(0,4)}`,
                  avatar: profile?.avatar_1 || undefined,
                  amount: amount,
                  rank: index + 1,
                  isCurrentUser: w.user_id === userId
              };
          });

          setLeaders(rankedList);

          // Find current user rank if not in top 50
          const me = rankedList.find(u => u.isCurrentUser);
          if (me) {
              setMyRank(me);
          } else if (userId) {
              // Fetch my specific wallet to show at bottom
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
                      rank: 999 // Placeholder for > 50
                  });
              }
          }
      }
      setLoading(false);
  };

  const TopThree = () => {
      if (leaders.length < 3) return null;
      const [first, second, third] = [leaders[0], leaders[1], leaders[2]];

      return (
          <div className="flex justify-center items-end gap-2 sm:gap-6 mb-8 mt-4">
              {/* Second Place */}
              <motion.div 
                 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
                 className="flex flex-col items-center"
              >
                  <div className="relative mb-2">
                      <div className="w-16 h-16 rounded-full border-4 border-slate-300 overflow-hidden bg-slate-800 shadow-[0_0_20px_rgba(203,213,225,0.3)]">
                          <img src={second?.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${second.name}`} alt="" className="w-full h-full object-cover" />
                      </div>
                      <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-slate-300 text-black text-xs font-bold px-2 py-0.5 rounded-full border border-slate-400 flex items-center gap-1">
                          2 <Crown size={10} />
                      </div>
                  </div>
                  <h3 className="text-sm font-bold text-slate-200 max-w-[80px] truncate text-center">{second.name}</h3>
                  <p className="text-xs text-slate-400 font-mono font-bold">${second.amount.toFixed(2)}</p>
              </motion.div>

              {/* First Place */}
              <motion.div 
                 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
                 className="flex flex-col items-center -mt-8 z-10"
              >
                   <div className="relative mb-3">
                      <div className="absolute -top-6 left-1/2 -translate-x-1/2 text-yellow-400 animate-bounce">
                          <Crown size={24} fill="currentColor" />
                      </div>
                      <div className="w-24 h-24 rounded-full border-4 border-yellow-400 overflow-hidden bg-yellow-900/20 shadow-[0_0_30px_rgba(250,204,21,0.5)] relative">
                           <div className="absolute inset-0 bg-[conic-gradient(from_0deg,transparent,rgba(250,204,21,0.5),transparent)] animate-spin-slow"></div>
                          <img src={first?.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${first.name}`} alt="" className="w-full h-full object-cover relative z-10 rounded-full border-2 border-black" />
                      </div>
                      <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 bg-gradient-to-r from-yellow-400 to-orange-500 text-black text-sm font-bold px-3 py-0.5 rounded-full border border-yellow-200 shadow-lg">
                          #1
                      </div>
                  </div>
                  <h3 className="text-base font-bold text-yellow-400 max-w-[100px] truncate text-center">{first.name}</h3>
                  <p className="text-sm text-white font-mono font-bold bg-white/10 px-2 rounded">${first.amount.toFixed(2)}</p>
              </motion.div>

              {/* Third Place */}
              <motion.div 
                 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
                 className="flex flex-col items-center"
              >
                  <div className="relative mb-2">
                      <div className="w-16 h-16 rounded-full border-4 border-amber-700 overflow-hidden bg-amber-900/20 shadow-[0_0_20px_rgba(180,83,9,0.3)]">
                          <img src={third?.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${third.name}`} alt="" className="w-full h-full object-cover" />
                      </div>
                      <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-amber-700 text-white text-xs font-bold px-2 py-0.5 rounded-full border border-amber-600 flex items-center gap-1">
                          3 <Crown size={10} />
                      </div>
                  </div>
                  <h3 className="text-sm font-bold text-amber-500 max-w-[80px] truncate text-center">{third.name}</h3>
                  <p className="text-xs text-amber-700/80 font-mono font-bold">${third.amount.toFixed(2)}</p>
              </motion.div>
          </div>
      );
  };

  return (
    <div className="pb-24 sm:pl-20 sm:pt-6 space-y-4 relative min-h-screen">
        <header className="px-4 sm:px-0 flex justify-between items-center">
            <div>
                <h1 className="text-2xl font-display font-bold text-white flex items-center gap-2">
                    <Trophy className="text-yellow-400" /> Leaderboard
                </h1>
                <p className="text-xs text-gray-400">Top earners hall of fame.</p>
            </div>
            <div className="bg-white/5 p-1 rounded-lg flex text-xs font-bold">
                <button 
                    onClick={() => setPeriod('daily')}
                    className={`px-3 py-1.5 rounded-md transition ${period === 'daily' ? 'bg-neon-green text-black' : 'text-gray-400 hover:text-white'}`}
                >
                    Daily
                </button>
                <button 
                    onClick={() => setPeriod('all_time')}
                    className={`px-3 py-1.5 rounded-md transition ${period === 'all_time' ? 'bg-neon-green text-black' : 'text-gray-400 hover:text-white'}`}
                >
                    All Time
                </button>
            </div>
        </header>

        {loading ? (
             <div className="space-y-4 px-4 sm:px-0 pt-8">
                 <div className="flex justify-center items-end gap-4 mb-8">
                     <Skeleton variant="circular" className="w-16 h-16" />
                     <Skeleton variant="circular" className="w-24 h-24 -mb-4" />
                     <Skeleton variant="circular" className="w-16 h-16" />
                 </div>
                 {[1,2,3,4].map(i => <Skeleton key={i} variant="rectangular" className="h-16 w-full" />)}
             </div>
        ) : (
            <>
                <TopThree />

                <div className="bg-white/5 rounded-t-3xl border-t border-white/10 min-h-[50vh] pb-20">
                    <div className="p-4 space-y-2">
                        {leaders.slice(3).map((user, idx) => (
                            <motion.div 
                                key={user.id}
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: idx * 0.05 }}
                            >
                                <GlassCard 
                                    className={`flex items-center justify-between p-3 border-white/5 ${user.isCurrentUser ? 'bg-royal-900/20 border-royal-500/30' : 'bg-transparent'}`}
                                >
                                    <div className="flex items-center gap-4">
                                        <span className="text-sm font-bold text-gray-500 w-6 text-center">{user.rank}</span>
                                        <div className="w-10 h-10 rounded-full bg-white/10 overflow-hidden border border-white/10">
                                            <img src={user.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.name}`} alt="" className="w-full h-full object-cover" />
                                        </div>
                                        <div>
                                            <h4 className={`font-bold text-sm ${user.isCurrentUser ? 'text-neon-green' : 'text-white'}`}>
                                                {user.name} {user.isCurrentUser && '(You)'}
                                            </h4>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="font-mono font-bold text-white text-sm">${user.amount.toFixed(2)}</p>
                                    </div>
                                </GlassCard>
                            </motion.div>
                        ))}
                        
                        {leaders.length === 0 && (
                            <div className="text-center py-12 text-gray-500">
                                No records found for this period.
                            </div>
                        )}
                    </div>
                </div>
                
                {/* Sticky User Rank if not in top view (or just always show for easy access) */}
                {myRank && (
                    <div className="fixed bottom-[70px] sm:bottom-4 left-4 right-4 z-30">
                        <GlassCard className="bg-dark-900/90 border-neon-green/30 backdrop-blur-xl flex items-center justify-between p-3 shadow-[0_-5px_20px_rgba(0,0,0,0.5)]">
                            <div className="flex items-center gap-4">
                                <span className="text-sm font-bold text-neon-green w-6 text-center">{myRank.rank && myRank.rank > 50 ? '50+' : myRank.rank}</span>
                                <div className="w-10 h-10 rounded-full bg-royal-600 flex items-center justify-center text-white font-bold border border-neon-green/50">
                                    <User size={20} />
                                </div>
                                <div>
                                    <h4 className="font-bold text-sm text-white">My Ranking</h4>
                                    <p className="text-[10px] text-gray-400">Keep earning to climb up!</p>
                                </div>
                            </div>
                            <div className="text-right">
                                <p className="font-mono font-bold text-neon-green text-sm">${myRank.amount.toFixed(2)}</p>
                            </div>
                        </GlassCard>
                    </div>
                )}
            </>
        )}
    </div>
  );
};

export default Leaderboard;
