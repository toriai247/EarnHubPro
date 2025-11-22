import React, { useEffect, useState } from 'react';
import GlassCard from '../components/GlassCard';
import Skeleton from '../components/Skeleton';
import { Bell, CheckCircle, AlertTriangle, Info, X } from 'lucide-react';
import { AppNotification } from '../types';
import { supabase } from '../integrations/supabase/client';
import { motion, AnimatePresence } from 'framer-motion';

const MotionDiv = motion.div as any;

const Notifications: React.FC = () => {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      const { data } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false });
        
      if (data && data.length > 0) {
        setNotifications(data.map(n => ({ ...n, read: n.is_read })));
      } else {
        setNotifications([
            { id: '1', title: 'Welcome to EarnHub Pro!', message: 'Start earning by completing tasks.', created_at: new Date().toISOString(), read: false, type: 'success' },
        ]);
      }
    }
    setLoading(false);
  };

  const markAsRead = async (id: string) => {
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
      await supabase.from('notifications').update({ is_read: true }).eq('id', id);
  };

  const deleteNotification = (id: string) => {
      setNotifications(prev => prev.filter(n => n.id !== id));
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
    <div className="pb-24 sm:pl-20 sm:pt-6 space-y-6">
      <header className="flex justify-between items-center">
         <h1 className="text-2xl font-display font-bold text-white">Notifications</h1>
         <span className="text-xs bg-royal-500/20 text-royal-300 px-2 py-1 rounded-lg">
            {loading ? <Skeleton variant="text" className="w-8" /> : `${notifications.filter(n => !n.read).length} New`}
         </span>
      </header>

      <div className="space-y-3">
         <AnimatePresence>
            {loading ? (
                <div className="space-y-3">
                    {[1, 2, 3].map(i => (
                        <div key={i} className="p-4 rounded-xl bg-white/5 border border-white/5 flex gap-3">
                            <Skeleton variant="circular" className="w-6 h-6 shrink-0" />
                            <div className="w-full space-y-2">
                                <Skeleton variant="text" className="w-32 h-4" />
                                <Skeleton variant="text" className="w-full h-3" />
                                <Skeleton variant="text" className="w-20 h-3" />
                            </div>
                        </div>
                    ))}
                </div>
            ) : notifications.length === 0 ? (
                <div className="text-center text-gray-500 py-10 bg-white/5 rounded-2xl border border-white/5">
                    <Bell size={40} className="mx-auto mb-3 opacity-50" />
                    <p>No new notifications.</p>
                </div>
            ) : (
                notifications.map((notif) => (
                    <MotionDiv
                        key={notif.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, x: -100 }}
                    >
                        <GlassCard 
                            className={`relative pr-10 transition-all ${notif.read ? 'opacity-70 bg-black/20' : 'bg-white/10 border-royal-500/30'}`}
                            onClick={() => !notif.read && markAsRead(notif.id)}
                        >
                            <button 
                                onClick={(e) => { e.stopPropagation(); deleteNotification(notif.id); }}
                                className="absolute top-3 right-3 text-gray-500 hover:text-white transition"
                            >
                                <X size={16} />
                            </button>
                            
                            <div className="flex gap-3">
                                <div className={`mt-1 min-w-[24px]`}>
                                    {getIcon(notif.type)}
                                </div>
                                <div>
                                    <h4 className={`text-sm font-bold mb-1 ${notif.read ? 'text-gray-400' : 'text-white'}`}>
                                        {notif.title}
                                        {!notif.read && <span className="ml-2 inline-block w-2 h-2 bg-neon-green rounded-full"></span>}
                                    </h4>
                                    <p className="text-xs text-gray-400 leading-relaxed">{notif.message}</p>
                                    <p className="text-[10px] text-gray-600 mt-2">{new Date(notif.created_at).toLocaleString()}</p>
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