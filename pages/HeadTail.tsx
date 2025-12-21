
import React, { useState, useEffect, useRef } from 'react';
import GlassCard from '../components/GlassCard';
import { ArrowLeft, Volume2, VolumeX, Coins, Zap, RefreshCw, Wallet, Trophy, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';
import { supabase } from '../integrations/supabase/client';
import { updateWallet, createTransaction } from '../lib/actions';
import { getPlayableBalance, deductGameBalance, determineOutcome } from '../lib/gameMath';
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

  const flipSound = useRef(new window.Audio('https://assets.mixkit.co/active_storage/sfx/2003/2003-preview.mp3'));
  const winSound = useRef(new window.Audio('https://assets.mixkit.co/active_storage/sfx/1435/1435-preview.mp3'));
  const loseSound = useRef(new window.Audio('https://assets.mixkit.co/active_storage/sfx/2572/2572-preview.mp3'));
  
  useEffect(() => {
      flipSound.current.volume = 0.6; 
      winSound.current.volume = 0.8;
      loseSound.current.volume = 0.6;
      fetchBalance();
  }, []);

  const MULTIPLIER = 1.95;
  const FLIP_DURATION = 2.2; 

  const fetchBalance = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if(session) setTotalBalance(await getPlayableBalance(session.user.id));
  };

  const handleQuickAmount = (action: string) => {
      if (isFlipping) return;
      const current = parseFloat(betAmount) || 0;
      let next = current;
      switch(action) {
          case 'min': next = 10; break;
          case 'half': next = Math.max(1, current / 2); break;
          case 'double': next = current * 2; break;
          case 'max': next = totalBalance; break;
          case 'plus10': next = current + 10; break;
          case 'plus50': next = current + 50; break;
      }
      setBetAmount(Math.round(next).toString());
  };

  const handleFlip = async () => {
      const amount = parseFloat(betAmount);
      if (isNaN(amount) || amount < 1) { toast.error("Minimum bet is 1 BDT"); return; }
      if (amount > totalBalance) { toast.error("Insufficient balance"); return; }
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      setIsFlipping(true);
      if (soundOn) {
          flipSound.current.currentTime = 0;
          flipSound.current.play().catch(() => {});
      }

      try {
          await deductGameBalance(session.user.id, amount, 'Head & Tail');
          setTotalBalance(prev => prev - amount);
          await createTransaction(session.user.id, 'game_bet', amount, `Coin Bet: ${choice.toUpperCase()}`);
          const outcome = await determineOutcome(session.user.id, 0.48, amount);
          const result: 'head' | 'tail' = outcome === 'win' ? choice : (choice === 'head' ? 'tail' : 'head');
          const isWin = choice === result;
          const payout = isWin ? amount * MULTIPLIER : 0;
          const spins = 1800 + Math.floor(Math.random() * 720);
          const targetAngle = result === 'head' ? 0 : 180;
          const nextRotation = rotation + spins + (targetAngle - (rotation + spins) % 360);
          setRotation(nextRotation);

          setTimeout(async () => {
              setIsFlipping(false);
              setHistory(prev => [result, ...prev].slice(0, 10));

              if (isWin) {
                  if (soundOn) winSound.current.play().catch(() => {});
                  toast.success(`VICTORY: Won ${format(payout)}!`);
                  confetti({ particleCount: 80, spread: 50, origin: { y: 0.7 }, colors: ['#FFD60A', '#FFFFFF'] });
                  await updateWallet(session.user.id, payout, 'increment', 'game_balance');
                  await createTransaction(session.user.id, 'game_win', payout, `Coin Win`);
                  setTotalBalance(prev => prev + payout);
              } else {
                  if (soundOn) loseSound.current.play().catch(() => {});
                  toast.info(`Landed on ${result.toUpperCase()}. Better luck next time.`);
              }
              await supabase.from('game_history').insert({ user_id: session.user.id, game_id: 'headtail', game_name: 'Head & Tail', bet: amount, payout: payout, profit: payout - amount, details: `Choice: ${choice} | Result: ${result}` });
              fetchBalance();
          }, FLIP_DURATION * 1000);
      } catch (e: any) {
          toast.error(e.message);
          setIsFlipping(false);
          fetchBalance();
      }
  };

  return (
    <div className="pb-32 pt-4 px-4 max-w-lg mx-auto min-h-screen relative flex flex-col bg-void overflow-hidden selection:bg-brand selection:text-black">
        <div className="flex justify-between items-center mb-8 z-10">
           <div className="flex items-center gap-3">
               <Link to="/games" className="p-2.5 bg-panel rounded-2xl border border-white/5 text-white hover:bg-white/10 transition active:scale-90">
                   <ArrowLeft size={20} />
               </Link>
               <div>
                  <h1 className="text-xl font-black text-white uppercase tracking-tighter leading-none">Luxury <span className="text-brand">Coin</span></h1>
                  <div className="flex items-center gap-1.5 mt-1">
                      <div className="w-1.5 h-1.5 rounded-full bg-success animate-pulse shadow-glow"></div>
                      <span className="text-[8px] text-muted font-black uppercase tracking-widest">3D Physics</span>
                  </div>
               </div>
           </div>
           <div className="flex items-center gap-2">
                <button onClick={() => setSoundOn(!soundOn)} className="p-2.5 bg-white/5 rounded-2xl text-gray-400 hover:text-white transition border border-white/5">
                   {soundOn ? <Volume2 size={18}/> : <VolumeX size={18}/>}
                </button>
                <div className="flex items-center gap-2 bg-panel px-4 py-2.5 rounded-2xl border border-brand/20 shadow-glow">
                    <Wallet size={16} className="text-brand" />
                    <span className="text-lg font-black text-brand tracking-tighter font-mono leading-none"><BalanceDisplay amount={totalBalance}/></span>
                </div>
            </div>
        </div>

        <div className="flex justify-center gap-2 mb-10 h-8 z-10 overflow-x-auto no-scrollbar">
            <AnimatePresence>
                {history.map((res, idx) => (
                    <motion.div key={`${idx}-${res}`} initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-black border-2 transition-all ${res === 'head' ? 'bg-brand/20 border-brand text-brand' : 'bg-white/5 border-white/20 text-gray-500'}`}>{res === 'head' ? 'H' : 'T'}</motion.div>
                ))}
            </AnimatePresence>
        </div>

        <div className="flex-1 flex flex-col items-center justify-center relative z-10 min-h-[300px]">
            <div className="relative perspective-1000">
                <motion.div animate={isFlipping ? { y: [0, -300, 0], scale: [1, 1.3, 1], rotateY: rotation, } : { y: 0, scale: 1, rotateY: rotation }} transition={{ duration: FLIP_DURATION, ease: [0.22, 1, 0.36, 1] }} className="relative preserve-3d w-52 h-52">
                    <div className="absolute inset-0 backface-hidden rounded-full bg-gradient-to-br from-[#FFD60A] via-[#FFBE0B] to-[#B45309] border-[6px] border-[#FFD60A] shadow-2xl flex items-center justify-center overflow-hidden">
                        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-20"></div>
                        <div className="relative flex flex-col items-center">
                            <div className="w-24 h-24 rounded-full border-4 border-black/10 flex items-center justify-center bg-white/10 backdrop-blur-sm">
                                <Coins size={60} className="text-black/60" strokeWidth={2.5} />
                            </div>
                            <span className="mt-2 text-black/60 font-black text-xs tracking-widest uppercase">Heads</span>
                        </div>
                    </div>
                    <div className="absolute inset-0 backface-hidden rounded-full bg-gradient-to-br from-[#FFD60A] via-[#FFBE0B] to-[#B45309] border-[6px] border-[#FFD60A] shadow-2xl flex items-center justify-center overflow-hidden" style={{ transform: 'rotateY(180deg)' }}>
                         <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-20"></div>
                         <div className="relative flex flex-col items-center">
                            <div className="w-24 h-24 rounded-full border-4 border-black/10 flex items-center justify-center bg-white/10 backdrop-blur-sm">
                                <Zap size={60} className="text-black/60" fill="currentColor" />
                            </div>
                            <span className="mt-2 text-black/60 font-black text-xs tracking-widest uppercase">Tails</span>
                        </div>
                    </div>
                </motion.div>
                <motion.div animate={isFlipping ? { scale: [1, 0.3, 1], opacity: [0.3, 0.05, 0.3], filter: ['blur(15px)', 'blur(25px)', 'blur(15px)'] } : { scale: 1, opacity: 0.3, filter: 'blur(15px)' }} transition={{ duration: FLIP_DURATION, ease: "easeInOut" }} className="absolute -bottom-24 left-1/2 -translate-x-1/2 w-40 h-8 bg-black rounded-full" />
            </div>
            <div className="mt-24 text-center">
                 <p className={`text-4xl font-black font-mono leading-none transition-all duration-500 ${isFlipping ? 'text-white/20 blur-sm' : 'text-success drop-shadow-[0_0_15px_rgba(16,185,129,0.3)]'}`}>{format(parseFloat(betAmount) * MULTIPLIER)}</p>
            </div>
        </div>

        <GlassCard className="p-6 bg-panel border-t border-white/10 rounded-t-[3.5rem] rounded-b-none -mx-4 pb-12 shadow-2xl relative">
            <div className="flex bg-void p-1.5 rounded-2xl mb-6 border border-border-base relative h-14">
                <motion.div className={`absolute top-1.5 bottom-1.5 w-[calc(50%-6px)] rounded-xl shadow-lg ${choice === 'head' ? 'left-1.5 bg-brand' : 'left-[calc(50%+4px)] bg-brand'}`} layoutId="sideSelector" transition={{ type: "spring", stiffness: 400, damping: 35 }} />
                <button onClick={() => setChoice('head')} disabled={isFlipping} className={`flex-1 relative z-10 font-black uppercase text-xs tracking-widest flex items-center justify-center gap-2 transition-colors ${choice === 'head' ? 'text-black' : 'text-gray-500'}`}>HEADS</button>
                <button onClick={() => setChoice('tail')} disabled={isFlipping} className={`flex-1 relative z-10 font-black uppercase text-xs tracking-widest flex items-center justify-center gap-2 transition-colors ${choice === 'tail' ? 'text-black' : 'text-gray-500'}`}>TAILS</button>
            </div>

            <div className="flex items-stretch gap-4 mb-6">
                <div className="bg-void border border-border-base rounded-[2rem] px-6 py-4 flex-1 flex flex-col justify-center transition-all focus-within:border-brand/40 group">
                     <p className="text-[10px] text-muted font-black uppercase tracking-widest mb-1 group-focus-within:text-brand">STAKE AMOUNT</p>
                     <div className="flex items-center gap-2">
                         <span className="text-brand font-black text-2xl">{symbol}</span>
                         <input type="number" value={betAmount} onChange={e => setBetAmount(e.target.value)} disabled={isFlipping} className="bg-transparent text-white font-mono font-black text-3xl w-full outline-none placeholder-gray-800" placeholder="0" />
                     </div>
                </div>
                <button onClick={handleFlip} disabled={isFlipping} className={`px-10 rounded-[2rem] font-black uppercase text-base shadow-2xl flex items-center justify-center gap-3 transition-all active:scale-95 ${isFlipping ? 'bg-gray-700 text-gray-500 cursor-not-allowed opacity-80' : 'bg-brand text-black hover:bg-white shadow-yellow-pop'}`}>
                    {isFlipping ? <RefreshCw className="animate-spin" size={24} /> : 'FLIP'}
                </button>
            </div>
            <div className="grid grid-cols-3 gap-3">
                {['min', 'half', 'double', 'max', 'plus10', 'plus50'].map((action) => (
                    <button key={action} onClick={() => handleQuickAmount(action)} disabled={isFlipping} className="py-3 bg-void rounded-2xl text-[10px] font-black text-gray-400 hover:text-white transition-all border border-border-base uppercase tracking-widest">{action === 'plus10' ? '+10' : action === 'plus50' ? '+50' : action}</button>
                ))}
            </div>
        </GlassCard>
        <style>{`
            .perspective-1000 { perspective: 1500px; }
            .preserve-3d { transform-style: preserve-3d; }
            .backface-hidden { backface-visibility: hidden; -webkit-backface-visibility: hidden; }
            .shadow-glow { box-shadow: 0 0 25px rgba(250, 190, 11, 0.15); }
            .shadow-yellow-pop { box-shadow: 0 10px 40px -10px rgba(250, 190, 11, 0.5); }
            .no-scrollbar::-webkit-scrollbar { display: none; }
        `}</style>
    </div>
  );
};

export default HeadTail;
