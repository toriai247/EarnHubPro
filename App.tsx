
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
import Admin from './pages/admin/Admin';
import { supabase } from './integrations/supabase/client';
import { CurrencyProvider } from './context/CurrencyContext';
import { UIProvider } from './context/UIContext';
import { ThemeProvider } from './context/ThemeContext';

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
  const [showRetry, setShowRetry] = useState(false);

  useEffect(() => {
    // 1. Show Retry Button if loading takes more than 3 seconds
    const retryTimer = setTimeout(() => {
        if (loading) setShowRetry(true);
    }, 3000);

    // 2. Force Load after 7 seconds to prevent infinite spinner
    const forceTimer = setTimeout(() => {
        if (loading) {
            console.warn("Force loading due to timeout");
            setLoading(false);
        }
    }, 7000);

    // 3. Check Session
    const checkSession = async () => {
      try {
        const { data, error } = await supabase.auth.getSession();
        if (error) {
            console.error("Session error:", error);
            // If error, we proceed as logged out
        } 
        setSession(data.session);
      } catch (e) {
        console.error("Unexpected auth error:", e);
      } finally {
        setLoading(false);
      }
    };

    checkSession();

    // 4. Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      // Ensure loading stops on auth state change
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
        
        {showRetry && (
            <button 
                onClick={() => setLoading(false)}
                className="px-5 py-2 bg-white/10 border border-white/10 rounded-full text-xs text-white font-bold hover:bg-white/20 transition animate-pulse"
            >
                Taking too long? Tap to Enter
            </button>
        )}
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
                <Route path="/games/ludo" element={<LudoLobby />} />
                <Route path="/games/ludo/play/:stake" element={<LudoKing />} />
                
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
