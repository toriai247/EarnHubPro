
import React, { useEffect, useState } from 'react';
import GlassCard from '../../components/GlassCard';
import { supabase } from '../../integrations/supabase/client';
import { SystemConfig, GameConfig } from '../../types';
import { 
  Power, Save, AlertTriangle, Lock, MonitorOff, 
  Gamepad2, Zap, Users, Video, Wallet, ArrowUpRight, ShieldAlert, Activity, Eye, RefreshCw, X, CheckCircle2, Server, RotateCcw, AlertOctagon,
  Info, Megaphone, Dice1, Play
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
  const [isTempConfig, setIsTempConfig] = useState(false);

  useEffect(() => {
    fetchConfig();
    fetchGameConfigs();
    
    // Listen for realtime changes from other admins
    const sub = supabase
        .channel('system_config_live')
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'system_config' }, (payload: any) => {
            const newConfig = payload.new as SystemConfig;
            setConfig(newConfig);
            setOriginalConfig(newConfig);
            setIsTempConfig(false);
        })
        .subscribe();

    return () => { sub.unsubscribe(); };
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
    const { data, error } = await supabase.from('system_config').select('*').limit(1).maybeSingle();
    
    if (data) {
        setConfig(data as SystemConfig);
        setOriginalConfig(data as SystemConfig);
        setIsTempConfig(false);
    } else {
        // If no config exists, create a default one in local state so UI works
        const defaultConfig: SystemConfig = {
            id: 'temp',
            is_tasks_enabled: true,
            is_games_enabled: true,
            is_invest_enabled: true,
            is_invite_enabled: true,
            is_video_enabled: true,
            is_deposit_enabled: true,
            is_withdraw_enabled: true,
            maintenance_mode: false,
            global_alert: null
        };
        setConfig(defaultConfig);
        setOriginalConfig(defaultConfig);
        setIsTempConfig(true);
        if(!error) toast.warning("System Config not found in Database. Running in Temp Mode.");
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
      const gameName = gameConfigs.find(g => g.id === gameId)?.name || 'Unknown Game';
      
      // Update locally
      setGameConfigs(prev => prev.map(g => g.id === gameId ? { ...g, is_active: newStatus } : g));
      
      // Update DB - Using upsert() to ensure row exists and handle policies better
      const { error } = await supabase.from('game_configs').upsert({ 
          id: gameId, 
          name: gameName,
          is_active: newStatus 
      });
      
      if (error) {
          console.error("Game Status Update Error:", error);
          toast.error(`Update failed: ${error.message}`);
          fetchGameConfigs(); // Revert local state
      } else {
          toast.success(`Game ${newStatus ? 'Activated' : 'Deactivated'}`);
      }
  };

  const handleBulkAction = async (action: 'restore' | 'shutdown') => {
      if (!config) return;
      
      const isShutdown = action === 'shutdown';
      const confirmMsg = isShutdown 
        ? "⚠️ EMERGENCY SHUTDOWN: This will disable Game, Tasks, Video, Invest & Invites immediately. Are you sure?" 
        : "✅ SYSTEM RESTORE: This will reactivate all earning modules. Confirm?";
      
      const proceed = await confirm(confirmMsg, isShutdown ? "Emergency Stop" : "Restore Systems");
      if (!proceed) return;

      const newState = { ...config };
      const targetState = action === 'restore';
      
      newState.is_tasks_enabled = targetState;
      newState.is_games_enabled = targetState;
      newState.is_invest_enabled = targetState;
      newState.is_invite_enabled = targetState;
      newState.is_video_enabled = targetState;
      
      setConfig(newState);
      toast.info(action === 'restore' ? "Systems staged for Restore. Click Save to apply." : "Systems staged for Shutdown. Click Save to apply.");
  };

  const handleReset = () => {
      setConfig(originalConfig);
      setHasChanges(false);
      toast.info("Changes discarded.");
  };

  const handleSave = async () => {
      if (!config) return;
      
      // Safety check for maintenance mode enabling
      if (config.maintenance_mode && !originalConfig?.maintenance_mode) {
          const proceed = await confirm("Enable Maintenance Mode? This will lock out ALL users immediately.", "CRITICAL ACTION");
          if (!proceed) return;
      }

      setSaving(true);
      
      // Check if ID exists, if not insert
      if (config.id === 'temp' || isTempConfig) {
           // Insert new config row
           const { id, ...insertData } = config; // Remove temp id
           const { error } = await supabase.from('system_config').insert(insertData);
           
           if (error) {
               toast.error("Failed to initialize config: " + error.message);
               // Add suggestion for permissions error
               if(error.message.includes("permission denied")) {
                   toast.warning("Check DatabaseUltra > Danger Zone to fix permissions.");
               }
           } else {
               toast.success("System initialized & saved!");
               fetchConfig();
           }
      } else {
          // Update existing
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
              toast.error("Failed to update: " + error.message);
          } else {
              toast.success("System configuration updated successfully.");
              setOriginalConfig(config);
              setHasChanges(false);
          }
      }
      setSaving(false);
  };

  const setAlertType = (type: 'URGENT' | 'INFO' | 'SUCCESS' | 'WARNING') => {
      if (!config) return;
      const current = config.global_alert || '';
      // Remove existing tags
      let clean = current.replace(/\[(URGENT|INFO|SUCCESS|WARNING)\]/g, '').trim();
      if (!clean) clean = "System Announcement";
      
      let newAlert = clean;
      if (type !== 'WARNING') {
          newAlert = `[${type}] ${clean}`;
      }
      
      setConfig({ ...config, global_alert: newAlert });
  };

  const ToggleSwitch = ({ isOn, onClick, danger = false }: { isOn: boolean, onClick: () => void, danger?: boolean }) => (
      <button 
          onClick={onClick}
          className={`relative w-12 h-7 rounded-full transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-black ${
              isOn 
                ? (danger ? 'bg-red-500 focus:ring-red-500' : 'bg-neon-green focus:ring-neon-green') 
                : 'bg-gray-700 focus:ring-gray-500'
          }`}
      >
          <motion.div 
              layout
              transition={{ type: "spring", stiffness: 700, damping: 30 }}
              className="absolute top-1 left-1 w-5 h-5 bg-white rounded-full shadow-md"
              animate={{ x: isOn ? 20 : 0 }}
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
      <div className={`relative overflow-hidden rounded-2xl p-4 transition-all duration-300 border group ${
          isOn 
          ? (isCritical ? 'bg-blue-500/10 border-blue-500/30' : 'bg-green-500/5 border-green-500/20') 
          : 'bg-black/40 border-white/5 opacity-80'
      }`}>
          <div className="flex justify-between items-start mb-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${
                  isOn 
                  ? (isCritical ? 'bg-blue-500/20 text-blue-400' : 'bg-green-500/20 text-green-400') 
                  : 'bg-white/10 text-gray-500 group-hover:text-white'
              }`}>
                  <Icon size={20} />
              </div>
              <ToggleSwitch isOn={isOn} onClick={() => handleToggle(toggleKey)} />
          </div>
          
          <h4 className={`font-bold text-sm ${isOn ? 'text-white' : 'text-gray-400'}`}>{title}</h4>
          <p className="text-[10px] text-gray-500 mt-1 leading-snug min-h-[2.5em]">{desc}</p>
          
          {/* Status Dot */}
          <div className={`absolute top-4 right-16 flex items-center gap-1.5 px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider ${isOn ? (isCritical ? 'text-blue-400 bg-blue-500/10' : 'text-green-400 bg-green-500/10') : 'text-red-400 bg-red-500/10'}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${isOn ? (isCritical ? 'bg-blue-400 shadow-[0_0_5px_#60a5fa]' : 'bg-green-400 shadow-[0_0_5px_#4ade80]') : 'bg-red-400'}`}></span>
              {isOn ? 'Online' : 'Offline'}
          </div>
      </div>
  );

  // Updated Alert Preview to match improved banner
  const renderAlertPreview = () => {
      const msg = config?.global_alert;
      if (!msg) return (
          <div className="absolute inset-0 flex items-center justify-center text-[10px] text-gray-600 italic">
              No alert active
          </div>
      );

      let style = { 
          bg: 'bg-yellow-600/20', border: 'border-yellow-500/30', text: 'text-yellow-200', icon: AlertTriangle, iconColor: 'text-yellow-500' 
      };
      let text = msg;
      let Icon = AlertTriangle;

      if (msg.startsWith('[URGENT]')) {
          style = { bg: 'bg-red-600/20', border: 'border-red-500/30', text: 'text-red-200', icon: ShieldAlert, iconColor: 'text-red-500' };
          text = msg.replace('[URGENT]', '').trim();
          Icon = ShieldAlert;
      } else if (msg.startsWith('[INFO]')) {
          style = { bg: 'bg-blue-600/20', border: 'border-blue-500/30', text: 'text-blue-200', icon: Info, iconColor: 'text-blue-500' };
          text = msg.replace('[INFO]', '').trim();
          Icon = Info;
      } else if (msg.startsWith('[SUCCESS]')) {
          style = { bg: 'bg-green-600/20', border: 'border-green-500/30', text: 'text-green-200', icon: CheckCircle2, iconColor: 'text-green-500' };
          text = msg.replace('[SUCCESS]', '').trim();
          Icon = CheckCircle2;
      }

      return (
          <div className={`relative z-50 backdrop-blur-xl border-b ${style.bg} ${style.border} shadow-lg px-3 py-2 flex items-center gap-2`}>
              <div className={`p-1 rounded-lg bg-black/20 ${style.iconColor} shrink-0`}>
                  <Icon size={12} className="animate-pulse" />
              </div>
              <div className="overflow-hidden relative h-4 w-full">
                  <div className={`text-[10px] font-bold font-mono uppercase tracking-wide ${style.text} whitespace-nowrap`}>
                      {text}
                  </div>
              </div>
          </div>
      );
  };

  if (loading) return <div className="p-10"><Loader /></div>;
  if (!config) return <div className="p-10 text-center text-red-500">Config not found. Please refresh.</div>;

  const activeSystemsCount = Object.values(config).filter(v => v === true).length;

  return (
    <div className="space-y-8 animate-fade-in pb-32 relative min-h-screen">
        
        {/* HEADER & HEALTH */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
            <div>
                <h2 className="text-3xl font-display font-black text-white flex items-center gap-3">
                    <MonitorOff className={config.maintenance_mode ? "text-red-500 animate-pulse" : "text-white"} /> 
                    SYSTEM CONTROL
                </h2>
                <p className="text-gray-400 text-sm mt-1">Global feature management console.</p>
            </div>
            
            <div className="flex gap-4 w-full md:w-auto">
                <GlassCard className="py-2 px-4 flex items-center gap-3 bg-black/40 border-white/10 flex-1 md:flex-none">
                    <div className="relative">
                        <Server size={20} className={config.maintenance_mode ? "text-red-500" : "text-neon-green"} />
                        <span className={`absolute -top-1 -right-1 w-2 h-2 rounded-full ${config.maintenance_mode ? "bg-red-500 animate-ping" : "bg-neon-green"}`}></span>
                    </div>
                    <div>
                        <p className="text-[10px] text-gray-500 font-bold uppercase">Status</p>
                        <p className={`text-xs font-bold ${config.maintenance_mode ? "text-red-500" : "text-neon-green"}`}>
                            {config.maintenance_mode ? 'MAINTENANCE' : 'OPERATIONAL'}
                        </p>
                    </div>
                </GlassCard>
                
                <GlassCard className="py-2 px-4 flex items-center gap-3 bg-black/40 border-white/10 flex-1 md:flex-none">
                    <Activity size={20} className="text-blue-400" />
                    <div>
                        <p className="text-[10px] text-gray-500 font-bold uppercase">Modules</p>
                        <p className="text-xs font-bold text-white">{activeSystemsCount} Active</p>
                    </div>
                </GlassCard>
            </div>
        </div>

        {/* TEMP CONFIG WARNING */}
        {isTempConfig && (
            <motion.div 
                initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}
                className="bg-orange-500/10 border border-orange-500/50 rounded-xl p-4 flex items-center justify-between gap-4"
            >
                <div className="flex items-center gap-3 text-orange-400">
                    <AlertOctagon size={24} />
                    <div>
                        <h4 className="font-bold text-sm uppercase">Configuration Not Persistent</h4>
                        <p className="text-xs text-gray-300">The database table is empty. Click SAVE below to initialize the system config permanently.</p>
                    </div>
                </div>
                <button 
                    onClick={handleSave} 
                    disabled={saving}
                    className="px-4 py-2 bg-orange-600 text-white font-bold text-xs rounded-lg hover:bg-orange-500 transition shadow-lg"
                >
                    {saving ? <Loader size={14}/> : 'INITIALIZE NOW'}
                </button>
            </motion.div>
        )}

        {/* DANGER ZONE - MAINTENANCE */}
        <motion.div 
            layout
            className={`relative overflow-hidden rounded-2xl border-2 transition-all duration-500 ${config.maintenance_mode ? 'border-red-500 bg-red-950/20' : 'border-white/10 bg-black/40'}`}
        >
            {/* Hazard Stripes Background */}
            <div className={`absolute inset-0 opacity-5 pointer-events-none bg-[repeating-linear-gradient(45deg,#ef4444,#ef4444_10px,transparent_10px,transparent_20px)]`}></div>

            <div className="p-6 relative z-10 flex flex-col md:flex-row justify-between items-center gap-6">
                <div className="flex items-center gap-6">
                    <div className={`w-16 h-16 rounded-2xl flex items-center justify-center border-2 ${config.maintenance_mode ? 'bg-red-500 text-white border-white shadow-[0_0_30px_#ef4444]' : 'bg-gray-800 text-gray-500 border-gray-600'}`}>
                        <Lock size={32} />
                    </div>
                    <div>
                        <h3 className={`text-xl font-black uppercase ${config.maintenance_mode ? 'text-red-500' : 'text-white'}`}>
                            Maintenance Mode
                        </h3>
                        <p className="text-gray-400 text-sm max-w-md mt-1 leading-relaxed">
                            When active, user access is completely blocked. Users will see a "System Offline" screen. <span className="text-white font-bold">Only Administrators can login.</span>
                        </p>
                    </div>
                </div>
                
                <div className="flex flex-col items-center gap-3 bg-black/40 p-4 rounded-xl border border-white/5 w-full md:w-auto">
                    <span className={`text-xs font-black uppercase tracking-wider ${config.maintenance_mode ? 'text-red-500 animate-pulse' : 'text-gray-500'}`}>
                        {config.maintenance_mode ? 'SYSTEM LOCKED' : 'SYSTEM ONLINE'}
                    </span>
                    <ToggleSwitch isOn={config.maintenance_mode} onClick={() => handleToggle('maintenance_mode')} danger={true} />
                </div>
            </div>
        </motion.div>

        {/* FINANCIAL SYSTEMS */}
        <div>
            <div className="flex items-center gap-2 mb-4 px-1">
                <ShieldAlert className="text-blue-500" size={18} />
                <h3 className="text-sm font-black text-gray-300 uppercase tracking-widest">Financial Core</h3>
                <div className="h-px bg-white/10 flex-1 ml-2"></div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <SystemModule 
                    title="Deposit System" 
                    desc="Accept new deposit requests from users." 
                    icon={Wallet} 
                    isOn={config.is_deposit_enabled} 
                    toggleKey="is_deposit_enabled"
                    isCritical
                />
                <SystemModule 
                    title="Withdrawal System" 
                    desc="Allow users to request fund withdrawals." 
                    icon={ArrowUpRight} 
                    isOn={config.is_withdraw_enabled} 
                    toggleKey="is_withdraw_enabled"
                    isCritical
                />
            </div>
        </div>

        {/* EARNING MODULES */}
        <div>
            <div className="flex flex-wrap items-center justify-between gap-4 mb-4 px-1 mt-6">
                <div className="flex items-center gap-2">
                    <Zap className="text-neon-green" size={18} />
                    <h3 className="text-sm font-black text-gray-300 uppercase tracking-widest">Earning Modules</h3>
                </div>
                
                <div className="flex gap-2">
                    <button onClick={() => handleBulkAction('restore')} className="text-[10px] font-bold text-green-400 hover:text-white flex items-center gap-1 bg-green-500/10 px-3 py-1.5 rounded border border-green-500/20 transition hover:bg-green-500/20">
                        <RotateCcw size={12} /> RESTORE
                    </button>
                    <button onClick={() => handleBulkAction('shutdown')} className="text-[10px] font-bold text-red-400 hover:text-white flex items-center gap-1 bg-red-500/10 px-3 py-1.5 rounded border border-red-500/20 transition hover:bg-red-500/20">
                        <Power size={12} /> STOP ALL
                    </button>
                </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <SystemModule 
                    title="Game Hub (Global)" 
                    desc="Master switch for all games." 
                    icon={Gamepad2} 
                    isOn={config.is_games_enabled} 
                    toggleKey="is_games_enabled" 
                />
                <SystemModule 
                    title="Task Center" 
                    desc="Daily tasks, sponsor links & tracking." 
                    icon={CheckCircle2} 
                    isOn={config.is_tasks_enabled} 
                    toggleKey="is_tasks_enabled" 
                />
                <SystemModule 
                    title="Investments" 
                    desc="Plan purchasing and ROI distribution." 
                    icon={Activity} 
                    isOn={config.is_invest_enabled} 
                    toggleKey="is_invest_enabled" 
                />
                <SystemModule 
                    title="Referral Program" 
                    desc="New signups and commission logic." 
                    icon={Users} 
                    isOn={config.is_invite_enabled} 
                    toggleKey="is_invite_enabled" 
                />
                <SystemModule 
                    title="Video Ads" 
                    desc="Video earning & upload module." 
                    icon={Video} 
                    isOn={config.is_video_enabled} 
                    toggleKey="is_video_enabled" 
                />
            </div>
        </div>

        {/* INDIVIDUAL GAME CONTROL */}
        {config.is_games_enabled && (
            <div>
                <div className="flex items-center gap-2 mb-4 px-1 mt-6">
                    <Dice1 className="text-purple-500" size={18} />
                    <h3 className="text-sm font-black text-gray-300 uppercase tracking-widest">Individual Game Status</h3>
                    <div className="h-px bg-white/10 flex-1 ml-2"></div>
                </div>
                
                {gameConfigs.length === 0 && (
                    <div className="bg-white/5 border border-white/5 rounded-xl p-4 text-center text-gray-500 text-sm">
                        No individual game configs found. Please run the initialization SQL in Database Ultra.
                    </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {gameConfigs.map((game) => (
                        <div key={game.id} className={`p-4 rounded-xl border flex items-center justify-between transition-all ${game.is_active ? 'bg-purple-900/10 border-purple-500/30' : 'bg-black/40 border-white/5 opacity-80 grayscale'}`}>
                            <div className="flex items-center gap-3">
                                <div className={`p-2 rounded-lg ${game.is_active ? 'bg-purple-500/20 text-purple-400' : 'bg-white/10 text-gray-500'}`}>
                                    {game.id === 'spin' ? <RefreshCw size={18}/> : 
                                     game.id === 'crash' ? <Play size={18}/> : 
                                     game.id === 'ludo' ? <Users size={18}/> : 
                                     <Dice1 size={18}/>}
                                </div>
                                <div>
                                    <h4 className="font-bold text-white text-sm">{game.name}</h4>
                                    <p className={`text-[10px] font-bold uppercase ${game.is_active ? 'text-green-400' : 'text-red-400'}`}>
                                        {game.is_active ? 'Playable' : 'Disabled'}
                                    </p>
                                </div>
                            </div>
                            <ToggleSwitch isOn={game.is_active} onClick={() => handleGameToggle(game.id, game.is_active)} />
                        </div>
                    ))}
                </div>
            </div>
        )}

        {/* GLOBAL ANNOUNCEMENT */}
        <div className="bg-black/40 border border-white/10 rounded-2xl p-6 relative overflow-hidden mt-6">
            <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none"><AlertTriangle size={100} /></div>
            
            <div className="flex flex-col md:flex-row gap-8 relative z-10">
                <div className="flex-1">
                    <h3 className="text-lg font-bold text-white flex items-center gap-2 mb-2">
                        <Megaphone className="text-yellow-400" size={20} /> Global Announcement
                    </h3>
                    <p className="text-sm text-gray-400 mb-4">
                        This message appears at the top of every user's dashboard. Use it for urgent notices.
                    </p>
                    
                    {/* Visual Type Selectors */}
                    <div className="grid grid-cols-4 gap-2 mb-4">
                        <button onClick={() => setAlertType('URGENT')} className="flex flex-col items-center p-2 rounded bg-red-500/10 border border-red-500/30 text-red-400 hover:bg-red-500/20 transition">
                            <ShieldAlert size={16} /> <span className="text-[9px] font-bold uppercase mt-1">Urgent</span>
                        </button>
                        <button onClick={() => setAlertType('INFO')} className="flex flex-col items-center p-2 rounded bg-blue-500/10 border border-blue-500/30 text-blue-400 hover:bg-blue-500/20 transition">
                            <Info size={16} /> <span className="text-[9px] font-bold uppercase mt-1">Info</span>
                        </button>
                        <button onClick={() => setAlertType('SUCCESS')} className="flex flex-col items-center p-2 rounded bg-green-500/10 border border-green-500/30 text-green-400 hover:bg-green-500/20 transition">
                            <CheckCircle2 size={16} /> <span className="text-[9px] font-bold uppercase mt-1">Success</span>
                        </button>
                        <button onClick={() => setAlertType('WARNING')} className="flex flex-col items-center p-2 rounded bg-yellow-500/10 border border-yellow-500/30 text-yellow-400 hover:bg-yellow-500/20 transition">
                            <AlertTriangle size={16} /> <span className="text-[9px] font-bold uppercase mt-1">Plain</span>
                        </button>
                    </div>

                    <label className="text-xs text-gray-500 font-bold uppercase mb-2 block">Message Content</label>
                    <textarea 
                        value={config.global_alert || ''}
                        onChange={(e) => setConfig({...config, global_alert: e.target.value})}
                        className="w-full bg-black/40 border border-white/10 rounded-xl p-4 text-white text-sm focus:border-neon-green outline-none h-24 resize-none shadow-inner"
                        placeholder="e.g. 'System maintenance scheduled for 12:00 PM UTC.' (Leave empty to disable)"
                    />
                </div>
                
                <div className="w-full md:w-1/3">
                    <label className="text-xs text-gray-500 font-bold uppercase mb-2 block flex items-center gap-1">
                        <Eye size={12}/> Live Preview
                    </label>
                    {/* PHONE MOCKUP */}
                    <div className="bg-black border-4 border-gray-800 rounded-3xl p-2 h-48 relative overflow-hidden flex flex-col shadow-2xl">
                        <div className="h-1 w-12 bg-gray-800 rounded-full mx-auto mb-2"></div>
                        <div className="bg-gray-900 flex-1 rounded-xl overflow-hidden relative border border-white/5">
                            {/* The Simulated Alert */}
                            {renderAlertPreview()}
                            
                            {/* Dummy App Content */}
                            <div className="p-3 opacity-30 blur-[1px]">
                                <div className="flex justify-between items-center mb-3">
                                    <div className="w-6 h-6 bg-gray-700 rounded"></div>
                                    <div className="w-16 h-4 bg-gray-700 rounded"></div>
                                </div>
                                <div className="w-full h-16 bg-blue-900 rounded-lg mb-2"></div>
                                <div className="flex gap-2">
                                    <div className="w-8 h-8 bg-gray-700 rounded"></div>
                                    <div className="w-8 h-8 bg-gray-700 rounded"></div>
                                    <div className="w-8 h-8 bg-gray-700 rounded"></div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        {/* FLOATING ACTION DOCK - ONLY SHOWS WHEN CHANGES EXIST */}
        <AnimatePresence>
            {(hasChanges || isTempConfig) && (
                <motion.div 
                    initial={{ y: 100, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: 100, opacity: 0 }}
                    className="fixed bottom-6 left-0 right-0 flex justify-center z-50 pointer-events-none px-4"
                >
                    <GlassCard className="pointer-events-auto bg-dark-900/90 backdrop-blur-xl border-neon-green/30 shadow-[0_0_50px_rgba(0,0,0,0.5)] p-2 rounded-2xl flex items-center gap-3 pl-4">
                        <div className="flex flex-col">
                            <span className="text-xs font-bold text-white">Unsaved Changes</span>
                            <span className="text-[10px] text-gray-400">Configuration modified</span>
                        </div>
                        <div className="h-8 w-px bg-white/10 mx-1"></div>
                        <button 
                            onClick={handleReset}
                            className="px-4 py-2 hover:bg-white/10 rounded-xl text-xs font-bold text-gray-300 transition"
                        >
                            Discard
                        </button>
                        <button 
                            onClick={handleSave}
                            disabled={saving}
                            className="px-6 py-2.5 bg-neon-green text-black rounded-xl text-xs font-black flex items-center gap-2 hover:bg-emerald-400 transition shadow-lg shadow-neon-green/20"
                        >
                            {saving ? <Loader size={14} className="text-black"/> : <Save size={14} />} SAVE UPDATES
                        </button>
                    </GlassCard>
                </motion.div>
            )}
        </AnimatePresence>

    </div>
  );
};

export default OffSystems;
