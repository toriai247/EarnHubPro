
import React, { useState, useEffect } from 'react';
import GlassCard from '../components/GlassCard';
// Add missing icons: Activity, LayoutGrid
import { PlayCircle, Plus, MonitorPlay, Trash2, Pause, Clock, Youtube, History, RefreshCw, RotateCcw, AlertCircle, Sparkles, Zap, ChevronRight, Play, Eye, Activity, LayoutGrid } from 'lucide-react';
import { supabase } from '../integrations/supabase/client';
import { motion, AnimatePresence } from 'framer-motion';
import { useUI } from '../context/UIContext';
import BalanceDisplay from '../components/BalanceDisplay';
import { VideoAd, UserProfile } from '../types';
import Loader from '../components/Loader';
import { Link, useNavigate } from 'react-router-dom';
import SmartAd from '../components/SmartAd';

const Video: React.FC = () => {
  const { toast, confirm } = useUI();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'watch' | 'history' | 'manage'>('watch');
  
  // Data
  const [activeVideos, setActiveVideos] = useState<VideoAd[]>([]);
  const [historyVideos, setHistoryVideos] = useState<VideoAd[]>([]);
  const [myVideos, setMyVideos] = useState<VideoAd[]>([]);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
      fetchData();
  }, []);

  const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
          const { data: { session } } = await supabase.auth.getSession();
          if (!session) return;

          const { data: profRes } = await supabase.from('profiles').select('*').eq('id', session.user.id).single();
          if (profRes) setProfile(profRes as UserProfile);

          const { data: adsRes, error: adsError } = await supabase
            .from('video_ads')
            .select('*')
            .eq('status', 'active')
            .gt('remaining_budget', 0.1)
            .order('created_at', {ascending: false});

          if (adsError) throw adsError;

          const creatorIds = Array.from(new Set((adsRes || []).map((ad: any) => ad.creator_id)));
          let profileMap: Record<string, any> = {};
          
          if (creatorIds.length > 0) {
              const { data: creators } = await supabase.from('profiles').select('id, name_1, avatar_1').in('id', creatorIds);
              if (creators) {
                  profileMap = creators.reduce((acc: any, curr: any) => ({...acc, [curr.id]: curr}), {});
              }
          }

          const allAds = (adsRes || []).map((ad: any) => ({
              ...ad,
              profiles: profileMap[ad.creator_id]
          })) as VideoAd[];

          const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
          const { data: claims } = await supabase.from('transactions').select('description').eq('user_id', session.user.id).eq('type', 'earn').gte('created_at', oneDayAgo);

          const claimDescriptions = (claims || []).map((c: any) => (c.description || '').toLowerCase());
          
          const history: VideoAd[] = [];
          const available: VideoAd[] = [];

          allAds.forEach(ad => {
              const title = (ad.title || '').toLowerCase();
              const isClaimed = claimDescriptions.some((desc: string) => desc.includes(title));
              if (isClaimed) history.push(ad);
              else available.push(ad);
          });

          setActiveVideos(available);
          setHistoryVideos(history);
      } catch (err: any) {
          console.error("Video Page Error:", err);
          setError(err.message || "Network Timeout");
      } finally {
          setLoading(false);
      }
  };

  const fetchMyAds = async () => {
      if (!profile) return;
      const { data, error } = await supabase.from('video_ads').select('*').eq('creator_id', profile.id).order('created_at', {ascending: false});
      if (!error && data) setMyVideos(data as VideoAd[]);
  };

  useEffect(() => {
      if (activeTab === 'manage') fetchMyAds();
  }, [activeTab]);

  const handleToggleStatus = async (ad: VideoAd) => {
      const newStatus = ad.status === 'active' ? 'paused' : 'active';
      await supabase.from('video_ads').update({ status: newStatus }).eq('id', ad.id);
      fetchMyAds();
      toast.success(`Campaign ${newStatus}`);
  };

  const handleDeleteAd = async (id: string) => {
      if (!await confirm("Purge Campaign? Unused budget will be archived.", "Critical Action")) return;
      const { error } = await supabase.from('video_ads').delete().eq('id', id);
      if (error) toast.error("Delete Failed");
      else {
          toast.success("Ad Terminated");
          fetchMyAds();
      }
  };

  const canUpload = profile && (profile.is_kyc_1 || profile.is_dealer || profile.role === 'admin');

  if (loading) return <div className="min-h-screen bg-void flex items-center justify-center"><Loader /></div>;

  return (
    <div className="pb-32 px-4 sm:px-0 sm:pl-20 space-y-8 animate-fade-in">
       
       <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 pt-6">
           <div className="space-y-1">
               <h1 className="text-4xl font-black text-white uppercase tracking-tighter flex items-center gap-3">
                   <MonitorPlay className="text-brand" size={36} /> MEDIA <span className="text-brand">HUB</span>
               </h1>
               <p className="text-muted text-[10px] font-black uppercase tracking-[0.3em] pl-1">Monetized Visual Stream v4.1</p>
           </div>
           
           <div className="flex bg-panel p-1 rounded-2xl border border-border-base relative w-full md:w-auto shadow-xl">
               {['watch', 'history', 'manage'].map((t) => (
                   (t === 'manage' && !canUpload) ? null : (
                    <button 
                        key={t}
                        onClick={() => setActiveTab(t as any)} 
                        className={`flex-1 md:flex-none relative px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all z-10 ${activeTab === t ? 'text-black' : 'text-muted hover:text-white'}`}
                    >
                        {activeTab === t && (
                            <motion.div layoutId="videoTab" className="absolute inset-0 bg-brand rounded-xl shadow-glow" />
                        )}
                        <span className="relative z-20 flex items-center justify-center gap-2">
                            {t === 'watch' && <Play size={14} fill="currentColor" />}
                            {t === 'history' && <RotateCcw size={14} />}
                            {t === 'manage' && <Activity size={14} />}
                            {t}
                        </span>
                    </button>
                   )
               ))}
               <Link to="/advertise" className="hidden md:flex items-center gap-2 px-6 py-2.5 bg-white/5 hover:bg-white/10 text-white rounded-xl text-xs font-black uppercase tracking-widest border-l border-white/5 ml-1 transition">
                   <Plus size={14} strokeWidth={3} /> Create
               </Link>
           </div>
       </header>

       <AnimatePresence mode="wait">
       {activeTab === 'watch' && (
           <motion.div key="watch" initial={{ opacity:0, y:10 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0, x:-20 }} className="space-y-8">
               
               {/* SPOTLIGHT AD */}
               {activeVideos.length > 0 && (
                   <div className="relative group overflow-hidden rounded-[2.5rem] border border-brand/20 bg-black cursor-pointer" onClick={() => navigate(`/video/watch/${activeVideos[0].id}`)}>
                       <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent z-10"></div>
                       <img src={activeVideos[0].thumbnail_url || `https://via.placeholder.com/1280x720?text=Featured`} className="w-full aspect-video md:h-80 object-cover opacity-60 group-hover:scale-105 transition-transform duration-700" />
                       <div className="absolute top-4 left-4 z-20 bg-brand text-black text-[9px] font-black px-3 py-1 rounded-full shadow-lg uppercase tracking-tighter flex items-center gap-1">
                           <span className="shrink-0"><Sparkles size={10} fill="currentColor"/></span> High Yield Protocol
                       </div>
                       <div className="absolute bottom-6 left-6 right-6 z-20 space-y-3">
                           <div className="flex items-center gap-3">
                               <div className="bg-success text-black px-4 py-1.5 rounded-2xl font-black text-xs shadow-glow">
                                   +<BalanceDisplay amount={activeVideos[0].cost_per_view} isNative />
                               </div>
                               <span className="text-[10px] text-white/60 font-black uppercase tracking-widest flex items-center gap-1">
                                   <Clock size={12}/> {activeVideos[0].duration}s REQUIRED
                               </span>
                           </div>
                           <h2 className="text-3xl font-black text-white uppercase tracking-tighter truncate">{activeVideos[0].title}</h2>
                           <div className="flex items-center gap-2 text-brand font-black text-xs uppercase tracking-widest group-hover:translate-x-1 transition-transform">
                               Initialize Stream <ChevronRight size={18} strokeWidth={3}/>
                           </div>
                       </div>
                       {/* Animated Glow Backing */}
                       <div className="absolute -bottom-20 -left-20 w-64 h-64 bg-brand/5 blur-[100px] pointer-events-none"></div>
                   </div>
               )}

               <div className="flex items-center justify-between px-1">
                   <h3 className="text-xs font-black text-gray-500 uppercase tracking-[0.4em] flex items-center gap-3">
                       <LayoutGrid size={14} className="text-brand"/> Stream Directory
                   </h3>
                   <button onClick={fetchData} className="p-2 bg-white/5 rounded-xl hover:bg-white/10 text-gray-400 transition">
                       <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
                   </button>
               </div>

               {activeVideos.length <= 1 && activeVideos.length !== 0 ? (
                   <div className="py-12 text-center text-gray-600 uppercase font-black tracking-widest text-xs">No other streams available</div>
               ) : (
                   <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                       {activeVideos.slice(1).map((v) => (
                           <VideoCard key={v.id} video={v} mode="earn" onClick={() => navigate(`/video/watch/${v.id}`)} />
                       ))}
                   </div>
               )}

               {activeVideos.length === 0 && (
                   <div className="text-center py-24 bg-panel border-2 border-dashed border-border-base rounded-[3rem]">
                       <Eye size={48} className="mx-auto text-gray-800 mb-6 opacity-20" />
                       <p className="text-gray-600 font-black uppercase tracking-[0.3em] text-xs">All streams consumed. Reset in 24h.</p>
                   </div>
               )}
           </motion.div>
       )}

       {activeTab === 'history' && (
           <motion.div key="history" initial={{ opacity:0, y:10 }} animate={{ opacity:1, y:0 }} className="space-y-6">
               <div className="bg-blue-900/10 border border-blue-500/20 p-5 rounded-3xl flex items-center gap-4">
                   <div className="p-3 bg-blue-500/20 rounded-2xl text-blue-400"><History size={24}/></div>
                   <p className="text-xs text-blue-200 font-bold leading-relaxed uppercase tracking-wider">
                       Displaying recently processed visual assets. Reward protocols are locked for 24 hours post-consumption.
                   </p>
               </div>
               <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 opacity-60">
                   {historyVideos.map(v => <VideoCard key={v.id} video={v} mode="history" onClick={() => navigate(`/video/watch/${v.id}`)} />)}
               </div>
           </motion.div>
       )}

       {activeTab === 'manage' && (
           <motion.div key="manage" initial={{ opacity:0, y:10 }} animate={{ opacity:1, y:0 }} className="space-y-6">
               {myVideos.map(v => (
                   <GlassCard key={v.id} className="border-white/5 bg-panel hover:border-brand/20 transition-all rounded-[2.5rem] p-6">
                       <div className="flex flex-col md:flex-row gap-8 items-center">
                           <div className="w-full md:w-56 aspect-video bg-black rounded-[2rem] overflow-hidden relative shadow-2xl">
                               <img src={v.thumbnail_url} className="w-full h-full object-cover opacity-40" />
                               <div className="absolute inset-0 flex items-center justify-center">
                                   {v.status === 'active' ? <div className="p-4 bg-success/20 rounded-full border border-success/40 text-success"><Play size={24} fill="currentColor"/></div> : <div className="p-4 bg-yellow-500/20 rounded-full border border-yellow-500/40 text-yellow-500"><Pause size={24} fill="currentColor"/></div>}
                               </div>
                           </div>
                           <div className="flex-1 w-full space-y-4">
                               <div className="flex justify-between items-start">
                                   <div>
                                       <h3 className="text-xl font-black text-white uppercase tracking-tighter">{v.title}</h3>
                                       <span className={`inline-block mt-1 px-3 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest ${v.status === 'active' ? 'bg-success text-black' : 'bg-yellow-500 text-black'}`}>SYSTEM: {v.status}</span>
                                   </div>
                                   <div className="flex gap-2">
                                       <button onClick={() => handleToggleStatus(v)} className="p-3 bg-white/5 hover:bg-white/10 rounded-2xl text-white transition border border-white/5">
                                           {v.status === 'active' ? <Pause size={18}/> : <Play size={18}/>}
                                       </button>
                                       <button onClick={() => handleDeleteAd(v.id)} className="p-3 bg-red-600/10 hover:bg-red-600/20 text-red-500 rounded-2xl border border-red-500/20 transition">
                                           <Trash2 size={18}/>
                                       </button>
                                   </div>
                               </div>
                               
                               <div className="grid grid-cols-3 gap-4">
                                   <div className="bg-black/30 p-3 rounded-2xl border border-white/5">
                                       <p className="text-[8px] text-gray-500 font-black uppercase tracking-widest">Active Credit</p>
                                       <p className="text-sm font-black text-white font-mono">৳{v.remaining_budget.toFixed(2)}</p>
                                   </div>
                                   <div className="bg-black/30 p-3 rounded-2xl border border-white/5">
                                       <p className="text-[8px] text-gray-500 font-black uppercase tracking-widest">Conversion</p>
                                       <p className="text-sm font-black text-success font-mono">৳{v.cost_per_view}</p>
                                   </div>
                                   <div className="bg-black/30 p-3 rounded-2xl border border-white/5">
                                       <p className="text-[8px] text-gray-500 font-black uppercase tracking-widest">Est. Reach</p>
                                       <p className="text-sm font-black text-brand font-mono">{Math.floor(v.remaining_budget / v.cost_per_view)}</p>
                                   </div>
                               </div>
                           </div>
                       </div>
                   </GlassCard>
               ))}
               {myVideos.length === 0 && <div className="text-center py-12 text-gray-600">No active campaigns.</div>}
           </motion.div>
       )}
       </AnimatePresence>

       <div className="px-1">
           <SmartAd slot="4491147378" className="rounded-[3rem] overflow-hidden border border-border-base" />
       </div>
    </div>
  );
};

