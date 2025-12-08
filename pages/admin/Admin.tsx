
import React, { useEffect, useState } from 'react';
import { 
  LayoutDashboard, Users, Video, CreditCard, Gamepad2, 
  Briefcase, TrendingUp, Gift, Settings, CheckCircle, Database, Lock, Home, PieChart, Banknote, Sliders, CalendarClock, ArrowLeft, MonitorOff, LifeBuoy, HardDrive, BellRing, GitFork, ShieldCheck, Calendar, Globe, MessageSquare
} from 'lucide-react';
import { supabase } from '../../integrations/supabase/client';
import { useNavigate, useLocation, Link } from 'react-router-dom';

// Import Sub-pages
import Dashboard from './Dashboard';
import UserManagement from './UserManagement';
import UserInfo from './UserInfo';
import TaskManagement from './TaskManagement';
import VideoManagement from './VideoManagement';
import DepositApprove from './DepositApprove';
import WithdrawApprove from './WithdrawApprove';
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

const Admin: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<string>('user');
  const [loading, setLoading] = useState(true);

  // Derive active section from URL
  const pathParts = location.pathname.split('/');
  // /admin/users -> section is 'users'
  const activeSection = pathParts[2] || 'dashboard';

  // Define All Items with Allowed Roles
  const allItems = [
    { id: 'home', icon: Home, label: 'Back to App', path: '/', roles: ['admin', 'moderator'] },
    { id: 'dashboard', icon: LayoutDashboard, label: 'Dashboard', path: '/admin/dashboard', roles: ['admin', 'moderator'] },
    { id: 'database_ultra', icon: HardDrive, label: 'Database Ultra', color: 'text-cyan-400', path: '/admin/database_ultra', roles: ['admin'] },
    { id: 'noti_sender', icon: BellRing, label: 'Noti Sender', color: 'text-yellow-400', path: '/admin/noti_sender', roles: ['admin'] },
    { id: 'off_systems', icon: MonitorOff, label: 'Off Systems', color: 'text-red-400', path: '/admin/off_systems', roles: ['admin'] }, 
    { id: 'help_requests', icon: LifeBuoy, label: 'Support Inbox', color: 'text-blue-400', path: '/admin/help_requests', roles: ['admin', 'moderator'] },
    { id: 'reviews', icon: MessageSquare, label: 'Reviews', color: 'text-pink-400', path: '/admin/reviews', roles: ['admin', 'moderator'] },
    { id: 'verification', icon: ShieldCheck, label: 'KYC Requests', color: 'text-emerald-400', path: '/admin/verification', roles: ['admin', 'moderator'] },
    { id: 'users', icon: Users, label: 'User Admin', path: '/admin/users', roles: ['admin', 'moderator'] },
    { id: 'referrals', icon: GitFork, label: 'Referral Tiers', color: 'text-green-400', path: '/admin/referrals', roles: ['admin'] },
    { id: 'tasks', icon: CheckCircle, label: 'Task Coord', path: '/admin/tasks', roles: ['admin'] },
    { id: 'sites', icon: Globe, label: 'Site Publisher', color: 'text-indigo-400', path: '/admin/sites', roles: ['admin'] },
    { id: 'spin', icon: PieChart, label: 'Spin Control', path: '/admin/spin', roles: ['admin'] },
    { id: 'daily_bonus', icon: Calendar, label: 'Daily Login', color: 'text-pink-400', path: '/admin/daily_bonus', roles: ['admin'] },
    { id: 'payment', icon: Banknote, label: 'Payment Methods', path: '/admin/payment', roles: ['admin'] },
    { id: 'withdraw_config', icon: Sliders, label: 'Withdraw Limits', path: '/admin/withdraw_config', roles: ['admin'] },
    { id: 'monthly_pay', icon: CalendarClock, label: 'Monthly Payroll', path: '/admin/monthly_pay', roles: ['admin'] },
    { id: 'videos', icon: Video, label: 'Video Oversight', path: '/admin/videos', roles: ['admin'] },
    { id: 'deposits', icon: Database, label: 'Deposits (Log)', path: '/admin/deposits', roles: ['admin'] },
    { id: 'withdrawals', icon: CreditCard, label: 'Withdrawals', path: '/admin/withdrawals', roles: ['admin'] },
    { id: 'games', icon: Gamepad2, label: 'Game Reg', path: '/admin/games', roles: ['admin'] },
    { id: 'invest', icon: Briefcase, label: 'Investments', path: '/admin/invest', roles: ['admin'] },
    { id: 'revenue', icon: TrendingUp, label: 'Revenue', path: '/admin/revenue', roles: ['admin'] },
    { id: 'promos', icon: Gift, label: 'Promotions', path: '/admin/promos', roles: ['admin'] },
    { id: 'config', icon: Settings, label: 'Site Config', path: '/admin/config', roles: ['admin'] },
  ];

  useEffect(() => {
    const checkAdmin = async () => {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) { navigate('/login'); return; }
        
        // Select ALL to avoid crash if 'role' column is missing
        const { data: profile } = await supabase.from('profiles').select('*').eq('id', session.user.id).single();
        
        if (!profile || (!profile.admin_user && profile.role !== 'admin' && profile.role !== 'moderator')) {
            navigate('/');
            return;
        }

        // Default to admin if role is missing but admin_user is true
        let role = 'admin';
        if (profile.role) role = profile.role;
        else if (profile.admin_user) role = 'admin';

        setUserRole(role === 'moderator' ? 'moderator' : 'admin');
        setLoading(false);
    };
    checkAdmin();
  }, [navigate]);

  // Filter items based on role
  const filteredItems = allItems.filter(item => item.roles.includes(userRole));

  const renderSidebar = () => {
    return (
      <div className="w-64 bg-dark-950 border-r border-white/10 flex-shrink-0 hidden md:flex flex-col h-screen sticky top-0 overflow-y-auto custom-scrollbar">
        <div className="p-6 border-b border-white/10">
          <h2 className="text-xl font-display font-bold text-white flex items-center gap-2">
            <Lock className="text-neon-green" size={20} /> Admin<span className="text-neon-glow">Panel</span>
          </h2>
          <span className="text-[10px] bg-white/10 px-2 py-0.5 rounded text-gray-400 uppercase mt-1 inline-block">
              Role: {userRole}
          </span>
        </div>
        <div className="flex-1 py-4 space-y-1 px-3">
          {filteredItems.map((item) => (
            <Link
              key={item.id}
              to={item.path}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition ${
                activeSection === item.id || (item.id === 'dashboard' && !activeSection) 
                ? 'bg-royal-600 text-white shadow-lg' 
                : item.id === 'home' ? 'bg-white/5 text-neon-green border border-neon-green/20 hover:bg-neon-green/10' : 'text-gray-400 hover:bg-white/5 hover:text-white'
              }`}
            >
              <item.icon size={18} className={(item as any).color} />
              {item.label}
            </Link>
          ))}
        </div>
      </div>
    );
  };

  const renderMobileMenu = () => (
      <div className="md:hidden flex overflow-x-auto gap-2 pb-4 mb-4 no-scrollbar">
        {filteredItems.map((item) => (
            <Link
              key={item.id}
              to={item.path}
              className={`flex-shrink-0 flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition ${
                activeSection === item.id 
                ? 'bg-royal-600 text-white' 
                : item.id === 'home' ? 'bg-white/5 text-neon-green border border-neon-green/20' : 'bg-white/5 text-gray-400'
              }`}
            >
              <item.icon size={14} className={(item as any).color} />
              {item.label}
            </Link>
        ))}
      </div>
  );

  const renderContent = () => {
      // Special Case: User Info View when explicitly selecting a user
      if (activeSection === 'users' && selectedUserId) {
          return <UserInfo userId={selectedUserId} onBack={() => setSelectedUserId(null)} />;
      }

      // Restrict access if a moderator tries to access an admin-only route manually
      const currentItem = allItems.find(i => i.id === activeSection);
      if (currentItem && !currentItem.roles.includes(userRole)) {
          return (
              <div className="flex flex-col items-center justify-center h-96 text-center">
                  <Lock size={48} className="text-red-500 mb-4" />
                  <h2 className="text-2xl font-bold text-white">Access Denied</h2>
                  <p className="text-gray-400">You do not have permission to view this module.</p>
              </div>
          );
      }

      switch(activeSection) {
          case 'dashboard': return <Dashboard />;
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
          case 'spin': return <SpinSettings />;
          case 'daily_bonus': return <DailyBonusControl />;
          case 'payment': return <PaymentSettings />;
          case 'withdraw_config': return <WithdrawSettings />;
          case 'monthly_pay': return <MonthlyPay />;
          case 'videos': return <VideoManagement />;
          case 'deposits': return <DepositApprove />;
          case 'withdrawals': return <WithdrawApprove />;
          case 'games': return <GameControl />;
          case 'invest': return <InvestmentSetup />;
          case 'revenue': return <EarningsAnalytics />;
          case 'promos': return <BonusControl />;
          case 'config': return <WebsiteSettings />;
          default: return <Dashboard />;
      }
  };

  if (loading) return <div className="min-h-screen bg-dark-950 flex items-center justify-center"><div className="w-8 h-8 border-4 border-royal-600 border-t-transparent rounded-full animate-spin"></div></div>;

  return (
    <div className="min-h-screen bg-dark-950 flex font-sans">
        {renderSidebar()}
        
        <main className="flex-1 p-6 overflow-y-auto h-screen relative">
            {/* Mobile Header */}
            <div className="md:hidden mb-4 flex flex-col">
                 <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                        <Lock className="text-neon-green" size={18} /> Admin Panel
                    </h2>
                 </div>
                 {renderMobileMenu()}
            </div>

            <div className="max-w-6xl mx-auto">
                {renderContent()}
            </div>
        </main>
    </div>
  );
};

export default Admin;
