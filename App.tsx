
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
import Exchange from './pages/Exchange'; 
import Profile from './pages/Profile';
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
// Shows warning if a specific feature is disabled
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

// Protected Route Wrapper
const ProtectedRoute = ({ session }: { session: any }) => {
  if (!session) {
    return <Navigate to="/login" replace />;
  }
  return <Layout><Outlet /></Layout>;
};

const AppContent: React.FC = () => {
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showRetry, setShowRetry] = useState(false);

  useEffect(() => {
    const retryTimer = setTimeout(() => { if (loading) setShowRetry(true); }, 3000);
    const forceTimer = setTimeout(() => { if (loading) setLoading(false); }, 7000);

    const checkSession = async () => {
      try {
        const { data, error } = await supabase.auth.getSession();
        if (error) console.error("Session error:", error);
        setSession(data.session);
      } catch (e) {
        console.error("Unexpected auth error:", e);
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
        clearTimeout(retryTimer);
        clearTimeout(forceTimer);
        subscription.unsubscribe();
    };
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-dark-950 flex flex-col items-center justify-center text-neon-green p-4">
        <div className="w-12 h-12 border-4 border-royal-600 border-t-neon-green rounded-full animate-spin mb-4"></div>
        <div className="font-display font-bold tracking-wider text-lg">EARNHUB PRO</div>
        <div className="text-xs text-gray-500 mt-2 mb-6">Connecting...</div>
        {showRetry && <button onClick={() => setLoading(false)} className="px-5 py-2 bg-white/10 border border-white/10 rounded-full text-xs text-white font-bold hover:bg-white/20 transition animate-pulse">Tap to Enter</button>}
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/login" element={!session ? <Login /> : <Navigate to="/" />} />
      <Route path="/signup" element={!session ? <Signup /> : <Navigate to="/" />} />
      <Route path="/admin" element={session ? <Admin /> : <Navigate to="/login" />} />

      <Route element={<ProtectedRoute session={session} />}>
        <Route path="/" element={<Home />} />
        
        {/* Guarded Routes - These will show Warning if disabled */}
        <Route path="/invest" element={<FeatureGuard feature="invest"><Invest /></FeatureGuard>} />
        <Route path="/tasks" element={<FeatureGuard feature="tasks"><Tasks /></FeatureGuard>} />
        <Route path="/invite" element={<FeatureGuard feature="invite"><Invite /></FeatureGuard>} />
        <Route path="/video" element={<FeatureGuard feature="video"><Video /></FeatureGuard>} />
        <Route path="/games" element={<FeatureGuard feature="games"><Games /></FeatureGuard>} />
        <Route path="/games/spin" element={<FeatureGuard feature="games"><Spin /></FeatureGuard>} />
        <Route path="/games/crash" element={<FeatureGuard feature="games"><Crash /></FeatureGuard>} />
        <Route path="/games/dice" element={<FeatureGuard feature="games"><Dice /></FeatureGuard>} />
        <Route path="/games/ludo" element={<FeatureGuard feature="games"><LudoLobby /></FeatureGuard>} />
        <Route path="/games/ludo/play/:stake" element={<FeatureGuard feature="games"><LudoKing /></FeatureGuard>} />
        
        <Route path="/leaderboard" element={<Leaderboard />} />
        <Route path="/wallet" element={<Wallet />} />
        <Route path="/deposit" element={<FeatureGuard feature="deposit"><Deposit /></FeatureGuard>} />
        <Route path="/withdraw" element={<FeatureGuard feature="withdraw"><Withdraw /></FeatureGuard>} />
        <Route path="/transfer" element={<Transfer />} />
        <Route path="/exchange" element={<Exchange />} />
        
        <Route path="/profile" element={<Profile />} />
        <Route path="/notifications" element={<Notifications />} />
        <Route path="/biometric-setup" element={<BiometricSetup />} />
        <Route path="/support" element={<Support />} />
        <Route path="/faq" element={<FAQ />} />
        <Route path="/terms" element={<Terms />} />
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
