
import React, { useEffect, useState } from 'react';
import GlassCard from '../components/GlassCard';
import SmartImage from '../components/SmartImage';
import { 
  Edit2, LogOut, Copy, 
  ShieldCheck, 
  MapPin, Smartphone, Laptop,
  Palette, HelpCircle, ArrowLeft, WifiOff, Wifi
} from 'lucide-react';
import { UserProfile, WalletData } from '../types';
import { supabase } from '../integrations/supabase/client';
import { useNavigate, Link } from 'react-router-dom';
import Loader from '../components/Loader';
import { useUI } from '../context/UIContext';
import { useSystem } from '../context/SystemContext';
import { useCurrency } from '../context/CurrencyContext';

const Profile: React.FC = () => {
  const { toast } = useUI();
  const { lowDataMode, toggleLowDataMode } = useSystem();
  const { format } = useCurrency();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [wallet, setWallet] = useState<WalletData | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [activeTab, setActiveTab] = useState<'details' | 'settings'>('details');
  
  const [kycStatus, setKycStatus] = useState<'unverified' | 'pending' | 'verified' | 'rejected'>('unverified');
  const [formData, setFormData] = useState({
    name_1: '',
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
            if (profileData) {
                setUser(profileData as UserProfile);
                if (profileData.is_kyc_1) setKycStatus('verified');
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
      const { data, error } = await supabase.from('profiles')
          .update({
            name_1: formData.name_1,
            bio_1: formData.bio_1,
            phone_1: formData.phone_1,
            socials_1: { twitter: formData.twitter, telegram: formData.telegram, discord: formData.discord }
          })
          .eq('id', user.id).select().single();

      if (error) throw error;
      setUser(data as UserProfile);
      setIsEditing(false);
      toast.success("Profile Updated");
    } catch (e: any) { toast.error(e.message); }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  const copyToClipboard = (text: string) => {
      navigator.clipboard.writeText(text);
      toast.success("Copied!");
  };

  if (loading) return <div className="p-10 flex justify-center"><Loader /></div>;

  return (
    <div className="pb-24 sm:pl-20 sm:pt-6 space-y-6 px-4 sm:px-0">
        
        {/* Profile Header Card */}
        <GlassCard className="flex items-center gap-4 bg-gradient-to-r from-card to-void border-border-highlight">
            <div className="w-20 h-20 rounded-full border-2 border-brand p-0.5">
                <SmartImage src={user?.avatar_1 || undefined} className="w-full h-full rounded-full object-cover bg-black" />
            </div>
            <div className="flex-1">
                <h2 className="text-xl font-bold text-main">{user?.name_1}</h2>
                <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs bg-brand/10 text-brand px-2 py-0.5 rounded font-bold">LVL {user?.level_1}</span>
                    {user?.is_kyc_1 && <span className="text-xs bg-green-500/10 text-green-500 px-2 py-0.5 rounded font-bold flex items-center gap-1"><ShieldCheck size={10}/> KYC</span>}
                </div>
                <div className="flex items-center gap-2 mt-2" onClick={() => copyToClipboard(user?.user_uid?.toString() || '')}>
                    <span className="text-[10px] text-muted font-mono">ID: {user?.user_uid}</span>
                    <Copy size={10} className="text-muted cursor-pointer"/>
                </div>
            </div>
        </GlassCard>

        {/* Tab Navigation */}
        <div className="flex bg-card p-1 rounded-xl border border-border-base">
            <button onClick={() => setActiveTab('details')} className={`flex-1 py-2 rounded-lg text-xs font-bold transition ${activeTab === 'details' ? 'bg-brand text-white' : 'text-muted'}`}>Details</button>
            <button onClick={() => setActiveTab('settings')} className={`flex-1 py-2 rounded-lg text-xs font-bold transition ${activeTab === 'settings' ? 'bg-brand text-white' : 'text-muted'}`}>Settings</button>
        </div>

        {/* DETAILS CONTENT */}
        {activeTab === 'details' && (
            <div className="space-y-4">
                <div className="bg-card border border-border-base rounded-xl p-4">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="font-bold text-main text-sm">Personal Info</h3>
                        <button onClick={() => setIsEditing(!isEditing)} className="text-brand text-xs font-bold">{isEditing ? 'Cancel' : 'Edit'}</button>
                    </div>
                    
                    {isEditing ? (
                        <div className="space-y-3">
                            <input value={formData.name_1} onChange={e => setFormData({...formData, name_1: e.target.value})} className="w-full bg-input rounded p-2 text-xs text-main border border-border-base" placeholder="Name" />
                            <input value={formData.phone_1} onChange={e => setFormData({...formData, phone_1: e.target.value})} className="w-full bg-input rounded p-2 text-xs text-main border border-border-base" placeholder="Phone" />
                            <textarea value={formData.bio_1} onChange={e => setFormData({...formData, bio_1: e.target.value})} className="w-full bg-input rounded p-2 text-xs text-main border border-border-base" placeholder="Bio" />
                            <button onClick={handleUpdateProfile} className="w-full py-2 bg-brand text-white font-bold rounded text-xs">Save Changes</button>
                        </div>
                    ) : (
                        <div className="space-y-3 text-xs">
                            <div className="flex justify-between border-b border-border-base pb-2">
                                <span className="text-muted">Email</span>
                                <span className="text-main">{user?.email_1}</span>
                            </div>
                            <div className="flex justify-between border-b border-border-base pb-2">
                                <span className="text-muted">Phone</span>
                                <span className="text-main">{user?.phone_1 || 'Not set'}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-muted">Bio</span>
                                <span className="text-main truncate max-w-[150px]">{user?.bio_1 || '---'}</span>
                            </div>
                        </div>
                    )}
                </div>

                <div className="bg-card border border-border-base rounded-xl p-4">
                    <h3 className="font-bold text-main text-sm mb-3">Referral</h3>
                    <div className="bg-input p-3 rounded-lg flex justify-between items-center">
                        <span className="font-mono font-bold text-main tracking-widest">{user?.ref_code_1}</span>
                        <button onClick={() => copyToClipboard(user?.ref_code_1 || '')}><Copy size={16} className="text-brand"/></button>
                    </div>
                </div>
            </div>
        )}

        {/* SETTINGS CONTENT */}
        {activeTab === 'settings' && (
            <div className="space-y-2">
                <Link to="/themes" className="flex items-center justify-between p-4 bg-card border border-border-base rounded-xl hover:bg-input transition">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-purple-500/10 text-purple-500 rounded-lg"><Palette size={18}/></div>
                        <span className="text-sm font-bold text-main">App Theme</span>
                    </div>
                    <ArrowLeft size={16} className="rotate-180 text-muted"/>
                </Link>
                
                {/* Low Data Mode Toggle */}
                <div 
                    onClick={toggleLowDataMode}
                    className="flex items-center justify-between p-4 bg-card border border-border-base rounded-xl cursor-pointer hover:bg-input transition"
                >
                    <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${lowDataMode ? 'bg-orange-500/10 text-orange-500' : 'bg-input text-muted'}`}>
                            {lowDataMode ? <WifiOff size={18}/> : <Wifi size={18}/>}
                        </div>
                        <span className="text-sm font-bold text-main">Low Data Mode</span>
                    </div>
                    <div className={`relative w-10 h-5 rounded-full transition-colors ${lowDataMode ? 'bg-brand' : 'bg-border-highlight'}`}>
                        <div className={`absolute top-1 left-1 w-3 h-3 bg-white rounded-full transition-transform ${lowDataMode ? 'translate-x-5' : ''}`} />
                    </div>
                </div>

                {/* Other Settings */}
                <div className="flex items-center justify-between p-4 bg-card border border-border-base rounded-xl">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-green-500/10 text-green-500 rounded-lg"><ShieldCheck size={18}/></div>
                        <span className="text-sm font-bold text-main">KYC Status</span>
                    </div>
                    <span className="text-xs font-bold text-muted uppercase">{kycStatus}</span>
                </div>

                <Link to="/support" className="flex items-center justify-between p-4 bg-card border border-border-base rounded-xl hover:bg-input transition">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-yellow-500/10 text-yellow-500 rounded-lg"><HelpCircle size={18}/></div>
                        <span className="text-sm font-bold text-main">Help & Support</span>
                    </div>
                    <ArrowLeft size={16} className="rotate-180 text-muted"/>
                </Link>

                <button onClick={handleLogout} className="w-full mt-4 py-3 border border-red-500/30 text-red-500 font-bold rounded-xl hover:bg-red-500/10 flex items-center justify-center gap-2">
                    <LogOut size={16}/> Sign Out
                </button>
            </div>
        )}
    </div>
  );
};

export default Profile;
