
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Lock, Mail, LogIn, AlertCircle, Loader2, ChevronRight, Zap, ScanFace } from 'lucide-react';
import { supabase } from '../integrations/supabase/client';
import { deriveKeyFromId, decryptData } from '../lib/crypto';

const MotionDiv = motion.div as any;

// Helper to convert ArrayBuffer to Base64 for lookup
const bufferToBase64 = (buffer: ArrayBuffer) => {
    const binary = String.fromCharCode(...new Uint8Array(buffer));
    return btoa(binary);
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

  const handleFingerprintLogin = async () => {
      setError('');
      setIsBiometricLoading(true);

      try {
          // 1. Request Discoverable Credential (Usernameless Flow)
          // The browser will pop up asking for fingerprint/faceid
          // It will check if any passkey matches this domain (earnhub pro)
          const credential = await navigator.credentials.get({
              publicKey: {
                  challenge: crypto.getRandomValues(new Uint8Array(32)),
                  rpId: window.location.hostname, // Important for domain matching
                  userVerification: "required"
              }
          }) as PublicKeyCredential;

          if (!credential) throw new Error("No credential received from device.");

          // 2. Get the Credential ID found by the browser
          const rawId = bufferToBase64(credential.rawId);
          console.log("Device Credential ID:", rawId);

          // 3. Lookup this ID in our centralized Database using SECURE RPC
          // We cannot select directly from table because RLS blocks unauthenticated users.
          const { data, error } = await supabase.rpc('fetch_biometric_credentials', {
              p_credential_id: rawId
          });

          if (error) {
              console.error("RPC Error:", error);
              throw new Error("Security check failed. Please login with password.");
          }

          if (!data || !data.email_enc) {
              throw new Error("Passkey not found in system. Please setup biometrics again.");
          }

          // 4. Derive Decryption Key (Deterministic based on ID)
          const aesKey = await deriveKeyFromId(rawId);
          
          // 5. Decrypt Credentials
          const savedEmail = await decryptData(data.email_enc, aesKey);
          const savedPass = await decryptData(data.password_enc, aesKey);

          if (!savedEmail || !savedPass) {
              throw new Error("Decryption failed. Data mismatch.");
          }

          // 6. Perform Auto Login
          const { error: loginError } = await supabase.auth.signInWithPassword({
              email: savedEmail,
              password: savedPass
          });

          if (loginError) throw loginError;

          // Success
          navigate('/');

      } catch (e: any) {
          console.error("Bio Login Error:", e);
          if (e.name === 'NotAllowedError') {
              setError("Login cancelled.");
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
                className="w-full py-4 bg-surface border border-neon-green/50 text-neon-green rounded-xl font-bold flex items-center justify-center gap-2 uppercase tracking-wider hover:bg-neon-green/10 transition shadow-[0_0_15px_rgba(16,185,129,0.1)] relative overflow-hidden active:scale-95"
            >
                {isBiometricLoading ? (
                    <><Loader2 className="animate-spin" size={20} /> Scanning...</>
                ) : (
                    <><ScanFace size={20} /> Scan Fingerprint</>
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
