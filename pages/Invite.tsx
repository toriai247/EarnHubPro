
import React, { useEffect, useState } from 'react';
import GlassCard from '../components/GlassCard';
import { Users, Copy, Trophy, Crown, Share2, UserPlus, Calendar, Activity, Link as LinkIcon, TrendingUp, Search, Wallet, Percent, User, MessageCircle, Megaphone, Check, Facebook, Twitter, Instagram, Send, Globe, Phone, Briefcase } from 'lucide-react';
import { supabase } from '../integrations/supabase/client';
import { ReferralStats } from '../types';
import Skeleton from '../components/Skeleton';
import { useUI } from '../context/UIContext';
import BalanceDisplay from '../components/BalanceDisplay';
import { motion, AnimatePresence } from 'framer-motion';
import GoogleAd from '../components/GoogleAd';

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
  const [activeTab, setActiveTab] = useState<'invite' | 'network' | 'kit'>('invite');
  const [referredUsers, setReferredUsers] = useState<ReferredUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedTemplateId, setCopiedTemplateId] = useState<string | null>(null);
  const [showShareModal, setShowShareModal] = useState(false);

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

  // --- SOCIAL SHARING LOGIC ---
  const handleSocialShare = (platform: string) => {
      const link = getReferralLink();
      const text = `Join Naxxivo and earn daily! Use my code ${stats?.code} for a bonus.`;
      const encodedText = encodeURIComponent(text);
      const encodedLink = encodeURIComponent(link);
      
      let url = '';
      switch(platform) {
          case 'whatsapp': url = `https://wa.me/?text=${encodedText}%20${encodedLink}`; break;
          case 'facebook': url = `https://www.facebook.com/sharer/sharer.php?u=${encodedLink}`; break;
          case 'telegram': url = `https://t.me/share/url?url=${encodedLink}&text=${encodedText}`; break;
          case 'twitter': url = `https://twitter.com/intent/tweet?text=${encodedText}&url=${encodedLink}`; break;
          case 'sms': url = `sms:?body=${encodedText}%20${encodedLink}`; break;
          default: 
              if (navigator.share) {
                  navigator.share({ title: 'Join Naxxivo', text: text, url: link });
                  return;
              }
              copyLink(); return;
      }
      
      if(url) window.open(url, '_blank');
      setShowShareModal(false);
  };

  // --- MARKETING TEMPLATES ---
  const MARKETING_TEMPLATES = [
      {
          id: 'bangla_post',
          label: 'Facebook Post (Bangla)',
          icon: Facebook,
          color: 'text-blue-500',
          text: `🔥 ঘরে বসে প্রতিদিন ৫০০-১০০০ টাকা ইনকাম করতে চান? 💸\n\nNaxxivo তে জয়েন করুন আর স্মার্টফোন দিয়ে আয় করুন!\n✅ ভিডিও দেখুন, গেম খেলুন\n✅ পেমেন্ট বিকাশ/নগদ এ\n✅ ১০০% ট্রাস্টেড সাইট\n\nদেরি না করে এখনই জয়েন করুন 👇\n{{LINK}}\n\nরেফার কোড: {{CODE}}`
      },
      {
          id: 'bangla_short',
          label: 'Messenger/Whatsapp (Bangla)',
          icon: MessageCircle,
          color: 'text-green-500',
          text: `দোস্ত, এই অ্যাপটা দেখ! 😲 আমি এখান থেকে টাকা পেয়েছি। তুইও ট্রাই কর। জয়েনিং বোনাস আছে! \nলিংক: {{LINK}}\nকোড: {{CODE}}`
      },
      {
          id: 'english_pro',
          label: 'Professional (LinkedIn/Twitter)',
          icon: Briefcase,
          color: 'text-blue-400',
          text: `Discover the future of digital earning with Naxxivo. 🚀\n\nA secure, transparent ecosystem for passive income through tasks and investments. \n\nGet started with a welcome bonus: {{LINK}}\nInvite Code: {{CODE}}`
      },
      {
          id: 'english_hype',
          label: 'Viral Short (TikTok/Reels)',
          icon: TrendingUp,
          color: 'text-red-400',
          text: `🚀 Stop scrolling and start earning! 🤑\n\nMake money daily with Naxxivo. Instant withdrawals. No experience needed.\n\nLink in bio or: {{LINK}}\nCode: {{CODE}}`
      },
      {
          id: 'hinglish',
          label: 'Hinglish (India/BD)',
          icon: Globe,
          color: 'text-orange-400',
          text: `Bhai, paisa kamana hai? 💸 Naxxivo try karo! Best earning app abhi market mein.\n\nDaily payout, easy tasks. Abhi join karo: {{LINK}}\nMera Code: {{CODE}}`
      },
      {
          id: 'crypto',
          label: 'Crypto Enthusiast',
          icon: Wallet,
          color: 'text-yellow-400',
          text: `💎 New Earning Gem Alert! 💎\n\nEarn USDT/BDT daily by completing simple tasks. Web3 ready ecosystem.\n\nClaim your airdrop bonus now: {{LINK}}\nRef: {{CODE}}`
      },
      {
          id: 'student',
          label: 'For Students',
          icon: User,
          color: 'text-purple-400',
          text: `🎓 Students! Want pocket money? 🎒\n\nWork 10 mins daily and earn monthly expenses. 100% Real.\n\nRegister here: {{LINK}}\nUse code: {{CODE}}`
      },
      {
          id: 'urgent',
          label: 'Urgent/Limited Time',
          icon: Activity,
          color: 'text-red-500',
          text: `⏳ LIMITED TIME OFFER! ⏳\n\nDouble signup bonus for the next 24 hours on Naxxivo. Don't miss out!\n\nGrab it now: {{LINK}}\nCode: {{CODE}}`
      },
      {
          id: 'proof',
          label: 'Payment Proof Caption',
          icon: Check,
          color: 'text-green-400',
          text: `✅ Payment Received! ✅\n\nJust got my withdrawal from Naxxivo. This site is paying 100% legit.\n\nJoin my team: {{LINK}}\nCode: {{CODE}}`
      },
      {
          id: 'gamer',
          label: 'Gamer Style',
          icon: Trophy,
          color: 'text-indigo-400',
          text: `🎮 Play Games, Earn Cash! 🎮\n\nLudo, Crash, Spin - turn your gaming skills into real money. \n\nStart playing: {{LINK}}\nCode: {{CODE}}`
      }
  ];

  const copyTemplate = (id: string, text: string) => {
      const link = getReferralLink();
      const code = stats?.code || '';
      const finalText = text.replace('{{LINK}}', link).replace('{{CODE}}', code);
      
      navigator.clipboard.writeText(finalText);
      setCopiedTemplateId(id);
      toast.success("Caption copied to clipboard!");
      
      setTimeout(() => setCopiedTemplateId(null), 2000);
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
       <header className="flex flex-col md:flex-row justify-between items-start md:items-end px-4 sm:px-0 gap-4">
            <div>
                <h1 className="text-2xl font-display font-bold text-white flex items-center gap-2">
                    <Users className="text-pink-500"/> Referral System
                </h1>
                <p className="text-xs text-gray-400 flex items-center gap-2 mt-1">
                    Earn <span className="text-green-400 font-bold bg-green-900/20 px-1.5 py-0.5 rounded border border-green-500/30">100 TK</span> per invite + 
                    <span className="text-blue-400 font-bold bg-blue-900/20 px-1.5 py-0.5 rounded border border-blue-500/30">5% Commission</span>
                </p>
            </div>
            <div className="flex bg-[#111] p-1 rounded-xl border border-[#222]">
                <button onClick={() => setActiveTab('invite')} className={`px-4 py-2 text-xs font-bold rounded-lg transition ${activeTab === 'invite' ? 'bg-white text-black' : 'text-gray-400'}`}>Invite</button>
                <button onClick={() => setActiveTab('kit')} className={`px-4 py-2 text-xs font-bold rounded-lg transition ${activeTab === 'kit' ? 'bg-white text-black' : 'text-gray-400'}`}>Market Kit</button>
                <button onClick={() => setActiveTab('network')} className={`px-4 py-2 text-xs font-bold rounded-lg transition ${activeTab === 'network' ? 'bg-white text-black' : 'text-gray-400'}`}>My Team</button>
            </div>
       </header>

       {/* AD PLACEMENT: IN-ARTICLE */}
       <div className="px-4 sm:px-0">
           <GoogleAd slot="3493119845" layout="in-article" />
       </div>

       {/* INVITE DASHBOARD */}
       {activeTab === 'invite' && (
         <div className="space-y-6 px-4 sm:px-0">
            <GlassCard className="text-center p-8 bg-[#111] border-[#222] relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none"><Share2 size={120} /></div>
                
                <div className="relative z-10">
                    <h2 className="text-2xl font-bold text-white mb-2">Grow Your Network</h2>
                    <p className="text-gray-400 text-sm mb-6 max-w-sm mx-auto">
                        Invite friends and earn <span className="text-green-400 font-bold">100 TK</span> instantly when they join. Plus 5% lifetime commission on their deposits.
                    </p>
                    
                    <div className="bg-[#1a1a1a] p-4 rounded-xl mb-6 flex flex-col sm:flex-row items-center justify-between border border-[#333] gap-4">
                        <div className="text-left w-full">
                            <p className="text-[10px] text-gray-500 font-bold uppercase mb-1">Your Code</p>
                            <div className="flex items-center gap-3">
                                <span className="font-mono text-3xl text-white tracking-widest font-bold uppercase">{stats.code}</span>
                                <button onClick={copyToClipboard} className="text-green-400 hover:text-green-300"><Copy size={18}/></button>
                            </div>
                        </div>
                        <div className="flex gap-2 w-full sm:w-auto">
                            <button onClick={() => setShowShareModal(true)} className="flex-1 sm:flex-none py-3 px-6 bg-brand rounded-xl font-bold text-white flex items-center justify-center gap-2 hover:bg-brand-hover transition shadow-lg whitespace-nowrap">
                                <Share2 size={18} /> Share Now
                            </button>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="p-4 bg-black/30 rounded-xl border border-white/5">
                            <p className="text-xs text-gray-500 uppercase font-bold">Invited</p>
                            <p className="text-2xl font-bold text-white">{stats.invitedUsers}</p>
                        </div>
                        <div className="p-4 bg-black/30 rounded-xl border border-white/5">
                            <p className="text-xs text-gray-500 uppercase font-bold">Earnings</p>
                            <p className="text-2xl font-bold text-green-400"><BalanceDisplay amount={stats.totalEarned} /></p>
                        </div>
                    </div>
                </div>
            </GlassCard>

            {/* Share Modal/Sheet */}
            <AnimatePresence>
                {showShareModal && (
                    <motion.div 
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-4"
                        onClick={() => setShowShareModal(false)}
                    >
                        <motion.div 
                            initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
                            className="bg-[#1a1a1a] w-full max-w-sm rounded-t-3xl sm:rounded-3xl border border-white/10 p-6 shadow-2xl"
                            onClick={e => e.stopPropagation()}
                        >
                            <h3 className="text-lg font-bold text-white mb-4 text-center">Share via</h3>
                            <div className="grid grid-cols-4 gap-4 mb-4">
                                <button onClick={() => handleSocialShare('whatsapp')} className="flex flex-col items-center gap-2 text-gray-300 hover:text-white group">
                                    <div className="w-12 h-12 bg-green-500/20 rounded-full flex items-center justify-center text-green-500 group-hover:bg-green-500 group-hover:text-black transition"><Phone size={20} /></div>
                                    <span className="text-[10px]">WhatsApp</span>
                                </button>
                                <button onClick={() => handleSocialShare('facebook')} className="flex flex-col items-center gap-2 text-gray-300 hover:text-white group">
                                    <div className="w-12 h-12 bg-blue-600/20 rounded-full flex items-center justify-center text-blue-500 group-hover:bg-blue-600 group-hover:text-white transition"><Facebook size={20} /></div>
                                    <span className="text-[10px]">Facebook</span>
                                </button>
                                <button onClick={() => handleSocialShare('telegram')} className="flex flex-col items-center gap-2 text-gray-300 hover:text-white group">
                                    <div className="w-12 h-12 bg-blue-400/20 rounded-full flex items-center justify-center text-blue-400 group-hover:bg-blue-400 group-hover:text-white transition"><Send size={20} /></div>
                                    <span className="text-[10px]">Telegram</span>
                                </button>
                                <button onClick={() => handleSocialShare('twitter')} className="flex flex-col items-center gap-2 text-gray-300 hover:text-white group">
                                    <div className="w-12 h-12 bg-sky-500/20 rounded-full flex items-center justify-center text-sky-500 group-hover:bg-sky-500 group-hover:text-white transition"><Twitter size={20} /></div>
                                    <span className="text-[10px]">Twitter</span>
                                </button>
                                <button onClick={() => handleSocialShare('sms')} className="flex flex-col items-center gap-2 text-gray-300 hover:text-white group">
                                    <div className="w-12 h-12 bg-yellow-500/20 rounded-full flex items-center justify-center text-yellow-500 group-hover:bg-yellow-500 group-hover:text-black transition"><MessageCircle size={20} /></div>
                                    <span className="text-[10px]">SMS</span>
                                </button>
                                <button onClick={() => handleSocialShare('copy')} className="flex flex-col items-center gap-2 text-gray-300 hover:text-white group">
                                    <div className="w-12 h-12 bg-gray-500/20 rounded-full flex items-center justify-center text-gray-400 group-hover:bg-white group-hover:text-black transition"><LinkIcon size={20} /></div>
                                    <span className="text-[10px]">Copy Link</span>
                                </button>
                            </div>
                            <button onClick={() => setShowShareModal(false)} className="w-full py-3 bg-white/5 rounded-xl text-sm font-bold text-gray-400 hover:bg-white/10 hover:text-white transition">Cancel</button>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
         </div>
       )}

       {/* MARKETING KIT */}
       {activeTab === 'kit' && (
           <div className="space-y-4 px-4 sm:px-0">
               <div className="bg-gradient-to-r from-purple-900/20 to-blue-900/20 p-4 rounded-xl border border-white/5">
                   <h3 className="font-bold text-white mb-1">Marketing Kit</h3>
                   <p className="text-xs text-gray-400">Copy these ready-made captions to boost your referrals.</p>
               </div>
               
               <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                   {MARKETING_TEMPLATES.map((tmpl) => (
                        <GlassCard key={tmpl.id} className="p-4 border border-[#222] hover:border-brand/30 transition group cursor-pointer flex flex-col h-full" onClick={() => copyTemplate(tmpl.id, tmpl.text)}>
                            <div className="flex justify-between items-start mb-3">
                                <div className="flex items-center gap-2">
                                    <div className={`p-2 rounded-lg bg-black/40 ${tmpl.color}`}>
                                        <tmpl.icon size={16} />
                                    </div>
                                    <h4 className="text-sm font-bold text-white">{tmpl.label}</h4>
                                </div>
                                <div className={`text-[10px] font-bold px-2 py-1 rounded transition ${copiedTemplateId === tmpl.id ? 'bg-green-500 text-black' : 'bg-[#222] text-gray-400 group-hover:bg-white group-hover:text-black'}`}>
                                    {copiedTemplateId === tmpl.id ? 'Copied!' : 'Copy'}
                                </div>
                            </div>
                            <div className="bg-[#111] p-3 rounded-lg border border-[#222] flex-1">
                                <p className="text-xs text-gray-400 whitespace-pre-wrap font-medium leading-relaxed">
                                    {tmpl.text.replace('{{LINK}}', '[Link]').replace('{{CODE}}', stats.code)}
                                </p>
                            </div>
                        </GlassCard>
                    ))}
               </div>
           </div>
       )}

       {/* NETWORK LIST */}
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
