
import React, { useEffect, useState } from 'react';
import GlassCard from '../../components/GlassCard';
import { supabase } from '../../integrations/supabase/client';
import { SystemConfig } from '../../types';
import { Save, Loader2, Settings, Smartphone, Lock, AlertTriangle, Eye, Image as ImageIcon, Percent, Type, BarChart2 } from 'lucide-react';
import { useUI } from '../../context/UIContext';
import ImageSelector from '../../components/ImageSelector';

const WebsiteSettings: React.FC = () => {
  const { toast } = useUI();
  const [config, setConfig] = useState<SystemConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
      fetchConfig();
  }, []);

  const fetchConfig = async () => {
      const { data } = await supabase.from('system_config').select('*').limit(1).maybeSingle();
      if(data) {
          // Auto-fill Adsterra Token if missing
          if (!data.adsterra_api_token) data.adsterra_api_token = '14810bb4192661f1a6277491c12a2946';
          setConfig(data as SystemConfig);
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
          adsterra_api_token: config.adsterra_api_token // Save token
      }).eq('id', config.id);

      if(error) toast.error(error.message);
      else toast.success("Settings Saved");
      setSaving(false);
  };

  if(loading) return <Loader2 className="animate-spin mx-auto mt-10 text-white"/>;
  if(!config) return <div className="text-center mt-10 text-red-500">Config missing</div>;

  return (
    <div className="space-y-6 animate-fade-in pb-24 relative">
        <div className="sticky top-0 z-20 bg-[#050505]/90 backdrop-blur-xl py-4 flex justify-between items-center border-b border-white/5 -mx-4 px-4 mb-4">
            <h2 className="text-xl font-bold text-white">Site Config</h2>
            <button 
                onClick={handleSave} 
                disabled={saving}
                className="bg-white text-black px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-2 hover:bg-gray-200 disabled:opacity-50"
            >
                {saving ? <Loader2 size={14} className="animate-spin"/> : <Save size={14}/>} Save
            </button>
        </div>
        
        {/* HERO SECTION */}
        <div className="space-y-4">
            <h3 className="text-xs font-black text-gray-500 uppercase tracking-widest pl-1">Landing Page</h3>
            <GlassCard className="p-4 space-y-4 bg-black/40">
                <div>
                    <label className="text-xs font-bold text-gray-400 mb-1.5 block">Hero Title</label>
                    <input 
                        type="text"
                        value={config.hero_title || ''}
                        onChange={e => setConfig({...config, hero_title: e.target.value})}
                        className="w-full bg-[#111] border border-white/10 rounded-xl p-3 text-white text-sm focus:border-blue-500 outline-none font-bold"
                        placeholder="EARN. PLAY. GROW."
                    />
                </div>
                <div>
                    <label className="text-xs font-bold text-gray-400 mb-1.5 block">Subtitle</label>
                    <textarea 
                        value={config.hero_description || ''}
                        onChange={e => setConfig({...config, hero_description: e.target.value})}
                        className="w-full bg-[#111] border border-white/10 rounded-xl p-3 text-white text-sm focus:border-blue-500 outline-none h-20 resize-none"
                    />
                </div>
                <ImageSelector
                    label="Background Image"
                    value={config.hero_image_url || ''}
                    onChange={(val) => setConfig({...config, hero_image_url: val})}
                />
            </GlassCard>
        </div>

        {/* EXTERNAL INTEGRATION */}
        <div className="space-y-4">
            <h3 className="text-xs font-black text-gray-500 uppercase tracking-widest pl-1">Integration</h3>
            <GlassCard className="p-4 bg-red-900/10 border-red-500/20">
                <div className="flex items-center gap-2 mb-3">
                    <BarChart2 size={16} className="text-red-400" />
                    <h4 className="font-bold text-white text-sm">Adsterra API</h4>
                </div>
                <div>
                    <label className="text-xs font-bold text-gray-400 mb-1.5 block">Publisher API Token</label>
                    <input 
                        type="password"
                        value={config.adsterra_api_token || ''}
                        onChange={e => setConfig({...config, adsterra_api_token: e.target.value})}
                        className="w-full bg-[#111] border border-white/10 rounded-xl p-3 text-white text-sm focus:border-red-500 outline-none"
                        placeholder="Paste token from Adsterra Dashboard..."
                    />
                    <p className="text-[10px] text-gray-500 mt-2">
                        Used to fetch revenue stats for the Admin Dashboard.
                    </p>
                </div>
            </GlassCard>
        </div>

        {/* FEES */}
        <div className="space-y-4">
            <h3 className="text-xs font-black text-gray-500 uppercase tracking-widest pl-1">Economy Fees</h3>
            <GlassCard className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4 bg-black/40">
                <div>
                    <label className="text-xs font-bold text-gray-400 mb-1.5 block">Task User Share (%)</label>
                    <div className="relative">
                        <input 
                            type="number"
                            value={config.task_commission_percent || 90}
                            onChange={e => setConfig({...config, task_commission_percent: parseFloat(e.target.value)})}
                            className="w-full bg-[#111] border border-white/10 rounded-xl p-3 text-white font-mono font-bold focus:border-green-500 outline-none"
                        />
                        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500">%</span>
                    </div>
                    <p className="text-[9px] text-gray-500 mt-1">Percentage of ad cost given to user.</p>
                </div>
                <div>
                    <label className="text-xs font-bold text-gray-400 mb-1.5 block">P2P Transfer Fee (%)</label>
                    <div className="relative">
                        <input 
                            type="number"
                            value={config.p2p_transfer_fee_percent || 0}
                            onChange={e => setConfig({...config, p2p_transfer_fee_percent: parseFloat(e.target.value)})}
                            className="w-full bg-[#111] border border-white/10 rounded-xl p-3 text-white font-mono font-bold focus:border-green-500 outline-none"
                        />
                        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500">%</span>
                    </div>
                </div>
            </GlassCard>
        </div>

        {/* ACTIVATION */}
        <div className="space-y-4">
            <h3 className="text-xs font-black text-gray-500 uppercase tracking-widest pl-1">Account Rules</h3>
            <GlassCard className="p-4 bg-purple-900/10 border-purple-500/20">
                <div className="flex items-center justify-between mb-4">
                    <div>
                        <h4 className="font-bold text-white text-sm">Force Activation</h4>
                        <p className="text-[10px] text-gray-400">Require deposit to unlock withdraws.</p>
                    </div>
                    <input 
                        type="checkbox" 
                        checked={config.is_activation_enabled} 
                        onChange={e => setConfig({...config, is_activation_enabled: e.target.checked})}
                        className="w-5 h-5 accent-purple-500"
                    />
                </div>
                {config.is_activation_enabled && (
                    <div>
                        <label className="text-xs font-bold text-purple-300 mb-1.5 block">Required Deposit (BDT)</label>
                        <input 
                            type="number"
                            value={config.activation_amount || 0}
                            onChange={e => setConfig({...config, activation_amount: parseFloat(e.target.value)})}
                            className="w-full bg-[#111] border border-white/10 rounded-xl p-3 text-white font-mono font-bold focus:border-purple-500 outline-none"
                        />
                    </div>
                )}
            </GlassCard>
        </div>

        {/* GLOBAL ALERT */}
        <div className="space-y-4">
            <h3 className="text-xs font-black text-gray-500 uppercase tracking-widest pl-1">Announcements</h3>
            <textarea 
                value={config.global_alert || ''}
                onChange={e => setConfig({...config, global_alert: e.target.value})}
                className="w-full bg-black/40 border border-white/10 rounded-xl p-4 text-white text-sm focus:border-yellow-500 outline-none h-24 resize-none"
                placeholder="Global alert message... (Leave empty to disable)"
            />
        </div>

    </div>
  );
};

export default WebsiteSettings;
