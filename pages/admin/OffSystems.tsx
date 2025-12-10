
import React, { useEffect, useState } from 'react';
import GlassCard from '../../components/GlassCard';
import { supabase } from '../../integrations/supabase/client';
import { SystemConfig, GameConfig } from '../../types';
import { 
  Power, Save, AlertTriangle, Lock, MonitorOff, 
  Gamepad2, Zap, Users, Video, Wallet, ArrowUpRight, ShieldAlert, Activity, Eye, RefreshCw, X, CheckCircle2, Server, RotateCcw, AlertOctagon,
  Info, Megaphone, Dice1, Play, CheckSquare
} from 'lucide-react';
import { useUI } from '../../context/UIContext';
import Loader from '../../components/Loader';
import { motion, AnimatePresence } from 'framer-motion';

const OffSystems: React.FC = () => {
  const { toast, confirm } = useUI();
  const [config, setConfig] = useState<SystemConfig | null>(null);
  const [originalConfig, setOriginalConfig] = useState<SystemConfig | null>(null);
  const [gameConfigs, setGameConfigs] = useState<GameConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    fetchConfig();
    fetchGameConfigs();
    
    const sub = supabase
        .channel('system_config_live')
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'system_config' }, (payload: any) => {
            const newConfig = payload.new as SystemConfig;
            setConfig(newConfig);
            setOriginalConfig(newConfig);
        })
        .subscribe();

    return () => { sub.unsubscribe(); };
  }, []);

  useEffect(() => {
      if (config && originalConfig) {
          const isDifferent = JSON.stringify(config) !== JSON.stringify(originalConfig);
          setHasChanges(isDifferent);
      }
  }, [config, originalConfig]);

  const fetchConfig = async () => {
    setLoading(true);
    const { data } = await supabase.from('system_config').select('*').limit(1).maybeSingle();
    if (data) {
        setConfig(data as SystemConfig);
        setOriginalConfig(data as SystemConfig);
    }
    setLoading(false);
  };

  const fetchGameConfigs = async () => {
      const { data } = await supabase.from('game_configs').select('*').order('name');
      if (data) setGameConfigs(data as GameConfig[]);
  };

  const handleToggle = (key: keyof SystemConfig) => {
      if (!config) return;
      // @ts-ignore
      const newVal = !config[key];
      // @ts-ignore
      setConfig({ ...config, [key]: newVal });
  };

  const handleGameToggle = async (gameId: string, currentStatus: boolean) => {
      const newStatus = !currentStatus;
      setGameConfigs(prev => prev.map(g => g.id === gameId ? { ...g, is_active: newStatus } : g));
      
      const { error } = await supabase.from('game_configs').upsert({ id: gameId, name: 'Game', is_active: newStatus });
      
      if (error) {
          toast.error(`Update failed: ${error.message}`);
          fetchGameConfigs();
      }
  };

  const handleSave = async () => {
      if (!config) return;
      if (config.maintenance_mode && !originalConfig?.maintenance_mode) {
          if (!await confirm("Enable Maintenance Mode? Users will be locked out.", "CRITICAL")) return;
      }

      setSaving(true);
      const { error } = await supabase.from('system_config').update({
          is_tasks_enabled: config.is_tasks_enabled,
          is_games_enabled: config.is_games_enabled,
          is_invest_enabled: config.is_invest_enabled,
          is_invite_enabled: config.is_invite_enabled,
          is_video_enabled: config.is_video_enabled,
          is_deposit_enabled: config.is_deposit_enabled,
          is_withdraw_enabled: config.is_withdraw_enabled,
          maintenance_mode: config.maintenance_mode,
          global_alert: config.global_alert
      }).eq('id', config.id);

      if (error) toast.error("Failed: " + error.message);
      else {
          toast.success("System Config Updated");
          setOriginalConfig(config);
          setHasChanges(false);
      }
      setSaving(false);
  };

  const ToggleSwitch = ({ isOn, onClick, danger = false }: { isOn: boolean, onClick: () => void, danger?: boolean }) => (
      <button 
          onClick={onClick}
          className={`relative w-14 h-8 rounded-full transition-all duration-300 border-2 ${
              isOn 
                ? (danger ? 'bg-red-600 border-red-500' : 'bg-green-600 border-green-500') 
                : 'bg-gray-800 border-gray-700'
          }`}
      >
          <motion.div 
              layout
              className="absolute top-1 left-1 w-5 h-5 bg-white rounded-full shadow-md"
              animate={{ x: isOn ? 24 : 0 }}
          />
      </button>
  );

  const SystemModule = ({ title, desc, icon: Icon, isOn, toggleKey, color = "text-blue-400" }: any) => (
      <div className={`p-4 rounded-2xl border transition-all duration-300 flex items-center justify-between ${isOn ? 'bg-white/5 border-white/10' : 'bg-black/40 border-white/5 opacity-70'}`}>
          <div className="flex items-center gap-4">
              <div className={`p-3 rounded-xl bg-black/40 ${isOn ? color : 'text-gray-500'}`}>
                  <Icon size={24} />
              </div>
              <div>
                  <h4 className={`font-bold text-sm ${isOn ? 'text-white' : 'text-gray-400'}`}>{title}</h4>
                  <p className="text-[10px] text-gray-500 mt-0.5">{desc}</p>
              </div>
          </div>
          <ToggleSwitch isOn={isOn} onClick={() => handleToggle(toggleKey)} />
      </div>
  );

  if (loading) return <Loader />;
  if (!config) return <div className="p-10 text-center text-red-500">Config missing.</div>;

  return (
    <div className="space-y-8 pb-32">
        
        {/* KILL SWITCH */}
        <div className={`p-6 rounded-2xl border-2 transition-colors ${config.maintenance_mode ? 'bg-red-950/30 border-red-500' : 'bg-black/40 border-white/10'}`}>
            <div className="flex justify-between items-center">
                <div className="flex items-center gap-4">
                    <div className={`p-3 rounded-xl ${config.maintenance_mode ? 'bg-red-500 text-white' : 'bg-gray-800 text-gray-500'}`}>
                        <Lock size={24} />
                    </div>
                    <div>
                        <h3 className={`font-black uppercase text-lg ${config.maintenance_mode ? 'text-red-500' : 'text-white'}`}>
                            Maintenance Mode
                        </h3>
                        <p className="text-xs text-gray-400">Lock user access immediately.</p>
                    </div>
                </div>
                <ToggleSwitch isOn={config.maintenance_mode} onClick={() => handleToggle('maintenance_mode')} danger={true} />
            </div>
        </div>

        {/* FINANCIAL */}
        <div>
            <h3 className="text-xs font-black text-gray-500 uppercase tracking-widest mb-3 pl-1">Financial Gateways</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <SystemModule title="Deposits" desc="Allow new fund requests" icon={Wallet} isOn={config.is_deposit_enabled} toggleKey="is_deposit_enabled" color="text-green-400" />
                <SystemModule title="Withdrawals" desc="Allow cashout requests" icon={ArrowUpRight} isOn={config.is_withdraw_enabled} toggleKey="is_withdraw_enabled" color="text-red-400" />
            </div>
        </div>

        {/* MODULES */}
        <div>
            <h3 className="text-xs font-black text-gray-500 uppercase tracking-widest mb-3 pl-1">Earning Modules</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <SystemModule title="Task Center" desc="Jobs & CPC campaigns" icon={CheckSquare} isOn={config.is_tasks_enabled} toggleKey="is_tasks_enabled" color="text-yellow-400" />
                <SystemModule title="Game Hub" desc="All arcade games" icon={Gamepad2} isOn={config.is_games_enabled} toggleKey="is_games_enabled" color="text-purple-400" />
                <SystemModule title="Video Ads" desc="Watch & Earn" icon={Video} isOn={config.is_video_enabled} toggleKey="is_video_enabled" color="text-red-500" />
                <SystemModule title="Investments" desc="ROI Plans" icon={Activity} isOn={config.is_invest_enabled} toggleKey="is_invest_enabled" color="text-blue-400" />
                <SystemModule title="Referrals" desc="New user signups" icon={Users} isOn={config.is_invite_enabled} toggleKey="is_invite_enabled" color="text-pink-400" />
            </div>
        </div>

        {/* GAMES INDIVIDUAL */}
        {config.is_games_enabled && gameConfigs.length > 0 && (
            <div>
                <h3 className="text-xs font-black text-gray-500 uppercase tracking-widest mb-3 pl-1">Sub-Games</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {gameConfigs.map(g => (
                        <div key={g.id} className="p-3 rounded-xl bg-black/40 border border-white/5 flex justify-between items-center">
                            <span className="text-sm font-bold text-white">{g.name}</span>
                            <ToggleSwitch isOn={g.is_active} onClick={() => handleGameToggle(g.id, g.is_active)} />
                        </div>
                    ))}
                </div>
            </div>
        )}

        {/* SAVE BAR */}
        <AnimatePresence>
            {hasChanges && (
                <motion.div 
                    initial={{ y: 100 }} animate={{ y: 0 }} exit={{ y: 100 }}
                    className="fixed bottom-20 md:bottom-6 left-0 right-0 flex justify-center z-50 pointer-events-none px-4"
                >
                    <div className="pointer-events-auto bg-[#1a1a1a] border border-white/10 shadow-2xl p-2 rounded-2xl flex items-center gap-3 pl-5 pr-2">
                        <span className="text-xs font-bold text-white">Unsaved Changes</span>
                        <button 
                            onClick={handleSave}
                            disabled={saving}
                            className="bg-neon-green text-black px-6 py-2.5 rounded-xl text-xs font-black flex items-center gap-2 hover:bg-emerald-400"
                        >
                            {saving ? <Loader size={14}/> : <Save size={14} />} SAVE
                        </button>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>

    </div>
  );
};

export default OffSystems;
