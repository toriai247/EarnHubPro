
import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../integrations/supabase/client';
import { MarketTask } from '../types';
import { 
    ArrowLeft, ExternalLink, CheckCircle2, Clock, 
    Loader2, ShieldCheck, AlertTriangle, PlayCircle,
    Timer, Globe, Smartphone, Type, Send, FileCheck, UploadCloud
} from 'lucide-react';
import { useUI } from '../context/UIContext';
import { updateWallet, createTransaction } from '../lib/actions';
import { motion, AnimatePresence } from 'framer-motion';
import GlassCard from '../components/GlassCard';
import BalanceDisplay from '../components/BalanceDisplay';

const TaskBrowser: React.FC = () => {
    const { taskId } = useParams<{ taskId: string }>();
    const navigate = useNavigate();
    const { toast } = useUI();
    
    // Task Data
    const [task, setTask] = useState<MarketTask | null>(null);
    const [loading, setLoading] = useState(true);
    
    // Execution State
    const [hasOpenedLink, setHasOpenedLink] = useState(false);
    const [timer, setTimer] = useState(0);
    const [isTimerRunning, setIsTimerRunning] = useState(false);
    const [step, setStep] = useState<'briefing' | 'running' | 'verify' | 'completed' | 'pending_approval'>('briefing');
    
    // Verification State
    const [quizAnswer, setQuizAnswer] = useState<number | null>(null);
    const [manualInput, setManualInput] = useState('');
    const [uploadedFile, setUploadedFile] = useState<File | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        if (!taskId) return;
        fetchTask();
    }, [taskId]);

    // Timer Logic
    useEffect(() => {
        let interval: any;
        if (isTimerRunning && timer > 0) {
            interval = setInterval(() => {
                setTimer((prev) => prev - 1);
            }, 1000);
        } else if (timer === 0 && isTimerRunning) {
            setIsTimerRunning(false);
            setStep('verify');
            toast.success("Time completed! You can now verify.");
        }
        return () => clearInterval(interval);
    }, [isTimerRunning, timer]);

    const fetchTask = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('marketplace_tasks')
            .select('*')
            .eq('id', taskId)
            .single();

        if (error || !data) {
            toast.error("Task not found");
            navigate('/tasks');
            return;
        }

        const t = data as MarketTask;
        setTask(t);
        setTimer(t.timer_seconds || 30);
        setLoading(false);
    };

    const handleOpenLink = () => {
        if (!task) return;
        window.open(task.target_url, '_blank');
        setHasOpenedLink(true);
        setStep('running');
        setIsTimerRunning(true);
        toast.info(`Task started! Return here after ${timer} seconds.`);
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setUploadedFile(e.target.files[0]);
        }
    };

    const handleSubmit = async () => {
        if (!task) return;
        setIsSubmitting(true);

        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;

        // --- SCENARIO 1: AUTO QUIZ ---
        if (task.proof_type === 'ai_quiz' && task.quiz_config) {
            if (quizAnswer === task.quiz_config.correct_index) {
                await approveTask(session.user.id);
            } else {
                toast.error("Incorrect answer. Please check content again.");
                setIsSubmitting(false);
            }
        } 
        // --- SCENARIO 2: FILE VERIFICATION ---
        else if (task.proof_type === 'file_check') {
            if (!uploadedFile) {
                toast.error("Please upload the downloaded file.");
                setIsSubmitting(false);
                return;
            }
            if (task.expected_file_name && uploadedFile.name === task.expected_file_name) {
                await approveTask(session.user.id);
            } else {
                toast.error(`File mismatch! Uploaded: ${uploadedFile.name} | Expected: ${task.expected_file_name}`);
                setIsSubmitting(false);
            }
        }
        // --- SCENARIO 3: MANUAL TEXT INPUT ---
        else if (task.proof_type === 'text_input') {
            if (!manualInput.trim()) {
                toast.error("Please enter the required information.");
                setIsSubmitting(false);
                return;
            }

            try {
                // Record Submission as PENDING
                await supabase.from('marketplace_submissions').insert({
                    task_id: task.id,
                    worker_id: session.user.id,
                    status: 'pending',
                    submission_data: { method: 'text', input: manualInput }
                });

                setStep('pending_approval');
                toast.success("Submission Sent for Approval");
                setTimeout(() => navigate('/tasks'), 3000);

            } catch (e: any) {
                toast.error(e.message);
            }
            setIsSubmitting(false);
        }
    };

    const approveTask = async (userId: string) => {
        try {
            if(!task) return;
            // Record Submission
            await supabase.from('marketplace_submissions').insert({
                task_id: task.id,
                worker_id: userId,
                status: 'approved',
                submission_data: { method: task.proof_type, answer: quizAnswer, file: uploadedFile?.name }
            });

            // Decrement Qty
            await supabase.rpc('decrement_task_quantity', { task_id: task.id });

            // Pay User
            await updateWallet(userId, task.worker_reward, 'increment', 'earning_balance');
            await createTransaction(userId, 'earn', task.worker_reward, `Task: ${task.title}`);

            setStep('completed');
            toast.success("Verified! Reward Credited.");
            setTimeout(() => navigate('/tasks'), 2500);
        } catch (e: any) {
            toast.error(e.message);
            setIsSubmitting(false);
        }
    };

    if (loading || !task) return (
        <div className="min-h-screen bg-[#050505] flex flex-col items-center justify-center font-sans">
            <Loader2 className="animate-spin text-white mb-4" size={40} />
            <p className="text-gray-500 text-sm font-bold animate-pulse">LOADING TASK...</p>
        </div>
    );

    return (
        <div className="min-h-screen bg-[#050505] text-white p-6 flex flex-col relative font-sans">
            
            {/* Header */}
            <div className="flex items-center gap-4 mb-8 z-10">
                <button onClick={() => navigate('/tasks')} className="p-2 bg-white/10 rounded-xl hover:bg-white/20 transition text-white">
                    <ArrowLeft size={20} />
                </button>
                <div className="flex-1">
                    <h1 className="text-lg font-bold leading-tight">{task.title}</h1>
                    <p className="text-xs text-gray-400 mt-0.5">{task.company_name || 'Marketplace Task'}</p>
                </div>
                <div className="bg-green-500/10 border border-green-500/20 px-3 py-1.5 rounded-lg text-right">
                    <p className="text-[9px] text-gray-500 uppercase font-bold">Reward</p>
                    <p className="text-green-400 font-mono font-bold text-sm"><BalanceDisplay amount={task.worker_reward} /></p>
                </div>
            </div>

            {/* Main Content Area */}
            <div className="flex-1 flex flex-col items-center justify-center max-w-md mx-auto w-full z-10 space-y-8">
                
                {/* Status Indicator */}
                <div className="relative">
                    <div className={`w-24 h-24 rounded-full flex items-center justify-center border-4 transition-all duration-500 ${
                        step === 'completed' ? 'border-green-500 bg-green-500/20' : 
                        step === 'pending_approval' ? 'border-yellow-500 bg-yellow-500/20' :
                        step === 'verify' ? 'border-blue-500 bg-blue-500/20' :
                        step === 'running' ? 'border-yellow-500 bg-yellow-500/20' :
                        'border-white/10 bg-white/5'
                    }`}>
                        {step === 'completed' ? <CheckCircle2 size={40} className="text-green-500" /> :
                         step === 'pending_approval' ? <Clock size={40} className="text-yellow-500" /> :
                         step === 'verify' ? <ShieldCheck size={40} className="text-blue-500" /> :
                         step === 'running' ? <Clock size={40} className="text-yellow-500 animate-pulse" /> :
                         <Globe size={40} className="text-gray-400" />}
                    </div>
                </div>

                <div className="text-center space-y-2">
                    <h2 className="text-2xl font-black uppercase tracking-tight">
                        {step === 'completed' ? 'Mission Complete' :
                         step === 'pending_approval' ? 'Under Review' :
                         step === 'verify' ? 'Verification Ready' :
                         step === 'running' ? 'Task in Progress' :
                         'Task Briefing'}
                    </h2>
                    <p className="text-sm text-gray-400 max-w-xs mx-auto leading-relaxed">
                        {step === 'completed' ? 'Reward has been credited.' :
                         step === 'pending_approval' ? 'Submission sent. Dealer will verify shortly.' :
                         step === 'verify' ? 'Complete the check below to claim.' :
                         step === 'running' ? `Wait ${timer}s on the target page.` :
                         task.description}
                    </p>
                </div>

                {/* Dynamic Action Card */}
                <GlassCard className="w-full border border-white/10 bg-[#111]">
                    <AnimatePresence mode="wait">
                        
                        {/* STATE 1: BRIEFING */}
                        {step === 'briefing' && (
                            <motion.div 
                                key="briefing"
                                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                                className="space-y-4"
                            >
                                <div className="flex items-center gap-3 p-3 bg-white/5 rounded-xl border border-white/5">
                                    <div className="p-2 bg-blue-500/20 rounded-lg text-blue-400"><Clock size={18}/></div>
                                    <div className="text-left">
                                        <p className="text-[10px] text-gray-500 uppercase font-bold">Required Time</p>
                                        <p className="text-white font-bold">{timer} Seconds</p>
                                    </div>
                                </div>
                                <button 
                                    onClick={handleOpenLink}
                                    className="w-full py-4 bg-white text-black font-black uppercase rounded-xl hover:bg-gray-200 transition shadow-lg flex items-center justify-center gap-2 group"
                                >
                                    Start Task <ExternalLink size={18} className="group-hover:translate-x-1 transition-transform"/>
                                </button>
                            </motion.div>
                        )}

                        {/* STATE 2: RUNNING */}
                        {step === 'running' && (
                            <motion.div 
                                key="running"
                                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                                className="text-center space-y-4 py-4"
                            >
                                <p className="text-3xl font-mono font-bold text-white tabular-nums">
                                    00:{timer < 10 ? `0${timer}` : timer}
                                </p>
                                <div className="w-full bg-gray-800 h-2 rounded-full overflow-hidden">
                                    <motion.div 
                                        className="h-full bg-yellow-500"
                                        initial={{ width: '0%' }}
                                        animate={{ width: '100%' }}
                                        transition={{ duration: task.timer_seconds, ease: "linear" }}
                                    />
                                </div>
                                <p className="text-xs text-yellow-500 animate-pulse font-bold">
                                    Do not close the target window...
                                </p>
                                <button onClick={handleOpenLink} className="text-xs text-gray-500 underline hover:text-white">
                                    Re-open Link
                                </button>
                            </motion.div>
                        )}

                        {/* STATE 3: VERIFY */}
                        {step === 'verify' && (
                            <motion.div 
                                key="verify"
                                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                                className="space-y-4"
                            >
                                {task.proof_type === 'ai_quiz' && task.quiz_config ? (
                                    <div className="space-y-3 text-left">
                                        <div className="flex items-center gap-2 mb-2">
                                            <AlertTriangle size={16} className="text-blue-500"/>
                                            <span className="text-xs font-bold text-blue-400 uppercase">Quiz Check</span>
                                        </div>
                                        <p className="text-sm text-white font-medium">{task.quiz_config.question}</p>
                                        <div className="space-y-2">
                                            {task.quiz_config.options.map((opt, idx) => (
                                                <button
                                                    key={idx}
                                                    onClick={() => setQuizAnswer(idx)}
                                                    className={`w-full p-3 rounded-xl text-left text-xs font-bold border transition flex justify-between items-center ${
                                                        quizAnswer === idx 
                                                        ? 'bg-blue-600/20 border-blue-500 text-white' 
                                                        : 'bg-white/5 border-white/5 text-gray-400 hover:bg-white/10'
                                                    }`}
                                                >
                                                    {opt}
                                                    {quizAnswer === idx && <CheckCircle2 size={14} className="text-blue-500"/>}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                ) : task.proof_type === 'file_check' ? (
                                    <div className="space-y-3 text-left">
                                        <div className="flex items-center gap-2 mb-2">
                                            <FileCheck size={16} className="text-green-500"/>
                                            <span className="text-xs font-bold text-green-400 uppercase">File Check</span>
                                        </div>
                                        <p className="text-sm text-white font-medium">Upload the downloaded file to verify.</p>
                                        <p className="text-xs text-gray-500">Expected: {task.expected_file_name}</p>
                                        
                                        <div className="relative border-2 border-dashed border-white/20 rounded-xl p-6 text-center hover:border-green-500/50 hover:bg-green-500/5 transition">
                                            <input 
                                                type="file" 
                                                onChange={handleFileChange}
                                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                                            />
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
                                        {/* DETECTED NAME BOX */}
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
                                        <p className="text-sm text-white font-medium">{task.proof_question || "Enter required details:"}</p>
                                        <input 
                                            type="text" 
                                            value={manualInput} 
                                            onChange={e => setManualInput(e.target.value)} 
                                            className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white focus:border-amber-500 outline-none placeholder-gray-600 text-sm"
                                            placeholder="Type answer here..."
                                        />
                                    </div>
                                )}

                                <button 
                                    onClick={handleSubmit}
                                    disabled={isSubmitting || (task.proof_type === 'ai_quiz' && quizAnswer === null) || (task.proof_type === 'text_input' && !manualInput.trim()) || (task.proof_type === 'file_check' && !uploadedFile)}
                                    className="w-full py-4 bg-green-500 text-black font-black uppercase rounded-xl hover:bg-green-400 transition shadow-lg shadow-green-900/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                >
                                    {isSubmitting ? <Loader2 className="animate-spin" size={20}/> : <><Send size={18}/> SUBMIT PROOF</>}
                                </button>
                            </motion.div>
                        )}

                        {/* STATE 4: PENDING APPROVAL */}
                        {step === 'pending_approval' && (
                            <motion.div 
                                key="pending"
                                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                                className="text-center py-6"
                            >
                                <p className="text-yellow-400 font-bold mb-2">Verification Pending</p>
                                <p className="text-xs text-gray-500 max-w-xs mx-auto mb-4">
                                    The ad runner will review your submission. If no action is taken within {task.auto_approve_hours || 24} hours, it will auto-approve.
                                </p>
                                <button onClick={() => navigate('/tasks')} className="text-sm text-white bg-white/10 px-6 py-2 rounded-lg hover:bg-white/20">
                                    Return to Task List
                                </button>
                            </motion.div>
                        )}

                        {/* STATE 5: COMPLETED */}
                        {step === 'completed' && (
                            <motion.div 
                                key="completed"
                                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                                className="text-center py-6"
                            >
                                <div className="text-green-500 font-black text-2xl mb-2">+<BalanceDisplay amount={task.worker_reward} /></div>
                                <p className="text-xs text-gray-500">Credited to Earnings Wallet</p>
                                <button onClick={() => navigate('/tasks')} className="mt-6 text-sm text-white hover:underline">
                                    Return to Task List
                                </button>
                            </motion.div>
                        )}

                    </AnimatePresence>
                </GlassCard>

            </div>
        </div>
    );
};

export default TaskBrowser;
