
import React, { useEffect, useState } from 'react';
import GlassCard from '../components/GlassCard';
import { supabase } from '../integrations/supabase/client';
import { InvestmentPlan, UserInvestment, WalletData } from '../types';
import { buyPackage, claimInvestmentReward } from '../lib/actions';
import { Crown, Clock, CheckCircle2, Loader2, TrendingUp, AlertCircle, Zap, Shield, Sparkles, Lock } from 'lucide-react';
import { useUI } from '../context/UIContext';
import BalanceDisplay from '../components/BalanceDisplay';
import Loader from '../components/Loader';
import GoogleAd from '../components/GoogleAd';
import { motion, AnimatePresence } from 'framer-motion';

const MotionDiv = motion.div as any;

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
        // Live timer for countdowns
        const interval = setInterval(() => setNow(new Date()), 1000);
        return () => clearInterval(interval);
    }, []);

    const fetchData = async () => {
        setLoading(true);
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
        setLoading(false);
    };

    const handleBuy = async (plan: InvestmentPlan) => {
        if (!wallet) return;
        if (wallet.deposit_balance < plan.min_invest) {
            toast.error(`Insufficient Deposit Balance. Need ৳${plan.min_invest}`);
            return;
        }

        if (!await confirm(`Activate ${plan.name}?\n\nCost: ৳${plan.min_invest}\nDaily Return: ৳${plan.daily_return}`, "Confirm Purchase")) return;

        setProcessingId(plan.id);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (session) {
                await buyPackage(session.user.id, plan);
                toast.success("VIP Plan Activated Successfully!");
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
            toast.error("Reward is locked. Please wait.");
            return;
        }

        setProcessingId(inv.id);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (session) {
                await claimInvestmentReward(session.user.id, inv.id, inv.daily_return);
                toast.success("Daily Income Claimed!");
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
        if (n.includes('gold') || n.includes('vip 1')) return { 
            bg: 'bg-gradient-to-br from-yellow-500/20 to-amber-900/40', 
            border: 'border-amber-500/50', 
            text: 'text-amber-400',
            glow: 'shadow-[0_0_30px_rgba(245,158,11,0.15)]'
        };
        if (n.includes('platinum') || n.includes('vip 2')) return { 
            bg: 'bg-gradient-to-br from-slate-400/20 to-slate-900/40', 
            border: 'border-slate-400/50', 
            text: 'text-slate-200',
            glow: 'shadow-[0_0_30px_rgba(148,163,184,0.15)]'
        };
        if (n.includes('diamond') || n.includes('royal') || n.includes('vip 3')) return { 
            bg: 'bg-gradient-to-br from-cyan-500/20 to-blue-900/40', 
            border: 'border-cyan-500/50', 
            text: 'text-cyan-400',
            glow: 'shadow-[0_0_30px_rgba(6,182,212,0.15)]'
        };
        // Default / Basic
        return { 
            bg: 'bg-gradient-to-br from-purple-500/20 to-indigo-900/40', 
            border: 'border-purple-500/50', 
            text: 'text-purple-400',
            glow: 'shadow-[0_0_30px_rgba(168,85,247,0.15)]'
        };
    };

    if (loading) return <div className="p-10"><Loader /></div>;

    const containerVariants = {
        hidden: { opacity: 0 },
        show: { opacity: 1, transition: { staggerChildren: 0.1 } }
    };

    const itemVariants = {
        hidden: { opacity: 0, y: 20 },
        show: { opacity: 1, y: 0 }
    };

    return (
        <div className="pb-24 sm:pl-20 sm:pt-6 space-y-8 px-4 sm:px-0">
            
            {/* HEADER */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 pt-4">
                <div>
                    <h1 className="text-3xl font-display font-black text-white flex items-center gap-2">
                        <Crown className="text-yellow-400 fill-yellow-400" size={32} /> VIP Lounge
                    </h1>
                    <p className="text-gray-400 text-sm mt-1">Upgrade your status. Earn passive daily income.</p>
                </div>
                <div className="bg-[#111] px-5 py-3 rounded-2xl border border-white/10 flex flex-col items-end min-w-[140px]">
                    <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">Investable Funds</p>
                    <p className="text-white font-mono font-bold text-lg">
                        <BalanceDisplay amount={wallet?.deposit_balance || 0} isNative={true} />
                    </p>
                </div>
            </div>

            {/* AD PLACEMENT */}
            <GoogleAd slot="3493119845" layout="in-article" />

            {/* MY ACTIVE SUBSCRIPTIONS */}
            {myInvestments.length > 0 && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
                    <div className="flex items-center gap-2 px-1">
                        <div className="p-1.5 bg-green-500/20 rounded-lg">
                            <Clock size={14} className="text-green-400" />
                        </div>
                        <h3 className="text-sm font-bold text-white uppercase tracking-wider">Active Portfolio</h3>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <AnimatePresence>
                            {myInvestments.map(inv => {
                                const nextClaim = new Date(inv.next_claim_at);
                                const isReady = now >= nextClaim;
                                const diff = Math.max(0, nextClaim.getTime() - now.getTime());
                                
                                const hours = Math.floor(diff / (1000 * 60 * 60));
                                const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
                                const secs = Math.floor((diff % (1000 * 60)) / 1000);
                                
                                // Progress Calculation (Assuming 24h cycle)
                                const totalCycle = 24 * 60 * 60 * 1000;
                                const progress = Math.min(100, ((totalCycle - diff) / totalCycle) * 100);

                                return (
                                    <motion.div 
                                        key={inv.id}
                                        layout
                                        initial={{ opacity: 0, scale: 0.95 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        exit={{ opacity: 0, scale: 0.95 }}
                                    >
                                        <GlassCard className="border-l-4 border-l-green-500 flex items-center justify-between relative overflow-hidden group">
                                            {/* Background Progress Bar */}
                                            <div className="absolute bottom-0 left-0 h-1 bg-green-500/20 w-full z-0">
                                                <div className="h-full bg-green-500" style={{ width: `${progress}%` }}></div>
                                            </div>

                                            <div className="relative z-10">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <h4 className="font-black text-white text-base">{inv.plan_name}</h4>
                                                    <span className="text-[9px] bg-green-500/20 text-green-400 px-1.5 rounded font-bold uppercase">Active</span>
                                                </div>
                                                <div className="flex gap-3 text-xs text-gray-400">
                                                    <span>Earned: <span className="text-white font-bold">৳{inv.total_earned}</span></span>
                                                    <span>Daily: <span className="text-green-400 font-bold">+৳{inv.daily_return}</span></span>
                                                </div>
                                            </div>

                                            <button 
                                                onClick={() => handleClaim(inv)}
                                                disabled={!isReady || processingId === inv.id}
                                                className={`relative z-10 px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-lg flex items-center gap-2 ${
                                                    isReady 
                                                    ? 'bg-green-500 text-black hover:bg-green-400 hover:scale-105 active:scale-95 animate-pulse' 
                                                    : 'bg-white/5 text-gray-500 cursor-not-allowed border border-white/5'
                                                }`}
                                            >
                                                {processingId === inv.id ? <Loader2 className="animate-spin" size={14}/> : isReady ? (
                                                    <><Zap size={14} fill="currentColor" /> CLAIM</>
                                                ) : (
                                                    <span className="font-mono">{hours}h {mins}m {secs}s</span>
                                                )}
                                            </button>
                                        </GlassCard>
                                    </motion.div>
                                );
                            })}
                        </AnimatePresence>
                    </div>
                </motion.div>
            )}

            {/* PLANS MARKETPLACE */}
            <MotionDiv 
                variants={containerVariants} 
                initial="hidden" 
                animate="show" 
                className="space-y-4"
            >
                 <div className="flex items-center justify-between px-1">
                    <h3 className="text-sm font-bold text-white uppercase tracking-widest flex items-center gap-2">
                        <TrendingUp size={16} className="text-blue-400"/> Available Packages
                    </h3>
                    <span className="text-[10px] bg-white/5 px-2 py-1 rounded text-gray-500 border border-white/5">{plans.length} Plans</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {plans.map(plan => {
                        const theme = getThemeStyles(plan.name);
                        const roiPercent = Math.round(((plan.total_roi || (plan.daily_return * plan.duration)) - plan.min_invest) / plan.min_invest * 100);

                        return (
                            <MotionDiv variants={itemVariants} key={plan.id} className="h-full">
                                <div className={`relative rounded-3xl overflow-hidden p-6 border transition-all duration-300 hover:-translate-y-2 h-full flex flex-col ${theme.bg} ${theme.border} ${theme.glow} group`}>
                                    
                                    {/* Shine Effect */}
                                    <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>

                                    {/* Badge */}
                                    {plan.badge_tag && (
                                        <div className="absolute top-0 right-0 bg-gradient-to-bl from-white text-black text-[10px] font-black px-3 py-1.5 rounded-bl-2xl shadow-lg z-20 uppercase tracking-wider flex items-center gap-1">
                                            <Sparkles size={10} fill="black" /> {plan.badge_tag}
                                        </div>
                                    )}

                                    {/* Card Header */}
                                    <div className="relative z-10 mb-6">
                                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-4 shadow-inner bg-black/20 backdrop-blur-sm border border-white/10 ${theme.text}`}>
                                            <Crown size={24} fill="currentColor" />
                                        </div>
                                        <h3 className={`text-2xl font-black uppercase tracking-tight text-white leading-none`}>
                                            {plan.name}
                                        </h3>
                                        <div className="flex items-center gap-2 mt-2">
                                            <span className="text-[10px] font-bold bg-black/30 px-2 py-0.5 rounded text-gray-300 border border-white/5 flex items-center gap-1">
                                                <Shield size={10} /> Secure
                                            </span>
                                            <span className="text-[10px] font-bold bg-green-900/30 text-green-400 px-2 py-0.5 rounded border border-green-500/20">
                                                {roiPercent}% ROI
                                            </span>
                                        </div>
                                    </div>

                                    {/* Price Tag */}
                                    <div className="mb-6 relative z-10">
                                        <p className="text-[10px] font-bold text-white/50 uppercase tracking-widest mb-1">Investment</p>
                                        <div className="text-4xl font-black text-white font-mono flex items-start leading-none">
                                            <span className="text-lg mt-1 mr-1 text-gray-400">৳</span>{plan.min_invest.toLocaleString()}
                                        </div>
                                    </div>

                                    {/* Stats Grid */}
                                    <div className="grid grid-cols-2 gap-3 mb-8 relative z-10 bg-black/20 p-3 rounded-2xl border border-white/5">
                                        <div className="p-2">
                                            <p className="text-[10px] text-gray-400 uppercase font-bold">Daily Income</p>
                                            <p className={`text-sm font-bold ${theme.text}`}>+৳{plan.daily_return}</p>
                                        </div>
                                        <div className="p-2 border-l border-white/10 pl-4">
                                            <p className="text-[10px] text-gray-400 uppercase font-bold">Duration</p>
                                            <p className="text-sm font-bold text-white">{plan.duration} Days</p>
                                        </div>
                                        <div className="col-span-2 border-t border-white/10 pt-2 mt-1 flex justify-between items-center px-2">
                                            <p className="text-[10px] text-gray-400 uppercase font-bold">Total Profit</p>
                                            <p className="text-base font-black text-white">৳{(plan.total_roi || (plan.daily_return * plan.duration)).toFixed(0)}</p>
                                        </div>
                                    </div>

                                    {/* Action Button */}
                                    <button 
                                        onClick={() => handleBuy(plan)}
                                        disabled={!!processingId}
                                        className="w-full mt-auto relative z-10 py-4 bg-white text-black rounded-xl font-black text-sm uppercase tracking-wider hover:bg-gray-200 transition shadow-lg active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2 group-hover:shadow-white/20"
                                    >
                                        {processingId === plan.id ? <Loader2 className="animate-spin" size={18}/> : <span className="flex items-center gap-2">Activate Now <TrendingUp size={16}/></span>}
                                    </button>

                                    {/* Decorative Background Icon */}
                                    <Crown size={200} className={`absolute -bottom-10 -right-10 opacity-5 rotate-12 pointer-events-none ${theme.text}`} />
                                </div>
                            </MotionDiv>
                        );
                    })}
                </div>
            </MotionDiv>
        </div>
    );
};

export default Vip;
