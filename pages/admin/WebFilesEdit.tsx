
import React, { useEffect, useState } from 'react';
import { 
    Folder, File, FileCode, FileJson, FileText, Search, 
    ArrowLeft, RefreshCw, Trash2, Terminal, Shield, Plus, X, 
    Save, Globe, Database, Settings, ShieldAlert, Binary
} from 'lucide-react';
import { supabase } from '../../integrations/supabase/client';
import CodeEditor from '../../components/CodeEditor';
import { useUI } from '../../context/UIContext';
import { motion, AnimatePresence } from 'framer-motion';
import Loader from '../../components/Loader';

interface VirtualFile {
    id: string;
    name: string;
    path: string;
    type: 'json' | 'html' | 'css' | 'text';
    content: string;
    table: string;
    lastModified: string;
    virtual?: boolean;
}

const WebFilesEdit: React.FC = () => {
    const { toast, confirm } = useUI();
    const [files, setFiles] = useState<VirtualFile[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeFile, setActiveFile] = useState<VirtualFile | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    
    // New File Modal
    const [isCreating, setIsCreating] = useState(false);
    const [newFileName, setNewFileName] = useState('');
    const [newFileType, setNewFileType] = useState<'html' | 'json'>('html');

    useEffect(() => {
        fetchVirtualFiles();
    }, []);

    const fetchVirtualFiles = async () => {
        setLoading(true);
        try {
            const virtualFiles: VirtualFile[] = [];

            // --- VIRTUAL CORE FILES (Simulated for better visibility of "Main Code") ---
            virtualFiles.push({
                id: 'core_app_logic',
                name: 'app_logic.json',
                path: '/core/app_logic.json',
                type: 'json',
                content: JSON.stringify({
                    version: "5.2.0",
                    env: "production",
                    api_routing: "v7_secure",
                    feature_flags: ["pwa", "biometrics", "auto_withdraw"],
                    security_level: "maximum"
                }, null, 4),
                table: 'system_config',
                virtual: true,
                lastModified: new Date().toISOString()
            });

            // 1. Fetch Real System Config from DB
            const { data: config } = await supabase.from('system_config').select('*').limit(1).maybeSingle();
            if (config) {
                virtualFiles.push({
                    id: 'sys_config',
                    name: 'system_config.json',
                    path: '/config/system_config.json',
                    type: 'json',
                    content: JSON.stringify(config, null, 4),
                    table: 'system_config',
                    lastModified: new Date().toISOString()
                });
            }

            // 2. Fetch Published Sites (HTML Files)
            const { data: sites } = await supabase.from('published_sites').select('*').order('created_at', { ascending: false });
            if (sites) {
                sites.forEach(site => {
                    virtualFiles.push({
                        id: `site_${site.id}`,
                        name: `${site.slug}.${site.source_type === 'html' ? 'html' : 'link'}`,
                        path: `/hosted/${site.slug}.html`,
                        type: 'html',
                        content: site.target_url || '<!-- Empty content -->',
                        table: 'published_sites',
                        lastModified: site.created_at
                    });
                });
            }

            setFiles(virtualFiles);
        } catch (e) {
            console.error(e);
            toast.error("Failed to load root filesystem");
        } finally {
            setLoading(false);
        }
    };

    const handleCreateFile = async () => {
        if (!newFileName) return;
        const slug = newFileName.toLowerCase().replace(/[^a-z0-9]/g, '-');
        
        try {
            if (newFileType === 'html') {
                const { error } = await supabase.from('published_sites').insert({
                    name: newFileName,
                    slug,
                    target_url: '<!-- Start coding your new page here -->',
                    source_type: 'html',
                    is_active: true
                });
                if (error) throw error;
            } else {
                toast.error("Custom JSON files must be mapped to system tables. Feature restricted.");
                return;
            }

            toast.success(`Created: ${newFileName}`);
            setIsCreating(false);
            setNewFileName('');
            fetchVirtualFiles();
        } catch (e: any) {
            toast.error(e.message);
        }
    };

    const handleSave = async (content: string) => {
        if (!activeFile) return;

        try {
            if (activeFile.virtual) {
                toast.error("Virtual system logic is read-only in this terminal.");
                return;
            }

            if (activeFile.table === 'system_config') {
                const parsed = JSON.parse(content);
                const { error } = await supabase.from('system_config').update(parsed).eq('id', parsed.id);
                if (error) throw error;
            } else if (activeFile.table === 'published_sites') {
                const siteId = activeFile.id.replace('site_', '');
                const { error } = await supabase.from('published_sites').update({ target_url: content }).eq('id', siteId);
                if (error) throw error;
            }

            toast.success(`Protocol deployed to ${activeFile.name}`);
            setFiles(prev => prev.map(f => f.id === activeFile.id ? { ...f, content } : f));
        } catch (e: any) {
            toast.error("Deployment failed: " + e.message);
        }
    };

    const filteredFiles = files.filter(f => f.name.toLowerCase().includes(searchTerm.toLowerCase()));

    const getIcon = (type: string, virtual?: boolean) => {
        if (virtual) return <Binary size={18} className="text-purple-400" />;
        switch(type) {
            case 'json': return <FileJson size={18} className="text-yellow-400" />;
            case 'html': return <FileCode size={18} className="text-blue-400" />;
            default: return <FileText size={18} className="text-gray-400" />;
        }
    };

    return (
        <div className="h-[calc(100vh-100px)] flex flex-col gap-4 animate-fade-in pb-4 font-sans selection:bg-blue-500/30">
            
            <div className="flex justify-between items-end shrink-0 px-1">
                <div>
                    <h2 className="text-3xl font-black text-white uppercase tracking-tighter leading-none flex items-center gap-3">
                        <Terminal size={32} className="text-blue-500" /> Web <span className="text-blue-500">Root</span>
                    </h2>
                    <p className="text-[10px] font-black text-gray-500 uppercase tracking-[0.3em] mt-2 flex items-center gap-2">
                        <Globe size={12}/> Global Application Source Manager
                    </p>
                </div>
                <div className="flex gap-2">
                    <button onClick={() => setIsCreating(true)} className="px-5 py-2.5 bg-blue-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 hover:bg-blue-500 transition shadow-lg shadow-blue-900/40 active:scale-95">
                        <Plus size={16} strokeWidth={3} /> Create File
                    </button>
                    <button onClick={fetchVirtualFiles} className="p-2.5 bg-white/5 rounded-2xl text-gray-500 hover:text-white transition group border border-white/5">
                        <RefreshCw size={18} className={loading ? 'animate-spin' : 'group-active:rotate-180 transition-transform'}/>
                    </button>
                </div>
            </div>

            <div className="flex-1 flex flex-col lg:flex-row gap-5 min-h-0">
                
                {/* SIDEBAR: NAVIGATOR */}
                <div className={`lg:w-80 flex flex-col gap-4 min-h-0 ${activeFile ? 'hidden lg:flex' : 'flex'}`}>
                    <div className="relative group">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-600 group-focus-within:text-blue-400 transition-colors" size={16} />
                        <input 
                            type="text" 
                            placeholder="Find code files..."
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            className="w-full bg-[#0a0a0a] border border-white/10 rounded-2xl pl-11 pr-4 py-3.5 text-xs text-white focus:border-blue-500 outline-none transition-all shadow-inner"
                        />
                    </div>

                    <div className="flex-1 bg-[#0a0a0a] border border-white/5 rounded-[2.5rem] p-3 overflow-y-auto custom-scrollbar shadow-2xl">
                        {loading ? (
                            <div className="py-20 flex justify-center"><Loader size={24}/></div>
                        ) : (
                            <div className="space-y-1.5">
                                <div className="flex items-center gap-2 px-4 py-2 text-gray-600">
                                    <Folder size={14} className="fill-current" />
                                    <span className="text-[10px] font-black uppercase tracking-[0.2em]">Application_Root</span>
                                </div>
                                
                                {filteredFiles.map(file => (
                                    <motion.div 
                                        layout
                                        key={file.id}
                                        onClick={() => setActiveFile(file)}
                                        className={`group flex items-center justify-between p-4 rounded-[1.5rem] cursor-pointer transition-all ${
                                            activeFile?.id === file.id 
                                            ? 'bg-blue-600 text-white shadow-[0_10px_25px_rgba(37,99,235,0.3)] scale-[1.02]' 
                                            : 'hover:bg-white/5 text-gray-400 hover:text-white'
                                        }`}
                                    >
                                        <div className="flex items-center gap-4 min-w-0">
                                            {getIcon(file.type, file.virtual)}
                                            <div className="min-w-0">
                                                <p className="text-xs font-bold truncate leading-none">{file.name}</p>
                                                <p className={`text-[8px] font-mono opacity-40 mt-1 truncate`}>{file.path}</p>
                                            </div>
                                        </div>
                                        {file.virtual && !activeFile?.id?.includes(file.id) && (
                                            <span className="text-[7px] font-black bg-white/10 px-1.5 py-0.5 rounded uppercase tracking-tighter group-hover:bg-white/20 transition-colors">VFS</span>
                                        )}
                                    </motion.div>
                                ))}
                            </div>
                        )}
                    </div>
                    
                    <div className="bg-blue-900/10 border border-blue-500/20 p-5 rounded-[2rem] flex items-start gap-4">
                        <Shield size={20} className="text-blue-500 shrink-0 mt-1" />
                        <p className="text-[9px] text-blue-200/80 leading-relaxed uppercase font-black tracking-tight">
                            Protocol Alpha Enabled: All code changes are validated by the system before deployment. Use caution with JSON configuration.
                        </p>
                    </div>
                </div>

                {/* MAIN: EDITOR */}
                <div className={`flex-1 min-w-0 h-full ${!activeFile ? 'hidden lg:block' : 'block'}`}>
                    <AnimatePresence mode="wait">
                        {activeFile ? (
                            <motion.div 
                                key={activeFile.id}
                                initial={{ opacity: 0, x: 20 }} 
                                animate={{ opacity: 1, x: 0 }} 
                                exit={{ opacity: 0, x: -20 }}
                                className="h-full flex flex-col gap-3"
                            >
                                <div className="flex items-center justify-between px-2">
                                    <button onClick={() => setActiveFile(null)} className="text-[10px] font-black uppercase text-gray-500 flex items-center gap-2 hover:text-white transition-colors group lg:hidden">
                                        <ArrowLeft size={14} className="group-hover:-translate-x-1 transition-transform"/> File List
                                    </button>
                                    <div className="text-[9px] font-bold text-gray-600 uppercase flex items-center gap-2">
                                        <Settings size={12}/> PATH: <span className="text-gray-400 font-mono tracking-wider">{activeFile.path}</span>
                                    </div>
                                    {activeFile.virtual && (
                                        <div className="flex items-center gap-2 text-[9px] font-black text-amber-500 bg-amber-500/10 px-3 py-1 rounded-full border border-amber-500/20">
                                            <ShieldAlert size={12}/> SYSTEM_LOCKED_READ_ONLY
                                        </div>
                                    )}
                                </div>
                                <CodeEditor 
                                    fileName={activeFile.name}
                                    initialValue={activeFile.content}
                                    language={activeFile.type}
                                    onSave={handleSave}
                                />
                            </motion.div>
                        ) : (
                            <div className="h-full flex flex-col items-center justify-center text-center p-12 bg-[#050505] border-2 border-white/5 border-dashed rounded-[3rem] shadow-inner relative overflow-hidden group">
                                <div className="absolute inset-0 bg-blue-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>
                                <div className="w-24 h-24 bg-white/5 rounded-full flex items-center justify-center mb-8 border border-white/10 opacity-30 shadow-2xl relative z-10">
                                    <FileCode size={48} className="text-blue-500" />
                                </div>
                                <h3 className="text-2xl font-black text-gray-500 uppercase tracking-[0.3em] relative z-10">System Terminal</h3>
                                <p className="text-xs text-gray-600 max-w-xs mx-auto mt-4 font-black uppercase tracking-widest leading-relaxed relative z-10">
                                    Identity verified. Select a core node or hosted protocol from the navigator to begin source code manipulation.
                                </p>
                                <button onClick={() => setIsCreating(true)} className="mt-10 px-8 py-3 bg-white/5 hover:bg-white/10 rounded-2xl text-[10px] font-black text-white uppercase tracking-widest border border-white/10 transition-all relative z-10">
                                    Initialize New Node
                                </button>
                            </div>
                        )}
                    </AnimatePresence>
                </div>
            </div>

            {/* CREATE MODAL */}
            <AnimatePresence>
                {isCreating && (
                    <div className="fixed inset-0 z-[300] bg-black/90 backdrop-blur-xl flex items-center justify-center p-6">
                        <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} className="bg-[#0a0a0a] border border-white/10 rounded-[2.5rem] p-10 w-full max-w-md shadow-2xl relative overflow-hidden">
                            <div className="absolute top-0 left-0 w-full h-1 bg-blue-600 opacity-50"></div>
                            <button onClick={() => setIsCreating(false)} className="absolute top-6 right-6 text-gray-600 hover:text-white transition"><X size={24}/></button>
                            
                            <h3 className="text-2xl font-black text-white uppercase tracking-tighter mb-8">New Protocol</h3>
                            
                            <div className="space-y-6">
                                <div>
                                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest block mb-2 ml-1">Identity (Name)</label>
                                    <input 
                                        type="text"
                                        value={newFileName}
                                        onChange={e => setNewFileName(e.target.value)}
                                        className="w-full bg-black border border-white/10 rounded-2xl p-4 text-white focus:border-blue-500 outline-none transition-colors"
                                        placeholder="e.g. promo-landing"
                                    />
                                </div>
                                <div>
                                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest block mb-2 ml-1">Protocol Type</label>
                                    <div className="grid grid-cols-2 gap-3">
                                        <button onClick={() => setNewFileType('html')} className={`py-3 rounded-2xl text-[10px] font-black uppercase transition-all ${newFileType === 'html' ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/40' : 'bg-white/5 text-gray-500 border border-white/5'}`}>HTML SOURCE</button>
                                        <button onClick={() => setNewFileType('json')} className={`py-3 rounded-2xl text-[10px] font-black uppercase transition-all ${newFileType === 'json' ? 'bg-yellow-600 text-white shadow-lg shadow-yellow-900/40' : 'bg-white/5 text-gray-500 border border-white/5'}`}>DATA PACKET</button>
                                    </div>
                                </div>
                                <button onClick={handleCreateFile} className="w-full py-4 bg-white text-black rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-xl hover:scale-[1.02] active:scale-95 transition-all mt-4">
                                    INITIALIZE FILE
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

        </div>
    );
};

export default WebFilesEdit;
