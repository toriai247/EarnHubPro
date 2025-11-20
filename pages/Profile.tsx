
import React, { useEffect, useState } from 'react';
import GlassCard from '../components/GlassCard';
import Loader from '../components/Loader';
import Skeleton from '../components/Skeleton';
import { Edit2, LogOut, Bell, Shield, Settings, Twitter, Send, LayoutDashboard, Copy, Award, Zap, CreditCard, Smartphone, Lock, ChevronRight, X, User as UserIcon, Crown, History, ArrowDownLeft, ArrowUpRight, Wallet as WalletIcon, Users, XCircle } from 'lucide-react';
import { UserProfile, WalletData, ReferralStats, Transaction } from '../types';
import { supabase } from '../integrations/supabase/client';
import { useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { BADGES } from '../constants';
import { createUserProfile } from '../lib/actions';

const Profile: React.FC = () => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [wallet, setWallet] = useState<WalletData | null>(null);
  const [referral, setReferral] = useState<ReferralStats | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'wallet' | 'history' | 'security' | 'badges'>('overview');
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

  const [notificationsEnabled, setNotificationsEnabled] = useState(true);

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
            // Attempt to fetch profile first
            let { data: profileData } = await supabase.from('profiles').select('*').eq('id', session.user.id).single();
            
            // Recover if missing
            if (!profileData) {
                try {
                   await createUserProfile(session.user.id, session.user.email || '', session.user.user_metadata?.full_name || 'User');
                   const res = await supabase.from('profiles').select('*').eq('id', session.user.id).single();
                   profileData = res.data;
                } catch (e) {
                   console.error("Recovery failed", e);
                }
            }

            if (profileData) {
                setUser(profileData as UserProfile);
            }

            // Fetch wallet and other stats
            const [walletRes, refCountRes, refEarnRes, txRes] = await Promise.allSettled([
                supabase.from('wallets').select('*').eq('user_id', session.user.id).single(),
                supabase.from('referrals').select('*', {count: 'exact', head: true}).eq('referrer_id', session.user.id),
                supabase.from('referrals').select('earned').eq('referrer_id', session.user.id),
                supabase.from('transactions').select('*').eq('user_id', session.user.id).order('created_at', { ascending: false }).limit(20)
            ]);

            if (walletRes.status === 'fulfilled' && walletRes.value.data) {
                setWallet(walletRes.value.data as WalletData);
            }

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

            if (txRes.status === 'fulfilled' && txRes.value.data) {
                setTransactions(txRes.value.data as Transaction[]);
            }
        }
    } catch (e) {
        console.error(e);
    } finally {
        setLoading(false);
    }
  };

  const handleUpdateProfile = async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
          .from('profiles')
          .update({
            name_1: editForm.name_1,
            avatar_1: editForm.avatar_1,
            bio_1: editForm.bio_1,
            phone_1: editForm.phone_1,
            socials_1: {
              twitter: editForm.twitter,
              telegram: editForm.telegram,
              discord: user.socials_1?.discord || ''
            }
          })
          .eq('id', user.id)
          .select()
          .single();

      if (error) throw error;

      setUser(data as UserProfile);
      setIsEditing(false);
      alert("Profile updated successfully!");
    } catch (e: any) {
      alert(e.message || "An error occurred while updating.");
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  const copyToClipboard = (text: string) => {
      navigator.clipboard.writeText(text);
      alert('Copied to clipboard!');
  };

  if (loading) {
      return (
          <div className="pb-24 sm:pl-20 sm:pt-6 space-y-6 relative">
              {/* Header Skeleton */}
              <div className="h-48 w-full bg-white/5 border-b border-white/5 rounded-b-3xl"></div>
              <div className="px-4 -mt-16 relative z-10">
                  <div className="rounded-2xl bg-white/5 border border-white/5 p-5 flex flex-col items-center pt-12">
                      <Skeleton variant="circular" className="absolute -top-12 w-24 h-24" />
                      <Skeleton variant="text" className="w-40 h-8 mt-4" />
                      <Skeleton variant="text" className="w-24 h-4 mt-2" />
                      <div className="flex gap-2 mt-4">
                          <Skeleton variant="rectangular" className="w-24 h-8" />
                          <Skeleton variant="rectangular" className="w-24 h-8" />
                      </div>
                  </div>
              </div>
              
              {/* Tabs Skeleton */}
              <div className="flex gap-2 px-4">
                  {[1,2,3,4].map(i => <Skeleton key={i} variant="rectangular" className="w-24 h-10" />)}
              </div>

              {/* Content Skeleton */}
              <div className="px-4 space-y-4">
                  <div className="rounded-2xl bg-white/5 border border-white/5 p-5 space-y-4">
                      <Skeleton variant="text" className="w-32" />
                      <Skeleton variant="text" className="w-full h-16" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                      <Skeleton variant="rectangular" className="h-32" />
                      <Skeleton variant="rectangular" className="h-32" />
                  </div>
              </div>
          </div>
      );
  }

  if (!user || !wallet) return <div className="p-8 text-center">
      <p className="text-gray-400 mb-2">Error loading profile.</p>
      <button onClick={fetchData} className="px-4 py-2 bg-royal-600 rounded-lg text-white text-sm">Retry</button>
  </div>;

  const getRankColor = (rank: string) => {
    switch(rank?.toLowerCase()) {
      case 'gold': return 'from-yellow-400 to-yellow-600';
      case 'platinum': return 'from-cyan-400 to-blue-600';
      case 'diamond': return 'from-purple-400 to-pink-600';
      default: return 'from-orange-400 to-red-500'; // Bronze
    }
  };

  const nextLevelThreshold = (user.level_1 || 1) * 500;
  const xpProgress = Math.min(100, (user.xp_1 / nextLevelThreshold) * 100);

  return (
    <div className="pb-24 sm:pl-20 sm:pt-6 space-y-6 relative">
      {/* Header Cover */}
      <div className="h-48 w-full bg-gradient-to-r from-royal-900 to-dark-950 relative overflow-hidden rounded-b-3xl shadow-2xl border-b border-white/5">
         <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
         <div className={`absolute top-4 right-4 px-3 py-1 rounded-full bg-gradient-to-r ${getRankColor(user.rank_1)} text-xs font-bold text-white shadow-lg uppercase tracking-wider flex items-center gap-1`}>
            <Award size={12} /> {user.rank_1 || 'Member'}
         </div>
      </div>

      {/* Profile Header Card */}
      <div className="px-4 -mt-16 relative z-10">
         <GlassCard className="flex flex-col items-center pt-12 pb-6 relative overflow-visible">
             <div className="absolute -top-12 w-24 h-24 rounded-full p-1 bg-dark-900 shadow-xl">
                <img 
                  src={user.avatar_1 || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.name_1}`} 
                  alt="Profile" 
                  className="w-full h-full rounded-full object-cover bg-royal-800"
                />
                <button 
                   onClick={() => setIsEditing(true)}
                   className="absolute bottom-0 right-0 bg-neon-green text-black p-1.5 rounded-full shadow-lg hover:scale-110 transition"
                >
                   <Edit2 size={14} />
                </button>
             </div>
             
             <h1 className="text-2xl font-display font-bold text-white mt-2">{user.name_1}</h1>
             <p className="text-gray-400 text-sm mb-2">@{user.email_1.split('@')[0]}</p>
             
             <div className="flex items-center gap-3 mt-2">
                {user.is_kyc_1 ? (
                    <span className="px-3 py-1 rounded-lg bg-green-500/10 text-green-400 text-xs font-bold border border-green-500/20 flex items-center gap-1">
                        <Shield size={12} /> KYC Verified
                    </span>
                ) : (
                    <span className="px-3 py-1 rounded-lg bg-red-500/10 text-red-400 text-xs font-bold border border-red-500/20 flex items-center gap-1">
                        <Shield size={12} /> Not Verified
                    </span>
                )}
                <span className="px-3 py-1 rounded-lg bg-royal-500/10 text-royal-400 text-xs font-bold border border-royal-500/20 flex items-center gap-1">
                    <Crown size={12} /> Lvl {user.level_1}
                </span>
             </div>
         </GlassCard>
      </div>

      {/* Navigation Tabs */}
      <div className="flex overflow-x-auto px-4 pb-2 gap-2 no-scrollbar">
         {['overview', 'wallet', 'history', 'security', 'badges'].map((tab) => (
             <button
               key={tab}
               onClick={() => setActiveTab(tab as any)}
               className={`px-5 py-2.5 rounded-xl text-sm font-bold capitalize transition whitespace-nowrap ${
                 activeTab === tab ? 'bg-royal-600 text-white shadow-lg shadow-royal-600/30' : 'bg-white/5 text-gray-400 hover:bg-white/10'
               }`}
             >
               {tab}
             </button>
         ))}
      </div>

      {/* Content Area */}
      <div className="px-4 min-h-[300px]">
        <AnimatePresence mode="wait">
            {activeTab === 'overview' && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-4">
                    <GlassCard className="space-y-4">
                        <div className="flex justify-between items-center">
                            <h3 className="font-bold text-white">Bio</h3>
                            <button onClick={() => setIsEditing(true)} className="text-xs text-royal-400 hover:text-white">Edit</button>
                        </div>
                        <p className="text-sm text-gray-400 italic">
                            {user.bio_1 || "No bio added yet. Tell us about yourself!"}
                        </p>
                    </GlassCard>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <GlassCard>
                            <h3 className="font-bold text-white mb-4 flex items-center gap-2"><Zap className="text-yellow-400" size={18}/> Stats</h3>
                            <div className="space-y-3">
                                <div className="flex justify-between text-sm">
                                    <span className="text-gray-400">Level</span>
                                    <span className="text-white font-bold">{user.level_1}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-gray-400">XP Points</span>
                                    <span className="text-white font-bold">{user.xp_1 || 0} XP</span>
                                </div>
                                
                                <div className="pt-2 mt-2 border-t border-white/10">
                                    <div className="flex justify-between text-[10px] text-gray-400 mb-1">
                                        <span>Next Level</span>
                                        <span>{user.xp_1} / {nextLevelThreshold}</span>
                                    </div>
                                    <div className="w-full h-2 bg-black/30 rounded-full overflow-hidden border border-white/5">
                                        <div className="h-full bg-gradient-to-r from-royal-500 to-yellow-500 rounded-full transition-all duration-500" style={{ width: `${xpProgress}%` }}></div>
                                    </div>
                                </div>

                                <div className="flex justify-between text-sm mt-2">
                                    <span className="text-gray-400">Referrals</span>
                                    <span className="text-white font-bold">{referral?.invitedUsers}</span>
                                </div>
                            </div>
                        </GlassCard>

                        <GlassCard>
                            <h3 className="font-bold text-white mb-4 flex items-center gap-2"><Smartphone className="text-blue-400" size={18}/> Contact</h3>
                            <div className="space-y-3">
                                <div className="flex justify-between text-sm">
                                    <span className="text-gray-400">Email</span>
                                    <span className="text-white truncate max-w-[150px]">{user.email_1}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-gray-400">Phone</span>
                                    <span className="text-white">{user.phone_1 || 'Not set'}</span>
                                </div>
                                <div className="flex justify-between text-sm items-center pt-2">
                                    <span className="text-gray-400">Socials</span>
                                    <div className="flex gap-2">
                                        {user.socials_1?.twitter && <a href={user.socials_1.twitter} target="_blank" className="p-1.5 bg-blue-500/20 text-blue-400 rounded-lg"><Twitter size={14}/></a>}
                                        {user.socials_1?.telegram && <a href={user.socials_1.telegram} target="_blank" className="p-1.5 bg-cyan-500/20 text-cyan-400 rounded-lg"><Send size={14}/></a>}
                                        <button onClick={() => setIsEditing(true)} className="p-1.5 bg-white/10 text-gray-400 rounded-lg hover:text-white"><Edit2 size={14}/></button>
                                    </div>
                                </div>
                            </div>
                        </GlassCard>
                    </div>
                    
                    <Link to="/admin" className="block">
                         <GlassCard className="bg-gradient-to-r from-royal-900/50 to-transparent border-royal-500/30 hover:border-neon-green/50 transition group">
                             <div className="flex items-center justify-between">
                                 <div className="flex items-center gap-3">
                                     <div className="p-2 bg-royal-600 rounded-lg text-white group-hover:bg-neon-green group-hover:text-black transition"><LayoutDashboard size={20}/></div>
                                     <div>
                                         <h4 className="font-bold text-white">Admin Panel</h4>
                                         <p className="text-xs text-gray-400">Manage system settings</p>
                                     </div>
                                 </div>
                                 <ChevronRight className="text-gray-500 group-hover:text-white" size={20} />
                             </div>
                         </GlassCard>
                    </Link>
                </motion.div>
            )}

            {activeTab === 'wallet' && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-4">
                    <GlassCard className="bg-gradient-royal relative overflow-hidden">
                         <div className="relative z-10">
                             <p className="text-xs text-royal-300 uppercase font-bold mb-1">Total Net Worth</p>
                             <h2 className="text-4xl font-display font-bold text-white mb-4">${wallet.balance.toFixed(2)}</h2>
                             <div className="grid grid-cols-2 gap-4">
                                 <div className="bg-black/20 p-3 rounded-xl">
                                     <p className="text-[10px] text-gray-400 uppercase">Lifetime Earnings</p>
                                     <p className="text-lg font-bold text-neon-green">+${wallet.total_earning.toFixed(2)}</p>
                                 </div>
                                 <div className="bg-black/20 p-3 rounded-xl">
                                     <p className="text-[10px] text-gray-400 uppercase">Pending Withdraw</p>
                                     <p className="text-lg font-bold text-yellow-400">${wallet.pending_withdraw.toFixed(2)}</p>
                                 </div>
                             </div>
                         </div>
                         <CreditCard className="absolute -right-6 -bottom-6 text-white/5 w-48 h-48 rotate-12" />
                    </GlassCard>
                    
                    <GlassCard>
                         <h3 className="font-bold text-white mb-3">Referral Earnings</h3>
                         <div className="flex items-center justify-between bg-white/5 p-3 rounded-xl mb-3 border border-white/5">
                             <div className="flex items-center gap-3">
                                 <div className="p-2 bg-purple-500/20 text-purple-400 rounded-lg"><UserIcon size={18}/></div>
                                 <div>
                                     <p className="text-sm font-bold text-white">My Network</p>
                                     <p className="text-xs text-gray-500">{referral?.invitedUsers} active users</p>
                                 </div>
                             </div>
                             <p className="font-bold text-neon-green text-lg">+${referral?.totalEarned.toFixed(2)}</p>
                         </div>
                         <button onClick={() => copyToClipboard(user.ref_code_1)} className="w-full py-3 bg-white/5 border border-white/10 rounded-xl text-sm font-bold text-gray-300 hover:bg-white/10 flex items-center justify-center gap-2 transition">
                             <Copy size={16} /> Copy Referral Code
                         </button>
                    </GlassCard>
                </motion.div>
            )}

            {activeTab === 'history' && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-4">
                    <div className="flex items-center gap-2 text-white mb-2">
                         <History size={18} className="text-neon-green"/> <h3 className="font-bold">Transaction History</h3>
                    </div>
                    {transactions.length === 0 ? (
                        <div className="text-center py-10 bg-white/5 rounded-xl border border-white/5 text-gray-500">
                            No transactions found.
                        </div>
                    ) : (
                        transactions.map(tx => (
                            <GlassCard key={tx.id} className="flex items-center justify-between py-3 px-4 hover:bg-white/5 transition">
                                <div className="flex items-center gap-3">
                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                                        tx.type === 'deposit' ? 'bg-green-500/20 text-green-500' :
                                        tx.type === 'withdraw' ? 'bg-white/10 text-white' :
                                        tx.type === 'game_loss' ? 'bg-red-500/10 text-red-500' :
                                        tx.type === 'penalty' ? 'bg-red-500/20 text-red-400' :
                                        tx.type === 'referral' ? 'bg-purple-500/20 text-purple-400' :
                                        'bg-blue-500/20 text-blue-400'
                                    }`}>
                                        {tx.type === 'deposit' ? <ArrowDownLeft size={18} /> :
                                         tx.type === 'withdraw' ? <ArrowUpRight size={18} /> :
                                         tx.type === 'game_loss' ? <ArrowUpRight size={18} className="rotate-45" /> :
                                         tx.type === 'penalty' ? <XCircle size={18} /> :
                                         tx.type === 'referral' ? <Users size={18} /> :
                                         <WalletIcon size={18} />
                                        }
                                    </div>
                                    <div>
                                        <p className="text-sm font-bold text-white capitalize">{tx.description || tx.type.replace('_', ' ')}</p>
                                        <div className="flex items-center gap-2 text-[10px] text-gray-400">
                                            <span>{new Date(tx.created_at).toLocaleDateString()}</span>
                                            <span className={`uppercase ${tx.status === 'pending' ? 'text-yellow-400' : tx.status === 'failed' ? 'text-red-400' : 'text-green-400'}`}>
                                                {tx.status || 'Success'}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                                <div className={`font-mono font-bold text-sm ${
                                    tx.type === 'deposit' || tx.type === 'earn' || tx.type === 'bonus' || tx.type === 'game_win' || tx.type === 'referral' ? 'text-green-400' : 'text-white'
                                }`}>
                                    {tx.type === 'deposit' || tx.type === 'earn' || tx.type === 'bonus' || tx.type === 'game_win' || tx.type === 'referral' ? '+' : '-'}${tx.amount.toFixed(2)}
                                </div>
                            </GlassCard>
                        ))
                    )}
                </motion.div>
            )}

            {activeTab === 'security' && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-4">
                    <GlassCard className="space-y-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-red-500/10 rounded-lg text-red-400"><Lock size={20}/></div>
                                <div>
                                    <h4 className="font-bold text-white text-sm">Two-Factor Auth</h4>
                                    <p className="text-xs text-gray-500">Secure your account</p>
                                </div>
                            </div>
                            <div className={`w-12 h-6 rounded-full relative transition-colors duration-300 ${user.sec_2fa_1 ? 'bg-neon-green' : 'bg-gray-700'}`}>
                                <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all duration-300 ${user.sec_2fa_1 ? 'left-7' : 'left-1'}`}></div>
                            </div>
                        </div>
                        <div className="h-px bg-white/5"></div>
                        <div className="flex items-center justify-between">
                             <div className="flex items-center gap-3">
                                <div className="p-2 bg-blue-500/10 rounded-lg text-blue-400"><Bell size={20}/></div>
                                <div>
                                    <h4 className="font-bold text-white text-sm">Notifications</h4>
                                    <p className="text-xs text-gray-500">Email alerts</p>
                                </div>
                             </div>
                             <button onClick={() => setNotificationsEnabled(!notificationsEnabled)} className={`w-12 h-6 rounded-full relative transition-colors duration-300 ${notificationsEnabled ? 'bg-neon-green' : 'bg-gray-700'}`}>
                                <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all duration-300 ${notificationsEnabled ? 'left-7' : 'left-1'}`}></div>
                            </button>
                        </div>
                    </GlassCard>

                    <div className="space-y-2 pt-2">
                        <button onClick={handleLogout} className="w-full py-4 rounded-xl bg-red-500/10 text-red-500 font-bold border border-red-500/20 hover:bg-red-500/20 transition flex items-center justify-center gap-2">
                            <LogOut size={18} /> Sign Out
                        </button>
                    </div>
                </motion.div>
            )}

            {activeTab === 'badges' && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="grid grid-cols-2 gap-4">
                    {BADGES.map(badge => {
                        const isEarned = (user.badges_1 || []).includes(badge.id) || badge.id === 'early_adopter'; // Demo logic
                        return (
                            <GlassCard key={badge.id} className={`text-center transition-all duration-300 ${isEarned ? 'border-neon-green/30 bg-neon-green/5' : 'opacity-50 grayscale'}`}>
                                <div className="text-4xl mb-2 filter drop-shadow-[0_0_10px_rgba(255,255,255,0.3)]">{badge.icon}</div>
                                <h4 className="font-bold text-white text-sm">{badge.name}</h4>
                                <p className="text-[10px] text-gray-400 mt-1">{badge.description}</p>
                                {isEarned && <div className="mt-2 text-[10px] font-bold text-neon-green uppercase tracking-wider">Earned</div>}
                            </GlassCard>
                        )
                    })}
                </motion.div>
            )}
        </AnimatePresence>
      </div>

      {/* Edit Profile Modal */}
      <AnimatePresence>
        {isEditing && (
            <motion.div 
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
            >
                <motion.div 
                   initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}
                   className="bg-dark-900 border border-white/10 w-full max-w-md rounded-2xl p-6 relative max-h-[90vh] overflow-y-auto custom-scrollbar"
                >
                    <button onClick={() => setIsEditing(false)} className="absolute top-4 right-4 text-gray-500 hover:text-white"><X size={20}/></button>
                    <h2 className="text-xl font-bold text-white mb-6">Edit Profile</h2>
                    
                    <div className="space-y-4">
                        <div>
                            <label className="text-xs text-gray-400 font-bold mb-1 block">Full Name</label>
                            <input type="text" value={editForm.name_1} onChange={e => setEditForm({...editForm, name_1: e.target.value})} className="w-full bg-black/30 border border-white/10 rounded-lg p-3 text-white focus:border-neon-green outline-none" />
                        </div>
                        <div>
                            <label className="text-xs text-gray-400 font-bold mb-1 block">Bio</label>
                            <textarea value={editForm.bio_1} onChange={e => setEditForm({...editForm, bio_1: e.target.value})} className="w-full bg-black/30 border border-white/10 rounded-lg p-3 text-white focus:border-neon-green outline-none h-20 resize-none" />
                        </div>
                        <div>
                            <label className="text-xs text-gray-400 font-bold mb-1 block">Avatar URL</label>
                            <div className="flex gap-2">
                                <input type="text" value={editForm.avatar_1} onChange={e => setEditForm({...editForm, avatar_1: e.target.value})} className="w-full bg-black/30 border border-white/10 rounded-lg p-3 text-white focus:border-neon-green outline-none" placeholder="https://..." />
                                <div className="w-12 h-12 bg-black/30 rounded-lg shrink-0 flex items-center justify-center border border-white/10">
                                    <img src={editForm.avatar_1 || user.avatar_1 || ''} className="w-full h-full object-cover rounded-lg" alt="" onError={(e:any) => e.target.style.display='none'} />
                                </div>
                            </div>
                        </div>
                        <div>
                            <label className="text-xs text-gray-400 font-bold mb-1 block">Phone Number</label>
                            <input type="tel" value={editForm.phone_1} onChange={e => setEditForm({...editForm, phone_1: e.target.value})} className="w-full bg-black/30 border border-white/10 rounded-lg p-3 text-white focus:border-neon-green outline-none" placeholder="+1 234..." />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-xs text-gray-400 font-bold mb-1 block">Twitter (X)</label>
                                <input type="text" value={editForm.twitter} onChange={e => setEditForm({...editForm, twitter: e.target.value})} className="w-full bg-black/30 border border-white/10 rounded-lg p-3 text-white focus:border-neon-green outline-none" placeholder="https://x.com/..." />
                            </div>
                            <div>
                                <label className="text-xs text-gray-400 font-bold mb-1 block">Telegram</label>
                                <input type="text" value={editForm.telegram} onChange={e => setEditForm({...editForm, telegram: e.target.value})} className="w-full bg-black/30 border border-white/10 rounded-lg p-3 text-white focus:border-neon-green outline-none" placeholder="https://t.me/..." />
                            </div>
                        </div>

                        <button onClick={handleUpdateProfile} className="w-full py-4 bg-neon-green text-black font-bold rounded-xl hover:scale-[1.02] transition mt-4">
                            Save Changes
                        </button>
                    </div>
                </motion.div>
            </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Profile;
