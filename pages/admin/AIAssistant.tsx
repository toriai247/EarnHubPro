
import React, { useState, useEffect, useRef } from 'react';
import GlassCard from '../../components/GlassCard';
import { 
    Bot, Sparkles, Terminal, Activity, Shield, 
    Users, AlertTriangle, Cpu, Clock, PlayCircle, Loader2, Key, Eye, EyeOff, Save, Trash2, Wifi, Settings, Send, Eye as VisionEye
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useUI } from '../../context/UIContext';
import { supabase } from '../../integrations/supabase/client';
import { analyzeUserRisk, validateDeepSeekKey, chatWithAI } from '../../lib/aiHelper';

// Define Modules the AI controls
interface AIModule {
    id: string;
    name: string;
    description: string;
    icon: any;
    isActive: boolean;
    confidenceThreshold: number; // 0-100
    status: 'idle' | 'processing' | 'learning';
    lastActive: string;
}

const AIAssistant: React.FC = () => {
    const { toast, confirm } = useUI();
    const [apiKeyStatus, setApiKeyStatus] = useState<'checking' | 'connected' | 'error' | 'empty'>('checking');
    const [latency, setLatency] = useState(0);
    const [isTyping, setIsTyping] = useState(false);
    const [isRiskScanning, setIsRiskScanning] = useState(false);
    
    // Key Management
    const [customKey, setCustomKey] = useState('');
    const [showKey, setShowKey] = useState(false);
    const [showSettings, setShowSettings] = useState(false);
    const [validatingKey, setValidatingKey] = useState(false);

    // Chat State
    const [messages, setMessages] = useState<{role: 'user' | 'ai', text: string}[]>([
        { role: 'ai', text: "DeepSeek Systems online. I am monitoring visual verification streams and risk profiles." }
    ]);
    const [input, setInput] = useState('');
    const chatEndRef = useRef<HTMLDivElement>(null);

    // AI Modules Configuration
    const [modules, setModules] = useState<AIModule[]>([
        {
            id: 'vision_matcher',
            name: 'Task Vision Matcher (V4)',
            description: 'Compares worker screenshots with creator DNA for auto-approval.',
            icon: VisionEye,
            isActive: true,
            confidenceThreshold: 80,
            status: 'processing',
            lastActive: 'Active Now'
        },
        {
            id: 'deposit_bot',
            name: 'Auto-Deposit Time Bot',
            description: 'Enforces 10-minute payment window & verifies screenshots.',
            icon: Clock,
            isActive: true, // Default ON
            confidenceThreshold: 85,
            status: 'processing',
            lastActive: 'Active Now'
        },
        {
            id: 'kyc_verifier',
            name: 'KYC Verifier',
            description: 'Checks ID documents for forgeries and face match.',
            icon: Shield,
            isActive: true,
            confidenceThreshold: 90,
            status: 'idle',
            lastActive: '5m ago'
        },
        {
            id: 'risk_engine',
            name: 'Risk Engine',
            description: 'Detects cheats, win-rate anomalies, and suspicious activity.',
            icon: AlertTriangle,
            isActive: true,
            confidenceThreshold: 75,
            status: 'learning',
            lastActive: 'Continuous'
        }
    ]);

    useEffect(() => {
        checkInitialKey();
    }, []);

    const checkInitialKey = async () => {
        const storedKey = localStorage.getItem('deepseek_api_key');
        if (storedKey) {
            setCustomKey(storedKey);
            await performKeyValidation(storedKey);
        } else {
            setApiKeyStatus('empty');
        }
    };

    const performKeyValidation = async (key: string) => {
        setValidatingKey(true);
        const result = await validateDeepSeekKey(key);
        setValidatingKey(false);
        
        if (result.valid) {
            setApiKeyStatus('connected');
            setLatency(result.latency);
        } else {
            setApiKeyStatus('error');
        }
    };

    const handleSaveKey = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!customKey.trim()) return;
        
        setValidatingKey(true);
        const result = await validateDeepSeekKey(customKey);
        setValidatingKey(false);

        if (result.valid) {
            localStorage.setItem('deepseek_api_key', customKey);
            setApiKeyStatus('connected');
            setLatency(result.latency);
            toast.success("DeepSeek Key Connected & Saved!");
            setShowSettings(false);
        } else {
            setApiKeyStatus('error');
            toast.error(`Connection Failed: ${result.message}`);
        }
    };

    const handleClearKey = async () => {
        if (await confirm("Remove custom API key?")) {
            localStorage.removeItem('deepseek_api_key');
            setCustomKey('');
            setApiKeyStatus('empty');
            toast.info("Custom key removed");
        }
    };

    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim()) return;

        const userMsg = input;
        setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
        setInput('');
        setIsTyping(true);

        try {
            const context = `
                You are the AI System Architect for Naxxivo, running on DeepSeek V3.
                You control: Deposits, KYC, Risk, and Support.
                Status: Vision Matcher (Active), Deposit Bot (85%), KYC Bot (90%), Risk Engine (Active).
                Respond briefly and professionally as a system admin.
            `;

            const responseText = await chatWithAI(userMsg, context);
            setMessages(prev => [...prev, { role: 'ai', text: responseText || "No response." }]);
        } catch (e: any) {
            setMessages(prev => [...prev, { role: 'ai', text: "Connection Error: " + e.message }]);
            setApiKeyStatus('error');
        } finally {
            setIsTyping(false);
        }
    };

    // --- RISK ENGINE SCAN LOGIC ---
    const runRiskScan = async () => {
        const key = localStorage.getItem('deepseek_api_key');
        if (!key) {
            toast.error("DeepSeek API Key Missing. Setup in config.");
            setShowSettings(true);
            return;
        }
        
        setIsRiskScanning(true);
        setMessages(prev => [...prev, { role: 'ai', text: "Initiating Risk Scan... Analyzing recent user activity logs for anomalies." }]);

        try {
            const { data: users } = await supabase.from('profiles')
                .select('id, name_1, created_at, is_suspended')
                .eq('is_suspended', false)
                .order('created_at', { ascending: false })
                .limit(5);

            if (!users || users.length === 0) {
                setMessages(prev => [...prev, { role: 'ai', text: "No active users found to scan." }]);
                setIsRiskScanning(false);
                return;
            }

            let suspendedCount = 0;
            let flaggedCount = 0;

            for (const user of users) {
                const [txs, games] = await Promise.all([
                    supabase.from('transactions').select('type, amount, status').eq('user_id', user.id).order('created_at', { ascending: false }).limit(20),
                    supabase.from('game_history').select('game_name, profit').eq('user_id', user.id).order('created_at', { ascending: false }).limit(20)
                ]);

                const analysis = await analyzeUserRisk(user, txs.data || [], games.data || []);

                if (analysis.verdict === 'suspend') {
                    await supabase.from('profiles').update({ 
                        is_suspended: true,
                        risk_score: analysis.risk_score,
                        admin_notes: `AI AUTO-SUSPEND: ${analysis.reason}`
                    }).eq('id', user.id);
                    
                    setMessages(prev => [...prev, { 
                        role: 'ai', 
                        text: `🔴 SUSPENDED: ${user.name_1} (Risk: ${analysis.risk_score}). Reason: ${analysis.reason}` 
                    }]);
                    suspendedCount++;
                } else if (analysis.verdict === 'flag' || analysis.risk_score > 50) {
                    await supabase.from('profiles').update({ 
                        risk_score: analysis.risk_score
                    }).eq('id', user.id);
                    flaggedCount++;
                }
            }

            setMessages(prev => [...prev, { 
                role: 'ai', 
                text: `Scan Complete. Suspended: ${suspendedCount}. Flagged High Risk: ${flaggedCount}. Clean: ${users.length - suspendedCount - flaggedCount}.` 
            }]);

        } catch (e: any) {
            toast.error("Scan Failed: " + e.message);
            setMessages(prev => [...prev, { role: 'ai', text: `Error during scan: ${e.message}` }]);
        } finally {
            setIsRiskScanning(false);
        }
    };

    const toggleModule = (id: string) => {
        setModules(prev => prev.map(m => {
            if (m.id === id) {
                const newState = !m.isActive;
                toast.info(`${m.name} is now ${newState ? 'Online' : 'Offline'}`);
                return { ...m, isActive: newState, status: newState ? 'idle' : 'idle' };
            }
            return m;
        }));
    };

    const updateThreshold = (id: string, val: number) => {
        setModules(prev => prev.map(m => m.id === id ? { ...m, confidenceThreshold: val } : m));
    };

    return (
        <div className="space-y-6 animate-fade-in pb-20">
            
            {/* HEADER */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h2 className="text-3xl font-display font-black text-white flex items-center gap-3">
                        <Bot className="text-purple-400" size={32} /> DEEPSEEK ARCHITECT
                    </h2>
                    <p className="text-gray-400 text-sm mt-1">
                        DeepSeek-Powered Autonomous System Management
                    </p>
                </div>
                
                {/* Status Badge & Settings Toggle */}
                <div className="flex items-center gap-2">
                    <button 
                        onClick={() => setShowSettings(!showSettings)}
                        className={`px-4 py-2 rounded-xl border flex items-center gap-2 transition hover:opacity-80 ${
                            apiKeyStatus === 'connected' 
                            ? 'bg-green-500/10 border-green-500/30 text-green-400' 
                            : apiKeyStatus === 'checking' 
                            ? 'bg-yellow-500/10 border-yellow-500/30 text-yellow-400'
                            : 'bg-red-500/10 border-red-500/30 text-red-400'
                        }`}
                    >
                        {apiKeyStatus === 'checking' ? <Loader2 size={18} className="animate-spin" /> : <Cpu size={18} />}
                        <span className="font-bold text-xs uppercase tracking-wider">
                            {apiKeyStatus === 'connected' ? 'DeepSeek Online' : apiKeyStatus === 'checking' ? 'Connecting...' : 'DeepSeek Offline'}
                        </span>
                        <Settings size={14} className="ml-2 opacity-50" />
                    </button>
                </div>
            </div>

            {/* API KEY CONFIGURATION CARD (Toggleable) */}
            <AnimatePresence>
                {showSettings && (
                    <motion.div 
                        initial={{ opacity: 0, height: 0 }} 
                        animate={{ opacity: 1, height: 'auto' }} 
                        exit={{ opacity: 0, height: 0 }}
                        className="overflow-hidden"
                    >
                        <GlassCard className="border-purple-500/30 bg-purple-900/10 mb-6">
                            <div className="flex items-start gap-4">
                                <div className="p-3 bg-purple-500/20 rounded-xl text-purple-300">
                                    <Key size={24} />
                                </div>
                                <div className="flex-1">
                                    <h3 className="text-lg font-bold text-white mb-1">DeepSeek API Configuration</h3>
                                    <p className="text-xs text-gray-400 mb-4">
                                        Enter your DeepSeek API Key to activate AI features (Deposit Verification, KYC, Risk Engine). 
                                        Get your key from <a href="https://platform.deepseek.com/" target="_blank" className="text-purple-400 hover:underline">DeepSeek Platform</a>.
                                    </p>
                                    
                                    <form onSubmit={handleSaveKey} className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
                                        <div className="relative flex-1 w-full">
                                            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
                                                <Key size={16} />
                                            </div>
                                            <input 
                                                type={showKey ? "text" : "password"}
                                                value={customKey}
                                                onChange={e => setCustomKey(e.target.value)}
                                                className="w-full bg-black/40 border border-white/10 rounded-xl py-3 pl-10 pr-10 text-white text-sm focus:border-purple-500 outline-none font-mono"
                                                placeholder="sk-..."
                                            />
                                            <button 
                                                type="button" 
                                                onClick={() => setShowKey(!showKey)}
                                                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white"
                                            >
                                                {showKey ? <EyeOff size={16}/> : <Eye size={16}/>}
                                            </button>
                                        </div>
                                        
                                        <div className="flex gap-2 w-full sm:w-auto">
                                            <button 
                                                type="submit" 
                                                disabled={validatingKey || !customKey}
                                                className="px-6 py-3 bg-green-600 hover:bg-green-500 text-white rounded-xl text-xs font-bold uppercase transition flex items-center justify-center gap-2 disabled:opacity-50 min-w-[120px]"
                                            >
                                                {validatingKey ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
                                                {validatingKey ? 'Testing...' : 'Connect'}
                                            </button>
                                            
                                            {customKey && (
                                                <button 
                                                    type="button" 
                                                    onClick={handleClearKey}
                                                    className="p-3 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-xl border border-red-500/20 transition"
                                                    title="Remove Key"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            )}
                                        </div>
                                    </form>

                                    {/* Connection Diagnostics */}
                                    {apiKeyStatus === 'connected' && (
                                        <div className="mt-4 flex items-center gap-4 text-[10px] uppercase font-bold text-gray-500 bg-black/20 p-2 rounded-lg inline-flex">
                                            <span className="flex items-center gap-1 text-green-400"><Wifi size={12}/> API Reachable</span>
                                            <span>|</span>
                                            <span>Latency: {latency}ms</span>
                                            <span>|</span>
                                            <span>Model: deepseek-chat</span>
                                        </div>
                                    )}
                                    {apiKeyStatus === 'error' && (
                                        <div className="mt-4 text-[10px] uppercase font-bold text-red-400 bg-red-900/20 p-2 rounded-lg inline-flex items-center gap-2">
                                            <AlertTriangle size={12} /> Connection Error: Verify Key or Quota
                                        </div>
                                    )}
                                </div>
                            </div>
                        </GlassCard>
                    </motion.div>
                )}
            </AnimatePresence>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* LEFT: ACTIVE MODULES LIST */}
                <div className="lg:col-span-2 space-y-4">
                    <h3 className="text-sm font-bold text-white uppercase tracking-widest flex items-center gap-2">
                        <Activity size={16} className="text-purple-500"/> Active Neural Modules
                    </h3>
                    
                    <div className="grid gap-3">
                        {modules.map(module => (
                            <GlassCard key={module.id} className={`transition-all duration-300 ${module.isActive ? 'border-purple-500/30 bg-purple-900/10' : 'border-white/5 opacity-70 grayscale'}`}>
                                <div className="flex flex-col sm:flex-row gap-4 items-center">
                                    {/* Icon & Status */}
                                    <div className="flex items-center gap-4 w-full sm:w-auto">
                                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${module.isActive ? 'bg-purple-500/20 text-purple-300' : 'bg-white/10 text-gray-500'}`}>
                                            <module.icon size={24} />
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-white">{module.name}</h4>
                                            <div className="flex items-center gap-2 text-[10px] uppercase font-bold mt-1">
                                                <span className={`w-2 h-2 rounded-full ${module.isActive ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></span>
                                                <span className={module.isActive ? 'text-green-400' : 'text-gray-500'}>{module.status}</span>
                                                <span className="text-gray-600">• Last: {module.lastActive}</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Description */}
                                    <div className="flex-1 text-xs text-gray-400 leading-relaxed text-center sm:text-left">
                                        {module.description}
                                    </div>

                                    {/* Controls */}
                                    <div className="flex flex-col gap-2 w-full sm:w-auto min-w-[140px]">
                                        {module.id === 'risk_engine' ? (
                                            <button 
                                                onClick={runRiskScan}
                                                disabled={isRiskScanning || !module.isActive}
                                                className="w-full py-2 bg-red-600 hover:bg-red-500 text-white rounded-lg text-xs font-bold uppercase transition flex items-center justify-center gap-2 shadow-lg disabled:opacity-50"
                                            >
                                                {isRiskScanning ? <Loader2 className="animate-spin" size={14}/> : <PlayCircle size={14}/>}
                                                {isRiskScanning ? 'Scanning...' : 'Run Risk Scan'}
                                            </button>
                                        ) : (
                                            <>
                                                <div className="flex items-center justify-between bg-black/30 rounded-lg px-2 py-1">
                                                    <span className="text-[9px] text-gray-500 uppercase font-bold">Confidence</span>
                                                    <span className="text-xs font-bold text-white">{module.confidenceThreshold}%</span>
                                                </div>
                                                <input 
                                                    type="range" 
                                                    min="50" max="100" 
                                                    value={module.confidenceThreshold}
                                                    onChange={(e) => updateThreshold(module.id, parseInt(e.target.value))}
                                                    disabled={!module.isActive}
                                                    className="w-full h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-purple-500"
                                                />
                                            </>
                                        )}
                                        
                                        <button 
                                            onClick={() => toggleModule(module.id)}
                                            className={`flex items-center justify-center gap-2 w-full py-2 rounded-lg text-[10px] font-bold uppercase transition ${module.isActive ? 'bg-white/5 text-gray-400 hover:bg-white/10' : 'bg-green-500/10 text-green-400 hover:bg-green-500/20'}`}
                                        >
                                            {module.isActive ? 'Deactivate' : 'Activate'}
                                        </button>
                                    </div>
                                </div>
                            </GlassCard>
                        ))}
                    </div>
                </div>

                {/* RIGHT: NEURAL CONSOLE */}
                <div className="flex flex-col h-[600px] lg:h-auto">
                    <GlassCard className="flex-1 flex flex-col p-0 overflow-hidden bg-black/40 border-purple-500/20 shadow-2xl relative">
                        {/* Console Header */}
                        <div className="p-3 bg-white/5 border-b border-white/5 flex items-center justify-between">
                            <div className="flex items-center gap-2 text-xs font-mono text-purple-300">
                                <Terminal size={14} />
                                <span>TERMINAL_V1 (DEEPSEEK)</span>
                            </div>
                            <div className="flex gap-1">
                                <div className="w-2 h-2 rounded-full bg-red-500"></div>
                                <div className="w-2 h-2 rounded-full bg-yellow-500"></div>
                                <div className="w-2 h-2 rounded-full bg-green-500"></div>
                            </div>
                        </div>

                        {/* Messages */}
                        <div className="flex-1 overflow-y-auto p-4 space-y-4 font-mono text-xs custom-scrollbar">
                            {messages.map((msg, i) => (
                                <motion.div 
                                    key={i}
                                    initial={{ opacity: 0, x: msg.role === 'user' ? 10 : -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                                >
                                    <div className={`max-w-[85%] p-3 rounded-xl ${msg.role === 'user' ? 'bg-purple-600/20 border border-purple-500/30 text-purple-100 rounded-tr-none' : 'bg-white/5 border border-white/10 text-gray-300 rounded-tl-none'}`}>
                                        {msg.role === 'ai' && <div className="flex items-center gap-1 mb-1 text-[9px] font-bold text-purple-400 uppercase"><Sparkles size={10}/> DeepSeek AI</div>}
                                        <p className="leading-relaxed whitespace-pre-wrap">{msg.text}</p>
                                    </div>
                                </motion.div>
                            ))}
                            {isTyping && (
                                <div className="flex justify-start">
                                    <div className="bg-white/5 border border-white/10 px-4 py-3 rounded-xl rounded-tl-none flex items-center gap-1">
                                        <span className="w-1 h-1 bg-gray-500 rounded-full animate-bounce"></span>
                                        <span className="w-1 h-1 bg-gray-500 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></span>
                                        <span className="w-1 h-1 bg-gray-500 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></span>
                                    </div>
                                </div>
                            )}
                            <div ref={chatEndRef} />
                        </div>

                        {/* Input */}
                        <form onSubmit={handleSendMessage} className="p-3 bg-black/40 border-t border-white/10 flex gap-2">
                            <input 
                                type="text" 
                                value={input}
                                onChange={e => setInput(e.target.value)}
                                placeholder={apiKeyStatus !== 'connected' ? "Setup API Key first..." : "Command System AI..."}
                                disabled={apiKeyStatus !== 'connected'}
                                className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-xs font-mono focus:border-purple-500 outline-none transition disabled:opacity-50 disabled:cursor-not-allowed"
                            />
                            <button 
                                type="submit" 
                                disabled={apiKeyStatus !== 'connected'}
                                className="p-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <Send size={16} />
                            </button>
                        </form>
                    </GlassCard>
                </div>

            </div>
        </div>
    );
};

export default AIAssistant;
