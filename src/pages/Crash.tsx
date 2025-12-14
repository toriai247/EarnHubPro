
import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Volume2, VolumeX, Trophy, Rocket, History, Clock, Users, Settings2, Play, Pause, Globe, Zap, Loader2, Wallet } from 'lucide-react';
import { Link } from 'react-router-dom';
import { supabase } from '../integrations/supabase/client';
import { updateWallet, createTransaction } from '../lib/actions';
import { getPlayableBalance, deductGameBalance } from '../lib/gameMath';
import { useUI } from '../context/UIContext';
import { useCurrency } from '../context/CurrencyContext';
import GlassCard from '../components/GlassCard';

// --- CONFIGURATION ---
const BETTING_TIME_MS = 6000; // 6s Betting Phase
const POST_CRASH_DELAY_MS = 2000; // 2s Cooldown
const GROWTH_COEF = 0.2302585; 
const MAX_MULTIPLIER = 100.00;

// Simulated Bots
const BOTS = [
    'Player88', 'KingKhan', 'DhakaTop', 'WinMax', 'Lucky7', 'ProGamer', 'BD_Tiger', 
    'SkyHigh', 'MoneyMaker', 'CryptoBoss', 'AlphaBet', 'SniperX', 'RichKid', 
    'TakaFly', 'SpeedRacer', 'MoonWalker', 'GambleGod', 'RiskTaker', 'FortuneH', 'ZenMaster'
];

