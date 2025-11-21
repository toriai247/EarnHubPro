
import React, { useEffect, useState } from 'react';
import GlassCard from '../components/GlassCard';
import Loader from '../components/Loader';
import Skeleton from '../components/Skeleton';
import { 
  ArrowDownLeft, ArrowUpRight, Wallet as WalletIcon, ShieldCheck, XCircle, 
  Zap, TrendingUp, Gamepad2, Trophy, Gift, AlertCircle, RefreshCw, 
  ArrowRightLeft, PieChart, Users, Briefcase, Target
} from 'lucide-react';
import { WalletData, Activity } from '../types';
import { motion } from 'framer-motion';
import { supabase } from '../integrations/supabase/client';
import { createUserProfile } from '../lib/actions';
import { Link } from 'react-router-dom';
import BalanceDisplay from '../components/BalanceDisplay';

const Wallet: React.FC = () => {
  const [wallet, setWallet] = useState<WalletData | null>(null);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalAssets, setTotalAssets] = useState(0);
  
  const [activeTab, setActiveTab] = useState<'all' | 'deposit' | 'withdraw' | 'earn' | 'transfer'>('all');

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
      if (wallet) {
          // Calculate Total Assets dynamically
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
    if (activeTab === 'transfer') return a.type === 'transfer';
    return a.type === activeTab;
  });

  const getTxConfig = (type: string) => {
      switch (type) {
          case 'deposit': return { icon: ArrowDownLeft, color: 'text-green-400', bg: 'bg-green-500/20' };
          case 'withdraw': return { icon: ArrowUpRight, color: 'text-white', bg: 'bg-white/10' };
          case 'transfer': return { icon: ArrowRightLeft, color: 'text-blue-400', bg: 'bg-blue-500/20' };
          case 'earn': return { icon: Zap, color: 'text-yellow-400', bg: 'bg-yellow-500/20' };
          case 'game_win': return { icon: Trophy, color: 'text-neon-green', bg: 'bg-neon-green/20' };
          case 'game_loss': return { icon: Gamepad2, color: 'text-red-400', bg: 'bg-red-500/20' };
          default: return { icon: WalletIcon, color: 'text-gray-400', bg: 'bg-gray-500/20' };
      }
  };

  const subWallets = [
      { id: 'deposit', name: 'Deposit', val: wallet?.deposit_balance, icon: WalletIcon, color: 'text-blue-400', border: 'border-blue-500/30' },
      { id: 'game', name: 'Game', val: wallet?.game_balance, icon: Gamepad2, color: 'text-purple-400', border: 'border-purple-500/30' },
      { id: 'earning', name: 'Earnings', val: wallet?.earning_balance, icon: Target, color: 'text-yellow-400', border: 'border-yellow-500/30' },
      { id: 'invest', name: 'Investment', val: wallet?.investment_balance, icon: TrendingUp, color: 'text-green-400', border: 'border-green-500/30' },
      { id: 'referral', name: 'Referral', val: wallet?.referral_balance, icon: Users, color: 'text-pink-400', border: 'border-pink-500/30' },
      { id: 'commission', name: 'Commission', val: wallet?.commission_balance, icon: PieChart, color: 'text-orange-400', border: 'border-orange-500/30' },
      { id: 'bonus', name: 'Bonus', val: wallet?.bonus_balance, icon: Gift, color: 'text-cyan-400', border: 'border-cyan-500/30' },
  ];

  if (loading) return <div className="p-10"><Loader /></div>;
  if (!wallet) return <div className="p-10 text-center text-red-500">Wallet Error</div>;

  return (
    <div className="pb-24 sm:pl-20 sm:pt-6 space-y-6 relative">
      <header className="flex justify-between items-end px-4 sm:px-0">
         <div>
           <h1 className="text-2xl font-display font-bold text-white mb-1">My Assets</h1>
           <p className="text-gray-400 text-sm flex items-center gap-2">
             <ShieldCheck size={14} className="text-green-400" /> Multi-Wallet System
           </p>
         </div>
      </header>

      {/* MAIN BALANCE CARD */}
      <GlassCard glow className="bg-gradient-to-br from-slate-900 via-royal-900 to-slate-900 text-center py-8 relative overflow-hidden border-royal-500/30 mx-4 sm:mx-0">
        <div className="relative z-10">
          <p className="text-royal-300 text-xs font-bold uppercase tracking-widest mb-1">Total Asset Value</p>
          <h1 className="text-4xl font-display font-bold text-white mb-4 tracking-tighter">
            <BalanceDisplay amount={totalAssets} />
          </h1>
          
          <div className="bg-black/40 backdrop-blur-sm rounded-xl p-4 border border-white/10 max-w-xs mx-auto mb-6">
              <p className="text-[10px] text-gray-400 uppercase mb-1">Main Wallet (Withdrawable)</p>
              <p className="text-2xl font-bold text-neon-green font-mono">
                  <BalanceDisplay amount={wallet.main_balance} />
              </p>
          </div>
          
          <div className="grid grid-cols-3 gap-3 px-2 max-w-md mx-auto">
             <Link to="/deposit" className="flex flex-col items-center justify-center bg-white/5 hover:bg-white/10 p-3 rounded-xl transition border border-white/10 group">
                <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center mb-2 text-green-400 group-hover:scale-110 transition"><ArrowDownLeft size={20} /></div>
                <span className="text-xs font-bold">Deposit</span>
             </Link>
             <Link to="/transfer" className="flex flex-col items-center justify-center bg-white/5 hover:bg-white/10 p-3 rounded-xl transition border border-white/10 group">
                <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center mb-2 text-blue-400 group-hover:scale-110 transition"><ArrowRightLeft size={20} /></div>
                <span className="text-xs font-bold">Transfer</span>
             </Link>
             <Link to="/withdraw" className="flex flex-col items-center justify-center bg-white/5 hover:bg-white/10 p-3 rounded-xl transition border border-white/10 group">
                <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center mb-2 text-white group-hover:scale-110 transition"><ArrowUpRight size={20} /></div>
                <span className="text-xs font-bold">Withdraw</span>
             </Link>
          </div>
        </div>
      </GlassCard>

      {/* SUB WALLETS GRID */}
      <div className="px-4 sm:px-0">
          <h3 className="text-lg font-bold text-white mb-3">Wallet Breakdown</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {subWallets.map((w) => (
                  <GlassCard key={w.id} className={`p-3 border ${w.border} relative overflow-hidden group hover:bg-white/5 transition`}>
                      <div className={`absolute -right-2 -bottom-2 opacity-10 group-hover:opacity-20 transition ${w.color}`}>
                          <w.icon size={48} />
                      </div>
                      <div className="relative z-10">
                          <p className="text-[10px] text-gray-400 uppercase font-bold mb-1">{w.name}</p>
                          <p className={`text-lg font-bold ${w.color}`}>
                              $<BalanceDisplay amount={w.val || 0} />
                          </p>
                      </div>
                  </GlassCard>
              ))}
          </div>
      </div>

      {/* TRANSACTIONS */}
      <div className="space-y-4 px-4 sm:px-0">
        <h3 className="text-lg font-bold text-white">History</h3>
        <div className="flex items-center gap-2 overflow-x-auto pb-2 no-scrollbar">
           {['all', 'transfer', 'deposit', 'withdraw', 'earn'].map((tab) => (
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
                 No transactions found.
              </div>
           ) : (
             filteredActivities.map((tx) => {
                const config = getTxConfig(tx.type);
                return (
                <GlassCard key={tx.id} className="flex items-center justify-between py-3 px-4 group hover:bg-white/5 transition">
                   <div className="flex items-center gap-4">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${config.bg} ${config.color}`}>
                        <config.icon size={18} />
                      </div>
                      <div className="min-w-0">
                        <h4 className="font-bold text-white text-sm capitalize truncate max-w-[150px] sm:max-w-none">{tx.title}</h4>
                        <p className="text-[10px] text-gray-400">{new Date(tx.time).toLocaleString()}</p>
                      </div>
                   </div>
                   <div className="text-right shrink-0">
                      <div className={`font-mono font-bold text-sm ${tx.type === 'withdraw' || tx.type.includes('loss') ? 'text-white' : 'text-neon-green'}`}>
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
