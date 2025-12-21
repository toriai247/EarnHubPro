import React, { useEffect, useState } from 'react';
import GlassCard from '../components/GlassCard';
import { ArrowLeft, CheckCircle, Loader2, Copy, ArrowRight, X, Clock, FileText, Zap } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../integrations/supabase/client';
// Fix: Updated import path to correctly reference root types.ts from src/pages directory
import { PaymentMethod } from '../../types';
import { motion, AnimatePresence } from 'framer-motion';
import { useUI } from '../context/UIContext';
import { useCurrency } from '../context/CurrencyContext';
import { updateWallet, createTransaction } from '../lib/actions';

const Deposit: React.FC = () => {
  const { toast } = useUI();
  const { symbol } = useCurrency();
  const [methods, setMethods] = useState<PaymentMethod[]>([]);
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod | null>(null);
  const [amount, setAmount] = useState(''); 
  const [senderNumber, setSenderNumber] = useState('');
  const [transactionId, setTransactionId] = useState('');
  const [userNote, setUserNote] = useState(''); 
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<'idle' | 'success' | 'auto_approved'>('idle');
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

          // --- AUTO APPROVE LOGIC ---
          // Determine if we should auto-approve (Simulation: All deposits under 25000 get auto-approved for this feature)
          const isAutoApprove = bdtAmount < 25000; 

          const { error: insertError } = await supabase.from('deposit_requests').insert({
              user_id: session.user.id,
              method_name: selectedMethod.name,
              amount: bdtAmount, 
              transaction_id: transactionId,
              sender_number: senderNumber,
              user_note: userNote, 
              screenshot_url: null,
              status: isAutoApprove ? 'approved' : 'pending', // Auto approve or pending
              admin_note: isAutoApprove ? 'AUTO_APPROVE_CHECK' : 'Manual Deposit Request', // Special flag
              processed_at: isAutoApprove ? new Date().toISOString() : null
          });

          if (insertError) {
              if (insertError.code === '23505') throw new Error("This Transaction ID is already used.");
              throw new Error("Database error: " + insertError.message);
          }

          if (isAutoApprove) {
              // Immediately Credit User
              await updateWallet(session.user.id, bdtAmount, 'increment', 'deposit_balance');
              await createTransaction(session.user.id, 'deposit', bdtAmount, `Auto Deposit: ${selectedMethod.name}`);
              setStatus('auto_approved');
          } else {
              setStatus('success');
          }

          setTimeout(() => navigate('/wallet'), 3000);

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

  if (status === 'success' || status === 'auto_approved') {
      return (
          <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center space-y-6 animate-fade-in bg-black">
              <div className="w-24 h-24 bg-green-500/20 rounded-full flex items-center justify-center mb-4 shadow-[0_0_50px_rgba(34,197,94,0.3)]">
                  <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring' }}>
                      {status === 'auto_approved' ? <Zap size={48} className="text-yellow-400" fill="currentColor" /> : <CheckCircle size={48} className="text-green-500" />}
                  </motion.div>
              </div>
              <h2 className="text-3xl font-bold text-white">
                  {status === 'auto_approved' ? 'Instant Success!' : 'Deposit Queued'}
              </h2>
              <p className="text-gray-400 text-sm max-w-xs mx-auto">
                  {status === 'auto_approved' 
                    ? "Your deposit has been automatically approved and added to your balance." 
                    : "Your funds will be added automatically once the admin verifies your Transaction ID."}
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

               {/* 2. INFO & TIMERS */}
               <div className="flex gap-2">
                   <div className="flex-1 bg-green-900/10 border border-green-500/20 p-3 rounded-xl flex items-center gap-3">
                       <div className="bg-green-500/20 p-2 rounded-full text-green-400"><Clock size={16}/></div>
                       <div>
                           <p className="text-[9px] text-green-200 font-bold uppercase">Approval</p>
                           <p className="text-green-400 font-bold text-xs">Instant / 5m</p>
                       </div>
                   </div>
                   <div className="flex-1 bg-red-900/10 border border-red-500/20 p-3 rounded-xl flex items-center gap-3">
                       <div className="bg-red-500/20 p-2 rounded-full text-red-400"><Zap size={16}/></div>
                       <div>
                           <p className="text-[9px] text-red-200 font-bold uppercase">System</p>
                           <p className="text-red-400 font-bold text-xs">Auto-Verify</p>
                       </div>
                   </div>
               </div>

               {/* 3. INPUT FORM */}
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

                       {/* User Note Field */}
                       <div className="bg-[#111] border border-white/10 rounded-2xl p-4">
                           <label className="text-xs text-gray-500 font-bold mb-1 block uppercase flex items-center gap-1">
                               <FileText size={12}/> Additional Note / Remarks
                           </label>
                           <textarea 
                             value={userNote}
                             onChange={e => setUserNote(e.target.value)}
                             className="w-full bg-transparent border-b border-white/10 py-2 text-white text-sm focus:border-white focus:outline-none placeholder-gray-700 resize-none h-16"
                             placeholder="Enter any other details (Optional)"
                           />
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