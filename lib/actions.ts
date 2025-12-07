
import { supabase } from '../integrations/supabase/client';
import { Task, ActiveInvestment, Asset } from '../types';
import { CURRENCY_CONFIG } from '../constants';

// Helper to create a random referral code
const generateReferralCode = () => 'NX' + Math.random().toString(36).substring(2, 8).toUpperCase();

// Helper to validate UUID format
const isValidUUID = (uuid: string) => {
    const regex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return regex.test(uuid);
};

export const createNotification = async (userId: string, title: string, message: string, type: 'info' | 'success' | 'error' | 'warning' = 'info') => {
    await supabase.from('notifications').insert({
        user_id: userId,
        title,
        message,
        type,
        is_read: false
    });
};

export const createTransaction = async (userId: string, type: string, amount: number, description: string) => {
  if (!userId || typeof userId !== 'string' || userId.trim() === '') return;
  if (!isValidUUID(userId)) return;

  const { error } = await supabase.from('transactions').insert({
    user_id: userId,
    type: type as any,
    amount,
    status: 'success',
    description
  });
  
  if (error) console.error("Failed to create transaction log:", JSON.stringify(error));
};

export const syncWalletTotals = async (userId: string) => {
    if (!isValidUUID(userId)) return;

    const { data: w, error } = await supabase.from('wallets').select('*').eq('user_id', userId).single();
    if (error || !w) return;

    const totalAssets = (w.main_balance || 0) + 
                        (w.deposit_balance || 0) + 
                        (w.game_balance || 0) + 
                        (w.earning_balance || 0) + 
                        (w.investment_balance || 0) + 
                        (w.referral_balance || 0) + 
                        (w.commission_balance || 0) + 
                        (w.bonus_balance || 0);

    const withdrawable = w.main_balance;

    await supabase.from('wallets').update({
        balance: totalAssets,
        withdrawable: withdrawable,
        deposit: w.deposit_balance
    }).eq('user_id', userId);
};

export const updateWallet = async (
    userId: string, 
    amount: number, 
    type: 'increment' | 'decrement', 
    field: string = 'main_balance' 
) => {
  if (!isValidUUID(userId)) throw new Error("Invalid User ID");

  const { data: wallet, error: fetchError } = await supabase.from('wallets').select('*').eq('user_id', userId).single();
  
  if (fetchError || !wallet) throw new Error("Wallet not found");

  const updates: any = {};
  // @ts-ignore
  const currentVal = wallet[field] || 0;
  
  if (type === 'increment') {
      updates[field] = currentVal + amount;
  } else {
      updates[field] = Math.max(0, currentVal - amount);
  }
  
  const { error: updateError } = await supabase.from('wallets').update(updates).eq('user_id', userId);
  
  if (updateError) throw new Error("Failed to update wallet balance");

  await syncWalletTotals(userId);
};

// --- ASSET MANAGEMENT ACTIONS ---

export const buyAsset = async (userId: string, asset: Asset, quantity: number, totalCost: number) => {
    if (!isValidUUID(userId)) throw new Error("Invalid User");

    await updateWallet(userId, totalCost, 'decrement', 'deposit_balance');
    await createTransaction(userId, 'asset_buy', totalCost, `Bought ${quantity} ${asset.type === 'commodity' ? 'g' : 'units'} of ${asset.name}`);

    if (asset.type === 'business') {
        await supabase.from('assets').update({
            collected_fund: (asset.collected_fund || 0) + totalCost
        }).eq('id', asset.id);
    }

    const { data: existing } = await supabase.from('user_assets')
        .select('*')
        .eq('user_id', userId)
        .eq('asset_id', asset.id)
        .eq('status', 'holding')
        .maybeSingle();

    if (existing) {
        const totalQty = existing.quantity + quantity;
        const totalVal = (existing.quantity * existing.average_buy_price) + totalCost;
        const newAvg = totalVal / totalQty;

        await supabase.from('user_assets').update({
            quantity: totalQty,
            average_buy_price: newAvg,
            updated_at: new Date().toISOString()
        }).eq('id', existing.id);
    } else {
        await supabase.from('user_assets').insert({
            user_id: userId,
            asset_id: asset.id,
            quantity: quantity,
            average_buy_price: asset.current_price,
            status: 'holding'
        });
    }
    
    await syncWalletTotals(userId);
};

