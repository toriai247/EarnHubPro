
import React, { useState, useEffect, useRef } from 'react';
import GlassCard from '../components/GlassCard';
import { ArrowLeft, Volume2, VolumeX, Info, Pyramid, Eye, Gem, Sun, Anchor, Scroll, History, RefreshCw } from 'lucide-react';
import { Link } from 'react-router-dom';
import { supabase } from '../integrations/supabase/client';
import { updateWallet, createTransaction } from '../lib/actions';
import { useUI } from '../context/UIContext';
import BalanceDisplay from '../components/BalanceDisplay';
import { useCurrency } from '../context/CurrencyContext';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';

// --- CONFIG ---
// Symbols: Ankh (Anchor), Eye of Ra (Eye), Pyramid, Scarab (Gem-like), Phoenix (Sun-like)
const SYMBOLS = [
    { id: 'ankh', icon: Anchor, color: 'text-yellow-400', multiplier: 100, label: 'Ankh' },
    { id: 'eye', icon: Eye, color: 'text-blue-400', multiplier: 50, label: 'Eye of Ra' },
    { id: 'pyramid', icon: Pyramid, color: 'text-orange-400', multiplier: 20, label: 'Pyramid' },
    { id: 'scarab', icon: Gem, color: 'text-emerald-400', multiplier: 10, label: 'Scarab' },
    { id: 'phoenix', icon: Sun, color: 'text-red-500', multiplier: 5, label: 'Phoenix' },
];

const BET_OPTIONS = [1, 2, 3, 5, 10, 25];
const MIN_BET = 1;
const MAX_BET = 30;

