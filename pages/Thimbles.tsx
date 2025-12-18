
import React, { useState, useEffect, useRef } from 'react';
import GlassCard from '../components/GlassCard';
import { ArrowLeft, Volume2, VolumeX, HelpCircle, RefreshCw, Trophy, Wallet, ShieldAlert } from 'lucide-react';
import { Link } from 'react-router-dom';
import { supabase } from '../integrations/supabase/client';
import { updateWallet, createTransaction } from '../lib/actions';
import { getPlayableBalance, deductGameBalance, determineOutcome } from '../lib/gameMath';
import { useUI } from '../context/UIContext';
import BalanceDisplay from '../components/BalanceDisplay';
import { useCurrency } from '../context/CurrencyContext';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';

interface Cup {
    id: number;
    hasBall: boolean;
}

const Thimbles: React.FC = () => {
    const { toast } = useUI();
    const { symbol, format } = useCurrency();
    
    const [totalBalance, setTotalBalance] = useState(0);
    const [betAmount, setBetAmount] = useState<string>('10');
    const [ballCount, setBallCount] = useState<1 | 2>(1); 
    
    const [phase, setPhase] = useState<0 | 1 | 2 | 3 | 4>(0);
    const [revealAll, setRevealAll] = useState(false);
    
    const [cupOrder, setCupOrder] = useState<number[]>([0, 1, 2]); 
    const [cups, setCups] = useState<Cup[]>([{id:0, hasBall:false}, {id:1, hasBall:true}, {id:2, hasBall:false}]);
    const [selectedCupId, setSelectedCupId] = useState<number | null>(null);
    const [history, setHistory] = useState<string[]>([]);
    const [shuffleSpeed, setShuffleSpeed] = useState(0.4);
    const timeoutRef = useRef<any>(null);
    const [soundOn, setSoundOn] = useState(true);

    // Safety Settings
    const [stopLossStreak, setStopLossStreak] = useState<number>(0);
    const [consecutiveLosses, setConsecutiveLosses] = useState<number>(0);
    const [isAutoStopped, setIsAutoStopped] = useState(false);

    const shuffleSfx = useRef(new Audio('https://assets.mixkit.co/active_storage/sfx/2568/2568-preview.mp3'));
    const winSfx = useRef(new Audio('https://assets.mixkit.co/active_storage/sfx/1435/1435-preview.mp3'));
    const clickSfx = useRef(new Audio('https://assets.mixkit.co/active_storage/sfx/2571/2571-preview.mp3'));

    const MULTIPLIER = ballCount === 1 ? 2.91 : 1.45;

    useEffect(() => {
        fetchBalance();
        resetCups(1);
        return () => {
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
        };
    }, []);

    const fetchBalance = async () => {
        const { data: { session } } = await supabase.auth.getSession();
        if(session) {
            const bal = await getPlayableBalance(session.user.id);
            setTotalBalance(bal);
        }
    };

    const playSound = (type: 'shuffle' | 'win' | 'click') => {
        if (!soundOn) return;
        if (type === 'shuffle') {
            shuffleSfx.current.currentTime = 0;
            shuffleSfx.current.volume = 0.7; 
            shuffleSfx.current.play().catch(()=>{});
        } else if (type === 'win') {
            winSfx.current.currentTime = 0;
            winSfx.current.volume = 0.9; 
            winSfx.current.play().catch(()=>{});
        } else {
            clickSfx.current.currentTime = 0;
            clickSfx.current.volume = 0.6; 
            clickSfx.current.play().catch(()=>{});
        }
    };

    const resetCups = (balls: number) => {
        const newCups = [{id:0, hasBall:false}, {id:1, hasBall:false}, {id:2, hasBall:false}];
        let placed = 0;
        while(placed < balls) {
            const idx = Math.floor(Math.random() * 3);
            if(!newCups[idx].hasBall) {
                newCups[idx].hasBall = true;
                placed++;
            }
        }
        setCups(newCups);
        setCupOrder([0, 1, 2]); 
        setRevealAll(false);
        setSelectedCupId(null);
    };

    const handleQuickAmount = (action: 'min' | 'half' | 'double' | 'max') => {
        const current = parseFloat(betAmount) || 0;
        let next = current;
        if (action === 'min') next = 1;
        if (action === 'half') next = Math.max(1, current / 2);
        if (action === 'double') next = Math.min(500, current * 2);
        if (action === 'max') next = Math.min(500, totalBalance);
        setBetAmount(next.toFixed(0));
    };

    const startGame = async () => {
        if (isAutoStopped) {
            toast.info("Auto-stop active. Reset losses to continue.");
            return;
        }

        const amount = parseFloat(betAmount);
        
        if (isNaN(amount) || amount < 1) { toast.error("Minimum bet is 1 BDT"); return; }
        if (amount > 500) { toast.error("Maximum bet is 500 BDT"); return; }
        if (amount > totalBalance) { toast.error("Insufficient balance"); return; }

        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;

        try {
            await deductGameBalance(session.user.id, amount);
            setTotalBalance(prev => prev - amount);
            await createTransaction(session.user.id, 'game_bet', amount, `Thimbles Bet: ${ballCount} Ball(s)`);
        } catch (e: any) {
            toast.error(e.message);
            return;
        }

        resetCups(ballCount);
        setPhase(1); 

        setTimeout(() => {
            setPhase(2); 
            performShuffles();
        }, 1000);
    };

    const performShuffles = () => {
        let moves = 0;
        const totalMoves = 25; 

        const runShuffleStep = () => {
            if (moves >= totalMoves) {
                setPhase(3); 
                return;
            }

            let duration = 0.4;
            if (moves > 5) duration = 0.25;
            if (moves > 15) duration = 0.12;

            setShuffleSpeed(duration);
            
            setCupOrder(prev => {
                const newOrder = [...prev];
                const idx1 = Math.floor(Math.random() * 3);
                let idx2 = Math.floor(Math.random() * 3);
                while(idx1 === idx2) idx2 = Math.floor(Math.random() * 3);
                
                [newOrder[idx1], newOrder[idx2]] = [newOrder[idx2], newOrder[idx1]];
                return newOrder;
            });
            
            playSound('shuffle');
            moves++;

            timeoutRef.current = setTimeout(runShuffleStep, duration * 1000);
        };

        runShuffleStep();
    };

    const handlePick = async (cupId: number) => {
        if (phase !== 3) return;
        
        const { data: { session } } = await supabase.auth.getSession();
        if(!session) return;

        const winChance = ballCount === 1 ? 0.33 : 0.66;
        const outcome = await determineOutcome(session.user.id, winChance);
        
        const currentPickedCup = cups.find(c => c.id === cupId);
        const actuallyHasBall = currentPickedCup?.hasBall;

        let finalCups = [...cups];
        if (outcome === 'loss' && actuallyHasBall) {
            const emptyCup = finalCups.find(c => c.id !== cupId && !c.hasBall);
            if(emptyCup) {
                const pIdx = finalCups.findIndex(c => c.id === cupId);
                const eIdx = finalCups.findIndex(c => c.id === emptyCup.id);
                finalCups[pIdx].hasBall = false;
                finalCups[eIdx].hasBall = true;
            }
        } else if (outcome === 'win' && !actuallyHasBall) {
            const ballCup = finalCups.find(c => c.id !== cupId && c.hasBall);
            if(ballCup) {
                const pIdx = finalCups.findIndex(c => c.id === cupId);
                const bIdx = finalCups.findIndex(c => c.id === ballCup.id);
                finalCups[pIdx].hasBall = true;
                finalCups[bIdx].hasBall = false;
            }
        }
        
        setCups(finalCups);
        setSelectedCupId(cupId);
        setPhase(4);
        playSound('click');

        const finalPicked = finalCups.find(c => c.id === cupId);
        const isWin = finalPicked?.hasBall;
        const amount = parseFloat(betAmount);
        const payout = isWin ? amount * MULTIPLIER : 0;
        
        setTimeout(() => {
            setRevealAll(true);
        }, 600);

        setTimeout(async () => {
            setHistory(prev => [isWin ? 'win' : 'loss', ...prev].slice(0, 10));
            
            if (isWin) {
                setConsecutiveLosses(0);
                playSound('win');
                toast.success(`Won ${format(payout)}!`);
                confetti({
                    particleCount: 150,
                    spread: 70,
                    origin: { y: 0.6 },
                    colors: ['#FFD700', '#F43F5E']
                });
                
                await updateWallet(session.user.id, payout, 'increment', 'game_balance');
                await createTransaction(session.user.id, 'game_win', payout, `Thimbles Win`);
                setTotalBalance(prev => prev + payout);
            } else {
                const newStreak = consecutiveLosses + 1;
                setConsecutiveLosses(newStreak);
                if (stopLossStreak > 0 && newStreak >= stopLossStreak) {
                    setIsAutoStopped(true);
                    toast.warning(`Auto-stopped: reached ${stopLossStreak} consecutive losses.`);
                }
            }

            fetchBalance();
            setPhase(0);
            setRevealAll(false);
        }, 2500);
    };

    const resetSafety = () => {
        setConsecutiveLosses(0);
        setIsAutoStopped(false);
        toast.success("Safety settings reset.");
    };

    return (
        <div className="pb-32 pt-6 px-4 max-w-xl mx-auto min-h-screen relative overflow-hidden font-sans">
            
            <div className="flex justify-between items-center mb-6 relative z-10">
               <div className="flex items-center gap-3">
                   <Link to="/games" className="p-3 bg-white/5 rounded-2xl hover:bg-white/10 transition text-white border border-white/5">
                       <ArrowLeft size={20} />
                   </Link>
                   <h1 className="text-xl font-black text-white uppercase tracking-wider">Thimbles</h1>
               </div>
               <div className="flex gap-2">
                   <button onClick={() => setSoundOn(!soundOn)} className="p-2 text-gray-400 hover:text-white transition bg-white/5 rounded-lg border border-white/5">
                       {soundOn ? <Volume2 size={20}/> : <VolumeX size={20}/>}
                   </button>
               </div>
            </div>

            <div className="flex items-center justify-center gap-2 bg-black/40 px-6 py-3 rounded-full border border-yellow-500/30 shadow-[0_0_15px_rgba(234,179,8,0.1)] w-fit mx-auto mb-6">
                <Wallet size={20} className="text-yellow-500" />
                <span className="text-2xl font-black text-yellow-400 tracking-wide"><BalanceDisplay amount={totalBalance}/></span>
            </div>

            <div className="h-64 w-full bg-[#151515] rounded-3xl border border-white/10 relative overflow-hidden flex items-center justify-center mb-6 shadow-inner">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,#2a2a2a_0%,#151515_70%)]"></div>
                
                <div className="relative w-full max-w-sm h-32 flex justify-between px-4 sm:px-8">
                    {cups.map((cup) => {
                        const visualIndex = cupOrder.indexOf(cup.id);
                        
                        const isRaised = (phase === 1) || 
                                         (phase === 4 && selectedCupId === cup.id) || 
                                         (phase === 4 && revealAll);

                        const isSelected = selectedCupId === cup.id;
                        
                        const xPercent = (visualIndex - 1) * 110; 

                        return (
                            <motion.div
                                key={cup.id}
                                className="absolute top-0 left-1/2 w-20 h-24 cursor-pointer"
                                style={{ marginLeft: '-40px' }} 
                                animate={{ x: `${xPercent}%` }} 
                                transition={{ 
                                    type: "tween", 
                                    duration: phase === 2 ? shuffleSpeed : 0.5,
                                    ease: "easeInOut"
                                }}
                                onClick={() => handlePick(cup.id)}
                            >
                                <motion.div 
                                    className={`relative w-full h-full z-20 transition-transform ${isSelected ? 'scale-110' : ''}`}
                                    animate={{ y: isRaised ? -50 : 0 }} 
                                    transition={{ type: "spring", duration: 0.5 }}
                                >
                                    <div className="w-full h-full bg-gradient-to-b from-red-600 to-red-800 rounded-t-3xl rounded-b-lg border-x-2 border-t-2 border-red-400 shadow-xl relative overflow-hidden">
                                        <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-l from-white/20 to-transparent"></div>
                                        <div className="absolute bottom-4 left-0 right-0 h-3 bg-yellow-500/50"></div>
                                    </div>
                                </motion.div>

                                {cup.hasBall && (
                                    <div className="absolute bottom-2 left-1/2 -translate-x-1/2 w-8 h-8 bg-white rounded-full shadow-[inset_-2px_-2px_6px_rgba(0,0,0,0.3)] z-10">
                                        <div className="w-full h-full bg-gradient-to-br from-gray-100 to-gray-400 rounded-full"></div>
                                    </div>
                                )}
                            </motion.div>
                        );
                    })}
                </div>

                <div className="absolute bottom-4 text-xs font-bold text-gray-500 uppercase tracking-widest animate-pulse">
                    {phase === 0 ? 'Place your bet' : phase === 2 ? 'Shuffling...' : phase === 3 ? 'Pick a cup' : 'Result'}
                </div>
            </div>

            <div className="flex justify-center gap-2 mb-6 h-6">
                <AnimatePresence>
                    {history.map((res, i) => (
                        <motion.div 
                            key={i}
                            initial={{ scale: 0 }} animate={{ scale: 1 }}
                            className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold border ${res === 'win' ? 'bg-green-500 border-green-300 text-black' : 'bg-gray-700 border-gray-600 text-gray-400'}`}
                        >
                            {res === 'win' ? 'W' : 'L'}
                        </motion.div>
                    ))}
                </AnimatePresence>
            </div>

            <GlassCard className="p-5 border-white/10 bg-[#151515]">
                
                {/* Safety Setting */}
                <div className="flex items-center justify-between mb-4 bg-black/20 p-2 rounded-xl border border-white/5">
                    <div className="flex items-center gap-2">
                        <ShieldAlert size={14} className="text-orange-400" />
                        <span className="text-[10px] font-bold text-gray-400 uppercase">Stop on Loss Streak</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <input 
                            type="number" 
                            min="0"
                            value={stopLossStreak || ''}
                            onChange={e => setStopLossStreak(parseInt(e.target.value) || 0)}
                            placeholder="Off"
                            className="w-12 bg-black/40 border border-white/10 rounded px-1 py-0.5 text-xs text-white text-center outline-none focus:border-orange-500"
                        />
                        {consecutiveLosses > 0 && (
                            <div className="flex items-center gap-1">
                                <span className="text-[9px] text-red-400 font-bold">{consecutiveLosses} streak</span>
                                <button onClick={resetSafety} className="p-1 bg-white/5 rounded hover:bg-white/10 text-gray-500">
                                    <RefreshCw size={10} />
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                <div className="flex bg-black/40 p-1 rounded-xl mb-4 border border-white/5 relative">
                    <button 
                        onClick={() => setBallCount(1)}
                        disabled={phase !== 0}
                        className={`flex-1 py-3 rounded-lg text-xs font-bold uppercase transition flex items-center justify-center gap-2 ${ballCount === 1 ? 'bg-red-600 text-white shadow-lg' : 'text-gray-500 hover:text-white'}`}
                    >
                        <span className="w-3 h-3 rounded-full bg-white"></span> 1 Ball (x2.91)
                    </button>
                    <button 
                        onClick={() => setBallCount(2)}
                        disabled={phase !== 0}
                        className={`flex-1 py-3 rounded-lg text-xs font-bold uppercase transition flex items-center justify-center gap-2 ${ballCount === 2 ? 'bg-red-600 text-white shadow-lg' : 'text-gray-500 hover:text-white'}`}
                    >
                        <div className="flex gap-0.5"><span className="w-3 h-3 rounded-full bg-white"></span><span className="w-3 h-3 rounded-full bg-white"></span></div> 2 Balls (x1.45)
                    </button>
                </div>

                <div className="flex items-center gap-3 mb-4">
                    <div className="flex-1 relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 font-bold">{symbol}</span>
                        <input 
                            type="number" 
                            value={betAmount} 
                            onChange={e => setBetAmount(e.target.value)}
                            disabled={phase !== 0}
                            className="w-full bg-black/40 border border-white/10 rounded-xl py-4 pl-8 pr-4 text-white font-mono font-bold text-xl focus:border-red-500 outline-none transition-all placeholder:text-gray-700"
                        />
                    </div>
                    <button onClick={() => handleQuickAmount('max')} disabled={phase !== 0 || isAutoStopped} className="px-5 py-4 bg-white/5 rounded-xl text-xs font-bold hover:bg-white/10 text-red-500 border border-white/5">MAX</button>
                </div>

                <div className="grid grid-cols-4 gap-2 mb-6">
                    {['min', 'half', 'double', 'max'].map((action) => (
                        <button 
                            key={action}
                            onClick={() => handleQuickAmount(action as any)}
                            disabled={phase !== 0}
                            className="py-2.5 bg-white/5 rounded-lg text-xs font-bold text-gray-400 hover:text-white hover:bg-white/10 transition border border-white/5 active:scale-95 uppercase"
                        >
                            {action}
                        </button>
                    ))}
                </div>

                <button 
                    onClick={startGame} 
                    disabled={phase !== 0 || isAutoStopped}
                    className={`w-full py-4 rounded-xl font-black text-lg uppercase tracking-wider shadow-lg transition-all flex items-center justify-center gap-3 active:scale-[0.98] ${
                        phase !== 0 || isAutoStopped
                        ? 'bg-gray-800 text-gray-500 cursor-not-allowed border border-white/5' 
                        : 'bg-green-500 text-black hover:bg-green-400 shadow-green-500/20'
                    }`}
                >
                    {phase !== 0 ? <><RefreshCw size={20} className="animate-spin"/> RUNNING...</> : isAutoStopped ? 'AUTO STOPPED' : 'BET NOW'}
                </button>

            </GlassCard>
        </div>
    );
};

export default Thimbles;
