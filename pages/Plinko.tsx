
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ArrowLeft, Wallet, Zap, RefreshCw, History, Info, Sparkles, ChevronRight, Volume2, VolumeX } from 'lucide-react';
import { Link } from 'react-router-dom';
import GlassCard from '../components/GlassCard';
import { supabase } from '../integrations/supabase/client';
import { updateWallet, createTransaction } from '../lib/actions';
import { getPlayableBalance, deductGameBalance, determineOutcome } from '../lib/gameMath';
import { useUI } from '../context/UIContext';
import BalanceDisplay from '../components/BalanceDisplay';
import { useCurrency } from '../context/CurrencyContext';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';

const CANVAS_W = 800;
const CANVAS_H = 1000;
const BALL_RADIUS = 12;
const PEG_RADIUS = 6;
const GRAVITY = 0.5;
const FRICTION = 0.99;
const ELASTICITY = 0.45;

const MULTIPLIERS: Record<string, Record<number, number[]>> = {
  low: { 8: [5.6, 2.1, 1.1, 1, 0.5, 1, 1.1, 2.1, 5.6], 12: [10, 3, 1.6, 1.4, 1.1, 1, 0.5, 1, 1.1, 1.4, 1.6, 3, 10], 16: [16, 9, 2, 1.4, 1.4, 1.2, 1.1, 1, 0.5, 1, 1.1, 1.2, 1.4, 1.4, 2, 9, 16] },
  medium: { 8: [13, 3, 1.3, 0.7, 0.4, 0.7, 1.3, 3, 13], 12: [33, 11, 4, 2, 1.1, 0.6, 0.3, 0.6, 1.1, 2, 4, 11, 33], 16: [110, 41, 10, 5, 3, 1.5, 1, 0.5, 0.3, 0.5, 1, 1.5, 3, 5, 10, 41, 110] },
  high: { 8: [29, 4, 1.5, 0.3, 0.2, 0.3, 1.5, 4, 29], 12: [170, 51, 14, 4, 1.7, 0.3, 0.2, 0.3, 1.7, 4, 14, 51, 170], 16: [620, 130, 26, 9, 4, 2, 0.2, 0.2, 0.2, 0.2, 0.2, 2, 4, 9, 26, 130, 620] }
};

