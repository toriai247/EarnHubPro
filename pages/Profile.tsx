
import React, { useEffect, useState } from 'react';
import GlassCard from '../components/GlassCard';
import Skeleton from '../components/Skeleton';
import { 
  Edit2, LogOut, Settings, Share2, Copy, 
  CheckCircle2, ShieldCheck, RefreshCw, 
  MapPin, Globe, Laptop, Smartphone,
  Hash, Mail, QrCode, ExternalLink,
  Camera, Calendar, Award, Fingerprint, Lock,
  Twitter, Send, MessageCircle, Phone, Save, X, User
} from 'lucide-react';
import { UserProfile, WalletData } from '../types';
import { supabase } from '../integrations/supabase/client';
import { useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { BADGES } from '../constants';
import { createUserProfile } from '../lib/actions';
import BalanceDisplay from '../components/BalanceDisplay';
import { useUI } from '../context/UIContext';

const MotionDiv = motion.div as any;

const Profile: React.FC = () => {
  const { toast } = useUI();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [wallet, setWallet] = useState<WalletData | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'badges' | 'security'>('overview');
  
  // Form State
  const [formData, setFormData] = useState({
    name_1: '',
    avatar_1: '',
    bio_1: '',
    phone_1: '',
    twitter: '',
    telegram: '',
    discord: ''
  });

  const navigate = useNavigate();

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (user) {
      const socials = user.socials_1 as any || {};
      setFormData({
        name_1: user.name_1 || '',
        avatar_1: user.avatar_1 || '',
        bio_1: user.bio_1 || '',
        phone_1: user.phone_1 || '',
        twitter: socials.twitter || '',
        telegram: socials.telegram || '',
        discord: socials.discord || ''
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
                await createUserProfile(session.user.id, session.user.email || '', session.user.user_metadata?.full_name || 'User');
                const res = await supabase.from('profiles').select('*').eq('id', session.user.id).single();
                profileData = res.data;
            }
            if (profileData) setUser(profileData as UserProfile);

            const { data: walletData } = await supabase.from('wallets').select('*').eq('user_id', session.user.id).single();
            if (walletData) setWallet(walletData as WalletData);
        }
    } catch (e) { console.error(e); } 
    finally { setLoading(false); }
  };

  const handleUpdateProfile = async () => {
    if (!user) return;
    try {
      const socialPayload = {
          twitter: formData.twitter,
          telegram: formData.telegram,
          discord: formData.discord
      };

      const { data, error } = await supabase.from('profiles')
          .update({
            name_1: formData.name_1,
            avatar_1: formData.avatar_1,
            bio_1: formData.bio_1,
            phone_1: formData.phone_1,
            socials_1: socialPayload
          })
          .eq('id', user.id).select().single();

      if (error) throw error;
      setUser(data as UserProfile);
      setIsEditing(false);
      toast.success("Profile Updated Successfully!");
    } catch (e: any) { 
        toast.error(e.message); 
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  const copyToClipboard = (text: string, label: string = "Copied") => {
      navigator.clipboard.writeText(text);
      toast.success(`${label} copied!`);
  };

  const shareProfile = () => {
      if(!user) return;
      const url = `${window.location.origin}/#/u/${user.user_uid}`;
      if (navigator.share) {
          navigator.share({ title: `EarnHub Profile: ${user.name_1}`, url });
      } else {
          copyToClipboard(url, "Profile Link");
      }
  };

  const getUserBadges = () => {
      if(!user || !wallet) return [];
      const earned: string[] = user.badges_1 || [];
      
      // Auto-calculate dynamic badges for display
      const dynamicBadges = [];
      
      // Join Date Badge (Everyone gets verified or early adopter based on logic, simplified here)
      if (user.is_kyc_1) dynamicBadges.push('verified');
      if (wallet.deposit > 1000) dynamicBadges.push('high_roller');
      // Assume referrer count logic is handled elsewhere, but we can check rank
      if ((user.level_1 || 1) >= 5) dynamicBadges.push('top_inviter');
      
      // Combine unique
      return Array.from(new Set([...earned, ...dynamicBadges, 'early_adopter']));
  };

  const userBadges = getUserBadges();

  if (loading) {
      return (
        <div className="pb-24 sm:pl-20 sm:pt-6 space-y-6 px-4 sm:px-0">
            <Skeleton className="w-full h-48 rounded-2xl" />
            <Skeleton className="w-full h-32 rounded-xl" />
        </div>
      );
  }

  return (
    <div className="pb-24 sm:pl-20 sm:pt-0 space-y-6">
        
        {/* HERO HEADER */}
        <div className="relative">
            {/* Cover Image */}
            <div className="h-40 sm:h-56 w-full bg-gradient-to-r from-blue-900 to-purple-900 overflow-hidden relative">
                <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-20"></div>
                <div className="absolute inset-0 bg-gradient-to-b from-transparent to-void"></div>
            </div>

            <div className="px-4 sm:px-8 -mt-16 flex flex-col sm:flex-row items-center sm:items-end gap-4 relative z-10">
                {/* Avatar */}
                <div className="relative group">
                    <div className="w-32 h-32 rounded-full border-4 border-void bg-surface shadow-2xl overflow-hidden relative">
                        <img 
                            src={user?.avatar_1 || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.name_1}`} 
                            alt="Profile" 
                            className="w-full h-full object-cover"
                        />
                        {isEditing && (
                            <div className="absolute inset-0 bg-black/50 flex items-center justify-center cursor-pointer">
                                <Camera className="text-white" size={24} />
                            </div>
                        )}
                    </div>
                    {user?.is_kyc_1 && (
                        <div className="absolute bottom-2 right-2 bg-blue-500 text-white p-1 rounded-full border-2 border-void shadow-lg" title="Verified">
                            <CheckCircle2 size={16} fill="currentColor" className="text-white" />
                        </div>
                    )}
                </div>

                {/* Identity */}
                <div className="flex-1 text-center sm:text-left mb-2">
                    <h1 className="text-3xl font-black text-white flex items-center justify-center sm:justify-start gap-2">
                        {user?.name_1}
                        <span className="text-xs bg-electric-500/20 text-electric-400 px-2 py-0.5 rounded-lg border border-electric-500/30 font-bold uppercase tracking-wider">
                            Level {user?.level_1}
                        </span>
                    </h1>
                    <p className="text-gray-400 text-sm flex items-center justify-center sm:justify-start gap-2 mt-1">
                        <span className="font-mono text-gray-500">@{user?.id.slice(0, 8)}...</span>
                        <span className="w-1 h-1 bg-gray-600 rounded-full"></span>
                        <span className="flex items-center gap-1"><Calendar size={12}/> Joined {new Date(user?.created_at || Date.now()).getFullYear()}</span>
                    </p>
                </div>

                {/* Actions */}
                <div className="flex gap-3 mb-4 sm:mb-2">
                    <button 
                        onClick={() => setIsEditing(!isEditing)} 
                        className={`px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 transition ${isEditing ? 'bg-red-500/10 text-red-400 border border-red-500/30' : 'bg-white/10 text-white border border-white/10 hover:bg-white/20'}`}
                    >
                        {isEditing ? <X size={16}/> : <Edit2 size={16}/>}
                        {isEditing ? 'Cancel' : 'Edit Profile'}
                    </button>
                    <button onClick={shareProfile} className="p-2 bg-electric-500 text-white rounded-xl shadow-lg shadow-electric-500/20 hover:scale-105 transition">
                        <Share2 size={20} />
                    </button>
                </div>
            </div>
        </div>

        {/* CONTENT TABS */}
        <div className="px-4 sm:px-8">
            {/* Stats Row */}
            <div className="grid grid-cols-3 gap-3 mb-6">
                <GlassCard className="p-3 text-center border-l-2 border-l-neon-green">
                    <p className="text-[10px] text-gray-500 uppercase font-bold">Total Earned</p>
                    <p className="text-lg font-bold text-neon-green"><BalanceDisplay amount={wallet?.total_earning || 0} compact /></p>
                </GlassCard>
                <GlassCard className="p-3 text-center border-l-2 border-l-electric-500">
                    <p className="text-[10px] text-gray-500 uppercase font-bold">Referrals</p>
                    <p className="text-lg font-bold text-white">{wallet?.referral_earnings ? 'Active' : '0'}</p>
                </GlassCard>
                <GlassCard className="p-3 text-center border-l-2 border-l-purple-500">
                    <p className="text-[10px] text-gray-500 uppercase font-bold">Rank</p>
                    <p className="text-lg font-bold text-purple-400">{user?.rank_1 || 'Rookie'}</p>
                </GlassCard>
            </div>

            {/* Navigation */}
            <div className="flex border-b border-white/10 mb-6 space-x-6 overflow-x-auto no-scrollbar">
                {[
                    { id: 'overview', label: 'Overview', icon: User },
                    { id: 'badges', label: 'Badges', icon: Award },
                    { id: 'security', label: 'Security', icon: ShieldCheck },
                ].map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id as any)}
                        className={`flex items-center gap-2 pb-3 text-sm font-bold transition border-b-2 whitespace-nowrap ${
                            activeTab === tab.id 
                            ? 'text-white border-electric-500' 
                            : 'text-gray-500 border-transparent hover:text-gray-300'
                        }`}
                    >
                        <tab.icon size={16} /> {tab.label}
                    </button>
                ))}
            </div>

            <AnimatePresence mode="wait">
                {activeTab === 'overview' && (
                    <MotionDiv 
                        key="overview"
                        initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
                        className="space-y-4"
                    >
                        {/* Edit Mode Form */}
                        {isEditing && (
                            <GlassCard className="border-electric-500/30 bg-electric-900/10 mb-4">
                                <h3 className="font-bold text-white mb-4">Edit Profile Details</h3>
                                <div className="space-y-4">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <label className="text-xs text-gray-400 block mb-1">Display Name</label>
                                            <input 
                                                value={formData.name_1} 
                                                onChange={e => setFormData({...formData, name_1: e.target.value})}
                                                className="w-full bg-black/40 border border-white/10 rounded-lg p-2 text-white text-sm focus:border-electric-500 outline-none"
                                            />
                                        </div>
                                        <div>
                                            <label className="text-xs text-gray-400 block mb-1">Phone Number</label>
                                            <input 
                                                value={formData.phone_1} 
                                                onChange={e => setFormData({...formData, phone_1: e.target.value})}
                                                className="w-full bg-black/40 border border-white/10 rounded-lg p-2 text-white text-sm focus:border-electric-500 outline-none"
                                                placeholder="+1 234 567 890"
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="text-xs text-gray-400 block mb-1">Bio</label>
                                        <textarea 
                                            value={formData.bio_1} 
                                            onChange={e => setFormData({...formData, bio_1: e.target.value})}
                                            className="w-full bg-black/40 border border-white/10 rounded-lg p-2 text-white text-sm focus:border-electric-500 outline-none h-20 resize-none"
                                            placeholder="Tell us about yourself..."
                                        />
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        <div>
                                            <label className="text-xs text-gray-400 block mb-1">Twitter (X)</label>
                                            <input 
                                                value={formData.twitter} 
                                                onChange={e => setFormData({...formData, twitter: e.target.value})}
                                                className="w-full bg-black/40 border border-white/10 rounded-lg p-2 text-white text-sm focus:border-electric-500 outline-none"
                                                placeholder="@username"
                                            />
                                        </div>
                                        <div>
                                            <label className="text-xs text-gray-400 block mb-1">Telegram</label>
                                            <input 
                                                value={formData.telegram} 
                                                onChange={e => setFormData({...formData, telegram: e.target.value})}
                                                className="w-full bg-black/40 border border-white/10 rounded-lg p-2 text-white text-sm focus:border-electric-500 outline-none"
                                                placeholder="t.me/username"
                                            />
                                        </div>
                                        <div>
                                            <label className="text-xs text-gray-400 block mb-1">Discord</label>
                                            <input 
                                                value={formData.discord} 
                                                onChange={e => setFormData({...formData, discord: e.target.value})}
                                                className="w-full bg-black/40 border border-white/10 rounded-lg p-2 text-white text-sm focus:border-electric-500 outline-none"
                                                placeholder="user#1234"
                                            />
                                        </div>
                                    </div>
                                    
                                    <div className="flex justify-end gap-3 pt-2">
                                        <button onClick={() => setIsEditing(false)} className="px-4 py-2 rounded-lg text-sm font-bold text-gray-400 hover:text-white transition">Cancel</button>
                                        <button onClick={handleUpdateProfile} className="px-6 py-2 bg-electric-500 text-white rounded-lg text-sm font-bold hover:bg-electric-400 transition flex items-center gap-2">
                                            <Save size={16}/> Save Changes
                                        </button>
                                    </div>
                                </div>
                            </GlassCard>
                        )}

                        {/* Bio Card */}
                        <GlassCard className="relative overflow-hidden">
                            <h3 className="font-bold text-white text-sm mb-2 uppercase tracking-wide">About Me</h3>
                            <p className="text-gray-400 text-sm leading-relaxed italic">
                                {user?.bio_1 || "No bio added yet. Click edit to tell your story."}
                            </p>
                        </GlassCard>

                        {/* Contact & IDs */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <GlassCard>
                                <h3 className="font-bold text-white text-sm mb-3 uppercase tracking-wide flex items-center gap-2">
                                    <Hash size={16} className="text-electric-500"/> Account IDs
                                </h3>
                                <div className="space-y-3">
                                    <div 
                                        onClick={() => copyToClipboard(user?.user_uid?.toString() || '', "User ID")}
                                        className="bg-white/5 p-3 rounded-xl flex items-center justify-between cursor-pointer hover:bg-white/10 transition group"
                                    >
                                        <div>
                                            <p className="text-[10px] text-gray-500 font-bold uppercase">Public ID</p>
                                            <p className="text-white font-mono font-bold text-lg tracking-widest">{user?.user_uid}</p>
                                        </div>
                                        <Copy size={16} className="text-gray-600 group-hover:text-white" />
                                    </div>
                                    <div 
                                        onClick={() => copyToClipboard(user?.email_1 || '', "Email")}
                                        className="bg-white/5 p-3 rounded-xl flex items-center justify-between cursor-pointer hover:bg-white/10 transition group"
                                    >
                                        <div className="overflow-hidden mr-2">
                                            <p className="text-[10px] text-gray-500 font-bold uppercase">Email Address</p>
                                            <p className="text-white font-mono text-sm truncate">{user?.email_1}</p>
                                        </div>
                                        <Copy size={16} className="text-gray-600 group-hover:text-white shrink-0" />
                                    </div>
                                </div>
                            </GlassCard>

                            <GlassCard>
                                <h3 className="font-bold text-white text-sm mb-3 uppercase tracking-wide flex items-center gap-2">
                                    <Globe size={16} className="text-purple-500"/> Social Connections
                                </h3>
                                <div className="space-y-2">
                                    {(user?.socials_1 as any)?.telegram ? (
                                        <a href={`https://${(user?.socials_1 as any).telegram}`} target="_blank" className="flex items-center gap-3 p-3 rounded-xl bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 transition">
                                            <Send size={18} />
                                            <span className="text-sm font-bold">Telegram</span>
                                            <ExternalLink size={14} className="ml-auto opacity-50" />
                                        </a>
                                    ) : <div className="text-xs text-gray-500 italic p-2">No Telegram linked</div>}
                                    
                                    {(user?.socials_1 as any)?.twitter ? (
                                        <a href={`https://twitter.com/${(user?.socials_1 as any).twitter.replace('@','')}`} target="_blank" className="flex items-center gap-3 p-3 rounded-xl bg-sky-500/10 text-sky-400 hover:bg-sky-500/20 transition">
                                            <Twitter size={18} />
                                            <span className="text-sm font-bold">Twitter</span>
                                            <ExternalLink size={14} className="ml-auto opacity-50" />
                                        </a>
                                    ) : <div className="text-xs text-gray-500 italic p-2">No Twitter linked</div>}

                                    {(user?.socials_1 as any)?.discord ? (
                                        <div className="flex items-center gap-3 p-3 rounded-xl bg-indigo-500/10 text-indigo-400">
                                            <MessageCircle size={18} />
                                            <span className="text-sm font-bold">{(user?.socials_1 as any).discord}</span>
                                        </div>
                                    ) : null}
                                </div>
                            </GlassCard>
                        </div>
                    </MotionDiv>
                )}

                {activeTab === 'badges' && (
                    <MotionDiv 
                        key="badges"
                        initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
                        className="grid grid-cols-2 md:grid-cols-4 gap-4"
                    >
                        {BADGES.map(badge => {
                            const isUnlocked = userBadges.includes(badge.id);
                            return (
                                <GlassCard key={badge.id} className={`text-center transition-all ${isUnlocked ? 'border-yellow-500/30 bg-yellow-900/10' : 'opacity-50 grayscale'}`}>
                                    <div className="text-4xl mb-2 drop-shadow-md">{badge.icon}</div>
                                    <h4 className={`font-bold text-sm ${isUnlocked ? 'text-white' : 'text-gray-500'}`}>{badge.name}</h4>
                                    <p className="text-[10px] text-gray-400 mt-1 leading-tight">{badge.description}</p>
                                    {isUnlocked ? (
                                        <div className="mt-2 text-[10px] text-yellow-500 font-bold uppercase tracking-wider flex items-center justify-center gap-1">
                                            <CheckCircle2 size={10} /> Unlocked
                                        </div>
                                    ) : (
                                        <div className="mt-2 text-[10px] text-gray-600 font-bold uppercase tracking-wider flex items-center justify-center gap-1">
                                            <Lock size={10} /> Locked
                                        </div>
                                    )}
                                </GlassCard>
                            )
                        })}
                    </MotionDiv>
                )}

                {activeTab === 'security' && (
                    <MotionDiv 
                        key="security"
                        initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
                        className="space-y-4"
                    >
                        <GlassCard className="flex items-center justify-between p-4">
                            <div className="flex items-center gap-4">
                                <div className={`w-12 h-12 rounded-full flex items-center justify-center ${user?.is_kyc_1 ? 'bg-green-500/20 text-green-500' : 'bg-red-500/20 text-red-500'}`}>
                                    <ShieldCheck size={24} />
                                </div>
                                <div>
                                    <h4 className="font-bold text-white">KYC Verification</h4>
                                    <p className="text-xs text-gray-400">{user?.is_kyc_1 ? 'Your identity is verified.' : 'Verification required for higher limits.'}</p>
                                </div>
                            </div>
                            {user?.is_kyc_1 ? (
                                <span className="bg-green-500/10 text-green-500 px-3 py-1 rounded-lg text-xs font-bold uppercase border border-green-500/20">Verified</span>
                            ) : (
                                <button className="bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-lg text-xs font-bold transition">Start KYC</button>
                            )}
                        </GlassCard>

                        <Link to="/biometric-setup" className="block">
                            <GlassCard className="flex items-center justify-between p-4 hover:bg-white/5 transition group cursor-pointer">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-full bg-blue-500/20 text-blue-500 flex items-center justify-center">
                                        <Fingerprint size={24} />
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-white group-hover:text-blue-400 transition">Biometric Login</h4>
                                        <p className="text-xs text-gray-400">Use Fingerprint or Face ID to login securely.</p>
                                    </div>
                                </div>
                                <div className="bg-white/5 p-2 rounded-lg text-gray-400 group-hover:text-white group-hover:bg-white/10 transition">
                                    <Settings size={18} />
                                </div>
                            </GlassCard>
                        </Link>

                        <button onClick={handleLogout} className="w-full py-4 rounded-xl border border-red-500/30 text-red-500 font-bold hover:bg-red-500/10 transition flex items-center justify-center gap-2 mt-4">
                            <LogOut size={18} /> Log Out
                        </button>
                    </MotionDiv>
                )}
            </AnimatePresence>
        </div>
    </div>
  );
};

export default Profile;
