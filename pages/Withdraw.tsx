
import React, { useEffect, useState } from 'react';
import GlassCard from '../components/GlassCard';
import { ArrowLeft, Wallet, ShieldCheck, Clock, AlertCircle, CheckCircle, Loader2, Zap, Lock, AlertTriangle, X } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../integrations/supabase/client';
import { WalletData, WithdrawalSettings, UserWithdrawMethod } from '../types';
import { requestWithdrawal, saveWithdrawMethod } from '../lib/actions';
import { motion, AnimatePresence } from 'framer-motion';

const Withdraw: React.FC = () => {
  const [wallet, setWallet] = useState<WalletData | null>(null);
  const [settings, setSettings] = useState<WithdrawalSettings | null>(null);
  const [userMethod, setUserMethod] = useState<UserWithdrawMethod | null>(null);
  const [activeTab, setActiveTab] = useState<'instant' | 'monthly'>('instant');
  
  // Forms
  const [instantAmount, setInstantAmount] = useState('');
  const [instantMethod, setInstantMethod] = useState('bkash');
  
  const [autoMethod, setAutoMethod] = useState('bkash');
  const [autoNumber, setAutoNumber] = useState('');
  const [autoEnabled, setAutoEnabled] = useState(false);
  
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [userId, setUserId] = useState('');
  const [dailyUsage, setDailyUsage] = useState(0);
  const [showConfirm, setShowConfirm] = useState(false);

  // Fee Calc
  const [feeAmount, setFeeAmount] = useState(0);
  const [netReceive, setNetReceive] = useState(0);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
        setUserId(session.user.id);
        
        const [wRes, sRes, mRes] = await Promise.all([
            supabase.from('wallets').select('*').eq('user_id', session.user.id).single(),
            supabase.from('withdrawal_settings').select('*').maybeSingle(),
            supabase.from('user_withdrawal_methods').select('*').eq('user_id', session.user.id).maybeSingle()
        ]);

        if (wRes.data) setWallet(wRes.data as WalletData);
        if (sRes.data) setSettings(sRes.data as WithdrawalSettings);
        if (mRes.data) {
            setUserMethod(mRes.data as UserWithdrawMethod);
            setAutoMethod(mRes.data.method_name);
            setAutoNumber(mRes.data.account_number);
            setAutoEnabled(mRes.data.is_auto_enabled);
        }

        // Calculate Daily Usage
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

  const handleInitiateWithdraw = (e: React.FormEvent) => {
      e.preventDefault();
      if (!instantAmount) return;
      
      const val = parseFloat(instantAmount);
      if (isNaN(val) || val <= 0) {
          alert("Please enter a valid amount");
          return;
      }

      if (settings) {
          if (val < settings.min_withdraw) {
              alert(`Minimum withdrawal amount is $${settings.min_withdraw}`);
              return;
          }
          if (val > settings.max_withdraw) {
              alert(`Maximum withdrawal amount per transaction is $${settings.max_withdraw}`);
              return;
          }
          if (dailyUsage + val > settings.daily_limit) {
              alert(`This request exceeds your daily limit of $${settings.daily_limit}. Remaining: $${settings.daily_limit - dailyUsage}`);
              return;
          }
      }

      if (wallet && val > wallet.withdrawable) {
          alert("Insufficient withdrawable balance.");
          return;
      }

      // Calculate Fees
      const feePercent = settings?.withdraw_fee_percent || 0;
      const fee = (val * feePercent) / 100;
      setFeeAmount(fee);
      setNetReceive(val - fee);

      setShowConfirm(true);
  };

  const handleConfirmWithdraw = async () => {
      setShowConfirm(false);
      setProcessing(true);
      try {
          await requestWithdrawal(userId, parseFloat(instantAmount), instantMethod);
          // Refresh data immediately
          fetchData();
          setInstantAmount('');
          alert('Withdrawal request submitted successfully!');
      } catch (e: any) {
          alert(e.message);
      }
      setProcessing(false);
  };

  const handleSaveAuto = async (e: React.FormEvent) => {
      e.preventDefault();
      
      // Specific message if account number is changing
      const isChangingNumber = userMethod && userMethod.account_number !== autoNumber;
      const message = isChangingNumber 
          ? `Updating your saved number requires a verification fee of ${settings?.id_change_fee || 30} TK. Do you want to proceed?` 
          : "Save these settings for monthly auto-withdraw?";

      if (!confirm(message)) return;
      
      setProcessing(true);
      try {
          await saveWithdrawMethod(userId, autoMethod, autoNumber, autoEnabled);
          await fetchData(); // Ensure state is synced
          alert("Auto-withdraw settings saved successfully!");
      } catch (e: any) {
          console.error(e);
          alert(e.message || "Failed to save settings");
      }
      setProcessing(false);
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="animate-spin text-neon-green" /></div>;

  const dailyProgress = settings ? Math.min(100, (dailyUsage / settings.daily_limit) * 100) : 0;

  return (
    <div className="pb-24 sm:pl-20 sm:pt-6 space-y-6 px-4 sm:px-0">
      <header className="flex items-center gap-3 pt-4">
           <Link to="/wallet" className="p-2 bg-white/10 rounded-xl hover:bg-white/20 transition text-white">
              <ArrowLeft size={20} />
           </Link>
           <h1 className="text-2xl font-display font-bold text-white">Withdraw Funds</h1>
       </header>

       <GlassCard className="bg-gradient-royal relative overflow-hidden">
            <div className="relative z-10 flex justify-between items-center">
                <div>
                    <p className="text-royal-300 text-xs font-bold uppercase tracking-widest mb-1">Withdrawable Balance</p>
                    <h2 className="text-4xl font-display font-bold text-white">${wallet?.withdrawable.toFixed(2)}</h2>
                </div>
                <div className="w-12 h-12 bg-white/10 rounded-full flex items-center justify-center">
                    <Wallet className="text-neon-green" size={24} />
                </div>
            </div>
            {wallet && wallet.pending_withdraw > 0 && (
                <div className="mt-4 bg-yellow-500/10 border border-yellow-500/20 p-3 rounded-xl flex items-center gap-3 text-sm text-yellow-200 relative z-10">
                    <Loader2 size={16} className="animate-spin" /> 
                    <span>Pending Request: <strong>${wallet.pending_withdraw.toFixed(2)}</strong></span>
                </div>
            )}
       </GlassCard>

       {/* Tabs */}
       <div className="flex p-1 bg-white/5 rounded-xl border border-white/5">
            <button onClick={() => setActiveTab('instant')} className={`flex-1 py-3 text-sm font-bold rounded-lg transition-all flex items-center justify-center gap-2 ${activeTab === 'instant' ? 'bg-royal-600 text-white shadow-lg' : 'text-gray-400 hover:text-white'}`}>
                <Zap size={16} /> Instant
            </button>
            <button onClick={() => setActiveTab('monthly')} className={`flex-1 py-3 text-sm font-bold rounded-lg transition-all flex items-center justify-center gap-2 ${activeTab === 'monthly' ? 'bg-royal-600 text-white shadow-lg' : 'text-gray-400 hover:text-white'}`}>
                <ShieldCheck size={16} /> Monthly Auto
                <span className="bg-neon-green text-black text-[9px] px-1.5 py-0.5 rounded-full">+2%</span>
            </button>
       </div>

       <AnimatePresence mode="wait">
           {activeTab === 'instant' ? (
               <motion.div 
                 key="instant"
                 initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
                 className="space-y-6"
               >
                   {settings && (
                       <div className="grid grid-cols-2 gap-4">
                           <GlassCard className="p-4">
                               <div className="flex justify-between items-end mb-2">
                                   <span className="text-xs text-gray-400 font-bold uppercase">Daily Limit</span>
                                   <span className="text-xs font-mono text-white">${dailyUsage} / ${settings.daily_limit}</span>
                               </div>
                               <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
                                   <div className={`h-full rounded-full transition-all duration-500 ${dailyProgress > 90 ? 'bg-red-500' : 'bg-neon-green'}`} style={{ width: `${dailyProgress}%` }}></div>
                               </div>
                           </GlassCard>
                           <GlassCard className="p-4 flex flex-col justify-center">
                                <div className="flex justify-between text-xs mb-1">
                                    <span className="text-gray-400">Min Withdraw</span>
                                    <span className="text-white font-bold">${settings.min_withdraw}</span>
                                </div>
                                <div className="flex justify-between text-xs">
                                    <span className="text-gray-400">Max Withdraw</span>
                                    <span className="text-white font-bold">${settings.max_withdraw}</span>
                                </div>
                           </GlassCard>
                       </div>
                   )}

                   <form onSubmit={handleInitiateWithdraw} className="space-y-4">
                        <div>
                            <label className="text-xs font-bold text-gray-400 mb-1 block">Payment Method</label>
                            <select value={instantMethod} onChange={e => setInstantMethod(e.target.value)} className="w-full bg-black/30 border border-white/10 rounded-xl p-4 text-white text-sm focus:border-neon-green outline-none appearance-none">
                                <option value="bkash">Bkash</option>
                                <option value="nagad">Nagad</option>
                                <option value="rocket">Rocket</option>
                                <option value="binance">Binance (USDT)</option>
                            </select>
                        </div>
                        <div>
                            <label className="text-xs font-bold text-gray-400 mb-1 block">Amount (USD)</label>
                            <input 
                                type="number" 
                                value={instantAmount} 
                                onChange={e => setInstantAmount(e.target.value)} 
                                className="w-full bg-black/30 border border-white/10 rounded-xl p-4 text-white text-lg focus:border-neon-green outline-none"
                                placeholder={`Min $${settings?.min_withdraw || 50}`}
                            />
                        </div>
                        
                        <button 
                            type="submit" 
                            disabled={processing || !instantAmount} 
                            className="w-full py-4 bg-white text-black font-bold rounded-xl hover:bg-gray-200 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Request Withdrawal
                        </button>
                   </form>
               </motion.div>
           ) : (
               <motion.div 
                 key="monthly"
                 initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}
                 className="space-y-6"
               >
                   <GlassCard className="bg-gradient-to-r from-green-900/20 to-royal-900/20 border-green-500/30">
                       <div className="flex items-center gap-3 mb-2">
                           <ShieldCheck className="text-neon-green" size={24} />
                           <h3 className="font-bold text-white">Smart Saver Benefits</h3>
                       </div>
                       <p className="text-sm text-gray-300 mb-2">Enable Auto-Withdraw to receive your entire balance automatically at the end of the month.</p>
                       <div className="inline-block bg-neon-green/20 text-neon-green px-3 py-1 rounded-lg text-xs font-bold border border-neon-green/30">
                           🎁 Receive 2% Extra Bonus on total amount
                       </div>
                   </GlassCard>

                   <form onSubmit={handleSaveAuto} className="space-y-4">
                        <div>
                            <label className="text-xs font-bold text-gray-400 mb-1 block">Auto-Withdraw Method</label>
                            <select value={autoMethod} onChange={e => setAutoMethod(e.target.value)} className="w-full bg-black/30 border border-white/10 rounded-xl p-4 text-white text-sm focus:border-neon-green outline-none">
                                <option value="bkash">Bkash</option>
                                <option value="nagad">Nagad</option>
                                <option value="rocket">Rocket</option>
                                <option value="binance">Binance (USDT)</option>
                            </select>
                        </div>
                        <div>
                            <label className="text-xs font-bold text-gray-400 mb-1 block">Wallet Number / ID</label>
                            <input 
                                type="text" 
                                value={autoNumber} 
                                onChange={e => setAutoNumber(e.target.value)} 
                                className="w-full bg-black/30 border border-white/10 rounded-xl p-4 text-white text-lg focus:border-neon-green outline-none"
                                placeholder="Enter account number"
                            />
                        </div>

                        <div className="flex items-center justify-between bg-white/5 p-4 rounded-xl border border-white/10">
                            <div>
                                <h4 className="font-bold text-white text-sm">Enable Monthly Auto-Send</h4>
                                <p className="text-[10px] text-gray-500">Funds sent automatically on 1st of month</p>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer">
                                <input type="checkbox" checked={autoEnabled} onChange={e => setAutoEnabled(e.target.checked)} className="sr-only peer" />
                                <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-neon-green"></div>
                            </label>
                        </div>

                        {userMethod && (
                             <div className="flex items-start gap-2 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-xl text-yellow-200 text-xs">
                                 <Lock size={16} className="shrink-0 mt-0.5" />
                                 <p>Security Note: Changing your saved number requires a verification fee of <strong>{settings?.id_change_fee || 30} TK</strong> to prevent fraud.</p>
                             </div>
                        )}

                        <button 
                            type="submit" 
                            disabled={processing} 
                            className="w-full py-4 bg-neon-green text-black font-bold rounded-xl hover:bg-emerald-400 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {processing ? <Loader2 className="animate-spin" size={20}/> : 'Save Settings'}
                        </button>
                   </form>
               </motion.div>
           )}
       </AnimatePresence>

       {/* Confirmation Modal */}
       <AnimatePresence>
           {showConfirm && (
               <motion.div 
                   initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                   className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-4 sm:p-6"
                   onClick={() => setShowConfirm(false)}
               >
                   <motion.div 
                       initial={{ y: 100, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 100, opacity: 0 }}
                       className="bg-dark-900 w-full max-w-md rounded-2xl border border-white/10 p-6 relative"
                       onClick={e => e.stopPropagation()}
                   >
                       <button onClick={() => setShowConfirm(false)} className="absolute top-4 right-4 text-gray-500 hover:text-white"><X size={20}/></button>
                       
                       <h3 className="text-xl font-bold text-white mb-4">Confirm Withdrawal</h3>
                       
                       <div className="bg-white/5 rounded-xl p-4 space-y-3 mb-6">
                           <div className="flex justify-between text-sm">
                               <span className="text-gray-400">Requested Amount</span>
                               <span className="text-white font-bold text-lg">${parseFloat(instantAmount).toFixed(2)}</span>
                           </div>
                           
                           {/* Fee Section */}
                           {feeAmount > 0 ? (
                               <>
                                <div className="flex justify-between text-sm text-yellow-400">
                                    <span>Service Fee ({settings?.withdraw_fee_percent}%)</span>
                                    <span className="font-bold">-${feeAmount.toFixed(2)}</span>
                                </div>
                                <div className="h-px bg-white/10 my-2"></div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-neon-green font-bold">You Receive</span>
                                    <span className="text-neon-green font-bold text-lg">${netReceive.toFixed(2)}</span>
                                </div>
                               </>
                           ) : (
                               <div className="flex justify-between text-sm">
                                    <span className="text-gray-400">Transaction Fee</span>
                                    <span className="text-neon-green font-bold">Free</span>
                               </div>
                           )}

                           <div className="flex justify-between text-sm pt-2">
                               <span className="text-gray-400">Payment Method</span>
                               <span className="text-white font-bold uppercase">{instantMethod}</span>
                           </div>
                       </div>

                       <div className="flex gap-3">
                           <button onClick={() => setShowConfirm(false)} className="flex-1 py-3 bg-white/10 rounded-xl font-bold text-white hover:bg-white/20">Cancel</button>
                           <button onClick={handleConfirmWithdraw} disabled={processing} className="flex-1 py-3 bg-neon-green text-black rounded-xl font-bold hover:bg-emerald-400 flex items-center justify-center gap-2">
                               {processing ? <Loader2 className="animate-spin" size={18}/> : 'Confirm & Withdraw'}
                           </button>
                       </div>
                   </motion.div>
               </motion.div>
           )}
       </AnimatePresence>
    </div>
  );
};

export default Withdraw;
