
import React, { useState, useEffect, useRef } from 'react';
import GlassCard from '../components/GlassCard';
import { 
  CheckCircle2, RefreshCw, Smartphone, PlayCircle, Share2, 
  Globe, Search, Loader2, Lock, X, Clock, AlertTriangle, ShieldCheck, UploadCloud, ArrowRight, Flame, BadgeCheck, Building2, Star, User
} from 'lucide-react';
import { supabase } from '../integrations/supabase/client';
import { MarketTask } from '../types';
import { updateWallet, createTransaction } from '../lib/actions';
import Skeleton from '../components/Skeleton';
import { useUI } from '../context/UIContext';
import BalanceDisplay from '../components/BalanceDisplay';
import { motion, AnimatePresence } from 'framer-motion';

type TaskStatus = 'active' | 'pending' | 'approved' | 'rejected' | 'locked';

const Tasks: React.FC = () => {
  const { toast } = useUI();
  const [loading, setLoading] = useState(true);
  const [tasks, setTasks] = useState<any[]>([]); 
  const [taskStatuses, setTaskStatuses] = useState<Record<string, TaskStatus>>({});
  
  const [selectedTask, setSelectedTask] = useState<any | null>(null);
  const [selectedSponsor, setSelectedSponsor] = useState<any | null>(null); // For Sponsor Modal
  const [filter, setFilter] = useState('all');
  
  // Task Execution State
  const [taskStep, setTaskStep] = useState<'details' | 'timer' | 'verify' | 'locked'>('details');
  const [countDown, setCountDown] = useState(0);
  const [tabFocused, setTabFocused] = useState(true);
  const timerRef = useRef<any>(null);
  
  // Verification State
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [attemptsLeft, setAttemptsLeft] = useState(2);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [screenshot, setScreenshot] = useState<File | null>(null);
  const [verifyMode, setVerifyMode] = useState<'quiz' | 'image'>('quiz');

  useEffect(() => {
     fetchTasks();
     
     const handleVisibilityChange = () => {
         setTabFocused(!document.hidden);
     };
     document.addEventListener('visibilitychange', handleVisibilityChange);
     
     return () => {
         document.removeEventListener('visibilitychange', handleVisibilityChange);
         if (timerRef.current) clearInterval(timerRef.current);
     };
  }, []);

  // Timer Logic
  useEffect(() => {
      if (taskStep === 'timer' && countDown > 0) {
          if (tabFocused) {
              timerRef.current = setInterval(() => {
                  setCountDown(prev => {
                      if (prev <= 1) {
                          setTaskStep('verify');
                          if (timerRef.current) clearInterval(timerRef.current);
                          return 0;
                      }
                      return prev - 1;
                  });
              }, 1000);
          } else {
              if (timerRef.current) clearInterval(timerRef.current);
          }
      }
      return () => { if(timerRef.current) clearInterval(timerRef.current); };
  }, [taskStep, countDown, tabFocused]);

  const fetchTasks = async () => {
     setLoading(true);
     const { data: { session } } = await supabase.auth.getSession();
     if(!session) return;

     // 1. Get All Tasks (Active in system)
     const { data: allTasks } = await supabase
        .from('marketplace_tasks')
        .select('*')
        .eq('status', 'active')
        .order('worker_reward', {ascending: false});
     
     if (!allTasks) { setLoading(false); return; }

     // 2. Get User Submissions
     const { data: mySubs } = await supabase
        .from('marketplace_submissions')
        .select('task_id, status')
        .eq('worker_id', session.user.id);
     
     // 3. Get User Attempts (Locked)
     const { data: attempts } = await supabase
        .from('task_attempts')
        .select('task_id, is_locked')
        .eq('user_id', session.user.id);
     
     const statusMap: Record<string, TaskStatus> = {};
     
     // Map Submissions
     mySubs?.forEach((s: any) => {
         if (s.status === 'approved' || s.status === 'pending') {
             statusMap[s.task_id] = 'approved'; // Treat pending as completed for UI simplicity or differentiate
         }
     });

     // Map Locks
     attempts?.forEach((a: any) => { 
         if (a.is_locked) statusMap[a.task_id] = 'locked'; 
     });

     // Default remaining to active
     allTasks.forEach((t: any) => {
         if(!statusMap[t.id]) statusMap[t.id] = 'active';
     });

     setTaskStatuses(statusMap);
     setTasks(allTasks);
     setLoading(false);
  };

  const handleOpenTask = async (task: any) => {
      const status = taskStatuses[task.id];
      
      if (status === 'locked') {
          toast.error("This task is locked due to failed attempts.");
          return;
      }
      if (status === 'approved') {
          toast.info("You have already completed this task.");
          return;
      }

      setSelectedTask(task);
      setTaskStep('details');
      setCountDown(task.timer_seconds || 15);
      setScreenshot(null);
      setVerifyMode('quiz'); 
      
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
          const { data } = await supabase.from('task_attempts').select('attempts_count').eq('task_id', task.id).eq('user_id', session.user.id).maybeSingle();
          if (data) {
              setAttemptsLeft(2 - data.attempts_count);
          } else {
              setAttemptsLeft(2);
          }
      }
  };

  // Open Sponsor Details
  const handleOpenSponsor = (e: React.MouseEvent, task: any) => {
      e.stopPropagation(); // Prevent opening task modal
      setSelectedSponsor({
          name: task.company_name || 'Verified Partner',
          id: task.creator_id,
          joined: '2024',
          trustScore: 98,
          totalPayouts: task.total_quantity * task.worker_reward
      });
  };

  const handleStartTask = () => {
      if (!selectedTask) return;
      window.open(selectedTask.target_url, '_blank');
      setTaskStep('timer');
  };

  const handleSubmit = async () => {
      if (!selectedTask) return;
      setIsSubmitting(true);

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      let isSuccess = false;
      let isManualReview = false;
      let failReason = "Incorrect Answer";

      if (verifyMode === 'quiz' && selectedOption !== null) {
          const quiz = selectedTask.quiz_config;
          if (quiz && selectedOption === quiz.correct_index) {
              isSuccess = true;
          }
      } else if (verifyMode === 'image' && screenshot) {
          isManualReview = true;
          isSuccess = true; 
      }

      if (isSuccess) {
          try {
              await supabase.from('marketplace_submissions').insert({
                  task_id: selectedTask.id,
                  worker_id: session.user.id,
                  status: isManualReview ? 'pending' : 'approved',
                  submission_data: { 
                      type: verifyMode, 
                      answer: verifyMode === 'quiz' ? selectedOption : 'screenshot' 
                  }
              });

              if (!isManualReview) {
                  await supabase.rpc('decrement_task_quantity', { task_id: selectedTask.id });
                  await updateWallet(session.user.id, selectedTask.worker_reward, 'increment', 'earning_balance');
                  await createTransaction(session.user.id, 'earn', selectedTask.worker_reward, `Task: ${selectedTask.title}`);
                  toast.success("Verified! Reward Credited.");
              } else {
                  toast.success("Submitted for Review.");
              }
              
              window.dispatchEvent(new Event('wallet_updated'));
              closeModal();
              fetchTasks();

          } catch (e: any) {
              toast.error("Error: " + e.message);
          }
      } else {
          const newAttempts = attemptsLeft - 1;
          setAttemptsLeft(newAttempts);
          
          if (newAttempts <= 0) {
              setTaskStep('locked');
              await supabase.from('task_attempts').upsert({
                  task_id: selectedTask.id,
                  user_id: session.user.id,
                  attempts_count: 2,
                  is_locked: true,
                  last_attempt_at: new Date().toISOString()
              }, { onConflict: 'task_id,user_id' });
              
              toast.error(`Failed: ${failReason}. Task Locked.`);
              fetchTasks(); 
          } else {
              toast.error(`Failed: ${failReason}. ${newAttempts} attempt left.`);
              await supabase.from('task_attempts').upsert({
                  task_id: selectedTask.id,
                  user_id: session.user.id,
                  attempts_count: 1,
                  is_locked: false,
                  last_attempt_at: new Date().toISOString()
              }, { onConflict: 'task_id,user_id' });
          }
      }
      setIsSubmitting(false);
  };

  const closeModal = () => {
      setSelectedTask(null);
      setTaskStep('details');
      setSelectedOption(null);
      setScreenshot(null);
  };

  const getTaskIcon = (category: string) => {
      switch(category) {
          case 'social': return <Share2 size={20} className="text-blue-400"/>;
          case 'video': return <PlayCircle size={20} className="text-red-400"/>;
          case 'app': return <Smartphone size={20} className="text-purple-400"/>;
          default: return <Globe size={20} className="text-green-400"/>;
      }
  };

  const filteredTasks = tasks.filter(t => filter === 'all' || t.category === filter);

  // Sorting: Active first, then Locked, then Completed
  const sortedTasks = filteredTasks.sort((a, b) => {
      const statusA = taskStatuses[a.id];
      const statusB = taskStatuses[b.id];
      if (statusA === statusB) return 0;
      if (statusA === 'active') return -1;
      if (statusB === 'active') return 1;
      if (statusA === 'locked') return -1;
      return 1;
  });

  if (loading) return <div className="pb-24 sm:pl-20 sm:pt-6 space-y-6"><Skeleton className="w-48 h-8 mb-4 mx-4" /></div>;

  return (
    <div className="pb-24 sm:pl-20 sm:pt-6 space-y-6">
      
      {/* HEADER */}
      <div className="flex flex-col gap-4 px-4 sm:px-0">
          <div className="flex justify-between items-end">
             <div>
                <h1 className="text-2xl font-display font-bold text-white mb-1">Micro Jobs</h1>
                <p className="text-gray-400 text-sm">Complete tasks & earn rewards.</p>
             </div>
             <button onClick={fetchTasks} className="p-2 bg-[#1a1a1a] rounded-lg text-gray-400 hover:text-white"><RefreshCw size={18}/></button>
          </div>

          <div className="flex overflow-x-auto no-scrollbar gap-2 pb-2">
              {['all', 'social', 'video', 'seo', 'app'].map(f => (
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
              <div className="text-center py-16 bg-[#111] rounded-2xl border border-[#222] text-gray-500">
                  <Globe size={40} className="mb-4 opacity-50 mx-auto" />
                  <p>No active tasks available.</p>
              </div>
          ) : (
              sortedTasks.map((task) => {
                const status = taskStatuses[task.id];
                const isHot = task.worker_reward > 5 || task.is_featured;
                
                // Style Logic
                let cardStyle = "border-[#222] bg-[#0f0f0f]";
                let opacity = "opacity-100";
                
                if (status === 'active') {
                    cardStyle = "border-[#222] bg-[#111] hover:bg-[#1a1a1a] hover:border-white/10";
                } else if (status === 'locked') {
                    cardStyle = "border-red-900/30 bg-red-950/10";
                    opacity = "opacity-70";
                } else if (status === 'approved') {
                    cardStyle = "border-green-900/30 bg-green-950/10";
                    opacity = "opacity-60";
                }

                return (
                    <motion.div 
                        key={task.id} 
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={`cursor-pointer relative ${opacity}`}
                        onClick={() => handleOpenTask(task)}
                    >
                        <GlassCard className={`flex items-center justify-between p-4 group transition border relative overflow-hidden ${cardStyle}`}>
                            
                            {/* BADGES */}
                            <div className="absolute top-0 right-0 flex">
                                {status === 'locked' && (
                                    <div className="bg-red-500 text-white text-[8px] font-black px-2 py-0.5 rounded-bl-lg flex items-center gap-1">
                                        <Lock size={8} /> LOCKED
                                    </div>
                                )}
                                {status === 'approved' && (
                                    <div className="bg-green-600 text-white text-[8px] font-black px-2 py-0.5 rounded-bl-lg flex items-center gap-1">
                                        <CheckCircle2 size={8} /> DONE
                                    </div>
                                )}
                                {status === 'active' && isHot && (
                                    <div className="bg-gradient-to-l from-red-600 to-orange-500 text-white text-[8px] font-black px-2 py-0.5 rounded-bl-lg flex items-center gap-1 shadow-lg">
                                        <Flame size={8} fill="currentColor"/> HOT
                                    </div>
                                )}
                            </div>

                            <div className="flex items-center gap-4">
                                {/* Icon Box */}
                                <div className={`w-12 h-12 rounded-xl flex items-center justify-center border shrink-0 relative ${status === 'locked' ? 'bg-red-900/20 border-red-500/20' : 'bg-black/30 border-[#333]'}`}>
                                    {status === 'locked' ? <Lock size={20} className="text-red-500"/> : getTaskIcon(task.category)}
                                </div>
                                
                                <div className="min-w-0">
                                    <div className="flex items-center gap-1.5">
                                        <h3 className={`font-bold text-sm truncate pr-4 ${status === 'approved' ? 'text-gray-500 line-through' : 'text-white'}`}>{task.title}</h3>
                                        
                                        {/* INTERACTIVE SPONSOR BADGE */}
                                        {task.company_name && (
                                            <div 
                                                onClick={(e) => handleOpenSponsor(e, task)}
                                                className="bg-blue-500/10 hover:bg-blue-500/30 text-blue-400 p-0.5 rounded-full cursor-pointer transition"
                                                title="Verified Sponsor"
                                            >
                                                <BadgeCheck size={14} fill="currentColor" className="text-blue-500" />
                                            </div>
                                        )}
                                    </div>
                                    
                                    <div className="flex items-center gap-2 text-xs text-gray-500 mt-1">
                                        {task.company_name && <span className="text-gray-400 font-medium">{task.company_name}</span>}
                                        <span>•</span>
                                        <span className="flex items-center gap-1"><Clock size={10}/> {task.timer_seconds}s</span>
                                    </div>
                                </div>
                            </div>

                            {/* Reward Display */}
                            {status === 'active' && (
                                <div className="flex flex-col items-end gap-2 shrink-0 pt-2">
                                    <div className="bg-green-900/20 border border-green-500/30 px-3 py-1 rounded-lg">
                                        <p className="text-green-400 font-black text-xs"><BalanceDisplay amount={task.worker_reward} decimals={3} /></p>
                                    </div>
                                </div>
                            )}
                        </GlassCard>
                    </motion.div>
                );
             })
          )}
      </div>

      {/* TASK DETAILS MODAL */}
      <AnimatePresence>
          {selectedTask && (
             <motion.div 
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="fixed inset-0 z-50 bg-black/90 flex items-end sm:items-center justify-center p-4" 
                onClick={closeModal}
             >
                 <motion.div 
                    initial={{ y: 50 }} animate={{ y: 0 }} exit={{ y: 50 }}
                    className="bg-[#111] w-full max-w-lg rounded-t-3xl sm:rounded-3xl border border-[#333] p-6 pb-10 sm:pb-6 relative overflow-hidden shadow-2xl max-h-[90vh] flex flex-col" 
                    onClick={(e) => e.stopPropagation()}
                 >
                     <button onClick={closeModal} className="absolute top-4 right-4 text-gray-400 hover:text-white z-10"><X size={20} /></button>

                     {/* STEP 1: DETAILS */}
                     {taskStep === 'details' && (
                         <div className="flex flex-col h-full">
                            <div className="flex flex-col items-center text-center mb-6">
                                <div className="w-20 h-20 bg-[#222] rounded-3xl flex items-center justify-center text-4xl border border-[#333] shadow-lg mb-4 text-white">
                                    {getTaskIcon(selectedTask.category)}
                                </div>
                                <h2 className="text-xl font-display font-bold text-white leading-tight mb-2 flex items-center gap-2">
                                    {selectedTask.title}
                                    {selectedTask.company_name && <BadgeCheck size={20} className="text-blue-400" fill="black"/>}
                                </h2>
                                <p className="text-gray-500 text-xs mb-3">{selectedTask.company_name ? `Verified Offer from ${selectedTask.company_name}` : 'Marketplace Task'}</p>
                                
                                <div className="flex flex-wrap justify-center gap-2">
                                    <div className="bg-green-500/10 text-green-400 border border-green-500/20 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1">
                                        Reward: <BalanceDisplay amount={selectedTask.worker_reward} decimals={3} />
                                    </div>
                                    <div className="bg-blue-500/10 text-blue-400 border border-blue-500/20 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1">
                                        Sponsor Rate: <BalanceDisplay amount={selectedTask.price_per_action} decimals={2} />
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-4 flex-1 overflow-y-auto custom-scrollbar pr-2">
                                <div className="bg-white/5 p-4 rounded-xl border border-white/5">
                                    <h4 className="text-gray-500 text-[10px] font-bold uppercase tracking-wider mb-2">Instructions</h4>
                                    <p className="text-gray-300 text-sm leading-relaxed">
                                        {selectedTask.description || "Complete the actions below to verify this task and claim your reward instantly."}
                                    </p>
                                </div>

                                <div className="bg-white/5 p-4 rounded-xl border border-white/5">
                                    <h4 className="text-gray-500 text-[10px] font-bold uppercase tracking-wider mb-3">Steps</h4>
                                    <ul className="space-y-3">
                                        <li className="flex items-start gap-3 text-sm text-gray-300">
                                            <div className="mt-0.5 min-w-[16px]"><CheckCircle2 size={16} className="text-blue-500" /></div>
                                            <span>Visit the target link provided.</span>
                                        </li>
                                        <li className="flex items-start gap-3 text-sm text-gray-300">
                                            <div className="mt-0.5 min-w-[16px]"><Clock size={16} className="text-orange-500" /></div>
                                            <span>Stay on the page for <strong className="text-white">{selectedTask.timer_seconds} seconds</strong>.</span>
                                        </li>
                                        <li className="flex items-start gap-3 text-sm text-gray-300">
                                            <div className="mt-0.5 min-w-[16px]"><ShieldCheck size={16} className="text-purple-500" /></div>
                                            <span>Complete the verification quiz.</span>
                                        </li>
                                    </ul>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3 mt-6 pt-4 border-t border-white/10">
                                <button 
                                    onClick={closeModal} 
                                    className="py-3.5 bg-[#222] text-gray-400 font-bold rounded-xl hover:bg-[#333] hover:text-white transition"
                                >
                                    Dismiss
                                </button>
                                <button 
                                    onClick={handleStartTask} 
                                    className="py-3.5 bg-white text-black font-black rounded-xl hover:bg-gray-200 flex items-center justify-center gap-2 uppercase tracking-wide shadow-lg"
                                >
                                    Accept Task <ArrowRight size={18}/>
                                </button>
                            </div>
                         </div>
                     )}

                     {/* STEP 2: TIMER */}
                     {taskStep === 'timer' && (
                         <div className="text-center py-10">
                             <div className="mb-4 relative w-24 h-24 mx-auto flex items-center justify-center">
                                 <svg className="w-full h-full transform -rotate-90">
                                     <circle cx="48" cy="48" r="40" stroke="#333" strokeWidth="8" fill="none" />
                                     <circle 
                                        cx="48" cy="48" r="40" stroke="#10b981" strokeWidth="8" fill="none" 
                                        strokeDasharray="251.2"
                                        strokeDashoffset={(251.2 * (selectedTask.timer_seconds! - countDown)) / selectedTask.timer_seconds!}
                                        className="transition-all duration-1000 ease-linear"
                                     />
                                 </svg>
                                 <span className="absolute text-2xl font-bold text-white">{countDown}s</span>
                             </div>
                             <h3 className="text-xl font-bold text-white mb-2">Analyzing Content...</h3>
                             <p className="text-gray-400 text-sm">Please keep the task tab open and active.</p>
                         </div>
                     )}

                     {/* STEP 3: VERIFY (QUIZ) */}
                     {taskStep === 'verify' && (
                         <div className="space-y-4">
                             <div className="flex justify-between items-center mb-2">
                                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                                    <ShieldCheck className="text-purple-400"/> Verification
                                </h3>
                                <span className={`text-xs font-bold px-2 py-1 rounded ${attemptsLeft > 1 ? 'bg-green-900/20 text-green-400' : 'bg-red-900/20 text-red-400'}`}>
                                    {attemptsLeft} Attempts Left
                                </span>
                             </div>

                             {verifyMode === 'quiz' ? (
                                 <>
                                     <p className="text-white text-sm font-medium bg-black/40 p-4 rounded-xl border border-[#333]">
                                         {selectedTask.quiz_config?.question || "No quiz configured. Upload proof instead."}
                                     </p>
                                     <div className="grid gap-2">
                                         {selectedTask.quiz_config?.options.map((opt: string, idx: number) => (
                                             <button
                                                key={idx}
                                                onClick={() => setSelectedOption(idx)}
                                                className={`p-3 rounded-xl text-sm text-left transition border ${selectedOption === idx ? 'bg-purple-600 border-purple-500 text-white' : 'bg-[#1a1a1a] border-[#333] text-gray-300 hover:bg-[#222]'}`}
                                             >
                                                 {opt}
                                             </button>
                                         ))}
                                     </div>
                                 </>
                             ) : null}

                             <button 
                                onClick={handleSubmit}
                                disabled={(verifyMode === 'quiz' && selectedOption === null) || isSubmitting}
                                className="w-full py-3 bg-green-600 text-white font-bold rounded-xl hover:bg-green-500 disabled:opacity-50 mt-4 flex items-center justify-center gap-2"
                            >
                                 {isSubmitting ? <Loader2 className="animate-spin"/> : 'Submit Verification'}
                            </button>
                         </div>
                     )}

                     {/* STEP 4: LOCKED */}
                     {taskStep === 'locked' && (
                         <div className="text-center py-10">
                             <div className="w-20 h-20 bg-red-900/20 rounded-full flex items-center justify-center mx-auto mb-4 border border-red-500/30">
                                 <Lock size={40} className="text-red-500"/>
                             </div>
                             <h3 className="text-xl font-bold text-white mb-2">Task Locked</h3>
                             <p className="text-gray-400 text-sm mb-6">
                                 You failed verification twice.
                             </p>
                             <button onClick={closeModal} className="px-6 py-3 bg-white/10 text-white rounded-xl font-bold hover:bg-white/20">
                                 Close
                             </button>
                         </div>
                     )}

                 </motion.div>
             </motion.div>
          )}
      </AnimatePresence>

      {/* SPONSOR DETAILS MODAL */}
      <AnimatePresence>
          {selectedSponsor && (
              <motion.div 
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-6"
                  onClick={() => setSelectedSponsor(null)}
              >
                  <motion.div 
                      initial={{ scale: 0.8, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.8, y: 20 }}
                      className="bg-[#111] border border-blue-500/30 w-full max-w-sm rounded-2xl p-6 relative shadow-2xl overflow-hidden"
                      onClick={e => e.stopPropagation()}
                  >
                      {/* Glow FX */}
                      <div className="absolute -top-10 -right-10 w-32 h-32 bg-blue-500/20 rounded-full blur-3xl"></div>
                      
                      <div className="flex flex-col items-center text-center">
                          <div className="w-20 h-20 bg-blue-500/10 rounded-full flex items-center justify-center mb-4 border border-blue-500/30 shadow-[0_0_20px_rgba(59,130,246,0.2)]">
                              <Building2 size={36} className="text-blue-400" />
                          </div>
                          
                          <h2 className="text-xl font-bold text-white flex items-center gap-2">
                              {selectedSponsor.name}
                              <BadgeCheck size={20} className="text-blue-500" fill="white" />
                          </h2>
                          <div className="mt-1 bg-blue-500/10 text-blue-300 text-[10px] font-bold px-3 py-1 rounded-full border border-blue-500/20 uppercase tracking-wider">
                              Verified Partner
                          </div>

                          <div className="grid grid-cols-2 gap-3 w-full mt-6">
                              <div className="bg-white/5 p-3 rounded-xl border border-white/5">
                                  <p className="text-gray-500 text-[10px] uppercase font-bold mb-1">Trust Score</p>
                                  <div className="flex items-center justify-center gap-1 text-green-400 font-black text-lg">
                                      <Star size={16} fill="currentColor"/> {selectedSponsor.trustScore}%
                                  </div>
                              </div>
                              <div className="bg-white/5 p-3 rounded-xl border border-white/5">
                                  <p className="text-gray-500 text-[10px] uppercase font-bold mb-1">Total Payouts</p>
                                  <p className="text-white font-mono font-bold text-lg">
                                      <BalanceDisplay amount={selectedSponsor.totalPayouts} compact />
                                  </p>
                              </div>
                          </div>

                          <div className="mt-6 w-full">
                              <button onClick={() => setSelectedSponsor(null)} className="w-full py-3 bg-white text-black font-bold rounded-xl hover:bg-gray-200 transition">
                                  Close
                              </button>
                          </div>
                      </div>
                  </motion.div>
              </motion.div>
          )}
      </AnimatePresence>
    </div>
  );
};

export default Tasks;
