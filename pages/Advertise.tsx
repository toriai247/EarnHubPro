
import React, { useEffect, useState } from 'react';
import GlassCard from '../components/GlassCard';
import { 
  Megaphone, Plus, DollarSign, LayoutList, 
  Trash2, Pause, Play, Globe, Save, X, 
  CheckCircle2, AlertCircle, BarChart3, Calculator, Users, Clock, FileText, Image as ImageIcon, ExternalLink, RefreshCw 
} from 'lucide-react';
import { supabase } from '../integrations/supabase/client';
import { WalletData, MarketTask, MarketSubmission, TaskRequirement } from '../types';
import { updateWallet, createTransaction } from '../lib/actions';
import { useUI } from '../context/UIContext';
import BalanceDisplay from '../components/BalanceDisplay';

const Advertise: React.FC = () => {
  const { toast, confirm } = useUI();
  const [wallet, setWallet] = useState<WalletData | null>(null);
  const [activeTab, setActiveTab] = useState<'manage' | 'create' | 'review'>('manage');
  const [loading, setLoading] = useState(true);
  const [campaigns, setCampaigns] = useState<MarketTask[]>([]);
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [submissionError, setSubmissionError] = useState<string | null>(null);
  
  // Create Form State
  const [useBudgetMode, setUseBudgetMode] = useState(false);
  const [form, setForm] = useState({
      title: '',
      description: '',
      url: '',
      category: 'website',
      quantity: 100,
      totalBudget: 10.00,
      pricePerAction: 0.05,
      timer: 10
  });
  
  // Requirements Builder State
  const [requirements, setRequirements] = useState<TaskRequirement[]>([]);

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
      if (activeTab === 'review') {
          fetchSubmissions();
      }
  }, [activeTab]);

  // Recalculate based on mode
  useEffect(() => {
      if (useBudgetMode) {
          const qty = Math.floor(form.totalBudget / form.pricePerAction);
          setForm(prev => ({ ...prev, quantity: qty }));
      } else {
          const budget = form.quantity * form.pricePerAction;
          setForm(prev => ({ ...prev, totalBudget: budget }));
      }
  }, [form.totalBudget, form.quantity, form.pricePerAction, useBudgetMode]);

  const fetchData = async () => {
    setLoading(true);
    try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
            const { data: w } = await supabase.from('wallets').select('*').eq('user_id', session.user.id).single();
            if (w) setWallet(w as WalletData);

            const { data: c } = await supabase.from('marketplace_tasks')
                .select('*')
                .eq('creator_id', session.user.id)
                .order('created_at', {ascending: false});
            
            if (c) setCampaigns(c as MarketTask[]);
        }
    } catch (e) {
        console.error(e);
    } finally {
        setLoading(false);
    }
  };

  const fetchSubmissions = async () => {
      setSubmissionError(null);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      // V1 STYLE: Direct Query with Inner Join on Tasks created by Me
      try {
          const { data, error } = await supabase
              .from('marketplace_submissions')
              .select(`
                  *,
                  marketplace_tasks!inner(title, creator_id, worker_reward),
                  profiles(name_1)
              `)
              .eq('marketplace_tasks.creator_id', session.user.id) // Only my tasks
              .eq('status', 'pending')
              .order('created_at', { ascending: false });

          if (error) throw error;

          if (data) {
              const formatted = data.map((s: any) => ({
                  ...s,
                  task_title: s.marketplace_tasks?.title || 'Unknown Task',
                  worker_name: s.profiles?.name_1 || 'Worker',
                  reward: s.marketplace_tasks?.worker_reward || 0
              }));
              setSubmissions(formatted);
          } else {
              setSubmissions([]);
          }
      } catch (err: any) {
          console.error("Review Fetch Error:", err);
          setSubmissionError("Please run 'Enable V1 Compatibility' in Admin > Database Ultra.");
      }
  };

  const handleAddRequirement = (type: 'text' | 'image') => {
      const newReq: TaskRequirement = {
          id: `req_${Date.now()}`,
          type,
          label: '',
          required: true
      };
      setRequirements([...requirements, newReq]);
  };

  const handleRemoveRequirement = (id: string) => {
      setRequirements(requirements.filter(r => r.id !== id));
  };

  const handleRequirementChange = (id: string, val: string) => {
      setRequirements(requirements.map(r => r.id === id ? { ...r, label: val } : r));
  };

  const handleCreateCampaign = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!wallet) return;

      const totalCost = form.totalBudget;
      if (wallet.deposit_balance < totalCost) {
          toast.error(`Insufficient Deposit Balance. Need $${totalCost.toFixed(2)}`);
          return;
      }

      if (form.quantity < 1) {
          toast.error("Quantity must be at least 1");
          return;
      }

      if (requirements.length === 0 && form.timer < 5) {
          toast.error("Please add requirements or set a timer > 5s");
          return;
      }

      if (!await confirm(`Create Campaign for $${totalCost.toFixed(2)}?`)) return;

      try {
          const { data: { session } } = await supabase.auth.getSession();
          if (!session) return;

          await updateWallet(session.user.id, totalCost, 'decrement', 'deposit_balance');
          await createTransaction(session.user.id, 'invest', totalCost, `Ad Campaign: ${form.title}`);

          const { error } = await supabase.from('marketplace_tasks').insert({
              creator_id: session.user.id,
              title: form.title,
              description: form.description,
              category: form.category,
              target_url: form.url,
              total_quantity: form.quantity,
              remaining_quantity: form.quantity,
              price_per_action: form.pricePerAction, 
              worker_reward: form.pricePerAction * 0.7, 
              proof_type: requirements.length > 0 ? 'complex' : 'auto',
              requirements: requirements,
              timer_seconds: form.timer,
              status: 'active'
          });

          if (error) throw error;

          toast.success("Campaign Published!");
          setForm({ ...form, title: '', description: '', url: '' });
          setRequirements([]);
          setActiveTab('manage');
          fetchData();

      } catch (e: any) {
          if (e.message?.includes('marketplace_tasks_proof_type_check')) {
             toast.error("Database Update Required: Ask Admin to run 'Task System 2.0 Upgrade'.");
          } else {
             toast.error("Error: " + e.message);
          }
      }
  };

  const handleDelete = async (id: string) => {
      if(!await confirm("Delete campaign?")) return;
      await supabase.from('marketplace_tasks').delete().eq('id', id);
      fetchData();
      toast.success("Campaign Deleted");
  };

  const handleToggle = async (task: MarketTask) => {
      const newStatus = task.status === 'active' ? 'paused' : 'active';
      await supabase.from('marketplace_tasks').update({ status: newStatus }).eq('id', task.id);
      fetchData();
  };

  const handleReviewAction = async (submission: any, action: 'approve' | 'reject') => {
      try {
          const { error } = await supabase
              .from('marketplace_submissions')
              .update({ status: action === 'approve' ? 'approved' : 'rejected' })
              .eq('id', submission.id);

          if (error) throw error;

          if (action === 'approve') {
              // Get reward from submission join
              const reward = submission.reward || 0;
              await updateWallet(submission.worker_id, reward, 'increment', 'earning_balance');
              await updateWallet(submission.worker_id, reward, 'increment', 'total_earning');
              await updateWallet(submission.worker_id, reward, 'increment', 'today_earning');
              await createTransaction(submission.worker_id, 'earn', reward, `Task Approved: ${submission.task_title}`);
              toast.success("Approved & Worker Paid");
          } 
          else {
              await supabase.rpc('increment_task_quantity', { task_id: submission.task_id });
              toast.info("Rejected. Task slot restored.");
          }

          setSubmissions(prev => prev.filter(s => s.id !== submission.id));

      } catch (e: any) {
          toast.error("Action failed: " + e.message);
      }
  };

  return (
    <div className="pb-24 sm:pl-20 sm:pt-6 space-y-6 px-4 sm:px-0">
        
        {/* HEADER */}
        <div className="flex justify-between items-end pt-4">
            <div>
                <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                    <Megaphone className="text-purple-500" /> Advertise
                </h1>
                <p className="text-gray-400 text-xs">Create tasks & promote your content.</p>
            </div>
            <div className="bg-[#111] border border-[#222] px-4 py-2 rounded-xl text-right">
                <p className="text-[10px] text-gray-500 font-bold uppercase">Ad Budget</p>
                <p className="text-white font-bold font-mono"><BalanceDisplay amount={wallet?.deposit_balance || 0} /></p>
            </div>
        </div>

        {/* TABS */}
        <div className="flex bg-[#111] p-1 rounded-xl border border-[#222]">
            <button 
                onClick={() => setActiveTab('manage')}
                className={`flex-1 py-2 rounded-lg text-xs font-bold uppercase transition ${activeTab === 'manage' ? 'bg-[#222] text-white' : 'text-gray-500 hover:text-gray-300'}`}
            >
                Campaigns
            </button>
            <button 
                onClick={() => setActiveTab('create')}
                className={`flex-1 py-2 rounded-lg text-xs font-bold uppercase transition ${activeTab === 'create' ? 'bg-[#222] text-white' : 'text-gray-500 hover:text-gray-300'}`}
            >
                Create New
            </button>
            <button 
                onClick={() => setActiveTab('review')}
                className={`flex-1 py-2 rounded-lg text-xs font-bold uppercase transition flex items-center justify-center gap-2 ${activeTab === 'review' ? 'bg-[#222] text-white' : 'text-gray-500 hover:text-gray-300'}`}
            >
                Inbox {submissions.length > 0 && <span className="bg-red-500 text-white text-[9px] px-1.5 rounded-full">{submissions.length}</span>}
            </button>
        </div>

        {/* --- CREATE TAB --- */}
        {activeTab === 'create' && (
            <div className="space-y-6 animate-fade-in">
                <div className="bg-[#111] border border-[#222] rounded-2xl p-6">
                    <form onSubmit={handleCreateCampaign} className="space-y-5">
                        <div className="space-y-4">
                            <div>
                                <label className="text-xs font-bold text-gray-400 uppercase block mb-1">Campaign Title</label>
                                <input 
                                    required 
                                    type="text" 
                                    value={form.title} 
                                    onChange={e => setForm({...form, title: e.target.value})}
                                    className="w-full bg-black/40 border border-[#333] rounded-xl p-3 text-white text-sm focus:border-purple-500 outline-none"
                                    placeholder="e.g. Subscribe to my Channel"
                                />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-gray-400 uppercase block mb-1">Target URL</label>
                                <input 
                                    required 
                                    type="url" 
                                    value={form.url} 
                                    onChange={e => setForm({...form, url: e.target.value})}
                                    className="w-full bg-black/40 border border-[#333] rounded-xl p-3 text-white text-sm focus:border-purple-500 outline-none"
                                    placeholder="https://..."
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-xs font-bold text-gray-400 uppercase block mb-1">Category</label>
                                    <select 
                                        value={form.category} 
                                        onChange={e => setForm({...form, category: e.target.value})}
                                        className="w-full bg-black/40 border border-[#333] rounded-xl p-3 text-white text-sm focus:border-purple-500 outline-none"
                                    >
                                        <option value="website">Website Visit</option>
                                        <option value="video">Watch Video</option>
                                        <option value="social">Social Media</option>
                                        <option value="app">App Install</option>
                                        <option value="review">Review/Rating</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-gray-400 uppercase block mb-1">Timer (Sec)</label>
                                    <input 
                                        type="number" 
                                        min="5" 
                                        max="300"
                                        value={form.timer} 
                                        onChange={e => setForm({...form, timer: parseInt(e.target.value)})}
                                        className="w-full bg-black/40 border border-[#333] rounded-xl p-3 text-white text-sm focus:border-purple-500 outline-none"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Requirements Builder */}
                        <div className="border-t border-[#222] pt-4">
                            <div className="flex justify-between items-center mb-3">
                                <label className="text-xs font-bold text-white uppercase">Proof Requirements</label>
                                <div className="flex gap-2">
                                    <button type="button" onClick={() => handleAddRequirement('text')} className="px-3 py-1.5 bg-[#222] text-white text-[10px] font-bold rounded hover:bg-[#333]">+ Question</button>
                                    <button type="button" onClick={() => handleAddRequirement('image')} className="px-3 py-1.5 bg-[#222] text-white text-[10px] font-bold rounded hover:bg-[#333]">+ Screenshot</button>
                                </div>
                            </div>
                            
                            <div className="space-y-2 mb-4">
                                {requirements.map((req, idx) => (
                                    <div key={req.id} className="flex gap-2 items-center bg-black/30 p-2 rounded-lg border border-[#333]">
                                        <span className="text-[10px] bg-[#222] text-gray-400 px-2 py-1 rounded uppercase">{req.type}</span>
                                        <input 
                                            type="text" 
                                            value={req.label} 
                                            onChange={e => handleRequirementChange(req.id, e.target.value)}
                                            placeholder={req.type === 'text' ? 'e.g. What is your username?' : 'e.g. Upload screenshot of like'}
                                            className="flex-1 bg-transparent text-xs text-white outline-none"
                                        />
                                        <button type="button" onClick={() => handleRemoveRequirement(req.id)} className="text-red-500 p-1"><X size={14}/></button>
                                    </div>
                                ))}
                                {requirements.length === 0 && <p className="text-xs text-gray-500 italic">No proof required (Timer only).</p>}
                            </div>
                        </div>

                        {/* BUDGET CALCULATOR */}
                        <div className="bg-[#1a1a1a] p-4 rounded-xl border border-[#333]">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                                    <Calculator size={16}/> Budgeting
                                </h3>
                                <div className="flex items-center gap-2 bg-black/30 p-1 rounded-lg">
                                    <button 
                                        type="button" 
                                        onClick={() => setUseBudgetMode(false)}
                                        className={`px-3 py-1 rounded text-[10px] font-bold uppercase ${!useBudgetMode ? 'bg-purple-600 text-white' : 'text-gray-500'}`}
                                    >
                                        Fixed Qty
                                    </button>
                                    <button 
                                        type="button" 
                                        onClick={() => setUseBudgetMode(true)}
                                        className={`px-3 py-1 rounded text-[10px] font-bold uppercase ${useBudgetMode ? 'bg-purple-600 text-white' : 'text-gray-500'}`}
                                    >
                                        Total Budget
                                    </button>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4 mb-4">
                                <div>
                                    <label className="text-[10px] text-gray-500 uppercase font-bold block mb-1">
                                        {useBudgetMode ? 'Cost Per Worker' : 'Cost Per Worker'}
                                    </label>
                                    <input type="number" step="0.001" value={form.pricePerAction} onChange={e => setForm({...form, pricePerAction: parseFloat(e.target.value)})} className="w-full bg-black border border-[#333] rounded-lg p-2 text-white text-sm" />
                                </div>
                                <div>
                                    <label className="text-[10px] text-gray-500 uppercase font-bold block mb-1">
                                        {useBudgetMode ? 'Total Budget ($)' : 'Target Workers'}
                                    </label>
                                    {useBudgetMode ? (
                                        <input type="number" step="1" value={form.totalBudget} onChange={e => setForm({...form, totalBudget: parseFloat(e.target.value)})} className="w-full bg-black border border-[#333] rounded-lg p-2 text-white text-sm" />
                                    ) : (
                                        <input type="number" step="1" value={form.quantity} onChange={e => setForm({...form, quantity: parseInt(e.target.value)})} className="w-full bg-black border border-[#333] rounded-lg p-2 text-white text-sm" />
                                    )}
                                </div>
                            </div>
                            
                            <div className="flex justify-between items-center pt-2 border-t border-[#333]">
                                {useBudgetMode ? (
                                    <>
                                        <span className="text-gray-400 text-xs font-bold">Est. Workers</span>
                                        <span className="text-xl font-bold text-white">{form.quantity}</span>
                                    </>
                                ) : (
                                    <>
                                        <span className="text-gray-400 text-xs font-bold">Total Cost</span>
                                        <span className="text-xl font-bold text-white">${form.totalBudget.toFixed(2)}</span>
                                    </>
                                )}
                            </div>
                        </div>

                        <button 
                            type="submit" 
                            className="w-full py-3 bg-white text-black font-bold rounded-xl hover:bg-gray-200 transition shadow-lg"
                        >
                            Publish Campaign
                        </button>
                    </form>
                </div>
            </div>
        )}

        {/* --- MANAGE TAB --- */}
        {activeTab === 'manage' && (
            <div className="space-y-4 animate-fade-in">
                {campaigns.length === 0 ? (
                    <div className="text-center py-12 bg-[#111] rounded-2xl border border-[#222]">
                        <Globe size={32} className="mx-auto text-gray-600 mb-3"/>
                        <p className="text-gray-500 text-sm">No active campaigns.</p>
                        <button onClick={() => setActiveTab('create')} className="mt-4 text-purple-400 text-xs font-bold hover:underline">Start Advertising</button>
                    </div>
                ) : (
                    campaigns.map(task => (
                        <GlassCard key={task.id} className="border border-[#222]">
                            <div className="flex justify-between items-start mb-3">
                                <div>
                                    <h3 className="font-bold text-white text-sm">{task.title}</h3>
                                    <p className="text-xs text-gray-500 mt-0.5 capitalize">{task.category} • ${task.price_per_action}/user</p>
                                </div>
                                <div className={`px-2 py-1 rounded text-[10px] font-bold uppercase ${task.status === 'active' ? 'bg-green-900/30 text-green-400' : 'bg-red-900/30 text-red-400'}`}>
                                    {task.status}
                                </div>
                            </div>

                            <div className="bg-[#1a1a1a] rounded-lg p-3 mb-4 border border-[#333]">
                                <div className="flex justify-between text-[10px] text-gray-400 mb-1 uppercase font-bold">
                                    <span>Progress</span>
                                    <span>{task.total_quantity - task.remaining_quantity} / {task.total_quantity}</span>
                                </div>
                                <div className="h-1.5 bg-[#333] rounded-full overflow-hidden">
                                    <div 
                                        className="h-full bg-purple-500" 
                                        style={{ width: `${((task.total_quantity - task.remaining_quantity) / task.total_quantity) * 100}%` }}
                                    ></div>
                                </div>
                            </div>

                            <div className="flex gap-2">
                                <button 
                                    onClick={() => handleToggle(task)}
                                    className="flex-1 py-2 bg-[#222] text-white text-xs font-bold rounded hover:bg-[#333] flex items-center justify-center gap-1"
                                >
                                    {task.status === 'active' ? <Pause size={12}/> : <Play size={12}/>} {task.status === 'active' ? 'Pause' : 'Resume'}
                                </button>
                                <button 
                                    onClick={() => handleDelete(task.id)}
                                    className="p-2 bg-red-900/20 text-red-400 rounded hover:bg-red-900/30"
                                >
                                    <Trash2 size={16}/>
                                </button>
                            </div>
                        </GlassCard>
                    ))
                )}
            </div>
        )}

        {/* --- REVIEW TAB --- */}
        {activeTab === 'review' && (
            <div className="space-y-4 animate-fade-in">
                
                <div className="flex justify-between items-center bg-[#111] p-2 rounded-xl border border-[#222]">
                    <span className="text-xs text-gray-400 ml-2">Pending Reviews: {submissions.length}</span>
                    <button onClick={fetchSubmissions} className="flex items-center gap-1 px-3 py-1.5 bg-[#222] text-white rounded-lg text-xs font-bold hover:bg-[#333]">
                        <RefreshCw size={12} /> Refresh
                    </button>
                </div>

                {submissionError && (
                    <div className="p-3 bg-red-900/20 text-red-400 text-xs rounded-xl border border-red-500/20 flex items-center gap-2">
                        <AlertCircle size={16}/> {submissionError}
                    </div>
                )}

                {submissions.length === 0 && !submissionError ? (
                    <div className="text-center py-12 bg-[#111] rounded-2xl border border-[#222]">
                        <CheckCircle2 size={32} className="mx-auto text-green-600 mb-3 opacity-50"/>
                        <p className="text-gray-500 text-sm">All submissions reviewed.</p>
                        <p className="text-xs text-gray-600 mt-1">Click refresh to check for new ones.</p>
                    </div>
                ) : (
                    submissions.map(sub => (
                        <GlassCard key={sub.id} className="border border-[#222]">
                            <div className="flex justify-between items-start mb-4 border-b border-[#222] pb-3">
                                <div>
                                    <h4 className="text-white font-bold text-sm">{sub.task_title}</h4>
                                    <p className="text-xs text-gray-500">Worker: {sub.worker_name}</p>
                                </div>
                                <div className="text-[10px] text-yellow-500 bg-yellow-900/20 px-2 py-1 rounded font-bold uppercase">Pending Review</div>
                            </div>

                            <div className="space-y-3 mb-4">
                                {Object.entries(sub.submission_data || {}).map(([key, value]: any) => (
                                    <div key={key} className="bg-[#1a1a1a] p-3 rounded-lg border border-[#333]">
                                        <p className="text-[10px] text-gray-500 uppercase font-bold mb-1">
                                            {key.includes('ss') ? 'Screenshot Proof' : 'Answer'}
                                        </p>
                                        {value.startsWith('http') && (value.includes('.png') || value.includes('.jpg') || value.includes('.jpeg')) ? (
                                            <div className="relative group">
                                                <img src={value} alt="Proof" className="w-full h-32 object-cover rounded border border-[#333]" />
                                                <a href={value} target="_blank" className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 transition text-white text-xs font-bold gap-1">
                                                    <ExternalLink size={14}/> View Full
                                                </a>
                                            </div>
                                        ) : (
                                            <p className="text-white text-sm bg-black p-2 rounded">{value}</p>
                                        )}
                                    </div>
                                ))}
                            </div>

                            <div className="flex gap-2">
                                <button 
                                    onClick={() => handleReviewAction(sub, 'approve')}
                                    className="flex-1 py-3 bg-green-600 hover:bg-green-500 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-2"
                                >
                                    <CheckCircle2 size={16}/> Approve & Pay
                                </button>
                                <button 
                                    onClick={() => handleReviewAction(sub, 'reject')}
                                    className="flex-1 py-3 bg-red-600/20 hover:bg-red-600/30 text-red-400 text-xs font-bold rounded-xl flex items-center justify-center gap-2 border border-red-600/30"
                                >
                                    <X size={16}/> Reject
                                </button>
                            </div>
                        </GlassCard>
                    ))
                )}
            </div>
        )}
    </div>
  );
};

export default Advertise;
