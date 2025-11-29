
import React, { useEffect, useState } from 'react';
import GlassCard from '../components/GlassCard';
import { ArrowLeft, Wallet, Zap, Loader2, Calculator, Lock } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../integrations/supabase/client';
import { requestWithdrawal } from '../lib/actions';
import { motion, AnimatePresence } from 'framer-motion';
import { useUI } from '../context/UIContext';
import { useCurrency } from '../context/CurrencyContext';
import BalanceDisplay from '../components/BalanceDisplay';
import { useSystem } from '../context/SystemContext';

const Withdraw: React.FC = () => {
  const { toast, alert } = useUI();
  const { config } = useSystem();
  const { rate, symbol, currency, format } = useCurrency();
  const navigate = useNavigate();
  
  const [balance, setBalance] = useState(0);
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState('bkash');
  const [loading, setLoading] = useState(false);
  const [userId, setUserId] = useState('');
  
  // Activation State
  const [isActive, setIsActive] = useState(true);
  const [checkingStatus, setCheckingStatus] = useState(true);

  useEffect(() => {
    const fetch = async () => {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
            setUserId(session.user.id);
            const { data } = await supabase.from('wallets').select('main_balance').eq('user_id', session.user.id).single();
            if (data) setBalance(data.main_balance);

            // Check Active Status
            if (config?.is_activation_enabled) {
                const { data: profile } = await supabase.from('profiles').select('is_account_active').eq('id', session.user.id).single();
                if (profile) setIsActive(!!profile.is_account_active);
            }
        }
        setCheckingStatus(false);
    };
    fetch();
  }, [config]);

  const handleWithdraw = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!amount) return;
      const val = parseFloat(amount);
      if (val > balance) { 
          await alert(`Insufficient Withdrawable Balance.\n\nRequested: $${val.toFixed(2)}\nAvailable: $${balance.toFixed(2)}`, "Transaction Failed");
          return; 
      }
      
      setLoading(true);
      try {
          await requestWithdrawal(userId, val, method);
          toast.success("Withdrawal Requested!");
          setAmount('');
          setBalance(prev => prev - val);
      } catch (e: any) {
          await alert(e.message, "Withdrawal Error");
      }
      setLoading(false);
  };

  const receiveAmount = (parseFloat(amount) || 0) * rate;

  if (checkingStatus) return <div className="p-10 text-center"><Loader2 className="animate-spin mx-auto text-white"/></div>;

  // BLOCKED STATE
  if (config?.is_activation_enabled && !isActive) {
      return (
          <div className="pb-24 sm:pl-20 sm:pt-6 space-y-6 px-4 sm:px-0">
              <header className="flex items-center gap-3 pt-4">
                   <Link to="/wallet" className="p-2 bg-white/10 rounded-xl hover:bg-white/20 transition text-white">
                      <ArrowLeft size={20} />
                   </Link>
                   <h1 className="text-2xl font-display font-bold text-white">Withdraw Funds</h1>
               </header>
               
               <GlassCard className="border-red-500/30 bg-red-950/20 text-center py-12 px-6">
                   <div className="w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-6 border border-red-500/20">
                       <Lock size={40} className="text-red-500" />
                   </div>
                   <h2 className="text-xl font-black text-white uppercase mb-2">Account Inactive</h2>
                   <p className="text-gray-400 text-sm max-w-sm mx-auto mb-8">
                       To unlock withdrawals, you must activate your account by making a deposit of at least 
                       <span className="text-white font-bold mx-1">{format(config.activation_amount || 1)}</span>.
                   </p>
                   <Link to="/deposit" className="px-8 py-3 bg-white text-black font-bold rounded-xl hover:bg-gray-200 transition">
                       Deposit Now to Activate
                   </Link>
               </GlassCard>
          </div>
      )
  }

  return (
    <div className="pb-24 sm:pl-20 sm:pt-6 space-y-6 px-4 sm:px-0">
      <header className="flex items-center gap-3 pt-4">
           <Link to="/wallet" className="p-2 bg-white/10 rounded-xl hover:bg-white/20 transition text-white">
              <ArrowLeft size={20} />
           </Link>
           <h1 className="text-2xl font-display font-bold text-white">Withdraw</h1>
       </header>

       <GlassCard className="bg-gradient-to-r from-purple-900/40 to-blue-900/40 border-purple-500/20">
            <p className="text-purple-300 text-xs font-bold uppercase tracking-widest mb-1">Available (USD)</p>
            <h2 className="text-4xl font-display font-black text-white"><BalanceDisplay amount={balance} /></h2>
       </GlassCard>

       <form onSubmit={handleWithdraw} className="space-y-6">
            <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                        <Calculator size={16} className="text-neon-green"/> Converter
                    </h3>
                    <span className="text-[10px] bg-black/30 px-2 py-1 rounded text-gray-400">1 USD = {rate} {currency}</span>
                </div>
                
                <div className="grid grid-cols-2 gap-4 items-end">
                    <div>
                        <label className="text-xs text-gray-400 font-bold mb-1 block">Withdraw (USD)</label>
                        <input 
                            type="number" 
                            value={amount} 
                            onChange={e => setAmount(e.target.value)} 
                            className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white font-mono font-bold text-xl focus:border-neon-green outline-none"
                            placeholder="0.00"
                        />
                    </div>
                    <div>
                        <label className="text-xs text-neon-green font-bold mb-1 block">You Receive ({currency})</label>
                        <div className="w-full bg-neon-green/10 border border-neon-green/30 rounded-xl p-3 text-neon-green font-mono font-bold text-xl flex items-center gap-1">
                            {symbol} {receiveAmount.toLocaleString()}
                        </div>
                    </div>
                </div>
            </div>

            <div>
                <label className="text-xs font-bold text-gray-400 mb-1 block">Method</label>
                <select value={method} onChange={e => setMethod(e.target.value)} className="w-full bg-black/30 border border-white/10 rounded-xl p-4 text-white text-sm outline-none">
                    <option value="bkash">Bkash</option>
                    <option value="nagad">Nagad</option>
                    <option value="binance">Binance (USDT)</option>
                </select>
            </div>
            
            <button 
                type="submit" 
                disabled={loading || !amount} 
                className="w-full py-4 bg-white text-black font-bold rounded-xl hover:bg-gray-200 flex items-center justify-center gap-2 disabled:opacity-50"
            >
                {loading ? <Loader2 className="animate-spin" /> : 'Confirm Withdraw'}
            </button>
       </form>
    </div>
  );
};

export default Withdraw;