import React, { useEffect, useState, useRef } from 'react';
import { useParams, useLocation } from 'react-router-dom';
import { supabase } from '../integrations/supabase/client';
import { Loader2, ArrowRight, BookOpen, Clock, User, Download, Dice5, Globe, Heart, Star, Moon, Gift, Zap, CheckCircle2, AlertCircle, Flame } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import SmartAd from '../components/SmartAd';

const PublicEarnPage: React.FC = () => {
    const { uid } = useParams<{ uid: string }>();
    const location = useLocation();
    const [loading, setLoading] = useState(true);
    const [referrerName, setReferrerName] = useState<string>('Naxxivo User');
    const [referralCode, setReferralCode] = useState<string>('');
    const [timer, setTimer] = useState(10); 
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
                // Fetch Name AND Ref Code
                const { data } = await supabase.from('profiles').select('name_1, ref_code_1').eq('user_uid', parseInt(uid)).single();
                if (data) {
                    if (data.name_1) setReferrerName(data.name_1);
                    if (data.ref_code_1) setReferralCode(data.ref_code_1);
                }
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

    const handleJoinNaxxivo = () => {
        const url = `${window.location.origin}/#/signup?ref=${referralCode}`;
        window.open(url, '_blank');
    };

    // --- CONTENT GENERATOR ---
    const getContent = () => {
        switch(category) {
            case 'islamic':
                return {
                    theme: 'islamic',
                    title: 'জ্ঞান ও শান্তি (Knowledge & Peace)',
                    subtitle: 'Daily Islamic Reminders',
                    icon: <Moon size={32} className="text-emerald-500" />,
                    accent: 'emerald',
                    bg: 'bg-[#f0fdf4]',
                    cardBg: 'bg-white',
                    textColor: 'text-emerald-900',
                    btnGradient: 'from-emerald-600 to-green-500',
                    articles: [
                        {
                            head: "ধৈর্য (Sabr) - The Key to Success",
                            body: "In every hardship, there is ease. Patience is not just waiting; it's how we behave while waiting. Trust in the plan, for every delay has a blessing."
                        },
                        {
                            head: "কৃতজ্ঞতা (Gratitude)",
                            body: "If you are grateful, I will surely increase you in favor. Gratitude turns what we have into enough."
                        }
                    ]
                };
            case 'betting':
                return {
                    theme: 'betting',
                    title: 'JACKPOT PREDICTION',
                    subtitle: 'Sure Shot Winning Tips 2025',
                    icon: <Dice5 size={32} className="text-yellow-400" />,
                    accent: 'yellow',
                    bg: 'bg-[#1a1a1a]',
                    cardBg: 'bg-[#2a2a2a]',
                    textColor: 'text-yellow-400',
                    btnGradient: 'from-yellow-600 to-orange-500',
                    articles: [
                        {
                            head: "🔥 Today's Hot Prediction",
                            body: "Don't play blind. Use data-driven strategies. The secret to winning isn't luck, it's managing your bankroll and striking when the odds are skewed."
                        },
                        {
                            head: "💎 VIP Insider Signal",
                            body: "Unlock the hidden potential of multipliers. The next big crash game is about to peak. Are you ready to cash out?"
                        }
                    ]
                };
            case 'adult':
                return {
                    theme: 'viral',
                    title: 'EXCLUSIVE LEAKS 18+',
                    subtitle: 'Viral Trending Videos',
                    icon: <Flame size={32} className="text-red-500" />,
                    accent: 'red',
                    bg: 'bg-[#fff1f2]',
                    cardBg: 'bg-white',
                    textColor: 'text-red-900',
                    btnGradient: 'from-red-600 to-pink-500',
                    articles: [
                        {
                            head: "😱 SHOCKING: Just Leaked!",
                            body: "You won't believe what happened in this video. It's trending everywhere right now. Watch before it gets deleted!"
                        },
                        {
                            head: "🔥 Celebrity Secret Exposed",
                            body: "The truth is finally out. Behind the scenes footage that changes everything. Click the link below to access the full gallery."
                        }
                    ]
                };
            default: // Normal
                return {
                    theme: 'normal',
                    title: 'Earn Money Online 2025',
                    subtitle: 'Passive Income Secrets',
                    icon: <Globe size={32} className="text-blue-500" />,
                    accent: 'blue',
                    bg: 'bg-[#f8f9fa]',
                    cardBg: 'bg-white',
                    textColor: 'text-slate-900',
                    btnGradient: 'from-blue-600 to-indigo-600',
                    articles: [
                        {
                            head: "💰 $50 Daily Strategy",
                            body: "Stop wasting time scrolling. Turn your phone into an ATM. Thousands are earning daily using this simple copy-paste method."
                        },
                        {
                            head: "🚀 The Digital Gold Rush",
                            body: "Opportunities hide in plain sight. Discover the platform that pays you to perform simple tasks. No experience needed."
                        }
                    ]
                };
        }
    };

    const c = getContent();

    if (loading) return <div className="min-h-screen bg-black flex items-center justify-center"><Loader2 className="animate-spin text-white" size={40} /></div>;

    return (
        <div className={`min-h-screen ${c.bg} font-sans pb-32 flex flex-col relative overflow-hidden`}>
            
            {/* --- TOP HOOK BANNER --- */}
            <motion.div 
                initial={{ y: -50 }} animate={{ y: 0 }}
                className={`w-full py-3 px-4 text-center font-bold text-sm shadow-lg flex items-center justify-center gap-2 z-20 ${category === 'betting' ? 'bg-yellow-500 text-black' : 'bg-gradient-to-r from-purple-600 to-blue-600 text-white'}`}
            >
                <Gift size={18} className="animate-bounce" />
                <span>Login & Win <span className="font-black text-lg mx-1">12,000 TK</span> Bonus!</span>
            </motion.div>

            {/* --- MAIN CONTENT --- */}
            <main className="flex-1 px-4 py-6 max-w-lg mx-auto w-full z-10 space-y-6">
                
                {/* Header Profile */}
                <div className="flex items-center gap-3 bg-opacity-50 p-2 rounded-full border border-gray-200/20 backdrop-blur-sm self-start">
                     <div className="w-10 h-10 rounded-full bg-gray-200 overflow-hidden border-2 border-white">
                         <div className={`w-full h-full flex items-center justify-center font-bold text-lg ${c.textColor}`}>
                             {referrerName.charAt(0)}
                         </div>
                     </div>
                     <div className="leading-tight">
                         <p className={`text-xs font-medium opacity-70 ${category === 'betting' ? 'text-gray-400' : 'text-gray-500'}`}>Recommended by</p>
                         <p className={`text-sm font-bold ${c.textColor}`}>{referrerName}</p>
                     </div>
                </div>

                {/* Hero Title */}
                <div className="text-center space-y-2 py-4">
                    <motion.div 
                        initial={{ scale: 0.8 }} animate={{ scale: 1 }}
                        className="flex justify-center mb-2"
                    >
                        {c.icon}
                    </motion.div>
                    <h1 className={`text-3xl font-black uppercase tracking-tight ${c.textColor}`}>
                        {c.title}
                    </h1>
                    <p className={`text-sm font-medium opacity-80 ${c.textColor}`}>
                        {c.subtitle}
                    </p>
                </div>

                {/* AD SLOT 1 (Native Style) */}
                <div className={`w-full rounded-2xl overflow-hidden shadow-sm border ${category === 'betting' ? 'bg-[#222] border-[#333]' : 'bg-white border-gray-200'}`}>
                     <div className="p-2 border-b border-gray-100/10 flex justify-between items-center">
                         <span className="text-[10px] font-bold text-gray-400 uppercase">Sponsored</span>
                         <Star size={10} className="text-yellow-400 fill-yellow-400" />
                     </div>
                     <SmartAd type="banner" className="m-0" />
                </div>

                {/* ARTICLE 1 */}
                <div className={`p-6 rounded-2xl shadow-sm border ${c.cardBg} ${category === 'betting' ? 'border-[#333]' : 'border-gray-100'}`}>
                    <h2 className={`text-xl font-bold mb-3 ${c.textColor}`}>{c.articles[0].head}</h2>
                    <p className={`text-sm leading-relaxed opacity-80 ${c.textColor}`}>
                        {c.articles[0].body}
                    </p>
                </div>

                {/* AD SLOT 2 */}
                <div className="w-full">
                     <SmartAd className="shadow-none" />
                </div>

                {/* ARTICLE 2 */}
                <div className={`p-6 rounded-2xl shadow-sm border ${c.cardBg} ${category === 'betting' ? 'border-[#333]' : 'border-gray-100'}`}>
                    <h2 className={`text-xl font-bold mb-3 ${c.textColor}`}>{c.articles[1].head}</h2>
                    <p className={`text-sm leading-relaxed opacity-80 ${c.textColor}`}>
                        {c.articles[1].body}
                    </p>
                </div>

                {/* NAXXIVO JOIN CTA */}
                {referralCode && (
                    <div className="mt-8 p-6 bg-gradient-to-br from-[#000000] to-[#1a1a1a] rounded-3xl text-center text-white border border-gray-800 shadow-2xl relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/20 rounded-full blur-2xl"></div>
                        <h3 className="text-xl font-black mb-2 relative z-10">Want to Earn Too?</h3>
                        <p className="text-gray-400 text-sm mb-4 relative z-10">
                            Join Naxxivo and start earning daily income like {referrerName}. Use code for bonus.
                        </p>
                        <div className="bg-white/10 p-2 rounded-lg font-mono text-lg font-bold tracking-widest mb-4 border border-white/10 inline-block px-6">
                            {referralCode}
                        </div>
                        <button 
                            onClick={handleJoinNaxxivo}
                            className="w-full py-3 bg-white text-black font-bold rounded-xl hover:bg-gray-200 transition"
                        >
                            Sign Up Now
                        </button>
                    </div>
                )}
            </main>

            {/* --- STICKY FLOATING CTA --- */}
            <div className={`fixed bottom-0 left-0 right-0 p-4 z-50 backdrop-blur-xl border-t ${category === 'betting' ? 'bg-black/80 border-[#333]' : 'bg-white/80 border-gray-200'}`}>
                <div className="max-w-md mx-auto">
                    {!canProceed ? (
                        <button disabled className="w-full py-4 rounded-xl font-bold text-white bg-gray-400 cursor-not-allowed flex items-center justify-center gap-2">
                             <Loader2 size={20} className="animate-spin" /> Please Wait {timer}s...
                        </button>
                    ) : (
                        <button 
                            onClick={handleClickAd}
                            className={`w-full py-4 rounded-xl font-black text-lg text-white shadow-xl shadow-${c.accent}-500/30 flex items-center justify-center gap-2 bg-gradient-to-r ${c.btnGradient} animate-pulse`}
                        >
                            <Download size={24} /> 
                            {category === 'adult' ? 'WATCH VIDEO' : category === 'betting' ? 'GET PREDICTION' : 'CONTINUE TO LINK'}
                        </button>
                    )}
                </div>
            </div>

        </div>
    );
};

export default PublicEarnPage;