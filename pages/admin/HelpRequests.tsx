
import React, { useEffect, useState } from 'react';
import GlassCard from '../../components/GlassCard';
import { supabase } from '../../integrations/supabase/client';
import { HelpRequest } from '../../types';
import { LifeBuoy, CheckCircle, Trash2, Mail, Clock, RefreshCw, Loader2, Send, MessageSquare, Search, Filter } from 'lucide-react';
import { useUI } from '../../context/UIContext';
import { motion, AnimatePresence } from 'framer-motion';

const HelpRequests: React.FC = () => {
  const { toast, confirm } = useUI();
  const [requests, setRequests] = useState<HelpRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'pending' | 'resolved'>('pending');
  const [searchTerm, setSearchTerm] = useState('');
  
  // Reply State
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyMessage, setReplyMessage] = useState('');
  const [isSending, setIsSending] = useState(false);

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
      // Optimistic update
      setRequests(prev => prev.map(r => r.id === id ? { ...r, status: 'resolved', resolved_at: new Date().toISOString() } : r));
      
      const { error } = await supabase.from('help_requests').update({ 
          status: 'resolved',
          resolved_at: new Date().toISOString()
      }).eq('id', id);

      if (error) toast.error("Failed to update status");
      else toast.success("Marked as resolved");
  };

  const handleDelete = async (id: string) => {
      if (!await confirm("Delete this request permanently?")) return;
      
      const { error } = await supabase.from('help_requests').delete().eq('id', id);
      
      if (error) {
          toast.error("Delete failed: " + error.message);
      } else {
          setRequests(prev => prev.filter(r => r.id !== id));
          toast.info("Request deleted");
      }
  };

  const handleReplySubmit = async (req: HelpRequest) => {
      if (!replyMessage.trim()) return;
      setIsSending(true);

      try {
          // 1. Update the request in DB
          const { error: updateError } = await supabase.from('help_requests').update({
              admin_response: replyMessage,
              status: 'resolved',
              resolved_at: new Date().toISOString()
          }).eq('id', req.id);

          if (updateError) throw updateError;

          // 2. If user is registered, send in-app notification
          if (req.user_id) {
              await supabase.from('notifications').insert({
                  user_id: req.user_id,
                  title: 'Support Response',
                  message: `Re: Your inquiry. "${replyMessage.substring(0, 50)}..."`,
                  type: 'info'
              });
          }

          toast.success("Reply sent & marked resolved!");
          
          // 3. Update local state
          setRequests(prev => prev.map(r => r.id === req.id ? { 
              ...r, 
              status: 'resolved', 
              admin_response: replyMessage,
              resolved_at: new Date().toISOString() 
          } : r));

          setReplyingTo(null);
          setReplyMessage('');

      } catch (e: any) {
          toast.error("Reply failed: " + e.message);
      } finally {
          setIsSending(false);
      }
  };

  const filteredRequests = requests.filter(r => {
      const matchesFilter = r.status === filter;
      const matchesSearch = 
        r.email.toLowerCase().includes(searchTerm.toLowerCase()) || 
        r.message.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (r.user_id && r.user_id.includes(searchTerm));
      return matchesFilter && matchesSearch;
  });

  const pendingCount = requests.filter(r => r.status === 'pending').length;

  return (
    <div className="space-y-6 animate-fade-in">
        
        {/* Header Area */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
                <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                    <LifeBuoy className="text-blue-400" /> Support Center
                </h2>
                <p className="text-gray-400 text-sm">Manage user inquiries and help tickets.</p>
            </div>
            
            <div className="flex items-center gap-3 w-full md:w-auto">
                <div className="relative flex-1 md:flex-none">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
                    <input 
                        type="text" 
                        placeholder="Search tickets..." 
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-2 text-sm text-white focus:border-blue-500 outline-none"
                    />
                </div>
                <button onClick={fetchRequests} className="p-2 bg-white/10 rounded-xl hover:bg-white/20 text-white transition">
                    <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
                </button>
            </div>
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-4 border-b border-white/10">
            <button 
                onClick={() => setFilter('pending')}
                className={`pb-3 text-sm font-bold flex items-center gap-2 transition relative ${filter === 'pending' ? 'text-white' : 'text-gray-500 hover:text-gray-300'}`}
            >
                Pending Requests
                {pendingCount > 0 && <span className="bg-red-500 text-white text-[10px] px-1.5 py-0.5 rounded-full">{pendingCount}</span>}
                {filter === 'pending' && <motion.div layoutId="activeTabSupport" className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-500" />}
            </button>
            <button 
                onClick={() => setFilter('resolved')}
                className={`pb-3 text-sm font-bold transition relative ${filter === 'resolved' ? 'text-white' : 'text-gray-500 hover:text-gray-300'}`}
            >
                Resolved History
                {filter === 'resolved' && <motion.div layoutId="activeTabSupport" className="absolute bottom-0 left-0 right-0 h-0.5 bg-green-500" />}
            </button>
        </div>

        {/* Content */}
        {loading ? (
            <div className="text-center py-20"><Loader2 className="animate-spin text-blue-400 mx-auto" size={32} /></div>
        ) : filteredRequests.length === 0 ? (
            <div className="text-center py-20 bg-white/5 rounded-2xl border border-white/5 flex flex-col items-center">
                <CheckCircle size={48} className="text-gray-600 mb-4" />
                <h3 className="text-white font-bold text-lg">All Caught Up!</h3>
                <p className="text-gray-500 text-sm">No {filter} requests found.</p>
            </div>
        ) : (
            <div className="grid grid-cols-1 gap-4">
                <AnimatePresence>
                    {filteredRequests.map(req => (
                        <motion.div
                            key={req.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, height: 0 }}
                            layout
                        >
                            <GlassCard className={`relative overflow-hidden border-l-4 ${req.status === 'resolved' ? 'border-l-green-500 opacity-80' : 'border-l-yellow-500'}`}>
                                <div className="flex flex-col md:flex-row gap-6">
                                    
                                    {/* Left: User Info */}
                                    <div className="md:w-1/4 space-y-3 border-b md:border-b-0 md:border-r border-white/10 pb-4 md:pb-0 md:pr-4">
                                        <div>
                                            <p className="text-[10px] text-gray-500 uppercase font-bold mb-1">From</p>
                                            <div className="flex items-center gap-2">
                                                <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-400 font-bold">
                                                    {req.email.charAt(0).toUpperCase()}
                                                </div>
                                                <div className="overflow-hidden">
                                                    <p className="text-white text-sm font-bold truncate" title={req.email}>{req.email}</p>
                                                    {req.user_id && <p className="text-[10px] text-gray-500 font-mono">Registered User</p>}
                                                </div>
                                            </div>
                                        </div>
                                        <div>
                                            <p className="text-[10px] text-gray-500 uppercase font-bold mb-1">Submitted</p>
                                            <div className="flex items-center gap-1 text-xs text-gray-300">
                                                <Clock size={12} /> {new Date(req.created_at).toLocaleString()}
                                            </div>
                                        </div>
                                        <div className={`inline-flex items-center gap-1.5 px-2 py-1 rounded text-[10px] font-bold uppercase ${req.status === 'resolved' ? 'bg-green-500/20 text-green-400' : 'bg-yellow-500/20 text-yellow-400'}`}>
                                            {req.status === 'resolved' ? <CheckCircle size={10} /> : <Clock size={10} />}
                                            {req.status}
                                        </div>
                                    </div>

                                    {/* Middle: Message & Interaction */}
                                    <div className="flex-1 space-y-4">
                                        <div className="bg-black/30 p-4 rounded-xl border border-white/5">
                                            <p className="text-gray-300 text-sm whitespace-pre-wrap leading-relaxed">{req.message}</p>
                                        </div>

                                        {/* Admin Response Display */}
                                        {req.admin_response && (
                                            <div className="bg-blue-500/10 p-4 rounded-xl border border-blue-500/20 ml-8 relative">
                                                <div className="absolute -left-3 top-4 w-3 h-0.5 bg-blue-500/20"></div>
                                                <p className="text-[10px] text-blue-300 uppercase font-bold mb-1">Admin Response</p>
                                                <p className="text-white text-sm">{req.admin_response}</p>
                                            </div>
                                        )}

                                        {/* Reply Box (If Open) */}
                                        {replyingTo === req.id && (
                                            <motion.div 
                                                initial={{ opacity: 0, height: 0 }} 
                                                animate={{ opacity: 1, height: 'auto' }}
                                                className="bg-white/5 p-4 rounded-xl border border-white/10"
                                            >
                                                <textarea 
                                                    autoFocus
                                                    value={replyMessage}
                                                    onChange={e => setReplyMessage(e.target.value)}
                                                    placeholder="Type your reply here..."
                                                    className="w-full bg-black/40 border border-white/10 rounded-lg p-3 text-white text-sm focus:border-blue-500 outline-none min-h-[100px] resize-none mb-3"
                                                />
                                                <div className="flex justify-end gap-2">
                                                    <button 
                                                        onClick={() => setReplyingTo(null)}
                                                        className="px-3 py-1.5 text-xs font-bold text-gray-400 hover:text-white transition"
                                                    >
                                                        Cancel
                                                    </button>
                                                    <button 
                                                        onClick={() => handleReplySubmit(req)}
                                                        disabled={isSending || !replyMessage.trim()}
                                                        className="px-4 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-bold hover:bg-blue-500 transition flex items-center gap-2"
                                                    >
                                                        {isSending ? <Loader2 className="animate-spin" size={14} /> : <Send size={14} />} Send & Resolve
                                                    </button>
                                                </div>
                                            </motion.div>
                                        )}
                                    </div>

                                    {/* Right: Actions */}
                                    <div className="flex md:flex-col gap-2 justify-start md:w-[120px]">
                                        {req.status === 'pending' && replyingTo !== req.id && (
                                            <>
                                                <button 
                                                    onClick={() => { setReplyingTo(req.id); setReplyMessage(''); }}
                                                    className="flex-1 py-2 bg-blue-500/10 text-blue-400 border border-blue-500/30 hover:bg-blue-500 hover:text-white rounded-lg text-xs font-bold transition flex items-center justify-center gap-2"
                                                >
                                                    <MessageSquare size={14} /> Reply
                                                </button>
                                                <button 
                                                    onClick={() => handleResolve(req.id)}
                                                    className="flex-1 py-2 bg-green-500/10 text-green-400 border border-green-500/30 hover:bg-green-500 hover:text-white rounded-lg text-xs font-bold transition flex items-center justify-center gap-2"
                                                >
                                                    <CheckCircle size={14} /> Resolve
                                                </button>
                                            </>
                                        )}
                                        <button 
                                            onClick={() => handleDelete(req.id)}
                                            className="flex-1 py-2 bg-red-500/10 text-red-400 border border-red-500/30 hover:bg-red-500 hover:text-white rounded-lg text-xs font-bold transition flex items-center justify-center gap-2"
                                        >
                                            <Trash2 size={14} /> Delete
                                        </button>
                                    </div>
                                </div>
                            </GlassCard>
                        </motion.div>
                    ))}
                </AnimatePresence>
            </div>
        )}
    </div>
  );
};

export default HelpRequests;
