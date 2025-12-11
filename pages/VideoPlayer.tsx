import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { supabase } from '../integrations/supabase/client';
import { VideoAd } from '../types';
import GlassCard from '../components/GlassCard';
import { 
    ArrowLeft, Play, Pause, CheckCircle2, 
    Clock, DollarSign, Share2, Maximize, Minimize, 
    AlertCircle, Flag, Heart, Loader2, Zap, User as UserIcon, Volume2, VolumeX
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
    
    // UI State
    const [cinemaMode, setCinemaMode] = useState(false);
    const [iframeInteracted, setIframeInteracted] = useState(false);
    
    // Refs
    const videoRef = useRef<HTMLVideoElement>(null);
    const lastTimeRef = useRef<number>(0);
    const timerRef = useRef<any>(null); // Fallback for iframes

    // Initial Load
    useEffect(() => {
        if (!id) return;
        fetchVideoDetails();
        return () => {
            stopIframeTimer();
            setWatchedSeconds(0);
            setIsPlaying(false);
            setIframeInteracted(false);
        };
    }, [id]);

    // Visibility API - Pause if tab hidden
    useEffect(() => {
        const handleVisibilityChange = () => {
            if (document.hidden) {
                if (videoRef.current) videoRef.current.pause();
                setIsPlaying(false);
                stopIframeTimer();
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
            
            if (!session) {
                navigate('/login');
                return;
            }

            // 1. Fetch Video
            const { data: adData, error: adError } = await supabase
                .from('video_ads')
                .select('*')
                .eq('id', id)
                .single();

            if (adError) throw adError;
            if (!adData) throw new Error("Video not found or removed.");

            // Manual Fetch Creator Profile
            const { data: creatorProfile } = await supabase
                .from('profiles')
                .select('name_1, avatar_1, level_1, is_dealer')
                .eq('id', adData.creator_id)
                .single();
            
            const ad = { ...adData, profiles: creatorProfile };

            // 2. Check Claim Status
            const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
            const { data: claims } = await supabase
                .from('transactions')
                .select('description')
                .eq('user_id', session.user.id)
                .eq('type', 'earn')
                .gte('created_at', oneDayAgo);

            // Fuzzy match title in transactions
            const isClaimed = (claims || []).some((c: any) => 
                c.description && c.description.toLowerCase().includes(ad.title.toLowerCase())
            );
            
            setVideo(ad);
            setHasClaimedToday(isClaimed);
            
            // Set Target Time
            const target = Math.max(10, Math.min(ad.duration, 60)); 
            setRequiredSeconds(target);
            
            if (isClaimed) {
                setWatchedSeconds(target); // Show full bar
                setCanClaim(false);
            } else {
                setWatchedSeconds(0);
            }
            
            // 3. Fetch Suggestions
            const { data: sugg } = await supabase
                .from('video_ads')
                .select('*')
                .neq('id', id)
                .eq('status', 'active')
                .limit(4);
            
            if(sugg) setSuggestions(sugg as any);

        } catch (e: any) {
            console.error("VideoPlayer Error:", e);
            setError(e.message || "Failed to load video.");
        } finally {
            setLoading(false);
        }
    };

    // --- ANTI-CHEAT: NATIVE VIDEO TRACKING ---
    const handleTimeUpdate = () => {
        if (!videoRef.current || hasClaimedToday || canClaim) return;

        const currentTime = videoRef.current.currentTime;
        const diff = currentTime - lastTimeRef.current;

        // Anti-Cheat: Only count if playback is continuous (no seeking)
        if (diff > 1.5) {
            videoRef.current.currentTime = lastTimeRef.current; // Revert seek
            toast.error("Seeking is locked.");
            return;
        }

        if (diff > 0 && isPlaying) {
            setWatchedSeconds(prev => {
                const newVal = prev + diff;
                if (newVal >= requiredSeconds) {
                    setCanClaim(true);
                    return requiredSeconds;
                }
                return newVal;
            });
        }
        
        lastTimeRef.current = currentTime;
    };

    const handleLoadedMetadata = () => {
        if (videoRef.current) {
            setDuration(videoRef.current.duration);
        }
    };

    const togglePlay = () => {
        if (videoRef.current) {
            if (isPlaying) {
                videoRef.current.pause();
                setIsPlaying(false);
            } else {
                videoRef.current.play();
                setIsPlaying(true);
            }
        }
    };

    const toggleMute = () => {
        if (videoRef.current) {
            videoRef.current.muted = !isMuted;
            setIsMuted(!isMuted);
        }
    };

    const handleWaiting = () => {
        setIsBuffering(true);
        setIsPlaying(false); 
    };

    const handlePlaying = () => {
        setIsBuffering(false);
        setIsPlaying(true);
        lastTimeRef.current = videoRef.current?.currentTime || 0;
    };

    const handlePause = () => {
        setIsPlaying(false);
    };

    // --- FALLBACK: IFRAME TIMER ---
    const startIframeTimer = () => {
        if (hasClaimedToday || canClaim) return;
        setIframeInteracted(true);
        setIsPlaying(true);
        
        stopIframeTimer();
        timerRef.current = setInterval(() => {
            setWatchedSeconds(prev => {
                if (prev >= requiredSeconds) {
                    stopIframeTimer();
                    setCanClaim(true);
                    return requiredSeconds;
                }
                return prev + 1;
            });
        }, 1000);
    };

    const stopIframeTimer = () => {
        if (timerRef.current) clearInterval(timerRef.current);
        setIsPlaying(false);
    };

    // --- CLAIM REWARD ---
    const handleClaim = async () => {
        if (!canClaim || hasClaimedToday) return;
        setClaiming(true);

        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) throw new Error("No session");

            // Fallback for missing RPC
            await updateWallet(session.user.id, video.cost_per_view, 'increment', 'earning_balance');
            await createTransaction(
                session.user.id, 
                'earn', 
                video.cost_per_view, 
                `Video Reward: ${video.title}`
            );
            await supabase.from('video_ads').update({ 
                remaining_budget: Math.max(0, video.remaining_budget - video.cost_per_view)
            }).eq('id', video.id);

            toast.success(`Reward Claimed: ৳${video.cost_per_view.toFixed(2)}`);
            setHasClaimedToday(true);
            setCanClaim(false);
            window.dispatchEvent(new Event('wallet_updated'));

        } catch (e: any) {
            toast.error(e.message);
        } finally {
            setClaiming(false);
        }
    };

    const getEmbedUrl = (url: string) => {
        if (url.includes('youtube.com') || url.includes('youtu.be')) {
            const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|shorts\/))([\w-]{11})/);
            return match ? `https://www.youtube.com/embed/${match[1]}?autoplay=1&controls=0&rel=0` : url;
        }
        return url;
    };

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
    };

    if (loading) return <div className="min-h-screen flex items-center justify-center bg-black"><Loader /></div>;

    if (error) {
        return (
            <div className="min-h-screen bg-black flex flex-col items-center justify-center p-6 text-center">
                <AlertCircle size={40} className="text-red-500 mb-4" />
                <h2 className="text-xl font-bold text-white mb-2">Video Unavailable</h2>
                <p className="text-gray-400 text-sm mb-6">{error}</p>
                <button onClick={() => navigate('/video')} className="px-6 py-3 bg-white text-black font-bold rounded-xl hover:bg-gray-200">
                    Back to Feed
                </button>
            </div>
        );
    }

    const isNative = video?.video_url?.match(/\.(mp4|webm|ogg|mov)(\?.*)?$/i);
    const progressPercent = Math.min(100, (watchedSeconds / requiredSeconds) * 100);

    return (
        <div className={`min-h-screen bg-[#050505] text-white flex flex-col ${cinemaMode ? 'z-[100] fixed inset-0' : 'pb-24'}`}>
            
            {/* Header (Hidden in Cinema Mode to reduce distraction, Back button is in player) */}
            {!cinemaMode && (
                <div className="bg-black/80 backdrop-blur-md border-b border-white/10 px-4 py-3 flex items-center justify-between sticky top-0 z-50">
                    <span className="font-bold text-sm text-gray-400">Watch & Earn</span>
                    <div className="flex items-center gap-2">
                        <div className="text-[10px] uppercase font-bold text-gray-500 tracking-wider">Reward</div>
                        <div className="bg-green-500/10 border border-green-500/20 px-3 py-1 rounded-full text-green-400 font-mono font-bold text-xs">
                            +<BalanceDisplay amount={video.cost_per_view}/>
                        </div>
                    </div>
                </div>
            )}

            {/* MAIN CONTENT */}
            <div className={`flex-1 flex flex-col ${cinemaMode ? 'justify-center bg-black' : ''}`}>
                
                {/* VIDEO STAGE */}
                <div className={`relative w-full bg-black group ${cinemaMode ? 'h-full' : 'aspect-video shadow-2xl border-b border-white/5'}`}>
                    
                    {/* VIDEO ELEMENT (LOCKED INTERACTION) */}
                    {isNative ? (
                        <video 
                            ref={videoRef}
                            src={video.video_url} 
                            className="w-full h-full object-contain pointer-events-none" // Completely disable interactions
                            controls={false}
                            playsInline
                            onTimeUpdate={handleTimeUpdate}
                            onLoadedMetadata={handleLoadedMetadata}
                            onWaiting={handleWaiting}
                            onPlaying={handlePlaying}
                            onPause={handlePause}
                        />
                    ) : (
                        <div className="relative w-full h-full">
                            {!iframeInteracted ? (
                                <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-black/80 backdrop-blur-sm cursor-pointer" onClick={startIframeTimer}>
                                    <div className="w-16 h-16 bg-red-600 rounded-full flex items-center justify-center mb-4 shadow-[0_0_30px_#dc2626] animate-pulse">
                                        <Play size={32} fill="white" className="ml-1" />
                                    </div>
                                    <p className="text-white font-bold uppercase tracking-widest text-sm">Tap to Watch</p>
                                </div>
                            ) : null}
                            {iframeInteracted && (
                                <iframe 
                                    src={getEmbedUrl(video.video_url)} 
                                    className="w-full h-full pointer-events-none" // Lock Iframe
                                    frameBorder="0"
                                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                    allowFullScreen
                                    title={video.title}
                                ></iframe>
                            )}
                        </div>
                    )}

                    {/* OVERLAY: BACK BUTTON */}
                    <div className="absolute top-4 left-4 z-50">
                        <button onClick={() => navigate('/video')} className="p-2 bg-black/50 text-white rounded-full backdrop-blur-md hover:bg-black/70 border border-white/10">
                            <ArrowLeft size={20} />
                        </button>
                    </div>

                    {/* OVERLAY: CINEMA TOGGLE */}
                    <div className="absolute top-4 right-4 z-50">
                        <button onClick={() => setCinemaMode(!cinemaMode)} className="p-2 bg-black/50 text-white rounded-full backdrop-blur-md hover:bg-black/70 border border-white/10">
                            {cinemaMode ? <Minimize size={20} /> : <Maximize size={20} />}
                        </button>
                    </div>

                    {/* OVERLAY: BIG PLAY BUTTON (If Paused) */}
                    {!isPlaying && !isBuffering && isNative && (
                        <div className="absolute inset-0 flex items-center justify-center z-30 pointer-events-none">
                            <button 
                                onClick={togglePlay} 
                                className="w-20 h-20 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center hover:bg-white/30 transition border border-white/20 pointer-events-auto shadow-2xl"
                            >
                                <Play size={36} fill="white" className="ml-1 text-white"/>
                            </button>
                        </div>
                    )}

                    {/* OVERLAY: BUFFERING */}
                    {isBuffering && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 z-30 backdrop-blur-sm">
                            <Loader2 className="animate-spin text-white mb-2" size={32} />
                            <p className="text-xs font-bold text-white uppercase tracking-wider">Loading...</p>
                        </div>
                    )}

                    {/* OVERLAY: CONTROLS BAR (LOCKED SEEKING) */}
                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 to-transparent pt-12 pb-3 px-4 z-40 flex flex-col gap-3">
                        
                        {/* Progress Bar (Visual Only) */}
                        <div className="w-full bg-white/20 h-1.5 rounded-full overflow-hidden relative">
                            <motion.div 
                                className="h-full bg-gradient-to-r from-blue-500 to-purple-500"
                                style={{ width: `${progressPercent}%` }}
                                animate={{ width: `${progressPercent}%` }}
                                transition={{ ease: "linear" }}
                            />
                            {/* Gray bar for video actual time */}
                            <div 
                                className="absolute top-0 left-0 h-full bg-white/50" 
                                style={{ width: `${(videoRef.current?.currentTime || 0) / duration * 100}%`, opacity: 0.3 }}
                            />
                        </div>

                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <button onClick={togglePlay} className="text-white hover:text-blue-400 transition p-1">
                                    {isPlaying ? <Pause size={24} fill="currentColor"/> : <Play size={24} fill="currentColor"/>}
                                </button>
                                
                                <button onClick={toggleMute} className="text-white hover:text-gray-300 p-1">
                                    {isMuted ? <VolumeX size={20}/> : <Volume2 size={20}/>}
                                </button>

                                <span className="text-xs font-mono font-medium text-white/90">
                                    {formatTime(videoRef.current?.currentTime || 0)} / {formatTime(duration)}
                                </span>
                            </div>

                            <div className="bg-black/50 px-3 py-1 rounded-lg border border-white/10 text-[10px] text-green-400 font-bold uppercase flex items-center gap-2">
                                <Clock size={12}/> {Math.round(watchedSeconds)}s / {requiredSeconds}s
                            </div>
                        </div>
                    </div>

                    {/* OVERLAY: CLAIM BUTTON */}
                    <AnimatePresence>
                        {canClaim && !hasClaimedToday && (
                            <motion.div 
                                initial={{ y: 50, opacity: 0 }} 
                                animate={{ y: 0, opacity: 1 }}
                                className="absolute bottom-20 left-1/2 -translate-x-1/2 z-50 w-auto"
                            >
                                <button 
                                    onClick={handleClaim}
                                    disabled={claiming}
                                    className="px-8 py-3 bg-green-500 hover:bg-green-400 text-black font-black text-sm uppercase tracking-wider rounded-full shadow-[0_0_30px_rgba(34,197,94,0.6)] flex items-center gap-2 transition hover:scale-105 animate-bounce-subtle pointer-events-auto"
                                >
                                    {claiming ? <Loader2 className="animate-spin" size={18}/> : <CheckCircle2 size={18} />}
                                    CLAIM REWARD
                                </button>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                {/* DETAILS PANEL */}
                {!cinemaMode && (
                    <div className="flex-1 overflow-y-auto">
                        
                        {/* AD PLACEMENT: IN-ARTICLE */}
                        <div className="px-4 mt-4">
                            <GoogleAd slot="3493119845" layout="in-article" />
                        </div>

                        <div className="p-4 space-y-6">
                            
                            {/* Title & Status */}
                            <div>
                                <h1 className="text-lg font-bold text-white leading-tight mb-2">{video.title}</h1>
                                <div className="flex items-center gap-4 text-xs text-gray-400">
                                    <span className="flex items-center gap-1"><Clock size={12}/> {video.duration}s</span>
                                    <span className="flex items-center gap-1"><DollarSign size={12}/> {video.cost_per_view} BDT</span>
                                    {hasClaimedToday ? (
                                        <span className="text-green-500 font-bold flex items-center gap-1 bg-green-500/10 px-2 py-0.5 rounded"><CheckCircle2 size={10}/> CLAIMED</span>
                                    ) : (
                                        <span className="text-yellow-500 font-bold flex items-center gap-1 bg-yellow-500/10 px-2 py-0.5 rounded"><Zap size={10}/> EARNING ACTIVE</span>
                                    )}
                                </div>
                            </div>

                            {/* Creator Card */}
                            <GlassCard className="flex items-center justify-between border-white/5 bg-white/5">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-black/50 border border-white/10 overflow-hidden">
                                        {video.profiles?.avatar_1 ? (
                                            <img src={video.profiles.avatar_1} className="w-full h-full object-cover" />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center bg-gray-800 text-gray-500"><UserIcon size={16}/></div>
                                        )}
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-white text-sm flex items-center gap-1">
                                            {video.profiles?.name_1 || 'Advertiser'}
                                            {video.profiles?.is_dealer && <CheckCircle2 size={10} className="text-blue-400 fill-blue-400/20"/>}
                                        </h4>
                                        <span className="text-[10px] text-gray-500">Verified Partner</span>
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    <button className="p-2 bg-white/5 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition"><Share2 size={16}/></button>
                                    <button className="p-2 bg-white/5 rounded-lg text-gray-400 hover:text-red-400 hover:bg-red-500/10 transition"><Heart size={16}/></button>
                                </div>
                            </GlassCard>

                            {/* Up Next */}
                            <div>
                                <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">Watch Next</h3>
                                <div className="space-y-3">
                                    {suggestions.map((sug) => (
                                        <Link to={`/video/watch/${sug.id}`} key={sug.id} className="flex gap-3 p-2 rounded-xl hover:bg-white/5 transition group">
                                            <div className="w-28 aspect-video bg-black rounded-lg overflow-hidden relative border border-white/5">
                                                <img src={sug.thumbnail_url || `https://via.placeholder.com/640x360`} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition" />
                                                <div className="absolute bottom-1 right-1 bg-black/80 text-[8px] px-1.5 py-0.5 rounded text-white font-mono">{sug.duration}s</div>
                                            </div>
                                            <div className="flex-1 py-0.5 min-w-0">
                                                <h4 className="text-sm font-bold text-white line-clamp-2 leading-snug group-hover:text-blue-400 transition">{sug.title}</h4>
                                                <div className="mt-1.5 flex items-center gap-2">
                                                    <span className="text-[10px] text-gray-500 bg-white/5 px-1.5 rounded">Ad</span>
                                                    <p className="text-green-400 text-xs font-bold font-mono">+<BalanceDisplay amount={sug.cost_per_view}/></p>
                                                </div>
                                            </div>
                                        </Link>
                                    ))}
                                </div>
                            </div>
                            
                            {/* AD PLACEMENT: MULTIPLEX */}
                            <GoogleAd slot="8977187296" format="autorelaxed" />

                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default VideoPlayer;