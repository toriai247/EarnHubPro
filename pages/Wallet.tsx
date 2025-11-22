
import React, { useEffect, useState } from 'react';
import GlassCard from '../components/GlassCard';
import Loader from '../components/Loader';
import { 
  ArrowDownLeft, ArrowUpRight, Wallet as WalletIcon, ShieldCheck, 
  Zap, Trophy, Gamepad2, Target, TrendingUp, Users, PieChart, Gift, ArrowRightLeft, RefreshCw, AlertCircle 
} from 'lucide-react';
import { WalletData, Activity } from '../types';
import { supabase } from '../integrations/supabase/client';
import { createUserProfile } from '../lib/actions';
import { Link } from 'react-router-dom';
import BalanceDisplay from '../components/BalanceDisplay';

const Wallet: React.FC = () => {
  const [wallet, setWallet] = useState<WalletData | null>(null);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalAssets, setTotalAssets] = useState(0);
  const [error, setError] = useState<string | null>(null);
  
  const [activeTab, setActiveTab] = useState<'all' | 'deposit' | 'withdraw' | 'earn' | 'transfer'>('all');

  useEffect(() => {
    fetchData();
  }, []);

  // Safety Timeout
  useEffect(() => {
      if (loading) {
          const timer = setTimeout(() => {
              if (loading) {
                  setLoading(false);
                  if (!wallet) setError("Failed to load wallet data.");
              }
          }, 15000);
          return () => clearTimeout(timer);
      }
  }, [loading, wallet]);

  useEffect(() => {
      if (wallet) {
          const total = 
            (wallet.main_balance || 0) +
            (wallet.deposit_balance || 0) +
            (wallet.game_balance || 0) +
            (wallet.earning_balance || 0) +
            (wallet.investment_balance || 0) +
            (wallet.referral_balance || 0) +
            (wallet.commission_balance || 0) +
            (wallet.bonus_balance || 0);
          setTotalAssets(total);
      }
  }, [wallet]);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
       try {
           let { data: walletData } = await supabase.from('wallets').select('*').eq('user_id', session.user.id).maybeSingle();

           if (!walletData) {
              try {
                 await createUserProfile(session.user.id, session.user.email || '', session.user.user_metadata?.full_name || 'User');
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
       } catch (e: any) {
           console.error(e);
           setError(e.message);
       }
    }
    setLoading(false);
  };

  const filteredActivities = activities.filter(a => {
    if (activeTab === 'all') return true;
    if (activeTab === 'transfer') return a.type === 'transfer';
    return a.type === activeTab;
  });

  const getTxConfig = (type: string) => {
      switch (type) {
          case 'deposit': return { icon: ArrowDownLeft, color: 'text-green-600 dark:text-green-400', bg: 'bg-green-100 dark:bg-green-500/20' };
          case 'withdraw': return { icon: ArrowUpRight, color: 'text-slate-600 dark:text-white', bg: 'bg-slate-200 dark:bg-white/10' };
          case 'transfer': return { icon: ArrowRightLeft, color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-100 dark:bg-blue-500/20' };
          case 'earn': return { icon: Zap, color: 'text-amber-600 dark:text-yellow-400', bg: 'bg-amber-100 dark:bg-yellow-500/20' };
          case 'game_win': return { icon: Trophy, color: 'text-emerald-600 dark:text-neon-green', bg: 'bg-emerald-100 dark:bg-neon-green/20' };
          case 'game_loss': return { icon: Gamepad2, color: 'text-red-600 dark:text-red-400', bg: 'bg-red-100 dark:bg-red-500/20' };
          default: return { icon: WalletIcon, color: 'text-gray-500 dark:text-gray-400', bg: 'bg-gray-100 dark:bg-gray-500/20' };
      }
  };

  const subWallets = [
      { id: 'deposit', name: 'Deposit', val: wallet?.deposit_balance, icon: WalletIcon, color: 'text-blue-600 dark:text-blue-400', border: 'border-blue-100 dark:border-blue-500/30', bg: 'bg-blue-50 dark:bg-transparent' },
      { id: 'game', name: 'Game', val: wallet?.game_balance, icon: Gamepad2, color: 'text-purple-600 dark:text-purple-400', border: 'border-purple-100 dark:border-purple-500/30', bg: 'bg-purple-50 dark:bg-transparent' },
      { id: 'earning', name: 'Earnings', val: wallet?.earning_balance, icon: Target, color: 'text-amber-600 dark:text-yellow-400', border: 'border-amber-100 dark:border-yellow-500/30', bg: 'bg-amber-50 dark:bg-transparent' },
      { id: 'invest', name: 'Investment', val: wallet?.investment_balance, icon: TrendingUp, color: 'text-emerald-600 dark:text-green-400', border: 'border-emerald-100 dark:border-green-500/30', bg: 'bg-emerald-50 dark:bg-transparent' },
      { id: 'referral', name: 'Referral', val: wallet?.referral_balance, icon: Users, color: 'text-pink-600 dark:text-pink-400', border: 'border-pink-100 dark:border-pink-500/30', bg: 'bg-pink-50 dark:bg-transparent' },
      { id: 'commission', name: 'Commission', val: wallet?.commission_balance, icon: PieChart, color: 'text-orange-600 dark:text-orange-400', border: 'border-orange-100 dark:border-orange-500/30', bg: 'bg-orange-50 dark:bg-transparent' },
      { id: 'bonus', name: 'Bonus', val: wallet?.bonus_balance, icon: Gift, color: 'text-cyan-600 dark:text-cyan-400', border: 'border-cyan-100 dark:border-cyan-500/30', bg: 'bg-cyan-50 dark:bg-transparent' },
  ];

  if (loading) return <div className="p-10"><Loader /></div>;
  if (error || !wallet) return (
      <div className="p-10 flex flex-col items-center justify-center text-center">
          <AlertCircle className="text-red-500 mb-3" size={40} />
          <h3 className="text-xl font-bold text-white mb-2">Wallet Error</h3>
          <p className="text-gray-400 text-sm mb-6">{error || "Could not load wallet data."}</p>
          <button onClick={fetchData} className="px-6 py-3 bg-royal-600 text-white rounded-xl font-bold flex items-center gap-2">
              <RefreshCw size={18} /> Retry
          </button>
      </div>
  );

  return (
    <div className="pb-24 sm:pl-20 sm:pt-6 space-y-6 relative">
      <header className="flex justify-between items-end px-4 sm:px-0">
         <div>
           <h1 className="text-2xl font-display font-bold text-slate-900 dark:text-white mb-1">My Assets</h1>
           <p className="text-slate-500 dark:text-gray-400 text-sm flex items-center gap-2">
             <ShieldCheck size={14} className="text-green-500" /> Multi-Wallet System
           </p>
         </div>
         <button onClick={fetchData} className="p-2 bg-white/10 rounded-xl text-gray-400 hover:text-white transition">
             <RefreshCw size={20} />
         </button>
      </header>

      {/* MAIN BALANCE CARD */}
      <GlassCard glow className="bg-gradient-royal dark:bg-gradient-royal text-center py-8 relative overflow-hidden border-none mx-4 sm:mx-0 shadow-2xl shadow-royal-900/20">
        <div className="relative z-10">
          <p className="text-blue-100 text-xs font-bold uppercase tracking-widest mb-1 opacity-80">Total Asset Value</p>
          <h1 className="text-4xl font-display font-bold text-white mb-4 tracking-tighter">
            <BalanceDisplay amount={totalAssets} />
          </h1>
          
          <div className="bg-white/10 backdrop-blur-md rounded-xl p-4 border border-white/20 max-w-xs mx-auto mb-6">
              <p className="text-[10px] text-blue-100 uppercase mb-1">Main Wallet (Withdrawable)</p>
              <p className="text-2xl font-bold text-white font-mono">
                  <BalanceDisplay amount={wallet.main_balance} />
              </p>
          </div>
          
          <div className="grid grid-cols-3 gap-3 px-2 max-w-md mx-auto">
             <Link to="/deposit" className="flex flex-col items-center justify-center bg-white/10 hover:bg-white/20 p-3 rounded-xl transition border border-white/20 group">
                <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center mb-2 text-emerald-300 group-hover:scale-110 transition"><ArrowDownLeft size={20} /></div>
                <span className="text-xs font-bold text-white">Deposit</span>
             </Link>
             <Link to="/transfer" className="flex flex-col items-center justify-center bg-white/10 hover:bg-white/20 p-3 rounded-xl transition border border-white/20 group">
                <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center mb-2 text-blue-300 group-hover:scale-110 transition"><ArrowRightLeft size={20} /></div>
                <span className="text-xs font-bold text-white">Transfer</span>
             </Link>
             <Link to="/withdraw" className="flex flex-col items-center justify-center bg-white/10 hover:bg-white/20 p-3 rounded-xl transition border border-white/20 group">
                <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center mb-2 text-white group-hover:scale-110 transition"><ArrowUpRight size={20} /></div>
                <span className="text-xs font-bold text-white">Withdraw</span>
             </Link>
          </div>
        </div>
      </GlassCard>

      {/* SUB WALLETS GRID */}
      <div className="px-4 sm:px-0">
          <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-3">Wallet Breakdown</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {subWallets.map((w) => (
                  <GlassCard key={w.id} className={`p-4 border ${w.border} ${w.bg} relative overflow-hidden group hover:shadow-md transition`}>
                      <div className={`absolute -right-2 -bottom-2 opacity-10 group-hover:opacity-20 transition ${w.color}`}>
                          <w.icon size={48} />
                      </div>
                      <div className="relative z-10">
                          <p className="text-[10px] text-slate-500 dark:text-gray-400 uppercase font-bold mb-1">{w.name}</p>
                          <p className={`text-lg font-bold ${w.color}`}>
                              <BalanceDisplay amount={w.val || 0} />
                          </p>
                      </div>
                  </GlassCard>
              ))}
          </div>
      </div>

      {/* TRANSACTIONS */}
      <div className="space-y-4 px-4 sm:px-0">
        <h3 className="text-lg font-bold text-slate-800 dark:text-white">History</h3>
        <div className="flex items-center gap-2 overflow-x-auto pb-2 no-scrollbar">
           {['all', 'transfer', 'deposit', 'withdraw', 'earn'].map((tab) => (
             <button
               key={tab}
               onClick={() => setActiveTab(tab as any)}
               className={`px-4 py-2 rounded-full text-xs font-bold capitalize transition whitespace-nowrap ${
                 activeTab === tab 
                 ? 'bg-slate-900 text-white dark:bg-white dark:text-black' 
                 : 'bg-slate-100 text-slate-500 dark:bg-white/5 dark:text-gray-400 hover:bg-slate-200 dark:hover:bg-white/10'
               }`}
             >
               {tab}
             </button>
           ))}
        </div>

        <div className="space-y-2">
           {filteredActivities.length === 0 ? (
              <div className="text-center py-12 text-slate-400 dark:text-gray-500 text-sm border border-dashed border-slate-200 dark:border-white/10 rounded-xl">
                 No transactions found.
              </div>
           ) : (
             filteredActivities.map((tx) => {
                const config = getTxConfig(tx.type);
                return (
                <GlassCard key={tx.id} className="flex items-center justify-between py-3 px-4 group hover:bg-slate-50 dark:hover:bg-white/10 transition">
                   <div className="flex items-center gap-4">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${config.bg} ${config.color}`}>
                        <config.icon size={18} />
                      </div>
                      <div className="min-w-0">
                        <h4 className="font-bold text-slate-800 dark:text-white text-sm capitalize truncate max-w-[150px] sm:max-w-none">{tx.title}</h4>
                        <p className="text-[10px] text-slate-500 dark:text-gray-400">{new Date(tx.time).toLocaleString()}</p>
                      </div>
                   </div>
                   <div className="text-right shrink-0">
                      <div className={`font-mono font-bold text-sm ${
                          tx.type === 'withdraw' || tx.type.includes('loss') 
                          ? 'text-slate-700 dark:text-white' 
                          : 'text-emerald-600 dark:text-neon-green'
                      }`}>
                        {tx.type === 'withdraw' || tx.type.includes('loss') ? '-' : '+'}<BalanceDisplay amount={Math.abs(tx.amount)} />
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
