import React, { useEffect, useState, useRef } from 'react';
import { useParams, useLocation } from 'react-router-dom';
import { supabase } from '../integrations/supabase/client';
import { Loader2, ArrowRight, BookOpen, Clock, User, Download, Dice5, Globe, Heart, Star, Moon } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import SmartAd from '../components/SmartAd';

const PublicEarnPage: React.FC = () => {
    const { uid } = useParams<{ uid: string }>();
    const location = useLocation();
    const [loading, setLoading] = useState(true);
    const [referrerName, setReferrerName] = useState<string>('Anonymous');
    const [timer, setTimer] = useState(15); 
    const [canProceed, setCanProceed] = useState(false);
    const [category, setCategory] = useState('normal');
    
    // Tracking Ref
    const hasTrackedView = useRef(false);

    useEffect(() => {
        // Parse Category from URL ?cat=...
        const searchParams = new URLSearchParams(location.search);
        const cat = searchParams.get('cat');
        if (cat) setCategory(cat);

        if (!uid) return;
        
        const fetchInfo = async () => {
            if (/^\d+$/.test(uid)) {
                const { data } = await supabase.from('profiles').select('name_1').eq('user_uid', parseInt(uid)).single();
                if (data && data.name_1) setReferrerName(data.name_1);
            }
            // Record View (Client-side trigger, secured by SQL logic)
            if (!hasTrackedView.current) {
                hasTrackedView.current = true;
                await recordAction('view');
            }
            setLoading(false);
        };
        fetchInfo();

        // Timer
        const timeInt = setInterval(() => {
            setTimer(prev => {
                if (prev <= 1) {
                    clearInterval(timeInt);
                    setCanProceed(true);
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => {
            clearInterval(timeInt);
        };
    }, [uid, location]);

    const recordAction = async (type: 'view' | 'click') => {
        try {
            await supabase.rpc('track_unlimited_action', {
                p_referrer_uid: parseInt(uid || '0'),
                p_action_type: type,
                p_visitor_ip: 'client', // Backend handles IP if configured or use external service
                p_device_info: navigator.userAgent,
                p_country: 'Unknown'
            });
        } catch (e) {
            console.error("Tracking error", e);
        }
    };

    const handleClickAd = async () => {
        // Track Click
        await recordAction('click');
        // Open Ad Link
        window.open('https://www.effectivegatecpm.com/c3x9dphj?key=4805226fe4883d45030d7fd83d992710', '_blank');
    };

    // --- CONTENT GENERATOR BASED ON CATEGORY ---
    const getContent = () => {
        switch(category) {
            case 'islamic':
                return {
                    title: 'The Light of Knowledge',
                    subtitle: 'Peace through Understanding',
                    icon: <Moon size={28} className="text-green-500" />,
                    text1: "Seeking knowledge is a duty upon every Muslim. In a world full of noise, finding moments of spiritual reflection is essential for the soul.",
                    text2: "Patience (Sabr) and Gratitude (Shukr) are the two wings of faith. By holding onto these, one can navigate any storm.",
                    color: 'text-green-800',
                    bgColor: 'bg-[#f0fdf4]',
                    btnColor: 'bg-green-600 hover:bg-green-700'
                };
            case 'betting':
                return {
                    title: 'Pro Betting Insights',
                    subtitle: 'Winning Strategies 2025',
                    icon: <Dice5 size={28} className="text-yellow-500" />,
                    text1: "Success in betting isn't just luck; it's about disciplined bankroll management and finding value. Smart players never chase losses.",
                    text2: "Analyze the odds, understand the market, and stay ahead of the game. The key to long-term profit is consistency.",
                    color: 'text-yellow-900',
                    bgColor: 'bg-[#fffbeb]',
                    btnColor: 'bg-yellow-500 hover:bg-yellow-600 text-black'
                };
            case 'adult':
                return {
                    title: 'Entertainment & Gossips',
                    subtitle: 'Trending Viral News (18+)',
                    icon: <Heart size={28} className="text-red-500" />,
                    text1: "Get the latest scoop on celebrity lifestyles, viral trends, and exclusive stories that are breaking the internet right now.",
                    text2: "From red carpet shocks to behind-the-scenes drama, stay updated with the hottest entertainment news daily.",
                    color: 'text-red-900',
                    bgColor: 'bg-[#fef2f2]',
                    btnColor: 'bg-red-600 hover:bg-red-700'
                };
            default: // Normal / Tech
                return {
                    title: 'The Hidden Treasure of Digital Age',
                    subtitle: 'Unlock Your Potential',
                    icon: <Globe size={28} className="text-blue-500" />,
                    text1: "In a world driven by connectivity, opportunities hide in plain sight. Technology has bridged the gap between dreams and reality.",
                    text2: "Imagine a system where your time is valued, and your efforts are rewarded instantly. This is the reality of the modern digital ecosystem.",
                    color: 'text-gray-900',
                    bgColor: 'bg-[#f8f9fa]',
                    btnColor: 'bg-blue-600 hover:bg-blue-700'
                };
        }
    };

    const content = getContent();

    if (loading) return <div className="min-h-screen bg-[#f8f9fa] flex items-center justify-center"><Loader2 className="animate-spin text-blue-600" size={40} /></div>;

    return (
        <div className={`min-h-screen ${content.bgColor} font-sans pb-24`}>
            
            {/* Header */}
            <header className="bg-white border-b border-gray-200 sticky top-0 z-50 shadow-sm">
                <div className="max-w-3xl mx-auto px-4 py-3 flex justify-between items-center">
                    <div className="flex items-center gap-2">
                         <div className="w-8 h-8 rounded-full bg-gray-100 text-gray-600 flex items-center justify-center font-bold border border-gray-200">
                             {referrerName[0].toUpperCase()}
                         </div>
                         <div className="text-xs">
                             <p className="text-gray-500 font-medium">Shared by</p>
                             <p className="font-bold text-gray-800">{referrerName}</p>
                         </div>
                    </div>
                    {canProceed ? (
                        <button 
                            onClick={handleClickAd}
                            className={`${content.btnColor} ${category === 'betting' ? 'text-black' : 'text-white'} px-5 py-2 rounded-full text-xs font-bold animate-pulse transition flex items-center gap-2`}
                        >
                            Get Link <ArrowRight size={14} />
                        </button>
                    ) : (
                        <div className="flex items-center gap-2 text-xs font-bold text-orange-500 bg-orange-50 px-3 py-1.5 rounded-full border border-orange-100">
                            <Clock size={14} /> Please wait {timer}s
                        </div>
                    )}
                </div>
            </header>

            <main className="max-w-2xl mx-auto px-4 py-8 space-y-8">
                
                {/* AD SLOT 1 */}
                <div className="w-full bg-white rounded-lg overflow-hidden min-h-[100px] flex items-center justify-center border border-gray-200 shadow-sm">
                     <SmartAd type="banner" className="m-0 border-0" />
                </div>

                <article className="prose prose-slate max-w-none bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                    <h1 className={`text-2xl font-black mb-1 ${content.color} flex items-center gap-2`}>
                        {content.icon}
                        {content.title}
                    </h1>
                    <p className="text-sm font-bold text-gray-400 mb-4 uppercase tracking-wider">{content.subtitle}</p>
                    
                    <p className="text-gray-600 leading-relaxed mb-4">
                        {content.text1}
                    </p>
                    <p className="text-gray-600 leading-relaxed">
                        {content.text2}
                    </p>
                </article>

                {/* AD SLOT 2 */}
                <div className="w-full">
                     <SmartAd className="shadow-none border-gray-200 bg-white" />
                </div>

                <div className="bg-white border border-gray-200 p-4 rounded-xl flex items-start gap-3 shadow-sm">
                    <User className="text-gray-400 shrink-0 mt-1" size={20} />
                    <div>
                        <h4 className="font-bold text-gray-800 text-sm">Community Verified</h4>
                        <p className="text-xs text-gray-600 mt-1">
                            This content is verified by the community. Safe and secure browsing.
                        </p>
                    </div>
                </div>

            </main>
            
            {/* Floating Action Button for Mobile */}
            <div className="fixed bottom-6 left-0 right-0 px-6 z-40 flex justify-center">
                 <button 
                    onClick={handleClickAd}
                    disabled={!canProceed}
                    className={`w-full max-w-md py-4 rounded-xl font-black uppercase tracking-wider shadow-xl flex items-center justify-center gap-2 transition-all transform ${
                        canProceed 
                        ? `${content.btnColor} ${category === 'betting' ? 'text-black' : 'text-white'} hover:scale-105 hover:-translate-y-1` 
                        : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    }`}
                 >
                    {canProceed ? <><Download size={20} /> Continue to Link</> : `Wait ${timer} seconds...`}
                 </button>
            </div>

        </div>
    );
};

export default PublicEarnPage;