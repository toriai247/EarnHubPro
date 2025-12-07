
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
                setSite(data as PublishedSite);
                // Increment view count
                supabase.rpc('increment_site_view', { site_id: data.id }).catch(() => {
                    // Fallback if RPC doesn't exist
                    supabase.from('published_sites').update({ views: (data.views || 0) + 1 }).eq('id', data.id);
                });
            } else {
                setError(true);
            }
            setLoading(false);
        };
        fetchSite();
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
        <div className="fixed inset-0 z-[200] bg-black flex flex-col">
            {/* Top Bar Overlay */}
            <div className="bg-black/80 backdrop-blur-md border-b border-white/10 px-4 py-2 flex justify-between items-center z-50">
                <div className="flex items-center gap-3">
                    <Link to="/" className="p-2 bg-white/10 rounded-lg hover:bg-white/20 text-white transition">
                        <ArrowLeft size={18} />
                    </Link>
                    <span className="font-bold text-white text-sm">{site.name}</span>
                </div>
                <a href={site.target_url} target="_blank" rel="noreferrer" className="text-xs text-gray-400 hover:text-white flex items-center gap-1">
                    Open Original <ExternalLink size={12}/>
                </a>
            </div>
            
            {/* Iframe Content */}
            <iframe 
                src={site.target_url} 
                className="flex-1 w-full h-full border-0 bg-white"
                title={site.name}
                sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-popups-to-escape-sandbox"
            />
        </div>
    );
};

export default SiteViewer;
