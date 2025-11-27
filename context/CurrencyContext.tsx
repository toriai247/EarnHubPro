
import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../integrations/supabase/client';
import { CURRENCY_CONFIG } from '../constants';

type CurrencyCode = keyof typeof CURRENCY_CONFIG;

interface FormatOptions {
    compact?: boolean;
    isNative?: boolean; 
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

    // Just updates the preference, DOES NOT change database values (Database is always USD)
    const setCurrency = async (targetCode: CurrencyCode, userId: string): Promise<boolean> => {
        setIsLoading(true);
        try {
            await supabase.from('wallets').update({ currency: targetCode }).eq('user_id', userId);
            setCurrencyState(targetCode);
            return true;
        } catch (e: any) {
            console.error("Currency Switch Error:", e);
            return false;
        } finally {
            setIsLoading(false);
        }
    };

    const format = (amount: number, options?: FormatOptions) => {
        const { compact = false } = options || {};
        
        let val = amount || 0;
        const config = CURRENCY_CONFIG[currency];
        const symbol = config.symbol;

        // Convert Base USD to Target Currency
        // Example: 1 USD * 120 Rate = 120 BDT
        val = val * config.rate;

        if (compact) {
            if (val >= 1000000000000) return `${symbol}${(val / 1000000000000).toFixed(2)}T`;
            if (val >= 1000000000) return `${symbol}${(val / 1000000000).toFixed(2)}B`;
            if (val >= 1000000) return `${symbol}${(val / 1000000).toFixed(2)}M`;
            if (val >= 1000) return `${symbol}${(val / 1000).toFixed(1)}K`;
        }

        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD', // Hack to keep formatting clean, we replace symbol manually
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }).format(val).replace('$', symbol).replace('USD', '');
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
