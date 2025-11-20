
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Lock, Mail, User, ArrowRight, AlertCircle, Loader2, X, Ticket } from 'lucide-react';
import { supabase } from '../integrations/supabase/client';
import { createUserProfile } from '../lib/actions';

const Signup: React.FC = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [referralCode, setReferralCode] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (name.trim().length < 2) {
      setError('Please enter a valid full name.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    setIsLoading(true);

    try {
      const { data, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: name },
        },
      });

      if (authError) throw authError;

      if (data.user) {
        // Ensure referral code is trimmed and uppercase
        const finalCode = referralCode.trim().toUpperCase();
        
        try {
           await createUserProfile(data.user.id, email, name, finalCode);
           navigate('/');
        } catch (dbError: any) {
           console.error("DB Init Error:", dbError);
           navigate('/'); 
        }
      } else {
        setError('Confirmation email sent. Please check your inbox.');
        setIsLoading(false);
      }

    } catch (err: any) {
      let msg = err.message || 'Registration failed';
      if (msg.includes("User already registered")) msg = "This email is already registered. Please login.";
      setError(msg);
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-dark-950 p-4 relative overflow-hidden">
       <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0">
        <div className="absolute bottom-20 left-10 w-72 h-72 bg-purple-600/20 rounded-full blur-[100px]"></div>
        <div className="absolute top-10 right-10 w-64 h-64 bg-royal-600/20 rounded-full blur-[100px]"></div>
      </div>

      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="bg-dark-900/60 backdrop-blur-xl border border-white/10 p-8 rounded-3xl w-full max-w-md relative z-10 shadow-2xl"
      >
        <div className="text-center mb-8">
          <h2 className="text-3xl font-display font-bold text-white">Join EarnHub<span className="text-neon-glow">Pro</span></h2>
          <p className="text-gray-400 mt-2">Start earning crypto rewards today.</p>
        </div>

        <form onSubmit={handleSignup} className="space-y-4">
          <AnimatePresence mode="wait">
            {error && (
              <motion.div 
                initial={{ opacity: 0, height: 0, marginBottom: 0 }}
                animate={{ opacity: 1, height: 'auto', marginBottom: 16 }}
                exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                className={`p-3 rounded-xl flex items-start gap-3 text-sm overflow-hidden ${error.includes('sent') ? 'bg-green-500/10 border border-green-500/20 text-green-400' : 'bg-red-500/10 border border-red-500/20 text-red-400'}`}
              >
                <AlertCircle size={18} className="mt-0.5 shrink-0" />
                <span className="flex-1 font-medium">{error}</span>
                <button type="button" onClick={() => setError('')}><X size={16} className="opacity-50 hover:opacity-100" /></button>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-gray-400 uppercase tracking-wider ml-1">Full Name</label>
            <div className="relative group">
              <User className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-neon-green transition" size={20} />
              <input 
                type="text" 
                required
                value={name}
                onChange={(e) => { setName(e.target.value); setError(''); }}
                className="w-full bg-black/30 border border-white/10 rounded-xl py-3.5 pl-12 pr-4 text-white placeholder-gray-600 focus:border-neon-green focus:ring-1 focus:ring-neon-green transition outline-none"
                placeholder="John Doe"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-gray-400 uppercase tracking-wider ml-1">Email Address</label>
            <div className="relative group">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-neon-green transition" size={20} />
              <input 
                type="email" 
                required
                value={email}
                onChange={(e) => { setEmail(e.target.value); setError(''); }}
                className="w-full bg-black/30 border border-white/10 rounded-xl py-3.5 pl-12 pr-4 text-white placeholder-gray-600 focus:border-neon-green focus:ring-1 focus:ring-neon-green transition outline-none"
                placeholder="name@example.com"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-gray-400 uppercase tracking-wider ml-1">Password</label>
            <div className="relative group">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-neon-green transition" size={20} />
              <input 
                type="password" 
                required
                value={password}
                onChange={(e) => { setPassword(e.target.value); setError(''); }}
                className="w-full bg-black/30 border border-white/10 rounded-xl py-3.5 pl-12 pr-4 text-white placeholder-gray-600 focus:border-neon-green focus:ring-1 focus:ring-neon-green transition outline-none"
                placeholder="Min 6 characters"
              />
            </div>
          </div>

           <div className="space-y-1.5">
            <label className="text-xs font-bold text-gray-400 uppercase tracking-wider ml-1 flex items-center gap-1">
                 Referral Code <span className="text-[10px] text-gray-500 lowercase font-normal">(optional)</span>
            </label>
            <div className="relative group">
              <Ticket className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-neon-green transition" size={20} />
              {/* Force UPPERCASE here */}
              <input 
                type="text" 
                value={referralCode}
                onChange={(e) => setReferralCode(e.target.value.toUpperCase())}
                className="w-full bg-black/30 border border-white/10 rounded-xl py-3.5 pl-12 pr-4 text-white placeholder-gray-600 focus:border-neon-green focus:ring-1 focus:ring-neon-green transition outline-none font-mono uppercase tracking-widest"
                placeholder="E.G. EHY35OZY"
                maxLength={10}
              />
            </div>
          </div>

          <div className="pt-2">
            <button 
                type="submit" 
                disabled={isLoading}
                className="w-full py-4 bg-neon-green text-dark-950 font-bold rounded-xl shadow-lg shadow-neon-green/20 hover:bg-emerald-400 transition transform active:scale-[0.98] flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
            >
                {isLoading ? <Loader2 className="animate-spin" size={20} /> : <>Create Account <ArrowRight size={20} /></>}
            </button>
          </div>
        </form>

        <div className="mt-8 text-center">
          <p className="text-gray-400 text-sm">
            Already have an account?{' '}
            <Link to="/login" className="text-royal-400 font-bold hover:text-white transition">
              Sign In
            </Link>
          </p>
        </div>
      </motion.div>
    </div>
  );
};

export default Signup;
