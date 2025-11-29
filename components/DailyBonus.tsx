

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Gift, Check, X, Calendar } from 'lucide-react';
import GlassCard from './GlassCard';
import { useUI } from '../context/UIContext';
import { claimDailyBonus, checkDailyBonus } from '../lib/actions';
import BalanceDisplay from './BalanceDisplay';
import confetti from 'canvas-confetti';

interface DailyBonusProps {
    userId: string;
}

const DailyBonus: React.FC<DailyBonusProps> = ({ userId }) => {
    const { toast } = useUI();
    const [isOpen, setIsOpen] = useState(false);
    const [currentDay, setCurrentDay] = useState(1);
    const [hasClaimedToday, setHasClaimedToday] = useState(false);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        // Check local storage first to avoid unnecessary DB calls on every render
        const lastClaimDate = localStorage.getItem(`daily_bonus_${userId}`);
        const today = new Date().toDateString();
        
        if (lastClaimDate !== today) {
            // Need to check DB
            checkStatus();
        } else {
            // Already claimed locally today
            setHasClaimedToday(true);
        }
    }, [userId]);

    const checkStatus = async () => {
        const status = await checkDailyBonus(userId);
        if (status.canClaim) {
            // Determine streak from local storage or default to 1
            const streak = parseInt(localStorage.getItem(`daily_streak_${userId}`) || '1');
            // Logic to reset streak if missed a day could go here
            setCurrentDay(streak > 7 ? 1 : streak);
            setHasClaimedToday(false);
            setIsOpen(true); // Open modal if claimable
        } else {
            setHasClaimedToday(true);
        }
    };

    const handleClaim = async () => {
        setLoading(true);
        try {
            const amount = await claimDailyBonus(userId, currentDay);
            
            // Success FX
            confetti({
                particleCount: 100,
                spread: 70,
                origin: { y: 0.6 },
                colors: ['#10b981', '#fbbf24', '#3b82f6']
            });

            toast.success(`Claimed $${amount.toFixed(2)} Bonus!`);
            
            // Update State
            setHasClaimedToday(true);
            const nextDay = currentDay >= 7 ? 1 : currentDay + 1;
            
            localStorage.setItem(`daily_bonus_${userId}`, new Date().toDateString());
            localStorage.setItem(`daily_streak_${userId}`, nextDay.toString());
            
            setTimeout(() => setIsOpen(false), 2000);

        } catch (e: any) {
            toast.error("Failed to claim: " + e.message);
        } finally {
            setLoading(false);
        }
    };

    const rewards = [0.10, 0.20, 0.30, 0.40, 0.50, 0.75, 1.00];

    if (!isOpen && hasClaimedToday) return null; // Don't show if claimed and closed

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div 
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    className="fixed inset-0 z-[60] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
                >
                    <motion.div 
                        initial={{ scale: 0.8, y: 50 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.8, opacity: 0 }}
                        className="bg-dark-900 w-full max-w-md rounded-3xl border border-yellow-500/30 shadow-[0_0_50px_rgba(234,179,8,0.2)] overflow-hidden relative"
                    >
                        {/* Header */}
                        <div className="bg-gradient-to-r from-yellow-600 to-orange-600 p-6 text-center relative overflow-hidden">
                            <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-20"></div>
                            <button onClick={() => setIsOpen(false)} className="absolute top-4 right-4 text-white/70 hover:text-white"><X size={20}/></button>
                            
                            <motion.div 
                                animate={{ rotate: [0, 10, -10, 0] }}
                                transition={{ repeat: Infinity, duration: 2 }}
                                className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto mb-3 shadow-xl"
                            >
                                <Gift size={32} className="text-orange-500" />
                            </motion.div>
                            <h2 className="text-2xl font-black text-white uppercase tracking-wider">Daily Rewards</h2>
                            <p className="text-yellow-100 text-xs font-bold mt-1">Login 7 days in a row to win Big!</p>
                        </div>

                        {/* Calendar Grid */}
                        <div className="p-6 grid grid-cols-4 gap-3">
                            {rewards.map((reward, idx) => {
                                const day = idx + 1;
                                const isToday = day === currentDay;
                                const isPast = day < currentDay;
                                const isFuture = day > currentDay;
                                
                                return (
                                    <div 
                                        key={day} 
                                        className={`relative rounded-xl p-2 flex flex-col items-center justify-center aspect-square border-2 transition-all ${
                                            isToday 
                                            ? 'bg-yellow-500/20 border-yellow-500 shadow-[0_0_15px_rgba(234,179,8,0.4)] scale-105 z-10' 
                                            : isPast 
                                            ? 'bg-green-500/10 border-green-500/30 opacity-60' 
                                            : 'bg-white/5 border-white/5 opacity-50'
                                        } ${day === 7 ? 'col-span-4 aspect-auto flex-row gap-4 h-16' : ''}`}
                                    >
                                        <span className="text-[10px] text-gray-400 font-bold uppercase mb-1">Day {day}</span>
                                        
                                        {day === 7 ? (
                                            <div className="flex items-center gap-2">
                                                <Gift size={20} className={isToday ? "text-yellow-400 animate-bounce" : "text-gray-500"} />
                                                <span className="text-lg font-black text-white"><BalanceDisplay amount={reward} /></span>
                                            </div>
                                        ) : (
                                            <>
                                                {isPast ? <Check size={20} className="text-green-500"/> : <span className="text-sm font-bold text-white"><BalanceDisplay amount={reward} /></span>}
                                            </>
                                        )}

                                        {isToday && !hasClaimedToday && (
                                            <motion.div layoutId="claimRing" className="absolute inset-0 border-2 border-yellow-400 rounded-xl animate-ping opacity-50"></motion.div>
                                        )}
                                    </div>
                                )
                            })}
                        </div>

                        {/* Action Button */}
                        <div className="p-6 pt-0">
                            <button 
                                onClick={handleClaim}
                                disabled={hasClaimedToday || loading}
                                className={`w-full py-4 rounded-xl font-black text-lg flex items-center justify-center gap-2 transition shadow-lg ${
                                    hasClaimedToday 
                                    ? 'bg-gray-700 text-gray-400 cursor-not-allowed' 
                                    : 'bg-gradient-to-r from-yellow-500 to-orange-500 text-white hover:scale-[1.02] active:scale-95'
                                }`}
                            >
                                {loading ? 'Claiming...' : hasClaimedToday ? 'Come Back Tomorrow' : 'CLAIM BONUS'}
                            </button>
                        </div>

                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default DailyBonus;