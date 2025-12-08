import React, { useState } from 'react';
import { useSystem } from '../context/SystemContext';
import { ImageOff, Loader2 } from 'lucide-react';

interface SmartImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
    fallbackSrc?: string;
    placeholderClassName?: string;
}

const SmartImage: React.FC<SmartImageProps> = ({ src, alt, className, placeholderClassName, fallbackSrc, ...props }) => {
    const { lowDataMode } = useSystem();
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(false);

    if (lowDataMode) {
        return (
            <div className={`flex flex-col items-center justify-center bg-white/5 border border-white/5 text-gray-600 rounded-lg overflow-hidden ${className} ${placeholderClassName}`}>
                <ImageOff size={24} className="opacity-50" />
                <span className="text-[9px] font-bold uppercase mt-1 opacity-50">Data Saver</span>
            </div>
        );
    }

    return (
        <div className={`relative overflow-hidden ${className}`}>
            {isLoading && (
                <div className="absolute inset-0 flex items-center justify-center bg-white/5">
                    <Loader2 size={20} className="animate-spin text-gray-500" />
                </div>
            )}
            <img 
                src={error && fallbackSrc ? fallbackSrc : src} 
                alt={alt} 
                className={`w-full h-full object-cover transition-opacity duration-300 ${isLoading ? 'opacity-0' : 'opacity-100'}`}
                onLoad={() => setIsLoading(false)}
                onError={() => { setError(true); setIsLoading(false); }}
                loading="lazy"
                {...props} 
            />
        </div>
    );
};

export default SmartImage;