
import React, { useEffect, useState } from 'react';
import GlassCard from '../../components/GlassCard';
import { supabase } from '../../integrations/supabase/client';
import { DepositRequest, DepositBonus } from '../../types';
import { Eye, CheckCircle, XCircle, ExternalLink, Gift } from 'lucide-react';
import { updateWallet, createTransaction } from '../../lib/actions';

const DepositApprove: React.FC = () => {
  const [requests, setRequests] = useState<DepositRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [viewImage, setViewImage] = useState<string | null>(null);

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    setIsLoading(true);
    const { data } = await supabase
        .from('deposit_requests')
        .select('*')
        .eq('status', 'pending')
        .order('created_at', { ascending: false });
        
    if (data) setRequests(data as DepositRequest[]);
    setIsLoading(false);
  };

  // --- BONUS CALCULATION LOGIC ---
  const calculateBonus = async (req: DepositRequest) => {
      // 1. Get user's deposit count (approved only)
      const { count } = await supabase
          .from('transactions')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', req.user_id)
          .eq('type', 'deposit')
          .eq('status', 'success');
      
      const currentTier = (count || 0) + 1; // 0 prev deposits = 1st tier

      // 2. Fetch active bonuses
      const { data: bonuses } = await supabase
          .from('deposit_bonuses')
          .select('*')
          .eq('is_active', true);

      let totalBonus = 0;
      let appliedRules: string[] = [];

      if (bonuses) {
          (bonuses as DepositBonus[]).forEach(b => {
              // Filter by Min Deposit
              if (req.amount < b.min_deposit) return;
              
              // Filter by Method
              if (b.method_name && b.method_name !== req.method_name) return;

              // Filter by Tier (0 = Recurring/Any, otherwise exact match)
              if (b.tier_level !== 0 && b.tier_level !== currentTier) return;

              // Calculate
              let amount = b.bonus_fixed;
              if (b.bonus_percent > 0) {
                  amount += (req.amount * b.bonus_percent) / 100;
              }

              if (amount > 0) {
                  totalBonus += amount;
                  appliedRules.push(b.title);
              }
          });
      }

      return { totalBonus, appliedRules, currentTier };
  };

  const handleProcess = async (req: DepositRequest, action: 'approved' | 'rejected') => {
      if (action === 'rejected') {
          if (!confirm("Reject this deposit?")) return;
          await supabase.from('deposit_requests').update({ status: 'rejected', processed_at: new Date().toISOString() }).eq('id', req.id);
          fetchRequests();
          return;
      }

      // Approval Flow with Bonus
      const { totalBonus, appliedRules, currentTier } = await calculateBonus(req);
      
      const confirmMsg = totalBonus > 0 
          ? `Approve $${req.amount} for User (Deposit #${currentTier})?\n\n🎁 BONUSES DETECTED:\n${appliedRules.map(r=>'- '+r).join('\n')}\n\nTotal Bonus: $${totalBonus}\nUser receives: $${req.amount + totalBonus}`
          : `Approve $${req.amount} deposit for User (Deposit #${currentTier})?`;

      if (!confirm(confirmMsg)) return;

      try {
          // 1. Update Request Status
          await supabase.from('deposit_requests').update({ 
              status: 'approved', 
              processed_at: new Date().toISOString() 
          }).eq('id', req.id);

          // 2. Credit Deposit
          await updateWallet(req.user_id, req.amount, 'increment', 'balance');
          await updateWallet(req.user_id, req.amount, 'increment', 'deposit');
          await createTransaction(req.user_id, 'deposit', req.amount, `Deposit via ${req.method_name}`);

          // 3. Credit Bonus (if any)
          if (totalBonus > 0) {
              await updateWallet(req.user_id, totalBonus, 'increment', 'balance');
              await createTransaction(req.user_id, 'bonus', totalBonus, `Deposit Bonus: ${appliedRules.join(', ')}`);
          }

          alert(`Deposit approved successfully! User credited $${req.amount + totalBonus}.`);
          fetchRequests();
      } catch (e: any) {
          alert("Error: " + e.message);
      }
  };

  return (
    <div className="space-y-4 animate-fade-in">
        <h2 className="text-2xl font-bold text-white">Deposit Authorization</h2>
        
        {isLoading ? (
             <div className="text-center py-10 text-gray-500">Loading requests...</div>
        ) : requests.length === 0 ? (
             <div className="bg-white/5 border border-white/10 p-8 rounded-xl text-center">
                 <p className="text-gray-400 mb-2">No pending manual deposits found.</p>
                 <p className="text-xs text-gray-500">Check back later.</p>
             </div>
        ) : (
            <div className="grid grid-cols-1 gap-4">
                {requests.map(req => (
                    <GlassCard key={req.id} className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                        <div>
                            <div className="flex items-center gap-2 mb-1">
                                <span className="bg-blue-500/20 text-blue-400 text-xs font-bold px-2 py-1 rounded">{req.method_name}</span>
                                <span className="text-white font-bold text-lg">${req.amount.toFixed(2)}</span>
                            </div>
                            <p className="text-sm text-gray-400">TrxID: <span className="text-white font-mono">{req.transaction_id}</span></p>
                            <p className="text-xs text-gray-500">From: {req.sender_number || 'N/A'} • {new Date(req.created_at).toLocaleString()}</p>
                        </div>
                        
                        <div className="flex items-center gap-3 w-full md:w-auto">
                            {req.screenshot_url && (
                                <button 
                                    onClick={() => setViewImage(req.screenshot_url || null)} 
                                    className="p-2 bg-white/5 hover:bg-white/10 rounded-lg text-gray-300 flex items-center gap-2 text-xs"
                                >
                                    <Eye size={16} /> Proof
                                </button>
                            )}
                            <button onClick={() => handleProcess(req, 'approved')} className="flex-1 md:flex-none px-4 py-2 bg-green-500 text-black font-bold rounded-lg hover:bg-green-400 text-xs flex items-center justify-center gap-2">
                                <CheckCircle size={16} /> Review & Approve
                            </button>
                            <button onClick={() => handleProcess(req, 'rejected')} className="flex-1 md:flex-none px-4 py-2 bg-red-500/20 text-red-400 font-bold rounded-lg hover:bg-red-500/30 text-xs flex items-center justify-center gap-2">
                                <XCircle size={16} /> Reject
                            </button>
                        </div>
                    </GlassCard>
                ))}
            </div>
        )}

        {/* Image Modal */}
        {viewImage && (
            <div className="fixed inset-0 z-[200] bg-black/90 flex items-center justify-center p-4" onClick={() => setViewImage(null)}>
                <div className="relative max-w-3xl max-h-[90vh]">
                    <img src={viewImage} alt="Proof" className="rounded-lg shadow-2xl border border-white/20 max-h-[80vh] object-contain" />
                    <button onClick={() => setViewImage(null)} className="absolute -top-10 right-0 text-white"><XCircle size={32} /></button>
                </div>
            </div>
        )}
    </div>
  );
};

export default DepositApprove;
