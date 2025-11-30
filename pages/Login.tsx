
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Lock, Mail, LogIn, AlertCircle, Loader2, ChevronRight, Zap, ScanFace, ArrowRight } from 'lucide-react';
import { supabase } from '../integrations/supabase/client';
import { deriveKeyFromId, decryptData } from '../lib/crypto';
import Logo from '../components/Logo';

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
          const credential = await navigator.credentials.get({
              publicKey: {
                  challenge: crypto.getRandomValues(new Uint8Array(32)),
                  rpId: window.location.hostname,
                  userVerification: "required"
              }
          }) as PublicKeyCredential;

          if (!credential) throw new Error("No credential received from device.");

          const rawId = bufferToBase64(credential.rawId);
          
          const { data, error } = await supabase.rpc('fetch_biometric_credentials', {
              p_credential_id: rawId
          });

          if (error) throw new Error("Security check failed. Please login with password.");
          if (!data || !data.email_enc) throw new Error("Passkey not found.");

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
          if (e.name === 'NotAllowedError') setError("Login cancelled.");
          else setError(e.message || "Biometric login failed.");
      } finally {
          setIsBiometricLoading(false);
      }
  };

  const containerVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: { 
        duration: 0.5,
        staggerChildren: 0.1 
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, x: -10 },
    visible: { opacity: 1, x: 0 }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#050505] relative overflow-hidden font-sans">
      
      {/* Animated Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] bg-electric-500/20 blur-[120px] rounded-full animate-float"></div>
          <div className="absolute bottom-[-20%] right-[-10%] w-[500px] h-[500px] bg-purple-600/10 blur-[100px] rounded-full animate-float" style={{ animationDelay: '2s' }}></div>
          <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-20"></div>
      </div>

      <MotionDiv 
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="w-full max-w-md p-6 relative z-10"
      >
        <div className="bg-surface/80 backdrop-blur-xl border border-white/10 shadow-2xl rounded-3xl overflow-hidden">
          
          {/* Header */}
          <div className="bg-gradient-to-r from-electric-600 to-electric-400 p-1"></div>
          
          <div className="p-8">
            <motion.div variants={itemVariants} className="text-center mb-8 flex flex-col items-center">
              <Logo size="xl" className="mb-4" />
              <p className="text-gray-400 text-xs font-bold tracking-[0.2em] uppercase mt-2">Secure Gateway</p>
            </motion.div>

            <form onSubmit={handleLogin} className="space-y-5">
              <AnimatePresence mode="wait">
                {error && (
                  <MotionDiv 
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="bg-red-500/10 border border-red-500/50 p-3 rounded-xl flex items-start gap-3 text-red-400 text-sm font-bold"
                  >
                    <AlertCircle size={18} className="mt-0.5 shrink-0" />
                    <span className="flex-1">{error}</span>
                  </MotionDiv>
                )}
              </AnimatePresence>

              <motion.div variants={itemVariants} className="space-y-1.5">
                <label className="text-xs font-bold uppercase text-gray-500 ml-1">Email Access</label>
                <div className="relative group">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 z-10 text-gray-500 group-focus-within:text-electric-500 transition-colors">
                    <Mail size={20} />
                  </div>
                  <input 
                    type="email" 
                    required
                    value={email}
                    onChange={(e) => { setEmail(e.target.value); setError(''); }}
                    className="w-full bg-black/40 border border-white/10 rounded-xl py-4 pl-12 pr-4 text-white placeholder-gray-600 focus:outline-none focus:border-electric-500 focus:bg-black/60 transition-all font-medium"
                    placeholder="name@example.com"
                  />
                </div>
              </motion.div>

              <motion.div variants={itemVariants} className="space-y-1.5">
                <div className="flex justify-between items-center ml-1">
                  <label className="text-xs font-bold uppercase text-gray-500">Passcode</label>
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
                    className="w-full bg-black/40 border border-white/10 rounded-xl py-4 pl-12 pr-4 text-white placeholder-gray-600 focus:outline-none focus:border-electric-500 focus:bg-black/60 transition-all font-medium"
                    placeholder="••••••••"
                  />
                </div>
              </motion.div>

              <motion.button 
                variants={itemVariants}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                type="submit" 
                disabled={isLoading || isBiometricLoading}
                className="w-full py-4 bg-electric-600 hover:bg-electric-500 text-white rounded-xl font-black flex items-center justify-center gap-2 uppercase tracking-wider shadow-lg shadow-electric-500/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed mt-2"
              >
                {isLoading ? <Loader2 className="animate-spin" size={20} /> : <><LogIn size={20} /> Authenticate</>}
              </motion.button>
            </form>

            <motion.div variants={itemVariants} className="relative my-8">
                <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-white/10"></div></div>
                <div className="relative flex justify-center text-[10px] font-bold tracking-widest uppercase"><span className="bg-[#111] px-3 text-gray-500">Quick Access</span></div>
            </motion.div>

            <motion.button 
                variants={itemVariants}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleFingerprintLogin}
                disabled={isLoading || isBiometricLoading}
                className="w-full py-3 bg-white/5 border border-white/10 text-white rounded-xl font-bold flex items-center justify-center gap-3 uppercase tracking-wider hover:bg-white/10 hover:border-white/20 transition-all group"
            >
                {isBiometricLoading ? (
                    <><Loader2 className="animate-spin text-neon-green" size={18} /> Verifying...</>
                ) : (
                    <><ScanFace size={20} className="text-neon-green group-hover:scale-110 transition" /> Biometric Login</>
                )}
            </motion.button>

            <motion.div variants={itemVariants} className="mt-8 text-center">
              <p className="text-gray-500 text-sm font-bold">
                New to Naxxivo?{' '}
                <Link to="/signup" className="text-white hover:text-electric-400 underline decoration-2 underline-offset-4 transition inline-flex items-center gap-1 group">
                  Create ID <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform"/>
                </Link>
              </p>
            </motion.div>
          </div>
        </div>
      </MotionDiv>
    </div>
  );
};

export default Login;
