
import React, { useEffect, useState } from 'react';
import GlassCard from '../components/GlassCard';
import { ArrowLeft, UploadCloud, CheckCircle, Loader2, Calculator, ShieldCheck } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../integrations/supabase/client';
import { PaymentMethod } from '../types';
import { motion, AnimatePresence } from 'framer-motion';
import { useUI } from '../context/UIContext';
import { useCurrency } from '../context/CurrencyContext';

const Deposit: React.FC = () => {
  const { toast } = useUI();
  const { symbol } = useCurrency();
  const [methods, setMethods] = useState<PaymentMethod[]>([]);
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod | null>(null);
  const [amount, setAmount] = useState(''); 
  const [senderNumber, setSenderNumber] = useState('');
  const [transactionId, setTransactionId] = useState('');
  const [screenshot, setScreenshot] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<'idle' | 'success'>('idle');
  const navigate = useNavigate();

  useEffect(() => {
    const fetchMethods = async () => {
        const { data } = await supabase.from('payment_methods').select('*').eq('is_active', true);
        if (data) setMethods(data as PaymentMethod[]);
    };
    fetchMethods();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!selectedMethod) return;
      if (!amount || parseFloat(amount) <= 0) { toast.error("Invalid amount"); return; }
      if (!transactionId) { toast.error("Transaction ID is required"); return; }
      
      const bdtAmount = parseFloat(amount);

      setLoading(true);

      try {
          const { data: { session } } = await supabase.auth.getSession();
          if (!session) throw new Error("User not authenticated");

          let screenshotUrl = null;

          if (screenshot) {
              const fileExt = screenshot.name.split('.').pop();
              const fileName = `${session.user.id}/${Date.now()}.${fileExt}`;
              const { error: uploadError } = await supabase.storage.from('deposits').upload(fileName, screenshot);
              
              if (!uploadError) {
                  const { data: urlData } = supabase.storage.from('deposits').getPublicUrl(fileName);
                  screenshotUrl = urlData.publicUrl;
              }
          }

          const { error: insertError } = await supabase.from('deposit_requests').insert({
              user_id: session.user.id,
              method_name: selectedMethod.name,
              amount: bdtAmount, // Store directly as BDT
              transaction_id: transactionId,
              sender_number: senderNumber,
              screenshot_url: screenshotUrl,
              status: 'pending',
              admin_note: 'Manual Deposit Request',
              processed_at: null
          });

          if (insertError) throw insertError;

          toast.success("Deposit Request Submitted!");
          setStatus('success');
          
          setTimeout(() => navigate('/wallet'), 2000);

      } catch (e: any) {
          toast.error("Submission Failed: " + e.message);
      } finally {
          setLoading(false);
      }
  };

  if (status === 'success') {
      return (
          <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center space-y-6 animate-fade-in">
              <div className="w-24 h-24 bg-green-500/20 rounded-full flex items-center justify-center mb-4 shadow-[0_0_30px_rgba(34,197,94,0.4)]">
                  <CheckCircle size={48} className="text-green-500" />
              </div>
              <h2 className="text-3xl font-bold text-white">Request Sent</h2>
              <div className="bg-white/5 p-6 rounded-xl border border-white/10 max-w-xs mx-auto">
                  <p className="text-gray-300 text-sm">
                      Your deposit request has been submitted for review. Please allow up to 30 minutes for processing.
                  </p>
              </div>
              <Link to="/wallet" className="px-8 py-3 bg-white text-black font-bold rounded-xl">Return to Wallet</Link>
          </div>
      );
  }

  return (
    <div className="pb-24 sm:pl-20 sm:pt-6 space-y-6 px-4 sm:px-0">
       <header className="flex items-center gap-3 pt-4">
           <Link to="/wallet" className="p-2 bg-white/10 rounded-xl hover:bg-white/20 transition text-white">
              <ArrowLeft size={20} />
           </Link>
           <h1 className="text-2xl font-display font-bold text-white">Deposit Funds</h1>
       </header>

       <AnimatePresence mode="wait">
       {!selectedMethod ? (
           <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
               <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider">Select Method</h3>
               <div className="grid grid-cols-2 gap-4">
                   {methods.map(method => (
                       <GlassCard key={method.id} onClick={() => setSelectedMethod(method)} className="flex flex-col items-center justify-center py-8 cursor-pointer hover:border-neon-green/50 hover:bg-white/10 transition border border-white/5">
                            <div className="w-12 h-12 rounded-full flex items-center justify-center text-xl font-bold mb-3 text-white bg-blue-600 shadow-lg">
                                {method.name.charAt(0)}
                            </div>
                            <h3 className="font-bold text-white">{method.name}</h3>
                            <p className="text-[10px] text-gray-500 uppercase mt-1">{method.type === 'crypto' ? 'Crypto' : 'Mobile Banking'}</p>
                       </GlassCard>
                   ))}
               </div>
           </motion.div>
       ) : (
           <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="space-y-6">
               
               {/* PAYMENT INFO */}
               <div className="bg-black/30 p-5 rounded-2xl border border-white/10 text-center relative overflow-hidden">
                   <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-neon-green via-white to-neon-green animate-shimmer"></div>
                   <p className="text-xs text-gray-400 uppercase mb-2">Send Money To</p>
                   <p className="text-2xl font-mono font-bold text-white tracking-widest select-all bg-white/5 py-2 rounded-lg mb-2">
                       {selectedMethod.account_number}
                   </p>
                   <p className="text-xs text-gray-500">{selectedMethod.instruction}</p>
               </div>

               <form onSubmit={handleSubmit} className="space-y-5">
                   {/* Amount Input */}
                   <div className="bg-blue-900/10 border border-blue-500/30 rounded-2xl p-5">
                       <label className="text-xs text-gray-400 font-bold mb-1 block uppercase">Enter Amount (BDT)</label>
                       <div className="relative">
                           <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white font-bold">৳</span>
                           <input 
                             type="number" 
                             value={amount}
                             onChange={e => setAmount(e.target.value)}
                             className="w-full bg-black/40 border border-white/10 rounded-xl pl-8 pr-4 py-3 text-white font-mono font-bold text-xl focus:border-neon-green outline-none"
                             placeholder="500"
                           />
                       </div>
                       <p className="text-[10px] text-gray-500 mt-2 italic">
                           * Ensure you send exactly ৳{amount || '0'}
                       </p>
                   </div>

                   <div>
                       <label className="text-xs font-bold text-gray-400 mb-1 block uppercase">Transaction ID</label>
                       <input 
                         type="text" 
                         required
                         value={transactionId}
                         onChange={e => setTransactionId(e.target.value)}
                         className="w-full bg-black/40 border border-white/10 rounded-xl p-4 text-white focus:border-neon-green outline-none transition font-mono"
                         placeholder="TrxID"
                       />
                   </div>
                   
                   {selectedMethod.type !== 'crypto' && (
                       <div>
                           <label className="text-xs font-bold text-gray-400 mb-1 block uppercase">Sender Number</label>
                           <input 
                             type="text" 
                             required
                             value={senderNumber}
                             onChange={e => setSenderNumber(e.target.value)}
                             className="w-full bg-black/40 border border-white/10 rounded-xl p-4 text-white focus:border-neon-green outline-none transition font-mono"
                             placeholder="017..."
                           />
                       </div>
                   )}

                   <div>
                       <label className="text-xs font-bold text-gray-400 mb-2 block uppercase flex items-center gap-2">
                           <ShieldCheck size={14} className="text-neon-green"/> Proof Screenshot (Optional)
                       </label>
                       <div className="border-2 border-dashed border-white/10 rounded-xl p-6 text-center cursor-pointer hover:border-white/20 transition relative">
                           <input type="file" accept="image/*" onChange={e => e.target.files && setScreenshot(e.target.files[0])} className="absolute inset-0 opacity-0 cursor-pointer" />
                           <UploadCloud className="mx-auto text-gray-500 mb-2" />
                           <p className="text-xs text-gray-400">{screenshot ? screenshot.name : 'Tap to upload payment proof'}</p>
                       </div>
                   </div>

                   <div className="pt-4 flex gap-3">
                       <button type="button" onClick={() => setSelectedMethod(null)} className="px-6 py-4 bg-white/5 text-gray-400 font-bold rounded-xl hover:bg-white/10 transition">Cancel</button>
                       <button type="submit" disabled={loading} className="flex-1 py-4 bg-neon-green text-black font-bold rounded-xl hover:bg-emerald-400 flex items-center justify-center gap-2 shadow-lg shadow-neon-green/20">
                           {loading ? <Loader2 className="animate-spin" size={20} /> : 'Submit for Review'}
                       </button>
                   </div>
               </form>
           </motion.div>
       )}
       </AnimatePresence>
    </div>
  );
};

export default Deposit;
