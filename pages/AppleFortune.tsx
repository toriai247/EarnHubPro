
import React, { useState, useEffect, useRef } from 'react';
import GlassCard from '../components/GlassCard';
import { ArrowLeft, Volume2, VolumeX, RefreshCw, Apple, Skull, Trophy, Play, AlertCircle, HelpCircle, ChevronRight, Wallet } from 'lucide-react';
import { Link } from 'react-router-dom';
import { supabase } from '../integrations/supabase/client';
import { updateWallet, createTransaction } from '../lib/actions';
import { getPlayableBalance, deductGameBalance, determineOutcome } from '../lib/gameMath';
import { useUI } from '../context/UIContext';
import BalanceDisplay from '../components/BalanceDisplay';
import { useCurrency } from '../context/CurrencyContext';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';

const ROWS = 10;
const COLS = 5;
const MULTIPLIERS = [1.23, 1.54, 1.93, 2.41, 4.02, 6.71, 11.18, 27.97, 69.93, 349.68];

type CellStatus = 'hidden' | 'good' | 'bad' | 'revealed_good' | 'revealed_bad';

const AppleFortune: React.FC = () => {
    const { toast } = useUI();
    const { symbol, format } = useCurrency();
    
    const [totalBalance, setTotalBalance] = useState(0);
    const [betAmount, setBetAmount] = useState<string>('10');
    
    const [gameState, setGameState] = useState<'idle' | 'playing' | 'won' | 'lost' | 'cashed_out'>('idle');
    const [currentStep, setCurrentStep] = useState(0); 
    const [mineGrid, setMineGrid] = useState<boolean[][]>([]); 
    const [gridHistory, setGridHistory] = useState<CellStatus[][]>(
        Array(ROWS).fill(null).map(() => Array(COLS).fill('hidden'))
    );
    const [soundOn, setSoundOn] = useState(true);

    const biteSfx = useRef(new Audio('https://assets.mixkit.co/active_storage/sfx/2043/2043-preview.mp3')); 
    const winSfx = useRef(new Audio('https://assets.mixkit.co/active_storage/sfx/1435/1435-preview.mp3'));
    const loseSfx = useRef(new Audio('https://assets.mixkit.co/active_storage/sfx/2572/2572-preview.mp3')); 

    useEffect(() => {
        fetchBalance();
        resetVisualGrid();
        biteSfx.current.volume = 0.6;
        winSfx.current.volume = 0.8;
        loseSfx.current.volume = 0.7;
    }, []);

    const fetchBalance = async () => {
        const { data: { session } } = await supabase.auth.getSession();
        if(session) {
            const bal = await getPlayableBalance(session.user.id);
            setTotalBalance(bal);
        }
    };

    const playSound = (type: 'good' | 'bad' | 'win') => {
        if (!soundOn) return;
        if (type === 'good') {
            biteSfx.current.currentTime = 0;
            biteSfx.current.play().catch(()=>{});
        } else if (type === 'bad') {
            loseSfx.current.currentTime = 0;
            loseSfx.current.play().catch(()=>{});
        } else {
            winSfx.current.currentTime = 0;
            winSfx.current.play().catch(()=>{});
        }
    };

    const resetVisualGrid = () => {
        const emptyGrid = Array(ROWS).fill(null).map(() => Array(COLS).fill('hidden'));
        setGridHistory(emptyGrid);
    };

    const getBadAppleCount = (rowIdx: number) => {
        if (rowIdx < 4) return 1; 
        if (rowIdx < 7) return 2; 
        if (rowIdx < 9) return 3; 
        return 4;                 
    };

    const generateMineGrid = () => {
        const newGrid: boolean[][] = [];
        for (let r = 0; r < ROWS; r++) {
            const rowData = Array(COLS).fill(false);
            const badCount = getBadAppleCount(r);
            let placed = 0;
            while (placed < badCount) {
                const idx = Math.floor(Math.random() * COLS);
                if (!rowData[idx]) {
                    rowData[idx] = true;
                    placed++;
                }
            }
            newGrid.push(rowData);
        }
        return newGrid;
    };

    const startGame = async () => {
        const amount = parseFloat(betAmount);
        if (isNaN(amount) || amount <= 0) { toast.error("Invalid amount"); return; }
        if (amount > totalBalance) { toast.error("Insufficient balance"); return; }

        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;

        // Deduct
        try {
            await deductGameBalance(session.user.id, amount);
            setTotalBalance(prev => prev - amount);
            
            await createTransaction(session.user.id, 'game_bet', amount, `Apple Fortune Bet`);
        } catch (e: any) {
            toast.error(e.message);
            return;
        }

        // Logic Setup
        const newMines = generateMineGrid();
        setMineGrid(newMines);
        setCurrentStep(0);
        resetVisualGrid();
        setGameState('playing');
    };

    const handleCellClick = async (rowIdx: number, colIdx: number) => {
        if (gameState !== 'playing') return;
        if (rowIdx !== currentStep) return;

        const { data: { session } } = await supabase.auth.getSession();
        if(!session) return;

        // RIGGING CHECK
        // Every step is a gamble. We check win probability.
        // Base probability depends on bad apple count.
        // 1 Bad = 80% win rate. 2 Bad = 60%. 3 Bad = 40%. 4 Bad = 20%.
        const badCount = getBadAppleCount(rowIdx);
        const naturalWinChance = (5 - badCount) / 5;
        
        // Ask rigging engine for outcome
        const outcome = await determineOutcome(session.user.id, naturalWinChance);

        // Check if selected cell is actually bad
        let isBad = mineGrid[rowIdx] ? mineGrid[rowIdx][colIdx] : false;

        // Apply Rigging
        if (outcome === 'loss' && !isBad) {
            // Force Loss: User picked Good, but we want Loss. Make it Bad.
            isBad = true;
            // Also update underlying grid for consistency if we revealed all
            const newMines = [...mineGrid];
            newMines[rowIdx][colIdx] = true; 
            // We need to ensure we don't exceed bad count, so flip another bad to good if needed
            // But for simplicity, just marking this one bad is enough to kill them.
        } else if (outcome === 'win' && isBad) {
            // Force Win: User picked Bad, but we want Win. Make it Good.
            isBad = false;
        }

        const newGrid = gridHistory.map(row => [...row]);

        if (isBad) {
            // --- LOSS ---
            playSound('bad');
            setGameState('lost');
            
            // REVEAL ALL
            for (let r = 0; r < ROWS; r++) {
                for (let c = 0; c < COLS; c++) {
                    const cellIsBad = r === rowIdx && c === colIdx ? true : mineGrid[r][c]; // Use dynamic result
                    
                    if (r === rowIdx && c === colIdx) {
                        newGrid[r][c] = 'bad'; 
                    } else if (cellIsBad) {
                        newGrid[r][c] = 'revealed_bad';
                    } else {
                        if (newGrid[r][c] === 'hidden') {
                            newGrid[r][c] = 'revealed_good';
                        }
                    }
                }
            }
            
            setGridHistory(newGrid);
            fetchBalance();

        } else {
            // --- WIN STEP ---
            playSound('good');
            newGrid[rowIdx][colIdx] = 'good';
            setGridHistory(newGrid);

            if (currentStep === ROWS - 1) {
                await cashOut(true);
            } else {
                setCurrentStep(prev => prev + 1);
            }
        }
    };

    const cashOut = async (isMaxLevel: boolean = false) => {
        if (gameState !== 'playing') return;
        
        const winningIndex = isMaxLevel ? ROWS - 1 : currentStep - 1;
        if (winningIndex < 0) return;

        const multiplier = MULTIPLIERS[winningIndex];
        const amount = parseFloat(betAmount);
        const payout = amount * multiplier;

        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;

        setGameState(isMaxLevel ? 'won' : 'cashed_out');
        playSound('win');
        
        const newGrid = gridHistory.map(row => [...row]);
        for(let r=0; r<ROWS; r++) {
            for(let c=0; c<COLS; c++) {
                if(newGrid[r][c] === 'hidden') {
                    newGrid[r][c] = mineGrid[r][c] ? 'revealed_bad' : 'revealed_good';
                }
            }
        }
        setGridHistory(newGrid);
        
        confetti({
            particleCount: 150,
            spread: 70,
            origin: { y: 0.6 },
            colors: ['#4ade80', '#ef4444'] 
        });

        toast.success(`Won ${format(payout)}!`);

        await updateWallet(session.user.id, payout, 'increment', 'game_balance');
        await createTransaction(session.user.id, 'game_win', payout, `Apple Fortune: x${multiplier}`);
        setTotalBalance(prev => prev + payout);
        
        fetchBalance();
    };

    return (
        <div className="pb-32 pt-6 px-4 max-w-xl mx-auto min-h-screen relative overflow-hidden font-sans">
            
            <div className="flex justify-between items-center mb-6 relative z-10">
               <div className="flex items-center gap-3">
                   <Link to="/games" className="p-3 bg-white/5 rounded-2xl hover:bg-white/10 transition text-white border border-white/5 backdrop-blur-md">
                       <ArrowLeft size={20} />
                   </Link>
                   <h1 className="text-xl font-black text-white uppercase tracking-wider flex items-center gap-2">
                       Apple Fortune
                   </h1>
               </div>
               <div className="flex gap-2">
                   <button onClick={() => setSoundOn(!soundOn)} className="p-2 text-gray-400 hover:text-white transition bg-white/5 rounded-xl border border-white/5 backdrop-blur-md">
                       {soundOn ? <Volume2 size={20}/> : <VolumeX size={20}/>}
                   </button>
               </div>
            </div>

            <div className="relative rounded-[32px] overflow-hidden shadow-2xl border-4 border-[#3f2e18] bg-[#1a1109]">
                <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/wood-pattern.png')] opacity-20"></div>
                <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-b from-[#2e1d0e]/80 to-[#120b06]/90 z-0"></div>
                
                <div className="absolute top-0 left-0 w-32 h-32 bg-green-900/20 rounded-br-full blur-2xl z-0"></div>
                <div className="absolute bottom-0 right-0 w-40 h-40 bg-green-900/10 rounded-tl-full blur-3xl z-0"></div>

                <div className="relative z-10 p-5 flex gap-4">
                    <div className="hidden sm:flex flex-col-reverse justify-between py-1 pr-2 border-r border-white/5 w-16">
                        {MULTIPLIERS.map((m, i) => (
                            <div key={i} className={`text-[10px] font-mono font-bold text-right transition-colors ${i === currentStep && gameState === 'playing' ? 'text-white scale-110' : i < currentStep ? 'text-green-500' : 'text-gray-700'}`}>
                                x{m.toFixed(2)}
                            </div>
                        ))}
                    </div>

                    <div className="flex-1 flex flex-col-reverse gap-2">
                        {Array.from({ length: ROWS }).map((_, rIdx) => {
                            const isRowActive = gameState === 'playing' && rIdx === currentStep;
                            const isRowPast = rIdx < currentStep;
                            const rowMultiplier = MULTIPLIERS[rIdx];
                            const badCount = getBadAppleCount(rIdx);

                            return (
                                <div key={rIdx} className={`relative flex gap-2 h-10 sm:h-12 items-center justify-center p-1 rounded-xl transition-all duration-300 ${
                                    isRowActive 
                                    ? 'bg-gradient-to-r from-purple-500/10 to-blue-500/10 border border-blue-500/30 shadow-[0_0_15px_rgba(59,130,246,0.15)]' 
                                    : 'bg-white/5 border border-white/5 opacity-80'
                                }`}>
                                    
                                    <div className={`absolute -left-3 top-1/2 -translate-y-1/2 text-[9px] font-bold px-1.5 py-0.5 rounded bg-black/60 backdrop-blur-sm border border-white/10 sm:hidden transition-colors ${isRowActive ? 'text-white border-blue-500/50' : isRowPast ? 'text-green-400' : 'text-gray-600'}`}>
                                        x{rowMultiplier.toFixed(2)}
                                    </div>

                                    {isRowActive && (
                                        <div className="absolute -right-3 top-1/2 -translate-y-1/2 text-[8px] font-bold text-red-400 bg-red-900/30 px-1.5 py-0.5 rounded border border-red-500/30 backdrop-blur-md flex items-center gap-1 animate-pulse">
                                            <Skull size={8} /> {badCount} Bad
                                        </div>
                                    )}

                                    {Array.from({ length: COLS }).map((_, cIdx) => {
                                        const cellStatus = gridHistory[rIdx] ? gridHistory[rIdx][cIdx] : 'hidden';
                                        
                                        return (
                                            <button
                                                key={cIdx}
                                                disabled={!isRowActive}
                                                onClick={() => handleCellClick(rIdx, cIdx)}
                                                className={`flex-1 h-full rounded-lg flex items-center justify-center relative overflow-hidden transition-all active:scale-95 ${
                                                    isRowActive 
                                                    ? 'bg-white/10 hover:bg-white/20 cursor-pointer shadow-inner' 
                                                    : 'bg-black/20 cursor-default'
                                                }`}
                                            >
                                                {cellStatus === 'hidden' && (
                                                    <div className={`w-full h-full flex items-center justify-center opacity-20 ${isRowActive ? 'animate-pulse' : ''}`}>
                                                        <HelpCircle size={14} />
                                                    </div>
                                                )}

                                                <AnimatePresence>
                                                    {cellStatus !== 'hidden' && (
                                                        <motion.div
                                                            initial={{ scale: 0.5, rotateY: 180, opacity: 0 }}
                                                            animate={{ scale: 1, rotateY: 0, opacity: 1 }}
                                                            className="relative z-10"
                                                        >
                                                            {(cellStatus === 'good' || cellStatus === 'revealed_good') && (
                                                                <div className={`drop-shadow-[0_0_10px_rgba(239,68,68,0.5)] filter ${cellStatus === 'revealed_good' ? 'opacity-40 grayscale' : ''}`}>
                                                                    <Apple size={22} className="text-red-500 fill-red-500" strokeWidth={2.5} />
                                                                    {cellStatus === 'good' && <div className="absolute inset-0 bg-red-500 blur-lg opacity-30 animate-pulse"></div>}
                                                                </div>
                                                            )}
                                                            {(cellStatus === 'bad' || cellStatus === 'revealed_bad') && (
                                                                <div className="relative">
                                                                    <div className="absolute inset-0 bg-black/50 rounded-full blur-md"></div>
                                                                    <Apple size={22} className="text-purple-900/80 fill-black relative z-10 opacity-50" />
                                                                    <Skull size={14} className="text-gray-400 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20" />
                                                                    {cellStatus === 'bad' && (
                                                                        <motion.div 
                                                                            initial={{ scale: 0 }} animate={{ scale: 1.5, opacity: 0 }} 
                                                                            className="absolute inset-0 bg-red-500 rounded-full z-0"
                                                                        />
                                                                    )}
                                                                </div>
                                                            )}
                                                        </motion.div>
                                                    )}
                                                </AnimatePresence>
                                            </button>
                                        );
                                    })}
                                </div>
                            );
                        })}
                    </div>
                </div>
                
                <div className="h-1.5 w-full bg-gradient-to-r from-blue-600 to-purple-600 opacity-50"></div>
            </div>

            <GlassCard className="mt-6 p-5 border-white/10 bg-[#0f0f0f] relative z-10 rounded-[24px]">
                
                <div className="flex justify-between items-center mb-4 text-xs font-bold text-gray-500 uppercase tracking-wide">
                     <span className="flex items-center gap-1"><Wallet size={14} className="text-yellow-500"/> Total: <span className="text-white font-mono"><BalanceDisplay amount={totalBalance}/></span></span>
                </div>

                {gameState === 'playing' ? (
                    <div className="flex gap-4 items-stretch">
                        <div className="flex-1 bg-black/40 rounded-2xl p-3 border border-white/5 flex items-center justify-center flex-col">
                            <p className="text-[9px] text-gray-500 uppercase font-bold tracking-widest mb-1">Current Profit</p>
                            <p className="text-green-400 font-mono font-black text-2xl tracking-tighter">
                                {currentStep > 0 ? (parseFloat(betAmount) * MULTIPLIERS[currentStep-1]).toFixed(2) : '0.00'}
                            </p>
                        </div>
                        <button 
                            onClick={() => cashOut(false)}
                            disabled={currentStep === 0}
                            className={`flex-1 py-3 rounded-2xl font-black uppercase tracking-wider shadow-lg transition-all flex flex-col items-center justify-center gap-1 ${
                                currentStep > 0 
                                ? 'bg-green-500 text-black hover:bg-green-400 shadow-green-500/20 hover:scale-[1.02]' 
                                : 'bg-gray-800 text-gray-500 cursor-not-allowed border border-white/5'
                            }`}
                        >
                            <div className="flex items-center gap-2 text-sm">
                                <Trophy size={16} /> TAKE WIN
                            </div>
                            {currentStep > 0 && <span className="text-[10px] opacity-80 font-mono">x{MULTIPLIERS[currentStep-1]}</span>}
                        </button>
                    </div>
                ) : (
                    <>
                        <div className="flex items-center gap-3 mb-4">
                            <div className="flex-1 relative group">
                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 font-bold group-focus-within:text-green-500 transition-colors">{symbol}</span>
                                <input 
                                    type="number" 
                                    value={betAmount} 
                                    onChange={e => setBetAmount(e.target.value)}
                                    className="w-full bg-black/40 border border-white/10 rounded-2xl py-4 pl-8 pr-4 text-white font-mono font-bold text-xl focus:border-green-500 outline-none transition-all placeholder:text-gray-700"
                                />
                            </div>
                            <button onClick={() => setBetAmount((totalBalance).toFixed(0))} className="px-5 py-4 bg-white/5 rounded-2xl text-xs font-bold hover:bg-white/10 text-green-500 border border-white/5 transition hover:scale-105 active:scale-95">MAX</button>
                        </div>

                        <div className="grid grid-cols-4 gap-2 mb-6">
                            {[10, 50, 100, 500].map(amt => (
                                <button 
                                    key={amt} 
                                    onClick={() => setBetAmount(amt.toString())}
                                    className="py-3 bg-white/5 rounded-xl text-xs font-bold text-gray-400 hover:text-white hover:bg-white/10 transition border border-white/5 active:scale-95"
                                >
                                    {amt}
                                </button>
                            ))}
                        </div>

                        {gameState === 'lost' && (
                            <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center justify-center gap-2 text-xs text-red-400 font-medium">
                                <AlertCircle size={14} />
                                <span>Game Over. Try again?</span>
                            </div>
                        )}

                        <button 
                            onClick={startGame} 
                            className="w-full py-4 bg-white text-black font-black text-lg uppercase tracking-wider rounded-2xl hover:bg-gray-200 transition shadow-lg hover:shadow-xl active:scale-[0.98] flex items-center justify-center gap-3"
                        >
                            START GAME <ChevronRight size={20} strokeWidth={3} />
                        </button>
                    </>
                )}

            </GlassCard>
        </div>
    );
};

export default AppleFortune;
