import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  ArrowDownLeft, ArrowUpRight, ShieldCheck, Zap, Globe, Lock, TrendingUp, Users, ArrowRight, Star
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
  const { isFeatureEnabled } = useSystem();
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
    show: { opacity: 1, transition: { staggerChildren: 0.05 } }
  };

  const item = {
    hidden: { opacity: 0, y: 10 },
    show: { opacity: 1, y: 0 }
  };

  if (loading) return <div className="p-6 text-center text-muted">Loading...</div>;

  if (isGuest) {
      return (
        <div className="pb-24 pt-safe min-h-screen bg-void relative overflow-x-hidden font-sans">
             {/* Background Effects */}
             <div className="absolute top-0 left-0 right-0 h-[60vh] bg-gradient-to-b from-blue-900/20 to-transparent pointer-events-none" />
             <div className="absolute top-[-10%] right-[-20%] w-[60%] h-[60%] bg-brand/10 blur-[120px] rounded-full pointer-events-none" />
             <div className="absolute bottom-[-10%] left-[-20%] w-[60%] h-[60%] bg-purple-900/10 blur-[120px] rounded-full pointer-events-none" />

             <div className="px-6 relative z-10 space-y-16">
                {/* Hero */}
                <div className="text-center pt-8 space-y-8">
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
                        <div className="inline-flex items-center gap-2 py-1.5 px-4 rounded-full bg-white/5 border border-white/10 backdrop-blur-md mb-6 shadow-glow">
                            <span className="relative flex h-2 w-2">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                              <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                            </span>
                            <span className="text-[10px] font-bold text-white uppercase tracking-widest">
                                Live Systems Online
                            </span>
                        </div>
                        
                        <h1 className="text-5xl sm:text-7xl font-black text-white leading-[0.9] tracking-tighter mb-6">
                            EARN.<br />
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand to-cyan-400">PLAY.</span> GROW.
                        </h1>
                        
                        <p className="text-gray-400 text-sm sm:text-lg max-w-md mx-auto leading-relaxed font-medium">
                            Join the next-generation earning ecosystem. Secure investments, instant tasks, and competitive gaming in one powerful dashboard.
                        </p>
                    </motion.div>

                    <motion.div 
                        initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.2 }}
                        className="flex flex-col gap-4 max-w-xs mx-auto"
                    >
                        <Link to="/signup" className="group relative w-full py-4 bg-white text-black font-black text-lg rounded-2xl hover:scale-[1.02] transition-all shadow-[0_0_40px_rgba(255,255,255,0.15)] flex items-center justify-center gap-2 overflow-hidden">
                            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/80 to-transparent translate-x-[-100%] group-hover:animate-shimmer transition-none" />
                            Start Earning Now <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
                        </Link>
                        <Link to="/login" className="w-full py-4 bg-white/5 border border-white/10 text-white font-bold text-lg rounded-2xl hover:bg-white/10 transition flex items-center justify-center gap-2 backdrop-blur-md">
                            Login to Account
                        </Link>
                    </motion.div>
                    
                    <div className="flex justify-center gap-6 text-[10px] text-gray-500 uppercase font-bold tracking-widest pt-2">
                        <span className="flex items-center gap-1.5"><ShieldCheck size={14} className="text-green-500" /> SSL Secured</span>
                        <span className="flex items-center gap-1.5"><Zap size={14} className="text-yellow-500" /> Instant Pay</span>
                    </div>
                </div>

                {/* Stats Row */}
                <div className="grid grid-cols-3 gap-3">
                    {[
                        { label: 'Active Users', val: '50K+', icon: Users, color: 'text-blue-400' },
                        { label: 'Total Paid', val: '$2.4M', icon: TrendingUp, color: 'text-green-400' },
                        { label: 'Global', val: '120+', icon: Globe, color: 'text-purple-400' },
                    ].map((stat, i) => (
                        <GlassCard key={i} className="flex flex-col items-center justify-center p-4 text-center bg-white/5 border-white/5 backdrop-blur-md hover:bg-white/10 transition-colors">
                            <stat.icon size={24} className={`${stat.color} mb-2`} />
                            <h3 className="text-xl font-black text-white">{stat.val}</h3>
                            <p className="text-[9px] text-gray-400 uppercase font-bold tracking-wider">{stat.label}</p>
                        </GlassCard>
                    ))}
                </div>

                {/* Public Reviews */}
                {publicReviews.length > 0 && (
                    <div className="space-y-4">
                        <div className="flex items-center gap-4">
                            <div className="h-px bg-white/10 flex-1"></div>
                            <h2 className="text-lg font-bold text-white uppercase tracking-widest">User Love</h2>
                            <div className="h-px bg-white/10 flex-1"></div>
                        </div>
                        <div className="overflow-x-auto no-scrollbar flex gap-4 pb-4">
                            {publicReviews.map(review => (
                                <GlassCard key={review.id} className="min-w-[250px] p-4 bg-white/5 border-white/5">
                                    <div className="flex items-center gap-2 mb-2">
                                        <SmartImage src={review.profile?.avatar_1 || `https://api.dicebear.com/7.x/avataaars/svg?seed=${review.id}`} className="w-8 h-8 rounded-full" />
                                        <div>
                                            <p className="text-sm font-bold text-white">{review.profile?.name_1 || 'User'}</p>
                                            <div className="flex text-yellow-400">
                                                {Array.from({length: 5}).map((_, i) => (
                                                    <Star key={i} size={10} className={i < review.rating ? "fill-yellow-400" : "text-gray-600"} />
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                    <p className="text-xs text-gray-400 italic">"{review.comment}"</p>
                                </GlassCard>
                            ))}
                        </div>
                    </div>
                )}

                {/* Features Grid */}
                <div className="space-y-8">
                    <div className="flex items-center gap-4">
                        <div className="h-px bg-white/10 flex-1"></div>
                        <h2 className="text-lg font-bold text-white uppercase tracking-widest">Why Naxxivo?</h2>
                        <div className="h-px bg-white/10 flex-1"></div>
                    </div>
                    
                    <div className="grid grid-cols-1 gap-4">
                        <div className="p-6 rounded-3xl bg-gradient-to-br from-blue-900/10 to-transparent border border-blue-500/20 relative overflow-hidden group hover:border-blue-500/40 transition-colors">
                            <div className="absolute right-[-20px] top-[-20px] p-4 opacity-5 group-hover:opacity-10 transition-opacity"><ShieldCheck size={120} /></div>
                            <div className="relative z-10">
                                <div className="w-12 h-12 bg-blue-500/20 rounded-2xl flex items-center justify-center mb-4 text-blue-400">
                                    <Lock size={24} />
                                </div>
                                <h3 className="text-xl font-bold text-white mb-2">Bank-Grade Security</h3>
                                <p className="text-sm text-gray-400 leading-relaxed">
                                    Your assets are protected by enterprise AES-256 encryption, biometric passkeys, and 24/7 fraud monitoring systems.
                                </p>
                            </div>
                        </div>
                        
                        <div className="p-6 rounded-3xl bg-gradient-to-br from-green-900/10 to-transparent border border-green-500/20 relative overflow-hidden group hover:border-green-500/40 transition-colors">
                            <div className="absolute right-[-20px] top-[-20px] p-4 opacity-5 group-hover:opacity-10 transition-opacity"><Zap size={120} /></div>
                            <div className="relative z-10">
                                <div className="w-12 h-12 bg-green-500/20 rounded-2xl flex items-center justify-center mb-4 text-green-400">
                                    <Zap size={24} />
                                </div>
                                <h3 className="text-xl font-bold text-white mb-2">Lightning Fast Payouts</h3>
                                <p className="text-sm text-gray-400 leading-relaxed">
                                    No more waiting days for your money. Our automated payment gateway processes withdrawals to local banks and crypto wallets in minutes.
                                </p>
                            </div>
                        </div>

                        <div className="p-6 rounded-3xl bg-gradient-to-br from-purple-900/10 to-transparent border border-purple-500/20 relative overflow-hidden group hover:border-purple-500/40 transition-colors">
                            <div className="absolute right-[-20px] top-[-20px] p-4 opacity-5 group-hover:opacity-10 transition-opacity"><Star size={120} /></div>
                            <div className="relative z-10">
                                <div className="w-12 h-12 bg-purple-500/20 rounded-2xl flex items-center justify-center mb-4 text-purple-400">
                                    <Star size={24} />
                                </div>
                                <h3 className="text-xl font-bold text-white mb-2">Zero Risk Earning</h3>
                                <p className="text-sm text-gray-400 leading-relaxed">
                                    Start earning immediately without depositing a single cent using our Micro-Task Center and Referral Program.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Trust Footer */}
                <div className="text-center pb-8 border-t border-white/5 pt-12">
                    <p className="text-xs text-gray-500 mb-6 uppercase tracking-widest font-bold">Supported Payments</p>
                    <div className="flex justify-center gap-8 opacity-40 grayscale hover:grayscale-0 transition-all duration-500">
                        {/* Simple text representation for speed */}
                        <div className="text-xl font-black text-white">BINANCE</div>
                        <div className="text-xl font-black text-white">BKASH</div>
                        <div className="text-xl font-black text-white">NAGAD</div>
                    </div>
                    <p className="text-[10px] text-gray-600 mt-12">© 2024 Naxxivo Inc. All rights reserved.</p>
                </div>
             </div>
             
             {/* Sticky CTA */}
             <div className="fixed bottom-6 left-6 right-6 z-50">
                 <Link to="/signup" className="w-full py-4 bg-brand text-white font-bold rounded-2xl shadow-[0_10px_40px_rgba(0,85,255,0.4)] flex items-center justify-center gap-2 animate-bounce-subtle border border-white/10 backdrop-blur-xl">
                    Create Free Account
                 </Link>
             </div>
        </div>
      );
  }

  return (
    <MotionDiv variants={container} initial="hidden" animate="show" className="space-y-6 px-4 pb-20 pt-2">
      {user && <DailyBonus userId={user.id} />}

      <MotionDiv variants={item} className="flex items-center justify-between">
          <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-input border border-border-base rounded-full flex items-center justify-center font-bold text-lg text-main">
                  {user?.name_1?.charAt(0)}
              </div>
              <div>
                  <h2 className="font-bold text-main leading-none">{user?.name_1 || 'User'}</h2>
                  <span className="text-xs text-muted">Level {user?.level_1 || 1}</span>
              </div>
          </div>
          <Link to="/profile" className="text-xs text-brand font-bold hover:underline">View Profile</Link>
      </MotionDiv>

      <MotionDiv variants={item}>
        <GlassCard className="p-6">
            <div className="flex justify-between items-start mb-6">
                <div>
                    <p className="text-xs text-muted font-bold uppercase mb-1">Total Assets</p>
                    <h1 className="text-3xl font-bold text-main tracking-tight"><BalanceDisplay amount={wallet?.balance || 0} /></h1>
                </div>
                <div className="bg-success/10 text-success px-2 py-1 rounded text-xs font-bold border border-success/20">
                    ACTIVE
                </div>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-6">
                <div className="bg-input p-3 rounded border border-border-base">
                    <p className="text-[10px] text-muted uppercase font-bold">Deposit</p>
                    <p className="font-bold text-main font-mono"><BalanceDisplay amount={wallet?.deposit || 0} /></p>
                </div>
                <div className="bg-input p-3 rounded border border-border-base">
                    <p className="text-[10px] text-muted uppercase font-bold">Earned</p>
                    <p className="font-bold text-success font-mono"><BalanceDisplay amount={wallet?.total_earning || 0} /></p>
                </div>
            </div>

            <div className="flex gap-3">
                {isFeatureEnabled('is_deposit_enabled') ? (
                    <Link to="/deposit" className="flex-1 py-3 bg-main text-void font-bold text-sm rounded flex items-center justify-center gap-2 hover:opacity-90">
                      <ArrowDownLeft size={16} /> Deposit
                    </Link>
                ) : <button disabled className="flex-1 py-3 bg-input text-muted rounded font-bold text-sm cursor-not-allowed">Deposit</button>}
                
                {isFeatureEnabled('is_withdraw_enabled') ? (
                    <Link to="/withdraw" className="flex-1 py-3 bg-input border border-border-base text-main font-bold text-sm rounded flex items-center justify-center gap-2 hover:bg-border-base">
                      <ArrowUpRight size={16} /> Withdraw
                    </Link>
                ) : <button disabled className="flex-1 py-3 bg-input text-muted rounded font-bold text-sm cursor-not-allowed">Withdraw</button>}
            </div>
        </GlassCard>
      </MotionDiv>

      <MotionDiv variants={item}>
        <div className="grid grid-cols-4 gap-3">
            {/* 1. Invite */}
            {isFeatureEnabled('is_invite_enabled') && (
              <Link to="/invite" className="flex flex-col items-center gap-2 group cursor-pointer">
                <div className="w-full aspect-square rounded-2xl overflow-hidden shadow-lg border border-border-base group-hover:scale-105 transition-transform bg-card relative">
                    <SmartImage src="https://tyhujeggtfpbkpywtrox.supabase.co/storage/v1/object/public/Png%20icons/INVITE%204K.jpg" alt="Invite" className="w-full h-full object-cover" />
                </div>
                <span className="text-[10px] font-bold text-muted uppercase group-hover:text-main transition-colors">Invite</span>
              </Link>
            )}

            {/* 2. Games */}
            {isFeatureEnabled('is_games_enabled') && (
              <Link to="/games" className="flex flex-col items-center gap-2 group cursor-pointer">
                <div className="w-full aspect-square rounded-2xl overflow-hidden shadow-lg border border-border-base group-hover:scale-105 transition-transform bg-card relative">
                    <SmartImage src="https://tyhujeggtfpbkpywtrox.supabase.co/storage/v1/object/public/Png%20icons/GAMES%204K.jpg" alt="Games" className="w-full h-full object-cover" />
                </div>
                <span className="text-[10px] font-bold text-muted uppercase group-hover:text-main transition-colors">Games</span>
              </Link>
            )}

            {/* 3. Rank (Leaderboard) */}
            <Link to="/leaderboard" className="flex flex-col items-center gap-2 group cursor-pointer">
              <div className="w-full aspect-square rounded-2xl overflow-hidden shadow-lg border border-border-base group-hover:scale-105 transition-transform bg-card relative">
                  <SmartImage src="https://tyhujeggtfpbkpywtrox.supabase.co/storage/v1/object/public/Png%20icons/RANK%204K.jpg" alt="Rank" className="w-full h-full object-cover" />
              </div>
              <span className="text-[10px] font-bold text-muted uppercase group-hover:text-main transition-colors">Rank</span>
            </Link>

            {/* 4. Task */}
            {isFeatureEnabled('is_tasks_enabled') && (
              <Link to="/tasks" className="flex flex-col items-center gap-2 group cursor-pointer">
                <div className="w-full aspect-square rounded-2xl overflow-hidden shadow-lg border border-border-base group-hover:scale-105 transition-transform bg-card relative">
                    <SmartImage src="https://tyhujeggtfpbkpywtrox.supabase.co/storage/v1/object/public/Png%20icons/TASKS%204K.jpg" alt="Tasks" className="w-full h-full object-cover" />
                </div>
                <span className="text-[10px] font-bold text-muted uppercase group-hover:text-main transition-colors">Tasks</span>
              </Link>
            )}
        </div>
      </MotionDiv>

      <MotionDiv variants={item}>
         <div className="flex justify-between items-center mb-2 px-1">
            <h3 className="text-xs font-bold text-muted uppercase">Recent Activity</h3>
            <Link to="/wallet" className="text-[10px] text-brand font-bold hover:underline">See All</Link>
         </div>
         <div className="space-y-2">
            {activities.length === 0 ? <p className="text-sm text-muted px-1">No recent activity.</p> : activities.map((act) => (
                <div key={act.id} className="flex justify-between items-center p-3 bg-card border border-border-base rounded hover:bg-input transition-colors">
                    <div>
                        <p className="font-bold text-xs text-main uppercase">{act.title}</p>
                        <p className="text-[10px] text-muted">{new Date(act.time).toLocaleDateString()}</p>
                    </div>
                    <span className={`text-xs font-mono font-bold ${['withdraw', 'game_loss', 'invest'].includes(act.type) ? 'text-muted' : 'text-success'}`}>
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