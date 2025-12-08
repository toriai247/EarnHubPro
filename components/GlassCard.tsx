
import React from 'react';
import { Loader2 } from 'lucide-react';

interface GlassCardProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  glow?: boolean; 
  loading?: boolean;
}

const GlassCard: React.FC<GlassCardProps> = ({ children, className = '', onClick, glow, loading }) => {
  return (
    <div 
      onClick={onClick}
      className={`
        bg-card border border-border-base rounded-lg p-5 transition-colors duration-300 shadow-sm relative overflow-hidden
        ${glow ? 'border-brand shadow-glow' : ''}
        ${onClick ? 'cursor-pointer hover:bg-input hover:border-border-highlight' : ''}
        ${className}
      `}
    >
      {loading && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <Loader2 className="animate-spin text-brand" size={32} />
        </div>
      )}
      {children}
    </div>
  );
};

export default GlassCard;
