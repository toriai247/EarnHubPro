
import React, { useEffect, useState } from 'react';
import { 
  LayoutDashboard, Users, Video, CreditCard, Gamepad2, 
  Briefcase, TrendingUp, Gift, Settings, CheckCircle, Database, Lock, Home, PieChart, Banknote, Sliders, CalendarClock, ArrowLeft, MonitorOff
} from 'lucide-react';
import { supabase } from '../../integrations/supabase/client';
import { useNavigate } from 'react-router-dom';

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
import OffSystems from './OffSystems'; // New Import

type AdminSection = 'dashboard' | 'users' | 'tasks' | 'spin' | 'videos' | 'deposits' | 'withdrawals' | 'games' | 'invest' | 'revenue' | 'promos' | 'config' | 'payment' | 'withdraw_config' | 'monthly_pay' | 'off_systems';

const Admin: React.FC = () => {
  const [activeSection, setActiveSection] = useState<AdminSection>('dashboard');
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null); // New State for User Detail View
  const navigate = useNavigate();

  const items = [
    { id: 'home', icon: Home, label: 'Back to App', action: () => navigate('/') },
    { id: 'dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { id: 'off_systems', icon: MonitorOff, label: 'Off Systems', color: 'text-red-400' }, // New Item
    { id: 'users', icon: Users, label: 'User Admin' },
    { id: 'tasks', icon: CheckCircle, label: 'Task Coord' },
    { id: 'spin', icon: PieChart, label: 'Spin Control' },
    { id: 'payment', icon: Banknote, label: 'Payment Methods' },
    { id: 'withdraw_config', icon: Sliders, label: 'Withdraw Limits' },
    { id: 'monthly_pay', icon: CalendarClock, label: 'Monthly Payroll' },
    { id: 'videos', icon: Video, label: 'Video Oversight' },
    { id: 'deposits', icon: Database, label: 'Deposits (Log)' },
    { id: 'withdrawals', icon: CreditCard, label: 'Withdrawals' },
    { id: 'games', icon: Gamepad2, label: 'Game Reg' },
    { id: 'invest', icon: Briefcase, label: 'Investments' },
    { id: 'revenue', icon: TrendingUp, label: 'Revenue' },
    { id: 'promos', icon: Gift, label: 'Promotions' },
    { id: 'config', icon: Settings, label: 'Site Config' },
  ];

  useEffect(() => {
    const checkAdmin = async () => {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) { navigate('/login'); return; }
        // In a real app, verify admin role via RLS or metadata
    };
    checkAdmin();
  }, [navigate]);

  const handleSectionChange = (section: AdminSection) => {
      setActiveSection(section);
      setSelectedUserId(null); // Reset user selection when changing tabs
  };

  const renderSidebar = () => {
    return (
      <div className="w-64 bg-dark-900 border-r border-white/10 flex-shrink-0 hidden md:flex flex-col h-screen sticky top-0 overflow-y-auto custom-scrollbar">
        <div className="p-6 border-b border-white/10">
          <h2 className="text-xl font-display font-bold text-white flex items-center gap-2">
            <Lock className="text-neon-green" size={20} /> Admin<span className="text-neon-glow">Panel</span>
          </h2>
        </div>
        <div className="flex-1 py-4 space-y-1 px-3">
          {items.map((item) => (
            <button
              key={item.id}
              onClick={() => item.action ? item.action() : handleSectionChange(item.id as AdminSection)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition ${
                activeSection === item.id ? 'bg-royal-600 text-white shadow-lg' : item.id === 'home' ? 'bg-white/5 text-neon-green border border-neon-green/20 hover:bg-neon-green/10' : 'text-gray-400 hover:bg-white/5 hover:text-white'
              }`}
            >
              <item.icon size={18} className={(item as any).color} />
              {item.label}
            </button>
          ))}
        </div>
      </div>
    );
  };

  const renderMobileMenu = () => (
      <div className="md:hidden flex overflow-x-auto gap-2 pb-4 mb-4 no-scrollbar">
        {items.map((item) => (
            <button
              key={item.id}
              onClick={() => item.action ? item.action() : handleSectionChange(item.id as AdminSection)}
              className={`flex-shrink-0 flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition ${
                activeSection === item.id ? 'bg-royal-600 text-white' : item.id === 'home' ? 'bg-white/5 text-neon-green border border-neon-green/20' : 'bg-white/5 text-gray-400'
              }`}
            >
              <item.icon size={14} className={(item as any).color} />
              {item.label}
            </button>
        ))}
      </div>
  );

  const renderContent = () => {
      // Special Case: User Info View
      if (activeSection === 'users' && selectedUserId) {
          return <UserInfo userId={selectedUserId} onBack={() => setSelectedUserId(null)} />;
      }

      switch(activeSection) {
          case 'dashboard': return <Dashboard />;
          case 'off_systems': return <OffSystems />;
          case 'users': return <UserManagement onSelectUser={setSelectedUserId} />;
          case 'tasks': return <TaskManagement />;
          case 'spin': return <SpinSettings />;
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
