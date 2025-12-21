
import { supabase } from '../integrations/supabase/client';
import { CURRENCY_CONFIG } from '../constants';
import { InvestmentPlan, Asset, Lottery } from '../types';

/**
 * processLedgerEntry: The primary gateway for all financial movements.
 * This calls the V7 Pure Ledger RPC in Supabase.
 */
export const recordLedgerEntry = async (
    userId: string, 
    type: 'DEPOSIT' | 'WITHDRAW' | 'BET_PLACE' | 'BET_WIN' | 'BET_LOSS' | 'TASK_EARN' | 'BONUS_ADD' | 'COMMISSION_ADD' | 'TRANSFER' | 'FEE' | 'PENALTY' | 'REFUND' | 'BET_CANCEL', 
    wallet: 'main_balance' | 'deposit_balance' | 'game_balance' | 'earning_balance' | 'bonus_balance' | 'referral_balance' | 'commission_balance' | 'investment_balance', 
    amount: number, 
    description: string, 
    isCredit: boolean
) => {
    if (amount <= 0) return { success: true, message: 'Zero amount skipped' };

    const { data, error } = await supabase.rpc('process_ledger_entry_v7', {
        p_user_id: userId,
        p_type: type,
        p_wallet: wallet,
        p_amount: amount,
        p_description: description,
        p_is_credit: isCredit
    });

    if (error) {
        console.error("Ledger V7 Error:", error);
        throw error;
    }
    
    if (data && !data.success) {
        throw new Error(data.message);
    }
    
    window.dispatchEvent(new Event('wallet_updated'));
    return data;
};

// --- USER & PROFILE ---

export const createUserProfile = async (id: string, email: string, name: string, refCode?: string, currency: string = 'BDT', theme: string = 'midnight') => {
    const userUid = Math.floor(10000000 + Math.random() * 90000000);
    const myRefCode = Math.random().toString(36).substring(2, 8).toUpperCase();

    // STARTING_BALANCE is 1000 as per new rules
    const STARTING_FUNDS = 1000.00;

    const { error: profileError } = await supabase.from('profiles').insert({
        id,
        user_uid: userUid,
        email_1: email,
        name_1: name,
        ref_code_1: myRefCode,
        referred_by: refCode || null,
        level_1: 1,
        xp_1: 0,
        rank_1: 'Rookie',
        theme_id: theme,
        is_account_active: false,
        is_kyc_1: false
    });

    if (profileError) throw profileError;

    const { error: walletError } = await supabase.from('wallets').insert({
        user_id: id,
        currency,
        main_balance: 0,
        deposit_balance: STARTING_FUNDS, // Give 1000 starting funds
        game_balance: 0,
        earning_balance: 0,
        bonus_balance: 0,
        referral_balance: 0,
        commission_balance: 0,
        balance: STARTING_FUNDS
    });

    if (walletError) throw walletError;
    
    await createTransaction(id, 'BONUS_ADD', STARTING_FUNDS, 'Initial Protocol Activation Funds');
};

export const createTransaction = async (userId: string, type: string, amount: number, description: string) => {
    await supabase.from('transactions').insert({
        user_id: userId,
        type: type.toUpperCase(),
        amount,
        description,
        status: 'success'
    });
};

export const syncWalletTotals = async (userId: string) => {
    const { data, error } = await supabase.rpc('sync_wallet_aggregate', { p_user_id: userId });
    if (error) console.error("Sync Error", error);
    window.dispatchEvent(new Event('wallet_updated'));
};

// --- OTHER ACTIONS ---

export const requestWithdrawal = async (userId: string, amountBDT: number, method: string, account: string) => {
    await recordLedgerEntry(userId, 'WITHDRAW', 'main_balance', amountBDT, `Withdrawal Request (${method})`, false);
    
    await supabase.from('withdraw_requests').insert({
        user_id: userId,
        amount: amountBDT,
        method: method,
        account_number: account,
        status: 'pending'
    });
};

export const updateWallet = async (userId: string, amount: number, action: 'increment' | 'decrement', walletType: string) => {
    const isCredit = action === 'increment';
    let type: any = isCredit ? 'TRANSFER' : 'PENALTY';
    
    if (walletType === 'bonus_balance') type = 'BONUS_ADD';
    if (walletType === 'commission_balance' || walletType === 'referral_balance') type = 'COMMISSION_ADD';
    if (walletType === 'earning_balance' && isCredit) type = 'TASK_EARN';
    if (walletType === 'main_balance' && !isCredit) type = 'WITHDRAW';
    if (walletType === 'deposit_balance' && isCredit) type = 'DEPOSIT';

    return await recordLedgerEntry(userId, type, walletType as any, amount, `Admin Wallet Adjustment`, isCredit);
};

// Added missing functions to fix the identified errors

/**
 * buyAsset: Handles purchasing a market asset using deposit balance.
 */
export const buyAsset = async (userId: string, asset: Asset, qty: number, cost: number) => {
    await recordLedgerEntry(userId, 'TRANSFER', 'deposit_balance', cost, `Bought ${qty} units of ${asset.name}`, false);
    
    const { data: existing } = await supabase.from('user_assets').select('*').eq('user_id', userId).eq('asset_id', asset.id).maybeSingle();
    
    if (existing) {
        const newQty = existing.quantity + qty;
        const totalPaid = (existing.quantity * existing.average_buy_price) + cost;
        const newAvg = totalPaid / newQty;
        await supabase.from('user_assets').update({ quantity: newQty, average_buy_price: newAvg }).eq('id', existing.id);
    } else {
        await supabase.from('user_assets').insert({
            user_id: userId,
            asset_id: asset.id,
            quantity: qty,
            average_buy_price: asset.current_price,
            status: 'holding'
        });
    }
};

