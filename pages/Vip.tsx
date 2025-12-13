
import React, { useEffect, useState } from 'react';
import GlassCard from '../components/GlassCard';
import { supabase } from '../integrations/supabase/client';
import { InvestmentPlan, UserInvestment, WalletData } from '../types';
import { buyPackage, claimInvestmentReward } from '../lib/actions';
import { Crown, Clock, CheckCircle2, Loader2, TrendingUp, AlertCircle } from 'lucide-react';
import { useUI } from '../context/UIContext';
import BalanceDisplay from '../components/BalanceDisplay';
import Loader from '../components/Loader';
import GoogleAd from '../components/GoogleAd';

const Vip: React.FC = () => {
    const { toast, confirm } = useUI();
    const [plans, setPlans] = useState<InvestmentPlan[]>([]);
    const [myInvestments, setMyInvestments] = useState<UserInvestment[]>([]);
    const [wallet, setWallet] = useState<WalletData | null>(null);
    const [loading, setLoading] = useState(true);
    const [processingId, setProcessingId] = useState<string | null>(null);

    useEffect(() => {
        fetchData();
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

        if (!await confirm(`Purchase ${plan.name}?\nCost: ৳${plan.min_invest}\nDaily: ৳${plan.daily_return}`)) return;

        setProcessingId(plan.id);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (session) {
                await buyPackage(session.user.id, plan);
                toast.success("VIP Plan Activated!");
                fetchData();
            }
        } catch (e: any) {
            toast.error(e.message);
        } finally {
            setProcessingId(null);
        }
    };

    const handleClaim = async (inv: UserInvestment) => {
        const now = new Date();
        const nextClaim = new Date(inv.next_claim_at);
        if (now < nextClaim) {
            toast.error("Not ready to claim yet.");
            return;
        }

        setProcessingId(inv.id);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (session) {
                await claimInvestmentReward(session.user.id, inv.id, inv.daily_return);
                toast.success("Daily Reward Claimed!");
                fetchData();
            }
        } catch (e: any) {
            toast.error(e.message);
        } finally {
            setProcessingId(null);
        }
    };

    const getPlanColor = (name: string) => {
        const n = name.toLowerCase();
        if (n.includes('gold')) return 'from-yellow-600 to-yellow-800 border-yellow-500';
        if (n.includes('silver')) return 'from-slate-500 to-slate-700 border-slate-400';
        if (n.includes('diamond')) return 'from-cyan-600 to-blue-800 border-cyan-400';
        return 'from-purple-900 to-indigo-900 border-purple-500';
    };

    if (loading) return <Loader />;

    return (
        <div className="pb-24 sm:pl-20 sm:pt-6 space-y-6 px-4 sm:px-0 animate-fade-in">
            <header className="flex justify-between items-end">
                <div>
                    <h1 className="text-2xl font-black text-white flex items-center gap-2">
                        <Crown className="text-yellow-400" /> VIP Plans
                    </h1>
                    <p className="text-gray-400 text-xs">Daily Income Generator</p>
                </div>
                <div className="text-right">
                    <p className="text-[10px] text-gray-500 font-bold uppercase">Investable</p>
                    <p className="text-white font-mono font-bold"><BalanceDisplay amount={wallet?.deposit_balance || 0} isNative={true} /></p>
                </div>
            </header>

            {/* AD */}
            <GoogleAd slot="3493119845" layout="in-article" />

            {/* MY PLANS */}
            {myInvestments.length > 0 && (
                <div className="space-y-3">
                    <h3 className="text-sm font-bold text-white uppercase tracking-widest flex items-center gap-2">
                        <Clock size={16} className="text-green-400"/> Active Subscriptions
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {myInvestments.map(inv => {
                            const now = new Date();
                            const nextClaim = new Date(inv.next_claim_at);
                            const isReady = now >= nextClaim;
                            const diff = Math.max(0, nextClaim.getTime() - now.getTime());
                            const hours = Math.floor(diff / (1000 * 60 * 60));
                            const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

                            return (
                                <GlassCard key={inv.id} className="flex justify-between items-center border-l-4 border-l-green-500">
                                    <div>
                                        <h4 className="font-bold text-white text-sm">{inv.plan_name}</h4>
                                        <p className="text-xs text-gray-400">Daily: ৳{inv.daily_return} • Total: ৳{inv.total_earned}</p>
                                    </div>
                                    <button 
                                        onClick={() => handleClaim(inv)}
                                        disabled={!isReady || processingId === inv.id}
                                        className={`px-4 py-2 rounded-xl text-xs font-black uppercase transition shadow-lg ${
                                            isReady 
                                            ? 'bg-green-500 text-black hover:bg-green-400 animate-bounce-subtle' 
                                            : 'bg-white/10 text-gray-500 cursor-not-allowed'
                                        }`}
                                    >
                                        {processingId === inv.id ? <Loader2 className="animate-spin" size={14}/> : isReady ? 'CLAIM' : `${hours}h ${mins}m`}
                                    </button>
                                </GlassCard>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* PLANS GRID */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {plans.map(plan => (
                    <div key={plan.id} className={`relative rounded-2xl overflow-hidden p-6 bg-gradient-to-br border shadow-xl ${getPlanColor(plan.name)}`}>
                        <div className="absolute top-0 right-0 p-4 opacity-10"><Crown size={80} /></div>
                        
                        <div className="relative z-10 flex flex-col h-full">
                            <div className="flex justify-between items-start mb-4">
                                <div>
                                    <h3 className="text-xl font-black text-white uppercase italic">{plan.name}</h3>
                                    {plan.badge_tag && <span className="bg-white text-black text-[9px] px-2 py-0.5 rounded font-bold uppercase">{plan.badge_tag}</span>}
                                </div>
                                <div className="text-right">
                                    <p className="text-[10px] text-white/70 uppercase font-bold">Cost</p>
                                    <p className="text-2xl font-black text-white">৳{plan.min_invest}</p>
                                </div>
                            </div>

                            <div className="bg-black/30 rounded-xl p-3 mb-6 space-y-2 backdrop-blur-sm border border-white/10">
                                <div className="flex justify-between text-xs font-bold">
                                    <span className="text-gray-300">Daily Income</span>
                                    <span className="text-green-400">+৳{plan.daily_return}</span>
                                </div>
                                <div className="flex justify-between text-xs font-bold">
                                    <span className="text-gray-300">Validity</span>
                                    <span className="text-white">{plan.duration} Days</span>
                                </div>
                                <div className="h-px bg-white/10 my-1"></div>
                                <div className="flex justify-between text-xs font-black uppercase">
                                    <span className="text-gray-300">Total ROI</span>
                                    <span className="text-yellow-400">৳{plan.total_roi || (plan.daily_return * plan.duration).toFixed(0)}</span>
                                </div>
                            </div>

                            <button 
                                onClick={() => handleBuy(plan)}
                                disabled={processingId === plan.id}
                                className="w-full mt-auto py-3 bg-white text-black font-black uppercase tracking-wider rounded-xl hover:bg-gray-200 transition shadow-lg flex items-center justify-center gap-2"
                            >
                                {processingId === plan.id ? <Loader2 className="animate-spin" size={16}/> : 'Purchase Plan'}
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default Vip;
