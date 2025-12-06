
import React, { useState } from 'react';
import GlassCard from '../../components/GlassCard';
import { supabase } from '../../integrations/supabase/client';
import { 
  Megaphone, UploadCloud, Sparkles, Bot, Loader2, X, CheckCircle2,
  Image as ImageIcon, Plus, ArrowLeft
} from 'lucide-react';
import { useUI } from '../../context/UIContext';
import { analyzeTaskReference } from '../../lib/aiHelper';
import { updateWallet, createTransaction } from '../../lib/actions';
import { Link, useNavigate } from 'react-router-dom';
import { QuizConfig } from '../../types';

const CreateCampaign: React.FC = () => {
  const { toast, confirm } = useUI();
  const navigate = useNavigate();
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [screenshot, setScreenshot] = useState<File | null>(null);
  const [generatedData, setGeneratedData] = useState<{ quiz: QuizConfig, dna: any } | null>(null);
  
  const [form, setForm] = useState({
      title: '',
      description: '',
      url: '',
      category: 'website',
      quantity: 500,
      pricePerAction: 0.10, // Higher default for dealers
      timer: 30
  });

  const handleAnalyzeImage = async () => {
      if (!screenshot) { toast.error("Upload a reference screenshot."); return; }
      setIsAnalyzing(true);
      try {
          const { data: { session } } = await supabase.auth.getSession();
          if (!session) throw new Error("No session");

          const fileExt = screenshot.name.split('.').pop();
          const fileName = `dealer_ai/${session.user.id}_${Date.now()}.${fileExt}`;
          const { error: uploadError } = await supabase.storage.from('task-proofs').upload(fileName, screenshot);
          if (uploadError) throw uploadError;
          
          const { data: urlData } = supabase.storage.from('task-proofs').getPublicUrl(fileName);
          
          const result = await analyzeTaskReference(urlData.publicUrl, form.category);
          if (!result.quiz || !result.visual_dna) throw new Error("AI analysis incomplete.");

          setGeneratedData({ quiz: result.quiz, dna: result.visual_dna });
          toast.success("Visual DNA Generated!");
      } catch (e: any) {
          toast.error(e.message);
      } finally {
          setIsAnalyzing(false);
      }
  };

  const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!generatedData) { toast.error("AI Analysis required."); return; }
      
      const totalCost = form.quantity * form.pricePerAction;
      if (!await confirm(`Launch Campaign? Cost: $${totalCost.toFixed(2)}`)) return;

      try {
          const { data: { session } } = await supabase.auth.getSession();
          if (!session) return;

          // Check balance (Dealers use Deposit Balance)
          const { data: wallet } = await supabase.from('wallets').select('deposit_balance').eq('user_id', session.user.id).single();
          if (!wallet || wallet.deposit_balance < totalCost) {
              toast.error(`Insufficient Deposit Balance. Need $${totalCost.toFixed(2)}`);
              return;
          }

          // Deduct & Create
          await updateWallet(session.user.id, totalCost, 'decrement', 'deposit_balance');
          await createTransaction(session.user.id, 'invest', totalCost, `Dealer Ad: ${form.title}`);

          const { error } = await supabase.from('marketplace_tasks').insert({
              creator_id: session.user.id,
              title: form.title,
              description: form.description,
              category: form.category,
              target_url: form.url,
              total_quantity: form.quantity,
              remaining_quantity: form.quantity,
              price_per_action: form.pricePerAction,
              worker_reward: form.pricePerAction * 0.8, // 20% Platform Fee for Dealers
              proof_type: 'ai_quiz',
              quiz_config: generatedData.quiz,
              ai_reference_data: generatedData.dna,
              timer_seconds: form.timer,
              status: 'active'
          });

          if (error) throw error;
          toast.success("Campaign Live!");
          navigate('/dealer/dashboard');

      } catch (e: any) {
          toast.error(e.message);
      }
  };

  return (
    <div className="pb-24 space-y-6 animate-fade-in">
        <div className="flex items-center gap-4">
            <Link to="/dealer/dashboard" className="p-2 bg-white/10 rounded-xl hover:bg-white/20 text-white"><ArrowLeft size={20}/></Link>
            <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                <Megaphone className="text-amber-500" /> Create Campaign
            </h2>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Form */}
            <GlassCard className="border-amber-500/20">
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="text-xs font-bold text-gray-400 uppercase block mb-1">Campaign Title</label>
                        <input required type="text" value={form.title} onChange={e => setForm({...form, title: e.target.value})} className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white focus:border-amber-500 outline-none" />
                    </div>
                    <div>
                        <label className="text-xs font-bold text-gray-400 uppercase block mb-1">Target URL</label>
                        <input required type="url" value={form.url} onChange={e => setForm({...form, url: e.target.value})} className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white focus:border-amber-500 outline-none" />
                    </div>
                    <div>
                        <label className="text-xs font-bold text-gray-400 uppercase block mb-1">Description</label>
                        <textarea value={form.description} onChange={e => setForm({...form, description: e.target.value})} className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white focus:border-amber-500 outline-none resize-none h-20" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-xs font-bold text-gray-400 uppercase block mb-1">Total Users</label>
                            <input required type="number" min="100" value={form.quantity} onChange={e => setForm({...form, quantity: parseInt(e.target.value)})} className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white focus:border-amber-500 outline-none" />
                        </div>
                        <div>
                            <label className="text-xs font-bold text-gray-400 uppercase block mb-1">Cost Per User ($)</label>
                            <input required type="number" step="0.01" min="0.05" value={form.pricePerAction} onChange={e => setForm({...form, pricePerAction: parseFloat(e.target.value)})} className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white focus:border-amber-500 outline-none" />
                        </div>
                    </div>
                    <div className="bg-amber-900/10 border border-amber-500/20 p-3 rounded-xl flex justify-between items-center">
                        <span className="text-xs text-amber-500 font-bold uppercase">Total Budget</span>
                        <span className="text-xl font-bold text-white">${(form.quantity * form.pricePerAction).toFixed(2)}</span>
                    </div>
                </form>
            </GlassCard>

            {/* AI Setup */}
            <div className="space-y-6">
                <GlassCard className="border-purple-500/20 bg-purple-900/5">
                    <h3 className="text-sm font-bold text-white uppercase mb-4 flex items-center gap-2">
                        <Bot className="text-purple-400"/> AI Verification Setup
                    </h3>
                    
                    <label className="flex flex-col items-center justify-center w-full h-40 border-2 border-dashed border-white/10 rounded-xl cursor-pointer hover:border-purple-500/50 hover:bg-purple-900/10 transition relative overflow-hidden bg-black/20">
                        {screenshot ? (
                            <div className="absolute inset-0 flex items-center justify-center bg-black/60 z-10">
                                <p className="text-white text-xs font-bold flex items-center gap-2"><CheckCircle2 className="text-green-500"/> {screenshot.name}</p>
                            </div>
                        ) : (
                            <div className="text-center">
                                <UploadCloud className="mx-auto text-gray-500 mb-2"/>
                                <p className="text-xs text-gray-400">Upload "Proof" Screenshot</p>
                            </div>
                        )}
                        <input type="file" accept="image/*" className="hidden" onChange={e => e.target.files && setScreenshot(e.target.files[0])} />
                    </label>

                    <button 
                        type="button"
                        onClick={handleAnalyzeImage}
                        disabled={isAnalyzing || !screenshot}
                        className="w-full mt-4 py-3 bg-purple-600 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 hover:bg-purple-500 disabled:opacity-50 transition"
                    >
                        {isAnalyzing ? <Loader2 className="animate-spin" size={16}/> : <Sparkles size={16}/>} Generate Visual DNA
                    </button>
                </GlassCard>

                {generatedData && (
                    <div className="p-4 rounded-xl border border-green-500/30 bg-green-900/10">
                        <div className="flex items-center gap-2 mb-2 text-green-400">
                            <CheckCircle2 size={18} />
                            <span className="text-sm font-bold uppercase">Ready to Launch</span>
                        </div>
                        <p className="text-xs text-gray-400">AI has extracted verification points. Click below to go live.</p>
                        <button 
                            onClick={handleSubmit}
                            className="w-full mt-4 py-4 bg-amber-500 text-black font-black text-lg rounded-xl hover:bg-amber-400 transition shadow-lg shadow-amber-500/20 uppercase"
                        >
                            Launch Campaign
                        </button>
                    </div>
                )}
            </div>
        </div>
    </div>
  );
};

export default CreateCampaign;
