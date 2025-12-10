
import React, { useState, useEffect } from 'react';
import GlassCard from '../components/GlassCard';
import { PlayCircle, Plus, MonitorPlay, Trash2, Pause, Clock, Youtube, Video as VideoIcon, User } from 'lucide-react';
import { supabase } from '../integrations/supabase/client';
import { motion } from 'framer-motion';
import { useUI } from '../context/UIContext';
import BalanceDisplay from '../components/BalanceDisplay';
import { VideoAd, UserProfile } from '../types';
import Loader from '../components/Loader';
import { Link, useNavigate } from 'react-router-dom';

const Video: React.FC = () => {
  const { toast, confirm } = useUI();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'watch' | 'create' | 'manage'>('watch');
  
  // Data
  const [videos, setVideos] = useState<VideoAd[]>([]);
  const [myVideos, setMyVideos] = useState<VideoAd[]>([]);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Creator Form (Simplified for this view, mostly reused)
  const [form, setForm] = useState({
      title: '',
      videoUrl: '', 
      duration: 30,
      views: 100,
      costPerView: 0.50
  });

  useEffect(() => {
      fetchData();
  }, []);

  const fetchData = async () => {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const [profRes, adsRes] = await Promise.all([
          supabase.from('profiles').select('*').eq('id', session.user.id).single(),
          supabase.from('video_ads').select('*, profiles:creator_id(name_1, avatar_1)').eq('status', 'active').gt('remaining_budget', 0.1).order('created_at', {ascending: false})
      ]);

      if (profRes.data) setProfile(profRes.data as UserProfile);
      if (adsRes.data) setVideos(adsRes.data as any);

      setLoading(false);
  };

  const fetchMyAds = async () => {
      if (!profile) return;
      const { data } = await supabase.from('video_ads').select('*').eq('creator_id', profile.id).order('created_at', {ascending: false});
      if (data) setMyVideos(data as VideoAd[]);
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
               <p className="text-gray-400 text-xs">Watch videos to earn rewards. Daily limits apply per video.</p>
           </div>
           
           {canUpload && (
               <div className="flex bg-[#111] p-1 rounded-xl border border-white/10">
                   <button onClick={() => setActiveTab('watch')} className={`px-4 py-2 rounded-lg text-xs font-bold ${activeTab === 'watch' ? 'bg-white text-black' : 'text-gray-400'}`}>Watch</button>
                   <button onClick={() => setActiveTab('manage')} className={`px-4 py-2 rounded-lg text-xs font-bold ${activeTab === 'manage' ? 'bg-white text-black' : 'text-gray-400'}`}>My Ads</button>
                   <Link to="/advertise" className={`px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-1 ${activeTab === 'create' ? 'bg-red-600 text-white' : 'text-gray-400 hover:text-white'}`}><Plus size={14}/> Create</Link>
               </div>
           )}
       </header>

       {/* --- WATCH TAB --- */}
       {activeTab === 'watch' && (
           <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
               {videos.length === 0 ? (
                   <div className="col-span-full text-center py-20 text-gray-500 bg-white/5 rounded-2xl border border-white/5">
                       <Youtube size={48} className="mx-auto mb-4 opacity-50"/>
                       <p>No active videos available right now.</p>
                   </div>
               ) : (
                   videos.map((video: any) => (
                       <motion.div 
                           key={video.id}
                           whileHover={{ y: -5 }}
                           className="cursor-pointer"
                           onClick={() => navigate(`/video/watch/${video.id}`)}
                       >
                           <GlassCard className="p-0 overflow-hidden border border-white/10 hover:border-red-500/50 transition group h-full flex flex-col">
                               <div className="relative aspect-video bg-black">
                                   <img src={video.thumbnail_url || `https://via.placeholder.com/640x360?text=${video.title}`} alt={video.title} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition" />
                                   <div className="absolute inset-0 flex items-center justify-center">
                                       <div className="w-12 h-12 bg-red-600 rounded-full flex items-center justify-center shadow-lg group-hover:scale-110 transition">
                                           <PlayCircle fill="white" className="text-white" size={24} />
                                       </div>
                                   </div>
                                   <div className="absolute bottom-2 right-2 bg-black/80 text-white text-[10px] font-bold px-2 py-1 rounded flex items-center gap-1">
                                       <Clock size={10}/> {video.duration}s
                                   </div>
                               </div>
                               <div className="p-4 flex-1 flex flex-col">
                                   <h3 className="font-bold text-white text-sm line-clamp-1 mb-2">{video.title}</h3>
                                   
                                   <div className="flex items-center gap-2 mb-3">
                                       <div className="w-5 h-5 rounded-full bg-white/10 overflow-hidden">
                                            <img src={video.profiles?.avatar_1 || `https://api.dicebear.com/7.x/avataaars/svg?seed=${video.creator_id}`} className="w-full h-full object-cover" />
                                       </div>
                                       <p className="text-[10px] text-gray-400 truncate">{video.profiles?.name_1 || 'Ad Runner'}</p>
                                   </div>

                                   <div className="mt-auto flex justify-between items-center pt-3 border-t border-white/5">
                                       <p className="text-[10px] text-gray-500 font-bold uppercase">Earn</p>
                                       <span className="text-green-400 font-bold font-mono text-sm bg-green-900/20 px-2 py-0.5 rounded border border-green-900/30">
                                           +<BalanceDisplay amount={video.cost_per_view} />
                                       </span>
                                   </div>
                               </div>
                           </GlassCard>
                       </motion.div>
                   ))
               )}
           </div>
       )}

       {/* --- MANAGE TAB --- */}
       {activeTab === 'manage' && canUpload && (
           <div className="space-y-4">
               {myVideos.length === 0 ? (
                   <div className="text-center text-gray-500 py-12 bg-white/5 rounded-2xl border border-white/5">No campaigns yet.</div>
               ) : (
                   myVideos.map(video => (
                       <GlassCard key={video.id} className="border border-white/10 flex flex-col md:flex-row gap-4 items-center">
                           <div className="w-full md:w-40 aspect-video bg-black rounded-lg overflow-hidden relative">
                               <img src={video.thumbnail_url} className="w-full h-full object-cover opacity-60" />
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

export default Video;
