
import React, { useEffect, useState } from 'react';
import { 
  LayoutDashboard, Users, Video, CreditCard, Gamepad2, 
  Briefcase, TrendingUp, Gift, Settings, CheckCircle, Database, Lock, Home, PieChart, Banknote, Sliders, CalendarClock, ArrowLeft, MonitorOff, LifeBuoy, HardDrive, BellRing, GitFork, ShieldCheck, Calendar, Globe, MessageSquare, Image, BookOpen, Menu, X, ChevronRight, BarChart3, Key, Table, Terminal, Cloud, Shield, Ticket, Code
} from 'lucide-react';
import { supabase } from '../../integrations/supabase/client';
import { useNavigate, useLocation, Link, Routes, Route } from 'react-router-dom';

// Import Sub-pages
import Dashboard from './Dashboard';
import UserManagement from './UserManagement';
import UserInfo from './UserInfo';
import TaskManagement from './TaskManagement';
import VideoManagement from './VideoManagement';
import FinanceManager from './FinanceManager'; 
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
import NotiSender from './NotiSender';
import ReferralControl from './ReferralControl';
import VerificationRequest from './VerificationRequest';
import DailyBonusControl from './DailyBonusControl';
import SiteManagement from './SiteManagement';
import ReviewManagement from './ReviewManagement';
import ImageManager from './ImageManager';
import BusinessLogic from './BusinessLogic';
import AdAnalytics from './AdAnalytics';
import LotteryManager from './LotteryManager';
import WebFilesEdit from './WebFilesEdit';

