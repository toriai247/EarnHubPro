
import React, { useEffect, useState } from 'react';
import { HashRouter as Router, Routes, Route, Navigate, Outlet } from 'react-router-dom';
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
import Admin from './pages/admin/Admin';
import { supabase } from './integrations/supabase/client';
import { useSecurity } from './lib/security';
import { CurrencyProvider } from './context/CurrencyContext';
import { UIProvider } from './context/UIContext';
import { ThemeProvider } from './context/ThemeContext'; // Import ThemeProvider

// Protected Route Wrapper
const ProtectedRoute = ({ session }: { session: any }) => {
  if (!session) {
    return <Navigate to="/login" replace />;
  }
  return <Layout><Outlet /></Layout>;
};

const App: React.FC = () => {
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  // Activate Anti-Hack Security (High Level)
  useSecurity();

  useEffect(() => {
    // Check initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    }).catch(() => {
      setLoading(false);
    });

    // Listen for auth changes
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
      <div className="min-h-screen bg-dark-950 flex flex-col items-center justify-center text-neon-green">
        <div className="w-12 h-12 border-4 border-royal-600 border-t-neon-green rounded-full animate-spin mb-4"></div>
        <div className="font-display font-bold tracking-wider">EARNHUB PRO</div>
        <div className="text-xs text-gray-500 mt-2">Establishing Secure Connection...</div>
      </div>
    );
  }

  return (
    <ThemeProvider>
      <UIProvider>
        <CurrencyProvider>
          <Router>
            <Routes>
              <Route path="/login" element={!session ? <Login /> : <Navigate to="/" />} />
              <Route path="/signup" element={!session ? <Signup /> : <Navigate to="/" />} />
              <Route path="/admin" element={session ? <Admin /> : <Navigate to="/login" />} />

              <Route element={<ProtectedRoute session={session} />}>
                <Route path="/" element={<Home />} />
                <Route path="/invest" element={<Invest />} />
                <Route path="/tasks" element={<Tasks />} />
                <Route path="/invite" element={<Invite />} />
                <Route path="/video" element={<Video />} />
                <Route path="/leaderboard" element={<Leaderboard />} />
                <Route path="/games" element={<Games />} />
                <Route path="/games/spin" element={<Spin />} />
                <Route path="/games/crash" element={<Crash />} />
                <Route path="/games/dice" element={<Dice />} />
                
                <Route path="/wallet" element={<Wallet />} />
                <Route path="/deposit" element={<Deposit />} />
                <Route path="/withdraw" element={<Withdraw />} />
                <Route path="/transfer" element={<Transfer />} />
                <Route path="/exchange" element={<Exchange />} />
                
                <Route path="/profile" element={<Profile />} />
                <Route path="/notifications" element={<Notifications />} />
                <Route path="/support" element={<Support />} />
                <Route path="/faq" element={<FAQ />} />
                <Route path="/terms" element={<Terms />} />
              </Route>
            </Routes>
          </Router>
        </CurrencyProvider>
      </UIProvider>
    </ThemeProvider>
  );
};

export default App;
