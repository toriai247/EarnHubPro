
import React, { useEffect, useState } from 'react';
import GlassCard from '../../components/GlassCard';
import { supabase } from '../../integrations/supabase/client';
import { MarketTask } from '../../types';
import { Trash2, Pause, Play, Edit2, Flame, BadgeCheck, Activity } from 'lucide-react';
import { useUI } from '../../context/UIContext';
import Loader from '../../components/Loader';
import { Link } from 'react-router-dom';

const ManageCampaigns: React.FC = () => {
  const { toast, confirm } = useUI();
  const [campaigns, setCampaigns] = useState<any[]>([]); // Using any to support new columns safely
  const [loading, setLoading] = useState(true);

  useEffect(() => {
      fetchCampaigns();
  }, []);

  const fetchCampaigns = async () => {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { data } = await supabase.from('marketplace_tasks')
          .select('*')
          .eq('creator_id', session.user.id)
          .order('created_at', { ascending: false });
      
      if (data) setCampaigns(data);
      setLoading(false);
  };

  const toggleStatus = async (task: any) => {
      const newStatus = task.status === 'active' ? 'paused' : 'active';
      const { error } = await supabase.from('marketplace_tasks').update({ status: newStatus }).eq('id', task.id);
      if (!error) {
          setCampaigns(prev => prev.map(t => t.id === task.id ? { ...t, status: newStatus } : t));
          toast.success(`Campaign ${newStatus}`);
      }
  };

  const handleDelete = async (id: string) => {
      if (!await confirm("Stop and Delete this campaign? Unused budget must be claimed via support.")) return;
      await supabase.from('marketplace_tasks').delete().eq('id', id);
      setCampaigns(prev => prev.filter(c => c.id !== id));
      toast.success("Campaign Deleted");
  };

  if (loading) return <div className="p-10"><Loader /></div>;

  return (
    <div className="space-y-6 animate-fade-in pb-20">
        <div className="flex justify-between items-center bg-black/40 p-4 rounded-2xl border border-white/10 backdrop-blur-md sticky top-0 z-10">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <Activity className="text-amber-500"/> Campaign Manager
            </h2>
            <Link to="/dealer/create" className="text-xs font-bold bg-white text-black px-4 py-2 rounded-lg hover:bg-gray-200 transition shadow-lg">
                + New Ad
            </Link>
        </div>

        <div className="space-y-4">
            {campaigns.length === 0 ? (
                <div className="text-center py-12 bg-white/5 rounded-xl border border-white/5 text-gray-500">
                    No active campaigns. Start promoting today!
                </div>
            ) : (
                campaigns.map(task => {
                    const progress = ((task.total_quantity - task.remaining_quantity) / task.total_quantity) * 100;
                    const isHot = task.worker_reward > 5 || task.is_featured; // Hot Logic

                    return (
                        <GlassCard key={task.id} className={`border group transition-all duration-300 relative overflow-hidden ${task.status === 'active' ? 'border-amber-500/30 hover:border-amber-500/60' : 'border-white/10 opacity-70'}`}>
                            
                            {/* Hot Deal Banner */}
                            {isHot && (
                                <div className="absolute top-0 right-0 bg-gradient-to-l from-red-600 to-orange-500 text-white text-[9px] font-black px-3 py-1 rounded-bl-xl shadow-lg flex items-center gap-1">
                                    <Flame size={10} fill="currentColor"/> HOT DEAL
                                </div>
                            )}

                            <div className="flex flex-col gap-4">
                                {/* Header */}
                                <div className="flex justify-between items-start pr-16">
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <h3 className="font-bold text-white text-lg">{task.title}</h3>
                                            <BadgeCheck size={16} className="text-blue-400" fill="black" />
                                        </div>
                                        <p className="text-xs text-gray-400 mt-1 font-medium">
                                            {task.company_name || 'My Company'} • <span className="text-amber-400">Budget: ৳{(task.total_quantity * task.price_per_action).toFixed(2)}</span>
                                        </p>
                                    </div>
                                </div>

                                {/* Stats Bar */}
                                <div className="bg-black/40 rounded-xl p-3 border border-white/5">
                                    <div className="flex justify-between text-[10px] text-gray-400 mb-1 font-bold uppercase">
                                        <span>Completion</span>
                                        <span className="text-white">{Math.round(progress)}%</span>
                                    </div>
                                    <div className="h-2 bg-white/10 rounded-full overflow-hidden mb-2">
                                        <div className="h-full bg-gradient-to-r from-amber-500 to-orange-500" style={{ width: `${progress}%` }}></div>
                                    </div>
                                    <div className="flex justify-between text-[10px] text-gray-500">
                                        <span>{task.total_quantity - task.remaining_quantity} Completed</span>
                                        <span>{task.remaining_quantity} Remaining</span>
                                    </div>
                                </div>

                                {/* Actions Footer */}
                                <div className="flex items-center gap-2 pt-2 border-t border-white/5">
                                    <div className={`px-2 py-1 rounded text-[9px] uppercase font-black tracking-wider ${task.status === 'active' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                                        {task.status}
                                    </div>
                                    <div className="flex-1"></div>
                                    
                                    <button 
                                        onClick={() => toggleStatus(task)} 
                                        className="p-2 bg-white/5 hover:bg-white/10 rounded-lg text-white transition border border-white/5"
                                        title={task.status === 'active' ? 'Pause' : 'Resume'}
                                    >
                                        {task.status === 'active' ? <Pause size={16} fill="currentColor"/> : <Play size={16} fill="currentColor"/>}
                                    </button>
                                    <button 
                                        className="p-2 bg-blue-500/10 hover:bg-blue-500/20 rounded-lg text-blue-400 transition border border-blue-500/20"
                                        title="Edit (Coming Soon)"
                                    >
                                        <Edit2 size={16}/>
                                    </button>
                                    <button 
                                        onClick={() => handleDelete(task.id)} 
                                        className="p-2 bg-red-500/10 hover:bg-red-500/20 rounded-lg text-red-400 transition border border-red-500/20"
                                        title="Delete"
                                    >
                                        <Trash2 size={16}/>
                                    </button>
                                </div>
                            </div>
                        </GlassCard>
                    );
                })
            )}
        </div>
    </div>
  );
};

export default ManageCampaigns;
