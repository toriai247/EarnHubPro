
import React, { useState, useEffect, useRef } from 'react';
import GlassCard from '../components/GlassCard';
import { ArrowLeft, Crown, Swords, Zap, Trophy, History, Volume2, VolumeX, AlertTriangle, RefreshCw } from 'lucide-react';
import { Link } from 'react-router-dom';
import { supabase } from '../integrations/supabase/client';
import { updateWallet, createTransaction } from '../lib/actions';
import { useUI } from '../context/UIContext';
import BalanceDisplay from '../components/BalanceDisplay';
import { useCurrency } from '../context/CurrencyContext';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';

const HeadTail: React.FC = () => {
  const { toast } = useUI();
  const { symbol, format } = useCurrency();
  
  // Game State
  const [balance, setBalance] = useState(0);
  const [gameBalance, setGameBalance] = useState(0);
  const [betAmount, setBetAmount] = useState<string>('10');
  const [choice, setChoice] = useState<'head' | 'tail'>('head');
  const [isFlipping, setIsFlipping] = useState(false);
  const [coinRotation, setCoinRotation] = useState(0);
  const [history, setHistory] = useState<string[]>([]);
  const [soundOn, setSoundOn] = useState(true);

  // Audio Refs
  const flipSound = useRef(new Audio('https://assets.mixkit.co/active_storage/sfx/2003/2003-preview.mp3'));
  const winSound = useRef(new Audio('https://assets.mixkit.co/active_storage/sfx/1435/1435-preview.mp3'));
  
  useEffect(() => {
      // Preload & Config
      flipSound.current.volume = 0.8; // Increased from 0.6
      winSound.current.volume = 0.9;  // Increased from 0.5
      fetchBalance();
  }, []);

  // Constants
  const MULTIPLIER = 1.90;
  const FLIP_DURATION = 3000; // 3 seconds for full animation

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

  const playSound = (type: 'flip' | 'win') => {
      if (!soundOn) return;
      if (type === 'flip') {
          flipSound.current.currentTime = 0;
          flipSound.current.play().catch(() => {});
      } else if (type === 'win') {
          winSound.current.currentTime = 0;
          winSound.current.play().catch(() => {});
      }
  };

  const handleFlip = async () => {
      const amount = parseFloat(betAmount);
      if (isNaN(amount) || amount <= 0) { toast.error("Invalid amount"); return; }
      
      // Determine Wallet
      let walletType: 'main' | 'game' = 'main';
      if (balance >= amount) walletType = 'main';
      else if (gameBalance >= amount) walletType = 'game';
      else { toast.error("Insufficient balance"); return; }

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      setIsFlipping(true);
      playSound('flip');

      // 1. Deduct immediately (Optimistic)
      if (walletType === 'main') setBalance(prev => prev - amount);
      else setGameBalance(prev => prev - amount);

      try {
          // 2. Logic Result
          const resultIsHead = Math.random() < 0.5;
          const result = resultIsHead ? 'head' : 'tail';
          const isWin = choice === result;
          const payout = isWin ? amount * MULTIPLIER : 0;

          // 3. Animation Logic (Enhanced)
          // "Gol Gol" - We need lots of spins. 
          // 15 to 25 full rotations (multiply by 360)
          const spins = 20 + Math.floor(Math.random() * 10); 
          const baseRotation = spins * 360; 
          
          // Current rotation modulo 360 to find where we are visually
          const currentVis = coinRotation % 360;
          
          // Target visual angle: Head = 0, Tail = 180
          const targetVis = resultIsHead ? 0 : 180;
          
          // Calculate needed additional rotation to reach target smoothly
          let adjustment = targetVis - currentVis;
          // Ensure we always add positive rotation to keep spinning forward
          if (adjustment <= 0) adjustment += 360; 
          
          // Total new rotation
          const newRotation = coinRotation + baseRotation + adjustment;
          
          setCoinRotation(newRotation);

          // 4. DB Updates in background
          await createTransaction(session.user.id, 'game_bet', amount, `Coin Flip: ${choice.toUpperCase()}`);
          await updateWallet(session.user.id, amount, 'decrement', walletType === 'main' ? 'main_balance' : 'game_balance');

          // Wait for animation
          setTimeout(async () => {
              setIsFlipping(false);
              setHistory(prev => [result, ...prev].slice(0, 10));

              if (isWin) {
                  playSound('win');
                  toast.success(`You Won ${format(payout)}!`);
                  confetti({
                      particleCount: 150,
                      spread: 70,
                      origin: { y: 0.6 },
                      colors: ['#FFD700', '#C0C0C0', '#FACC15']
                  });
                  
                  // Payout
                  await updateWallet(session.user.id, payout, 'increment', 'game_balance');
                  await createTransaction(session.user.id, 'game_win', payout, `Coin Win: ${result.toUpperCase()}`);
                  setGameBalance(prev => prev + payout);
              }

              // Log History
              await supabase.from('game_history').insert({
                  user_id: session.user.id,
                  game_id: 'headtail',
                  game_name: 'Head & Tail',
                  bet: amount,
                  payout: payout,
                  profit: payout - amount,
                  details: `Choice: ${choice} | Result: ${result}`
              });

              fetchBalance(); // Sync
          }, FLIP_DURATION);

      } catch (e: any) {
          toast.error("Error: " + e.message);
          setIsFlipping(false);
          fetchBalance(); // Revert on error
      }
  };

  return (
    <div className="pb-32 pt-6 px-4 max-w-xl mx-auto min-h-screen relative overflow-hidden font-sans">
        
        {/* Header */}
        <div className="flex justify-between items-center mb-8 relative z-10">
           <div className="flex items-center gap-3">
               <Link to="/games" className="p-3 bg-white/5 rounded-2xl hover:bg-white/10 transition text-white border border-white/5">
                   <ArrowLeft size={20} />
               </Link>
               <h1 className="text-xl font-black text-white uppercase tracking-wider">Flip <span className="text-yellow-500">Coin</span></h1>
           </div>
           <div className="flex gap-2">
               <button onClick={() => setSoundOn(!soundOn)} className="p-2 text-gray-500 hover:text-white transition bg-white/5 rounded-lg border border-white/5">
                   {soundOn ? <Volume2 size={20}/> : <VolumeX size={20}/>}
               </button>
           </div>
        </div>

        {/* Balance Cards */}
        <div className="grid grid-cols-2 gap-3 mb-8 relative z-10">
            <GlassCard className="!p-3 !rounded-2xl flex flex-col justify-center border-yellow-500/20 bg-yellow-900/10">
                <p className="text-[9px] text-yellow-200/70 font-bold uppercase tracking-widest mb-1">Main Wallet</p>
                <p className="text-white font-mono font-bold text-sm"><BalanceDisplay amount={balance} /></p>
            </GlassCard>
            <GlassCard className="!p-3 !rounded-2xl flex flex-col justify-center border-purple-500/20 bg-purple-900/10">
                <p className="text-[9px] text-purple-200/70 font-bold uppercase tracking-widest mb-1">Winnings</p>
                <p className="text-white font-mono font-bold text-sm"><BalanceDisplay amount={gameBalance} /></p>
            </GlassCard>
        </div>

        {/* --- 3D COIN STAGE --- */}
        <div className="h-80 w-full flex items-center justify-center perspective-1000 mb-8 relative z-10">
            <motion.div
                animate={isFlipping ? { 
                    y: [0, -220, 0], // Higher Toss
                    scale: [1, 1.5, 1], // Zoom Effect
                    rotateX: [0, 360, 0], // Tumble effect (3D rotation)
                    rotateZ: [0, 15, -15, 0] // Subtle wobble
                } : { 
                    y: 0, 
                    scale: 1,
                    rotateX: 0,
                    rotateZ: 0
                }}
                transition={{ 
                    duration: FLIP_DURATION / 1000, 
                    ease: [0.4, 0, 0.2, 1], // Custom bezier for gravity feel
                    times: [0, 0.5, 1]
                }}
                className="relative preserve-3d"
            >
                <div 
                    className={`coin relative w-48 h-48 transform-style-3d transition-transform ${isFlipping ? 'blur-[1px]' : ''}`}
                    style={{ 
                        transform: `rotateY(${coinRotation}deg)`,
                        transitionDuration: `${FLIP_DURATION}ms`,
                        transitionTimingFunction: 'cubic-bezier(0.2, 0.8, 0.2, 1)' // Fast start, very slow stop
                    }}
                >
                    {/* HEAD FACE */}
                    <div className="absolute inset-0 backface-hidden rounded-full border-[6px] border-[#FCD34D] bg-gradient-to-br from-[#F59E0B] via-[#FBBF24] to-[#D97706] shadow-[inset_0_0_20px_rgba(0,0,0,0.3)] flex items-center justify-center overflow-hidden">
                        {/* Metallic Shine */}
                        <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/40 to-transparent opacity-50"></div>
                        <div className="absolute inset-3 border-2 border-[#FEF3C7]/50 rounded-full border-dashed opacity-70"></div>
                        
                        <div className="relative z-10 flex flex-col items-center drop-shadow-md">
                            <Crown size={72} className="text-[#FFFBEB] fill-[#FFFBEB]/20 stroke-[1.5]" />
                            <span className="text-[12px] font-black text-[#78350F] uppercase tracking-[0.3em] mt-2">HEAD</span>
                        </div>
                    </div>

                    {/* TAIL FACE (Rotated 180) */}
                    <div className="absolute inset-0 backface-hidden rounded-full border-[6px] border-[#94A3B8] bg-gradient-to-br from-[#475569] via-[#64748B] to-[#334155] shadow-[inset_0_0_20px_rgba(0,0,0,0.5)] flex items-center justify-center overflow-hidden" style={{ transform: 'rotateY(180deg)' }}>
                        {/* Metallic Shine */}
                        <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/30 to-transparent opacity-40"></div>
                        <div className="absolute inset-3 border-2 border-white/30 rounded-full border-dashed opacity-50"></div>
                        
                        <div className="relative z-10 flex flex-col items-center drop-shadow-md">
                            <Swords size={72} className="text-[#F1F5F9] fill-[#F1F5F9]/10 stroke-[1.5]" />
                            <span className="text-[12px] font-black text-[#E2E8F0] uppercase tracking-[0.3em] mt-2">TAIL</span>
                        </div>
                    </div>
                    
                    {/* 3D Thickness (Pseudo-elements simulation) */}
                    <div className="absolute inset-0 rounded-full border-[8px] border-[#B45309] translate-z-[-4px] opacity-50"></div>
                    <div className="absolute inset-0 rounded-full border-[8px] border-[#B45309] translate-z-[-8px] opacity-30"></div>
                </div>
            </motion.div>
            
            {/* Dynamic Shadow */}
            <motion.div 
                animate={isFlipping ? { scale: [1, 0.2, 1], opacity: [0.5, 0.1, 0.5] } : { scale: 1, opacity: 0.5 }}
                transition={{ duration: FLIP_DURATION / 1000, ease: "easeInOut" }}
                className="absolute bottom-[-60px] w-32 h-6 bg-black/60 blur-xl rounded-[100%]"
            ></motion.div>
        </div>

        {/* History Bar */}
        <div className="flex justify-center gap-2 mb-6 h-8">
            <AnimatePresence>
                {history.map((res, idx) => (
                    <motion.div 
                        key={idx}
                        initial={{ scale: 0, opacity: 0, x: -20 }}
                        animate={{ scale: 1, opacity: 1, x: 0 }}
                        className={`w-8 h-8 rounded-full flex items-center justify-center border-2 shadow-lg text-[10px] font-black ${res === 'head' ? 'bg-yellow-500 border-yellow-300 text-yellow-900' : 'bg-slate-500 border-slate-300 text-slate-900'}`}
                    >
                        {res === 'head' ? 'H' : 'T'}
                    </motion.div>
                ))}
            </AnimatePresence>
        </div>

        {/* --- CONTROLS --- */}
        <GlassCard className="p-5 border-white/10 bg-[#151515]">
            
            {/* Selection Switch */}
            <div className="flex bg-black/40 p-1.5 rounded-xl mb-6 border border-white/5 relative h-14">
                <motion.div 
                    className={`absolute top-1.5 bottom-1.5 w-[calc(50%-6px)] rounded-lg shadow-lg ${choice === 'head' ? 'left-1.5 bg-yellow-500' : 'left-[calc(50%+4px)] bg-slate-500'}`}
                    layoutId="selector"
                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                />
                <button 
                    onClick={() => setChoice('head')} 
                    disabled={isFlipping}
                    className={`flex-1 relative z-10 font-black uppercase text-xs sm:text-sm flex items-center justify-center gap-2 transition-colors ${choice === 'head' ? 'text-black' : 'text-gray-500'}`}
                >
                    <Crown size={18} fill={choice === 'head' ? "black" : "none"}/> HEAD (x1.9)
                </button>
                <button 
                    onClick={() => setChoice('tail')} 
                    disabled={isFlipping}
                    className={`flex-1 relative z-10 font-black uppercase text-xs sm:text-sm flex items-center justify-center gap-2 transition-colors ${choice === 'tail' ? 'text-white' : 'text-gray-500'}`}
                >
                    <Swords size={18} fill={choice === 'tail' ? "white" : "none"}/> TAIL (x1.9)
                </button>
            </div>

            {/* Bet Input */}
            <div className="flex items-center gap-3 mb-4">
                <div className="flex-1 relative group">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 font-bold group-focus-within:text-yellow-500 transition">{symbol}</span>
                    <input 
                        type="number" 
                        value={betAmount} 
                        onChange={e => setBetAmount(e.target.value)}
                        disabled={isFlipping}
                        className="w-full bg-black/40 border border-white/10 rounded-xl py-4 pl-8 pr-4 text-white font-mono font-bold text-xl focus:border-yellow-500 outline-none transition-all placeholder:text-gray-700"
                        placeholder="0.00"
                    />
                </div>
                <button onClick={() => setBetAmount((balance).toFixed(0))} className="px-5 py-4 bg-white/5 rounded-xl text-xs font-bold hover:bg-white/10 text-yellow-500 border border-white/5">MAX</button>
            </div>

            <div className="grid grid-cols-4 gap-2 mb-6">
                {[10, 50, 100, 500].map(amt => (
                    <button 
                        key={amt} 
                        onClick={() => setBetAmount(amt.toString())}
                        disabled={isFlipping}
                        className="py-2.5 bg-white/5 rounded-lg text-xs font-bold text-gray-400 hover:text-white hover:bg-white/10 transition border border-white/5 hover:border-white/20 active:scale-95"
                    >
                        {amt}
                    </button>
                ))}
            </div>

            {/* Play Button */}
            <button 
                onClick={handleFlip} 
                disabled={isFlipping}
                className={`w-full py-4 rounded-xl font-black text-lg uppercase tracking-wider shadow-lg transition-all flex items-center justify-center gap-3 active:scale-[0.98] ${
                    isFlipping 
                    ? 'bg-gray-800 text-gray-500 cursor-not-allowed border border-white/5' 
                    : choice === 'head' 
                        ? 'bg-yellow-500 text-black hover:bg-yellow-400 shadow-yellow-500/20'
                        : 'bg-slate-500 text-white hover:bg-slate-400 shadow-slate-500/20'
                }`}
            >
                {isFlipping ? <><RefreshCw size={20} className="animate-spin"/> FLIPPING...</> : 'FLIP COIN'}
            </button>

        </GlassCard>

        {/* Styles for 3D */}
        <style>{`
            .perspective-1000 { perspective: 1000px; }
            .transform-style-3d { transform-style: preserve-3d; }
            .backface-hidden { backface-visibility: hidden; }
            .preserve-3d { transform-style: preserve-3d; }
            .translate-z-[-4px] { transform: translateZ(-4px); }
            .translate-z-[-8px] { transform: translateZ(-8px); }
        `}</style>
    </div>
  );
};

export default HeadTail;
