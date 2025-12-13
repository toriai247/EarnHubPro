import React, { useEffect, useState, useRef } from 'react';
import { useParams, useLocation } from 'react-router-dom';
import { supabase } from '../integrations/supabase/client';
import { Loader2, Download, Dice5, Globe, Star, Gift, Flame, ChevronDown, Clock, CheckCircle2, AlertCircle, Smartphone, Monitor } from 'lucide-react';
import { motion, useScroll } from 'framer-motion';
import SmartAd from '../components/SmartAd';

// --- AD COMPONENTS ---

const AdsterraIframe = ({ adKey, width, height, className = "" }: { adKey: string, width: number, height: number, className?: string }) => {
    const srcDoc = `
        <html>
            <body style="margin:0;padding:0;display:flex;justify-content:center;align-items:center;background:transparent;overflow:hidden;">
                <script type="text/javascript">
                    atOptions = {
                        'key' : '${adKey}',
                        'format' : 'iframe',
                        'height' : ${height},
                        'width' : ${width},
                        'params' : {}
                    };
                </script>
                <script type="text/javascript" src="https://roomsmergeshipwreck.com/${adKey}/invoke.js"></script>
            </body>
        </html>
    `;

    return (
        <div className={`flex justify-center overflow-hidden my-6 ${className}`} style={{ minHeight: height }}>
            <iframe 
                srcDoc={srcDoc} 
                width={width} 
                height={height} 
                scrolling="no" 
                frameBorder="0"
                style={{ border: 'none', maxWidth: '100%', overflow: 'hidden' }}
                title={`ad-${adKey}`}
            />
        </div>
    );
};

const NativeAdWidget = () => {
    useEffect(() => {
        const src = "https://roomsmergeshipwreck.com/830a239ea7268fb01c4cb32b9b61ea03/invoke.js";
        if (document.querySelector(`script[src="${src}"]`)) return;
        const script = document.createElement('script');
        script.async = true;
        script.dataset.cfasync = "false";
        script.src = src;
        document.body.appendChild(script);
        return () => {};
    }, []);

    return (
        <div className="w-full my-6 flex justify-center z-10 relative bg-gray-50/5 p-2 rounded-xl">
            <div id="container-830a239ea7268fb01c4cb32b9b61ea03"></div>
        </div>
    );
};

// --- DEVICE DETECTION HELPERS ---
const getBrowserInfo = () => {
    const ua = navigator.userAgent;
    let browser = "Unknown";
    let os = "Unknown";
    let deviceType = "Desktop";

    if (ua.match(/Android/i)) { os = "Android"; deviceType = "Mobile"; }
    else if (ua.match(/iPhone|iPad|iPod/i)) { os = "iOS"; deviceType = "Mobile"; }
    else if (ua.match(/Windows/i)) os = "Windows";
    else if (ua.match(/Mac/i)) os = "MacOS";
    else if (ua.match(/Linux/i)) os = "Linux";

    if (ua.indexOf("Chrome") > -1) browser = "Chrome";
    else if (ua.indexOf("Safari") > -1) browser = "Safari";
    else if (ua.indexOf("Firefox") > -1) browser = "Firefox";
    else if (ua.indexOf("Edg") > -1) browser = "Edge";
    
    return { browser, os, deviceType, ua };
};

