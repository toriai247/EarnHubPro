
import React, { useEffect, useState } from 'react';
import GlassCard from '../../components/GlassCard';
import { supabase } from '../../integrations/supabase/client';
import { PaymentMethod } from '../../types';
import { Plus, Save, Trash2, Edit2, Power } from 'lucide-react';

const PaymentSettings: React.FC = () => {
  const [methods, setMethods] = useState<PaymentMethod[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ 
    name: '', 
    account_number: '', 
    type: 'mobile_banking', 
    instruction: '', 
    logo_url: '', 
    is_active: true 
  });

  useEffect(() => {
      fetchMethods();
  }, []);

  const fetchMethods = async () => {
      const { data } = await supabase.from('payment_methods').select('*').order('created_at', { ascending: true });
      if (data) setMethods(data as PaymentMethod[]);
  };

  const handleEdit = (m: PaymentMethod) => {
      setEditingId(m.id);
      setForm({
          name: m.name,
          account_number: m.account_number,
          type: m.type,
          instruction: m.instruction || '',
          logo_url: m.logo_url || '',
          is_active: m.is_active
      });
  };

  const handleDelete = async (id: string) => {
      if (!confirm("Delete this method?")) return;
      await supabase.from('payment_methods').delete().eq('id', id);
      fetchMethods();
  };

  const handleSave = async (e: React.FormEvent) => {
      e.preventDefault();
      if (editingId) {
          await supabase.from('payment_methods').update(form).eq('id', editingId);
      } else {
          await supabase.from('payment_methods').insert(form);
      }
      setEditingId(null);
      setForm({ name: '', account_number: '', type: 'mobile_banking', instruction: '', logo_url: '', is_active: true });
      fetchMethods();
  };

  const toggleActive = async (m: PaymentMethod) => {
      await supabase.from('payment_methods').update({ is_active: !m.is_active }).eq('id', m.id);
      fetchMethods();
  };

  return (
    <div className="space-y-6 animate-fade-in">
        <h2 className="text-2xl font-bold text-white">Payment Configuration</h2>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <GlassCard className="lg:col-span-1 h-fit">
                <h3 className="font-bold text-white mb-4">{editingId ? 'Edit Method' : 'Add New Method'}</h3>
                <form onSubmit={handleSave} className="space-y-4">
                    <div>
                        <label className="text-xs text-gray-400 block mb-1">Method Name</label>
                        <input required type="text" value={form.name} onChange={e => setForm({...form, name: e.target.value})} className="w-full bg-black/30 border border-white/10 rounded-lg p-3 text-white text-sm focus:border-neon-green outline-none" placeholder="e.g. Bkash" />
                    </div>
                    <div>
                        <label className="text-xs text-gray-400 block mb-1">Account Number / Address</label>
                        <input required type="text" value={form.account_number} onChange={e => setForm({...form, account_number: e.target.value})} className="w-full bg-black/30 border border-white/10 rounded-lg p-3 text-white text-sm focus:border-neon-green outline-none" placeholder="e.g. 017..." />
                    </div>
                    <div>
                        <label className="text-xs text-gray-400 block mb-1">Type</label>
                        <select value={form.type} onChange={e => setForm({...form, type: e.target.value})} className="w-full bg-black/30 border border-white/10 rounded-lg p-3 text-white text-sm focus:border-neon-green outline-none">
                            <option value="mobile_banking">Mobile Banking</option>
                            <option value="crypto">Crypto</option>
                            <option value="bank">Bank Transfer</option>
                        </select>
                    </div>
                    <div>
                        <label className="text-xs text-gray-400 block mb-1">Instructions</label>
                        <input type="text" value={form.instruction} onChange={e => setForm({...form, instruction: e.target.value})} className="w-full bg-black/30 border border-white/10 rounded-lg p-3 text-white text-sm focus:border-neon-green outline-none" placeholder="e.g. Send Money (Personal)" />
                    </div>
                    <div>
                        <label className="text-xs text-gray-400 block mb-1">Logo URL (Optional)</label>
                        <input type="text" value={form.logo_url} onChange={e => setForm({...form, logo_url: e.target.value})} className="w-full bg-black/30 border border-white/10 rounded-lg p-3 text-white text-sm focus:border-neon-green outline-none" placeholder="https://..." />
                    </div>
                    <button type="submit" className="w-full py-3 bg-neon-green text-black font-bold rounded-xl hover:bg-emerald-400 flex items-center justify-center gap-2">
                        {editingId ? <Save size={18}/> : <Plus size={18}/>} {editingId ? 'Update' : 'Create'}
                    </button>
                </form>
            </GlassCard>

            <div className="lg:col-span-2 space-y-3">
                {methods.map(m => (
                    <GlassCard key={m.id} className={`flex items-center justify-between border ${m.is_active ? 'border-white/10' : 'border-red-500/20 bg-red-500/5'}`}>
                        <div className="flex items-center gap-4">
                             {m.logo_url ? (
                                <img src={m.logo_url} alt={m.name} className="w-10 h-10 object-contain" />
                             ) : (
                                <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center font-bold text-white">
                                    {m.name.charAt(0)}
                                </div>
                             )}
                             <div>
                                <div className="flex items-center gap-2">
                                    <h4 className="font-bold text-white">{m.name}</h4>
                                    <span className={`text-[10px] px-2 py-0.5 rounded ${m.is_active ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                                        {m.is_active ? 'Active' : 'Inactive'}
                                    </span>
                                </div>
                                <p className="text-sm text-gray-400 font-mono mt-1">{m.account_number}</p>
                                <p className="text-xs text-gray-500">{m.instruction}</p>
                            </div>
                        </div>
                        <div className="flex gap-2">
                            <button onClick={() => toggleActive(m)} className={`p-2 rounded hover:bg-white/10 ${m.is_active ? 'text-green-400' : 'text-gray-500'}`}>
                                <Power size={18} />
                            </button>
                            <button onClick={() => handleEdit(m)} className="p-2 text-blue-400 rounded hover:bg-blue-400/10">
                                <Edit2 size={18} />
                            </button>
                            <button onClick={() => handleDelete(m.id)} className="p-2 text-red-400 rounded hover:bg-red-400/10">
                                <Trash2 size={18} />
                            </button>
                        </div>
                    </GlassCard>
                ))}
                {methods.length === 0 && <p className="text-center text-gray-500 py-10">No payment methods configured.</p>}
            </div>
        </div>
    </div>
  );
};

export default PaymentSettings;
