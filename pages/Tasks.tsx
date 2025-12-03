
import React, { useState, useEffect, useRef } from 'react';
import GlassCard from '../components/GlassCard';
import { 
  CheckCircle2, ExternalLink, RefreshCw, Smartphone, PlayCircle, Share2, 
  Globe, Search, Loader2, Star, PenTool, Lock, X, Clock, FileText, Image as ImageIcon,
  AlertTriangle, ShieldCheck
} from 'lucide-react';
import { supabase } from '../integrations/supabase/client';
import { MarketTask, TaskRequirement } from '../types';
import { updateWallet, createTransaction } from '../lib/actions';
import Skeleton from '../components/Skeleton';
import { useUI } from '../context/UIContext';
import BalanceDisplay from '../components/BalanceDisplay';

const Tasks: React.FC = () => {
  const { toast } = useUI();
  const [loading, setLoading] = useState(true);
  const [tasks, setTasks] = useState<MarketTask[]>([]);
  const [selectedTask, setSelectedTask] = useState<MarketTask | null>(null);
  const [filter, setFilter] = useState('all');
  
  // Submission State
  const [submissionData, setSubmissionData] = useState<Record<string, string>>({});
  const [uploadingFiles, setUploadingFiles] = useState<Record<string, boolean>>({});
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'submitting' | 'success' | 'rejected'>('idle');
  const [linkOpened, setLinkOpened] = useState(false);
  
  // Security Timer & Activity Tracking
  const [countDown, setCountDown] = useState(0);
  const [timerActive, setTimerActive] = useState(false);
  const [tabFocused, setTabFocused] = useState(true);
  const timerRef = useRef<any>(null);
  
  useEffect(() => {
     fetchTasks();
     
     // Anti-Cheat: Detect Tab Switch
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
      if (timerActive && countDown > 0) {
          if (tabFocused) {
              timerRef.current = setInterval(() => {
                  setCountDown(prev => {
                      if (prev <= 1) {
                          setTimerActive(false);
                          if (timerRef.current) clearInterval(timerRef.current);
                          return 0;
                      }
                      return prev - 1;
                  });
              }, 1000);
          } else {
              // Pause Timer if tab unfocused
              if (timerRef.current) clearInterval(timerRef.current);
          }
      } else {
          if (timerRef.current) clearInterval(timerRef.current);
      }
      return () => { if(timerRef.current) clearInterval(timerRef.current); };
  }, [timerActive, countDown, tabFocused]);

  const fetchTasks = async () => {
     setLoading(true);
     const { data: { session } } = await supabase.auth.getSession();
     if(!session) return;

     const { data: allTasks } = await supabase
        .from('marketplace_tasks')
        .select('*')
        .eq('status', 'active')
        .gt('remaining_quantity', 0)
        .order('worker_reward', {ascending: false});
     
     const { data: mySubs } = await supabase
        .from('marketplace_submissions')
        .select('task_id')
        .eq('worker_id', session.user.id);
     
     const completedIds = new Set(mySubs?.map(s => s.task_id) || []);

     if (allTasks) {
         const available = allTasks.filter((t: MarketTask) => !completedIds.has(t.id));
         setTasks(available as MarketTask[]);
     }
     setLoading(false);
  };

  const handleOpenLink = () => {
      if (!selectedTask) return;
      
      const duration = selectedTask.timer_seconds || 15;
      setCountDown(duration);
      setLinkOpened(true);
      setTimerActive(true);
      setSubmissionData({}); 
      
      window.open(selectedTask.target_url, '_blank');
  };

  const handleFileUpload = async (reqId: string, file: File) => {
      if (!selectedTask) return;
      setUploadingFiles(prev => ({ ...prev, [reqId]: true }));
      
      try {
          const { data: { session } } = await supabase.auth.getSession();
          if (!session) throw new Error("No session");

          const fileExt = file.name.split('.').pop();
          const fileName = `${selectedTask.id}/${session.user.id}_${reqId}_${Date.now()}.${fileExt}`;
          
          const { error: uploadError } = await supabase.storage.from('task-proofs').upload(fileName, file);
          if (uploadError) throw uploadError;
          
          const { data: urlData } = supabase.storage.from('task-proofs').getPublicUrl(fileName);
          
          setSubmissionData(prev => ({ ...prev, [reqId]: urlData.publicUrl }));
          toast.success("Image uploaded!");
      } catch (e: any) {
          toast.error("Upload failed: " + e.message);
      } finally {
          setUploadingFiles(prev => ({ ...prev, [reqId]: false }));
      }
  };

  const handleTextChange = (reqId: string, val: string) => {
      setSubmissionData(prev => ({ ...prev, [reqId]: val }));
  };

  const handleSubmitProof = async () => {
      if (!selectedTask || !linkOpened) return;
      
      if (countDown > 0) {
          toast.error(`Please wait ${countDown}s. Do not switch tabs!`);
          return;
      }

      // Validation
      const reqs = selectedTask.requirements || [];
      for (const req of reqs) {
          if (!submissionData[req.id]) {
              toast.error(`Missing requirement: ${req.label}`);
              return;
          }
      }

      setSubmitStatus('submitting');
      
      try {
          const { data: { session } } = await supabase.auth.getSession();
          if (!session) throw new Error("No session");

          let finalStatus: 'approved' | 'pending' = 'pending';
          
          // Auto-Approve logic only for non-complex tasks
          if (selectedTask.proof_type === 'auto' && (!reqs || reqs.length === 0)) {
              finalStatus = 'approved'; 
          }

          const { error: subError } = await supabase.from('marketplace_submissions').insert({
              task_id: selectedTask.id,
              worker_id: session.user.id,
              submission_data: submissionData, 
              status: finalStatus
          });

          if (subError) throw subError;

          // Decrement Remaining
          await supabase.rpc('decrement_task_quantity', { task_id: selectedTask.id });

          if (finalStatus === 'approved') {
              await updateWallet(session.user.id, selectedTask.worker_reward, 'increment', 'earning_balance');
              await createTransaction(session.user.id, 'earn', selectedTask.worker_reward, `Task: ${selectedTask.title}`);
              toast.success(`Verified! Reward Paid: $${selectedTask.worker_reward.toFixed(3)}`);
              window.dispatchEvent(new Event('wallet_updated'));
          } else {
              toast.info("Proofs Submitted for Manual Review.");
          }

          setSubmitStatus('success');
          
          setTimeout(() => {
              closeModal();
              fetchTasks(); 
          }, 2000);

      } catch (e: any) {
          console.error(e);
          toast.error("Error submitting: " + e.message);
          setSubmitStatus('idle');
      }
  };

  const filteredTasks = tasks.filter(t => filter === 'all' || t.category === filter);

  const getTaskIcon = (task: MarketTask) => {
      switch(task.category) {
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
      if (submitStatus === 'submitting') return;
      setSelectedTask(null);
      setSubmitStatus('idle');
      setLinkOpened(false);
      setCountDown(0);
      setTimerActive(false);
      setSubmissionData({});
  };

  if (loading) return <div className="pb-24 sm:pl-20 sm:pt-6 space-y-6"><Skeleton className="w-48 h-8 mb-4 mx-4" /></div>;

  return (
    <div className="pb-24 sm:pl-20 sm:pt-6 space-y-6">
      
      <div className="flex flex-col gap-4 px-4 sm:px-0">
          <div className="flex justify-between items-end">
             <div>
                <h1 className="text-2xl font-display font-bold text-white mb-1">Micro Jobs</h1>
                <p className="text-gray-400 text-sm">Complete simple tasks to earn real cash.</p>
             </div>
             <button onClick={fetchTasks} className="p-2 bg-[#1a1a1a] rounded-lg text-gray-400 hover:text-white"><RefreshCw size={18}/></button>
          </div>

          <div className="flex overflow-x-auto no-scrollbar gap-2 pb-2">
              {['all', 'social', 'video', 'seo', 'review', 'app'].map(f => (
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
          {filteredTasks.length === 0 ? (
              <div className="text-center py-16 bg-[#111] rounded-2xl border border-[#222] text-gray-500">
                  <Globe size={40} className="mb-4 opacity-50 mx-auto" />
                  <p>No tasks available.</p>
              </div>
          ) : (
              filteredTasks.map((task) => (
                <div key={task.id} className="cursor-pointer" onClick={() => setSelectedTask(task)}>
                     <GlassCard className={`flex items-center justify-between p-4 group hover:bg-[#1a1a1a] transition border border-[#222] ${task.worker_reward > 0.10 ? 'border-l-4 border-l-yellow-400' : ''}`}>
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-xl bg-black/30 flex items-center justify-center border border-[#333] shrink-0">
                                {getTaskIcon(task)}
                            </div>
                            <div className="min-w-0">
                                <div className="flex items-center gap-2">
                                    <h3 className="font-bold text-white text-sm truncate">{task.title}</h3>
                                    {task.worker_reward > 0.10 && <span className="bg-yellow-500 text-black text-[9px] font-bold px-1.5 py-0.5 rounded shrink-0">HIGH PAY</span>}
                                </div>
                                <div className="flex items-center gap-2 text-xs text-gray-500 mt-1">
                                    <span className="capitalize">{task.category}</span>
                                    <span>•</span>
                                    <span className={`${task.remaining_quantity < 10 ? 'text-red-400' : 'text-purple-400'}`}>{task.remaining_quantity} left</span>
                                </div>
                            </div>
                        </div>
                        <div className="text-right pl-2 shrink-0">
                           <div className="bg-green-900/20 border border-green-500/30 px-3 py-1.5 rounded-lg">
                                <p className="text-green-400 font-black text-sm"><BalanceDisplay amount={task.worker_reward} decimals={3} /></p>
                           </div>
                        </div>
                     </GlassCard>
                </div>
             ))
          )}
      </div>

      {selectedTask && (
         <div className="fixed inset-0 z-50 bg-black/90 flex items-end sm:items-center justify-center p-4" onClick={closeModal}>
             <div className="bg-[#111] w-full max-w-lg rounded-t-3xl sm:rounded-3xl border border-[#333] p-6 pb-10 sm:pb-6 relative overflow-hidden shadow-2xl max-h-[90vh] overflow-y-auto custom-scrollbar" onClick={(e: React.MouseEvent) => e.stopPropagation()}>
                 <button onClick={closeModal} className="absolute top-4 right-4 p-2 bg-[#222] hover:bg-[#333] rounded-full text-gray-400 hover:text-white transition z-20"><X size={20} /></button>

                 {submitStatus === 'success' ? (
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                         <div className="w-20 h-20 bg-green-900/20 rounded-full flex items-center justify-center mb-6 text-green-500 border border-green-900/50"><CheckCircle2 size={40} /></div>
                         <h2 className="text-2xl font-bold text-white mb-2">Submitted!</h2>
                         <p className="text-gray-400">Your proofs are under review.</p>
                    </div>
                 ) : (
                    <>
                        <div className="flex items-center gap-4 mb-6 relative z-10 pr-8">
                            <div className="w-16 h-16 bg-[#222] rounded-2xl flex items-center justify-center text-3xl border border-[#333] shrink-0">{getTaskIcon(selectedTask)}</div>
                            <div className="flex-1 min-w-0">
                                <h2 className="text-xl font-bold text-white leading-tight line-clamp-2">{selectedTask.title}</h2>
                                <div className="flex items-center gap-2 mt-1 flex-wrap">
                                    <span className="text-gray-400 text-xs capitalize">{selectedTask.category} Task</span>
                                    <span className="text-purple-400 text-xs font-bold bg-purple-900/20 px-2 py-0.5 rounded uppercase">{selectedTask.proof_type}</span>
                                </div>
                            </div>
                        </div>

                        <div className="flex justify-between items-center mb-6 bg-[#1a1a1a] p-3 rounded-xl border border-[#333]">
                            <div className="text-xs text-gray-400 font-bold uppercase">Reward</div>
                            <div className="text-green-400 font-bold text-xl font-mono"><BalanceDisplay amount={selectedTask.worker_reward} /></div>
                        </div>

                        <div className="space-y-4 relative z-10">
                            <div className="p-3 bg-blue-900/20 rounded-lg text-blue-200 text-xs leading-relaxed border border-blue-900/50">
                                <span className="font-bold text-blue-400 uppercase text-[10px] block mb-1">Instructions</span>
                                <span className="whitespace-pre-wrap">{selectedTask.description}</span>
                            </div>

                            {/* STEP 1 */}
                            <div className="flex gap-4">
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 transition-colors ${linkOpened ? 'bg-green-500 text-black' : 'bg-[#333] text-white border border-[#444]'}`}>1</div>
                                <div className="flex-1">
                                    <p className="text-sm font-bold text-white mb-1">Perform Action</p>
                                    <button onClick={handleOpenLink} className="text-xs flex items-center gap-2 text-blue-400 hover:text-blue-300 transition break-all bg-blue-900/20 px-3 py-2 rounded-lg w-full justify-between group border border-blue-900/30">
                                        <span className="truncate">{selectedTask.target_url}</span> 
                                        <ExternalLink size={12} className="group-hover:translate-x-1 transition-transform"/>
                                    </button>
                                    
                                    {/* Timer UI */}
                                    <div className="mt-2 flex items-center gap-2 bg-[#222] p-2 rounded-lg">
                                        <Clock size={14} className={timerActive ? 'text-green-400 animate-pulse' : 'text-gray-500'} />
                                        <div className="flex-1 h-1.5 bg-[#333] rounded-full overflow-hidden">
                                            <div 
                                                className={`h-full transition-all duration-1000 ${timerActive ? 'bg-green-500' : 'bg-gray-600'}`}
                                                style={{ width: `${(countDown / (selectedTask.timer_seconds || 15)) * 100}%` }}
                                            ></div>
                                        </div>
                                        <span className="text-xs font-mono font-bold text-white">{countDown}s</span>
                                    </div>
                                    {!tabFocused && timerActive && (
                                        <p className="text-[10px] text-red-400 mt-1 flex items-center gap-1"><AlertTriangle size={10}/> Timer paused! Keep tab open.</p>
                                    )}
                                </div>
                            </div>
                            
                            {/* STEP 2 */}
                            <div className="flex gap-4">
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 transition-colors ${Object.keys(submissionData).length > 0 ? 'bg-green-500 text-black' : 'bg-[#333] text-white border border-[#444]'}`}>2</div>
                                <div className="flex-1 space-y-3">
                                    <p className="text-sm font-bold text-white">Submit Proofs</p>
                                    
                                    {selectedTask.requirements?.map((req: TaskRequirement) => (
                                        <div key={req.id}>
                                            <label className="text-[10px] text-gray-400 font-bold uppercase block mb-1">{req.label}</label>
                                            {req.type === 'image' ? (
                                                <div className="relative">
                                                    <input 
                                                        type="file" accept="image/*" 
                                                        onChange={e => e.target.files && handleFileUpload(req.id, e.target.files[0])}
                                                        className="hidden" id={`upload-${req.id}`}
                                                    />
                                                    <label htmlFor={`upload-${req.id}`} className={`flex items-center justify-center w-full p-3 rounded-lg border-2 border-dashed cursor-pointer transition ${submissionData[req.id] ? 'border-green-500/50 bg-green-900/10' : 'border-[#333] hover:border-[#555] bg-black/40'}`}>
                                                        {uploadingFiles[req.id] ? <Loader2 className="animate-spin text-gray-500"/> : submissionData[req.id] ? <div className="flex items-center gap-2 text-green-400 text-xs"><CheckCircle2 size={14}/> Uploaded</div> : <div className="flex items-center gap-2 text-gray-500 text-xs"><ImageIcon size={14}/> Select Image</div>}
                                                    </label>
                                                </div>
                                            ) : (
                                                <input 
                                                    type="text" 
                                                    value={submissionData[req.id] || ''}
                                                    onChange={e => handleTextChange(req.id, e.target.value)}
                                                    className="w-full bg-black/40 border border-[#333] rounded-lg p-2 text-white text-xs focus:border-purple-500 outline-none"
                                                    placeholder="Type Answer..."
                                                />
                                            )}
                                        </div>
                                    ))}
                                    
                                    {(!selectedTask.requirements || selectedTask.requirements.length === 0) && (
                                        <div className="text-xs text-gray-500 italic bg-[#222] p-2 rounded flex items-center gap-2">
                                            <ShieldCheck size={14} className="text-green-500"/> Auto-verification enabled.
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        <button 
                            onClick={handleSubmitProof}
                            disabled={!linkOpened || submitStatus === 'submitting' || countDown > 0}
                            className={`w-full py-4 font-black rounded-xl transition flex items-center justify-center gap-2 mt-6 text-sm uppercase tracking-wide ${countDown > 0 ? 'bg-[#333] text-gray-400 cursor-not-allowed' : 'bg-white text-black hover:bg-gray-200'}`}
                        >
                            {submitStatus === 'submitting' ? <Loader2 className="animate-spin"/> : countDown > 0 ? (
                                <>Wait {countDown}s to Verify</>
                            ) : (
                                <span className="flex items-center gap-2"><Lock size={16} className={linkOpened ? 'hidden' : ''} /> {linkOpened ? 'Submit & Claim' : 'Open Link First'}</span>
                            )}
                        </button>
                    </>
                 )}
             </div>
         </div>
      )}
    </div>
  );
};

export default Tasks;
