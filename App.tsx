
import React, { useEffect, useState, lazy, Suspense } from 'react';
import { HashRouter as Router, Routes, Route, Navigate, Outlet, useLocation } from 'react-router-dom';
import Layout from './components/Layout';
import Loader from './components/Loader';
import { supabase } from './integrations/supabase/client';
import { CurrencyProvider } from './context/CurrencyContext';
import { UIProvider } from './context/UIContext';
import { ThemeProvider } from './context/ThemeContext';
import { SystemProvider, useSystem } from './context/SystemContext';
import InstallPWA from './components/InstallPWA'; 
import FeatureAccessBlock from './components/FeatureAccessBlock';
import RiskNotice from './components/RiskNotice'; 

// --- LAZY LOADED COMPONENTS (Code Splitting) ---
const Home = lazy(() => import('./pages/Home'));
const Menu = lazy(() => import('./pages/Menu'));
const Invest = lazy(() => import('./pages/Invest'));
const Tasks = lazy(() => import('./pages/Tasks'));
const Invite = lazy(() => import('./pages/Invite'));
const Video = lazy(() => import('./pages/Video'));
const VideoPlayer = lazy(() => import('./pages/VideoPlayer')); 
const Games = lazy(() => import('./pages/Games'));
const Spin = lazy(() => import('./pages/Spin'));
const Crash = lazy(() => import('./pages/Crash'));
const Dice = lazy(() => import('./pages/Dice'));
const HeadTail = lazy(() => import('./pages/HeadTail'));
const Thimbles = lazy(() => import('./pages/Thimbles')); 
const AppleFortune = lazy(() => import('./pages/AppleFortune')); 
const ReelsOfGods = lazy(() => import('./pages/ReelsOfGods')); 
const Plinko = lazy(() => import('./pages/Plinko')); // Added
const LudoLobby = lazy(() => import('./pages/LudoLobby'));
const LudoKing = lazy(() => import('./pages/LudoKing'));
const Wallet = lazy(() => import('./pages/Wallet'));
const Deposit = lazy(() => import('./pages/Deposit'));
const Withdraw = lazy(() => import('./pages/Withdraw'));
const Transfer = lazy(() => import('./pages/Transfer'));
const SendMoney = lazy(() => import('./pages/SendMoney')); 
const Exchange = lazy(() => import('./pages/Exchange')); 
const Advertise = lazy(() => import('./pages/Advertise')); 
const Profile = lazy(() => import('./pages/Profile'));
const PublicProfile = lazy(() => import('./pages/PublicProfile'));
const SearchUsers = lazy(() => import('./pages/SearchUsers')); 
const Login = lazy(() => import('./pages/Login'));
const Signup = lazy(() => import('./pages/Signup'));
const Notifications = lazy(() => import('./pages/Notifications'));
const Support = lazy(() => import('./pages/Support'));
const FAQ = lazy(() => import('./pages/FAQ'));
const Terms = lazy(() => import('./pages/Terms'));
const Leaderboard = lazy(() => import('./pages/Leaderboard'));
const BiometricSetup = lazy(() => import('./pages/BiometricSetup'));
const Themes = lazy(() => import('./pages/Themes')); 
const Admin = lazy(() => import('./pages/admin/Admin'));
const DealerDashboard = lazy(() => import('./pages/dealer/DealerDashboard'));
const CreateCampaign = lazy(() => import('./pages/dealer/CreateCampaign'));
const ManageCampaigns = lazy(() => import('./pages/dealer/ManageCampaigns'));
const DealerInbox = lazy(() => import('./pages/dealer/DealerInbox'));
const DealerProfile = lazy(() => import('./pages/dealer/DealerProfile'));
const StaffDashboard = lazy(() => import('./pages/staff/StaffDashboard'));
const SiteViewer = lazy(() => import('./pages/SiteViewer'));

