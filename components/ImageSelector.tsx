
import React, { useState, useEffect } from 'react';
import { Image as ImageIcon, Upload, X, Loader2, HardDrive, Cloud, Plus, Check } from 'lucide-react';
import { supabase } from '../integrations/supabase/client';
import { motion, AnimatePresence } from 'framer-motion';
import { useUI } from '../context/UIContext';

interface ImageSelectorProps {
    value: string;
    onChange: (val: string) => void;
    placeholder?: string;
    className?: string;
    label?: string;
}

interface LocalFile {
    id: string;
    name: string;
    data: string;
    created_at: string;
}

const ImageSelector: React.FC<ImageSelectorProps> = ({ value, onChange, placeholder = "https://...", className = "", label }) => {
    const { toast } = useUI();
    const [isOpen, setIsOpen] = useState(false);
    const [mode, setMode] = useState<'local' | 'cloud'>('local');
    const [images, setImages] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [uploading, setUploading] = useState(false);

    useEffect(() => {
        if (isOpen) fetchImages();
    }, [isOpen, mode]);

    const fetchImages = async () => {
        setLoading(true);
        if (mode === 'local') {
            try {
                const stored = localStorage.getItem('eh_local_assets');
                setImages(stored ? JSON.parse(stored) : []);
            } catch (e) {
                setImages([]);
            }
        } else {
            const { data } = await supabase.storage.from('site-assets').list('', {
                limit: 50,
                sortBy: { column: 'created_at', order: 'desc' },
            });
            if (data) setImages(data);
        }
        setLoading(false);
    };

    const processFile = (file: File): Promise<LocalFile> => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = (e) => {
                const img = new Image();
                img.src = e.target?.result as string;
                img.onload = () => {
                    const canvas = document.createElement('canvas');
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
                    ctx?.drawImage(img, 0, 0, width, height);
                    
                    const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
                    
                    resolve({
                        id: Date.now().toString(),
                        name: file.name,
                        data: dataUrl,
                        created_at: new Date().toISOString()
                    });
                };
                img.onerror = reject;
            };
            reader.onerror = reject;
        });
    };

    const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || e.target.files.length === 0) return;
        setUploading(true);
        
        try {
            const file = e.target.files[0];
            
            if (mode === 'local') {
                const newFile = await processFile(file);
                const current = JSON.parse(localStorage.getItem('eh_local_assets') || '[]');
                const updated = [newFile, ...current];
                localStorage.setItem('eh_local_assets', JSON.stringify(updated));
                
                setImages(updated);
                onChange(newFile.data); // Auto select
                toast.success("Image uploaded & selected!");
                setIsOpen(false);
            } else {
                // Cloud Upload
                const fileExt = file.name.split('.').pop();
                const fileName = `${Date.now()}.${fileExt}`;
                const { error } = await supabase.storage.from('site-assets').upload(fileName, file);
                
                if (error) throw error;
                
                const { data } = supabase.storage.from('site-assets').getPublicUrl(fileName);
                onChange(data.publicUrl); // Auto select
                toast.success("Uploaded to Cloud!");
                setIsOpen(false);
            }
        } catch (err: any) {
            toast.error("Upload failed: " + err.message);
        } finally {
            setUploading(false);
        }
    };

    const handleSelect = (img: any) => {
        if (mode === 'local') {
            onChange(img.data);
        } else {
            const { data } = supabase.storage.from('site-assets').getPublicUrl(img.name);
            onChange(data.publicUrl);
        }
        setIsOpen(false);
    };

    return (
        <div className={className}>
            {label && <label className="block text-xs font-bold text-gray-400 mb-1">{label}</label>}
            <div className="flex gap-2">
                <div className="relative flex-1">
                    <div className="absolute left-3 top-1/2 -translate-y-1/2">
                        {value ? (
                            <img src={value} alt="Preview" className="w-5 h-5 rounded object-cover border border-white/20" />
                        ) : (
                            <ImageIcon size={16} className="text-gray-500" />
                        )}
                    </div>
                    <input 
                        type="text" 
                        value={value} 
                        onChange={(e) => onChange(e.target.value)} 
                        className="w-full bg-black/30 border border-white/10 rounded-lg pl-10 pr-3 py-3 text-white text-sm focus:border-blue-500 outline-none"
                        placeholder={placeholder}
                    />
                </div>
                <button 
                    type="button"
                    onClick={() => setIsOpen(true)}
                    className="bg-white/10 hover:bg-white/20 text-white px-3 rounded-lg border border-white/10 transition flex items-center justify-center"
                    title="Select Image"
                >
                    <ImageIcon size={18} />
                </button>
            </div>

            <AnimatePresence>
                {isOpen && (
                    <div className="fixed inset-0 z-[200] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
                        <motion.div 
                            initial={{ scale: 0.9, opacity: 0 }} 
                            animate={{ scale: 1, opacity: 1 }} 
                            exit={{ scale: 0.9, opacity: 0 }}
                            className="bg-[#111] w-full max-w-2xl rounded-2xl border border-white/10 flex flex-col max-h-[80vh] shadow-2xl"
                        >
                            {/* Header */}
                            <div className="p-4 border-b border-white/10 flex justify-between items-center bg-[#151515] rounded-t-2xl">
                                <h3 className="font-bold text-white text-sm flex items-center gap-2">
                                    <ImageIcon size={16} className="text-blue-400"/> Select Image
                                </h3>
                                <button onClick={() => setIsOpen(false)} className="text-gray-500 hover:text-white"><X size={20}/></button>
                            </div>

                            {/* Tabs */}
                            <div className="flex p-2 gap-2 bg-[#0a0a0a]">
                                <button 
                                    onClick={() => setMode('local')}
                                    className={`flex-1 py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition ${mode === 'local' ? 'bg-blue-600 text-white' : 'bg-white/5 text-gray-400 hover:text-white'}`}
                                >
                                    <HardDrive size={14}/> Local Library
                                </button>
                                <button 
                                    onClick={() => setMode('cloud')}
                                    className={`flex-1 py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition ${mode === 'cloud' ? 'bg-blue-600 text-white' : 'bg-white/5 text-gray-400 hover:text-white'}`}
                                >
                                    <Cloud size={14}/> Cloud Storage
                                </button>
                            </div>

                            {/* Gallery */}
                            <div className="flex-1 overflow-y-auto p-4 custom-scrollbar bg-[#050505]">
                                {loading ? (
                                    <div className="py-20 flex justify-center"><Loader2 className="animate-spin text-blue-500"/></div>
                                ) : (
                                    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
                                        {/* Upload Shortcut Card */}
                                        <div className="aspect-square rounded-xl border-2 border-dashed border-white/20 hover:border-blue-500/50 hover:bg-blue-500/10 transition cursor-pointer flex flex-col items-center justify-center group relative overflow-hidden">
                                            <input 
                                                type="file" 
                                                accept="image/*"
                                                onChange={handleUpload}
                                                disabled={uploading}
                                                className="absolute inset-0 opacity-0 z-10 cursor-pointer"
                                            />
                                            {uploading ? (
                                                <Loader2 className="animate-spin text-blue-400" size={24}/>
                                            ) : (
                                                <>
                                                    <Plus size={24} className="text-gray-500 group-hover:text-blue-400 mb-1"/>
                                                    <span className="text-[10px] font-bold text-gray-500 group-hover:text-blue-300">Upload New</span>
                                                </>
                                            )}
                                        </div>

                                        {/* Images */}
                                        {images.map((img, idx) => {
                                            const src = mode === 'local' 
                                                ? img.data 
                                                : supabase.storage.from('site-assets').getPublicUrl(img.name).data.publicUrl;
                                            
                                            const isSelected = value === src;

                                            return (
                                                <div 
                                                    key={img.id || idx} 
                                                    onClick={() => handleSelect(img)}
                                                    className={`aspect-square rounded-xl border relative group cursor-pointer overflow-hidden bg-black/50 ${isSelected ? 'border-blue-500 ring-2 ring-blue-500/20' : 'border-white/10 hover:border-white/30'}`}
                                                >
                                                    <img src={src} alt="Asset" className="w-full h-full object-cover" loading="lazy" />
                                                    {isSelected && (
                                                        <div className="absolute inset-0 bg-blue-500/20 flex items-center justify-center">
                                                            <div className="bg-blue-600 rounded-full p-1"><Check size={12} className="text-white"/></div>
                                                        </div>
                                                    )}
                                                    <div className="absolute bottom-0 left-0 right-0 bg-black/60 p-1 translate-y-full group-hover:translate-y-0 transition-transform">
                                                        <p className="text-[8px] text-white truncate text-center">{img.name}</p>
                                                    </div>
                                                </div>
                                            )
                                        })}
                                    </div>
                                )}
                                {!loading && images.length === 0 && (
                                    <div className="text-center py-10 text-gray-500 text-xs">
                                        No images found. Upload one to get started.
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default ImageSelector;
