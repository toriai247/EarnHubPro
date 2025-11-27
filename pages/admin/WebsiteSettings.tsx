
import React, { useEffect, useState } from 'react';
import GlassCard from '../../components/GlassCard';
import { supabase } from '../../integrations/supabase/client';
import { SystemConfig } from '../../types';
import { Save, Loader2, RefreshCw } from 'lucide-react';
import { useUI } from '../../context/UIContext';

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
      if(data) setConfig(data as SystemConfig);
      setLoading(false);
  };

  const handleSave = async () => {
      if(!config) return;
      setSaving(true);
      const { error } = await supabase.from('system_config').update({
          maintenance_mode: config.maintenance_mode,
          global_alert: config.global_alert,
          p2p_transfer_fee_percent: config.p2p_transfer_fee_percent,
          p2p_min_transfer: config.p2p_min_transfer
      }).eq('id', config.id);

      if(error) toast.error(error.message);
      else toast.success("Config Saved!");
      setSaving(false);
  };

  if(loading) return <div className="p-10"><Loader2 className="animate-spin mx-auto text-white"/></div>;
  if(!config) return <div className="p-10 text-center text-red-500">Config missing</div>;

  return (
    <div className="space-y-4 animate-fade-in">
        <h2 className="text-2xl font-bold text-white">Site Configuration</h2>
        
        <GlassCard className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h4 className="font-bold text-white">Maintenance Mode</h4>
                    <p className="text-xs text-gray-400">Disable user access immediately</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" checked={config.maintenance_mode} onChange={e => setConfig({...config, maintenance_mode: e.target.checked})} className="sr-only peer" />
                    <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-red-600"></div>
                </label>
            </div>
            
            <div className="h-px bg-white/10"></div>

            <div className="space-y-2">
                <h4 className="font-bold text-white">Global Announcement</h4>
                <textarea 
                    value={config.global_alert || ''}
                    onChange={e => setConfig({...config, global_alert: e.target.value})}
                    className="w-full bg-black/30 border border-white/10 rounded-xl p-3 text-white text-sm h-24 focus:border-neon-green outline-none" 
                    placeholder="Enter message to show on all user dashboards..."
                ></textarea>
            </div>

            <div className="h-px bg-white/10"></div>

            {/* P2P Settings */}
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="text-xs text-gray-400 font-bold block mb-1">P2P Transfer Fee (%)</label>
                    <input 
                        type="number" 
                        step="0.1" 
                        value={config.p2p_transfer_fee_percent || 0}
                        onChange={e => setConfig({...config, p2p_transfer_fee_percent: parseFloat(e.target.value)})}
                        className="w-full bg-black/30 border border-white/10 rounded-lg p-3 text-white focus:border-neon-green outline-none"
                    />
                </div>
                <div>
                    <label className="text-xs text-gray-400 font-bold block mb-1">Min Transfer ($)</label>
                    <input 
                        type="number" 
                        step="1" 
                        value={config.p2p_min_transfer || 0}
                        onChange={e => setConfig({...config, p2p_min_transfer: parseFloat(e.target.value)})}
                        className="w-full bg-black/30 border border-white/10 rounded-lg p-3 text-white focus:border-neon-green outline-none"
                    />
                </div>
            </div>

            <button 
                onClick={handleSave} 
                disabled={saving}
                className="w-full py-3 bg-royal-600 text-white text-sm font-bold rounded-xl hover:bg-royal-500 transition flex items-center justify-center gap-2"
            >
                {saving ? <Loader2 className="animate-spin"/> : <Save size={18}/>} Save Configuration
            </button>
        </GlassCard>
    </div>
  );
};

export default WebsiteSettings;
