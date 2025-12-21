
import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Volume2, VolumeX, Trophy, Rocket, History, Clock, Users, Zap, Loader2, Wallet, Coins, TrendingUp, Maximize2, Minimize2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { supabase } from '../integrations/supabase/client';
import { updateWallet, createTransaction } from '../lib/actions';
import { getPlayableBalance, deductGameBalance, determineOutcome } from '../lib/gameMath';
import { useUI } from '../context/UIContext';
import { useCurrency } from '../context/CurrencyContext';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';
import BalanceDisplay from '../components/BalanceDisplay';
import GlassCard from '../components/GlassCard';
import { toggleFullscreen } from '../lib/fullscreen';
import FullscreenPrompt from '../components/FullscreenPrompt';

const BETTING_TIME_MS = 6000;
const POST_CRASH_DELAY_MS = 3000;
const GROWTH_COEF = 0.2302585; 
const MAX_MULTIPLIER = 1000.00;

const BOTS = [
    { name: 'X_Crypto_X', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=1' },
    { name: 'BetMaster99', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=2' },
    { name: 'Dhk_Sniper', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=3' },
    { name: 'RichieRich', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=4' },
    { name: 'WinProphet', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=5' },
    { name: 'TakaMaker', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=6' },
];

const Crash: React.FC = () => {
    const { toast } = useUI();
    const { symbol, format } = useCurrency();
    
    const [balance, setBalance] = useState(0);
    const [multiplier, setMultiplier] = useState(1.00);
    const [gameState, setGameState] = useState<'SYNCING' | 'BETTING' | 'FLYING' | 'CRASHED'>('SYNCING');
    const [timeLeft, setTimeLeft] = useState(0);
    const [history, setHistory] = useState<number[]>([]);
    const [liveBets, setLiveBets] = useState<any[]>([]);
    const [isFullscreen, setIsFullscreen] = useState(false);

    const [amt1, setAmt1] = useState('20');
    const [auto1, setAuto1] = useState('');
    const [hasBet1, setHasBet1] = useState(false);
    const [cashed1, setCashed1] = useState(false);
    const [profit1, setProfit1] = useState(0);

    const [amt2, setAmt2] = useState('100');
    const [auto2, setAuto2] = useState('');
    const [hasBet2, setHasBet2] = useState(false);
    const [cashed2, setCashed2] = useState(false);
    const [profit2, setProfit2] = useState(0);

    const [soundOn, setSoundOn] = useState(true);
    const [isShaking, setIsShaking] = useState(false);

    const canvasRef = useRef<HTMLCanvasElement>(null);
    const requestRef = useRef<number>();
    const roundRef = useRef<number>(0);
    const crashPointRef = useRef<number>(1.00);
    
    const winSfx = useRef(new window.Audio('https://assets.mixkit.co/active_storage/sfx/2019/2019-preview.mp3'));
    const crashSfx = useRef(new window.Audio('https://assets.mixkit.co/active_storage/sfx/2572/2572-preview.mp3'));

    useEffect(() => {
        fetchBalance();
        winSfx.current.volume = 0.4;
        crashSfx.current.volume = 0.5;
        requestRef.current = requestAnimationFrame(gameLoop);

        const handleFsChange = () => setIsFullscreen(!!document.fullscreenElement);
        document.addEventListener('fullscreenchange', handleFsChange);

        return () => {
            cancelAnimationFrame(requestRef.current!);
            document.removeEventListener('fullscreenchange', handleFsChange);
        };
    }, []);

    const handleFsToggle = () => toggleFullscreen();

    const seededRandom = (seed: number) => {
        const x = Math.sin(seed) * 10000;
        return x - Math.floor(x);
    };

    const getCrashPoint = (roundId: number) => {
        const r = seededRandom(roundId * 1337); 
        if (r < 0.03) return 1.00; 
        let crash = 0.97 / (1.0 - r);
        return Math.floor(Math.max(1.0, Math.min(MAX_MULTIPLIER, crash)) * 100) / 100;
    };

    const getFlightDuration = (cp: number) => cp <= 1 ? 0 : (Math.log(cp) / GROWTH_COEF) * 1000;

    const calculateSync = () => {
        const now = Date.now();
        const anchor = Math.floor(now / 600000) * 600000; 
        let simTime = anchor;
        let simId = Math.floor(anchor / 1000);

        while (true) {
            const cp = getCrashPoint(simId);
            const dur = getFlightDuration(cp);
            const total = BETTING_TIME_MS + dur + POST_CRASH_DELAY_MS;
            if (simTime + total > now) return { id: simId, start: simTime, cp, dur, elapsed: now - simTime };
            simTime += total; simId++;
        }
    };

    const fetchBalance = async () => {
        const { data: { session } } = await supabase.auth.getSession();
        if(session) setBalance(await getPlayableBalance(session.user.id));
    };

    const gameLoop = () => {
        const { id, elapsed, cp } = calculateSync();

        if (id !== roundRef.current) {
            roundRef.current = id;
            crashPointRef.current = cp;
            setHistory(prev => [getCrashPoint(id - 1), ...prev].slice(0, 15));
            setHasBet1(false); setCashed1(false);
            setHasBet2(false); setCashed2(false);
            generateBots(id);
        }

        if (elapsed < BETTING_TIME_MS) {
            setGameState('BETTING');
            setTimeLeft(Math.ceil((BETTING_TIME_MS - elapsed) / 1000));
            setMultiplier(1.00);
            drawCanvas(1.00, false);
        } else {
            const flyElapsed = elapsed - BETTING_TIME_MS;
            let currentM = Math.exp(GROWTH_COEF * (flyElapsed / 1000));
            
            if (currentM >= cp) {
                if (gameState !== 'CRASHED') {
                    setGameState('CRASHED');
                    if (soundOn) crashSfx.current.play().catch(() => {});
                    setIsShaking(true);
                    setTimeout(() => setIsShaking(false), 400);
                }
                setMultiplier(cp);
                drawCanvas(cp, true);
            } else {
                setGameState('FLYING');
                setMultiplier(currentM);
                drawCanvas(currentM, false);
                checkAutoCashout(currentM);
                updateBots(currentM);
            }
        }
        requestRef.current = requestAnimationFrame(gameLoop);
    };

    const generateBots = (seed: number) => {
        const list = BOTS.map((b, i) => ({
            ...b,
            bet: (seededRandom(seed + i) * 1000 + 50).toFixed(0),
            target: (1.1 + seededRandom(seed + i * 2) * 4).toFixed(2),
            cashed: null
        }));
        setLiveBets(list);
    };

    const updateBots = (m: number) => {
        setLiveBets(prev => prev.map(b => (!b.cashed && parseFloat(b.target) <= m ? { ...b, cashed: m } : b)));
    };

    const checkAutoCashout = (m: number) => {
        if (hasBet1 && !cashed1 && auto1 && m >= parseFloat(auto1)) cashOut(1);
        if (hasBet2 && !cashed2 && auto2 && m >= parseFloat(auto2)) cashOut(2);
    };

    const placeBet = async (panel: 1 | 2) => {
        if (gameState !== 'BETTING') return;
        const amt = parseFloat(panel === 1 ? amt1 : amt2);
        if (balance < amt) { toast.error("Insufficient Funds"); return; }

        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;

        try {
            await deductGameBalance(session.user.id, amt, 'Crash');
            setBalance(prev => prev - amt);
            if (panel === 1) setHasBet1(true); else setHasBet2(true);
            toast.success("Bet Placed");
        } catch (e) { toast.error("Bet failed"); }
    };

    const cashOut = async (panel: 1 | 2) => {
        if (gameState !== 'FLYING') return;
        const currentM = multiplier;
        const amt = parseFloat(panel === 1 ? amt1 : amt2);
        const win = amt * currentM;

        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;

        if (panel === 1) { setCashed1(true); setProfit1(win); } else { setCashed2(true); setProfit2(win); }
        if (soundOn) winSfx.current.play().catch(() => {});
        
        await updateWallet(session.user.id, win, 'increment', 'game_balance');
        await createTransaction(session.user.id, 'game_win', win, `Crash Win x${currentM.toFixed(2)}`);
        setBalance(prev => prev + win);
        
        if (currentM > 5) confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
    };

    const drawCanvas = (m: number, crashed: boolean) => {
        const canvas = canvasRef.current; if (!canvas) return;
        const ctx = canvas.getContext('2d'); if (!ctx) return;
        const w = canvas.width, h = canvas.height;
        ctx.clearRect(0, 0, w, h);

        ctx.strokeStyle = 'rgba(0, 255, 143, 0.03)';
        ctx.lineWidth = 1;
        const offset = (Date.now() / 50) % 50;
        for(let x = offset; x < w; x += 50) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke(); }
        for(let y = offset; y < h; y += 50) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke(); }

        const progress = Math.min(1, (m - 1) / 50); 
        const endX = w * 0.1 + (w * 0.8 * progress);
        const endY = h * 0.9 - (h * 0.8 * progress);

        ctx.shadowBlur = crashed ? 0 : 15;
        ctx.shadowColor = crashed ? '#ff3b3b' : '#00ff8f';
        
        ctx.beginPath();
        ctx.moveTo(w * 0.1, h * 0.9);
        ctx.quadraticCurveTo(w * 0.5, h * 0.9, endX, endY);
        ctx.strokeStyle = crashed ? '#ff3b3b' : '#00ff8f';
        ctx.lineWidth = 4;
        ctx.lineCap = 'round';
        ctx.stroke();
        ctx.shadowBlur = 0;

        if (!crashed) {
            ctx.fillStyle = '#fff';
            ctx.beginPath();
            ctx.arc(endX, endY, 6, 0, Math.PI * 2);
            ctx.fill();
        } else {
            ctx.fillStyle = '#ff3b3b';
            ctx.beginPath();
            ctx.arc(endX, endY, 20 * (Math.random() + 0.5), 0, Math.PI * 2);
            ctx.fill();
        }
    };

    return (
        <div className={`min-h-screen bg-[#050505] text-white font-sans selection:bg-[#00ff8f] selection:text-black overflow-x-hidden ${isShaking ? 'animate-shake' : ''}`}>
            
            <FullscreenPrompt />

            <div className="flex justify-between items-center px-4 py-4 z-50 relative border-b border-white/5 bg-black/40 backdrop-blur-xl">
                <div className="flex items-center gap-4">
                    <Link to="/games" className="p-2.5 bg-white/5 rounded-2xl hover:bg-white/10 transition active:scale-90 border border-white/5">
                        <ArrowLeft size={20} />
                    </Link>
                    <div>
                        <h1 className="text-xl font-black tracking-tighter uppercase leading-none">AERO <span className="text-[#00ff8f]">CRASH</span></h1>
                        <div className="flex items-center gap-1.5 mt-1">
                            <div className="w-1.5 h-1.5 rounded-full bg-[#00ff8f] animate-pulse"></div>
                            <span className="text-[9px] text-gray-500 font-bold uppercase tracking-widest">Protocol V3.2</span>
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <button 
                        onClick={handleFsToggle}
                        className="p-2.5 bg-white/5 rounded-2xl hover:bg-white/10 transition active:scale-90 border border-white/5"
                    >
                        {isFullscreen ? <Minimize2 size={20}/> : <Maximize2 size={20}/>}
                    </button>
                    <div className="bg-black/60 border border-[#00ff8f]/20 px-4 py-2 rounded-2xl flex items-center gap-2 shadow-[0_0_20px_rgba(0,255,143,0.05)]">
                        <Wallet size={16} className="text-[#00ff8f]" />
                        <span className="text-lg font-black font-mono text-[#00ff8f] tracking-tighter"><BalanceDisplay amount={balance}/></span>
                    </div>
                </div>
            </div>

            <div className="max-w-xl mx-auto px-4 pt-4 pb-32 space-y-6">
                
                <div className="relative aspect-video rounded-[2.5rem] bg-[#080808] border-2 border-white/5 overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.5)]">
                    <canvas ref={canvasRef} width={600} height={400} className="w-full h-full block" />
                    
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                        <AnimatePresence mode="wait">
                            {gameState === 'BETTING' ? (
                                <motion.div key="betting" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="text-center">
                                    <p className="text-[#00ff8f] font-black text-xs uppercase tracking-[0.3em] mb-2">Preparing for Takeoff</p>
                                    <h2 className="text-7xl font-black text-white tracking-tighter">{timeLeft}s</h2>
                                </motion.div>
                            ) : (
                                <motion.div key="multiplier" initial={{ scale: 0.8 }} animate={{ scale: 1 }} className="text-center">
                                    <h2 className={`text-8xl font-black tracking-tighter leading-none ${gameState === 'CRASHED' ? 'text-[#ff3b3b]' : 'text-white'}`}>
                                        {multiplier.toFixed(2)}<span className="text-4xl ml-1">x</span>
                                    </h2>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>

                    <div className="absolute top-4 left-4 right-4 flex gap-2 overflow-x-auto no-scrollbar mask-fade-right">
                        {history.map((h, i) => (
                            <div key={i} className={`px-3 py-1 rounded-full text-[10px] font-black border backdrop-blur-md ${h >= 2 ? 'bg-[#00ff8f]/10 border-[#00ff8f]/30 text-[#00ff8f]' : 'bg-red-500/10 border-red-500/30 text-[#ff3b3b]'}`}>
                                {h.toFixed(2)}x
                            </div>
                        ))}
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <BetPanel 
                        amount={amt1} setAmount={setAmt1}
                        auto={auto1} setAuto={setAuto1}
                        hasBet={hasBet1} cashed={cashed1} profit={profit1}
                        gameState={gameState} multiplier={multiplier} balance={balance}
                        onBet={() => placeBet(1)} onCash={() => cashOut(1)}
                    />
                    <BetPanel 
                        amount={amt2} setAmount={setAmt2}
                        auto={auto2} setAuto={setAuto2}
                        hasBet={hasBet2} cashed={cashed2} profit={profit2}
                        gameState={gameState} multiplier={multiplier} balance={balance}
                        onBet={() => placeBet(2)} onCash={() => cashOut(2)}
                    />
                </div>

                <GlassCard className="!p-0 border-white/5 bg-white/[0.02] overflow-hidden rounded-[2rem]">
                    <div className="px-5 py-4 border-b border-white/5 bg-white/5 flex justify-between items-center">
                        <div className="flex items-center gap-3">
                            <div className="w-2 h-2 rounded-full bg-[#00ff8f] animate-pulse shadow-[0_0_10px_#00ff8f]"></div>
                            <h3 className="text-xs font-black uppercase tracking-widest text-gray-400">Tactical Logs</h3>
                        </div>
                        <span className="text-[10px] font-bold text-gray-500 uppercase">{liveBets.length + 420} Active Nodes</span>
                    </div>
                    <div className="max-h-[280px] overflow-y-auto no-scrollbar p-2 space-y-1">
                        {liveBets.map((bot, i) => (
                            <div key={i} className={`flex items-center justify-between p-3 rounded-2xl transition-all ${bot.cashed ? 'bg-[#00ff8f]/5 border border-[#00ff8f]/10 shadow-[inset_0_0_20px_rgba(0,255,143,0.02)]' : 'hover:bg-white/[0.02]'}`}>
                                <div className="flex items-center gap-3">
                                    <img src={bot.avatar} className="w-8 h-8 rounded-xl bg-black border border-white/10" />
                                    <div>
                                        <p className="text-xs font-bold text-gray-200">{bot.name}</p>
                                        <p className="text-[9px] text-gray-500 font-mono">৳{bot.bet}</p>
                                    </div>
                                </div>
                                {bot.cashed ? (
                                    <div className="text-right">
                                        <p className="text-xs font-black text-[#00ff8f] leading-none">+{format(parseFloat(bot.bet) * bot.cashed)}</p>
                                        <p className="text-[9px] text-gray-500 font-mono mt-1">{bot.cashed.toFixed(2)}x</p>
                                    </div>
                                ) : (
                                    <div className="w-1.5 h-1.5 rounded-full bg-gray-800"></div>
                                )}
                            </div>
                        ))}
                    </div>
                </GlassCard>
            </div>

            <style>{`
                .no-scrollbar::-webkit-scrollbar { display: none; }
                .mask-fade-right { mask-image: linear-gradient(to right, black 80%, transparent 100%); }
                @keyframes shake {
                    0% { transform: translate(1px, 1px) rotate(0deg); }
                    10% { transform: translate(-1px, -2px) rotate(-1deg); }
                    20% { transform: translate(-3px, 0px) rotate(1deg); }
                    30% { transform: translate(3px, 2px) rotate(0deg); }
                    40% { transform: translate(1px, -1px) rotate(1deg); }
                    50% { transform: translate(-1px, 2px) rotate(-1deg); }
                    60% { transform: translate(-3px, 1px) rotate(0deg); }
                    70% { transform: translate(3px, 1px) rotate(-1deg); }
                    80% { transform: translate(-1px, -1px) rotate(1deg); }
                    90% { transform: translate(1px, 2px) rotate(0deg); }
                    100% { transform: translate(1px, -2px) rotate(-1deg); }
                }
                .animate-shake { animation: shake 0.4s; }
            `}</style>
        </div>
    );
};

const BetPanel = ({ amount, setAmount, auto, setAuto, hasBet, cashed, profit, gameState, multiplier, balance, onBet, onCash }: any) => {
    const updateAmount = (val: number) => {
        if (hasBet) return;
        setAmount(Math.max(1, Math.round(val)).toString());
    };

    return (
        <div className="bg-white/[0.03] backdrop-blur-3xl rounded-[2rem] p-5 border border-white/5 relative overflow-hidden group shadow-2xl">
            <AnimatePresence>
                {cashed && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="absolute inset-0 bg-[#00ff8f]/90 z-20 flex flex-col items-center justify-center backdrop-blur-xl">
                        <p className="text-black font-black text-xs uppercase tracking-widest mb-1">Victory</p>
                        <p className="text-3xl font-black text-black leading-none">+{profit.toFixed(0)}</p>
                    </motion.div>
                )}
            </AnimatePresence>

            <div className="flex gap-3 mb-4">
                <div className="flex-1 space-y-1.5">
                    <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest ml-1">Stake Amount</p>
                    <div className="relative">
                        <input 
                            type="number" value={amount} onChange={e => setAmount(e.target.value)} disabled={hasBet}
                            className="w-full bg-black/40 border border-white/5 rounded-2xl py-3 pl-4 pr-2 text-white font-black font-mono text-lg focus:border-[#00ff8f]/40 outline-none transition-all"
                        />
                    </div>
                </div>
                <div className="w-24 space-y-1.5">
                    <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest ml-1">Auto Exit</p>
                    <input 
                        type="number" placeholder="2.00" value={auto} onChange={e => setAuto(e.target.value)} disabled={hasBet}
                        className="w-full bg-black/40 border border-white/5 rounded-2xl py-3 px-3 text-white font-black font-mono text-lg focus:border-[#00ff8f]/40 outline-none transition-all placeholder:text-gray-800"
                    />
                </div>
            </div>

            <div className="grid grid-cols-3 gap-1.5 mb-4">
                <button disabled={hasBet} onClick={() => updateAmount(10)} className="py-2 bg-white/5 rounded-xl text-[10px] font-bold text-gray-400 hover:bg-white/10 transition border border-white/5 uppercase">MIN</button>
                <button disabled={hasBet} onClick={() => updateAmount(parseFloat(amount)/2)} className="py-2 bg-white/5 rounded-xl text-[10px] font-bold text-gray-400 hover:bg-white/10 transition border border-white/5 uppercase">1/2</button>
                <button disabled={hasBet} onClick={() => updateAmount(parseFloat(amount)*2)} className="py-2 bg-white/5 rounded-xl text-[10px] font-bold text-gray-400 hover:bg-white/10 transition border border-white/5 uppercase">2X</button>
                <button disabled={hasBet} onClick={() => updateAmount(balance)} className="py-2 bg-white/5 rounded-xl text-[10px] font-bold text-gray-400 hover:bg-white/10 transition border border-white/5 uppercase">MAX</button>
                <button disabled={hasBet} onClick={() => updateAmount(parseFloat(amount)+10)} className="py-2 bg-white/5 rounded-xl text-[10px] font-bold text-gray-400 hover:bg-white/10 transition border border-white/5 uppercase">+10</button>
                <button disabled={hasBet} onClick={() => updateAmount(parseFloat(amount)+50)} className="py-2 bg-white/5 rounded-xl text-[10px] font-bold text-gray-400 hover:bg-white/10 transition border border-white/5 uppercase">+50</button>
            </div>

            {hasBet && !cashed ? (
                <button 
                    onClick={onCash} disabled={gameState !== 'FLYING'}
                    className={`w-full py-4 rounded-2xl font-black text-xl uppercase tracking-tighter transition-all flex flex-col items-center justify-center leading-none ${gameState === 'FLYING' ? 'bg-[#00ff8f] text-black shadow-[0_0_40px_rgba(0,255,143,0.3)] animate-pulse' : 'bg-gray-800 text-gray-500'}`}
                >
                    CASHOUT
                    <span className="text-[10px] font-bold mt-1 opacity-70">৳{(parseFloat(amount) * multiplier).toFixed(0)}</span>
                </button>
            ) : (
                <button 
                    onClick={onBet} disabled={gameState !== 'BETTING'}
                    className={`w-full py-4 rounded-2xl font-black text-xl uppercase tracking-tighter transition-all ${gameState === 'BETTING' ? 'bg-white text-black shadow-[0_10px_30px_rgba(255,255,255,0.1)] hover:scale-[1.02] active:scale-95' : 'bg-white/5 text-gray-600 border border-white/5 cursor-not-allowed'}`}
                >
                    {gameState === 'FLYING' ? 'FLYING...' : 'PLACE BET'}
                </button>
            )}
        </div>
    );
};

export default Crash;