const Admin: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const activePath = location.pathname.split('/').pop() || 'dashboard';

  const navCategories = [
      {
          title: "Core Operations",
          items: [
              { id: 'dashboard', icon: LayoutDashboard, label: 'Control Center', path: '/admin/dashboard', color: 'text-blue-500' },
              { id: 'users', icon: Users, label: 'User Directory', path: '/admin/users', color: 'text-indigo-500' },
              { id: 'revenue', icon: TrendingUp, label: 'Financial Reports', path: '/admin/revenue', color: 'text-green-500' },
              { id: 'ad_stats', icon: BarChart3, label: 'Ad Analytics', path: '/admin/ad_stats', color: 'text-cyan-500' },
          ]
      },
      {
          title: "Assets & Code",
          items: [
              { id: 'web_files', icon: Code, label: 'File Editor', path: '/admin/web_files', color: 'text-orange-500' },
              { id: 'sites', icon: Globe, label: 'Site Publisher', path: '/admin/sites', color: 'text-cyan-500' },
              { id: 'images', icon: Image, label: 'CDN Manager', path: '/admin/images', color: 'text-pink-500' },
              { id: 'business_logic', icon: BookOpen, label: 'System Logic', path: '/admin/business_logic', color: 'text-green-500' },
          ]
      },
      {
          title: "Treasury",
          items: [
              { id: 'finance', icon: Banknote, label: 'Approval Queue', path: '/admin/finance', color: 'text-emerald-500' },
              { id: 'monthly_pay', icon: CalendarClock, label: 'Payroll Engine', path: '/admin/monthly_pay', color: 'text-orange-500' },
              { id: 'payment', icon: CreditCard, label: 'Gateways', path: '/admin/payment', color: 'text-gray-400' },
              { id: 'withdraw_config', icon: Sliders, label: 'Policy Config', path: '/admin/withdraw_config', color: 'text-gray-400' },
          ]
      },
      {
          title: "Revenue Streams",
          items: [
              { id: 'tasks', icon: CheckCircle, label: 'Micro Jobs', path: '/admin/tasks', color: 'text-yellow-500' },
              { id: 'games', icon: Gamepad2, label: 'Game Modules', path: '/admin/games', color: 'text-purple-500' },
              { id: 'videos', icon: Video, label: 'Video Network', path: '/admin/videos', color: 'text-red-500' },
              { id: 'lottery', icon: Ticket, label: 'Prize Draws', path: '/admin/lottery', color: 'text-yellow-600' },
              { id: 'invest', icon: Briefcase, label: 'VIP Assets', path: '/admin/invest', color: 'text-blue-600' },
              { id: 'spin', icon: PieChart, label: 'Fortune Wheel', path: '/admin/spin', color: 'text-pink-500' },
          ]
      },
      {
          title: "System Logs",
          items: [
              { id: 'config', icon: Settings, label: 'Global Config', path: '/admin/config', color: 'text-slate-300' },
              { id: 'off_systems', icon: MonitorOff, label: 'System Toggles', path: '/admin/off_systems', color: 'text-red-600' },
              { id: 'noti_sender', icon: BellRing, label: 'Broadcast', path: '/admin/noti_sender', color: 'text-yellow-500' },
          ]
      }
  ];

  useEffect(() => {
    const checkAdmin = async () => {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) { navigate('/login'); return; }
        const { data: profile } = await supabase.from('profiles').select('*').eq('id', session.user.id).single();
        if (!profile || (!profile.admin_user && profile.role !== 'admin' && profile.role !== 'moderator')) {
            navigate('/');
            return;
        }
        setLoading(false);
    };
    checkAdmin();
  }, [navigate]);

  const getPageTitle = () => {
      for (const cat of navCategories) {
          for (const item of cat.items) {
              if (location.pathname.includes(item.path)) return item.label;
          }
      }
      return 'Dashboard';
  };

  const isPathActive = (path: string) => location.pathname === path;

  if (loading) return (
    <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
            <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
            <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">Verifying Protocol</span>
        </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#050505] flex font-sans text-gray-100">
        
        {/* SIDEBAR - STATIC NO ANIMATION */}
        <aside className="w-72 bg-[#0a0a0a] border-r border-white/5 flex-shrink-0 hidden md:flex flex-col h-screen sticky top-0 overflow-y-auto custom-scrollbar z-50">
            <div className="p-8 border-b border-white/5">
                <Link to="/" className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center shadow-lg shadow-blue-900/20">
                        <Shield size={20} className="text-white" />
                    </div>
                    <h2 className="text-lg font-black text-white uppercase tracking-tighter">
                        NAXXIVO <span className="text-blue-500">CORE</span>
                    </h2>
                </Link>
            </div>
            
            <div className="flex-1 py-6 px-4 space-y-8">
                {navCategories.map((cat, idx) => (
                    <div key={idx}>
                        <h3 className="text-[10px] font-black text-gray-600 uppercase tracking-[0.2em] mb-3 px-3">{cat.title}</h3>
                        <div className="space-y-1">
                            {cat.items.map(item => (
                                <Link
                                    key={item.id}
                                    to={item.path}
                                    className={`flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs font-bold transition-colors ${
                                        isPathActive(item.path)
                                        ? 'bg-blue-600 text-white shadow-lg' 
                                        : 'text-gray-400 hover:bg-white/5 hover:text-gray-200'
                                    }`}
                                >
                                    <item.icon size={16} className={isPathActive(item.path) ? 'text-white' : item.color} />
                                    {item.label}
                                </Link>
                            ))}
                        </div>
                    </div>
                ))}
            </div>
            
            <div className="p-4 mt-auto border-t border-white/5">
                <Link to="/" className="flex items-center gap-3 px-4 py-3 text-gray-500 hover:text-white hover:bg-white/5 rounded-xl text-xs font-bold transition-all">
                    <ArrowLeft size={16} /> Exit Terminal
                </Link>
            </div>
        </aside>
        
        {/* MOBILE HEADER */}
        <div className="md:hidden fixed top-0 left-0 right-0 h-16 bg-black/90 backdrop-blur-xl border-b border-white/10 z-40 flex items-center justify-between px-6">
            <h2 className="text-sm font-black text-white uppercase tracking-widest">
                <span className="text-blue-500">SYS_</span>{getPageTitle().toUpperCase()}
            </h2>
            <button onClick={() => setMobileMenuOpen(true)} className="p-2 text-gray-400">
                <Menu size={24} />
            </button>
        </div>

        {/* MAIN CONTENT AREA */}
        <main className="flex-1 p-4 md:p-10 pt-20 md:pt-10 w-full max-w-7xl mx-auto overflow-x-hidden">
            <div className="mb-8 hidden md:block">
                <h1 className="text-3xl font-black text-white uppercase tracking-tighter">{getPageTitle()}</h1>
                <p className="text-gray-500 text-xs font-bold mt-1 uppercase tracking-widest">Protocol ID: 0x882A-C</p>
            </div>

            <Routes>
                <Route index element={<Dashboard />} />
                <Route path="dashboard" element={<Dashboard />} />
                <Route path="users" element={<UserManagement onSelectUser={setSelectedUserId} />} />
                <Route path="revenue" element={<EarningsAnalytics />} />
                <Route path="ad_stats" element={<AdAnalytics />} />
                <Route path="finance" element={<FinanceManager />} />
                <Route path="tasks" element={<TaskManagement />} />
                <Route path="games" element={<GameControl />} />
                <Route path="videos" element={<VideoManagement />} />
                <Route path="invest" element={<InvestmentSetup />} />
                <Route path="sites" element={<SiteManagement />} />
                <Route path="spin" element={<SpinSettings />} />
                <Route path="lottery" element={<LotteryManager />} />
                <Route path="web_files" element={<WebFilesEdit />} />
                <Route path="config" element={<WebsiteSettings />} />
                <Route path="off_systems" element={<OffSystems />} />
                <Route path="images" element={<ImageManager />} />
                <Route path="noti_sender" element={<NotiSender />} />
                <Route path="business_logic" element={<BusinessLogic />} />
                <Route path="help_requests" element={<HelpRequests />} />
                <Route path="verification" element={<VerificationRequest />} />
                <Route path="reviews" element={<ReviewManagement />} />
                <Route path="referrals" element={<ReferralControl />} />
                <Route path="daily_bonus" element={<DailyBonusControl />} />
                <Route path="promos" element={<BonusControl />} />
                <Route path="payment" element={<PaymentSettings />} />
                <Route path="withdraw_config" element={<WithdrawSettings />} />
                <Route path="monthly_pay" element={<MonthlyPay />} />
            </Routes>
            
            {/* USER INFO OVERLAY - STATIC */}
            {selectedUserId && (
                 <div className="fixed inset-0 z-[60] bg-black/95 flex items-center justify-center p-4 md:p-10">
                     <div className="w-full max-w-6xl max-h-full overflow-y-auto bg-[#0a0a0a] rounded-3xl border border-white/10 shadow-[0_0_100px_rgba(0,0,0,1)] relative">
                        <button onClick={() => setSelectedUserId(null)} className="absolute top-6 right-6 p-2 bg-white/5 rounded-full text-gray-500 hover:text-white z-10">
                            <X size={24} />
                        </button>
                        <div className="p-8">
                            <UserInfo userId={selectedUserId} onBack={() => setSelectedUserId(null)} />
                        </div>
                     </div>
                 </div>
            )}
        </main>

        {/* MOBILE OVERLAY MENU - STATIC */}
        {mobileMenuOpen && (
            <div className="fixed inset-0 z-[100] bg-black flex flex-col md:hidden">
                <div className="h-16 flex items-center justify-between px-6 border-b border-white/10">
                    <h2 className="text-lg font-black text-white">SYSTEM MENU</h2>
                    <button onClick={() => setMobileMenuOpen(false)} className="p-2 text-white">
                        <X size={28} />
                    </button>
                </div>
                <div className="flex-1 overflow-y-auto p-6 space-y-8">
                    {navCategories.map((cat, idx) => (
                        <div key={idx}>
                            <h3 className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-4">{cat.title}</h3>
                            <div className="grid grid-cols-2 gap-3">
                                {cat.items.map(item => (
                                    <Link
                                        key={item.id}
                                        to={item.path}
                                        onClick={() => setMobileMenuOpen(false)}
                                        className={`flex flex-col items-center justify-center p-5 rounded-2xl border ${
                                            isPathActive(item.path)
                                            ? 'bg-blue-600 border-blue-500 text-white' 
                                            : 'bg-white/5 border-white/5 text-gray-400'
                                        }`}
                                    >
                                        <item.icon size={24} className={isPathActive(item.path) ? 'text-white' : item.color} />
                                        <span className="text-[10px] font-bold mt-2 uppercase text-center">{item.label}</span>
                                    </Link>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        )}

    </div>
  );
};

export default Admin;
