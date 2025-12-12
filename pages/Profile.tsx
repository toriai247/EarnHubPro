
import React, { useEffect, useState } from 'react';
import { 
  Edit2, LogOut, Copy, ShieldCheck, MapPin, Smartphone, 
  Palette, HelpCircle, ArrowLeft, WifiOff, Wifi, 
  User, Mail, Phone, Globe, Lock, ChevronRight, Fingerprint, 
  CreditCard, Grid, CheckCircle2, AlertTriangle, Save, X
} from 'lucide-react';
import { UserProfile, WalletData } from '../types';
import { supabase } from '../integrations/supabase/client';
import { useNavigate, Link } from 'react-router-dom';
import Loader from '../components/Loader';
import { useUI } from '../context/UIContext';
import { useSystem } from '../context/SystemContext';
import { useCurrency } from '../context/CurrencyContext';
import GoogleAd from '../components/GoogleAd';

const Profile: React.FC = () => {
  const { toast } = useUI();
  const { lowDataMode, toggleLowDataMode } = useSystem();
  const { currency, symbol } = useCurrency();
  const navigate = useNavigate();

  const [user, setUser] = useState<UserProfile | null>(null);
  const [wallet, setWallet] = useState<WalletData | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Tabs
  const [activeTab, setActiveTab] = useState<'info' | 'settings'>('info');
  
  // Edit Mode
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    bio: '',
    phone: '',
    twitter: '',
    telegram: '',
    discord: ''
  });

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (user) {
      const socials = user.socials_1 as any || {};
      setFormData({
        name: user.name_1 || '',
        bio: user.bio_1 || '',
        phone: user.phone_1 || '',
        twitter: socials.twitter || '',
        telegram: socials.telegram || '',
        discord: socials.discord || ''
      });
    }
  }, [user]);

  const fetchData = async () => {
    try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
            const { data: profileData } = await supabase.from('profiles').select('*').eq('id', session.user.id).single();
            if (profileData) setUser(profileData as UserProfile);
            
            const { data: walletData } = await supabase.from('wallets').select('*').eq('id', session.user.id).single(); // Use user_id
            if (walletData) setWallet(walletData as WalletData);
            // Fix: wallet selection based on user_id might return multiple if schema changed, ensuring single
            const { data: w } = await supabase.from('wallets').select('*').eq('user_id', session.user.id).maybeSingle();
            if (w) setWallet(w as WalletData);
        }
    } catch (e) { console.error(e); } 
    finally { setLoading(false); }
  };

  const handleUpdate = async () => {
    if (!user) return;
    try {
      const { error } = await supabase.from('profiles')
          .update({
            name_1: formData.name,
            bio_1: formData.bio,
            phone_1: formData.phone,
            socials_1: { twitter: formData.twitter, telegram: formData.telegram, discord: formData.discord }
          })
          .eq('id', user.id);

      if (error) throw error;
      toast.success("Profile Updated");
      setIsEditing(false);
      fetchData(); // Refresh
    } catch (e: any) { toast.error(e.message); }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  const copyToClipboard = (text: string) => {
      navigator.clipboard.writeText(text);
      toast.success("Copied");
  };

  if (loading) return <div className="p-10"><Loader /></div>;

  return (
    <div className="pb-24 sm:pl-20 sm:pt-6 space-y-6 px-4 sm:px-0">
        
        {/* HEADER SECTION */}
        <div className="bg-[#111] border border-[#222] rounded-2xl p-6 relative overflow-hidden">
            {/* Active Banner */}
            {user?.is_account_active && (
                <div className="absolute top-0 right-0 bg-green-600 text-white text-[10px] font-bold px-3 py-1 rounded-bl-xl shadow-lg flex items-center gap-1 z-10">
                    <CheckCircle2 size={10} /> ACTIVE
                </div>
            )}
            {!user?.is_account_active && (
                <div className="absolute top-0 right-0 bg-red-600 text-white text-[10px] font-bold px-3 py-1 rounded-bl-xl shadow-lg flex items-center gap-1 z-10">
                    <Lock size={10} /> INACTIVE
                </div>
            )}

            <div className="flex flex-col md:flex-row items-center md:items-start gap-6 relative z-0">
                
                {/* Avatar */}
                <div className="relative">
                    <div className="w-24 h-24 rounded-full bg-[#222] border-4 border-[#000] overflow-hidden flex items-center justify-center">
                        {user?.avatar_1 ? (
                            <img src={user.avatar_1} alt="Avatar" className="w-full h-full object-cover" />
                        ) : (
                            <User size={40} className="text-gray-500" />
                        )}
                    </div>
                    {user?.is_kyc_1 && (
                        <div className="absolute bottom-0 right-0 bg-green-500 text-black p-1 rounded-full border-2 border-[#000]">
                            <ShieldCheck size={14} />
                        </div>
                    )}
                </div>

                {/* Info */}
                <div className="flex-1 text-center md:text-left space-y-2">
                    <h1 className="text-2xl font-bold text-white">{user?.name_1 || 'User'}</h1>
                    <div className="flex flex-wrap justify-center md:justify-start gap-2">
                        <span className="px-2 py-1 bg-yellow-500/10 text-yellow-500 text-xs font-bold rounded border border-yellow-500/20">
                            LVL {user?.level_1}
                        </span>
                        <span className="px-2 py-1 bg-blue-500/10 text-blue-400 text-xs font-bold rounded border border-blue-500/20">
                            ID: {user?.user_uid}
                        </span>
                        {user?.is_dealer && (
                            <span className="px-2 py-1 bg-purple-500/10 text-purple-400 text-xs font-bold rounded border border-purple-500/20">
                                DEALER
                            </span>
                        )}
                    </div>
                    <p className="text-sm text-gray-400 max-w-md mx-auto md:mx-0">
                        {user?.bio_1 || "No bio set."}
                    </p>
                </div>

                {/* Quick Stats */}
                <div className="grid grid-cols-2 gap-4 w-full md:w-auto">
                    <div className="bg-[#000] p-3 rounded-xl border border-[#222] text-center min-w-[100px]">
                        <p className="text-[10px] text-gray-500 uppercase font-bold">Total Earned</p>
                        <p className="text-white font-mono font-bold">{symbol}{wallet?.total_earning.toFixed(2)}</p>
                    </div>
                    <div className="bg-[#000] p-3 rounded-xl border border-[#222] text-center min-w-[100px]">
                        <p className="text-[10px] text-gray-500 uppercase font-bold">Rank</p>
                        <p className="text-white font-bold">{user?.rank_1 || 'Rookie'}</p>
                    </div>
                </div>
            </div>
        </div>

        {/* AD PLACEMENT: DISPLAY RESPONSIVE */}
        <GoogleAd slot="9579822529" format="auto" responsive="true" />

        {/* TABS */}
        <div className="flex border-b border-[#222]">
            <button 
                onClick={() => setActiveTab('info')}
                className={`flex-1 pb-4 text-sm font-bold uppercase tracking-wider ${activeTab === 'info' ? 'text-yellow-500 border-b-2 border-yellow-500' : 'text-gray-500 hover:text-gray-300'}`}
            >
                Information
            </button>
            <button 
                onClick={() => setActiveTab('settings')}
                className={`flex-1 pb-4 text-sm font-bold uppercase tracking-wider ${activeTab === 'settings' ? 'text-yellow-500 border-b-2 border-yellow-500' : 'text-gray-500 hover:text-gray-300'}`}
            >
                Account Settings
            </button>
        </div>

        {/* --- INFO TAB --- */}
        {activeTab === 'info' && (
            <div className="space-y-6">
                
                {/* Personal Details */}
                <div className="bg-[#111] border border-[#222] rounded-xl overflow-hidden">
                    <div className="p-4 border-b border-[#222] flex justify-between items-center bg-[#151515]">
                        <h3 className="text-sm font-bold text-white uppercase flex items-center gap-2">
                            <User size={16} className="text-blue-500"/> Personal Details
                        </h3>
                        {!isEditing && (
                            <button onClick={() => setIsEditing(true)} className="text-xs bg-[#222] hover:bg-[#333] text-white px-3 py-1.5 rounded transition flex items-center gap-1">
                                <Edit2 size={12}/> Edit
                            </button>
                        )}
                    </div>
                    
                    <div className="p-6 space-y-4">
                        {isEditing ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="text-xs text-gray-500 font-bold block mb-1">Full Name</label>
                                    <input type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full bg-[#000] border border-[#333] rounded-lg p-3 text-white text-sm focus:border-yellow-500 outline-none" />
                                </div>
                                <div>
                                    <label className="text-xs text-gray-500 font-bold block mb-1">Phone Number</label>
                                    <input type="text" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} className="w-full bg-[#000] border border-[#333] rounded-lg p-3 text-white text-sm focus:border-yellow-500 outline-none" />
                                </div>
                                <div className="md:col-span-2">
                                    <label className="text-xs text-gray-500 font-bold block mb-1">Bio (Public)</label>
                                    <textarea value={formData.bio} onChange={e => setFormData({...formData, bio: e.target.value})} className="w-full bg-[#000] border border-[#333] rounded-lg p-3 text-white text-sm focus:border-yellow-500 outline-none resize-none h-20" />
                                </div>
                                
                                <div className="md:col-span-2 border-t border-[#222] pt-4">
                                    <p className="text-xs font-bold text-gray-500 mb-2">Social Links (Optional)</p>
                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                        <input placeholder="Twitter Handle" value={formData.twitter} onChange={e => setFormData({...formData, twitter: e.target.value})} className="bg-[#000] border border-[#333] rounded-lg p-2 text-white text-xs outline-none" />
                                        <input placeholder="Telegram User" value={formData.telegram} onChange={e => setFormData({...formData, telegram: e.target.value})} className="bg-[#000] border border-[#333] rounded-lg p-2 text-white text-xs outline-none" />
                                        <input placeholder="Discord ID" value={formData.discord} onChange={e => setFormData({...formData, discord: e.target.value})} className="bg-[#000] border border-[#333] rounded-lg p-2 text-white text-xs outline-none" />
                                    </div>
                                </div>

                                <div className="md:col-span-2 flex justify-end gap-3 mt-2">
                                    <button onClick={() => setIsEditing(false)} className="px-4 py-2 text-xs font-bold text-gray-400 hover:text-white transition">Cancel</button>
                                    <button onClick={handleUpdate} className="px-6 py-2 bg-yellow-500 text-black font-bold text-xs rounded hover:bg-yellow-400 transition flex items-center gap-2">
                                        <Save size={14}/> Save Changes
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-y-6 gap-x-12">
                                <div>
                                    <p className="text-xs text-gray-500 font-bold uppercase mb-1">Email Address</p>
                                    <div className="flex items-center gap-2 text-white text-sm">
                                        <Mail size={16} className="text-gray-600" /> {user?.email_1}
                                    </div>
                                </div>
                                <div>
                                    <p className="text-xs text-gray-500 font-bold uppercase mb-1">Phone Number</p>
                                    <div className="flex items-center gap-2 text-white text-sm">
                                        <Phone size={16} className="text-gray-600" /> {user?.phone_1 || 'Not set'}
                                    </div>
                                </div>
                                <div>
                                    <p className="text-xs text-gray-500 font-bold uppercase mb-1">Joined Date</p>
                                    <div className="flex items-center gap-2 text-white text-sm">
                                        <Globe size={16} className="text-gray-600" /> {new Date(user?.created_at || Date.now()).toLocaleDateString()}
                                    </div>
                                </div>
                                <div>
                                    <p className="text-xs text-gray-500 font-bold uppercase mb-1">Socials</p>
                                    <div className="flex gap-3 text-sm text-gray-300">
                                        {(user?.socials_1 as any)?.twitter && <span className="text-blue-400">Twitter</span>}
                                        {(user?.socials_1 as any)?.telegram && <span className="text-blue-500">Telegram</span>}
                                        {!(user?.socials_1 as any)?.twitter && !(user?.socials_1 as any)?.telegram && <span className="text-gray-600 italic">None linked</span>}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Referral Card */}
                <div className="bg-[#111] border border-[#222] rounded-xl p-6 flex flex-col md:flex-row items-center justify-between gap-4">
                    <div>
                        <h4 className="font-bold text-white text-sm mb-1">Referral Program</h4>
                        <p className="text-xs text-gray-400">Share your code to earn 5% commission.</p>
                    </div>
                    <div className="flex items-center gap-2 bg-[#000] p-2 rounded-lg border border-[#333]">
                        <span className="font-mono text-lg font-bold text-yellow-500 px-2 tracking-widest">{user?.ref_code_1}</span>
                        <button onClick={() => copyToClipboard(user?.ref_code_1 || '')} className="p-2 hover:bg-[#222] rounded text-gray-400 hover:text-white transition">
                            <Copy size={16} />
                        </button>
                    </div>
                </div>
            </div>
        )}

        {/* --- SETTINGS TAB --- */}
        {activeTab === 'settings' && (
            <div className="space-y-4">
                
                {/* Security Group */}
                <div className="bg-[#111] border border-[#222] rounded-xl overflow-hidden">
                    <div className="p-3 bg-[#151515] border-b border-[#222] text-xs font-bold text-gray-500 uppercase">Security</div>
                    
                    <div className="divide-y divide-[#222]">
                        <div className="p-4 flex items-center justify-between hover:bg-[#1a1a1a] transition cursor-pointer">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-green-900/20 text-green-500 rounded-lg"><ShieldCheck size={18}/></div>
                                <div>
                                    <p className="text-sm font-bold text-white">KYC Verification</p>
                                    <p className="text-[10px] text-gray-500">{user?.is_kyc_1 ? 'Verified Identity' : 'Submit Documents'}</p>
                                </div>
                            </div>
                            <span className={`text-[10px] font-bold px-2 py-1 rounded uppercase ${user?.is_kyc_1 ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}`}>
                                {user?.is_kyc_1 ? 'Verified' : 'Unverified'}
                            </span>
                        </div>

                        <Link to="/biometric-setup" className="p-4 flex items-center justify-between hover:bg-[#1a1a1a] transition cursor-pointer">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-purple-900/20 text-purple-500 rounded-lg"><Fingerprint size={18}/></div>
                                <div>
                                    <p className="text-sm font-bold text-white">Passkey Setup</p>
                                    <p className="text-[10px] text-gray-500">Biometric Login</p>
                                </div>
                            </div>
                            <ChevronRight size={16} className="text-gray-600" />
                        </Link>
                    </div>
                </div>

                {/* Preferences Group */}
                <div className="bg-[#111] border border-[#222] rounded-xl overflow-hidden">
                    <div className="p-3 bg-[#151515] border-b border-[#222] text-xs font-bold text-gray-500 uppercase">Preferences</div>
                    
                    <div className="divide-y divide-[#222]">
                        <Link to="/themes" className="p-4 flex items-center justify-between hover:bg-[#1a1a1a] transition cursor-pointer">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-blue-900/20 text-blue-500 rounded-lg"><Palette size={18}/></div>
                                <div>
                                    <p className="text-sm font-bold text-white">Appearance</p>
                                    <p className="text-[10px] text-gray-500">Theme Selection</p>
                                </div>
                            </div>
                            <ChevronRight size={16} className="text-gray-600" />
                        </Link>

                        <Link to="/exchange" className="p-4 flex items-center justify-between hover:bg-[#1a1a1a] transition cursor-pointer">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-green-900/20 text-green-500 rounded-lg"><CreditCard size={18}/></div>
                                <div>
                                    <p className="text-sm font-bold text-white">Currency</p>
                                    <p className="text-[10px] text-gray-500">Display: {currency}</p>
                                </div>
                            </div>
                            <ChevronRight size={16} className="text-gray-600" />
                        </Link>

                        <div className="p-4 flex items-center justify-between hover:bg-[#1a1a1a] transition cursor-pointer" onClick={toggleLowDataMode}>
                            <div className="flex items-center gap-3">
                                <div className={`p-2 rounded-lg ${lowDataMode ? 'bg-orange-900/20 text-orange-500' : 'bg-[#222] text-gray-500'}`}>
                                    {lowDataMode ? <WifiOff size={18}/> : <Wifi size={18}/>}
                                </div>
                                <div>
                                    <p className="text-sm font-bold text-white">Low Data Mode</p>
                                    <p className="text-[10px] text-gray-500">{lowDataMode ? 'Enabled' : 'Disabled'}</p>
                                </div>
                            </div>
                            <div className={`w-10 h-5 rounded-full relative transition-colors ${lowDataMode ? 'bg-yellow-500' : 'bg-[#333]'}`}>
                                <div className={`absolute top-1 left-1 w-3 h-3 bg-white rounded-full transition-all ${lowDataMode ? 'translate-x-5' : ''}`}></div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* System Group */}
                <div className="bg-[#111] border border-[#222] rounded-xl overflow-hidden">
                    <div className="p-3 bg-[#151515] border-b border-[#222] text-xs font-bold text-gray-500 uppercase">System</div>
                    
                    <div className="divide-y divide-[#222]">
                        <Link to="/support" className="p-4 flex items-center justify-between hover:bg-[#1a1a1a] transition cursor-pointer">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-[#222] text-gray-400 rounded-lg"><HelpCircle size={18}/></div>
                                <span className="text-sm font-bold text-white">Help & Support</span>
                            </div>
                            <ChevronRight size={16} className="text-gray-600" />
                        </Link>

                        <button onClick={handleLogout} className="w-full p-4 flex items-center justify-between hover:bg-red-900/10 transition cursor-pointer text-left group">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-red-900/20 text-red-500 rounded-lg group-hover:bg-red-500 group-hover:text-white transition"><LogOut size={18}/></div>
                                <span className="text-sm font-bold text-red-500 group-hover:text-red-400">Sign Out</span>
                            </div>
                        </button>
                    </div>
                </div>

                <p className="text-center text-[10px] text-gray-600 font-mono pt-4">
                    Naxxivo App v4.5.2 • {user?.id}
                </p>
            </div>
        )}
    </div>
  );
};

export default Profile;
