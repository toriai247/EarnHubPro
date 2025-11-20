
import React, { useEffect, useState } from 'react';
import GlassCard from '../../components/GlassCard';
import { supabase } from '../../integrations/supabase/client';
import { AdminStats } from '../../types';
import { TrendingUp, TrendingDown } from 'lucide-react';

const EarningsAnalytics: React.FC = () => {
  const [stats, setStats] = useState<AdminStats | null>(null);

  useEffect(() => {
      const fetch = async () => {
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
      fetch();
  }, []);

  return (
    <div className="space-y-6 animate-fade-in">
         <h2 className="text-2xl font-bold text-white">Earnings Analytics</h2>
         
         <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
             <GlassCard className="p-6 bg-gradient-to-br from-green-900/20 to-transparent border-green-500/30">
                 <h3 className="text-gray-400 text-sm font-bold uppercase mb-2">Total Net Revenue</h3>
                 <div className="text-4xl font-bold text-white mb-2">${stats?.revenue.toLocaleString()}</div>
                 <div className="flex items-center gap-1 text-neon-green text-xs font-bold">
                     <TrendingUp size={14} /> +12.5% from last month
                 </div>
             </GlassCard>
             <GlassCard className="p-6 bg-gradient-to-br from-blue-900/20 to-transparent border-blue-500/30">
                 <h3 className="text-gray-400 text-sm font-bold uppercase mb-2">Total Deposits</h3>
                 <div className="text-4xl font-bold text-white mb-2">${stats?.totalDeposits.toLocaleString()}</div>
                 <div className="text-xs text-gray-500">Across {stats?.totalUsers} users</div>
             </GlassCard>
         </div>

         <GlassCard>
             <h3 className="font-bold text-white mb-6">Monthly Revenue Chart</h3>
             <div className="h-64 flex items-end justify-between gap-2">
                 {[45, 60, 35, 70, 55, 80, 95, 65, 75, 85, 90, 100].map((h, i) => (
                     <div key={i} className="w-full bg-white/5 rounded-t hover:bg-neon-green/20 transition relative group">
                         <div className="absolute bottom-0 w-full bg-neon-green/50 rounded-t" style={{ height: `${h}%` }}></div>
                         <div className="opacity-0 group-hover:opacity-100 absolute -top-8 left-1/2 -translate-x-1/2 bg-black text-white text-xs p-1 rounded">${h}k</div>
                     </div>
                 ))}
             </div>
             <div className="flex justify-between mt-2 text-xs text-gray-500">
                 <span>Jan</span><span>Dec</span>
             </div>
         </GlassCard>
    </div>
  );
};

export default EarningsAnalytics;
