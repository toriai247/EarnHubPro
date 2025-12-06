
import { supabase } from '../integrations/supabase/client';
import { Task, ActiveInvestment } from '../types';
import { CURRENCY_CONFIG } from '../constants';

// Helper to create a random referral code
const generateReferralCode = () => 'NX' + Math.random().toString(36).substring(2, 8).toUpperCase();

// Helper to validate UUID format (basic check)
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
  if (!userId || typeof userId !== 'string' || userId.trim() === '') {
      console.warn(`Skipping transaction log: Invalid userId "${userId}"`);
      return;
  }
  
  if (!isValidUUID(userId)) { 
      console.warn("Skipping invalid UUID transaction for ID:", userId); 
      return; 
  }

  const { error } = await supabase.from('transactions').insert({
    user_id: userId,
    type: type as any,
    amount,
    status: 'success',
    description
  });
  
  if (error) {
    console.error("Failed to create transaction log:", JSON.stringify(error));
  }
};

/**
 * CRITICAL FIX: Recalculates the aggregated Total Balance based on all sub-wallets.
 * This ensures the 'balance' field is always the sum of its parts.
 */
export const syncWalletTotals = async (userId: string) => {
    if (!isValidUUID(userId)) return;

    // 1. Get latest values
    const { data: w, error } = await supabase.from('wallets').select('*').eq('user_id', userId).single();
    if (error || !w) return;

    // 2. Calculate Total Assets
    // Note: We exclude 'balance' and 'withdrawable' from the sum as they are aggregate fields
    const totalAssets = (w.main_balance || 0) + 
                        (w.deposit_balance || 0) + 
                        (w.game_balance || 0) + 
                        (w.earning_balance || 0) + 
                        (w.investment_balance || 0) + 
                        (w.referral_balance || 0) + 
                        (w.commission_balance || 0) + 
                        (w.bonus_balance || 0);

    // 3. Main Balance represents Withdrawable
    // Pending withdraws are deducted visually in the UI, but here we just ensure consistency
    const withdrawable = w.main_balance;

    // 4. Update the aggregate fields
    await supabase.from('wallets').update({
        balance: totalAssets,
        withdrawable: withdrawable,
        deposit: w.deposit_balance // Sync legacy deposit field
    }).eq('user_id', userId);
};

// Updated to support dynamic columns with Auto-Sync
export const updateWallet = async (
    userId: string, 
    amount: number, 
    type: 'increment' | 'decrement', 
    field: string = 'main_balance' 
) => {
  if (!isValidUUID(userId)) {
      console.error("Invalid userId passed to updateWallet:", userId);
      throw new Error("Invalid User ID");
  }

  const { data: wallet, error: fetchError } = await supabase.from('wallets').select('*').eq('user_id', userId).single();
  
  if (fetchError || !wallet) {
      throw new Error("Wallet not found");
  }

  const updates: any = {};
  // @ts-ignore
  const currentVal = wallet[field] || 0;
  
  if (type === 'increment') {
      updates[field] = currentVal + amount;
  } else {
      updates[field] = Math.max(0, currentVal - amount);
  }
  
  const { error: updateError } = await supabase.from('wallets').update(updates).eq('user_id', userId);
  
  if (updateError) {
      throw new Error("Failed to update wallet balance");
  }

  // FORCE SYNC TOTALS AFTER UPDATE
  await syncWalletTotals(userId);
};

