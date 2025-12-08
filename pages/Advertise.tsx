
import React, { useEffect, useState } from 'react';
import GlassCard from '../components/GlassCard';
import { 
  Megaphone, DollarSign, Globe, Trash2,
  UploadCloud, Loader2, RefreshCw, X, CheckCircle2,
  Image as ImageIcon
} from 'lucide-react';
import { supabase } from '../integrations/supabase/client';
import { WalletData, MarketTask, QuizConfig } from '../types';
import { updateWallet, createTransaction } from '../lib/actions';
import { useUI } from '../context/UIContext';
import BalanceDisplay from '../components/BalanceDisplay';

const Advertise: React.FC = () => {
  const { toast, confirm } = useUI();
  const [wallet, setWallet] = useState<WalletData | null>(null);
  const [activeTab, setActiveTab] = useState<'manage' | 'create'>('manage');
  const [loading, setLoading] = useState(true);
  const [campaigns, setCampaigns] = useState<MarketTask[]>([]);
  
  // Create Form State
  const [form, setForm] = useState({
      title: '',
      description: '',
      url: '',
      category: 'social',
      quantity: 100,
      pricePerAction: 2.00, // Default 2 BDT
      timer: 15
  });
  
  // Quiz Generator State
  const [quizQuestion, setQuizQuestion] = useState('');
  const [quizOptions, setQuizOptions] = useState(['', '', '']);
  const [correctIndex, setCorrectIndex] = useState(0);
  
  useEffect(() => {
    fetchData();
  }, []);

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

  const handleCreateCampaign = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!wallet) return;
      
      const totalBudget = form.quantity * form.pricePerAction;
      if (wallet.deposit_balance < totalBudget) {
          toast.error(`Insufficient Deposit Balance. Need ৳${totalBudget.toFixed(2)}`);
          return;
      }

      if (!quizQuestion || quizOptions.some(o => !o.trim())) {
          toast.error("Please set a validation quiz.");
          return;
      }

      if (!await confirm(`Publish Campaign? Total Cost: ৳${totalBudget.toFixed(2)}`)) return;

      try {
          const { data: { session } } = await supabase.auth.getSession();
          if (!session) return;

          await updateWallet(session.user.id, totalBudget, 'decrement', 'deposit_balance');
          await createTransaction(session.user.id, 'invest', totalBudget, `Ad Campaign: ${form.title}`);

          const quizConfig: QuizConfig = {
              question: quizQuestion,
              options: quizOptions,
              correct_index: correctIndex
          };

          const { error } = await supabase.from('marketplace_tasks').insert({
              creator_id: session.user.id,
              title: form.title,
              description: form.description || "Visit the link and verify completion.",
              category: form.category as any,
              target_url: form.url,
              total_quantity: form.quantity,
              remaining_quantity: form.quantity,
              price_per_action: form.pricePerAction, 
              worker_reward: form.pricePerAction * 0.7, 
              proof_type: 'ai_quiz', // Keeping key for compatibility, handled manually now
              quiz_config: quizConfig,
              timer_seconds: form.timer,
              status: 'active'
          });

          if (error) throw error;

          toast.success("Campaign Published!");
          setForm({ ...form, title: '', description: '', url: '' });
          setQuizQuestion('');
          setActiveTab('manage');
          fetchData();

      } catch (e: any) {
          toast.error("Error: " + e.message);
      }
  };

  const handleDelete = async (id: string) => {
      if(!await confirm("Delete campaign?")) return;
      await supabase.from('marketplace_tasks').delete().eq('id', id);
      fetchData();
      toast.success("Campaign Deleted");
  };

  return (
    <div className="pb-24 sm:pl-20 sm:pt-6 space-y-6 px-4 sm:px-0">
        
        {/* HEADER */}
        <div className="flex justify-between items-end pt-4">
            <div>
                <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                    <Megaphone className="text-purple-500" /> Advertise
                </h1>
                <p className="text-gray-400 text-xs">Create simple tasks with Quiz Verification.</p>
            </div>
            <div className="bg-[#111] border border-[#222] px-4 py-2 rounded-xl text-right">
                <p className="text-[10px] text-gray-500 font-bold uppercase">Ad Budget</p>
                <p className="text-white font-bold font-mono">
                    <BalanceDisplay amount={wallet?.deposit_balance || 0} isNative={true} />
                </p>
            </div>
        </div>

        {/* TABS */}
        <div className="flex bg-[#111] p-1 rounded-xl border border-[#222]">
            <button onClick={() => setActiveTab('manage')} className={`flex-1 py-2 rounded-lg text-xs font-bold uppercase transition ${activeTab === 'manage' ? 'bg-[#222] text-white' : 'text-gray-500'}`}>My Campaigns</button>
            <button onClick={() => setActiveTab('create')} className={`flex-1 py-2 rounded-lg text-xs font-bold uppercase transition ${activeTab === 'create' ? 'bg-[#222] text-white' : 'text-gray-500'}`}>Create New</button>
        </div>

        {/* --- CREATE TAB --- */}
        {activeTab === 'create' && (
            <div className="space-y-6 animate-fade-in">
                <div className="bg-[#111] border border-[#222] rounded-2xl p-6">
                    <form onSubmit={handleCreateCampaign} className="space-y-6">
                        
                        {/* Step 1: Basic Info */}
                        <div className="space-y-4">
                            <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-2">Step 1: Campaign Details</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="text-xs font-bold text-gray-400 uppercase block mb-1">Title</label>
                                    <input required type="text" value={form.title} onChange={e => setForm({...form, title: e.target.value})} className="w-full bg-black/40 border border-[#333] rounded-xl p-3 text-white text-sm focus:border-purple-500 outline-none" placeholder="e.g. Join My Channel" />
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-gray-400 uppercase block mb-1">Target URL</label>
                                    <input required type="url" value={form.url} onChange={e => setForm({...form, url: e.target.value})} className="w-full bg-black/40 border border-[#333] rounded-xl p-3 text-white text-sm focus:border-purple-500 outline-none" placeholder="https://..." />
                                </div>
                            </div>
                            
                            <div>
                                <label className="text-xs font-bold text-gray-400 uppercase block mb-1">Category</label>
                                <div className="grid grid-cols-3 gap-2">
                                    {['social', 'video', 'app', 'website', 'seo', 'review'].map(cat => (
                                        <button 
                                            key={cat}
                                            type="button"
                                            onClick={() => setForm({...form, category: cat})}
                                            className={`py-2 rounded-lg text-xs font-bold capitalize border ${form.category === cat ? 'bg-purple-600 border-purple-500 text-white' : 'bg-black/30 border-[#333] text-gray-500'}`}
                                        >
                                            {cat}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="grid grid-cols-3 gap-4">
                                <div>
                                    <label className="text-xs font-bold text-gray-400 uppercase block mb-1">Workers</label>
                                    <input required type="number" min="1" value={form.quantity} onChange={e => setForm({...form, quantity: parseInt(e.target.value)})} className="w-full bg-black/40 border border-[#333] rounded-xl p-3 text-white text-sm focus:border-purple-500 outline-none" />
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-gray-400 uppercase block mb-1">Cost/User (BDT)</label>
                                    <input required type="number" step="0.10" min="0.50" value={form.pricePerAction} onChange={e => setForm({...form, pricePerAction: parseFloat(e.target.value)})} className="w-full bg-black/40 border border-[#333] rounded-xl p-3 text-white text-sm focus:border-purple-500 outline-none" />
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-gray-400 uppercase block mb-1">Timer (s)</label>
                                    <input required type="number" value={form.timer} onChange={e => setForm({...form, timer: parseInt(e.target.value)})} className="w-full bg-black/40 border border-[#333] rounded-xl p-3 text-white text-sm focus:border-purple-500 outline-none" />
                                </div>
                            </div>
                        </div>

                        {/* Step 2: Quiz Verification */}
                        <div className="border-t border-[#222] pt-6">
                            <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-2">
                                Step 2: Verification Quiz
                            </h3>
                            <p className="text-xs text-gray-400 mb-4">
                                Create a simple question that users can answer only after completing the task (e.g., "What color is the button?").
                            </p>

                            <div className="space-y-3 bg-black/20 p-4 rounded-xl border border-[#333]">
                                <div>
                                    <label className="text-xs font-bold text-gray-400 mb-1 block">Question</label>
                                    <input 
                                        required 
                                        type="text" 
                                        value={quizQuestion} 
                                        onChange={e => setQuizQuestion(e.target.value)} 
                                        className="w-full bg-black/40 border border-[#333] rounded-lg p-2 text-sm text-white" 
                                        placeholder="e.g. What is the last word of the article?"
                                    />
                                </div>
                                
                                <div>
                                    <label className="text-xs font-bold text-gray-400 mb-1 block">Options (Select Correct)</label>
                                    <div className="space-y-2">
                                        {quizOptions.map((opt, idx) => (
                                            <div key={idx} className={`flex items-center gap-2 p-2 rounded border ${idx === correctIndex ? 'border-green-500 bg-green-500/10' : 'border-[#333]'}`}>
                                                <input 
                                                    type="radio" 
                                                    name="correctOption"
                                                    checked={idx === correctIndex}
                                                    onChange={() => setCorrectIndex(idx)}
                                                    className="accent-green-500"
                                                />
                                                <input 
                                                    type="text" 
                                                    value={opt}
                                                    onChange={e => {
                                                        const newOpts = [...quizOptions];
                                                        newOpts[idx] = e.target.value;
                                                        setQuizOptions(newOpts);
                                                    }}
                                                    className="bg-transparent outline-none w-full text-sm text-white"
                                                    placeholder={`Option ${idx + 1}`}
                                                    required
                                                />
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="flex items-center justify-between border-t border-[#222] pt-4">
                            <div className="text-xs">
                                <p className="text-gray-400">Total Cost</p>
                                <p className="text-xl font-bold text-white">৳{(form.quantity * form.pricePerAction).toFixed(2)}</p>
                            </div>
                            <button 
                                type="submit" 
                                className="px-8 py-3 bg-white text-black font-black rounded-xl hover:bg-gray-200 transition shadow-lg"
                            >
                                PUBLISH CAMPAIGN
                            </button>
                        </div>
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
                    </div>
                ) : (
                    campaigns.map(task => (
                        <GlassCard key={task.id} className="border border-[#222]">
                            <div className="flex justify-between items-start mb-3">
                                <div>
                                    <h3 className="font-bold text-white text-sm">{task.title}</h3>
                                    <p className="text-xs text-gray-500 mt-0.5 capitalize">{task.category}</p>
                                </div>
                                <div className={`px-2 py-1 rounded text-[10px] font-bold uppercase ${task.status === 'active' ? 'bg-green-900/30 text-green-400' : 'bg-red-900/30 text-red-400'}`}>
                                    {task.status}
                                </div>
                            </div>

                            <div className="bg-[#1a1a1a] rounded-lg p-3 mb-4 border border-[#333]">
                                <div className="flex justify-between text-[10px] text-gray-400 mb-1 uppercase font-bold">
                                    <span>Completed</span>
                                    <span>{task.total_quantity - task.remaining_quantity} / {task.total_quantity}</span>
                                </div>
                                <div className="h-1.5 bg-[#333] rounded-full overflow-hidden">
                                    <div 
                                        className="h-full bg-purple-500" 
                                        style={{ width: `${((task.total_quantity - task.remaining_quantity) / task.total_quantity) * 100}%` }}
                                    ></div>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4 mb-4 bg-black/20 p-2 rounded text-center">
                                <div>
                                    <p className="text-[10px] text-gray-500 uppercase">Budget</p>
                                    <p className="text-white font-mono text-sm">৳{(task.total_quantity * task.price_per_action).toFixed(2)}</p>
                                </div>
                                <div>
                                    <p className="text-[10px] text-gray-500 uppercase">User Reward</p>
                                    <p className="text-white font-mono text-sm">৳{task.worker_reward.toFixed(2)}</p>
                                </div>
                            </div>

                            <div className="flex gap-2">
                                <button 
                                    onClick={() => handleDelete(task.id)}
                                    className="p-2 bg-red-900/20 text-red-400 rounded hover:bg-red-900/30 w-full text-xs font-bold flex items-center justify-center gap-2"
                                >
                                    <Trash2 size={16}/> Delete Campaign
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
