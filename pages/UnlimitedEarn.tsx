import React, { useEffect, useState } from 'react';
import GlassCard from '../components/GlassCard';
import { supabase } from '../integrations/supabase/client';
import { 
    Link as LinkIcon, Copy, TrendingUp, Users, Globe, Monitor, 
    MousePointer, Eye, Loader2, ArrowRight, Zap, AlertCircle, Activity,
    Map as MapIcon, Smartphone, RefreshCw, BookOpen, Flame, Dice5, Check, Share2
} from 'lucide-react';
import { useUI } from '../context/UIContext';
import BalanceDisplay from '../components/BalanceDisplay';
import { motion, AnimatePresence } from 'framer-motion';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';

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
    
    // Category State
    const [selectedCategory, setSelectedCategory] = useState<string>('normal');

    const CATEGORIES = [
        { id: 'normal', label: 'Money / Tech', icon: Globe, color: 'text-blue-400', border: 'border-blue-500' },
        { id: 'islamic', label: 'Islamic', icon: BookOpen, color: 'text-green-400', border: 'border-green-500' },
        { id: 'betting', label: 'Betting / Games', icon: Dice5, color: 'text-yellow-400', border: 'border-yellow-500' },
        { id: 'adult', label: 'Viral / News', icon: Flame, color: 'text-red-500', border: 'border-red-500' },
    ];

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

    // Construct Link based on Category
    const promoLink = userUid ? `${window.location.origin}/#/u-link/${userUid}?cat=${selectedCategory}` : 'Loading...';

    const copyLink = () => {
        navigator.clipboard.writeText(promoLink);
        toast.success(`Copied ${selectedCategory.toUpperCase()} Link!`);
    };

    const shareLink = async () => {
        if (navigator.share) {
            try {
                await navigator.share({
                    title: 'Check this out!',
                    text: 'Login and win 12000 TK Bonus instantly!',
                    url: promoLink
                });
            } catch (err) {
                console.error('Share failed:', err);
            }
        } else {
            copyLink();
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
                        Share your unique link. When users click "Continue" on the landing page, you get paid.
                    </p>
                </div>
                <button onClick={fetchData} className="p-2 bg-white/5 rounded-lg hover:bg-white/10 text-white transition">
                    <RefreshCw size={20} />
                </button>
            </div>

            {/* CATEGORY SELECTOR */}
            <div>
                <p className="text-xs font-bold text-gray-500 uppercase mb-2 pl-1">Select Landing Page Theme</p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {CATEGORIES.map(cat => (
                        <button
                            key={cat.id}
                            onClick={() => setSelectedCategory(cat.id)}
                            className={`p-3 rounded-xl border flex flex-col items-center justify-center gap-2 transition-all ${
                                selectedCategory === cat.id 
                                ? `bg-white/10 ${cat.border} ${cat.color} shadow-lg`
                                : 'bg-[#111] border-white/5 text-gray-500 hover:bg-white/5'
                            }`}
                        >
                            <cat.icon size={24} />
                            <span className="text-xs font-bold uppercase">{cat.label}</span>
                            {selectedCategory === cat.id && <div className="w-1.5 h-1.5 rounded-full bg-current"></div>}
                        </button>
                    ))}
                </div>
            </div>

            {/* LINK GENERATOR */}
            <GlassCard className="bg-gradient-to-r from-cyan-900/20 to-blue-900/20 border-cyan-500/30 p-6 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-6 opacity-10 pointer-events-none"><LinkIcon size={120} /></div>
                
                <h3 className="text-sm font-bold text-cyan-300 uppercase tracking-widest mb-3">
                    Your {selectedCategory.charAt(0).toUpperCase() + selectedCategory.slice(1)} Link
                </h3>
                
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

                <div className="mt-4 flex flex-wrap gap-2">
                    <span className="text-[10px] bg-green-500/20 text-green-400 px-2 py-1 rounded border border-green-500/30 font-bold">
                        0.10 BDT / View
                    </span>
                    <span className="text-[10px] bg-blue-500/20 text-blue-400 px-2 py-1 rounded border border-blue-500/30 font-bold">
                        0.05 BDT / Click
                    </span>
                    <span className="text-[10px] bg-yellow-500/10 text-yellow-300 px-2 py-1 rounded border border-yellow-500/20 flex items-center gap-1">
                        <Activity size={10} /> High Conversion Layout
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
                            We track IP addresses. Multiple visits from the same device within 24 hours are not counted.
                            Use organic traffic sources only.
                        </div>
                    </div>
                </div>
            </div>

            {/* LIVE FEED TABLE */}
            <GlassCard className="p-0 overflow-hidden border-white/10 bg-black/40">
                <div className="p-4 border-b border-white/10">
                    <h4 className="text-xs font-bold text-white uppercase">Recent Activity Feed</h4>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs text-gray-400">
                        <thead className="bg-white/5 text-gray-500 font-bold uppercase">
                            <tr>
                                <th className="p-3">Time</th>
                                <th className="p-3">Action</th>
                                <th className="p-3">Device</th>
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
                                    <td className="p-3 flex items-center gap-2">
                                        {log.device_info?.includes('Mobile') ? <Smartphone size={12}/> : <Monitor size={12}/>}
                                        <span className="truncate max-w-[100px]">{log.country || 'Unknown'}</span>
                                    </td>
                                    <td className="p-3 text-right font-mono text-green-400 font-bold">
                                        +<BalanceDisplay amount={log.amount} />
                                    </td>
                                </tr>
                            ))}
                            {recentLogs.length === 0 && (
                                <tr>
                                    <td colSpan={4} className="p-6 text-center text-gray-600">No recent logs found.</td>
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