
import React, { useEffect, useState } from 'react';
import GlassCard from '../components/GlassCard';
import { 
    Users, Copy, Trophy, Crown, Share2, UserPlus, Calendar, Activity, 
    Link as LinkIcon, TrendingUp, Search, Wallet, Percent, User, 
    MessageCircle, Megaphone, Check, Facebook, Twitter, Instagram, 
    Send, Globe, Phone, Briefcase, QrCode, Download, Image as ImageIcon,
    Sparkles, Zap, ChevronRight, Share, ArrowRight
} from 'lucide-react';
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
  const [kitSubTab, setKitSubTab] = useState<'text' | 'graphics'>('text');
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

  const MARKETING_TEMPLATES = [
      {
          id: 'bangla_post',
          label: 'FB Post (Bangla)',
          icon: Facebook,
          color: 'text-blue-500',
          text: `🔥 ঘরে বসে প্রতিদিন ৫০০-১০০০ টাকা ইনকাম করতে চান? 💸\n\nNaxxivo তে জয়েন করুন আর স্মার্টফোন দিয়ে আয় করুন!\n✅ ভিডিও দেখুন, গেম খেলুন\n✅ পেমেন্ট বিকাশ/নগদ এ\n✅ ১০০% ট্রাস্টেড সাইট\n\nদেরি না করে এখনই জয়েন করুন 👇\n{{LINK}}\n\nরেফার কোড: {{CODE}}`
      },
      {
          id: 'bangla_short',
          label: 'WA/Messenger',
          icon: MessageCircle,
          color: 'text-green-500',
          text: `দোস্ত, এই অ্যাপটা দেখ! 😲 আমি এখান থেকে টাকা পেয়েছি। তুইও ট্রাই কর। জয়েনিং বোনাস আছে! \nলিংক: {{LINK}}\nকোড: {{CODE}}`
      },
      {
          id: 'english_pro',
          label: 'LinkedIn (EN)',
          icon: Briefcase,
          color: 'text-blue-400',
          text: `Discover the future of digital earning with Naxxivo. 🚀\n\nA secure, transparent ecosystem for passive income through tasks and investments. \n\nGet started with a welcome bonus: {{LINK}}\nInvite Code: {{CODE}}`
      },
      {
          id: 'english_hype',
          label: 'Viral Caption',
          icon: TrendingUp,
          color: 'text-red-400',
          text: `🚀 Stop scrolling and start earning! 🤑\n\nMake money daily with Naxxivo. Instant withdrawals. No experience needed.\n\nJoin my node: {{LINK}}\nCode: {{CODE}}`
      }
  ];

  const VISUAL_ASSETS = [
      {
          id: 'story_1',
          name: 'Classic Story',
          aspect: 'aspect-[9/16]',
          bg: 'bg-gradient-to-br from-brand to-yellow-600',
          title: 'DAILY REVENUE',
          sub: 'Join the Top 1% of digital earners.',
          type: 'Story'
      },
      {
          id: 'post_1',
          name: 'Institutional Post',
          aspect: 'aspect-square',
          bg: 'bg-black border-4 border-brand',
          title: 'NAXXIVO GLOBAL',
          sub: 'Institutional-Grade Asset Portfolio.',
          type: 'Feed'
      },
      {
          id: 'banner_1',
          name: 'Mega Bonus',
          aspect: 'aspect-video',
          bg: 'bg-gradient-to-r from-purple-600 via-brand to-orange-600',
          title: 'CLAIM ৳12,000',
          sub: 'New User Registration Protocol Active.',
          type: 'Banner'
      }
  ];

  const copyTemplate = (id: string, text: string) => {
      const link = getReferralLink();
      const code = stats?.code || '';
      const finalText = text.replace('{{LINK}}', link).replace('{{CODE}}', code);
      navigator.clipboard.writeText(finalText);
      setCopiedTemplateId(id);
      toast.success("Template copied!");
      setTimeout(() => setCopiedTemplateId(null), 2000);
  };

  const filteredUsers = referredUsers.filter(u => u.name.toLowerCase().includes(searchQuery.toLowerCase()));

  if (loading) return <div className="min-h-screen bg-void flex items-center justify-center"><Skeleton className="w-10 h-10 rounded-full" /></div>;

  return (
    <div className="pb-32 sm:pl-20 sm:pt-6 space-y-8 px-4 sm:px-0 font-sans selection:bg-brand selection:text-black">
       
       <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 pt-4">
            <div className="space-y-1">
                <h1 className="text-4xl font-black text-white uppercase tracking-tighter flex items-center gap-3">
                    <Users className="text-brand" size={36} /> GROWTH <span className="text-brand">BASE</span>
                </h1>
                <p className="text-muted text-[10px] font-black uppercase tracking-[0.3em] pl-1">Network Expansion Protocol v2.1</p>
            </div>
            <div className="flex bg-panel p-1 rounded-2xl border border-border-base relative w-full md:w-auto shadow-xl">
                {['invite', 'kit', 'network'].map((t) => (
                    <button 
                        key={t}
                        onClick={() => setActiveTab(t as any)} 
                        className={`flex-1 md:flex-none relative px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all z-10 ${activeTab === t ? 'text-black' : 'text-muted hover:text-white'}`}
                    >
                        {activeTab === t && (
                            <motion.div layoutId="inviteTab" className="absolute inset-0 bg-brand rounded-xl shadow-glow" />
                        )}
                        <span className="relative z-20 flex items-center justify-center gap-2">
                            {t === 'invite' && <UserPlus size={14} />}
                            {t === 'kit' && <Megaphone size={14} />}
                            {t === 'network' && <Globe size={14} />}
                            {t}
                        </span>
                    </button>
                ))}
            </div>
       </header>

       <AnimatePresence mode="wait">
       {activeTab === 'invite' && (
         <motion.div key="invite" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <GlassCard className="md:col-span-2 text-center p-10 bg-panel border-white/5 relative overflow-hidden rounded-5xl">
                    {/* Background Shine */}
                    <div className="absolute -top-20 -left-20 w-80 h-80 bg-brand/5 blur-[100px] pointer-events-none"></div>
                    
                    <div className="relative z-10 space-y-6">
                        <div className="w-20 h-20 bg-brand text-black rounded-3xl flex items-center justify-center mx-auto shadow-yellow-pop animate-float">
                            <Crown size={40} />
                        </div>
                        <h2 className="text-3xl font-black text-white uppercase tracking-tighter">Elite Commission</h2>
                        <p className="text-gray-500 text-xs font-medium max-w-sm mx-auto leading-relaxed">
                            Initialize your referral node. Earn <span className="text-white font-black">৳100</span> per activation + <span className="text-brand font-black">5% lifetime</span> yield from every network transaction.
                        </p>
                        
                        <div className="bg-void p-5 rounded-[2rem] border border-white/10 flex flex-col sm:flex-row items-center justify-between gap-6 shadow-inner">
                            <div className="text-left w-full sm:w-auto">
                                <p className="text-[9px] text-gray-600 font-black uppercase tracking-widest mb-1 ml-1">Terminal ID</p>
                                <div className="flex items-center gap-4">
                                    <span className="font-mono text-4xl text-white tracking-widest font-black uppercase">{stats?.code}</span>
                                    <button onClick={copyToClipboard} className="text-brand hover:text-white transition active:scale-90"><Copy size={20}/></button>
                                </div>
                            </div>
                            <button onClick={() => setShowShareModal(true)} className="w-full sm:w-auto py-4 px-8 bg-brand rounded-2xl font-black text-black text-xs uppercase tracking-widest flex items-center justify-center gap-3 hover:bg-white transition-all shadow-yellow-pop active:scale-95">
                                <Share size={16} strokeWidth={3} /> BROADCAST LINK
                            </button>
                        </div>
                    </div>
                </GlassCard>

                <div className="space-y-4">
                    <div className="p-6 bg-panel border border-white/5 rounded-[2.5rem] flex flex-col justify-center h-full relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-4 opacity-5"><TrendingUp size={80}/></div>
                        <p className="text-[10px] text-gray-600 font-black uppercase tracking-widest mb-1">Network Yield</p>
                        <p className="text-4xl font-black text-brand font-mono leading-none tracking-tighter">
                            <BalanceDisplay amount={stats?.totalEarned} isNative />
                        </p>
                        <div className="flex items-center gap-2 mt-4 text-[9px] text-gray-500 font-bold uppercase tracking-widest">
                            <Activity size={12} className="text-brand"/> Instant Liquidity
                        </div>
                    </div>
                    <div className="p-6 bg-panel border border-white/5 rounded-[2.5rem] flex flex-col justify-center h-full relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-4 opacity-5"><Users size={80}/></div>
                        <p className="text-[10px] text-gray-600 font-black uppercase tracking-widest mb-1">Active Nodes</p>
                        <p className="text-4xl font-black text-white leading-none tracking-tighter">{stats?.invitedUsers}</p>
                        <div className="flex items-center gap-2 mt-4 text-[9px] text-gray-500 font-bold uppercase tracking-widest">
                            <Zap size={12} className="text-blue-500"/> Capacity: Unlimited
                        </div>
                    </div>
                </div>
            </div>

            <GoogleAd slot="3493119845" layout="in-article" />
         </motion.div>
       )}

       {activeTab === 'kit' && (
           <motion.div key="kit" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
               <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
                    <div className="bg-blue-900/10 border border-blue-500/20 p-5 rounded-[2.5rem] flex-1">
                        <h3 className="font-black text-white uppercase flex items-center gap-2 text-lg tracking-tighter">
                            <Megaphone size={20} className="text-blue-400" /> MARKETING ENGINE
                        </h3>
                        <p className="text-xs text-blue-200/60 font-bold mt-1 uppercase tracking-widest">Deploy high-conversion assets to your audience.</p>
                    </div>
                    <div className="flex bg-panel p-1 rounded-xl border border-border-base w-full md:w-auto">
                        <button 
                            onClick={() => setKitSubTab('text')}
                            className={`flex-1 md:flex-none px-6 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${kitSubTab === 'text' ? 'bg-white text-black' : 'text-gray-500 hover:text-white'}`}
                        >
                            Templates
                        </button>
                        <button 
                            onClick={() => setKitSubTab('graphics')}
                            className={`flex-1 md:flex-none px-6 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${kitSubTab === 'graphics' ? 'bg-white text-black' : 'text-gray-500 hover:text-white'}`}
                        >
                            Graphics
                        </button>
                    </div>
               </div>

               <AnimatePresence mode="wait">
               {kitSubTab === 'text' ? (
                   <motion.div key="text" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {MARKETING_TEMPLATES.map((tmpl) => (
                            <GlassCard key={tmpl.id} className="p-6 border-white/5 hover:border-brand/40 transition group cursor-pointer flex flex-col h-full !rounded-[2.5rem] bg-panel">
                                <div className="flex justify-between items-start mb-4">
                                    <div className="flex items-center gap-3">
                                        <div className={`p-2.5 rounded-xl bg-void border border-white/10 ${tmpl.color}`}>
                                            <tmpl.icon size={20} />
                                        </div>
                                        <div>
                                            <h4 className="text-sm font-black text-white uppercase tracking-tighter">{tmpl.label}</h4>
                                            <p className="text-[8px] text-gray-500 font-bold uppercase tracking-widest">Optimized Copy</p>
                                        </div>
                                    </div>
                                    <button 
                                        onClick={() => copyTemplate(tmpl.id, tmpl.text)}
                                        className={`p-2.5 rounded-xl transition-all ${copiedTemplateId === tmpl.id ? 'bg-success text-black' : 'bg-white/5 text-gray-400 group-hover:bg-brand group-hover:text-black'}`}
                                    >
                                        {copiedTemplateId === tmpl.id ? <Check size={16} strokeWidth={3} /> : <Copy size={16} />}
                                    </button>
                                </div>
                                <div className="bg-void p-5 rounded-2xl border border-white/5 flex-1 relative group">
                                    <p className="text-xs text-gray-400 whitespace-pre-wrap font-medium leading-relaxed italic">
                                        {tmpl.text.replace('{{LINK}}', '[Referral Link]').replace('{{CODE}}', stats?.code || 'XXXXXX')}
                                    </p>
                                    <div className="absolute inset-0 bg-gradient-to-t from-void via-transparent to-transparent opacity-40 rounded-2xl"></div>
                                </div>
                            </GlassCard>
                        ))}
                   </motion.div>
               ) : (
                   <motion.div key="graphics" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-10">
                       
                       {/* 1. DYNAMIC QR GENERATOR */}
                       <GlassCard className="!rounded-[2.5rem] bg-panel border-white/5 p-8 flex flex-col md:flex-row items-center gap-10">
                            <div className="p-4 bg-white rounded-3xl shadow-2xl relative group">
                                <QrCode size={160} className="text-black" />
                                <div className="absolute inset-0 bg-brand/90 flex items-center justify-center rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity">
                                     <Download size={48} className="text-black" />
                                </div>
                            </div>
                            <div className="flex-1 text-center md:text-left space-y-4">
                                <h3 className="text-2xl font-black text-white uppercase tracking-tighter">Your Personal QR Code</h3>
                                <p className="text-sm text-gray-400 max-w-sm font-medium leading-relaxed">
                                    Scanning this automatically links users to your node. Print it or add it to your social media stories for seamless onboarding.
                                </p>
                                <div className="flex gap-3">
                                    <button className="px-6 py-3 bg-white text-black font-black text-[10px] uppercase tracking-widest rounded-xl hover:bg-gray-200 transition active:scale-95 shadow-lg">
                                        Download PNG
                                    </button>
                                    <button className="px-6 py-3 bg-white/5 border border-white/10 text-white font-black text-[10px] uppercase tracking-widest rounded-xl hover:bg-white/10 transition active:scale-95">
                                        Save Vector (SVG)
                                    </button>
                                </div>
                            </div>
                       </GlassCard>

                       {/* 2. SOCIAL STORY PREVIEWS */}
                       <div className="space-y-4">
                           <h3 className="text-[10px] font-black text-gray-500 uppercase tracking-[0.3em] pl-1">Social Assets Preview</h3>
                           <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                               {VISUAL_ASSETS.map((asset) => (
                                   <div key={asset.id} className="space-y-3 group">
                                        <div className={`${asset.aspect} w-full ${asset.bg} rounded-[2rem] border-2 border-white/10 overflow-hidden relative shadow-2xl group-hover:scale-[1.02] transition-transform duration-500`}>
                                            {/* Design Elements */}
                                            <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-20"></div>
                                            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
                                            
                                            <div className="absolute inset-x-6 top-8 flex justify-between items-center">
                                                <div className="w-10 h-10 rounded-xl bg-black border border-white/20 flex items-center justify-center">
                                                    <span className="text-brand font-black text-xl leading-none">N</span>
                                                </div>
                                                <div className="bg-white/20 backdrop-blur-md px-3 py-1 rounded-full border border-white/20 text-[8px] font-black text-white uppercase tracking-widest">
                                                    Official Node
                                                </div>
                                            </div>

                                            <div className="absolute inset-x-6 bottom-8 space-y-2">
                                                <h4 className="text-2xl font-black text-white uppercase leading-none tracking-tighter drop-shadow-lg">{asset.title}</h4>
                                                <p className="text-[10px] text-white/80 font-bold uppercase tracking-widest drop-shadow-lg">{asset.sub}</p>
                                                
                                                <div className="pt-4 flex items-center gap-3">
                                                    <div className="bg-white text-black font-black text-[9px] px-3 py-1.5 rounded-lg shadow-xl uppercase">JOIN NOW</div>
                                                    <div className="text-[10px] font-mono text-white/60 font-bold">ref: {stats?.code}</div>
                                                </div>
                                            </div>

                                            <div className="absolute inset-0 bg-brand/10 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-[2px]">
                                                 <button className="bg-white text-black p-4 rounded-full shadow-2xl scale-0 group-hover:scale-100 transition-transform duration-500">
                                                     <Download size={24} strokeWidth={3}/>
                                                 </button>
                                            </div>
                                        </div>
                                        <div className="flex justify-between items-center px-2">
                                            <div>
                                                <p className="text-sm font-bold text-white uppercase tracking-tighter">{asset.name}</p>
                                                <p className="text-[9px] text-gray-600 font-bold uppercase">{asset.type} Template</p>
                                            </div>
                                            <button className="p-2 text-gray-500 hover:text-brand transition"><Share2 size={16}/></button>
                                        </div>
                                   </div>
                               ))}
                           </div>
                       </div>

                       <div className="bg-panel border border-border-base p-8 rounded-[3rem] text-center space-y-4">
                           <Sparkles size={48} className="text-brand mx-auto opacity-30" />
                           <h3 className="text-xl font-black text-white uppercase tracking-tighter">Need Custom Brand Assets?</h3>
                           <p className="text-sm text-gray-500 max-w-sm mx-auto leading-relaxed">
                               Top network influencers get access to exclusive design resources and high-res source files. Reach Level 5 to unlock.
                           </p>
                           <button className="text-brand font-black text-xs uppercase tracking-widest hover:underline flex items-center gap-2 mx-auto pt-2">
                               Creator Guidelines <ChevronRight size={14} strokeWidth={3}/>
                           </button>
                       </div>
                   </motion.div>
               )}
               </AnimatePresence>
           </motion.div>
       )}

       {activeTab === 'network' && (
           <motion.div key="network" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
               <div className="flex items-center gap-3">
                   <div className="relative flex-1">
                       <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-600" size={18}/>
                       <input 
                         type="text" 
                         placeholder="Search network nodes..." 
                         value={searchQuery}
                         onChange={e => setSearchQuery(e.target.value)}
                         className="w-full bg-panel border border-border-base rounded-2xl py-4 pl-12 pr-4 text-sm text-white focus:border-brand outline-none transition-all shadow-inner"
                       />
                   </div>
               </div>
               
               {referredUsers.length === 0 ? (
                   <div className="text-center py-24 bg-panel rounded-5xl border border-white/5 flex flex-col items-center">
                       <div className="w-20 h-20 bg-void rounded-3xl flex items-center justify-center mb-6 border border-white/10">
                           <Users size={40} className="text-gray-700" />
                       </div>
                       <h3 className="text-white font-black uppercase text-xl tracking-tighter">No Connections</h3>
                       <p className="text-gray-600 text-sm mt-1 max-w-xs leading-relaxed">Broadcast your referral protocol to start populating your private network.</p>
                       <button onClick={() => setActiveTab('invite')} className="mt-8 text-brand font-black text-xs uppercase tracking-widest flex items-center gap-2 hover:underline">
                           GENERATE CODE <ArrowRight size={14} strokeWidth={3}/>
                       </button>
                   </div>
               ) : (
                   <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                       {filteredUsers.map((user) => (
                           <GlassCard key={user.id} className="p-6 hover:bg-white/[0.02] transition border-white/5 rounded-[2.5rem] bg-panel">
                               <div className="flex items-center gap-5">
                                   <div className="relative shrink-0">
                                       <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-white/10 bg-black/30 shadow-2xl">
                                           {user.avatar ? (
                                              <img src={user.avatar} alt={user.name} className="w-full h-full object-cover" />
                                           ) : (
                                              <div className="w-full h-full flex items-center justify-center bg-gray-800 text-gray-500"><User size={24}/></div>
                                           )}
                                       </div>
                                       <div className="absolute -bottom-1 -right-1 bg-brand text-black text-[10px] font-black px-2 py-0.5 rounded-lg border-2 border-panel shadow-lg">
                                           L{user.level}
                                       </div>
                                   </div>
                                   
                                   <div className="flex-1 min-w-0">
                                       <h4 className="font-black text-white text-lg truncate flex items-center gap-2 tracking-tighter">
                                           {user.name}
                                           {user.earnedFrom > 0 && <Sparkles size={14} className="text-brand fill-current"/>}
                                       </h4>
                                       <div className="flex items-center gap-3 text-[10px] text-gray-500 font-bold mt-1 uppercase tracking-widest">
                                           <span className="flex items-center gap-1"><Calendar size={12}/> {new Date(user.date).toLocaleDateString()}</span>
                                           <span className={`px-2 py-0.5 rounded-full ${user.status === 'completed' ? 'bg-success/10 text-success' : 'bg-white/5 text-gray-600'}`}>
                                               {user.status === 'completed' ? 'Protocol Sync' : 'Initializing'}
                                           </span>
                                       </div>
                                   </div>
                               </div>
                               
                               <div className="mt-6 pt-5 border-t border-white/5 flex justify-between items-center">
                                   <div className="flex items-center gap-3">
                                       <div className="bg-void p-2 rounded-xl border border-white/5 text-gray-500">
                                           <Percent size={14}/>
                                       </div>
                                       <div>
                                           <p className="text-[9px] text-gray-600 font-black uppercase tracking-widest">Inflow Volume</p>
                                           <p className="text-white font-mono font-bold text-xs"><BalanceDisplay amount={user.volumeEst} /></p>
                                       </div>
                                   </div>
                                   <div className="text-right bg-brand/10 px-4 py-2 rounded-2xl border border-brand/20 shadow-glow">
                                       <p className="text-[9px] text-brand font-black uppercase tracking-widest mb-0.5">Your Cut</p>
                                       <p className={`font-mono font-black text-sm ${user.earnedFrom > 0 ? 'text-white' : 'text-gray-700'}`}>
                                           +<BalanceDisplay amount={user.earnedFrom} />
                                       </p>
                                   </div>
                               </div>
                           </GlassCard>
                       ))}
                   </div>
               )}
           </motion.div>
       )}
       </AnimatePresence>

       {/* Share Modal */}
       <AnimatePresence>
            {showShareModal && (
                <motion.div 
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-xl flex items-end sm:items-center justify-center p-4"
                    onClick={() => setShowShareModal(false)}
                >
                    <motion.div 
                        initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
                        className="bg-panel w-full max-w-sm rounded-t-[3rem] sm:rounded-[3rem] border border-white/10 p-8 shadow-2xl relative overflow-hidden"
                        onClick={e => e.stopPropagation()}
                    >
                        <div className="absolute top-0 left-0 w-full h-1 bg-brand"></div>
                        <h3 className="text-2xl font-black text-white mb-6 text-center uppercase tracking-tighter">Broadcaster</h3>
                        <div className="grid grid-cols-4 gap-4 mb-8">
                            <button onClick={() => handleSocialShare('whatsapp')} className="flex flex-col items-center gap-3 text-gray-500 hover:text-green-500 transition group">
                                <div className="w-14 h-14 bg-green-500/10 rounded-2xl flex items-center justify-center text-green-500 group-hover:bg-green-500 group-hover:text-black transition shadow-lg"><Phone size={24} /></div>
                                <span className="text-[9px] font-black uppercase tracking-widest">WhatsApp</span>
                            </button>
                            <button onClick={() => handleSocialShare('facebook')} className="flex flex-col items-center gap-3 text-gray-500 hover:text-blue-500 transition group">
                                <div className="w-14 h-14 bg-blue-600/10 rounded-2xl flex items-center justify-center text-blue-500 group-hover:bg-blue-600 group-hover:text-white transition shadow-lg"><Facebook size={24} /></div>
                                <span className="text-[9px] font-black uppercase tracking-widest">Facebook</span>
                            </button>
                            <button onClick={() => handleSocialShare('telegram')} className="flex flex-col items-center gap-3 text-gray-500 hover:text-blue-400 transition group">
                                <div className="w-14 h-14 bg-blue-400/10 rounded-2xl flex items-center justify-center text-blue-400 group-hover:bg-blue-400 group-hover:text-white transition shadow-lg"><Send size={24} /></div>
                                <span className="text-[9px] font-black uppercase tracking-widest">Telegram</span>
                            </button>
                            <button onClick={() => handleSocialShare('twitter')} className="flex flex-col items-center gap-3 text-gray-500 hover:text-sky-500 transition group">
                                <div className="w-14 h-14 bg-sky-500/10 rounded-2xl flex items-center justify-center text-sky-500 group-hover:bg-sky-500 group-hover:text-white transition shadow-lg"><Twitter size={24} /></div>
                                <span className="text-[9px] font-black uppercase tracking-widest">Twitter</span>
                            </button>
                        </div>
                        <button onClick={copyLink} className="w-full py-4 bg-white text-black rounded-2xl font-black text-xs uppercase tracking-widest transition-all hover:bg-brand flex items-center justify-center gap-3 mb-3 shadow-xl">
                            <LinkIcon size={16} strokeWidth={3} /> COPY SMART LINK
                        </button>
                        <button onClick={() => setShowShareModal(false)} className="w-full py-4 bg-white/5 border border-white/10 rounded-2xl text-[10px] font-black text-gray-500 uppercase tracking-widest hover:text-white transition-all">TERMINATE</button>
                    </motion.div>
                </motion.div>
            )}
       </AnimatePresence>
    </div>
  );
};

export default Invite;
