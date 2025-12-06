
import React, { useState, useEffect } from 'react';
import { Gift, X, Check, Lock, Zap, Calendar, Sparkles } from 'lucide-react';
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
    const [rewards, setRewards] = useState<number[]>([0.10, 0.20, 0.30, 0.40, 0.50, 0.75, 1.00]);

    useEffect(() => {
        fetchConfig();
        checkStatus();
    }, [userId]);

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
        const status = await checkDailyBonus(userId);
        setCurrentDay(status.streak);
        setCanClaim(status.canClaim);
        
        // Auto-open if claim available
        if (status.canClaim) {
            setTimeout(() => setIsOpen(true), 1500);
        }
    };

    const handleClaim = async () => {
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
            setCanClaim(false);
            
            // Wait a bit then close
            setTimeout(() => setIsOpen(false), 3000); 
        } catch (e: any) {
            toast.error("Failed to claim: " + e.message);
        } finally {
            setLoading(false);
        }
    };

    // Calculate progress percentage (1 to 7)
    const progress = Math.min(100, ((currentDay - 1) / 6) * 100);

    // Manual trigger button if user closed modal but can still claim
    if (!isOpen && canClaim) {
        return (
            <motion.button
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                onClick={() => setIsOpen(true)}
                className="w-full bg-gradient-to-r from-purple-600 to-blue-600 p-3 rounded-xl flex items-center justify-between shadow-lg mb-4 border border-white/20 relative overflow-hidden group"
            >
                <div className="absolute inset-0 bg-white/20 translate-x-[-100%] group-hover:animate-shimmer skew-x-12"></div>
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-white/20 rounded-full animate-bounce-subtle">
                        <Gift className="text-white" size={20} />
                    </div>
                    <div className="text-left">
                        <p className="text-white font-black text-sm uppercase">Daily Reward Ready!</p>
                        <p className="text-white/80 text-[10px] font-bold">Tap to claim Day {currentDay}</p>
                    </div>
                </div>
                <div className="bg-white text-purple-600 px-3 py-1 rounded-lg text-xs font-black uppercase">
                    Claim
                </div>
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
                        onClick={() => !loading && setIsOpen(false)}
                    />

                    {/* Modal Card */}
                    <motion.div 
                        initial={{ scale: 0.8, y: 50, opacity: 0, rotateX: 20 }}
                        animate={{ scale: 1, y: 0, opacity: 1, rotateX: 0 }}
                        exit={{ scale: 0.8, y: 50, opacity: 0 }}
                        transition={{ type: "spring", damping: 25, stiffness: 300 }}
                        className="bg-[#0a0a0a] w-full max-w-sm rounded-[32px] border border-white/10 overflow-hidden relative shadow-2xl perspective-1000"
                    >
                        {/* Header Background FX */}
                        <div className="absolute top-0 left-0 right-0 h-48 bg-gradient-to-b from-purple-600/20 via-blue-600/10 to-transparent pointer-events-none"></div>
                        <div className="absolute -top-20 -right-20 w-64 h-64 bg-purple-500/20 blur-[80px] rounded-full"></div>
                        <div className="absolute -top-20 -left-20 w-64 h-64 bg-blue-500/20 blur-[80px] rounded-full"></div>

                        <button 
                            onClick={() => setIsOpen(false)} 
                            className="absolute top-4 right-4 bg-white/5 hover:bg-white/10 p-2 rounded-full text-white/50 hover:text-white transition z-20"
                        >
                            <X size={20}/>
                        </button>

                        <div className="pt-8 pb-4 px-6 text-center relative z-10">
                            <motion.div 
                                animate={{ 
                                    y: [0, -10, 0],
                                    rotate: [0, 5, -5, 0]
                                }}
                                transition={{ repeat: Infinity, duration: 4 }}
                                className="w-24 h-24 mx-auto mb-4 relative"
                            >
                                <div className="absolute inset-0 bg-gradient-to-br from-yellow-300 to-orange-500 rounded-3xl blur-xl opacity-40"></div>
                                <div className="w-full h-full bg-gradient-to-br from-yellow-400 to-orange-600 rounded-3xl flex items-center justify-center shadow-lg border-2 border-white/20 relative z-10">
                                    <Gift size={48} className="text-white drop-shadow-md" />
                                </div>
                                <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 bg-red-600 text-white text-[10px] font-black px-3 py-1 rounded-full border-4 border-[#0a0a0a] shadow-lg whitespace-nowrap">
                                    DAY {currentDay}
                                </div>
                            </motion.div>
                            
                            <h2 className="text-3xl font-black text-white uppercase tracking-tight mb-1">
                                <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400">Daily</span> Bonus
                            </h2>
                            <p className="text-gray-400 text-xs font-medium">
                                Keep your streak alive to unlock the <span className="text-yellow-400 font-bold">Mega Jackpot</span>!
                            </p>
                        </div>

                        {/* Progress Bar */}
                        <div className="px-6 mb-6">
                            <div className="flex justify-between text-[10px] font-bold text-gray-500 uppercase mb-2">
                                <span>Streak Progress</span>
                                <span>{currentDay}/7 Days</span>
                            </div>
                            <div className="h-3 w-full bg-white/5 rounded-full overflow-hidden border border-white/5">
                                <motion.div 
                                    initial={{ width: 0 }}
                                    animate={{ width: `${progress}%` }}
                                    transition={{ duration: 1, ease: "easeOut" }}
                                    className="h-full bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 rounded-full shadow-[0_0_15px_rgba(168,85,247,0.6)] relative"
                                >
                                    <div className="absolute inset-0 bg-white/20 animate-shimmer-fast w-full h-full"></div>
                                </motion.div>
                            </div>
                        </div>

                        {/* Calendar Grid */}
                        <div className="px-4 pb-4 grid grid-cols-4 gap-2">
                            {rewards.map((reward, idx) => {
                                const day = idx + 1;
                                let status = 'locked';
                                if (day < currentDay) status = 'claimed';
                                if (day === currentDay) status = canClaim ? 'current' : 'claimed';
                                
                                const isBig = day === 7;

                                return (
                                    <motion.div 
                                        key={day}
                                        whileHover={status === 'current' ? { scale: 1.05 } : {}}
                                        className={`relative rounded-2xl flex flex-col items-center justify-center aspect-[4/5] border transition-all overflow-hidden group ${
                                            status === 'current' 
                                            ? 'bg-gradient-to-br from-blue-600/40 to-purple-600/40 border-blue-400/50 shadow-[0_0_20px_rgba(59,130,246,0.3)] z-10' 
                                            : status === 'claimed'
                                            ? 'bg-green-500/10 border-green-500/30 opacity-70'
                                            : 'bg-white/5 border-white/5 opacity-40'
                                        } ${isBig ? 'col-span-2 aspect-auto flex-row gap-4 bg-gradient-to-r from-yellow-500/20 to-orange-500/20 border-yellow-500/30 opacity-100' : ''}`}
                                    >
                                        <div className="absolute top-2 left-2 text-[8px] font-black text-white/40 uppercase">Day {day}</div>
                                        
                                        {status === 'claimed' && (
                                            <div className="absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-[1px] z-20">
                                                <div className="bg-green-500 rounded-full p-1 shadow-lg shadow-green-500/40">
                                                    <Check size={14} className="text-black stroke-[4px]" />
                                                </div>
                                            </div>
                                        )}

                                        {status === 'locked' && !isBig && (
                                            <div className="absolute inset-0 flex items-center justify-center z-0 opacity-20">
                                                <Lock size={20} />
                                            </div>
                                        )}
                                        
                                        {isBig ? (
                                            <>
                                                <div className="w-10 h-10 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-xl flex items-center justify-center shadow-lg shadow-yellow-500/20">
                                                    <Zap size={20} className="text-white fill-white" />
                                                </div>
                                                <div className="text-left">
                                                    <div className="text-[8px] text-yellow-400 font-bold uppercase tracking-wider flex items-center gap-1">
                                                        <Sparkles size={8}/> Grand Prize
                                                    </div>
                                                    <div className="text-lg font-black text-white"><BalanceDisplay amount={reward} compact/></div>
                                                </div>
                                            </>
                                        ) : (
                                            <div className="mt-4 text-sm font-bold text-white">
                                                <BalanceDisplay amount={reward} compact />
                                            </div>
                                        )}
                                    </motion.div>
                                )
                            })}
                        </div>

                        {/* Action Button */}
                        <div className="p-6 pt-2">
                            <button 
                                onClick={handleClaim}
                                disabled={!canClaim || loading}
                                className={`w-full py-4 rounded-2xl font-black text-sm uppercase tracking-wider shadow-xl transition-all relative overflow-hidden group ${
                                    canClaim 
                                    ? 'bg-white text-black hover:scale-[1.02] active:scale-[0.98] shadow-white/20' 
                                    : 'bg-white/10 text-gray-500 cursor-not-allowed'
                                }`}
                            >
                                {canClaim && <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/50 to-transparent translate-x-[-100%] group-hover:animate-shimmer" />}
                                {loading ? 'Processing...' : canClaim ? 'Claim Reward' : 'Come Back Tomorrow'}
                            </button>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};

export default DailyBonus;
