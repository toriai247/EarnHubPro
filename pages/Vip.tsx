
import React, { useEffect, useState } from 'react';
import GlassCard from '../components/GlassCard';
import { supabase } from '../integrations/supabase/client';
import { InvestmentPlan, UserInvestment, WalletData } from '../types';
import { buyPackage, claimInvestmentReward } from '../lib/actions';
// Added Activity to lucide-react imports to resolve the error on line 166
import { Crown, Clock, CheckCircle2, Loader2, TrendingUp, Zap, Shield, Sparkles, Lock, ArrowUpRight, Award, Gem, Activity } from 'lucide-react';
import { useUI } from '../context/UIContext';
import BalanceDisplay from '../components/BalanceDisplay';
import Loader from '../components/Loader';
import GoogleAd from '../components/GoogleAd';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';

const Vip: React.FC = () => {
    const { toast, confirm } = useUI();
    const [plans, setPlans] = useState<InvestmentPlan[]>([]);
    const [myInvestments, setMyInvestments] = useState<UserInvestment[]>([]);
    const [wallet, setWallet] = useState<WalletData | null>(null);
    const [loading, setLoading] = useState(true);
    const [processingId, setProcessingId] = useState<string | null>(null);
    const [now, setNow] = useState(new Date());

    useEffect(() => {
        fetchData();
        const interval = setInterval(() => setNow(new Date()), 1000);
        return () => clearInterval(interval);
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (session) {
                const [pRes, myRes, wRes] = await Promise.all([
                    supabase.from('investment_plans').select('*').eq('is_active', true).order('min_invest', { ascending: true }),
                    supabase.from('investments').select('*').eq('user_id', session.user.id).eq('status', 'active'),
                    supabase.from('wallets').select('*').eq('user_id', session.user.id).single()
                ]);

                if (pRes.data) setPlans(pRes.data);
                if (myRes.data) setMyInvestments(myRes.data);
                if (wRes.data) setWallet(wRes.data as WalletData);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const handleBuy = async (plan: InvestmentPlan) => {
        if (!wallet) return;
        if (wallet.deposit_balance < plan.min_invest) {
            toast.error(`Insufficient Deposit Balance. Need ৳${plan.min_invest}`);
            return;
        }

        if (!await confirm(`Authorize activation of ${plan.name}?\n\nPrice: ৳${plan.min_invest}\nDaily Return: ৳${plan.daily_return}`, "Security Confirmation")) return;

        setProcessingId(plan.id);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (session) {
                await buyPackage(session.user.id, plan);
                confetti({
                    particleCount: 150,
                    spread: 70,
                    origin: { y: 0.6 },
                    colors: ['#FFD700', '#FFFFFF', '#00E5FF']
                });
                toast.success("VIP Status Activated!");
                fetchData();
            }
        } catch (e: any) {
            toast.error(e.message);
        } finally {
            setProcessingId(null);
        }
    };

    const handleClaim = async (inv: UserInvestment) => {
        const nextClaim = new Date(inv.next_claim_at);
        if (now < nextClaim) {
            toast.error("Resource is still calibrating. Please wait.");
            return;
        }

        setProcessingId(inv.id);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (session) {
                await claimInvestmentReward(session.user.id, inv.id, inv.daily_return);
                toast.success(`Claim Success: +৳${inv.daily_return}`);
                fetchData();
            }
        } catch (e: any) {
            toast.error(e.message);
        } finally {
            setProcessingId(null);
        }
    };

    const getThemeStyles = (name: string) => {
        const n = name.toLowerCase();
        if (n.includes('royal') || n.includes('diamond')) return { 
            bg: 'bg-gradient-to-br from-cyan-600/20 via-[#0a192f] to-blue-900/40', 
            border: 'border-cyan-500/50', 
            text: 'text-cyan-400',
            glow: 'shadow-[0_0_40px_rgba(6,182,212,0.2)]',
            icon: Gem
        };
        if (n.includes('gold') || n.includes('platinum')) return { 
            bg: 'bg-gradient-to-br from-amber-500/20 via-[#1a1400] to-yellow-900/40', 
            border: 'border-amber-500/50', 
            text: 'text-amber-400',
            glow: 'shadow-[0_0_40px_rgba(245,158,11,0.2)]',
            icon: Crown
        };
        return { 
            bg: 'bg-gradient-to-br from-purple-600/20 via-[#11051a] to-indigo-900/40', 
            border: 'border-purple-500/50', 
            text: 'text-purple-400',
            glow: 'shadow-[0_0_40px_rgba(168,85,247,0.2)]',
            icon: Zap
        };
    };

    return (
        <div className="pb-32 sm:pl-20 sm:pt-6 space-y-10 px-4 sm:px-0 bg-void min-h-screen">
            
            {/* ELITE HEADER */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 pt-6">
                <div className="space-y-1">
                    <h1 className="text-4xl font-black text-white tracking-tighter flex items-center gap-3">
                        <Crown className="text-brand animate-pulse" size={36} fill="currentColor" /> 
                        VIP <span className="text-brand">LOUNGE</span>
                    </h1>
                    <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-success animate-ping"></div>
                        <p className="text-muted text-[10px] font-black uppercase tracking-[0.3em]">Institutional Grade Assets</p>
                    </div>
                </div>
                
                <GlassCard className="!p-4 !rounded-[2rem] border-brand/20 bg-brand/5 backdrop-blur-xl flex items-center gap-4 shadow-2xl">
                    <div className="p-3 bg-brand/10 rounded-2xl text-brand">
                        <Award size={24} />
                    </div>
                    <div>
                        <p className="text-[9px] text-muted font-black uppercase tracking-widest">Trading Power</p>
                        <p className="text-xl font-black text-brand font-mono leading-none mt-1">
                            <BalanceDisplay amount={wallet?.deposit_balance || 0} isNative />
                        </p>
                    </div>
                </GlassCard>
            </div>

            {/* ACTIVE PORTFOLIO SECTION */}
            <AnimatePresence>
                {myInvestments.length > 0 && (
                    <motion.section 
                        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                        className="space-y-4"
                    >
                        <div className="flex items-center justify-between px-2">
                            <h3 className="text-xs font-black text-muted uppercase tracking-[0.4em] flex items-center gap-2">
                                <Activity size={14} className="text-success" /> Active Portfolio
                            </h3>
                            <span className="text-[10px] font-black text-success bg-success/10 px-2 py-0.5 rounded-full border border-success/20">
                                {myInvestments.length} UNITS RUNNING
                            </span>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {myInvestments.map(inv => {
                                const nextClaim = new Date(inv.next_claim_at);
                                const isReady = now >= nextClaim;
                                const diff = Math.max(0, nextClaim.getTime() - now.getTime());
                                
                                const hours = Math.floor(diff / (1000 * 60 * 60));
                                const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
                                const secs = Math.floor((diff % (1000 * 60)) / 1000);
                                
                                const totalCycle = 24 * 60 * 60 * 1000;
                                const progress = Math.min(100, ((totalCycle - diff) / totalCycle) * 100);

                                return (
                                    <motion.div 
                                        layout key={inv.id}
                                        initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
                                        className="relative group"
                                    >
                                        <div className={`absolute -inset-0.5 bg-gradient-to-r from-success/50 to-brand/50 rounded-[2.5rem] blur opacity-20 group-hover:opacity-40 transition`}></div>
                                        <GlassCard className="relative !rounded-[2.5rem] border-white/5 bg-panel p-6 flex flex-col gap-6 overflow-hidden">
                                            <div className="flex justify-between items-start relative z-10">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-14 h-14 rounded-3xl bg-black flex items-center justify-center border border-white/10 shadow-inner">
                                                        <TrendingUp className="text-success" size={28} />
                                                    </div>
                                                    <div>
                                                        <h4 className="text-lg font-black text-white uppercase tracking-tighter">{inv.plan_name}</h4>
                                                        <p className="text-[10px] text-muted font-bold mt-1 uppercase flex items-center gap-1">
                                                            <Shield size={10} className="text-success"/> Encrypted Node Active
                                                        </p>
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <p className="text-[9px] text-muted font-black uppercase tracking-widest">Yield / Day</p>
                                                    <p className="text-xl font-black text-success font-mono">৳{inv.daily_return}</p>
                                                </div>
                                            </div>

                                            <div className="space-y-3 relative z-10">
                                                <div className="flex justify-between items-end">
                                                    <p className="text-[10px] text-muted font-black uppercase tracking-widest">Next Harvest</p>
                                                    <span className={`font-mono text-sm font-black ${isReady ? 'text-success' : 'text-white'}`}>
                                                        {isReady ? 'READY TO CLAIM' : `${hours}h ${mins}m ${secs}s`}
                                                    </span>
                                                </div>
                                                <div className="h-2 w-full bg-black rounded-full overflow-hidden border border-white/5 p-0.5">
                                                    <motion.div 
                                                        className="h-full bg-gradient-to-r from-success to-brand rounded-full shadow-[0_0_10px_rgba(16,185,129,0.5)]"
                                                        initial={{ width: 0 }}
                                                        animate={{ width: `${progress}%` }}
                                                        transition={{ duration: 1 }}
                                                    />
                                                </div>
                                            </div>

                                            <button 
                                                onClick={() => handleClaim(inv)}
                                                disabled={!isReady || processingId === inv.id}
                                                className={`w-full py-4 rounded-2xl font-black uppercase tracking-[0.2em] text-xs transition-all relative z-10 shadow-xl active:scale-95 ${
                                                    isReady 
                                                    ? 'bg-success text-black hover:bg-white' 
                                                    : 'bg-white/5 text-muted border border-white/5 cursor-not-allowed'
                                                }`}
                                            >
                                                {processingId === inv.id ? <Loader2 className="animate-spin mx-auto" size={18}/> : isReady ? 'CLAIM DAILY PROFIT' : 'CALIBRATING...'}
                                            </button>
                                        </GlassCard>
                                    </motion.div>
                                );
                            })}
                        </div>
                    </motion.section>
                )}
            </AnimatePresence>

            {/* AD PLACEMENT */}
            <div className="px-1">
                <GoogleAd slot="3493119845" layout="in-article" />
            </div>

            {/* INVESTMENT PLANS SECTION */}
            <section className="space-y-6">
                <div className="flex items-center justify-between px-2">
                    <h3 className="text-xs font-black text-muted uppercase tracking-[0.4em] flex items-center gap-2">
                        <Zap size={14} className="text-brand" /> Available Contracts
                    </h3>
                    <div className="flex items-center gap-1.5">
                        <div className="w-1.5 h-1.5 rounded-full bg-brand animate-pulse"></div>
                        <span className="text-[9px] text-muted font-black uppercase tracking-widest">Market Open</span>
                    </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {plans.map(plan => {
                        const theme = getThemeStyles(plan.name);
                        const ThemeIcon = theme.icon;
                        const roiPercent = Math.round(((plan.total_roi || (plan.daily_return * plan.duration)) - plan.min_invest) / plan.min_invest * 100);

                        return (
                            <motion.div 
                                key={plan.id}
                                whileHover={{ y: -8 }}
                                className="h-full"
                            >
                                <div className={`relative rounded-[3rem] overflow-hidden p-8 border-2 transition-all duration-500 h-full flex flex-col ${theme.bg} ${theme.border} ${theme.glow} group cursor-pointer`}>
                                    
                                    {/* Glass Shine */}
                                    <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>

                                    {/* Top Badge */}
                                    {plan.badge_tag && (
                                        <div className="absolute top-0 right-0 bg-white text-black text-[9px] font-black px-4 py-2 rounded-bl-3xl shadow-2xl z-20 uppercase tracking-widest">
                                            {plan.badge_tag}
                                        </div>
                                    )}

                                    {/* Icon & Title */}
                                    <div className="relative z-10 mb-8 flex items-center gap-4">
                                        <div className={`w-16 h-16 rounded-3xl flex items-center justify-center shadow-2xl bg-black border border-white/10 ${theme.text}`}>
                                            <ThemeIcon size={32} fill="currentColor" />
                                        </div>
                                        <div>
                                            <h3 className="text-2xl font-black uppercase tracking-tighter text-white leading-none">
                                                {plan.name}
                                            </h3>
                                            <div className="flex items-center gap-2 mt-2">
                                                <span className="text-[9px] font-black bg-success/20 text-success px-2 py-0.5 rounded-full border border-success/30 uppercase tracking-widest">
                                                    {roiPercent}% ROI
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Cost Display */}
                                    <div className="mb-8 relative z-10">
                                        <p className="text-[9px] font-black text-muted uppercase tracking-[0.3em] mb-2">Required Deposit</p>
                                        <div className="text-5xl font-black text-white font-mono flex items-start leading-none tracking-tighter">
                                            <span className="text-lg mt-1 mr-1 text-muted">৳</span>{plan.min_invest.toLocaleString()}
                                        </div>
                                    </div>

                                    {/* Detailed Breakdown */}
                                    <div className="grid grid-cols-2 gap-4 mb-10 relative z-10">
                                        <div className="bg-black/30 p-4 rounded-3xl border border-white/5">
                                            <p className="text-[8px] text-muted font-black uppercase tracking-widest mb-1">Daily Payout</p>
                                            <p className={`text-base font-black ${theme.text} font-mono leading-none`}>+৳{plan.daily_return}</p>
                                        </div>
                                        <div className="bg-black/30 p-4 rounded-3xl border border-white/5">
                                            <p className="text-[8px] text-muted font-black uppercase tracking-widest mb-1">Term Length</p>
                                            <p className="text-base font-black text-white font-mono leading-none">{plan.duration} Days</p>
                                        </div>
                                    </div>

                                    {/* Action Button */}
                                    <button 
                                        onClick={() => handleBuy(plan)}
                                        disabled={!!processingId}
                                        className="w-full mt-auto relative z-10 py-5 bg-white text-black rounded-[2rem] font-black text-xs uppercase tracking-[0.25em] shadow-2xl hover:bg-brand transition-all active:scale-95 disabled:opacity-50"
                                    >
                                        {processingId === plan.id ? <Loader2 className="animate-spin mx-auto" size={18}/> : 'ACTIVATE CONTRACT'}
                                    </button>

                                    {/* Decoration */}
                                    <ThemeIcon size={220} className={`absolute -bottom-16 -right-16 opacity-[0.03] rotate-12 pointer-events-none ${theme.text}`} />
                                </div>
                            </motion.div>
                        );
                    })}
                </div>
            </section>
        </div>
    );
};

export default Vip;
