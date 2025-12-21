
import React, { useEffect, useState } from 'react';
import GlassCard from '../../components/GlassCard';
import { supabase } from '../../integrations/supabase/client';
import { Lottery } from '../../types';
import { Ticket, Plus, Trash2, Edit2, Save, X, Trophy, Users, RefreshCw, Loader2, DollarSign, Image as ImageIcon, Calendar, CheckSquare } from 'lucide-react';
import { useUI } from '../../context/UIContext';
import { motion, AnimatePresence } from 'framer-motion';
import BalanceDisplay from '../../components/BalanceDisplay';
import ImageSelector from '../../components/ImageSelector';

const LotteryManager: React.FC = () => {
    const { toast, confirm } = useUI();
    const [lotteries, setLotteries] = useState<Lottery[]>([]);
    const [loading, setLoading] = useState(true);
    const [isEditing, setIsEditing] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [drawingId, setDrawingId] = useState<string | null>(null);

    const initialForm = {
        title: '',
        description: '',
        prize_value: '140000',
        ticket_price: '500',
        total_tickets: '300',
        image_url: '',
        end_date: '',
        status: 'active' as 'active' | 'ended' | 'drawn'
    };
    const [form, setForm] = useState(initialForm);

    useEffect(() => {
        fetchLotteries();
    }, []);

    const fetchLotteries = async () => {
        setLoading(true);
        const { data } = await supabase.from('lotteries').select('*').order('created_at', { ascending: false });
        if (data) setLotteries(data as Lottery[]);
        setLoading(false);
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        const payload = {
            title: form.title,
            description: form.description,
            prize_value: parseFloat(form.prize_value),
            ticket_price: parseFloat(form.ticket_price),
            total_tickets: parseInt(form.total_tickets),
            image_url: form.image_url,
            status: form.status,
            end_date: form.end_date || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
        };

        try {
            if (editingId) {
                const { error } = await supabase.from('lotteries').update(payload).eq('id', editingId);
                if (error) throw error;
                toast.success("Lottery protocol updated");
            } else {
                const { error } = await supabase.from('lotteries').insert({ ...payload, sold_tickets: 0 });
                if (error) throw error;
                toast.success("New draw initialized successfully");
            }
            setIsEditing(false);
            setForm(initialForm);
            fetchLotteries();
        } catch (e: any) {
            toast.error(e.message);
        }
    };

    const handleDelete = async (id: string) => {
        if (!await confirm("Critical: Purge this campaign? Any tickets purchased will be orphaned in the ledger.", "DESTRUCTION CONFIRMATION")) return;
        await supabase.from('lotteries').delete().eq('id', id);
        fetchLotteries();
        toast.success("Campaign purged from system");
    };

    const handleDrawWinner = async (lottery: Lottery) => {
        if (!await confirm(`Pick random ID for ${lottery.title}? \n\nThis will terminate the draw and broadcast the winner.`, "AUTHORIZE DRAW")) return;
        
        setDrawingId(lottery.id);
        try {
            // 1. Get all tickets for this lottery
            const { data: tickets } = await supabase.from('lottery_tickets').select('id, user_id, ticket_number').eq('lottery_id', lottery.id);
            
            if (!tickets || tickets.length === 0) {
                toast.error("Execution Aborted: No valid entries found.");
                setDrawingId(null);
                return;
            }

            // 2. Pick Random Winner
            const winnerIdx = Math.floor(Math.random() * tickets.length);
            const winningTicket = tickets[winnerIdx];

            // 3. Get Winner Profile
            const { data: profile } = await supabase.from('profiles').select('name_1').eq('id', winningTicket.user_id).single();

            // 4. Update Lottery Status
            await supabase.from('lotteries').update({
                status: 'drawn',
                winner_id: winningTicket.user_id,
                winner_name: profile?.name_1 || 'Unidentified Node'
            }).eq('id', lottery.id);

            // 5. Send Notification
            await supabase.from('notifications').insert({
                user_id: winningTicket.user_id,
                title: '🏆 PRIZE SECURED!',
                message: `Protocol Success! You won the "${lottery.title}" draw with ticket ID #${winningTicket.ticket_number}. Contact core admin for courier setup.`,
                type: 'success'
            });

            toast.success(`Winner Verified: ${profile?.name_1 || 'Anonymous'}`);
            fetchLotteries();
        } catch (e: any) {
            toast.error(e.message);
        } finally {
            setDrawingId(null);
        }
    };

    const handleEdit = (lot: Lottery) => {
        setForm({
            title: lot.title,
            description: lot.description || '',
            prize_value: lot.prize_value.toString(),
            ticket_price: lot.ticket_price.toString(),
            total_tickets: lot.total_tickets.toString(),
            image_url: lot.image_url || '',
            end_date: lot.end_date ? new Date(lot.end_date).toISOString().slice(0, 16) : '',
            status: lot.status
        });
        setEditingId(lot.id);
        setIsEditing(true);
    };

    return (
        <div className="space-y-6 animate-fade-in pb-24 font-mono">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h2 className="text-3xl font-black text-white flex items-center gap-3 uppercase tracking-tighter">
                        <Ticket className="text-brand" size={32} /> Lottery <span className="text-brand">Oversight</span>
                    </h2>
                    <p className="text-gray-500 text-[10px] font-bold uppercase tracking-[0.2em] mt-1">Reward Pool Management v1.2</p>
                </div>
                <button 
                    onClick={() => { setIsEditing(true); setEditingId(null); setForm(initialForm); }}
                    className="bg-brand text-black px-6 py-3 rounded-2xl font-black uppercase text-xs tracking-widest flex items-center gap-3 hover:bg-white transition shadow-xl"
                >
                    <Plus size={18} strokeWidth={3} /> INITIALIZE DRAW
                </button>
            </div>

            {loading ? (
                <div className="p-20 text-center"><Loader2 className="animate-spin mx-auto text-brand" size={40} /></div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {lotteries.map(lot => (
                        <GlassCard key={lot.id} className={`border-2 transition-all duration-500 ${lot.status === 'drawn' ? 'opacity-60 border-white/5' : 'border-brand/20 shadow-[0_0_20px_rgba(250,190,11,0.05)]'}`}>
                            <div className="flex justify-between items-start mb-6">
                                <div className="flex gap-4">
                                    <div className="w-16 h-16 rounded-2xl bg-black border border-white/10 flex items-center justify-center overflow-hidden shadow-inner">
                                        {lot.image_url ? <img src={lot.image_url} className="w-full h-full object-contain" /> : <Ticket size={32} className="text-brand" />}
                                    </div>
                                    <div>
                                        <h3 className="font-black text-white text-xl uppercase tracking-tighter leading-none">{lot.title}</h3>
                                        <div className="flex gap-2 mt-2">
                                            <span className={`text-[9px] px-2 py-1 rounded font-black uppercase tracking-widest ${lot.status === 'active' ? 'bg-green-500 text-black' : 'bg-gray-800 text-gray-500'}`}>
                                                {lot.status}
                                            </span>
                                            <span className="text-[10px] text-gray-500 font-black uppercase tracking-widest flex items-center gap-1">
                                                <DollarSign size={10}/> ৳{lot.ticket_price}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="text-[9px] text-gray-600 font-black uppercase tracking-widest mb-1">Volume</p>
                                    <p className="text-xl font-black text-white font-mono">{lot.sold_tickets} / {lot.total_tickets}</p>
                                </div>
                            </div>

                            {lot.status === 'drawn' && (
                                <div className="bg-brand/10 border border-brand/20 p-4 rounded-2xl mb-6 flex items-center gap-4 relative overflow-hidden">
                                    <div className="absolute top-0 left-0 w-1 bottom-0 bg-brand"></div>
                                    <Trophy size={24} className="text-brand" />
                                    <div>
                                        <p className="text-[9px] text-brand font-black uppercase tracking-widest">ASSIGNED WINNER</p>
                                        <p className="text-lg font-black text-white uppercase tracking-tighter">{lot.winner_name || 'Protocol Unknown'}</p>
                                    </div>
                                </div>
                            )}

                            <div className="flex gap-3">
                                {lot.status === 'active' && (
                                    <button 
                                        onClick={() => handleDrawWinner(lot)}
                                        disabled={!!drawingId || lot.sold_tickets === 0}
                                        className="flex-1 py-3 bg-white text-black rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-brand transition flex items-center justify-center gap-2 shadow-lg"
                                    >
                                        {drawingId === lot.id ? <Loader2 className="animate-spin" size={16}/> : <Trophy size={16} strokeWidth={3}/>} DRAW WINNER
                                    </button>
                                )}
                                <button onClick={() => handleEdit(lot)} className="p-3 bg-white/5 rounded-xl text-gray-500 hover:text-white transition border border-white/5 hover:border-brand/30"><Edit2 size={18}/></button>
                                <button onClick={() => handleDelete(lot.id)} className="p-3 bg-red-600/10 rounded-xl text-red-500 hover:bg-red-600 hover:text-white transition border border-red-500/20"><Trash2 size={18}/></button>
                            </div>
                        </GlassCard>
                    ))}
                    {lotteries.length === 0 && <div className="col-span-full py-20 text-center text-gray-700 uppercase font-black tracking-[0.4em] text-xs">No active protocols detected</div>}
                </div>
            )}

            {/* --- ADMIN DRAWER MODAL --- */}
            <AnimatePresence>
                {isEditing && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-md flex items-center justify-center p-6">
                        <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }} className="bg-[#0a0a0a] w-full max-w-xl rounded-[2.5rem] border border-white/10 p-10 shadow-2xl relative overflow-hidden">
                            <div className="absolute top-0 left-0 w-full h-1 bg-brand opacity-40"></div>
                            
                            <div className="flex justify-between items-center mb-8">
                                <h3 className="text-2xl font-black text-white uppercase tracking-tighter">{editingId ? 'Edit Campaign' : 'Initialize Draw'}</h3>
                                <button onClick={() => setIsEditing(false)} className="text-gray-600 hover:text-white transition"><X size={28}/></button>
                            </div>

                            <form onSubmit={handleSave} className="space-y-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <label className="text-[10px] text-gray-500 font-black uppercase tracking-widest block ml-1">Prize Identity</label>
                                        <input required type="text" value={form.title} onChange={e => setForm({...form, title: e.target.value})} className="w-full bg-black/60 border border-white/10 rounded-2xl p-4 text-white focus:border-brand outline-none transition-colors" placeholder="e.g. iPhone 15" />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] text-gray-500 font-black uppercase tracking-widest block ml-1">Market Value (৳)</label>
                                        <input required type="number" value={form.prize_value} onChange={e => setForm({...form, prize_value: e.target.value})} className="w-full bg-black/60 border border-white/10 rounded-2xl p-4 text-white focus:border-brand outline-none font-mono" />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <label className="text-[10px] text-gray-500 font-black uppercase tracking-widest block ml-1">Ticket Cost (৳)</label>
                                        <input required type="number" value={form.ticket_price} onChange={e => setForm({...form, ticket_price: e.target.value})} className="w-full bg-black/60 border border-white/10 rounded-2xl p-4 text-white focus:border-brand outline-none font-mono" />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] text-gray-500 font-black uppercase tracking-widest block ml-1">Inventory (Qty)</label>
                                        <input required type="number" value={form.total_tickets} onChange={e => setForm({...form, total_tickets: e.target.value})} className="w-full bg-black/60 border border-white/10 rounded-2xl p-4 text-white focus:border-brand outline-none font-mono" />
                                    </div>
                                </div>

                                <ImageSelector 
                                    label="Visual Asset (URL)"
                                    value={form.image_url}
                                    onChange={(v) => setForm({...form, image_url: v})}
                                />

                                <div className="space-y-2">
                                    <label className="text-[10px] text-gray-500 font-black uppercase tracking-widest block ml-1">Termination Sequence (End Date)</label>
                                    <input type="datetime-local" value={form.end_date} onChange={e => setForm({...form, end_date: e.target.value})} className="w-full bg-black/60 border border-white/10 rounded-2xl p-4 text-white focus:border-brand outline-none" />
                                </div>

                                <button type="submit" className="w-full py-5 bg-brand text-black font-black uppercase tracking-widest rounded-2xl hover:bg-white transition-all shadow-[0_10px_30px_rgba(250,190,11,0.2)] mt-4 active:scale-95">
                                    {editingId ? 'COMMIT PROTOCOL UPDATES' : 'EXECUTE POOL INITIALIZATION'}
                                </button>
                            </form>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default LotteryManager;
