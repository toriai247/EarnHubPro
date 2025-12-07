import React, { useEffect, useState } from 'react';
import GlassCard from '../../components/GlassCard';
import { supabase } from '../../integrations/supabase/client';
import { 
  Users, DollarSign, Activity, AlertCircle, 
  CheckCircle, Server, ArrowUpRight, ArrowDownLeft, 
  Shield, Zap, Database, Wallet, RefreshCw,
  LayoutDashboard, CreditCard, Gamepad2, Gift, Settings, 
  MonitorOff, LifeBuoy, Sliders, CalendarClock, Briefcase,
  HardDrive, BellRing, GitFork, CheckSquare, PieChart as PieChartIcon, FileText,
  Cpu, Wifi, Layers, AlertOctagon, Info, Terminal, Globe
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
    systemLiability: number; // User wallet balances
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

  useEffect(() => {
    fetchRealStats();
    
    // Simulate live system health fluctuation
    const interval = setInterval(() => {
        setSystemHealth(prev => ({
            cpu: Math.min(100, Math.max(5, prev.cpu + (Math.random() * 10 - 5))),
            ram: Math.min(100, Math.max(20, prev.ram + (Math.random() * 5 - 2.5))),
            status: prev.cpu > 80 ? 'HIGH LOAD' : 'OPTIMAL'
        }));
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  const fetchRealStats = async () => {
    setLoading(true);
    const start = performance.now();
    try {
        const today = new Date();
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(today.getDate() - 7);
        const iso7Days = sevenDaysAgo.toISOString();

        // 1. User Stats
        const { count: userCount } = await supabase.from('profiles').select('*', { count: 'exact', head: true });
        
        today.setHours(0,0,0,0);
        const { count: newUsers } = await supabase.from('profiles').select('*', { count: 'exact', head: true })
            .gte('created_at', today.toISOString());

        // 2. Pending Actions
        const { count: pendingDep } = await supabase.from('deposit_requests').select('*', { count: 'exact', head: true }).eq('status', 'pending');
        const { count: pendingWd } = await supabase.from('withdraw_requests').select('*', { count: 'exact', head: true }).eq('status', 'pending');
        const { count: pendingSup } = await supabase.from('help_requests').select('*', { count: 'exact', head: true }).eq('status', 'pending');

        // 3. Financials (All Time)
        const { data: depositTx } = await supabase.from('transactions').select('amount').eq('type', 'deposit').eq('status', 'success');
        const totalDeps = (depositTx || []).reduce((sum: number, t: any) => sum + t.amount, 0);

        const { data: withdrawTx } = await supabase.from('transactions').select('amount').eq('type', 'withdraw').eq('status', 'success');
        const totalWds = (withdrawTx || []).reduce((sum: number, t: any) => sum + t.amount, 0);

        // Liability
        const { data: walletBalances } = await supabase.from('wallets').select('main_balance, deposit_balance, earning_balance');
        const liability = (walletBalances || []).reduce((sum: number, w: any) => sum + w.main_balance + w.deposit_balance + w.earning_balance, 0);

        // 4. Chart Data (Last 7 Days)
        const { data: recentTx } = await supabase.from('transactions')
            .select('created_at, type, amount')
            .gte('created_at', iso7Days);
        
        const { data: recentProfiles } = await supabase.from('profiles')
            .select('created_at')
            .gte('created_at', iso7Days);

        const chartPoints = Array.from({length: 7}, (_, i) => {
            const d = new Date();
            d.setDate(d.getDate() - (6 - i));
            const dateStr = d.toISOString().split('T')[0];
            const displayDate = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

            const dayTx = recentTx?.filter((t: any) => t.created_at.startsWith(dateStr)) || [];
            const deposits = dayTx.filter((t: any) => t.type === 'deposit').reduce((sum: any, t: any) => sum + t.amount, 0);
            const withdrawals = dayTx.filter((t: any) => t.type === 'withdraw').reduce((sum: any, t: any) => sum + t.amount, 0);
            const newUsersCount = recentProfiles?.filter((p: any) => p.created_at.startsWith(dateStr)).length || 0;

            return {
                name: displayDate,
                deposits,
                withdrawals,
                revenue: deposits - withdrawals,
                newUsers: newUsersCount
            };
        });
        setChartData(chartPoints);

        // 5. Pie Chart Distribution (Outflow Analysis - Last 7 Days)
        const earningOutflow = recentTx?.filter((t: any) => t.type === 'earn').reduce((sum: any, t: any) => sum + t.amount, 0) || 0;
        const referralOutflow = recentTx?.filter((t: any) => t.type === 'referral').reduce((sum: any, t: any) => sum + t.amount, 0) || 0;
        const gameWinOutflow = recentTx?.filter((t: any) => t.type === 'game_win').reduce((sum: any, t: any) => sum + t.amount, 0) || 0;

        setPieData([
            { name: 'Task Payouts', value: earningOutflow, color: '#f59e0b' },
            { name: 'Referrals', value: referralOutflow, color: '#ec4899' },
            { name: 'Game Wins', value: gameWinOutflow, color: '#a855f7' },
        ].filter(d => d.value > 0));

        // 6. Logs
        const { data: logs } = await supabase.from('transactions')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(10);

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

    } catch (e) {
        console.error("Dashboard Stats Error:", e);
    } finally {
        setLoading(false);
    }
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
      if (active && payload && payload.length) {
          return (
              <div className="bg-black/90 border border-white/10 p-3 rounded-xl shadow-xl text-xs backdrop-blur-md">
                  <p className="font-bold text-white mb-2">{label}</p>
                  {payload.map((p: any, idx: number) => (
                      <div key={idx} style={{ color: p.color }} className="flex justify-between gap-4 mb-1">
                          <span className="capitalize">{p.name}:</span>
                          <span className="font-mono font-bold">
                              {p.name === 'newUsers' ? p.value : `৳${p.value.toLocaleString()}`}
                          </span>
                      </div>
                  ))}
              </div>
          );
      }
      return null;
  };

  const categories = [
      {
          title: "User Management",
          items: [
              { label: 'User Database', icon: Users, path: '/admin/users', color: 'text-blue-400' },
              { label: 'Referral Tiers', icon: GitFork, path: '/admin/referrals', color: 'text-indigo-400' },
              { label: 'Send Noti', icon: BellRing, path: '/admin/noti_sender', color: 'text-sky-400' },
          ]
      },
      {
          title: "Financial Operations",
          items: [
              { label: 'Deposits', icon: Database, path: '/admin/deposits', count: stats?.pendingDeposits, alert: true, color: 'text-green-400' },
              { label: 'Withdrawals', icon: CreditCard, path: '/admin/withdrawals', count: stats?.pendingWithdrawals, alert: true, color: 'text-red-400' },
              { label: 'Limits Config', icon: Sliders, path: '/admin/withdraw_config', color: 'text-gray-400' },
              { label: 'Methods', icon: Wallet, path: '/admin/payment', color: 'text-gray-400' },
              { label: 'Payroll', icon: CalendarClock, path: '/admin/monthly_pay', color: 'text-gray-400' },
          ]
      },
      {
          title: "Earning Modules",
          items: [
              { label: 'Tasks', icon: CheckSquare, path: '/admin/tasks', color: 'text-yellow-400' },
              { label: 'Games', icon: Gamepad2, path: '/admin/games', color: 'text-purple-400' },
              { label: 'Spin Wheel', icon: RefreshCw, path: '/admin/spin', color: 'text-pink-400' },
              { label: 'Invest Plans', icon: Briefcase, path: '/admin/invest', color: 'text-orange-400' },
              { label: 'Videos', icon: FileText, path: '/admin/videos', color: 'text-cyan-400' },
              { label: 'Bonuses', icon: Gift, path: '/admin/promos', color: 'text-teal-400' },
          ]
      },
      {
          title: "System Core",
          items: [
              { label: 'Site Config', icon: Settings, path: '/admin/config', color: 'text-white' },
              { label: 'Off Switch', icon: MonitorOff, path: '/admin/off_systems', color: 'text-red-500' },
              { label: 'DB Ultra', icon: HardDrive, path: '/admin/database_ultra', color: 'text-blue-500' },
              { label: 'Support', icon: LifeBuoy, path: '/admin/help_requests', count: stats?.pendingSupport, alert: true, color: 'text-green-500' },
              { label: 'Revenue', icon: PieChartIcon, path: '/admin/revenue', color: 'text-white' },
          ]
      }
  ];

  if (loading) {
      return (
          <div className="space-y-4">
              <Skeleton className="h-16 w-full rounded-xl" />
              <div className="grid grid-cols-4 gap-4">
                  {[1,2,3,4].map(i => <Skeleton key={i} className="h-32 rounded-xl" />)}
              </div>
              <Skeleton className="h-96 w-full rounded-xl" />
          </div>
      );
  }

  return (
    <div className="space-y-6 pb-20">
      
      {/* SYSTEM HEALTH BAR */}
      <div className="bg-black/40 border border-white/10 rounded-xl p-3 flex flex-wrap items-center justify-between gap-4 text-xs font-mono shadow-sm">
          <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                  <Server size={14} className={config?.maintenance_mode ? "text-red-500" : "text-neon-green"} />
                  <span className={config?.maintenance_mode ? "text-red-500 font-bold" : "text-neon-green font-bold"}>
                      {config?.maintenance_mode ? 'MAINTENANCE MODE' : 'SYSTEM ONLINE'}
                  </span>
              </div>
              <div className="flex items-center gap-2 text-gray-400">
                  <Wifi size={14} />
                  <span>Lat: {stats?.dbLatency}ms</span>
              </div>
              <div className="flex items-center gap-2 text-gray-400">
                  <Cpu size={14} />
                  <span>CPU: {systemHealth.cpu.toFixed(0)}%</span>
              </div>
              <div className="flex items-center gap-2 text-gray-400">
                  <Layers size={14} />
                  <span>RAM: {systemHealth.ram.toFixed(0)}%</span>
              </div>
          </div>
          <div className="flex items-center gap-2">
              <button onClick={fetchRealStats} className="flex items-center gap-1 hover:text-white text-gray-500 transition">
                  <RefreshCw size={12} /> Sync Data
              </button>
          </div>
      </div>

      {/* --- VISUALIZATION SECTION --- */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Main Financial Chart */}
          <GlassCard className="lg:col-span-2 p-6 bg-black/40 border-white/5 relative">
              <div className="flex justify-between items-center mb-6">
                  <div>
                      <h3 className="font-bold text-white uppercase text-sm tracking-widest flex items-center gap-2">
                          <Activity size={16} className="text-blue-400"/> Financial Flow (7 Days)
                      </h3>
                      <p className="text-xs text-gray-500 mt-1">Deposits vs Withdrawals Trend</p>
                  </div>
              </div>
              <div className="h-[300px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
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
                          <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#666', fontSize: 10}} dy={10}/>
                          <YAxis axisLine={false} tickLine={false} tick={{fill: '#666', fontSize: 10}} />
                          <Tooltip content={<CustomTooltip />} cursor={{ stroke: 'rgba(255,255,255,0.1)', strokeWidth: 2 }} />
                          <Area type="monotone" dataKey="deposits" stroke="#4ade80" strokeWidth={2} fillOpacity={1} fill="url(#colorDep)" name="Deposits" />
                          <Area type="monotone" dataKey="withdrawals" stroke="#ef4444" strokeWidth={2} fillOpacity={1} fill="url(#colorWd)" name="Withdrawals" />
                      </AreaChart>
                  </ResponsiveContainer>
              </div>
          </GlassCard>

          {/* Secondary Charts Column */}
          <div className="space-y-6">
              
              {/* User Growth */}
              <GlassCard className="p-6 bg-black/40 border-white/5">
                  <h3 className="font-bold text-white uppercase text-sm tracking-widest flex items-center gap-2 mb-4">
                      <Users size={16} className="text-purple-400"/> New Users
                  </h3>
                  <div className="h-[120px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={chartData}>
                              <Bar dataKey="newUsers" fill="#a855f7" radius={[4, 4, 0, 0]} />
                              <Tooltip content={<CustomTooltip />} cursor={{fill: 'transparent'}}/>
                          </BarChart>
                      </ResponsiveContainer>
                  </div>
                  <div className="mt-2 text-center">
                      <span className="text-2xl font-black text-white">+{stats?.newUsersToday}</span>
                      <span className="text-xs text-gray-500 ml-2">Today</span>
                  </div>
              </GlassCard>

              {/* Payout Distribution */}
              <GlassCard className="p-6 bg-black/40 border-white/5">
                  <h3 className="font-bold text-white uppercase text-sm tracking-widest flex items-center gap-2 mb-2">
                      <PieChartIcon size={16} className="text-yellow-400"/> Payout Mix
                  </h3>
                  <div className="h-[140px] w-full flex items-center justify-center">
                      {pieData.length > 0 ? (
                          <ResponsiveContainer width="100%" height="100%">
                              <PieChart>
                                  <Pie
                                      data={pieData}
                                      cx="50%"
                                      cy="50%"
                                      innerRadius={40}
                                      outerRadius={60}
                                      paddingAngle={5}
                                      dataKey="value"
                                  >
                                      {pieData.map((entry, index) => (
                                          <Cell key={`cell-${index}`} fill={entry.color} stroke="none" />
                                      ))}
                                  </Pie>
                                  <Tooltip />
                              </PieChart>
                          </ResponsiveContainer>
                      ) : (
                          <p className="text-xs text-gray-500">No payout data this week</p>
                      )}
                  </div>
                  <div className="flex flex-wrap justify-center gap-2 mt-2">
                      {pieData.map(d => (
                          <div key={d.name} className="flex items-center gap-1 text-[10px] text-gray-400">
                              <span className="w-2 h-2 rounded-full" style={{backgroundColor: d.color}}></span>
                              {d.name}
                          </div>
                      ))}
                  </div>
              </GlassCard>
          </div>
      </div>

      {/* KPI CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-gradient-to-br from-green-900/40 to-black border border-green-500/30 rounded-xl p-4 relative overflow-hidden">
              <div className="flex justify-between items-start mb-2 relative z-10">
                  <div className="p-2 bg-green-500/20 rounded-lg text-green-400"><DollarSign size={20}/></div>
                  <span className="text-[10px] bg-green-500/10 text-green-400 px-2 py-0.5 rounded font-bold uppercase">Net Profit</span>
              </div>
              <div className="relative z-10">
                  <h3 className="text-2xl font-black text-white"><BalanceDisplay amount={stats?.systemRevenue || 0} /></h3>
                  <p className="text-[10px] text-gray-400 mt-1">Total In - (Total Out + Liability)</p>
              </div>
          </div>

          <div className="bg-gradient-to-br from-blue-900/20 to-black border border-blue-500/30 rounded-xl p-4 relative overflow-hidden">
              <div className="flex justify-between items-start mb-2 relative z-10">
                  <div className="p-2 bg-blue-500/20 rounded-lg text-blue-400"><Users size={20}/></div>
                  <span className="text-[10px] bg-blue-500/10 text-blue-400 px-2 py-0.5 rounded font-bold uppercase">User Base</span>
              </div>
              <div className="relative z-10">
                  <h3 className="text-2xl font-black text-white">{stats?.totalUsers.toLocaleString()}</h3>
                  <p className="text-[10px] text-gray-400 mt-1">+{stats?.newUsersToday} New Today</p>
              </div>
          </div>

          <div className="bg-gradient-to-br from-yellow-900/20 to-black border border-yellow-500/30 rounded-xl p-4 relative overflow-hidden">
              <div className="flex justify-between items-start mb-2 relative z-10">
                  <div className="p-2 bg-yellow-500/20 rounded-lg text-yellow-400"><Activity size={20}/></div>
                  <span className="text-[10px] bg-yellow-500/10 text-yellow-400 px-2 py-0.5 rounded font-bold uppercase">Action Items</span>
              </div>
              <div className="relative z-10 flex gap-4 mt-2">
                  <div>
                      <p className="text-xl font-bold text-white">{stats?.pendingWithdrawals}</p>
                      <p className="text-[9px] text-gray-500 uppercase">Payouts</p>
                  </div>
                  <div>
                      <p className="text-xl font-bold text-white">{stats?.pendingDeposits}</p>
                      <p className="text-[9px] text-gray-500 uppercase">Deposits</p>
                  </div>
                  <div>
                      <p className="text-xl font-bold text-white">{stats?.pendingSupport}</p>
                      <p className="text-[9px] text-gray-500 uppercase">Tickets</p>
                  </div>
              </div>
          </div>
          
          <div className="bg-gradient-to-br from-red-900/20 to-black border border-red-500/30 rounded-xl p-4 relative overflow-hidden">
              <div className="flex justify-between items-start mb-2 relative z-10">
                  <div className="p-2 bg-red-500/20 rounded-lg text-red-400"><Wallet size={20}/></div>
                  <span className="text-[10px] bg-red-500/10 text-red-400 px-2 py-0.5 rounded font-bold uppercase">Liability</span>
              </div>
              <div className="relative z-10">
                  <h3 className="text-2xl font-black text-white"><BalanceDisplay amount={stats?.systemLiability || 0} /></h3>
                  <p className="text-[10px] text-gray-400 mt-1">Total User Wallet Holdings</p>
              </div>
          </div>
      </div>

      {/* COMPREHENSIVE SHORTCUT GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {categories.map((cat, idx) => (
              <div key={idx} className="space-y-3">
                  <h4 className="text-xs font-bold text-gray-500 uppercase tracking-widest pl-1 border-b border-white/10 pb-2">
                      {cat.title}
                  </h4>
                  <div className="grid gap-2">
                      {cat.items.map((item, i) => (
                          <Link 
                            key={i} 
                            to={item.path}
                            className="flex items-center justify-between p-3 rounded-lg bg-white/5 border border-white/5 hover:bg-white/10 hover:border-white/10 transition group"
                          >
                              <div className="flex items-center gap-3">
                                  <item.icon size={16} className={`${item.color} group-hover:scale-110 transition-transform`} />
                                  <span className="text-xs font-bold text-gray-300 group-hover:text-white">{item.label}</span>
                              </div>
                              {(item.count !== undefined && item.count > 0) && (
                                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${item.alert ? 'bg-red-500 text-white animate-pulse' : 'bg-white/10 text-gray-400'}`}>
                                      {item.count}
                                  </span>
                              )}
                          </Link>
                      ))}
                  </div>
              </div>
          ))}
      </div>

      {/* LIVE DB FEED */}
      <div className="bg-black/30 border border-white/10 rounded-xl overflow-hidden">
          <div className="p-4 bg-white/5 border-b border-white/5 flex justify-between items-center">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Terminal size={16} className="text-blue-400"/> System Stream
              </h3>
              <div className="flex items-center gap-2">
                  <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                  <span className="text-[10px] text-gray-500 uppercase">Live</span>
              </div>
          </div>
          <div className="max-h-60 overflow-y-auto custom-scrollbar">
              <table className="w-full text-left text-xs font-mono">
                  <thead className="bg-black/40 text-gray-500 sticky top-0">
                      <tr>
                          <th className="p-3">Time</th>
                          <th className="p-3">User</th>
                          <th className="p-3">Action</th>
                          <th className="p-3 text-right">Value</th>
                      </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                      {recentTransactions.map((tx) => (
                          <tr key={tx.id} className="hover:bg-white/5 transition">
                              <td className="p-3 text-gray-500">{new Date(tx.created_at).toLocaleTimeString()}</td>
                              <td className="p-3 text-blue-400">{tx.user_id.split('-')[0]}...</td>
                              <td className="p-3 text-white">
                                  <span className="opacity-80">{tx.type.toUpperCase()}</span>
                                  <span className="text-gray-600 ml-2 text-[10px] hidden sm:inline">{tx.description}</span>
                              </td>
                              <td className={`p-3 text-right font-bold ${['deposit', 'earn', 'game_win'].includes(tx.type) ? 'text-green-400' : 'text-red-400'}`}>
                                  {['deposit', 'earn', 'game_win'].includes(tx.type) ? '+' : '-'}<BalanceDisplay amount={tx.amount} />
                              </td>
                          </tr>
                      ))}
                      {recentTransactions.length === 0 && (
                          <tr><td colSpan={4} className="p-6 text-center text-gray-500">No recent logs available.</td></tr>
                      )}
                  </tbody>
              </table>
          </div>
      </div>

    </div>
  );
};

export default Dashboard;