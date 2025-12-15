
import React, { useEffect, useState } from 'react';
import GlassCard from '../components/GlassCard';
import { supabase } from '../integrations/supabase/client';
import { 
    Link as LinkIcon, Copy, TrendingUp, Users, Globe, Monitor, 
    MousePointer, Eye, Loader2, ArrowRight, Zap, AlertCircle, Activity,
    Map as MapIcon, Smartphone, RefreshCw, BookOpen, Flame, Dice5, Check, Share2, Gift, Link2
} from 'lucide-react';
import { useUI } from '../context/UIContext';
import BalanceDisplay from '../components/BalanceDisplay';
import { motion, AnimatePresence } from 'framer-motion';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';

// --- AFFILIATE CONFIGURATION ---
const PARTNER_BANNERS = [
    { id: 1, name: "ShrinkMe - Leaderboard", img: "https://shrinkme.io/banners/ref/728x90GIF.gif", link: "https://shrinkme.io/ref/103373471738485103929" },
    { id: 2, name: "ShrinkMe - Banner 1", img: "https://shrinkme.io/banners/ref/728x90.png", link: "https://shrinkme.io/ref/103373471738485103929" },
    { id: 3, name: "ShrinkMe - Banner 2", img: "https://shrinkme.io/banners/ref/728x90-2.png", link: "https://shrinkme.io/ref/103373471738485103929" },
    { id: 4, name: "ShrinkMe - Rect", img: "https://shrinkme.io/banners/ref/336x280.png", link: "https://shrinkme.io/ref/103373471738485103929" },
    { id: 5, name: "Ouo.io", img: "https://ouo.io/images/banners/r1.jpg", link: "http://ouo.io/ref/riQiDnjE" }
];

