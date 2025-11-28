
import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '../integrations/supabase/client';
import { UserProfile } from '../types';
import GlassCard from '../components/GlassCard';
import { ArrowLeft, Send, CheckCircle2, User, Trophy, Calendar, Hash } from 'lucide-react';
import Skeleton from '../components/Skeleton';
import { motion } from 'framer-motion';

const PublicProfile: React.FC = () => {
    const { uid } = useParams<{ uid: string }>();
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchProfile = async () => {
            if (!uid) return;
            setLoading(true);
            try {
                // Ensure UID is a valid number
                if (!/^\d+$/.test(uid)) {
                    throw new Error("Invalid User ID");
                }

                const { data, error } = await supabase
                    .from('profiles')
                    .select('id, name_1, avatar_1, level_1, is_kyc_1, user_uid, created_at, bio_1')
                    .eq('user_uid', parseInt(uid))
                    .maybeSingle();

                if (error) throw error;
                if (!data) throw new Error("User not found");

                setProfile(data as UserProfile);
            } catch (e: any) {
                console.error(e);
                setError(e.message);
            } finally {
                setLoading(false);
            }
        };

        fetchProfile();
    }, [uid]);

    if (loading) {
        return (
            <div className="pb-24 sm:pl-20 sm:pt-6 px-4 space-y-6">
                <Skeleton className="w-full h-64 rounded-2xl" />
                <Skeleton className="w-full h-32 rounded-2xl" />
            </div>
        );
    }

    if (error || !profile) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center">
                <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mb-4 text-gray-500">
                    <User size={32} />
                </div>
                <h2 className="text-xl font-bold text-white mb-2">User Not Found</h2>
                <p className="text-gray-400 text-sm mb-6">{error || "The user you are looking for does not exist."}</p>
                <Link to="/" className="px-6 py-2 bg-white/10 rounded-lg text-white font-bold hover:bg-white/20">Go Home</Link>
            </div>
        );
    }

    return (
        <div className="pb-24 sm:pl-20 sm:pt-6 space-y-6 px-4 sm:px-0">
            {/* Header */}
            <header className="pt-4">
                <Link to="/" className="inline-flex items-center gap-2 text-gray-400 hover:text-white transition mb-4">
                    <ArrowLeft size={18} /> Back
                </Link>
            </header>

            {/* Profile Card */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                <GlassCard className="text-center relative overflow-hidden bg-gradient-to-b from-blue-900/20 to-transparent border-blue-500/20">
                    {/* Background Glow */}
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-64 bg-blue-500/10 blur-[100px] rounded-full pointer-events-none"></div>

                    <div className="relative z-10">
                        <div className="w-28 h-28 mx-auto rounded-full p-1 bg-gradient-to-br from-blue-500 to-purple-500 shadow-xl mb-4">
                            <div className="w-full h-full rounded-full overflow-hidden border-4 border-black bg-black">
                                <img 
                                    src={profile.avatar_1 || `https://api.dicebear.com/7.x/avataaars/svg?seed=${profile.name_1}`} 
                                    alt={profile.name_1 || 'User'} 
                                    className="w-full h-full object-cover"
                                />
                            </div>
                        </div>

                        <div className="flex items-center justify-center gap-2 mb-1">
                            <h1 className="text-2xl font-black text-white">{profile.name_1}</h1>
                            {profile.is_kyc_1 && <CheckCircle2 size={20} className="text-blue-400 fill-blue-900/50" />}
                        </div>

                        <p className="text-sm text-gray-400 max-w-md mx-auto mb-6">
                            {profile.bio_1 || "No bio available."}
                        </p>

                        <div className="flex justify-center gap-3 mb-8">
                            <div className="bg-white/5 border border-white/10 px-4 py-2 rounded-xl flex items-center gap-2">
                                <Trophy size={14} className="text-yellow-400" />
                                <div className="text-left">
                                    <p className="text-[9px] text-gray-500 uppercase font-bold">Level</p>
                                    <p className="text-sm font-bold text-white">{profile.level_1}</p>
                                </div>
                            </div>
                            <div className="bg-white/5 border border-white/10 px-4 py-2 rounded-xl flex items-center gap-2">
                                <Hash size={14} className="text-blue-400" />
                                <div className="text-left">
                                    <p className="text-[9px] text-gray-500 uppercase font-bold">User ID</p>
                                    <p className="text-sm font-bold text-white font-mono">{profile.user_uid}</p>
                                </div>
                            </div>
                            <div className="bg-white/5 border border-white/10 px-4 py-2 rounded-xl flex items-center gap-2">
                                <Calendar size={14} className="text-green-400" />
                                <div className="text-left">
                                    <p className="text-[9px] text-gray-500 uppercase font-bold">Joined</p>
                                    <p className="text-sm font-bold text-white">{new Date(profile.created_at).toLocaleDateString()}</p>
                                </div>
                            </div>
                        </div>

                        <Link 
                            to={`/send-money?to=${profile.user_uid}`}
                            className="inline-flex items-center gap-2 bg-blue-600 text-white px-8 py-3 rounded-xl font-bold shadow-lg shadow-blue-500/20 hover:bg-blue-500 transition hover:scale-105 active:scale-95"
                        >
                            <Send size={18} /> Send Money
                        </Link>
                    </div>
                </GlassCard>
            </motion.div>
        </div>
    );
};

export default PublicProfile;
