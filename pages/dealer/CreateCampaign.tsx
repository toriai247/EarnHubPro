
import React, { useState } from 'react';
import GlassCard from '../../components/GlassCard';
import { supabase } from '../../integrations/supabase/client';
import { Megaphone, ArrowLeft } from 'lucide-react';
import { useUI } from '../../context/UIContext';
import { updateWallet, createTransaction } from '../../lib/actions';
import { Link, useNavigate } from 'react-router-dom';
import { QuizConfig } from '../../types';

const CreateCampaign: React.FC = () => {
  const { toast, confirm } = useUI();
  const navigate = useNavigate();
  
  const [form, setForm] = useState({
      title: '',
      description: '',
      url: '',
      category: 'website',
      quantity: 500,
      pricePerAction: 5.00, // Dealer Default BDT
      timer: 30
  });

  const [quizQuestion, setQuizQuestion] = useState('');
  const [quizOptions, setQuizOptions] = useState(['', '', '']);
  const [correctIndex, setCorrectIndex] = useState(0);

  const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      
      if (!quizQuestion || quizOptions.some(o => !o.trim())) {
          toast.error("Please set a validation quiz.");
          return;
      }

      const totalCost = form.quantity * form.pricePerAction;
      if (!await confirm(`Launch Campaign? Cost: ৳${totalCost.toFixed(2)}`)) return;

      try {
          const { data: { session } } = await supabase.auth.getSession();
          if (!session) return;

          // 1. Fetch Profile for Company Name
          const { data: profile } = await supabase.from('profiles').select('name_1, is_dealer').eq('id', session.user.id).single();
          const companyName = profile?.name_1 || 'Dealer';

          // 2. Check balance (Dealers use Deposit Balance)
          const { data: wallet } = await supabase.from('wallets').select('deposit_balance').eq('user_id', session.user.id).single();
          if (!wallet || wallet.deposit_balance < totalCost) {
              toast.error(`Insufficient Deposit Balance. Need ৳${totalCost.toFixed(2)}`);
              return;
          }

          // 3. Deduct & Create
          await updateWallet(session.user.id, totalCost, 'decrement', 'deposit_balance');
          await createTransaction(session.user.id, 'invest', totalCost, `Dealer Ad: ${form.title}`);

          const quizConfig: QuizConfig = {
              question: quizQuestion,
              options: quizOptions,
              correct_index: correctIndex
          };

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
              quiz_config: quizConfig,
              timer_seconds: form.timer,
              status: 'active',
              company_name: companyName, // Added column
              is_featured: false // Default false
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
                        <label className="text-xs font-bold text-gray-400 uppercase block mb-1">Cost Per User (BDT)</label>
                        <input required type="number" step="0.50" min="1.00" value={form.pricePerAction} onChange={e => setForm({...form, pricePerAction: parseFloat(e.target.value)})} className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white focus:border-amber-500 outline-none" />
                    </div>
                </div>

                {/* Validation Quiz Setup */}
                <div className="border-t border-[#222] pt-6 mt-6">
                    <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-2">
                        Verification Quiz
                    </h3>
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
                                    <div key={idx} className={`flex items-center gap-2 p-2 rounded border ${idx === correctIndex ? 'border-amber-500 bg-amber-500/10' : 'border-[#333]'}`}>
                                        <input 
                                            type="radio" 
                                            name="correctOption"
                                            checked={idx === correctIndex}
                                            onChange={() => setCorrectIndex(idx)}
                                            className="accent-amber-500"
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

                <div className="bg-amber-900/10 border border-amber-500/20 p-3 rounded-xl flex justify-between items-center mt-6">
                    <span className="text-xs text-amber-500 font-bold uppercase">Total Budget</span>
                    <span className="text-xl font-bold text-white">৳{(form.quantity * form.pricePerAction).toFixed(2)}</span>
                </div>

                <button type="submit" className="w-full py-3 bg-amber-500 text-black font-bold rounded-xl hover:bg-amber-400 transition flex items-center justify-center gap-2 shadow-lg mt-4">
                    Launch Campaign
                </button>
            </form>
        </GlassCard>
    </div>
  );
};

export default CreateCampaign;
