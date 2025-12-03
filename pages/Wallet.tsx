
import React, { useEffect, useState } from 'react';
import GlassCard from '../components/GlassCard';
import { ArrowDownLeft, ArrowUpRight, ArrowRightLeft, RefreshCw } from 'lucide-react';
import { WalletData, Activity } from '../types';
import { supabase } from '../integrations/supabase/client';
import { createUserProfile } from '../lib/actions';
import { Link } from 'react-router-dom';
import BalanceDisplay from '../components/BalanceDisplay';

const Wallet: React.FC = () => {
  const [wallet, setWallet] = useState<WalletData | null>(null);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);

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

  if (loading) return <div className="p-6 text-center text-muted">Loading...</div>;

  return (
    <div className="pb-24 sm:pl-20 sm:pt-6 space-y-6 px-4 sm:px-0">
      <header className="flex justify-between items-center pt-4">
         <h1 className="text-2xl font-bold text-main">Wallet</h1>
         <button onClick={fetchData} className="p-2 bg-input rounded text-muted hover:text-main"><RefreshCw size={20} /></button>
      </header>

      <GlassCard className="bg-card p-6">
          <p className="text-muted text-xs font-bold uppercase mb-1">Total Balance</p>
          <h1 className="text-4xl font-bold text-main mb-6"><BalanceDisplay amount={wallet?.balance || 0} /></h1>
          
          <div className="flex gap-2">
             <Link to="/deposit" className="flex-1 py-3 bg-main text-void font-bold text-sm rounded flex items-center justify-center gap-2 hover:opacity-90">
                <ArrowDownLeft size={16} /> Deposit
             </Link>
             <Link to="/withdraw" className="flex-1 py-3 bg-input text-main font-bold text-sm rounded flex items-center justify-center gap-2 hover:bg-border-base border border-border-base">
                <ArrowUpRight size={16} /> Withdraw
             </Link>
             <Link to="/transfer" className="flex-1 py-3 bg-input text-main font-bold text-sm rounded flex items-center justify-center gap-2 hover:bg-border-base border border-border-base">
                <ArrowRightLeft size={16} /> Transfer
             </Link>
          </div>
      </GlassCard>

      <div className="grid grid-cols-2 gap-3">
          {[
              { label: 'Deposit', val: wallet?.deposit_balance },
              { label: 'Game', val: wallet?.game_balance },
              { label: 'Earnings', val: wallet?.earning_balance },
              { label: 'Bonus', val: wallet?.bonus_balance },
          ].map((item, i) => (
              <div key={i} className="bg-card p-4 rounded border border-border-base">
                  <p className="text-xs text-muted uppercase font-bold">{item.label}</p>
                  <p className="text-lg font-bold text-main font-mono mt-1"><BalanceDisplay amount={item.val || 0} /></p>
              </div>
          ))}
      </div>

      <div>
        <h3 className="text-sm font-bold text-main uppercase mb-3">Transactions</h3>
        <div className="space-y-2">
           {activities.length === 0 ? <p className="text-muted text-sm">No transactions.</p> : activities.map((tx) => (
               <div key={tx.id} className="flex justify-between items-center p-3 bg-card border border-border-base rounded hover:bg-input transition-colors">
                   <div>
                       <p className="text-xs font-bold text-main uppercase">{tx.title}</p>
                       <p className="text-[10px] text-muted">{new Date(tx.time).toLocaleDateString()}</p>
                   </div>
                   <span className={`text-xs font-mono font-bold ${['withdraw', 'game_loss'].includes(tx.type) ? 'text-muted' : 'text-success'}`}>
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
