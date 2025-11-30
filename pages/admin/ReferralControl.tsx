
import React, { useEffect, useState } from 'react';
import GlassCard from '../../components/GlassCard';
import { supabase } from '../../integrations/supabase/client';
import { ReferralTier } from '../../types';
import { Users, Plus, Save, Trash2, Edit2, CheckCircle2, XCircle, Percent, GitFork, Calculator } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useUI } from '../../context/UIContext';
import Loader from '../../components/Loader';

const ReferralControl: React.FC = () => {
  const { toast, confirm } = useUI();
  const [tiers, setTiers] = useState<ReferralTier[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  const initialForm = {
      level: 1,
      commission_percent: '',
      type: 'deposit', // or 'earning'
      is_active: true
  };
  const [form, setForm] = useState(initialForm);

  useEffect(() => {
      fetchTiers();
  }, []);

  const fetchTiers = async () => {
      setLoading(true);
      const { data } = await supabase.from('referral_tiers').select('*').order('level', { ascending: true });
      if (data) setTiers(data as any);
      else {
          // If table doesn't exist or is empty, show empty state or handle error gracefullly
          // The SQL in DatabaseUltra will handle creation.
      }
      setLoading(false);
  };

  const handleEdit = (tier: ReferralTier) => {
      setForm({
          level: tier.level,
          commission_percent: tier.commission_percent.toString(),
          type: tier.type,
          is_active: tier.is_active
      });
      setEditingId(tier.id);
      setIsEditing(true);
  };

  const handleDelete = async (id: string) => {
      if (!await confirm("Delete this referral tier?")) return;
      
      const { error } = await supabase.from('referral_tiers').delete().eq('id', id);
      if (error) toast.error("Error: " + error.message);
      else {
          toast.success("Tier deleted");
          fetchTiers();
      }
  };

  const handleSave = async (e: React.FormEvent) => {
      e.preventDefault();
      
      const payload = {
          level: Number(form.level),
          commission_percent: parseFloat(form.commission_percent),
          type: form.type,
          is_active: form.is_active
      };

      if (payload.level < 1) {
          toast.error("Level must be 1 or higher");
          return;
      }

      try {
          if (editingId) {
              const { error } = await supabase.from('referral_tiers').update(payload).eq('id', editingId);
              if (error) throw error;
          } else {
              const { error } = await supabase.from('referral_tiers').insert(payload);
              if (error) throw error;
          }
          
          toast.success("Referral configuration saved");
          setIsEditing(false);
          setForm(initialForm);
          setEditingId(null);
          fetchTiers();
      } catch (e: any) {
          toast.error("Save failed: " + e.message);
      }
  };

  return (
    <div className="space-y-6 animate-fade-in relative">
        <div className="flex justify-between items-center">
            <div>
                <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                    <GitFork className="text-neon-green" /> Referral Matrix
                </h2>
                <p className="text-gray-400 text-sm">Configure multi-level commission structures.</p>
            </div>
            <button 
                onClick={() => { setIsEditing(true); setEditingId(null); setForm(initialForm); }}
                className="bg-neon-green text-black px-4 py-2 rounded-xl font-bold flex items-center gap-2 hover:bg-emerald-400 transition shadow-lg shadow-neon-green/20"
            >
                <Plus size={18} /> Add Tier
            </button>
        </div>

        {/* Warning if no data */}
        {!loading && tiers.length === 0 && (
            <div className="bg-yellow-500/10 border border-yellow-500/20 p-4 rounded-xl flex items-center gap-3">
                <Users size={24} className="text-yellow-500" />
                <div>
                    <h4 className="text-yellow-500 font-bold text-sm">No Config Found</h4>
                    <p className="text-gray-400 text-xs">Run the SQL in 'Database Ultra &gt; Danger Zone' to initialize the referral table if you haven't already.</p>
                </div>
            </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {tiers.map((tier) => (
                <GlassCard key={tier.id} className={`border border-white/5 relative overflow-hidden ${!tier.is_active ? 'opacity-50 grayscale' : ''}`}>
                    
                    {/* Background number */}
                    <div className="absolute -right-2 -bottom-4 text-9xl font-black text-white/5 z-0 select-none">
                        {tier.level}
                    </div>

                    <div className="relative z-10">
                        <div className="flex justify-between items-start mb-4">
                            <div className="bg-white/10 p-2 rounded-lg">
                                <Users size={20} className="text-blue-400"/>
                            </div>
                            <div className={`px-2 py-1 rounded text-[10px] font-bold uppercase ${tier.is_active ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                                {tier.is_active ? 'Active' : 'Disabled'}
                            </div>
                        </div>

                        <div className="mb-4">
                            <h3 className="text-lg font-bold text-white mb-1">Level {tier.level}</h3>
                            <p className="text-xs text-gray-400">
                                {tier.level === 1 ? 'Direct Referral' : tier.level === 2 ? 'Indirect (Friend of Friend)' : `Deep Network (L${tier.level})`}
                            </p>
                        </div>

                        <div className="flex items-center gap-2 bg-black/30 p-3 rounded-xl border border-white/5 mb-4">
                            <Percent size={16} className="text-neon-green" />
                            <span className="text-xl font-bold text-white">{tier.commission_percent}%</span>
                            <span className="text-xs text-gray-500 uppercase ml-auto">{tier.type}</span>
                        </div>

                        {/* Example Calc */}
                        <div className="mb-4 text-xs text-gray-500 flex items-center gap-1.5">
                            <Calculator size={12} />
                            <span>Example: $100 {tier.type} = <span className="text-white font-bold">${(100 * tier.commission_percent / 100).toFixed(2)}</span> Comm.</span>
                        </div>

                        <div className="flex gap-2">
                            <button onClick={() => handleEdit(tier)} className="flex-1 py-2 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 rounded-lg text-xs font-bold transition flex items-center justify-center gap-2">
                                <Edit2 size={14}/> Edit
                            </button>
                            <button onClick={() => handleDelete(tier.id)} className="flex-1 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg text-xs font-bold transition flex items-center justify-center gap-2">
                                <Trash2 size={14}/> Delete
                            </button>
                        </div>
                    </div>
                </GlassCard>
            ))}
        </div>

        <AnimatePresence>
            {isEditing && (
                <motion.div 
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
                >
                    <motion.div 
                        initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }}
                        className="bg-dark-900 w-full max-w-md rounded-2xl border border-white/10 p-6"
                    >
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-bold text-white">{editingId ? 'Edit Rule' : 'Add Commission Rule'}</h3>
                            <button onClick={() => setIsEditing(false)} className="text-gray-500 hover:text-white"><XCircle size={24}/></button>
                        </div>

                        <form onSubmit={handleSave} className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-400 mb-1">Level (1=Direct)</label>
                                    <input required type="number" min="1" value={form.level} onChange={e => setForm({...form, level: parseInt(e.target.value)})} className="w-full bg-black/30 border border-white/10 rounded-lg p-3 text-white focus:border-neon-green outline-none" />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-400 mb-1">Commission %</label>
                                    <input required type="number" step="0.01" value={form.commission_percent} onChange={e => setForm({...form, commission_percent: e.target.value})} className="w-full bg-black/30 border border-white/10 rounded-lg p-3 text-white focus:border-neon-green outline-none" placeholder="e.g. 5.0" />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-400 mb-1">Trigger Type</label>
                                <select 
                                    value={form.type} 
                                    onChange={e => setForm({...form, type: e.target.value})} 
                                    className="w-full bg-black/30 border border-white/10 rounded-lg p-3 text-white focus:border-neon-green outline-none"
                                >
                                    <option value="deposit">On Deposit (Standard)</option>
                                    <option value="earning">On User Earnings (Recurring)</option>
                                </select>
                                <p className="text-[10px] text-gray-500 mt-1">
                                    'Deposit': One-time reward when user funds wallet.<br/>
                                    'Earning': Recurring reward when user wins games/tasks.
                                </p>
                            </div>

                            <div className="pt-2">
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input type="checkbox" checked={form.is_active} onChange={e => setForm({...form, is_active: e.target.checked})} className="w-5 h-5 accent-neon-green" />
                                    <span className="text-white text-sm font-bold">Rule Active</span>
                                </label>
                            </div>

                            <button type="submit" className="w-full py-3 bg-neon-green text-black font-bold rounded-xl hover:bg-emerald-400 transition flex items-center justify-center gap-2 mt-4">
                                <Save size={18} /> Save Rule
                            </button>
                        </form>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    </div>
  );
};

export default ReferralControl;
