
import React, { useState } from 'react';
import GlassCard from '../components/GlassCard';
import { useCurrency } from '../context/CurrencyContext';
import { Globe, CheckCircle2, TrendingUp, AlertTriangle, ArrowRightLeft, RefreshCw } from 'lucide-react';
import { supabase } from '../integrations/supabase/client';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import Loader from '../components/Loader';
import { useUI } from '../context/UIContext';
import { CURRENCY_CONFIG } from '../constants';

const Exchange: React.FC = () => {
  const { toast } = useUI();
  const { currency, setCurrency, isLoading } = useCurrency();
  const [selectedTarget, setSelectedTarget] = useState<string>(currency);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const navigate = useNavigate();

  const currencies = Object.values(CURRENCY_CONFIG);

  const handleSavePreference = async () => {
      if (selectedTarget === currency) return;
      
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      setIsProcessing(true);
      // @ts-ignore
      const success = await setCurrency(selectedTarget, session.user.id);
      setIsProcessing(false);

      if (success) {
          setShowSuccess(true);
          setTimeout(() => {
              navigate('/');
          }, 2000);
      } else {
          toast.error("Failed to update currency preference.");
      }
  };

  const targetInfo = CURRENCY_CONFIG[selectedTarget as keyof typeof CURRENCY_CONFIG];
  const currentInfo = CURRENCY_CONFIG[currency as keyof typeof CURRENCY_CONFIG];

  return (
    <div className="pb-24 sm:pl-20 sm:pt-6 space-y-6 px-4 sm:px-0">
       <header className="pt-4 flex flex-col gap-1">
           <div className="flex items-center justify-between">
               <div>
                   <h1 className="text-2xl font-display font-bold text-white flex items-center gap-2">
                       <ArrowRightLeft className="text-emerald-500" size={24} /> Currency Exchange
                   </h1>
                   <p className="text-gray-400 text-xs">Switch your primary display currency.</p>
               </div>
               <div className="bg-[#111] px-3 py-1 rounded-lg border border-[#222] text-xs font-mono text-emerald-400">
                   1 USD = {targetInfo.rate} {targetInfo.code}
               </div>
           </div>
       </header>

       <GlassCard className="p-0 overflow-hidden border border-white/10 bg-[#0a0a0a]">
           {/* Current Selection Header */}
           <div className="bg-gradient-to-r from-emerald-900/20 to-blue-900/20 p-6 flex items-center justify-between border-b border-white/5">
               <div>
                   <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Current Active</p>
                   <div className="flex items-center gap-2">
                       <span className="text-2xl">{currentInfo.flag}</span>
                       <span className="text-xl font-bold text-white">{currentInfo.name}</span>
                   </div>
               </div>
               <div className="h-10 w-10 bg-white/5 rounded-full flex items-center justify-center animate-spin-slow">
                   <RefreshCw size={18} className="text-emerald-500" />
               </div>
           </div>

           <div className="p-6">
               <h3 className="text-sm font-bold text-white mb-4 uppercase tracking-wider flex items-center gap-2">
                   <Globe size={16} className="text-blue-400"/> Select Target Currency
               </h3>
               
               <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                   {currencies.map(c => (
                       <button
                           key={c.code}
                           onClick={() => setSelectedTarget(c.code)}
                           className={`relative flex flex-col items-center justify-center p-4 rounded-xl transition-all border group ${
                               selectedTarget === c.code 
                               ? 'bg-emerald-500/10 border-emerald-500 shadow-lg shadow-emerald-500/10' 
                               : 'bg-[#151515] border-[#222] text-gray-400 hover:bg-[#1a1a1a] hover:border-[#333]'
                           }`}
                       >
                           {selectedTarget === c.code && (
                               <div className="absolute top-2 right-2 text-emerald-500">
                                   <CheckCircle2 size={16} />
                               </div>
                           )}
                           <span className="text-3xl mb-2 grayscale group-hover:grayscale-0 transition-all duration-300">{c.flag}</span>
                           <span className={`text-xs font-bold ${selectedTarget === c.code ? 'text-white' : 'text-gray-400'}`}>{c.code}</span>
                           <span className="text-[9px] text-gray-500 font-mono mt-1 opacity-60">Rate: {c.rate}</span>
                       </button>
                   ))}
               </div>

               {/* Conversion Info Box */}
               <div className="mt-8 bg-[#151515] rounded-xl border border-[#222] overflow-hidden">
                   <div className="p-4 border-b border-[#222] flex justify-between items-center">
                       <span className="text-xs text-gray-400">Exchange Rate</span>
                       <span className="text-white font-bold font-mono text-sm">1 USD ≈ {targetInfo.rate} {targetInfo.code}</span>
                   </div>
                   
                   {selectedTarget !== currency && (
                       <div className="p-4 bg-yellow-500/5 flex gap-3">
                           <AlertTriangle className="text-yellow-500 shrink-0" size={18} />
                           <div>
                               <p className="text-xs font-bold text-yellow-500 uppercase mb-1">Conversion Fee Apply</p>
                               <p className="text-[11px] text-gray-400 leading-relaxed">
                                   Switching your main wallet currency involves a real-time ledger update. 
                                   A <span className="text-white font-bold">5% network fee</span> will be deducted from your total balance during this conversion.
                               </p>
                           </div>
                       </div>
                   )}
               </div>

               <button 
                   onClick={handleSavePreference}
                   disabled={isProcessing || selectedTarget === currency}
                   className={`w-full py-4 mt-6 font-bold rounded-xl transition flex items-center justify-center gap-2 ${
                       selectedTarget === currency 
                       ? 'bg-[#222] text-gray-500 cursor-not-allowed' 
                       : 'bg-white text-black hover:bg-gray-200 shadow-lg shadow-white/10'
                   }`}
               >
                   {isProcessing ? <Loader className="border-black" /> : 'Confirm Exchange'}
               </button>
           </div>
       </GlassCard>

       {/* Success Modal */}
       <AnimatePresence>
           {showSuccess && (
               <motion.div 
                   initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                   className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-md flex items-center justify-center p-4"
               >
                   <motion.div 
                       initial={{ scale: 0.5, y: 50 }} animate={{ scale: 1, y: 0 }}
                       className="bg-[#111] border border-emerald-500/30 p-8 rounded-3xl text-center max-w-xs w-full shadow-2xl relative overflow-hidden"
                   >
                       <div className="absolute inset-0 bg-emerald-500/5 animate-pulse"></div>
                       <div className="relative z-10">
                           <div className="w-20 h-20 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-4 text-emerald-500 shadow-lg shadow-emerald-500/20 border border-emerald-500/30">
                               <CheckCircle2 size={40} />
                           </div>
                           <h2 className="text-2xl font-bold text-white mb-2">Success!</h2>
                           <p className="text-gray-400 text-sm mb-4">
                               Your wallet is now denominated in <br/>
                               <strong className="text-emerald-400 text-lg">{targetInfo.name} ({selectedTarget})</strong>
                           </p>
                       </div>
                   </motion.div>
               </motion.div>
           )}
       </AnimatePresence>
    </div>
  );
};

export default Exchange;
