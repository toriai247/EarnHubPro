
import React, { useState, useEffect } from 'react';
import GlassCard from '../components/GlassCard';
import { CheckCircle2, ChevronRight, ExternalLink, Sparkles, Clock, RefreshCw } from 'lucide-react';
import { supabase } from '../integrations/supabase/client';
import { motion, AnimatePresence } from 'framer-motion';
import { Task } from '../types';
import { claimTask } from '../lib/actions';
import Loader from '../components/Loader';
import Skeleton from '../components/Skeleton';

// Helper Component for Countdown
const TaskTimer = () => {
  const [timeLeft, setTimeLeft] = useState('');

  useEffect(() => {
    const calculateTimeLeft = () => {
      const now = new Date();
      const tomorrow = new Date(now);
      tomorrow.setHours(24, 0, 0, 0); // Set to next midnight
      
      const diff = tomorrow.getTime() - now.getTime();
      
      if (diff <= 0) return "00h 00m 00s";

      const h = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const s = Math.floor((diff % (1000 * 60)) / 1000);

      return `${h}h ${m}m ${s}s`;
    };

    // Initial set
    setTimeLeft(calculateTimeLeft());

    const timer = setInterval(() => {
      setTimeLeft(calculateTimeLeft());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  return <span className="font-mono font-bold text-xs tracking-wide">{timeLeft}</span>;
};

const Tasks: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [claimStatus, setClaimStatus] = useState<'idle' | 'verifying' | 'success' | 'error'>('idle');
  const [taskStarted, setTaskStarted] = useState(false);
  const [recentlyCompleted, setRecentlyCompleted] = useState<string | null>(null);

  useEffect(() => {
     fetchTasks();
  }, []);

  const fetchTasks = async () => {
     setLoading(true);
     const { data: { session } } = await supabase.auth.getSession();
     if(!session) return;

     // 1. Fetch All Active Tasks
     const { data: allTasks } = await supabase.from('tasks').select('*').eq('is_active', true).order('reward', {ascending: true});
     
     // 2. Fetch User Completion History
     const { data: userHistory } = await supabase.from('user_tasks').select('*').eq('user_id', session.user.id);

     if (allTasks) {
         const processedTasks = allTasks.map((t: any) => {
             const history = userHistory?.filter(h => h.task_id === t.id) || [];
             let status: 'available' | 'completed' | 'cooldown' = 'available';

             if (history.length > 0) {
                 if (t.frequency === 'once') {
                     status = 'completed';
                 } else if (t.frequency === 'daily') {
                     // Check if completed today
                     const lastCompletion = new Date(history[history.length - 1].completed_at);
                     const today = new Date();
                     if (lastCompletion.toDateString() === today.toDateString()) {
                         status = 'completed'; // Logically completed for today
                     }
                 }
             }
             return { ...t, status };
         });
         setTasks(processedTasks);
     }
     setLoading(false);
  };

  const handleStartTask = () => {
      if (!selectedTask?.url) return;
      window.open(selectedTask.url, '_blank');
      setTaskStarted(true);
  };

  const handleVerifyAndClaim = async () => {
      if (!selectedTask || !taskStarted) return;
      setClaimStatus('verifying');
      
      // Simulate check delay
      setTimeout(async () => {
          const { data: { session } } = await supabase.auth.getSession();
          if (session) {
              try {
                  await claimTask(session.user.id, selectedTask);
                  setClaimStatus('success');
                  
                  // Dispatch global event to update balance header
                  window.dispatchEvent(new Event('wallet_updated'));

                  // Update local list
                  setTasks(prev => prev.map(t => t.id === selectedTask.id ? { ...t, status: 'completed' } : t));
                  
                  // Trigger animation on list item
                  setRecentlyCompleted(selectedTask.id);
                  
                  setTimeout(() => {
                      setClaimStatus('idle');
                      setSelectedTask(null);
                      setTaskStarted(false);
                      // Clear animation after delay
                      setTimeout(() => setRecentlyCompleted(null), 2500);
                  }, 2000);
              } catch (e) {
                  console.error(e);
                  setClaimStatus('error');
                  setTimeout(() => setClaimStatus('idle'), 2000);
              }
          }
      }, 1500);
  };

  if (loading) {
      return (
        <div className="pb-24 sm:pl-20 sm:pt-6 space-y-6">
           <div className="flex justify-between items-end px-4 sm:px-0">
               <div className="space-y-2">
                   <Skeleton variant="text" className="w-32 h-8" />
                   <Skeleton variant="text" className="w-48" />
               </div>
               <Skeleton variant="text" className="w-24" />
           </div>
           <div className="space-y-3 px-4 sm:px-0">
               {[1, 2, 3, 4, 5].map(i => (
                   <div key={i} className="flex items-center justify-between p-4 rounded-2xl bg-white/5 border border-white/5">
                       <div className="flex items-center gap-4">
                           <Skeleton variant="rectangular" className="w-12 h-12 rounded-xl" />
                           <div className="space-y-2">
                               <Skeleton variant="text" className="w-40 h-4" />
                               <Skeleton variant="text" className="w-24 h-3" />
                           </div>
                       </div>
                       <Skeleton variant="text" className="w-16 h-6" />
                   </div>
               ))}
           </div>
        </div>
      );
  }

  return (
    <div className="pb-24 sm:pl-20 sm:pt-6 space-y-6">
      <header className="flex justify-between items-end px-4 sm:px-0">
         <div>
            <h1 className="text-2xl font-display font-bold text-white mb-1">Task Hall</h1>
            <p className="text-gray-400 text-sm">Complete tasks to earn real rewards.</p>
         </div>
         <div className="bg-white/5 px-3 py-1 rounded-lg text-xs text-gray-400 flex items-center gap-1">
             <RefreshCw size={12} /> Refreshes Daily
         </div>
      </header>

      <div className="space-y-3 px-4 sm:px-0">
          {tasks.map((task) => {
             const isCompleted = task.status === 'completed';
             const isDaily = task.frequency === 'daily';
             const isRecent = recentlyCompleted === task.id;
             
             return (
                <motion.div
                   key={task.id}
                   layout
                   initial={{ opacity: 0, y: 10 }}
                   animate={{ 
                       opacity: 1, 
                       y: 0, 
                       scale: isRecent ? 1.02 : 1,
                   }}
                   className="rounded-2xl"
                >
                     <GlassCard 
                       className={`flex items-center justify-between p-4 transition-all duration-500 group ${
                           isRecent 
                             ? 'border-neon-green bg-neon-green/10 shadow-[0_0_20px_rgba(16,185,129,0.2)]' 
                             : isCompleted 
                               ? isDaily ? 'cursor-default border-yellow-500/30 bg-yellow-500/5' : 'cursor-default border-neon-green/30 bg-neon-green/5' 
                               : 'cursor-pointer hover:bg-white/5'
                       }`}
                       onClick={() => !isCompleted && setSelectedTask(task)}
                     >
                        <div className="flex items-center gap-4">
                            <div className={`w-12 h-12 rounded-xl flex items-center justify-center transition-colors duration-500 ${
                                isCompleted 
                                  ? isDaily ? 'bg-yellow-500 text-black' : 'bg-neon-green text-black shadow-[0_0_15px_rgba(16,185,129,0.4)]' 
                                  : task.type === 'social' ? 'bg-blue-500/20 text-blue-400' 
                                  : task.type === 'video' ? 'bg-red-500/20 text-red-400' : 'bg-purple-500/20 text-purple-400'
                            }`}>
                                 {isCompleted ? (
                                     isDaily ? <Clock size={24} /> : <CheckCircle2 size={24} />
                                 ) : (
                                     <span className="text-xl font-bold capitalize">{task.icon?.charAt(0) || 'T'}</span>
                                 )}
                            </div>
                            <div>
                                <h3 className={`font-bold text-sm transition-all ${isCompleted ? 'text-gray-400 line-through' : 'text-white'}`}>{task.title}</h3>
                                <div className="flex items-center gap-2 text-xs mt-1">
                                     {!isCompleted && (
                                        <>
                                            <span className={`px-2 py-0.5 rounded-md bg-white/5 ${task.difficulty === 'Easy' ? 'text-green-400' : task.difficulty === 'Medium' ? 'text-yellow-400' : 'text-red-400'}`}>
                                                {task.difficulty}
                                            </span>
                                            <span className="text-gray-500 border-l border-gray-700 pl-2 flex items-center gap-1">
                                                {task.frequency === 'daily' ? <Clock size={10}/> : null} 
                                                {task.frequency === 'daily' ? 'Daily' : 'One-time'}
                                            </span>
                                        </>
                                     )}
                                     {isCompleted && !isDaily && <span className="text-neon-green font-bold">Done</span>}
                                     {isCompleted && isDaily && (
                                         <div className="flex items-center gap-1.5 text-yellow-500 font-bold">
                                             <span>Resets in:</span>
                                             <TaskTimer />
                                         </div>
                                     )}
                                </div>
                            </div>
                        </div>
                        <div className="text-right">
                           {isCompleted ? (
                               <div className="text-gray-500 text-xs font-mono bg-white/5 px-2 py-1 rounded-lg">
                                   +${task.reward.toFixed(2)}
                               </div>
                           ) : (
                               <div className="group-hover:translate-x-1 transition duration-300 flex flex-col items-end">
                                    <div className="bg-neon-green/10 border border-neon-green/50 px-3 py-1.5 rounded-lg shadow-[0_0_15px_rgba(16,185,129,0.25)] backdrop-blur-md">
                                        <p className="text-neon-green font-black text-base tracking-wide drop-shadow-[0_0_5px_rgba(16,185,129,0.8)]">
                                            +${task.reward.toFixed(2)}
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-1 mt-1.5 text-[10px] text-gray-400 font-bold uppercase tracking-wider group-hover:text-white transition-colors">
                                        Claim <ChevronRight size={12} />
                                    </div>
                               </div>
                           )}
                        </div>
                     </GlassCard>
                </motion.div>
             );
          })}
      </div>

      <AnimatePresence>
          {selectedTask && (
             <motion.div 
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center sm:p-4"
                onClick={() => claimStatus !== 'verifying' && setSelectedTask(null)}
             >
                 <motion.div 
                    initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
                    className="bg-dark-900 w-full max-w-md rounded-t-3xl sm:rounded-3xl border border-white/10 p-6 pb-10 sm:pb-6 min-h-[450px] flex flex-col justify-center relative overflow-hidden"
                    onClick={e => e.stopPropagation()}
                 >
                     {claimStatus === 'success' ? (
                        <div className="flex flex-col items-center justify-center py-4 text-center relative z-10">
                             <motion.div 
                               initial={{ scale: 0 }} animate={{ scale: 1 }} 
                               transition={{ type: 'spring', damping: 12, stiffness: 200 }}
                               className="w-24 h-24 bg-gradient-to-tr from-neon-green to-emerald-500 rounded-full flex items-center justify-center mb-6 shadow-[0_0_40px_rgba(16,185,129,0.5)]"
                             >
                                 <CheckCircle2 size={48} className="text-white" />
                             </motion.div>
                             <h2 className="text-2xl font-bold text-white mb-2">Reward Claimed!</h2>
                             <div className="flex items-center gap-2 text-4xl font-bold text-neon-glow">
                                 <Sparkles size={28} className="text-yellow-400" />
                                 <span>+${selectedTask.reward.toFixed(2)}</span>
                             </div>
                        </div>
                     ) : (
                        <>
                            <div className="w-12 h-1 bg-white/20 rounded-full mx-auto mb-6 sm:hidden absolute top-4 left-1/2 -translate-x-1/2"></div>
                            
                            <div className="text-center mb-6 mt-4">
                                <div className="w-16 h-16 mx-auto bg-white/5 border border-white/10 rounded-2xl flex items-center justify-center text-neon-green mb-4 shadow-lg">
                                    <span className="text-3xl font-bold capitalize">{selectedTask.icon?.charAt(0)}</span>
                                </div>
                                <h2 className="text-2xl font-bold text-white mb-2">{selectedTask.title}</h2>
                                <p className="text-3xl font-bold text-neon-glow">+${selectedTask.reward.toFixed(2)}</p>
                                <p className="text-sm text-gray-400 mt-2 px-4">{selectedTask.description || "Complete the steps below to earn your reward."}</p>
                            </div>

                            <div className="space-y-4 mb-8">
                                <div className="bg-white/5 p-4 rounded-xl border border-white/5">
                                    <div className="flex items-center gap-4 mb-3">
                                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${taskStarted ? 'bg-neon-green text-black' : 'bg-white/10 text-white'}`}>1</div>
                                        <div className="flex-1">
                                            <p className="text-sm font-bold text-white">Visit Link</p>
                                            <p className="text-xs text-gray-500">Open the task URL</p>
                                        </div>
                                        {taskStarted && <CheckCircle2 size={16} className="text-neon-green" />}
                                    </div>
                                    <div className="w-0.5 h-4 bg-white/10 ml-4 mb-3 -mt-3"></div>
                                    <div className="flex items-center gap-4">
                                        <div className="w-8 h-8 rounded-full bg-white/10 text-gray-400 flex items-center justify-center text-xs font-bold">2</div>
                                        <div className="flex-1">
                                            <p className="text-sm font-bold text-gray-300">Verify & Claim</p>
                                            <p className="text-xs text-gray-500">Confirm completion</p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3 mt-auto">
                                <button 
                                    onClick={handleStartTask}
                                    className={`py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition ${taskStarted ? 'bg-white/5 text-gray-400' : 'bg-white text-black hover:bg-gray-200'}`}
                                >
                                    <ExternalLink size={18} /> {taskStarted ? 'Link Opened' : 'Start Task'}
                                </button>
                                <button 
                                    onClick={handleVerifyAndClaim}
                                    disabled={!taskStarted || claimStatus === 'verifying'}
                                    className={`py-3 rounded-xl font-bold transition flex items-center justify-center gap-2 ${!taskStarted ? 'bg-white/5 text-gray-500 cursor-not-allowed' : 'bg-neon-green text-black hover:bg-emerald-400'}`}
                                >
                                    {claimStatus === 'verifying' ? <Loader className="w-5 h-5 border-black" /> : 'Claim Reward'}
                                </button>
                            </div>
                            {claimStatus === 'error' && <p className="text-red-500 text-xs text-center mt-2 font-bold">Verification failed. Try again.</p>}
                        </>
                     )}
                 </motion.div>
             </motion.div>
          )}
      </AnimatePresence>
    </div>
  );
};

export default Tasks;
