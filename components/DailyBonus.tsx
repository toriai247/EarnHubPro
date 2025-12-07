
import React, { useState, useEffect } from 'react';
import { Gift, X, Check, Lock, Zap, Calendar, Sparkles, Clock, Loader2 } from 'lucide-react';
import { useUI } from '../context/UIContext';
import { claimDailyBonus, checkDailyBonus } from '../lib/actions';
import BalanceDisplay from './BalanceDisplay';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../integrations/supabase/client';
import confetti from 'canvas-confetti';

interface DailyBonusProps {
    userId: string;
}

const DailyBonus: React.FC<DailyBonusProps> = ({ userId }) => {
    const { toast } = useUI();
    const [isOpen, setIsOpen] = useState(false);
    const [currentDay, setCurrentDay] = useState(1);
    const [canClaim, setCanClaim] = useState(false);
    const [loading, setLoading] = useState(false);
    const [nextClaimTime, setNextClaimTime] = useState<number | null>(null);
    const [timeRemaining, setTimeRemaining] = useState('');
    const [rewards, setRewards] = useState<number[]>([0.10, 0.20, 0.30, 0.40, 0.50, 0.75, 1.00]);

    useEffect(() => {
        fetchConfig();
        checkStatus();
    }, [userId]);

    // Timer countdown
    useEffect(() => {
        if (!nextClaimTime) return;
        const interval = setInterval(() => {
            const now = Date.now();
            const diff = nextClaimTime - now;
            if (diff <= 0) {
                setTimeRemaining("Ready!");
                setCanClaim(true);
                setNextClaimTime(null);
                clearInterval(interval);
            } else {
                const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
                const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
                const seconds = Math.floor((diff % (1000 * 60)) / 1000);
                setTimeRemaining(`${hours}h ${minutes}m ${seconds}s`);
            }
        }, 1000);
        return () => clearInterval(interval);
    }, [nextClaimTime]);

    const fetchConfig = async () => {
        const { data } = await supabase.from('daily_bonus_config').select('*').order('day');
        if (data && data.length > 0) {
            const newRewards = Array(7).fill(0.10);
            data.forEach((c: any) => {
                if (c.day >= 1 && c.day <= 7) newRewards[c.day - 1] = c.reward_amount;
            });
            setRewards(newRewards);
        }
    };

    const checkStatus = async () => {
        setLoading(true);
        const status = await checkDailyBonus(userId);
        setCurrentDay(status.streak);
        setCanClaim(status.canClaim);
        setNextClaimTime(status.nextClaim);
        
        // Only open automatically if user hasn't claimed AND hasn't closed it this session
        // Using session storage to remember "closed" state for this browser session
        const hasClosed = sessionStorage.getItem('daily_bonus_closed');
        if (status.canClaim && !hasClosed) {
            setIsOpen(true);
        }
        setLoading(false);
    };

    const handleClose = () => {
        setIsOpen(false);
        sessionStorage.setItem('daily_bonus_closed', 'true');
    };

    const handleClaim = async () => {
        if (!canClaim) return;
        setLoading(true);
        try {
            await claimDailyBonus(userId, currentDay);
            
            // Confetti Effect
            confetti({
                particleCount: 150,
                spread: 100,
                origin: { y: 0.6 },
                colors: ['#00ff99', '#00ccff', '#ff00cc'],
                zIndex: 9999
            });

            toast.success(`Claimed Day ${currentDay} Reward!`);
            
            // Update local state immediately
            setCanClaim(false);
            
            // Set next claim time to tomorrow midnight approx
            const now = new Date();
            const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
            setNextClaimTime(tomorrow.getTime());

            // Wait a bit then close
            setTimeout(() => setIsOpen(false), 2000); 
        } catch (e: any) {
            toast.error(e.message || "Failed to claim");
        } finally {
            setLoading(false);
        }
    };

    // Calculate progress percentage (1 to 7)
    const progress = Math.min(100, ((currentDay - 1) / 6) * 100);

    // Manual trigger button if closed
    if (!isOpen) {
        return (
            <motion.button
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                onClick={() => setIsOpen(true)}
                className={`w-full p-3 rounded-xl flex items-center justify-between shadow-lg mb-4 border relative overflow-hidden group transition-all ${
                    canClaim 
                    ? 'bg-gradient-to-r from-purple-600 to-blue-600 border-white/20' 
                    : 'bg-[#111] border-white/5 opacity-80'
                }`}
            >
                {canClaim && <div className="absolute inset-0 bg-white/20 translate-x-[-100%] group-hover:animate-shimmer skew-x-12"></div>}
                
                <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-full ${canClaim ? 'bg-white/20 animate-bounce-subtle' : 'bg-white/5'}`}>
                        <Gift className={canClaim ? 'text-white' : 'text-gray-500'} size={20} />
                    </div>
                    <div className="text-left">
                        <p className={`font-black text-sm uppercase ${canClaim ? 'text-white' : 'text-gray-400'}`}>
                            {canClaim ? 'Daily Reward' : 'Next Reward'}
                        </p>
                        <p className={`${canClaim ? 'text-white/80' : 'text-gray-600'} text-[10px] font-bold`}>
                            {canClaim ? `Claim Day ${currentDay} Now!` : `Available in: ${timeRemaining}`}
                        </p>
                    </div>
                </div>
                
                {canClaim && (
                    <div className="bg-white text-purple-600 px-3 py-1 rounded-lg text-xs font-black uppercase shadow-sm">
                        Claim
                    </div>
                )}
            </motion.button>
        );
    }

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    {/* Backdrop */}
                    <motion.div 
                        initial={{ opacity: 0 }} 
                        animate={{ opacity: 1 }} 
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 bg-black/80 backdrop-blur-md"
                        onClick={handleClose}
                    />

                    {/* Modal Card */}
                    <motion.div 
                        initial={{ scale: 0.8, y: 50, opacity: 0 }}
                        animate={{ scale: 1, y: 0, opacity: 1 }}
                        exit={{ scale: 0.8, y: 50, opacity: 0 }}
                        className="bg-[#0a0a0a] w-full max-w-sm rounded-[32px] border border-white/10 overflow-hidden relative shadow-2xl"
                    >
                        {/* Header Background FX */}
                        <div className="absolute top-0 left-0 right-0 h-48 bg-gradient-to-b from-purple-600/20 via-blue-600/10 to-transparent pointer-events-none"></div>

                        <button 
                            onClick={handleClose} 
                            className="absolute top-4 right-4 bg-white/5 hover:bg-white/10 p-2 rounded-full text-white/50 hover:text-white transition z-20"
                        >
                            <X size={20}/>
                        </button>

                        <div className="pt-8 pb-4 px-6 text-center relative z-10">
                            <motion.div 
                                animate={canClaim ? { y: [0, -5, 0] } : {}}
                                transition={{ repeat: Infinity, duration: 2 }}
                                className="w-20 h-20 mx-auto mb-3 relative"
                            >
                                <div className={`w-full h-full rounded-2xl flex items-center justify-center shadow-lg border-2 border-white/10 relative z-10 ${canClaim ? 'bg-gradient-to-br from-purple-500 to-blue-500' : 'bg-white/5'}`}>
                                    <Gift size={40} className="text-white drop-shadow-md" />
                                </div>
                                {canClaim && (
                                    <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-green-500 text-black text-[9px] font-black px-2 py-0.5 rounded-full shadow-lg whitespace-nowrap">
                                        READY
                                    </div>
                                )}
                            </motion.div>
                            
                            <h2 className="text-2xl font-black text-white uppercase tracking-tight mb-1">
                                Daily <span className="text-purple-400">Bonus</span>
                            </h2>
                            <p className="text-gray-400 text-xs">
                                Day {currentDay} of 7
                            </p>
                        </div>

                        {/* Calendar Grid */}
                        <div className="px-4 pb-4 grid grid-cols-4 gap-2">
                            {rewards.map((reward, idx) => {
                                const day = idx + 1;
                                let status = 'locked';
                                if (day < currentDay) status = 'claimed';
                                if (day === currentDay) status = canClaim ? 'current' : 'claimed';
                                // Logic check: if we just claimed, the streak might not update in UI instantly without re-fetch, but 'canClaim' handles it.
                                
                                const isBig = day === 7;

                                return (
                                    <div 
                                        key={day}
                                        className={`relative rounded-xl flex flex-col items-center justify-center aspect-[4/5] border transition-all overflow-hidden ${
                                            status === 'current' 
                                            ? 'bg-gradient-to-br from-blue-600/30 to-purple-600/30 border-blue-400/50 shadow-[0_0_15px_rgba(59,130,246,0.2)]' 
                                            : status === 'claimed'
                                            ? 'bg-green-500/10 border-green-500/30'
                                            : 'bg-white/5 border-white/5 opacity-50'
                                        } ${isBig ? 'col-span-1 border-yellow-500/30 bg-yellow-500/10' : ''}`}
                                    >
                                        <div className="absolute top-1 left-2 text-[8px] font-black text-white/30">D{day}</div>
                                        
                                        {status === 'claimed' && (
                                            <div className="absolute inset-0 flex items-center justify-center bg-black/60 z-20">
                                                <Check size={16} className="text-green-500 stroke-[3px]" />
                                            </div>
                                        )}

                                        {isBig ? <Zap size={16} className="text-yellow-400 mb-1"/> : <span className="text-xs font-bold text-white mb-1"><BalanceDisplay amount={reward} compact /></span>}
                                    </div>
                                )
                            })}
                        </div>

                        {/* Action Button */}
                        <div className="p-6 pt-2">
                            <button 
                                onClick={handleClaim}
                                disabled={!canClaim || loading}
                                className={`w-full py-4 rounded-2xl font-black text-sm uppercase tracking-wider shadow-xl transition-all relative overflow-hidden group flex items-center justify-center gap-2 ${
                                    canClaim 
                                    ? 'bg-white text-black hover:scale-[1.02] active:scale-[0.98] shadow-white/20' 
                                    : 'bg-white/10 text-gray-500 cursor-not-allowed'
                                }`}
                            >
                                {loading ? <Loader2 className="animate-spin" size={16}/> : canClaim ? 'CLAIM REWARD' : timeRemaining}
                            </button>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};

export default DailyBonus;
