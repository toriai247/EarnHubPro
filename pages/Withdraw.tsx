
import React, { useEffect, useState } from 'react';
import GlassCard from '../components/GlassCard';
import { ArrowLeft, Wallet, Loader2, Calculator, Lock, Info, AlertTriangle, Banknote, CheckCircle2, ChevronDown } from 'lucide-react';
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
  const { selectedToBDT, format, currency: displayCurrency } = useCurrency(); // Currency Context helpers
  
  const [balance, setBalance] = useState(0); // Main balance in BDT
  const [inputAmount, setInputAmount] = useState(''); // User typed amount (in display currency)
  const [method, setMethod] = useState('bkash');
  const [accountNumber, setAccountNumber] = useState('');
  const [loading, setLoading] = useState(false);
  const [userId, setUserId] = useState('');
  const [settings, setSettings] = useState<WithdrawalSettings | null>(null);
  
  // Withdrawal Currency State (User can choose to calculate in USD or BDT)
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
                // Default input currency to user preference
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
  
  // 1. Input (Display Currency) -> BDT (System Currency)
  const amountInDisplay = parseFloat(inputAmount) || 0;
  const amountInBDT = amountInDisplay / selectedConfig.rate;

  // 2. Fee (Percent of BDT Amount)
  const feePercent = settings?.withdraw_fee_percent || 0;
  const feeInBDT = (amountInBDT * feePercent) / 100;
  
  // 3. Net Receive (in Display Currency)
  const feeInDisplay = feeInBDT * selectedConfig.rate;
  const netReceiveDisplay = amountInDisplay - feeInDisplay;

  const handleWithdraw = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!inputAmount || !settings || !accountNumber) return;
      
      // All Validations against BDT
      // 1. Balance Check
      if (amountInBDT > balance) { 
          await alert(`Insufficient Withdrawable Balance.\n\nRequested: ${format(amountInBDT, {isNative:true})}\nAvailable: ${format(balance, {isNative:true})}`, "Transaction Failed");
          return; 
      }
      
      // 2. Limits Check (Settings stored in BDT)
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
          // Send RAW BDT amount to backend
          await requestWithdrawal(userId, amountInBDT, method, accountNumber);
          
          await supabase.from('user_withdrawal_methods').upsert({
              user_id: userId,
              method_name: method,
              account_number: accountNumber,
              is_auto_enabled: true 
          }, { onConflict: 'user_id,method_name' });

          toast.success("Withdrawal Requested Successfully!");
          setInputAmount('');
          setBalance(prev => prev - amountInBDT);
      } catch (e: any) {
          await alert(e.message, "Withdrawal Error");
      }
      setLoading(false);
  };

  const handleSetMax = () => {
      if(!settings) return;
      // Max possible BDT
      const maxBDT = Math.min(balance, settings.max_withdraw);
      // Convert to Display Currency
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
                   <h2 className="text-lg font-bold text-white uppercase mb-2">Account Inactive</h2>
                   <p className="text-gray-400 text-sm max-w-sm mx-auto mb-8">
                       Activate your account by depositing at least <span className="text-white font-bold">{format(config.activation_amount || 0)}</span>.
                   </p>
                   <Link to="/deposit" className="px-6 py-3 bg-white text-black font-bold rounded-lg hover:bg-gray-200 transition">
                       Deposit Now
                   </Link>
               </div>
          </div>
      )
  }

  return (
    <div className="pb-24 sm:pl-20 sm:pt-6 space-y-6 px-4 sm:px-0 font-sans">
      <header className="flex items-center gap-3 pt-4">
           <Link to="/wallet" className="p-2 bg-white/5 rounded-lg hover:bg-white/10 transition text-gray-400 hover:text-white">
              <ArrowLeft size={20} />
           </Link>
           <h1 className="text-xl font-bold text-white tracking-wide">Cashout</h1>
       </header>

       <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
           {/* LEFT COLUMN */}
           <div className="space-y-6">
               
               {/* Balance Card */}
               <div className="bg-[#1a1a1a] border border-[#333] rounded-2xl p-6 relative overflow-hidden">
                    <div className="flex justify-between items-center mb-2">
                        <p className="text-gray-500 text-xs font-bold uppercase tracking-widest">Withdrawable</p>
                        <Wallet size={16} className="text-gray-600"/>
                    </div>
                    <div className="flex items-baseline gap-2">
                        <h2 className="text-3xl font-bold text-white"><BalanceDisplay amount={balance} /></h2>
                        <span className="text-xs text-green-500 font-bold bg-green-500/10 px-2 py-0.5 rounded">Available</span>
                    </div>
               </div>

               <form onSubmit={handleWithdraw} className="space-y-6">
                    {/* Method */}
                    <div>
                        <label className="text-xs font-bold text-gray-400 mb-2 block uppercase">Select Method</label>
                        <div className="grid grid-cols-2 gap-2">
                            {['bkash', 'nagad', 'binance', 'bank'].map(m => (
                                <div 
                                    key={m}
                                    onClick={() => setMethod(m)}
                                    className={`cursor-pointer p-4 rounded-xl border flex items-center justify-center gap-2 transition-colors ${method === m ? 'bg-white text-black border-white' : 'bg-[#111] border-[#333] text-gray-400 hover:bg-[#222]'}`}
                                >
                                    <span className="capitalize font-bold text-sm">{m}</span>
                                    {method === m && <CheckCircle2 className="text-black" size={14} fill="none" />}
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Amount Input */}
                    <div className="bg-[#111] border border-[#333] rounded-2xl p-5">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-sm font-bold text-white flex items-center gap-2">
                                <Calculator size={16} className="text-gray-500"/> Withdrawal Amount
                            </h3>
                            <button type="button" onClick={handleSetMax} className="text-[10px] bg-white/10 text-white px-3 py-1 rounded hover:bg-white/20 transition font-bold">MAX</button>
                        </div>
                        
                        <div className="relative">
                            <div className="absolute left-0 top-0 bottom-0 flex items-center pl-3">
                                <div className="relative">
                                    <select 
                                        value={withdrawCurrency}
                                        onChange={(e) => {
                                            setWithdrawCurrency(e.target.value);
                                            setInputAmount('');
                                        }}
                                        className="appearance-none bg-[#222] text-white font-bold text-sm pl-3 pr-8 py-2 rounded-lg border border-[#444] focus:outline-none focus:border-white cursor-pointer"
                                    >
                                        {Object.values(CURRENCY_CONFIG).map((c) => (
                                            <option key={c.code} value={c.code}>{c.code}</option>
                                        ))}
                                    </select>
                                    <ChevronDown size={14} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                                </div>
                            </div>

                            <input 
                                type="number" 
                                value={inputAmount} 
                                onChange={e => setInputAmount(e.target.value)} 
                                className="w-full bg-transparent border-b-2 border-[#333] rounded-none py-3 pl-28 pr-3 text-white font-bold text-2xl focus:border-white outline-none placeholder-gray-700 transition-colors text-right"
                                placeholder="0.00"
                            />
                        </div>

                        {/* Conversion Hint */}
                        {amountInBDT > 0 && withdrawCurrency !== 'BDT' && (
                            <div className="text-right mt-2 text-xs text-gray-500 font-mono">
                                ≈ {format(amountInBDT, {isNative: true})}
                            </div>
                        )}

                        {/* Error Messages */}
                        {settings && amountInBDT > 0 && (
                            <div className="mt-3 space-y-1">
                                {amountInBDT < settings.min_withdraw && (
                                    <div className="text-red-500 text-xs flex items-center gap-1 font-medium justify-end">
                                        <AlertTriangle size={12}/> Min: {format(settings.min_withdraw, {isNative: true})}
                                    </div>
                                )}
                                {amountInBDT > settings.max_withdraw && (
                                    <div className="text-red-500 text-xs flex items-center gap-1 font-medium justify-end">
                                        <AlertTriangle size={12}/> Max: {format(settings.max_withdraw, {isNative: true})}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Account Number */}
                    <div>
                        <label className="text-xs font-bold text-gray-400 mb-2 block uppercase">Target Account</label>
                        <div className="relative">
                            <input 
                                type="text"
                                value={accountNumber}
                                onChange={e => setAccountNumber(e.target.value)}
                                className="w-full bg-[#111] border border-[#333] rounded-xl p-4 pl-12 text-white font-mono focus:border-white outline-none transition placeholder-gray-600"
                                placeholder={method === 'binance' ? 'Wallet Address / Pay ID' : '017...'}
                            />
                            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">
                                <CheckCircle2 size={20} className={accountNumber.length > 5 ? "text-green-500" : "text-gray-600"} />
                            </div>
                        </div>
                    </div>
                    
                    <button 
                        type="submit" 
                        disabled={loading || !inputAmount || !accountNumber || (settings ? (amountInBDT < settings.min_withdraw || amountInBDT > settings.max_withdraw) : false)} 
                        className="w-full py-4 bg-white text-black font-black uppercase tracking-wider rounded-xl hover:bg-gray-200 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-lg"
                    >
                        {loading ? <Loader2 className="animate-spin" /> : 'Confirm Withdrawal'}
                    </button>
               </form>
           </div>

           {/* RIGHT COLUMN: SUMMARY */}
           <div className="space-y-6">
               <div className="bg-[#1a1a1a] border border-[#333] rounded-2xl p-6 relative">
                   <div className="absolute top-0 left-0 w-full h-1 bg-white/10"></div>
                   <h3 className="font-bold text-white mb-6 flex items-center gap-2">
                       <Banknote size={18} className="text-green-500"/> Details
                   </h3>
                   
                   <div className="space-y-4 text-sm">
                       <div className="flex justify-between text-gray-400">
                           <span>Requested</span>
                           <span className="text-white font-mono font-bold">
                               {selectedConfig.symbol}{parseFloat(inputAmount || '0').toLocaleString()}
                           </span>
                       </div>
                       <div className="flex justify-between text-gray-400">
                           <span>Fee ({feePercent}%)</span>
                           <span className="text-red-400 font-mono">
                               - {selectedConfig.symbol}{feeInDisplay.toFixed(2)}
                           </span>
                       </div>
                       <div className="flex justify-between text-gray-400">
                           <span>To</span>
                           <span className="text-white font-mono">{accountNumber || '...'}</span>
                       </div>
                       
                       <div className="h-px bg-[#333] my-2"></div>
                       
                       <div className="flex justify-between items-end">
                           <span className="text-gray-300 font-bold">Net Receive</span>
                           <div className="text-right">
                               <p className="text-2xl font-bold text-white font-mono leading-none">
                                   {selectedConfig.symbol}{netReceiveDisplay.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                               </p>
                           </div>
                       </div>
                   </div>
               </div>

               {/* Limits Info */}
               {settings && (
                   <div className="grid grid-cols-2 gap-3">
                       <div className="bg-[#111] border border-[#222] p-3 rounded-xl">
                           <p className="text-[10px] text-gray-500 uppercase font-bold mb-1">Min Limit</p>
                           <p className="text-white font-mono font-bold text-sm">{format(settings.min_withdraw, {isNative: true})}</p>
                       </div>
                       <div className="bg-[#111] border border-[#222] p-3 rounded-xl">
                           <p className="text-[10px] text-gray-500 uppercase font-bold mb-1">Max Limit</p>
                           <p className="text-white font-mono font-bold text-sm">{format(settings.max_withdraw, {isNative: true})}</p>
                       </div>
                   </div>
               )}
           </div>
       </div>
    </div>
  );
};

export default Withdraw;
