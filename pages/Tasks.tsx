
import React, { useState, useEffect } from 'react';
import GlassCard from '../components/GlassCard';
import { 
  BadgeCheck, RefreshCw, Smartphone, Youtube, Share2, 
  Globe, Search, Loader2, Lock, X, Clock, AlertTriangle, ShieldCheck, ArrowRight, Flame, Building2, Star, Flag, Briefcase, MessageCircle, Crown, User
} from 'lucide-react';
import { supabase } from '../integrations/supabase/client';
import { useUI } from '../context/UIContext';
import BalanceDisplay from '../components/BalanceDisplay';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import Skeleton from '../components/Skeleton';

type TaskStatus = 'active' | 'pending' | 'approved' | 'rejected' | 'locked';

const Tasks: React.FC = () => {
  const { toast, confirm } = useUI();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [tasks, setTasks] = useState<any[]>([]); 
  const [taskStatuses, setTaskStatuses] = useState<Record<string, TaskStatus>>({});
  const [filter, setFilter] = useState('all');
  
  // Modals
  const [selectedTask, setSelectedTask] = useState<any | null>(null);
  const [reportTask, setReportTask] = useState<any | null>(null);
  const [reportReason, setReportReason] = useState('');

  useEffect(() => {
     fetchTasks();
  }, []);

  const fetchTasks = async () => {
     setLoading(true);
     const { data: { session } } = await supabase.auth.getSession();
     if(!session) return;

     // 1. Get All Active Tasks with Creator Profile joined
     const { data: allTasks } = await supabase
        .from('marketplace_tasks')
        .select('*, creator:creator_id(role, is_dealer, name_1, is_kyc_1)')
        .eq('status', 'active')
        .gt('remaining_quantity', 0)
        .order('worker_reward', {ascending: false}); // TOP RATE SORT
     
     if (!allTasks) { setLoading(false); return; }

     // 2. Get User Submissions
     const { data: mySubs } = await supabase
        .from('marketplace_submissions')
        .select('task_id, status, created_at')
        .eq('worker_id', session.user.id);
     
     const statusMap: Record<string, TaskStatus> = {};
     
     // 3. Process Statuses & Auto-Complete Check
     for (const s of (mySubs || [])) {
         statusMap[s.task_id] = s.status;
         
         // Client-side Auto Approve Logic Check (Simulated Cron)
         if (s.status === 'pending') {
             const task = allTasks.find(t => t.id === s.task_id);
             if (task) {
                 const submitTime = new Date(s.created_at).getTime();
                 const now = Date.now();
                 const hoursPassed = (now - submitTime) / (1000 * 60 * 60);
                 const autoHours = task.auto_approve_hours || 24;
                 
                 if (hoursPassed > autoHours) {
                     statusMap[s.task_id] = 'approved';
                 }
             }
         }
     }

     setTaskStatuses(statusMap);
     setTasks(allTasks);
     setLoading(false);
  };

  const handleOpenTask = (task: any) => {
      const status = taskStatuses[task.id];
      if (status === 'locked') { toast.error("Locked due to failed attempts."); return; }
      if (status === 'approved') { toast.info("Task completed."); return; }
      if (status === 'pending') { toast.info("Submission under review."); return; }
      setSelectedTask(task);
  };

  const handleReport = async () => {
      if (!reportTask || !reportReason) return;
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { error } = await supabase.from('task_reports').insert({
          task_id: reportTask.id,
          reporter_id: session.user.id,
          reason: reportReason,
          status: 'pending'
      });

      if (error) toast.error("Failed to submit report");
      else toast.success("Report submitted to admin");
      
      setReportTask(null);
      setReportReason('');
  };

  const getCreatorBadge = (creator: any) => {
      if (creator?.role === 'admin' || creator?.admin_user) {
          return <span className="bg-purple-500/20 text-purple-400 text-[9px] font-bold px-1.5 py-0.5 rounded flex items-center gap-1"><Crown size={10} fill="currentColor"/> ADMIN</span>;
      }
      if (creator?.is_dealer) {
          return <span className="bg-amber-500/20 text-amber-400 text-[9px] font-bold px-1.5 py-0.5 rounded flex items-center gap-1"><Briefcase size={10}/> DEALER</span>;
      }
      if (creator?.role === 'staff') {
          return <span className="bg-blue-500/20 text-blue-400 text-[9px] font-bold px-1.5 py-0.5 rounded flex items-center gap-1"><Star size={10} fill="currentColor"/> STAFF</span>;
      }
      if (creator?.is_kyc_1) {
          return <span className="bg-green-500/20 text-green-400 text-[9px] font-bold px-1.5 py-0.5 rounded flex items-center gap-1"><ShieldCheck size={10}/> VERIFIED</span>;
      }
      return <span className="bg-gray-500/20 text-gray-400 text-[9px] font-bold px-1.5 py-0.5 rounded flex items-center gap-1"><User size={10}/> USER</span>;
  };

  const sortedTasks = tasks.filter(t => filter === 'all' || t.category === filter);

  if (loading) return <div className="p-4 space-y-4"><Skeleton className="h-20" /><Skeleton className="h-20" /></div>;

  return (
    <div className="pb-24 sm:pl-20 sm:pt-6 space-y-6">
      
      <div className="flex flex-col gap-4 px-4 sm:px-0">
          <div className="flex justify-between items-end">
             <div>
                <h1 className="text-2xl font-bold text-white mb-1 flex items-center gap-2">
                    <Briefcase className="text-yellow-400"/> Micro Jobs
                </h1>
                <p className="text-gray-400 text-sm">Highest paying tasks shown first.</p>
             </div>
             <button onClick={fetchTasks} className="p-2 bg-[#1a1a1a] rounded-lg text-gray-400 hover:text-white"><RefreshCw size={18}/></button>
          </div>

          <div className="flex overflow-x-auto no-scrollbar gap-2 pb-2">
              {['all', 'social', 'video', 'app', 'website'].map(f => (
                  <button 
                    key={f}
                    onClick={() => setFilter(f)}
                    className={`px-4 py-2 rounded-xl text-xs font-bold uppercase whitespace-nowrap transition ${filter === f ? 'bg-white text-black' : 'bg-[#1a1a1a] text-gray-400 border border-[#333]'}`}
                  >
                      {f}
                  </button>
              ))}
          </div>
      </div>

      <div className="space-y-3 px-4 sm:px-0">
          {sortedTasks.map((task) => {
                const status = taskStatuses[task.id];
                const isHot = task.worker_reward > 5 || task.is_featured;
                
                return (
                    <motion.div 
                        key={task.id} 
                        initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                        className="relative"
                    >
                        <GlassCard 
                            onClick={() => handleOpenTask(task)}
                            className={`flex items-center justify-between p-4 group transition border relative overflow-hidden rounded-2xl cursor-pointer ${
                                status === 'pending' ? 'border-yellow-500/30 bg-yellow-500/5' :
                                status === 'approved' ? 'border-green-500/30 bg-green-500/5 opacity-70' :
                                'border-white/10 hover:border-white/20 bg-[#111]'
                            }`}
                        >
                            {isHot && !status && (
                                <div className="absolute top-0 right-0 bg-red-600 text-white text-[8px] font-black px-2 py-0.5 rounded-bl-lg">HOT</div>
                            )}

                            <div className="flex items-center gap-4">
                                <div className={`w-12 h-12 rounded-xl flex items-center justify-center border shrink-0 ${status ? 'bg-black/20 border-transparent' : 'bg-white/5 border-white/5'}`}>
                                    {task.category === 'social' ? <MessageCircle size={20} className="text-blue-400"/> :
                                     task.category === 'video' ? <Youtube size={20} className="text-red-500"/> :
                                     <Globe size={20} className="text-green-400"/>}
                                </div>
                                
                                <div className="min-w-0">
                                    <div className="flex items-center gap-2 mb-1">
                                        {getCreatorBadge(task.creator)}
                                        <span className="text-[9px] text-gray-500">• {task.timer_seconds}s</span>
                                    </div>
                                    <h3 className={`font-bold text-sm truncate ${status ? 'text-gray-400' : 'text-white'}`}>{task.title}</h3>
                                    <div className="flex items-center gap-2 text-xs text-gray-500 mt-1">
                                        <span className="bg-white/5 px-1.5 rounded text-[10px] uppercase font-bold">
                                            {task.proof_type === 'ai_quiz' ? 'AUTO' : task.proof_type === 'file_check' ? 'FILE' : 'MANUAL'}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            <div className="flex flex-col items-end gap-2 shrink-0">
                                {status === 'approved' ? (
                                    <span className="text-green-500 font-bold text-xs flex items-center gap-1"><BadgeCheck size={14}/> DONE</span>
                                ) : status === 'pending' ? (
                                    <span className="text-yellow-500 font-bold text-xs flex items-center gap-1"><Clock size={14}/> REVIEW</span>
                                ) : (
                                    <div className="bg-green-500/10 border border-green-500/20 px-3 py-1.5 rounded-lg">
                                        <p className="text-green-400 font-black text-xs"><BalanceDisplay amount={task.worker_reward} decimals={2} /></p>
                                    </div>
                                )}
                            </div>
                        </GlassCard>
                        
                        {/* Report Button */}
                        {!status && (
                            <button 
                                onClick={(e) => { e.stopPropagation(); setReportTask(task); }}
                                className="absolute top-2 right-2 p-1.5 text-gray-600 hover:text-red-400 transition z-10"
                                title="Report Fake Task"
                            >
                                <Flag size={12} />
                            </button>
                        )}
                    </motion.div>
                );
          })}
      </div>

      {/* Task Detail Modal */}
      <AnimatePresence>
          {selectedTask && (
             <motion.div 
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4 backdrop-blur-sm"
             >
                 <GlassCard className="w-full max-w-md bg-[#111] border-white/10">
                     <button onClick={() => setSelectedTask(null)} className="absolute top-4 right-4 text-gray-500 hover:text-white"><X size={20}/></button>
                     
                     <div className="text-center mb-6">
                         <h2 className="text-xl font-bold text-white mb-2">{selectedTask.title}</h2>
                         <p className="text-gray-400 text-sm">{selectedTask.description}</p>
                     </div>

                     <div className="grid grid-cols-2 gap-3 mb-6">
                         <div className="bg-white/5 p-3 rounded-xl border border-white/5 text-center">
                             <p className="text-[10px] text-gray-500 uppercase font-bold">Reward</p>
                             <p className="text-green-400 font-bold"><BalanceDisplay amount={selectedTask.worker_reward} /></p>
                         </div>
                         <div className="bg-white/5 p-3 rounded-xl border border-white/5 text-center">
                             <p className="text-[10px] text-gray-500 uppercase font-bold">Type</p>
                             <p className="text-white font-bold capitalize">
                                {selectedTask.proof_type === 'ai_quiz' ? 'Instant' : selectedTask.proof_type === 'file_check' ? 'File Check' : 'Manual Review'}
                             </p>
                         </div>
                     </div>

                     <button 
                        onClick={() => navigate(`/secure-task/${selectedTask.id}`)}
                        className="w-full py-4 bg-white text-black font-black uppercase rounded-xl hover:bg-gray-200 transition shadow-lg flex items-center justify-center gap-2"
                     >
                         Start Task <ArrowRight size={18}/>
                     </button>
                 </GlassCard>
             </motion.div>
          )}
      </AnimatePresence>

      {/* Report Modal */}
      <AnimatePresence>
          {reportTask && (
              <motion.div 
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="fixed inset-0 z-[60] bg-black/90 flex items-center justify-center p-4"
              >
                  <GlassCard className="w-full max-w-sm bg-red-950/20 border-red-500/30">
                      <h3 className="text-lg font-bold text-red-400 mb-4 flex items-center gap-2">
                          <AlertTriangle size={20}/> Report Issue
                      </h3>
                      <p className="text-xs text-gray-400 mb-4">Task: {reportTask.title}</p>
                      
                      <textarea 
                        value={reportReason}
                        onChange={e => setReportReason(e.target.value)}
                        placeholder="Describe the issue (e.g. Broken link, Fake task)..."
                        className="w-full bg-black/50 border border-red-500/20 rounded-xl p-3 text-white text-sm focus:border-red-500 outline-none h-24 resize-none mb-4"
                      />
                      
                      <div className="flex gap-2">
                          <button onClick={() => setReportTask(null)} className="flex-1 py-2 bg-white/5 text-gray-400 rounded-lg hover:text-white">Cancel</button>
                          <button onClick={handleReport} className="flex-1 py-2 bg-red-600 text-white rounded-lg font-bold hover:bg-red-500">Submit Report</button>
                      </div>
                  </GlassCard>
              </motion.div>
          )}
      </AnimatePresence>

    </div>
  );
};

export default Tasks;
