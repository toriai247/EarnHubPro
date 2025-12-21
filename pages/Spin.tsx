
import React, { useState, useEffect, useRef } from 'react';
import GlassCard from '../components/GlassCard';
import { ArrowLeft, RefreshCw, Wallet, Zap, Trophy, Play, Star, Sparkles, Volume2, VolumeX } from 'lucide-react';
import { Link } from 'react-router-dom';
import { supabase } from '../integrations/supabase/client';
import { updateWallet, createTransaction } from '../lib/actions';
import { getPlayableBalance, deductGameBalance, determineOutcome } from '../lib/gameMath';
import { useUI } from '../context/UIContext';
import BalanceDisplay from '../components/BalanceDisplay';
import { useCurrency } from '../context/CurrencyContext';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';

const SEGMENTS = [
  { multiplier: 0, label: 'LOSE', color: '#000000', text: '#666' },
  { multiplier: 2, label: 'x2.0', color: '#1E40AF', text: '#FFF' }, 
  { multiplier: 0, label: 'MISS', color: '#080808', text: '#444' },
  { multiplier: 5, label: 'x5.0', color: '#6D28D9', text: '#FFF' }, 
  { multiplier: 0, label: 'LOSE', color: '#000000', text: '#666' },
  { multiplier: 1.5, label: 'x1.5', color: '#059669', text: '#FFF' }, 
  { multiplier: 0, label: 'MISS', color: '#080808', text: '#444' },
  { multiplier: 10, label: 'JACKPOT', color: '#D97706', text: '#000' }, 
];

