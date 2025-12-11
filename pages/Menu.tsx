import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import GlassCard from '../components/GlassCard';
import { supabase } from '../integrations/supabase/client';
import { 
    Home, Wallet, Briefcase, TrendingUp, Users, Video, Gamepad2, 
    ArrowRightLeft, Send, RefreshCw, Globe, Search, Trophy, ShieldCheck, 
    HelpCircle, FileText, Bell, Lock, LogOut, Settings, Award, 
    Zap, Palette, Fingerprint, Crown, BarChart3, Grid, Activity, Dice1, PlayCircle,
    CheckCircle2, Megaphone, ArrowDownLeft, ArrowUpRight, User
} from 'lucide-react';
import { motion } from 'framer-motion';
import GoogleAd from '../components/GoogleAd';

interface MenuItem {
    name: string;
    path: string;
    icon: any;
    color: string;
    roles: ('all' | 'guest' | 'user' | 'admin' | 'dealer' | 'staff')[];
}

const MENU_ITEMS: MenuItem[] = [
    // --- CORE ---
    { name: 'Home', path: '/', icon: Home, color: 'text-white', roles: ['all'] },
    { name: 'Profile', path: '/profile', icon: User, color: 'text-blue-400', roles: ['user'] },
    
    // --- EARNING ---
    { name: 'Invest', path: '/invest', icon: TrendingUp, color: 'text-green-400', roles: ['user'] },
    { name: 'Tasks', path: '/tasks', icon: CheckCircle2, color: 'text-yellow-400', roles: ['user'] },
    { name: 'Games', path: '/games', icon: Gamepad2, color: 'text-purple-400', roles: ['user'] },
    { name: 'Video', path: '/video', icon: PlayCircle, color: 'text-red-400', roles: ['user'] },
    { name: 'Invite', path: '/invite', icon: Users, color: 'text-pink-400', roles: ['user'] },
    { name: 'Advertise', path: '/advertise', icon: Megaphone, color: 'text-orange-400', roles: ['user'] },

    // --- GAMES ---
    { name: 'Dice', path: '/games/dice', icon: Dice1, color: 'text-white', roles: ['user'] },
    { name: 'Spin', path: '/games/spin', icon: RefreshCw, color: 'text-cyan-400', roles: ['user'] },
    { name: 'Crash', path: '/games/crash', icon: TrendingUp, color: 'text-red-500', roles: ['user'] },

    // --- FINANCE ---
    { name: 'Wallet', path: '/wallet', icon: Wallet, color: 'text-emerald-400', roles: ['user'] },
    { name: 'Deposit', path: '/deposit', icon: ArrowDownLeft, color: 'text-green-500', roles: ['user'] },
    { name: 'Withdraw', path: '/withdraw', icon: ArrowUpRight, color: 'text-red-400', roles: ['user'] },
    { name: 'Transfer', path: '/transfer', icon: ArrowRightLeft, color: 'text-blue-300', roles: ['user'] },
    { name: 'Send', path: '/send-money', icon: Send, color: 'text-indigo-400', roles: ['user'] },
    { name: 'Exchange', path: '/exchange', icon: RefreshCw, color: 'text-yellow-500', roles: ['user'] },

    // --- UTILITY & SOCIAL ---
    { name: 'Top 10', path: '/leaderboard', icon: Trophy, color: 'text-amber-400', roles: ['all'] },
    { name: 'Search', path: '/search', icon: Search, color: 'text-gray-300', roles: ['all'] },
    { name: 'Notifications', path: '/notifications', icon: Bell, color: 'text-red-400', roles: ['user'] },
    { name: 'Themes', path: '/themes', icon: Palette, color: 'text-purple-300', roles: ['all'] },
    { name: 'Passkey', path: '/biometric-setup', icon: Fingerprint, color: 'text-green-300', roles: ['user'] },

    // --- DEALER ---
    { name: 'Dealer Dash', path: '/dealer/dashboard', icon: Award, color: 'text-amber-500', roles: ['dealer'] },
    { name: 'Campaigns', path: '/dealer/campaigns', icon: Briefcase, color: 'text-amber-400', roles: ['dealer'] },
    
    // --- STAFF ---
    { name: 'Staff Hub', path: '/staff/dashboard', icon: Users, color: 'text-purple-500', roles: ['staff'] },

    // --- ADMIN ---
    { name: 'Admin Panel', path: '/admin', icon: Lock, color: 'text-red-500', roles: ['admin'] },

    // --- SUPPORT ---
    { name: 'Support', path: '/support', icon: HelpCircle, color: 'text-blue-400', roles: ['all'] },
    { name: 'FAQ', path: '/faq', icon: FileText, color: 'text-gray-400', roles: ['all'] },
    { name: 'Terms', path: '/terms', icon: ShieldCheck, color: 'text-gray-400', roles: ['all'] },
];

