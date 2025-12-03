
import React from 'react';

interface LogoProps {
  className?: string;
  showText?: boolean;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

const Logo: React.FC<LogoProps> = ({ className = '', showText = true, size = 'md' }) => {
  // Size mapping
  const dim = size === 'xl' ? 'w-16 h-16' : size === 'lg' ? 'w-12 h-12' : size === 'md' ? 'w-8 h-8' : 'w-6 h-6';
  const textSize = size === 'xl' ? 'text-4xl' : size === 'lg' ? 'text-2xl' : size === 'md' ? 'text-lg' : 'text-sm';
  const shadowClass = size === 'xl' || size === 'lg' ? 'shadow-[4px_4px_0px_0px_#004499]' : 'shadow-[2px_2px_0px_0px_#004499]';

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div className={`relative ${dim} flex items-center justify-center bg-electric-500 rounded-lg border border-electric-400 ${shadowClass} transition-transform group-hover:-translate-y-0.5 group-active:translate-y-0 group-active:shadow-none overflow-hidden`}>
         <img 
            src="https://tyhujeggtfpbkpywtrox.supabase.co/storage/v1/object/public/Png%20icons/3d%20(1)%20UP.jpg" 
            alt="Naxxivo" 
            className="w-full h-full object-cover"
         />
      </div>
      {showText && (
        <span className={`font-display font-black tracking-tight text-white uppercase ${textSize}`}>
          Naxxivo
        </span>
      )}
    </div>
  );
};

export default Logo;
