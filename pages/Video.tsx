
import React, { useState } from 'react';
import GlassCard from '../components/GlassCard';
import { PlayCircle, UploadCloud, Plus, X } from 'lucide-react';
import { supabase } from '../integrations/supabase/client';
import { motion, AnimatePresence } from 'framer-motion';
import { updateWallet, createTransaction } from '../lib/actions';
import { useUI } from '../context/UIContext';

const Video: React.FC = () => {
  const { toast } = useUI();
  const [watching, setWatching] = useState(false);
  const [showUpload, setShowUpload] = useState(false);
  const [videoUrl, setVideoUrl] = useState('');

  const handleWatch = async () => {
     setWatching(true);
     setTimeout(async () => {
         const { data: { session } } = await supabase.auth.getSession();
         if (session) {
             await updateWallet(session.user.id, 0.50, 'increment', 'balance');
             await createTransaction(session.user.id, 'earn', 0.50, 'Watched Video');
             toast.success('You earned $0.50! 🎉');
         }
         setWatching(false);
     }, 3000);
  };

  const handleUpload = (e: React.FormEvent) => {
      e.preventDefault();
      if(!videoUrl) {
          toast.error('Please enter a URL');
          return;
      }
      setShowUpload(false);
      setVideoUrl('');
      toast.success('Video submitted for review! Rewards soon.');
  };

  return (
    <div className="pb-24 sm:pl-20 sm:pt-6 space-y-6">
       <header className="flex justify-between items-center px-2">
           <h1 className="text-2xl font-bold text-white">Watch & Earn</h1>
           <button 
             onClick={() => setShowUpload(true)}
             className="bg-white/10 p-2 rounded-xl text-white hover:bg-white/20 transition flex items-center gap-2 text-xs font-bold"
           >
               <Plus size={16} /> Upload
           </button>
       </header>

       <div className="h-[60vh] flex items-center justify-center">
           <GlassCard className="text-center p-8 w-full max-w-md aspect-[9/16] flex flex-col items-center justify-center bg-black/40">
              <PlayCircle size={64} className="mx-auto text-royal-400 mb-4" />
              <h3 className="text-xl font-bold text-white mb-2">Sponsored Content</h3>
              <p className="text-gray-400 mb-8 text-sm">Watch full clip to earn rewards.</p>
              <button disabled={watching} onClick={handleWatch} className="w-full py-4 bg-neon-green text-black font-bold rounded-xl hover:scale-105 transition">
                 {watching ? 'Watching...' : 'Watch Video (+$0.50)'}
              </button>
           </GlassCard>
       </div>

       <AnimatePresence>
           {showUpload && (
               <motion.div 
                 initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                 className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
               >
                   <div className="bg-dark-900 w-full max-w-md rounded-2xl border border-white/10 p-6 relative">
                       <button onClick={() => setShowUpload(false)} className="absolute top-4 right-4 text-gray-400"><X size={20}/></button>
                       <h2 className="text-xl font-bold text-white mb-4">Upload Short</h2>
                       <p className="text-xs text-gray-400 mb-6">Share your earning success story. Approved videos earn $5.00.</p>
                       
                       <form onSubmit={handleUpload} className="space-y-4">
                           <div className="space-y-2">
                               <label className="text-xs font-bold text-gray-500">Video Link (TikTok/YouTube)</label>
                               <input 
                                 type="url" 
                                 value={videoUrl}
                                 onChange={e => setVideoUrl(e.target.value)}
                                 placeholder="https://..."
                                 className="w-full bg-black/30 border border-white/10 rounded-xl p-3 text-white text-sm"
                               />
                           </div>
                           <div className="border-2 border-dashed border-white/10 rounded-xl p-8 flex flex-col items-center justify-center text-gray-500 hover:border-neon-green/50 hover:text-neon-green transition cursor-pointer">
                               <UploadCloud size={32} className="mb-2" />
                               <span className="text-xs">Or upload file (MP4)</span>
                           </div>
                           <button type="submit" className="w-full py-3 bg-royal-600 text-white font-bold rounded-xl">Submit</button>
                       </form>
                   </div>
               </motion.div>
           )}
       </AnimatePresence>
    </div>
  );
};

export default Video;
