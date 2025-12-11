import React, { useEffect, useRef } from 'react';

interface GoogleAdProps {
  className?: string;
  slot: string;
  layoutKey?: string;
  layout?: string;
  format?: string;
  responsive?: string;
}

const GoogleAd: React.FC<GoogleAdProps> = ({ 
  className = '', 
  slot,
  layoutKey,
  layout,
  format = 'fluid',
  responsive
}) => {
  const adRef = useRef<HTMLModElement>(null);

  useEffect(() => {
    try {
      // @ts-ignore
      if (window.adsbygoogle) {
        // @ts-ignore
        (window.adsbygoogle = window.adsbygoogle || []).push({});
      }
    } catch (e) {
      console.error("AdSense push error:", e);
    }
  }, []);

  return (
    <div className={`overflow-hidden rounded-xl border border-white/5 bg-black/20 relative my-4 ${className}`}>
        <div className="absolute top-0 right-0 bg-white/10 px-1.5 py-0.5 text-[8px] font-bold text-gray-400 rounded-bl-lg z-10">AD</div>
        <ins className="adsbygoogle"
             style={{ display: 'block', textAlign: 'center', minHeight: '100px' }}
             data-ad-client="ca-pub-7837194709908029"
             data-ad-slot={slot}
             data-ad-format={format}
             data-ad-layout-key={layoutKey}
             data-ad-layout={layout}
             data-full-width-responsive={responsive}
             ref={adRef}
        ></ins>
    </div>
  );
};

export default GoogleAd;