const PublicEarnPage: React.FC = () => {
    const { uid } = useParams<{ uid: string }>();
    const location = useLocation();
    const [loading, setLoading] = useState(true);
    const [referrerName, setReferrerName] = useState<string>('Naxxivo User');
    const [referralCode, setReferralCode] = useState<string>('');
    const [category, setCategory] = useState('normal');
    
    // Reward Logic State
    const [timer, setTimer] = useState(10); // 10 Seconds Wait
    const [hasScrolled, setHasScrolled] = useState(false);
    const [isReady, setIsReady] = useState(false);
    
    // Tracking Data
    const [ipData, setIpData] = useState<{ip: string, country: string, city: string} | null>(null);
    
    // Scroll Tracking
    const { scrollYProgress } = useScroll();

    // --- IFRAME CLICK DETECTION ---
    // This detects when user clicks on an ad banner (which blurs the window)
    useEffect(() => {
        const handleBlur = () => {
            // Check if the active element is an iframe
            if (document.activeElement && document.activeElement.tagName === 'IFRAME') {
                console.log("Ad Clicked via Iframe");
                recordAction('click'); // Track ad click
            }
        };

        window.addEventListener('blur', handleBlur);
        return () => window.removeEventListener('blur', handleBlur);
    }, [ipData, uid]); // Re-bind if important data changes

    useEffect(() => {
        const unsubscribe = scrollYProgress.on("change", (latest) => {
            if (latest > 0.2) setHasScrolled(true); // Must scroll at least 20% down
        });
        return () => unsubscribe();
    }, [scrollYProgress]);

    useEffect(() => {
        // 1. Fetch IP Info immediately
        const fetchIp = async () => {
            try {
                const res = await fetch('https://ipapi.co/json/');
                const data = await res.json();
                setIpData({ ip: data.ip, country: data.country_name, city: data.city });
                
                // Track initial VIEW after getting IP
                if(uid) {
                     recordAction('view', { ip: data.ip, country: data.country_name, city: data.city });
                }
            } catch (e) {
                console.error("IP Fetch failed", e);
                setIpData({ ip: '0.0.0.0', country: 'Unknown', city: 'Unknown' });
                if(uid) recordAction('view');
            }
        };
        fetchIp();

        // 2. Parse Category
        const searchParams = new URLSearchParams(location.search);
        const cat = searchParams.get('cat');
        
        if (cat) {
            setCategory(cat);
        } else {
            const options = ['normal', 'betting', 'adult'];
            const randomCat = options[Math.floor(Math.random() * options.length)];
            setCategory(randomCat);
        }

        if (!uid) return;
        
        const fetchInfo = async () => {
            if (/^\d+$/.test(uid)) {
                const { data } = await supabase.from('profiles').select('name_1, ref_code_1').eq('user_uid', parseInt(uid)).single();
                if (data) {
                    if (data.name_1) setReferrerName(data.name_1);
                    if (data.ref_code_1) setReferralCode(data.ref_code_1);
                }
            }
            setLoading(false);
        };
        fetchInfo();

        // 10s Timer
        const timeInt = setInterval(() => {
            setTimer(prev => {
                if (prev <= 1) {
                    clearInterval(timeInt);
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(timeInt);
    }, [uid, location]);

    // Check conditions
    useEffect(() => {
        if (timer === 0 && hasScrolled) {
            setIsReady(true);
        }
    }, [timer, hasScrolled]);

    const recordAction = async (type: 'view' | 'click', overrideIpData?: any) => {
        const currentIp = overrideIpData || ipData;
        // Allow tracking even if IP fetch failed slightly, use defaults
        const finalIp = currentIp?.ip || '0.0.0.0';
        const finalCountry = currentIp?.country || 'Unknown';
        const finalCity = currentIp?.city || 'Unknown';

        const { browser, os, deviceType, ua } = getBrowserInfo();

        try {
            await supabase.rpc('track_unlimited_action_v2', {
                p_referrer_uid: parseInt(uid || '0'),
                p_action_type: type,
                p_visitor_ip: finalIp,
                p_country: finalCountry,
                p_city: finalCity,
                p_device_type: deviceType,
                p_browser: browser,
                p_os: os,
                p_user_agent: ua
            });
            console.log(`Tracked: ${type}`);
        } catch (e) {
            console.error("Tracking error", e);
        }
    };

    const handleClickAd = async () => {
        if (!isReady) return;
        
        await recordAction('click'); // Always track click, unlimited times
        window.open('https://roomsmergeshipwreck.com/j71nuij9?key=4b9e21ee5c0ca9b796f1f4c5991c4d49', '_blank');
    };

    const handleJoinNaxxivo = () => {
        const url = `${window.location.origin}/#/signup?ref=${referralCode}`;
        window.open(url, '_blank');
    };

    const c = getContent(category);

    if (loading) return <div className="min-h-screen bg-black flex items-center justify-center"><Loader2 className="animate-spin text-white" size={40} /></div>;

    return (
        <div className={`min-h-screen ${c.bg} font-sans pb-32 flex flex-col relative overflow-hidden`}>
            
            {/* Top Bar */}
            <motion.div 
                initial={{ y: -50 }} animate={{ y: 0 }}
                className={`w-full py-3 px-4 text-center font-bold text-sm shadow-lg flex items-center justify-center gap-2 z-20 ${category === 'betting' ? 'bg-yellow-500 text-black' : 'bg-gradient-to-r from-purple-600 to-blue-600 text-white'}`}
            >
                <Gift size={18} className="animate-bounce" />
                <span>Login & Win <span className="font-black text-lg mx-1">12,000 TK</span> Bonus!</span>
            </motion.div>

            {/* AD 1: 320x50 Mobile or 728x90 Desktop */}
            <div className="hidden md:block">
                <AdsterraIframe adKey="ae18bceeb76684b21ef4ebef3aaaddd9" width={728} height={90} />
            </div>
            <div className="block md:hidden">
                <AdsterraIframe adKey="21296eaa1baf6850212dee6b83be487f" width={320} height={50} />
            </div>

            <main className="flex-1 px-4 py-6 max-w-2xl mx-auto w-full z-10 space-y-8">
                
                {/* Profile Header */}
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
                <div className="text-center space-y-2 py-2">
                    <motion.div initial={{ scale: 0.8 }} animate={{ scale: 1 }} className="flex justify-center mb-2">
                        {c.icon}
                    </motion.div>
                    <h1 className={`text-3xl sm:text-4xl font-black uppercase tracking-tight ${c.textColor}`}>
                        {c.title}
                    </h1>
                    <p className={`text-sm font-medium opacity-80 ${c.textColor}`}>
                        {c.subtitle}
                    </p>
                </div>

                {/* AD 2: 300x250 Medium Rectangle (High Visibility) */}
                <AdsterraIframe adKey="10d5ca72c2b130e7fabee5262c0a58d6" width={300} height={250} className="my-6" />

                {/* --- STORY PART 1 --- */}
                <div className={`p-6 rounded-3xl shadow-sm border ${c.cardBg} ${category === 'betting' ? 'border-[#333]' : 'border-gray-100'}`}>
                    <h2 className={`text-xl font-bold mb-4 ${c.textColor}`}>{c.articles[0].head}</h2>
                    <div className={`space-y-4 text-sm leading-relaxed opacity-80 ${c.textColor}`}>
                        {c.articles[0].body.split('\n').map((para, i) => <p key={i}>{para}</p>)}
                    </div>
                </div>

                {/* AD 3: 468x60 Banner */}
                <AdsterraIframe adKey="fc74ff6004781d139c600e5083493b6c" width={468} height={60} />

                {/* --- NATIVE AD WIDGET --- */}
                <NativeAdWidget />

                {/* --- STORY PART 2 --- */}
                <div className={`p-6 rounded-3xl shadow-sm border ${c.cardBg} ${category === 'betting' ? 'border-[#333]' : 'border-gray-100'}`}>
                    <h2 className={`text-xl font-bold mb-4 ${c.textColor}`}>{c.articles[1].head}</h2>
                    <div className={`space-y-4 text-sm leading-relaxed opacity-80 ${c.textColor}`}>
                        {c.articles[1].body.split('\n').map((para, i) => <p key={i}>{para}</p>)}
                    </div>
                </div>

                {/* AD 4: 160x300 Vertical Banner (Inline on Mobile) */}
                <div className="flex justify-center">
                    <AdsterraIframe adKey="fcc8f17c22a9a7019794ec2e69a24518" width={160} height={300} />
                </div>

                {/* --- STORY PART 3 --- */}
                <div className={`p-6 rounded-3xl shadow-sm border ${c.cardBg} ${category === 'betting' ? 'border-[#333]' : 'border-gray-100'}`}>
                    <h2 className={`text-xl font-bold mb-4 ${c.textColor}`}>{c.articles[2].head}</h2>
                    <div className={`space-y-4 text-sm leading-relaxed opacity-80 ${c.textColor}`}>
                        {c.articles[2].body.split('\n').map((para, i) => <p key={i}>{para}</p>)}
                    </div>
                </div>

                {/* AD 5: 160x600 Skyscraper (Bottom) */}
                <div className="flex justify-center">
                    <AdsterraIframe adKey="f24ac65853d082286a7d6fca6b2b8e6c" width={160} height={600} />
                </div>

                {/* NAXXIVO JOIN CTA */}
                {referralCode && (
                    <div className="mt-8 p-8 bg-gradient-to-br from-[#000000] to-[#1a1a1a] rounded-3xl text-center text-white border border-gray-800 shadow-2xl relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/20 rounded-full blur-3xl"></div>
                        <h3 className="text-2xl font-black mb-2 relative z-10">Start Earning Today!</h3>
                        <p className="text-gray-400 text-sm mb-6 relative z-10 max-w-sm mx-auto">
                            Join Naxxivo now and get instant access to tasks, games, and investments. Use the code below for a welcome bonus.
                        </p>
                        <div className="bg-white/10 p-3 rounded-xl font-mono text-xl font-bold tracking-widest mb-6 border border-white/10 inline-block px-8">
                            {referralCode}
                        </div>
                        <button 
                            onClick={handleJoinNaxxivo}
                            className="w-full py-4 bg-white text-black font-black text-lg rounded-xl hover:bg-gray-200 transition shadow-lg"
                        >
                            Create Account
                        </button>
                    </div>
                )}
            </main>

            {/* --- STICKY STATUS BAR --- */}
            <div className={`fixed bottom-0 left-0 right-0 p-4 z-50 backdrop-blur-xl border-t ${category === 'betting' ? 'bg-black/90 border-[#333]' : 'bg-white/90 border-gray-200'}`}>
                <div className="max-w-md mx-auto space-y-3">
                    {/* Progress Indicators */}
                    <div className="flex items-center justify-between text-xs font-bold px-1">
                        <div className={`flex items-center gap-1 ${timer === 0 ? 'text-green-500' : 'text-gray-500'}`}>
                            {timer === 0 ? <CheckCircle2 size={12}/> : <Clock size={12}/>} 
                            {timer === 0 ? 'Time Complete' : `Wait ${timer}s`}
                        </div>
                        <div className={`flex items-center gap-1 ${hasScrolled ? 'text-green-500' : 'text-gray-500'}`}>
                            {hasScrolled ? <CheckCircle2 size={12}/> : <ChevronDown size={12}/>}
                            {hasScrolled ? 'Scrolled' : 'Scroll Down'}
                        </div>
                    </div>

                    {!isReady ? (
                        <button disabled className="w-full py-3 rounded-xl font-bold text-white bg-gray-400 cursor-not-allowed flex items-center justify-center gap-2 text-sm">
                             <Loader2 size={16} className="animate-spin" /> Verifying Activity...
                        </button>
                    ) : (
                        <button 
                            onClick={handleClickAd}
                            className={`w-full py-3.5 rounded-xl font-black text-lg text-white shadow-xl shadow-${c.accent}-500/30 flex items-center justify-center gap-2 bg-gradient-to-r ${c.btnGradient} animate-pulse`}
                        >
                            <Download size={20} /> 
                            {category === 'adult' ? 'WATCH FULL VIDEO' : category === 'betting' ? 'GET VIP PREDICTION' : 'CONTINUE'}
                        </button>
                    )}
                </div>
            </div>

        </div>
    );
};

// Content Generator Function
const getContent = (category: string) => {
    switch(category) {
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
                        head: "🔥 The Secret Algorithm",
                        body: "Professional bettors don't rely on luck; they rely on data. Our team has analyzed over 50,000 matches to bring you this prediction.\n\nThe key to winning consistently lies in bankroll management and finding value bets. A value bet exists when the probability of an outcome is higher than what the odds suggest. Most recreational players bet on their favorite teams, but professionals bet on the numbers.\n\nKeep scrolling to see today's VIP signals."
                    },
                    {
                        head: "💎 Managing Your Bankroll",
                        body: "Never bet more than 5% of your total bankroll on a single game. This rule is golden. It protects you from bad streaks and ensures you stay in the game long enough to hit the winning streaks.\n\nCompound interest is the eighth wonder of the world. By reinvesting your small wins, you can grow a small deposit into a significant amount over time. Patience is your best friend in this industry."
                    },
                    {
                        head: "🚀 Today's VIP Signal",
                        body: "Our system has flagged a high-confidence match starting soon. The odds are heavily skewed in favor of the underdog due to a key player injury on the favorite team.\n\nClick the button below to access the full analysis and the exact score prediction. This information is usually reserved for our premium members, but today it's free for you."
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
                        head: "😱 SHOCKING: The Video Everyone Is Talking About",
                        body: "It started as a rumor on social media, but now the full footage has surfaced. This video has been taken down from major platforms multiple times in the last hour.\n\nUsers are reporting that the content is completely unexpected. What you see in the first 10 seconds is nothing compared to the ending. The internet is going crazy over this revelation.\n\nScroll down to find out what really happened."
                    },
                    {
                        head: "🔥 Behind The Scenes",
                        body: "Usually, these types of leaks are blurry or short. However, this file is high definition and over 20 minutes long. It reveals details that were previously hidden from the public eye.\n\nPrivacy experts are debating how this got out, but for now, it's available. Make sure you are in a private location before proceeding."
                    },
                    {
                        head: "🚀 Access The Full Gallery",
                        body: "Due to high traffic, we have moved the full video to a secure private server. You need to verify you are not a bot to access the stream.\n\nClick the button below to verify and start watching immediately. Don't miss out before the link expires."
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
                        head: "💰 The $50 Daily Strategy",
                        body: "Stop wasting time scrolling through social media for free. Turn your phone into an ATM. Thousands of people are earning a full-time income from home using this simple method.\n\nIt doesn't require technical skills or a degree. All you need is an internet connection and the willingness to learn. The digital economy is booming, and big companies are paying for simple tasks like data entry, app testing, and reviews.\n\nKeep reading to discover the platform changing lives."
                    },
                    {
                        head: "🚀 The Power of Micro-Tasks",
                        body: "Micro-tasks are small jobs that take seconds to complete but pay instantly. Imagine earning $0.50 every time you watch a 30-second video or $1.00 for installing a free app.\n\nIf you do this for just an hour a day, you can easily cover your monthly utility bills. Scale it up, and you have a serious side hustle. The key is consistency and finding the right platforms that actually pay."
                    },
                    {
                        head: "💎 Your Invitation Awaits",
                        body: "We have partnered with a premium earning network that is currently accepting new members from your country. They offer a signup bonus and daily payouts via local payment methods.\n\nSlots are limited. Verify your activity by scrolling to the bottom and clicking the button to claim your spot and start earning today."
                    }
                ]
            };
    }
};

export default PublicEarnPage;