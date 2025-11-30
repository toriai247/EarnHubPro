
import React, { useEffect, useState } from 'react';
import GlassCard from '../../components/GlassCard';
import { supabase } from '../../integrations/supabase/client';
import { KycRequest } from '../../types';
import { ShieldCheck, CheckCircle, XCircle, Search, RefreshCw, Loader2, Eye, CreditCard, User, Clock, AlertTriangle, Sparkles, Bot } from 'lucide-react';
import { useUI } from '../../context/UIContext';
import { motion, AnimatePresence } from 'framer-motion';
import { analyzeKYCDocuments } from '../../lib/aiHelper';

const VerificationRequest: React.FC = () => {
  const { toast, confirm } = useUI();
  const [requests, setRequests] = useState<KycRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'pending' | 'approved' | 'rejected'>('pending');
  const [searchTerm, setSearchTerm] = useState('');
  
  // Image Modal
  const [selectedRequest, setSelectedRequest] = useState<KycRequest | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [isRejecting, setIsRejecting] = useState(false);
  
  // AI
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [aiReport, setAiReport] = useState<any>(null);

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    setLoading(true);
    try {
        const { data: reqs, error } = await supabase
            .from('kyc_requests')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;

        if (reqs) {
            // Fetch User profiles
            const userIds = Array.from(new Set(reqs.map((r: any) => r.user_id)));
            const { data: profiles } = await supabase.from('profiles').select('*').in('id', userIds);
            const profileMap = new Map(profiles?.map((p: any) => [p.id, p]));

            const fullData = reqs.map((r: any) => ({
                ...r,
                profile: profileMap.get(r.user_id)
            }));
            setRequests(fullData);
        }
    } catch (e: any) {
        toast.error("Failed to load: " + e.message);
    } finally {
        setLoading(false);
    }
  };

  const runAICheck = async () => {
      if (!selectedRequest) return;
      setIsAnalyzing(true);
      setAiReport(null);
      
      try {
          toast.info("Gemini Vision AI is analyzing documents...");
          const result = await analyzeKYCDocuments(
              selectedRequest.front_image_url,
              selectedRequest.back_image_url,
              selectedRequest.full_name
          );
          setAiReport(result);
          
          if (result.name_match) toast.success("Name Matched Successfully");
          else toast.warning("Possible Name Mismatch detected by AI");

      } catch (e) {
          toast.error("AI Check Failed");
      } finally {
          setIsAnalyzing(false);
      }
  };

  const handleAction = async (id: string, status: 'approved' | 'rejected', note?: string) => {
      if (status === 'approved') {
          if (!await confirm("Approve this KYC request? User will get verified status.", "Confirm Verification")) return;
      }

      try {
          const { error } = await supabase.from('kyc_requests').update({
              status,
              admin_note: note || (aiReport ? `AI Report: ${aiReport.notes}` : ''),
              updated_at: new Date().toISOString()
          }).eq('id', id);

          if (error) throw error;

          // Note: Trigger in DB will automatically update profiles.is_kyc_1 if Approved.
          
          // Send notification
          const req = requests.find(r => r.id === id);
          if (req) {
              await supabase.from('notifications').insert({
                  user_id: req.user_id,
                  title: status === 'approved' ? 'KYC Verified! ✅' : 'KYC Rejected ❌',
                  message: status === 'approved' 
                    ? 'Congratulations! Your identity verification is complete.' 
                    : `Your KYC verification was rejected. Reason: ${note}`,
                  type: status === 'approved' ? 'success' : 'error'
              });
          }

          toast.success(`Request ${status}`);
          fetchRequests();
          setSelectedRequest(null);
          setIsRejecting(false);
          setRejectReason('');
          setAiReport(null);

      } catch (e: any) {
          toast.error("Action failed: " + e.message);
      }
  };

  const filteredRequests = requests.filter(r => {
      const matchesFilter = r.status === filter;
      const matchesSearch = 
        r.full_name.toLowerCase().includes(searchTerm.toLowerCase()) || 
        r.profile?.email_1.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.id_number.includes(searchTerm);
      return matchesFilter && matchesSearch;
  });

  return (
    <div className="space-y-6 animate-fade-in pb-20">
        
        {/* Header */}
        <div className="flex justify-between items-center">
            <div>
                <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                    <ShieldCheck className="text-neon-green" /> Verification Center
                </h2>
                <p className="text-gray-400 text-sm">Review identity documents and KYC status.</p>
            </div>
            <button onClick={fetchRequests} className="p-2 bg-white/10 rounded-lg hover:bg-white/20 text-white transition">
                <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
            </button>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4 justify-between items-center bg-white/5 p-2 rounded-xl border border-white/5">
            <div className="flex gap-2 w-full sm:w-auto">
                {['pending', 'approved', 'rejected'].map(f => (
                    <button
                        key={f}
                        onClick={() => setFilter(f as any)}
                        className={`px-4 py-2 rounded-lg text-xs font-bold uppercase transition flex-1 sm:flex-none ${filter === f ? 'bg-white text-black' : 'text-gray-400 hover:text-white'}`}
                    >
                        {f}
                    </button>
                ))}
            </div>
            <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
                <input 
                    type="text" 
                    placeholder="Search name, email, ID..." 
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    className="w-full bg-black/30 border border-white/10 rounded-lg pl-9 pr-3 py-2 text-sm text-white focus:border-neon-green outline-none"
                />
            </div>
        </div>

        {/* List */}
        {loading ? (
            <div className="text-center py-20"><Loader2 className="animate-spin mx-auto text-blue-400" size={32} /></div>
        ) : filteredRequests.length === 0 ? (
            <div className="text-center py-20 bg-white/5 rounded-2xl border border-white/5">
                <ShieldCheck size={48} className="text-gray-600 mx-auto mb-4" />
                <p className="text-gray-500">No {filter} requests found.</p>
            </div>
        ) : (
            <div className="grid grid-cols-1 gap-4">
                {filteredRequests.map(req => (
                    <GlassCard key={req.id} className="flex flex-col md:flex-row gap-6 relative overflow-hidden">
                        
                        {/* Status Stripe */}
                        <div className={`absolute left-0 top-0 bottom-0 w-1 ${req.status === 'approved' ? 'bg-green-500' : req.status === 'rejected' ? 'bg-red-500' : 'bg-yellow-500'}`}></div>

                        {/* User Info */}
                        <div className="md:w-1/4 space-y-2 border-b md:border-b-0 md:border-r border-white/10 pb-4 md:pb-0 md:pr-4 pl-3">
                            <div className="flex items-center gap-3">
                                <img src={req.profile?.avatar_1 || `https://api.dicebear.com/7.x/avataaars/svg?seed=${req.full_name}`} className="w-10 h-10 rounded-full bg-black/30" />
                                <div>
                                    <p className="text-white font-bold text-sm">{req.profile?.name_1 || 'Unknown'}</p>
                                    <p className="text-[10px] text-gray-500">{req.profile?.email_1}</p>
                                </div>
                            </div>
                            <div className="bg-black/20 p-2 rounded border border-white/5 mt-2">
                                <p className="text-[10px] text-gray-500 uppercase font-bold">Document Info</p>
                                <p className="text-white text-xs font-mono">{req.full_name}</p>
                                <p className="text-blue-400 text-xs capitalize">{req.id_type.replace('_', ' ')}</p>
                                <p className="text-gray-400 text-xs">{req.id_number}</p>
                            </div>
                            <p className="text-[10px] text-gray-500 flex items-center gap-1">
                                <Clock size={10}/> {new Date(req.created_at).toLocaleString()}
                            </p>
                        </div>

                        {/* Images Preview */}
                        <div className="flex-1 grid grid-cols-2 gap-4">
                            <div 
                                className="relative bg-black/40 rounded-lg overflow-hidden h-32 border border-white/10 group cursor-pointer"
                                onClick={() => setSelectedRequest(req)}
                            >
                                <img src={req.front_image_url} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition" />
                                <div className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 transition">
                                    <Eye className="text-white" />
                                </div>
                                <span className="absolute bottom-1 left-2 text-[9px] bg-black/70 px-1 rounded text-white">FRONT</span>
                            </div>
                            <div 
                                className="relative bg-black/40 rounded-lg overflow-hidden h-32 border border-white/10 group cursor-pointer"
                                onClick={() => setSelectedRequest(req)}
                            >
                                <img src={req.back_image_url} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition" />
                                <div className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 transition">
                                    <Eye className="text-white" />
                                </div>
                                <span className="absolute bottom-1 left-2 text-[9px] bg-black/70 px-1 rounded text-white">BACK</span>
                            </div>
                        </div>

                        {/* Actions */}
                        <div className="flex flex-col justify-center gap-2 md:w-[140px]">
                            {req.status === 'pending' ? (
                                <>
                                    <button 
                                        onClick={() => handleAction(req.id, 'approved')}
                                        className="py-3 bg-green-500/20 text-green-400 font-bold rounded-xl hover:bg-green-500 hover:text-black transition flex items-center justify-center gap-2 border border-green-500/30"
                                    >
                                        <CheckCircle size={16} /> Approve
                                    </button>
                                    <button 
                                        onClick={() => { setSelectedRequest(req); setIsRejecting(true); }}
                                        className="py-3 bg-red-500/10 text-red-400 font-bold rounded-xl hover:bg-red-500/20 transition flex items-center justify-center gap-2 border border-red-500/20"
                                    >
                                        <XCircle size={16} /> Reject
                                    </button>
                                </>
                            ) : (
                                <div className={`text-center p-2 rounded-xl border ${req.status === 'approved' ? 'bg-green-900/20 border-green-500/30 text-green-400' : 'bg-red-900/20 border-red-500/30 text-red-400'}`}>
                                    <p className="text-xs font-bold uppercase">{req.status}</p>
                                    {req.admin_note && <p className="text-[10px] mt-1 italic opacity-70">"{req.admin_note}"</p>}
                                </div>
                            )}
                        </div>

                    </GlassCard>
                ))}
            </div>
        )}

        {/* Modal */}
        <AnimatePresence>
            {selectedRequest && (
                <motion.div 
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-md flex items-center justify-center p-4"
                    onClick={() => { setSelectedRequest(null); setIsRejecting(false); setAiReport(null); }}
                >
                    <motion.div 
                        initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }}
                        className="bg-dark-900 w-full max-w-4xl rounded-2xl border border-white/10 p-6 max-h-[90vh] overflow-y-auto"
                        onClick={e => e.stopPropagation()}
                    >
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-bold text-white">{selectedRequest.full_name} - Documents</h3>
                            <button onClick={() => setSelectedRequest(null)} className="text-gray-400 hover:text-white"><XCircle size={24}/></button>
                        </div>

                        {/* AI Report Section */}
                        {aiReport && (
                            <div className={`p-4 rounded-xl border mb-6 flex items-start gap-3 ${aiReport.name_match ? 'bg-green-500/10 border-green-500/30' : 'bg-yellow-500/10 border-yellow-500/30'}`}>
                                <Bot size={20} className={aiReport.name_match ? "text-green-400" : "text-yellow-400"} />
                                <div>
                                    <h4 className={`font-bold text-sm uppercase ${aiReport.name_match ? "text-green-400" : "text-yellow-400"}`}>
                                        AI Analysis: {aiReport.name_match ? 'PASSED' : 'CAUTION'}
                                    </h4>
                                    <p className="text-xs text-gray-300 mt-1">{aiReport.notes}</p>
                                    <div className="mt-2 text-[10px] bg-black/20 p-2 rounded inline-block font-mono text-gray-400">
                                        Extracted: {aiReport.extracted_name} | Doc Type: {aiReport.document_type} | Risk: {aiReport.risk_score}/100
                                    </div>
                                </div>
                            </div>
                        )}

                        <div className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <p className="text-center text-sm text-gray-400 mb-2 uppercase font-bold">Front Side</p>
                                    <img src={selectedRequest.front_image_url} className="w-full rounded-xl border border-white/10" />
                                </div>
                                <div>
                                    <p className="text-center text-sm text-gray-400 mb-2 uppercase font-bold">Back Side</p>
                                    <img src={selectedRequest.back_image_url} className="w-full rounded-xl border border-white/10" />
                                </div>
                            </div>

                            {selectedRequest.status === 'pending' && !isRejecting && (
                                <div className="flex gap-4 justify-center pt-4">
                                    <button 
                                        onClick={runAICheck}
                                        disabled={isAnalyzing}
                                        className="px-6 py-3 bg-purple-600 text-white font-bold rounded-xl hover:bg-purple-500 flex items-center gap-2 shadow-lg shadow-purple-600/30"
                                    >
                                        {isAnalyzing ? <Loader2 className="animate-spin" size={18}/> : <Sparkles size={18}/>} AI Check
                                    </button>
                                    <button onClick={() => handleAction(selectedRequest.id, 'approved')} className="px-8 py-3 bg-green-500 text-black font-bold rounded-xl hover:bg-green-400">Approve KYC</button>
                                    <button onClick={() => setIsRejecting(true)} className="px-8 py-3 bg-red-500/20 text-red-400 font-bold rounded-xl hover:bg-red-500/30">Reject</button>
                                </div>
                            )}

                            {isRejecting && (
                                <div className="bg-red-500/10 border border-red-500/30 p-4 rounded-xl mt-4">
                                    <h4 className="text-red-400 font-bold text-sm mb-3 uppercase">Reject Verification</h4>
                                    <div className="grid grid-cols-2 gap-2 mb-3">
                                        {['Blurred Images', 'Name Mismatch', 'Expired Document', 'Invalid Document Type', 'Suspected Fraud'].map(r => (
                                            <button 
                                                key={r} 
                                                onClick={() => setRejectReason(r)}
                                                className={`text-left px-3 py-2 rounded-lg text-xs font-bold transition border ${rejectReason === r ? 'bg-red-500 text-white border-red-600' : 'bg-white/5 text-gray-300 border-white/5 hover:bg-white/10'}`}
                                            >
                                                {r}
                                            </button>
                                        ))}
                                    </div>
                                    <textarea 
                                        placeholder="Other reason..." 
                                        value={rejectReason}
                                        onChange={e => setRejectReason(e.target.value)}
                                        className="w-full bg-black/30 border border-white/10 rounded-xl p-3 text-white text-sm mb-3 focus:border-red-500 outline-none"
                                    />
                                    <div className="flex gap-3">
                                        <button onClick={() => setIsRejecting(false)} className="flex-1 py-3 bg-white/10 text-white rounded-xl font-bold">Cancel</button>
                                        <button 
                                            onClick={() => handleAction(selectedRequest.id, 'rejected', rejectReason)}
                                            disabled={!rejectReason}
                                            className="flex-1 py-3 bg-red-600 text-white rounded-xl font-bold hover:bg-red-500 disabled:opacity-50"
                                        >
                                            Confirm Reject
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>

    </div>
  );
};

export default VerificationRequest;
