
import React, { useState, useEffect } from 'react';
import GlassCard from '../components/GlassCard';
import { ArrowLeft, User, Search, Send, ShieldCheck, DollarSign, Loader2, CheckCircle, Copy, AtSign, Hash } from 'lucide-react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '../integrations/supabase/client';
import { useUI } from '../context/UIContext';
import { useSystem } from '../context/SystemContext';
import BalanceDisplay from '../components/BalanceDisplay';
import { motion, AnimatePresence } from 'framer-motion';

interface Recipient {
    uid: number;
    name: string;
    avatar: string;
    email: string;
}

const SendMoney: React.FC = () => {
    const { toast, confirm, alert } = useUI();
    const { config } = useSystem();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    
    const [balance, setBalance] = useState(0);
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
            const { data: wallet } = await supabase.from('wallets').select('main_balance').eq('user_id', session.user.id).single();
            if (wallet) setBalance(wallet.main_balance);
            
            const { data: profile } = await supabase.from('profiles').select('user_uid').eq('id', session.user.id).single();
            if (profile) setMyUid(profile.user_uid);
        }
    };

    const lookupRecipient = async (input: string) => {
        if (!input || input.length < 4) return; // Min length check
        
        setSearching(true);
        setRecipient(null); // Clear previous result while searching

        try {
            let query = supabase.from('profiles').select('user_uid, name_1, avatar_1, email_1');
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
            await alert(`The minimum transfer amount is $${minTransfer}.`, "Validation Error"); 
            return; 
        }
        
        const fee = (val * feePercent) / 100;
        const total = val + fee;

        if (total > balance) { 
            await alert(
                `Insufficient Main Balance.\n\nAmount: $${val.toFixed(2)}\nFee: $${fee.toFixed(2)}\nTotal Required: $${total.toFixed(2)}\nAvailable: $${balance.toFixed(2)}`, 
                "Transaction Failed"
            ); 
            return; 
        }

        const confirmed = await confirm(
            `Send $${val.toFixed(2)} to ${recipient.name}? \n\nRecipient ID: ${recipient.uid}\nFee: $${fee.toFixed(2)}\nTotal Deducted: $${total.toFixed(2)}`,
            "Confirm Transfer"
        );

        if (!confirmed) return;

        setLoading(true);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) throw new Error("No session");

            const { data, error } = await supabase.rpc('p2p_transfer_funds', {
                p_sender_id: session.user.id,
                p_receiver_uid: recipient.uid,
                p_amount: val
            });

            if (error) throw error;
            if (data && !data.success) throw new Error(data.message);

            toast.success("Funds Sent Successfully!");
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
                <GlassCard className="bg-gradient-to-r from-blue-900/40 to-cyan-900/40 border-cyan-500/20 p-6 mb-6">
                    <p className="text-cyan-300 text-xs font-bold uppercase tracking-widest mb-1">Available (Main)</p>
                    <h2 className="text-4xl font-display font-black text-white">
                        <BalanceDisplay amount={balance} />
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
                                className={`w-full bg-black/40 border rounded-xl py-4 pl-12 pr-4 text-white font-mono text-lg focus:outline-none transition ${recipient ? 'border-green-500 shadow-[0_0_10px_rgba(34,197,94,0.2)]' : 'border-white/10 focus:border-cyan-500'}`}
                                placeholder="8-digit ID or Email"
                            />
                            {searching && (
                                <div className="absolute right-4 top-1/2 -translate-y-1/2">
                                    <Loader2 className="animate-spin text-cyan-500" size={18} />
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
                                        <p className="text-[10px] text-green-400 font-bold uppercase tracking-wide">Verified Receiver</p>
                                        <h3 className="text-white font-bold text-lg truncate">{recipient.name}</h3>
                                        <p className="text-xs text-gray-400 font-mono flex items-center gap-2">
                                            ID: {recipient.uid}
                                        </p>
                                    </div>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Amount Input */}
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-gray-400 uppercase ml-1">Amount</label>
                        <div className="relative">
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-2xl font-bold text-gray-500">$</span>
                            <input 
                                type="number" 
                                value={amount}
                                onChange={e => setAmount(e.target.value)}
                                className="w-full bg-black/40 border border-white/10 rounded-xl py-4 pl-10 pr-4 text-white font-bold text-3xl focus:border-cyan-500 outline-none placeholder-gray-700"
                                placeholder="0.00"
                            />
                        </div>
                    </div>

                    {/* Fee Calculation */}
                    <div className="bg-white/5 border border-white/5 rounded-xl p-4 space-y-2">
                        <div className="flex justify-between text-sm">
                            <span className="text-gray-400">Transfer Amount</span>
                            <span className="text-white font-bold">${parseFloat(amount || '0').toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                            <span className="text-gray-400">Fee ({feePercent}%)</span>
                            <span className="text-red-400 font-bold">+${calculatedFee.toFixed(2)}</span>
                        </div>
                        <div className="h-px bg-white/10 my-1"></div>
                        <div className="flex justify-between text-sm">
                            <span className="text-white font-bold uppercase">Total Deduction</span>
                            <span className="text-cyan-400 font-bold text-lg">${totalDeduction.toFixed(2)}</span>
                        </div>
                    </div>

                    <button 
                        type="submit" 
                        disabled={loading || !recipient || !amount} 
                        className="w-full py-4 bg-cyan-500 text-black font-black rounded-xl hover:bg-cyan-400 transition flex items-center justify-center gap-2 shadow-lg shadow-cyan-500/20 disabled:opacity-50 disabled:cursor-not-allowed text-lg uppercase tracking-wider"
                    >
                        {loading ? <Loader2 className="animate-spin" size={24} /> : <><Send size={20} /> SEND MONEY</>}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default SendMoney;
