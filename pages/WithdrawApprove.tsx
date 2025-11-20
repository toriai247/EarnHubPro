
import React, { useEffect, useState } from 'react';
import GlassCard from '../../components/GlassCard';
import { supabase } from '../../integrations/supabase/client';
import { WithdrawRequest } from '../../types';

const WithdrawApprove: React.FC = () => {
  const [withdrawals, setWithdrawals] = useState<WithdrawRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchWithdrawals();
  }, []);

  const fetchWithdrawals = async () => {
    setIsLoading(true);
    const { data } = await supabase.from('withdraw_requests').select('*').eq('status', 'pending').order('created_at', { ascending: false });
    if (data) setWithdrawals(data as WithdrawRequest[]);
    setIsLoading(false);
  };

  const handleProcessWithdrawal = async (id: string, status: 'approved' | 'rejected') => {
      if(!confirm(`Are you sure you want to ${status} this request?`)) return;
      try {
          const { data: request } = await supabase.from('withdraw_requests').select('*').eq('id', id).single();
          if (!request) return;

          await supabase.from('withdraw_requests').update({ status, processed_at: new Date().toISOString() }).eq('id', id);

          const { data: wallet } = await supabase.from('wallets').select('*').eq('user_id', request.user_id).single();
          if (wallet) {
             if (status === 'approved') {
                 await supabase.from('wallets').update({
                    pending_withdraw: Math.max(0, wallet.pending_withdraw - request.amount),
                    balance: Math.max(0, wallet.balance - request.amount)
                 }).eq('user_id', request.user_id);
             } else {
                 await supabase.from('wallets').update({
                    pending_withdraw: Math.max(0, wallet.pending_withdraw - request.amount),
                    withdrawable: wallet.withdrawable + request.amount
                 }).eq('user_id', request.user_id);
             }
          }

          alert('Processed successfully');
          fetchWithdrawals();
      } catch (e) {
          alert('Error processing request');
      }
  };

  return (
    <div className="space-y-4 animate-fade-in">
        <h2 className="text-2xl font-bold text-white">Withdrawal Authorization</h2>
        
        <div className="space-y-3">
            {isLoading ? (
                <div className="text-center p-6 text-gray-500">Loading requests...</div>
            ) : withdrawals.length === 0 ? (
                <div className="text-center p-6 text-gray-500 bg-white/5 rounded-xl">No pending withdrawals.</div>
            ) : (
               withdrawals.map(w => (
                   <GlassCard key={w.id} className="flex justify-between items-center">
                       <div>
                           <p className="font-bold text-white text-sm">Amount: ${w.amount.toFixed(2)}</p>
                           <p className="text-xs text-gray-400">Method: {w.method} • User ID: ...{w.user_id.slice(-4)}</p>
                           <p className="text-[10px] text-gray-500">{new Date(w.created_at).toLocaleString()}</p>
                       </div>
                       <div className="flex gap-2">
                           <button onClick={() => handleProcessWithdrawal(w.id, 'approved')} className="px-3 py-1 bg-green-500 text-black font-bold text-xs rounded hover:bg-green-400">Approve</button>
                           <button onClick={() => handleProcessWithdrawal(w.id, 'rejected')} className="px-3 py-1 bg-red-500/20 text-red-400 font-bold text-xs rounded hover:bg-red-500/30">Reject</button>
                       </div>
                   </GlassCard>
               ))
            )}
        </div>
    </div>
  );
};

export default WithdrawApprove;