export const createUserProfile = async (userId: string, email: string, fullName: string, referralCode?: string, currency: string = 'USD') => {
  if (!userId || !isValidUUID(userId)) {
      console.error("Invalid userId for createUserProfile");
      return;
  }

  const myRefCode = generateReferralCode();
  let referredBy = null;
  
  // LOGIC FIX: Normalize Bonus to USD Base
  const config = CURRENCY_CONFIG[currency as keyof typeof CURRENCY_CONFIG] || CURRENCY_CONFIG.USD;
  let welcomeBonus = config.signup_bonus / config.rate; 
  
  let referrerId = null;
  
  // Check if Referral Code is Valid
  if (referralCode && referralCode.trim().length > 0) {
      const { data: referrer } = await supabase.from('profiles').select('id, ref_code_1').eq('ref_code_1', referralCode).maybeSingle();
      if (referrer) {
          referredBy = referralCode; 
          referrerId = referrer.id;
          // Add extra bonus? 25% of welcome bonus
          welcomeBonus += (welcomeBonus * 0.25); 
      }
  }

  // 1. Create Profile
  const { error: profileError } = await supabase.from('profiles').upsert({
    id: userId,
    email_1: email,
    name_1: fullName,
    ref_code_1: myRefCode,
    referred_by: referredBy,
    level_1: 1,
    is_kyc_1: false
  }, { onConflict: 'id' });

  if (profileError) {
    if (profileError.code === '42P17') {
        throw new Error("Database Policy Error: Infinite Recursion. Please run the fix SQL script.");
    }
  }

  // 2. Create Wallet
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
    balance: welcomeBonus, // Init total
    deposit: 0,
    withdrawable: 0, 
    total_earning: 0,
    today_earning: 0,
    pending_withdraw: 0,
    referral_earnings: 0
  }, { onConflict: 'user_id' });

  if (walletError) {
      if (walletError.code === '42P17') {
          throw new Error("Database Policy Error: Infinite Recursion on Wallet. Run fix SQL.");
      }
      throw walletError;
  }

  // 3. Check and Create Transactions (Prevent Duplicates)
  if (userId) {
      const { count: txCount } = await supabase.from('transactions')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('description', 'Welcome Bonus');

      if (!txCount) {
          await createTransaction(userId, 'bonus', welcomeBonus, `Welcome Bonus`);
          await createNotification(userId, 'Welcome! 🎁', `You received a welcome bonus of $${welcomeBonus.toFixed(2)}`, 'success');
          
          if (referrerId && isValidUUID(referrerId)) {
              const { count: refTxCount } = await supabase.from('transactions')
                .select('*', { count: 'exact', head: true })
                .eq('user_id', userId)
                .ilike('description', 'Referral Bonus%');

              if (!refTxCount) {
                  await supabase.from('referrals').upsert({
                      referrer_id: referrerId,
                      referred_id: userId,
                      status: 'completed',
                      earned: 0
                  }, { onConflict: 'referred_id', ignoreDuplicates: true });
              }
          }
      }
  }
};

// --- REFERRAL COMMISSION LOGIC ---
const distributeReferralReward = async (userId: string, earningAmount: number) => {
    if (earningAmount <= 0) return;

    const { data: userProfile } = await supabase.from('profiles').select('referred_by, name_1').eq('id', userId).single();
    if (!userProfile || !userProfile.referred_by) return;

    const { data: referrerProfile } = await supabase.from('profiles').select('id').eq('ref_code_1', userProfile.referred_by).maybeSingle();
    if (!referrerProfile) return;

    const { data: tierConfig } = await supabase
        .from('referral_tiers')
        .select('commission_percent')
        .eq('level', 1)
        .eq('type', 'earning')
        .eq('is_active', true)
        .maybeSingle();

    const percent = tierConfig ? tierConfig.commission_percent : 5.0;
    const commission = Number((earningAmount * (percent / 100)).toFixed(4));
        
    if (commission < 0.001) return;

    const { data: rWallet } = await supabase.from('wallets').select('*').eq('user_id', referrerProfile.id).single();
    if (rWallet) {
        await supabase.from('wallets').update({
            commission_balance: (rWallet.commission_balance || 0) + commission, 
            total_earning: rWallet.total_earning + commission,
            referral_earnings: (rWallet.referral_earnings || 0) + commission
        }).eq('user_id', referrerProfile.id);

        await createTransaction(referrerProfile.id, 'referral', commission, `${percent}% Commission from ${userProfile.name_1 || 'User'}`);
        
        const { data: refRecord } = await supabase.from('referrals').select('*')
            .eq('referrer_id', referrerProfile.id)
            .eq('referred_id', userId)
            .maybeSingle();
            
        if (refRecord) {
            await supabase.from('referrals').update({
                earned: refRecord.earned + commission
            }).eq('id', refRecord.id);
        }

        await createNotification(referrerProfile.id, 'Commission Earned! 💸', `You earned ${commission.toFixed(2)} (${percent}%) commission.`, 'success');
        
        // Sync
        await syncWalletTotals(referrerProfile.id);
    }
};