// --- EXTRACTED COMPONENT TO FIX INPUT FOCUS ISSUE ---
const BetPanelControl = ({ 
    id, 
    amount, setAmount, 
    autoCash, setAutoCash, 
    autoBet, setAutoBet,
    hasBet, cashedOut, 
    profit, multiplier, 
    gameState, balance, format, 
    onPlaceBet, onCashOut 
}: any) => {
    return (
        <div className="bg-[#1e1e1e] rounded-xl p-3 border border-white/5 flex flex-col gap-3 relative overflow-hidden shadow-lg">
            {/* Result Overlay */}
            {cashedOut && (
                <div className="absolute inset-0 bg-green-900/90 z-20 flex flex-col items-center justify-center backdrop-blur-sm border-2 border-green-500 rounded-xl">
                    <p className="text-xs font-bold text-green-200 uppercase tracking-widest">You Won</p>
                    <p className="text-2xl font-black text-white drop-shadow-md">{format(profit)}</p>
                    <p className="text-[10px] text-green-300 mt-1 font-mono">x{multiplier.toFixed(2)}</p>
                </div>
            )}
            
            {/* Controls */}
            <div className="flex gap-2 items-end">
                <div className="flex-1">
                    <div className="relative">
                            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-bold text-xs">BDT</div>
                            <input 
                                type="number" 
                                value={amount} 
                                onChange={e=>setAmount(e.target.value)} 
                                disabled={hasBet} 
                                className="w-full bg-black/50 border border-white/10 rounded-lg pl-10 pr-2 py-3 text-white font-mono font-bold text-base focus:border-red-500 outline-none transition-colors"
                            />
                    </div>
                    <div className="grid grid-cols-2 gap-1 mt-1">
                            <button onClick={()=>setAmount((parseFloat(amount)/2).toFixed(0))} className="text-[9px] bg-white/5 hover:bg-white/10 py-1 rounded text-gray-400 font-bold uppercase">1/2</button>
                            <button onClick={()=>setAmount((parseFloat(amount)*2).toFixed(0))} className="text-[9px] bg-white/5 hover:bg-white/10 py-1 rounded text-gray-400 font-bold uppercase">2x</button>
                            <button onClick={()=>setAmount(balance.toFixed(0))} className="text-[9px] bg-white/5 hover:bg-white/10 py-1 rounded text-gray-400 font-bold uppercase col-span-2">MAX</button>
                    </div>
                </div>
                <div className="w-24">
                    <div className="relative">
                            <div className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-500 font-bold text-xs">Auto</div>
                            <input 
                                type="number" 
                                placeholder="100x" 
                                value={autoCash} 
                                onChange={e=>setAutoCash(e.target.value)} 
                                disabled={hasBet} 
                                className="w-full bg-black/50 border border-white/10 rounded-lg pl-10 pr-2 py-3 text-white font-mono font-bold text-base focus:border-red-500 outline-none transition-colors"
                            />
                    </div>
                    <div className="mt-1 flex items-center justify-between px-1">
                        <span className="text-[9px] text-gray-500 font-bold uppercase">Auto Bet</span>
                            <label className="relative inline-flex items-center cursor-pointer">
                            <input type="checkbox" checked={autoBet} onChange={e => setAutoBet(e.target.checked)} className="sr-only peer" />
                            <div className="w-7 h-4 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-green-500"></div>
                        </label>
                    </div>
                </div>
            </div>

            {/* Big Button */}
            {hasBet && !cashedOut ? (
                <button 
                    onClick={onCashOut}
                    disabled={gameState !== 'FLYING'}
                    className="w-full py-4 bg-orange-500 hover:bg-orange-400 text-black font-black text-xl uppercase rounded-xl shadow-[0_0_20px_rgba(249,115,22,0.4)] active:scale-95 transition flex flex-col items-center justify-center leading-none"
                >
                    <span>CASHOUT</span>
                    <span className="text-xs font-mono mt-1 font-bold">{(parseFloat(amount) * multiplier).toFixed(0)} BDT</span>
                </button>
            ) : (
                <button 
                    onClick={onPlaceBet}
                    disabled={gameState !== 'BETTING'}
                    className={`w-full py-4 rounded-xl font-black text-xl uppercase tracking-wider transition flex flex-col items-center justify-center leading-none ${
                        gameState === 'FLYING' || gameState === 'CRASHED' 
                        ? 'bg-red-900/20 text-red-500 border border-red-500/20 cursor-not-allowed' 
                        : 'bg-green-500 text-black hover:bg-green-400 shadow-[0_0_20px_rgba(34,197,94,0.4)] active:scale-95'
                    }`}
                >
                    {gameState === 'FLYING' ? 'WAIT' : 'BET'}
                    <span className="text-[10px] font-bold mt-1 opacity-70">
                            {gameState === 'FLYING' ? 'Next Round' : 'Place Bet'}
                    </span>
                </button>
            )}
        </div>
    );
};

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
    
    const [soundOn, setSoundOn] = useState(true);

    // Audio - NEW URL
    const bgMusic = useRef(new Audio('https://lqypgzeuenwkeqiaywym.supabase.co/storage/v1/object/public/Music/Aviator%20-%20Music(MP3_160K).mp3')); 
    const winSfx = useRef(new Audio('https://assets.mixkit.co/active_storage/sfx/2019/2019-preview.mp3')); 

    // --- DETERMINISTIC MATH ---
    const seededRandom = (seed: number) => {
        const x = Math.sin(seed) * 10000;
        return x - Math.floor(x);
    };

    const getCrashPoint = (roundId: number) => {
        const r = seededRandom(roundId * 1337); 
        // 4% House Edge
        if (r < 0.04) return 1.00; 
        
        let crash = 0.96 / (1.0 - r);
        if (crash < 1.00) crash = 1.00;
        if (crash > MAX_MULTIPLIER) crash = MAX_MULTIPLIER;
        return Math.floor(crash * 100) / 100;
    };

    const getFlightDuration = (crashPoint: number) => {
        if (crashPoint <= 1.00) return 0;
        const seconds = Math.log(crashPoint) / GROWTH_COEF;
        return seconds * 1000;
    };

    // --- SYNC ENGINE ---
    const calculateCurrentState = () => {
        const now = Date.now();
        const anchorTime = Math.floor(now / 600000) * 600000; 
        
        let simTime = anchorTime;
        let simRoundId = Math.floor(anchorTime / 1000); 

        while (true) {
            const crash = getCrashPoint(simRoundId);
            const flightTime = getFlightDuration(crash);
            const totalRoundTime = BETTING_TIME_MS + flightTime + POST_CRASH_DELAY_MS;

            if (simTime + totalRoundTime > now) {
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
        bgMusic.current.loop = true;
        bgMusic.current.volume = 0.5;
        winSfx.current.volume = 0.6;
        
        fetchBalance();

        const clock = setInterval(() => {
            setBdTime(new Date().toLocaleTimeString('en-US', { timeZone: 'Asia/Dhaka', hour12: true }));
        }, 1000);

        const state = calculateCurrentState();
        const prevHistory = [];
        for(let i=1; i<=20; i++) {
            prevHistory.push({
                val: getCrashPoint(state.roundId - i),
                roundId: state.roundId - i
            });
        }
        setHistory(prevHistory);

        requestRef.current = requestAnimationFrame(syncGameLoop);
        
        // Attempt auto-play on mount if sound enabled
        if (soundOn) {
            bgMusic.current.play().catch(e => console.log("Autoplay blocked, waiting for user interaction"));
        }

        return () => {
            if (requestRef.current) cancelAnimationFrame(requestRef.current);
            bgMusic.current.pause();
            clearInterval(clock);
        };
    }, []);

    // Handle Music Playback Toggle (Controlled ONLY by mute button)
    useEffect(() => {
        if (soundOn) {
            bgMusic.current.play().catch(()=>{});
        } else {
            bgMusic.current.pause();
        }
    }, [soundOn]);

    const fetchBalance = async () => {
        const { data: { session } } = await supabase.auth.getSession();
        if(session) {
            const bal = await getPlayableBalance(session.user.id);
            setBalance(bal);
        }
    };

    const generateBots = (seed: number) => {
        const r = seededRandom(seed);
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

        if (roundId !== currentRoundIdRef.current) {
            currentRoundIdRef.current = roundId;
            currentCrashPointRef.current = crashPoint;
            
            setHistory(prev => {
                if (prev[0]?.roundId === roundId - 1) return prev;
                return [{ val: getCrashPoint(roundId - 1), roundId: roundId - 1 }, ...prev].slice(0, 20);
            });

            setHasBet1(false); setCashedOut1(false); setProfit1(0);
            setHasBet2(false); setCashedOut2(false); setProfit2(0);
            
            generateBots(roundId);
            
            if (autoBet1) placeBet(1, true);
            if (autoBet2) placeBet(2, true);
            
            fetchBalance();
        }

        if (elapsed < BETTING_TIME_MS) {
            if (gameState !== 'BETTING') {
                setGameState('BETTING');
                setMultiplier(1.00);
            }
            
            const remaining = Math.ceil((BETTING_TIME_MS - elapsed) / 1000);
            setTimeLeft(remaining);
            drawCanvas(1.00, false);

        } else {
            const flightElapsed = elapsed - BETTING_TIME_MS;
            const flightTimeSec = flightElapsed / 1000;
            
            let currentMult = Math.exp(GROWTH_COEF * flightTimeSec);
            if (currentMult > crashPoint) currentMult = crashPoint;

            if (currentMult >= crashPoint) {
                if (gameState !== 'CRASHED') {
                    setGameState('CRASHED');
                    setMultiplier(crashPoint);
                }
                drawCanvas(crashPoint, true);
            } else {
                if (gameState !== 'FLYING') {
                    setGameState('FLYING');
                }
                setMultiplier(currentMult);
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

    // --- CANVAS DRAWING ---
    const drawCanvas = (currentMult: number, isCrashed: boolean) => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        const w = canvas.width;
        const h = canvas.height;

        ctx.clearRect(0, 0, w, h);

        // Draw Grid (Radar Style)
        ctx.strokeStyle = 'rgba(255,255,255,0.05)';
        ctx.lineWidth = 1;
        
        // Vertical lines
        for(let x=0; x<=w; x+=w/5) {
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, h);
            ctx.stroke();
        }
        // Horizontal lines
        for(let y=0; y<=h; y+=h/5) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(w, y);
            ctx.stroke();
            if(y < h) {
                ctx.fillStyle = 'rgba(255,255,255,0.1)';
                ctx.font = '10px monospace';
                ctx.fillText(`${((h-y)/50).toFixed(1)}x`, 5, y + 10);
            }
        }

        // Draw Curve
        const viewMax = Math.max(2, currentMult * 1.1);
        const normalizeY = (val: number) => h - ((val - 1) / (viewMax - 1)) * (h * 0.8) - 40;
        
        const endX = w * 0.85; // Plane stays more to the right
        const endY = normalizeY(currentMult);
        const startY = h - 20;

        ctx.beginPath();
        ctx.moveTo(0, startY);
        // Better curve shape
        ctx.bezierCurveTo(w * 0.2, startY, w * 0.4, endY, endX, endY);
        
        ctx.lineWidth = 4;
        ctx.lineCap = 'round';
        ctx.strokeStyle = isCrashed ? '#ef4444' : '#ef4444'; // Always Red line
        ctx.stroke();

        // Fill Area
        ctx.lineTo(endX, h);
        ctx.lineTo(0, h);
        const grad = ctx.createLinearGradient(0, 0, 0, h);
        grad.addColorStop(0, 'rgba(239, 68, 68, 0.4)');
        grad.addColorStop(1, 'rgba(239, 68, 68, 0)');
        ctx.fillStyle = grad;
        ctx.fill();

        // Draw Plane
        if (!isCrashed) {
            ctx.save();
            ctx.translate(endX, endY);
            // Tilt plane slightly up
            ctx.rotate(-15 * Math.PI / 180);
            
            // Draw sleek red plane shape
            ctx.fillStyle = '#ef4444'; // Red
            ctx.shadowColor = '#ef4444';
            ctx.shadowBlur = 15;
            
            ctx.beginPath();
            // Nose
            ctx.moveTo(15, 0);
            // Tail
            ctx.lineTo(-10, 8);
            ctx.lineTo(-10, -8);
            ctx.closePath();
            ctx.fill();
            
            // Cockpit/Details
            ctx.fillStyle = 'white';
            ctx.beginPath();
            ctx.arc(5, -2, 2, 0, Math.PI*2);
            ctx.fill();
            
            // Trail particles effect (simple)
            ctx.restore();
        } else {
             // Explosion Effect
             ctx.save();
             ctx.translate(endX, endY);
             
             // Explosion circles
             ctx.beginPath();
             ctx.arc(0, 0, 20, 0, Math.PI * 2);
             ctx.fillStyle = 'rgba(255, 165, 0, 0.8)';
             ctx.fill();
             
             ctx.beginPath();
             ctx.arc(0, 0, 10, 0, Math.PI * 2);
             ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
             ctx.fill();

             ctx.restore();
        }
    };

    if (gameState === 'SYNCING') {
        return (
            <div className="flex items-center justify-center min-h-screen bg-black text-white flex-col gap-4">
                <Loader2 className="animate-spin text-red-500" size={40} />
                <p className="text-xs font-bold uppercase tracking-widest animate-pulse">Establishing Connection...</p>
            </div>
        );
    }

    return (
        <div className="pb-32 pt-4 px-2 sm:px-4 max-w-xl mx-auto min-h-screen relative font-sans flex flex-col bg-[#050505]">
            
            {/* Header */}
            <div className="flex justify-between items-center mb-4 z-10">
                <Link to="/games" className="p-2 bg-white/5 rounded-xl hover:bg-white/10 text-white border border-white/10"><ArrowLeft size={20}/></Link>
                <div className="bg-[#111] px-6 py-2 rounded-full border border-red-500/30 shadow-[0_0_15px_rgba(239,68,68,0.2)]">
                     <span className="text-red-500 font-bold text-lg font-mono tracking-wide flex items-center gap-2">
                        <Wallet size={16}/> {balance.toFixed(2)}
                     </span>
                </div>
                <button onClick={() => setSoundOn(!soundOn)} className="p-2 bg-white/5 rounded-xl text-gray-400 hover:text-white border border-white/10">
                    {soundOn ? <Volume2 size={20}/> : <VolumeX size={20}/>}
                </button>
            </div>

            {/* Canvas Area */}
            <div className="relative bg-[#0f172a] rounded-3xl border-4 border-[#1e293b] overflow-hidden h-[300px] mb-4 shadow-2xl">
                <canvas ref={canvasRef} className="w-full h-full block" width={600} height={400} />
                
                {/* Overlay Status */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none z-10 w-full">
                    {gameState === 'BETTING' ? (
                        <div className="animate-pulse">
                            <Loader2 size={48} className="text-red-500 animate-spin mx-auto mb-2"/>
                            <p className="text-xs text-red-400 font-bold uppercase tracking-widest mb-1">Preparing Flight</p>
                            <p className="text-5xl font-black text-white drop-shadow-lg">{timeLeft}s</p>
                        </div>
                    ) : (
                        <div>
                             <p className={`text-7xl font-black tracking-tighter drop-shadow-2xl ${gameState === 'CRASHED' ? 'text-red-600 scale-110' : 'text-white'} transition-all`}>
                                 {multiplier.toFixed(2)}x
                             </p>
                             {gameState === 'CRASHED' && (
                                 <div className="mt-2 animate-bounce">
                                     <p className="text-white font-black uppercase text-xl bg-red-600 px-6 py-2 rounded-full inline-block shadow-[0_0_20px_#dc2626]">
                                         PLANE CRASHED
                                     </p>
                                 </div>
                             )}
                        </div>
                    )}
                </div>
                
                {/* History Bar */}
                <div className="absolute top-2 left-2 right-2 flex gap-2 overflow-hidden h-8 mask-fade-right">
                    {history.map((h, i) => (
                        <div key={i} className={`px-3 py-1 rounded text-[10px] font-bold font-mono border min-w-[50px] text-center flex items-center justify-center ${h.val >= 2 ? 'bg-green-500/20 border-green-500/50 text-green-400' : 'bg-gray-800/80 border-gray-700 text-gray-400'}`}>
                            {h.val.toFixed(2)}x
                        </div>
                    ))}
                </div>
            </div>

            {/* Controls - Using Extracted Component */}
            <div className="grid grid-cols-2 gap-3 mb-6">
                <BetPanelControl 
                    id={1}
                    amount={bet1Amount} setAmount={setBet1Amount}
                    autoCash={bet1AutoCashout} setAutoCash={setBet1AutoCashout}
                    autoBet={autoBet1} setAutoBet={setAutoBet1}
                    hasBet={hasBet1} cashedOut={cashedOut1}
                    profit={profit1} multiplier={multiplier}
                    gameState={gameState} balance={balance} format={format}
                    onPlaceBet={() => placeBet(1)} onCashOut={() => handleCashOut(1)}
                />
                <BetPanelControl 
                    id={2}
                    amount={bet2Amount} setAmount={setBet2Amount}
                    autoCash={bet2AutoCashout} setAutoCash={setBet2AutoCashout}
                    autoBet={autoBet2} setAutoBet={setAutoBet2}
                    hasBet={hasBet2} cashedOut={cashedOut2}
                    profit={profit2} multiplier={multiplier}
                    gameState={gameState} balance={balance} format={format}
                    onPlaceBet={() => placeBet(2)} onCashOut={() => handleCashOut(2)}
                />
            </div>

            {/* Live Bets */}
            <div className="flex-1 bg-[#111] rounded-2xl border border-white/10 overflow-hidden flex flex-col shadow-lg">
                <div className="p-3 border-b border-white/5 bg-[#151515] flex justify-between items-center">
                    <h3 className="text-xs font-bold text-white flex items-center gap-2 uppercase tracking-wider">
                        <Users size={14} className="text-red-500"/> Live Bets
                    </h3>
                    <div className="flex items-center gap-2 text-[10px] text-gray-400">
                        <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse shadow-[0_0_5px_#22c55e]"></span> {liveBets.length + 420} Online
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
                        <div key={i} className="flex justify-between items-center p-2 rounded-lg hover:bg-white/5 transition border border-transparent hover:border-white/5">
                            <div className="flex items-center gap-2">
                                <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${bot.user}`} className="w-5 h-5 rounded-full bg-white/10"/>
                                <span className="text-xs text-gray-400 font-medium">{bot.user}</span>
                            </div>
                            <span className="text-xs text-white font-mono font-bold">{bot.bet}</span>
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
