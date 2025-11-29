
import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '../integrations/supabase/client';
import { UserProfile } from '../types';
import GlassCard from '../components/GlassCard';
import { 
  ArrowLeft, Send, CheckCircle2, User, Trophy, Calendar, Hash, 
  Share2, Copy, Users, ExternalLink, Twitter, MessageCircle, Globe, Award,
  Sparkles, Zap, Crown
} from 'lucide-react';
import Skeleton from '../components/Skeleton';
import { motion } from 'framer-motion';
import { useUI } from '../context/UIContext';
import { BADGES } from '../constants';

const PublicProfile: React.FC = () => {
    const { uid } = useParams<{ uid: string }>();
    const { toast } = useUI();
    
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [suggestedUsers, setSuggestedUsers] = useState<UserProfile[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchProfileData = async () => {
            if (!uid) return;
            setLoading(true);
            setError(null);
            
            try {
                // Ensure UID is a valid number
                if (!/^\d+$/.test(uid)) {
                    throw new Error("Invalid User ID format");
                }
                const targetUid = parseInt(uid);

                // 1. Fetch Target Profile
                const { data, error } = await supabase
                    .from('profiles')
                    .select('id, name_1, avatar_1, level_1, is_kyc_1, user_uid, created_at, bio_1, badges_1, socials_1, rank_1, xp_1')
                    .eq('user_uid', targetUid)
                    .maybeSingle();

                if (error) throw error;
                if (!data) throw new Error("User not found");

                setProfile(data as UserProfile);

                // 2. Fetch "Others" (Suggested Users)
                const { data: suggestions } = await supabase
                    .from('profiles')
                    .select('user_uid, name_1, avatar_1, level_1, is_kyc_1')
                    .neq('user_uid', targetUid)
                    .limit(4)
                    .order('created_at', { ascending: false });

                if (suggestions) {
                    setSuggestedUsers(suggestions as UserProfile[]);
                }

            } catch (e: any) {
                console.error(e);
                setError(e.message);
            } finally {
                setLoading(false);
            }
        };

        fetchProfileData();
    }, [uid]);

    const handleShare = () => {
        const url = window.location.href;
        if (navigator.share) {
            navigator.share({
                title: `Check out ${profile?.name_1}'s Profile on EarnHub`,
                url: url
            });
        } else {
            navigator.clipboard.writeText(url);
            toast.success("Profile link copied!");
        }
    };

    const copyId = () => {
        if(profile?.user_uid) {
            navigator.clipboard.writeText(profile.user_uid.toString());
            toast.success("ID Copied");
        }
    }

    // Animation Variants
    const containerVariants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: { staggerChildren: 0.1 }
        }
    };

    const itemVariants = {
        hidden: { opacity: 0, y: 20 },
        visible: { opacity: 1, y: 0 }
    };

    // Helper to generate deterministic gradient based on name
    const getCoverGradient = (name: string) => {
        const colors = ['from-blue-600 to-purple-600', 'from-emerald-600 to-teal-600', 'from-orange-600 to-red-600', 'from-pink-600 to-rose-600', 'from-indigo-600 to-cyan-600'];
        const index = name.length % colors.length;
        return colors[index];
    };

    const socials = profile?.socials_1 as any || {};
    const userBadges = profile?.badges_1 || [];
    const activeBadges = BADGES.filter(b => userBadges.includes(b.id));

    if (loading) {
        return (
            <div className="pb-24 sm:pl-20 sm:pt-0 space-y-6">
                <Skeleton className="w-full h-48 sm:h-64" variant="rectangular" />
                <div className="px-4 -mt-16 space-y-6">
                    <div className="flex flex-col items-center">
                        <Skeleton className="w-32 h-32 rounded-full border-4 border-black" variant="circular" />
                        <Skeleton className="w-48 h-8 mt-4 rounded-lg" variant="text" />
                        <Skeleton className="w-64 h-4 mt-2 rounded-lg" variant="text" />
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                        <Skeleton className="h-20 rounded-2xl" />
                        <Skeleton className="h-20 rounded-2xl" />
                        <Skeleton className="h-20 rounded-2xl" />
                    </div>
                </div>
            </div>
        );
    }

    if (error || !profile) {
        return (
            <div className="min-h-[80vh] flex flex-col items-center justify-center p-6 text-center">
                <div className="w-24 h-24 bg-white/5 rounded-full flex items-center justify-center mb-6 text-gray-500 border border-white/10 animate-pulse">
                    <User size={40} />
                </div>
                <h2 className="text-2xl font-black text-white mb-2">User Not Found</h2>
                <p className="text-gray-400 text-sm mb-8 max-w-xs mx-auto">{error || "The profile you are looking for is unavailable or has been removed."}</p>
                <Link to="/search" className="px-8 py-3 bg-white text-black font-bold rounded-xl hover:bg-gray-200 transition">Find Users</Link>
            </div>
        );
    }

    return (
        <motion.div 
            className="pb-24 sm:pl-20 sm:pt-0 space-y-8 min-h-screen"
            initial="hidden"
            animate="visible"
            variants={containerVariants}
        >
            
            {/* --- HERO COVER --- */}
            <div className="relative">
                <Link to="/" className="absolute top-4 left-4 z-20 p-2 bg-black/40 backdrop-blur-md rounded-xl text-white hover:bg-black/60 transition border border-white/10">
                    <ArrowLeft size={20} />
                </Link>
                
                <div className={`h-48 sm:h-64 w-full bg-gradient-to-br ${getCoverGradient(profile.name_1 || 'User')} relative overflow-hidden`}>
                    <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-30"></div>
                    <div className="absolute inset-0 bg-gradient-to-t from-void to-transparent opacity-90"></div>
                </div>

                <div className="px-4 -mt-20 relative z-10 flex flex-col items-center text-center">
                    {/* Avatar */}
                    <motion.div 
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ type: "spring", stiffness: 200, delay: 0.1 }}
                        className="relative"
                    >
                        <div className="w-32 h-32 rounded-full p-1 bg-gradient-to-br from-white/20 to-transparent backdrop-blur-sm border border-white/10 shadow-2xl">
                            <div className="w-full h-full rounded-full border-4 border-void bg-void overflow-hidden relative">
                                <img 
                                    src={profile.avatar_1 || `https://api.dicebear.com/7.x/avataaars/svg?seed=${profile.name_1}`} 
                                    alt={profile.name_1 || 'User'} 
                                    className="w-full h-full object-cover"
                                />
                            </div>
                        </div>
                        {profile.is_kyc_1 && (
                            <motion.div 
                                initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.4 }}
                                className="absolute bottom-2 right-2 bg-blue-500 text-white p-1.5 rounded-full border-4 border-void shadow-lg"
                            >
                                <CheckCircle2 size={18} strokeWidth={3} />
                            </motion.div>
                        )}
                        <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 bg-surface border border-white/10 text-white text-[10px] font-bold px-3 py-1 rounded-full shadow-lg whitespace-nowrap flex items-center gap-1">
                            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                            LVL {profile.level_1}
                        </div>
                    </motion.div>

                    {/* Basic Info */}
                    <motion.div variants={itemVariants} className="mt-5 space-y-2 max-w-md">
                        <h1 className="text-3xl font-black text-white tracking-tight flex items-center justify-center gap-2">
                            {profile.name_1}
                            {profile.rank_1 && profile.rank_1 !== 'Rookie' && <Crown size={20} className="text-yellow-400 fill-yellow-400" />}
                        </h1>
                        
                        <div className="flex items-center justify-center gap-3 text-xs">
                            <button onClick={copyId} className="flex items-center gap-1 bg-white/5 hover:bg-white/10 px-2 py-1 rounded text-gray-400 transition">
                                <Hash size={12} /> {profile.user_uid} <Copy size={10} className="ml-1 opacity-50"/>
                            </button>
                            <div className="flex items-center gap-1 text-gray-500">
                                <Calendar size={12} /> Joined {new Date(profile.created_at).getFullYear()}
                            </div>
                        </div>

                        <p className="text-gray-300 text-sm font-medium leading-relaxed bg-white/5 p-3 rounded-xl border border-white/5 backdrop-blur-sm">
                            {profile.bio_1 || "No bio yet. Just earning quietly."}
                        </p>
                    </motion.div>

                    {/* Action Buttons */}
                    <motion.div variants={itemVariants} className="flex gap-3 mt-6 w-full max-w-sm">
                        <Link 
                            to={`/send-money?to=${profile.user_uid}`}
                            className="flex-1 py-3.5 bg-electric-600 text-white rounded-xl font-bold shadow-lg shadow-electric-600/20 hover:bg-electric-500 transition flex items-center justify-center gap-2 active:scale-95 group"
                        >
                            <Send size={18} className="group-hover:-translate-y-0.5 group-hover:translate-x-0.5 transition-transform" /> Send Money
                        </Link>
                        <button 
                            onClick={handleShare}
                            className="px-4 py-3.5 bg-surface text-white rounded-xl font-bold hover:bg-white/10 transition border border-white/10 active:scale-95"
                        >
                            <Share2 size={20} />
                        </button>
                    </motion.div>
                </div>
            </div>

            {/* --- DETAILS SECTION --- */}
            <div className="px-4 sm:px-0 max-w-2xl mx-auto space-y-6">
                
                {/* Stats Grid */}
                <motion.div variants={itemVariants} className="grid grid-cols-3 gap-3">
                    <GlassCard className="p-3 flex flex-col items-center justify-center bg-gradient-to-br from-white/5 to-transparent border-white/5">
                        <Trophy size={20} className="text-yellow-400 mb-1" />
                        <span className="text-[10px] text-gray-500 font-bold uppercase">Rank</span>
                        <span className="text-white font-black text-sm">{profile.rank_1 || 'Rookie'}</span>
                    </GlassCard>
                    <GlassCard className="p-3 flex flex-col items-center justify-center bg-gradient-to-br from-white/5 to-transparent border-white/5">
                        <Zap size={20} className="text-purple-400 mb-1" />
                        <span className="text-[10px] text-gray-500 font-bold uppercase">XP</span>
                        <span className="text-white font-black text-sm">{profile.xp_1 || 0}</span>
                    </GlassCard>
                    <GlassCard className="p-3 flex flex-col items-center justify-center bg-gradient-to-br from-white/5 to-transparent border-white/5">
                        <Sparkles size={20} className="text-blue-400 mb-1" />
                        <span className="text-[10px] text-gray-500 font-bold uppercase">Badges</span>
                        <span className="text-white font-black text-sm">{activeBadges.length}</span>
                    </GlassCard>
                </motion.div>

                {/* Socials */}
                <motion.div variants={itemVariants}>
                    <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3 px-1 flex items-center gap-2">
                        <Globe size={14}/> Connections
                    </h3>
                    <div className="flex gap-3 flex-wrap">
                        {socials.twitter && (
                            <a href={`https://twitter.com/${socials.twitter.replace('@','')}`} target="_blank" rel="noreferrer" className="flex items-center gap-2 px-4 py-3 rounded-xl bg-[#1DA1F2]/10 text-[#1DA1F2] border border-[#1DA1F2]/20 hover:bg-[#1DA1F2]/20 transition">
                                <Twitter size={18} />
                                <span className="text-xs font-bold">Twitter</span>
                            </a>
                        )}
                        {socials.telegram && (
                            <a href={`https://${socials.telegram}`} target="_blank" rel="noreferrer" className="flex items-center gap-2 px-4 py-3 rounded-xl bg-[#0088cc]/10 text-[#0088cc] border border-[#0088cc]/20 hover:bg-[#0088cc]/20 transition">
                                <Send size={18} />
                                <span className="text-xs font-bold">Telegram</span>
                            </a>
                        )}
                        {socials.discord && (
                            <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-[#5865F2]/10 text-[#5865F2] border border-[#5865F2]/20">
                                <MessageCircle size={18} />
                                <span className="text-xs font-bold">Discord</span>
                            </div>
                        )}
                        {!socials.twitter && !socials.telegram && !socials.discord && (
                            <div className="w-full text-center py-4 text-gray-500 text-xs italic bg-white/5 rounded-xl border border-white/5">
                                No public social links.
                            </div>
                        )}
                    </div>
                </motion.div>

                {/* Badges Display */}
                {activeBadges.length > 0 && (
                    <motion.div variants={itemVariants}>
                        <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3 px-1 flex items-center gap-2">
                            <Award size={14}/> Achievements
                        </h3>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                            {activeBadges.map(badge => (
                                <div key={badge.id} className="bg-gradient-to-br from-yellow-500/10 to-transparent border border-yellow-500/20 p-3 rounded-xl flex flex-col items-center text-center">
                                    <span className="text-2xl mb-1">{badge.icon}</span>
                                    <span className="text-[10px] font-bold text-white leading-tight">{badge.name}</span>
                                </div>
                            ))}
                        </div>
                    </motion.div>
                )}

                {/* Suggested Users */}
                {suggestedUsers.length > 0 && (
                    <motion.div variants={itemVariants}>
                        <div className="flex items-center justify-between mb-3 px-1">
                            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-2">
                                <Users size={14}/> Discover Others
                            </h3>
                            <Link to="/search" className="text-[10px] text-electric-400 font-bold hover:underline">View All</Link>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-3">
                            {suggestedUsers.map((user, idx) => (
                                <motion.div
                                    key={user.user_uid}
                                    whileHover={{ y: -2 }}
                                    transition={{ duration: 0.2 }}
                                >
                                    <Link to={`/u/${user.user_uid}`}>
                                        <GlassCard className="p-3 flex items-center gap-3 hover:bg-white/10 transition group h-full border-white/5 bg-surface/50">
                                            <div className="relative shrink-0">
                                                <div className="w-10 h-10 rounded-full bg-black/50 border border-white/10 overflow-hidden">
                                                    <img 
                                                        src={user.avatar_1 || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.name_1}`} 
                                                        alt={user.name_1 || 'User'} 
                                                        className="w-full h-full object-cover"
                                                    />
                                                </div>
                                                {user.is_kyc_1 && (
                                                    <div className="absolute -bottom-1 -right-1 bg-surface rounded-full p-0.5 border border-border-neo">
                                                        <CheckCircle2 size={10} className="text-blue-500 fill-black" />
                                                    </div>
                                                )}
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <h4 className="text-xs font-bold text-white truncate group-hover:text-electric-400 transition">{user.name_1?.split(' ')[0]}</h4>
                                                <p className="text-[9px] text-gray-500 font-mono">ID: {user.user_uid}</p>
                                            </div>
                                            <ExternalLink size={12} className="text-gray-600 group-hover:text-white transition" />
                                        </GlassCard>
                                    </Link>
                                </motion.div>
                            ))}
                        </div>
                    </motion.div>
                )}

            </div>
        </motion.div>
    );
};

export default PublicProfile;
