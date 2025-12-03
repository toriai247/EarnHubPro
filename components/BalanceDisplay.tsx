import React, { useState } from 'react';
import { useCurrency } from '../context/CurrencyContext';

interface BalanceDisplayProps {
    amount: number;
    className?: string;
    isHeader?: boolean;
    isNative?: boolean; 
    decimals?: number;
}

const BalanceDisplay: React.FC<BalanceDisplayProps> = ({ amount, className = '', isHeader = false, isNative = false, decimals = 2 }) => {
    const { format } = useCurrency();
    const [showFull, setShowFull] = useState(false);

    const value = amount || 0;
    const useCompact = !showFull && value > 10000;
    const formatted = format(value, { compact: useCompact, isNative, decimals });

    return (
        <div 
            onClick={(e) => { e.stopPropagation(); setShowFull(!showFull); }}
            className={`cursor-pointer inline-block select-none ${className}`}
            title={showFull ? "Click to compact" : "Click to view exact amount"}
        >
            <span>{formatted}</span>
        </div>
    );
};

export default BalanceDisplay;