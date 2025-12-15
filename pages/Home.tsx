
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  ArrowDownLeft, ArrowUpRight, ArrowRightLeft, Zap, Globe, TrendingUp, Users, ArrowRight, Star, 
  Gamepad2, DollarSign, CheckCircle2, Award, Briefcase, Play, History, Wallet, 
  ChevronRight, Quote, Gift, Layers, Activity, Crown, Flame, Sparkles, Grid, Eye, EyeOff, Send, RefreshCw, HelpCircle,
  Radio, ExternalLink
} from 'lucide-react';
import GlassCard from '../components/GlassCard';
import BalanceDisplay from '../components/BalanceDisplay';
import DailyBonus from '../components/DailyBonus';
import SmartImage from '../components/SmartImage';
import { WalletData, UserProfile } from '../types';
import { supabase } from '../integrations/supabase/client';
import { createUserProfile } from '../lib/actions';
import { useSystem } from '../context/SystemContext';
import { useSimulation } from '../context/SimulationContext'; // Import
import { motion, AnimatePresence } from 'framer-motion';
import SmartAd from '../components/SmartAd';

const MotionDiv = motion.div as any;

// --- AFFILIATE CONFIGURATION ---
const PARTNER_BANNERS = [
    { id: 1, img: "https://shrinkme.io/banners/ref/728x90GIF.gif", link: "https://shrinkme.io/ref/103373471738485103929" },
    { id: 2, img: "https://shrinkme.io/banners/ref/728x90.png", link: "https://shrinkme.io/ref/103373471738485103929" },
    { id: 3, img: "https://shrinkme.io/banners/ref/728x90-2.png", link: "https://shrinkme.io/ref/103373471738485103929" },
    { id: 4, img: "https://shrinkme.io/banners/ref/336x280.png", link: "https://shrinkme.io/ref/103373471738485103929" },
    { id: 5, img: "https://ouo.io/images/banners/r1.jpg", link: "http://ouo.io/ref/riQiDnjE" }
];

