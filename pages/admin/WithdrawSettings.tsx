
import React, { useEffect, useState } from 'react';
import GlassCard from '../../components/GlassCard';
import { supabase } from '../../integrations/supabase/client';
import { WithdrawalSettings } from '../../types';
import { Save, Loader2, DollarSign, Sliders, Shield, AlertTriangle } from 'lucide-react';

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
      }).gt('min_withdraw', 0); // basic sanity check condition for RLS if needed

      if (error) alert('Error saving: ' + error.message);
      else alert('Settings saved successfully');
      
      setSaving(false);
  };

  if (loading) return <Loader2 className="animate-spin text-neon-green mx-auto mt-10" />;
  if (!settings) return <div className="text-center mt-10 text-red-500">Error loading settings</div>;

  return (
    <div className="space-y-6 animate-fade-in pb-20">
        <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <Sliders size={24} className="text-blue-400" /> Withdrawal Control
        </h2>
        
        <form onSubmit={handleSave} className="space-y-6">
            
            {/* LIMITS SECTION */}
            <GlassCard>
                <div className="flex items-center gap-2 mb-6 border-b border-white/10 pb-4">
                    <DollarSign size={18} className="text-green-400" />
                    <h3 className="font-bold text-white uppercase tracking-wider text-sm">Transaction Limits (BDT)</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="block text-xs font-bold text-gray-400 mb-1 uppercase">Minimum Withdraw</label>
                        <input type="number" value={settings.min_withdraw} onChange={e => setSettings({...settings, min_withdraw: parseFloat(e.target.value)})} className="w-full bg-black/30 border border-white/10 rounded-lg p-3 text-white focus:border-neon-green outline-none font-mono" />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-400 mb-1 uppercase">Maximum Withdraw</label>
                        <input type="number" value={settings.max_withdraw} onChange={e => setSettings({...settings, max_withdraw: parseFloat(e.target.value)})} className="w-full bg-black/30 border border-white/10 rounded-lg p-3 text-white focus:border-neon-green outline-none font-mono" />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-400 mb-1 uppercase">Daily Limit</label>
                        <input type="number" value={settings.daily_limit} onChange={e => setSettings({...settings, daily_limit: parseFloat(e.target.value)})} className="w-full bg-black/30 border border-white/10 rounded-lg p-3 text-white focus:border-neon-green outline-none font-mono" />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-400 mb-1 uppercase">Monthly Limit</label>
                        <input type="number" value={settings.monthly_limit} onChange={e => setSettings({...settings, monthly_limit: parseFloat(e.target.value)})} className="w-full bg-black/30 border border-white/10 rounded-lg p-3 text-white focus:border-neon-green outline-none font-mono" />
                    </div>
                </div>
            </GlassCard>

            {/* FEES SECTION */}
            <GlassCard className="border-l-4 border-l-yellow-500">
                <div className="flex items-center gap-2 mb-6 border-b border-white/10 pb-4">
                    <AlertTriangle size={18} className="text-yellow-500" />
                    <h3 className="font-bold text-white uppercase tracking-wider text-sm">Fees & Charges</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="block text-xs font-bold text-gray-400 mb-1 uppercase">Withdrawal Fee (%)</label>
                        <div className="relative">
                            <input 
                                type="number" 
                                step="0.1"
                                value={settings.withdraw_fee_percent} 
                                onChange={e => setSettings({...settings, withdraw_fee_percent: parseFloat(e.target.value)})} 
                                className="w-full bg-black/30 border border-white/10 rounded-lg p-3 text-white font-bold text-lg focus:border-neon-green outline-none" 
                            />
                            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 font-bold">%</span>
                        </div>
                        <p className="text-[10px] text-gray-500 mt-2">Deducted from the user's requested amount.</p>
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-400 mb-1 uppercase">ID Change Penalty (BDT)</label>
                        <input type="number" value={settings.id_change_fee} onChange={e => setSettings({...settings, id_change_fee: parseFloat(e.target.value)})} className="w-full bg-black/30 border border-white/10 rounded-lg p-3 text-white focus:border-neon-green outline-none font-mono" />
                        <p className="text-[10px] text-gray-500 mt-2">Cost to change a saved withdrawal number (e.g. Bkash).</p>
                    </div>
                </div>
            </GlassCard>

            {/* SECURITY SECTION */}
            <GlassCard>
                <div className="flex items-center gap-2 mb-4">
                    <Shield size={18} className="text-purple-400" />
                    <h3 className="text-bold text-white uppercase tracking-wider text-sm">Security Rules</h3>
                </div>
                <div className="bg-white/5 p-4 rounded-xl border border-white/5 flex items-center justify-between group hover:border-purple-500/30 transition">
                    <div>
                        <span className="block text-white font-bold text-sm">Require KYC for Withdrawals</span>
                        <span className="text-xs text-gray-500">Users must have 'Verified' status to request funds.</span>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                        <input type="checkbox" checked={settings.kyc_required} onChange={e => setSettings({...settings, kyc_required: e.target.checked})} className="sr-only peer" />
                        <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
                    </label>
                </div>
            </GlassCard>

            <button type="submit" disabled={saving} className="w-full py-4 bg-royal-600 text-white font-bold rounded-xl hover:bg-royal-700 transition flex items-center justify-center gap-2 shadow-lg shadow-royal-900/50">
                {saving ? <Loader2 className="animate-spin" size={18}/> : <Save size={18}/>} Save Configuration
            </button>
        </form>
    </div>
  );
};

export default WithdrawSettings;
