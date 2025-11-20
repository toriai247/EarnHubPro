import React from 'react';
import { Loader2 } from 'lucide-react';

interface LoaderProps {
  className?: string;
  size?: number;
}

const Loader: React.FC<LoaderProps> = ({ className = "text-neon-green", size = 24 }) => (
  <div className="flex justify-center items-center p-4 w-full">
    <Loader2 className={`animate-spin ${className}`} size={size} />
  </div>
);

export default Loader;