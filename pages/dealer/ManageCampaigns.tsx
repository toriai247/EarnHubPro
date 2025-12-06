
import React, { useEffect, useState } from 'react';
import GlassCard from '../../components/GlassCard';
import { supabase } from '../../integrations/supabase/client';
import { MarketTask } from '../../types';
import { Trash2, Pause, Play, Eye, BarChart2 } from 'lucide-react';
import { useUI } from '../../context/UIContext';
import Loader from '../../components/Loader';
import { Link } from 'react-router-dom';

const ManageCampaigns: React.FC = () => {
  const { toast, confirm } = useUI();
  const [campaigns, setCampaigns] = useState<MarketTask[]>([]);
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
      
      if (data) setCampaigns(data as MarketTask[]);
      setLoading(false);
  };

  const toggleStatus = async (task: MarketTask) => {
      const newStatus = task.status === 'active' ? 'paused' : 'active';
      const { error } = await supabase.from('marketplace_tasks').update({ status: newStatus }).eq('id', task.id);
      if (!error) {
          setCampaigns(prev => prev.map(t => t.id === task.id ? { ...t, status: newStatus as any } : t));
          toast.success(`Campaign ${newStatus}`);
      }
  };

  const handleDelete = async (id: string) => {
      if (!await confirm("Delete this campaign? Remaining budget will NOT be refunded automatically (contact admin).")) return;
      await supabase.from('marketplace_tasks').delete().eq('id', id);
      setCampaigns(prev => prev.filter(c => c.id !== id));
      toast.success("Deleted");
  };

  if (loading) return <div className="p-10"><Loader /></div>;

  return (
    <div className="space-y-6 animate-fade-in pb-20">
        <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold text-white">My Campaigns</h2>
            <Link to="/dealer/create" className="text-sm bg-white/10 px-4 py-2 rounded-lg hover:bg-white/20 transition">Create New</Link>
        </div>

        <div className="space-y-4">
            {campaigns.length === 0 ? (
                <div className="text-center py-12 bg-white/5 rounded-xl border border-white/5 text-gray-500">No campaigns found.</div>
            ) : (
                campaigns.map(task => {
                    const progress = ((task.total_quantity - task.remaining_quantity) / task.total_quantity) * 100;
                    return (
                        <GlassCard key={task.id} className="border border-white/10 group hover:border-amber-500/30 transition">
                            <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
                                <div className="flex-1">
                                    <div className="flex items-center gap-3">
                                        <h3 className="font-bold text-white text-lg">{task.title}</h3>
                                        <span className={`text-[10px] uppercase px-2 py-0.5 rounded font-bold ${task.status === 'active' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                                            {task.status}
                                        </span>
                                    </div>
                                    <p className="text-xs text-gray-400 mt-1">{task.category} • Budget: ${(task.total_quantity * task.price_per_action).toFixed(2)}</p>
                                </div>

                                <div className="w-full md:w-1/3">
                                    <div className="flex justify-between text-[10px] text-gray-400 mb-1 font-bold uppercase">
                                        <span>Progress</span>
                                        <span>{Math.round(progress)}%</span>
                                    </div>
                                    <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                                        <div className="h-full bg-amber-500" style={{ width: `${progress}%` }}></div>
                                    </div>
                                    <div className="flex justify-between text-[10px] text-gray-500 mt-1">
                                        <span>{task.total_quantity - task.remaining_quantity} Done</span>
                                        <span>{task.remaining_quantity} Left</span>
                                    </div>
                                </div>

                                <div className="flex gap-2 w-full md:w-auto">
                                    <button onClick={() => toggleStatus(task)} className="p-2 bg-white/5 hover:bg-white/10 rounded-lg text-white transition border border-white/5">
                                        {task.status === 'active' ? <Pause size={18}/> : <Play size={18}/>}
                                    </button>
                                    <button className="p-2 bg-white/5 hover:bg-white/10 rounded-lg text-blue-400 transition border border-white/5">
                                        <BarChart2 size={18}/>
                                    </button>
                                    <button onClick={() => handleDelete(task.id)} className="p-2 bg-red-500/10 hover:bg-red-500/20 rounded-lg text-red-400 transition border border-red-500/20">
                                        <Trash2 size={18}/>
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
