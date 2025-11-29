
import React, { useEffect, useRef, useState, useCallback } from 'react';
import GlassCard from '../components/GlassCard';
import { Rocket, Trophy, Volume2, VolumeX, Users, Wallet, ChevronDown, RefreshCw } from 'lucide-react';
import { supabase } from '../integrations/supabase/client';
import { WalletData, CrashGameState, CrashBet } from '../types';
import { processGameResult, updateWallet } from '../lib/actions';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useUI } from '../context/UIContext';
import BalanceDisplay from '../components/BalanceDisplay';

// --- CONFIGURATION ---
const BETTING_DURATION_MS = 10000; // 10s Betting
const COOLDOWN_MS = 4000; // 4s Cooldown

// Visual Interfaces
interface Particle { x: number; y: number; vx: number; vy: number; life: number; color: string; size: number; }
interface Star { x: number; y: number; size: number; alpha: number; }

const Crash: React.FC = () => {
  const { toast } = useUI();
  
  // --- USER STATE ---
  const [wallet, setWallet] = useState<WalletData | null>(null);
  const [userId, setUserId] = useState('');
  const [userProfile, setUserProfile] = useState<{name: string, avatar: string} | null>(null);
  
  // --- INPUT STATE ---
  const [betWallet, setBetWallet] = useState<'game_balance' | 'main_balance' | 'deposit_balance'>('game_balance');
  const [walletMenuOpen, setWalletMenuOpen] = useState(false);
  const [betAmount, setBetAmount] = useState<string>('10');
  const [autoCashout, setAutoCashout] = useState<string>('2.00');
  const [isMuted, setIsMuted] = useState(false);

  // --- GAME STATE (Synced) ---
  const [gameState, setGameState] = useState<CrashGameState>({
      id: 1, status: 'BETTING', current_round_id: '', start_time: new Date().toISOString(), crash_point: 1.0, total_bets_current_round: 0, last_crash_point: 0
  });
  
  // --- LOCAL GAME STATE ---
  const [multiplier, setMultiplier] = useState(1.00);
  const [countdown, setCountdown] = useState(0);
  const [activeBets, setActiveBets] = useState<CrashBet[]>([]);
  const [recentHistory, setRecentHistory] = useState<number[]>([]);
  
  // --- PLAYER STATUS ---
  const [hasBet, setHasBet] = useState(false);
  const [cashedOut, setCashedOut] = useState(false);
  const [profit, setProfit] = useState(0);
  const [currentBetId, setCurrentBetId] = useState<string | null>(null);

  // --- REFS ---
  const gameStateRef = useRef<CrashGameState>(gameState); // For interval access
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const requestRef = useRef<number | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const starsRef = useRef<Star[]>([]);
  const explosionRef = useRef<Particle[]>([]);
  
  // --- SYNC REF ---
  useEffect(() => { gameStateRef.current = gameState; }, [gameState]);

  // --- INITIALIZATION ---
  useEffect(() => {
      initStars();
      loadUser();
      
      // 1. Fetch Initial State
      supabase.from('crash_game_state').select('*').single().then(({data}) => {
          if (data) {
              setGameState(data as CrashGameState);
              gameStateRef.current = data as CrashGameState;
          }
      });

      // 2. Realtime Listener
      const channel = supabase.channel('crash_v3')
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'crash_game_state' }, payload => {
            const newState = payload.new as CrashGameState;
            
            // Detect Phase Change
            if (newState.status !== gameStateRef.current.status) {
                if (newState.status === 'BETTING') {
                    // Reset for new round
                    setHasBet(false);
                    setCashedOut(false);
                    setProfit(0);
                    setCurrentBetId(null);
                    setActiveBets([]);
                    setMultiplier(1.00);
                    explosionRef.current = [];
                    // Add history
                    if (gameStateRef.current.status === 'CRASHED' && gameStateRef.current.last_crash_point > 0) {
                        setRecentHistory(prev => [gameStateRef.current.last_crash_point, ...prev].slice(0, 10));
                    }
                }
            }
            setGameState(newState);
        })
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'crash_bets' }, payload => {
            setActiveBets(prev => [payload.new as CrashBet, ...prev]);
        })
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'crash_bets' }, payload => {
            setActiveBets(prev => prev.map(b => b.id === payload.new.id ? payload.new as CrashBet : b));
        })
        .subscribe();

      // 3. Master Game Loop (Tick)
      const tick = setInterval(gameLoop, 50); // 20fps logic tick
      
      // 4. Visual Loop
      requestRef.current = requestAnimationFrame(animateCanvas);

      return () => {
          supabase.removeChannel(channel);
          clearInterval(tick);
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
      for(let i=0; i<80; i++) s.push({ x: Math.random(), y: Math.random(), size: Math.random()*2 + 0.5, alpha: Math.random() });
      starsRef.current = s;
  };

  // --- MASTER GAME LOOP ---
  const gameLoop = () => {
      const current = gameStateRef.current;
      const now = Date.now();
      const startTime = new Date(current.start_time).getTime();
      const elapsed = now - startTime;

      if (current.status === 'BETTING') {
          const timeLeft = Math.max(0, BETTING_DURATION_MS - elapsed);
          setCountdown(timeLeft / 1000);
          setMultiplier(1.00);

          // Auto-Trigger: If time is up, client attempts to push state
          if (elapsed > BETTING_DURATION_MS + 1000) {
              triggerPhaseChange('BETTING'); 
          }
      } 
      else if (current.status === 'FLYING') {
          // Calculate Multiplier: M(t) = 1.00 * e^(0.00006 * ms)
          // 0.00006 is standard coefficient for roughly 10s to 2x
          const rawMult = Math.exp(0.00006 * elapsed);
          const displayMult = Math.floor(rawMult * 100) / 100;
          
          setMultiplier(displayMult);

          // Auto Cashout Check
          if (hasBet && !cashedOut && autoCashout) {
              if (displayMult >= parseFloat(autoCashout)) {
                  handleCashout();
              }
          }

          // Safety: If we've been flying way too long (e.g. calculated > crash_point), force check
          // The server should have sent CRASHED by now. If not, ping it.
          if (displayMult > current.crash_point + 2.0) {
              triggerPhaseChange('FLYING');
          }
      }
      else if (current.status === 'CRASHED') {
          if (elapsed > COOLDOWN_MS + 1000) {
              triggerPhaseChange('CRASHED');
          }
      }
  };

  const triggerPhaseChange = async (expectedStatus: string) => {
      // Optimistic check to avoid spamming
      if (gameStateRef.current.status !== expectedStatus) return;
      
      // Call RPC
      await supabase.rpc('advance_crash_state');
  };

  // --- USER ACTIONS ---
  const handleBet = async () => {
      if (!wallet || hasBet || gameState.status !== 'BETTING') return;
      
      const amount = parseFloat(betAmount);
      if (isNaN(amount) || amount <= 0) { toast.error("Invalid amount"); return; }
      
      // @ts-ignore
      if (amount > (wallet[betWallet] || 0)) { toast.error("Insufficient Funds"); return; }

      // 1. Optimistic Deduct
      await updateWallet(userId, amount, 'decrement', betWallet);
      // @ts-ignore
      setWallet(prev => prev ? {...prev, [betWallet]: prev[betWallet] - amount} : null);
      
      // 2. Insert Bet
      const { data, error } = await supabase.from('crash_bets').insert({
          round_id: gameState.current_round_id,
          user_id: userId,
          amount: amount,
          user_name: userProfile?.name,
          avatar_url: userProfile?.avatar,
          wallet_type: betWallet
      }).select().single();

      if (error) {
          toast.error("Bet Failed");
          await updateWallet(userId, amount, 'increment', betWallet); // Refund
      } else {
          setHasBet(true);
          setCurrentBetId(data.id);
          playSound('bet');
      }
  };

  const handleCashout = async () => {
      if (!hasBet || cashedOut || !currentBetId || gameState.status !== 'FLYING') return;
      
      // Capture current multiplier immediately
      const cashoutMult = multiplier;
      const amount = parseFloat(betAmount);
      const win = amount * cashoutMult;
      const netProfit = win - amount;

      setCashedOut(true);
      setProfit(netProfit);
      playSound('cashout');

      // 1. Credit Game Wallet (Standard)
      await updateWallet(userId, win, 'increment', 'game_balance');
      setWallet(prev => prev ? {...prev, game_balance: prev.game_balance + win} : null);

      // 2. Update Bet Record
      await supabase.from('crash_bets').update({
          cashed_out_at: cashoutMult,
          profit: netProfit
      }).eq('id', currentBetId);

      // 3. Log
      await processGameResult(userId, 'crash', 'Crash', amount, win, `Cashed @ ${cashoutMult.toFixed(2)}x`);
  };

  // --- AUDIO ---
  const playSound = useCallback((type: 'bet' | 'cashout' | 'crash') => {
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
          osc.frequency.linearRampToValueAtTime(800, now + 0.1);
          gain.gain.setValueAtTime(0.1, now);
          gain.gain.linearRampToValueAtTime(0, now + 0.1);
          osc.start(now);
          osc.stop(now + 0.1);
      } else if (type === 'crash') {
          const buf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
          const data = buf.getChannelData(0);
          for(let i=0; i<ctx.sampleRate; i++) data[i] = Math.random()*2-1;
          const src = ctx.createBufferSource();
          src.buffer = buf;
          src.connect(gain);
          gain.gain.setValueAtTime(0.3, now);
          gain.gain.exponentialRampToValueAtTime(0.01, now+0.5);
          src.start(now);
      } else if (type === 'cashout') {
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(500, now);
          osc.frequency.exponentialRampToValueAtTime(1000, now + 0.2);
          gain.gain.setValueAtTime(0.1, now);
          gain.gain.linearRampToValueAtTime(0, now + 0.3);
          osc.start(now);
          osc.stop(now + 0.3);
      }
  }, [isMuted]);

  // --- CANVAS VISUALS ---
  const animateCanvas = () => {
      const cvs = canvasRef.current;
      const ctx = cvs?.getContext('2d');
      const container = containerRef.current;
      const current = gameStateRef.current; 
      
      if (cvs && ctx && container) {
          if (cvs.width !== container.clientWidth) cvs.width = container.clientWidth;
          if (cvs.height !== container.clientHeight) cvs.height = container.clientHeight;
          
          const w = cvs.width;
          const h = cvs.height;
          
          ctx.clearRect(0,0,w,h);

          // Stars Background
          ctx.fillStyle = '#FFF';
          starsRef.current.forEach(s => {
              if (current.status === 'FLYING') {
                  s.x -= 0.002 * (multiplier > 2 ? 2 : multiplier); 
                  if(s.x < 0) s.x = 1;
              }
              ctx.globalAlpha = s.alpha * (0.3 + (current.status === 'FLYING' ? 0.3 : 0));
              ctx.beginPath();
              ctx.arc(s.x * w, s.y * h, s.size, 0, Math.PI*2);
              ctx.fill();
          });
          ctx.globalAlpha = 1;

          // Game Objects
          if (current.status !== 'BETTING') {
              // Visualization Curve
              const visMult = Math.min(multiplier, 10); // Cap visual curve
              const t = Math.min(1, (visMult - 1) / 5); 
              
              const rx = 50 + (t * (w - 100)); // Moves Right
              const ry = (h - 50) - (Math.pow(t, 0.7) * (h - 150)); // Moves Up Curve

              if (current.status === 'FLYING') {
                  // Line
                  ctx.strokeStyle = '#3b82f6';
                  ctx.lineWidth = 4;
                  ctx.lineCap = 'round';
                  ctx.beginPath();
                  ctx.moveTo(50, h-50);
                  ctx.quadraticCurveTo(50 + (rx-50)/2, ry + (h-50-ry)/3, rx, ry);
                  ctx.stroke();

                  // Rocket
                  ctx.save();
                  ctx.translate(rx, ry);
                  ctx.rotate(-Math.PI / 6 - (t * Math.PI/4)); 
                  
                  // Body
                  ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.ellipse(0,0, 25, 10, 0, 0, Math.PI*2); ctx.fill();
                  // Fin
                  ctx.fillStyle = '#ef4444'; ctx.beginPath(); ctx.moveTo(-15, -5); ctx.lineTo(-25, -12); ctx.lineTo(-5, -5); ctx.fill();
                  // Flame
                  ctx.fillStyle = `hsl(${Math.random()*40 + 10}, 100%, 50%)`;
                  ctx.shadowBlur = 20; ctx.shadowColor = '#fbbf24';
                  ctx.beginPath(); ctx.moveTo(-25, -5); ctx.lineTo(-45 - Math.random()*15, 0); ctx.lineTo(-25, 5); ctx.fill();
                  ctx.restore();
              } else {
                  // EXPLOSION
                  if (explosionRef.current.length === 0) {
                      playSound('crash');
                      for(let i=0; i<40; i++) explosionRef.current.push({ x: rx, y: ry, vx: (Math.random()-0.5)*12, vy: (Math.random()-0.5)*12, life: 1, color: Math.random()>0.5 ? '#ef4444' : '#fbbf24', size: Math.random()*5+2 });
                  }
                  explosionRef.current.forEach((p, i) => {
                      p.x += p.vx; p.y += p.vy; p.life -= 0.02;
                      ctx.fillStyle = p.color; ctx.globalAlpha = Math.max(0, p.life);
                      ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI*2); ctx.fill();
                      if(p.life <= 0) explosionRef.current.splice(i,1);
                  });
              }
          } else {
              // Idle
              explosionRef.current = [];
              ctx.fillStyle = '#3b82f6';
              ctx.beginPath(); ctx.arc(50, h-50, 8, 0, Math.PI*2); ctx.fill();
          }
      }
      requestRef.current = requestAnimationFrame(animateCanvas);
  };

  const getWalletLabel = (key: string) => {
      switch(key) {
          case 'game_balance': return 'Game Wallet';
          case 'main_balance': return 'Main Wallet';
          case 'deposit_balance': return 'Deposit Wallet';
          default: return 'Unknown';
      }
  };

  return (
    <div className="h-[calc(100vh-100px)] sm:h-auto sm:pb-24 sm:pl-20 sm:pt-6 flex flex-col space-y-4 relative overflow-hidden">
       {/* HEADER */}
       <div className="px-3 pt-2 shrink-0 z-10 flex justify-between items-center">
           <div className="flex items-center gap-2">
               <Link to="/games" className="bg-white/10 p-2 rounded-lg text-white"><Rocket size={16}/></Link>
               <h1 className="text-xl font-display font-bold text-white italic">CRASH LIVE</h1>
           </div>
           <div className="flex gap-2">
               <button onClick={() => setIsMuted(!isMuted)} className="p-2 bg-white/10 rounded-lg text-white">
                   {isMuted ? <VolumeX size={16}/> : <Volume2 size={16}/>}
               </button>
               <div className="bg-dark-900 px-3 py-1.5 rounded-lg border border-white/10 flex items-center gap-2">
                   <Trophy size={14} className="text-yellow-400"/>
                   {/* @ts-ignore */}
                   <span className="font-mono font-bold text-white text-sm"><BalanceDisplay amount={wallet ? wallet[betWallet] : 0} /></span>
               </div>
           </div>
       </div>

       {/* HISTORY */}
       <div className="flex gap-2 px-3 overflow-x-auto no-scrollbar">
           {recentHistory.map((h, i) => (
               <div key={i} className={`px-3 py-1 rounded bg-white/5 border border-white/5 text-xs font-mono font-bold ${h >= 2.0 ? 'text-green-400' : 'text-gray-400'}`}>
                   {h.toFixed(2)}x
               </div>
           ))}
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
                                   transition={{ duration: countdown || 1, ease: 'linear' }}
                                   className="h-full bg-neon-green"
                               />
                           </div>
                       </div>
                   )}
                   {gameState.status === 'FLYING' && (
                       <div className="text-center">
                           <div className="text-7xl font-black text-white drop-shadow-[0_0_20px_rgba(59,130,246,0.5)] font-mono">{multiplier.toFixed(2)}x</div>
                           <div className="text-blue-400 font-bold uppercase mt-2 animate-pulse">Taking Off...</div>
                       </div>
                   )}
                   {gameState.status === 'CRASHED' && (
                       <div className="text-center">
                           <div className="text-red-500 font-black text-xl uppercase tracking-[0.5em] mb-2">CRASHED</div>
                           <div className="text-5xl font-black text-white">{gameState.last_crash_point ? gameState.last_crash_point.toFixed(2) : multiplier.toFixed(2)}x</div>
                           {hasBet && (
                               <div className={`mt-4 px-4 py-2 rounded-xl font-bold backdrop-blur-md border ${cashedOut ? 'bg-green-500/20 text-green-400 border-green-500/50' : 'bg-red-500/20 text-red-400 border-red-500/50'}`}>
                                   {cashedOut ? `WON +$${profit.toFixed(2)}` : `LOST $${betAmount}`}
                               </div>
                           )}
                       </div>
                   )}
               </div>
           </div>

           {/* BETTING PANEL */}
           <div className="w-full lg:w-1/4 shrink-0 z-20 order-2 lg:order-1 flex flex-col gap-4">
               <GlassCard className="bg-dark-900/90 border-royal-500/20 p-4 shadow-xl relative">
                   
                   {/* Wallet Selector */}
                   <div className="mb-4 relative">
                       <button 
                           onClick={() => setWalletMenuOpen(!walletMenuOpen)}
                           className="w-full flex justify-between items-center bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-xs font-bold text-gray-300 hover:bg-white/5 transition"
                       >
                           <span className="flex items-center gap-2">
                               <Wallet size={14} className="text-purple-400"/> {getWalletLabel(betWallet)}
                           </span>
                           <ChevronDown size={14}/>
                       </button>
                       {walletMenuOpen && (
                           <div className="absolute top-full left-0 right-0 bg-dark-900 border border-white/10 rounded-xl mt-1 p-1 shadow-xl z-50">
                               {['game_balance', 'deposit_balance', 'main_balance'].map((key) => (
                                   <button
                                       key={key}
                                       onClick={() => { setBetWallet(key as any); setWalletMenuOpen(false); }}
                                       className={`w-full text-left px-3 py-2 rounded-lg text-xs flex justify-between items-center hover:bg-white/10 ${betWallet === key ? 'bg-purple-500/20 text-purple-300' : 'text-gray-400'}`}
                                   >
                                       <span>{getWalletLabel(key)}</span>
                                       {/* @ts-ignore */}
                                       <span className="font-mono font-bold"><BalanceDisplay amount={wallet?.[key] || 0} /></span>
                                   </button>
                               ))}
                           </div>
                       )}
                   </div>

                   <div className="flex gap-2 mb-4">
                       <div className="relative flex-1">
                           <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-bold">$</span>
                           <input 
                               type="number" 
                               value={betAmount} 
                               onChange={e => setBetAmount(e.target.value)} 
                               disabled={hasBet && gameState.status !== 'CRASHED'}
                               className="w-full bg-black/40 border border-white/10 rounded-xl py-3 pl-8 pr-3 text-white font-bold focus:border-neon-green outline-none"
                           />
                           <span className="absolute -top-3 left-2 text-[9px] bg-dark-900 px-1 text-gray-400 uppercase font-bold">Bet Amount</span>
                       </div>
                       <div className="relative w-20">
                           <input 
                               type="number" 
                               value={autoCashout} 
                               onChange={e => setAutoCashout(e.target.value)} 
                               disabled={hasBet}
                               className="w-full bg-black/40 border border-white/10 rounded-xl py-3 pl-3 pr-6 text-white font-bold focus:border-neon-green outline-none"
                           />
                           <span className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 text-xs">x</span>
                           <span className="absolute -top-3 left-2 text-[9px] bg-dark-900 px-1 text-gray-400 uppercase font-bold">Auto</span>
                       </div>
                   </div>

                   <div className="grid grid-cols-2 gap-2 mb-4">
                       <button onClick={() => setBetAmount((parseFloat(betAmount)/2).toFixed(2))} className="bg-white/5 rounded-lg py-1 text-xs text-gray-400 hover:text-white">½</button>
                       <button onClick={() => setBetAmount((parseFloat(betAmount)*2).toFixed(2))} className="bg-white/5 rounded-lg py-1 text-xs text-gray-400 hover:text-white">2x</button>
                   </div>

                   {hasBet && !cashedOut && gameState.status === 'FLYING' ? (
                       <button 
                           onClick={handleCashout}
                           className="w-full py-4 bg-gradient-to-r from-green-500 to-emerald-600 text-white font-black text-xl rounded-xl shadow-lg hover:scale-105 transition flex flex-col items-center justify-center leading-none"
                       >
                           <span>CASHOUT</span>
                           <span className="text-xs font-mono opacity-90 mt-1">+${(parseFloat(betAmount) * multiplier).toFixed(2)}</span>
                       </button>
                   ) : (
                       <button 
                           onClick={handleBet}
                           disabled={hasBet || gameState.status !== 'BETTING'}
                           className={`w-full py-4 font-black text-lg rounded-xl shadow-lg transition uppercase tracking-wider ${
                               hasBet 
                               ? 'bg-gray-800 text-gray-500 cursor-not-allowed' 
                               : 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:scale-105 active:scale-95'
                           }`}
                       >
                           {hasBet ? 'Bet Placed' : 'Place Bet'}
                       </button>
                   )}
                   
               </GlassCard>

               <GlassCard className="flex-1 bg-dark-900/50 p-0 overflow-hidden flex flex-col">
                   <div className="p-3 border-b border-white/10 bg-white/5 flex items-center gap-2">
                       <Users size={14} className="text-gray-400"/>
                       <span className="text-xs font-bold text-gray-300 uppercase">Live Bets ({activeBets.length})</span>
                   </div>
                   <div className="flex-1 overflow-y-auto p-2 space-y-1 custom-scrollbar max-h-[200px] lg:max-h-none">
                       {activeBets.map(bet => (
                           <div key={bet.id} className={`flex items-center justify-between p-2 rounded-lg ${bet.cashed_out_at ? 'bg-green-500/10 border border-green-500/20' : 'bg-white/5 border border-white/5'}`}>
                               <div className="flex items-center gap-2">
                                   <img src={bet.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${bet.user_name}`} className="w-6 h-6 rounded-full bg-black"/>
                                   <span className="text-xs text-gray-300 font-bold max-w-[80px] truncate">{bet.user_name || 'User'}</span>
                               </div>
                               <div className="text-right">
                                   <div className="text-xs font-mono text-white">${bet.amount}</div>
                                   {bet.cashed_out_at && <div className="text-[9px] font-bold text-green-400">+{bet.profit.toFixed(2)} ({bet.cashed_out_at}x)</div>}
                               </div>
                           </div>
                       ))}
                   </div>
               </GlassCard>
           </div>

       </div>
    </div>
  );
};

export default Crash;
