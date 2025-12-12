
import React, { useEffect, useRef, useState } from 'react';
import { supabase } from '../integrations/supabase/client';

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
  const [isAdmin, setIsAdmin] = useState(false);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
      const checkRole = async () => {
          const { data: { session } } = await supabase.auth.getSession();
          if (session) {
              const { data } = await supabase.from('profiles').select('role, admin_user').eq('id', session.user.id).single();
              if (data && (data.role === 'admin' || data.admin_user)) {
                  setIsAdmin(true);
              }
          }
          setChecked(true);
      };
      checkRole();
  }, []);

  useEffect(() => {
    if (checked && !isAdmin) {
        try {
          // @ts-ignore
          if (window.adsbygoogle) {
            // @ts-ignore
            (window.adsbygoogle = window.adsbygoogle || []).push({});
          }
        } catch (e) {
          console.error("AdSense push error:", e);
        }
    }
  }, [checked, isAdmin]);

  if (!checked) return <div className="h-24 bg-white/5 rounded-xl animate-pulse my-4 mx-4"></div>;

  if (isAdmin) {
      return (
          <div className={`overflow-hidden rounded-xl border-2 border-dashed border-gray-700 bg-black/40 p-4 my-4 flex flex-col items-center justify-center text-center gap-2 ${className}`}>
              <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">Google Ad Placeholder</span>
              <p className="text-[10px] text-gray-600 font-mono">Slot ID: {slot}</p>
              <div className="bg-yellow-900/30 text-yellow-500 px-3 py-1 rounded text-[10px] border border-yellow-500/20">
                  Hidden for Admin (Prevention)
              </div>
          </div>
      );
  }

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
