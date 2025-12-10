
import React, { useEffect, useState } from 'react';
import GlassCard from '../components/GlassCard';
import { 
  Megaphone, DollarSign, Globe, Trash2,
  UploadCloud, Loader2, RefreshCw, X, CheckCircle2,
  Image as ImageIcon, Video, Youtube, PlayCircle
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
  const [adType, setAdType] = useState<'task' | 'video'>('task');
  const [loading, setLoading] = useState(true);
  const [campaigns, setCampaigns] = useState<any[]>([]);
  
  // Common Form
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [url, setUrl] = useState('');
  const [quantity, setQuantity] = useState<number>(100);
  const [budget, setBudget] = useState<string>(''); // For Videos, budget is primary
  const [cpv, setCpv] = useState<string>(''); // Cost per View/Action
  
  // Task Specific
  const [category, setCategory] = useState('social');
  const [quizQuestion, setQuizQuestion] = useState('');
  const [quizOptions, setQuizOptions] = useState(['', '', '']);
  const [correctIndex, setCorrectIndex] = useState(0);
  const [taskTimer, setTaskTimer] = useState(15);

  // Video Specific
  const [videoDuration, setVideoDuration] = useState(60);
  const [videoPreview, setVideoPreview] = useState<string>('');

  useEffect(() => {
    fetchData();
  }, []);

  // Auto-generate thumbnail for YouTube
  useEffect(() => {
      if (adType === 'video' && url) {
          const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|shorts\/))([\w-]{11})/);
          if (match && match[1]) {
              setVideoPreview(`https://img.youtube.com/vi/${match[1]}/mqdefault.jpg`);
          } else {
              setVideoPreview('');
          }
      }
  }, [url, adType]);

  const fetchData = async () => {
    setLoading(true);
    try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
            const { data: w } = await supabase.from('wallets').select('*').eq('user_id', session.user.id).single();
            if (w) setWallet(w as WalletData);

            // Fetch Tasks
            const { data: tasks } = await supabase.from('marketplace_tasks')
                .select('*, type:category') // Alias for unification
                .eq('creator_id', session.user.id);
            
            // Fetch Videos
            const { data: videos } = await supabase.from('video_ads')
                .select('*')
                .eq('creator_id', session.user.id);

            // Merge for display
            const all = [
                ...(tasks || []).map((t:any) => ({...t, itemType: 'task'})),
                ...(videos || []).map((v:any) => ({...v, itemType: 'video', category: 'video'}))
            ].sort((a,b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
            
            setCampaigns(all);
        }
    } catch (e) {
        console.error(e);
    } finally {
        setLoading(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!wallet) return;

      const costPerUnit = parseFloat(cpv);
      let totalCost = 0;
      let calculatedQty = quantity;

      if (isNaN(costPerUnit) || costPerUnit <= 0) {
          toast.error("Invalid Cost Per Action/View");
          return;
      }

      if (adType === 'task') {
          totalCost = quantity * costPerUnit;
          if (!quizQuestion) { toast.error("Quiz required for tasks"); return; }
      } else {
          // Video Logic: User sets Total Budget and CPV
          const totalBudget = parseFloat(budget);
          if (isNaN(totalBudget) || totalBudget <= 0) { toast.error("Invalid Budget"); return; }
          totalCost = totalBudget;
          calculatedQty = Math.floor(totalBudget / costPerUnit);
          if (calculatedQty < 10) { toast.error("Budget too low for CPV. Minimum 10 views."); return; }
      }

      if (wallet.deposit_balance < totalCost) {
          toast.error(`Insufficient Deposit Balance. Need ৳${totalCost.toFixed(2)}`);
          return;
      }

      if (!await confirm(`Launch ${adType.toUpperCase()} Campaign? \nCost: ৳${totalCost.toFixed(2)} \nQty: ${calculatedQty}`)) return;

      try {
          const { data: { session } } = await supabase.auth.getSession();
          if (!session) return;

          // Deduct
          await updateWallet(session.user.id, totalCost, 'decrement', 'deposit_balance');
          await createTransaction(session.user.id, 'invest', totalCost, `Ads: ${title}`);

          // Get User Name for Company Display
          const { data: profile } = await supabase.from('profiles').select('name_1').eq('id', session.user.id).single();
          const companyName = profile?.name_1 || 'Advertiser';

          if (adType === 'task') {
              const quizConfig: QuizConfig = { question: quizQuestion, options: quizOptions, correct_index: correctIndex };
              
              await supabase.from('marketplace_tasks').insert({
                  creator_id: session.user.id,
                  title,
                  description: description || "Complete task",
                  category: category as any,
                  target_url: url,
                  total_quantity: quantity,
                  remaining_quantity: quantity,
                  price_per_action: costPerUnit,
                  worker_reward: costPerUnit * 0.7, // 30% Fee
                  proof_type: 'ai_quiz',
                  quiz_config: quizConfig,
                  timer_seconds: taskTimer,
                  status: 'active',
                  company_name: companyName // Added company_name
              });
          } else {
              // Video Ad Insert
              await supabase.from('video_ads').insert({
                  creator_id: session.user.id,
                  title,
                  video_url: url,
                  thumbnail_url: videoPreview,
                  duration: videoDuration,
                  total_budget: totalCost,
                  remaining_budget: totalCost,
                  cost_per_view: costPerUnit * 0.7, // User gets 70% of CPV
                  status: 'active'
              });
          }

          toast.success("Campaign Live!");
          resetForm();
          setActiveTab('manage');
          fetchData();

      } catch (e: any) {
          toast.error(e.message);
      }
  };

  const resetForm = () => {
      setTitle(''); setUrl(''); setDescription('');
      setBudget(''); setCpv(''); setQuantity(100);
      setVideoPreview('');
  };

  const handleDelete = async (item: any) => {
      if(!await confirm("Delete campaign? Unspent budget is NOT automatically refunded.")) return;
      
      const table = item.itemType === 'video' ? 'video_ads' : 'marketplace_tasks';
      await supabase.from(table).delete().eq('id', item.id);
      fetchData();
      toast.success("Deleted");
  };

  return (
    <div className="pb-24 sm:pl-20 sm:pt-6 space-y-6 px-4 sm:px-0">
        
        <div className="flex justify-between items-end pt-4">
            <div>
                <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                    <Megaphone className="text-purple-500" /> Advertiser
                </h1>
                <p className="text-gray-400 text-xs">Promote your content or tasks.</p>
            </div>
            <div className="bg-[#111] border border-[#222] px-4 py-2 rounded-xl text-right">
                <p className="text-[10px] text-gray-500 font-bold uppercase">Ad Funds</p>
                <p className="text-white font-bold font-mono">
                    <BalanceDisplay amount={wallet?.deposit_balance || 0} isNative={true} />
                </p>
            </div>
        </div>

        <div className="flex bg-[#111] p-1 rounded-xl border border-[#222]">
            <button onClick={() => setActiveTab('manage')} className={`flex-1 py-2 rounded-lg text-xs font-bold uppercase transition ${activeTab === 'manage' ? 'bg-[#222] text-white' : 'text-gray-500'}`}>My Ads</button>
            <button onClick={() => setActiveTab('create')} className={`flex-1 py-2 rounded-lg text-xs font-bold uppercase transition ${activeTab === 'create' ? 'bg-[#222] text-white' : 'text-gray-500'}`}>Create New</button>
        </div>

        {/* --- CREATE FORM --- */}
        {activeTab === 'create' && (
            <div className="space-y-6 animate-fade-in">
                
                {/* Type Selection */}
                <div className="grid grid-cols-2 gap-4">
                    <div onClick={() => setAdType('task')} className={`cursor-pointer p-4 rounded-xl border flex items-center gap-3 transition ${adType === 'task' ? 'bg-blue-600/20 border-blue-500 text-white' : 'bg-[#111] border-[#222] text-gray-500'}`}>
                        <Globe size={24} />
                        <div>
                            <h4 className="font-bold text-sm">Website/Task</h4>
                            <p className="text-[10px]">Visits, Signups, Quiz</p>
                        </div>
                    </div>
                    <div onClick={() => setAdType('video')} className={`cursor-pointer p-4 rounded-xl border flex items-center gap-3 transition ${adType === 'video' ? 'bg-red-600/20 border-red-500 text-white' : 'bg-[#111] border-[#222] text-gray-500'}`}>
                        <Youtube size={24} />
                        <div>
                            <h4 className="font-bold text-sm">Video Ad</h4>
                            <p className="text-[10px]">YouTube Views, Watchtime</p>
                        </div>
                    </div>
                </div>

                <GlassCard className="border-[#222]">
                    <form onSubmit={handleCreate} className="space-y-5">
                        
                        {/* 1. CREATIVE */}
                        <div className="space-y-4">
                            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest border-b border-white/5 pb-2">Creative Details</h3>
                            
                            <div>
                                <label className="text-xs font-bold text-gray-400 block mb-1">Target URL</label>
                                <input required type="url" value={url} onChange={e => setUrl(e.target.value)} className="w-full bg-black/40 border border-[#333] rounded-xl p-3 text-white text-sm focus:border-purple-500 outline-none" placeholder={adType === 'video' ? "https://youtube.com/watch?v=..." : "https://mysite.com"} />
                            </div>

                            {/* Video Preview */}
                            {adType === 'video' && videoPreview && (
                                <div className="aspect-video w-full rounded-lg overflow-hidden bg-black border border-[#333] relative">
                                    <img src={videoPreview} className="w-full h-full object-cover opacity-60" />
                                    <div className="absolute inset-0 flex items-center justify-center">
                                        <PlayCircle size={40} className="text-white/80" />
                                    </div>
                                    <p className="absolute bottom-2 left-2 text-[10px] text-white bg-black/50 px-2 py-1 rounded">Preview</p>
                                </div>
                            )}

                            <div>
                                <label className="text-xs font-bold text-gray-400 block mb-1">Campaign Title</label>
                                <input required type="text" value={title} onChange={e => setTitle(e.target.value)} className="w-full bg-black/40 border border-[#333] rounded-xl p-3 text-white text-sm focus:border-purple-500 outline-none" placeholder="e.g. Watch my new vlog" />
                            </div>

                            {adType === 'task' && (
                                <div>
                                    <label className="text-xs font-bold text-gray-400 block mb-1">Category</label>
                                    <select value={category} onChange={e => setCategory(e.target.value)} className="w-full bg-black/40 border border-[#333] rounded-xl p-3 text-white text-sm focus:border-purple-500 outline-none">
                                        <option value="social">Social Media</option>
                                        <option value="website">Website Visit</option>
                                        <option value="app">App Download</option>
                                    </select>
                                </div>
                            )}
                        </div>

                        {/* 2. BUDGET & SETTINGS */}
                        <div className="space-y-4">
                            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest border-b border-white/5 pb-2">Budget & Constraints</h3>
                            
                            <div className="grid grid-cols-2 gap-4">
                                {adType === 'task' ? (
                                    <>
                                        <div>
                                            <label className="text-xs font-bold text-gray-400 block mb-1">Quantity</label>
                                            <input required type="number" min="10" value={quantity} onChange={e => setQuantity(parseInt(e.target.value))} className="w-full bg-black/40 border border-[#333] rounded-xl p-3 text-white text-sm outline-none" />
                                        </div>
                                        <div>
                                            <label className="text-xs font-bold text-gray-400 block mb-1">Cost Per User (BDT)</label>
                                            <input required type="number" step="0.1" value={cpv} onChange={e => setCpv(e.target.value)} className="w-full bg-black/40 border border-[#333] rounded-xl p-3 text-white text-sm outline-none" placeholder="2.00" />
                                        </div>
                                    </>
                                ) : (
                                    <>
                                        <div>
                                            <label className="text-xs font-bold text-gray-400 block mb-1">Total Budget (BDT)</label>
                                            <input required type="number" value={budget} onChange={e => setBudget(e.target.value)} className="w-full bg-black/40 border border-[#333] rounded-xl p-3 text-white text-sm outline-none" placeholder="500" />
                                        </div>
                                        <div>
                                            <label className="text-xs font-bold text-gray-400 block mb-1">Cost Per View (CPV)</label>
                                            <input required type="number" step="0.1" value={cpv} onChange={e => setCpv(e.target.value)} className="w-full bg-black/40 border border-[#333] rounded-xl p-3 text-white text-sm outline-none" placeholder="0.50" />
                                        </div>
                                    </>
                                )}
                            </div>

                            <div>
                                <label className="text-xs font-bold text-gray-400 block mb-1">{adType === 'video' ? 'Watch Duration (Sec)' : 'Wait Timer (Sec)'}</label>
                                <input 
                                    required type="number" 
                                    value={adType === 'video' ? videoDuration : taskTimer} 
                                    onChange={e => adType === 'video' ? setVideoDuration(parseInt(e.target.value)) : setTaskTimer(parseInt(e.target.value))}
                                    className="w-full bg-black/40 border border-[#333] rounded-xl p-3 text-white text-sm outline-none" 
                                />
                            </div>
                        </div>

                        {/* 3. VERIFICATION (Task Only) */}
                        {adType === 'task' && (
                            <div className="space-y-4 bg-black/20 p-4 rounded-xl border border-[#333]">
                                <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest">Proof Validation</h3>
                                <input required type="text" value={quizQuestion} onChange={e => setQuizQuestion(e.target.value)} className="w-full bg-black/40 border border-[#333] rounded-lg p-2 text-sm text-white" placeholder="Quiz Question (e.g. Last word of page?)" />
                                <div className="space-y-2">
                                    {quizOptions.map((opt, idx) => (
                                        <div key={idx} className={`flex items-center gap-2 ${idx === correctIndex ? 'text-green-400' : 'text-gray-500'}`}>
                                            <input type="radio" checked={idx === correctIndex} onChange={() => setCorrectIndex(idx)} className="accent-green-500"/>
                                            <input type="text" value={opt} onChange={e => { const n = [...quizOptions]; n[idx] = e.target.value; setQuizOptions(n); }} className="bg-transparent border-b border-[#333] w-full text-sm outline-none" placeholder={`Option ${idx+1}`} required />
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Summary */}
                        <div className="bg-[#1a1a1a] p-4 rounded-xl border border-[#333] flex justify-between items-center">
                            <div>
                                <p className="text-xs text-gray-500 uppercase">Estimated Views/Actions</p>
                                <p className="text-white font-bold text-lg">
                                    {adType === 'task' ? quantity : (parseFloat(budget) && parseFloat(cpv) ? Math.floor(parseFloat(budget)/parseFloat(cpv)) : 0)}
                                </p>
                            </div>
                            <div className="text-right">
                                <p className="text-xs text-gray-500 uppercase">Total Cost</p>
                                <p className="text-white font-mono font-bold text-xl">
                                    ৳{adType === 'task' ? (quantity * (parseFloat(cpv)||0)).toFixed(2) : parseFloat(budget || '0').toFixed(2)}
                                </p>
                            </div>
                        </div>

                        <button type="submit" className="w-full py-4 bg-white text-black font-black rounded-xl hover:bg-gray-200 transition shadow-lg uppercase tracking-wider">
                            Launch Campaign
                        </button>
                    </form>
                </GlassCard>
            </div>
        )}

        {/* --- MANAGE TAB --- */}
        {activeTab === 'manage' && (
            <div className="space-y-4 animate-fade-in">
                {campaigns.length === 0 ? (
                    <div className="text-center py-12 bg-[#111] rounded-2xl border border-[#222]">
                        <p className="text-gray-500 text-sm">No active campaigns.</p>
                    </div>
                ) : (
                    campaigns.map(item => (
                        <GlassCard key={item.id} className="border border-[#222]">
                            <div className="flex justify-between items-start mb-2">
                                <div className="flex items-center gap-3">
                                    <div className={`p-2 rounded-lg ${item.itemType === 'video' ? 'bg-red-500/10 text-red-500' : 'bg-blue-500/10 text-blue-500'}`}>
                                        {item.itemType === 'video' ? <Video size={18}/> : <Globe size={18}/>}
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-white text-sm">{item.title}</h3>
                                        <p className="text-xs text-gray-500 capitalize">{item.status}</p>
                                    </div>
                                </div>
                                <button onClick={() => handleDelete(item)} className="text-red-400 hover:text-white p-2"><Trash2 size={16}/></button>
                            </div>
                            
                            {/* Stats */}
                            <div className="grid grid-cols-3 gap-2 mt-4 text-center">
                                <div className="bg-[#111] p-2 rounded border border-[#222]">
                                    <p className="text-[9px] text-gray-500 uppercase">Budget</p>
                                    <p className="text-white font-mono text-xs">
                                        ৳{item.itemType === 'video' ? item.total_budget : (item.total_quantity * item.price_per_action)}
                                    </p>
                                </div>
                                <div className="bg-[#111] p-2 rounded border border-[#222]">
                                    <p className="text-[9px] text-gray-500 uppercase">Remaining</p>
                                    <p className="text-white font-mono text-xs">
                                        {item.itemType === 'video' ? `৳${item.remaining_budget.toFixed(2)}` : item.remaining_quantity}
                                    </p>
                                </div>
                                <div className="bg-[#111] p-2 rounded border border-[#222]">
                                    <p className="text-[9px] text-gray-500 uppercase">CPV/CPA</p>
                                    <p className="text-white font-mono text-xs">
                                        ৳{item.itemType === 'video' ? item.cost_per_view : item.price_per_action}
                                    </p>
                                </div>
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
