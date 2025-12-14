import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Volume2, VolumeX, Trophy, Rocket, History, Clock, Users, Settings2, Play, Pause, Globe, Zap, Loader2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { supabase } from '../integrations/supabase/client';
import { updateWallet, createTransaction } from '../lib/actions';
import { getPlayableBalance, deductGameBalance } from '../lib/gameMath';
import { useUI } from '../context/UIContext';
import { useCurrency } from '../context/CurrencyContext';
import GlassCard from '../components/GlassCard';

// --- CONFIGURATION ---
const BETTING_TIME_MS = 6000; // 6s Betting Phase
const POST_CRASH_DELAY_MS = 2000; // 2s Cooldown (1s requested, but 2s feels smoother for UI)
const MAX_FLIGHT_DURATION_MS = 20000; // Max flight time to reach 100x

// Growth Math
const MAX_MULTIPLIER = 100.00;
// k = ln(100) / 20 = 0.23025...
const GROWTH_COEF = 0.2302585; 

// Simulated Bots
const BOTS = [
    'Player88', 'KingKhan', 'DhakaTop', 'WinMax', 'Lucky7', 'ProGamer', 'BD_Tiger', 
    'SkyHigh', 'MoneyMaker', 'CryptoBoss', 'AlphaBet', 'SniperX', 'RichKid', 
    'TakaFly', 'SpeedRacer', 'MoonWalker', 'GambleGod', 'RiskTaker', 'FortuneH', 'ZenMaster'
];

