
import React, { useEffect, useState } from 'react';
import GlassCard from '../../components/GlassCard';
import { supabase } from '../../integrations/supabase/client';
import { DepositBonus, PaymentMethod } from '../../types';
import { Gift, Plus, Save, Trash2, Edit2, Tag, CheckCircle, XCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const BonusControl: React.FC = () => {
  const [bonuses, setBonuses] = useState<DepositBonus[]>([]);
  const [methods, setMethods] = useState<PaymentMethod[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  const initialForm = {
      title: '',
      tier_level: 0,
      method_name: '',
      bonus_percent: '',
      bonus_fixed: '',
      min_deposit: '10',
      is_active: true
  };
  const [form, setForm] = useState(initialForm);

  useEffect(() => {
      fetchData();
  }, []);

  const fetchData = async () => {
      const { data: bData } = await supabase.from('deposit_bonuses').select('*').order('tier_level', {ascending: true});
      if (bData) setBonuses(bData as DepositBonus[]);

      const { data: mData } = await supabase.from('payment_methods').select('*');
      if (mData) setMethods(mData as PaymentMethod[]);
  };

  const handleEdit = (b: DepositBonus) => {
      setForm({
          title: b.title,
          tier_level: b.tier_level,
          method_name: b.method_name || '',
          bonus_percent: b.bonus_percent.toString(),
          bonus_fixed: b.bonus_fixed.toString(),
          min_deposit: b.min_deposit.toString(),
          is_active: b.is_active
      });
      setEditingId(b.id);
      setIsEditing(true);
  };

  const handleDelete = async (id: string) => {
      if (!confirm('Delete this bonus rule?')) return;
      await supabase.from('deposit_bonuses').delete().eq('id', id);
      fetchData();
  };

  const handleSave = async (e: React.FormEvent) => {
      e.preventDefault();
      const payload = {
          title: form.title,
          tier_level: Number(form.tier_level),
          method_name: form.method_name || null,
          bonus_percent: Number(form.bonus_percent),
          bonus_fixed: Number(form.bonus_fixed),
          min_deposit: Number(form.min_deposit),
          is_active: form.is_active
      };

      if (editingId) {
          await supabase.from('deposit_bonuses').update(payload).eq('id', editingId);
      } else {
          await supabase.from('deposit_bonuses').insert(payload);
      }
      
      setIsEditing(false);
      setForm(initialForm);
      setEditingId(null);
      fetchData();
  };

  return (
    <div className="space-y-6 animate-fade-in relative">
        <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                <Gift className="text-neon-green" /> Deposit Bonus Rules
            </h2>
            <button 
                onClick={() => { setIsEditing(true); setEditingId(null); setForm(initialForm); }}
                className="bg-neon-green text-black px-4 py-2 rounded-xl font-bold flex items-center gap-2 hover:bg-emerald-400 transition"
            >
                <Plus size={18} /> Add New Rule
            </button>
        </div>

        <div className="grid grid-cols-1 gap-4">
            {bonuses.length === 0 && <div className="text-center text-gray-500 py-10">No active bonus rules.</div>}
            
            {bonuses.map((bonus) => (
                <GlassCard key={bonus.id} className="flex flex-col md:flex-row justify-between items-center gap-4 border border-white/5">
                    <div className="flex items-start gap-4">
                        <div className={`p-3 rounded-xl ${bonus.tier_level > 0 ? 'bg-yellow-500/20 text-yellow-400' : 'bg-blue-500/20 text-blue-400'}`}>
                            <Tag size={24} />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h4 className="font-bold text-white text-lg">{bonus.title}</h4>
                                {!bonus.is_active && <span className="text-xs bg-red-500/20 text-red-400 px-2 py-0.5 rounded">Inactive</span>}
                            </div>
                            <p className="text-sm text-gray-400">
                                {bonus.tier_level === 0 ? 'Recurring (All Deposits)' : `${bonus.tier_level === 1 ? '1st' : bonus.tier_level === 2 ? '2nd' : bonus.tier_level + 'th'} Deposit Only`}
                                {bonus.method_name ? ` • Via ${bonus.method_name}` : ' • All Methods'}
                                {` • Min $${bonus.min_deposit}`}
                            </p>
                        </div>
                    </div>
                    
                    <div className="flex items-center gap-6 w-full md:w-auto justify-between md:justify-end">
                        <div className="text-right">
                            <div className="text-neon-green font-bold text-xl">
                                {bonus.bonus_percent > 0 ? `+${bonus.bonus_percent}%` : ''}
                                {bonus.bonus_percent > 0 && bonus.bonus_fixed > 0 ? ' & ' : ''}
                                {bonus.bonus_fixed > 0 ? `+$${bonus.bonus_fixed}` : ''}
                            </div>
                            <div className="text-[10px] text-gray-500 uppercase">Reward</div>
                        </div>
                        <div className="flex gap-2">
                            <button onClick={() => handleEdit(bonus)} className="p-2 bg-white/10 hover:bg-white/20 rounded-lg text-blue-400"><Edit2 size={18}/></button>
                            <button onClick={() => handleDelete(bonus.id)} className="p-2 bg-white/10 hover:bg-red-500/20 rounded-lg text-red-400"><Trash2 size={18}/></button>
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
                        className="bg-dark-900 w-full max-w-lg rounded-2xl border border-white/10 p-6 max-h-[90vh] overflow-y-auto"
                    >
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-bold text-white">{editingId ? 'Edit Rule' : 'Create Bonus Rule'}</h3>
                            <button onClick={() => setIsEditing(false)} className="text-gray-500 hover:text-white"><XCircle size={24}/></button>
                        </div>

                        <form onSubmit={handleSave} className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-400 mb-1">Bonus Title</label>
                                <input required type="text" value={form.title} onChange={e => setForm({...form, title: e.target.value})} className="w-full bg-black/30 border border-white/10 rounded-lg p-3 text-white focus:border-neon-green outline-none" placeholder="e.g. Welcome Pack" />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-400 mb-1">Tier (0 = Any, 1 = 1st)</label>
                                    <input type="number" value={form.tier_level} onChange={e => setForm({...form, tier_level: Number(e.target.value)})} className="w-full bg-black/30 border border-white/10 rounded-lg p-3 text-white focus:border-neon-green outline-none" />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-400 mb-1">Min Deposit ($)</label>
                                    <input type="number" value={form.min_deposit} onChange={e => setForm({...form, min_deposit: e.target.value})} className="w-full bg-black/30 border border-white/10 rounded-lg p-3 text-white focus:border-neon-green outline-none" />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-400 mb-1">Payment Method (Optional)</label>
                                <select value={form.method_name} onChange={e => setForm({...form, method_name: e.target.value})} className="w-full bg-black/30 border border-white/10 rounded-lg p-3 text-white focus:border-neon-green outline-none">
                                    <option value="">All Methods</option>
                                    {methods.map(m => <option key={m.id} value={m.name}>{m.name}</option>)}
                                </select>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-400 mb-1">Bonus %</label>
                                    <input type="number" value={form.bonus_percent} onChange={e => setForm({...form, bonus_percent: e.target.value})} className="w-full bg-black/30 border border-white/10 rounded-lg p-3 text-white focus:border-neon-green outline-none" placeholder="0" />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-400 mb-1">Fixed Bonus ($)</label>
                                    <input type="number" value={form.bonus_fixed} onChange={e => setForm({...form, bonus_fixed: e.target.value})} className="w-full bg-black/30 border border-white/10 rounded-lg p-3 text-white focus:border-neon-green outline-none" placeholder="0" />
                                </div>
                            </div>

                            <div className="pt-2">
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input type="checkbox" checked={form.is_active} onChange={e => setForm({...form, is_active: e.target.checked})} className="w-5 h-5 accent-neon-green" />
                                    <span className="text-white text-sm font-bold">Rule Active</span>
                                </label>
                            </div>

                            <button type="submit" className="w-full py-3 bg-royal-600 text-white font-bold rounded-xl hover:bg-royal-700 transition flex items-center justify-center gap-2 mt-4">
                                <Save size={18} /> Save Configuration
                            </button>
                        </form>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    </div>
  );
};

export default BonusControl;
