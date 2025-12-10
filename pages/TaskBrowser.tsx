
import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../integrations/supabase/client';
import { MarketTask, QuizConfig } from '../types';
import { 
    ArrowLeft, Lock, RefreshCw, X, ShieldCheck, 
    Globe, Smartphone, AlertTriangle, ExternalLink, 
    CheckCircle2, Clock, Loader2, Maximize
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
    
    // Browser State
    const [url, setUrl] = useState('');
    const [iframeKey, setIframeKey] = useState(0);
    const [isIframeBlocked, setIsIframeBlocked] = useState(false);
    
    // Execution State
    const [timer, setTimer] = useState(0);
    const [isTimerRunning, setIsTimerRunning] = useState(false);
    const [step, setStep] = useState<'loading' | 'active' | 'verify' | 'completed'>('loading');
    
    // Verification State
    const [quizAnswer, setQuizAnswer] = useState<number | null>(null);
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
            toast.success("Time completed! Verify to claim reward.");
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
        setUrl(t.target_url);
        setTimer(t.timer_seconds || 30);
        
        // Detect likely blocked sites
        const blockedDomains = ['facebook.com', 'instagram.com', 'youtube.com', 'tiktok.com', 'twitter.com', 'x.com', 'google.com'];
        if (blockedDomains.some(d => t.target_url.includes(d))) {
            setIsIframeBlocked(true);
        }

        setLoading(false);
        setStep('active');
        setIsTimerRunning(true);
    };

    const handleReload = () => {
        setIframeKey(prev => prev + 1);
        toast.info("Reloading page...");
    };

    const handleExternalOpen = () => {
        if (!task) return;
        window.open(task.target_url, '_blank');
        setIsTimerRunning(true); // Ensure timer runs
    };

    const handleSubmit = async () => {
        if (!task) return;
        setIsSubmitting(true);

        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;

        let isSuccess = false;

        // Verification Logic
        if (task.proof_type === 'ai_quiz' && task.quiz_config) {
            if (quizAnswer === task.quiz_config.correct_index) {
                isSuccess = true;
            } else {
                toast.error("Incorrect answer. Please check the content again.");
                setIsSubmitting(false);
                return;
            }
        } else {
            // Manual/Simple verification assumed true for this flow if proof_type isn't quiz
            // In production, add Screenshot upload here
            isSuccess = true; 
        }

        if (isSuccess) {
            try {
                // 1. Record Submission
                await supabase.from('marketplace_submissions').insert({
                    task_id: task.id,
                    worker_id: session.user.id,
                    status: 'approved',
                    submission_data: { method: 'secure_browser', answer: quizAnswer }
                });

                // 2. Decrement Qty
                await supabase.rpc('decrement_task_quantity', { task_id: task.id });

                // 3. Pay User
                await updateWallet(session.user.id, task.worker_reward, 'increment', 'earning_balance');
                await createTransaction(session.user.id, 'earn', task.worker_reward, `Task: ${task.title}`);

                setStep('completed');
                toast.success("Task Verified! Reward Credited.");
                setTimeout(() => navigate('/tasks'), 2000);

            } catch (e: any) {
                toast.error(e.message);
            }
        }
        setIsSubmitting(false);
    };

    if (loading || !task) return (
        <div className="min-h-screen bg-[#111] flex items-center justify-center">
            <div className="text-center">
                <Loader2 className="animate-spin text-blue-500 mx-auto mb-4" size={40} />
                <p className="text-gray-400 text-sm font-mono animate-pulse">Initializing Secure Environment...</p>
            </div>
        </div>
    );

    return (
        <div className="flex flex-col h-screen bg-[#050505] overflow-hidden relative">
            
            {/* --- BROWSER HEADER --- */}
            <div className="h-16 bg-[#1a1a1a] border-b border-[#333] flex items-center px-4 gap-3 z-20 shadow-lg">
                <button onClick={() => navigate('/tasks')} className="p-2 hover:bg-white/10 rounded-full text-gray-400 transition">
                    <ArrowLeft size={18} />
                </button>
                
                {/* URL Bar */}
                <div className="flex-1 bg-black/50 border border-[#333] rounded-full h-10 flex items-center px-4 gap-2 relative group">
                    <Lock size={12} className="text-green-500" />
                    <span className="text-xs text-green-500 font-bold hidden sm:inline">Secure</span>
                    <div className="w-px h-4 bg-[#333] mx-1"></div>
                    <span className="text-sm text-gray-300 truncate flex-1 font-mono">{url}</span>
                    <button onClick={handleReload} className="p-1 hover:bg-white/10 rounded-full text-gray-500 transition">
                        <RefreshCw size={14} />
                    </button>
                </div>

                <div className="flex items-center gap-3">
                    <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full border ${timer > 0 ? 'bg-yellow-500/10 border-yellow-500/30 text-yellow-500' : 'bg-green-500/10 border-green-500/30 text-green-500'}`}>
                        <Clock size={14} className={timer > 0 ? "animate-pulse" : ""} />
                        <span className="text-xs font-black font-mono">{timer > 0 ? `${timer}s` : 'READY'}</span>
                    </div>
                </div>
            </div>

            {/* --- MAIN CONTENT (IFRAME OR FALLBACK) --- */}
            <div className="flex-1 relative bg-white">
                {!isIframeBlocked ? (
                    <iframe 
                        key={iframeKey}
                        src={url} 
                        className="w-full h-full border-none"
                        sandbox="allow-same-origin allow-scripts allow-forms allow-popups"
                        title="Task Browser"
                    />
                ) : (
                    <div className="absolute inset-0 bg-[#0a0a0a] flex flex-col items-center justify-center p-6 text-center">
                        <div className="w-20 h-20 bg-blue-900/20 rounded-full flex items-center justify-center border border-blue-500/30 mb-6">
                            <ShieldCheck size={40} className="text-blue-500" />
                        </div>
                        <h2 className="text-2xl font-bold text-white mb-2">External Task Required</h2>
                        <p className="text-gray-400 text-sm max-w-sm mb-8">
                            This site ({new URL(url).hostname}) prevents embedded browsing. 
                            Please open it in a popup window to complete the action.
                        </p>
                        <button 
                            onClick={handleExternalOpen}
                            className="px-8 py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-500 transition flex items-center gap-2 shadow-lg shadow-blue-900/20"
                        >
                            <ExternalLink size={18} /> Open Target Link
                        </button>
                        {timer > 0 && <p className="text-xs text-gray-500 mt-4 animate-pulse">Waiting for timer: {timer}s...</p>}
                    </div>
                )}

                {/* --- VERIFICATION OVERLAY (Bottom Sheet) --- */}
                <AnimatePresence>
                    {step === 'verify' && (
                        <motion.div 
                            initial={{ y: '100%' }}
                            animate={{ y: 0 }}
                            exit={{ y: '100%' }}
                            className="absolute bottom-0 left-0 right-0 bg-[#111] border-t border-[#333] p-6 rounded-t-3xl shadow-[0_-10px_40px_rgba(0,0,0,0.5)] z-30"
                        >
                            <div className="max-w-xl mx-auto">
                                <div className="flex justify-between items-start mb-4">
                                    <div>
                                        <h3 className="text-lg font-bold text-white flex items-center gap-2">
                                            <CheckCircle2 className="text-green-500" /> Verify Completion
                                        </h3>
                                        <p className="text-xs text-gray-400">Answer correctly to claim <span className="text-white font-bold"><BalanceDisplay amount={task.worker_reward} /></span></p>
                                    </div>
                                    <button onClick={() => setStep('active')} className="p-2 bg-white/5 rounded-full hover:bg-white/10"><X size={16} className="text-gray-400"/></button>
                                </div>

                                {task.quiz_config ? (
                                    <div className="space-y-4">
                                        <div className="bg-white/5 p-4 rounded-xl border border-white/10">
                                            <p className="text-sm text-gray-200 font-medium">{task.quiz_config.question}</p>
                                        </div>
                                        <div className="grid gap-2">
                                            {task.quiz_config.options.map((opt, idx) => (
                                                <button
                                                    key={idx}
                                                    onClick={() => setQuizAnswer(idx)}
                                                    className={`p-3 rounded-xl text-left text-sm font-medium transition border ${
                                                        quizAnswer === idx 
                                                        ? 'bg-blue-600 border-blue-500 text-white shadow-lg' 
                                                        : 'bg-black/30 border-white/10 text-gray-400 hover:bg-white/5'
                                                    }`}
                                                >
                                                    {opt}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                ) : (
                                    <div className="bg-green-900/10 border border-green-500/20 p-4 rounded-xl text-center">
                                        <p className="text-green-400 text-sm font-bold">Timer Completed!</p>
                                        <p className="text-xs text-gray-400 mt-1">Click verify to claim your earnings.</p>
                                    </div>
                                )}

                                <button 
                                    onClick={handleSubmit}
                                    disabled={isSubmitting || (task.quiz_config && quizAnswer === null)}
                                    className="w-full mt-6 py-3.5 bg-green-500 text-black font-black uppercase tracking-wider rounded-xl hover:bg-green-400 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                >
                                    {isSubmitting ? <Loader2 className="animate-spin" /> : 'VERIFY & CLAIM'}
                                </button>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
};

export default TaskBrowser;
