
import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Lock, Mail, LogIn, AlertCircle, Loader2, ScanFace, ArrowRight } from 'lucide-react';
import { supabase } from '../integrations/supabase/client';
import { deriveKeyFromId, decryptData } from '../lib/crypto';
import Logo from '../components/Logo';

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

  // Auto-focus email on load
  useEffect(() => {
    const input = document.getElementById('email-input');
    if (input) input.focus();
  }, []);

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

  return (
    <div className="min-h-screen flex items-center justify-center bg-black p-4 font-sans selection:bg-yellow-500 selection:text-black">
      
      {/* Static Background Pattern - Minimalist */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#111_1px,transparent_1px),linear-gradient(to_bottom,#111_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] opacity-20 pointer-events-none"></div>

      <div className="w-full max-w-md relative z-10">
        
        {/* Header */}
        <div className="text-center mb-8">
            <div className="flex justify-center mb-4">
                <div className="w-12 h-12 bg-black border-2 border-yellow-500 rounded-xl flex items-center justify-center shadow-[0_0_15px_rgba(250,204,21,0.2)]">
                    <span className="text-2xl font-black text-yellow-500">N</span>
                </div>
            </div>
            <h1 className="text-2xl font-black text-white uppercase tracking-tight">Access Terminal</h1>
            <p className="text-gray-500 text-sm font-bold">Secure ID 002</p>
        </div>

        <div className="bg-[#050505] border border-[#222] rounded-2xl p-6 shadow-2xl">
            
            <form onSubmit={handleLogin} className="space-y-5">
              {error && (
                <div className="bg-red-900/20 border border-red-500/50 p-3 rounded-lg flex items-start gap-3 text-red-400 text-sm font-bold">
                  <AlertCircle size={18} className="mt-0.5 shrink-0" />
                  <span className="flex-1">{error}</span>
                </div>
              )}

              <div className="space-y-2">
                <label className="text-xs font-bold uppercase text-gray-500 ml-1">Email</label>
                <div className="relative">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">
                    <Mail size={20} />
                  </div>
                  <input 
                    id="email-input"
                    type="email" 
                    required
                    value={email}
                    onChange={(e) => { setEmail(e.target.value); setError(''); }}
                    className="w-full bg-[#111] border border-[#333] rounded-xl py-4 pl-12 pr-4 text-white placeholder-gray-600 focus:outline-none focus:border-yellow-500 focus:bg-[#000] transition-colors font-medium text-base"
                    placeholder="name@example.com"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-center ml-1">
                  <label className="text-xs font-bold uppercase text-gray-500">Passcode</label>
                </div>
                <div className="relative">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">
                    <Lock size={20} />
                  </div>
                  <input 
                    type="password" 
                    required
                    value={password}
                    onChange={(e) => { setPassword(e.target.value); setError(''); }}
                    className="w-full bg-[#111] border border-[#333] rounded-xl py-4 pl-12 pr-4 text-white placeholder-gray-600 focus:outline-none focus:border-yellow-500 focus:bg-[#000] transition-colors font-medium text-base"
                    placeholder="••••••••"
                  />
                </div>
              </div>

              <button 
                type="submit" 
                disabled={isLoading || isBiometricLoading}
                className="w-full py-4 bg-yellow-500 hover:bg-yellow-400 active:bg-yellow-600 text-black rounded-xl font-black text-sm uppercase tracking-wider shadow-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isLoading ? <Loader2 className="animate-spin" size={20} /> : <><LogIn size={20} /> Authenticate</>}
              </button>
            </form>

            <div className="my-6 flex items-center">
                <div className="flex-1 border-t border-[#222]"></div>
                <span className="px-3 text-[10px] font-bold text-gray-600 uppercase tracking-widest">Quick Access</span>
                <div className="flex-1 border-t border-[#222]"></div>
            </div>

            <button 
                onClick={handleFingerprintLogin}
                disabled={isLoading || isBiometricLoading}
                className="w-full py-3 bg-[#111] border border-[#333] hover:border-[#555] hover:bg-[#1a1a1a] text-white rounded-xl font-bold flex items-center justify-center gap-3 uppercase text-xs tracking-wider transition-colors active:scale-[0.98]"
            >
                {isBiometricLoading ? (
                    <><Loader2 className="animate-spin text-green-500" size={18} /> Verifying...</>
                ) : (
                    <><ScanFace size={20} className="text-green-500" /> Biometric Login</>
                )}
            </button>

            <div className="mt-8 text-center">
              <p className="text-gray-500 text-sm font-bold">
                New User?{' '}
                <Link to="/signup" className="text-white hover:text-yellow-400 underline decoration-2 underline-offset-4 transition inline-flex items-center gap-1">
                  Create ID <ArrowRight size={14} />
                </Link>
              </p>
            </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
