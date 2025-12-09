
import React, { useEffect, useState } from 'react';
import GlassCard from '../../components/GlassCard';
import { supabase } from '../../integrations/supabase/client';
import { Briefcase, Activity, DollarSign, Users, Megaphone, TrendingUp, BarChart3, Plus, Zap, Award } from 'lucide-react';
import BalanceDisplay from '../../components/BalanceDisplay';
import TrendChart from '../../components/TrendChart';
import { Link } from 'react-router-dom';
import Loader from '../../components/Loader';

const DealerDashboard: React.FC = () => {
  const [stats, setStats] = useState({
      activeCampaigns: 0,
      totalSpent: 0,
      clicks: 0,
      impressions: 0,
      avgCost: 0
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
          // Calculate Spend: Completed tasks * price
          const completed = campaigns.reduce((acc: number, c: any) => acc + (c.total_quantity - c.remaining_quantity), 0);
          const totalSpent = campaigns.reduce((acc: number, c: any) => acc + ((c.total_quantity - c.remaining_quantity) * c.price_per_action), 0);
          
          setStats({
              activeCampaigns: active,
              totalSpent,
              clicks: completed,
              impressions: completed * 2.5, // Estimate
              avgCost: completed > 0 ? totalSpent / completed : 0
          });

          // Simulate chart
          setChartData(Array.from({length: 10}, () => Math.floor(Math.random() * (completed / 5 + 10))));
      }
      setLoading(false);
  };

  if (loading) return <div className="p-10"><Loader /></div>;

  return (
    <div className="space-y-6 animate-fade-in pb-20">
        
        {/* PREMIUM HEADER */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 bg-gradient-to-r from-amber-500/10 to-transparent p-6 rounded-2xl border border-amber-500/20">
            <div>
                <h2 className="text-3xl font-display font-black text-amber-400 flex items-center gap-3">
                    <Award size={32} /> DEALER CONSOLE
                </h2>
                <p className="text-amber-200/60 text-sm mt-1">Manage high-performance campaigns.</p>
            </div>
            <Link to="/dealer/create" className="px-6 py-3 bg-gradient-to-r from-amber-500 to-orange-500 text-black font-black uppercase rounded-xl hover:scale-105 flex items-center gap-2 shadow-[0_0_30px_rgba(245,158,11,0.4)] transition">
                <Plus size={20} strokeWidth={3}/> New Campaign
            </Link>
        </div>

        {/* METRICS GRID */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <GlassCard className="p-5 border-l-4 border-l-amber-500 bg-amber-900/10">
                <div className="flex justify-between items-start mb-2">
                    <p className="text-amber-300 text-xs font-bold uppercase tracking-widest">Total Spend</p>
                    <DollarSign size={20} className="text-amber-500"/>
                </div>
                <h3 className="text-3xl font-black text-white mt-1">
                    <BalanceDisplay amount={stats.totalSpent} isNative={true} />
                </h3>
                <p className="text-[10px] text-gray-400 mt-1">Budget Utilized</p>
            </GlassCard>

            <GlassCard className="p-5 border-l-4 border-l-cyan-500 bg-cyan-900/10">
                <div className="flex justify-between items-start mb-2">
                    <p className="text-cyan-300 text-xs font-bold uppercase tracking-widest">Active Ads</p>
                    <Zap size={20} className="text-cyan-500"/>
                </div>
                <h3 className="text-3xl font-black text-white mt-1">{stats.activeCampaigns}</h3>
                <p className="text-[10px] text-gray-400 mt-1">Running Now</p>
            </GlassCard>

            <GlassCard className="p-5 border-l-4 border-l-purple-500 bg-purple-900/10">
                <div className="flex justify-between items-start mb-2">
                    <p className="text-purple-300 text-xs font-bold uppercase tracking-widest">Conversions</p>
                    <Users size={20} className="text-purple-500"/>
                </div>
                <h3 className="text-3xl font-black text-white mt-1">{stats.clicks.toLocaleString()}</h3>
                <p className="text-[10px] text-gray-400 mt-1">Verified Actions</p>
            </GlassCard>

            <GlassCard className="p-5 border-l-4 border-l-emerald-500 bg-emerald-900/10">
                <div className="flex justify-between items-start mb-2">
                    <p className="text-emerald-300 text-xs font-bold uppercase tracking-widest">Avg. Cost</p>
                    <TrendingUp size={20} className="text-emerald-500"/>
                </div>
                <h3 className="text-3xl font-black text-white mt-1">৳{stats.avgCost.toFixed(2)}</h3>
                <p className="text-[10px] text-gray-400 mt-1">Per User Action</p>
            </GlassCard>
        </div>

        {/* ANALYTICS CHART */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
                <GlassCard className="p-6 border-amber-500/20 bg-black/40 h-full">
                    <div className="flex items-center gap-2 mb-6">
                        <BarChart3 className="text-amber-400" size={20} />
                        <h3 className="font-bold text-white uppercase text-sm tracking-widest">Live Performance Volume</h3>
                    </div>
                    <div className="h-64 w-full">
                        <TrendChart data={chartData} color="#f59e0b" height={240} />
                    </div>
                </GlassCard>
            </div>

            <div className="space-y-6">
                <GlassCard className="border-white/5 bg-gradient-to-br from-white/5 to-transparent">
                    <h3 className="font-bold text-white mb-4 flex items-center gap-2 text-sm uppercase tracking-wider">
                        <Briefcase size={16} className="text-blue-400"/> Management
                    </h3>
                    <div className="space-y-3">
                        <Link to="/dealer/campaigns" className="block w-full py-4 bg-white/5 rounded-xl text-center text-xs font-bold text-white hover:bg-white/10 transition border border-white/5">
                            MANAGE ALL CAMPAIGNS
                        </Link>
                        <div className="grid grid-cols-2 gap-3">
                            <Link to="/deposit" className="p-3 bg-green-500/10 border border-green-500/20 rounded-xl flex flex-col items-center justify-center gap-2 hover:bg-green-500/20 transition">
                                <DollarSign size={20} className="text-green-400" />
                                <span className="text-[10px] font-bold text-green-200">ADD FUNDS</span>
                            </Link>
                            <Link to="/dealer/profile" className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-xl flex flex-col items-center justify-center gap-2 hover:bg-blue-500/20 transition">
                                <Activity size={20} className="text-blue-400" />
                                <span className="text-[10px] font-bold text-blue-200">PROFILE</span>
                            </Link>
                        </div>
                    </div>
                </GlassCard>
            </div>
        </div>
    </div>
  );
};

export default DealerDashboard;
