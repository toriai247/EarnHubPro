
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import GlassCard from '../components/GlassCard';
import { supabase } from '../integrations/supabase/client';
import { 
    Home, Wallet, Briefcase, TrendingUp, Users, Globe, Search, Trophy, ShieldCheck, 
    HelpCircle, Bell, Lock, LogOut, Zap, Palette, Fingerprint, Crown, Grid, 
    Activity, PlayCircle, Megaphone, ArrowDownLeft, ArrowUpRight, User, 
    RefreshCw, Send, ArrowRightLeft, BookOpen, Smartphone, Dice5, Rocket, Disc, Layers, Apple, EyeOff, Coins, Pyramid, ChevronRight, Ticket
} from 'lucide-react';
import { motion } from 'framer-motion';
import GoogleAd from '../components/GoogleAd';
import BalanceDisplay from '../components/BalanceDisplay';

interface MenuItem {
    name: string;
    path: string;
    icon: any;
    color: string;
    bg: string;
    roles: ('all' | 'guest' | 'user' | 'admin' | 'dealer' | 'staff')[];
}

const MENU_SECTIONS = [
    {
        title: 'Financial Gateway',
        items: [
            { name: 'Dashboard', path: '/wallet', icon: Wallet, color: 'text-emerald-400', bg: 'bg-emerald-500/10', roles: ['user'] },
            { name: 'Add Funds', path: '/deposit', icon: ArrowDownLeft, color: 'text-green-400', bg: 'bg-green-500/10', roles: ['user'] },
            { name: 'Withdraw', path: '/withdraw', icon: ArrowUpRight, color: 'text-red-400', bg: 'bg-red-500/10', roles: ['user'] },
            { name: 'Transfer', path: '/transfer', icon: ArrowRightLeft, color: 'text-blue-400', bg: 'bg-blue-500/10', roles: ['user'] },
            { name: 'P2P Send', path: '/send-money', icon: Send, color: 'text-indigo-400', bg: 'bg-indigo-500/10', roles: ['user'] },
            { name: 'Swap BDT', path: '/exchange', icon: RefreshCw, color: 'text-cyan-400', bg: 'bg-cyan-500/10', roles: ['user'] },
        ]
    },
    {
        title: 'Earning Units',
        items: [
            { name: 'Micro Jobs', path: '/tasks', icon: Globe, color: 'text-orange-400', bg: 'bg-orange-500/10', roles: ['user'] },
            { name: 'Video Ads', path: '/video', icon: PlayCircle, color: 'text-rose-400', bg: 'bg-rose-500/10', roles: ['user'] },
            { name: 'Lottery Draw', path: '/lottery', icon: Ticket, color: 'text-brand', bg: 'bg-brand/10', roles: ['user'] },
            { name: 'VIP Lounge', path: '/vip', icon: Crown, color: 'text-yellow-400', bg: 'bg-yellow-500/10', roles: ['user'] },
            { name: 'Market', path: '/invest', icon: TrendingUp, color: 'text-emerald-400', bg: 'bg-emerald-500/10', roles: ['user'] },
            { name: 'Affiliate', path: '/unlimited-earn', icon: Zap, color: 'text-yellow-400', bg: 'bg-yellow-500/10', roles: ['user'] },
        ]
    },
    {
        title: 'Battle Arena',
        items: [
            { name: 'Space Crash', path: '/games/crash', icon: Rocket, color: 'text-red-400', bg: 'bg-red-500/10', roles: ['user'] },
            { name: 'Lucky Spin', path: '/games/spin', icon: Disc, color: 'text-purple-400', bg: 'bg-purple-500/10', roles: ['user'] },
            { name: 'Dice Duel', path: '/games/dice', icon: Dice5, color: 'text-blue-400', bg: 'bg-blue-500/10', roles: ['user'] },
            { name: 'Plinko', path: '/games/plinko', icon: Layers, color: 'text-cyan-400', bg: 'bg-cyan-500/10', roles: ['user'] },
            { name: 'Coin Flip', path: '/games/head-tail', icon: Coins, color: 'text-amber-400', bg: 'bg-amber-500/10', roles: ['user'] },
        ]
    },
    {
        title: 'Community & Intel',
        items: [
            { name: 'Hall of Fame', path: '/leaderboard', icon: Trophy, color: 'text-amber-400', bg: 'bg-amber-500/10', roles: ['all'] },
            { name: 'Find Users', path: '/search', icon: Search, color: 'text-sky-400', bg: 'bg-sky-500/10', roles: ['all'] },
            { name: 'Invite Flow', path: '/invite', icon: Users, color: 'text-pink-400', bg: 'bg-pink-500/10', roles: ['user'] },
            { name: 'My Identity', path: '/profile', icon: User, color: 'text-blue-400', bg: 'bg-blue-500/10', roles: ['user'] },
        ]
    },
    {
        title: 'Core Systems',
        items: [
            { name: 'Interface', path: '/themes', icon: Palette, color: 'text-brand', bg: 'bg-brand/10', roles: ['all'] },
            { name: 'Passkey', path: '/biometric-setup', icon: Fingerprint, color: 'text-purple-400', bg: 'bg-purple-500/10', roles: ['user'] },
            { name: 'Support', path: '/support', icon: Activity, color: 'text-emerald-400', bg: 'bg-emerald-500/10', roles: ['all'] },
            { name: 'FAQ', path: '/faq', icon: HelpCircle, color: 'text-blue-300', bg: 'bg-blue-500/10', roles: ['all'] },
            { name: 'Security', path: '/terms', icon: ShieldCheck, color: 'text-gray-400', bg: 'bg-white/5', roles: ['all'] },
        ]
    }
];

