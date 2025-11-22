
import React, { useState, useEffect, useRef, useCallback } from 'react';
import GlassCard from '../components/GlassCard';
import { Dices, Volume2, VolumeX, Zap, ArrowLeft, Trophy, ArrowDown, ArrowUp, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../integrations/supabase/client';
import { WalletData, GameResult } from '../types';
import { processGameResult, updateWallet } from '../lib/actions';
import { useUI } from '../context/UIContext';
import BalanceDisplay from '../components/BalanceDisplay';

// --- DICE FACE COMPONENT ---
const DiceFace = ({ val }: { val: number }) => {
    return (
        <div className="w-full h-full bg-black/90 border border-neon-green/50 shadow-[0_0_10px_rgba(16,185,129,0.2)] p-1">
             <div className="grid grid-cols-3 grid-rows-3 w-full h-full gap-0.5">
                {Array.from({length: 9}).map((_, i) => {
                    let active = false;
                    if (val === 1 && i === 4) active = true;
                    if (val === 2 && [0, 8].includes(i)) active = true;
                    if (val === 3 && [0, 4, 8].includes(i)) active = true;
                    if (val === 4 && [0, 2, 6, 8].includes(i)) active = true;
                    if (val === 5 && [0, 2, 4, 6, 8].includes(i)) active = true;
                    if (val === 6 && [0, 2, 3, 5, 6, 8].includes(i)) active = true;
                    
                    return (
                        <div key={i} className="flex items-center justify-center">
                            {active && <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-neon-green rounded-full shadow-[0_0_5px_#10b981]"></div>}
                        </div>
                    )
                })}
             </div>
        </div>
    );
};

// --- ADVANCED 3D CUBE COMPONENT ---
const CyberCube = ({ spinning }: { spinning: boolean }) => {
  const faces = [
      { val: 1, rotateY: 0, translateZ: 32 },    // Front
      { val: 6, rotateY: 180, translateZ: 32 },  // Back
      { val: 2, rotateY: 90, translateZ: 32 },   // Right
      { val: 5, rotateY: -90, translateZ: 32 },  // Left
      { val: 3, rotateX: 90, translateZ: 32 },   // Top
      { val: 4, rotateX: -90, translateZ: 32 },  // Bottom
  ];

  return (
    <div className="w-32 h-32 mx-auto mb-8 relative perspective-[1000px] flex items-center justify-center">
      
      {/* Outer Wireframe Cube (Slow Rotate) */}
      <motion.div
        className="w-24 h-24 absolute preserve-3d"
        style={{ transformStyle: 'preserve-3d' }}
        animate={{ rotateX: 360, rotateY: -360 }}
        transition={{ repeat: Infinity, duration: 20, ease: "linear" }}
      >
         {[
            { rotY: 0, z: 48 }, { rotY: 180, z: 48 }, 
            { rotY: 90, z: 48 }, { rotY: -90, z: 48 }, 
            { rotX: 90, z: 48 }, { rotX: -90, z: 48 }
         ].map((face, i) => (
            <div 
                key={`outer-${i}`}
                className="absolute inset-0 border border-royal-500/20 bg-royal-500/5 flex items-center justify-center"
                style={{ transform: `rotateX(${face.rotX || 0}deg) rotateY(${face.rotY || 0}deg) translateZ(${face.z}px)` }}
            >
                <div className="w-full h-full border border-royal-500/10 transform scale-75"></div>
            </div>
         ))}
      </motion.div>

      {/* Inner Glowing Dice (Fast Spin on Roll) */}
      <motion.div
        className="w-16 h-16 relative preserve-3d"
        style={{ transformStyle: 'preserve-3d' }}
        animate={spinning ? { 
            rotateX: [0, 360, 720, 1080], 
            rotateY: [0, 360, 720, 1080],
            rotateZ: [0, 180, 360]
        } : { 
            rotateX: -25, 
            rotateY: 45,
            rotateZ: 0
        }}
        transition={spinning ? { 
            repeat: Infinity, 
            duration: 0.6, 
            ease: "linear" 
        } : { 
            duration: 0.8, 
            type: "spring",
            stiffness: 60 
        }}
      >
        {faces.map((face, i) => (
            <div 
                key={i}
                className={`absolute inset-0 flex items-center justify-center backface-visible`}
                style={{ 
                    transform: `rotateX(${face.rotateX || 0}deg) rotateY(${face.rotateY || 0}deg) translateZ(${face.translateZ}px)` 
                }}
            >
                <DiceFace val={face.val} />
            </div>
        ))}
        
        {/* Core Light */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-8 h-8 bg-neon-green rounded-full blur-xl animate-pulse opacity-50"></div>
        </div>
      </motion.div>
    </div>
  )
}

const Dice: React.FC = () => {
  const { toast } = useUI();
  const [wallet, setWallet] = useState<WalletData | null>(null);
  const [history, setHistory] = useState<GameResult[]>([]);
  const [userId, setUserId] = useState('');

  // Game State
  const [target, setTarget] = useState(50);
  const [isRolling, setIsRolling] = useState(false);
  const [displayResult, setDisplayResult] = useState(50.00);
  const [lastResult, setLastResult] = useState<{ val: number, win: boolean } | null>(null);
  const [betAmount, setBetAmount] = useState<string>('10');
  const [isMuted, setIsMuted] = useState(false);
  const [rollDirection, setRollDirection] = useState<'under' | 'over'>('under');

  // Refs
  const audioCtxRef = useRef<AudioContext | null>(null);
  const rangeRef = useRef<HTMLInputElement>(null);

  // Logic: House Edge 2%
  // Constrain Win Chance to 4% - 96% to prevent < 1.0x multipliers or infinite payout
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
      const masterGain = ctx.createGain();
      masterGain.connect(ctx.destination);

      if (type === 'roll') {
          const osc = ctx.createOscillator();
          osc.type = 'sawtooth'; 
          osc.frequency.setValueAtTime(200, now);
          osc.frequency.linearRampToValueAtTime(1200, now + 0.3); 
          
          const filter = ctx.createBiquadFilter();
          filter.type = 'bandpass';
          filter.Q.value = 5;
          filter.frequency.setValueAtTime(400, now);
          filter.frequency.linearRampToValueAtTime(3000, now + 0.3);

          const gain = ctx.createGain();
          gain.gain.setValueAtTime(0.1, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);

          osc.connect(filter);
          filter.connect(gain);
          gain.connect(masterGain);
          osc.start(now);
          osc.stop(now + 0.3);

      } else if (type === 'win') {
          [523.25, 659.25, 783.99, 1046.50].forEach((freq, i) => {
              const osc = ctx.createOscillator();
              osc.type = 'square';
              osc.frequency.setValueAtTime(freq, now + i * 0.05);
              const gain = ctx.createGain();
              gain.gain.setValueAtTime(0.05, now + i * 0.05);
              gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.05 + 0.3);
              osc.connect(gain);
              gain.connect(masterGain);
              osc.start(now + i * 0.05);
              osc.stop(now + i * 0.05 + 0.3);
          });
      } else if (type === 'loss') {
          const osc = ctx.createOscillator();
          osc.type = 'sawtooth';
          osc.frequency.setValueAtTime(100, now);
          osc.frequency.exponentialRampToValueAtTime(30, now + 0.3);
          const gain = ctx.createGain();
          gain.gain.setValueAtTime(0.1, now);
          gain.gain.linearRampToValueAtTime(0, now + 0.3);
          osc.connect(gain);
          gain.connect(masterGain);
          osc.start(now);
          osc.stop(now + 0.3);
      } else if (type === 'slider') {
          const osc = ctx.createOscillator();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(1200, now);
          const gain = ctx.createGain();
          gain.gain.setValueAtTime(0.02, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.02);
          osc.connect(gain);
          gain.connect(masterGain);
          osc.start(now);
          osc.stop(now + 0.02);
      }
  }, [isMuted]);

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = parseInt(e.target.value);
      // Constrain target to keep win chance between 4% and 96%
      const clamped = Math.max(4, Math.min(96, val));
      setTarget(clamped);
      playSound('slider');
  };

  const setDirection = (dir: 'under' | 'over') => {
      if (dir === rollDirection) return;
      setRollDirection(dir);
      setTarget(100 - target); 
      playSound('slider');
  };

  const handleRoll = async () => {
      if (isRolling || !wallet) return;

      const bet = parseFloat(betAmount);
      if (isNaN(bet) || bet <= 0) { toast.error("Invalid bet amount"); return; }
      if (bet > wallet.balance) { toast.error("Insufficient balance"); return; }

      setIsRolling(true);
      playSound('roll');

      // Optimistic UI update
      setWallet(prev => prev ? ({...prev, balance: prev.balance - bet}) : null);

      // Animation Loop
      let frame = 0;
      const animInterval = setInterval(() => {
          setDisplayResult(Math.random() * 100);
          frame++;
          if (frame > 15) { // ~450ms spin
              clearInterval(animInterval);
              finalizeRoll(bet);
          }
      }, 30);
  };

  const finalizeRoll = async (bet: number) => {
      const rawRoll = Math.random() * 100;
      const finalResult = parseFloat(rawRoll.toFixed(2));
      
      setDisplayResult(finalResult);

      const isWin = rollDirection === 'under' 
          ? finalResult < target 
          : finalResult > target;

      const payout = isWin ? (bet * multiplier) : 0;
      
      setLastResult({ val: finalResult, win: isWin });
      
      if (isWin) playSound('win');
      else playSound('loss');

      if (userId) {
          // DB Updates
          await updateWallet(userId, bet, 'decrement', 'balance');
          if (isWin) {
              await updateWallet(userId, payout, 'increment', 'balance');
          }
          
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
          
          fetchData();
      }
      
      setIsRolling(false);
  };

  const getTrackBackground = () => {
      const p = target;
      if (rollDirection === 'under') {
          return `linear-gradient(to right, #10b981 0%, #10b981 ${p}%, #ef4444 ${p}%, #ef4444 100%)`;
      } else {
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
                       title={isMuted ? "Unmute" : "Mute"}
                   >
                       {isMuted ? <VolumeX size={16}/> : <Volume2 size={16}/>}
                   </button>
                   <div className="bg-dark-900 px-3 py-1.5 rounded-lg border border-white/10 flex items-center gap-2">
                       <Trophy size={14} className="text-yellow-400"/>
                       <span className="font-mono font-bold text-white text-sm"><BalanceDisplay amount={wallet?.balance || 0} /></span>
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
               <div className="relative z-10 text-center mb-8">
                   
                   {/* Advanced Cyber Cube Animation */}
                   <CyberCube spinning={isRolling} />

                   {/* History Bar */}
                   <div className="flex justify-center mb-4">
                        <div className="flex gap-2 bg-black/30 p-2 rounded-xl border border-white/5">
                            {history.slice(0, 5).map((h) => (
                                <div key={h.id} className={`w-2 h-8 rounded-full transition-all hover:scale-y-110 ${h.profit > 0 ? 'bg-neon-green shadow-[0_0_8px_#10b981]' : 'bg-gray-700 opacity-50'}`}></div>
                            ))}
                        </div>
                   </div>
                   
                   <div className="relative inline-block">
                        <span className={`text-7xl sm:text-9xl font-black font-mono tracking-tighter transition-all duration-100 ${
                            isRolling ? 'text-white opacity-80 blur-[1px]' :
                            lastResult?.win ? 'text-neon-green drop-shadow-[0_0_25px_rgba(16,185,129,0.6)]' : 
                            lastResult ? 'text-gray-500' : 'text-white'
                        }`}>
                            {displayResult.toFixed(2)}
                        </span>
                        
                        {/* Win/Loss Badge */}
                        <AnimatePresence>
                            {!isRolling && lastResult && (
                                <motion.div 
                                    initial={{ opacity: 0, y: 10, scale: 0.8 }} 
                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                    exit={{ opacity: 0 }}
                                    className={`absolute -right-12 -top-4 px-3 py-1 rounded-lg font-bold text-xs uppercase tracking-wider transform rotate-12 shadow-lg ${
                                        lastResult.win ? 'bg-neon-green text-black' : 'bg-red-500 text-white'
                                    }`}
                                >
                                    {lastResult.win ? 'WIN' : 'LOSE'}
                                </motion.div>
                            )}
                        </AnimatePresence>
                   </div>
               </div>

               {/* Slider Section */}
               <div className="relative z-10 mb-8 px-2">
                   
                   {/* Roll Direction Toggle */}
                   <div className="flex justify-center mb-6">
                       <div className="bg-black/40 p-1 rounded-xl flex border border-white/10">
                           <button 
                               onClick={() => setDirection('under')} 
                               className={`px-6 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${rollDirection === 'under' ? 'bg-white/10 text-white shadow-lg' : 'text-gray-500 hover:text-gray-300'}`}
                           >
                               <ArrowDown size={14} /> Roll Under
                           </button>
                           <button 
                               onClick={() => setDirection('over')} 
                               className={`px-6 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${rollDirection === 'over' ? 'bg-white/10 text-white shadow-lg' : 'text-gray-500 hover:text-gray-300'}`}
                           >
                               <ArrowUp size={14} /> Roll Over
                           </button>
                       </div>
                   </div>

                   <div className="bg-dark-950/50 rounded-2xl p-6 border border-white/10 shadow-inner relative">
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
                            
                            {/* Range Input */}
                            <input 
                                ref={rangeRef}
                                type="range" 
                                min="4" max="96" step="1"
                                value={target}
                                onChange={handleSliderChange}
                                className="absolute inset-0 w-full opacity-0 cursor-pointer z-20"
                            />
                            
                            {/* Target Handle */}
                            <div 
                                className="absolute h-10 w-14 bg-white rounded-xl border-4 border-dark-900 shadow-xl flex items-center justify-center z-10 pointer-events-none transition-all duration-75 ease-out"
                                style={{ left: `calc(${target}% - 28px)` }}
                            >
                                <span className="text-xs font-black text-dark-900">{target}</span>
                            </div>

                            {/* Last Result Indicator (Ghost Marker) */}
                            {!isRolling && lastResult && (
                                <div 
                                    className={`absolute w-4 h-4 rounded-full border-2 border-white shadow-lg z-10 transition-all duration-500 ${lastResult.win ? 'bg-neon-green' : 'bg-red-500'}`}
                                    style={{ left: `calc(${displayResult}% - 8px)`, top: '50%', transform: 'translateY(-50%)' }}
                                >
                                    <div className="absolute -top-6 left-1/2 -translate-x-1/2 text-[9px] font-bold text-white bg-black/60 px-1.5 rounded whitespace-nowrap">
                                        {displayResult.toFixed(0)}
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="flex justify-between text-xs text-gray-400 font-bold mt-4 uppercase tracking-wider px-1">
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
                   <div className="bg-white/5 rounded-xl p-3 text-center border border-white/5">
                       <div className="text-[10px] text-gray-400 uppercase mb-1">Target</div>
                       <div className="text-xl font-bold text-white">
                           {rollDirection === 'under' ? '<' : '>'} {target}
                       </div>
                   </div>
                   <div className="bg-white/5 rounded-xl p-3 text-center border border-white/5">
                        <div className="text-[10px] text-gray-400 uppercase mb-1">Multiplier</div>
                        <div className="text-xl font-bold text-white">{multiplier.toFixed(2)}x</div>
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
                                Max: <BalanceDisplay amount={wallet?.balance || 0} />
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
                                <span className="text-[10px] font-normal mt-1 opacity-80 flex items-center gap-1">
                                    <Sparkles size={10}/> Win <BalanceDisplay amount={potentialWin} />
                                </span>
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
