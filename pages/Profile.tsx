
import React, { useEffect, useState } from 'react';
import GlassCard from '../components/GlassCard';
import Skeleton from '../components/Skeleton';
import { 
  Edit2, LogOut, Settings, Share2, Copy, 
  CheckCircle2, ShieldCheck, RefreshCw, 
  MapPin, Globe, Laptop, Smartphone,
  Hash, Mail, QrCode, ExternalLink,
  Camera, Calendar, Award, Fingerprint, Lock,
  Twitter, Send, MessageCircle, Phone, Save, X, User,
  UploadCloud, FileText, CreditCard, Loader2, Clock
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
  const [activeTab, setActiveTab] = useState<'overview' | 'badges' | 'security'>('overview');
  
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
            <Skeleton className="w-full h-48 rounded-2xl" />
            <Skeleton className="w-full h-32 rounded-xl" />
        </div>
      );
  }

  return (
    <div className="pb-24 sm:pl-20 sm:pt-0 space-y-6">
        <div className="relative">
            <div className="h-40 sm:h-56 w-full bg-input overflow-hidden relative border-b border-border-base">
                <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent"></div>
            </div>

            <div className="px-4 sm:px-8 -mt-16 flex flex-col sm:flex-row items-center sm:items-end gap-4 relative z-10">
                <div className="relative group">
                    <div className="w-32 h-32 rounded-full border-4 border-card bg-card shadow-2xl overflow-hidden relative">
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
                        <div className="absolute bottom-2 right-2 bg-blue-500 text-white p-1 rounded-full border-2 border-white shadow-lg" title="Verified">
                            <CheckCircle2 size={16} fill="currentColor" className="text-white" />
                        </div>
                    )}
                </div>

                <div className="flex-1 text-center sm:text-left mb-2">
                    <h1 className="text-3xl font-black text-main flex items-center justify-center sm:justify-start gap-2">
                        {user?.name_1}
                        <span className="text-xs bg-input text-muted px-2 py-0.5 rounded-lg border border-border-base font-bold uppercase tracking-wider">
                            Level {user?.level_1}
                        </span>
                    </h1>
                    <p className="text-muted text-sm flex items-center justify-center sm:justify-start gap-2 mt-1">
                        <span className="font-mono text-muted">@{user?.id.slice(0, 8)}...</span>
                    </p>
                </div>

                <div className="flex gap-3 mb-4 sm:mb-2">
                    <button 
                        onClick={() => setIsEditing(!isEditing)} 
                        className={`px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 transition ${isEditing ? 'bg-danger/10 text-danger border border-danger/20' : 'bg-card text-main border border-border-base hover:bg-input'}`}
                    >
                        {isEditing ? <X size={16}/> : <Edit2 size={16}/>}
                        {isEditing ? 'Cancel' : 'Edit Profile'}
                    </button>
                    <button onClick={shareProfile} className="p-2 bg-card text-main rounded-xl border border-border-base hover:bg-input transition">
                        <Share2 size={20} />
                    </button>
                </div>
            </div>
        </div>

        <div className="px-4 sm:px-8">
            {config?.is_activation_enabled && !user?.is_account_active && (
                <div className="bg-red-900/10 border border-red-500/20 p-4 rounded-xl mb-6 flex items-center gap-3">
                    <div className="p-2 bg-red-500/20 rounded-lg text-danger"><Lock size={20}/></div>
                    <div className="flex-1">
                        <h4 className="text-danger font-bold text-sm">Account Inactive</h4>
                        <p className="text-xs text-muted">Deposit <span className="font-bold text-main">{format(config.activation_amount || 1)}</span> to unlock withdrawals and KYC.</p>
                    </div>
                    <Link to="/deposit" className="px-4 py-2 bg-danger text-white text-xs font-bold rounded-lg hover:bg-red-600">Activate</Link>
                </div>
            )}

            <div className="grid grid-cols-3 gap-3 mb-6">
                <GlassCard className="p-3 text-center border-l-2 border-l-success">
                    <p className="text-[10px] text-muted uppercase font-bold">Total Earned</p>
                    <p className="text-lg font-bold text-success"><BalanceDisplay amount={wallet?.total_earning || 0} compact /></p>
                </GlassCard>
                <GlassCard className="p-3 text-center border-l-2 border-l-brand">
                    <p className="text-[10px] text-muted uppercase font-bold">Referrals</p>
                    <p className="text-lg font-bold text-main">{wallet?.referral_earnings ? 'Active' : '0'}</p>
                </GlassCard>
                <GlassCard className="p-3 text-center border-l-2 border-l-purple-500">
                    <p className="text-[10px] text-muted uppercase font-bold">Rank</p>
                    <p className="text-lg font-bold text-purple-500">{user?.rank_1 || 'Rookie'}</p>
                </GlassCard>
            </div>

            <div className="flex border-b border-border-base mb-6 space-x-6 overflow-x-auto no-scrollbar">
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
                            ? 'text-main border-main' 
                            : 'text-muted border-transparent hover:text-main'
                        }`}
                    >
                        <tab.icon size={16} /> {tab.label}
                    </button>
                ))}
            </div>

            {activeTab === 'overview' && (
                <div className="space-y-4">
                    {isEditing && (
                        <GlassCard className="border-border-base bg-card mb-4">
                            <h3 className="font-bold text-main mb-4">Edit Profile Details</h3>
                            <div className="space-y-4">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-xs text-muted block mb-1">Display Name</label>
                                        <input 
                                            value={formData.name_1} 
                                            onChange={e => setFormData({...formData, name_1: e.target.value})}
                                            className="w-full bg-input border border-border-base rounded-lg p-2 text-main text-sm focus:border-brand outline-none"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-xs text-muted block mb-1">Phone Number</label>
                                        <input 
                                            value={formData.phone_1} 
                                            onChange={e => setFormData({...formData, phone_1: e.target.value})}
                                            className="w-full bg-input border border-border-base rounded-lg p-2 text-main text-sm focus:border-brand outline-none"
                                            placeholder="+1 234 567 890"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="text-xs text-muted block mb-1">Bio</label>
                                    <textarea 
                                        value={formData.bio_1} 
                                        onChange={e => setFormData({...formData, bio_1: e.target.value})}
                                        className="w-full bg-input border border-border-base rounded-lg p-2 text-main text-sm focus:border-brand outline-none h-20 resize-none"
                                        placeholder="Tell us about yourself..."
                                    />
                                </div>
                                <div className="flex justify-end gap-3 pt-2">
                                    <button onClick={() => setIsEditing(false)} className="px-4 py-2 rounded-lg text-sm font-bold text-muted hover:text-main transition">Cancel</button>
                                    <button onClick={handleUpdateProfile} className="px-6 py-2 bg-main text-void rounded-lg text-sm font-bold hover:opacity-90 transition flex items-center gap-2">
                                        <Save size={16}/> Save Changes
                                    </button>
                                </div>
                            </div>
                        </GlassCard>
                    )}

                    <GlassCard className="relative overflow-hidden">
                        <h3 className="font-bold text-main text-sm mb-2 uppercase tracking-wide">About Me</h3>
                        <p className="text-muted text-sm leading-relaxed italic">
                            {user?.bio_1 || "No bio added yet. Click edit to tell your story."}
                        </p>
                    </GlassCard>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <GlassCard>
                            <h3 className="font-bold text-main text-sm mb-3 uppercase tracking-wide flex items-center gap-2">
                                <Hash size={16}/> Account IDs
                            </h3>
                            <div className="space-y-3">
                                <div 
                                    onClick={() => copyToClipboard(user?.user_uid?.toString() || '', "User ID")}
                                    className="bg-input p-3 rounded-xl flex items-center justify-between cursor-pointer hover:bg-border-base transition group border border-border-base"
                                >
                                    <div>
                                        <p className="text-[10px] text-muted font-bold uppercase">Public ID</p>
                                        <p className="text-main font-mono font-bold text-lg tracking-widest">{user?.user_uid}</p>
                                    </div>
                                    <Copy size={16} className="text-muted group-hover:text-main" />
                                </div>
                                <div 
                                    onClick={() => copyToClipboard(user?.email_1 || '', "Email")}
                                    className="bg-input p-3 rounded-xl flex items-center justify-between cursor-pointer hover:bg-border-base transition group border border-border-base"
                                >
                                    <div className="overflow-hidden mr-2">
                                        <p className="text-[10px] text-muted font-bold uppercase">Email Address</p>
                                        <p className="text-main font-mono text-sm truncate">{user?.email_1}</p>
                                    </div>
                                    <Copy size={16} className="text-muted group-hover:text-main shrink-0" />
                                </div>
                            </div>
                        </GlassCard>
                    </div>
                </div>
            )}

            {activeTab === 'badges' && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {BADGES.map(badge => {
                        const isUnlocked = userBadges.includes(badge.id);
                        return (
                            <GlassCard key={badge.id} className={`text-center transition-all ${isUnlocked ? 'border-yellow-500/30 bg-yellow-500/10' : 'opacity-50 grayscale'}`}>
                                <div className="text-4xl mb-2 drop-shadow-md">{badge.icon}</div>
                                <h4 className={`font-bold text-sm ${isUnlocked ? 'text-main' : 'text-muted'}`}>{badge.name}</h4>
                                <p className="text-[10px] text-muted mt-1 leading-tight">{badge.description}</p>
                                {isUnlocked ? (
                                    <div className="mt-2 text-[10px] text-yellow-500 font-bold uppercase tracking-wider flex items-center justify-center gap-1">
                                        <CheckCircle2 size={10} /> Unlocked
                                    </div>
                                ) : (
                                    <div className="mt-2 text-[10px] text-muted font-bold uppercase tracking-wider flex items-center justify-center gap-1">
                                        <Lock size={10} /> Locked
                                    </div>
                                )}
                            </GlassCard>
                        )
                    })}
                </div>
            )}

            {activeTab === 'security' && (
                <div className="space-y-4">
                    <GlassCard className="flex flex-col sm:flex-row items-center justify-between p-4 gap-4">
                        <div className="flex items-center gap-4 w-full">
                            <div className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 ${kycStatus === 'verified' ? 'bg-success/20 text-success' : kycStatus === 'pending' ? 'bg-warning/20 text-warning' : 'bg-input text-muted'}`}>
                                <ShieldCheck size={24} />
                            </div>
                            <div>
                                <h4 className="font-bold text-main">KYC Verification</h4>
                                <p className="text-xs text-muted">
                                    {kycStatus === 'verified' ? 'Identity verified securely.' : kycStatus === 'pending' ? 'Verification in progress.' : 'Verify identity to unlock limits.'}
                                </p>
                            </div>
                        </div>
                        
                        <div className="w-full sm:w-auto">
                            {kycStatus === 'verified' ? (
                                <span className="flex items-center justify-center gap-1 w-full sm:w-auto bg-success/20 text-success px-4 py-2 rounded-lg text-xs font-bold uppercase border border-success/30">
                                    <CheckCircle2 size={14}/> Verified
                                </span>
                            ) : kycStatus === 'pending' ? (
                                <span className="flex items-center justify-center gap-1 w-full sm:w-auto bg-warning/20 text-warning px-4 py-2 rounded-lg text-xs font-bold uppercase border border-warning/30">
                                    <Clock size={14}/> Pending Review
                                </span>
                            ) : (
                                <button 
                                    onClick={handleKYCStart}
                                    className="w-full sm:w-auto bg-input hover:bg-border-base text-main px-6 py-2.5 rounded-lg text-xs font-bold transition flex items-center justify-center gap-2 border border-border-base"
                                >
                                    {kycStatus === 'rejected' ? 'Retry KYC' : 'Start KYC'}
                                </button>
                            )}
                        </div>
                    </GlassCard>

                    <Link to="/biometric-setup" className="block">
                        <GlassCard className="flex items-center justify-between p-4 hover:bg-input transition group cursor-pointer">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-full bg-brand/20 text-brand flex items-center justify-center">
                                    <Fingerprint size={24} />
                                </div>
                                <div>
                                    <h4 className="font-bold text-main group-hover:text-brand transition">Biometric Login</h4>
                                    <p className="text-xs text-muted">Use Fingerprint or Face ID to login securely.</p>
                                </div>
                            </div>
                            <div className="bg-input p-2 rounded-lg text-muted group-hover:text-main transition">
                                <Settings size={18} />
                            </div>
                        </GlassCard>
                    </Link>

                    <button onClick={handleLogout} className="w-full py-4 rounded-xl border border-danger/30 text-danger font-bold hover:bg-danger/10 transition flex items-center justify-center gap-2 mt-4">
                        <LogOut size={18} /> Log Out
                    </button>
                </div>
            )}

            {isKycModalOpen && (
                <div 
                    className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center p-4"
                    onClick={() => setIsKycModalOpen(false)}
                >
                    <div 
                        className="bg-card w-full max-w-lg rounded-2xl border border-border-base overflow-hidden shadow-2xl flex flex-col max-h-[90vh]"
                        onClick={(e: React.MouseEvent) => e.stopPropagation()}
                    >
                        <div className="p-4 border-b border-border-base flex justify-between items-center bg-input">
                            <h3 className="font-bold text-main flex items-center gap-2"><ShieldCheck className="text-success"/> Identity Verification</h3>
                            <button onClick={() => setIsKycModalOpen(false)} className="text-muted hover:text-main"><X size={20}/></button>
                        </div>

                        <div className="p-6 overflow-y-auto custom-scrollbar">
                            <div className="flex items-center justify-between mb-8 relative">
                                <div className="absolute left-0 right-0 top-1/2 h-0.5 bg-border-base -z-10"></div>
                                {[1, 2, 3].map(step => (
                                    <div key={step} className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs transition-colors ${kycStep >= step ? 'bg-success text-white' : 'bg-input border border-border-base text-muted'}`}>
                                        {step}
                                    </div>
                                ))}
                            </div>

                            {kycStep === 1 && (
                                <div className="space-y-4">
                                    <h4 className="text-lg font-bold text-main">Personal Details</h4>
                                    <div>
                                        <label className="text-xs text-muted block mb-1">Full Name (As per ID)</label>
                                        <input 
                                            type="text" 
                                            value={kycForm.fullName} 
                                            onChange={e => setKycForm({...kycForm, fullName: e.target.value})}
                                            className="w-full bg-input border border-border-base rounded-xl p-3 text-main text-sm focus:border-success outline-none"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-xs text-muted block mb-1">ID Number</label>
                                        <input 
                                            type="text" 
                                            value={kycForm.idNumber} 
                                            onChange={e => setKycForm({...kycForm, idNumber: e.target.value})}
                                            className="w-full bg-input border border-border-base rounded-xl p-3 text-main text-sm focus:border-success outline-none"
                                        />
                                    </div>
                                </div>
                            )}

                            {kycStep === 2 && (
                                <div className="space-y-4">
                                    <h4 className="text-lg font-bold text-main">Document Upload</h4>
                                    <div className="grid grid-cols-1 gap-4">
                                        <div className="border-2 border-dashed border-border-base rounded-xl p-6 text-center hover:bg-input transition relative group">
                                            <input type="file" accept="image/*" className="absolute inset-0 opacity-0 cursor-pointer z-10" onChange={e => e.target.files && setKycForm({...kycForm, frontImage: e.target.files[0]})} />
                                            <div className="flex flex-col items-center">
                                                {kycForm.frontImage ? (
                                                    <span className="text-xs font-bold text-success">{kycForm.frontImage.name}</span>
                                                ) : (
                                                    <>
                                                        <CreditCard size={32} className="text-muted mb-2"/>
                                                        <p className="text-sm font-bold text-main">Front Side</p>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                        
                                        <div className="border-2 border-dashed border-border-base rounded-xl p-6 text-center hover:bg-input transition relative group">
                                            <input type="file" accept="image/*" className="absolute inset-0 opacity-0 cursor-pointer z-10" onChange={e => e.target.files && setKycForm({...kycForm, backImage: e.target.files[0]})} />
                                            <div className="flex flex-col items-center">
                                                {kycForm.backImage ? (
                                                    <span className="text-xs font-bold text-success">{kycForm.backImage.name}</span>
                                                ) : (
                                                    <>
                                                        <div className="bg-border-base w-8 h-5 rounded mb-2"></div>
                                                        <p className="text-sm font-bold text-main">Back Side</p>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {kycStep === 3 && (
                                <div className="space-y-4 text-center">
                                    <h4 className="text-xl font-bold text-main">Confirm Submission</h4>
                                    <p className="text-sm text-muted max-w-xs mx-auto">
                                        Please verify all details are correct. Review typically takes 24-48 hours.
                                    </p>
                                </div>
                            )}
                        </div>

                        <div className="p-4 border-t border-border-base bg-card flex gap-3">
                            {kycStep > 1 && (
                                <button onClick={() => setKycStep(s => s - 1)} className="px-6 py-3 rounded-xl bg-input hover:bg-border-base text-main font-bold text-sm">
                                    Back
                                </button>
                            )}
                            <button 
                                onClick={() => {
                                    if (kycStep < 3) {
                                        if (kycStep === 1 && (!kycForm.fullName || !kycForm.idNumber)) return toast.error("Fill all fields");
                                        if (kycStep === 2 && (!kycForm.frontImage || !kycForm.backImage)) return toast.error("Upload both images");
                                        setKycStep(s => s + 1);
                                    } else {
                                        handleKycSubmit();
                                    }
                                }}
                                disabled={kycUploading}
                                className="flex-1 py-3 rounded-xl bg-success text-white font-bold text-sm hover:opacity-90 transition flex items-center justify-center gap-2"
                            >
                                {kycUploading ? <Loader2 className="animate-spin"/> : kycStep === 3 ? 'Submit Verification' : 'Continue'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    </div>
  );
};

export default Profile;
