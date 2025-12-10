
import React, { useEffect, useState } from 'react';
import { 
  LayoutDashboard, Users, Video, CreditCard, Gamepad2, 
  Briefcase, TrendingUp, Gift, Settings, CheckCircle, Database, Lock, Home, PieChart, Banknote, Sliders, CalendarClock, ArrowLeft, MonitorOff, LifeBuoy, HardDrive, BellRing, GitFork, ShieldCheck, Calendar, Globe, MessageSquare, Image, BookOpen, Menu, X, ChevronRight
} from 'lucide-react';
import { supabase } from '../../integrations/supabase/client';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';

// Import Sub-pages
import Dashboard from './Dashboard';
import UserManagement from './UserManagement';
import UserInfo from './UserInfo';
import TaskManagement from './TaskManagement';
import VideoManagement from './VideoManagement';
import FinanceManager from './FinanceManager'; // Unified Finance
import GameControl from './GameControl';
import InvestmentSetup from './InvestmentSetup';
import EarningsAnalytics from './EarningsAnalytics';
import BonusControl from './BonusControl';
import WebsiteSettings from './WebsiteSettings';
import SpinSettings from './SpinSettings';
import PaymentSettings from './PaymentSettings';
import WithdrawSettings from './WithdrawSettings';
import MonthlyPay from './MonthlyPay';
import OffSystems from './OffSystems'; 
import HelpRequests from './HelpRequests';
import DatabaseUltra from './DatabaseUltra';
import NotiSender from './NotiSender';
import ReferralControl from './ReferralControl';
import VerificationRequest from './VerificationRequest';
import DailyBonusControl from './DailyBonusControl';
import SiteManagement from './SiteManagement';
import ReviewManagement from './ReviewManagement';
import ImageManager from './ImageManager';
import BusinessLogic from './BusinessLogic';

