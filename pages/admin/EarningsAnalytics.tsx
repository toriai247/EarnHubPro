
import React, { useEffect, useState } from 'react';
import GlassCard from '../../components/GlassCard';
import { supabase } from '../../integrations/supabase/client';
import { DollarSign, Briefcase, Gamepad2, TrendingUp, Search, Calendar, FileText, ArrowRightLeft } from 'lucide-react';
import BalanceDisplay from '../../components/BalanceDisplay';

interface TaskAnalytics {
    id: string;
    title: string;
    advertiserInvested: number; // How much ad runner paid
    userEarned: number; // How much users got
    adminRevenue: number; // The difference
    completedCount: number;
    remainingCount: number;
    status: string;
}

interface GameAnalytics {
    name: string;
    totalBets: number;
    totalPayouts: number;
    adminProfit: number;
    roundsPlayed: number;
}

const EarningsAnalytics: React.FC = () => {
  const [loading, setLoading] = useState(true);
  
  // Totals
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [totalUserPayouts, setTotalUserPayouts] = useState(0);
  const [totalFeeRevenue, setTotalFeeRevenue] = useState(0);
  
  // Data Sections
  const [taskData, setTaskData] = useState<TaskAnalytics[]>([]);
  const [gameData, setGameData] = useState<GameAnalytics[]>([]);
  const [otherRevenue, setOtherRevenue] = useState<any[]>([]);

  // Filter
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
      fetchAllStats();
  }, []);

  const fetchAllStats = async () => {
      setLoading(true);
      try {
          // 1. TASK / ADVERTISING ANALYTICS
          const { data: tasks } = await supabase.from('marketplace_tasks').select('*');
          
          let t_adInvested = 0;
          let t_userEarned = 0;
          let t_adminRev = 0;

          const processedTasks: TaskAnalytics[] = (tasks || []).map((t: any) => {
              const completed = t.total_quantity - t.remaining_quantity;
              
              const totalInvested = t.total_quantity * t.price_per_action; // Advertiser cost
              const currentInvested = completed * t.price_per_action; // Amount actually "spent" so far
              
              const userEarnings = completed * t.worker_reward;
              const adminFee = currentInvested - userEarnings;

              t_adInvested += totalInvested;
              t_userEarned += userEarnings;
              t_adminRev += adminFee;

              return {
                  id: t.id,
                  title: t.title,
                  advertiserInvested: totalInvested,
                  userEarned: userEarnings,
                  adminRevenue: adminFee,
                  completedCount: completed,
                  remainingCount: t.remaining_quantity,
                  status: t.status
              };
          });

          // 2. GAME REVENUE
          const { data: games } = await supabase.from('game_history').select('*');
          const gameMap: Record<string, GameAnalytics> = {};
          
          let g_adminProfit = 0;

          (games || []).forEach((g: any) => {
              if (!gameMap[g.game_name]) {
                  gameMap[g.game_name] = { name: g.game_name, totalBets: 0, totalPayouts: 0, adminProfit: 0, roundsPlayed: 0 };
              }
              const entry = gameMap[g.game_name];
              entry.roundsPlayed += 1;
              entry.totalBets += g.bet;
              entry.totalPayouts += g.payout;
              
              // If user profit is positive, admin lost. If user profit negative, admin won.
              // Logic: Admin Profit = Bet - Payout
              const profit = g.bet - g.payout;
              entry.adminProfit += profit;
              g_adminProfit += profit;
          });

          // 3. OTHER REVENUE (FEES)
          const { data: txs } = await supabase.from('transactions').select('*').order('created_at', {ascending: false});
          
          // Separate 'fee' transactions
          const fees = (txs || []).filter((t: any) => t.type === 'fee' || t.type === 'penalty');
          const feeTotal = fees.reduce((acc, curr) => acc + curr.amount, 0);
          setTotalFeeRevenue(feeTotal);

          // Other Misc Logs (Exclude standard flows and fees)
          const others = (txs || []).filter((t: any) => 
              !['game_win', 'game_loss', 'earn', 'deposit', 'withdraw', 'transfer', 'fee', 'penalty'].includes(t.type)
          );

          setTaskData(processedTasks);
          setGameData(Object.values(gameMap));
          setOtherRevenue([...fees.slice(0, 10), ...others.slice(0, 10)]); // Show recent fees and others
          
          // Grand Totals
          setTotalRevenue(t_adminRev + g_adminProfit + feeTotal);
          setTotalUserPayouts(t_userEarned + (Object.values(gameMap).reduce((acc, g) => acc + g.totalPayouts, 0)));

      } catch (e) {
          console.error("Analytics Error", e);
      } finally {
          setLoading(false);
      }
  };

  if (loading) return <div className="p-10 text-gray-500">Loading Analytics...</div>;

  const filteredTasks = taskData.filter(t => t.title.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <div className="space-y-8 pb-20">
         <div className="flex justify-between items-center">
             <h2 className="text-2xl font-bold text-white">Revenue Analytics</h2>
             <button onClick={fetchAllStats} className="bg-white/10 px-4 py-2 rounded text-sm text-white hover:bg-white/20">Refresh Data</button>
         </div>

         {/* SUMMARY CARDS */}
         <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
             <div className="bg-green-900/20 border border-green-500/30 p-4 rounded-xl">
                 <div className="flex items-center gap-2 mb-2">
                     <DollarSign className="text-green-500" size={20}/>
                     <h3 className="text-sm font-bold text-green-400 uppercase">Total Net Revenue</h3>
                 </div>
                 <p className="text-2xl font-bold text-white"><BalanceDisplay amount={totalRevenue} /></p>
                 <p className="text-xs text-gray-500">Admin Profit (Tasks + Games + Fees)</p>
             </div>

             <div className="bg-blue-900/20 border border-blue-500/30 p-4 rounded-xl">
                 <div className="flex items-center gap-2 mb-2">
                     <Briefcase className="text-blue-500" size={20}/>
                     <h3 className="text-sm font-bold text-blue-400 uppercase">Task Revenue</h3>
                 </div>
                 <p className="text-2xl font-bold text-white">
                     <BalanceDisplay amount={taskData.reduce((acc, t) => acc + t.adminRevenue, 0)} />
                 </p>
                 <p className="text-xs text-gray-500">Commission from Ads</p>
             </div>

             <div className="bg-purple-900/20 border border-purple-500/30 p-4 rounded-xl">
                 <div className="flex items-center gap-2 mb-2">
                     <Gamepad2 className="text-purple-500" size={20}/>
                     <h3 className="text-sm font-bold text-purple-400 uppercase">Game Profit</h3>
                 </div>
                 <p className="text-2xl font-bold text-white">
                     <BalanceDisplay amount={gameData.reduce((acc, g) => acc + g.adminProfit, 0)} />
                 </p>
                 <p className="text-xs text-gray-500">Total Loss - Total Wins</p>
             </div>

             <div className="bg-orange-900/20 border border-orange-500/30 p-4 rounded-xl">
                 <div className="flex items-center gap-2 mb-2">
                     <ArrowRightLeft className="text-orange-500" size={20}/>
                     <h3 className="text-sm font-bold text-orange-400 uppercase">Fee Revenue</h3>
                 </div>
                 <p className="text-2xl font-bold text-white">
                     <BalanceDisplay amount={totalFeeRevenue} />
                 </p>
                 <p className="text-xs text-gray-500">Transfers & Penalties</p>
             </div>
         </div>

         {/* TASK REVENUE SECTION */}
         <div className="bg-black/30 border border-white/10 rounded-xl p-6">
             <div className="flex justify-between items-center mb-4">
                 <h3 className="text-lg font-bold text-white flex items-center gap-2">
                     <Briefcase size={18} className="text-blue-400"/> Task / Ad Revenue
                 </h3>
                 <div className="relative">
                     <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500"/>
                     <input 
                        type="text" 
                        placeholder="Search campaign..." 
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        className="bg-white/5 border border-white/10 rounded-lg pl-8 pr-3 py-1.5 text-xs text-white focus:border-neon-green"
                     />
                 </div>
             </div>
             
             <div className="overflow-x-auto">
                 <table className="w-full text-left text-sm text-gray-400">
                     <thead className="bg-white/5 text-xs font-bold text-white uppercase">
                         <tr>
                             <th className="p-3">Campaign Title</th>
                             <th className="p-3 text-right">Ad Budget (Invested)</th>
                             <th className="p-3 text-center">Progress</th>
                             <th className="p-3 text-right">User Income</th>
                             <th className="p-3 text-right text-green-400">Admin Profit</th>
                         </tr>
                     </thead>
                     <tbody className="divide-y divide-white/5">
                         {filteredTasks.map(t => (
                             <tr key={t.id} className="hover:bg-white/5 transition">
                                 <td className="p-3">
                                     <span className="text-white font-bold block">{t.title}</span>
                                     <span className="text-[10px] uppercase bg-white/10 px-1.5 py-0.5 rounded">{t.status}</span>
                                 </td>
                                 <td className="p-3 text-right font-mono">
                                     <BalanceDisplay amount={t.advertiserInvested} isNative={true} />
                                 </td>
                                 <td className="p-3 text-center">
                                     {t.completedCount} / {t.completedCount + t.remainingCount}
                                 </td>
                                 <td className="p-3 text-right font-mono text-white">
                                     <BalanceDisplay amount={t.userEarned} />
                                 </td>
                                 <td className="p-3 text-right font-mono text-green-400 font-bold">
                                     +<BalanceDisplay amount={t.adminRevenue} />
                                 </td>
                             </tr>
                         ))}
                     </tbody>
                 </table>
             </div>
         </div>

         {/* GAME REVENUE SECTION */}
         <div className="bg-black/30 border border-white/10 rounded-xl p-6">
             <h3 className="text-lg font-bold text-white flex items-center gap-2 mb-4">
                 <Gamepad2 size={18} className="text-purple-400"/> Game Logic Revenue
             </h3>
             <div className="overflow-x-auto">
                 <table className="w-full text-left text-sm text-gray-400">
                     <thead className="bg-white/5 text-xs font-bold text-white uppercase">
                         <tr>
                             <th className="p-3">Game Name</th>
                             <th className="p-3 text-center">Rounds</th>
                             <th className="p-3 text-right">Total Wagered</th>
                             <th className="p-3 text-right">User Won</th>
                             <th className="p-3 text-right">Net Profit</th>
                         </tr>
                     </thead>
                     <tbody className="divide-y divide-white/5">
                         {gameData.map(g => (
                             <tr key={g.name} className="hover:bg-white/5 transition">
                                 <td className="p-3 text-white font-bold">{g.name}</td>
                                 <td className="p-3 text-center">{g.roundsPlayed}</td>
                                 <td className="p-3 text-right font-mono"><BalanceDisplay amount={g.totalBets} /></td>
                                 <td className="p-3 text-right font-mono text-red-300">-<BalanceDisplay amount={g.totalPayouts} /></td>
                                 <td className={`p-3 text-right font-mono font-bold ${g.adminProfit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                     {g.adminProfit >= 0 ? '+' : ''}<BalanceDisplay amount={g.adminProfit} />
                                 </td>
                             </tr>
                         ))}
                     </tbody>
                 </table>
             </div>
         </div>

         {/* OTHER / LOGS SECTION */}
         <div className="bg-black/30 border border-white/10 rounded-xl p-6">
             <h3 className="text-lg font-bold text-white flex items-center gap-2 mb-4">
                 <FileText size={18} className="text-yellow-400"/> Fees & Other Logs
             </h3>
             <div className="overflow-x-auto">
                 <table className="w-full text-left text-xs text-gray-400 font-mono">
                     <thead className="bg-white/5 uppercase text-white">
                         <tr>
                             <th className="p-3">Time</th>
                             <th className="p-3">User ID</th>
                             <th className="p-3">Type</th>
                             <th className="p-3">Description</th>
                             <th className="p-3 text-right">Amount</th>
                         </tr>
                     </thead>
                     <tbody className="divide-y divide-white/5">
                         {otherRevenue.map((t, i) => (
                             <tr key={i} className="hover:bg-white/5 transition">
                                 <td className="p-3">{new Date(t.created_at).toLocaleString()}</td>
                                 <td className="p-3">{t.user_id}</td>
                                 <td className={`p-3 uppercase font-bold ${t.type === 'fee' ? 'text-orange-400' : 'text-white'}`}>{t.type}</td>
                                 <td className="p-3">{t.description}</td>
                                 <td className="p-3 text-right text-white font-bold">
                                     <BalanceDisplay amount={t.amount} />
                                 </td>
                             </tr>
                         ))}
                         {otherRevenue.length === 0 && <tr><td colSpan={5} className="p-4 text-center">No other revenue records found.</td></tr>}
                     </tbody>
                 </table>
             </div>
         </div>

    </div>
  );
};

export default EarningsAnalytics;
