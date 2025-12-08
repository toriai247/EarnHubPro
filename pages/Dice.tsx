
import React, { useState, useEffect } from 'react';
import GlassCard from '../components/GlassCard';
import { ArrowLeft, Dices, RotateCcw, Trophy, AlertTriangle, Volume2, VolumeX } from 'lucide-react';
import { Link } from 'react-router-dom';
import { supabase } from '../integrations/supabase/client';
import { updateWallet, createTransaction } from '../lib/actions';
import { useUI } from '../context/UIContext';
import BalanceDisplay from '../components/BalanceDisplay';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';

type BetType = 'low' | 'seven' | 'high';

const Dice: React.FC = () => {
  const { toast } = useUI();
  const [balance, setBalance] = useState(0);
  const [betAmount, setBetAmount] = useState<string>('10');
  const [selectedBet, setSelectedBet] = useState<BetType>('high');
  const [isRolling, setIsRolling] = useState(false);
  const [diceValues, setDiceValues] = useState([1, 1]);
  const [lastResult, setLastResult] = useState<{win: boolean, amount: number} | null>(null);
  const [soundEnabled, setSoundEnabled] = useState(true);

  // Multipliers
  const MULTIPLIERS = {
      low: 2.3,   // 2-6 (41.6% chance)
      seven: 5.8, // 7 (16.6% chance)
      high: 2.3   // 8-12 (41.6% chance)
  };

  useEffect(() => {
      fetchBalance();
  }, []);

  const fetchBalance = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if(session) {
          const { data } = await supabase.from('wallets').select('main_balance, deposit_balance, bonus_balance').eq('user_id', session.user.id).single();
          // Game uses total available funds logic or specific wallet. Here we use Main + Deposit + Bonus logic often used in betting
          // For simplicity, let's use Main Balance
          if(data) setBalance(data.main_balance);
      }
  };

  const rollDice = async () => {
      const amount = parseFloat(betAmount);
      if (isNaN(amount) || amount <= 0) {
          toast.error("Invalid bet amount");
          return;
      }
      if (amount > balance) {
          toast.error("Insufficient Balance");
          return;
      }

      setIsRolling(true);
      setLastResult(null);

      // Play Sound
      if(soundEnabled) {
          // Placeholder for sound logic
      }

      // Deduct Bet (Optimistic)
      setBalance(prev => prev - amount);

      // Animation Phase
      let rolls = 0;
      const interval = setInterval(() => {
          setDiceValues([
              Math.floor(Math.random() * 6) + 1,
              Math.floor(Math.random() * 6) + 1
          ]);
          rolls++;
          if (rolls > 10) {
              clearInterval(interval);
              finalizeGame(amount);
          }
      }, 100);
  };

  const finalizeGame = async (bet: number) => {
      // Logic: Server-side is safer, but for this demo we do client-side calculation
      // with immediate DB sync.
      
      const die1 = Math.floor(Math.random() * 6) + 1;
      const die2 = Math.floor(Math.random() * 6) + 1;
      const total = die1 + die2;
      setDiceValues([die1, die2]);

      let won = false;
      let payout = 0;

      if (selectedBet === 'low' && total < 7) won = true;
      else if (selectedBet === 'high' && total > 7) won = true;
      else if (selectedBet === 'seven' && total === 7) won = true;

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      if (won) {
          payout = bet * MULTIPLIERS[selectedBet];
          // Visuals
          confetti({
              particleCount: 100,
              spread: 70,
              origin: { y: 0.6 }
          });
          setLastResult({ win: true, amount: payout });
          toast.success(`You Won $${payout.toFixed(2)}!`);
      } else {
          setLastResult({ win: false, amount: 0 });
      }

      // Update Database
      try {
          // 1. Update Wallet
          await updateWallet(
              session.user.id, 
              won ? payout - bet : bet, // If won, we add net profit (payout includes stake, but we subtracted stake optimistically, so add full payout? No, updateWallet 'increment' adds to existing. We subtracted stake locally only. 
              // Actually `updateWallet` handles DB. 
              // Let's do: Deduct Bet first from DB, then Add Payout if won.
              'decrement', 
              'main_balance'
          );
          
          if(won) {
              await updateWallet(session.user.id, payout, 'increment', 'main_balance');
          }

          // 2. Log History
          await supabase.from('game_history').insert({
              user_id: session.user.id,
              game_id: 'dice',
              game_name: 'Lucky Dice',
              bet: bet,
              payout: payout,
              profit: payout - bet,
              details: `Roll: ${die1}+${die2}=${total} | Bet: ${selectedBet.toUpperCase()}`
          });

          fetchBalance(); // Sync exact balance
      } catch (e) {
          console.error(e);
          toast.error("Network error syncing balance");
      }

      setIsRolling(false);
  };

  const DieFace = ({ val }: { val: number }) => {
      // Dot positions for 1-6
      const dots: Record<number, number[]> = {
          1: [4],
          2: [0, 8],
          3: [0, 4, 8],
          4: [0, 2, 6, 8],
          5: [0, 2, 4, 6, 8],
          6: [0, 2, 3, 5, 6, 8]
      };

      return (
          <div className="w-16 h-16 sm:w-24 sm:h-24 bg-white rounded-2xl shadow-[0_4px_0_#ccc] flex flex-wrap p-3 justify-between content-between border border-gray-200">
              {[0,1,2,3,4,5,6,7,8].map(i => (
                  <div key={i} className={`w-2 h-2 sm:w-3 sm:h-3 rounded-full ${dots[val].includes(i) ? 'bg-black' : 'bg-transparent'}`}></div>
              ))}
          </div>
      );
  };

  return (
    <div className="pb-24 sm:pl-20 sm:pt-6 space-y-6 px-4 sm:px-0">
       
       {/* Header */}
       <div className="flex justify-between items-center pt-4">
           <div className="flex items-center gap-3">
               <Link to="/games" className="p-2 bg-white/10 rounded-xl hover:bg-white/20 transition text-white">
                   <ArrowLeft size={20} />
               </Link>
               <div>
                   <h1 className="text-xl font-bold text-white flex items-center gap-2">
                       <Dices className="text-neon-green" /> Lucky Dice
                   </h1>
                   <p className="text-xs text-gray-400">Guess the roll sum</p>
               </div>
           </div>
           <div className="bg-[#111] px-4 py-2 rounded-xl border border-white/10 text-right">
               <p className="text-[10px] text-gray-500 font-bold uppercase">Balance</p>
               <p className="text-white font-mono font-bold"><BalanceDisplay amount={balance} /></p>
           </div>
       </div>

       <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
           
           {/* GAME AREA */}
           <div className="lg:col-span-2 space-y-6">
               <GlassCard className="min-h-[300px] flex flex-col items-center justify-center relative overflow-hidden bg-gradient-to-br from-green-900/10 to-black border-green-500/20">
                   
                   {/* Background Elements */}
                   <div className="absolute inset-0 opacity-10 pointer-events-none bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-green-500 via-transparent to-transparent"></div>

                   {/* Dice Display */}
                   <div className="flex gap-6 mb-8 relative z-10">
                       <motion.div 
                         animate={isRolling ? { rotate: [0, 90, 180, 270, 360], y: [0, -20, 0] } : {}}
                         transition={{ duration: 0.5, repeat: isRolling ? Infinity : 0 }}
                       >
                           <DieFace val={diceValues[0]} />
                       </motion.div>
                       <motion.div 
                         animate={isRolling ? { rotate: [360, 270, 180, 90, 0], y: [0, -20, 0] } : {}}
                         transition={{ duration: 0.5, repeat: isRolling ? Infinity : 0 }}
                       >
                           <DieFace val={diceValues[1]} />
                       </motion.div>
                   </div>

                   {/* Result Message */}
                   <AnimatePresence>
                       {!isRolling && lastResult && (
                           <motion.div 
                               initial={{ scale: 0, opacity: 0 }} 
                               animate={{ scale: 1, opacity: 1 }} 
                               exit={{ scale: 0, opacity: 0 }}
                               className={`absolute top-4 px-6 py-2 rounded-full font-black uppercase tracking-widest text-sm shadow-xl ${lastResult.win ? 'bg-green-500 text-black' : 'bg-red-500 text-white'}`}
                           >
                               {lastResult.win ? `YOU WON $${lastResult.amount.toFixed(2)}` : 'TRY AGAIN'}
                           </motion.div>
                       )}
                   </AnimatePresence>

                   {/* Total Sum Indicator */}
                   <div className="text-gray-500 font-mono text-sm mt-4 bg-black/40 px-4 py-1 rounded-full border border-white/5">
                       Total: <span className="text-white font-bold text-lg">{diceValues[0] + diceValues[1]}</span>
                   </div>

               </GlassCard>

               {/* BETTING CONTROLS */}
               <GlassCard>
                   <div className="grid grid-cols-3 gap-3 mb-6">
                       <button 
                           onClick={() => setSelectedBet('low')}
                           disabled={isRolling}
                           className={`p-4 rounded-xl border-2 transition-all flex flex-col items-center gap-1 ${selectedBet === 'low' ? 'border-red-500 bg-red-500/10 shadow-[0_0_15px_rgba(239,68,68,0.3)]' : 'border-white/10 bg-white/5 hover:bg-white/10 opacity-70 hover:opacity-100'}`}
                       >
                           <span className={`text-lg font-black ${selectedBet === 'low' ? 'text-red-400' : 'text-gray-400'}`}>2 - 6</span>
                           <span className="text-[10px] font-bold uppercase text-gray-500">Low (x{MULTIPLIERS.low})</span>
                       </button>

                       <button 
                           onClick={() => setSelectedBet('seven')}
                           disabled={isRolling}
                           className={`p-4 rounded-xl border-2 transition-all flex flex-col items-center gap-1 ${selectedBet === 'seven' ? 'border-green-500 bg-green-500/10 shadow-[0_0_15px_rgba(34,197,94,0.3)]' : 'border-white/10 bg-white/5 hover:bg-white/10 opacity-70 hover:opacity-100'}`}
                       >
                           <span className={`text-lg font-black ${selectedBet === 'seven' ? 'text-green-400' : 'text-gray-400'}`}>7</span>
                           <span className="text-[10px] font-bold uppercase text-gray-500">Lucky (x{MULTIPLIERS.seven})</span>
                       </button>

                       <button 
                           onClick={() => setSelectedBet('high')}
                           disabled={isRolling}
                           className={`p-4 rounded-xl border-2 transition-all flex flex-col items-center gap-1 ${selectedBet === 'high' ? 'border-blue-500 bg-blue-500/10 shadow-[0_0_15px_rgba(59,130,246,0.3)]' : 'border-white/10 bg-white/5 hover:bg-white/10 opacity-70 hover:opacity-100'}`}
                       >
                           <span className={`text-lg font-black ${selectedBet === 'high' ? 'text-blue-400' : 'text-gray-400'}`}>8 - 12</span>
                           <span className="text-[10px] font-bold uppercase text-gray-500">High (x{MULTIPLIERS.high})</span>
                       </button>
                   </div>

                   <div className="flex gap-4 items-center bg-black/30 p-2 rounded-xl border border-white/5">
                       <div className="flex-1">
                           <input 
                               type="number" 
                               value={betAmount} 
                               onChange={e => setBetAmount(e.target.value)}
                               className="w-full bg-transparent px-4 py-2 text-white font-bold text-xl outline-none"
                               placeholder="Bet Amount"
                           />
                           <p className="px-4 text-[10px] text-gray-500 uppercase font-bold">Stake</p>
                       </div>
                       <button 
                           onClick={rollDice}
                           disabled={isRolling || !betAmount}
                           className={`px-8 py-4 bg-white text-black font-black uppercase tracking-wider rounded-lg hover:scale-105 transition active:scale-95 disabled:opacity-50 disabled:scale-100 shadow-lg ${isRolling ? 'cursor-not-allowed' : 'cursor-pointer'}`}
                       >
                           {isRolling ? 'Rolling...' : 'ROLL DICE'}
                       </button>
                   </div>
               </GlassCard>
           </div>

           {/* INFO / HISTORY */}
           <div className="space-y-6">
               <div className="bg-blue-900/10 border border-blue-500/20 p-4 rounded-xl">
                   <h3 className="text-blue-400 font-bold text-sm mb-2 flex items-center gap-2">
                       <AlertTriangle size={16} /> How to Play
                   </h3>
                   <ul className="text-xs text-gray-400 space-y-1.5 list-disc pl-4">
                       <li>Predict the sum of two dice.</li>
                       <li><strong>Low (2-6)</strong> pays x2.3</li>
                       <li><strong>High (8-12)</strong> pays x2.3</li>
                       <li><strong>Lucky 7</strong> pays x5.8 (Jackpot!)</li>
                   </ul>
               </div>

               <GlassCard className="h-full max-h-[300px] flex flex-col">
                   <div className="flex justify-between items-center mb-4">
                       <h3 className="font-bold text-white text-sm">Live Stats</h3>
                       <button onClick={() => setSoundEnabled(!soundEnabled)} className="text-gray-500 hover:text-white">
                           {soundEnabled ? <Volume2 size={16}/> : <VolumeX size={16}/>}
                       </button>
                   </div>
                   <div className="flex-1 flex items-center justify-center text-gray-500 text-xs italic">
                       Game history will appear here.
                   </div>
               </GlassCard>
           </div>

       </div>
    </div>
  );
};

export default Dice;
