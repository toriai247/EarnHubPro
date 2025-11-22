import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Lock, Mail, User, ArrowRight, AlertCircle, Loader2, X, Ticket, CheckCircle2, Database } from 'lucide-react';
import { supabase } from '../integrations/supabase/client';
import { createUserProfile } from '../lib/actions';

const MotionDiv = motion.div as any;
const MotionButton = motion.button as any;
const MotionH2 = motion.h2 as any;
const MotionP = motion.p as any;

const Signup: React.FC = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [referralCode, setReferralCode] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);
  
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // Extract referral code from URL query parameter
    const searchParams = new URLSearchParams(location.search);
    const refParam = searchParams.get('ref');
    if (refParam) {
      setReferralCode(refParam.toUpperCase());
    }
  }, [location]);

  const getFriendlyErrorMessage = (errorMsg: string) => {
    const msg = errorMsg.toLowerCase();

    if (msg.includes('recursion') || msg.includes('policy') || msg.includes('42p17')) {
      return 'Database Configuration Error. Please run the "Fix Infinite Recursion" SQL script in Supabase.';
    }
    if (msg.includes('user already registered') || msg.includes('unique constraint')) {
      return 'This email is already associated with an account. Please sign in instead.';
    }
    if (msg.includes('password') && msg.includes('character')) {
      return 'Password is too short. Please use at least 6 characters.';
    }
    if (msg.includes('validation failed') || msg.includes('valid email')) {
      return 'Please enter a valid email address.';
    }
    if (msg.includes('too many requests') || msg.includes('rate limit')) {
      return 'Too many sign-up attempts. Please wait a few minutes before trying again.';
    }
    if (msg.includes('network') || msg.includes('fetch') || msg.includes('connection')) {
      return 'Network error. Please check your internet connection.';
    }

    // Return capitalized message or default
    return errorMsg ? (errorMsg.charAt(0).toUpperCase() + errorMsg.slice(1)) : 'Registration failed. Please try again.';
  };

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
        const finalCode = referralCode.trim().toUpperCase();
        try {
           await createUserProfile(data.user.id, email, name, finalCode);
           navigate('/');
        } catch (dbError: any) {
           console.error("DB Init Error:", dbError);
           // Show specific policy error if it happens
           if (dbError.message.includes('Recursion') || dbError.message.includes('Policy')) {
               setError(getFriendlyErrorMessage(dbError.message));
               setIsLoading(false);
               return;
           }
           // Otherwise navigate home to let recovery logic handle it
           navigate('/'); 
        }
      } else {
        setError('Confirmation email sent. Please check your inbox.');
        setIsLoading(false);
      }

    } catch (err: any) {
      console.error('Signup Error:', err);
      setError(getFriendlyErrorMessage(err.message));
      setIsLoading(false);
    }
  };

  const inputVariants = {
    focus: { scale: 1.02, transition: { duration: 0.2 } },
    blur: { scale: 1, transition: { duration: 0.2 } }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-dark-950 relative overflow-hidden font-sans">
       {/* Animated Background */}
       <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[10%] right-[10%] w-[40%] h-[40%] bg-purple-600/20 rounded-full blur-[100px] animate-pulse-slow"></div>
        <div className="absolute bottom-[10%] left-[10%] w-[40%] h-[40%] bg-royal-600/20 rounded-full blur-[100px] animate-pulse-slow" style={{ animationDelay: '1.5s' }}></div>
      </div>

      <MotionDiv 
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, type: 'spring' }}
        className="w-full max-w-md p-6 relative z-10"
      >
        <div className="bg-dark-900/60 backdrop-blur-2xl border border-white/10 rounded-[32px] shadow-2xl overflow-hidden">
          
          <div className="px-8 pt-10 pb-8">
            <div className="mb-8">
              <MotionH2 
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 }}
                className="text-3xl font-display font-bold text-white mb-2"
              >
                Create Account
              </MotionH2>
              <MotionP 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4 }}
                className="text-gray-400 text-sm"
              >
                Join the future of earning. It's free.
              </MotionP>
            </div>

            <form onSubmit={handleSignup} className="space-y-4">
              <AnimatePresence mode="wait">
                {error && (
                  <MotionDiv 
                    initial={{ opacity: 0, height: 0, scale: 0.9 }}
                    animate={{ opacity: 1, height: 'auto', scale: 1 }}
                    exit={{ opacity: 0, height: 0, scale: 0.9 }}
                    className={`p-4 rounded-2xl flex items-start gap-3 text-sm overflow-hidden ${error.includes('sent') ? 'bg-green-500/10 border border-green-500/20 text-green-400' : 'bg-red-500/10 border border-red-500/20 text-red-400'}`}
                  >
                    {error.includes('sent') ? <CheckCircle2 size={18} className="mt-0.5"/> : error.includes('Database') ? <Database size={18} className="mt-0.5 shrink-0"/> : <AlertCircle size={18} className="mt-0.5 shrink-0" />}
                    <span className="flex-1 font-medium leading-relaxed">{error}</span>
                    <button type="button" onClick={() => setError('')}><X size={16} className="opacity-50 hover:opacity-100" /></button>
                  </MotionDiv>
                )}
              </AnimatePresence>

              {/* Name Field */}
              <MotionDiv 
                variants={inputVariants} 
                animate={focusedField === 'name' ? 'focus' : 'blur'}
                className="relative group"
              >
                <div className="absolute left-4 top-1/2 -translate-y-1/2 z-10 pointer-events-none transition-colors">
                  <User size={20} className={focusedField === 'name' ? 'text-neon-green' : 'text-gray-500'} />
                </div>
                <input 
                  type="text" 
                  required
                  value={name}
                  onFocus={() => setFocusedField('name')}
                  onBlur={() => setFocusedField(null)}
                  onChange={(e) => { setName(e.target.value); setError(''); }}
                  className={`w-full bg-black/30 border rounded-2xl py-4 pl-12 pr-4 text-white placeholder-gray-600 transition-all outline-none ${focusedField === 'name' ? 'border-neon-green/50 shadow-[0_0_15px_rgba(16,185,129,0.1)]' : 'border-white/10'}`}
                  placeholder="Full Name"
                />
              </MotionDiv>

              {/* Email Field */}
              <MotionDiv 
                variants={inputVariants} 
                animate={focusedField === 'email' ? 'focus' : 'blur'}
                className="relative group"
              >
                <div className="absolute left-4 top-1/2 -translate-y-1/2 z-10 pointer-events-none transition-colors">
                  <Mail size={20} className={focusedField === 'email' ? 'text-neon-green' : 'text-gray-500'} />
                </div>
                <input 
                  type="email" 
                  required
                  value={email}
                  onFocus={() => setFocusedField('email')}
                  onBlur={() => setFocusedField(null)}
                  onChange={(e) => { setEmail(e.target.value); setError(''); }}
                  className={`w-full bg-black/30 border rounded-2xl py-4 pl-12 pr-4 text-white placeholder-gray-600 transition-all outline-none ${focusedField === 'email' ? 'border-neon-green/50 shadow-[0_0_15px_rgba(16,185,129,0.1)]' : 'border-white/10'}`}
                  placeholder="Email Address"
                />
              </MotionDiv>

              {/* Password Field */}
              <MotionDiv 
                variants={inputVariants} 
                animate={focusedField === 'password' ? 'focus' : 'blur'}
                className="relative group"
              >
                <div className="absolute left-4 top-1/2 -translate-y-1/2 z-10 pointer-events-none transition-colors">
                  <Lock size={20} className={focusedField === 'password' ? 'text-neon-green' : 'text-gray-500'} />
                </div>
                <input 
                  type="password" 
                  required
                  value={password}
                  onFocus={() => setFocusedField('password')}
                  onBlur={() => setFocusedField(null)}
                  onChange={(e) => { setPassword(e.target.value); setError(''); }}
                  className={`w-full bg-black/30 border rounded-2xl py-4 pl-12 pr-4 text-white placeholder-gray-600 transition-all outline-none ${focusedField === 'password' ? 'border-neon-green/50 shadow-[0_0_15px_rgba(16,185,129,0.1)]' : 'border-white/10'}`}
                  placeholder="Password (Min 6 chars)"
                />
              </MotionDiv>

              {/* Referral Field */}
              <MotionDiv 
                variants={inputVariants} 
                animate={focusedField === 'ref' ? 'focus' : 'blur'}
                className="relative group"
              >
                <div className="absolute left-4 top-1/2 -translate-y-1/2 z-10 pointer-events-none transition-colors">
                  <Ticket size={20} className={focusedField === 'ref' ? 'text-purple-400' : 'text-gray-500'} />
                </div>
                <input 
                  type="text" 
                  value={referralCode}
                  onFocus={() => setFocusedField('ref')}
                  onBlur={() => setFocusedField(null)}
                  onChange={(e) => setReferralCode(e.target.value.toUpperCase())}
                  className={`w-full bg-black/30 border rounded-2xl py-4 pl-12 pr-4 text-white placeholder-gray-600 transition-all outline-none font-mono uppercase tracking-widest ${focusedField === 'ref' ? 'border-purple-500/50 shadow-[0_0_15px_rgba(168,85,247,0.1)]' : 'border-white/10'}`}
                  placeholder="REF CODE (OPTIONAL)"
                  maxLength={10}
                />
              </MotionDiv>

              <div className="pt-4">
                <MotionButton 
                    whileHover={{ scale: 1.02, backgroundColor: '#34d399', color: '#000' }}
                    whileTap={{ scale: 0.98 }}
                    type="submit" 
                    disabled={isLoading}
                    className="w-full py-4 bg-white text-black font-bold rounded-2xl shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                >
                    {isLoading ? <Loader2 className="animate-spin" size={20} /> : <>Create Account <ArrowRight size={20} /></>}
                </MotionButton>
              </div>
            </form>

            <div className="mt-8 text-center">
              <p className="text-gray-500 text-sm">
                Already have an account?{' '}
                <Link to="/login" className="text-white font-bold hover:underline decoration-neon-green decoration-2 underline-offset-4 transition">
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