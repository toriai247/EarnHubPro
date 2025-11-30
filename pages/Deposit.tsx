
import React, { useEffect, useState, useRef } from 'react';
import GlassCard from '../components/GlassCard';
import { ArrowLeft, Copy, UploadCloud, CheckCircle, Loader2, Info, X, Calculator, Clock, PlayCircle, Bot, ShieldCheck } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../integrations/supabase/client';
import { PaymentMethod } from '../types';
import { motion, AnimatePresence } from 'framer-motion';
import { useUI } from '../context/UIContext';
import { useCurrency } from '../context/CurrencyContext';
import { analyzeDepositScreenshot } from '../lib/aiHelper';
import { updateWallet, createTransaction } from '../lib/actions';

const Deposit: React.FC = () => {
  const { toast } = useUI();
  const { rate, symbol, currency, amountToUSD } = useCurrency();
  const [methods, setMethods] = useState<PaymentMethod[]>([]);
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod | null>(null);
  const [amount, setAmount] = useState(''); 
  const [senderNumber, setSenderNumber] = useState('');
  const [transactionId, setTransactionId] = useState('');
  const [screenshot, setScreenshot] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [uploadState, setUploadState] = useState('');
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const navigate = useNavigate();

  // --- NEW: Time Control States ---
  const [sessionActive, setSessionActive] = useState(false);
  const [sessionStartTime, setSessionStartTime] = useState<Date | null>(null);
  const [timeLeft, setTimeLeft] = useState(600); // 10 minutes in seconds
  const timerRef = useRef<any>(null);

  useEffect(() => {
    const fetchMethods = async () => {
        const { data } = await supabase.from('payment_methods').select('*').eq('is_active', true);
        if (data) setMethods(data as PaymentMethod[]);
    };
    fetchMethods();

    return () => {
        if(timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  // Timer Logic
  useEffect(() => {
      if (sessionActive && timeLeft > 0) {
          timerRef.current = setInterval(() => {
              setTimeLeft((prev) => prev - 1);
          }, 1000);
      } else if (timeLeft === 0) {
          if(timerRef.current) clearInterval(timerRef.current);
          setSessionActive(false);
          toast.error("Session Expired. Please restart.");
          setSelectedMethod(null);
      }
      return () => { if(timerRef.current) clearInterval(timerRef.current); };
  }, [sessionActive, timeLeft]);

  const handleStartSession = () => {
      setSessionActive(true);
      setSessionStartTime(new Date());
      setTimeLeft(600); // 10 Mins
  };

  const formatTime = (seconds: number) => {
      const m = Math.floor(seconds / 60);
      const s = seconds % 60;
      return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!selectedMethod) return;
      if (!amount || parseFloat(amount) <= 0) { toast.error("Invalid amount"); return; }
      if (!transactionId) { toast.error("Transaction ID is required"); return; }
      if (!screenshot) { toast.error("Screenshot is required for auto-verification"); return; }

      // Convert Local Input to USD
      const usdAmount = amountToUSD(parseFloat(amount));

      setLoading(true);
      setUploadState('Uploading Proof...');

      try {
          const { data: { session } } = await supabase.auth.getSession();
          if (!session) throw new Error("User not authenticated");

          // 1. Upload Image
          const fileExt = screenshot.name.split('.').pop();
          const fileName = `${session.user.id}/${Date.now()}.${fileExt}`;
          const { error: uploadError } = await supabase.storage.from('deposits').upload(fileName, screenshot);
          if (uploadError) throw uploadError;
          
          const { data: urlData } = supabase.storage.from('deposits').getPublicUrl(fileName);
          const screenshotUrl = urlData.publicUrl;

          setUploadState('AI Verifying Payment...');
          
          // 2. RUN AI CHECK (THE BOT)
          // We pass the session start time to enforce the 10-minute rule
          const aiResult = await analyzeDepositScreenshot(
              screenshotUrl, 
              usdAmount, 
              transactionId, 
              selectedMethod.name,
              sessionStartTime?.toISOString()
          );

          let finalStatus: 'pending' | 'approved' | 'rejected' = 'pending';
          let adminNote = 'Auto-Analysis: ';

          if (aiResult.status === 'match') {
              finalStatus = 'approved'; // AUTO APPROVE
              adminNote += `Verified by AI Bot. Confidence: ${aiResult.confidence}%. Time Match OK.`;
          } else {
              finalStatus = aiResult.status === 'mismatch' ? 'rejected' : 'pending';
              adminNote += `AI Flag: ${aiResult.reason}. Status: ${aiResult.status}`;
          }

          // 3. Insert Record
          const { error: insertError } = await supabase.from('deposit_requests').insert({
              user_id: session.user.id,
              method_name: selectedMethod.name,
              amount: usdAmount,
              transaction_id: transactionId,
              sender_number: senderNumber,
              screenshot_url: screenshotUrl,
              status: finalStatus,
              admin_note: adminNote,
              // Store time metadata if needed for audit
              processed_at: finalStatus !== 'pending' ? new Date().toISOString() : null
          });

          if (insertError) throw insertError;

          // 4. If Auto-Approved, Credit Wallet Immediately
          if (finalStatus === 'approved') {
              setUploadState('Crediting Wallet...');
              await updateWallet(session.user.id, usdAmount, 'increment', 'deposit_balance');
              await createTransaction(session.user.id, 'deposit', usdAmount, `Auto-Deposit via ${selectedMethod.name}`);
              
              // Trigger Activation if needed
              // (Assuming activation logic is handled in updateWallet or separate trigger, but we can do it here too)
              // ...
              
              toast.success(`Payment Verified! $${usdAmount.toFixed(2)} Added.`);
          } else if (finalStatus === 'rejected') {
              toast.error(`Payment Rejected: ${aiResult.reason}`);
          } else {
              toast.info("Payment sent for manual review.");
          }

          setStatus('success');
          // Trigger global refresh
          window.dispatchEvent(new Event('wallet_updated'));
          setTimeout(() => navigate('/wallet'), 2500);

      } catch (e: any) {
          toast.error("Submission Failed: " + e.message);
          setStatus('error');
      } finally {
          setLoading(false);
      }
  };

  const usdPreview = amountToUSD(parseFloat(amount) || 0);

  if (status === 'success') {
      return (
          <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center space-y-6 animate-fade-in">
              <div className="w-24 h-24 bg-green-500/20 rounded-full flex items-center justify-center mb-4 shadow-[0_0_30px_rgba(34,197,94,0.4)]">
                  <CheckCircle size={48} className="text-green-500" />
              </div>
              <h2 className="text-3xl font-bold text-white">Process Complete</h2>
              <div className="bg-white/5 p-6 rounded-xl border border-white/10 max-w-xs mx-auto">
                  <p className="text-gray-300 text-sm">
                      Bot Analysis Complete. Check your wallet history for status updates.
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
               <div className="bg-blue-900/20 border border-blue-500/30 p-4 rounded-xl flex items-start gap-3">
                   <Bot size={24} className="text-blue-400 mt-1" />
                   <div>
                       <h3 className="text-white font-bold text-sm">AI Auto-Deposit Active</h3>
                       <p className="text-xs text-gray-400 mt-1">
                           Payments are verified instantly by our AI Bot. Ensure your screenshot is clear and payment is made within the 10-minute window.
                       </p>
                   </div>
               </div>
               
               <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider">Select Method</h3>
               <div className="grid grid-cols-2 gap-4">
                   {methods.map(method => (
                       <GlassCard key={method.id} onClick={() => setSelectedMethod(method)} className="flex flex-col items-center justify-center py-8 cursor-pointer hover:border-neon-green/50 hover:bg-white/10 transition border border-white/5">
                            <div className="w-12 h-12 rounded-full flex items-center justify-center text-xl font-bold mb-3 text-white bg-blue-600 shadow-lg">
                                {method.name.charAt(0)}
                            </div>
                            <h3 className="font-bold text-white">{method.name}</h3>
                            <p className="text-[10px] text-gray-500 uppercase mt-1">{method.type === 'crypto' ? 'USDT / Crypto' : 'Mobile Banking'}</p>
                       </GlassCard>
                   ))}
               </div>
           </motion.div>
       ) : !sessionActive ? (
           // START SESSION SCREEN
           <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-6 text-center py-10">
               <div className="w-20 h-20 bg-neon-green/10 rounded-full flex items-center justify-center mx-auto mb-4 border border-neon-green/30 animate-pulse">
                   <PlayCircle size={40} className="text-neon-green" />
               </div>
               <div>
                   <h2 className="text-2xl font-bold text-white mb-2">Start Payment Session</h2>
                   <p className="text-gray-400 text-sm max-w-xs mx-auto">
                       You will have <span className="text-white font-bold">10 minutes</span> to complete the payment. The AI will reject any transaction made outside this window.
                   </p>
               </div>
               <button 
                   onClick={handleStartSession}
                   className="px-8 py-4 bg-neon-green text-black font-black text-lg rounded-2xl hover:bg-emerald-400 transition shadow-lg shadow-neon-green/20"
               >
                   START NOW
               </button>
               <button onClick={() => setSelectedMethod(null)} className="block w-full text-gray-500 text-sm hover:text-white">Cancel</button>
           </motion.div>
       ) : (
           // ACTIVE SESSION SCREEN
           <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="space-y-6">
               
               {/* TIMER BAR */}
               <div className="sticky top-0 z-30 bg-dark-950/90 backdrop-blur-md p-2 rounded-xl border border-red-500/30 flex justify-between items-center shadow-lg">
                   <div className="flex items-center gap-2 px-2">
                       <Clock size={18} className="text-red-500 animate-pulse" />
                       <span className="text-red-500 font-mono font-bold text-lg">{formatTime(timeLeft)}</span>
                   </div>
                   <span className="text-[10px] text-gray-400 uppercase font-bold pr-2">Session Active</span>
               </div>

               {/* CONVERSION CARD */}
               <GlassCard className="bg-blue-900/10 border-blue-500/30 relative">
                   <div className="flex justify-between items-center mb-4">
                       <h3 className="text-sm font-bold text-blue-300 uppercase flex items-center gap-2">
                           <Calculator size={16}/> Payment Calculator
                       </h3>
                       <span className="text-[10px] bg-black/30 px-2 py-1 rounded text-gray-400">Rate: 1 USD = {rate} {currency}</span>
                   </div>
                   
                   <div className="grid grid-cols-2 gap-4 items-end">
                       <div>
                           <label className="text-xs text-gray-400 font-bold mb-1 block">Deposit ({currency})</label>
                           <input 
                             type="number" 
                             value={amount}
                             onChange={e => setAmount(e.target.value)}
                             className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white font-mono font-bold text-xl focus:border-neon-green outline-none"
                             placeholder="500"
                           />
                       </div>
                       <div>
                           <label className="text-xs text-neon-green font-bold mb-1 block">Credit Value (USD)</label>
                           <div className="w-full bg-neon-green/10 border border-neon-green/30 rounded-xl p-3 text-neon-green font-mono font-bold text-xl flex items-center gap-1">
                               $ {usdPreview.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                           </div>
                       </div>
                   </div>
                   <p className="text-[10px] text-gray-500 mt-2 italic">
                       * Send exactly <span className="text-white font-bold">{symbol}{parseFloat(amount || '0').toLocaleString()}</span> to the number below.
                   </p>
               </GlassCard>

               <div className="bg-black/30 p-5 rounded-2xl border border-white/10 text-center relative overflow-hidden">
                   <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-neon-green via-white to-neon-green animate-shimmer"></div>
                   <p className="text-xs text-gray-400 uppercase mb-2">Send Money To</p>
                   <p className="text-2xl font-mono font-bold text-white tracking-widest select-all bg-white/5 py-2 rounded-lg mb-2">
                       {selectedMethod.account_number}
                   </p>
                   <p className="text-xs text-gray-500">{selectedMethod.instruction}</p>
               </div>

               <form onSubmit={handleSubmit} className="space-y-5">
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
                           <ShieldCheck size={14} className="text-neon-green"/> Proof Screenshot (Required)
                       </label>
                       <div className="border-2 border-dashed border-white/10 rounded-xl p-6 text-center cursor-pointer hover:border-white/20 transition relative">
                           <input type="file" accept="image/*" onChange={e => e.target.files && setScreenshot(e.target.files[0])} className="absolute inset-0 opacity-0 cursor-pointer" required />
                           <UploadCloud className="mx-auto text-gray-500 mb-2" />
                           <p className="text-xs text-gray-400">{screenshot ? screenshot.name : 'Tap to upload payment proof'}</p>
                       </div>
                   </div>

                   <div className="pt-4 flex gap-3">
                       <button type="button" onClick={() => setSessionActive(false)} className="px-6 py-4 bg-white/5 text-gray-400 font-bold rounded-xl hover:bg-white/10 transition">Cancel</button>
                       <button type="submit" disabled={loading} className="flex-1 py-4 bg-neon-green text-black font-bold rounded-xl hover:bg-emerald-400 flex items-center justify-center gap-2 shadow-lg shadow-neon-green/20">
                           {loading ? <><Loader2 className="animate-spin" size={20} /> {uploadState}</> : 'Verify & Pay'}
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
