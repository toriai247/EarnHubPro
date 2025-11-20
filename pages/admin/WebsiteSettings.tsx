import React from 'react';
import GlassCard from '../../components/GlassCard';

const WebsiteSettings: React.FC = () => {
  return (
    <div className="space-y-4 animate-fade-in">
        <h2 className="text-2xl font-bold text-white">Site Configuration</h2>
        <GlassCard className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h4 className="font-bold text-white">Maintenance Mode</h4>
                    <p className="text-xs text-gray-400">Disable user access immediately</p>
                </div>
                <div className="w-12 h-6 bg-gray-700 rounded-full relative cursor-pointer"><div className="w-4 h-4 bg-white rounded-full absolute top-1 left-1"></div></div>
            </div>
            
            <div className="h-px bg-white/10"></div>
            
            <div className="flex items-center justify-between">
                <div>
                    <h4 className="font-bold text-white">Sign-up Bonus Amount</h4>
                    <p className="text-xs text-gray-400">Default bonus for new registrations</p>
                </div>
                <div className="flex items-center gap-2">
                    <span className="text-white">$</span>
                    <input type="number" defaultValue={120} className="w-20 bg-black/30 rounded p-2 text-white text-right border border-white/10 focus:border-neon-green outline-none" />
                </div>
            </div>

            <div className="h-px bg-white/10"></div>

            <div className="space-y-2">
                <h4 className="font-bold text-white">Global Announcement</h4>
                <textarea className="w-full bg-black/30 border border-white/10 rounded-xl p-3 text-white text-sm h-24 focus:border-neon-green outline-none" placeholder="Enter message to show on all user dashboards..."></textarea>
                <button className="px-4 py-2 bg-royal-600 text-white text-sm font-bold rounded-lg">Update Announcement</button>
            </div>
        </GlassCard>
    </div>
  );
};

export default WebsiteSettings;