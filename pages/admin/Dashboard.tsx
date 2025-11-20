
import React, { useEffect, useState } from 'react';
import GlassCard from '../../components/GlassCard';
import { supabase } from '../../integrations/supabase/client';
import { AdminStats } from '../../types';

const Dashboard: React.FC = () => {
  const [stats, setStats] = useState<AdminStats | null>(null);

  useEffect(() => {
    const fetchStats = async () => {
      const { count: userCount } = await supabase.from('profiles').select('*', { count: 'exact', head: true });
      
      const { data: deposits } = await supabase.from('wallets').select('deposit');
      const totalDeposits = (deposits || []).reduce((sum, w) => sum + (w.deposit || 0), 0);

      const { data: withdrawals } = await supabase.from('transactions').select('amount').eq('type', 'withdraw').eq('status', 'success');
      const totalWithdrawals = (withdrawals || []).reduce((sum, t) => sum + t.amount, 0);

      const { count: pendingWd } = await supabase.from('withdraw_requests').select('*', { count: 'exact', head: true }).eq('status', 'pending');

      setStats({
        totalUsers: userCount || 0,
        totalDeposits,
        totalWithdrawals,
        pendingWithdrawals: pendingWd || 0,
        revenue: totalDeposits - totalWithdrawals
      });
    };
    fetchStats();
  }, []);

  return (
    <div className="space-y-6 animate-fade-in">
      <h2 className="text-2xl font-bold text-white">System Overview</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <GlassCard className="p-4 border-l-4 border-blue-500 bg-blue-500/10">
          <p className="text-xs text-gray-400 uppercase">Total Users</p>
          <p className="text-2xl font-bold text-white">{stats?.totalUsers || 0}</p>
        </GlassCard>
        <GlassCard className="p-4 border-l-4 border-green-500 bg-green-500/10">
          <p className="text-xs text-gray-400 uppercase">Revenue (Net)</p>
          <p className="text-2xl font-bold text-white">${stats?.revenue.toLocaleString() || 0}</p>
        </GlassCard>
        <GlassCard className="p-4 border-l-4 border-yellow-500 bg-yellow-500/10">
          <p className="text-xs text-gray-400 uppercase">Pending Withdrawals</p>
          <p className="text-2xl font-bold text-white">{stats?.pendingWithdrawals || 0}</p>
        </GlassCard>
        <GlassCard className="p-4 border-l-4 border-purple-500 bg-purple-500/10">
          <p className="text-xs text-gray-400 uppercase">Total Deposits</p>
          <p className="text-2xl font-bold text-white">${stats?.totalDeposits.toLocaleString() || 0}</p>
        </GlassCard>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <GlassCard>
              <h3 className="font-bold text-white mb-4">Recent System Logs</h3>
              <div className="text-sm text-gray-400 space-y-2">
                  <p>• System backup completed at 04:00 AM</p>
                  <p>• New task batch #402 deployed</p>
                  <p>• Warning: High traffic detected on Game API</p>
              </div>
          </GlassCard>
          <GlassCard>
              <h3 className="font-bold text-white mb-4">Quick Actions</h3>
              <div className="flex gap-3">
                  <button className="bg-red-500/20 text-red-500 px-4 py-2 rounded-lg text-sm font-bold border border-red-500/30">Maintenance Mode</button>
                  <button className="bg-green-500/20 text-green-500 px-4 py-2 rounded-lg text-sm font-bold border border-green-500/30">Clear Cache</button>
              </div>
          </GlassCard>
      </div>
    </div>
  );
};

export default Dashboard;
