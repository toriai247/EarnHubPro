
import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { supabase } from '../integrations/supabase/client';
import { VideoAd, UserProfile } from '../types';
import GlassCard from '../components/GlassCard';
import { 
    ArrowLeft, Play, Pause, AlertTriangle, CheckCircle2, 
    Clock, DollarSign, User, Share2, MoreVertical, Maximize, RotateCcw, AlertCircle
} from 'lucide-react';
import { useUI } from '../context/UIContext';
import BalanceDisplay from '../components/BalanceDisplay';
import Loader from '../components/Loader';
import { motion, AnimatePresence } from 'framer-motion';
import { updateWallet, createTransaction } from '../lib/actions';

const VideoPlayer: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { toast } = useUI();
    
    // Data State
    const [video, setVideo] = useState<any | null>(null);
    const [suggestions, setSuggestions] = useState<VideoAd[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    
    // Player State
    const [isPlaying, setIsPlaying] = useState(false);
    const [timeLeft, setTimeLeft] = useState(0); // Seconds remaining for reward
    const [hasClaimedToday, setHasClaimedToday] = useState(false);
    const [canClaim, setCanClaim] = useState(false);
    const [claiming, setClaiming] = useState(false);
    const [iframeInteracted, setIframeInteracted] = useState(false);
    
    // Refs
    const videoRef = useRef<HTMLVideoElement>(null);
    const timerRef = useRef<any>(null);

    // Initial Load
    useEffect(() => {
        if (!id) return;
        fetchVideoDetails();
        
        // Clean up on unmount or ID change
        return () => stopTimer();
    }, [id]);

    // Visibility API for tab switching - PAUSE TIMER IF TAB HIDDEN
    useEffect(() => {
        const handleVisibilityChange = () => {
            if (document.hidden) {
                if (videoRef.current) videoRef.current.pause();
                setIsPlaying(false);
                stopTimer();
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

            // 1. Fetch Video without Join to fix schema cache error
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
                .select('name_1, avatar_1, level_1')
                .eq('id', adData.creator_id)
                .single();
            
            const ad = { ...adData, profiles: creatorProfile };

            // 2. Check 24h Claim Limit
            const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
            
            // Robust check: match video title in transaction description
            const { data: claims } = await supabase
                .from('transactions')
                .select('description')
                .eq('user_id', session.user.id)
                .eq('type', 'earn')
                .gte('created_at', oneDayAgo);

            const isClaimed = (claims || []).some((c: any) => 
                c.description && c.description.toLowerCase().includes(ad.title.toLowerCase())
            );
            
            setVideo(ad);
            setHasClaimedToday(isClaimed);
            
            // Timer Logic: Max 30s or full duration if shorter. Min 10s.
            const requiredTime = Math.max(10, Math.min(ad.duration, 30)); 
            setTimeLeft(isClaimed ? 0 : requiredTime);
            
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

    // --- TIMER LOGIC ---
    const startTimer = () => {
        if (hasClaimedToday || canClaim || timeLeft <= 0) return;
        
        stopTimer(); // Ensure no duplicates
        timerRef.current = setInterval(() => {
            setTimeLeft(prev => {
                if (prev <= 1) {
                    stopTimer();
                    setCanClaim(true);
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
        setIsPlaying(true);
    };

    const stopTimer = () => {
        if (timerRef.current) clearInterval(timerRef.current);
        setIsPlaying(false);
    };

    // --- NATIVE VIDEO HANDLERS ---
    const handleNativePlay = () => startTimer();
    const handleNativePause = () => stopTimer();

    // --- IFRAME HANDLERS ---
    const handleIframeStart = () => {
        setIframeInteracted(true);
        startTimer(); // Optimistic start for iframe
    };

    // --- CLAIM LOGIC ---
    const handleClaim = async () => {
        if (!canClaim || hasClaimedToday) return;
        setClaiming(true);

        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) throw new Error("No session");

            // Attempt RPC claim (Atomic)
            const { data, error } = await supabase.rpc('claim_video_reward', {
                p_ad_id: video.id,
                p_user_id: session.user.id
            });

            if (error) {
                // If RPC fails (e.g. missing function), fallback to client-side logic (Less secure but functional)
                console.warn("RPC Failed, using fallback claim logic:", error.message);
                
                // Fallback Logic
                await updateWallet(session.user.id, video.cost_per_view, 'increment', 'earning_balance');
                await createTransaction(
                    session.user.id, 
                    'earn', 
                    video.cost_per_view, 
                    `Video Reward: ${video.title}`
                );
                // Reduce budget manually
                await supabase.from('video_ads').update({ 
                    remaining_budget: Math.max(0, video.remaining_budget - video.cost_per_view)
                }).eq('id', video.id);
            } else if (!data.success) {
                throw new Error(data.message);
            }

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

    // Determine Video Type
    const isNative = video?.video_url?.match(/\.(mp4|webm|ogg|mov)(\?.*)?$/i);
    
    // Helper for embed URL
    const getEmbedUrl = (url: string) => {
        if (url.includes('youtube.com') || url.includes('youtu.be')) {
            const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|shorts\/))([\w-]{11})/);
            return match ? `https://www.youtube.com/embed/${match[1]}?autoplay=1` : url;
        }
        return url;
    };

    if (loading) return <div className="min-h-screen flex items-center justify-center bg-black"><Loader /></div>;

    if (error) {
        return (
            <div className="min-h-screen bg-black flex flex-col items-center justify-center p-6 text-center">
                <div className="bg-red-500/10 p-4 rounded-full mb-4">
                    <AlertCircle size={40} className="text-red-500" />
                </div>
                <h2 className="text-xl font-bold text-white mb-2">Video Unavailable</h2>
                <div className="bg-red-900/20 text-red-200 p-4 rounded-xl text-sm font-mono border border-red-500/30 max-w-sm">
                    {error}
                </div>
                <button onClick={() => navigate('/video')} className="mt-6 px-6 py-3 bg-white text-black font-bold rounded-xl hover:bg-gray-200">
                    Return to List
                </button>
            </div>
        );
    }

    return (
        <div className="pb-24 min-h-screen bg-[#050505] text-white">
            
            {/* Sticky Header */}
            <div className="sticky top-0 z-50 bg-black/90 backdrop-blur-md border-b border-white/10 px-4 py-3 flex items-center gap-4">
                <button onClick={() => navigate('/video')} className="p-2 bg-white/10 rounded-full hover:bg-white/20 transition">
                    <ArrowLeft size={20} />
                </button>
                <h1 className="text-sm font-bold truncate flex-1">{video.title}</h1>
                {!hasClaimedToday && (
                    <div className="bg-green-500/10 border border-green-500/20 px-3 py-1 rounded-full">
                        <p className="text-green-400 font-mono font-bold text-xs">+<BalanceDisplay amount={video.cost_per_view}/></p>
                    </div>
                )}
            </div>

            {/* --- VIDEO PLAYER STAGE --- */}
            <div className="relative w-full aspect-video bg-black border-b border-white/10 shadow-2xl group">
                
                {isNative ? (
                    <video 
                        ref={videoRef}
                        src={video.video_url} 
                        className="w-full h-full object-contain"
                        controls
                        controlsList="nodownload"
                        onPlay={handleNativePlay}
                        onPause={handleNativePause}
                        playsInline
                    />
                ) : (
                    <div className="relative w-full h-full">
                        {!iframeInteracted ? (
                            <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-black/80 backdrop-blur-sm cursor-pointer" onClick={handleIframeStart}>
                                <div className="w-16 h-16 bg-red-600 rounded-full flex items-center justify-center mb-4 shadow-[0_0_30px_#dc2626] animate-pulse">
                                    <Play size={32} fill="white" className="ml-1" />
                                </div>
                                <p className="text-white font-bold uppercase tracking-widest text-sm">Click to Start Watch Timer</p>
                            </div>
                        ) : null}
                        {iframeInteracted && (
                            <iframe 
                                src={getEmbedUrl(video.video_url)} 
                                className="w-full h-full"
                                frameBorder="0"
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                allowFullScreen
                                title={video.title}
                            ></iframe>
                        )}
                    </div>
                )}

                {/* Claim Overlay (When Ready) */}
                <AnimatePresence>
                    {canClaim && !hasClaimedToday && (
                        <motion.div 
                            initial={{ y: 50, opacity: 0 }} 
                            animate={{ y: 0, opacity: 1 }}
                            className="absolute bottom-4 left-4 right-4 z-30"
                        >
                            <button 
                                onClick={handleClaim}
                                disabled={claiming}
                                className="w-full py-4 bg-green-500 text-black font-black text-lg uppercase tracking-wider rounded-xl shadow-[0_0_30px_rgba(34,197,94,0.5)] flex items-center justify-center gap-2 hover:scale-[1.02] transition animate-bounce-subtle"
                            >
                                {claiming ? <Loader className="animate-spin text-black"/> : <CheckCircle2 size={24} />}
                                CLAIM REWARD NOW
                            </button>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* --- CONTROLS & INFO --- */}
            <div className="p-4 space-y-6 max-w-4xl mx-auto">
                
                {/* Timer Bar */}
                {!hasClaimedToday && !canClaim && (
                    <div className="bg-white/5 p-4 rounded-xl border border-white/5 flex items-center gap-4">
                        <div className="relative w-12 h-12 flex items-center justify-center">
                            <svg className="w-full h-full -rotate-90">
                                <circle cx="24" cy="24" r="20" stroke="#333" strokeWidth="4" fill="none" />
                                <circle 
                                    cx="24" cy="24" r="20" stroke={isPlaying ? "#10b981" : "#ef4444"} strokeWidth="4" fill="none" 
                                    strokeDasharray="125.6"
                                    strokeDashoffset={(125.6 * timeLeft) / (Math.max(10, Math.min(video.duration, 30)))}
                                    className="transition-all duration-1000 ease-linear"
                                />
                            </svg>
                            <span className="absolute text-[10px] font-bold text-white">{timeLeft}s</span>
                        </div>
                        <div className="flex-1">
                            <p className="text-xs font-bold text-gray-400 uppercase mb-1">
                                {isPlaying ? 'Watching...' : 'Paused - Click Play to Earn'}
                            </p>
                            <div className="h-2 w-full bg-black/50 rounded-full overflow-hidden">
                                <div 
                                    className={`h-full transition-all duration-1000 ${isPlaying ? 'bg-green-500' : 'bg-red-500'}`}
                                    style={{ width: `${((Math.max(10, Math.min(video.duration, 30)) - timeLeft) / Math.max(10, Math.min(video.duration, 30))) * 100}%` }}
                                ></div>
                            </div>
                        </div>
                    </div>
                )}

                {hasClaimedToday && (
                    <div className="bg-blue-500/10 border border-blue-500/30 p-4 rounded-xl flex items-center gap-3">
                        <CheckCircle2 className="text-blue-400" size={24} />
                        <div>
                            <h4 className="text-blue-400 font-bold text-sm uppercase">Reward Claimed Today</h4>
                            <p className="text-gray-400 text-xs">Come back in 24 hours to earn again.</p>
                        </div>
                    </div>
                )}

                {/* Video Info */}
                <div>
                    <h2 className="text-xl font-bold text-white leading-tight mb-2">{video.title}</h2>
                    <div className="flex items-center gap-4 text-xs text-gray-500">
                        <span className="flex items-center gap-1"><Clock size={12}/> {video.duration}s Duration</span>
                        <span className="flex items-center gap-1"><DollarSign size={12}/> Budget: High</span>
                    </div>
                </div>

                {/* Runner Profile */}
                <GlassCard className="flex items-center justify-between border-white/5 bg-white/5">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-full bg-black/50 border border-white/10 overflow-hidden">
                            {video.profiles?.avatar_1 ? (
                                <img src={video.profiles.avatar_1} className="w-full h-full object-cover" />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center bg-gray-800 font-bold text-gray-500">?</div>
                            )}
                        </div>
                        <div>
                            <h4 className="font-bold text-white text-sm">{video.profiles?.name_1 || 'Ad Runner'}</h4>
                            <span className="text-[10px] bg-white/10 px-2 py-0.5 rounded text-gray-400">Verified Partner</span>
                        </div>
                    </div>
                    <button className="px-4 py-2 bg-white text-black text-xs font-bold rounded-lg hover:bg-gray-200 transition">
                        Subscribe
                    </button>
                </GlassCard>

                {/* Up Next */}
                <div>
                    <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-3">Up Next</h3>
                    <div className="space-y-3">
                        {suggestions.map((sug) => (
                            <Link to={`/video/watch/${sug.id}`} key={sug.id} className="flex gap-3 p-2 rounded-xl hover:bg-white/5 transition group">
                                <div className="w-32 aspect-video bg-black rounded-lg overflow-hidden relative border border-white/5">
                                    <img src={sug.thumbnail_url || `https://via.placeholder.com/640x360`} className="w-full h-full object-cover opacity-80 group-hover:opacity-100" />
                                    <div className="absolute bottom-1 right-1 bg-black/80 text-[9px] px-1 rounded text-white">{sug.duration}s</div>
                                </div>
                                <div className="flex-1 py-1">
                                    <h4 className="text-sm font-bold text-white line-clamp-2 group-hover:text-blue-400 transition">{sug.title}</h4>
                                    <p className="text-[10px] text-gray-500 mt-1">Sponsored Ad</p>
                                    <p className="text-green-400 text-xs font-bold font-mono mt-1">+<BalanceDisplay amount={sug.cost_per_view}/></p>
                                </div>
                            </Link>
                        ))}
                    </div>
                </div>

            </div>
        </div>
    );
};

export default VideoPlayer;
