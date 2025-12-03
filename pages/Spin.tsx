
import React, { useEffect, useState } from 'react';
import GlassCard from '../components/GlassCard';
import { ArrowLeft, Wallet, Zap, Loader2 } from 'lucide-react';
import { supabase } from '../integrations/supabase/client';
import { WalletData, SpinItem } from '../types';
import { processGameResult, updateWallet } from '../lib/actions';
import { Link } from 'react-router-dom';
import { useUI } from '../context/UIContext';
import BalanceDisplay from '../components/BalanceDisplay';

const Spin: React.FC = () => {
  const { toast } = useUI();
  const [wallet, setWallet] = useState<WalletData | null>(null);
  const [userId, setUserId] = useState('');
  const [spinItems, setSpinItems] = useState<SpinItem[]>([]);
  const [isSpinning, setIsSpinning] = useState(false);
  const [winResult, setWinResult] = useState<{label: string, value: number} | null>(null);
  const [betAmount, setBetAmount] = useState<string>('10');
  const [betWallet, setBetWallet] = useState<'game_balance' | 'bonus_balance' | 'deposit_balance' | 'main_balance'>('game_balance');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
        setUserId(session.user.id);
        const [walletRes, spinRes] = await Promise.all([
            supabase.from('wallets').select('*').eq('user_id', session.user.id).single(),
            supabase.from('spin_items').select('*').eq('is_active', true).order('value', {ascending: true})
        ]);

        if(walletRes.data) setWallet(walletRes.data as WalletData);
        if(spinRes.data) setSpinItems(spinRes.data as SpinItem[]);
    }
  };

  const handleSpin = async () => {
    if (isSpinning || !spinItems.length) return;
    if (!wallet) return;

    const bet = parseFloat(betAmount);
    if (isNaN(bet) || bet <= 0) { toast.error("Invalid bet amount"); return; }
    
    // @ts-ignore
    if (bet > wallet[betWallet]) { toast.error("Insufficient balance"); return; }

    setIsSpinning(true);
    setWinResult(null);
    
    setWallet(prev => prev ? {...prev, [betWallet]: prev[betWallet] - bet} : null);
    
    // Logic
    const totalProb = spinItems.reduce((sum, item) => sum + Number(item.probability), 0);
    const random = Math.random() * totalProb;
    let accumulated = 0;
    let selectedItem = spinItems[0];
    
    for (const item of spinItems) {
        accumulated += Number(item.probability);
        if (random <= accumulated) {
            selectedItem = item;
            break;
        }
    }

    // Instant result
    const payout = Number(selectedItem.value);
    setWinResult({ label: selectedItem.label, value: payout });
    
    if (userId) {
        await updateWallet(userId, bet, 'decrement', betWallet); 
        if (payout > 0) await updateWallet(userId, payout, 'increment', 'game_balance');
        await processGameResult(userId, 'spin', 'Lucky Spin', bet, payout, `Won ${selectedItem.label}`);
        
        const { data } = await supabase.from('wallets').select('*').eq('user_id', userId).single();
        setWallet(data as WalletData);
    }
    
    if (payout > 0) toast.success(`You won ${selectedItem.label}!`);
    else toast.info("Better luck next time!");
    
    setIsSpinning(false);
  };

  if (!wallet) return <div className="p-10 text-center">Loading...</div>;

  return (
    <div className="pb-24 sm:pl-20 sm:pt-6 space-y-6 px-4 sm:px-0">
       <header className="flex items-center gap-3 pt-4">
           <Link to="/games" className="p-2 bg-[#222] rounded-lg text-white hover:bg-[#333]"><ArrowLeft size={20}/></Link>
           <h1 className="text-xl font-bold text-white flex items-center gap-2">Lucky Spin</h1>
       </header>

       <GlassCard className="text-center p-8 bg-[#111] border-[#222]">
           {winResult ? (
               <div className="py-10">
                   <p className="text-gray-500 uppercase text-xs font-bold mb-2">Result</p>
                   <h2 className="text-4xl font-bold text-white mb-2">{winResult.label}</h2>
                   {winResult.value > 0 && <p className="text-green-400 font-bold text-xl">Win: <BalanceDisplay amount={winResult.value}/></p>}
               </div>
           ) : (
               <div className="py-10 flex flex-col items-center justify-center min-h-[200px]">
                   <Zap size={64} className="text-brand" />
                   <p className="text-gray-500 mt-4 text-sm">Ready to Spin</p>
               </div>
           )}
       </GlassCard>

       <GlassCard>
           <div className="flex gap-4 items-end">
               <div className="flex-1">
                   <label className="text-xs text-gray-500 font-bold uppercase mb-1 block">Bet Amount</label>
                   <input 
                      type="number" 
                      value={betAmount} 
                      onChange={e => setBetAmount(e.target.value)}
                      className="w-full bg-[#111] border border-[#333] rounded p-3 text-white font-bold"
                   />
               </div>
               <button 
                  onClick={handleSpin}
                  disabled={isSpinning}
                  className="bg-brand text-white px-8 py-3 rounded font-bold hover:bg-brand-hover disabled:opacity-50 h-[48px]"
               >
                   {isSpinning ? '...' : 'SPIN'}
               </button>
           </div>
           <div className="mt-4 flex gap-2 overflow-x-auto pb-2">
               {['game_balance', 'deposit_balance'].map(key => (
                   <button 
                     key={key}
                     onClick={() => setBetWallet(key as any)}
                     className={`px-3 py-2 rounded border text-xs font-bold uppercase whitespace-nowrap ${betWallet === key ? 'bg-brand/20 border-brand text-brand' : 'bg-[#111] border-[#333] text-gray-500'}`}
                   >
                       {key.replace('_balance', '')}: <BalanceDisplay amount={(wallet as any)[key]} />
                   </button>
               ))}
           </div>
       </GlassCard>
    </div>
  );
};

export default Spin;
