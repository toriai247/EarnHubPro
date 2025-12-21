
import { supabase } from '../integrations/supabase/client';
import { recordLedgerEntry } from './actions';

// Target limit remains 3500 for logic purposes, but balance itself is now unlimited
export const TARGET_THRESHOLD = 3500;
export const STARTING_BALANCE = 1000;

export const getPlayableBalance = async (userId: string) => {
    const { data: wallet } = await supabase.from('wallets').select('*').eq('user_id', userId).single();
    if (!wallet) return 0;
    // Total aggregate of all usable gaming/betting funds
    return (wallet.main_balance || 0) + (wallet.game_balance || 0) + (wallet.deposit_balance || 0) + (wallet.bonus_balance || 0);
};

export const deductGameBalance = async (userId: string, amount: number, gameName: string) => {
    const { data: wallet } = await supabase.from('wallets').select('*').eq('user_id', userId).single();
    if (!wallet) throw new Error("Wallet protocol synchronization failed.");

    // Smart Wallet Priority: Game -> Bonus -> Deposit -> Main
    let source: 'main_balance' | 'deposit_balance' | 'game_balance' | 'earning_balance' | 'bonus_balance' | 'referral_balance' | 'commission_balance' | 'investment_balance' = 'game_balance';
    
    if (wallet.game_balance >= amount) {
        source = 'game_balance';
    } else if (wallet.bonus_balance >= amount) {
        source = 'bonus_balance';
    } else if (wallet.deposit_balance >= amount) {
        source = 'deposit_balance';
    } else if (wallet.main_balance >= amount) {
        source = 'main_balance';
    } else {
        const total = (wallet.game_balance || 0) + (wallet.bonus_balance || 0) + (wallet.deposit_balance || 0) + (wallet.main_balance || 0);
        if (total < amount) {
            throw new Error(`Insufficient funds. Total aggregate: ৳${total.toFixed(2)}`);
        }
        
        const balances = [
            { id: 'game_balance', val: wallet.game_balance },
            { id: 'bonus_balance', val: wallet.bonus_balance },
            { id: 'deposit_balance', val: wallet.deposit_balance },
            { id: 'main_balance', val: wallet.main_balance }
        ];
        // @ts-ignore
        source = balances.sort((a, b) => b.val - a.val)[0].id;
    }

    try {
        return await recordLedgerEntry(userId, 'BET_PLACE', source, amount, `${gameName} Bet Placed`, false);
    } catch (e: any) {
        if (e.message?.includes('Insufficient funds')) {
            throw new Error(`Insufficient funds in ${source.replace('_', ' ')}. Please move funds to Game Wallet.`);
        }
        throw e;
    }
};

export const processGameRound = async (userId: string, betAmount: number, winAmount: number, gameName: string) => {
    // 1. Deduct the stake
    await deductGameBalance(userId, betAmount, gameName);

    // 2. Process Win or Loss - Hard cap removed, balance can now grow past 3500
    if (winAmount > 0) {
        // Payout is unrestricted, the Drain Algorithm in determineOutcome handles balance control
        await recordLedgerEntry(userId, 'BET_WIN', 'game_balance', winAmount, `${gameName} Victory Reward`, true);
    } else {
        // Record the loss event in transactions
        await createTransaction(userId, 'BET_LOSS', betAmount, `${gameName} Round Lost`);
    }
    return true;
};

// Simplified transaction creator for internal use
const createTransaction = async (userId: string, type: string, amount: number, description: string) => {
    await supabase.from('transactions').insert({
        user_id: userId,
        type: type.toUpperCase(),
        amount,
        description,
        status: 'success'
    });
};

/**
 * UPDATED PROBABILITY ALGORITHM V4 (Elastic Drain)
 * Balance is now unlimited, but winning becomes statistically impossible
 * the further the balance climbs above 3,500 BDT.
 */
export const determineOutcome = async (userId: string, baseChance: number = 0.45, currentBet: number = 0): Promise<'win' | 'loss'> => {
    const { data: wallet } = await supabase.from('wallets').select('balance, total_earning').eq('user_id', userId).single();
    if (!wallet) return 'loss';

    const totalBalance = wallet.balance || 0;
    const netProfit = wallet.total_earning || 0; 
    const r = Math.random();
    
    let adjustedChance = baseChance; // Default 45% Win

    // --- ELASTIC DRAIN LOGIC ---
    
    // Tier 1: Over 5,000 BDT - Hard Wall (98% Loss)
    if (totalBalance > 5000) {
        adjustedChance = 0.02;
    }
    // Tier 2: Over 3,500 BDT - Aggressive Drain (90% Loss)
    else if (totalBalance > 3500) {
        adjustedChance = 0.10;
    }
    // Tier 3: 3,000 - 3,500 BDT - Pressure Zone (25% Win)
    else if (totalBalance > 3000) {
        adjustedChance = 0.25;
    }
    // Tier 4: High Profit Protection
    else if (netProfit > 2500) {
        adjustedChance = 0.30;
    }

    // High Stake Penalty: If user tries to "go big" to bypass the drain, punish them
    if (currentBet > 500 && totalBalance > 3000) {
        adjustedChance = adjustedChance * 0.5;
    }

    return r < adjustedChance ? 'win' : 'loss';
};
