
import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../integrations/supabase/client';
import { MarketTask } from '../types';
import { 
    ArrowLeft, Lock, RefreshCw, X, ShieldCheck, 
    Globe, Smartphone, AlertTriangle, ExternalLink, 
    CheckCircle2, Clock, Loader2, ChevronLeft, ChevronRight, Shield, Globe2, Wifi, Battery
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
    const [showBridge, setShowBridge] = useState(false);
    
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
                const next = prev + Math.random() * 15;
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
        
        try {
            const urlObj = new URL(t.target_url);
            setDisplayUrl(urlObj.hostname);
        } catch (e) {
            setDisplayUrl(t.target_url);
        }

        setTimer(t.timer_seconds || 30);
        
        // Blocked Domains logic
        const blockedDomains = [
            'facebook.com', 'instagram.com', 'youtube.com', 'youtu.be', 
            'tiktok.com', 'twitter.com', 'x.com', 'google.com', 
            'linkedin.com', 'reddit.com', 'pinterest.com', 't.me'
        ];
        
        const isBlocked = blockedDomains.some(d => t.target_url.includes(d));
        setIsIframeBlocked(isBlocked);
        setShowBridge(isBlocked);

        setTimeout(() => {
            setLoading(false);
            setLoadProgress(100);
            setStep('active');
            // If blocked, timer starts when they click "Open" in Bridge
            if (!isBlocked) setIsTimerRunning(true);
        }, 1500); 
    };

    const handleReload = () => {
        setLoadProgress(0);
        setIframeKey(prev => prev + 1);
        setTimeout(() => setLoadProgress(100), 800);
    };

    const handleExternalOpen = () => {
        if (!task) return;
        window.open(task.target_url, '_blank');
        setIsTimerRunning(true);
        toast.info("Timer started. Return here to verify after completion.");
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
                    submission_data: { method: 'secure_emulator', answer: quizAnswer }
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
        <div className="min-h-screen bg-[#050505] flex flex-col items-center justify-center font-sans">
            <div className="w-64 h-1.5 bg-gray-800 rounded-full overflow-hidden mb-6">
                <motion.div 
                    className="h-full bg-neon-green shadow-[0_0_10px_#4ade80]"
                    initial={{ width: 0 }}
                    animate={{ width: `${loadProgress}%` }}
                />
            </div>
            <div className="flex flex-col items-center gap-4 text-white">
                <div className="relative">
                    <div className="absolute inset-0 bg-blue-500/20 blur-xl rounded-full animate-pulse"></div>
                    <Globe2 size={40} className="text-blue-500 relative z-10 animate-spin-slow" />
                </div>
                <div className="text-center">
                    <span className="text-sm font-bold tracking-[0.2em] uppercase block mb-1">Initializing Emulator</span>
                    <span className="text-[10px] text-gray-500 font-mono">Secure Proxy • 256-bit Encryption</span>
                </div>
            </div>
        </div>
    );

    return (
        <div className="flex flex-col h-screen bg-[#111] overflow-hidden relative font-sans">
            
            {/* --- EMULATOR STATUS BAR --- */}
            <div className="bg-[#050505] text-white px-4 py-2 flex justify-between items-center text-[10px] font-bold select-none border-b border-[#222]">
                <div className="flex items-center gap-1.5">
                    <span>9:41</span>
                    <span className="mx-1 text-gray-600">|</span>
                    <ShieldCheck size={10} className="text-neon-green" />
                    <span className="text-gray-400">VPN: <span className="text-neon-green">CONNECTED</span></span>
                </div>
                <div className="flex items-center gap-2">
                    <Wifi size={12} />
                    <Battery size={12} />
                </div>
            </div>

            {/* --- BROWSER CHROME UI --- */}
            <div className="bg-[#1a1a1a] border-b border-[#333] z-30 shadow-2xl pb-2">
                <div className="flex items-center px-2 py-2 gap-2">
                    <button onClick={() => navigate('/tasks')} className="p-2 hover:bg-white/5 rounded-lg text-gray-400 transition active:scale-95">
                        <X size={18} />
                    </button>
                    
                    <div className="flex gap-1">
                        <button className="p-2 text-gray-500 cursor-not-allowed"><ChevronLeft size={18} /></button>
                        <button className="p-2 text-gray-500 cursor-not-allowed"><ChevronRight size={18} /></button>
                    </div>

                    {/* Fake Address Bar */}
                    <div className="flex-1 bg-[#0a0a0a] border border-[#333] rounded-xl h-10 flex items-center px-3 gap-2 relative group overflow-hidden shadow-inner">
                        <div className="bg-green-500/10 p-1 rounded text-green-500">
                            <Lock size={10} strokeWidth={3} />
                        </div>
                        <div className="flex-1 min-w-0 flex flex-col justify-center">
                            <span className="text-[11px] text-gray-300 font-medium truncate">{displayUrl}</span>
                        </div>
                        <button onClick={handleReload} className="p-1.5 hover:bg-white/10 rounded-md text-gray-400 transition">
                            <RefreshCw size={12} className={loadProgress < 100 ? 'animate-spin' : ''} />
                        </button>
                        
                        {/* Loading Line */}
                        {loadProgress < 100 && (
                            <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-blue-900/50">
                                <motion.div className="h-full bg-blue-500 shadow-[0_0_5px_#3b82f6]" style={{ width: `${loadProgress}%` }} />
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* --- MAIN VIEWPORT --- */}
            <div className="flex-1 relative bg-white w-full overflow-hidden">
                {!showBridge ? (
                    <iframe 
                        key={iframeKey}
                        src={url} 
                        className="w-full h-full border-none bg-white"
                        sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-modals allow-top-navigation-by-user-activation"
                        title="Task Browser"
                        loading="lazy"
                    />
                ) : (
                    // --- BRIDGE INTERFACE (For Blocked Sites) ---
                    <div className="absolute inset-0 bg-[#0f0f0f] flex flex-col items-center justify-center p-6 text-center">
                        <div className="w-full max-w-sm space-y-8 relative z-10">
                            
                            <motion.div 
                                initial={{ scale: 0.8, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                className="relative mx-auto w-24 h-24"
                            >
                                <div className="absolute inset-0 bg-blue-500/20 rounded-full animate-ping"></div>
                                <div className="relative bg-[#1a1a1a] border-2 border-blue-500/30 rounded-full w-full h-full flex items-center justify-center shadow-[0_0_40px_rgba(59,130,246,0.15)]">
                                    <Shield size={40} className="text-blue-400" />
                                </div>
                                <div className="absolute -bottom-2 -right-2 bg-[#111] border border-white/10 rounded-lg p-2 shadow-lg">
                                    <Lock size={16} className="text-green-500" />
                                </div>
                            </motion.div>

                            <div>
                                <h2 className="text-2xl font-bold text-white mb-3">Secure Gateway</h2>
                                <p className="text-gray-400 text-sm leading-relaxed max-w-xs mx-auto">
                                    This site <span className="text-white font-mono bg-white/10 px-1 rounded">{displayUrl}</span> requires a popup window for security validation.
                                </p>
                            </div>

                            <GlassCard className="bg-[#1a1a1a] border-[#333] p-4 text-left relative overflow-hidden">
                                <div className="absolute top-0 left-0 w-1 h-full bg-yellow-500"></div>
                                <div className="flex gap-4">
                                    <div className="bg-yellow-500/10 p-2.5 rounded-lg text-yellow-500 h-fit">
                                        <AlertTriangle size={20} />
                                    </div>
                                    <div>
                                        <p className="text-white text-sm font-bold mb-1">External Task Required</p>
                                        <p className="text-[11px] text-gray-500 leading-relaxed">
                                            This site prevents embedded browsing. Please open it in a popup window to complete the action.
                                        </p>
                                    </div>
                                </div>
                            </GlassCard>

                            <button 
                                onClick={handleExternalOpen}
                                className="w-full py-4 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl transition flex items-center justify-center gap-3 shadow-lg shadow-blue-900/20 group relative overflow-hidden"
                            >
                                <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div>
                                <span className="relative z-10">Open Target Link</span>
                                <ExternalLink size={18} className="relative z-10 group-hover:translate-x-1 transition-transform" />
                            </button>

                            {isTimerRunning && (
                                <p className="text-xs text-gray-500 font-mono animate-pulse mt-4">
                                    Waiting for timer: {timer}s...
                                </p>
                            )}
                        </div>
                        
                        {/* Background Grid */}
                        <div className="absolute inset-0 opacity-10 pointer-events-none" 
                             style={{backgroundImage: 'radial-gradient(#333 1px, transparent 1px)', backgroundSize: '20px 20px'}}>
                        </div>
                    </div>
                )}
            </div>

            {/* --- BOTTOM CONTROL BAR --- */}
            <AnimatePresence>
                {step !== 'loading' && (
                    <motion.div 
                        initial={{ y: '100%' }}
                        animate={{ y: 0 }}
                        exit={{ y: '100%' }}
                        className="bg-[#151515] border-t border-[#222] px-6 py-4 pb-safe shadow-[0_-10px_40px_rgba(0,0,0,0.5)] z-40 relative"
                    >
                        {/* Progress Bar Top of Control */}
                        {timer > 0 && (
                            <div className="absolute top-0 left-0 right-0 h-1 bg-gray-800">
                                <motion.div 
                                    className="h-full bg-yellow-500"
                                    initial={{ width: '100%' }}
                                    animate={{ width: '0%' }}
                                    transition={{ duration: timer, ease: "linear" }}
                                />
                            </div>
                        )}

                        <div className="max-w-xl mx-auto space-y-4">
                            
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-[9px] text-gray-500 uppercase font-bold tracking-wider">Reward</p>
                                    <div className="text-white font-bold text-lg font-mono"><BalanceDisplay amount={task.worker_reward} /></div>
                                </div>
                                
                                {timer > 0 ? (
                                    <div className="flex items-center gap-2 px-3 py-1.5 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                                        <Clock size={14} className="text-yellow-500 animate-pulse" />
                                        <span className="text-xs font-bold text-yellow-500 font-mono">{timer}s Remaining</span>
                                    </div>
                                ) : (
                                    <div className="flex items-center gap-2 px-3 py-1.5 bg-green-500/10 border border-green-500/20 rounded-lg">
                                        <CheckCircle2 size={14} className="text-green-500" />
                                        <span className="text-xs font-bold text-green-500">Ready to Verify</span>
                                    </div>
                                )}
                            </div>

                            {/* Quiz Interface */}
                            {task.quiz_config ? (
                                <div className="space-y-3 bg-black/40 p-3 rounded-xl border border-white/5">
                                    <div className="flex items-start gap-2">
                                        <div className="mt-0.5"><AlertTriangle size={12} className="text-blue-400"/></div>
                                        <p className="text-xs text-gray-300 font-medium leading-tight">{task.quiz_config.question}</p>
                                    </div>
                                    <div className="grid grid-cols-1 gap-2">
                                        {task.quiz_config.options.map((opt, idx) => (
                                            <button
                                                key={idx}
                                                onClick={() => setQuizAnswer(idx)}
                                                className={`p-2.5 rounded-lg text-left text-xs font-bold transition border flex items-center justify-between ${
                                                    quizAnswer === idx 
                                                    ? 'bg-blue-600/20 border-blue-500 text-white' 
                                                    : 'bg-[#111] border-[#333] text-gray-500 hover:bg-white/5'
                                                }`}
                                            >
                                                {opt}
                                                {quizAnswer === idx && <CheckCircle2 size={12} className="text-blue-500"/>}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            ) : null}

                            <button 
                                onClick={handleSubmit}
                                disabled={isSubmitting || (task.quiz_config && quizAnswer === null) || timer > 0}
                                className={`w-full py-3.5 font-black uppercase tracking-wider rounded-xl transition flex items-center justify-center gap-2 text-sm shadow-lg ${
                                    (task.quiz_config && quizAnswer === null) || timer > 0
                                    ? 'bg-[#222] text-gray-500 cursor-not-allowed border border-[#333]'
                                    : 'bg-green-500 text-black hover:bg-green-400 shadow-green-900/30 hover:scale-[1.02] active:scale-[0.98]'
                                }`}
                            >
                                {isSubmitting ? <Loader2 className="animate-spin" size={18} /> : 'VERIFY & CLAIM'}
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default TaskBrowser;
