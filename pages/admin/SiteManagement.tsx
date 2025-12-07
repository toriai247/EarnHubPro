
import React, { useEffect, useState } from 'react';
import GlassCard from '../../components/GlassCard';
import { supabase } from '../../integrations/supabase/client';
import { PublishedSite } from '../../types';
import { Globe, Plus, Trash2, ExternalLink, Save, Eye, Loader2, X } from 'lucide-react';
import { useUI } from '../../context/UIContext';
import { motion, AnimatePresence } from 'framer-motion';

const SiteManagement: React.FC = () => {
  const { toast, confirm } = useUI();
  const [sites, setSites] = useState<PublishedSite[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [form, setForm] = useState({ name: '', slug: '', target_url: '' });

  useEffect(() => {
    fetchSites();
  }, []);

  const fetchSites = async () => {
    setLoading(true);
    const { data } = await supabase.from('published_sites').select('*').order('created_at', { ascending: false });
    if (data) setSites(data as PublishedSite[]);
    setLoading(false);
  };

  const handleSave = async (e: React.FormEvent) => {
      e.preventDefault();
      // Basic validation
      if (!/^[a-zA-Z0-9-_]+$/.test(form.slug)) {
          toast.error("Slug can only contain letters, numbers, hyphens, and underscores.");
          return;
      }

      try {
          const { error } = await supabase.from('published_sites').insert(form);
          if (error) throw error;
          
          toast.success("Site Published!");
          setForm({ name: '', slug: '', target_url: '' });
          setIsEditing(false);
          fetchSites();
      } catch (e: any) {
          toast.error(e.message);
      }
  };

  const handleDelete = async (id: string) => {
      if (!await confirm("Unpublish this site?")) return;
      await supabase.from('published_sites').delete().eq('id', id);
      setSites(prev => prev.filter(s => s.id !== id));
      toast.success("Site removed");
  };

  const copyLink = (slug: string) => {
      const url = `${window.location.origin}/#/${slug}`;
      navigator.clipboard.writeText(url);
      toast.success("Link copied!");
  };

  return (
    <div className="space-y-6 animate-fade-in pb-20">
        <div className="flex justify-between items-center">
            <div>
                <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                    <Globe className="text-blue-400" /> Site Publisher
                </h2>
                <p className="text-gray-400 text-sm">Create internal links to external web apps.</p>
            </div>
            <button 
                onClick={() => setIsEditing(true)}
                className="bg-blue-600 text-white px-4 py-2 rounded-xl font-bold flex items-center gap-2 hover:bg-blue-500 transition shadow-lg shadow-blue-900/20"
            >
                <Plus size={18} /> Publish New Site
            </button>
        </div>

        {/* SITE LIST */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {sites.map(site => (
                <GlassCard key={site.id} className="border border-white/10 group hover:border-blue-500/30 transition">
                    <div className="flex justify-between items-start mb-3">
                        <div>
                            <h3 className="font-bold text-white text-lg">{site.name}</h3>
                            <div className="flex items-center gap-2 text-xs mt-1">
                                <span className="bg-blue-500/20 text-blue-300 px-2 py-0.5 rounded font-mono">/{site.slug}</span>
                                <span className="text-gray-500 flex items-center gap-1"><Eye size={10}/> {site.views} views</span>
                            </div>
                        </div>
                        <div className="flex gap-2">
                            <button onClick={() => copyLink(site.slug)} className="p-2 bg-white/5 hover:bg-white/10 rounded-lg text-gray-400 hover:text-white transition" title="Copy Link">
                                <ExternalLink size={16}/>
                            </button>
                            <button onClick={() => handleDelete(site.id)} className="p-2 bg-red-500/10 hover:bg-red-500/20 rounded-lg text-red-400 transition" title="Delete">
                                <Trash2 size={16}/>
                            </button>
                        </div>
                    </div>
                    
                    <div className="bg-black/30 p-2 rounded-lg border border-white/5 text-xs text-gray-500 truncate font-mono">
                        Target: {site.target_url}
                    </div>
                </GlassCard>
            ))}
            {sites.length === 0 && !loading && (
                <div className="col-span-full text-center py-12 bg-white/5 rounded-xl border border-white/5 text-gray-500">
                    No published sites yet.
                </div>
            )}
        </div>

        {/* CREATE MODAL */}
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
                            <h3 className="text-xl font-bold text-white">Publish Site</h3>
                            <button onClick={() => setIsEditing(false)} className="text-gray-500 hover:text-white"><X size={24}/></button>
                        </div>

                        <form onSubmit={handleSave} className="space-y-4">
                            <div>
                                <label className="text-xs font-bold text-gray-400 mb-1 block uppercase">Site Name</label>
                                <input required type="text" value={form.name} onChange={e => setForm({...form, name: e.target.value})} className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white focus:border-blue-500 outline-none" placeholder="e.g. Naxx AI" />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-gray-400 mb-1 block uppercase">URL Slug (Unique)</label>
                                <div className="relative">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">/</span>
                                    <input required type="text" value={form.slug} onChange={e => setForm({...form, slug: e.target.value})} className="w-full bg-black/40 border border-white/10 rounded-xl pl-6 pr-3 py-3 text-white focus:border-blue-500 outline-none" placeholder="naxxai" />
                                </div>
                            </div>
                            <div>
                                <label className="text-xs font-bold text-gray-400 mb-1 block uppercase">Target URL</label>
                                <input required type="url" value={form.target_url} onChange={e => setForm({...form, target_url: e.target.value})} className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white focus:border-blue-500 outline-none" placeholder="https://..." />
                            </div>

                            <button type="submit" className="w-full py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-500 transition flex items-center justify-center gap-2 mt-4 shadow-lg">
                                <Save size={18} /> Publish
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
