import React, { useState, useEffect } from 'react';
import GlassCard from '../components/GlassCard';
import { Search, User, ArrowRight, ExternalLink, Send, Loader2, LogIn, ShieldCheck, Briefcase, Star, Crown, X } from 'lucide-react';
import { supabase } from '../integrations/supabase/client';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { UserProfile } from '../types';
import SmartImage from '../components/SmartImage';
import GoogleAd from '../components/GoogleAd';

const SearchUsers: React.FC = () => {
    const [searchTerm, setSearchTerm] = useState('');
    const [results, setResults] = useState<UserProfile[]>([]);
    const [loading, setLoading] = useState(false);
    const [isGuest, setIsGuest] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        const checkSession = async () => {
            const { data } = await supabase.auth.getSession();
            setIsGuest(!data.session);
        };
        checkSession();
    }, []);

    // Debounced Real-time Search
    useEffect(() => {
        const delayDebounceFn = setTimeout(() => {
            if (searchTerm.length >= 2) {
                performSearch();
            } else {
                setResults([]);
            }
        }, 500);

        return () => clearTimeout(delayDebounceFn);
    }, [searchTerm]);

    const performSearch = async () => {
        setLoading(true);
        try {
            let data: UserProfile[] = [];

            // 1. Check if input is likely a User UID (Pure Numbers)
            if (/^\d+$/.test(searchTerm)) {
                // Search ID (Exact) OR Name (Partial)
                // Since OR with mixed types is hard in one query, we split
                const { data: idData } = await supabase
                    .from('profiles')
                    .select('*')
                    .eq('user_uid', parseInt(searchTerm))
                    .eq('is_suspended', false);
                
                const { data: nameData } = await supabase
                    .from('profiles')
                    .select('*')
                    .ilike('name_1', `%${searchTerm}%`)
                    .eq('is_suspended', false)
                    .limit(20);

                // Merge and Deduplicate
                const combined = [...(idData || []), ...(nameData || [])];
                const unique = Array.from(new Map(combined.map(item => [item.id, item])).values());
                data = unique as UserProfile[];

            } else {
                // 2. Text Search (Name or Email)
                const { data: textData, error } = await supabase
                    .from('profiles')
                    .select('*')
                    .or(`name_1.ilike.%${searchTerm}%,email_1.ilike.%${searchTerm}%`)
                    .eq('is_suspended', false)
                    .limit(20);
                
                if (error) throw error;
                data = textData as UserProfile[];
            }

            setResults(data || []);
        } catch (error) {
            console.error("Search Error:", error);
        } finally {
            setLoading(false);
        }
    };

    const clearSearch = () => {
        setSearchTerm('');
        setResults([]);
    };

    return (
        <div className="pb-24 sm:pl-20 sm:pt-6 space-y-6 px-4 sm:px-0 min-h-screen">
            <header className="pt-4 space-y-2">
                <h1 className="text-3xl font-display font-black text-white flex items-center gap-3">
                    <Search className="text-neon-green" size={32} /> User Directory
                </h1>
                <p className="text-gray-400 text-sm max-w-md">
                    Locate any user by Name, Email, or ID instantly.
                </p>
            </header>

            {/* Search Input Area */}
            <div className="sticky top-0 z-30 bg-void/80 backdrop-blur-xl py-4 -mx-4 px-4 sm:mx-0 sm:px-0">
                <div className="relative group">
                    <div className="absolute inset-0 bg-gradient-to-r from-neon-green/20 to-blue-600/20 rounded-2xl blur-lg opacity-0 group-focus-within:opacity-100 transition-opacity duration-500"></div>
                    <div className="relative bg-[#111] border border-white/10 rounded-2xl overflow-hidden flex items-center shadow-2xl">
                        <div className="pl-4 text-gray-500">
                            {loading ? <Loader2 className="animate-spin text-neon-green" size={24} /> : <Search size={24} />}
                        </div>
                        <input 
                            type="text" 
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            placeholder="Type Name, Email, or ID (e.g., 10002001)" 
                            className="w-full bg-transparent border-none py-4 pl-4 pr-12 text-white text-lg placeholder-gray-600 focus:ring-0 font-medium"
                            autoFocus
                        />
                        {searchTerm && (
                            <button 
                                onClick={clearSearch}
                                className="absolute right-4 p-1 rounded-full bg-white/10 hover:bg-white/20 text-gray-400 hover:text-white transition"
                            >
                                <X size={16} />
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* AD PLACEMENT: DISPLAY RESPONSIVE */}
            <GoogleAd slot="9579822529" format="auto" responsive="true" />

            {/* Results Grid */}
            <div className="space-y-4">
                <AnimatePresence mode="popLayout">
                    {results.length > 0 ? (
                        results.map((user, idx) => (
                            <motion.div
                                key={user.id}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                                transition={{ delay: idx * 0.05 }}
                            >
                                <GlassCard className="group relative overflow-hidden border border-white/5 hover:border-white/20 transition-all duration-300">
                                    {/* Decoration Line */}
                                    <div className={`absolute top-0 left-0 bottom-0 w-1 ${user.is_dealer ? 'bg-amber-500' : user.admin_user ? 'bg-purple-500' : user.is_kyc_1 ? 'bg-neon-green' : 'bg-white/10'}`}></div>

                                    <div className="flex flex-col sm:flex-row items-center gap-6 p-2">
                                        
                                        {/* Avatar Section */}
                                        <div className="relative shrink-0">
                                            <div className="w-16 h-16 rounded-full p-0.5 bg-gradient-to-br from-white/20 to-transparent">
                                                <SmartImage 
                                                    src={user.avatar_1 || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.name_1}`} 
                                                    alt={user.name_1 || 'User'} 
                                                    className="w-full h-full object-cover rounded-full bg-black"
                                                />
                                            </div>
                                            <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-[#222] border border-white/10 text-white text-[9px] font-black px-2 py-0.5 rounded-full shadow-lg whitespace-nowrap">
                                                LVL {user.level_1}
                                            </div>
                                        </div>

                                        {/* Info Section */}
                                        <div className="flex-1 text-center sm:text-left min-w-0">
                                            <div className="flex items-center justify-center sm:justify-start gap-2 mb-1">
                                                <h3 className="text-lg font-black text-white truncate">{user.name_1 || 'Unknown User'}</h3>
                                                {user.is_kyc_1 && <ShieldCheck size={16} className="text-neon-green" />}
                                                {user.rank_1 && <Crown size={14} className="text-yellow-400 fill-yellow-400" />}
                                            </div>
                                            
                                            <div className="flex flex-wrap justify-center sm:justify-start gap-2 mb-2">
                                                <span className="font-mono text-xs text-gray-400 bg-black/40 px-1.5 py-0.5 rounded border border-white/5 select-all">
                                                    ID: {user.user_uid}
                                                </span>
                                                {user.is_dealer && (
                                                    <span className="text-[9px] font-bold uppercase bg-amber-500/20 text-amber-400 px-2 py-0.5 rounded border border-amber-500/30 flex items-center gap-1">
                                                        <Briefcase size={8} /> Dealer
                                                    </span>
                                                )}
                                                {user.admin_user && (
                                                    <span className="text-[9px] font-bold uppercase bg-purple-500/20 text-purple-400 px-2 py-0.5 rounded border border-purple-500/30 flex items-center gap-1">
                                                        <Star size={8} /> Staff
                                                    </span>
                                                )}
                                            </div>
                                            
                                            {user.email_1 && (
                                                <p className="text-xs text-gray-500 truncate max-w-[200px] mx-auto sm:mx-0">{user.email_1}</p>
                                            )}
                                        </div>

                                        {/* Actions Section */}
                                        <div className="flex items-center gap-3 w-full sm:w-auto mt-2 sm:mt-0">
                                            <Link 
                                                to={`/u/${user.user_uid}`}
                                                className="flex-1 sm:flex-none py-2.5 px-4 bg-white/5 hover:bg-white/10 border border-white/5 rounded-xl text-gray-300 hover:text-white transition flex items-center justify-center gap-2 text-xs font-bold"
                                            >
                                                <ExternalLink size={14} /> Profile
                                            </Link>
                                            
                                            {isGuest ? (
                                                <Link 
                                                    to="/login"
                                                    className="flex-1 sm:flex-none py-2.5 px-4 bg-neon-green/10 border border-neon-green/20 rounded-xl text-neon-green font-bold text-xs hover:bg-neon-green/20 transition flex items-center justify-center gap-2"
                                                >
                                                    <LogIn size={14} /> Login
                                                </Link>
                                            ) : (
                                                <Link 
                                                    to={`/send-money?to=${user.user_uid}`}
                                                    className="flex-1 sm:flex-none py-2.5 px-6 bg-neon-green text-black rounded-xl font-bold text-xs hover:bg-emerald-400 transition shadow-[0_0_15px_rgba(74,222,128,0.3)] flex items-center justify-center gap-2 hover:scale-105 active:scale-95"
                                                >
                                                    <Send size={14} /> Send Money
                                                </Link>
                                            )}
                                        </div>
                                    </div>
                                </GlassCard>
                            </motion.div>
                        ))
                    ) : (
                        !loading && searchTerm.length >= 2 && (
                            <motion.div 
                                initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                                className="text-center py-20 bg-[#111] rounded-3xl border border-white/5"
                            >
                                <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <User size={32} className="text-gray-600" />
                                </div>
                                <h3 className="text-white font-bold text-lg mb-1">No Users Found</h3>
                                <p className="text-gray-500 text-sm">Try searching by exact ID if name lookup fails.</p>
                            </motion.div>
                        )
                    )}
                </AnimatePresence>
                
                {!searchTerm && (
                    <div className="flex flex-col items-center justify-center py-20 opacity-50">
                        <Search size={48} className="text-gray-600 mb-4" />
                        <p className="text-gray-500 text-sm font-medium">Start typing to explore the community...</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default SearchUsers;