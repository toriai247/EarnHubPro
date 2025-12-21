
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  ArrowDownLeft, ArrowUpRight, Zap, Globe, TrendingUp, Users, ArrowRight, 
  Gamepad2, DollarSign, CheckCircle2, History, Wallet, 
  Activity, Crown, Flame, Sparkles, PlayCircle, Star,
  Smartphone, Bell, Send, ArrowRightLeft, RefreshCw, Trophy, Layers, Eye, EyeOff,
  Rocket, Disc, Gift, Swords, Maximize2, Minimize2
} from 'lucide-react';
import GlassCard from '../components/GlassCard';
import BalanceDisplay from '../components/BalanceDisplay';
import DailyBonus from '../components/DailyBonus';
import SmartImage from '../components/SmartImage';
import { WalletData, UserProfile } from '../types';
import { supabase } from '../integrations/supabase/client';
import { createUserProfile } from '../lib/actions';
import { useSystem } from '../context/SystemContext';
import { useSimulation } from '../context/SimulationContext';
import { useCurrency } from '../context/CurrencyContext';
import { motion, AnimatePresence, HTMLMotionProps } from 'framer-motion';
import SmartAd from '../components/SmartAd';
import { toggleFullscreen } from '../lib/fullscreen';

const MotionDiv: React.FC<HTMLMotionProps<"div">> = motion.div;

