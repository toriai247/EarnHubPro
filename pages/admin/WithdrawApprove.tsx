
import React, { useEffect, useState } from 'react';
import GlassCard from '../../components/GlassCard';
import { supabase } from '../../integrations/supabase/client';
import { WithdrawRequest } from '../../types';
import { Loader2, CheckCircle, XCircle, RefreshCw, AlertTriangle } from 'lucide-react';
import { useUI } from '../../context/UIContext';

const WithdrawApprove: React.FC = () => {
  const { toast, confirm } = useUI();
  const [withdrawals, setWithdrawals] = useState<WithdrawRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);

  useEffect(() => {
    fetchWithdrawals();
  }, []);

  const fetchWithdrawals = async () => {
    setIsLoading(true);
    const { data } = await supabase
        .from('withdraw_requests')
        .select('*')
        .eq('status', 'pending')
        .order('created_at', { ascending: false });
        
    if (data) setWithdrawals(data as WithdrawRequest[]);
    setIsLoading(false);
  };

  const handleProcess = async (id: string, status: 'approved' | 'rejected') => {
      const isConfirmed = await confirm(`Are you sure you want to ${status.toUpperCase()} this withdrawal request?`, 'Confirm Action');
      if (!isConfirmed) return;
      
      setProcessingId(id);
      try {
          // CALL THE SECURE DATABASE FUNCTION
          const { error } = await supabase.rpc('process_withdrawal_request', {
              request_id: id,
              new_status: status
          });

          if (error) throw error;

          toast.success(`Withdrawal ${status} successfully.`);
          fetchWithdrawals();
      } catch (e: any) {
          console.error(e);
          toast.error('Error processing request: ' + e.message);
      } finally {
          setProcessingId(null);
      }
  };

  return (
    <div className="space-y-6 animate-fade-in">
        <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold text-white">Withdrawal Requests</h2>
            <button onClick={fetchWithdrawals} className="p-2 bg-white/10 rounded-lg hover:bg-white/20"><RefreshCw size={20}/></button>
        </div>
        
        {isLoading ? (
            <div className="text-center p-10 text-gray-500"><Loader2 className="animate-spin mx-auto mb-2"/> Loading...</div>
        ) : withdrawals.length === 0 ? (
            <div className="text-center p-10 text-gray-500 bg-white/5 rounded-xl border border-white/5">
                <CheckCircle size={40} className="mx-auto mb-2 opacity-50"/> No pending withdrawals.
            </div>
        ) : (
           <div className="space-y-3">
               {withdrawals.map(w => (
                   <GlassCard key={w.id} className="flex flex-col md:flex-row justify-between items-center gap-4 border border-white/5">
                       <div className="flex-1 w-full">
                           <div className="flex items-center justify-between md:justify-start gap-4 mb-2">
                                <span className="text-xl font-bold text-white">${w.amount.toFixed(2)}</span>
                                <span className="text-xs bg-purple-500/20 text-purple-300 px-2 py-1 rounded uppercase font-bold">{w.method}</span>
                           </div>
                           <p className="text-xs text-gray-400 font-mono bg-black/30 p-2 rounded border border-white/5 select-all">User ID: {w.user_id}</p>
                           <p className="text-[10px] text-gray-500 mt-1">Requested: {new Date(w.created_at).toLocaleString()}</p>
                       </div>
                       
                       <div className="flex gap-2 w-full md:w-auto">
                           {processingId === w.id ? (
                               <div className="flex-1 px-4 py-2 bg-white/10 rounded text-center"><Loader2 className="animate-spin mx-auto"/></div>
                           ) : (
                               <>
                                   <button 
                                    onClick={() => handleProcess(w.id, 'approved')} 
                                    className="flex-1 px-4 py-2 bg-green-500 text-black font-bold text-xs rounded hover:bg-green-400 transition shadow-lg shadow-green-500/20"
                                   >
                                       Pay & Approve
                                   </button>
                                   <button 
                                    onClick={() => handleProcess(w.id, 'rejected')} 
                                    className="flex-1 px-4 py-2 bg-red-500/10 text-red-400 font-bold text-xs rounded hover:bg-red-500/20 transition border border-red-500/20"
                                   >
                                       Refund & Reject
                                   </button>
                               </>
                           )}
                       </div>
                   </GlassCard>
               ))}
           </div>
        )}
    </div>
  );
};

export default WithdrawApprove;
