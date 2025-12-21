
import React, { useEffect, useState } from 'react';
import GlassCard from '../components/GlassCard';
import { supabase } from '../integrations/supabase/client';
import { 
    Link as LinkIcon, Copy, TrendingUp, Users, Globe, 
    MousePointer, Eye, Loader2, Share2, Zap, AlertCircle, 
    Activity, Map as MapIcon, RefreshCw, Link2, Gift, Check, ShieldCheck
} from 'lucide-react';
import { useUI } from '../context/UIContext';
import BalanceDisplay from '../components/BalanceDisplay';
import { motion, AnimatePresence } from 'framer-motion';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

const PARTNER_BANNERS = [
    { id: 1, name: "ShrinkMe - Leaderboard", img: "https://shrinkme.io/banners/ref/728x90GIF.gif", link: "https://shrinkme.io/ref/103373471738485103929" },
    { id: 2, name: "ShrinkMe - Banner 1", img: "https://shrinkme.io/banners/ref/728x90.png", link: "https://shrinkme.io/ref/103373471738485103929" },
    { id: 3, name: "ShrinkMe - Banner 2", img: "https://shrinkme.io/banners/ref/728x90-2.png", link: "https://shrinkme.io/ref/103373471738485103929" },
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
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) {
                setLoading(false);
                return;
            }

            const { data: profile } = await supabase.from('profiles').select('user_uid').eq('id', session.user.id).single();
            if (profile) setUserUid(profile.user_uid);

            const { data: logs, error } = await supabase
                .from('unlimited_earn_logs')
                .select('*')
                .eq('referrer_id', session.user.id)
                .order('created_at', { ascending: false }); 

            if (error) {
                console.warn("Table unlimited_earn_logs might be missing", error);
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
        } finally {
            setLoading(false);
        }
    };

    const promoLink = userUid ? `${window.location.origin}/#/u-link/${userUid}` : '';

    const handleShortenAndCopy = async () => {
        if (!promoLink) return;
        
        // If we already have a short link, just copy it
        if (shortLink) {
            navigator.clipboard.writeText(shortLink);
            toast.success("Short Link Copied!");
            return;
        }

        setIsShortening(true);
        try {
            const apiToken = 'a314d689ed2d97048989982ae75ca370096fda91';
            const url = encodeURIComponent(promoLink);
            // Use a unique alias for the user
            const alias = `Nax${userUid}${Math.floor(Math.random()*99)}`;
            
            const response = await fetch(`https://api.gplinks.com/api?api=${apiToken}&url=${url}&alias=${alias}`);
            const data = await response.json();
            
            if (data.status === 'success') {
                const link = data.shortenedUrl;
                setShortLink(link);
                navigator.clipboard.writeText(link);
                toast.success("Link Generated & Copied!");
            } else {
                // Fallback to random alias if custom fail
                const res2 = await fetch(`https://api.gplinks.com/api?api=${apiToken}&url=${url}`);
                const data2 = await res2.json();
                if (data2.status === 'success') {
                    setShortLink(data2.shortenedUrl);
                    navigator.clipboard.writeText(data2.shortenedUrl);
                    toast.success("Link Generated & Copied!");
                } else {
                    toast.error("Generation failed. Copying direct link instead.");
                    navigator.clipboard.writeText(promoLink);
                }
            }
        } catch (e) {
            toast.error("Network Error. Copying direct link.");
            navigator.clipboard.writeText(promoLink);
        } finally {
            setIsShortening(false);
        }
    };

    const handleBannerClick = (link: string) => {
        window.open(link, '_blank');
    };

    if (loading) return <div className="p-10 flex justify-center"><Loader2 className="animate-spin text-cyan-500" size={40} /></div>;

    return (
        <div className="pb-24 sm:pl-20 sm:pt-6 space-y-6 px-4 sm:px-0 animate-fade-in font-sans">
            
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
                <div>
                    <h2 className="text-3xl font-display font-black text-white flex items-center gap-3">
                        <Zap className="text-cyan-400" size={32} /> UNLIMITED <span className="text-cyan-400">EARN</span>
                    </h2>
                    <p className="text-gray-400 text-sm mt-1 max-w-lg">
                        Our smart link redirects users to high-paying ads before landing on Naxxivo.
                    </p>
                </div>
                <button onClick={fetchData} className="p-2 bg-white/5 rounded-lg hover:bg-white/10 text-white transition border border-white/10">
                    <RefreshCw size={20} />
                </button>
            </div>

            {/* --- SMART LINK ENGINE --- */}
            <GlassCard className="bg-gradient-to-br from-cyan-900/20 via-[#0a0a0a] to-black border-cyan-500/30 p-8 relative overflow-hidden rounded-[2.5rem]">
                <div className="absolute top-0 right-0 p-8 opacity-5 pointer-events-none rotate-12"><LinkIcon size={180} /></div>
                
                <div className="relative z-10 text-center space-y-6">
                    <div className="flex justify-center">
                        <div className="bg-cyan-500/10 border border-cyan-500/20 px-4 py-1.5 rounded-full flex items-center gap-2">
                            <ShieldCheck size={14} className="text-cyan-400" />
                            <span className="text-[10px] font-black text-cyan-400 uppercase tracking-[0.2em]">Anti-Cheat Protocol Active</span>
                        </div>
                    </div>

                    <h3 className="text-2xl font-black text-white uppercase tracking-tighter">Your Monetized Smart Link</h3>
                    
                    <div className="max-w-xl mx-auto space-y-4">
                        <div className={`p-5 rounded-2xl bg-black/60 border-2 transition-all duration-500 ${shortLink ? 'border-green-500/50 shadow-[0_0_30px_rgba(34,197,94,0.1)]' : 'border-white/5'}`}>
                            <div className="flex items-center justify-between gap-4">
                                <div className="flex-1 min-w-0 text-left">
                                    <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest mb-1">Generated Endpoint</p>
                                    <p className={`font-mono text-sm sm:text-base truncate font-bold ${shortLink ? 'text-green-400' : 'text-gray-600'}`}>
                                        {shortLink || 'https://gp.link/waiting-for-generation...'}
                                    </p>
                                </div>
                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center border transition-all ${shortLink ? 'bg-green-500 border-green-400 text-black' : 'bg-white/5 border-white/10 text-gray-600'}`}>
                                    {shortLink ? <Check size={20} strokeWidth={3} /> : <Link2 size={20} />}
                                </div>
                            </div>
                        </div>

                        <div className="flex flex-col sm:flex-row gap-3">
                            <button 
                                onClick={handleShortenAndCopy}
                                disabled={isShortening}
                                className="flex-1 py-4 bg-white text-black font-black uppercase text-sm rounded-2xl hover:bg-cyan-400 transition-all shadow-xl active:scale-95 flex items-center justify-center gap-3"
                            >
                                {isShortening ? <Loader2 className="animate-spin" size={20}/> : <><Zap size={20} fill="currentColor"/> GENERATE & COPY LINK</>}
                            </button>
                            <button 
                                onClick={() => {
                                    if(navigator.share) {
                                        navigator.share({ title: 'Earn with me!', url: shortLink || promoLink });
                                    } else {
                                        toast.info("Share API not supported, link copied.");
                                        handleShortenAndCopy();
                                    }
                                }}
                                className="p-4 bg-white/5 border border-white/10 text-white rounded-2xl hover:bg-white/10 transition active:scale-90"
                            >
                                <Share2 size={24} />
                            </button>
                        </div>
                    </div>

                    <div className="flex flex-wrap justify-center gap-6 pt-4 border-t border-white/5">
                        <div className="text-center">
                            <p className="text-[9px] text-gray-500 font-bold uppercase tracking-widest">Yield / View</p>
                            <p className="text-xl font-black text-green-400 font-mono">৳0.10</p>
                        </div>
                        <div className="h-10 w-px bg-white/5"></div>
                        <div className="text-center">
                            <p className="text-[9px] text-gray-500 font-bold uppercase tracking-widest">Yield / Click</p>
                            <p className="text-xl font-black text-cyan-400 font-mono">৳0.05</p>
                        </div>
                        <div className="h-10 w-px bg-white/5"></div>
                        <div className="text-center">
                            <p className="text-[9px] text-gray-500 font-bold uppercase tracking-widest">Payout</p>
                            <p className="text-xl font-black text-white font-mono">INSTANT</p>
                        </div>
                    </div>
                </div>
            </GlassCard>

            {/* PARTNER BANNERS */}
            <div className="space-y-4">
                <h3 className="text-xs font-black text-gray-500 uppercase tracking-[0.3em] pl-1 flex items-center gap-2">
                    <Gift size={14} className="text-pink-500" /> Viral Ad Templates
                </h3>
                <div className="w-full overflow-hidden bg-black/20 border-y border-white/5 py-6 rounded-[2rem] relative">
                    <div className="flex gap-6 w-max animate-marquee hover:[animation-play-state:paused]">
                        {[...PARTNER_BANNERS, ...PARTNER_BANNERS].map((b, i) => (
                            <div 
                                key={i} 
                                onClick={() => handleBannerClick(b.link)}
                                className="relative group shrink-0 cursor-pointer overflow-hidden rounded-2xl border border-white/10 shadow-2xl hover:border-cyan-500/50 transition-all duration-500"
                            >
                                <img src={b.img} alt="Ad" className="h-[100px] w-auto object-contain bg-[#050505]" />
                                <div className="absolute inset-0 bg-cyan-500/10 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* METRICS */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <GlassCard className="p-5 bg-black/40 border-white/5 text-center">
                    <Eye size={24} className="text-purple-500 mx-auto mb-2" />
                    <p className="text-[9px] text-gray-500 font-black uppercase tracking-widest">Total Impressions</p>
                    <h4 className="text-2xl font-black text-white mt-1">{stats.views.toLocaleString()}</h4>
                </GlassCard>
                <GlassCard className="p-5 bg-black/40 border-white/5 text-center">
                    <MousePointer size={24} className="text-cyan-500 mx-auto mb-2" />
                    <p className="text-[9px] text-gray-500 font-black uppercase tracking-widest">Unique Clicks</p>
                    <h4 className="text-2xl font-black text-white mt-1">{stats.clicks.toLocaleString()}</h4>
                </GlassCard>
                <GlassCard className="p-5 bg-black/40 border-white/5 text-center">
                    <TrendingUp size={24} className="text-green-500 mx-auto mb-2" />
                    <p className="text-[9px] text-gray-500 font-black uppercase tracking-widest">Total Yield</p>
                    <h4 className="text-2xl font-black text-green-400 mt-1 font-mono">
                        <BalanceDisplay amount={stats.earnings} />
                    </h4>
                </GlassCard>
                <GlassCard className="p-5 bg-black/40 border-white/5 text-center">
                    <Activity size={24} className="text-orange-500 mx-auto mb-2" />
                    <p className="text-[9px] text-gray-500 font-black uppercase tracking-widest">Conv. Rate</p>
                    <h4 className="text-2xl font-black text-white mt-1">{stats.ctr.toFixed(1)}%</h4>
                </GlassCard>
            </div>

            {/* ANALYTICS */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <GlassCard className="lg:col-span-2 p-6 bg-black/40 border-white/10 h-[350px]">
                    <div className="flex items-center gap-2 mb-6">
                        <TrendingUp size={16} className="text-cyan-400" />
                        <h4 className="text-xs font-black text-white uppercase tracking-widest">Performance Flow</h4>
                    </div>
                    <div className="h-[250px] w-full">
                        {chartData.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={chartData}>
                                    <defs>
                                        <linearGradient id="colorViews" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.3}/>
                                            <stop offset="95%" stopColor="#06b6d4" stopOpacity={0}/>
                                        </linearGradient>
                                    </defs>
                                    <XAxis dataKey="date" tick={{fontSize: 9, fill: '#666'}} axisLine={false} tickLine={false} />
                                    <YAxis hide />
                                    <Tooltip contentStyle={{backgroundColor: '#111', border: '1px solid #333', borderRadius: '12px', fontSize: '10px'}} />
                                    <Area type="monotone" dataKey="views" stroke="#06b6d4" strokeWidth={3} fillOpacity={1} fill="url(#colorViews)" />
                                    <Area type="monotone" dataKey="clicks" stroke="#8b5cf6" strokeWidth={2} fill="none" />
                                </AreaChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="h-full flex items-center justify-center text-gray-600 text-xs font-bold uppercase">Awaiting Traffic Packets</div>
                        )}
                    </div>
                </GlassCard>
                
                <div className="space-y-6">
                    <GlassCard className="p-6 bg-black/40 border-white/10">
                        <h4 className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-6 flex items-center gap-2">
                            <MapIcon size={14} className="text-cyan-400"/> Geo Distribution
                        </h4>
                        {countryData.length === 0 ? (
                            <div className="text-center py-10 text-gray-600 text-xs font-bold uppercase">No Traffic Data</div>
                        ) : (
                            <div className="space-y-4">
                                {countryData.map((c, i) => (
                                    <div key={i} className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <span className="text-lg">🌍</span>
                                            <span className="text-xs font-bold text-gray-300">{c.name}</span>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <div className="w-20 h-1.5 bg-white/5 rounded-full overflow-hidden">
                                                <div 
                                                    className="h-full bg-cyan-500 shadow-[0_0_8px_cyan]" 
                                                    style={{ width: `${(c.value / (stats.views || 1)) * 100}%` }}
                                                ></div>
                                            </div>
                                            <span className="text-xs font-black text-white font-mono">{c.value}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </GlassCard>

                    <div className="p-5 bg-cyan-950/20 border border-cyan-500/20 rounded-[2rem] flex items-start gap-4">
                        <AlertCircle className="text-cyan-400 shrink-0 mt-1" size={20} />
                        <p className="text-[11px] text-cyan-200/70 leading-relaxed font-medium uppercase tracking-tight">
                            System utilizes high-cpm link shrouding. Direct bot traffic is filtered to protect network integrity.
                        </p>
                    </div>
                </div>
            </div>

            <p className="text-center text-[10px] text-gray-800 font-black uppercase tracking-[0.5em] pt-12">
                Naxxivo Affiliate Engine v9.2
            </p>

            <style>{`
                .no-scrollbar::-webkit-scrollbar { display: none; }
                @keyframes marquee { 0% { transform: translateX(0); } 100% { transform: translateX(-50%); } }
                .animate-marquee { animation: marquee 30s linear infinite; }
            `}</style>
        </div>
    );
};

export default UnlimitedEarn;
