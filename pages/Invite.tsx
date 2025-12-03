
import React, { useEffect, useState } from 'react';
import GlassCard from '../components/GlassCard';
import { Users, Copy, Trophy, Crown, Share2, UserPlus, Calendar, Activity, Link as LinkIcon, TrendingUp, Search, Wallet, Percent, User } from 'lucide-react';
import { supabase } from '../integrations/supabase/client';
import { ReferralStats } from '../types';
import Skeleton from '../components/Skeleton';
import { useUI } from '../context/UIContext';
import BalanceDisplay from '../components/BalanceDisplay';

interface ReferredUser {
    id: string;
    date: string;
    earnedFrom: number;
    name: string;
    avatar: string;
    level: number;
    status: string;
    volumeEst: number;
}

const Invite: React.FC = () => {
  const { toast } = useUI();
  const [stats, setStats] = useState<ReferralStats | null>(null);
  const [activeTab, setActiveTab] = useState<'invite' | 'network'>('invite');
  const [referredUsers, setReferredUsers] = useState<ReferredUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const fetch = async () => {
        setLoading(true);
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
             const { count } = await supabase
               .from('referrals')
               .select('*', { count: 'exact', head: true })
               .eq('referrer_id', session.user.id);

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

             const { data: myRefs } = await supabase
                .from('referrals')
                .select('*')
                .eq('referrer_id', session.user.id)
                .order('created_at', { ascending: false });

             if (myRefs && myRefs.length > 0) {
                 const refsList = await Promise.all(myRefs.map(async (r: any) => {
                     const { data: p } = await supabase.from('profiles').select('name_1, avatar_1, level_1').eq('id', r.referred_id).maybeSingle();
                     return {
                         id: r.id,
                         date: r.created_at,
                         earnedFrom: r.earned,
                         name: p?.name_1 || `User ${r.referred_id.slice(0,4)}..`,
                         avatar: p?.avatar_1,
                         level: p?.level_1 || 1,
                         status: r.status,
                         volumeEst: r.earned > 0 ? r.earned / 0.05 : 0
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
          toast.success('Referral code copied!');
      }
  };

  const getReferralLink = () => {
      if (!stats?.code) return '';
      return `${window.location.origin}/#/signup?ref=${stats.code}`;
  };

  const copyLink = () => {
      const link = getReferralLink();
      if (link) {
          navigator.clipboard.writeText(link);
          toast.success('Referral link copied!');
      }
  };

  const handleShare = async () => {
      const link = getReferralLink();
      if (!link) return;
      const shareData = { title: 'Join EarnHub Pro', text: `Use my code ${stats?.code} to earn rewards!`, url: link };
      if (navigator.share) {
          try { await navigator.share(shareData); } catch (err) { console.log('Share canceled'); }
      } else {
          copyLink();
      }
  };

  const filteredUsers = referredUsers.filter(u => u.name.toLowerCase().includes(searchQuery.toLowerCase()));

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
                <h1 className="text-2xl font-display font-bold text-white">Referral System</h1>
                <p className="text-xs text-gray-400 flex items-center gap-1">
                    Earn <span className="text-green-400 font-bold bg-green-900/20 px-1 rounded">5% Commission</span> on every deposit.
                </p>
            </div>
            <div className="bg-[#111] p-1 rounded-lg flex gap-1 border border-[#222]">
                <button onClick={() => setActiveTab('invite')} className={`px-3 py-1.5 text-xs font-bold rounded transition ${activeTab === 'invite' ? 'bg-white text-black' : 'text-gray-400'}`}>Invite</button>
                <button onClick={() => setActiveTab('network')} className={`px-3 py-1.5 text-xs font-bold rounded transition ${activeTab === 'network' ? 'bg-white text-black' : 'text-gray-400'}`}>My Team</button>
            </div>
       </header>

       {activeTab === 'invite' && (
         <div className="space-y-6 px-4 sm:px-0">
            <GlassCard className="text-center p-8 bg-[#111] border-[#222]">
                <div className="w-20 h-20 mx-auto bg-[#1a1a1a] rounded-full flex items-center justify-center mb-4 border border-[#333]">
                    <Users size={32} className="text-white" />
                </div>
                
                <h2 className="text-2xl font-bold text-white mb-2">Invite Friends</h2>
                <p className="text-gray-400 text-sm mb-6 max-w-xs mx-auto">
                    Share your code and earn <span className="text-green-400 font-bold">5%</span> of their earnings instantly.
                </p>
                
                <div className="bg-[#1a1a1a] p-4 rounded-xl mb-6 flex items-center justify-between border border-[#333]">
                    <div className="relative z-10">
                        <p className="text-[10px] text-gray-500 text-left mb-1 font-bold uppercase">Your Unique Code</p>
                        <span className="font-mono text-3xl text-white tracking-widest font-bold uppercase">{stats.code}</span>
                    </div>
                    <div className="flex gap-2 relative z-10">
                        <button onClick={copyLink} className="p-3 hover:bg-[#222] rounded-lg transition text-blue-400 bg-[#111]" title="Copy Link">
                            <LinkIcon size={20} />
                        </button>
                        <button onClick={copyToClipboard} className="p-3 hover:bg-[#222] rounded-lg transition text-green-400 bg-[#111]" title="Copy Code">
                            <Copy size={20} />
                        </button>
                    </div>
                </div>

                <button onClick={handleShare} className="w-full py-4 bg-brand rounded-xl font-bold text-white flex items-center justify-center gap-2 hover:bg-brand-hover transition shadow-lg">
                    <Share2 size={18} /> Share Link
                </button>
            </GlassCard>
            
            <div className="grid grid-cols-2 gap-4">
                <GlassCard className="text-center py-6">
                    <div className="text-3xl font-display font-bold text-white mb-1">{stats.invitedUsers}</div>
                    <div className="text-xs text-gray-400 font-bold uppercase">Friends Invited</div>
                </GlassCard>
                <GlassCard className="text-center py-6 border-green-500/20">
                    <div className="text-3xl font-display font-bold text-green-400 mb-1"><BalanceDisplay amount={stats.totalEarned} /></div>
                    <div className="text-xs text-gray-400 font-bold uppercase">Total Earned</div>
                </GlassCard>
            </div>
         </div>
       )}

       {activeTab === 'network' && (
           <div className="space-y-4 px-4 sm:px-0">
               
               <div className="flex items-center gap-3">
                   <div className="relative flex-1">
                       <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={16}/>
                       <input 
                         type="text" 
                         placeholder="Search network..." 
                         value={searchQuery}
                         onChange={e => setSearchQuery(e.target.value)}
                         className="w-full bg-[#111] border border-[#222] rounded-xl py-3 pl-10 pr-4 text-sm text-white focus:border-white outline-none"
                       />
                   </div>
                   <div className="bg-[#111] px-4 py-3 rounded-xl border border-[#222] text-center min-w-[100px]">
                       <p className="text-[10px] text-gray-500 uppercase font-bold">Team</p>
                       <p className="text-white font-bold">{referredUsers.length} Members</p>
                   </div>
               </div>
               
               {referredUsers.length === 0 ? (
                   <div className="text-center py-12 bg-[#111] rounded-2xl border border-[#222] flex flex-col items-center">
                       <div className="w-20 h-20 bg-[#1a1a1a] rounded-full flex items-center justify-center mb-4">
                           <UserPlus size={40} className="text-gray-500" />
                       </div>
                       <h3 className="text-white font-bold mb-1 text-lg">No Referrals Yet</h3>
                       <p className="text-gray-500 text-sm mb-6 max-w-xs">Share your code to start building your team.</p>
                       <button onClick={() => setActiveTab('invite')} className="text-green-400 text-sm font-bold hover:underline flex items-center gap-1">
                           Get Code <Share2 size={14}/>
                       </button>
                   </div>
               ) : (
                   <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                       {filteredUsers.map((user) => (
                           <GlassCard key={user.id} className="p-4 hover:bg-[#1a1a1a] transition border border-[#222]">
                               <div className="flex items-center gap-4">
                                   <div className="relative shrink-0">
                                       <div className="w-14 h-14 rounded-full overflow-hidden border-2 border-[#333] bg-black/30">
                                           {user.avatar ? (
                                              <img src={user.avatar} alt={user.name} className="w-full h-full object-cover" />
                                           ) : (
                                              <User size={24} className="text-gray-400" />
                                           )}
                                       </div>
                                       <div className="absolute -bottom-1 -right-1 bg-brand text-white text-[10px] font-bold px-1.5 py-0.5 rounded-md border border-black shadow-sm">
                                           L{user.level}
                                       </div>
                                   </div>
                                   
                                   <div className="flex-1 min-w-0">
                                       <h4 className="font-bold text-white text-base truncate flex items-center gap-2">
                                           {user.name}
                                           {user.earnedFrom > 0 && <Crown size={14} className="text-yellow-400 fill-yellow-400"/>}
                                       </h4>
                                       <div className="flex items-center gap-2 text-[10px] text-gray-400 mt-1">
                                           <span className="flex items-center gap-1"><Calendar size={10}/> {new Date(user.date).toLocaleDateString()}</span>
                                           <span className={`px-1.5 py-0.5 rounded ${user.status === 'completed' ? 'bg-green-900/20 text-green-400' : 'bg-gray-800 text-gray-400'}`}>
                                               {user.status === 'completed' ? 'Active' : 'Joined'}
                                           </span>
                                       </div>
                                   </div>
                               </div>
                               
                               <div className="mt-4 pt-3 border-t border-[#222] flex justify-between items-center">
                                   <div className="flex items-center gap-2">
                                       <div className="bg-[#111] p-1.5 rounded text-gray-400">
                                           <Percent size={14}/>
                                       </div>
                                       <div>
                                           <p className="text-[9px] text-gray-500 uppercase font-bold">Deposited Est.</p>
                                           <p className="text-white font-bold text-xs"><BalanceDisplay amount={user.volumeEst} /></p>
                                       </div>
                                   </div>
                                   <div className="text-right bg-green-900/10 px-3 py-1.5 rounded-lg border border-green-900/20">
                                       <p className="text-[9px] text-green-400 uppercase font-bold">Earned (5%)</p>
                                       <p className={`font-mono font-bold text-sm ${user.earnedFrom > 0 ? 'text-white' : 'text-gray-600'}`}>
                                           +<BalanceDisplay amount={user.earnedFrom} />
                                       </p>
                                   </div>
                               </div>
                           </GlassCard>
                       ))}
                   </div>
               )}
           </div>
       )}
    </div>
  );
};

export default Invite;
