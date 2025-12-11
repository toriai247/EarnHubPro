
import React, { useEffect, useState } from 'react';
import GlassCard from '../../components/GlassCard';
import { supabase } from '../../integrations/supabase/client';
import { 
    BarChart3, RefreshCw, Loader2, ExternalLink, Globe, 
    MousePointer, Users, Link as LinkIcon
} from 'lucide-react';
import { useUI } from '../../context/UIContext';

interface ClickStat {
    network: string;
    link: string;
    count: number;
    lastClicked: string;
}

const AdAnalytics: React.FC = () => {
    const { toast } = useUI();
    const [stats, setStats] = useState<ClickStat[]>([]);
    const [loading, setLoading] = useState(true);
    const [totalClicks, setTotalClicks] = useState(0);

    useEffect(() => {
        fetchStats();
    }, []);

    const fetchStats = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('ad_interactions')
                .select('*');

            if (error) throw error;

            // Group by network + link
            const grouped: Record<string, ClickStat> = {};
            let total = 0;

            (data || []).forEach((row: any) => {
                const key = `${row.network}-${row.ad_unit_id}`;
                if (!grouped[key]) {
                    grouped[key] = {
                        network: row.network,
                        link: row.ad_unit_id,
                        count: 0,
                        lastClicked: row.created_at
                    };
                }
                grouped[key].count += 1;
                // Update last clicked if newer
                if (new Date(row.created_at) > new Date(grouped[key].lastClicked)) {
                    grouped[key].lastClicked = row.created_at;
                }
                total += 1;
            });

            setStats(Object.values(grouped).sort((a, b) => b.count - a.count));
            setTotalClicks(total);

        } catch (e: any) {
            if (e.message.includes('relation "public.ad_interactions" does not exist')) {
                toast.error("Table missing. Run 'Ad Analytics Table' SQL in Database Ultra.");
            } else {
                toast.error("Error fetching stats: " + e.message);
            }
        } finally {
            setLoading(false);
        }
    };

    const getNetworkColor = (net: string) => {
        switch(net) {
            case 'adsterra': return 'text-red-400 bg-red-900/20 border-red-500/30';
            case 'monetag': return 'text-blue-400 bg-blue-900/20 border-blue-500/30';
            case 'google': return 'text-green-400 bg-green-900/20 border-green-500/30';
            default: return 'text-gray-400 bg-gray-900/20 border-gray-500/30';
        }
    };

    return (
        <div className="space-y-6 animate-fade-in pb-20">
            
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                        <BarChart3 className="text-cyan-400" /> Ad Performance
                    </h2>
                    <p className="text-gray-400 text-sm">Track user clicks on sponsored links.</p>
                </div>
                <button onClick={fetchStats} className="p-2 bg-white/10 rounded-xl hover:bg-white/20 text-white transition">
                    <RefreshCw size={20} className={loading ? 'animate-spin' : ''}/>
                </button>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <GlassCard className="p-4 border-l-4 border-l-cyan-500 bg-cyan-900/10">
                    <div className="flex justify-between items-start mb-2">
                        <p className="text-cyan-300 text-xs font-bold uppercase tracking-widest">Total Clicks</p>
                        <MousePointer size={20} className="text-cyan-500"/>
                    </div>
                    <h3 className="text-3xl font-black text-white">{totalClicks}</h3>
                </GlassCard>
                <GlassCard className="p-4 border-l-4 border-l-purple-500 bg-purple-900/10">
                    <div className="flex justify-between items-start mb-2">
                        <p className="text-purple-300 text-xs font-bold uppercase tracking-widest">Active Links</p>
                        <LinkIcon size={20} className="text-purple-500"/>
                    </div>
                    <h3 className="text-3xl font-black text-white">{stats.length}</h3>
                </GlassCard>
                {/* Placeholder for Google Impressions if we could track them */}
                <GlassCard className="p-4 border-l-4 border-l-green-500 bg-green-900/10 opacity-70">
                    <div className="flex justify-between items-start mb-2">
                        <p className="text-green-300 text-xs font-bold uppercase tracking-widest">AdSense Est.</p>
                        <Globe size={20} className="text-green-500"/>
                    </div>
                    <h3 className="text-3xl font-black text-white">---</h3>
                    <p className="text-[10px] text-gray-400">API Required</p>
                </GlassCard>
            </div>

            {/* Networks Breakdown */}
            <div className="space-y-6">
                
                {/* 1. Google AdSense (Placeholder) */}
                <GlassCard className="border-white/10">
                    <div className="flex items-center gap-3 mb-4 border-b border-white/5 pb-2">
                        <div className="p-2 bg-green-500/20 rounded-lg text-green-400"><Globe size={20}/></div>
                        <h3 className="text-lg font-bold text-white">Google AdSense</h3>
                    </div>
                    <div className="bg-white/5 rounded-xl p-6 text-center text-gray-400 text-sm">
                        <p>Google AdSense click tracking requires server-side API integration due to iframe security policies.</p>
                        <p className="mt-2 text-xs">Only impressions can be roughly estimated client-side.</p>
                    </div>
                </GlassCard>

                {/* 2. Direct Links (Adsterra/Monetag) */}
                <GlassCard className="border-white/10">
                    <div className="flex items-center gap-3 mb-4 border-b border-white/5 pb-2">
                        <div className="p-2 bg-blue-500/20 rounded-lg text-blue-400"><ExternalLink size={20}/></div>
                        <h3 className="text-lg font-bold text-white">Direct Link Networks</h3>
                    </div>

                    {loading ? (
                        <div className="p-10 text-center"><Loader2 className="animate-spin mx-auto text-white"/></div>
                    ) : stats.length === 0 ? (
                        <div className="p-8 text-center text-gray-500">No clicks recorded yet.</div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm text-gray-400">
                                <thead className="bg-white/5 text-xs font-bold text-white uppercase">
                                    <tr>
                                        <th className="p-3">Network</th>
                                        <th className="p-3">Link / Unit</th>
                                        <th className="p-3 text-right">Clicks</th>
                                        <th className="p-3 text-right">Last Active</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/5">
                                    {stats.map((stat, idx) => (
                                        <tr key={idx} className="hover:bg-white/5 transition">
                                            <td className="p-3">
                                                <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase border ${getNetworkColor(stat.network)}`}>
                                                    {stat.network}
                                                </span>
                                            </td>
                                            <td className="p-3 font-mono text-xs max-w-[200px] truncate" title={stat.link}>
                                                {stat.link}
                                            </td>
                                            <td className="p-3 text-right font-bold text-white">{stat.count}</td>
                                            <td className="p-3 text-right text-xs">{new Date(stat.lastClicked).toLocaleString()}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </GlassCard>

            </div>
        </div>
    );
};

export default AdAnalytics;
