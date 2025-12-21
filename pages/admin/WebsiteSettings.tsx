import React, { useEffect, useState } from 'react';
import GlassCard from '../../components/GlassCard';
import { supabase } from '../../integrations/supabase/client';
import { SystemConfig } from '../../types';
import { Save, Loader2, Settings, Smartphone, Lock, AlertTriangle, Eye, Image as ImageIcon, Percent, Type, BarChart2, Link as LinkIcon, Key, Megaphone } from 'lucide-react';
import { useUI } from '../../context/UIContext';
import ImageSelector from '../../components/ImageSelector';
/* Added missing motion import */
import { motion } from 'framer-motion';

// Extend local interface to match expected DB schema with the new tokens
interface ExtendedSystemConfig extends SystemConfig {
    gplinks_api_token?: string;
}

const WebsiteSettings: React.FC = () => {
  const { toast } = useUI();
  const [config, setConfig] = useState<ExtendedSystemConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
      fetchConfig();
  }, []);

  const fetchConfig = async () => {
      const { data } = await supabase.from('system_config').select('*').limit(1).maybeSingle();
      if(data) {
          // Auto-fill Adsterra Token if missing (User provided: 14810bb4192661f1a6277491c12a2946)
          if (!data.adsterra_api_token) data.adsterra_api_token = '14810bb4192661f1a6277491c12a2946';
          setConfig(data as ExtendedSystemConfig);
      }
      setLoading(false);
  };

  const handleSave = async () => {
      if(!config) return;
      setSaving(true);
      const { error } = await supabase.from('system_config').update({
          maintenance_mode: config.maintenance_mode,
          global_alert: config.global_alert,
          p2p_transfer_fee_percent: config.p2p_transfer_fee_percent,
          p2p_min_transfer: config.p2p_min_transfer,
          is_activation_enabled: config.is_activation_enabled,
          activation_amount: config.activation_amount,
          is_pwa_enabled: config.is_pwa_enabled,
          hero_title: config.hero_title,
          hero_description: config.hero_description,
          hero_image_url: config.hero_image_url,
          task_commission_percent: config.task_commission_percent,
          adsterra_api_token: config.adsterra_api_token,
          gplinks_api_token: config.gplinks_api_token
      }).eq('id', config.id);

      if(error) toast.error(error.message);
      else toast.success("Settings Saved Successfully");
      setSaving(false);
  };

  if(loading) return <div className="flex justify-center py-20"><Loader2 className="animate-spin text-white" size={32}/></div>;
  if(!config) return <div className="text-center mt-10 text-red-500">System Configuration File Missing</div>;

  return (
    <div className="space-y-6 animate-fade-in pb-24 relative">
        <div className="sticky top-0 z-20 bg-[#050505]/90 backdrop-blur-xl py-4 flex justify-between items-center border-b border-white/5 -mx-4 px-4 mb-4">
            <div className="flex items-center gap-2">
                <Settings size={20} className="text-blue-500" />
                <h2 className="text-xl font-black text-white uppercase tracking-tighter">Site Config</h2>
            </div>
            <button 
                onClick={handleSave} 
                disabled={saving}
                className="bg-white text-black px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest flex items-center gap-2 hover:bg-gray-200 disabled:opacity-50 shadow-lg active:scale-95 transition-all"
            >
                {saving ? <Loader2 size={14} className="animate-spin"/> : <Save size={14}/>} Save Changes
            </button>
        </div>
        
        {/* HERO SECTION */}
        <div className="space-y-4">
            <h3 className="text-[10px] font-black text-gray-500 uppercase tracking-[0.3em] pl-1">Landing Interface</h3>
            <GlassCard className="p-5 space-y-4 bg-black/40">
                <div>
                    <label className="text-[10px] font-bold text-gray-500 mb-1.5 block uppercase tracking-wider">Hero Title</label>
                    <input 
                        type="text"
                        value={config.hero_title || ''}
                        onChange={e => setConfig({...config, hero_title: e.target.value})}
                        className="w-full bg-[#111] border border-white/10 rounded-xl p-3 text-white text-sm focus:border-blue-500 outline-none font-bold"
                        placeholder="EARN. PLAY. GROW."
                    />
                </div>
                <div>
                    <label className="text-[10px] font-bold text-gray-500 mb-1.5 block uppercase tracking-wider">Hero Subtitle</label>
                    <textarea 
                        value={config.hero_description || ''}
                        onChange={e => setConfig({...config, hero_description: e.target.value})}
                        className="w-full bg-[#111] border border-white/10 rounded-xl p-3 text-white text-sm focus:border-blue-500 outline-none h-20 resize-none"
                    />
                </div>
                <ImageSelector
                    label="Hero Background Asset"
                    value={config.hero_image_url || ''}
                    onChange={(val) => setConfig({...config, hero_image_url: val})}
                />
            </GlassCard>
        </div>

        {/* API INTEGRATIONS */}
        <div className="space-y-4">
            <h3 className="text-[10px] font-black text-gray-500 uppercase tracking-[0.3em] pl-1">API Integrations</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <GlassCard className="p-5 bg-red-950/10 border-red-500/20">
                    <div className="flex items-center gap-2 mb-4">
                        <div className="p-2 bg-red-500/20 rounded-lg text-red-400"><BarChart2 size={18} /></div>
                        <h4 className="font-black text-white text-sm uppercase tracking-wider">Adsterra Stats</h4>
                    </div>
                    <div>
                        <label className="text-[10px] font-bold text-gray-400 mb-1.5 block uppercase">Publisher API Token</label>
                        <div className="relative">
                            <Key className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-600" size={14}/>
                            <input 
                                type="password"
                                value={config.adsterra_api_token || ''}
                                onChange={e => setConfig({...config, adsterra_api_token: e.target.value})}
                                className="w-full bg-black/40 border border-white/10 rounded-xl py-3 pl-9 pr-4 text-white text-xs font-mono focus:border-red-500 outline-none"
                                placeholder="********************************"
                            />
                        </div>
                        <p className="text-[9px] text-gray-500 mt-2 leading-relaxed">
                            Required to sync live revenue data from Adsterra to your Admin Dashboard.
                        </p>
                    </div>
                </GlassCard>

                <GlassCard className="p-5 bg-blue-950/10 border-blue-500/20">
                    <div className="flex items-center gap-2 mb-4">
                        <div className="p-2 bg-blue-500/20 rounded-lg text-blue-400"><LinkIcon size={18} /></div>
                        <h4 className="font-black text-white text-sm uppercase tracking-wider">GPLinks Integration</h4>
                    </div>
                    <div>
                        <label className="text-[10px] font-bold text-gray-400 mb-1.5 block uppercase">Link Shortener Token</label>
                        <div className="relative">
                            <Key className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-600" size={14}/>
                            <input 
                                type="password"
                                value={config.gplinks_api_token || ''}
                                onChange={e => setConfig({...config, gplinks_api_token: e.target.value})}
                                className="w-full bg-black/40 border border-white/10 rounded-xl py-3 pl-9 pr-4 text-white text-xs font-mono focus:border-blue-500 outline-none"
                                placeholder="********************************"
                            />
                        </div>
                        <p className="text-[9px] text-gray-500 mt-2 leading-relaxed">
                            Used in the "Unlimited Earn" page to shorten affiliate links automatically.
                        </p>
                    </div>
                </GlassCard>
            </div>
        </div>

        {/* ECONOMY SETTINGS */}
        <div className="space-y-4">
            <h3 className="text-[10px] font-black text-gray-500 uppercase tracking-[0.3em] pl-1">Network Economy</h3>
            <GlassCard className="p-5 grid grid-cols-1 md:grid-cols-2 gap-4 bg-black/40">
                <div>
                    <label className="text-[10px] font-bold text-gray-500 mb-1.5 block uppercase tracking-wider">Task User Share (%)</label>
                    <div className="relative">
                        <input 
                            type="number"
                            value={config.task_commission_percent || 90}
                            onChange={e => setConfig({...config, task_commission_percent: parseFloat(e.target.value)})}
                            className="w-full bg-[#111] border border-white/10 rounded-xl p-3 text-white font-mono font-bold focus:border-green-500 outline-none"
                        />
                        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-600 font-bold">%</span>
                    </div>
                    <p className="text-[9px] text-gray-600 mt-2">Percentage of advertiser payment awarded to the worker.</p>
                </div>
                <div>
                    <label className="text-[10px] font-bold text-gray-500 mb-1.5 block uppercase tracking-wider">P2P Network Fee (%)</label>
                    <div className="relative">
                        <input 
                            type="number"
                            value={config.p2p_transfer_fee_percent || 0}
                            onChange={e => setConfig({...config, p2p_transfer_fee_percent: parseFloat(e.target.value)})}
                            className="w-full bg-[#111] border border-white/10 rounded-xl p-3 text-white font-mono font-bold focus:border-blue-500 outline-none"
                        />
                        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-600 font-bold">%</span>
                    </div>
                    <p className="text-[9px] text-gray-600 mt-2">Fee deducted when users send money to each other.</p>
                </div>
            </GlassCard>
        </div>

        {/* ACCOUNT RULES */}
        <div className="space-y-4">
            <h3 className="text-[10px] font-black text-gray-500 uppercase tracking-[0.3em] pl-1">Compliance & Rules</h3>
            <GlassCard className="p-5 bg-purple-950/20 border-purple-500/30">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-purple-600 text-white rounded-lg shadow-lg"><Lock size={18} /></div>
                        <div>
                            <h4 className="font-black text-white text-sm uppercase">Mandatory Activation</h4>
                            <p className="text-[9px] text-gray-500 font-bold uppercase tracking-wider mt-0.5">Require deposit for withdrawal unlock</p>
                        </div>
                    </div>
                    <input 
                        type="checkbox" 
                        checked={config.is_activation_enabled} 
                        onChange={e => setConfig({...config, is_activation_enabled: e.target.checked})}
                        className="w-6 h-6 accent-purple-500 cursor-pointer"
                    />
                </div>
                {config.is_activation_enabled && (
                    /* Added motion check fix */
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}>
                        <label className="text-[10px] font-bold text-purple-300 mb-1.5 block uppercase tracking-widest">Target Deposit (৳ BDT)</label>
                        <input 
                            type="number"
                            value={config.activation_amount || 0}
                            onChange={e => setConfig({...config, activation_amount: parseFloat(e.target.value)})}
                            className="w-full bg-black/40 border border-purple-500/30 rounded-xl p-4 text-white font-mono font-black text-lg focus:border-purple-500 outline-none shadow-inner"
                            placeholder="500"
                        />
                    </motion.div>
                )}
            </GlassCard>
        </div>

        {/* ANNOUNCEMENTS */}
        <div className="space-y-4">
            <h3 className="text-[10px] font-black text-gray-500 uppercase tracking-[0.3em] pl-1">Global Announcements</h3>
            <div className="relative group">
                {/* Added Megaphone fix */ }
                <div className="absolute left-4 top-4 text-yellow-500"><Megaphone size={18}/></div>
                <textarea 
                    value={config.global_alert || ''}
                    onChange={e => setConfig({...config, global_alert: e.target.value})}
                    className="w-full bg-[#111] border border-white/10 rounded-2xl p-4 pl-12 text-white text-sm font-medium focus:border-yellow-500 outline-none h-28 resize-none shadow-2xl transition-all"
                    placeholder="Type urgent system alert here... (Leave blank to disable)"
                />
            </div>
        </div>

        <div className="mt-8 pt-8 border-t border-white/5 text-center">
            <p className="text-[9px] text-gray-700 font-black uppercase tracking-[0.5em]">SYSTEM CONFIGURATION CORE V9.2</p>
        </div>

    </div>
  );
};

export default WebsiteSettings;