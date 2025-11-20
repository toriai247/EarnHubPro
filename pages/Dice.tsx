
import React, { useState, useEffect, useRef, useCallback } from 'react';
import GlassCard from '../components/GlassCard';
import { Dices, Volume2, VolumeX, Zap, History, ArrowLeft, Trophy, Settings2, Percent } from 'lucide-react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../integrations/supabase/client';
import { WalletData, GameResult } from '../types';
import { processGameResult, updateWallet } from '../lib/actions';

const Dice: React.FC = () => {
  const [wallet, setWallet] = useState<WalletData | null>(null);
  const [history, setHistory] = useState<GameResult[]>([]);
  const [userId, setUserId] = useState('');

  // Game State
  const [target, setTarget] = useState(50); // Roll Under target (0-100)
  const [isRolling, setIsRolling] = useState(false);
  const [displayResult, setDisplayResult] = useState(50.00);
  const [lastResult, setLastResult] = useState<{ val: number, win: boolean } | null>(null);
  const [betAmount, setBetAmount] = useState<string>('10');
  const [isMuted, setIsMuted] = useState(false);
  const [rollDirection, setRollDirection] = useState<'under' | 'over'>('under'); // Default 'under'

  // Refs
  const audioCtxRef = useRef<AudioContext | null>(null);
  const rangeRef = useRef<HTMLInputElement>(null);

  // Calculated Values
  // House Edge: 2% (Multiplier = 98 / WinChance)
  const winChance = rollDirection === 'under' ? target : (100 - target);
  const multiplier = winChance > 0 ? (98 / winChance) : 0;
  const potentialWin = parseFloat(betAmount || '0') * multiplier;

  useEffect(() => {
    fetchData();
    return () => {
        if (audioCtxRef.current) audioCtxRef.current.close();
    };
  }, []);

  const fetchData = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
        setUserId(session.user.id);
        const { data: walletData } = await supabase.from('wallets').select('*').eq('user_id', session.user.id).single();
        if(walletData) setWallet(walletData as WalletData);

        const { data: hist } = await supabase.from('game_history')
            .select('*')
            .eq('user_id', session.user.id)
            .eq('game_id', 'dice')
            .order('created_at', {ascending: false})
            .limit(10);
            
        if(hist) {
            setHistory(hist.map((row: any) => ({
                id: row.id, gameId: row.game_id, gameName: row.game_name, bet: row.bet,
                payout: row.payout, profit: row.profit, timestamp: new Date(row.created_at).getTime(), details: row.details
            })));
        }
    }
  };

  // --- SOUND ENGINE ---
  const getAudioContext = () => {
      if (!audioCtxRef.current) {
          const Ctx = window.AudioContext || (window as any).webkitAudioContext;
          if (Ctx) audioCtxRef.current = new Ctx();
      }
      if (audioCtxRef.current?.state === 'suspended') audioCtxRef.current.resume();
      return audioCtxRef.current;
  };

  const playSound = useCallback((type: 'roll' | 'win' | 'loss' | 'slider') => {
      if (isMuted) return;
      const ctx = getAudioContext();
      if (!ctx) return;
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      if (type === 'roll') {
          // Digital winding sound
          osc.type = 'square';
          osc.frequency.setValueAtTime(200, now);
          osc.frequency.linearRampToValueAtTime(800, now + 0.1);
          osc.frequency.linearRampToValueAtTime(0, now + 0.3);
          gain.gain.setValueAtTime(0.05, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
          osc.start(now);
          osc.stop(now + 0.3);
      } else if (type === 'win') {
          // High tech chime
          osc.type = 'sine';
          osc.frequency.setValueAtTime(523.25, now); // C5
          osc.frequency.setValueAtTime(659.25, now + 0.1); // E5
          osc.frequency.setValueAtTime(783.99, now + 0.2); // G5
          osc.frequency.setValueAtTime(1046.50, now + 0.3); // C6
          gain.gain.setValueAtTime(0.1, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.8);
          osc.start(now);
          osc.stop(now + 0.8);
      } else if (type === 'loss') {
          // Low thud
          osc.type = 'sawtooth';
          osc.frequency.setValueAtTime(150, now);
          osc.frequency.exponentialRampToValueAtTime(50, now + 0.2);
          gain.gain.setValueAtTime(0.1, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
          osc.start(now);
          osc.stop(now + 0.2);
      } else if (type === 'slider') {
          // Quick click
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(800, now);
          gain.gain.setValueAtTime(0.02, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
          osc.start(now);
          osc.stop(now + 0.05);
      }
  }, [isMuted]);

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = parseInt(e.target.value);
      // Clamp values to avoid 0% or 100% win chance edge cases
      if (rollDirection === 'under') {
          if (val < 5) setTarget(5);
          else if (val > 95) setTarget(95);
          else setTarget(val);
      } else {
          if (val < 5) setTarget(5);
          else if (val > 95) setTarget(95);
          else setTarget(val);
      }
      playSound('slider');
  };

  const toggleDirection = () => {
      setRollDirection(prev => {
          // Invert target to maintain similar win chance feeling
          const newDir = prev === 'under' ? 'over' : 'under';
          setTarget(100 - target); 
          return newDir;
      });
      playSound('slider');
  };

  const handleRoll = async () => {
      if (isRolling || !wallet) return;

      const bet = parseFloat(betAmount);
      if (isNaN(bet) || bet <= 0) {
          alert("Invalid bet amount");
          return;
      }
      if (bet > wallet.balance) {
          alert("Insufficient balance");
          return;
      }

      setIsRolling(true);
      playSound('roll');

      // Optimistic UI update
      setWallet(prev => prev ? ({...prev, balance: prev.balance - bet}) : null);

      // Animation Loop
      let frame = 0;
      const animInterval = setInterval(() => {
          setDisplayResult(Math.random() * 100);
          frame++;
          if (frame > 10) { // Stop after ~300ms
              clearInterval(animInterval);
              finalizeRoll(bet);
          }
      }, 30);
  };

  const finalizeRoll = async (bet: number) => {
      // Generate cryptographic random in real app, here simple Math.random is used for demo
      const rawRoll = Math.random() * 100;
      const finalResult = parseFloat(rawRoll.toFixed(2));
      
      setDisplayResult(finalResult);

      const isWin = rollDirection === 'under' 
          ? finalResult < target 
          : finalResult > target;

      const payout = isWin ? (bet * multiplier) : 0;
      const profit = payout - bet;

      setLastResult({ val: finalResult, win: isWin });
      
      if (isWin) playSound('win');
      else playSound('loss');

      if (userId) {
          // If lost, only bet is deducted (already done optimistically, but need DB update)
          // If won, add payout
          
          // Sync with DB
          await updateWallet(userId, bet, 'decrement', 'balance'); // Actual deduction
          if (isWin) {
              await updateWallet(userId, payout, 'increment', 'balance');
          }
          
          // Fetch fresh wallet to ensure sync
          const { data } = await supabase.from('wallets').select('*').eq('user_id', userId).single();
          if (data) setWallet(data as WalletData);
          window.dispatchEvent(new Event('wallet_updated'));

          await processGameResult(
              userId, 
              'dice', 
              'Cyber Dice', 
              bet, 
              payout, 
              `Rolled ${finalResult} (${rollDirection === 'under' ? '<' : '>'} ${target})`
          );
          
          fetchData(); // Refresh history
      }
      
      setIsRolling(false);
  };

  // Helper for visual track background
  const getTrackBackground = () => {
      // Calculate percentage for gradient stop
      const p = target;
      if (rollDirection === 'under') {
          // Green (0 to p), Red (p to 100)
          return `linear-gradient(to right, #10b981 0%, #10b981 ${p}%, #ef4444 ${p}%, #ef4444 100%)`;
      } else {
          // Red (0 to p), Green (p to 100)
          return `linear-gradient(to right, #ef4444 0%, #ef4444 ${p}%, #10b981 ${p}%, #10b981 100%)`;
      }
  };

  return (
    <div className="h-[calc(100vh-100px)] sm:h-auto sm:pb-24 sm:pl-20 sm:pt-6 flex flex-col relative overflow-hidden">
       
       {/* Header */}
       <div className="px-3 pt-2 shrink-0 z-10">
           <header className="flex items-center justify-between mb-4">
               <div className="flex items-center gap-2">
                   <Link to="/games" className="bg-white/10 p-2 rounded-lg text-white hover:bg-white/20"><ArrowLeft size={16}/></Link>
                   <h1 className="text-xl font-display font-bold text-white italic flex items-center gap-2">CYBER DICE <Dices size={18} className="text-neon-green"/></h1>
               </div>
               <div className="flex gap-2">
                    <button 
                       onClick={() => setIsMuted(!isMuted)} 
                       className={`p-2 rounded-lg border border-white/10 transition ${isMuted ? 'bg-red-500/20 text-red-400' : 'bg-white/5 text-white'}`}
                   >
                       {isMuted ? <VolumeX size={16}/> : <Volume2 size={16}/>}
                   </button>
                   <div className="bg-dark-900 px-3 py-1.5 rounded-lg border border-white/10 flex items-center gap-2">
                       <Trophy size={14} className="text-yellow-400"/>
                       <span className="font-mono font-bold text-white text-sm">${wallet?.balance.toFixed(2)}</span>
                   </div>
               </div>
           </header>
       </div>

       <div className="flex-1 flex flex-col px-3 sm:px-0 gap-4 max-w-4xl mx-auto w-full">
           
           {/* GAME AREA */}
           <GlassCard className="bg-dark-900/80 border-royal-500/20 p-6 md:p-10 relative overflow-hidden shadow-2xl flex-1 flex flex-col justify-center">
               {/* Background Grid FX */}
               <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-20"></div>
               <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-neon-green to-transparent opacity-50"></div>
               
               {/* Main Result Display */}
               <div className="relative z-10 text-center mb-12">
                   <div className="flex justify-center mb-4">
                        {/* History Pills */}
                        <div className="flex gap-2">
                            {history.slice(0, 5).map((h) => (
                                <div key={h.id} className={`w-1.5 h-8 rounded-full ${h.profit > 0 ? 'bg-neon-green shadow-[0_0_10px_#10b981]' : 'bg-gray-700'}`}></div>
                            ))}
                        </div>
                   </div>
                   
                   <div className="relative inline-block">
                        <span className={`text-7xl sm:text-9xl font-black font-mono tracking-tighter transition-colors duration-100 ${
                            isRolling ? 'text-white opacity-80 blur-[1px]' :
                            lastResult?.win ? 'text-neon-green drop-shadow-[0_0_25px_rgba(16,185,129,0.6)]' : 
                            lastResult ? 'text-gray-500' : 'text-white'
                        }`}>
                            {displayResult.toFixed(2)}
                        </span>
                        
                        {/* Win/Loss Badge */}
                        {!isRolling && lastResult && (
                            <motion.div 
                                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                                className={`absolute -right-12 -top-4 px-3 py-1 rounded-lg font-bold text-xs uppercase tracking-wider transform rotate-12 ${
                                    lastResult.win ? 'bg-neon-green text-black' : 'bg-red-500 text-white'
                                }`}
                            >
                                {lastResult.win ? 'WIN' : 'LOSE'}
                            </motion.div>
                        )}
                   </div>
               </div>

               {/* Slider Section */}
               <div className="relative z-10 mb-8 px-2">
                   <div className="bg-dark-950/50 rounded-2xl p-6 border border-white/10 shadow-inner">
                        {/* Custom Slider */}
                        <div className="relative h-12 flex items-center">
                            {/* Track */}
                            <div 
                                className="absolute left-0 right-0 h-4 rounded-full overflow-hidden shadow-inner"
                                style={{ background: getTrackBackground() }}
                            >
                                {/* Markers */}
                                <div className="absolute top-0 bottom-0 w-0.5 bg-black/20 left-[25%]"></div>
                                <div className="absolute top-0 bottom-0 w-0.5 bg-black/20 left-[50%]"></div>
                                <div className="absolute top-0 bottom-0 w-0.5 bg-black/20 left-[75%]"></div>
                            </div>
                            
                            {/* Range Input (Invisible but interactive) */}
                            <input 
                                ref={rangeRef}
                                type="range" 
                                min="2" max="98" step="1"
                                value={target}
                                onChange={handleSliderChange}
                                className="absolute inset-0 w-full opacity-0 cursor-pointer z-20"
                            />
                            
                            {/* Custom Thumb (Visual) */}
                            <div 
                                className="absolute h-10 w-12 bg-white rounded-xl border-4 border-dark-900 shadow-xl flex items-center justify-center z-10 pointer-events-none transition-all duration-75 ease-out"
                                style={{ left: `calc(${target}% - 24px)` }}
                            >
                                <div className="w-1 h-4 bg-gray-300 rounded-full mx-0.5"></div>
                                <div className="w-1 h-4 bg-gray-300 rounded-full mx-0.5"></div>
                            </div>

                            {/* Result Indicator (Visual) */}
                            {!isRolling && lastResult && (
                                <div 
                                    className={`absolute w-4 h-4 rounded-full border-2 border-white shadow-lg z-10 transition-all duration-500 ${lastResult.win ? 'bg-neon-green' : 'bg-red-500'}`}
                                    style={{ left: `calc(${displayResult}% - 8px)`, top: '50%', transform: 'translateY(-50%)' }}
                                ></div>
                            )}
                        </div>

                        <div className="flex justify-between text-xs text-gray-400 font-bold mt-4 uppercase tracking-wider">
                            <span>0</span>
                            <span>25</span>
                            <span>50</span>
                            <span>75</span>
                            <span>100</span>
                        </div>
                   </div>
               </div>

               {/* Info Stats */}
               <div className="grid grid-cols-3 gap-4 relative z-10">
                   <div className="bg-white/5 rounded-xl p-3 text-center border border-white/5 hover:border-neon-green/30 transition cursor-pointer" onClick={toggleDirection}>
                       <div className="text-[10px] text-gray-400 uppercase mb-1 flex items-center justify-center gap-1">
                           Target <Settings2 size={10} />
                       </div>
                       <div className="text-xl font-bold text-white">
                           {rollDirection === 'under' ? '<' : '>'} {target}
                       </div>
                       <div className="text-[9px] text-neon-green mt-1">Click to Flip</div>
                   </div>
                   <div className="bg-white/5 rounded-xl p-3 text-center border border-white/5">
                        <div className="text-[10px] text-gray-400 uppercase mb-1">Multiplier</div>
                        <div className="text-xl font-bold text-white">{multiplier.toFixed(4)}x</div>
                   </div>
                   <div className="bg-white/5 rounded-xl p-3 text-center border border-white/5">
                        <div className="text-[10px] text-gray-400 uppercase mb-1">Win Chance</div>
                        <div className="text-xl font-bold text-white">{winChance.toFixed(0)}%</div>
                   </div>
               </div>

           </GlassCard>
           
           {/* CONTROLS */}
           <GlassCard className="bg-dark-900/90 border-t border-white/10 p-4 shadow-[0_-10px_40px_rgba(0,0,0,0.5)]">
               <div className="flex gap-3 items-end">
                    <div className="flex-1">
                        <div className="flex justify-between mb-1">
                            <label className="text-[10px] text-gray-400 font-bold uppercase">Bet Amount</label>
                            <span className="text-[10px] text-neon-green font-bold cursor-pointer hover:underline" onClick={() => setBetAmount(wallet?.balance.toString() || '0')}>
                                Max: ${wallet?.balance.toFixed(2)}
                            </span>
                        </div>
                        <div className="relative flex items-center">
                             <span className="absolute left-3 text-gray-400 font-bold">$</span>
                             <input 
                                type="number" 
                                value={betAmount} 
                                onChange={e => setBetAmount(e.target.value)}
                                disabled={isRolling}
                                className="w-full bg-black/40 border border-white/10 rounded-xl py-3 pl-7 pr-3 text-white font-bold text-lg focus:border-neon-green outline-none transition"
                             />
                        </div>
                        <div className="flex gap-2 mt-2">
                            <button onClick={() => setBetAmount((parseFloat(betAmount)/2).toFixed(2))} className="flex-1 py-2 bg-white/5 rounded-lg text-[10px] font-bold text-gray-400 hover:bg-white/10 transition">½</button>
                            <button onClick={() => setBetAmount((parseFloat(betAmount)*2).toFixed(2))} className="flex-1 py-2 bg-white/5 rounded-lg text-[10px] font-bold text-gray-400 hover:bg-white/10 transition">2x</button>
                        </div>
                    </div>
                    
                    <button 
                        onClick={handleRoll}
                        disabled={isRolling}
                        className={`h-[84px] w-2/5 rounded-xl font-black text-xl shadow-lg transition-all flex flex-col items-center justify-center leading-none ${
                            isRolling 
                            ? 'bg-gray-800 text-gray-500 cursor-not-allowed' 
                            : 'bg-gradient-to-br from-neon-green to-emerald-600 text-black hover:scale-[1.02] active:scale-95 shadow-[0_0_25px_rgba(16,185,129,0.4)]'
                        }`}
                    >
                        {isRolling ? (
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black"></div>
                        ) : (
                            <>
                                <span className="text-2xl">ROLL</span>
                                <span className="text-[10px] font-normal mt-1 opacity-80">Win ${potentialWin.toFixed(2)}</span>
                            </>
                        )}
                    </button>
               </div>
           </GlassCard>

       </div>
    </div>
  );
};

export default Dice;
