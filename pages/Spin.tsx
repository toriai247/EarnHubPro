
import React, { useState, useEffect, useRef } from 'react';
import GlassCard from '../components/GlassCard';
import { ArrowLeft, Volume2, VolumeX, RefreshCw, Wallet, Zap, Trophy } from 'lucide-react';
import { Link } from 'react-router-dom';
import { supabase } from '../integrations/supabase/client';
import { updateWallet, createTransaction } from '../lib/actions';
import { getPlayableBalance, deductGameBalance, determineOutcome } from '../lib/gameMath';
import { useUI } from '../context/UIContext';
import BalanceDisplay from '../components/BalanceDisplay';
import { useCurrency } from '../context/CurrencyContext';
import { motion } from 'framer-motion';
import confetti from 'canvas-confetti';

const SEGMENTS = [
    { id: 0, multiplier: 0.0, color: '#1f2937', label: '0x' },    // Gray
    { id: 1, multiplier: 2.0, color: '#3b82f6', label: '2x' },    // Blue
    { id: 2, multiplier: 0.5, color: '#4b5563', label: '0.5x' },  // Light Gray
    { id: 3, multiplier: 5.0, color: '#a855f7', label: '5x' },    // Purple
    { id: 4, multiplier: 0.0, color: '#1f2937', label: '0x' },    // Gray
    { id: 5, multiplier: 1.5, color: '#22c55e', label: '1.5x' },  // Green
    { id: 6, multiplier: 0.0, color: '#1f2937', label: '0x' },    // Gray
    { id: 7, multiplier: 10.0, color: '#eab308', label: '10x' },  // Gold
];

