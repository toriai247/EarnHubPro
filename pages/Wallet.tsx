
import React, { useEffect, useState } from 'react';
import GlassCard from '../components/GlassCard';
import { 
    ArrowDownLeft, ArrowUpRight, ArrowRightLeft, RefreshCw, 
    Wallet as WalletIcon, PieChart, Info, ShieldCheck, 
    Gamepad2, Users, Briefcase, TrendingUp, Gift, CreditCard, Banknote, Clock, Loader2
} from 'lucide-react';
import { WalletData, Activity } from '../types';
import { supabase } from '../integrations/supabase/client';
import { createUserProfile, syncWalletTotals } from '../lib/actions';
import { Link } from 'react-router-dom';
import BalanceDisplay from '../components/BalanceDisplay';
import { useUI } from '../context/UIContext';

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
             
             // 1. Fetch Completed Transactions
             const { data: txData } = await supabase.from('transactions')
                .select('*')
                .eq('user_id', session.user.id)
                .order('created_at', {ascending: false});

             // 2. Fetch Pending Deposits
             const { data: pendingDep } = await supabase.from('deposit_requests')
                .select('*')
                .eq('user_id', session.user.id)
                .eq('status', 'pending');

             // 3. Fetch Pending Withdrawals
             const { data: pendingWd } = await supabase.from('withdraw_requests')
                .select('*')
                .eq('user_id', session.user.id)
                .eq('status', 'pending');

             const mixedActivities: Activity[] = [];

             // Add Pending Items First
             pendingDep?.forEach((d: any) => {
                 mixedActivities.push({
                     id: `p_dep_${d.id}`,
                     title: `Deposit (${d.method_name})`,
                     type: 'deposit',
                     amount: d.amount,
                     time: d.created_at,
                     timestamp: new Date(d.created_at).getTime(),
                     status: 'pending'
                 });
             });

             pendingWd?.forEach((w: any) => {
                 mixedActivities.push({
                     id: `p_wd_${w.id}`,
                     title: `Withdraw (${w.method})`,
                     type: 'withdraw',
                     amount: w.amount,
                     time: w.created_at,
                     timestamp: new Date(w.created_at).getTime(),
                     status: 'pending'
                 });
             });

             // Add Completed Transactions
             if (txData) {
                 txData.forEach((t: any) => {
                     mixedActivities.push({
                        id: t.id, 
                        title: t.description || t.type, 
                        type: t.type, 
                        amount: t.amount,
                        time: t.created_at, 
                        timestamp: new Date(t.created_at).getTime(), 
                        status: t.status
                     });
                 });
             }

             // Sort all by date descending
             mixedActivities.sort((a, b) => b.timestamp - a.timestamp);
             setActivities(mixedActivities);
           }
       } catch (e) {}
    }
    setLoading(false);
  };

  const handleSync = async () => {
      setSyncing(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
          await syncWalletTotals(session.user.id);
          toast.success("Wallet Synchronized Successfully");
          await fetchData();
      }
      setSyncing(false);
  };

  // Wallet Configuration for UI
  const walletConfig = [
      { key: 'deposit_balance', label: 'Deposit Funds', icon: ArrowDownLeft, color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/20' },
      { key: 'game_balance', label: 'Game Winnings', icon: Gamepad2, color: 'text-purple-400', bg: 'bg-purple-500/10', border: 'border-purple-500/20' },
      { key: 'earning_balance', label: 'Task Earnings', icon: Briefcase, color: 'text-yellow-400', bg: 'bg-yellow-500/10', border: 'border-yellow-500/20' },
      { key: 'referral_balance', label: 'Ref Commission', icon: Users, color: 'text-pink-400', bg: 'bg-pink-500/10', border: 'border-pink-500/20' },
      { key: 'investment_balance', label: 'Invested Assets', icon: TrendingUp, color: 'text-orange-400', bg: 'bg-orange-500/10', border: 'border-orange-500/20' },
      { key: 'bonus_balance', label: 'Bonus Balance', icon: Gift, color: 'text-cyan-400', bg: 'bg-cyan-500/10', border: 'border-cyan-500/20' },
  ];

  if (loading) return <div className="p-10"><Loader2 className="animate-spin mx-auto text-white"/></div>;

  return (
    <div className="pb-24 sm:pl-20 sm:pt-6 space-y-6 px-4 sm:px-0">
      <header className="flex justify-between items-center pt-4">
         <div>
             <h1 className="text-2xl font-bold text-main">My Assets</h1>
             <p className="text-xs text-muted">Total Portfolio Value</p>
         </div>
         <button 
            onClick={handleSync} 
            className="p-2 bg-input rounded-xl text-muted hover:text-white border border-border-base transition flex items-center gap-2 text-xs font-bold"
            disabled={syncing}
         >
             <RefreshCw size={16} className={syncing ? 'animate-spin' : ''} /> {syncing ? 'Syncing...' : 'Sync'}
         </button>
      </header>

      {/* Main Asset Card */}
      <GlassCard className="bg-card p-6 border-l-4 border-l-brand relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none">
              <PieChart size={100} className="text-white"/>
          </div>
          <p className="text-muted text-xs font-bold uppercase mb-1 flex items-center gap-2">
              <ShieldCheck size={14} className="text-brand"/> Total Asset Value
          </p>
          <h1 className="text-4xl font-black text-main mb-6 tracking-tight">
              <BalanceDisplay amount={wallet?.balance || 0} />
          </h1>
          
          <div className="flex gap-2">
             <Link to="/deposit" className="flex-1 py-3 bg-brand text-white font-bold text-sm rounded-xl flex items-center justify-center gap-2 hover:opacity-90 shadow-lg shadow-brand/20">
                <ArrowDownLeft size={16} /> Deposit
             </Link>
             <Link to="/withdraw" className="flex-1 py-3 bg-input text-main font-bold text-sm rounded-xl flex items-center justify-center gap-2 hover:bg-border-base border border-border-base">
                <ArrowUpRight size={16} /> Withdraw
             </Link>
             <Link to="/transfer" className="flex-1 py-3 bg-input text-main font-bold text-sm rounded-xl flex items-center justify-center gap-2 hover:bg-border-base border border-border-base">
                <ArrowRightLeft size={16} /> Transfer
             </Link>
          </div>
      </GlassCard>

      {/* Wallet Breakdown */}
      <div>
          <h3 className="text-sm font-bold text-main uppercase mb-3 flex items-center gap-2">
              <WalletIcon size={16} className="text-muted"/> Wallet Breakdown
          </h3>
          
          <div className="grid grid-cols-2 gap-3">
              {/* Main Wallet (Special Highlight) */}
              <div className="col-span-2 bg-gradient-to-r from-green-900/40 to-black p-4 rounded-xl border border-green-500/30 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                      <div className="p-3 bg-green-500/20 rounded-full text-green-400">
                          <Banknote size={24} />
                      </div>
                      <div>
                          <p className="text-xs text-green-400 uppercase font-bold">Withdraw Wallet (Main)</p>
                          <p className="text-2xl font-bold text-white font-mono"><BalanceDisplay amount={wallet?.main_balance || 0} /></p>
                      </div>
                  </div>
                  <div className="hidden sm:block text-right">
                      <p className="text-[10px] text-gray-500">Liquid Funds</p>
                      <Link to="/withdraw" className="text-xs font-bold text-green-400 hover:underline">Cash Out</Link>
                  </div>
              </div>

              {/* Other Wallets */}
              {walletConfig.map((item, i) => {
                  // @ts-ignore
                  const val = wallet?.[item.key] || 0;
                  const hasFunds = val > 0;

                  return (
                      <div 
                        key={i} 
                        className={`p-4 rounded-xl border transition-all ${item.bg} ${item.border} ${hasFunds ? 'opacity-100 shadow-md' : 'opacity-60 grayscale-[0.5]'}`}
                      >
                          <div className="flex justify-between items-start mb-2">
                              <item.icon size={20} className={item.color} />
                              {!hasFunds && <span className="text-[9px] bg-black/20 px-1.5 py-0.5 rounded text-gray-400">Empty</span>}
                          </div>
                          <p className={`text-[10px] uppercase font-bold mb-0.5 ${item.color}`}>{item.label}</p>
                          <p className="text-lg font-bold text-main font-mono"><BalanceDisplay amount={val} /></p>
                      </div>
                  )
              })}
          </div>
      </div>

      {/* Transactions */}
      <div>
        <h3 className="text-sm font-bold text-main uppercase mb-3">Live Activity</h3>
        <div className="space-y-2">
           {activities.length === 0 ? <p className="text-muted text-sm bg-input p-4 rounded-xl text-center">No transactions yet.</p> : activities.map((tx) => (
               <div key={tx.id} className={`flex justify-between items-center p-3 rounded-xl transition-colors border ${tx.status === 'pending' ? 'bg-yellow-500/10 border-yellow-500/30' : 'bg-card border-border-base hover:bg-input'}`}>
                   <div className="flex items-center gap-3">
                       <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                           tx.status === 'pending' ? 'bg-yellow-500/20 text-yellow-400 animate-pulse' :
                           ['deposit','earn','bonus'].includes(tx.type) ? 'bg-green-500/20 text-green-400' : 'bg-white/5 text-gray-400'
                       }`}>
                           {tx.status === 'pending' ? <Clock size={16}/> : tx.type.charAt(0).toUpperCase()}
                       </div>
                       <div>
                           <p className="text-xs font-bold text-main uppercase flex items-center gap-2">
                               {tx.title}
                               {tx.status === 'pending' && <span className="text-[9px] bg-yellow-500/20 text-yellow-400 px-1.5 py-0.5 rounded">PENDING</span>}
                           </p>
                           <p className="text-[10px] text-muted">{new Date(tx.time).toLocaleDateString()} • {new Date(tx.time).toLocaleTimeString()}</p>
                       </div>
                   </div>
                   <span className={`text-xs font-mono font-bold ${['withdraw', 'game_loss', 'penalty'].includes(tx.type) ? 'text-red-400' : 'text-green-400'}`}>
                       {['withdraw', 'game_loss', 'penalty'].includes(tx.type) ? '-' : '+'}<BalanceDisplay amount={tx.amount} />
                   </span>
               </div>
           ))}
        </div>
      </div>
    </div>
  );
};

export default Wallet;
