
import React, { useEffect, useState } from 'react';
import GlassCard from '../components/GlassCard';
import { ArrowLeft, ArrowRightLeft, Wallet, ChevronDown, ArrowDown, AlertCircle, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import { supabase } from '../integrations/supabase/client';
import { WalletData } from '../types';
import Loader from '../components/Loader';
import { useUI } from '../context/UIContext';
import { motion, AnimatePresence } from 'framer-motion';
import BalanceDisplay from '../components/BalanceDisplay';

const Transfer: React.FC = () => {
  const { toast, confirm, alert } = useUI();
  const [wallet, setWallet] = useState<WalletData | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [amount, setAmount] = useState('');
  const [fromWallet, setFromWallet] = useState('game');
  const [toWallet, setToWallet] = useState('main');
  
  const [selectorOpen, setSelectorOpen] = useState(false);
  const [selectorType, setSelectorType] = useState<'from' | 'to'>('from');

  const wallets = [
      { id: 'main', label: 'Main Wallet', icon: Wallet, color: 'text-white', bg: 'bg-white/10', desc: 'Withdrawable' },
      { id: 'deposit', label: 'Deposit Wallet', icon: ArrowRightLeft, color: 'text-blue-400', bg: 'bg-blue-500/10', desc: 'Invest/Game Only' },
      { id: 'game', label: 'Game Wallet', icon: ArrowRightLeft, color: 'text-purple-400', bg: 'bg-purple-500/10', desc: 'Winnings' },
      { id: 'earning', label: 'Task/Earn Wallet', icon: ArrowRightLeft, color: 'text-yellow-400', bg: 'bg-yellow-500/10', desc: 'Rewards' },
      { id: 'investment', label: 'Invest Wallet', icon: ArrowRightLeft, color: 'text-green-400', bg: 'bg-green-500/10', desc: 'Capital' },
      { id: 'referral', label: 'Referral Wallet', icon: ArrowRightLeft, color: 'text-pink-400', bg: 'bg-pink-500/10', desc: 'Commissions' },
      { id: 'bonus', label: 'Bonus Wallet', icon: ArrowRightLeft, color: 'text-cyan-400', bg: 'bg-cyan-500/10', desc: 'Game Only' },
  ];

  const getAllowedDestinations = (sourceId: string) => {
      switch (sourceId) {
          case 'deposit': return ['game', 'investment'];
          case 'bonus': return [];
          case 'game': return ['main'];
          case 'earning': return ['main'];
          case 'referral': return ['main'];
          case 'commission': return ['main'];
          case 'investment': return ['main'];
          case 'main': return ['game', 'investment'];
          default: return [];
      }
  };

  useEffect(() => {
    const fetchWallet = async () => {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
            const { data } = await supabase.from('wallets').select('*').eq('user_id', session.user.id).single();
            if (data) setWallet(data as WalletData);
        }
        setLoading(false);
    };
    fetchWallet();
  }, []);

  const getBalance = (type: string) => {
      if (!wallet) return 0;
      switch(type) {
          case 'main': return wallet.main_balance || 0;
          case 'deposit': return wallet.deposit_balance || 0;
          case 'game': return wallet.game_balance || 0;
          case 'earning': return wallet.earning_balance || 0;
          case 'investment': return wallet.investment_balance || 0;
          case 'referral': return wallet.referral_balance || 0;
          case 'commission': return wallet.commission_balance || 0;
          case 'bonus': return wallet.bonus_balance || 0;
          default: return 0;
      }
  };

  const handleTransfer = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!wallet) return;
      
      const val = parseFloat(amount);
      if (isNaN(val) || val <= 0) { toast.error("Invalid amount"); return; }
      if (!toWallet) { await alert("Invalid destination for this wallet."); return; }
      
      const available = getBalance(fromWallet);
      if (val > available) { 
          await alert("Insufficient funds."); 
          return; 
      }

      if (!await confirm(`Transfer ${val} from ${wallets.find(w => w.id === fromWallet)?.label} to ${wallets.find(w => w.id === toWallet)?.label}?`)) return;

      setProcessing(true);
      try {
          const { data: { session } } = await supabase.auth.getSession();
          if (!session) throw new Error("No session");

          const { data, error } = await supabase.rpc('transfer_wallet_funds', {
              p_user_id: session.user.id,
              p_from_type: fromWallet,
              p_to_type: toWallet,
              p_amount: val
          });

          if (error) throw error;
          if (data && !data.success) throw new Error(data.message);

          toast.success("Transfer Successful!");
          setAmount('');
          
          // Refresh Wallet
          const { data: w } = await supabase.from('wallets').select('*').eq('user_id', session.user.id).single();
          setWallet(w as WalletData);
          window.dispatchEvent(new Event('wallet_updated'));

      } catch (e: any) {
          await alert(e.message || "Transfer Failed");
      } finally {
          setProcessing(false);
      }
  };

  const fromWalletData = wallets.find(w => w.id === fromWallet);
  const toWalletData = wallets.find(w => w.id === toWallet);
  const allowedDests = getAllowedDestinations(fromWallet);

  if (loading) return <div className="min-h-screen flex items-center justify-center"><Loader /></div>;

  return (
    <div className="pb-24 sm:pl-20 sm:pt-6 space-y-6 px-4 sm:px-0">
        <header className="flex items-center gap-3 pt-4">
           <Link to="/wallet" className="p-2 bg-white/10 rounded-xl hover:bg-white/20 transition text-white"><ArrowLeft size={20} /></Link>
           <h1 className="text-2xl font-display font-bold text-white">Transfer Funds</h1>
        </header>

        <div className="max-w-xl mx-auto">
            {/* Visual Transfer Flow */}
            <div className="bg-dark-900/80 backdrop-blur-xl rounded-[20px] p-5 space-y-4 border border-white/10">
                <div onClick={() => { setSelectorType('from'); setSelectorOpen(true); }} className="bg-white/5 border border-white/5 hover:bg-white/10 transition rounded-2xl p-4 cursor-pointer flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${fromWalletData?.bg} ${fromWalletData?.color}`}>
                            {fromWalletData && <fromWalletData.icon size={20} />}
                        </div>
                        <div>
                            <p className="text-xs text-gray-400 font-bold uppercase mb-0.5">From</p>
                            <p className="text-white font-bold">{fromWalletData?.label}</p>
                        </div>
                    </div>
                    <div className="text-right">
                        <p className="text-xs text-gray-400 mb-0.5">Balance</p>
                        <p className={`font-mono font-bold ${fromWalletData?.color}`}><BalanceDisplay amount={getBalance(fromWallet)} /></p>
                    </div>
                </div>

                <div className="flex justify-center -my-2 relative z-10">
                    <div className="w-8 h-8 bg-dark-900 border border-white/20 rounded-full flex items-center justify-center shadow-lg text-white"><ArrowDown size={16} /></div>
                </div>

                <div onClick={() => allowedDests.length > 0 && (setSelectorType('to'), setSelectorOpen(true))} className={`bg-white/5 border border-white/5 transition rounded-2xl p-4 flex justify-between items-center ${allowedDests.length > 0 ? 'cursor-pointer hover:bg-white/10' : 'opacity-50 cursor-not-allowed'}`}>
                    <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${toWalletData?.bg} ${toWalletData?.color}`}>
                            {toWalletData && <toWalletData.icon size={20} />}
                        </div>
                        <div>
                            <p className="text-xs text-gray-400 font-bold uppercase mb-0.5">To</p>
                            <p className="text-white font-bold">{toWalletData ? toWalletData.label : 'Select Wallet'}</p>
                        </div>
                    </div>
                    {toWalletData && (
                        <div className="text-right">
                            <p className="text-xs text-gray-400 mb-0.5">Balance</p>
                            <p className={`font-mono font-bold ${toWalletData?.color}`}><BalanceDisplay amount={getBalance(toWallet)} /></p>
                        </div>
                    )}
                </div>
            </div>

            {/* Amount Input */}
            <GlassCard className="mt-4 p-6">
                <div className="relative mb-6">
                    <input 
                        type="number" 
                        value={amount}
                        onChange={e => setAmount(e.target.value)}
                        className="w-full bg-transparent text-4xl font-bold text-white text-center focus:outline-none placeholder-gray-700 font-display"
                        placeholder="0.00"
                    />
                </div>

                <div className="flex gap-2 mb-6">
                    {[25, 50, 75, 100].map(pct => (
                        <button key={pct} onClick={() => setAmount(((getBalance(fromWallet) * pct) / 100).toFixed(2))} className="flex-1 py-2 bg-white/5 hover:bg-white/10 rounded-lg text-xs font-bold text-gray-300 hover:text-white transition border border-white/5">{pct === 100 ? 'MAX' : `${pct}%`}</button>
                    ))}
                </div>

                <button 
                    onClick={handleTransfer}
                    disabled={processing || allowedDests.length === 0}
                    className="w-full py-4 bg-gradient-to-r from-blue-600 to-blue-500 text-white font-bold rounded-xl hover:shadow-lg transition flex items-center justify-center gap-2 disabled:opacity-50"
                >
                    {processing ? <Loader size={20} className="text-white"/> : <><ArrowRightLeft size={20} /> Transfer Funds</>}
                </button>
            </GlassCard>

            <div className="flex items-start gap-2 bg-yellow-500/5 p-4 mt-4 rounded-xl border border-yellow-500/10">
                <AlertCircle size={18} className="text-yellow-500 shrink-0 mt-0.5" />
                <div className="text-xs text-gray-400">
                    {fromWallet === 'bonus' ? "Bonus funds cannot be transferred directly." : 
                     fromWallet === 'deposit' ? "Deposit funds can only be moved to Game or Investment wallets." : 
                     "Funds moved to Main Wallet can be withdrawn."}
                </div>
            </div>
        </div>

        {/* Modal */}
        <AnimatePresence>
            {selectorOpen && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-4" onClick={() => setSelectorOpen(false)}>
                    <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} className="bg-dark-900 w-full max-w-md rounded-t-3xl sm:rounded-3xl border border-white/10 p-6 max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-xl font-bold text-white">Select Wallet</h3>
                            <button onClick={() => setSelectorOpen(false)}><X size={20} className="text-gray-500"/></button>
                        </div>
                        <div className="space-y-2">
                            {wallets.map(w => {
                                const isAllowed = selectorType === 'to' ? allowedDests.includes(w.id) : true;
                                if (!isAllowed) return null;
                                return (
                                    <button key={w.id} onClick={() => {
                                        if(selectorType === 'from') {
                                            setFromWallet(w.id);
                                            const valid = getAllowedDestinations(w.id);
                                            setToWallet(valid.length > 0 ? valid[0] : '');
                                        } else setToWallet(w.id);
                                        setSelectorOpen(false);
                                    }} className={`w-full flex items-center gap-3 p-3 rounded-xl border transition ${ (selectorType === 'from' ? fromWallet : toWallet) === w.id ? 'bg-blue-600/20 border-blue-500/50' : 'bg-white/5 border-white/5' }`}>
                                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${w.bg} ${w.color}`}><w.icon size={20} /></div>
                                        <div className="flex-1 text-left"><p className="text-sm font-bold text-white">{w.label}</p><p className="text-[10px] text-gray-500">{w.desc}</p></div>
                                        <p className={`text-sm font-mono font-bold ${w.color}`}><BalanceDisplay amount={getBalance(w.id)} /></p>
                                    </button>
                                )
                            })}
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    </div>
  );
};

export default Transfer;
