
import React, { useEffect, useState } from 'react';
import GlassCard from '../../components/GlassCard';
import { ArrowLeft, User, Mail, ShieldCheck, AlertTriangle, DollarSign, Save, CreditCard, Gamepad2, Gift, Users, Activity, X, CheckCircle2, Lock, Unlock, RefreshCw, Trophy, Clock, TrendingUp, ArrowDownLeft, ArrowUpRight } from 'lucide-react';
import { supabase } from '../../integrations/supabase/client';
import { UserProfile, WalletData, Transaction, GameResult } from '../../types';
import { createTransaction } from '../../lib/actions';
import { useUI } from '../../context/UIContext';
import { motion, AnimatePresence } from 'framer-motion';
import BalanceDisplay from '../../components/BalanceDisplay';

interface UserInfoProps {
    userId: string;
    onBack: () => void;
}

const UserInfo: React.FC<UserInfoProps> = ({ userId, onBack }) => {
    const { toast, confirm } = useUI();
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [wallet, setWallet] = useState<WalletData | null>(null);
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [gameHistory, setGameHistory] = useState<GameResult[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'overview' | 'transactions' | 'games'>('overview');
    
    // Edit States
    const [isEditingProfile, setIsEditingProfile] = useState(false);
    const [editForm, setEditForm] = useState({ name: '', phone: '', bio: '', level: 1 });
    
    // Wallet Adjustment State
    const [adjustModalOpen, setAdjustModalOpen] = useState(false);
    const [selectedWalletType, setSelectedWalletType] = useState('');
    const [adjustAmount, setAdjustAmount] = useState('');
    const [adjustAction, setAdjustAction] = useState<'credit' | 'debit'>('credit');
    const [adjustNote, setAdjustNote] = useState('');

    useEffect(() => {
        fetchUserData();
    }, [userId]);

    const fetchUserData = async () => {
        setLoading(true);
        const [prof, wal, txs, games] = await Promise.all([
            supabase.from('profiles').select('*').eq('id', userId).single(),
            supabase.from('wallets').select('*').eq('user_id', userId).single(),
            supabase.from('transactions').select('*').eq('user_id', userId).order('created_at', {ascending: false}).limit(50),
            supabase.from('game_history').select('*').eq('user_id', userId).order('created_at', {ascending: false}).limit(50)
        ]);

        if (prof.data) {
            setProfile(prof.data as UserProfile);
            setEditForm({
                name: prof.data.name_1 || '',
                phone: prof.data.phone_1 || '',
                bio: prof.data.bio_1 || '',
                level: prof.data.level_1
            });
        }
        if (wal.data) setWallet(wal.data as WalletData);
        if (txs.data) setTransactions(txs.data as Transaction[]);
        if (games.data) {
            setGameHistory(games.data.map((g: any) => ({
                id: g.id, gameId: g.game_id, gameName: g.game_name, bet: g.bet, payout: g.payout, profit: g.profit, details: g.details, timestamp: new Date(g.created_at).getTime()
            })));
        }
        setLoading(false);
    };

    const handleSaveProfile = async () => {
        if (!profile) return;
        const { error } = await supabase.from('profiles').update({
            name_1: editForm.name,
            phone_1: editForm.phone,
            bio_1: editForm.bio,
            level_1: editForm.level
        }).eq('id', profile.id);

        if (error) toast.error(error.message);
        else {
            toast.success("Profile updated");
            setIsEditingProfile(false);
            fetchUserData();
        }
    };

    const toggleBlock = async () => {
        if (!profile) return;
        const newVal = !profile.is_withdraw_blocked;
        const confirmed = await confirm(`Are you sure you want to ${newVal ? 'BLOCK' : 'UNBLOCK'} withdrawals for this user?`);
        if (!confirmed) return;

        await supabase.from('profiles').update({ is_withdraw_blocked: newVal }).eq('id', profile.id);
        fetchUserData();
        toast.success(newVal ? "User Blocked" : "User Unblocked");
    };

    const toggleKYC = async () => {
        if (!profile) return;
        const newVal = !profile.is_kyc_1;
        await supabase.from('profiles').update({ is_kyc_1: newVal }).eq('id', profile.id);
        fetchUserData();
        toast.success(newVal ? "KYC Verified" : "KYC Revoked");
    };

    const openAdjustModal = (type: string) => {
        setSelectedWalletType(type);
        setAdjustAmount('');
        setAdjustAction('credit');
        setAdjustNote('');
        setAdjustModalOpen(true);
    };

    const handleWalletAdjust = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!wallet || !adjustAmount) return;
        
        const amount = parseFloat(adjustAmount);
        if (isNaN(amount) || amount <= 0) { toast.error("Invalid amount"); return; }

        const confirmed = await confirm(
            `Are you sure you want to ${adjustAction.toUpperCase()} $${amount} from ${selectedWalletType.replace('_balance', '')} wallet?`,
            'Confirm Adjustment'
        );
        if (!confirmed) return;

        try {
            // 1. Update Wallet in DB
            // @ts-ignore
            const currentBal = wallet[selectedWalletType] || 0;
            const newBal = adjustAction === 'credit' ? currentBal + amount : Math.max(0, currentBal - amount);
            
            // If adjusting main_balance, also update 'balance' and 'withdrawable' for legacy sync
            const updates: any = { [selectedWalletType]: newBal };
            if (selectedWalletType === 'main_balance') {
                updates.balance = newBal;
                updates.withdrawable = Math.max(0, newBal - (wallet.pending_withdraw || 0));
            }

            const { error } = await supabase.from('wallets').update(updates).eq('user_id', userId);
            if (error) throw error;

            // 2. Log Transaction
            await createTransaction(
                userId, 
                adjustAction === 'credit' ? 'bonus' : 'penalty', 
                amount, 
                `Admin Adjustment (${adjustAction}): ${adjustNote || 'Manual Update'}`
            );

            toast.success("Wallet adjusted successfully");
            setAdjustModalOpen(false);
            fetchUserData();

        } catch (e: any) {
            toast.error(e.message);
        }
    };

    if (loading || !profile || !wallet) return <div className="p-10 text-center text-gray-500">Loading user data...</div>;

    const walletItems = [
        { key: 'main_balance', label: 'Main (Withdrawable)', icon: CreditCard, color: 'text-white' },
        { key: 'deposit_balance', label: 'Deposit', icon: DollarSign, color: 'text-blue-400' },
        { key: 'game_balance', label: 'Game', icon: Gamepad2, color: 'text-purple-400' },
        { key: 'bonus_balance', label: 'Bonus', icon: Gift, color: 'text-pink-400' },
        { key: 'earning_balance', label: 'Earnings', icon: Activity, color: 'text-yellow-400' },
        { key: 'referral_balance', label: 'Referral', icon: Users, color: 'text-green-400' },
    ];

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="flex items-center gap-4">
                <button onClick={onBack} className="p-2 bg-white/10 rounded-lg hover:bg-white/20 text-white"><ArrowLeft size={20}/></button>
                <h2 className="text-2xl font-bold text-white">User Profile: {profile.name_1}</h2>
                <div className="ml-auto flex gap-2">
                    <button onClick={() => fetchUserData()} className="p-2 bg-white/5 rounded hover:bg-white/10 text-gray-400"><RefreshCw size={18}/></button>
                </div>
            </div>

            {/* TOP SECTION: PROFILE & STATUS */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <GlassCard className="md:col-span-2 flex flex-col md:flex-row items-start gap-6">
                    <div className="w-24 h-24 rounded-full bg-black/30 border-2 border-white/10 overflow-hidden flex-shrink-0">
                        <img src={profile.avatar_1 || `https://api.dicebear.com/7.x/avataaars/svg?seed=${profile.name_1}`} className="w-full h-full object-cover" alt="" />
                    </div>
                    
                    <div className="flex-1 w-full">
                        <div className="flex justify-between items-start">
                            <div>
                                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                                    {profile.name_1} 
                                    {profile.is_kyc_1 && <CheckCircle2 size={18} className="text-neon-green" />}
                                    {profile.is_withdraw_blocked && <Lock size={18} className="text-red-500" />}
                                </h3>
                                <p className="text-sm text-gray-400">{profile.email_1}</p>
                                <p className="text-xs font-mono text-gray-600 mt-1 select-all">ID: {profile.id}</p>
                            </div>
                            <button onClick={() => setIsEditingProfile(!isEditingProfile)} className="text-xs bg-white/10 px-3 py-1 rounded hover:bg-white/20 text-white">
                                {isEditingProfile ? 'Cancel' : 'Edit Details'}
                            </button>
                        </div>

                        {isEditingProfile ? (
                            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4 bg-white/5 p-4 rounded-xl">
                                <div>
                                    <label className="text-xs text-gray-500 block mb-1">Full Name</label>
                                    <input value={editForm.name} onChange={e => setEditForm({...editForm, name: e.target.value})} className="w-full bg-black/40 rounded p-2 text-white text-sm border border-white/10" />
                                </div>
                                <div>
                                    <label className="text-xs text-gray-500 block mb-1">Phone</label>
                                    <input value={editForm.phone} onChange={e => setEditForm({...editForm, phone: e.target.value})} className="w-full bg-black/40 rounded p-2 text-white text-sm border border-white/10" />
                                </div>
                                <div>
                                    <label className="text-xs text-gray-500 block mb-1">Level</label>
                                    <input type="number" value={editForm.level} onChange={e => setEditForm({...editForm, level: parseInt(e.target.value)})} className="w-full bg-black/40 rounded p-2 text-white text-sm border border-white/10" />
                                </div>
                                <div className="flex items-end">
                                    <button onClick={handleSaveProfile} className="w-full bg-neon-green text-black font-bold py-2 rounded hover:bg-emerald-400 text-sm">Save Changes</button>
                                </div>
                            </div>
                        ) : (
                            <div className="mt-4 flex flex-wrap gap-4 text-sm text-gray-300">
                                <div className="bg-black/20 px-3 py-1.5 rounded border border-white/5">
                                    <span className="text-gray-500 text-xs block uppercase">Phone</span>
                                    {profile.phone_1 || 'N/A'}
                                </div>
                                <div className="bg-black/20 px-3 py-1.5 rounded border border-white/5">
                                    <span className="text-gray-500 text-xs block uppercase">Joined</span>
                                    {new Date(profile.created_at).toLocaleDateString()}
                                </div>
                                <div className="bg-black/20 px-3 py-1.5 rounded border border-white/5">
                                    <span className="text-gray-500 text-xs block uppercase">Ref Code</span>
                                    {profile.ref_code_1}
                                </div>
                                <div className="bg-black/20 px-3 py-1.5 rounded border border-white/5">
                                    <span className="text-gray-500 text-xs block uppercase">Rank</span>
                                    Lvl {profile.level_1} ({profile.rank_1})
                                </div>
                            </div>
                        )}
                    </div>
                </GlassCard>

                <div className="space-y-4">
                    <GlassCard className="p-4 bg-red-500/5 border-red-500/20">
                        <h4 className="font-bold text-white mb-3 text-sm">Administrative Actions</h4>
                        <div className="space-y-2">
                            <button onClick={toggleBlock} className={`w-full py-2 rounded text-xs font-bold border flex items-center justify-center gap-2 ${profile.is_withdraw_blocked ? 'bg-green-500/20 text-green-400 border-green-500/30' : 'bg-red-500/20 text-red-400 border-red-500/30'}`}>
                                {profile.is_withdraw_blocked ? <Unlock size={14}/> : <Lock size={14}/>}
                                {profile.is_withdraw_blocked ? 'Unblock Withdrawals' : 'Block Withdrawals'}
                            </button>
                            <button onClick={toggleKYC} className={`w-full py-2 rounded text-xs font-bold border flex items-center justify-center gap-2 ${profile.is_kyc_1 ? 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' : 'bg-blue-500/20 text-blue-400 border-blue-500/30'}`}>
                                <ShieldCheck size={14}/>
                                {profile.is_kyc_1 ? 'Revoke KYC' : 'Mark KYC Verified'}
                            </button>
                        </div>
                    </GlassCard>
                </div>
            </div>

            {/* WALLET MANAGEMENT */}
            <div className="space-y-4">
                <h3 className="text-lg font-bold text-white flex items-center gap-2"><CreditCard className="text-neon-green" size={20}/> Wallet Management</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {walletItems.map((item) => {
                        // @ts-ignore
                        const balance = wallet[item.key] || 0;
                        return (
                            <GlassCard key={item.key} className="p-4 flex flex-col justify-between border border-white/5 relative overflow-hidden group hover:border-white/20">
                                <div className="flex justify-between items-start mb-4">
                                    <div className="flex items-center gap-3">
                                        <div className={`p-2 rounded-lg bg-white/5 ${item.color}`}><item.icon size={20}/></div>
                                        <div>
                                            <p className="text-xs text-gray-400 uppercase font-bold">{item.label}</p>
                                            <p className={`text-xl font-bold ${item.color} font-mono`}><BalanceDisplay amount={balance} /></p>
                                        </div>
                                    </div>
                                </div>
                                <button 
                                    onClick={() => openAdjustModal(item.key)}
                                    className="w-full py-2 bg-white/5 hover:bg-white/10 rounded-lg text-xs font-bold text-gray-300 transition border border-white/5"
                                >
                                    Adjust Balance
                                </button>
                            </GlassCard>
                        )
                    })}
                </div>
            </div>

            {/* TRANSACTIONS & DATA TABS */}
            <div className="bg-white/5 rounded-2xl border border-white/5 overflow-hidden">
                <div className="flex border-b border-white/5">
                    {[
                        {id: 'overview', label: 'Overview'},
                        {id: 'transactions', label: 'Transactions'},
                        {id: 'games', label: 'Game History'},
                    ].map(tab => (
                        <button 
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id as any)}
                            className={`px-6 py-4 text-sm font-bold capitalize ${activeTab === tab.id ? 'text-white bg-white/5 border-b-2 border-neon-green' : 'text-gray-500 hover:text-gray-300'}`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>
                
                <div className="p-4">
                    {activeTab === 'overview' && (
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                            <div className="bg-black/20 p-4 rounded-xl border border-white/5">
                                <p className="text-xs text-gray-500 uppercase mb-1">Total Deposit</p>
                                <p className="text-white font-bold"><BalanceDisplay amount={wallet.deposit} /></p>
                            </div>
                            <div className="bg-black/20 p-4 rounded-xl border border-white/5">
                                <p className="text-xs text-gray-500 uppercase mb-1">Total Earning</p>
                                <p className="text-neon-green font-bold"><BalanceDisplay amount={wallet.total_earning} /></p>
                            </div>
                            <div className="bg-black/20 p-4 rounded-xl border border-white/5">
                                <p className="text-xs text-gray-500 uppercase mb-1">Pending Withdraw</p>
                                <p className="text-yellow-400 font-bold"><BalanceDisplay amount={wallet.pending_withdraw} /></p>
                            </div>
                            <div className="bg-black/20 p-4 rounded-xl border border-white/5">
                                <p className="text-xs text-gray-500 uppercase mb-1">Games Played</p>
                                <p className="text-white font-bold">{gameHistory.length}</p>
                            </div>
                        </div>
                    )}
                    {activeTab === 'transactions' && (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm text-gray-400">
                                <thead className="bg-black/20 text-xs uppercase font-bold text-white">
                                    <tr>
                                        <th className="p-3 rounded-l-lg">Date</th>
                                        <th className="p-3">Type</th>
                                        <th className="p-3">Description</th>
                                        <th className="p-3 text-right rounded-r-lg">Amount</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {transactions.length === 0 && <tr><td colSpan={4} className="p-4 text-center">No transactions</td></tr>}
                                    {transactions.map(tx => (
                                        <tr key={tx.id} className="border-b border-white/5 hover:bg-white/5">
                                            <td className="p-3 whitespace-nowrap">{new Date(tx.created_at).toLocaleDateString()}</td>
                                            <td className="p-3 capitalize text-white"><span className="bg-white/5 px-2 py-1 rounded">{tx.type.replace('_', ' ')}</span></td>
                                            <td className="p-3 text-xs max-w-[200px] truncate">{tx.description}</td>
                                            <td className={`p-3 text-right font-bold font-mono ${['deposit','earn','bonus','game_win','referral'].includes(tx.type) ? 'text-green-400' : 'text-red-400'}`}>
                                                {['deposit','earn','bonus','game_win','referral'].includes(tx.type) ? '+' : '-'}<BalanceDisplay amount={tx.amount} />
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                    {activeTab === 'games' && (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm text-gray-400">
                                <thead className="bg-black/20 text-xs uppercase font-bold text-white">
                                    <tr>
                                        <th className="p-3 rounded-l-lg">Game</th>
                                        <th className="p-3">Bet</th>
                                        <th className="p-3">Result</th>
                                        <th className="p-3 text-right rounded-r-lg">Profit/Loss</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {gameHistory.length === 0 && <tr><td colSpan={4} className="p-4 text-center">No games played</td></tr>}
                                    {gameHistory.map(game => (
                                        <tr key={game.id} className="border-b border-white/5 hover:bg-white/5">
                                            <td className="p-3 flex flex-col">
                                                <span className="text-white font-bold">{game.gameName}</span>
                                                <span className="text-[10px] text-gray-500">{new Date(game.timestamp).toLocaleString()}</span>
                                            </td>
                                            <td className="p-3"><BalanceDisplay amount={game.bet} /></td>
                                            <td className="p-3 text-xs">{game.details}</td>
                                            <td className={`p-3 text-right font-bold font-mono ${game.profit > 0 ? 'text-green-400' : 'text-red-400'}`}>
                                                {game.profit > 0 ? '+' : ''}<BalanceDisplay amount={game.profit} />
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>

            {/* ADJUSTMENT MODAL */}
            <AnimatePresence>
                {adjustModalOpen && (
                    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
                        <motion.div 
                            initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }}
                            className="bg-dark-900 w-full max-w-md rounded-2xl border border-white/10 p-6 shadow-2xl"
                        >
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="text-xl font-bold text-white">Adjust Balance</h3>
                                <button onClick={() => setAdjustModalOpen(false)} className="text-gray-500 hover:text-white"><X size={20}/></button>
                            </div>
                            
                            <div className="mb-4 p-3 bg-white/5 rounded-lg border border-white/5">
                                <p className="text-xs text-gray-400 uppercase mb-1">Target Wallet</p>
                                <p className="text-white font-bold capitalize">{selectedWalletType.replace('_balance', '').replace('_', ' ')}</p>
                            </div>

                            <form onSubmit={handleWalletAdjust} className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <button 
                                        type="button"
                                        onClick={() => setAdjustAction('credit')}
                                        className={`py-3 rounded-lg text-sm font-bold border transition ${adjustAction === 'credit' ? 'bg-green-500/20 text-green-400 border-green-500/50' : 'bg-white/5 text-gray-400 border-white/5'}`}
                                    >
                                        Credit (Add)
                                    </button>
                                    <button 
                                        type="button"
                                        onClick={() => setAdjustAction('debit')}
                                        className={`py-3 rounded-lg text-sm font-bold border transition ${adjustAction === 'debit' ? 'bg-red-500/20 text-red-400 border-red-500/50' : 'bg-white/5 text-gray-400 border-white/5'}`}
                                    >
                                        Debit (Remove)
                                    </button>
                                </div>

                                <div>
                                    <label className="text-xs text-gray-400 block mb-1">Amount ($)</label>
                                    <input required type="number" step="0.01" value={adjustAmount} onChange={e => setAdjustAmount(e.target.value)} className="w-full bg-black/40 border border-white/10 rounded-lg p-3 text-white focus:border-neon-green outline-none" />
                                </div>

                                <div>
                                    <label className="text-xs text-gray-400 block mb-1">Admin Note / Reason</label>
                                    <input required type="text" value={adjustNote} onChange={e => setAdjustNote(e.target.value)} className="w-full bg-black/40 border border-white/10 rounded-lg p-3 text-white focus:border-neon-green outline-none" placeholder="e.g. Bonus, Correction..." />
                                </div>

                                <button type="submit" className="w-full py-3 bg-white text-black font-bold rounded-xl hover:bg-gray-200 transition mt-2">
                                    Confirm Adjustment
                                </button>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default UserInfo;
