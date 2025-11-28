
import React, { useState } from 'react';
import GlassCard from '../../components/GlassCard';
import { supabase } from '../../integrations/supabase/client';
import { BellRing, Send, Search, CheckCircle, Users, User, AlertCircle, Loader2, Smartphone } from 'lucide-react';
import { useUI } from '../../context/UIContext';
import { motion, AnimatePresence } from 'framer-motion';

const NotiSender: React.FC = () => {
    const { toast, confirm } = useUI();
    const [targetType, setTargetType] = useState<'single' | 'all'>('single');
    const [searchId, setSearchId] = useState('');
    const [foundUser, setFoundUser] = useState<{ id: string, name: string, email: string } | null>(null);
    const [title, setTitle] = useState('');
    const [message, setMessage] = useState('');
    const [type, setType] = useState<'info' | 'success' | 'warning' | 'error'>('info');
    const [loading, setLoading] = useState(false);
    const [searching, setSearching] = useState(false);

    const handleSearchUser = async () => {
        if (!searchId || searchId.length < 3) return;
        setSearching(true);
        setFoundUser(null);

        // Search by User UID (8 digits) or Email
        let query = supabase.from('profiles').select('id, name_1, email_1');
        
        if (searchId.includes('@')) {
            query = query.eq('email_1', searchId);
        } else if (/^\d+$/.test(searchId) && searchId.length === 8) {
            query = query.eq('user_uid', parseInt(searchId));
        } else {
            // Try raw UUID
            query = query.eq('id', searchId);
        }

        const { data, error } = await query.maybeSingle();
        
        if (data) {
            setFoundUser({ id: data.id, name: data.name_1 || 'User', email: data.email_1 });
        } else {
            toast.error("User not found");
        }
        setSearching(false);
    };

    const handleSend = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!title.trim() || !message.trim()) {
            toast.error("Title and Message are required");
            return;
        }

        if (targetType === 'single' && !foundUser) {
            toast.error("Please search and select a user first");
            return;
        }

        const confirmMsg = targetType === 'all' 
            ? `⚠️ BROADCAST ALERT: This will send a notification to ALL users in the database. Are you sure?`
            : `Send to ${foundUser?.name}?`;

        if (!await confirm(confirmMsg, "Confirm Send")) return;

        setLoading(true);
        try {
            if (targetType === 'single' && foundUser) {
                // Single Insert
                const { error } = await supabase.from('notifications').insert({
                    user_id: foundUser.id,
                    title,
                    message,
                    type,
                    is_read: false
                });
                if (error) throw error;
                toast.success("Notification sent to user!");
            } else {
                // Broadcast via RPC
                const { error } = await supabase.rpc('admin_broadcast_notification', {
                    p_title: title,
                    p_message: message,
                    p_type: type
                });
                if (error) throw error;
                toast.success("Broadcast sent to all users!");
            }

            // Reset Form
            setTitle('');
            setMessage('');
            if (targetType === 'single') {
                setFoundUser(null);
                setSearchId('');
            }

        } catch (e: any) {
            console.error(e);
            let msg = e.message;
            if (msg.includes('function admin_broadcast_notification') && msg.includes('does not exist')) {
                msg = "Broadcast function missing. Please run the SQL in Database Ultra.";
            }
            toast.error("Failed: " + msg);
        } finally {
            setLoading(false);
        }
    };

    const handleTestLocal = async () => {
        if (!('Notification' in window)) {
            toast.error("This browser does not support desktop notifications");
            return;
        }
        
        if (Notification.permission === 'granted') {
            try {
                if ('serviceWorker' in navigator && navigator.serviceWorker.ready) {
                    const reg = await navigator.serviceWorker.ready;
                    reg.showNotification("Test Notification", {
                        body: "This is a test from the Admin Panel.",
                        icon: '/icon-192x192.png',
                        // @ts-ignore
                        vibrate: [200, 100, 200]
                    });
                } else {
                    new Notification("Test Notification", {
                        body: "This is a test from the Admin Panel."
                    });
                }
                toast.success("Test notification triggered");
            } catch(e) {
                toast.error("Error triggering: " + e);
            }
        } else if (Notification.permission !== 'denied') {
            const permission = await Notification.requestPermission();
            if (permission === 'granted') {
                handleTestLocal();
            }
        } else {
            toast.error("Permission denied. Check browser settings.");
        }
    };

    return (
        <div className="space-y-6 animate-fade-in pb-20">
            <div className="flex justify-between items-end">
                <div>
                    <h2 className="text-3xl font-display font-black text-yellow-400 flex items-center gap-3">
                        <BellRing className="text-white" size={32} /> NOTI SENDER
                    </h2>
                    <p className="text-gray-400 text-sm mt-1">
                        Send real-time alerts to users or broadcast system announcements.
                    </p>
                </div>
                <button onClick={handleTestLocal} className="text-xs bg-white/10 px-3 py-1.5 rounded flex items-center gap-2 hover:bg-white/20">
                    <Smartphone size={14}/> Test My Device
                </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* CONTROL PANEL */}
                <div className="lg:col-span-2 space-y-6">
                    <GlassCard className="border-yellow-500/30 bg-black/40">
                        <form onSubmit={handleSend} className="space-y-6">
                            
                            {/* Target Selection */}
                            <div className="grid grid-cols-2 gap-4">
                                <div 
                                    onClick={() => setTargetType('single')}
                                    className={`cursor-pointer p-4 rounded-xl border flex flex-col items-center justify-center transition ${targetType === 'single' ? 'bg-blue-500/20 border-blue-500 text-white' : 'bg-white/5 border-white/5 text-gray-500 hover:bg-white/10'}`}
                                >
                                    <User size={24} className="mb-2" />
                                    <span className="font-bold text-sm uppercase">Single User</span>
                                </div>
                                <div 
                                    onClick={() => setTargetType('all')}
                                    className={`cursor-pointer p-4 rounded-xl border flex flex-col items-center justify-center transition ${targetType === 'all' ? 'bg-yellow-500/20 border-yellow-500 text-white' : 'bg-white/5 border-white/5 text-gray-500 hover:bg-white/10'}`}
                                >
                                    <Users size={24} className="mb-2" />
                                    <span className="font-bold text-sm uppercase">Broadcast All</span>
                                </div>
                            </div>

                            {/* User Search (Conditional) */}
                            <AnimatePresence>
                                {targetType === 'single' && (
                                    <motion.div 
                                        initial={{ opacity: 0, height: 0 }} 
                                        animate={{ opacity: 1, height: 'auto' }} 
                                        exit={{ opacity: 0, height: 0 }}
                                        className="overflow-hidden"
                                    >
                                        <label className="text-xs font-bold text-gray-400 mb-1 block uppercase">Recipient</label>
                                        <div className="flex gap-2">
                                            <div className="relative flex-1">
                                                <input 
                                                    type="text" 
                                                    value={searchId}
                                                    onChange={e => setSearchId(e.target.value)}
                                                    className="w-full bg-black/50 border border-white/10 rounded-lg pl-10 pr-4 py-3 text-white focus:border-blue-500 outline-none"
                                                    placeholder="Enter User ID (8-digit) or Email"
                                                />
                                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={18}/>
                                            </div>
                                            <button 
                                                type="button" 
                                                onClick={handleSearchUser}
                                                className="bg-blue-600 text-white px-4 rounded-lg font-bold hover:bg-blue-500"
                                            >
                                                {searching ? <Loader2 className="animate-spin" /> : 'Find'}
                                            </button>
                                        </div>
                                        {foundUser && (
                                            <div className="mt-2 bg-green-500/10 border border-green-500/30 p-3 rounded-lg flex items-center justify-between">
                                                <div>
                                                    <p className="text-white font-bold text-sm">{foundUser.name}</p>
                                                    <p className="text-green-400 text-xs">{foundUser.email}</p>
                                                </div>
                                                <CheckCircle className="text-green-500" size={20} />
                                            </div>
                                        )}
                                    </motion.div>
                                )}
                            </AnimatePresence>

                            {/* Message Details */}
                            <div className="space-y-4">
                                <div>
                                    <label className="text-xs font-bold text-gray-400 mb-1 block uppercase">Notification Type</label>
                                    <div className="grid grid-cols-4 gap-2">
                                        {['info', 'success', 'warning', 'error'].map(t => (
                                            <button
                                                key={t}
                                                type="button"
                                                onClick={() => setType(t as any)}
                                                className={`py-2 rounded-lg text-xs font-bold uppercase transition border ${
                                                    type === t 
                                                    ? (t === 'info' ? 'bg-blue-500/20 border-blue-500 text-blue-400' : t === 'success' ? 'bg-green-500/20 border-green-500 text-green-400' : t === 'warning' ? 'bg-yellow-500/20 border-yellow-500 text-yellow-400' : 'bg-red-500/20 border-red-500 text-red-400')
                                                    : 'bg-white/5 border-transparent text-gray-500 hover:bg-white/10'
                                                }`}
                                            >
                                                {t}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div>
                                    <label className="text-xs font-bold text-gray-400 mb-1 block uppercase">Title</label>
                                    <input 
                                        required
                                        type="text" 
                                        value={title}
                                        onChange={e => setTitle(e.target.value)}
                                        className="w-full bg-black/50 border border-white/10 rounded-lg p-3 text-white focus:border-yellow-500 outline-none font-bold"
                                        placeholder="e.g. System Bonus Received!"
                                    />
                                </div>

                                <div>
                                    <label className="text-xs font-bold text-gray-400 mb-1 block uppercase">Message Body</label>
                                    <textarea 
                                        required
                                        value={message}
                                        onChange={e => setMessage(e.target.value)}
                                        className="w-full bg-black/50 border border-white/10 rounded-lg p-3 text-white focus:border-yellow-500 outline-none h-32 resize-none"
                                        placeholder="Enter the main content of your notification..."
                                    />
                                </div>
                            </div>

                            <button 
                                type="submit" 
                                disabled={loading || (targetType === 'single' && !foundUser)}
                                className="w-full py-4 bg-yellow-500 text-black font-black text-lg rounded-xl hover:bg-yellow-400 transition flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(234,179,8,0.4)] disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {loading ? <Loader2 className="animate-spin" /> : <><Send size={20} /> SEND NOTIFICATION</>}
                            </button>

                        </form>
                    </GlassCard>
                </div>

                {/* PREVIEW */}
                <div>
                    <h3 className="text-sm font-bold text-white mb-4 uppercase tracking-widest">Live Preview</h3>
                    
                    {/* Mock Phone Notification Bar */}
                    <div className="bg-black border-4 border-gray-800 rounded-3xl p-3 relative overflow-hidden shadow-2xl">
                        {/* Status Bar */}
                        <div className="flex justify-between items-center text-[10px] text-white px-2 mb-4 opacity-70">
                            <span>9:41</span>
                            <div className="flex gap-1">
                                <div className="w-3 h-3 bg-white rounded-full"></div>
                                <div className="w-3 h-3 bg-white rounded-full"></div>
                            </div>
                        </div>

                        {/* Notification Item */}
                        <motion.div 
                            key={title + message + type}
                            initial={{ y: -50, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            className="bg-gray-800/90 backdrop-blur rounded-2xl p-3 shadow-lg border border-white/5 mb-4"
                        >
                            <div className="flex items-start gap-3">
                                <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center shrink-0">
                                    <span className="font-black text-white text-xs">E</span>
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex justify-between items-baseline mb-0.5">
                                        <span className="text-[10px] font-bold text-gray-400 uppercase">EarnHub Pro • Now</span>
                                    </div>
                                    <h4 className="text-sm font-bold text-white leading-tight mb-1">{title || 'Notification Title'}</h4>
                                    <p className="text-xs text-gray-300 leading-snug line-clamp-3">{message || 'Message content will appear here.'}</p>
                                </div>
                            </div>
                        </motion.div>

                        {/* In-App Toast Preview */}
                        <div className="mt-8 border-t border-white/10 pt-4">
                            <p className="text-[10px] text-gray-500 uppercase font-bold mb-2">In-App Toast Style</p>
                            <div className={`p-3 rounded-xl border flex items-center gap-3 ${
                                type === 'info' ? 'bg-blue-500/10 border-blue-500/30 text-white' :
                                type === 'success' ? 'bg-green-500/10 border-green-500/30 text-white' :
                                type === 'warning' ? 'bg-yellow-500/10 border-yellow-500/30 text-white' :
                                'bg-red-500/10 border-red-500/30 text-white'
                            }`}>
                                <AlertCircle size={18} className={
                                    type === 'info' ? 'text-blue-400' :
                                    type === 'success' ? 'text-green-400' :
                                    type === 'warning' ? 'text-yellow-400' :
                                    'text-red-400'
                                } />
                                <div className="flex-1">
                                    <p className="text-xs font-bold">{title || 'Alert Title'}</p>
                                </div>
                            </div>
                        </div>

                    </div>
                </div>

            </div>
        </div>
    );
};

export default NotiSender;
