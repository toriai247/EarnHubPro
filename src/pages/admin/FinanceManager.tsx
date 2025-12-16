
import React, { useEffect, useState } from 'react';
import GlassCard from '../../components/GlassCard';
import { supabase } from '../../integrations/supabase/client';
import { DepositRequest, WithdrawRequest } from '../../types';
import { 
    CheckCircle, XCircle, Loader2, RefreshCw, DollarSign, Banknote, 
    Clock, History, FileText, CreditCard, Copy, ArrowRightLeft, ArrowDown, ArrowUp, Search, Scale, AlertTriangle, ShieldBan
} from 'lucide-react';
import { useUI } from '../../context/UIContext';
import { updateWallet, createTransaction } from '../../lib/actions';
import { motion, AnimatePresence } from 'framer-motion';
import BalanceDisplay from '../../components/BalanceDisplay';

const FinanceManager: React.FC = () => {
  const { toast, confirm } = useUI();
  const [section, setSection] = useState<'deposits' | 'withdrawals' | 'audit'>('deposits');
  const [activeTab, setActiveTab] = useState<'pending' | 'history'>('pending');
  const [loading, setLoading] = useState(true);
  
  // Data
  const [depositRequests, setDepositRequests] = useState<DepositRequest[]>([]);
  const [withdrawRequests, setWithdrawRequests] = useState<WithdrawRequest[]>([]);
  
  // Auditor State
  const [auditUserId, setAuditUserId] = useState('');
  const [auditResult, setAuditResult] = useState<any>(null);
  const [auditLoading, setAuditLoading] = useState(false);
  const [currentWallet, setCurrentWallet] = useState<any>(null);
  
  // Processing State
  const [processingId, setProcessingId] = useState<string | null>(null);

  useEffect(() => {
    if (section !== 'audit') fetchData();
  }, [section, activeTab]);

  const fetchData = async () => {
    setLoading(true);
    if (section === 'deposits') {
        let query = supabase.from('deposit_requests').select('*').order('created_at', { ascending: false });
        if (activeTab === 'pending') query = query.eq('status', 'pending');
        else query = query.neq('status', 'pending').limit(50);
        
        const { data } = await query;
        if (data) setDepositRequests(data as DepositRequest[]);
    } else if (section === 'withdrawals') {
        let query = supabase.from('withdraw_requests').select('*').order('created_at', { ascending: false });
        if (activeTab === 'pending') query = query.eq('status', 'pending');
        else query = query.neq('status', 'pending').limit(50);
        
        const { data } = await query;
        if (data) setWithdrawRequests(data as WithdrawRequest[]);
    }
    setLoading(false);
  };

  // --- DEPOSIT ACTIONS ---
  const handleDepositAction = async (req: DepositRequest, status: 'approved' | 'rejected') => {
      const isApproved = status === 'approved';
      if (!await confirm(`Are you sure you want to ${status.toUpperCase()} this deposit of $${req.amount}?`)) return;

      setProcessingId(req.id);
      try {
          const { error } = await supabase.from('deposit_requests').update({
              status,
              processed_at: new Date().toISOString(),
              admin_note: isApproved ? 'Manual Approval' : 'Manual Rejection'
          }).eq('id', req.id);

          if (error) throw error;

          if (isApproved) {
              await updateWallet(req.user_id, req.amount, 'increment', 'deposit_balance');
              await createTransaction(req.user_id, 'deposit', req.amount, `Deposit via ${req.method_name} (Approved)`);

              // --- AUTO ACTIVATION LOGIC ---
              const { data: sysConfig } = await supabase.from('system_config').select('is_activation_enabled, activation_amount').single();
              if (sysConfig && sysConfig.is_activation_enabled) {
                  if (req.amount >= (sysConfig.activation_amount || 500)) {
                      await supabase.from('profiles').update({ is_account_active: true }).eq('id', req.user_id);
                      await supabase.from('notifications').insert({
                          user_id: req.user_id,
                          title: 'Account Activated',
                          message: `Your deposit of $${req.amount} has unlocked all features including Withdrawals!`,
                          type: 'success'
                      });
                  }
              }
          }

          toast.success(`Deposit ${status} successfully`);
          fetchData();
      } catch (e: any) {
          toast.error("Error: " + e.message);
      } finally {
          setProcessingId(null);
      }
  };

  // --- FRAUD ACTION (SUSPEND USER - ADMIN POWER) ---
  const handleFraudAction = async (req: DepositRequest) => {
      if (!await confirm(`FRAUD DETECTED? \n\nThis will SUSPEND the user immediately and mark the deposit as REJECTED (Fraud). \n\nContinue?`)) return;

      setProcessingId(req.id);
      try {
          // 1. Mark Request as Rejected
          await supabase.from('deposit_requests').update({
              status: 'rejected',
              admin_note: 'FRAUD - FAKE DEPOSIT (Admin Override)',
              processed_at: new Date().toISOString()
          }).eq('id', req.id);

          // 2. Suspend User
          await supabase.from('profiles').update({ 
              is_suspended: true, 
              admin_notes: 'Banned for Fake Deposit Auto-Approve abuse.' 
          }).eq('id', req.user_id);

          // 3. Deduct the fake money they got (Reversal)
          await updateWallet(req.user_id, req.amount, 'decrement', 'deposit_balance');
          await createTransaction(req.user_id, 'penalty', req.amount, `Reversal: Fake Deposit ${req.amount}`);

          toast.success("User Suspended & Funds Reversed.");
          fetchData();

      } catch (e: any) {
          toast.error("Action Failed: " + e.message);
      } finally {
          setProcessingId(null);
      }
  };

  // --- WITHDRAW ACTIONS ---
  const handleWithdrawAction = async (id: string, status: 'approved' | 'rejected') => {
      const isConfirmed = await confirm(`Are you sure you want to ${status.toUpperCase()} this withdrawal request?`, 'Confirm Action');
      if (!isConfirmed) return;
      
      setProcessingId(id);
      try {
          const { data: request } = await supabase.from('withdraw_requests').select('*').eq('id', id).single();
          if (!request) throw new Error("Request not found");

          await supabase.from('withdraw_requests').update({ 
              status, 
              processed_at: new Date().toISOString() 
          }).eq('id', id);

          if (status === 'rejected') {
              await updateWallet(request.user_id, request.amount, 'increment', 'main_balance');
              await createTransaction(request.user_id, 'withdraw', request.amount, `Withdrawal Refunded/Rejected`);
          } else {
              await createTransaction(request.user_id, 'withdraw', request.amount, `Withdrawal Approved`);
          }

          toast.success(`Withdrawal ${status} successfully.`);
          fetchData();
      } catch (e: any) {
          toast.error('Error processing request: ' + e.message);
      } finally {
          setProcessingId(null);
      }
  };

  // --- AUDITOR ACTIONS ---
  const handleAudit = async () => {
      if (!auditUserId) return;
      setAuditLoading(true);
      setAuditResult(null);
      setCurrentWallet(null);

      try {
          // 1. Fetch Current Wallet
          const { data: wallet } = await supabase.from('wallets').select('*').eq('user_id', auditUserId).maybeSingle();
          if (wallet) setCurrentWallet(wallet);

          // 2. Run RPC Audit Function
          const { data: audit, error } = await supabase.rpc('reconcile_user_balance', { target_user_id: auditUserId });
          
          if (error) {
              if (error.message.includes('function reconcile_user_balance') && error.message.includes('does not exist')) {
                  toast.error("Audit function missing. Please run SQL in Database Ultra.");
              } else {
                  throw error;
              }
          } else if (audit && audit.length > 0) {
              setAuditResult(audit[0]);
          } else {
              setAuditResult({ calculated_main: 0, calculated_deposit: 0 }); // Default
          }

      } catch (e: any) {
          toast.error("Audit Error: " + e.message);
      } finally {
          setAuditLoading(false);
      }
  };

  const handleForceSync = async () => {
      if (!await confirm("Overwrite wallet balance with calculated history sum? This action is irreversible.", "Confirm Force Sync")) return;
      
      setAuditLoading(true);
      try {
          const { error } = await supabase.rpc('force_sync_wallet', { target_user_id: auditUserId });
          if (error) throw error;
          toast.success("Wallet Synchronized successfully!");
          handleAudit(); // Refresh
      } catch (e: any) {
          toast.error("Sync Error: " + e.message);
      } finally {
          setAuditLoading(false);
      }
  };

  const copyToClipboard = (text: string) => {
      navigator.clipboard.writeText(text);
      toast.success("Copied to clipboard");
  };

  return (
    <div className="space-y-6 animate-fade-in pb-20">
        
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
                <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                    <Banknote className="text-neon-green" /> Finance Hub
                </h2>
                <p className="text-gray-400 text-sm">Manage all incoming and outgoing funds.</p>
            </div>
            
            <div className="flex bg-white/10 p-1 rounded-xl border border-white/10 overflow-x-auto no-scrollbar max-w-full">
                <button 
                    onClick={() => setSection('deposits')}
                    className={`flex items-center gap-2 px-6 py-2 rounded-lg text-sm font-bold transition whitespace-nowrap ${section === 'deposits' ? 'bg-green-600 text-white shadow-lg' : 'text-gray-400 hover:text-white'}`}
                >
                    <ArrowDown size={16} /> Deposits
                </button>
                <button 
                    onClick={() => setSection('withdrawals')}
                    className={`flex items-center gap-2 px-6 py-2 rounded-lg text-sm font-bold transition whitespace-nowrap ${section === 'withdrawals' ? 'bg-red-600 text-white shadow-lg' : 'text-gray-400 hover:text-white'}`}
                >
                    <ArrowUp size={16} /> Withdrawals
                </button>
                <button 
                    onClick={() => setSection('audit')}
                    className={`flex items-center gap-2 px-6 py-2 rounded-lg text-sm font-bold transition whitespace-nowrap ${section === 'audit' ? 'bg-yellow-600 text-white shadow-lg' : 'text-gray-400 hover:text-white'}`}
                >
                    <Scale size={16} /> Auditor
                </button>
            </div>
        </div>

        {/* --- AUDITOR SECTION --- */}
        {section === 'audit' ? (
            <div className="space-y-6">
                <GlassCard className="border-yellow-500/30 bg-black/40">
                    <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                        <Scale size={20} className="text-yellow-500"/> Wallet Reconciliation Tool
                    </h3>
                    <p className="text-sm text-gray-400 mb-6 max-w-2xl">
                        This tool sums up every transaction in the database for a user and compares it against their current wallet balance.
                        Use this to fix "ghost money" or ensure integrity if a transaction log was deleted.
                    </p>

                    <div className="flex gap-4 mb-8">
                        <input 
                            type="text" 
                            placeholder="Enter User ID (UUID)..." 
                            value={auditUserId}
                            onChange={(e) => setAuditUserId(e.target.value)}
                            className="bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white w-full max-w-md focus:border-yellow-500 outline-none"
                        />
                        <button 
                            onClick={handleAudit}
                            disabled={auditLoading || !auditUserId}
                            className="bg-yellow-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-yellow-500 transition disabled:opacity-50 flex items-center gap-2"
                        >
                            {auditLoading ? <Loader2 className="animate-spin"/> : <Search size={18}/>} Scan User
                        </button>
                    </div>

                    {auditResult && currentWallet && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-fade-in">
                            {/* Current State */}
                            <div className="bg-white/5 border border-white/10 rounded-xl p-4">
                                <h4 className="text-gray-400 text-xs font-bold uppercase mb-4">Current Wallet (Database)</h4>
                                <div className="space-y-3">
                                    <div className="flex justify-between">
                                        <span>Main Balance</span>
                                        <span className="font-mono text-white"><BalanceDisplay amount={currentWallet.main_balance}/></span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span>Deposit Balance</span>
                                        <span className="font-mono text-white"><BalanceDisplay amount={currentWallet.deposit_balance}/></span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span>Total Earned</span>
                                        <span className="font-mono text-white"><BalanceDisplay amount={currentWallet.total_earning}/></span>
                                    </div>
                                </div>
                            </div>

                            {/* Calculated State */}
                            <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4">
                                <h4 className="text-blue-300 text-xs font-bold uppercase mb-4">Calculated from History (Strict)</h4>
                                <div className="space-y-3">
                                    <div className="flex justify-between">
                                        <span>Sum of Deposits</span>
                                        <span className="font-mono text-white font-bold"><BalanceDisplay amount={auditResult.calculated_deposit}/></span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span>Sum of Earnings</span>
                                        <span className="font-mono text-white font-bold"><BalanceDisplay amount={auditResult.calculated_earning}/></span>
                                    </div>
                                </div>
                                <div className="mt-4 pt-4 border-t border-blue-500/30">
                                    <p className="text-[10px] text-gray-400 mb-2 flex items-center gap-1">
                                        <AlertTriangle size={12}/> If values mismatch, click below to sync wallet to history.
                                    </p>
                                    <button 
                                        onClick={handleForceSync}
                                        className="w-full py-3 bg-red-600 text-white font-bold rounded-lg hover:bg-red-500 transition shadow-lg flex items-center justify-center gap-2"
                                    >
                                        <RefreshCw size={16}/> Auto-Fix & Synchronize
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </GlassCard>
            </div>
        ) : (
            <>
                {/* SUB TABS FOR DEPOSIT/WITHDRAW */}
                <div className="flex items-center justify-between border-b border-white/10 pb-1">
                    <div className="flex gap-4">
                        <button 
                            onClick={() => setActiveTab('pending')}
                            className={`pb-3 text-sm font-bold flex items-center gap-2 transition relative ${activeTab === 'pending' ? 'text-white' : 'text-gray-500 hover:text-gray-300'}`}
                        >
                            <Clock size={14} /> Pending
                            {activeTab === 'pending' && <motion.div layoutId="finTab" className={`absolute bottom-0 left-0 right-0 h-0.5 ${section === 'deposits' ? 'bg-green-500' : 'bg-red-500'}`} />}
                        </button>
                        <button 
                            onClick={() => setActiveTab('history')}
                            className={`pb-3 text-sm font-bold flex items-center gap-2 transition relative ${activeTab === 'history' ? 'text-white' : 'text-gray-500 hover:text-gray-300'}`}
                        >
                            <History size={14} /> History
                            {activeTab === 'history' && <motion.div layoutId="finTab" className={`absolute bottom-0 left-0 right-0 h-0.5 ${section === 'deposits' ? 'bg-green-500' : 'bg-red-500'}`} />}
                        </button>
                    </div>
                    <button onClick={fetchData} className="p-2 text-gray-400 hover:text-white transition"><RefreshCw size={16} className={loading ? 'animate-spin' : ''}/></button>
                </div>

                {loading ? (
                    <div className="p-20 text-center"><Loader2 className="animate-spin mx-auto text-white"/></div>
                ) : (
                    <div className="space-y-3">
                        {/* DEPOSITS LIST */}
                        {section === 'deposits' && (
                            depositRequests.length === 0 ? (
                                <div className="text-center py-12 text-gray-500 bg-white/5 rounded-xl border border-white/5">No {activeTab} deposits.</div>
                            ) : (
                                depositRequests.map(req => (
                                    <GlassCard key={req.id} className={`border relative overflow-hidden ${req.status === 'pending' ? 'border-l-4 border-l-green-500' : 'border-white/10 opacity-70'}`}>
                                        <div className="flex flex-col lg:flex-row gap-4 lg:items-center justify-between">
                                            <div className="space-y-1">
                                                <div className="flex items-center gap-2">
                                                    <h3 className="text-lg font-bold text-white flex items-center gap-1">
                                                        <DollarSign size={16} className="text-green-400"/> {req.amount.toFixed(2)}
                                                    </h3>
                                                    <span className="text-xs bg-white/10 px-2 py-0.5 rounded text-gray-300 font-mono uppercase">{req.method_name}</span>
                                                </div>
                                                <div className="flex items-center gap-4 text-xs text-gray-400">
                                                    <span className="flex items-center gap-1 bg-black/30 px-1.5 rounded"><FileText size={10}/> TrxID: <span className="text-white font-mono select-all">{req.transaction_id}</span></span>
                                                    <span className="flex items-center gap-1 bg-black/30 px-1.5 rounded"><CreditCard size={10}/> From: <span className="text-white font-mono select-all">{req.sender_number}</span></span>
                                                </div>
                                                {req.user_note && (
                                                    <p className="text-xs text-blue-300 italic mt-1 bg-blue-500/10 px-2 py-1 rounded inline-block">Note: "{req.user_note}"</p>
                                                )}
                                                <p className="text-[10px] text-gray-600 font-mono mt-1">User: {req.user_id} • {new Date(req.created_at).toLocaleString()}</p>
                                            </div>

                                            {req.status === 'pending' ? (
                                                <div className="flex gap-2">
                                                    {processingId === req.id ? <Loader2 className="animate-spin text-white"/> : (
                                                        <>
                                                            <button onClick={() => handleDepositAction(req, 'approved')} className="bg-green-600 hover:bg-green-500 text-white px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-1 shadow-lg">
                                                                <CheckCircle size={14}/> Approve
                                                            </button>
                                                            <button onClick={() => handleDepositAction(req, 'rejected')} className="bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-1">
                                                                <XCircle size={14}/> Reject
                                                            </button>
                                                        </>
                                                    )}
                                                </div>
                                            ) : (
                                                <div className="flex items-center gap-4">
                                                    <span className={`px-3 py-1 rounded text-xs font-bold uppercase ${req.status === 'approved' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                                                        {req.status}
                                                    </span>
                                                    
                                                    {/* AUTO APPROVE WARNING & BAN */}
                                                    {req.admin_note === 'AUTO_APPROVE_CHECK' && req.status === 'approved' && (
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-[10px] font-bold text-yellow-400 bg-yellow-500/10 px-2 py-1 rounded border border-yellow-500/20 animate-pulse">
                                                                ⚠️ Auto Approved - Please Check
                                                            </span>
                                                            <button 
                                                                onClick={() => handleFraudAction(req)}
                                                                className="px-3 py-1 bg-red-600 text-white text-[10px] font-bold rounded hover:bg-red-500 flex items-center gap-1"
                                                            >
                                                                <ShieldBan size={12}/> Fraud? Ban User
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </GlassCard>
                                ))
                            )
                        )}

                        {/* WITHDRAWALS LIST */}
                        {section === 'withdrawals' && (
                            withdrawRequests.length === 0 ? (
                                <div className="text-center py-12 text-gray-500 bg-white/5 rounded-xl border border-white/5">No {activeTab} withdrawals.</div>
                            ) : (
                                withdrawRequests.map(req => (
                                    <GlassCard key={req.id} className={`border relative overflow-hidden ${req.status === 'pending' ? 'border-l-4 border-l-red-500' : 'border-white/10 opacity-70'}`}>
                                        <div className="flex flex-col lg:flex-row gap-4 lg:items-center justify-between">
                                            <div className="space-y-1">
                                                <div className="flex items-center gap-2">
                                                    <h3 className="text-lg font-bold text-white flex items-center gap-1">
                                                        <DollarSign size={16} className="text-red-400"/> {req.amount.toFixed(2)}
                                                    </h3>
                                                    <span className="text-xs bg-purple-500/10 text-purple-300 border border-purple-500/20 px-2 py-0.5 rounded font-mono uppercase">{req.method}</span>
                                                </div>
                                                <div className="flex items-center gap-2 text-xs text-gray-400">
                                                    <span className="font-bold">To:</span>
                                                    <span className="text-white font-mono bg-black/30 px-2 py-0.5 rounded select-all flex items-center gap-2">
                                                        {req.account_number}
                                                        <button onClick={() => copyToClipboard(req.account_number || '')} className="hover:text-blue-400"><Copy size={10}/></button>
                                                    </span>
                                                </div>
                                                <p className="text-[10px] text-gray-600 font-mono mt-1">User: {req.user_id} • {new Date(req.created_at).toLocaleString()}</p>
                                            </div>

                                            {req.status === 'pending' ? (
                                                <div className="flex gap-2">
                                                    {processingId === req.id ? <Loader2 className="animate-spin text-white"/> : (
                                                        <>
                                                            <button onClick={() => handleWithdrawAction(req.id, 'approved')} className="bg-green-600 hover:bg-green-500 text-white px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-1 shadow-lg">
                                                                <CheckCircle size={14}/> Pay
                                                            </button>
                                                            <button onClick={() => handleWithdrawAction(req.id, 'rejected')} className="bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-1">
                                                                <XCircle size={14}/> Refund
                                                            </button>
                                                        </>
                                                    )}
                                                </div>
                                            ) : (
                                                <span className={`px-3 py-1 rounded text-xs font-bold uppercase ${req.status === 'approved' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                                                    {req.status}
                                                </span>
                                            )}
                                        </div>
                                    </GlassCard>
                                ))
                            )
                        )}
                    </div>
                )}
            </>
        )}
    </div>
  );
};

export default FinanceManager;
