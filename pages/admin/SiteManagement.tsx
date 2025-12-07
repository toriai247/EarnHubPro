
import React, { useEffect, useState } from 'react';
import GlassCard from '../../components/GlassCard';
import { supabase } from '../../integrations/supabase/client';
import { PublishedSite } from '../../types';
import { Globe, Plus, Trash2, Edit2, ExternalLink, Power, Eye, Save, X, Search, FileText, UploadCloud, Link as LinkIcon, Loader2 } from 'lucide-react';
import { useUI } from '../../context/UIContext';
import Loader from '../../components/Loader';
import { motion, AnimatePresence } from 'framer-motion';

const SiteManagement: React.FC = () => {
  const { toast, confirm } = useUI();
  const [sites, setSites] = useState<PublishedSite[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  // New States for Upload
  const [uploadMode, setUploadMode] = useState<'url' | 'html'>('url');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const initialForm = {
      name: '',
      slug: '',
      target_url: '',
      page_title: '',
      meta_desc: '',
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
          page_title: site.page_title || '',
          meta_desc: site.meta_desc || '',
          is_active: site.is_active
      });
      setUploadMode(site.source_type === 'html' ? 'html' : 'url');
      setSelectedFile(null);
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
      
      let finalTargetUrl = form.target_url;

      // Handle HTML Upload
      if (uploadMode === 'html') {
          if (!selectedFile && !editingId) { // New site requires file
              toast.error("Please upload an HTML file.");
              return;
          }
          if (selectedFile) {
              if (selectedFile.type !== 'text/html') {
                  toast.error("Only .html files are allowed.");
                  return;
              }
              setIsUploading(true);
              try {
                  const sanitizedSlug = form.slug.replace(/[^a-zA-Z0-9-_]/g, '');
                  const timestamp = Date.now();
                  const filePath = `${sanitizedSlug}_${timestamp}.html`;
                  
                  const { error: uploadError } = await supabase.storage.from('hosted-sites').upload(filePath, selectedFile, {
                      cacheControl: '3600',
                      upsert: false
                  });

                  if (uploadError) throw uploadError;

                  // Get Public URL
                  const { data: urlData } = supabase.storage.from('hosted-sites').getPublicUrl(filePath);
                  finalTargetUrl = urlData.publicUrl;

              } catch (e: any) {
                  toast.error("Upload Failed: " + e.message);
                  setIsUploading(false);
                  return;
              }
              setIsUploading(false);
          } else if (editingId) {
              // Keeping existing file (URL already in form.target_url)
              // No changes needed
          }
      }

      const payload = {
          name: form.name,
          slug: form.slug.replace(/[^a-zA-Z0-9-_]/g, ''),
          target_url: finalTargetUrl,
          source_type: uploadMode,
          page_title: form.page_title,
          meta_desc: form.meta_desc,
          is_active: form.is_active
      };

      if (!payload.name || !payload.slug || !payload.target_url) {
          toast.error("Please fill all required fields");
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
          setSelectedFile(null);
          setEditingId(null);
          fetchSites();
      } catch (e: any) {
          toast.error("Save Error: " + e.message);
      }
  };

  const fullUrl = (slug: string) => `${window.location.origin}/#/${slug}`;

  const openModal = () => {
      setIsEditing(true);
      setEditingId(null);
      setForm(initialForm);
      setUploadMode('url');
      setSelectedFile(null);
  }

  return (
    <div className="space-y-6 animate-fade-in pb-20 relative">
        <div className="flex justify-between items-center">
            <div>
                <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                    <Globe className="text-indigo-400" /> Site Publisher
                </h2>
                <p className="text-gray-400 text-sm">Publish external websites or upload HTML pages.</p>
            </div>
            <button 
                onClick={openModal}
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
                                <div className="flex items-center gap-2">
                                    <h3 className="font-bold text-white text-lg">{site.name}</h3>
                                    {site.source_type === 'html' && <span className="bg-indigo-500/20 text-indigo-400 px-1.5 py-0.5 rounded text-[9px] font-bold border border-indigo-500/30 uppercase">Hosted</span>}
                                </div>
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
                        className="bg-dark-900 w-full max-w-lg rounded-2xl border border-white/10 p-6 max-h-[90vh] overflow-y-auto custom-scrollbar"
                    >
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-bold text-white">{editingId ? 'Edit Site' : 'Publish New Site'}</h3>
                            <button onClick={() => setIsEditing(false)} className="text-gray-500 hover:text-white"><X size={24}/></button>
                        </div>

                        <form onSubmit={handleSave} className="space-y-4">
                            <div className="grid grid-cols-1 gap-4">
                                <div>
                                    <label className="text-xs font-bold text-gray-400 block mb-1">Site Name (Internal)</label>
                                    <input required type="text" value={form.name} onChange={e => setForm({...form, name: e.target.value})} className="w-full bg-black/30 border border-white/10 rounded-lg p-3 text-white focus:border-indigo-500 outline-none" placeholder="e.g. My Portfolio" />
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-gray-400 block mb-1">Slug (URL Path)</label>
                                    <div className="relative">
                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-xs">/</span>
                                        <input required type="text" value={form.slug} onChange={e => setForm({...form, slug: e.target.value})} className="w-full bg-black/30 border border-white/10 rounded-lg pl-6 pr-3 py-3 text-white focus:border-indigo-500 outline-none" placeholder="my-site" />
                                    </div>
                                </div>
                                
                                {/* SOURCE TYPE TOGGLE */}
                                <div className="bg-black/30 p-1 rounded-lg flex border border-white/10">
                                    <button 
                                        type="button"
                                        onClick={() => setUploadMode('url')}
                                        className={`flex-1 py-2 text-xs font-bold rounded-md flex items-center justify-center gap-2 transition ${uploadMode === 'url' ? 'bg-indigo-600 text-white shadow-lg' : 'text-gray-400 hover:text-white'}`}
                                    >
                                        <LinkIcon size={14} /> External Link
                                    </button>
                                    <button 
                                        type="button"
                                        onClick={() => setUploadMode('html')}
                                        className={`flex-1 py-2 text-xs font-bold rounded-md flex items-center justify-center gap-2 transition ${uploadMode === 'html' ? 'bg-indigo-600 text-white shadow-lg' : 'text-gray-400 hover:text-white'}`}
                                    >
                                        <FileText size={14} /> Upload HTML
                                    </button>
                                </div>

                                {uploadMode === 'url' ? (
                                    <div>
                                        <label className="text-xs font-bold text-gray-400 block mb-1">Target URL (Iframe Source)</label>
                                        <input required type="url" value={form.target_url} onChange={e => setForm({...form, target_url: e.target.value})} className="w-full bg-black/30 border border-white/10 rounded-lg p-3 text-white focus:border-indigo-500 outline-none" placeholder="https://..." />
                                    </div>
                                ) : (
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-gray-400 block mb-1">Upload HTML File</label>
                                        <div className="border-2 border-dashed border-white/10 rounded-xl p-6 text-center hover:bg-white/5 transition cursor-pointer relative group">
                                            <input 
                                                type="file" 
                                                accept=".html" 
                                                onChange={e => e.target.files && setSelectedFile(e.target.files[0])} 
                                                className="absolute inset-0 opacity-0 cursor-pointer z-10" 
                                            />
                                            <UploadCloud size={32} className="mx-auto text-indigo-400 mb-2 group-hover:scale-110 transition" />
                                            {selectedFile ? (
                                                <p className="text-sm font-bold text-green-400">{selectedFile.name}</p>
                                            ) : (
                                                <p className="text-xs text-gray-400">Drag & Drop or Click to Select (.html)</p>
                                            )}
                                        </div>
                                        {editingId && !selectedFile && (
                                            <p className="text-[10px] text-gray-500">Current file is active. Upload new to replace.</p>
                                        )}
                                    </div>
                                )}
                            </div>

                            <div className="bg-white/5 p-4 rounded-xl border border-white/10 space-y-4">
                                <h4 className="text-xs font-bold text-indigo-400 uppercase flex items-center gap-2">
                                    <Search size={14}/> SEO & Metadata (Optional)
                                </h4>
                                <div>
                                    <label className="text-xs font-bold text-gray-400 block mb-1">Browser Tab Title</label>
                                    <input type="text" value={form.page_title} onChange={e => setForm({...form, page_title: e.target.value})} className="w-full bg-black/30 border border-white/10 rounded-lg p-3 text-white focus:border-indigo-500 outline-none" placeholder="e.g. Naxxivo - Special Offer" />
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-gray-400 block mb-1">Meta Description</label>
                                    <textarea value={form.meta_desc} onChange={e => setForm({...form, meta_desc: e.target.value})} className="w-full bg-black/30 border border-white/10 rounded-lg p-3 text-white focus:border-indigo-500 outline-none h-20 resize-none" placeholder="Brief description for search engines..." />
                                </div>
                            </div>

                            <div className="flex items-center gap-3 bg-white/5 p-3 rounded-lg">
                                <input type="checkbox" checked={form.is_active} onChange={e => setForm({...form, is_active: e.target.checked})} className="w-5 h-5 accent-indigo-500" />
                                <span className="text-white font-bold text-sm">Site Active</span>
                            </div>

                            <button 
                                type="submit" 
                                disabled={isUploading}
                                className="w-full py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-500 transition flex items-center justify-center gap-2 mt-4 disabled:opacity-50"
                            >
                                {isUploading ? <Loader2 className="animate-spin" size={18}/> : <Save size={18} />} Save Site
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
