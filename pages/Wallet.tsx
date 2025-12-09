
import React, { useEffect, useState } from 'react';
import GlassCard from '../components/GlassCard';
import { 
    ArrowDownLeft, ArrowUpRight, ArrowRightLeft, RefreshCw, 
    Wallet as WalletIcon, PieChart, Send, CreditCard, Banknote, Clock, Loader2
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
             
             // Fetch Recent Transactions
             const { data: txData } = await supabase.from('transactions')
                .select('*')
                .eq('user_id', session.user.id)
                .order('created_at', {ascending: false})
                .limit(10);

             if (txData) {
                 const acts: Activity[] = txData.map((t: any) => ({
                    id: t.id, title: t.description || t.type, type: t.type, amount: t.amount,
                    time: t.created_at, timestamp: new Date(t.created_at).getTime(), status: t.status
                 }));
                 setActivities(acts);
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
          toast.success("Wallet Synchronized");
          await fetchData();
      }
      setSyncing(false);
  };

  if (loading) return <div className="p-10 flex justify-center"><Loader2 className="animate-spin text-brand"/></div>;

  return (
    <div className="pb-24 sm:pl-20 sm:pt-6 space-y-6 px-4 sm:px-0">
      
      {/* Header */}
      <div className="flex justify-between items-center pt-4">
         <h1 className="text-2xl font-bold text-main flex items-center gap-2">
             <WalletIcon className="text-brand"/> My Wallet
         </h1>
         <button onClick={handleSync} className="p-2 bg-card rounded-xl text-muted hover:text-main border border-border-base">
             <RefreshCw size={16} className={syncing ? 'animate-spin' : ''} />
         </button>
      </div>

      {/* Main Asset Card */}
      <GlassCard className="bg-card p-6 border-l-4 border-l-brand relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none">
              <PieChart size={100} className="text-white"/>
          </div>
          <p className="text-muted text-xs font-bold uppercase mb-1">Total Balance</p>
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
          </div>
      </GlassCard>

      {/* Action Grid */}
      <div>
          <h3 className="text-sm font-bold text-muted uppercase mb-3">Actions</h3>
          <div className="grid grid-cols-3 gap-3">
              <Link to="/transfer" className="p-4 bg-card border border-border-base rounded-xl flex flex-col items-center gap-2 hover:bg-input transition">
                  <div className="w-10 h-10 rounded-full bg-purple-500/10 flex items-center justify-center text-purple-500">
                      <RefreshCw size={20} />
                  </div>
                  <span className="text-xs font-bold text-main">Transfer</span>
              </Link>
              <Link to="/send-money" className="p-4 bg-card border border-border-base rounded-xl flex flex-col items-center gap-2 hover:bg-input transition">
                  <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-500">
                      <Send size={20} />
                  </div>
                  <span className="text-xs font-bold text-main">Send</span>
              </Link>
              <Link to="/exchange" className="p-4 bg-card border border-border-base rounded-xl flex flex-col items-center gap-2 hover:bg-input transition">
                  <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-500">
                      <ArrowRightLeft size={20} />
                  </div>
                  <span className="text-xs font-bold text-main">Exchange</span>
              </Link>
          </div>
      </div>

      {/* Transactions */}
      <div>
        <h3 className="text-sm font-bold text-muted uppercase mb-3">Recent Transactions</h3>
        <div className="space-y-2">
           {activities.length === 0 ? <p className="text-muted text-sm bg-input p-4 rounded-xl text-center">No transactions yet.</p> : activities.map((tx) => (
               <div key={tx.id} className="flex justify-between items-center p-3 rounded-xl bg-card border border-border-base">
                   <div className="flex items-center gap-3">
                       <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                           ['deposit','earn'].includes(tx.type) ? 'bg-green-500/20 text-green-500' : 'bg-red-500/20 text-red-500'
                       }`}>
                           {tx.type.charAt(0).toUpperCase()}
                       </div>
                       <div>
                           <p className="text-xs font-bold text-main uppercase">{tx.title}</p>
                           <p className="text-[10px] text-muted">{new Date(tx.time).toLocaleDateString()}</p>
                       </div>
                   </div>
                   <span className={`text-xs font-mono font-bold ${['withdraw', 'game_loss'].includes(tx.type) ? 'text-red-500' : 'text-green-500'}`}>
                       {['withdraw', 'game_loss'].includes(tx.type) ? '-' : '+'}<BalanceDisplay amount={tx.amount} />
                   </span>
               </div>
           ))}
        </div>
      </div>
    </div>
  );
};

export default Wallet;
