
import React, { useEffect, useState } from 'react';
import GlassCard from '../../components/GlassCard';
import { supabase } from '../../integrations/supabase/client';
import { 
  Users, DollarSign, Activity, AlertCircle, 
  CheckCircle, Server, ArrowUpRight, ArrowDownLeft, 
  Shield, Zap, Database, Wallet, RefreshCw,
  LayoutDashboard, CreditCard, Gamepad2, Gift, Settings, 
  MonitorOff, LifeBuoy, Sliders, CalendarClock, Briefcase,
  HardDrive, BellRing, GitFork, CheckSquare, PieChart, FileText,
  Cpu, Wifi, Layers, AlertOctagon, Info, Terminal, Globe
} from 'lucide-react';
import { Link } from 'react-router-dom';
import BalanceDisplay from '../../components/BalanceDisplay';
import Skeleton from '../../components/Skeleton';
import { useSystem } from '../../context/SystemContext';

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

const Dashboard: React.FC = () => {
  const { config } = useSystem();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [recentTransactions, setRecentTransactions] = useState<any[]>([]);
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
        // 1. User Stats
        const { count: userCount } = await supabase.from('profiles').select('*', { count: 'exact', head: true });
        
        const today = new Date();
        today.setHours(0,0,0,0);
        const { count: newUsers } = await supabase.from('profiles').select('*', { count: 'exact', head: true })
            .gte('created_at', today.toISOString());

        // 2. Pending Actions
        const { count: pendingDep } = await supabase.from('deposit_requests').select('*', { count: 'exact', head: true }).eq('status', 'pending');
        const { count: pendingWd } = await supabase.from('withdraw_requests').select('*', { count: 'exact', head: true }).eq('status', 'pending');
        const { count: pendingSup } = await supabase.from('help_requests').select('*', { count: 'exact', head: true }).eq('status', 'pending');

        // 3. Financials
        // Fetch aggregated deposit/withdraw
        const { data: depositTx } = await supabase.from('transactions').select('amount').eq('type', 'deposit').eq('status', 'success');
        const totalDeps = (depositTx || []).reduce((sum, t) => sum + t.amount, 0);

        const { data: withdrawTx } = await supabase.from('transactions').select('amount').eq('type', 'withdraw').eq('status', 'success');
        const totalWds = (withdrawTx || []).reduce((sum, t) => sum + t.amount, 0);

        // Calculate Liability (Sum of all user balances) - approximated by main_balance sum
        const { data: walletBalances } = await supabase.from('wallets').select('main_balance, deposit_balance, earning_balance');
        const liability = (walletBalances || []).reduce((sum, w) => sum + w.main_balance + w.deposit_balance + w.earning_balance, 0);

        // 5. Logs
        const { data: logs } = await supabase.from('transactions')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(10);

        const end = performance.now();

        setStats({
            totalUsers: userCount || 0,
            newUsersToday: newUsers || 0,
            activeUsers: Math.floor((userCount || 0) * 0.65), // Simulated active metric
            totalDeposits: totalDeps,
            totalWithdrawals: totalWds,
            pendingDeposits: pendingDep || 0,
            pendingWithdrawals: pendingWd || 0,
            pendingSupport: pendingSup || 0,
            systemRevenue: totalDeps - totalWds - liability, // Net Profit approximation
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
              { label: 'Revenue', icon: PieChart, path: '/admin/revenue', color: 'text-white' },
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

      {/* KPI CARDS - HIGH DENSITY */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          
          {/* Revenue */}
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

          {/* Users */}
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

          {/* Pending Action Summary */}
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
