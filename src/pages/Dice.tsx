import React, { useState, useEffect, useRef } from 'react';
import GlassCard from '../components/GlassCard';
import { ArrowLeft, Volume2, VolumeX, RefreshCw, Trophy } from 'lucide-react';
import { Link } from 'react-router-dom';
import { supabase } from '../integrations/supabase/client';
import { updateWallet, createTransaction } from '../lib/actions';
import { useUI } from '../context/UIContext';
import BalanceDisplay from '../components/BalanceDisplay';
import { useCurrency } from '../context/CurrencyContext';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';

type BetType = 'low' | 'seven' | 'high';

const Dice: React.FC = () => {
  const { toast } = useUI();
  const { symbol, format } = useCurrency();
  
  // Game State
  const [balance, setBalance] = useState(0);
  const [gameBalance, setGameBalance] = useState(0);
  const [betAmount, setBetAmount] = useState<string>('10');
  const [selectedBet, setSelectedBet] = useState<BetType>('high'); // Default to Over 7
  
  const [isRolling, setIsRolling] = useState(false);
  const [diceResult, setDiceResult] = useState([1, 1]); 
  const [history, setHistory] = useState<number[]>([]);
  const [soundOn, setSoundOn] = useState(true);

  // Audio
  const rollSfx = useRef(new Audio('https://assets.mixkit.co/active_storage/sfx/2003/2003-preview.mp3'));
  const winSfx = useRef(new Audio('https://assets.mixkit.co/active_storage/sfx/2019/2019-preview.mp3'));

  useEffect(() => {
      rollSfx.current.volume = 0.6;
      winSfx.current.volume = 0.8;
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

  const handleQuickAmount = (action: 'min' | 'half' | 'double' | 'max') => {
      const current = parseFloat(betAmount) || 0;
      let next = current;
      if (action === 'min') next = 10;
      if (action === 'half') next = Math.max(10, current / 2);
      if (action === 'double') next = current * 2;
      if (action === 'max') next = balance;
      setBetAmount(next.toFixed(2));
  };

  const playGame = async () => {
      const amount = parseFloat(betAmount);
      if (isNaN(amount) || amount <= 0) { toast.error("Invalid amount"); return; }
      
      let walletType: 'main' | 'game' = 'main';
      if (balance >= amount) walletType = 'main';
      else if (gameBalance >= amount) walletType = 'game';
      else { toast.error("Insufficient balance"); return; }

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      setIsRolling(true);
      if(soundOn) {
          rollSfx.current.currentTime = 0;
          rollSfx.current.play().catch(()=>{});
      }

      if (walletType === 'main') setBalance(prev => prev - amount);
      else setGameBalance(prev => prev - amount);

      const d1 = Math.floor(Math.random() * 6) + 1;
      const d2 = Math.floor(Math.random() * 6) + 1;
      const total = d1 + d2;

      // Animation delay (1s)
      setTimeout(() => {
          setDiceResult([d1, d2]);
          setIsRolling(false);
          
          processResult(amount, d1, d2, total, walletType, session.user.id);
      }, 1000); 
  };

  const processResult = async (bet: number, d1: number, d2: number, total: number, walletType: string, userId: string) => {
      let win = false;
      let multiplier = 0;

      if (selectedBet === 'low' && total < 7) { win = true; multiplier = 2.3; }
      else if (selectedBet === 'seven' && total === 7) { win = true; multiplier = 5.8; }
      else if (selectedBet === 'high' && total > 7) { win = true; multiplier = 2.3; }

      const payout = win ? bet * multiplier : 0;

      setHistory(prev => [total, ...prev.slice(0, 10)]);

      await createTransaction(userId, 'game_bet', bet, `Dice: ${selectedBet.toUpperCase()}`);
      await updateWallet(userId, bet, 'decrement', walletType === 'main' ? 'main_balance' : 'game_balance');

      if (win) {
          if (soundOn) winSfx.current.play().catch(()=>{});
          confetti({
             particleCount: 100,
             spread: 60,
             origin: { y: 0.7 },
             colors: ['#3b82f6', '#10b981']
          });
          toast.success(`You Won ${format(payout)}!`);
          
          await updateWallet(userId, payout, 'increment', 'game_balance');
          await createTransaction(userId, 'game_win', payout, `Dice Win: ${total}`);
          setGameBalance(prev => prev + payout);
      }
      fetchBalance();
  };

  // Helper to get rotation based on value (Standard Dice Mapping)
  const getTransform = (val: number) => {
      // Rotate such that 'val' faces front
      switch(val) {
          case 1: return { x: 0, y: 0 };
          case 6: return { x: 180, y: 0 };
          case 2: return { x: -90, y: 0 };
          case 5: return { x: 90, y: 0 };
          case 3: return { x: 0, y: -90 };
          case 4: return { x: 0, y: 90 };
          default: return { x: 0, y: 0 };
      }
  };

  return (
    <div className="pb-32 pt-4 px-4 max-w-lg mx-auto min-h-screen relative font-sans flex flex-col">
        
        {/* Header */}
        <div className="flex justify-between items-center mb-4 z-10">
            <Link to="/games" className="p-2 bg-white/5 rounded-xl border border-white/10 text-white hover:bg-white/10">
                <ArrowLeft size={20}/>
            </Link>
            <div className="flex items-center gap-2 bg-black/30 px-3 py-1 rounded-full border border-white/10">
                <Trophy size={14} className="text-yellow-500" />
                <span className="text-xs font-bold text-white"><BalanceDisplay amount={balance}/></span>
            </div>
            <button onClick={() => setSoundOn(!soundOn)} className="p-2 bg-white/5 rounded-xl text-gray-400">
                {soundOn ? <Volume2 size={20}/> : <VolumeX size={20}/>}
            </button>
        </div>

        {/* History Bar */}
        <div className="flex justify-center gap-2 mb-4 h-8 z-10">
            <AnimatePresence>
                {history.map((res, idx) => (
                    <motion.div 
                        key={`${idx}-${res}`}
                        initial={{ scale: 0, opacity: 0, x: -10 }}
                        animate={{ scale: 1, opacity: 1, x: 0 }}
                        className={`w-8 h-8 rounded-lg flex items-center justify-center text-[10px] font-bold border font-mono ${
                            res === 7 ? 'bg-yellow-500 border-yellow-300 text-black' : 
                            res < 7 ? 'bg-red-500 border-red-300 text-white' : 
                            'bg-blue-500 border-blue-300 text-white'
                        }`}
                    >
                        {res}
                    </motion.div>
                ))}
            </AnimatePresence>
        </div>

        {/* Game Stage */}
        <div className="flex-1 flex flex-col items-center justify-center relative z-10 min-h-[300px]">
             <div className="flex justify-center gap-8 perspective-1000">
                 {[0, 1].map(i => {
                     const val = diceResult[i];
                     const tf = getTransform(val);
                     return (
                         <motion.div
                            key={i}
                            className="relative preserve-3d w-24 h-24"
                            animate={isRolling ? {
                                rotateX: [0, 360, 720 + tf.x],
                                rotateY: [0, 360, 720 + tf.y],
                                rotateZ: [0, 180, 0]
                            } : {
                                rotateX: tf.x,
                                rotateY: tf.y,
                                rotateZ: 0
                            }}
                            transition={{ duration: 1, ease: "circOut" }}
                         >
                             {/* Faces */}
                             {[1,2,3,4,5,6].map(face => (
                                 <DiceFace key={face} value={face} />
                             ))}
                         </motion.div>
                     )
                 })}
             </div>

             <div className="mt-12 text-center bg-black/40 px-6 py-2 rounded-xl border border-white/10 backdrop-blur-sm">
                <span className="text-gray-400 text-[10px] font-bold uppercase tracking-wider block">Total Roll</span>
                <span className={`text-3xl font-black ${isRolling ? 'text-gray-500 animate-pulse' : 'text-white'}`}>
                    {isRolling ? '??' : diceResult[0] + diceResult[1]}
                </span>
            </div>
        </div>

        {/* Controls */}
        <GlassCard className="p-4 bg-[#151515] border-t border-white/10 rounded-t-3xl rounded-b-none -mx-4 pb-10">
            
            {/* Bet Selection */}
            <div className="flex bg-black/40 p-1.5 rounded-xl mb-4 border border-white/5 relative h-12">
                <motion.div 
                    className={`absolute top-1.5 bottom-1.5 w-[calc(33.33%-4px)] rounded-lg shadow-lg ${
                        selectedBet === 'low' ? 'left-1.5 bg-red-500' : 
                        selectedBet === 'seven' ? 'left-[calc(33.33%+2px)] bg-yellow-500' : 
                        'left-[calc(66.66%+0px)] bg-blue-500'
                    }`}
                    layoutId="betSelector"
                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                />
                <button 
                    onClick={() => setSelectedBet('low')} disabled={isRolling}
                    className={`flex-1 relative z-10 font-bold uppercase text-[10px] flex flex-col items-center justify-center leading-none ${selectedBet === 'low' ? 'text-white' : 'text-gray-500'}`}
                >
                    <span>2 - 6</span>
                    <span className="opacity-70">x2.3</span>
                </button>
                <button 
                    onClick={() => setSelectedBet('seven')} disabled={isRolling}
                    className={`flex-1 relative z-10 font-bold uppercase text-[10px] flex flex-col items-center justify-center leading-none ${selectedBet === 'seven' ? 'text-black' : 'text-gray-500'}`}
                >
                    <span>7</span>
                    <span className="opacity-70">x5.8</span>
                </button>
                <button 
                    onClick={() => setSelectedBet('high')} disabled={isRolling}
                    className={`flex-1 relative z-10 font-bold uppercase text-[10px] flex flex-col items-center justify-center leading-none ${selectedBet === 'high' ? 'text-white' : 'text-gray-500'}`}
                >
                    <span>8 - 12</span>
                    <span className="opacity-70">x2.3</span>
                </button>
            </div>

            {/* Input Row */}
            <div className="flex items-center gap-3 mb-4">
                <div className="bg-black/40 border border-white/10 rounded-xl px-4 py-2 flex-1 flex flex-col justify-center">
                     <p className="text-[9px] text-gray-500 font-bold uppercase">Bet Amount</p>
                     <div className="flex items-center gap-1">
                         <span className="text-gray-400 font-bold text-sm">{symbol}</span>
                         <input 
                            type="number" 
                            value={betAmount} 
                            onChange={e => setBetAmount(e.target.value)}
                            disabled={isRolling}
                            className="bg-transparent text-white font-mono font-bold text-lg w-full outline-none"
                         />
                     </div>
                </div>
                <button 
                    onClick={playGame}
                    disabled={isRolling}
                    className={`h-14 px-8 rounded-xl font-black uppercase text-sm shadow-lg flex items-center gap-2 transition active:scale-95 ${isRolling ? 'bg-gray-700 text-gray-500 cursor-not-allowed' : 'bg-white text-black hover:bg-gray-200'}`}
                >
                    {isRolling ? <RefreshCw className="animate-spin" /> : 'ROLL DICE'}
                </button>
            </div>

            {/* Quick Amounts */}
            <div className="grid grid-cols-4 gap-2">
                {['min', 'half', 'double', 'max'].map((action) => (
                    <button 
                        key={action}
                        onClick={() => handleQuickAmount(action as any)}
                        disabled={isRolling}
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
        `}</style>
    </div>
  );
};

// Helper for Dice Face Rendering
const DiceFace: React.FC<{ value: number }> = ({ value }) => {
    // Positioning based on cube logic
    let transform = '';
    switch(value) {
        case 1: transform = 'translateZ(48px)'; break;
        case 6: transform = 'rotateY(180deg) translateZ(48px)'; break;
        case 2: transform = 'rotateY(90deg) translateZ(48px)'; break;
        case 5: transform = 'rotateY(-90deg) translateZ(48px)'; break;
        case 3: transform = 'rotateX(90deg) translateZ(48px)'; break;
        case 4: transform = 'rotateX(-90deg) translateZ(48px)'; break;
    }

    // Dot positions grid
    const getDots = (v: number) => {
        const dots = [];
        if ([1, 3, 5].includes(v)) dots.push(<div key="c" className="w-3 h-3 bg-black rounded-full absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 shadow-inner" />);
        if ([2, 3, 4, 5, 6].includes(v)) {
            dots.push(<div key="tl" className="w-3 h-3 bg-black rounded-full absolute top-3 left-3 shadow-inner" />);
            dots.push(<div key="br" className="w-3 h-3 bg-black rounded-full absolute bottom-3 right-3 shadow-inner" />);
        }
        if ([4, 5, 6].includes(v)) {
            dots.push(<div key="tr" className="w-3 h-3 bg-black rounded-full absolute top-3 right-3 shadow-inner" />);
            dots.push(<div key="bl" className="w-3 h-3 bg-black rounded-full absolute bottom-3 left-3 shadow-inner" />);
        }
        if (v === 6) {
            dots.push(<div key="ml" className="w-3 h-3 bg-black rounded-full absolute top-1/2 left-3 -translate-y-1/2 shadow-inner" />);
            dots.push(<div key="mr" className="w-3 h-3 bg-black rounded-full absolute top-1/2 right-3 -translate-y-1/2 shadow-inner" />);
        }
        return dots;
    };

    return (
        <div 
            className="absolute w-24 h-24 bg-gradient-to-br from-gray-100 to-gray-300 rounded-2xl border-2 border-gray-400 flex items-center justify-center shadow-[inset_0_0_15px_rgba(0,0,0,0.1)] backface-hidden"
            style={{ transform }}
        >
            {getDots(value)}
        </div>
    );
};

export default Dice;