import React, { useState, useEffect, useRef } from 'react';
import GlassCard from '../components/GlassCard';
import { ArrowLeft, Volume2, VolumeX, RefreshCw, Trophy, Wallet, Zap, ShieldAlert, ChevronRight, Play, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';
import { supabase } from '../integrations/supabase/client';
import { processGameRound, determineOutcome, getPlayableBalance } from '../lib/gameMath';
import { useUI } from '../context/UIContext';
import BalanceDisplay from '../components/BalanceDisplay';
import { useCurrency } from '../context/CurrencyContext';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';

type BetType = 'low' | 'seven' | 'high';

const Dice: React.FC = () => {
  const { toast } = useUI();
  const { symbol, format } = useCurrency();
  
  const [balance, setBalance] = useState(0);
  const [betAmount, setBetAmount] = useState<string>('20');
  const [selectedBet, setSelectedBet] = useState<BetType>('high');
  const [isRolling, setIsRolling] = useState(false);
  const [diceResult, setDiceResult] = useState([1, 1]); 
  const [history, setHistory] = useState<number[]>([]);
  const [soundOn, setSoundOn] = useState(true);

  const rollSfx = useRef(new Audio('https://assets.mixkit.co/active_storage/sfx/2003/2003-preview.mp3'));
  const winSfx = useRef(new Audio('https://assets.mixkit.co/active_storage/sfx/2019/2019-preview.mp3'));

  useEffect(() => {
      rollSfx.current.volume = 0.5;
      winSfx.current.volume = 0.8;
      fetchBalance();
  }, []);

  const fetchBalance = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if(session) {
          const bal = await getPlayableBalance(session.user.id);
          setBalance(bal);
      }
  };

  const handleQuickAmount = (action: string) => {
      if (isRolling) return;
      const current = parseFloat(betAmount) || 0;
      let next = current;
      switch(action) {
          case 'min': next = 10; break;
          case 'half': next = Math.max(1, current / 2); break;
          case 'double': next = current * 2; break;
          case 'max': next = balance; break;
          case 'plus10': next = current + 10; break;
          case 'plus50': next = current + 50; break;
      }
      setBetAmount(Math.round(next).toString());
  };

  const playGame = async () => {
      const amount = parseFloat(betAmount);
      if (isNaN(amount) || amount < 1) { toast.error("Minimum bet 1 TK"); return; }
      if (amount > balance) { toast.error("Insufficient balance"); return; }

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      setIsRolling(true);
      if(soundOn) {
          rollSfx.current.currentTime = 0;
          rollSfx.current.play().catch(()=>{});
      }

      const winChance = selectedBet === 'seven' ? 0.16 : 0.45;
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

      try {
          await processGameRound(session.user.id, amount, winAmount, 'Lucky Dice');
          
          setTimeout(() => {
              setDiceResult([d1, d2]);
              setHistory(prev => [total, ...prev.slice(0, 11)]);
              setIsRolling(false);
              
              if (outcome === 'win') {
                  if (soundOn) winSfx.current.play().catch(()=>{});
                  confetti({
                      particleCount: 120,
                      spread: 70,
                      origin: { y: 0.7 },
                      colors: ['#FFBE0B', '#FFFFFF', '#3A86FF']
                  });
                  toast.success(`VICTORY! Roll: ${total}. Won ${format(winAmount)}!`);
              }
              fetchBalance();
          }, 1200); 
      } catch (e: any) {
          toast.error(e.message);
          setIsRolling(false);
      }
  };

  /**
   * Corrected Mapping:
   * Front (1) -> 0,0
   * Back (6) -> 180,0
   * Right (2) -> 0,-90
   * Left (5) -> 0,90
   * Top (3) -> -90,0
   * Bottom (4) -> 90,0
   */
  const getTransform = (val: number) => {
      switch(val) {
          case 1: return { x: 0, y: 0 };
          case 6: return { x: 180, y: 0 };
          case 2: return { x: 0, y: -90 };
          case 5: return { x: 0, y: 90 };
          case 3: return { x: -90, y: 0 };
          case 4: return { x: 90, y: 0 };
          default: return { x: 0, y: 0 };
      }
  };

  return (
    <div className="pb-32 pt-4 px-4 max-w-lg mx-auto min-h-screen relative font-sans flex flex-col bg-void overflow-hidden selection:bg-brand selection:text-black">
        
        <div className="flex justify-between items-center mb-6 z-10">
            <div className="flex items-center gap-3">
                <Link to="/games" className="p-2.5 bg-panel rounded-2xl border border-white/5 text-white hover:bg-white/10 transition active:scale-90">
                    <ArrowLeft size={20}/>
                </Link>
                <div>
                    <h1 className="text-xl font-black text-white uppercase tracking-tighter leading-none">Elite <span className="text-brand">Dice</span></h1>
                    <div className="flex items-center gap-1.5 mt-1">
                        <div className="w-1.5 h-1.5 rounded-full bg-success animate-pulse shadow-glow"></div>
                        <span className="text-[8px] text-muted font-black uppercase tracking-widest">Physics Core</span>
                    </div>
                </div>
            </div>
            <div className="flex items-center gap-2 bg-panel px-4 py-2.5 rounded-2xl border border-brand/20 shadow-glow">
                <Wallet size={16} className="text-brand" />
                <span className="text-lg font-black text-brand tracking-tighter font-mono leading-none"><BalanceDisplay amount={balance}/></span>
            </div>
        </div>

        <div className="flex justify-center gap-2 mb-8 h-10 z-10 overflow-x-auto no-scrollbar py-1">
            <AnimatePresence>
                {history.map((res, idx) => (
                    <motion.div 
                        key={`${idx}-${res}`}
                        initial={{ scale: 0, opacity: 0, x: 20 }}
                        animate={{ scale: 1, x: 0, opacity: 1 }}
                        className={`w-9 h-9 shrink-0 rounded-xl flex items-center justify-center text-[11px] font-black border-2 transition-all ${
                            res === 7 ? 'bg-brand border-white text-black shadow-glow' : 
                            res < 7 ? 'bg-red-500/10 border-red-500/30 text-red-500' : 
                            'bg-blue-500/10 border-blue-500/30 text-blue-400'
                        }`}
                    >
                        {res}
                    </motion.div>
                ))}
            </AnimatePresence>
        </div>

        <div className="flex-1 flex flex-col items-center justify-center relative z-10 py-6 min-h-[300px]">
             <div className="flex justify-center gap-14 perspective-1000">
                 {[0, 1].map(i => {
                     const val = diceResult[i];
                     const tf = getTransform(val);
                     return (
                         <div key={i} className="relative">
                            <motion.div
                                className="relative preserve-3d w-28 h-28"
                                animate={isRolling ? {
                                    rotateX: [0, 720, 1440 + tf.x],
                                    rotateY: [0, 720, 1440 + tf.y],
                                    rotateZ: [0, 360, 0],
                                    y: [0, -100, 0]
                                } : {
                                    rotateX: tf.x,
                                    rotateY: tf.y,
                                    rotateZ: 0,
                                    y: 0
                                }}
                                transition={{ 
                                    duration: 1.2, 
                                    ease: [0.15, 0, 0, 1] 
                                }}
                            >
                                {[1,2,3,4,5,6].map(face => (
                                    <DiceFace key={face} value={face} />
                                ))}
                            </motion.div>
                            <motion.div 
                                animate={isRolling ? { scale: [1, 0.4, 1], opacity: [0.3, 0.1, 0.3] } : { scale: 1, opacity: 0.3 }}
                                className="absolute -bottom-10 left-1/2 -translate-x-1/2 w-20 h-4 bg-black blur-xl rounded-full"
                            />
                         </div>
                     )
                 })}
             </div>

             <div className="mt-20 text-center flex flex-col items-center gap-2">
                <div className="bg-panel px-10 py-4 rounded-[2rem] border border-border-base shadow-2xl relative overflow-hidden group">
                    <span className={`text-6xl font-black font-mono leading-none ${isRolling ? 'text-gray-700 animate-pulse' : 'text-white drop-shadow-sm'}`}>
                        {isRolling ? '??' : diceResult[0] + diceResult[1]}
                    </span>
                </div>
            </div>
        </div>

        <GlassCard className="p-6 bg-panel border-t border-white/10 rounded-t-[4rem] rounded-b-none -mx-4 pb-12 shadow-2xl relative">
            <div className="flex bg-void p-1.5 rounded-2xl mb-8 border border-border-base relative h-16">
                <motion.div 
                    className={`absolute top-1.5 bottom-1.5 w-[calc(33.33%-6px)] rounded-xl shadow-glow ${
                        selectedBet === 'low' ? 'left-1.5 bg-red-600' : 
                        selectedBet === 'seven' ? 'left-[calc(33.33%+3px)] bg-brand' : 
                        'left-[calc(66.66%+1.5px)] bg-blue-600'
                    }`}
                    layoutId="betSelector"
                    transition={{ type: "spring", stiffness: 400, damping: 35 }}
                />
                <button 
                    onClick={() => setSelectedBet('low')} disabled={isRolling}
                    className={`flex-1 relative z-10 font-black uppercase text-[10px] flex flex-col items-center justify-center leading-none tracking-widest ${selectedBet === 'low' ? 'text-white' : 'text-gray-500'}`}
                >
                    <span>UNDER 7</span>
                    <span className="text-[9px] font-mono mt-1.5 opacity-80">x2.30</span>
                </button>
                <button 
                    onClick={() => setSelectedBet('seven')} disabled={isRolling}
                    className={`flex-1 relative z-10 font-black uppercase text-[10px] flex flex-col items-center justify-center leading-none tracking-widest ${selectedBet === 'seven' ? 'text-black' : 'text-gray-500'}`}
                >
                    <span>LUCKY 7</span>
                    <span className="text-[9px] font-mono mt-1.5 opacity-80">x5.80</span>
                </button>
                <button 
                    onClick={() => setSelectedBet('high')} disabled={isRolling}
                    className={`flex-1 relative z-10 font-black uppercase text-[10px] flex flex-col items-center justify-center leading-none tracking-widest ${selectedBet === 'high' ? 'text-white' : 'text-gray-500'}`}
                >
                    <span>OVER 7</span>
                    <span className="text-[9px] font-mono mt-1.5 opacity-80">x2.30</span>
                </button>
            </div>

            <div className="flex items-stretch gap-4 mb-6">
                <div className="bg-void border border-border-base rounded-3xl px-6 py-4 flex-1 flex flex-col justify-center focus-within:border-brand/40 transition-colors group">
                     <p className="text-[10px] text-muted font-black uppercase tracking-widest mb-1 group-focus-within:text-brand">STAKE AMOUNT</p>
                     <div className="flex items-center gap-2">
                         <span className="text-brand font-black text-2xl">{symbol}</span>
                         <input 
                            type="number" 
                            value={betAmount} 
                            onChange={e => setBetAmount(e.target.value)}
                            disabled={isRolling}
                            className="bg-transparent text-white font-mono font-black text-3xl w-full outline-none placeholder-gray-800"
                            placeholder="0"
                         />
                     </div>
                </div>
                <button 
                    onClick={playGame}
                    disabled={isRolling}
                    className={`px-10 rounded-[2rem] font-black uppercase text-base shadow-2xl flex items-center justify-center gap-3 transition-all active:scale-95 ${isRolling ? 'bg-gray-800 text-gray-500 cursor-not-allowed' : 'bg-brand text-black hover:bg-white shadow-yellow-pop'}`}
                >
                    {isRolling ? <RefreshCw className="animate-spin" size={24} /> : <><Sparkles size={24} fill="currentColor" /> ROLL</>}
                </button>
            </div>

            <div className="grid grid-cols-3 gap-3">
                {['min', 'half', 'double', 'max', 'plus10', 'plus50'].map((action) => (
                    <button 
                        key={action}
                        onClick={() => handleQuickAmount(action)}
                        disabled={isRolling}
                        className="py-3 bg-void rounded-2xl text-[10px] font-black text-gray-400 hover:text-white hover:border-brand transition-all border border-border-base uppercase tracking-widest"
                    >
                        {action === 'plus10' ? '+10' : action === 'plus50' ? '+50' : action}
                    </button>
                ))}
            </div>
        </GlassCard>

        <style>{`
            .perspective-1000 { perspective: 1500px; }
            .preserve-3d { transform-style: preserve-3d; }
            .backface-hidden { backface-visibility: hidden; }
            .shadow-glow { box-shadow: 0 0 25px rgba(250, 190, 11, 0.15); }
            .shadow-yellow-pop { box-shadow: 0 10px 40px -10px rgba(250, 190, 11, 0.5); }
            .no-scrollbar::-webkit-scrollbar { display: none; }
        `}</style>
    </div>
  );
};

