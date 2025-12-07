
import React, { useEffect, useState } from 'react';
import GlassCard from '../../components/GlassCard';
import { supabase } from '../../integrations/supabase/client';
import { InfluencerCampaign } from '../../types';
import { 
    Users, DollarSign, TrendingUp, Facebook, Youtube, Instagram, 
    Send, UploadCloud, CheckCircle2, Clock, X, Briefcase
} from 'lucide-react';
import { useUI } from '../../context/UIContext';
import BalanceDisplay from '../../components/BalanceDisplay';
import Loader from '../../components/Loader';
import { motion, AnimatePresence } from 'framer-motion';

const StaffDashboard: React.FC = () => {
    const { toast } = useUI();
    const [campaigns, setCampaigns] = useState<InfluencerCampaign[]>([]);
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({ earnings: 0, pending: 0, completed: 0 });
    
    // Submission State
    const [selectedCampaign, setSelectedCampaign] = useState<InfluencerCampaign | null>(null);
    const [proofLink, setProofLink] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;

        // 1. Fetch Campaigns
        const { data: camps } = await supabase.from('influencer_campaigns')
            .select('*')
            .eq('status', 'active')
            .order('created_at', { ascending: false });
        
        if (camps) setCampaigns(camps as InfluencerCampaign[]);

        // 2. Fetch User Stats
        const { data: wallet } = await supabase.from('wallets').select('earning_balance').eq('user_id', session.user.id).single();
        const { count: pendingCount } = await supabase.from('influencer_submissions')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', session.user.id)
            .eq('status', 'pending');
        
        const { count: doneCount } = await supabase.from('influencer_submissions')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', session.user.id)
            .eq('status', 'approved');

        setStats({
            earnings: wallet?.earning_balance || 0,
            pending: pendingCount || 0,
            completed: doneCount || 0
        });
        setLoading(false);
    };

    const handleSubmit = async (e: React.FormEvent) => {
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

            toast.success("Submission sent for review!");
            setSelectedCampaign(null);
            setProofLink('');
            fetchData(); // Refresh stats
        } catch (e: any) {
            toast.error("Error: " + e.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    const getIcon = (platform: string) => {
        switch(platform) {
            case 'facebook': return <Facebook className="text-blue-500" size={24} />;
            case 'youtube': return <Youtube className="text-red-500" size={24} />;
            case 'instagram': return <Instagram className="text-pink-500" size={24} />;
            default: return <Briefcase className="text-gray-400" size={24} />;
        }
    };

    if (loading) return <div className="min-h-screen flex items-center justify-center"><Loader /></div>;

    return (
        <div className="pb-24 sm:pl-20 sm:pt-6 space-y-6 px-4 sm:px-0">
            <header className="pt-4 flex justify-between items-end">
                <div>
                    <h1 className="text-3xl font-display font-black text-white flex items-center gap-2">
                        <Users className="text-purple-500" /> Influencer Hub
                    </h1>
                    <p className="text-gray-400 text-sm">Boost Naxxivo, Earn Rewards.</p>
                </div>
                <div className="bg-purple-900/20 border border-purple-500/30 px-4 py-2 rounded-xl text-right">
                    <p className="text-[10px] text-purple-300 font-bold uppercase">Staff Earnings</p>
                    <p className="text-xl font-bold text-white font-mono"><BalanceDisplay amount={stats.earnings} /></p>
                </div>
            </header>

            {/* Stats Cards */}
            <div className="grid grid-cols-2 gap-4">
                <GlassCard className="p-4 flex items-center justify-between border-l-4 border-l-yellow-500">
                    <div>
                        <p className="text-gray-400 text-xs font-bold uppercase">Pending</p>
                        <p className="text-2xl font-bold text-white">{stats.pending}</p>
                    </div>
                    <Clock className="text-yellow-500 opacity-50" size={24} />
                </GlassCard>
                <GlassCard className="p-4 flex items-center justify-between border-l-4 border-l-green-500">
                    <div>
                        <p className="text-gray-400 text-xs font-bold uppercase">Approved</p>
                        <p className="text-2xl font-bold text-white">{stats.completed}</p>
                    </div>
                    <CheckCircle2 className="text-green-500 opacity-50" size={24} />
                </GlassCard>
            </div>

            {/* Campaign List */}
            <div>
                <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                    <TrendingUp size={20} className="text-blue-400" /> Available Campaigns
                </h3>
                
                {campaigns.length === 0 ? (
                    <div className="text-center py-12 bg-white/5 rounded-xl border border-white/5">
                        <p className="text-gray-500">No active campaigns available for staff.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {campaigns.map(camp => (
                            <GlassCard key={camp.id} className="border border-white/10 hover:border-purple-500/30 transition group">
                                <div className="flex justify-between items-start mb-3">
                                    <div className="flex items-center gap-3">
                                        <div className="bg-white/10 p-2 rounded-lg">{getIcon(camp.platform)}</div>
                                        <div>
                                            <h4 className="font-bold text-white">{camp.title}</h4>
                                            <p className="text-xs text-gray-400 capitalize">{camp.platform} Campaign</p>
                                        </div>
                                    </div>
                                    <span className="bg-green-500/20 text-green-400 px-3 py-1 rounded-lg text-sm font-bold">
                                        <BalanceDisplay amount={camp.payout} />
                                    </span>
                                </div>
                                
                                <div className="bg-black/30 p-3 rounded-lg text-xs text-gray-300 mb-4 border border-white/5">
                                    <p className="font-bold text-gray-500 uppercase mb-1">Requirements:</p>
                                    {camp.requirements}
                                </div>

                                <div className="flex gap-2">
                                    <a 
                                        href={camp.media_link} 
                                        target="_blank" 
                                        className="flex-1 py-2 bg-white/5 hover:bg-white/10 rounded-lg text-center text-xs font-bold text-gray-300 transition"
                                    >
                                        Get Material
                                    </a>
                                    <button 
                                        onClick={() => setSelectedCampaign(camp)}
                                        className="flex-1 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-center text-xs font-bold transition shadow-lg shadow-purple-900/20"
                                    >
                                        Submit Work
                                    </button>
                                </div>
                            </GlassCard>
                        ))}
                    </div>
                )}
            </div>

            {/* Submission Modal */}
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

                            <form onSubmit={handleSubmit} className="space-y-4">
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
                                    {isSubmitting ? <Loader className="animate-spin" size={18}/> : <Send size={18} />} Submit for Review
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