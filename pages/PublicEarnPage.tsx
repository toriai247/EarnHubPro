
import React, { useEffect, useState, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../integrations/supabase/client';
import { Loader2, AlertCircle, ArrowRight, ShieldCheck, Zap, ExternalLink, Lock, CheckCircle2, Download } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import SmartAd from '../components/SmartAd';

const PublicEarnPage: React.FC = () => {
    const { uid } = useParams<{ uid: string }>();
    const [loading, setLoading] = useState(true);
    const [referrerName, setReferrerName] = useState<string | null>(null);
    const [timer, setTimer] = useState(5); 
    const [canProceed, setCanProceed] = useState(false);
    const [viewRecorded, setViewRecorded] = useState(false);
    
    // Matrix effect state
    const [decryptText, setDecryptText] = useState("ENCRYPTED_CONNECTION");

    // Tracking Ref
    const hasTrackedView = useRef(false);

    useEffect(() => {
        if (!uid) return;
        
        const fetchInfo = async () => {
            if (/^\d+$/.test(uid)) {
                const { data } = await supabase.from('profiles').select('name_1').eq('user_uid', parseInt(uid)).single();
                if (data) setReferrerName(data.name_1);
            }
            // Record View (Client-side trigger, secured by SQL logic)
            if (!hasTrackedView.current) {
                hasTrackedView.current = true;
                await recordAction('view');
            }
            setLoading(false);
        };
        fetchInfo();

        // Matrix Effect
        let interval: any;
        const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
        interval = setInterval(() => {
            setDecryptText(prev => prev.split('').map((char, i) => {
                if (Math.random() > 0.9) return chars[Math.floor(Math.random() * chars.length)];
                return char;
            }).join(''));
        }, 100);

        // Timer
        const timeInt = setInterval(() => {
            setTimer(prev => {
                if (prev <= 1) {
                    clearInterval(timeInt);
                    clearInterval(interval);
                    setDecryptText("SECURE_CONNECTION_ESTABLISHED");
                    setCanProceed(true);
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => {
            clearInterval(interval);
            clearInterval(timeInt);
        };
    }, [uid]);

    const recordAction = async (type: 'view' | 'click') => {
        try {
            await supabase.rpc('track_unlimited_action', {
                p_referrer_uid: parseInt(uid || '0'),
                p_action_type: type,
                p_visitor_ip: 'client', // Backend handles IP if configured or use external service
                p_device_info: navigator.userAgent,
                p_country: 'Unknown'
            });
        } catch (e) {
            console.error("Tracking error", e);
        }
    };

    const handleClickAd = async () => {
        // Track Click
        await recordAction('click');
        // Open Ad Link
        window.open('https://www.effectivegatecpm.com/c3x9dphj?key=4805226fe4883d45030d7fd83d992710', '_blank');
    };

    if (loading) return <div className="min-h-screen bg-black flex items-center justify-center text-white"><Loader2 className="animate-spin" size={40} /></div>;

    return (
        <div className="min-h-screen bg-[#050505] text-white font-mono flex flex-col items-center p-4 relative overflow-hidden">
            
            {/* Matrix BG */}
            <div className="absolute inset-0 opacity-10 pointer-events-none bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')]"></div>
            
            <div className="w-full max-w-lg mt-8 mb-6 text-center z-10">
                <div className="inline-flex items-center gap-2 bg-green-900/30 border border-green-500/30 px-3 py-1 rounded-full mb-4">
                    <Lock size={12} className="text-green-500" />
                    <span className="text-[10px] text-green-400 font-bold tracking-widest">{decryptText}</span>
                </div>
                
                <h1 className="text-3xl font-black uppercase tracking-tighter mb-2 text-white glitch-text">
                    SECURE GATEWAY
                </h1>
                <p className="text-gray-500 text-xs uppercase tracking-widest">
                    Shared by: <span className="text-white font-bold">{referrerName || 'Anonymous'}</span>
                </p>
            </div>

            <div className="w-full max-w-md space-y-6 z-10">
                
                {/* 1. Main Locker Box */}
                <div className="bg-[#111] border border-white/10 rounded-xl p-1 relative shadow-2xl">
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-green-500 to-transparent opacity-50"></div>
                    
                    <div className="bg-[#0a0a0a] rounded-lg p-6 text-center">
                        <AnimatePresence mode="wait">
                            {!canProceed ? (
                                <motion.div 
                                    key="wait"
                                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                                    className="py-4"
                                >
                                    <div className="w-16 h-16 rounded-full border-4 border-white/10 border-t-green-500 animate-spin mx-auto mb-4"></div>
                                    <h3 className="text-lg font-bold text-white mb-2">Analyzing Request...</h3>
                                    <p className="text-gray-500 text-xs">Scanning for threats. Please wait {timer}s.</p>
                                </motion.div>
                            ) : (
                                <motion.div 
                                    key="proceed"
                                    initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
                                    className="py-2"
                                >
                                    <div className="w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-4 border border-green-500/30 shadow-[0_0_20px_rgba(34,197,94,0.2)]">
                                        <ShieldCheck size={32} className="text-green-500" />
                                    </div>
                                    <h3 className="text-xl font-bold text-white mb-1">Link Decrypted</h3>
                                    <p className="text-gray-400 text-xs mb-6">Destination is safe. Click below to proceed.</p>
                                    
                                    <button 
                                        onClick={handleClickAd}
                                        className="w-full py-4 bg-green-600 text-white font-black uppercase rounded-lg hover:bg-green-500 transition shadow-lg flex items-center justify-center gap-2 group animate-pulse"
                                    >
                                        <Download size={18} className="group-hover:animate-bounce"/> GET ACCESS
                                    </button>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </div>

                {/* 2. Banner Ad Placement (To monetize the wait time) */}
                <div className="relative">
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[#050505] px-2 text-[9px] text-gray-600 font-bold uppercase tracking-widest z-10">
                        Sponsored
                    </div>
                    <SmartAd type="banner" className="border border-white/5 bg-[#111] p-2 rounded-xl" />
                </div>
            </div>

            <div className="mt-auto py-8 text-center opacity-30">
                <p className="text-[9px] text-gray-500 font-mono uppercase">Encrypted by Naxxivo Protocol v4.0</p>
            </div>
            
            <style>{`
                .glitch-text { text-shadow: 2px 0 #00ff00, -2px 0 #ff0000; }
            `}</style>
        </div>
    );
};

export default PublicEarnPage;
