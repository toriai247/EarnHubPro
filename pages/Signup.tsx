
import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Lock, Mail, User, ArrowRight, AlertCircle, Loader2, Ticket, CheckCircle2, Globe } from 'lucide-react';
import { supabase } from '../integrations/supabase/client';
import { createUserProfile } from '../lib/actions';
import { CURRENCY_CONFIG } from '../constants';
import Logo from '../components/Logo';

const MotionDiv = motion.div as any;

const Signup: React.FC = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [referralCode, setReferralCode] = useState('');
  const [currency, setCurrency] = useState('USD');
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
           await createUserProfile(data.user.id, email, name, finalCode, currency);
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
      setError(err.message || 'Registration failed.');
      setIsLoading(false);
    }
  };

  const containerVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: { duration: 0.5, staggerChildren: 0.05 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, x: -10 },
    visible: { opacity: 1, x: 0 }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#050505] relative overflow-hidden font-sans">
       {/* Background FX */}
       <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-electric-500/10 rounded-full blur-[120px] pointer-events-none animate-pulse"></div>
       <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-purple-600/10 rounded-full blur-[120px] pointer-events-none"></div>

      <MotionDiv 
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="w-full max-w-md p-6 relative z-10"
      >
        <div className="bg-surface/80 backdrop-blur-xl border border-white/10 rounded-3xl shadow-2xl overflow-hidden">
          
          <div className="bg-gradient-to-r from-purple-500 to-electric-500 h-1.5"></div>

          <div className="p-8">
            <motion.div variants={itemVariants} className="mb-8 flex flex-col items-start">
              <div className="flex items-center gap-3 mb-2">
                  <h2 className="text-3xl font-display font-black text-white uppercase tracking-tight">Join</h2>
                  <Logo size="md" />
              </div>
              <p className="text-gray-400 text-xs font-bold uppercase tracking-widest">Start your earning journey today.</p>
            </motion.div>

            <form onSubmit={handleSignup} className="space-y-4">
              <AnimatePresence mode="wait">
                {error && (
                  <MotionDiv 
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className={`p-3 rounded-xl border flex items-start gap-3 text-sm font-bold ${error.includes('sent') ? 'bg-green-500/10 border-green-500/30 text-green-400' : 'bg-red-500/10 border-red-500/30 text-red-400'}`}
                  >
                    {error.includes('sent') ? <CheckCircle2 size={18} className="mt-0.5"/> : <AlertCircle size={18} className="mt-0.5 shrink-0" />}
                    <span className="flex-1">{error}</span>
                  </MotionDiv>
                )}
              </AnimatePresence>

              <motion.div variants={itemVariants} className="relative group">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 z-10 text-gray-500 group-focus-within:text-electric-500 transition-colors">
                  <User size={20} />
                </div>
                <input 
                  type="text" 
                  required
                  value={name}
                  onChange={(e) => { setName(e.target.value); setError(''); }}
                  className="w-full bg-black/40 border border-white/10 rounded-xl py-4 pl-12 pr-4 text-white placeholder-gray-600 focus:outline-none focus:border-electric-500 focus:bg-black/60 transition-all font-medium"
                  placeholder="Full Name"
                />
              </motion.div>

              <motion.div variants={itemVariants} className="relative group">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 z-10 text-gray-500 group-focus-within:text-electric-500 transition-colors">
                  <Mail size={20} />
                </div>
                <input 
                  type="email" 
                  required
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); setError(''); }}
                  className="w-full bg-black/40 border border-white/10 rounded-xl py-4 pl-12 pr-4 text-white placeholder-gray-600 focus:outline-none focus:border-electric-500 focus:bg-black/60 transition-all font-medium"
                  placeholder="Email Address"
                />
              </motion.div>

              <motion.div variants={itemVariants} className="relative group">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 z-10 text-gray-500 group-focus-within:text-electric-500 transition-colors">
                  <Lock size={20} />
                </div>
                <input 
                  type="password" 
                  required
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setError(''); }}
                  className="w-full bg-black/40 border border-white/10 rounded-xl py-4 pl-12 pr-4 text-white placeholder-gray-600 focus:outline-none focus:border-electric-500 focus:bg-black/60 transition-all font-medium"
                  placeholder="Password (Min 6 chars)"
                />
              </motion.div>

              <motion.div variants={itemVariants} className="relative group">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 z-10 text-gray-500 group-focus-within:text-electric-500 transition-colors">
                  <Globe size={20} />
                </div>
                <select 
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  className="w-full bg-black/40 border border-white/10 rounded-xl py-4 pl-12 pr-10 text-white focus:outline-none focus:border-electric-500 focus:bg-black/60 transition-all font-medium appearance-none cursor-pointer"
                >
                    {Object.values(CURRENCY_CONFIG).map((c) => (
                        <option key={c.code} value={c.code}>{c.code} - {c.name}</option>
                    ))}
                </select>
                <div className="absolute right-4 top-1/2 -translate-y-1/2 text-2xl pointer-events-none">
                    {CURRENCY_CONFIG[currency as keyof typeof CURRENCY_CONFIG]?.flag}
                </div>
              </motion.div>

              <motion.div variants={itemVariants} className="relative group">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 z-10 text-gray-500 group-focus-within:text-purple-500 transition-colors">
                  <Ticket size={20} />
                </div>
                <input 
                  type="text" 
                  value={referralCode}
                  onChange={(e) => setReferralCode(e.target.value.toUpperCase())}
                  className="w-full bg-black/40 border border-white/10 rounded-xl py-4 pl-12 pr-4 text-white placeholder-gray-600 focus:outline-none focus:border-purple-500 focus:bg-black/60 transition-all font-mono uppercase tracking-wider"
                  placeholder="REF CODE (OPTIONAL)"
                  maxLength={10}
                />
              </motion.div>

              <motion.div variants={itemVariants} className="pt-2">
                <motion.button 
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    type="submit" 
                    disabled={isLoading}
                    className="w-full py-4 bg-gradient-to-r from-electric-600 to-electric-500 text-white rounded-xl font-black flex items-center justify-center gap-2 uppercase tracking-wider shadow-lg shadow-electric-500/20 disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-electric-500/40 transition-all"
                >
                    {isLoading ? <Loader2 className="animate-spin" size={20} /> : <>Create Account <ArrowRight size={20} /></>}
                </motion.button>
              </motion.div>
            </form>

            <motion.div variants={itemVariants} className="mt-8 text-center">
              <p className="text-gray-500 text-sm font-bold">
                Already have ID?{' '}
                <Link to="/login" className="text-white hover:text-electric-400 underline decoration-2 underline-offset-4 transition">
                  Sign In
                </Link>
              </p>
            </motion.div>
          </div>
        </div>
      </MotionDiv>
    </div>
  );
};

export default Signup;
