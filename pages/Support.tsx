
import React, { useState, useEffect, useRef } from 'react';
import GlassCard from '../components/GlassCard';
import { 
    Send, Bot, User, RefreshCw, Zap, ShieldCheck, 
    ChevronRight, AlertTriangle, CheckCircle2, LifeBuoy, 
    Loader2, Sparkles, MessageSquare, Terminal, X, ArrowRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';

// --- TYPES ---
interface SolutionAction {
    label: string;
    link: string;
}

interface BotSolution {
    id: string;
    intent: string;
    keywords: string[];
    response: string;
    steps?: string[];
    action?: SolutionAction;
    variant: 'default' | 'warning' | 'success' | 'danger';
}

interface ChatMessage {
    id: string;
    sender: 'user' | 'bot';
    text?: string;
    solution?: BotSolution;
    timestamp: Date;
}

// --- KNOWLEDGE BASE ---
const KNOWLEDGE_BASE: BotSolution[] = [
    {
        id: 'deposit_pending',
        intent: 'Deposit Issue',
        keywords: ['deposit', 'add money', 'fund', 'bkash', 'nagad', 'pending', 'recharge', 'late', 'money not added'],
        response: "I see you're asking about a deposit. Deposits usually take 10-30 minutes to reflect.",
        steps: [
            "Check if the amount was deducted from your bank.",
            "Verify the Transaction ID (TrxID) in your history.",
            "Wait up to 30 minutes for network confirmation.",
            "If rejected, funds return to your main wallet."
        ],
        action: { label: 'Track Deposit', link: '/wallet' },
        variant: 'warning'
    },
    {
        id: 'withdraw_issue',
        intent: 'Withdrawal Status',
        keywords: ['withdraw', 'cashout', 'payout', 'payment', 'receive', 'money back', 'withdrawal'],
        response: "Withdrawals are processed manually for security. Standard processing time is 24 hours.",
        steps: [
            "Check the status in your Wallet history.",
            "Ensure your payment number is correct in Profile.",
            "Do not make multiple requests for the same amount."
        ],
        action: { label: 'View Withdrawals', link: '/wallet' },
        variant: 'default'
    },
    {
        id: 'task_help',
        intent: 'Task Help',
        keywords: ['task', 'job', 'work', 'ad', 'proof', 'screenshot', 'verify', 'rejected'],
        response: "Tasks are verified automatically or by admins. Common rejection reasons:",
        steps: [
            "Closing the ad window too early.",
            "Uploading blurred or incorrect screenshots.",
            "Submitting fake text proofs."
        ],
        action: { label: 'Go to Tasks', link: '/tasks' },
        variant: 'default'
    },
    {
        id: 'game_issue',
        intent: 'Game Error',
        keywords: ['game', 'crash', 'spin', 'lost', 'glitch', 'stuck', 'freeze', 'money', 'ludo'],
        response: "If a game froze, the round ID is tracked in our system. Your funds are safe.",
        steps: [
            "Check your internet connection.",
            "Clear cache and refresh the page.",
            "Check Game History for the round result.",
            "Server errors trigger auto-refunds within 1 hour."
        ],
        action: { label: 'Game Logs', link: '/games' },
        variant: 'danger'
    },
    {
        id: 'referral_bonus',
        intent: 'Referrals',
        keywords: ['refer', 'invite', 'commission', 'bonus', 'code', 'friend', 'joining'],
        response: "You earn 5% commission instantly when your referral makes a deposit.",
        steps: [
            "Share your code from the Invite page.",
            "Friend must enter code during Signup.",
            "Check 'Commission Wallet' for earnings."
        ],
        action: { label: 'Get Code', link: '/invite' },
        variant: 'success'
    }
];

const FALLBACK: BotSolution = {
    id: 'unknown',
    intent: 'General Support',
    keywords: [],
    response: "I'm not sure I understand. Could you rephrase using keywords like 'Deposit', 'Withdraw', or 'Game'?",
    variant: 'default'
};

const QUICK_REPLIES = [
    "Deposit not received",
    "Withdrawal pending",
    "How to earn?",
    "Referral Code",
    "Game Issue"
];

const Support: React.FC = () => {
    const [messages, setMessages] = useState<ChatMessage[]>([
        {
            id: 'init',
            sender: 'bot',
            text: "Hello! 👋 I'm the EarnHub AI Sentinel.\n\nI can instantly analyze problems with Deposits, Withdrawals, Tasks, or Games. What issue are you facing?",
            timestamp: new Date()
        }
    ]);
    const [input, setInput] = useState('');
    const [botStatus, setBotStatus] = useState<'idle' | 'thinking' | 'typing'>('idle');
    const scrollRef = useRef<HTMLDivElement>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Auto-scroll to bottom when messages change
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages, botStatus]);

    const findSolution = (text: string) => {
        const lower = text.toLowerCase();
        return KNOWLEDGE_BASE.find(k => k.keywords.some(w => lower.includes(w))) || FALLBACK;
    };

    const handleSend = async (e?: React.FormEvent) => {
        e?.preventDefault();
        if (!input.trim()) return;

        const userText = input.trim();
        setInput('');

        const userMsg: ChatMessage = {
            id: Date.now().toString(),
            sender: 'user',
            text: userText,
            timestamp: new Date()
        };
        setMessages(prev => [...prev, userMsg]);
        setBotStatus('thinking');

        // Simulate Processing Time
        setTimeout(() => {
            const solution = findSolution(userText);
            setBotStatus('typing');

            setTimeout(() => {
                const botMsg: ChatMessage = {
                    id: (Date.now() + 1).toString(),
                    sender: 'bot',
                    text: solution.id === 'unknown' ? solution.response : undefined,
                    solution: solution.id !== 'unknown' ? solution : undefined,
                    timestamp: new Date()
                };
                setMessages(prev => [...prev, botMsg]);
                setBotStatus('idle');
            }, 1000);
        }, 800);
    };

    const handleQuickReply = (text: string) => {
        setInput(text);
        // We use a timeout to allow state update before sending if we wanted auto-send, 
        // but here we just populate input. Or we can auto send:
        // For better UX, let's auto-send
        setTimeout(() => {
             // Logic duplicated to ensure access to latest state isn't an issue
             // Ideally refactor handleSend to take an arg
             const userMsg: ChatMessage = {
                id: Date.now().toString(),
                sender: 'user',
                text: text,
                timestamp: new Date()
            };
            setMessages(prev => [...prev, userMsg]);
            setBotStatus('thinking');
            
            setTimeout(() => {
                const solution = findSolution(text);
                setBotStatus('typing');
                setTimeout(() => {
                    const botMsg: ChatMessage = {
                        id: (Date.now() + 1).toString(),
                        sender: 'bot',
                        text: solution.id === 'unknown' ? solution.response : undefined,
                        solution: solution.id !== 'unknown' ? solution : undefined,
                        timestamp: new Date()
                    };
                    setMessages(prev => [...prev, botMsg]);
                    setBotStatus('idle');
                }, 1000);
            }, 800);
        }, 100);
    };

    const resetChat = () => {
        setMessages([{
            id: Date.now().toString(),
            sender: 'bot',
            text: "Chat cleared. How can I help you?",
            timestamp: new Date()
        }]);
        setBotStatus('idle');
    };

    return (
        <div className="pb-24 sm:pl-20 sm:pt-6 h-[calc(100vh-80px)] flex flex-col relative px-4 sm:px-0 gap-4">
            
            {/* Header */}
            <div className="flex justify-between items-center shrink-0">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center shadow-lg border border-white/10 relative">
                        <Bot size={24} className="text-white" />
                        <span className="absolute -top-1 -right-1 flex h-3 w-3">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
                        </span>
                    </div>
                    <div>
                        <h1 className="text-xl font-display font-bold text-white">Support AI</h1>
                        <div className="flex items-center gap-1.5">
                            <span className="text-[10px] text-blue-400 font-bold uppercase tracking-wider">Automated Diagnostic System v2.0</span>
                        </div>
                    </div>
                </div>
                <button onClick={resetChat} className="p-2 bg-white/5 rounded-lg text-gray-400 hover:text-white transition hover:bg-white/10">
                    <RefreshCw size={18} />
                </button>
            </div>

            {/* Chat Area */}
            <GlassCard className="flex-1 flex flex-col overflow-hidden p-0 bg-black/40 border-white/5 relative">
                
                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar" ref={scrollRef}>
                    {messages.map((msg) => (
                        <motion.div
                            initial={{ opacity: 0, y: 10, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            key={msg.id}
                            className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                        >
                            <div className={`flex gap-3 max-w-[85%] ${msg.sender === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                                {/* Avatar */}
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-1 ${msg.sender === 'user' ? 'bg-white/10' : 'bg-blue-600'}`}>
                                    {msg.sender === 'user' ? <User size={16} /> : <Bot size={16} />}
                                </div>

                                {/* Bubble */}
                                <div className={`flex flex-col gap-1 ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}>
                                    <div className={`px-4 py-3 rounded-2xl text-sm leading-relaxed ${
                                        msg.sender === 'user' 
                                        ? 'bg-blue-600 text-white rounded-tr-none shadow-lg shadow-blue-900/20' 
                                        : 'bg-white/10 text-gray-200 rounded-tl-none border border-white/5'
                                    }`}>
                                        {/* Text Response */}
                                        {msg.text && <div className="whitespace-pre-wrap">{msg.text}</div>}

                                        {/* Structured Solution */}
                                        {msg.solution && (
                                            <div className="space-y-3">
                                                <div className="flex items-center gap-2 font-bold text-white uppercase text-xs border-b border-white/10 pb-2 mb-2">
                                                    {msg.solution.variant === 'warning' && <AlertTriangle size={14} className="text-yellow-400"/>}
                                                    {msg.solution.variant === 'danger' && <AlertTriangle size={14} className="text-red-400"/>}
                                                    {msg.solution.variant === 'success' && <Zap size={14} className="text-green-400"/>}
                                                    {msg.solution.intent}
                                                </div>
                                                <p>{msg.solution.response}</p>
                                                {msg.solution.steps && (
                                                    <ul className="space-y-1.5 mt-2 bg-black/20 p-2 rounded-lg">
                                                        {msg.solution.steps.map((step, i) => (
                                                            <li key={i} className="flex gap-2 text-xs text-gray-400">
                                                                <span className="text-blue-400 font-bold">{i+1}.</span> {step}
                                                            </li>
                                                        ))}
                                                    </ul>
                                                )}
                                                {msg.solution.action && (
                                                    <Link 
                                                        to={msg.solution.action.link}
                                                        className="mt-2 flex items-center justify-center gap-2 w-full py-2 bg-white/10 hover:bg-white/20 rounded-lg text-xs font-bold text-white transition border border-white/10"
                                                    >
                                                        {msg.solution.action.label} <ArrowRight size={12}/>
                                                    </Link>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                    <span className="text-[9px] text-gray-600 font-mono px-1">
                                        {msg.timestamp.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                    </span>
                                </div>
                            </div>
                        </motion.div>
                    ))}

                    {/* Typing Indicator */}
                    {botStatus !== 'idle' && (
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex justify-start">
                            <div className="flex gap-3 items-center">
                                <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center shrink-0">
                                    <Bot size={16} />
                                </div>
                                <div className="px-4 py-3 rounded-2xl rounded-tl-none bg-white/10 border border-white/5 flex items-center gap-1">
                                    <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                                    <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                                    <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                                </div>
                            </div>
                        </motion.div>
                    )}
                    <div ref={messagesEndRef} />
                </div>

                {/* Quick Replies (If Idle) */}
                <AnimatePresence>
                    {botStatus === 'idle' && (
                        <motion.div 
                            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                            className="px-4 pb-2 flex gap-2 overflow-x-auto no-scrollbar"
                        >
                            {QUICK_REPLIES.map((qr, i) => (
                                <button
                                    key={i}
                                    onClick={() => handleQuickReply(qr)}
                                    className="px-3 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-300 text-xs font-medium hover:bg-blue-500/20 hover:text-white transition whitespace-nowrap"
                                >
                                    {qr}
                                </button>
                            ))}
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Input Area */}
                <div className="p-3 bg-black/40 border-t border-white/10 backdrop-blur-md">
                    <form onSubmit={handleSend} className="flex gap-2 relative">
                        <input 
                            type="text" 
                            value={input}
                            onChange={e => setInput(e.target.value)}
                            placeholder={botStatus === 'idle' ? "Describe your issue..." : "AI is typing..."}
                            disabled={botStatus !== 'idle'}
                            className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-blue-500 transition disabled:opacity-50"
                        />
                        <button 
                            type="submit" 
                            disabled={!input.trim() || botStatus !== 'idle'}
                            className="p-3 bg-blue-600 text-white rounded-xl hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition shadow-lg shadow-blue-900/20"
                        >
                            <Send size={18} />
                        </button>
                    </form>
                </div>

            </GlassCard>
        </div>
    );
};

export default Support;
