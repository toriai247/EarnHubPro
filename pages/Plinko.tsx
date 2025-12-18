
import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Volume2, VolumeX, Settings2, Play, Pause, RefreshCw, Zap, HelpCircle, History, ShieldAlert } from 'lucide-react';
import { Link } from 'react-router-dom';
import GlassCard from '../components/GlassCard';
import { supabase } from '../integrations/supabase/client';
import { updateWallet, createTransaction } from '../lib/actions';
import { getPlayableBalance, deductGameBalance, determineOutcome } from '../lib/gameMath';
import { useUI } from '../context/UIContext';
import BalanceDisplay from '../components/BalanceDisplay';
import { useCurrency } from '../context/CurrencyContext';
import { motion, AnimatePresence } from 'framer-motion';

// --- CONFIG ---
const GRAVITY = 0.25;
const FRICTION = 0.98;
const ELASTICITY = 0.5;

const getMultipliers = (rows: number, risk: 'low' | 'medium' | 'high') => {
    const configs: any = {
        low: {
            8: [5.6, 2.1, 1.1, 1, 0.5, 1, 1.1, 2.1, 5.6],
            10: [8.9, 3, 1.4, 1.1, 1, 0.5, 1, 1.1, 1.4, 3, 8.9],
            12: [10, 3, 1.6, 1.4, 1.1, 1, 0.5, 1, 1.1, 1.4, 1.6, 3, 10],
            14: [12, 4, 2.5, 1.8, 1.4, 1.1, 1, 0.5, 1, 1.1, 1.4, 1.8, 2.5, 4, 12],
            16: [16, 9, 2, 1.4, 1.4, 1.2, 1.1, 1, 0.5, 1, 1.1, 1.2, 1.4, 1.4, 2, 9, 16]
        },
        medium: {
            8: [13, 3, 1.3, 0.7, 0.4, 0.7, 1.3, 3, 13],
            10: [22, 5, 2, 1.4, 0.6, 0.4, 0.6, 1.4, 2, 5, 22],
            12: [33, 11, 4, 2, 1.1, 0.6, 0.3, 0.6, 1.1, 2, 4, 11, 33],
            14: [58, 15, 7, 4, 1.9, 1, 0.5, 0.2, 0.5, 1, 1.9, 4, 7, 15, 58],
            16: [110, 41, 10, 5, 3, 1.5, 1, 0.5, 0.3, 0.5, 1, 1.5, 3, 5, 10, 41, 110]
        },
        high: {
            8: [29, 4, 1.5, 0.3, 0.2, 0.3, 1.5, 4, 29],
            10: [76, 10, 3, 0.9, 0.3, 0.2, 0.3, 0.9, 3, 10, 76],
            12: [170, 51, 14, 4, 1.7, 0.3, 0.2, 0.3, 1.7, 4, 14, 51, 170],
            14: [420, 86, 24, 8, 3, 0.6, 0.2, 0.2, 0.2, 0.6, 3, 8, 24, 86, 420],
            16: [620, 130, 26, 9, 4, 2, 0.2, 0.2, 0.2, 0.2, 0.2, 2, 4, 9, 26, 130, 620]
        }
    };

    if (!configs[risk][rows]) {
        const prev = configs[risk][rows-1] || configs[risk][8];
        return [prev[0]*1.2, ...prev, prev[prev.length-1]*1.2]; 
    }
    return configs[risk][rows];
};

