import React, { useState, useEffect } from 'react';
import { Gift, X, Check, Zap, Loader2, Clock, Sparkles, Trophy, ChevronRight } from 'lucide-react';
import { useUI } from '../context/UIContext';
import { claimDailyBonus, checkDailyBonus } from '../lib/actions';
import BalanceDisplay from './BalanceDisplay';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../integrations/supabase/client';

interface DailyBonusProps {
    userId: string;
}

const DailyBonus: React.FC<DailyBonusProps> = ({ userId }) => {
    const { toast } = useUI();
    const [isOpen, setIsOpen] = useState(false);
    const [currentDay, setCurrentDay] = useState(1);
    const [canClaim, setCanClaim] = useState(false);
    const [loading, setLoading] = useState(false);
    const [isClaimedInSession, setIsClaimedInSession] = useState(false);
    const [nextClaimTime, setNextClaimTime] = useState<number | null>(null);
    const [timeRemaining, setTimeRemaining] = useState('');
    const [rewards, setRewards] = useState<number[]>([1, 2, 5, 8, 12, 15, 25]); // BDT Defaults

    useEffect(() => {
        if (userId) {
            fetchConfig();
            checkStatus();
        }
    }, [userId]);

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
            const newRewards = [...rewards];
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
        
        const hasClosed = sessionStorage.getItem('daily_bonus_closed');
        if (status.canClaim && !hasClosed && !isClaimedInSession) {
            setIsOpen(true);
        }
        setLoading(false);
    };

    const handleClaim = async () => {
        if (!canClaim || isClaimedInSession) return;
        setLoading(true);
        try {
            await claimDailyBonus(userId, currentDay);
            
            // Lazy load confetti for performance
            const confetti = (await import('canvas-confetti')).default;
            confetti({
                particleCount: 150,
                spread: 100,
                origin: { y: 0.6 },
                colors: ['#FFBE0B', '#FFFFFF']
            });
            
            toast.success(`Day ${currentDay} Bonus Claimed!`);
            setIsClaimedInSession(true);
            setCanClaim(false);
            const nowTime = new Date();
            const tomorrow = new Date(nowTime.getFullYear(), nowTime.getMonth(), nowTime.getDate() + 1);
            setNextClaimTime(tomorrow.getTime());
            setTimeout(() => setIsOpen(false), 2000); 
        } catch (e: any) {
            toast.error(e.message || "Claim failed.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="w-full">
            <motion.div 
                onClick={() => setIsOpen(true)}
                whileTap={{ scale: 0.95 }}
                className="bg-panel rounded-5xl p-5 flex items-center justify-between cursor-pointer border border-border-base hover:border-brand/30 transition-all shadow-soft group"
            >
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-brand/10 border border-brand/20 rounded-2xl flex items-center justify-center text-brand relative shadow-inner">
                        <Gift size={24} className={canClaim && !isClaimedInSession ? 'animate-bounce' : ''} />
                        {canClaim && !isClaimedInSession && <span className="absolute -top-1 -right-1 w-3 h-3 bg-brand rounded-full border-2 border-panel animate-pulse shadow-glow"></span>}
                    </div>
                    <div className="text-left">
                        <p className="text-[9px] font-black text-gray-500 uppercase tracking-[0.2em]">Loyalty Matrix</p>
                        <p className="text-sm font-black text-white mt-1">
                            {canClaim && !isClaimedInSession ? 'DAY ' + currentDay + ' READY' : 'NEXT: ' + (timeRemaining || 'WAIT')}
                        </p>
                    </div>
                </div>
                <div className="bg-white/5 px-4 py-2.5 rounded-2xl border border-white/5 flex items-center gap-2 group-hover:border-brand/30 transition-colors">
                   <span className="text-[10px] font-black text-brand uppercase tracking-widest">{rewards[currentDay-1]} BDT</span>
                   <ChevronRight size={14} className="text-gray-600 group-hover:text-brand transition-colors" />
                </div>
            </motion.div>

            <AnimatePresence>
                {isOpen && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/95 backdrop-blur-xl" onClick={() => setIsOpen(false)} />
                        <motion.div 
                            initial={{ scale: 0.9, y: 30, opacity: 0 }} 
                            animate={{ scale: 1, y: 0, opacity: 1 }} 
                            exit={{ scale: 0.9, y: 30, opacity: 0 }} 
                            className="bg-[#050505] w-full max-w-sm rounded-[3rem] border border-white/10 overflow-hidden relative shadow-2xl"
                        >
                            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-brand to-transparent"></div>
                            <button onClick={() => setIsOpen(false)} className="absolute top-6 right-6 text-muted hover:text-white transition"><X size={24}/></button>
                            
                            <div className="pt-12 pb-6 px-8 text-center">
                                <div className="w-20 h-20 bg-brand text-black rounded-3xl flex items-center justify-center mx-auto mb-6 relative shadow-yellow-pop">
                                    <Gift size={40} />
                                    <Sparkles className="absolute -top-3 -right-3 text-brand animate-pulse" size={24} />
                                </div>
                                <h2 className="text-3xl font-black text-white uppercase tracking-tighter">DAILY <span className="text-brand">BONUS</span></h2>
                                <p className="text-muted text-xs mt-2 font-medium max-w-[200px] mx-auto">Login daily to unlock the high-payout 7-day milestone.</p>
                            </div>

                            <div className="px-6 pb-8 grid grid-cols-4 gap-2.5">
                                {rewards.map((reward, idx) => {
                                    const day = idx + 1;
                                    const isClaimed = day < currentDay || (day === currentDay && isClaimedInSession);
                                    const isCurrent = day === currentDay && !isClaimedInSession;
                                    return (
                                        <div key={day} className={`aspect-[4/5] rounded-2xl border flex flex-col items-center justify-center relative transition-all duration-500 shadow-sm ${isCurrent ? 'bg-brand/20 border-brand shadow-yellow-pop' : isClaimed ? 'bg-success/5 border-success/20 opacity-40' : 'bg-white/5 border-white/5 opacity-30'}`}>
                                            <span className="text-[8px] font-black text-muted absolute top-2 left-2.5 opacity-50">D{day}</span>
                                            {isClaimed ? (
                                                <Check className="text-success" size={24} strokeWidth={4} />
                                            ) : (
                                                <div className="flex flex-col items-center">
                                                    <span className="text-xs font-black text-white">{reward}</span>
                                                    <span className="text-[6px] font-bold text-muted uppercase tracking-tighter">BDT</span>
                                                </div>
                                            )}
                                            {day === 7 && <Trophy size={12} className="text-brand absolute bottom-2" />}
                                        </div>
                                    );
                                })}
                            </div>

                            <div className="px-8 pb-10">
                                <button 
                                    onClick={handleClaim} 
                                    disabled={!canClaim || loading || isClaimedInSession} 
                                    className={`w-full py-4 rounded-3xl font-black text-sm uppercase tracking-[0.2em] shadow-2xl transition-all active:scale-95 flex items-center justify-center gap-2 ${canClaim && !isClaimedInSession ? 'bg-brand text-black hover:bg-white shadow-yellow-pop' : 'bg-white/5 text-muted cursor-not-allowed border border-white/5'}`}
                                >
                                    {loading ? <Loader2 className="animate-spin" size={20} /> : canClaim && !isClaimedInSession ? 'CLAIM REWARD' : isClaimedInSession ? 'COME BACK LATER' : `READY IN ${timeRemaining}`}
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default DailyBonus;