const Menu: React.FC = () => {
    const [role, setRole] = useState<'guest' | 'user'>('guest');
    const [isAdmin, setIsAdmin] = useState(false);
    const [isDealer, setIsDealer] = useState(false);
    const [isStaff, setIsStaff] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const checkAccess = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (session) {
                setRole('user');
                const { data: profile } = await supabase.from('profiles').select('*').eq('id', session.user.id).single();
                if (profile) {
                    if (profile.role === 'admin' || profile.admin_user) setIsAdmin(true);
                    if (profile.is_dealer) setIsDealer(true);
                    if (profile.role === 'staff') setIsStaff(true);
                }
            }
            setLoading(false);
        };
        checkAccess();
    }, []);

    const visibleItems = MENU_ITEMS.filter(item => {
        if (item.roles.includes('all')) return true;
        if (role === 'guest' && item.roles.includes('guest')) return true;
        if (role === 'user') {
            if (item.roles.includes('user')) return true;
            if (isAdmin && item.roles.includes('admin')) return true;
            if (isDealer && item.roles.includes('dealer')) return true;
            if (isStaff && item.roles.includes('staff')) return true;
        }
        return false;
    });

    return (
        <div className="pb-24 sm:pl-20 sm:pt-6 px-4 sm:px-0 space-y-6">
            <header className="pt-4">
                <h1 className="text-2xl font-display font-bold text-white flex items-center gap-2">
                    <Grid className="text-white" size={24}/> App Menu
                </h1>
                <p className="text-gray-400 text-sm">Quick access to all features.</p>
            </header>

            <div className="grid grid-cols-3 gap-3">
                {visibleItems.map((item, idx) => (
                    <motion.div
                        key={item.name}
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: idx * 0.02 }}
                    >
                        <Link to={item.path}>
                            <GlassCard className="flex flex-col items-center justify-center p-4 h-full aspect-square hover:bg-white/10 transition border border-white/5 bg-black/40">
                                <item.icon size={28} className={`${item.color} mb-2`} />
                                <span className="text-[10px] font-bold text-gray-300 text-center uppercase leading-tight">
                                    {item.name}
                                </span>
                            </GlassCard>
                        </Link>
                    </motion.div>
                ))}
                
                {/* Logout for Users */}
                {role === 'user' && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.5 }}
                        onClick={async () => {
                            await supabase.auth.signOut();
                            window.location.href = '/#/login';
                        }}
                    >
                        <GlassCard className="flex flex-col items-center justify-center p-4 h-full aspect-square hover:bg-red-900/20 transition border border-red-500/20 bg-black/40 cursor-pointer">
                            <LogOut size={28} className="text-red-500 mb-2" />
                            <span className="text-[10px] font-bold text-red-400 text-center uppercase leading-tight">
                                Sign Out
                            </span>
                        </GlassCard>
                    </motion.div>
                )}

                {/* Login for Guests */}
                {role === 'guest' && (
                    <>
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                        >
                            <Link to="/login">
                                <GlassCard className="flex flex-col items-center justify-center p-4 h-full aspect-square hover:bg-green-900/20 transition border border-green-500/20 bg-black/40">
                                    <Zap size={28} className="text-green-500 mb-2" />
                                    <span className="text-[10px] font-bold text-green-400 text-center uppercase leading-tight">
                                        Login
                                    </span>
                                </GlassCard>
                            </Link>
                        </motion.div>
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                        >
                            <Link to="/signup">
                                <GlassCard className="flex flex-col items-center justify-center p-4 h-full aspect-square hover:bg-blue-900/20 transition border border-blue-500/20 bg-black/40">
                                    <Activity size={28} className="text-blue-500 mb-2" />
                                    <span className="text-[10px] font-bold text-blue-400 text-center uppercase leading-tight">
                                        Register
                                    </span>
                                </GlassCard>
                            </Link>
                        </motion.div>
                    </>
                )}
            </div>

            {/* AD PLACEMENT: DISPLAY RESPONSIVE */}
            <GoogleAd slot="9579822529" format="auto" responsive="true" />
        </div>
    );
};

export default Menu;