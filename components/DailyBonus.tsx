import React, { useState, useEffect } from 'react';
import { Gift, X, Check } from 'lucide-react';
import { useUI } from '../context/UIContext';
import { claimDailyBonus, checkDailyBonus } from '../lib/actions';
import BalanceDisplay from './BalanceDisplay';

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
        const lastClaimDate = localStorage.getItem(`daily_bonus_${userId}`);
        const today = new Date().toDateString();
        
        if (lastClaimDate !== today) {
            checkStatus();
        } else {
            setHasClaimedToday(true);
        }
    }, [userId]);

    const checkStatus = async () => {
        const status = await checkDailyBonus(userId);
        if (status.canClaim) {
            const streak = parseInt(localStorage.getItem(`daily_streak_${userId}`) || '1');
            setCurrentDay(streak > 7 ? 1 : streak);
            setHasClaimedToday(false);
            setIsOpen(true);
        } else {
            setHasClaimedToday(true);
        }
    };

    const handleClaim = async () => {
        setLoading(true);
        try {
            const amount = await claimDailyBonus(userId, currentDay);
            toast.success(`Claimed $${amount.toFixed(2)} Bonus!`);
            
            setHasClaimedToday(true);
            const nextDay = currentDay >= 7 ? 1 : currentDay + 1;
            
            localStorage.setItem(`daily_bonus_${userId}`, new Date().toDateString());
            localStorage.setItem(`daily_streak_${userId}`, nextDay.toString());
            
            setIsOpen(false);
        } catch (e: any) {
            toast.error("Failed to claim: " + e.message);
        } finally {
            setLoading(false);
        }
    };

    const rewards = [0.10, 0.20, 0.30, 0.40, 0.50, 0.75, 1.00];

    if (!isOpen && hasClaimedToday) return null;

    return (
        isOpen ? (
            <div className="fixed inset-0 z-[60] bg-black/90 flex items-center justify-center p-4">
                <div className="bg-[#111] w-full max-w-md rounded-2xl border border-[#333] overflow-hidden relative">
                    {/* Header */}
                    <div className="bg-[#1a1a1a] p-6 text-center relative border-b border-[#333]">
                        <button onClick={() => setIsOpen(false)} className="absolute top-4 right-4 text-gray-400 hover:text-white"><X size={20}/></button>
                        <div className="w-12 h-12 bg-brand rounded-full flex items-center justify-center mx-auto mb-3">
                            <Gift size={24} className="text-white" />
                        </div>
                        <h2 className="text-xl font-bold text-white uppercase">Daily Rewards</h2>
                        <p className="text-gray-400 text-xs mt-1">Login 7 days in a row to win Big!</p>
                    </div>

                    {/* Calendar Grid */}
                    <div className="p-6 grid grid-cols-4 gap-3">
                        {rewards.map((reward, idx) => {
                            const day = idx + 1;
                            const isToday = day === currentDay;
                            const isPast = day < currentDay;
                            
                            return (
                                <div 
                                    key={day} 
                                    className={`rounded-lg p-2 flex flex-col items-center justify-center aspect-square border ${
                                        isToday 
                                        ? 'bg-brand/20 border-brand text-white' 
                                        : isPast 
                                        ? 'bg-[#1a1a1a] border-[#333] text-gray-500' 
                                        : 'bg-black border-[#222] text-gray-600'
                                    } ${day === 7 ? 'col-span-4 aspect-auto flex-row gap-4 h-14' : ''}`}
                                >
                                    <span className="text-[10px] font-bold uppercase mb-1">Day {day}</span>
                                    {isPast ? <Check size={16} /> : <span className="text-sm font-bold"><BalanceDisplay amount={reward} /></span>}
                                </div>
                            )
                        })}
                    </div>

                    {/* Action Button */}
                    <div className="p-6 pt-0">
                        <button 
                            onClick={handleClaim}
                            disabled={hasClaimedToday || loading}
                            className={`w-full py-3 rounded-lg font-bold text-sm ${
                                hasClaimedToday 
                                ? 'bg-[#222] text-gray-500 cursor-not-allowed' 
                                : 'bg-brand text-white hover:bg-brand-hover'
                            }`}
                        >
                            {loading ? 'Claiming...' : hasClaimedToday ? 'Come Back Tomorrow' : 'CLAIM BONUS'}
                        </button>
                    </div>
                </div>
            </div>
        ) : null
    );
};

export default DailyBonus;