const Spin: React.FC = () => {
    const { toast } = useUI();
    const { symbol, format } = useCurrency();
    
    const [totalBalance, setTotalBalance] = useState(0);
    const [betAmount, setBetAmount] = useState<string>('10');
    const [isSpinning, setIsSpinning] = useState(false);
    const [rotation, setRotation] = useState(0);
    const [soundOn, setSoundOn] = useState(true);

    const spinSfx = useRef(new Audio('https://assets.mixkit.co/active_storage/sfx/2003/2003-preview.mp3')); 
    const winSfx = useRef(new Audio('https://assets.mixkit.co/active_storage/sfx/2019/2019-preview.mp3')); 

    useEffect(() => {
        spinSfx.current.volume = 0.5;
        winSfx.current.volume = 0.8;
        fetchBalance();
    }, []);

    const fetchBalance = async () => {
        const { data: { session } } = await supabase.auth.getSession();
        if(session) {
            const bal = await getPlayableBalance(session.user.id);
            setTotalBalance(bal);
        }
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

    const handleSpin = async () => {
        const amount = parseFloat(betAmount);
        if (isNaN(amount) || amount <= 0) { toast.error("Invalid amount"); return; }
        if (amount > totalBalance) { toast.error("Insufficient balance"); return; }

        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;

        setIsSpinning(true);
        if (soundOn) {
            spinSfx.current.currentTime = 0;
            spinSfx.current.play().catch(() => {});
        }

        try {
            await deductGameBalance(session.user.id, amount);
            setTotalBalance(prev => prev - amount);
            await createTransaction(session.user.id, 'game_bet', amount, `Spin Wheel Bet`);
        } catch (e: any) {
            toast.error(e.message);
            setIsSpinning(false);
            return;
        }

        // Determine Outcome
        const winChance = 0.45; // 45% win rate
        const outcome = await determineOutcome(session.user.id, winChance);
        
        let targetIndex = 0;
        if (outcome === 'win') {
            // Pick a winning index (1, 3, 5, 7)
            const wins = [1, 3, 5, 7];
            // Weighted: 1.5x(40%), 2x(30%), 5x(20%), 10x(10%)
            const r = Math.random();
            if (r < 0.4) targetIndex = 5;       // 1.5x
            else if (r < 0.7) targetIndex = 1;  // 2x
            else if (r < 0.9) targetIndex = 3;  // 5x
            else targetIndex = 7;               // 10x
        } else {
            // Pick losing index (0, 2, 4, 6) - Note: index 2 is 0.5x (loss but not total)
            const losses = [0, 2, 4, 6];
            targetIndex = losses[Math.floor(Math.random() * losses.length)];
        }

        const segment = SEGMENTS[targetIndex];
        const extraSpins = 5;
        // Calculate degrees. Segment 0 is at 0-45deg (center 22.5). 
        // We want to land targetIndex at top (0deg).
        // Rotate BACKWARDS to bring index to 0.
        // Or standard: Target Rotation = Spins * 360 - (Index * 45 + 22.5) + Offset
        // Let's add random noise +/- 15 deg to land randomly within segment
        const noise = (Math.random() * 30) - 15;
        const segmentAngle = 360 / SEGMENTS.length; // 45
        // To align segment i to top: Rotation = - (i * 45 + 22.5)
        const baseTarget = -(targetIndex * segmentAngle + (segmentAngle / 2));
        const finalRotation = rotation + (360 * extraSpins) + (baseTarget - (rotation % 360)) + noise;

        setRotation(finalRotation);

        setTimeout(async () => {
            setIsSpinning(false);
            const payout = amount * segment.multiplier;
            
            if (payout > 0) {
                if (payout > amount) {
                    if (soundOn) winSfx.current.play().catch(()=>{});
                    toast.success(`Big Win! ${format(payout)}`);
                    confetti({
                        particleCount: 150,
                        spread: 70,
                        origin: { y: 0.6 },
                        colors: ['#FFD700', '#F43F5E']
                    });
                } else {
                    toast.info(`Result: ${format(payout)}`);
                }

                await updateWallet(session.user.id, payout, 'increment', 'game_balance');
                await createTransaction(session.user.id, 'game_win', payout, `Wheel Win x${segment.multiplier}`);
                setTotalBalance(prev => prev + payout);
            }

            fetchBalance();
        }, 3000); // 3s Spin duration
    };

    return (
        <div className="pb-32 pt-4 px-4 max-w-lg mx-auto min-h-screen relative font-sans flex flex-col">
            
            <div className="flex justify-between items-center mb-6 z-10">
               <div className="flex items-center gap-3">
                   <Link to="/games" className="p-2 bg-white/5 rounded-xl hover:bg-white/10 transition text-white border border-white/10">
                       <ArrowLeft size={20} />
                   </Link>
                   <h1 className="text-lg font-black text-white uppercase tracking-wider">Lucky Spin</h1>
               </div>
               <div className="flex items-center gap-2 bg-black/40 px-4 py-2 rounded-full border border-purple-500/30 shadow-[0_0_15px_rgba(168,85,247,0.1)]">
                    <Wallet size={16} className="text-purple-500" />
                    <span className="text-lg font-black text-purple-400 tracking-wide"><BalanceDisplay amount={totalBalance}/></span>
                </div>
            </div>

            <div className="flex-1 flex flex-col items-center justify-center relative z-10 min-h-[350px]">
                
                {/* Pointer */}
                <div className="absolute top-0 left-1/2 -translate-x-1/2 -mb-4 z-20 pointer-events-none">
                    <div className="w-0 h-0 border-l-[12px] border-l-transparent border-r-[12px] border-r-transparent border-t-[20px] border-t-white drop-shadow-lg"></div>
                </div>

                {/* Wheel Container */}
                <div className="relative w-72 h-72 sm:w-80 sm:h-80 rounded-full border-8 border-[#222] shadow-2xl overflow-hidden bg-[#111]">
                    <motion.div 
                        className="w-full h-full relative"
                        style={{ 
                            background: `conic-gradient(
                                #1f2937 0% 12.5%, 
                                #3b82f6 12.5% 25%, 
                                #4b5563 25% 37.5%, 
                                #a855f7 37.5% 50%, 
                                #1f2937 50% 62.5%, 
                                #22c55e 62.5% 75%, 
                                #1f2937 75% 87.5%, 
                                #eab308 87.5% 100%
                            )`
                        }}
                        animate={{ rotate: rotation }}
                        transition={{ duration: 3, ease: [0.15, 0.25, 0.25, 1] }}
                    >
                        {/* Center Cap */}
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-16 h-16 bg-[#222] rounded-full z-10 flex items-center justify-center shadow-lg border-4 border-gray-800">
                             <Trophy size={24} className="text-purple-500" />
                        </div>

                        {/* Labels */}
                        {SEGMENTS.map((seg, i) => (
                            <div 
                                key={i}
                                className="absolute top-0 left-1/2 w-full h-full -translate-x-1/2 flex justify-center pt-4"
                                style={{ transform: `rotate(${i * 45 + 22.5}deg)` }}
                            >
                                <span className="text-white font-black text-sm drop-shadow-md transform -rotate-90" style={{ writingMode: 'vertical-rl' }}>{seg.label}</span>
                            </div>
                        ))}
                    </motion.div>
                </div>
            </div>

            <GlassCard className="p-4 bg-[#151515] border-t border-white/10 rounded-t-3xl rounded-b-none -mx-4 pb-10 mt-6">
                
                {/* Bet Input */}
                <div className="flex items-center gap-3 mb-4">
                    <div className="bg-black/40 border border-white/10 rounded-xl px-4 py-2 flex-1 flex flex-col justify-center">
                         <p className="text-[9px] text-gray-500 font-bold uppercase">Bet Amount</p>
                         <div className="flex items-center gap-1">
                             <span className="text-gray-400 font-bold text-sm">{symbol}</span>
                             <input 
                                type="number" 
                                value={betAmount} 
                                onChange={e => setBetAmount(e.target.value)}
                                disabled={isSpinning}
                                className="bg-transparent text-white font-mono font-bold text-lg w-full outline-none"
                             />
                         </div>
                    </div>
                    <button 
                        onClick={handleSpin}
                        disabled={isSpinning}
                        className={`h-14 px-8 rounded-xl font-black uppercase text-sm shadow-lg flex items-center gap-2 transition active:scale-95 ${isSpinning ? 'bg-gray-700 text-gray-500 cursor-not-allowed' : 'bg-purple-600 text-white hover:bg-purple-500 shadow-purple-900/20'}`}
                    >
                        {isSpinning ? <RefreshCw className="animate-spin" /> : 'SPIN'}
                    </button>
                </div>

                {/* Quick Amounts */}
                <div className="grid grid-cols-4 gap-2">
                    {['min', 'half', 'double', 'max'].map((action) => (
                        <button 
                            key={action}
                            onClick={() => handleQuickAmount(action as any)}
                            disabled={isSpinning}
                            className="py-2 bg-white/5 rounded-lg text-[10px] font-bold text-gray-400 hover:text-white hover:bg-white/10 border border-white/5 uppercase"
                        >
                            {action}
                        </button>
                    ))}
                </div>

                <div className="mt-4 flex justify-center gap-4 text-[10px] text-gray-500 font-bold uppercase tracking-widest">
                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-500"></span> 2x</span>
                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-purple-500"></span> 5x</span>
                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-yellow-500"></span> 10x</span>
                </div>

            </GlassCard>
        </div>
    );
};

export default Spin;
