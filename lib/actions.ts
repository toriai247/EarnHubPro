
import { supabase } from '../integrations/supabase/client';
import { Task, ActiveInvestment } from '../types';

// Helper to create a random referral code
const generateReferralCode = () => 'EH' + Math.random().toString(36).substring(2, 8).toUpperCase();

export const createUserProfile = async (userId: string, email: string, fullName: string, referralCode?: string) => {
  const myRefCode = generateReferralCode();
  let referredBy = null;
  let welcomeBonus = 120.00; // Standard Welcome Bonus
  let referrerId = null;
  
  // Check if Referral Code is Valid
  if (referralCode && referralCode.trim().length > 0) {
      const { data: referrer } = await supabase.from('profiles').select('id, ref_code_1').eq('ref_code_1', referralCode).maybeSingle();
      if (referrer) {
          referredBy = referralCode; // Save the code
          referrerId = referrer.id;
          welcomeBonus += 50.00; // Add 50 Bonus for using code
      }
  }

  // 1. Create Profile (Use upsert to safely handle existing profiles)
  const { error: profileError } = await supabase.from('profiles').upsert({
    id: userId,
    email_1: email,
    name_1: fullName,
    ref_code_1: myRefCode,
    referred_by: referredBy,
    level_1: 1,
    is_kyc_1: false
  }, { onConflict: 'id', ignoreDuplicates: true });

  if (profileError) {
    console.error("Profile create error:", JSON.stringify(profileError));
    if (profileError.code === '42P17') {
        throw new Error("Database Policy Error: Infinite Recursion. Please run the fix SQL script.");
    }
  }

  // 2. Create Wallet safely
  const { error: walletError } = await supabase.from('wallets').upsert({
    user_id: userId,
    balance: welcomeBonus,
    deposit: 0,
    withdrawable: welcomeBonus, 
    total_earning: 0,
    today_earning: 0,
    pending_withdraw: 0,
    referral_earnings: 0
  }, { onConflict: 'user_id', ignoreDuplicates: true });

  if (walletError) {
      console.error("Wallet create error:", JSON.stringify(walletError));
      if (walletError.code === '42P17') {
          throw new Error("Database Policy Error: Infinite Recursion on Wallet. Run fix SQL.");
      }
      throw walletError;
  }

  // 3. Check and Create Transactions (Prevent Duplicates)
  const { count: txCount } = await supabase.from('transactions')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('description', 'Welcome Bonus');

  if (!txCount) {
      await createTransaction(userId, 'bonus', 120.00, 'Welcome Bonus');
      
      if (referrerId) {
          const { count: refTxCount } = await supabase.from('transactions')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', userId)
            .ilike('description', 'Referral Bonus%');

          if (!refTxCount) {
              await createTransaction(userId, 'bonus', 50.00, `Referral Bonus (Code: ${referralCode})`);
              
              const { error: refError } = await supabase.from('referrals').upsert({
                  referrer_id: referrerId,
                  referred_id: userId,
                  status: 'completed',
                  earned: 0
              }, { onConflict: 'referred_id', ignoreDuplicates: true });
              
              if (!refError) {
                  await supabase.from('notifications').insert({
                      user_id: referrerId,
                      title: 'New Recruit! 🚀',
                      message: `${fullName || 'A new user'} joined your team using code ${referralCode}.`,
                      type: 'success'
                  });
              }
          }
      }
  }
};

