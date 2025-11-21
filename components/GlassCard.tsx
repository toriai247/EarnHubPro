
import React from 'react';

interface GlassCardProps {
  children: React.ReactNode;
  className?: string;
  glow?: boolean;
  onClick?: () => void;
}

const GlassCard: React.FC<GlassCardProps> = ({ children, className = '', glow = false, onClick }) => {
  return (
    <div 
      onClick={onClick}
      className={`
        relative overflow-hidden rounded-2xl p-5 transition-all duration-300
        
        /* Light Mode Styles */
        bg-white border-slate-200 shadow-sm
        hover:shadow-md hover:border-royal-200
        
        /* Dark Mode Styles (Overrides) */
        dark:bg-slate-900/40 
        dark:backdrop-blur-md
        dark:border-white/10
        dark:shadow-none
        dark:hover:bg-slate-900/60 
        dark:hover:border-royal-500/30
        
        border
        ${glow ? 'shadow-[0_0_25px_rgba(59,130,246,0.15)] dark:shadow-[0_0_25px_rgba(37,99,235,0.15)] border-royal-200 dark:border-royal-500/30' : ''}
        ${onClick ? 'cursor-pointer active:scale-[0.99]' : ''}
        ${className}
      `}
    >
      {glow && (
        <div className="absolute -top-10 -right-10 w-24 h-24 bg-royal-500/5 dark:bg-royal-500/20 blur-2xl rounded-full pointer-events-none"></div>
      )}
      <div className="relative z-10 h-full w-full">
        {children}
      </div>
    </div>
  );
};

export default GlassCard;