const Admin: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<string>('user');
  const [loading, setLoading] = useState(true);
  
  // Mobile Navigation State
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Derive active section from URL
  const pathParts = location.pathname.split('/');
  const activeSection = pathParts[2] || 'dashboard';

  // --- CATEGORIZED NAVIGATION STRUCTURE ---
  const navCategories = [
      {
          title: "Core",
          items: [
              { id: 'dashboard', icon: LayoutDashboard, label: 'Dashboard', path: '/admin/dashboard', color: 'text-blue-400' },
              { id: 'users', icon: Users, label: 'Users', path: '/admin/users', color: 'text-indigo-400' },
              { id: 'revenue', icon: TrendingUp, label: 'Revenue', path: '/admin/revenue', color: 'text-green-400' },
          ]
      },
      {
          title: "Finance",
          items: [
              { id: 'finance', icon: Banknote, label: 'Finance Hub', path: '/admin/finance', color: 'text-emerald-400' },
              { id: 'monthly_pay', icon: CalendarClock, label: 'Payroll', path: '/admin/monthly_pay', color: 'text-orange-400' },
              { id: 'payment', icon: CreditCard, label: 'Methods', path: '/admin/payment', color: 'text-gray-400' },
              { id: 'withdraw_config', icon: Sliders, label: 'Limits', path: '/admin/withdraw_config', color: 'text-gray-400' },
          ]
      },
      {
          title: "Modules",
          items: [
              { id: 'tasks', icon: CheckCircle, label: 'Tasks', path: '/admin/tasks', color: 'text-yellow-400' },
              { id: 'games', icon: Gamepad2, label: 'Games', path: '/admin/games', color: 'text-purple-400' },
              { id: 'videos', icon: Video, label: 'Videos', path: '/admin/videos', color: 'text-red-500' },
              { id: 'invest', icon: Briefcase, label: 'Invest', path: '/admin/invest', color: 'text-blue-500' },
              { id: 'sites', icon: Globe, label: 'Publisher', path: '/admin/sites', color: 'text-cyan-400' },
              { id: 'spin', icon: PieChart, label: 'Spin Wheel', path: '/admin/spin', color: 'text-pink-400' },
          ]
      },
      {
          title: "System",
          items: [
              { id: 'config', icon: Settings, label: 'Settings', path: '/admin/config', color: 'text-white' },
              { id: 'off_systems', icon: MonitorOff, label: 'Controls', path: '/admin/off_systems', color: 'text-red-500' },
              { id: 'database_ultra', icon: HardDrive, label: 'Database', path: '/admin/database_ultra', color: 'text-cyan-500' },
              { id: 'images', icon: Image, label: 'Assets', path: '/admin/images', color: 'text-pink-300' },
              { id: 'noti_sender', icon: BellRing, label: 'Notify', path: '/admin/noti_sender', color: 'text-yellow-300' },
              { id: 'business_logic', icon: BookOpen, label: 'Roadmap', path: '/admin/business_logic', color: 'text-green-300' },
          ]
      },
      {
          title: "Support",
          items: [
              { id: 'help_requests', icon: LifeBuoy, label: 'Tickets', path: '/admin/help_requests', color: 'text-blue-300' },
              { id: 'verification', icon: ShieldCheck, label: 'KYC', path: '/admin/verification', color: 'text-emerald-300' },
              { id: 'reviews', icon: MessageSquare, label: 'Reviews', path: '/admin/reviews', color: 'text-pink-300' },
              { id: 'referrals', icon: GitFork, label: 'Referrals', path: '/admin/referrals', color: 'text-indigo-300' },
              { id: 'daily_bonus', icon: Calendar, label: 'Daily Bonus', path: '/admin/daily_bonus', color: 'text-purple-300' },
              { id: 'promos', icon: Gift, label: 'Promos', path: '/admin/promos', color: 'text-orange-300' },
          ]
      }
  ];

  // Flattened list for permission checking
  const allItems = navCategories.flatMap(c => c.items).map(i => ({...i, roles: ['admin', 'moderator']})); 

  useEffect(() => {
    const checkAdmin = async () => {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) { navigate('/login'); return; }
        
        const { data: profile } = await supabase.from('profiles').select('*').eq('id', session.user.id).single();
        
        if (!profile || (!profile.admin_user && profile.role !== 'admin' && profile.role !== 'moderator')) {
            navigate('/');
            return;
        }

        let role = 'admin';
        if (profile.role) role = profile.role;
        else if (profile.admin_user) role = 'admin';

        setUserRole(role === 'moderator' ? 'moderator' : 'admin');
        setLoading(false);
    };
    checkAdmin();
  }, [navigate]);

  const renderContent = () => {
      if (activeSection === 'users' && selectedUserId) {
          return <UserInfo userId={selectedUserId} onBack={() => setSelectedUserId(null)} />;
      }

      switch(activeSection) {
          case 'dashboard': return <Dashboard />;
          case 'business_logic': return <BusinessLogic />;
          case 'database_ultra': return <DatabaseUltra />;
          case 'noti_sender': return <NotiSender />;
          case 'off_systems': return <OffSystems />;
          case 'help_requests': return <HelpRequests />;
          case 'reviews': return <ReviewManagement />;
          case 'verification': return <VerificationRequest />;
          case 'users': return <UserManagement onSelectUser={setSelectedUserId} />;
          case 'referrals': return <ReferralControl />; 
          case 'tasks': return <TaskManagement />;
          case 'sites': return <SiteManagement />;
          case 'images': return <ImageManager />;
          case 'spin': return <SpinSettings />;
          case 'daily_bonus': return <DailyBonusControl />;
          case 'payment': return <PaymentSettings />;
          case 'withdraw_config': return <WithdrawSettings />;
          case 'monthly_pay': return <MonthlyPay />;
          case 'videos': return <VideoManagement />;
          case 'finance': return <FinanceManager />; // Unified Page
          case 'games': return <GameControl />;
          case 'invest': return <InvestmentSetup />;
          case 'revenue': return <EarningsAnalytics />;
          case 'promos': return <BonusControl />;
          case 'config': return <WebsiteSettings />;
          default: return <Dashboard />;
      }
  };

  const getPageTitle = () => {
      const item = allItems.find(i => i.id === activeSection);
      return item ? item.label : 'Admin Panel';
  };

  if (loading) return <div className="min-h-screen bg-black flex items-center justify-center"><div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div></div>;

  return (
    <div className="min-h-screen bg-[#050505] flex font-sans text-gray-100 pb-20 md:pb-0">
        
        {/* DESKTOP SIDEBAR */}
        <aside className="w-64 bg-[#0a0a0a] border-r border-white/5 flex-shrink-0 hidden md:flex flex-col h-screen sticky top-0 overflow-y-auto custom-scrollbar z-50">
            <div className="p-6 border-b border-white/5">
                <h2 className="text-xl font-black text-white flex items-center gap-2 tracking-tight">
                    <Lock className="text-blue-500" size={20} /> ADMIN<span className="text-blue-500">OS</span>
                </h2>
                <div className="flex items-center gap-2 mt-2">
                    <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                    <span className="text-[10px] text-gray-500 font-mono uppercase">System Active</span>
                </div>
            </div>
            
            <div className="flex-1 py-4 px-3 space-y-6">
                <Link to="/" className="flex items-center gap-3 px-3 py-2 text-gray-400 hover:text-white hover:bg-white/5 rounded-lg transition mb-4">
                    <Home size={18} /> Back to App
                </Link>

                {navCategories.map((cat, idx) => (
                    <div key={idx}>
                        <h3 className="text-[10px] font-bold text-gray-600 uppercase tracking-wider mb-2 px-3">{cat.title}</h3>
                        <div className="space-y-0.5">
                            {cat.items.map(item => (
                                <Link
                                    key={item.id}
                                    to={item.path}
                                    className={`flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-bold transition ${
                                        activeSection === item.id 
                                        ? 'bg-blue-600/10 text-blue-400 border border-blue-600/20' 
                                        : 'text-gray-400 hover:bg-white/5 hover:text-white'
                                    }`}
                                >
                                    <item.icon size={16} className={item.color} />
                                    {item.label}
                                </Link>
                            ))}
                        </div>
                    </div>
                ))}
            </div>
        </aside>
        
        {/* MOBILE HEADER */}
        <div className="md:hidden fixed top-0 left-0 right-0 h-14 bg-black/80 backdrop-blur-xl border-b border-white/10 z-40 flex items-center justify-between px-4">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <span className="text-blue-500">/</span> {getPageTitle()}
            </h2>
            <Link to="/" className="p-2 bg-white/5 rounded-full text-gray-400">
                <Home size={18} />
            </Link>
        </div>

        {/* MAIN CONTENT */}
        <main className="flex-1 p-4 md:p-8 pt-20 md:pt-8 w-full max-w-7xl mx-auto overflow-x-hidden">
            <AnimatePresence mode="wait">
                <motion.div
                    key={activeSection}
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -5 }}
                    transition={{ duration: 0.15 }}
                >
                    {renderContent()}
                </motion.div>
            </AnimatePresence>
        </main>

        {/* MOBILE BOTTOM NAV */}
        <div className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-[#0a0a0a] border-t border-white/10 z-50 flex justify-around items-center px-2 pb-safe">
            <Link to="/admin/dashboard" className={`flex flex-col items-center justify-center w-full h-full ${activeSection === 'dashboard' ? 'text-blue-500' : 'text-gray-500'}`}>
                <LayoutDashboard size={20} />
                <span className="text-[9px] font-bold mt-1">Dash</span>
            </Link>
            <Link to="/admin/users" className={`flex flex-col items-center justify-center w-full h-full ${activeSection === 'users' ? 'text-blue-500' : 'text-gray-500'}`}>
                <Users size={20} />
                <span className="text-[9px] font-bold mt-1">Users</span>
            </Link>
            <Link to="/admin/finance" className={`flex flex-col items-center justify-center w-full h-full ${activeSection === 'finance' ? 'text-blue-500' : 'text-gray-500'}`}>
                <Banknote size={20} />
                <span className="text-[9px] font-bold mt-1">Finance</span>
            </Link>
            <Link to="/admin/off_systems" className={`flex flex-col items-center justify-center w-full h-full ${activeSection === 'off_systems' ? 'text-blue-500' : 'text-gray-500'}`}>
                <MonitorOff size={20} />
                <span className="text-[9px] font-bold mt-1">System</span>
            </Link>
            <button onClick={() => setMobileMenuOpen(true)} className={`flex flex-col items-center justify-center w-full h-full ${mobileMenuOpen ? 'text-blue-500' : 'text-gray-500'}`}>
                <Menu size={20} />
                <span className="text-[9px] font-bold mt-1">More</span>
            </button>
        </div>

        {/* MOBILE FULL DRAWER MENU */}
        <AnimatePresence>
            {mobileMenuOpen && (
                <motion.div 
                    initial={{ x: '100%' }}
                    animate={{ x: 0 }}
                    exit={{ x: '100%' }}
                    transition={{ type: "spring", damping: 25, stiffness: 200 }}
                    className="md:hidden fixed inset-0 z-[60] bg-[#050505] flex flex-col"
                >
                    {/* Drawer Header */}
                    <div className="h-16 flex items-center justify-between px-6 border-b border-white/10 bg-[#0a0a0a]">
                        <h2 className="text-lg font-black text-white tracking-tight">ADMIN MENU</h2>
                        <button onClick={() => setMobileMenuOpen(false)} className="p-2 bg-white/10 rounded-full text-white">
                            <X size={20} />
                        </button>
                    </div>

                    {/* Drawer Content */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-6 pb-24">
                        {navCategories.map((cat, idx) => (
                            <div key={idx}>
                                <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3 px-2 border-b border-white/5 pb-1">
                                    {cat.title}
                                </h3>
                                <div className="grid grid-cols-2 gap-3">
                                    {cat.items.map(item => (
                                        <Link
                                            key={item.id}
                                            to={item.path}
                                            onClick={() => setMobileMenuOpen(false)}
                                            className={`flex flex-col items-center justify-center p-4 rounded-xl border transition active:scale-95 ${
                                                activeSection === item.id 
                                                ? 'bg-blue-600/10 border-blue-600/30' 
                                                : 'bg-white/5 border-white/5'
                                            }`}
                                        >
                                            <item.icon size={24} className={`${item.color} mb-2`} />
                                            <span className="text-xs font-bold text-gray-300">{item.label}</span>
                                        </Link>
                                    ))}
                                </div>
                            </div>
                        ))}
                        
                        <button 
                            onClick={() => {
                                setMobileMenuOpen(false);
                                navigate('/');
                            }}
                            className="w-full py-4 bg-white/5 border border-white/10 rounded-xl text-sm font-bold text-gray-400 flex items-center justify-center gap-2"
                        >
                            <Home size={18}/> Exit to App
                        </button>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>

    </div>
  );
};

export default Admin;
