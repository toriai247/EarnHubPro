
import React, { useState, useEffect } from 'react';
import GlassCard from '../components/GlassCard';
import { useCurrency } from '../context/CurrencyContext';
import { ArrowRightLeft, Wallet, RefreshCw, CheckCircle2, TrendingUp, Globe, AlertTriangle } from 'lucide-react';
import { supabase } from '../integrations/supabase/client';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import Loader from '../components/Loader';
import { useUI } from '../context/UIContext';

const Exchange: React.FC = () => {
  const { toast } = useUI();
  const { currency, setCurrency, isLoading: contextLoading } = useCurrency();
  const [balance, setBalance] = useState(0);
  const [selectedTarget, setSelectedTarget] = useState<string>(currency);
  const [userId, setUserId] = useState('');
  const [loadingData, setLoadingData] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const navigate = useNavigate();

  // Available Currencies with Metadata
  const currencies = [
      { code: 'USD', name: 'US Dollar', symbol: '$', rate: 1, flag: '🇺🇸' },
      { code: 'BDT', name: 'Bangladeshi Taka', symbol: '৳', rate: 120, flag: '🇧🇩' },
      { code: 'EUR', name: 'Euro', symbol: '€', rate: 0.92, flag: '🇪🇺' },
      { code: 'INR', name: 'Indian Rupee', symbol: '₹', rate: 84, flag: '🇮🇳' },
      { code: 'GBP', name: 'British Pound', symbol: '£', rate: 0.79, flag: '🇬🇧' },
  ];

  useEffect(() => {
      const fetch = async () => {
          const { data: { session } } = await supabase.auth.getSession();
          if (session) {
              setUserId(session.user.id);
              // Fetch 'balance' which is the Main Wallet (USD Base)
              const { data } = await supabase.from('wallets').select('balance').eq('user_id', session.user.id).single();
              if (data) setBalance(data.balance);
          }
          setLoadingData(false);
      };
      fetch();
  }, []);

  // Pre-select a different currency if the current one is already selected
  useEffect(() => {
      if (selectedTarget === currency) {
          const next = currencies.find(c => c.code !== currency);
          if (next) setSelectedTarget(next.code);
      }
  }, [currency]);

  const handleExchange = async () => {
      if (!selectedTarget || !userId) return;
      if (selectedTarget === currency) {
          toast.error("Please select a different currency.");
          return;
      }

      setIsProcessing(true);
      // Call setCurrency with userId only (it fetches fresh balance internally)
      const success = await setCurrency(selectedTarget as any, userId);
      setIsProcessing(false);

      if (success) {
          setShowSuccess(true);
          // Refresh balance visually to reflect deduction
          setBalance(prev => prev - (prev * 0.05)); 
          setTimeout(() => {
              navigate('/wallet');
          }, 2500);
      }
  };

  // Calculations for UI
  const currentInfo = currencies.find(c => c.code === currency) || currencies[0];
  const targetInfo = currencies.find(c => c.code === selectedTarget) || currencies[1];
  
  // Rates relative to USD
  const currentRate = currentInfo.rate;
  const targetRate = targetInfo.rate;
  
  // Fee Calculation
  const feePercent = 5;
  const feeAmountUSD = balance * (feePercent / 100);
  const netBalanceUSD = balance - feeAmountUSD;
  
  // Display Values
  const currentDisplayValue = balance * currentRate;
  const predictedDisplayValue = netBalanceUSD * targetRate;

  if (loadingData) return <div className="min-h-screen flex items-center justify-center"><Loader /></div>;

  return (
    <div className="pb-24 sm:pl-20 sm:pt-6 space-y-6 px-4 sm:px-0">
       <header className="pt-4 flex flex-col gap-1">
           <h1 className="text-2xl font-display font-bold text-white flex items-center gap-2">
               <Globe className="text-neon-green" size={24} /> Exchange Center
           </h1>
           <p className="text-gray-400 text-xs">Switch display currency & view real-time rates.</p>
       </header>

       {/* MAIN EXCHANGE CARD */}
       <GlassCard className="border-royal-500/30 bg-gradient-to-br from-dark-900 to-royal-900/10 overflow-hidden relative p-0">
           <div className="p-5 relative z-10">
               
               {/* FROM SECTION */}
               <div className="mb-6">
                   <div className="flex justify-between items-center mb-2">
                       <p className="text-xs font-bold text-gray-400 uppercase">Current Holding</p>
                       <span className="text-[10px] bg-white/10 px-2 py-0.5 rounded text-gray-300">Base: USD</span>
                   </div>
                   <div className="flex justify-between items-center bg-black/40 p-4 rounded-2xl border border-white/5 relative overflow-hidden">
                       <div className="relative z-10">
                           <p className="text-2xl font-bold text-white tracking-tight">
                               {currentInfo.symbol} {currentDisplayValue.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                           </p>
                           <p className="text-xs text-gray-500 mt-1 font-mono">≈ ${balance.toFixed(2)} USD</p>
                       </div>
                       <div className="relative z-10 text-right">
                           <div className="text-4xl mb-1">{currentInfo.flag}</div>
                           <span className="text-xs font-bold text-white bg-white/10 px-2 py-1 rounded">{currency}</span>
                       </div>
                   </div>
               </div>

               {/* EXCHANGE ICON */}
               <div className="flex justify-center -my-5 relative z-20">
                   <div className="bg-dark-900 p-1.5 rounded-full border border-white/10">
                       <div className="w-10 h-10 bg-neon-green text-black rounded-full flex items-center justify-center shadow-[0_0_15px_rgba(16,185,129,0.4)] animate-pulse-slow">
                           <ArrowRightLeft size={20} />
                       </div>
                   </div>
               </div>

               {/* TO SECTION */}
               <div className="mt-4">
                   <p className="text-xs font-bold text-gray-400 uppercase mb-2">Switch To</p>
                   <div className="bg-white/5 p-3 rounded-2xl border border-white/10">
                       <div className="grid grid-cols-4 sm:grid-cols-5 gap-2">
                           {currencies.map(c => (
                               <button
                                   key={c.code}
                                   onClick={() => setSelectedTarget(c.code)}
                                   disabled={c.code === currency}
                                   className={`flex flex-col items-center justify-center p-2 rounded-xl transition-all relative overflow-hidden ${
                                       selectedTarget === c.code 
                                       ? 'bg-royal-600/20 border border-neon-green/50 shadow-[0_0_10px_rgba(16,185,129,0.1)]' 
                                       : c.code === currency ? 'opacity-30 cursor-not-allowed grayscale' : 'hover:bg-white/5 border border-transparent opacity-70 hover:opacity-100'
                                   }`}
                               >
                                   <span className="text-2xl mb-1">{c.flag}</span>
                                   <span className={`text-[10px] font-bold ${selectedTarget === c.code ? 'text-neon-green' : 'text-gray-400'}`}>{c.code}</span>
                                   {selectedTarget === c.code && (
                                       <div className="absolute top-1 right-1 w-1.5 h-1.5 bg-neon-green rounded-full shadow-[0_0_5px_#10b981]"></div>
                                   )}
                               </button>
                           ))}
                       </div>
                   </div>
               </div>

               {/* PREVIEW & ACTION */}
               <AnimatePresence mode="wait">
                   <motion.div 
                       key={selectedTarget}
                       initial={{ opacity: 0, y: 10 }} 
                       animate={{ opacity: 1, y: 0 }}
                       exit={{ opacity: 0, y: -10 }}
                       className="mt-6"
                   >
                       <div className="bg-yellow-500/5 border border-yellow-500/20 rounded-xl p-4 mb-4 relative overflow-hidden">
                           <div className="absolute top-0 right-0 p-2 opacity-10"><AlertTriangle size={48}/></div>
                           
                           <div className="flex justify-between items-center mb-2 text-sm">
                               <span className="text-gray-400">Conversion Fee (5%)</span>
                               <span className="text-red-400 font-mono font-bold">-${feeAmountUSD.toFixed(2)} USD</span>
                           </div>
                           <div className="h-px bg-white/5 my-2"></div>
                           <div className="flex justify-between items-center">
                               <div>
                                   <p className="text-xs text-gray-400">New Balance Est.</p>
                                   <p className="text-lg font-bold text-neon-green">
                                       {targetInfo.symbol} {predictedDisplayValue.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                                   </p>
                               </div>
                               <div className="text-right">
                                   <p className="text-[10px] text-gray-500 uppercase">Exchange Rate</p>
                                   <p className="text-xs font-bold text-white">1 USD = {targetRate} {targetInfo.code}</p>
                               </div>
                           </div>
                       </div>

                       <button 
                           onClick={handleExchange}
                           disabled={isProcessing || balance < feeAmountUSD}
                           className={`w-full py-4 rounded-xl font-bold flex items-center justify-center gap-2 transition shadow-lg ${
                               balance < feeAmountUSD 
                               ? 'bg-red-500/20 text-red-400 cursor-not-allowed border border-red-500/20'
                               : 'bg-gradient-to-r from-royal-600 to-royal-500 text-white hover:shadow-royal-500/30 active:scale-[0.98]'
                           }`}
                       >
                           {isProcessing ? <Loader className="border-white" /> : balance < feeAmountUSD ? 'Insufficient Balance for Fee' : 'Confirm & Switch'}
                       </button>
                   </motion.div>
               </AnimatePresence>
           </div>
           
           {/* Background Decoration */}
           <div className="absolute -right-10 -bottom-10 opacity-5 pointer-events-none rotate-12">
               <Wallet size={200} />
           </div>
       </GlassCard>

       {/* Live Rates Ticker */}
       <div>
           <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
               <TrendingUp size={16} className="text-blue-400" /> Live Market Rates
           </h3>
           <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
               {currencies.filter(c => c.code !== 'USD').map(c => (
                   <GlassCard key={c.code} className="flex items-center justify-between py-3 px-4 bg-white/5 border-white/5 hover:bg-white/10 transition">
                       <div className="flex items-center gap-3">
                           <span className="text-2xl">{c.flag}</span>
                           <div>
                               <p className="text-xs font-bold text-white">{c.name}</p>
                               <p className="text-[10px] text-gray-500">1 USD = {c.rate} {c.code}</p>
                           </div>
                       </div>
                       <div className="text-right">
                           <div className="text-neon-green text-xs font-bold">+0.0%</div>
                           <div className="text-[9px] text-gray-600">24h Chg</div>
                       </div>
                   </GlassCard>
               ))}
           </div>
       </div>

       {/* Success Modal */}
       <AnimatePresence>
           {showSuccess && (
               <motion.div 
                   initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                   className="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm flex items-center justify-center p-4"
               >
                   <motion.div 
                       initial={{ scale: 0.5, y: 50 }} animate={{ scale: 1, y: 0 }}
                       className="bg-dark-900 border border-neon-green/30 p-8 rounded-3xl text-center max-w-xs w-full shadow-[0_0_50px_rgba(16,185,129,0.2)]"
                   >
                       <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4 text-neon-green shadow-[0_0_20px_rgba(16,185,129,0.3)]">
                           <CheckCircle2 size={40} />
                       </div>
                       <h2 className="text-2xl font-display font-bold text-white mb-2">Successful!</h2>
                       <p className="text-gray-400 text-sm mb-4">Currency switched to <strong className="text-white">{selectedTarget}</strong></p>
                       <div className="bg-white/5 p-2 rounded-lg mb-4">
                           <p className="text-xs text-gray-500">Fee Deducted</p>
                           <p className="text-sm font-mono text-red-400 font-bold">-${feeAmountUSD.toFixed(2)} USD</p>
                       </div>
                       <div className="w-full bg-gray-800 h-1 rounded-full overflow-hidden">
                           <motion.div 
                             initial={{ width: 0 }} animate={{ width: "100%" }} transition={{ duration: 2 }}
                             className="h-full bg-neon-green"
                           />
                       </div>
                       <p className="text-gray-600 text-[10px] mt-2">Redirecting to Wallet...</p>
                   </motion.div>
               </motion.div>
           )}
       </AnimatePresence>
    </div>
  );
};

export default Exchange;
