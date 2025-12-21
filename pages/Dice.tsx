
import React, { useState, useEffect, useRef } from 'react';
import GlassCard from '../components/GlassCard';
import { ArrowLeft, RefreshCw, Wallet, Sparkles, Maximize2, Minimize2, Volume2, VolumeX } from 'lucide-react';
import { Link } from 'react-router-dom';
import { supabase } from '../integrations/supabase/client';
import { processGameRound, determineOutcome, getPlayableBalance } from '../lib/gameMath';
import { useUI } from '../context/UIContext';
import BalanceDisplay from '../components/BalanceDisplay';
import { useCurrency } from '../context/CurrencyContext';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';
import { toggleFullscreen } from '../lib/fullscreen';
import FullscreenPrompt from '../components/FullscreenPrompt';

type BetType = 'low' | 'seven' | 'high';

const Dice: React.FC = () => {
  const { toast } = useUI();
  const { symbol, format } = useCurrency();
  const [balance, setBalance] = useState(0);
  const [betAmount, setBetAmount] = useState<string>('10');
  const [selectedBet, setSelectedBet] = useState<BetType>('high');
  const [isRolling, setIsRolling] = useState(false);
  const [diceResult, setDiceResult] = useState<[number, number]>([3, 4]); 
  const [displayTotal, setDisplayTotal] = useState<number>(7);
  const [history, setHistory] = useState<number[]>([]);
  const [soundOn, setSoundOn] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const rollSfx = useRef(new window.Audio('https://assets.mixkit.co/active_storage/sfx/2003/2003-preview.mp3'));
  const winSfx = useRef(new window.Audio('https://assets.mixkit.co/active_storage/sfx/2019/2019-preview.mp3'));
  const loseSfx = useRef(new window.Audio('https://assets.mixkit.co/active_storage/sfx/2572/2572-preview.mp3'));

  useEffect(() => {
      rollSfx.current.volume = 0.5;
      winSfx.current.volume = 0.8;
      loseSfx.current.volume = 0.6;
      fetchBalance();
      const handleFsChange = () => setIsFullscreen(!!document.fullscreenElement);
      document.addEventListener('fullscreenchange', handleFsChange);
      return () => document.removeEventListener('fullscreenchange', handleFsChange);
  }, []);

  const handleFullscreen = () => toggleFullscreen();

  const fetchBalance = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if(session) setBalance(await getPlayableBalance(session.user.id));
  };

  const handleQuickAmount = (val: string) => {
      if (isRolling) return;
      setBetAmount(val);
  };

  const playGame = async () => {
      const amount = parseFloat(betAmount);
      if (isNaN(amount) || amount < 1) { toast.error("Minimum bet 1 TK"); return; }
      if (amount > balance) { toast.error("Insufficient funds"); return; }

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const winChance = selectedBet === 'seven' ? 0.14 : 0.42;
      const outcome = await determineOutcome(session.user.id, winChance, amount);
      
      let d1 = 1, d2 = 1, total = 2;
      
      if (outcome === 'win') {
          while (true) {
              d1 = Math.floor(Math.random() * 6) + 1;
              d2 = Math.floor(Math.random() * 6) + 1;
              total = d1 + d2;
              if (selectedBet === 'low' && total < 7) break;
              if (selectedBet === 'seven' && total === 7) break;
              if (selectedBet === 'high' && total > 7) break;
          }
      } else {
          while (true) {
              d1 = Math.floor(Math.random() * 6) + 1;
              d2 = Math.floor(Math.random() * 6) + 1;
              total = d1 + d2;
              if (selectedBet === 'low' && total >= 7) break;
              if (selectedBet === 'seven' && total !== 7) break;
              if (selectedBet === 'high' && total <= 7) break;
          }
      }

      const multiplier = selectedBet === 'seven' ? 5.8 : 2.3;
      const winAmount = outcome === 'win' ? amount * multiplier : 0;

      setDiceResult([d1, d2]);
      setIsRolling(true);

      if(soundOn) {
          rollSfx.current.currentTime = 0;
          rollSfx.current.play().catch(()=>{});
      }

      try {
          await processGameRound(session.user.id, amount, winAmount, 'Lucky Dice');
          setTimeout(async () => {
              setIsRolling(false);
              setDisplayTotal(total);
              setHistory(prev => [total, ...prev].slice(0, 11));
              
              if (outcome === 'win') {
                  if (soundOn) winSfx.current.play().catch(()=>{});
                  confetti({ particleCount: 120, spread: 70, origin: { y: 0.7 }, colors: ['#FFBE0B', '#FFFFFF', '#3A86FF'] });
                  toast.success(`VICTORY! Result: ${total}. Won ${format(winAmount)}!`);
              } else {
                  if (soundOn) loseSfx.current.play().catch(()=>{});
                  toast.info(`Rolled ${total}. Better luck next time.`);
              }

              await supabase.from('game_history').insert({ user_id: session.user.id, game_id: 'dice', game_name: 'Lucky Dice', bet: amount, payout: winAmount, profit: winAmount - amount, details: `Bet: ${selectedBet} | Result: ${total}` });
              fetchBalance();
          }, 1200); 
      } catch (e: any) {
          toast.error(e.message);
          setIsRolling(false);
          fetchBalance();
      }
  };

  const getTransform = (val: number) => {
      switch(val) {
          case 1: return { x: 0, y: 0 };
          case 6: return { x: 0, y: 180 };
          case 2: return { x: 0, y: -90 };
          case 5: return { x: 0, y: 90 };
          case 3: return { x: -90, y: 0 };
          case 4: return { x: 90, y: 0 };
          default: return { x: 0, y: 0 };
      }
  };

  return (
    <div className="pb-32 pt-4 px-4 max-w-lg mx-auto min-h-screen relative font-sans flex flex-col bg-void overflow-hidden selection:bg-brand selection:text-black">
        <FullscreenPrompt />
        <div className="flex justify-between items-center mb-6 z-10 px-2">
            <div className="flex items-center gap-3">
                <Link to="/games" className="p-2.5 bg-panel rounded-2xl border border-white/5 text-white hover:bg-white/10 transition active:scale-90">
                    <ArrowLeft size={20}/>
                </Link>
                <div>
                    <h1 className="text-xl font-black text-white uppercase tracking-tighter leading-none">Lucky <span className="text-brand">Dice</span></h1>
                    <div className="flex items-center gap-1.5 mt-1">
                        <div className="w-1.5 h-1.5 rounded-full bg-success animate-pulse shadow-glow"></div>
                        <span className="text-[8px] text-muted font-black uppercase tracking-widest">Protocol Verified</span>
                    </div>
                </div>
            </div>
            <div className="flex items-center gap-2">
                <button onClick={handleFullscreen} className="p-2.5 bg-panel rounded-2xl border border-white/5 text-white hover:bg-white/10 transition active:scale-90">
                    {isFullscreen ? <Minimize2 size={20}/> : <Maximize2 size={20}/>}
                </button>
                <button onClick={() => setSoundOn(!soundOn)} className="p-2.5 bg-white/5 rounded-2xl text-gray-400 hover:text-white transition border border-white/5">
                   {soundOn ? <Volume2 size={20}/> : <VolumeX size={20}/>}
                </button>
                <div className="flex items-center gap-2 bg-panel px-4 py-2.5 rounded-2xl border border-brand/20 shadow-glow">
                    <Wallet size={16} className="text-brand" />
                    <span className="text-lg font-black text-brand tracking-tighter font-mono leading-none"><BalanceDisplay amount={balance}/></span>
                </div>
            </div>
        </div>

        <div className="flex justify-center gap-2 mb-8 h-10 z-10 overflow-x-auto no-scrollbar py-1">
            <AnimatePresence>
                {history.map((res, idx) => (
                    <motion.div key={`${idx}-${res}`} initial={{ scale: 0, opacity: 0, x: 20 }} animate={{ scale: 1, x: 0, opacity: 1 }} className={`w-9 h-9 shrink-0 rounded-xl flex items-center justify-center text-[12px] font-black border-2 transition-all shadow-sm ${res === 7 ? 'bg-brand border-white text-black' : res < 7 ? 'bg-white/10 border-white/5 text-gray-300' : 'bg-blue-600/20 border-blue-500/30 text-blue-400'}`}>{res}</motion.div>
                ))}
            </AnimatePresence>
        </div>

        <div className="flex-1 flex flex-col items-center justify-center relative z-10 py-6">
             <div className="flex justify-center gap-10 perspective-1000">
                 {[0, 1].map(i => {
                     const val = diceResult[i];
                     const tf = getTransform(val);
                     return (
                         <div key={i} className="relative">
                            <motion.div className="relative preserve-3d w-32 h-32" animate={isRolling ? { rotateX: [0, 720, 1440 + tf.x], rotateY: [0, 720, 1440 + tf.y], rotateZ: [0, 360, 0], y: [0, -120, 0] } : { rotateX: tf.x, rotateY: tf.y, rotateZ: 0, y: 0 }} transition={{ duration: 1.2, ease: [0.15, 0, 0, 1] }}>
                                {[1,2,3,4,5,6].map(face => ( <DiceFace key={face} value={face} /> ))}
                            </motion.div>
                            <motion.div animate={isRolling ? { scale: [1, 0.4, 1], opacity: [0.3, 0.1, 0.3] } : { scale: 1, opacity: 0.3 }} className="absolute -bottom-10 left-1/2 -translate-x-1/2 w-24 h-4 bg-black blur-xl rounded-full" />
                         </div>
                     )
                 })}
             </div>
             <div className="mt-20">
                <AnimatePresence mode="wait">
                    {!isRolling && (
                        <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-[#111] w-24 h-24 rounded-[2rem] border border-white/5 shadow-2xl flex items-center justify-center">
                            <span className="text-6xl font-black text-white leading-none">{displayTotal}</span>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>

        <div className="bg-[#0a0a0a] rounded-t-[3.5rem] p-6 pb-12 border-t border-white/5 -mx-4 shadow-[0_-20px_50px_rgba(0,0,0,0.5)]">
            <div className="flex bg-[#111] p-1.5 rounded-2xl mb-8 border border-white/5 relative h-20">
                <motion.div className={`absolute top-1.5 bottom-1.5 w-[calc(33.33%-6px)] rounded-xl shadow-lg ${selectedBet === 'low' ? 'left-1.5 bg-white/5 border border-white/10' : selectedBet === 'seven' ? 'left-[calc(33.33%+3px)] bg-white/5 border border-white/10' : 'left-[calc(66.66%+1.5px)] bg-blue-600'}`} layoutId="betSelector" />
                <button onClick={() => setSelectedBet('low')} disabled={isRolling} className={`flex-1 relative z-10 font-bold uppercase text-[11px] flex flex-col items-center justify-center leading-none tracking-widest ${selectedBet === 'low' ? 'text-white' : 'text-gray-500'}`}>
                    <span className="opacity-60">UNDER 7</span>
                    <span className="text-[12px] font-black mt-2">x2.30</span>
                </button>
                <button onClick={() => setSelectedBet('seven')} disabled={isRolling} className={`flex-1 relative z-10 font-bold uppercase text-[11px] flex flex-col items-center justify-center leading-none tracking-widest ${selectedBet === 'seven' ? 'text-white' : 'text-gray-500'}`}>
                    <span className="opacity-60">LUCKY 7</span>
                    <span className="text-[12px] font-black mt-2">x5.80</span>
                </button>
                <button onClick={() => setSelectedBet('high')} disabled={isRolling} className={`flex-1 relative z-10 font-bold uppercase text-[11px] flex flex-col items-center justify-center leading-none tracking-widest ${selectedBet === 'high' ? 'text-white' : 'text-gray-500'}`}>
                    <span className="opacity-60">OVER 7</span>
                    <span className="text-[12px] font-black mt-2">x2.30</span>
                </button>
            </div>

            <div className="flex items-stretch gap-4">
                <div className="bg-[#111] border border-white/5 rounded-[2rem] px-6 py-4 flex-1 flex flex-col justify-center focus-within:border-brand/30 transition-all group">
                     <p className="text-[9px] text-muted font-black uppercase tracking-widest mb-1 group-focus-within:text-brand">STAKE AMOUNT</p>
                     <div className="flex items-center gap-2">
                         <span className="text-brand font-black text-xl">{symbol}</span>
                         <input type="number" value={betAmount} onChange={e => setBetAmount(e.target.value)} disabled={isRolling} className="bg-transparent text-white font-mono font-black text-3xl w-full outline-none placeholder-gray-800" placeholder="0" />
                     </div>
                </div>
                <button onClick={playGame} disabled={isRolling} className={`px-12 rounded-[2rem] font-black uppercase text-lg shadow-2xl flex items-center justify-center gap-3 transition-all active:scale-95 ${isRolling ? 'bg-gray-800 text-gray-500 cursor-not-allowed' : 'bg-white text-black hover:bg-brand hover:text-white shadow-brand/20'}`}>
                    {isRolling ? <RefreshCw className="animate-spin" size={28} /> : <><Sparkles size={24} fill="currentColor" /> ROLL</>}
                </button>
            </div>
            <div className="grid grid-cols-4 gap-2 mt-6">
                {['10', '50', '100', '500'].map(val => (
                    <button key={val} onClick={() => handleQuickAmount(val)} disabled={isRolling} className="py-2.5 bg-white/5 border border-white/5 rounded-xl text-[10px] font-black text-gray-500 hover:text-white transition-all uppercase tracking-widest">{val}</button>
                ))}
            </div>
        </div>
        <style>{`
            .perspective-1000 { perspective: 1500px; }
            .preserve-3d { transform-style: preserve-3d; }
            .backface-hidden { backface-visibility: hidden; }
            .shadow-glow { box-shadow: 0 0 25px rgba(250, 190, 11, 0.15); }
            .no-scrollbar::-webkit-scrollbar { display: none; }
        `}</style>
    </div>
  );
};

const DiceFace: React.FC<{ value: number }> = ({ value }) => {
    let transform = '';
    switch(value) {
        case 1: transform = 'translateZ(64px)'; break;
        case 6: transform = 'rotateY(180deg) translateZ(64px)'; break;
        case 2: transform = 'rotateY(90deg) translateZ(64px)'; break;
        case 5: transform = 'rotateY(-90deg) translateZ(64px)'; break;
        case 3: transform = 'rotateX(90deg) translateZ(64px)'; break;
        case 4: transform = 'rotateX(-90deg) translateZ(64px)'; break;
    }

    const getDots = (v: number) => {
        const dots = [];
        if ([1, 3, 5].includes(v)) dots.push(<div key="c" className="w-4 h-4 bg-black rounded-full absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 shadow-inner" />);
        if ([2, 3, 4, 5, 6].includes(v)) {
            dots.push(<div key="tl" className="w-4 h-4 bg-black rounded-full absolute top-5 left-5 shadow-inner" />);
            dots.push(<div key="br" className="w-4 h-4 bg-black rounded-full absolute bottom-5 right-5 shadow-inner" />);
        }
        if ([4, 5, 6].includes(v)) {
            dots.push(<div key="tr" className="w-4 h-4 bg-black rounded-full absolute top-5 right-5 shadow-inner" />);
            dots.push(<div key="bl" className="w-4 h-4 bg-black rounded-full absolute bottom-5 left-5 shadow-inner" />);
        }
        if (v === 6) {
            dots.push(<div key="ml" className="w-4 h-4 bg-black rounded-full absolute top-1/2 left-5 -translate-y-1/2 shadow-inner" />);
            dots.push(<div key="mr" className="w-4 h-4 bg-black rounded-full absolute top-1/2 right-5 -translate-y-1/2 shadow-inner" />);
        }
        return dots;
    };

    return (
        <div className="absolute w-32 h-32 bg-gradient-to-br from-white via-gray-100 to-gray-200 rounded-[2.5rem] border-2 border-white/20 flex items-center justify-center shadow-inner backface-hidden" style={{ transform }}>
            {getDots(value)}
            <div className="absolute inset-0 bg-white/10 rounded-[2.5rem]"></div>
        </div>
    );
};

export default Dice;
