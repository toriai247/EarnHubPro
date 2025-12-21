
import React, { useEffect, useState, lazy, Suspense } from 'react';
import { HashRouter as Router, Routes, Route, Navigate, Outlet, useLocation } from 'react-router-dom';
import Layout from './components/Layout';
import Loader from './components/Loader';
import { supabase } from './integrations/supabase/client';
import { CurrencyProvider } from './context/CurrencyContext';
import { UIProvider } from './context/UIContext';
import { ThemeProvider } from './context/ThemeContext';
import { SystemProvider, useSystem } from './context/SystemContext';
import { SimulationProvider } from './context/SimulationContext'; 
import InstallPWA from './components/InstallPWA'; 
import FeatureAccessBlock from './components/FeatureAccessBlock';
import RiskNotice from './components/RiskNotice'; 

// --- LAZY LOADED COMPONENTS (Code Splitting) ---
const Home = lazy(() => import('./pages/Home'));
const Landing = lazy(() => import('./pages/Landing')); 
const Menu = lazy(() => import('./pages/Menu'));
const Invest = lazy(() => import('./pages/Invest'));
const Vip = lazy(() => import('./pages/Vip'));
const Lottery = lazy(() => import('./pages/Lottery'));
const Tasks = lazy(() => import('./pages/Tasks'));
const Invite = lazy(() => import('./pages/Invite'));
const Video = lazy(() => import('./pages/Video'));
const VideoPlayer = lazy(() => import('./pages/VideoPlayer')); 
const Games = lazy(() => import('./pages/Games'));
const Spin = lazy(() => import('./pages/Spin'));
const DragonSpin = lazy(() => import('./pages/DragonSpin'));
const Crash = lazy(() => import('./pages/Crash'));
const Dice = lazy(() => import('./pages/Dice'));
const HeadTail = lazy(() => import('./pages/HeadTail'));
const Thimbles = lazy(() => import('./pages/Thimbles')); 
const AppleFortune = lazy(() => import('./pages/AppleFortune')); 
const ReelsOfGods = lazy(() => import('./pages/ReelsOfGods')); 
const Plinko = lazy(() => import('./pages/Plinko')); 
const Wallet = lazy(() => import('./pages/Wallet'));
const Deposit = lazy(() => import('./pages/Deposit'));
const Withdraw = lazy(() => import('./pages/Withdraw'));
const Transfer = lazy(() => import('./pages/Transfer'));
const SendMoney = lazy(() => import('./pages/SendMoney')); 
const Exchange = lazy(() => import('./pages/Exchange')); 
const Advertise = lazy(() => import('./pages/Advertise')); 
const Profile = lazy(() => import('./pages/Profile'));
const PublicProfile = lazy(() => import('./pages/PublicProfile'));
const PublicEarnPage = lazy(() => import('./pages/PublicEarnPage'));
const SearchUsers = lazy(() => import('./pages/SearchUsers')); 
const UnlimitedEarn = lazy(() => import('./pages/UnlimitedEarn'));
const Login = lazy(() => import('./pages/Login'));
const Signup = lazy(() => import('./pages/Signup')); // Added Signup back
const ForgotPassword = lazy(() => import('./pages/ForgotPassword')); 
const UpdatePassword = lazy(() => import('./pages/UpdatePassword')); 
const Notifications = lazy(() => import('./pages/Notifications'));
const Support = lazy(() => import('./pages/Support'));
const FAQ = lazy(() => import('./pages/FAQ'));
const Terms = lazy(() => import('./pages/Terms'));
const Leaderboard = lazy(() => import('./pages/Leaderboard'));
const BiometricSetup = lazy(() => import('./pages/BiometricSetup'));
const Themes = lazy(() => import('./pages/Themes')); 
const Admin = lazy(() => import('./pages/admin/Admin'));

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

