
import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence, useAnimation } from 'framer-motion';
import { ArrowLeft, Wallet, RefreshCw, Trophy, Zap, Trash2, Play, Info, ChevronRight, Volume2, VolumeX, Maximize2, Minimize2, History, ArrowRight } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../integrations/supabase/client';
import { recordLedgerEntry, createTransaction } from '../lib/actions';
import { getPlayableBalance, determineOutcome, deductGameBalance } from '../lib/gameMath';
import { useUI } from '../context/UIContext';
import { useCurrency } from '../context/CurrencyContext';
import BalanceDisplay from '../components/BalanceDisplay';
import confetti from 'canvas-confetti';
import FullscreenPrompt from '../components/FullscreenPrompt';
import { toggleFullscreen } from '../lib/fullscreen';

const SECTORS = [
    { id: 'x2', label: 'x2', multiplier: 2, color: '#06b6d4', bg: 'bg-cyan-500/20', border: 'border-cyan-500/40', text: 'text-cyan-400' },
    { id: 'x4', label: 'x4', multiplier: 4, color: '#ef4444', bg: 'bg-red-500/20', border: 'border-red-500/40', text: 'text-red-400' },
    { id: 'x5', label: 'x5', multiplier: 5, color: '#a855f7', bg: 'bg-purple-500/20', border: 'border-purple-500/40', text: 'text-purple-400' },
    { id: 'x7', label: 'x7', multiplier: 7, color: '#eab308', bg: 'bg-yellow-500/20', border: 'border-yellow-500/40', text: 'text-yellow-400' },
    { id: 'x10', label: 'x10', multiplier: 10, color: '#22c55e', bg: 'bg-green-500/20', border: 'border-green-500/40', text: 'text-green-400' },
    { id: 'x20', label: 'x20', multiplier: 20, color: '#3b82f6', bg: 'bg-blue-500/20', border: 'border-blue-500/40', text: 'text-blue-400' },
];

const WHEEL_LAYOUT = [
    'x2', 'x4', 'x5', 'x2', 'x10', 'x2', 'x4', 'x7', 'x2', 'x4', 'x2', 'x20', 'x7', 'x2', 'x4', 'x5', 'x2', 'x4'
];

