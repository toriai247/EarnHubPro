
import React, { useEffect, useState } from 'react';
import GlassCard from '../components/GlassCard';
import Loader from '../components/Loader';
import Skeleton from '../components/Skeleton';
import { ArrowDownLeft, ArrowUpRight, Wallet as WalletIcon, ShieldCheck, XCircle, Clock, Users } from 'lucide-react';
import { WalletData, Activity, WalletMeta } from '../types';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../integrations/supabase/client';
import { updateWallet, createTransaction, createUserProfile } from '../lib/actions';
import { Link, useNavigate } from 'react-router-dom';

const Wallet: React.FC = () => {
  const [wallet, setWallet] = useState<WalletData | null>(null);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [meta] = useState<WalletMeta>({ minWithdraw: 50, withdrawFeePercent: 5, currency: 'USD' });
  
  const [activeTab, setActiveTab] = useState<'all' | 'deposit' | 'withdraw' | 'earn' | 'game'>('all');
  const [userId, setUserId] = useState<string>('');
  const navigate = useNavigate();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
       setUserId(session.user.id);
       
       // Try to fetch wallet
       let { data: walletData } = await supabase.from('wallets').select('*').eq('user_id', session.user.id).single();

       // Auto-recover if missing
       if (!walletData) {
          try {
             await createUserProfile(session.user.id, session.user.email || '', session.user.user_metadata?.full_name || 'User');
             // Retry fetch
             const res = await supabase.from('wallets').select('*').eq('user_id', session.user.id).single();
             walletData = res.data;
          } catch (e) {
             console.error("Recovery failed", e);
          }
       }

       if (walletData) {
         setWallet(walletData as WalletData);
         
         const { data: txData } = await supabase.from('transactions').select('*').eq('user_id', session.user.id).order('created_at', {ascending: false});
         if (txData) {
             setActivities(txData.map((t: any) => ({
                id: t.id, title: t.description || t.type, type: t.type, amount: t.amount,
                time: t.created_at, timestamp: new Date(t.created_at).getTime(), status: t.status
             })));
         }
       }
    }
    setLoading(false);
  };

  const filteredActivities = activities.filter(a => {
    if (activeTab === 'all') return true;
    if (activeTab === 'game') return a.type === 'game_win' || a.type === 'game_loss';
    return a.type === activeTab;
  });

  if (loading) {
    return (
      <div className="pb-24 sm:pl-20 sm:pt-6 space-y-6 px-4 sm:px-0">
         {/* Header Skeleton */}
         <div className="space-y-2">
             <Skeleton variant="text" className="w-32 h-8" />
             <Skeleton variant="text" className="w-48" />
         </div>

         {/* Main Wallet Card Skeleton */}
         <div className="h-64 rounded-2xl bg-white/5 border border-white/5 p-6 flex flex-col items-center justify-center space-y-4">
             <Skeleton variant="text" className="w-32" />
             <Skeleton variant="text" className="w-48 h-12" />
             <Skeleton variant="text" className="w-40" />
             <div className="flex gap-4 w-full max-w-md mt-4">
                 <Skeleton variant="rectangular" className="flex-1 h-12" />
                 <Skeleton variant="rectangular" className="flex-1 h-12" />
             </div>
         </div>

         {/* Stats Grid Skeleton */}
         <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
             {[1,2,3,4].map(i => <Skeleton key={i} variant="rectangular" className="h-20" />)}
         </div>

         {/* Tabs Skeleton */}
         <div className="flex gap-2 overflow-hidden">
             {[1,2,3,4].map(i => <Skeleton key={i} variant="rectangular" className="w-20 h-8 rounded-full" />)}
         </div>

         {/* Transaction List Skeleton */}
         <div className="space-y-3">
             {[1,2,3,4,5].map(i => (
                 <div key={i} className="flex items-center justify-between p-4 rounded-xl bg-white/5">
                     <div className="flex items-center gap-3">
                         <Skeleton variant="circular" className="w-10 h-10" />
                         <div className="space-y-2">
                             <Skeleton variant="text" className="w-32" />
                             <Skeleton variant="text" className="w-24 h-3" />
                         </div>
                     </div>
                     <Skeleton variant="text" className="w-16" />
                 </div>
             ))}
         </div>
      </div>
    );
  }

  if (!wallet) return (
    <div className="p-8 text-center">
       <p className="text-gray-400 mb-4">Wallet not initialized.</p>
       <button onClick={fetchData} className="px-4 py-2 bg-royal-600 rounded-lg text-white font-bold">Retry</button>
    </div>
  );

  return (
    <div className="pb-24 sm:pl-20 sm:pt-6 space-y-6 relative">
      <header className="flex justify-between items-end">
         <div>
           <h1 className="text-2xl font-display font-bold text-white mb-1">My Wallet</h1>
           <p className="text-gray-400 text-sm flex items-center gap-2">
             <ShieldCheck size={14} className="text-green-400" /> Secure Vault
           </p>
         </div>
      </header>

      <GlassCard glow className="bg-gradient-to-br from-slate-900 via-royal-900 to-slate-900 text-center py-8 relative overflow-hidden border-royal-500/30">
        <div className="relative z-10">
          <p className="text-royal-300 text-xs font-bold uppercase tracking-widest mb-2">Total Asset Balance</p>
          <h1 className="text-5xl font-display font-bold text-white mb-2 tracking-tighter">
            ${wallet.balance.toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </h1>
          <div className="flex items-center justify-center gap-2 text-sm mb-8">
             <span className="text-gray-400">Withdrawable:</span>
             <span className="text-white font-bold">${wallet.withdrawable.toFixed(2)}</span>
          </div>
          
          <div className="grid grid-cols-2 gap-4 px-4 max-w-md mx-auto">
             <Link to="/deposit" 
              className="flex items-center justify-center gap-2 bg-neon-green text-dark-950 py-3.5 rounded-xl font-bold hover:bg-emerald-400 transition shadow-lg shadow-neon-green/20 active:scale-95"
             >
               <ArrowDownLeft size={20} /> Deposit
             </Link>
             <Link to="/withdraw"
               className="flex items-center justify-center gap-2 bg-white/10 text-white py-3.5 rounded-xl font-bold hover:bg-white/20 transition border border-white/10 active:scale-95"
             >
               <ArrowUpRight size={20} /> Withdraw
             </Link>
          </div>
        </div>
      </GlassCard>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="bg-white/5 rounded-xl p-3 border border-white/5">
            <p className="text-[10px] text-gray-400 uppercase mb-1">Lifetime Earned</p>
            <p className="text-lg font-bold text-neon-glow">+${wallet.total_earning.toFixed(2)}</p>
        </div>
         <div className="bg-white/5 rounded-xl p-3 border border-white/5">
            <p className="text-[10px] text-gray-400 uppercase mb-1">Referral Earn</p>
            <p className="text-lg font-bold text-purple-400">+${(wallet.referral_earnings || 0).toFixed(2)}</p>
        </div>
        <div className="bg-white/5 rounded-xl p-3 border border-white/5">
            <p className="text-[10px] text-gray-400 uppercase mb-1">Pending Withdraw</p>
            <p className="text-lg font-bold text-yellow-400">${wallet.pending_withdraw.toFixed(2)}</p>
        </div>
        <div className="bg-white/5 rounded-xl p-3 border border-white/5">
            <p className="text-[10px] text-gray-400 uppercase mb-1">Today's PNL</p>
            <p className="text-lg font-bold text-white">+${wallet.today_earning.toFixed(2)}</p>
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex items-center gap-2 overflow-x-auto pb-2 no-scrollbar">
           {['all', 'deposit', 'withdraw', 'earn', 'game'].map((tab) => (
             <button
               key={tab}
               onClick={() => setActiveTab(tab as any)}
               className={`px-4 py-2 rounded-full text-xs font-bold capitalize transition whitespace-nowrap ${
                 activeTab === tab ? 'bg-white text-black' : 'bg-white/5 text-gray-400 hover:text-white'
               }`}
             >
               {tab}
             </button>
           ))}
        </div>

        <div className="space-y-2">
           {filteredActivities.length === 0 ? (
              <div className="text-center py-8 text-gray-500 text-sm border border-dashed border-white/10 rounded-xl">
                 No transactions found.
              </div>
           ) : (
             filteredActivities.map((tx) => (
                <GlassCard key={tx.id} className="flex items-center justify-between py-3 px-4 group hover:bg-white/5 transition">
                   <div className="flex items-center gap-4">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                        tx.type === 'deposit' ? 'bg-green-500/20 text-green-500' :
                        tx.type === 'withdraw' ? 'bg-white/10 text-white' :
                        tx.type === 'game_loss' ? 'bg-red-500/10 text-red-500' :
                        tx.type === 'penalty' ? 'bg-red-500/20 text-red-400' :
                        tx.type === 'referral' ? 'bg-purple-500/20 text-purple-400' :
                        'bg-blue-500/20 text-blue-400'
                      }`}>
                        {tx.type === 'deposit' ? <ArrowDownLeft size={18} /> :
                         tx.type === 'withdraw' ? <ArrowUpRight size={18} /> :
                         tx.type === 'game_loss' ? <ArrowUpRight size={18} className="rotate-45" /> :
                         tx.type === 'penalty' ? <XCircle size={18} /> :
                         tx.type === 'referral' ? <Users size={18} /> :
                         <WalletIcon size={18} />
                        }
                      </div>
                      <div>
                        <h4 className="font-bold text-white text-sm capitalize">{tx.title}</h4>
                        <div className="flex items-center gap-2 text-[10px] text-gray-400">
                           <span>{new Date(tx.time).toLocaleDateString()}</span>
                           <span className={`uppercase ${tx.status === 'pending' ? 'text-yellow-400' : tx.status === 'failed' ? 'text-red-400' : 'text-green-400'}`}>
                             {tx.status || 'Success'}
                           </span>
                        </div>
                      </div>
                   </div>
                   <div className="text-right">
                      <div className={`font-mono font-bold text-sm ${
                        tx.type === 'deposit' || tx.type === 'earn' || tx.type === 'bonus' || tx.type === 'game_win' || tx.type === 'referral' ? 'text-green-400' : 'text-white'
                      }`}>
                        {tx.type === 'deposit' || tx.type === 'earn' || tx.type === 'bonus' || tx.type === 'game_win' || tx.type === 'referral' ? '+' : '-'}${tx.amount?.toFixed(2)}
                      </div>
                   </div>
                </GlassCard>
             ))
           )}
        </div>
      </div>
    </div>
  );
};

export default Wallet;
