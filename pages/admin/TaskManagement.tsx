
import React, { useEffect, useState } from 'react';
import GlassCard from '../../components/GlassCard';
import { supabase } from '../../integrations/supabase/client';
import { 
  Trash2, Pause, Play, Search, AlertCircle, CheckCircle, Flag, XCircle
} from 'lucide-react';
import { useUI } from '../../context/UIContext';
import Loader from '../../components/Loader';

const TaskManagement: React.FC = () => {
  const { toast, confirm } = useUI();
  const [tasks, setTasks] = useState<any[]>([]);
  const [reports, setReports] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'all' | 'reported'>('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
      fetchData();
  }, []);

  const fetchData = async () => {
      setLoading(true);
      
      const { data: tasksData } = await supabase.from('marketplace_tasks').select('*').order('created_at', {ascending: false});
      if (tasksData) setTasks(tasksData);

      const { data: reportsData } = await supabase.from('task_reports').select('*, task:task_id(title, creator_id)').eq('status', 'pending');
      if (reportsData) setReports(reportsData);

      setLoading(false);
  };

  const handleDeleteTask = async (id: string) => {
      if(!await confirm("Delete this task?")) return;
      await supabase.from('marketplace_tasks').delete().eq('id', id);
      setTasks(prev => prev.filter(t => t.id !== id));
      // Also remove from reports
      setReports(prev => prev.filter(r => r.task_id !== id));
      toast.success("Task deleted");
  };

  const handleResolveReport = async (reportId: string, action: 'ignore' | 'ban_task') => {
      if (action === 'ban_task') {
          const report = reports.find(r => r.id === reportId);
          if (report) await handleDeleteTask(report.task_id);
      }
      
      await supabase.from('task_reports').update({ status: 'resolved' }).eq('id', reportId);
      setReports(prev => prev.filter(r => r.id !== reportId));
      toast.success("Report resolved");
  };

  if (loading) return <div className="p-10"><Loader /></div>;

  return (
    <div className="space-y-6 animate-fade-in pb-20">
        <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold text-white">Task Manager</h2>
            <div className="flex bg-white/10 rounded-lg p-1">
                <button onClick={() => setActiveTab('all')} className={`px-4 py-1.5 rounded text-xs font-bold ${activeTab === 'all' ? 'bg-white text-black' : 'text-gray-400'}`}>All Tasks</button>
                <button onClick={() => setActiveTab('reported')} className={`px-4 py-1.5 rounded text-xs font-bold flex items-center gap-1 ${activeTab === 'reported' ? 'bg-red-500 text-white' : 'text-gray-400'}`}>
                    Reports <span className="bg-black/30 px-1.5 rounded-full text-[9px]">{reports.length}</span>
                </button>
            </div>
        </div>

        {activeTab === 'all' && (
            <div className="space-y-3">
                {tasks.map(t => (
                    <GlassCard key={t.id} className="flex justify-between items-center border border-white/10">
                        <div>
                            <h4 className="font-bold text-white">{t.title}</h4>
                            <p className="text-xs text-gray-400">{t.status} • {t.total_quantity} qty</p>
                        </div>
                        <button onClick={() => handleDeleteTask(t.id)} className="text-red-400 hover:text-white p-2"><Trash2 size={16}/></button>
                    </GlassCard>
                ))}
            </div>
        )}

        {activeTab === 'reported' && (
            <div className="space-y-4">
                {reports.length === 0 && <p className="text-center text-gray-500 py-10">No pending reports.</p>}
                {reports.map(r => (
                    <GlassCard key={r.id} className="border border-red-500/30 bg-red-950/10">
                        <div className="flex items-start gap-3 mb-3">
                            <Flag className="text-red-500 shrink-0 mt-1" size={18}/>
                            <div>
                                <h4 className="font-bold text-white text-sm">Report against: {r.task?.title || 'Deleted Task'}</h4>
                                <p className="text-xs text-red-300 font-bold mt-1">Reason: "{r.reason}"</p>
                                <p className="text-[10px] text-gray-500 mt-1">Reporter: {r.reporter_id}</p>
                            </div>
                        </div>
                        <div className="flex gap-2">
                            <button onClick={() => handleResolveReport(r.id, 'ignore')} className="flex-1 py-2 bg-white/10 rounded text-xs text-gray-300 hover:text-white">Ignore Report</button>
                            <button onClick={() => handleResolveReport(r.id, 'ban_task')} className="flex-1 py-2 bg-red-600 text-white rounded text-xs font-bold hover:bg-red-500">Delete Task</button>
                        </div>
                    </GlassCard>
                ))}
            </div>
        )}
    </div>
  );
};

export default TaskManagement;
