
import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../integrations/supabase/client';
import { updateWallet, createTransaction } from '../lib/actions';

type CurrencyCode = 'USD' | 'BDT' | 'EUR' | 'INR' | 'GBP';

interface CurrencyData {
    code: CurrencyCode;
    rate: number;
    symbol: string;
}

// Real-time rates simulation (Base: USD)
const RATES: Record<CurrencyCode, CurrencyData> = {
    USD: { code: 'USD', rate: 1, symbol: '$' },
    BDT: { code: 'BDT', rate: 120, symbol: '৳' },
    EUR: { code: 'EUR', rate: 0.92, symbol: '€' },
    INR: { code: 'INR', rate: 84, symbol: '₹' },
    GBP: { code: 'GBP', rate: 0.79, symbol: '£' },
};

interface CurrencyContextType {
    currency: CurrencyCode;
    setCurrency: (code: CurrencyCode, userId: string) => Promise<boolean>;
    format: (amountInUSD: number, compact?: boolean) => string;
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
                    // Logged in: Prioritize Database Setting
                    const { data, error } = await supabase
                        .from('wallets')
                        .select('currency')
                        .eq('user_id', session.user.id)
                        .maybeSingle();

                    if (data?.currency && RATES[data.currency as CurrencyCode]) {
                        const dbCurrency = data.currency as CurrencyCode;
                        if (mounted) {
                            setCurrencyState(dbCurrency);
                            localStorage.setItem('eh_currency', dbCurrency); // Keep local in sync
                        }
                    } else {
                        // If DB has no currency set, check local or default to USD
                        const local = localStorage.getItem('eh_currency');
                        if (local && RATES[local as CurrencyCode]) {
                            // Sync local back to DB if DB is empty
                            if (mounted) setCurrencyState(local as CurrencyCode);
                            await supabase.from('wallets').update({ currency: local }).eq('user_id', session.user.id);
                        }
                    }
                } else {
                    // Logged out: Use LocalStorage or Default
                    const local = localStorage.getItem('eh_currency');
                    if (local && RATES[local as CurrencyCode]) {
                        if (mounted) setCurrencyState(local as CurrencyCode);
                    } else {
                        if (mounted) setCurrencyState('USD');
                    }
                }
            } catch (error) {
                console.error("Currency Sync Error:", error);
            } finally {
                if (mounted) setIsLoading(false);
            }
        };

        // Initial Sync
        syncCurrency();

        // Listen for Auth Changes (Login/Logout) to refresh currency immediately
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
            if (event === 'SIGNED_IN' && session) {
                setIsLoading(true);
                syncCurrency();
            } else if (event === 'SIGNED_OUT') {
                setCurrencyState('USD');
                localStorage.removeItem('eh_currency'); // Clear prev user preference
            }
        });

        return () => {
            mounted = false;
            subscription.unsubscribe();
        };
    }, []);

    const setCurrency = async (code: CurrencyCode, userId: string): Promise<boolean> => {
        if (code === currency) return true;

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
                await createTransaction(userId, 'fee', fee, `Currency Switch Fee (${currency} to ${code})`);
            }

            // 4. Update Database Preference
            const { error } = await supabase.from('wallets').update({ currency: code }).eq('user_id', userId);
            if (error) throw error;

            // 5. Update State & Local Storage
            setCurrencyState(code);
            localStorage.setItem('eh_currency', code);
            
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

    const format = (amountInUSD: number, compact: boolean = false) => {
        // Handle undefined or null safely
        const val = amountInUSD || 0;
        
        const targetRate = RATES[currency].rate;
        const converted = val * targetRate;
        const symbol = RATES[currency].symbol;

        if (compact) {
            if (converted >= 1000000000000) return `${symbol}${(converted / 1000000000000).toFixed(2)}T`;
            if (converted >= 1000000000) return `${symbol}${(converted / 1000000000).toFixed(2)}B`;
            if (converted >= 1000000) return `${symbol}${(converted / 1000000).toFixed(2)}M`;
            if (converted >= 1000) return `${symbol}${(converted / 1000).toFixed(1)}K`;
        }

        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: currency === 'BDT' ? 'BDT' : currency,
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }).format(converted).replace('BDT', '৳'); // Custom replacement for BDT symbol
    };

    return (
        <CurrencyContext.Provider value={{ 
            currency, 
            setCurrency, 
            format, 
            symbol: RATES[currency].symbol, 
            rate: RATES[currency].rate,
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
