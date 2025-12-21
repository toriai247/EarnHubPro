
import React, { useState, useEffect, useRef } from 'react';
import GlassCard from '../components/GlassCard';
import { ArrowLeft, Volume2, VolumeX, HelpCircle, RefreshCw, Trophy, Wallet, ShieldAlert, Zap, Sparkles, ChevronRight } from 'lucide-react';
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
    const [betAmount, setBetAmount] = useState<string>('20');
    const [ballCount, setBallCount] = useState<1 | 2>(1); 
    const [phase, setPhase] = useState<0 | 1 | 2 | 3 | 4>(0);
    const [revealAll, setRevealAll] = useState(false);
    const [cupOrder, setCupOrder] = useState<number[]>([0, 1, 2]); 
    const [cups, setCups] = useState<Cup[]>([{id:0, hasBall:false}, {id:1, hasBall:true}, {id:2, hasBall:false}]);
    const [selectedCupId, setSelectedCupId] = useState<number | null>(null);
    const [history, setHistory] = useState<('win' | 'loss')[]>([]);
    const [shuffleSpeed, setShuffleSpeed] = useState(0.4);
    const [soundOn, setSoundOn] = useState(true);

    const shuffleSfx = useRef(new window.Audio('https://assets.mixkit.co/active_storage/sfx/2568/2568-preview.mp3'));
    const winSfx = useRef(new window.Audio('https://assets.mixkit.co/active_storage/sfx/1435/1435-preview.mp3'));
    const loseSfx = useRef(new window.Audio('https://assets.mixkit.co/active_storage/sfx/2572/2572-preview.mp3'));
    const clickSfx = useRef(new window.Audio('https://assets.mixkit.co/active_storage/sfx/2571/2571-preview.mp3'));
    const timeoutRef = useRef<any>(null);

    const MULTIPLIER = ballCount === 1 ? 2.88 : 1.44;

    useEffect(() => {
        fetchBalance();
        resetCups(1);
        return () => { if (timeoutRef.current) clearTimeout(timeoutRef.current); };
    }, []);

    const fetchBalance = async () => {
        const { data: { session } } = await supabase.auth.getSession();
        if(session) setTotalBalance(await getPlayableBalance(session.user.id));
    };

    const handleQuickAmount = (action: string) => {
        if (phase !== 0) return;
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
            await deductGameBalance(session.user.id, amount, 'Thimbles');
            setTotalBalance(prev => prev - amount);
            await createTransaction(session.user.id, 'game_bet', amount, `Thimbles: ${ballCount} Ball`);
            resetCups(ballCount);
            setPhase(1); 
            setTimeout(() => { setPhase(2); performShuffles(); }, 1200);
        } catch (e: any) { toast.error(e.message); }
    };

    const performShuffles = () => {
        let moves = 0;
        const totalMoves = 22; 
        const step = () => {
            if (moves >= totalMoves) { setPhase(3); return; }
            const duration = moves < 5 ? 0.35 : moves > 15 ? 0.18 : 0.25;
            setShuffleSpeed(duration);
            if (soundOn) {
               shuffleSfx.current.currentTime = 0;
               shuffleSfx.current.play().catch(()=>{});
            }
            setCupOrder(prev => {
                const newOrder = [...prev];
                const i1 = Math.floor(Math.random() * 3);
                let i2 = Math.floor(Math.random() * 3);
                while(i1 === i2) i2 = Math.floor(Math.random() * 3);
                [newOrder[i1], newOrder[i2]] = [newOrder[i2], newOrder[i1]];
                return newOrder;
            });
            moves++;
            timeoutRef.current = setTimeout(step, duration * 1000);
        };
        step();
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

    const handlePick = async (cupId: number) => {
        if (phase !== 3) return;
        const { data: { session } } = await supabase.auth.getSession();
        if(!session) return;
        setSelectedCupId(cupId);
        setPhase(4);
        if (soundOn) {
            clickSfx.current.currentTime = 0;
            clickSfx.current.play().catch(()=>{});
        }
        const winChance = ballCount === 1 ? 0.33 : 0.64;
        const outcome = await determineOutcome(session.user.id, winChance, parseFloat(betAmount));
        const updatedCups = [...cups];
        const pickedIdx = updatedCups.findIndex(c => c.id === cupId);
        if (outcome === 'win') {
            updatedCups.forEach(c => c.hasBall = false);
            updatedCups[pickedIdx].hasBall = true;
            if (ballCount === 2) {
                const otherIdx = (pickedIdx + 1) % 3;
                updatedCups[otherIdx].hasBall = true;
            }
        } else {
            updatedCups[pickedIdx].hasBall = false;
            const others = updatedCups.filter(c => c.id !== cupId);
            others[0].hasBall = true;
            if (ballCount === 2) others[1].hasBall = true;
            else others[1].hasBall = false;
        }
        setCups(updatedCups);
        const isWin = outcome === 'win';
        const payout = isWin ? parseFloat(betAmount) * MULTIPLIER : 0;
        setTimeout(() => setRevealAll(true), 400);
        setTimeout(async () => {
            // Fix: Explicitly type the new entry to prevent string[] widening error
            const result: 'win' | 'loss' = isWin ? 'win' : 'loss';
            setHistory(prev => [result, ...prev].slice(0, 12));
            
            if (isWin) {
                if (soundOn) winSfx.current.play().catch(() => {});
                toast.success(`VICTORY: +${format(payout)}`);
                confetti({ particleCount: 100, spread: 70, origin: { y: 0.7 } });
                await updateWallet(session.user.id, payout, 'increment', 'game_balance');
                await createTransaction(session.user.id, 'game_win', payout, `Thimbles Win`);
                setTotalBalance(prev => prev + payout);
            } else {
                if (soundOn) loseSfx.current.play().catch(() => {});
                toast.info("Empty cup. Better luck next time.");
            }
            fetchBalance();
            setPhase(0);
            setRevealAll(false);
        }, 2200);
    };

    return (
        <div className="pb-32 pt-4 px-4 max-w-lg mx-auto min-h-screen relative flex flex-col bg-void overflow-hidden">
            <div className="flex justify-between items-center mb-6 z-10">
                <div className="flex items-center gap-3">
                    <Link to="/games" className="p-2.5 bg-panel rounded-2xl border border-white/5 text-white hover:bg-white/10 transition active:scale-90">
                        <ArrowLeft size={20} />
                    </Link>
                    <h1 className="text-xl font-black text-white uppercase tracking-tighter leading-none">Royal <span className="text-brand">Thimbles</span></h1>
                </div>
                <div className="flex items-center gap-2">
                    <button onClick={() => setSoundOn(!soundOn)} className="p-2.5 bg-white/5 rounded-2xl text-gray-400 hover:text-white transition border border-white/5">
                        {soundOn ? <Volume2 size={18}/> : <VolumeX size={18}/>}
                    </button>
                    <div className="bg-panel px-4 py-2.5 rounded-2xl border border-brand/20 shadow-glow flex items-center gap-2">
                        <Wallet size={16} className="text-brand" />
                        <span className="text-lg font-black text-brand tracking-tighter font-mono"><BalanceDisplay amount={totalBalance}/></span>
                    </div>
                </div>
            </div>

            <div className="flex-1 bg-[#050505] rounded-[3.5rem] border-8 border-[#111] shadow-2xl relative overflow-hidden mb-6 flex flex-col items-center justify-center min-h-[340px]">
                <div className="relative w-full max-w-[300px] h-40 flex justify-between px-4 sm:px-0">
                    {cups.map((cup) => {
                        const vIdx = cupOrder.indexOf(cup.id);
                        const isRaised = (phase === 1) || (phase === 4 && (selectedCupId === cup.id || revealAll));
                        const xOffset = (vIdx - 1) * 100;
                        return (
                            <motion.div key={cup.id} className="absolute top-0 left-1/2 w-20 h-24" style={{ marginLeft: '-40px' }} animate={{ x: `${xOffset}%` }} transition={{ duration: phase === 2 ? shuffleSpeed : 0.5 }} onClick={() => handlePick(cup.id)}>
                                <motion.div className="relative w-full h-full z-20 cursor-pointer" animate={{ y: isRaised ? -60 : 0 }}>
                                    <div className="w-full h-full bg-gradient-to-b from-red-600 to-red-800 rounded-t-[2rem] rounded-b-xl border-t-2 border-red-400 shadow-xl overflow-hidden" />
                                </motion.div>
                                {cup.hasBall && <div className="absolute bottom-1 left-1/2 -translate-x-1/2 w-7 h-7 rounded-full bg-white shadow-xl z-10" />}
                            </motion.div>
                        );
                    })}
                </div>
            </div>

            <GlassCard className="p-6 bg-panel border-t border-white/10 rounded-t-[4rem] rounded-b-none -mx-4 pb-12 shadow-2xl relative">
                <div className="flex items-stretch gap-4 mb-6">
                    <div className="bg-void border border-border-base rounded-[2rem] px-6 py-4 flex-1 flex flex-col justify-center">
                        <p className="text-[10px] text-muted font-black uppercase tracking-widest mb-1">STAKE AMOUNT</p>
                        <div className="flex items-center gap-2">
                            <span className="text-brand font-black text-2xl">{symbol}</span>
                            <input type="number" value={betAmount} onChange={e => setBetAmount(e.target.value)} disabled={phase !== 0} className="bg-transparent text-white font-mono font-black text-3xl w-full outline-none" />
                        </div>
                    </div>
                    <button onClick={startGame} disabled={phase !== 0} className="px-10 rounded-[2.5rem] font-black uppercase bg-brand text-black hover:bg-white transition-all active:scale-95 shadow-yellow-pop">
                        {phase === 2 ? <RefreshCw className="animate-spin" size={24} /> : 'PLAY'}
                    </button>
                </div>
                <div className="grid grid-cols-3 gap-3">
                    {['min', 'half', 'double', 'max', 'plus10', 'plus50'].map((action) => (
                        <button key={action} onClick={() => handleQuickAmount(action)} className="py-3 bg-void rounded-2xl text-[10px] font-black text-gray-400 hover:text-white transition-all border border-border-base uppercase tracking-widest">{action === 'plus10' ? '+10' : action === 'plus50' ? '+50' : action}</button>
                    ))}
                </div>
            </GlassCard>
        </div>
    );
};

export default Thimbles;
