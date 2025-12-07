
import React, { useEffect, useRef, useState } from 'react';
import GlassCard from '../components/GlassCard';
import { Rocket, Trophy, Wallet } from 'lucide-react';
import { supabase } from '../integrations/supabase/client';
import { WalletData, CrashGameState } from '../types';
import { updateWallet, processGameResult } from '../lib/actions';
import BalanceDisplay from '../components/BalanceDisplay';
import { useUI } from '../context/UIContext';

const Crash: React.FC = () => {
  const { toast } = useUI();
  const [wallet, setWallet] = useState<WalletData | null>(null);
  const [userId, setUserId] = useState('');
  const [betAmount, setBetAmount] = useState('10');
  
  // Game State
  const [multiplier, setMultiplier] = useState(1.00);
  const [status, setStatus] = useState<'BETTING' | 'FLYING' | 'CRASHED'>('BETTING');
  const [timeLeft, setTimeLeft] = useState(0);
  const [hasBet, setHasBet] = useState(false);
  const [cashedOut, setCashedOut] = useState(false);
  const [crashPoint, setCrashPoint] = useState(0);

  const gameStateRef = useRef<any>({ status: 'BETTING', start_time: Date.now(), crash_point: 1 });

  useEffect(() => {
      // 1. Fetch User
      supabase.auth.getSession().then(({ data: { session } }: { data: { session: any } }) => {
          if (session) {
              setUserId(session.user.id);
              supabase.from('wallets').select('*').eq('user_id', session.user.id).single().then(({data}: {data: any}) => setWallet(data as any));
          }
      });

      // 2. Realtime State Sync
      const channel = supabase.channel('crash_v3_lite')
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'crash_game_state' }, (payload: any) => {
            const newState = payload.new as CrashGameState;
            if (newState.status !== gameStateRef.current.status) {
                // Phase Change
                if (newState.status === 'BETTING') {
                    setHasBet(false);
                    setCashedOut(false);
                    setMultiplier(1.00);
                }
                setStatus(newState.status);
            }
            gameStateRef.current = newState;
            setCrashPoint(newState.last_crash_point);
        })
        .subscribe();

      // 3. Local Loop (Text Update Only)
      const interval = setInterval(() => {
          const current = gameStateRef.current;
          const now = Date.now();
          const start = new Date(current.start_time).getTime();
          const elapsed = now - start;

          if (current.status === 'BETTING') {
              setTimeLeft(Math.max(0, 10000 - elapsed) / 1000);
              setMultiplier(1.00);
          } else if (current.status === 'FLYING') {
              const rawMult = Math.exp(0.00006 * elapsed);
              setMultiplier(rawMult);
              
              // Client-side auto-trigger if connection lags
              if (rawMult > current.crash_point + 2) {
                  // This rpc likely doesn't exist or is restricted, purely visual fallback or for single player logic
                  // supabase.rpc('advance_crash_state'); 
              }
          }
      }, 50);

      return () => {
          supabase.removeChannel(channel);
          clearInterval(interval);
      };
  }, []);

  const handleBet = async () => {
      const amount = parseFloat(betAmount);
      if (!wallet || amount > wallet.game_balance) return toast.error("Insufficient Game Balance");
      
      await updateWallet(userId, amount, 'decrement', 'game_balance');
      setWallet(prev => prev ? {...prev, game_balance: prev.game_balance - amount} : null);
      setHasBet(true);
      
      // Log bet in DB... (omitted for brevity in lite version, handled by backend usually)
  };

  const handleCashout = async () => {
      if (!hasBet || cashedOut) return;
      
      const win = parseFloat(betAmount) * multiplier;
      const profit = win - parseFloat(betAmount);
      
      await updateWallet(userId, win, 'increment', 'game_balance');
      setWallet(prev => prev ? {...prev, game_balance: prev.game_balance + win} : null);
      
      await processGameResult(userId, 'crash', 'Crash', parseFloat(betAmount), win, `Cashed @ ${multiplier.toFixed(2)}x`);
      
      setCashedOut(true);
      toast.success(`Won $${profit.toFixed(2)}`);
  };

  return (
    <div className="px-4 pb-20 pt-4 space-y-4 font-mono">
        <div className="flex justify-between items-center bg-surface border border-border-base p-3 rounded">
            <h1 className="font-bold text-white flex items-center gap-2"><Rocket size={18}/> CRASH LITE</h1>
            <div className="flex items-center gap-2 text-sm">
                <Wallet size={16} className="text-gray-500"/>
                <span className="font-bold text-white"><BalanceDisplay amount={wallet?.game_balance || 0} /></span>
            </div>
        </div>

        {/* Game Display */}
        <div className="bg-black border border-border-base h-64 flex flex-col items-center justify-center rounded-lg relative overflow-hidden">
            {status === 'BETTING' && (
                <div className="text-center">
                    <p className="text-gray-500 text-xs font-bold uppercase mb-2">Next Round</p>
                    <p className="text-4xl font-black text-white">{timeLeft.toFixed(1)}s</p>
                    <div className="w-32 h-1 bg-gray-800 mt-2 mx-auto"><div className="h-full bg-brand" style={{width: `${(timeLeft/10)*100}%`}}></div></div>
                </div>
            )}
            {status === 'FLYING' && (
                <div className="text-center">
                    <p className="text-5xl font-black text-white">{multiplier.toFixed(2)}x</p>
                    <p className="text-brand font-bold text-sm mt-2 animate-pulse">FLYING...</p>
                </div>
            )}
            {status === 'CRASHED' && (
                <div className="text-center">
                    <p className="text-red-500 font-black text-2xl uppercase mb-2">CRASHED</p>
                    <p className="text-4xl font-bold text-gray-400">{crashPoint ? crashPoint.toFixed(2) : multiplier.toFixed(2)}x</p>
                </div>
            )}
        </div>

        {/* Controls */}
        <GlassCard className="p-4">
            <div className="flex gap-2 mb-4">
                <div className="flex-1">
                    <label className="text-xs font-bold text-gray-500 uppercase block mb-1">Bet Amount</label>
                    <input 
                        type="number" 
                        value={betAmount}
                        onChange={e => setBetAmount(e.target.value)}
                        className="w-full bg-black/40 border border-white/10 rounded-lg p-2 text-white font-bold"
                        disabled={hasBet || status !== 'BETTING'}
                    />
                </div>
            </div>
            
            <button 
                onClick={hasBet && !cashedOut ? handleCashout : handleBet}
                disabled={(hasBet && cashedOut) || (status !== 'BETTING' && !hasBet) || status === 'CRASHED'}
                className={`w-full py-4 rounded-xl font-black text-lg transition uppercase tracking-wide ${
                    hasBet && !cashedOut 
                    ? 'bg-yellow-500 text-black hover:bg-yellow-400 shadow-lg shadow-yellow-500/20' 
                    : 'bg-green-600 text-white hover:bg-green-500 shadow-lg shadow-green-600/20 disabled:opacity-50 disabled:cursor-not-allowed'
                }`}
            >
                {hasBet && !cashedOut ? 'CASHOUT' : hasBet ? 'WAITING...' : 'PLACE BET'}
            </button>
        </GlassCard>
    </div>
  );
};

export default Crash;
