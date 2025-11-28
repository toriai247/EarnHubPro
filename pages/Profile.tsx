
import React, { useEffect, useState } from 'react';
import GlassCard from '../components/GlassCard';
import Skeleton from '../components/Skeleton';
import { 
  Edit2, LogOut, Settings, Share2, Copy, 
  CheckCircle2, ShieldCheck, RefreshCw, 
  MapPin, Globe, Laptop, Smartphone,
  Hash, Mail, QrCode, ExternalLink
} from 'lucide-react';
import { UserProfile, WalletData, ReferralStats, Transaction } from '../types';
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
  const [editForm, setEditForm] = useState({
    name_1: '',
    avatar_1: '',
    bio_1: '',
    phone_1: ''
  });
  const navigate = useNavigate();

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (user) {
      setEditForm({
        name_1: user.name_1 || '',
        avatar_1: user.avatar_1 || '',
        bio_1: user.bio_1 || '',
        phone_1: user.phone_1 || ''
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
      const { data, error } = await supabase.from('profiles')
          .update({
            name_1: editForm.name_1,
            avatar_1: editForm.avatar_1,
            bio_1: editForm.bio_1,
            phone_1: editForm.phone_1,
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

  const copyToClipboard = (text: string, label: string = "Copied") => {
      navigator.clipboard.writeText(text);
      toast.success(`${label} copied to clipboard!`);
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

  if (loading) {
      return (
        <div className="pb-24 sm:pl-20 sm:pt-6 space-y-6 px-4 sm:px-0">
            <Skeleton className="w-full h-48 rounded-2xl" />
            <Skeleton className="w-full h-32 rounded-xl" />
        </div>
      );
  }

  return (
    <div className="pb-24 sm:pl-20 sm:pt-6 space-y-6 px-4 sm:px-0">
        
        {/* IDENTITY CARD */}
        <GlassCard className="relative overflow-hidden border-blue-500/20">
            <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none">
                <QrCode size={120} className="text-white" />
            </div>

            <div className="flex flex-col md:flex-row gap-6 relative z-10">
                {/* Avatar */}
                <div className="flex-shrink-0 mx-auto md:mx-0">
                    <div className="w-28 h-28 rounded-full p-1 bg-gradient-to-br from-blue-500 to-purple-600 shadow-[0_0_20px_rgba(59,130,246,0.5)]">
                        <img 
                            src={user?.avatar_1 || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.name_1}`} 
                            alt="Profile" 
                            className="w-full h-full rounded-full border-4 border-black bg-black object-cover"
                        />
                    </div>
                </div>

                {/* Details */}
                <div className="flex-1 text-center md:text-left">
                    {isEditing ? (
                        <div className="space-y-3 max-w-sm">
                            <input value={editForm.name_1} onChange={e => setEditForm({...editForm, name_1: e.target.value})} className="w-full bg-black/40 border border-white/10 rounded px-3 py-2 text-white" placeholder="Full Name" />
                            <input value={editForm.avatar_1} onChange={e => setEditForm({...editForm, avatar_1: e.target.value})} className="w-full bg-black/40 border border-white/10 rounded px-3 py-2 text-white" placeholder="Avatar URL" />
                            <textarea value={editForm.bio_1} onChange={e => setEditForm({...editForm, bio_1: e.target.value})} className="w-full bg-black/40 border border-white/10 rounded px-3 py-2 text-white resize-none h-20" placeholder="Bio..." />
                            <div className="flex gap-2">
                                <button onClick={handleUpdateProfile} className="bg-green-500 text-black px-4 py-2 rounded font-bold text-sm">Save</button>
                                <button onClick={() => setIsEditing(false)} className="bg-white/10 text-white px-4 py-2 rounded font-bold text-sm">Cancel</button>
                            </div>
                        </div>
                    ) : (
                        <>
                            <div className="flex flex-col md:flex-row md:items-center gap-2 mb-2 justify-center md:justify-start">
                                <h2 className="text-2xl font-black text-white">{user?.name_1}</h2>
                                {user?.is_kyc_1 && (
                                    <span className="bg-green-500/20 text-green-400 px-2 py-0.5 rounded text-[10px] font-bold border border-green-500/30 flex items-center gap-1 w-fit mx-auto md:mx-0">
                                        <CheckCircle2 size={10} /> VERIFIED
                                    </span>
                                )}
                            </div>
                            
                            {/* HUGE ID DISPLAY */}
                            <div className="bg-black/40 border border-white/10 rounded-xl p-4 mb-4 max-w-md mx-auto md:mx-0">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div 
                                        onClick={() => copyToClipboard(user?.user_uid?.toString() || '', "ID")}
                                        className="cursor-pointer group"
                                    >
                                        <p className="text-[10px] text-gray-500 font-bold uppercase mb-1 flex items-center gap-1">
                                            <Hash size={12}/> User ID (Tap to Copy)
                                        </p>
                                        <div className="flex items-center gap-2">
                                            <span className="text-2xl font-mono font-black text-white group-hover:text-blue-400 transition">{user?.user_uid}</span>
                                            <Copy size={16} className="text-gray-600 group-hover:text-white" />
                                        </div>
                                    </div>
                                    <div 
                                        onClick={() => copyToClipboard(user?.email_1 || '', "Email")}
                                        className="cursor-pointer group border-t sm:border-t-0 sm:border-l border-white/10 pt-2 sm:pt-0 sm:pl-4"
                                    >
                                        <p className="text-[10px] text-gray-500 font-bold uppercase mb-1 flex items-center gap-1">
                                            <Mail size={12}/> Email
                                        </p>
                                        <div className="flex items-center gap-2 overflow-hidden">
                                            <span className="text-sm font-bold text-white truncate group-hover:text-blue-400 transition">{user?.email_1}</span>
                                            <Copy size={14} className="text-gray-600 group-hover:text-white shrink-0" />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <p className="text-gray-400 text-sm italic mb-4">{user?.bio_1 || "No bio set."}</p>

                            <div className="flex gap-2 justify-center md:justify-start">
                                <button onClick={() => setIsEditing(true)} className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-xs font-bold text-white flex items-center gap-2 transition">
                                    <Edit2 size={14} /> Edit Profile
                                </button>
                                <button onClick={shareProfile} className="px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg text-xs font-bold text-white flex items-center gap-2 transition">
                                    <Share2 size={14} /> Share Profile
                                </button>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </GlassCard>

        {/* Action Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Link to="/wallet" className="bg-white/5 border border-white/5 p-4 rounded-xl hover:bg-white/10 transition group text-center">
                <div className="w-10 h-10 mx-auto bg-blue-500/20 text-blue-400 rounded-full flex items-center justify-center mb-2 group-hover:scale-110 transition">
                    <Laptop size={20} />
                </div>
                <p className="text-xs font-bold text-white">My Wallet</p>
            </Link>
            <Link to="/biometric-setup" className="bg-white/5 border border-white/5 p-4 rounded-xl hover:bg-white/10 transition group text-center">
                <div className="w-10 h-10 mx-auto bg-purple-500/20 text-purple-400 rounded-full flex items-center justify-center mb-2 group-hover:scale-110 transition">
                    <ShieldCheck size={20} />
                </div>
                <p className="text-xs font-bold text-white">Security</p>
            </Link>
            <button onClick={handleLogout} className="bg-red-500/10 border border-red-500/20 p-4 rounded-xl hover:bg-red-500/20 transition group text-center col-span-2 md:col-span-1">
                <div className="w-10 h-10 mx-auto bg-red-500/20 text-red-400 rounded-full flex items-center justify-center mb-2 group-hover:scale-110 transition">
                    <LogOut size={20} />
                </div>
                <p className="text-xs font-bold text-red-400">Log Out</p>
            </button>
        </div>

    </div>
  );
};

export default Profile;
