
import React, { useState, useEffect, useRef } from 'react';
import GlassCard from '../components/GlassCard';
import { ArrowLeft, Volume2, VolumeX, Coins, Zap, RefreshCw, Wallet } from 'lucide-react';
import { Link } from 'react-router-dom';
import { supabase } from '../integrations/supabase/client';
import { createTransaction } from '../lib/actions';
import { getPlayableBalance, deductGameBalance, determineOutcome } from '../lib/gameMath';
import { updateWallet } from '../lib/actions';
import { useUI } from '../context/UIContext';
import BalanceDisplay from '../components/BalanceDisplay';
import { useCurrency } from '../context/CurrencyContext';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';

const HeadTail: React.FC = () => {
  const { toast } = useUI();
  const { symbol, format } = useCurrency();
  
  const [totalBalance, setTotalBalance] = useState(0);
  const [betAmount, setBetAmount] = useState<string>('10');
  const [choice, setChoice] = useState<'head' | 'tail'>('head');
  const [isFlipping, setIsFlipping] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [history, setHistory] = useState<('head' | 'tail')[]>([]);
  const [soundOn, setSoundOn] = useState(true);

  const flipSound = useRef(new Audio('https://assets.mixkit.co/active_storage/sfx/2003/2003-preview.mp3'));
  const winSound = useRef(new Audio('https://assets.mixkit.co/active_storage/sfx/1435/1435-preview.mp3'));
  
  useEffect(() => {
      flipSound.current.volume = 0.6; 
      winSound.current.volume = 0.8;
      fetchBalance();
  }, []);

  const MULTIPLIER = 1.90;
  const FLIP_DURATION = 2000;

  const fetchBalance = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if(session) {
          const bal = await getPlayableBalance(session.user.id);
          setTotalBalance(bal);
      }
  };

  const vibrate = (pattern: number[]) => {
      if (navigator.vibrate) navigator.vibrate(pattern);
  };

  const handleQuickAmount = (action: 'min' | 'half' | 'double' | 'max') => {
      const current = parseFloat(betAmount) || 0;
      let next = current;
      if (action === 'min') next = 10;
      if (action === 'half') next = Math.max(10, current / 2);
      if (action === 'double') next = current * 2;
      if (action === 'max') next = totalBalance;
      setBetAmount(next.toFixed(2));
  };

  const handleFlip = async () => {
      const amount = parseFloat(betAmount);
      if (isNaN(amount) || amount <= 0) { toast.error("Invalid amount"); return; }
      if (amount > totalBalance) { toast.error("Insufficient balance"); return; }

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      setIsFlipping(true);
      if (soundOn) {
          flipSound.current.currentTime = 0;
          flipSound.current.play().catch(() => {});
      }
      vibrate([50]);

      // Deduct
      try {
          await deductGameBalance(session.user.id, amount);
          setTotalBalance(prev => prev - amount);
          
          await createTransaction(session.user.id, 'game_bet', amount, `Coin Bet: ${choice.toUpperCase()}`);
      } catch (e: any) {
          toast.error(e.message);
          setIsFlipping(false);
          return;
      }

      try {
          // Rigging Logic
          const outcome = await determineOutcome(session.user.id, 0.50);

          let result: 'head' | 'tail';
          if (outcome === 'win') {
              result = choice; 
          } else {
              result = choice === 'head' ? 'tail' : 'head'; 
          }

          const isWin = choice === result;
          const payout = isWin ? amount * MULTIPLIER : 0;

          // Animation
          const currentRotation = rotation;
          const spins = 1800; 
          const targetAngle = result === 'head' ? 0 : 180;
          const remainder = currentRotation % 360;
          const adjustment = targetAngle - remainder + 360; 
          const newRotation = currentRotation + spins + adjustment;
          setRotation(newRotation);

          setTimeout(async () => {
              setIsFlipping(false);
              setHistory(prev => [result, ...prev].slice(0, 10));

              if (isWin) {
                  if (soundOn) winSound.current.play().catch(() => {});
                  vibrate([100, 50, 100]); 
                  
                  toast.success(`You Won ${format(payout)}!`);
                  confetti({
                      particleCount: 100,
                      spread: 60,
                      origin: { y: 0.6 },
                      colors: ['#FFD700', '#F43F5E']
                  });
                  
                  await updateWallet(session.user.id, payout, 'increment', 'game_balance');
                  await createTransaction(session.user.id, 'game_win', payout, `Coin Win`);
                  setTotalBalance(prev => prev + payout);
              } else {
                  vibrate([200]);
              }

              await supabase.from('game_history').insert({
                  user_id: session.user.id,
                  game_id: 'headtail',
                  game_name: 'Head & Tail',
                  bet: amount,
                  payout: payout,
                  profit: payout - amount,
                  details: `Choice: ${choice} | Result: ${result}`
              });

              fetchBalance();
          }, FLIP_DURATION);

      } catch (e: any) {
          toast.error("Error: " + e.message);
          setIsFlipping(false);
          fetchBalance(); 
      }
  };

  return (
    <div className="pb-32 pt-4 px-4 max-w-lg mx-auto min-h-screen relative font-sans flex flex-col">
        
        <div className="flex justify-between items-center mb-4 z-10">
           <div className="flex items-center gap-3">
               <Link to="/games" className="p-2 bg-white/5 rounded-xl hover:bg-white/10 transition text-white border border-white/10">
                   <ArrowLeft size={20} />
               </Link>
               <h1 className="text-lg font-black text-white uppercase tracking-wider">Coin Flip</h1>
           </div>
           <div className="flex items-center gap-2 bg-black/40 px-4 py-2 rounded-full border border-yellow-500/30 shadow-[0_0_15px_rgba(234,179,8,0.1)]">
                <Wallet size={16} className="text-yellow-500" />
                <span className="text-lg font-black text-yellow-400 tracking-wide"><BalanceDisplay amount={totalBalance}/></span>
            </div>
           <button onClick={() => setSoundOn(!soundOn)} className="p-2 text-gray-400 hover:text-white transition bg-white/5 rounded-xl border border-white/10">
               {soundOn ? <Volume2 size={20}/> : <VolumeX size={20}/>}
           </button>
        </div>

        {/* History Bar */}
        <div className="flex justify-center gap-2 mb-4 h-8 z-10">
            <AnimatePresence>
                {history.map((res, idx) => (
                    <motion.div 
                        key={`${idx}-${res}`}
                        initial={{ scale: 0, x: -10 }}
                        animate={{ scale: 1, x: 0 }}
                        className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold border ${res === 'head' ? 'bg-yellow-500 border-yellow-300 text-black' : 'bg-slate-500 border-slate-300 text-white'}`}
                    >
                        {res === 'head' ? 'H' : 'T'}
                    </motion.div>
                ))}
            </AnimatePresence>
        </div>

        <div className="flex-1 flex flex-col items-center justify-center relative z-10 min-h-[300px]">
            <div className="relative perspective-1000">
                <motion.div
                    animate={isFlipping ? { 
                        y: [0, -200, 0], 
                        scale: [1, 1.3, 1],
                    } : { y: 0, scale: 1 }}
                    transition={{ duration: FLIP_DURATION / 1000, ease: "easeInOut" }}
                    className="relative preserve-3d w-48 h-48"
                    style={{ 
                        transform: `rotateY(${rotation}deg)`,
                        transition: isFlipping ? `transform ${FLIP_DURATION}ms cubic-bezier(0.45, 0, 0.55, 1)` : 'none'
                    }}
                >
                    <div className="absolute inset-0 backface-hidden rounded-full bg-gradient-to-br from-yellow-400 via-yellow-600 to-yellow-800 border-4 border-yellow-300 shadow-xl flex items-center justify-center">
                        <div className="absolute inset-2 border-2 border-yellow-200/50 rounded-full border-dashed opacity-50"></div>
                        <Coins size={80} className="text-yellow-100 drop-shadow-md" strokeWidth={1.5} />
                    </div>

                    <div className="absolute inset-0 backface-hidden rounded-full bg-gradient-to-br from-slate-400 via-slate-600 to-slate-800 border-4 border-slate-300 shadow-xl flex items-center justify-center" style={{ transform: 'rotateY(180deg)' }}>
                         <div className="absolute inset-2 border-2 border-slate-200/50 rounded-full border-dashed opacity-50"></div>
                        <Zap size={80} className="text-slate-100 drop-shadow-md" strokeWidth={1.5} />
                    </div>

                    <div className="absolute inset-0 rounded-full border-[8px] border-[#854d0e] -z-10 translate-z-[-5px]"></div>
                </motion.div>
                
                <motion.div 
                    animate={isFlipping ? { scale: [1, 0.5, 1], opacity: [0.5, 0.2, 0.5] } : { scale: 1, opacity: 0.5 }}
                    transition={{ duration: FLIP_DURATION / 1000 }}
                    className="absolute -bottom-16 left-1/2 -translate-x-1/2 w-32 h-4 bg-black/60 blur-xl rounded-full"
                />
            </div>
            
            <div className="mt-12 text-center">
                 <p className="text-gray-500 text-xs font-bold uppercase tracking-widest mb-1">Potential Win</p>
                 <p className={`text-2xl font-black ${isFlipping ? 'text-white animate-pulse' : 'text-green-400'}`}>
                     {format(parseFloat(betAmount) * MULTIPLIER)}
                 </p>
            </div>
        </div>

        <GlassCard className="p-4 bg-[#151515] border-t border-white/10 rounded-t-3xl rounded-b-none -mx-4 pb-10">
            <div className="flex bg-black/40 p-1.5 rounded-xl mb-4 border border-white/5 relative h-12">
                <motion.div 
                    className={`absolute top-1.5 bottom-1.5 w-[calc(50%-6px)] rounded-lg shadow-lg ${choice === 'head' ? 'left-1.5 bg-yellow-500' : 'left-[calc(50%+4px)] bg-slate-500'}`}
                    layoutId="selector"
                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                />
                <button 
                    onClick={() => setChoice('head')} 
                    disabled={isFlipping}
                    className={`flex-1 relative z-10 font-bold uppercase text-xs flex items-center justify-center gap-2 ${choice === 'head' ? 'text-black' : 'text-gray-500'}`}
                >
                    HEADS
                </button>
                <button 
                    onClick={() => setChoice('tail')} 
                    disabled={isFlipping}
                    className={`flex-1 relative z-10 font-bold uppercase text-xs flex items-center justify-center gap-2 ${choice === 'tail' ? 'text-white' : 'text-gray-500'}`}
                >
                    TAILS
                </button>
            </div>

            <div className="flex items-center gap-3 mb-4">
                <div className="bg-black/40 border border-white/10 rounded-xl px-4 py-2 flex-1 flex flex-col justify-center">
                     <p className="text-[9px] text-gray-500 font-bold uppercase">Bet Amount</p>
                     <div className="flex items-center gap-1">
                         <span className="text-gray-400 font-bold text-sm">{symbol}</span>
                         <input 
                            type="number" 
                            value={betAmount} 
                            onChange={e => setBetAmount(e.target.value)}
                            disabled={isFlipping}
                            className="bg-transparent text-white font-mono font-bold text-lg w-full outline-none"
                         />
                     </div>
                </div>
                <button 
                    onClick={handleFlip}
                    disabled={isFlipping}
                    className={`h-14 px-8 rounded-xl font-black uppercase text-sm shadow-lg flex items-center gap-2 transition active:scale-95 ${isFlipping ? 'bg-gray-700 text-gray-500 cursor-not-allowed' : 'bg-green-500 text-black hover:bg-green-400'}`}
                >
                    {isFlipping ? <RefreshCw className="animate-spin" /> : 'FLIP IT'}
                </button>
            </div>

            <div className="grid grid-cols-4 gap-2">
                {['min', 'half', 'double', 'max'].map((action) => (
                    <button 
                        key={action}
                        onClick={() => handleQuickAmount(action as any)}
                        disabled={isFlipping}
                        className="py-2 bg-white/5 rounded-lg text-[10px] font-bold text-gray-400 hover:text-white hover:bg-white/10 border border-white/5 uppercase"
                    >
                        {action}
                    </button>
                ))}
            </div>

        </GlassCard>

        <style>{`
            .perspective-1000 { perspective: 1000px; }
            .preserve-3d { transform-style: preserve-3d; }
            .backface-hidden { backface-visibility: hidden; }
            .translate-z-[-5px] { transform: translateZ(-5px); }
        `}</style>
    </div>
  );
};

export default HeadTail;
