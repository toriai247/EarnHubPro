
import React, { useEffect, useState } from 'react';
import GlassCard from '../../../components/GlassCard';
import { supabaseAdmin } from '../../../integrations/supabase/admin-client';
import { Cloud, Folder, File, Trash2, Download, Plus, RefreshCw, Loader2, HardDrive, Eye } from 'lucide-react';
import { useUI } from '../../../context/UIContext';

interface Bucket {
    id: string;
    name: string;
    public: boolean;
    created_at: string;
}

interface FileObject {
    name: string;
    id: string | null;
    updated_at: string;
    created_at: string;
    last_accessed_at: string;
    metadata: any;
}

const StorageManager: React.FC = () => {
    const { toast, confirm } = useUI();
    const [buckets, setBuckets] = useState<Bucket[]>([]);
    const [selectedBucket, setSelectedBucket] = useState<string | null>(null);
    const [files, setFiles] = useState<FileObject[]>([]);
    const [loading, setLoading] = useState(false);
    const [newBucketName, setNewBucketName] = useState('');
    const [isCreating, setIsCreating] = useState(false);

    useEffect(() => {
        fetchBuckets();
    }, []);

    useEffect(() => {
        if (selectedBucket) {
            fetchFiles(selectedBucket);
        } else {
            setFiles([]);
        }
    }, [selectedBucket]);

    const fetchBuckets = async () => {
        setLoading(true);
        const { data, error } = await supabaseAdmin.storage.listBuckets();
        if (error) toast.error("Failed to list buckets: " + error.message);
        else setBuckets(data || []);
        setLoading(false);
    };

    const fetchFiles = async (bucketName: string) => {
        setLoading(true);
        const { data, error } = await supabaseAdmin.storage.from(bucketName).list();
        if (error) toast.error("Failed to list files");
        else setFiles(data || []);
        setLoading(false);
    };

    const handleCreateBucket = async () => {
        if (!newBucketName) return;
        setIsCreating(true);
        const { error } = await supabaseAdmin.storage.createBucket(newBucketName, { public: true });
        if (error) toast.error(error.message);
        else {
            toast.success("Bucket created");
            setNewBucketName('');
            fetchBuckets();
        }
        setIsCreating(false);
    };

    const handleDeleteBucket = async (id: string) => {
        if (!await confirm("Delete bucket? It must be empty first.")) return;
        const { error } = await supabaseAdmin.storage.deleteBucket(id);
        if (error) toast.error(error.message);
        else {
            toast.success("Bucket deleted");
            if (selectedBucket === id) setSelectedBucket(null);
            fetchBuckets();
        }
    };

    const handleDeleteFile = async (fileName: string) => {
        if (!selectedBucket) return;
        if (!await confirm(`Delete ${fileName}?`)) return;
        
        const { error } = await supabaseAdmin.storage.from(selectedBucket).remove([fileName]);
        if (error) toast.error(error.message);
        else {
            toast.success("File deleted");
            fetchFiles(selectedBucket);
        }
    };

    const getFileUrl = (fileName: string) => {
        if (!selectedBucket) return '';
        const { data } = supabaseAdmin.storage.from(selectedBucket).getPublicUrl(fileName);
        return data.publicUrl;
    };

    return (
        <div className="space-y-6 animate-fade-in pb-20">
            <header className="flex justify-between items-end">
                <div>
                    <h2 className="text-3xl font-black text-white flex items-center gap-3">
                        <Cloud size={32} className="text-purple-400" /> Storage Cloud
                    </h2>
                    <p className="text-gray-400 text-sm mt-1">Manage buckets and assets.</p>
                </div>
                <div className="flex gap-2">
                    <input 
                        type="text" 
                        value={newBucketName}
                        onChange={e => setNewBucketName(e.target.value)}
                        placeholder="New Bucket Name"
                        className="bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-sm text-white focus:border-purple-500 outline-none"
                    />
                    <button 
                        onClick={handleCreateBucket}
                        disabled={isCreating}
                        className="bg-purple-600 hover:bg-purple-500 text-white px-3 py-1.5 rounded-lg text-xs font-bold"
                    >
                        {isCreating ? <Loader2 className="animate-spin" size={16}/> : <Plus size={16}/>}
                    </button>
                </div>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 h-[70vh]">
                
                {/* BUCKET LIST */}
                <div className="md:col-span-1 bg-[#111] border border-white/10 rounded-2xl p-4 flex flex-col">
                    <h3 className="text-xs font-bold text-gray-500 uppercase mb-4 tracking-widest px-2">Buckets</h3>
                    <div className="flex-1 overflow-y-auto space-y-2 custom-scrollbar">
                        {buckets.map(b => (
                            <div 
                                key={b.id}
                                onClick={() => setSelectedBucket(b.id)}
                                className={`p-3 rounded-xl cursor-pointer transition flex justify-between items-center group ${selectedBucket === b.id ? 'bg-purple-500/20 border border-purple-500/50 text-white' : 'bg-white/5 border border-white/5 text-gray-400 hover:bg-white/10'}`}
                            >
                                <div className="flex items-center gap-2 overflow-hidden">
                                    <Folder size={18} className={selectedBucket === b.id ? 'text-purple-400' : 'text-gray-500'} />
                                    <span className="truncate text-sm font-bold">{b.name}</span>
                                </div>
                                <button 
                                    onClick={(e) => { e.stopPropagation(); handleDeleteBucket(b.id); }}
                                    className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-white p-1"
                                >
                                    <Trash2 size={14} />
                                </button>
                            </div>
                        ))}
                    </div>
                </div>

                {/* FILE BROWSER */}
                <div className="md:col-span-3 bg-black/40 border border-white/10 rounded-2xl flex flex-col overflow-hidden">
                    <div className="p-4 bg-white/5 border-b border-white/10 flex justify-between items-center">
                        <h3 className="font-bold text-white flex items-center gap-2">
                            {selectedBucket ? <><HardDrive size={18} className="text-purple-400"/> {selectedBucket}</> : 'Select a Bucket'}
                        </h3>
                        {selectedBucket && (
                            <button onClick={() => fetchFiles(selectedBucket)} className="p-1.5 bg-white/5 rounded text-gray-400 hover:text-white">
                                <RefreshCw size={16} className={loading ? 'animate-spin' : ''}/>
                            </button>
                        )}
                    </div>

                    <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                        {loading && files.length === 0 ? (
                             <div className="h-full flex items-center justify-center"><Loader2 className="animate-spin text-purple-500"/></div>
                        ) : !selectedBucket ? (
                            <div className="h-full flex items-center justify-center text-gray-500 text-sm">Select a bucket to view files.</div>
                        ) : files.length === 0 ? (
                            <div className="h-full flex items-center justify-center text-gray-500 text-sm">Bucket is empty.</div>
                        ) : (
                            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                                {files.map((file, idx) => (
                                    <div key={idx} className="bg-[#151515] border border-white/5 rounded-xl p-3 hover:border-purple-500/30 transition group">
                                        <div className="aspect-square bg-black/50 rounded-lg mb-2 flex items-center justify-center relative overflow-hidden">
                                            {file.metadata?.mimetype?.startsWith('image/') ? (
                                                <img src={getFileUrl(file.name)} alt={file.name} className="w-full h-full object-cover" />
                                            ) : (
                                                <File size={32} className="text-gray-600" />
                                            )}
                                            
                                            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition flex items-center justify-center gap-2">
                                                <a href={getFileUrl(file.name)} target="_blank" className="p-2 bg-white text-black rounded-lg hover:scale-110 transition"><Eye size={16}/></a>
                                                <button onClick={() => handleDeleteFile(file.name)} className="p-2 bg-red-500 text-white rounded-lg hover:scale-110 transition"><Trash2 size={16}/></button>
                                            </div>
                                        </div>
                                        <p className="text-xs text-white truncate font-medium" title={file.name}>{file.name}</p>
                                        <p className="text-[10px] text-gray-500 mt-0.5">{(file.metadata?.size / 1024).toFixed(1)} KB</p>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default StorageManager;
