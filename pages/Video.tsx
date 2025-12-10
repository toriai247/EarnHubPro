
import React, { useState, useEffect } from 'react';
import GlassCard from '../components/GlassCard';
import { PlayCircle, Plus, MonitorPlay, Trash2, Pause, Clock, Youtube, History, RefreshCw, RotateCcw, AlertCircle } from 'lucide-react';
import { supabase } from '../integrations/supabase/client';
import { motion, AnimatePresence } from 'framer-motion';
import { useUI } from '../context/UIContext';
import BalanceDisplay from '../components/BalanceDisplay';
import { VideoAd, UserProfile } from '../types';
import Loader from '../components/Loader';
import { Link, useNavigate } from 'react-router-dom';

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

          // 1. Get Profile
          const { data: profRes } = await supabase.from('profiles').select('*').eq('id', session.user.id).single();
          if (profRes) setProfile(profRes as UserProfile);

          // 2. Get All Active Ads
          const { data: adsRes, error: adsError } = await supabase
            .from('video_ads')
            .select('*')
            .eq('status', 'active')
            .gt('remaining_budget', 0.1)
            .order('created_at', {ascending: false});

          if (adsError) throw adsError;

          // Manual Profile Join
          const creatorIds = Array.from(new Set((adsRes || []).map((ad: any) => ad.creator_id)));
          let profileMap: Record<string, any> = {};
          
          if (creatorIds.length > 0) {
              const { data: creators } = await supabase
                  .from('profiles')
                  .select('id, name_1, avatar_1')
                  .in('id', creatorIds);
              
              if (creators) {
                  profileMap = creators.reduce((acc: any, curr: any) => ({...acc, [curr.id]: curr}), {});
              }
          }

          const allAds = (adsRes || []).map((ad: any) => ({
              ...ad,
              profiles: profileMap[ad.creator_id]
          })) as VideoAd[];

          // 3. Check Claims (History - Last 24 Hours for earning limit)
          const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
          
          const { data: claims } = await supabase
            .from('transactions')
            .select('description')
            .eq('user_id', session.user.id)
            .eq('type', 'earn')
            .gte('created_at', oneDayAgo);

          // Robust Filtering
          const claimDescriptions = (claims || []).map((c: any) => (c.description || '').toLowerCase());
          
          const history: VideoAd[] = [];
          const available: VideoAd[] = [];

          allAds.forEach(ad => {
              const title = (ad.title || '').toLowerCase();
              // Check if any claim description contains the video title (Fuzzy Match)
              const isClaimed = claimDescriptions.some(desc => desc.includes(title));
              
              if (isClaimed) {
                  history.push(ad);
              } else {
                  available.push(ad);
              }
          });

          setActiveVideos(available);
          setHistoryVideos(history);

      } catch (err: any) {
          console.error("Video Page Error:", err);
          setError(err.message || JSON.stringify(err));
      } finally {
          setLoading(false);
      }
  };

  const fetchMyAds = async () => {
      if (!profile) return;
      const { data, error } = await supabase.from('video_ads').select('*').eq('creator_id', profile.id).order('created_at', {ascending: false});
      if (error) {
          toast.error(error.message);
      } else if (data) {
          setMyVideos(data as VideoAd[]);
      }
  };

  useEffect(() => {
      if (activeTab === 'manage') fetchMyAds();
  }, [activeTab]);

  const handleToggleStatus = async (ad: VideoAd) => {
      const newStatus = ad.status === 'active' ? 'paused' : 'active';
      await supabase.from('video_ads').update({ status: newStatus }).eq('id', ad.id);
      fetchMyAds();
  };

  const handleDeleteAd = async (id: string) => {
      if (!await confirm("Delete Ad? Remaining budget will NOT be automatically refunded (contact support).")) return;
      const { error } = await supabase.from('video_ads').delete().eq('id', id);
      if (error) toast.error("Delete Failed: " + error.message);
      else {
          toast.success("Ad Deleted");
          fetchMyAds();
      }
  };

  const canUpload = profile && (profile.is_kyc_1 || profile.is_dealer || profile.role === 'admin' || profile.role === 'staff');

  if (loading) return <div className="p-10"><Loader /></div>;

  return (
    <div className="pb-24 sm:pl-20 sm:pt-6 space-y-6 px-4 sm:px-0 relative min-h-screen">
       
       <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 pt-4">
           <div>
               <h1 className="text-2xl font-display font-bold text-white flex items-center gap-2">
                   <MonitorPlay className="text-red-500" /> Watch & Earn
               </h1>
               <p className="text-gray-400 text-xs">Watch videos to earn rewards. Revisit favorites in History.</p>
           </div>
           
           <div className="flex bg-[#111] p-1 rounded-xl border border-white/10 overflow-x-auto no-scrollbar w-full md:w-auto">
               <button onClick={() => setActiveTab('watch')} className={`flex-1 md:flex-none px-4 py-2 rounded-lg text-xs font-bold whitespace-nowrap ${activeTab === 'watch' ? 'bg-white text-black' : 'text-gray-400'}`}>Earn Now</button>
               <button onClick={() => setActiveTab('history')} className={`flex-1 md:flex-none px-4 py-2 rounded-lg text-xs font-bold whitespace-nowrap flex items-center gap-1 ${activeTab === 'history' ? 'bg-white text-black' : 'text-gray-400'}`}>
                   <History size={14}/> History
               </button>
               {canUpload && (
                   <button onClick={() => setActiveTab('manage')} className={`flex-1 md:flex-none px-4 py-2 rounded-lg text-xs font-bold whitespace-nowrap ${activeTab === 'manage' ? 'bg-white text-black' : 'text-gray-400'}`}>My Ads</button>
               )}
               <Link to="/advertise" className="flex-1 md:flex-none px-4 py-2 rounded-lg text-xs font-bold whitespace-nowrap flex items-center gap-1 text-gray-400 hover:text-white bg-white/5 border-l border-white/10 ml-1">
                   <Plus size={14}/> Create
               </Link>
           </div>
       </header>

       {error && (
           <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm flex items-start gap-3">
               <AlertCircle className="shrink-0 mt-0.5" size={18} />
               <div className="flex-1">
                   <p className="font-bold">System Error</p>
                   <p className="text-xs font-mono mt-1 opacity-80">{error}</p>
                   <p className="text-xs mt-2 text-red-300">If this persists, please contact support or check if the video database module is initialized.</p>
               </div>
               <button onClick={fetchData} className="text-white hover:text-red-200"><RefreshCw size={16}/></button>
           </div>
       )}

       {/* --- WATCH TAB --- */}
       {activeTab === 'watch' && (
           <div className="space-y-4">
               {activeVideos.length === 0 ? (
                   <div className="col-span-full text-center py-20 text-gray-500 bg-white/5 rounded-2xl border border-white/5">
                       <Youtube size={48} className="mx-auto mb-4 opacity-50"/>
                       <p className="text-sm font-bold">No new videos available.</p>
                       <p className="text-xs mt-1">Check back later or view your history.</p>
                       <button onClick={() => fetchData()} className="mt-4 flex items-center gap-2 mx-auto bg-white/10 px-4 py-2 rounded-lg hover:bg-white/20 transition text-xs">
                           <RefreshCw size={14}/> Refresh
                       </button>
                   </div>
               ) : (
                   <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                       {activeVideos.map((video: any) => (
                           <VideoCard key={video.id} video={video} mode="earn" onClick={() => navigate(`/video/watch/${video.id}`)} />
                       ))}
                   </div>
               )}
           </div>
       )}

       {/* --- HISTORY TAB --- */}
       {activeTab === 'history' && (
           <div className="space-y-4 animate-fade-in">
               <div className="flex items-center gap-2 mb-2 text-xs text-gray-500">
                   <History size={14} />
                   <span>Videos watched in the last 24 hours (Cooldown Active)</span>
               </div>
               
               {historyVideos.length === 0 ? (
                   <div className="text-center py-16 text-gray-500 bg-white/5 rounded-2xl border border-white/5">
                       <p>You haven't watched any videos today.</p>
                   </div>
               ) : (
                   <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                       {historyVideos.map((video: any) => (
                           <VideoCard key={video.id} video={video} mode="history" onClick={() => navigate(`/video/watch/${video.id}`)} />
                       ))}
                   </div>
               )}
           </div>
       )}

       {/* --- MANAGE TAB --- */}
       {activeTab === 'manage' && canUpload && (
           <div className="space-y-4 animate-fade-in">
               {myVideos.length === 0 ? (
                   <div className="text-center text-gray-500 py-12 bg-white/5 rounded-2xl border border-white/5">No campaigns yet.</div>
               ) : (
                   myVideos.map(video => (
                       <GlassCard key={video.id} className="border border-white/10 flex flex-col md:flex-row gap-4 items-center">
                           <div className="w-full md:w-40 aspect-video bg-black rounded-lg overflow-hidden relative">
                               <img src={video.thumbnail_url || `https://via.placeholder.com/640x360?text=${video.title}`} className="w-full h-full object-cover opacity-60" />
                               <div className="absolute inset-0 flex items-center justify-center">
                                   {video.status === 'active' ? <PlayCircle className="text-green-500"/> : <Pause className="text-yellow-500"/>}
                               </div>
                           </div>
                           <div className="flex-1 w-full">
                               <div className="flex justify-between mb-2">
                                   <h3 className="font-bold text-white text-sm line-clamp-1">{video.title}</h3>
                                   <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded ${video.status === 'active' ? 'bg-green-500/20 text-green-400' : 'bg-yellow-500/20 text-yellow-400'}`}>{video.status}</span>
                               </div>
                               <div className="grid grid-cols-3 gap-2 text-xs mb-3">
                                   <div className="bg-white/5 p-2 rounded text-center">
                                       <p className="text-gray-500 text-[9px] uppercase">Budget</p>
                                       <p className="text-white font-mono">৳{video.remaining_budget.toFixed(2)}</p>
                                   </div>
                                   <div className="bg-white/5 p-2 rounded text-center">
                                       <p className="text-gray-500 text-[9px] uppercase">CPV</p>
                                       <p className="text-white font-mono">৳{video.cost_per_view}</p>
                                   </div>
                                   <div className="bg-white/5 p-2 rounded text-center">
                                       <p className="text-gray-500 text-[9px] uppercase">Est. Views</p>
                                       <p className="text-white font-mono">{Math.floor(video.remaining_budget / video.cost_per_view)}</p>
                                   </div>
                               </div>
                               <div className="flex gap-2">
                                   <button onClick={() => handleToggleStatus(video)} className="flex-1 py-1.5 bg-white/5 hover:bg-white/10 rounded text-xs font-bold text-white border border-white/10">
                                       {video.status === 'active' ? 'Pause' : 'Resume'}
                                   </button>
                                   <button onClick={() => handleDeleteAd(video.id)} className="px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded border border-red-500/20 flex items-center gap-1">
                                       <Trash2 size={14}/> Delete
                                   </button>
                               </div>
                           </div>
                       </GlassCard>
                   ))
               )}
           </div>
       )}
    </div>
  );
};

interface VideoCardProps {
    video: any;
    mode: 'earn' | 'history';
    onClick: () => void;
}

const VideoCard: React.FC<VideoCardProps> = ({ video, mode, onClick }) => (
    <motion.div 
       whileHover={{ y: -5 }}
       className="cursor-pointer h-full"
       onClick={onClick}
    >
       <GlassCard className={`p-0 overflow-hidden border transition group h-full flex flex-col ${mode === 'history' ? 'border-white/5 bg-white/5 grayscale' : 'border-white/10 hover:border-red-500/50'}`}>
           <div className="relative aspect-video bg-black">
               <img src={video.thumbnail_url || `https://via.placeholder.com/640x360?text=Video`} alt={video.title} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition" />
               <div className="absolute inset-0 flex items-center justify-center">
                   <div className={`w-12 h-12 rounded-full flex items-center justify-center shadow-lg group-hover:scale-110 transition ${mode === 'history' ? 'bg-blue-600/80' : 'bg-red-600'}`}>
                       {mode === 'history' ? <RotateCcw size={24} className="text-white"/> : <PlayCircle fill="white" className="text-white" size={24} />}
                   </div>
               </div>
               <div className="absolute bottom-2 right-2 bg-black/80 text-white text-[10px] font-bold px-2 py-1 rounded flex items-center gap-1">
                   <Clock size={10}/> {video.duration}s
               </div>
               {mode === 'history' && (
                   <div className="absolute top-2 right-2 bg-black/60 text-gray-300 text-[10px] font-bold px-2 py-1 rounded backdrop-blur-sm">
                       Watched
                   </div>
               )}
           </div>
           <div className="p-4 flex-1 flex flex-col">
               <h3 className="font-bold text-white text-sm line-clamp-2 mb-2">{video.title}</h3>
               
               <div className="flex items-center gap-2 mb-3">
                   <div className="w-5 h-5 rounded-full bg-white/10 overflow-hidden border border-white/10">
                        {video.profiles && video.profiles.avatar_1 ? (
                            <img src={video.profiles.avatar_1} className="w-full h-full object-cover" />
                        ) : (
                            <div className="w-full h-full bg-blue-500 flex items-center justify-center text-[8px] font-bold text-white">U</div>
                        )}
                   </div>
                   <p className="text-[10px] text-gray-400 truncate">{video.profiles ? video.profiles.name_1 : 'Ad Runner'}</p>
               </div>

               <div className="mt-auto flex justify-between items-center pt-3 border-t border-white/5">
                   {mode === 'earn' ? (
                       <>
                           <p className="text-[10px] text-gray-500 font-bold uppercase">Earn</p>
                           <span className="text-green-400 font-bold font-mono text-sm bg-green-900/20 px-2 py-0.5 rounded border border-green-900/30">
                               +<BalanceDisplay amount={video.cost_per_view} />
                           </span>
                       </>
                   ) : (
                       <p className="text-xs text-blue-300 w-full text-center font-bold">Watch Again (No Reward)</p>
                   )}
               </div>
           </div>
       </GlassCard>
    </motion.div>
);

export default Video;
