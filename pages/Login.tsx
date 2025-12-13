import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Lock, Mail, LogIn, AlertCircle, Loader2, ScanFace, ArrowRight, User, Ticket, Globe, Palette, Check } from 'lucide-react';
import { supabase } from '../integrations/supabase/client';
import { deriveKeyFromId, decryptData } from '../lib/crypto';
import { createUserProfile } from '../lib/actions';
import { CURRENCY_CONFIG } from '../constants';
import { useTheme } from '../context/ThemeContext';
import { motion, AnimatePresence } from 'framer-motion';

// --- THEME OPTIONS (From original Signup) ---
const THEME_OPTIONS = [
    { id: 'midnight', color: '#FACC15', name: 'Midnight', code: '002' },
    { id: 'default', color: '#0055FF', name: 'Classic', code: '001' },
    { id: 'premium', color: '#8D4DFF', name: 'Premium', code: 'PRO' },
    { id: 'terminal', color: '#22C55E', name: 'Terminal', code: 'CMD' },
];

const bufferToBase64 = (buffer: ArrayBuffer) => {
    const binary = String.fromCharCode(...new Uint8Array(buffer));
    return btoa(binary);
};

export interface LoginProps {
    initialMode?: 'login' | 'signup';
}

const Login: React.FC<LoginProps> = ({ initialMode = 'login' }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { setTheme } = useTheme();

  // Mode State
  const [mode, setMode] = useState<'login' | 'signup'>(initialMode);

  // Form Fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  
  // Signup Specific
  const [name, setName] = useState('');
  const [referralCode, setReferralCode] = useState('');
  const [currency, setCurrency] = useState('BDT');
  const [selectedTheme, setSelectedTheme] = useState('midnight');

  // UI States
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isBiometricLoading, setIsBiometricLoading] = useState(false);

  useEffect(() => {
      // Sync prop changes if routing changes
      setMode(initialMode);
  }, [initialMode]);

  useEffect(() => {
    // Check URL params for referral
    const searchParams = new URLSearchParams(location.search);
    const refParam = searchParams.get('ref');
    if (refParam) {
      setReferralCode(refParam.toUpperCase());
      setMode('signup'); // Auto switch to signup if ref present
    }
  }, [location]);

  // Theme Preview Logic
  const handleThemeSelect = (themeId: string) => {
      setSelectedTheme(themeId);
      setTheme(themeId as any);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
        if (mode === 'login') {
            const { error: authError } = await supabase.auth.signInWithPassword({
                email,
                password,
            });
            if (authError) throw authError;
            navigate('/');
        } else {
            // SIGNUP LOGIC
            if (name.trim().length < 2) throw new Error('Please enter a valid full name.');
            if (password.length < 6) throw new Error('Password must be at least 6 characters.');

            const { data, error: authError } = await supabase.auth.signUp({
                email,
                password,
                options: { data: { full_name: name, currency: currency } },
            });

            if (authError) throw authError;

            if (data.user) {
                const finalCode = referralCode.trim().toUpperCase();
                try {
                   await createUserProfile(data.user.id, email, name, finalCode, currency, selectedTheme);
                   localStorage.setItem('eh_theme_id', selectedTheme);
                   navigate('/', { state: { isNewUser: true } });
                } catch (dbError: any) {
                   console.error("DB Init Error:", dbError);
                   navigate('/', { state: { isNewUser: true } }); 
                }
            } else {
                setError('Confirmation email sent. Please check your inbox.');
            }
        }
    } catch (err: any) {
        setError(err.message || 'Authentication failed.');
    } finally {
        setIsLoading(false);
    }
  };

  const handleBiometricLogin = async () => {
      setError('');
      setIsBiometricLoading(true);
      try {
          const credential = await navigator.credentials.get({
              publicKey: {
                  challenge: crypto.getRandomValues(new Uint8Array(32)),
                  rpId: window.location.hostname,
                  userVerification: "required"
              }
          }) as PublicKeyCredential;

          if (!credential) throw new Error("No credential received.");

          const rawId = bufferToBase64(credential.rawId);
          const { data, error } = await supabase.rpc('fetch_biometric_credentials', { p_credential_id: rawId });

          if (error || !data?.email_enc) throw new Error("Passkey not found. Please login manually.");

          const aesKey = await deriveKeyFromId(rawId);
          const savedEmail = await decryptData(data.email_enc, aesKey);
          const savedPass = await decryptData(data.password_enc, aesKey);

          const { error: loginError } = await supabase.auth.signInWithPassword({
              email: savedEmail,
              password: savedPass
          });

          if (loginError) throw loginError;
          navigate('/');

      } catch (e: any) {
          if (e.name !== 'NotAllowedError') setError(e.message || "Biometric login failed.");
      } finally {
          setIsBiometricLoading(false);
      }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-black p-4 font-sans selection:bg-yellow-500 selection:text-black relative overflow-hidden">
      
      {/* Dynamic Background */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#111_1px,transparent_1px),linear-gradient(to_bottom,#111_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] opacity-20 pointer-events-none"></div>
      
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md relative z-10"
      >
        
        {/* Header */}
        <div className="text-center mb-8">
            <div className="flex justify-center mb-4">
                <div className="w-14 h-14 bg-black border-2 border-yellow-500 rounded-2xl flex items-center justify-center shadow-[0_0_20px_rgba(250,204,21,0.2)]">
                    <span className="text-3xl font-black text-yellow-500">N</span>
                </div>
            </div>
            <h1 className="text-3xl font-black text-white uppercase tracking-tighter">Access Terminal</h1>
            <p className="text-gray-500 text-xs font-bold uppercase tracking-widest mt-1">Secure Identity Gateway</p>
        </div>

        <div className="bg-[#050505] border border-[#222] rounded-3xl p-1 shadow-2xl relative overflow-hidden">
            
            {/* --- SLIDER TOGGLE --- */}
            <div className="bg-[#111] rounded-2xl p-1 flex relative mb-2">
                <div 
                    className={`absolute top-1 bottom-1 w-[calc(50%-4px)] bg-[#222] border border-[#333] rounded-xl shadow-lg transition-all duration-300 ease-spring ${mode === 'signup' ? 'left-[calc(50%+2px)]' : 'left-1'}`}
                ></div>
                <button 
                    onClick={() => setMode('login')}
                    className={`flex-1 relative z-10 py-3 text-xs font-bold uppercase tracking-wider text-center transition-colors ${mode === 'login' ? 'text-white' : 'text-gray-500 hover:text-gray-300'}`}
                >
                    Login
                </button>
                <button 
                    onClick={() => setMode('signup')}
                    className={`flex-1 relative z-10 py-3 text-xs font-bold uppercase tracking-wider text-center transition-colors ${mode === 'signup' ? 'text-white' : 'text-gray-500 hover:text-gray-300'}`}
                >
                    Register
                </button>
            </div>

            <div className="p-6">
                <form onSubmit={handleSubmit} className="space-y-4">
                    
                    {error && (
                        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="bg-red-900/10 border border-red-500/20 p-3 rounded-xl flex items-start gap-3 text-red-400 text-xs font-bold">
                            <AlertCircle size={16} className="mt-0.5 shrink-0" />
                            <span>{error}</span>
                        </motion.div>
                    )}

                    {/* SIGNUP FIELDS */}
                    <AnimatePresence>
                        {mode === 'signup' && (
                            <motion.div 
                                initial={{ opacity: 0, height: 0 }} 
                                animate={{ opacity: 1, height: 'auto' }} 
                                exit={{ opacity: 0, height: 0 }}
                                className="space-y-4 overflow-hidden"
                            >
                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold uppercase text-gray-500 ml-1">Identity Name</label>
                                    <div className="relative">
                                        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500"><User size={18} /></div>
                                        <input 
                                            type="text" 
                                            required={mode === 'signup'}
                                            value={name}
                                            onChange={(e) => setName(e.target.value)}
                                            className="w-full bg-[#111] border border-[#222] rounded-xl py-3 pl-10 pr-4 text-white placeholder-gray-600 focus:border-yellow-500 focus:bg-black transition-colors font-medium text-sm outline-none"
                                            placeholder="John Doe"
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-bold uppercase text-gray-500 ml-1">Currency</label>
                                        <div className="relative">
                                            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500"><Globe size={14} /></div>
                                            <select 
                                                value={currency}
                                                onChange={(e) => setCurrency(e.target.value)}
                                                className="w-full bg-[#111] border border-[#222] rounded-xl py-3 pl-8 pr-2 text-white text-xs font-bold outline-none appearance-none cursor-pointer focus:border-yellow-500"
                                            >
                                                {Object.values(CURRENCY_CONFIG).map((c: any) => (
                                                    <option key={c.code} value={c.code}>{c.code}</option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-bold uppercase text-gray-500 ml-1">Referral</label>
                                        <div className="relative">
                                            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500"><Ticket size={14} /></div>
                                            <input 
                                                type="text" 
                                                value={referralCode}
                                                onChange={(e) => setReferralCode(e.target.value.toUpperCase())}
                                                className="w-full bg-[#111] border border-[#222] rounded-xl py-3 pl-8 pr-2 text-white placeholder-gray-600 focus:border-purple-500 focus:bg-black transition-colors font-mono uppercase text-xs outline-none"
                                                placeholder="OPTIONAL"
                                                maxLength={10}
                                            />
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* COMMON FIELDS */}
                    <div className="space-y-1">
                        <label className="text-[10px] font-bold uppercase text-gray-500 ml-1">Email</label>
                        <div className="relative">
                            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500"><Mail size={18} /></div>
                            <input 
                                type="email" 
                                required
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full bg-[#111] border border-[#222] rounded-xl py-3 pl-10 pr-4 text-white placeholder-gray-600 focus:border-blue-500 focus:bg-black transition-colors font-medium text-sm outline-none"
                                placeholder="name@example.com"
                            />
                        </div>
                    </div>

                    <div className="space-y-1">
                        <div className="flex justify-between items-center ml-1">
                            <label className="text-[10px] font-bold uppercase text-gray-500">Password</label>
                        </div>
                        <div className="relative">
                            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500"><Lock size={18} /></div>
                            <input 
                                type="password" 
                                required
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full bg-[#111] border border-[#222] rounded-xl py-3 pl-10 pr-4 text-white placeholder-gray-600 focus:border-blue-500 focus:bg-black transition-colors font-medium text-sm outline-none"
                                placeholder="••••••••"
                            />
                        </div>
                    </div>

                    {/* THEME SELECTOR (SIGNUP ONLY) */}
                    <AnimatePresence>
                        {mode === 'signup' && (
                            <motion.div 
                                initial={{ opacity: 0, height: 0 }} 
                                animate={{ opacity: 1, height: 'auto' }} 
                                exit={{ opacity: 0, height: 0 }}
                                className="pt-2 overflow-hidden"
                            >
                                <label className="text-[10px] font-bold uppercase text-gray-500 ml-1 flex items-center gap-1 mb-2">
                                    <Palette size={10} /> Interface Theme
                                </label>
                                <div className="grid grid-cols-4 gap-2">
                                    {THEME_OPTIONS.map(theme => (
                                        <div 
                                            key={theme.id}
                                            onClick={() => handleThemeSelect(theme.id)}
                                            className={`cursor-pointer rounded-lg border p-1.5 transition-all flex flex-col items-center gap-1 ${selectedTheme === theme.id ? 'border-white bg-white/10' : 'border-[#222] bg-[#111] hover:border-gray-600'}`}
                                        >
                                            <div className="w-4 h-4 rounded-full relative flex items-center justify-center" style={{ backgroundColor: theme.color }}>
                                                {selectedTheme === theme.id && <Check size={8} className="text-black font-bold"/>}
                                            </div>
                                            <span className="text-[8px] text-gray-400 font-bold uppercase">{theme.name}</span>
                                        </div>
                                    ))}
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* SUBMIT BUTTON */}
                    <button 
                        type="submit" 
                        disabled={isLoading || isBiometricLoading}
                        className="w-full py-4 bg-white text-black hover:bg-gray-200 rounded-xl font-black text-xs uppercase tracking-wider shadow-lg transition-all flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-[0.98] mt-2"
                    >
                        {isLoading ? <Loader2 className="animate-spin" size={18} /> : (
                            mode === 'login' ? <><LogIn size={18} /> Authenticate</> : <>Initialize ID <ArrowRight size={18} /></>
                        )}
                    </button>
                </form>

                {/* FOOTER ACTIONS */}
                <div className="mt-6 space-y-4">
                    {mode === 'login' && (
                        <div className="text-center">
                            <Link to="/forgot-password" className="text-xs font-bold text-gray-500 hover:text-white transition underline decoration-2 underline-offset-4">
                                Forgot Password?
                            </Link>
                        </div>
                    )}
                    
                    <div className="flex items-center gap-3">
                        <div className="h-px bg-[#222] flex-1"></div>
                        <span className="text-[10px] font-bold text-gray-600 uppercase">Quick Access</span>
                        <div className="h-px bg-[#222] flex-1"></div>
                    </div>

                    <button 
                        onClick={handleBiometricLogin}
                        disabled={isLoading || isBiometricLoading}
                        className="w-full py-3 bg-[#111] border border-[#222] hover:border-[#444] hover:bg-[#1a1a1a] text-white rounded-xl font-bold flex items-center justify-center gap-3 uppercase text-[10px] tracking-wider transition-colors active:scale-[0.98]"
                    >
                        {isBiometricLoading ? (
                            <><Loader2 className="animate-spin text-green-500" size={16} /> Scanning...</>
                        ) : (
                            <><ScanFace size={18} className="text-green-500" /> Biometric Login</>
                        )}
                    </button>
                </div>
            </div>
        </div>

      </motion.div>
    </div>
  );
};

export default Login;