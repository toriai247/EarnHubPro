
import React, { useEffect, useState } from 'react';
import GlassCard from '../../components/GlassCard';
import { supabase } from '../../integrations/supabase/client';
import { WithdrawalSettings } from '../../types';
import { Save, Loader2, DollarSign } from 'lucide-react';

const WithdrawSettings: React.FC = () => {
  const [settings, setSettings] = useState<WithdrawalSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    const { data } = await supabase.from('withdrawal_settings').select('*').single();
    if (data) setSettings(data as WithdrawalSettings);
    setLoading(false);
  };

  const handleSave = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!settings) return;
      setSaving(true);
      
      const { error } = await supabase.from('withdrawal_settings').update({
          min_withdraw: settings.min_withdraw,
          max_withdraw: settings.max_withdraw,
          daily_limit: settings.daily_limit,
          monthly_limit: settings.monthly_limit,
          id_change_fee: settings.id_change_fee,
          withdraw_fee_percent: settings.withdraw_fee_percent,
          kyc_required: settings.kyc_required
      }).gt('min_withdraw', 0);

      if (error) alert('Error saving: ' + error.message);
      else alert('Settings saved successfully');
      
      setSaving(false);
  };

  if (loading) return <Loader2 className="animate-spin text-neon-green mx-auto mt-10" />;
  if (!settings) return <div className="text-center mt-10 text-red-500">Error loading settings</div>;

  return (
    <div className="space-y-6 animate-fade-in">
        <h2 className="text-2xl font-bold text-white">Withdrawal Configuration</h2>
        
        <GlassCard>
            <form onSubmit={handleSave} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="block text-xs font-bold text-gray-400 mb-1">Minimum Withdraw ($)</label>
                        <input type="number" value={settings.min_withdraw} onChange={e => setSettings({...settings, min_withdraw: parseFloat(e.target.value)})} className="w-full bg-black/30 border border-white/10 rounded-lg p-3 text-white focus:border-neon-green outline-none" />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-400 mb-1">Maximum Withdraw ($)</label>
                        <input type="number" value={settings.max_withdraw} onChange={e => setSettings({...settings, max_withdraw: parseFloat(e.target.value)})} className="w-full bg-black/30 border border-white/10 rounded-lg p-3 text-white focus:border-neon-green outline-none" />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-400 mb-1">Daily Limit ($)</label>
                        <input type="number" value={settings.daily_limit} onChange={e => setSettings({...settings, daily_limit: parseFloat(e.target.value)})} className="w-full bg-black/30 border border-white/10 rounded-lg p-3 text-white focus:border-neon-green outline-none" />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-400 mb-1">Monthly Limit ($)</label>
                        <input type="number" value={settings.monthly_limit} onChange={e => setSettings({...settings, monthly_limit: parseFloat(e.target.value)})} className="w-full bg-black/30 border border-white/10 rounded-lg p-3 text-white focus:border-neon-green outline-none" />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-400 mb-1">ID Change Fee (TK)</label>
                        <input type="number" value={settings.id_change_fee} onChange={e => setSettings({...settings, id_change_fee: parseFloat(e.target.value)})} className="w-full bg-black/30 border border-white/10 rounded-lg p-3 text-white focus:border-neon-green outline-none" />
                    </div>
                    
                    {/* NEW: Profit Configuration */}
                    <div className="md:col-span-2 pt-4 border-t border-white/10">
                        <label className="block text-sm font-bold text-neon-green mb-2 flex items-center gap-2">
                            <DollarSign size={16} /> Withdrawal Fee (%)
                        </label>
                        <p className="text-xs text-gray-500 mb-3">
                            Percentage deducted from user withdrawal amount as Admin Profit. <br/>
                            (e.g. User withdraws $100. If Fee is 10%, user receives $90, Admin keeps $10)
                        </p>
                        <div className="flex items-center gap-2">
                            <input 
                                type="number" 
                                step="0.1"
                                value={settings.withdraw_fee_percent} 
                                onChange={e => setSettings({...settings, withdraw_fee_percent: parseFloat(e.target.value)})} 
                                className="w-full max-w-[150px] bg-black/30 border border-white/10 rounded-lg p-3 text-white text-lg font-bold focus:border-neon-green outline-none" 
                            />
                            <span className="text-white font-bold">%</span>
                        </div>
                    </div>
                </div>

                <div className="pt-2 bg-white/5 p-4 rounded-xl border border-white/5">
                    <label className="flex items-center gap-3 cursor-pointer">
                        <input type="checkbox" checked={settings.kyc_required} onChange={e => setSettings({...settings, kyc_required: e.target.checked})} className="w-5 h-5 accent-neon-green" />
                        <div>
                            <span className="block text-white font-bold text-sm">Require KYC for Withdrawals</span>
                            <span className="text-xs text-gray-500">Users must be verified to request funds</span>
                        </div>
                    </label>
                </div>

                <button type="submit" disabled={saving} className="w-full py-3 bg-royal-600 text-white font-bold rounded-xl hover:bg-royal-700 transition flex items-center justify-center gap-2 shadow-lg">
                    {saving ? <Loader2 className="animate-spin" size={18}/> : <Save size={18}/>} Save Configuration
                </button>
            </form>
        </GlassCard>
    </div>
  );
};

export default WithdrawSettings;
