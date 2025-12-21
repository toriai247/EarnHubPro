
import React, { useEffect, useState } from 'react';
import GlassCard from '../components/GlassCard';
import { supabase } from '../integrations/supabase/client';
import { 
    Link as LinkIcon, Copy, TrendingUp, Users, Globe, 
    MousePointer, Eye, Loader2, Share2, Zap, AlertCircle, 
    Activity, Map as MapIcon, RefreshCw, Link2, Gift, Check, ShieldCheck
} from 'lucide-react';
import { useUI } from '../context/UIContext';
import { useSystem } from '../context/SystemContext';
import BalanceDisplay from '../components/BalanceDisplay';
import { motion, AnimatePresence } from 'framer-motion';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

const PARTNER_BANNERS = [
    { id: 1, name: "ShrinkMe", img: "https://shrinkme.io/banners/ref/728x90GIF.gif", link: "https://shrinkme.io/ref/103373471738485103929" },
    { id: 2, name: "Ouo.io", img: "https://ouo.io/images/banners/r1.jpg", link: "http://ouo.io/ref/riQiDnjE" }
];

const UnlimitedEarn: React.FC = () => {
    const { toast } = useUI();
    const { config } = useSystem();
    const [stats, setStats] = useState({ views: 0, clicks: 0, earnings: 0, ctr: 0 });
    const [chartData, setChartData] = useState<any[]>([]);
    const [countryData, setCountryData] = useState<any[]>([]);
    const [userUid, setUserUid] = useState<number | null>(null);
    const [loading, setLoading] = useState(true);
    const [tableError, setTableError] = useState(false);
    
    const [shortLink, setShortLink] = useState('');
    const [isShortening, setIsShortening] = useState(false);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        setTableError(false);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) { setLoading(false); return; }

            const { data: profile } = await supabase.from('profiles').select('user_uid').eq('id', session.user.id).single();
            if (profile) setUserUid(profile.user_uid);

            const { data: logs, error } = await supabase
                .from('unlimited_earn_logs')
                .select('*')
                .eq('referrer_id', session.user.id)
                .order('created_at', { ascending: false }); 

            if (error) {
                if (error.message.includes('does not exist')) setTableError(true);
                setLoading(false);
                return;
            }

            if (logs) {
                let v = 0, c = 0, e = 0;
                const dailyMap: Record<string, {views: number, clicks: number}> = {};
                const countryMap: Record<string, number> = {};

                logs.forEach((log: any) => {
                    if (log.action_type === 'view') v++;
                    if (log.action_type === 'click') c++;
                    e += Number(log.amount || 0);

                    const country = log.country || 'Unknown';
                    countryMap[country] = (countryMap[country] || 0) + 1;

                    const date = new Date(log.created_at).toLocaleDateString('en-US', {day:'numeric', month:'short'});
                    if (!dailyMap[date]) dailyMap[date] = { views: 0, clicks: 0 };
                    if (log.action_type === 'view') dailyMap[date].views++;
                    if (log.action_type === 'click') dailyMap[date].clicks++;
                });

                setStats({ views: v, clicks: c, earnings: e, ctr: v > 0 ? (c / v) * 100 : 0 });
                setChartData(Object.keys(dailyMap).map(k => ({ date: k, ...dailyMap[k] })));
                setCountryData(Object.keys(countryMap).map(k => ({ name: k, value: countryMap[k] })).sort((a,b) => b.value - a.value).slice(0, 5));
            }
        } catch (e) { console.error(e); } finally { setLoading(false); }
    };

    const promoLink = userUid ? `${window.location.origin}/#/u-link/${userUid}` : '';

    const handleShortenAndCopy = async () => {
        if (!promoLink) return;
        if (shortLink) { navigator.clipboard.writeText(shortLink); toast.success("Copied!"); return; }

        setIsShortening(true);
        try {
            const apiToken = config?.gplinks_api_token || 'a314d689ed2d97048989982ae75ca370096fda91';
            const url = encodeURIComponent(promoLink);
            const alias = `Nax${userUid}${Math.floor(Math.random()*99)}`;
            
            const response = await fetch(`https://api.gplinks.com/api?api=${apiToken}&url=${url}&alias=${alias}`);
            const data = await response.json();
            
            if (data.status === 'success') {
                setShortLink(data.shortenedUrl);
                navigator.clipboard.writeText(data.shortenedUrl);
                toast.success("Link Generated & Copied!");
            } else {
                navigator.clipboard.writeText(promoLink);
                toast.info("Direct link copied (Generation limit hit)");
            }
        } catch (e) {
            navigator.clipboard.writeText(promoLink);
            toast.error("Network error, direct link copied.");
        } finally { setIsShortening(false); }
    };

    if (loading) return <div className="p-20 flex justify-center"><Loader2 className="animate-spin text-cyan-500" size={40} /></div>;

    return (
        <div className="pb-24 sm:pl-20 sm:pt-6 space-y-6 px-4 sm:px-0 animate-fade-in font-sans">
            <div className="flex justify-between items-end">
                <div>
                    <h2 className="text-3xl font-display font-black text-white flex items-center gap-3">
                        <Zap className="text-cyan-400" size={32} /> UNLIMITED <span className="text-cyan-400">EARN</span>
                    </h2>
                    <p className="text-gray-400 text-sm mt-1">Monetize every click and view from your network.</p>
                </div>
                <button onClick={fetchData} className="p-2 bg-white/5 rounded-lg border border-white/10 text-white"><RefreshCw size={20} /></button>
            </div>

            {tableError && (
                <div className="p-4 bg-red-950/20 border border-red-500/30 rounded-2xl flex items-center gap-3 text-red-400 text-xs font-bold">
                    <AlertCircle size={18} />
                    <span>Database not initialized. Go to Admin &gt; Ultra Kernel and run the Affiliate SQL.</span>
                </div>
            )}

            <GlassCard className="bg-gradient-to-br from-cyan-900/20 via-[#0a0a0a] to-black border-cyan-500/30 p-8 rounded-[2.5rem]">
                <div className="relative z-10 text-center space-y-6">
                    <div className="flex justify-center">
                        <div className="bg-cyan-500/10 border border-cyan-500/20 px-4 py-1.5 rounded-full flex items-center gap-2">
                            <ShieldCheck size={14} className="text-cyan-400" />
                            <span className="text-[10px] font-black text-cyan-400 uppercase tracking-[0.2em]">Anti-Spam Filter Active</span>
                        </div>
                    </div>
                    <h3 className="text-2xl font-black text-white uppercase">Your Monetized Smart Link</h3>
                    <div className="max-w-xl mx-auto space-y-4">
                        <div className="p-5 rounded-2xl bg-black/60 border border-white/10 text-left overflow-hidden">
                            <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest mb-1">Generated Endpoint</p>
                            <p className="font-mono text-sm truncate font-bold text-cyan-400">{shortLink || promoLink}</p>
                        </div>
                        <div className="flex flex-col sm:flex-row gap-3">
                            <button onClick={handleShortenAndCopy} disabled={isShortening} className="flex-1 py-4 bg-white text-black font-black uppercase text-sm rounded-2xl hover:bg-cyan-400 transition-all shadow-xl flex items-center justify-center gap-3">
                                {isShortening ? <Loader2 className="animate-spin" size={20}/> : <><Zap size={20} fill="currentColor"/> COPY SMART LINK</>}
                            </button>
                            <button onClick={() => navigator.share && navigator.share({title: 'Earn Now', url: shortLink || promoLink})} className="p-4 bg-white/5 border border-white/10 rounded-2xl text-white"><Share2 size={24} /></button>
                        </div>
                    </div>
                </div>
            </GlassCard>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <GlassCard className="p-5 bg-black/40 text-center"><p className="text-[9px] text-gray-500 uppercase font-black">Impressions</p><h4 className="text-2xl font-black text-white">{stats.views}</h4></GlassCard>
                <GlassCard className="p-5 bg-black/40 text-center"><p className="text-[9px] text-gray-500 uppercase font-black">Clicks</p><h4 className="text-2xl font-black text-white">{stats.clicks}</h4></GlassCard>
                <GlassCard className="p-5 bg-black/40 text-center"><p className="text-[9px] text-gray-500 uppercase font-black">Yield</p><h4 className="text-2xl font-black text-green-400"><BalanceDisplay amount={stats.earnings} /></h4></GlassCard>
                <GlassCard className="p-5 bg-black/40 text-center"><p className="text-[9px] text-gray-500 uppercase font-black">Conversion</p><h4 className="text-2xl font-black text-white">{stats.ctr.toFixed(1)}%</h4></GlassCard>
            </div>
        </div>
    );
};

export default UnlimitedEarn;
