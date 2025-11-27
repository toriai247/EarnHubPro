
import React, { useState } from 'react';
import { Lock, LifeBuoy, Send, CheckCircle, AlertCircle, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../integrations/supabase/client';
import GlassCard from './GlassCard';

const MaintenanceScreen: React.FC = () => {
    const [showSupport, setShowSupport] = useState(false);
    const [email, setEmail] = useState('');
    const [message, setMessage] = useState('');
    const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!message.trim()) return;
        
        setStatus('submitting');
        try {
            const { data: { session } } = await supabase.auth.getSession();
            const { error } = await supabase.from('help_requests').insert({
                user_id: session?.user?.id, // Optional, can be null if not logged in
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
        <div className="min-h-screen bg-void flex flex-col items-center justify-center p-6 text-center relative overflow-hidden">
            {/* Background Animation */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-red-900/20 via-black to-black animate-pulse"></div>
            
            <motion.div 
                initial={{ opacity: 0, scale: 0.9 }} 
                animate={{ opacity: 1, scale: 1 }}
                className="relative z-10 max-w-md w-full"
            >
                <div className="w-24 h-24 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-6 border border-red-500/30 shadow-[0_0_30px_rgba(239,68,68,0.4)]">
                    <Lock size={48} className="text-red-500" />
                </div>
                
                <h1 className="text-3xl font-black text-white uppercase tracking-tight mb-2">System Offline</h1>
                <p className="text-gray-400 text-sm mb-8 leading-relaxed">
                    We are currently undergoing critical maintenance updates. 
                    <br/>Please check back shortly.
                </p>

                {!showSupport ? (
                    <button 
                        onClick={() => setShowSupport(true)}
                        className="flex items-center justify-center gap-2 mx-auto text-sm font-bold text-gray-500 hover:text-white transition-colors group"
                    >
                        <LifeBuoy size={16} className="group-hover:text-neon-green transition-colors" />
                        Need urgent help?
                    </button>
                ) : (
                    <motion.div 
                        initial={{ opacity: 0, y: 20 }} 
                        animate={{ opacity: 1, y: 0 }}
                        className="mt-6"
                    >
                        <GlassCard className="text-left border-red-500/20 bg-dark-900/90 relative">
                            <button 
                                onClick={() => setShowSupport(false)} 
                                className="absolute top-4 right-4 text-gray-500 hover:text-white"
                            >
                                <X size={18} />
                            </button>
                            
                            <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                                <LifeBuoy size={20} className="text-blue-400" /> Support Request
                            </h3>

                            {status === 'success' ? (
                                <div className="text-center py-8">
                                    <CheckCircle size={40} className="text-green-500 mx-auto mb-2" />
                                    <p className="text-white font-bold">Request Sent!</p>
                                    <p className="text-xs text-gray-500">We'll contact you soon.</p>
                                </div>
                            ) : (
                                <form onSubmit={handleSubmit} className="space-y-4">
                                    <div>
                                        <label className="text-xs font-bold text-gray-500 uppercase block mb-1">Email / Contact</label>
                                        <input 
                                            type="text" 
                                            value={email}
                                            onChange={e => setEmail(e.target.value)}
                                            placeholder="Enter your email"
                                            className="w-full bg-black/40 border border-white/10 rounded-lg p-3 text-white text-sm focus:border-blue-500 outline-none"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-xs font-bold text-gray-500 uppercase block mb-1">Message</label>
                                        <textarea 
                                            value={message}
                                            onChange={e => setMessage(e.target.value)}
                                            placeholder="Describe your issue..."
                                            required
                                            className="w-full bg-black/40 border border-white/10 rounded-lg p-3 text-white text-sm focus:border-blue-500 outline-none h-24 resize-none"
                                        />
                                    </div>
                                    <button 
                                        type="submit" 
                                        disabled={status === 'submitting'}
                                        className="w-full py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-500 transition flex items-center justify-center gap-2"
                                    >
                                        {status === 'submitting' ? 'Sending...' : <><Send size={16} /> Submit Request</>}
                                    </button>
                                    {status === 'error' && (
                                        <p className="text-center text-xs text-red-500 font-bold flex items-center justify-center gap-1">
                                            <AlertCircle size={12} /> Failed to send. Try again.
                                        </p>
                                    )}
                                </form>
                            )}
                        </GlassCard>
                    </motion.div>
                )}
            </motion.div>
            
            <div className="absolute bottom-6 text-[10px] text-gray-600 font-mono">
                SYSTEM ID: EH-PRO-V3 • PROTECTED
            </div>
        </div>
    );
};

export default MaintenanceScreen;
