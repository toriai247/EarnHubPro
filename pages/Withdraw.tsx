
import React, { useEffect, useState } from 'react';
import GlassCard from '../components/GlassCard';
import { ArrowLeft, Wallet, Loader2, Calculator, Lock, AlertTriangle, CheckCircle2, ChevronDown, Landmark } from 'lucide-react';
import { Link } from 'react-router-dom';
import { supabase } from '../integrations/supabase/client';
import { requestWithdrawal } from '../lib/actions';
import { useUI } from '../context/UIContext';
import { useCurrency } from '../context/CurrencyContext';
import BalanceDisplay from '../components/BalanceDisplay';
import { useSystem } from '../context/SystemContext';
import { WithdrawalSettings } from '../types';
import { CURRENCY_CONFIG } from '../constants';

const Withdraw: React.FC = () => {
  const { toast, alert } = useUI();
  const { config } = useSystem();
  const { format, currency: displayCurrency } = useCurrency();
  
  const [balance, setBalance] = useState(0); // Main balance in BDT
  const [inputAmount, setInputAmount] = useState(''); // User typed amount (in display currency)
  const [method, setMethod] = useState('bkash');
  const [accountNumber, setAccountNumber] = useState('');
  const [loading, setLoading] = useState(false);
  const [userId, setUserId] = useState('');
  const [settings, setSettings] = useState<WithdrawalSettings | null>(null);
  
  // Withdrawal Currency State
  const [withdrawCurrency, setWithdrawCurrency] = useState<string>('BDT');
  const [isActive, setIsActive] = useState(true);
  const [checkingStatus, setCheckingStatus] = useState(true);

  useEffect(() => {
    const fetch = async () => {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
            setUserId(session.user.id);
            // Fetch User Balance (Always BDT from DB)
            const { data } = await supabase.from('wallets').select('main_balance, currency').eq('user_id', session.user.id).single();
            if (data) {
                setBalance(data.main_balance);
                if (data.currency) setWithdrawCurrency(data.currency);
            }

            const { data: set } = await supabase.from('withdrawal_settings').select('*').single();
            if (set) setSettings(set as WithdrawalSettings);

            const { data: savedMethods } = await supabase.from('user_withdrawal_methods').select('*').eq('user_id', session.user.id).eq('method_name', method).maybeSingle();
            if (savedMethods) setAccountNumber(savedMethods.account_number);

            if (config?.is_activation_enabled) {
                const { data: profile } = await supabase.from('profiles').select('is_account_active').eq('id', session.user.id).single();
                if (profile) setIsActive(!!profile.is_account_active);
            }
        }
        setCheckingStatus(false);
    };
    fetch();
  }, [config, method]);

  // --- CALCULATION LOGIC ---
  const selectedConfig = CURRENCY_CONFIG[withdrawCurrency as keyof typeof CURRENCY_CONFIG] || CURRENCY_CONFIG.BDT;
  
  const amountInDisplay = parseFloat(inputAmount) || 0;
  const amountInBDT = amountInDisplay / selectedConfig.rate;

  const feePercent = settings?.withdraw_fee_percent || 0;
  const feeInBDT = (amountInBDT * feePercent) / 100;
  
  const feeInDisplay = feeInBDT * selectedConfig.rate;
  const netReceiveDisplay = amountInDisplay - feeInDisplay;

  const handleWithdraw = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!inputAmount || !settings || !accountNumber) return;
      
      // 1. Balance Check
      if (amountInBDT > balance) { 
          toast.error("Insufficient Funds");
          return; 
      }
      
      // 2. Limits Check
      if (amountInBDT < settings.min_withdraw) {
          toast.error(`Minimum withdrawal is ${format(settings.min_withdraw, {isNative:true})}`);
          return;
      }
      if (amountInBDT > settings.max_withdraw) {
          toast.error(`Maximum withdrawal is ${format(settings.max_withdraw, {isNative:true})}`);
          return;
      }
      
      setLoading(true);
      try {
          await requestWithdrawal(userId, amountInBDT, method, accountNumber);
          
          await supabase.from('user_withdrawal_methods').upsert({
              user_id: userId,
              method_name: method,
              account_number: accountNumber,
              is_auto_enabled: true 
          }, { onConflict: 'user_id,method_name' });

          toast.success("Withdrawal Requested!");
          setInputAmount('');
          setBalance(prev => prev - amountInBDT);
      } catch (e: any) {
          toast.error(e.message || "Withdrawal failed.");
      }
      setLoading(false);
  };

  const handleSetMax = () => {
      if(!settings) return;
      const maxBDT = Math.min(balance, settings.max_withdraw);
      const maxDisplay = maxBDT * selectedConfig.rate;
      setInputAmount(Math.floor(maxDisplay * 100) / 100 + '');
  };

  if (checkingStatus) return <div className="p-10 text-center"><Loader2 className="animate-spin mx-auto text-white"/></div>;

  if (config?.is_activation_enabled && !isActive) {
      return (
          <div className="pb-24 sm:pl-20 sm:pt-6 space-y-6 px-4 sm:px-0">
              <header className="flex items-center gap-3 pt-4">
                   <Link to="/wallet" className="p-2 bg-white/10 rounded-lg hover:bg-white/20 transition text-white">
                      <ArrowLeft size={20} />
                   </Link>
                   <h1 className="text-xl font-bold text-white">Withdraw Funds</h1>
               </header>
               
               <div className="border border-red-500/30 bg-red-950/20 text-center py-12 px-6 rounded-2xl">
                   <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-6 border border-red-500/20">
                       <Lock size={32} className="text-red-500" />
                   </div>
                   <h2 className="text-lg font-bold text-white uppercase mb-2">Account Locked</h2>
                   <p className="text-gray-400 text-sm max-w-sm mx-auto mb-8">
                       Activate your account by depositing <span className="text-white font-bold">{format(config.activation_amount || 0)}</span>.
                   </p>
                   <Link to="/deposit" className="px-6 py-3 bg-white text-black font-bold rounded-lg hover:bg-gray-200 transition">
                       Go to Deposit
                   </Link>
               </div>
          </div>
      )
  }

  return (
    <div className="pb-24 sm:pl-20 sm:pt-6 space-y-6 px-4 sm:px-0 font-sans">
      
      {/* Header */}
      <header className="flex items-center justify-between pt-4">
           <div className="flex items-center gap-3">
               <Link to="/wallet" className="p-2 bg-white/5 rounded-lg hover:bg-white/10 text-gray-300 hover:text-white transition">
                  <ArrowLeft size={20} />
               </Link>
               <div>
                   <h1 className="text-xl font-bold text-white">Withdraw</h1>
                   <p className="text-xs text-gray-500">Fast & Secure Payouts</p>
               </div>
           </div>
           
           <div className="text-right">
               <p className="text-[10px] text-gray-500 uppercase font-bold">Balance</p>
               <p className="text-green-400 font-mono font-bold text-lg"><BalanceDisplay amount={balance} /></p>
           </div>
       </header>

       {/* Main Layout - Simple Column */}
       <div className="max-w-xl mx-auto space-y-6">
           
           {/* Method Selector */}
           <div className="space-y-2">
                <label className="text-xs font-bold text-gray-500 uppercase px-1">Payment Method</label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {['bkash', 'nagad', 'binance', 'bank'].map(m => (
                        <button 
                            key={m}
                            onClick={() => setMethod(m)}
                            className={`p-3 rounded-xl text-sm font-bold capitalize transition border ${
                                method === m 
                                ? 'bg-white text-black border-white shadow-lg' 
                                : 'bg-[#111] text-gray-400 border-[#333] hover:border-gray-600'
                            }`}
                        >
                            {m}
                        </button>
                    ))}
                </div>
           </div>

           {/* Input Form */}
           <GlassCard className="border border-[#222] bg-[#0A0A0A] p-0 overflow-hidden">
               <div className="p-5 space-y-5">
                   {/* Amount Input */}
                   <div>
                       <div className="flex justify-between items-center mb-2">
                           <label className="text-xs font-bold text-gray-500 uppercase">Amount</label>
                           <button onClick={handleSetMax} className="text-[10px] font-bold bg-white/10 px-2 py-0.5 rounded text-gray-300 hover:text-white hover:bg-white/20">MAX</button>
                       </div>
                       
                       <div className="relative">
                           <div className="absolute left-0 top-0 bottom-0 flex items-center">
                                <select 
                                    value={withdrawCurrency}
                                    onChange={(e) => {
                                        setWithdrawCurrency(e.target.value);
                                        setInputAmount('');
                                    }}
                                    className="bg-transparent text-white font-bold text-xl pl-0 pr-6 py-2 focus:outline-none cursor-pointer appearance-none"
                                >
                                    {Object.values(CURRENCY_CONFIG).map((c) => (
                                        <option key={c.code} value={c.code}>{c.symbol}</option>
                                    ))}
                                </select>
                                <ChevronDown size={12} className="absolute right-0 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
                           </div>

                           <input 
                               type="number" 
                               value={inputAmount} 
                               onChange={e => setInputAmount(e.target.value)} 
                               className="w-full bg-transparent border-b border-[#333] py-2 pl-16 pr-2 text-white font-bold text-3xl focus:border-white outline-none placeholder-gray-800 transition-colors text-right"
                               placeholder="0.00"
                           />
                       </div>
                       {/* Fee Hint */}
                       {amountInDisplay > 0 && (
                           <div className="flex justify-end items-center gap-2 mt-2 text-xs text-gray-500">
                               <span>Fee: {selectedConfig.symbol}{feeInDisplay.toFixed(2)}</span>
                               <span>•</span>
                               <span className="text-white font-bold">Net: {selectedConfig.symbol}{netReceiveDisplay.toFixed(2)}</span>
                           </div>
                       )}
                   </div>

                   {/* Account Input */}
                   <div>
                       <label className="text-xs font-bold text-gray-500 uppercase block mb-2">
                           {method === 'binance' ? 'Wallet Address' : 'Mobile Number'}
                       </label>
                       <div className="relative">
                           <input 
                               type="text"
                               value={accountNumber}
                               onChange={e => setAccountNumber(e.target.value)}
                               className="w-full bg-[#151515] border border-[#333] rounded-xl p-4 pl-12 text-white font-mono focus:border-white outline-none transition placeholder-gray-700"
                               placeholder={method === 'binance' ? 'TRC20 Address...' : '017...'}
                           />
                           <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">
                               {method === 'binance' ? <Wallet size={20}/> : <Landmark size={20} />}
                           </div>
                           {accountNumber.length > 5 && (
                               <div className="absolute right-4 top-1/2 -translate-y-1/2 text-green-500">
                                   <CheckCircle2 size={18} />
                               </div>
                           )}
                       </div>
                   </div>
               </div>

               {/* Bottom Action Area */}
               <div className="bg-[#151515] p-4 border-t border-[#222]">
                   <button 
                       onClick={handleWithdraw}
                       disabled={loading || !inputAmount || !accountNumber || (settings ? (amountInBDT < settings.min_withdraw || amountInBDT > settings.max_withdraw) : false)} 
                       className="w-full py-4 bg-white text-black font-bold uppercase tracking-wider rounded-xl hover:bg-gray-200 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-lg"
                   >
                       {loading ? <Loader2 className="animate-spin" /> : 'Confirm Withdrawal'}
                   </button>
                   
                   {settings && (
                        <p className="text-center text-[10px] text-gray-600 mt-3">
                            Min: {format(settings.min_withdraw, {isNative: true})} • Max: {format(settings.max_withdraw, {isNative: true})}
                        </p>
                   )}
               </div>
           </GlassCard>
       </div>
    </div>
  );
};

export default Withdraw;
