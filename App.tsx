
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
import Admin from './pages/admin/Admin';
import FeatureAccessBlock from './components/FeatureAccessBlock';
import { supabase } from './integrations/supabase/client';
import { CurrencyProvider } from './context/CurrencyContext';
import { UIProvider } from './context/UIContext';
import { ThemeProvider } from './context/ThemeContext';
import { SystemProvider, useSystem } from './context/SystemContext';

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

const AppContent: React.FC = () => {
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkSession = async () => {
      try {
        const { data, error } = await supabase.auth.getSession();
        setSession(data.session);
        
        // Request Notification Permission on successful session check
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

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setLoading(false);
    });

    return () => {
        subscription.unsubscribe();
    };
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-dark-950 flex flex-col items-center justify-center text-neon-green p-4">
        <div className="w-12 h-12 border-4 border-royal-600 border-t-neon-green rounded-full animate-spin mb-4"></div>
        <div className="font-display font-bold tracking-wider text-lg">EARNHUB PRO</div>
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/login" element={!session ? <Login /> : <Navigate to="/" />} />
      <Route path="/signup" element={!session ? <Signup /> : <Navigate to="/" />} />
      <Route path="/admin/*" element={session ? <Admin /> : <Navigate to="/login" />} />

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

        {/* Protected Routes */}
        <Route path="/invest" element={<RequireAuth session={session}><FeatureGuard feature="invest"><Invest /></FeatureGuard></RequireAuth>} />
        <Route path="/tasks" element={<RequireAuth session={session}><FeatureGuard feature="tasks"><Tasks /></FeatureGuard></RequireAuth>} />
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
  );
}

const App: React.FC = () => {
  return (
    <ThemeProvider>
      <UIProvider>
        <CurrencyProvider>
          <SystemProvider>
            <Router>
                <AppContent />
            </Router>
          </SystemProvider>
        </CurrencyProvider>
      </UIProvider>
    </ThemeProvider>
  );
};

export default App;
