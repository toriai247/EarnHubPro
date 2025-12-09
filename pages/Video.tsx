
import React, { useState, useEffect } from 'react';
import GlassCard from '../components/GlassCard';
import { PlayCircle, Plus, X, CheckCircle2, AlertTriangle, MonitorPlay, Trash2, Pause, Play, BarChart3, Youtube, Clock, DollarSign, Eye, Globe, Code, Link as LinkIcon, Facebook, Video as VideoIcon, Instagram } from 'lucide-react';
import { supabase } from '../integrations/supabase/client';
import { motion, AnimatePresence } from 'framer-motion';
import { updateWallet, createTransaction } from '../lib/actions';
import { useUI } from '../context/UIContext';
import BalanceDisplay from '../components/BalanceDisplay';
import { VideoAd, UserProfile, WalletData } from '../types';
import Loader from '../components/Loader';

const Video: React.FC = () => {
  const { toast, confirm } = useUI();
  const [activeTab, setActiveTab] = useState<'watch' | 'create' | 'manage'>('watch');
  
  // Data
  const [videos, setVideos] = useState<VideoAd[]>([]);
  const [myVideos, setMyVideos] = useState<VideoAd[]>([]);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [wallet, setWallet] = useState<WalletData | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Creator Form
  const [form, setForm] = useState({
      title: '',
      rawInput: '', 
      duration: 30,
      views: 100,
      costPerView: 0.50
  });
  
  // Processed Video State
  const [processedVideo, setProcessedVideo] = useState<{ url: string, type: 'iframe' | 'video', platform: string } | null>(null);

  // Watch State
  const [activeVideo, setActiveVideo] = useState<VideoAd | null>(null);
  const [timeLeft, setTimeLeft] = useState(0);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [isTabActive, setIsTabActive] = useState(true);
  const [canClaim, setCanClaim] = useState(false);
  const [claiming, setClaiming] = useState(false);

  useEffect(() => {
      fetchData();
  }, []);

  const fetchData = async () => {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const [profRes, walletRes, adsRes] = await Promise.all([
          supabase.from('profiles').select('*').eq('id', session.user.id).single(),
          supabase.from('wallets').select('*').eq('user_id', session.user.id).single(),
          supabase.from('video_ads').select('*').eq('status', 'active').gt('remaining_budget', 0.1).order('created_at', {ascending: false})
      ]);

      if (profRes.data) setProfile(profRes.data as UserProfile);
      if (walletRes.data) setWallet(walletRes.data as WalletData);
      if (adsRes.data) setVideos(adsRes.data as VideoAd[]);

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

  // --- SMART VIDEO PARSER ENGINE ---
  const getEmbedInfo = (input: string) => {
      if (!input) return null;
      input = input.trim();

      // 1. Check for Raw Iframe Code
      if (input.startsWith('<iframe') || input.includes('</iframe>')) {
          const srcMatch = input.match(/src=["']([^"']+)["']/);
          if (srcMatch) return { url: srcMatch[1], type: 'iframe', platform: 'Embed Code' };
      }

      // 2. Direct Video Files (MP4, WebM, OGG)
      if (input.match(/\.(mp4|webm|ogg|mov)(\?.*)?$/i)) {
          return { url: input, type: 'video', platform: 'Direct File' };
      }

      // 3. YouTube (Watch, Shorts, Embed, ShortLink)
      // Fixes Error 153 by adding origin and enabling JS API
      const ytMatch = input.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|shorts\/|live\/))([\w-]{11})/);
      if (ytMatch && ytMatch[1]) {
          const origin = window.location.origin;
          return { 
              url: `https://www.youtube.com/embed/${ytMatch[1]}?autoplay=0&rel=0&modestbranding=1&playsinline=1&enablejsapi=1&origin=${origin}`, 
              type: 'iframe', 
              platform: 'YouTube' 
          };
      }

      // 4. Facebook
      if (input.includes('facebook.com') || input.includes('fb.watch')) {
          if (input.includes('plugins/video.php')) {
               return { url: input, type: 'iframe', platform: 'Facebook' };
          }
          const encodedUrl = encodeURIComponent(input);
          return { 
              url: `https://www.facebook.com/plugins/video.php?href=${encodedUrl}&show_text=false&t=0`, 
              type: 'iframe', 
              platform: 'Facebook' 
          };
      }

      // 5. Vimeo
      const vimeoMatch = input.match(/vimeo\.com\/(?:channels\/(?:\w+\/)?|groups\/(?:[^\/]*)\/videos\/|album\/(?:\d+)\/video\/|video\/|)(\d+)/);
      if (vimeoMatch && vimeoMatch[1]) {
          return { 
              url: `https://player.vimeo.com/video/${vimeoMatch[1]}`, 
              type: 'iframe', 
              platform: 'Vimeo' 
          };
      }

      // 6. Instagram
      if (input.includes('instagram.com')) {
          const clean = input.split('?')[0].replace(/\/$/, '');
          return {
              url: `${clean}/embed`,
              type: 'iframe',
              platform: 'Instagram'
          }
      }

      // 7. TikTok
      if (input.includes('tiktok.com')) {
           const videoIdMatch = input.match(/video\/(\d+)/);
           if (videoIdMatch) {
               return {
                   url: `https://www.tiktok.com/embed/v2/${videoIdMatch[1]}`,
                   type: 'iframe',
                   platform: 'TikTok'
               }
           }
      }

      // 8. Google Drive
      if (input.includes('drive.google.com')) {
          const driveUrl = input.replace('/view', '/preview');
          return { url: driveUrl, type: 'iframe', platform: 'Google Drive' };
      }

      // 9. Fallback: Treat as direct iframe source if it looks like a URL
      if (input.startsWith('http')) {
          return { url: input, type: 'iframe', platform: 'Web Link' };
      }

      return null;
  };

  // Live Preview Logic
  useEffect(() => {
      const timer = setTimeout(() => {
          const info = getEmbedInfo(form.rawInput);
          // @ts-ignore
          setProcessedVideo(info);
      }, 800); // Debounce slightly longer for smoother typing
      return () => clearTimeout(timer);
  }, [form.rawInput]);


  // --- SECURE WATCH LOGIC ---
  useEffect(() => {
      const handleVisibilityChange = () => {
          if (document.hidden) {
              setIsTabActive(false);
              setIsTimerRunning(false);
          } else {
              setIsTabActive(true);
              if (activeVideo && timeLeft > 0) setIsTimerRunning(true);
          }
      };
      
      const handleBlur = () => { setIsTabActive(false); setIsTimerRunning(false); };
      const handleFocus = () => { setIsTabActive(true); if (activeVideo && timeLeft > 0) setIsTimerRunning(true); };

      document.addEventListener("visibilitychange", handleVisibilityChange);
      window.addEventListener("blur", handleBlur);
      window.addEventListener("focus", handleFocus);

      return () => {
          document.removeEventListener("visibilitychange", handleVisibilityChange);
          window.removeEventListener("blur", handleBlur);
          window.removeEventListener("focus", handleFocus);
      };
  }, [activeVideo, timeLeft]);

  useEffect(() => {
      let interval: any;
      if (isTimerRunning && timeLeft > 0 && isTabActive) {
          interval = setInterval(() => {
              setTimeLeft((prev) => {
                  if (prev <= 1) {
                      setCanClaim(true);
                      setIsTimerRunning(false);
                      return 0;
                  }
                  return prev - 1;
              });
          }, 1000);
      }
      return () => clearInterval(interval);
  }, [isTimerRunning, timeLeft, isTabActive]);

  const handleOpenVideo = (video: VideoAd) => {
      const info = getEmbedInfo(video.video_url); // Re-parse to ensure correct format
      if (!info) {
          toast.error("Video format not supported");
          return;
      }
      // Override the stored URL with the freshly parsed one to ensure updated logic applies
      setActiveVideo({ ...video, video_url: info.url });
      setTimeLeft(video.duration);
      setCanClaim(false);
      setIsTimerRunning(true);
      setIsTabActive(true);
  };

  const handleClaimReward = async () => {
      if (!activeVideo || !canClaim || !profile) return;
      setClaiming(true);
      
      try {
          const { data, error } = await supabase.rpc('claim_video_reward', {
              p_ad_id: activeVideo.id,
              p_user_id: profile.id
          });

          if (error) throw error;
          if (!data.success) throw new Error(data.message);

          toast.success(`Reward Claimed: ৳${activeVideo.cost_per_view.toFixed(2)}`);
          setActiveVideo(null);
          fetchData(); 
      } catch (e: any) {
          toast.error("Claim Failed: " + e.message);
          setActiveVideo(null);
      } finally {
          setClaiming(false);
      }
  };

  // --- CREATOR LOGIC ---
  const handleCreateAd = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!wallet || !profile) return;

      if (!processedVideo) { toast.error("Invalid Video URL or Embed Code"); return; }

      const totalBudget = form.views * form.costPerView;
      if (wallet.deposit_balance < totalBudget) {
          toast.error(`Insufficient Deposit Balance. Need ৳${totalBudget.toFixed(2)}`);
          return;
      }

      if (!await confirm(`Launch Video Ad? \nTotal Budget: ৳${totalBudget.toFixed(2)}\nViews: ${form.views}`)) return;

      try {
          await updateWallet(profile.id, totalBudget, 'decrement', 'deposit_balance');
          await createTransaction(profile.id, 'invest', totalBudget, `Video Ad Campaign: ${form.title}`);

          // Determine Thumbnail
          let thumb = 'https://via.placeholder.com/640x360?text=Video+Ad';
          const ytMatch = processedVideo.url.match(/embed\/([\w-]{11})/);
          if (ytMatch) {
              thumb = `https://img.youtube.com/vi/${ytMatch[1]}/mqdefault.jpg`;
          }

          const { error } = await supabase.from('video_ads').insert({
              creator_id: profile.id,
              title: form.title,
              video_url: processedVideo.url, // Save the parsed URL
              thumbnail_url: thumb,
              duration: form.duration,
              total_budget: totalBudget,
              remaining_budget: totalBudget,
              cost_per_view: form.costPerView,
              status: 'active'
          });

          if (error) throw error;
          
          toast.success("Ad Campaign Launched!");
          setForm({ title: '', rawInput: '', duration: 30, views: 100, costPerView: 0.50 });
          setProcessedVideo(null);
          setActiveTab('manage');

      } catch (e: any) {
          toast.error(e.message);
      }
  };

  const handleToggleStatus = async (ad: VideoAd) => {
      const newStatus = ad.status === 'active' ? 'paused' : 'active';
      await supabase.from('video_ads').update({ status: newStatus }).eq('id', ad.id);
      fetchMyAds();
  };

  const handleDeleteAd = async (id: string) => {
      if (!await confirm("Delete Ad? Remaining budget will NOT be automatically refunded (contact support).")) return;
      
      const { error } = await supabase.from('video_ads').delete().eq('id', id);
      
      if (error) {
          toast.error("Delete Failed: " + error.message);
      } else {
          toast.success("Ad Deleted Successfully");
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
               <p className="text-gray-400 text-xs">Secure video tasks. Keep tab open to earn.</p>
           </div>
           
           {canUpload && (
               <div className="flex bg-[#111] p-1 rounded-xl border border-white/10">
                   <button onClick={() => setActiveTab('watch')} className={`px-4 py-2 rounded-lg text-xs font-bold ${activeTab === 'watch' ? 'bg-white text-black' : 'text-gray-400'}`}>Watch</button>
                   <button onClick={() => setActiveTab('manage')} className={`px-4 py-2 rounded-lg text-xs font-bold ${activeTab === 'manage' ? 'bg-white text-black' : 'text-gray-400'}`}>My Ads</button>
                   <button onClick={() => setActiveTab('create')} className={`px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-1 ${activeTab === 'create' ? 'bg-red-600 text-white' : 'text-gray-400'}`}><Plus size={14}/> Upload</button>
               </div>
           )}
       </header>

       {/* --- WATCH TAB --- */}
       {activeTab === 'watch' && (
           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
               {videos.length === 0 ? (
                   <div className="col-span-full text-center py-20 text-gray-500 bg-white/5 rounded-2xl border border-white/5">
                       <Youtube size={48} className="mx-auto mb-4 opacity-50"/>
                       <p>No active videos available right now.</p>
                   </div>
               ) : (
                   videos.map(video => (
                       <motion.div 
                           key={video.id}
                           whileHover={{ y: -5 }}
                           className="cursor-pointer"
                           onClick={() => handleOpenVideo(video)}
                       >
                           <GlassCard className="p-0 overflow-hidden border border-white/10 hover:border-red-500/50 transition group">
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
                               <div className="p-4">
                                   <h3 className="font-bold text-white text-sm line-clamp-1 mb-1">{video.title}</h3>
                                   <div className="flex justify-between items-center">
                                       <p className="text-[10px] text-gray-500">Sponsored Ad</p>
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

       {/* --- CREATE TAB --- */}
       {activeTab === 'create' && canUpload && (
           <GlassCard className="max-w-2xl mx-auto border-red-500/20">
               <form onSubmit={handleCreateAd} className="space-y-4">
                   <div>
                       <label className="text-xs font-bold text-gray-400 mb-1 block uppercase">Video Title</label>
                       <input required type="text" value={form.title} onChange={e => setForm({...form, title: e.target.value})} className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white focus:border-red-500 outline-none" placeholder="e.g. My Promo Video" />
                   </div>
                   
                   <div>
                       <label className="text-xs font-bold text-gray-400 mb-1 block uppercase">Video Link or Embed Code</label>
                       <div className="relative">
                           <input 
                                required 
                                type="text" 
                                value={form.rawInput} 
                                onChange={e => setForm({...form, rawInput: e.target.value})} 
                                className="w-full bg-black/40 border border-white/10 rounded-xl p-3 pl-10 text-white focus:border-red-500 outline-none font-mono text-xs" 
                                placeholder="Paste URL (YouTube, FB, etc) or <iframe> code" 
                           />
                           <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
                               {processedVideo?.platform === 'Embed Code' ? <Code size={16}/> : <LinkIcon size={16}/>}
                           </div>
                       </div>
                       
                       {/* Platform Detection Badge */}
                       {processedVideo && (
                           <div className="mt-2 flex items-center gap-2">
                               <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase flex items-center gap-1 bg-green-500/20 text-green-400 border border-green-500/30`}>
                                   {processedVideo.platform === 'YouTube' ? <Youtube size={10} /> :
                                    processedVideo.platform === 'Facebook' ? <Facebook size={10} /> :
                                    processedVideo.platform === 'Instagram' ? <Instagram size={10} /> :
                                    <Globe size={10} />}
                                   {processedVideo.platform} Detected
                               </span>
                           </div>
                       )}
                   </div>

                   {/* LIVE PREVIEW SECTION */}
                   {processedVideo && (
                       <div className="bg-black/30 border border-white/10 rounded-xl p-3 mt-2">
                           <p className="text-[10px] text-gray-500 font-bold uppercase mb-2 flex items-center gap-1"><Eye size={10}/> Preview</p>
                           <div className="aspect-video w-full rounded-lg overflow-hidden bg-black border border-white/5 relative">
                                {processedVideo.type === 'video' ? (
                                    <video 
                                        src={processedVideo.url} 
                                        controls 
                                        className="w-full h-full object-contain"
                                    />
                                ) : (
                                    <iframe 
                                        src={processedVideo.url}
                                        className="w-full h-full"
                                        frameBorder="0"
                                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                        allowFullScreen
                                        title="Preview"
                                    ></iframe>
                                )}
                           </div>
                       </div>
                   )}

                   <div className="grid grid-cols-2 gap-4">
                       <div>
                           <label className="text-xs font-bold text-gray-400 mb-1 block uppercase">Watch Duration (Sec)</label>
                           <input required type="number" min="10" max="180" value={form.duration} onChange={e => setForm({...form, duration: parseInt(e.target.value)})} className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white focus:border-red-500 outline-none" />
                       </div>
                       <div>
                           <label className="text-xs font-bold text-gray-400 mb-1 block uppercase">Total Views</label>
                           <input required type="number" min="50" value={form.views} onChange={e => setForm({...form, views: parseInt(e.target.value)})} className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white focus:border-red-500 outline-none" />
                       </div>
                   </div>
                   <div>
                       <label className="text-xs font-bold text-gray-400 mb-1 block uppercase">Cost Per View (BDT)</label>
                       <input required type="number" step="0.01" min="0.10" value={form.costPerView} onChange={e => setForm({...form, costPerView: parseFloat(e.target.value)})} className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white focus:border-red-500 outline-none" />
                   </div>

                   <div className="bg-red-900/10 border border-red-500/20 p-4 rounded-xl flex justify-between items-center mt-6">
                       <span className="text-xs text-red-400 font-bold uppercase">Total Budget Required</span>
                       <span className="text-2xl font-black text-white">৳{(form.views * form.costPerView).toFixed(2)}</span>
                   </div>

                   <button type="submit" className="w-full py-3 bg-red-600 text-white font-bold rounded-xl hover:bg-red-500 transition shadow-lg mt-4 flex items-center justify-center gap-2">
                       <MonitorPlay size={18} /> Launch Campaign
                   </button>
               </form>
           </GlassCard>
       )}

       {/* --- MANAGE TAB --- */}
       {activeTab === 'manage' && canUpload && (
           <div className="space-y-4">
               {myVideos.length === 0 ? (
                   <div className="text-center text-gray-500 py-12">No campaigns yet.</div>
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

       {/* SECURE WATCH MODAL */}
       <AnimatePresence>
           {activeVideo && (
               <motion.div 
                   initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                   className="fixed inset-0 z-50 bg-black/95 flex flex-col items-center justify-center p-4 backdrop-blur-sm"
               >
                   <div className="w-full max-w-4xl flex justify-between items-center mb-4">
                       <div className="flex items-center gap-3">
                           <div className={`w-3 h-3 rounded-full animate-pulse ${isTabActive ? 'bg-green-500' : 'bg-red-500'}`}></div>
                           <div>
                               <h3 className="text-white font-bold text-sm md:text-lg">{activeVideo.title}</h3>
                               <p className={`text-[10px] font-bold uppercase ${isTabActive ? 'text-green-400' : 'text-red-400'}`}>
                                   {isTabActive ? 'Secure Connection Active' : 'Focus Lost - Timer Paused'}
                               </p>
                           </div>
                       </div>
                       <button onClick={() => setActiveVideo(null)} className="p-2 bg-white/10 rounded-full text-white hover:bg-white/20 transition">
                           <X size={24} />
                       </button>
                   </div>

                   <div className="w-full max-w-4xl aspect-video bg-black rounded-2xl overflow-hidden border border-white/10 relative shadow-2xl">
                        {/* Unified Player */}
                        {activeVideo.video_url.match(/\.(mp4|webm|ogg|mov)(\?.*)?$/i) ? (
                            <video 
                                src={activeVideo.video_url} 
                                className="w-full h-full object-contain"
                                controls
                                controlsList="nodownload"
                                autoPlay
                            />
                        ) : (
                            <iframe 
                                src={activeVideo.video_url} 
                                className="w-full h-full"
                                frameBorder="0"
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                allowFullScreen
                                title="Advertisement"
                            ></iframe>
                        )}
                       
                       {!isTabActive && (
                           <div className="absolute inset-0 bg-black/95 flex flex-col items-center justify-center z-50 backdrop-blur-md">
                               <AlertTriangle size={48} className="text-yellow-500 mb-4 animate-bounce" />
                               <h2 className="text-2xl font-bold text-white mb-2">Watch Paused</h2>
                               <p className="text-gray-400 text-sm max-w-xs text-center">
                                   To earn rewards, you must keep this tab open and focused.
                               </p>
                               <button 
                                onClick={() => setIsTabActive(true)}
                                className="mt-6 px-6 py-2 bg-white text-black font-bold rounded-full hover:bg-gray-200"
                               >
                                Resume Watching
                               </button>
                           </div>
                       )}
                   </div>

                   <div className="w-full max-w-4xl mt-6 flex flex-col md:flex-row gap-6 items-center justify-between">
                       <div className="flex-1 w-full bg-white/5 p-4 rounded-2xl border border-white/5 flex items-center gap-4">
                           <div className="relative w-12 h-12 flex items-center justify-center">
                               <svg className="w-full h-full -rotate-90">
                                   <circle cx="24" cy="24" r="20" stroke="#333" strokeWidth="4" fill="none" />
                                   <circle 
                                       cx="24" cy="24" r="20" stroke={isTabActive ? "#10b981" : "#ef4444"} strokeWidth="4" fill="none" 
                                       strokeDasharray="125.6"
                                       strokeDashoffset={(125.6 * (activeVideo.duration - timeLeft)) / activeVideo.duration}
                                       className="transition-all duration-1000 ease-linear"
                                   />
                               </svg>
                               <span className="absolute text-[10px] font-bold text-white">{timeLeft}s</span>
                           </div>
                           <div className="flex-1">
                               <p className="text-gray-400 text-xs uppercase font-bold mb-1">Watching...</p>
                               <div className="h-2 w-full bg-black/50 rounded-full overflow-hidden">
                                   <div 
                                       className={`h-full transition-all duration-1000 ${isTabActive ? 'bg-green-500' : 'bg-red-500'}`}
                                       style={{ width: `${((activeVideo.duration - timeLeft) / activeVideo.duration) * 100}%` }}
                                   ></div>
                               </div>
                           </div>
                       </div>

                       <div className="w-full md:w-auto">
                           {canClaim ? (
                               <button 
                                   onClick={handleClaimReward}
                                   disabled={claiming}
                                   className="w-full md:w-64 py-4 bg-green-500 text-black font-black text-lg uppercase tracking-wider rounded-xl hover:bg-green-400 transition shadow-[0_0_30px_rgba(34,197,94,0.4)] flex items-center justify-center gap-2 animate-pulse"
                               >
                                   {claiming ? 'Processing...' : <><CheckCircle2 size={24} /> CLAIM REWARD</>}
                               </button>
                           ) : (
                               <button disabled className="w-full md:w-64 py-4 bg-white/5 text-gray-500 font-bold uppercase tracking-wider rounded-xl border border-white/5 flex items-center justify-center gap-2 cursor-not-allowed">
                                   <Clock size={18} /> Wait {timeLeft}s
                               </button>
                           )}
                       </div>
                   </div>
               </motion.div>
           )}
       </AnimatePresence>
    </div>
  );
};

export default Video;
