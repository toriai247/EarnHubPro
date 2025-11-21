
import React, { useEffect, useState } from 'react';
import GlassCard from '../../components/GlassCard';
import { supabase } from '../../integrations/supabase/client';
import { SpinItem } from '../../types';
import { Plus, Trash2, Save, Loader2, PieChart, Ticket } from 'lucide-react';

const SpinSettings: React.FC = () => {
  const [items, setItems] = useState<SpinItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalProb, setTotalProb] = useState(0);

  useEffect(() => {
    fetchItems();
  }, []);

  useEffect(() => {
      const total = items.reduce((sum, item) => sum + (Number(item.probability) || 0), 0);
      setTotalProb(total);
  }, [items]);

  const fetchItems = async () => {
    setLoading(true);
    const { data } = await supabase.from('spin_items').select('*').order('value', { ascending: true });
    if (data) setItems(data as SpinItem[]);
    setLoading(false);
  };

  const handleUpdate = (index: number, field: keyof SpinItem, value: any) => {
      const newItems = [...items];
      newItems[index] = { ...newItems[index], [field]: value };
      setItems(newItems);
  };

  const handleAddItem = () => {
      // Add a temporary item locally, will save to DB on "Save"
      const newItem: any = {
          label: 'New Reward',
          value: 0,
          probability: 0,
          color: '#3b82f6',
          is_active: true
      };
      setItems([...items, newItem]);
  };

  const handleAddPreset = () => {
      const newItem: any = {
          label: 'Free Spin Token',
          value: 0,
          probability: 5,
          color: '#FFD700',
          is_active: true
      };
      setItems([...items, newItem]);
  };

  const handleDelete = async (index: number, id?: string) => {
      if (id) {
          if(!confirm('Delete this item permanently?')) return;
          await supabase.from('spin_items').delete().eq('id', id);
      }
      const newItems = [...items];
      newItems.splice(index, 1);
      setItems(newItems);
  };

  const handleSaveAll = async () => {
      if (Math.abs(totalProb - 100) > 1) {
          alert(`Warning: Total probability is ${totalProb}%. It should be close to 100% for fair play.`);
      }

      setLoading(true);
      try {
          for (const item of items) {
              const payload = {
                  label: item.label,
                  value: Number(item.value),
                  probability: Number(item.probability),
                  color: item.color,
                  is_active: item.is_active
              };

              if (item.id) {
                  await supabase.from('spin_items').update(payload).eq('id', item.id);
              } else {
                  await supabase.from('spin_items').insert(payload);
              }
          }
          alert('Spin settings saved successfully!');
          fetchItems();
      } catch (e: any) {
          alert('Error saving: ' + e.message);
      }
      setLoading(false);
  };

  return (
    <div className="space-y-6 animate-fade-in">
        <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                <PieChart className="text-neon-green" /> Spin Wheel Config
            </h2>
            <button 
                onClick={handleSaveAll} 
                className="bg-neon-green text-black px-6 py-2 rounded-xl font-bold flex items-center gap-2 hover:scale-105 transition shadow-lg shadow-neon-green/20"
            >
                {loading ? <Loader2 className="animate-spin" size={18}/> : <Save size={18} />} Save Changes
            </button>
        </div>

        <div className="flex items-center justify-between bg-white/5 p-4 rounded-xl border border-white/10">
            <div>
                <p className="text-gray-400 text-xs font-bold uppercase">Total Probability</p>
                <p className={`text-2xl font-bold ${totalProb === 100 ? 'text-green-400' : 'text-yellow-400'}`}>
                    {totalProb.toFixed(2)}%
                </p>
            </div>
            <div className="text-right text-xs text-gray-500">
                <p>Target: 100%</p>
                <p>{totalProb < 100 ? 'Under' : totalProb > 100 ? 'Over' : 'Perfect'}</p>
            </div>
        </div>

        <div className="grid grid-cols-1 gap-3">
            {items.map((item, idx) => (
                <GlassCard key={item.id || idx} className="flex flex-col md:flex-row items-center gap-4 p-4">
                     <div className="flex-1 grid grid-cols-2 md:grid-cols-5 gap-4 w-full">
                         <div>
                             <label className="text-[10px] text-gray-500 font-bold uppercase block mb-1">Label</label>
                             <input 
                                type="text" 
                                value={item.label} 
                                onChange={(e) => handleUpdate(idx, 'label', e.target.value)}
                                className="w-full bg-black/30 border border-white/10 rounded px-2 py-2 text-white text-sm focus:border-royal-500 outline-none"
                             />
                         </div>
                         <div>
                             <label className="text-[10px] text-gray-500 font-bold uppercase block mb-1">Value ($)</label>
                             <input 
                                type="number" 
                                step="0.01"
                                value={item.value} 
                                onChange={(e) => handleUpdate(idx, 'value', e.target.value)}
                                className="w-full bg-black/30 border border-white/10 rounded px-2 py-2 text-white text-sm focus:border-royal-500 outline-none"
                             />
                         </div>
                         <div>
                             <label className="text-[10px] text-gray-500 font-bold uppercase block mb-1">Chance (%)</label>
                             <input 
                                type="number" 
                                step="0.1"
                                value={item.probability} 
                                onChange={(e) => handleUpdate(idx, 'probability', e.target.value)}
                                className="w-full bg-black/30 border border-white/10 rounded px-2 py-2 text-white text-sm focus:border-royal-500 outline-none"
                             />
                         </div>
                         <div>
                             <label className="text-[10px] text-gray-500 font-bold uppercase block mb-1">Color</label>
                             <div className="flex items-center gap-2">
                                 <input 
                                    type="color" 
                                    value={item.color} 
                                    onChange={(e) => handleUpdate(idx, 'color', e.target.value)}
                                    className="w-8 h-9 bg-transparent border-0 p-0 rounded cursor-pointer"
                                 />
                                 <input 
                                    type="text" 
                                    value={item.color} 
                                    onChange={(e) => handleUpdate(idx, 'color', e.target.value)}
                                    className="w-full bg-black/30 border border-white/10 rounded px-2 py-2 text-white text-xs focus:border-royal-500 outline-none"
                                 />
                             </div>
                         </div>
                         <div className="flex items-center justify-between md:justify-center gap-4 pt-4 md:pt-0">
                             <label className="flex items-center gap-2 cursor-pointer">
                                 <input 
                                    type="checkbox" 
                                    checked={item.is_active} 
                                    onChange={(e) => handleUpdate(idx, 'is_active', e.target.checked)}
                                    className="w-4 h-4 accent-neon-green"
                                 />
                                 <span className="text-xs text-white">Active</span>
                             </label>
                             <button 
                                onClick={() => handleDelete(idx, item.id)}
                                className="p-2 bg-red-500/10 text-red-500 rounded hover:bg-red-500/20 transition"
                             >
                                 <Trash2 size={16} />
                             </button>
                         </div>
                     </div>
                </GlassCard>
            ))}
        </div>

        <div className="flex gap-3">
            <button 
                onClick={handleAddItem}
                className="flex-1 py-3 bg-white/5 border border-dashed border-white/20 rounded-xl text-gray-400 hover:text-white hover:border-neon-green hover:bg-neon-green/5 transition flex items-center justify-center gap-2 font-bold"
            >
                <Plus size={18} /> Add New Reward
            </button>
            <button 
                onClick={handleAddPreset}
                className="flex-1 py-3 bg-yellow-500/10 border border-dashed border-yellow-500/20 rounded-xl text-yellow-500 hover:text-yellow-400 hover:border-yellow-500 hover:bg-yellow-500/20 transition flex items-center justify-center gap-2 font-bold"
            >
                <Ticket size={18} /> Add Free Spin Token
            </button>
        </div>
    </div>
  );
};

export default SpinSettings;
