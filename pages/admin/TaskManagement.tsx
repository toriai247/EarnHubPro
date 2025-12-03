
import React, { useEffect, useState } from 'react';
import GlassCard from '../../components/GlassCard';
import { supabase } from '../../integrations/supabase/client';
import { MarketTask, TaskRequirement } from '../../types';
import { 
  Trash2, Pause, Play, Search, AlertCircle, DollarSign, 
  Users, Briefcase, ExternalLink, Plus, X, 
  Clock, LayoutGrid, List, Activity,
  Megaphone, MousePointerClick, BarChart3,
  Share2, Youtube, Smartphone, Globe, Star, Image, FileText, Code
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import BalanceDisplay from '../../components/BalanceDisplay';
import Loader from '../../components/Loader';
import { useUI } from '../../context/UIContext';

interface ExtendedTask extends MarketTask {
    creator_name?: string;
    creator_email?: string;
}

const CATEGORY_TEMPLATES: Record<string, TaskRequirement[]> = {
    video: [
        { id: 'start_ss', type: 'image', label: 'Start Screenshot (0:00)', required: true },
        { id: 'end_ss', type: 'image', label: 'End Screenshot (Finished)', required: true },
        { id: 'topic_q', type: 'text', label: 'What was the video about?', required: true }
    ],
    seo: [
        { id: 'history_ss', type: 'image', label: 'Screenshot of Browser History', required: true },
        { id: 'last_para', type: 'text', label: 'Last paragraph of the article?', required: true },
        { id: 'ad_url', type: 'text', label: 'URL of the ad you clicked', required: true }
    ],
    app: [
        { id: 'install_ss', type: 'image', label: 'Screenshot of App on Home Screen', required: true },
        { id: 'color_q', type: 'text', label: 'What is the color of the "Sign Up" button?', required: true }
    ],
    social: [
        { id: 'action_ss', type: 'image', label: 'Screenshot of Like/Follow', required: true },
        { id: 'username', type: 'text', label: 'Your Username', required: true }
    ],
    review: [
        { id: 'review_ss', type: 'image', label: 'Screenshot of Posted Review', required: true },
        { id: 'review_text', type: 'text', label: 'Copy paste your review text here', required: true }
    ]
};

const TaskManagement: React.FC = () => {
  const { toast, confirm } = useUI();
  const [tasks, setTasks] = useState<ExtendedTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [stats, setStats] = useState({
      totalTasks: 0,
      activeCount: 0,
      totalBudget: 0,
      totalActions: 0
  });

  // System Task Form
  const [newTask, setNewTask] = useState<{
      title: string;
      description: string;
      url: string;
      quantity: number;
      reward: number;
      category: string;
      proofType: 'auto' | 'complex'; // Changed to complex default for new tasks
      timer: number;
      requirements: TaskRequirement[];
  }>({
      title: '',
      description: '',
      url: '',
      quantity: 1000,
      reward: 0.02,
      category: 'social',
      proofType: 'complex',
      timer: 15,
      requirements: CATEGORY_TEMPLATES['social']
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
                activeCount: active.length,
                totalBudget: formattedTasks.reduce((sum, t) => sum + (t.remaining_quantity * t.price_per_action), 0),
                totalActions: formattedTasks.reduce((sum, t) => sum + t.remaining_quantity, 0)
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
          const { error } = await supabase.from('marketplace_tasks').insert({
              creator_id: session.user.id,
              title: newTask.title,
              description: newTask.description || "Official System Task",
              category: newTask.category,
              target_url: newTask.url,
              total_quantity: newTask.quantity,
              remaining_quantity: newTask.quantity,
              price_per_action: newTask.reward, 
              worker_reward: newTask.reward,
              proof_type: newTask.proofType,
              requirements: newTask.requirements, // Structured Data
              timer_seconds: newTask.timer,
              status: 'active'
          });

          if (error) throw error;

          toast.success("System Task Created!");
          setIsCreateModalOpen(false);
          fetchTasks();
          // Reset
          setNewTask({ 
              title: '', description: '', url: '', quantity: 1000, reward: 0.02, 
              category: 'social', proofType: 'complex', timer: 15, 
              requirements: CATEGORY_TEMPLATES['social'] 
          });

      } catch (e: any) {
          if (e.message?.includes('marketplace_tasks_proof_type_check')) {
             toast.error("Database Update Required: Go to 'Database Ultra > System Tools' and run the Task Upgrade script.");
          } else {
             toast.error("Creation failed: " + e.message);
          }
      }
  };

  const handleCategoryChange = (cat: string) => {
      setNewTask({
          ...newTask,
          category: cat,
          requirements: CATEGORY_TEMPLATES[cat] || []
      });
  };

  const addRequirement = (type: 'text' | 'image') => {
      const newReq: TaskRequirement = {
          id: `custom_${Date.now()}`,
          type,
          label: type === 'text' ? 'New Question' : 'Upload Screenshot',
          required: true
      };
      setNewTask(prev => ({
          ...prev,
          requirements: [...prev.requirements, newReq]
      }));
  };

  const removeRequirement = (id: string) => {
      setNewTask(prev => ({
          ...prev,
          requirements: prev.requirements.filter(r => r.id !== id)
      }));
  };

  const updateRequirementLabel = (id: string, label: string) => {
      setNewTask(prev => ({
          ...prev,
          requirements: prev.requirements.map(r => r.id === id ? { ...r, label } : r)
      }));
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

  const filteredTasks = tasks.filter(t => {
      const matchesFilter = filter === 'all' || t.status === filter;
      const matchesSearch = t.title.toLowerCase().includes(search.toLowerCase()) || t.creator_email?.toLowerCase().includes(search.toLowerCase());
      return matchesFilter && matchesSearch;
  });

  const getCategoryIcon = (category: string) => {
      switch(category) {
          case 'social': return <Share2 size={18} />;
          case 'video': return <Youtube size={18} />;
          case 'app': return <Smartphone size={18} />;
          case 'website': return <Globe size={18} />;
          case 'review': return <Star size={18} />;
          default: return <Briefcase size={18} />;
      }
  };

  if (loading) return <div className="p-10"><Loader /></div>;

  return (
    <div className="space-y-8 animate-fade-in pb-32">
        
        {/* HEADER SECTION */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
                <h1 className="text-3xl font-display font-black text-white flex items-center gap-3">
                    <Briefcase className="text-electric-500" size={32} /> TASK COMMAND
                </h1>
                <p className="text-gray-400 text-sm mt-1">Manage global campaigns and micro-tasks.</p>
            </div>
            
            <button 
                onClick={() => setIsCreateModalOpen(true)}
                className="bg-neon-green text-black px-6 py-3 rounded-xl font-bold flex items-center gap-2 hover:bg-emerald-400 shadow-lg shadow-neon-green/20 transition group"
            >
                <Plus size={20} className="group-hover:rotate-90 transition-transform"/> New System Task
            </button>
        </div>

        {/* STATS OVERVIEW */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <GlassCard className="p-5 border-l-4 border-l-blue-500 bg-blue-900/10 flex items-center justify-between group hover:bg-blue-900/20 transition">
                <div>
                    <p className="text-blue-300 text-[10px] font-bold uppercase tracking-widest">Total Campaigns</p>
                    <h3 className="text-3xl font-black text-white mt-1 group-hover:scale-105 transition-transform origin-left">{stats.totalTasks}</h3>
                </div>
                <div className="p-3 bg-blue-500/20 rounded-xl text-blue-400"><Megaphone size={24}/></div>
            </GlassCard>
            
            <GlassCard className="p-5 border-l-4 border-l-green-500 bg-green-900/10 flex items-center justify-between group hover:bg-green-900/20 transition">
                <div>
                    <p className="text-green-300 text-[10px] font-bold uppercase tracking-widest">Active Now</p>
                    <h3 className="text-3xl font-black text-white mt-1 group-hover:scale-105 transition-transform origin-left">{stats.activeCount}</h3>
                </div>
                <div className="p-3 bg-green-500/20 rounded-xl text-green-400"><Activity size={24}/></div>
            </GlassCard>

            <GlassCard className="p-5 border-l-4 border-l-purple-500 bg-purple-900/10 flex items-center justify-between group hover:bg-purple-900/20 transition">
                <div>
                    <p className="text-purple-300 text-[10px] font-bold uppercase tracking-widest">Budget Volume</p>
                    <h3 className="text-3xl font-black text-white mt-1 group-hover:scale-105 transition-transform origin-left"><BalanceDisplay amount={stats.totalBudget} compact/></h3>
                </div>
                <div className="p-3 bg-purple-500/20 rounded-xl text-purple-400"><DollarSign size={24}/></div>
            </GlassCard>

            <GlassCard className="p-5 border-l-4 border-l-yellow-500 bg-yellow-900/10 flex items-center justify-between group hover:bg-yellow-900/20 transition">
                <div>
                    <p className="text-yellow-300 text-[10px] font-bold uppercase tracking-widest">Pending Actions</p>
                    <h3 className="text-3xl font-black text-white mt-1 group-hover:scale-105 transition-transform origin-left">{stats.totalActions.toLocaleString()}</h3>
                </div>
                <div className="p-3 bg-yellow-500/20 rounded-xl text-yellow-400"><MousePointerClick size={24}/></div>
            </GlassCard>
        </div>

        {/* TOOLBAR */}
        <div className="sticky top-4 z-30 bg-dark-900/90 backdrop-blur-xl border border-white/10 p-3 rounded-2xl flex flex-col md:flex-row justify-between items-center gap-4 shadow-2xl">
            <div className="relative w-full md:w-96 group">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-electric-500 transition-colors" size={18}/>
                <input 
                    type="text" 
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    placeholder="Search tasks by title, user..." 
                    className="w-full bg-black/40 border border-white/10 rounded-xl pl-12 pr-4 py-3 text-sm text-white focus:border-electric-500 outline-none transition"
                />
            </div>

            <div className="flex items-center gap-3 w-full md:w-auto overflow-x-auto no-scrollbar">
                <div className="flex bg-black/40 p-1 rounded-xl border border-white/10">
                    {['all', 'active', 'paused'].map(f => (
                        <button 
                            key={f}
                            onClick={() => setFilter(f)}
                            className={`px-4 py-2 rounded-lg text-xs font-bold uppercase transition ${filter === f ? 'bg-white text-black shadow-sm' : 'text-gray-500 hover:text-white'}`}
                        >
                            {f}
                        </button>
                    ))}
                </div>
                
                <div className="h-8 w-px bg-white/10 mx-1"></div>

                <div className="flex bg-black/40 p-1 rounded-xl border border-white/10">
                    <button onClick={() => setViewMode('grid')} className={`p-2 rounded-lg transition ${viewMode === 'grid' ? 'bg-white/10 text-white' : 'text-gray-500 hover:text-white'}`}><LayoutGrid size={18}/></button>
                    <button onClick={() => setViewMode('list')} className={`p-2 rounded-lg transition ${viewMode === 'list' ? 'bg-white/10 text-white' : 'text-gray-500 hover:text-white'}`}><List size={18}/></button>
                </div>
            </div>
        </div>

        {/* TASKS VIEW */}
        <AnimatePresence mode="popLayout">
            {filteredTasks.length === 0 ? (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center justify-center py-24 text-gray-500">
                    <div className="w-24 h-24 bg-white/5 rounded-full flex items-center justify-center mb-4">
                        <AlertCircle size={40} className="opacity-20" />
                    </div>
                    <p className="font-bold">No tasks found.</p>
                    <p className="text-xs mt-1">Try adjusting your filters.</p>
                </motion.div>
            ) : (
                <motion.div 
                    layout
                    className={`grid gap-4 ${viewMode === 'grid' ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4' : 'grid-cols-1'}`}
                >
                    {filteredTasks.map((task) => {
                        const percent = ((task.total_quantity - task.remaining_quantity) / task.total_quantity) * 100;
                        const isSystem = task.creator_email === 'System';
                        
                        return (
                            <motion.div
                                layout
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.9 }}
                                key={task.id}
                            >
                                <GlassCard className={`relative overflow-hidden group h-full flex flex-col p-0 border ${task.status === 'active' ? 'border-white/10' : 'border-red-500/20 bg-red-900/5'}`}>
                                    {/* Status Bar */}
                                    <div className={`h-1 w-full ${task.status === 'active' ? 'bg-green-500' : 'bg-red-500'}`}></div>
                                    
                                    <div className="p-5 flex-1 flex flex-col">
                                        <div className="flex justify-between items-start mb-4">
                                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-lg ${isSystem ? 'bg-purple-600' : 'bg-blue-600'}`}>
                                                {getCategoryIcon(task.category)}
                                            </div>
                                            <div className="text-right">
                                                <div className="flex flex-col items-end">
                                                    <span className="text-neon-green font-black font-mono text-lg leading-none">
                                                        <BalanceDisplay amount={task.worker_reward} decimals={3}/>
                                                    </span>
                                                    <span className="text-[9px] text-gray-500 font-bold uppercase mt-1">Reward</span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="mb-4">
                                            <h3 className="font-bold text-white text-sm line-clamp-1 mb-1 group-hover:text-electric-400 transition-colors">{task.title}</h3>
                                            <div className="flex items-center gap-2 text-[10px] text-gray-400">
                                                {isSystem && <span className="bg-purple-500/20 text-purple-300 px-1.5 py-0.5 rounded font-bold uppercase border border-purple-500/30">System</span>}
                                                <span className="bg-white/5 px-1.5 py-0.5 rounded uppercase">{task.proof_type}</span>
                                                <span>•</span>
                                                <span>{task.timer_seconds}s Timer</span>
                                            </div>
                                        </div>

                                        <div className="mt-auto space-y-3">
                                            {/* Progress */}
                                            <div>
                                                <div className="flex justify-between text-[10px] text-gray-400 mb-1 font-bold uppercase">
                                                    <span>Completion</span>
                                                    <span>{Math.round(percent)}%</span>
                                                </div>
                                                <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                                                    <div className={`h-full rounded-full ${task.status === 'active' ? 'bg-electric-500' : 'bg-gray-500'}`} style={{ width: `${percent}%` }}></div>
                                                </div>
                                                <div className="flex justify-between text-[9px] text-gray-500 mt-1">
                                                    <span>{task.total_quantity - task.remaining_quantity} Done</span>
                                                    <span>{task.remaining_quantity} Left</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Action Footer */}
                                    <div className="bg-black/20 p-3 border-t border-white/5 flex items-center justify-between gap-2">
                                        <div className="flex items-center gap-2">
                                            <div className="w-6 h-6 rounded-full bg-gradient-to-br from-gray-700 to-gray-800 flex items-center justify-center text-[10px] text-white font-bold border border-white/10">
                                                {task.creator_name?.charAt(0)}
                                            </div>
                                            <span className="text-[10px] text-gray-400 truncate max-w-[80px]">{task.creator_name}</span>
                                        </div>
                                        
                                        <div className="flex gap-1">
                                            <a href={task.target_url} target="_blank" className="p-2 hover:bg-white/10 rounded-lg text-gray-400 hover:text-blue-400 transition" title="Visit Link">
                                                <ExternalLink size={14}/>
                                            </a>
                                            <button onClick={() => handleToggleStatus(task)} className={`p-2 rounded-lg transition ${task.status === 'active' ? 'hover:bg-yellow-500/10 text-gray-400 hover:text-yellow-400' : 'hover:bg-green-500/10 text-red-400 hover:text-green-400'}`} title={task.status === 'active' ? 'Pause' : 'Resume'}>
                                                {task.status === 'active' ? <Pause size={14}/> : <Play size={14}/>}
                                            </button>
                                            <button onClick={() => handleDelete(task.id)} className="p-2 hover:bg-red-500/10 rounded-lg text-gray-400 hover:text-red-400 transition" title="Delete">
                                                <Trash2 size={14}/>
                                            </button>
                                        </div>
                                    </div>
                                </GlassCard>
                            </motion.div>
                        );
                    })}
                </motion.div>
            )}
        </AnimatePresence>

        {/* CREATE SYSTEM TASK MODAL */}
        <AnimatePresence>
            {isCreateModalOpen && (
                <motion.div 
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4"
                >
                    <motion.div 
                        initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}
                        className="bg-dark-900 w-full max-w-3xl rounded-2xl border border-white/10 p-6 shadow-2xl max-h-[90vh] overflow-y-auto custom-scrollbar relative"
                    >
                        <button onClick={() => setIsCreateModalOpen(false)} className="absolute top-4 right-4 text-gray-500 hover:text-white transition"><X size={24}/></button>
                        
                        <div className="mb-6">
                            <h3 className="text-xl font-bold text-white flex items-center gap-2">
                                <Plus className="text-neon-green" size={20}/> New Task Campaign
                            </h3>
                            <p className="text-gray-400 text-xs mt-1">Create advanced verification tasks for users.</p>
                        </div>

                        <form onSubmit={handleCreateSystemTask} className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-4">
                                    <div>
                                        <label className="text-xs font-bold text-gray-400 mb-1 block uppercase">Title</label>
                                        <input required type="text" value={newTask.title} onChange={e => setNewTask({...newTask, title: e.target.value})} className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white focus:border-neon-green outline-none transition" placeholder="e.g. Join Official Channel" />
                                    </div>
                                    <div>
                                        <label className="text-xs font-bold text-gray-400 mb-1 block uppercase">URL</label>
                                        <input required type="url" value={newTask.url} onChange={e => setNewTask({...newTask, url: e.target.value})} className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white focus:border-neon-green outline-none transition" placeholder="https://..." />
                                    </div>
                                    <div>
                                        <label className="text-xs font-bold text-gray-400 mb-2 block uppercase">Category (Auto-sets Requirements)</label>
                                        <div className="grid grid-cols-3 gap-2">
                                            {['social', 'video', 'app', 'website', 'seo', 'review'].map(c => (
                                                <button 
                                                    type="button"
                                                    key={c}
                                                    onClick={() => handleCategoryChange(c)}
                                                    className={`px-2 py-2 rounded-lg text-xs font-bold capitalize border transition ${newTask.category === c ? 'bg-white/10 border-white text-white' : 'bg-black/20 border-white/5 text-gray-500 hover:bg-white/5'}`}
                                                >
                                                    {c}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="text-xs font-bold text-gray-400 mb-1 block uppercase">Reward ($)</label>
                                            <input required type="number" step="0.001" value={newTask.reward} onChange={e => setNewTask({...newTask, reward: parseFloat(e.target.value)})} className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white focus:border-neon-green outline-none" />
                                        </div>
                                        <div>
                                            <label className="text-xs font-bold text-gray-400 mb-1 block uppercase">Qty</label>
                                            <input required type="number" value={newTask.quantity} onChange={e => setNewTask({...newTask, quantity: parseInt(e.target.value)})} className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white focus:border-neon-green outline-none" />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="text-xs font-bold text-gray-400 mb-1 block uppercase">Timer (s)</label>
                                        <input required type="number" value={newTask.timer} onChange={e => setNewTask({...newTask, timer: parseInt(e.target.value)})} className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white focus:border-neon-green outline-none" />
                                    </div>
                                    
                                    <div className="bg-blue-900/20 p-3 rounded-xl border border-blue-500/20">
                                        <div className="flex justify-between text-xs text-blue-300 font-bold uppercase">
                                            <span>Total Budget</span>
                                            <span>${(newTask.reward * newTask.quantity).toFixed(2)}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="border-t border-white/10 pt-4">
                                <div className="flex justify-between items-center mb-3">
                                    <label className="text-sm font-bold text-white uppercase flex items-center gap-2"><List size={16}/> Verification Requirements</label>
                                    <div className="flex gap-2">
                                        <button type="button" onClick={() => addRequirement('text')} className="text-xs bg-white/5 hover:bg-white/10 px-3 py-1.5 rounded text-white border border-white/10 flex items-center gap-1"><Plus size={12}/> Question</button>
                                        <button type="button" onClick={() => addRequirement('image')} className="text-xs bg-white/5 hover:bg-white/10 px-3 py-1.5 rounded text-white border border-white/10 flex items-center gap-1"><Plus size={12}/> Screenshot</button>
                                    </div>
                                </div>
                                
                                <div className="space-y-2 max-h-48 overflow-y-auto custom-scrollbar bg-black/20 p-2 rounded-xl border border-white/5">
                                    {newTask.requirements.map((req, idx) => (
                                        <div key={req.id} className="flex items-center gap-2 p-2 bg-white/5 rounded-lg border border-white/5">
                                            <div className="p-2 bg-black/40 rounded text-gray-400">
                                                {req.type === 'image' ? <Image size={16}/> : <FileText size={16}/>}
                                            </div>
                                            <input 
                                                type="text" 
                                                value={req.label} 
                                                onChange={(e) => updateRequirementLabel(req.id, e.target.value)}
                                                className="flex-1 bg-transparent text-sm text-white focus:outline-none placeholder-gray-600"
                                                placeholder="Requirement description..."
                                            />
                                            <button type="button" onClick={() => removeRequirement(req.id)} className="text-red-400 hover:text-red-300 p-1"><X size={16}/></button>
                                        </div>
                                    ))}
                                    {newTask.requirements.length === 0 && <p className="text-center text-xs text-gray-500 py-4">No requirements added. Auto-timer only.</p>}
                                </div>
                            </div>

                            <div>
                                <label className="text-xs font-bold text-gray-400 mb-1 block uppercase">Description</label>
                                <textarea value={newTask.description} onChange={e => setNewTask({...newTask, description: e.target.value})} className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white focus:border-neon-green outline-none h-24 resize-none text-sm" placeholder="Detailed instructions..." />
                            </div>

                            <button type="submit" className="w-full py-4 bg-neon-green text-black font-black rounded-xl hover:bg-emerald-400 transition flex items-center justify-center gap-2 shadow-lg shadow-neon-green/20 uppercase tracking-wide">
                                <Plus size={20} /> Publish Campaign
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
