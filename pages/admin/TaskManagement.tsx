
import React, { useEffect, useState } from 'react';
import GlassCard from '../../components/GlassCard';
import { supabase } from '../../integrations/supabase/client';
import { MarketTask } from '../../types';
import { 
  Trash2, Pause, Play, Search, AlertCircle, DollarSign, 
  Users, TrendingUp, Briefcase, Eye, ExternalLink, Plus, Save, X, Globe
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
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [stats, setStats] = useState({
      totalTasks: 0,
      activeBudget: 0,
      totalActions: 0
  });

  // System Task Form
  const [newTask, setNewTask] = useState({
      title: '',
      description: '',
      url: '',
      quantity: 1000,
      reward: 0.02,
      category: 'social',
      proofType: 'auto',
      timer: 15
  });

  useEffect(() => {
    fetchTasks();
  }, []);

  const fetchTasks = async () => {
    setLoading(true);
    try {
        const { data: tasksData, error } = await supabase
            .from('marketplace_tasks')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;

        if (tasksData) {
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
                const profile: any = profileMap.get(t.creator_id) || {};
                return {
                    ...t,
                    creator_name: profile.name_1 || 'Unknown',
                    creator_email: profile.email_1 || 'System'
                };
            });

            setTasks(formattedTasks);
            
            // Calc stats
            const active = formattedTasks.filter(t => t.status === 'active');
            setStats({
                totalTasks: formattedTasks.length,
                activeBudget: active.reduce((sum, t) => sum + (t.remaining_quantity * t.price_per_action), 0),
                totalActions: active.reduce((sum, t) => sum + t.remaining_quantity, 0)
            });
        }
    } catch (e: any) {
        toast.error("Failed to load tasks");
    } finally {
        setLoading(false);
    }
  };

  const handleCreateSystemTask = async (e: React.FormEvent) => {
      e.preventDefault();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      try {
          // Insert directly into marketplace_tasks as a system task
          // System tasks have price_per_action = worker_reward (0 fee)
          // And we don't deduct balance from admin
          
          const { error } = await supabase.from('marketplace_tasks').insert({
              creator_id: session.user.id,
              title: newTask.title,
              description: newTask.description || "Official System Task",
              category: newTask.category,
              target_url: newTask.url,
              total_quantity: newTask.quantity,
              remaining_quantity: newTask.quantity,
              price_per_action: newTask.reward, // No fee markups
              worker_reward: newTask.reward,
              proof_type: newTask.proofType,
              timer_seconds: newTask.timer,
              status: 'active'
          });

          if (error) throw error;

          toast.success("System Task Created!");
          setIsCreateModalOpen(false);
          fetchTasks();
          
          // Reset form
          setNewTask({
              title: '', description: '', url: '', quantity: 1000, reward: 0.02, category: 'social', proofType: 'auto', timer: 15
          });

      } catch (e: any) {
          toast.error("Creation failed: " + e.message);
      }
  };

  const handleToggleStatus = async (task: ExtendedTask) => {
      const newStatus = task.status === 'active' ? 'paused' : 'active';
      const { error } = await supabase.from('marketplace_tasks').update({ status: newStatus }).eq('id', task.id);
      if (!error) {
          setTasks(prev => prev.map(t => t.id === task.id ? { ...t, status: newStatus as any } : t));
          toast.success(`Task ${newStatus}`);
      }
  };

  const handleDelete = async (id: string) => {
      if(!await confirm("Delete this task permanently?")) return;
      const { error } = await supabase.from('marketplace_tasks').delete().eq('id', id);
      if(!error) {
          setTasks(prev => prev.filter(t => t.id !== id));
          toast.success("Task deleted");
      }
  };

  const filteredTasks = tasks.filter(t => filter === 'all' || t.status === filter);

  if (loading) return <div className="p-10"><Loader /></div>;

  return (
    <div className="space-y-6 animate-fade-in relative pb-20">
        
        {/* HEADER STATS */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <GlassCard className="p-4 bg-blue-900/20 border-blue-500/30">
                <p className="text-blue-300 text-xs font-bold uppercase mb-1">Total Tasks</p>
                <h3 className="text-2xl font-black text-white">{stats.totalTasks}</h3>
            </GlassCard>
            <GlassCard className="p-4 bg-green-900/20 border-green-500/30">
                <p className="text-green-300 text-xs font-bold uppercase mb-1">Active Rewards</p>
                <h3 className="text-2xl font-black text-white"><BalanceDisplay amount={stats.activeBudget} /></h3>
            </GlassCard>
            <GlassCard className="p-4 bg-purple-900/20 border-purple-500/30">
                <p className="text-purple-300 text-xs font-bold uppercase mb-1">Pending Actions</p>
                <h3 className="text-2xl font-black text-white">{stats.totalActions}</h3>
            </GlassCard>
        </div>

        {/* CONTROLS */}
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex gap-2">
                {['all', 'active', 'paused'].map(f => (
                    <button 
                        key={f}
                        onClick={() => setFilter(f)}
                        className={`px-4 py-2 rounded-lg text-xs font-bold uppercase transition ${filter === f ? 'bg-white text-black' : 'bg-white/5 text-gray-400'}`}
                    >
                        {f}
                    </button>
                ))}
            </div>
            
            <button 
                onClick={() => setIsCreateModalOpen(true)}
                className="bg-neon-green text-black px-6 py-2 rounded-xl font-bold flex items-center gap-2 hover:bg-emerald-400 shadow-lg shadow-neon-green/20"
            >
                <Plus size={18} /> System Task
            </button>
        </div>

        {/* TASKS LIST */}
        <div className="space-y-4">
            {filteredTasks.length === 0 ? (
                <div className="text-center py-20 text-gray-500">No tasks found.</div>
            ) : (
                filteredTasks.map(task => (
                    <GlassCard key={task.id} className="relative overflow-hidden group">
                        <div className="flex flex-col lg:flex-row gap-6 items-center">
                            
                            {/* LEFT: INFO */}
                            <div className="flex-1 w-full">
                                <div className="flex justify-between items-start mb-2">
                                    <div>
                                        <h3 className="font-bold text-white text-lg flex items-center gap-2">
                                            {task.title}
                                            <a href={task.target_url} target="_blank" rel="noreferrer" className="text-blue-400 hover:text-white"><ExternalLink size={14}/></a>
                                        </h3>
                                        <p className="text-xs text-gray-400">Created by <span className="text-white font-bold">{task.creator_name}</span></p>
                                    </div>
                                    <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase ${task.status === 'active' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                                        {task.status}
                                    </span>
                                </div>

                                <div className="flex gap-4 text-xs text-gray-500">
                                    <span className="bg-white/5 px-2 py-1 rounded">Reward: <span className="text-neon-green font-bold">${task.worker_reward}</span></span>
                                    <span className="bg-white/5 px-2 py-1 rounded">Remaining: {task.remaining_quantity}/{task.total_quantity}</span>
                                    <span className="bg-white/5 px-2 py-1 rounded capitalize">{task.category}</span>
                                    <span className="bg-white/5 px-2 py-1 rounded capitalize">{task.proof_type}</span>
                                </div>
                            </div>

                            {/* RIGHT: ACTIONS */}
                            <div className="flex gap-2 min-w-[140px]">
                                <button 
                                    onClick={() => handleToggleStatus(task)}
                                    className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-white"
                                    title={task.status === 'active' ? 'Pause' : 'Resume'}
                                >
                                    {task.status === 'active' ? <Pause size={18}/> : <Play size={18}/>}
                                </button>
                                <button 
                                    onClick={() => handleDelete(task.id)}
                                    className="p-2 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400"
                                    title="Delete"
                                >
                                    <Trash2 size={18}/>
                                </button>
                            </div>

                        </div>
                    </GlassCard>
                ))
            )}
        </div>

        {/* CREATE MODAL */}
        <AnimatePresence>
            {isCreateModalOpen && (
                <motion.div 
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
                >
                    <motion.div 
                        initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }}
                        className="bg-dark-900 w-full max-w-lg rounded-2xl border border-white/10 p-6 max-h-[90vh] overflow-y-auto"
                    >
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-bold text-white">Create System Task</h3>
                            <button onClick={() => setIsCreateModalOpen(false)} className="text-gray-500 hover:text-white"><X size={24}/></button>
                        </div>

                        <form onSubmit={handleCreateSystemTask} className="space-y-4">
                            <div>
                                <label className="text-xs font-bold text-gray-400 mb-1 block">Title</label>
                                <input required type="text" value={newTask.title} onChange={e => setNewTask({...newTask, title: e.target.value})} className="w-full bg-black/40 border border-white/10 rounded-lg p-3 text-white focus:border-neon-green outline-none" placeholder="Join Official Channel" />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-gray-400 mb-1 block">URL</label>
                                <input required type="url" value={newTask.url} onChange={e => setNewTask({...newTask, url: e.target.value})} className="w-full bg-black/40 border border-white/10 rounded-lg p-3 text-white focus:border-neon-green outline-none" placeholder="https://t.me/..." />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-xs font-bold text-gray-400 mb-1 block">Reward ($)</label>
                                    <input required type="number" step="0.001" value={newTask.reward} onChange={e => setNewTask({...newTask, reward: parseFloat(e.target.value)})} className="w-full bg-black/40 border border-white/10 rounded-lg p-3 text-white focus:border-neon-green outline-none" />
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-gray-400 mb-1 block">Quantity</label>
                                    <input required type="number" value={newTask.quantity} onChange={e => setNewTask({...newTask, quantity: parseInt(e.target.value)})} className="w-full bg-black/40 border border-white/10 rounded-lg p-3 text-white focus:border-neon-green outline-none" />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-xs font-bold text-gray-400 mb-1 block">Category</label>
                                    <select value={newTask.category} onChange={e => setNewTask({...newTask, category: e.target.value})} className="w-full bg-black/40 border border-white/10 rounded-lg p-3 text-white focus:border-neon-green outline-none">
                                        <option value="social">Social</option>
                                        <option value="video">Video</option>
                                        <option value="app">App</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-gray-400 mb-1 block">Proof Type</label>
                                    <select value={newTask.proofType} onChange={e => setNewTask({...newTask, proofType: e.target.value as any})} className="w-full bg-black/40 border border-white/10 rounded-lg p-3 text-white focus:border-neon-green outline-none">
                                        <option value="auto">Auto (Timer)</option>
                                        <option value="screenshot">Screenshot</option>
                                        <option value="text">Text Code</option>
                                    </select>
                                </div>
                            </div>
                            <div>
                                <label className="text-xs font-bold text-gray-400 mb-1 block">Description</label>
                                <textarea value={newTask.description} onChange={e => setNewTask({...newTask, description: e.target.value})} className="w-full bg-black/40 border border-white/10 rounded-lg p-3 text-white focus:border-neon-green outline-none h-20 resize-none" />
                            </div>

                            <button type="submit" className="w-full py-3 bg-neon-green text-black font-bold rounded-xl hover:bg-emerald-400 transition flex items-center justify-center gap-2 mt-4">
                                <Plus size={18} /> Publish System Task
                            </button>
                        </form>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    </div>
  );
};

export default TaskManagement;
