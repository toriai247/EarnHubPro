
import React, { useEffect, useState } from 'react';
import GlassCard from '../../components/GlassCard';
import { supabase } from '../../integrations/supabase/client';
import { Image as ImageIcon, UploadCloud, Trash2, Copy, RefreshCw, Loader2, FileImage, CheckCircle, Settings, Search, AlertTriangle, HardDrive, Cloud, Database } from 'lucide-react';
import { useUI } from '../../context/UIContext';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';

interface StorageFile {
    name: string;
    id: string;
    updated_at: string;
    created_at: string;
    last_accessed_at: string;
    metadata: {
        eTag: string;
        size: number;
        mimetype: string;
        cacheControl: string;
        contentLength: number;
        httpStatusCode: number;
    };
}

interface LocalFile {
    id: string;
    name: string;
    data: string; // Base64
    type: string;
    size: number;
    created_at: string;
}

const ImageManager: React.FC = () => {
    const { toast, confirm } = useUI();
    const [storageMode, setStorageMode] = useState<'cloud' | 'local'>('local'); // Default to Local for direct usage
    
    // Cloud State
    const [cloudFiles, setCloudFiles] = useState<StorageFile[]>([]);
    
    // Local State
    const [localFiles, setLocalFiles] = useState<LocalFile[]>([]);
    
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const [convertFormat, setConvertFormat] = useState<'png' | 'jpeg'>('jpeg'); // Default JPEG for size
    const [searchQuery, setSearchQuery] = useState('');
    const [bucketError, setBucketError] = useState(false);

    useEffect(() => {
        fetchImages();
    }, [storageMode]);

    const fetchImages = async () => {
        setLoading(true);
        
        if (storageMode === 'cloud') {
            setBucketError(false);
            const { data, error } = await supabase.storage.from('site-assets').list('', {
                limit: 100,
                sortBy: { column: 'created_at', order: 'desc' },
            });

            if (error) {
                if (error.message.includes("Bucket not found") || error.message.includes("not found")) {
                    setBucketError(true);
                } else {
                    toast.error("Cloud Error: " + error.message);
                }
                setCloudFiles([]);
            } else {
                setCloudFiles(data as StorageFile[]);
            }
        } else {
            // Local Storage Fetch
            try {
                const stored = localStorage.getItem('eh_local_assets');
                if (stored) {
                    setLocalFiles(JSON.parse(stored));
                } else {
                    setLocalFiles([]);
                }
            } catch (e) {
                console.error("Local storage error", e);
                setLocalFiles([]);
            }
        }
        
        setLoading(false);
    };

    const saveToLocal = (file: LocalFile) => {
        const current = localFiles;
        const updated = [file, ...current];
        // Enforce limit (approx 4MB total usually safe for LS)
        try {
            localStorage.setItem('eh_local_assets', JSON.stringify(updated));
            setLocalFiles(updated);
            toast.success("Saved to Local Storage");
        } catch (e) {
            toast.error("Storage Full! Delete some local images.");
        }
    };

    const convertAndUpload = async (file: File) => {
        return new Promise<void>((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = (event) => {
                const img = new Image();
                img.src = event.target?.result as string;
                img.onload = async () => {
                    const canvas = document.createElement('canvas');
                    
                    // Resize if too big (Max 800px width for optimization)
                    const maxWidth = 800;
                    let width = img.width;
                    let height = img.height;
                    
                    if (width > maxWidth) {
                        height = (maxWidth / width) * height;
                        width = maxWidth;
                    }

                    canvas.width = width;
                    canvas.height = height;
                    const ctx = canvas.getContext('2d');
                    if (!ctx) return reject("Canvas error");

                    // Draw image
                    ctx.drawImage(img, 0, 0, width, height);

                    // Convert
                    const mimeType = `image/${convertFormat}`;
                    const quality = 0.7; // 70% quality for optimization
                    const dataUrl = canvas.toDataURL(mimeType, quality);
                    
                    // Create filename
                    const timestamp = Date.now();
                    const cleanName = file.name.split('.')[0].replace(/[^a-z0-9]/gi, '_').toLowerCase();
                    const fileName = `${cleanName}_${timestamp}.${convertFormat}`;

                    if (storageMode === 'cloud') {
                        // Convert DataURL to Blob for Cloud
                        const res = await fetch(dataUrl);
                        const blob = await res.blob();

                        const { error } = await supabase.storage
                            .from('site-assets')
                            .upload(fileName, blob, {
                                contentType: mimeType,
                                cacheControl: '3600',
                                upsert: false
                            });

                        if (error) {
                            reject(error);
                        } else {
                            toast.success(`Uploaded: ${fileName}`);
                            resolve();
                        }
                    } else {
                        // Save Base64 for Local
                        const newFile: LocalFile = {
                            id: timestamp.toString(),
                            name: fileName,
                            data: dataUrl,
                            type: mimeType,
                            size: Math.round(dataUrl.length * 0.75), // Approx bytes
                            created_at: new Date().toISOString()
                        };
                        saveToLocal(newFile);
                        resolve();
                    }
                };
            };
            reader.onerror = (error) => reject(error);
        });
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || e.target.files.length === 0) return;
        
        setUploading(true);
        const fileList = Array.from(e.target.files) as File[];
        
        try {
            for (const file of fileList) {
                if (!file.type.startsWith('image/')) {
                    toast.error(`Skipped ${file.name}: Not an image.`);
                    continue;
                }
                await convertAndUpload(file);
            }
            if (storageMode === 'cloud') fetchImages(); // Local updates instantly via saveToLocal
        } catch (err: any) {
            console.error(err);
            toast.error(err.message || "Upload Failed");
        } finally {
            setUploading(false);
            e.target.value = '';
        }
    };

    const handleDelete = async (fileId: string, fileName: string) => {
        if (!await confirm("Delete this image permanently?")) return;
        
        if (storageMode === 'cloud') {
            const { error } = await supabase.storage.from('site-assets').remove([fileName]);
            if (error) toast.error(error.message);
            else {
                toast.success("Image deleted");
                setCloudFiles(prev => prev.filter(f => f.name !== fileName));
            }
        } else {
            const updated = localFiles.filter(f => f.id !== fileId);
            localStorage.setItem('eh_local_assets', JSON.stringify(updated));
            setLocalFiles(updated);
            toast.success("Local image deleted");
        }
    };

    const copyUrl = (file: StorageFile | LocalFile) => {
        let url = '';
        if (storageMode === 'cloud') {
            const { data } = supabase.storage.from('site-assets').getPublicUrl(file.name);
            url = data.publicUrl;
        } else {
            // For local, we copy the Data URI (Base64)
            url = (file as LocalFile).data;
        }
        navigator.clipboard.writeText(url);
        toast.success(storageMode === 'cloud' ? "URL Copied" : "Data URI Copied");
    };

    const getPreviewUrl = (file: StorageFile | LocalFile) => {
        if (storageMode === 'cloud') {
            const { data } = supabase.storage.from('site-assets').getPublicUrl(file.name);
            return data.publicUrl;
        } else {
            return (file as LocalFile).data;
        }
    };

    // Derived State
    const activeFiles = storageMode === 'cloud' ? cloudFiles : localFiles;
    const filteredFiles = activeFiles.filter(f => f.name.toLowerCase().includes(searchQuery.toLowerCase()));

    return (
        <div className="space-y-6 animate-fade-in pb-20">
            
            {/* Header with Mode Switcher */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                        <ImageIcon className="text-pink-500" /> Asset Manager
                    </h2>
                    <p className="text-gray-400 text-sm">Manage website graphics and icons.</p>
                </div>
                
                <div className="bg-white/5 p-1 rounded-xl border border-white/10 flex">
                    <button 
                        onClick={() => setStorageMode('local')}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition ${storageMode === 'local' ? 'bg-pink-600 text-white shadow-lg' : 'text-gray-400 hover:text-white'}`}
                    >
                        <HardDrive size={14} /> LOCAL
                    </button>
                    <button 
                        onClick={() => setStorageMode('cloud')}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition ${storageMode === 'cloud' ? 'bg-blue-600 text-white shadow-lg' : 'text-gray-400 hover:text-white'}`}
                    >
                        <Cloud size={14} /> CLOUD
                    </button>
                </div>
            </div>

            {/* Warning for Local Mode */}
            {storageMode === 'local' && (
                <div className="bg-yellow-500/10 border border-yellow-500/20 p-3 rounded-xl flex items-center gap-3 text-xs text-yellow-200">
                    <Database size={16} className="text-yellow-500 shrink-0" />
                    <p>
                        <strong>Local Storage Active:</strong> Images are saved directly in your browser. They load instantly but are only visible on this device. 
                        Ideal for testing or personal admin usage.
                    </p>
                </div>
            )}

            {/* UPLOAD AREA */}
            <GlassCard className={`border-pink-500/20 ${storageMode === 'local' ? 'bg-pink-900/5' : 'bg-blue-900/5'}`}>
                <div className="flex flex-col md:flex-row items-center gap-6">
                    <div className="flex-1 w-full relative group">
                        <input 
                            type="file" 
                            multiple 
                            accept="image/*"
                            onChange={handleFileUpload}
                            disabled={uploading || (storageMode === 'cloud' && bucketError)}
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                        />
                        <div className={`border-2 border-dashed rounded-2xl p-8 flex flex-col items-center justify-center text-center transition bg-black/20 h-40 ${storageMode === 'local' ? 'border-pink-500/30 group-hover:bg-pink-500/10' : 'border-blue-500/30 group-hover:bg-blue-500/10'}`}>
                            {uploading ? (
                                <Loader2 size={40} className={`${storageMode === 'local' ? 'text-pink-500' : 'text-blue-500'} animate-spin mb-2`} />
                            ) : (
                                <UploadCloud size={40} className={`${storageMode === 'local' ? 'text-pink-500' : 'text-blue-500'} mb-2 group-hover:scale-110 transition`} />
                            )}
                            <h3 className="text-white font-bold text-lg">
                                {uploading ? 'Processing...' : `Upload to ${storageMode === 'local' ? 'Browser' : 'Cloud'}`}
                            </h3>
                            <p className="text-gray-400 text-xs mt-1">
                                {storageMode === 'local' ? 'Auto-resized for LocalStorage' : 'Supports PNG, JPG, WEBP'}
                            </p>
                        </div>
                    </div>

                    <div className="w-full md:w-64 space-y-4">
                        <div className="bg-black/40 p-4 rounded-xl border border-white/5">
                            <h4 className="text-xs font-bold text-white uppercase mb-3 flex items-center gap-2">
                                <Settings size={14}/> Optimization
                            </h4>
                            <div className="flex bg-white/5 p-1 rounded-lg">
                                <button 
                                    onClick={() => setConvertFormat('jpeg')}
                                    className={`flex-1 py-1.5 text-xs font-bold rounded-md transition ${convertFormat === 'jpeg' ? 'bg-white text-black shadow' : 'text-gray-400 hover:text-white'}`}
                                >
                                    JPEG (Small)
                                </button>
                                <button 
                                    onClick={() => setConvertFormat('png')}
                                    className={`flex-1 py-1.5 text-xs font-bold rounded-md transition ${convertFormat === 'png' ? 'bg-white text-black shadow' : 'text-gray-400 hover:text-white'}`}
                                >
                                    PNG (HQ)
                                </button>
                            </div>
                            <p className="text-[10px] text-gray-500 mt-2 leading-relaxed">
                                Images are automatically optimized. Use JPEG for photos to save space.
                            </p>
                        </div>
                    </div>
                </div>
            </GlassCard>

            {/* GALLERY FILTER */}
            <div className="relative w-full">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
                <input 
                    type="text" 
                    placeholder={`Search ${activeFiles.length} files...`} 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-black/40 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-sm text-white focus:border-pink-500 outline-none"
                />
            </div>

            {/* GALLERY */}
            {loading ? (
                <div className="p-10"><Loader2 className="animate-spin mx-auto text-pink-500"/></div>
            ) : bucketError && storageMode === 'cloud' ? (
                <div className="text-center py-16 bg-red-500/10 rounded-2xl border border-red-500/20">
                    <AlertTriangle size={40} className="mx-auto mb-3 text-red-500" />
                    <h3 className="text-white font-bold mb-2">Cloud Storage Not Ready</h3>
                    <p className="text-gray-400 text-sm mb-4">The 'site-assets' bucket is missing in Supabase.</p>
                    <Link to="/admin/database_ultra" className="px-6 py-2 bg-red-600 text-white rounded-lg font-bold text-sm hover:bg-red-500 transition">Go to Database Ultra</Link>
                </div>
            ) : filteredFiles.length === 0 ? (
                <div className="text-center py-16 text-gray-500 bg-white/5 rounded-2xl border border-white/5">
                    <FileImage size={40} className="mx-auto mb-3 opacity-30" />
                    <p>No images found in {storageMode} storage.</p>
                </div>
            ) : (
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
                    <AnimatePresence mode="popLayout">
                        {filteredFiles.map((file) => (
                            <motion.div 
                                layout
                                key={file.id} 
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.5 }}
                                className="group relative bg-black/40 border border-white/10 rounded-xl overflow-hidden aspect-square flex flex-col"
                            >
                                <div className="flex-1 relative overflow-hidden bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]">
                                    <img 
                                        src={getPreviewUrl(file)} 
                                        alt={file.name} 
                                        className="w-full h-full object-contain p-2 transition-transform duration-300 group-hover:scale-110" 
                                    />
                                    {/* Overlay Actions */}
                                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                        <button 
                                            onClick={() => copyUrl(file)}
                                            className="p-2 bg-white text-black rounded-lg hover:scale-110 transition shadow-lg"
                                            title="Copy Data/URL"
                                        >
                                            <Copy size={16} />
                                        </button>
                                        <button 
                                            onClick={() => handleDelete(file.id, file.name)}
                                            className="p-2 bg-red-500 text-white rounded-lg hover:scale-110 transition shadow-lg"
                                            title="Delete"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                </div>
                                <div className="p-2 bg-white/5 border-t border-white/5">
                                    <p className="text-[10px] text-white truncate font-mono" title={file.name}>
                                        {file.name}
                                    </p>
                                    <p className="text-[9px] text-gray-500 mt-0.5">
                                        {storageMode === 'local' 
                                            ? `${((file as LocalFile).size / 1024).toFixed(1)} KB (Local)` 
                                            : `${((file as StorageFile).metadata.size / 1024).toFixed(1)} KB (Cloud)`}
                                    </p>
                                </div>
                            </motion.div>
                        ))}
                    </AnimatePresence>
                </div>
            )}
        </div>
    );
};

export default ImageManager;
