
import React, { useEffect, useState } from 'react';
import GlassCard from '../components/GlassCard';
import { 
    ArrowDownLeft, ArrowUpRight, ArrowRightLeft, RefreshCw, 
    Wallet as WalletIcon, PieChart, Send, CreditCard, Banknote, Clock, Loader2,
    Gamepad2, Briefcase, Gift, Users, Landmark, ChevronRight, Activity as ActivityIcon,
    TrendingUp, ShieldCheck
} from 'lucide-react';
import { WalletData, Activity } from '../types';
import { supabase } from '../integrations/supabase/client';
import { createUserProfile, syncWalletTotals } from '../lib/actions';
import { Link } from 'react-router-dom';
import BalanceDisplay from '../components/BalanceDisplay';
import { useUI } from '../context/UIContext';
import { motion } from 'framer-motion';
import GoogleAd from '../components/GoogleAd';
import Skeleton from '../components/Skeleton';

const Wallet: React.FC = () => {
  const { toast } = useUI();
  const [wallet, setWallet] = useState<WalletData | null>(null);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);

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
             
             // Fetch Recent Transactions
             const { data: txData } = await supabase.from('transactions')
                .select('*')
                .eq('user_id', session.user.id)
                .order('created_at', {ascending: false})
                .limit(15);

             if (txData) {
                 const acts: Activity[] = txData.map((t: any) => ({
                    id: t.id, title: t.description || t.type, type: t.type, amount: t.amount,
                    time: t.created_at, timestamp: new Date(t.created_at).getTime(), status: t.status
                 }));
                 setActivities(acts);
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
          toast.success("Wallet Synchronized");
          await fetchData();
      }
      setSyncing(false);
  };

  const walletBreakdown = [
      { 
          id: 'main', 
          label: 'Main Balance', 
          amount: wallet?.main_balance || 0, 
          icon: CreditCard, 
          color: 'text-emerald-400', 
          bg: 'bg-emerald-500/10',
          border: 'border-emerald-500/20',
          desc: 'Withdrawable Funds'
      },
      { 
          id: 'deposit', 
          label: 'Deposit Balance', 
          amount: wallet?.deposit_balance || 0, 
          icon: Landmark, 
          color: 'text-blue-400', 
          bg: 'bg-blue-500/10', 
          border: 'border-blue-500/20',
          desc: 'For Investment & Games'
      },
      { 
          id: 'game', 
          label: 'Game Wallet', 
          amount: wallet?.game_balance || 0, 
          icon: Gamepad2, 
          color: 'text-purple-400', 
          bg: 'bg-purple-500/10', 
          border: 'border-purple-500/20',
          desc: 'Winnings from Games'
      },
      { 
          id: 'earning', 
          label: 'Task Earnings', 
          amount: wallet?.earning_balance || 0, 
          icon: Briefcase, 
          color: 'text-yellow-400', 
          bg: 'bg-yellow-500/10', 
          border: 'border-yellow-500/20',
          desc: 'Job & Ad Rewards'
      },
      {
          id: 'invest',
          label: 'Invest Holdings',
          amount: wallet?.investment_balance || 0,
          icon: TrendingUp,
          color: 'text-orange-400',
          bg: 'bg-orange-500/10',
          border: 'border-orange-500/20',
          desc: 'Active Capital'
      },
      { 
          id: 'commission', 
          label: 'Commissions', 
          amount: (wallet?.referral_balance || 0) + (wallet?.commission_balance || 0), 
          icon: Users, 
          color: 'text-pink-400', 
          bg: 'bg-pink-500/10', 
          border: 'border-pink-500/20',
          desc: 'Referral Income'
      },
      { 
          id: 'bonus', 
          label: 'Bonus Credits', 
          amount: wallet?.bonus_balance || 0, 
          icon: Gift, 
          color: 'text-cyan-400', 
          bg: 'bg-cyan-500/10', 
          border: 'border-cyan-500/20',
          desc: 'Promo & Login Rewards'
      }
  ];

  return (
    <div className="pb-24 sm:pl-20 sm:pt-6 space-y-6 px-4 sm:px-0 animate-fade-in">
      
      {/* Header */}
      <div className="flex justify-between items-center pt-4">
         <div>
             <h1 className="text-2xl font-display font-bold text-main flex items-center gap-2">
                 <WalletIcon className="text-brand"/> Asset Manager
             </h1>
             <p className="text-xs text-muted">Overview of all your digital assets.</p>
         </div>
         <button onClick={handleSync} className="p-2 bg-card rounded-xl text-muted hover:text-main border border-border-base transition hover:bg-input">
             <RefreshCw size={18} className={syncing ? 'animate-spin' : ''} />
         </button>
      </div>

      {/* Total Net Worth Card */}
      <GlassCard className="bg-gradient-to-br from-indigo-900/40 via-purple-900/20 to-black border-indigo-500/30 p-6 relative overflow-hidden shadow-2xl">
          <div className="absolute top-0 right-0 p-6 opacity-10 pointer-events-none">
              <PieChart size={140} className="text-white"/>
          </div>
          
          <div className="relative z-10">
              <div className="flex items-center gap-2 mb-1">
                  <div className="p-1 bg-indigo-500/20 rounded text-indigo-300">
                      <ShieldCheck size={12} />
                  </div>
                  <p className="text-indigo-200 text-xs font-bold uppercase tracking-widest">Total Net Worth</p>
              </div>
              <h1 className="text-4xl sm:text-5xl font-black text-white tracking-tight mb-6 font-mono">
                  <BalanceDisplay amount={wallet?.balance} loading={loading} />
              </h1>
              
              <div className="flex gap-3">
                 <Link to="/deposit" className="flex-1 py-3 bg-white text-black font-black text-xs uppercase tracking-wider rounded-xl flex items-center justify-center gap-2 hover:bg-gray-200 transition shadow-lg active:scale-95">
                    <ArrowDownLeft size={16} /> Deposit
                 </Link>
                 <Link to="/withdraw" className="flex-1 py-3 bg-white/10 text-white font-black text-xs uppercase tracking-wider rounded-xl flex items-center justify-center gap-2 hover:bg-white/20 border border-white/10 transition active:scale-95">
                    <ArrowUpRight size={16} /> Withdraw
                 </Link>
              </div>
          </div>
      </GlassCard>

      {/* Quick Action Pills */}
      <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
          {[
              { to: '/transfer', icon: ArrowRightLeft, label: 'Transfer' },
              { to: '/send-money', icon: Send, label: 'Send P2P' },
              { to: '/exchange', icon: RefreshCw, label: 'Exchange' },
              { to: '/invest', icon: TrendingUp, label: 'Invest' }
          ].map((action, idx) => (
              <Link key={idx} to={action.to} className="flex-1 min-w-[100px] bg-card border border-border-base p-3 rounded-xl flex flex-col items-center justify-center gap-1.5 hover:bg-input transition group">
                  <action.icon size={20} className="text-muted group-hover:text-brand transition-colors"/>
                  <span className="text-[10px] font-bold text-main uppercase">{action.label}</span>
              </Link>
          ))}
      </div>

      {/* AD PLACEMENT: DISPLAY RESPONSIVE */}
      <GoogleAd slot="9579822529" format="auto" responsive="true" />

      {/* Detailed Wallet Grid */}
      <div className="space-y-3">
          <div className="flex items-center justify-between px-1">
              <h3 className="text-sm font-bold text-muted uppercase tracking-wider">Wallet Breakdown</h3>
              <span className="text-[10px] bg-input px-2 py-0.5 rounded text-muted">{walletBreakdown.length} Wallets</span>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {loading ? (
                  Array.from({ length: 6 }).map((_, i) => (
                      <GlassCard key={i} className="p-4 flex items-center justify-between border border-white/5">
                          <div className="flex items-center gap-4 w-full">
                              <Skeleton variant="circular" className="w-12 h-12 shrink-0 bg-white/5" />
                              <div className="space-y-2 w-full">
                                  <Skeleton variant="text" className="h-3 w-24 bg-white/5" />
                                  <Skeleton variant="text" className="h-6 w-32 bg-white/5" />
                              </div>
                          </div>
                      </GlassCard>
                  ))
              ) : (
                  walletBreakdown.map((w, idx) => (
                      <motion.div 
                        key={w.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.05 }}
                      >
                          <GlassCard className={`p-4 flex items-center justify-between border transition cursor-default ${w.border} ${w.bg} hover:brightness-110`}>
                              <div className="flex items-center gap-4">
                                  <div className={`p-3 rounded-xl bg-black/20 ${w.color}`}>
                                      <w.icon size={22} />
                                  </div>
                                  <div>
                                      <p className="text-xs font-bold opacity-70 uppercase tracking-wide text-white mb-0.5">{w.label}</p>
                                      <p className={`text-xl font-black font-mono leading-none ${w.color}`}>
                                          <BalanceDisplay amount={w.amount} />
                                      </p>
                                      <p className="text-[10px] text-gray-400 mt-1">{w.desc}</p>
                                  </div>
                              </div>
                              {w.amount > 0 && (
                                  <Link to="/transfer" className="p-2 bg-black/20 rounded-lg text-white/50 hover:text-white hover:bg-black/40 transition">
                                      <ChevronRight size={16} />
                                  </Link>
                              )}
                          </GlassCard>
                      </motion.div>
                  ))
              )}
          </div>
      </div>

      {/* Transaction History */}
      <div className="space-y-3">
        <div className="flex justify-between items-end px-1">
            <h3 className="text-sm font-bold text-muted uppercase tracking-wider">Recent Activity</h3>
            <Link to="/wallet" className="text-[10px] text-brand hover:underline">View Full History</Link>
        </div>
        
        <div className="space-y-2">
           {loading ? (
               Array.from({ length: 5 }).map((_, i) => (
                   <div key={i} className="flex justify-between items-center p-3 rounded-xl bg-card border border-border-base">
                       <div className="flex items-center gap-3 w-full">
                           <Skeleton variant="circular" className="w-10 h-10 shrink-0 bg-white/5" />
                           <div className="space-y-2 w-full max-w-[200px]">
                               <Skeleton variant="text" className="w-full h-4 bg-white/5" />
                               <Skeleton variant="text" className="w-1/2 h-3 bg-white/5" />
                           </div>
                       </div>
                       <Skeleton variant="text" className="w-16 h-5 bg-white/5" />
                   </div>
               ))
           ) : activities.length === 0 ? (
               <div className="text-center py-10 bg-card rounded-xl border border-border-base text-muted">
                   <Clock size={32} className="mx-auto mb-2 opacity-30"/>
                   <p className="text-xs">No recent transactions.</p>
               </div>
           ) : (
               activities.map((tx, idx) => (
                   <motion.div 
                        key={tx.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: idx * 0.03 }}
                        className="flex justify-between items-center p-3 rounded-xl bg-card border border-border-base hover:border-border-highlight transition group"
                   >
                       <div className="flex items-center gap-3">
                           <div className={`w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                               ['deposit','earn', 'game_win', 'bonus', 'referral', 'sponsorship', 'asset_sell'].includes(tx.type) 
                               ? 'bg-green-500/10 text-green-500' 
                               : 'bg-red-500/10 text-red-500'
                           }`}>
                               {['deposit','earn','bonus', 'referral', 'sponsorship', 'asset_sell'].includes(tx.type) ? <ArrowDownLeft size={18}/> : 
                                ['withdraw','game_loss', 'invest', 'asset_buy', 'penalty', 'fee'].includes(tx.type) ? <ArrowUpRight size={18}/> :
                                <RefreshCw size={18}/>}
                           </div>
                           <div className="min-w-0">
                               <p className="text-sm font-bold text-main truncate pr-2 capitalize">{tx.title}</p>
                               <p className="text-[10px] text-muted">{new Date(tx.time).toLocaleString()}</p>
                           </div>
                       </div>
                       <div className="text-right">
                           <span className={`text-sm font-mono font-bold whitespace-nowrap block ${
                               ['withdraw', 'game_loss', 'invest', 'transfer', 'fee', 'penalty', 'asset_buy'].includes(tx.type) ? 'text-main' : 'text-green-400'
                           }`}>
                               {['withdraw', 'game_loss', 'invest', 'fee', 'penalty', 'asset_buy'].includes(tx.type) ? '-' : '+'}<BalanceDisplay amount={tx.amount} />
                           </span>
                           <span className={`text-[9px] font-bold uppercase ${
                               tx.status === 'success' ? 'text-green-500' : tx.status === 'pending' ? 'text-yellow-500' : 'text-red-500'
                           }`}>
                               {tx.status}
                           </span>
                       </div>
                   </motion.div>
               ))
           )}
        </div>
      </div>
    </div>
  );
};

export default Wallet;
