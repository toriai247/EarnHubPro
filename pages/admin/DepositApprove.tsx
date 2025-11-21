
import React, { useEffect, useState } from 'react';
import GlassCard from '../../components/GlassCard';
import { supabase } from '../../integrations/supabase/client';
import { DepositRequest } from '../../types';
import { Eye, CheckCircle, XCircle, Loader2, ShieldAlert, RefreshCw } from 'lucide-react';

const DepositApprove: React.FC = () => {
  const [requests, setRequests] = useState<DepositRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [viewImage, setViewImage] = useState<string | null>(null);
  const [processingId, setProcessingId] = useState<string | null>(null);

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    setIsLoading(true);
    const { data, error } = await supabase
        .from('deposit_requests')
        .select('*')
        .eq('status', 'pending')
        .order('created_at', { ascending: false });
        
    if (data) {
        setRequests(data as DepositRequest[]);
    }
    setIsLoading(false);
  };

  const handleProcess = async (req: DepositRequest, action: 'approved' | 'rejected') => {
      if (processingId) return;
      
      if (!confirm(`Are you sure you want to ${action.toUpperCase()} this deposit of $${req.amount}?`)) return;

      setProcessingId(req.id);

      try {
          // CALL THE SECURE DATABASE FUNCTION
          const { error } = await supabase.rpc('process_deposit_request', {
              request_id: req.id,
              new_status: action,
              admin_notes: action === 'approved' ? 'Processed by Admin' : 'Invalid Proof'
          });

          if (error) throw error;

          alert(`Deposit ${action} successfully.`);
          fetchRequests();

      } catch (e: any) {
          console.error(e);
          alert("Operation Failed: " + (e.message || "Database Error"));
      } finally {
          setProcessingId(null);
      }
  };

  return (
    <div className="space-y-6 animate-fade-in">
        <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold text-white">Deposit Authorization</h2>
            <button onClick={fetchRequests} className="p-2 bg-white/10 rounded-lg hover:bg-white/20"><RefreshCw size={20}/></button>
        </div>
        
        {isLoading ? (
             <div className="text-center py-10 text-gray-500 flex flex-col items-center">
                 <Loader2 className="animate-spin mb-2" />
                 Loading pending requests...
             </div>
        ) : requests.length === 0 ? (
             <div className="bg-white/5 border border-white/10 p-10 rounded-xl text-center flex flex-col items-center">
                 <CheckCircle size={48} className="text-green-500/50 mb-4" />
                 <p className="text-gray-400 font-bold">All Caught Up!</p>
                 <p className="text-xs text-gray-500 mt-1">No pending deposits found.</p>
             </div>
        ) : (
            <div className="grid grid-cols-1 gap-4">
                {requests.map(req => (
                    <GlassCard key={req.id} className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 border border-white/5">
                        <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                                <span className="bg-blue-500/20 text-blue-400 text-xs font-bold px-2 py-1 rounded uppercase">{req.method_name}</span>
                                <span className="text-neon-green font-mono font-bold text-xl">${req.amount.toFixed(2)}</span>
                            </div>
                            <div className="grid grid-cols-2 gap-x-8 gap-y-1 text-sm text-gray-400">
                                <p>TrxID: <span className="text-white font-mono select-all">{req.transaction_id}</span></p>
                                <p>Sender: <span className="text-white font-mono select-all">{req.sender_number}</span></p>
                                <p className="col-span-2 text-xs mt-1 text-gray-500">{new Date(req.created_at).toLocaleString()}</p>
                            </div>
                        </div>
                        
                        <div className="flex items-center gap-3 w-full lg:w-auto border-t lg:border-t-0 border-white/10 pt-4 lg:pt-0">
                            {req.screenshot_url && (
                                <button 
                                    onClick={() => setViewImage(req.screenshot_url || null)} 
                                    className="px-4 py-2 bg-white/5 hover:bg-white/10 rounded-lg text-gray-300 flex items-center gap-2 text-xs font-bold border border-white/10"
                                >
                                    <Eye size={16} /> View Proof
                                </button>
                            )}
                            
                            {processingId === req.id ? (
                                <div className="px-6 py-2 bg-white/10 rounded-lg flex items-center gap-2">
                                    <Loader2 className="animate-spin text-white" size={18} />
                                    <span className="text-xs text-white">Processing...</span>
                                </div>
                            ) : (
                                <>
                                    <button 
                                        onClick={() => handleProcess(req, 'approved')} 
                                        className="flex-1 lg:flex-none px-5 py-2.5 bg-green-500 text-black font-bold rounded-lg hover:bg-green-400 text-xs flex items-center justify-center gap-2 transition shadow-lg shadow-green-500/20"
                                    >
                                        <CheckCircle size={16} /> Approve
                                    </button>
                                    <button 
                                        onClick={() => handleProcess(req, 'rejected')} 
                                        className="flex-1 lg:flex-none px-5 py-2.5 bg-red-500/10 text-red-400 font-bold rounded-lg hover:bg-red-500/20 text-xs flex items-center justify-center gap-2 transition border border-red-500/20"
                                    >
                                        <XCircle size={16} /> Reject
                                    </button>
                                </>
                            )}
                        </div>
                    </GlassCard>
                ))}
            </div>
        )}

        {/* Image Modal */}
        {viewImage && (
            <div className="fixed inset-0 z-[200] bg-black/95 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setViewImage(null)}>
                <div className="relative max-w-4xl max-h-[90vh] w-full flex flex-col items-center">
                    <img src={viewImage} alt="Proof" className="rounded-lg shadow-2xl border border-white/20 max-h-[80vh] object-contain bg-black" />
                    <button onClick={() => setViewImage(null)} className="mt-4 px-6 py-2 bg-white/10 rounded-full text-white hover:bg-white/20 flex items-center gap-2">
                        <XCircle size={20} /> Close Preview
                    </button>
                </div>
            </div>
        )}
    </div>
  );
};

export default DepositApprove;
