
import React, { useEffect, useState } from 'react';
import { HashRouter as Router, Routes, Route, Navigate, Outlet, useLocation } from 'react-router-dom';
import Layout from './components/Layout';
import Home from './pages/Home';
import Invest from './pages/Invest';
import Tasks from './pages/Tasks';
import Invite from './pages/Invite';
import Video from './pages/Video';
import Games from './pages/Games';
import Spin from './pages/Spin';
import Crash from './pages/Crash';
import Dice from './pages/Dice';
import LudoLobby from './pages/LudoLobby';
import LudoKing from './pages/LudoKing';
import Wallet from './pages/Wallet';
import Deposit from './pages/Deposit';
import Withdraw from './pages/Withdraw';
import Transfer from './pages/Transfer';
import SendMoney from './pages/SendMoney'; 
import Exchange from './pages/Exchange'; 
import Advertise from './pages/Advertise'; 
import Profile from './pages/Profile';
import PublicProfile from './pages/PublicProfile';
import SearchUsers from './pages/SearchUsers'; 
import Login from './pages/Login';
import Signup from './pages/Signup';
import Notifications from './pages/Notifications';
import Support from './pages/Support';
import FAQ from './pages/FAQ';
import Terms from './pages/Terms';
import Leaderboard from './pages/Leaderboard';
import BiometricSetup from './pages/BiometricSetup';
import Themes from './pages/Themes'; // Added
import Admin from './pages/admin/Admin';
import FeatureAccessBlock from './components/FeatureAccessBlock';
import DealerDashboard from './pages/dealer/DealerDashboard';
import CreateCampaign from './pages/dealer/CreateCampaign';
import ManageCampaigns from './pages/dealer/ManageCampaigns';
import DealerProfile from './pages/dealer/DealerProfile';
import StaffDashboard from './pages/staff/StaffDashboard';
import SiteViewer from './pages/SiteViewer'; 
import { supabase } from './integrations/supabase/client';
import { CurrencyProvider } from './context/CurrencyContext';
import { UIProvider } from './context/UIContext';
import { ThemeProvider } from './context/ThemeContext';
import { SystemProvider, useSystem } from './context/SystemContext';
import InstallPWA from './components/InstallPWA'; 

// --- ROUTE GUARD COMPONENT ---
const FeatureGuard = ({ feature, children }: { feature: string, children?: React.ReactNode }) => {
    const { isFeatureEnabled, loading } = useSystem();
    
    if (loading) return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <div className="w-8 h-8 border-4 border-royal-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );

    // @ts-ignore
    if (!isFeatureEnabled(`is_${feature}_enabled`)) {
        return <FeatureAccessBlock featureName={feature} />;
    }
    return <>{children}</>;
};

