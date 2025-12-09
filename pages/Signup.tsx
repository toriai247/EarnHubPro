
import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Lock, Mail, User, ArrowRight, AlertCircle, Loader2, Ticket, CheckCircle2, Globe, Palette, Check } from 'lucide-react';
import { supabase } from '../integrations/supabase/client';
import { createUserProfile } from '../lib/actions';
import { CURRENCY_CONFIG } from '../constants';
import Logo from '../components/Logo';

const THEME_OPTIONS = [
    { id: 'default', color: '#0055FF', name: 'Blue (Default)' },
    { id: 'premium', color: '#8D4DFF', name: 'Premium' },
    { id: 'midnight', color: '#FACC15', name: 'Gold' },
    { id: 'terminal', color: '#22C55E', name: 'Hacker' },
    { id: 'dracula', color: '#bd93f9', name: 'Dracula' },
];

const Signup: React.FC = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [referralCode, setReferralCode] = useState('');
  const [currency, setCurrency] = useState('USD');
  const [selectedTheme, setSelectedTheme] = useState('default');
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
    // Auto-focus name field
    const input = document.getElementById('name-input');
    if (input) input.focus();
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
        options: { data: { full_name: name, currency: currency } },
      });

      if (authError) throw authError;

      if (data.user) {
        const finalCode = referralCode.trim().toUpperCase();
        try {
           // Pass the selectedTheme to the profile creator
           await createUserProfile(data.user.id, email, name, finalCode, currency, selectedTheme);
           
           // Set theme locally immediately for smooth transition
           localStorage.setItem('eh_theme_id', selectedTheme);
           const root = window.document.documentElement;
           root.classList.remove('default', 'premium', 'lite', 'midnight', 'terminal', 'solarized', 'dracula', 'material');
           root.classList.add(selectedTheme);

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

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#050505] p-4 font-sans selection:bg-electric-500 selection:text-white">
       
       {/* Static Background Pattern */}
       <div className="absolute inset-0 bg-[linear-gradient(to_right,#111_1px,transparent_1px),linear-gradient(to_bottom,#111_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] opacity-20 pointer-events-none"></div>

      <div className="w-full max-w-md relative z-10">
        
        {/* Header */}
        <div className="text-center mb-8">
            <div className="flex justify-center items-center gap-3 mb-2">
                <h2 className="text-3xl font-black text-white uppercase tracking-tight">JOIN</h2>
                <Logo size="md" />
            </div>
            <p className="text-gray-500 text-xs font-bold uppercase tracking-widest">Start your earning journey today</p>
        </div>

        <div className="bg-[#111] border border-[#222] rounded-2xl p-6 shadow-2xl relative overflow-hidden">
          
          {/* Top Line Accent */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-purple-500 to-electric-500"></div>

          <form onSubmit={handleSignup} className="space-y-4 mt-2">
            
            {error && (
              <div className={`p-3 rounded-lg border flex items-start gap-3 text-sm font-bold ${error.includes('sent') ? 'bg-green-500/10 border-green-500/30 text-green-400' : 'bg-red-500/10 border-red-500/30 text-red-400'}`}>
                {error.includes('sent') ? <CheckCircle2 size={18} className="mt-0.5"/> : <AlertCircle size={18} className="mt-0.5 shrink-0" />}
                <span className="flex-1">{error}</span>
              </div>
            )}

            <div className="space-y-1">
                <label className="text-xs font-bold uppercase text-gray-500 ml-1">Full Name</label>
                <div className="relative">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">
                    <User size={20} />
                    </div>
                    <input 
                    id="name-input"
                    type="text" 
                    required
                    value={name}
                    onChange={(e) => { setName(e.target.value); setError(''); }}
                    className="w-full bg-black border border-[#333] rounded-xl py-3 pl-12 pr-4 text-white placeholder-gray-600 focus:outline-none focus:border-electric-500 focus:bg-[#0a0a0a] transition-colors font-medium text-base"
                    placeholder="John Doe"
                    />
                </div>
            </div>

            <div className="space-y-1">
                <label className="text-xs font-bold uppercase text-gray-500 ml-1">Email</label>
                <div className="relative">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">
                    <Mail size={20} />
                    </div>
                    <input 
                    type="email" 
                    required
                    value={email}
                    onChange={(e) => { setEmail(e.target.value); setError(''); }}
                    className="w-full bg-black border border-[#333] rounded-xl py-3 pl-12 pr-4 text-white placeholder-gray-600 focus:outline-none focus:border-electric-500 focus:bg-[#0a0a0a] transition-colors font-medium text-base"
                    placeholder="email@address.com"
                    />
                </div>
            </div>

            <div className="space-y-1">
                <label className="text-xs font-bold uppercase text-gray-500 ml-1">Password</label>
                <div className="relative">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">
                    <Lock size={20} />
                    </div>
                    <input 
                    type="password" 
                    required
                    value={password}
                    onChange={(e) => { setPassword(e.target.value); setError(''); }}
                    className="w-full bg-black border border-[#333] rounded-xl py-3 pl-12 pr-4 text-white placeholder-gray-600 focus:outline-none focus:border-electric-500 focus:bg-[#0a0a0a] transition-colors font-medium text-base"
                    placeholder="Min 6 chars"
                    />
                </div>
            </div>

            {/* Currency & Referral */}
            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                    <label className="text-xs font-bold uppercase text-gray-500 ml-1">Currency</label>
                    <div className="relative">
                        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none">
                        <Globe size={18} />
                        </div>
                        <select 
                        value={currency}
                        onChange={(e) => setCurrency(e.target.value)}
                        className="w-full bg-black border border-[#333] rounded-xl py-3 pl-10 pr-8 text-white focus:outline-none focus:border-electric-500 focus:bg-[#0a0a0a] transition-colors font-medium text-sm appearance-none cursor-pointer"
                        >
                            {Object.values(CURRENCY_CONFIG).map((c) => (
                                <option key={c.code} value={c.code}>{c.code}</option>
                            ))}
                        </select>
                        <div className="absolute right-3 top-1/2 -translate-y-1/2 text-lg pointer-events-none">
                            {CURRENCY_CONFIG[currency as keyof typeof CURRENCY_CONFIG]?.flag}
                        </div>
                    </div>
                </div>

                <div className="space-y-1">
                    <label className="text-xs font-bold uppercase text-gray-500 ml-1">Referral</label>
                    <div className="relative">
                        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">
                        <Ticket size={18} />
                        </div>
                        <input 
                        type="text" 
                        value={referralCode}
                        onChange={(e) => setReferralCode(e.target.value.toUpperCase())}
                        className="w-full bg-black border border-[#333] rounded-xl py-3 pl-10 pr-4 text-white placeholder-gray-600 focus:outline-none focus:border-purple-500 focus:bg-[#0a0a0a] transition-colors font-mono uppercase text-sm tracking-wider"
                        placeholder="OPTIONAL"
                        maxLength={10}
                        />
                    </div>
                </div>
            </div>

            {/* Theme Selector */}
            <div className="space-y-2">
                <label className="text-xs font-bold uppercase text-gray-500 ml-1 flex items-center gap-1">
                    <Palette size={12} /> Choose Interface Theme
                </label>
                <div className="grid grid-cols-5 gap-2">
                    {THEME_OPTIONS.map(theme => (
                        <div 
                            key={theme.id}
                            onClick={() => setSelectedTheme(theme.id)}
                            className={`cursor-pointer rounded-lg border-2 p-1.5 transition-all flex flex-col items-center gap-1 ${selectedTheme === theme.id ? 'border-white bg-white/10' : 'border-[#333] bg-black hover:border-gray-500'}`}
                        >
                            <div className="w-6 h-6 rounded-full shadow-sm relative flex items-center justify-center" style={{ backgroundColor: theme.color }}>
                                {selectedTheme === theme.id && <Check size={12} className="text-black font-bold"/>}
                            </div>
                            <span className="text-[9px] text-gray-400 font-bold text-center truncate w-full">{theme.name.split(' ')[0]}</span>
                        </div>
                    ))}
                </div>
            </div>

            <button 
                type="submit" 
                disabled={isLoading}
                className="w-full py-4 mt-2 bg-white text-black hover:bg-gray-200 active:scale-[0.98] rounded-xl font-black text-sm uppercase tracking-wider shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
                {isLoading ? <Loader2 className="animate-spin" size={20} /> : <>Create Account <ArrowRight size={20} /></>}
            </button>
          </form>

          <div className="mt-8 text-center">
            <p className="text-gray-500 text-sm font-bold">
              Already have ID?{' '}
              <Link to="/login" className="text-white hover:text-electric-400 underline decoration-2 underline-offset-4 transition">
                Sign In
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Signup;
