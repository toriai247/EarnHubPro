import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, ArrowLeft, Send, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { supabase } from '../integrations/supabase/client';
import GlassCard from '../components/GlassCard';

const ForgotPassword: React.FC = () => {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setIsLoading(true);
    setStatus('idle');
    setMessage('');

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/#/update-password`,
      });

      if (error) throw error;

      setStatus('success');
      setMessage('Password reset instructions sent to your email.');
    } catch (err: any) {
      setStatus('error');
      setMessage(err.message || 'Failed to send reset link.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-black p-6 font-sans relative overflow-hidden">
      
      {/* Background FX */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,#1e1b4b_0%,#000000_60%)] opacity-60 pointer-events-none"></div>
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-blue-900 to-transparent opacity-50"></div>

      <div className="w-full max-w-md relative z-10">
        <Link to="/login" className="inline-flex items-center gap-2 text-gray-500 hover:text-white transition text-xs font-bold mb-6">
            <ArrowLeft size={14} /> Return to Login
        </Link>

        <GlassCard className="p-8 border-white/10 bg-[#050505] shadow-2xl">
            <div className="text-center mb-8">
                <div className="w-16 h-16 bg-blue-900/20 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-blue-500/30 shadow-[0_0_30px_rgba(59,130,246,0.15)]">
                    <Mail size={32} className="text-blue-500" />
                </div>
                <h1 className="text-2xl font-black text-white uppercase tracking-tight">Recovery Mode</h1>
                <p className="text-gray-500 text-xs mt-2 font-medium">Enter your registered email to reset access.</p>
            </div>

            {status === 'success' ? (
                <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-6 text-center animate-fade-in">
                    <CheckCircle2 size={40} className="text-green-500 mx-auto mb-3" />
                    <h3 className="text-white font-bold mb-1">Link Sent</h3>
                    <p className="text-gray-400 text-xs mb-4">{message}</p>
                    <p className="text-gray-600 text-[10px] uppercase font-bold tracking-wider">Check Spam Folder</p>
                    <button 
                        onClick={() => setStatus('idle')}
                        className="mt-6 text-xs text-blue-400 font-bold hover:underline"
                    >
                        Try another email
                    </button>
                </div>
            ) : (
                <form onSubmit={handleReset} className="space-y-6">
                    {status === 'error' && (
                        <div className="bg-red-500/10 border border-red-500/20 p-3 rounded-lg flex items-start gap-3 text-red-400 text-xs font-bold">
                            <AlertCircle size={16} className="mt-0.5 shrink-0" />
                            <span>{message}</span>
                        </div>
                    )}

                    <div className="space-y-2">
                        <label className="text-[10px] font-bold uppercase text-gray-500 ml-1 tracking-widest">Email Address</label>
                        <div className="relative">
                            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">
                                <Mail size={18} />
                            </div>
                            <input 
                                type="email" 
                                required
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full bg-[#111] border border-[#222] rounded-xl py-4 pl-12 pr-4 text-white placeholder-gray-700 focus:outline-none focus:border-blue-500 focus:bg-black transition-all font-medium text-sm"
                                placeholder="name@example.com"
                            />
                        </div>
                    </div>

                    <button 
                        type="submit" 
                        disabled={isLoading}
                        className="w-full py-4 bg-white text-black hover:bg-gray-200 rounded-xl font-black text-xs uppercase tracking-wider shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-[0.98]"
                    >
                        {isLoading ? <Loader2 className="animate-spin" size={18} /> : <><Send size={18} /> Send Recovery Link</>}
                    </button>
                </form>
            )}
        </GlassCard>
      </div>
    </div>
  );
};

export default ForgotPassword;