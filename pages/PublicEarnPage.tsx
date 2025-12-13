import React, { useEffect, useState, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../integrations/supabase/client';
import { Loader2, ArrowRight, BookOpen, Clock, User, Download } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import SmartAd from '../components/SmartAd';

const PublicEarnPage: React.FC = () => {
    const { uid } = useParams<{ uid: string }>();
    const [loading, setLoading] = useState(true);
    const [referrerName, setReferrerName] = useState<string>('Anonymous');
    const [timer, setTimer] = useState(15); 
    const [canProceed, setCanProceed] = useState(false);
    
    // Tracking Ref
    const hasTrackedView = useRef(false);

    useEffect(() => {
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
    }, [uid]);

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

    if (loading) return <div className="min-h-screen bg-[#f8f9fa] flex items-center justify-center"><Loader2 className="animate-spin text-blue-600" size={40} /></div>;

    return (
        <div className="min-h-screen bg-[#f8f9fa] text-gray-900 font-sans pb-24">
            
            {/* Header */}
            <header className="bg-white border-b border-gray-200 sticky top-0 z-50 shadow-sm">
                <div className="max-w-3xl mx-auto px-4 py-3 flex justify-between items-center">
                    <div className="flex items-center gap-2">
                         <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold">
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
                            className="bg-green-600 text-white px-5 py-2 rounded-full text-xs font-bold animate-pulse hover:bg-green-700 transition flex items-center gap-2"
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
                <div className="w-full bg-gray-200 rounded-lg overflow-hidden min-h-[100px] flex items-center justify-center border border-gray-300">
                     <SmartAd type="banner" className="m-0 border-0" />
                </div>

                <article className="prose prose-slate max-w-none bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                    <h1 className="text-2xl font-black mb-4 text-gray-900 flex items-center gap-2">
                        <BookOpen className="text-blue-600" size={28}/> 
                        The Hidden Treasure of Digital Age
                    </h1>
                    <p className="text-gray-600 leading-relaxed mb-4">
                        In a world driven by connectivity, opportunities hide in plain sight. 
                        Just like finding a rare gem in a vast desert, discovering the right platform can change everything.
                        Technology has bridged the gap between dreams and reality, allowing anyone with determination to build something great.
                    </p>
                    <p className="text-gray-600 leading-relaxed">
                        Imagine a system where your time is valued, and your efforts are rewarded instantly. 
                        This is not just a story; it is the reality of the modern digital ecosystem. 
                        Keep reading to unlock the gateway to this new world.
                    </p>
                </article>

                {/* AD SLOT 2 */}
                <div className="w-full">
                     <SmartAd className="shadow-none border-gray-200 bg-white" />
                </div>

                <article className="prose prose-slate max-w-none bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                    <h2 className="text-xl font-bold mb-4 text-gray-800">অজানার পথে যাত্রা (The Journey to the Unknown)</h2>
                    <p className="text-gray-600 leading-relaxed mb-4">
                        প্রযুক্তির এই বিশাল সাগরে আমরা সবাই নাবিক। প্রতিটি ক্লিক, প্রতিটি পদক্ষেপ আমাদের নতুন দিগন্তের দিকে নিয়ে যায়।
                        সাফল্য কোনো গন্তব্য নয়, এটি একটি যাত্রা। ধৈর্য এবং নিষ্ঠার সাথে এগিয়ে গেলে, আপনিও খুঁজে পাবেন আপনার কাঙ্ক্ষিত রত্ন।
                    </p>
                    <p className="text-gray-600 leading-relaxed">
                        আজকের এই দিনে, সুযোগ আপনার হাতের মুঠোয়। শুধু প্রয়োজন সঠিক চাবিটি খুঁজে পাওয়া।
                        নিচের লিংকে ক্লিক করে আপনার যাত্রা শুরু করুন।
                    </p>
                </article>

                <div className="bg-blue-50 border border-blue-100 p-4 rounded-xl flex items-start gap-3">
                    <User className="text-blue-500 shrink-0 mt-1" size={20} />
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
                        ? 'bg-blue-600 text-white hover:bg-blue-700 hover:scale-105 hover:-translate-y-1' 
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