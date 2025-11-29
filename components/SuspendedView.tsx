
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShieldBan, LogOut, Send, Loader2, CheckCircle2, AlertTriangle, FileText } from 'lucide-react';
import GlassCard from './GlassCard';
import { supabase } from '../integrations/supabase/client';
import { useNavigate } from 'react-router-dom';

interface SuspendedViewProps {
    session: any;
}

const SuspendedView: React.FC<SuspendedViewProps> = ({ session }) => {
    const navigate = useNavigate();
    const [appealText, setAppealText] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isSent, setIsSent] = useState(false);
    const [error, setError] = useState('');

    const handleLogout = async () => {
        await supabase.auth.signOut();
        navigate('/login');
    };

    const handleAppeal = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!appealText.trim() || appealText.length < 10) {
            setError("Please provide a detailed explanation (min 10 chars).");
            return;
        }

        setIsSubmitting(true);
        setError('');

        try {
            const { error } = await supabase.from('help_requests').insert({
                user_id: session.user.id,
                email: session.user.email,
                message: `[SUSPENSION APPEAL] ${appealText}`,
                status: 'pending'
            });

            if (error) throw error;

            setIsSent(true);
        } catch (err: any) {
            setError(err.message || "Failed to send appeal. Please try again.");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#050505] flex items-center justify-center p-4 relative overflow-hidden font-sans">
            
            {/* Background FX */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(220,38,38,0.15)_0%,transparent_70%)] pointer-events-none"></div>
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-red-600 via-orange-500 to-red-600 animate-pulse"></div>

            <motion.div 
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="w-full max-w-lg z-10"
            >
                <GlassCard className="border-red-500/30 bg-black/80 backdrop-blur-xl shadow-[0_0_50px_rgba(220,38,38,0.15)] relative overflow-hidden">
                    
                    {/* Header */}
                    <div className="text-center mb-8 relative z-10">
                        <div className="w-24 h-24 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-6 border-2 border-red-500/50 shadow-[0_0_20px_rgba(220,38,38,0.3)] animate-pulse">
                            <ShieldBan size={48} className="text-red-500" />
                        </div>
                        <h1 className="text-3xl font-black text-white uppercase tracking-tight mb-2">Account Suspended</h1>
                        <div className="inline-flex items-center gap-2 bg-red-950/50 border border-red-900/50 px-3 py-1 rounded-full">
                            <AlertTriangle size={12} className="text-red-400" />
                            <span className="text-[10px] font-bold text-red-300 uppercase tracking-widest">Access Revoked</span>
                        </div>
                        <p className="text-gray-400 text-sm mt-4 leading-relaxed max-w-xs mx-auto">
                            Your account has been flagged for a violation of our Terms of Service. All features are currently disabled.
                        </p>
                    </div>

                    {/* Action Area */}
                    <div className="relative z-10">
                        <AnimatePresence mode="wait">
                            {isSent ? (
                                <motion.div 
                                    key="success"
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="bg-green-500/10 border border-green-500/20 rounded-xl p-6 text-center"
                                >
                                    <div className="w-12 h-12 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-3">
                                        <CheckCircle2 size={24} className="text-green-500" />
                                    </div>
                                    <h3 className="text-white font-bold text-lg mb-1">Appeal Received</h3>
                                    <p className="text-gray-400 text-sm">
                                        Our compliance team will review your request within 24-48 hours. Please check your email for updates.
                                    </p>
                                </motion.div>
                            ) : (
                                <motion.form 
                                    key="form"
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    onSubmit={handleAppeal} 
                                    className="space-y-4"
                                >
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-gray-500 uppercase flex items-center gap-2">
                                            <FileText size={12} /> Submit an Appeal
                                        </label>
                                        <textarea 
                                            value={appealText}
                                            onChange={e => setAppealText(e.target.value)}
                                            placeholder="Explain why this might be a mistake or provide context..."
                                            className="w-full bg-black/50 border border-white/10 rounded-xl p-4 text-white text-sm focus:border-red-500 focus:ring-1 focus:ring-red-500 outline-none h-32 resize-none transition-all placeholder:text-gray-600"
                                            disabled={isSubmitting}
                                        />
                                        {error && (
                                            <p className="text-red-400 text-xs font-bold flex items-center gap-1">
                                                <AlertTriangle size={10} /> {error}
                                            </p>
                                        )}
                                    </div>

                                    <button 
                                        type="submit" 
                                        disabled={isSubmitting}
                                        className="w-full py-3.5 bg-white text-black rounded-xl font-bold hover:bg-gray-200 transition flex items-center justify-center gap-2 disabled:opacity-50"
                                    >
                                        {isSubmitting ? <Loader2 className="animate-spin" size={18}/> : <><Send size={18} /> Submit Appeal Request</>}
                                    </button>
                                </motion.form>
                            )}
                        </AnimatePresence>
                    </div>

                    {/* Footer */}
                    <div className="mt-8 pt-6 border-t border-white/5 text-center relative z-10">
                        <button 
                            onClick={handleLogout}
                            className="text-gray-500 hover:text-white transition text-xs font-bold flex items-center justify-center gap-2 mx-auto group"
                        >
                            <LogOut size={14} className="group-hover:-translate-x-1 transition-transform" /> Sign Out & Switch Account
                        </button>
                    </div>

                </GlassCard>
                
                <div className="text-center mt-6 text-[10px] text-gray-600 font-mono uppercase">
                    Security System v5.0 • ID: {session?.user?.id?.slice(0,8)}
                </div>
            </motion.div>
        </div>
    );
};

export default SuspendedView;
