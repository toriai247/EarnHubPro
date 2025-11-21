
import React, { useEffect, useState } from 'react';
import GlassCard from '../components/GlassCard';
import { ArrowLeft, Wallet, ShieldCheck, Loader2, Zap, AlertTriangle, X, Crown, Percent } from 'lucide-react';
import { Link } from 'react-router-dom';
import { supabase } from '../integrations/supabase/client';
import { WalletData, WithdrawalSettings, UserProfile } from '../types';
import { saveWithdrawMethod, requestWithdrawal } from '../lib/actions';
import { motion, AnimatePresence } from 'framer-motion';
import { useUI } from '../context/UIContext';

const Withdraw: React.FC = () => {
  const { toast, confirm } = useUI();
  const [wallet, setWallet] = useState<WalletData | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [settings, setSettings] = useState<WithdrawalSettings | null>(null);
  const [activeTab, setActiveTab] = useState<'instant' | 'monthly'>('instant');
  
  const [instantAmount, setInstantAmount] = useState('');
  const [instantMethod, setInstantMethod] = useState('bkash');
  
  const [autoMethod, setAutoMethod] = useState('bkash');
  const [autoNumber, setAutoNumber] = useState('');
  const [autoEnabled, setAutoEnabled] = useState(false);
  
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [userId, setUserId] = useState('');
  const [dailyUsage, setDailyUsage] = useState(0);
  
  // Confirmation Modal State
  const [showConfirm, setShowConfirm] = useState(false);
  const [feeAmount, setFeeAmount] = useState(0);
  const [netReceive, setNetReceive] = useState(0);
  const [feePercentDisplay, setFeePercentDisplay] = useState(0);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
        setUserId(session.user.id);
        
        const [wRes, pRes, sRes, mRes] = await Promise.all([
            supabase.from('wallets').select('*').eq('user_id', session.user.id).single(),
            supabase.from('profiles').select('*').eq('id', session.user.id).single(),
            supabase.from('withdrawal_settings').select('*').maybeSingle(),
            supabase.from('user_withdrawal_methods').select('*').eq('user_id', session.user.id).maybeSingle()
        ]);

        if (wRes.data) setWallet(wRes.data as WalletData);
        if (pRes.data) setProfile(pRes.data as UserProfile);
        if (sRes.data) setSettings(sRes.data as WithdrawalSettings);
        if (mRes.data) {
            setAutoMethod(mRes.data.method_name);
            setAutoNumber(mRes.data.account_number);
            setAutoEnabled(mRes.data.is_auto_enabled);
        }

        const today = new Date().toISOString().split('T')[0];
        const { data: txs } = await supabase.from('transactions')
            .select('amount')
            .eq('user_id', session.user.id)
            .eq('type', 'withdraw')
            .gte('created_at', `${today}T00:00:00`);
            
        const used = (txs || []).reduce((sum: number, t: any) => sum + t.amount, 0);
        setDailyUsage(used);
    }
    setLoading(false);
  };

  // --- LEVEL LOGIC CALCULATOR ---
  const getLevelBenefits = () => {
      const level = profile?.level_1 || 1;
      let limitMult = 1.0;
      let feeDiscount = 0.0;

      if (level >= 10) {
          limitMult = 2.0;
          feeDiscount = 0.50;
      } else if (level >= 5) {
          limitMult = 1.5;
          feeDiscount = 0.20;
      }

      return { limitMult, feeDiscount };
  };

  const handleInitiateWithdraw = (e: React.FormEvent) => {
      e.preventDefault();
      if (!instantAmount) return;
      
      const val = parseFloat(instantAmount);
      if (isNaN(val) || val <= 0) { toast.error("Invalid amount"); return; }

      const { limitMult, feeDiscount } = getLevelBenefits();

      if (settings) {
          const max = settings.max_withdraw * limitMult;
          const dailyLimit = settings.daily_limit * limitMult;

          if (val < settings.min_withdraw) { toast.error(`Minimum: $${settings.min_withdraw}`); return; }
          if (val > max) { toast.error(`Maximum for Level ${profile?.level_1}: $${max}`); return; }
          if (dailyUsage + val > dailyLimit) { toast.error(`Daily limit exceeded.`); return; }
      }

      const available = (wallet?.main_balance || 0);
      if (val > available) {
          toast.error("Insufficient funds in Main Wallet.");
          return;
      }

      const baseFeePercent = settings?.withdraw_fee_percent || 0;
      const finalFeePercent = Math.max(0, baseFeePercent * (1 - feeDiscount));
      const fee = (val * finalFeePercent) / 100;
      
      setFeePercentDisplay(finalFeePercent);
      setFeeAmount(fee);
      setNetReceive(val - fee);

      setShowConfirm(true);
  };

  const handleConfirmWithdraw = async () => {
      setShowConfirm(false);
      setProcessing(true);
      try {
          const amount = parseFloat(instantAmount);
          // Use RPC function in lib/actions.ts
          await requestWithdrawal(userId, amount, instantMethod);
          
          toast.success('Withdrawal request submitted!');
          setInstantAmount('');
          fetchData();
          window.dispatchEvent(new Event('wallet_updated'));

      } catch (e: any) {
          console.error(e);
          toast.error(e.message);
      }
      setProcessing(false);
  };

  const handleSaveAuto = async (e: React.FormEvent) => {
      e.preventDefault();
      setProcessing(true);
      try {
          await saveWithdrawMethod(userId, autoMethod, autoNumber, autoEnabled);
          await fetchData(); 
          toast.success("Auto-withdraw settings saved!");
      } catch (e: any) {
          toast.error(e.message);
      }
      setProcessing(false);
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="animate-spin text-neon-green" /></div>;

  const { limitMult, feeDiscount } = getLevelBenefits();

  return (
    <div className="pb-24 sm:pl-20 sm:pt-6 space-y-6 px-4 sm:px-0">
      <header className="flex items-center gap-3 pt-4">
           <Link to="/wallet" className="p-2 bg-white/10 rounded-xl hover:bg-white/20 transition text-white">
              <ArrowLeft size={20} />
           </Link>
           <h1 className="text-2xl font-display font-bold text-white">Withdraw</h1>
       </header>

       <GlassCard className="bg-gradient-royal relative overflow-hidden">
            <div className="relative z-10 flex justify-between items-center">
                <div>
                    <p className="text-royal-300 text-xs font-bold uppercase tracking-widest mb-1">Main Wallet (Withdrawable)</p>
                    <h2 className="text-4xl font-display font-bold text-white">${(wallet?.main_balance || 0).toFixed(2)}</h2>
                </div>
                <div className="w-12 h-12 bg-white/10 rounded-full flex items-center justify-center">
                    <Wallet className="text-neon-green" size={24} />
                </div>
            </div>
            <div className="relative z-10 mt-4 flex items-center gap-2">
                <div className="px-3 py-1 rounded-lg bg-black/30 text-[10px] font-bold text-white border border-white/10 flex items-center gap-1">
                    <Crown size={12} className="text-yellow-400"/> Level {profile?.level_1 || 1}
                </div>
                {feeDiscount > 0 && (
                    <div className="px-3 py-1 rounded-lg bg-green-500/20 text-[10px] font-bold text-green-400 border border-green-500/30 flex items-center gap-1">
                        <Percent size={10}/> {feeDiscount * 100}% Fee Discount
                    </div>
                )}
                {limitMult > 1 && (
                    <div className="px-3 py-1 rounded-lg bg-blue-500/20 text-[10px] font-bold text-blue-400 border border-blue-500/30 flex items-center gap-1">
                        <Zap size={10}/> {limitMult}x Limits
                    </div>
                )}
            </div>
       </GlassCard>

       <div className="flex p-1 bg-white/5 rounded-xl border border-white/5">
            <button onClick={() => setActiveTab('instant')} className={`flex-1 py-3 text-sm font-bold rounded-lg transition-all flex items-center justify-center gap-2 ${activeTab === 'instant' ? 'bg-royal-600 text-white shadow-lg' : 'text-gray-400 hover:text-white'}`}>
                <Zap size={16} /> Instant
            </button>
            <button onClick={() => setActiveTab('monthly')} className={`flex-1 py-3 text-sm font-bold rounded-lg transition-all flex items-center justify-center gap-2 ${activeTab === 'monthly' ? 'bg-royal-600 text-white shadow-lg' : 'text-gray-400 hover:text-white'}`}>
                <ShieldCheck size={16} /> Auto
            </button>
       </div>

       <AnimatePresence mode="wait">
           {activeTab === 'instant' ? (
               <motion.div 
                 key="instant"
                 initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                 className="space-y-6"
               >
                   <form onSubmit={handleInitiateWithdraw} className="space-y-4">
                        <div>
                            <label className="text-xs font-bold text-gray-400 mb-1 block">Payment Method</label>
                            <select value={instantMethod} onChange={e => setInstantMethod(e.target.value)} className="w-full bg-black/30 border border-white/10 rounded-xl p-4 text-white text-sm focus:border-neon-green outline-none">
                                <option value="bkash">Bkash</option>
                                <option value="nagad">Nagad</option>
                                <option value="rocket">Rocket</option>
                                <option value="binance">Binance (USDT)</option>
                            </select>
                        </div>
                        <div>
                            <label className="text-xs font-bold text-gray-400 mb-1 block">Amount ($)</label>
                            <input 
                                type="number" 
                                value={instantAmount} 
                                onChange={e => setInstantAmount(e.target.value)} 
                                className="w-full bg-black/30 border border-white/10 rounded-xl p-4 text-white text-lg focus:border-neon-green outline-none"
                                placeholder={`Min $${settings?.min_withdraw || 50}`}
                            />
                            <p className="text-[10px] text-gray-500 mt-2 text-right">
                                Max Limit: <span className="text-white font-bold">${(settings?.max_withdraw || 0) * limitMult}</span>
                            </p>
                        </div>
                        
                        <button 
                            type="submit" 
                            disabled={processing || !instantAmount} 
                            className="w-full py-4 bg-white text-black font-bold rounded-xl hover:bg-gray-200 flex items-center justify-center gap-2 disabled:opacity-50"
                        >
                            Request Withdrawal
                        </button>
                   </form>
               </motion.div>
           ) : (
               <motion.div 
                 key="monthly"
                 initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                 className="space-y-6"
               >
                   <div className="bg-green-500/10 border border-green-500/20 p-4 rounded-xl text-sm text-green-300">
                       Enable Auto-Withdraw to receive payments automatically on the 1st of every month + 2% Bonus.
                   </div>
                   <form onSubmit={handleSaveAuto} className="space-y-4">
                        <div>
                            <label className="text-xs font-bold text-gray-400 mb-1 block">Method</label>
                            <select value={autoMethod} onChange={e => setAutoMethod(e.target.value)} className="w-full bg-black/30 border border-white/10 rounded-xl p-4 text-white text-sm outline-none">
                                <option value="bkash">Bkash</option>
                                <option value="nagad">Nagad</option>
                                <option value="binance">Binance</option>
                            </select>
                        </div>
                        <div>
                            <label className="text-xs font-bold text-gray-400 mb-1 block">Wallet Number / ID</label>
                            <input 
                                type="text" 
                                value={autoNumber} 
                                onChange={e => setAutoNumber(e.target.value)} 
                                className="w-full bg-black/30 border border-white/10 rounded-xl p-4 text-white outline-none"
                            />
                        </div>
                        <div className="flex items-center justify-between bg-white/5 p-4 rounded-xl border border-white/10">
                            <span className="text-white font-bold text-sm">Enable Monthly Auto-Send</span>
                            <input type="checkbox" checked={autoEnabled} onChange={e => setAutoEnabled(e.target.checked)} className="w-5 h-5 accent-neon-green" />
                        </div>
                        <button type="submit" disabled={processing} className="w-full py-4 bg-neon-green text-black font-bold rounded-xl hover:bg-emerald-400">
                            {processing ? <Loader2 className="animate-spin mx-auto" /> : 'Save Settings'}
                        </button>
                   </form>
               </motion.div>
           )}
       </AnimatePresence>

       {/* Custom Confirm Modal for Fee Breakdown */}
       {showConfirm && (
           <div className="fixed inset-0 z-[120] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
               <div className="bg-dark-900 w-full max-w-md rounded-2xl border border-white/10 p-6 relative shadow-2xl">
                   <button onClick={() => setShowConfirm(false)} className="absolute top-4 right-4 text-gray-500 hover:text-white"><X size={20}/></button>
                   <h3 className="text-xl font-bold text-white mb-4">Confirm Withdrawal</h3>
                   <div className="bg-white/5 rounded-xl p-4 space-y-3 mb-6 border border-white/5">
                       <div className="flex justify-between text-sm text-gray-400"><span>Amount</span><span className="text-white font-bold">${parseFloat(instantAmount).toFixed(2)}</span></div>
                       <div className="flex justify-between text-sm text-yellow-400">
                           <span>Fee ({feePercentDisplay.toFixed(1)}%)</span>
                           <span>-${feeAmount.toFixed(2)}</span>
                       </div>
                       <div className="h-px bg-white/10"></div>
                       <div className="flex justify-between text-sm text-neon-green font-bold"><span>Receive</span><span>${netReceive.toFixed(2)}</span></div>
                   </div>
                   <button onClick={handleConfirmWithdraw} disabled={processing} className="w-full py-3 bg-neon-green text-black font-bold rounded-xl hover:bg-emerald-400 flex items-center justify-center shadow-lg">
                       {processing ? <Loader2 className="animate-spin" /> : 'Confirm Request'}
                   </button>
               </div>
           </div>
       )}
    </div>
  );
};

export default Withdraw;
