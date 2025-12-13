import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, Save, Loader2, AlertCircle } from 'lucide-react';
import { supabase } from '../integrations/supabase/client';
import GlassCard from '../components/GlassCard';

const UpdatePassword: React.FC = () => {
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  
  useEffect(() => {
    const checkSession = async () => {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
            navigate('/login');
        }
    };
    checkSession();
  }, [navigate]);

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password.length < 6) {
        setError('Password must be at least 6 characters.');
        return;
    }
    if (password !== confirmPassword) {
        setError('Passwords do not match.');
        return;
    }

    setIsLoading(true);

    try {
      const { error: updateError } = await supabase.auth.updateUser({
        password: password
      });

      if (updateError) throw updateError;

      navigate('/', { state: { message: 'Password updated successfully!' } });
    } catch (err: any) {
      setError(err.message || 'Failed to update password.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-black p-6 font-sans relative">
      <div className="w-full max-w-md relative z-10">
        <GlassCard className="p-8 border-white/10 bg-[#050505]">
            <div className="text-center mb-8">
                <div className="w-16 h-16 bg-purple-900/20 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-purple-500/30">
                    <Lock size={32} className="text-purple-500" />
                </div>
                <h1 className="text-2xl font-black text-white uppercase tracking-tight">New Credentials</h1>
                <p className="text-gray-500 text-xs mt-2 font-medium">Set a secure password for your account.</p>
            </div>

            <form onSubmit={handleUpdate} className="space-y-5">
                {error && (
                    <div className="bg-red-500/10 border border-red-500/20 p-3 rounded-lg flex items-start gap-3 text-red-400 text-xs font-bold">
                        <AlertCircle size={16} className="mt-0.5 shrink-0" />
                        <span>{error}</span>
                    </div>
                )}

                <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase text-gray-500 ml-1 tracking-widest">New Password</label>
                    <div className="relative">
                        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">
                            <Lock size={18} />
                        </div>
                        <input 
                            type="password" 
                            required
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full bg-[#111] border border-[#222] rounded-xl py-4 pl-12 pr-4 text-white placeholder-gray-700 focus:outline-none focus:border-purple-500 focus:bg-black transition-colors font-medium text-sm"
                            placeholder="Min 6 chars"
                        />
                    </div>
                </div>

                <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase text-gray-500 ml-1 tracking-widest">Confirm Password</label>
                    <div className="relative">
                        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">
                            <Lock size={18} />
                        </div>
                        <input 
                            type="password" 
                            required
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            className="w-full bg-[#111] border border-[#222] rounded-xl py-4 pl-12 pr-4 text-white placeholder-gray-700 focus:outline-none focus:border-purple-500 focus:bg-black transition-colors font-medium text-sm"
                            placeholder="Repeat password"
                        />
                    </div>
                </div>

                <button 
                    type="submit" 
                    disabled={isLoading}
                    className="w-full py-4 bg-purple-600 text-white hover:bg-purple-500 rounded-xl font-black text-xs uppercase tracking-wider shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-[0.98]"
                >
                    {isLoading ? <Loader2 className="animate-spin" size={18} /> : <><Save size={18} /> Set Password</>}
                </button>
            </form>
        </GlassCard>
      </div>
    </div>
  );
};

export default UpdatePassword;