const DragonSpin: React.FC = () => {
    const { toast, confirm } = useUI();
    const { format, symbol } = useCurrency();
    const navigate = useNavigate();
    
    const [balance, setBalance] = useState(0);
    const [bets, setBets] = useState<Record<string, string>>({ x2: '0', x4: '0', x5: '0', x7: '0', x10: '0', x20: '0' });
    const [isSpinning, setIsSpinning] = useState(false);
    const [rotation, setRotation] = useState(0);
    const [history, setHistory] = useState<string[]>([]);
    const [soundOn, setSoundOn] = useState(true);
    const [isFullscreen, setIsFullscreen] = useState(false);

    const spinSfx = useRef(new window.Audio('https://assets.mixkit.co/active_storage/sfx/2003/2003-preview.mp3'));
    const winSfx = useRef(new window.Audio('https://assets.mixkit.co/active_storage/sfx/2019/2019-preview.mp3'));
    const loseSfx = useRef(new window.Audio('https://assets.mixkit.co/active_storage/sfx/2572/2572-preview.mp3'));

    useEffect(() => {
        fetchBalance();
        const handleFsChange = () => setIsFullscreen(!!document.fullscreenElement);
        document.addEventListener('fullscreenchange', handleFsChange);
        return () => document.removeEventListener('fullscreenchange', handleFsChange);
    }, []);

    const fetchBalance = async () => {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) setBalance(await getPlayableBalance(session.user.id));
    };

    const totalStake = (Object.values(bets) as string[]).reduce((acc: number, val: string) => acc + (parseFloat(val) || 0), 0);

    const handleBetInput = (id: string, val: string) => {
        if (isSpinning) return;
        setBets(prev => ({ ...prev, [id]: val }));
    };

    const clearBets = () => {
        if (isSpinning) return;
        setBets({ x2: '0', x4: '0', x5: '0', x7: '0', x10: '0', x20: '0' });
    };

    const handlePlay = async () => {
        if (isSpinning) return;
        if (totalStake <= 0) { toast.error("Place a bet first"); return; }
        if (totalStake > balance) { toast.error("Insufficient balance"); return; }

        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;

        setIsSpinning(true);
        if (soundOn) {
            spinSfx.current.currentTime = 0;
            spinSfx.current.play().catch(() => {});
        }

        try {
            await deductGameBalance(session.user.id, totalStake, 'Dragon Spin');
            setBalance(prev => prev - totalStake);
            await createTransaction(session.user.id, 'game_bet', totalStake, `Dragon Spin Bet`);

            const winningSectors = (Object.keys(bets) as string[]).filter(k => parseFloat(bets[k]) > 0);
            const baseChance = 0.4; 
            const outcome = await determineOutcome(session.user.id, baseChance, totalStake);

            let winningId = 'x2';
            if (outcome === 'win') {
                winningId = winningSectors[Math.floor(Math.random() * winningSectors.length)];
            } else {
                const losers = SECTORS.map(s => s.id).filter(id => !winningSectors.includes(id));
                winningId = losers.length > 0 ? losers[Math.floor(Math.random() * losers.length)] : 'x2';
            }

            const possibleIndices = WHEEL_LAYOUT.map((val, idx) => val === winningId ? idx : -1).filter(idx => idx !== -1);
            const targetIndex = possibleIndices[Math.floor(Math.random() * possibleIndices.length)];

            const sectorAngle = 360 / WHEEL_LAYOUT.length;
            const extraSpins = 6 + Math.floor(Math.random() * 2);
            const inSegmentOffset = (Math.random() * 14) - 7;
            const targetRotation = 360 - (targetIndex * sectorAngle) - (sectorAngle / 2) + inSegmentOffset;
            const finalRotation = rotation + (360 * extraSpins) + (targetRotation - (rotation % 360));
            
            setRotation(finalRotation);

            setTimeout(async () => {
                setIsSpinning(false);
                const winAmt = (parseFloat(bets[winningId]) || 0) * SECTORS.find(s => s.id === winningId)!.multiplier;
                
                setHistory(prev => [winningId, ...prev].slice(0, 10));

                if (winAmt > 0) {
                    if (soundOn) winSfx.current.play().catch(() => {});
                    toast.success(`VICTORY: ${winningId.toUpperCase()}! Won ${format(winAmt)}`);
                    confetti({ particleCount: 150, spread: 70, origin: { y: 0.6 } });
                    await recordLedgerEntry(session.user.id, 'BET_WIN', 'game_balance', winAmt, `Dragon Spin Win ${winningId}`, true);
                    setBalance(prev => prev + winAmt);
                } else {
                    if (soundOn) loseSfx.current.play().catch(() => {});
                    toast.info(`Result: ${winningId.toUpperCase()}`);
                }
                fetchBalance();
            }, 5000);

        } catch (e: any) {
            toast.error(e.message);
            setIsSpinning(false);
            fetchBalance();
        }
    };

    const handleFsToggle = () => toggleFullscreen();

    return (
        <div className="min-h-screen bg-[#020202] text-white flex flex-col relative overflow-hidden font-sans selection:bg-brand selection:text-black">
            <FullscreenPrompt />
            
            <div className="flex justify-between items-center px-4 py-4 z-50 relative bg-black/60 backdrop-blur-xl border-b border-white/5">
                <div className="flex items-center gap-4">
                    <button onClick={() => navigate('/games')} className="p-2.5 bg-panel rounded-2xl border border-white/5 text-white active:scale-90 transition shadow-lg">
                        <ArrowLeft size={20} />
                    </button>
                    <div>
                        <h1 className="text-xl font-black tracking-tighter uppercase leading-none">DRAGON <span className="text-brand">SPIN</span></h1>
                        <p className="text-[9px] text-gray-500 font-bold uppercase mt-1 tracking-widest">Imperial Oracle v1.1</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <button onClick={handleFsToggle} className="p-2.5 bg-white/5 rounded-2xl hover:bg-white/10 transition border border-white/5">
                        {isFullscreen ? <Minimize2 size={20}/> : <Maximize2 size={20}/>}
                    </button>
                    <button onClick={() => setSoundOn(!soundOn)} className="p-2.5 bg-white/5 rounded-2xl text-gray-400 hover:text-white transition border border-white/5">
                        {soundOn ? <Volume2 size={18}/> : <VolumeX size={18}/>}
                    </button>
                    <div className="bg-panel border border-brand/20 px-4 py-2 rounded-2xl flex items-center gap-2 shadow-glow">
                        <Wallet size={16} className="text-brand" />
                        <span className="text-lg font-black font-mono text-brand tracking-tighter"><BalanceDisplay amount={balance}/></span>
                    </div>
                </div>
            </div>

            <main className="flex-1 flex flex-col md:flex-row items-center justify-center p-4 gap-12 relative z-10">
                <div className="w-full md:w-64 space-y-3 order-2 md:order-1">
                    <div className="flex items-center justify-between px-2 mb-2">
                        <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Allocation Matrix</span>
                        <button onClick={clearBets} className="text-[10px] font-bold text-red-500 hover:text-red-400 transition flex items-center gap-1">
                            <Trash2 size={12}/> CLEAR
                        </button>
                    </div>
                    
                    <div className="grid grid-cols-2 md:grid-cols-1 gap-2">
                        {SECTORS.map((s) => (
                            <div key={s.id} className={`flex items-center p-2 rounded-2xl border transition-all duration-300 ${parseFloat(bets[s.id]) > 0 ? `${s.bg} ${s.border} shadow-lg scale-[1.02]` : 'bg-white/5 border-white/5'}`}>
                                <div className={`w-11 h-11 rounded-xl flex items-center justify-center font-black text-xs shadow-inner ${s.bg} ${s.text} border border-white/5`}>
                                    {s.label}
                                </div>
                                <input 
                                    type="number" 
                                    value={bets[s.id]} 
                                    onChange={e => handleBetInput(s.id, e.target.value)}
                                    placeholder="0"
                                    className="bg-transparent border-none w-full px-3 text-right font-mono font-black text-white focus:ring-0 outline-none text-base"
                                />
                                <div className="flex flex-col gap-1 ml-1">
                                    <button onClick={() => handleBetInput(s.id, (parseFloat(bets[s.id] || '0') + 10).toString())} className="w-6 h-6 bg-white/5 hover:bg-white/10 rounded-lg text-[10px] font-bold text-gray-400 flex items-center justify-center">+</button>
                                    <button onClick={() => handleBetInput(s.id, '0')} className="w-6 h-6 bg-white/5 hover:bg-white/10 rounded-lg text-[10px] font-bold text-red-400 flex items-center justify-center">×</button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="flex-1 flex flex-col items-center justify-center relative">
                    <div className="relative">
                        <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-[22px] z-50">
                             <div className="relative flex flex-col items-center">
                                 <div className="w-10 h-10 bg-white rounded-full blur-[20px] absolute top-[-5px] opacity-40"></div>
                                 <svg width="40" height="50" viewBox="0 0 40 50" fill="none" xmlns="http://www.w3.org/2000/svg" className="drop-shadow-[0_0_15px_rgba(255,255,255,0.8)]">
                                     <path d="M20 50L0 0H40L20 50Z" fill="white"/>
                                     <path d="M20 40L8 2H32L20 40Z" fill="#FACC15"/>
                                 </svg>
                             </div>
                        </div>

                        <div className="relative p-7 rounded-full bg-[#111] border-[12px] border-[#222] shadow-[0_0_120px_rgba(0,0,0,1)] ring-2 ring-white/5">
                            <div className="absolute inset-0 rounded-full border border-white/5 pointer-events-none"></div>
                            
                            <motion.div 
                                className="w-80 h-80 sm:w-[450px] sm:h-[450px] rounded-full relative overflow-hidden"
                                animate={{ rotate: rotation }}
                                transition={{ 
                                    duration: 5, 
                                    ease: [0.15, 0, 0.15, 1] 
                                }}
                            >
                                <svg viewBox="0 0 100 100" className="w-full h-full transform -rotate-90">
                                    {WHEEL_LAYOUT.map((id, i) => {
                                        const angle = 360 / WHEEL_LAYOUT.length;
                                        const sector = SECTORS.find(s => s.id === id)!;
                                        const startAngle = i * angle;
                                        const endAngle = (i + 1) * angle;
                                        const x1 = 50 + 50 * Math.cos(Math.PI * startAngle / 180);
                                        const y1 = 50 + 50 * Math.sin(Math.PI * startAngle / 180);
                                        const x2 = 50 + 50 * Math.cos(Math.PI * endAngle / 180);
                                        const y2 = 50 + 50 * Math.sin(Math.PI * endAngle / 180);
                                        const pathData = `M 50 50 L ${x1} ${y1} A 50 50 0 0 1 ${x2} ${y2} Z`;
                                        return (
                                            <g key={i}>
                                                <path d={pathData} fill={sector.color} fillOpacity={0.9} stroke="#000" strokeWidth="0.3" />
                                                <text 
                                                    x="78" y="50" 
                                                    fill="white" 
                                                    fontSize="3.5" 
                                                    fontWeight="900" 
                                                    transform={`rotate(${startAngle + angle/2}, 50, 50)`}
                                                    textAnchor="middle"
                                                    style={{ textShadow: '1px 1px 2px rgba(0,0,0,1)' }}
                                                >
                                                    {sector.label}
                                                </text>
                                            </g>
                                        );
                                    })}
                                </svg>
                                
                                <div className="absolute inset-0 flex items-center justify-center z-20 pointer-events-none">
                                    <div className="w-28 h-28 sm:w-36 sm:h-36 bg-[#0a0a0a] rounded-full border-8 border-[#222] shadow-[0_0_50px_rgba(0,0,0,0.8)] flex items-center justify-center p-3 relative">
                                        <div className="absolute inset-0 rounded-full border-2 border-brand/20 animate-pulse"></div>
                                        <div className="w-full h-full bg-gradient-to-br from-brand/20 to-black rounded-full flex items-center justify-center">
                                            <svg viewBox="0 0 24 24" className="w-16 h-16 text-brand drop-shadow-[0_0_15px_rgba(250,204,21,0.5)]" fill="currentColor">
                                                <path d="M12 2C6.47 2 2 6.47 2 12s4.47 10 10 10 10-4.47 10-10S17.53 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm0-14c-3.31 0-6 2.69-6 6s2.69 6 6 6 6-2.69 6-6-2.69-6-6-6zm0 10c-2.21 0-4-1.79-4-4s1.79-4 4-4 4 1.79 4 4-1.79 4-4 4z"/>
                                            </svg>
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        </div>
                    </div>
                </div>

                <div className="w-full md:w-64 space-y-4 order-3">
                    <div className="bg-panel border border-white/5 rounded-[2.5rem] p-6 shadow-xl">
                         <h3 className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-5 flex items-center gap-2">
                             <History size={14} className="text-brand"/> Oracle History
                         </h3>
                         <div className="grid grid-cols-4 gap-2">
                             {history.length === 0 ? <p className="col-span-full text-[10px] text-gray-700 italic text-center py-4">Waiting...</p> : history.map((h, i) => (
                                 <motion.div 
                                    initial={{ scale: 0 }} animate={{ scale: 1 }}
                                    key={i} 
                                    className={`w-full aspect-square rounded-xl flex items-center justify-center text-[10px] font-black border ${SECTORS.find(s=>s.id===h)?.border} ${SECTORS.find(s=>s.id===h)?.text} bg-black/60 shadow-lg`}
                                 >
                                     {SECTORS.find(s=>s.id===h)?.label}
                                 </motion.div>
                             ))}
                         </div>
                    </div>
                    
                    <div className="bg-brand/5 border border-brand/10 p-6 rounded-[2.5rem] shadow-lg">
                        <h4 className="text-[10px] font-black text-brand uppercase tracking-widest mb-3 flex items-center gap-2">
                            <Info size={14}/> Probability Protocol
                        </h4>
                        <p className="text-[11px] text-gray-400 leading-relaxed font-medium">
                            Target your allocations across multiple sectors. All results are cryptographically synchronized.
                        </p>
                    </div>
                </div>
            </main>

            <div className="bg-panel border-t border-white/10 p-6 pb-12 rounded-t-[4rem] z-50 shadow-[0_-20px_50px_rgba(0,0,0,0.5)]">
                <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-8">
                    <div className="flex items-center gap-4 w-full sm:w-auto">
                        <div className="bg-black/60 border border-white/5 rounded-2xl px-8 py-4 flex flex-col justify-center shadow-inner flex-1 sm:flex-none">
                            <span className="text-[10px] font-black text-gray-600 uppercase tracking-widest">Aggregate Stake</span>
                            <p className="text-3xl font-black text-white font-mono leading-none mt-1 tracking-tighter">৳{totalStake.toLocaleString()}</p>
                        </div>
                    </div>

                    <button 
                        onClick={handlePlay}
                        disabled={isSpinning || totalStake <= 0}
                        className={`group relative h-16 w-full sm:w-72 rounded-3xl font-black text-xl uppercase tracking-[0.2em] transition-all active:scale-95 disabled:opacity-50 disabled:grayscale overflow-hidden ${isSpinning ? 'bg-gray-800 text-gray-500' : 'bg-brand text-black hover:bg-white shadow-[0_0_50px_rgba(250,204,21,0.3)]'}`}
                    >
                        <span className="relative z-10 flex items-center justify-center gap-3">
                            {isSpinning ? <RefreshCw size={24} className="animate-spin"/> : 'EXECUTE SPIN'}
                        </span>
                        <div className="absolute inset-0 bg-white/20 -translate-x-full group-hover:animate-shimmer pointer-events-none"></div>
                    </button>

                    <div className="flex items-center gap-3 w-full sm:w-auto">
                         <div className="bg-white/5 border border-white/5 rounded-2xl p-5 flex flex-col items-center flex-1 sm:flex-none shadow-inner">
                             <span className="text-[10px] font-black text-gray-600 uppercase mb-1">Max Yield</span>
                             <span className="text-2xl font-black text-brand font-mono leading-none">x20</span>
                         </div>
                    </div>
                </div>
            </div>

            <style>{`
                .shadow-glow { box-shadow: 0 0 30px rgba(250, 190, 11, 0.15); }
                .no-scrollbar::-webkit-scrollbar { display: none; }
                @keyframes shimmer { 100% { transform: translateX(100%); } }
                .animate-shimmer { animation: shimmer 2s infinite linear; }
            `}</style>
        </div>
    );
};

export default DragonSpin;
