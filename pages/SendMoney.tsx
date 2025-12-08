
import React, { useState, useEffect } from 'react';
import GlassCard from '../components/GlassCard';
import { ArrowLeft, Send, Loader2, CheckCircle, Copy, AtSign, Hash, Wallet, ArrowRightLeft } from 'lucide-react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '../integrations/supabase/client';
import { useUI } from '../context/UIContext';
import { useSystem } from '../context/SystemContext';
import BalanceDisplay from '../components/BalanceDisplay';
import { motion, AnimatePresence } from 'framer-motion';
import { updateWallet, createTransaction } from '../lib/actions';

interface Recipient {
    id: string; // UUID
    uid: number; // Public ID
    name: string;
    avatar: string;
    email: string;
}

const SendMoney: React.FC = () => {
    const { toast, confirm, alert } = useUI();
    const { config } = useSystem();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    
    const [depositBalance, setDepositBalance] = useState(0);
    const [searchInput, setSearchInput] = useState(searchParams.get('to') || '');
    const [recipient, setRecipient] = useState<Recipient | null>(null);
    const [amount, setAmount] = useState('');
    const [loading, setLoading] = useState(false);
    const [searching, setSearching] = useState(false);
    const [myUid, setMyUid] = useState<number | null>(null);

    const feePercent = config?.p2p_transfer_fee_percent || 2.0;
    const minTransfer = config?.p2p_min_transfer || 10.0;

    useEffect(() => {
        fetchInitialData();
        if (searchParams.get('to')) {
            lookupRecipient(searchParams.get('to')!);
        }
    }, []);

    // Debounce search input
    useEffect(() => {
        const delayDebounceFn = setTimeout(() => {
            if (searchInput && !recipient) {
                lookupRecipient(searchInput);
            } else if (!searchInput) {
                setRecipient(null);
            }
        }, 800);

        return () => clearTimeout(delayDebounceFn);
    }, [searchInput]);

    const fetchInitialData = async () => {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
            // Fetch Deposit Balance specifically
            const { data: wallet } = await supabase.from('wallets').select('deposit_balance').eq('user_id', session.user.id).single();
            if (wallet) setDepositBalance(wallet.deposit_balance);
            
            const { data: profile } = await supabase.from('profiles').select('user_uid').eq('id', session.user.id).single();
            if (profile) setMyUid(profile.user_uid);
        }
    };

    const lookupRecipient = async (input: string) => {
        if (!input || input.length < 4) return; // Min length check
        
        setSearching(true);
        setRecipient(null); // Clear previous result while searching

        try {
            let query = supabase.from('profiles').select('id, user_uid, name_1, avatar_1, email_1');
            let isId = false;

            if (input.includes('@')) {
                // Email Search
                query = query.eq('email_1', input);
            } else if (/^\d+$/.test(input) && input.length === 8) {
                // ID Search (Must be 8 digits)
                query = query.eq('user_uid', parseInt(input));
                isId = true;
            } else {
                setSearching(false);
                return;
            }

            const { data, error } = await query.maybeSingle();

            if (data) {
                if (data.user_uid === myUid) {
                    toast.error("You cannot send money to yourself.");
                } else {
                    setRecipient({
                        id: data.id,
                        uid: data.user_uid,
                        name: data.name_1 || 'Unknown User',
                        avatar: data.avatar_1 || `https://api.dicebear.com/7.x/avataaars/svg?seed=${data.name_1}`,
                        email: data.email_1
                    });
                }
            } else if (input.length >= 8 || input.includes('@')) {
                // Only show not found if input looks complete
                toast.error("User not found");
            }
        } catch (e) {
            console.error(e);
        } finally {
            setSearching(false);
        }
    };

    const handleSend = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!recipient) { toast.error("Please select a valid recipient"); return; }
        
        const val = parseFloat(amount);
        if (isNaN(val) || val <= 0) { toast.error("Invalid amount"); return; }
        if (val < minTransfer) { 
            await alert(`The minimum transfer amount is ৳${minTransfer}.`, "Validation Error"); 
            return; 
        }
        
        const fee = (val * feePercent) / 100;
        const totalDeduction = val + fee;

        if (totalDeduction > depositBalance) { 
            await alert(
                `Insufficient Deposit Balance.\n\nAmount: ৳${val.toFixed(2)}\nFee: ৳${fee.toFixed(2)}\nTotal Required: ৳${totalDeduction.toFixed(2)}\nAvailable: ৳${depositBalance.toFixed(2)}`, 
                "Insufficient Funds"
            ); 
            return; 
        }

        const confirmed = await confirm(
            `Send ৳${val.toFixed(2)} to ${recipient.name}? \n\nFrom: Deposit Balance\nTo: User Main Balance\nFee: ৳${fee.toFixed(2)}`,
            "Confirm Transfer"
        );

        if (!confirmed) return;

        setLoading(true);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) throw new Error("No session");

            // 1. Deduct from Sender (Deposit Balance)
            await updateWallet(session.user.id, totalDeduction, 'decrement', 'deposit_balance');
            
            // Log Transfer (The amount sent)
            await createTransaction(
                session.user.id, 
                'transfer', 
                val, 
                `Sent ৳${val} to ${recipient.name} (ID: ${recipient.uid})`
            );

            // Log Fee (The amount taken as profit)
            if (fee > 0) {
                await createTransaction(
                    session.user.id, 
                    'fee', 
                    fee, 
                    `Transfer Fee (${feePercent}%)`
                );
            }

            // 2. Add to Receiver (Main Balance)
            await updateWallet(recipient.id, val, 'increment', 'main_balance');
            await createTransaction(
                recipient.id, 
                'transfer', 
                val, 
                `Received ৳${val} from ${myUid}`
            );

            // 3. Send Notification
            await supabase.from('notifications').insert({
                user_id: recipient.id,
                title: 'Money Received',
                message: `You received ৳${val.toFixed(2)} from ID: ${myUid}. Added to Main Balance.`,
                type: 'success'
            });

            toast.success("Money Sent Successfully!");
            setAmount('');
            setRecipient(null);
            setSearchInput('');
            fetchInitialData(); // Refresh balance
            
        } catch (e: any) {
            await alert(e.message || "Transfer failed", "System Error");
        } finally {
            setLoading(false);
        }
    };

    const calculatedFee = (parseFloat(amount) || 0) * (feePercent / 100);
    const totalDeduction = (parseFloat(amount) || 0) + calculatedFee;

    return (
        <div className="pb-24 sm:pl-20 sm:pt-6 space-y-6 px-4 sm:px-0">
            <header className="flex items-center gap-3 pt-4">
                <Link to="/wallet" className="p-2 bg-white/10 rounded-xl hover:bg-white/20 transition text-white">
                    <ArrowLeft size={20} />
                </Link>
                <h1 className="text-2xl font-display font-bold text-white">Send Money</h1>
            </header>

            <div className="max-w-md mx-auto">
                <GlassCard className="bg-gradient-to-r from-blue-900/40 to-blue-600/20 border-blue-500/20 p-6 mb-6">
                    <div className="flex justify-between items-start mb-2">
                        <p className="text-blue-300 text-xs font-bold uppercase tracking-widest">Source: Deposit Balance</p>
                        <Wallet size={18} className="text-blue-400" />
                    </div>
                    <h2 className="text-4xl font-display font-black text-white">
                        <BalanceDisplay amount={depositBalance} isNative={true} />
                    </h2>
                    {myUid && (
                        <div 
                            className="mt-4 flex items-center justify-between bg-black/30 px-4 py-2 rounded-xl border border-white/10"
                        >
                            <div className="flex items-center gap-2">
                                <span className="text-[10px] text-gray-400 font-bold uppercase">My ID:</span>
                                <span className="text-sm font-mono font-bold text-white select-all">{myUid}</span>
                            </div>
                            <button onClick={() => { navigator.clipboard.writeText(myUid.toString()); toast.success('ID Copied'); }} className="text-gray-400 hover:text-white">
                                <Copy size={14} />
                            </button>
                        </div>
                    )}
                </GlassCard>

                <form onSubmit={handleSend} className="space-y-6">
                    {/* Recipient Input */}
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-gray-400 uppercase ml-1">Recipient (ID or Email)</label>
                        <div className="relative">
                            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">
                                {searchInput.includes('@') ? <AtSign size={18} /> : <Hash size={18} />}
                            </div>
                            <input 
                                type="text" 
                                value={searchInput}
                                onChange={e => {
                                    setSearchInput(e.target.value);
                                    if(e.target.value === '') setRecipient(null);
                                }}
                                className={`w-full bg-black/40 border rounded-xl py-4 pl-12 pr-4 text-white font-mono text-lg focus:outline-none transition ${recipient ? 'border-green-500 shadow-[0_0_10px_rgba(34,197,94,0.2)]' : 'border-white/10 focus:border-blue-500'}`}
                                placeholder="8-digit ID or Email"
                            />
                            {searching && (
                                <div className="absolute right-4 top-1/2 -translate-y-1/2">
                                    <Loader2 className="animate-spin text-blue-500" size={18} />
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Found User Card */}
                    <AnimatePresence>
                        {recipient && (
                            <motion.div 
                                initial={{ opacity: 0, height: 0, y: -10 }} 
                                animate={{ opacity: 1, height: 'auto', y: 0 }}
                                exit={{ opacity: 0, height: 0, y: -10 }}
                                className="overflow-hidden"
                            >
                                <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-4 flex items-center gap-4 relative">
                                    <div className="relative">
                                        <img src={recipient.avatar} alt={recipient.name} className="w-12 h-12 rounded-full border-2 border-green-500" />
                                        <div className="absolute -bottom-1 -right-1 bg-green-500 text-black p-0.5 rounded-full"><CheckCircle size={10} strokeWidth={4} /></div>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-[10px] text-green-400 font-bold uppercase tracking-wide">Receiver Found</p>
                                        <h3 className="text-white font-bold text-lg truncate">{recipient.name}</h3>
                                        <p className="text-xs text-gray-400 font-mono flex items-center gap-2">
                                            ID: {recipient.uid}
                                        </p>
                                    </div>
                                    <div className="text-right">
                                        <div className="bg-black/40 px-2 py-1 rounded text-[10px] text-gray-400 font-bold border border-white/5">
                                            MAIN WALLET
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Amount Input */}
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-gray-400 uppercase ml-1">Amount (BDT)</label>
                        <div className="relative">
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-2xl font-bold text-gray-500">৳</span>
                            <input 
                                type="number" 
                                value={amount}
                                onChange={e => setAmount(e.target.value)}
                                className="w-full bg-black/40 border border-white/10 rounded-xl py-4 pl-10 pr-4 text-white font-bold text-3xl focus:border-blue-500 outline-none placeholder-gray-700 font-mono"
                                placeholder="0.00"
                            />
                        </div>
                    </div>

                    {/* Fee Calculation */}
                    <div className="bg-white/5 border border-white/5 rounded-xl p-4 space-y-2">
                        <div className="flex justify-between text-sm">
                            <span className="text-gray-400">Transfer Amount</span>
                            <span className="text-white font-bold">৳{parseFloat(amount || '0').toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                            <span className="text-gray-400">Fee ({feePercent}%)</span>
                            <span className="text-red-400 font-bold">+৳{calculatedFee.toFixed(2)}</span>
                        </div>
                        <div className="h-px bg-white/10 my-1"></div>
                        <div className="flex justify-between text-sm">
                            <span className="text-white font-bold uppercase">Total Deduction</span>
                            <span className="text-blue-400 font-bold text-lg">৳{totalDeduction.toFixed(2)}</span>
                        </div>
                    </div>

                    <button 
                        type="submit" 
                        disabled={loading || !recipient || !amount} 
                        className="w-full py-4 bg-white text-black font-black rounded-xl hover:bg-gray-200 transition flex items-center justify-center gap-2 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed text-lg uppercase tracking-wider"
                    >
                        {loading ? <Loader2 className="animate-spin" size={24} /> : <><Send size={20} /> SEND NOW</>}
                    </button>
                    
                    <div className="text-center text-xs text-gray-500">
                        Funds are transferred from your Deposit Balance to the receiver's Main Balance instantly.
                    </div>
                </form>
            </div>
        </div>
    );
};

export default SendMoney;