const Home: React.FC = () => {
  const { isFeatureEnabled } = useSystem();
  const { format } = useCurrency();
  const { onlineUsers, totalPaid, totalUsers, liveFeed } = useSimulation();
  
  const [user, setUser] = useState<UserProfile | null>(null);
  const [wallet, setWallet] = useState<WalletData | null>(null);
  const [loading, setLoading] = useState(true);
  const [showBalance, setShowBalance] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    fetchData();
    const handleFsChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handleFsChange);
    return () => document.removeEventListener('fullscreenchange', handleFsChange);
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

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
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  const handleFsToggle = () => toggleFullscreen();

  const QuickAction = ({ to, icon: Icon, label }: any) => (
    <Link to={to} className="flex flex-col items-center gap-2 group flex-1">
        <div className="w-12 h-12 rounded-2xl flex items-center justify-center bg-black/10 border border-black/5 relative overflow-hidden">
            <Icon size={20} className="text-black" />
        </div>
        <span className="text-[8px] font-black uppercase tracking-[0.15em] text-black/60 group-hover:text-black">{label}</span>
    </Link>
  );

  return (
    <MotionDiv 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="space-y-6 pb-32 px-1"
    >
      
      {/* APP HEADER */}
      <div className="flex items-center justify-between px-3 pt-4">
          <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl border-2 border-brand p-0.5 bg-black overflow-hidden">
                  <SmartImage src={user?.avatar_1 || undefined} alt="User" className="w-full h-full object-cover" />
              </div>
              <div>
                  <h2 className="text-lg font-black text-white leading-tight">Welcome, {user?.name_1?.split(' ')[0]}</h2>
                  <div className="flex items-center gap-1.5 mt-0.5">
                      <div className="w-1.5 h-1.5 rounded-full bg-success shadow-[0_0_5px_#10B981]"></div>
                      <span className="text-[8px] text-muted font-black uppercase tracking-widest">Protocol Secured</span>
                  </div>
              </div>
          </div>
          
          <div className="flex items-center gap-2">
              <button 
                onClick={handleFsToggle} 
                className="p-3 bg-panel rounded-2xl border border-border-base text-muted hover:text-brand transition-all active:scale-90"
                title="Fullscreen"
              >
                  {isFullscreen ? <Minimize2 size={20} /> : <Maximize2 size={20} />}
              </button>
              <Link to="/notifications" className="p-3 bg-panel rounded-2xl border border-border-base text-muted relative hover:text-brand">
                  <Bell size={20} />
                  <span className="absolute top-2.5 right-2.5 w-2 h-2 bg-brand rounded-full border-2 border-panel shadow-sm"></span>
              </Link>
          </div>
      </div>

      {/* OLED BALANCE CARD */}
      <section className="px-1">
          <div className="p-7 border-none bg-brand relative overflow-hidden rounded-5xl group">
              <div className="absolute top-0 right-0 p-4 opacity-[0.08] pointer-events-none rotate-12 scale-150 text-black">
                  <DollarSign size={140} />
              </div>
              
              <div className="relative z-10">
                  <div className="flex justify-between items-center mb-4">
                    <div className="flex items-center gap-2 bg-black/10 px-3 py-1.5 rounded-full border border-black/5">
                        <Wallet size={12} className="text-black" />
                        <span className="text-[9px] text-black font-black uppercase tracking-[0.2em]">Liquid Assets</span>
                    </div>
                    <button onClick={() => setShowBalance(!showBalance)} className="w-10 h-10 flex items-center justify-center text-black/50 hover:text-black transition-colors rounded-xl bg-black/5">
                        {showBalance ? <Eye size={18} /> : <EyeOff size={18} />}
                    </button>
                  </div>
                  
                  <h1 className="text-5xl font-black text-black tracking-tighter font-mono leading-none">
                      {showBalance ? <BalanceDisplay amount={wallet?.balance || 0} loading={loading} /> : '••••••'}
                  </h1>
              </div>

              <div className="grid grid-cols-5 gap-1 mt-10 relative z-10">
                  <QuickAction to="/deposit" icon={ArrowDownLeft} label="Add" />
                  <QuickAction to="/withdraw" icon={ArrowUpRight} label="Out" />
                  <QuickAction to="/send-money" icon={Send} label="Send" />
                  <QuickAction to="/transfer" icon={ArrowRightLeft} label="Move" />
                  <QuickAction to="/exchange" icon={RefreshCw} label="Swap" />
              </div>
          </div>
      </section>

      {/* BONUS TRACKER */}
      <section className="px-1">
          {user && <DailyBonus userId={user.id} />}
      </section>

      {/* CORE EARNINGS */}
      <div className="grid grid-cols-2 gap-3 px-1">
          <Link to="/tasks" className="p-5 bg-panel border border-border-base rounded-[2.5rem] flex flex-col gap-4 hover:border-brand/40 group relative overflow-hidden">
              <div className="w-11 h-11 rounded-2xl bg-brand/10 border border-brand/20 flex items-center justify-center text-brand transition-all">
                  <Globe size={22} />
              </div>
              <div>
                  <h4 className="font-black text-sm text-white uppercase tracking-tighter">Micro Jobs</h4>
                  <p className="text-[9px] text-muted font-bold mt-1">Verified Revenue</p>
              </div>
              <div className="absolute top-4 right-4">
                  <ArrowUpRight className="text-muted group-hover:text-brand transition-colors" size={14} />
              </div>
          </Link>
          <Link to="/video" className="p-5 bg-panel border border-border-base rounded-[2.5rem] flex flex-col gap-4 hover:border-red-500/40 group relative overflow-hidden">
              <div className="w-11 h-11 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-500 transition-all">
                  <PlayCircle size={22} />
              </div>
              <div>
                  <h4 className="font-black text-sm text-white uppercase tracking-tighter">Premium Ads</h4>
                  <p className="text-[9px] text-muted font-bold mt-1">Streaming Bonus</p>
              </div>
              <div className="absolute top-4 right-4">
                  <ArrowUpRight className="text-muted group-hover:text-red-500 transition-colors" size={14} />
              </div>
          </Link>
      </div>

      {/* PLAY HUB - HORIZONTAL SCROLL FEATURED GAMES */}
      <section className="space-y-4 px-1 pt-2">
          <div className="flex items-center justify-between px-3">
              <h3 className="text-[10px] font-black text-gray-500 uppercase tracking-[0.3em] flex items-center gap-2">
                <Gamepad2 size={12} className="text-brand" /> Entertainment Hub
              </h3>
              <Link to="/games" className="text-[9px] font-black text-brand uppercase tracking-widest border-b border-brand/20 hover:border-brand transition-all">Explore</Link>
          </div>
          
          <div className="flex overflow-x-auto gap-4 no-scrollbar pb-2 px-2">
              {[
                { id: 'crash', name: 'Space Crash', icon: Rocket, color: 'text-red-400', bg: 'bg-red-500/5 border-red-500/20', path: '/games/crash' },
                { id: 'spin', name: 'Royal Wheel', icon: Disc, color: 'text-blue-400', bg: 'bg-blue-500/5 border-blue-500/20', path: '/games/spin' },
                { id: 'box', name: 'Mystery Box', icon: Gift, color: 'text-brand', bg: 'bg-brand/5 border-brand/20', path: '/games' },
                { id: 'plinko', name: 'Plinko', icon: Layers, color: 'text-purple-400', bg: 'bg-purple-500/5 border-purple-500/20', path: '/games/plinko' }
              ].map(game => (
                <Link key={game.id} to={game.path} className="min-w-[140px] bg-panel border border-border-base rounded-[2.5rem] p-6 flex flex-col items-center text-center gap-4 hover:border-brand transition-all group relative">
                    <div className={`w-14 h-14 rounded-3xl flex items-center justify-center ${game.bg} border-2 group-hover:scale-110 transition-all ${game.color} relative`}>
                        <game.icon size={28} />
                    </div>
                    <div>
                        <span className="text-[10px] font-black text-white uppercase tracking-wider block">{game.name}</span>
                        <span className="text-[8px] text-gray-500 font-bold uppercase mt-1">Live Pot</span>
                    </div>
                </Link>
              ))}
          </div>
      </section>

      {/* AUDIT LOGS */}
      <section className="px-1 space-y-4">
          <div className="flex items-center justify-between px-3">
              <h3 className="text-[10px] font-black text-gray-500 uppercase tracking-[0.3em] flex items-center gap-3">
                <Activity size={12} className="text-brand" /> Protocol Audit
              </h3>
              <div className="flex items-center gap-1.5">
                  <div className="w-1 h-1 rounded-full bg-success"></div>
                  <span className="text-[9px] font-black text-success uppercase tracking-widest">{onlineUsers} Live</span>
              </div>
          </div>

          <div className="bg-panel border border-border-base rounded-5xl overflow-hidden p-3 shadow-sm">
              <div className="space-y-1">
                  {liveFeed.slice(0, 5).map((item, i) => (
                      <div key={i} className="flex items-center justify-between p-4 rounded-3xl group">
                          <div className="flex items-center gap-4">
                              <div className="w-9 h-9 rounded-xl bg-black flex items-center justify-center text-lg border border-white/[0.03]">
                                {item.icon}
                              </div>
                              <div className="flex flex-col">
                                  <span className="text-xs font-black text-white leading-none">{item.user}</span>
                                  <span className={`text-[9px] font-bold uppercase tracking-tight mt-1.5 ${item.color}`}>{item.action}</span>
                              </div>
                          </div>
                          <span className="text-xs font-black text-brand font-mono">{item.amount}</span>
                      </div>
                  ))}
              </div>
          </div>
      </section>

      {/* PROMOTION BANNER */}
      <section className="px-1 pt-2">
          <Link to="/unlimited-earn" className="relative block group overflow-hidden rounded-[3rem] border border-white/5">
                <div className="absolute inset-0 bg-gradient-to-r from-purple-900 via-brand/20 to-orange-600 opacity-20"></div>
                <div className="p-8 flex items-center justify-between gap-4 relative z-10 bg-black/40">
                    <div className="flex items-center gap-5">
                        <div className="w-14 h-14 rounded-2xl bg-brand text-black flex items-center justify-center group-hover:scale-110 transition-transform">
                            <Zap size={28} fill="currentColor"/>
                        </div>
                        <div>
                            <h3 className="text-lg font-black text-white uppercase tracking-tighter">Affiliate Network</h3>
                            <p className="text-[10px] text-muted font-bold mt-1">Unlock Lifetime Commissions</p>
                        </div>
                    </div>
                    <div className="w-10 h-10 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-white">
                      <ArrowRight size={20} strokeWidth={3} />
                    </div>
                </div>
          </Link>
      </section>

      {/* GLOBAL METRICS */}
      <section className="px-1 grid grid-cols-3 gap-3">
          <div className="bg-panel p-5 rounded-[2rem] border border-white/5 text-center">
              <p className="text-[8px] font-black text-gray-500 uppercase tracking-[0.2em] mb-2">Total Node</p>
              <p className="text-lg font-black text-white">{totalUsers.toLocaleString()}</p>
          </div>
          <div className="bg-panel p-5 rounded-[2rem] border border-white/5 text-center">
              <p className="text-[8px] font-black text-gray-500 uppercase tracking-[0.2em] mb-2">Payout Vol.</p>
              <p className="text-lg font-black text-brand">৳{(totalPaid/1000).toFixed(0)}K</p>
          </div>
          <div className="bg-panel p-5 rounded-[2rem] border border-white/5 text-center">
              <p className="text-[8px] font-black text-gray-500 uppercase tracking-[0.2em] mb-2">Node Sync</p>
              <p className="text-lg font-black text-success">100%</p>
          </div>
      </section>

      <div className="px-1 pb-6">
        <SmartAd slot="8977187296" className="rounded-5xl overflow-hidden border border-border-base" />
      </div>

    </MotionDiv>
  );
};

export default Home;
