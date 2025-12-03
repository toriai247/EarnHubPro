
import React, { useEffect, useState } from 'react';
import GlassCard from '../components/GlassCard';
import { ArrowLeft, Wallet, Loader2, Calculator, Lock, Info, AlertTriangle, Banknote, CheckCircle, ChevronDown, CheckCircle2 } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
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
  
  const [balance, setBalance] = useState(0);
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState('bkash');
  const [accountNumber, setAccountNumber] = useState('');
  const [loading, setLoading] = useState(false);
  const [userId, setUserId] = useState('');
  const [settings, setSettings] = useState<WithdrawalSettings | null>(null);
  
  // Currency Selection State
  const [selectedCurrency, setSelectedCurrency] = useState<string>('USD');
  
  // Activation State
  const [isActive, setIsActive] = useState(true);
  const [checkingStatus, setCheckingStatus] = useState(true);

  useEffect(() => {
    const fetch = async () => {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
            setUserId(session.user.id);
            // Fetch User Balance
            const { data } = await supabase.from('wallets').select('main_balance, currency').eq('user_id', session.user.id).single();
            if (data) {
                setBalance(data.main_balance);
                // Default the dropdown to user's preferred currency if available, else USD
                if (data.currency && CURRENCY_CONFIG[data.currency as keyof typeof CURRENCY_CONFIG]) {
                    setSelectedCurrency(data.currency);
                }
            }

            // Fetch Settings
            const { data: set } = await supabase.from('withdrawal_settings').select('*').single();
            if (set) setSettings(set as WithdrawalSettings);

            // Fetch Saved Withdrawal Methods (Auto-fill)
            const { data: savedMethods } = await supabase.from('user_withdrawal_methods').select('*').eq('user_id', session.user.id).eq('method_name', method).maybeSingle();
            if (savedMethods) {
                setAccountNumber(savedMethods.account_number);
            }

            // Check Active Status
            if (config?.is_activation_enabled) {
                const { data: profile } = await supabase.from('profiles').select('is_account_active').eq('id', session.user.id).single();
                if (profile) setIsActive(!!profile.is_account_active);
            }
        }
        setCheckingStatus(false);
    };
    fetch();
  }, [config, method]);

  // --- CONVERSION LOGIC ---
  const selectedCurrencyConfig = CURRENCY_CONFIG[selectedCurrency as keyof typeof CURRENCY_CONFIG] || CURRENCY_CONFIG.USD;
  
  // 1. User Input -> USD (For Validation & Backend)
  const inputAmount = parseFloat(amount) || 0;
  const amountInUSD = inputAmount / selectedCurrencyConfig.rate;

  // 2. Fee Calculation (Based on USD amount)
  const feePercent = settings?.withdraw_fee_percent || 0;
  const feeAmountUSD = (amountInUSD * feePercent) / 100;
  
  // 3. Net Receive (USD)
  const netReceiveUSD = amountInUSD - feeAmountUSD;

  // 4. Net Receive (Selected Currency for Display)
  const netReceiveSelected = netReceiveUSD * selectedCurrencyConfig.rate;

  const handleWithdraw = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!amount || !settings || !accountNumber) return;
      
      // Validations using USD values
      if (amountInUSD > balance) { 
          await alert(`Insufficient Withdrawable Balance.\n\nRequested: $${amountInUSD.toFixed(2)} USD\nAvailable: $${balance.toFixed(2)} USD`, "Transaction Failed");
          return; 
      }
      if (amountInUSD < settings.min_withdraw) {
          toast.error(`Minimum withdrawal is $${settings.min_withdraw} USD`);
          return;
      }
      if (amountInUSD > settings.max_withdraw) {
          toast.error(`Maximum withdrawal is $${settings.max_withdraw} USD`);
          return;
      }
      
      setLoading(true);
      try {
          // Send USD amount to backend
          await requestWithdrawal(userId, amountInUSD, method, accountNumber);
          
          // Optionally save the method for future use
          await supabase.from('user_withdrawal_methods').upsert({
              user_id: userId,
              method_name: method,
              account_number: accountNumber,
              is_auto_enabled: true 
          }, { onConflict: 'user_id,method_name' });

          toast.success("Withdrawal Requested Successfully!");
          setAmount('');
          setBalance(prev => prev - amountInUSD);
      } catch (e: any) {
          await alert(e.message, "Withdrawal Error");
      }
      setLoading(false);
  };

  const handleSetMax = () => {
      if(!settings) return;
      // Calculate max possible in USD
      const maxAllowedUSD = Math.min(balance, settings.max_withdraw);
      // Convert to selected currency for input display
      const maxAllowedSelected = maxAllowedUSD * selectedCurrencyConfig.rate;
      // Floor to 2 decimals
      setAmount(Math.floor(maxAllowedSelected * 100) / 100 + '');
  };

  if (checkingStatus) return <div className="p-10 text-center"><Loader2 className="animate-spin mx-auto text-white"/></div>;

  // BLOCKED STATE
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
                       Activate your account by depositing at least <span className="text-white font-bold">${config.activation_amount}</span>.
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
      
      {/* Header */}
      <header className="flex items-center gap-3 pt-4">
           <Link to="/wallet" className="p-2 bg-white/5 rounded-lg hover:bg-white/10 transition text-gray-400 hover:text-white">
              <ArrowLeft size={20} />
           </Link>
           <h1 className="text-xl font-bold text-white tracking-wide">Cashout</h1>
       </header>

       <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
           
           {/* LEFT COLUMN: ACTION */}
           <div className="space-y-6">
               
               {/* Balance Card */}
               <div className="bg-[#1a1a1a] border border-[#333] rounded-2xl p-6 relative overflow-hidden">
                    <div className="flex justify-between items-center mb-2">
                        <p className="text-gray-500 text-xs font-bold uppercase tracking-widest">Withdrawable Balance</p>
                        <Wallet size={16} className="text-gray-600"/>
                    </div>
                    <div className="flex items-baseline gap-2">
                        <h2 className="text-3xl font-bold text-white"><BalanceDisplay amount={balance} /></h2>
                        <span className="text-xs text-green-500 font-bold bg-green-500/10 px-2 py-0.5 rounded">Available</span>
                    </div>
               </div>

               <form onSubmit={handleWithdraw} className="space-y-6">
                    {/* Method Selection */}
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
                                    {method === m && <CheckCircle className="text-black" size={14} fill="none" />}
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Amount Input with Currency Selector */}
                    <div className="bg-[#111] border border-[#333] rounded-2xl p-5">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-sm font-bold text-white flex items-center gap-2">
                                <Calculator size={16} className="text-gray-500"/> Withdrawal Amount
                            </h3>
                            <button 
                                type="button" 
                                onClick={handleSetMax}
                                className="text-[10px] bg-white/10 text-white px-3 py-1 rounded hover:bg-white/20 transition font-bold"
                            >
                                MAX
                            </button>
                        </div>
                        
                        <div className="relative">
                            {/* Currency Dropdown */}
                            <div className="absolute left-0 top-0 bottom-0 flex items-center pl-3">
                                <div className="relative">
                                    <select 
                                        value={selectedCurrency}
                                        onChange={(e) => {
                                            setSelectedCurrency(e.target.value);
                                            setAmount(''); // Reset input on currency change
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
                                value={amount} 
                                onChange={e => setAmount(e.target.value)} 
                                className="w-full bg-transparent border-b-2 border-[#333] rounded-none py-3 pl-28 pr-3 text-white font-bold text-2xl focus:border-white outline-none placeholder-gray-700 transition-colors text-right"
                                placeholder="0.00"
                            />
                        </div>

                        {/* Conversion Hint */}
                        {amountInUSD > 0 && selectedCurrency !== 'USD' && (
                            <div className="text-right mt-2 text-xs text-gray-500 font-mono">
                                ≈ ${amountInUSD.toFixed(2)} USD
                            </div>
                        )}

                        {/* Error Messages */}
                        {settings && amountInUSD > 0 && (
                            <div className="mt-3 space-y-1">
                                {amountInUSD < settings.min_withdraw && (
                                    <div className="text-red-500 text-xs flex items-center gap-1 font-medium justify-end">
                                        <AlertTriangle size={12}/> Min: ${settings.min_withdraw}
                                    </div>
                                )}
                                {amountInUSD > settings.max_withdraw && (
                                    <div className="text-red-500 text-xs flex items-center gap-1 font-medium justify-end">
                                        <AlertTriangle size={12}/> Max: ${settings.max_withdraw}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Account Number Input */}
                    <div>
                        <label className="text-xs font-bold text-gray-400 mb-2 block uppercase">
                            Target Account / Phone Number
                        </label>
                        <div className="relative">
                            <input 
                                type="text"
                                value={accountNumber}
                                onChange={e => setAccountNumber(e.target.value)}
                                className="w-full bg-[#111] border border-[#333] rounded-xl p-4 pl-12 text-white font-mono focus:border-white outline-none transition placeholder-gray-600"
                                placeholder={method === 'binance' ? 'Pay ID / Wallet Address' : 'Wallet Number (e.g. 017...)'}
                            />
                            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">
                                <CheckCircle2 size={20} className={accountNumber.length > 5 ? "text-green-500" : "text-gray-600"} />
                            </div>
                        </div>
                        <p className="text-[10px] text-gray-500 mt-2 ml-1">
                            Double check this number. We are not responsible for funds sent to the wrong account.
                        </p>
                    </div>
                    
                    <button 
                        type="submit" 
                        disabled={loading || !amount || !accountNumber || (settings ? (amountInUSD < settings.min_withdraw || amountInUSD > settings.max_withdraw) : false)} 
                        className="w-full py-4 bg-white text-black font-black uppercase tracking-wider rounded-xl hover:bg-gray-200 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-lg"
                    >
                        {loading ? <Loader2 className="animate-spin" /> : 'Confirm Withdrawal'}
                    </button>
               </form>
           </div>

           {/* RIGHT COLUMN: SUMMARY */}
           <div className="space-y-6">
               
               {/* Summary Receipt */}
               <div className="bg-[#1a1a1a] border border-[#333] rounded-2xl p-6 relative">
                   <div className="absolute top-0 left-0 w-full h-1 bg-white/10"></div>
                   <h3 className="font-bold text-white mb-6 flex items-center gap-2">
                       <Banknote size={18} className="text-green-500"/> Transaction Details
                   </h3>
                   
                   <div className="space-y-4 text-sm">
                       <div className="flex justify-between text-gray-400">
                           <span>Requested</span>
                           <span className="text-white font-mono font-bold">
                               {selectedCurrencyConfig.symbol}{inputAmount.toLocaleString()}
                           </span>
                       </div>
                       <div className="flex justify-between text-gray-400">
                           <span>System Fee ({feePercent}%)</span>
                           <span className="text-red-400 font-mono">
                               - {selectedCurrencyConfig.symbol}{(feeAmountUSD * selectedCurrencyConfig.rate).toFixed(2)}
                           </span>
                       </div>
                       <div className="flex justify-between text-gray-400">
                           <span>Sending To</span>
                           <span className="text-white font-mono">{accountNumber || '...'}</span>
                       </div>
                       
                       <div className="h-px bg-[#333] my-2"></div>
                       
                       <div className="flex justify-between items-end">
                           <span className="text-gray-300 font-bold">Net Receive</span>
                           <div className="text-right">
                               <p className="text-2xl font-bold text-white font-mono leading-none">
                                   {selectedCurrencyConfig.symbol}{netReceiveSelected.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                               </p>
                               {selectedCurrency !== 'USD' && (
                                   <p className="text-[10px] text-gray-500 mt-1 font-mono">
                                       (${netReceiveUSD.toFixed(2)} USD)
                                   </p>
                               )}
                           </div>
                       </div>
                   </div>
               </div>

               {/* Static Limits Grid */}
               {settings && (
                   <div className="grid grid-cols-2 gap-3">
                       <div className="bg-[#111] border border-[#222] p-3 rounded-xl">
                           <p className="text-[10px] text-gray-500 uppercase font-bold mb-1">Min USD</p>
                           <p className="text-white font-mono font-bold text-sm">${settings.min_withdraw}</p>
                       </div>
                       <div className="bg-[#111] border border-[#222] p-3 rounded-xl">
                           <p className="text-[10px] text-gray-500 uppercase font-bold mb-1">Max USD</p>
                           <p className="text-white font-mono font-bold text-sm">${settings.max_withdraw}</p>
                       </div>
                       <div className="bg-[#111] border border-[#222] p-3 rounded-xl">
                           <p className="text-[10px] text-gray-500 uppercase font-bold mb-1">Daily Cap</p>
                           <p className="text-white font-mono font-bold text-sm">${settings.daily_limit}</p>
                       </div>
                       <div className="bg-[#111] border border-[#222] p-3 rounded-xl">
                           <p className="text-[10px] text-gray-500 uppercase font-bold mb-1">Processing</p>
                           <p className="text-white font-mono font-bold text-sm">~24h</p>
                       </div>
                   </div>
               )}

               <div className="flex items-start gap-3 bg-blue-900/10 p-4 rounded-xl border border-blue-500/20">
                   <Info size={18} className="text-blue-400 shrink-0 mt-0.5" />
                   <div className="text-xs text-blue-200/80 leading-relaxed">
                       <p className="font-bold text-blue-300 mb-1">Important:</p>
                       Ensure your payment details (e.g., Bkash number) are correct. Incorrect details may result in funds being lost permanently.
                   </div>
               </div>
           </div>
       </div>
    </div>
  );
};

export default Withdraw;
