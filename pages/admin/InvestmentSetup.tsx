
import React, { useEffect, useState } from 'react';
import GlassCard from '../../components/GlassCard';
import { supabase } from '../../integrations/supabase/client';
import { InvestmentPlan } from '../../types';
import { Plus, Edit, Trash2, Save, X, TrendingUp, Clock, DollarSign, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const InvestmentSetup: React.FC = () => {
  const [plans, setPlans] = useState<InvestmentPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const initialForm = {
      name: '',
      daily_return: '',
      duration: '',
      min_invest: '',
      total_roi: '',
      badge_tag: '',
      description: '',
      is_active: true
  };
  const [formData, setFormData] = useState<any>(initialForm);

  useEffect(() => {
      fetchPlans();
  }, []);

  // Auto-calculate Total ROI when daily or duration changes
  useEffect(() => {
      const daily = parseFloat(formData.daily_return) || 0;
      const dur = parseInt(formData.duration) || 0;
      if (daily && dur) {
          setFormData((prev: any) => ({...prev, total_roi: (daily * dur).toFixed(2)}));
      }
  }, [formData.daily_return, formData.duration]);

  const fetchPlans = async () => {
      setLoading(true);
      const { data } = await supabase.from('investment_plans').select('*').order('min_invest', { ascending: true });
      if (data) setPlans(data as any);
      setLoading(false);
  };

  const handleEdit = (plan: InvestmentPlan) => {
      setFormData({
          name: plan.name,
          daily_return: plan.daily_return.toString(),
          duration: plan.duration.toString(),
          min_invest: plan.min_invest.toString(),
          total_roi: plan.total_roi.toString(),
          badge_tag: plan.badge_tag || '',
          description: plan.description || '',
          is_active: plan.is_active
      });
      setEditingId(plan.id);
      setIsEditing(true);
  };

  const handleDelete = async (id: string) => {
      if (!confirm("Delete this plan? This won't affect existing user investments.")) return;
      await supabase.from('investment_plans').delete().eq('id', id);
      fetchPlans();
  };

  const handleSave = async (e: React.FormEvent) => {
      e.preventDefault();
      const payload = {
          ...formData,
          daily_return: parseFloat(formData.daily_return),
          duration: parseInt(formData.duration),
          min_invest: parseFloat(formData.min_invest),
          total_roi: parseFloat(formData.total_roi)
      };

      if (editingId) {
          await supabase.from('investment_plans').update(payload).eq('id', editingId);
      } else {
          await supabase.from('investment_plans').insert(payload);
      }
      
      setIsEditing(false);
      setFormData(initialForm);
      fetchPlans();
  };

  return (
    <div className="space-y-6 animate-fade-in relative">
        <div className="flex justify-between items-center">
           <h2 className="text-2xl font-bold text-white">Investment Strategy</h2>
           <button 
             onClick={() => { setIsEditing(true); setEditingId(null); setFormData(initialForm); }}
             className="bg-neon-green text-black px-4 py-2 rounded-xl font-bold flex items-center gap-2 hover:scale-105 transition shadow-lg shadow-neon-green/20"
            >
               <Plus size={18}/> Add Plan
           </button>
        </div>

        {loading ? (
             <div className="flex justify-center py-10"><Loader2 className="animate-spin text-neon-green" size={32} /></div>
        ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {plans.map(plan => (
                    <GlassCard key={plan.id} className="bg-gradient-to-br from-white/5 to-transparent relative group hover:border-royal-500/40 transition">
                        {plan.badge_tag && (
                            <div className="absolute top-3 right-3 bg-yellow-500 text-black text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider">
                                {plan.badge_tag}
                            </div>
                        )}
                        <div className="flex justify-between items-start mb-2">
                            <div>
                                <h4 className="font-bold text-white text-lg">{plan.name}</h4>
                                <p className="text-gray-500 text-xs">{plan.description}</p>
                            </div>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-2 my-3">
                             <div className="bg-black/30 p-2 rounded text-center">
                                 <p className="text-[10px] text-gray-400 uppercase">Daily ROI</p>
                                 <p className="text-neon-green font-bold">{plan.daily_return}%</p>
                             </div>
                             <div className="bg-black/30 p-2 rounded text-center">
                                 <p className="text-[10px] text-gray-400 uppercase">Duration</p>
                                 <p className="text-white font-bold">{plan.duration} Days</p>
                             </div>
                             <div className="bg-black/30 p-2 rounded text-center">
                                 <p className="text-[10px] text-gray-400 uppercase">Min Invest</p>
                                 <p className="text-white font-bold">৳{plan.min_invest}</p>
                             </div>
                             <div className="bg-black/30 p-2 rounded text-center">
                                 <p className="text-[10px] text-gray-400 uppercase">Total Return</p>
                                 <p className="text-white font-bold">{plan.total_roi}%</p>
                             </div>
                        </div>

                        <div className="flex gap-2 mt-4 border-t border-white/10 pt-3">
                            <button onClick={() => handleEdit(plan)} className="flex-1 py-2 bg-blue-500/20 text-blue-400 text-xs rounded-lg font-bold hover:bg-blue-500/30 flex items-center justify-center gap-2">
                                <Edit size={14}/> Edit
                            </button>
                            <button onClick={() => handleDelete(plan.id)} className="flex-1 py-2 bg-red-500/20 text-red-400 text-xs rounded-lg font-bold hover:bg-red-500/30 flex items-center justify-center gap-2">
                                <Trash2 size={14}/> Delete
                            </button>
                        </div>
                    </GlassCard>
                ))}
            </div>
        )}

        <AnimatePresence>
            {isEditing && (
                 <motion.div 
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
                >
                    <motion.div 
                        initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }}
                        className="bg-dark-900 w-full max-w-lg rounded-2xl border border-white/10 p-6 max-h-[90vh] overflow-y-auto custom-scrollbar"
                    >
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-bold text-white">{editingId ? 'Edit Plan' : 'Create Investment Plan'}</h3>
                            <button onClick={() => setIsEditing(false)} className="text-gray-500 hover:text-white"><X size={24}/></button>
                        </div>

                        <form onSubmit={handleSave} className="space-y-4">
                             <div>
                                <label className="block text-xs font-bold text-gray-400 mb-1">Plan Name</label>
                                <input required type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full bg-black/30 border border-white/10 rounded-lg p-3 text-white focus:border-neon-green outline-none" placeholder="e.g. VIP Gold" />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-400 mb-1 flex items-center gap-1"><TrendingUp size={12}/> Daily Return (%)</label>
                                    <input required type="number" step="0.01" value={formData.daily_return} onChange={e => setFormData({...formData, daily_return: e.target.value})} className="w-full bg-black/30 border border-white/10 rounded-lg p-3 text-white focus:border-neon-green outline-none" />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-400 mb-1 flex items-center gap-1"><Clock size={12}/> Duration (Days)</label>
                                    <input required type="number" value={formData.duration} onChange={e => setFormData({...formData, duration: e.target.value})} className="w-full bg-black/30 border border-white/10 rounded-lg p-3 text-white focus:border-neon-green outline-none" />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-400 mb-1 flex items-center gap-1"><DollarSign size={12}/> Min Invest (BDT)</label>
                                    <input required type="number" step="1" value={formData.min_invest} onChange={e => setFormData({...formData, min_invest: e.target.value})} className="w-full bg-black/30 border border-white/10 rounded-lg p-3 text-white focus:border-neon-green outline-none" />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-400 mb-1">Total ROI (%)</label>
                                    <input disabled type="number" value={formData.total_roi} className="w-full bg-black/50 border border-white/5 rounded-lg p-3 text-gray-400 cursor-not-allowed" />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-400 mb-1">Badge Tag (Optional)</label>
                                <input type="text" value={formData.badge_tag} onChange={e => setFormData({...formData, badge_tag: e.target.value})} className="w-full bg-black/30 border border-white/10 rounded-lg p-3 text-white focus:border-neon-green outline-none" placeholder="e.g. POPULAR" />
                            </div>
                            
                            <div>
                                <label className="block text-xs font-bold text-gray-400 mb-1">Short Description</label>
                                <textarea value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} className="w-full bg-black/30 border border-white/10 rounded-lg p-3 text-white focus:border-neon-green outline-none h-20 resize-none" placeholder="e.g. Best for beginners..." />
                            </div>

                            <button type="submit" className="w-full py-3 bg-royal-600 text-white font-bold rounded-xl hover:bg-royal-700 transition flex items-center justify-center gap-2 mt-4">
                                <Save size={18} /> Save Plan
                            </button>
                        </form>
                    </motion.div>
                 </motion.div>
            )}
        </AnimatePresence>
    </div>
  );
};

export default InvestmentSetup;
