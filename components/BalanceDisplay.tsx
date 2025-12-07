
import React, { useState, useEffect, useRef } from 'react';
import { useCurrency } from '../context/CurrencyContext';
import { motion } from 'framer-motion';

interface BalanceDisplayProps {
    amount: number;
    className?: string;
    isHeader?: boolean;
    isNative?: boolean; 
    decimals?: number;
    compact?: boolean;
}

const BalanceDisplay: React.FC<BalanceDisplayProps> = ({ amount, className = '', isHeader = false, isNative = false, decimals = 2, compact }) => {
    const { format } = useCurrency();
    const [showFull, setShowFull] = useState(false);

    // Animation State
    const value = amount || 0;
    const prevValueRef = useRef(value);
    const [animState, setAnimState] = useState<'inc' | 'dec' | null>(null);

    useEffect(() => {
        // Detect change direction
        if (value !== prevValueRef.current) {
            if (value > prevValueRef.current) {
                setAnimState('inc');
            } else if (value < prevValueRef.current) {
                setAnimState('dec');
            }
            
            prevValueRef.current = value;

            // Reset animation state after effect plays
            const timer = setTimeout(() => setAnimState(null), 600);
            return () => clearTimeout(timer);
        }
    }, [value]);

    const useCompact = !showFull && (compact !== undefined ? compact : value > 10000);
    const formatted = format(value, { compact: useCompact, isNative, decimals });

    return (
        <motion.div 
            onClick={(e) => { e.stopPropagation(); setShowFull(!showFull); }}
            className={`cursor-pointer inline-block select-none ${className}`}
            title={showFull ? "Click to compact" : "Click to view exact amount"}
            animate={animState ? {
                scale: [1, 1.1, 1], // Subtle pulse
                color: animState === 'inc' ? '#4ade80' : '#ef4444', // Green-400 or Red-500
                textShadow: animState === 'inc' ? '0 0 8px rgba(74, 222, 128, 0.5)' : '0 0 8px rgba(239, 68, 68, 0.5)'
            } : { 
                scale: 1, 
                textShadow: 'none'
            }}
            transition={{ duration: 0.4, ease: "easeOut" }}
        >
            <span>{formatted}</span>
        </motion.div>
    );
};

export default BalanceDisplay;
