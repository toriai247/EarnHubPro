
import React, { useEffect, useState } from 'react';
import GlassCard from '../components/GlassCard';
import Skeleton from '../components/Skeleton';
import { 
  Edit2, LogOut, LayoutDashboard, Settings, Twitter, Send, 
  Copy, User as UserIcon, Crown, ArrowDownLeft, ArrowUpRight, 
  Wallet as WalletIcon, Users, X, Camera, CheckCircle2, ShieldCheck, RefreshCw, AlertCircle, Zap, Share2, Award, Calendar, ChevronRight, Clock, DollarSign
} from 'lucide-react';
import { UserProfile, WalletData, ReferralStats, Transaction } from '../types';
import { supabase } from '../integrations/supabase/client';
import { useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence, useMotionValue, useTransform } from 'framer-motion';
import { BADGES } from '../constants';
import { createUserProfile } from '../lib/actions';
import BalanceDisplay from '../components/BalanceDisplay';
import { useUI } from '../context/UIContext';

const MotionDiv = motion.div as any;

// --- ANIMATED COMPONENTS ---

const LevelRing = ({ level, xp, nextThreshold, size = 120, children }: any) => {
    const strokeWidth = 6;
    const radius = (size - strokeWidth) / 2;
    const circumference = radius * 2 * Math.PI;
    const progress = Math.min(100, Math.max(0, (xp / nextThreshold) * 100));
    const offset = circumference - (progress / 100) * circumference;

    return (
        <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
            <svg className="absolute inset-0 transform -rotate-90 drop-shadow-[0_0_10px_rgba(59,130,246,0.5)]" width={size} height={size}>
                <circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    stroke="rgba(255,255,255,0.1)"
                    strokeWidth={strokeWidth}
                    fill="transparent"
                />
                <motion.circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    stroke="url(#gradient)"
                    strokeWidth={strokeWidth}
                    fill="transparent"
                    strokeDasharray={circumference}
                    initial={{ strokeDashoffset: circumference }}
                    animate={{ strokeDashoffset: offset }}
                    transition={{ duration: 1.5, ease: "easeOut" }}
                    strokeLinecap="round"
                />
                <defs>
                    <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="#3b82f6" />
                        <stop offset="50%" stopColor="#8b5cf6" />
                        <stop offset="100%" stopColor="#10b981" />
                    </linearGradient>
                </defs>
            </svg>
            
            <div className="relative z-10 w-[calc(100%-20px)] h-[calc(100%-20px)] rounded-full overflow-hidden border-4 border-dark-900 shadow-2xl">
                {children}
            </div>

            <motion.div 
                initial={{ scale: 0, y: 10 }}
                animate={{ scale: 1, y: 0 }}
                transition={{ delay: 0.5, type: 'spring' }}
                className="absolute -bottom-3 bg-dark-900 border border-royal-500 text-white text-[10px] font-black uppercase tracking-wider px-3 py-1 rounded-full shadow-lg z-20 flex items-center gap-1"
            >
                <Crown size={10} className="text-yellow-400" /> LVL {level}
            </motion.div>
        </div>
    );
};

