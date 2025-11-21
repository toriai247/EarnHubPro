
import React, { useEffect, useState } from 'react';
import GlassCard from '../components/GlassCard';
import Skeleton from '../components/Skeleton';
import { supabase } from '../integrations/supabase/client';
import { WalletData, ActiveInvestment, InvestmentPlan } from '../types';
import { updateWallet, createTransaction, claimInvestmentReturn } from '../lib/actions';
import { Clock, TrendingUp, DollarSign, ShieldCheck, CheckCircle2, AlertTriangle, RefreshCw, Star } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useUI } from '../context/UIContext';
import Loader from '../components/Loader';

const Invest: React.FC = () => {
  const { toast } = useUI();
  const [activeTab, setActiveTab] = useState<'market' | 'portfolio'>('market');
  const [wallet, setWallet] = useState<WalletData | null>(null);
  const [plans, setPlans] = useState<InvestmentPlan[]>([]);
  const [myInvestments, setMyInvestments] = useState<ActiveInvestment[]>([]);
  const [selectedPlan, setSelectedPlan] = useState<InvestmentPlan | null>(null);
  const [userId, setUserId] = useState('');
  const [loading, setLoading] = useState(true);
  const [claimLoading, setClaimLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  // Safety Timeout
  useEffect(() => {
      if (loading) {
          const timer = setTimeout(() => {
              if (loading) {
                  setLoading(false);
                  if (!wallet) setError("Investment data failed to load.");
              }
          }, 15000);
          return () => clearTimeout(timer);
      }
  }, [loading, wallet]);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
           setUserId(session.user.id);
           
           const [walletRes, planRes, invRes] = await Promise.all([
               supabase.from('wallets').select('*').eq('user_id', session.user.id).single(),
               supabase.from('investment_plans').select('*').eq('is_active', true).order('min_invest', {ascending: true}),
               supabase.from('investments').select('*').eq('user_id', session.user.id).order('created_at', {ascending: false})
           ]);

           if(walletRes.data) setWallet(walletRes.data as WalletData);
           if(planRes.data) setPlans(planRes.data as InvestmentPlan[]);
           if(invRes.data) setMyInvestments(invRes.data as ActiveInvestment[]);
        }
    } catch (e: any) {
        setError(e.message);
    } finally {
        setLoading(false);
    }
  };

  const handleInvest = async () => {
    if (!selectedPlan) return;
    if (!wallet || wallet.balance < selectedPlan.min_invest) {
        toast.error("Insufficient balance for this plan.");
        return;
    }

    try {
        await updateWallet(userId, selectedPlan.min_invest, 'decrement', 'balance');
        
        const startDate = new Date();
        const endDate = new Date();
        endDate.setDate(endDate.getDate() + selectedPlan.duration);
        
        const nextClaim = new Date();
        nextClaim.setHours(nextClaim.getHours() + 24);

        await supabase.from('investments').insert({
            user_id: userId,
            plan_id: selectedPlan.id,
            plan_name: selectedPlan.name,
            amount: selectedPlan.min_invest,
            daily_return: (selectedPlan.min_invest * selectedPlan.daily_return) / 100,
            total_profit_percent: selectedPlan.total_roi,
            start_date: startDate.toISOString(),
            end_date: endDate.toISOString(),
            next_claim_at: nextClaim.toISOString(),
            status: 'active',
            total_earned: 0
        });

        await createTransaction(userId, 'invest', selectedPlan.min_invest, `Invested in ${selectedPlan.name}`);

        toast.success('Investment successful! First return in 24h.');
        fetchData();
        setActiveTab('portfolio');
        setSelectedPlan(null);
        window.dispatchEvent(new Event('wallet_updated'));
    } catch (e: any) {
        toast.error(e.message || "Investment failed");
    }
  };

  const handleClaim = async (investment: ActiveInvestment) => {
      setClaimLoading(investment.id);
      try {
          await claimInvestmentReturn(userId, investment);
          toast.success(`Claimed $${investment.daily_return.toFixed(2)} profit!`);
          setTimeout(() => {
              fetchData();
              setClaimLoading(null);
              window.dispatchEvent(new Event('wallet_updated'));
          }, 1000);
      } catch (e: any) {
          toast.error(e.message || "Claim failed");
          setClaimLoading(null);
      }
  };

  const getTimeUntilClaim = (dateStr: string) => {
      const now = new Date();
      const target = new Date(dateStr);
      const diff = target.getTime() - now.getTime();
      
      if (diff <= 0) return "Ready to Claim";
      
      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      return `${hours}h ${minutes}m`;
  };

  const getTheme = (index: number) => {
      const themes = [
          { border: 'border-blue-200 dark:border-blue-500/30', bg: 'bg-blue-50 dark:bg-blue-500/5', accent: 'text-blue-600 dark:text-blue-400', badge: 'STARTER' },
          { border: 'border-amber-200 dark:border-yellow-500/30', bg: 'bg-amber-50 dark:bg-yellow-500/5', accent: 'text-amber-600 dark:text-yellow-400', badge: 'GOLD' },
          { border: 'border-purple-200 dark:border-purple-500/30', bg: 'bg-purple-50 dark:bg-purple-500/5', accent: 'text-purple-600 dark:text-purple-400', badge: 'VIP' },
          { border: 'border-emerald-200 dark:border-emerald-500/30', bg: 'bg-emerald-50 dark:bg-emerald-500/5', accent: 'text-emerald-600 dark:text-emerald-400', badge: 'ROYAL' },
      ];
      return themes[index % themes.length];
  };

  if (loading) {
    return (
        <div className="pb-24 sm:pl-20 sm:pt-6 space-y-6 px-4 sm:px-0">
           <div className="flex justify-between items-end">
               <div className="space-y-2">
                   <Skeleton variant="text" className="w-32 h-8" />
                   <Skeleton variant="text" className="w-48" />
               </div>
               <Skeleton variant="text" className="w-20 h-6" />
           </div>
           <div className="flex gap-2">
               <Skeleton variant="rectangular" className="flex-1 h-10" />
               <Skeleton variant="rectangular" className="flex-1 h-10" />
           </div>
           <div className="space-y-4">
               {[1, 2, 3].map(i => <Skeleton key={i} variant="rectangular" className="h-48" />)}
           </div>
        </div>
    );
  }

  if (error || !wallet) {
      return (
          <div className="flex flex-col items-center justify-center p-10 text-center min-h-[60vh]">
              <AlertTriangle size={40} className="text-amber-500 mb-4" />
              <h3 className="text-white font-bold text-xl mb-2">Unable to Load Plans</h3>
              <p className="text-gray-400 text-sm mb-6">{error}</p>
              <button onClick={fetchData} className="bg-royal-600 text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2">
                  <RefreshCw size={18} /> Retry
              </button>
          </div>
      );
  }

  return (
    <div className="pb-24 sm:pl-20 sm:pt-6 space-y-6">
      <header className="flex justify-between items-end px-4 sm:px-0">
         <div>
           <h1 className="text-2xl font-display font-bold text-slate-900 dark:text-white mb-1">Investment Hub</h1>
           <p className="text-slate-500 dark:text-gray-400 text-sm">Grow your wealth with secured plans.</p>
         </div>
         <div className="text-right flex flex-col items-end">
           <p className="text-xs text-slate-500 dark:text-gray-400">Available Balance</p>
           <p className="text-xl font-bold text-royal-600 dark:text-neon-glow font-mono">${wallet.balance.toFixed(2)}</p>
         </div>
      </header>

      <div className="px-4 sm:px-0">
          <div className="flex p-1 bg-slate-200 dark:bg-white/5 rounded-xl border border-slate-300 dark:border-white/5">
            <button onClick={() => setActiveTab('market')} className={`flex-1 py-2.5 text-sm font-bold rounded-lg transition-all ${activeTab === 'market' ? 'bg-white dark:bg-royal-600 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500 dark:text-gray-400 hover:text-slate-800 dark:hover:text-white'}`}>Market Plans</button>
            <button onClick={() => setActiveTab('portfolio')} className={`flex-1 py-2.5 text-sm font-bold rounded-lg transition-all ${activeTab === 'portfolio' ? 'bg-white dark:bg-royal-600 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500 dark:text-gray-400 hover:text-slate-800 dark:hover:text-white'}`}>My Portfolio</button>
          </div>
      </div>

      {activeTab === 'market' && (
        <div className="space-y-5 px-4 sm:px-0 animate-fade-in">
          {plans.length === 0 ? (
               <div className="text-center py-12 bg-slate-50 dark:bg-white/5 rounded-2xl border border-slate-200 dark:border-white/5">
                   <AlertTriangle className="mx-auto text-amber-500 mb-2" size={32} />
                   <p className="text-slate-500 dark:text-gray-400">No investment plans available right now.</p>
               </div>
          ) : (
              plans.map((plan, index) => {
                const theme = getTheme(index);
                
                return (
                <GlassCard key={plan.id} className={`relative overflow-hidden group transition-all duration-300 border ${theme.border} ${theme.bg} hover:shadow-md`}>
                   
                   <div className={`absolute top-0 right-0 px-3 py-1 rounded-bl-xl shadow-sm uppercase tracking-wider text-[9px] font-bold text-white flex items-center gap-1 ${index === 1 ? 'bg-amber-500' : index === 2 ? 'bg-purple-500' : 'bg-slate-600'}`}>
                       {plan.badge_tag || theme.badge} <Star size={8} fill="currentColor" />
                   </div>

                   <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 mb-6 relative z-10 pt-2">
                      <div>
                         <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-1">{plan.name}</h3>
                         <p className="text-slate-500 dark:text-gray-400 text-xs max-w-xs line-clamp-2">{plan.description || "Secure high-yield daily returns."}</p>
                      </div>
                      <div className="text-left sm:text-right bg-white/50 dark:bg-black/20 p-2 rounded-lg sm:bg-transparent sm:p-0">
                         <div className={`text-3xl font-bold ${theme.accent}`}>{plan.daily_return}%</div>
                         <div className="text-[10px] text-slate-400 dark:text-gray-500 uppercase font-bold tracking-wider">Daily Return</div>
                      </div>
                   </div>

                   <div className="grid grid-cols-3 gap-3 mb-6 relative z-10">
                      <div className="bg-white/60 dark:bg-black/30 rounded-xl p-3 text-center border border-slate-100 dark:border-white/5">
                          <Clock size={18} className={`mx-auto mb-1 ${theme.accent}`} />
                          <p className="text-sm font-bold text-slate-800 dark:text-white">{plan.duration} Days</p>
                          <p className="text-[9px] text-slate-400 dark:text-gray-500 uppercase">Duration</p>
                      </div>
                      <div className="bg-white/60 dark:bg-black/30 rounded-xl p-3 text-center border border-slate-100 dark:border-white/5">
                          <DollarSign size={18} className={`mx-auto mb-1 ${theme.accent}`} />
                          <p className="text-sm font-bold text-slate-800 dark:text-white">${plan.min_invest}</p>
                          <p className="text-[9px] text-slate-400 dark:text-gray-500 uppercase">Min Invest</p>
                      </div>
                      <div className="bg-white/60 dark:bg-black/30 rounded-xl p-3 text-center border border-slate-100 dark:border-white/5">
                          <TrendingUp size={18} className={`mx-auto mb-1 ${theme.accent}`} />
                          <p className="text-sm font-bold text-slate-800 dark:text-white">{plan.total_roi}%</p>
                          <p className="text-[9px] text-slate-400 dark:text-gray-500 uppercase">Total ROI</p>
                      </div>
                   </div>
                   
                   <button 
                        onClick={() => setSelectedPlan(plan)} 
                        className="w-full py-3.5 bg-slate-900 dark:bg-white text-white dark:text-black rounded-xl font-bold hover:bg-slate-800 dark:hover:bg-gray-200 transition shadow-lg active:scale-[0.98] relative z-10 flex items-center justify-center gap-2"
                   >
                       Invest Now <TrendingUp size={16} />
                   </button>
                </GlassCard>
              )})
          )}
        </div>
      )}

      {activeTab === 'portfolio' && (
          <div className="space-y-4 px-4 sm:px-0 animate-fade-in">
             {myInvestments.length === 0 ? (
                <div className="text-center py-16 bg-slate-50 dark:bg-white/5 rounded-2xl border border-slate-200 dark:border-white/5">
                    <RefreshCw size={48} className="mx-auto text-slate-300 dark:text-gray-600 mb-4" />
                    <h3 className="text-slate-700 dark:text-white font-bold mb-1">No Active Investments</h3>
                    <p className="text-slate-500 dark:text-gray-500 text-sm mb-4">Start investing to see your portfolio grow.</p>
                    <button onClick={() => setActiveTab('market')} className="text-royal-600 dark:text-neon-green font-bold text-sm hover:underline">Browse Market</button>
                </div>
             ) : (
                myInvestments.map(inv => {
                   const isReadyToClaim = new Date() >= new Date(inv.next_claim_at) && inv.status === 'active';
                   const now = new Date();
                   const totalDuration = new Date(inv.end_date).getTime() - new Date(inv.start_date).getTime();
                   const elapsed = now.getTime() - new Date(inv.start_date).getTime();
                   const timeProgress = Math.min(100, Math.max(0, (elapsed / totalDuration) * 100));

                   return (
                       <GlassCard key={inv.id} className={`border ${inv.status === 'completed' ? 'border-emerald-200 dark:border-green-500/30 bg-emerald-50 dark:bg-green-500/5' : 'border-slate-200 dark:border-white/5'}`}>
                          <div className="flex justify-between items-start mb-4">
                             <div>
                                 <div className="flex items-center gap-2 mb-1">
                                    <h4 className="font-bold text-slate-900 dark:text-white text-lg">{inv.plan_name}</h4>
                                    <span className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase ${inv.status === 'active' ? 'bg-blue-100 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400' : 'bg-green-100 text-green-600 dark:bg-green-500/20 dark:text-green-400'}`}>
                                        {inv.status}
                                    </span>
                                 </div>
                                 <p className="text-xs text-slate-500 dark:text-gray-400">Invested: <span className="text-slate-900 dark:text-white font-bold">${inv.amount}</span></p>
                             </div>
                             <div className="text-right">
                                 <p className="text-2xl font-bold text-emerald-600 dark:text-neon-green">+${inv.total_earned.toFixed(2)}</p>
                                 <p className="text-[10px] text-slate-400 dark:text-gray-500 uppercase">Total Profit</p>
                             </div>
                          </div>

                          {inv.status === 'active' && (
                              <div className="mb-4">
                                  <div className="flex justify-between text-[10px] text-slate-400 dark:text-gray-400 mb-1">
                                      <span>Maturity Progress</span>
                                      <span>{timeProgress.toFixed(0)}%</span>
                                  </div>
                                  <div className="w-full h-2 bg-slate-200 dark:bg-black/30 rounded-full overflow-hidden">
                                      <div className="h-full bg-royal-600 rounded-full transition-all duration-1000" style={{ width: `${timeProgress}%` }}></div>
                                  </div>
                              </div>
                          )}

                          {inv.status === 'active' ? (
                              <button 
                                onClick={() => isReadyToClaim && handleClaim(inv)}
                                disabled={!isReadyToClaim || claimLoading === inv.id}
                                className={`w-full py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition ${
                                    isReadyToClaim 
                                    ? 'bg-emerald-500 dark:bg-neon-green text-white dark:text-black hover:bg-emerald-600 dark:hover:bg-emerald-400 shadow-md' 
                                    : 'bg-slate-100 dark:bg-white/5 text-slate-400 dark:text-gray-500 cursor-not-allowed'
                                }`}
                              >
                                  {claimLoading === inv.id ? (
                                      <Loader className="w-5 h-5" />
                                  ) : isReadyToClaim ? (
                                      <>
                                        <ShieldCheck size={18} /> Claim Daily Profit (+${inv.daily_return.toFixed(2)})
                                      </>
                                  ) : (
                                      <>
                                        <Clock size={16} /> Claim in {getTimeUntilClaim(inv.next_claim_at)}
                                      </>
                                  )}
                              </button>
                          ) : (
                              <div className="w-full py-3 bg-emerald-100 dark:bg-green-500/10 border border-emerald-200 dark:border-green-500/20 text-emerald-600 dark:text-green-400 rounded-xl font-bold text-center flex items-center justify-center gap-2">
                                  <CheckCircle2 size={18} /> Investment Completed
                              </div>
                          )}
                       </GlassCard>
                   )
                })
             )}
          </div>
      )}

      {/* Confirmation Modal */}
      <AnimatePresence>
          {selectedPlan && (
             <motion.div 
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="fixed inset-0 z-[100] bg-slate-900/50 dark:bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center sm:p-4"
                onClick={() => setSelectedPlan(null)}
             >
                 <motion.div 
                    initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
                    className="bg-white dark:bg-dark-900 w-full max-w-md rounded-t-3xl sm:rounded-3xl border border-slate-200 dark:border-white/10 p-6 pb-10 sm:pb-6 shadow-2xl"
                    onClick={e => e.stopPropagation()}
                 >
                    <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-4">Confirm Investment</h3>
                    
                    <div className="bg-slate-50 dark:bg-white/5 p-4 rounded-xl space-y-3 mb-6 border border-slate-200 dark:border-white/5">
                        <div className="flex justify-between text-sm">
                            <span className="text-slate-500 dark:text-gray-400">Plan</span>
                            <span className="text-slate-900 dark:text-white font-bold">{selectedPlan.name}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                            <span className="text-slate-500 dark:text-gray-400">Amount to Lock</span>
                            <span className="text-slate-900 dark:text-white font-bold">${selectedPlan.min_invest}</span>
                        </div>
                         <div className="flex justify-between text-sm">
                            <span className="text-slate-500 dark:text-gray-400">Daily Profit</span>
                            <span className="text-emerald-600 dark:text-neon-green font-bold">+${((selectedPlan.min_invest * selectedPlan.daily_return)/100).toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between text-sm pt-2 border-t border-slate-200 dark:border-white/10">
                            <span className="text-slate-500 dark:text-gray-400">Total Return</span>
                            <span className="text-slate-900 dark:text-white font-bold">${(selectedPlan.min_invest + (selectedPlan.min_invest * selectedPlan.total_roi)/100).toFixed(2)}</span>
                        </div>
                    </div>

                    <button 
                        onClick={handleInvest}
                        className="w-full py-4 bg-royal-600 text-white font-bold rounded-xl hover:bg-royal-700 transition flex items-center justify-center gap-2 shadow-lg"
                    >
                        Confirm & Pay ${selectedPlan.min_invest}
                    </button>
                 </motion.div>
             </motion.div>
          )}
      </AnimatePresence>
    </div>
  );
};

export default Invest;
