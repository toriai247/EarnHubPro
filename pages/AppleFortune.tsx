
import React, { useState, useEffect, useRef } from 'react';
import GlassCard from '../components/GlassCard';
import { ArrowLeft, Volume2, VolumeX, RefreshCw, Apple, Skull, Trophy, Play, AlertCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { supabase } from '../integrations/supabase/client';
import { updateWallet, createTransaction } from '../lib/actions';
import { useUI } from '../context/UIContext';
import BalanceDisplay from '../components/BalanceDisplay';
import { useCurrency } from '../context/CurrencyContext';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';

// --- CONFIG ---
const ROWS = 10;
const COLS = 5;
const MULTIPLIERS = [1.23, 1.54, 1.93, 2.41, 4.02, 6.71, 11.18, 27.97, 69.93, 349.68];

type CellStatus = 'hidden' | 'good' | 'bad' | 'revealed_good' | 'revealed_bad';

const AppleFortune: React.FC = () => {
    const { toast } = useUI();
    const { symbol, format } = useCurrency();
    
    // Game State
    const [balance, setBalance] = useState(0);
    const [gameBalance, setGameBalance] = useState(0);
    const [betAmount, setBetAmount] = useState<string>('10');
    
    // 'idle' | 'playing' | 'won' | 'lost' | 'cashed_out'
    const [gameState, setGameState] = useState<'idle' | 'playing' | 'won' | 'lost' | 'cashed_out'>('idle');
    const [currentStep, setCurrentStep] = useState(0); // 0 to 9 (Row Index)
    
    // Logic Grid (True = Bad Apple, False = Good Apple)
    const [mineGrid, setMineGrid] = useState<boolean[][]>([]); 
    
    // Visual Grid State
    const [gridHistory, setGridHistory] = useState<CellStatus[][]>(
        Array(ROWS).fill(null).map(() => Array(COLS).fill('hidden'))
    );
    
    const [soundOn, setSoundOn] = useState(true);

    // Audio
    const biteSfx = useRef(new Audio('https://assets.mixkit.co/active_storage/sfx/2043/2043-preview.mp3')); // Apple bite
    const winSfx = useRef(new Audio('https://assets.mixkit.co/active_storage/sfx/1435/1435-preview.mp3'));
    const loseSfx = useRef(new Audio('https://assets.mixkit.co/active_storage/sfx/2572/2572-preview.mp3')); // Explosion/Bad

    useEffect(() => {
        fetchBalance();
        resetVisualGrid();
        // Set volumes
        biteSfx.current.volume = 0.7;
        winSfx.current.volume = 0.9;
        loseSfx.current.volume = 0.8;
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

    // --- DIFFICULTY LOGIC ---
    const getBadAppleCount = (rowIdx: number) => {
        // Row 0 is Level 1
        if (rowIdx < 4) return 1; // Levels 1-4: 1 Bad Apple (4 Good)
        if (rowIdx < 7) return 2; // Levels 5-7: 2 Bad Apples (3 Good)
        if (rowIdx < 9) return 3; // Levels 8-9: 3 Bad Apples (2 Good)
        return 4;                 // Level 10: 4 Bad Apples (1 Good)
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
        
        let walletType: 'main' | 'game' = 'main';
        if (balance >= amount) walletType = 'main';
        else if (gameBalance >= amount) walletType = 'game';
        else { toast.error("Insufficient balance"); return; }

        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;

        // Deduct
        if (walletType === 'main') setBalance(prev => prev - amount);
        else setGameBalance(prev => prev - amount);

        // API Call
        createTransaction(session.user.id, 'game_bet', amount, `Apple Fortune Bet`);
        updateWallet(session.user.id, amount, 'decrement', walletType === 'main' ? 'main_balance' : 'game_balance');

        // Logic Setup
        const newMines = generateMineGrid();
        setMineGrid(newMines);
        setCurrentStep(0);
        resetVisualGrid();
        setGameState('playing');
    };

    const handleCellClick = async (rowIdx: number, colIdx: number) => {
        if (gameState !== 'playing') return;
        if (rowIdx !== currentStep) return; // Must play current active row

        const isBad = mineGrid[rowIdx] ? mineGrid[rowIdx][colIdx] : false;
        
        // Deep copy grid to ensure re-render
        const newGrid = gridHistory.map(row => [...row]);

        if (isBad) {
            // --- LOSS ---
            playSound('bad');
            setGameState('lost');
            
            // REVEAL ALL LOGIC
            for (let r = 0; r < ROWS; r++) {
                for (let c = 0; c < COLS; c++) {
                    const cellIsBad = mineGrid[r][c];
                    
                    if (r === rowIdx && c === colIdx) {
                        // The clicked bad apple
                        newGrid[r][c] = 'bad'; 
                    } else if (cellIsBad) {
                        // Other hidden bad apples
                        newGrid[r][c] = 'revealed_bad';
                    } else {
                        // Hidden good apples
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
            
            // Reveal other good/bad in this row only? No, usually others stay hidden until loss.
            // But let's verify if we want to show the 'bad' ones in this row to verify fairness?
            // Usually Apple of Fortune keeps them hidden until game over. We keep it standard.
            
            setGridHistory(newGrid);

            if (currentStep === ROWS - 1) {
                // MAX LEVEL REACHED - AUTO CLAIM
                await cashOut(true);
            } else {
                setCurrentStep(prev => prev + 1);
            }
        }
    };

    const cashOut = async (isMaxLevel: boolean = false) => {
        if (gameState !== 'playing') return;
        
        const winningIndex = isMaxLevel ? ROWS - 1 : currentStep - 1;
        if (winningIndex < 0) return; // Should not happen

        const multiplier = MULTIPLIERS[winningIndex];
        const amount = parseFloat(betAmount);
        const payout = amount * multiplier;

        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;

        setGameState(isMaxLevel ? 'won' : 'cashed_out');
        playSound('win');
        
        // Reveal remaining board if cashed out
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
        setGameBalance(prev => prev + payout);
        
        fetchBalance();
    };

    return (
        <div className="pb-32 pt-6 px-4 max-w-xl mx-auto min-h-screen relative overflow-hidden font-sans">
            
            {/* Header */}
            <div className="flex justify-between items-center mb-6 relative z-10">
               <div className="flex items-center gap-3">
                   <Link to="/games" className="p-3 bg-white/5 rounded-2xl hover:bg-white/10 transition text-white border border-white/5">
                       <ArrowLeft size={20} />
                   </Link>
                   <h1 className="text-xl font-black text-white uppercase tracking-wider">Apple Fortune</h1>
               </div>
               <div className="flex gap-2">
                   <button onClick={() => setSoundOn(!soundOn)} className="p-2 text-gray-500 hover:text-white transition bg-white/5 rounded-lg border border-white/5">
                       {soundOn ? <Volume2 size={20}/> : <VolumeX size={20}/>}
                   </button>
               </div>
            </div>

            {/* Game Container (Wood Theme) */}
            <div className="relative rounded-3xl overflow-hidden shadow-2xl border-4 border-[#3f2e18] bg-[#1a1109]">
                
                {/* Background Decoration */}
                <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/wood-pattern.png')] opacity-20"></div>
                <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-b from-[#2e1d0e]/80 to-[#120b06]/90 z-0"></div>
                
                {/* Vines/Leaves Decoration (CSS shapes) */}
                <div className="absolute top-0 left-0 w-32 h-32 bg-green-900/20 rounded-br-full blur-2xl z-0"></div>
                <div className="absolute bottom-0 right-0 w-40 h-40 bg-green-900/10 rounded-tl-full blur-3xl z-0"></div>

                <div className="relative z-10 p-4 sm:p-6 flex gap-4">
                    
                    {/* THE GRID */}
                    <div className="flex-1 flex flex-col-reverse gap-1.5">
                        {Array.from({ length: ROWS }).map((_, rIdx) => {
                            const isRowActive = gameState === 'playing' && rIdx === currentStep;
                            const isRowPast = rIdx < currentStep;
                            const rowMultiplier = MULTIPLIERS[rIdx];
                            const badCount = getBadAppleCount(rIdx);

                            return (
                                <div key={rIdx} className={`relative flex gap-1.5 h-10 sm:h-12 items-center justify-center p-1 rounded-lg transition-all duration-300 ${isRowActive ? 'bg-white/10 shadow-[0_0_15px_rgba(255,255,255,0.1)] border border-white/20' : 'bg-black/20 border border-white/5'}`}>
                                    
                                    {/* Multiplier Indicator */}
                                    <div className={`absolute -left-12 sm:-left-16 top-1/2 -translate-y-1/2 text-[10px] sm:text-xs font-bold font-mono transition-colors ${isRowActive ? 'text-white scale-110' : isRowPast ? 'text-green-500' : 'text-gray-600'}`}>
                                        x{rowMultiplier.toFixed(2)}
                                    </div>
                                    
                                    {/* Danger Level Indicator (Right Side) */}
                                    {isRowActive && (
                                        <div className="absolute -right-16 top-1/2 -translate-y-1/2 text-[9px] font-bold text-red-400 flex items-center gap-1 animate-pulse">
                                            <Skull size={10} /> {badCount} Bad
                                        </div>
                                    )}

                                    {Array.from({ length: COLS }).map((_, cIdx) => {
                                        // Safe access with optional chaining fallback
                                        const cellStatus = gridHistory[rIdx] ? gridHistory[rIdx][cIdx] : 'hidden';
                                        
                                        return (
                                            <button
                                                key={cIdx}
                                                disabled={!isRowActive}
                                                onClick={() => handleCellClick(rIdx, cIdx)}
                                                className={`flex-1 h-full rounded-md flex items-center justify-center relative overflow-hidden transition-all active:scale-95 ${
                                                    isRowActive 
                                                    ? 'bg-gradient-to-b from-[#5c4024] to-[#3d2a17] hover:brightness-110 cursor-pointer shadow-inner border-t border-[#7a5c3d]' 
                                                    : 'bg-[#261a10] opacity-80'
                                                }`}
                                            >
                                                {/* Hidden State (Card Back) */}
                                                {cellStatus === 'hidden' && (
                                                    <div className="w-full h-full flex items-center justify-center opacity-30">
                                                        <div className="w-1.5 h-1.5 rounded-full bg-[#8c6b4a]"></div>
                                                    </div>
                                                )}

                                                {/* Reveal Animation */}
                                                <AnimatePresence>
                                                    {cellStatus !== 'hidden' && (
                                                        <motion.div
                                                            initial={{ scale: 0, rotate: 180 }}
                                                            animate={{ scale: 1, rotate: 0 }}
                                                            className="relative z-10"
                                                        >
                                                            {(cellStatus === 'good' || cellStatus === 'revealed_good') && (
                                                                <div className={`drop-shadow-lg filter ${cellStatus === 'revealed_good' ? 'opacity-50 grayscale-[50%]' : ''}`}>
                                                                    <Apple size={24} className="text-red-500 fill-red-500" />
                                                                    {/* Shine */}
                                                                    <div className="absolute top-0 right-0 w-2 h-2 bg-white rounded-full opacity-40 blur-[1px]"></div>
                                                                </div>
                                                            )}
                                                            {(cellStatus === 'bad' || cellStatus === 'revealed_bad') && (
                                                                <div className="drop-shadow-lg filter relative">
                                                                    <Apple size={24} className="text-purple-900/50 fill-black" />
                                                                    <Skull size={16} className="text-gray-400 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                                                                    {cellStatus === 'bad' && (
                                                                        <div className="absolute inset-0 bg-red-500/40 blur-md rounded-full -z-10 animate-ping"></div>
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
            </div>

            {/* Controls */}
            <GlassCard className="mt-6 p-5 border-white/10 bg-[#151515] relative z-10">
                
                <div className="flex justify-between items-center mb-4">
                    <p className="text-xs text-gray-400 font-bold uppercase">Balance: <span className="text-white"><BalanceDisplay amount={balance}/></span></p>
                    <p className="text-xs text-gray-400 font-bold uppercase">Game Wallet: <span className="text-white"><BalanceDisplay amount={gameBalance}/></span></p>
                </div>

                {gameState === 'playing' ? (
                    <div className="flex gap-4">
                        <div className="flex-1 bg-black/40 rounded-xl p-3 border border-white/10 flex items-center justify-center flex-col">
                            <p className="text-[10px] text-gray-500 uppercase font-bold">Current Profit</p>
                            <p className="text-green-400 font-mono font-bold text-xl">
                                {currentStep > 0 ? (parseFloat(betAmount) * MULTIPLIERS[currentStep-1]).toFixed(2) : '0.00'}
                            </p>
                        </div>
                        <button 
                            onClick={() => cashOut(false)}
                            disabled={currentStep === 0}
                            className={`flex-1 py-3 rounded-xl font-black uppercase tracking-wider shadow-lg transition-all flex items-center justify-center gap-2 ${
                                currentStep > 0 
                                ? 'bg-green-500 text-black hover:bg-green-400 shadow-green-500/20' 
                                : 'bg-gray-800 text-gray-500 cursor-not-allowed border border-white/5'
                            }`}
                        >
                            <Trophy size={18} /> Take Win
                        </button>
                    </div>
                ) : (
                    <>
                        {/* Bet Amount */}
                        <div className="flex items-center gap-3 mb-4">
                            <div className="flex-1 relative">
                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 font-bold">{symbol}</span>
                                <input 
                                    type="number" 
                                    value={betAmount} 
                                    onChange={e => setBetAmount(e.target.value)}
                                    className="w-full bg-black/40 border border-white/10 rounded-xl py-4 pl-8 pr-4 text-white font-mono font-bold text-xl focus:border-green-500 outline-none transition-all placeholder:text-gray-700"
                                />
                            </div>
                            <button onClick={() => setBetAmount((balance).toFixed(0))} className="px-5 py-4 bg-white/5 rounded-xl text-xs font-bold hover:bg-white/10 text-green-500 border border-white/5">MAX</button>
                        </div>

                        {/* Amounts Grid */}
                        <div className="grid grid-cols-4 gap-2 mb-6">
                            {[10, 50, 100, 500].map(amt => (
                                <button 
                                    key={amt} 
                                    onClick={() => setBetAmount(amt.toString())}
                                    className="py-2.5 bg-white/5 rounded-lg text-xs font-bold text-gray-400 hover:text-white hover:bg-white/10 transition border border-white/5 active:scale-95"
                                >
                                    {amt}
                                </button>
                            ))}
                        </div>

                        {/* Info Note */}
                        {gameState === 'lost' && (
                            <div className="mb-4 p-3 bg-red-900/20 border border-red-500/20 rounded-xl flex items-center gap-2 text-xs text-red-200">
                                <AlertCircle size={14} className="text-red-500"/>
                                <span>Board Revealed. Try again?</span>
                            </div>
                        )}

                        {/* Play Button */}
                        <button 
                            onClick={startGame} 
                            className="w-full py-4 bg-gradient-to-r from-green-600 to-green-500 text-black font-black text-lg uppercase tracking-wider rounded-xl hover:scale-[1.02] active:scale-[0.98] transition shadow-lg shadow-green-900/30 flex items-center justify-center gap-2"
                        >
                            <Play size={20} fill="black" /> Place Bet
                        </button>
                    </>
                )}

            </GlassCard>
        </div>
    );
};

export default AppleFortune;
