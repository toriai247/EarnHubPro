
import React, { useState, useEffect } from 'react';
import GoogleAd from './GoogleAd';
import { ExternalLink, PlayCircle, Loader2, Sparkles, Zap } from 'lucide-react';
import { supabase } from '../integrations/supabase/client';
import { updateWallet, createTransaction } from '../lib/actions';
import { useUI } from '../context/UIContext';
import { motion, AnimatePresence } from 'framer-motion';

// --- AD NETWORK CONFIGURATION ---
interface AdLink {
    url: string;
    network: 'adsterra' | 'monetag' | 'cpa';
}

const HIGH_CPM_LINKS: AdLink[] = [
    { url: 'https://www.effectivegatecpm.com/c3x9dphj?key=4805226fe4883d45030d7fd83d992710', network: 'adsterra' },
    // { url: 'https://monetag.com/example', network: 'monetag' },
];

interface SmartAdProps {
    slot: string; // Google AdSlot ID
    format?: string;
    height?: string;
    className?: string;
}

const SmartAd: React.FC<SmartAdProps> = ({ slot, format = 'auto', height = '100px', className = '' }) => {
    const { toast } = useUI();
    const [adType, setAdType] = useState<'google' | 'direct'>('google');
    const [activeAd, setActiveAd] = useState<AdLink | null>(null);
    const [loading, setLoading] = useState(false);
    const [key, setKey] = useState(0); 

    useEffect(() => {
        // Strategy: 
        // 50% chance to show Google Ad (Safe, clean)
        // 50% chance to show High CPM Direct Link Button (User Initiated = Safe from bans)
        const isDirect = Math.random() < 0.5;
        rotateAd(isDirect ? 'direct' : 'google');
    }, []);

    const rotateAd = (forcedType?: 'google' | 'direct') => {
        const nextType = forcedType || (Math.random() < 0.6 ? 'google' : 'direct');
        setAdType(nextType);
        
        if (nextType === 'direct') {
            const randomIndex = Math.floor(Math.random() * HIGH_CPM_LINKS.length);
            setActiveAd(HIGH_CPM_LINKS[randomIndex]);
        }
        setKey(prev => prev + 1);
    };

    const handleDirectClick = async () => {
        if (loading || !activeAd) return;
        setLoading(true);

        // 1. Open the Ad Network Link in new tab
        window.open(activeAd.url, '_blank');

        try {
            const { data: { session } } = await supabase.auth.getSession();
            const userId = session?.user?.id;

            // 2. Log Click for Analytics
            await supabase.from('ad_interactions').insert({
                network: activeAd.network,
                ad_unit_id: activeAd.url,
                action_type: 'click',
                user_id: userId || null
            });

            if (userId) {
                // 3. Reward User (Incentivized Traffic)
                const rewardAmount = 0.01; 
                await updateWallet(userId, rewardAmount, 'increment', 'earning_balance');
                // Silent log to avoid database bloat, or keep simple log
                // await createTransaction(userId, 'earn', rewardAmount, 'Sponsored Ad Visit');
                toast.success(`Bonus +৳${rewardAmount} added!`);
            }
        } catch (e) {
            console.error("Ad log error", e);
        } finally {
            setLoading(false);
            // 4. Switch back to Google Ad after click to look natural/safe
            setTimeout(() => rotateAd('google'), 500);
        }
    };

    return (
        <div className={`my-6 ${className}`}>
            <AnimatePresence mode="wait">
                <motion.div
                    key={key}
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -5 }}
                    transition={{ duration: 0.3 }}
                    className="relative overflow-hidden rounded-xl border border-white/5 bg-[#0a0a0a] shadow-md group"
                >
                    {/* Label */}
                    <div className="absolute top-0 right-0 bg-white/5 px-2 py-0.5 rounded-bl-lg text-[9px] font-bold text-gray-600 z-10 border-b border-l border-white/5 uppercase tracking-wider">
                        Sponsored
                    </div>

                    {adType === 'google' ? (
                        <div className="min-h-[100px] flex items-center justify-center bg-black/20">
                            <GoogleAd slot={slot} format={format} className="!my-0 !border-0 !bg-transparent w-full" />
                        </div>
                    ) : (
                        <div 
                            onClick={handleDirectClick}
                            className="relative cursor-pointer min-h-[120px] flex flex-col items-center justify-center p-4 text-center hover:bg-white/5 transition-colors group"
                        >
                            {/* Animated Background Gradient */}
                            <div className="absolute inset-0 bg-gradient-to-r from-emerald-600/5 to-blue-600/5 opacity-30 group-hover:opacity-60 transition-opacity"></div>
                            
                            <div className="relative z-10 flex items-center gap-4">
                                <div className="p-3 bg-gradient-to-br from-emerald-500 to-blue-600 rounded-full shadow-[0_0_15px_rgba(16,185,129,0.3)] animate-pulse-slow">
                                    {loading ? <Loader2 className="animate-spin text-white" size={24} /> : <Zap className="text-white fill-white" size={24} />}
                                </div>
                                <div className="text-left">
                                    <h4 className="text-white font-bold text-sm flex items-center gap-2">
                                        Special Offer Available <ExternalLink size={12} className="text-gray-400"/>
                                    </h4>
                                    <p className="text-[10px] text-gray-400 mt-0.5 max-w-[200px] leading-tight">
                                        View this sponsor to unlock a bonus reward instantly.
                                    </p>
                                    <div className="mt-1.5 inline-flex items-center gap-1 text-[9px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                                        <Sparkles size={8} /> +৳0.01 Reward
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </motion.div>
            </AnimatePresence>
        </div>
    );
};

export default SmartAd;
