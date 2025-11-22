import React, { useEffect, useState } from 'react';
import GlassCard from '../../components/GlassCard';
import { supabase } from '../../integrations/supabase/client';
import { DepositRequest } from '../../types';
import { Eye, CheckCircle, XCircle, Loader2, RefreshCw, Search, DollarSign, AlertTriangle, ArrowRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useUI } from '../../context/UIContext';

const MotionDiv = motion.div as any;

const DepositApprove: React.FC = () => {
  const { toast } = useUI();
  const [requests, setRequests] = useState<DepositRequest[]>([]);
  const [filteredRequests, setFilteredRequests] = useState<DepositRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [viewImage, setViewImage] = useState<string | null>(null);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Stats
  const [totalPending, setTotalPending] = useState(0);
  const [pendingCount, setPendingCount] = useState(0);

  // Reject Modal
  const [rejectId, setRejectId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('Transaction ID invalid');

  useEffect(() => {
    fetchRequests();
  }, []);

  useEffect(() => {
      const filtered = requests.filter(req => 
          req.transaction_id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          req.sender_number?.includes(searchTerm) ||
          req.amount.toString().includes(searchTerm)
      );
      setFilteredRequests(filtered);
  }, [searchTerm, requests]);

  const fetchRequests = async () => {
    setIsLoading(true);
    const { data, error } = await supabase
        .from('deposit_requests')
        .select('*')
        .eq('status', 'pending')
        .order('created_at', { ascending: false });
        
    if (data) {
        const reqs = data as DepositRequest[];
        setRequests(reqs);
        setFilteredRequests(reqs);
        
        // Calculate Stats
        setPendingCount(reqs.length);
        setTotalPending(reqs.reduce((sum, r) => sum + r.amount, 0));
    }
    setIsLoading(false);
  };

  const handleProcess = async (id: string, status: 'approved' | 'rejected', note?: string) => {
      if (processingId) return;
      setProcessingId(id);

      try {
          // Call the New "Super Function" (admin_process_deposit)
          const { data, error } = await supabase.rpc('admin_process_deposit', {
              p_request_id: id,
              p_status: status,
              p_admin_note: note || (status === 'approved' ? 'Approved by Admin' : 'Rejected')
          });

          if (error) throw error;
          if (data && data.success === false) throw new Error(data.message);

          // Success UI Feedback
          setRequests(prev => prev.filter(r => r.id !== id));
          setRejectId(null);
          
          if (status === 'approved') {
              toast.success("Deposit Approved! Commission Sent.");
          } else {
              toast.info("Deposit Rejected.");
          }
          
          // Update Stats
          const req = requests.find(r => r.id === id);
          if (req) {
              setTotalPending(prev => prev - req.amount);
              setPendingCount(prev => prev - 1);
          }

      } catch (e: any) {
          console.error(e);
          toast.error(`Error: ${e.message || 'Operation failed'}`);
      } finally {
          setProcessingId(null);
      }
  };

  return (
    <div className="space-y-6 animate-fade-in">
        
        {/* HEADER & STATS */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2">
                <h2 className="text-2xl font-display font-bold text-white mb-2">Deposit Control</h2>
                <p className="text-gray-400 text-sm">Manage incoming fund requests and verifications.</p>
            </div>
            <GlassCard className="bg-gradient-to-r from-blue-900/40 to-royal-900/40 border-royal-500/30 flex items-center justify-between">
                <div>
                    <p className="text-[10px] text-blue-300 font-bold uppercase">Total Pending</p>
                    <p className="text-2xl font-bold text-white">${totalPending.toLocaleString()}</p>
                </div>
                <div className="text-right">
                    <p className="text-[10px] text-blue-300 font-bold uppercase">Requests</p>
                    <p className="text-2xl font-bold text-white">{pendingCount}</p>
                </div>
            </GlassCard>
        </div>

        {/* TOOLBAR */}
        <div className="flex gap-3">
            <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
                <input 
                    type="text" 
                    placeholder="Search TrxID, Amount, or Number..." 
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-white focus:border-neon-green outline-none"
                />
            </div>
            <button onClick={fetchRequests} className="px-4 bg-white/10 rounded-xl hover:bg-white/20 text-white transition">
                <RefreshCw size={20} className={isLoading ? "animate-spin" : ""} />
            </button>
        </div>
        
        {/* LIST */}
        {isLoading ? (
             <div className="text-center py-20">
                 <Loader2 className="animate-spin mx-auto text-neon-green mb-2" size={32} />
                 <p className="text-gray-500">Loading blockchain data...</p>
             </div>
        ) : filteredRequests.length === 0 ? (
             <div className="bg-white/5 border border-dashed border-white/10 p-12 rounded-2xl text-center">
                 <div className="w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
                    <CheckCircle size={32} className="text-green-500" />
                 </div>
                 <h3 className="text-white font-bold text-lg">All Clear!</h3>
                 <p className="text-gray-500 text-sm">No pending deposit requests found.</p>
             </div>
        ) : (
            <div className="space-y-4">
                {filteredRequests.map(req => (
                    <MotionDiv 
                        layout
                        initial={{ opacity: 0, y: 20 }} 
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        key={req.id}
                    >
                        <GlassCard className="relative overflow-hidden border-l-4 border-l-neon-green">
                            <div className="flex flex-col lg:flex-row gap-6">
                                
                                {/* Left: Amount & Method */}
                                <div className="shrink-0 flex flex-col justify-center items-center lg:items-start min-w-[120px] text-center lg:text-left border-b lg:border-b-0 lg:border-r border-white/10 pb-4 lg:pb-0 lg:pr-6">
                                    <span className="bg-white/10 text-white text-[10px] font-bold px-2 py-1 rounded uppercase mb-2 tracking-wider">
                                        {req.method_name}
                                    </span>
                                    <div className="text-3xl font-bold text-neon-green tracking-tight flex items-center gap-1">
                                        <span className="text-lg text-gray-500">$</span>{req.amount.toLocaleString()}
                                    </div>
                                    <p className="text-[10px] text-gray-500 mt-1">{new Date(req.created_at).toLocaleDateString()}</p>
                                </div>

                                {/* Middle: Details */}
                                <div className="flex-1 space-y-3">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                        <div className="bg-black/30 p-3 rounded-lg border border-white/5">
                                            <p className="text-[10px] text-gray-500 uppercase font-bold mb-1">Transaction ID</p>
                                            <p className="text-white font-mono text-sm select-all flex items-center gap-2">
                                                {req.transaction_id}
                                            </p>
                                        </div>
                                        <div className="bg-black/30 p-3 rounded-lg border border-white/5">
                                            <p className="text-[10px] text-gray-500 uppercase font-bold mb-1">Sender Number</p>
                                            <p className="text-white font-mono text-sm select-all">{req.sender_number || 'N/A'}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        {req.screenshot_url ? (
                                            <button 
                                                onClick={() => setViewImage(req.screenshot_url || null)}
                                                className="text-xs flex items-center gap-1 text-blue-400 hover:text-blue-300 font-bold bg-blue-500/10 px-3 py-1.5 rounded-lg transition"
                                            >
                                                <Eye size={14} /> View Proof
                                            </button>
                                        ) : (
                                            <span className="text-xs text-gray-500 flex items-center gap-1 bg-white/5 px-3 py-1.5 rounded-lg"><AlertTriangle size={12}/> No Screenshot</span>
                                        )}
                                        <div className="h-1 flex-1 bg-white/5 rounded-full ml-2 overflow-hidden">
                                            <div className="h-full bg-neon-green/30 w-2/3 animate-pulse"></div>
                                        </div>
                                        <span className="text-[10px] text-neon-green font-bold">System Check: OK</span>
                                    </div>
                                </div>

                                {/* Right: Actions */}
                                <div className="flex flex-col justify-center gap-2 min-w-[140px]">
                                    {processingId === req.id ? (
                                        <div className="h-full flex flex-col items-center justify-center bg-white/5 rounded-xl">
                                            <Loader2 className="animate-spin text-neon-green mb-2" />
                                            <span className="text-xs text-gray-400">Processing...</span>
                                        </div>
                                    ) : (
                                        <>
                                            <button 
                                                onClick={() => handleProcess(req.id, 'approved')}
                                                className="flex-1 py-3 bg-neon-green text-black font-bold rounded-xl hover:bg-emerald-400 transition flex items-center justify-center gap-2 shadow-lg shadow-neon-green/20"
                                            >
                                                <CheckCircle size={18} /> Approve
                                            </button>
                                            <button 
                                                onClick={() => setRejectId(req.id)}
                                                className="py-3 bg-red-500/10 text-red-400 font-bold rounded-xl hover:bg-red-500/20 transition flex items-center justify-center gap-2 border border-red-500/20"
                                            >
                                                <XCircle size={18} /> Reject
                                            </button>
                                        </>
                                    )}
                                </div>
                            </div>
                        </GlassCard>
                    </MotionDiv>
                ))}
            </div>
        )}

        {/* Reject Reason Modal */}
        <AnimatePresence>
            {rejectId && (
                <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
                    <MotionDiv 
                        initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                        className="bg-dark-900 border border-red-500/30 w-full max-w-sm rounded-2xl p-6 shadow-2xl"
                    >
                        <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                            <XCircle className="text-red-500" /> Reject Deposit
                        </h3>
                        <label className="text-xs text-gray-400 mb-2 block">Select Reason:</label>
                        <div className="space-y-2 mb-4">
                            {['Transaction ID invalid', 'Payment not received', 'Amount mismatch', 'Duplicate request', 'Fake Screenshot'].map(reason => (
                                <button 
                                    key={reason}
                                    onClick={() => setRejectReason(reason)}
                                    className={`w-full text-left px-4 py-3 rounded-xl text-sm font-medium transition ${rejectReason === reason ? 'bg-red-500 text-white' : 'bg-white/5 text-gray-400 hover:bg-white/10'}`}
                                >
                                    {reason}
                                </button>
                            ))}
                        </div>
                        <div className="flex gap-3">
                            <button onClick={() => setRejectId(null)} className="flex-1 py-3 bg-white/10 text-white rounded-xl font-bold hover:bg-white/20">Cancel</button>
                            <button 
                                onClick={() => handleProcess(rejectId, 'rejected', rejectReason)}
                                className="flex-1 py-3 bg-red-500 text-white rounded-xl font-bold hover:bg-red-600 shadow-lg shadow-red-500/30"
                            >
                                Confirm Reject
                            </button>
                        </div>
                    </MotionDiv>
                </div>
            )}
        </AnimatePresence>

        {/* Image Preview Modal */}
        {viewImage && (
            <div 
                className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-md flex flex-col items-center justify-center p-4"
                onClick={() => setViewImage(null)}
            >
                <img src={viewImage} alt="Proof" className="max-w-full max-h-[80vh] rounded-lg shadow-2xl border border-white/20 mb-6" />
                <button className="px-8 py-3 bg-white/10 rounded-full text-white font-bold hover:bg-white/20 flex items-center gap-2">
                    <XCircle size={20} /> Close Preview
                </button>
            </div>
        )}
    </div>
  );
};

export default DepositApprove;