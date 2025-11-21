
import React, { useEffect, useRef, useState, useCallback } from 'react';
import GlassCard from '../components/GlassCard';
import { Rocket, Trophy, History, Settings, Zap, Clock, ShieldCheck, Volume2, VolumeX, HelpCircle } from 'lucide-react';
import { supabase } from '../integrations/supabase/client';
import { WalletData } from '../types';
import { processGameResult, updateWallet } from '../lib/actions';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useUI } from '../context/UIContext';

// --- CONFIGURATION ---
const BETTING_DURATION_MS = 13000; // 13 Seconds Betting Time
const COOLDOWN_MS = 3000; // 3 Seconds after crash before betting starts
const STORAGE_KEY = 'crash_game_history';

// Visual Interfaces
interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  color: string;
  size: number;
}

interface Star {
    x: number;
    y: number;
    size: number;
    alpha: number;
}

const Crash: React.FC = () => {
  const { toast } = useUI();
  // User State
  const [wallet, setWallet] = useState<WalletData | null>(null);
  const [userId, setUserId] = useState('');
  
  // Game Logic State
  const [gameState, setGameState] = useState<'CONNECTING' | 'BETTING' | 'FLYING' | 'CRASHED'>('CONNECTING');
  const [multiplier, setMultiplier] = useState(1.00);
  const [betAmount, setBetAmount] = useState<string>('10');
  const [autoCashout, setAutoCashout] = useState<string>('2.00');
  const [nextRoundTime, setNextRoundTime] = useState<number>(0);
  const [countdown, setCountdown] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  
  // Player Status
  const [hasBet, setHasBet] = useState(false);
  const [cashedOut, setCashedOut] = useState(false);
  const [cashoutPoint, setCashoutPoint] = useState(0);
  const [profit, setProfit] = useState(0);
  
  // Data
  const [history, setHistory] = useState<number[]>([]);
  
  // Refs for Animation & Logic
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const requestRef = useRef<number>();
  const startTimeRef = useRef<number>(0);
  const crashPointRef = useRef<number>(0);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const lastTickRef = useRef<number>(1.0);

  // Refs for Visual Effects
  const particlesRef = useRef<Particle[]>([]);
  const starsRef = useRef<Star[]>([]);
  const explosionRef = useRef<Particle[]>([]);

  // Initialize Stars
  useEffect(() => {
      const count = 60;
      const stars = [];
      for(let i=0; i<count; i++) {
          stars.push({
              x: Math.random(),
              y: Math.random(),
              size: Math.random() * 2 + 0.5,
              alpha: Math.random()
          });
      }
      starsRef.current = stars;
  }, []);

  // Load Initial Data
  useEffect(() => {
    // 1. Load Wallet
    const loadUser = async () => {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
            setUserId(session.user.id);
            const { data } = await supabase.from('wallets').select('*').eq('user_id', session.user.id).single();
            setWallet(data as WalletData);
        }
    };
    loadUser();

    // 2. Load Local History
    const savedHistory = localStorage.getItem(STORAGE_KEY);
    if (savedHistory) {
        setHistory(JSON.parse(savedHistory));
    }

    // 3. Start The "Real-time" Engine
    initGameLoop();

    // Handle Resize
    window.addEventListener('resize', handleResize);

    return () => {
        if (requestRef.current) cancelAnimationFrame(requestRef.current);
        if (audioCtxRef.current) audioCtxRef.current.close();
        window.removeEventListener('resize', handleResize);
    };
  }, []);

  const handleResize = () => {
      if (gameState === 'BETTING' || gameState === 'CONNECTING') drawIdle();
  };

  // --- SOUND ENGINE (WEB AUDIO API) ---
  const getAudioContext = () => {
      if (!audioCtxRef.current) {
          const Ctx = window.AudioContext || (window as any).webkitAudioContext;
          if (Ctx) {
              audioCtxRef.current = new Ctx();
          }
      }
      if (audioCtxRef.current?.state === 'suspended') {
          audioCtxRef.current.resume();
      }
      return audioCtxRef.current;
  };

  const playSound = useCallback((type: 'bet' | 'launch' | 'tick' | 'cashout' | 'crash') => {
      if (isMuted) return;
      const ctx = getAudioContext();
      if (!ctx) return;
      
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      if (type === 'bet') {
          osc.type = 'sine';
          osc.frequency.setValueAtTime(800, now);
          osc.frequency.exponentialRampToValueAtTime(1200, now + 0.1);
          gain.gain.setValueAtTime(0.1, now);
          gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
          osc.start(now);
          osc.stop(now + 0.1);
      } 
      else if (type === 'launch') {
          osc.type = 'sawtooth';
          osc.frequency.setValueAtTime(100, now);
          osc.frequency.linearRampToValueAtTime(600, now + 2); 
          gain.gain.setValueAtTime(0.05, now);
          gain.gain.linearRampToValueAtTime(0, now + 2);
          osc.start(now);
          osc.stop(now + 2);
      }
      else if (type === 'tick') {
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(800, now);
          gain.gain.setValueAtTime(0.02, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.03);
          osc.start(now);
          osc.stop(now + 0.03);
      }
      else if (type === 'cashout') {
          const playNote = (freq: number, delay: number) => {
              const o = ctx.createOscillator();
              const g = ctx.createGain();
              o.connect(g);
              g.connect(ctx.destination);
              o.type = 'sine';
              o.frequency.setValueAtTime(freq, now + delay);
              g.gain.setValueAtTime(0.1, now + delay);
              g.gain.exponentialRampToValueAtTime(0.01, now + delay + 0.4);
              o.start(now + delay);
              o.stop(now + delay + 0.4);
          }
          playNote(523.25, 0);
          playNote(659.25, 0.08);
          playNote(783.99, 0.16);
          playNote(1046.50, 0.24);
      }
      else if (type === 'crash') {
          const bufferSize = ctx.sampleRate * 1.0;
          const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
          const data = buffer.getChannelData(0);
          for (let i = 0; i < bufferSize; i++) {
              data[i] = Math.random() * 2 - 1;
          }
          const noise = ctx.createBufferSource();
          noise.buffer = buffer;
          const noiseGain = ctx.createGain();
          noise.connect(noiseGain);
          noiseGain.connect(ctx.destination);
          noiseGain.gain.setValueAtTime(0.3, now);
          noiseGain.gain.exponentialRampToValueAtTime(0.01, now + 0.8);
          noise.start(now);
      }
  }, [isMuted]);

  // --- THE TIME-BASED GAME ENGINE ---
  const initGameLoop = () => {
      startBettingPhase();
  };

  const startBettingPhase = () => {
      setGameState('BETTING');
      setMultiplier(1.00);
      setHasBet(false);
      setCashedOut(false);
      setProfit(0);
      lastTickRef.current = 1.0;
      
      // Clear particles
      particlesRef.current = [];
      explosionRef.current = [];
      
      drawIdle();

      const now = Date.now();
      const targetTime = now + BETTING_DURATION_MS;
      setNextRoundTime(targetTime);

      const timer = setInterval(() => {
          const timeLeft = targetTime - Date.now();
          setCountdown(Math.max(0, Math.ceil(timeLeft / 1000)));

          if (timeLeft <= 0) {
              clearInterval(timer);
              startFlightPhase();
          }
      }, 100);
  };

  const startFlightPhase = () => {
      const r = Math.random();
      let crash = 1.00;
      
      if (r < 0.02) crash = 1.00 + (Math.random() * 0.10);
      else if (r < 0.40) crash = 1.10 + (Math.random() * 0.90);
      else if (r < 0.70) crash = 2.00 + (Math.random() * 2.00);
      else if (r < 0.90) crash = 4.00 + (Math.random() * 6.00);
      else crash = 10.00 + (Math.random() * 90.00);

      if (Math.random() < 0.001) crash = 100 + Math.random() * 500;

      crashPointRef.current = parseFloat(crash.toFixed(2));
      
      setGameState('FLYING');
      startTimeRef.current = Date.now();
      playSound('launch');
      
      const animate = () => {
          const now = Date.now();
          const elapsed = (now - startTimeRef.current) / 1000;
          
          const rawMult = 1 + (0.06 * elapsed) + (0.06 * Math.pow(elapsed, 2.2));
          
          if (rawMult >= crashPointRef.current) {
              handleCrash(crashPointRef.current);
          } else {
              setMultiplier(rawMult);
              
              if (rawMult - lastTickRef.current >= 0.1) {
                  playSound('tick');
                  lastTickRef.current = rawMult;
              }

              drawRocket(rawMult, false);
              requestRef.current = requestAnimationFrame(animate);
          }
      };
      requestRef.current = requestAnimationFrame(animate);
  };

  const autoCashoutRef = useRef<number>(0);
  const hasBetRef = useRef<boolean>(false);
  const cashedOutRef = useRef<boolean>(false);

  useEffect(() => {
      autoCashoutRef.current = parseFloat(autoCashout) || 0;
      hasBetRef.current = hasBet;
      cashedOutRef.current = cashedOut;
  }, [autoCashout, hasBet, cashedOut]);

  const handleCrash = (finalValue: number) => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
      
      setMultiplier(finalValue);
      setGameState('CRASHED');
      playSound('crash');
      
      setHistory(prev => {
          const newHist = [finalValue, ...prev].slice(0, 20);
          localStorage.setItem(STORAGE_KEY, JSON.stringify(newHist));
          return newHist;
      });

      if (hasBetRef.current && !cashedOutRef.current) {
          recordGameResult(0, 0, `Crashed @ ${finalValue.toFixed(2)}x`);
      }

      // Continue animation loop for explosion effect
      const animateCrash = () => {
          if (explosionRef.current.length > 0) {
              drawRocket(finalValue, true);
              requestRef.current = requestAnimationFrame(animateCrash);
          }
      };
      animateCrash();

      setTimeout(() => {
          if (requestRef.current) cancelAnimationFrame(requestRef.current);
          startBettingPhase();
          fetchWallet();
      }, COOLDOWN_MS);
  };

  const handlePlaceBet = async () => {
      if (!wallet) return;
      playSound('bet');
      const amount = parseFloat(betAmount);
      if (isNaN(amount) || amount <= 0) {
           toast.error("Invalid bet amount");
           return;
      }
      if (amount > wallet.balance) {
          toast.error("Insufficient balance");
          return;
      }

      await updateWallet(userId, amount, 'decrement', 'balance');
      setWallet(prev => prev ? {...prev, balance: prev.balance - amount} : null);
      
      setHasBet(true);
      setCashedOut(false);
      hasBetRef.current = true;
      cashedOutRef.current = false;
  };

  const handleCashOut = async () => {
      if (!hasBet || cashedOut || gameState !== 'FLYING') return;
      playSound('cashout');

      const currentMult = multiplier;
      setCashedOut(true);
      cashedOutRef.current = true;
      setCashoutPoint(currentMult);

      const bet = parseFloat(betAmount);
      const win = bet * currentMult;
      const net = win - bet;
      setProfit(net);

      await recordGameResult(win, net, `Cashed out @ ${currentMult.toFixed(2)}x`);
      
      setWallet(prev => prev ? {...prev, balance: prev.balance + win} : null);
  };

  const recordGameResult = async (payout: number, profit: number, details: string) => {
      const bet = parseFloat(betAmount);
      await processGameResult(userId, 'crash', 'Avatar Crash', bet, payout, details);
      window.dispatchEvent(new Event('wallet_updated'));
  };

  const fetchWallet = async () => {
      if(!userId) return;
      const { data } = await supabase.from('wallets').select('*').eq('user_id', userId).single();
      if(data) setWallet(data as WalletData);
  };


  // --- CANVAS RENDERING ---
  const drawIdle = () => {
      const canvas = canvasRef.current;
      const container = containerRef.current;
      if (!canvas || !container) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      canvas.width = container.clientWidth;
      canvas.height = container.clientHeight;

      const w = canvas.width;
      const h = canvas.height;

      ctx.clearRect(0, 0, w, h);
      
      // Draw Stars Idle
      ctx.fillStyle = '#FFF';
      starsRef.current.forEach(star => {
          ctx.globalAlpha = star.alpha * 0.5;
          ctx.beginPath();
          ctx.arc(star.x * w, star.y * h, star.size, 0, Math.PI*2);
          ctx.fill();
      });
      ctx.globalAlpha = 1.0;

      drawGrid(ctx, w, h, { x: 0, y: 0 });
      
      // Draw Launchpad
      ctx.fillStyle = '#3b82f6';
      ctx.shadowBlur = 20;
      ctx.shadowColor = '#3b82f6';
      ctx.beginPath();
      ctx.arc(60, h - 40, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
  };

  const drawGrid = (ctx: CanvasRenderingContext2D, w: number, h: number, offset: {x: number, y: number}) => {
      ctx.strokeStyle = 'rgba(255,255,255,0.08)'; // Slightly brighter
      ctx.lineWidth = 1;
      
      const ox = offset.x % 80;
      const oy = offset.y % 60;

      // Vertical Lines (moving left)
      for(let x = -ox; x < w; x += 80) {
          ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke();
      }
      
      // Horizontal Lines (moving down)
      for(let y = oy; y < h + 60; y += 60) {
          // Adjust loop to ensure coverage when scrolling
           // We want lines to appear from top and move down.
           // if oy increases, lines move down.
           const drawY = (y > h) ? y - h - 60 : y; // wrap
           // Simpler approach for endless scroll:
           // just draw extra lines
      }
      
      // Re-do horizontal loop for seamless scrolling
      for(let y = (offset.y % 60) - 60; y < h; y += 60) {
          ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
      }
  };

  const drawRocket = (currentMult: number, isCrashed: boolean) => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    if (canvas.width !== container.clientWidth || canvas.height !== container.clientHeight) {
         canvas.width = container.clientWidth;
         canvas.height = container.clientHeight;
    }

    const w = canvas.width;
    const h = canvas.height;

    ctx.clearRect(0, 0, w, h);

    const time = Date.now();
    const speed = Math.log2(Math.max(1, currentMult)) * 5; // Speed factor

    // 1. Draw Stars (Moving Background)
    ctx.fillStyle = '#FFF';
    starsRef.current.forEach(star => {
        // Parallax effect
        if (!isCrashed) {
            star.y += speed * 0.0002; // Move down
            star.x -= speed * 0.0001; // Move left
            if(star.y > 1) star.y = 0;
            if(star.x < 0) star.x = 1;
        }
        
        ctx.globalAlpha = star.alpha * (isCrashed ? 0.3 : 0.8);
        ctx.beginPath();
        ctx.arc(star.x * w, star.y * h, star.size, 0, Math.PI*2);
        ctx.fill();
    });
    ctx.globalAlpha = 1.0;

    // 2. Draw Animated Grid
    const gridOffset = isCrashed ? { x: 0, y: 0 } : { 
        x: (time / 5) * Math.max(1, speed/2), 
        y: (time / 5) * Math.max(1, speed/2)
    };
    drawGrid(ctx, w, h, gridOffset);

    const progressX = Math.min(0.9, (time - startTimeRef.current) / 10000);
    const x = 60 + (progressX * (w - 100));
    const y = (h - 40) - (Math.log10(Math.max(1, currentMult)) * (h * 0.6)); 

    // 3. Draw Curve
    if (!isCrashed) {
        ctx.strokeStyle = '#ec4899';
        ctx.lineWidth = 4;
        ctx.lineCap = 'round';
        ctx.shadowBlur = 15;
        ctx.shadowColor = '#ec4899';
        
        ctx.beginPath();
        ctx.moveTo(60, h - 40);
        ctx.quadraticCurveTo(60 + (x-60)/2, y + (h-40-y)/2 + 20, x, y);
        ctx.stroke();
        ctx.shadowBlur = 0;
    }

    // 4. Particles (Exhaust)
    if (!isCrashed && gameState === 'FLYING') {
        // Generate new particles
        for(let i=0; i<4; i++) {
            particlesRef.current.push({
                x: x - 20,
                y: y + 5,
                vx: (Math.random() - 0.5) * 2 - 3, // Left
                vy: (Math.random() - 0.5) * 2 + 1, // Down
                life: 1.0,
                color: `hsl(${Math.random()*40 + 10}, 100%, 50%)`,
                size: Math.random() * 3 + 1
            });
        }
    }

    // Render Particles
    particlesRef.current.forEach((p, i) => {
        p.x += p.vx;
        p.y += p.vy;
        p.life -= 0.04;
        if(p.life <= 0) {
            particlesRef.current.splice(i, 1);
            return;
        }
        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.life;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * (2-p.life), 0, Math.PI*2);
        ctx.fill();
    });
    ctx.globalAlpha = 1.0;

    // 5. Draw Rocket or Explosion
    if (!isCrashed) {
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(-Math.PI / 8); 
        
        // Engine Shake & Float
        const shake = (Math.random() - 0.5) * 2;
        const floatY = Math.sin(time / 200) * 2; // Smooth Bobbing
        ctx.translate(shake, shake + floatY);
        
        // Glow Aura
        const pulse = 1 + Math.sin(time / 100) * 0.1;
        ctx.shadowBlur = 30 * pulse;
        ctx.shadowColor = 'rgba(59, 130, 246, 0.8)'; // Royal Blue Glow
        
        // Rocket Body
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.ellipse(0, 0, 24, 10, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0; // Reset for flame
        
        // Rocket Flame (Looping Animation)
        const flameLen = 25 + Math.sin(time / 50) * 5 + (Math.random() * 3);
        ctx.fillStyle = '#fbbf24';
        ctx.shadowBlur = 20;
        ctx.shadowColor = '#f59e0b';
        ctx.beginPath();
        ctx.moveTo(-18, -5);
        ctx.lineTo(-18 - flameLen, 0); // Dynamic length
        ctx.lineTo(-18, 5);
        ctx.fill();
        
        // Inner Flame Core
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.moveTo(-18, -2);
        ctx.lineTo(-18 - (flameLen * 0.6), 0);
        ctx.lineTo(-18, 2);
        ctx.fill();

        ctx.restore();
    } else {
        // Explosion Logic
        if (explosionRef.current.length === 0) {
             for(let i=0; i<40; i++) {
                explosionRef.current.push({
                    x: x,
                    y: y,
                    vx: (Math.random() - 0.5) * 12,
                    vy: (Math.random() - 0.5) * 12,
                    life: 1.0,
                    color: `hsl(${Math.random()*60}, 100%, 60%)`,
                    size: Math.random() * 4 + 2
                });
             }
        }

        explosionRef.current.forEach((p, i) => {
            p.x += p.vx;
            p.y += p.vy;
            p.life -= 0.02;
            if(p.life <= 0) {
                explosionRef.current.splice(i, 1);
                return;
            }
            ctx.fillStyle = p.color;
            ctx.globalAlpha = p.life;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size, 0, Math.PI*2);
            ctx.fill();
        });
        ctx.globalAlpha = 1.0;
    }
  };

  return (
    <div className="h-[calc(100vh-100px)] sm:h-auto sm:pb-24 sm:pl-20 sm:pt-6 flex flex-col space-y-2 relative overflow-hidden">
       
       {/* Header - Compact */}
       <div className="px-3 pt-2 shrink-0 z-10">
           <header className="flex items-center justify-between mb-2">
               <div className="flex items-center gap-2">
                   <Link to="/games" className="bg-white/10 p-2 rounded-lg text-white hover:bg-white/20"><Rocket size={16}/></Link>
                   <h1 className="text-xl font-display font-bold text-white italic">SPACE CRASH</h1>
               </div>
               <div className="flex gap-2">
                   <button 
                       onClick={() => setIsMuted(!isMuted)} 
                       className={`px-2 py-1.5 rounded-lg border border-white/10 flex items-center gap-2 transition ${isMuted ? 'bg-red-500/20 text-red-400' : 'bg-white/5 text-white hover:bg-white/10'}`}
                   >
                       {isMuted ? <VolumeX size={16}/> : <Volume2 size={16}/>}
                   </button>
                   <div className="bg-dark-900 px-3 py-1.5 rounded-lg border border-white/10 flex items-center gap-2">
                       <Trophy size={14} className="text-yellow-400"/>
                       <span className="font-mono font-bold text-white text-sm">${wallet?.balance.toFixed(2) || '0.00'}</span>
                   </div>
               </div>
           </header>
           
           {/* Live History Bar - Compact */}
           <div className="bg-black/40 border border-white/10 py-1 px-3 flex items-center gap-2 overflow-hidden relative rounded-lg backdrop-blur-md h-10">
                <History size={14} className="text-gray-500 shrink-0 mr-2" />
                <div className="flex gap-2 overflow-x-auto no-scrollbar w-full items-center mask-linear-fade">
                    {history.map((val, i) => (
                        <div 
                            key={i} 
                            className={`shrink-0 px-2 py-0.5 rounded text-[10px] font-bold font-mono min-w-[50px] text-center ${
                                val >= 10.0 ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30' :
                                val >= 2.0 ? 'bg-green-500/20 text-green-400 border border-green-500/30' : 
                                'bg-gray-700/50 text-gray-400 border border-gray-600/30'
                            }`}
                        >
                            {val.toFixed(2)}x
                        </div>
                    ))}
                </div>
           </div>
       </div>

       {/* Main Game Area */}
       <div className="flex flex-col lg:flex-row gap-2 px-2 sm:px-0 flex-1 min-h-0 relative">
           
           {/* Game Canvas - Flex Grow to fill available space */}
           <div className="w-full lg:w-3/4 order-1 lg:order-2 relative flex-1 min-h-0 rounded-2xl overflow-hidden border border-royal-500/20 bg-dark-950 shadow-2xl group">
               
               {/* Background Elements */}
               <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-30 animate-pulse"></div>
               <div className="absolute bottom-0 left-0 right-0 h-1/2 bg-gradient-to-t from-royal-900/40 to-transparent"></div>
               
               {/* Canvas */}
               <canvas ref={canvasRef} className="w-full h-full relative z-10" />

               {/* Overlay States */}
               <div className="absolute inset-0 z-20 pointer-events-none flex items-center justify-center">
                   {gameState === 'BETTING' && (
                       <div className="text-center">
                           <div className="text-xs text-neon-green font-bold uppercase tracking-[0.2em] mb-1 animate-pulse">Place Your Bets</div>
                           <div className="text-5xl sm:text-8xl font-black text-white drop-shadow-[0_0_15px_rgba(0,0,0,1)] font-mono">
                               {countdown.toFixed(1)}s
                           </div>
                           <div className="mt-2 w-32 sm:w-64 h-1.5 bg-gray-800 rounded-full overflow-hidden mx-auto border border-white/10">
                               <motion.div 
                                 initial={{ width: "100%" }} 
                                 animate={{ width: "0%" }} 
                                 transition={{ duration: BETTING_DURATION_MS / 1000, ease: "linear" }}
                                 className="h-full bg-neon-green"
                               />
                           </div>
                       </div>
                   )}
                   {gameState === 'FLYING' && (
                       <div className="text-center">
                           <div className="text-6xl sm:text-9xl font-black text-white drop-shadow-[0_0_30px_rgba(236,72,153,0.5)] font-mono tracking-tighter transition-all scale-105 animate-pulse-fast">
                               {multiplier.toFixed(2)}x
                           </div>
                           <div className="text-pink-500 font-bold text-sm uppercase tracking-widest mt-1 animate-pulse">Current Payout</div>
                       </div>
                   )}
                   {gameState === 'CRASHED' && (
                       <div className="text-center bg-black/60 backdrop-blur-md p-4 sm:p-8 rounded-3xl border border-red-500/50 shadow-[0_0_50px_rgba(239,68,68,0.4)] transform scale-105 sm:scale-110 transition">
                           <div className="text-base sm:text-xl text-red-500 font-black uppercase tracking-[0.3em] mb-1">FLEW AWAY</div>
                           <div className="text-4xl sm:text-7xl font-black text-white mb-2">{multiplier.toFixed(2)}x</div>
                           
                           {hasBet ? (
                               cashedOut ? (
                                   <div className="bg-green-500/20 text-green-400 px-3 py-1 rounded-xl font-bold border border-green-500/30 text-xs sm:text-base">
                                       You Won ${profit.toFixed(2)}
                                   </div>
                               ) : (
                                   <div className="bg-red-500/20 text-red-400 px-3 py-1 rounded-xl font-bold border border-red-500/30 text-xs sm:text-base">
                                       You Lost ${betAmount}
                                   </div>
                               )
                           ) : (
                               <div className="text-gray-400 text-xs">Round Over</div>
                           )}
                       </div>
                   )}
               </div>
               
               {/* Real-Time Clock Overlay */}
               <div className="absolute top-4 right-4 bg-black/40 backdrop-blur px-2 py-1 rounded-lg text-[10px] font-mono text-gray-400 border border-white/5 flex items-center gap-2">
                   <Clock size={10}/> {new Date().toLocaleTimeString()}
               </div>
           </div>

           {/* Controls - Compact at bottom */}
           <div className="w-full lg:w-1/4 order-2 lg:order-1 shrink-0 pb-1 sm:pb-0 z-20">
               <GlassCard className="bg-dark-900/90 border-royal-500/20 p-3 shadow-[0_-10px_40px_rgba(0,0,0,0.5)]">
                   
                   {/* Inputs Row - Side by Side on Mobile */}
                   <div className="flex gap-2 mb-2">
                       <div className="flex-1">
                           <label className="text-[9px] text-gray-400 font-bold uppercase block mb-1 ml-1">Bet ($)</label>
                           <div className="relative">
                               <input 
                                    type="number" 
                                    value={betAmount} 
                                    onChange={e => setBetAmount(e.target.value)}
                                    disabled={hasBet && gameState !== 'CRASHED'}
                                    className="w-full bg-black/40 border border-white/10 rounded-lg py-2.5 px-3 text-white font-bold text-sm focus:border-neon-green outline-none"
                               />
                           </div>
                       </div>

                       <div className="flex-1">
                           <label className="text-[9px] text-gray-400 font-bold uppercase block mb-1 ml-1">Auto Cashout (x)</label>
                           <div className="relative">
                               <input 
                                    type="number" 
                                    value={autoCashout} 
                                    onChange={e => setAutoCashout(e.target.value)}
                                    disabled={hasBet && gameState !== 'CRASHED'}
                                    className="w-full bg-black/40 border border-white/10 rounded-lg py-2.5 px-3 text-white font-bold text-sm focus:border-neon-green outline-none"
                               />
                           </div>
                       </div>
                   </div>

                   {/* Quick Amounts */}
                   <div className="flex gap-2 mb-3">
                       <button onClick={() => setBetAmount((parseFloat(betAmount)/2).toFixed(2))} className="flex-1 py-1.5 bg-white/5 text-[10px] font-bold text-gray-400 rounded hover:bg-white/10 transition">1/2</button>
                       <button onClick={() => setBetAmount((parseFloat(betAmount)*2).toFixed(2))} className="flex-1 py-1.5 bg-white/5 text-[10px] font-bold text-gray-400 rounded hover:bg-white/10 transition">2x</button>
                       <button onClick={() => setBetAmount('100')} className="flex-1 py-1.5 bg-white/5 text-[10px] font-bold text-gray-400 rounded hover:bg-white/10 transition">Max</button>
                   </div>

                   {/* Big Action Button - Compact Height */}
                   <div>
                       {gameState === 'BETTING' ? (
                           !hasBet ? (
                               <button 
                                   onClick={handlePlaceBet}
                                   className="w-full py-3.5 bg-neon-green text-black font-black text-lg rounded-xl shadow-[0_0_20px_rgba(16,185,129,0.4)] hover:bg-emerald-400 hover:scale-[1.02] transition active:scale-95 uppercase tracking-wider flex flex-col items-center leading-none"
                               >
                                   BET NOW
                                   <span className="text-[10px] font-normal normal-case opacity-80 mt-0.5">Next round in {countdown}s</span>
                               </button>
                           ) : (
                               <button 
                                    disabled
                                    className="w-full py-3.5 bg-red-500/20 border border-red-500/50 text-red-400 font-black text-lg rounded-xl flex flex-col items-center justify-center cursor-not-allowed leading-none"
                               >
                                   BET PLACED
                                   <span className="text-[10px] font-normal text-gray-400 mt-0.5">Waiting for flight...</span>
                               </button>
                           )
                       ) : gameState === 'FLYING' ? (
                           hasBet && !cashedOut ? (
                               <button 
                                   onClick={handleCashOut}
                                   className="w-full py-3.5 bg-yellow-400 text-black font-black text-lg rounded-xl shadow-[0_0_40px_rgba(250,204,21,0.5)] hover:bg-yellow-300 hover:scale-[1.02] transition active:scale-95 leading-none flex flex-col items-center"
                               >
                                   CASHOUT
                                   <span className="text-[10px] font-mono mt-0.5">${(parseFloat(betAmount) * multiplier).toFixed(2)}</span>
                               </button>
                           ) : (
                               <button disabled className="w-full py-3.5 bg-gray-800 text-gray-500 font-bold text-lg rounded-xl cursor-not-allowed border border-white/5">
                                   {cashedOut ? 'CASHED OUT' : 'WAITING...'}
                               </button>
                           )
                       ) : (
                           <button disabled className="w-full py-3.5 bg-gray-800 text-gray-500 font-bold text-lg rounded-xl cursor-not-allowed border border-white/5">
                               ROUND OVER
                           </button>
                       )}
                   </div>

               </GlassCard>
           </div>

       </div>

       {/* Hide Footer Info on Mobile to save space */}
       <div className="hidden sm:grid px-4 sm:px-0 grid-cols-2 sm:grid-cols-4 gap-4">
           <GlassCard className="p-3 flex items-center gap-3">
               <div className="p-2 bg-white/5 rounded-lg"><Zap size={16} className="text-yellow-400"/></div>
               <div>
                   <p className="text-[10px] text-gray-500 uppercase">Network Speed</p>
                   <p className="text-sm font-bold text-white">14ms</p>
               </div>
           </GlassCard>
           <GlassCard className="p-3 flex items-center gap-3">
               <div className="p-2 bg-white/5 rounded-lg"><ShieldCheck size={16} className="text-green-400"/></div>
               <div>
                   <p className="text-[10px] text-gray-500 uppercase">Fairness</p>
                   <p className="text-sm font-bold text-white">Provably Fair</p>
               </div>
           </GlassCard>
       </div>

    </div>
  );
};

export default Crash;
