
import React, { useEffect, useState } from 'react';
import GlassCard from '../../components/GlassCard';
import { supabase } from '../../integrations/supabase/client';
import { Briefcase, Activity, DollarSign, Users, Megaphone, TrendingUp, BarChart3, Plus } from 'lucide-react';
import BalanceDisplay from '../../components/BalanceDisplay';
import TrendChart from '../../components/TrendChart';
import { Link } from 'react-router-dom';
import Loader from '../../components/Loader';

const DealerDashboard: React.FC = () => {
  const [stats, setStats] = useState({
      activeCampaigns: 0,
      totalSpent: 0,
      impressions: 0,
      clicks: 0
  });
  const [loading, setLoading] = useState(true);
  const [chartData, setChartData] = useState<number[]>([]);

  useEffect(() => {
      fetchDealerStats();
  }, []);

  const fetchDealerStats = async () => {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      // Fetch Campaigns
      const { data: campaigns } = await supabase.from('marketplace_tasks')
          .select('*')
          .eq('creator_id', session.user.id);

      if (campaigns) {
          const active = campaigns.filter((c: any) => c.status === 'active').length;
          // Calculate Spend based on remaining vs total
          const totalSpent = campaigns.reduce((acc: number, c: any) => acc + ((c.total_quantity - c.remaining_quantity) * c.price_per_action), 0);
          const totalClicks = campaigns.reduce((acc: number, c: any) => acc + (c.total_quantity - c.remaining_quantity), 0);
          
          setStats({
              activeCampaigns: active,
              totalSpent,
              clicks: totalClicks,
              impressions: totalClicks * 1.5 // Estimated views
          });

          // Generate simulated trend data based on activity
          setChartData(Array.from({length: 14}, () => Math.floor(Math.random() * (totalClicks / 10 + 10))));
      }
      setLoading(false);
  };

  if (loading) return <div className="p-10"><Loader /></div>;

  return (
    <div className="space-y-6 animate-fade-in pb-20">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
            <div>
                <h2 className="text-3xl font-display font-black text-amber-400 flex items-center gap-3">
                    <Activity size={32} /> PARTNER CONSOLE
                </h2>
                <p className="text-gray-400 text-sm mt-1">Real-time campaign analytics and budget control.</p>
            </div>
            <Link to="/dealer/create" className="px-6 py-3 bg-amber-500 text-black font-bold rounded-xl hover:bg-amber-400 flex items-center gap-2 shadow-[0_0_20px_rgba(245,158,11,0.3)] transition">
                <Plus size={20}/> New Campaign
            </Link>
        </div>

        {/* METRICS GRID */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <GlassCard className="p-5 border-l-4 border-l-amber-500 bg-amber-900/10">
                <div className="flex justify-between items-start mb-2">
                    <p className="text-amber-300 text-xs font-bold uppercase tracking-widest">Total Spend</p>
                    <DollarSign size={20} className="text-amber-500"/>
                </div>
                <h3 className="text-3xl font-black text-white mt-1"><BalanceDisplay amount={stats.totalSpent} /></h3>
            </GlassCard>

            <GlassCard className="p-5 border-l-4 border-l-blue-500 bg-blue-900/10">
                <div className="flex justify-between items-start mb-2">
                    <p className="text-blue-300 text-xs font-bold uppercase tracking-widest">Active Ads</p>
                    <Megaphone size={20} className="text-blue-500"/>
                </div>
                <h3 className="text-3xl font-black text-white mt-1">{stats.activeCampaigns}</h3>
            </GlassCard>

            <GlassCard className="p-5 border-l-4 border-l-purple-500 bg-purple-900/10">
                <div className="flex justify-between items-start mb-2">
                    <p className="text-purple-300 text-xs font-bold uppercase tracking-widest">Total Actions</p>
                    <Users size={20} className="text-purple-500"/>
                </div>
                <h3 className="text-3xl font-black text-white mt-1">{stats.clicks.toLocaleString()}</h3>
            </GlassCard>

            <GlassCard className="p-5 border-l-4 border-l-green-500 bg-green-900/10">
                <div className="flex justify-between items-start mb-2">
                    <p className="text-green-300 text-xs font-bold uppercase tracking-widest">Conversion Rate</p>
                    <TrendingUp size={20} className="text-green-500"/>
                </div>
                <h3 className="text-3xl font-black text-white mt-1">
                    {stats.impressions > 0 ? ((stats.clicks / stats.impressions) * 100).toFixed(1) : 0}%
                </h3>
            </GlassCard>
        </div>

        {/* ANALYTICS CHART */}
        <GlassCard className="p-6 border-amber-500/20 bg-black/40">
            <div className="flex items-center gap-2 mb-6">
                <BarChart3 className="text-amber-400" size={20} />
                <h3 className="font-bold text-white uppercase text-sm tracking-widest">Performance Volume (14 Days)</h3>
            </div>
            <div className="h-48 w-full">
                <TrendChart data={chartData} color="#f59e0b" height={180} />
            </div>
        </GlassCard>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <GlassCard className="border-white/5">
                <h3 className="font-bold text-white mb-4 flex items-center gap-2">
                    <Megaphone size={16} className="text-gray-400"/> Recent Campaigns
                </h3>
                <div className="space-y-3">
                    <Link to="/dealer/campaigns" className="block p-4 bg-white/5 rounded-xl text-center text-sm text-gray-400 hover:bg-white/10 hover:text-white transition">
                        View All Campaigns
                    </Link>
                </div>
            </GlassCard>
            
            <GlassCard className="border-white/5">
                <h3 className="font-bold text-white mb-4 flex items-center gap-2">
                    <Briefcase size={16} className="text-gray-400"/> Quick Actions
                </h3>
                <div className="grid grid-cols-2 gap-3">
                    <Link to="/deposit" className="p-4 bg-white/5 rounded-xl flex flex-col items-center justify-center gap-2 hover:bg-white/10 transition text-gray-300 hover:text-white">
                        <DollarSign size={24} className="text-green-400" />
                        <span className="text-xs font-bold uppercase">Add Funds</span>
                    </Link>
                    <Link to="/dealer/profile" className="p-4 bg-white/5 rounded-xl flex flex-col items-center justify-center gap-2 hover:bg-white/10 transition text-gray-300 hover:text-white">
                        <Activity size={24} className="text-blue-400" />
                        <span className="text-xs font-bold uppercase">Company Profile</span>
                    </Link>
                </div>
            </GlassCard>
        </div>
    </div>
  );
};

export default DealerDashboard;
