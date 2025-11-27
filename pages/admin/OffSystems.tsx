
import React, { useEffect, useState } from 'react';
import GlassCard from '../../components/GlassCard';
import { supabase } from '../../integrations/supabase/client';
import { SystemConfig } from '../../types';
import { 
  Power, Save, AlertTriangle, CheckCircle, Lock, MonitorOff, 
  Gamepad2, Zap, Users, Video, Wallet, ArrowUpRight, ShieldAlert, Activity, Eye, RefreshCw 
} from 'lucide-react';
import { useUI } from '../../context/UIContext';
import Loader from '../../components/Loader';
import { motion } from 'framer-motion';

const MotionDiv = motion.div as any;

const OffSystems: React.FC = () => {
  const { toast, confirm } = useUI();
  const [config, setConfig] = useState<SystemConfig | null>(null);
  const [originalConfig, setOriginalConfig] = useState<SystemConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    fetchConfig();
  }, []);

  // Track changes to enable/disable Save button
  useEffect(() => {
      if (config && originalConfig) {
          const isDifferent = JSON.stringify(config) !== JSON.stringify(originalConfig);
          setHasChanges(isDifferent);
      }
  }, [config, originalConfig]);

  const fetchConfig = async () => {
    setLoading(true);
    const { data } = await supabase.from('system_config').select('*').single();
    if (data) {
        setConfig(data as SystemConfig);
        setOriginalConfig(data as SystemConfig);
    }
    setLoading(false);
  };

  const handleToggle = (key: keyof SystemConfig) => {
      if (!config) return;
      // @ts-ignore
      setConfig({ ...config, [key]: !config[key] });
  };

  const handleBulkAction = async (action: 'restore' | 'shutdown') => {
      if (!config) return;
      
      const isShutdown = action === 'shutdown';
      const confirmMsg = isShutdown 
        ? "Are you sure you want to SHUT DOWN all features? Users will not be able to earn, deposit, or withdraw." 
        : "Are you sure you want to RESTORE all systems to online?";
      
      const proceed = await confirm(confirmMsg, isShutdown ? "EMERGENCY SHUTDOWN" : "System Restore");
      if (!proceed) return;

      const newState = { ...config };
      const targetState = action === 'restore';
      
      newState.is_tasks_enabled = targetState;
      newState.is_games_enabled = targetState;
      newState.is_invest_enabled = targetState;
      newState.is_invite_enabled = targetState;
      newState.is_video_enabled = targetState;
      newState.is_deposit_enabled = targetState;
      newState.is_withdraw_enabled = targetState;
      
      setConfig(newState);
      toast.info(action === 'restore' ? "All systems staged for Restore. Click Save." : "All systems staged for Shutdown. Click Save.");
  };

  const handleSave = async () => {
      if (!config) return;
      
      // Safety check for maintenance mode enabling
      if (config.maintenance_mode && !originalConfig?.maintenance_mode) {
          const proceed = await confirm("Enable Maintenance Mode? This will lock out ALL users immediately.", "CRITICAL ACTION");
          if (!proceed) return;
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

      if (error) {
          toast.error("Failed to update system: " + error.message);
      } else {
          toast.success("System configuration applied successfully.");
          setOriginalConfig(config);
          setHasChanges(false);
          // Force refresh system context for admin immediately if possible, 
          // though real-time sub in SystemContext will handle it.
      }
      setSaving(false);
  };

  const ToggleSwitch = ({ isOn, onClick, disabled = false, danger = false }: { isOn: boolean, onClick: () => void, disabled?: boolean, danger?: boolean }) => (
      <button 
          onClick={onClick}
          disabled={disabled}
          className={`relative w-14 h-8 rounded-full p-1 transition-all duration-300 ${
              isOn 
                ? (danger ? 'bg-red-500 shadow-[0_0_10px_#ef4444]' : 'bg-neon-green shadow-[0_0_10px_#10b981]') 
                : 'bg-gray-800 border border-gray-600'
          }`}
      >
          <motion.div 
              layout
              transition={{ type: "spring", stiffness: 500, damping: 30 }}
              className={`w-6 h-6 rounded-full shadow-md ${isOn ? 'bg-white' : 'bg-gray-500'}`}
              style={{ x: isOn ? 24 : 0 }}
          />
      </button>
  );

  const SystemModule = ({ 
      title, 
      desc, 
      icon: Icon, 
      isOn, 
      toggleKey,
      isCritical = false 
  }: { title: string, desc: string, icon: any, isOn: boolean, toggleKey: keyof SystemConfig, isCritical?: boolean }) => (
      <GlassCard className={`relative overflow-hidden transition-all duration-300 border-2 ${isOn ? 'border-green-500/30 bg-green-500/5' : 'border-red-500/10 bg-red-500/5 opacity-80'}`}>
          {/* Status Light */}
          <div className={`absolute top-3 right-3 w-2 h-2 rounded-full ${isOn ? 'bg-neon-green animate-pulse shadow-[0_0_5px_#10b981]' : 'bg-red-500'}`}></div>
          
          <div className="flex justify-between items-center relative z-10">
              <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center border ${
                      isOn 
                      ? (isCritical ? 'bg-blue-500/20 text-blue-400 border-blue-500/30' : 'bg-green-500/20 text-green-400 border-green-500/30') 
                      : 'bg-gray-800 text-gray-500 border-gray-700'
                  }`}>
                      <Icon size={24} />
                  </div>
                  <div>
                      <h4 className={`font-black text-sm uppercase tracking-wide ${isOn ? 'text-white' : 'text-gray-500'}`}>{title}</h4>
                      <p className="text-[10px] text-gray-500 mt-0.5 font-bold">{desc}</p>
                  </div>
              </div>
              
              <ToggleSwitch isOn={isOn} onClick={() => handleToggle(toggleKey)} />
          </div>
          
          {/* Background FX */}
          {!isOn && <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/diagmonds-light.png')] opacity-10 pointer-events-none"></div>}
      </GlassCard>
  );

  if (loading) return <div className="p-10"><Loader /></div>;
  if (!config) return <div className="p-10 text-center text-red-500">Config not found</div>;

  return (
    <div className="space-y-8 animate-fade-in pb-20">
        
        {/* HEADER */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-white/10 pb-6 sticky top-0 bg-dark-950/95 backdrop-blur-md z-20 pt-2">
            <div>
                <h2 className="text-3xl font-display font-black text-white flex items-center gap-3">
                    <MonitorOff className={config.maintenance_mode ? "text-red-500 animate-pulse" : "text-neon-green"} /> 
                    SYSTEM CONTROL
                </h2>
                <div className="flex items-center gap-2 mt-1">
                    <span className={`w-2 h-2 rounded-full ${config.maintenance_mode ? 'bg-red-500' : 'bg-neon-green'}`}></span>
                    <p className="text-gray-400 text-xs font-bold uppercase tracking-widest">
                        STATUS: {config.maintenance_mode ? 'MAINTENANCE' : 'OPERATIONAL'}
                    </p>
                </div>
            </div>
            
            <div className="flex flex-wrap gap-3">
                <button onClick={() => handleBulkAction('shutdown')} className="px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-500 text-xs font-bold rounded-lg border border-red-500/20 transition flex items-center gap-2">
                    <Power size={14} /> Emergency Shutdown
                </button>
                <button onClick={() => handleBulkAction('restore')} className="px-4 py-2 bg-green-500/10 hover:bg-green-500/20 text-green-500 text-xs font-bold rounded-lg border border-green-500/20 transition flex items-center gap-2">
                    <RefreshCw size={14} /> Restore All
                </button>
                <button 
                    onClick={handleSave}
                    disabled={!hasChanges || saving}
                    className={`px-6 py-2 rounded-xl font-bold flex items-center gap-2 transition shadow-lg ${
                        hasChanges 
                        ? 'bg-neon-green text-black hover:scale-105 shadow-neon-green/20' 
                        : 'bg-gray-700 text-gray-400 cursor-not-allowed'
                    }`}
                >
                    {saving ? <Loader size={18} className="text-black" /> : <Save size={18} />} 
                    {hasChanges ? 'SAVE CHANGES' : 'NO CHANGES'}
                </button>
            </div>
        </div>

        {/* DANGER ZONE - MAINTENANCE */}
        <motion.div 
            layout
            className={`relative overflow-hidden rounded-2xl border-2 transition-all duration-500 ${config.maintenance_mode ? 'border-red-500 bg-red-950/30' : 'border-gray-700 bg-black/40'}`}
        >
            {/* Hazard Stripes Background */}
            <div className={`absolute inset-0 opacity-10 pointer-events-none ${config.maintenance_mode ? 'bg-[repeating-linear-gradient(45deg,#ef4444,#ef4444_10px,transparent_10px,transparent_20px)]' : ''}`}></div>

            <div className="p-6 relative z-10 flex flex-col md:flex-row justify-between items-center gap-6">
                <div className="flex items-center gap-6">
                    <div className={`w-16 h-16 rounded-2xl flex items-center justify-center border-2 ${config.maintenance_mode ? 'bg-red-500 text-white border-white shadow-[0_0_20px_#ef4444]' : 'bg-gray-800 text-gray-500 border-gray-600'}`}>
                        <Lock size={32} />
                    </div>
                    <div>
                        <h3 className={`text-xl font-black uppercase ${config.maintenance_mode ? 'text-red-500' : 'text-white'}`}>
                            Maintenance Mode
                        </h3>
                        <p className="text-gray-400 text-sm max-w-md mt-1">
                            When active, the entire application is locked. Users will see a "System Offline" screen. Only Administrators can access the dashboard.
                        </p>
                    </div>
                </div>
                
                <div className="flex flex-col items-center gap-2">
                    <span className={`text-xs font-black uppercase tracking-wider ${config.maintenance_mode ? 'text-red-500 animate-pulse' : 'text-gray-500'}`}>
                        {config.maintenance_mode ? 'SYSTEM LOCKED' : 'SYSTEM ONLINE'}
                    </span>
                    <ToggleSwitch isOn={config.maintenance_mode} onClick={() => handleToggle('maintenance_mode')} danger={true} />
                </div>
            </div>
        </motion.div>

        {/* FEATURE MODULES GRID */}
        <div className="space-y-4">
            <div className="flex items-center gap-2">
                <ShieldAlert className="text-blue-500" size={18} />
                <h3 className="text-sm font-black text-gray-300 uppercase tracking-widest">Financial Systems (Critical)</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <SystemModule 
                    title="Deposits" 
                    desc="Accept new fund requests" 
                    icon={Wallet} 
                    isOn={config.is_deposit_enabled} 
                    toggleKey="is_deposit_enabled"
                    isCritical
                />
                <SystemModule 
                    title="Withdrawals" 
                    desc="Process payout requests" 
                    icon={ArrowUpRight} 
                    isOn={config.is_withdraw_enabled} 
                    toggleKey="is_withdraw_enabled"
                    isCritical
                />
            </div>
        </div>

        <div className="space-y-4 pt-4">
            <div className="flex items-center gap-2">
                <Activity className="text-neon-green" size={18} />
                <h3 className="text-sm font-black text-gray-300 uppercase tracking-widest">Earning Modules</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <SystemModule 
                    title="Game Hub" 
                    desc="Crash, Spin, Ludo, Dice" 
                    icon={Gamepad2} 
                    isOn={config.is_games_enabled} 
                    toggleKey="is_games_enabled" 
                />
                <SystemModule 
                    title="Task Center" 
                    desc="Daily tasks and rewards" 
                    icon={Zap} 
                    isOn={config.is_tasks_enabled} 
                    toggleKey="is_tasks_enabled" 
                />
                <SystemModule 
                    title="Investments" 
                    desc="Plan purchases & ROI" 
                    icon={Activity} 
                    isOn={config.is_invest_enabled} 
                    toggleKey="is_invest_enabled" 
                />
                <SystemModule 
                    title="Referral System" 
                    desc="Invites & Commissions" 
                    icon={Users} 
                    isOn={config.is_invite_enabled} 
                    toggleKey="is_invite_enabled" 
                />
                <SystemModule 
                    title="Video Watch" 
                    desc="Video earning module" 
                    icon={Video} 
                    isOn={config.is_video_enabled} 
                    toggleKey="is_video_enabled" 
                />
            </div>
        </div>

        {/* GLOBAL ANNOUNCEMENT */}
        <div className="space-y-4 pt-4 border-t border-white/10 mt-6">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <AlertTriangle className="text-yellow-400" size={20} /> Global Announcement
            </h3>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div>
                    <label className="text-xs text-gray-500 font-bold uppercase mb-2 block">Message Content</label>
                    <textarea 
                        value={config.global_alert || ''}
                        onChange={(e) => setConfig({...config, global_alert: e.target.value})}
                        className="w-full bg-black/40 border border-white/10 rounded-xl p-4 text-white text-sm focus:border-neon-green outline-none h-32 resize-none shadow-inner"
                        placeholder="Enter a message to broadcast to all users (e.g. 'System maintenance scheduled for 12:00 PM'). Leave empty to disable."
                    />
                </div>
                
                <div>
                    <label className="text-xs text-gray-500 font-bold uppercase mb-2 block flex items-center gap-1">
                        <Eye size={12}/> Live Dashboard Preview
                    </label>
                    <div className="bg-void border border-border-neo rounded-xl p-0 h-32 relative overflow-hidden flex flex-col">
                        <div className="h-8 bg-surface border-b border-border-neo flex items-center px-4 gap-2">
                            <div className="w-2 h-2 rounded-full bg-red-500"></div>
                            <div className="w-2 h-2 rounded-full bg-yellow-500"></div>
                            <div className="w-2 h-2 rounded-full bg-green-500"></div>
                        </div>
                        {/* THE ALERT BAR SIMULATION */}
                        {config.global_alert ? (
                            <div className="bg-neo-yellow/10 border-b border-neo-yellow/20 px-4 py-2 text-center w-full">
                                <p className="text-xs font-bold text-neo-yellow animate-pulse truncate">{config.global_alert}</p>
                            </div>
                        ) : (
                            <div className="flex-1 flex items-center justify-center text-gray-600 text-xs italic">
                                (No announcement active)
                            </div>
                        )}
                        <div className="flex-1 p-4">
                            <div className="w-1/3 h-2 bg-white/10 rounded mb-2"></div>
                            <div className="w-2/3 h-2 bg-white/5 rounded"></div>
                        </div>
                    </div>
                </div>
            </div>
        </div>

    </div>
  );
};

export default OffSystems;