const RequireAuth: React.FC<{ session: any; children: React.ReactNode }> = ({ session, children }) => {
  if (!session) return <Navigate to="/login" replace />;
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
    return () => subscription.unsubscribe();
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
      <RiskNotice />
      <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-void"><Loader /></div>}>
        <Routes>
          <Route path="/login" element={!session ? <Login initialMode="login" /> : <Navigate to="/" />} />
          <Route path="/signup" element={!session ? <Signup /> : <Navigate to="/" />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/update-password" element={<UpdatePassword />} />
          <Route path="/admin/*" element={session ? <Admin /> : <Navigate to="/login" />} />
          <Route path="/u-link/:uid" element={<PublicEarnPage />} />

          <Route element={<Layout session={session}><Outlet /></Layout>}>
            <Route path="/" element={session ? <Home /> : <Landing />} />
            <Route path="/menu" element={<Menu />} />
            <Route path="/leaderboard" element={<Leaderboard />} />
            <Route path="/search" element={<SearchUsers />} />
            <Route path="/u/:uid" element={<PublicProfile />} />
            <Route path="/support" element={<Support />} />
            <Route path="/themes" element={<Themes />} />

            <Route path="/vip" element={<RequireAuth session={session}><FeatureGuard feature="invest"><Vip /></FeatureGuard></RequireAuth>} />
            <Route path="/lottery" element={<RequireAuth session={session}><Lottery /></RequireAuth>} />
            <Route path="/invest" element={<RequireAuth session={session}><FeatureGuard feature="invest"><Invest /></FeatureGuard></RequireAuth>} />
            
            <Route path="/tasks" element={<RequireAuth session={session}><FeatureGuard feature="tasks"><Tasks /></FeatureGuard></RequireAuth>} />
            <Route path="/video" element={<RequireAuth session={session}><FeatureGuard feature="video"><Video /></FeatureGuard></RequireAuth>} />
            
            <Route path="/games" element={<RequireAuth session={session}><FeatureGuard feature="games"><Games /></FeatureGuard></RequireAuth>} />
            <Route path="/games/crash" element={<RequireAuth session={session}><FeatureGuard feature="games"><Crash /></FeatureGuard></RequireAuth>} />
            <Route path="/games/spin" element={<RequireAuth session={session}><FeatureGuard feature="games"><Spin /></FeatureGuard></RequireAuth>} />
            <Route path="/games/dragon-spin" element={<RequireAuth session={session}><FeatureGuard feature="games"><DragonSpin /></FeatureGuard></RequireAuth>} />
            <Route path="/games/dice" element={<RequireAuth session={session}><FeatureGuard feature="games"><Dice /></FeatureGuard></RequireAuth>} />
            <Route path="/games/head-tail" element={<RequireAuth session={session}><FeatureGuard feature="games"><HeadTail /></FeatureGuard></RequireAuth>} />
            <Route path="/games/thimbles" element={<RequireAuth session={session}><FeatureGuard feature="games"><Thimbles /></FeatureGuard></RequireAuth>} />
            <Route path="/games/apple-fortune" element={<RequireAuth session={session}><FeatureGuard feature="games"><AppleFortune /></FeatureGuard></RequireAuth>} />
            <Route path="/games/reels-of-gods" element={<RequireAuth session={session}><FeatureGuard feature="games"><ReelsOfGods /></FeatureGuard></RequireAuth>} />
            <Route path="/games/plinko" element={<RequireAuth session={session}><FeatureGuard feature="games"><Plinko /></FeatureGuard></RequireAuth>} />
            
            <Route path="/wallet" element={<RequireAuth session={session}><Wallet /></RequireAuth>} />
            <Route path="/deposit" element={<RequireAuth session={session}><FeatureGuard feature="deposit"><Deposit /></FeatureGuard></RequireAuth>} />
            <Route path="/withdraw" element={<RequireAuth session={session}><FeatureGuard feature="withdraw"><Withdraw /></FeatureGuard></RequireAuth>} />
            <Route path="/profile" element={<RequireAuth session={session}><Profile /></RequireAuth>} />
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
              <SimulationProvider>
                <AppContent />
              </SimulationProvider>
            </SystemProvider>
          </Router>
        </CurrencyProvider>
      </UIProvider>
    </ThemeProvider>
  );
};

export default App;