// Require Auth Wrapper
const RequireAuth: React.FC<{ session: any; children: React.ReactNode }> = ({ session, children }) => {
  if (!session) {
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
};

// Dealer Route Guard
const RequireDealer: React.FC<{ session: any; children: React.ReactNode }> = ({ session, children }) => {
    const [isDealer, setIsDealer] = useState<boolean | null>(null);

    useEffect(() => {
        const check = async () => {
            if (!session) { setIsDealer(false); return; }
            const { data } = await supabase.from('profiles').select('is_dealer').eq('id', session.user.id).single();
            setIsDealer(!!(data as any)?.is_dealer);
        };
        check();
    }, [session]);

    if (!session) return <Navigate to="/login" replace />;
    if (isDealer === null) return <div className="p-20 text-center text-gray-500">Verifying Partner Status...</div>;
    if (isDealer === false) return <Navigate to="/" replace />; 

    return <>{children}</>;
};

// Staff Route Guard
const RequireStaff: React.FC<{ session: any; children: React.ReactNode }> = ({ session, children }) => {
    const [isStaff, setIsStaff] = useState<boolean | null>(null);

    useEffect(() => {
        const check = async () => {
            if (!session) { setIsStaff(false); return; }
            const { data } = await supabase.from('profiles').select('role').eq('id', session.user.id).single();
            setIsStaff((data as any)?.role === 'staff');
        };
        check();
    }, [session]);

    if (!session) return <Navigate to="/login" replace />;
    if (isStaff === null) return <div className="p-20 text-center text-gray-500">Checking Credentials...</div>;
    if (isStaff === false) return <Navigate to="/" replace />; 

    return <>{children}</>;
};

const AppContent: React.FC = () => {
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkSession = async () => {
      try {
        const { data, error } = await supabase.auth.getSession();
        setSession(data.session);
        
        if (data.session && Notification.permission === 'default') {
            Notification.requestPermission();
        }
      } catch (e) {
        console.error("Auth check failed", e);
      } finally {
        setLoading(false);
      }
    };

    checkSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event: string, session: any) => {
      setSession(session);
      setLoading(false);
    });

    return () => {
        subscription.unsubscribe();
    };
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-void flex flex-col items-center justify-center text-brand p-4">
        <div className="w-12 h-12 border-4 border-brand border-t-transparent rounded-full animate-spin mb-4"></div>
        <div className="font-display font-bold tracking-wider text-lg text-main">NAXXIVO</div>
      </div>
    );
  }

  return (
    <>
      <InstallPWA /> 
      <Routes>
        <Route path="/login" element={!session ? <Login /> : <Navigate to="/" />} />
        <Route path="/signup" element={!session ? <Signup /> : <Navigate to="/" />} />
        <Route path="/admin/*" element={session ? <Admin /> : <Navigate to="/login" />} />

        {/* Site Viewer - Catch-all specific slugs outside main layout */}
        <Route path="/:slug" element={<SiteViewer />} />

        {/* Main Layout Wrap */}
        <Route element={<Layout session={session}><Outlet /></Layout>}>
          
          {/* Public Routes */}
          <Route path="/" element={<Home />} />
          <Route path="/leaderboard" element={<Leaderboard />} />
          <Route path="/search" element={<SearchUsers />} />
          <Route path="/u/:uid" element={<PublicProfile />} />
          <Route path="/faq" element={<FAQ />} />
          <Route path="/terms" element={<Terms />} />
          <Route path="/support" element={<Support />} />
          <Route path="/themes" element={<Themes />} />

          {/* DEALER ROUTES (Protected) */}
          <Route path="/dealer/dashboard" element={<RequireDealer session={session}><DealerDashboard /></RequireDealer>} />
          <Route path="/dealer/create" element={<RequireDealer session={session}><CreateCampaign /></RequireDealer>} />
          <Route path="/dealer/campaigns" element={<RequireDealer session={session}><ManageCampaigns /></RequireDealer>} />
          <Route path="/dealer/profile" element={<RequireDealer session={session}><DealerProfile /></RequireDealer>} />

          {/* STAFF ROUTES (Protected) */}
          <Route path="/staff/dashboard" element={<RequireStaff session={session}><StaffDashboard /></RequireStaff>} />

          {/* User Protected Routes */}
          <Route path="/invest" element={<RequireAuth session={session}><FeatureGuard feature="invest"><Invest /></FeatureGuard></RequireAuth>} />
          <Route path="/tasks" element={<RequireAuth session={session}><FeatureGuard feature="tasks"><Tasks /></FeatureGuard></RequireAuth>} />
          <Route path="/advertise" element={<RequireAuth session={session}><Advertise /></RequireAuth>} /> 
          <Route path="/invite" element={<RequireAuth session={session}><FeatureGuard feature="invite"><Invite /></FeatureGuard></RequireAuth>} />
          <Route path="/video" element={<RequireAuth session={session}><FeatureGuard feature="video"><Video /></FeatureGuard></RequireAuth>} />
          <Route path="/games" element={<RequireAuth session={session}><FeatureGuard feature="games"><Games /></FeatureGuard></RequireAuth>} />
          
          <Route path="/games/spin" element={<RequireAuth session={session}><FeatureGuard feature="games"><Spin /></FeatureGuard></RequireAuth>} />
          <Route path="/games/crash" element={<RequireAuth session={session}><FeatureGuard feature="games"><Crash /></FeatureGuard></RequireAuth>} />
          <Route path="/games/dice" element={<RequireAuth session={session}><FeatureGuard feature="games"><Dice /></FeatureGuard></RequireAuth>} />
          <Route path="/games/ludo" element={<RequireAuth session={session}><FeatureGuard feature="games"><LudoLobby /></FeatureGuard></RequireAuth>} />
          <Route path="/games/ludo/play/:stake" element={<RequireAuth session={session}><FeatureGuard feature="games"><LudoKing /></FeatureGuard></RequireAuth>} />
          
          <Route path="/wallet" element={<RequireAuth session={session}><Wallet /></RequireAuth>} />
          <Route path="/deposit" element={<RequireAuth session={session}><FeatureGuard feature="deposit"><Deposit /></FeatureGuard></RequireAuth>} />
          <Route path="/withdraw" element={<RequireAuth session={session}><FeatureGuard feature="withdraw"><Withdraw /></FeatureGuard></RequireAuth>} />
          <Route path="/transfer" element={<RequireAuth session={session}><Transfer /></RequireAuth>} />
          <Route path="/send-money" element={<RequireAuth session={session}><SendMoney /></RequireAuth>} />
          <Route path="/exchange" element={<RequireAuth session={session}><Exchange /></RequireAuth>} />
          
          <Route path="/profile" element={<RequireAuth session={session}><Profile /></RequireAuth>} />
          <Route path="/notifications" element={<RequireAuth session={session}><Notifications /></RequireAuth>} />
          <Route path="/biometric-setup" element={<RequireAuth session={session}><BiometricSetup /></RequireAuth>} />
          
        </Route>
      </Routes>
    </>
  );
}

const App: React.FC = () => {
  return (
    <ThemeProvider>
      <UIProvider>
        <CurrencyProvider>
          <Router>
            <SystemProvider>
                <AppContent />
            </SystemProvider>
          </Router>
        </CurrencyProvider>
      </UIProvider>
    </ThemeProvider>
  );
};

export default App;
