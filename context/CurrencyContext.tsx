
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

                    if (data?.currency && CURRENCY_CONFIG[data.currency as CurrencyCode]) {
                        if (mounted) setCurrencyState(data.currency as CurrencyCode);
                    }
                }
            } catch (error) {
                console.error("Currency Sync Error:", error);
            } finally {
                if (mounted) setIsLoading(false);
            }
        };

        syncCurrency();

        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
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
            // 1. Fetch Fresh Balance (Security Check)
            const { data: wallet, error: fetchError } = await supabase
                .from('wallets')
                .select('balance')
                .eq('user_id', userId)
                .single();

            if (fetchError || !wallet) throw new Error("Failed to retrieve wallet balance.");

            const currentBalance = wallet.balance;
            const fee = currentBalance * 0.05; // 5% Fee

            // 2. Check Funds
            if (currentBalance < fee) {
                throw new Error(`Insufficient balance to pay the 5% exchange fee ($${fee.toFixed(2)}).`);
            }

            // 3. Deduct Fee
            if (fee > 0) {
                await updateWallet(userId, fee, 'decrement', 'balance');
                await createTransaction(userId, 'penalty', fee, `Currency Switch Fee (${currency} to ${targetCode})`);
            }

            // 4. Update Database Preference
            const { error } = await supabase.from('wallets').update({ currency: targetCode }).eq('user_id', userId);
            if (error) throw error;

            // 5. Update State & Local Storage
            setCurrencyState(targetCode);
            localStorage.setItem('eh_currency', targetCode);
            
            // 6. Trigger Global Refresh
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
