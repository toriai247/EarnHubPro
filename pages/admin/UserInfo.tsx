
import React, { useEffect, useState } from 'react';
import GlassCard from '../../components/GlassCard';
import { 
    ArrowLeft, User, Mail, ShieldCheck, AlertTriangle, DollarSign, Save, CreditCard, 
    Gamepad2, Gift, Users, Activity, X, CheckCircle2, Lock, Unlock, RefreshCw, 
    Trophy, Clock, TrendingUp, ArrowDownLeft, ArrowUpRight, Ban, MessageSquare, 
    Send, StickyNote, ShieldAlert, History, Smartphone, Laptop, MapPin, Globe
} from 'lucide-react';
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
    const [biometrics, setBiometrics] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'overview' | 'wallet' | 'transactions' | 'games'>('overview');
    
    // Edit States
    const [isEditingProfile, setIsEditingProfile] = useState(false);
    const [editForm, setEditForm] = useState({ name: '', phone: '', bio: '', level: 1 });
    
    // Action Modals
    const [adjustModalOpen, setAdjustModalOpen] = useState(false);
    const [msgModalOpen, setMsgModalOpen] = useState(false);
    const [noteModalOpen, setNoteModalOpen] = useState(false);
    
    // Adjust State
    const [selectedWalletType, setSelectedWalletType] = useState('');
    const [adjustAmount, setAdjustAmount] = useState('');
    const [adjustAction, setAdjustAction] = useState<'credit' | 'debit'>('credit');
    const [adjustNote, setAdjustNote] = useState('');

    // Message/Note State
    const [messageText, setMessageText] = useState('');
    const [adminNoteText, setAdminNoteText] = useState('');

    useEffect(() => {
        fetchUserData();
    }, [userId]);

    const fetchUserData = async () => {
        setLoading(true);
        const [prof, wal, txs, games, bios] = await Promise.all([
            supabase.from('profiles').select('*').eq('id', userId).single(),
            supabase.from('wallets').select('*').eq('user_id', userId).single(),
            supabase.from('transactions').select('*').eq('user_id', userId).order('created_at', {ascending: false}).limit(50),
            supabase.from('game_history').select('*').eq('user_id', userId).order('created_at', {ascending: false}).limit(50),
            supabase.from('user_biometrics').select('*').eq('user_id', userId).order('created_at', {ascending: false})
        ]);

        if (prof.data) {
            setProfile(prof.data as UserProfile);
            setEditForm({
                name: prof.data.name_1 || '',
                phone: prof.data.phone_1 || '',
                bio: prof.data.bio_1 || '',
                level: prof.data.level_1
            });
            setAdminNoteText(prof.data.admin_notes || '');
        }
        if (wal.data) setWallet(wal.data as WalletData);
        if (txs.data) setTransactions(txs.data as Transaction[]);
        if (games.data) {
            setGameHistory(games.data.map((g: any) => ({
                id: g.id, gameId: g.game_id, gameName: g.game_name, bet: g.bet, payout: g.payout, profit: g.profit, details: g.details, timestamp: new Date(g.created_at).getTime()
            })));
        }
        if (bios.data) setBiometrics(bios.data);
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

    // --- ACTIONS ---

    const toggleSuspend = async () => {
        if (!profile) return;
        const newVal = !profile.is_suspended;
        const confirmed = await confirm(
            `Are you sure you want to ${newVal ? 'SUSPEND' : 'UNBAN'} this user? \n\nSuspended users cannot log in.`, 
            newVal ? 'Confirm Ban' : 'Lift Ban'
        );
        if (!confirmed) return;

        await supabase.from('profiles').update({ is_suspended: newVal }).eq('id', profile.id);
        fetchUserData();
        toast.success(newVal ? "User Suspended" : "User Access Restored");
    };

    const toggleBlock = async () => {
        if (!profile) return;
        const newVal = !profile.is_withdraw_blocked;
        const confirmed = await confirm(`Are you sure you want to ${newVal ? 'BLOCK' : 'UNBLOCK'} withdrawals?`);
        if (!confirmed) return;

        await supabase.from('profiles').update({ is_withdraw_blocked: newVal }).eq('id', profile.id);
        fetchUserData();
        toast.success(newVal ? "Withdrawals Blocked" : "Withdrawals Unblocked");
    };

    const toggleKYC = async () => {
        if (!profile) return;
        const newVal = !profile.is_kyc_1;
        await supabase.from('profiles').update({ is_kyc_1: newVal }).eq('id', profile.id);
        fetchUserData();
        toast.success(newVal ? "KYC Verified" : "KYC Revoked");
    };

    const handleSendMessage = async () => {
        if (!messageText.trim()) return;
        const { error } = await supabase.from('notifications').insert({
            user_id: userId,
            title: 'Admin Message',
            message: messageText,
            type: 'info'
        });
        if (error) toast.error("Failed to send");
        else {
            toast.success("Message sent to user inbox");
            setMsgModalOpen(false);
            setMessageText('');
        }
    };

    const handleSaveNote = async () => {
        const { error } = await supabase.from('profiles').update({
            admin_notes: adminNoteText
        }).eq('id', userId);
        
        if (error) toast.error("Failed to save note");
        else {
            toast.success("Admin note updated");
            setNoteModalOpen(false);
            fetchUserData();
        }
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
            // @ts-ignore
            const currentBal = wallet[selectedWalletType] || 0;
            const newBal = adjustAction === 'credit' ? currentBal + amount : Math.max(0, currentBal - amount);
            
            const updates: any = { [selectedWalletType]: newBal };
            // Legacy Sync
            if (selectedWalletType === 'main_balance') {
                updates.balance = newBal;
                updates.withdrawable = Math.max(0, newBal - (wallet.pending_withdraw || 0));
            }

            const { error } = await supabase.from('wallets').update(updates).eq('user_id', userId);
            if (error) throw error;

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

    if (loading || !profile || !wallet) return <div className="p-10 text-center text-gray-500">Loading user profile...</div>;

    const walletItems = [
        { key: 'main_balance', label: 'Main (Withdrawable)', icon: CreditCard, color: 'text-white' },
        { key: 'deposit_balance', label: 'Deposit', icon: DollarSign, color: 'text-blue-400' },
        { key: 'game_balance', label: 'Game', icon: Gamepad2, color: 'text-purple-400' },
        { key: 'bonus_balance', label: 'Bonus', icon: Gift, color: 'text-pink-400' },
        { key: 'earning_balance', label: 'Earnings', icon: Activity, color: 'text-yellow-400' },
        { key: 'referral_balance', label: 'Referral', icon: Users, color: 'text-green-400' },
    ];

    // Calculated Stats
    const lastActive = transactions.length > 0 ? new Date(transactions[0].created_at).toLocaleString() : 'Never';
    const totalWagered = gameHistory.reduce((acc, curr) => acc + (curr.bet || 0), 0);
    const gameCounts: Record<string, number> = {};
    gameHistory.forEach(g => { gameCounts[g.gameName] = (gameCounts[g.gameName] || 0) + 1; });
    const favoriteGame = Object.keys(gameCounts).length > 0 
        ? Object.keys(gameCounts).reduce((a, b) => gameCounts[a] > gameCounts[b] ? a : b) 
        : 'None';

    return (
        <div className="space-y-6 animate-fade-in pb-20">
            {/* Header */}
            <div className="flex items-center gap-4">
                <button onClick={onBack} className="p-2 bg-white/10 rounded-lg hover:bg-white/20 text-white"><ArrowLeft size={20}/></button>
                <div className="flex items-center gap-3">
                    <h2 className="text-2xl font-bold text-white">{profile.name_1}</h2>
                    {profile.is_suspended && <span className="bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded flex items-center gap-1"><Ban size={12}/> BANNED</span>}
                </div>
                <div className="ml-auto flex gap-2">
                    <button onClick={() => fetchUserData()} className="p-2 bg-white/5 rounded hover:bg-white/10 text-gray-400"><RefreshCw size={18}/></button>
                </div>
            </div>

            {/* MAIN DASHBOARD */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* 1. LEFT: Profile Card */}
                <div className="lg:col-span-2 space-y-6">
                    <GlassCard className="flex flex-col md:flex-row items-start gap-6 border border-white/10 relative overflow-hidden">
                        {/* Status Stripe */}
                        <div className={`absolute top-0 left-0 bottom-0 w-1 ${profile.is_suspended ? 'bg-red-500' : profile.is_withdraw_blocked ? 'bg-orange-500' : 'bg-green-500'}`}></div>
                        
                        <div className="w-24 h-24 rounded-xl bg-black/30 border-2 border-white/10 overflow-hidden flex-shrink-0 relative">
                            <img src={profile.avatar_1 || `https://api.dicebear.com/7.x/avataaars/svg?seed=${profile.name_1}`} className="w-full h-full object-cover" alt="" />
                            {profile.admin_user && <div className="absolute bottom-0 left-0 right-0 bg-purple-600 text-white text-[9px] text-center font-bold">ADMIN</div>}
                        </div>
                        
                        <div className="flex-1 w-full">
                            <div className="flex justify-between items-start mb-2">
                                <div>
                                    <div className="flex items-center gap-2">
                                        <h3 className="text-xl font-bold text-white">{profile.name_1}</h3>
                                        <div className="flex gap-1">
                                            {profile.is_kyc_1 && <CheckCircle2 size={16} className="text-neon-green" />}
                                            {profile.is_withdraw_blocked && <Lock size={16} className="text-orange-500" />}
                                        </div>
                                    </div>
                                    <p className="text-sm text-gray-400">{profile.email_1}</p>
                                    <p className="text-xs font-mono text-gray-600 mt-1 select-all bg-black/20 inline-block px-1 rounded">{profile.id}</p>
                                </div>
                                <button onClick={() => setIsEditingProfile(!isEditingProfile)} className="text-xs bg-white/10 px-3 py-1 rounded hover:bg-white/20 text-white">
                                    {isEditingProfile ? 'Cancel' : 'Edit'}
                                </button>
                            </div>

                            {isEditingProfile ? (
                                <div className="mt-4 grid grid-cols-2 gap-3 bg-white/5 p-3 rounded-xl border border-white/5">
                                    <input value={editForm.name} onChange={e => setEditForm({...editForm, name: e.target.value})} className="bg-black/40 rounded p-2 text-white text-xs border border-white/10" placeholder="Name" />
                                    <input value={editForm.phone} onChange={e => setEditForm({...editForm, phone: e.target.value})} className="bg-black/40 rounded p-2 text-white text-xs border border-white/10" placeholder="Phone" />
                                    <input type="number" value={editForm.level} onChange={e => setEditForm({...editForm, level: parseInt(e.target.value)})} className="bg-black/40 rounded p-2 text-white text-xs border border-white/10" placeholder="Level" />
                                    <button onClick={handleSaveProfile} className="bg-neon-green text-black font-bold py-2 rounded hover:bg-emerald-400 text-xs">Save</button>
                                </div>
                            ) : (
                                <div className="flex flex-wrap gap-3 mt-3">
                                    <div className="bg-black/20 px-3 py-1 rounded border border-white/5">
                                        <span className="text-gray-500 text-[10px] block uppercase">Balance</span>
                                        <span className="text-white font-bold text-sm"><BalanceDisplay amount={wallet.balance} /></span>
                                    </div>
                                    <div className="bg-black/20 px-3 py-1 rounded border border-white/5">
                                        <span className="text-gray-500 text-[10px] block uppercase">Ref Code</span>
                                        <span className="text-white font-bold text-sm">{profile.ref_code_1}</span>
                                    </div>
                                    <div className="bg-black/20 px-3 py-1 rounded border border-white/5">
                                        <span className="text-gray-500 text-[10px] block uppercase">Joined</span>
                                        <span className="text-white font-bold text-sm">{new Date(profile.created_at).toLocaleDateString()}</span>
                                    </div>
                                </div>
                            )}
                        </div>
                    </GlassCard>

                    {/* TABS */}
                    <div className="bg-white/5 rounded-2xl border border-white/5 overflow-hidden">
                        <div className="flex border-b border-white/5 overflow-x-auto no-scrollbar">
                            {[
                                {id: 'overview', label: 'Overview'},
                                {id: 'wallet', label: 'Wallets'},
                                {id: 'transactions', label: 'History'},
                                {id: 'games', label: 'Games'},
                            ].map(tab => (
                                <button 
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id as any)}
                                    className={`px-6 py-3 text-sm font-bold capitalize whitespace-nowrap ${activeTab === tab.id ? 'text-white bg-white/5 border-b-2 border-neon-green' : 'text-gray-500 hover:text-gray-300'}`}
                                >
                                    {tab.label}
                                </button>
                            ))}
                        </div>
                        
                        <div className="p-4">
                            {/* OVERVIEW TAB */}
                            {activeTab === 'overview' && (
                                <div className="space-y-4">
                                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                                        <div className="bg-black/20 p-3 rounded-xl border border-white/5">
                                            <p className="text-[10px] text-gray-500 uppercase mb-1">Total Deposit</p>
                                            <p className="text-white font-bold"><BalanceDisplay amount={wallet.deposit} /></p>
                                        </div>
                                        <div className="bg-black/20 p-3 rounded-xl border border-white/5">
                                            <p className="text-[10px] text-gray-500 uppercase mb-1">Total Withdraw</p>
                                            <p className="text-white font-bold"><BalanceDisplay amount={Math.abs(transactions.filter(t => t.type === 'withdraw' && t.status === 'success').reduce((sum, t) => sum + t.amount, 0))} /></p>
                                        </div>
                                        <div className="bg-black/20 p-3 rounded-xl border border-white/5">
                                            <p className="text-[10px] text-gray-500 uppercase mb-1">Total Earned</p>
                                            <p className="text-neon-green font-bold"><BalanceDisplay amount={wallet.total_earning} /></p>
                                        </div>
                                        <div className="bg-black/20 p-3 rounded-xl border border-white/5">
                                            <p className="text-[10px] text-gray-500 uppercase mb-1">Pending Out</p>
                                            <p className="text-yellow-400 font-bold"><BalanceDisplay amount={wallet.pending_withdraw} /></p>
                                        </div>
                                    </div>

                                    {/* Detailed Activity Summary */}
                                    <div className="bg-black/20 border border-white/5 p-4 rounded-xl grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <h4 className="text-xs font-bold text-gray-400 uppercase mb-2 flex items-center gap-1"><Activity size={12}/> Activity Metrics</h4>
                                            <div className="space-y-2">
                                                <div className="flex justify-between text-sm">
                                                    <span className="text-gray-500">Last Active</span>
                                                    <span className="text-white">{lastActive}</span>
                                                </div>
                                                <div className="flex justify-between text-sm">
                                                    <span className="text-gray-500">Total Wagered</span>
                                                    <span className="text-white font-mono"><BalanceDisplay amount={totalWagered} /></span>
                                                </div>
                                                <div className="flex justify-between text-sm">
                                                    <span className="text-gray-500">Favorite Game</span>
                                                    <span className="text-white font-bold">{favoriteGame}</span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex flex-col justify-between">
                                            <div className="bg-white/5 p-2 rounded text-center border border-white/5 h-full flex flex-col justify-center">
                                                <p className="text-xs text-gray-500 mb-1">Net Game PnL</p>
                                                <p className={`font-bold font-mono text-lg ${wallet.total_earning > 0 ? 'text-green-400' : 'text-gray-400'}`}>
                                                    <BalanceDisplay amount={wallet.total_earning} />
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                    
                                    {/* Admin Note Preview */}
                                    <div 
                                        className="bg-yellow-500/5 border border-yellow-500/20 p-4 rounded-xl cursor-pointer hover:bg-yellow-500/10 transition"
                                        onClick={() => setNoteModalOpen(true)}
                                    >
                                        <div className="flex justify-between items-center mb-1">
                                            <h4 className="text-xs font-bold text-yellow-500 uppercase flex items-center gap-2"><StickyNote size={12}/> Admin Notes</h4>
                                            <span className="text-[10px] text-gray-500">Click to edit</span>
                                        </div>
                                        <p className="text-sm text-gray-300 italic">
                                            {profile.admin_notes || "No notes added yet..."}
                                        </p>
                                    </div>
                                </div>
                            )}

                            {/* WALLET TAB */}
                            {activeTab === 'wallet' && (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    {walletItems.map((item) => {
                                        // @ts-ignore
                                        const balance = wallet[item.key] || 0;
                                        return (
                                            <div key={item.key} className="p-3 bg-black/20 border border-white/5 rounded-xl flex justify-between items-center group hover:border-white/20 transition">
                                                <div className="flex items-center gap-3">
                                                    <div className={`p-2 rounded-lg bg-white/5 ${item.color}`}><item.icon size={18}/></div>
                                                    <div>
                                                        <p className="text-[10px] text-gray-400 uppercase font-bold">{item.label}</p>
                                                        <p className={`text-lg font-bold ${item.color} font-mono`}><BalanceDisplay amount={balance} /></p>
                                                    </div>
                                                </div>
                                                <button onClick={() => openAdjustModal(item.key)} className="px-3 py-1.5 bg-white/5 hover:bg-white/10 rounded text-[10px] font-bold text-gray-300 border border-white/5">
                                                    Edit
                                                </button>
                                            </div>
                                        )
                                    })}
                                </div>
                            )}

                            {/* TRANSACTIONS TAB */}
                            {activeTab === 'transactions' && (
                                <div className="overflow-x-auto max-h-[400px] custom-scrollbar">
                                    <table className="w-full text-left text-xs text-gray-400">
                                        <thead className="bg-black/20 uppercase font-bold text-white sticky top-0">
                                            <tr>
                                                <th className="p-3">Date</th>
                                                <th className="p-3">Type</th>
                                                <th className="p-3 text-right">Amount</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {transactions.map(tx => (
                                                <tr key={tx.id} className="border-b border-white/5 hover:bg-white/5">
                                                    <td className="p-3">{new Date(tx.created_at).toLocaleDateString()}</td>
                                                    <td className="p-3 capitalize">{tx.type}</td>
                                                    <td className={`p-3 text-right font-bold ${['deposit','earn'].includes(tx.type) ? 'text-green-400' : 'text-red-400'}`}>
                                                        {['deposit','earn'].includes(tx.type) ? '+' : '-'}<BalanceDisplay amount={tx.amount} />
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}

                            {/* GAMES TAB */}
                            {activeTab === 'games' && (
                                <div className="overflow-x-auto max-h-[400px] custom-scrollbar">
                                    <table className="w-full text-left text-xs text-gray-400">
                                        <thead className="bg-black/20 uppercase font-bold text-white sticky top-0">
                                            <tr>
                                                <th className="p-3">Game</th>
                                                <th className="p-3">Bet</th>
                                                <th className="p-3 text-right">Profit</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {gameHistory.map(g => (
                                                <tr key={g.id} className="border-b border-white/5 hover:bg-white/5">
                                                    <td className="p-3">{g.gameName}</td>
                                                    <td className="p-3"><BalanceDisplay amount={g.bet}/></td>
                                                    <td className={`p-3 text-right font-bold ${g.profit > 0 ? 'text-green-400' : 'text-red-400'}`}>
                                                        {g.profit > 0 ? '+' : ''}<BalanceDisplay amount={g.profit} />
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* 2. RIGHT: Control Panel */}
                <div className="space-y-4">
                    <GlassCard className="p-4 bg-dark-900/50 border-white/10">
                        <h4 className="font-bold text-white mb-4 text-sm flex items-center gap-2 uppercase tracking-wide">
                            <ShieldAlert size={16} className="text-red-500" /> Administrative Actions
                        </h4>
                        
                        <div className="grid grid-cols-1 gap-3">
                            <button 
                                onClick={toggleSuspend} 
                                className={`w-full py-3 rounded-xl text-xs font-bold border flex items-center justify-center gap-2 transition hover:scale-[1.02] ${
                                    profile.is_suspended 
                                    ? 'bg-green-600 text-white border-green-500 shadow-lg shadow-green-900/50' 
                                    : 'bg-red-600 text-white border-red-500 shadow-lg shadow-red-900/50'
                                }`}
                            >
                                {profile.is_suspended ? <CheckCircle2 size={16}/> : <Ban size={16}/>}
                                {profile.is_suspended ? 'RESTORE ACCESS' : 'SUSPEND ACCOUNT'}
                            </button>

                            <div className="grid grid-cols-2 gap-3">
                                <button onClick={toggleBlock} className={`py-3 rounded-xl text-xs font-bold border flex flex-col items-center justify-center gap-1 ${profile.is_withdraw_blocked ? 'bg-orange-500/20 text-orange-400 border-orange-500/50' : 'bg-white/5 text-gray-300 border-white/10 hover:bg-white/10'}`}>
                                    {profile.is_withdraw_blocked ? <Lock size={16}/> : <Unlock size={16}/>}
                                    {profile.is_withdraw_blocked ? 'Unblock WD' : 'Block WD'}
                                </button>
                                <button onClick={toggleKYC} className={`py-3 rounded-xl text-xs font-bold border flex flex-col items-center justify-center gap-1 ${profile.is_kyc_1 ? 'bg-green-500/20 text-green-400 border-green-500/50' : 'bg-white/5 text-gray-300 border-white/10 hover:bg-white/10'}`}>
                                    <ShieldCheck size={16}/>
                                    {profile.is_kyc_1 ? 'Verified' : 'Verify KYC'}
                                </button>
                            </div>

                            <button onClick={() => setMsgModalOpen(true)} className="w-full py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-500 transition text-xs flex items-center justify-center gap-2 shadow-lg shadow-blue-900/20">
                                <MessageSquare size={16} /> Send Message
                            </button>
                        </div>
                    </GlassCard>

                    <div className="bg-white/5 rounded-xl p-4 border border-white/5">
                        <h4 className="font-bold text-gray-400 mb-3 text-xs uppercase">Risk Analysis</h4>
                        <div className="space-y-3">
                            <div className="flex justify-between text-sm">
                                <span className="text-gray-500">Risk Score</span>
                                <span className={`font-bold ${profile.risk_score && profile.risk_score > 50 ? 'text-red-500' : 'text-green-500'}`}>{profile.risk_score || 0}/100</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-gray-500">Win Rate</span>
                                <span className="text-white font-mono">
                                    {gameHistory.length > 0 ? ((gameHistory.filter(g => g.profit > 0).length / gameHistory.length) * 100).toFixed(1) : 0}%
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Device & Location Info */}
                    <div className="bg-white/5 rounded-xl p-4 border border-white/5">
                        <h4 className="font-bold text-gray-400 mb-3 text-xs uppercase flex items-center gap-2">
                            <Globe size={14} /> Device & Location
                        </h4>
                        <div className="space-y-3">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-blue-500/10 rounded-lg text-blue-400">
                                    <MapPin size={16} />
                                </div>
                                <div>
                                    <p className="text-[10px] text-gray-500 uppercase">IP Address</p>
                                    <p className="text-xs font-bold text-white">103.x.x.x (Simulated)</p>
                                </div>
                            </div>
                            
                            {biometrics.length > 0 ? (
                                biometrics.map((bio, idx) => (
                                    <div key={idx} className="flex items-center gap-3 border-t border-white/5 pt-2">
                                        <div className="p-2 bg-purple-500/10 rounded-lg text-purple-400">
                                            {bio.device_name?.toLowerCase().includes('phone') ? <Smartphone size={16} /> : <Laptop size={16} />}
                                        </div>
                                        <div>
                                            <p className="text-[10px] text-gray-500 uppercase">{bio.device_name || 'Unknown Device'}</p>
                                            <p className="text-[10px] text-white">Passkey Registered</p>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="text-xs text-gray-500 italic border-t border-white/5 pt-2">
                                    No biometric devices registered.
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* MODALS */}
            <AnimatePresence>
                {/* 1. Wallet Adjust Modal */}
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

                {/* 2. Message Modal */}
                {msgModalOpen && (
                    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
                        <motion.div 
                            initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }}
                            className="bg-dark-900 w-full max-w-md rounded-2xl border border-white/10 p-6 shadow-2xl"
                        >
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="text-xl font-bold text-white">Send Notification</h3>
                                <button onClick={() => setMsgModalOpen(false)} className="text-gray-500 hover:text-white"><X size={20}/></button>
                            </div>
                            <textarea 
                                value={messageText}
                                onChange={e => setMessageText(e.target.value)}
                                className="w-full bg-black/40 border border-white/10 rounded-xl p-4 text-white text-sm focus:border-blue-500 outline-none h-32 resize-none mb-4"
                                placeholder="Message to user..."
                            />
                            <button onClick={handleSendMessage} className="w-full py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-500 transition flex items-center justify-center gap-2">
                                <Send size={16} /> Send
                            </button>
                        </motion.div>
                    </div>
                )}

                {/* 3. Notes Modal */}
                {noteModalOpen && (
                    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
                        <motion.div 
                            initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }}
                            className="bg-dark-900 w-full max-w-md rounded-2xl border border-white/10 p-6 shadow-2xl"
                        >
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="text-xl font-bold text-white flex items-center gap-2"><StickyNote size={18} className="text-yellow-500"/> Internal Notes</h3>
                                <button onClick={() => setNoteModalOpen(false)} className="text-gray-500 hover:text-white"><X size={20}/></button>
                            </div>
                            <p className="text-xs text-gray-500 mb-2">Only visible to administrators.</p>
                            <textarea 
                                value={adminNoteText}
                                onChange={e => setAdminNoteText(e.target.value)}
                                className="w-full bg-black/40 border border-white/10 rounded-xl p-4 text-white text-sm focus:border-yellow-500 outline-none h-40 resize-none mb-4"
                                placeholder="Record observations, warnings, or user history..."
                            />
                            <button onClick={handleSaveNote} className="w-full py-3 bg-yellow-500 text-black font-bold rounded-xl hover:bg-yellow-400 transition flex items-center justify-center gap-2">
                                <Save size={16} /> Save Note
                            </button>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default UserInfo;
