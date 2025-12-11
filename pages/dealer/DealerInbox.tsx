
import React, { useEffect, useState } from 'react';
import GlassCard from '../../components/GlassCard';
import { supabase } from '../../integrations/supabase/client';
import { CheckCircle, XCircle, Clock, FileText, User, Inbox, Loader2, AlertCircle, RefreshCw } from 'lucide-react';
import { useUI } from '../../context/UIContext';
import { updateWallet, createTransaction } from '../../lib/actions';
import { motion, AnimatePresence } from 'framer-motion';
import BalanceDisplay from '../../components/BalanceDisplay';

const DealerInbox: React.FC = () => {
  const { toast, confirm } = useUI();
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);

  useEffect(() => {
    fetchInbox();
  }, []);

  const fetchInbox = async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      // 1. Get all tasks created by this dealer
      const { data: myTasks } = await supabase
        .from('marketplace_tasks')
        .select('id, title, worker_reward')
        .eq('creator_id', session.user.id);

      if (!myTasks || myTasks.length === 0) {
        setSubmissions([]);
        setLoading(false);
        return;
      }

      const taskMap = new Map(myTasks.map((t: any) => [t.id, t]));
      const taskIds = myTasks.map((t: any) => t.id);

      // 2. Get pending submissions for these tasks
      const { data: subs, error } = await supabase
        .from('marketplace_submissions')
        .select('*, worker:worker_id(name_1, email_1, avatar_1, user_uid)')
        .in('task_id', taskIds)
        .eq('status', 'pending')
        .order('created_at', { ascending: true }); // Oldest first

      if (error) throw error;

      // 3. Attach task details to submission
      const enriched = (subs || []).map((s: any) => ({
        ...s,
        task: taskMap.get(s.task_id)
      }));

      setSubmissions(enriched);

    } catch (e: any) {
      console.error(e);
      toast.error("Failed to load inbox");
    } finally {
      setLoading(false);
    }
  };

  const handleVerdict = async (submission: any, verdict: 'approved' | 'rejected') => {
    setProcessingId(submission.id);
    try {
      // 1. Update Submission Status
      const { error } = await supabase
        .from('marketplace_submissions')
        .update({ status: verdict })
        .eq('id', submission.id);

      if (error) throw error;

      if (verdict === 'approved') {
        // 2. Pay User
        await updateWallet(submission.worker_id, submission.task.worker_reward, 'increment', 'earning_balance');

        // 3. Log Transaction
        await createTransaction(
          submission.worker_id,
          'earn',
          submission.task.worker_reward,
          `Task Approved: ${submission.task.title}`
        );

        // 4. Notify User
        await supabase.from('notifications').insert({
          user_id: submission.worker_id,
          title: 'Task Approved',
          message: `You earned ${submission.task.worker_reward} for "${submission.task.title}"`,
          type: 'success'
        });
      } else {
        // Notify Rejection
        await supabase.from('notifications').insert({
          user_id: submission.worker_id,
          title: 'Task Rejected',
          message: `Your submission for "${submission.task.title}" was rejected. Please follow instructions carefully.`,
          type: 'error'
        });
      }

      toast.success(`Submission ${verdict}`);
      
      // Remove from list locally
      setSubmissions(prev => prev.filter(s => s.id !== submission.id));

    } catch (e: any) {
      toast.error("Error: " + e.message);
    } finally {
      setProcessingId(null);
    }
  };

  if (loading) return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center text-gray-500">
        <Loader2 className="animate-spin mb-4 text-amber-500" size={40} />
        <p>Loading your inbox...</p>
    </div>
  );

  return (
    <div className="pb-24 sm:pl-20 sm:pt-6 space-y-6 px-4 sm:px-0 animate-fade-in">
      
      {/* Header */}
      <div className="flex justify-between items-center pt-4">
        <div>
          <h1 className="text-2xl font-display font-bold text-white flex items-center gap-2">
            <Inbox className="text-amber-500" /> Review Inbox
          </h1>
          <p className="text-gray-400 text-sm">
            You have <strong className="text-white">{submissions.length}</strong> pending reviews.
          </p>
        </div>
        <button onClick={fetchInbox} className="p-2 bg-white/10 rounded-xl hover:bg-white/20 transition text-white">
            <RefreshCw size={20} />
        </button>
      </div>

      {/* List */}
      <div className="space-y-4">
        <AnimatePresence mode="popLayout">
          {submissions.length === 0 ? (
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              className="text-center py-16 bg-white/5 rounded-2xl border border-white/5 flex flex-col items-center justify-center"
            >
              <CheckCircle size={48} className="text-green-500/50 mb-4" />
              <h3 className="text-white font-bold text-lg">All Caught Up!</h3>
              <p className="text-gray-500 text-sm">No pending submissions to review.</p>
            </motion.div>
          ) : (
            submissions.map((sub) => (
              <motion.div
                key={sub.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -100 }}
                layout
              >
                <GlassCard className="border border-white/10 relative overflow-hidden">
                  {processingId === sub.id && (
                      <div className="absolute inset-0 bg-black/60 z-20 flex items-center justify-center backdrop-blur-sm">
                          <Loader2 className="animate-spin text-amber-500" size={32} />
                      </div>
                  )}
                  
                  <div className="flex flex-col md:flex-row gap-4">
                    
                    {/* User Info */}
                    <div className="flex items-start gap-3 md:w-1/3 border-b md:border-b-0 md:border-r border-white/5 pb-3 md:pb-0">
                      <div className="w-10 h-10 rounded-full bg-black/50 border border-white/10 overflow-hidden shrink-0">
                        {sub.worker?.avatar_1 ? (
                          <img src={sub.worker.avatar_1} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-gray-800 text-gray-500"><User size={16}/></div>
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-white truncate">{sub.worker?.name_1 || 'Unknown'}</p>
                        <p className="text-[10px] text-gray-500 font-mono">ID: {sub.worker?.user_uid}</p>
                        <div className="flex items-center gap-1 text-[10px] text-gray-400 mt-1">
                            <Clock size={10}/> {new Date(sub.created_at).toLocaleString()}
                        </div>
                      </div>
                    </div>

                    {/* Task Info & Proof */}
                    <div className="flex-1 space-y-2">
                        <div className="flex justify-between items-start">
                            <h3 className="font-bold text-white text-sm">{sub.task.title}</h3>
                            <span className="text-green-400 font-mono font-bold text-xs bg-green-500/10 px-2 py-0.5 rounded">
                                <BalanceDisplay amount={sub.task.worker_reward} />
                            </span>
                        </div>
                        
                        <div className="bg-black/30 p-3 rounded-lg border border-white/5">
                            <p className="text-[9px] text-gray-500 uppercase font-bold mb-1 flex items-center gap-1">
                                <FileText size={10}/> Submitted Proof
                            </p>
                            <p className="text-sm text-amber-100 font-mono break-all">
                                {sub.submission_data?.input ? sub.submission_data.input : 
                                 sub.submission_data?.file ? `File: ${sub.submission_data.file}` : 
                                 "Auto-Quiz Completed"}
                            </p>
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="flex md:flex-col gap-2 justify-center md:w-32">
                        <button 
                            onClick={() => handleVerdict(sub, 'approved')}
                            className="flex-1 py-3 bg-green-600 hover:bg-green-500 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition shadow-lg shadow-green-900/20"
                        >
                            <CheckCircle size={16} /> Approve
                        </button>
                        <button 
                            onClick={() => handleVerdict(sub, 'rejected')}
                            className="flex-1 py-3 bg-red-600/20 hover:bg-red-600/40 text-red-400 border border-red-500/50 hover:text-white rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition"
                        >
                            <XCircle size={16} /> Reject
                        </button>
                    </div>

                  </div>
                </GlassCard>
              </motion.div>
            ))
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default DealerInbox;