// --- ROUTE GUARD COMPONENT ---
const FeatureGuard = ({ feature, children }: { feature: string, children?: React.ReactNode }) => {
    const { isFeatureEnabled, loading } = useSystem();
    
    if (loading) return <div className="min-h-screen flex items-center justify-center bg-black"><Loader /></div>;

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
      <RiskNotice /> {/* Global Risk Notice Popup */}
      <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-void"><Loader /></div>}>
        <Routes>
          <Route path="/login" element={!session ? <Login /> : <Navigate to="/" />} />
          <Route path="/signup" element={!session ? <Signup /> : <Navigate to="/" />} />
          <Route path="/admin/*" element={session ? <Admin /> : <Navigate to="/login" />} />

          {/* Special Routes without Layout */}
          <Route path="/:slug" element={<SiteViewer />} />

          {/* Main Layout Wrap */}
          <Route element={<Layout session={session}><Outlet /></Layout>}>
            
            {/* Public Routes */}
            <Route path="/" element={<Home />} />
            <Route path="/menu" element={<Menu />} />
            <Route path="/leaderboard" element={<Leaderboard />} />
            <Route path="/search" element={<SearchUsers />} />
            <Route path="/u/:uid" element={<PublicProfile />} />
            <Route path="/faq" element={<FAQ />} />
            <Route path="/terms" element={<Terms />} />
            <Route path="/support" element={<Support />} />
            <Route path="/themes" element={<Themes />} />

            {/* DEALER ROUTES */}
            <Route path="/dealer/dashboard" element={<RequireDealer session={session}><DealerDashboard /></RequireDealer>} />
            <Route path="/dealer/create" element={<RequireDealer session={session}><CreateCampaign /></RequireDealer>} />
            <Route path="/dealer/campaigns" element={<RequireDealer session={session}><ManageCampaigns /></RequireDealer>} />
            <Route path="/dealer/inbox" element={<RequireDealer session={session}><DealerInbox /></RequireDealer>} />
            <Route path="/dealer/profile" element={<RequireDealer session={session}><DealerProfile /></RequireDealer>} />

            {/* STAFF ROUTES */}
            <Route path="/staff/dashboard" element={<RequireStaff session={session}><StaffDashboard /></RequireStaff>} />

            {/* User Protected Routes */}
            <Route path="/invest" element={<RequireAuth session={session}><FeatureGuard feature="invest"><Invest /></FeatureGuard></RequireAuth>} />
            <Route path="/tasks" element={<RequireAuth session={session}><FeatureGuard feature="tasks"><Tasks /></FeatureGuard></RequireAuth>} />
            <Route path="/advertise" element={<RequireAuth session={session}><Advertise /></RequireAuth>} /> 
            <Route path="/invite" element={<RequireAuth session={session}><FeatureGuard feature="invite"><Invite /></FeatureGuard></RequireAuth>} />
            
            {/* Video Routes */}
            <Route path="/video" element={<RequireAuth session={session}><FeatureGuard feature="video"><Video /></FeatureGuard></RequireAuth>} />
            <Route path="/video/watch/:id" element={<RequireAuth session={session}><FeatureGuard feature="video"><VideoPlayer /></FeatureGuard></RequireAuth>} />

            <Route path="/games" element={<RequireAuth session={session}><FeatureGuard feature="games"><Games /></FeatureGuard></RequireAuth>} />
            <Route path="/games/spin" element={<RequireAuth session={session}><FeatureGuard feature="games"><Spin /></FeatureGuard></RequireAuth>} />
            <Route path="/games/crash" element={<RequireAuth session={session}><FeatureGuard feature="games"><Crash /></FeatureGuard></RequireAuth>} />
            <Route path="/games/dice" element={<RequireAuth session={session}><FeatureGuard feature="games"><Dice /></FeatureGuard></RequireAuth>} />
            <Route path="/games/head-tail" element={<RequireAuth session={session}><FeatureGuard feature="games"><HeadTail /></FeatureGuard></RequireAuth>} />
            <Route path="/games/thimbles" element={<RequireAuth session={session}><FeatureGuard feature="games"><Thimbles /></FeatureGuard></RequireAuth>} />
            <Route path="/games/apple-fortune" element={<RequireAuth session={session}><FeatureGuard feature="games"><AppleFortune /></FeatureGuard></RequireAuth>} />
            <Route path="/games/reels-of-gods" element={<RequireAuth session={session}><FeatureGuard feature="games"><ReelsOfGods /></FeatureGuard></RequireAuth>} />
            <Route path="/games/plinko" element={<RequireAuth session={session}><FeatureGuard feature="games"><Plinko /></FeatureGuard></RequireAuth>} />
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
      </Suspense>
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
