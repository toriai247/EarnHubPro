
import React, { useEffect, useState } from 'react';
import GlassCard from '../../components/GlassCard';
import { supabase } from '../../integrations/supabase/client';
import { RefreshCw, ShieldAlert, TrendingDown, TrendingUp, AlertCircle } from 'lucide-react';

const GameControl: React.FC = () => {
  const [crashStats, setCrashStats] = useState({
      totalBets: 0,
      totalWins: 0,
      totalLosses: 0,
      profit: 0,
      winRate: 0
  });

  useEffect(() => {
      fetchCrashStats();
  }, []);

  const fetchCrashStats = async () => {
      // Calculate stats from game_history for 'crash'
      const { data } = await supabase.from('game_history').select('*').eq('game_id', 'crash');
      
      if (data) {
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
              winRate: bets > 0 ? (wins / bets) * 100 : 0
          });
      }
  };

  return (
    <div className="space-y-6 animate-fade-in">
         <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold text-white">Game Regulation & Logic</h2>
            <button onClick={fetchCrashStats} className="p-2 bg-white/10 rounded-lg hover:bg-white/20 text-white"><RefreshCw size={18}/></button>
         </div>

         {/* CRASH GAME SECTION */}
         <div className="space-y-4">
             <h3 className="text-xl font-bold text-neon-green flex items-center gap-2">
                 🚀 Space Crash Manager
             </h3>
             
             {/* Stats Grid */}
             <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                 <GlassCard className="bg-red-500/10 border-red-500/20">
                     <p className="text-[10px] text-gray-400 uppercase font-bold">Total Losers</p>
                     <p className="text-2xl font-bold text-red-400">{crashStats.totalLosses}</p>
                     <p className="text-xs text-gray-500">Target: High</p>
                 </GlassCard>
                 <GlassCard className="bg-green-500/10 border-green-500/20">
                     <p className="text-[10px] text-gray-400 uppercase font-bold">Total Winners</p>
                     <p className="text-2xl font-bold text-green-400">{crashStats.totalWins}</p>
                     <p className="text-xs text-gray-500">Ratio: {crashStats.winRate.toFixed(1)}%</p>
                 </GlassCard>
                 <GlassCard className="bg-blue-500/10 border-blue-500/20">
                     <p className="text-[10px] text-gray-400 uppercase font-bold">Admin Profit</p>
                     <p className="text-2xl font-bold text-blue-400">${crashStats.profit.toFixed(2)}</p>
                 </GlassCard>
                 <GlassCard className="bg-white/5">
                     <p className="text-[10px] text-gray-400 uppercase font-bold">Algorithm Mode</p>
                     <p className="text-lg font-bold text-white">Rigged (10:50)</p>
                     <p className="text-xs text-yellow-500">Auto-Correct Active</p>
                 </GlassCard>
             </div>

             {/* Controls */}
             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                 <GlassCard>
                     <h4 className="font-bold text-white mb-3 flex items-center gap-2">
                         <ShieldAlert size={16} className="text-red-500"/> Crash Probability Logic
                     </h4>
                     <p className="text-xs text-gray-400 mb-3">
                         The system automatically scans the <code>game_history</code> database table before every round.
                     </p>
                     <div className="space-y-2 text-xs">
                         <div className="flex justify-between items-center p-2 bg-black/20 rounded">
                             <span>1. If Win Rate &gt; 18%</span>
                             <span className="text-red-400 font-bold">FORCE CRASH (1.0x - 1.15x)</span>
                         </div>
                         <div className="flex justify-between items-center p-2 bg-black/20 rounded">
                             <span>2. If Winners &gt; 10 (Last 60)</span>
                             <span className="text-red-400 font-bold">FORCE CRASH</span>
                         </div>
                         <div className="flex justify-between items-center p-2 bg-black/20 rounded">
                             <span>3. Else (Standard)</span>
                             <span className="text-green-400 font-bold">Weighted Random</span>
                         </div>
                     </div>
                 </GlassCard>
                 
                 <GlassCard>
                     <h4 className="font-bold text-white mb-3 flex items-center gap-2">
                        <AlertCircle size={16} className="text-yellow-400"/> Admin Override
                     </h4>
                     <p className="text-xs text-gray-400 mb-4">Force the next game result for testing or profit control.</p>
                     <div className="flex gap-2">
                         <button className="flex-1 py-3 bg-red-500/20 text-red-400 border border-red-500/30 rounded-lg text-sm font-bold hover:bg-red-500/30">Force Crash @ 1.00x</button>
                         <button className="flex-1 py-3 bg-green-500/20 text-green-400 border border-green-500/30 rounded-lg text-sm font-bold hover:bg-green-500/30">Force Moon (10x)</button>
                     </div>
                 </GlassCard>
             </div>
         </div>

         <div className="h-px bg-white/10 my-6"></div>

         {/* Existing Spin Logic */}
         <div className="opacity-75">
             <h3 className="text-lg font-bold text-white mb-4">Lucky Spin Config</h3>
             <GlassCard>
                 <h4 className="font-bold text-white mb-2">Spin Probability</h4>
                 <div className="space-y-2 text-xs text-gray-400">
                     <div className="flex justify-between"><span>Jackpot ($20)</span> <input className="w-16 bg-black/30 border border-white/10 rounded px-1 text-right" defaultValue="1%" disabled /></div>
                     <div className="flex justify-between"><span>Medium ($5)</span> <input className="w-16 bg-black/30 border border-white/10 rounded px-1 text-right" defaultValue="10%" disabled /></div>
                 </div>
             </GlassCard>
         </div>
    </div>
  );
};

export default GameControl;
