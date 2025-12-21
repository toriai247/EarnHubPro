
import React, { useEffect, useState, useRef } from 'react';
import { useParams, useLocation } from 'react-router-dom';
import { supabase } from '../integrations/supabase/client';
import { Loader2, Download, Dice5, Globe, Gift, ChevronDown, Clock, CheckCircle2 } from 'lucide-react';
import { motion, useScroll } from 'framer-motion';

const AdsterraIframe = ({ adKey, width, height, className = "" }: { adKey: string, width: number, height: number, className?: string }) => {
    const srcDoc = `
        <html>
            <body style="margin:0;padding:0;display:flex;justify-content:center;align-items:center;background:transparent;overflow:hidden;">
                <script type="text/javascript">
                    atOptions = {'key' : '${adKey}', 'format' : 'iframe', 'height' : ${height}, 'width' : ${width}, 'params' : {}};
                </script>
                <script type="text/javascript" src="https://roomsmergeshipwreck.com/${adKey}/invoke.js"></script>
            </body>
        </html>
    `;
    return (
        <div className={`flex justify-center overflow-hidden my-6 ${className}`} style={{ minHeight: height }}>
            <iframe srcDoc={srcDoc} width={width} height={height} scrolling="no" frameBorder="0" style={{ border: 'none', maxWidth: '100%' }} title={`ad-${adKey}`} />
        </div>
    );
};

const PublicEarnPage: React.FC = () => {
    const { uid } = useParams<{ uid: string }>();
    const [loading, setLoading] = useState(true);
    const [referrerName, setReferrerName] = useState<string>('Naxxivo Node');
    const [category, setCategory] = useState('normal');
    const [timer, setTimer] = useState(10); 
    const [hasScrolled, setHasScrolled] = useState(false);
    const [isReady, setIsReady] = useState(false);
    const [ipData, setIpData] = useState<any>(null);
    const { scrollYProgress } = useScroll();

    useEffect(() => {
        const handleBlur = () => {
            if (document.activeElement?.tagName === 'IFRAME') recordAction('click');
        };
        window.addEventListener('blur', handleBlur);
        const unsubscribe = scrollYProgress.on("change", (v) => { if (v > 0.3) setHasScrolled(true); });
        return () => { window.removeEventListener('blur', handleBlur); unsubscribe(); };
    }, [scrollYProgress]);

    useEffect(() => {
        const fetchMeta = async () => {
            try {
                const res = await fetch('https://ipapi.co/json/');
                const data = await res.json();
                setIpData(data);
                if(uid) recordAction('view', data);
            } catch (e) { setIpData({ip:'0.0.0.0'}); if(uid) recordAction('view'); }
        };
        fetchMeta();
        if (uid && /^\d+$/.test(uid)) {
            supabase.from('profiles').select('name_1').eq('user_uid', parseInt(uid)).single().then(({data}) => {
                if(data) setReferrerName(data.name_1 || 'Member');
                setLoading(false);
            });
        } else setLoading(false);

        const int = setInterval(() => setTimer(t => t > 0 ? t - 1 : 0), 1000);
        return () => clearInterval(int);
    }, [uid]);

    useEffect(() => { if (timer === 0 && hasScrolled) setIsReady(true); }, [timer, hasScrolled]);

    const recordAction = async (type: 'view' | 'click', meta?: any) => {
        const finalIp = meta?.ip || ipData?.ip || '0.0.0.0';
        try {
            await supabase.rpc('track_unlimited_action_v2', {
                p_referrer_uid: parseInt(uid || '0'),
                p_action_type: type,
                p_visitor_ip: finalIp,
                p_country: meta?.country_name || ipData?.country_name || 'Unknown',
                p_city: meta?.city || ipData?.city || 'Unknown',
                p_device_type: /Mobi|Android/i.test(navigator.userAgent) ? 'Mobile' : 'Desktop',
                p_browser: 'Web',
                p_os: 'System'
            });
        } catch (e) { console.warn("Tracking failed"); }
    };

    const handleContinue = () => {
        recordAction('click');
        window.open('https://roomsmergeshipwreck.com/j71nuij9?key=4b9e21ee5c0ca9b796f1f4c5991c4d49', '_blank');
    };

    if (loading) return <div className="min-h-screen bg-black flex items-center justify-center text-white font-mono">LOADING_NODE_SYNC...</div>;

    return (
        <div className="min-h-screen bg-[#f8f9fa] font-sans pb-32 flex flex-col relative overflow-hidden">
            <div className="w-full py-3 px-4 text-center font-bold text-sm bg-blue-600 text-white shadow-lg">
                Exclusive Reward Gateway
            </div>

            <main className="flex-1 px-4 py-8 max-w-2xl mx-auto w-full space-y-8">
                <div className="flex items-center gap-3 bg-white p-3 rounded-full border border-gray-200 shadow-sm self-start">
                     <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center font-bold text-blue-600">{referrerName.charAt(0)}</div>
                     <div><p className="text-xs text-gray-500">Verified Partner</p><p className="text-sm font-bold text-gray-900">{referrerName}</p></div>
                </div>

                <div className="text-center space-y-2">
                    <Globe size={48} className="mx-auto text-blue-500 mb-2" />
                    <h1 className="text-3xl font-black text-slate-900 uppercase">Passive Income 2025</h1>
                    <p className="text-sm text-slate-500">Unlock the system that pays while you sleep.</p>
                </div>

                <AdsterraIframe adKey="10d5ca72c2b130e7fabee5262c0a58d6" width={300} height={250} />

                <div className="p-6 bg-white rounded-3xl border border-gray-200 shadow-sm space-y-4">
                    <h2 className="text-xl font-bold text-slate-900">How It Works</h2>
                    <p className="text-sm text-slate-600 leading-relaxed">Simply share your referral link and earn every time someone visits this bridge. No deposit required to start earning from your network.</p>
                </div>

                <AdsterraIframe adKey="fc74ff6004781d139c600e5083493b6c" width={468} height={60} />
            </main>

            <div className="fixed bottom-0 left-0 right-0 p-4 z-50 bg-white/90 backdrop-blur-xl border-t border-gray-200">
                <div className="max-w-md mx-auto space-y-3">
                    <div className="flex items-center justify-between text-xs font-bold text-gray-500">
                        <span className={timer === 0 ? 'text-green-600' : ''}>{timer === 0 ? '✓ Ready' : `Wait ${timer}s`}</span>
                        <span className={hasScrolled ? 'text-green-600' : ''}>{hasScrolled ? '✓ Scrolled' : 'Scroll Down'}</span>
                    </div>
                    <button 
                        onClick={handleContinue} 
                        disabled={!isReady}
                        className={`w-full py-4 rounded-xl font-black text-lg text-white shadow-xl transition-all ${isReady ? 'bg-blue-600 active:scale-95' : 'bg-gray-300 cursor-not-allowed'}`}
                    >
                        CONTINUE TO REWARD
                    </button>
                </div>
            </div>
        </div>
    );
};

export default PublicEarnPage;
