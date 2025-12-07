
import React, { useEffect, useState } from 'react';
import GlassCard from '../../components/GlassCard';
import { supabase } from '../../integrations/supabase/client';
import { PublishedSite } from '../../types';
import { Globe, Plus, Trash2, Edit2, ExternalLink, Power, Eye, Save, X } from 'lucide-react';
import { useUI } from '../../context/UIContext';
import Loader from '../../components/Loader';
import { motion, AnimatePresence } from 'framer-motion';

const SiteManagement: React.FC = () => {
  const { toast, confirm } = useUI();
  const [sites, setSites] = useState<PublishedSite[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  const initialForm = {
      name: '',
      slug: '',
      target_url: '',
      is_active: true
  };
  const [form, setForm] = useState(initialForm);

  useEffect(() => {
      fetchSites();
  }, []);

  const fetchSites = async () => {
      setLoading(true);
      const { data } = await supabase.from('published_sites').select('*').order('created_at', { ascending: false });
      if (data) setSites(data as PublishedSite[]);
      setLoading(false);
  };

  const handleEdit = (site: PublishedSite) => {
      setForm({
          name: site.name,
          slug: site.slug,
          target_url: site.target_url,
          is_active: site.is_active
      });
      setEditingId(site.id);
      setIsEditing(true);
  };

  const handleDelete = async (id: string) => {
      if (!await confirm("Delete this published site permanently?")) return;
      const { error } = await supabase.from('published_sites').delete().eq('id', id);
      if (error) toast.error("Error: " + error.message);
      else {
          setSites(prev => prev.filter(s => s.id !== id));
          toast.success("Site deleted");
      }
  };

  const toggleActive = async (site: PublishedSite) => {
      const newVal = !site.is_active;
      const { error } = await supabase.from('published_sites').update({ is_active: newVal }).eq('id', site.id);
      if (!error) {
          setSites(prev => prev.map(s => s.id === site.id ? { ...s, is_active: newVal } : s));
          toast.success(newVal ? "Site Activated" : "Site Deactivated");
      }
  };

  const handleSave = async (e: React.FormEvent) => {
      e.preventDefault();
      
      const payload = {
          name: form.name,
          slug: form.slug.replace(/[^a-zA-Z0-9-_]/g, ''), // Sanitize slug
          target_url: form.target_url,
          is_active: form.is_active
      };

      if (!payload.name || !payload.slug || !payload.target_url) {
          toast.error("Please fill all fields");
          return;
      }

      try {
          if (editingId) {
              const { error } = await supabase.from('published_sites').update(payload).eq('id', editingId);
              if (error) throw error;
          } else {
              const { error } = await supabase.from('published_sites').insert(payload);
              if (error) throw error;
          }
          toast.success("Site Saved!");
          setIsEditing(false);
          setForm(initialForm);
          setEditingId(null);
          fetchSites();
      } catch (e: any) {
          toast.error("Save Error: " + e.message);
      }
  };

  const fullUrl = (slug: string) => `${window.location.origin}/#/${slug}`;

  return (
    <div className="space-y-6 animate-fade-in pb-20 relative">
        <div className="flex justify-between items-center">
            <div>
                <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                    <Globe className="text-indigo-400" /> Site Publisher
                </h2>
                <p className="text-gray-400 text-sm">Publish external websites under your domain.</p>
            </div>
            <button 
                onClick={() => { setIsEditing(true); setEditingId(null); setForm(initialForm); }}
                className="bg-indigo-600 text-white px-4 py-2 rounded-xl font-bold flex items-center gap-2 hover:bg-indigo-500 transition shadow-lg"
            >
                <Plus size={18} /> Add Site
            </button>
        </div>

        {loading ? (
            <div className="p-10"><Loader /></div>
        ) : sites.length === 0 ? (
            <div className="text-center py-12 text-gray-500 bg-white/5 rounded-xl border border-white/5">
                No sites published yet.
            </div>
        ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {sites.map(site => (
                    <GlassCard key={site.id} className={`border transition-colors ${site.is_active ? 'border-white/10' : 'border-white/5 opacity-70 grayscale'}`}>
                        <div className="flex justify-between items-start mb-3">
                            <div>
                                <h3 className="font-bold text-white text-lg">{site.name}</h3>
                                <a href={fullUrl(site.slug)} target="_blank" rel="noreferrer" className="text-xs text-indigo-400 hover:text-white flex items-center gap-1 mt-1">
                                    /{site.slug} <ExternalLink size={10}/>
                                </a>
                            </div>
                            <div className="bg-black/30 px-2 py-1 rounded text-[10px] text-gray-400 flex items-center gap-1">
                                <Eye size={10}/> {site.views || 0}
                            </div>
                        </div>

                        <div className="bg-black/20 p-2 rounded-lg mb-4 border border-white/5 text-xs text-gray-500 truncate font-mono">
                            {site.target_url}
                        </div>

                        <div className="flex gap-2 pt-2 border-t border-white/5">
                            <button 
                                onClick={() => toggleActive(site)} 
                                className={`p-2 rounded-lg transition ${site.is_active ? 'bg-green-500/10 text-green-400 hover:bg-green-500/20' : 'bg-white/5 text-gray-500 hover:text-white'}`}
                                title={site.is_active ? "Deactivate" : "Activate"}
                            >
                                <Power size={16}/>
                            </button>
                            <button onClick={() => handleEdit(site)} className="flex-1 py-2 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 rounded-lg text-xs font-bold transition flex items-center justify-center gap-2">
                                <Edit2 size={14}/> Edit
                            </button>
                            <button onClick={() => handleDelete(site.id)} className="p-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg transition">
                                <Trash2 size={16}/>
                            </button>
                        </div>
                    </GlassCard>
                ))}
            </div>
        )}

        <AnimatePresence>
            {isEditing && (
                <motion.div 
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
                >
                    <motion.div 
                        initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }}
                        className="bg-dark-900 w-full max-w-md rounded-2xl border border-white/10 p-6"
                    >
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-bold text-white">{editingId ? 'Edit Site' : 'Publish New Site'}</h3>
                            <button onClick={() => setIsEditing(false)} className="text-gray-500 hover:text-white"><X size={24}/></button>
                        </div>

                        <form onSubmit={handleSave} className="space-y-4">
                            <div>
                                <label className="text-xs font-bold text-gray-400 block mb-1">Site Name</label>
                                <input required type="text" value={form.name} onChange={e => setForm({...form, name: e.target.value})} className="w-full bg-black/30 border border-white/10 rounded-lg p-3 text-white focus:border-indigo-500 outline-none" placeholder="e.g. My Portfolio" />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-gray-400 block mb-1">Slug (URL Path)</label>
                                <div className="relative">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-xs">/</span>
                                    <input required type="text" value={form.slug} onChange={e => setForm({...form, slug: e.target.value})} className="w-full bg-black/30 border border-white/10 rounded-lg pl-6 pr-3 py-3 text-white focus:border-indigo-500 outline-none" placeholder="my-site" />
                                </div>
                            </div>
                            <div>
                                <label className="text-xs font-bold text-gray-400 block mb-1">Target URL</label>
                                <input required type="url" value={form.target_url} onChange={e => setForm({...form, target_url: e.target.value})} className="w-full bg-black/30 border border-white/10 rounded-lg p-3 text-white focus:border-indigo-500 outline-none" placeholder="https://..." />
                            </div>

                            <div className="flex items-center gap-3 bg-white/5 p-3 rounded-lg">
                                <input type="checkbox" checked={form.is_active} onChange={e => setForm({...form, is_active: e.target.checked})} className="w-5 h-5 accent-indigo-500" />
                                <span className="text-white font-bold text-sm">Site Active</span>
                            </div>

                            <button type="submit" className="w-full py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-500 transition flex items-center justify-center gap-2 mt-4">
                                <Save size={18} /> Save Site
                            </button>
                        </form>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    </div>
  );
};

export default SiteManagement;
