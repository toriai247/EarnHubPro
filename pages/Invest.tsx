import React, { useEffect, useState } from 'react';
import GlassCard from '../components/GlassCard';
import { supabase } from '../integrations/supabase/client';
import { WalletData, ActiveInvestment, InvestmentPlan } from '../types';
import { updateWallet, createTransaction, claimInvestmentReturn } from '../lib/actions';
import { Clock, TrendingUp, DollarSign, ShieldCheck, CheckCircle2, AlertTriangle, RefreshCw, Star, Activity, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { useUI } from '../context/UIContext';
import Loader from '../components/Loader';
import BalanceDisplay from '../components/BalanceDisplay';

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
          toast.success(`Claimed profit!`);
          setTimeout(() => {
              fetchData();
              setClaimLoading(null);
              window.dispatchEvent(new Event('wallet_updated'));
          }, 500);
      } catch (e: any) {
          toast.error(e.message || "Claim failed");
          setClaimLoading(null);
      }
  };

  if (loading) return <div className="p-10 text-center text-gray-500">Loading Plans...</div>;

  return (
    <div className="pb-24 sm:pl-20 sm:pt-6 space-y-6 px-4 sm:px-0">
      <header className="flex justify-between items-end">
         <div>
           <h1 className="text-2xl font-bold text-white mb-1">Invest</h1>
           <p className="text-gray-400 text-sm">Grow your wealth.</p>
         </div>
         <div className="text-right flex flex-col items-end">
           <p className="text-xs text-gray-400">Available</p>
           <p className="text-xl font-bold text-brand font-mono"><BalanceDisplay amount={wallet?.balance || 0} /></p>
         </div>
      </header>

      <div className="flex p-1 bg-[#111] rounded-lg border border-[#222]">
        <button onClick={() => setActiveTab('market')} className={`flex-1 py-2 text-sm font-bold rounded transition-colors ${activeTab === 'market' ? 'bg-[#222] text-white' : 'text-gray-500 hover:text-gray-300'}`}>Plans</button>
        <button onClick={() => setActiveTab('portfolio')} className={`flex-1 py-2 text-sm font-bold rounded transition-colors ${activeTab === 'portfolio' ? 'bg-[#222] text-white' : 'text-gray-500 hover:text-gray-300'}`}>My Portfolio</button>
      </div>

      {activeTab === 'market' && (
        <div className="space-y-4">
          {plans.length === 0 ? (
               <div className="text-center py-12 bg-[#111] rounded-xl border border-[#222]">
                   <p className="text-gray-500">No plans available.</p>
               </div>
          ) : (
              plans.map((plan) => (
                <GlassCard key={plan.id} className="relative group hover:border-[#444] transition-colors">
                   <div className="flex justify-between items-start mb-2">
                      <div>
                         <h3 className="text-lg font-bold text-white mb-1">{plan.name}</h3>
                         <p className="text-gray-400 text-xs">{plan.description}</p>
                      </div>
                      <div className="text-right">
                         <div className="text-2xl font-bold text-brand">{plan.daily_return}%</div>
                         <div className="text-[10px] text-gray-500 uppercase">Daily</div>
                      </div>
                   </div>

                   <div className="grid grid-cols-3 gap-2 my-4">
                      <div className="bg-[#111] rounded p-2 text-center border border-[#222]">
                          <p className="text-white font-bold text-sm">{plan.duration} D</p>
                          <p className="text-[10px] text-gray-500 uppercase">Duration</p>
                      </div>
                      <div className="bg-[#111] rounded p-2 text-center border border-[#222]">
                          <p className="text-white font-bold text-sm"><BalanceDisplay amount={plan.min_invest} /></p>
                          <p className="text-[10px] text-gray-500 uppercase">Min</p>
                      </div>
                      <div className="bg-[#111] rounded p-2 text-center border border-[#222]">
                          <p className="text-white font-bold text-sm">{plan.total_roi}%</p>
                          <p className="text-[10px] text-gray-500 uppercase">Total ROI</p>
                      </div>
                   </div>
                   
                   <button 
                        onClick={() => setSelectedPlan(plan)} 
                        className="w-full py-3 bg-[#222] text-white rounded font-bold hover:bg-[#333] transition"
                   >
                       Invest Now
                   </button>
                </GlassCard>
              ))
          )}
        </div>
      )}

      {activeTab === 'portfolio' && (
          <div className="space-y-4">
             {myInvestments.length === 0 ? (
                <div className="text-center py-12 bg-[#111] rounded-xl border border-[#222]">
                    <p className="text-gray-500 text-sm">No active investments.</p>
                </div>
             ) : (
                myInvestments.map(inv => {
                   const isReadyToClaim = new Date() >= new Date(inv.next_claim_at) && inv.status === 'active';
                   
                   return (
                       <GlassCard key={inv.id} className="border border-[#222]">
                          <div className="flex justify-between items-start mb-4">
                             <div>
                                 <h4 className="font-bold text-white">{inv.plan_name}</h4>
                                 <p className="text-xs text-gray-400">Invested: <BalanceDisplay amount={inv.amount} /></p>
                             </div>
                             <div className="text-right">
                                 <p className="text-xl font-bold text-green-400">+<BalanceDisplay amount={inv.total_earned} /></p>
                                 <p className="text-[10px] text-gray-500 uppercase">Profit</p>
                             </div>
                          </div>

                          {inv.status === 'active' ? (
                              <button 
                                onClick={() => isReadyToClaim && handleClaim(inv)}
                                disabled={!isReadyToClaim || claimLoading === inv.id}
                                className={`w-full py-3 rounded font-bold transition ${
                                    isReadyToClaim 
                                    ? 'bg-green-600 text-white hover:bg-green-500' 
                                    : 'bg-[#222] text-gray-500 cursor-not-allowed'
                                }`}
                              >
                                  {claimLoading === inv.id ? 'Claiming...' : isReadyToClaim ? 'Claim Daily Profit' : 'Wait for Next Claim'}
                              </button>
                          ) : (
                              <div className="w-full py-3 bg-[#111] border border-[#222] text-green-500 rounded font-bold text-center text-sm">
                                  Completed
                              </div>
                          )}
                       </GlassCard>
                   )
                })
             )}
          </div>
      )}

      {/* Modal */}
      {selectedPlan && (
         <div className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center p-4">
             <div className="bg-[#111] w-full max-w-sm rounded-xl border border-[#333] p-6">
                <h3 className="text-xl font-bold text-white mb-4">Confirm Investment</h3>
                <div className="space-y-3 mb-6 text-sm">
                    <div className="flex justify-between text-gray-400">
                        <span>Plan</span>
                        <span className="text-white font-bold">{selectedPlan.name}</span>
                    </div>
                    <div className="flex justify-between text-gray-400">
                        <span>Amount</span>
                        <span className="text-white font-bold"><BalanceDisplay amount={selectedPlan.min_invest} /></span>
                    </div>
                     <div className="flex justify-between text-gray-400">
                        <span>Daily Profit</span>
                        <span className="text-green-400 font-bold">+<BalanceDisplay amount={(selectedPlan.min_invest * selectedPlan.daily_return)/100} /></span>
                    </div>
                </div>

                <div className="flex gap-3">
                    <button onClick={() => setSelectedPlan(null)} className="flex-1 py-3 bg-[#222] text-white rounded font-bold hover:bg-[#333]">Cancel</button>
                    <button onClick={handleInvest} className="flex-1 py-3 bg-brand text-white rounded font-bold hover:bg-brand-hover">Confirm</button>
                </div>
             </div>
         </div>
      )}
    </div>
  );
};

export default Invest;