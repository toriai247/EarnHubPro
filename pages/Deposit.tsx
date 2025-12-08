
import React, { useEffect, useState } from 'react';
import GlassCard from '../components/GlassCard';
import { ArrowLeft, UploadCloud, CheckCircle, Loader2, Copy, ShieldCheck, ArrowRight, X } from 'lucide-react';
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
  const [copied, setCopied] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchMethods = async () => {
        const { data } = await supabase.from('payment_methods').select('*').eq('is_active', true);
        if (data) setMethods(data as PaymentMethod[]);
    };
    fetchMethods();
  }, []);

  const handleCopy = (text: string) => {
      navigator.clipboard.writeText(text);
      setCopied(true);
      toast.success("Number Copied!");
      setTimeout(() => setCopied(false), 2000);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files[0]) {
          const file = e.target.files[0];
          if (file.size > 5 * 1024 * 1024) { // 5MB Limit
              toast.error("File is too large. Max 5MB.");
              return;
          }
          setScreenshot(file);
          toast.success("Screenshot attached!");
      }
  };

  const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!selectedMethod) return;
      if (!amount || parseFloat(amount) <= 0) { toast.error("Please enter a valid amount."); return; }
      if (!transactionId || transactionId.length < 4) { toast.error("Valid Transaction ID is required."); return; }
      
      const bdtAmount = parseFloat(amount);

      setLoading(true);

      try {
          const { data: { session }, error: sessionError } = await supabase.auth.getSession();
          if (sessionError || !session) throw new Error("Session expired. Please login again.");

          let screenshotUrl = null;

          if (screenshot) {
              const fileExt = screenshot.name.split('.').pop();
              const fileName = `${session.user.id}/${Date.now()}.${fileExt}`;
              
              const { error: uploadError } = await supabase.storage.from('deposits').upload(fileName, screenshot);
              
              if (uploadError) {
                  console.error("Upload Error:", uploadError);
                  throw new Error("Failed to upload proof. Ensure image is under 5MB or try a different file.");
              }
              
              const { data: urlData } = supabase.storage.from('deposits').getPublicUrl(fileName);
              screenshotUrl = urlData.publicUrl;
          }

          const { error: insertError } = await supabase.from('deposit_requests').insert({
              user_id: session.user.id,
              method_name: selectedMethod.name,
              amount: bdtAmount, 
              transaction_id: transactionId,
              sender_number: senderNumber,
              screenshot_url: screenshotUrl,
              status: 'pending',
              admin_note: 'Manual Deposit Request',
              processed_at: null
          });

          if (insertError) {
              if (insertError.code === '23505') throw new Error("This Transaction ID is already used.");
              throw new Error("Database error: " + insertError.message);
          }

          setStatus('success');
          setTimeout(() => navigate('/wallet'), 2500);

      } catch (e: any) {
          toast.error(e.message || "Failed to submit deposit.");
      } finally {
          setLoading(false);
      }
  };

  const getMethodStyle = (name: string) => {
      const n = name.toLowerCase();
      if (n.includes('bkash')) return 'from-pink-600 to-rose-500 shadow-pink-900/20';
      if (n.includes('nagad')) return 'from-orange-600 to-red-500 shadow-orange-900/20';
      if (n.includes('rocket')) return 'from-purple-600 to-violet-500 shadow-purple-900/20';
      if (n.includes('binance') || n.includes('crypto')) return 'from-yellow-500 to-amber-600 shadow-yellow-900/20';
      return 'from-blue-600 to-indigo-600 shadow-blue-900/20';
  };

  if (status === 'success') {
      return (
          <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center space-y-6 animate-fade-in bg-black">
              <div className="w-24 h-24 bg-green-500/20 rounded-full flex items-center justify-center mb-4 shadow-[0_0_50px_rgba(34,197,94,0.3)]">
                  <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring' }}>
                      <CheckCircle size={48} className="text-green-500" />
                  </motion.div>
              </div>
              <h2 className="text-3xl font-bold text-white">Deposit Queued</h2>
              <p className="text-gray-400 text-sm max-w-xs mx-auto">
                  Your funds will be added automatically once the admin verifies your Transaction ID.
              </p>
              <Link to="/wallet" className="px-8 py-3 bg-white text-black font-bold rounded-xl hover:bg-gray-200 transition">Return to Wallet</Link>
          </div>
      );
  }

  return (
    <div className="pb-24 sm:pl-20 sm:pt-6 space-y-6 px-4 sm:px-0">
       <header className="flex items-center gap-3 pt-4">
           <Link to="/wallet" className="p-2 bg-white/5 rounded-xl hover:bg-white/10 transition text-white">
              <ArrowLeft size={20} />
           </Link>
           <h1 className="text-xl font-bold text-white tracking-wide">Add Funds</h1>
       </header>

       <AnimatePresence mode="wait">
       {!selectedMethod ? (
           <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
               <p className="text-xs font-bold text-gray-500 uppercase tracking-widest px-1">Select Gateway</p>
               <div className="grid grid-cols-1 gap-3">
                   {methods.map(method => (
                       <div 
                           key={method.id} 
                           onClick={() => setSelectedMethod(method)} 
                           className={`cursor-pointer relative overflow-hidden rounded-2xl p-6 bg-gradient-to-r ${getMethodStyle(method.name)} border border-white/10 shadow-lg hover:scale-[1.02] transition-transform`}
                       >
                            <div className="absolute top-0 right-0 -mt-4 -mr-4 w-24 h-24 bg-white/20 rounded-full blur-2xl"></div>
                            <div className="relative z-10 flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center text-xl font-black text-black shadow-lg">
                                        {method.name.charAt(0)}
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-white text-lg">{method.name}</h3>
                                        <p className="text-white/80 text-xs font-medium">{method.type === 'crypto' ? 'USDT / Crypto' : 'Personal / Agent'}</p>
                                    </div>
                                </div>
                                <div className="bg-white/20 p-2 rounded-full backdrop-blur-sm">
                                    <ArrowRight size={20} className="text-white" />
                                </div>
                            </div>
                       </div>
                   ))}
               </div>
           </motion.div>
       ) : (
           <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
               
               {/* 1. HERO COPY CARD */}
               <div className={`relative overflow-hidden rounded-3xl p-6 bg-gradient-to-br ${getMethodStyle(selectedMethod.name)} shadow-2xl`}>
                   <div className="absolute top-0 right-0 p-4 opacity-20 pointer-events-none">
                       <Copy size={100} />
                   </div>
                   
                   <div className="relative z-10 text-center">
                       <p className="text-white/80 text-xs font-bold uppercase mb-2">Send Money To</p>
                       <h2 className="text-3xl font-mono font-black text-white mb-4 tracking-wider drop-shadow-md">
                           {selectedMethod.account_number}
                       </h2>
                       <button 
                           onClick={() => handleCopy(selectedMethod.account_number)}
                           className="bg-white text-black px-6 py-2.5 rounded-full font-bold text-xs shadow-lg active:scale-95 transition flex items-center gap-2 mx-auto hover:bg-gray-100"
                       >
                           {copied ? <CheckCircle size={14} className="text-green-600"/> : <Copy size={14}/>} 
                           {copied ? 'COPIED!' : 'COPY NUMBER'}
                       </button>
                       <p className="mt-4 text-white/90 text-xs font-medium bg-black/20 inline-block px-3 py-1 rounded-lg backdrop-blur-sm">
                           {selectedMethod.instruction || "Send Money (Personal)"}
                       </p>
                   </div>
               </div>

               {/* 2. INPUT FORM */}
               <form onSubmit={handleSubmit} className="space-y-5">
                   
                   {/* Amount */}
                   <div className="bg-[#111] border border-white/10 rounded-2xl p-4">
                       <label className="text-xs text-gray-500 font-bold mb-2 block uppercase">Amount (BDT)</label>
                       <div className="relative">
                           <span className="absolute left-0 top-1/2 -translate-y-1/2 text-white font-bold text-2xl">৳</span>
                           <input 
                             type="number" 
                             value={amount}
                             onChange={e => setAmount(e.target.value)}
                             className="w-full bg-transparent border-none py-2 pl-8 text-white font-bold text-3xl focus:ring-0 placeholder-gray-700 outline-none"
                             placeholder="0.00"
                             autoFocus
                           />
                       </div>
                   </div>

                   {/* Details Grid */}
                   <div className="grid grid-cols-1 gap-4">
                       <div className="bg-[#111] border border-white/10 rounded-2xl p-4">
                           <label className="text-xs text-gray-500 font-bold mb-1 block uppercase">Transaction ID (TrxID)</label>
                           <input 
                             type="text" 
                             required
                             value={transactionId}
                             onChange={e => setTransactionId(e.target.value)}
                             className="w-full bg-transparent border-b border-white/10 py-2 text-white font-mono text-sm focus:border-white focus:outline-none placeholder-gray-700 uppercase"
                             placeholder="e.g. 9H7K..."
                           />
                       </div>

                       {selectedMethod.type !== 'crypto' && (
                           <div className="bg-[#111] border border-white/10 rounded-2xl p-4">
                               <label className="text-xs text-gray-500 font-bold mb-1 block uppercase">Sender Number</label>
                               <input 
                                 type="text" 
                                 required
                                 value={senderNumber}
                                 onChange={e => setSenderNumber(e.target.value)}
                                 className="w-full bg-transparent border-b border-white/10 py-2 text-white font-mono text-sm focus:border-white focus:outline-none placeholder-gray-700"
                                 placeholder="017..."
                               />
                           </div>
                       )}
                   </div>

                   {/* Screenshot Drop */}
                   <div className="relative">
                       <input 
                           type="file" 
                           accept="image/*" 
                           onChange={handleFileChange} 
                           className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                       />
                       <div className={`border-2 border-dashed rounded-2xl p-4 flex items-center justify-center gap-3 transition-colors ${screenshot ? 'border-green-500 bg-green-500/10' : 'border-white/10 hover:border-white/30 bg-[#111]'}`}>
                           <div className={`p-2 rounded-full ${screenshot ? 'bg-green-500 text-black' : 'bg-white/10 text-gray-400'}`}>
                               {screenshot ? <CheckCircle size={18}/> : <UploadCloud size={18}/>}
                           </div>
                           <span className={`text-xs font-bold ${screenshot ? 'text-green-400' : 'text-gray-400'}`}>
                               {screenshot ? 'Screenshot Added' : 'Upload Payment Proof (Max 5MB)'}
                           </span>
                       </div>
                   </div>

                   {/* Actions */}
                   <div className="pt-2 flex gap-3">
                       <button type="button" onClick={() => setSelectedMethod(null)} className="p-4 bg-white/5 text-gray-400 rounded-xl hover:bg-white/10 transition">
                           <X size={20} />
                       </button>
                       <button type="submit" disabled={loading} className="flex-1 py-4 bg-white text-black font-black uppercase tracking-wider rounded-xl hover:bg-gray-200 transition shadow-lg flex items-center justify-center gap-2 disabled:opacity-50">
                           {loading ? <Loader2 className="animate-spin" size={20} /> : 'Verify Payment'}
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
