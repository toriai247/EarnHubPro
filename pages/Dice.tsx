
import React, { useState, useEffect, useRef } from 'react';
import GlassCard from '../components/GlassCard';
import { ArrowLeft, Volume2, VolumeX, RefreshCw, Zap, Trophy, Play, Coins, Wallet } from 'lucide-react';
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
    id: number;
}

const Dice: React.FC = () => {
  const { toast } = useUI();
  const { symbol } = useCurrency();
  
  // --- STATE ---
  const [balance, setBalance] = useState(0);
  const [gameBalance, setGameBalance] = useState(0);
  const [betAmount, setBetAmount] = useState<string>('10');
  const [selectedBet, setSelectedBet] = useState<BetType>('high'); // Default to Over 7
  
  const [isRolling, setIsRolling] = useState(false);
  const [diceResult, setDiceResult] = useState([1, 1]); // [die1, die2]
  const [rotation, setRotation] = useState({ x: 0, y: 0 }); // Global rotation offset to keep spinning
  
  const [history, setHistory] = useState<RollHistory[]>([]);
  const [soundOn, setSoundOn] = useState(true);

  // Audio
  const rollSfx = useRef(new Audio('https://assets.mixkit.co/active_storage/sfx/2003/2003-preview.mp3'));
  const winSfx = useRef(new Audio('https://assets.mixkit.co/active_storage/sfx/2019/2019-preview.mp3'));

  useEffect(() => {
      rollSfx.current.volume = 0.8; // Increased from 0.5
      winSfx.current.volume = 0.9;  // Increased from 0.6
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

  const handleQuickAmount = (type: 'min' | 'double' | 'half' | 'max') => {
      const current = parseFloat(betAmount) || 0;
      let newVal = current;
      if (type === 'min') newVal = 10; // Min bet
      if (type === 'double') newVal = current * 2;
      if (type === 'half') newVal = current / 2;
      if (type === 'max') newVal = balance; // Max balance
      
      setBetAmount(newVal.toFixed(2));
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

      // Optimistic Deduct
      if (walletType === 'main') setBalance(prev => prev - amount);
      else setGameBalance(prev => prev - amount);

      // Generate Result
      const d1 = Math.floor(Math.random() * 6) + 1;
      const d2 = Math.floor(Math.random() * 6) + 1;
      const total = d1 + d2;

      // Animation Logic:
      // We update the dice values immediately but the visual rotation takes time.
      // We add huge rotations (720deg+) to ensure it spins multiple times.
      setTimeout(() => {
          setDiceResult([d1, d2]);
          setIsRolling(false);
          
          processResult(amount, d1, d2, total, walletType, session.user.id);
      }, 1000); // 1s spin duration
  };

  const processResult = async (bet: number, d1: number, d2: number, total: number, walletType: string, userId: string) => {
      let win = false;
      let multiplier = 0;

      if (selectedBet === 'low' && total < 7) { win = true; multiplier = 2.3; }
      else if (selectedBet === 'seven' && total === 7) { win = true; multiplier = 5.8; }
      else if (selectedBet === 'high' && total > 7) { win = true; multiplier = 2.3; }

      const payout = win ? bet * multiplier : 0;

      // History
      setHistory(prev => [{ roll: total, win, id: Date.now() }, ...prev.slice(0, 8)]);

      // DB Updates
      await createTransaction(userId, 'game_bet', bet, `Dice: ${selectedBet.toUpperCase()}`);
      await updateWallet(userId, bet, 'decrement', walletType === 'main' ? 'main_balance' : 'game_balance');

      if (win) {
          if (soundOn) winSfx.current.play().catch(()=>{});
          confetti({
             particleCount: 100,
             spread: 60,
             origin: { y: 0.7 },
             colors: ['#FFD700', '#F43F5E']
          });
          toast.success(`You Won! +${payout.toFixed(2)}`);
          
          await updateWallet(userId, payout, 'increment', 'game_balance');
          await createTransaction(userId, 'game_win', payout, `Dice Win: ${total}`);
          setGameBalance(prev => prev + payout);
      }
      
      fetchBalance();
  };

  // Helper to get rotation for a specific face
  // Standard Dice Faces: 1 opposite 6, 2 opposite 5, 3 opposite 4
  // We assume default state (0,0,0) shows Face 1.
  const getRotation = (val: number) => {
      // Add random extra spins (360 * n) to make it look active
      const spinsX = 360 * (Math.floor(Math.random() * 3) + 2); 
      const spinsY = 360 * (Math.floor(Math.random() * 3) + 2);
      
      switch(val) {
          case 1: return { x: spinsX + 0, y: spinsY + 0 };
          case 6: return { x: spinsX + 180, y: spinsY + 0 };
          case 2: return { x: spinsX - 90, y: spinsY + 0 };
          case 5: return { x: spinsX + 90, y: spinsY + 0 };
          case 3: return { x: spinsX + 0, y: spinsY - 90 };
          case 4: return { x: spinsX + 0, y: spinsY + 90 };
          default: return { x: 0, y: 0 };
      }
  };

  return (
    <div className="min-h-screen bg-[#1e293b] font-sans pb-32 relative overflow-hidden flex flex-col">
        
        {/* Background Patterns */}
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10 pointer-events-none"></div>
        <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-b from-[#0f172a] via-[#1e293b] to-[#0f172a] opacity-90 pointer-events-none"></div>

        {/* HEADER */}
        <div className="relative z-20 flex justify-between items-center p-4">
            <Link to="/games" className="p-2 bg-white/5 rounded-xl border border-white/10 text-white hover:bg-white/10">
                <ArrowLeft size={20}/>
            </Link>
            <div className="flex gap-2">
                <GlassCard className="!p-2 flex items-center gap-2 border-yellow-500/30 bg-yellow-900/20">
                    <Zap size={14} className="text-yellow-400 fill-yellow-400"/>
                    <span className="text-xs font-bold text-white"><BalanceDisplay amount={balance}/></span>
                </GlassCard>
                <GlassCard className="!p-2 flex items-center gap-2 border-purple-500/30 bg-purple-900/20">
                    <Trophy size={14} className="text-purple-400 fill-purple-400"/>
                    <span className="text-xs font-bold text-white"><BalanceDisplay amount={gameBalance}/></span>
                </GlassCard>
            </div>
            <button onClick={() => setSoundOn(!soundOn)} className="p-2 bg-white/5 rounded-xl text-gray-400">
                {soundOn ? <Volume2 size={20}/> : <VolumeX size={20}/>}
            </button>
        </div>

        {/* GAME STAGE */}
        <div className="flex-1 flex flex-col items-center justify-center relative z-10 -mt-10">
            <div className="flex justify-center gap-8 sm:gap-16 perspective-1000 transform scale-75 sm:scale-100">
                
                {/* Die 1 */}
                <div className="relative w-40 h-40">
                     {/* Gold Ring Container */}
                     <div className="absolute inset-0 rounded-full border-[6px] border-[#eab308] shadow-[0_0_30px_rgba(234,179,8,0.3)] bg-black/40 flex items-center justify-center">
                         <Dice3D value={diceResult[0]} rolling={isRolling} />
                     </div>
                </div>

                {/* Die 2 */}
                <div className="relative w-40 h-40">
                     <div className="absolute inset-0 rounded-full border-[6px] border-[#eab308] shadow-[0_0_30px_rgba(234,179,8,0.3)] bg-black/40 flex items-center justify-center">
                         <Dice3D value={diceResult[1]} rolling={isRolling} delay={0.1} />
                     </div>
                </div>

            </div>

            {/* Total Display */}
            <div className="mt-8 bg-[#0f172a] px-6 py-2 rounded-full border border-white/10 shadow-lg flex items-center gap-2">
                <span className="text-gray-400 text-xs font-bold uppercase tracking-wider">Total Roll</span>
                <span className={`text-2xl font-black ${isRolling ? 'text-gray-500 animate-pulse' : 'text-white'}`}>
                    {isRolling ? '...' : diceResult[0] + diceResult[1]}
                </span>
            </div>
        </div>

        {/* CONTROLS AREA */}
        <div className="relative z-20 px-4 max-w-lg mx-auto w-full">
            
            {/* Bet Options */}
            <div className="flex justify-between items-center mb-2 px-1">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Select your odds</span>
            </div>
            
            <div className="grid grid-cols-3 gap-3 mb-6">
                <BetOption 
                    label="Over 7" 
                    multiplier="x 2.3" 
                    active={selectedBet === 'high'} 
                    onClick={() => setSelectedBet('high')}
                    color="border-blue-500"
                />
                <BetOption 
                    label="Equal 7" 
                    multiplier="x 5.8" 
                    active={selectedBet === 'seven'} 
                    onClick={() => setSelectedBet('seven')}
                    color="border-yellow-500"
                />
                <BetOption 
                    label="Under 7" 
                    multiplier="x 2.3" 
                    active={selectedBet === 'low'} 
                    onClick={() => setSelectedBet('low')}
                    color="border-red-500"
                />
            </div>

            {/* Amount Controls */}
            <div className="grid grid-cols-4 gap-2 mb-3">
                <button onClick={() => handleQuickAmount('min')} className="bg-[#333] hover:bg-[#444] text-[#ccc] text-[10px] font-bold py-2 rounded-lg border border-b-4 border-[#111] active:border-b-0 active:translate-y-1 transition-all">MIN</button>
                <button onClick={() => handleQuickAmount('double')} className="bg-[#333] hover:bg-[#444] text-[#ccc] text-[10px] font-bold py-2 rounded-lg border border-b-4 border-[#111] active:border-b-0 active:translate-y-1 transition-all">X2</button>
                <button onClick={() => handleQuickAmount('half')} className="bg-[#333] hover:bg-[#444] text-[#ccc] text-[10px] font-bold py-2 rounded-lg border border-b-4 border-[#111] active:border-b-0 active:translate-y-1 transition-all">X/2</button>
                <button onClick={() => handleQuickAmount('max')} className="bg-[#333] hover:bg-[#444] text-[#ccc] text-[10px] font-bold py-2 rounded-lg border border-b-4 border-[#111] active:border-b-0 active:translate-y-1 transition-all">MAX</button>
            </div>

            {/* Input & Play Row */}
            <div className="flex gap-3">
                
                {/* Input */}
                <div className="w-32 bg-[#0f172a] rounded-xl border border-[#334155] p-1 flex flex-col justify-center px-3 relative shadow-inner">
                    <span className="text-[10px] text-gray-500 font-bold absolute top-1 left-3">Amount</span>
                    <div className="flex items-baseline gap-1 mt-3">
                        <input 
                            type="number" 
                            value={betAmount} 
                            onChange={(e) => setBetAmount(e.target.value)} 
                            className="w-full bg-transparent text-white font-mono font-bold text-lg outline-none"
                        />
                        <span className="text-xs text-gray-500 font-bold">{symbol}</span>
                    </div>
                </div>

                {/* Play Button */}
                <button 
                    onClick={playGame}
                    disabled={isRolling}
                    className={`flex-1 rounded-xl flex items-center justify-center gap-3 transition-all transform active:scale-95 shadow-lg border-b-4 ${
                        isRolling 
                        ? 'bg-gray-600 border-gray-800 cursor-not-allowed opacity-80' 
                        : 'bg-gradient-to-br from-green-500 to-green-600 border-green-800 hover:brightness-110'
                    }`}
                >
                    <div className="w-10 h-10 bg-black/20 rounded-full flex items-center justify-center">
                        {isRolling ? <RefreshCw className="animate-spin text-white" size={20}/> : <Play className="text-white fill-white" size={20}/>}
                    </div>
                </button>

                {/* Wallet Toggle / Utility */}
                <div className="flex flex-col gap-2">
                    <button className="h-full px-4 bg-[#3b82f6] hover:bg-[#2563eb] rounded-xl border-b-4 border-[#1e40af] active:border-b-0 active:translate-y-1 transition-all flex items-center justify-center text-white">
                       <RefreshCw size={20}/>
                    </button>
                </div>
            </div>

        </div>

        {/* Inline CSS for 3D Dice */}
        <style>{`
            .perspective-1000 { perspective: 1000px; }
            .cube { width: 60px; height: 60px; position: relative; transform-style: preserve-3d; transition: transform 1s cubic-bezier(0.2, 0.8, 0.2, 1); }
            .face { 
                position: absolute; width: 60px; height: 60px; 
                background: linear-gradient(135deg, #ffffff 0%, #e2e8f0 100%); 
                border-radius: 12px; border: 1px solid #cbd5e1;
                display: flex; justify-content: center; align-items: center;
                box-shadow: inset 0 0 10px rgba(0,0,0,0.1);
            }
            .dot { width: 10px; height: 10px; background: #1e293b; border-radius: 50%; box-shadow: inset 1px 1px 2px rgba(0,0,0,0.5); }
            
            /* Face Transforms */
            .front  { transform: translateZ(30px); }
            .back   { transform: rotateY(180deg) translateZ(30px); }
            .right  { transform: rotateY(90deg) translateZ(30px); }
            .left   { transform: rotateY(-90deg) translateZ(30px); }
            .top    { transform: rotateX(90deg) translateZ(30px); }
            .bottom { transform: rotateX(-90deg) translateZ(30px); }

            /* Dot Positions */
            .face-1 { justify-content: center; }
            .face-2 { justify-content: space-between; padding: 10px; } .face-2 .dot:nth-child(2) { align-self: flex-end; }
            .face-3 { justify-content: space-between; padding: 10px; } .face-3 .dot:nth-child(2) { align-self: center; } .face-3 .dot:nth-child(3) { align-self: flex-end; }
            .face-4 { flex-wrap: wrap; justify-content: space-between; padding: 10px; } 
            .face-5 { flex-wrap: wrap; justify-content: space-between; padding: 10px; } .face-5 .dot:nth-child(2) { margin: 0 16px; }
            .face-6 { flex-wrap: wrap; justify-content: space-between; padding: 10px; }
            
            /* Rolling Animation Class */
            .animate-tumble { animation: tumble 0.5s infinite linear; }
            @keyframes tumble {
                0% { transform: rotateX(0) rotateY(0); }
                100% { transform: rotateX(360deg) rotateY(360deg); }
            }
        `}</style>
    </div>
  );
};

// --- SUB COMPONENTS ---

const BetOption = ({ label, multiplier, active, onClick, color }: any) => (
    <button 
        onClick={onClick}
        className={`relative flex flex-col items-center justify-center p-3 rounded-xl border-2 transition-all duration-200 ${active ? `${color} bg-[#1e293b] shadow-lg shadow-black/40` : 'border-[#334155] bg-[#0f172a] opacity-80'}`}
    >
        {/* Radio Indicator */}
        <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center mb-2 ${active ? 'border-white' : 'border-gray-600'}`}>
            {active && <div className="w-2 h-2 bg-white rounded-full"></div>}
        </div>
        <span className={`text-xs font-bold uppercase ${active ? 'text-white' : 'text-gray-400'}`}>{label}</span>
        <span className={`text-[10px] font-black mt-1 ${active ? 'text-white' : 'text-gray-500'}`}>{multiplier}</span>
    </button>
);

const Dice3D = ({ value, rolling, delay = 0 }: { value: number, rolling: boolean, delay?: number }) => {
    // Determine Rotation based on value
    // 1=front, 6=back, 2=top, 5=bottom, 3=right, 4=left (Mapping may vary based on UV, adjusting to match standard)
    const getTransform = (val: number) => {
        if(rolling) return {};
        // These rotations bring the target face to the front
        switch(val) {
            case 1: return { rotateX: 0, rotateY: 0 };
            case 6: return { rotateX: 180, rotateY: 0 }; 
            case 2: return { rotateX: -90, rotateY: 0 };
            case 5: return { rotateX: 90, rotateY: 0 };
            case 3: return { rotateX: 0, rotateY: -90 };
            case 4: return { rotateX: 0, rotateY: 90 };
            default: return { rotateX: 0, rotateY: 0 };
        }
    };
    
    // Add randomness to rotation for realism when stopping
    const transform = getTransform(value);
    
    return (
        <div className="scene w-[60px] h-[60px]">
            <motion.div 
                className={`cube ${rolling ? 'animate-tumble' : ''}`}
                animate={rolling ? {} : { 
                    rotateX: transform.rotateX, 
                    rotateY: transform.rotateY,
                    rotateZ: 0 
                }}
                transition={{ type: "spring", stiffness: 60, damping: 15, delay }}
            >
                <div className="face front face-1"><div className="dot"></div></div>
                <div className="face back face-6"><div className="dot"></div><div className="dot"></div><div className="dot"></div><div className="dot"></div><div className="dot"></div><div className="dot"></div></div>
                <div className="face right face-3"><div className="dot"></div><div className="dot"></div><div className="dot"></div></div>
                <div className="face left face-4"><div className="dot"></div><div className="dot"></div><div className="dot"></div><div className="dot"></div></div>
                <div className="face top face-2"><div className="dot"></div><div className="dot"></div></div>
                <div className="face bottom face-5"><div className="dot"></div><div className="dot"></div><div className="dot"></div><div className="dot"></div><div className="dot"></div></div>
            </motion.div>
        </div>
    );
};

export default Dice;
