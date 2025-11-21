
import React, { useState } from 'react';
import { useCurrency } from '../context/CurrencyContext';
import { motion, AnimatePresence } from 'framer-motion';

interface BalanceDisplayProps {
    amount: number; // Amount in USD (Base)
    className?: string;
    isHeader?: boolean;
}

const BalanceDisplay: React.FC<BalanceDisplayProps> = ({ amount, className = '', isHeader = false }) => {
    const { format, rate } = useCurrency();
    const [showFull, setShowFull] = useState(false);

    // Calculate value in selected currency to determine if compaction is needed
    const value = (amount || 0) * rate;
    
    // Compact if value > 10,000 AND user hasn't toggled to full view.
    // This applies to headers, cards, and everywhere this component is used.
    const useCompact = !showFull && value > 10000;

    const formatted = format(amount, useCompact);

    return (
        <div 
            onClick={(e) => { e.stopPropagation(); setShowFull(!showFull); }}
            className={`cursor-pointer relative inline-block group select-none ${className}`}
            title={showFull ? "Click to compact" : "Click to view exact amount"}
        >
            <AnimatePresence mode="wait">
                <motion.span
                    key={showFull ? 'full' : 'compact'}
                    initial={{ opacity: 0, y: 2 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -2 }}
                    transition={{ duration: 0.15 }}
                >
                    {formatted}
                </motion.span>
            </AnimatePresence>
            
            {/* Only show hint tooltip if not in a tight header space */}
            {!isHeader && (
                <span className="absolute -bottom-4 left-1/2 -translate-x-1/2 text-[8px] text-gray-500 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                    {showFull ? 'Compact' : 'Full'}
                </span>
            )}
        </div>
    );
};

export default BalanceDisplay;