/**
 * sellAsset: Handles selling a market asset back to the system.
 */
export const sellAsset = async (userId: string, userAssetId: string, qty: number, price: number) => {
    const { data: holding } = await supabase.from('user_assets').select('*').eq('id', userAssetId).single();
    if (!holding || holding.quantity < qty) throw new Error("Insufficient units");

    const revenue = qty * price;
    await recordLedgerEntry(userId, 'TRANSFER', 'main_balance', revenue, `Sold ${qty} units of asset`, true);
    
    if (holding.quantity === qty) {
        await supabase.from('user_assets').delete().eq('id', userAssetId);
    } else {
        await supabase.from('user_assets').update({ quantity: holding.quantity - qty }).eq('id', userAssetId);
    }
};

/**
 * processMonthlyPayment: Used by admins to process bulk payroll/monthly payments.
 */
export const processMonthlyPayment = async (userId: string, amount: number, method: string) => {
    await recordLedgerEntry(userId, 'WITHDRAW', 'main_balance', amount, `Monthly Payout via ${method}`, false);
    await supabase.from('withdraw_requests').insert({
        user_id: userId,
        amount,
        method,
        status: 'approved',
        processed_at: new Date().toISOString()
    });
};

/**
 * checkDailyBonus: Checks if a user can claim their daily bonus and their current streak.
 */
export const checkDailyBonus = async (userId: string) => {
    const { data: lastClaim } = await supabase
        .from('daily_bonus_logs')
        .select('*')
        .eq('user_id', userId)
        .order('claimed_at', { ascending: false })
        .limit(1)
        .maybeSingle();

    if (!lastClaim) return { streak: 1, canClaim: true, nextClaim: null };

    const lastDate = new Date(lastClaim.claimed_at);
    const now = new Date();
    const isSameDay = lastDate.toDateString() === now.toDateString();
    
    if (isSameDay) {
        const next = new Date(lastDate.getFullYear(), lastDate.getMonth(), lastDate.getDate() + 1);
        return { streak: lastClaim.streak, canClaim: false, nextClaim: next.getTime() };
    }

    const hoursSinceLast = (now.getTime() - lastDate.getTime()) / (1000 * 60 * 60);
    if (hoursSinceLast > 48) return { streak: 1, canClaim: true, nextClaim: null };

    const nextStreak = (lastClaim.streak % 7) + 1;
    return { streak: nextStreak, canClaim: true, nextClaim: null };
};

/**
 * claimDailyBonus: Processes a daily bonus claim for a user.
 */
export const claimDailyBonus = async (userId: string, day: number) => {
    const { data: config } = await supabase.from('daily_bonus_config').select('reward_amount').eq('day', day).single();
    const amount = config?.reward_amount || 1.0;

    await recordLedgerEntry(userId, 'BONUS_ADD', 'bonus_balance', amount, `Daily Bonus Day ${day}`, true);
    await supabase.from('daily_bonus_logs').insert({
        user_id: userId,
        streak: day,
        amount
    });
};

/**
 * resetAllDailyStreaks: Destructive admin action to reset all user streaks.
 */
export const resetAllDailyStreaks = async () => {
    await supabase.from('daily_bonus_logs').delete().neq('id', '00000000-0000-0000-0000-000000000000');
};

/**
 * buyPackage: Handles VIP investment package activation.
 */
export const buyPackage = async (userId: string, plan: InvestmentPlan) => {
    await recordLedgerEntry(userId, 'TRANSFER', 'deposit_balance', plan.min_invest, `Activated VIP Plan: ${plan.name}`, false);
    
    const duration = plan.duration || 30;
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + duration);
    const nextClaim = new Date();
    nextClaim.setHours(nextClaim.getHours() + 24);

    await supabase.from('investments').insert({
        user_id: userId,
        plan_id: plan.id,
        plan_name: plan.name,
        amount: plan.min_invest,
        daily_return: plan.daily_return,
        start_date: new Date().toISOString(),
        end_date: endDate.toISOString(),
        status: 'active',
        total_earned: 0,
        next_claim_at: nextClaim.toISOString()
    });
};

/**
 * claimInvestmentReward: Processes a daily ROI claim for a VIP investment.
 */
export const claimInvestmentReward = async (userId: string, investmentId: string, amount: number) => {
    const nextClaim = new Date();
    nextClaim.setHours(nextClaim.getHours() + 24);

    await recordLedgerEntry(userId, 'BONUS_ADD', 'earning_balance', amount, `VIP Daily ROI`, true);
    
    const { data: current } = await supabase.from('investments').select('total_earned').eq('id', investmentId).single();
    const newTotal = (current?.total_earned || 0) + amount;

    await supabase.from('investments').update({
        total_earned: newTotal,
        last_claim_at: new Date().toISOString(),
        next_claim_at: nextClaim.toISOString()
    }).eq('id', investmentId);
};

/**
 * buyLotteryTicket: Handles purchasing lottery entries.
 */
export const buyLotteryTicket = async (userId: string, lottery: Lottery, qty: number) => {
    const cost = lottery.ticket_price * qty;
    await recordLedgerEntry(userId, 'TRANSFER', 'deposit_balance', cost, `Lottery Tickets: ${lottery.title}`, false);
    
    for (let i = 0; i < qty; i++) {
        const ticketNum = Math.floor(100000 + Math.random() * 900000).toString();
        await supabase.from('lottery_tickets').insert({
            lottery_id: lottery.id,
            user_id: userId,
            ticket_number: ticketNum
        });
    }

    const { data: current } = await supabase.from('lotteries').select('sold_tickets').eq('id', lottery.id).single();
    await supabase.from('lotteries').update({ sold_tickets: (current?.sold_tickets || 0) + qty }).eq('id', lottery.id);
};
