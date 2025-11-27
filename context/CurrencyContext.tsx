

import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../integrations/supabase/client';
import { updateWallet, createTransaction } from '../lib/actions';
import { CURRENCY_CONFIG } from '../constants';

type CurrencyCode = keyof typeof CURRENCY_CONFIG;

interface FormatOptions {
    compact?: boolean;
    isNative?: boolean; // If true, assumes value is already in native currency (no conversion)
}

interface CurrencyContextType {
    currency: CurrencyCode;
    setCurrency: (code: CurrencyCode, userId: string) => Promise<boolean>;
    format: (amount: number, options?: FormatOptions) => string;
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
                    const { data } = await supabase
                        .from('wallets')
                        .select('currency')
                        .eq('user_id', session.user.id)
                        .maybeSingle();

                    if (data?.currency && CURRENCY_CONFIG[data.currency as CurrencyCode]) {
                        const dbCurrency = data.currency as CurrencyCode;
                        if (mounted) {
                            setCurrencyState(dbCurrency);
                        }
                    } else {
                        if (mounted) setCurrencyState('USD');
                    }
                } else {
                    if (mounted) setCurrencyState('USD');
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
                setIsLoading(true);
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

    // Switches the wallet's stored currency AND value (Exchange)
    const setCurrency = async (targetCode: CurrencyCode, userId: string): Promise<boolean> => {
        if (targetCode === currency) return true;

        setIsLoading(true);
        try {
            // 1. Fetch Fresh Balance
            const { data: wallet, error: fetchError } = await supabase
                .from('wallets')
                .select('*')
                .eq('user_id', userId)
                .single();

            if (fetchError || !wallet) throw new Error("Failed to retrieve wallet balance.");

            const currentRate = CURRENCY_CONFIG[currency].rate;
            const targetRate = CURRENCY_CONFIG[targetCode].rate;
            
            // Fee Calculation (5% of the *source* amount converted to base USD first for accuracy)
            const feePercent = 0.05;
            
            const convertField = (val: number) => {
                if (!val) return 0;
                const usdValue = val / currentRate; 
                const feeUSD = usdValue * feePercent;
                const netUSD = usdValue - feeUSD;
                return Number((netUSD * targetRate).toFixed(2));
            };

            const updates = {
                currency: targetCode,
                main_balance: convertField(wallet.main_balance),
                balance: convertField(wallet.balance),
                deposit: convertField(wallet.deposit),
                deposit_balance: convertField(wallet.deposit_balance),
                game_balance: convertField(wallet.game_balance),
                earning_balance: convertField(wallet.earning_balance),
                investment_balance: convertField(wallet.investment_balance),
                referral_balance: convertField(wallet.referral_balance),
                commission_balance: convertField(wallet.commission_balance),
                bonus_balance: convertField(wallet.bonus_balance),
                withdrawable: convertField(wallet.withdrawable),
                total_earning: convertField(wallet.total_earning),
                today_earning: convertField(wallet.today_earning)
            };

            // 3. Update Database
            const { error } = await supabase.from('wallets').update(updates).eq('user_id', userId);
            if (error) throw error;

            await createTransaction(userId, 'fee', 0, `Currency Switch: ${currency} to ${targetCode}`);

            // 4. Update State
            setCurrencyState(targetCode);
            
            // 5. Trigger Refresh
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
        const { compact = false, isNative = false } = options || {};
        
        let val = amount || 0;
        const config = CURRENCY_CONFIG[currency];
        const symbol = config.symbol;

        // If NOT native (e.g. Plan prices in USD), convert it to current currency
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
            currency: 'USD',
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }).format(val).replace('$', symbol);
    };

    return (
        <CurrencyContext.Provider value={{ 
            currency, 
            setCurrency, 
            format, 
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