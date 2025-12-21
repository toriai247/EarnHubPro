
import React, { useEffect, useState } from 'react';
import GlassCard from '../components/GlassCard';
import { supabase } from '../integrations/supabase/client';
import { Lottery, LotteryTicket, WalletData } from '../types';
import { buyLotteryTicket } from '../lib/actions';
import { Ticket, Trophy, Clock, Loader2, Sparkles, ShoppingCart, Smartphone, SmartphoneNfc, CheckCircle2, AlertTriangle } from 'lucide-react';
import { useUI } from '../context/UIContext';
import BalanceDisplay from '../components/BalanceDisplay';
import Loader from '../components/Loader';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';

const LotteryPage: React.FC = () => {
    const { toast, confirm } = useUI();
    const [lotteries, setLotteries] = useState<Lottery[]>([]);
    const [myTickets, setMyTickets] = useState<LotteryTicket[]>([]);
    const [wallet, setWallet] = useState<WalletData | null>(null);
    const [loading, setLoading] = useState(true);
    const [buyingId, setBuyingId] = useState<string | null>(null);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (session) {
                const [lRes, tRes, wRes] = await Promise.all([
                    supabase.from('lotteries').select('*').neq('status', 'drawn').order('created_at', { ascending: false }),
                    supabase.from('lottery_tickets').select('*').eq('user_id', session.user.id),
                    supabase.from('wallets').select('*').eq('user_id', session.user.id).single()
                ]);

                if (lRes.data) setLotteries(lRes.data as Lottery[]);
                if (tRes.data) setMyTickets(tRes.data as LotteryTicket[]);
                if (wRes.data) setWallet(wRes.data as WalletData);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const handleBuy = async (lottery: Lottery) => {
        if (!wallet) return;
        if (wallet.deposit_balance < lottery.ticket_price) {
            toast.error(`Insufficient Deposit Balance. Need ৳${lottery.ticket_price}`);
            return;
        }

        if (lottery.sold_tickets >= lottery.total_tickets) {
            toast.error("Campaign is fully sold out!");
            return;
        }

        if (!await confirm(`Authorize purchase of 1 Entry for ${lottery.title}?\n\nPrice: ৳${lottery.ticket_price}`, "Lottery Order Confirmation")) return;

        setBuyingId(lottery.id);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (session) {
                await buyLotteryTicket(session.user.id, lottery, 1);
                
                toast.success("Ticket Issued Successfully!");
                confetti({
                    particleCount: 120,
                    spread: 80,
                    origin: { y: 0.6 },
                    colors: ['#FFBE0B', '#FACC15', '#FFFFFF']
                });
                
                fetchData();
            }
        } catch (e: any) {
            toast.error(e.message || "Failed to process order");
        } finally {
            setBuyingId(null);
        }
    };

    if (loading) return <div className="min-h-screen flex items-center justify-center bg-black"><Loader /></div>;

    return (
        <div className="pb-32 sm:pl-20 sm:pt-6 space-y-10 px-4 sm:px-0 font-sans">
            
            {/* --- HEADER --- */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 pt-4">
                <div className="space-y-1">
                    <h1 className="text-4xl font-black text-white uppercase tracking-tighter flex items-center gap-3">
                        <Ticket className="text-brand" size={38} strokeWidth={3} /> Lucky <span className="text-brand">Draw</span>
                    </h1>
                    <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-brand animate-pulse"></div>
                        <p className="text-muted text-[10px] font-black uppercase tracking-[0.3em]">Official Prize Portal</p>
                    </div>
                </div>
                
                <GlassCard className="!p-4 !rounded-3xl border-brand/20 bg-brand/5 backdrop-blur-xl flex items-center gap-4 shadow-xl">
                    <div className="p-3 bg-brand/10 rounded-2xl text-brand shadow-inner">
                        <SmartphoneNfc size={22} />
                    </div>
                    <div>
                        <p className="text-[10px] text-muted font-black uppercase tracking-widest">Entry Balance</p>
                        <p className="text-xl font-black text-brand font-mono leading-none mt-1">
                            <BalanceDisplay amount={wallet?.deposit_balance || 0} isNative />
                        </p>
                    </div>
                </GlassCard>
            </div>

            {/* --- ACTIVE DRAWS --- */}
            <section className="space-y-6">
                <div className="flex items-center gap-3 px-1">
                    <Sparkles className="text-brand animate-pulse" size={20} />
                    <h3 className="text-xs font-black text-white uppercase tracking-[0.4em]">Active Campaigns</h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {lotteries.map(lot => {
                        const progress = (lot.sold_tickets / lot.total_tickets) * 100;
                        return (
                            <motion.div 
                                key={lot.id}
                                whileHover={{ y: -6 }}
                                className="relative group"
                            >
                                <div className="absolute -inset-0.5 bg-gradient-to-r from-brand/40 to-yellow-500/40 rounded-[2.5rem] blur opacity-20 group-hover:opacity-100 transition duration-500"></div>
                                <GlassCard className="relative !rounded-[2.5rem] border-white/10 bg-panel p-6 flex flex-col gap-6 overflow-hidden">
                                    
                                    <div className="flex justify-between items-start relative z-10">
                                        <div className="flex items-center gap-4">
                                            <div className="w-18 h-18 rounded-[1.5rem] bg-black border border-white/10 overflow-hidden shadow-2xl flex items-center justify-center p-2">
                                                {lot.image_url ? (
                                                    <img src={lot.image_url} className="w-full h-full object-contain" alt={lot.title} />
                                                ) : (
                                                    <Smartphone size={36} className="text-brand" />
                                                )}
                                            </div>
                                            <div>
                                                <h4 className="text-2xl font-black text-white uppercase tracking-tighter leading-tight">{lot.title}</h4>
                                                <p className="text-sm text-brand font-black uppercase tracking-widest mt-1">Est Value: ৳{lot.prize_value.toLocaleString()}</p>
                                            </div>
                                        </div>
                                        <div className="bg-brand/10 px-4 py-1.5 rounded-full border border-brand/20 shadow-glow">
                                            <span className="text-[10px] font-black text-brand uppercase tracking-tighter">LIVE DRAW</span>
                                        </div>
                                    </div>

                                    <div className="space-y-3 relative z-10 bg-black/40 p-4 rounded-3xl border border-white/5 shadow-inner">
                                        <div className="flex justify-between text-[10px] font-black text-muted uppercase tracking-widest">
                                            <span>Slots Remaining</span>
                                            <span className="text-white">{lot.total_tickets - lot.sold_tickets} / {lot.total_tickets}</span>
                                        </div>
                                        <div className="h-4 w-full bg-black rounded-full overflow-hidden border border-white/5 p-0.5 shadow-inner">
                                            <motion.div 
                                                className="h-full bg-gradient-to-r from-brand to-yellow-400 rounded-full shadow-[0_0_15px_rgba(250,190,11,0.5)]"
                                                initial={{ width: 0 }}
                                                animate={{ width: `${progress}%` }}
                                                transition={{ duration: 1.5, ease: "easeOut" }}
                                            />
                                        </div>
                                    </div>

                                    <div className="flex items-center justify-between pt-2 relative z-10">
                                        <div className="flex flex-col">
                                            <p className="text-[9px] text-muted font-black uppercase tracking-widest mb-1">Ticket Cost</p>
                                            <div className="flex items-end gap-1">
                                                <span className="text-2xl font-black text-white font-mono leading-none">৳{lot.ticket_price}</span>
                                                <span className="text-[10px] text-muted font-bold pb-0.5">/entry</span>
                                            </div>
                                        </div>
                                        <button 
                                            onClick={() => handleBuy(lot)}
                                            disabled={!!buyingId || lot.sold_tickets >= lot.total_tickets}
                                            className={`px-10 py-4 rounded-2xl font-black uppercase text-xs tracking-widest transition-all shadow-2xl active:scale-95 flex items-center gap-3 ${
                                                lot.sold_tickets >= lot.total_tickets 
                                                ? 'bg-gray-800 text-gray-500 cursor-not-allowed border border-white/5' 
                                                : 'bg-brand text-black hover:bg-white'
                                            }`}
                                        >
                                            {buyingId === lot.id ? <Loader2 className="animate-spin" size={18}/> : <><ShoppingCart size={18} strokeWidth={3} /> GET TICKET</>}
                                        </button>
                                    </div>

                                    {/* Decoration Background Icon */}
                                    <Ticket size={240} className="absolute -bottom-20 -right-24 opacity-[0.03] rotate-[25deg] pointer-events-none text-brand" />
                                </GlassCard>
                            </motion.div>
                        );
                    })}

                    {lotteries.length === 0 && (
                        <div className="col-span-full py-24 text-center bg-[#080808] rounded-[3rem] border-2 border-dashed border-white/5 shadow-inner">
                            <Ticket size={64} className="mx-auto text-gray-800 mb-6 opacity-20" />
                            <p className="text-gray-600 text-sm font-black uppercase tracking-[0.3em]">No Active Pools Available</p>
                        </div>
                    )}
                </div>
            </section>

            {/* --- MY ENTRIES --- */}
            {myTickets.length > 0 && (
                <section className="space-y-6">
                    <div className="flex items-center justify-between px-1">
                        <h3 className="text-xs font-black text-muted uppercase tracking-[0.4em] flex items-center gap-2">
                            <SmartphoneNfc size={16} className="text-brand" /> Reserved IDs
                        </h3>
                        <span className="text-[10px] font-black text-brand bg-brand/10 px-3 py-1 rounded-full border border-brand/20 shadow-glow">
                            {myTickets.length} ACTIVE ENTRIES
                        </span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
                        {myTickets.map(ticket => (
                            <motion.div 
                                key={ticket.id}
                                initial={{ opacity: 0, scale: 0.8 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="bg-[#0f0f0f] border border-white/10 rounded-3xl p-5 flex flex-col items-center justify-center gap-2 relative overflow-hidden group hover:border-brand/40 transition-all shadow-lg"
                            >
                                <div className="absolute top-0 left-0 w-full h-1 bg-brand opacity-20"></div>
                                <Ticket size={28} className="text-brand opacity-40 mb-1 group-hover:scale-110 group-hover:opacity-100 transition-all" />
                                <span className="text-[9px] text-gray-600 font-black uppercase tracking-widest">Protocol ID</span>
                                <span className="text-xl font-black text-white font-mono tracking-tighter">#{ticket.ticket_number}</span>
                                <div className="absolute -bottom-4 -right-4 w-12 h-12 rounded-full bg-brand/5 blur-2xl"></div>
                            </motion.div>
                        ))}
                    </div>
                </section>
            )}

            {/* --- DISCLOSURE --- */}
            <div className="bg-red-500/5 border border-red-500/20 p-8 rounded-[3rem] flex flex-col sm:flex-row items-center sm:items-start gap-6 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-1 bottom-0 bg-red-600"></div>
                <AlertTriangle size={32} className="text-red-500 shrink-0" />
                <div className="text-center sm:text-left space-y-2">
                    <h4 className="text-red-400 font-black text-sm uppercase tracking-wider">Protocol Participation Agreement</h4>
                    <p className="text-[11px] text-gray-500 leading-relaxed max-w-2xl font-medium">
                        Participation in any Lucky Draw is voluntary. Tickets are non-refundable once the transaction is finalized on the ledger. Winners are selected via a cryptographically secure random oracle once the pool is filled or the timer expires. Physical prizes are dispatched via global verified logistics within 14 business days.
                    </p>
                </div>
            </div>

        </div>
    );
};

export default LotteryPage;
