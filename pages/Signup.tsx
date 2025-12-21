
import React, { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { 
  Lock, Mail, User, ArrowRight, AlertCircle, 
  Loader2, Ticket, CheckCircle2, Globe, Shield, 
  ShieldCheck, Sparkles, Fingerprint, Eye, EyeOff
} from 'lucide-react';
import { supabase } from '../integrations/supabase/client';
import { createUserProfile } from '../lib/actions';
import { CURRENCY_CONFIG } from '../constants';
import { motion, AnimatePresence } from 'framer-motion';

const Signup: React.FC = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [referralCode, setReferralCode] = useState('');
  const [currency, setCurrency] = useState('BDT');
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

  // --- PASSWORD STRENGTH LOGIC ---
  const passwordStrength = useMemo(() => {
    if (!password) return 0;
    let strength = 0;
    if (password.length >= 6) strength += 1;
    if (password.length >= 10) strength += 1;
    if (/[0-9]/.test(password)) strength += 1;
    if (/[^A-Za-z0-9]/.test(password)) strength += 1;
    return strength;
  }, [password]);

  const strengthColor = [
    'bg-gray-800',
    'bg-red-500',
    'bg-orange-500',
    'bg-yellow-500',
    'bg-green-500 shadow-[0_0_10px_#22c55e]'
  ][passwordStrength];

  const strengthLabel = [
    'Too Short',
    'Weak',
    'Fair',
    'Good',
    'Elite'
  ][passwordStrength];

  const validateEmail = (email: string) => {
    return String(email)
      .toLowerCase()
      .match(
        /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/
      );
  };

  const handleGoogleSignup = async () => {
    setError('');
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin
      }
    });
    if (error) setError(error.message);
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (name.trim().length < 2) {
      setError('Identity required. Please enter your full name.');
      return;
    }
    if (!validateEmail(email)) {
      setError('Invalid communications link. Please check your email format.');
      return;
    }
    if (password.length < 6) {
      setError('Security breach risk. Password must be at least 6 characters.');
      return;
    }

    setIsLoading(true);

    try {
      const { data, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: { 
            data: { 
                full_name: name,
                currency: currency 
            } 
        },
      });

      if (authError) throw authError;

      if (data.user) {
        const finalCode = referralCode.trim().toUpperCase();
        try {
           await createUserProfile(data.user.id, email, name, finalCode, currency, 'midnight');
           navigate('/', { state: { isNewUser: true } });
        } catch (dbError: any) {
           console.error("Database protocol failure:", dbError);
           navigate('/', { state: { isNewUser: true } }); 
        }
      } else {
        setError('Verification protocol initiated. Please check your email inbox.');
        setIsLoading(false);
      }

    } catch (err: any) {
      setError(err.message || 'Identity initialization failed. Please try again.');
      setIsLoading(false);
    }
  };

  const handleRefChange = (val: string) => {
    // Alphanumeric Masking: Remove non-alphanumeric, max 8 chars, all caps
    const masked = val.replace(/[^a-zA-Z0-9]/g, '').substring(0, 8).toUpperCase();
    setReferralCode(masked);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-black p-4 font-sans selection:bg-brand selection:text-black relative overflow-hidden">
      
      {/* --- AMBIENT BACKGROUND --- */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#111_1px,transparent_1px),linear-gradient(to_bottom,#111_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] opacity-20 pointer-events-none"></div>
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-brand to-transparent opacity-50"></div>
      <div className="absolute -top-24 -left-24 w-96 h-96 bg-brand/5 rounded-full blur-[120px] pointer-events-none"></div>

      <motion.div 
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-lg relative z-10"
      >
        
        {/* --- HEADER --- */}
        <div className="text-center mb-6">
            <motion.div 
                initial={{ rotate: -10 }}
                animate={{ rotate: 0 }}
                className="flex justify-center mb-4"
            >
                <div className="w-14 h-14 bg-black border-2 border-brand rounded-2xl flex items-center justify-center shadow-[0_0_30px_rgba(250,204,21,0.2)] group relative overflow-hidden">
                    <Fingerprint size={28} className="text-brand group-hover:scale-110 transition-transform" />
                    <div className="absolute inset-0 bg-brand/10 animate-pulse"></div>
                </div>
            </motion.div>
            <h1 className="text-2xl font-black text-white uppercase tracking-tighter">Identity Genesis</h1>
            <p className="text-gray-500 text-[10px] font-black uppercase tracking-[0.2em] mt-2">Initialize Secure Node Access</p>
        </div>

        {/* --- MAIN FORM CARD --- */}
        <div className="bg-[#050505] border border-white/5 rounded-[2.5rem] p-8 shadow-2xl relative overflow-hidden ring-1 ring-white/[0.03]">
          
          <form onSubmit={handleSignup} className="space-y-6">
            
            <AnimatePresence mode="wait">
                {error && (
                    <motion.div 
                        initial={{ opacity: 0, y: -10 }} 
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className={`p-4 rounded-2xl border flex items-start gap-3 text-xs font-bold leading-relaxed ${error.includes('Verification') ? 'bg-green-500/10 border-green-500/20 text-green-400' : 'bg-red-500/10 border-red-500/20 text-red-400'}`}
                    >
                        {error.includes('Verification') ? <CheckCircle2 size={16} className="shrink-0" /> : <AlertCircle size={16} className="shrink-0" />}
                        <span>{error}</span>
                    </motion.div>
                )}
            </AnimatePresence>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Field: Name */}
                <div className="space-y-2">
                    <label className="text-[9px] font-black uppercase text-gray-500 ml-1 tracking-widest">Protocol Name</label>
                    <div className="relative group">
                        <User className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-600 group-focus-within:text-brand transition-colors" size={16} />
                        <input 
                            type="text" 
                            required
                            value={name}
                            onChange={(e) => { setName(e.target.value); if(error) setError(''); }}
                            className="w-full bg-[#0a0a0a] border border-white/10 rounded-2xl py-3.5 pl-11 pr-4 text-white placeholder-gray-800 focus:outline-none focus:border-brand/40 transition-all font-medium text-sm shadow-inner"
                            placeholder="Full Name"
                        />
                    </div>
                </div>

                {/* Field: Email */}
                <div className="space-y-2">
                    <label className="text-[9px] font-black uppercase text-gray-500 ml-1 tracking-widest">Secure Email</label>
                    <div className="relative group">
                        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-600 group-focus-within:text-brand transition-colors" size={16} />
                        <input 
                            type="email" 
                            required
                            value={email}
                            onChange={(e) => { setEmail(e.target.value); if(error) setError(''); }}
                            className="w-full bg-[#0a0a0a] border border-white/10 rounded-2xl py-3.5 pl-11 pr-4 text-white placeholder-gray-800 focus:outline-none focus:border-brand/40 transition-all font-medium text-sm shadow-inner"
                            placeholder="Comms Link"
                        />
                    </div>
                </div>
            </div>

            {/* Field: Password */}
            <div className="space-y-2">
                <label className="text-[9px] font-black uppercase text-gray-500 ml-1 tracking-widest">Master Key (Password)</label>
                <div className="relative group">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-600 group-focus-within:text-brand transition-colors" size={16} />
                    <input 
                        type={showPassword ? "text" : "password"} 
                        required
                        value={password}
                        onChange={(e) => { setPassword(e.target.value); if(error) setError(''); }}
                        className="w-full bg-[#0a0a0a] border border-white/10 rounded-2xl py-3.5 pl-11 pr-12 text-white placeholder-gray-800 focus:outline-none focus:border-brand/40 transition-all font-medium text-sm shadow-inner"
                        placeholder="••••••••"
                    />
                    <button 
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-600 hover:text-white transition-colors"
                    >
                        {showPassword ? <EyeOff size={16}/> : <Eye size={16}/>}
                    </button>
                </div>
                
                {/* STRENGTH INDICATOR */}
                <div className="px-1 space-y-1.5">
                    <div className="flex justify-between items-center text-[8px] font-black uppercase tracking-widest">
                        <span className="text-gray-600">Entropy Level</span>
                        <span className={password ? (passwordStrength > 2 ? 'text-green-500' : 'text-red-500') : 'text-gray-700'}>
                            {password ? strengthLabel : 'PENDING'}
                        </span>
                    </div>
                    <div className="flex gap-1 h-1">
                        {[1, 2, 3, 4].map((i) => (
                            <div 
                                key={i} 
                                className={`flex-1 rounded-full transition-all duration-500 ${i <= passwordStrength ? strengthColor : 'bg-gray-800/40'}`}
                            />
                        ))}
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
                {/* Field: Currency */}
                <div className="space-y-2">
                    <label className="text-[9px] font-black uppercase text-gray-500 ml-1 tracking-widest">Currency</label>
                    <div className="relative group">
                        <Globe className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-600 group-focus-within:text-brand transition-colors" size={16} />
                        <select 
                            value={currency}
                            onChange={(e) => setCurrency(e.target.value)}
                            className="w-full bg-[#0a0a0a] border border-white/10 rounded-2xl py-3.5 pl-11 pr-8 text-white focus:outline-none focus:border-brand/40 transition-all font-bold text-xs appearance-none cursor-pointer shadow-inner"
                        >
                            {Object.values(CURRENCY_CONFIG).map((c) => (
                                <option key={c.code} value={c.code}>{c.code} ({c.symbol})</option>
                            ))}
                        </select>
                        <div className="absolute right-4 top-1/2 -translate-y-1/2 text-xs pointer-events-none opacity-40">
                            {CURRENCY_CONFIG[currency as keyof typeof CURRENCY_CONFIG]?.flag}
                        </div>
                    </div>
                </div>

                {/* Field: Referral (with Masking) */}
                <div className="space-y-2">
                    <label className="text-[9px] font-black uppercase text-gray-500 ml-1 tracking-widest">Referral ID</label>
                    <div className="relative group">
                        <Ticket className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-600 group-focus-within:text-brand transition-colors" size={16} />
                        <input 
                            type="text" 
                            value={referralCode}
                            onChange={(e) => handleRefChange(e.target.value)}
                            className={`w-full bg-[#0a0a0a] border rounded-2xl py-3.5 pl-11 pr-4 text-white placeholder-gray-800 focus:outline-none transition-all font-mono uppercase text-xs tracking-[0.2em] shadow-inner ${referralCode.length >= 6 ? 'border-brand/40' : 'border-white/10 focus:border-brand/40'}`}
                            placeholder="OPTIONAL"
                        />
                        {referralCode.length >= 6 && (
                            <div className="absolute right-4 top-1/2 -translate-y-1/2 text-brand">
                                <ShieldCheck size={14}/>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <div className="pt-2">
                <button 
                    type="submit" 
                    disabled={isLoading}
                    className="w-full py-4 bg-brand text-black hover:bg-white active:scale-[0.98] rounded-2xl font-black text-xs uppercase tracking-[0.3em] shadow-[0_10px_30px_rgba(250,204,21,0.15)] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3"
                >
                    {isLoading ? (
                        <><Loader2 className="animate-spin" size={18} /> SYNCING...</>
                    ) : (
                        <>COMPLETE ENROLLMENT <ArrowRight size={18} strokeWidth={3} /></>
                    )}
                </button>
            </div>
          </form>

          <div className="mt-8 pt-6 border-t border-white/5 text-center">
            <p className="text-gray-500 text-[9px] font-bold uppercase tracking-widest">
              Legacy Account Found?{' '}
              <Link to="/login" className="text-white hover:text-brand underline decoration-brand/30 underline-offset-4 transition-all">
                Authenticate Base
              </Link>
            </p>
          </div>
        </div>
        
        <div className="mt-6 flex justify-center gap-6 grayscale opacity-40">
            <button onClick={handleGoogleSignup} className="flex items-center gap-2 hover:grayscale-0 hover:opacity-100 transition-all">
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
                    <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                <span className="text-[10px] font-black uppercase tracking-widest">Google Auth</span>
            </button>
        </div>
      </motion.div>
    </div>
  );
};

export default Signup;