const ReelsOfGods: React.FC = () => {
    const { toast } = useUI();
    const { format } = useCurrency();
    
    // Game State
    const [balance, setBalance] = useState(0);
    const [gameBalance, setGameBalance] = useState(0);
    const [betAmount, setBetAmount] = useState<string>('3');
    const [isSpinning, setIsSpinning] = useState(false);
    
    // Reel State (Indices of SYMBOLS)
    const [reels, setReels] = useState<number[]>([0, 1, 2]); 
    const [winData, setWinData] = useState<{win: boolean, amount: number, multiplier: number} | null>(null);
    
    const [soundOn, setSoundOn] = useState(true);

    // Audio
    const spinSfx = useRef(new Audio('https://assets.mixkit.co/active_storage/sfx/2003/2003-preview.mp3')); // Mechanical spin
    const winSfx = useRef(new Audio('https://assets.mixkit.co/active_storage/sfx/2019/2019-preview.mp3')); // Coins/Win
    
    useEffect(() => {
        fetchBalance();
        // Randomize initial reels
        setReels([
            Math.floor(Math.random() * SYMBOLS.length),
            Math.floor(Math.random() * SYMBOLS.length),
            Math.floor(Math.random() * SYMBOLS.length)
        ]);
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

    const playSound = (type: 'spin' | 'win') => {
        if (!soundOn) return;
        if (type === 'spin') {
            spinSfx.current.currentTime = 0;
            spinSfx.current.volume = 0.8; // Increased from 0.5
            spinSfx.current.play().catch(()=>{});
        } else {
            winSfx.current.currentTime = 0;
            winSfx.current.volume = 0.9; // Explicit high
            winSfx.current.play().catch(()=>{});
        }
    };

    const handleSpin = async () => {
        const amount = parseFloat(betAmount);
        
        if (isNaN(amount) || amount < MIN_BET || amount > MAX_BET) { 
            toast.error(`Stake must be between ${MIN_BET} and ${MAX_BET} EUR`); 
            return; 
        }
        
        let walletType: 'main' | 'game' = 'main';
        if (balance >= amount) walletType = 'main';
        else if (gameBalance >= amount) walletType = 'game';
        else { toast.error("Insufficient balance"); return; }

        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;

        setIsSpinning(true);
        setWinData(null);
        playSound('spin');

        // Deduct
        if (walletType === 'main') setBalance(prev => prev - amount);
        else setGameBalance(prev => prev - amount);

        // API Call (Background)
        createTransaction(session.user.id, 'game_bet', amount, `Reels of Gods Bet`);
        updateWallet(session.user.id, amount, 'decrement', walletType === 'main' ? 'main_balance' : 'game_balance');

        // Animation Delay (2 seconds)
        setTimeout(() => {
            finalizeSpin(amount, session.user.id);
        }, 2000);
    };

    const finalizeSpin = async (bet: number, userId: string) => {
        // Generate Result
        const r1 = Math.floor(Math.random() * SYMBOLS.length);
        const r2 = Math.floor(Math.random() * SYMBOLS.length);
        const r3 = Math.floor(Math.random() * SYMBOLS.length);
        
        setReels([r1, r2, r3]);
        setIsSpinning(false);

        // Logic
        let multiplier = 0;
        
        // 3 Match
        if (r1 === r2 && r2 === r3) {
            multiplier = SYMBOLS[r1].multiplier;
        } 
        // 2 Match (Any Pair) - Consolation
        else if (r1 === r2 || r2 === r3 || r1 === r3) {
            multiplier = 1.5; // Small win for 2 matches
        }

        const payout = bet * multiplier;
        
        if (payout > 0) {
            playSound('win');
            
            if (multiplier >= 10) {
                confetti({
                    particleCount: 150,
                    spread: 70,
                    origin: { y: 0.6 },
                    colors: ['#FFD700', '#FFA500', '#FFFFFF']
                });
            }

            setWinData({ win: true, amount: payout, multiplier });
            toast.success(`Win: ${format(payout)}!`);
            
            await updateWallet(userId, payout, 'increment', 'game_balance');
            await createTransaction(userId, 'game_win', payout, `Reels Win x${multiplier}`);
            setGameBalance(prev => prev + payout);
        } else {
            setWinData({ win: false, amount: 0, multiplier: 0 });
        }
        
        fetchBalance();
    };

    return (
        <div className="pb-32 pt-6 px-4 max-w-xl mx-auto min-h-screen relative overflow-hidden font-sans">
            
            {/* Background Sky */}
            <div className="absolute inset-0 bg-gradient-to-b from-[#1e3a8a] via-[#60a5fa] to-[#fde047] -z-20"></div>
            {/* Desert Floor */}
            <div className="absolute bottom-0 left-0 right-0 h-1/3 bg-[#d97706] -z-10" style={{ clipPath: 'polygon(0 40%, 100% 0, 100% 100%, 0% 100%)' }}></div>
            <div className="absolute bottom-0 left-0 right-0 h-1/4 bg-[#ea580c] -z-10 opacity-80" style={{ clipPath: 'polygon(0 60%, 100% 20%, 100% 100%, 0% 100%)' }}></div>

            {/* Header */}
            <div className="flex justify-between items-center mb-6 relative z-10">
               <div className="flex items-center gap-3">
                   <Link to="/games" className="p-3 bg-black/30 backdrop-blur-md rounded-2xl hover:bg-black/50 transition text-white border border-white/20">
                       <ArrowLeft size={20} />
                   </Link>
               </div>
               <div className="flex gap-2">
                   <button onClick={() => setSoundOn(!soundOn)} className="p-2 text-white hover:text-yellow-300 transition bg-black/30 backdrop-blur-md rounded-lg border border-white/20">
                       {soundOn ? <Volume2 size={20}/> : <VolumeX size={20}/>}
                   </button>
               </div>
            </div>

            {/* GAME FRAME - STONE TEMPLE LOOK */}
            <div className="relative z-10">
                
                {/* Title */}
                <div className="text-center mb-[-10px] relative z-20">
                    <h1 className="text-4xl font-black text-[#fcd34d] drop-shadow-[0_4px_0_#78350f] uppercase tracking-tighter" style={{ textShadow: '2px 2px 0 #000' }}>
                        REELS <span className="text-white text-2xl align-middle">OF</span> GODS
                    </h1>
                </div>

                {/* Machine Body */}
                <div className="bg-[#e7cba8] p-4 pt-8 rounded-t-2xl border-x-8 border-t-8 border-[#78350f] shadow-2xl relative">
                    
                    {/* Texture Overlay */}
                    <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/sandpaper.png')] opacity-40 pointer-events-none"></div>
                    
                    {/* Message Display */}
                    <div className="bg-[#d4b483] border-2 border-[#a16207] p-2 mb-4 text-center rounded relative shadow-inner">
                        <p className="text-[#451a03] font-bold text-xs uppercase tracking-widest">
                            {isSpinning ? 'Praying to the Gods...' : winData ? (winData.win ? `BIG WIN: ${format(winData.amount)}` : 'Try one more time!') : 'Place your bet'}
                        </p>
                    </div>

                    {/* REELS CONTAINER */}
                    <div className="bg-[#292524] p-3 rounded-lg border-4 border-[#ca8a04] shadow-[inset_0_0_20px_#000] relative overflow-hidden flex gap-2">
                        {/* Shine Effect */}
                        <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-transparent to-black/50 pointer-events-none z-20"></div>
                        
                        {/* 3 Reels */}
                        {[0, 1, 2].map((i) => {
                            const symbol = SYMBOLS[reels[i]];
                            const Icon = symbol.icon;

                            return (
                                <div key={i} className="flex-1 h-32 bg-[#e5e5e5] rounded border-2 border-[#78350f] relative overflow-hidden flex items-center justify-center shadow-inner">
                                    <AnimatePresence mode="popLayout">
                                        {isSpinning ? (
                                            <motion.div 
                                                key="spin"
                                                initial={{ y: -100, filter: 'blur(5px)' }}
                                                animate={{ y: [0, 1000], filter: 'blur(8px)' }}
                                                transition={{ repeat: Infinity, duration: 0.2, ease: 'linear' }}
                                                className="flex flex-col gap-8 items-center opacity-50"
                                            >
                                                {SYMBOLS.map((s, idx) => <s.icon key={idx} size={48} className="text-gray-400" />)}
                                            </motion.div>
                                        ) : (
                                            <motion.div 
                                                key="static"
                                                initial={{ y: -50, opacity: 0 }}
                                                animate={{ y: 0, opacity: 1 }}
                                                transition={{ type: "spring", stiffness: 300, damping: 20 }}
                                                className="flex flex-col items-center justify-center"
                                            >
                                                <div className={`p-2 rounded-full border-2 border-dashed border-opacity-30 ${symbol.color.replace('text', 'border')}`}>
                                                    <Icon size={56} className={`${symbol.color} drop-shadow-md`} strokeWidth={2.5} />
                                                </div>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>
                            );
                        })}

                        {/* Payline */}
                        <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-red-500/50 z-30 pointer-events-none"></div>
                    </div>

                    {/* Multiplier Info */}
                    <div className="flex justify-between items-center px-2 mt-2 text-[9px] font-bold text-[#78350f] opacity-80 uppercase">
                        <span>Ankh x100</span>
                        <span>Eye x50</span>
                        <span>Pyr x20</span>
                    </div>

                    {/* INPUT AREA */}
                    <div className="mt-4 bg-[#d4b483] p-3 rounded-xl border border-[#a16207]">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-[#451a03] font-bold text-xs uppercase">Bet Amount (EUR)</span>
                            <span className="text-[#451a03] font-bold text-xs">Max: 30</span>
                        </div>
                        <input 
                            type="number" 
                            value={betAmount} 
                            onChange={e => {
                                const val = parseFloat(e.target.value);
                                if (val > MAX_BET) setBetAmount(MAX_BET.toString());
                                else setBetAmount(e.target.value);
                            }}
                            className="w-full bg-[#fffbeb] border-2 border-[#a16207] rounded-lg p-2 text-center font-bold text-xl text-[#451a03] outline-none shadow-inner"
                        />
                    </div>

                    {/* BET BUTTONS GRID */}
                    <div className="grid grid-cols-3 gap-2 mt-3">
                        {BET_OPTIONS.map(amt => (
                            <button
                                key={amt}
                                onClick={() => setBetAmount(amt.toString())}
                                disabled={isSpinning}
                                className={`py-3 rounded-lg border-b-4 font-black text-sm transition-all active:border-b-0 active:translate-y-1 ${
                                    betAmount === amt.toString() 
                                    ? 'bg-[#fbbf24] border-[#d97706] text-[#451a03]' 
                                    : 'bg-[#f59e0b] border-[#b45309] text-[#fffbeb] hover:bg-[#fbbf24]'
                                }`}
                            >
                                {amt}
                            </button>
                        ))}
                    </div>

                    {/* BIG PLAY BUTTON */}
                    <div className="mt-4 flex items-center justify-between gap-4">
                        <div className="flex-1 flex flex-col items-center">
                            <span className="text-[10px] font-bold text-[#78350f] uppercase">Balance</span>
                            <span className="text-lg font-black text-[#451a03]"><BalanceDisplay amount={balance} /></span>
                        </div>
                        
                        <button 
                            onClick={handleSpin}
                            disabled={isSpinning}
                            className="relative group disabled:opacity-80"
                        >
                            <div className="absolute inset-0 bg-red-900 rounded-xl transform translate-y-2 group-active:translate-y-0 transition-transform"></div>
                            <div className="relative bg-gradient-to-br from-red-600 to-red-800 text-white px-8 py-4 rounded-xl font-black text-xl tracking-widest border-2 border-red-400 shadow-[inset_0_0_10px_rgba(0,0,0,0.5)] group-active:translate-y-2 transition-transform flex items-center gap-2">
                                {isSpinning ? <RefreshCw className="animate-spin"/> : 'PLAY'}
                            </div>
                        </button>
                        
                        <div className="flex-1 flex flex-col items-center">
                            <span className="text-[10px] font-bold text-[#78350f] uppercase">Win</span>
                            <span className="text-lg font-black text-[#451a03]"><BalanceDisplay amount={gameBalance} /></span>
                        </div>
                    </div>
                    
                    {/* Decorative Egyptian Pillars (CSS) */}
                    <div className="absolute top-0 bottom-0 -left-3 w-4 bg-[#a16207] border-r border-[#78350f] flex flex-col justify-around py-2">
                         {[1,2,3,4,5].map(i => <div key={i} className="w-full h-1 bg-[#78350f] opacity-30"></div>)}
                    </div>
                    <div className="absolute top-0 bottom-0 -right-3 w-4 bg-[#a16207] border-l border-[#78350f] flex flex-col justify-around py-2">
                         {[1,2,3,4,5].map(i => <div key={i} className="w-full h-1 bg-[#78350f] opacity-30"></div>)}
                    </div>

                </div>
                {/* Base of machine */}
                <div className="h-4 bg-[#78350f] rounded-b-xl mx-2 shadow-xl"></div>
            </div>

            {/* Rules */}
            <div className="mt-8 bg-black/40 backdrop-blur-md p-4 rounded-xl border border-white/10 text-xs text-gray-300 relative z-10">
                <h3 className="font-bold text-white mb-2 flex items-center gap-2"><Info size={14}/> How to Play</h3>
                <ul className="list-disc pl-4 space-y-1">
                    <li>Place a bet (Min 1, Max 30 EUR).</li>
                    <li>Match 3 symbols for the big multiplier win.</li>
                    <li>Match any 2 symbols for a 1.5x consolation prize.</li>
                    <li>Winnings are credited to your Game Wallet instantly.</li>
                </ul>
            </div>
        </div>
    );
};

export default ReelsOfGods;
