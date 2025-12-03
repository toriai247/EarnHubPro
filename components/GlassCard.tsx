
import React from 'react';

interface GlassCardProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  glow?: boolean; 
}

const GlassCard: React.FC<GlassCardProps> = ({ children, className = '', onClick, glow }) => {
  return (
    <div 
      onClick={onClick}
      className={`
        bg-card border border-border-base rounded-lg p-5 transition-colors duration-300 shadow-sm
        ${glow ? 'border-brand shadow-glow' : ''}
        ${onClick ? 'cursor-pointer hover:bg-input hover:border-border-highlight' : ''}
        ${className}
      `}
    >
      {children}
    </div>
  );
};

export default GlassCard;