const UnlimitedEarn: React.FC = () => {
    const { toast } = useUI();
    const [stats, setStats] = useState({
        views: 0,
        clicks: 0,
        earnings: 0,
        ctr: 0
    });
    const [chartData, setChartData] = useState<any[]>([]);
    const [countryData, setCountryData] = useState<any[]>([]);
    const [recentLogs, setRecentLogs] = useState<any[]>([]);
    const [userUid, setUserUid] = useState<number | null>(null);
    const [loading, setLoading] = useState(true);
    
    // Shortener State
    const [shortLink, setShortLink] = useState('');
    const [isShortening, setIsShortening] = useState(false);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;

        // Get User UID
        const { data: profile } = await supabase.from('profiles').select('user_uid').eq('id', session.user.id).single();
        if (profile) setUserUid(profile.user_uid);

        // Fetch Analytics (Using the new table if available, else standard)
        try {
            const { data: logs, error } = await supabase
                .from('unlimited_earn_logs')
                .select('*')
                .eq('referrer_id', session.user.id)
                .order('created_at', { ascending: false }); 

            if (logs) {
                let v = 0, c = 0, e = 0;
                const dailyMap: Record<string, {views: number, clicks: number}> = {};
                const countryMap: Record<string, number> = {};

                // Process logs (reverse for chart)
                const chartLogs = [...logs].reverse();

                logs.forEach((log: any) => {
                    if (log.action_type === 'view') v++;
                    if (log.action_type === 'click') c++;
                    e += Number(log.amount);

                    const country = log.country || 'Unknown';
                    countryMap[country] = (countryMap[country] || 0) + 1;
                });

                chartLogs.forEach((log: any) => {
                    const date = new Date(log.created_at).toLocaleDateString('en-US', {day:'numeric', month:'short'});
                    if (!dailyMap[date]) dailyMap[date] = { views: 0, clicks: 0 };
                    if (log.action_type === 'view') dailyMap[date].views++;
                    if (log.action_type === 'click') dailyMap[date].clicks++;
                });

                setStats({
                    views: v,
                    clicks: c,
                    earnings: e,
                    ctr: v > 0 ? (c / v) * 100 : 0
                });

                setChartData(Object.keys(dailyMap).map(k => ({ date: k, ...dailyMap[k] })));
                setCountryData(Object.keys(countryMap).map(k => ({ name: k, value: countryMap[k] })).sort((a,b) => b.value - a.value).slice(0, 5));
                setRecentLogs(logs.slice(0, 10));
            }
        } catch (e) {
            console.error("Fetch Error", e);
        }
        setLoading(false);
    };

    // Construct Universal Link (No category param)
    const promoLink = userUid ? `${window.location.origin}/#/u-link/${userUid}` : 'Loading...';

    const handleBannerClick = async (bannerId: number, name: string, link: string) => {
        // 1. Open immediately to prevent popup blocking
        window.open(link, '_blank');

        // 2. Track click source
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;

        try {
            await supabase.from('unlimited_earn_logs').insert({
                referrer_id: session.user.id,
                action_type: 'click',
                amount: 0.00, // No direct earnings for clicking banner yourself, just tracking
                visitor_ip: '0.0.0.0', // Admin check
                device_info: navigator.userAgent,
                country: 'Unknown',
                source: `Banner_${bannerId}_${name}` // Track specific banner
            });
            // Don't refresh whole data to keep UI smooth, maybe just toast
            // toast.success("Click tracked"); 
        } catch (e) {
            console.error("Tracking failed", e);
        }
    };

    const copyLink = () => {
        navigator.clipboard.writeText(promoLink);
        toast.success(`Copied Smart Link!`);
    };
    
    const copyShortLink = () => {
        navigator.clipboard.writeText(shortLink);
        toast.success(`Copied Short Link!`);
    };

    const shareLink = async () => {
        if (navigator.share) {
            try {
                await navigator.share({
                    title: 'Check this out!',
                    text: 'Login and win 12000 TK Bonus instantly!',
                    url: shortLink || promoLink
                });
            } catch (err) {
                console.error('Share failed:', err);
            }
        } else {
            copyLink();
        }
    };

    const handleShorten = async () => {
        if (!promoLink || promoLink.includes('Loading')) return;
        setIsShortening(true);
        try {
            const apiToken = 'a314d689ed2d97048989982ae75ca370096fda91';
            const url = encodeURIComponent(promoLink);
            const alias = `Nxv${userUid}${Math.floor(Math.random()*100)}`; // Random suffix to avoid collision
            
            // Attempt 1: Custom Alias
            let response = await fetch(`https://api.gplinks.com/api?api=${apiToken}&url=${url}&alias=${alias}`);
            let data = await response.json();
            
            if (data.status === 'success') {
                setShortLink(data.shortenedUrl);
                toast.success("Link Shortened Successfully!");
            } else {
                 // Attempt 2: Random Alias (Fallback)
                 response = await fetch(`https://api.gplinks.com/api?api=${apiToken}&url=${url}`);
                 data = await response.json();
                 
                 if (data.status === 'success') {
                    setShortLink(data.shortenedUrl);
                    toast.success("Link Shortened!");
                 } else {
                    toast.error("Shortener Error: " + (data.message || 'Unknown'));
                 }
            }
        } catch (e) {
            console.error(e);
            toast.error("Network Error. Ensure CORS is allowed or check API status.");
        } finally {
            setIsShortening(false);
        }
    };

    if (loading) return <div className="p-10"><Loader2 className="animate-spin mx-auto text-cyan-500" /></div>;

    return (
        <div className="pb-24 sm:pl-20 sm:pt-6 space-y-6 px-4 sm:px-0 animate-fade-in">
            
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
                <div>
                    <h2 className="text-3xl font-display font-black text-white flex items-center gap-2">
                        <Zap className="text-cyan-400" size={32} /> Affiliate Link
                    </h2>
                    <p className="text-gray-400 text-sm mt-1 max-w-lg">
                        Share your unique link. It automatically adapts content for maximum conversion.
                    </p>
                </div>
                <button onClick={fetchData} className="p-2 bg-white/5 rounded-lg hover:bg-white/10 text-white transition">
                    <RefreshCw size={20} />
                </button>
            </div>

            {/* PARTNER SLIDER COMPONENT */}
            <div className="py-2">
                <div className="flex items-center justify-between mb-3 px-1">
                    <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest flex items-center gap-2">
                        <Gift size={14} className="text-pink-500"/> Partner Offers
                    </h3>
                    <span className="text-[9px] bg-pink-500/10 text-pink-400 border border-pink-500/20 px-2 py-0.5 rounded font-bold uppercase animate-pulse flex items-center gap-1">
                        <Zap size={10} /> Signup Bonus Active
                    </span>
                </div>
                
                <div className="w-full overflow-hidden relative bg-black/20 border-y border-white/5 py-4 rounded-xl">
                    <div className="flex gap-4 w-max animate-marquee hover:[animation-play-state:paused]">
                        {/* Triple the list for seamless infinite loop */}
                        {[...PARTNER_BANNERS, ...PARTNER_BANNERS, ...PARTNER_BANNERS].map((b, i) => (
                            <div 
                                key={i} 
                                onClick={() => handleBannerClick(b.id, b.name || `Banner ${b.id}`, b.link)}
                                className="block relative group shrink-0 cursor-pointer"
                            >
                                <div className="absolute inset-0 bg-black/10 group-hover:bg-transparent transition duration-300 rounded-lg"></div>
                                <img 
                                    src={b.img} 
                                    alt="Make Money" 
                                    className="h-[60px] sm:h-[80px] w-auto rounded-lg shadow-lg border border-white/10 object-contain bg-[#111]"
                                />
                                <div className="absolute bottom-1 right-1 bg-black/60 text-white text-[8px] font-bold px-1.5 rounded backdrop-blur-sm opacity-0 group-hover:opacity-100 transition">
                                    VISIT
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* LINK GENERATOR */}
            <GlassCard className="bg-gradient-to-r from-cyan-900/20 to-blue-900/20 border-cyan-500/30 p-6 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-6 opacity-10 pointer-events-none"><LinkIcon size={120} /></div>
                
                <h3 className="text-sm font-bold text-cyan-300 uppercase tracking-widest mb-3">
                    Your Smart Link
                </h3>
                
                <div className="flex flex-col gap-3">
                    {/* ORIGINAL LINK ROW */}
                    <div className="flex flex-col sm:flex-row gap-3">
                        <div className="flex-1 bg-black/40 border border-cyan-500/30 rounded-xl px-4 py-3 flex items-center justify-between group cursor-pointer hover:bg-black/50 transition" onClick={copyLink}>
                            <code className="text-white font-mono text-xs sm:text-sm truncate mr-2">{promoLink}</code>
                            <Copy size={16} className="text-cyan-500 group-hover:text-white transition shrink-0" />
                        </div>
                        <div className="flex gap-2">
                            <button onClick={copyLink} className="bg-cyan-600 text-white font-bold px-6 py-3 rounded-xl hover:bg-cyan-500 transition shadow-lg shadow-cyan-500/20 whitespace-nowrap">
                                Copy Link
                            </button>
                            <button onClick={shareLink} className="p-3 bg-white/10 text-white rounded-xl hover:bg-white/20 transition border border-white/10">
                                <Share2 size={20} />
                            </button>
                        </div>
                    </div>
                    
                    {/* SHORTENER ROW */}
                    {shortLink ? (
                        <motion.div 
                            initial={{ opacity: 0, height: 0 }} 
                            animate={{ opacity: 1, height: 'auto' }}
                            className="flex flex-col sm:flex-row gap-3 items-center bg-green-500/10 border border-green-500/20 p-2 rounded-xl"
                        >
                            <div className="flex-1 px-2">
                                <p className="text-[10px] text-green-400 font-bold uppercase mb-1">Shortened URL (Higher CPM)</p>
                                <code className="text-white font-mono text-sm block truncate">{shortLink}</code>
                            </div>
                            <button onClick={copyShortLink} className="w-full sm:w-auto bg-green-600 text-white font-bold px-4 py-2 rounded-lg hover:bg-green-500 flex items-center justify-center gap-2">
                                <Copy size={14}/> Copy Short
                            </button>
                        </motion.div>
                    ) : (
                        <button 
                            onClick={handleShorten}
                            disabled={isShortening}
                            className="w-full py-3 bg-white/5 border border-white/10 rounded-xl text-xs font-bold text-gray-300 hover:text-white hover:bg-white/10 transition flex items-center justify-center gap-2"
                        >
                            {isShortening ? <Loader2 className="animate-spin" size={14} /> : <Link2 size={14} />} 
                            Generate Short Link (GPLinks)
                        </button>
                    )}
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                    <span className="text-[10px] bg-green-500/20 text-green-400 px-2 py-1 rounded border border-green-500/30 font-bold">
                        0.10 BDT / View
                    </span>
                    <span className="text-[10px] bg-blue-500/20 text-blue-400 px-2 py-1 rounded border border-blue-500/30 font-bold">
                        0.05 BDT / Click
                    </span>
                    <span className="text-[10px] bg-yellow-500/10 text-yellow-300 px-2 py-1 rounded border border-yellow-500/20 flex items-center gap-1">
                        <Activity size={10} /> Auto-Rotating Content
                    </span>
                </div>
            </GlassCard>

            {/* METRICS */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <GlassCard className="p-4 bg-black/40 border-white/5">
                    <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mb-1">Total Visitors</p>
                    <div className="flex items-center gap-2">
                        <Eye size={20} className="text-purple-500" />
                        <span className="text-2xl font-black text-white">{stats.views.toLocaleString()}</span>
                    </div>
                </GlassCard>
                <GlassCard className="p-4 bg-black/40 border-white/5">
                    <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mb-1">Ad Clicks</p>
                    <div className="flex items-center gap-2">
                        <MousePointer size={20} className="text-cyan-500" />
                        <span className="text-2xl font-black text-white">{stats.clicks.toLocaleString()}</span>
                    </div>
                </GlassCard>
                <GlassCard className="p-4 bg-black/40 border-white/5">
                    <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mb-1">Total Revenue</p>
                    <div className="flex items-center gap-2">
                        <TrendingUp size={20} className="text-green-500" />
                        <span className="text-2xl font-black text-green-400 font-mono"><BalanceDisplay amount={stats.earnings} /></span>
                    </div>
                </GlassCard>
                <GlassCard className="p-4 bg-black/40 border-white/5">
                    <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mb-1">Conv. Rate</p>
                    <div className="flex items-center gap-2">
                        <Activity size={20} className="text-orange-500" />
                        <span className="text-2xl font-black text-white">{stats.ctr.toFixed(1)}%</span>
                    </div>
                </GlassCard>
            </div>

            {/* CHARTS & GEO */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2">
                    <GlassCard className="p-5 h-full bg-black/40 border-white/10">
                        <h4 className="text-xs font-bold text-white uppercase mb-4">Traffic Performance (7 Days)</h4>
                        <div className="h-64 w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={chartData}>
                                    <defs>
                                        <linearGradient id="colorViews" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3}/>
                                            <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                                        </linearGradient>
                                    </defs>
                                    <XAxis dataKey="date" tick={{fontSize: 10}} stroke="#444" />
                                    <YAxis tick={{fontSize: 10}} stroke="#444" />
                                    <Tooltip contentStyle={{backgroundColor: '#000', border: '1px solid #333'}} />
                                    <Area type="monotone" dataKey="views" stroke="#8b5cf6" fillOpacity={1} fill="url(#colorViews)" />
                                    <Area type="monotone" dataKey="clicks" stroke="#06b6d4" fill="none" strokeWidth={2} />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </GlassCard>
                </div>
                
                <div className="space-y-6">
                    <GlassCard className="p-5 bg-black/40 border-white/10">
                        <h4 className="text-xs font-bold text-white uppercase mb-4 flex items-center gap-2">
                            <MapIcon size={14}/> Top Countries
                        </h4>
                        {countryData.length === 0 ? (
                            <div className="text-center py-6 text-gray-500 text-xs">No data yet.</div>
                        ) : (
                            <div className="space-y-3">
                                {countryData.map((c, i) => (
                                    <div key={i} className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <Globe size={14} className="text-gray-500" />
                                            <span className="text-sm text-gray-300">{c.name}</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <div className="w-16 h-1.5 bg-white/5 rounded-full overflow-hidden">
                                                <div className="h-full bg-cyan-500" style={{ width: `${(c.value / stats.views) * 100}%` }}></div>
                                            </div>
                                            <span className="text-xs font-bold text-white">{c.value}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </GlassCard>

                    <div className="bg-yellow-500/10 border border-yellow-500/20 p-4 rounded-xl flex items-start gap-3">
                        <AlertCircle className="text-yellow-500 shrink-0 mt-0.5" size={18} />
                        <div className="text-xs text-yellow-200/80 leading-relaxed">
                            <strong>Fraud Protection Active:</strong> 
                            We now track Device ID, Browser, and Location. Repeat spamming within 24 hours is automatically blocked by the system.
                        </div>
                    </div>
                </div>
            </div>

            {/* LIVE FEED TABLE */}
            <GlassCard className="p-0 overflow-hidden border-white/10 bg-black/40">
                <div className="p-4 border-b border-white/10">
                    <h4 className="text-xs font-bold text-white uppercase">Detailed Activity Log</h4>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs text-gray-400">
                        <thead className="bg-white/5 text-gray-500 font-bold uppercase">
                            <tr>
                                <th className="p-3">Time</th>
                                <th className="p-3">Action</th>
                                <th className="p-3">Device / Browser</th>
                                <th className="p-3">Location</th>
                                <th className="p-3">Source</th>
                                <th className="p-3 text-right">Revenue</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {recentLogs.map((log) => (
                                <tr key={log.id} className="hover:bg-white/5 transition">
                                    <td className="p-3">{new Date(log.created_at).toLocaleTimeString()}</td>
                                    <td className="p-3">
                                        <span className={`px-2 py-0.5 rounded uppercase font-bold text-[10px] ${log.action_type === 'click' ? 'bg-blue-500/20 text-blue-400' : 'bg-purple-500/20 text-purple-400'}`}>
                                            {log.action_type}
                                        </span>
                                    </td>
                                    <td className="p-3">
                                        <div className="flex flex-col">
                                            <span className="text-white font-bold">{log.device_type || 'Unknown'}</span>
                                            <span className="text-[10px] text-gray-500 truncate max-w-[100px]">{log.device_info || 'N/A'}</span>
                                        </div>
                                    </td>
                                    <td className="p-3">
                                        <div className="flex flex-col">
                                            <span className="text-white">{log.country}</span>
                                            <span className="text-[10px] text-gray-500">{log.city}</span>
                                        </div>
                                    </td>
                                    <td className="p-3">
                                        <span className="text-[10px] text-amber-500 font-mono bg-amber-900/10 px-1 rounded">{log.source || 'N/A'}</span>
                                    </td>
                                    <td className="p-3 text-right font-mono text-green-400 font-bold">
                                        +<BalanceDisplay amount={log.amount} />
                                    </td>
                                </tr>
                            ))}
                            {recentLogs.length === 0 && (
                                <tr>
                                    <td colSpan={6} className="p-6 text-center text-gray-600">No recent logs found.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </GlassCard>

        </div>
    );
};

export default UnlimitedEarn;
