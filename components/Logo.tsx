
import React from 'react';

interface LogoProps {
  className?: string;
  showText?: boolean;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

const Logo: React.FC<LogoProps> = ({ className = '', showText = true, size = 'md' }) => {
  const dim = size === 'xl' ? 'w-20 h-20' : size === 'lg' ? 'w-14 h-14' : size === 'md' ? 'w-10 h-10' : 'w-8 h-8';
  const textSize = size === 'xl' ? 'text-4xl' : size === 'lg' ? 'text-2xl' : size === 'md' ? 'text-xl' : 'text-sm';
  
  return (
    <div className={`flex items-center gap-3 group ${className}`}>
      <div className={`relative ${dim} flex items-center justify-center bg-black border-2 border-brand rounded-2xl shadow-[0_0_20px_rgba(255,190,11,0.15)] transition-all duration-500 group-hover:rotate-[360deg] overflow-hidden`}>
        {/* Geometric N Icon */}
        <svg viewBox="0 0 24 24" className="w-2/3 h-2/3 text-brand" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
          <polyline points="9 17 9 7 15 17 15 7" />
        </svg>
        {/* Animated Shine Effect */}
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full animate-shimmer"></div>
      </div>
      {showText && (
        <span className={`font-display font-black tracking-tighter text-white uppercase ${textSize}`}>
          NAX<span className="text-brand">SIVO</span>
        </span>
      )}
    </div>
  );
};

export default Logo;
