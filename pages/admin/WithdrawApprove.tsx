
import React, { useEffect, useState } from 'react';
import GlassCard from '../../components/GlassCard';
import { supabase } from '../../integrations/supabase/client';
import { WithdrawRequest } from '../../types';
import { Loader2, CheckCircle, XCircle, RefreshCw, AlertTriangle, Clock, History, CreditCard, Copy } from 'lucide-react';
import { useUI } from '../../context/UIContext';

const WithdrawApprove: React.FC = () => {
  const { toast, confirm } = useUI();
  const [withdrawals, setWithdrawals] = useState<WithdrawRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'pending' | 'history'>('pending');

  useEffect(() => {
    fetchWithdrawals();
  }, [activeTab]);

  const fetchWithdrawals = async () => {
    setIsLoading(true);
    let query = supabase
        .from('withdraw_requests')
        .select('*')
        .order('created_at', { ascending: false });

    if (activeTab === 'pending') {
        query = query.eq('status', 'pending');
    } else {
        query = query.neq('status', 'pending').limit(50);
    }
        
    const { data } = await query;
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

  const copyToClipboard = (text: string) => {
      navigator.clipboard.writeText(text);
      toast.success("Copied to clipboard");
  };

  return (
    <div className="space-y-6">
        <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                <CreditCard size={24} className="text-blue-400" /> Withdrawal Management
            </h2>
            <button onClick={fetchWithdrawals} className="p-2 bg-white/10 rounded-lg hover:bg-white/20 transition">
                <RefreshCw size={20} className={isLoading ? "animate-spin" : ""} />
            </button>
        </div>

        {/* TABS */}
        <div className="flex bg-white/5 p-1 rounded-xl border border-white/10 w-fit">
            <button 
                onClick={() => setActiveTab('pending')}
                className={`flex items-center gap-2 px-6 py-2 rounded-lg text-sm font-bold transition ${activeTab === 'pending' ? 'bg-blue-600 text-white shadow-lg' : 'text-gray-400 hover:text-white'}`}
            >
                <Clock size={16} /> Pending
            </button>
            <button 
                onClick={() => setActiveTab('history')}
                className={`flex items-center gap-2 px-6 py-2 rounded-lg text-sm font-bold transition ${activeTab === 'history' ? 'bg-blue-600 text-white shadow-lg' : 'text-gray-400 hover:text-white'}`}
            >
                <History size={16} /> History
            </button>
        </div>
        
        {isLoading ? (
            <div className="text-center p-10 text-gray-500"><Loader2 className="animate-spin mx-auto mb-2"/> Loading...</div>
        ) : withdrawals.length === 0 ? (
            <div className="text-center p-10 text-gray-500 bg-white/5 rounded-xl border border-white/5">
                <CheckCircle size={40} className="mx-auto mb-2 opacity-50"/> No {activeTab} withdrawals found.
            </div>
        ) : (
           <div className="space-y-3">
               {withdrawals.map(w => (
                   <div key={w.id}>
                       <GlassCard className={`flex flex-col md:flex-row justify-between items-center gap-4 border ${w.status === 'pending' ? 'border-l-4 border-l-blue-500' : w.status === 'approved' ? 'border-l-4 border-l-green-500 opacity-80' : 'border-l-4 border-l-red-500 opacity-60'}`}>
                           <div className="flex-1 w-full">
                               <div className="flex items-center justify-between md:justify-start gap-4 mb-3">
                                    <span className="text-xl font-bold text-white">${w.amount.toFixed(2)}</span>
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs bg-purple-500/20 text-purple-300 px-2 py-1 rounded uppercase font-bold border border-purple-500/30">{w.method}</span>
                                        {w.status !== 'pending' && (
                                            <span className={`text-[10px] px-2 py-1 rounded uppercase font-bold ${w.status === 'approved' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                                                {w.status}
                                            </span>
                                        )}
                                    </div>
                               </div>
                               
                               <div className="bg-black/30 p-2.5 rounded-lg border border-white/5 mb-2 flex items-center justify-between">
                                   <div className="flex items-center gap-2">
                                       <span className="text-xs text-gray-500 font-bold uppercase">To:</span>
                                       <span className="text-white font-mono text-sm font-bold tracking-wide select-all">{w.account_number || 'N/A'}</span>
                                   </div>
                                   {w.account_number && (
                                       <button onClick={() => copyToClipboard(w.account_number!)} className="text-gray-500 hover:text-white transition">
                                           <Copy size={14} />
                                       </button>
                                   )}
                               </div>

                               <p className="text-[10px] text-gray-500 font-mono">User ID: {w.user_id}</p>
                               <div className="flex gap-4 mt-1 text-[10px] text-gray-500">
                                   <span>Requested: {new Date(w.created_at).toLocaleString()}</span>
                                   {w.processed_at && <span>Processed: {new Date(w.processed_at).toLocaleString()}</span>}
                               </div>
                           </div>
                           
                           {w.status === 'pending' && (
                               <div className="flex gap-2 w-full md:w-auto">
                                   {processingId === w.id ? (
                                       <div className="flex-1 px-4 py-2 bg-white/10 rounded text-center"><Loader2 className="animate-spin mx-auto"/></div>
                                   ) : (
                                       <>
                                           <button 
                                            onClick={() => handleProcess(w.id, 'approved')} 
                                            className="flex-1 px-4 py-2 bg-green-500 text-black font-bold text-xs rounded hover:bg-green-400 transition shadow-lg shadow-green-500/20 flex items-center justify-center gap-1"
                                           >
                                               <CheckCircle size={14} /> Pay & Approve
                                           </button>
                                           <button 
                                            onClick={() => handleProcess(w.id, 'rejected')} 
                                            className="flex-1 px-4 py-2 bg-red-500/10 text-red-400 font-bold text-xs rounded hover:bg-red-500/20 transition border border-red-500/20 flex items-center justify-center gap-1"
                                           >
                                               <XCircle size={14} /> Refund & Reject
                                           </button>
                                       </>
                                   )}
                               </div>
                           )}
                       </GlassCard>
                   </div>
               ))}
           </div>
        )}
    </div>
  );
};

export default WithdrawApprove;
