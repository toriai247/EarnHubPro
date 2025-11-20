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
        relative overflow-hidden rounded-2xl glass-panel p-5 
        transition-all duration-300 
        ${glow ? 'shadow-[0_0_25px_rgba(37,99,235,0.15)] border-royal-500/30' : ''}
        ${onClick ? 'cursor-pointer glass-card-hover active:scale-[0.98]' : ''}
        ${className}
      `}
    >
      {glow && (
        <div className="absolute -top-10 -right-10 w-24 h-24 bg-royal-500/20 blur-2xl rounded-full pointer-events-none"></div>
      )}
      {children}
    </div>
  );
};

export default GlassCard;