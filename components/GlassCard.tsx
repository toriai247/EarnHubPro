
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
        bg-white/60 dark:bg-slate-900/40 
        backdrop-blur-md
        border border-slate-200/50 dark:border-white/10
        shadow-sm dark:shadow-none
        ${glow ? 'shadow-[0_0_25px_rgba(59,130,246,0.15)] dark:shadow-[0_0_25px_rgba(37,99,235,0.15)] border-royal-500/30' : ''}
        ${onClick ? 'cursor-pointer hover:bg-white/80 dark:hover:bg-slate-900/60 hover:border-royal-200 dark:hover:border-royal-500/40 hover:shadow-md' : ''}
        ${className}
      `}
    >
      {glow && (
        <div className="absolute -top-10 -right-10 w-24 h-24 bg-royal-500/10 dark:bg-royal-500/20 blur-2xl rounded-full pointer-events-none"></div>
      )}
      {children}
    </div>
  );
};

export default GlassCard;
