
import React, { useEffect, useState } from 'react';
import GlassCard from '../../components/GlassCard';
import { supabase } from '../../integrations/supabase/client';
import { Asset, InvestmentPlan } from '../../types';
import { Plus, Edit, Trash2, Save, X, TrendingUp, DollarSign, Loader2, Package, Crown, Calendar, Target, Search, Power, CheckCircle, XCircle, ShoppingBag, Coins, Briefcase } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useUI } from '../../context/UIContext';
import ImageSelector from '../../components/ImageSelector';

const InvestmentSetup: React.FC = () => {
  const { toast, confirm } = useUI();
  const [activeTab, setActiveTab] = useState<'assets' | 'packages'>('packages');
  
  const [assets, setAssets] = useState<Asset[]>([]);
  const [packages, setPackages] = useState<InvestmentPlan[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  // Asset Form
  const initialAssetForm: any = {
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
  const [assetForm, setAssetForm] = useState(initialAssetForm);

  // Package Form
  const initialPackageForm = {
      name: '',
      min_invest: '', // Cost
      daily_return: '', // Daily Income
      duration: '', // Days
      badge_tag: '',
      is_active: true
  };
  const [packageForm, setPackageForm] = useState(initialPackageForm);

  useEffect(() => {
      fetchData();
  }, []);

  const fetchData = async () => {
      setLoading(true);
      // Fetch Assets
      const { data: aData } = await supabase.from('assets').select('*').order('created_at', { ascending: false });
      if (aData) setAssets(aData as Asset[]);
      
      // Fetch Packages
      const { data: pData } = await supabase.from('investment_plans').select('*').order('min_invest', { ascending: true });
      if (pData) setPackages(pData as InvestmentPlan[]);
      
      setLoading(false);
  };

  // --- PACKAGE HANDLERS ---
  const handleEditPackage = (plan: InvestmentPlan) => {
      setPackageForm({
          name: plan.name,
          min_invest: plan.min_invest.toString(),
          daily_return: plan.daily_return.toString(),
          duration: plan.duration.toString(),
          badge_tag: plan.badge_tag || '',
          is_active: !!plan.is_active
      });
      setEditingId(plan.id);
      setActiveTab('packages');
      setIsEditing(true);
  };

  const handleSavePackage = async (e: React.FormEvent) => {
      e.preventDefault();
      const cost = parseFloat(packageForm.min_invest);
      const daily = parseFloat(packageForm.daily_return);
      const duration = parseInt(packageForm.duration);
      
      const total_roi = daily * duration;

      const payload = {
          name: packageForm.name,
          min_invest: cost,
          daily_return: daily,
          duration: duration,
          total_roi: total_roi,
          badge_tag: packageForm.badge_tag || null,
          is_active: packageForm.is_active
      };

      try {
          if (editingId) {
              await supabase.from('investment_plans').update(payload).eq('id', editingId);
          } else {
              await supabase.from('investment_plans').insert(payload);
          }
          toast.success("Package Saved");
          setIsEditing(false);
          setPackageForm(initialPackageForm);
          setEditingId(null);
          fetchData();
      } catch (e: any) {
          toast.error(e.message);
      }
  };

  const handleDeletePackage = async (id: string) => {
      if (!await confirm("Delete this package?")) return;
      await supabase.from('investment_plans').delete().eq('id', id);
      fetchData();
      toast.success("Deleted");
  };

  const togglePackageActive = async (plan: InvestmentPlan) => {
      const newVal = !plan.is_active;
      // Optimistic
      setPackages(prev => prev.map(p => p.id === plan.id ? { ...p, is_active: newVal } : p));
      await supabase.from('investment_plans').update({ is_active: newVal }).eq('id', plan.id);
      toast.success(newVal ? "Plan Activated" : "Plan Disabled");
  };


  // --- ASSET HANDLERS ---
  const handleEditAsset = (asset: Asset) => {
      setAssetForm({
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
      setActiveTab('assets');
      setIsEditing(true);
  };

  const handleSaveAsset = async (e: React.FormEvent) => {
      e.preventDefault();
      const payload: any = {
          type: assetForm.type,
          name: assetForm.name,
          description: assetForm.description,
          image_url: assetForm.image_url,
          current_price: parseFloat(assetForm.current_price),
          is_active: assetForm.is_active
      };

      if (assetForm.type === 'business') {
          payload.target_fund = parseFloat(assetForm.target_fund);
          payload.profit_rate = parseFloat(assetForm.profit_rate);
          payload.duration_days = parseInt(assetForm.duration_days);
      }

      try {
          if (editingId) {
              await supabase.from('assets').update(payload).eq('id', editingId);
          } else {
              payload.previous_price = payload.current_price;
              await supabase.from('assets').insert(payload);
          }
          toast.success("Asset Saved");
          setIsEditing(false);
          setAssetForm(initialAssetForm);
          setEditingId(null);
          fetchData();
      } catch (e: any) {
          toast.error(e.message);
      }
  };

  const handleDeleteAsset = async (id: string) => {
      if (!await confirm("Delete this asset?")) return;
      await supabase.from('assets').delete().eq('id', id);
      fetchData();
      toast.success("Deleted");
  };
  
  const toggleAssetActive = async (asset: Asset) => {
      const newVal = !asset.is_active;
      // Optimistic
      setAssets(prev => prev.map(a => a.id === asset.id ? { ...a, is_active: newVal } : a));
      await supabase.from('assets').update({ is_active: newVal }).eq('id', asset.id);
      toast.success(newVal ? "Asset Activated" : "Asset Disabled");
  };

  // Filters
  const filteredPackages = packages.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()));
  const filteredAssets = assets.filter(a => a.name.toLowerCase().includes(searchTerm.toLowerCase()));


  return (
    <div className="space-y-6 animate-fade-in relative pb-20">
        
        {/* HEADER & CONTROLS */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
           <div>
               <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                   <TrendingUp className="text-blue-500" /> Investment Control
               </h2>
               <p className="text-gray-400 text-sm">Manage VIP Packages and Market Assets.</p>
           </div>
           
           <div className="flex gap-2 w-full md:w-auto">
               <div className="relative flex-1 md:flex-none">
                   <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={16}/>
                   <input 
                    type="text" 
                    placeholder="Search..." 
                    value={searchTerm} 
                    onChange={e => setSearchTerm(e.target.value)}
                    className="bg-black/30 border border-white/10 rounded-xl pl-9 pr-3 py-2 text-sm text-white focus:border-blue-500 outline-none w-full"
                   />
               </div>
               <button 
                 onClick={() => { 
                     setIsEditing(true); 
                     setEditingId(null); 
                     if(activeTab==='assets') setAssetForm(initialAssetForm); 
                     else setPackageForm(initialPackageForm);
                 }}
                 className="bg-blue-600 text-white px-4 py-2 rounded-xl font-bold flex items-center gap-2 hover:bg-blue-500 transition shadow-lg whitespace-nowrap"
                >
                   <Plus size={18}/> New
               </button>
           </div>
        </div>
        
        {/* TABS */}
        <div className="flex border-b border-white/10 gap-6">
            <button 
                onClick={() => { setActiveTab('packages'); setIsEditing(false); }}
                className={`pb-3 text-sm font-bold uppercase tracking-wider flex items-center gap-2 relative ${activeTab === 'packages' ? 'text-white' : 'text-gray-500 hover:text-gray-300'}`}
            >
                <Crown size={16} className={activeTab === 'packages' ? 'text-yellow-400' : ''}/> VIP Plans (New)
                {activeTab === 'packages' && <motion.div layoutId="tabLine" className="absolute bottom-0 left-0 right-0 h-0.5 bg-yellow-400" />}
            </button>
            <button 
                onClick={() => { setActiveTab('assets'); setIsEditing(false); }}
                className={`pb-3 text-sm font-bold uppercase tracking-wider flex items-center gap-2 relative ${activeTab === 'assets' ? 'text-white' : 'text-gray-500 hover:text-gray-300'}`}
            >
                <ShoppingBag size={16} className={activeTab === 'assets' ? 'text-green-400' : ''}/> Market Assets (Old)
                {activeTab === 'assets' && <motion.div layoutId="tabLine" className="absolute bottom-0 left-0 right-0 h-0.5 bg-green-400" />}
            </button>
        </div>

        {loading ? (
             <div className="flex justify-center py-10"><Loader2 className="animate-spin text-blue-500" size={32} /></div>
        ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                
                {/* --- PACKAGES GRID --- */}
                {activeTab === 'packages' && (filteredPackages.length === 0 ? (
                    <div className="col-span-full text-center text-gray-500 py-10">No VIP packages found.</div>
                ) : (
                    filteredPackages.map(plan => (
                        <GlassCard key={plan.id} className={`border group transition-all relative ${plan.is_active ? 'border-purple-500/20 bg-purple-900/10 hover:border-purple-500/40' : 'border-white/5 bg-black/40 opacity-60'}`}>
                            <div className="flex justify-between items-start mb-4">
                                <div>
                                    <h4 className="font-bold text-white text-lg flex items-center gap-2">
                                        <Crown size={18} className="text-yellow-400 fill-yellow-400" />
                                        {plan.name}
                                    </h4>
                                    {plan.badge_tag && <span className="text-[9px] bg-yellow-500 text-black px-1.5 py-0.5 rounded font-bold uppercase mt-1 inline-block">{plan.badge_tag}</span>}
                                </div>
                                <div className="text-right">
                                    <span className="text-xl font-bold text-white font-mono">৳{plan.min_invest}</span>
                                    <div 
                                        className={`flex items-center justify-end gap-1 text-[9px] font-bold uppercase mt-1 cursor-pointer ${plan.is_active ? 'text-green-400' : 'text-red-400'}`}
                                        onClick={() => togglePackageActive(plan)}
                                    >
                                        {plan.is_active ? <CheckCircle size={10}/> : <XCircle size={10}/>} {plan.is_active ? 'Active' : 'Disabled'}
                                    </div>
                                </div>
                            </div>
                            
                            <div className="space-y-2 bg-black/30 p-3 rounded-lg border border-white/5 mb-4 text-sm">
                                <div className="flex justify-between">
                                    <span className="text-gray-400">Daily Income</span>
                                    <span className="text-green-400 font-bold">+৳{plan.daily_return}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-400">Total Profit</span>
                                    <span className="text-white font-bold">৳{((plan.daily_return * plan.duration) - plan.min_invest).toFixed(0)}</span>
                                </div>
                                <div className="flex justify-between border-t border-white/10 pt-1 mt-1">
                                    <span className="text-gray-400">Duration</span>
                                    <span className="text-white">{plan.duration} Days</span>
                                </div>
                            </div>

                            <div className="flex gap-2">
                                <button onClick={() => handleEditPackage(plan)} className="flex-1 py-2 bg-blue-500/10 text-blue-400 text-xs rounded-lg font-bold hover:bg-blue-500/20 flex items-center justify-center gap-1"><Edit size={12}/> Edit</button>
                                <button onClick={() => handleDeletePackage(plan.id)} className="flex-1 py-2 bg-red-500/10 text-red-400 text-xs rounded-lg font-bold hover:bg-red-500/20 flex items-center justify-center gap-1"><Trash2 size={12}/> Delete</button>
                            </div>
                        </GlassCard>
                    ))
                ))}

                {/* --- ASSETS GRID --- */}
                {activeTab === 'assets' && (filteredAssets.length === 0 ? (
                    <div className="col-span-full text-center text-gray-500 py-10">No market assets found.</div>
                ) : (
                    filteredAssets.map(asset => (
                        <GlassCard key={asset.id} className={`border group transition-all ${asset.is_active ? 'border-white/10 hover:border-white/30' : 'border-white/5 bg-black/40 opacity-60'}`}>
                            <div className="flex justify-between items-start mb-3">
                                <div className="flex gap-3">
                                    <img src={asset.image_url || 'https://via.placeholder.com/50'} className="w-10 h-10 object-contain bg-white/5 rounded-lg p-1" />
                                    <div>
                                        <h4 className="font-bold text-white text-sm">{asset.name}</h4>
                                        <span className={`text-[9px] px-2 py-0.5 rounded font-bold uppercase ${asset.type === 'business' ? 'bg-purple-500/20 text-purple-400' : asset.type === 'currency' ? 'bg-green-500/20 text-green-400' : 'bg-blue-500/20 text-blue-400'}`}>
                                            {asset.type}
                                        </span>
                                    </div>
                                </div>
                                <div 
                                    className={`flex items-center gap-1 text-[9px] font-bold uppercase cursor-pointer px-2 py-1 rounded border ${asset.is_active ? 'text-green-400 border-green-500/20 bg-green-500/10' : 'text-red-400 border-red-500/20 bg-red-500/10'}`}
                                    onClick={() => toggleAssetActive(asset)}
                                >
                                    <Power size={10} /> {asset.is_active ? 'ON' : 'OFF'}
                                </div>
                            </div>
                            
                            <div className="bg-black/30 p-3 rounded-lg border border-white/5 text-sm space-y-1 mb-4">
                                <div className="flex justify-between">
                                    <span className="text-gray-500">Price</span>
                                    <span className="text-white font-mono font-bold">৳{asset.current_price}</span>
                                </div>
                                {asset.type === 'business' && (
                                    <div className="flex justify-between border-t border-white/10 pt-1 mt-1">
                                        <span className="text-gray-500">Target Fund</span>
                                        <span className="text-blue-400">৳{asset.target_fund}</span>
                                    </div>
                                )}
                            </div>
                            
                            <div className="flex gap-2">
                                <button onClick={() => handleEditAsset(asset)} className="flex-1 py-2 bg-blue-500/10 text-blue-400 text-xs rounded-lg font-bold hover:bg-blue-500/20 flex items-center justify-center gap-1"><Edit size={12}/> Edit</button>
                                <button onClick={() => handleDeleteAsset(asset.id)} className="flex-1 py-2 bg-red-500/10 text-red-400 text-xs rounded-lg font-bold hover:bg-red-500/20 flex items-center justify-center gap-1"><Trash2 size={12}/> Delete</button>
                            </div>
                        </GlassCard>
                    ))
                ))}
            </div>
        )}

        {/* MODAL FORM */}
        <AnimatePresence>
            {isEditing && (
                 <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
                    <motion.div 
                        initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
                        className="bg-dark-900 w-full max-w-lg rounded-2xl border border-white/10 p-6 max-h-[90vh] overflow-y-auto custom-scrollbar shadow-2xl"
                    >
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-bold text-white flex items-center gap-2">
                                {activeTab === 'packages' ? <Crown size={24} className="text-yellow-400"/> : <ShoppingBag size={24} className="text-green-400"/>}
                                {editingId ? 'Edit' : 'Create'} {activeTab === 'packages' ? 'VIP Package' : 'Asset'}
                            </h3>
                            <button onClick={() => setIsEditing(false)} className="text-gray-500 hover:text-white"><X size={24}/></button>
                        </div>

                        {activeTab === 'packages' ? (
                            <form onSubmit={handleSavePackage} className="space-y-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-400 mb-1 uppercase">Package Name</label>
                                    <input required type="text" value={packageForm.name} onChange={e => setPackageForm({...packageForm, name: e.target.value})} className="w-full bg-black/30 border border-white/10 rounded-lg p-3 text-white outline-none focus:border-purple-500" placeholder="e.g. Silver Plan" />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-bold text-gray-400 mb-1 uppercase">Price (BDT)</label>
                                        <input required type="number" value={packageForm.min_invest} onChange={e => setPackageForm({...packageForm, min_invest: e.target.value})} className="w-full bg-black/30 border border-white/10 rounded-lg p-3 text-white outline-none focus:border-purple-500" placeholder="500" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-400 mb-1 uppercase">Daily Income (BDT)</label>
                                        <input required type="number" value={packageForm.daily_return} onChange={e => setPackageForm({...packageForm, daily_return: e.target.value})} className="w-full bg-black/30 border border-white/10 rounded-lg p-3 text-white outline-none focus:border-purple-500" placeholder="20" />
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-bold text-gray-400 mb-1 uppercase">Duration (Days)</label>
                                        <input required type="number" value={packageForm.duration} onChange={e => setPackageForm({...packageForm, duration: e.target.value})} className="w-full bg-black/30 border border-white/10 rounded-lg p-3 text-white outline-none focus:border-purple-500" placeholder="30" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-400 mb-1 uppercase">Badge (Optional)</label>
                                        <input type="text" value={packageForm.badge_tag} onChange={e => setPackageForm({...packageForm, badge_tag: e.target.value})} className="w-full bg-black/30 border border-white/10 rounded-lg p-3 text-white outline-none focus:border-purple-500" placeholder="HOT" />
                                    </div>
                                </div>

                                {/* Preview Calculation */}
                                <div className="bg-purple-500/10 p-4 rounded-xl border border-purple-500/20 text-xs">
                                    <div className="flex justify-between mb-1">
                                        <span className="text-gray-400">Total Return (Approx):</span>
                                        <span className="text-white font-bold">
                                            {packageForm.daily_return && packageForm.duration ? 
                                                `৳${(parseFloat(packageForm.daily_return) * parseInt(packageForm.duration)).toFixed(0)}` : '---'}
                                        </span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-400">Net Profit:</span>
                                        <span className="text-green-400 font-bold">
                                             {packageForm.daily_return && packageForm.duration && packageForm.min_invest ? 
                                                `৳${((parseFloat(packageForm.daily_return) * parseInt(packageForm.duration)) - parseFloat(packageForm.min_invest)).toFixed(0)}` : '---'}
                                        </span>
                                    </div>
                                </div>

                                <div className="flex items-center gap-3 mt-2 bg-white/5 p-3 rounded-lg">
                                    <input type="checkbox" checked={packageForm.is_active} onChange={e => setPackageForm({...packageForm, is_active: e.target.checked})} className="w-5 h-5 accent-purple-500 cursor-pointer"/>
                                    <span className="text-sm text-white font-bold">Active for Users</span>
                                </div>

                                <button type="submit" className="w-full py-3 bg-purple-600 text-white font-bold rounded-xl hover:bg-purple-500 transition flex items-center justify-center gap-2 mt-4 shadow-lg shadow-purple-900/20">
                                    <Save size={18} /> Save Package
                                </button>
                            </form>
                        ) : (
                            <form onSubmit={handleSaveAsset} className="space-y-4">
                                 <div>
                                    <label className="block text-xs font-bold text-gray-400 mb-1 uppercase">Asset Type</label>
                                    <div className="grid grid-cols-3 gap-2">
                                        {['commodity', 'currency', 'business'].map(t => (
                                            <div 
                                                key={t}
                                                onClick={() => setAssetForm({...assetForm, type: t})}
                                                className={`cursor-pointer text-center py-2 rounded-lg text-xs font-bold border transition ${assetForm.type === t ? 'bg-blue-600 border-blue-500 text-white' : 'bg-black/30 border-white/10 text-gray-500'}`}
                                            >
                                                {t}
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-gray-400 mb-1 uppercase">Name</label>
                                    <input required type="text" value={assetForm.name} onChange={e => setAssetForm({...assetForm, name: e.target.value})} className="w-full bg-black/30 border border-white/10 rounded-lg p-3 text-white outline-none focus:border-blue-500" placeholder="e.g. 24k Gold" />
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-gray-400 mb-1 uppercase">Current Price (Base)</label>
                                    <input required type="number" step="0.01" value={assetForm.current_price} onChange={e => setAssetForm({...assetForm, current_price: e.target.value})} className="w-full bg-black/30 border border-white/10 rounded-lg p-3 text-white outline-none focus:border-blue-500" />
                                </div>
                                
                                {assetForm.type === 'business' && (
                                    <div className="grid grid-cols-2 gap-4 bg-white/5 p-3 rounded-xl border border-white/10">
                                        <div>
                                            <label className="block text-[10px] font-bold text-gray-400 mb-1 uppercase">Target Fund</label>
                                            <input type="number" value={assetForm.target_fund} onChange={e => setAssetForm({...assetForm, target_fund: e.target.value})} className="w-full bg-black/40 border border-white/10 rounded p-2 text-white text-xs outline-none" />
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-bold text-gray-400 mb-1 uppercase">Profit %</label>
                                            <input type="number" value={assetForm.profit_rate} onChange={e => setAssetForm({...assetForm, profit_rate: e.target.value})} className="w-full bg-black/40 border border-white/10 rounded p-2 text-white text-xs outline-none" />
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-bold text-gray-400 mb-1 uppercase">Duration</label>
                                            <input type="number" value={assetForm.duration_days} onChange={e => setAssetForm({...assetForm, duration_days: e.target.value})} className="w-full bg-black/40 border border-white/10 rounded p-2 text-white text-xs outline-none" />
                                        </div>
                                    </div>
                                )}

                                <ImageSelector 
                                    label="Asset Image"
                                    value={assetForm.image_url} 
                                    onChange={(val) => setAssetForm({...assetForm, image_url: val})} 
                                />

                                <div>
                                    <label className="block text-xs font-bold text-gray-400 mb-1 uppercase">Description</label>
                                    <textarea value={assetForm.description} onChange={e => setAssetForm({...assetForm, description: e.target.value})} className="w-full bg-black/30 border border-white/10 rounded-lg p-3 text-white outline-none h-20 resize-none focus:border-blue-500" />
                                </div>

                                <div className="flex items-center gap-3 bg-white/5 p-3 rounded-lg">
                                    <input type="checkbox" checked={assetForm.is_active} onChange={e => setAssetForm({...assetForm, is_active: e.target.checked})} className="w-5 h-5 accent-blue-500 cursor-pointer"/>
                                    <span className="text-sm text-white font-bold">Active in Market</span>
                                </div>

                                <button type="submit" className="w-full py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-500 transition flex items-center justify-center gap-2 mt-4 shadow-lg shadow-blue-900/20">
                                    <Save size={18} /> Save Asset
                                </button>
                            </form>
                        )}

                    </motion.div>
                 </div>
            )}
        </AnimatePresence>
    </div>
  );
};

export default InvestmentSetup;
