
import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '../integrations/supabase/client';
import { PublishedSite } from '../types';
import { Loader2, ArrowLeft, XCircle, ExternalLink } from 'lucide-react';

const SiteViewer: React.FC = () => {
    const { slug } = useParams<{ slug: string }>();
    const [site, setSite] = useState<PublishedSite | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);

    useEffect(() => {
        const fetchSite = async () => {
            if (!slug) return;
            const { data } = await supabase
                .from('published_sites')
                .select('*')
                .eq('slug', slug)
                .eq('is_active', true)
                .maybeSingle();

            if (data) {
                const s = data as PublishedSite;
                setSite(s);
                
                // Update Metadata
                document.title = s.page_title || s.name;
                
                // Note: Changing meta description dynamically might not affect SEO crawlers fully 
                // for SPA, but good for browser behavior.
                let metaDesc = document.querySelector('meta[name="description"]');
                if (!metaDesc) {
                    metaDesc = document.createElement('meta');
                    metaDesc.setAttribute('name', 'description');
                    document.head.appendChild(metaDesc);
                }
                if (s.meta_desc) {
                    metaDesc.setAttribute('content', s.meta_desc);
                }

                // Increment view count (Optimistic)
                const newViews = (data.views || 0) + 1;
                supabase.from('published_sites').update({ views: newViews }).eq('id', data.id).then(() => {});
            } else {
                setError(true);
            }
            setLoading(false);
        };
        fetchSite();

        // Cleanup: Reset title on unmount
        return () => {
            document.title = 'Naxxivo';
        };
    }, [slug]);

    if (loading) {
        return (
            <div className="min-h-screen bg-black flex flex-col items-center justify-center text-white">
                <Loader2 className="animate-spin mb-4 text-blue-500" size={40} />
                <p className="text-sm font-bold uppercase tracking-widest animate-pulse">Connecting to Site...</p>
            </div>
        );
    }

    if (error || !site) {
        return (
            <div className="min-h-screen bg-black flex flex-col items-center justify-center text-center p-6">
                <div className="w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center mb-6">
                    <XCircle size={40} className="text-red-500" />
                </div>
                <h1 className="text-2xl font-bold text-white mb-2">Site Not Found</h1>
                <p className="text-gray-500 mb-8 max-w-xs">The requested URL does not exist or has been disabled.</p>
                <Link to="/" className="px-6 py-3 bg-white text-black font-bold rounded-xl hover:bg-gray-200 transition flex items-center gap-2">
                    <ArrowLeft size={18} /> Return to Naxxivo
                </Link>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 z-[200] bg-black flex flex-col h-[100dvh]">
            {/* Top Bar Overlay */}
            <div className="bg-black/90 backdrop-blur-md border-b border-white/10 px-4 py-2 flex justify-between items-center z-50 h-14 shrink-0 shadow-lg">
                <div className="flex items-center gap-3">
                    <Link to="/" className="p-2 bg-white/10 rounded-lg hover:bg-white/20 text-white transition group" title="Back to Naxxivo">
                        <ArrowLeft size={18} className="group-hover:-translate-x-1 transition-transform" />
                    </Link>
                    <div className="flex flex-col">
                        <span className="font-bold text-white text-sm leading-tight">{site.name}</span>
                        <span className="text-[10px] text-gray-500 leading-tight truncate max-w-[150px]">{site.target_url}</span>
                    </div>
                </div>
                <a href={site.target_url} target="_blank" rel="noreferrer" className="text-xs bg-indigo-600/20 text-indigo-400 hover:bg-indigo-600 hover:text-white px-3 py-1.5 rounded-lg font-bold transition flex items-center gap-1 border border-indigo-500/30">
                    Open Original <ExternalLink size={12}/>
                </a>
            </div>
            
            {/* Iframe Content */}
            <div className="flex-1 w-full relative bg-white">
                <iframe 
                    src={site.target_url} 
                    className="w-full h-full border-0 absolute inset-0"
                    title={site.name}
                    sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-popups-to-escape-sandbox allow-presentation"
                    loading="lazy"
                    allowFullScreen
                />
            </div>
        </div>
    );
};

export default SiteViewer;
