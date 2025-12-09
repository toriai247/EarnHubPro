
import React, { useEffect, useState } from 'react';
import GlassCard from '../../components/GlassCard';
import { supabase } from '../../integrations/supabase/client';
import { Asset } from '../../types';
import { Plus, Edit, Trash2, Save, X, TrendingUp, DollarSign, Loader2, Package } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useUI } from '../../context/UIContext';
import ImageSelector from '../../components/ImageSelector';

const InvestmentSetup: React.FC = () => {
  const { toast, confirm } = useUI();
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const initialForm: any = {
      type: 'commodity',
      name: '',
      description: '',
      image_url: '',
      current_price: '',
      target_fund: '',
      profit_rate: '',
      duration_days: '',
      is_active: true
  };
  const [form, setForm] = useState(initialForm);

  useEffect(() => {
      fetchAssets();
  }, []);

  const fetchAssets = async () => {
      setLoading(true);
      const { data } = await supabase.from('assets').select('*').order('created_at', { ascending: false });
      if (data) setAssets(data as Asset[]);
      setLoading(false);
  };

  const handleEdit = (asset: Asset) => {
      setForm({
          type: asset.type,
          name: asset.name,
          description: asset.description || '',
          image_url: asset.image_url || '',
          current_price: asset.current_price.toString(),
          target_fund: asset.target_fund?.toString() || '',
          profit_rate: asset.profit_rate?.toString() || '',
          duration_days: asset.duration_days?.toString() || '',
          is_active: asset.is_active
      });
      setEditingId(asset.id);
      setIsEditing(true);
  };

  const handleDelete = async (id: string) => {
      if (!await confirm("Delete this asset? User holdings will remain but asset will be removed from market.")) return;
      await supabase.from('assets').delete().eq('id', id);
      fetchAssets();
  };

  const handleSave = async (e: React.FormEvent) => {
      e.preventDefault();
      const payload: any = {
          type: form.type,
          name: form.name,
          description: form.description,
          image_url: form.image_url,
          current_price: parseFloat(form.current_price),
          is_active: form.is_active
      };

      if (form.type === 'business') {
          payload.target_fund = parseFloat(form.target_fund);
          payload.profit_rate = parseFloat(form.profit_rate);
          payload.duration_days = parseInt(form.duration_days);
      }

      try {
          if (editingId) {
              await supabase.from('assets').update(payload).eq('id', editingId);
          } else {
              // Set previous price same as current for new items
              payload.previous_price = payload.current_price;
              await supabase.from('assets').insert(payload);
          }
          
          toast.success("Asset Saved");
          setIsEditing(false);
          setForm(initialForm);
          setEditingId(null);
          fetchAssets();
      } catch (e: any) {
          toast.error(e.message);
      }
  };

  return (
    <div className="space-y-6 animate-fade-in relative pb-20">
        <div className="flex justify-between items-center">
           <h2 className="text-2xl font-bold text-white">Market Assets</h2>
           <button 
             onClick={() => { setIsEditing(true); setEditingId(null); setForm(initialForm); }}
             className="bg-neon-green text-black px-4 py-2 rounded-xl font-bold flex items-center gap-2 hover:scale-105 transition shadow-lg"
            >
               <Plus size={18}/> Add New Asset
           </button>
        </div>

        {loading ? (
             <div className="flex justify-center py-10"><Loader2 className="animate-spin text-neon-green" size={32} /></div>
        ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {assets.map(asset => (
                    <GlassCard key={asset.id} className="border border-white/10 group hover:border-white/20 transition">
                        <div className="flex gap-3 mb-3">
                            <img src={asset.image_url || 'https://via.placeholder.com/50'} className="w-12 h-12 object-contain bg-white/5 rounded-lg p-1" />
                            <div>
                                <h4 className="font-bold text-white">{asset.name}</h4>
                                <span className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase ${asset.type === 'business' ? 'bg-purple-500/20 text-purple-400' : 'bg-blue-500/20 text-blue-400'}`}>
                                    {asset.type}
                                </span>
                            </div>
                        </div>
                        
                        <div className="bg-black/30 p-3 rounded-lg border border-white/5 text-sm space-y-1 mb-4">
                            <div className="flex justify-between">
                                <span className="text-gray-500">Price</span>
                                <span className="text-white font-mono font-bold">৳{asset.current_price}</span>
                            </div>
                            {asset.type === 'business' && (
                                <>
                                    <div className="flex justify-between">
                                        <span className="text-gray-500">Target</span>
                                        <span className="text-white font-mono">৳{asset.target_fund}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-500">Raised</span>
                                        <span className="text-neon-green font-mono">৳{asset.collected_fund}</span>
                                    </div>
                                </>
                            )}
                        </div>

                        <div className="flex gap-2">
                            <button onClick={() => handleEdit(asset)} className="flex-1 py-2 bg-blue-500/10 text-blue-400 text-xs rounded-lg font-bold hover:bg-blue-500/20">Edit</button>
                            <button onClick={() => handleDelete(asset.id)} className="flex-1 py-2 bg-red-500/10 text-red-400 text-xs rounded-lg font-bold hover:bg-red-500/20">Delete</button>
                        </div>
                    </GlassCard>
                ))}
            </div>
        )}

        <AnimatePresence>
            {isEditing && (
                 <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
                    <motion.div 
                        initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }}
                        className="bg-dark-900 w-full max-w-lg rounded-2xl border border-white/10 p-6 max-h-[90vh] overflow-y-auto custom-scrollbar"
                    >
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-bold text-white">{editingId ? 'Edit Asset' : 'Create Asset'}</h3>
                            <button onClick={() => setIsEditing(false)} className="text-gray-500 hover:text-white"><X size={24}/></button>
                        </div>

                        <form onSubmit={handleSave} className="space-y-4">
                             <div>
                                <label className="block text-xs font-bold text-gray-400 mb-1">Asset Type</label>
                                <select value={form.type} onChange={e => setForm({...form, type: e.target.value})} className="w-full bg-black/30 border border-white/10 rounded-lg p-3 text-white outline-none">
                                    <option value="commodity">Commodity (Gold/Silver)</option>
                                    <option value="currency">Currency (USD/EUR)</option>
                                    <option value="business">Business (Crowdfunding)</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-400 mb-1">Name</label>
                                <input required type="text" value={form.name} onChange={e => setForm({...form, name: e.target.value})} className="w-full bg-black/30 border border-white/10 rounded-lg p-3 text-white outline-none" placeholder="e.g. 24k Gold" />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-400 mb-1">Current Price (Base)</label>
                                <input required type="number" step="0.01" value={form.current_price} onChange={e => setForm({...form, current_price: e.target.value})} className="w-full bg-black/30 border border-white/10 rounded-lg p-3 text-white outline-none" />
                            </div>

                            <ImageSelector 
                                label="Asset Image"
                                value={form.image_url} 
                                onChange={(val) => setForm({...form, image_url: val})} 
                            />

                            {form.type === 'business' && (
                                <div className="space-y-4 border-t border-white/10 pt-4">
                                    <p className="text-xs font-bold text-purple-400 uppercase">Business Details</p>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-xs font-bold text-gray-400 mb-1">Target Fund (BDT)</label>
                                            <input required type="number" value={form.target_fund} onChange={e => setForm({...form, target_fund: e.target.value})} className="w-full bg-black/30 border border-white/10 rounded-lg p-3 text-white outline-none" />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-gray-400 mb-1">Duration (Days)</label>
                                            <input required type="number" value={form.duration_days} onChange={e => setForm({...form, duration_days: e.target.value})} className="w-full bg-black/30 border border-white/10 rounded-lg p-3 text-white outline-none" />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-400 mb-1">Proj. Profit (%)</label>
                                        <input required type="number" step="0.1" value={form.profit_rate} onChange={e => setForm({...form, profit_rate: e.target.value})} className="w-full bg-black/30 border border-white/10 rounded-lg p-3 text-white outline-none" />
                                    </div>
                                </div>
                            )}
                            
                            <div>
                                <label className="block text-xs font-bold text-gray-400 mb-1">Description</label>
                                <textarea value={form.description} onChange={e => setForm({...form, description: e.target.value})} className="w-full bg-black/30 border border-white/10 rounded-lg p-3 text-white outline-none h-20 resize-none" />
                            </div>

                            <div className="flex items-center gap-3">
                                <input type="checkbox" checked={form.is_active} onChange={e => setForm({...form, is_active: e.target.checked})} className="w-5 h-5 accent-neon-green"/>
                                <span className="text-sm text-white">Active in Market</span>
                            </div>

                            <button type="submit" className="w-full py-3 bg-neon-green text-black font-bold rounded-xl hover:bg-emerald-400 transition flex items-center justify-center gap-2 mt-4">
                                <Save size={18} /> Save Asset
                            </button>
                        </form>
                    </motion.div>
                 </div>
            )}
        </AnimatePresence>
    </div>
  );
};

export default InvestmentSetup;
