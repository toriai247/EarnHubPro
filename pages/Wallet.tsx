
import React, { useEffect, useState } from 'react';
import GlassCard from '../components/GlassCard';
import { ArrowDownLeft, ArrowUpRight, ArrowRightLeft, RefreshCw, Wallet as WalletIcon, PieChart, Info, ShieldCheck } from 'lucide-react';
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
             const { data: txData } = await supabase.from('transactions').select('*').eq('user_id', session.user.id).order('created_at', {ascending: false});
             if (txData) {
                 setActivities(txData.map((t: any) => ({
                    id: t.id, title: t.description || t.type, type: t.type, amount: t.amount,
                    time: t.created_at, timestamp: new Date(t.created_at).getTime(), status: t.status
                 })));
             }
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

  if (loading) return <div className="p-6 text-center text-muted">Loading...</div>;

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

      {/* Detailed Breakdown */}
      <div>
          <h3 className="text-sm font-bold text-main uppercase mb-3 flex items-center gap-2">
              <WalletIcon size={16} className="text-muted"/> Wallet Breakdown
          </h3>
          
          <div className="grid grid-cols-2 gap-3">
              {/* Main Wallet */}
              <div className="bg-gradient-to-br from-green-900/20 to-black p-4 rounded-xl border border-green-500/20">
                  <div className="flex justify-between items-start mb-2">
                      <p className="text-[10px] text-green-400 uppercase font-bold">Main Balance</p>
                      <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                  </div>
                  <p className="text-lg font-bold text-white font-mono"><BalanceDisplay amount={wallet?.main_balance || 0} /></p>
                  <p className="text-[9px] text-gray-500 mt-1">Available for Withdraw</p>
              </div>

              {/* Other Wallets */}
              {[
                  { label: 'Deposit Wallet', val: wallet?.deposit_balance, color: 'text-blue-400', desc: 'Invest/Game Only' },
                  { label: 'Game Winnings', val: wallet?.game_balance, color: 'text-purple-400', desc: 'Transfer to Main' },
                  { label: 'Task Earnings', val: wallet?.earning_balance, color: 'text-yellow-400', desc: 'Transfer to Main' },
                  { label: 'Bonus Balance', val: wallet?.bonus_balance, color: 'text-pink-400', desc: 'Play Games' },
                  { label: 'Invest Capital', val: wallet?.investment_balance, color: 'text-orange-400', desc: 'Locked Assets' },
                  { label: 'Ref Commissions', val: wallet?.referral_balance, color: 'text-cyan-400', desc: 'Transfer to Main' },
              ].map((item, i) => (
                  <div key={i} className="bg-input p-4 rounded-xl border border-border-base hover:border-white/10 transition">
                      <p className={`text-[10px] uppercase font-bold mb-1 ${item.color}`}>{item.label}</p>
                      <p className="text-lg font-bold text-main font-mono"><BalanceDisplay amount={item.val || 0} /></p>
                      <p className="text-[9px] text-gray-500 mt-1">{item.desc}</p>
                  </div>
              ))}
          </div>
      </div>

      <div className="flex items-start gap-3 bg-blue-500/10 p-4 rounded-xl border border-blue-500/20">
          <Info size={18} className="text-blue-400 shrink-0 mt-0.5" />
          <p className="text-xs text-blue-200">
              <strong className="block mb-1 text-blue-400">How to Withdraw?</strong>
              Money in Deposit, Game, or Earning wallets must be <strong>Transferred</strong> to your <strong>Main Balance</strong> before you can withdraw it.
          </p>
      </div>

      <div>
        <h3 className="text-sm font-bold text-main uppercase mb-3">Transaction History</h3>
        <div className="space-y-2">
           {activities.length === 0 ? <p className="text-muted text-sm bg-input p-4 rounded-xl text-center">No transactions yet.</p> : activities.map((tx) => (
               <div key={tx.id} className="flex justify-between items-center p-3 bg-card border border-border-base rounded-xl hover:bg-input transition-colors">
                   <div className="flex items-center gap-3">
                       <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                           ['deposit','earn','bonus'].includes(tx.type) ? 'bg-green-500/20 text-green-400' : 'bg-white/5 text-gray-400'
                       }`}>
                           {tx.type.charAt(0).toUpperCase()}
                       </div>
                       <div>
                           <p className="text-xs font-bold text-main uppercase">{tx.title}</p>
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
