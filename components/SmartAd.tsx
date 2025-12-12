
import React, { useState, useEffect } from 'react';
import { ExternalLink, Zap, Gift, CheckCircle2, Star, Sparkles, TrendingUp } from 'lucide-react';
import { supabase } from '../integrations/supabase/client';
import { updateWallet } from '../lib/actions';
import { useUI } from '../context/UIContext';
import { motion, AnimatePresence } from 'framer-motion';

// --- AD NETWORK CONFIGURATION ---
// Using your provided Adsterra Direct Link
const DIRECT_LINKS = [
    { 
        url: 'https://www.effectivegatecpm.com/c3x9dphj?key=4805226fe4883d45030d7fd83d992710', 
        label: 'High Paying Offer', 
        sub: 'Limited Time Bonus', 
        color: 'from-purple-600 to-blue-600' 
    },
    { 
        url: 'https://www.effectivegatecpm.com/c3x9dphj?key=4805226fe4883d45030d7fd83d992710', 
        label: 'Claim Daily Drop', 
        sub: 'Instant Reward', 
        color: 'from-emerald-600 to-teal-600' 
    },
    { 
        url: 'https://www.effectivegatecpm.com/c3x9dphj?key=4805226fe4883d45030d7fd83d992710', 
        label: 'Sponsored Task', 
        sub: 'Click to Complete', 
        color: 'from-orange-600 to-red-600' 
    },
];

const ADSTERRA_BANNER_IMG = "https://landings-cdn.adsterratech.com/referralBanners/gif/468x60_adsterra_reff.gif";
const ADSTERRA_REF_LINK = "https://beta.publishers.adsterra.com/referral/R8fkj7ZJZA";

interface SmartAdProps {
    slot?: string; 
    format?: string;
    className?: string;
    type?: 'default' | 'banner'; 
}

const SmartAd: React.FC<SmartAdProps> = ({ className = '', type = 'default' }) => {
    const { toast } = useUI();
    const [activeLink, setActiveLink] = useState(DIRECT_LINKS[0]);
    const [isClicked, setIsClicked] = useState(false);
    const [isAdmin, setIsAdmin] = useState(false);

    useEffect(() => {
        // Rotate content on mount to show different offers, though URL is the same
        const randomLink = DIRECT_LINKS[Math.floor(Math.random() * DIRECT_LINKS.length)];
        setActiveLink(randomLink);
        
        // Check Admin Status to prevent self-clicks
        const checkAdmin = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (session) {
                const { data } = await supabase.from('profiles').select('role, admin_user').eq('id', session.user.id).single();
                if (data && (data.role === 'admin' || data.admin_user)) {
                    setIsAdmin(true);
                }
            }
        };
        checkAdmin();
    }, []);

    const handleDirectClick = async (url: string) => {
        if (isAdmin) {
            toast.info("Admin Mode: Ad interaction disabled to prevent account ban.");
            return;
        }

        if (isClicked) return; // Prevent double clicks
        
        // 1. Open Link Immediately (New Tab)
        window.open(url, '_blank');
        setIsClicked(true);

        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (session) {
                // 2. Reward User (0.01 TK) - Small reward keeps users happy and CTR high
                const rewardAmount = 0.01; 
                await updateWallet(session.user.id, rewardAmount, 'increment', 'earning_balance');
                
                // Track click internally for analytics
                // Note: Ensure 'ad_interactions' table exists via Database Ultra SQL
                await supabase.from('ad_interactions').insert({
                    network: 'adsterra',
                    ad_unit_id: url,
                    action_type: 'click',
                    user_id: session.user.id
                });

                toast.success(`Bonus: +৳${rewardAmount} added!`);
            }
        } catch (e) {
            console.error("Ad reward error", e);
        }

        // Reset after 10 seconds so they can click again if ad rotates
        setTimeout(() => {
            setIsClicked(false);
            const randomLink = DIRECT_LINKS[Math.floor(Math.random() * DIRECT_LINKS.length)];
            setActiveLink(randomLink);
        }, 10000);
    };

    // --- BANNER MODE (Adsterra Referral) ---
    if (type === 'banner') {
        return (
            <div className={`flex justify-center my-4 ${className}`}>
                 <a 
                    href={isAdmin ? '#' : ADSTERRA_REF_LINK} 
                    target={isAdmin ? '_self' : '_blank'} 
                    rel="nofollow" 
                    onClick={(e) => {
                        if (isAdmin) { e.preventDefault(); toast.info("Admin Mode: Banner Link disabled"); }
                        else handleDirectClick(ADSTERRA_REF_LINK);
                    }}
                    className="hover:opacity-80 transition opacity-100"
                >
                    <img src={ADSTERRA_BANNER_IMG} alt="Partner" className="rounded-lg border border-white/10 shadow-lg max-w-full h-auto" />
                 </a>
            </div>
        );
    }

    // --- DEFAULT MODE (Direct Link Offer Button) ---
    return (
        <div className={`w-full my-4 ${className}`}>
            <AnimatePresence mode="wait">
                <motion.div
                    key={activeLink.label + isClicked}
                    initial={{ opacity: 0, scale: 0.98 }} 
                    animate={{ opacity: 1, scale: 1 }} 
                    exit={{ opacity: 0, scale: 0.98 }}
                    onClick={() => handleDirectClick(activeLink.url)}
                    className={`relative cursor-pointer group rounded-xl p-4 shadow-lg border border-white/10 overflow-hidden bg-gradient-to-r ${isClicked ? 'from-gray-800 to-gray-900' : activeLink.color}`}
                >
                    {/* Shine Effect (Disabled for Admin) */}
                    {!isClicked && !isAdmin && <div className="absolute inset-0 bg-white/10 skew-x-12 translate-x-[-100%] group-hover:animate-shimmer pointer-events-none"></div>}

                    <div className="relative z-10 flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center shadow-inner ${isClicked ? 'bg-green-500 text-white' : 'bg-white text-black'}`}>
                                {isClicked ? <CheckCircle2 size={24}/> : <TrendingUp size={24} className="fill-current"/>}
                            </div>
                            <div>
                                <h4 className="font-black text-white text-sm sm:text-base leading-tight flex items-center gap-2">
                                    {isClicked ? 'Reward Claimed!' : activeLink.label}
                                    {isAdmin && <span className="text-[9px] bg-red-500/20 text-red-400 px-1.5 py-0.5 rounded border border-red-500/30 font-mono">ADMIN VIEW</span>}
                                </h4>
                                <div className="flex items-center gap-2 mt-0.5">
                                    {!isClicked && (
                                        <span className="text-[10px] bg-black/30 px-2 py-0.5 rounded text-white font-bold backdrop-blur-sm border border-white/10">
                                            +৳0.01
                                        </span>
                                    )}
                                    <span className="text-xs text-white/80 font-medium">
                                        {isClicked ? 'Check your wallet' : activeLink.sub}
                                    </span>
                                </div>
                            </div>
                        </div>

                        <div className="bg-white/20 p-2 rounded-full backdrop-blur-md group-hover:bg-white/30 transition shadow-sm">
                            <ExternalLink size={18} className="text-white"/>
                        </div>
                    </div>
                </motion.div>
            </AnimatePresence>
        </div>
    );
};

export default SmartAd;
