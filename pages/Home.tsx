
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  ArrowDownLeft, ArrowUpRight, ShieldCheck, Zap, Globe, Lock, TrendingUp, Users, ArrowRight, Star, Server, Smartphone, Play
} from 'lucide-react';
import GlassCard from '../components/GlassCard';
import BalanceDisplay from '../components/BalanceDisplay';
import DailyBonus from '../components/DailyBonus';
import SmartImage from '../components/SmartImage';
import { Activity, WalletData, UserProfile, WebsiteReview } from '../types';
import { supabase } from '../integrations/supabase/client';
import { createUserProfile } from '../lib/actions';
import { useSystem } from '../context/SystemContext';
import { motion } from 'framer-motion';

const MotionDiv = motion.div as any;

const Home: React.FC = () => {
  const { isFeatureEnabled, config } = useSystem();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [wallet, setWallet] = useState<WalletData | null>(null);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [isGuest, setIsGuest] = useState(true);
  const [publicReviews, setPublicReviews] = useState<WebsiteReview[]>([]);

  useEffect(() => {
    fetchData();
    fetchPublicReviews();
  }, []);

  // SEO Update for Guest View
  useEffect(() => {
    if (isGuest) {
      document.title = config?.hero_title || "Naxxivo - Fast & Secure Earning App";
      const metaDesc = document.querySelector('meta[name="description"]');
      if (metaDesc) {
        metaDesc.setAttribute("content", config?.hero_description || "Download Naxxivo to earn real money. Tasks, Games, and Investments in one fast app.");
      }
    }
  }, [isGuest, config]);

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

      if (walletData) {
        setWallet(walletData as WalletData);
        
        const [userRes, txRes] = await Promise.all([
            supabase.from('profiles').select('*').eq('id', session.user.id).single(),
            supabase.from('transactions').select('*').eq('user_id', session.user.id).order('created_at', { ascending: false }).limit(5)
        ]);

        if (userRes.data) setUser(userRes.data as UserProfile);

        if (txRes.data) {
           const acts: Activity[] = txRes.data.map((t: any) => ({
              id: t.id, title: t.description || t.type, type: t.type, amount: t.amount,
              time: t.created_at, timestamp: new Date(t.created_at).getTime(), status: t.status
            }));
            setActivities(acts);
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const fetchPublicReviews = async () => {
      const { data } = await supabase
          .from('website_reviews')
          .select('*')
          .eq('is_public', true)
          .order('rating', { ascending: false })
          .limit(5);
      
      if (data && data.length > 0) {
          const userIds = data.map((r: any) => r.user_id).filter(Boolean);
          const { data: profiles } = await supabase.from('profiles').select('id, name_1, avatar_1').in('id', userIds);
          const profileMap = new Map(profiles?.map((p: any) => [p.id, p]));
          
          setPublicReviews(data.map((r: any) => ({
              ...r,
              profile: profileMap.get(r.user_id)
          })));
      }
  };

  const container = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.08 } }
  };

  const item = {
    hidden: { opacity: 0, y: 15 },
    show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 200, damping: 20 } }
  };

  if (loading) return (
      <div className="min-h-screen flex items-center justify-center bg-void">
          <div className="w-8 h-8 border-4 border-brand border-t-transparent rounded-full animate-spin"></div>
      </div>
  );

  if (isGuest) {
      return (
        <div className="pb-0 pt-0 min-h-screen bg-void relative overflow-x-hidden font-sans selection:bg-brand selection:text-white">
             
             {/* 1. Performance Background Layers */}
             <div className="fixed inset-0 z-0 pointer-events-none">
                 <div className="absolute top-[-20%] left-[-20%] w-[70%] h-[70%] bg-purple-900/10 blur-[150px] rounded-full mix-blend-screen" />
                 <div className="absolute top-[30%] right-[-20%] w-[60%] h-[60%] bg-blue-900/10 blur-[150px] rounded-full mix-blend-screen" />
                 <div className="absolute bottom-[-10%] left-[10%] w-[50%] h-[50%] bg-emerald-900/5 blur-[120px] rounded-full mix-blend-screen" />
                 {/* Grain Texture for depth */}
                 <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")` }}></div>
             </div>

             <main className="relative z-10 px-4 max-w-5xl mx-auto space-y-20 pt-safe-top">
                
                {/* HERO SECTION */}
                <header className="text-center pt-24 pb-8 flex flex-col items-center">
                    <motion.div 
                        initial={{ opacity: 0, y: 30, scale: 0.95 }} 
                        animate={{ opacity: 1, y: 0, scale: 1 }} 
                        transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
                        className="w-full"
                    >
                        {/* Status Chip */}
                        <div className="inline-flex items-center gap-2 py-1.5 px-3 rounded-full bg-white/5 border border-white/10 backdrop-blur-md mb-8 shadow-glow">
                            <span className="relative flex h-2 w-2">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                            </span>
                            <span className="text-[10px] font-bold text-white uppercase tracking-widest">
                                Ecosystem V4.0 Online
                            </span>
                        </div>
                        
                        {/* Dynamic Headline */}
                        <h1 className="text-5xl sm:text-7xl font-black text-white leading-[0.95] tracking-tight mb-6 text-balance drop-shadow-2xl">
                            {config?.hero_title ? config.hero_title : (
                                <>
                                    THE <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand to-purple-400">FASTEST</span><br/>
                                    WAY TO EARN.
                                </>
                            )}
                        </h1>
                        
                        <p className="text-muted text-base sm:text-lg max-w-lg mx-auto leading-relaxed font-medium text-balance mb-10">
                            {config?.hero_description || "Secure investments, instant tasks, and competitive gaming. Download content directly to your device for lightning speed."}
                        </p>

                        {/* High Performance CTAs */}
                        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 w-full max-w-sm mx-auto">
                            <Link 
                                to="/signup" 
                                className="group relative w-full py-4 bg-brand text-white font-black text-sm uppercase tracking-wider rounded-xl hover:scale-[1.02] active:scale-[0.98] transition-all shadow-glow flex items-center justify-center gap-2 overflow-hidden"
                            >
                                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent translate-x-[-100%] group-hover:animate-shimmer transition-none" />
                                <Zap size={18} className="fill-white" />
                                <span className="relative z-10">Start Earning</span>
                            </Link>
                            <Link 
                                to="/login" 
                                className="w-full py-4 bg-card border border-border-highlight text-main font-bold text-sm uppercase tracking-wider rounded-xl hover:bg-input transition flex items-center justify-center gap-2 backdrop-blur-xl"
                            >
                                Login
                            </Link>
                        </div>
                    </motion.div>
                </header>

                {/* BENTO GRID FEATURES */}
                <section className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        
                        {/* Card 1: Speed */}
                        <div className="md:col-span-2 p-6 rounded-3xl bg-gradient-to-br from-card to-void border border-border-base relative overflow-hidden group">
                            <div className="absolute right-0 top-0 p-6 opacity-5 group-hover:opacity-10 transition-opacity duration-500 transform group-hover:scale-110"><Smartphone size={160} /></div>
                            <div className="relative z-10">
                                <div className="w-12 h-12 bg-blue-500/10 rounded-xl flex items-center justify-center mb-4 border border-blue-500/20 text-blue-400">
                                    <Zap size={24} />
                                </div>
                                <h3 className="text-xl font-bold text-white mb-2">Native App Speed</h3>
                                <p className="text-muted text-sm leading-relaxed max-w-md">
                                    Our Progressive Web App (PWA) technology downloads core files to your device. This means near-instant loading, even on 3G networks.
                                </p>
                            </div>
                        </div>

                        {/* Card 2: Security */}
                        <div className="p-6 rounded-3xl bg-gradient-to-b from-card to-void border border-border-base relative overflow-hidden group">
                             <div className="relative z-10 h-full flex flex-col">
                                <div className="w-12 h-12 bg-emerald-500/10 rounded-xl flex items-center justify-center mb-4 border border-emerald-500/20 text-emerald-400">
                                    <ShieldCheck size={24} />
                                </div>
                                <h3 className="text-lg font-bold text-white mb-2">Encrypted</h3>
                                <p className="text-muted text-sm leading-relaxed">
                                    Bank-grade AES-256 encryption keeps your earnings and data safe.
                                </p>
                             </div>
                        </div>

                        {/* Card 3: Global */}
                        <div className="p-6 rounded-3xl bg-gradient-to-br from-card to-void border border-border-base relative overflow-hidden group">
                            <div className="relative z-10">
                                <div className="w-12 h-12 bg-purple-500/10 rounded-xl flex items-center justify-center mb-4 border border-purple-500/20 text-purple-400">
                                    <Globe size={24} />
                                </div>
                                <h3 className="text-lg font-bold text-white mb-2">Global Access</h3>
                                <p className="text-muted text-sm leading-relaxed">
                                    Works in 120+ countries with automated currency conversion.
                                </p>
                            </div>
                        </div>

                        {/* Card 4: Games */}
                        <div className="md:col-span-2 p-6 rounded-3xl bg-gradient-to-r from-card to-void border border-border-base relative overflow-hidden group">
                            <div className="relative z-10 flex items-center justify-between">
                                <div>
                                    <div className="w-12 h-12 bg-orange-500/10 rounded-xl flex items-center justify-center mb-4 border border-orange-500/20 text-orange-400">
                                        <Play size={24} />
                                    </div>
                                    <h3 className="text-xl font-bold text-white mb-2">Play to Earn</h3>
                                    <p className="text-muted text-sm leading-relaxed max-w-xs">
                                        Turn your gaming skills into profit with our fair, automated game engine.
                                    </p>
                                </div>
                                <div className="hidden sm:block opacity-50 group-hover:opacity-100 transition-opacity grayscale group-hover:grayscale-0">
                                    <div className="flex gap-2">
                                        <div className="w-8 h-12 bg-orange-500/20 rounded-md animate-pulse"></div>
                                        <div className="w-8 h-12 bg-orange-500/40 rounded-md animate-pulse delay-100"></div>
                                        <div className="w-8 h-12 bg-orange-500/60 rounded-md animate-pulse delay-200"></div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* LIVE STATS SCROLL */}
                <div className="overflow-hidden py-4 border-y border-white/5 bg-black/20">
                    <div className="flex gap-8 items-center animate-marquee whitespace-nowrap text-xs font-mono text-muted uppercase">
                        <span><span className="text-emerald-400">●</span> 5,230 Users Online</span>
                        <span><span className="text-brand">●</span> $14,200 Paid Today</span>
                        <span><span className="text-purple-400">●</span> 98% Win Rate</span>
                        <span><span className="text-yellow-400">●</span> Server Latency: 24ms</span>
                        <span><span className="text-emerald-400">●</span> 5,230 Users Online</span>
                        <span><span className="text-brand">●</span> $14,200 Paid Today</span>
                    </div>
                </div>

                {/* Removed Footer Here (Used Global in Layout) */}

             </main>
        </div>
      );
  }

  // --- USER DASHBOARD VIEW (LOGGED IN) ---
  return (
    <MotionDiv variants={container} initial="hidden" animate="show" className="space-y-6 px-4 pb-2 pt-2">
      {user && <DailyBonus userId={user.id} />}

      <MotionDiv variants={item} className="flex items-center justify-between">
          <div className="flex items-center gap-3">
              <div className="w-11 h-11 bg-card border border-border-base rounded-full flex items-center justify-center relative overflow-hidden">
                  <SmartImage src={user?.avatar_1 || undefined} alt={user?.name_1 || "User"} className="w-full h-full object-cover" fallbackSrc={`https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.name_1}`} />
              </div>
              <div>
                  <h2 className="font-bold text-main leading-tight text-base">{user?.name_1 || 'User'}</h2>
                  <div className="flex items-center gap-2">
                      <span className="text-[10px] bg-brand/10 text-brand px-1.5 py-0.5 rounded font-bold uppercase">Lvl {user?.level_1 || 1}</span>
                      <span className="text-[10px] text-muted">{user?.rank_1 || 'Rookie'}</span>
                  </div>
              </div>
          </div>
          <Link to="/profile" className="p-2 bg-card border border-border-base rounded-xl text-muted hover:text-main transition">
              <ArrowRight size={18} />
          </Link>
      </MotionDiv>

      <MotionDiv variants={item}>
        <GlassCard className="p-6 relative overflow-hidden border-brand/30">
            {/* Ambient Background Glow */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-brand/20 blur-[50px] rounded-full pointer-events-none"></div>
            
            <div className="flex justify-between items-start mb-6 relative z-10">
                <div>
                    <p className="text-[10px] text-muted font-bold uppercase mb-1 tracking-wider">Total Balance</p>
                    <h1 className="text-3xl sm:text-4xl font-black text-main tracking-tight"><BalanceDisplay amount={wallet?.balance || 0} /></h1>
                </div>
                <div className="bg-emerald-500/10 text-emerald-400 px-3 py-1 rounded-lg text-[10px] font-bold border border-emerald-500/20 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></span> LIVE
                </div>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-6 relative z-10">
                <div className="bg-black/30 p-3 rounded-xl border border-white/5 backdrop-blur-sm">
                    <div className="flex items-center gap-2 mb-1">
                        <ArrowDownLeft size={12} className="text-blue-400" />
                        <p className="text-[9px] text-muted uppercase font-bold">Invested</p>
                    </div>
                    <p className="font-bold text-white text-sm font-mono"><BalanceDisplay amount={wallet?.deposit || 0} /></p>
                </div>
                <div className="bg-black/30 p-3 rounded-xl border border-white/5 backdrop-blur-sm">
                    <div className="flex items-center gap-2 mb-1">
                        <ArrowUpRight size={12} className="text-emerald-400" />
                        <p className="text-[9px] text-muted uppercase font-bold">Earnings</p>
                    </div>
                    <p className="font-bold text-emerald-400 text-sm font-mono">+<BalanceDisplay amount={wallet?.total_earning || 0} /></p>
                </div>
            </div>

            <div className="flex gap-3 relative z-10">
                {isFeatureEnabled('is_deposit_enabled') ? (
                    <Link to="/deposit" className="flex-1 py-3.5 bg-brand text-white font-bold text-sm rounded-xl flex items-center justify-center gap-2 hover:bg-brand-hover shadow-lg shadow-brand/20 transition active:scale-95">
                      <ArrowDownLeft size={16} /> Deposit
                    </Link>
                ) : <button disabled className="flex-1 py-3.5 bg-input text-muted rounded-xl font-bold text-sm cursor-not-allowed opacity-50">Deposit</button>}
                
                {isFeatureEnabled('is_withdraw_enabled') ? (
                    <Link to="/withdraw" className="flex-1 py-3.5 bg-card border border-border-base text-main font-bold text-sm rounded-xl flex items-center justify-center gap-2 hover:bg-input transition active:scale-95">
                      <ArrowUpRight size={16} /> Withdraw
                    </Link>
                ) : <button disabled className="flex-1 py-3.5 bg-input text-muted rounded-xl font-bold text-sm cursor-not-allowed opacity-50">Withdraw</button>}
            </div>
        </GlassCard>
      </MotionDiv>

      <MotionDiv variants={item}>
        <div className="grid grid-cols-4 gap-3">
            {[
                { name: 'Invite', icon: 'INVITE 4K.jpg', path: '/invite', enabled: isFeatureEnabled('is_invite_enabled') },
                { name: 'Games', icon: 'GAMES 4K.jpg', path: '/games', enabled: isFeatureEnabled('is_games_enabled') },
                { name: 'Rank', icon: 'RANK 4K.jpg', path: '/leaderboard', enabled: true },
                { name: 'Tasks', icon: 'TASKS 4K.jpg', path: '/tasks', enabled: isFeatureEnabled('is_tasks_enabled') }
            ].map((nav, i) => nav.enabled && (
              <Link key={i} to={nav.path} className="flex flex-col items-center gap-2 group cursor-pointer active:scale-95 transition-transform">
                <div className="w-full aspect-square rounded-2xl overflow-hidden shadow-md border border-border-base bg-card relative">
                    <SmartImage src={`https://tyhujeggtfpbkpywtrox.supabase.co/storage/v1/object/public/Png%20icons/${nav.icon}`} alt={nav.name} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
                </div>
                <span className="text-[10px] font-bold text-muted uppercase group-hover:text-brand transition-colors">{nav.name}</span>
              </Link>
            ))}
        </div>
      </MotionDiv>

      <MotionDiv variants={item}>
         <div className="flex justify-between items-center mb-3 px-1">
            <h3 className="text-xs font-bold text-muted uppercase tracking-wider">Live Activity</h3>
            <Link to="/wallet" className="text-[10px] text-brand font-bold hover:underline">View All</Link>
         </div>
         <div className="space-y-2">
            {activities.length === 0 ? <p className="text-xs text-muted px-1 italic">No recent activity found.</p> : activities.map((act) => (
                <div key={act.id} className="flex justify-between items-center p-3.5 bg-card border border-border-base rounded-xl hover:bg-input transition-colors">
                    <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${['withdraw', 'game_loss', 'invest'].includes(act.type) ? 'bg-red-500/10 text-red-500' : 'bg-emerald-500/10 text-emerald-500'}`}>
                            {['withdraw', 'game_loss', 'invest'].includes(act.type) ? <ArrowUpRight size={14}/> : <ArrowDownLeft size={14}/>}
                        </div>
                        <div>
                            <p className="font-bold text-xs text-main uppercase">{act.title}</p>
                            <p className="text-[10px] text-muted">{new Date(act.time).toLocaleDateString()}</p>
                        </div>
                    </div>
                    <span className={`text-xs font-mono font-bold ${['withdraw', 'game_loss', 'invest'].includes(act.type) ? 'text-main' : 'text-emerald-400'}`}>
                        {['withdraw', 'game_loss', 'invest'].includes(act.type) ? '-' : '+'}<BalanceDisplay amount={act.amount} />
                    </span>
                </div>
            ))}
         </div>
      </MotionDiv>
    </MotionDiv>
  );
};

export default Home;
