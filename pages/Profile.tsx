
import React, { useEffect, useState } from 'react';
import GlassCard from '../components/GlassCard';
import Skeleton from '../components/Skeleton';
import SmartImage from '../components/SmartImage';
import { 
  Edit2, LogOut, Settings, Share2, Copy, 
  CheckCircle2, ShieldCheck, RefreshCw, 
  MapPin, Globe, Laptop, Smartphone,
  Hash, Mail, QrCode, ExternalLink,
  Camera, Calendar, Award, Fingerprint, Lock,
  Twitter, Send, MessageCircle, Phone, Save, X, User,
  UploadCloud, FileText, CreditCard, Loader2, Clock, Briefcase, Zap
} from 'lucide-react';
import { UserProfile, WalletData } from '../types';
import { supabase } from '../integrations/supabase/client';
import { useNavigate, Link } from 'react-router-dom';
import { BADGES } from '../constants';
import { createUserProfile } from '../lib/actions';
import BalanceDisplay from '../components/BalanceDisplay';
import { useUI } from '../context/UIContext';
import { useSystem } from '../context/SystemContext';
import { useCurrency } from '../context/CurrencyContext';

const Profile: React.FC = () => {
  const { toast } = useUI();
  const { config } = useSystem();
  const { format } = useCurrency();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [wallet, setWallet] = useState<WalletData | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'security' | 'badges'>('overview');
  
  const [kycStatus, setKycStatus] = useState<'unverified' | 'pending' | 'verified' | 'rejected'>('unverified');
  const [isKycModalOpen, setIsKycModalOpen] = useState(false);
  const [kycStep, setKycStep] = useState(1);
  const [kycForm, setKycForm] = useState({
      fullName: '',
      idType: 'passport',
      idNumber: '',
      frontImage: null as File | null,
      backImage: null as File | null
  });
  const [kycUploading, setKycUploading] = useState(false);

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
            if (profileData) {
                setUser(profileData as UserProfile);
                if (profileData.is_kyc_1) {
                    setKycStatus('verified');
                } else {
                    const { data: kycreq } = await supabase.from('kyc_requests')
                        .select('status')
                        .eq('user_id', session.user.id)
                        .order('created_at', {ascending: false})
                        .limit(1)
                        .maybeSingle();
                    
                    if (kycreq) setKycStatus(kycreq.status as any);
                    else setKycStatus('unverified');
                }
            }

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
      const dynamicBadges = [];
      if (user.is_kyc_1) dynamicBadges.push('verified');
      if (wallet.deposit > 1000) dynamicBadges.push('high_roller');
      if ((user.level_1 || 1) >= 5) dynamicBadges.push('top_inviter');
      return Array.from(new Set([...earned, ...dynamicBadges, 'early_adopter']));
  };

  const handleKYCStart = () => {
      if (config?.is_activation_enabled && !user?.is_account_active) {
          toast.error(`Please deposit ${format(config.activation_amount || 1)} first to activate your account.`);
          navigate('/deposit');
          return;
      }
      if (kycStatus === 'pending') {
          toast.info("Your KYC is currently under review.");
          return;
      }
      setIsKycModalOpen(true);
  };

  const handleKycSubmit = async () => {
      if (!user) return;
      if (!kycForm.frontImage || !kycForm.backImage) {
          toast.error("Please upload both ID images.");
          return;
      }

      setKycUploading(true);
      try {
          const timestamp = Date.now();
          const frontPath = `${user.id}/front_${timestamp}`;
          const backPath = `${user.id}/back_${timestamp}`;

          await supabase.storage.from('kyc-documents').upload(frontPath, kycForm.frontImage);
          await supabase.storage.from('kyc-documents').upload(backPath, kycForm.backImage);

          const { data: frontUrl } = supabase.storage.from('kyc-documents').getPublicUrl(frontPath);
          const { data: backUrl } = supabase.storage.from('kyc-documents').getPublicUrl(backPath);

          const { error } = await supabase.from('kyc_requests').insert({
              user_id: user.id,
              full_name: kycForm.fullName,
              id_type: kycForm.idType,
              id_number: kycForm.idNumber,
              front_image_url: frontUrl.publicUrl,
              back_image_url: backUrl.publicUrl,
              status: 'pending'
          });

          if (error) throw error;

          setKycStatus('pending');
          setIsKycModalOpen(false);
          toast.success("KYC Submitted for Review!");

      } catch (e: any) {
          toast.error("Submission failed: " + e.message);
      } finally {
          setKycUploading(false);
      }
  };

  const userBadges = getUserBadges();

  if (loading) {
      return (
        <div className="pb-24 sm:pl-20 sm:pt-6 space-y-6 px-4 sm:px-0">
            <Skeleton className="w-full h-48 rounded-xl" />
            <div className="flex gap-4">
                <Skeleton className="w-1/3 h-64 rounded-xl" />
                <Skeleton className="w-2/3 h-64 rounded-xl" />
            </div>
        </div>
      );
  }

  return (
    <div className="pb-24 sm:pl-20 sm:pt-6 space-y-6 px-4 sm:px-0 max-w-6xl mx-auto">
        
        {/* TOP ALERT: ACTIVATION */}
        {config?.is_activation_enabled && !user?.is_account_active && (
            <div className="bg-red-500/10 border border-red-500/20 p-4 rounded-lg flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-red-500/20 rounded text-red-500"><Lock size={20}/></div>
                    <div>
                        <h4 className="text-white font-bold text-sm">Account Activation Required</h4>
                        <p className="text-xs text-gray-400">Deposit <span className="text-white font-bold">{format(config.activation_amount || 1)}</span> to enable withdrawals & KYC.</p>
                    </div>
                </div>
                <Link to="/deposit" className="px-5 py-2 bg-red-600 text-white text-xs font-bold rounded hover:bg-red-500 w-full sm:w-auto text-center">Activate Now</Link>
            </div>
        )}

        <div className="flex flex-col lg:flex-row gap-6">
            
            {/* --- LEFT COLUMN: IDENTITY --- */}
            <div className="lg:w-1/3 space-y-6">
                
                {/* 1. Identity Card */}
                <div className="bg-[#111] border border-white/10 rounded-xl overflow-hidden relative">
                    {/* Cover Banner */}
                    <div className="h-24 bg-gradient-to-r from-blue-900/40 to-purple-900/40 border-b border-white/5 relative">
                        {isEditing && (
                            <button className="absolute top-2 right-2 p-2 bg-black/50 text-white rounded hover:bg-white/20"><Camera size={14}/></button>
                        )}
                    </div>
                    
                    <div className="px-6 pb-6 relative">
                        {/* Avatar */}
                        <div className="-mt-12 mb-4 relative inline-block">
                            <div className="w-24 h-24 rounded-xl bg-[#111] border-4 border-[#111] overflow-hidden shadow-lg">
                                <SmartImage 
                                    src={user?.avatar_1 || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.name_1}`} 
                                    alt="Profile" 
                                    className="w-full h-full object-cover"
                                />
                            </div>
                            {/* Verification Badge */}
                            {user?.is_kyc_1 && (
                                <div className="absolute -bottom-1 -right-1 bg-[#111] p-1 rounded-full">
                                    <CheckCircle2 size={18} className="text-blue-500 fill-black" />
                                </div>
                            )}
                        </div>

                        {/* Name & Status */}
                        <div className="mb-4">
                            <h1 className="text-xl font-bold text-white flex items-center gap-2">
                                {user?.name_1}
                                <span className="bg-white/10 text-gray-300 text-[10px] px-1.5 py-0.5 rounded uppercase border border-white/5">Lvl {user?.level_1}</span>
                            </h1>
                            <p className="text-xs text-gray-500 mt-1 flex items-center gap-2">
                                <span className="font-mono bg-black/40 px-1 rounded">ID: {user?.user_uid}</span>
                                <span className="text-gray-600">•</span>
                                <span>{user?.rank_1 || 'Rookie'}</span>
                            </p>
                        </div>

                        {/* Tags */}
                        <div className="flex flex-wrap gap-2 mb-6">
                            {user?.admin_user && <span className="px-2 py-1 bg-purple-500/20 text-purple-400 text-[10px] font-bold uppercase rounded border border-purple-500/30">Admin</span>}
                            {user?.is_dealer && <span className="px-2 py-1 bg-amber-500/20 text-amber-400 text-[10px] font-bold uppercase rounded border border-amber-500/30">Dealer</span>}
                            <span className={`px-2 py-1 text-[10px] font-bold uppercase rounded border ${user?.is_account_active ? 'bg-green-500/10 text-green-400 border-green-500/20' : 'bg-red-500/10 text-red-400 border-red-500/20'}`}>
                                {user?.is_account_active ? 'Active' : 'Inactive'}
                            </span>
                        </div>

                        {/* Actions */}
                        <div className="grid grid-cols-2 gap-3">
                            <button 
                                onClick={() => setIsEditing(!isEditing)} 
                                className={`py-2 px-4 rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition ${isEditing ? 'bg-white text-black' : 'bg-white/5 text-white hover:bg-white/10'}`}
                            >
                                {isEditing ? 'Cancel Edit' : 'Edit Profile'}
                            </button>
                            <button 
                                onClick={shareProfile} 
                                className="py-2 px-4 bg-white/5 text-white rounded-lg text-xs font-bold hover:bg-white/10 flex items-center justify-center gap-2 transition"
                            >
                                <Share2 size={14}/> Share
                            </button>
                        </div>
                    </div>
                </div>

                {/* 2. Quick Stats Card */}
                <div className="bg-[#111] border border-white/10 rounded-xl p-5 space-y-4">
                    <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest">Performance</h3>
                    <div className="space-y-4">
                        <div className="flex justify-between items-center">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-blue-500/10 text-blue-400 rounded"><CreditCard size={16}/></div>
                                <span className="text-sm text-white">Total Deposit</span>
                            </div>
                            <span className="text-sm font-mono font-bold text-white"><BalanceDisplay amount={wallet?.deposit || 0} /></span>
                        </div>
                        <div className="flex justify-between items-center">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-green-500/10 text-green-400 rounded"><Zap size={16}/></div>
                                <span className="text-sm text-white">Total Earned</span>
                            </div>
                            <span className="text-sm font-mono font-bold text-green-400">+<BalanceDisplay amount={wallet?.total_earning || 0} /></span>
                        </div>
                        <div className="flex justify-between items-center">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-purple-500/10 text-purple-400 rounded"><Award size={16}/></div>
                                <span className="text-sm text-white">XP Points</span>
                            </div>
                            <span className="text-sm font-mono font-bold text-white">{user?.xp_1 || 0}</span>
                        </div>
                    </div>
                </div>

            </div>

            {/* --- RIGHT COLUMN: DETAILS --- */}
            <div className="lg:w-2/3 space-y-6">
                
                {/* Navigation Pills */}
                <div className="flex bg-[#111] p-1 rounded-lg border border-white/10 w-full sm:w-fit">
                    {[
                        { id: 'overview', label: 'Overview', icon: User },
                        { id: 'security', label: 'Security', icon: ShieldCheck },
                        { id: 'badges', label: 'Badges', icon: Award },
                    ].map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id as any)}
                            className={`flex-1 sm:flex-none px-6 py-2 rounded-md text-xs font-bold flex items-center justify-center gap-2 transition ${
                                activeTab === tab.id 
                                ? 'bg-white text-black shadow-sm' 
                                : 'text-gray-500 hover:text-white'
                            }`}
                        >
                            <tab.icon size={14} /> {tab.label}
                        </button>
                    ))}
                </div>

                {/* TAB CONTENT */}
                
                {activeTab === 'overview' && (
                    <div className="space-y-6">
                        {isEditing ? (
                            <div className="bg-[#111] border border-white/10 rounded-xl p-6">
                                <h3 className="text-white font-bold mb-4">Edit Details</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                                    <div>
                                        <label className="text-xs text-gray-500 mb-1 block">Full Name</label>
                                        <input 
                                            value={formData.name_1} 
                                            onChange={e => setFormData({...formData, name_1: e.target.value})}
                                            className="w-full bg-black/40 border border-white/10 rounded-lg p-2 text-white text-sm focus:border-white/30 outline-none"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-xs text-gray-500 mb-1 block">Phone</label>
                                        <input 
                                            value={formData.phone_1} 
                                            onChange={e => setFormData({...formData, phone_1: e.target.value})}
                                            className="w-full bg-black/40 border border-white/10 rounded-lg p-2 text-white text-sm focus:border-white/30 outline-none"
                                        />
                                    </div>
                                </div>
                                <div className="mb-4">
                                    <label className="text-xs text-gray-500 mb-1 block">Bio</label>
                                    <textarea 
                                        value={formData.bio_1} 
                                        onChange={e => setFormData({...formData, bio_1: e.target.value})}
                                        className="w-full bg-black/40 border border-white/10 rounded-lg p-2 text-white text-sm focus:border-white/30 outline-none h-20 resize-none"
                                    />
                                </div>
                                <div className="flex justify-end gap-2">
                                    <button onClick={() => setIsEditing(false)} className="px-4 py-2 text-xs font-bold text-gray-400 hover:text-white">Cancel</button>
                                    <button onClick={handleUpdateProfile} className="px-6 py-2 bg-blue-600 text-white text-xs font-bold rounded-lg hover:bg-blue-500">Save Changes</button>
                                </div>
                            </div>
                        ) : (
                            <div className="bg-[#111] border border-white/10 rounded-xl p-6">
                                <div className="mb-6">
                                    <h4 className="text-xs font-bold text-gray-500 uppercase mb-2">About</h4>
                                    <p className="text-sm text-gray-300 leading-relaxed">
                                        {user?.bio_1 || "No bio added yet."}
                                    </p>
                                </div>
                                
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="bg-black/30 p-3 rounded-lg border border-white/5 flex items-center justify-between">
                                        <div>
                                            <p className="text-[10px] text-gray-500 uppercase font-bold">Email</p>
                                            <p className="text-white text-sm truncate w-40">{user?.email_1}</p>
                                        </div>
                                        <Copy size={14} className="text-gray-600 cursor-pointer hover:text-white" onClick={() => copyToClipboard(user?.email_1 || '')} />
                                    </div>
                                    <div className="bg-black/30 p-3 rounded-lg border border-white/5 flex items-center justify-between">
                                        <div>
                                            <p className="text-[10px] text-gray-500 uppercase font-bold">Phone</p>
                                            <p className="text-white text-sm">{user?.phone_1 || 'Not Set'}</p>
                                        </div>
                                        {user?.phone_1 && <Copy size={14} className="text-gray-600 cursor-pointer hover:text-white" onClick={() => copyToClipboard(user?.phone_1 || '')} />}
                                    </div>
                                </div>
                            </div>
                        )}

                        <div className="bg-[#111] border border-white/10 rounded-xl p-6 flex flex-col md:flex-row items-center justify-between gap-4">
                            <div>
                                <h4 className="text-white font-bold text-sm">Referral Program</h4>
                                <p className="text-xs text-gray-400">Share your code to earn 5% commission.</p>
                            </div>
                            <div className="flex items-center gap-2 bg-black/40 px-4 py-2 rounded-lg border border-white/10 w-full md:w-auto justify-between">
                                <span className="font-mono text-lg font-bold text-white tracking-widest">{user?.ref_code_1}</span>
                                <button onClick={() => copyToClipboard(user?.ref_code_1 || '')} className="text-blue-400 hover:text-white transition"><Copy size={16}/></button>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'security' && (
                    <div className="space-y-4">
                        <div className="bg-[#111] border border-white/10 rounded-xl p-6 flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div className={`p-3 rounded-full ${kycStatus === 'verified' ? 'bg-green-500/10 text-green-500' : 'bg-gray-800 text-gray-400'}`}>
                                    <ShieldCheck size={24} />
                                </div>
                                <div>
                                    <h4 className="text-white font-bold">KYC Verification</h4>
                                    <p className="text-xs text-gray-400">
                                        {kycStatus === 'verified' ? 'Identity verified.' : kycStatus === 'pending' ? 'Review in progress.' : 'Verify ID to unlock limits.'}
                                    </p>
                                </div>
                            </div>
                            {kycStatus === 'unverified' || kycStatus === 'rejected' ? (
                                <button onClick={handleKYCStart} className="px-4 py-2 bg-white text-black text-xs font-bold rounded hover:bg-gray-200">Start KYC</button>
                            ) : (
                                <span className={`text-xs font-bold px-3 py-1 rounded capitalize ${kycStatus === 'verified' ? 'bg-green-500/20 text-green-400' : 'bg-yellow-500/20 text-yellow-400'}`}>{kycStatus}</span>
                            )}
                        </div>

                        <Link to="/biometric-setup" className="block bg-[#111] border border-white/10 rounded-xl p-6 hover:bg-white/5 transition">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <div className="p-3 rounded-full bg-blue-500/10 text-blue-500">
                                        <Fingerprint size={24} />
                                    </div>
                                    <div>
                                        <h4 className="text-white font-bold">Biometric Login</h4>
                                        <p className="text-xs text-gray-400">Use Fingerprint / Face ID for faster access.</p>
                                    </div>
                                </div>
                                <Settings size={18} className="text-gray-500" />
                            </div>
                        </Link>

                        <button onClick={handleLogout} className="w-full py-4 bg-red-900/10 border border-red-900/30 text-red-400 font-bold rounded-xl hover:bg-red-900/20 transition flex items-center justify-center gap-2 text-sm">
                            <LogOut size={16}/> Sign Out
                        </button>
                    </div>
                )}

                {activeTab === 'badges' && (
                    <div className="space-y-4 animate-fade-in">
                        <div className="bg-gradient-to-r from-purple-900/20 to-blue-900/20 p-4 rounded-xl border border-white/10 flex justify-between items-center">
                            <div>
                                <h3 className="text-white font-bold text-sm">Achievement Progress</h3>
                                <p className="text-xs text-gray-400">Unlock badges to show off your status.</p>
                            </div>
                            <div className="text-right">
                                <span className="text-2xl font-black text-white">{userBadges.length}</span>
                                <span className="text-sm text-gray-500 font-bold">/{BADGES.length}</span>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                            {BADGES.map(badge => {
                                const isUnlocked = userBadges.includes(badge.id);
                                return (
                                    <GlassCard 
                                        key={badge.id} 
                                        className={`relative overflow-hidden flex flex-col items-center text-center p-4 transition-all duration-300 ${
                                            isUnlocked 
                                            ? 'border-yellow-500/30 bg-yellow-900/5 shadow-[0_0_15px_rgba(234,179,8,0.1)]' 
                                            : 'border-white/5 bg-white/5 opacity-70 hover:opacity-100'
                                        }`}
                                    >
                                        {!isUnlocked && (
                                            <div className="absolute top-2 right-2 text-gray-600">
                                                <Lock size={14} />
                                            </div>
                                        )}
                                        
                                        <div className={`text-4xl mb-3 ${isUnlocked ? 'scale-110 drop-shadow-md' : 'grayscale opacity-50'}`}>
                                            {badge.icon}
                                        </div>
                                        
                                        <h4 className={`text-sm font-bold mb-1 ${isUnlocked ? 'text-white' : 'text-gray-400'}`}>
                                            {badge.name}
                                        </h4>
                                        <p className="text-[10px] text-gray-500 leading-tight px-2">
                                            {badge.description}
                                        </p>

                                        {isUnlocked && (
                                            <div className="mt-3 text-[9px] font-black text-yellow-500 uppercase bg-yellow-500/10 px-2 py-0.5 rounded border border-yellow-500/20">
                                                Unlocked
                                            </div>
                                        )}
                                    </GlassCard>
                                )
                            })}
                        </div>
                    </div>
                )}

            </div>
        </div>

        {/* KYC MODAL (Static) */}
        {isKycModalOpen && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm" onClick={() => setIsKycModalOpen(false)}>
                <div className="bg-[#111] border border-white/10 w-full max-w-lg rounded-2xl overflow-hidden flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>
                    <div className="p-4 border-b border-white/10 flex justify-between items-center bg-black/40">
                        <h3 className="text-white font-bold flex items-center gap-2"><ShieldCheck size={18}/> Verification</h3>
                        <button onClick={() => setIsKycModalOpen(false)}><X size={20} className="text-gray-500 hover:text-white"/></button>
                    </div>
                    
                    <div className="p-6 overflow-y-auto">
                        {kycStep === 1 && (
                            <div className="space-y-4">
                                <div>
                                    <label className="text-xs text-gray-500 block mb-1">Full Legal Name</label>
                                    <input type="text" value={kycForm.fullName} onChange={e => setKycForm({...kycForm, fullName: e.target.value})} className="w-full bg-black/40 border border-white/10 rounded-lg p-3 text-white text-sm outline-none" />
                                </div>
                                <div>
                                    <label className="text-xs text-gray-500 block mb-1">ID Number</label>
                                    <input type="text" value={kycForm.idNumber} onChange={e => setKycForm({...kycForm, idNumber: e.target.value})} className="w-full bg-black/40 border border-white/10 rounded-lg p-3 text-white text-sm outline-none" />
                                </div>
                            </div>
                        )}
                        {kycStep === 2 && (
                            <div className="space-y-4">
                                <div className="border-2 border-dashed border-white/10 rounded-xl p-6 text-center relative hover:bg-white/5 transition">
                                    <input type="file" accept="image/*" className="absolute inset-0 opacity-0 cursor-pointer" onChange={e => e.target.files && setKycForm({...kycForm, frontImage: e.target.files[0]})} />
                                    <p className="text-sm text-gray-400">{kycForm.frontImage ? kycForm.frontImage.name : "Upload Front ID"}</p>
                                </div>
                                <div className="border-2 border-dashed border-white/10 rounded-xl p-6 text-center relative hover:bg-white/5 transition">
                                    <input type="file" accept="image/*" className="absolute inset-0 opacity-0 cursor-pointer" onChange={e => e.target.files && setKycForm({...kycForm, backImage: e.target.files[0]})} />
                                    <p className="text-sm text-gray-400">{kycForm.backImage ? kycForm.backImage.name : "Upload Back ID"}</p>
                                </div>
                            </div>
                        )}
                        {kycStep === 3 && (
                            <div className="text-center py-6">
                                <p className="text-gray-300 text-sm">Ready to submit your documents for review?</p>
                            </div>
                        )}
                    </div>

                    <div className="p-4 border-t border-white/10 flex gap-3">
                        {kycStep > 1 && <button onClick={() => setKycStep(s => s - 1)} className="px-4 py-2 bg-white/5 rounded text-white text-sm font-bold">Back</button>}
                        <button 
                            onClick={() => kycStep < 3 ? setKycStep(s => s + 1) : handleKycSubmit()} 
                            disabled={kycUploading}
                            className="flex-1 py-2 bg-white text-black rounded font-bold text-sm hover:bg-gray-200 transition flex items-center justify-center gap-2"
                        >
                            {kycUploading ? <Loader2 className="animate-spin" size={16}/> : kycStep === 3 ? 'Submit' : 'Next'}
                        </button>
                    </div>
                </div>
            </div>
        )}
    </div>
  );
};

export default Profile;
