
import React, { useState, useEffect, useRef } from 'react';
import GlassCard from '../components/GlassCard';
import { ArrowLeft, Volume2, VolumeX, Info, Pyramid, Eye, Gem, Sun, Anchor, RefreshCw, Wallet, ShieldAlert, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';
import { supabase } from '../integrations/supabase/client';
import { updateWallet, createTransaction } from '../lib/actions';
import { getPlayableBalance, deductGameBalance, determineOutcome } from '../lib/gameMath';
import { useUI } from '../context/UIContext';
import BalanceDisplay from '../components/BalanceDisplay';
import { useCurrency } from '../context/CurrencyContext';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';

const SYMBOLS = [
    { id: 'ankh', icon: Anchor, color: 'text-yellow-400', multiplier: 50, label: 'Ankh' },
    { id: 'eye', icon: Eye, color: 'text-blue-400', multiplier: 30, label: 'Eye of Ra' },
    { id: 'pyramid', icon: Pyramid, color: 'text-orange-400', multiplier: 15, label: 'Pyramid' },
    { id: 'scarab', icon: Gem, color: 'text-emerald-400', multiplier: 8, label: 'Scarab' },
    { id: 'phoenix', icon: Sun, color: 'text-red-500', multiplier: 4, label: 'Phoenix' },
];

const ReelsOfGods: React.FC = () => {
    const { toast } = useUI();
    const { format, symbol } = useCurrency();
    const [balance, setBalance] = useState(0);
    const [betAmount, setBetAmount] = useState<string>('20');
    const [isSpinning, setIsSpinning] = useState(false);
    const [reels, setReels] = useState<number[]>([0, 1, 2]); 
    const [winData, setWinData] = useState<{win: boolean, amount: number, multiplier: number} | null>(null);
    const [soundOn, setSoundOn] = useState(true);

    const spinSfx = useRef(new window.Audio('https://assets.mixkit.co/active_storage/sfx/2003/2003-preview.mp3')); 
    const winSfx = useRef(new window.Audio('https://assets.mixkit.co/active_storage/sfx/2019/2019-preview.mp3')); 
    const loseSfx = useRef(new window.Audio('https://assets.mixkit.co/active_storage/sfx/2572/2572-preview.mp3'));
    
    useEffect(() => {
        fetchBalance();
        setReels([ Math.floor(Math.random() * SYMBOLS.length), Math.floor(Math.random() * SYMBOLS.length), Math.floor(Math.random() * SYMBOLS.length) ]);
    }, []);

    const fetchBalance = async () => {
        const { data: { session } } = await supabase.auth.getSession();
        if(session) setBalance(await getPlayableBalance(session.user.id));
    };

    const handleSpin = async () => {
        const amount = parseFloat(betAmount);
        if (isNaN(amount) || amount < 1) { toast.error("Min stake 1 TK"); return; }
        if (amount > balance) { toast.error("Insufficient balance"); return; }
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;

        setIsSpinning(true);
        setWinData(null);
        if (soundOn) {
            spinSfx.current.currentTime = 0;
            spinSfx.current.play().catch(()=>{});
        }

        try {
            await deductGameBalance(session.user.id, amount, 'Reels of Gods');
            setBalance(prev => prev - amount);
            await createTransaction(session.user.id, 'game_bet', amount, `Reels Stake`);
        } catch (e: any) {
            toast.error(e.message);
            setIsSpinning(false);
            return;
        }

        const outcome = await determineOutcome(session.user.id, 0.35); 
        let r1, r2, r3;
        if (outcome === 'loss') {
            r1 = Math.floor(Math.random() * SYMBOLS.length);
            r2 = (r1 + 1) % SYMBOLS.length;
            r3 = (r1 + 2) % SYMBOLS.length;
        } else {
            const symIdx = Math.floor(Math.random() * SYMBOLS.length);
            r1 = symIdx; r2 = symIdx; r3 = symIdx;
        }

        setTimeout(async () => {
            setReels([r1, r2, r3]);
            setIsSpinning(false);
            let mult = 0;
            if (r1 === r2 && r2 === r3) mult = SYMBOLS[r1].multiplier;
            else if (r1 === r2 || r2 === r3 || r1 === r3) mult = 1.5;
            const payout = amount * mult;
            if (payout > 0) {
                if (soundOn) winSfx.current.play().catch(()=>{});
                setWinData({ win: true, amount: payout, multiplier: mult });
                toast.success(`VICTORY! Multiplier: ${mult}x`);
                confetti({ particleCount: 150, spread: 70, origin: { y: 0.6 } });
                await updateWallet(session.user.id, payout, 'increment', 'game_balance');
                await createTransaction(session.user.id, 'game_win', payout, `Reels Win x${mult}`);
                setBalance(prev => prev + payout);
            } else {
                if (soundOn) loseSfx.current.play().catch(()=>{});
                setWinData({ win: false, amount: 0, multiplier: 0 });
            }
            fetchBalance();
        }, 2000);
    };

    return (
        <div className="pb-32 pt-4 px-4 max-w-lg mx-auto min-h-screen relative font-sans flex flex-col bg-void">
            <div className="flex justify-between items-center mb-6 z-10">
               <div className="flex items-center gap-3">
                   <Link to="/games" className="p-2.5 bg-panel rounded-2xl border border-border-base text-white hover:bg-white/5 transition">
                       <ArrowLeft size={20} />
                   </Link>
                   <div>
                       <h1 className="text-xl font-black text-white uppercase tracking-tighter leading-none">Gods Reels</h1>
                       <div className="flex items-center gap-1 mt-1">
                           <div className="w-1.5 h-1.5 rounded-full bg-success animate-pulse"></div>
                           <span className="text-[8px] text-muted font-black uppercase tracking-widest">Ancient Multiplier</span>
                       </div>
                   </div>
               </div>
               <div className="flex items-center gap-2">
                    <button onClick={() => setSoundOn(!soundOn)} className="p-2.5 bg-white/5 rounded-2xl text-gray-400 hover:text-white transition border border-white/5">
                        {soundOn ? <Volume2 size={18}/> : <VolumeX size={18}/>}
                    </button>
                    <div className="flex items-center gap-2 bg-panel px-4 py-2.5 rounded-2xl border border-brand/20 shadow-glow">
                        <Wallet size={16} className="text-brand" />
                        <span className="text-lg font-black text-brand tracking-tighter font-mono"><BalanceDisplay amount={balance}/></span>
                    </div>
                </div>
            </div>

            <div className="flex-1 flex flex-col items-center justify-center relative z-10 py-6">
                <div className="w-full bg-[#111] rounded-[3rem] border-8 border-[#1a1a1a] p-6 shadow-2xl relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-b from-brand/5 to-transparent pointer-events-none"></div>
                    <div className="bg-black border border-brand/20 rounded-2xl p-3 mb-6 text-center">
                        <p className="text-[10px] font-black text-brand uppercase tracking-[0.3em] animate-pulse">{isSpinning ? 'Consulting the Oracle...' : 'May Ra Bless Your Spin'}</p>
                    </div>
                    <div className="flex gap-3 mb-6 h-36">
                        {reels.map((symIdx, i) => {
                            const symbol = SYMBOLS[symIdx];
                            return (
                                <div key={i} className="flex-1 bg-black rounded-3xl border-2 border-white/5 flex items-center justify-center relative overflow-hidden group shadow-inner">
                                    <AnimatePresence mode="wait">
                                        {isSpinning ? (
                                            <motion.div key="spinning" initial={{ y: -100 }} animate={{ y: [0, 1000] }} transition={{ repeat: Infinity, duration: 0.1, ease: 'linear' }} className="flex flex-col gap-10 opacity-30">
                                                {SYMBOLS.map((s, idx) => <s.icon key={idx} size={40} className="text-gray-600" />)}
                                            </motion.div>
                                        ) : (
                                            <motion.div key="static" initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="flex flex-col items-center">
                                                <div className={`p-4 rounded-full bg-white/5 border border-white/10 ${symbol.color} shadow-glow`}>
                                                    <symbol.icon size={48} strokeWidth={2.5} />
                                                </div>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                    <div className="absolute inset-x-0 h-px bg-brand/10 top-1/2 -translate-y-1/2"></div>
                                </div>
                            )
                        })}
                    </div>
                    <div className="grid grid-cols-5 gap-2 px-2">
                        {SYMBOLS.map(s => (
                            <div key={s.id} className="flex flex-col items-center gap-1 opacity-50">
                                <s.icon size={14} className={s.color} />
                                <span className="text-[8px] font-black text-white">x{s.multiplier}</span>
                            </div>
                        ))}
                    </div>
                </div>
                <AnimatePresence>
                    {winData?.win && (
                        <motion.div initial={{ scale:0 }} animate={{ scale:1 }} className="mt-6 bg-brand text-black px-10 py-3 rounded-2xl font-black text-2xl shadow-yellow-pop uppercase tracking-widest border-4 border-black">WIN: {format(winData.amount)}</motion.div>
                    )}
                </AnimatePresence>
            </div>

            <GlassCard className="p-5 bg-panel border-t border-border-base rounded-t-[3rem] rounded-b-none -mx-4 pb-12 shadow-neo">
                <div className="flex items-stretch gap-3 mb-6">
                    <div className="bg-void border border-border-base rounded-2xl px-5 py-3 flex-1 flex flex-col justify-center">
                         <p className="text-[10px] text-muted font-black uppercase tracking-widest mb-1">STAKE AMOUNT</p>
                         <div className="flex items-center gap-2">
                             <span className="text-brand font-black text-xl">{symbol}</span>
                             <input type="number" value={betAmount} onChange={e => setBetAmount(e.target.value)} disabled={isSpinning} className="bg-transparent text-white font-mono font-black text-2xl w-full outline-none placeholder-gray-800" />
                         </div>
                    </div>
                    <button onClick={handleSpin} disabled={isSpinning} className={`px-10 rounded-2xl font-black uppercase text-sm shadow-lg flex items-center justify-center gap-3 transition-all active:scale-95 ${isSpinning ? 'bg-gray-800 text-gray-500 cursor-not-allowed' : 'bg-brand text-black hover:bg-white shadow-yellow-pop'}`}>
                        {isSpinning ? <RefreshCw className="animate-spin" size={20} /> : <><Pyramid size={20} fill="currentColor" /> SPIN</>}
                    </button>
                </div>
                <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 bg-black/40 rounded-xl border border-white/5">
                        <span className="text-[8px] font-black text-gray-500 uppercase tracking-widest block mb-1">Max Potential</span>
                        <span className="text-white font-bold font-mono">{(parseFloat(betAmount)||0) * 50} TK</span>
                    </div>
                    <div className="p-3 bg-black/40 rounded-xl border border-white/5">
                        <span className="text-[8px] font-black text-gray-500 uppercase tracking-widest block mb-1">Server Status</span>
                        <span className="text-success font-bold flex items-center gap-1"><Sparkles size={10}/> OPTIMIZED</span>
                    </div>
                </div>
            </GlassCard>
        </div>
    );
};

export default ReelsOfGods;