const Spin: React.FC = () => {
  const { toast } = useUI();
  const { symbol, format } = useCurrency();
  const [balance, setBalance] = useState(0);
  const [betAmount, setBetAmount] = useState<string>('20');
  const [isSpinning, setIsSpinning] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [lastWin, setLastWin] = useState<number | null>(null);
  const [soundOn, setSoundOn] = useState(true);

  const spinSfx = useRef(new window.Audio('https://assets.mixkit.co/active_storage/sfx/2003/2003-preview.mp3'));
  const winSfx = useRef(new window.Audio('https://assets.mixkit.co/active_storage/sfx/2019/2019-preview.mp3'));
  const loseSfx = useRef(new window.Audio('https://assets.mixkit.co/active_storage/sfx/2572/2572-preview.mp3'));

  useEffect(() => {
    spinSfx.current.volume = 0.5;
    winSfx.current.volume = 0.7;
    loseSfx.current.volume = 0.6;
    fetchBalance();
  }, []);

  const fetchBalance = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session) setBalance(await getPlayableBalance(session.user.id));
  };

  const handleQuickAmount = (action: string) => {
    if (isSpinning) return;
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

  const handleSpin = async () => {
    const amount = parseFloat(betAmount);
    if (isNaN(amount) || amount < 1) { toast.error("Min stake 1 TK"); return; }
    if (amount > balance) { toast.error("Insufficient balance"); return; }

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    setIsSpinning(true);
    setLastWin(null);
    if (soundOn) {
      spinSfx.current.currentTime = 0;
      spinSfx.current.play().catch(() => {});
    }

    try {
      await deductGameBalance(session.user.id, amount, 'Lucky Royal');
      setBalance(prev => prev - amount);
      await createTransaction(session.user.id, 'game_bet', amount, `Lucky Royal Spin`);
    } catch (e: any) {
      toast.error(e.message);
      setIsSpinning(false);
      return;
    }

    const outcome = await determineOutcome(session.user.id, 0.35, amount);
    let targetIndex = 0;
    
    if (outcome === 'win') {
      const winIndices = [1, 3, 5, 7];
      const r = Math.random();
      if (r < 0.5) targetIndex = 5;      
      else if (r < 0.8) targetIndex = 1; 
      else if (r < 0.95) targetIndex = 3;
      else targetIndex = 7;              
    } else {
      const lossIndices = [0, 2, 4, 6];
      targetIndex = lossIndices[Math.floor(Math.random() * lossIndices.length)];
    }

    const segment = SEGMENTS[targetIndex];
    const extraSpins = 8 + Math.floor(Math.random() * 4);
    const segmentAngle = 360 / SEGMENTS.length;
    const targetStopRotation = 270 - (targetIndex * segmentAngle + (segmentAngle / 2));
    const finalRotation = rotation + (360 * extraSpins) + (targetStopRotation - (rotation % 360));
    
    setRotation(finalRotation);

    setTimeout(async () => {
      setIsSpinning(false);
      const payout = amount * segment.multiplier;
      
      if (payout > 0) {
        setLastWin(payout);
        if (soundOn) winSfx.current.play().catch(() => {});
        toast.success(`Royal Multiplier: ${segment.multiplier}x`);
        confetti({ particleCount: 150, spread: 70, origin: { y: 0.6 }, colors: ['#D97706', '#FFFFFF', '#10B981'] });
        await updateWallet(session.user.id, payout, 'increment', 'game_balance');
        await createTransaction(session.user.id, 'game_win', payout, `Wheel Victory x${segment.multiplier}`);
        setBalance(prev => prev + payout);
      } else {
        if (soundOn) loseSfx.current.play().catch(() => {});
        toast.info("Unlucky spin. Better luck next time!");
      }
      fetchBalance();
    }, 4000);
  };

  return (
    <div className="pb-32 pt-4 px-4 max-w-lg mx-auto min-h-screen relative flex flex-col bg-void overflow-hidden">
      <div className="flex justify-between items-center mb-8 z-10">
        <div className="flex items-center gap-3">
          <Link to="/games" className="p-2 bg-panel rounded-2xl border border-white/5 text-white hover:bg-white/10 transition active:scale-90">
            <ArrowLeft size={20} />
          </Link>
          <div>
            <h1 className="text-xl font-black text-white uppercase tracking-tighter leading-none">Royal <span className="text-brand">Wheel</span></h1>
            <div className="flex items-center gap-1.5 mt-1">
              <div className="w-1.5 h-1.5 rounded-full bg-success animate-pulse shadow-glow"></div>
              <span className="text-[8px] text-muted font-black uppercase tracking-widest">Protocol Sync</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setSoundOn(!soundOn)} className="p-2.5 bg-white/5 rounded-2xl text-gray-400 hover:text-white transition border border-white/5">
             {soundOn ? <Volume2 size={18}/> : <VolumeX size={18}/>}
          </button>
          <div className="flex items-center gap-2 bg-panel px-5 py-2.5 rounded-2xl border border-brand/20 shadow-glow">
            <Wallet size={16} className="text-brand" />
            <span className="text-lg font-black text-brand tracking-tighter font-mono"><BalanceDisplay amount={balance}/></span>
          </div>
        </div>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center relative z-10 py-4">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 z-40 pointer-events-none">
          <motion.div animate={isSpinning ? { rotate: [0, -10, 5, -10, 0] } : {}} transition={{ repeat: Infinity, duration: 0.15 }}>
            <div className="w-0 h-0 border-l-[15px] border-l-transparent border-r-[15px] border-r-transparent border-t-[35px] border-t-white relative drop-shadow-[0_4px_10px_rgba(0,0,0,0.8)]">
              <div className="absolute -top-10 left-1/2 -translate-x-1/2 w-4 h-4 bg-brand rounded-full border-2 border-white shadow-glow"></div>
            </div>
          </motion.div>
        </div>

        <div className="relative p-10 rounded-full bg-[#0a0a0a] border-8 border-[#111] shadow-[0_0_80px_rgba(0,0,0,1)] ring-1 ring-white/5">
          <div className="relative w-72 h-72 sm:w-80 sm:h-80 rounded-full border-[6px] border-[#111] shadow-2xl overflow-hidden bg-black ring-4 ring-white/5">
            <motion.div 
              className="w-full h-full relative"
              style={{ background: `conic-gradient(${SEGMENTS[0].color} 0deg 45deg, ${SEGMENTS[1].color} 45deg 90deg, ${SEGMENTS[2].color} 90deg 135deg, ${SEGMENTS[3].color} 135deg 180deg, ${SEGMENTS[4].color} 180deg 225deg, ${SEGMENTS[5].color} 225deg 270deg, ${SEGMENTS[6].color} 270deg 315deg, ${SEGMENTS[7].color} 315deg 360deg)` }}
              animate={{ rotate: rotation }}
              transition={{ duration: 4, ease: [0.15, 0, 0, 1] }}
            >
              {[...Array(8)].map((_, i) => (
                <div key={i} className="absolute top-1/2 left-1/2 w-full h-px bg-white/10 origin-left" style={{ transform: `translate(0, -50%) rotate(${i * 45}deg)` }} />
              ))}
              {SEGMENTS.map((seg, i) => (
                <div key={i} className="absolute inset-0 flex justify-center pt-8" style={{ transform: `rotate(${i * 45 + 22.5}deg)` }}>
                  <div className="flex flex-col items-center gap-1.5 origin-center">
                    <span className="font-black text-xs uppercase tracking-tighter drop-shadow-[0_2px_4px_rgba(0,0,0,1)] select-none text-center" style={{ color: seg.text }}>{seg.label}</span>
                  </div>
                </div>
              ))}
            </motion.div>
          </div>
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-20 h-20 bg-black/90 backdrop-blur-md rounded-full z-20 flex items-center justify-center border-4 border-brand/20 shadow-2xl group">
            <div className="w-14 h-14 bg-gradient-to-br from-brand to-yellow-700 rounded-full flex items-center justify-center text-black shadow-glow animate-pulse">
              <Trophy size={28} strokeWidth={2.5} />
            </div>
          </div>
        </div>
        <AnimatePresence>
          {lastWin !== null && (
            <motion.div initial={{ scale: 0, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0 }} className="mt-10 bg-brand text-black px-10 py-3 rounded-2xl font-black text-2xl shadow-yellow-pop uppercase tracking-widest border-4 border-black z-30">
              WIN: {format(lastWin)}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <GlassCard className="p-6 bg-panel border-t border-white/10 rounded-t-[3.5rem] rounded-b-none -mx-4 pb-12 shadow-2xl relative">
        <div className="flex items-stretch gap-3 mb-6">
          <div className="bg-void border border-border-base rounded-2xl px-5 py-3 flex-1 flex flex-col justify-center transition-colors focus-within:border-brand/40">
            <p className="text-[10px] text-muted font-black uppercase tracking-widest mb-1">STAKE AMOUNT</p>
            <div className="flex items-center gap-2">
              <span className="text-brand font-black text-xl">{symbol}</span>
              <input type="number" value={betAmount} onChange={e => setBetAmount(e.target.value)} disabled={isSpinning} className="bg-transparent text-white font-mono font-black text-2xl w-full outline-none placeholder-gray-800" />
            </div>
          </div>
          <button onClick={handleSpin} disabled={isSpinning} className={`px-10 rounded-2xl font-black uppercase text-sm shadow-lg flex items-center justify-center gap-3 transition-all active:scale-95 ${isSpinning ? 'bg-gray-800 text-gray-500 cursor-not-allowed' : 'bg-brand text-black hover:bg-white shadow-yellow-pop'}`}>
            {isSpinning ? <RefreshCw className="animate-spin" size={20} /> : <><Play size={20} fill="currentColor" /> SPIN</>}
          </button>
        </div>
        <div className="grid grid-cols-3 gap-2">
            {['min', 'half', 'double', 'max', 'plus10', 'plus50'].map((action) => (
                <button key={action} onClick={() => handleQuickAmount(action)} disabled={isSpinning} className="py-3 bg-void rounded-xl text-[10px] font-black text-gray-400 hover:text-white hover:border-brand transition-all border border-border-base uppercase tracking-widest">{action === 'plus10' ? '+10' : action === 'plus50' ? '+50' : action}</button>
            ))}
        </div>
      </GlassCard>
      <style>{`
        .shadow-glow { box-shadow: 0 0 20px rgba(250, 190, 11, 0.15); }
        .shadow-yellow-pop { box-shadow: 0 10px 40px -10px rgba(250, 190, 11, 0.4); }
      `}</style>
    </div>
  );
};

export default Spin;
