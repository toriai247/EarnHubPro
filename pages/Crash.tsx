
import React, { useEffect, useRef, useState, useCallback } from 'react';
import GlassCard from '../components/GlassCard';
import { Rocket, Trophy, History, Volume2, VolumeX, Zap, Clock, ShieldCheck, DollarSign, Users } from 'lucide-react';
import { supabase } from '../integrations/supabase/client';
import { WalletData, CrashGameState, CrashBet } from '../types';
import { processGameResult, updateWallet } from '../lib/actions';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useUI } from '../context/UIContext';
import BalanceDisplay from '../components/BalanceDisplay';

// --- CONFIGURATION ---
const BETTING_DURATION_MS = 13000; // 13 Seconds Betting Time
const COOLDOWN_MS = 3000; // 3 Seconds after crash

// Visual Interfaces
interface Particle {
  x: number; y: number; vx: number; vy: number; life: number; color: string; size: number;
}
interface Star {
    x: number; y: number; size: number; alpha: number;
}

const Crash: React.FC = () => {
  const { toast } = useUI();
  // User State
  const [wallet, setWallet] = useState<WalletData | null>(null);
  const [userId, setUserId] = useState('');
  const [userProfile, setUserProfile] = useState<{name: string, avatar: string} | null>(null);
  
  // Game Logic State (Synced)
  const [gameState, setGameState] = useState<CrashGameState>({
      id: 1, status: 'BETTING', current_round_id: '', start_time: new Date().toISOString(), crash_point: 1.0, total_bets_current_round: 0, last_crash_point: 0
  });
  
  // Local Calculated State
  const [multiplier, setMultiplier] = useState(1.00);
  const [countdown, setCountdown] = useState(0);
  const [activeBets, setActiveBets] = useState<CrashBet[]>([]);
  
  // Player Interaction
  const [betAmount, setBetAmount] = useState<string>('10');
  const [hasBet, setHasBet] = useState(false);
  const [cashedOut, setCashedOut] = useState(false);
  const [profit, setProfit] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  
  // Refs
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const requestRef = useRef<number | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  
  // Visual Refs
  const starsRef = useRef<Star[]>([]);
  const particlesRef = useRef<Particle[]>([]);
  const explosionRef = useRef<Particle[]>([]);

  // --- INITIALIZATION ---
  useEffect(() => {
      initStars();
      loadUser();
      
      // Initial State Load
      supabase.from('crash_game_state').select('*').single().then(({data}) => {
          if(data) setGameState(data as CrashGameState);
      });

      // REALTIME SUBSCRIPTION
      const channel = supabase.channel('crash_room')
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'crash_game_state' }, payload => {
            const newState = payload.new as CrashGameState;
            setGameState(newState);
            // If new round starts, reset local flags
            if (newState.status === 'BETTING' && payload.old.status !== 'BETTING') {
                setHasBet(false);
                setCashedOut(false);
                setProfit(0);
                setActiveBets([]);
            }
        })
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'crash_bets' }, payload => {
            setActiveBets(prev => [payload.new as CrashBet, ...prev]);
        })
        .subscribe();

      // GAME LOOP (Client Side Animation & Tick)
      const interval = setInterval(gameTick, 50);
      requestRef.current = requestAnimationFrame(animateCanvas);

      return () => {
          supabase.removeChannel(channel);
          clearInterval(interval);
          if (requestRef.current) cancelAnimationFrame(requestRef.current);
          if (audioCtxRef.current) audioCtxRef.current.close();
      };
  }, []);

  const loadUser = async () => {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
            setUserId(session.user.id);
            const { data: w } = await supabase.from('wallets').select('*').eq('user_id', session.user.id).single();
            const { data: p } = await supabase.from('profiles').select('name_1, avatar_1').eq('id', session.user.id).single();
            setWallet(w as WalletData);
            setUserProfile({ name: p?.name_1 || 'User', avatar: p?.avatar_1 || '' });
        }
  };

  const initStars = () => {
      const s = [];
      for(let i=0; i<60; i++) s.push({ x: Math.random(), y: Math.random(), size: Math.random()*2 + 0.5, alpha: Math.random() });
      starsRef.current = s;
  };

  // --- GAME LOGIC ENGINE ---
  const gameTick = () => {
      const now = Date.now();
      const startTime = new Date(gameState.start_time).getTime();

      if (gameState.status === 'BETTING') {
          const elapsed = now - startTime;
          const timeLeft = Math.max(0, BETTING_DURATION_MS - elapsed);
          setCountdown(timeLeft / 1000);
          setMultiplier(1.00);

          // MASTER CLIENT LOGIC: If I am the first to notice time is up, trigger state change
          if (timeLeft <= 0) {
              // This relies on RPC to be safe. Only one call will succeed conceptually or multiple calls result in same state.
              advanceGameState('BETTING'); 
          }
      } 
      else if (gameState.status === 'FLYING') {
          const elapsed = (now - startTime) / 1000;
          // Calculate growth curve (Matches server logic ideally)
          const currentMult = 1 + (0.06 * elapsed) + (0.06 * Math.pow(elapsed, 2.2));
          
          if (currentMult >= gameState.crash_point) {
              setMultiplier(gameState.crash_point); // Clamp
              advanceGameState('FLYING'); // Trigger Crash
          } else {
              setMultiplier(currentMult);
          }
      }
      else if (gameState.status === 'CRASHED') {
          // Wait for Cooldown
          const elapsed = now - startTime;
          if (elapsed >= COOLDOWN_MS) {
              advanceGameState('CRASHED'); // Restart
          }
      }
  };

  // Safe wrapper to call RPC
  const advanceGameState = async (currentStatus: string) => {
      // Small random delay to prevent ALL clients hitting exact same ms
      // In production, a server worker does this. Here, clients cooperate.
      if (Math.random() > 0.1) return; 
      
      await supabase.rpc('next_crash_round_phase', { p_current_status: currentStatus });
  };

  // --- ACTIONS ---
  const handleBet = async () => {
      if (!wallet || hasBet || gameState.status !== 'BETTING') return;
      const amount = parseFloat(betAmount);
      if (amount > wallet.balance) { toast.error("Insufficient Funds"); return; }

      // 1. Deduct
      await updateWallet(userId, amount, 'decrement', 'balance');
      setWallet(prev => prev ? {...prev, balance: prev.balance - amount} : null);
      
      // 2. Place Bet in DB
      const { error } = await supabase.from('crash_bets').insert({
          round_id: gameState.current_round_id,
          user_id: userId,
          amount: amount,
          user_name: userProfile?.name,
          avatar_url: userProfile?.avatar
      });

      if (error) {
          toast.error("Bet Failed");
          // Refund logic would go here
      } else {
          setHasBet(true);
          playSound('bet');
      }
  };

  const handleCashout = async () => {
      if (!hasBet || cashedOut || gameState.status !== 'FLYING') return;
      
      const cashoutMult = multiplier;
      const amount = parseFloat(betAmount);
      const win = amount * cashoutMult;
      const net = win - amount;

      setCashedOut(true);
      setProfit(net);
      playSound('cashout');

      // 1. Update Wallet
      await updateWallet(userId, win, 'increment', 'balance');
      setWallet(prev => prev ? {...prev, balance: prev.balance + win} : null);

      // 2. Record Win
      await supabase.from('crash_bets')
        .update({ cashed_out_at: cashoutMult, profit: net })
        .eq('user_id', userId)
        .eq('round_id', gameState.current_round_id);
      
      // 3. Log Transaction
      await processGameResult(userId, 'crash', 'Crash', amount, win, `Cashed @ ${cashoutMult.toFixed(2)}x`);
  };

  // --- SOUND ---
  const playSound = useCallback((type: 'bet' | 'launch' | 'cashout' | 'crash') => {
      if (isMuted) return;
      const Ctx = window.AudioContext || (window as any).webkitAudioContext;
      if (!audioCtxRef.current && Ctx) audioCtxRef.current = new Ctx();
      const ctx = audioCtxRef.current;
      if (!ctx) return;
      if(ctx.state === 'suspended') ctx.resume();

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      const now = ctx.currentTime;

      if (type === 'bet') {
          osc.frequency.setValueAtTime(600, now);
          osc.frequency.exponentialRampToValueAtTime(1000, now + 0.1);
          gain.gain.setValueAtTime(0.1, now);
          gain.gain.linearRampToValueAtTime(0, now + 0.1);
          osc.start(now);
          osc.stop(now + 0.1);
      } else if (type === 'crash') {
          // Noise buffer
          const buf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
          const data = buf.getChannelData(0);
          for(let i=0; i<ctx.sampleRate; i++) data[i] = Math.random()*2-1;
          const src = ctx.createBufferSource();
          src.buffer = buf;
          src.connect(gain);
          gain.gain.setValueAtTime(0.2, now);
          gain.gain.exponentialRampToValueAtTime(0.01, now+0.5);
          src.start(now);
      } else if (type === 'cashout') {
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(500, now);
          osc.frequency.setValueAtTime(800, now + 0.1);
          gain.gain.setValueAtTime(0.1, now);
          gain.gain.linearRampToValueAtTime(0, now + 0.3);
          osc.start(now);
          osc.stop(now + 0.3);
      }
  }, [isMuted]);

  // --- CANVAS RENDERING (Visuals) ---
  const animateCanvas = () => {
      const cvs = canvasRef.current;
      const ctx = cvs?.getContext('2d');
      const container = containerRef.current;
      
      if (cvs && ctx && container) {
          if (cvs.width !== container.clientWidth) cvs.width = container.clientWidth;
          if (cvs.height !== container.clientHeight) cvs.height = container.clientHeight;
          
          const w = cvs.width;
          const h = cvs.height;
          
          ctx.clearRect(0,0,w,h);

          // Stars
          ctx.fillStyle = '#FFF';
          starsRef.current.forEach(s => {
              if (gameState.status === 'FLYING') {
                  s.x -= 0.001 * multiplier; // Move faster as mult increases
                  if(s.x < 0) s.x = 1;
              }
              ctx.globalAlpha = s.alpha * 0.5;
              ctx.beginPath();
              ctx.arc(s.x * w, s.y * h, s.size, 0, Math.PI*2);
              ctx.fill();
          });
          ctx.globalAlpha = 1;

          // Rocket / Graph Line
          if (gameState.status !== 'BETTING') {
              const progress = Math.min(1, (multiplier - 1) / 10); // Normalize visual position
              const rx = 50 + (progress * (w - 100));
              const ry = (h - 50) - (progress * (h - 100)); // Go up

              if (gameState.status === 'FLYING') {
                  // Draw Curve
                  ctx.strokeStyle = '#ec4899';
                  ctx.lineWidth = 4;
                  ctx.shadowBlur = 15;
                  ctx.shadowColor = '#ec4899';
                  ctx.beginPath();
                  ctx.moveTo(50, h-50);
                  ctx.quadraticCurveTo(50 + (rx-50)/2, ry, rx, ry);
                  ctx.stroke();
                  ctx.shadowBlur = 0;

                  // Rocket Body
                  ctx.save();
                  ctx.translate(rx, ry);
                  ctx.rotate(-Math.PI / 4);
                  ctx.fillStyle = '#fff';
                  ctx.beginPath(); ctx.ellipse(0,0, 20, 8, 0, 0, Math.PI*2); ctx.fill();
                  
                  // Flame
                  ctx.fillStyle = '#fbbf24';
                  ctx.shadowBlur = 20; ctx.shadowColor = '#fbbf24';
                  ctx.beginPath(); ctx.moveTo(-15, -4); ctx.lineTo(-30 - Math.random()*10, 0); ctx.lineTo(-15, 4); ctx.fill();
                  ctx.restore();
              } else {
                  // Explosion
                  if (explosionRef.current.length === 0) {
                      for(let i=0; i<30; i++) explosionRef.current.push({ x: rx, y: ry, vx: (Math.random()-0.5)*10, vy: (Math.random()-0.5)*10, life: 1, color: '#ef4444', size: Math.random()*4+2 });
                  }
                  explosionRef.current.forEach((p, i) => {
                      p.x += p.vx; p.y += p.vy; p.life -= 0.05;
                      ctx.fillStyle = p.color; ctx.globalAlpha = p.life;
                      ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI*2); ctx.fill();
                      if(p.life <= 0) explosionRef.current.splice(i,1);
                  });
              }
          } else {
              // Idle Launchpad
              explosionRef.current = [];
              ctx.fillStyle = '#3b82f6';
              ctx.shadowBlur = 20; ctx.shadowColor = '#3b82f6';
              ctx.beginPath(); ctx.arc(50, h-50, 5, 0, Math.PI*2); ctx.fill();
          }
      }
      requestRef.current = requestAnimationFrame(animateCanvas);
  };

  return (
    <div className="h-[calc(100vh-100px)] sm:h-auto sm:pb-24 sm:pl-20 sm:pt-6 flex flex-col space-y-4 relative overflow-hidden">
       {/* Header */}
       <div className="px-3 pt-2 shrink-0 z-10 flex justify-between items-center">
           <div className="flex items-center gap-2">
               <Link to="/games" className="bg-white/10 p-2 rounded-lg text-white"><Rocket size={16}/></Link>
               <h1 className="text-xl font-display font-bold text-white italic">CRASH LIVE</h1>
           </div>
           <div className="bg-dark-900 px-3 py-1.5 rounded-lg border border-white/10 flex items-center gap-2">
               <Trophy size={14} className="text-yellow-400"/>
               <span className="font-mono font-bold text-white text-sm"><BalanceDisplay amount={wallet?.balance || 0} /></span>
           </div>
       </div>

       <div className="flex flex-col lg:flex-row gap-4 px-2 sm:px-0 flex-1 min-h-0 relative">
           
           {/* GAME CANVAS */}
           <div className="w-full lg:w-3/4 relative flex-1 min-h-0 rounded-2xl overflow-hidden border border-royal-500/20 bg-dark-950 shadow-2xl group order-1 lg:order-2">
               <div ref={containerRef} className="absolute inset-0">
                   <canvas ref={canvasRef} className="w-full h-full" />
               </div>
               
               {/* OVERLAY UI */}
               <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none z-20">
                   {gameState.status === 'BETTING' && (
                       <div className="text-center">
                           <div className="text-neon-green font-bold text-sm uppercase tracking-widest mb-2 animate-pulse">Next Round In</div>
                           <div className="text-6xl font-black text-white font-mono">{countdown.toFixed(1)}s</div>
                           <div className="w-48 h-1.5 bg-gray-800 rounded-full mt-4 overflow-hidden">
                               <motion.div 
                                   initial={{ width: '100%' }} 
                                   animate={{ width: '0%' }} 
                                   transition={{ duration: countdown, ease: 'linear' }}
                                   className="h-full bg-neon-green"
                               />
                           </div>
                       </div>
                   )}
                   {gameState.status === 'FLYING' && (
                       <div className="text-center">
                           <div className="text-7xl font-black text-white drop-shadow-[0_0_20px_rgba(236,72,153,0.5)] font-mono">{multiplier.toFixed(2)}x</div>
                           <div className="text-pink-500 font-bold uppercase mt-2">Flying</div>
                       </div>
                   )}
                   {gameState.status === 'CRASHED' && (
                       <div className="text-center">
                           <div className="text-red-500 font-black text-xl uppercase tracking-[0.5em] mb-2">CRASHED</div>
                           <div className="text-5xl font-black text-white">{multiplier.toFixed(2)}x</div>
                           {hasBet && (
                               <div className={`mt-4 px-4 py-2 rounded-xl font-bold ${cashedOut ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                                   {cashedOut ? `WON +$${profit.toFixed(2)}` : `LOST $${betAmount}`}
                               </div>
                           )}
                       </div>
                   )}
               </div>
           </div>

           {/* BETTING PANEL */}
           <div className="w-full lg:w-1/4 shrink-0 z-20 order-2 lg:order-1 flex flex-col gap-4">
               <GlassCard className="bg-dark-900/90 border-royal-500/20 p-4 shadow-xl">
                   <div className="flex gap-2 mb-4">
                       <input 
                           type="number" 
                           value={betAmount} 
                           onChange={e => setBetAmount(e.target.value)} 
                           disabled={hasBet && gameState.status !== 'CRASHED'}
                           className="w-full bg-black/40 border border-white/10 rounded-xl py-3 px-4 text-white font-bold text-lg focus:border-neon-green outline-none"
                       />
                       <button onClick={() => setBetAmount((parseFloat(betAmount)*2).toString())} className="bg-white/10 rounded-xl px-3 text-xs font-bold text-gray-400 hover:text-white">2x</button>
                   </div>

                   {gameState.status === 'BETTING' ? (
                       !hasBet ? (
                           <button onClick={handleBet} className="w-full py-4 bg-neon-green text-black font-black text-xl rounded-xl hover:bg-emerald-400 transition shadow-[0_0_20px_rgba(16,185,129,0.4)]">
                               BET NOW
                           </button>
                       ) : (
                           <button disabled className="w-full py-4 bg-gray-800 text-gray-500 font-bold rounded-xl border border-white/10">
                               BET PLACED
                           </button>
                       )
                   ) : gameState.status === 'FLYING' && hasBet && !cashedOut ? (
                       <button onClick={handleCashout} className="w-full py-4 bg-yellow-400 text-black font-black text-xl rounded-xl hover:bg-yellow-300 transition shadow-[0_0_30px_rgba(250,204,21,0.5)]">
                           CASHOUT <span className="text-sm block font-mono">${(parseFloat(betAmount) * multiplier).toFixed(2)}</span>
                       </button>
                   ) : (
                       <button disabled className="w-full py-4 bg-gray-800 text-gray-500 font-bold rounded-xl border border-white/10">
                           WAITING...
                       </button>
                   )}
               </GlassCard>

               {/* Live Bets Feed */}
               <div className="flex-1 bg-black/20 rounded-xl border border-white/5 overflow-hidden flex flex-col min-h-[200px]">
                   <div className="p-3 bg-white/5 border-b border-white/5 flex justify-between items-center">
                       <span className="text-xs font-bold text-gray-400 uppercase flex items-center gap-1"><Users size={12}/> Live Bets</span>
                       <span className="text-xs text-white font-mono">{activeBets.length}</span>
                   </div>
                   <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-1">
                       {activeBets.map((bet) => (
                           <div key={bet.id} className={`flex justify-between items-center p-2 rounded-lg text-xs ${bet.cashed_out_at ? 'bg-green-500/10 border border-green-500/20' : 'bg-white/5'}`}>
                               <div className="flex items-center gap-2">
                                   <div className="w-5 h-5 rounded-full bg-gray-700 overflow-hidden"><img src={bet.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${bet.user_id}`} /></div>
                                   <span className="text-gray-300">{bet.user_name || 'User'}</span>
                               </div>
                               <div className="text-right">
                                   <div className="text-white font-bold">${bet.amount}</div>
                                   {bet.cashed_out_at && <div className="text-green-400 font-mono">@{bet.cashed_out_at.toFixed(2)}x</div>}
                               </div>
                           </div>
                       ))}
                   </div>
               </div>
           </div>
       </div>
    </div>
  );
};

export default Crash;
