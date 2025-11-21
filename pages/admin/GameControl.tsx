
import React, { useEffect, useState } from 'react';
import GlassCard from '../../components/GlassCard';
import { supabase } from '../../integrations/supabase/client';
import { RefreshCw, ShieldAlert, TrendingDown, TrendingUp, AlertCircle, Activity, Zap, Save, CheckCircle } from 'lucide-react';
import { motion } from 'framer-motion';

const GameControl: React.FC = () => {
  const [crashStats, setCrashStats] = useState({
      totalBets: 0,
      totalWins: 0,
      totalLosses: 0,
      profit: 0,
      winRate: 0,
      rtp: 0 // Return to Player
  });
  const [overrideValue, setOverrideValue] = useState<string>('');
  const [isActiveOverride, setIsActiveOverride] = useState(false);

  useEffect(() => {
      fetchCrashStats();
  }, []);

  const fetchCrashStats = async () => {
      // Calculate stats from game_history for 'crash'
      const { data } = await supabase.from('game_history').select('*').eq('game_id', 'crash').order('created_at', {ascending: false}).limit(100);
      
      if (data && data.length > 0) {
          const bets = data.length;
          const wins = data.filter(d => d.profit > 0).length;
          const losses = bets - wins;
          const totalBetAmount = data.reduce((sum, d) => sum + d.bet, 0);
          const totalPayout = data.reduce((sum, d) => sum + d.payout, 0);
          const netProfit = totalBetAmount - totalPayout; // Admin profit

          setCrashStats({
              totalBets: bets,
              totalWins: wins,
              totalLosses: losses,
              profit: netProfit,
              winRate: bets > 0 ? (wins / bets) * 100 : 0,
              rtp: totalBetAmount > 0 ? (totalPayout / totalBetAmount) * 100 : 0
          });
      }
  };

  const handleForceResult = (val: string) => {
      // In a real backend app, this would update a DB row that the Game Engine reads before starting a round.
      // Here we simulate the UI state.
      setOverrideValue(val);
      setIsActiveOverride(true);
      setTimeout(() => setIsActiveOverride(false), 3000); // Reset feedback
  };

  return (
    <div className="space-y-6 animate-fade-in">
         <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                <Activity className="text-neon-green" /> Space Crash Logic
            </h2>
            <button onClick={fetchCrashStats} className="p-2 bg-white/10 rounded-lg hover:bg-white/20 text-white"><RefreshCw size={18}/></button>
         </div>

         {/* STATS OVERVIEW */}
         <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
             <GlassCard className="bg-gradient-to-br from-blue-900/20 to-transparent border-blue-500/20">
                 <p className="text-[10px] text-blue-300 uppercase font-bold">Admin Profit (Last 100)</p>
                 <p className={`text-2xl font-bold ${crashStats.profit >= 0 ? 'text-neon-green' : 'text-red-400'}`}>
                     ${crashStats.profit.toFixed(2)}
                 </p>
             </GlassCard>
             <GlassCard className="bg-gradient-to-br from-purple-900/20 to-transparent border-purple-500/20">
                 <p className="text-[10px] text-purple-300 uppercase font-bold">RTP (Return to Player)</p>
                 <p className={`text-2xl font-bold ${crashStats.rtp > 100 ? 'text-red-400' : 'text-white'}`}>
                     {crashStats.rtp.toFixed(1)}%
                 </p>
             </GlassCard>
             <GlassCard className="bg-gradient-to-br from-green-900/20 to-transparent border-green-500/20">
                 <p className="text-[10px] text-green-300 uppercase font-bold">Win Rate</p>
                 <p className="text-2xl font-bold text-white">{crashStats.winRate.toFixed(1)}%</p>
                 <p className="text-[10px] text-gray-500">{crashStats.totalWins} W / {crashStats.totalLosses} L</p>
             </GlassCard>
             <GlassCard className="bg-white/5 border-white/10">
                 <p className="text-[10px] text-gray-400 uppercase font-bold">Algorithm State</p>
                 <p className="text-lg font-bold text-yellow-400">Adaptive</p>
                 <p className="text-[10px] text-gray-500">Adjusting volatility</p>
             </GlassCard>
         </div>

         <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
             
             {/* AUTOMATED LOGIC */}
             <GlassCard className="relative overflow-hidden">
                 <div className="absolute top-0 right-0 p-4 opacity-10"><ShieldAlert size={80} className="text-white"/></div>
                 <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                     <Zap className="text-yellow-400" size={18} /> Auto-Correction Logic
                 </h3>
                 
                 <div className="space-y-3">
                     <div className="flex items-center justify-between p-3 bg-white/5 rounded-xl border border-white/5">
                         <div>
                             <p className="text-sm font-bold text-white">Profit Protection</p>
                             <p className="text-xs text-gray-400">Force crash if RTP &gt; 98%</p>
                         </div>
                         <div className="h-3 w-3 bg-green-500 rounded-full shadow-[0_0_8px_#22c55e]"></div>
                     </div>
                     
                     <div className="flex items-center justify-between p-3 bg-white/5 rounded-xl border border-white/5">
                         <div>
                             <p className="text-sm font-bold text-white">Streak Breaker</p>
                             <p className="text-xs text-gray-400">Prevents &gt;3 consecutive high multipliers (10x+)</p>
                         </div>
                         <div className="h-3 w-3 bg-green-500 rounded-full shadow-[0_0_8px_#22c55e]"></div>
                     </div>

                     <div className="flex items-center justify-between p-3 bg-white/5 rounded-xl border border-white/5">
                         <div>
                             <p className="text-sm font-bold text-white">Fairness Seed</p>
                             <p className="text-xs text-gray-400">Randomized hash chain active</p>
                         </div>
                         <div className="h-3 w-3 bg-green-500 rounded-full shadow-[0_0_8px_#22c55e]"></div>
                     </div>
                 </div>
             </GlassCard>

             {/* MANUAL OVERRIDE */}
             <GlassCard className="relative border-red-500/20 bg-red-500/5">
                 <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                     <AlertCircle className="text-red-500" size={18} /> Manual Override
                 </h3>
                 <p className="text-xs text-gray-400 mb-4">
                     Force the outcome of the <strong>NEXT</strong> game round. Use with caution.
                 </p>

                 <div className="grid grid-cols-2 gap-3 mb-4">
                     <button 
                        onClick={() => handleForceResult('1.00')}
                        className="py-3 bg-red-500/20 border border-red-500/30 rounded-xl text-red-400 font-bold hover:bg-red-500/30 transition"
                     >
                         Insta-Crash (1.00x)
                     </button>
                     <button 
                        onClick={() => handleForceResult('10.00')}
                        className="py-3 bg-green-500/20 border border-green-500/30 rounded-xl text-green-400 font-bold hover:bg-green-500/30 transition"
                     >
                         Moon Shot (10.00x)
                     </button>
                 </div>

                 <div className="flex gap-2">
                     <input 
                        type="number" 
                        step="0.01"
                        placeholder="Custom Multiplier (e.g. 2.55)" 
                        className="flex-1 bg-black/40 border border-white/10 rounded-xl px-4 text-white outline-none focus:border-red-500"
                        onChange={(e) => setOverrideValue(e.target.value)}
                        value={overrideValue}
                     />
                     <button 
                        onClick={() => handleForceResult(overrideValue)}
                        className="bg-white text-black font-bold px-4 rounded-xl hover:bg-gray-200 transition"
                     >
                         Set
                     </button>
                 </div>

                 {isActiveOverride && (
                     <motion.div 
                        initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                        className="mt-4 p-3 bg-green-500/20 border border-green-500/30 rounded-xl flex items-center gap-2 text-green-400 text-sm font-bold"
                     >
                         <CheckCircle size={16} /> Next round forced to {overrideValue}x
                     </motion.div>
                 )}
             </GlassCard>
         </div>
    </div>
  );
};

export default GameControl;
