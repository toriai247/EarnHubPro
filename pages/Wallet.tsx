
import React, { useEffect, useState } from 'react';
import GlassCard from '../components/GlassCard';
import Loader from '../components/Loader';
import Skeleton from '../components/Skeleton';
import { 
  ArrowDownLeft, ArrowUpRight, Wallet as WalletIcon, ShieldCheck, XCircle, Clock, Users, 
  Zap, TrendingUp, Gamepad2, Trophy, Gift, AlertCircle, RefreshCw
} from 'lucide-react';
import { WalletData, Activity } from '../types';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../integrations/supabase/client';
import { createUserProfile } from '../lib/actions';
import { Link } from 'react-router-dom';

const Wallet: React.FC = () => {
  const [wallet, setWallet] = useState<WalletData | null>(null);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [activeTab, setActiveTab] = useState<'all' | 'deposit' | 'withdraw' | 'earn' | 'game'>('all');
  const [userId, setUserId] = useState<string>('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
       setUserId(session.user.id);
       
       try {
           // Try to fetch wallet
           let { data: walletData, error: fetchError } = await supabase.from('wallets').select('*').eq('user_id', session.user.id).maybeSingle();

           // Auto-recover if missing
           if (!walletData) {
              try {
                 await createUserProfile(session.user.id, session.user.email || '', session.user.user_metadata?.full_name || 'User');
                 // Retry fetch
                 const res = await supabase.from('wallets').select('*').eq('user_id', session.user.id).single();
                 walletData = res.data;
              } catch (e) {
                 console.error("Recovery failed", e);
                 throw new Error("Could not initialize wallet.");
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
       } catch (e: any) {
           setError(e.message || JSON.stringify(e));
       }
    }
    setLoading(false);
  };

  const filteredActivities = activities.filter(a => {
    if (activeTab === 'all') return true;
    if (activeTab === 'game') return a.type === 'game_win' || a.type === 'game_loss';
    return a.type === activeTab;
  });

  const getTxConfig = (type: string) => {
      switch (type) {
          case 'deposit': return { icon: ArrowDownLeft, color: 'text-green-400', bg: 'bg-green-500/20' };
          case 'withdraw': return { icon: ArrowUpRight, color: 'text-white', bg: 'bg-white/10' };
          case 'earn': return { icon: Zap, color: 'text-yellow-400', bg: 'bg-yellow-500/20' };
          case 'bonus': return { icon: Gift, color: 'text-purple-400', bg: 'bg-purple-500/20' };
          case 'referral': return { icon: Users, color: 'text-blue-400', bg: 'bg-blue-500/20' };
          case 'game_win': return { icon: Trophy, color: 'text-neon-green', bg: 'bg-neon-green/20' };
          case 'game_loss': return { icon: Gamepad2, color: 'text-red-400', bg: 'bg-red-500/20' };
          case 'invest': return { icon: TrendingUp, color: 'text-blue-300', bg: 'bg-blue-500/10' };
          case 'penalty': return { icon: XCircle, color: 'text-red-500', bg: 'bg-red-500/10' };
          default: return { icon: WalletIcon, color: 'text-gray-400', bg: 'bg-gray-500/20' };
      }
  };

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

  if (error || !wallet) return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center p-6 text-center space-y-4">
       <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center text-red-500">
            <AlertCircle size={32} />
       </div>
       <div>
           <h2 className="text-xl font-bold text-white">Wallet Error</h2>
           <p className="text-gray-400 text-sm mb-4">{error || "Wallet not initialized."}</p>
       </div>
       <button onClick={fetchData} className="flex items-center gap-2 px-6 py-3 bg-royal-600 rounded-xl text-white font-bold hover:bg-royal-700 transition">
           <RefreshCw size={18} /> Retry
       </button>
    </div>
  );

  return (
    <div className="pb-24 sm:pl-20 sm:pt-6 space-y-6 relative">
      <header className="flex justify-between items-end px-4 sm:px-0">
         <div>
           <h1 className="text-2xl font-display font-bold text-white mb-1">My Wallet</h1>
           <p className="text-gray-400 text-sm flex items-center gap-2">
             <ShieldCheck size={14} className="text-green-400" /> Secure Vault
           </p>
         </div>
      </header>

      <GlassCard glow className="bg-gradient-to-br from-slate-900 via-royal-900 to-slate-900 text-center py-8 relative overflow-hidden border-royal-500/30 mx-4 sm:mx-0">
        <div className="relative z-10">
          <p className="text-royal-300 text-xs font-bold uppercase tracking-widest mb-2">Total Asset Balance</p>
          <h1 className="text-5xl font-display font-bold text-white mb-2 tracking-tighter">
            ${wallet.balance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </h1>
          <div className="flex items-center justify-center gap-2 text-sm mb-8">
             <span className="text-gray-400">Withdrawable:</span>
             <span className="text-white font-bold">${wallet.withdrawable.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
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

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 px-4 sm:px-0">
        <div className="bg-white/5 rounded-xl p-3 border border-white/5">
            <p className="text-[10px] text-gray-400 uppercase mb-1">Lifetime Earned</p>
            <p className="text-lg font-bold text-neon-glow">+${wallet.total_earning.toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
        </div>
         <div className="bg-white/5 rounded-xl p-3 border border-white/5">
            <p className="text-[10px] text-gray-400 uppercase mb-1">Referral Earn</p>
            <p className="text-lg font-bold text-purple-400">+${(wallet.referral_earnings || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
        </div>
        <div className="bg-white/5 rounded-xl p-3 border border-white/5">
            <p className="text-[10px] text-gray-400 uppercase mb-1">Pending Withdraw</p>
            <p className="text-lg font-bold text-yellow-400">${wallet.pending_withdraw.toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
        </div>
        <div className="bg-white/5 rounded-xl p-3 border border-white/5">
            <p className="text-[10px] text-gray-400 uppercase mb-1">Today's PNL</p>
            <p className="text-lg font-bold text-white">+${wallet.today_earning.toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
        </div>
      </div>

      <div className="space-y-4 px-4 sm:px-0">
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
              <div className="text-center py-12 text-gray-500 text-sm border border-dashed border-white/10 rounded-xl">
                 <AlertCircle className="mx-auto mb-2 opacity-50" size={24} />
                 No transactions found for this category.
              </div>
           ) : (
             filteredActivities.map((tx) => {
                const config = getTxConfig(tx.type);
                const isPositive = ['deposit', 'earn', 'bonus', 'game_win', 'referral'].includes(tx.type);
                const date = new Date(tx.time);
                
                return (
                <GlassCard key={tx.id} className="flex items-center justify-between py-3 px-4 group hover:bg-white/5 transition">
                   <div className="flex items-center gap-4">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${config.bg} ${config.color}`}>
                        <config.icon size={18} />
                      </div>
                      <div className="min-w-0">
                        <h4 className="font-bold text-white text-sm capitalize truncate max-w-[150px] sm:max-w-none">{tx.title}</h4>
                        <div className="flex items-center gap-2 text-[10px] text-gray-400 mt-0.5">
                           <span className="flex items-center gap-1">
                               {date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                               <span className="w-0.5 h-0.5 bg-gray-500 rounded-full"></span>
                               {date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                           </span>
                           {tx.status && (
                               <span className={`uppercase px-1.5 py-0.5 rounded-[4px] text-[9px] font-bold tracking-wide ${
                                   tx.status === 'pending' ? 'bg-yellow-500/10 text-yellow-400' : 
                                   tx.status === 'failed' ? 'bg-red-500/10 text-red-400' : 
                                   'bg-green-500/10 text-green-400'
                               }`}>
                                 {tx.status}
                               </span>
                           )}
                        </div>
                      </div>
                   </div>
                   <div className="text-right shrink-0">
                      <div className={`font-mono font-bold text-sm ${isPositive ? 'text-neon-green' : 'text-white'}`}>
                        {isPositive ? '+' : '-'}${Math.abs(tx.amount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </div>
                   </div>
                </GlassCard>
             )})
           )}
        </div>
      </div>
    </div>
  );
};

export default Wallet;
