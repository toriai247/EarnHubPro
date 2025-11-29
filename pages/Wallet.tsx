




import React, { useEffect, useState } from 'react';
import GlassCard from '../components/GlassCard';
import Loader from '../components/Loader';
import { 
  ArrowDownLeft, ArrowUpRight, Wallet as WalletIcon, ShieldCheck, 
  Zap, Trophy, Gamepad2, Target, TrendingUp, Users, PieChart, Gift, ArrowRightLeft, RefreshCw, AlertCircle, Send
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
          case 'deposit': return { icon: ArrowDownLeft, color: 'text-neo-green', bg: 'bg-neo-green/10', border: 'border-neo-green' };
          case 'withdraw': return { icon: ArrowUpRight, color: 'text-neo-yellow', bg: 'bg-neo-yellow/10', border: 'border-neo-yellow' };
          case 'transfer': return { icon: ArrowRightLeft, color: 'text-electric-400', bg: 'bg-electric-500/10', border: 'border-electric-500' };
          case 'earn': return { icon: Zap, color: 'text-neo-yellow', bg: 'bg-neo-yellow/10', border: 'border-neo-yellow' };
          case 'game_win': return { icon: Trophy, color: 'text-neo-green', bg: 'bg-neo-green/10', border: 'border-neo-green' };
          case 'game_loss': return { icon: Gamepad2, color: 'text-neo-red', bg: 'bg-neo-red/10', border: 'border-neo-red' };
          default: return { icon: WalletIcon, color: 'text-gray-400', bg: 'bg-gray-500/10', border: 'border-gray-500' };
      }
  };

  const subWallets = [
      { id: 'deposit', name: 'Deposit', val: wallet?.deposit_balance, icon: WalletIcon, color: 'text-blue-400', border: 'border-l-4 border-blue-500' },
      { id: 'game', name: 'Game', val: wallet?.game_balance, icon: Gamepad2, color: 'text-purple-400', border: 'border-l-4 border-purple-500' },
      { id: 'earning', name: 'Earnings', val: wallet?.earning_balance, icon: Target, color: 'text-yellow-400', border: 'border-l-4 border-yellow-500' },
      { id: 'invest', name: 'Invest', val: wallet?.investment_balance, icon: TrendingUp, color: 'text-green-400', border: 'border-l-4 border-green-500' },
      { id: 'referral', name: 'Ref', val: wallet?.referral_balance, icon: Users, color: 'text-pink-400', border: 'border-l-4 border-pink-500' },
      { id: 'commission', name: 'Comm', val: wallet?.commission_balance, icon: PieChart, color: 'text-orange-400', border: 'border-l-4 border-orange-500' },
      { id: 'bonus', name: 'Bonus', val: wallet?.bonus_balance, icon: Gift, color: 'text-cyan-400', border: 'border-l-4 border-cyan-500' },
  ];

  if (loading) return <div className="p-10"><Loader /></div>;
  if (error || !wallet) return (
      <div className="p-10 flex flex-col items-center justify-center text-center">
          <AlertCircle className="text-neo-red mb-3" size={40} />
          <h3 className="text-xl font-bold text-white mb-2">Wallet Error</h3>
          <p className="text-gray-400 text-sm mb-6">{error || "Could not load wallet data."}</p>
          <button onClick={fetchData} className="px-6 py-3 bg-white text-black rounded-xl font-bold flex items-center gap-2 border-b-4 border-gray-400 active:border-b-0 active:translate-y-1 transition">
              <RefreshCw size={18} /> Retry
          </button>
      </div>
  );

  return (
    <div className="pb-24 sm:pl-20 sm:pt-6 space-y-8 relative">
      <header className="flex justify-between items-end px-4 sm:px-0">
         <div>
           <h1 className="text-2xl font-display font-black text-white mb-1 uppercase tracking-tight">My Assets</h1>
           <p className="text-gray-400 text-xs font-bold flex items-center gap-2 uppercase">
             <ShieldCheck size={14} className="text-neo-green" /> Multi-Wallet System
           </p>
         </div>
         <button onClick={fetchData} className="p-2 bg-surface border border-border-neo rounded text-gray-400 hover:text-white transition shadow-neo-sm active:shadow-none active:translate-y-0.5">
             <RefreshCw size={20} />
         </button>
      </header>

      {/* MAIN BALANCE CARD */}
      <div className="relative overflow-hidden rounded-xl bg-[#111] border border-border-neo shadow-neo mx-4 sm:mx-0 p-1">
        <div className="relative z-10 bg-gradient-metallic p-8 rounded-lg border border-white/5 text-center">
          <p className="text-gray-500 text-[10px] font-black uppercase tracking-[0.2em] mb-2">Total Net Worth</p>
          <h1 className="text-5xl font-display font-black text-white mb-6 tracking-tighter">
            <BalanceDisplay amount={totalAssets} />
          </h1>
          
          <div className="bg-black/30 px-6 py-3 rounded border border-white/10 max-w-xs mx-auto mb-8 inline-block">
              <p className="text-[9px] text-gray-500 uppercase font-bold mb-1">Main Withdrawable</p>
              <p className="text-xl font-bold text-white font-mono">
                  <BalanceDisplay amount={wallet.main_balance} />
              </p>
          </div>
          
          <div className="grid grid-cols-4 gap-2 px-2 max-w-md mx-auto">
             <Link to="/send-money" className="flex flex-col items-center justify-center bg-surface hover:bg-surface-hover p-2 rounded border border-border-neo group transition active:scale-95">
                <div className="w-9 h-9 rounded bg-cyan-500/10 flex items-center justify-center mb-1 text-cyan-400 border border-cyan-500/30 group-hover:scale-110 transition"><Send size={18} /></div>
                <span className="text-[9px] font-black text-gray-300 uppercase tracking-wide">Send</span>
             </Link>
             <Link to="/deposit" className="flex flex-col items-center justify-center bg-surface hover:bg-surface-hover p-2 rounded border border-border-neo group transition active:scale-95">
                <div className="w-9 h-9 rounded bg-neo-green/10 flex items-center justify-center mb-1 text-neo-green border border-neo-green/30 group-hover:scale-110 transition"><ArrowDownLeft size={18} /></div>
                <span className="text-[9px] font-black text-gray-300 uppercase tracking-wide">Deposit</span>
             </Link>
             <Link to="/transfer" className="flex flex-col items-center justify-center bg-surface hover:bg-surface-hover p-2 rounded border border-border-neo group transition active:scale-95">
                <div className="w-9 h-9 rounded bg-electric-500/10 flex items-center justify-center mb-1 text-electric-400 border border-electric-500/30 group-hover:scale-110 transition"><ArrowRightLeft size={18} /></div>
                <span className="text-[9px] font-black text-gray-300 uppercase tracking-wide">Transfer</span>
             </Link>
             <Link to="/withdraw" className="flex flex-col items-center justify-center bg-surface hover:bg-surface-hover p-2 rounded border border-border-neo group transition active:scale-95">
                <div className="w-9 h-9 rounded bg-neo-yellow/10 flex items-center justify-center mb-1 text-neo-yellow border border-neo-yellow/30 group-hover:scale-110 transition"><ArrowUpRight size={18} /></div>
                <span className="text-[9px] font-black text-gray-300 uppercase tracking-wide">Withdraw</span>
             </Link>
          </div>
        </div>
      </div>

      {/* SUB WALLETS GRID */}
      <div className="px-4 sm:px-0">
          <h3 className="text-sm font-black text-white uppercase tracking-wider mb-4 px-1">Wallet Breakdown</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {subWallets.map((w) => (
                  <GlassCard key={w.id} className={`p-4 ${w.border} bg-surface relative overflow-hidden group hover:bg-surface-hover transition rounded-none`}>
                      <div className="relative z-10">
                          <div className="flex justify-between items-start mb-3">
                              <p className="text-[9px] text-gray-500 uppercase font-bold">{w.name}</p>
                              <w.icon size={14} className={w.color} />
                          </div>
                          <p className={`text-lg font-bold text-white font-mono group-hover:scale-105 transition origin-left`}>
                              <BalanceDisplay amount={w.val || 0} />
                          </p>
                      </div>
                  </GlassCard>
              ))}
          </div>
      </div>

      {/* TRANSACTIONS */}
      <div className="space-y-4 px-4 sm:px-0">
        <h3 className="text-sm font-black text-white uppercase tracking-wider px-1">History</h3>
        <div className="flex items-center gap-2 overflow-x-auto pb-2 no-scrollbar">
           {['all', 'transfer', 'deposit', 'withdraw', 'earn'].map((tab) => (
             <button
               key={tab}
               onClick={() => setActiveTab(tab as any)}
               className={`px-4 py-2 rounded text-xs font-bold uppercase transition whitespace-nowrap border ${
                 activeTab === tab 
                 ? 'bg-white text-black border-white shadow-[2px_2px_0px_0px_#999]' 
                 : 'bg-surface text-gray-500 border-border-neo hover:text-white hover:border-white'
               }`}
             >
               {tab}
             </button>
           ))}
        </div>

        <div className="space-y-2">
           {filteredActivities.length === 0 ? (
              <div className="text-center py-12 text-gray-500 text-sm border-2 border-dashed border-border-neo rounded bg-surface">
                 No transactions found.
              </div>
           ) : (
             filteredActivities.map((tx) => {
                const config = getTxConfig(tx.type);
                return (
                <GlassCard key={tx.id} className="flex items-center justify-between py-3 px-4 group hover:bg-surface-hover transition rounded-none border-l-4 border-l-border-neo hover:border-l-electric-500">
                   <div className="flex items-center gap-4">
                      <div className={`w-10 h-10 rounded flex items-center justify-center border-2 ${config.bg} ${config.color} ${config.border}`}>
                        <config.icon size={18} />
                      </div>
                      <div className="min-w-0">
                        <h4 className="font-bold text-white text-sm capitalize truncate max-w-[150px] sm:max-w-none">{tx.title}</h4>
                        <p className="text-[10px] text-gray-500 font-mono uppercase tracking-wide">{new Date(tx.time).toLocaleString()}</p>
                      </div>
                   </div>
                   <div className="text-right shrink-0">
                      <div className={`font-mono font-bold text-sm ${
                          tx.type === 'withdraw' || tx.type.includes('loss') 
                          ? 'text-white' 
                          : 'text-neo-green'
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
