
import React, { useEffect, useState } from 'react';
import GlassCard from '../components/GlassCard';
import { 
  Megaphone, Plus, DollarSign, Globe, Trash2, Pause, Play, 
  Calculator, UploadCloud, Sparkles, Bot, Loader2, RefreshCw, X, CheckCircle2,
  Image as ImageIcon
} from 'lucide-react';
import { supabase } from '../integrations/supabase/client';
import { WalletData, MarketTask, QuizConfig } from '../types';
import { updateWallet, createTransaction } from '../lib/actions';
import { useUI } from '../context/UIContext';
import BalanceDisplay from '../components/BalanceDisplay';
import { analyzeTaskReference } from '../lib/aiHelper';

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
      category: 'social', // Default to social
      quantity: 100,
      pricePerAction: 0.05,
      timer: 15
  });
  
  // AI Quiz Generator State
  const [screenshot, setScreenshot] = useState<File | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [generatedData, setGeneratedData] = useState<{ quiz: QuizConfig, dna: any } | null>(null);
  
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

  const handleAnalyzeImage = async () => {
      if (!screenshot) {
          toast.error("Please upload a screenshot first.");
          return;
      }
      setIsAnalyzing(true);
      try {
          const { data: { session } } = await supabase.auth.getSession();
          if (!session) throw new Error("No session");

          // 1. Upload
          const fileExt = screenshot.name.split('.').pop();
          const fileName = `temp_ai/${session.user.id}_${Date.now()}.${fileExt}`;
          const { error: uploadError } = await supabase.storage.from('task-proofs').upload(fileName, screenshot);
          if (uploadError) throw uploadError;
          
          const { data: urlData } = supabase.storage.from('task-proofs').getPublicUrl(fileName);
          const imageUrl = urlData.publicUrl;

          // 2. Analyze Reference (Quiz + DNA)
          const result = await analyzeTaskReference(imageUrl, form.category);
          
          if (!result.quiz || !result.visual_dna) {
              throw new Error("AI could not extract enough data. Try a clearer image.");
          }

          setGeneratedData({
              quiz: result.quiz,
              dna: result.visual_dna
          });
          toast.success("AI Analysis Complete!");

      } catch (e: any) {
          toast.error("Analysis Failed: " + e.message);
      } finally {
          setIsAnalyzing(false);
      }
  };

  const handleCreateCampaign = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!wallet) return;
      
      const totalBudget = form.quantity * form.pricePerAction;
      if (wallet.deposit_balance < totalBudget) {
          toast.error(`Insufficient Deposit Balance. Need $${totalBudget.toFixed(2)}`);
          return;
      }

      if (!generatedData) {
          toast.error("Please analyze a screenshot first to generate AI Verification data.");
          return;
      }

      if (!await confirm(`Publish Campaign? Total Cost: $${totalBudget.toFixed(2)}`)) return;

      try {
          const { data: { session } } = await supabase.auth.getSession();
          if (!session) return;

          await updateWallet(session.user.id, totalBudget, 'decrement', 'deposit_balance');
          await createTransaction(session.user.id, 'invest', totalBudget, `Ad Campaign: ${form.title}`);

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
              proof_type: 'ai_quiz',
              quiz_config: generatedData.quiz,
              ai_reference_data: generatedData.dna, // SAVE THE VISUAL DNA
              timer_seconds: form.timer,
              status: 'active'
          });

          if (error) throw error;

          toast.success("Campaign Published!");
          setForm({ ...form, title: '', description: '', url: '' });
          setGeneratedData(null);
          setScreenshot(null);
          setActiveTab('manage');
          fetchData();

      } catch (e: any) {
          if (e.message?.includes('violates check constraint')) {
             toast.error("Database Update Required: Run 'Factory Reset: Task System V4.1' in Admin.");
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

  return (
    <div className="pb-24 sm:pl-20 sm:pt-6 space-y-6 px-4 sm:px-0">
        
        {/* HEADER */}
        <div className="flex justify-between items-end pt-4">
            <div>
                <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                    <Megaphone className="text-purple-500" /> Advertise AI
                </h1>
                <p className="text-gray-400 text-xs">Smart campaigns with Visual Matching & Quiz Verification.</p>
            </div>
            <div className="bg-[#111] border border-[#222] px-4 py-2 rounded-xl text-right">
                <p className="text-[10px] text-gray-500 font-bold uppercase">Ad Budget</p>
                <p className="text-white font-bold font-mono"><BalanceDisplay amount={wallet?.deposit_balance || 0} /></p>
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
                                <label className="text-xs font-bold text-gray-400 uppercase block mb-1">Category (Required for AI)</label>
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
                                    <label className="text-xs font-bold text-gray-400 uppercase block mb-1">Cost/User</label>
                                    <input required type="number" step="0.001" value={form.pricePerAction} onChange={e => setForm({...form, pricePerAction: parseFloat(e.target.value)})} className="w-full bg-black/40 border border-[#333] rounded-xl p-3 text-white text-sm focus:border-purple-500 outline-none" />
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-gray-400 uppercase block mb-1">Timer (s)</label>
                                    <input required type="number" value={form.timer} onChange={e => setForm({...form, timer: parseInt(e.target.value)})} className="w-full bg-black/40 border border-[#333] rounded-xl p-3 text-white text-sm focus:border-purple-500 outline-none" />
                                </div>
                            </div>
                        </div>

                        {/* Step 2: AI Verification Setup */}
                        <div className="border-t border-[#222] pt-6">
                            <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-2 flex items-center gap-2">
                                <Sparkles className="text-purple-400" size={16}/> Step 2: AI Reference Analysis
                            </h3>
                            <p className="text-xs text-gray-400 mb-4">
                                Upload a "Proof" screenshot (e.g. Subscribed state). The AI will extract a <strong>Visual DNA</strong> profile and a Quiz Question. Workers must match this DNA or answer the quiz.
                            </p>

                            <div className="flex flex-col md:flex-row gap-6">
                                {/* Upload Box */}
                                <div className="md:w-1/3">
                                    <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-[#333] rounded-xl cursor-pointer hover:border-purple-500/50 hover:bg-purple-900/10 transition relative overflow-hidden">
                                        {screenshot ? (
                                            <div className="absolute inset-0 flex items-center justify-center bg-black/50 z-10">
                                                <p className="text-white text-xs font-bold">{screenshot.name}</p>
                                            </div>
                                        ) : (
                                            <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                                <UploadCloud className="text-gray-400 mb-2"/>
                                                <p className="text-xs text-gray-500">Upload Reference Image</p>
                                            </div>
                                        )}
                                        <input type="file" accept="image/*" className="hidden" onChange={e => e.target.files && setScreenshot(e.target.files[0])} />
                                    </label>
                                    
                                    <button 
                                        type="button"
                                        onClick={handleAnalyzeImage}
                                        disabled={isAnalyzing || !screenshot}
                                        className="w-full mt-3 py-2 bg-purple-600 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 hover:bg-purple-500 disabled:opacity-50"
                                    >
                                        {isAnalyzing ? <Loader2 className="animate-spin" size={14}/> : <Bot size={14}/>} Analyze Reference
                                    </button>
                                </div>

                                {/* Preview Data */}
                                <div className="md:w-2/3 bg-black/20 border border-[#333] rounded-xl p-4 relative">
                                    {!generatedData ? (
                                        <div className="flex flex-col items-center justify-center h-full text-gray-600">
                                            <ImageIcon size={32} className="opacity-20 mb-2"/>
                                            <p className="text-xs">Analysis results will appear here.</p>
                                        </div>
                                    ) : (
                                        <div className="space-y-3">
                                            <div className="flex justify-between items-start">
                                                <h4 className="text-sm font-bold text-white flex items-center gap-2"><CheckCircle2 className="text-green-400" size={14}/> AI Profile Generated</h4>
                                                <button type="button" onClick={() => setGeneratedData(null)} className="text-gray-500 hover:text-white"><X size={14}/></button>
                                            </div>
                                            
                                            <div className="bg-black/30 p-2 rounded text-[10px] text-gray-400 font-mono">
                                                DNA Extracted: {Object.keys(generatedData.dna).length} features (Colors, Text, UI Status).
                                            </div>

                                            <div className="mt-2">
                                                <p className="text-xs font-bold text-gray-300 mb-1">Auto-Generated Quiz:</p>
                                                <input 
                                                    type="text" 
                                                    value={generatedData.quiz.question}
                                                    onChange={e => setGeneratedData({...generatedData, quiz: {...generatedData.quiz, question: e.target.value}})}
                                                    className="w-full bg-black/40 border border-[#333] rounded-lg p-2 text-xs text-white mb-2"
                                                />
                                                <div className="grid grid-cols-2 gap-2">
                                                    {generatedData.quiz.options.map((opt, idx) => (
                                                        <div key={idx} className={`p-1.5 rounded border text-xs flex items-center gap-2 ${idx === generatedData.quiz.correct_index ? 'border-green-500 bg-green-900/20' : 'border-[#333]'}`}>
                                                            <input 
                                                                type="radio" 
                                                                checked={idx === generatedData.quiz.correct_index}
                                                                onChange={() => setGeneratedData({...generatedData, quiz: {...generatedData.quiz, correct_index: idx}})}
                                                                className="accent-green-500"
                                                            />
                                                            <input 
                                                                type="text" 
                                                                value={opt}
                                                                onChange={e => {
                                                                    const newOpts = [...generatedData.quiz.options];
                                                                    newOpts[idx] = e.target.value;
                                                                    setGeneratedData({...generatedData, quiz: {...generatedData.quiz, options: newOpts}});
                                                                }}
                                                                className="bg-transparent outline-none w-full text-gray-300"
                                                            />
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="flex items-center justify-between border-t border-[#222] pt-4">
                            <div className="text-xs">
                                <p className="text-gray-400">Total Cost</p>
                                <p className="text-xl font-bold text-white">${(form.quantity * form.pricePerAction).toFixed(2)}</p>
                            </div>
                            <button 
                                type="submit" 
                                disabled={!generatedData}
                                className="px-8 py-3 bg-white text-black font-black rounded-xl hover:bg-gray-200 transition shadow-lg disabled:opacity-50"
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
                                    <p className="text-xs text-gray-500 mt-0.5 capitalize">{task.category} • {task.proof_type === 'ai_quiz' ? 'AI Auto-Verify' : 'Manual'}</p>
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
