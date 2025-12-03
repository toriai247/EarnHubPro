
import React, { useState, useEffect, useRef } from 'react';
import GlassCard from '../components/GlassCard';
import { 
  CheckCircle2, ExternalLink, RefreshCw, Smartphone, PlayCircle, Share2, 
  Globe, Search, Loader2, Star, PenTool, Lock, X, Clock, AlertTriangle, ShieldCheck, HelpCircle, Bot, UploadCloud
} from 'lucide-react';
import { supabase } from '../integrations/supabase/client';
import { MarketTask, QuizConfig } from '../types';
import { updateWallet, createTransaction } from '../lib/actions';
import Skeleton from '../components/Skeleton';
import { useUI } from '../context/UIContext';
import BalanceDisplay from '../components/BalanceDisplay';
import { motion, AnimatePresence } from 'framer-motion';
import { verifyTaskSubmission } from '../lib/aiHelper';

const Tasks: React.FC = () => {
  const { toast } = useUI();
  const [loading, setLoading] = useState(true);
  const [tasks, setTasks] = useState<MarketTask[]>([]);
  const [selectedTask, setSelectedTask] = useState<MarketTask | null>(null);
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
                          setTaskStep('verify'); // Move to Verification
                          if (timerRef.current) clearInterval(timerRef.current);
                          return 0;
                      }
                      return prev - 1;
                  });
              }, 1000);
          } else {
              if (timerRef.current) clearInterval(timerRef.current);
          }
      } else {
          if (timerRef.current) clearInterval(timerRef.current);
      }
      return () => { if(timerRef.current) clearInterval(timerRef.current); };
  }, [taskStep, countDown, tabFocused]);

  const fetchTasks = async () => {
     setLoading(true);
     const { data: { session } } = await supabase.auth.getSession();
     if(!session) return;

     // 1. Get Active Tasks
     const { data: allTasks } = await supabase
        .from('marketplace_tasks')
        .select('*')
        .eq('status', 'active')
        .gt('remaining_quantity', 0)
        .order('worker_reward', {ascending: false});
     
     if (!allTasks) { setLoading(false); return; }

     // 2. Get User Submissions (Completed)
     const { data: mySubs } = await supabase
        .from('marketplace_submissions')
        .select('task_id')
        .eq('worker_id', session.user.id);
     
     const completedIds = new Set(mySubs?.map(s => s.task_id) || []);

     // 3. Get User Attempts (Locked)
     const { data: attempts } = await supabase
        .from('task_attempts')
        .select('task_id, is_locked')
        .eq('user_id', session.user.id);
     
     const lockedIds = new Set(attempts?.filter(a => a.is_locked).map(a => a.task_id) || []);

     // Filter
     const available = allTasks.filter((t: MarketTask) => 
         !completedIds.has(t.id) && !lockedIds.has(t.id)
     );
     
     setTasks(available as MarketTask[]);
     setLoading(false);
  };

  const handleOpenTask = async (task: MarketTask) => {
      setSelectedTask(task);
      setTaskStep('details');
      setCountDown(task.timer_seconds || 15);
      setScreenshot(null);
      setVerifyMode('quiz'); // Default to quiz
      
      // Check attempts remaining
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
      let failReason = "Incorrect Answer";

      // LOGIC FOR QUIZ
      if (verifyMode === 'quiz' && selectedOption !== null) {
          const quiz = selectedTask.quiz_config;
          if (quiz && selectedOption === quiz.correct_index) {
              isSuccess = true;
          }
      } 
      // LOGIC FOR IMAGE MATCH
      else if (verifyMode === 'image' && screenshot && selectedTask.ai_reference_data) {
          try {
              // 1. Upload
              const fileExt = screenshot.name.split('.').pop();
              const fileName = `subs/${session.user.id}_${selectedTask.id}_${Date.now()}.${fileExt}`;
              const { error: uploadError } = await supabase.storage.from('task-proofs').upload(fileName, screenshot);
              if (uploadError) throw uploadError;
              
              const { data: urlData } = supabase.storage.from('task-proofs').getPublicUrl(fileName);
              
              // 2. Verify with AI
              const result = await verifyTaskSubmission(urlData.publicUrl, selectedTask.ai_reference_data);
              
              if (result.match) {
                  isSuccess = true;
              } else {
                  failReason = result.reason || "AI Comparison Mismatch";
              }
          } catch (e: any) {
              failReason = "Upload/Verify Error";
          }
      }

      if (isSuccess) {
          // Success Path
          try {
              await supabase.from('marketplace_submissions').insert({
                  task_id: selectedTask.id,
                  worker_id: session.user.id,
                  status: 'approved',
                  submission_data: { 
                      type: verifyMode, 
                      answer: verifyMode === 'quiz' ? selectedOption : 'screenshot_match' 
                  }
              });

              // Decrement Qty
              await supabase.rpc('decrement_task_quantity', { task_id: selectedTask.id });

              // Pay User
              await updateWallet(session.user.id, selectedTask.worker_reward, 'increment', 'earning_balance');
              await createTransaction(session.user.id, 'earn', selectedTask.worker_reward, `Task: ${selectedTask.title}`);
              
              toast.success("Verified! Reward Credited.");
              window.dispatchEvent(new Event('wallet_updated'));
              closeModal();
              fetchTasks();

          } catch (e: any) {
              toast.error("Error: " + e.message);
          }
      } else {
          // Failure Path
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
          case 'seo': return <Search size={20} className="text-orange-400"/>;
          default: return <Globe size={20} className="text-green-400"/>;
      }
  };

  const filteredTasks = tasks.filter(t => filter === 'all' || t.category === filter);

  if (loading) return <div className="pb-24 sm:pl-20 sm:pt-6 space-y-6"><Skeleton className="w-48 h-8 mb-4 mx-4" /></div>;

  return (
    <div className="pb-24 sm:pl-20 sm:pt-6 space-y-6">
      
      {/* HEADER */}
      <div className="flex flex-col gap-4 px-4 sm:px-0">
          <div className="flex justify-between items-end">
             <div>
                <h1 className="text-2xl font-display font-bold text-white mb-1">Micro Jobs</h1>
                <p className="text-gray-400 text-sm">Complete tasks & verify via AI Match or Quiz.</p>
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
          {filteredTasks.length === 0 ? (
              <div className="text-center py-16 bg-[#111] rounded-2xl border border-[#222] text-gray-500">
                  <Globe size={40} className="mb-4 opacity-50 mx-auto" />
                  <p>No tasks available.</p>
              </div>
          ) : (
              filteredTasks.map((task) => (
                <motion.div 
                    key={task.id} 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="cursor-pointer" 
                    onClick={() => handleOpenTask(task)}
                >
                     <GlassCard className="flex items-center justify-between p-4 group hover:bg-[#1a1a1a] transition border border-[#222]">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-xl bg-black/30 flex items-center justify-center border border-[#333] shrink-0">
                                {getTaskIcon(task.category)}
                            </div>
                            <div className="min-w-0">
                                <h3 className="font-bold text-white text-sm truncate pr-4">{task.title}</h3>
                                <div className="flex items-center gap-2 text-xs text-gray-500 mt-1">
                                    <span className="capitalize">{task.category}</span>
                                    <span>•</span>
                                    <span className="flex items-center gap-1 text-purple-400"><Bot size={10}/> AI Verified</span>
                                </div>
                            </div>
                        </div>
                        <div className="text-right pl-2 shrink-0">
                           <div className="bg-green-900/20 border border-green-500/30 px-3 py-1.5 rounded-lg">
                                <p className="text-green-400 font-black text-sm"><BalanceDisplay amount={task.worker_reward} decimals={3} /></p>
                           </div>
                        </div>
                     </GlassCard>
                </motion.div>
             ))
          )}
      </div>

      {/* TASK EXECUTION MODAL */}
      <AnimatePresence>
          {selectedTask && (
             <motion.div 
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="fixed inset-0 z-50 bg-black/90 flex items-end sm:items-center justify-center p-4" 
                onClick={closeModal}
             >
                 <motion.div 
                    initial={{ y: 50 }} animate={{ y: 0 }} exit={{ y: 50 }}
                    className="bg-[#111] w-full max-w-lg rounded-t-3xl sm:rounded-3xl border border-[#333] p-6 pb-10 sm:pb-6 relative overflow-hidden shadow-2xl" 
                    onClick={(e) => e.stopPropagation()}
                 >
                     <button onClick={closeModal} className="absolute top-4 right-4 text-gray-400 hover:text-white"><X size={20} /></button>

                     {/* STEP 1: DETAILS */}
                     {taskStep === 'details' && (
                         <>
                            <div className="flex items-center gap-4 mb-6">
                                <div className="w-16 h-16 bg-[#222] rounded-2xl flex items-center justify-center text-3xl border border-[#333] shrink-0">
                                    {getTaskIcon(selectedTask.category)}
                                </div>
                                <div>
                                    <h2 className="text-xl font-bold text-white leading-tight">{selectedTask.title}</h2>
                                    <p className="text-gray-400 text-xs mt-1">Reward: <span className="text-green-400 font-bold">${selectedTask.worker_reward}</span></p>
                                </div>
                            </div>
                            
                            <div className="bg-blue-900/10 border border-blue-500/20 p-4 rounded-xl mb-6">
                                <h4 className="text-blue-400 font-bold text-xs uppercase mb-2 flex items-center gap-2">
                                    <Bot size={14}/> Auto-Verification Process
                                </h4>
                                <ul className="text-xs text-gray-300 space-y-1">
                                    <li>1. Click "Start Task" to open the link.</li>
                                    <li>2. Stay on the page for <span className="text-white font-bold">{selectedTask.timer_seconds} seconds</span>.</li>
                                    <li>3. Verify by <strong>Answering a Quiz</strong> or <strong>Uploading a Screenshot</strong>.</li>
                                    <li>4. <span className="text-red-400 font-bold">Wrong verify = Locked.</span></li>
                                </ul>
                            </div>

                            <button onClick={handleStartTask} className="w-full py-4 bg-white text-black font-black rounded-xl hover:bg-gray-200 flex items-center justify-center gap-2 uppercase tracking-wide">
                                Start Task <ExternalLink size={18}/>
                            </button>
                         </>
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
                             
                             {!tabFocused && (
                                 <div className="mt-4 bg-red-900/20 text-red-400 px-3 py-2 rounded-lg inline-flex items-center gap-2 text-xs font-bold border border-red-500/30 animate-pulse">
                                     <AlertTriangle size={14}/> Timer Paused! Go back to task tab.
                                 </div>
                             )}
                         </div>
                     )}

                     {/* STEP 3: VERIFY (QUIZ OR IMAGE) */}
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

                             {/* Toggle Method */}
                             <div className="flex bg-black/40 p-1 rounded-lg border border-[#333]">
                                 <button onClick={() => setVerifyMode('quiz')} className={`flex-1 py-2 text-xs font-bold rounded transition ${verifyMode === 'quiz' ? 'bg-[#333] text-white' : 'text-gray-500'}`}>Answer Quiz</button>
                                 <button onClick={() => setVerifyMode('image')} className={`flex-1 py-2 text-xs font-bold rounded transition ${verifyMode === 'image' ? 'bg-[#333] text-white' : 'text-gray-500'}`}>Upload Screenshot</button>
                             </div>
                             
                             {verifyMode === 'quiz' ? (
                                 <>
                                     <p className="text-white text-sm font-medium bg-black/40 p-4 rounded-xl border border-[#333]">
                                         {selectedTask.quiz_config?.question || "Error loading question."}
                                     </p>
                                     <div className="grid gap-2">
                                         {selectedTask.quiz_config?.options.map((opt, idx) => (
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
                             ) : (
                                 <div className="text-center">
                                     <label className="block w-full border-2 border-dashed border-[#333] hover:border-purple-500/50 rounded-xl p-8 cursor-pointer bg-black/20 transition relative">
                                         <input type="file" accept="image/*" className="hidden" onChange={e => e.target.files && setScreenshot(e.target.files[0])} />
                                         {screenshot ? (
                                             <div className="flex flex-col items-center text-green-400">
                                                 <CheckCircle2 size={32} className="mb-2"/>
                                                 <span className="text-xs font-bold">{screenshot.name}</span>
                                             </div>
                                         ) : (
                                             <div className="flex flex-col items-center text-gray-500">
                                                 <UploadCloud size={32} className="mb-2"/>
                                                 <span className="text-xs">Tap to upload Proof</span>
                                             </div>
                                         )}
                                     </label>
                                     <p className="text-xs text-gray-500 mt-2">AI will compare your screenshot with the creator's visual DNA.</p>
                                 </div>
                             )}

                             <button 
                                onClick={handleSubmit}
                                disabled={(verifyMode === 'quiz' && selectedOption === null) || (verifyMode === 'image' && !screenshot) || isSubmitting}
                                className="w-full py-3 bg-green-600 text-white font-bold rounded-xl hover:bg-green-500 disabled:opacity-50 mt-4 flex items-center justify-center gap-2"
                            >
                                 {isSubmitting ? <Loader2 className="animate-spin"/> : 'Verify & Claim Reward'}
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
                                 You failed verification twice. To prevent spam, this task is no longer available to you.
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
    </div>
  );
};

export default Tasks;
