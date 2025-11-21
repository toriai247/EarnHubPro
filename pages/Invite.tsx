
import React, { useEffect, useState } from 'react';
import GlassCard from '../components/GlassCard';
import { Users, Copy, Trophy, Crown, Share2, UserPlus, Calendar, Activity, Link as LinkIcon } from 'lucide-react';
import { supabase } from '../integrations/supabase/client';
import { ReferralStats } from '../types';
import { motion } from 'framer-motion';
import Skeleton from '../components/Skeleton';

interface ReferredUser {
    id: string;
    date: string;
    earnedFrom: number;
    name_preview: string;
    status: string;
}

const Invite: React.FC = () => {
  const [stats, setStats] = useState<ReferralStats | null>(null);
  const [activeTab, setActiveTab] = useState<'invite' | 'network'>('invite');
  const [referredUsers, setReferredUsers] = useState<ReferredUser[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
        setLoading(true);
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
             const { count } = await supabase
               .from('referrals')
               .select('*', { count: 'exact', head: true })
               .eq('referrer_id', session.user.id);

             // Fetch earnings from Wallet for accuracy
             const { data: wallet } = await supabase
               .from('wallets')
               .select('referral_earnings')
               .eq('user_id', session.user.id)
               .single();
               
             const { data: profile } = await supabase.from('profiles').select('ref_code_1').eq('id', session.user.id).single();
             
             setStats({
                 code: profile?.ref_code_1 || '---',
                 invitedUsers: count || 0,
                 totalEarned: wallet?.referral_earnings || 0
             });

             // Fetch referral list with earned amounts
             const { data: myRefs } = await supabase
                .from('referrals')
                .select('*')
                .eq('referrer_id', session.user.id)
                .order('created_at', { ascending: false })
                .limit(50);

             if (myRefs && myRefs.length > 0) {
                 const refsList = await Promise.all(myRefs.map(async (r: any) => {
                     // Try to get name safely
                     const { data: p } = await supabase.from('profiles').select('name_1').eq('id', r.referred_id).maybeSingle();
                     return {
                         id: r.id,
                         date: r.created_at,
                         earnedFrom: r.earned,
                         name_preview: p?.name_1 || `User ${r.referred_id.slice(0,4)}..`,
                         status: r.status
                     };
                 }));
                 setReferredUsers(refsList);
             } else {
                 setReferredUsers([]);
             }
        }
        setLoading(false);
    };
    fetch();
  }, []);

  const copyToClipboard = () => {
      if (stats?.code) {
          navigator.clipboard.writeText(stats.code);
          alert('Referral code copied!');
      }
  };

  const getReferralLink = () => {
      if (!stats?.code) return '';
      // Construct link for HashRouter
      return `${window.location.origin}/#/signup?ref=${stats.code}`;
  };

  const copyLink = () => {
      const link = getReferralLink();
      if (link) {
          navigator.clipboard.writeText(link);
          alert('Referral link copied to clipboard!');
      }
  };

  const handleShare = async () => {
      const link = getReferralLink();
      if (!link) return;

      const shareData = {
          title: 'Join EarnHub Pro',
          text: `Use my referral code ${stats?.code} to join EarnHub Pro and earn rewards!`,
          url: link
      };

      if (navigator.share) {
          try {
              await navigator.share(shareData);
          } catch (err) {
              console.log('Share canceled');
          }
      } else {
          // Fallback
          copyLink();
      }
  };

  if (loading) {
      return (
        <div className="pb-24 sm:pl-20 sm:pt-6 space-y-6 px-4 sm:px-0">
            <Skeleton variant="text" className="w-48 h-8" />
            <Skeleton variant="rectangular" className="w-full h-64" />
            <div className="grid grid-cols-2 gap-4">
                <Skeleton variant="rectangular" className="h-32" />
                <Skeleton variant="rectangular" className="h-32" />
            </div>
        </div>
      );
  }

  if (!stats) return null;

  return (
    <div className="pb-24 sm:pl-20 sm:pt-6 space-y-6">
       <header className="flex items-center justify-between px-4 sm:px-0">
            <div>
                <h1 className="text-2xl font-display font-bold text-white">Refer & Earn</h1>
                <p className="text-xs text-gray-400">Build your team and earn 5% lifetime.</p>
            </div>
            <div className="bg-white/5 p-1 rounded-lg flex gap-1">
                <button onClick={() => setActiveTab('invite')} className={`px-3 py-1.5 text-xs font-bold rounded transition ${activeTab === 'invite' ? 'bg-neon-green text-black' : 'text-gray-400'}`}>Invite</button>
                <button onClick={() => setActiveTab('network')} className={`px-3 py-1.5 text-xs font-bold rounded transition ${activeTab === 'network' ? 'bg-neon-green text-black' : 'text-gray-400'}`}>My Network</button>
            </div>
       </header>

       {activeTab === 'invite' && (
         <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6 px-4 sm:px-0">
            <GlassCard className="text-center p-8 relative overflow-hidden border-neon-green/20">
                <div className="absolute top-0 right-0 w-40 h-40 bg-neon-green/10 blur-3xl rounded-full"></div>
                <Users size={48} className="mx-auto text-neon-glow mb-4" />
                <h2 className="text-2xl font-bold text-white mb-2">Invite Friends</h2>
                <p className="text-gray-400 text-sm mb-6">Share your code and earn <span className="text-neon-green font-bold">5%</span> of their earnings instantly.</p>
                
                <div className="bg-black/40 p-4 rounded-xl mb-6 flex items-center justify-between border border-white/10">
                    <div>
                        <p className="text-[10px] text-gray-500 text-left mb-1 font-bold uppercase">Your Unique Code</p>
                        <span className="font-mono text-3xl text-white tracking-widest font-bold uppercase">{stats.code}</span>
                    </div>
                    <div className="flex gap-2">
                        <button onClick={copyLink} className="p-3 hover:bg-white/10 rounded-lg transition text-blue-400 bg-blue-500/10 active:scale-95" title="Copy Link">
                            <LinkIcon size={20} />
                        </button>
                        <button onClick={copyToClipboard} className="p-3 hover:bg-white/10 rounded-lg transition text-neon-green bg-neon-green/10 active:scale-95" title="Copy Code">
                            <Copy size={20} />
                        </button>
                    </div>
                </div>

                <button onClick={handleShare} className="w-full py-3.5 bg-royal-600 rounded-xl font-bold text-white flex items-center justify-center gap-2 hover:bg-royal-700 transition shadow-lg active:scale-[0.98]">
                    <Share2 size={18} /> Share Link
                </button>
            </GlassCard>
            
            <div className="grid grid-cols-2 gap-4">
                <GlassCard className="text-center py-6">
                    <div className="text-3xl font-display font-bold text-white mb-1">{stats.invitedUsers}</div>
                    <div className="text-xs text-gray-400 font-bold uppercase">Friends Invited</div>
                </GlassCard>
                <GlassCard className="text-center py-6 bg-gradient-to-br from-white/5 to-neon-green/5 border-neon-green/20">
                    <div className="text-3xl font-display font-bold text-neon-glow mb-1">${stats.totalEarned.toFixed(4)}</div>
                    <div className="text-xs text-gray-400 font-bold uppercase">Total Earned</div>
                </GlassCard>
            </div>

            {/* Recent Activity Preview */}
            {referredUsers.length > 0 && (
                <div className="mt-6">
                     <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2"><Activity size={14} className="text-royal-400"/> Recent Recruits</h3>
                     <div className="space-y-2">
                         {referredUsers.slice(0, 3).map(user => (
                             <div key={user.id} className="flex items-center justify-between bg-white/5 p-3 rounded-xl border border-white/5">
                                 <div className="flex items-center gap-3">
                                     <div className="w-8 h-8 rounded-full bg-royal-600/20 text-royal-400 flex items-center justify-center text-xs font-bold uppercase">
                                         {user.name_preview.charAt(0)}
                                     </div>
                                     <div>
                                         <p className="text-sm font-bold text-white">{user.name_preview}</p>
                                         <p className="text-[10px] text-gray-500">Joined {new Date(user.date).toLocaleDateString()}</p>
                                     </div>
                                 </div>
                                 <div className="text-right">
                                    <p className="text-xs font-bold text-neon-green">+${user.earnedFrom.toFixed(4)}</p>
                                    <p className="text-[10px] text-gray-500">Earned</p>
                                 </div>
                             </div>
                         ))}
                         <button onClick={() => setActiveTab('network')} className="w-full py-2 text-xs text-gray-500 hover:text-white transition">View Full List</button>
                     </div>
                </div>
            )}
         </motion.div>
       )}

       {activeTab === 'network' && (
           <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3 px-4 sm:px-0">
               <div className="flex justify-between items-end mb-2">
                   <h3 className="text-sm font-bold text-gray-400">Your Network</h3>
                   <span className="text-xs text-neon-green font-bold">{referredUsers.length} Members</span>
               </div>
               
               {referredUsers.length === 0 ? (
                   <div className="text-center py-12 bg-white/5 rounded-2xl border border-white/5">
                       <UserPlus size={40} className="mx-auto text-gray-600 mb-3" />
                       <h3 className="text-white font-bold mb-1">No Referrals Yet</h3>
                       <p className="text-gray-500 text-sm mb-4">Share your code to start building your team.</p>
                       <button onClick={() => setActiveTab('invite')} className="text-neon-green text-sm font-bold hover:underline">Get Code</button>
                   </div>
               ) : (
                   <div className="space-y-2">
                       {referredUsers.map((user) => (
                           <GlassCard key={user.id} className="flex items-center justify-between p-3 hover:bg-white/5 transition">
                               <div className="flex items-center gap-3">
                                   <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-blue-600 rounded-full flex items-center justify-center text-white font-bold uppercase">
                                       {user.name_preview.charAt(0)}
                                   </div>
                                   <div>
                                       <h4 className="font-bold text-white text-sm">{user.name_preview}</h4>
                                       <div className="flex items-center gap-2 text-[10px] text-gray-400">
                                           <span className="bg-white/10 px-1.5 rounded text-white">{user.status}</span>
                                           <span>{new Date(user.date).toLocaleDateString()}</span>
                                       </div>
                                   </div>
                               </div>
                               <div className="text-right">
                                   <p className="text-[10px] text-gray-500 uppercase mb-0.5">Commission</p>
                                   <p className="text-neon-green font-mono font-bold text-sm">+${user.earnedFrom.toFixed(4)}</p>
                               </div>
                           </GlassCard>
                       ))}
                   </div>
               )}
           </motion.div>
       )}
    </div>
  );
};

export default Invite;
