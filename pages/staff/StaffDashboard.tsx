
import React, { useEffect, useState } from 'react';
import GlassCard from '../../components/GlassCard';
import { supabase } from '../../integrations/supabase/client';
import { InfluencerCampaign, UserProfile } from '../../types';
import { 
    Users, DollarSign, TrendingUp, Facebook, Youtube, Instagram, 
    Send, UploadCloud, CheckCircle2, Clock, X, Briefcase, Globe,
    Save, Link as LinkIcon, BarChart3, Filter, AlertCircle, LayoutGrid
} from 'lucide-react';
import { useUI } from '../../context/UIContext';
import BalanceDisplay from '../../components/BalanceDisplay';
import Loader from '../../components/Loader';
import { motion, AnimatePresence } from 'framer-motion';

const StaffDashboard: React.FC = () => {
    const { toast } = useUI();
    const [campaigns, setCampaigns] = useState<InfluencerCampaign[]>([]);
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({ earnings: 0, pending: 0, completed: 0, activeJobs: 0 });
    const [activeTab, setActiveTab] = useState<'jobs' | 'portfolio' | 'submissions'>('jobs');
    
    // Profile / Portfolio State
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [socialLinks, setSocialLinks] = useState({
        facebook: '',
        youtube: '',
        instagram: '',
        website: ''
    });
    const [savingProfile, setSavingProfile] = useState(false);

    // Job Filter State
    const [platformFilter, setPlatformFilter] = useState<string>('all');

    // Submission State
    const [selectedCampaign, setSelectedCampaign] = useState<InfluencerCampaign | null>(null);
    const [proofLink, setProofLink] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [mySubmissions, setMySubmissions] = useState<any[]>([]);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;

        // 1. Fetch Profile & Socials
        const { data: userProfile } = await supabase.from('profiles').select('*').eq('id', session.user.id).single();
        if (userProfile) {
            setProfile(userProfile as UserProfile);
            const savedSocials = (userProfile.socials_1 as any) || {};
            setSocialLinks({
                facebook: savedSocials.facebook || '',
                youtube: savedSocials.youtube || '',
                instagram: savedSocials.instagram || '',
                website: savedSocials.website || ''
            });
        }

        // 2. Fetch Campaigns
        const { data: camps } = await supabase.from('influencer_campaigns')
            .select('*')
            .eq('status', 'active')
            .order('created_at', { ascending: false });
        
        if (camps) setCampaigns(camps as InfluencerCampaign[]);

        // 3. Fetch My Submissions
        const { data: subs } = await supabase.from('influencer_submissions')
            .select('*, campaign:campaign_id(title, platform)')
            .eq('user_id', session.user.id)
            .order('created_at', { ascending: false });
        
        if (subs) setMySubmissions(subs);

        // 4. Fetch Wallet Stats
        const { data: wallet } = await supabase.from('wallets').select('earning_balance').eq('user_id', session.user.id).single();
        
        const pendingCount = subs?.filter(s => s.status === 'pending').length || 0;
        const doneCount = subs?.filter(s => s.status === 'approved').length || 0;

        setStats({
            earnings: wallet?.earning_balance || 0,
            pending: pendingCount,
            completed: doneCount,
            activeJobs: camps?.length || 0
        });
        setLoading(false);
    };

    const handleSaveSocials = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!profile) return;
        setSavingProfile(true);

        // Merge existing socials with new ones
        const existingSocials = (profile.socials_1 as any) || {};
        const updatedSocials = {
            ...existingSocials,
            ...socialLinks
        };

        const { error } = await supabase.from('profiles').update({
            socials_1: updatedSocials
        }).eq('id', profile.id);

        if (error) {
            toast.error("Failed to save links");
        } else {
            toast.success("Portfolio updated! Admins can now verify.");
        }
        setSavingProfile(false);
    };

    const handleSubmitProof = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedCampaign || !proofLink) return;
        
        setIsSubmitting(true);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            
            const { error } = await supabase.from('influencer_submissions').insert({
                user_id: session?.user.id,
                campaign_id: selectedCampaign.id,
                proof_link: proofLink,
                status: 'pending'
            });

            if (error) throw error;

            toast.success("Work submitted successfully!");
            setSelectedCampaign(null);
            setProofLink('');
            fetchData(); 
        } catch (e: any) {
            toast.error("Error: " + e.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    const getIcon = (platform: string) => {
        switch(platform?.toLowerCase()) {
            case 'facebook': return <Facebook className="text-blue-500" size={20} />;
            case 'youtube': return <Youtube className="text-red-500" size={20} />;
            case 'instagram': return <Instagram className="text-pink-500" size={20} />;
            case 'website': return <Globe className="text-emerald-500" size={20} />;
            default: return <Briefcase className="text-gray-400" size={20} />;
        }
    };

    const filteredCampaigns = campaigns.filter(c => platformFilter === 'all' || c.platform === platformFilter);

    if (loading) return <div className="min-h-screen flex items-center justify-center"><Loader /></div>;

    return (
        <div className="pb-24 sm:pl-20 sm:pt-6 space-y-6 px-4 sm:px-0 animate-fade-in">
            
            {/* HEADER DASHBOARD */}
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-purple-900/40 to-blue-900/40 border border-white/10 p-6 sm:p-8">
                <div className="absolute top-0 right-0 p-6 opacity-20 pointer-events-none">
                    <Briefcase size={120} className="text-white" />
                </div>
                
                <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
                    <div>
                        <div className="flex items-center gap-2 mb-2">
                            <span className="bg-purple-500/20 text-purple-300 text-[10px] font-bold px-2 py-0.5 rounded border border-purple-500/30 uppercase tracking-wider">
                                Staff Panel
                            </span>
                            {profile?.is_kyc_1 && (
                                <span className="bg-green-500/20 text-green-300 text-[10px] font-bold px-2 py-0.5 rounded border border-green-500/30 uppercase tracking-wider flex items-center gap-1">
                                    <CheckCircle2 size={10}/> Verified
                                </span>
                            )}
                        </div>
                        <h1 className="text-3xl font-display font-black text-white leading-tight">
                            Creator <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-blue-400">Studio</span>
                        </h1>
                        <p className="text-gray-400 text-sm mt-2 max-w-md">
                            Connect your accounts, get verified by admins, and unlock premium influencer jobs.
                        </p>
                    </div>
                    
                    <div className="flex gap-4">
                        <div className="bg-black/30 border border-white/10 p-3 rounded-xl backdrop-blur-sm">
                            <p className="text-[10px] text-gray-400 font-bold uppercase">Pending</p>
                            <p className="text-xl font-bold text-white">{stats.pending}</p>
                        </div>
                        <div className="bg-black/30 border border-white/10 p-3 rounded-xl backdrop-blur-sm">
                            <p className="text-[10px] text-gray-400 font-bold uppercase">Earnings</p>
                            <p className="text-xl font-bold text-green-400 font-mono"><BalanceDisplay amount={stats.earnings}/></p>
                        </div>
                    </div>
                </div>
            </div>

            {/* TAB NAVIGATION */}
            <div className="flex gap-2 overflow-x-auto no-scrollbar border-b border-white/10 pb-2">
                <button 
                    onClick={() => setActiveTab('jobs')}
                    className={`px-6 py-2 rounded-lg text-sm font-bold whitespace-nowrap transition flex items-center gap-2 ${activeTab === 'jobs' ? 'bg-white text-black' : 'text-gray-400 hover:text-white'}`}
                >
                    <Briefcase size={16}/> Available Jobs <span className="bg-black/20 px-1.5 rounded-full text-xs opacity-70">{stats.activeJobs}</span>
                </button>
                <button 
                    onClick={() => setActiveTab('portfolio')}
                    className={`px-6 py-2 rounded-lg text-sm font-bold whitespace-nowrap transition flex items-center gap-2 ${activeTab === 'portfolio' ? 'bg-white text-black' : 'text-gray-400 hover:text-white'}`}
                >
                    <LinkIcon size={16}/> My Portfolio
                </button>
                <button 
                    onClick={() => setActiveTab('submissions')}
                    className={`px-6 py-2 rounded-lg text-sm font-bold whitespace-nowrap transition flex items-center gap-2 ${activeTab === 'submissions' ? 'bg-white text-black' : 'text-gray-400 hover:text-white'}`}
                >
                    <Clock size={16}/> History
                </button>
            </div>

            {/* --- JOBS TAB --- */}
            {activeTab === 'jobs' && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
                    
                    {/* Filters */}
                    <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
                        <Filter size={16} className="text-gray-500 shrink-0" />
                        {['all', 'facebook', 'youtube', 'instagram', 'tiktok'].map(p => (
                            <button
                                key={p}
                                onClick={() => setPlatformFilter(p)}
                                className={`px-4 py-1.5 rounded-full text-xs font-bold uppercase border transition ${
                                    platformFilter === p 
                                    ? 'bg-purple-500/20 border-purple-500 text-purple-300' 
                                    : 'bg-white/5 border-white/5 text-gray-500 hover:bg-white/10'
                                }`}
                            >
                                {p}
                            </button>
                        ))}
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        {filteredCampaigns.length === 0 ? (
                            <div className="col-span-full py-12 text-center bg-white/5 rounded-2xl border border-white/5">
                                <Briefcase size={48} className="mx-auto text-gray-600 mb-4" />
                                <p className="text-gray-400">No active campaigns matching your filter.</p>
                            </div>
                        ) : (
                            filteredCampaigns.map(camp => (
                                <GlassCard key={camp.id} className="group hover:border-purple-500/30 transition-all duration-300">
                                    <div className="flex justify-between items-start mb-4">
                                        <div className="flex items-center gap-3">
                                            <div className="p-3 bg-white/5 rounded-xl border border-white/5 group-hover:bg-purple-500/10 transition">
                                                {getIcon(camp.platform)}
                                            </div>
                                            <div>
                                                <h3 className="font-bold text-white text-base">{camp.title}</h3>
                                                <p className="text-xs text-gray-500 flex items-center gap-1">
                                                    {camp.platform && <span className="capitalize">{camp.platform}</span>} • <span className="text-green-400 font-bold">Paying High</span>
                                                </p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <span className="text-xl font-bold text-white font-mono"><BalanceDisplay amount={camp.payout} /></span>
                                            <p className="text-[10px] text-gray-500 uppercase font-bold">Per Task</p>
                                        </div>
                                    </div>

                                    <div className="bg-black/30 p-3 rounded-lg border border-white/5 mb-4">
                                        <p className="text-[10px] text-gray-500 uppercase font-bold mb-1 flex items-center gap-1">
                                            <AlertCircle size={10}/> Requirements
                                        </p>
                                        <p className="text-xs text-gray-300 leading-relaxed">{camp.requirements}</p>
                                    </div>

                                    <div className="flex gap-2">
                                        <a 
                                            href={camp.media_link} 
                                            target="_blank" 
                                            className="flex-1 py-2.5 rounded-lg border border-white/10 text-xs font-bold text-gray-300 hover:text-white hover:bg-white/5 text-center transition flex items-center justify-center gap-2"
                                        >
                                            <UploadCloud size={14}/> Get Assets
                                        </a>
                                        <button 
                                            onClick={() => setSelectedCampaign(camp)}
                                            className="flex-1 py-2.5 rounded-lg bg-white text-black text-xs font-black uppercase hover:bg-gray-200 transition shadow-lg flex items-center justify-center gap-2"
                                        >
                                            Submit Work <Send size={14}/>
                                        </button>
                                    </div>
                                </GlassCard>
                            ))
                        )}
                    </div>
                </motion.div>
            )}

            {/* --- PORTFOLIO TAB --- */}
            {activeTab === 'portfolio' && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="max-w-2xl mx-auto space-y-6">
                    <GlassCard className="border-purple-500/20 bg-purple-900/5 relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-4 opacity-10"><Briefcase size={80}/></div>
                        <h2 className="text-xl font-bold text-white mb-2">Portfolio Settings</h2>
                        <p className="text-sm text-gray-400 mb-6 max-w-sm">
                            Link your channels below. Admins will verify your audience size to unlock higher-paying tiers.
                        </p>

                        <form onSubmit={handleSaveSocials} className="space-y-4 relative z-10">
                            <div className="space-y-1">
                                <label className="text-xs font-bold text-gray-500 uppercase ml-1">Facebook Profile/Page</label>
                                <div className="relative">
                                    <Facebook className="absolute left-3 top-1/2 -translate-y-1/2 text-blue-500" size={18} />
                                    <input 
                                        type="url" 
                                        value={socialLinks.facebook}
                                        onChange={e => setSocialLinks({...socialLinks, facebook: e.target.value})}
                                        className="w-full bg-black/40 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-sm text-white focus:border-blue-500 outline-none"
                                        placeholder="https://facebook.com/yourprofile"
                                    />
                                </div>
                            </div>

                            <div className="space-y-1">
                                <label className="text-xs font-bold text-gray-500 uppercase ml-1">YouTube Channel</label>
                                <div className="relative">
                                    <Youtube className="absolute left-3 top-1/2 -translate-y-1/2 text-red-500" size={18} />
                                    <input 
                                        type="url" 
                                        value={socialLinks.youtube}
                                        onChange={e => setSocialLinks({...socialLinks, youtube: e.target.value})}
                                        className="w-full bg-black/40 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-sm text-white focus:border-red-500 outline-none"
                                        placeholder="https://youtube.com/@channel"
                                    />
                                </div>
                            </div>

                            <div className="space-y-1">
                                <label className="text-xs font-bold text-gray-500 uppercase ml-1">Instagram</label>
                                <div className="relative">
                                    <Instagram className="absolute left-3 top-1/2 -translate-y-1/2 text-pink-500" size={18} />
                                    <input 
                                        type="url" 
                                        value={socialLinks.instagram}
                                        onChange={e => setSocialLinks({...socialLinks, instagram: e.target.value})}
                                        className="w-full bg-black/40 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-sm text-white focus:border-pink-500 outline-none"
                                        placeholder="https://instagram.com/username"
                                    />
                                </div>
                            </div>

                            <div className="space-y-1">
                                <label className="text-xs font-bold text-gray-500 uppercase ml-1">Website / Blog</label>
                                <div className="relative">
                                    <Globe className="absolute left-3 top-1/2 -translate-y-1/2 text-emerald-500" size={18} />
                                    <input 
                                        type="url" 
                                        value={socialLinks.website}
                                        onChange={e => setSocialLinks({...socialLinks, website: e.target.value})}
                                        className="w-full bg-black/40 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-sm text-white focus:border-emerald-500 outline-none"
                                        placeholder="https://yourwebsite.com"
                                    />
                                </div>
                            </div>

                            <div className="pt-4 flex items-center justify-between">
                                <div className="flex items-center gap-2 text-xs text-gray-400">
                                    {profile?.is_kyc_1 ? (
                                        <>
                                            <CheckCircle2 size={14} className="text-green-500" />
                                            <span className="text-green-400 font-bold">Verified Creator</span>
                                        </>
                                    ) : (
                                        <>
                                            <AlertCircle size={14} className="text-yellow-500" />
                                            <span>Verification Pending</span>
                                        </>
                                    )}
                                </div>
                                <button 
                                    type="submit"
                                    disabled={savingProfile}
                                    className="px-6 py-2.5 bg-white text-black font-bold rounded-xl hover:bg-gray-200 transition shadow-lg flex items-center gap-2"
                                >
                                    {savingProfile ? <Loader size={16} className="text-black animate-spin"/> : <Save size={16}/>} Save Portfolio
                                </button>
                            </div>
                        </form>
                    </GlassCard>
                </motion.div>
            )}

            {/* --- SUBMISSIONS TAB --- */}
            {activeTab === 'submissions' && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
                    {mySubmissions.length === 0 ? (
                        <div className="text-center py-12 text-gray-500">No submission history found.</div>
                    ) : (
                        mySubmissions.map(sub => (
                            <GlassCard key={sub.id} className="flex justify-between items-center border border-white/5">
                                <div>
                                    <h4 className="text-sm font-bold text-white">{sub.campaign?.title || 'Unknown Campaign'}</h4>
                                    <a href={sub.proof_link} target="_blank" className="text-xs text-blue-400 hover:underline truncate max-w-[200px] block mt-1">
                                        {sub.proof_link}
                                    </a>
                                    <p className="text-[10px] text-gray-500 mt-1">{new Date(sub.created_at).toLocaleString()}</p>
                                </div>
                                <div className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase ${
                                    sub.status === 'approved' ? 'bg-green-500/20 text-green-400' :
                                    sub.status === 'rejected' ? 'bg-red-500/20 text-red-400' :
                                    'bg-yellow-500/20 text-yellow-400'
                                }`}>
                                    {sub.status}
                                </div>
                            </GlassCard>
                        ))
                    )}
                </motion.div>
            )}

            {/* MODAL FOR SUBMISSIONS */}
            <AnimatePresence>
                {selectedCampaign && (
                    <motion.div 
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
                    >
                        <motion.div 
                            initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}
                            className="bg-dark-900 w-full max-w-md rounded-2xl border border-white/10 p-6 shadow-2xl relative"
                        >
                            <button onClick={() => setSelectedCampaign(null)} className="absolute top-4 right-4 text-gray-500 hover:text-white"><X size={20}/></button>
                            
                            <h3 className="text-xl font-bold text-white mb-1">Submit Proof</h3>
                            <p className="text-sm text-gray-400 mb-6">{selectedCampaign.title}</p>

                            <form onSubmit={handleSubmitProof} className="space-y-4">
                                <div>
                                    <label className="text-xs font-bold text-gray-400 uppercase block mb-1">Post / Video Link</label>
                                    <input 
                                        required
                                        type="url" 
                                        value={proofLink}
                                        onChange={e => setProofLink(e.target.value)}
                                        className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white focus:border-purple-500 outline-none placeholder-gray-600"
                                        placeholder="https://..."
                                    />
                                </div>
                                
                                <div className="bg-yellow-500/10 border border-yellow-500/20 p-3 rounded-lg flex gap-2">
                                    <UploadCloud className="text-yellow-500 shrink-0" size={16} />
                                    <p className="text-xs text-yellow-200">
                                        Ensure your post is public. Admins will verify views and engagement before payment.
                                    </p>
                                </div>

                                <button 
                                    type="submit" 
                                    disabled={isSubmitting}
                                    className="w-full py-3 bg-purple-600 text-white font-bold rounded-xl hover:bg-purple-500 transition flex items-center justify-center gap-2"
                                >
                                    {isSubmitting ? <Loader size={18} className="animate-spin"/> : <Send size={18} />} Submit for Review
                                </button>
                            </form>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

        </div>
    );
};

export default StaffDashboard;
