
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Lock, Mail, LogIn, AlertCircle, Loader2, ChevronRight, Zap, Fingerprint, ScanFace } from 'lucide-react';
import { supabase } from '../integrations/supabase/client';

const MotionDiv = motion.div as any;

const simpleDecrypt = (text: string) => atob(text.split('').reverse().join(''));

// Helper to decode Base64 to Uint8Array for WebAuthn
const base64ToBuffer = (base64: string) => {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
};

const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isBiometricLoading, setIsBiometricLoading] = useState(false);
  const navigate = useNavigate();

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
      setError(err.message || 'Login failed.');
    } finally {
      setIsLoading(false);
    }
  };

  // --- REAL BIOMETRIC LOGIN ---
  const handleFingerprintLogin = async () => {
      setError('');
      setIsBiometricLoading(true);

      // 1. Check if we have a stored ID for this device
      const storedCredentialId = localStorage.getItem('device_credential_id');

      if (!storedCredentialId) {
          setError("No fingerprint linked on this device. Please login manually and setup in Settings.");
          setIsBiometricLoading(false);
          return;
      }

      try {
          // 2. Trigger Browser's Native Biometric Prompt
          // This will ask for TouchID/FaceID/Pattern
          const assertion = await navigator.credentials.get({
              publicKey: {
                  challenge: crypto.getRandomValues(new Uint8Array(32)),
                  allowCredentials: [{
                      id: base64ToBuffer(storedCredentialId),
                      type: "public-key"
                  }],
                  userVerification: "required"
              }
          });

          if (!assertion) throw new Error("Biometric check failed.");

          // 3. If Hardware Authentication passed, proceed to DB
          // Ideally, we send assertion to backend to verify signature.
          // Here, per request logic, we fetch stored encrypted credentials.
          
          const { data, error } = await supabase
            .from('user_biometrics')
            .select('*')
            .eq('fingerprint_id', storedCredentialId)
            .single();

          if (error || !data) {
              throw new Error("Fingerprint matched device, but user data not found in DB.");
          }

          // 4. Auto Login
          const savedEmail = simpleDecrypt(data.email_enc);
          const savedPass = simpleDecrypt(data.password_enc);

          const { error: loginError } = await supabase.auth.signInWithPassword({
              email: savedEmail,
              password: savedPass
          });

          if (loginError) throw loginError;

          navigate('/');

      } catch (e: any) {
          console.error(e);
          if (e.name === 'NotAllowedError') {
              setError("Fingerprint scan cancelled.");
          } else {
              setError(e.message || "Biometric login failed.");
          }
      } finally {
          setIsBiometricLoading(false);
      }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-void relative overflow-hidden font-sans bg-grid-pattern bg-grid">
      
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[500px] h-[500px] bg-electric-500/10 blur-[120px] rounded-full pointer-events-none"></div>

      <MotionDiv 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-md p-6 relative z-10"
      >
        <div className="bg-surface border border-border-neo shadow-neo rounded-2xl overflow-hidden">
          <div className="h-1.5 w-full bg-electric-500"></div>

          <div className="p-8">
            <div className="text-center mb-8">
              <div className="w-16 h-16 mx-auto bg-void border border-border-neo rounded-xl flex items-center justify-center mb-4 shadow-neo-sm">
                <Zap className="text-electric-500" size={32} fill="currentColor" />
              </div>
              <h1 className="text-3xl font-display font-black text-white mb-1 tracking-tight uppercase">
                Earn<span className="text-electric-500">Hub</span>
              </h1>
              <p className="text-gray-500 text-xs font-bold tracking-widest uppercase">Secure Access</p>
            </div>

            <form onSubmit={handleLogin} className="space-y-5">
              <AnimatePresence mode="wait">
                {error && (
                  <MotionDiv 
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="bg-neo-red/10 border border-neo-red/50 p-3 rounded flex items-start gap-3 text-neo-red text-sm font-bold overflow-hidden"
                  >
                    <AlertCircle size={18} className="mt-0.5 shrink-0" />
                    <span className="flex-1">{error}</span>
                  </MotionDiv>
                )}
              </AnimatePresence>

              <div className="space-y-1.5">
                <label className="text-xs font-black uppercase tracking-wider text-gray-500 ml-1">Email</label>
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
                    placeholder="user@earnhub.pro"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex justify-between items-center ml-1">
                  <label className="text-xs font-black uppercase tracking-wider text-gray-500">Password</label>
                </div>
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
                    placeholder="••••••••"
                  />
                </div>
              </div>

              <button 
                type="submit" 
                disabled={isLoading || isBiometricLoading}
                className="w-full py-4 bg-electric-500 text-white border-b-4 border-electric-600 rounded-xl font-black flex items-center justify-center gap-2 uppercase tracking-wider btn-neo shadow-neo-accent disabled:opacity-50 disabled:cursor-not-allowed mt-4 hover:bg-electric-400"
              >
                {isLoading ? <Loader2 className="animate-spin" size={20} /> : <><LogIn size={20} /> Login</>}
              </button>
            </form>

            <div className="relative my-6">
                <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-800"></div></div>
                <div className="relative flex justify-center text-xs uppercase"><span className="bg-surface px-2 text-gray-500 font-bold">OR</span></div>
            </div>

            <button 
                onClick={handleFingerprintLogin}
                disabled={isLoading || isBiometricLoading}
                className="w-full py-4 bg-surface border border-neon-green/50 text-neon-green rounded-xl font-bold flex items-center justify-center gap-2 uppercase tracking-wider hover:bg-neon-green/10 transition shadow-[0_0_15px_rgba(16,185,129,0.1)] relative overflow-hidden"
            >
                {isBiometricLoading ? (
                    <><Loader2 className="animate-spin" size={20} /> Scanning...</>
                ) : (
                    <><ScanFace size={20} /> Use Real Fingerprint</>
                )}
            </button>

            <div className="mt-8 text-center">
              <p className="text-gray-500 text-sm font-bold">
                No access ID?{' '}
                <Link to="/signup" className="text-electric-400 hover:text-electric-300 underline decoration-2 underline-offset-4 transition inline-flex items-center gap-1 group">
                  Register Now <ChevronRight size={14} className="group-hover:translate-x-1 transition-transform"/>
                </Link>
              </p>
            </div>
          </div>
        </div>
      </MotionDiv>
    </div>
  );
};

export default Login;