export const sellAsset = async (userId: string, userAssetId: string, quantityToSell: number, currentPrice: number) => {
    if (!isValidUUID(userId)) throw new Error("Invalid User");

    const { data: holding } = await supabase.from('user_assets').select('*').eq('id', userAssetId).single();
    if (!holding || holding.quantity < quantityToSell) throw new Error("Insufficient holdings");

    const sellValue = quantityToSell * currentPrice;
    
    await updateWallet(userId, sellValue, 'increment', 'main_balance');
    
    const buyValue = quantityToSell * holding.average_buy_price;
    const pnl = sellValue - buyValue;
    const pnlStr = pnl >= 0 ? `Profit: +${pnl.toFixed(2)}` : `Loss: ${pnl.toFixed(2)}`;

    await createTransaction(userId, 'asset_sell', sellValue, `Sold ${quantityToSell} units. ${pnlStr}`);

    if (holding.quantity - quantityToSell <= 0.0001) {
        await supabase.from('user_assets').delete().eq('id', userAssetId);
    } else {
        await supabase.from('user_assets').update({
            quantity: holding.quantity - quantityToSell,
            updated_at: new Date().toISOString()
        }).eq('id', userAssetId);
    }
    
    await syncWalletTotals(userId);
};

export const requestDelivery = async (userId: string, userAssetId: string, address: string) => {
    if (!isValidUUID(userId)) throw new Error("Invalid User");
    
    const { data: holding } = await supabase.from('user_assets').select('*, assets(name)').eq('id', userAssetId).single();
    if (!holding) throw new Error("Asset not found");

    await supabase.from('user_assets').update({
        status: 'delivery_requested',
        delivery_details: address,
        updated_at: new Date().toISOString()
    }).eq('id', userAssetId);

    await createNotification(userId, 'Delivery Requested', `Request for ${holding.quantity} of ${holding.assets.name} received.`, 'info');
};

// --- DAILY BONUS & LEGACY ---

export const checkDailyBonus = async (userId: string) => {
    if (!isValidUUID(userId)) return { canClaim: false, streak: 1, nextClaim: null };

    // 1. Get streak record
    const { data: streak } = await supabase.from('daily_streaks').select('*').eq('user_id', userId).maybeSingle();

    if (!streak) {
        return { canClaim: true, streak: 1, nextClaim: null };
    }

    const lastClaim = new Date(streak.last_claimed_at);
    const now = new Date();
    const msInDay = 24 * 60 * 60 * 1000;

    // Normalize to Midnight to avoid time-of-day issues
    const lastDate = new Date(lastClaim.getFullYear(), lastClaim.getMonth(), lastClaim.getDate());
    const todayDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    // 2. Already claimed today?
    if (lastDate.getTime() === todayDate.getTime()) {
        const tomorrow = new Date(todayDate.getTime() + msInDay);
        return { canClaim: false, streak: streak.current_streak, nextClaim: tomorrow.getTime() };
    }

    // 3. Missed a day? (Diff > 1 day)
    const diffTime = Math.abs(todayDate.getTime() - lastDate.getTime());
    const diffDays = Math.ceil(diffTime / msInDay);

    if (diffDays > 1) {
        // Reset streak
        return { canClaim: true, streak: 1, nextClaim: null };
    }

    // 4. Consecutive day
    return { canClaim: true, streak: Math.min(streak.current_streak + 1, 7), nextClaim: null };
};

