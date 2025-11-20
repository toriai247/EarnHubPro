
import React, { useEffect, useState } from 'react';
import GlassCard from '../../components/GlassCard';
import { supabase } from '../../integrations/supabase/client';
import { Task } from '../../types';
import { Edit, Trash2, Plus, Save, X, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const TaskManagement: React.FC = () => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  
  const initialFormState = {
      title: '',
      description: '',
      reward: '0.50',
      sponsor_rate: '1.00', // New field
      url: '',
      type: 'website',
      difficulty: 'Easy',
      frequency: 'once',
      icon: 'star'
  };
  
  const [formData, setFormData] = useState<any>(initialFormState);
  const [editingId, setEditingId] = useState<string | null>(null);

  useEffect(() => {
    fetchTasks();
  }, []);

  const fetchTasks = async () => {
    setLoading(true);
    const { data } = await supabase.from('tasks').select('*').order('created_at', { ascending: false });
    if (data) setTasks(data as any);
    setLoading(false);
  };

  const handleEdit = (task: Task) => {
      setFormData({
          title: task.title,
          description: task.description || '',
          reward: task.reward.toString(),
          sponsor_rate: (task.sponsor_rate || (task.reward + 0.5)).toString(),
          url: task.url || '',
          type: task.type,
          difficulty: task.difficulty,
          frequency: task.frequency,
          icon: task.icon || 'star'
      });
      setEditingId(task.id);
      setIsEditing(true);
  };

  const handleDelete = async (id: string) => {
      if(!confirm("Are you sure you want to delete this task?")) return;
      
      const { error } = await supabase.from('tasks').delete().eq('id', id);
      if(error) {
          alert("Error deleting task: " + error.message);
      } else {
          setTasks(prev => prev.filter(t => t.id !== id));
      }
  };

  const handleSave = async (e: React.FormEvent) => {
      e.preventDefault();
      
      const payload = {
          ...formData,
          reward: parseFloat(formData.reward),
          sponsor_rate: parseFloat(formData.sponsor_rate),
          is_active: true
      };

      if (editingId) {
          const { error } = await supabase.from('tasks').update(payload).eq('id', editingId);
          if (error) alert(error.message);
      } else {
          const { error } = await supabase.from('tasks').insert(payload);
          if (error) alert(error.message);
      }

      setIsEditing(false);
      setEditingId(null);
      setFormData(initialFormState);
      fetchTasks();
  };

  return (
    <div className="space-y-6 animate-fade-in relative">
        <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold text-white">Task Management</h2>
            <button 
                onClick={() => { setIsEditing(true); setEditingId(null); setFormData(initialFormState); }}
                className="bg-neon-green text-black px-4 py-2 rounded-xl font-bold flex items-center gap-2 hover:bg-emerald-400 transition"
            >
                <Plus size={18} /> Add Task
            </button>
        </div>

        {loading ? (
            <div className="flex justify-center py-10"><Loader2 className="animate-spin text-neon-green" size={32} /></div>
        ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {tasks.map(task => {
                    // Calculate Profit
                    const profit = (task.sponsor_rate || 0) - task.reward;
                    const margin = task.sponsor_rate ? ((profit / task.sponsor_rate) * 100).toFixed(0) : '0';

                    return (
                    <GlassCard key={task.id} className="flex flex-col justify-between group border border-white/5 hover:border-royal-500/30 transition">
                        <div className="flex justify-between items-start mb-2">
                            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                                task.type === 'social' ? 'bg-blue-500/20 text-blue-400' : 
                                task.type === 'video' ? 'bg-red-500/20 text-red-400' : 
                                'bg-purple-500/20 text-purple-400'
                            }`}>
                                <span className="text-xl font-bold capitalize">{task.icon === 'star' ? '★' : task.icon.charAt(0)}</span>
                            </div>
                            <div className="flex gap-2 opacity-50 group-hover:opacity-100 transition">
                                <button onClick={() => handleEdit(task)} className="p-2 bg-white/5 hover:bg-white/20 rounded-lg text-blue-400"><Edit size={16}/></button>
                                <button onClick={() => handleDelete(task.id)} className="p-2 bg-white/5 hover:bg-red-500/20 rounded-lg text-red-400"><Trash2 size={16}/></button>
                            </div>
                        </div>
                        <div>
                            <h4 className="font-bold text-white text-lg mb-1">{task.title}</h4>
                            <div className="flex flex-wrap gap-2 text-xs mb-3">
                                <span className="bg-white/5 px-2 py-1 rounded text-gray-300">{task.type}</span>
                                <span className={`px-2 py-1 rounded ${task.difficulty === 'Easy' ? 'text-green-400 bg-green-400/10' : 'text-yellow-400 bg-yellow-400/10'}`}>{task.difficulty}</span>
                                <span className="bg-white/5 px-2 py-1 rounded text-gray-300">{task.frequency}</span>
                            </div>
                            
                            <div className="flex items-end justify-between bg-black/20 p-2 rounded-lg">
                                <div>
                                    <p className="text-[10px] text-gray-500 uppercase">User Reward</p>
                                    <p className="text-neon-green font-bold text-lg">+${task.reward.toFixed(2)}</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-[10px] text-gray-500 uppercase">Profit/Task</p>
                                    <p className={`font-bold text-sm ${profit >= 0 ? 'text-blue-400' : 'text-red-400'}`}>
                                        ${profit.toFixed(2)} ({margin}%)
                                    </p>
                                </div>
                            </div>
                            {task.url && <p className="text-xs text-gray-500 truncate mt-2 border-t border-white/5 pt-2">{task.url}</p>}
                        </div>
                    </GlassCard>
                )})}
                {tasks.length === 0 && (
                    <div className="col-span-full text-center py-10 text-gray-500">No tasks found. Create one to get started.</div>
                )}
            </div>
        )}

        <AnimatePresence>
            {isEditing && (
                <motion.div 
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
                >
                    <motion.div 
                        initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }}
                        className="bg-dark-900 w-full max-w-lg rounded-2xl border border-white/10 p-6 max-h-[90vh] overflow-y-auto custom-scrollbar"
                    >
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-bold text-white">{editingId ? 'Edit Task' : 'Create New Task'}</h3>
                            <button onClick={() => setIsEditing(false)} className="text-gray-500 hover:text-white"><X size={24}/></button>
                        </div>
                        
                        <form onSubmit={handleSave} className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-400 mb-1">Title</label>
                                <input required type="text" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} className="w-full bg-black/30 border border-white/10 rounded-lg p-3 text-white focus:border-neon-green outline-none" placeholder="e.g. Join Telegram" />
                            </div>
                            
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-400 mb-1">User Reward ($)</label>
                                    <input required type="number" step="0.01" value={formData.reward} onChange={e => setFormData({...formData, reward: e.target.value})} className="w-full bg-black/30 border border-white/10 rounded-lg p-3 text-white focus:border-neon-green outline-none" />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-neon-green mb-1">Sponsor Rate ($)</label>
                                    <input required type="number" step="0.01" value={formData.sponsor_rate} onChange={e => setFormData({...formData, sponsor_rate: e.target.value})} className="w-full bg-black/30 border border-white/10 rounded-lg p-3 text-white focus:border-neon-green outline-none" placeholder="Admin gets paid" />
                                    <p className="text-[10px] text-gray-500 mt-1">Your Margin: ${(parseFloat(formData.sponsor_rate) - parseFloat(formData.reward)).toFixed(2)}</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-400 mb-1">Icon Key</label>
                                    <select value={formData.icon} onChange={e => setFormData({...formData, icon: e.target.value})} className="w-full bg-black/30 border border-white/10 rounded-lg p-3 text-white focus:border-neon-green outline-none">
                                        <option value="star">Star</option>
                                        <option value="send">Send (Telegram)</option>
                                        <option value="play">Play (Video)</option>
                                        <option value="download">Download</option>
                                        <option value="users">Users</option>
                                        <option value="globe">Globe</option>
                                        <option value="smartphone">Phone</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-400 mb-1">Frequency</label>
                                    <select value={formData.frequency} onChange={e => setFormData({...formData, frequency: e.target.value})} className="w-full bg-black/30 border border-white/10 rounded-lg p-3 text-white focus:border-neon-green outline-none">
                                        <option value="once">One Time</option>
                                        <option value="daily">Daily</option>
                                    </select>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-400 mb-1">Type</label>
                                    <select value={formData.type} onChange={e => setFormData({...formData, type: e.target.value})} className="w-full bg-black/30 border border-white/10 rounded-lg p-3 text-white focus:border-neon-green outline-none">
                                        <option value="social">Social</option>
                                        <option value="website">Website</option>
                                        <option value="video">Video</option>
                                        <option value="app">App</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-400 mb-1">Difficulty</label>
                                    <select value={formData.difficulty} onChange={e => setFormData({...formData, difficulty: e.target.value})} className="w-full bg-black/30 border border-white/10 rounded-lg p-3 text-white focus:border-neon-green outline-none">
                                        <option value="Easy">Easy</option>
                                        <option value="Medium">Medium</option>
                                        <option value="Hard">Hard</option>
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-400 mb-1">Target URL</label>
                                <input required type="url" value={formData.url} onChange={e => setFormData({...formData, url: e.target.value})} className="w-full bg-black/30 border border-white/10 rounded-lg p-3 text-white focus:border-neon-green outline-none" placeholder="https://..." />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-400 mb-1">Description (Optional)</label>
                                <textarea value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} className="w-full bg-black/30 border border-white/10 rounded-lg p-3 text-white focus:border-neon-green outline-none h-20 resize-none" placeholder="Brief instructions for the user..." />
                            </div>

                            <button type="submit" className="w-full py-3 bg-royal-600 text-white font-bold rounded-xl hover:bg-royal-700 transition flex items-center justify-center gap-2 mt-4">
                                <Save size={18} /> Save Task
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
