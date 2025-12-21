
import React, { useState, useEffect, useRef } from 'react';
import GlassCard from '../components/GlassCard';
import { 
  ArrowLeft, Volume2, VolumeX, RefreshCw, Apple, Skull, 
  Trophy, Play, AlertCircle, HelpCircle, ChevronRight, 
  Wallet, CheckCircle2, Zap, Sparkles 
} from 'lucide-react';
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
    const [betAmount, setBetAmount] = useState<string>('20');
    const [gameState, setGameState] = useState<'idle' | 'playing' | 'won' | 'lost' | 'cashed_out'>('idle');
    const [currentStep, setCurrentStep] = useState(0); 
    const [mineGrid, setMineGrid] = useState<boolean[][]>([]); 
    const [gridHistory, setGridHistory] = useState<CellStatus[][]>(Array(ROWS).fill(null).map(() => Array(COLS).fill('hidden')));
    const [soundOn, setSoundOn] = useState(true);

    const biteSfx = useRef(new window.Audio('https://assets.mixkit.co/active_storage/sfx/2043/2043-preview.mp3'));
    const winSfx = useRef(new window.Audio('https://assets.mixkit.co/active_storage/sfx/1435/1435-preview.mp3'));
    const loseSfx = useRef(new window.Audio('https://assets.mixkit.co/active_storage/sfx/2572/2572-preview.mp3'));

    useEffect(() => {
        fetchBalance();
        biteSfx.current.volume = 0.7;
        winSfx.current.volume = 0.9;
        loseSfx.current.volume = 0.8;
    }, []);

    const fetchBalance = async () => {
        const { data: { session } } = await supabase.auth.getSession();
        if(session) {
            const bal = await getPlayableBalance(session.user.id);
            setTotalBalance(bal);
        }
    };

    const handleQuickAmount = (action: string) => {
        if (gameState === 'playing') return;
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

    const startGame = async () => {
        const amount = parseFloat(betAmount);
        if (isNaN(amount) || amount < 1) { toast.error("Min bet 1 TK"); return; }
        if (amount > totalBalance) { toast.error("Insufficient balance"); return; }
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;
        try {
            await deductGameBalance(session.user.id, amount, 'Apple Fortune');
            setTotalBalance(prev => prev - amount);
            await createTransaction(session.user.id, 'game_bet', amount, `Apple Start`);
            setMineGrid(generateMineGrid());
            setCurrentStep(0);
            setGridHistory(Array(ROWS).fill(null).map(() => Array(COLS).fill('hidden')));
            setGameState('playing');
        } catch (e: any) { toast.error(e.message); }
    };

    const generateMineGrid = () => {
        const newGrid: boolean[][] = [];
        for (let r = 0; r < ROWS; r++) {
            const rowData = Array(COLS).fill(false);
            const badCount = r < 4 ? 1 : r < 7 ? 2 : r < 9 ? 3 : 4;
            let placed = 0;
            while (placed < badCount) {
                const idx = Math.floor(Math.random() * COLS);
                if (!rowData[idx]) { rowData[idx] = true; placed++; }
            }
            newGrid.push(rowData);
        }
        return newGrid;
    };

    const handleCellClick = async (rowIdx: number, colIdx: number) => {
        if (gameState !== 'playing' || rowIdx !== currentStep) return;
        const { data: { session } } = await supabase.auth.getSession();
        if(!session) return;
        const isBad = mineGrid[rowIdx][colIdx];
        const newGrid = gridHistory.map(row => [...row]);
        if (isBad) {
            if (soundOn) loseSfx.current.play().catch(() => {});
            setGameState('lost');
            newGrid[rowIdx][colIdx] = 'bad';
            setGridHistory(newGrid);
        } else {
            if (soundOn) biteSfx.current.play().catch(() => {});
            newGrid[rowIdx][colIdx] = 'good';
            setGridHistory(newGrid);
            if (currentStep === ROWS - 1) await cashOut(true);
            else setCurrentStep(prev => prev + 1);
        }
    };

    const cashOut = async (isMaxLevel: boolean = false) => {
        if (gameState !== 'playing') return;
        const winningIndex = isMaxLevel ? ROWS - 1 : currentStep - 1;
        if (winningIndex < 0) return;
        const payout = parseFloat(betAmount) * MULTIPLIERS[winningIndex];
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;
        
        if (soundOn) winSfx.current.play().catch(() => {});
        setGameState('cashed_out');
        await updateWallet(session.user.id, payout, 'increment', 'game_balance');
        await createTransaction(session.user.id, 'game_win', payout, `Apple Win x${MULTIPLIERS[winningIndex]}`);
        setTotalBalance(prev => prev + payout);
        fetchBalance();
        toast.success(`Victory! Won ${format(payout)}`);
    };

    return (
        <div className="pb-32 pt-4 px-4 max-w-lg mx-auto min-h-screen relative flex flex-col bg-void overflow-hidden">
            <div className="flex justify-between items-center mb-6 z-10">
                <div className="flex items-center gap-3">
                    <Link to="/games" className="p-2.5 bg-panel rounded-2xl border border-white/5 text-white hover:bg-white/10 transition active:scale-90">
                        <ArrowLeft size={20} />
                    </Link>
                    <h1 className="text-xl font-black text-white uppercase tracking-tighter leading-none">Apple <span className="text-brand">Fortune</span></h1>
                </div>
                <div className="flex items-center gap-2">
                    <button onClick={() => setSoundOn(!soundOn)} className="p-2.5 bg-white/5 rounded-2xl text-gray-400 hover:text-white transition border border-white/5">
                        {soundOn ? <Volume2 size={18}/> : <VolumeX size={18}/>}
                    </button>
                    <div className="bg-panel px-4 py-2.5 rounded-2xl border border-brand/20 flex items-center gap-2">
                        <Wallet size={16} className="text-brand" />
                        <span className="text-lg font-black text-brand tracking-tighter font-mono"><BalanceDisplay amount={totalBalance}/></span>
                    </div>
                </div>
            </div>

            <div className="flex-1 bg-[#050505] rounded-[3.5rem] border-8 border-[#111] shadow-2xl relative overflow-hidden mb-6 flex flex-col-reverse gap-1 p-4">
                {Array.from({ length: ROWS }).map((_, rIdx) => (
                    <div key={rIdx} className={`flex gap-1 h-10 items-center justify-center rounded-xl p-1 ${currentStep === rIdx && gameState === 'playing' ? 'bg-brand/10 border border-brand/30' : 'bg-white/5'}`}>
                        <span className="text-[10px] w-6 font-bold text-gray-500">x{MULTIPLIERS[rIdx]}</span>
                        {Array.from({ length: COLS }).map((_, cIdx) => (
                            <button key={cIdx} disabled={currentStep !== rIdx || gameState !== 'playing'} onClick={() => handleCellClick(rIdx, cIdx)} className="flex-1 h-full rounded bg-black/40 border border-white/5 flex items-center justify-center">
                                {gridHistory[rIdx][cIdx] === 'good' ? <Apple size={18} className="text-red-500" /> : gridHistory[rIdx][cIdx] === 'bad' ? <Skull size={18} className="text-purple-500" /> : <HelpCircle size={14} className="text-gray-700" />}
                            </button>
                        ))}
                    </div>
                ))}
            </div>

            <GlassCard className="p-6 bg-panel border-t border-white/10 rounded-t-[4rem] rounded-b-none -mx-4 pb-12 shadow-2xl relative">
                <div className="flex items-stretch gap-4 mb-6">
                    <div className="bg-void border border-border-base rounded-[2rem] px-6 py-4 flex-1 flex flex-col justify-center">
                        <p className="text-[10px] text-muted font-black uppercase tracking-widest mb-1">STAKE</p>
                        <input type="number" value={betAmount} onChange={e => setBetAmount(e.target.value)} disabled={gameState === 'playing'} className="bg-transparent text-white font-mono font-black text-3xl w-full outline-none" />
                    </div>
                    {gameState === 'playing' ? (
                        <button onClick={() => cashOut()} className="px-10 rounded-[2.5rem] font-black uppercase bg-green-500 text-black shadow-lg">CASH</button>
                    ) : (
                        <button onClick={startGame} className="px-10 rounded-[2.5rem] font-black uppercase bg-brand text-black shadow-yellow-pop">PLAY</button>
                    )}
                </div>
                <div className="grid grid-cols-3 gap-3">
                    {['min', 'half', 'double', 'max', 'plus10', 'plus50'].map((action) => (
                        <button key={action} onClick={() => handleQuickAmount(action)} disabled={gameState === 'playing'} className="py-3 bg-void rounded-2xl text-[10px] font-black text-gray-400 hover:text-white transition-all border border-border-base uppercase tracking-widest">
                            {action === 'plus10' ? '+10' : action === 'plus50' ? '+50' : action}
                        </button>
                    ))}
                </div>
            </GlassCard>
        </div>
    );
};

export default AppleFortune;