const Plinko: React.FC = () => {
    const { toast } = useUI();
    const { format } = useCurrency();
    
    const [balance, setBalance] = useState(0);
    const [gameBalance, setGameBalance] = useState(0);
    const [betAmount, setBetAmount] = useState<string>('10');
    const [risk, setRisk] = useState<'low' | 'medium' | 'high'>('medium');
    const [rows, setRows] = useState<number>(16);
    const [autoBet, setAutoBet] = useState(false);
    
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const [balls, setBalls] = useState<any[]>([]);
    const [lastMultipliers, setLastMultipliers] = useState<{val: number, color: string}[]>([]); 
    const [soundOn, setSoundOn] = useState(true);

    // Safety Settings
    const [stopLossStreak, setStopLossStreak] = useState<number>(0);
    const lossStreakRef = useRef<number>(0);
    const [visualLossStreak, setVisualLossStreak] = useState(0);

    const dropSfx = useRef(new Audio('https://assets.mixkit.co/active_storage/sfx/2571/2571-preview.mp3'));
    const winSfx = useRef(new Audio('https://assets.mixkit.co/active_storage/sfx/2019/2019-preview.mp3'));
    const hitSfx = useRef(new Audio('https://assets.mixkit.co/active_storage/sfx/2568/2568-preview.mp3')); 

    useEffect(() => {
        fetchBalance();
        dropSfx.current.volume = 0.6; 
        hitSfx.current.volume = 0.4; 
        winSfx.current.volume = 0.8; 
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

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const resize = () => {
            if(containerRef.current && canvas) {
                canvas.width = containerRef.current.clientWidth;
                canvas.height = containerRef.current.clientHeight;
            }
        };
        resize();
        window.addEventListener('resize', resize);

        let animationFrameId: number;
        let autoBetInterval: any;

        if (autoBet) {
            autoBetInterval = setInterval(() => {
                if (stopLossStreak > 0 && lossStreakRef.current >= stopLossStreak) {
                    setAutoBet(false);
                    toast.warning(`Auto-stop triggered after ${lossStreakRef.current} losses.`);
                    return;
                }
                dropBall();
            }, 600); 
        }

        const render = () => {
            if (!canvas || !ctx) return;
            const width = canvas.width;
            const height = canvas.height;
            ctx.clearRect(0, 0, width, height);

            const maxPins = rows + 1; 
            const horizontalPadding = 20;
            const availableWidth = width - (horizontalPadding * 2);
            const spacing = availableWidth / maxPins; 
            const pinRadius = Math.max(2, spacing * 0.08);
            
            const pyramidHeight = rows * spacing;
            const startY = (height - pyramidHeight) / 2 - 40; 
            
            ctx.fillStyle = '#ffffff';
            ctx.shadowBlur = 4;
            ctx.shadowColor = '#ffffff';

            const pins: {x: number, y: number}[] = [];

            for (let r = 0; r < rows; r++) {
                const pinsInThisRow = r + 3; 
                const rowWidth = (pinsInThisRow - 1) * spacing;
                const xStart = (width - rowWidth) / 2;
                
                for (let c = 0; c < pinsInThisRow; c++) {
                    const x = xStart + c * spacing;
                    const y = startY + r * spacing;
                    
                    pins.push({x, y});
                    
                    ctx.beginPath();
                    ctx.arc(x, y, pinRadius, 0, Math.PI * 2);
                    ctx.fill();
                }
            }
            ctx.shadowBlur = 0;

            const multipliers = getMultipliers(rows, risk);
            const bucketWidth = spacing - 4;
            const bucketY = startY + rows * spacing + 10;
            
            const lastRowPins = rows + 3;
            const lastRowWidth = (lastRowPins - 1) * spacing;
            const xBucketStart = (width - lastRowWidth) / 2 + (spacing / 2);

            multipliers.forEach((mul: number, i: number) => {
                const x = xBucketStart + i * spacing;
                const y = bucketY;
                
                let color = '#22c55e'; 
                const mid = Math.floor(multipliers.length / 2);
                const dist = Math.abs(i - mid);
                
                if (dist > mid * 0.7) color = '#ef4444'; 
                else if (dist > mid * 0.3) color = '#f59e0b'; 
                
                ctx.fillStyle = color;
                if (mul >= 10) {
                    ctx.shadowColor = color;
                    ctx.shadowBlur = 10;
                }
                
                ctx.beginPath();
                const bh = 24;
                const bw = bucketWidth;
                const bx = x - bw/2;
                // @ts-ignore
                if(ctx.roundRect) ctx.roundRect(bx, y, bw, bh, 4);
                else ctx.rect(bx, y, bw, bh);
                
                ctx.fill();
                ctx.shadowBlur = 0;

                ctx.fillStyle = '#000';
                ctx.font = `bold ${Math.max(9, spacing * 0.3)}px Inter`;
                ctx.textAlign = 'center';
                ctx.fillText(`${mul}x`, x, y + 16);
            });

            const activeBalls: any[] = [];
            const ballRadius = spacing * 0.25;

            balls.forEach(ball => {
                ball.vy += GRAVITY;
                ball.vx *= FRICTION;
                ball.x += ball.vx;
                ball.y += ball.vy;

                const estimatedRow = Math.floor((ball.y - startY + spacing/2) / spacing);
                
                if (estimatedRow >= 0 && estimatedRow < rows) {
                    pins.forEach(p => {
                        const dx = ball.x - p.x;
                        const dy = ball.y - p.y;
                        const dist = Math.sqrt(dx*dx + dy*dy);
                        
                        if (dist < (ballRadius + pinRadius)) {
                            const angle = Math.atan2(dy, dx);
                            
                            const force = 0.6; 
                            ball.vx += Math.cos(angle) * force;
                            ball.vy *= ELASTICITY; 
                            
                            const overlap = (ballRadius + pinRadius) - dist;
                            ball.x += Math.cos(angle) * overlap;
                            ball.y += Math.sin(angle) * overlap;

                            if (Math.abs(ball.vx) < 0.5) {
                                ball.vx += (Math.random() - 0.5) * 2;
                            }
                            
                            if (soundOn && Math.abs(ball.vy) > 1) {
                                const s = hitSfx.current.cloneNode() as HTMLAudioElement;
                                s.volume = 0.4;
                                s.play().catch(()=>{});
                            }
                        }
                    });
                }

                if (ball.y > bucketY) {
                    const relativeX = ball.x - xBucketStart + (spacing/2);
                    const colIndex = Math.floor(relativeX / spacing);
                    
                    if (colIndex >= 0 && colIndex < multipliers.length) {
                        finishBall(ball.bet, multipliers[colIndex], colIndex, multipliers.length);
                    } else {
                        finishBall(ball.bet, multipliers[Math.floor(multipliers.length/2)], -1, 0); 
                    }
                } else {
                    ctx.beginPath();
                    ctx.arc(ball.x, ball.y, ballRadius, 0, Math.PI * 2);
                    ctx.fillStyle = ball.color;
                    ctx.shadowColor = ball.color;
                    ctx.shadowBlur = 10;
                    ctx.fill();
                    ctx.shadowBlur = 0;
                    activeBalls.push(ball);
                }
            });

            setBalls(activeBalls);
            animationFrameId = requestAnimationFrame(render);
        };

        render();

        return () => {
            cancelAnimationFrame(animationFrameId);
            clearInterval(autoBetInterval);
            window.removeEventListener('resize', resize);
        };
    }, [balls, rows, risk, autoBet, soundOn, stopLossStreak]); 

    const dropBall = async () => {
        const amount = parseFloat(betAmount);
        if (isNaN(amount) || amount <= 0) { 
            toast.error("Invalid amount"); 
            setAutoBet(false);
            return; 
        }
        
        let walletType: 'main' | 'game' = 'main';
        if (balance >= amount) walletType = 'main';
        else if (gameBalance >= amount) walletType = 'game';
        else { 
            if(autoBet) {
                setAutoBet(false);
                toast.error("Insufficient balance");
            } else {
                toast.error("Insufficient balance"); 
            }
            return; 
        }

        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;

        if (walletType === 'main') setBalance(prev => prev - amount);
        else setGameBalance(prev => prev - amount);

        createTransaction(session.user.id, 'game_bet', amount, `Plinko ${risk}`);
        updateWallet(session.user.id, amount, 'decrement', walletType === 'main' ? 'main_balance' : 'game_balance');

        if(soundOn) {
            const s = dropSfx.current.cloneNode() as HTMLAudioElement;
            s.play().catch(()=>{});
        }

        const canvas = canvasRef.current;
        const startX = canvas ? canvas.width / 2 + (Math.random() * 2 - 1) : 200;
        
        const newBall = {
            id: Math.random(),
            x: startX,
            y: 40,
            vx: 0,
            vy: 0,
            color: '#facc15', 
            bet: amount
        };

        setBalls(prev => [...prev, newBall]);
    };

    const finishBall = async (bet: number, multiplier: number, idx: number, total: number) => {
        const payout = bet * multiplier;
        const { data: { session } } = await supabase.auth.getSession();
        
        let color = 'bg-green-500';
        const mid = Math.floor(total / 2);
        const dist = Math.abs(idx - mid);
        if (dist > mid * 0.7) color = 'bg-red-500';
        else if (dist > mid * 0.3) color = 'bg-orange-500';
        
        setLastMultipliers(prev => [{val: multiplier, color}, ...prev].slice(0, 4)); 

        if (multiplier < 1) {
            lossStreakRef.current += 1;
            setVisualLossStreak(lossStreakRef.current);
        } else {
            lossStreakRef.current = 0;
            setVisualLossStreak(0);
        }

        if (session) {
            if (payout > 0) {
                await updateWallet(session.user.id, payout, 'increment', 'game_balance');
                setGameBalance(prev => prev + payout);
                
                if (multiplier >= 10 && soundOn) {
                     winSfx.current.currentTime = 0;
                     winSfx.current.play().catch(()=>{});
                }
            }
            if (payout > bet) {
                createTransaction(session.user.id, 'game_win', payout, `Plinko x${multiplier}`);
            }
            fetchBalance();
        }
    };

    const resetSafety = () => {
        lossStreakRef.current = 0;
        setVisualLossStreak(0);
        toast.success("Safety streak reset.");
    };

    return (
        <div className="pb-32 pt-4 px-2 sm:px-4 max-w-6xl mx-auto min-h-screen font-sans flex flex-col">
            
            <div className="flex justify-between items-center mb-4">
                <Link to="/games" className="p-2 bg-white/5 rounded-xl hover:bg-white/10 text-white border border-white/10">
                   <ArrowLeft size={20} />
                </Link>
                <div className="flex flex-col items-center">
                    <h1 className="text-2xl font-black text-white uppercase tracking-wider flex items-center gap-2 drop-shadow-md">
                        PLINKO
                    </h1>
                </div>
                <div className="flex gap-2">
                    <button className="p-2 bg-white/5 rounded-xl text-gray-400 hover:text-white border border-white/10">
                        <History size={20} />
                    </button>
                    <button className="p-2 bg-white/5 rounded-xl text-gray-400 hover:text-white border border-white/10">
                        <HelpCircle size={20} />
                    </button>
                </div>
            </div>

            <div className="flex flex-col lg:flex-row gap-4 flex-1">
                
                <div className="flex-1 relative order-1 lg:order-2">
                    <div className="relative bg-[#0f172a] rounded-3xl border-4 border-[#1e293b] shadow-2xl overflow-hidden h-[450px] sm:h-[600px] w-full" ref={containerRef}>
                        
                        <div className="absolute top-8 left-1/2 -translate-x-1/2 w-8 h-8 bg-black rounded-full shadow-[inset_0_2px_4px_rgba(255,255,255,0.2)] border border-white/10 z-10"></div>
                        
                        <div className="absolute top-4 right-4 flex flex-col gap-2 z-20">
                            {lastMultipliers.map((m, i) => (
                                <motion.div 
                                    key={i} 
                                    initial={{ scale: 0, x: 20 }} 
                                    animate={{ scale: 1, x: 0 }}
                                    className={`w-10 h-8 rounded-lg flex items-center justify-center text-[10px] font-bold text-white shadow-lg ${m.color}`}
                                >
                                    {m.val}x
                                </motion.div>
                            ))}
                        </div>

                        <canvas ref={canvasRef} className="w-full h-full block" />
                    </div>
                </div>

                <div className="lg:w-80 order-2 lg:order-1 flex flex-col gap-4">
                    
                    <GlassCard className="bg-[#1e293b] border-slate-700 p-4 shadow-xl">
                        {/* Safety Control */}
                        <div className="flex items-center justify-between mb-4 bg-black/40 p-2 rounded-xl border border-slate-700">
                            <div className="flex items-center gap-2">
                                <ShieldAlert size={14} className="text-orange-400" />
                                <span className="text-[10px] font-bold text-slate-400 uppercase">Stop on Loss Streak</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <input 
                                    type="number" 
                                    min="0"
                                    value={stopLossStreak || ''}
                                    onChange={e => setStopLossStreak(parseInt(e.target.value) || 0)}
                                    placeholder="Off"
                                    className="w-12 bg-black/40 border border-slate-600 rounded px-1 py-0.5 text-xs text-white text-center outline-none focus:border-orange-500"
                                />
                                {visualLossStreak > 0 && (
                                    <div className="flex items-center gap-1">
                                        <span className="text-[9px] text-red-400 font-bold">{visualLossStreak} streak</span>
                                        <button onClick={resetSafety} className="p-1 bg-white/5 rounded hover:bg-white/10 text-slate-500">
                                            <RefreshCw size={10} />
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="mb-4">
                            <label className="text-[10px] font-bold text-slate-400 uppercase mb-2 block">Risk Level</label>
                            <div className="bg-[#0f172a] p-1 rounded-xl flex border border-slate-700">
                                {['low', 'medium', 'high'].map(r => (
                                    <button 
                                        key={r} 
                                        onClick={() => setRisk(r as any)}
                                        className={`flex-1 py-2 rounded-lg text-[10px] font-bold uppercase transition-all ${risk === r ? 'bg-indigo-500 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
                                    >
                                        {r}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="mb-6">
                            <label className="text-[10px] font-bold text-slate-400 uppercase mb-2 block">Rows</label>
                            <div className="bg-[#0f172a] p-1 rounded-xl flex overflow-x-auto no-scrollbar border border-slate-700">
                                {[8, 9, 10, 11, 12, 13, 14, 15, 16].map(r => (
                                    <button 
                                        key={r} 
                                        onClick={() => setRows(r)}
                                        className={`min-w-[32px] py-2 rounded-lg text-[10px] font-bold transition-all mx-0.5 ${rows === r ? 'bg-indigo-500 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
                                    >
                                        {r}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="bg-[#0f172a] rounded-xl p-3 border border-slate-700 mb-4">
                            <div className="flex justify-between mb-1">
                                <span className="text-[10px] text-slate-500 font-bold uppercase">Bet Amount</span>
                                <span className="text-[10px] text-slate-400 font-mono"><BalanceDisplay amount={balance} /></span>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="bg-[#1e293b] rounded-lg p-1.5"><Zap size={14} className="text-yellow-400"/></div>
                                <input 
                                    type="number" 
                                    value={betAmount} 
                                    onChange={e => setBetAmount(e.target.value)}
                                    className="bg-transparent w-full text-white font-mono font-bold text-lg outline-none"
                                />
                                <div className="flex gap-1">
                                    <button onClick={() => setBetAmount((parseFloat(betAmount)/2).toFixed(2))} className="px-2 py-1 bg-slate-700 rounded text-[10px] font-bold text-slate-300">½</button>
                                    <button onClick={() => setBetAmount((parseFloat(betAmount)*2).toFixed(2))} className="px-2 py-1 bg-slate-700 rounded text-[10px] font-bold text-slate-300">2x</button>
                                </div>
                            </div>
                        </div>

                        <div className="flex gap-3">
                            <button 
                                onClick={dropBall}
                                className="flex-1 py-4 bg-green-500 hover:bg-green-400 text-black font-black uppercase rounded-xl shadow-lg shadow-green-900/20 active:scale-95 transition text-lg tracking-wider"
                            >
                                PLAY
                            </button>
                            
                            <button 
                                onClick={() => setAutoBet(!autoBet)}
                                className={`w-16 rounded-xl flex items-center justify-center transition border ${autoBet ? 'bg-red-500/20 border-red-500 text-red-500' : 'bg-[#0f172a] border-slate-700 text-slate-400 hover:text-white'}`}
                            >
                                {autoBet ? <Pause size={24} fill="currentColor"/> : <RefreshCw size={24}/>}
                            </button>
                        </div>
                        
                    </GlassCard>
                </div>
                
            </div>
        </div>
    );
};

export default Plinko;
