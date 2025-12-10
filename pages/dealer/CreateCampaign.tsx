
import React, { useState, useEffect } from 'react';
import GlassCard from '../../components/GlassCard';
import { supabase } from '../../integrations/supabase/client';
import { Megaphone, ArrowLeft, Type, BrainCircuit, Clock, FileCheck, Upload } from 'lucide-react';
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
      pricePerAction: 5.00,
      timer: 30
  });

  const [proofType, setProofType] = useState<'ai_quiz' | 'text_input' | 'file_check'>('ai_quiz');
  
  // Quiz State
  const [quizQuestion, setQuizQuestion] = useState('');
  const [quizOptions, setQuizOptions] = useState(['', '', '']);
  const [correctIndex, setCorrectIndex] = useState(0);

  // Manual Text State
  const [manualQuestion, setManualQuestion] = useState('');
  const [autoApproveHours, setAutoApproveHours] = useState(24);

  // File Check State
  const [expectedFileName, setExpectedFileName] = useState('');

  // Commission Config
  const [userSharePercent, setUserSharePercent] = useState(0.9); // Default 90%

  useEffect(() => {
      // Fetch System Commission Config
      const fetchConfig = async () => {
          const { data } = await supabase.from('system_config').select('task_commission_percent').maybeSingle();
          if (data && data.task_commission_percent) {
              setUserSharePercent(data.task_commission_percent / 100);
          }
      };
      fetchConfig();
  }, []);

  const handleFileHelper = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files[0]) {
          setExpectedFileName(e.target.files[0].name);
          toast.success("Filename auto-detected!");
      }
  };

  const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      
      if (proofType === 'ai_quiz') {
          if (!quizQuestion || quizOptions.some(o => !o.trim())) {
              toast.error("Please set a valid quiz.");
              return;
          }
      } else if (proofType === 'text_input') {
          if (!manualQuestion.trim()) {
              toast.error("Please provide instructions for the user input.");
              return;
          }
      } else if (proofType === 'file_check') {
          if (!expectedFileName.trim()) {
              toast.error("Please set the expected filename.");
              return;
          }
      }

      const totalCost = form.quantity * form.pricePerAction;
      const workerReward = form.pricePerAction * userSharePercent;

      if (!await confirm(`Launch Campaign? \nCost: ৳${totalCost.toFixed(2)} \nUser Earns: ৳${workerReward.toFixed(2)}/task`)) return;

      try {
          const { data: { session } } = await supabase.auth.getSession();
          if (!session) return;

          const { data: profile } = await supabase.from('profiles').select('name_1, is_dealer').eq('id', session.user.id).single();
          const companyName = profile?.name_1 || 'Dealer';

          const { data: wallet } = await supabase.from('wallets').select('deposit_balance').eq('user_id', session.user.id).single();
          if (!wallet || wallet.deposit_balance < totalCost) {
              toast.error(`Insufficient Deposit Balance. Need ৳${totalCost.toFixed(2)}`);
              return;
          }

          await updateWallet(session.user.id, totalCost, 'decrement', 'deposit_balance');
          await createTransaction(session.user.id, 'invest', totalCost, `Dealer Ad: ${form.title}`);

          const quizConfig: QuizConfig | null = proofType === 'ai_quiz' ? {
              question: quizQuestion,
              options: quizOptions,
              correct_index: correctIndex
          } : null;

          const { error } = await supabase.from('marketplace_tasks').insert({
              creator_id: session.user.id,
              title: form.title,
              description: form.description,
              category: form.category,
              target_url: form.url,
              total_quantity: form.quantity,
              remaining_quantity: form.quantity,
              price_per_action: form.pricePerAction,
              worker_reward: workerReward,
              proof_type: proofType,
              proof_question: proofType === 'text_input' ? manualQuestion : null,
              expected_file_name: proofType === 'file_check' ? expectedFileName : null,
              quiz_config: quizConfig,
              timer_seconds: form.timer,
              status: 'active',
              company_name: companyName,
              auto_approve_hours: autoApproveHours,
              is_featured: false
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
                    <label className="text-xs font-bold text-gray-400 uppercase block mb-1">Target URL (Download Link / Site)</label>
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

                {/* Validation Type Selection */}
                <div className="border-t border-[#222] pt-6 mt-6">
                    <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-4">
                        Verification Method
                    </h3>
                    
                    <div className="grid grid-cols-3 gap-2 mb-4">
                        <div 
                            onClick={() => setProofType('ai_quiz')}
                            className={`p-3 rounded-xl border flex flex-col items-center justify-center cursor-pointer transition ${proofType === 'ai_quiz' ? 'bg-amber-500/20 border-amber-500 text-white' : 'bg-white/5 border-white/5 text-gray-500 hover:bg-white/10'}`}
                        >
                            <BrainCircuit size={20} className="mb-2"/>
                            <span className="text-[10px] font-bold uppercase">Auto Quiz</span>
                        </div>
                        <div 
                            onClick={() => setProofType('text_input')}
                            className={`p-3 rounded-xl border flex flex-col items-center justify-center cursor-pointer transition ${proofType === 'text_input' ? 'bg-amber-500/20 border-amber-500 text-white' : 'bg-white/5 border-white/5 text-gray-500 hover:bg-white/10'}`}
                        >
                            <Type size={20} className="mb-2"/>
                            <span className="text-[10px] font-bold uppercase">User Input</span>
                        </div>
                        <div 
                            onClick={() => setProofType('file_check')}
                            className={`p-3 rounded-xl border flex flex-col items-center justify-center cursor-pointer transition ${proofType === 'file_check' ? 'bg-amber-500/20 border-amber-500 text-white' : 'bg-white/5 border-white/5 text-gray-500 hover:bg-white/10'}`}
                        >
                            <FileCheck size={20} className="mb-2"/>
                            <span className="text-[10px] font-bold uppercase">File Check</span>
                        </div>
                    </div>

                    {proofType === 'ai_quiz' && (
                        <div className="space-y-3 bg-black/20 p-4 rounded-xl border border-[#333]">
                            <p className="text-xs text-amber-200 bg-amber-900/20 p-2 rounded mb-2">Users must answer this correctly to get paid instantly.</p>
                            <div>
                                <label className="text-xs font-bold text-gray-400 mb-1 block">Question</label>
                                <input required type="text" value={quizQuestion} onChange={e => setQuizQuestion(e.target.value)} className="w-full bg-black/40 border border-[#333] rounded-lg p-2 text-sm text-white" placeholder="e.g. What is the last word?"/>
                            </div>
                            <div>
                                <label className="text-xs font-bold text-gray-400 mb-1 block">Options (Select Correct)</label>
                                <div className="space-y-2">
                                    {quizOptions.map((opt, idx) => (
                                        <div key={idx} className={`flex items-center gap-2 p-2 rounded border ${idx === correctIndex ? 'border-amber-500 bg-amber-500/10' : 'border-[#333]'}`}>
                                            <input type="radio" name="correctOption" checked={idx === correctIndex} onChange={() => setCorrectIndex(idx)} className="accent-amber-500"/>
                                            <input type="text" value={opt} onChange={e => { const n = [...quizOptions]; n[idx] = e.target.value; setQuizOptions(n); }} className="bg-transparent outline-none w-full text-sm text-white" placeholder={`Option ${idx + 1}`} required />
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {proofType === 'text_input' && (
                        <div className="space-y-3 bg-black/20 p-4 rounded-xl border border-[#333]">
                            <p className="text-xs text-blue-200 bg-blue-900/20 p-2 rounded mb-2">Users will type their answer. You review submissions in "My Ads".</p>
                            <div>
                                <label className="text-xs font-bold text-gray-400 mb-1 block">Instruction / Question</label>
                                <input required type="text" value={manualQuestion} onChange={e => setManualQuestion(e.target.value)} className="w-full bg-black/40 border border-[#333] rounded-lg p-2 text-sm text-white" placeholder="e.g. Enter your Registered Email or User ID"/>
                            </div>
                            <div>
                                <label className="text-xs font-bold text-gray-400 mb-1 block flex items-center gap-1"><Clock size={12}/> Auto-Approve After (Hours)</label>
                                <input type="number" min="1" value={autoApproveHours} onChange={e => setAutoApproveHours(parseInt(e.target.value))} className="w-full bg-black/40 border border-[#333] rounded-lg p-2 text-sm text-white"/>
                                <p className="text-[10px] text-gray-500 mt-1">If you don't reject within this time, users get paid automatically.</p>
                            </div>
                        </div>
                    )}

                    {proofType === 'file_check' && (
                        <div className="space-y-3 bg-black/20 p-4 rounded-xl border border-[#333]">
                            <p className="text-xs text-green-200 bg-green-900/20 p-2 rounded mb-2">
                                System verifies the uploaded filename. Users must upload the exact file to get paid.
                            </p>
                            
                            <div>
                                <label className="text-xs font-bold text-gray-400 mb-1 block">Expected Filename</label>
                                <input 
                                    required 
                                    type="text" 
                                    value={expectedFileName} 
                                    onChange={e => setExpectedFileName(e.target.value)} 
                                    className="w-full bg-black/40 border border-[#333] rounded-lg p-2 text-sm text-white font-mono" 
                                    placeholder="e.g. naxxivo.apk"
                                />
                            </div>

                            {/* HELPER UPLOAD BUTTON */}
                            <div className="relative border border-dashed border-[#444] rounded-lg p-3 hover:bg-white/5 transition text-center cursor-pointer">
                                <input 
                                    type="file" 
                                    onChange={handleFileHelper} 
                                    className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                                />
                                <div className="flex flex-col items-center gap-1 text-gray-400">
                                    <Upload size={16} />
                                    <span className="text-[10px] font-bold">Upload file to auto-fill name</span>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                <div className="bg-amber-900/10 border border-amber-500/20 p-3 rounded-xl flex justify-between items-center mt-6">
                    <span className="text-xs text-amber-500 font-bold uppercase">Total Budget</span>
                    <div className="text-right">
                        <span className="text-xl font-bold text-white block">৳{(form.quantity * form.pricePerAction).toFixed(2)}</span>
                        <span className="text-[10px] text-gray-400">User gets: ৳{(form.pricePerAction * userSharePercent).toFixed(2)}</span>
                    </div>
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