const CyberCard = ({ balance, holder, number }: { balance: number, holder: string, number: string }) => {
    const x = useMotionValue(0);
    const y = useMotionValue(0);
    const rotateX = useTransform(y, [-100, 100], [10, -10]);
    const rotateY = useTransform(x, [-100, 100], [-10, 10]);

    function handleMouse(event: React.MouseEvent) {
        const rect = event.currentTarget.getBoundingClientRect();
        x.set(event.clientX - rect.left - rect.width / 2);
        y.set(event.clientY - rect.top - rect.height / 2);
    }

    return (
        <motion.div 
            style={{ rotateX, rotateY, perspective: 1000 }}
            onMouseMove={handleMouse}
            onMouseLeave={() => { x.set(0); y.set(0); }}
            className="w-full aspect-[1.586/1] rounded-2xl relative group cursor-default"
        >
            <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-slate-900 via-black to-slate-900 border border-white/10 shadow-2xl overflow-hidden transition-shadow duration-300 group-hover:shadow-[0_0_40px_rgba(59,130,246,0.3)]">
                {/* Animated Shine */}
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent skew-x-12 translate-x-[-200%] group-hover:animate-shine" />
                
                {/* Circuit Pattern */}
                <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/circuit-board.png')] opacity-10 mix-blend-overlay"></div>
                
                <div className="absolute inset-0 p-6 flex flex-col justify-between z-10">
                    <div className="flex justify-between items-start">
                        <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-lg bg-electric-500/20 backdrop-blur-md flex items-center justify-center border border-electric-500/50">
                                <Zap className="text-electric-400" fill="currentColor" size={16} />
                            </div>
                            <span className="text-white/80 font-display font-black tracking-widest text-sm">EARNHUB</span>
                        </div>
                        <span className="px-2 py-1 rounded bg-white/10 text-[10px] font-bold text-white border border-white/10 backdrop-blur-sm">PRO</span>
                    </div>

                    <div>
                        <p className="text-blue-300/60 text-[9px] font-bold uppercase tracking-[0.2em] mb-1">Total Assets</p>
                        <h3 className="text-3xl font-mono font-bold text-white tracking-tight drop-shadow-[0_0_10px_rgba(255,255,255,0.3)]">
                            <BalanceDisplay amount={balance} />
                        </h3>
                    </div>

                    <div className="flex justify-between items-end">
                        <div>
                            <p className="text-[8px] text-gray-500 uppercase mb-1 font-bold">Card Holder</p>
                            <p className="text-sm font-bold text-white uppercase tracking-wide truncate max-w-[150px]">{holder || 'ANONYMOUS'}</p>
                        </div>
                        <p className="font-mono text-xs text-gray-400 tracking-widest">**** {number.slice(0, 4)}</p>
                    </div>
                </div>
            </div>
        </motion.div>
    );
};

// --- MAIN PAGE ---

