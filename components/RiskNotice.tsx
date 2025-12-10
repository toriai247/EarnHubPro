
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, ShieldAlert, CheckCircle2, XCircle, Info } from 'lucide-react';
import GlassCard from './GlassCard';

const RiskNotice: React.FC = () => {
    const [isOpen, setIsOpen] = useState(false);

    useEffect(() => {
        // Check if user has agreed this session
        const hasAgreed = sessionStorage.getItem('risk_accepted');
        if (!hasAgreed) {
            // Delay slightly for effect
            setTimeout(() => setIsOpen(true), 1500);
        }
    }, []);

    const handleAccept = () => {
        sessionStorage.setItem('risk_accepted', 'true');
        setIsOpen(false);
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md">
                    <motion.div 
                        initial={{ scale: 0.9, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.9, opacity: 0 }}
                        className="max-w-md w-full"
                    >
                        <GlassCard className="border-red-500/50 bg-[#0f0f0f] shadow-[0_0_50px_rgba(220,38,38,0.3)] relative overflow-hidden">
                            {/* Hazard Stripes */}
                            <div className="absolute top-0 left-0 right-0 h-2 bg-[repeating-linear-gradient(45deg,#ef4444,#ef4444_10px,transparent_10px,transparent_20px)] opacity-50"></div>

                            <div className="text-center pt-6 pb-2">
                                <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-4 border-2 border-red-500 animate-pulse">
                                    <ShieldAlert size={32} className="text-red-500" />
                                </div>
                                <h2 className="text-2xl font-black text-white uppercase tracking-tight mb-2">
                                    Risk Warning
                                </h2>
                                <p className="text-gray-400 text-xs font-bold uppercase tracking-widest">
                                    Read Carefully Before Proceeding
                                </p>
                            </div>

                            <div className="space-y-4 my-6 px-2">
                                <div className="flex gap-3 items-start bg-white/5 p-3 rounded-xl border border-white/5">
                                    <AlertTriangle className="text-yellow-500 shrink-0 mt-0.5" size={16} />
                                    <p className="text-xs text-gray-300 leading-relaxed">
                                        <strong className="text-white block mb-1">Financial Risk & Liability</strong>
                                        Participating in games, betting, or investments involves financial risk. The Admin/Owner is <span className="text-red-400 font-bold">NOT responsible</span> for any financial losses incurred.
                                    </p>
                                </div>

                                <div className="flex gap-3 items-start bg-white/5 p-3 rounded-xl border border-white/5">
                                    <Info className="text-blue-500 shrink-0 mt-0.5" size={16} />
                                    <p className="text-xs text-gray-300 leading-relaxed">
                                        <strong className="text-white block mb-1">Voluntary Participation</strong>
                                        Betting/Gambling may be considered <span className="text-red-400 font-bold">Haram/Prohibited</span> in some jurisdictions. By proceeding, you confirm you are acting on your own free will and moral responsibility.
                                    </p>
                                </div>
                            </div>

                            <div className="flex flex-col gap-3">
                                <button 
                                    onClick={handleAccept}
                                    className="w-full py-3.5 bg-red-600 hover:bg-red-500 text-white font-bold rounded-xl transition flex items-center justify-center gap-2 shadow-lg"
                                >
                                    <CheckCircle2 size={18} /> I Understand & Accept Risks
                                </button>
                                <button 
                                    onClick={() => window.location.href = 'https://google.com'}
                                    className="w-full py-3 bg-white/5 hover:bg-white/10 text-gray-400 text-xs font-bold rounded-xl transition"
                                >
                                    Leave Site
                                </button>
                            </div>
                            
                            <p className="text-[9px] text-center text-gray-600 mt-4 uppercase font-bold">
                                ID: {Math.floor(Math.random() * 100000)} • Session Logged
                            </p>
                        </GlassCard>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};

export default RiskNotice;
