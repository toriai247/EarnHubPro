
import React, { useState, useEffect } from 'react';
import GoogleAd from './GoogleAd';
import { ExternalLink, Zap, Gift, CheckCircle2 } from 'lucide-react';
import { supabase } from '../integrations/supabase/client';
import { updateWallet } from '../lib/actions';
import { useUI } from '../context/UIContext';
import { motion, AnimatePresence } from 'framer-motion';

// --- AD NETWORK CONFIGURATION ---
// Add your Direct Links here (Adsterra, Monetag, etc.)
const DIRECT_LINKS = [
    { url: 'https://www.effectivegatecpm.com/c3x9dphj?key=4805226fe4883d45030d7fd83d992710', label: 'Adsterra Offer' },
    // { url: 'YOUR_MONETAG_DIRECT_LINK', label: 'Monetag Deal' } 
];

interface SmartAdProps {
    slot: string; // Google AdSlot ID
    format?: string;
    height?: string;
    className?: string;
}

const SmartAd: React.FC<SmartAdProps> = ({ slot, format = 'horizontal', className = '' }) => {
    const { toast } = useUI();
    const [mode, setMode] = useState<'google' | 'direct'>('direct'); // Default to 'direct' to avoid blank google ads initially
    const [activeLink, setActiveLink] = useState(DIRECT_LINKS[0]);
    const [isClicked, setIsClicked] = useState(false);

    useEffect(() => {
        // Randomly decide whether to show Google Ad or Direct Link
        // 70% chance for Direct Link (Higher earnings, less blank space)
        // 30% chance for Google Ad
        const random = Math.random();
        if (random > 0.7) {
            setMode('google');
        } else {
            setMode('direct');
            const randomLink = DIRECT_LINKS[Math.floor(Math.random() * DIRECT_LINKS.length)];
            setActiveLink(randomLink);
        }
    }, []);

    const handleDirectClick = async () => {
        if (isClicked) return; // Prevent double clicks
        
        // 1. Open Link Immediately
        window.open(activeLink.url, '_blank');
        setIsClicked(true);

        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (session) {
                // 2. Reward User (0.01 TK)
                const rewardAmount = 0.01; 
                await updateWallet(session.user.id, rewardAmount, 'increment', 'earning_balance');
                
                // Track click internally if needed
                await supabase.from('ad_interactions').insert({
                    network: 'direct',
                    ad_unit_id: activeLink.url,
                    action_type: 'click',
                    user_id: session.user.id
                });

                toast.success(`Ad Bonus: +৳${rewardAmount} added!`);
            }
        } catch (e) {
            console.error("Ad reward error", e);
        }

        // Reset after 5 seconds so they can click again if ad rotates
        setTimeout(() => {
            setIsClicked(false);
            // Rotate to a new ad visual
            setMode(Math.random() > 0.5 ? 'google' : 'direct');
        }, 5000);
    };

    return (
        <div className={`w-full overflow-hidden my-2 ${className}`}>
            <AnimatePresence mode="wait">
                {mode === 'google' ? (
                    <motion.div
                        key="google"
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="min-h-[60px] bg-[#111] rounded-lg flex items-center justify-center border border-white/5"
                    >
                        <GoogleAd slot={slot} format={format} responsive="true" className="!my-0 !w-full" />
                    </motion.div>
                ) : (
                    <motion.div
                        key="direct"
                        initial={{ opacity: 0, scale: 0.98 }} 
                        animate={{ opacity: 1, scale: 1 }} 
                        exit={{ opacity: 0, scale: 0.98 }}
                        onClick={handleDirectClick}
                        className="relative cursor-pointer group"
                    >
                        {/* Compact Banner Layout */}
                        <div className="flex items-center justify-between bg-gradient-to-r from-emerald-900/40 to-[#111] border border-emerald-500/20 rounded-lg p-2.5 shadow-sm hover:border-emerald-500/40 transition-all">
                            
                            {/* Left: Icon & Text */}
                            <div className="flex items-center gap-3 overflow-hidden">
                                <div className={`w-10 h-10 rounded flex items-center justify-center shrink-0 ${isClicked ? 'bg-green-500 text-black' : 'bg-emerald-500/10 text-emerald-400 animate-pulse'}`}>
                                    {isClicked ? <CheckCircle2 size={20}/> : <Gift size={20} />}
                                </div>
                                <div className="flex flex-col justify-center">
                                    <h4 className="text-sm font-bold text-white leading-tight truncate">
                                        {isClicked ? 'Bonus Claimed!' : 'Special Offer Available'}
                                    </h4>
                                    <div className="flex items-center gap-1.5 mt-0.5">
                                        <span className="text-[10px] bg-yellow-500/10 text-yellow-500 px-1.5 rounded border border-yellow-500/20 font-bold">
                                            +৳0.01
                                        </span>
                                        <span className="text-[10px] text-gray-500 truncate">
                                            Tap to claim reward
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Right: CTA Button */}
                            <div className="pl-2">
                                <div className="bg-white text-black text-[10px] font-black py-1.5 px-3 rounded uppercase tracking-wider group-hover:bg-gray-200 transition flex items-center gap-1">
                                    {isClicked ? 'OPENED' : 'VISIT'} <ExternalLink size={10} />
                                </div>
                            </div>
                        </div>

                        {/* "Sponsored" Label */}
                        <div className="absolute top-0 right-0 text-[8px] text-gray-600 bg-black/40 px-1 rounded-bl">
                            AD
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default SmartAd;
