
import React, { useState } from 'react';
import GlassCard from '../components/GlassCard';
import { Search, User, ArrowRight, ExternalLink, Send, Loader2 } from 'lucide-react';
import { supabase } from '../integrations/supabase/client';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';

const SearchUsers: React.FC = () => {
    const [searchTerm, setSearchTerm] = useState('');
    const [results, setResults] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const handleSearch = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        if (!searchTerm || searchTerm.length < 3) return;

        setLoading(true);
        try {
            let query = supabase.from('profiles').select('user_uid, name_1, avatar_1, level_1').limit(10);

            // Check if input is likely an ID (all numbers, length 8)
            if (/^\d{8}$/.test(searchTerm)) {
                query = query.eq('user_uid', parseInt(searchTerm));
            } else {
                // Search by name or email (partial match)
                query = query.or(`name_1.ilike.%${searchTerm}%,email_1.ilike.%${searchTerm}%`);
            }

            const { data, error } = await query;
            if (error) throw error;
            setResults(data || []);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="pb-24 sm:pl-20 sm:pt-6 space-y-6 px-4 sm:px-0">
            <header className="pt-4">
                <h1 className="text-2xl font-display font-bold text-white flex items-center gap-2">
                    <Search className="text-neon-green" /> Find Users
                </h1>
                <p className="text-gray-400 text-xs">Search by Name, Email, or 8-digit ID</p>
            </header>

            <form onSubmit={handleSearch} className="relative">
                <input 
                    type="text" 
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Enter Name or ID..." 
                    className="w-full bg-white/5 border border-white/10 rounded-xl py-4 pl-12 pr-16 text-white focus:outline-none focus:border-neon-green transition placeholder-gray-600"
                    autoFocus
                />
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={20} />
                <button 
                    type="submit"
                    className="absolute right-2 top-1/2 -translate-y-1/2 bg-white/10 hover:bg-white/20 p-2 rounded-lg text-white transition"
                >
                    {loading ? <Loader2 className="animate-spin" size={20} /> : <ArrowRight size={20} />}
                </button>
            </form>

            <div className="space-y-3">
                <AnimatePresence>
                    {results.length > 0 ? (
                        results.map((user) => (
                            <motion.div
                                key={user.user_uid}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                            >
                                <GlassCard className="flex items-center gap-4 p-4 hover:bg-white/5 transition">
                                    <div className="w-12 h-12 rounded-full bg-black/30 border border-white/10 overflow-hidden shrink-0">
                                        <img 
                                            src={user.avatar_1 || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.name_1}`} 
                                            alt={user.name_1} 
                                            className="w-full h-full object-cover"
                                        />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h3 className="text-white font-bold truncate">{user.name_1 || 'Unknown'}</h3>
                                        <p className="text-xs text-gray-500 font-mono">ID: {user.user_uid}</p>
                                    </div>
                                    <div className="flex gap-2">
                                        <Link 
                                            to={`/u/${user.user_uid}`}
                                            className="p-2 bg-white/5 rounded-lg text-blue-400 hover:bg-blue-500/20 transition"
                                            title="Visit Profile"
                                        >
                                            <ExternalLink size={18} />
                                        </Link>
                                        <Link 
                                            to={`/send-money?to=${user.user_uid}`}
                                            className="p-2 bg-neon-green/10 rounded-lg text-neon-green hover:bg-neon-green/20 transition"
                                            title="Send Money"
                                        >
                                            <Send size={18} />
                                        </Link>
                                    </div>
                                </GlassCard>
                            </motion.div>
                        ))
                    ) : (
                        !loading && searchTerm && (
                            <div className="text-center py-10 text-gray-500">
                                No users found matching "{searchTerm}"
                            </div>
                        )
                    )}
                </AnimatePresence>
                
                {!searchTerm && (
                    <div className="text-center py-10">
                        <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4">
                            <User size={32} className="text-gray-600" />
                        </div>
                        <p className="text-gray-500 text-sm">Start typing to search users...</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default SearchUsers;
