
import React, { useState } from 'react';
import GlassCard from '../components/GlassCard';
import { useCurrency } from '../context/CurrencyContext';
import { Globe, CheckCircle2, TrendingUp } from 'lucide-react';
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
          }, 1500);
      } else {
          toast.error("Failed to update preference");
      }
  };

  const targetInfo = CURRENCY_CONFIG[selectedTarget as keyof typeof CURRENCY_CONFIG];

  return (
    <div className="pb-24 sm:pl-20 sm:pt-6 space-y-6 px-4 sm:px-0">
       <header className="pt-4 flex flex-col gap-1">
           <h1 className="text-2xl font-display font-bold text-white flex items-center gap-2">
               <Globe className="text-emerald-500" size={24} /> Display Currency
           </h1>
           <p className="text-gray-400 text-xs">Choose how you want to see your balance. (Base: USD)</p>
       </header>

       <GlassCard className="p-6">
           <h3 className="text-sm font-bold text-white mb-4 uppercase tracking-wider">Select Currency</h3>
           <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
               {currencies.map(c => (
                   <button
                       key={c.code}
                       onClick={() => setSelectedTarget(c.code)}
                       className={`flex flex-col items-center justify-center p-4 rounded-xl transition-all border ${
                           selectedTarget === c.code 
                           ? 'bg-emerald-500/20 border-emerald-500 text-white shadow-lg shadow-emerald-500/10' 
                           : 'bg-white/5 border-white/5 text-gray-400 hover:bg-white/10'
                       }`}
                   >
                       <span className="text-3xl mb-2">{c.flag}</span>
                       <span className="text-xs font-bold">{c.name}</span>
                       <span className="text-[10px] text-gray-500 font-mono mt-1">1 USD = {c.rate} {c.symbol}</span>
                   </button>
               ))}
           </div>

           <div className="mt-8">
               <div className="bg-white/5 p-4 rounded-xl border border-white/10 flex justify-between items-center mb-6">
                   <span className="text-sm text-gray-400">Conversion Rate</span>
                   <span className="text-white font-bold font-mono">1 USD = {targetInfo.rate} {targetInfo.code}</span>
               </div>

               <button 
                   onClick={handleSavePreference}
                   disabled={isProcessing || selectedTarget === currency}
                   className="w-full py-4 bg-white text-black font-bold rounded-xl hover:bg-gray-200 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
               >
                   {isProcessing ? <Loader className="border-black" /> : 'Save Preference'}
               </button>
           </div>
       </GlassCard>

       {/* Success Modal */}
       <AnimatePresence>
           {showSuccess && (
               <motion.div 
                   initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                   className="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm flex items-center justify-center p-4"
               >
                   <motion.div 
                       initial={{ scale: 0.5, y: 50 }} animate={{ scale: 1, y: 0 }}
                       className="bg-dark-900 border border-emerald-500/30 p-8 rounded-3xl text-center max-w-xs w-full shadow-2xl"
                   >
                       <div className="w-20 h-20 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-4 text-emerald-500 shadow-lg shadow-emerald-500/20">
                           <CheckCircle2 size={40} />
                       </div>
                       <h2 className="text-2xl font-bold text-white mb-2">Updated!</h2>
                       <p className="text-gray-400 text-sm mb-4">Currency set to <strong className="text-white">{selectedTarget}</strong></p>
                   </motion.div>
               </motion.div>
           )}
       </AnimatePresence>
    </div>
  );
};

export default Exchange;
