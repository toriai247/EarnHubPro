import React from 'react';

interface SkeletonProps {
  className?: string;
  variant?: 'text' | 'circular' | 'rectangular';
}

const Skeleton: React.FC<SkeletonProps> = ({ className = '', variant = 'rectangular' }) => {
  const baseStyles = "animate-pulse bg-white/5 border border-white/5";
  const variantStyles = {
    text: "rounded h-4 w-full",
    circular: "rounded-full",
    rectangular: "rounded-xl",
  };

  return (
    <div className={`${baseStyles} ${variantStyles[variant]} ${className}`}></div>
  );
};

export default Skeleton;