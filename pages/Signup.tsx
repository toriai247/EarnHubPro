
import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Lock, Mail, User, ArrowRight, AlertCircle, Loader2, Ticket, CheckCircle2, Zap } from 'lucide-react';
import { supabase } from '../integrations/supabase/client';
import { createUserProfile } from '../lib/actions';

const MotionDiv = motion.div as any;

const Signup: React.FC = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [referralCode, setReferralCode] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const refParam = searchParams.get('ref');
    if (refParam) {
      setReferralCode(refParam.toUpperCase());
    }
  }, [location]);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (name.trim().length < 2) { setError('Please enter a valid full name.'); return; }
    if (password.length < 6) { setError('Password must be at least 6 characters long.'); return; }

    setIsLoading(true);

    try {
      const { data, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { full_name: name } },
      });

      if (authError) throw authError;

      if (data.user) {
        const finalCode = referralCode.trim().toUpperCase();
        try {
           await createUserProfile(data.user.id, email, name, finalCode);
           navigate('/');
        } catch (dbError: any) {
           console.error("DB Init Error:", dbError);
           if (dbError.message.includes('Recursion') || dbError.message.includes('Policy')) {
               setError('Database Configuration Error.');
               setIsLoading(false);
               return;
           }
           navigate('/'); 
        }
      } else {
        setError('Confirmation email sent. Please check your inbox.');
        setIsLoading(false);
      }

    } catch (err: any) {
      setError(err.message || 'Registration failed.');
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-void relative overflow-hidden font-sans bg-grid-pattern bg-grid">
       {/* Animated Background */}
       <div className="absolute bottom-[10%] left-[10%] w-[400px] h-[400px] bg-electric-500/10 rounded-full blur-[100px] pointer-events-none"></div>

      <MotionDiv 
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, type: 'spring' }}
        className="w-full max-w-md p-6 relative z-10"
      >
        <div className="bg-surface border border-border-neo rounded-2xl shadow-neo overflow-hidden">
          
          {/* Top Accent Line */}
          <div className="h-1.5 w-full bg-gradient-to-r from-electric-500 to-electric-400"></div>

          <div className="px-8 pt-10 pb-8">
            <div className="mb-8">
              <h2 className="text-3xl font-display font-black text-white mb-2 uppercase tracking-tight flex items-center gap-2">
                Join <span className="text-electric-500">Us</span>
              </h2>
              <p className="text-gray-500 text-xs font-bold uppercase tracking-widest">Start your earning journey today.</p>
            </div>

            <form onSubmit={handleSignup} className="space-y-4">
              <AnimatePresence mode="wait">
                {error && (
                  <MotionDiv 
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className={`p-3 rounded border flex items-start gap-3 text-sm font-bold overflow-hidden ${error.includes('sent') ? 'bg-neo-green/10 border-neo-green text-neo-green' : 'bg-neo-red/10 border-neo-red text-neo-red'}`}
                  >
                    {error.includes('sent') ? <CheckCircle2 size={18} className="mt-0.5"/> : <AlertCircle size={18} className="mt-0.5 shrink-0" />}
                    <span className="flex-1">{error}</span>
                  </MotionDiv>
                )}
              </AnimatePresence>

              {/* Name Field */}
              <div className="relative group">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 z-10 text-gray-500 group-focus-within:text-electric-500 transition-colors">
                  <User size={20} />
                </div>
                <input 
                  type="text" 
                  required
                  value={name}
                  onChange={(e) => { setName(e.target.value); setError(''); }}
                  className="w-full bg-void border border-border-neo rounded-xl py-4 pl-12 pr-4 text-white placeholder-gray-700 focus:outline-none focus:border-electric-500 focus:shadow-[4px_4px_0px_0px_#0066FF] transition-all font-medium"
                  placeholder="Full Name"
                />
              </div>

              {/* Email Field */}
              <div className="relative group">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 z-10 text-gray-500 group-focus-within:text-electric-500 transition-colors">
                  <Mail size={20} />
                </div>
                <input 
                  type="email" 
                  required
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); setError(''); }}
                  className="w-full bg-void border border-border-neo rounded-xl py-4 pl-12 pr-4 text-white placeholder-gray-700 focus:outline-none focus:border-electric-500 focus:shadow-[4px_4px_0px_0px_#0066FF] transition-all font-medium"
                  placeholder="Email Address"
                />
              </div>

              {/* Password Field */}
              <div className="relative group">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 z-10 text-gray-500 group-focus-within:text-electric-500 transition-colors">
                  <Lock size={20} />
                </div>
                <input 
                  type="password" 
                  required
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setError(''); }}
                  className="w-full bg-void border border-border-neo rounded-xl py-4 pl-12 pr-4 text-white placeholder-gray-700 focus:outline-none focus:border-electric-500 focus:shadow-[4px_4px_0px_0px_#0066FF] transition-all font-medium"
                  placeholder="Password (Min 6 chars)"
                />
              </div>

              {/* Referral Field */}
              <div className="relative group">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 z-10 text-gray-500 group-focus-within:text-purple-500 transition-colors">
                  <Ticket size={20} />
                </div>
                <input 
                  type="text" 
                  value={referralCode}
                  onChange={(e) => setReferralCode(e.target.value.toUpperCase())}
                  className="w-full bg-void border border-border-neo rounded-xl py-4 pl-12 pr-4 text-white placeholder-gray-700 focus:outline-none font-mono uppercase tracking-widest transition-all focus:border-purple-500 focus:shadow-[4px_4px_0px_0px_#a855f7]"
                  placeholder="REF CODE (OPTIONAL)"
                  maxLength={10}
                />
              </div>

              <div className="pt-4">
                <button 
                    type="submit" 
                    disabled={isLoading}
                    className="w-full py-4 bg-electric-500 text-white border-b-4 border-electric-600 rounded-xl font-black flex items-center justify-center gap-2 uppercase tracking-wider btn-neo shadow-neo-accent disabled:opacity-50 disabled:cursor-not-allowed hover:bg-electric-400"
                >
                    {isLoading ? <Loader2 className="animate-spin" size={20} /> : <>Create Account <ArrowRight size={20} /></>}
                </button>
              </div>
            </form>

            <div className="mt-8 text-center">
              <p className="text-gray-500 text-sm font-bold">
                Already have ID?{' '}
                <Link to="/login" className="text-electric-400 hover:text-electric-300 underline decoration-2 underline-offset-4 transition">
                  Sign In
                </Link>
              </p>
            </div>
          </div>
        </div>
      </MotionDiv>
    </div>
  );
};

export default Signup;