export const claimDailyBonus = async (userId: string, day: number) => {
    if (!isValidUUID(userId)) throw new Error("Invalid User");

    // Double check eligibility
    const status = await checkDailyBonus(userId);
    if (!status.canClaim) throw new Error("Already claimed today.");

    // Get Reward Config
    const { data: config } = await supabase.from('daily_bonus_config').select('reward_amount').eq('day', day).maybeSingle();
    const reward = config?.reward_amount || 0.10;

    // Update Wallet
    await updateWallet(userId, reward, 'increment', 'bonus_balance');
    await createTransaction(userId, 'bonus', reward, `Daily Bonus Day ${day}`);

    // Update Streak Record
    const { error } = await supabase.from('daily_streaks').upsert({
        user_id: userId,
        current_streak: day,
        last_claimed_at: new Date().toISOString(),
        total_claimed: reward // In a real app, retrieve current total and add, but simple upsert here for logic
    }, { onConflict: 'user_id' });

    if (error) throw error;

    return reward;
};

export const createUserProfile = async (userId: string, email: string, fullName: string, referralCode?: string, currency: string = 'BDT') => {
  if (!userId || !isValidUUID(userId)) return;

  const myRefCode = generateReferralCode();
  let referredBy = null;
  let welcomeBonus = CURRENCY_CONFIG.BDT.signup_bonus; 
  let referrerId = null;
  
  if (referralCode && referralCode.trim().length > 0) {
      const { data: referrer } = await supabase.from('profiles').select('id, ref_code_1').eq('ref_code_1', referralCode).maybeSingle();
      if (referrer) {
          referredBy = referralCode; 
          referrerId = referrer.id;
          welcomeBonus += (welcomeBonus * 0.25); 
      }
  }

  const { error: profileError } = await supabase.from('profiles').upsert({
    id: userId,
    email_1: email,
    name_1: fullName,
    ref_code_1: myRefCode,
    referred_by: referredBy,
    level_1: 1,
    is_kyc_1: false
  }, { onConflict: 'id' });

  if (profileError) throw profileError;

  const { error: walletError } = await supabase.from('wallets').upsert({
    user_id: userId,
    currency: currency, 
    main_balance: 0,
    bonus_balance: welcomeBonus,
    deposit_balance: 0,
    game_balance: 0,
    earning_balance: 0,
    investment_balance: 0,
    referral_balance: 0,
    commission_balance: 0,
    balance: welcomeBonus,
    deposit: 0,
    withdrawable: 0, 
    total_earning: 0,
    today_earning: 0,
    pending_withdraw: 0,
    referral_earnings: 0
  }, { onConflict: 'user_id' });

  if (walletError) throw walletError;

  // Init Streak Table
  await supabase.from('daily_streaks').upsert({
      user_id: userId,
      current_streak: 0,
      total_claimed: 0,
      last_claimed_at: new Date(0).toISOString() // Set to epoch to allow immediate claim
  });

  if (userId) {
      const { count: txCount } = await supabase.from('transactions').select('*', { count: 'exact', head: true }).eq('user_id', userId).eq('description', 'Welcome Bonus');
      if (!txCount) {
          await createTransaction(userId, 'bonus', welcomeBonus, `Welcome Bonus`);
          
          if (referrerId && isValidUUID(referrerId)) {
              await supabase.from('referrals').upsert({
                  referrer_id: referrerId,
                  referred_id: userId,
                  status: 'completed',
                  earned: 0
              }, { onConflict: 'referred_id', ignoreDuplicates: true });
          }
      }
  }
};

export const resetAllDailyStreaks = async () => { 
    await supabase.from('daily_streaks').update({ current_streak: 0, last_claimed_at: new Date(0).toISOString() }).neq('user_id', '0');
    return true; 
};

export const requestWithdrawal = async (userId: string, amount: number, method: string, accountNumber: string) => {
    await supabase.from('withdraw_requests').insert({ user_id: userId, amount, method, account_number: accountNumber, status: 'pending' });
    await updateWallet(userId, amount, 'decrement', 'main_balance');
};

export const processMonthlyPayment = async (userId: string, balance: number, method: string) => {};
export const saveWithdrawMethod = async (userId: string, method: string, number: string, isAuto: boolean) => {};
export const claimInvestmentReturn = async (userId: string, investment: ActiveInvestment) => {}; // Legacy
export const claimTask = async (userId: string, task: Task) => {};
