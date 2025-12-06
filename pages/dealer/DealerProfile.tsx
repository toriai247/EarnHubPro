
import React, { useEffect, useState } from 'react';
import GlassCard from '../../components/GlassCard';
import { supabase } from '../../integrations/supabase/client';
import { UserProfile } from '../../types';
import { Building2, Mail, Globe, Save, Loader2 } from 'lucide-react';
import { useUI } from '../../context/UIContext';

const DealerProfile: React.FC = () => {
  const { toast } = useUI();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [companyName, setCompanyName] = useState('');
  const [website, setWebsite] = useState('');

  useEffect(() => {
      fetchProfile();
  }, []);

  const fetchProfile = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const { data } = await supabase.from('profiles').select('*').eq('id', session.user.id).single();
      if (data) {
          setProfile(data as UserProfile);
          setCompanyName(data.name_1 || '');
          // Assuming website is stored in bio or we add a column later. Using bio for now.
          setWebsite(data.bio_1 || '');
      }
      setLoading(false);
  };

  const handleSave = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!profile) return;
      setSaving(true);
      const { error } = await supabase.from('profiles').update({
          name_1: companyName,
          bio_1: website // Storing website in bio for simplicity
      }).eq('id', profile.id);

      if (error) toast.error("Update failed");
      else toast.success("Profile Updated");
      setSaving(false);
  };

  if (loading) return <div className="p-10"><Loader2 className="animate-spin text-amber-500 mx-auto"/></div>;

  return (
    <div className="space-y-6 animate-fade-in pb-20">
        <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <Building2 className="text-amber-500" /> Company Profile
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <GlassCard className="border-amber-500/20">
                <form onSubmit={handleSave} className="space-y-4">
                    <div>
                        <label className="text-xs font-bold text-gray-400 uppercase block mb-1">Company Name</label>
                        <div className="relative">
                            <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={18}/>
                            <input value={companyName} onChange={e => setCompanyName(e.target.value)} className="w-full bg-black/40 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-white focus:border-amber-500 outline-none" />
                        </div>
                    </div>
                    <div>
                        <label className="text-xs font-bold text-gray-400 uppercase block mb-1">Website URL</label>
                        <div className="relative">
                            <Globe className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={18}/>
                            <input value={website} onChange={e => setWebsite(e.target.value)} className="w-full bg-black/40 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-white focus:border-amber-500 outline-none" placeholder="https://..." />
                        </div>
                    </div>
                    <div>
                        <label className="text-xs font-bold text-gray-400 uppercase block mb-1">Billing Email (Read Only)</label>
                        <div className="relative">
                            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={18}/>
                            <input readOnly value={profile?.email_1 || ''} className="w-full bg-white/5 border border-white/5 rounded-xl pl-10 pr-4 py-3 text-gray-400 cursor-not-allowed" />
                        </div>
                    </div>
                    <button disabled={saving} className="w-full py-3 bg-amber-500 text-black font-bold rounded-xl hover:bg-amber-400 transition flex items-center justify-center gap-2 shadow-lg">
                        {saving ? <Loader2 className="animate-spin" size={18}/> : <Save size={18}/>} Save Changes
                    </button>
                </form>
            </GlassCard>

            <div className="space-y-4">
                <GlassCard className="bg-amber-900/10 border-amber-500/30">
                    <h3 className="font-bold text-white mb-2 text-sm uppercase">Partner Status</h3>
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                        <span className="text-green-400 font-bold text-lg">VERIFIED DEALER</span>
                    </div>
                    <p className="text-xs text-gray-400 mt-2">
                        You have access to the Dealer API and Advanced Ad Tools.
                    </p>
                </GlassCard>
            </div>
        </div>
    </div>
  );
};

export default DealerProfile;