const VideoCard = ({ video, mode, onClick }: any) => (
    <motion.div whileHover={{ y: -8 }} className="cursor-pointer h-full" onClick={onClick}>
       <div className={`rounded-[2.5rem] overflow-hidden border transition-all h-full flex flex-col group bg-panel ${mode === 'history' ? 'border-white/5 opacity-70 grayscale' : 'border-border-base hover:border-brand/40 shadow-xl hover:shadow-brand/5'}`}>
           <div className="relative aspect-video bg-black overflow-hidden">
               <img src={video.thumbnail_url} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
               <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent opacity-60"></div>
               <div className="absolute inset-0 flex items-center justify-center z-20">
                   <div className={`w-14 h-14 rounded-full flex items-center justify-center transition-all group-hover:scale-110 shadow-glow ${mode === 'history' ? 'bg-white/10 text-white' : 'bg-brand text-black'}`}>
                       {mode === 'history' ? <RotateCcw size={28}/> : <Play size={28} fill="currentColor" className="ml-1" />}
                   </div>
               </div>
               <div className="absolute bottom-4 right-4 bg-black/80 backdrop-blur-md text-white text-[9px] font-black px-3 py-1 rounded-full border border-white/10">
                   {video.duration}s
               </div>
               {mode === 'history' && (
                   <div className="absolute top-4 right-4 bg-success text-black text-[8px] font-black px-2 py-0.5 rounded uppercase tracking-tighter">CONSUMED</div>
               )}
           </div>
           <div className="p-6 flex-1 flex flex-col justify-between gap-6">
               <div>
                    <h3 className="font-black text-white text-base leading-tight line-clamp-2 uppercase tracking-tight group-hover:text-brand transition-colors">{video.title}</h3>
                    <div className="flex items-center gap-3 mt-4">
                        <div className="w-7 h-7 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center font-black text-brand text-[10px]">
                            {video.profiles?.name_1?.charAt(0) || 'A'}
                        </div>
                        <span className="text-[10px] text-gray-500 font-bold uppercase tracking-widest truncate">{video.profiles?.name_1 || 'Anonymous'}</span>
                    </div>
               </div>

               <div className="pt-4 border-t border-white/5 flex items-center justify-between">
                   {mode === 'earn' ? (
                       <>
                           <div className="bg-brand/10 border border-brand/20 px-3 py-1 rounded-full text-brand font-black font-mono text-xs">
                               +<BalanceDisplay amount={video.cost_per_view}/>
                           </div>
                           <ChevronRight className="text-muted group-hover:text-brand transition-all group-hover:translate-x-1" size={18} strokeWidth={3}/>
                       </>
                   ) : (
                       <span className="text-[9px] font-black text-muted uppercase tracking-[0.2em] w-full text-center">Re-watch for context</span>
                   )}
               </div>
           </div>
       </div>
    </motion.div>
);

export default Video;
