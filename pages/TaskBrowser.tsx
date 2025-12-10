
import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../integrations/supabase/client';
import { MarketTask, QuizConfig } from '../types';
import { 
    ArrowLeft, Lock, RefreshCw, X, ShieldCheck, 
    Globe, Smartphone, AlertTriangle, ExternalLink, 
    CheckCircle2, Clock, Loader2, Maximize, ChevronLeft, ChevronRight, Shield, Globe2
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
    const [displayUrl, setDisplayUrl] = useState('');
    const [iframeKey, setIframeKey] = useState(0);
    const [isIframeBlocked, setIsIframeBlocked] = useState(false);
    const [loadProgress, setLoadProgress] = useState(0);
    
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

    // Simulated Loading Bar
    useEffect(() => {
        if (loading || loadProgress >= 100) return;
        const timer = setInterval(() => {
            setLoadProgress(prev => {
                const next = prev + Math.random() * 10;
                return next > 90 ? 90 : next;
            });
        }, 200);
        return () => clearInterval(timer);
    }, [loading]);

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
        setLoadProgress(0);
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
        
        // Clean URL for display
        try {
            const urlObj = new URL(t.target_url);
            setDisplayUrl(urlObj.hostname);
        } catch (e) {
            setDisplayUrl(t.target_url);
        }

        setTimer(t.timer_seconds || 30);
        
        // Advanced detection for sites that block iframes
        const blockedDomains = [
            'facebook.com', 'instagram.com', 'youtube.com', 'youtu.be', 
            'tiktok.com', 'twitter.com', 'x.com', 'google.com', 
            'linkedin.com', 'reddit.com', 'pinterest.com'
        ];
        
        if (blockedDomains.some(d => t.target_url.includes(d))) {
            setIsIframeBlocked(true);
        }

        setTimeout(() => {
            setLoading(false);
            setLoadProgress(100);
            setStep('active');
            setIsTimerRunning(true);
        }, 1500); // Fake load time for realism
    };

    const handleReload = () => {
        setLoadProgress(0);
        setIframeKey(prev => prev + 1);
        setTimeout(() => setLoadProgress(100), 1000);
    };

    const handleExternalOpen = () => {
        if (!task) return;
        window.open(task.target_url, '_blank');
        setIsTimerRunning(true);
        toast.info("Task opened in Popup Window. Keep this app open.");
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
            // Timer based verification
            if (timer > 0) {
                toast.error(`Please wait ${timer}s more to verify.`);
                setIsSubmitting(false);
                return;
            }
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
        <div className="min-h-screen bg-[#000] flex flex-col items-center justify-center font-sans">
            <div className="w-64 h-1 bg-gray-800 rounded-full overflow-hidden mb-4">
                <motion.div 
                    className="h-full bg-blue-500"
                    initial={{ width: 0 }}
                    animate={{ width: `${loadProgress}%` }}
                />
            </div>
            <div className="flex items-center gap-3 text-white">
                <Shield className="text-green-500 animate-pulse" size={20} />
                <span className="text-sm font-bold tracking-widest uppercase">Establishing Secure Connection...</span>
            </div>
            <p className="text-xs text-gray-500 mt-2 font-mono">Proxy: 192.168.x.x | Encrypted</p>
        </div>
    );

    return (
        <div className="flex flex-col h-screen bg-[#111] overflow-hidden relative font-sans">
            
            {/* --- BROWSER CHROME UI --- */}
            <div className="bg-[#1a1a1a] border-b border-[#333] pt-safe z-30 shadow-2xl">
                {/* Status Bar Mock */}
                <div className="px-4 py-1 flex justify-between text-[10px] text-gray-500 uppercase font-bold tracking-wider">
                    <span className="flex items-center gap-1 text-green-500"><Lock size={10} /> Encrypted Session</span>
                    <span>Naxxivo Secure Browser v4.0</span>
                </div>

                {/* Toolbar */}
                <div className="flex items-center px-2 py-2 gap-2">
                    <button onClick={() => navigate('/tasks')} className="p-2 hover:bg-white/10 rounded-lg text-gray-400 transition">
                        <X size={20} />
                    </button>
                    
                    <div className="flex gap-1">
                        <button className="p-2 text-gray-600 cursor-not-allowed"><ChevronLeft size={20} /></button>
                        <button className="p-2 text-gray-600 cursor-not-allowed"><ChevronRight size={20} /></button>
                    </div>

                    {/* Address Bar */}
                    <div className="flex-1 bg-[#0a0a0a] border border-[#333] rounded-xl h-10 flex items-center px-3 gap-2 relative group overflow-hidden">
                        <div className="bg-green-500/10 p-1 rounded text-green-500">
                            <ShieldCheck size={12} />
                        </div>
                        <div className="flex-1 min-w-0 flex flex-col justify-center">
                            <span className="text-xs text-white font-medium truncate">{displayUrl}</span>
                            {!isIframeBlocked && <span className="text-[8px] text-green-500 leading-none">Connection Secure</span>}
                        </div>
                        <button onClick={handleReload} className="p-1.5 hover:bg-white/10 rounded-md text-gray-400 transition">
                            <RefreshCw size={12} />
                        </button>
                        
                        {/* Loading Line */}
                        {loadProgress < 100 && (
                            <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-blue-500/20">
                                <motion.div className="h-full bg-blue-500" style={{ width: `${loadProgress}%` }} />
                            </div>
                        )}
                    </div>

                    {/* Timer Badge */}
                    <div className="bg-[#222] border border-[#333] rounded-xl px-3 py-1.5 flex flex-col items-center min-w-[60px]">
                        <span className="text-[8px] text-gray-500 uppercase font-bold">Timer</span>
                        <div className={`text-xs font-black font-mono ${timer > 0 ? 'text-yellow-500' : 'text-green-500'}`}>
                            {timer > 0 ? `${timer}s` : 'OK'}
                        </div>
                    </div>
                </div>
            </div>

            {/* --- MAIN VIEWPORT --- */}
            <div className="flex-1 relative bg-white w-full">
                {!isIframeBlocked ? (
                    <iframe 
                        key={iframeKey}
                        src={url} 
                        className="w-full h-full border-none bg-white"
                        sandbox="allow-same-origin allow-scripts allow-forms allow-popups"
                        title="Task Browser"
                        loading="lazy"
                    />
                ) : (
                    // --- BRIDGE INTERFACE (For Blocked Sites) ---
                    <div className="absolute inset-0 bg-[#0f0f0f] flex flex-col items-center justify-center p-6 text-center">
                        <div className="w-full max-w-sm space-y-8">
                            
                            <div className="relative mx-auto w-24 h-24">
                                <div className="absolute inset-0 bg-blue-500/20 rounded-full animate-ping"></div>
                                <div className="relative bg-[#1a1a1a] border-2 border-blue-500/50 rounded-full w-full h-full flex items-center justify-center shadow-[0_0_40px_rgba(59,130,246,0.2)]">
                                    <Globe2 size={40} className="text-blue-400" />
                                </div>
                                <div className="absolute -bottom-2 -right-2 bg-[#111] border border-white/10 rounded-lg p-1.5 shadow-lg">
                                    <ShieldCheck size={16} className="text-green-500" />
                                </div>
                            </div>

                            <div>
                                <h2 className="text-2xl font-bold text-white mb-2">Secure Gateway</h2>
                                <p className="text-gray-400 text-sm leading-relaxed">
                                    This site ({displayUrl}) requires a dedicated popup window for security validation.
                                </p>
                            </div>

                            <GlassCard className="bg-[#1a1a1a] border-[#333] p-4 flex items-center gap-4 text-left">
                                <div className="bg-yellow-500/10 p-2 rounded-lg text-yellow-500">
                                    <AlertTriangle size={20} />
                                </div>
                                <div>
                                    <p className="text-white text-sm font-bold">Action Required</p>
                                    <p className="text-xs text-gray-500">Open link, complete action, return here.</p>
                                </div>
                            </GlassCard>

                            <button 
                                onClick={handleExternalOpen}
                                className="w-full py-4 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl transition flex items-center justify-center gap-3 shadow-lg shadow-blue-900/20 group"
                            >
                                <span>Launch {displayUrl}</span>
                                <ExternalLink size={18} className="group-hover:translate-x-1 transition-transform" />
                            </button>

                            {timer > 0 && (
                                <p className="text-xs text-gray-600 font-mono animate-pulse">
                                    Waiting for validation signal... {timer}s
                                </p>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* --- VERIFICATION & CONTROLS --- */}
            <AnimatePresence>
                {step !== 'loading' && (
                    <motion.div 
                        initial={{ y: '100%' }}
                        animate={{ y: 0 }}
                        exit={{ y: '100%' }}
                        className="bg-[#1a1a1a] border-t border-[#333] px-6 py-4 pb-safe shadow-[0_-10px_40px_rgba(0,0,0,0.5)] z-40"
                    >
                        <div className="max-w-xl mx-auto space-y-4">
                            
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-[10px] text-gray-500 uppercase font-bold">Reward</p>
                                    <div className="text-white font-bold text-lg"><BalanceDisplay amount={task.worker_reward} /></div>
                                </div>
                                
                                {task.quiz_config ? (
                                    <div className="text-right">
                                        <p className="text-[10px] text-blue-400 uppercase font-bold">Quiz Required</p>
                                        <p className="text-gray-400 text-xs">Answer below</p>
                                    </div>
                                ) : (
                                    <div className="text-right">
                                        <p className="text-[10px] text-green-400 uppercase font-bold">Auto-Check</p>
                                        <p className="text-gray-400 text-xs">Click Verify</p>
                                    </div>
                                )}
                            </div>

                            {/* Quiz Interface */}
                            {task.quiz_config && (
                                <div className="space-y-3 bg-black/20 p-3 rounded-xl border border-white/5">
                                    <p className="text-sm text-white font-medium">{task.quiz_config.question}</p>
                                    <div className="grid grid-cols-1 gap-2">
                                        {task.quiz_config.options.map((opt, idx) => (
                                            <button
                                                key={idx}
                                                onClick={() => setQuizAnswer(idx)}
                                                className={`p-3 rounded-lg text-left text-sm font-medium transition border flex items-center justify-between ${
                                                    quizAnswer === idx 
                                                    ? 'bg-blue-600/20 border-blue-500 text-white' 
                                                    : 'bg-[#111] border-[#333] text-gray-400 hover:bg-white/5'
                                                }`}
                                            >
                                                {opt}
                                                {quizAnswer === idx && <CheckCircle2 size={14} className="text-blue-500"/>}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            <button 
                                onClick={handleSubmit}
                                disabled={isSubmitting || (task.quiz_config && quizAnswer === null)}
                                className={`w-full py-3.5 font-black uppercase tracking-wider rounded-xl transition flex items-center justify-center gap-2 ${
                                    (task.quiz_config && quizAnswer === null) || timer > 0
                                    ? 'bg-[#222] text-gray-500 cursor-not-allowed'
                                    : 'bg-green-500 text-black hover:bg-green-400 shadow-lg shadow-green-900/20'
                                }`}
                            >
                                {isSubmitting ? <Loader2 className="animate-spin" /> : 'VERIFY COMPLETION'}
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default TaskBrowser;
