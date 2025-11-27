
import React, { useState } from 'react';
import GlassCard from '../components/GlassCard';
import { Fingerprint, Lock, Mail, ArrowLeft, CheckCircle, Scan, Smartphone } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../integrations/supabase/client';
import { motion, AnimatePresence } from 'framer-motion';
import { useUI } from '../context/UIContext';
import { deriveKeyFromId, encryptData } from '../lib/crypto';

// Helper to convert ArrayBuffer to Base64 for storage
const bufferToBase64 = (buffer: ArrayBuffer) => {
    const binary = String.fromCharCode(...new Uint8Array(buffer));
    return btoa(binary);
};

const BiometricSetup: React.FC = () => {
  const { toast } = useUI();
  const navigate = useNavigate();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isScanning, setIsScanning] = useState(false);

  // 1. Verify Credentials before setting up
  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    
    if (error) {
        toast.error("Invalid Credentials");
        return;
    }
    if (data.user) {
        // Check if device supports WebAuthn
        if (!window.PublicKeyCredential) {
            toast.error("Your device does not support biometric security.");
            return;
        }
        setStep(2);
    }
  };

  // 2. Real WebAuthn Registration (Passkey Mode)
  const handleRealScan = async () => {
      setIsScanning(true);
      try {
          const { data: { user } } = await supabase.auth.getUser();
          if (!user) throw new Error("Session expired");

          // 1. Trigger Device Biometric Prompt (Create Passkey)
          const credential = await navigator.credentials.create({
              publicKey: {
                  challenge: crypto.getRandomValues(new Uint8Array(32)),
                  rp: { name: "EarnHub Pro" },
                  user: {
                      id: new TextEncoder().encode(user.id),
                      name: email,
                      displayName: email
                  },
                  pubKeyCredParams: [{ alg: -7, type: "public-key" }, { alg: -257, type: "public-key" }],
                  authenticatorSelection: {
                      authenticatorAttachment: "platform", // Forces TouchID/FaceID/Windows Hello
                      requireResidentKey: true, // IMPORTANT: Allows identifying user without username input later
                      userVerification: "required"
                  },
                  timeout: 60000
              }
          }) as PublicKeyCredential;

          if (!credential) throw new Error("Biometric registration failed.");

          // 2. Get the Real Credential ID
          const rawId = bufferToBase64(credential.rawId);
          
          // 3. SAVE ID TO LOCAL STORAGE (For faster login lookup)
          localStorage.setItem('device_credential_id', rawId);
          
          // 4. Derive Encryption Key from Credential ID
          const aesKey = await deriveKeyFromId(rawId);

          // 5. Encrypt Data Securely
          const encEmail = await encryptData(email, aesKey);
          const encPass = await encryptData(password, aesKey);

          // 6. Save to Supabase (Centralized)
          // Clean up old key for this exact credential if it exists
          await supabase.from('user_biometrics').delete().eq('credential_id', rawId);

          const { error } = await supabase.from('user_biometrics').insert({
              user_id: user.id,
              credential_id: rawId, // Public ID for lookup
              email_enc: encEmail,
              password_enc: encPass,
              device_name: navigator.platform || 'Unknown Device'
          });

          if (error) throw error;

          setStep(3);
          toast.success("Passkey Saved! You can now login instantly.");

      } catch (e: any) {
          console.error(e);
          if (e.name === 'NotAllowedError') {
              toast.error("Scan cancelled or timed out.");
          } else {
              toast.error("Error: " + e.message);
          }
      } finally {
          setIsScanning(false);
      }
  };

  return (
    <div className="pb-24 sm:pl-20 sm:pt-6 space-y-6 px-4 sm:px-0">
        <header className="pt-4 flex items-center gap-3">
            <button onClick={() => navigate('/profile')} className="p-2 bg-white/10 rounded-xl hover:bg-white/20 text-white">
                <ArrowLeft size={20} />
            </button>
            <h1 className="text-2xl font-display font-bold text-white flex items-center gap-2">
                <Fingerprint className="text-neon-green" /> Passkey Setup
            </h1>
        </header>

        <div className="max-w-md mx-auto">
            <GlassCard className="min-h-[400px] flex flex-col justify-center relative overflow-hidden">
                
                <AnimatePresence mode="wait">
                    {step === 1 && (
                        <motion.div 
                            key="step1"
                            initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
                            className="space-y-6"
                        >
                            <div className="text-center">
                                <div className="w-16 h-16 bg-blue-500/20 rounded-full flex items-center justify-center mx-auto mb-4 border border-blue-500/30">
                                    <Lock size={32} className="text-blue-400" />
                                </div>
                                <h2 className="text-xl font-bold text-white">Verify Credentials</h2>
                                <p className="text-sm text-gray-400">Enter your login details to create a secure Passkey.</p>
                            </div>

                            <form onSubmit={handleVerify} className="space-y-4">
                                <div>
                                    <label className="text-xs font-bold text-gray-500 uppercase block mb-1">Email</label>
                                    <div className="relative">
                                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
                                        <input 
                                            type="email" 
                                            required 
                                            value={email}
                                            onChange={e => setEmail(e.target.value)}
                                            className="w-full bg-black/30 border border-white/10 rounded-xl py-3 pl-10 pr-4 text-white focus:border-neon-green outline-none"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-gray-500 uppercase block mb-1">Password</label>
                                    <div className="relative">
                                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
                                        <input 
                                            type="password" 
                                            required 
                                            value={password}
                                            onChange={e => setPassword(e.target.value)}
                                            className="w-full bg-black/30 border border-white/10 rounded-xl py-3 pl-10 pr-4 text-white focus:border-neon-green outline-none"
                                        />
                                    </div>
                                </div>
                                <button type="submit" className="w-full py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-500 transition">
                                    Continue
                                </button>
                            </form>
                        </motion.div>
                    )}

                    {step === 2 && (
                        <motion.div 
                            key="step2"
                            initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
                            className="text-center space-y-8"
                        >
                            <h2 className="text-xl font-bold text-white">Register Device</h2>
                            
                            <div className="relative w-32 h-32 mx-auto flex items-center justify-center">
                                <div className={`absolute inset-0 rounded-full border-4 border-neon-green/30 ${isScanning ? 'animate-ping' : ''}`}></div>
                                <div 
                                    className="relative z-10 bg-black/50 p-6 rounded-full border border-neon-green/50 cursor-pointer active:scale-95 transition" 
                                    onClick={handleRealScan}
                                >
                                    <Fingerprint size={48} className={`text-neon-green ${isScanning ? 'animate-pulse' : ''}`} />
                                </div>
                            </div>

                            <div className="bg-white/5 border border-white/10 p-4 rounded-xl text-left">
                                <div className="flex gap-3 mb-2">
                                    <Smartphone className="text-blue-400 shrink-0" size={20} />
                                    <p className="text-sm text-white font-bold">Cloud Sync Ready</p>
                                </div>
                                <p className="text-xs text-gray-400">
                                    Your Passkey will be saved to your device. If you use iCloud or Google Password Manager, it will sync to all your devices automatically.
                                </p>
                            </div>

                            {!isScanning && (
                                <button onClick={handleRealScan} className="w-full py-3 bg-neon-green text-black font-bold rounded-xl hover:bg-emerald-400 transition flex items-center justify-center gap-2">
                                    <Scan size={18} /> Create Passkey
                                </button>
                            )}
                        </motion.div>
                    )}

                    {step === 3 && (
                        <motion.div 
                            key="step3"
                            initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }}
                            className="text-center space-y-6"
                        >
                            <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto border border-green-500/50 shadow-[0_0_30px_rgba(34,197,94,0.4)]">
                                <CheckCircle size={40} className="text-green-500" />
                            </div>
                            
                            <div>
                                <h2 className="text-2xl font-bold text-white mb-2">All Set!</h2>
                                <p className="text-gray-400 text-sm">
                                    You can now log in using just your fingerprint.
                                </p>
                            </div>

                            <button onClick={() => navigate('/profile')} className="w-full py-3 bg-white/10 text-white font-bold rounded-xl hover:bg-white/20 transition">
                                Done
                            </button>
                        </motion.div>
                    )}
                </AnimatePresence>

            </GlassCard>
        </div>
    </div>
  );
};

export default BiometricSetup;
