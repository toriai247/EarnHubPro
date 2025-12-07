
import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../integrations/supabase/client';
import { updateWallet, createTransaction } from '../lib/actions';
import { CURRENCY_CONFIG } from '../constants';

type CurrencyCode = keyof typeof CURRENCY_CONFIG;

interface FormatOptions {
    compact?: boolean;
    isNative?: boolean; 
    decimals?: number;
}

interface CurrencyContextType {
    currency: CurrencyCode;
    setCurrency: (code: CurrencyCode, userId: string) => Promise<boolean>;
    format: (amount: number, options?: FormatOptions) => string;
    amountToUSD: (localAmount: number) => number; // New Helper
    symbol: string;
    rate: number;
    isLoading: boolean;
}

const CurrencyContext = createContext<CurrencyContextType | undefined>(undefined);

export const CurrencyProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [currency, setCurrencyState] = useState<CurrencyCode>('USD');
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        let mounted = true;

        const syncCurrency = async () => {
            try {
                const { data: { session } } = await supabase.auth.getSession();
                
                if (session) {
                    // Fetch user preference
                    const { data } = await supabase
                        .from('wallets')
                        .select('currency')
                        .eq('user_id', session.user.id)
                        .maybeSingle();

                    if ((data as any)?.currency && CURRENCY_CONFIG[(data as any).currency as CurrencyCode]) {
                        if (mounted) setCurrencyState((data as any).currency as CurrencyCode);
                    }
                }
            } catch (error) {
                console.error("Currency Sync Error:", error);
            } finally {
                if (mounted) setIsLoading(false);
            }
        };

        syncCurrency();

        const { data: { subscription } } = supabase.auth.onAuthStateChange((event: string, session: any) => {
            if (event === 'SIGNED_IN' && session) {
                syncCurrency();
            } else if (event === 'SIGNED_OUT') {
                setCurrencyState('USD');
            }
        });

        return () => {
            mounted = false;
            subscription.unsubscribe();
        };
    }, []);

    const setCurrency = async (targetCode: CurrencyCode, userId: string): Promise<boolean> => {
        if (targetCode === currency) return true;

        setIsLoading(true);
        try {
            // 1. Fetch Fresh Wallet State
            const { data: wallet, error: fetchError } = await supabase
                .from('wallets')
                .select('*')
                .eq('user_id', userId)
                .single();

            if (fetchError || !wallet) throw new Error("Failed to retrieve wallet balance.");

            // 2. Fee Logic (5% of current total balance value)
            // Fee is deducted from the MAIN balance if possible, or total assets reduction
            // For simplicity, we deduct from 'main_balance' equivalent.
            
            const currentBalance = (wallet as any).balance || 0; // Usually main balance
            const fee = currentBalance * 0.05; 

            // Check if user has enough to cover fee
            if (currentBalance < fee) {
                throw new Error(`Insufficient balance to pay the 5% exchange fee (${format(fee, { isNative: true })}).`);
            }

            // 3. Calculate Ratio between Old and New Currency
            const oldRate = CURRENCY_CONFIG[currency].rate;
            const newRate = CURRENCY_CONFIG[targetCode].rate;
            
            // Example: USD(1) -> BDT(120). Ratio = 120/1 = 120. 
            // 1 USD becomes 120 BDT.
            const ratio = newRate / oldRate;

            // 4. Prepare Converted Values
            // First deduct fee from current balance
            const balAfterFee = currentBalance - fee;
            const mainAfterFee = ((wallet as any).main_balance || 0) - fee; // Assuming fee taken from main

            // Convert Function
            const convert = (val: number) => (val || 0) * ratio;

            const updates = {
                currency: targetCode,
                // Core Balances
                balance: balAfterFee * ratio,
                main_balance: mainAfterFee * ratio,
                deposit_balance: convert((wallet as any).deposit_balance),
                game_balance: convert((wallet as any).game_balance),
                earning_balance: convert((wallet as any).earning_balance),
                investment_balance: convert((wallet as any).investment_balance),
                referral_balance: convert((wallet as any).referral_balance),
                commission_balance: convert((wallet as any).commission_balance),
                bonus_balance: convert((wallet as any).bonus_balance),
                
                // Stats / Legacy Fields
                deposit: convert((wallet as any).deposit),
                withdrawable: convert((wallet as any).withdrawable),
                total_earning: convert((wallet as any).total_earning),
                today_earning: convert((wallet as any).today_earning),
                pending_withdraw: convert((wallet as any).pending_withdraw),
                referral_earnings: convert((wallet as any).referral_earnings)
            };

            // 5. Commit Updates to DB
            const { error } = await supabase.from('wallets').update(updates).eq('user_id', userId);
            if (error) throw error;

            // 6. Log Transaction (Fee)
            // We log the fee amount in the OLD currency context for record keeping
            await createTransaction(userId, 'penalty', fee, `Currency Switch Fee (${currency} to ${targetCode})`);

            // 7. Update Local State
            setCurrencyState(targetCode);
            localStorage.setItem('eh_currency', targetCode);
            
            // 8. Trigger Global Refresh
            window.dispatchEvent(new Event('wallet_updated'));
            
            return true;
        } catch (e: any) {
            console.error("Currency Switch Error:", e);
            alert(e.message || "Failed to switch currency.");
            return false;
        } finally {
            setIsLoading(false);
        }
    };

    const format = (amount: number, options?: FormatOptions) => {
        const { compact = false, isNative = false, decimals = 2 } = options || {};
        
        let val = amount || 0;
        const config = CURRENCY_CONFIG[currency];
        const symbol = config.symbol;

        // Convert Base USD to Target Currency (Unless isNative is true, meaning it's already converted)
        if (!isNative) {
            val = val * config.rate;
        }

        if (compact) {
            if (val >= 1000000000000) return `${symbol}${(val / 1000000000000).toFixed(2)}T`;
            if (val >= 1000000000) return `${symbol}${(val / 1000000000).toFixed(2)}B`;
            if (val >= 1000000) return `${symbol}${(val / 1000000).toFixed(2)}M`;
            if (val >= 1000) return `${symbol}${(val / 1000).toFixed(1)}K`;
        }

        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD', // Hack to keep formatting clean
            minimumFractionDigits: decimals,
            maximumFractionDigits: decimals
        }).format(val).replace('$', symbol).replace('USD', '');
    };

    // Helper: Converts local currency input (e.g. 120 BDT) back to Base USD (1.00 USD)
    const amountToUSD = (localAmount: number) => {
        const config = CURRENCY_CONFIG[currency];
        if (!config || config.rate === 0) return localAmount;
        return localAmount / config.rate;
    };

    return (
        <CurrencyContext.Provider value={{ 
            currency, 
            setCurrency, 
            format, 
            amountToUSD,
            symbol: CURRENCY_CONFIG[currency].symbol, 
            rate: CURRENCY_CONFIG[currency].rate,
            isLoading 
        }}>
            {children}
        </CurrencyContext.Provider>
    );
};

export const useCurrency = () => {
    const context = useContext(CurrencyContext);
    if (!context) throw new Error("useCurrency must be used within CurrencyProvider");
    return context;
};