// --- GAME LOGIC ---
export const processGameResult = async (userId: string, gameId: string, gameName: string, bet: number, payout: number, details: string) => {
    if (!isValidUUID(userId)) return;

    let finalPayout = payout;
    const initialProfit = payout - bet;
    
    if (initialProfit > 0) {
        const adminFeePercent = 0.05; 
        const fee = initialProfit * adminFeePercent;
        finalPayout = payout - fee;
        details += ` (Fee: -${fee.toFixed(2)})`;
    }

    const finalProfit = finalPayout - bet;

    await supabase.from('game_history').insert({
        user_id: userId,
        game_id: gameId,
        game_name: gameName,
        bet,
        payout: finalPayout,
        profit: finalProfit,
        details
    });

    if (finalPayout > 0) {
        if (finalProfit > 0) {
             const { data: w } = await supabase.from('wallets').select('total_earning, today_earning').eq('user_id', userId).single();
             if (w) {
                 await supabase.from('wallets').update({
                     total_earning: w.total_earning + finalProfit,
                     today_earning: w.today_earning + finalProfit
                 }).eq('user_id', userId);
             }
        }
        
        if (finalProfit > 0) {
            await distributeReferralReward(userId, finalProfit);
        }
    }

    await createTransaction(userId, finalProfit > 0 ? 'game_win' : 'game_loss', Math.abs(finalProfit), details);
    
    if (finalProfit > 50) {
        await createNotification(userId, 'Big Win! 🏆', `You won $${finalProfit.toFixed(2)} in ${gameName}!`, 'success');
    }
    
    await syncWalletTotals(userId);
};

export const claimTask = async (userId: string, task: Task) => {
    if (!isValidUUID(userId)) throw new Error("Invalid User ID");

    const { data: w, error: walletFetchError } = await supabase.from('wallets').select('*').eq('user_id', userId).single();
    if (walletFetchError || !w) throw new Error("Wallet not found");

    const currentBal = Number(w.earning_balance) || 0; 
    const reward = Number(task.reward) || 0;
    const totalEarn = Number(w.total_earning) || 0;
    const todayEarn = Number(w.today_earning) || 0;

    const newBalance = currentBal + reward;

    const { error: updateError } = await supabase.from('wallets').update({
        earning_balance: newBalance,
        total_earning: totalEarn + reward,
        today_earning: todayEarn + reward
    }).eq('user_id', userId);

    if (updateError) throw new Error("Failed to credit reward.");

    await supabase.from('user_tasks').insert({
        user_id: userId,
        task_id: task.id,
        completed_at: new Date().toISOString()
    });

    await createTransaction(userId, 'earn', reward, `Task Completed: ${task.title}`);
    await distributeReferralReward(userId, reward);
    await syncWalletTotals(userId);
    
    return true;
}

export const claimInvestmentReturn = async (userId: string, investment: ActiveInvestment) => {
    if (!isValidUUID(userId)) throw new Error("Invalid User ID");

    const now = new Date();
    const nextClaim = new Date(investment.next_claim_at);

    if (now < nextClaim) {
        throw new Error("Claim not available yet. Please wait.");
    }

    const dailyProfit = investment.daily_return;
    
    await updateWallet(userId, dailyProfit, 'increment', 'earning_balance');
    
    const nextDate = new Date();
    nextDate.setHours(nextDate.getHours() + 24);

    const { error } = await supabase.from('investments').update({
        total_earned: investment.total_earned + dailyProfit,
        last_claim_at: now.toISOString(),
        next_claim_at: nextDate.toISOString()
    }).eq('id', investment.id);

    if (error) throw error;

    await createTransaction(userId, 'earn', dailyProfit, `Investment Return: ${investment.plan_name}`);
    await distributeReferralReward(userId, dailyProfit);

    const endDate = new Date(investment.end_date);
    if (now >= endDate && investment.status === 'active') {
        await updateWallet(userId, investment.amount, 'increment', 'main_balance');
        await createTransaction(userId, 'earn', investment.amount, `Capital Return: ${investment.plan_name}`);
        await supabase.from('investments').update({ status: 'completed' }).eq('id', investment.id);
    }
};

export const saveWithdrawMethod = async (userId: string, method: string, number: string, isAuto: boolean) => {
    if (!isValidUUID(userId)) throw new Error("Invalid User ID");

    const { data: settings } = await supabase.from('withdrawal_settings').select('*').maybeSingle();
    const fee = settings?.id_change_fee || 30;

    const { data: existing } = await supabase.from('user_withdrawal_methods').select('*').eq('user_id', userId).maybeSingle();

    if (existing) {
        if (existing.account_number !== number) {
            const { data: wallet } = await supabase.from('wallets').select('main_balance').eq('user_id', userId).single();
            if (!wallet || wallet.main_balance < fee) {
                throw new Error(`Insufficient Main Balance. Changing the saved number costs ${fee} TK.`);
            }
            await updateWallet(userId, fee, 'decrement', 'main_balance');
            await createTransaction(userId, 'penalty', fee, 'Withdrawal ID Change Fee');
        }

        await supabase.from('user_withdrawal_methods').update({
            method_name: method,
            account_number: number,
            is_auto_enabled: isAuto,
            updated_at: new Date().toISOString()
        }).eq('user_id', userId);
    } else {
        await supabase.from('user_withdrawal_methods').insert({
            user_id: userId,
            method_name: method,
            account_number: number,
            is_auto_enabled: isAuto
        });
    }
};