const Plinko: React.FC = () => {
  const { toast } = useUI();
  const { symbol, format } = useCurrency();
  const [balance, setBalance] = useState(0);
  const [betAmount, setBetAmount] = useState<string>('20');
  const [risk, setRisk] = useState<'low' | 'medium' | 'high'>('medium');
  const [rows, setRows] = useState<8 | 12 | 16>(12);
  const [isDropping, setIsDropping] = useState(false);
  const [history, setHistory] = useState<number[]>([]);
  const [soundOn, setSoundOn] = useState(true);
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const ballsRef = useRef<any[]>([]);
  const hitPegsRef = useRef<Map<string, number>>(new Map());
  const activeSlotRef = useRef<{idx: number, time: number} | null>(null);
  const requestRef = useRef<number>();

  const hitSfx = useRef(new Audio('https://assets.mixkit.co/active_storage/sfx/2568/2568-preview.mp3'));
  const winSfx = useRef(new Audio('https://assets.mixkit.co/active_storage/sfx/2019/2019-preview.mp3'));
  const loseSfx = useRef(new Audio('https://assets.mixkit.co/active_storage/sfx/2572/2572-preview.mp3'));

  useEffect(() => {
    fetchBalance();
    hitSfx.current.volume = 0.1;
    winSfx.current.volume = 0.4;
    loseSfx.current.volume = 0.3;
    requestRef.current = requestAnimationFrame(update);
    return () => { if (requestRef.current) cancelAnimationFrame(requestRef.current); };
  }, [rows, risk]);

  const fetchBalance = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session) setBalance(await getPlayableBalance(session.user.id));
  };

  const handleQuickAmount = (action: string) => {
      const current = parseFloat(betAmount) || 0;
      let next = current;
      switch(action) {
          case 'min': next = 10; break;
          case 'half': next = Math.max(1, current / 2); break;
          case 'double': next = current * 2; break;
          case 'max': next = balance; break;
          case 'plus10': next = current + 10; break;
          case 'plus50': next = current + 50; break;
      }
      setBetAmount(Math.round(next).toString());
  };

  const update = (time: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);
    const spacingX = CANVAS_W / (rows + 4);
    const spacingY = (CANVAS_H - 250) / (rows + 1);
    const startY = 100;
    const currentMults = MULTIPLIERS[risk][rows];
    const slotY = startY + rows * spacingY + 40;
    const slotW = spacingX * 0.85;
    const slotH = 45;
    const totalSlots = currentMults.length;
    const startX = (CANVAS_W - (totalSlots - 1) * spacingX) / 2;

    currentMults.forEach((m, i) => {
      const x = startX + i * spacingX;
      const isActive = activeSlotRef.current?.idx === i && time - activeSlotRef.current.time < 300;
      let color = '#10b981';
      const dist = Math.abs(i - Math.floor(totalSlots / 2));
      if (dist > totalSlots * 0.35) color = '#ef4444';
      else if (dist > totalSlots * 0.15) color = '#f59e0b';
      ctx.save();
      ctx.globalAlpha = isActive ? 1 : 0.8;
      ctx.fillStyle = color;
      if (isActive) { ctx.shadowBlur = 25; ctx.shadowColor = color; }
      // @ts-ignore
      if (ctx.roundRect) { ctx.beginPath(); ctx.roundRect(x - slotW/2, slotY, slotW, slotH, 8); ctx.fill(); } else { ctx.fillRect(x - slotW/2, slotY, slotW, slotH); }
      ctx.fillStyle = '#000';
      ctx.font = `bold ${spacingX * 0.4}px Inter`;
      ctx.textAlign = 'center';
      ctx.fillText(`${m}x`, x, slotY + slotH/2 + 6);
      ctx.restore();
    });

    for (let r = 0; r < rows; r++) {
      const pegsInRow = r + 3;
      const rowW = (pegsInRow - 1) * spacingX;
      const rowXStart = (CANVAS_W - rowW) / 2;
      const py = startY + r * spacingY;
      for (let c = 0; c < pegsInRow; c++) {
        const px = rowXStart + c * spacingX;
        const key = `${r}-${c}`;
        const isHit = hitPegsRef.current.has(key);
        ctx.beginPath();
        ctx.arc(px, py, PEG_RADIUS, 0, Math.PI * 2);
        if (isHit) { ctx.fillStyle = '#fbbf24'; ctx.shadowBlur = 15; ctx.shadowColor = '#fbbf24'; if (time - (hitPegsRef.current.get(key) || 0) > 150) hitPegsRef.current.delete(key); } else { ctx.fillStyle = 'rgba(255, 255, 255, 0.15)'; }
        ctx.fill();
        ctx.shadowBlur = 0;
      }
    }

    const nextBalls = ballsRef.current.filter(ball => {
      const bSpacingX = CANVAS_W / (ball.lockedRows + 4);
      const bSpacingY = (CANVAS_H - 250) / (ball.lockedRows + 1);
      const bStartX = (CANVAS_W - (ball.lockedMultipliers.length - 1) * bSpacingX) / 2;
      const bSlotY = startY + ball.lockedRows * bSpacingY + 40;
      ball.vy += GRAVITY;
      ball.vx *= FRICTION;
      ball.x += ball.vx;
      ball.y += ball.vy;
      for (let r = 0; r < ball.lockedRows; r++) {
        const pegsInRow = r + 3;
        const rowW = (pegsInRow - 1) * bSpacingX;
        const rowXStart = (CANVAS_W - rowW) / 2;
        const py = startY + r * bSpacingY;
        for (let c = 0; c < pegsInRow; c++) {
          const px = rowXStart + c * bSpacingX;
          const dx = ball.x - px;
          const dy = ball.y - py;
          const dist = Math.sqrt(dx*dx + dy*dy);
          if (dist < BALL_RADIUS + PEG_RADIUS) {
            const angle = Math.atan2(dy, dx);
            const overlap = (BALL_RADIUS + PEG_RADIUS) - dist;
            ball.x += Math.cos(angle) * overlap;
            ball.y += Math.sin(angle) * overlap;
            let nudge = (Math.random() - 0.5) * 0.5;
            if (ball.targetIdx !== undefined) { const targetX = bStartX + ball.targetIdx * bSpacingX; nudge += (targetX - ball.x) * 0.045; }
            ball.vx = (Math.cos(angle) * 4) + nudge;
            ball.vy = Math.abs(ball.vy) * ELASTICITY * -1.2;
            hitPegsRef.current.set(`${r}-${c}`, time);
            if (soundOn) { const s = hitSfx.current.cloneNode() as HTMLAudioElement; s.volume = 0.05; s.play().catch(() => {}); }
          }
        }
      }
      if (ball.y > bSlotY) {
        const relX = ball.x - bStartX + bSpacingX / 2;
        const idx = Math.max(0, Math.min(ball.lockedMultipliers.length - 1, Math.floor(relX / bSpacingX)));
        handleLand(ball.bet, ball.lockedMultipliers[idx]);
        activeSlotRef.current = { idx, time };
        return false;
      }
      ctx.save();
      ctx.beginPath();
      ctx.arc(ball.x, ball.y, BALL_RADIUS, 0, Math.PI * 2);
      ctx.fillStyle = '#facc15'; ctx.shadowBlur = 15; ctx.shadowColor = '#facc15';
      ctx.fill();
      ctx.restore();
      return true;
    });

    ballsRef.current = nextBalls;
    requestRef.current = requestAnimationFrame(update);
  };

  const handleLand = async (bet: number, mult: number) => {
    const payout = bet * mult;
    setHistory(prev => [mult, ...prev].slice(0, 8));
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    if (payout > 0) {
      if (mult >= 1.1) {
        if (soundOn) winSfx.current.play().catch(() => {});
        if (mult >= 5) confetti({ particleCount: 60, spread: 50, origin: { y: 0.8 } });
      } else {
        if (soundOn) loseSfx.current.play().catch(() => {});
      }
      await updateWallet(session.user.id, payout, 'increment', 'game_balance');
      await createTransaction(session.user.id, 'game_win', payout, `Plinko ${mult}x`);
    } else {
        if (soundOn) loseSfx.current.play().catch(() => {});
    }
    fetchBalance();
  };

  const dropBall = async () => {
    const amount = parseFloat(betAmount);
    if (isNaN(amount) || amount < 1) { toast.error("Min bet 1 TK"); return; }
    if (amount > balance) { toast.error("Insufficient balance"); return; }
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    setIsDropping(true);
    try {
      await deductGameBalance(session.user.id, amount, 'Neon Plinko');
      setBalance(prev => prev - amount);
      await createTransaction(session.user.id, 'game_bet', amount, `Plinko Drop`);
      const outcome = await determineOutcome(session.user.id, 0.35, amount);
      const mults = [...MULTIPLIERS[risk][rows]]; 
      let targetIdx;
      if (outcome === 'win') { const winners = mults.map((m, i) => m >= 1.5 ? i : -1).filter(i => i !== -1); targetIdx = winners[Math.floor(Math.random() * winners.length)]; } else { const losers = mults.map((m, i) => m < 1.5 ? i : -1).filter(i => i !== -1); targetIdx = losers[Math.floor(Math.random() * losers.length)]; }
      ballsRef.current.push({ x: CANVAS_W / 2 + (Math.random() * 8 - 4), y: 40, vx: (Math.random() - 0.5) * 2, vy: 0, bet: amount, targetIdx, lockedMultipliers: mults, lockedRows: rows, lockedRisk: risk });
    } catch (e: any) { toast.error(e.message); } finally { setIsDropping(false); }
  };

  return (
    <div className="pb-32 pt-4 px-4 max-w-lg mx-auto min-h-screen relative flex flex-col bg-void overflow-hidden">
      <div className="flex justify-between items-center mb-6 z-10">
        <div className="flex items-center gap-3">
          <Link to="/games" className="p-2.5 bg-panel rounded-2xl border border-white/5 text-white hover:bg-white/10 transition active:scale-90">
            <ArrowLeft size={20} />
          </Link>
          <div>
            <h1 className="text-xl font-black text-white uppercase tracking-tighter leading-none">Cyber <span className="text-brand">Plinko</span></h1>
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

      <div className="flex-1 bg-[#050505] rounded-[3.5rem] border-8 border-[#111] shadow-2xl relative overflow-hidden mb-6">
        <canvas ref={canvasRef} width={CANVAS_W} height={CANVAS_H} className="w-full h-full block" />
      </div>

      <GlassCard className="p-6 bg-panel border-t border-white/10 rounded-t-[4rem] rounded-b-none -mx-4 pb-12 shadow-2xl relative">
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="bg-void p-1 rounded-2xl border border-border-base flex h-11 relative">
            {['low', 'medium', 'high'].map(r => (
              <button key={r} onClick={() => setRisk(r as any)} className={`flex-1 relative z-10 text-[10px] font-black uppercase transition-all duration-300 ${risk === r ? 'text-black' : 'text-gray-500'}`}>{r}</button>
            ))}
            <motion.div className="absolute top-1 bottom-1 bg-white rounded-xl shadow-lg" animate={{ width: '33.33%', left: risk === 'low' ? '4px' : risk === 'medium' ? '33.33%' : '66.66%' }} />
          </div>
          <div className="bg-void p-1 rounded-2xl border border-border-base flex h-11 relative">
            {[8, 12, 16].map(r => (
              <button key={r} onClick={() => setRows(r as any)} className={`flex-1 relative z-10 text-[10px] font-black uppercase transition-all duration-300 ${rows === r ? 'text-black' : 'text-gray-500'}`}>{r}</button>
            ))}
            <motion.div className="absolute top-1 bottom-1 bg-white rounded-xl shadow-lg" animate={{ width: '33.33%', left: rows === 8 ? '4px' : rows === 12 ? '33.33%' : '66.66%' }} />
          </div>
        </div>

        <div className="flex items-stretch gap-4 mb-6">
          <div className="bg-void border border-border-base rounded-3xl px-6 py-4 flex-1 flex flex-col justify-center">
            <p className="text-[10px] text-muted font-black uppercase tracking-widest mb-1">STAKE AMOUNT</p>
            <div className="flex items-center gap-2">
              <span className="text-brand font-black text-2xl">{symbol}</span>
              <input type="number" value={betAmount} onChange={e => setBetAmount(e.target.value)} className="bg-transparent text-white font-mono font-black text-3xl w-full outline-none" />
            </div>
          </div>
          <button onClick={dropBall} disabled={isDropping} className="px-12 rounded-[2rem] font-black uppercase text-base bg-brand text-black hover:bg-white shadow-yellow-pop transition-all active:scale-95">DROP</button>
        </div>
        <div className="grid grid-cols-3 gap-3">
          {['min', 'half', 'double', 'max', 'plus10', 'plus50'].map((action) => (
            <button key={action} onClick={() => handleQuickAmount(action)} className="py-3 bg-void rounded-2xl text-[10px] font-black text-gray-400 hover:text-white transition-all border border-border-base uppercase tracking-widest">{action === 'plus10' ? '+10' : action === 'plus50' ? '+50' : action}</button>
          ))}
        </div>
      </GlassCard>
      <style>{`
        .shadow-yellow-pop { box-shadow: 0 10px 40px -10px rgba(250, 190, 11, 0.4); }
        .no-scrollbar::-webkit-scrollbar { display: none; }
      `}</style>
    </div>
  );
};

export default Plinko;
