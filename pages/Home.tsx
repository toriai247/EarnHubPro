
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  ArrowDownLeft, ArrowUpRight
} from 'lucide-react';
import GlassCard from '../components/GlassCard';
import BalanceDisplay from '../components/BalanceDisplay';
import DailyBonus from '../components/DailyBonus';
import { Activity, WalletData, UserProfile } from '../types';
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
        <div className="space-y-6 px-4 pt-6">
            <div className="bg-card border border-border-base p-8 rounded-xl text-center shadow-sm">
                <h1 className="text-2xl font-bold text-main mb-2">EARNHUB PRO</h1>
                <p className="text-muted text-sm mb-6">Secure Earning Platform</p>
                <div className="flex flex-col gap-3 max-w-xs mx-auto">
                    <Link to="/signup" className="py-3 bg-brand text-white rounded font-bold hover:bg-brand-hover">Start Earning</Link>
                    <Link to="/login" className="py-3 bg-input border border-border-base text-main rounded font-bold hover:bg-border-highlight">Login</Link>
                </div>
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
                    <img src="https://tyhujeggtfpbkpywtrox.supabase.co/storage/v1/object/public/Png%20icons/INVITE%204K.jpg" alt="Invite" className="w-full h-full object-cover" />
                </div>
                <span className="text-[10px] font-bold text-muted uppercase group-hover:text-main transition-colors">Invite</span>
              </Link>
            )}

            {/* 2. Games */}
            {isFeatureEnabled('is_games_enabled') && (
              <Link to="/games" className="flex flex-col items-center gap-2 group cursor-pointer">
                <div className="w-full aspect-square rounded-2xl overflow-hidden shadow-lg border border-border-base group-hover:scale-105 transition-transform bg-card relative">
                    <img src="https://tyhujeggtfpbkpywtrox.supabase.co/storage/v1/object/public/Png%20icons/GAMES%204K.jpg" alt="Games" className="w-full h-full object-cover" />
                </div>
                <span className="text-[10px] font-bold text-muted uppercase group-hover:text-main transition-colors">Games</span>
              </Link>
            )}

            {/* 3. Rank (Leaderboard) */}
            <Link to="/leaderboard" className="flex flex-col items-center gap-2 group cursor-pointer">
              <div className="w-full aspect-square rounded-2xl overflow-hidden shadow-lg border border-border-base group-hover:scale-105 transition-transform bg-card relative">
                  <img src="https://tyhujeggtfpbkpywtrox.supabase.co/storage/v1/object/public/Png%20icons/RANK%204K.jpg" alt="Rank" className="w-full h-full object-cover" />
              </div>
              <span className="text-[10px] font-bold text-muted uppercase group-hover:text-main transition-colors">Rank</span>
            </Link>

            {/* 4. Task */}
            {isFeatureEnabled('is_tasks_enabled') && (
              <Link to="/tasks" className="flex flex-col items-center gap-2 group cursor-pointer">
                <div className="w-full aspect-square rounded-2xl overflow-hidden shadow-lg border border-border-base group-hover:scale-105 transition-transform bg-card relative">
                    <img src="https://tyhujeggtfpbkpywtrox.supabase.co/storage/v1/object/public/Png%20icons/TASKS%204K.jpg" alt="Tasks" className="w-full h-full object-cover" />
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
