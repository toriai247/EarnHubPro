
import React, { useState, useEffect } from 'react';
import GlassCard from '../components/GlassCard';
import { 
  BadgeCheck, RefreshCw, Smartphone, Youtube, Share2, 
  Globe, Search, Loader2, Lock, X, Clock, AlertTriangle, ShieldCheck, ArrowRight, Flame, Building2, Star, Flag, Briefcase, MessageCircle, Crown, User, ExternalLink, FileCheck, UploadCloud, Type, Send, CheckCircle2, Timer
} from 'lucide-react';
import { supabase } from '../integrations/supabase/client';
import { useUI } from '../context/UIContext';
import BalanceDisplay from '../components/BalanceDisplay';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import Skeleton from '../components/Skeleton';
import { updateWallet, createTransaction } from '../lib/actions';

type TaskStatus = 'active' | 'pending' | 'approved' | 'rejected' | 'locked' | 'cooldown';

const Tasks: React.FC = () => {
  const { toast, confirm } = useUI();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [tasks, setTasks] = useState<any[]>([]); 
  const [taskStatuses, setTaskStatuses] = useState<Record<string, TaskStatus>>({});
  const [cooldownEnds, setCooldownEnds] = useState<Record<string, number>>({});
  const [currentTime, setCurrentTime] = useState(Date.now());
  const [filter, setFilter] = useState('all');
  
  // Modals
  const [selectedTask, setSelectedTask] = useState<any | null>(null);
  const [reportTask, setReportTask] = useState<any | null>(null);
  const [reportReason, setReportReason] = useState('');

  // Execution State (Merged from TaskBrowser)
  const [executionTask, setExecutionTask] = useState<any | null>(null);
  const [executionStep, setExecutionStep] = useState<'briefing' | 'running' | 'verify' | 'completed' | 'pending_approval'>('briefing');
  const [timer, setTimer] = useState(0);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [quizAnswer, setQuizAnswer] = useState<number | null>(null);
  const [manualInput, setManualInput] = useState('');
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
     fetchTasks();
     
     // Global ticker for cooldowns
     const interval = setInterval(() => {
         setCurrentTime(Date.now());
     }, 1000);
     return () => clearInterval(interval);
  }, []);

  // Timer Logic for Execution
  useEffect(() => {
      let interval: any;
      if (isTimerRunning && timer > 0) {
          interval = setInterval(() => {
              setTimer((prev) => prev - 1);
          }, 1000);
      } else if (timer === 0 && isTimerRunning) {
          setIsTimerRunning(false);
          setExecutionStep('verify');
          toast.success("Time completed! You can now verify.");
      }
      return () => clearInterval(interval);
  }, [isTimerRunning, timer]);

  const fetchTasks = async () => {
     setLoading(true);
     const { data: { session } } = await supabase.auth.getSession();
     if(!session) return;

     // 1. Get All Active Tasks with Creator Profile joined
     const { data: allTasks, error } = await supabase
        .from('marketplace_tasks')
        .select('*, creator:profiles(role, is_dealer, name_1, is_kyc_1)')
        .eq('status', 'active')
        .gt('remaining_quantity', 0)
        .order('worker_reward', {ascending: false}); 
     
     if (error) {
         console.error("Error fetching tasks:", error);
         setLoading(false);
         return;
     }
     
     if (!allTasks) { setLoading(false); return; }

     // 2. Get User Submissions
     const { data: mySubs } = await supabase
        .from('marketplace_submissions')
        .select('task_id, status, created_at')
        .eq('worker_id', session.user.id)
        .order('created_at', { ascending: false }); // Get latest first
     
     const statusMap: Record<string, TaskStatus> = {};
     const cooldownMap: Record<string, number> = {};
     const processedTaskIds = new Set<string>();
     
     const ONE_DAY_MS = 24 * 60 * 60 * 1000;
     const now = Date.now();

     // 3. Process Statuses & Auto-Complete Check
     // Only process the *latest* submission for each task to determine current status
     for (const s of (mySubs || [])) {
         if (processedTaskIds.has(s.task_id)) continue; // Skip older submissions for same task
         processedTaskIds.add(s.task_id);

         // Handle Pending
         if (s.status === 'pending') {
             statusMap[s.task_id] = 'pending';
             
             // Client-side Auto Approve Logic Check (Simulated Cron)
             const task = allTasks.find((t: any) => t.id === s.task_id);
             if (task) {
                 const submitTime = new Date(s.created_at).getTime();
                 const hoursPassed = (now - submitTime) / (1000 * 60 * 60);
                 const autoHours = task.auto_approve_hours || 24;
                 
                 if (hoursPassed > autoHours) {
                     // It essentially becomes approved, check cooldown logic immediately
                     const completionTime = submitTime; // Treated as approved at submit time for simplicity, or we could say now.
                     // If it auto-approves, we usually treat it as "Done". 
                     // Let's set it to approved for logic flow, then let the next block handle cooldown.
                     s.status = 'approved'; 
                 }
             }
         }

         // Handle Approved / Rejected
         if (s.status === 'approved') {
             const submissionTime = new Date(s.created_at).getTime();
             const timeDiff = now - submissionTime;

             if (timeDiff < ONE_DAY_MS) {
                 // Less than 24 hours? Cooldown.
                 statusMap[s.task_id] = 'cooldown';
                 cooldownMap[s.task_id] = submissionTime + ONE_DAY_MS;
             } else {
                 // More than 24 hours? It's Active again! 
                 // We do NOT set it in statusMap, so it appears as default (Active)
             }
         } else if (s.status === 'rejected') {
             // If rejected, user can usually try again immediately, or we can lock it.
             // For now, let's allow retry immediately (so don't set statusMap, or set to 'rejected' if we want to show history)
             // Let's allow retry:
             // statusMap[s.task_id] = 'rejected'; 
         }
     }

     setTaskStatuses(statusMap);
     setCooldownEnds(cooldownMap);
     setTasks(allTasks);
     setLoading(false);
  };

  const handleOpenTask = (task: any) => {
      const status = taskStatuses[task.id];
      
      if (status === 'locked') { toast.error("Locked due to failed attempts."); return; }
      if (status === 'pending') { toast.info("Submission under review."); return; }
      
      if (status === 'cooldown') {
          const endTime = cooldownEnds[task.id];
          const remaining = endTime - Date.now();
          if (remaining > 0) {
              const hours = Math.floor(remaining / (1000 * 60 * 60));
              const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));
              toast.info(`Task available in ${hours}h ${minutes}m`);
              return;
          }
      }

      setSelectedTask(task);
  };

  const handleStartExecution = () => {
      if (!selectedTask) return;
      setExecutionTask(selectedTask);
      setTimer(selectedTask.timer_seconds || 30);
      setExecutionStep('briefing');
      setQuizAnswer(null);
      setManualInput('');
      setUploadedFile(null);
      setIsSubmitting(false);
      setSelectedTask(null); // Close detail modal
  };

  const handleOpenLink = () => {
      if (!executionTask) return;
      window.open(executionTask.target_url, '_blank');
      setExecutionStep('running');
      setIsTimerRunning(true);
      toast.info(`Task started! Return here after ${timer} seconds.`);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files[0]) {
          setUploadedFile(e.target.files[0]);
      }
  };

  const handleSubmitProof = async () => {
      if (!executionTask) return;
      setIsSubmitting(true);

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      // --- SCENARIO 1: AUTO QUIZ ---
      if (executionTask.proof_type === 'ai_quiz' && executionTask.quiz_config) {
          if (quizAnswer === executionTask.quiz_config.correct_index) {
              await approveTask(session.user.id);
          } else {
              toast.error("Incorrect answer. Please check content again.");
              setIsSubmitting(false);
          }
      } 
      // --- SCENARIO 2: FILE VERIFICATION ---
      else if (executionTask.proof_type === 'file_check') {
          if (!uploadedFile) {
              toast.error("Please upload the downloaded file.");
              setIsSubmitting(false);
              return;
          }
          if (executionTask.expected_file_name && uploadedFile.name === executionTask.expected_file_name) {
              await approveTask(session.user.id);
          } else {
              toast.error(`File mismatch! Uploaded: ${uploadedFile.name} | Expected: ${executionTask.expected_file_name}`);
              setIsSubmitting(false);
          }
      }
      // --- SCENARIO 3: MANUAL TEXT INPUT ---
      else if (executionTask.proof_type === 'text_input') {
          if (!manualInput.trim()) {
              toast.error("Please enter the required information.");
              setIsSubmitting(false);
              return;
          }

          try {
              await supabase.from('marketplace_submissions').insert({
                  task_id: executionTask.id,
                  worker_id: session.user.id,
                  status: 'pending',
                  submission_data: { method: 'text', input: manualInput }
              });

              setExecutionStep('pending_approval');
              toast.success("Submission Sent for Approval");
              setTaskStatuses(prev => ({...prev, [executionTask.id]: 'pending'}));
              setTimeout(() => setExecutionTask(null), 3000);

          } catch (e: any) {
              toast.error(e.message);
          }
          setIsSubmitting(false);
      }
  };

  const approveTask = async (userId: string) => {
      try {
          if(!executionTask) return;
          
          await supabase.from('marketplace_submissions').insert({
              task_id: executionTask.id,
              worker_id: userId,
              status: 'approved',
              submission_data: { method: executionTask.proof_type, answer: quizAnswer, file: uploadedFile?.name }
          });

          // Decrement Qty
          // Ideally use: await supabase.rpc('decrement_task_quantity', { task_id: executionTask.id });
          
          // Pay User
          await updateWallet(userId, executionTask.worker_reward, 'increment', 'earning_balance');
          await createTransaction(userId, 'earn', executionTask.worker_reward, `Task: ${executionTask.title}`);

          setExecutionStep('completed');
          // Set to cooldown immediately in UI
          setTaskStatuses(prev => ({...prev, [executionTask.id]: 'cooldown'}));
          setCooldownEnds(prev => ({...prev, [executionTask.id]: Date.now() + (24 * 60 * 60 * 1000)}));
          
          toast.success("Verified! Reward Credited.");
          setTimeout(() => setExecutionTask(null), 2500);
      } catch (e: any) {
          toast.error(e.message);
          setIsSubmitting(false);
      }
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

  const formatTimeRemaining = (endTime: number) => {
      const diff = Math.max(0, endTime - currentTime);
      if (diff <= 0) return "Ready";
      const h = Math.floor(diff / (1000 * 60 * 60));
      const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const s = Math.floor((diff % (1000 * 60)) / 1000);
      return `${h}h ${m}m ${s}s`;
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

  const sortedTasks = tasks.filter((t: any) => filter === 'all' || t.category === filter);

  if (loading) return <div className="p-4 space-y-4"><Skeleton className="h-20" /><Skeleton className="h-20" /></div>;

  return (
    <div className="pb-24 sm:pl-20 sm:pt-6 space-y-6">
      
      {/* HEADER & FILTERS */}
      <div className="flex flex-col gap-4 px-4 sm:px-0">
          <div className="flex justify-between items-end">
             <div>
                <h1 className="text-2xl font-bold text-white mb-1 flex items-center gap-2">
                    <Briefcase className="text-yellow-400"/> Micro Jobs
                </h1>
                <p className="text-gray-400 text-sm">Tasks reset every 24 hours.</p>
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

      {/* TASK LIST */}
      <div className="space-y-3 px-4 sm:px-0">
          {sortedTasks.length === 0 ? (
              <div className="text-center py-12 bg-[#111] rounded-2xl border border-[#222]">
                  <Briefcase size={40} className="mx-auto text-gray-600 mb-3" />
                  <p className="text-gray-500 font-medium">No tasks available in this category.</p>
                  <button onClick={fetchTasks} className="mt-4 text-xs text-blue-400 hover:text-blue-300 font-bold">Refresh List</button>
              </div>
          ) : (
              sortedTasks.map((task) => {
                    let status = taskStatuses[task.id];
                    // Double check cooldown expiration visually
                    if (status === 'cooldown' && cooldownEnds[task.id] && cooldownEnds[task.id] <= currentTime) {
                        status = undefined; // Expired, back to active
                    }

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
                                    status === 'cooldown' ? 'border-gray-700 bg-[#0f0f0f] opacity-80 grayscale-[0.5]' :
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
                                    {status === 'cooldown' ? (
                                        <div className="flex flex-col items-end">
                                            <span className="text-orange-400 font-bold text-[10px] flex items-center gap-1 mb-1"><Timer size={10}/> NEXT IN</span>
                                            <span className="font-mono text-xs text-gray-400">{formatTimeRemaining(cooldownEnds[task.id])}</span>
                                        </div>
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
              })
          )}
      </div>

      {/* --- MODALS --- */}

      {/* 1. Task Detail Preview */}
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
                        onClick={handleStartExecution}
                        className="w-full py-4 bg-white text-black font-black uppercase rounded-xl hover:bg-gray-200 transition shadow-lg flex items-center justify-center gap-2"
                     >
                         Start Task <ArrowRight size={18}/>
                     </button>
                 </GlassCard>
             </motion.div>
          )}
      </AnimatePresence>

      {/* 2. Execution Modal (Replaces TaskBrowser Page) */}
      <AnimatePresence>
          {executionTask && (
              <motion.div 
                  initial={{ opacity: 0, scale: 0.95 }} 
                  animate={{ opacity: 1, scale: 1 }} 
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="fixed inset-0 z-[100] bg-[#050505] flex flex-col p-6 overflow-y-auto"
              >
                  <div className="flex items-center gap-4 mb-8">
                      <button onClick={() => setExecutionTask(null)} className="p-2 bg-white/10 rounded-xl hover:bg-white/20 transition text-white">
                          <X size={20} />
                      </button>
                      <div className="flex-1">
                          <h1 className="text-lg font-bold leading-tight text-white">{executionTask.title}</h1>
                          <p className="text-xs text-gray-400 mt-0.5">{executionTask.company_name || 'Marketplace Task'}</p>
                      </div>
                      <div className="bg-green-500/10 border border-green-500/20 px-3 py-1.5 rounded-lg text-right">
                          <p className="text-[9px] text-gray-500 uppercase font-bold">Reward</p>
                          <p className="text-green-400 font-mono font-bold text-sm"><BalanceDisplay amount={executionTask.worker_reward} /></p>
                      </div>
                  </div>

                  <div className="flex-1 flex flex-col items-center justify-center max-w-md mx-auto w-full space-y-8">
                      {/* Status Indicator */}
                      <div className="relative">
                          <div className={`w-24 h-24 rounded-full flex items-center justify-center border-4 transition-all duration-500 ${
                              executionStep === 'completed' ? 'border-green-500 bg-green-500/20' : 
                              executionStep === 'pending_approval' ? 'border-yellow-500 bg-yellow-500/20' :
                              executionStep === 'verify' ? 'border-blue-500 bg-blue-500/20' :
                              executionStep === 'running' ? 'border-yellow-500 bg-yellow-500/20' :
                              'border-white/10 bg-white/5'
                          }`}>
                              {executionStep === 'completed' ? <CheckCircle2 size={40} className="text-green-500" /> :
                               executionStep === 'pending_approval' ? <Clock size={40} className="text-yellow-500" /> :
                               executionStep === 'verify' ? <ShieldCheck size={40} className="text-blue-500" /> :
                               executionStep === 'running' ? <Clock size={40} className="text-yellow-500 animate-pulse" /> :
                               <Globe size={40} className="text-gray-400" />}
                          </div>
                      </div>

                      <div className="text-center space-y-2">
                          <h2 className="text-2xl font-black uppercase tracking-tight text-white">
                              {executionStep === 'completed' ? 'Mission Complete' :
                               executionStep === 'pending_approval' ? 'Under Review' :
                               executionStep === 'verify' ? 'Verification Ready' :
                               executionStep === 'running' ? 'Task in Progress' :
                               'Task Briefing'}
                          </h2>
                          <p className="text-sm text-gray-400 max-w-xs mx-auto leading-relaxed">
                              {executionStep === 'completed' ? 'Reward has been credited.' :
                               executionStep === 'pending_approval' ? 'Submission sent. Dealer will verify shortly.' :
                               executionStep === 'verify' ? 'Complete the check below to claim.' :
                               executionStep === 'running' ? `Wait ${timer}s on the target page.` :
                               executionTask.description}
                          </p>
                      </div>

                      <GlassCard className="w-full border border-white/10 bg-[#111]">
                          <AnimatePresence mode="wait">
                              {executionStep === 'briefing' && (
                                  <motion.div key="briefing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
                                      <div className="flex items-center gap-3 p-3 bg-white/5 rounded-xl border border-white/5">
                                          <div className="p-2 bg-blue-500/20 rounded-lg text-blue-400"><Clock size={18}/></div>
                                          <div className="text-left">
                                              <p className="text-[10px] text-gray-500 uppercase font-bold">Required Time</p>
                                              <p className="text-white font-bold">{timer} Seconds</p>
                                          </div>
                                      </div>
                                      <button onClick={handleOpenLink} className="w-full py-4 bg-white text-black font-black uppercase rounded-xl hover:bg-gray-200 transition shadow-lg flex items-center justify-center gap-2 group">
                                          Start Task <ExternalLink size={18} className="group-hover:translate-x-1 transition-transform"/>
                                      </button>
                                  </motion.div>
                              )}

                              {executionStep === 'running' && (
                                  <motion.div key="running" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="text-center space-y-4 py-4">
                                      <p className="text-3xl font-mono font-bold text-white tabular-nums">00:{timer < 10 ? `0${timer}` : timer}</p>
                                      <div className="w-full bg-gray-800 h-2 rounded-full overflow-hidden">
                                          <motion.div className="h-full bg-yellow-500" initial={{ width: '0%' }} animate={{ width: '100%' }} transition={{ duration: executionTask.timer_seconds, ease: "linear" }} />
                                      </div>
                                      <p className="text-xs text-yellow-500 animate-pulse font-bold">Do not close the target window...</p>
                                      <button onClick={handleOpenLink} className="text-xs text-gray-500 underline hover:text-white">Re-open Link</button>
                                  </motion.div>
                              )}

                              {executionStep === 'verify' && (
                                  <motion.div key="verify" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
                                      {executionTask.proof_type === 'ai_quiz' && executionTask.quiz_config ? (
                                          <div className="space-y-3 text-left">
                                              <div className="flex items-center gap-2 mb-2">
                                                  <AlertTriangle size={16} className="text-blue-500"/>
                                                  <span className="text-xs font-bold text-blue-400 uppercase">Quiz Check</span>
                                              </div>
                                              <p className="text-sm text-white font-medium">{executionTask.quiz_config.question}</p>
                                              <div className="space-y-2">
                                                  {executionTask.quiz_config.options.map((opt: string, idx: number) => (
                                                      <button key={idx} onClick={() => setQuizAnswer(idx)} className={`w-full p-3 rounded-xl text-left text-xs font-bold border transition flex justify-between items-center ${quizAnswer === idx ? 'bg-blue-600/20 border-blue-500 text-white' : 'bg-white/5 border-white/5 text-gray-400 hover:bg-white/10'}`}>
                                                          {opt} {quizAnswer === idx && <CheckCircle2 size={14} className="text-blue-500"/>}
                                                      </button>
                                                  ))}
                                              </div>
                                          </div>
                                      ) : executionTask.proof_type === 'file_check' ? (
                                          <div className="space-y-3 text-left">
                                              <div className="flex items-center gap-2 mb-2">
                                                  <FileCheck size={16} className="text-green-500"/>
                                                  <span className="text-xs font-bold text-green-400 uppercase">File Check</span>
                                              </div>
                                              <p className="text-sm text-white font-medium">Upload the downloaded file.</p>
                                              <p className="text-xs text-gray-500">Expected: {executionTask.expected_file_name}</p>
                                              <div className="relative border-2 border-dashed border-white/20 rounded-xl p-6 text-center hover:border-green-500/50 hover:bg-green-500/5 transition">
                                                  <input type="file" onChange={handleFileChange} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"/>
                                                  {uploadedFile ? (
                                                      <div className="flex flex-col items-center text-green-400">
                                                          <CheckCircle2 size={32} className="mb-2" />
                                                          <span className="font-bold text-sm">{uploadedFile.name}</span>
                                                      </div>
                                                  ) : (
                                                      <div className="flex flex-col items-center text-gray-400">
                                                          <UploadCloud size={32} className="mb-2" />
                                                          <span className="text-xs font-bold">Tap to Upload File</span>
                                                      </div>
                                                  )}
                                              </div>
                                              {uploadedFile && (
                                                  <div className="bg-black/30 p-2 rounded-lg border border-white/10 text-center">
                                                      <p className="text-[10px] text-gray-500 uppercase">Detected Filename</p>
                                                      <p className="text-white font-mono text-xs">{uploadedFile.name}</p>
                                                  </div>
                                              )}
                                          </div>
                                      ) : (
                                          <div className="space-y-3 text-left">
                                              <div className="flex items-center gap-2 mb-2">
                                                  <Type size={16} className="text-amber-500"/>
                                                  <span className="text-xs font-bold text-amber-400 uppercase">Input Required</span>
                                              </div>
                                              <p className="text-sm text-white font-medium">{executionTask.proof_question || "Enter required details:"}</p>
                                              <input type="text" value={manualInput} onChange={e => setManualInput(e.target.value)} className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white focus:border-amber-500 outline-none placeholder-gray-600 text-sm" placeholder="Type answer here..."/>
                                          </div>
                                      )}
                                      <button onClick={handleSubmitProof} disabled={isSubmitting || (executionTask.proof_type === 'ai_quiz' && quizAnswer === null) || (executionTask.proof_type === 'text_input' && !manualInput.trim()) || (executionTask.proof_type === 'file_check' && !uploadedFile)} className="w-full py-4 bg-green-500 text-black font-black uppercase rounded-xl hover:bg-green-400 transition shadow-lg shadow-green-900/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2">
                                          {isSubmitting ? <Loader2 className="animate-spin" size={20}/> : <><Send size={18}/> SUBMIT PROOF</>}
                                      </button>
                                  </motion.div>
                              )}

                              {executionStep === 'pending_approval' && (
                                  <motion.div key="pending" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="text-center py-6">
                                      <p className="text-yellow-400 font-bold mb-2">Verification Pending</p>
                                      <p className="text-xs text-gray-500 max-w-xs mx-auto mb-4">The ad runner will review your submission.</p>
                                      <button onClick={() => setExecutionTask(null)} className="text-sm text-white bg-white/10 px-6 py-2 rounded-lg hover:bg-white/20">Close</button>
                                  </motion.div>
                              )}

                              {executionStep === 'completed' && (
                                  <motion.div key="completed" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="text-center py-6">
                                      <div className="text-green-500 font-black text-2xl mb-2">+<BalanceDisplay amount={executionTask.worker_reward} /></div>
                                      <p className="text-xs text-gray-500">Credited to Earnings Wallet</p>
                                      <button onClick={() => setExecutionTask(null)} className="mt-6 text-sm text-white hover:underline">Close</button>
                                  </motion.div>
                              )}
                          </AnimatePresence>
                      </GlassCard>
                  </div>
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
