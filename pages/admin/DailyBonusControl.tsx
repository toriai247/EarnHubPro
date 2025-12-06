
import React, { useEffect, useState } from 'react';
import GlassCard from '../../components/GlassCard';
import { supabase } from '../../integrations/supabase/client';
import { DailyBonusConfig } from '../../types';
import { Calendar, Save, Loader2, CheckCircle2, RotateCcw, Trash2, AlertTriangle } from 'lucide-react';
import { motion } from 'framer-motion';
import { useUI } from '../../context/UIContext';
import { resetAllDailyStreaks } from '../../lib/actions';

const DailyBonusControl: React.FC = () => {
  const { toast, confirm } = useUI();
  const [configs, setConfigs] = useState<DailyBonusConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [resetting, setResetting] = useState(false);

  useEffect(() => {
    fetchConfig();
  }, []);

  const fetchConfig = async () => {
    setLoading(true);
    const { data } = await supabase.from('daily_bonus_config').select('*').order('day');
    
    if (data && data.length > 0) {
        setConfigs(data as DailyBonusConfig[]);
    } else {
        // Default init state if table empty
        const defaults = Array.from({ length: 7 }, (_, i) => ({
            day: i + 1,
            reward_amount: [0.10, 0.20, 0.30, 0.40, 0.50, 0.75, 1.00][i],
            is_active: true
        }));
        setConfigs(defaults as DailyBonusConfig[]);
    }
    setLoading(false);
  };

  const handleUpdate = (day: number, val: number) => {
      setConfigs(prev => prev.map(c => c.day === day ? { ...c, reward_amount: val } : c));
  };

  const handleSave = async () => {
      setSaving(true);
      try {
          // Upsert all configs
          const { error } = await supabase.from('daily_bonus_config').upsert(
              configs.map(c => ({
                  day: c.day,
                  reward_amount: c.reward_amount,
                  is_active: true
              })), { onConflict: 'day' }
          );

          if (error) throw error;
          toast.success("Bonus configuration saved!");
      } catch (e: any) {
          toast.error("Save failed: " + e.message);
      } finally {
          setSaving(false);
      }
  };

  const handleResetStreaks = async () => {
      if (!await confirm("Reset ALL user streaks to Day 1? This cannot be undone.", "DANGER ZONE")) return;
      
      setResetting(true);
      try {
          await resetAllDailyStreaks();
          toast.success("All user streaks have been reset.");
      } catch (e: any) {
          toast.error(e.message);
      } finally {
          setResetting(false);
      }
  };

  if (loading) return <div className="p-10 text-center"><Loader2 className="animate-spin mx-auto text-white"/></div>;

  return (
    <div className="space-y-6 animate-fade-in pb-20">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
                <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                    <Calendar className="text-purple-500" /> Daily Bonus Config
                </h2>
                <p className="text-gray-400 text-sm">Configure rewards for the 7-day login streak.</p>
            </div>
            
            <div className="flex gap-3">
                <button 
                    onClick={handleResetStreaks} 
                    disabled={resetting}
                    className="bg-red-500/10 text-red-400 border border-red-500/20 px-4 py-2.5 rounded-xl font-bold flex items-center gap-2 hover:bg-red-500/20 transition disabled:opacity-50 text-xs uppercase"
                >
                    {resetting ? <Loader2 className="animate-spin" size={14}/> : <RotateCcw size={14} />} Reset All Streaks
                </button>
                <button 
                    onClick={handleSave} 
                    disabled={saving}
                    className="bg-purple-600 text-white px-6 py-2.5 rounded-xl font-bold flex items-center gap-2 hover:bg-purple-500 transition shadow-lg shadow-purple-900/50 disabled:opacity-50 text-xs uppercase"
                >
                    {saving ? <Loader2 className="animate-spin" size={14}/> : <Save size={14} />} Save Config
                </button>
            </div>
        </div>

        {/* REWARD CARDS */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
            {configs.map((config) => (
                <motion.div layout key={config.day}>
                    <GlassCard className={`relative overflow-hidden border transition-colors flex flex-col items-center justify-center p-4 ${config.day === 7 ? 'border-yellow-500/50 bg-yellow-900/10' : 'border-white/10 hover:border-purple-500/30'}`}>
                        {config.day === 7 && (
                            <div className="absolute top-0 right-0 bg-yellow-500 text-black text-[8px] font-black px-1.5 py-0.5 rounded-bl uppercase">BIG</div>
                        )}
                        
                        <div className="mb-2 w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-xs font-bold text-gray-400 border border-white/5">
                            {config.day}
                        </div>

                        <div className="relative w-full">
                            <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-500 font-bold text-xs">$</span>
                            <input 
                                type="number" 
                                step="0.01"
                                value={config.reward_amount}
                                onChange={(e) => handleUpdate(config.day, parseFloat(e.target.value))}
                                className="w-full bg-black/30 border border-white/10 rounded-lg py-2 pl-5 pr-2 text-white font-mono text-sm focus:border-purple-500 outline-none transition-colors text-center font-bold"
                            />
                        </div>
                    </GlassCard>
                </motion.div>
            ))}
        </div>

        <div className="bg-blue-500/10 border border-blue-500/20 p-4 rounded-xl flex items-start gap-3">
            <CheckCircle2 className="text-blue-400 shrink-0" />
            <div>
                <h4 className="text-blue-300 font-bold text-sm">System Logic</h4>
                <p className="text-xs text-gray-400 mt-1 leading-relaxed">
                    Users must login consecutively. If a day is missed (48 hours since last claim), the streak automatically resets to Day 1.
                    Rewards are credited to the <strong>Bonus Wallet</strong>.
                </p>
            </div>
        </div>
    </div>
  );
};

export default DailyBonusControl;
