
import React, { useEffect, useState } from 'react';
import GlassCard from '../../components/GlassCard';
import { supabase } from '../../integrations/supabase/client';
import { MarketTask } from '../../types';
import { 
  Trash2, Pause, Play, Search, AlertCircle, DollarSign, 
  Users, TrendingUp, Briefcase, Eye, ExternalLink, CheckCircle 
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import BalanceDisplay from '../../components/BalanceDisplay';
import Loader from '../../components/Loader';
import { useUI } from '../../context/UIContext';

interface ExtendedTask extends MarketTask {
    creator_name?: string;
    creator_email?: string;
}

const TaskManagement: React.FC = () => {
  const { toast, confirm } = useUI();
  const [tasks, setTasks] = useState<ExtendedTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [stats, setStats] = useState({
      totalTasks: 0,
      activeBudget: 0,
      potentialProfit: 0,
      totalActions: 0
  });

  useEffect(() => {
    fetchTasks();
  }, []);

  const fetchTasks = async () => {
    setLoading(true);
    try {
        // 1. Fetch all marketplace tasks
        const { data: tasksData, error } = await supabase
            .from('marketplace_tasks')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;

        if (tasksData) {
            // 2. Extract unique creator IDs to fetch profiles manually
            // (Avoids foreign key join errors if relationship isn't explicitly defined)
            const creatorIds = Array.from(new Set(tasksData.map((t: any) => t.creator_id)));
            
            let profileMap = new Map();
            if (creatorIds.length > 0) {
                const { data: profiles } = await supabase
                    .from('profiles')
                    .select('id, name_1, email_1')
                    .in('id', creatorIds);
                
                if (profiles) {
                    profileMap = new Map(profiles.map((p: any) => [p.id, p]));
                }
            }

            const formattedTasks = tasksData.map((t: any) => {
                // Safe access with optional chaining and fallback
                const profile: any = profileMap.get(t.creator_id) || {};
                return {
                    ...t,
                    creator_name: profile.name_1 || 'Unknown User',
                    creator_email: profile.email_1 || 'No Email'
                };
            });

            setTasks(formattedTasks);
            calculateStats(formattedTasks);
        }
    } catch (e: any) {
        console.error("Fetch error details:", e);
        toast.error("Failed to load tasks: " + (e.message || "Unknown error"));
    } finally {
        setLoading(false);
    }
  };

  const calculateStats = (data: ExtendedTask[]) => {
      const active = data.filter(t => t.status === 'active');
      const budget = active.reduce((sum, t) => sum + (t.remaining_quantity * t.price_per_action), 0);
      
      // Profit = (Price - Reward) * Remaining Qty
      const profit = active.reduce((sum, t) => sum + (t.remaining_quantity * (t.price_per_action - t.worker_reward)), 0);
      
      setStats({
          totalTasks: data.length,
          activeBudget: budget,
          potentialProfit: profit,
          totalActions: active.reduce((sum, t) => sum + t.remaining_quantity, 0)
      });
  };

  const handleToggleStatus = async (task: ExtendedTask) => {
      const newStatus = task.status === 'active' ? 'paused' : 'active';
      const action = newStatus === 'active' ? 'Resume' : 'Pause';
      
      if (!await confirm(`${action} campaign "${task.title}"?`)) return;

      const { error } = await supabase
          .from('marketplace_tasks')
          .update({ status: newStatus })
          .eq('id', task.id);

      if (error) {
          toast.error("Update failed");
      } else {
          toast.success(`Task ${newStatus}`);
          setTasks(prev => prev.map(t => t.id === task.id ? { ...t, status: newStatus as any } : t));
          // Recalculate stats
          calculateStats(tasks.map(t => t.id === task.id ? { ...t, status: newStatus as any } : t));
      }
  };

  const handleDelete = async (id: string) => {
      if(!await confirm("Delete this campaign permanently? This cannot be undone.", "Delete Campaign")) return;
      
      const { error } = await supabase.from('marketplace_tasks').delete().eq('id', id);
      if(error) {
          toast.error("Error deleting task: " + error.message);
      } else {
          toast.success("Task deleted");
          setTasks(prev => prev.filter(t => t.id !== id));
      }
  };

  const filteredTasks = tasks.filter(t => filter === 'all' || t.status === filter);

  if (loading) return <div className="p-10"><Loader /></div>;

  return (
    <div className="space-y-6 animate-fade-in relative pb-20">
        
        {/* HEADER STATS */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <GlassCard className="p-4 bg-blue-900/20 border-blue-500/30">
                <p className="text-blue-300 text-xs font-bold uppercase mb-1">Active Budget</p>
                <h3 className="text-2xl font-black text-white"><BalanceDisplay amount={stats.activeBudget} /></h3>
                <p className="text-[10px] text-gray-400">Total Advertiser Funds</p>
            </GlassCard>
            <GlassCard className="p-4 bg-green-900/20 border-green-500/30">
                <p className="text-green-300 text-xs font-bold uppercase mb-1">Projected Profit</p>
                <h3 className="text-2xl font-black text-white"><BalanceDisplay amount={stats.potentialProfit} /></h3>
                <p className="text-[10px] text-gray-400">Admin Commission (30%)</p>
            </GlassCard>
            <GlassCard className="p-4 bg-purple-900/20 border-purple-500/30">
                <p className="text-purple-300 text-xs font-bold uppercase mb-1">Total Campaigns</p>
                <h3 className="text-2xl font-black text-white">{stats.totalTasks}</h3>
                <p className="text-[10px] text-gray-400">All Time</p>
            </GlassCard>
            <GlassCard className="p-4 bg-yellow-900/20 border-yellow-500/30">
                <p className="text-yellow-300 text-xs font-bold uppercase mb-1">Pending Actions</p>
                <h3 className="text-2xl font-black text-white">{stats.totalActions}</h3>
                <p className="text-[10px] text-gray-400">Remaining User Tasks</p>
            </GlassCard>
        </div>

        {/* CONTROLS */}
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                <Briefcase className="text-neon-green" /> Master Control
            </h2>
            
            <div className="flex bg-white/5 p-1 rounded-xl border border-white/5">
                {['all', 'active', 'paused', 'completed'].map(f => (
                    <button 
                        key={f}
                        onClick={() => setFilter(f)}
                        className={`px-4 py-2 rounded-lg text-xs font-bold uppercase transition ${filter === f ? 'bg-white text-black' : 'text-gray-400 hover:text-white'}`}
                    >
                        {f}
                    </button>
                ))}
            </div>
        </div>

        {/* TASKS LIST */}
        <div className="space-y-4">
            {filteredTasks.length === 0 ? (
                <div className="text-center py-20 bg-white/5 rounded-xl border border-white/5">
                    <AlertCircle className="mx-auto text-gray-600 mb-4" size={48} />
                    <p className="text-gray-500">No campaigns found.</p>
                </div>
            ) : (
                filteredTasks.map(task => {
                    const profitPerAction = task.price_per_action - task.worker_reward;
                    const totalProfit = profitPerAction * task.total_quantity;
                    const progress = ((task.total_quantity - task.remaining_quantity) / task.total_quantity) * 100;

                    return (
                    <GlassCard key={task.id} className="relative overflow-hidden group border-l-4 border-l-purple-500">
                        <div className="flex flex-col lg:flex-row gap-6">
                            
                            {/* LEFT: INFO */}
                            <div className="flex-1">
                                <div className="flex justify-between items-start mb-2">
                                    <div>
                                        <h3 className="font-bold text-white text-lg flex items-center gap-2">
                                            {task.title}
                                            <a href={task.target_url} target="_blank" rel="noreferrer" className="text-blue-400 hover:text-white"><ExternalLink size={14}/></a>
                                        </h3>
                                        <p className="text-xs text-gray-400">Created by <span className="text-white font-bold">{task.creator_name}</span> ({task.creator_email})</p>
                                    </div>
                                    <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase ${task.status === 'active' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                                        {task.status}
                                    </span>
                                </div>

                                <div className="flex gap-4 text-xs text-gray-500 mb-4">
                                    <span className="flex items-center gap-1 bg-white/5 px-2 py-1 rounded"><Users size={12}/> {task.total_quantity} Spots</span>
                                    <span className="flex items-center gap-1 bg-white/5 px-2 py-1 rounded"><Eye size={12}/> {task.proof_type}</span>
                                    <span className="flex items-center gap-1 bg-white/5 px-2 py-1 rounded capitalize">{task.category}</span>
                                </div>

                                {/* PROGRESS BAR */}
                                <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden mb-1">
                                    <div className="h-full bg-purple-500 transition-all duration-1000" style={{ width: `${progress}%` }}></div>
                                </div>
                                <div className="flex justify-between text-[10px] text-gray-500">
                                    <span>Completed: {task.total_quantity - task.remaining_quantity}</span>
                                    <span>Remaining: {task.remaining_quantity}</span>
                                </div>
                            </div>

                            {/* MIDDLE: FINANCIAL BREAKDOWN */}
                            <div className="lg:w-1/3 bg-black/20 rounded-xl p-4 border border-white/5 flex flex-col justify-center">
                                <div className="grid grid-cols-3 gap-2 text-center mb-3">
                                    <div className="border-r border-white/10">
                                        <p className="text-[9px] text-gray-500 uppercase">Advertiser</p>
                                        <p className="text-sm font-bold text-white">${task.price_per_action}</p>
                                    </div>
                                    <div className="border-r border-white/10">
                                        <p className="text-[9px] text-gray-500 uppercase">User Earn</p>
                                        <p className="text-sm font-bold text-green-400">${task.worker_reward}</p>
                                    </div>
                                    <div>
                                        <p className="text-[9px] text-gray-500 uppercase">Admin Cut</p>
                                        <p className="text-sm font-bold text-yellow-400">+${profitPerAction.toFixed(3)}</p>
                                    </div>
                                </div>
                                <div className="text-center border-t border-white/10 pt-2">
                                    <p className="text-[10px] text-gray-500 uppercase font-bold">Total Campaign Value</p>
                                    <p className="text-xl font-black text-white"><BalanceDisplay amount={task.total_quantity * task.price_per_action} /></p>
                                    <p className="text-[10px] text-yellow-500 mt-1">Admin Total Profit: <BalanceDisplay amount={totalProfit} /></p>
                                </div>
                            </div>

                            {/* RIGHT: ACTIONS */}
                            <div className="flex flex-col gap-2 justify-center min-w-[120px]">
                                <button 
                                    onClick={() => handleToggleStatus(task)}
                                    className={`flex-1 py-3 rounded-xl text-xs font-bold border transition flex items-center justify-center gap-2 ${task.status === 'active' ? 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30 hover:bg-yellow-500/20' : 'bg-green-500/10 text-green-400 border-green-500/30 hover:bg-green-500/20'}`}
                                >
                                    {task.status === 'active' ? <><Pause size={14}/> Pause</> : <><Play size={14}/> Resume</>}
                                </button>
                                <button 
                                    onClick={() => handleDelete(task.id)}
                                    className="flex-1 py-3 bg-red-500/10 text-red-400 border border-red-500/30 hover:bg-red-500/20 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2"
                                >
                                    <Trash2 size={14}/> Delete
                                </button>
                            </div>

                        </div>
                    </GlassCard>
                )})
            )}
        </div>
    </div>
  );
};

export default TaskManagement;
