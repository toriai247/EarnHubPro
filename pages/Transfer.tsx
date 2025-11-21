
import React, { useEffect, useState } from 'react';
import GlassCard from '../components/GlassCard';
import { ArrowLeft, ArrowRightLeft, Wallet, ChevronDown, ArrowDown, ShieldCheck, AlertCircle, CheckCircle2, X } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../integrations/supabase/client';
import { WalletData } from '../types';
import Loader from '../components/Loader';
import { useUI } from '../context/UIContext';
import { motion, AnimatePresence } from 'framer-motion';
import BalanceDisplay from '../components/BalanceDisplay';

const Transfer: React.FC = () => {
  const { toast, confirm } = useUI();
  const [wallet, setWallet] = useState<WalletData | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [amount, setAmount] = useState('');
  const [fromWallet, setFromWallet] = useState('game');
  const [toWallet, setToWallet] = useState('main');
  
  // UI State for Custom Selectors
  const [selectorOpen, setSelectorOpen] = useState(false);
  const [selectorType, setSelectorType] = useState<'from' | 'to'>('from');

  const navigate = useNavigate();

  const wallets = [
      { id: 'main', label: 'Main Wallet', icon: Wallet, color: 'text-white', bg: 'bg-white/10', desc: 'Withdrawable' },
      { id: 'deposit', label: 'Deposit Wallet', icon: ArrowRightLeft, color: 'text-blue-400', bg: 'bg-blue-500/10', desc: 'Invest/Game Only' },
      { id: 'game', label: 'Game Wallet', icon: ArrowRightLeft, color: 'text-purple-400', bg: 'bg-purple-500/10', desc: 'Winnings' },
      { id: 'earning', label: 'Task/Earn Wallet', icon: ArrowRightLeft, color: 'text-yellow-400', bg: 'bg-yellow-500/10', desc: 'Rewards' },
      { id: 'investment', label: 'Invest Wallet', icon: ArrowRightLeft, color: 'text-green-400', bg: 'bg-green-500/10', desc: 'Capital' },
      { id: 'referral', label: 'Referral Wallet', icon: ArrowRightLeft, color: 'text-pink-400', bg: 'bg-pink-500/10', desc: 'Commissions' },
      { id: 'commission', label: 'Commission Wallet', icon: ArrowRightLeft, color: 'text-orange-400', bg: 'bg-orange-500/10', desc: 'Agency' },
      { id: 'bonus', label: 'Bonus Wallet', icon: ArrowRightLeft, color: 'text-cyan-400', bg: 'bg-cyan-500/10', desc: 'Game Only' },
  ];

  // --- RULES ENGINE (Frontend Filter) ---
  const getAllowedDestinations = (sourceId: string) => {
      // Logic based on User Requirements
      switch (sourceId) {
          case 'deposit': return ['game', 'investment']; // Deposit -> Game or Invest ONLY
          case 'bonus': return []; // Bonus -> Cannot Transfer (Must Play)
          case 'game': return ['main']; // Game -> Main
          case 'earning': return ['main']; // Earning -> Main
          case 'referral': return ['main'];
          case 'commission': return ['main'];
          case 'investment': return ['main'];
          case 'main': return ['game', 'investment']; // Main -> Game (Reload) or Invest
          default: return [];
      }
  };

  useEffect(() => {
    fetchWallet();
  }, []);

  const fetchWallet = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
        const { data } = await supabase.from('wallets').select('*').eq('user_id', session.user.id).single();
        if (data) setWallet(data as WalletData);
    }
    setLoading(false);
  };

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

  const handleOpenSelector = (type: 'from' | 'to') => {
      setSelectorType(type);
      setSelectorOpen(true);
  };

  const handleSelectWallet = (id: string) => {
      if (selectorType === 'from') {
          setFromWallet(id);
          // Auto-select first valid destination
          const validDestinations = getAllowedDestinations(id);
          if (validDestinations.length > 0) {
              setToWallet(validDestinations[0]);
          } else {
              setToWallet(''); // Invalid source
          }
      } else {
          setToWallet(id);
      }
      setSelectorOpen(false);
  };

  const handleTransfer = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!wallet) return;
      
      const val = parseFloat(amount);
      if (isNaN(val) || val <= 0) { toast.error("Invalid amount"); return; }
      if (!toWallet) { toast.error("Invalid destination for this wallet."); return; }
      if (val > getBalance(fromWallet)) { toast.error("Insufficient balance in source wallet."); return; }

      const sourceLabel = wallets.find(w => w.id === fromWallet)?.label;
      const destLabel = wallets.find(w => w.id === toWallet)?.label;

      const confirmed = await confirm(
          `Transfer $${val.toFixed(2)} from ${sourceLabel} to ${destLabel}?`,
          'Confirm Transfer'
      );

      if (!confirmed) return;

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
          fetchWallet();
          window.dispatchEvent(new Event('wallet_updated'));

      } catch (e: any) {
          console.error(e);
          let msg = e.message || "Transfer Failed";
          if (msg.includes('violates check constraint') || msg.includes('transactions_type_check')) {
              msg = "System Error: Database transaction type missing. Please contact Admin.";
          }
          toast.error(msg);
      } finally {
          setProcessing(false);
      }
  };

  const fromWalletData = wallets.find(w => w.id === fromWallet);
  const toWalletData = wallets.find(w => w.id === toWallet);
  const allowedDests = getAllowedDestinations(fromWallet);

  if (loading) return <div className="min-h-screen flex items-center justify-center"><Loader /></div>;

  return (
    <div className="pb-24 sm:pl-20 sm:pt-6 space-y-6 px-4 sm:px-0 relative">
        <header className="flex items-center gap-3 pt-4">
           <Link to="/wallet" className="p-2 bg-white/10 rounded-xl hover:bg-white/20 transition text-white">
              <ArrowLeft size={20} />
           </Link>
           <h1 className="text-2xl font-display font-bold text-white">Transfer Funds</h1>
        </header>

        <div className="max-w-xl mx-auto">
            {/* Visual Transfer Flow */}
            <div className="bg-gradient-to-b from-white/5 to-white/0 p-1 rounded-3xl border border-white/10">
                <div className="bg-dark-900/80 backdrop-blur-xl rounded-[20px] p-5 space-y-4">
                    
                    {/* FROM Card */}
                    <div 
                        onClick={() => handleOpenSelector('from')}
                        className="bg-white/5 border border-white/5 hover:border-royal-500/50 hover:bg-white/10 transition rounded-2xl p-4 cursor-pointer group relative overflow-hidden"
                    >
                        <div className="flex justify-between items-center relative z-10">
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
                                <p className={`font-mono font-bold ${fromWalletData?.color}`}>
                                    $<BalanceDisplay amount={getBalance(fromWallet)} />
                                </p>
                            </div>
                        </div>
                        <ChevronDown className="absolute right-2 bottom-2 text-gray-600 group-hover:text-white transition" size={14} />
                    </div>

                    {/* Swap Indicator */}
                    <div className="flex justify-center -my-2 relative z-10">
                        <div className="w-8 h-8 bg-dark-900 border border-white/20 rounded-full flex items-center justify-center shadow-lg text-white">
                            <ArrowDown size={16} />
                        </div>
                    </div>

                    {/* TO Card */}
                    <div 
                        onClick={() => allowedDests.length > 0 && handleOpenSelector('to')}
                        className={`bg-white/5 border border-white/5 transition rounded-2xl p-4 relative overflow-hidden ${allowedDests.length > 0 ? 'cursor-pointer hover:border-green-500/50 hover:bg-white/10' : 'opacity-50 cursor-not-allowed'}`}
                    >
                        <div className="flex justify-between items-center relative z-10">
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
                                    <p className={`font-mono font-bold ${toWalletData?.color}`}>
                                        $<BalanceDisplay amount={getBalance(toWallet)} />
                                    </p>
                                </div>
                            )}
                        </div>
                        {allowedDests.length > 0 && <ChevronDown className="absolute right-2 bottom-2 text-gray-600 group-hover:text-white transition" size={14} />}
                        {allowedDests.length === 0 && <div className="absolute inset-0 flex items-center justify-center bg-black/50 text-xs font-bold text-red-400">Transfer Prohibited</div>}
                    </div>

                </div>
            </div>

            {/* Amount Input */}
            <GlassCard className="mt-4 p-6">
                <div className="flex justify-between text-xs text-gray-400 mb-3 font-bold uppercase tracking-wider">
                    <span>Enter Amount</span>
                    <span>Available: $<BalanceDisplay amount={getBalance(fromWallet)} /></span>
                </div>
                
                <div className="relative mb-6">
                    <span className="absolute left-0 top-1/2 -translate-y-1/2 text-3xl font-bold text-gray-500">$</span>
                    <input 
                        type="number" 
                        value={amount}
                        onChange={e => setAmount(e.target.value)}
                        className="w-full bg-transparent text-4xl font-bold text-white pl-8 focus:outline-none placeholder-gray-700 font-display"
                        placeholder="0.00"
                    />
                </div>

                <div className="flex gap-2 mb-6">
                    {[25, 50, 75, 100].map(pct => (
                        <button 
                            key={pct}
                            onClick={() => setAmount(((getBalance(fromWallet) * pct) / 100).toFixed(2))}
                            className="flex-1 py-2 bg-white/5 hover:bg-white/10 rounded-lg text-xs font-bold text-gray-300 hover:text-white transition border border-white/5"
                        >
                            {pct === 100 ? 'MAX' : `${pct}%`}
                        </button>
                    ))}
                </div>

                <button 
                    onClick={handleTransfer}
                    disabled={processing || allowedDests.length === 0}
                    className="w-full py-4 bg-gradient-to-r from-royal-600 to-royal-500 text-white font-bold rounded-xl hover:shadow-lg hover:shadow-royal-500/30 transition flex items-center justify-center gap-2 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {processing ? <Loader size={20} className="text-white"/> : (
                        <>
                            <ArrowRightLeft size={20} /> Transfer Funds
                        </>
                    )}
                </button>
            </GlassCard>

            {/* Info Text based on Source */}
            <div className="flex items-start gap-2 bg-yellow-500/5 p-4 mt-4 rounded-xl border border-yellow-500/10">
                <AlertCircle size={18} className="text-yellow-500 shrink-0 mt-0.5" />
                <p className="text-xs text-gray-400 leading-relaxed">
                    {fromWallet === 'deposit' && "Deposit balance cannot be withdrawn. Transfer to Game or Investment wallets to earn profit."}
                    {fromWallet === 'bonus' && "Bonus balance cannot be transferred. Use it to play games and win real money!"}
                    {fromWallet === 'game' && "Game winnings can be transferred to Main Wallet for withdrawal."}
                    {!['deposit','bonus','game'].includes(fromWallet) && "Only funds in the Main Wallet can be withdrawn."}
                </p>
            </div>
        </div>

        {/* CUSTOM WALLET SELECTOR MODAL */}
        <AnimatePresence>
            {selectorOpen && (
                <>
                    <motion.div 
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/80 z-[60] backdrop-blur-sm"
                        onClick={() => setSelectorOpen(false)}
                    />
                    <motion.div 
                        initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
                        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                        className="fixed bottom-0 left-0 right-0 bg-dark-900 z-[70] rounded-t-3xl border-t border-white/10 max-h-[80vh] overflow-hidden flex flex-col sm:max-w-md sm:mx-auto sm:bottom-auto sm:top-1/2 sm:-translate-y-1/2 sm:rounded-3xl"
                    >
                        <div className="p-5 border-b border-white/10 flex justify-between items-center shrink-0">
                            <h3 className="text-lg font-bold text-white">Select {selectorType === 'from' ? 'Source' : 'Destination'}</h3>
                            <button onClick={() => setSelectorOpen(false)} className="p-2 bg-white/5 rounded-full text-gray-400 hover:text-white">
                                <X size={18} />
                            </button>
                        </div>
                        
                        <div className="p-4 overflow-y-auto custom-scrollbar space-y-2">
                            {wallets.map(w => {
                                let isValid = true;
                                
                                if (selectorType === 'to') {
                                    isValid = allowedDests.includes(w.id);
                                }

                                const isSelected = selectorType === 'from' ? fromWallet === w.id : toWallet === w.id;

                                return (
                                    <button
                                        key={w.id}
                                        onClick={() => isValid && handleSelectWallet(w.id)}
                                        disabled={!isValid}
                                        className={`w-full flex items-center justify-between p-4 rounded-xl border transition-all ${
                                            isSelected 
                                            ? 'bg-royal-600/20 border-royal-500 ring-1 ring-royal-500' 
                                            : !isValid
                                                ? 'opacity-30 bg-transparent border-transparent cursor-not-allowed grayscale'
                                                : 'bg-white/5 border-white/5 hover:bg-white/10'
                                        }`}
                                    >
                                        <div className="flex items-center gap-4">
                                            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${w.bg} ${w.color}`}>
                                                <w.icon size={20} />
                                            </div>
                                            <div className="text-left">
                                                <p className={`font-bold text-sm ${isSelected ? 'text-white' : 'text-gray-300'}`}>{w.label}</p>
                                                <p className="text-[10px] text-gray-500 uppercase tracking-wider">{w.desc}</p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p className={`font-mono font-bold ${isSelected ? 'text-white' : w.color}`}>
                                                $<BalanceDisplay amount={getBalance(w.id)} />
                                            </p>
                                            {isSelected && <CheckCircle2 size={16} className="text-royal-400 ml-auto mt-1" />}
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    </div>
  );
};

export default Transfer;