const Menu: React.FC = () => {
    const [role, setRole] = useState<'guest' | 'user'>('guest');
    const [isAdmin, setIsAdmin] = useState(false);
    const [loading, setLoading] = useState(true);
    const [balance, setBalance] = useState(0);

    useEffect(() => {
        const checkAccess = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (session) {
                setRole('user');
                const [profRes, walRes] = await Promise.all([
                    supabase.from('profiles').select('*').eq('id', session.user.id).maybeSingle(),
                    supabase.from('wallets').select('balance').eq('user_id', session.user.id).maybeSingle()
                ]);
                if (profRes.data && (profRes.data.role === 'admin' || profRes.data.admin_user)) setIsAdmin(true);
                if (walRes.data) setBalance(walRes.data.balance);
            }
            setLoading(false);
        };
        checkAccess();
    }, []);

    const filterItems = (items: any[]) => items.filter(item => {
        if (item.roles.includes('all')) return true;
        if (role === 'guest' && item.roles.includes('guest')) return true;
        if (role === 'user' && item.roles.includes('user')) return true;
        return false;
    });

    return (
        <div className="pb-32 sm:pl-20 sm:pt-6 px-4 sm:px-0 space-y-8 animate-fade-in">
            
            <header className="pt-6 flex flex-col items-center text-center gap-4">
                <div className="w-20 h-20 bg-brand rounded-3xl flex items-center justify-center text-black shadow-glow border-4 border-black relative group">
                    <Grid size={36} className="group-hover:rotate-90 transition-transform duration-500" />
                    <div className="absolute -top-2 -right-2 w-6 h-6 bg-green-500 border-4 border-black rounded-full animate-pulse"></div>
                </div>
                <div>
                    <h1 className="text-3xl font-black text-white uppercase tracking-tighter">Command Center</h1>
                    <div className="flex items-center gap-2 justify-center mt-1">
                        <span className="text-gray-500 text-[10px] font-black uppercase tracking-[0.3em]">System Identity:</span>
                        <span className="text-brand font-mono font-black text-sm"><BalanceDisplay amount={balance} /></span>
                    </div>
                </div>
            </header>

            <div className="space-y-12">
                {MENU_SECTIONS.map((section, sIdx) => {
                    const visibleItems = filterItems(section.items);
                    if (visibleItems.length === 0) return null;

                    return (
                        <div key={section.title} className="space-y-4">
                            <h3 className="text-[10px] font-black text-gray-600 uppercase tracking-[0.4em] px-2 flex items-center gap-3">
                                <div className="h-px bg-white/5 flex-1"></div>
                                {section.title}
                                <div className="h-px bg-white/5 flex-1"></div>
                            </h3>
                            
                            <div className="grid grid-cols-3 gap-3">
                                {visibleItems.map((item, idx) => (
                                    <motion.div
                                        key={item.name}
                                        initial={{ opacity: 0, scale: 0.9 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        transition={{ delay: (sIdx * 0.05) + (idx * 0.02) }}
                                    >
                                        <Link to={item.path}>
                                            <div className="bg-[#0a0a0a] border border-white/5 rounded-[2rem] p-4 flex flex-col items-center justify-center gap-2 hover:bg-white/[0.03] hover:border-brand/40 transition-all active:scale-90 group h-full aspect-square shadow-lg">
                                                <div className={`w-11 h-11 rounded-2xl ${item.bg} flex items-center justify-center ${item.color} border border-white/5 shadow-inner transition-transform group-hover:scale-110 group-hover:rotate-3`}>
                                                    <item.icon size={22} strokeWidth={2.5} />
                                                </div>
                                                <span className="text-[8px] font-black text-gray-500 text-center uppercase tracking-widest leading-tight group-hover:text-white transition-colors">
                                                    {item.name}
                                                </span>
                                            </div>
                                        </Link>
                                    </motion.div>
                                ))}
                            </div>
                        </div>
                    );
                })}
            </div>

            {isAdmin && (
                <div className="pt-4">
                    <Link to="/admin/dashboard" className="block">
                        <div className="bg-red-900/10 border border-red-500/20 rounded-[2.5rem] p-6 flex items-center justify-between hover:bg-red-900/20 transition group">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 bg-red-500 text-white rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                                    <Lock size={24} />
                                </div>
                                <div className="text-left">
                                    <p className="text-sm font-black text-white uppercase tracking-tighter">Root Administrator</p>
                                    <p className="text-[9px] text-red-400 font-bold uppercase tracking-widest">Full System Oversight</p>
                                </div>
                            </div>
                            <ChevronRight className="text-red-500" />
                        </div>
                    </Link>
                </div>
            )}

            <div className="px-1">
                <GoogleAd slot="9579822529" format="auto" responsive="true" />
            </div>

            <p className="text-center text-[10px] text-gray-800 font-black uppercase tracking-[0.5em] pt-8 pb-12">
                Naxxivo Core Node V5.2.0
            </p>
        </div>
    );
};

export default Menu;
