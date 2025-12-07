
import React, { useState, useEffect } from 'react';
import GlassCard from '../components/GlassCard';
import { Dices, ArrowLeft, ArrowDown, ArrowUp } from 'lucide-react';
import { Link } from 'react-router-dom';
import { supabase } from '../integrations/supabase/client';
import { WalletData } from '../types';
import { processGameResult, updateWallet } from '../lib/actions';
import { useUI } from '../context/UIContext';
import BalanceDisplay from '../components/BalanceDisplay';

const Dice: React.FC = () => {
  const { toast } = useUI();
  const [wallet, setWallet] = useState<WalletData | null>(null);
  const [userId, setUserId] = useState('');
  const [target, setTarget] = useState(50);
  const [rollDirection, setRollDirection] = useState<'under' | 'over'>('under');
  const [betAmount, setBetAmount] = useState('10');
  const [lastResult, setLastResult] = useState<{ val: number, win: boolean } | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }: { data: { session: any } }) => {
        if (session) {
            setUserId(session.user.id);
            supabase.from('wallets').select('*').eq('user_id', session.user.id).single().then(({data}: {data: any}) => setWallet(data as any));
        }
    });
  }, []);

  const winChance = rollDirection === 'under' ? target : (100 - target);
  const multiplier = winChance > 0 ? (98 / winChance) : 0;
  const potentialWin = parseFloat(betAmount || '0') * multiplier;

  const handleRoll = async () => {
      if (!wallet) return;
      const bet = parseFloat(betAmount);
      if (isNaN(bet) || bet <= 0) { toast.error("Invalid bet"); return; }
      if (bet > wallet.game_balance) { toast.error("Insufficient game balance"); return; }

      setWallet(prev => prev ? {...prev, game_balance: prev.game_balance - bet} : null);

      const result = parseFloat((Math.random() * 100).toFixed(2));
      const isWin = rollDirection === 'under' ? result < target : result > target;
      const payout = isWin ? (bet * multiplier) : 0;

      setLastResult({ val: result, win: isWin });

      if (userId) {
          await updateWallet(userId, bet, 'decrement', 'game_balance');
          if (isWin) await updateWallet(userId, payout, 'increment', 'game_balance');
          
          const { data } = await supabase.from('wallets').select('*').eq('user_id', userId).single();
          if (data) setWallet(data as WalletData);

          await processGameResult(userId, 'dice', 'Dice', bet, payout, `Rolled ${result}`);
      }
  };

  return (
    <div className="pb-24 sm:pl-20 sm:pt-6 space-y-6 px-4 sm:px-0">
       <header className="flex items-center gap-3 pt-4">
           <Link to="/games" className="p-2 bg-[#222] rounded-lg text-white hover:bg-[#333]"><ArrowLeft size={20}/></Link>
           <h1 className="text-xl font-bold text-white flex items-center gap-2">Cyber Dice</h1>
       </header>

       <GlassCard className="text-center py-10 bg-[#111]">
           <div className="text-6xl font-black font-mono text-white mb-4">
               {lastResult ? lastResult.val : '0.00'}
           </div>
           {lastResult && (
               <div className={`text-sm font-bold uppercase px-3 py-1 rounded inline-block ${lastResult.win ? 'bg-green-900 text-green-400' : 'bg-red-900 text-red-400'}`}>
                   {lastResult.win ? 'WIN' : 'LOSS'}
               </div>
           )}
       </GlassCard>

       <GlassCard>
           <div className="flex gap-4 mb-6 bg-[#111] p-1 rounded-lg">
               <button onClick={() => setRollDirection('under')} className={`flex-1 py-2 text-xs font-bold uppercase rounded ${rollDirection === 'under' ? 'bg-[#333] text-white' : 'text-gray-500'}`}>Roll Under</button>
               <button onClick={() => setRollDirection('over')} className={`flex-1 py-2 text-xs font-bold uppercase rounded ${rollDirection === 'over' ? 'bg-[#333] text-white' : 'text-gray-500'}`}>Roll Over</button>
           </div>

           <div className="space-y-6">
               <div>
                   <div className="flex justify-between text-xs text-gray-500 mb-2 font-bold uppercase">
                       <span>Win Chance: {winChance.toFixed(0)}%</span>
                       <span>Target: {target}</span>
                   </div>
                   <input 
                        type="range" min="4" max="96" value={target} 
                        onChange={e => setTarget(parseInt(e.target.value))}
                        className="w-full h-2 bg-[#333] rounded-lg appearance-none cursor-pointer accent-brand"
                   />
               </div>

               <div className="flex gap-4 items-end">
                   <div className="flex-1">
                       <label className="text-xs text-gray-500 font-bold uppercase mb-1 block">Bet</label>
                       <input type="number" value={betAmount} onChange={e => setBetAmount(e.target.value)} className="w-full bg-[#111] border border-[#333] rounded p-3 text-white font-bold" />
                   </div>
                   <div className="flex-1 text-right">
                       <p className="text-xs text-gray-500 font-bold uppercase mb-1">Payout</p>
                       <p className="text-xl font-bold text-green-400"><BalanceDisplay amount={potentialWin} /></p>
                   </div>
               </div>

               <button 
                  onClick={handleRoll}
                  className="w-full py-4 bg-brand text-white font-bold rounded hover:bg-brand-hover disabled:opacity-50"
               >
                   ROLL DICE
               </button>
           </div>
       </GlassCard>
    </div>
  );
};

export default Dice;
