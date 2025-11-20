import React from 'react';
import GlassCard from '../../components/GlassCard';
import { AlertCircle, PlayCircle } from 'lucide-react';

const VideoManagement: React.FC = () => {
  return (
    <div className="space-y-4 animate-fade-in">
         <h2 className="text-2xl font-bold text-white">Video Oversight</h2>
         <div className="bg-yellow-500/10 border border-yellow-500/20 p-4 rounded-xl text-yellow-200 text-sm flex items-center gap-2">
             <AlertCircle size={16} /> 3 New videos pending approval
         </div>
         <div className="space-y-2">
             {[1,2,3].map(i => (
                 <GlassCard key={i} className="flex items-center justify-between">
                     <div className="flex items-center gap-4">
                         <div className="w-16 h-10 bg-black/50 rounded-lg flex items-center justify-center"><PlayCircle size={20} className="text-gray-500"/></div>
                         <div>
                             <h4 className="font-bold text-white text-sm">User Submission #{100+i}</h4>
                             <p className="text-xs text-gray-400">Submitted 2h ago</p>
                         </div>
                     </div>
                     <div className="flex gap-2">
                         <button className="px-3 py-1 bg-green-500/20 text-green-400 text-xs rounded font-bold">Approve</button>
                         <button className="px-3 py-1 bg-red-500/20 text-red-400 text-xs rounded font-bold">Reject</button>
                     </div>
                 </GlassCard>
             ))}
         </div>
    </div>
  );
};

export default VideoManagement;