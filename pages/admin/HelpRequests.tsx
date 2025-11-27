
import React, { useEffect, useState } from 'react';
import GlassCard from '../../components/GlassCard';
import { supabase } from '../../integrations/supabase/client';
import { HelpRequest } from '../../types';
import { LifeBuoy, CheckCircle, Trash2, Mail, Clock, RefreshCw, Loader2, MessageCircle } from 'lucide-react';
import { useUI } from '../../context/UIContext';

const HelpRequests: React.FC = () => {
  const { toast } = useUI();
  const [requests, setRequests] = useState<HelpRequest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    setLoading(true);
    const { data } = await supabase
        .from('help_requests')
        .select('*')
        .order('created_at', { ascending: false });
    
    if (data) setRequests(data as HelpRequest[]);
    setLoading(false);
  };

  const handleResolve = async (id: string) => {
      await supabase.from('help_requests').update({ status: 'resolved' }).eq('id', id);
      setRequests(prev => prev.map(r => r.id === id ? { ...r, status: 'resolved' } : r));
      toast.success("Marked as resolved");
  };

  const handleDelete = async (id: string) => {
      if (!confirm("Delete this request?")) return;
      await supabase.from('help_requests').delete().eq('id', id);
      setRequests(prev => prev.filter(r => r.id !== id));
      toast.info("Request deleted");
  };

  return (
    <div className="space-y-6 animate-fade-in">
        <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                <LifeBuoy className="text-blue-400" /> Support Inbox
            </h2>
            <button onClick={fetchRequests} className="p-2 bg-white/10 rounded-lg hover:bg-white/20 text-white transition">
                <RefreshCw size={20} />
            </button>
        </div>

        {loading ? (
            <div className="text-center py-10"><Loader2 className="animate-spin text-blue-400 mx-auto" /></div>
        ) : requests.length === 0 ? (
            <div className="text-center py-12 text-gray-500 bg-white/5 rounded-xl">No support requests found.</div>
        ) : (
            <div className="grid grid-cols-1 gap-4">
                {requests.map(req => (
                    <GlassCard key={req.id} className={`border-l-4 ${req.status === 'resolved' ? 'border-green-500 opacity-75' : 'border-blue-500'}`}>
                        <div className="flex flex-col md:flex-row justify-between gap-4">
                            <div className="flex-1 space-y-2">
                                <div className="flex items-center gap-3">
                                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${req.status === 'resolved' ? 'bg-green-500/20 text-green-400' : 'bg-blue-500/20 text-blue-400'}`}>
                                        {req.status}
                                    </span>
                                    <span className="text-xs text-gray-500 flex items-center gap-1">
                                        <Clock size={12} /> {new Date(req.created_at).toLocaleString()}
                                    </span>
                                </div>
                                <h4 className="text-white font-bold text-sm md:text-base flex items-center gap-2">
                                    <Mail size={14} className="text-gray-400"/> {req.email}
                                </h4>
                                <div className="bg-black/30 p-3 rounded-lg border border-white/5 text-sm text-gray-300">
                                    {req.message}
                                </div>
                                {req.user_id && <p className="text-[10px] text-gray-600 font-mono">UID: {req.user_id}</p>}
                            </div>
                            
                            <div className="flex flex-row md:flex-col justify-end gap-2">
                                {req.status !== 'resolved' && (
                                    <button 
                                        onClick={() => handleResolve(req.id)}
                                        className="p-2 bg-green-500/10 text-green-400 hover:bg-green-500/20 rounded-lg flex items-center justify-center gap-2 text-xs font-bold transition"
                                    >
                                        <CheckCircle size={16} /> Resolve
                                    </button>
                                )}
                                <button 
                                    onClick={() => handleDelete(req.id)}
                                    className="p-2 bg-red-500/10 text-red-400 hover:bg-red-500/20 rounded-lg flex items-center justify-center gap-2 text-xs font-bold transition"
                                >
                                    <Trash2 size={16} /> Delete
                                </button>
                                <a 
                                    href={`mailto:${req.email}`}
                                    className="p-2 bg-white/5 text-gray-300 hover:bg-white/10 rounded-lg flex items-center justify-center gap-2 text-xs font-bold transition"
                                >
                                    <MessageCircle size={16} /> Reply
                                </a>
                            </div>
                        </div>
                    </GlassCard>
                ))}
            </div>
        )}
    </div>
  );
};

export default HelpRequests;
