
import React, { useEffect, useState } from 'react';
import GlassCard from '../../components/GlassCard';
import { supabase } from '../../integrations/supabase/client';
import { MarketTask } from '../../types';
import { Trash2, Pause, Play, Edit2, Flame, BadgeCheck, Activity, Users, CheckCircle, XCircle, FileText, Clock, AlertCircle, X, Loader2 } from 'lucide-react';
import { useUI } from '../../context/UIContext';
import Loader from '../../components/Loader';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { updateWallet, createTransaction } from '../../lib/actions';
import BalanceDisplay from '../../components/BalanceDisplay';

const ManageCampaigns: React.FC = () => {
  const { toast, confirm } = useUI();
  const [campaigns, setCampaigns] = useState<any[]>([]); 
  const [loading, setLoading] = useState(true);
  
  // Review State
  const [selectedTask, setSelectedTask] = useState<any | null>(null);
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [loadingSubs, setLoadingSubs] = useState(false);
  const [processingId, setProcessingId] = useState<string | null>(null);

  useEffect(() => {
      fetchCampaigns();
  }, []);

  const fetchCampaigns = async () => {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      // 1. Get Tasks
      const { data: tasks } = await supabase.from('marketplace_tasks')
          .select('*')
          .eq('creator_id', session.user.id)
          .order('created_at', { ascending: false });
      
      if (tasks) {
          // 2. Get Pending Counts for each task
          const taskIds = tasks.map((t: any) => t.id);
          const { data: pendingData } = await supabase
            .from('marketplace_submissions')
            .select('task_id')
            .in('task_id', taskIds)
            .eq('status', 'pending');
            
          // Map counts
          const counts: Record<string, number> = {};
          pendingData?.forEach((p: any) => {
              counts[p.task_id] = (counts[p.task_id] || 0) + 1;
          });

          const enriched = tasks.map((t: any) => ({
              ...t,
              pendingCount: counts[t.id] || 0
          }));

          setCampaigns(enriched);
      }
      setLoading(false);
  };

  const openReviewModal = async (task: any) => {
      setSelectedTask(task);
      setLoadingSubs(true);
      
      // Fetch submissions with worker profile
      const { data } = await supabase
        .from('marketplace_submissions')
        .select('*, worker:worker_id(name_1, email_1, avatar_1, user_uid)')
        .eq('task_id', task.id)
        .eq('status', 'pending')
        .order('created_at', { ascending: true }); // Oldest first

      if (data) setSubmissions(data);
      setLoadingSubs(false);
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
              await updateWallet(submission.worker_id, selectedTask.worker_reward, 'increment', 'earning_balance');
              
              // 3. Log Transaction
              await createTransaction(
                  submission.worker_id, 
                  'earn', 
                  selectedTask.worker_reward, 
                  `Task Approved: ${selectedTask.title}`
              );

              // 4. Update Task Remaining Qty (If not already handled on submission)
              // Assuming quantity is deducted on submission or approval. 
              // Usually strict systems deduct on submission to reserve slot.
              // We will just notify here.
              await supabase.from('notifications').insert({
                  user_id: submission.worker_id,
                  title: 'Task Approved',
                  message: `You earned ${selectedTask.worker_reward} for "${selectedTask.title}"`,
                  type: 'success'
              });
          } else {
              // Notify Rejection
              await supabase.from('notifications').insert({
                  user_id: submission.worker_id,
                  title: 'Task Rejected',
                  message: `Your submission for "${selectedTask.title}" was rejected. Please follow instructions carefully.`,
                  type: 'error'
              });
          }

          toast.success(`Submission ${verdict}`);
          
          // Remove from local list
          setSubmissions(prev => prev.filter(s => s.id !== submission.id));
          
          // Update main list count
          setCampaigns(prev => prev.map(t => t.id === selectedTask.id ? { ...t, pendingCount: Math.max(0, t.pendingCount - 1) } : t));

      } catch (e: any) {
          toast.error("Error: " + e.message);
      } finally {
          setProcessingId(null);
      }
  };

  const toggleStatus = async (task: any) => {
      const newStatus = task.status === 'active' ? 'paused' : 'active';
      const { error } = await supabase.from('marketplace_tasks').update({ status: newStatus }).eq('id', task.id);
      if (!error) {
          setCampaigns(prev => prev.map(t => t.id === task.id ? { ...t, status: newStatus } : t));
          toast.success(`Campaign ${newStatus}`);
      }
  };

  const handleDelete = async (id: string) => {
      if (!await confirm("Stop and Delete this campaign? Unused budget must be claimed via support.")) return;
      await supabase.from('marketplace_tasks').delete().eq('id', id);
      setCampaigns(prev => prev.filter(c => c.id !== id));
      toast.success("Campaign Deleted");
  };

  if (loading) return <div className="p-10"><Loader /></div>;

  return (
    <div className="space-y-6 animate-fade-in pb-20">
        <div className="flex justify-between items-center bg-black/40 p-4 rounded-2xl border border-white/10 backdrop-blur-md sticky top-0 z-10">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <Activity className="text-amber-500"/> Campaign Manager
            </h2>
            <Link to="/dealer/create" className="text-xs font-bold bg-white text-black px-4 py-2 rounded-lg hover:bg-gray-200 transition shadow-lg">
                + New Ad
            </Link>
        </div>

        <div className="space-y-4">
            {campaigns.length === 0 ? (
                <div className="text-center py-12 bg-white/5 rounded-xl border border-white/5 text-gray-500">
                    No active campaigns. Start promoting today!
                </div>
            ) : (
                campaigns.map(task => {
                    const progress = ((task.total_quantity - task.remaining_quantity) / task.total_quantity) * 100;
                    const isHot = task.worker_reward > 5 || task.is_featured; 

                    return (
                        <GlassCard key={task.id} className={`border group transition-all duration-300 relative overflow-hidden ${task.status === 'active' ? 'border-amber-500/30 hover:border-amber-500/60' : 'border-white/10 opacity-70'}`}>
                            
                            {isHot && (
                                <div className="absolute top-0 right-0 bg-gradient-to-l from-red-600 to-orange-500 text-white text-[9px] font-black px-3 py-1 rounded-bl-xl shadow-lg flex items-center gap-1">
                                    <Flame size={10} fill="currentColor"/> HOT DEAL
                                </div>
                            )}

                            <div className="flex flex-col gap-4">
                                {/* Header */}
                                <div className="flex justify-between items-start pr-16">
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <h3 className="font-bold text-white text-lg">{task.title}</h3>
                                            <BadgeCheck size={16} className="text-blue-400" fill="black" />
                                        </div>
                                        <p className="text-xs text-gray-400 mt-1 font-medium">
                                            {task.company_name || 'My Company'} • <span className="text-amber-400">Budget: ৳{(task.total_quantity * task.price_per_action).toFixed(2)}</span>
                                        </p>
                                    </div>
                                </div>

                                {/* Stats Bar */}
                                <div className="bg-black/40 rounded-xl p-3 border border-white/5">
                                    <div className="flex justify-between text-[10px] text-gray-400 mb-1 font-bold uppercase">
                                        <span>Completion</span>
                                        <span className="text-white">{Math.round(progress)}%</span>
                                    </div>
                                    <div className="h-2 bg-white/10 rounded-full overflow-hidden mb-2">
                                        <div className="h-full bg-gradient-to-r from-amber-500 to-orange-500" style={{ width: `${progress}%` }}></div>
                                    </div>
                                    <div className="flex justify-between text-[10px] text-gray-500">
                                        <span>{task.total_quantity - task.remaining_quantity} Completed</span>
                                        <span>{task.remaining_quantity} Remaining</span>
                                    </div>
                                </div>

                                {/* Actions Footer */}
                                <div className="flex items-center gap-2 pt-2 border-t border-white/5">
                                    <div className={`px-2 py-1 rounded text-[9px] uppercase font-black tracking-wider ${task.status === 'active' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                                        {task.status}
                                    </div>
                                    
                                    {/* Review Button */}
                                    {task.pendingCount > 0 && (
                                        <button 
                                            onClick={() => openReviewModal(task)}
                                            className="px-3 py-1 bg-blue-600 text-white text-[10px] font-bold rounded flex items-center gap-1 animate-pulse"
                                        >
                                            <Users size={12}/> Review {task.pendingCount}
                                        </button>
                                    )}

                                    <div className="flex-1"></div>
                                    
                                    <button 
                                        onClick={() => toggleStatus(task)} 
                                        className="p-2 bg-white/5 hover:bg-white/10 rounded-lg text-white transition border border-white/5"
                                        title={task.status === 'active' ? 'Pause' : 'Resume'}
                                    >
                                        {task.status === 'active' ? <Pause size={16} fill="currentColor"/> : <Play size={16} fill="currentColor"/>}
                                    </button>
                                    <button 
                                        className="p-2 bg-blue-500/10 hover:bg-blue-500/20 rounded-lg text-blue-400 transition border border-blue-500/20"
                                        title="Edit (Coming Soon)"
                                    >
                                        <Edit2 size={16}/>
                                    </button>
                                    <button 
                                        onClick={() => handleDelete(task.id)} 
                                        className="p-2 bg-red-500/10 hover:bg-red-500/20 rounded-lg text-red-400 transition border border-red-500/20"
                                        title="Delete"
                                    >
                                        <Trash2 size={16}/>
                                    </button>
                                </div>
                            </div>
                        </GlassCard>
                    );
                })
            )}
        </div>

        {/* REVIEW MODAL */}
        <AnimatePresence>
            {selectedTask && (
                <motion.div 
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
                >
                    <motion.div 
                        initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}
                        className="bg-dark-900 w-full max-w-2xl rounded-2xl border border-white/10 p-6 shadow-2xl flex flex-col max-h-[85vh]"
                    >
                        <div className="flex justify-between items-center mb-4 border-b border-white/10 pb-4">
                            <div>
                                <h3 className="text-xl font-bold text-white">Review Submissions</h3>
                                <p className="text-xs text-gray-400">Task: {selectedTask.title}</p>
                            </div>
                            <button onClick={() => { setSelectedTask(null); setSubmissions([]); }} className="p-2 hover:bg-white/10 rounded-full text-gray-400 hover:text-white"><X size={20}/></button>
                        </div>

                        <div className="flex-1 overflow-y-auto custom-scrollbar space-y-3 pr-2">
                            {loadingSubs ? (
                                <div className="text-center py-10"><Loader size={30} className="animate-spin text-amber-500 mx-auto"/></div>
                            ) : submissions.length === 0 ? (
                                <div className="text-center py-12 bg-white/5 rounded-xl text-gray-500">
                                    <CheckCircle size={40} className="mx-auto mb-2 opacity-50"/>
                                    No pending submissions to review.
                                </div>
                            ) : (
                                submissions.map(sub => (
                                    <div key={sub.id} className="bg-white/5 border border-white/10 rounded-xl p-4 flex flex-col md:flex-row gap-4">
                                        {/* User Info */}
                                        <div className="flex items-center gap-3 w-full md:w-1/3 border-b md:border-b-0 md:border-r border-white/10 pb-3 md:pb-0">
                                            <div className="w-10 h-10 rounded-full bg-black/50 border border-white/10 overflow-hidden">
                                                <img src={sub.worker?.avatar_1 || `https://api.dicebear.com/7.x/avataaars/svg?seed=${sub.worker_id}`} className="w-full h-full object-cover" />
                                            </div>
                                            <div>
                                                <p className="text-sm font-bold text-white">{sub.worker?.name_1 || 'User'}</p>
                                                <p className="text-[10px] text-gray-500 font-mono">ID: {sub.worker?.user_uid}</p>
                                            </div>
                                        </div>

                                        {/* Proof Data */}
                                        <div className="flex-1 space-y-2">
                                            <div className="text-xs text-gray-300">
                                                <span className="text-gray-500 font-bold uppercase block text-[9px] mb-1">Submitted Proof</span>
                                                <div className="bg-black/40 p-2 rounded text-amber-100 font-mono break-all border border-amber-500/20">
                                                    {sub.submission_data?.input ? sub.submission_data.input : 
                                                     sub.submission_data?.file ? `File: ${sub.submission_data.file}` : 
                                                     "Auto-Quiz Completed"}
                                                </div>
                                            </div>
                                            <div className="text-[10px] text-gray-500 flex items-center gap-1">
                                                <Clock size={10}/> Submitted: {new Date(sub.created_at).toLocaleString()}
                                            </div>
                                        </div>

                                        {/* Actions */}
                                        <div className="flex gap-2 items-center w-full md:w-auto">
                                            {processingId === sub.id ? (
                                                <Loader2 className="animate-spin text-amber-500"/>
                                            ) : (
                                                <>
                                                    <button 
                                                        onClick={() => handleVerdict(sub, 'approved')}
                                                        className="p-2 bg-green-600 hover:bg-green-500 text-white rounded-lg transition shadow-lg shadow-green-900/20"
                                                        title="Approve & Pay"
                                                    >
                                                        <CheckCircle size={20} />
                                                    </button>
                                                    <button 
                                                        onClick={() => handleVerdict(sub, 'rejected')}
                                                        className="p-2 bg-red-600/20 hover:bg-red-600 text-red-500 hover:text-white border border-red-500/50 rounded-lg transition"
                                                        title="Reject"
                                                    >
                                                        <XCircle size={20} />
                                                    </button>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    </div>
  );
};

export default ManageCampaigns;
