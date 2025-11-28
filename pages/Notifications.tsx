
import React, { useEffect, useState } from 'react';
import GlassCard from '../components/GlassCard';
import Skeleton from '../components/Skeleton';
import { Bell, CheckCircle, AlertTriangle, Info, X, Trash2, CheckSquare } from 'lucide-react';
import { AppNotification } from '../types';
import { supabase } from '../integrations/supabase/client';
import { motion, AnimatePresence } from 'framer-motion';
import { useUI } from '../context/UIContext';

const MotionDiv = motion.div as any;

const Notifications: React.FC = () => {
  const { toast, confirm } = useUI();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
    
    // Realtime Listener for new notifications
    const sub = supabase
        .channel('notif-page')
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications' }, (payload) => {
            const newNotif = { ...payload.new, read: false } as AppNotification;
            setNotifications(prev => [newNotif, ...prev]);
        })
        .subscribe();

    return () => { sub.unsubscribe(); };
  }, []);

  const fetchData = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      const { data } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false })
        .limit(50);
        
      if (data) {
        setNotifications(data.map(n => ({ ...n, read: n.is_read })));
      }
    }
    setLoading(false);
  };

  const markAsRead = async (id: string) => {
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
      await supabase.from('notifications').update({ is_read: true }).eq('id', id);
  };

  const markAllRead = async () => {
      if (notifications.every(n => n.read)) return;
      
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      const { data: { session } } = await supabase.auth.getSession();
      if(session) {
          await supabase.from('notifications').update({ is_read: true }).eq('user_id', session.user.id);
          toast.success("All marked as read");
      }
  };

  const deleteAll = async () => {
      if (notifications.length === 0) return;
      if(!await confirm("Clear all notifications? This cannot be undone.")) return;
      const { data: { session } } = await supabase.auth.getSession();
      if(session) {
          await supabase.from('notifications').delete().eq('user_id', session.user.id);
          setNotifications([]);
          toast.success("Notifications cleared");
      }
  };

  const deleteNotification = async (id: string) => {
      setNotifications(prev => prev.filter(n => n.id !== id));
      await supabase.from('notifications').delete().eq('id', id);
  };

  const getIcon = (type: string) => {
      switch (type) {
          case 'success': return <CheckCircle size={20} className="text-neon-green" />;
          case 'warning': return <AlertTriangle size={20} className="text-yellow-400" />;
          case 'error': return <AlertTriangle size={20} className="text-red-500" />;
          default: return <Info size={20} className="text-royal-400" />;
      }
  };

  return (
    <div className="pb-24 sm:pl-20 sm:pt-6 space-y-6 px-4 sm:px-0">
      <header className="flex justify-between items-center">
         <div>
             <h1 className="text-2xl font-display font-bold text-white">Notifications</h1>
             <p className="text-xs text-gray-400">Stay updated with your account activity.</p>
         </div>
         <div className="flex gap-2">
             <button 
                onClick={markAllRead} 
                className="p-2 bg-white/5 rounded-lg text-gray-400 hover:text-white border border-white/5 transition active:scale-95" 
                title="Mark All Read"
             >
                 <CheckSquare size={18} />
             </button>
             <button 
                onClick={deleteAll} 
                className="p-2 bg-red-500/10 rounded-lg text-red-400 hover:bg-red-500/20 border border-red-500/20 transition active:scale-95" 
                title="Delete All"
             >
                 <Trash2 size={18} />
             </button>
         </div>
      </header>

      <div className="space-y-3">
         <AnimatePresence mode="popLayout">
            {loading ? (
                <div className="space-y-3">
                    {[1, 2, 3].map(i => (
                        <div key={i} className="p-4 rounded-xl bg-white/5 border border-white/5 flex gap-3">
                            <Skeleton variant="circular" className="w-6 h-6 shrink-0" />
                            <div className="w-full space-y-2">
                                <Skeleton variant="text" className="w-32 h-4" />
                                <Skeleton variant="text" className="w-full h-3" />
                            </div>
                        </div>
                    ))}
                </div>
            ) : notifications.length === 0 ? (
                <div className="text-center text-gray-500 py-16 bg-white/5 rounded-2xl border border-white/5 flex flex-col items-center">
                    <Bell size={40} className="mb-3 opacity-30" />
                    <p>No notifications yet.</p>
                </div>
            ) : (
                notifications.map((notif) => (
                    <MotionDiv
                        key={notif.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        layout
                    >
                        <GlassCard 
                            className={`relative pr-10 transition-all cursor-pointer ${notif.read ? 'opacity-70 bg-black/20 border-white/5' : 'bg-white/10 border-white/20 shadow-lg'}`}
                            onClick={() => !notif.read && markAsRead(notif.id)}
                        >
                            <button 
                                onClick={(e) => { e.stopPropagation(); deleteNotification(notif.id); }}
                                className="absolute top-3 right-3 text-gray-500 hover:text-white transition p-1 hover:bg-white/10 rounded"
                            >
                                <X size={14} />
                            </button>
                            
                            <div className="flex gap-4">
                                <div className={`mt-1 min-w-[24px]`}>
                                    {getIcon(notif.type)}
                                </div>
                                <div className="flex-1">
                                    <h4 className={`text-sm font-bold mb-1 flex items-center gap-2 ${notif.read ? 'text-gray-400' : 'text-white'}`}>
                                        {notif.title}
                                        {!notif.read && <span className="w-2 h-2 bg-neon-green rounded-full shadow-[0_0_5px_#10b981]"></span>}
                                    </h4>
                                    <p className="text-xs text-gray-300 leading-relaxed">{notif.message}</p>
                                    <p className="text-[10px] text-gray-600 mt-2 font-mono">{new Date(notif.created_at).toLocaleString()}</p>
                                </div>
                            </div>
                        </GlassCard>
                    </MotionDiv>
                ))
            )}
         </AnimatePresence>
      </div>
    </div>
  );
};

export default Notifications;
