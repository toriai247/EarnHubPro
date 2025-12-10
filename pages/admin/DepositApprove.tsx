
import React, { useEffect, useState } from 'react';
import GlassCard from '../../components/GlassCard';
import { supabase } from '../../integrations/supabase/client';
import { DepositRequest } from '../../types';
import { CheckCircle, XCircle, Loader2, RefreshCw, DollarSign, Banknote, Clock, History, FileText } from 'lucide-react';
import { useUI } from '../../context/UIContext';
import { updateWallet, createTransaction } from '../../lib/actions';
import { motion } from 'framer-motion';

const DepositApprove: React.FC = () => {
  const { toast, confirm } = useUI();
  const [requests, setRequests] = useState<DepositRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'pending' | 'history'>('pending');

  useEffect(() => {
    fetchRequests();
  }, [activeTab]);

  const fetchRequests = async () => {
    setLoading(true);
    let query = supabase
        .from('deposit_requests')
        .select('*')
        .order('created_at', { ascending: false });

    if (activeTab === 'pending') {
        query = query.eq('status', 'pending');
    } else {
        query = query.neq('status', 'pending').limit(50);
    }
    
    const { data } = await query;
    if (data) setRequests(data as DepositRequest[]);
    setLoading(false);
  };

  const handleAction = async (req: DepositRequest, status: 'approved' | 'rejected') => {
      const isApproved = status === 'approved';
      if (!await confirm(`Are you sure you want to ${status.toUpperCase()} this deposit of $${req.amount}?`)) return;

      try {
          // Update Request Status
          const { error } = await supabase.from('deposit_requests').update({
              status,
              processed_at: new Date().toISOString(),
              admin_note: isApproved ? 'Manual Approval' : 'Manual Rejection'
          }).eq('id', req.id);

          if (error) throw error;

          if (isApproved) {
              // Credit Wallet
              await updateWallet(req.user_id, req.amount, 'increment', 'deposit_balance');
              await createTransaction(req.user_id, 'deposit', req.amount, `Deposit via ${req.method_name} (Approved)`);
          }

          toast.success(`Deposit ${status} successfully`);
          fetchRequests();
      } catch (e: any) {
          toast.error("Error: " + e.message);
      }
  };

  return (
    <div className="space-y-6 animate-fade-in">
        
        <div className="flex justify-between items-center">
            <div>
                <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                    <Banknote className="text-neon-green" /> Deposit Manager
                </h2>
                <p className="text-gray-400 text-sm">Review pending deposit requests.</p>
            </div>
            <button onClick={fetchRequests} className="p-2 bg-white/10 rounded-xl hover:bg-white/20 text-white transition">
                <RefreshCw size={20} />
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

        {loading ? (
            <div className="p-10"><Loader2 className="animate-spin mx-auto text-white"/></div>
        ) : (
            <div className="space-y-4">
                {requests.length === 0 ? (
                    <div className="text-center py-12 bg-white/5 rounded-xl border border-white/5 text-gray-500">
                        No {activeTab} deposits found.
                    </div>
                ) : (
                    requests.map((req) => (
                        <GlassCard key={req.id} className={`border ${req.status === 'pending' ? 'border-white/10' : req.status === 'approved' ? 'border-green-500/30 opacity-80' : 'border-red-500/30 opacity-60'}`}>
                            <div className="flex flex-col lg:flex-row gap-6">
                                
                                {/* Details */}
                                <div className="flex-1 space-y-3">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <h3 className="text-lg font-bold text-white flex items-center gap-2">
                                                <DollarSign size={18} className="text-green-400"/> {req.amount.toFixed(2)} USD
                                            </h3>
                                            <p className="text-xs text-gray-400">
                                                Via <span className="text-white font-bold uppercase">{req.method_name}</span> • {new Date(req.created_at).toLocaleString()}
                                            </p>
                                        </div>
                                        <div className="text-right">
                                            <span className={`text-[10px] font-bold uppercase px-2 py-1 rounded ${req.status === 'approved' ? 'bg-green-500/20 text-green-400' : req.status === 'rejected' ? 'bg-red-500/20 text-red-400' : 'bg-yellow-500/20 text-yellow-400'}`}>
                                                {req.status}
                                            </span>
                                            <p className="text-white font-mono text-xs mt-1">{req.user_id}</p>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-3 bg-black/30 p-3 rounded-xl border border-white/5">
                                        <div>
                                            <p className="text-[10px] text-gray-500 uppercase font-bold">Transaction ID</p>
                                            <p className="text-white font-mono text-sm select-all">{req.transaction_id}</p>
                                        </div>
                                        <div>
                                            <p className="text-[10px] text-gray-500 uppercase font-bold">Sender Number</p>
                                            <p className="text-white font-mono text-sm select-all">{req.sender_number}</p>
                                        </div>
                                    </div>

                                    {/* User Note Display */}
                                    {req.user_note && (
                                        <div className="bg-blue-500/5 border border-blue-500/10 p-3 rounded-xl flex gap-2">
                                            <FileText size={14} className="text-blue-400 shrink-0 mt-0.5" />
                                            <div>
                                                <p className="text-[10px] text-blue-300 font-bold uppercase">User Note</p>
                                                <p className="text-xs text-gray-300 italic">"{req.user_note}"</p>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Actions (Only for Pending) */}
                                {req.status === 'pending' && (
                                    <div className="flex flex-col gap-2 justify-center lg:w-40">
                                        <button 
                                            onClick={() => handleAction(req, 'approved')}
                                            className="flex items-center justify-center gap-2 bg-green-600 hover:bg-green-500 text-white px-3 py-2 rounded-lg text-xs font-bold transition shadow-lg shadow-green-900/20"
                                        >
                                            <CheckCircle size={14} /> Approve
                                        </button>
                                        <button 
                                            onClick={() => handleAction(req, 'rejected')}
                                            className="flex items-center justify-center gap-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 px-3 py-2 rounded-lg text-xs font-bold transition border border-red-500/20"
                                        >
                                            <XCircle size={14} /> Reject
                                        </button>
                                    </div>
                                )}
                            </div>
                        </GlassCard>
                    ))
                )}
            </div>
        )}
    </div>
  );
};

export default DepositApprove;
