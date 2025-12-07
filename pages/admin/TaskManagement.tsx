
import React, { useEffect, useState } from 'react';
import GlassCard from '../../components/GlassCard';
import { supabase } from '../../integrations/supabase/client';
import { MarketTask, TaskRequirement } from '../../types';
import { 
  Trash2, Pause, Play, Search, AlertCircle, DollarSign, 
  Users, Briefcase, ExternalLink, Plus, X, 
  Clock, LayoutGrid, List, Activity,
  Megaphone, MousePointerClick, BarChart3,
  Share2, Youtube, Smartphone, Globe, Star, Image, FileText, Code, CheckCircle
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
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState('all');

  useEffect(() => {
      fetchTasks();
  }, []);

  const fetchTasks = async () => {
      setLoading(true);
      
      const { data: tasksData } = await supabase.from('marketplace_tasks').select('*').order('created_at', {ascending: false});
      
      if (tasksData) {
          // Get creator names
          const userIds = Array.from(new Set(tasksData.map((t: any) => t.creator_id)));
          const { data: users } = await supabase.from('profiles').select('id, name_1, email_1').in('id', userIds);
          
          const userMap = new Map<string, any>(users?.map((u: any) => [u.id, u]) || []);
          
          const enriched = tasksData.map((t: any) => ({
              ...t,
              creator_name: userMap.get(t.creator_id)?.name_1 || 'Unknown',
              creator_email: userMap.get(t.creator_id)?.email_1
          }));
          
          setTasks(enriched);
      }
      setLoading(false);
  };

  const handleToggleStatus = async (task: ExtendedTask) => {
      const newStatus = task.status === 'active' ? 'paused' : 'active';
      const { error } = await supabase.from('marketplace_tasks').update({ status: newStatus }).eq('id', task.id);
      
      if (!error) {
          setTasks(prev => prev.map(t => t.id === task.id ? { ...t, status: newStatus as any } : t));
          toast.success(`Task ${newStatus}`);
      } else {
          toast.error(error.message);
      }
  };

  const handleDelete = async (id: string) => {
      if(!await confirm("Delete this task?")) return;
      
      const { error } = await supabase.from('marketplace_tasks').delete().eq('id', id);
      if (!error) {
          setTasks(prev => prev.filter(t => t.id !== id));
          toast.success("Task deleted");
      } else {
          toast.error(error.message);
      }
  };

  const filteredTasks = tasks.filter(t => {
      const matchesSearch = t.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                            t.creator_name?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesFilter = filter === 'all' || t.status === filter;
      return matchesSearch && matchesFilter;
  });

  if (loading) return <div className="p-10"><Loader /></div>;

  return (
    <div className="space-y-6 animate-fade-in pb-20">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
            <div>
                <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                    <CheckCircle className="text-yellow-400" /> Task Coordination
                </h2>
                <p className="text-gray-400 text-sm">Manage marketplace tasks and approvals.</p>
            </div>
            
            <div className="relative w-full md:w-auto">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={16}/>
                <input 
                    type="text" 
                    placeholder="Search task or creator..." 
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-2 text-sm text-white focus:border-yellow-500 outline-none"
                />
            </div>
        </div>

        <div className="flex gap-2 border-b border-white/10 overflow-x-auto no-scrollbar">
            {['all', 'active', 'paused', 'completed'].map(f => (
                <button
                    key={f}
                    onClick={() => setFilter(f)}
                    className={`px-4 py-2 text-sm font-bold capitalize transition border-b-2 ${filter === f ? 'text-white border-yellow-500' : 'text-gray-500 border-transparent hover:text-gray-300'}`}
                >
                    {f}
                </button>
            ))}
        </div>

        <div className="grid grid-cols-1 gap-4">
            {filteredTasks.map(task => {
                const progress = ((task.total_quantity - task.remaining_quantity) / task.total_quantity) * 100;
                
                return (
                    <GlassCard key={task.id} className="border border-white/10 hover:border-yellow-500/20 transition group">
                        <div className="flex flex-col md:flex-row gap-4 items-start">
                            
                            {/* Icon */}
                            <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center shrink-0 border border-white/5">
                                {task.category === 'video' ? <Youtube className="text-red-500"/> : 
                                 task.category === 'social' ? <Share2 className="text-blue-500"/> :
                                 task.category === 'app' ? <Smartphone className="text-purple-500"/> :
                                 <Globe className="text-green-500"/>}
                            </div>

                            {/* Content */}
                            <div className="flex-1 w-full">
                                <div className="flex justify-between items-start mb-2">
                                    <div>
                                        <h3 className="font-bold text-white text-base line-clamp-1">{task.title}</h3>
                                        <p className="text-xs text-gray-400 mt-0.5">By {task.creator_name} • {task.creator_email}</p>
                                    </div>
                                    <div className={`px-2 py-1 rounded text-[10px] uppercase font-bold ${task.status === 'active' ? 'bg-green-500/10 text-green-400' : 'bg-white/10 text-gray-400'}`}>
                                        {task.status}
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 bg-black/30 p-3 rounded-lg border border-white/5 mb-3">
                                    <div>
                                        <p className="text-[9px] text-gray-500 uppercase font-bold">Reward</p>
                                        <p className="text-white font-mono text-sm">${task.worker_reward}</p>
                                    </div>
                                    <div>
                                        <p className="text-[9px] text-gray-500 uppercase font-bold">Budget</p>
                                        <p className="text-white font-mono text-sm">${(task.total_quantity * task.price_per_action).toFixed(2)}</p>
                                    </div>
                                    <div>
                                        <p className="text-[9px] text-gray-500 uppercase font-bold">Completion</p>
                                        <p className="text-white font-mono text-sm">{Math.round(progress)}%</p>
                                    </div>
                                    <div>
                                        <p className="text-[9px] text-gray-500 uppercase font-bold">Remaining</p>
                                        <p className="text-white font-mono text-sm">{task.remaining_quantity} / {task.total_quantity}</p>
                                    </div>
                                </div>

                                <div className="flex gap-2 justify-end">
                                    <button 
                                        onClick={() => handleToggleStatus(task)}
                                        className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition flex items-center gap-1 ${task.status === 'active' ? 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30' : 'bg-green-500/10 text-green-400 border-green-500/30'}`}
                                    >
                                        {task.status === 'active' ? <Pause size={12}/> : <Play size={12}/>} 
                                        {task.status === 'active' ? 'Pause' : 'Activate'}
                                    </button>
                                    <button 
                                        onClick={() => handleDelete(task.id)}
                                        className="px-3 py-1.5 bg-red-500/10 text-red-400 border border-red-500/30 rounded-lg text-xs font-bold hover:bg-red-500/20 transition flex items-center gap-1"
                                    >
                                        <Trash2 size={12}/> Delete
                                    </button>
                                </div>
                            </div>
                        </div>
                    </GlassCard>
                );
            })}
            
            {filteredTasks.length === 0 && (
                <div className="text-center py-12 bg-white/5 rounded-xl border border-white/5 text-gray-500">
                    No tasks found.
                </div>
            )}
        </div>
    </div>
  );
};

export default TaskManagement;
