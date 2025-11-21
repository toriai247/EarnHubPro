
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Lock, Mail, LogIn, AlertCircle, Loader2, X, ChevronRight, Shield } from 'lucide-react';
import { supabase } from '../integrations/supabase/client';

const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);
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
    <div className="min-h-screen flex items-center justify-center bg-dark-950 relative overflow-hidden font-sans selection:bg-neon-green selection:text-black">
      
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-royal-600/20 rounded-full blur-[120px] animate-pulse-slow"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-neon-green/10 rounded-full blur-[120px] animate-pulse-slow" style={{ animationDelay: '2s' }}></div>
        <div className="absolute top-[40%] left-[40%] w-[30%] h-[30%] bg-purple-600/10 rounded-full blur-[100px] animate-pulse-slow" style={{ animationDelay: '4s' }}></div>
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 30, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: 'spring', damping: 20, stiffness: 100 }}
        className="w-full max-w-md p-6 relative z-10"
      >
        <div className="bg-dark-900/40 backdrop-blur-2xl border border-white/10 rounded-3xl shadow-[0_0_40px_rgba(0,0,0,0.5)] overflow-hidden relative">
          
          {/* Decorative Top Bar */}
          <div className="h-1 w-full bg-gradient-to-r from-royal-600 via-neon-green to-royal-600"></div>

          <div className="p-8">
            {/* Header */}
            <div className="text-center mb-8">
              <motion.div 
                initial={{ scale: 0 }} animate={{ scale: 1 }} 
                transition={{ type: 'spring', stiffness: 200, damping: 15, delay: 0.2 }}
                className="w-16 h-16 mx-auto bg-gradient-to-br from-white/10 to-white/5 border border-white/10 rounded-2xl flex items-center justify-center mb-4 shadow-lg group hover:border-neon-green/50 transition duration-500"
              >
                <div className="text-2xl font-display font-bold bg-clip-text text-transparent bg-gradient-to-tr from-royal-400 to-neon-green group-hover:scale-110 transition transform">
                  E
                </div>
              </motion.div>
              <h1 className="text-3xl font-display font-bold text-white mb-2 tracking-tight">Welcome Back</h1>
              <p className="text-gray-400 text-sm">Access your secure earning dashboard.</p>
            </div>

            <form onSubmit={handleLogin} className="space-y-5">
              <AnimatePresence mode="wait">
                {error && (
                  <motion.div 
                    initial={{ opacity: 0, height: 0, y: -10 }}
                    animate={{ opacity: 1, height: 'auto', y: 0 }}
                    exit={{ opacity: 0, height: 0, y: -10 }}
                    className="bg-red-500/10 border border-red-500/20 p-3 rounded-xl flex items-start gap-3 text-red-400 text-sm overflow-hidden"
                  >
                    <AlertCircle size={18} className="mt-0.5 shrink-0" />
                    <span className="flex-1 font-medium">{error}</span>
                    <button type="button" onClick={() => setError('')}><X size={16} className="opacity-50 hover:opacity-100" /></button>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Email Input */}
              <div className="space-y-1.5">
                <label className={`text-xs font-bold uppercase tracking-wider ml-1 transition-colors duration-300 ${focusedField === 'email' ? 'text-neon-green' : 'text-gray-500'}`}>
                  Email Address
                </label>
                <div className="relative group">
                  <div className={`absolute inset-0 bg-gradient-to-r from-royal-500 to-neon-green rounded-xl opacity-0 transition duration-300 -z-10 blur-[2px] ${focusedField === 'email' ? 'opacity-50' : ''}`}></div>
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 transition-colors duration-300 z-10 pointer-events-none">
                    <Mail size={20} className={focusedField === 'email' ? 'text-neon-green' : 'text-gray-500'} />
                  </div>
                  <input 
                    type="email" 
                    required
                    value={email}
                    onFocus={() => setFocusedField('email')}
                    onBlur={() => setFocusedField(null)}
                    onChange={(e) => { setEmail(e.target.value); setError(''); }}
                    className="w-full bg-dark-950/80 border border-white/10 rounded-xl py-4 pl-12 pr-4 text-white placeholder-gray-700 focus:border-transparent focus:ring-0 transition outline-none relative z-0"
                    placeholder="name@example.com"
                  />
                </div>
              </div>

              {/* Password Input */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-center ml-1">
                  <label className={`text-xs font-bold uppercase tracking-wider transition-colors duration-300 ${focusedField === 'password' ? 'text-neon-green' : 'text-gray-500'}`}>
                    Password
                  </label>
                  <a href="#" className="text-[10px] text-gray-500 hover:text-white transition">Forgot?</a>
                </div>
                <div className="relative group">
                  <div className={`absolute inset-0 bg-gradient-to-r from-royal-500 to-neon-green rounded-xl opacity-0 transition duration-300 -z-10 blur-[2px] ${focusedField === 'password' ? 'opacity-50' : ''}`}></div>
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 transition-colors duration-300 z-10 pointer-events-none">
                    <Lock size={20} className={focusedField === 'password' ? 'text-neon-green' : 'text-gray-500'} />
                  </div>
                  <input 
                    type="password" 
                    required
                    value={password}
                    onFocus={() => setFocusedField('password')}
                    onBlur={() => setFocusedField(null)}
                    onChange={(e) => { setPassword(e.target.value); setError(''); }}
                    className="w-full bg-dark-950/80 border border-white/10 rounded-xl py-4 pl-12 pr-4 text-white placeholder-gray-700 focus:border-transparent focus:ring-0 transition outline-none relative z-0"
                    placeholder="••••••••"
                  />
                </div>
              </div>

              <motion.button 
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                type="submit" 
                disabled={isLoading}
                className="w-full py-4 bg-gradient-to-r from-neon-green to-emerald-500 text-dark-950 font-bold rounded-xl shadow-[0_0_20px_rgba(16,185,129,0.3)] hover:shadow-[0_0_30px_rgba(16,185,129,0.5)] transition-all flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed relative overflow-hidden group"
              >
                <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div>
                <span className="relative z-10 flex items-center gap-2">
                  {isLoading ? <Loader2 className="animate-spin" size={20} /> : <><LogIn size={20} /> Login Now</>}
                </span>
              </motion.button>
            </form>

            {/* Footer */}
            <div className="mt-8 pt-6 border-t border-white/5 text-center">
              <p className="text-gray-400 text-sm">
                New here?{' '}
                <Link to="/signup" className="text-white font-bold hover:text-neon-green transition inline-flex items-center gap-1 group">
                  Create Account <ChevronRight size={14} className="group-hover:translate-x-1 transition-transform"/>
                </Link>
              </p>
            </div>
          </div>
        </div>
        
        {/* Trust Badge */}
        <div className="mt-6 flex justify-center items-center gap-2 text-xs text-gray-600">
          <Shield size={12} /> 
          <span>Secure 256-bit Encrypted Connection</span>
        </div>
      </motion.div>
    </div>
  );
};

export default Login;
