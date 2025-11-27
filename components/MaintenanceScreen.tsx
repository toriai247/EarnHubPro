
import React, { useState, useEffect, useRef } from 'react';
import { Lock, LifeBuoy, Send, CheckCircle, AlertCircle, X, Terminal, Activity, ShieldAlert, Cpu, Radio, Power } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../integrations/supabase/client';
import GlassCard from './GlassCard';

const SYSTEM_LOGS = [
    "Establishing secure connection...",
    "Verifying system integrity...",
    "Optimizing database shards...",
    "Deploying patch v4.5.2...",
    "Encrypting user data...",
    "Calibrating neural engines...",
    "Flushing redis cache...",
    "Synchronizing nodes...",
    "System cooling active...",
    "Rebooting core services...",
    "Checking biometrics module...",
    "Ping: 14ms [OK]",
    "Packet loss: 0% [OK]",
    "Firewall: Active"
];

const MaintenanceScreen: React.FC = () => {
    const [showSupport, setShowSupport] = useState(false);
    const [email, setEmail] = useState('');
    const [message, setMessage] = useState('');
    const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');
    
    // Animation State
    const [logs, setLogs] = useState<string[]>([]);
    const [progress, setProgress] = useState(0);
    const logEndRef = useRef<HTMLDivElement>(null);

    // Simulate System Activity
    useEffect(() => {
        let logIndex = 0;
        const logInterval = setInterval(() => {
            const randomLog = SYSTEM_LOGS[Math.floor(Math.random() * SYSTEM_LOGS.length)];
            const timestamp = new Date().toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
            setLogs(prev => [...prev.slice(-6), `[${timestamp}] ${randomLog}`]);
            logIndex++;
        }, 1500);

        const progressInterval = setInterval(() => {
            setProgress(prev => {
                const next = prev + Math.random() * 2;
                return next > 99 ? 99 : next; // Never reach 100 fully until real load
            });
        }, 500);

        return () => {
            clearInterval(logInterval);
            clearInterval(progressInterval);
        };
    }, []);

    // Auto-scroll logs
    useEffect(() => {
        logEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [logs]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!message.trim()) return;
        
        setStatus('submitting');
        try {
            const { data: { session } } = await supabase.auth.getSession();
            const { error } = await supabase.from('help_requests').insert({
                user_id: session?.user?.id,
                email: email || session?.user?.email || 'anonymous@user',
                message: message,
                status: 'pending'
            });

            if (error) throw error;
            setStatus('success');
            setTimeout(() => {
                setShowSupport(false);
                setStatus('idle');
                setMessage('');
            }, 3000);
        } catch (e) {
            console.error(e);
            setStatus('error');
        }
    };

    return (
        <div className="min-h-screen bg-black flex flex-col items-center justify-center p-6 relative overflow-hidden font-mono selection:bg-red-500 selection:text-white">
            
            {/* --- BACKGROUND FX --- */}
            {/* Moving Grid */}
            <div className="absolute inset-0 bg-[linear-gradient(to_right,#111_1px,transparent_1px),linear-gradient(to_bottom,#111_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] opacity-20 pointer-events-none"></div>
            
            {/* Red Pulse Vignette */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,rgba(220,38,38,0.15)_100%)] animate-pulse-slow pointer-events-none"></div>
            
            {/* Scanline */}
            <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden">
                <div className="w-full h-1 bg-red-500/20 blur-sm absolute top-0 animate-scanline"></div>
            </div>

            {/* --- MAIN CONTENT --- */}
            <motion.div 
                initial={{ opacity: 0, scale: 0.95 }} 
                animate={{ opacity: 1, scale: 1 }}
                className="relative z-10 w-full max-w-2xl"
            >
                {/* Header Status Bar */}
                <div className="flex justify-between items-center bg-red-950/30 border-x border-t border-red-500/30 p-2 rounded-t-lg backdrop-blur-md">
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-red-500 animate-pulse shadow-[0_0_10px_#ef4444]"></div>
                        <span className="text-[10px] font-bold text-red-400 uppercase tracking-widest">System Lockdown</span>
                    </div>
                    <div className="text-[10px] text-red-500/70 font-mono">ERR_CODE: 503_MAINTENANCE</div>
                </div>

                <GlassCard className="rounded-t-none border-red-500/30 bg-black/80 shadow-[0_0_50px_rgba(220,38,38,0.2)] relative overflow-hidden">
                    
                    {/* Hazard Stripes Top */}
                    <div className="absolute top-0 left-0 right-0 h-1 bg-[repeating-linear-gradient(45deg,#ef4444,#ef4444_10px,transparent_10px,transparent_20px)] opacity-50"></div>

                    <div className="flex flex-col md:flex-row gap-8 p-4">
                        
                        {/* LEFT: STATUS VISUAL */}
                        <div className="flex-1 flex flex-col items-center text-center justify-center">
                            <div className="relative mb-6 group">
                                <div className="absolute inset-0 bg-red-500/20 rounded-full blur-xl animate-pulse"></div>
                                <div className="w-32 h-32 bg-black/50 rounded-full flex items-center justify-center border-4 border-red-500/30 relative z-10 shadow-2xl">
                                    <ShieldAlert size={64} className="text-red-500 drop-shadow-[0_0_15px_rgba(239,68,68,0.8)]" />
                                </div>
                                {/* Rotating Ring */}
                                <div className="absolute inset-0 rounded-full border border-dashed border-red-500/40 w-32 h-32 animate-spin-slow m-auto"></div>
                            </div>

                            <h1 className="text-3xl font-black text-white uppercase tracking-tighter mb-2 glitch-text" data-text="SYSTEM OFFLINE">
                                SYSTEM OFFLINE
                            </h1>
                            <p className="text-gray-400 text-xs max-w-xs leading-relaxed">
                                Critical security updates and performance optimizations are being applied. Access is temporarily restricted.
                            </p>

                            <div className="mt-6 w-full max-w-xs space-y-2">
                                <div className="flex justify-between text-[10px] text-red-400 font-bold uppercase">
                                    <span>Restoration Progress</span>
                                    <span>{progress.toFixed(1)}%</span>
                                </div>
                                <div className="h-1.5 w-full bg-red-950 rounded-full overflow-hidden">
                                    <motion.div 
                                        className="h-full bg-red-600 shadow-[0_0_10px_#dc2626]"
                                        style={{ width: `${progress}%` }}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* RIGHT: TERMINAL & ACTIONS */}
                        <div className="flex-1 flex flex-col gap-4">
                            
                            {/* Terminal Window */}
                            <div className="bg-black border border-white/10 rounded-lg p-4 font-mono text-[10px] h-48 overflow-hidden relative flex flex-col shadow-inner">
                                <div className="flex items-center gap-2 mb-2 pb-2 border-b border-white/5 text-gray-500">
                                    <Terminal size={12} />
                                    <span>root@earnhub-server:~# tail -f sys.log</span>
                                </div>
                                <div className="flex-1 overflow-y-auto space-y-1 custom-scrollbar opacity-80">
                                    {logs.map((log, i) => (
                                        <motion.div 
                                            key={i}
                                            initial={{ opacity: 0, x: -10 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            className="text-green-500/90"
                                        >
                                            <span className="text-gray-600 mr-2">{'>'}</span>{log}
                                        </motion.div>
                                    ))}
                                    <div ref={logEndRef} />
                                </div>
                                {/* Scan line overlay in terminal */}
                                <div className="absolute inset-0 bg-gradient-to-b from-transparent via-green-500/5 to-transparent h-4 animate-scan-vertical pointer-events-none"></div>
                            </div>

                            {/* Status Grid */}
                            <div className="grid grid-cols-2 gap-2">
                                <div className="bg-white/5 border border-white/5 p-2 rounded flex items-center gap-2">
                                    <Cpu size={14} className="text-red-400"/>
                                    <div>
                                        <p className="text-[9px] text-gray-500 uppercase">CPU Load</p>
                                        <p className="text-xs font-bold text-white">12% [IDLE]</p>
                                    </div>
                                </div>
                                <div className="bg-white/5 border border-white/5 p-2 rounded flex items-center gap-2">
                                    <Radio size={14} className="text-yellow-400"/>
                                    <div>
                                        <p className="text-[9px] text-gray-500 uppercase">Gateway</p>
                                        <p className="text-xs font-bold text-white">LOCKED</p>
                                    </div>
                                </div>
                            </div>

                            {/* Action Button */}
                            {!showSupport ? (
                                <button 
                                    onClick={() => setShowSupport(true)}
                                    className="w-full py-3 bg-white/5 hover:bg-white/10 border border-white/10 text-white text-xs font-bold uppercase tracking-wider rounded-lg transition flex items-center justify-center gap-2 group"
                                >
                                    <LifeBuoy size={14} className="text-blue-400 group-hover:scale-110 transition" /> 
                                    Open Emergency Channel
                                </button>
                            ) : null}
                        </div>
                    </div>
                </GlassCard>

                {/* --- SUPPORT MODAL (Inline) --- */}
                <AnimatePresence>
                    {showSupport && (
                        <motion.div 
                            initial={{ opacity: 0, height: 0, marginTop: 0 }} 
                            animate={{ opacity: 1, height: 'auto', marginTop: 16 }}
                            exit={{ opacity: 0, height: 0, marginTop: 0 }}
                            className="overflow-hidden"
                        >
                            <GlassCard className="relative border-blue-500/30 bg-blue-950/20">
                                <button 
                                    onClick={() => setShowSupport(false)} 
                                    className="absolute top-4 right-4 text-gray-400 hover:text-white transition"
                                >
                                    <X size={16} />
                                </button>
                                
                                <div className="flex items-center gap-3 mb-4">
                                    <div className="p-2 bg-blue-500/20 rounded-lg text-blue-400 border border-blue-500/30">
                                        <LifeBuoy size={20} />
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-white text-sm">Emergency Support</h3>
                                        <p className="text-[10px] text-blue-300">Direct line to admin console</p>
                                    </div>
                                </div>

                                {status === 'success' ? (
                                    <div className="text-center py-6 bg-green-500/10 rounded-xl border border-green-500/20">
                                        <CheckCircle size={32} className="text-green-500 mx-auto mb-2" />
                                        <p className="text-white font-bold text-sm">Transmission Received</p>
                                        <p className="text-[10px] text-gray-400">Ticket ID: #{Math.floor(Math.random()*99999)}</p>
                                    </div>
                                ) : (
                                    <form onSubmit={handleSubmit} className="space-y-3">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                            <input 
                                                type="text" 
                                                value={email}
                                                onChange={e => setEmail(e.target.value)}
                                                placeholder="Your Email / ID"
                                                className="w-full bg-black/50 border border-white/10 rounded-lg px-4 py-2.5 text-white text-xs focus:border-blue-500 outline-none"
                                            />
                                            <div className="flex items-center px-4 py-2.5 bg-black/50 border border-white/10 rounded-lg text-xs text-gray-500 cursor-not-allowed">
                                                <Activity size={12} className="mr-2 text-green-500"/> Priority: HIGH
                                            </div>
                                        </div>
                                        <textarea 
                                            value={message}
                                            onChange={e => setMessage(e.target.value)}
                                            placeholder="Describe the critical issue..."
                                            required
                                            className="w-full bg-black/50 border border-white/10 rounded-lg px-4 py-3 text-white text-xs focus:border-blue-500 outline-none h-24 resize-none"
                                        />
                                        <button 
                                            type="submit" 
                                            disabled={status === 'submitting'}
                                            className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg transition flex items-center justify-center gap-2 text-xs uppercase tracking-wider shadow-lg shadow-blue-900/20"
                                        >
                                            {status === 'submitting' ? 'Transmitting...' : <><Send size={14} /> Send Transmission</>}
                                        </button>
                                        
                                        {status === 'error' && (
                                            <div className="flex items-center justify-center gap-2 text-[10px] text-red-400 bg-red-500/10 py-1.5 rounded">
                                                <AlertCircle size={10} /> Transmission Failed. Retrying...
                                            </div>
                                        )}
                                    </form>
                                )}
                            </GlassCard>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Footer Info */}
                <div className="mt-6 flex justify-between items-center text-[9px] text-gray-600 font-mono uppercase">
                    <div className="flex items-center gap-1">
                        <Power size={10} /> Powered by EarnHub Pro
                    </div>
                    <div>
                        Server ID: US-EAST-1A • <span className="text-red-500">OFFLINE</span>
                    </div>
                </div>

            </motion.div>
            
            <style>{`
                @keyframes scan-vertical {
                    0% { top: 0%; opacity: 0; }
                    50% { opacity: 1; }
                    100% { top: 100%; opacity: 0; }
                }
                .animate-scan-vertical {
                    animation: scan-vertical 2s linear infinite;
                }
                @keyframes scanline {
                    0% { transform: translateY(-100%); }
                    100% { transform: translateY(100vh); }
                }
                .animate-scanline {
                    animation: scanline 4s linear infinite;
                }
                .glitch-text {
                    position: relative;
                }
                .glitch-text::before, .glitch-text::after {
                    content: attr(data-text);
                    position: absolute;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                }
                .glitch-text::before {
                    left: 2px;
                    text-shadow: -1px 0 #00ffff;
                    clip-path: inset(0 0 0 0);
                    animation: glitch-anim-1 2s infinite linear alternate-reverse;
                }
                .glitch-text::after {
                    left: -2px;
                    text-shadow: -1px 0 #ff00ff;
                    clip-path: inset(0 0 0 0);
                    animation: glitch-anim-2 3s infinite linear alternate-reverse;
                }
                @keyframes glitch-anim-1 {
                    0% { clip-path: inset(20% 0 80% 0); }
                    20% { clip-path: inset(60% 0 10% 0); }
                    40% { clip-path: inset(40% 0 50% 0); }
                    60% { clip-path: inset(80% 0 5% 0); }
                    80% { clip-path: inset(10% 0 60% 0); }
                    100% { clip-path: inset(30% 0 30% 0); }
                }
                @keyframes glitch-anim-2 {
                    0% { clip-path: inset(10% 0 60% 0); }
                    20% { clip-path: inset(30% 0 20% 0); }
                    40% { clip-path: inset(70% 0 10% 0); }
                    60% { clip-path: inset(20% 0 50% 0); }
                    80% { clip-path: inset(50% 0 30% 0); }
                    100% { clip-path: inset(5% 0 80% 0); }
                }
            `}</style>
        </div>
    );
};

export default MaintenanceScreen;
