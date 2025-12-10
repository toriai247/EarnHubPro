
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  ArrowDownLeft, ArrowUpRight, ArrowRightLeft, ShieldCheck, Zap, Globe, Lock, TrendingUp, Users, ArrowRight, Star, Server, Smartphone, Play, 
  Gamepad2, DollarSign, CheckCircle2, Award, Briefcase, RefreshCw, Send, Search, LayoutGrid, HelpCircle, FileText, Grid, Eye, EyeOff, History, Wallet, Megaphone,
  ChevronRight, Quote, Gift, Layers, Activity
} from 'lucide-react';
import GlassCard from '../components/GlassCard';
import BalanceDisplay from '../components/BalanceDisplay';
import DailyBonus from '../components/DailyBonus';
import SmartImage from '../components/SmartImage';
import { WalletData, UserProfile } from '../types';
import { supabase } from '../integrations/supabase/client';
import { createUserProfile } from '../lib/actions';
import { useSystem } from '../context/SystemContext';
import { motion, AnimatePresence } from 'framer-motion';

const MotionDiv = motion.div as any;

const Home: React.FC = () => {
  const { isFeatureEnabled, config } = useSystem();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [wallet, setWallet] = useState<WalletData | null>(null);
  const [loading, setLoading] = useState(true);
  const [isGuest, setIsGuest] = useState(true);
  const [showBalance, setShowBalance] = useState(true);

  // Fake Live Activity for Guest Mode
  const [liveActivity, setLiveActivity] = useState([
      { user: 'User88**', action: 'withdrew', amount: '৳500', time: 'Just now' },
      { user: 'Rahim**', action: 'earned', amount: '৳50', time: '2s ago' },
      { user: 'Crypto**', action: 'won', amount: '৳1200', time: '5s ago' },
  ]);

  useEffect(() => {
    fetchData();
    
    // Simulate live ticker for guest mode
    if (isGuest) {
        const interval = setInterval(() => {
            const actions = ['withdrew', 'earned', 'won', 'deposited'];
            const amounts = ['৳50', '৳100', '৳500', '৳1000', '৳2500'];
            const users = ['User', 'Player', 'Earner', 'Member', 'Pro'];
            const newItem = {
                user: `${users[Math.floor(Math.random()*users.length)]}${Math.floor(Math.random()*999)}**`,
                action: actions[Math.floor(Math.random()*actions.length)],
                amount: amounts[Math.floor(Math.random()*amounts.length)],
                time: 'Just now'
            };
            setLiveActivity(prev => [newItem, ...prev.slice(0, 3)]);
        }, 2500);
        return () => clearInterval(interval);
    }
  }, [isGuest]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
          setIsGuest(true);
          setLoading(false);
          return;
      }

      setIsGuest(false);
      let { data: walletData } = await supabase.from('wallets').select('*').eq('user_id', session.user.id).maybeSingle();

      if (!walletData) {
         try {
             await createUserProfile(session.user.id, session.user.email || '', 'User');
             const res = await supabase.from('wallets').select('*').eq('user_id', session.user.id).single();
             walletData = res.data;
         } catch (e) {}
      }

      if (walletData) setWallet(walletData as WalletData);
      
      const { data: userRes } = await supabase.from('profiles').select('*').eq('id', session.user.id).single();
      if (userRes) setUser(userRes as UserProfile);

    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const container = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.05 } }
  };

  const item = {
    hidden: { opacity: 0, y: 10 },
    show: { opacity: 1, y: 0 }
  };

  // --- GUEST VIEW (Enhanced Structure) ---
  if (isGuest) {
      return (
        <div className="min-h-screen bg-[#050505] text-white font-sans overflow-x-hidden selection:bg-brand selection:text-black pb-24">
             
             {/* 1. HERO SECTION */}
             <div className="relative pt-12 pb-10 px-6 text-center border-b border-white/5 bg-gradient-to-b from-blue-900/10 to-black overflow-hidden">
                {/* Background Glow */}
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-lg h-64 bg-blue-600/20 blur-[100px] rounded-full pointer-events-none"></div>
                
                <motion.div 
                    initial={{ scale: 0.8, opacity: 0 }} 
                    animate={{ scale: 1, opacity: 1 }} 
                    transition={{ type: "spring", duration: 0.8 }}
                    className="flex justify-center mb-6 relative z-10"
                >
                    <div className="w-20 h-20 bg-black border-2 border-brand rounded-3xl flex items-center justify-center shadow-[0_0_40px_rgba(var(--color-brand),0.3)]">
                        <span className="text-4xl font-black text-brand">N</span>
                    </div>
                </motion.div>
                
                <h1 className="text-4xl font-black uppercase tracking-tight mb-3 relative z-10">
                    Naxxivo <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand to-blue-400">Pro</span>
                </h1>
                
                <p className="text-gray-400 text-sm font-medium max-w-xs mx-auto leading-relaxed mb-8 relative z-10">
                    The ultimate ecosystem for digital earners. <br/>
                    <span className="text-white font-bold">Watch. Play. Invest. Earn.</span>
                </p>

                <div className="grid grid-cols-2 gap-4 max-w-sm mx-auto relative z-10">
                    <Link to="/signup" className="py-4 bg-brand text-black font-black uppercase tracking-wider rounded-xl hover:scale-[1.02] active:scale-[0.98] transition shadow-lg shadow-brand/20 flex items-center justify-center gap-2">
                        Get Started <ChevronRight size={16} strokeWidth={3}/>
                    </Link>
                    <Link to="/login" className="py-4 bg-white/10 text-white font-bold uppercase tracking-wider rounded-xl hover:bg-white/20 transition border border-white/10 backdrop-blur-sm">
                        Login
                    </Link>
                </div>
             </div>

             {/* 2. LIVE ACTIVITY TICKER */}
             <div className="bg-[#0a0a0a] border-b border-white/5 py-3 overflow-hidden relative">
                 <div className="absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-[#0a0a0a] to-transparent z-10"></div>
                 <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-[#0a0a0a] to-transparent z-10"></div>
                 
                 <div className="flex items-center justify-center gap-8 overflow-hidden">
                     <AnimatePresence mode="popLayout">
                         {liveActivity.map((act, i) => (
                             <motion.div 
                                key={`${act.user}-${i}`} 
                                initial={{ opacity: 0, y: 10 }} 
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                className="flex items-center gap-2 text-[10px] font-mono whitespace-nowrap min-w-[180px]"
                             >
                                 <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse shadow-[0_0_5px_#22c55e]"></div>
                                 <span className="text-gray-400 font-bold">{act.user}</span>
                                 <span className={act.action === 'lost' ? 'text-red-400' : 'text-blue-400'}>{act.action}</span>
                                 <span className="text-white font-black bg-white/5 px-1.5 rounded">{act.amount}</span>
                                 <span className="text-gray-600 italic">{act.time}</span>
                             </motion.div>
                         ))}
                     </AnimatePresence>
                 </div>
             </div>

             {/* 3. STRUCTURED FEATURES GRID */}
             <div className="px-4 py-8 max-w-lg mx-auto">
                 <div className="flex items-center justify-between mb-4 px-1">
                     <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest flex items-center gap-2">
                         <Layers size={14} className="text-brand"/> Core Features
                     </h3>
                     <span className="text-[9px] bg-white/5 text-gray-400 px-2 py-0.5 rounded border border-white/10 font-mono">v4.5 Stable</span>
                 </div>
                 
                 <div className="grid grid-cols-2 gap-3">
                     <GlassCard className="p-4 flex flex-col items-center text-center bg-blue-900/5 border-blue-500/20 hover:bg-blue-900/10 transition">
                         <div className="p-3 bg-blue-500/10 text-blue-400 rounded-2xl mb-3 border border-blue-500/20 shadow-lg shadow-blue-900/20">
                             <Briefcase size={24}/>
                         </div>
                         <h4 className="font-bold text-sm text-white">Micro Jobs</h4>
                         <p className="text-[10px] text-gray-400 mt-1 leading-tight">Earn by completing simple online tasks.</p>
                     </GlassCard>
                     
                     <GlassCard className="p-4 flex flex-col items-center text-center bg-purple-900/5 border-purple-500/20 hover:bg-purple-900/10 transition">
                         <div className="p-3 bg-purple-500/10 text-purple-400 rounded-2xl mb-3 border border-purple-500/20 shadow-lg shadow-purple-900/20">
                             <Gamepad2 size={24}/>
                         </div>
                         <h4 className="font-bold text-sm text-white">Arcade Hub</h4>
                         <p className="text-[10px] text-gray-400 mt-1 leading-tight">Play fair games and win real rewards.</p>
                     </GlassCard>
                     
                     <GlassCard className="p-4 flex flex-col items-center text-center bg-green-900/5 border-green-500/20 hover:bg-green-900/10 transition">
                         <div className="p-3 bg-green-500/10 text-green-400 rounded-2xl mb-3 border border-green-500/20 shadow-lg shadow-green-900/20">
                             <TrendingUp size={24}/>
                         </div>
                         <h4 className="font-bold text-sm text-white">Investments</h4>
                         <p className="text-[10px] text-gray-400 mt-1 leading-tight">Grow your capital with secure plans.</p>
                     </GlassCard>
                     
                     <GlassCard className="p-4 flex flex-col items-center text-center bg-pink-900/5 border-pink-500/20 hover:bg-pink-900/10 transition">
                         <div className="p-3 bg-pink-500/10 text-pink-400 rounded-2xl mb-3 border border-pink-500/20 shadow-lg shadow-pink-900/20">
                             <Users size={24}/>
                         </div>
                         <h4 className="font-bold text-sm text-white">Affiliate</h4>
                         <p className="text-[10px] text-gray-400 mt-1 leading-tight">Earn 5% commission on every referral.</p>
                     </GlassCard>
                 </div>
             </div>

             {/* 4. REVIEWS & TRUST */}
             <div className="px-4 pb-8 max-w-lg mx-auto">
                 <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-4 px-1 flex items-center gap-2">
                     <Star size={14} className="text-yellow-500"/> User Reviews
                 </h3>
                 
                 <div className="space-y-3">
                     <GlassCard className="p-4 bg-[#111] relative overflow-hidden">
                         <div className="absolute top-0 right-0 p-3 opacity-5"><Quote size={40} /></div>
                         <div className="flex items-center gap-2 mb-2">
                             <div className="flex text-yellow-400 gap-0.5">
                                 {[1,2,3,4,5].map(i => <Star key={i} size={12} fill="currentColor"/>)}
                             </div>
                             <span className="text-xs font-bold text-white bg-white/10 px-2 py-0.5 rounded-full">Excellent</span>
                         </div>
                         <p className="text-xs text-gray-300 italic leading-relaxed mb-3">
                             "I've been using Naxxivo for 3 months. The withdrawals are super fast via Bkash. The support team actually replies!"
                         </p>
                         <div className="flex items-center gap-3 border-t border-white/5 pt-3">
                             <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center font-bold text-xs text-white">T</div>
                             <div>
                                 <p className="text-xs font-bold text-white">Tanvir Ahmed</p>
                                 <p className="text-[9px] text-gray-500">Verified User • Bangladesh</p>
                             </div>
                         </div>
                     </GlassCard>

                     <GlassCard className="p-4 bg-[#111] relative overflow-hidden">
                         <div className="absolute top-0 right-0 p-3 opacity-5"><Quote size={40} /></div>
                         <div className="flex items-center gap-2 mb-2">
                             <div className="flex text-yellow-400 gap-0.5">
                                 {[1,2,3,4,5].map(i => <Star key={i} size={12} fill="currentColor"/>)}
                             </div>
                             <span className="text-xs font-bold text-white bg-white/10 px-2 py-0.5 rounded-full">Trusted</span>
                         </div>
                         <p className="text-xs text-gray-300 italic leading-relaxed mb-3">
                             "The daily tasks are easy and payout is consistent. Best earning platform I've found so far."
                         </p>
                         <div className="mt-3 flex items-center gap-3 border-t border-white/5 pt-3">
                             <div className="w-8 h-8 bg-purple-600 rounded-full flex items-center justify-center font-bold text-xs text-white">S</div>
                             <div>
                                 <p className="text-xs font-bold text-white">Sarah K.</p>
                                 <p className="text-[9px] text-gray-500">Verified User • Global</p>
                             </div>
                         </div>
                     </GlassCard>
                 </div>
             </div>

             {/* 5. FOOTER */}
             <div className="border-t border-white/10 py-10 bg-black/50 text-center">
                 <div className="w-10 h-10 bg-white/5 rounded-xl border border-white/10 flex items-center justify-center mx-auto mb-4">
                     <span className="text-lg font-black text-brand">N</span>
                 </div>
                 <div className="flex justify-center gap-6 text-xs font-bold text-gray-500 mb-6">
                     <Link to="/terms" className="hover:text-white transition">Terms of Service</Link>
                     <Link to="/faq" className="hover:text-white transition">FAQ</Link>
                     <Link to="/support" className="hover:text-white transition">Support</Link>
                 </div>
                 <p className="text-[10px] text-gray-600 font-mono">
                     © 2024 Naxxivo Inc. Secure Encrypted Connection.
                 </p>
             </div>

        </div>
      );
  }

  // --- USER DASHBOARD ---
  return (
    <MotionDiv variants={container} initial="hidden" animate="show" className="space-y-8 pb-24 pt-4 px-4 sm:px-0">
      
      {user && <DailyBonus userId={user.id} />}

      {/* 1. ASSET CARD */}
      <MotionDiv variants={item}>
          <div className="flex justify-between items-center mb-4">
              <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full border border-white/10 bg-white/5 overflow-hidden">
                      <SmartImage src={user?.avatar_1 || undefined} alt="User" className="w-full h-full object-cover" />
                  </div>
                  <div>
                      <p className="text-xs text-gray-400">Hello,</p>
                      <h2 className="font-bold text-white leading-none">{user?.name_1?.split(' ')[0]}</h2>
                  </div>
              </div>
              <Link to="/menu" className="p-2 bg-white/5 rounded-full border border-white/5 text-gray-300 hover:text-white transition">
                  <Grid size={20} />
              </Link>
          </div>

          <GlassCard className="p-6 border-yellow-500/20 bg-gradient-to-br from-yellow-900/10 to-black relative overflow-hidden shadow-2xl">
              <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none"><DollarSign size={120} /></div>
              
              <div className="relative z-10">
                  <div className="flex justify-between items-start mb-2">
                      <p className="text-[10px] text-yellow-500/80 font-bold uppercase tracking-widest flex items-center gap-1">
                          Total Balance
                      </p>
                      <button onClick={() => setShowBalance(!showBalance)} className="text-gray-500 hover:text-white transition">
                          {showBalance ? <Eye size={16}/> : <EyeOff size={16}/>}
                      </button>
                  </div>
                  
                  <h1 className="text-4xl font-black text-white tracking-tight mb-6 font-mono">
                      {showBalance ? <BalanceDisplay amount={wallet?.balance || 0} /> : '****'}
                  </h1>

                  <div className="grid grid-cols-2 gap-3">
                      <Link to="/deposit" className="py-3 bg-green-500 text-black rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 hover:bg-green-400 transition active:scale-95 shadow-lg shadow-green-900/20">
                          <ArrowDownLeft size={16} strokeWidth={3}/> Deposit
                      </Link>
                      <Link to="/withdraw" className="py-3 bg-white/10 text-white rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 border border-white/10 hover:bg-white/20 transition active:scale-95">
                          <ArrowUpRight size={16} strokeWidth={3}/> Withdraw
                      </Link>
                  </div>
              </div>
          </GlassCard>
      </MotionDiv>

      {/* 2. QUICK OPERATIONS ROW */}
      <MotionDiv variants={item}>
          <div className="flex justify-between gap-2 overflow-x-auto no-scrollbar pb-2">
              <QuickAction to="/send-money" icon={Send} label="Send" color="text-blue-400" />
              <QuickAction to="/transfer" icon={RefreshCw} label="Transfer" color="text-purple-400" />
              <QuickAction to="/exchange" icon={ArrowRightLeft} label="Exchange" color="text-green-400" />
              <QuickAction to="/wallet" icon={History} label="History" color="text-orange-400" />
          </div>
      </MotionDiv>

      {/* 3. START EARNING */}
      <MotionDiv variants={item}>
          <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3 flex items-center gap-2">
              <Zap size={12} className="text-yellow-500" /> Start Earning
          </h3>
          <div className="grid grid-cols-2 gap-3 mb-3">
              <Link to="/tasks" className="p-4 bg-[#111] border border-white/5 rounded-2xl hover:border-yellow-500/30 transition group relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-2 opacity-10 group-hover:opacity-20 transition"><Briefcase size={40}/></div>
                  <Briefcase size={24} className="text-yellow-500 mb-2" />
                  <h4 className="font-bold text-white text-sm">Tasks</h4>
                  <p className="text-[10px] text-gray-500 mt-0.5">Micro Jobs</p>
              </Link>
              <Link to="/invest" className="p-4 bg-[#111] border border-white/5 rounded-2xl hover:border-green-500/30 transition group relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-2 opacity-10 group-hover:opacity-20 transition"><TrendingUp size={40}/></div>
                  <TrendingUp size={24} className="text-green-500 mb-2" />
                  <h4 className="font-bold text-white text-sm">Invest</h4>
                  <p className="text-[10px] text-gray-500 mt-0.5">Grow Assets</p>
              </Link>
          </div>
          <Link to="/video" className="block w-full p-4 bg-gradient-to-r from-red-900/20 to-black border border-red-500/20 rounded-2xl flex items-center justify-between hover:border-red-500/40 transition">
              <div className="flex items-center gap-3">
                  <div className="p-2 bg-red-500/10 rounded-lg text-red-500"><Play size={20} /></div>
                  <div>
                      <h4 className="font-bold text-white text-sm">Watch & Earn</h4>
                      <p className="text-[10px] text-gray-400">Get paid for viewing ads</p>
                  </div>
              </div>
              <ArrowRight size={16} className="text-gray-600" />
          </Link>
      </MotionDiv>

      {/* 4. PLAY ZONE */}
      <MotionDiv variants={item}>
          <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3 flex items-center gap-2">
              <Gamepad2 size={12} className="text-purple-500" /> Play Zone
          </h3>
          <div className="grid grid-cols-2 gap-3">
              <Link to="/games" className="p-4 bg-gradient-to-br from-purple-900/20 to-black border border-purple-500/20 rounded-2xl hover:scale-[1.02] transition">
                  <Gamepad2 size={24} className="text-purple-400 mb-2" />
                  <h4 className="font-bold text-white text-sm">Game Hub</h4>
                  <p className="text-[10px] text-gray-500">Win Real Cash</p>
              </Link>
              <Link to="/leaderboard" className="p-4 bg-gradient-to-br from-amber-900/20 to-black border border-amber-500/20 rounded-2xl hover:scale-[1.02] transition">
                  <Award size={24} className="text-amber-400 mb-2" />
                  <h4 className="font-bold text-white text-sm">Top 10</h4>
                  <p className="text-[10px] text-gray-500">Weekly Winners</p>
              </Link>
          </div>
      </MotionDiv>

      {/* 5. ESSENTIALS GRID */}
      <MotionDiv variants={item}>
          <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">Essentials</h3>
          <div className="grid grid-cols-4 gap-2">
              <GridItem to="/invite" icon={Users} label="Invite" />
              <GridItem to="/profile" icon={CheckCircle2} label="Profile" />
              <GridItem to="/support" icon={HelpCircle} label="Help" />
              <GridItem to="/menu" icon={Grid} label="More" />
          </div>
      </MotionDiv>

    </MotionDiv>
  );
};

const QuickAction = ({ to, icon: Icon, label, color }: { to: string, icon: any, label: string, color: string }) => (
    <Link to={to} className="flex flex-col items-center gap-2 min-w-[70px] group">
        <div className="w-12 h-12 rounded-full bg-[#111] border border-white/5 flex items-center justify-center group-hover:bg-white/5 transition shadow-lg">
            <Icon size={20} className={color} />
        </div>
        <span className="text-[10px] font-bold text-gray-400 uppercase group-hover:text-white transition">{label}</span>
    </Link>
);

const GridItem = ({ to, icon: Icon, label }: { to: string, icon: any, label: string }) => (
    <Link to={to} className="flex flex-col items-center justify-center p-3 bg-[#111] border border-white/5 rounded-xl hover:bg-white/5 transition active:scale-95">
        <Icon size={20} className="text-gray-300 mb-1" />
        <span className="text-[10px] font-bold text-gray-400">{label}</span>
    </Link>
);

export default Home;
