import React, { useEffect, useState } from 'react';
import GlassCard from '../../components/GlassCard';
import { supabase } from '../../integrations/supabase/client';
import { RefreshCw, ShieldAlert, Zap, AlertCircle, Activity, CheckCircle, Grid, Settings, Plus, Trash2, User, Search, Bot, Edit2, Save, X, Play, Users } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import BalanceDisplay from '../../components/BalanceDisplay';
import { BotProfile } from '../../types';
import ImageSelector from '../../components/ImageSelector';

const MotionDiv = motion.div as any;

const GameControl: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'crash' | 'bots'>('crash');
  
  // Crash State
  const [crashStats, setCrashStats] = useState<any>({});
  const [overrideValue, setOverrideValue] = useState<string>('');
  const [isActiveOverride, setIsActiveOverride] = useState(false);
  
  // Bot State
  const [bots, setBots] = useState<BotProfile[]>([]);
  const [isEditingBot, setIsEditingBot] = useState(false);
  const [botForm, setBotForm] = useState({ id: '', name: '', avatar: '', is_active: true });

  useEffect(() => {
      if (activeTab === 'bots') {
          fetchBots();
      } else {
          fetchCrashStats();
      }
  }, [activeTab]);

  // --- CRASH LOGIC ---
  const fetchCrashStats = async () => {
      const { data } = await supabase.from('game_history').select('*').eq('game_id', 'crash').order('created_at', {ascending: false}).limit(100);
      if (data && data.length > 0) {
          const bets = data.length;
          const wins = data.filter((d: any) => d.profit > 0).length;
          const totalBet = data.reduce((sum: number, d: any) => sum + d.bet, 0);
          const totalPay = data.reduce((sum: number, d: any) => sum + d.payout, 0);
          const profit = totalBet - totalPay;

          setCrashStats({
              profit: profit,
              winRate: bets > 0 ? (wins / bets) * 100 : 0,
          });
      }
  };

  const handleForceResult = (val: string) => {
      setOverrideValue(val);
      setIsActiveOverride(true);
      setTimeout(() => setIsActiveOverride(false), 3000);
  };

  // --- BOT LOGIC ---
  const fetchBots = async () => {
      const { data } = await supabase.from('bot_profiles').select('*').order('created_at', {ascending: false});
      if (data) setBots(data as BotProfile[]);
  };

  const handleSaveBot = async (e: React.FormEvent) => {
      e.preventDefault();
      const payload = {
          name: botForm.name,
          avatar: botForm.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${botForm.name}`,
          is_active: botForm.is_active
      };

      if (botForm.id) {
          await supabase.from('bot_profiles').update(payload).eq('id', botForm.id);
      } else {
          await supabase.from('bot_profiles').insert(payload);
      }
      
      setIsEditingBot(false);
      fetchBots();
  };

  const handleDeleteBot = async (id: string) => {
      if(!confirm('Delete this bot profile?')) return;
      await supabase.from('bot_profiles').delete().eq('id', id);
      fetchBots();
  };

  const openBotModal = (bot?: BotProfile) => {
      if (bot) {
          setBotForm({ id: bot.id, name: bot.name, avatar: bot.avatar, is_active: bot.is_active });
      } else {
          setBotForm({ id: '', name: '', avatar: '', is_active: true });
      }
      setIsEditingBot(true);
  };

  return (
    <div className="space-y-6 animate-fade-in">
         <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                <Activity className="text-neon-green" /> Game Master Control
            </h2>
            <div className="flex bg-white/10 p-1 rounded-lg">
                <button onClick={() => setActiveTab('crash')} className={`px-4 py-1.5 rounded text-sm font-bold ${activeTab === 'crash' ? 'bg-white text-black' : 'text-gray-400'}`}>Crash</button>
                <button onClick={() => setActiveTab('bots')} className={`px-4 py-1.5 rounded text-sm font-bold ${activeTab === 'bots' ? 'bg-white text-black' : 'text-gray-400'}`}>Bots</button>
            </div>
         </div>

         {activeTab === 'crash' && (
             <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                 <GlassCard className="relative border-red-500/20 bg-red-500/5">
                     <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                         <AlertCircle className="text-red-500" size={18} /> Crash Override
                     </h3>
                     <div className="flex gap-2">
                         <input 
                            type="number" 
                            step="0.01"
                            placeholder="Force Multiplier (e.g. 1.00)" 
                            className="flex-1 bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-red-500"
                            onChange={(e) => setOverrideValue(e.target.value)}
                            value={overrideValue}
                         />
                         <button onClick={() => handleForceResult(overrideValue)} className="bg-white text-black font-bold px-6 rounded-xl hover:bg-gray-200">Set</button>
                     </div>
                     {isActiveOverride && <div className="mt-2 text-green-400 text-xs font-bold">Next round forced!</div>}
                 </GlassCard>
                 <GlassCard>
                     <p className="text-gray-400 text-xs uppercase font-bold">Recent Profit</p>
                     <p className={`text-2xl font-bold ${crashStats.profit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                         <BalanceDisplay amount={crashStats.profit || 0} />
                     </p>
                 </GlassCard>
             </div>
         )}

         {activeTab === 'bots' && (
             <div className="space-y-6">
                 <div className="flex justify-between items-center">
                     <h3 className="text-lg font-bold text-white flex items-center gap-2">
                         <Bot className="text-purple-400" /> Bot Profiles
                     </h3>
                     <button 
                        onClick={() => openBotModal()}
                        className="bg-purple-600 text-white px-4 py-2 rounded-xl font-bold flex items-center gap-2 hover:bg-purple-500 shadow-lg"
                     >
                         <Plus size={18}/> Add Bot
                     </button>
                 </div>

                 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                     {bots.map(bot => (
                         <GlassCard key={bot.id} className="flex items-center gap-4 group relative border-white/5 hover:border-purple-500/30">
                             <img src={bot.avatar} alt={bot.name} className="w-12 h-12 rounded-full border-2 border-white/10 object-cover" />
                             <div className="flex-1">
                                 <h4 className="font-bold text-white">{bot.name}</h4>
                                 <span className={`text-[10px] px-2 py-0.5 rounded ${bot.is_active ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                                     {bot.is_active ? 'Active' : 'Inactive'}
                                 </span>
                             </div>
                             <div className="opacity-0 group-hover:opacity-100 transition flex gap-2 absolute right-4">
                                 <button onClick={() => openBotModal(bot)} className="text-blue-400 hover:text-white"><Edit2 size={16}/></button>
                                 <button onClick={() => handleDeleteBot(bot.id)} className="text-red-400 hover:text-white"><Trash2 size={16}/></button>
                             </div>
                         </GlassCard>
                     ))}
                 </div>
             </div>
         )}

         {/* BOT MODAL */}
         <AnimatePresence>
             {isEditingBot && (
                 <motion.div 
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
                 >
                     <motion.div 
                        initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }}
                        className="bg-dark-900 w-full max-w-md rounded-2xl border border-white/10 p-6"
                     >
                         <div className="flex justify-between items-center mb-6">
                             <h3 className="text-xl font-bold text-white">{botForm.id ? 'Edit Bot' : 'Add Bot'}</h3>
                             <button onClick={() => setIsEditingBot(false)} className="text-gray-500 hover:text-white"><X size={24}/></button>
                         </div>

                         <form onSubmit={handleSaveBot} className="space-y-4">
                             <div>
                                 <label className="text-xs text-gray-400 block mb-1">Bot Name</label>
                                 <input required type="text" value={botForm.name} onChange={e => setBotForm({...botForm, name: e.target.value})} className="w-full bg-black/30 border border-white/10 rounded-lg p-3 text-white focus:border-neon-green outline-none" />
                             </div>
                             
                             <ImageSelector
                                label="Bot Avatar"
                                value={botForm.avatar} 
                                onChange={(val) => setBotForm({...botForm, avatar: val})}
                                placeholder="Select or Upload Avatar"
                             />

                             <div className="flex items-center gap-3 bg-white/5 p-3 rounded-lg">
                                 <input type="checkbox" checked={botForm.is_active} onChange={e => setBotForm({...botForm, is_active: e.target.checked})} className="w-5 h-5 accent-purple-500" />
                                 <span className="text-white font-bold text-sm">Bot Active</span>
                             </div>

                             <button type="submit" className="w-full py-3 bg-purple-600 text-white font-bold rounded-xl hover:bg-purple-500 transition flex items-center justify-center gap-2 mt-4">
                                 <Save size={18} /> Save Bot Profile
                             </button>
                         </form>
                     </motion.div>
                 </motion.div>
             )}
         </AnimatePresence>
    </div>
  );
};

export default GameControl;