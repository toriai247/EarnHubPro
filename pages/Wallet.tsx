import React, { useEffect, useState } from 'react';
import GlassCard from '../components/GlassCard';
import { 
    ArrowDownLeft, ArrowUpRight, ArrowRightLeft, RefreshCw, 
    Wallet as WalletIcon, PieChart, Send, CreditCard, Banknote, Clock, Loader2,
    Gamepad2, Briefcase, Gift, Users, Landmark, ChevronRight, Activity as ActivityIcon,
    TrendingUp, ShieldCheck, ChevronDown, Info
} from 'lucide-react';
import { WalletData, Activity } from '../types';
import { supabase } from '../integrations/supabase/client';
import { createUserProfile, syncWalletTotals } from '../lib/actions';
import { Link } from 'react-router-dom';
import BalanceDisplay from '../components/BalanceDisplay';
import { useUI } from '../context/UIContext';
import { motion, AnimatePresence } from 'framer-motion';
import GoogleAd from '../components/GoogleAd';
import Skeleton from '../components/Skeleton';

const Wallet: React.FC = () => {
  const { toast } = useUI();
  const [wallet, setWallet] = useState<WalletData | null>(null);
  const [activities, setActivities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [selectedTxId, setSelectedTxId] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
       try {
           let { data: walletData } = await supabase.from('wallets').select('*').eq('user_id', session.user.id).maybeSingle();
           if (!walletData) {
              await createUserProfile(session.user.id, session.user.email || '', 'User');
              const res = await supabase.from('wallets').select('*').eq('user_id', session.user.id).single();
              walletData = res.data;
           }
           if (walletData) {
             setWallet(walletData as WalletData);
             
             const { data: txData } = await supabase.from('transactions')
                .select('*')
                .eq('user_id', session.user.id)
                .order('created_at', {ascending: false})
                .limit(25);

             if (txData) {
                 setActivities(txData);
             }
           }
       } catch (e) {
           console.error(e);
       }
    }
    setLoading(false);
  };

  const handleSync = async () => {
      setSyncing(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
          await syncWalletTotals(session.user.id);
          toast.success("Balance Synced");
          await fetchData();
      }
      setSyncing(false);
  };

  const walletBreakdown = [
      { id: 'main', label: 'Main Wallet', amount: wallet?.main_balance || 0, icon: CreditCard, color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', desc: 'Withdrawable' },
      { id: 'deposit', label: 'Deposit Wallet', amount: wallet?.deposit_balance || 0, icon: Landmark, color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/20', desc: 'Gaming / Invest' },
      { id: 'game', label: 'Game Wallet', amount: wallet?.game_balance || 0, icon: Gamepad2, color: 'text-purple-400', bg: 'bg-purple-500/10', border: 'border-purple-500/20', desc: 'Winnings' },
      { id: 'earning', label: 'Work Earnings', amount: wallet?.earning_balance || 0, icon: Briefcase, color: 'text-yellow-400', bg: 'bg-yellow-500/10', border: 'border-yellow-500/20', desc: 'Task Rewards' },
      { id: 'bonus', label: 'Bonus Wallet', amount: wallet?.bonus_balance || 0, icon: Gift, color: 'text-pink-400', bg: 'bg-pink-500/10', border: 'border-pink-500/20', desc: 'Free Credits' }
  ];

  return (
    <div className="pb-24 sm:pl-20 sm:pt-6 space-y-6 px-4 sm:px-0 animate-fade-in">
      
      {/* Header */}
      <div className="flex justify-between items-center pt-4">
         <div>
             <h1 className="text-2xl font-display font-black text-white flex items-center gap-2">
                 <WalletIcon className="text-blue-500"/> ASSET HUB
             </h1>
             <p className="text-xs text-gray-500">Detailed financial summary and ledger.</p>
         </div>
         <button onClick={handleSync} className="p-2 bg-[#111] rounded-xl text-gray-500 hover:text-white border border-white/5 transition">
             <RefreshCw size={18} className={syncing ? 'animate-spin' : ''} />
         </button>
      </div>

      {/* Total Asset Card */}
      <GlassCard className="bg-gradient-to-br from-blue-900/40 via-black to-black border-blue-500/30 p-8 relative overflow-hidden shadow-2xl rounded-[2.5rem]">
          <div className="absolute top-0 right-0 p-6 opacity-5 pointer-events-none"><PieChart size={200} /></div>
          <div className="relative z-10">
              <div className="flex items-center gap-2 mb-2">
                  <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                  <p className="text-blue-300 text-xs font-black uppercase tracking-widest">Aggregate Value</p>
              </div>
              <h1 className="text-5xl font-black text-white tracking-tighter mb-8 font-mono">
                  <BalanceDisplay amount={wallet?.balance} loading={loading} />
              </h1>
              <div className="grid grid-cols-2 gap-3">
                 <Link to="/deposit" className="py-4 bg-white text-black font-black text-xs uppercase tracking-widest rounded-2xl flex items-center justify-center gap-2 hover:bg-gray-200 transition">
                    <ArrowDownLeft size={18} strokeWidth={3}/> Deposit
                 </Link>
                 <Link to="/withdraw" className="py-4 bg-white/5 text-white font-black text-xs uppercase tracking-widest rounded-2xl flex items-center justify-center gap-2 border border-white/10 hover:bg-white/10 transition">
                    <ArrowUpRight size={18} strokeWidth={3}/> Withdraw
                 </Link>
              </div>
          </div>
      </GlassCard>

      <GoogleAd slot="9579822529" format="auto" responsive="true" />

      {/* Wallet Distribution */}
      <div className="space-y-4">
          <h3 className="text-xs font-black text-gray-500 uppercase tracking-[0.2em] ml-1">Wallet Distribution</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {loading ? <Skeleton className="h-48 rounded-3xl" /> : walletBreakdown.map((w, idx) => (
                  <motion.div initial={{opacity:0, y:10}} animate={{opacity:1, y:0}} transition={{delay: idx*0.05}} key={w.id}>
                      <GlassCard className={`p-5 flex items-center justify-between border-none bg-[#0a0a0a] group hover:bg-[#111] transition-all rounded-3xl`}>
                          <div className="flex items-center gap-4">
                              <div className={`p-4 rounded-2xl bg-black/40 ${w.color} shadow-inner`}><w.icon size={24} /></div>
                              <div>
                                  <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1">{w.label}</p>
                                  <p className={`text-xl font-black font-mono leading-none ${w.color}`}><BalanceDisplay amount={w.amount} /></p>
                                  <p className="text-[10px] text-gray-600 mt-2">{w.desc}</p>
                              </div>
                          </div>
                      </GlassCard>
                  </motion.div>
              ))}
          </div>
      </div>

      {/* Enhanced Transaction History */}
      <div className="space-y-4 pb-12">
        <div className="flex justify-between items-center px-1">
            <h3 className="text-xs font-black text-gray-500 uppercase tracking-[0.2em]">Pure Ledger History</h3>
            <RefreshCw size={14} className="text-gray-600 hover:text-white cursor-pointer" onClick={fetchData}/>
        </div>
        
        <div className="space-y-2">
           {loading ? [1,2,3].map(i => <Skeleton key={i} className="h-16 rounded-2xl" />) : 
            activities.length === 0 ? <div className="text-center py-10 text-gray-600 text-xs uppercase font-bold">No Records Found</div> :
            activities.map((tx, idx) => (
                <motion.div 
                    key={tx.id} 
                    layout
                    onClick={() => setSelectedTxId(selectedTxId === tx.id ? null : tx.id)}
                    className="bg-[#0a0a0a] border border-white/5 rounded-2xl p-4 cursor-pointer hover:border-white/20 transition-all group"
                >
                    <div className="flex justify-between items-center">
                        <div className="flex items-center gap-4">
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xs font-bold ${
                                ['DEPOSIT', 'TASK_EARN', 'BET_WIN', 'BONUS_ADD', 'COMMISSION_ADD', 'REFUND'].includes(tx.type) ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'
                            }`}>
                                {['DEPOSIT', 'TASK_EARN', 'BET_WIN', 'BONUS_ADD', 'COMMISSION_ADD', 'REFUND'].includes(tx.type) ? <ArrowDownLeft size={20}/> : <ArrowUpRight size={20}/>}
                            </div>
                            <div className="min-w-0">
                                <p className="text-sm font-black text-white truncate">{tx.description || tx.type.replace('_', ' ')}</p>
                                <p className="text-[10px] text-gray-600 font-bold uppercase mt-1">{new Date(tx.created_at).toLocaleString([], {month:'short', day:'numeric', hour:'2-digit', minute:'2-digit'})}</p>
                            </div>
                        </div>
                        <div className="text-right">
                            <p className={`text-sm font-black font-mono ${['DEPOSIT', 'TASK_EARN', 'BET_WIN', 'BONUS_ADD', 'COMMISSION_ADD', 'REFUND'].includes(tx.type) ? 'text-green-500' : 'text-white'}`}>
                                {['DEPOSIT', 'TASK_EARN', 'BET_WIN', 'BONUS_ADD', 'COMMISSION_ADD', 'REFUND'].includes(tx.type) ? '+' : '-'}৳{tx.amount.toLocaleString()}
                            </p>
                            <ChevronDown size={14} className={`text-gray-700 ml-auto mt-1 transition-transform ${selectedTxId === tx.id ? 'rotate-180' : ''}`} />
                        </div>
                    </div>
                    
                    <AnimatePresence>
                        {selectedTxId === tx.id && (
                            <motion.div initial={{ height:0, opacity:0 }} animate={{ height:'auto', opacity:1 }} exit={{ height:0, opacity:0 }} className="overflow-hidden">
                                <div className="mt-4 pt-4 border-t border-white/5 space-y-3">
                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="bg-black/30 p-2 rounded-xl border border-white/5">
                                            <p className="text-[8px] text-gray-600 uppercase font-black mb-1">Balance Before</p>
                                            <p className="text-xs text-gray-400 font-mono">৳{tx.balance_before?.toLocaleString() || '0.00'}</p>
                                        </div>
                                        <div className="bg-black/30 p-2 rounded-xl border border-white/5">
                                            <p className="text-[8px] text-gray-600 uppercase font-black mb-1">Balance After</p>
                                            <p className="text-xs text-green-500 font-mono font-bold">৳{tx.balance_after?.toLocaleString() || '0.00'}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2 text-[9px] text-gray-500 bg-white/5 p-2 rounded-lg">
                                        <Info size={10}/>
                                        <span>Wallet Impact: {tx.wallet_affected?.replace('_', ' ') || 'Aggregate Ledger'}</span>
                                    </div>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </motion.div>
            ))}
        </div>
      </div>
    </div>
  );
};

export default Wallet;