
import React, { useState, useEffect, useRef } from 'react';
import GlassCard from '../components/GlassCard';
import { CheckCircle2, ChevronRight, ExternalLink, Sparkles, Clock, RefreshCw, UploadCloud, Smartphone, PlayCircle, Share2, Globe, Search, Loader2, Star, PenTool, Lock } from 'lucide-react';
import { supabase } from '../integrations/supabase/client';
import { motion, AnimatePresence } from 'framer-motion';
import { MarketTask } from '../types';
import { createTransaction, updateWallet } from '../lib/actions';
import Skeleton from '../components/Skeleton';
import { useUI } from '../context/UIContext';
import BalanceDisplay from '../components/BalanceDisplay';

const MotionDiv = motion.div as any;

const Tasks: React.FC = () => {
  const { toast } = useUI();
  const [loading, setLoading] = useState(true);
  const [tasks, setTasks] = useState<MarketTask[]>([]);
  const [selectedTask, setSelectedTask] = useState<MarketTask | null>(null);
  const [filter, setFilter] = useState('all');
  
  // Submission State
  const [proofText, setProofText] = useState('');
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'submitting' | 'success'>('idle');
  const [linkOpened, setLinkOpened] = useState(false);
  
  // Security Timer
  const [countDown, setCountDown] = useState(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
     fetchTasks();
     return () => {
         if (timerRef.current) clearInterval(timerRef.current);
     };
  }, []);

  const fetchTasks = async () => {
     setLoading(true);
     const { data: { session } } = await supabase.auth.getSession();
     if(!session) return;

     // 1. Fetch Active Marketplace Tasks with remaining qty
     const { data: allTasks } = await supabase
        .from('marketplace_tasks')
        .select('*')
        .eq('status', 'active')
        .gt('remaining_quantity', 0)
        .order('price_per_action', {ascending: false});
     
     // 2. Fetch User Submissions to filter out done tasks
     const { data: mySubs } = await supabase
        .from('marketplace_submissions')
        .select('task_id')
        .eq('worker_id', session.user.id);
     
     const completedIds = new Set(mySubs?.map(s => s.task_id) || []);

     if (allTasks) {
         // Filter out completed tasks
         const available = allTasks.filter((t: MarketTask) => !completedIds.has(t.id));
         setTasks(available as MarketTask[]);
     }
     setLoading(false);
  };

  const handleOpenLink = () => {
      if (!selectedTask) return;
      
      // Start Smart Timer
      const duration = selectedTask.timer_seconds || 30; // Default 30s
      setCountDown(duration);
      setLinkOpened(true);
      
      window.open(selectedTask.target_url, '_blank');

      if (timerRef.current) clearInterval(timerRef.current);
      
      timerRef.current = setInterval(() => {
          setCountDown((prev) => {
              if (prev <= 1) {
                  if (timerRef.current) clearInterval(timerRef.current);
                  return 0;
              }
              return prev - 1;
          });
      }, 1000);
  };

  const handleSubmitProof = async () => {
      if (!selectedTask || !linkOpened) return;
      if (countDown > 0) {
          toast.warning(`Please wait ${countDown} seconds to verify task completion.`);
          return;
      }
      
      // Simple validation
      if (selectedTask.proof_type !== 'auto' && proofText.length < 3) {
          toast.error("Please provide valid proof details");
          return;
      }

      setSubmitStatus('submitting');
      
      try {
          const { data: { session } } = await supabase.auth.getSession();
          if (!session) throw new Error("No session");

          // 1. Create Submission
          const isAuto = selectedTask.proof_type === 'auto';
          const initialStatus = isAuto ? 'approved' : 'pending';

          const { error: subError } = await supabase.from('marketplace_submissions').insert({
              task_id: selectedTask.id,
              worker_id: session.user.id,
              proof_data: proofText || 'Auto Verified',
              status: initialStatus
          });

          if (subError) throw subError;

          // 2. Decrement Quantity
          await supabase.rpc('decrement_task_quantity', { task_id: selectedTask.id });

          // 3. If Auto-Approve, Pay User Immediately
          if (isAuto) {
              await updateWallet(session.user.id, selectedTask.worker_reward, 'increment', 'earning_balance');
              await updateWallet(session.user.id, selectedTask.worker_reward, 'increment', 'total_earning');
              await updateWallet(session.user.id, selectedTask.worker_reward, 'increment', 'today_earning');
              
              await createTransaction(session.user.id, 'earn', selectedTask.worker_reward, `Task: ${selectedTask.title}`);
              toast.success(`Reward Paid: $${selectedTask.worker_reward.toFixed(3)}`);
              
              // Trigger Global Refresh
              window.dispatchEvent(new Event('wallet_updated'));
          } else {
              toast.success("Proof Submitted! Waiting for approval.");
          }

          setSubmitStatus('success');
          
          setTimeout(() => {
              setSubmitStatus('idle');
              setSelectedTask(null);
              setProofText('');
              setLinkOpened(false);
              setCountDown(0);
              fetchTasks(); // Refresh list
          }, 1500);

      } catch (e: any) {
          console.error(e);
          toast.error("Error submitting: " + e.message);
          setSubmitStatus('idle');
      }
  };

  const filteredTasks = tasks.filter(t => filter === 'all' || t.category === filter);

  const getIcon = (cat: string) => {
      switch(cat) {
          case 'social': return <Share2 size={20} className="text-blue-400"/>;
          case 'video': return <PlayCircle size={20} className="text-red-400"/>;
          case 'app': return <Smartphone size={20} className="text-purple-400"/>;
          case 'seo': return <Search size={20} className="text-orange-400"/>;
          case 'review': return <Star size={20} className="text-yellow-400"/>;
          case 'content': return <PenTool size={20} className="text-pink-400"/>;
          default: return <Globe size={20} className="text-green-400"/>;
      }
  };

  const closeModal = () => {
      if (submitStatus !== 'submitting') {
          setSelectedTask(null);
          setLinkOpened(false);
          setCountDown(0);
          if(timerRef.current) clearInterval(timerRef.current);
      }
  };

  if (loading) {
      return (
        <div className="pb-24 sm:pl-20 sm:pt-6 space-y-6">
           <Skeleton className="w-48 h-8 mb-4 mx-4 sm:mx-0" />
           <div className="space-y-3 px-4 sm:px-0">
               {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-20 rounded-2xl" />)}
           </div>
        </div>
      );
  }

  return (
    <div className="pb-24 sm:pl-20 sm:pt-6 space-y-6">
      
      {/* Header */}
      <div className="flex flex-col gap-4 px-4 sm:px-0">
          <div className="flex justify-between items-end">
             <div>
                <h1 className="text-2xl font-display font-bold text-white mb-1">Earning Market</h1>
                <p className="text-gray-400 text-sm">Complete tasks to earn cash.</p>
             </div>
             <button onClick={fetchTasks} className="p-2 bg-white/5 rounded-lg text-gray-400 hover:text-white"><RefreshCw size={18}/></button>
          </div>

          {/* Filters */}
          <div className="flex overflow-x-auto no-scrollbar gap-2 pb-2">
              {['all', 'social', 'video', 'seo', 'review', 'content'].map(f => (
                  <button 
                    key={f}
                    onClick={() => setFilter(f)}
                    className={`px-4 py-2 rounded-xl text-xs font-bold uppercase whitespace-nowrap transition ${filter === f ? 'bg-white text-black' : 'bg-white/5 text-gray-400 border border-white/5'}`}
                  >
                      {f}
                  </button>
              ))}
          </div>
      </div>

      <div className="space-y-3 px-4 sm:px-0">
          {filteredTasks.length === 0 ? (
              <div className="text-center py-16 bg-white/5 rounded-2xl border border-white/5 text-gray-500">
                  No tasks available in this category.
              </div>
          ) : (
              filteredTasks.map((task) => (
                <MotionDiv
                   key={task.id}
                   layout
                   initial={{ opacity: 0, y: 10 }}
                   animate={{ opacity: 1, y: 0 }}
                   whileHover={{ scale: 1.01 }}
                   className="cursor-pointer"
                   onClick={() => setSelectedTask(task)}
                >
                     <GlassCard className={`flex items-center justify-between p-4 group hover:bg-white/5 transition border border-white/5 ${task.worker_reward > 0.20 ? 'border-l-4 border-l-yellow-400' : 'hover:border-purple-500/30'}`}>
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-xl bg-black/30 flex items-center justify-center border border-white/10">
                                {getIcon(task.category)}
                            </div>
                            <div>
                                <div className="flex items-center gap-2">
                                    <h3 className="font-bold text-white text-sm line-clamp-1">{task.title}</h3>
                                    {task.worker_reward > 0.20 && <span className="bg-yellow-500 text-black text-[9px] font-bold px-1.5 py-0.5 rounded">HOT</span>}
                                </div>
                                <div className="flex items-center gap-2 text-xs text-gray-500 mt-1">
                                    <span className="capitalize">{task.category}</span>
                                    <span>•</span>
                                    <span className="text-purple-400">{task.remaining_quantity} left</span>
                                </div>
                            </div>
                        </div>
                        <div className="text-right">
                           <div className="bg-neon-green/10 border border-neon-green/30 px-3 py-1.5 rounded-lg">
                                <p className="text-neon-green font-black text-sm">
                                    <BalanceDisplay amount={task.worker_reward} />
                                </p>
                           </div>
                        </div>
                     </GlassCard>
                </MotionDiv>
             ))
          )}
      </div>

      {/* Task Details Modal */}
      <AnimatePresence>
          {selectedTask && (
             <MotionDiv 
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-end sm:items-center justify-center p-4"
                onClick={closeModal}
             >
                 <MotionDiv 
                    initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
                    className="bg-dark-900 w-full max-w-md rounded-t-3xl sm:rounded-3xl border border-white/10 p-6 pb-10 sm:pb-6 relative overflow-hidden"
                    onClick={(e: MouseEvent) => e.stopPropagation()}
                 >
                     {submitStatus === 'success' ? (
                        <div className="flex flex-col items-center justify-center py-10 text-center">
                             <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mb-4 text-green-500 border border-green-500/50">
                                 <CheckCircle2 size={40} />
                             </div>
                             <h2 className="text-2xl font-bold text-white mb-2">Submitted!</h2>
                             <p className="text-gray-400">Your proof is under review.</p>
                        </div>
                     ) : (
                        <>
                            <div className="w-12 h-1 bg-white/20 rounded-full mx-auto mb-6 sm:hidden"></div>
                            
                            <div className="flex items-center gap-4 mb-6">
                                <div className="w-16 h-16 bg-white/5 rounded-2xl flex items-center justify-center text-3xl">
                                    {getIcon(selectedTask.category)}
                                </div>
                                <div>
                                    <h2 className="text-xl font-bold text-white leading-tight">{selectedTask.title}</h2>
                                    <p className="text-gray-400 text-xs mt-1 capitalize">{selectedTask.category} Task</p>
                                    <p className="text-neon-green font-bold text-lg mt-1"><BalanceDisplay amount={selectedTask.worker_reward}/></p>
                                </div>
                            </div>

                            <div className="bg-white/5 p-4 rounded-xl border border-white/5 mb-6 space-y-4">
                                <div className="p-3 bg-blue-500/10 rounded-lg text-blue-300 text-xs leading-relaxed border border-blue-500/20">
                                    <strong>Instruction:</strong> {selectedTask.description || "Follow the link and complete the action."}
                                    <br/>
                                    {selectedTask.proof_type === 'text' && <span className="text-yellow-400 block mt-1">⚠️ Requirement: Submit the Secret Code found in the content.</span>}
                                </div>

                                {/* Step 1 */}
                                <div className="flex gap-4">
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${linkOpened ? 'bg-green-500 text-black' : 'bg-white/10 text-white'}`}>1</div>
                                    <div className="flex-1">
                                        <p className="text-sm font-bold text-white mb-1">Open Link & Perform Action</p>
                                        <button 
                                            onClick={handleOpenLink}
                                            className="text-xs flex items-center gap-2 text-blue-400 hover:text-blue-300 transition break-all"
                                        >
                                            {selectedTask.target_url} <ExternalLink size={12}/>
                                        </button>
                                    </div>
                                </div>
                                {/* Step 2 */}
                                <div className="flex gap-4">
                                    <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-xs font-bold shrink-0 text-white">2</div>
                                    <div className="flex-1">
                                        <p className="text-sm font-bold text-white mb-2">Submit Proof</p>
                                        {selectedTask.proof_type === 'auto' ? (
                                            <p className="text-xs text-gray-500 italic">No proof needed. Wait for timer.</p>
                                        ) : (
                                            <textarea 
                                                value={proofText}
                                                onChange={e => setProofText(e.target.value)}
                                                className="w-full bg-black/40 border border-white/10 rounded-lg p-3 text-white text-xs focus:border-purple-500 outline-none h-24 resize-none"
                                                placeholder={selectedTask.proof_type === 'screenshot' ? "Paste screenshot URL here..." : "Type required Secret Code/Username..."}
                                            />
                                        )}
                                    </div>
                                </div>
                            </div>

                            <button 
                                onClick={handleSubmitProof}
                                disabled={!linkOpened || submitStatus === 'submitting' || countDown > 0}
                                className="w-full py-4 bg-white text-black font-bold rounded-xl hover:bg-gray-200 transition flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {submitStatus === 'submitting' ? <Loader2 className="animate-spin"/> : (
                                    countDown > 0 ? (
                                        <span className="flex items-center gap-2">
                                            <Clock size={16} /> Verifying... {countDown}s
                                        </span>
                                    ) : (
                                        <span className="flex items-center gap-2">
                                            <Lock size={16} className={linkOpened ? 'hidden' : ''} />
                                            Verify & Claim Reward
                                        </span>
                                    )
                                )}
                            </button>
                        </>
                     )}
                 </MotionDiv>
             </MotionDiv>
          )}
      </AnimatePresence>
    </div>
  );
};

export default Tasks;
