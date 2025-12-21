import React from 'react';
import { Link } from 'react-router-dom';
import { 
  ArrowRight, Shield, Zap, Globe, Trophy, CheckCircle2, 
  Star, Quote, Activity, Users, DollarSign, Wallet, 
  PlayCircle, TrendingUp, ChevronRight, LayoutGrid,
  Briefcase, Gamepad2, Crown
} from 'lucide-react';
import { motion } from 'framer-motion';
import { useSimulation } from '../context/SimulationContext';
import BalanceDisplay from '../components/BalanceDisplay';
import GlassCard from '../components/GlassCard';
import Logo from '../components/Logo';

const Landing: React.FC = () => {
    const { onlineUsers, totalPaid, totalUsers, liveFeed } = useSimulation();

    const stats = [
        { label: 'Registered Node', value: totalUsers.toLocaleString(), icon: Users, color: 'text-blue-400' },
        { label: 'Protocol Payout', value: `৳${(totalPaid/1000).toFixed(0)}K`, icon: DollarSign, color: 'text-green-400' },
        { label: 'Live Active', value: onlineUsers.toLocaleString(), icon: Activity, color: 'text-brand' },
        { label: 'Uptime', value: '100%', icon: Shield, color: 'text-emerald-400' },
    ];

    const reviews = [
        { name: "Tanvir Hasan", rating: 5, text: "The fastest BDT withdrawal system I've used. Got my Nagad payout in 5 minutes.", category: "Withdrawal" },
        { name: "Bithi Akter", rating: 5, text: "Excellent tasks and high commissions for referrals. Highly recommended for students.", category: "Earnings" },
        { name: "Rubel Rana", rating: 4, text: "Space Crash is addicted! Won 2k today. System is very smooth and fair.", category: "Gaming" },
    ];

    return (
        <div className="min-h-screen bg-void text-main pb-20">
            
            {/* 1. PREMIUM HERO SECTION */}
            <section className="relative pt-24 pb-20 px-6 text-center overflow-hidden">
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-[600px] bg-brand/5 rounded-full pointer-events-none"></div>
                
                <div className="flex justify-center mb-10">
                    <div className="w-28 h-28 bg-brand rounded-[2.5rem] border-4 border-black flex items-center justify-center group transition-transform duration-500">
                        <span className="text-6xl font-black text-black">N</span>
                    </div>
                </div>

                <div className="space-y-6">
                    <h1 className="text-6xl sm:text-8xl font-black uppercase tracking-tighter leading-[0.9]">
                        NAXXIVO <br/>
                        <span className="text-brand">GLOBAL</span>
                    </h1>
                    <p className="text-muted text-lg max-w-md mx-auto leading-relaxed">
                        The ultimate decentralized ecosystem for digital earning, elite gaming, and asset investment. Secure. Transparent. Instant.
                    </p>
                    
                    <div className="flex flex-col sm:flex-row gap-4 justify-center items-center pt-4">
                        <Link to="/signup" className="w-full sm:w-auto px-10 py-5 bg-brand text-black font-black uppercase rounded-2xl active:scale-95 transition-all text-xl flex items-center justify-center gap-3">
                            LAUNCH SYSTEM <ArrowRight size={24} strokeWidth={3}/>
                        </Link>
                        <Link to="/login" className="w-full sm:w-auto px-10 py-5 bg-white/5 text-white font-bold uppercase rounded-2xl border border-white/10 hover:bg-white/10 transition flex items-center justify-center gap-2">
                            AUTHENTICATION
                        </Link>
                    </div>
                </div>
            </section>

            {/* 2. LIVE PROTOCOL TICKER */}
            <div className="bg-black/40 border-y border-white/5 py-4 overflow-hidden relative">
                <div className="flex items-center gap-12 animate-marquee whitespace-nowrap">
                    {liveFeed.concat(liveFeed).map((item, i) => (
                        <div key={i} className="flex items-center gap-4 text-[11px] font-mono group">
                            <div className="w-2 h-2 rounded-full bg-success shadow-[0_0_8px_#10b981]"></div>
                            <span className="text-muted font-bold uppercase tracking-widest">{item.user}</span>
                            <span className={`${item.color} font-black`}>{item.action}</span>
                            <span className="text-brand font-black bg-brand/10 px-2 py-0.5 rounded border border-brand/20">{item.amount}</span>
                        </div>
                    ))}
                </div>
            </div>

            {/* 3. METRICS GRID */}
            <section className="px-6 mt-20 grid grid-cols-2 lg:grid-cols-4 gap-4 max-w-7xl mx-auto">
                {stats.map((stat, i) => (
                    <GlassCard key={i} className="p-6 border-white/5 bg-panel hover:border-brand/30 transition-all flex flex-col items-center text-center">
                        <stat.icon className={`${stat.color} mb-4`} size={32} />
                        <p className="text-[10px] font-black text-muted uppercase tracking-[0.2em]">{stat.label}</p>
                        <h3 className="text-3xl font-black text-white mt-1 font-mono">{stat.value}</h3>
                    </GlassCard>
                ))}
            </section>

            {/* 4. PLATFORM PILLARS */}
            <section className="px-6 mt-20 space-y-12 max-w-7xl mx-auto">
                <div className="text-center space-y-2">
                    <h2 className="text-3xl font-black text-white uppercase tracking-tighter">ENGINE CORE FEATURES</h2>
                    <p className="text-muted text-sm uppercase font-bold tracking-widest">Multi-Tier Revenue Streams</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="group p-8 rounded-5xl bg-panel border border-white/5 hover:border-blue-500/40 transition-all">
                        <div className="w-14 h-14 bg-blue-500/10 rounded-2xl flex items-center justify-center text-blue-400 mb-6">
                            <Briefcase size={28} />
                        </div>
                        <h4 className="text-2xl font-black text-white uppercase tracking-tight mb-4">Task Market</h4>
                        <p className="text-muted text-sm leading-relaxed mb-6">Complete micro-jobs, verify CPC links, and perform social actions for direct BDT rewards.</p>
                        <div className="flex items-center gap-2 text-blue-400 font-bold text-xs uppercase tracking-widest">
                            Verified Protocol <ChevronRight size={14}/>
                        </div>
                    </div>

                    <div className="group p-8 rounded-5xl bg-panel border border-white/5 hover:border-purple-500/40 transition-all">
                        <div className="w-14 h-14 bg-purple-500/10 rounded-2xl flex items-center justify-center text-purple-400 mb-6">
                            <Gamepad2 size={28} />
                        </div>
                        <h4 className="text-2xl font-black text-white uppercase tracking-tight mb-4">Elite Gaming</h4>
                        <p className="text-muted text-sm leading-relaxed mb-6">Provably fair crash games, lucky wheels, and dice tournaments with instant crypto-payouts.</p>
                        <div className="flex items-center gap-2 text-purple-400 font-bold text-xs uppercase tracking-widest">
                            Live Competition <ChevronRight size={14}/>
                        </div>
                    </div>

                    <div className="group p-8 rounded-5xl bg-panel border border-white/5 hover:border-brand/40 transition-all">
                        <div className="w-14 h-14 bg-brand/10 rounded-2xl flex items-center justify-center text-brand mb-6">
                            <TrendingUp size={28} />
                        </div>
                        <h4 className="text-2xl font-black text-white uppercase tracking-tight mb-4">ROI Assets</h4>
                        <p className="text-muted text-sm leading-relaxed mb-6">Stake your earnings into commodity assets or venture capital plans for high-yield daily returns.</p>
                        <div className="flex items-center gap-2 text-brand font-bold text-xs uppercase tracking-widest">
                            Passive Staking <ChevronRight size={14}/>
                        </div>
                    </div>
                </div>
            </section>

            {/* 5. LIVE TRANSACTION MONITOR */}
            <section className="px-6 mt-24 max-w-4xl mx-auto">
                <div className="flex justify-between items-center mb-10 px-2">
                    <h3 className="text-xl font-black text-white uppercase tracking-tighter flex items-center gap-3">
                        <div className="w-2 h-2 bg-success rounded-full"></div> Realtime Payout Ledger
                    </h3>
                    <div className="text-[10px] font-black text-muted uppercase tracking-widest">Protocol Sync: OK</div>
                </div>

                <div className="bg-[#080808] border border-white/5 rounded-[3rem] overflow-hidden p-2 shadow-sm">
                    {liveFeed.filter(f => f.action.includes('Withdrew')).slice(0, 5).map((item, i) => (
                        <div key={i} className="flex items-center justify-between p-5 rounded-3xl hover:bg-white/5 transition-colors group">
                            <div className="flex items-center gap-5">
                                <div className="w-12 h-12 rounded-2xl bg-black border border-white/10 flex items-center justify-center font-bold text-brand shadow-inner">
                                    {item.user.charAt(0)}
                                </div>
                                <div>
                                    <p className="text-base font-black text-white tracking-tight">{item.user}</p>
                                    <p className="text-[9px] text-gray-500 font-bold uppercase mt-1">Verified Transfer • BKASH/NAGAD</p>
                                </div>
                            </div>
                            <div className="text-right">
                                <p className="text-lg font-black text-brand font-mono leading-none">{item.amount}</p>
                                <p className="text-[8px] text-success font-black uppercase mt-2 flex items-center gap-1 justify-end">
                                    <CheckCircle2 size={10}/> TERMINAL SUCCESS
                                </p>
                            </div>
                        </div>
                    ))}
                </div>
            </section>

            {/* 6. USER TESTIMONIALS */}
            <section className="px-6 mt-24 max-w-7xl mx-auto space-y-12">
                <div className="text-center space-y-2">
                    <h2 className="text-3xl font-black text-white uppercase tracking-tighter">TRUSTED BY ELITE USERS</h2>
                    <p className="text-muted text-sm uppercase font-bold tracking-widest">User Sentiment & Analysis</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {reviews.map((rev, i) => (
                        <GlassCard key={i} className="p-8 border-white/5 bg-[#0a0a0a] relative flex flex-col h-full">
                            <Quote className="text-brand/10 absolute top-4 right-6" size={48} />
                            <div className="flex items-center gap-1 mb-4">
                                {Array.from({length: 5}).map((_, star) => (
                                    <Star key={star} size={12} className={star < rev.rating ? 'text-brand fill-brand' : 'text-gray-700'} />
                                ))}
                            </div>
                            <p className="text-gray-400 text-sm leading-relaxed mb-8 flex-1 italic">"{rev.text}"</p>
                            <div className="flex items-center gap-3 pt-4 border-t border-white/5">
                                <div className="w-10 h-10 rounded-full bg-brand/20 flex items-center justify-center text-brand font-black">
                                    {rev.name.charAt(0)}
                                </div>
                                <div>
                                    <p className="text-xs font-bold text-white uppercase tracking-widest">{rev.name}</p>
                                    <p className="text-[9px] text-brand/60 font-black uppercase">{rev.category} Verified</p>
                                </div>
                            </div>
                        </GlassCard>
                    ))}
                </div>
            </section>

            {/* 7. FINAL CTA */}
            <section className="px-6 mt-24 max-w-4xl mx-auto mb-20">
                <div className="bg-brand rounded-[4rem] p-12 text-center text-black border-8 border-black shadow-sm relative overflow-hidden group">
                    <Crown className="absolute -top-10 -right-10 text-black/10 w-48 h-48 -rotate-12" />
                    
                    <h2 className="text-4xl sm:text-6xl font-black uppercase tracking-tighter mb-4 relative z-10 leading-none">
                        START YOUR <br/>
                        REVENUE JOURNEY
                    </h2>
                    <p className="text-black/80 font-bold mb-10 text-sm relative z-10 max-w-sm mx-auto uppercase tracking-widest">
                        Join {totalUsers.toLocaleString()} active earners today.
                    </p>
                    <Link to="/signup" className="inline-flex items-center gap-3 px-12 py-5 bg-black text-white font-black uppercase rounded-2xl hover:scale-100 active:scale-95 transition-all text-xl shadow-sm relative z-10">
                        GET STARTED <ArrowRight size={24} strokeWidth={3}/>
                    </Link>
                </div>
            </section>

        </div>
    );
};

export default Landing;