const Home: React.FC = () => {
  const { isFeatureEnabled, config } = useSystem();
  const { onlineUsers, liveFeed } = useSimulation(); // Use Simulation Data
  
  const [user, setUser] = useState<UserProfile | null>(null);
  const [wallet, setWallet] = useState<WalletData | null>(null);
  const [loading, setLoading] = useState(true);
  const [isGuest, setIsGuest] = useState(true);
  const [showBalance, setShowBalance] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

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

  // --- SHARED LIVE TICKER COMPONENT ---
  const LiveTicker = () => (
      <div className="bg-[#0a0a0a] border-b border-white/5 py-3 overflow-hidden relative">
         <div className="absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-[#0a0a0a] to-transparent z-10"></div>
         <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-[#0a0a0a] to-transparent z-10"></div>
         
         <div className="flex items-center justify-center gap-8 overflow-hidden">
             <AnimatePresence mode="popLayout">
                 {liveFeed.map((act) => (
                     <motion.div 
                        key={act.id} 
                        initial={{ opacity: 0, y: 10 }} 
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        layout
                        className="flex items-center gap-2 text-[10px] font-mono whitespace-nowrap min-w-[180px]"
                     >
                         <span>{act.icon}</span>
                         <span className="text-gray-400 font-bold">{act.user}</span>
                         <span className={act.color}>{act.action}</span>
                         <span className="text-white font-black bg-white/5 px-1.5 rounded">{act.amount}</span>
                         <span className="text-gray-600 italic hidden sm:inline">{act.time}</span>
                     </motion.div>
                 ))}
             </AnimatePresence>
         </div>
      </div>
  );

  // --- PARTNER SLIDER COMPONENT ---
  const PartnerSlider = () => (
      <div className="py-2">
          <div className="flex items-center justify-between mb-3 px-1">
              <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest flex items-center gap-2">
                  <Gift size={14} className="text-pink-500"/> Partner Offers
              </h3>
              <span className="text-[9px] bg-pink-500/10 text-pink-400 border border-pink-500/20 px-2 py-0.5 rounded font-bold uppercase animate-pulse flex items-center gap-1">
                  <Zap size={10} /> Signup Bonus Active
              </span>
          </div>
          
          <div className="w-full overflow-hidden relative bg-black/20 border-y border-white/5 py-4">
              <div className="flex gap-4 w-max animate-marquee hover:[animation-play-state:paused]">
                  {/* Triple the list for seamless infinite loop */}
                  {[...PARTNER_BANNERS, ...PARTNER_BANNERS, ...PARTNER_BANNERS].map((b, i) => (
                      <a 
                          key={i} 
                          href={b.link} 
                          target="_blank" 
                          rel="noreferrer"
                          className="block relative group shrink-0"
                      >
                          <div className="absolute inset-0 bg-black/10 group-hover:bg-transparent transition duration-300 rounded-lg"></div>
                          <img 
                              src={b.img} 
                              alt="Make Money" 
                              className="h-[50px] sm:h-[70px] w-auto rounded-lg shadow-lg border border-white/10 object-contain bg-[#111]"
                          />
                          <div className="absolute bottom-1 right-1 bg-black/60 text-white text-[8px] font-bold px-1.5 rounded backdrop-blur-sm opacity-0 group-hover:opacity-100 transition">
                              VISIT
                          </div>
                      </a>
                  ))}
              </div>
          </div>
      </div>
  );

  // --- GUEST VIEW ---
  if (isGuest) {
      return (
        <div className="min-h-screen bg-[#050505] text-white font-sans overflow-x-hidden selection:bg-brand selection:text-black pb-24">
             
             {/* 1. HERO SECTION */}
             <div className="relative pt-12 pb-10 px-6 text-center border-b border-white/5 bg-gradient-to-b from-blue-900/10 to-black overflow-hidden">
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
                
                <div className="flex justify-center mb-4">
                    <div className="bg-green-500/10 border border-green-500/20 px-3 py-1 rounded-full flex items-center gap-2 text-[10px] font-bold text-green-400 animate-pulse">
                        <Radio size={12} className="text-red-500" /> {onlineUsers.toLocaleString()} Users Online
                    </div>
                </div>

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
             <LiveTicker />

             {/* 2.5 PARTNER SLIDER (GUEST) */}
             <div className="mt-6 mb-2">
                 <PartnerSlider />
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

             {/* AD PLACEMENT: MULTIPLEX */}
             <div className="px-4 max-w-lg mx-auto mb-8">
                 <SmartAd slot="8977187296" />
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
      
      {/* 0. LIVE TICKER (FOR AUTH USERS TOO) */}
      <div className="-mx-4 sm:-mx-0 mb-4 rounded-b-xl overflow-hidden">
        <LiveTicker />
      </div>

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
              <div className="flex items-center gap-2">
                  <span className="text-[10px] text-green-500 font-bold bg-green-900/10 px-2 py-1 rounded border border-green-900/20 flex items-center gap-1 animate-pulse">
                      <Radio size={10} /> {onlineUsers} Online
                  </span>
                  <Link to="/menu" className="p-2 bg-white/5 rounded-full border border-white/5 text-gray-300 hover:text-white transition">
                      <Grid size={20} />
                  </Link>
              </div>
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

      {/* 2.5 PARTNER SLIDER (USER) */}
      <MotionDiv variants={item}>
          <PartnerSlider />
      </MotionDiv>

      {/* 2.6 HOT DEALS SLIDER */}
      <MotionDiv variants={item}>
          <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3 flex items-center gap-2">
              <Flame size={12} className="text-red-500" /> Hot Deals
          </h3>
          <div className="flex gap-4 overflow-x-auto no-scrollbar pb-2 snap-x snap-mandatory">
              <Link to="/vip-plans" className="snap-center min-w-[260px] bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/20 p-4 rounded-2xl relative overflow-hidden group">
                  <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:scale-110 transition"><Crown size={60} /></div>
                  <div className="relative z-10">
                      <span className="text-[9px] bg-amber-500 text-black px-2 py-0.5 rounded font-bold uppercase mb-2 inline-block">Best Value</span>
                      <h4 className="font-bold text-white text-lg">Golden Growth</h4>
                      <p className="text-xs text-amber-200/80 mt-1">3.2% Daily Profit • 15 Days</p>
                  </div>
              </Link>

              <Link to="/deposit" className="snap-center min-w-[260px] bg-gradient-to-r from-blue-500/10 to-cyan-500/10 border border-blue-500/20 p-4 rounded-2xl relative overflow-hidden group">
                  <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:scale-110 transition"><Gift size={60} /></div>
                  <div className="relative z-10">
                      <span className="text-[9px] bg-blue-500 text-white px-2 py-0.5 rounded font-bold uppercase mb-2 inline-block">Bonus</span>
                      <h4 className="font-bold text-white text-lg">5% Deposit Bonus</h4>
                      <p className="text-xs text-blue-200/80 mt-1">Get extra cash instantly.</p>
                  </div>
              </Link>
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

      {/* 4. PLAY ZONE & SUGGESTION */}
      <MotionDiv variants={item}>
          <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3 flex items-center gap-2">
              <Gamepad2 size={12} className="text-purple-500" /> Play Zone
          </h3>
          
          {/* Game Suggestion */}
          <Link to="/games/crash" className="block mb-3 p-4 bg-[#1a1a1a] border border-blue-500/30 rounded-2xl relative overflow-hidden group">
               <div className="absolute top-0 left-0 bg-blue-600 text-white text-[9px] font-bold px-2 py-0.5 rounded-br-lg z-10">
                   TRENDING
               </div>
               <div className="flex items-center justify-between">
                   <div className="flex items-center gap-4">
                       <div className="p-3 bg-blue-500/20 rounded-xl text-blue-400">
                           <TrendingUp size={24} />
                       </div>
                       <div>
                           <h4 className="font-bold text-white">Space Crash</h4>
                           <p className="text-xs text-gray-400">Multipliers up to 100x!</p>
                       </div>
                   </div>
                   <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition">
                       <Play size={14} fill="currentColor" />
                   </div>
               </div>
          </Link>

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

      {/* AD PLACEMENT: MULTIPLEX */}
      <MotionDiv variants={item}>
          <SmartAd slot="8977187296" />
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