export const requestWithdrawal = async (userId: string, amount: number, method: string, accountNumber: string) => {
    if (!isValidUUID(userId)) throw new Error("Invalid User ID");

    const { data, error } = await supabase.rpc('request_withdrawal', {
        p_user_id: userId,
        p_amount: amount,
        p_method: method,
        p_account_number: accountNumber
    });

    if (error) {
        console.error("RPC Error:", error);
        throw new Error(error.message);
    }

    if (data && data.success === false) {
        throw new Error(data.message);
    }
    
    await syncWalletTotals(userId);
    return data;
};

export const processMonthlyPayment = async (userId: string, balance: number, method: string) => {
    if (!isValidUUID(userId)) return;

    const bonus = Number((balance * 0.02).toFixed(2));
    const totalPayout = balance + bonus;
    
    const { error: wErr } = await supabase.from('wallets').update({
        main_balance: 0, 
        balance: 0,
        withdrawable: 0,
        pending_withdraw: 0
    }).eq('user_id', userId);

    if (wErr) throw new Error("Failed to deduct user balance");

    await createTransaction(userId, 'bonus', bonus, 'Monthly Auto-Pay 2% Bonus');
    await createTransaction(userId, 'withdraw', totalPayout, `Monthly Auto-Pay to ${method}`);

    await supabase.from('withdraw_requests').insert({
        user_id: userId,
        amount: totalPayout,
        method: method,
        status: 'approved',
        processed_at: new Date().toISOString()
    });
};

export const checkDailyBonus = async (userId: string) => {
    const today = new Date();
    today.setHours(0,0,0,0);

    const { data: streak } = await supabase
        .from('daily_streaks')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

    if (!streak) {
        return { canClaim: true, streak: 1 };
    }

    const lastClaim = new Date(streak.last_claimed_at);
    lastClaim.setHours(0,0,0,0);

    if (lastClaim.getTime() === today.getTime()) {
        return { canClaim: false, streak: streak.current_streak };
    }

    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setHours(0,0,0,0);

    if (lastClaim.getTime() < yesterday.getTime()) {
        // Missed a day? Check logic. 
        // If last claim was before yesterday, streak resets.
        return { canClaim: true, streak: 1 };
    }

    return { canClaim: true, streak: streak.current_streak + 1 };
};

export const claimDailyBonus = async (userId: string, day: number) => {
    if (!isValidUUID(userId)) throw new Error("Invalid User");

    const { data: configs } = await supabase.from('daily_bonus_config').select('*').order('day');
    
    let rewards = [0.10, 0.20, 0.30, 0.40, 0.50, 0.75, 1.00]; 
    
    if (configs && configs.length > 0) {
        rewards = Array(7).fill(0.10);
        configs.forEach((c: any) => {
            if (c.day >= 1 && c.day <= 7) rewards[c.day - 1] = c.reward_amount;
        });
    }

    const index = (day - 1) % 7; 
    const amount = rewards[index] || 0.10;

    await updateWallet(userId, amount, 'increment', 'bonus_balance');
    await createTransaction(userId, 'bonus', amount, `Daily Login Bonus (Day ${day})`);
    
    const { data: existing } = await supabase.from('daily_streaks').select('*').eq('user_id', userId).maybeSingle();
    
    if (existing) {
        await supabase.from('daily_streaks').update({
            current_streak: day,
            last_claimed_at: new Date().toISOString(),
            total_claimed: (existing.total_claimed || 0) + amount
        }).eq('user_id', userId);
    } else {
        await supabase.from('daily_streaks').insert({
            user_id: userId,
            current_streak: 1,
            last_claimed_at: new Date().toISOString(),
            total_claimed: amount
        });
    }

    window.dispatchEvent(new Event('wallet_updated'));
    
    return amount;
};

export const resetAllDailyStreaks = async () => {
    const { error } = await supabase.rpc('admin_reset_all_streaks');
    if (error) {
        // If RPC is missing, fallback to creating table query if possible, 
        // but since we can't run raw SQL here, we throw error asking user to run the tool.
        throw new Error("RPC 'admin_reset_all_streaks' missing. Run SQL in Database Ultra.");
    }
    return true;
};
