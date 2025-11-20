
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Lock, Mail, LogIn, AlertCircle, Loader2, X } from 'lucide-react';
import { supabase } from '../integrations/supabase/client';

const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const getFriendlyErrorMessage = (errorMsg: string) => {
    if (errorMsg.includes('Invalid login credentials')) return 'Incorrect email or password.';
    if (errorMsg.includes('Email not confirmed')) return 'Please verify your email address.';
    if (errorMsg.includes('Too many requests')) return 'Too many attempts. Please try again later.';
    return errorMsg || 'An unexpected error occurred.';
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const { error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) throw authError;
      navigate('/');
    } catch (err: any) {
      setError(getFriendlyErrorMessage(err.message));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-dark-950 p-4 relative overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0">
        <div className="absolute top-10 left-10 w-64 h-64 bg-royal-600/20 rounded-full blur-[100px]"></div>
        <div className="absolute bottom-10 right-10 w-80 h-80 bg-neon-green/10 rounded-full blur-[120px]"></div>
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="bg-dark-900/60 backdrop-blur-xl border border-white/10 p-8 rounded-3xl w-full max-w-md relative z-10 shadow-2xl"
      >
        <div className="text-center mb-8">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-tr from-royal-600 to-neon-green flex items-center justify-center font-bold font-display text-3xl text-white mb-4 shadow-lg shadow-neon-green/20">
            E
          </div>
          <h2 className="text-3xl font-display font-bold text-white">Welcome Back</h2>
          <p className="text-gray-400 mt-2">Enter your credentials to access your vault.</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-5">
          <AnimatePresence mode="wait">
            {error && (
              <motion.div 
                initial={{ opacity: 0, height: 0, marginBottom: 0 }}
                animate={{ opacity: 1, height: 'auto', marginBottom: 20 }}
                exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                className="bg-red-500/10 border border-red-500/20 p-3 rounded-xl flex items-start gap-3 text-red-400 text-sm overflow-hidden"
              >
                <AlertCircle size={18} className="mt-0.5 shrink-0" />
                <span className="flex-1 font-medium">{error}</span>
                <button type="button" onClick={() => setError('')}><X size={16} className="opacity-50 hover:opacity-100" /></button>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-gray-400 uppercase tracking-wider ml-1">Email Address</label>
            <div className="relative group">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-royal-500 transition" size={20} />
              <input 
                type="email" 
                required
                value={email}
                onChange={(e) => { setEmail(e.target.value); setError(''); }}
                className="w-full bg-black/30 border border-white/10 rounded-xl py-3.5 pl-12 pr-4 text-white placeholder-gray-600 focus:border-royal-500 focus:ring-1 focus:ring-royal-500 transition outline-none"
                placeholder="name@example.com"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-gray-400 uppercase tracking-wider ml-1">Password</label>
            <div className="relative group">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-royal-500 transition" size={20} />
              <input 
                type="password" 
                required
                value={password}
                onChange={(e) => { setPassword(e.target.value); setError(''); }}
                className="w-full bg-black/30 border border-white/10 rounded-xl py-3.5 pl-12 pr-4 text-white placeholder-gray-600 focus:border-royal-500 focus:ring-1 focus:ring-royal-500 transition outline-none"
                placeholder="••••••••"
              />
            </div>
          </div>

          <button 
            type="submit" 
            disabled={isLoading}
            className="w-full py-4 bg-gradient-to-r from-royal-600 to-royal-500 hover:from-royal-500 hover:to-royal-400 text-white font-bold rounded-xl shadow-lg shadow-royal-600/30 transition transform active:scale-[0.98] flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {isLoading ? <Loader2 className="animate-spin" size={20} /> : <><LogIn size={20} /> Login to Dashboard</>}
          </button>
        </form>

        <div className="mt-8 text-center">
          <p className="text-gray-400 text-sm">
            Don't have an account?{' '}
            <Link to="/signup" className="text-neon-glow font-bold hover:text-neon-green transition">
              Create Free Account
            </Link>
          </p>
        </div>
      </motion.div>
    </div>
  );
};

export default Login;
