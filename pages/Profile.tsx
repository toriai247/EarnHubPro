
import React, { useEffect, useState } from 'react';
import GlassCard from '../components/GlassCard';
import Skeleton from '../components/Skeleton';
import { 
  Edit2, LogOut, Bell, Shield, Settings, Twitter, Send, LayoutDashboard, 
  Copy, Award, Zap, CreditCard, Smartphone, Lock, ChevronRight, X, 
  User as UserIcon, Crown, History, ArrowDownLeft, ArrowUpRight, 
  Wallet as WalletIcon, Users, XCircle, Camera, CheckCircle2, ShieldCheck
} from 'lucide-react';
import { UserProfile, WalletData, ReferralStats, Transaction } from '../types';
import { supabase } from '../integrations/supabase/client';
import { useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { BADGES } from '../constants';
import { createUserProfile } from '../lib/actions';

// --- COMPONENTS ---

const LevelRing = ({ level, xp, nextThreshold, size = 120, children }: any) => {
    const strokeWidth = 4;
    const radius = (size - strokeWidth) / 2;
    const circumference = radius * 2 * Math.PI;
    const progress = Math.min(100, Math.max(0, (xp / nextThreshold) * 100));
    const offset = circumference - (progress / 100) * circumference;

    return (
        <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
            {/* Background Ring */}
            <svg className="absolute inset-0 transform -rotate-90" width={size} height={size}>
                <circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    stroke="rgba(255, 255, 255, 0.1)"
                    strokeWidth={strokeWidth}
                    fill="transparent"
                />
                {/* Progress Ring */}
                <circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    stroke="url(#gradient)"
                    strokeWidth={strokeWidth}
                    fill="transparent"
                    strokeDasharray={circumference}
                    strokeDashoffset={offset}
                    strokeLinecap="round"
                    style={{ transition: 'stroke-dashoffset 1s ease-in-out' }}
                />
                <defs>
                    <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="#3b82f6" />
                        <stop offset="100%" stopColor="#10b981" />
                    </linearGradient>
                </defs>
            </svg>
            
            {/* Avatar Container */}
            <div className="relative z-10 w-[calc(100%-16px)] h-[calc(100%-16px)] rounded-full overflow-hidden border-4 border-dark-950">
                {children}
            </div>

            {/* Level Badge */}
            <div className="absolute -bottom-2 bg-dark-900 border border-royal-500/50 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-lg z-20">
                LVL {level}
            </div>
        </div>
    );
};

const CyberCard = ({ balance, holder, number }: { balance: number, holder: string, number: string }) => (
    <div className="relative w-full aspect-[1.586/1] rounded-2xl overflow-hidden bg-gradient-to-br from-slate-900 to-slate-800 border border-white/10 shadow-2xl group">
        {/* Holographic Effect */}
        <div className="absolute inset-0 opacity-30 bg-[linear-gradient(110deg,transparent_25%,rgba(255,255,255,0.2)_50%,transparent_75%)] bg-[length:250%_100%] animate-shimmer"></div>
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/circuit-board.png')] opacity-20 mix-blend-overlay"></div>
        
        <div className="absolute inset-0 p-6 flex flex-col justify-between z-10">
            <div className="flex justify-between items-start">
                <div className="w-10 h-10 rounded-lg bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/20">
                    <Zap className="text-neon-green" fill="currentColor" size={20} />
                </div>
                <span className="text-royal-300 font-mono text-xs tracking-widest">EARNHUB PRO</span>
            </div>

            <div>
                <p className="text-gray-400 text-[10px] uppercase tracking-wider mb-1">Total Asset Balance</p>
                <h3 className="text-3xl font-display font-bold text-white tracking-tight text-shadow-glow">
                    ${balance.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </h3>
            </div>

            <div className="flex justify-between items-end">
                <div>
                    <p className="text-[9px] text-gray-500 uppercase mb-0.5">Card Holder</p>
                    <p className="text-sm font-bold text-white uppercase tracking-wide">{holder || 'ANONYMOUS'}</p>
                </div>
                <p className="font-mono text-xs text-gray-400">**** {number.slice(0, 4)}</p>
            </div>
        </div>
    </div>
);

// --- MAIN PAGE ---

const Profile: React.FC = () => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [wallet, setWallet] = useState<WalletData | null>(null);
  const [referral, setReferral] = useState<ReferralStats | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'wallet' | 'history' | 'badges'>('overview');
  const navigate = useNavigate();

  // Edit Form State
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
                supabase.from('transactions').select('*').eq('user_id', session.user.id).order('created_at', { ascending: false }).limit(15)
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
    } catch (e: any) { alert(e.message); }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  const copyToClipboard = (text: string) => {
      navigator.clipboard.writeText(text);
      // Could use a toast here
  };

  const nextLevelThreshold = (user?.level_1 || 1) * 500;

  if (loading) {
      return (
          <div className="pb-24 sm:pl-20 sm:pt-6 px-4 space-y-6">
              <div className="flex flex-col items-center pt-10">
                  <Skeleton variant="circular" className="w-32 h-32" />
                  <Skeleton variant="text" className="w-48 h-8 mt-4" />
                  <Skeleton variant="text" className="w-24 h-4 mt-2" />
              </div>
              <Skeleton variant="rectangular" className="w-full h-40" />
              <div className="grid grid-cols-2 gap-4">
                  <Skeleton variant="rectangular" className="h-24" />
                  <Skeleton variant="rectangular" className="h-24" />
              </div>
          </div>
      );
  }

  if (!user || !wallet) return null;

  return (
    <div className="pb-24 sm:pl-20 sm:pt-6 min-h-screen relative overflow-x-hidden">
        {/* Background FX */}
        <div className="fixed top-0 left-0 w-full h-[50vh] bg-gradient-to-b from-royal-900/20 to-transparent pointer-events-none z-0"></div>
        
        {/* --- PROFILE HEADER --- */}
        <div className="relative z-10 flex flex-col items-center pt-8 pb-6 px-4 text-center">
            <div className="relative group">
                <LevelRing level={user.level_1} xp={user.xp_1} nextThreshold={nextLevelThreshold}>
                    <img 
                        src={user.avatar_1 || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.name_1}`} 
                        alt="User" 
                        className="w-full h-full object-cover bg-black/50"
                    />
                </LevelRing>
                <button 
                    onClick={() => setIsEditing(true)}
                    className="absolute bottom-0 right-0 p-2 bg-white text-black rounded-full shadow-lg hover:scale-110 transition"
                >
                    <Edit2 size={14} />
                </button>
            </div>

            <h1 className="text-2xl font-display font-bold text-white mt-3 mb-1">{user.name_1}</h1>
            <div className="flex items-center gap-2 mb-4">
                <span className="text-xs text-royal-300">@{user.email_1.split('@')[0]}</span>
                {user.is_kyc_1 && <ShieldCheck size={14} className="text-green-400" />}
            </div>

            {/* Quick Actions */}
            <div className="flex gap-3">
                <Link to="/admin" className="p-2.5 rounded-xl bg-white/5 border border-white/10 text-gray-400 hover:bg-white/10 hover:text-white transition">
                    <LayoutDashboard size={20} />
                </Link>
                <button onClick={() => navigate('/support')} className="p-2.5 rounded-xl bg-white/5 border border-white/10 text-gray-400 hover:bg-white/10 hover:text-white transition">
                    <Settings size={20} />
                </button>
                <button onClick={handleLogout} className="p-2.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 transition">
                    <LogOut size={20} />
                </button>
            </div>
        </div>

        {/* --- TAB NAVIGATION --- */}
        <div className="sticky top-0 z-30 bg-dark-950/80 backdrop-blur-md border-b border-white/5 px-4 mb-6">
            <div className="flex overflow-x-auto no-scrollbar gap-6">
                {[
                    { id: 'overview', label: 'Overview' },
                    { id: 'wallet', label: 'Wallet' },
                    { id: 'history', label: 'History' },
                    { id: 'badges', label: 'Badges' },
                ].map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id as any)}
                        className={`py-4 text-sm font-bold relative transition-colors ${
                            activeTab === tab.id ? 'text-white' : 'text-gray-500 hover:text-gray-300'
                        }`}
                    >
                        {tab.label}
                        {activeTab === tab.id && (
                            <motion.div 
                                layoutId="activeTab"
                                className="absolute bottom-0 left-0 right-0 h-0.5 bg-neon-green shadow-[0_0_10px_#10b981]"
                            />
                        )}
                    </button>
                ))}
            </div>
        </div>

        {/* --- CONTENT AREA --- */}
        <div className="px-4 relative z-10 min-h-[400px]">
            <AnimatePresence mode="wait">
                
                {/* OVERVIEW TAB */}
                {activeTab === 'overview' && (
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-4">
                        
                        {/* Bio Card */}
                        <GlassCard className="relative overflow-hidden">
                            <div className="flex justify-between items-start mb-2">
                                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                                    <UserIcon size={16} className="text-royal-400"/> Bio
                                </h3>
                            </div>
                            <p className="text-sm text-gray-400 italic leading-relaxed">
                                "{user.bio_1 || "Digital nomad earning on EarnHub Pro."}"
                            </p>
                        </GlassCard>

                        {/* Stats Grid (Bento) */}
                        <div className="grid grid-cols-2 gap-3">
                            <GlassCard className="bg-gradient-to-br from-royal-900/40 to-transparent border-royal-500/20">
                                <p className="text-[10px] text-royal-300 font-bold uppercase mb-1">Current Rank</p>
                                <div className="flex items-center gap-2">
                                    <Crown size={24} className="text-yellow-400 drop-shadow-md" />
                                    <span className="text-xl font-bold text-white">{user.rank_1 || 'Member'}</span>
                                </div>
                            </GlassCard>
                            
                            <GlassCard className="bg-gradient-to-br from-green-900/40 to-transparent border-green-500/20">
                                <p className="text-[10px] text-green-300 font-bold uppercase mb-1">Referrals</p>
                                <div className="flex items-center gap-2">
                                    <Users size={24} className="text-green-400 drop-shadow-md" />
                                    <span className="text-xl font-bold text-white">{referral?.invitedUsers}</span>
                                </div>
                            </GlassCard>

                            <GlassCard className="col-span-2 flex items-center justify-between">
                                <div>
                                    <p className="text-[10px] text-gray-400 font-bold uppercase mb-1">Next Level Progress</p>
                                    <p className="text-sm text-white"><span className="font-bold text-neon-green">{user.xp_1}</span> / {nextLevelThreshold} XP</p>
                                </div>
                                <div className="w-24 h-2 bg-white/10 rounded-full overflow-hidden">
                                    <div 
                                        className="h-full bg-gradient-to-r from-royal-500 to-neon-green" 
                                        style={{ width: `${Math.min(100, (user.xp_1 / nextLevelThreshold) * 100)}%` }}
                                    ></div>
                                </div>
                            </GlassCard>
                        </div>

                        {/* Socials */}
                        <div className="grid grid-cols-2 gap-3">
                            <a href={user.socials_1?.twitter || '#'} target="_blank" className="flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/10 hover:bg-blue-500/20 hover:border-blue-500/30 transition group">
                                <Twitter size={18} className="text-gray-400 group-hover:text-blue-400" />
                                <span className="text-sm font-medium text-gray-300 group-hover:text-white">Twitter</span>
                            </a>
                            <a href={user.socials_1?.telegram || '#'} target="_blank" className="flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/10 hover:bg-cyan-500/20 hover:border-cyan-500/30 transition group">
                                <Send size={18} className="text-gray-400 group-hover:text-cyan-400" />
                                <span className="text-sm font-medium text-gray-300 group-hover:text-white">Telegram</span>
                            </a>
                        </div>
                    </motion.div>
                )}

                {/* WALLET TAB */}
                {activeTab === 'wallet' && (
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-6">
                        <CyberCard 
                            balance={wallet.balance} 
                            holder={user.name_1 || ''} 
                            number={user.id} 
                        />

                        <div className="grid grid-cols-2 gap-4">
                            <Link to="/deposit" className="flex flex-col items-center justify-center p-4 rounded-2xl bg-neon-green/10 border border-neon-green/30 text-neon-green hover:bg-neon-green hover:text-black transition duration-300 group">
                                <div className="w-10 h-10 rounded-full bg-neon-green/20 flex items-center justify-center mb-2 group-hover:bg-black/20">
                                    <ArrowDownLeft size={20} />
                                </div>
                                <span className="font-bold text-sm">Deposit</span>
                            </Link>
                            <Link to="/withdraw" className="flex flex-col items-center justify-center p-4 rounded-2xl bg-white/5 border border-white/10 text-white hover:bg-white/20 transition duration-300">
                                <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center mb-2">
                                    <ArrowUpRight size={20} />
                                </div>
                                <span className="font-bold text-sm">Withdraw</span>
                            </Link>
                        </div>

                        <GlassCard>
                            <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
                                <Users size={16} className="text-purple-400"/> Referral Earnings
                            </h3>
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-2xl font-bold text-white">${referral?.totalEarned.toFixed(2)}</p>
                                    <p className="text-xs text-gray-500">From {referral?.invitedUsers} friends</p>
                                </div>
                                <button 
                                    onClick={() => copyToClipboard(user.ref_code_1)}
                                    className="px-4 py-2 bg-purple-500/20 text-purple-400 border border-purple-500/30 rounded-lg text-xs font-bold hover:bg-purple-500/30 transition flex items-center gap-2"
                                >
                                    <Copy size={14} /> {user.ref_code_1}
                                </button>
                            </div>
                        </GlassCard>
                    </motion.div>
                )}

                {/* HISTORY TAB */}
                {activeTab === 'history' && (
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-3">
                        {transactions.length === 0 ? (
                            <div className="text-center py-12 text-gray-500">No transactions yet.</div>
                        ) : (
                            transactions.map((tx) => (
                                <div key={tx.id} className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/5">
                                    <div className="flex items-center gap-3">
                                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                                            tx.type === 'deposit' ? 'bg-green-500/20 text-green-400' :
                                            tx.type === 'withdraw' ? 'bg-white/10 text-white' :
                                            tx.type.includes('game') ? 'bg-purple-500/20 text-purple-400' :
                                            'bg-blue-500/20 text-blue-400'
                                        }`}>
                                            {tx.type === 'deposit' ? <ArrowDownLeft size={18}/> : 
                                             tx.type === 'withdraw' ? <ArrowUpRight size={18}/> : 
                                             <WalletIcon size={18}/>}
                                        </div>
                                        <div>
                                            <p className="text-sm font-bold text-white capitalize">{tx.type.replace('_', ' ')}</p>
                                            <p className="text-[10px] text-gray-500">{new Date(tx.created_at).toLocaleDateString()}</p>
                                        </div>
                                    </div>
                                    <span className={`font-mono font-bold text-sm ${
                                        ['deposit', 'earn', 'bonus', 'game_win', 'referral'].includes(tx.type) ? 'text-neon-green' : 'text-white'
                                    }`}>
                                        {['deposit', 'earn', 'bonus', 'game_win', 'referral'].includes(tx.type) ? '+' : '-'}${tx.amount.toFixed(2)}
                                    </span>
                                </div>
                            ))
                        )}
                    </motion.div>
                )}

                {/* BADGES TAB */}
                {activeTab === 'badges' && (
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="grid grid-cols-2 gap-3">
                        {BADGES.map(badge => {
                            const isEarned = (user.badges_1 || []).includes(badge.id) || badge.id === 'early_adopter';
                            return (
                                <div key={badge.id} className={`p-4 rounded-xl border flex flex-col items-center text-center transition-all ${
                                    isEarned ? 'bg-gradient-to-b from-white/10 to-transparent border-neon-green/30' : 'bg-white/5 border-white/5 opacity-50 grayscale'
                                }`}>
                                    <div className="text-3xl mb-2 drop-shadow-lg">{badge.icon}</div>
                                    <h4 className="font-bold text-white text-xs">{badge.name}</h4>
                                    {isEarned && <span className="mt-1 text-[9px] bg-neon-green text-black px-1.5 py-0.5 rounded font-bold">UNLOCKED</span>}
                                </div>
                            )
                        })}
                    </motion.div>
                )}

            </AnimatePresence>
        </div>

        {/* --- EDIT PROFILE SLIDE-UP DRAWER --- */}
        <AnimatePresence>
            {isEditing && (
                <div className="fixed inset-0 z-50 flex justify-end sm:items-center sm:justify-center">
                    <motion.div 
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
                        onClick={() => setIsEditing(false)}
                    />
                    <motion.div 
                        initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
                        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                        className="relative z-10 w-full sm:max-w-md bg-dark-900 border-t sm:border border-white/10 rounded-t-3xl sm:rounded-3xl p-6 max-h-[85vh] overflow-y-auto custom-scrollbar"
                    >
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-xl font-bold text-white">Edit Profile</h2>
                            <button onClick={() => setIsEditing(false)} className="p-2 bg-white/5 rounded-full text-gray-400 hover:text-white transition"><X size={20}/></button>
                        </div>

                        <div className="space-y-4">
                            <div className="text-center mb-4">
                                <div className="w-20 h-20 mx-auto rounded-full bg-black border-2 border-white/10 relative overflow-hidden group">
                                    <img src={editForm.avatar_1 || user.avatar_1 || ''} alt="" className="w-full h-full object-cover" />
                                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition">
                                        <Camera size={20} className="text-white"/>
                                    </div>
                                </div>
                                <p className="text-[10px] text-gray-500 mt-2">Avatar updates via URL</p>
                            </div>

                            <div className="space-y-3">
                                <input 
                                    type="text" 
                                    value={editForm.name_1} 
                                    onChange={e => setEditForm({...editForm, name_1: e.target.value})} 
                                    className="w-full bg-black/40 border border-white/10 rounded-xl p-4 text-white text-sm focus:border-neon-green outline-none transition"
                                    placeholder="Display Name"
                                />
                                <input 
                                    type="text" 
                                    value={editForm.avatar_1} 
                                    onChange={e => setEditForm({...editForm, avatar_1: e.target.value})} 
                                    className="w-full bg-black/40 border border-white/10 rounded-xl p-4 text-white text-sm focus:border-neon-green outline-none transition"
                                    placeholder="Avatar URL (https://...)"
                                />
                                <textarea 
                                    value={editForm.bio_1} 
                                    onChange={e => setEditForm({...editForm, bio_1: e.target.value})} 
                                    className="w-full bg-black/40 border border-white/10 rounded-xl p-4 text-white text-sm focus:border-neon-green outline-none transition resize-none h-24"
                                    placeholder="Your Bio..."
                                />
                                <div className="grid grid-cols-2 gap-3">
                                    <input 
                                        type="text" 
                                        value={editForm.twitter} 
                                        onChange={e => setEditForm({...editForm, twitter: e.target.value})} 
                                        className="w-full bg-black/40 border border-white/10 rounded-xl p-4 text-white text-sm focus:border-neon-green outline-none"
                                        placeholder="Twitter URL"
                                    />
                                    <input 
                                        type="text" 
                                        value={editForm.telegram} 
                                        onChange={e => setEditForm({...editForm, telegram: e.target.value})} 
                                        className="w-full bg-black/40 border border-white/10 rounded-xl p-4 text-white text-sm focus:border-neon-green outline-none"
                                        placeholder="Telegram URL"
                                    />
                                </div>
                            </div>

                            <button 
                                onClick={handleUpdateProfile} 
                                className="w-full py-4 mt-4 bg-neon-green text-black font-bold rounded-xl hover:scale-[1.02] transition flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(16,185,129,0.2)]"
                            >
                                <CheckCircle2 size={18} /> Save Changes
                            </button>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    </div>
  );
};

export default Profile;
