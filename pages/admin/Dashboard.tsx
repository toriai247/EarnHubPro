
import React, { useEffect, useState } from 'react';
import GlassCard from '../../components/GlassCard';
import { supabase } from '../../integrations/supabase/client';
import { 
  Users, DollarSign, TrendingUp, Activity, AlertCircle, 
  CheckCircle, Server, ArrowUpRight, ArrowDownLeft, 
  Shield, Zap, Database, Wallet, RefreshCw, Power, Radio,
  LayoutDashboard, CreditCard, Gamepad2, Gift, Settings, 
  MonitorOff, LifeBuoy, Sliders, CalendarClock, Briefcase
} from 'lucide-react';
import { Link } from 'react-router-dom';
import BalanceDisplay from '../../components/BalanceDisplay';
import Skeleton from '../../components/Skeleton';
import { useSystem } from '../../context/SystemContext';

interface DashboardStats {
    totalUsers: number;
    totalDeposits: number;
    totalWithdrawals: number;
    pendingDeposits: number;
    pendingWithdrawals: number;
    pendingSupport: number;
    systemRevenue: number;
    systemLiability: number; // User balances
}

const Dashboard: React.FC = () => {
  const { config } = useSystem();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [recentTransactions, setRecentTransactions] = useState<any[]>([]);

  useEffect(() => {
    fetchRealStats();
  }, []);

  const fetchRealStats = async () => {
    setLoading(true);
    try {
        // 1. Total Users
        const { count: userCount } = await supabase.from('profiles').select('*', { count: 'exact', head: true });

        // 2. Pending Actions (Counts)
        const { count: pendingDep } = await supabase.from('deposit_requests').select('*', { count: 'exact', head: true }).eq('status', 'pending');
        const { count: pendingWd } = await supabase.from('withdraw_requests').select('*', { count: 'exact', head: true }).eq('status', 'pending');
        const { count: pendingSup } = await supabase.from('help_requests').select('*', { count: 'exact', head: true }).eq('status', 'pending');

        // 3. Financials (Aggregated from wallets and transactions)
        // Note: For large DBs, use RPC. Here we do simplified client-side calc or separate summary query.
        
        // Total Deposits (Completed)
        const { data: depositTx } = await supabase.from('transactions').select('amount').eq('type', 'deposit').eq('status', 'success');
        const totalDeps = (depositTx || []).reduce((sum, t) => sum + t.amount, 0);

        // Total Withdrawals (Completed)
        const { data: withdrawTx } = await supabase.from('transactions').select('amount').eq('type', 'withdraw').eq('status', 'success');
        const totalWds = (withdrawTx || []).reduce((sum, t) => sum + t.amount, 0);

        // User Liability (Total balances held by users)
        // Caution: Fetching all wallets is heavy. In prod, use an RPC or summary table.
        // For now, we simulate or fetch a limited batch to estimate, or use a cached stat.
        // Let's rely on deposit/withdraw diff for revenue roughly.
        const liability = totalDeps * 0.8; // Rough estimate if we don't query all wallets

        // 4. Recent Logs
        const { data: logs } = await supabase.from('transactions')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(8);

        setStats({
            totalUsers: userCount || 0,
            totalDeposits: totalDeps,
            totalWithdrawals: totalWds,
            pendingDeposits: pendingDep || 0,
            pendingWithdrawals: pendingWd || 0,
            pendingSupport: pendingSup || 0,
            systemRevenue: totalDeps - totalWds,
            systemLiability: liability
        });

        if (logs) setRecentTransactions(logs);

    } catch (e) {
        console.error("Dashboard Stats Error:", e);
    } finally {
        setLoading(false);
    }
  };

  if (loading) {
      return (
          <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  {[1,2,3,4].map(i => <Skeleton key={i} className="h-32 rounded-2xl" />)}
              </div>
              <Skeleton className="h-64 rounded-2xl" />
          </div>
      );
  }

  const shortcuts = [
      { label: 'Users', icon: Users, path: '/admin/users', color: 'text-blue-400', bg: 'bg-blue-500/10' },
      { label: 'Tasks', icon: CheckCircle, path: '/admin/tasks', color: 'text-green-400', bg: 'bg-green-500/10' },
      { label: 'Games', icon: Gamepad2, path: '/admin/games', color: 'text-purple-400', bg: 'bg-purple-500/10' },
      { label: 'Invest', icon: Briefcase, path: '/admin/invest', color: 'text-yellow-400', bg: 'bg-yellow-500/10' },
      { label: 'Spin', icon: RefreshCw, path: '/admin/spin', color: 'text-cyan-400', bg: 'bg-cyan-500/10' },
      { label: 'Video', icon: Activity, path: '/admin/videos', color: 'text-pink-400', bg: 'bg-pink-500/10' },
      { label: 'Config', icon: Settings, path: '/admin/config', color: 'text-gray-400', bg: 'bg-gray-500/10' },
      { label: 'System', icon: MonitorOff, path: '/admin/off_systems', color: 'text-red-400', bg: 'bg-red-500/10' },
      { label: 'Bonus', icon: Gift, path: '/admin/promos', color: 'text-orange-400', bg: 'bg-orange-500/10' },
      { label: 'Payroll', icon: CalendarClock, path: '/admin/monthly_pay', color: 'text-teal-400', bg: 'bg-teal-500/10' },
      { label: 'Limits', icon: Sliders, path: '/admin/withdraw_config', color: 'text-indigo-400', bg: 'bg-indigo-500/10' },
      { label: 'Payment', icon: CreditCard, path: '/admin/payment', color: 'text-blue-400', bg: 'bg-blue-500/10' },
  ];

  return (
    <div className="space-y-8 animate-fade-in pb-20">
      
      {/* HEADER */}
      <div className="flex justify-between items-center">
          <div>
              <h1 className="text-3xl font-display font-black text-white">Dashboard</h1>
              <p className="text-gray-400 text-sm">Real-time database analytics.</p>
          </div>
          <div className={`px-4 py-2 rounded-xl border flex items-center gap-2 ${config?.maintenance_mode ? 'bg-red-500/10 border-red-500/30 text-red-400' : 'bg-green-500/10 border-green-500/30 text-green-400'}`}>
              <Server size={18} />
              <span className="text-xs font-bold uppercase">{config?.maintenance_mode ? 'MAINTENANCE' : 'ONLINE'}</span>
          </div>
      </div>

      {/* KPI CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <GlassCard className="p-5 border-l-4 border-l-neon-green">
              <div className="flex justify-between items-start mb-2">
                  <p className="text-gray-400 text-xs font-bold uppercase">Total Revenue</p>
                  <DollarSign size={20} className="text-neon-green"/>
              </div>
              <h3 className="text-2xl font-black text-white"><BalanceDisplay amount={stats?.systemRevenue || 0} /></h3>
              <p className="text-[10px] text-gray-500 mt-1">Deposits - Withdrawals</p>
          </GlassCard>

          <GlassCard className="p-5 border-l-4 border-l-blue-500">
              <div className="flex justify-between items-start mb-2">
                  <p className="text-gray-400 text-xs font-bold uppercase">Total Users</p>
                  <Users size={20} className="text-blue-500"/>
              </div>
              <h3 className="text-2xl font-black text-white">{stats?.totalUsers.toLocaleString()}</h3>
              <p className="text-[10px] text-gray-500 mt-1">Registered Accounts</p>
          </GlassCard>

          <GlassCard className="p-5 border-l-4 border-l-purple-500">
              <div className="flex justify-between items-start mb-2">
                  <p className="text-gray-400 text-xs font-bold uppercase">Total Deposits</p>
                  <ArrowDownLeft size={20} className="text-purple-500"/>
              </div>
              <h3 className="text-2xl font-black text-white"><BalanceDisplay amount={stats?.totalDeposits || 0} /></h3>
              <p className="text-[10px] text-gray-500 mt-1">Lifetime Funding</p>
          </GlassCard>

          <GlassCard className="p-5 border-l-4 border-l-orange-500">
              <div className="flex justify-between items-start mb-2">
                  <p className="text-gray-400 text-xs font-bold uppercase">Total Payouts</p>
                  <ArrowUpRight size={20} className="text-orange-500"/>
              </div>
              <h3 className="text-2xl font-black text-white"><BalanceDisplay amount={stats?.totalWithdrawals || 0} /></h3>
              <p className="text-[10px] text-gray-500 mt-1">Lifetime Withdrawals</p>
          </GlassCard>
      </div>

      {/* ACTION REQUIRED ALERTS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Link to="/admin/deposits" className="group">
              <div className={`p-4 rounded-xl border transition flex items-center justify-between ${stats?.pendingDeposits ? 'bg-red-500/10 border-red-500/30 hover:bg-red-500/20' : 'bg-white/5 border-white/5 hover:bg-white/10'}`}>
                  <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-full ${stats?.pendingDeposits ? 'bg-red-500 text-white' : 'bg-gray-700 text-gray-400'}`}>
                          <Wallet size={20} />
                      </div>
                      <div>
                          <p className="text-xs font-bold uppercase text-gray-400">Pending Deposits</p>
                          <p className={`text-lg font-bold ${stats?.pendingDeposits ? 'text-white' : 'text-gray-500'}`}>{stats?.pendingDeposits} Requests</p>
                      </div>
                  </div>
                  {stats?.pendingDeposits ? <AlertCircle className="text-red-500 animate-pulse" size={20} /> : <CheckCircle className="text-gray-600" size={20} />}
              </div>
          </Link>

          <Link to="/admin/withdrawals" className="group">
              <div className={`p-4 rounded-xl border transition flex items-center justify-between ${stats?.pendingWithdrawals ? 'bg-yellow-500/10 border-yellow-500/30 hover:bg-yellow-500/20' : 'bg-white/5 border-white/5 hover:bg-white/10'}`}>
                  <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-full ${stats?.pendingWithdrawals ? 'bg-yellow-500 text-black' : 'bg-gray-700 text-gray-400'}`}>
                          <ArrowUpRight size={20} />
                      </div>
                      <div>
                          <p className="text-xs font-bold uppercase text-gray-400">Pending Payouts</p>
                          <p className={`text-lg font-bold ${stats?.pendingWithdrawals ? 'text-white' : 'text-gray-500'}`}>{stats?.pendingWithdrawals} Requests</p>
                      </div>
                  </div>
                  {stats?.pendingWithdrawals ? <AlertCircle className="text-yellow-500 animate-pulse" size={20} /> : <CheckCircle className="text-gray-600" size={20} />}
              </div>
          </Link>

          <Link to="/admin/help_requests" className="group">
              <div className={`p-4 rounded-xl border transition flex items-center justify-between ${stats?.pendingSupport ? 'bg-blue-500/10 border-blue-500/30 hover:bg-blue-500/20' : 'bg-white/5 border-white/5 hover:bg-white/10'}`}>
                  <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-full ${stats?.pendingSupport ? 'bg-blue-500 text-white' : 'bg-gray-700 text-gray-400'}`}>
                          <LifeBuoy size={20} />
                      </div>
                      <div>
                          <p className="text-xs font-bold uppercase text-gray-400">Support Tickets</p>
                          <p className={`text-lg font-bold ${stats?.pendingSupport ? 'text-white' : 'text-gray-500'}`}>{stats?.pendingSupport} New</p>
                      </div>
                  </div>
                  {stats?.pendingSupport ? <AlertCircle className="text-blue-500 animate-pulse" size={20} /> : <CheckCircle className="text-gray-600" size={20} />}
              </div>
          </Link>
      </div>

      {/* MODULE SHORTCUTS GRID */}
      <div>
          <h3 className="text-sm font-bold text-white mb-4 uppercase tracking-wider flex items-center gap-2">
              <LayoutDashboard size={16} className="text-neon-green"/> Module Shortcuts
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
              {shortcuts.map((sc, i) => (
                  <Link 
                    key={i} 
                    to={sc.path} 
                    className="flex flex-col items-center justify-center p-4 bg-white/5 border border-white/5 rounded-2xl hover:bg-white/10 hover:border-white/20 transition group"
                  >
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-2 ${sc.bg} ${sc.color} group-hover:scale-110 transition`}>
                          <sc.icon size={20} />
                      </div>
                      <span className="text-xs font-bold text-gray-400 group-hover:text-white">{sc.label}</span>
                  </Link>
              ))}
          </div>
      </div>

      {/* LIVE FEED */}
      <GlassCard className="p-0 overflow-hidden">
          <div className="p-4 border-b border-white/10 bg-white/5 flex justify-between items-center">
              <h3 className="font-bold text-white text-sm flex items-center gap-2"><Database size={16} className="text-blue-400"/> Live Database Logs</h3>
              <button onClick={fetchRealStats} className="text-xs text-gray-400 hover:text-white flex items-center gap-1"><RefreshCw size={12}/> Refresh</button>
          </div>
          <div className="divide-y divide-white/5">
              {recentTransactions.map((tx) => (
                  <div key={tx.id} className="p-3 flex items-center justify-between hover:bg-white/5 transition">
                      <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-lg ${
                              tx.type === 'deposit' ? 'bg-green-500/10 text-green-400' : 
                              tx.type === 'withdraw' ? 'bg-red-500/10 text-red-400' : 
                              'bg-blue-500/10 text-blue-400'
                          }`}>
                              {tx.type === 'deposit' ? <ArrowDownLeft size={14}/> : tx.type === 'withdraw' ? <ArrowUpRight size={14}/> : <Zap size={14}/>}
                          </div>
                          <div>
                              <p className="text-xs font-bold text-white capitalize">{tx.description || tx.type.replace('_', ' ')}</p>
                              <p className="text-[10px] text-gray-500 font-mono">{tx.user_id.split('-')[0]}... • {new Date(tx.created_at).toLocaleTimeString()}</p>
                          </div>
                      </div>
                      <div className={`font-mono font-bold text-xs ${['deposit', 'earn', 'game_win'].includes(tx.type) ? 'text-neon-green' : 'text-white'}`}>
                          {['deposit', 'earn', 'game_win'].includes(tx.type) ? '+' : '-'}<BalanceDisplay amount={tx.amount} />
                      </div>
                  </div>
              ))}
              {recentTransactions.length === 0 && (
                  <div className="p-8 text-center text-gray-500 text-xs">No recent activity found in database.</div>
              )}
          </div>
      </GlassCard>

    </div>
  );
};

export default Dashboard;
