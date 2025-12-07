
import React, { useEffect, useState } from 'react';
import GlassCard from '../../components/GlassCard';
import { supabase } from '../../integrations/supabase/client';
import { KycRequest } from '../../types';
import { ShieldCheck, RefreshCw, Loader2, Eye, XCircle } from 'lucide-react';
import { useUI } from '../../context/UIContext';
import { motion, AnimatePresence } from 'framer-motion';

const VerificationRequest: React.FC = () => {
  const { toast, confirm } = useUI();
  const [requests, setRequests] = useState<KycRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'pending' | 'approved' | 'rejected'>('pending');
  const [selectedRequest, setSelectedRequest] = useState<KycRequest | null>(null);

  useEffect(() => { fetchRequests(); }, []);

  const fetchRequests = async () => {
    setLoading(true);
    try {
        const { data: reqs, error } = await supabase.from('kyc_requests').select('*').order('created_at', { ascending: false });
        if (error) throw error;
        if (reqs) {
            const userIds = Array.from(new Set(reqs.map((r: any) => r.user_id)));
            const { data: profiles } = await supabase.from('profiles').select('*').in('id', userIds);
            const profileMap = new Map(profiles?.map((p: any) => [p.id, p]));
            const fullData = reqs.map((r: any) => ({ ...r, profile: profileMap.get(r.user_id) }));
            setRequests(fullData);
        }
    } catch (e: any) { toast.error(e.message); } finally { setLoading(false); }
  };

  const handleAction = async (id: string, status: 'approved' | 'rejected', note?: string) => {
      if (status === 'approved') {
          if (!await confirm("Approve this KYC request?", "Confirm")) return;
      }
      try {
          await supabase.from('kyc_requests').update({ status, admin_note: note }).eq('id', id);
          if (status === 'approved') {
             const req = requests.find(r => r.id === id);
             if(req) await supabase.from('profiles').update({ is_kyc_1: true }).eq('id', req.user_id);
          }
          toast.success(`Request ${status}`);
          fetchRequests();
          setSelectedRequest(null);
      } catch(e:any) { toast.error(e.message); }
  };

  const filteredRequests = requests.filter(r => r.status === filter); 

  return (
    <div className="space-y-6 animate-fade-in pb-20">
        
        <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                <ShieldCheck className="text-emerald-400" /> KYC Verification
            </h2>
            <button onClick={fetchRequests} className="p-2 bg-white/10 rounded-xl hover:bg-white/20 text-white transition">
                <RefreshCw size={20} />
            </button>
        </div>

        <div className="flex gap-4 border-b border-white/10">
            {['pending', 'approved', 'rejected'].map(f => (
                <button 
                    key={f}
                    onClick={() => setFilter(f as any)}
                    className={`pb-3 text-sm font-bold capitalize relative ${filter === f ? 'text-white' : 'text-gray-500 hover:text-white'}`}
                >
                    {f}
                    {filter === f && <motion.div layoutId="tab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-500" />}
                </button>
            ))}
        </div>

        {loading ? (
            <div className="p-10"><Loader2 className="animate-spin mx-auto text-white"/></div>
        ) : filteredRequests.length === 0 ? (
            <div className="text-center py-12 text-gray-500">No {filter} requests found.</div>
        ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredRequests.map(req => (
                    <GlassCard key={req.id} className="border border-white/10 hover:border-emerald-500/30 transition">
                        <div className="flex justify-between items-start mb-4">
                            <div>
                                <h3 className="font-bold text-white">{req.full_name}</h3>
                                <p className="text-xs text-gray-400">{req.id_type} • {req.id_number}</p>
                            </div>
                            <div className={`px-2 py-1 rounded text-[10px] uppercase font-bold ${req.status === 'pending' ? 'bg-yellow-500/20 text-yellow-400' : req.status === 'approved' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                                {req.status}
                            </div>
                        </div>
                        
                        <div className="flex gap-2">
                            <button 
                                onClick={() => setSelectedRequest(req)}
                                className="flex-1 py-2 bg-white/5 hover:bg-white/10 rounded-lg text-xs font-bold text-white transition flex items-center justify-center gap-2"
                            >
                                <Eye size={14} /> Review Documents
                            </button>
                        </div>
                    </GlassCard>
                ))}
            </div>
        )}
        
        {/* Modal Logic */}
        <AnimatePresence>
            {selectedRequest && (
                <motion.div 
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-md flex items-center justify-center p-4"
                    onClick={() => { setSelectedRequest(null); }}
                >
                    <motion.div 
                        initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }}
                        className="bg-dark-900 w-full max-w-4xl rounded-2xl border border-white/10 p-6 max-h-[90vh] overflow-y-auto"
                        onClick={e => e.stopPropagation()}
                    >
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-bold text-white">{selectedRequest.full_name}</h3>
                            <button onClick={() => setSelectedRequest(null)}><XCircle size={24} className="text-gray-400"/></button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                            <div className="space-y-2">
                                <p className="text-xs font-bold text-gray-400 uppercase">Front Side</p>
                                <img src={selectedRequest.front_image_url} className="rounded-lg border border-white/10 w-full object-cover aspect-video" onClick={() => window.open(selectedRequest.front_image_url)} />
                            </div>
                            <div className="space-y-2">
                                <p className="text-xs font-bold text-gray-400 uppercase">Back Side</p>
                                <img src={selectedRequest.back_image_url} className="rounded-lg border border-white/10 w-full object-cover aspect-video" onClick={() => window.open(selectedRequest.back_image_url)} />
                            </div>
                        </div>

                        <div className="flex gap-4 justify-center">
                            <button onClick={() => handleAction(selectedRequest.id, 'approved')} className="px-6 py-3 bg-green-600 text-white rounded-xl font-bold hover:bg-green-500">Approve</button>
                            <button onClick={() => handleAction(selectedRequest.id, 'rejected', 'Manual Reject')} className="px-6 py-3 bg-red-600 text-white rounded-xl font-bold hover:bg-red-500">Reject</button>
                        </div>

                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    </div>
  );
};

export default VerificationRequest;
