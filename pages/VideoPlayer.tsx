
import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { supabase } from '../integrations/supabase/client';
import { VideoAd, UserProfile } from '../types';
import GlassCard from '../components/GlassCard';
import { 
    ArrowLeft, Play, Pause, CheckCircle2, 
    Clock, DollarSign, Share2, Maximize, Minimize, 
    AlertCircle, Flag, Heart, Loader2, Zap, User as UserIcon, 
    Volume2, VolumeX, ExternalLink, RefreshCw, Tv, Eye, ThumbsUp, MoreVertical,
    BadgeCheck, Activity
} from 'lucide-react';
import { useUI } from '../context/UIContext';
import BalanceDisplay from '../components/BalanceDisplay';
import { motion, AnimatePresence } from 'framer-motion';
import { updateWallet, createTransaction } from '../lib/actions';
import Loader from '../components/Loader';
import GoogleAd from '../components/GoogleAd';

const VideoPlayer: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { toast } = useUI();
    
    // Data State
    const [video, setVideo] = useState<any | null>(null);
    const [suggestions, setSuggestions] = useState<VideoAd[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    
    // Player Logic State
    const [isPlaying, setIsPlaying] = useState(false);
    const [isBuffering, setIsBuffering] = useState(false);
    const [watchedSeconds, setWatchedSeconds] = useState(0); 
    const [requiredSeconds, setRequiredSeconds] = useState(30); 
    const [duration, setDuration] = useState(0); 
    const [isMuted, setIsMuted] = useState(false);
    
    const [hasClaimedToday, setHasClaimedToday] = useState(false);
    const [canClaim, setCanClaim] = useState(false);
    const [claiming, setClaiming] = useState(false);
    
    // Social Simulation
    const [likes, setLikes] = useState(0);
    const [views, setViews] = useState(0);
    const [hasLiked, setHasLiked] = useState(false);

    // UI State
    const [cinemaMode, setCinemaMode] = useState(false);
    const [iframeInteracted, setIframeInteracted] = useState(false);
    const [iframeKey, setIframeKey] = useState(0); 
    
    // Refs
    const videoRef = useRef<HTMLVideoElement>(null);
    const lastTimeRef = useRef<number>(0);
    const timerRef = useRef<any>(null);

    useEffect(() => {
        if (!id) return;
        fetchVideoDetails();
        // Reset state for new video
        setIframeInteracted(false);
        setWatchedSeconds(0);
        setCanClaim(false);
        return () => {
            stopIframeTimer();
            setIsPlaying(false);
        };
    }, [id]);

    useEffect(() => {
        const handleVisibilityChange = () => {
            if (document.hidden) {
                if (videoRef.current) {
                    videoRef.current.pause();
                    setIsPlaying(false);
                }
                if (timerRef.current) {
                    stopIframeTimer();
                }
            }
        };
        document.addEventListener('visibilitychange', handleVisibilityChange);
        return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
    }, []);

    const fetchVideoDetails = async () => {
        setLoading(true);
        setError(null);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) { navigate('/login'); return; }

            const { data: adData, error: adError } = await supabase.from('video_ads').select('*').eq('id', id).single();
            if (adError) throw adError;
            if (!adData) throw new Error("Video not found.");

            const { data: creatorProfile } = await supabase.from('profiles').select('name_1, avatar_1, level_1, is_dealer, user_uid').eq('id', adData.creator_id).single();
            const ad = { ...adData, profiles: creatorProfile };

            const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
            const { data: claims } = await supabase.from('transactions').select('description').eq('user_id', session.user.id).eq('type', 'earn').gte('created_at', oneDayAgo);

            const claimDescriptions = (claims || []).map((c: any) => (c.description || '').toLowerCase());
            
            /* fix: logic cleanup - isClaimed depends on whether the current video was already claimed */
            const isClaimed = claimDescriptions.some((desc: string) => desc.includes((ad.title || '').toLowerCase()));
            
            setVideo(ad);
            setHasClaimedToday(isClaimed);
            setRequiredSeconds(Math.max(10, Math.min(ad.duration, 60)));
            setWatchedSeconds(isClaimed ? Math.max(10, Math.min(ad.duration, 60)) : 0);
            
            // Mock stats
            setLikes(Math.floor(Math.random() * 500) + 50);
            setViews(Math.floor(Math.random() * 10000) + 1200);

            const { data: sugg } = await supabase.from('video_ads').select('*').neq('id', id).eq('status', 'active').limit(6);
            if(sugg) setSuggestions(sugg as any);

        } catch (e: any) {
            console.error("Video Page Error:", e);
            setError(e.message || "Network Timeout");
        } finally {
            setLoading(false);
        }
    };

    const handleTimeUpdate = () => {
        if (!videoRef.current || hasClaimedToday || canClaim) return;
        const currentTime = videoRef.current.currentTime;
        const diff = currentTime - lastTimeRef.current;
        if (diff > 2) { videoRef.current.currentTime = lastTimeRef.current; toast.error("Seek disabled during earning."); return; }
        if (diff > 0) {
            setWatchedSeconds(prev => {
                const newVal = prev + diff;
                if (newVal >= requiredSeconds) { setCanClaim(true); return requiredSeconds; }
                return newVal;
            });
        }
        lastTimeRef.current = currentTime;
    };

    const togglePlay = () => {
        if (videoRef.current) {
            if (videoRef.current.paused) { videoRef.current.play().catch(e => {}); setIsPlaying(true); }
            else { videoRef.current.pause(); setIsPlaying(false); }
        }
    };

    const startIframeTimer = () => {
        if (hasClaimedToday || canClaim) return;
        setIframeInteracted(true);
        setIsPlaying(true); 
        stopIframeTimer();
        timerRef.current = setInterval(() => {
            setWatchedSeconds(prev => {
                if (prev >= requiredSeconds) { stopIframeTimer(); setCanClaim(true); return requiredSeconds; }
                return prev + 1;
            });
        }, 1000);
    };

    const stopIframeTimer = () => { if (timerRef.current) clearInterval(timerRef.current); setIsPlaying(false); };

    const handleClaim = async () => {
        if (!canClaim || hasClaimedToday) return;
        setClaiming(true);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) throw new Error("No session");
            await updateWallet(session.user.id, video.cost_per_view, 'increment', 'earning_balance');
            await createTransaction(session.user.id, 'earn', video.cost_per_view, `Video Reward: ${video.title}`);
            await supabase.from('video_ads').update({ remaining_budget: Math.max(0, video.remaining_budget - video.cost_per_view) }).eq('id', video.id);
            toast.success(`Reward Authorized: +৳${video.cost_per_view.toFixed(2)}`);
            setHasClaimedToday(true);
            setCanClaim(false);
            window.dispatchEvent(new Event('wallet_updated'));
        } catch (e: any) { toast.error(e.message); } finally { setClaiming(false); }
    };

    const getEmbedUrl = (url: string) => {
        const ytMatch = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|shorts\/))([\w-]{11})/);
        if (ytMatch) return `https://www.youtube.com/embed/${ytMatch[1]}?autoplay=1&modestbranding=1&rel=0&playsinline=1&controls=1`;
        return url;
    };

    if (loading) return <div className="min-h-screen bg-void flex items-center justify-center"><Loader /></div>;

    const progressPercent = Math.min(100, (watchedSeconds / requiredSeconds) * 100);

    return (
        <div className={`min-h-screen bg-void text-main flex flex-col ${cinemaMode ? 'z-[100] fixed inset-0' : 'pb-32'}`}>
            
            {/* Header */}
            {!cinemaMode && (
                <div className="bg-void/80 backdrop-blur-md border-b border-border-base px-4 py-3 flex items-center justify-between sticky top-0 z-50">
                    <div className="flex items-center gap-3">
                        <button onClick={() => navigate('/video')} className="p-2.5 bg-panel rounded-2xl hover:bg-white/10 transition text-white border border-border-base">
                            <ArrowLeft size={18} />
                        </button>
                        <div className="hidden sm:block">
                            <h2 className="text-sm font-black uppercase tracking-tighter line-clamp-1">{video.title}</h2>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                         <div className="bg-success/10 border border-success/20 px-4 py-1.5 rounded-2xl text-success font-black font-mono text-xs shadow-glow">
                             +<BalanceDisplay amount={video.cost_per_view}/>
                         </div>
                    </div>
                </div>
            )}

            <div className={`flex-1 flex flex-col ${cinemaMode ? 'justify-center bg-black' : ''}`}>
                
                {/* VIDEO ENGINE */}
                <div className={`relative w-full bg-black group ${cinemaMode ? 'h-full' : 'aspect-video shadow-2xl overflow-hidden'}`}>
                    
                    {video.video_url?.match(/\.(mp4|webm|ogg|mov)(\?.*)?$/i) ? (
                        <video 
                            ref={videoRef} src={video.video_url} className="w-full h-full object-contain cursor-pointer" 
                            onClick={togglePlay} playsInline onTimeUpdate={handleTimeUpdate}
                            onLoadedMetadata={() => setDuration(videoRef.current?.duration || 0)}
                            onWaiting={() => setIsBuffering(true)} onPlaying={() => { setIsBuffering(false); setIsPlaying(true); }}
                            onPause={() => setIsPlaying(false)}
                        />
                    ) : (
                        <div className="relative w-full h-full bg-black">
                            {!iframeInteracted ? (
                                <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-black/80 backdrop-blur-sm cursor-pointer group" onClick={startIframeTimer}>
                                    <div className="w-20 h-20 bg-brand text-black rounded-full flex items-center justify-center mb-4 shadow-[0_0_30px_rgba(var(--color-brand),0.4)] animate-pulse group-hover:scale-110 transition">
                                        <Play size={36} fill="black" className="ml-1" />
                                    </div>
                                    <p className="text-white font-black uppercase tracking-[0.3em] text-xs">Initialize Stream</p>
                                </div>
                            ) : null}
                            {iframeInteracted && <iframe key={iframeKey} src={getEmbedUrl(video.video_url)} className="w-full h-full" frameBorder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowFullScreen title={video.title} sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-popups-to-escape-sandbox allow-presentation"></iframe>}
                        </div>
                    )}

                    {/* OVERLAYS */}
                    <div className="absolute top-4 right-4 z-50 flex gap-2">
                        <button onClick={() => setCinemaMode(!cinemaMode)} className="p-2.5 bg-black/60 text-white rounded-2xl backdrop-blur-md border border-white/10 hover:bg-black/80 transition shadow-lg">
                            {cinemaMode ? <Minimize size={20} /> : <Maximize size={20} />}
                        </button>
                    </div>

                    {isBuffering && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 z-30 backdrop-blur-sm">
                            <Loader2 className="animate-spin text-brand mb-2" size={40} />
                            <p className="text-[10px] font-black text-brand uppercase tracking-[0.3em]">Buffering Data...</p>
                        </div>
                    )}

                    {/* DYNAMIC PROGRESS BAR */}
                    <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-white/10 z-40">
                        <motion.div 
                            className={`h-full relative ${hasClaimedToday ? 'bg-success' : 'bg-brand'}`}
                            style={{ width: `${progressPercent}%` }}
                            animate={{ width: `${progressPercent}%` }}
                            transition={{ ease: "linear" }}
                        >
                            {progressPercent < 100 && <div className="absolute right-0 top-1/2 -translate-y-1/2 w-4 h-4 bg-white rounded-full shadow-[0_0_15px_white]"></div>}
                        </motion.div>
                    </div>

                    {/* CLAIM HUB */}
                    <AnimatePresence>
                        {canClaim && !hasClaimedToday && (
                            <motion.div initial={{ y: 50, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="absolute bottom-10 left-1/2 -translate-x-1/2 z-50">
                                <button 
                                    onClick={handleClaim} disabled={claiming}
                                    className="px-10 py-4 bg-brand hover:bg-white text-black font-black text-sm uppercase tracking-[0.2em] rounded-full shadow-[0_0_40px_rgba(250,204,21,0.5)] flex items-center gap-3 transition-all hover:scale-105 active:scale-95 animate-bounce-subtle"
                                >
                                    {claiming ? <Loader2 className="animate-spin" size={20}/> : <Zap size={20} fill="black" />} CLAIM ৳{video.cost_per_view}
                                </button>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                {/* INFO PANEL */}
                {!cinemaMode && (
                    <div className="flex-1 overflow-y-auto custom-scrollbar">
                        <div className="p-5 space-y-8 max-w-4xl mx-auto">
                            
                            {/* Title & Engagement */}
                            <div className="space-y-4">
                                <h1 className="text-2xl font-black text-white uppercase tracking-tighter leading-tight">{video.title}</h1>
                                <div className="flex flex-wrap items-center justify-between gap-4">
                                    <div className="flex items-center gap-6">
                                        <div className="flex items-center gap-2 text-gray-400">
                                            <Eye size={18} />
                                            <span className="text-xs font-black font-mono">{views.toLocaleString()}</span>
                                        </div>
                                        <button onClick={() => {setHasLiked(!hasLiked); setLikes(l => hasLiked ? l-1 : l+1)}} className={`flex items-center gap-2 transition ${hasLiked ? 'text-brand' : 'text-gray-400 hover:text-white'}`}>
                                            <ThumbsUp size={18} fill={hasLiked ? "currentColor" : "none"} />
                                            <span className="text-xs font-black font-mono">{likes.toLocaleString()}</span>
                                        </button>
                                        <button className="text-gray-400 hover:text-white transition"><Share2 size={18} /></button>
                                    </div>
                                    <div className={`px-4 py-1 rounded-2xl border text-[10px] font-black uppercase flex items-center gap-2 ${hasClaimedToday ? 'bg-success/10 border-success/30 text-success' : 'bg-brand/10 border-brand/30 text-brand shadow-glow'}`}>
                                        {hasClaimedToday ? <><CheckCircle2 size={12}/> Protocol Success</> : <><RefreshCw size={12} className="animate-spin"/> Synchronizing: {Math.round(watchedSeconds)}s</>}
                                    </div>
                                </div>
                            </div>

                            {/* CREATOR PROFILE SECTION */}
                            <GlassCard className="!p-5 !rounded-[2.5rem] bg-panel border-white/5 flex items-center justify-between group">
                                <Link to={`/u/${video.profiles?.user_uid}`} className="flex items-center gap-4 flex-1">
                                    <div className="relative">
                                        <div className="w-14 h-14 rounded-3xl bg-black border-2 border-white/10 overflow-hidden shadow-2xl transition-transform group-hover:scale-105">
                                            {video.profiles?.avatar_1 ? <img src={video.profiles.avatar_1} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center bg-gray-800 text-gray-500"><UserIcon size={24}/></div>}
                                        </div>
                                        {video.profiles?.is_dealer && <div className="absolute -bottom-1 -right-1 bg-brand text-black p-1 rounded-lg border-2 border-panel"><Zap size={10} fill="black" /></div>}
                                    </div>
                                    <div>
                                        <h4 className="font-black text-white text-lg uppercase tracking-tighter flex items-center gap-2">
                                            {video.profiles?.name_1 || 'Institutional Node'}
                                            {/* fix: added BadgeCheck and Activity to lucide-react imports */}
                                            {video.profiles?.is_dealer && <BadgeCheck size={14} className="text-blue-400" fill="black" />}
                                        </h4>
                                        <p className="text-[10px] text-muted font-bold uppercase tracking-widest mt-1">Verified Node • {video.profiles?.user_uid}</p>
                                    </div>
                                </Link>
                                <button className="px-6 py-2.5 bg-white/5 border border-white/10 rounded-2xl text-[10px] font-black text-white uppercase tracking-widest hover:bg-white hover:text-black transition active:scale-95">Subscribe</button>
                            </GlassCard>

                            {/* AD BREAK */}
                            <GoogleAd slot="4491147378" className="rounded-[2.5rem] border border-border-base overflow-hidden" />

                            {/* REFINED SUGGESTIONS GRID */}
                            <div className="space-y-6 pt-4">
                                <div className="flex items-center justify-between">
                                    <h3 className="text-xs font-black text-muted uppercase tracking-[0.4em] flex items-center gap-2">
                                        <Activity size={14} className="text-brand" /> Trending Streams
                                    </h3>
                                    <button onClick={fetchVideoDetails} className="p-2 text-gray-500 hover:text-white transition"><RefreshCw size={14}/></button>
                                </div>
                                
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    {suggestions.map((sug) => (
                                        <Link to={`/video/watch/${sug.id}`} key={sug.id} className="group relative bg-panel border border-border-base rounded-[2rem] overflow-hidden hover:border-brand/40 transition-all duration-500 hover:shadow-2xl">
                                            <div className="aspect-video relative overflow-hidden">
                                                <img src={sug.thumbnail_url || `https://via.placeholder.com/640x360`} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 group-hover:scale-105 transition-all duration-700" />
                                                <div className="absolute bottom-3 right-3 bg-black/90 backdrop-blur-md px-2 py-1 rounded-lg text-[10px] font-black text-white font-mono border border-white/10">
                                                    {sug.duration}s
                                                </div>
                                                <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent opacity-60"></div>
                                                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-20">
                                                    <div className="w-12 h-12 bg-brand text-black rounded-full flex items-center justify-center shadow-glow">
                                                        <Play size={24} fill="black" className="ml-1" />
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="p-5 space-y-4">
                                                <h4 className="text-sm font-black text-white line-clamp-2 uppercase tracking-tight group-hover:text-brand transition-colors">{sug.title}</h4>
                                                <div className="flex items-center justify-between">
                                                    <div className="bg-brand/10 border border-brand/20 px-3 py-1 rounded-full text-brand font-black font-mono text-[10px]">
                                                        +৳{sug.cost_per_view.toFixed(2)}
                                                    </div>
                                                    <div className="text-[9px] text-gray-600 font-bold uppercase tracking-widest flex items-center gap-1">
                                                        <span className="shrink-0"><Eye size={10}/></span> {Math.floor(Math.random()*5000)} views
                                                    </div>
                                                </div>
                                            </div>
                                        </Link>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
            <style>{`
                .shadow-glow { box-shadow: 0 0 20px rgba(var(--color-brand), 0.2); }
                .animate-bounce-subtle { animation: bounce 2s infinite; }
                @keyframes bounce { 0%, 100% { transform: translate(-50%, 0); } 50% { transform: translate(-50%, -10px); } }
            `}</style>
        </div>
    );
};

export default VideoPlayer;