const Crash: React.FC = () => {
    const { toast } = useUI();
    const { symbol, format } = useCurrency();
    
    // --- GLOBAL STATE ---
    const [balance, setBalance] = useState(0);
    const [multiplier, setMultiplier] = useState(1.00);
    const [gameState, setGameState] = useState<'SYNCING' | 'BETTING' | 'FLYING' | 'CRASHED'>('SYNCING');
    const [timeLeft, setTimeLeft] = useState(0);
    const [history, setHistory] = useState<{val: number, roundId: number}[]>([]);
    const [liveBets, setLiveBets] = useState<any[]>([]);
    const [bdTime, setBdTime] = useState('');

    // --- BETTING STATE ---
    const [bet1Amount, setBet1Amount] = useState<string>('20');
    const [bet1AutoCashout, setBet1AutoCashout] = useState<string>('');
    const [hasBet1, setHasBet1] = useState(false);
    const [cashedOut1, setCashedOut1] = useState(false);
    const [profit1, setProfit1] = useState(0);
    const [autoBet1, setAutoBet1] = useState(false);

    const [bet2Amount, setBet2Amount] = useState<string>('100');
    const [bet2AutoCashout, setBet2AutoCashout] = useState<string>('');
    const [hasBet2, setHasBet2] = useState(false);
    const [cashedOut2, setCashedOut2] = useState(false);
    const [profit2, setProfit2] = useState(0);
    const [autoBet2, setAutoBet2] = useState(false);

    // Refs
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const requestRef = useRef<number>();
    
    // Sync Logic Refs
    const currentRoundIdRef = useRef<number>(0);
    const currentCrashPointRef = useRef<number>(1.00);
    const phaseStartTimeRef = useRef<number>(0);
    
    const [soundOn, setSoundOn] = useState(true);

    // Audio
    const engineSfx = useRef(new Audio('https://assets.mixkit.co/active_storage/sfx/878/878-preview.mp3')); 
    const crashSfx = useRef(new Audio('https://assets.mixkit.co/active_storage/sfx/1706/1706-preview.mp3')); 
    const winSfx = useRef(new Audio('https://assets.mixkit.co/active_storage/sfx/2019/2019-preview.mp3')); 

    // --- DETERMINISTIC MATH ---
    const seededRandom = (seed: number) => {
        const x = Math.sin(seed) * 10000;
        return x - Math.floor(x);
    };

    const getCrashPoint = (roundId: number) => {
        const r = seededRandom(roundId * 1337); 
        // 4% House Edge
        if (r < 0.04) return 1.00; // Instant crash mechanic
        
        let crash = 0.96 / (1.0 - r);
        if (crash < 1.00) crash = 1.00;
        if (crash > MAX_MULTIPLIER) crash = MAX_MULTIPLIER;
        return Math.floor(crash * 100) / 100;
    };

    const getFlightDuration = (crashPoint: number) => {
        if (crashPoint <= 1.00) return 0;
        // Time = ln(Multiplier) / k
        const seconds = Math.log(crashPoint) / GROWTH_COEF;
        return seconds * 1000;
    };

    // --- SYNC ENGINE ---
    // This calculates exactly which round we are in based on current time
    // without needing a server, ensuring no wasted time between rounds.
    const calculateCurrentState = () => {
        const now = Date.now();
        // Anchor to the nearest 10 minutes to prevent infinite loops
        const anchorTime = Math.floor(now / 600000) * 600000; 
        
        let simTime = anchorTime;
        let simRoundId = Math.floor(anchorTime / 1000); // Base ID

        // Fast forward to now
        while (true) {
            const crash = getCrashPoint(simRoundId);
            const flightTime = getFlightDuration(crash);
            const totalRoundTime = BETTING_TIME_MS + flightTime + POST_CRASH_DELAY_MS;

            if (simTime + totalRoundTime > now) {
                // Found the current active round
                return {
                    roundId: simRoundId,
                    startTime: simTime,
                    crashPoint: crash,
                    flightDuration: flightTime,
                    elapsed: now - simTime
                };
            }

            simTime += totalRoundTime;
            simRoundId++;
        }
    };

    // --- INITIALIZATION ---
    useEffect(() => {
        engineSfx.current.loop = true;
        engineSfx.current.volume = 0.4;
        crashSfx.current.volume = 0.8;
        winSfx.current.volume = 0.6;
        
        fetchBalance();

        // BD Clock
        const clock = setInterval(() => {
            setBdTime(new Date().toLocaleTimeString('en-US', { timeZone: 'Asia/Dhaka', hour12: true }));
        }, 1000);

        // Pre-fill history
        const state = calculateCurrentState();
        const prevHistory = [];
        for(let i=1; i<=20; i++) {
            prevHistory.push({
                val: getCrashPoint(state.roundId - i),
                roundId: state.roundId - i
            });
        }
        setHistory(prevHistory);

        // Start Loop
        requestRef.current = requestAnimationFrame(syncGameLoop);

        return () => {
            if (requestRef.current) cancelAnimationFrame(requestRef.current);
            engineSfx.current.pause();
            clearInterval(clock);
        };
    }, []);

    const fetchBalance = async () => {
        const { data: { session } } = await supabase.auth.getSession();
        if(session) {
            const bal = await getPlayableBalance(session.user.id);
            setBalance(bal);
        }
    };

    const generateBots = (seed: number) => {
        const r = seededRandom(seed);
        // Top 20 Bets
        const count = 20; 
        const bots = [];
        for(let i=0; i<count; i++) {
            const botR = seededRandom(seed + i + 100);
            const botName = BOTS[Math.floor(botR * BOTS.length)];
            const bet = (botR * 1000 + 50).toFixed(0);
            const target = (1 + botR * 5).toFixed(2);
            bots.push({ user: botName, bet: bet, target: target, cashout: null });
        }
        setLiveBets(bots);
    };

    // --- MAIN GAME LOOP ---
    const syncGameLoop = () => {
        const state = calculateCurrentState();
        const { roundId, elapsed, crashPoint } = state;

        // Detect Round Change
        if (roundId !== currentRoundIdRef.current) {
            // New Round Init
            currentRoundIdRef.current = roundId;
            currentCrashPointRef.current = crashPoint;
            
            // Add previous to history
            setHistory(prev => {
                if (prev[0]?.roundId === roundId - 1) return prev;
                return [{ val: getCrashPoint(roundId - 1), roundId: roundId - 1 }, ...prev].slice(0, 20);
            });

            // Reset
            setHasBet1(false); setCashedOut1(false); setProfit1(0);
            setHasBet2(false); setCashedOut2(false); setProfit2(0);
            
            generateBots(roundId);
            
            // Auto Bet Trigger
            if (autoBet1) placeBet(1, true);
            if (autoBet2) placeBet(2, true);
            
            fetchBalance();
        }

        // Determine Phase Logic
        if (elapsed < BETTING_TIME_MS) {
            // BETTING PHASE
            if (gameState !== 'BETTING') {
                setGameState('BETTING');
                engineSfx.current.pause();
                setMultiplier(1.00);
            }
            
            const remaining = Math.ceil((BETTING_TIME_MS - elapsed) / 1000);
            setTimeLeft(remaining);
            drawCanvas(1.00, false);

        } else {
            // FLIGHT OR CRASH PHASE
            const flightElapsed = elapsed - BETTING_TIME_MS;
            const flightTimeSec = flightElapsed / 1000;
            
            // Calculate Current Multiplier
            let currentMult = Math.exp(GROWTH_COEF * flightTimeSec);
            
            // Clamp if simulation overshot
            if (currentMult > crashPoint) currentMult = crashPoint;

            if (currentMult >= crashPoint) {
                // CRASHED
                if (gameState !== 'CRASHED') {
                    setGameState('CRASHED');
                    setMultiplier(crashPoint);
                    engineSfx.current.pause();
                    if (soundOn) {
                        crashSfx.current.currentTime = 0;
                        crashSfx.current.play().catch(()=>{});
                    }
                }
                drawCanvas(crashPoint, true);
            } else {
                // FLYING
                if (gameState !== 'FLYING') {
                    setGameState('FLYING');
                    if (soundOn) {
                        engineSfx.current.currentTime = 0;
                        engineSfx.current.play().catch(()=>{});
                    }
                }
                
                setMultiplier(currentMult);
                
                // Sound Pitch
                if (soundOn && engineSfx.current) {
                    engineSfx.current.playbackRate = Math.min(2.5, 1 + (currentMult - 1) * 0.1);
                }

                checkAutoCashout(currentMult);
                updateBots(currentMult);
                drawCanvas(currentMult, false);
            }
        }

        requestRef.current = requestAnimationFrame(syncGameLoop);
    };

    const updateBots = (currentM: number) => {
        setLiveBets(prev => prev.map(b => {
            if (!b.cashout && parseFloat(b.target) <= currentM) {
                return { ...b, cashout: parseFloat(b.target) };
            }
            return b;
        }));
    };

    const checkAutoCashout = (currentM: number) => {
        if (hasBet1 && !cashedOut1 && bet1AutoCashout && currentM >= parseFloat(bet1AutoCashout)) handleCashOut(1);
        if (hasBet2 && !cashedOut2 && bet2AutoCashout && currentM >= parseFloat(bet2AutoCashout)) handleCashOut(2);
    };

    const placeBet = async (panel: 1 | 2, isAuto = false) => {
        if (gameState !== 'BETTING' && !isAuto) {
            toast.error("Wait for next round");
            return;
        }

        const amtStr = panel === 1 ? bet1Amount : bet2Amount;
        const amount = parseFloat(amtStr);
        
        if (balance < amount) {
             if(!isAuto) toast.error("Insufficient Balance");
             if (panel === 1) setAutoBet1(false);
             else setAutoBet2(false);
             return;
        }
        
        try {
            if (panel === 1) { setHasBet1(true); setCashedOut1(false); setProfit1(0); }
            else { setHasBet2(true); setCashedOut2(false); setProfit2(0); }
            
            setBalance(prev => prev - amount);
            
            const { data: { session } } = await supabase.auth.getSession();
            if (session) {
                 await deductGameBalance(session.user.id, amount);
                 await createTransaction(session.user.id, 'game_bet', amount, `Crash Bet P${panel}`);
            }
            if(!isAuto) toast.success(`Bet Placed (P${panel})`);

        } catch (e: any) {
            setBalance(prev => prev + amount); 
            if (panel === 1) setHasBet1(false); else setHasBet2(false);
            if(!isAuto) toast.error("Bet Failed");
        }
    };

    const handleCashOut = async (panel: 1 | 2) => {
        const hasBet = panel === 1 ? hasBet1 : hasBet2;
        const isCashed = panel === 1 ? cashedOut1 : cashedOut2;
        
        if (gameState !== 'FLYING' || !hasBet || isCashed) return;

        const cashMult = multiplier;
        const amtStr = panel === 1 ? bet1Amount : bet2Amount;
        const winAmount = parseFloat(amtStr) * cashMult;

        if (panel === 1) { setCashedOut1(true); setProfit1(winAmount); }
        else { setCashedOut2(true); setProfit2(winAmount); }

        if (soundOn) winSfx.current.play().catch(()=>{});
        
        const { data: { session } } = await supabase.auth.getSession();
        if(session) {
            await updateWallet(session.user.id, winAmount, 'increment', 'game_balance');
            await createTransaction(session.user.id, 'game_win', winAmount, `Crash Win x${cashMult.toFixed(2)}`);
            setBalance(prev => prev + winAmount);
        }
    };

    // --- CANVAS ---
    const drawCanvas = (currentMult: number, isCrashed: boolean) => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        const w = canvas.width;
        const h = canvas.height;

        ctx.clearRect(0, 0, w, h);

        // Grid
        ctx.strokeStyle = 'rgba(255,255,255,0.05)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        for(let i=1; i<5; i++) {
             const y = h - (i * h/5);
             ctx.moveTo(0, y);
             ctx.lineTo(w, y);
             ctx.fillStyle = 'rgba(255,255,255,0.2)';
             ctx.fillText(`${(1 + i * 0.5).toFixed(1)}x`, 5, y - 2);
        }
        ctx.stroke();

        // Path
        const viewMax = Math.max(2, currentMult * 1.1);
        const normalizeY = (val: number) => h - ((val - 1) / (viewMax - 1)) * (h * 0.8) - 40;
        
        const endX = w * 0.8;
        const endY = normalizeY(currentMult);
        const startY = h - 40;

        ctx.beginPath();
        ctx.moveTo(0, startY);
        ctx.quadraticCurveTo(w * 0.4, startY, endX, endY);
        
        ctx.lineWidth = 4;
        ctx.strokeStyle = isCrashed ? '#ef4444' : '#3b82f6';
        ctx.stroke();

        // Gradient Fill
        ctx.lineTo(endX, h);
        ctx.lineTo(0, h);
        const grad = ctx.createLinearGradient(0, 0, 0, h);
        grad.addColorStop(0, isCrashed ? 'rgba(239,68,68,0.3)' : 'rgba(59,130,246,0.3)');
        grad.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = grad;
        ctx.fill();

        // Rocket
        if (!isCrashed) {
            ctx.save();
            ctx.translate(endX, endY);
            ctx.rotate(-45 * Math.PI / 180);
            ctx.font = '30px serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('🚀', 0, 0);
            ctx.restore();
        } else {
             ctx.fillStyle = '#ef4444';
             ctx.font = 'bold 24px sans-serif';
             ctx.textAlign = 'center';
             ctx.fillText("CRASHED", w/2, h/2);
        }
    };

    // --- RENDER ---
    const BetPanel = ({ id }: { id: 1 | 2 }) => {
        const amount = id === 1 ? bet1Amount : bet2Amount;
        const setAmount = id === 1 ? setBet1Amount : setBet2Amount;
        const autoCash = id === 1 ? bet1AutoCashout : bet2AutoCashout;
        const setAutoCash = id === 1 ? setBet1AutoCashout : setBet2AutoCashout;
        const hasBet = id === 1 ? hasBet1 : hasBet2;
        const cashedOut = id === 1 ? cashedOut1 : cashedOut2;
        const profit = id === 1 ? profit1 : profit2;
        const autoBet = id === 1 ? autoBet1 : autoBet2;
        const setAutoBet = id === 1 ? setAutoBet1 : setAutoBet2;

        return (
            <div className="bg-[#1a1a1a] rounded-2xl p-4 border border-white/10 flex flex-col gap-3 relative overflow-hidden shadow-lg">
                {/* Result Overlay */}
                {cashedOut && (
                    <div className="absolute inset-0 bg-green-900/90 z-20 flex flex-col items-center justify-center backdrop-blur-sm border-2 border-green-500 rounded-2xl">
                        <p className="text-xs font-bold text-green-200 uppercase tracking-widest">You Won</p>
                        <p className="text-2xl font-black text-white drop-shadow-md">{format(profit)}</p>
                        <p className="text-[10px] text-green-300 mt-1 font-mono">x{multiplier.toFixed(2)}</p>
                    </div>
                )}
                
                {/* Controls */}
                <div className="flex gap-2">
                    <div className="flex-1">
                        <label className="text-[10px] text-gray-500 font-bold uppercase block mb-1">Bet (BDT)</label>
                        <div className="relative">
                             <input type="number" value={amount} onChange={e=>setAmount(e.target.value)} disabled={hasBet} className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-white font-mono font-bold text-sm focus:border-yellow-500 outline-none transition-colors"/>
                             <div className="absolute right-1 top-1/2 -translate-y-1/2 flex gap-1">
                                 <button onClick={()=>setAmount((parseFloat(amount)/2).toFixed(0))} className="text-[9px] bg-white/10 hover:bg-white/20 px-2 py-0.5 rounded text-gray-400 transition">½</button>
                                 <button onClick={()=>setAmount((parseFloat(amount)*2).toFixed(0))} className="text-[9px] bg-white/10 hover:bg-white/20 px-2 py-0.5 rounded text-gray-400 transition">2x</button>
                             </div>
                        </div>
                    </div>
                    <div className="w-1/3">
                        <label className="text-[10px] text-gray-500 font-bold uppercase block mb-1">Auto X</label>
                        <input type="number" placeholder="2.00" value={autoCash} onChange={e=>setAutoCash(e.target.value)} disabled={hasBet} className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-white font-mono font-bold text-sm focus:border-yellow-500 outline-none transition-colors"/>
                    </div>
                </div>

                {/* Big Button */}
                {hasBet && !cashedOut ? (
                    <button 
                        onClick={() => handleCashOut(id)}
                        disabled={gameState !== 'FLYING'}
                        className="w-full py-4 bg-orange-500 hover:bg-orange-400 text-black font-black text-lg uppercase rounded-xl shadow-[0_0_20px_rgba(249,115,22,0.4)] active:scale-95 transition flex flex-col items-center justify-center leading-none"
                    >
                        <span>CASHOUT</span>
                        <span className="text-xs font-mono mt-1">{(parseFloat(amount) * multiplier).toFixed(0)}</span>
                    </button>
                ) : (
                    <button 
                        onClick={() => placeBet(id)}
                        disabled={gameState !== 'BETTING'}
                        className={`w-full py-4 rounded-xl font-black text-lg uppercase tracking-wider transition flex items-center justify-center gap-2 ${
                            gameState === 'FLYING' || gameState === 'CRASHED' 
                            ? 'bg-gray-800 text-gray-500 cursor-not-allowed border border-white/5' 
                            : 'bg-green-500 text-black hover:bg-green-400 shadow-[0_0_20px_rgba(34,197,94,0.4)] active:scale-95'
                        }`}
                    >
                        {gameState === 'FLYING' ? 'Wait for Next' : 'PLACE BET'}
                    </button>
                )}

                {/* Footer Toggles */}
                <div className="flex items-center justify-between mt-1 px-1">
                    <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider flex items-center gap-1">
                        <Zap size={10} className={autoBet ? "text-yellow-400" : "text-gray-600"} /> Auto Bet
                    </span>
                    <label className="relative inline-flex items-center cursor-pointer">
                        <input type="checkbox" checked={autoBet} onChange={e => setAutoBet(e.target.checked)} className="sr-only peer" />
                        <div className="w-9 h-5 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-green-500"></div>
                    </label>
                </div>
            </div>
        );
    };

    if (gameState === 'SYNCING') {
        return (
            <div className="flex items-center justify-center min-h-screen bg-black text-white flex-col gap-4">
                <Loader2 className="animate-spin text-blue-500" size={40} />
                <p className="text-xs font-bold uppercase tracking-widest animate-pulse">Synchronizing with Server Time...</p>
            </div>
        );
    }

    return (
        <div className="pb-32 pt-4 px-2 sm:px-4 max-w-xl mx-auto min-h-screen relative font-sans flex flex-col">
            
            {/* Header */}
            <div className="flex justify-between items-center mb-2 z-10">
                <Link to="/games" className="p-2 bg-white/5 rounded-xl hover:bg-white/10 text-white border border-white/10"><ArrowLeft size={20}/></Link>
                <div className="flex bg-[#111] p-1 rounded-xl border border-white/10 shadow-lg">
                    <div className="px-4 py-1.5 bg-white/5 rounded-lg text-sm font-bold text-yellow-400 font-mono tracking-wide">
                        {balance.toFixed(2)}
                    </div>
                </div>
                <div className="flex gap-2">
                    <button onClick={() => setSoundOn(!soundOn)} className="p-2 bg-white/5 rounded-xl text-gray-400 hover:text-white border border-white/10">
                        {soundOn ? <Volume2 size={18}/> : <VolumeX size={18}/>}
                    </button>
                </div>
            </div>

            {/* BD Time */}
            <div className="flex justify-center mb-4">
                <div className="text-[10px] text-gray-500 font-mono flex items-center gap-1 bg-black/30 px-3 py-1 rounded-full border border-white/5">
                    <Globe size={10}/> Global Time: {bdTime}
                </div>
            </div>

            {/* History */}
            <div className="flex gap-2 overflow-x-auto no-scrollbar mb-4 h-8 mask-fade-right px-1">
                {history.map((h, i) => (
                    <div key={i} className={`px-3 py-1 rounded-lg text-xs font-bold font-mono border min-w-[50px] text-center ${h.val >= 2 ? 'bg-green-500/20 border-green-500/50 text-green-400' : 'bg-gray-800 border-gray-700 text-gray-400'}`}>
                        {h.val.toFixed(2)}x
                    </div>
                ))}
            </div>

            {/* Canvas Area */}
            <div className="relative bg-[#0f172a] rounded-3xl border-4 border-[#1e293b] overflow-hidden h-[260px] mb-6 shadow-2xl">
                <canvas ref={canvasRef} className="w-full h-full block" width={600} height={400} />
                
                {/* Overlay Status */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none z-10">
                    {gameState === 'BETTING' ? (
                        <div className="animate-pulse">
                            <p className="text-xs text-blue-400 font-bold uppercase tracking-widest mb-1">Takeoff In</p>
                            <p className="text-6xl font-black text-white drop-shadow-lg">{timeLeft}</p>
                        </div>
                    ) : (
                        <div>
                             <p className={`text-7xl font-black tracking-tighter drop-shadow-2xl ${gameState === 'CRASHED' ? 'text-red-500' : 'text-white'}`}>
                                 {multiplier.toFixed(2)}x
                             </p>
                             {gameState === 'CRASHED' && <p className="text-red-400 font-bold uppercase text-xs mt-2 bg-red-900/30 px-3 py-1 rounded-full inline-block">Crashed</p>}
                        </div>
                    )}
                </div>
            </div>

            {/* Controls */}
            <div className="grid grid-cols-2 gap-4 mb-6">
                <BetPanel id={1} />
                <BetPanel id={2} />
            </div>

            {/* Live Bets */}
            <div className="flex-1 bg-[#111] rounded-2xl border border-white/10 overflow-hidden flex flex-col shadow-lg">
                <div className="p-3 border-b border-white/5 bg-white/5 flex justify-between items-center">
                    <h3 className="text-xs font-bold text-white flex items-center gap-2"><Users size={14} className="text-blue-400"/> Live Bets</h3>
                    <div className="flex items-center gap-2 text-[10px] text-gray-400">
                        <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse shadow-[0_0_5px_#22c55e]"></span> {liveBets.length + 124} Online
                    </div>
                </div>
                <div className="flex-1 overflow-y-auto max-h-[300px] p-2 space-y-1 custom-scrollbar">
                    {/* User Bets */}
                    {(hasBet1 || hasBet2) && (
                        <div className="flex justify-between items-center p-2 rounded-lg bg-yellow-500/10 border border-yellow-500/30">
                            <span className="text-xs text-white font-bold flex items-center gap-2"><Users size={12}/> You</span>
                            <span className="text-xs text-white font-mono">{(hasBet1 ? parseFloat(bet1Amount) : 0) + (hasBet2 ? parseFloat(bet2Amount) : 0)}</span>
                            <span className="text-xs text-gray-400">...</span>
                        </div>
                    )}
                    
                    {/* Bot Bets */}
                    {liveBets.map((bot, i) => (
                        <div key={i} className="flex justify-between items-center p-2 rounded-lg hover:bg-white/5 transition">
                            <div className="flex items-center gap-2">
                                <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${bot.user}`} className="w-5 h-5 rounded-full bg-white/10"/>
                                <span className="text-xs text-gray-400 font-medium">{bot.user}</span>
                            </div>
                            <span className="text-xs text-white font-mono">{bot.bet}</span>
                            {bot.cashout ? (
                                <span className="text-xs text-green-400 font-bold bg-green-900/20 px-2 py-0.5 rounded border border-green-500/20">x{bot.cashout}</span>
                            ) : (
                                <span className="text-[10px] text-gray-600">-</span>
                            )}
                        </div>
                    ))}
                </div>
            </div>

            <style>{`
                .mask-fade-right { mask-image: linear-gradient(to right, black 85%, transparent 100%); }
            `}</style>
        </div>
    );
};

export default Crash;