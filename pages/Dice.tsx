
import React, { useState, useEffect } from 'react';
import GlassCard from '../components/GlassCard';
import { ArrowLeft, Dices, Volume2, VolumeX, History, TrendingUp, Zap, Trophy } from 'lucide-react';
import { Link } from 'react-router-dom';
import { supabase } from '../integrations/supabase/client';
import { updateWallet, createTransaction } from '../lib/actions';
import { useUI } from '../context/UIContext';
import BalanceDisplay from '../components/BalanceDisplay';
import { useCurrency } from '../context/CurrencyContext';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';

type BetType = 'low' | 'seven' | 'high';

interface RollHistory {
    roll: number;
    win: boolean;
    timestamp: number;
}

const Dice: React.FC = () => {
  const { toast } = useUI();
  const { format, symbol } = useCurrency(); // Use Currency Context
  const [balance, setBalance] = useState(0); // Main Balance
  const [gameBalance, setGameBalance] = useState(0); // Game Balance
  const [betAmount, setBetAmount] = useState<string>('10');
  const [selectedBet, setSelectedBet] = useState<BetType | null>(null);
  const [isRolling, setIsRolling] = useState(false);
  const [diceValues, setDiceValues] = useState([1, 1]); // Initial state
  const [lastResult, setLastResult] = useState<{win: boolean, amount: number, roll: number} | null>(null);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [rollHistory, setRollHistory] = useState<RollHistory[]>([]);

  // Multipliers
  const MULTIPLIERS = {
      low: 2.3,   // 2-6
      seven: 5.8, // 7
      high: 2.3   // 8-12
  };

  useEffect(() => {
      fetchBalance();
  }, []);

  const fetchBalance = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if(session) {
          const { data } = await supabase.from('wallets').select('main_balance, game_balance').eq('user_id', session.user.id).single();
          if(data) {
              setBalance(data.main_balance);
              setGameBalance(data.game_balance);
          }
      }
  };

  const handleQuickBet = (multiplier: number) => {
      const current = parseFloat(betAmount) || 0;
      if (multiplier === 0) setBetAmount(balance.toFixed(2)); // Max
      else if (multiplier === 0.5) setBetAmount((current * 0.5).toFixed(2));
      else setBetAmount((current * multiplier).toFixed(2));
  };

  const rollDice = async () => {
      if (!selectedBet) {
          toast.error("Please select a betting option (Low, 7, or High).");
          return;
      }
      
      const amount = parseFloat(betAmount);
      if (isNaN(amount) || amount <= 0) {
          toast.error("Invalid bet amount");
          return;
      }

      // Wallet Selection Logic: Main -> Game
      let usedWallet: 'main' | 'game' = 'main';
      
      if (balance >= amount) {
          usedWallet = 'main';
      } else if (gameBalance >= amount) {
          usedWallet = 'game';
      } else {
          toast.error("Insufficient Funds in Main or Game Wallet");
          return;
      }

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      setIsRolling(true);
      setLastResult(null);

      // --- IMMEDIATE TRANSACTION LOGGING (STRICT MODE) ---
      // Log the bet immediately to ensure audit integrity
      try {
          await createTransaction(
              session.user.id,
              'game_bet', 
              amount, 
              `Dice Bet: ${selectedBet.toUpperCase()} (${amount})`
          );
      } catch (logError) {
          console.error("Failed to log bet transaction", logError);
          // Continue anyway, but ideally this should block
      }

      // Optimistic Update (Client Side)
      if (usedWallet === 'main') {
          setBalance(prev => Math.max(0, prev - amount));
      } else {
          setGameBalance(prev => Math.max(0, prev - amount));
      }

      // 1. Determine Result Client-Side
      const die1 = Math.floor(Math.random() * 6) + 1;
      const die2 = Math.floor(Math.random() * 6) + 1;
      const total = die1 + die2;

      // 2. Wait for animation
      setTimeout(async () => {
          setDiceValues([die1, die2]);
          setIsRolling(false); // Stop animation first
          
          // Delay to ensure CSS transition (1s) finishes before showing text
          setTimeout(async () => {
              await finalizeGame(amount, die1, die2, total, usedWallet);
          }, 1100); 
          
      }, 2000);
  };

  const finalizeGame = async (bet: number, d1: number, d2: number, total: number, source: 'main' | 'game') => {
      if (!selectedBet) return;

      let won = false;
      let payout = 0;

      if (selectedBet === 'low' && total < 7) won = true;
      else if (selectedBet === 'high' && total > 7) won = true;
      else if (selectedBet === 'seven' && total === 7) won = true;

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      // Fix: Precise Calculation
      if (won) {
          // Ensure precise multiplication for currency
          payout = parseFloat((bet * MULTIPLIERS[selectedBet]).toFixed(2));
          
          confetti({
              particleCount: 150,
              spread: 80,
              origin: { y: 0.6 },
              colors: ['#D4AF37', '#8D4DFF', '#FFFFFF']
          });
          toast.success(`You Won ${format(payout)}!`);
      }

      setLastResult({ win: won, amount: payout, roll: total });
      setRollHistory(prev => [{ roll: total, win: won, timestamp: Date.now() }, ...prev.slice(0, 9)]);

      try {
          // 1. Deduct Bet from Source Wallet (DB Update)
          await updateWallet(session.user.id, bet, 'decrement', source === 'main' ? 'main_balance' : 'game_balance');
          
          // 2. Add Winnings to Game Wallet (Always)
          if(won) {
              await updateWallet(session.user.id, payout, 'increment', 'game_balance');
              
              // Log Win Transaction (Critical for Audit)
              await createTransaction(
                  session.user.id,
                  'game_win',
                  payout,
                  `Dice Win: Rolled ${total}`
              );

              // Optimistic Game Balance update
              setGameBalance(prev => prev + payout);
          }

          // 3. Log History Table (For Game Stats)
          await supabase.from('game_history').insert({
              user_id: session.user.id,
              game_id: 'dice',
              game_name: 'Lucky Dice',
              bet: bet,
              payout: payout,
              profit: payout - bet,
              details: `Roll: ${d1}+${d2}=${total} | Bet: ${selectedBet.toUpperCase()}`
          });

          // Sync real balances
          fetchBalance();
      } catch (e) {
          console.error(e);
      }
  };

  return (
    <div className="pb-24 pt-6 px-4 max-w-6xl mx-auto font-sans relative min-h-screen">
       
       <style>{`
         .scene { perspective: 1000px; width: 100px; height: 100px; display: flex; justify-content: center; align-items: center; }
         .cube { 
            width: 80px; height: 80px; position: relative; transform-style: preserve-3d; 
            transition: transform 1s cubic-bezier(0.175, 0.885, 0.32, 1.275);
         }
         
         .rolling .cube { animation: spin 0.5s infinite linear; }
         
         .face { 
            position: absolute; width: 80px; height: 80px; 
            background: radial-gradient(circle at center, #ffffff 0%, #e2e2e2 100%); 
            border: 1px solid #d1d1d1; border-radius: 16px; 
            display: flex; justify-content: center; align-items: center; 
            box-shadow: inset 0 0 15px rgba(0,0,0,0.1), 0 0 10px rgba(0,0,0,0.2);
         }
         
         .dot { 
            width: 14px; height: 14px; background: #1a1a1a; border-radius: 50%; 
            box-shadow: inset 0 3px 5px rgba(0,0,0,0.8), 0 1px 0 rgba(255,255,255,0.5); 
         }
         
         .front  { transform: translateZ(40px); }
         .back   { transform: rotateY(180deg) translateZ(40px); }
         .right  { transform: rotateY(90deg) translateZ(40px); }
         .left   { transform: rotateY(-90deg) translateZ(40px); }
         .top    { transform: rotateX(90deg) translateZ(40px); }
         .bottom { transform: rotateX(-90deg) translateZ(40px); }

         @keyframes spin {
            0% { transform: rotateX(0deg) rotateY(0deg) rotateZ(0deg); }
            100% { transform: rotateX(360deg) rotateY(360deg) rotateZ(360deg); }
         }
         
         .face-1 { justify-content: center; align-items: center; }
         .face-2 { justify-content: space-between; padding: 16px; }
         .face-2 .dot:nth-child(2) { align-self: flex-end; }
         .face-3 { justify-content: space-between; padding: 16px; }
         .face-3 .dot:nth-child(2) { align-self: center; }
         .face-3 .dot:nth-child(3) { align-self: flex-end; }
         .face-4 { flex-wrap: wrap; justify-content: space-between; padding: 16px; align-content: space-between; }
         .face-5 { flex-wrap: wrap; justify-content: space-between; padding: 16px; align-content: space-between; }
         .face-5 .dot:nth-child(2) { margin: 0 22px; } /* Center dot hack */
         .face-6 { flex-wrap: wrap; justify-content: space-between; padding: 16px; align-content: space-between; }
         .face-6 .dot { margin: 0 22px; } /* Column alignment */
       `}</style>

       {/* Header */}
       <div className="flex justify-between items-center mb-8">
           <div className="flex items-center gap-4">
               <Link to="/games" className="p-3 bg-white/5 rounded-2xl hover:bg-white/10 transition text-white border border-white/5">
                   <ArrowLeft size={22} />
               </Link>
               <div>
                   <h1 className="text-2xl font-black text-white flex items-center gap-2 uppercase tracking-wide">
                       Lucky <span className="text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-amber-200">Dice</span>
                   </h1>
               </div>
           </div>
           
           <div className="flex flex-col gap-2 items-end">
                <GlassCard className="!p-2 !rounded-xl flex items-center gap-3 border-amber-500/20 bg-amber-900/10">
                    <div className="text-right">
                        <p className="text-[9px] text-amber-200/70 font-bold uppercase tracking-widest">Main</p>
                        <p className="text-white font-mono font-bold text-sm leading-none"><BalanceDisplay amount={balance} /></p>
                    </div>
                    <div className="p-1.5 bg-amber-500 rounded-lg text-black">
                        <Zap size={16} fill="currentColor" />
                    </div>
                </GlassCard>
                <GlassCard className="!p-2 !rounded-xl flex items-center gap-3 border-purple-500/20 bg-purple-900/10">
                    <div className="text-right">
                        <p className="text-[9px] text-purple-200/70 font-bold uppercase tracking-widest">Winnings</p>
                        <p className="text-white font-mono font-bold text-sm leading-none"><BalanceDisplay amount={gameBalance} /></p>
                    </div>
                    <div className="p-1.5 bg-purple-500 rounded-lg text-black">
                        <Trophy size={16} fill="currentColor" />
                    </div>
                </GlassCard>
           </div>
       </div>

       <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
           
           {/* GAME AREA */}
           <div className="lg:col-span-8 space-y-6">
               <div className="relative rounded-[32px] overflow-hidden border border-white/10 bg-gradient-to-b from-[#1a1025] to-[#0f0518] shadow-2xl">
                   {/* Decorative Glows */}
                   <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-64 bg-purple-600/20 blur-[100px] pointer-events-none"></div>
                   
                   {/* DICE STAGE */}
                   <div className="relative z-10 h-[320px] flex flex-col items-center justify-center">
                        <div className="flex gap-12 perspective-1000">
                            {[0, 1].map((idx) => {
                                const val = diceValues[idx];
                                const rotations: Record<number, string> = {
                                    1: 'rotateX(0deg) rotateY(0deg)',
                                    2: 'rotateX(0deg) rotateY(180deg)',
                                    3: 'rotateX(0deg) rotateY(-90deg)',
                                    4: 'rotateX(0deg) rotateY(90deg)',
                                    5: 'rotateX(-90deg) rotateY(0deg)',
                                    6: 'rotateX(90deg) rotateY(0deg)'
                                };

                                return (
                                    <div key={idx} className={`scene ${isRolling ? 'rolling' : ''}`}>
                                        <div className="cube" style={{ transform: isRolling ? undefined : rotations[val] }}>
                                            <div className="face front face-1"><div className="dot"></div></div>
                                            <div className="face back face-2"><div className="dot"></div><div className="dot"></div></div>
                                            <div className="face right face-3"><div className="dot"></div><div className="dot"></div><div className="dot"></div></div>
                                            <div className="face left face-4"><div className="dot"></div><div className="dot"></div><div className="dot"></div><div className="dot"></div></div>
                                            <div className="face top face-5"><div className="dot"></div><div className="dot"></div><div className="dot"></div><div className="dot"></div><div className="dot"></div></div>
                                            <div className="face bottom face-6"><div className="dot"></div><div className="dot"></div><div className="dot"></div><div className="dot"></div><div className="dot"></div><div className="dot"></div></div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        {/* Result Overlay */}
                        <div className="mt-12 h-10 flex items-center justify-center">
                            <AnimatePresence mode="wait">
                                {isRolling ? (
                                    <motion.p 
                                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                                        className="text-gray-400 font-bold tracking-widest text-sm animate-pulse"
                                    >
                                        ROLLING...
                                    </motion.p>
                                ) : lastResult ? (
                                    <motion.div
                                        initial={{ scale: 0.5, opacity: 0 }}
                                        animate={{ scale: 1, opacity: 1 }}
                                        className={`flex flex-col items-center ${lastResult.win ? 'text-green-400' : 'text-gray-400'}`}
                                    >
                                        <div className="text-4xl font-black">{lastResult.roll}</div>
                                        <div className="text-xs font-bold uppercase tracking-widest mt-1">
                                            {lastResult.win ? `YOU WON ${format(lastResult.amount)}` : 'TRY AGAIN'}
                                        </div>
                                    </motion.div>
                                ) : (
                                    <p className="text-gray-500 font-medium text-sm">Place your bet to start</p>
                                )}
                            </AnimatePresence>
                        </div>
                   </div>

                   {/* BETTING CONTROLS */}
                   <div className="bg-black/40 backdrop-blur-xl border-t border-white/10 p-6">
                       
                       <div className="grid grid-cols-3 gap-4 mb-8">
                           <button onClick={() => setSelectedBet('low')} disabled={isRolling} className={`relative group overflow-hidden p-4 rounded-2xl border-2 transition-all duration-300 ${selectedBet === 'low' ? 'border-blue-500 bg-blue-500/10 shadow-[0_0_20px_rgba(59,130,246,0.3)]' : 'border-white/5 bg-white/5 hover:bg-white/10'}`}>
                               <div className="relative z-10 flex flex-col items-center">
                                   <span className={`text-2xl font-black mb-1 ${selectedBet === 'low' ? 'text-blue-400' : 'text-gray-400'}`}>2 - 6</span>
                                   <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Low</span>
                                   <div className="mt-2 px-2 py-1 bg-black/40 rounded text-[10px] font-mono text-blue-300 border border-blue-500/30">x{MULTIPLIERS.low}</div>
                               </div>
                           </button>

                           <button onClick={() => setSelectedBet('seven')} disabled={isRolling} className={`relative group overflow-hidden p-4 rounded-2xl border-2 transition-all duration-300 ${selectedBet === 'seven' ? 'border-amber-400 bg-amber-500/10 shadow-[0_0_20px_rgba(251,191,36,0.3)] scale-105 z-10' : 'border-amber-500/20 bg-amber-500/5 hover:bg-amber-500/10'}`}>
                               <div className="relative z-10 flex flex-col items-center">
                                   <Zap size={24} className={`mb-1 ${selectedBet === 'seven' ? 'text-amber-400 animate-bounce' : 'text-amber-600'}`} />
                                   <span className={`text-2xl font-black mb-1 ${selectedBet === 'seven' ? 'text-amber-400' : 'text-gray-400'}`}>7</span>
                                   <div className="mt-1 px-3 py-1 bg-amber-500 text-black rounded-lg text-xs font-black shadow-lg shadow-amber-500/20">x{MULTIPLIERS.seven}</div>
                               </div>
                           </button>

                           <button onClick={() => setSelectedBet('high')} disabled={isRolling} className={`relative group overflow-hidden p-4 rounded-2xl border-2 transition-all duration-300 ${selectedBet === 'high' ? 'border-red-500 bg-red-500/10 shadow-[0_0_20px_rgba(239,68,68,0.3)]' : 'border-white/5 bg-white/5 hover:bg-white/10'}`}>
                               <div className="relative z-10 flex flex-col items-center">
                                   <span className={`text-2xl font-black mb-1 ${selectedBet === 'high' ? 'text-red-400' : 'text-gray-400'}`}>8 - 12</span>
                                   <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500">High</span>
                                   <div className="mt-2 px-2 py-1 bg-black/40 rounded text-[10px] font-mono text-red-300 border border-red-500/30">x{MULTIPLIERS.high}</div>
                               </div>
                           </button>
                       </div>

                       <div className="flex flex-col sm:flex-row gap-4 items-stretch">
                           <div className="flex-1 bg-[#0a0a0a] rounded-xl border border-white/10 p-1 flex items-center">
                               <div className="flex-1 px-4">
                                   <p className="text-[9px] text-gray-500 font-bold uppercase mb-0.5">Bet Amount ({symbol})</p>
                                   <input type="number" value={betAmount} onChange={e => setBetAmount(e.target.value)} className="w-full bg-transparent text-white font-bold text-lg outline-none font-mono"/>
                               </div>
                               <div className="flex gap-1 pr-1">
                                   {[10, 50, 100].map(amt => (
                                       <button key={amt} onClick={() => setBetAmount(amt.toString())} className="px-3 py-2 bg-white/5 hover:bg-white/10 rounded-lg text-[10px] font-bold text-gray-400 hover:text-white transition">
                                           {amt}
                                       </button>
                                   ))}
                               </div>
                           </div>

                           <button onClick={rollDice} disabled={isRolling || !selectedBet} className={`px-8 py-4 rounded-xl font-black text-sm uppercase tracking-wider shadow-xl transition-all relative overflow-hidden group w-full sm:w-auto min-w-[160px] ${isRolling || !selectedBet ? 'bg-gray-800 text-gray-500 cursor-not-allowed' : 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white hover:scale-[1.02] active:scale-[0.98] shadow-purple-900/40'}`}>
                               {isRolling ? <span className="flex items-center justify-center gap-2"><History className="animate-spin" size={16}/> Rolling</span> : 'Roll Dice'}
                           </button>
                       </div>

                   </div>
               </div>
           </div>

           {/* SIDEBAR STATS */}
           <div className="lg:col-span-4 space-y-6">
               <GlassCard className="h-[400px] flex flex-col bg-[#111] border-white/10">
                   <div className="flex justify-between items-center mb-4 pb-4 border-b border-white/5">
                       <h3 className="font-bold text-white text-sm flex items-center gap-2"><History size={16} className="text-gray-400"/> Roll History</h3>
                       <button onClick={() => setSoundEnabled(!soundEnabled)} className="text-gray-500 hover:text-white transition">
                           {soundEnabled ? <Volume2 size={16}/> : <VolumeX size={16}/>}
                       </button>
                   </div>
                   <div className="flex-1 overflow-y-auto space-y-2 pr-2 custom-scrollbar">
                       {rollHistory.length === 0 ? <div className="h-full flex flex-col items-center justify-center text-gray-600 space-y-2"><Dices size={32} className="opacity-20"/><p className="text-xs">No rolls yet</p></div> : rollHistory.map((h, i) => (
                           <div key={i} className="flex justify-between items-center p-3 rounded-xl bg-white/5 border border-white/5">
                               <div className="flex items-center gap-3">
                                   <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm ${h.roll === 7 ? 'bg-amber-500 text-black' : h.roll > 7 ? 'bg-red-500/20 text-red-400' : 'bg-blue-500/20 text-blue-400'}`}>{h.roll}</div>
                                   <div>
                                       <p className={`text-xs font-bold ${h.win ? 'text-green-400' : 'text-gray-400'}`}>{h.win ? 'WIN' : 'LOSS'}</p>
                                       <p className="text-[9px] text-gray-600">{new Date(h.timestamp).toLocaleTimeString()}</p>
                                   </div>
                               </div>
                           </div>
                       ))}
                   </div>
               </GlassCard>
           </div>
       </div>
    </div>
  );
};

export default Dice;