const Profile: React.FC = () => {
  const { toast } = useUI();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [wallet, setWallet] = useState<WalletData | null>(null);
  const [referral, setReferral] = useState<ReferralStats | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'wallet' | 'history' | 'badges'>('overview');
  const navigate = useNavigate();

  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    name_1: '',
    avatar_1: '',
    bio_1: '',
    phone_1: '',
    twitter: '',
    telegram: ''
  });

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (user) {
      setEditForm({
        name_1: user.name_1 || '',
        avatar_1: user.avatar_1 || '',
        bio_1: user.bio_1 || '',
        phone_1: user.phone_1 || '',
        twitter: user.socials_1?.twitter || '',
        telegram: user.socials_1?.telegram || '',
      });
    }
  }, [user]);

  const fetchData = async () => {
    setLoading(true);
    try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
            let { data: profileData } = await supabase.from('profiles').select('*').eq('id', session.user.id).single();
            
            if (!profileData) {
                try {
                   await createUserProfile(session.user.id, session.user.email || '', session.user.user_metadata?.full_name || 'User');
                   const res = await supabase.from('profiles').select('*').eq('id', session.user.id).single();
                   profileData = res.data;
                } catch (e) { console.error("Recovery failed", e); }
            }

            if (profileData) setUser(profileData as UserProfile);

            const [walletRes, refCountRes, refEarnRes, txRes] = await Promise.allSettled([
                supabase.from('wallets').select('*').eq('user_id', session.user.id).single(),
                supabase.from('referrals').select('*', {count: 'exact', head: true}).eq('referrer_id', session.user.id),
                supabase.from('referrals').select('earned').eq('referrer_id', session.user.id),
                supabase.from('transactions').select('*').eq('user_id', session.user.id).order('created_at', { ascending: false }).limit(20)
            ]);

            if (walletRes.status === 'fulfilled' && walletRes.value.data) setWallet(walletRes.value.data as WalletData);

            let count = 0;
            let totalEarned = 0;
            if (refCountRes.status === 'fulfilled') count = refCountRes.value.count || 0;
            if (refEarnRes.status === 'fulfilled' && refEarnRes.value.data) {
                totalEarned = refEarnRes.value.data.reduce((acc: number, r: any) => acc + r.earned, 0);
            }

            setReferral({
                code: profileData ? profileData.ref_code_1 : '---',
                invitedUsers: count,
                totalEarned
            });

            if (txRes.status === 'fulfilled' && txRes.value.data) setTransactions(txRes.value.data as Transaction[]);
        }
    } catch (e) { console.error(e); } 
    finally { setLoading(false); }
  };

  const handleUpdateProfile = async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase.from('profiles')
          .update({
            name_1: editForm.name_1,
            avatar_1: editForm.avatar_1,
            bio_1: editForm.bio_1,
            phone_1: editForm.phone_1,
            socials_1: { twitter: editForm.twitter, telegram: editForm.telegram, discord: user.socials_1?.discord || '' }
          })
          .eq('id', user.id).select().single();

      if (error) throw error;
      setUser(data as UserProfile);
      setIsEditing(false);
      toast.success("Profile Updated Successfully!");
    } catch (e: any) { toast.error(e.message); }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  const copyToClipboard = (text: string) => {
      navigator.clipboard.writeText(text);
      toast.success("Copied to clipboard!");
  };

  const nextLevelThreshold = (user?.level_1 || 1) * 500;

  const containerVariants = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.05 } }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 }
  };

  if (loading) {
      return (
        <div className="pb-24 sm:pl-20 sm:pt-6 space-y-6">
            <Skeleton className="w-full h-48 rounded-2xl" />
            <div className="grid grid-cols-2 gap-4">
                <Skeleton className="w-full h-32 rounded-xl" />
                <Skeleton className="w-full h-32 rounded-xl" />
            </div>
            <Skeleton className="w-full h-64 rounded-2xl" />
        </div>
      );
  }

  return (
    <MotionDiv 
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="pb-24 sm:pl-20 sm:pt-6 space-y-6 px-4 sm:px-0"
    >
        {/* Top Section: Card & Profile */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <MotionDiv variants={itemVariants}>
                {wallet && (
                    <CyberCard 
                        balance={wallet.balance} 
                        holder={user?.name_1 || 'User'} 
                        number={user?.id || '0000'} 
                    />
                )}
            </MotionDiv>

            <MotionDiv variants={itemVariants}>
                <GlassCard className="h-full flex flex-col justify-center relative overflow-hidden">
                    <div className="flex items-center gap-4 relative z-10">
                        <LevelRing level={user?.level_1 || 1} xp={user?.xp_1 || 0} nextThreshold={nextLevelThreshold} size={80}>
                            <img src={user?.avatar_1 || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.name_1}`} alt="Avatar" className="w-full h-full object-cover" />
                        </LevelRing>
                        <div className="flex-1">
                            {isEditing ? (
                                <div className="space-y-2">
                                    <input value={editForm.name_1} onChange={e => setEditForm({...editForm, name_1: e.target.value})} className="w-full bg-black/30 border border-white/10 rounded px-2 py-1 text-sm text-white" placeholder="Name" />
                                    <button onClick={handleUpdateProfile} className="text-xs bg-green-500 text-black px-3 py-1 rounded font-bold">Save</button>
                                </div>
                            ) : (
                                <>
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <h2 className="text-xl font-bold text-white">{user?.name_1 || 'User'}</h2>
                                            <p className="text-xs text-gray-400">{user?.email_1}</p>
                                        </div>
                                        <button onClick={() => setIsEditing(true)} className="p-1.5 bg-white/10 rounded text-gray-400 hover:text-white"><Edit2 size={14}/></button>
                                    </div>
                                    <div className="mt-2 flex gap-2">
                                        <span className="text-[10px] bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded border border-blue-500/30 font-bold">{user?.rank_1 || 'Bronze'}</span>
                                        {user?.is_kyc_1 && <span className="text-[10px] bg-green-500/20 text-green-400 px-2 py-0.5 rounded border border-green-500/30 font-bold flex items-center gap-1"><CheckCircle2 size={10}/> Verified</span>}
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                </GlassCard>
            </MotionDiv>
        </div>

        {/* Action Buttons */}
        <MotionDiv variants={itemVariants} className="grid grid-cols-2 sm:grid-cols-4 gap-3">
             <Link to="/wallet" className="p-3 bg-white/5 border border-white/5 rounded-xl flex flex-col items-center justify-center hover:bg-white/10 transition group">
                 <WalletIcon size={24} className="text-blue-400 mb-1 group-hover:scale-110 transition"/>
                 <span className="text-xs font-bold text-gray-400">Wallet</span>
             </Link>
             <button onClick={() => copyToClipboard(referral?.code || '')} className="p-3 bg-white/5 border border-white/5 rounded-xl flex flex-col items-center justify-center hover:bg-white/10 transition group">
                 <Copy size={24} className="text-purple-400 mb-1 group-hover:scale-110 transition"/>
                 <span className="text-xs font-bold text-gray-400">Ref Code</span>
             </button>
             <Link to="/biometric-setup" className="p-3 bg-white/5 border border-white/5 rounded-xl flex flex-col items-center justify-center hover:bg-white/10 transition group">
                 <ShieldCheck size={24} className="text-green-400 mb-1 group-hover:scale-110 transition"/>
                 <span className="text-xs font-bold text-gray-400">Security</span>
             </Link>
             <button onClick={handleLogout} className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl flex flex-col items-center justify-center hover:bg-red-500/20 transition group">
                 <LogOut size={24} className="text-red-400 mb-1 group-hover:scale-110 transition"/>
                 <span className="text-xs font-bold text-red-400">Logout</span>
             </button>
        </MotionDiv>

        {/* Content Tabs */}
        <MotionDiv variants={itemVariants}>
            <div className="flex gap-4 border-b border-white/10 mb-4">
                {['overview', 'wallet', 'history', 'badges'].map(tab => (
                    <button 
                        key={tab} 
                        onClick={() => setActiveTab(tab as any)}
                        className={`pb-2 text-sm font-bold capitalize transition border-b-2 ${activeTab === tab ? 'text-white border-electric-500' : 'text-gray-500 border-transparent hover:text-gray-300'}`}
                    >
                        {tab}
                    </button>
                ))}
            </div>

            <div className="min-h-[300px]">
                {activeTab === 'overview' && (
                    <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="bg-black/20 p-4 rounded-xl border border-white/5">
                                <p className="text-xs text-gray-500 uppercase font-bold">Referrals</p>
                                <p className="text-2xl font-bold text-white">{referral?.invitedUsers}</p>
                            </div>
                            <div className="bg-black/20 p-4 rounded-xl border border-white/5">
                                <p className="text-xs text-gray-500 uppercase font-bold">Ref Earnings</p>
                                <p className="text-2xl font-bold text-neon-green"><BalanceDisplay amount={referral?.totalEarned || 0} /></p>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'wallet' && wallet && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="p-3 bg-white/5 rounded-xl flex justify-between items-center">
                            <span className="text-sm text-gray-400">Main Wallet</span>
                            <span className="text-white font-bold font-mono"><BalanceDisplay amount={wallet.main_balance} /></span>
                        </div>
                        <div className="p-3 bg-white/5 rounded-xl flex justify-between items-center">
                            <span className="text-sm text-gray-400">Game Wallet</span>
                            <span className="text-white font-bold font-mono"><BalanceDisplay amount={wallet.game_balance} /></span>
                        </div>
                        <div className="p-3 bg-white/5 rounded-xl flex justify-between items-center">
                            <span className="text-sm text-gray-400">Deposit Wallet</span>
                            <span className="text-white font-bold font-mono"><BalanceDisplay amount={wallet.deposit_balance} /></span>
                        </div>
                        <div className="p-3 bg-white/5 rounded-xl flex justify-between items-center">
                            <span className="text-sm text-gray-400">Bonus Wallet</span>
                            <span className="text-white font-bold font-mono"><BalanceDisplay amount={wallet.bonus_balance} /></span>
                        </div>
                    </div>
                )}

                {activeTab === 'history' && (
                    <div className="space-y-2">
                        {transactions.map(tx => (
                            <div key={tx.id} className="p-3 bg-white/5 rounded-xl flex justify-between items-center">
                                <div>
                                    <p className="text-sm font-bold text-white capitalize">{tx.description || tx.type}</p>
                                    <p className="text-[10px] text-gray-500">{new Date(tx.created_at).toLocaleDateString()}</p>
                                </div>
                                <span className={`font-mono font-bold ${['deposit', 'earn'].includes(tx.type) ? 'text-green-400' : 'text-white'}`}>
                                    {['deposit', 'earn'].includes(tx.type) ? '+' : '-'}<BalanceDisplay amount={tx.amount} />
                                </span>
                            </div>
                        ))}
                    </div>
                )}

                {activeTab === 'badges' && (
                    <div className="grid grid-cols-2 gap-4">
                        {BADGES.map(badge => {
                            const hasBadge = user?.badges_1?.includes(badge.id);
                            return (
                                <div key={badge.id} className={`p-4 rounded-xl border ${hasBadge ? 'bg-electric-500/10 border-electric-500/30' : 'bg-white/5 border-white/5 opacity-50'}`}>
                                    <div className="text-2xl mb-2">{badge.icon}</div>
                                    <h4 className={`font-bold text-sm ${hasBadge ? 'text-white' : 'text-gray-400'}`}>{badge.name}</h4>
                                    <p className="text-[10px] text-gray-500 leading-tight mt-1">{badge.description}</p>
                                </div>
                            )
                        })}
                    </div>
                )}
            </div>
        </MotionDiv>
    </MotionDiv>
  );
};

export default Profile;
