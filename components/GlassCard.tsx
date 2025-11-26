import React from 'react';

interface GlassCardProps {
  children: React.ReactNode;
  className?: string;
  glow?: boolean; // Retained prop for API compatibility, used for accent border
  onClick?: () => void;
}

const GlassCard: React.FC<GlassCardProps> = ({ children, className = '', glow = false, onClick }) => {
  return (
    <div 
      onClick={onClick}
      className={`
        relative overflow-hidden rounded-xl p-6 transition-all duration-200
        bg-surface border border-border-neo shadow-neo
        ${glow ? 'border-electric-500 shadow-[5px_5px_0px_0px_#004499]' : ''}
        ${onClick ? 'cursor-pointer hover:-translate-y-1 hover:shadow-neo-lg active:translate-y-0 active:shadow-none' : ''}
        ${className}
      `}
    >
      {/* Content */}
      <div className="relative z-10 h-full w-full">
        {children}
      </div>
    </div>
  );
};

export default GlassCard;