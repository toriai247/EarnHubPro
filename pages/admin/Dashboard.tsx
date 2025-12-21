
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import GlassCard from '../../components/GlassCard';
import { supabase } from '../../integrations/supabase/client';
import { 
  Users, DollarSign, Activity, 
  Server, RefreshCw,
  Wallet,
  Cpu, BarChart2, DownloadCloud, Terminal, Zap, ShieldCheck, Clock, TrendingUp, ArrowDownLeft, ArrowUpRight, Landmark, GitFork
} from 'lucide-react';
import BalanceDisplay from '../../components/BalanceDisplay';
import Skeleton from '../../components/Skeleton';
import { useSystem } from '../../context/SystemContext';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell
} from 'recharts';

interface DashboardStats {
    totalUsers: number;
    newUsersToday: number;
    activeUsers: number;
    totalDeposits: number;
    totalWithdrawals: number;
    pendingDeposits: number;
    pendingWithdrawals: number;
    pendingSupport: number;
    systemRevenue: number;
    systemLiability: number;
    dbLatency: number;
    referralOutflow: number;
}

const Dashboard: React.FC = () => {
  const { config } = useSystem();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [recentTransactions, setRecentTransactions] = useState<any[]>([]);
  const [chartData, setChartData] = useState<any[]>([]);
  const [pieData, setPieData] = useState<any[]>([]);
  const [systemHealth, setSystemHealth] = useState({ cpu: 12, ram: 34, status: 'OPTIMAL' });
  const [adsterraRevenue, setAdsterraRevenue] = useState<string | null>(null);

  useEffect(() => {
    fetchRealStats();
  }, [config]);

  const fetchRealStats = async () => {
    setLoading(true);
    const start = performance.now();
    try {
        const today = new Date();
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(today.getDate() - 7);
        const iso7Days = sevenDaysAgo.toISOString();

        // 1. Core Counts
        const { count: userCount } = await supabase.from('profiles').select('*', { count: 'exact', head: true });
        today.setHours(0,0,0,0);
        const { count: newUsers } = await supabase.from('profiles').select('*', { count: 'exact', head: true }).gte('created_at', today.toISOString());

        // 2. Financial Flows
        const { data: depositTx } = await supabase.from('transactions').select('amount').eq('type', 'DEPOSIT').eq('status', 'success');
        const totalDeps = (depositTx || []).reduce((sum: number, t: any) => sum + t.amount, 0);

        const { data: withdrawTx } = await supabase.from('transactions').select('amount').eq('type', 'WITHDRAW').eq('status', 'success');
        const totalWds = (withdrawTx || []).reduce((sum: number, t: any) => sum + t.amount, 0);

        const { data: refTx } = await supabase.from('transactions').select('amount').eq('type', 'COMMISSION_ADD');
        const totalRefOut = (refTx || []).reduce((sum: number, t: any) => sum + t.amount, 0);

        // 3. Liability Scan
        const { data: walletBalances } = await supabase.from('wallets').select('main_balance, deposit_balance, earning_balance, bonus_balance, referral_balance, game_balance, commission_balance');
        const liability = (walletBalances || []).reduce((sum: number, w: any) => sum + (w.main_balance || 0) + (w.deposit_balance || 0) + (w.earning_balance || 0) + (w.bonus_balance || 0) + (w.referral_balance || 0) + (w.game_balance || 0) + (w.commission_balance || 0), 0);

        // 4. Pending items
        const { count: pDep } = await supabase.from('deposit_requests').select('*', { count: 'exact', head: true }).eq('status', 'pending');
        const { count: pWd } = await supabase.from('withdraw_requests').select('*', { count: 'exact', head: true }).eq('status', 'pending');

        // 5. Chart Data
        const { data: recentTx } = await supabase.from('transactions').select('created_at, type, amount').gte('created_at', iso7Days);
        const chartPoints = Array.from({length: 7}, (_, i) => {
            const d = new Date();
            d.setDate(d.getDate() - (6 - i));
            const dateStr = d.toISOString().split('T')[0];
            const displayDate = d.toLocaleDateString('en-US', { weekday: 'short' });
            const dayTx = recentTx?.filter((t: any) => t.created_at.startsWith(dateStr)) || [];
            const deposits = dayTx.filter((t: any) => t.type === 'DEPOSIT').reduce((sum: any, t: any) => sum + t.amount, 0);
            const withdrawals = dayTx.filter((t: any) => t.type === 'WITHDRAW').reduce((sum: any, t: any) => sum + t.amount, 0);
            return { name: displayDate, deposits, withdrawals };
        });
        setChartData(chartPoints);

        setPieData([
            { name: 'Direct Rev', value: totalDeps, color: '#10b981' },
            { name: 'User Holding', value: liability, color: '#f59e0b' },
            { name: 'Paid Out', value: totalWds, color: '#3b82f6' },
        ]);

        const { data: logs } = await supabase.from('transactions').select('*').order('created_at', { ascending: false }).limit(10);
        const end = performance.now();

        setStats({
            totalUsers: userCount || 0,
            newUsersToday: newUsers || 0,
            activeUsers: Math.floor((userCount || 0) * 0.45), 
            totalDeposits: totalDeps,
            totalWithdrawals: totalWds,
            pendingDeposits: pDep || 0,
            pendingWithdrawals: pWd || 0,
            pendingSupport: 0,
            systemRevenue: totalDeps - totalWds - (liability - totalDeps), // Estimate
            systemLiability: liability,
            dbLatency: Math.round(end - start),
            referralOutflow: totalRefOut
        });

        if (logs) setRecentTransactions(logs);
        
        // Mock API Adsterra
        setAdsterraRevenue("$142.20");

    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  if (loading) return <div className="space-y-6"><Skeleton className="h-64 w-full" /></div>;

  return (
    <div className="space-y-8 pb-12">
      
      {/* KPI GRID - ADDED DETAILS */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard 
            title="Total Revenue (Gross)" 
            value={stats?.totalDeposits || 0} 
            icon={ArrowDownLeft} 
            color="text-emerald-400" 
            sub={`৳${stats?.pendingDeposits} PENDING`}
            isCurrency 
          />
          <MetricCard 
            title="Protocol Payouts" 
            value={stats?.totalWithdrawals || 0} 
            icon={ArrowUpRight} 
            color="text-red-400" 
            sub={`৳${stats?.pendingWithdrawals} QUEUED`}
            isCurrency 
          />
          <MetricCard 
            title="User Network Asset" 
            value={stats?.systemLiability || 0} 
            icon={Landmark} 
            color="text-indigo-400" 
            sub="TOTAL LIABILITY"
            isCurrency 
          />
          <MetricCard 
            title="Network Nodes" 
            value={stats?.totalUsers || 0} 
            icon={Users} 
            color="text-blue-400" 
            sub={`+${stats?.newUsersToday} TODAY`}
          />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* FLOW CHART - REMOVED ANIMATIONS */}
          <GlassCard className="lg:col-span-2 p-6 bg-black/40 border-white/5">
              <div className="flex justify-between items-center mb-8">
                  <h3 className="font-black text-white text-[10px] uppercase tracking-[0.3em] flex items-center gap-2">
                      <Activity size={14} className="text-blue-500"/> Volume Analytics (7D)
                  </h3>
              </div>
              <div className="h-[300px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={chartData} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#222" vertical={false} />
                          <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#444', fontSize: 10, fontWeight: 'bold'}} dy={10}/>
                          <YAxis axisLine={false} tickLine={false} tick={{fill: '#444', fontSize: 10}} />
                          <Tooltip 
                            contentStyle={{ backgroundColor: '#0a0a0a', border: '1px solid #333', borderRadius: '12px', fontSize: '10px' }}
                            itemStyle={{ fontWeight: 'bold', textTransform: 'uppercase' }}
                          />
                          <Area type="monotone" dataKey="deposits" stroke="#10b981" strokeWidth={3} fillOpacity={0.1} fill="#10b981" isAnimationActive={false} />
                          <Area type="monotone" dataKey="withdrawals" stroke="#ef4444" strokeWidth={3} fillOpacity={0.1} fill="#ef4444" isAnimationActive={false} />
                      </AreaChart>
                  </ResponsiveContainer>
              </div>
          </GlassCard>

          {/* SYSTEM HEALTH & DISTRIBUTION */}
          <div className="space-y-6">
              <GlassCard className="p-6 bg-black/40 border-white/5">
                  <h3 className="font-black text-white text-[10px] uppercase tracking-[0.3em] mb-6">Liability Pool</h3>
                  <div className="h-[200px] flex items-center justify-center relative">
                      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                          <span className="text-[10px] font-black text-gray-600 uppercase">Integrity</span>
                          <span className="text-xl font-black text-white font-mono leading-none mt-1">100%</span>
                      </div>
                      <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                              <Pie data={pieData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value" stroke="none" isAnimationActive={false}>
                                  {pieData.map((entry, index) => <Cell key={index} fill={entry.color} />)}
                              </Pie>
                          </PieChart>
                      </ResponsiveContainer>
                  </div>
              </GlassCard>

              <div className="grid grid-cols-1 gap-3">
                  <div className="bg-[#111] p-4 rounded-2xl border border-white/5 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Cpu size={16} className="text-blue-500" />
                        <span className="text-[10px] font-black uppercase text-gray-500">DB Latency</span>
                      </div>
                      <span className="text-xs font-mono font-black text-white">{stats?.dbLatency}ms</span>
                  </div>
                  <div className="bg-[#111] p-4 rounded-2xl border border-white/5 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {/* Fix: Imported GitFork from lucide-react */}
                        <GitFork size={16} className="text-purple-500" />
                        <span className="text-[10px] font-black uppercase text-gray-500">Ref Outflow</span>
                      </div>
                      <span className="text-xs font-mono font-black text-white"><BalanceDisplay amount={stats?.referralOutflow || 0} compact /></span>
                  </div>
              </div>
          </div>
      </div>

      {/* DETAILED LEDGER */}
      <div className="bg-[#0a0a0a] border border-white/5 rounded-3xl overflow-hidden shadow-2xl">
          <div className="p-5 border-b border-white/5 bg-white/[0.02] flex justify-between items-center">
              <h3 className="text-[10px] font-black text-white uppercase tracking-[0.4em] flex items-center gap-3">
                  <Terminal size={14} className="text-blue-500"/> Real-time Ledger Stream
              </h3>
              <span className="text-[9px] font-black text-gray-600 uppercase">Synchronized with Node 01</span>
          </div>
          <div className="overflow-x-auto">
              <table className="w-full text-left text-[11px] font-mono">
                  <thead className="bg-black text-gray-600 uppercase font-black">
                      <tr>
                          <th className="p-4">Time</th>
                          <th className="p-4">Identity Hash</th>
                          <th className="p-4">Protocol</th>
                          <th className="p-4 text-right">Magnitude</th>
                          <th className="p-4 text-right">Result</th>
                      </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                      {recentTransactions.map((tx) => (
                          <tr key={tx.id} className="hover:bg-white/[0.02] transition-colors">
                              <td className="p-4 text-gray-500">{new Date(tx.created_at).toLocaleTimeString()}</td>
                              <td className="p-4 text-blue-400 font-bold">{tx.user_id.substring(0, 12)}...</td>
                              <td className="p-4">
                                  <span className={`px-2 py-0.5 rounded-md font-black text-[9px] border ${
                                      ['DEPOSIT', 'BET_WIN', 'TASK_EARN'].includes(tx.type) ? 'border-green-500/20 text-green-400 bg-green-900/10' : 'border-red-500/20 text-red-400 bg-red-900/10'
                                  }`}>{tx.type}</span>
                              </td>
                              <td className={`p-4 text-right font-black text-sm ${['DEPOSIT', 'BET_WIN', 'TASK_EARN'].includes(tx.type) ? 'text-green-400' : 'text-white'}`}>
                                  {['DEPOSIT', 'BET_WIN', 'TASK_EARN'].includes(tx.type) ? '+' : '-'}<BalanceDisplay amount={tx.amount} compact />
                              </td>
                              <td className="p-4 text-right text-gray-600 font-bold uppercase">{tx.status || 'Verified'}</td>
                          </tr>
                      ))}
                  </tbody>
              </table>
          </div>
      </div>
    </div>
  );
};

const MetricCard = ({ title, value, sub, icon: Icon, color, bg, isCurrency }: any) => (
    <div className={`bg-[#0a0a0a] border border-white/5 rounded-2xl p-5 relative transition-colors hover:bg-white/[0.01]`}>
        <div className="flex flex-col h-full relative z-10">
            <div className="flex justify-between items-start mb-4">
                <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest leading-none">{title}</span>
                <Icon size={16} className={color} />
            </div>
            <div className={`text-2xl font-black ${color} tracking-tighter leading-none`}>
                {typeof value === 'number' ? (
                    isCurrency ? <BalanceDisplay amount={value} compact /> : value.toLocaleString()
                ) : value}
            </div>
            {sub && <p className="text-[9px] text-gray-600 font-black mt-2 uppercase tracking-widest">{sub}</p>}
        </div>
    </div>
);

export default Dashboard;
