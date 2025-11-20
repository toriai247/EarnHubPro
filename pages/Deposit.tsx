
import React, { useEffect, useState } from 'react';
import GlassCard from '../components/GlassCard';
import { ArrowLeft, Copy, UploadCloud, CheckCircle, Loader2, AlertCircle } from 'lucide-react';
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
      alert('Number copied to clipboard');
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files[0]) {
          setScreenshot(e.target.files[0]);
      }
  };

  const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!selectedMethod) return;

      setLoading(true);
      try {
          const { data: { session } } = await supabase.auth.getSession();
          if (!session) throw new Error("User not found");

          let screenshotUrl = '';

          // 1. Upload Screenshot if exists
          if (screenshot) {
              const fileExt = screenshot.name.split('.').pop();
              const fileName = `${session.user.id}/${Date.now()}.${fileExt}`;
              const { error: uploadError, data } = await supabase.storage
                .from('deposits')
                .upload(fileName, screenshot);

              if (uploadError) throw uploadError;
              
              // Get Public URL
              const { data: { publicUrl } } = supabase.storage.from('deposits').getPublicUrl(fileName);
              screenshotUrl = publicUrl;
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
          setTimeout(() => navigate('/wallet'), 3000);

      } catch (e: any) {
          console.error(e);
          alert("Error submitting deposit: " + e.message);
          setStatus('error');
      } finally {
          setLoading(false);
      }
  };

  if (status === 'success') {
      return (
          <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center space-y-6 animate-fade-in">
              <div className="w-24 h-24 bg-green-500/20 rounded-full flex items-center justify-center mb-4">
                  <CheckCircle size={48} className="text-green-500" />
              </div>
              <h2 className="text-3xl font-bold text-white">Deposit Submitted!</h2>
              <p className="text-gray-400 max-w-xs mx-auto">Your request has been sent for admin approval. Funds will be added to your wallet shortly.</p>
              <Link to="/wallet" className="px-6 py-3 bg-white/10 rounded-xl text-white font-bold">Return to Wallet</Link>
          </div>
      );
  }

  return (
    <div className="pb-24 sm:pl-20 sm:pt-6 space-y-6 px-4 sm:px-0">
       <header className="flex items-center gap-3 pt-4">
           <Link to="/wallet" className="p-2 bg-white/10 rounded-xl hover:bg-white/20 transition text-white">
              <ArrowLeft size={20} />
           </Link>
           <h1 className="text-2xl font-display font-bold text-white">Add Funds</h1>
       </header>

       <AnimatePresence mode="wait">
       {!selectedMethod ? (
           <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
               <p className="text-gray-400 text-sm">Select a payment method to proceed:</p>
               <div className="grid grid-cols-2 gap-4">
                   {methods.map(method => (
                       <GlassCard key={method.id} onClick={() => setSelectedMethod(method)} className="flex flex-col items-center justify-center py-8 cursor-pointer hover:border-neon-green/50 hover:bg-white/5 transition group">
                            {method.logo_url ? (
                                <img src={method.logo_url} alt={method.name} className="w-12 h-12 mb-3 object-contain" />
                            ) : (
                                <div className={`w-12 h-12 rounded-full flex items-center justify-center text-xl font-bold mb-3 text-white ${
                                    method.name.toLowerCase().includes('bkash') ? 'bg-pink-600' :
                                    method.name.toLowerCase().includes('nagad') ? 'bg-orange-600' :
                                    method.name.toLowerCase().includes('binance') ? 'bg-yellow-500 text-black' :
                                    'bg-blue-600'
                                }`}>
                                    {method.name.charAt(0)}
                                </div>
                            )}
                            <h3 className="font-bold text-white">{method.name}</h3>
                            <p className="text-[10px] text-gray-500 uppercase mt-1 group-hover:text-neon-green transition">{method.type === 'crypto' ? 'Auto' : 'Manual'}</p>
                       </GlassCard>
                   ))}
               </div>
               {methods.length === 0 && <p className="text-center text-gray-500 py-10">No payment methods available.</p>}
           </motion.div>
       ) : (
           <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
               <div className="bg-royal-900/20 border border-royal-500/30 p-4 rounded-xl">
                   <h3 className="text-sm font-bold text-gray-400 uppercase mb-2">Payment Instructions</h3>
                   <p className="text-white text-sm mb-4">{selectedMethod.instruction}</p>
                   
                   <div className="bg-black/30 p-3 rounded-lg flex justify-between items-center border border-white/10">
                       <div className="overflow-hidden">
                           <p className="text-[10px] text-gray-500">Send to this {selectedMethod.type === 'crypto' ? 'Address' : 'Number'}</p>
                           <p className="text-lg font-mono font-bold text-neon-green truncate">{selectedMethod.account_number}</p>
                       </div>
                       <button onClick={() => copyToClipboard(selectedMethod.account_number)} className="p-2 bg-white/10 rounded hover:bg-white/20 text-white">
                           <Copy size={18} />
                       </button>
                   </div>
               </div>

               <form onSubmit={handleSubmit} className="space-y-4">
                   <div>
                       <label className="text-xs font-bold text-gray-400 mb-1 block">Amount (USD)</label>
                       <input 
                         type="number" 
                         required
                         value={amount}
                         onChange={e => setAmount(e.target.value)}
                         className="w-full bg-black/30 border border-white/10 rounded-xl p-4 text-white text-lg focus:border-neon-green outline-none transition"
                         placeholder="e.g. 50"
                       />
                   </div>

                   <div>
                       <label className="text-xs font-bold text-gray-400 mb-1 block">Transaction ID (TrxID)</label>
                       <input 
                         type="text" 
                         required
                         value={transactionId}
                         onChange={e => setTransactionId(e.target.value)}
                         className="w-full bg-black/30 border border-white/10 rounded-xl p-4 text-white focus:border-neon-green outline-none transition"
                         placeholder="Enter transaction ID"
                       />
                   </div>
                   
                   {selectedMethod.type !== 'crypto' && (
                       <div>
                           <label className="text-xs font-bold text-gray-400 mb-1 block">Sender Number</label>
                           <input 
                             type="text" 
                             required
                             value={senderNumber}
                             onChange={e => setSenderNumber(e.target.value)}
                             className="w-full bg-black/30 border border-white/10 rounded-xl p-4 text-white focus:border-neon-green outline-none transition"
                             placeholder="Number you sent from"
                           />
                       </div>
                   )}

                   <div>
                       <label className="text-xs font-bold text-gray-400 mb-1 block">Proof Screenshot</label>
                       <div className="border-2 border-dashed border-white/10 rounded-xl p-6 text-center cursor-pointer hover:border-neon-green/50 transition relative">
                           <input type="file" accept="image/*" onChange={handleFileChange} className="absolute inset-0 opacity-0 cursor-pointer" />
                           <UploadCloud className="mx-auto text-gray-500 mb-2" size={24} />
                           {screenshot ? (
                               <p className="text-neon-green font-bold text-sm">{screenshot.name}</p>
                           ) : (
                               <p className="text-xs text-gray-500">Click to upload transaction screenshot</p>
                           )}
                       </div>
                   </div>

                   <div className="pt-4 flex gap-3">
                       <button type="button" onClick={() => setSelectedMethod(null)} className="flex-1 py-4 bg-white/5 text-gray-400 font-bold rounded-xl hover:bg-white/10">Back</button>
                       <button type="submit" disabled={loading} className="flex-1 py-4 bg-neon-green text-black font-bold rounded-xl hover:bg-emerald-400 flex items-center justify-center gap-2">
                           {loading ? <Loader2 className="animate-spin" size={20} /> : 'Submit Payment'}
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