export const createTransaction = async (userId: string, type: string, amount: number, description: string) => {
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

export const updateWallet = async (userId: string, amount: number, type: 'increment' | 'decrement', field: 'balance' | 'deposit' | 'withdrawable' = 'balance') => {
  const { data: wallet, error: fetchError } = await supabase.from('wallets').select('*').eq('user_id', userId).single();
  
  if (fetchError || !wallet) {
      console.error("Wallet fetch error in updateWallet:", JSON.stringify(fetchError));
      throw new Error("Wallet not found");
  }

  const updates: any = {};
  if (type === 'increment') updates[field] = wallet[field] + amount;
  else updates[field] = Math.max(0, wallet[field] - amount);

  if (field === 'balance') {
      const newBalance = updates.balance;
      updates.withdrawable = Math.max(0, newBalance - wallet.pending_withdraw);
  }
  
  const { error: updateError } = await supabase.from('wallets').update(updates).eq('user_id', userId);
  
  if (updateError) {
      console.error("Wallet update error:", JSON.stringify(updateError));
      throw new Error("Failed to update wallet balance");
  }
};

// --- REFERRAL COMMISSION LOGIC ---
const distributeReferralReward = async (userId: string, earningAmount: number) => {
    if (earningAmount <= 0) return;

    const { data: userProfile } = await supabase.from('profiles').select('referred_by, name_1').eq('id', userId).single();
    
    if (!userProfile || !userProfile.referred_by) return;

    const { data: referrerProfile } = await supabase.from('profiles').select('id').eq('ref_code_1', userProfile.referred_by).maybeSingle();
    
    if (!referrerProfile) return;

    const commission = Number((earningAmount * 0.05).toFixed(4));
    
    if (commission < 0.001) return;

    const { data: rWallet } = await supabase.from('wallets').select('*').eq('user_id', referrerProfile.id).single();
    if (rWallet) {
        await supabase.from('wallets').update({
            balance: rWallet.balance + commission,
            withdrawable: rWallet.withdrawable + commission,
            total_earning: rWallet.total_earning + commission,
            referral_earnings: (rWallet.referral_earnings || 0) + commission
        }).eq('user_id', referrerProfile.id);

        await createTransaction(referrerProfile.id, 'referral', commission, `5% Commission from ${userProfile.name_1 || 'User'}`);
        
        const { data: refRecord } = await supabase.from('referrals').select('*')
            .eq('referrer_id', referrerProfile.id)
            .eq('referred_id', userId)
            .maybeSingle();
            
        if (refRecord) {
            await supabase.from('referrals').update({
                earned: refRecord.earned + commission
            }).eq('id', refRecord.id);
        }

        await supabase.from('notifications').insert({
            user_id: referrerProfile.id,
            title: 'Commission Earned! 💸',
            message: `You earned $${commission.toFixed(4)} from ${userProfile.name_1 || 'Team Member'}. Keep growing your network!`,
            type: 'success'
        });
    }
};

// --- GAME LOGIC ---
export const processGameResult = async (userId: string, gameId: string, gameName: string, bet: number, payout: number, details: string) => {
    let finalPayout = payout;
    const initialProfit = payout - bet;
    
    if (initialProfit > 0) {
        const adminFeePercent = 0.05; 
        const fee = initialProfit * adminFeePercent;
        finalPayout = payout - fee;
        details += ` (Fee: $${fee.toFixed(2)})`;
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
};

export const claimTask = async (userId: string, task: Task) => {
    const { data: w, error: walletFetchError } = await supabase.from('wallets').select('*').eq('user_id', userId).single();
    if (walletFetchError || !w) throw new Error("Wallet not found");

    const currentBal = Number(w.balance) || 0;
    const reward = Number(task.reward) || 0;
    const pending = Number(w.pending_withdraw) || 0;
    const totalEarn = Number(w.total_earning) || 0;
    const todayEarn = Number(w.today_earning) || 0;

    const newBalance = currentBal + reward;

    const { error: updateError } = await supabase.from('wallets').update({
        balance: newBalance,
        withdrawable: Math.max(0, newBalance - pending),
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
    
    return true;
}

export const claimInvestmentReturn = async (userId: string, investment: ActiveInvestment) => {
    const now = new Date();
    const nextClaim = new Date(investment.next_claim_at);

    if (now < nextClaim) {
        throw new Error("Claim not available yet. Please wait.");
    }

    const dailyProfit = investment.daily_return;
    
    await updateWallet(userId, dailyProfit, 'increment', 'balance');
    
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
        await updateWallet(userId, investment.amount, 'increment', 'balance');
        await createTransaction(userId, 'earn', investment.amount, `Capital Return: ${investment.plan_name}`);
        await supabase.from('investments').update({ status: 'completed' }).eq('id', investment.id);
    }
};

export const saveWithdrawMethod = async (userId: string, method: string, number: string, isAuto: boolean) => {
    const { data: settings } = await supabase.from('withdrawal_settings').select('*').maybeSingle();
    const fee = settings?.id_change_fee || 30;

    const { data: existing } = await supabase.from('user_withdrawal_methods').select('*').eq('user_id', userId).maybeSingle();

    if (existing) {
        if (existing.account_number !== number) {
            const { data: wallet } = await supabase.from('wallets').select('balance').eq('user_id', userId).single();
            if (!wallet || wallet.balance < fee) {
                throw new Error(`Insufficient balance. Changing the saved number costs ${fee} TK.`);
            }
            await updateWallet(userId, fee, 'decrement', 'balance');
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

export const requestWithdrawal = async (userId: string, amount: number, method: string) => {
    const { data: profile } = await supabase.from('profiles').select('is_withdraw_blocked, is_kyc_1').eq('id', userId).single();
    const { data: settings } = await supabase.from('withdrawal_settings').select('*').maybeSingle();
    
    if (profile?.is_withdraw_blocked) throw new Error("Withdrawals are blocked for this account.");
    if (settings?.kyc_required && !profile?.is_kyc_1) throw new Error("KYC Verification required.");
    
    let withdrawalFee = 0;
    if (settings) {
        if (amount < settings.min_withdraw) throw new Error(`Minimum withdrawal is $${settings.min_withdraw}`);
        if (amount > settings.max_withdraw) throw new Error(`Maximum withdrawal is $${settings.max_withdraw}`);
        
        const today = new Date().toISOString().split('T')[0];
        const { data: dailyTx } = await supabase.from('transactions').select('amount').eq('user_id', userId).eq('type', 'withdraw').gte('created_at', `${today}T00:00:00`);
        
        const dailyTotal = (dailyTx || []).reduce((sum, t) => sum + t.amount, 0);
        if ((dailyTotal + amount) > settings.daily_limit) throw new Error(`Daily limit exceeded.`);

        if (settings.withdraw_fee_percent > 0) {
            withdrawalFee = (amount * settings.withdraw_fee_percent) / 100;
        }
    }

    const { data: wallet } = await supabase.from('wallets').select('*').eq('user_id', userId).single();
    if (!wallet || wallet.withdrawable < amount) throw new Error("Insufficient withdrawable balance.");

    const { error } = await supabase.from('withdraw_requests').insert({
        user_id: userId,
        amount: amount, 
        method,
        status: 'pending'
    });
    if (error) throw error;

    await supabase.from('wallets').update({
        pending_withdraw: wallet.pending_withdraw + amount,
        withdrawable: wallet.withdrawable - amount
    }).eq('user_id', userId);

    const feeText = withdrawalFee > 0 ? ` (Inc. $${withdrawalFee.toFixed(2)} fee)` : '';
    await createTransaction(userId, 'withdraw', amount, `Withdraw request via ${method}${feeText}`);
};

export const processMonthlyPayment = async (userId: string, balance: number, method: string) => {
    const bonus = Number((balance * 0.02).toFixed(2));
    const totalPayout = balance + bonus;
    
    const { error: wErr } = await supabase.from('wallets').update({
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

    await supabase.from('notifications').insert({
        user_id: userId,
        title: 'Monthly Payment Sent',
        message: `We have sent $${totalPayout.toFixed(2)} (includes 2% bonus) to your ${method} account.`,
        type: 'success'
    });
};
