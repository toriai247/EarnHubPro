
import React, { useEffect, useState } from 'react';
import GlassCard from '../components/GlassCard';
import { ArrowLeft, Copy, UploadCloud, CheckCircle, Loader2, AlertCircle, Info } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../integrations/supabase/client';
import { PaymentMethod } from '../types';
import { motion, AnimatePresence } from 'framer-motion';

const Deposit: React.FC = () => {
  const [methods, setMethods] = useState<PaymentMethod[]>([]);
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod | null>(null);
  const [amount, setAmount] = useState('');
  const [senderNumber, setSenderNumber] = useState('');
  const [transactionId, setTransactionId] = useState('');
  const [screenshot, setScreenshot] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const navigate = useNavigate();

  useEffect(() => {
    const fetchMethods = async () => {
        const { data } = await supabase.from('payment_methods').select('*').eq('is_active', true);
        if (data) setMethods(data as PaymentMethod[]);
    };
    fetchMethods();
  }, []);

  const copyToClipboard = (text: string) => {
      navigator.clipboard.writeText(text);
      alert('Copied to clipboard!');
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files[0]) {
          if (e.target.files[0].size > 5 * 1024 * 1024) {
              alert("File size too large. Max 5MB.");
              return;
          }
          setScreenshot(e.target.files[0]);
      }
  };

  const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!selectedMethod) return;
      if (!amount || parseFloat(amount) <= 0) { alert("Invalid amount"); return; }
      if (!transactionId) { alert("Transaction ID is required"); return; }

      setLoading(true);
      try {
          const { data: { session } } = await supabase.auth.getSession();
          if (!session) throw new Error("User not authenticated");

          let screenshotUrl = '';

          // 1. Upload Screenshot (Optional but recommended)
          if (screenshot) {
              const fileExt = screenshot.name.split('.').pop();
              const fileName = `${session.user.id}/${Date.now()}.${fileExt}`;
              const { error: uploadError } = await supabase.storage
                .from('deposits')
                .upload(fileName, screenshot);

              if (uploadError) throw uploadError;
              
              const { data: urlData } = supabase.storage.from('deposits').getPublicUrl(fileName);
              screenshotUrl = urlData.publicUrl;
          }

          // 2. Create Deposit Request
          const { error: insertError } = await supabase.from('deposit_requests').insert({
              user_id: session.user.id,
              method_name: selectedMethod.name,
              amount: parseFloat(amount),
              transaction_id: transactionId,
              sender_number: senderNumber,
              screenshot_url: screenshotUrl,
              status: 'pending'
          });

          if (insertError) throw insertError;

          setStatus('success');
          setTimeout(() => navigate('/wallet'), 3500);

      } catch (e: any) {
          console.error(e);
          alert("Submission Failed: " + e.message);
          setStatus('error');
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
              <h2 className="text-3xl font-bold text-white">Deposit Submitted!</h2>
              <div className="bg-white/5 p-6 rounded-xl border border-white/10 max-w-xs mx-auto">
                  <p className="text-gray-300 text-sm">Your request has been sent to the admin team.</p>
                  <div className="my-4 h-px bg-white/10"></div>
                  <p className="text-xs text-gray-500">Average wait time: 10-30 mins</p>
              </div>
              <Link to="/wallet" className="px-8 py-3 bg-royal-600 rounded-xl text-white font-bold hover:bg-royal-700 transition">Return to Wallet</Link>
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
           <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
               <div className="bg-blue-500/10 border border-blue-500/20 p-4 rounded-xl flex items-start gap-3 text-blue-200 text-sm">
                   <Info size={20} className="shrink-0 mt-0.5" />
                   <p>Select a payment gateway below to view the account number and instructions.</p>
               </div>
               
               <div className="grid grid-cols-2 gap-4">
                   {methods.map(method => (
                       <GlassCard key={method.id} onClick={() => setSelectedMethod(method)} className="flex flex-col items-center justify-center py-8 cursor-pointer hover:border-neon-green/50 hover:bg-white/10 transition group border border-white/5">
                            {method.logo_url ? (
                                <img src={method.logo_url} alt={method.name} className="w-12 h-12 mb-3 object-contain" />
                            ) : (
                                <div className={`w-12 h-12 rounded-full flex items-center justify-center text-xl font-bold mb-3 text-white shadow-lg ${
                                    method.name.toLowerCase().includes('bkash') ? 'bg-pink-600' :
                                    method.name.toLowerCase().includes('nagad') ? 'bg-orange-600' :
                                    method.name.toLowerCase().includes('binance') ? 'bg-yellow-500 text-black' :
                                    'bg-blue-600'
                                }`}>
                                    {method.name.charAt(0)}
                                </div>
                            )}
                            <h3 className="font-bold text-white">{method.name}</h3>
                            <p className="text-[10px] text-gray-500 uppercase mt-1 group-hover:text-neon-green transition">{method.type === 'crypto' ? 'USDT / Crypto' : 'Mobile Banking'}</p>
                       </GlassCard>
                   ))}
               </div>
               {methods.length === 0 && <p className="text-center text-gray-500 py-10">No active payment methods.</p>}
           </motion.div>
       ) : (
           <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
               {/* Payment Details Card */}
               <div className="bg-gradient-to-br from-dark-900 to-royal-900/20 border border-royal-500/30 p-5 rounded-2xl relative overflow-hidden">
                   <div className="absolute top-0 right-0 p-4 opacity-10"><UploadCloud size={100} /></div>
                   <h3 className="text-sm font-bold text-royal-300 uppercase mb-2 tracking-wider">Send Money To</h3>
                   
                   <div className="flex flex-col gap-1 mb-4">
                       <span className="text-3xl font-mono font-bold text-white tracking-tight">{selectedMethod.account_number}</span>
                       <span className="text-xs text-gray-400">{selectedMethod.instruction || "Send Money (Personal)"}</span>
                   </div>
                   
                   <button onClick={() => copyToClipboard(selectedMethod.account_number)} className="w-full py-3 bg-white/10 hover:bg-white/20 rounded-xl text-white font-bold flex items-center justify-center gap-2 transition border border-white/10">
                       <Copy size={18} /> Copy Number
                   </button>
               </div>

               <form onSubmit={handleSubmit} className="space-y-5">
                   <div>
                       <label className="text-xs font-bold text-gray-400 mb-1 block uppercase">Amount sent ($)</label>
                       <input 
                         type="number" 
                         required
                         step="0.01"
                         value={amount}
                         onChange={e => setAmount(e.target.value)}
                         className="w-full bg-black/40 border border-white/10 rounded-xl p-4 text-white text-lg focus:border-neon-green outline-none transition font-mono"
                         placeholder="0.00"
                       />
                   </div>

                   <div>
                       <label className="text-xs font-bold text-gray-400 mb-1 block uppercase">Transaction ID (TrxID)</label>
                       <input 
                         type="text" 
                         required
                         value={transactionId}
                         onChange={e => setTransactionId(e.target.value)}
                         className="w-full bg-black/40 border border-white/10 rounded-xl p-4 text-white focus:border-neon-green outline-none transition font-mono"
                         placeholder="e.g. 9H73KD..."
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
                       <label className="text-xs font-bold text-gray-400 mb-2 block uppercase">Payment Screenshot</label>
                       <div className="border-2 border-dashed border-white/10 rounded-xl p-8 text-center cursor-pointer hover:border-neon-green/50 hover:bg-neon-green/5 transition relative group">
                           <input type="file" accept="image/*" onChange={handleFileChange} className="absolute inset-0 opacity-0 cursor-pointer z-10" />
                           <div className="flex flex-col items-center gap-2 group-hover:scale-105 transition">
                               <UploadCloud className={`mb-1 ${screenshot ? 'text-neon-green' : 'text-gray-500'}`} size={32} />
                               {screenshot ? (
                                   <p className="text-neon-green font-bold text-sm">{screenshot.name}</p>
                               ) : (
                                   <>
                                     <p className="text-white font-bold text-sm">Click to upload proof</p>
                                     <p className="text-[10px] text-gray-500">Max 5MB (JPG/PNG)</p>
                                   </>
                               )}
                           </div>
                       </div>
                   </div>

                   <div className="pt-4 flex gap-3">
                       <button type="button" onClick={() => setSelectedMethod(null)} className="px-6 py-4 bg-white/5 text-gray-400 font-bold rounded-xl hover:bg-white/10 transition">Back</button>
                       <button type="submit" disabled={loading} className="flex-1 py-4 bg-neon-green text-black font-bold rounded-xl hover:bg-emerald-400 flex items-center justify-center gap-2 shadow-lg shadow-neon-green/20 transition transform active:scale-[0.98]">
                           {loading ? <Loader2 className="animate-spin" size={20} /> : 'Confirm Payment'}
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
