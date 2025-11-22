
import React, { useEffect, useState, useRef, useCallback } from 'react';
import GlassCard from '../components/GlassCard';
import { Trophy, History, X, Sparkles, ArrowLeft, Loader2, Volume2, VolumeX, Zap, ChevronDown, Wallet } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../integrations/supabase/client';
import { WalletData, GameResult, SpinItem } from '../types';
import { processGameResult, updateWallet } from '../lib/actions';
import { Link } from 'react-router-dom';
import { useUI } from '../context/UIContext';
import BalanceDisplay from '../components/BalanceDisplay';

const Spin: React.FC = () => {
  const { toast } = useUI();
  const [wallet, setWallet] = useState<WalletData | null>(null);
  const [history, setHistory] = useState<GameResult[]>([]);
  const [userId, setUserId] = useState('');
  
  // Spin Logic States
  const [spinItems, setSpinItems] = useState<SpinItem[]>([]);
  const [isSpinning, setIsSpinning] = useState(false);
  const [isRevealing, setIsRevealing] = useState(false); 
  const [rotation, setRotation] = useState(0);
  const [showWinModal, setShowWinModal] = useState(false);
  const [winResult, setWinResult] = useState<{label: string, value: number} | null>(null);
  
  // Betting State
  const [betAmount, setBetAmount] = useState<string>('10');
  const [isMuted, setIsMuted] = useState(false);
  
  // Wallet Selection
  const [betWallet, setBetWallet] = useState<'game_balance' | 'bonus_balance' | 'deposit_balance' | 'main_balance'>('game_balance');
  const [walletMenuOpen, setWalletMenuOpen] = useState(false);

  // Refs
  const audioCtxRef = useRef<AudioContext | null>(null);

  const segmentAngle = 360 / Math.max(1, spinItems.length);

  useEffect(() => {
    fetchData();
    return () => {
        if (audioCtxRef.current) audioCtxRef.current.close();
    };
  }, []);

  const fetchData = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
        setUserId(session.user.id);
        const [walletRes, historyRes, spinRes] = await Promise.all([
            supabase.from('wallets').select('*').eq('user_id', session.user.id).single(),
            supabase.from('game_history').select('*').eq('user_id', session.user.id).eq('game_id', 'spin').order('created_at', {ascending: false}).limit(5),
            supabase.from('spin_items').select('*').eq('is_active', true).order('value', {ascending: true})
        ]);

        if(walletRes.data) setWallet(walletRes.data as WalletData);
        if(historyRes.data) {
            setHistory(historyRes.data.map((row: any) => ({
                id: row.id, gameId: row.game_id, gameName: row.game_name, bet: row.bet,
                payout: row.payout, profit: row.profit, timestamp: new Date(row.created_at).getTime(), details: row.details
            })));
        }
        if(spinRes.data) {
            setSpinItems(spinRes.data as SpinItem[]);
        }
    }
  };

  // --- HELPER: Get Current Wallet Balance ---
  const getCurrentBalance = () => {
      if (!wallet) return 0;
      return wallet[betWallet] || 0;
  };

  const getWalletLabel = (type: string) => {
      switch(type) {
          case 'game_balance': return 'Game Wallet';
          case 'bonus_balance': return 'Bonus Wallet';
          case 'deposit_balance': return 'Deposit Wallet';
          case 'main_balance': return 'Main Wallet';
          default: return 'Unknown';
      }
  };

  // --- SOUND ENGINE (WEB AUDIO API) ---
  const getAudioContext = () => {
      if (!audioCtxRef.current) {
          const Ctx = window.AudioContext || (window as any).webkitAudioContext;
          if (Ctx) audioCtxRef.current = new Ctx();
      }
      if (audioCtxRef.current?.state === 'suspended') audioCtxRef.current.resume();
      return audioCtxRef.current;
  };

  const playSound = useCallback((type: 'spin' | 'win' | 'tick') => {
      if (isMuted) return;
      const ctx = getAudioContext();
      if (!ctx) return;
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      if (type === 'tick') {
          osc.frequency.setValueAtTime(600, now);
          osc.frequency.exponentialRampToValueAtTime(300, now + 0.05);
          gain.gain.setValueAtTime(0.05, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
          osc.start(now);
          osc.stop(now + 0.05);
      } else if (type === 'win') {
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(440, now);
          osc.frequency.setValueAtTime(554, now + 0.1); // C#
          osc.frequency.setValueAtTime(659, now + 0.2); // E
          gain.gain.setValueAtTime(0.1, now);
          gain.gain.linearRampToValueAtTime(0, now + 1);
          osc.start(now);
          osc.stop(now + 1);
      }
  }, [isMuted]);


  const handleSpin = async () => {
    if (isSpinning || isRevealing || !spinItems.length) return;
    if (!wallet) return;

    // 1. Validate Bet
    const bet = parseFloat(betAmount);
    if (isNaN(bet) || bet <= 0) {
        toast.error("Invalid bet amount");
        return;
    }
    
    const availableBalance = wallet[betWallet];
    if (bet > availableBalance) {
        toast.error(`Insufficient balance in ${getWalletLabel(betWallet)}`);
        return;
    }

    // 2. Deduct Bet & Setup
    setIsSpinning(true);
    setIsRevealing(false);
    setShowWinModal(false);
    setWinResult(null);
    setWalletMenuOpen(false);
    
    // Update local wallet state immediately for UX
    setWallet(prev => prev ? {...prev, [betWallet]: prev[betWallet] - bet} : null);
    
    // 3. Determine Winner (Probability Logic)
    const totalProb = spinItems.reduce((sum, item) => sum + Number(item.probability), 0);
    const random = Math.random() * totalProb;
    let accumulated = 0;
    let selectedIndex = 0;
    
    for (let i = 0; i < spinItems.length; i++) {
        accumulated += Number(spinItems[i].probability);
        if (random <= accumulated) {
            selectedIndex = i;
            break;
        }
    }
    
    if (selectedIndex === 0 && random > accumulated) selectedIndex = spinItems.length - 1;

    // 4. Calculate Rotation
    const currentSegmentAngle = 360 / spinItems.length;
    const segmentCenter = (selectedIndex * currentSegmentAngle) + (currentSegmentAngle / 2);
    const jitter = (Math.random() - 0.5) * (currentSegmentAngle * 0.8);
    const targetAngleOnWheel = (360 - (segmentCenter + jitter)) % 360;
    
    const spins = 8; // More spins for effect
    const currentRotMod = rotation % 360;
    let distance = targetAngleOnWheel - currentRotMod;
    if (distance < 0) distance += 360;
    
    const totalRotation = rotation + (360 * spins) + distance;
    
    setRotation(totalRotation);

    // Simulate ticking sound
    let tickInterval = setInterval(() => {
       if(Math.random() > 0.5) playSound('tick');
    }, 100);

    // 5. Process Result
    setTimeout(async () => {
       clearInterval(tickInterval);
       const winItem = spinItems[selectedIndex];
       setWinResult({ label: winItem.label, value: winItem.value });
       
       const payout = Number(winItem.value);
       
       if (userId) {
            // Update DB: Deduct Bet from SELECTED wallet
            await updateWallet(userId, bet, 'decrement', betWallet); 
            
            // Add Winnings: Usually game winnings go to Game Wallet (which is transferrable)
            // Even if played with Bonus or Deposit, winnings are "Real Money" -> Game Wallet
            if (payout > 0) {
                await updateWallet(userId, payout, 'increment', 'game_balance');
            }
            
            await processGameResult(userId, 'spin', 'Lucky Spin', bet, payout, `Won ${winItem.label} (via ${getWalletLabel(betWallet)})`);
            
            // Fetch fresh wallet
            const { data } = await supabase.from('wallets').select('*').eq('user_id', userId).single();
            setWallet(data as WalletData);
            window.dispatchEvent(new Event('wallet_updated'));
       }
       
       if (payout > 0) playSound('win');
       
       setIsSpinning(false);
       setIsRevealing(true); 

       setTimeout(() => {
           setIsRevealing(false);
           setShowWinModal(true);
       }, 1500);
       
       fetchData(); // Refresh history
    }, 5000);
  };

  const getWheelBackground = () => {
      if (!spinItems.length) return '#333';
      const parts = spinItems.map((item, i) => {
          const start = (i * 100) / spinItems.length;
          const end = ((i + 1) * 100) / spinItems.length;
          return `${item.color} ${start}% ${end}%`;
      });
      return `conic-gradient(${parts.join(', ')})`;
  };

  if (!wallet) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="animate-spin text-neon-green"/></div>;

  return (
    <div className="h-[calc(100vh-100px)] sm:h-auto sm:pb-24 sm:pl-20 sm:pt-6 flex flex-col relative overflow-hidden">
       
       {/* Header */}
       <div className="px-4 pt-2 shrink-0 z-10">
           <header className="flex items-center justify-between mb-2">
               <div className="flex items-center gap-2">
                   <Link to="/games" className="bg-white/10 p-2 rounded-lg text-white hover:bg-white/20"><ArrowLeft size={16}/></Link>
                   <h1 className="text-xl font-display font-bold text-white italic flex items-center gap-2">ROYAL SPIN <Zap size={16} className="text-yellow-400 fill-yellow-400"/></h1>
               </div>
               <div className="flex gap-2">
                    <button 
                       onClick={() => setIsMuted(!isMuted)} 
                       className={`p-2 rounded-lg border border-white/10 transition ${isMuted ? 'bg-red-500/20 text-red-400' : 'bg-white/5 text-white'}`}
                   >
                       {isMuted ? <VolumeX size={16}/> : <Volume2 size={16}/>}
                   </button>
               </div>
           </header>
           
           {/* History Bar */}
           <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2 mask-linear-fade">
                {history.map((h) => (
                    <div key={h.id} className={`shrink-0 px-3 py-1 rounded-lg border flex flex-col items-center min-w-[60px] ${h.profit > 0 ? 'bg-green-500/10 border-green-500/20' : 'bg-white/5 border-white/5'}`}>
                        <span className="text-[9px] text-gray-500">{new Date(h.timestamp).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</span>
                        <span className={`text-xs font-bold ${h.profit > 0 ? 'text-neon-green' : 'text-gray-400'}`}>
                             {h.profit > 0 ? '+' : '-'}<BalanceDisplay amount={Math.abs(h.profit > 0 ? h.profit : h.bet)} />
                        </span>
                    </div>
                ))}
           </div>
       </div>

       {/* Main Game Area */}
       <div className="flex-1 flex flex-col items-center justify-center relative min-h-0">
           
           {/* Background Glow */}
           <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] bg-purple-600/20 blur-[100px] rounded-full pointer-events-none"></div>

           {/* Wheel Container */}
           <div className="relative w-[280px] h-[280px] sm:w-[350px] sm:h-[350px] lg:w-[450px] lg:h-[450px] transform scale-100 transition-transform">
               
               {/* Pointer */}
               <div className={`absolute -top-6 left-1/2 -translate-x-1/2 z-30 filter drop-shadow-xl transition-transform duration-300 ${(!isSpinning && winResult) ? 'scale-125' : 'scale-100'}`}>
                   <div className={`w-0 h-0 border-l-[15px] border-l-transparent border-r-[15px] border-r-transparent border-t-[35px] relative z-10 transition-colors duration-300 ${(!isSpinning && winResult) ? 'border-t-yellow-400 drop-shadow-[0_0_15px_rgba(250,204,21,0.8)]' : 'border-t-neon-green'}`}></div>
               </div>
               
               {/* Outer Rim */}
               <div className="absolute inset-0 rounded-full border-[12px] border-dark-800 shadow-[0_0_0_2px_#a855f7,0_0_30px_rgba(168,85,247,0.4)] bg-dark-950 z-0 flex items-center justify-center">
                    {/* Lights */}
                    {Array.from({ length: 12 }).map((_, i) => (
                       <div 
                            key={i} 
                            className={`absolute w-2 h-2 rounded-full ${isSpinning ? 'animate-pulse bg-yellow-300' : 'bg-purple-500'}`}
                            style={{ 
                                top: '50%', left: '50%',
                                transform: `rotate(${i * 30}deg) translate(0, -${window.innerWidth < 640 ? '132px' : '165px'})`
                            }}
                       ></div>
                   ))}
               </div>

               {/* Rotating Wheel */}
               <div 
                  className="absolute inset-[12px] rounded-full shadow-[inset_0_0_20px_rgba(0,0,0,0.5)] overflow-hidden transition-transform cubic-bezier(0.2, 0.8, 0.3, 1)"
                  style={{ 
                      background: getWheelBackground(),
                      transform: `rotate(${rotation}deg)`,
                      transitionDuration: isSpinning ? '5000ms' : '0ms'
                  }}
               >
                   {spinItems.map((item, i) => {
                       const angle = (360 / spinItems.length) * i + (360 / spinItems.length) / 2;
                       return (
                           <React.Fragment key={i}>
                               <div className="absolute w-0.5 h-1/2 bg-black/20 top-0 left-1/2 origin-bottom z-10" style={{ transform: `rotate(${i * (360 / spinItems.length)}deg)` }}></div>
                               <div className="absolute w-full h-full top-0 left-0 flex justify-center pt-4 sm:pt-8 z-20 pointer-events-none" style={{ transform: `rotate(${angle}deg)` }}>
                                   <div className="transform -rotate-90 origin-center" style={{ writingMode: 'vertical-rl' }}>
                                       <span className="text-white font-black text-sm sm:text-lg drop-shadow-md tracking-wider uppercase">{item.label}</span>
                                   </div>
                               </div>
                           </React.Fragment>
                       );
                   })}
               </div>

                {/* Winner Highlight Overlay */}
                {!isSpinning && winResult && (
                   <div className="absolute inset-[12px] rounded-full z-20 pointer-events-none animate-pulse-fast">
                        <div 
                            className="absolute inset-0 rounded-full"
                            style={{
                                background: `conic-gradient(from -${segmentAngle/2}deg, rgba(255,255,255,0.5) 0deg, rgba(255,255,255,0.5) ${segmentAngle}deg, transparent ${segmentAngle}deg)`,
                                filter: 'drop-shadow(0 0 15px rgba(255,255,255,0.8))',
                                mixBlendMode: 'overlay'
                            }}
                        />
                   </div>
               )}

               {/* Center Hub */}
               <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20 hidden sm:block">
                    <div className="w-16 h-16 bg-white rounded-full border-4 border-gray-200 shadow-xl flex items-center justify-center">
                        <span className="font-black text-dark-900">SPIN</span>
                    </div>
               </div>
           </div>
       </div>

       {/* Controls */}
       <div className="shrink-0 px-3 pb-3 z-20">
           <GlassCard className="bg-dark-900/90 border-purple-500/20 p-3 shadow-[0_-10px_40px_rgba(0,0,0,0.5)]">
               <div className="flex gap-3 items-end">
                    <div className="flex-1 space-y-2">
                        
                        {/* Wallet Selector */}
                        <div className="relative">
                            <button 
                                onClick={() => !isSpinning && setWalletMenuOpen(!walletMenuOpen)}
                                className="w-full flex justify-between items-center bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-xs font-bold text-gray-300 hover:bg-white/5 transition"
                            >
                                <span className="flex items-center gap-2">
                                    <Wallet size={14} className="text-purple-400"/> {getWalletLabel(betWallet)}
                                </span>
                                <ChevronDown size={14}/>
                            </button>
                            
                            {walletMenuOpen && (
                                <div className="absolute bottom-full left-0 right-0 bg-dark-900 border border-white/10 rounded-xl mb-2 p-1 shadow-xl z-50">
                                    {['game_balance', 'bonus_balance', 'deposit_balance', 'main_balance'].map((key) => (
                                        <button
                                            key={key}
                                            onClick={() => { setBetWallet(key as any); setWalletMenuOpen(false); }}
                                            className={`w-full text-left px-3 py-2 rounded-lg text-xs flex justify-between items-center hover:bg-white/10 ${betWallet === key ? 'bg-purple-500/20 text-purple-300' : 'text-gray-400'}`}
                                        >
                                            <span>{getWalletLabel(key)}</span>
                                            {/* @ts-ignore */}
                                            <span className="font-mono font-bold"><BalanceDisplay amount={wallet[key] || 0} /></span>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Bet Input */}
                        <div className="relative flex items-center">
                             <span className="absolute left-3 text-gray-400 font-bold">$</span>
                             <input 
                                type="number" 
                                value={betAmount} 
                                onChange={e => setBetAmount(e.target.value)}
                                disabled={isSpinning || isRevealing}
                                className="w-full bg-black/40 border border-white/10 rounded-xl py-3 pl-7 pr-3 text-white font-bold text-lg focus:border-neon-green outline-none"
                             />
                        </div>
                        
                        <div className="flex justify-between items-center text-[10px] text-gray-500 px-1">
                            <span>Balance: <span className="text-white font-bold"><BalanceDisplay amount={getCurrentBalance()} /></span></span>
                            <div className="flex gap-2">
                                <button onClick={() => setBetAmount('10')} className="hover:text-white">Min</button>
                                <button onClick={() => setBetAmount(getCurrentBalance().toString())} className="text-neon-green hover:underline">Max</button>
                            </div>
                        </div>
                    </div>
                    
                    <button 
                        onClick={handleSpin}
                        disabled={isSpinning || isRevealing}
                        className={`h-[100px] w-1/3 rounded-xl font-black text-xl shadow-lg transition-all flex flex-col items-center justify-center leading-none ${
                            (isSpinning || isRevealing) 
                            ? 'bg-gray-800 text-gray-500 cursor-not-allowed' 
                            : 'bg-gradient-to-br from-neon-green to-emerald-500 text-black hover:scale-[1.02] active:scale-95 shadow-[0_0_20px_rgba(16,185,129,0.3)]'
                        }`}
                    >
                        {isSpinning ? <Loader2 className="animate-spin" size={24} /> : isRevealing ? 'WIN!' : 'SPIN'}
                    </button>
               </div>
           </GlassCard>
       </div>

       {/* Win Modal */}
       <AnimatePresence>
          {showWinModal && winResult && (
             <motion.div 
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-md flex items-center justify-center p-4"
                onClick={() => setShowWinModal(false)}
             >
                 <motion.div 
                    initial={{ scale: 0.5, rotate: -10 }} animate={{ scale: 1, rotate: 0 }} exit={{ scale: 0.5, opacity: 0 }}
                    className="bg-gradient-to-br from-purple-900 to-dark-950 p-1 relative rounded-3xl w-full max-w-sm overflow-hidden border border-purple-500/50 shadow-[0_0_50px_rgba(168,85,247,0.5)]"
                    onClick={e => e.stopPropagation()}
                 >
                    <div className="bg-dark-950/80 relative rounded-[22px] p-8 text-center backdrop-blur-xl">
                        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full overflow-hidden pointer-events-none">
                            <div className="absolute top-1/2 left-1/2 w-[200%] h-[200%] bg-[conic-gradient(from_90deg_at_50%_50%,#0000_0deg,transparent_50deg,#a855f7_100deg)] animate-spin-slow opacity-20 origin-center -translate-x-1/2 -translate-y-1/2"></div>
                        </div>

                        <div className="mx-auto w-24 h-24 bg-gradient-to-br from-yellow-300 to-yellow-600 rounded-full flex items-center justify-center shadow-[0_0_30px_rgba(234,179,8,0.4)] mb-6 border-4 border-white/20 relative z-10">
                            <Trophy size={48} className="text-white drop-shadow-md" />
                        </div>
                        
                        <h2 className="text-4xl font-display font-black text-white mb-2 tracking-tight italic uppercase">
                            {winResult.value > 0 ? 'WINNER!' : 'Try Again'}
                        </h2>
                        
                        <div className="py-6 my-6 bg-white/5 rounded-2xl border border-white/10 relative overflow-hidden">
                            <div className="absolute inset-0 bg-purple-500/10 animate-pulse"></div>
                            <p className="text-xs text-gray-400 uppercase font-bold relative z-10 mb-1">You Won</p>
                            <div className="text-5xl font-black text-neon-green drop-shadow-lg relative z-10">
                                {winResult.label}
                            </div>
                        </div>
                        
                        <button 
                            onClick={() => setShowWinModal(false)}
                            className="w-full py-4 bg-white text-black font-bold rounded-xl hover:bg-gray-200 transition shadow-lg uppercase tracking-wider"
                        >
                            Collect Reward
                        </button>
                    </div>
                 </motion.div>
             </motion.div>
          )}
      </AnimatePresence>
    </div>
  );
};

export default Spin;
