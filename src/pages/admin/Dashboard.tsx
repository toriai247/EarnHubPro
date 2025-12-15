
import React, { useEffect, useState } from 'react';
import GlassCard from '../../components/GlassCard';
import { supabase } from '../../integrations/supabase/client';
import { 
  Users, DollarSign, Activity, AlertCircle, 
  Server, Database, Wallet, RefreshCw,
  LayoutDashboard, CreditCard, Gamepad2, Gift, Settings, 
  MonitorOff, LifeBuoy, Sliders, CalendarClock, Briefcase,
  HardDrive, BellRing, GitFork, CheckSquare, PieChart as PieChartIcon, FileText,
  Cpu, Wifi, Layers, Terminal, BarChart2, CloudDownload, Key, Table, Cloud
} from 'lucide-react';
import { Link } from 'react-router-dom';
import BalanceDisplay from '../../components/BalanceDisplay';
import Skeleton from '../../components/Skeleton';
import { useSystem } from '../../context/SystemContext';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, Legend, PieChart, Pie, Cell
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
}

interface ChartDataPoint {
    name: string;
    deposits: number;
    withdrawals: number;
    revenue: number;
    newUsers: number;
}

const Dashboard: React.FC = () => {
  const { config } = useSystem();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [recentTransactions, setRecentTransactions] = useState<any[]>([]);
  const [chartData, setChartData] = useState<ChartDataPoint[]>([]);
  const [pieData, setPieData] = useState<any[]>([]);
  const [systemHealth, setSystemHealth] = useState({ cpu: 12, ram: 34, status: 'OPTIMAL' });
  const [adsterraRevenue, setAdsterraRevenue] = useState<string | null>(null);
  const [dropGalaxyBalance, setDropGalaxyBalance] = useState<string | null>(null);

  // Fallback token provided by user
  const ADSTERRA_TOKEN = '14810bb4192661f1a6277491c12a2946';

  useEffect(() => {
    fetchRealStats();
    fetchDropGalaxy();
    
    // Simulate server load
    const interval = setInterval(() => {
        setSystemHealth(prev => ({
            cpu: Math.min(100, Math.max(5, prev.cpu + (Math.random() * 10 - 5))),
            ram: Math.min(100, Math.max(20, prev.ram + (Math.random() * 5 - 2.5))),
            status: prev.cpu > 80 ? 'HIGH LOAD' : 'OPTIMAL'
        }));
    }, 3000);

    return () => clearInterval(interval);
  }, [config]);

  const fetchDropGalaxy = async () => {
      try {
          const res = await fetch('https://dropgalaxy.com/api/account/info?key=112990tql43b45ns5kjkck');
          if (res.ok) {
              const data = await res.json();
              if (data?.result?.balance) {
                  setDropGalaxyBalance(`$${data.result.balance}`);
              } else {
                  setDropGalaxyBalance('Active');
              }
          }
      } catch (e) {
          console.warn("DropGalaxy fetch failed (CORS?)");
      }
  };

  const fetchRealStats = async () => {
    setLoading(true);
    const start = performance.now();
    try {
        const today = new Date();
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(today.getDate() - 7);
        const iso7Days = sevenDaysAgo.toISOString();

        const { count: userCount } = await supabase.from('profiles').select('*', { count: 'exact', head: true });
        
        today.setHours(0,0,0,0);
        const { count: newUsers } = await supabase.from('profiles').select('*', { count: 'exact', head: true }).gte('created_at', today.toISOString());

        const { count: pendingDep } = await supabase.from('deposit_requests').select('*', { count: 'exact', head: true }).eq('status', 'pending');
        const { count: pendingWd } = await supabase.from('withdraw_requests').select('*', { count: 'exact', head: true }).eq('status', 'pending');
        const { count: pendingSup } = await supabase.from('help_requests').select('*', { count: 'exact', head: true }).eq('status', 'pending');

        const { data: depositTx } = await supabase.from('transactions').select('amount').eq('type', 'deposit').eq('status', 'success');
        const totalDeps = (depositTx || []).reduce((sum: number, t: any) => sum + t.amount, 0);

        const { data: withdrawTx } = await supabase.from('transactions').select('amount').eq('type', 'withdraw').eq('status', 'success');
        const totalWds = (withdrawTx || []).reduce((sum: number, t: any) => sum + t.amount, 0);

        const { data: walletBalances } = await supabase.from('wallets').select('main_balance, deposit_balance, earning_balance');
        const liability = (walletBalances || []).reduce((sum: number, w: any) => sum + w.main_balance + w.deposit_balance + w.earning_balance, 0);

        const { data: recentTx } = await supabase.from('transactions').select('created_at, type, amount').gte('created_at', iso7Days);
        const { data: recentProfiles } = await supabase.from('profiles').select('created_at').gte('created_at', iso7Days);

        const chartPoints = Array.from({length: 7}, (_, i) => {
            const d = new Date();
            d.setDate(d.getDate() - (6 - i));
            const dateStr = d.toISOString().split('T')[0];
            const displayDate = d.toLocaleDateString('en-US', { weekday: 'short' });

            const dayTx = recentTx?.filter((t: any) => t.created_at.startsWith(dateStr)) || [];
            const deposits = dayTx.filter((t: any) => t.type === 'deposit').reduce((sum: any, t: any) => sum + t.amount, 0);
            const withdrawals = dayTx.filter((t: any) => t.type === 'withdraw').reduce((sum: any, t: any) => sum + t.amount, 0);
            const newUsersCount = recentProfiles?.filter((p: any) => p.created_at.startsWith(dateStr)).length || 0;

            return { name: displayDate, deposits, withdrawals, revenue: deposits - withdrawals, newUsers: newUsersCount };
        });
        setChartData(chartPoints);

        const earningOutflow = recentTx?.filter((t: any) => t.type === 'earn').reduce((sum: any, t: any) => sum + t.amount, 0) || 0;
        const referralOutflow = recentTx?.filter((t: any) => t.type === 'referral').reduce((sum: any, t: any) => sum + t.amount, 0) || 0;
        const gameWinOutflow = recentTx?.filter((t: any) => t.type === 'game_win').reduce((sum: any, t: any) => sum + t.amount, 0) || 0;

        setPieData([
            { name: 'Tasks', value: earningOutflow, color: '#f59e0b' },
            { name: 'Refs', value: referralOutflow, color: '#ec4899' },
            { name: 'Games', value: gameWinOutflow, color: '#a855f7' },
        ].filter(d => d.value > 0));

        const { data: logs } = await supabase.from('transactions').select('*').order('created_at', { ascending: false }).limit(8);

        const end = performance.now();

        setStats({
            totalUsers: userCount || 0,
            newUsersToday: newUsers || 0,
            activeUsers: Math.floor((userCount || 0) * 0.65), 
            totalDeposits: totalDeps,
            totalWithdrawals: totalWds,
            pendingDeposits: pendingDep || 0,
            pendingWithdrawals: pendingWd || 0,
            pendingSupport: pendingSup || 0,
            systemRevenue: totalDeps - totalWds - liability,
            systemLiability: liability,
            dbLatency: Math.round(end - start)
        });

        if (logs) setRecentTransactions(logs);
        
        const apiToken = config?.adsterra_api_token || ADSTERRA_TOKEN;
        if (apiToken) {
            try {
                const res = await fetch(`https://api3.adsterratools.com/publisher/stats.json?api_token=${apiToken}`);
                if (res.ok) {
                    const data = await res.json();
                    if (data && data.items) {
                        const totalRev = data.items.reduce((sum: number, item: any) => sum + (item.revenue || 0), 0);
                        setAdsterraRevenue(`$${totalRev.toFixed(2)}`);
                    } else {
                        setAdsterraRevenue("Active (No Data)");
                    }
                } else {
                    setAdsterraRevenue("Auth Error");
                }
            } catch (adError) {
                console.warn("Adsterra fetch blocked by browser/CORS or network");
                setAdsterraRevenue("CORS Blocked"); 
            }
        }

    } catch (e) {
        console.error("Dashboard Stats Error:", e);
    } finally {
        setLoading(false);
    }
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
      if (active && payload && payload.length) {
          return (
              <div className="bg-black/90 border border-white/10 p-2 rounded-lg shadow-xl text-[10px] backdrop-blur-md">
                  <p className="font-bold text-white mb-1">{label}</p>
                  {payload.map((p: any, idx: number) => (
                      <div key={idx} style={{ color: p.color }} className="flex justify-between gap-3">
                          <span className="capitalize">{p.name}:</span>
                          <span className="font-mono font-bold">{p.value.toLocaleString()}</span>
                      </div>
                  ))}
              </div>
          );
      }
      return null;
  };

  if (loading) {
      return (
          <div className="space-y-4">
              <Skeleton className="h-12 w-full rounded-xl" />
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {[1,2,3,4].map(i => <Skeleton key={i} className="h-24 rounded-xl" />)}
              </div>
              <Skeleton className="h-64 w-full rounded-xl" />
          </div>
      );
  }

  return (
    <div className="space-y-6 pb-4">
      
      {/* --- QUICK ACCESS (SUPABASE CONTROL) --- */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Link to="/admin/sql_runner" className="p-4 bg-red-900/20 border border-red-500/30 rounded-xl hover:bg-red-900/40 transition group flex flex-col items-center justify-center text-center">
              <Terminal size={24} className="text-red-500 mb-2 group-hover:scale-110 transition"/>
              <span className="text-xs font-bold text-red-100 uppercase">SQL Runner</span>
          </Link>
          <Link to="/admin/auth_manager" className="p-4 bg-orange-900/20 border border-orange-500/30 rounded-xl hover:bg-orange-900/40 transition group flex flex-col items-center justify-center text-center">
              <Key size={24} className="text-orange-500 mb-2 group-hover:scale-110 transition"/>
              <span className="text-xs font-bold text-orange-100 uppercase">Auth Manager</span>
          </Link>
          <Link to="/admin/table_manager" className="p-4 bg-blue-900/20 border border-blue-500/30 rounded-xl hover:bg-blue-900/40 transition group flex flex-col items-center justify-center text-center">
              <Table size={24} className="text-blue-500 mb-2 group-hover:scale-110 transition"/>
              <span className="text-xs font-bold text-blue-100 uppercase">Schema View</span>
          </Link>
          <Link to="/admin/storage_manager" className="p-4 bg-purple-900/20 border border-purple-500/30 rounded-xl hover:bg-purple-900/40 transition group flex flex-col items-center justify-center text-center">
              <Cloud size={24} className="text-purple-500 mb-2 group-hover:scale-110 transition"/>
              <span className="text-xs font-bold text-purple-100 uppercase">Storage</span>
          </Link>
      </div>

      {/* SYSTEM HEALTH - COMPACT */}
      <div className="bg-[#0a0a0a] border border-white/10 rounded-xl p-3 flex flex-wrap items-center justify-between gap-2 text-xs font-mono">
          <div className="flex items-center gap-4">
              <div className="flex items-center gap-1.5">
                  <Server size={12} className={config?.maintenance_mode ? "text-red-500" : "text-neon-green"} />
                  <span className={config?.maintenance_mode ? "text-red-500 font-bold" : "text-neon-green font-bold"}>
                      {config?.maintenance_mode ? 'MAINTENANCE' : 'ONLINE'}
                  </span>
              </div>
              <div className="hidden sm:flex items-center gap-1.5 text-gray-500">
                  <Cpu size={12} /> {systemHealth.cpu.toFixed(0)}%
              </div>
          </div>
          <button onClick={fetchRealStats} className="flex items-center gap-1 text-blue-400 hover:text-white transition">
              <RefreshCw size={12} /> <span className="hidden sm:inline">Sync</span>
          </button>
      </div>

      {/* KPI GRID */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
          <div className="bg-gradient-to-br from-green-900/40 to-black border border-green-500/20 rounded-xl p-3 relative overflow-hidden">
              <div className="flex justify-between items-start mb-1">
                  <span className="text-[10px] text-green-400 font-bold uppercase">Net Profit</span>
                  <DollarSign size={16} className="text-green-500"/>
              </div>
              <h3 className="text-xl font-black text-white"><BalanceDisplay amount={stats?.systemRevenue || 0} compact /></h3>
          </div>

          <div className="bg-gradient-to-br from-blue-900/20 to-black border border-blue-500/20 rounded-xl p-3 relative overflow-hidden">
              <div className="flex justify-between items-start mb-1">
                  <span className="text-[10px] text-blue-400 font-bold uppercase">Total Users</span>
                  <Users size={16} className="text-blue-500"/>
              </div>
              <h3 className="text-xl font-black text-white">{stats?.totalUsers.toLocaleString()}</h3>
              <p className="text-[9px] text-gray-500">+{stats?.newUsersToday} Today</p>
          </div>

          <div className="bg-gradient-to-br from-red-900/20 to-black border border-red-500/20 rounded-xl p-3 relative overflow-hidden">
              <div className="flex justify-between items-start mb-1">
                  <span className="text-[10px] text-red-400 font-bold uppercase">Ad Revenue</span>
                  <BarChart2 size={16} className="text-red-500"/>
              </div>
              <h3 className="text-xl font-black text-white flex items-center gap-2">
                 {adsterraRevenue ? (
                     adsterraRevenue
                 ) : (
                     <span className="text-xs text-gray-500">Syncing...</span>
                 )}
              </h3>
              <p className="text-[9px] text-gray-500">Adsterra API</p>
          </div>
          
          <div className="bg-gradient-to-br from-indigo-900/40 to-black border border-indigo-500/20 rounded-xl p-3 relative overflow-hidden">
              <div className="flex justify-between items-start mb-1">
                  <span className="text-[10px] text-indigo-400 font-bold uppercase">DropGalaxy</span>
                  <CloudDownload size={16} className="text-indigo-500"/>
              </div>
              <h3 className="text-xl font-black text-white flex items-center gap-2">
                 {dropGalaxyBalance ? (
                     dropGalaxyBalance
                 ) : (
                     <span className="text-xs text-gray-500">Syncing...</span>
                 )}
              </h3>
              <p className="text-[9px] text-gray-500">File Host Balance</p>
          </div>
          
          <div className="bg-gradient-to-br from-yellow-900/20 to-black border border-yellow-500/20 rounded-xl p-3 relative overflow-hidden">
              <div className="flex justify-between items-start mb-1">
                  <span className="text-[10px] text-yellow-400 font-bold uppercase">Liability</span>
                  <Wallet size={16} className="text-yellow-500"/>
              </div>
              <h3 className="text-xl font-black text-white"><BalanceDisplay amount={stats?.systemLiability || 0} compact /></h3>
          </div>
      </div>

      {/* CHARTS */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <GlassCard className="lg:col-span-2 p-4 bg-black/40 border-white/5 relative">
              <div className="flex justify-between items-center mb-4">
                  <h3 className="font-bold text-white text-xs uppercase tracking-wider flex items-center gap-2">
                      <Activity size={14} className="text-blue-400"/> Cash Flow (7D)
                  </h3>
              </div>
              <div className="h-[200px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={chartData} margin={{ top: 5, right: 0, left: -20, bottom: 0 }}>
                          <defs>
                              <linearGradient id="colorDep" x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="5%" stopColor="#4ade80" stopOpacity={0.3}/>
                                  <stop offset="95%" stopColor="#4ade80" stopOpacity={0}/>
                              </linearGradient>
                              <linearGradient id="colorWd" x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3}/>
                                  <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                              </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
                          <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#666', fontSize: 9}} dy={5}/>
                          <YAxis axisLine={false} tickLine={false} tick={{fill: '#666', fontSize: 9}} />
                          <Tooltip content={<CustomTooltip />} cursor={{ stroke: 'rgba(255,255,255,0.1)', strokeWidth: 1 }} />
                          <Area type="monotone" dataKey="deposits" stroke="#4ade80" strokeWidth={2} fillOpacity={1} fill="url(#colorDep)" />
                          <Area type="monotone" dataKey="withdrawals" stroke="#ef4444" strokeWidth={2} fillOpacity={1} fill="url(#colorWd)" />
                      </AreaChart>
                  </ResponsiveContainer>
              </div>
          </GlassCard>

          <div className="space-y-4">
              <GlassCard className="p-4 bg-black/40 border-white/5">
                  <h3 className="font-bold text-white text-xs uppercase tracking-wider mb-2">Payout Mix</h3>
                  <div className="h-[120px] flex items-center justify-center">
                      <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                              <Pie data={pieData} cx="50%" cy="50%" innerRadius={35} outerRadius={50} paddingAngle={5} dataKey="value">
                                  {pieData.map((entry, index) => (
                                      <Cell key={`cell-${index}`} fill={entry.color} stroke="none" />
                                  ))}
                              </Pie>
                              <Tooltip content={<CustomTooltip />} />
                          </PieChart>
                      </ResponsiveContainer>
                  </div>
                  <div className="flex justify-center gap-3 mt-1">
                      {pieData.map(d => (
                          <div key={d.name} className="flex items-center gap-1 text-[9px] text-gray-400">
                              <span className="w-1.5 h-1.5 rounded-full" style={{backgroundColor: d.color}}></span>
                              {d.name}
                          </div>
                      ))}
                  </div>
              </GlassCard>
          </div>
      </div>

      {/* LIVE FEED */}
      <div className="bg-black/30 border border-white/10 rounded-xl overflow-hidden">
          <div className="p-3 bg-white/5 border-b border-white/5 flex justify-between items-center">
              <h3 className="text-xs font-bold text-white flex items-center gap-2">
                  <Terminal size={14} className="text-blue-400"/> Live Stream
              </h3>
              <span className="text-[9px] text-gray-500 uppercase tracking-wider font-bold">Recent 8</span>
          </div>
          <div className="overflow-x-auto">
              <table className="w-full text-left text-[10px] font-mono">
                  <tbody className="divide-y divide-white/5">
                      {recentTransactions.map((tx) => (
                          <tr key={tx.id} className="hover:bg-white/5 transition">
                              <td className="p-2 text-gray-500 whitespace-nowrap">{new Date(tx.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</td>
                              <td className="p-2 text-blue-400 whitespace-nowrap">{tx.user_id.substring(0, 6)}..</td>
                              <td className="p-2 text-white capitalize">{tx.type}</td>
                              <td className={`p-2 text-right font-bold whitespace-nowrap ${['deposit', 'earn', 'game_win'].includes(tx.type) ? 'text-green-400' : 'text-red-400'}`}>
                                  {['deposit', 'earn', 'game_win'].includes(tx.type) ? '+' : '-'}<BalanceDisplay amount={tx.amount} compact />
                              </td>
                          </tr>
                      ))}
                  </tbody>
              </table>
          </div>
      </div>

    </div>
  );
};

export default Dashboard;