const DiceFace: React.FC<{ value: number }> = ({ value }) => {
    let transform = '';
    switch(value) {
        case 1: transform = 'translateZ(56px)'; break;
        case 6: transform = 'rotateY(180deg) translateZ(56px)'; break;
        case 2: transform = 'rotateY(90deg) translateZ(56px)'; break;
        case 5: transform = 'rotateY(-90deg) translateZ(56px)'; break;
        case 3: transform = 'rotateX(90deg) translateZ(56px)'; break;
        case 4: transform = 'rotateX(-90deg) translateZ(56px)'; break;
    }

    const getDots = (v: number) => {
        const dots = [];
        if ([1, 3, 5].includes(v)) dots.push(<div key="c" className="w-4 h-4 bg-black rounded-full absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 shadow-inner" />);
        if ([2, 3, 4, 5, 6].includes(v)) {
            dots.push(<div key="tl" className="w-4 h-4 bg-black rounded-full absolute top-4 left-4 shadow-inner" />);
            dots.push(<div key="br" className="w-4 h-4 bg-black rounded-full absolute bottom-4 right-4 shadow-inner" />);
        }
        if ([4, 5, 6].includes(v)) {
            dots.push(<div key="tr" className="w-4 h-4 bg-black rounded-full absolute top-4 right-4 shadow-inner" />);
            dots.push(<div key="bl" className="w-4 h-4 bg-black rounded-full absolute bottom-4 left-4 shadow-inner" />);
        }
        if (v === 6) {
            dots.push(<div key="ml" className="w-4 h-4 bg-black rounded-full absolute top-1/2 left-4 -translate-y-1/2 shadow-inner" />);
            dots.push(<div key="mr" className="w-4 h-4 bg-black rounded-full absolute top-1/2 right-4 -translate-y-1/2 shadow-inner" />);
        }
        return dots;
    };

    return (
        <div 
            className="absolute w-28 h-28 bg-gradient-to-br from-white via-gray-100 to-gray-300 rounded-[2rem] border-2 border-white/20 flex items-center justify-center shadow-[inset_0_0_15px_rgba(0,0,0,0.05)] backface-hidden"
            style={{ transform }}
        >
            {getDots(value)}
            <div className="absolute inset-0 bg-white/10 rounded-[2rem]"></div>
        </div>
    );
};

export default Dice;