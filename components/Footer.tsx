import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Search, Flag, Star, LogIn, Info, Shield, HelpCircle, Trophy, Users, User, LayoutGrid, Lock, Globe } from 'lucide-react';
import Logo from './Logo';

interface FooterProps {
    onOpenReview: () => void;
}

// Added FooterProps to the component definition and destructured onOpenReview to fix the undefined reference error
const Footer: React.FC<FooterProps> = ({ onOpenReview }) => {
  const location = useLocation();
  const isHome = location.pathname === '/';

  return (
    <footer className="w-full mt-24 border-t border-border-base bg-card/40 backdrop-blur-md pb-32 sm:pb-16 pt-16">
      <div className="max-w-7xl mx-auto px-6 grid grid-cols-2 md:grid-cols-4 gap-12">
        
        {/* Brand Column */}
        <div className="col-span-2 md:col-span-1 space-y-6">
            <Logo size="md" />
            <p className="text-sm text-muted leading-relaxed">
                The most confident decentralized earning network. Fast payments, trending games, and high-yield assets in one secure portal.
            </p>
            <div className="flex flex-wrap gap-2">
                <div className="flex items-center gap-1.5 px-3 py-1 bg-white/5 border border-white/5 rounded-full text-[10px] font-bold text-muted">
                    <Shield size={12} className="text-success" /> SSL SECURE
                </div>
                <div className="flex items-center gap-1.5 px-3 py-1 bg-white/5 border border-white/5 rounded-full text-[10px] font-bold text-muted">
                    <LayoutGrid size={12} className="text-brand" /> v4.5.2
                </div>
            </div>
        </div>

        {/* Earning Pillar */}
        <div className="space-y-5">
            <h4 className="text-[10px] font-black text-main uppercase tracking-[0.25em]">Essentials</h4>
            <div className="flex flex-col gap-3">
                <Link to="/invite" className="text-sm text-muted hover:text-brand transition flex items-center gap-2">
                    <Users size={16} /> Invite Friends
                </Link>
                <Link to="/profile" className="text-sm text-muted hover:text-brand transition flex items-center gap-2">
                    <User size={16} /> My Profile
                </Link>
                <Link to="/leaderboard" className="text-sm text-muted hover:text-brand transition flex items-center gap-2">
                    <Trophy size={16} /> Top Earners
                </Link>
                <Link to="/tasks" className="text-sm text-muted hover:text-brand transition flex items-center gap-2">
                    <Globe size={16} /> Micro Jobs
                </Link>
            </div>
        </div>

        {/* Support Pillar */}
        <div className="space-y-5">
            <h4 className="text-[10px] font-black text-main uppercase tracking-[0.25em]">Assistance</h4>
            <div className="flex flex-col gap-3">
                <Link to="/support" className="text-sm text-muted hover:text-brand transition flex items-center gap-2">
                    <Flag size={16} /> Report Issue
                </Link>
                <button onClick={onOpenReview} className="text-sm text-muted hover:text-brand transition flex items-center gap-2 text-left">
                    <Star size={16} /> Write Review
                </button>
                <Link to="/faq" className="text-sm text-muted hover:text-brand transition flex items-center gap-2">
                    <HelpCircle size={16} /> Help Center
                </Link>
                <Link to="/search" className="text-sm text-muted hover:text-brand transition flex items-center gap-2">
                    <Search size={16} /> Find Identity
                </Link>
            </div>
        </div>

        {/* System Pillar */}
        <div className="space-y-5">
            <h4 className="text-[10px] font-black text-main uppercase tracking-[0.25em]">Platform</h4>
            <div className="flex flex-col gap-3">
                <Link to="/terms" className="text-sm text-muted hover:text-main transition flex items-center gap-2">
                    <Shield size={16} /> Legal & Terms
                </Link>
                <Link to="/privacy" className="text-sm text-muted hover:text-main transition flex items-center gap-2">
                    <Lock size={16} /> Privacy Policy
                </Link>
                <Link to="/login" className="text-sm text-muted hover:text-main transition flex items-center gap-2">
                    <LogIn size={16} /> Authentication
                </Link>
                <div className="pt-2 flex items-center gap-3 grayscale opacity-30">
                    <img src="https://upload.wikimedia.org/wikipedia/commons/b/b5/PayPal.svg" className="h-4 w-auto" alt="Paypal" />
                    <img src="https://upload.wikimedia.org/wikipedia/commons/5/5e/Visa_Inc._logo.svg" className="h-4 w-auto" alt="Visa" />
                    <img src="https://upload.wikimedia.org/wikipedia/commons/2/2a/Mastercard-logo.svg" className="h-4 w-auto" alt="Mastercard" />
                </div>
            </div>
        </div>

      </div>

      <div className="max-w-7xl mx-auto px-6 pt-12 text-center md:text-left flex flex-col md:flex-row justify-between items-center gap-6">
          <p className="text-[10px] text-muted uppercase font-black tracking-widest">
              &copy; {new Date().getFullYear()} Naxxivo Inc. International Gateway.
          </p>
          <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 bg-success rounded-full animate-pulse shadow-[0_0_8px_#10b981]"></div>
                  <span className="text-[10px] text-success font-black uppercase tracking-widest">Operational</span>
              </div>
              <div className="flex items-center gap-2">
                  <span className="text-[10px] text-muted font-black uppercase tracking-widest">Global Node: ID-882</span>
              </div>
          </div>
      </div>
    </footer>
  );
};

export default Footer;