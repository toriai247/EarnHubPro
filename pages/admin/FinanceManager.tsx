import React, { useEffect, useState } from 'react';
import GlassCard from '../../components/GlassCard';
import { supabase } from '../../integrations/supabase/client';
import { DepositRequest, WithdrawRequest } from '../../types';
import { 
    CheckCircle, XCircle, Loader2, RefreshCw, DollarSign, Banknote, 
    Clock, History, FileText, CreditCard, Copy, ArrowRightLeft, ArrowDown, ArrowUp, Search, Scale, AlertTriangle, ShieldBan, TrendingUp, Info, ChevronRight, Terminal
} from 'lucide-react';
import { useUI } from '../../context/UIContext';
import { updateWallet, createTransaction, recordLedgerEntry } from '../../lib/actions';
import { motion, AnimatePresence } from 'framer-motion';
import BalanceDisplay from '../../components/BalanceDisplay';

const FinanceManager: React.FC = () => {
  const { toast, confirm } = useUI();
  const [section, setSection] = useState<'deposits' | 'withdrawals' | 'audit' | 'ledger'>('deposits');
  const [activeTab, setActiveTab] = useState<'pending' | 'history'>('pending');
  const [loading, setLoading] = useState(true);
  
  // Data
  const [depositRequests, setDepositRequests] = useState<DepositRequest[]>([]);
  const [withdrawRequests, setWithdrawRequests] = useState<WithdrawRequest[]>([]);
  const [ledgerLogs, setLedgerLogs] = useState<any[]>([]);
  
  // Auditor State
  const [auditUserId, setAuditUserId] = useState('');
  const [auditResult, setAuditResult] = useState<any>(null);
  const [auditLoading, setAuditLoading] = useState(false);
  const [currentWallet, setCurrentWallet] = useState<any>(null);
  
  // Processing State
  const [processingId, setProcessingId] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, [section, activeTab]);

  const fetchData = async () => {
    setLoading(true);
    try {
        if (section === 'deposits') {
            let query = supabase.from('deposit_requests').select('*').order('created_at', { ascending: false });
            if (activeTab === 'pending') query = query.eq('status', 'pending');
            else query = query.neq('status', 'pending').limit(50);
            const { data } = await query;
            if (data) setDepositRequests(data as DepositRequest[]);
        } 
        else if (section === 'withdrawals') {
            let query = supabase.from('withdraw_requests').select('*').order('created_at', { ascending: false });
            if (activeTab === 'pending') query = query.eq('status', 'pending');
            else query = query.neq('status', 'pending').limit(50);
            const { data } = await query;
            if (data) setWithdrawRequests(data as WithdrawRequest[]);
        }
        else if (section === 'ledger') {
            const { data } = await supabase.from('transactions')
                .select('*')
                .order('created_at', { ascending: false })
                .limit(100);
            if (data) setLedgerLogs(data);
        }
    } catch (e) {
        console.error(e);
    }
    setLoading(false);
  };

  // Add copyToClipboard helper
  const copyToClipboard = (text: string) => {
      navigator.clipboard.writeText(text);
      toast.success("Copied to clipboard");
  };

  const handleDepositAction = async (req: DepositRequest, status: 'approved' | 'rejected') => {
      const isApproved = status === 'approved';
      if (!await confirm(`Authorize ${status.toUpperCase()} protocol for ৳${req.amount.toLocaleString()}?`)) return;

      setProcessingId(req.id);
      try {
          const { error } = await supabase.from('deposit_requests').update({
              status,
              processed_at: new Date().toISOString(),
              admin_note: isApproved ? 'Authorized by Admin' : 'Rejected by Admin'
          }).eq('id', req.id);

          if (error) throw error;

          if (isApproved) {
              await recordLedgerEntry(req.user_id, 'DEPOSIT', 'deposit_balance', req.amount, `Fund Deposit (${req.method_name})`, true);
              const { data: sysConfig } = await supabase.from('system_config').select('is_activation_enabled, activation_amount').single();
              if (sysConfig?.is_activation_enabled && req.amount >= (sysConfig.activation_amount || 500)) {
                  await supabase.from('profiles').update({ is_account_active: true }).eq('id', req.user_id);
              }
          }

          toast.success(`Protocol executed: ${status}`);
          fetchData();
      } catch (e: any) {
          toast.error("Protocol Error: " + e.message);
      } finally {
          setProcessingId(null);
      }
  };

  const handleWithdrawAction = async (id: string, status: 'approved' | 'rejected') => {
      if (!await confirm(`Confirm ${status.toUpperCase()} for this payout?`)) return;
      
      setProcessingId(id);
      try {
          const { data: request } = await supabase.from('withdraw_requests').select('*').eq('id', id).single();
          if (!request) throw new Error("Packet not found");

          await supabase.from('withdraw_requests').update({ status, processed_at: new Date().toISOString() }).eq('id', id);

          if (status === 'rejected') {
              await recordLedgerEntry(request.user_id, 'REFUND', 'main_balance', request.amount, `Withdrawal Protocol Aborted (Refunded)`, true);
          } else {
              await createTransaction(request.user_id, 'WITHDRAW', request.amount, `Withdrawal Successfully Processed`);
          }

          toast.success(`Payout ${status}`);
          fetchData();
      } catch (e: any) {
          toast.error('Sync Failure: ' + e.message);
      } finally {
          setProcessingId(null);
      }
  };

  const handleAudit = async () => {
      if (!auditUserId) return;
      setAuditLoading(true);
      setAuditResult(null);
      try {
          const { data: wallet } = await supabase.from('wallets').select('*').eq('user_id', auditUserId).maybeSingle();
          if (wallet) setCurrentWallet(wallet);

          const { data: audit, error } = await supabase.rpc('reconcile_user_balance', { target_user_id: auditUserId });
          if (error) throw error;
          if (audit?.length > 0) setAuditResult(audit[0]);
      } catch (e: any) {
          toast.error("Audit Failed: " + e.message);
      } finally {
          setAuditLoading(false);
      }
  };

  return (
    <div className="space-y-8 animate-fade-in pb-20">
        
        {/* FINANCE HEADER */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
            <div>
                <h2 className="text-3xl font-black text-white uppercase tracking-tighter">Treasury</h2>
                <p className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.3em] mt-1">Central Financial Ledger</p>
            </div>
            
            <div className="bg-[#0a0a0a] p-1 rounded-2xl border border-white/5 flex gap-1 shadow-2xl backdrop-blur-xl overflow-x-auto no-scrollbar max-w-full">
                {['deposits', 'withdrawals', 'ledger', 'audit'].map(s => (
                    <button 
                        key={s}
                        onClick={() => setSection(s as any)}
                        className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${section === s ? 'bg-indigo-600 text-white shadow-[0_0_15px_rgba(79,70,229,0.3)]' : 'text-gray-500 hover:text-white'}`}
                    >
                        {s}
                    </button>
                ))}
            </div>
        </div>

        {/* --- LEDGER VIEW --- */}
        {section === 'ledger' && (
            <div className="space-y-4">
                 <div className="flex justify-between items-center bg-[#0a0a0a] p-4 rounded-2xl border border-white/5">
                    <h3 className="font-black text-white uppercase text-[10px] tracking-[0.3em] flex items-center gap-3">
                        <Terminal size={14} className="text-indigo-400"/> Operational Audit History
                    </h3>
                    <button onClick={fetchData} className="p-2 text-gray-500 hover:text-white transition group">
                        <RefreshCw size={16} className={loading ? 'animate-spin' : 'group-active:rotate-180 transition-transform duration-500'}/>
                    </button>
                </div>
                <div className="bg-[#050505] border border-white/5 rounded-3xl overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.5)]">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-[11px] font-mono">
                            <thead className="bg-white/[0.03] text-gray-600 uppercase font-black">
                                <tr>
                                    <th className="p-4">Sync_Time</th>
                                    <th className="p-4">Node_ID</th>
                                    <th className="p-4">Protocol_Type</th>
                                    <th className="p-4">Target_Wallet</th>
                                    <th className="p-4 text-right">Magnitude</th>
                                    <th className="p-4 text-right">Snapshot (Pre {'->'} Post)</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {loading ? (
                                    <tr><td colSpan={6} className="p-20 text-center"><Loader2 className="animate-spin mx-auto text-indigo-500"/></td></tr>
                                ) : ledgerLogs.length === 0 ? (
                                    <tr><td colSpan={6} className="p-20 text-center text-gray-600 font-black uppercase tracking-widest">No Log Packets Intercepted</td></tr>
                                ) : ledgerLogs.map(log => (
                                    <tr key={log.id} className="hover:bg-indigo-500/5 transition-colors group">
                                        <td className="p-4 text-gray-500 whitespace-nowrap">{new Date(log.created_at).toLocaleTimeString()}</td>
                                        <td className="p-4 text-indigo-400/60 group-hover:text-indigo-400 transition-colors">ID: {log.user_id.substring(0,8)}</td>
                                        <td className="p-4">
                                            <span className={`px-2 py-0.5 rounded-md font-black border text-[9px] ${
                                                ['DEPOSIT', 'BET_WIN', 'TASK_EARN'].includes(log.type) ? 'border-green-500/20 text-green-400 bg-green-500/10' : 'border-red-500/20 text-red-400 bg-red-500/10'
                                            }`}>{log.type}</span>
                                        </td>
                                        <td className="p-4 text-gray-400 capitalize">{log.wallet_affected?.replace('_', ' ') || 'Global'}</td>
                                        <td className={`p-4 text-right font-black text-sm ${['DEPOSIT', 'BET_WIN', 'TASK_EARN', 'BONUS_ADD'].includes(log.type) ? 'text-green-400' : 'text-white'}`}>
                                            {['DEPOSIT', 'BET_WIN', 'TASK_EARN', 'BONUS_ADD'].includes(log.type) ? '+' : '-'}৳{log.amount.toLocaleString()}
                                        </td>
                                        <td className="p-4 text-right">
                                            {log.balance_before !== null ? (
                                                <span className="text-[10px] text-gray-600 font-bold">
                                                    {log.balance_before.toFixed(1)} <ChevronRight size={8} className="inline mx-1"/> 
                                                    <span className="text-gray-300">{log.balance_after.toFixed(1)}</span>
                                                </span>
                                            ) : (
                                                <span className="text-gray-800 italic">No Diff</span>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        )}

        {/* --- DEPOSIT/WITHDRAW LISTS --- */}
        {(section === 'deposits' || section === 'withdrawals') && (
            <div className="space-y-6">
                <div className="flex gap-6 border-b border-white/5">
                    {['pending', 'history'].map(tab => (
                        <button 
                            key={tab} 
                            onClick={() => setActiveTab(tab as any)} 
                            className={`pb-3 text-[10px] font-black uppercase tracking-[0.3em] transition-all relative ${activeTab === tab ? 'text-white' : 'text-gray-600 hover:text-gray-400'}`}
                        >
                            {tab} {activeTab === tab && <motion.div layoutId="subTabMarker" className={`absolute bottom-0 left-0 right-0 h-1 rounded-t-full ${section === 'deposits' ? 'bg-green-500' : 'bg-red-500'}`}/>}
                        </button>
                    ))}
                </div>
                
                {loading ? <div className="p-20 flex justify-center"><Loader2 className="animate-spin text-indigo-500" size={32}/></div> : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {section === 'deposits' && depositRequests.map(req => (
                             <GlassCard key={req.id} className={`border transition-all hover:bg-white/[0.02] ${req.status === 'pending' ? 'border-white/10' : 'border-white/5 opacity-60'}`}>
                                <div className="flex flex-col gap-4">
                                    <div className="flex justify-between items-start">
                                        <div className="space-y-1">
                                            <p className="text-[9px] font-black text-gray-600 uppercase tracking-widest">Protocol Value</p>
                                            <h3 className="font-black text-white text-3xl font-mono leading-none">৳{req.amount.toLocaleString()}</h3>
                                            <div className="flex items-center gap-2 mt-2">
                                                <span className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-widest ${req.method_name.toLowerCase().includes('bkash') ? 'bg-pink-600 text-white' : 'bg-indigo-600 text-white'}`}>
                                                    {req.method_name}
                                                </span>
                                                <span className="text-[10px] text-gray-500 font-bold">via Mobile Gateway</span>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-[9px] font-black text-gray-600 uppercase tracking-widest mb-1">Time Initiated</p>
                                            <p className="text-[10px] text-gray-300 font-bold">{new Date(req.created_at).toLocaleString([], {hour:'2-digit', minute:'2-digit', month:'short', day:'numeric'})}</p>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-2 bg-black/40 p-3 rounded-2xl border border-white/5">
                                        <div className="min-w-0">
                                            <p className="text-[8px] text-gray-600 font-black uppercase mb-1">Packet Hash (TrxID)</p>
                                            <p className="text-[11px] text-indigo-400 font-mono font-bold truncate select-all">{req.transaction_id}</p>
                                        </div>
                                        <div className="min-w-0">
                                            <p className="text-[8px] text-gray-600 font-black uppercase mb-1">Sender ID (Phone)</p>
                                            <p className="text-[11px] text-white font-mono font-bold truncate select-all">{req.sender_number}</p>
                                        </div>
                                    </div>

                                    {req.user_note && (
                                        <div className="p-2.5 bg-blue-500/10 border border-blue-500/20 rounded-xl flex items-start gap-2">
                                            <Info size={12} className="text-blue-400 shrink-0 mt-0.5" />
                                            <p className="text-[10px] text-blue-200 leading-relaxed italic">"{req.user_note}"</p>
                                        </div>
                                    )}

                                    <div className="flex gap-2 pt-2 border-t border-white/5 mt-1">
                                        {req.status === 'pending' ? (
                                            <>
                                                <button onClick={() => handleDepositAction(req, 'approved')} className="flex-1 py-3 bg-green-600 hover:bg-green-500 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg active:scale-95 transition-all">APPROVE</button>
                                                <button onClick={() => handleDepositAction(req, 'rejected')} className="flex-1 py-3 bg-red-600/10 hover:bg-red-600/20 text-red-400 border border-red-500/20 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all">REJECT</button>
                                            </>
                                        ) : (
                                            <div className="w-full flex items-center justify-between px-2">
                                                <span className={`text-[10px] font-black uppercase tracking-[0.2em] ${req.status === 'approved' ? 'text-green-500' : 'text-red-500'}`}>Protocol: {req.status}</span>
                                                <span className="text-[10px] text-gray-600 font-mono">NODE_HASH: {req.user_id.substring(0,8)}</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                             </GlassCard>
                        ))}

                        {section === 'withdrawals' && withdrawRequests.map(req => (
                             <GlassCard key={req.id} className={`border transition-all hover:bg-white/[0.02] ${req.status === 'pending' ? 'border-white/10' : 'border-white/5 opacity-60'}`}>
                                <div className="flex flex-col gap-4">
                                    <div className="flex justify-between items-start">
                                        <div className="space-y-1">
                                            <p className="text-[9px] font-black text-gray-600 uppercase tracking-widest">Outflow Magnitude</p>
                                            <h3 className="font-black text-white text-3xl font-mono leading-none">৳{req.amount.toLocaleString()}</h3>
                                            <div className="flex items-center gap-2 mt-2">
                                                <span className="px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-widest bg-purple-600 text-white">
                                                    {req.method}
                                                </span>
                                                <span className="text-[10px] text-gray-500 font-bold uppercase">Cashout Stream</span>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-[9px] font-black text-gray-600 uppercase tracking-widest mb-1">Queue Priority</p>
                                            <div className="flex items-center gap-1.5 justify-end">
                                                <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></div>
                                                <span className="text-[10px] text-white font-bold uppercase">High</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="bg-black/40 p-4 rounded-2xl border border-white/5 flex items-center justify-between group">
                                        <div className="min-w-0 flex-1 pr-4">
                                            <p className="text-[8px] text-gray-600 font-black uppercase mb-1">External Address / Phone</p>
                                            <p className="text-sm text-white font-mono font-black tracking-wider truncate select-all">{req.account_number}</p>
                                        </div>
                                        <button onClick={() => copyToClipboard(req.account_number || '')} className="p-2.5 bg-white/5 hover:bg-white/10 rounded-lg text-gray-500 transition border border-white/10">
                                            <Copy size={16}/>
                                        </button>
                                    </div>

                                    <div className="flex gap-2 pt-2 border-t border-white/5 mt-1">
                                        {req.status === 'pending' ? (
                                            <>
                                                <button onClick={() => handleWithdrawAction(req.id, 'approved')} className="flex-1 py-3 bg-green-600 hover:bg-green-500 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg active:scale-95 transition-all">DISBURSE</button>
                                                <button onClick={() => handleWithdrawAction(req.id, 'rejected')} className="flex-1 py-3 bg-red-600/10 hover:bg-red-600/20 text-red-400 border border-red-500/20 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all">REFUND</button>
                                            </>
                                        ) : (
                                            <div className="w-full flex items-center justify-between px-2">
                                                <span className={`text-[10px] font-black uppercase tracking-[0.2em] ${req.status === 'approved' ? 'text-green-500' : 'text-red-500'}`}>Protocol: {req.status}</span>
                                                <p className="text-[10px] text-gray-600 font-mono">NODE_HASH: {req.user_id.substring(0,8)}</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                             </GlassCard>
                        ))}
                    </div>
                )}
            </div>
        )}

        {/* --- AUDITOR SECTION --- */}
        {section === 'audit' && (
            <GlassCard className="border-indigo-500/30 bg-indigo-900/5 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none rotate-12"><Scale size={180}/></div>
                
                <div className="relative z-10 max-w-2xl">
                    <h3 className="text-xl font-black text-white uppercase tracking-tighter mb-2">Node Reconciliation Auditor</h3>
                    <p className="text-sm text-gray-400 mb-8 leading-relaxed">
                        Execute deep-scan of transaction shards to verify wallet integrity. 
                        This procedure will re-calculate the aggregate balance from raw history blocks.
                    </p>

                    <div className="flex flex-col sm:flex-row gap-3 mb-10">
                        <input 
                            type="text" 
                            value={auditUserId} 
                            onChange={e => setAuditUserId(e.target.value)} 
                            placeholder="Enter User UUID Identity..."
                            className="flex-1 bg-black border border-white/10 rounded-2xl px-5 py-4 text-white text-xs font-mono outline-none focus:border-indigo-500 transition-all shadow-inner"
                        />
                        <button onClick={handleAudit} disabled={auditLoading} className="bg-indigo-600 text-white px-8 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-indigo-500 transition shadow-[0_0_25px_rgba(79,70,229,0.3)] active:scale-95 disabled:opacity-50">
                            {auditLoading ? <Loader2 className="animate-spin" size={18}/> : 'Analyze Identity'}
                        </button>
                    </div>

                    <AnimatePresence>
                        {auditResult && currentWallet && (
                            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="bg-black/60 p-5 rounded-2xl border border-white/5 space-y-4">
                                    <h4 className="text-[10px] text-gray-500 uppercase font-black tracking-widest">Active Database State</h4>
                                    <div className="space-y-3">
                                        <div className="flex justify-between items-baseline">
                                            <span className="text-xs text-gray-400">Total Net Worth</span>
                                            <span className="text-lg font-black text-white font-mono">৳{currentWallet.balance.toLocaleString()}</span>
                                        </div>
                                        <div className="flex justify-between items-baseline border-t border-white/5 pt-3">
                                            <span className="text-xs text-gray-400">Withdrawable Block</span>
                                            <span className="text-lg font-black text-indigo-400 font-mono">৳{currentWallet.withdrawable.toLocaleString()}</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="bg-indigo-900/20 p-5 rounded-2xl border border-indigo-500/20 space-y-4 shadow-xl">
                                    <h4 className="text-[10px] text-indigo-400 uppercase font-black tracking-widest">Recalculated History Sum</h4>
                                    <div className="space-y-3">
                                        <div className="flex justify-between items-baseline">
                                            <span className="text-xs text-gray-400">Inbound (Sum Deps)</span>
                                            <span className="text-lg font-black text-green-400 font-mono">৳{auditResult.calculated_deposit.toLocaleString()}</span>
                                        </div>
                                        <div className="flex justify-between items-baseline border-t border-indigo-500/10 pt-3">
                                            <span className="text-xs text-gray-400">Yield (Sum Earn)</span>
                                            <span className="text-lg font-black text-green-400 font-mono">৳{auditResult.calculated_earning.toLocaleString()}</span>
                                        </div>
                                    </div>
                                </div>
                                
                                <div className="md:col-span-2 mt-4 p-4 bg-yellow-900/10 border border-yellow-500/20 rounded-2xl flex items-center justify-between gap-6">
                                    <div className="flex items-center gap-3">
                                        <AlertTriangle className="text-yellow-500 shrink-0" size={24}/>
                                        <p className="text-[11px] text-yellow-200/80 leading-relaxed">
                                            Mismatch detected between Ledger and Wallet State. Click 'Execute Repair' to overwrite active balance with history block sum.
                                        </p>
                                    </div>
                                    <button className="px-6 py-3 bg-red-600 text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-red-500 transition-all shadow-lg active:scale-95 whitespace-nowrap">
                                        Execute Repair
                                    </button>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </GlassCard>
        )}
    </div>
  );
};

export default FinanceManager;