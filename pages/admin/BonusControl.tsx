
import React, { useEffect, useState } from 'react';
import GlassCard from '../../components/GlassCard';
import { supabase } from '../../integrations/supabase/client';
import { DepositBonus, PaymentMethod } from '../../types';
import { Gift, Plus, Save, Trash2, Edit2, Tag, Power, XCircle, DollarSign, Percent, Layers, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useUI } from '../../context/UIContext';

const BonusControl: React.FC = () => {
  const { toast, confirm } = useUI();
  const [bonuses, setBonuses] = useState<DepositBonus[]>([]);
  const [methods, setMethods] = useState<PaymentMethod[]>([]);
  const [loading, setLoading] = useState(true);
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
      setLoading(true);
      const { data: bData } = await supabase.from('deposit_bonuses').select('*').order('tier_level', {ascending: true});
      if (bData) setBonuses(bData as DepositBonus[]);

      const { data: mData } = await supabase.from('payment_methods').select('*');
      if (mData) setMethods(mData as PaymentMethod[]);
      setLoading(false);
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

  const toggleActive = async (b: DepositBonus) => {
      const newVal = !b.is_active;
      const { error } = await supabase.from('deposit_bonuses').update({ is_active: newVal }).eq('id', b.id);
      
      if (error) {
          toast.error("Failed to update status");
      } else {
          setBonuses(prev => prev.map(bonus => bonus.id === b.id ? { ...bonus, is_active: newVal } : bonus));
          toast.success(newVal ? "Bonus Activated" : "Bonus Deactivated");
      }
  };

  const handleDelete = async (id: string) => {
      if (!await confirm('Delete this bonus rule permanently?')) return;
      
      const { error } = await supabase.from('deposit_bonuses').delete().eq('id', id);
      if (error) {
          toast.error(error.message);
      } else {
          toast.success("Bonus rule deleted");
          fetchData();
      }
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

      try {
          if (editingId) {
              const { error } = await supabase.from('deposit_bonuses').update(payload).eq('id', editingId);
              if (error) throw error;
          } else {
              const { error } = await supabase.from('deposit_bonuses').insert(payload);
              if (error) throw error;
          }
          
          toast.success(editingId ? "Rule updated successfully" : "New bonus rule created");
          setIsEditing(false);
          setForm(initialForm);
          setEditingId(null);
          fetchData();
      } catch (e: any) {
          toast.error(e.message);
      }
  };

  return (
    <div className="space-y-6 animate-fade-in relative">
        <div className="flex justify-between items-center">
            <div>
                <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                    <Gift className="text-neon-green" /> Deposit Bonus Rules
                </h2>
                <p className="text-gray-400 text-sm">Configure automated rewards for user deposits.</p>
            </div>
            <button 
                onClick={() => { setIsEditing(true); setEditingId(null); setForm(initialForm); }}
                className="bg-neon-green text-black px-4 py-2 rounded-xl font-bold flex items-center gap-2 hover:bg-emerald-400 transition"
            >
                <Plus size={18} /> Add New Rule
            </button>
        </div>

        {loading ? (
            <div className="flex justify-center py-10"><Loader2 className="animate-spin text-white" /></div>
        ) : (
            <div className="grid grid-cols-1 gap-4">
                {bonuses.length === 0 && <div className="text-center text-gray-500 py-10 bg-white/5 rounded-xl border border-white/5">No active bonus rules found. Create one to get started.</div>}
                
                {bonuses.map((bonus) => (
                    <GlassCard key={bonus.id} className={`flex flex-col md:flex-row justify-between items-center gap-4 border transition-colors ${bonus.is_active ? 'border-white/10' : 'border-white/5 bg-black/20 opacity-70'}`}>
                        <div className="flex items-start gap-4 w-full md:w-auto">
                            <div className={`p-3 rounded-xl ${bonus.tier_level > 0 ? 'bg-yellow-500/20 text-yellow-400' : 'bg-blue-500/20 text-blue-400'}`}>
                                <Tag size={24} />
                            </div>
                            <div>
                                <div className="flex items-center gap-2">
                                    <h4 className="font-bold text-white text-lg">{bonus.title}</h4>
                                    {!bonus.is_active && <span className="text-[10px] bg-red-500/20 text-red-400 px-2 py-0.5 rounded font-bold uppercase">Inactive</span>}
                                </div>
                                <div className="flex flex-wrap gap-2 mt-1">
                                    <span className="text-xs bg-white/5 px-2 py-1 rounded text-gray-300 border border-white/5 flex items-center gap-1">
                                        <Layers size={10} /> {bonus.tier_level === 0 ? 'Recurring' : `${bonus.tier_level}${bonus.tier_level === 1 ? 'st' : bonus.tier_level === 2 ? 'nd' : bonus.tier_level === 3 ? 'rd' : 'th'} Deposit`}
                                    </span>
                                    <span className="text-xs bg-white/5 px-2 py-1 rounded text-gray-300 border border-white/5">
                                        {bonus.method_name ? `Via ${bonus.method_name}` : 'All Methods'}
                                    </span>
                                    <span className="text-xs bg-white/5 px-2 py-1 rounded text-gray-300 border border-white/5">
                                        Min ${bonus.min_deposit}
                                    </span>
                                </div>
                            </div>
                        </div>
                        
                        <div className="flex items-center gap-6 w-full md:w-auto justify-between md:justify-end border-t md:border-t-0 border-white/10 pt-4 md:pt-0">
                            <div className="text-right">
                                <div className="text-neon-green font-bold text-xl flex items-center gap-1 justify-end">
                                    {bonus.bonus_percent > 0 && <span className="flex items-center"><Percent size={14} className="mr-0.5"/>{bonus.bonus_percent}</span>}
                                    {bonus.bonus_percent > 0 && bonus.bonus_fixed > 0 && <span className="text-white text-sm mx-1">+</span>}
                                    {bonus.bonus_fixed > 0 && <span className="flex items-center"><DollarSign size={14} className="mr-0.5"/>{bonus.bonus_fixed}</span>}
                                </div>
                                <div className="text-[10px] text-gray-500 uppercase font-bold">Reward Value</div>
                            </div>
                            <div className="flex gap-2">
                                <button 
                                    onClick={() => toggleActive(bonus)} 
                                    className={`p-2 rounded-lg transition ${bonus.is_active ? 'bg-green-500/10 text-green-400 hover:bg-green-500/20' : 'bg-white/5 text-gray-500 hover:text-white'}`}
                                    title={bonus.is_active ? "Deactivate" : "Activate"}
                                >
                                    <Power size={18}/>
                                </button>
                                <button onClick={() => handleEdit(bonus)} className="p-2 bg-blue-500/10 hover:bg-blue-500/20 rounded-lg text-blue-400 transition">
                                    <Edit2 size={18}/>
                                </button>
                                <button onClick={() => handleDelete(bonus.id)} className="p-2 bg-red-500/10 hover:bg-red-500/20 rounded-lg text-red-400 transition">
                                    <Trash2 size={18}/>
                                </button>
                            </div>
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
                            <h3 className="text-xl font-bold text-white">{editingId ? 'Edit Rule' : 'Create Bonus Rule'}</h3>
                            <button onClick={() => setIsEditing(false)} className="text-gray-500 hover:text-white"><XCircle size={24}/></button>
                        </div>

                        <form onSubmit={handleSave} className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-400 mb-1 uppercase">Bonus Title</label>
                                <input required type="text" value={form.title} onChange={e => setForm({...form, title: e.target.value})} className="w-full bg-black/30 border border-white/10 rounded-lg p-3 text-white focus:border-neon-green outline-none" placeholder="e.g. Welcome Pack" />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-400 mb-1 uppercase">Tier Level</label>
                                    <input type="number" value={form.tier_level} onChange={e => setForm({...form, tier_level: Number(e.target.value)})} className="w-full bg-black/30 border border-white/10 rounded-lg p-3 text-white focus:border-neon-green outline-none" />
                                    <p className="text-[10px] text-gray-500 mt-1">0 = Recurring (Every deposit), 1 = 1st Deposit only, etc.</p>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-400 mb-1 uppercase">Min Deposit ($)</label>
                                    <input type="number" value={form.min_deposit} onChange={e => setForm({...form, min_deposit: e.target.value})} className="w-full bg-black/30 border border-white/10 rounded-lg p-3 text-white focus:border-neon-green outline-none" />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-400 mb-1 uppercase">Payment Method (Optional)</label>
                                <select value={form.method_name} onChange={e => setForm({...form, method_name: e.target.value})} className="w-full bg-black/30 border border-white/10 rounded-lg p-3 text-white focus:border-neon-green outline-none cursor-pointer">
                                    <option value="">All Methods</option>
                                    {methods.map(m => <option key={m.id} value={m.name}>{m.name} ({m.type})</option>)}
                                </select>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-400 mb-1 uppercase">Bonus %</label>
                                    <div className="relative">
                                        <input type="number" value={form.bonus_percent} onChange={e => setForm({...form, bonus_percent: e.target.value})} className="w-full bg-black/30 border border-white/10 rounded-lg p-3 text-white focus:border-neon-green outline-none" placeholder="0" />
                                        <Percent size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500"/>
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-400 mb-1 uppercase">Fixed Bonus ($)</label>
                                    <div className="relative">
                                        <input type="number" value={form.bonus_fixed} onChange={e => setForm({...form, bonus_fixed: e.target.value})} className="w-full bg-black/30 border border-white/10 rounded-lg p-3 text-white focus:border-neon-green outline-none" placeholder="0" />
                                        <DollarSign size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500"/>
                                    </div>
                                </div>
                            </div>

                            <div className="pt-2 bg-white/5 p-3 rounded-xl border border-white/5">
                                <label className="flex items-center gap-3 cursor-pointer">
                                    <div className="relative">
                                        <input type="checkbox" checked={form.is_active} onChange={e => setForm({...form, is_active: e.target.checked})} className="sr-only peer" />
                                        <div className="w-10 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600"></div>
                                    </div>
                                    <span className="text-white text-sm font-bold">Activate Rule Immediately</span>
                                </label>
                            </div>

                            <button type="submit" className="w-full py-3 bg-neon-green text-black font-bold rounded-xl hover:bg-emerald-400 transition flex items-center justify-center gap-2 mt-4 shadow-lg shadow-neon-green/20">
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
