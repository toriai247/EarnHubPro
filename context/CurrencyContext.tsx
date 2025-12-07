
import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../integrations/supabase/client';
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
    format: (amountInBDT: number, options?: FormatOptions) => string;
    bdtToSelected: (amountInBDT: number) => number;
    selectedToBDT: (amountInSelected: number) => number;
    symbol: string;
    rate: number;
    isLoading: boolean;
}

const CurrencyContext = createContext<CurrencyContextType | undefined>(undefined);

export const CurrencyProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [currency, setCurrencyState] = useState<CurrencyCode>('BDT'); // Default BDT
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
                setCurrencyState('BDT');
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
            // Update Preference Only - Database values remain in BDT
            const { error } = await supabase.from('wallets').update({ currency: targetCode }).eq('user_id', userId);
            if (error) throw error;

            setCurrencyState(targetCode);
            localStorage.setItem('eh_currency', targetCode);
            
            return true;
        } catch (e: any) {
            console.error("Currency Switch Error:", e);
            return false;
        } finally {
            setIsLoading(false);
        }
    };

    // Convert BDT Amount -> Display String
    const format = (amountInBDT: number, options?: FormatOptions) => {
        const { compact = false, isNative = false, decimals = 2 } = options || {};
        
        let val = amountInBDT || 0;
        const config = CURRENCY_CONFIG[currency];
        const symbol = config.symbol;

        // Convert BDT to Selected Currency (if not already converted/native)
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
            currency: 'USD', // Fallback for formatting structure
            minimumFractionDigits: decimals,
            maximumFractionDigits: decimals
        }).format(val).replace('$', symbol).replace('USD', '');
    };

    // Helper: BDT -> Selected Currency Value
    const bdtToSelected = (amountInBDT: number) => {
        return amountInBDT * CURRENCY_CONFIG[currency].rate;
    };

    // Helper: Selected Currency Value -> BDT (for Inputs)
    const selectedToBDT = (amountInSelected: number) => {
        const rate = CURRENCY_CONFIG[currency].rate;
        if (!rate) return amountInSelected;
        return amountInSelected / rate;
    };

    return (
        <CurrencyContext.Provider value={{ 
            currency, 
            setCurrency, 
            format, 
            bdtToSelected,
            selectedToBDT,
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
