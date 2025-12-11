
import React from 'react';
import { Link } from 'react-router-dom';
import { Search, User, Flag, Star, LogIn, Info, Shield, HelpCircle, Trophy } from 'lucide-react';
import Logo from './Logo';

interface FooterProps {
    onOpenReview: () => void;
}

const Footer: React.FC<FooterProps> = ({ onOpenReview }) => {
  return (
    <footer className="w-full mt-12 border-t border-white/5 bg-black/20 backdrop-blur-sm pb-24 sm:pb-12 pt-12">
      <div className="max-w-5xl mx-auto px-6 grid grid-cols-2 md:grid-cols-4 gap-8">
        
        {/* Brand Column */}
        <div className="col-span-2 md:col-span-1 space-y-4">
            <Logo size="sm" />
            <p className="text-xs text-gray-500 leading-relaxed">
                The next-generation earning ecosystem. Fast, secure, and transparent opportunities for everyone.
            </p>
            <div className="flex gap-2">
                <span className="text-[10px] bg-white/5 px-2 py-1 rounded text-gray-500 border border-white/5">v4.5.2 Stable</span>
            </div>
        </div>

        {/* Quick Access */}
        <div className="space-y-4">
            <h4 className="text-xs font-bold text-white uppercase tracking-widest">Quick Access</h4>
            <div className="flex flex-col gap-2">
                <Link to="/search" className="text-xs text-gray-500 hover:text-brand transition flex items-center gap-2">
                    <Search size={14} /> Find User
                </Link>
                <Link to="/leaderboard" className="text-xs text-gray-500 hover:text-brand transition flex items-center gap-2">
                    <Trophy size={14} /> Visit Profiles
                </Link>
                <Link to="/login" className="text-xs text-gray-500 hover:text-brand transition flex items-center gap-2">
                    <LogIn size={14} /> Login / Join
                </Link>
            </div>
        </div>

        {/* Support */}
        <div className="space-y-4">
            <h4 className="text-xs font-bold text-white uppercase tracking-widest">Support</h4>
            <div className="flex flex-col gap-2">
                <Link to="/support" className="text-xs text-gray-500 hover:text-brand transition flex items-center gap-2">
                    <Flag size={14} /> Report Issue
                </Link>
                <button onClick={onOpenReview} className="text-xs text-gray-500 hover:text-brand transition flex items-center gap-2 text-left">
                    <Star size={14} /> Write Review
                </button>
                <Link to="/faq" className="text-xs text-gray-500 hover:text-brand transition flex items-center gap-2">
                    <HelpCircle size={14} /> Help Center
                </Link>
            </div>
        </div>

        {/* Legal */}
        <div className="space-y-4">
            <h4 className="text-xs font-bold text-white uppercase tracking-widest">Legal</h4>
            <div className="flex flex-col gap-2">
                <Link to="/terms" className="text-xs text-gray-500 hover:text-white transition flex items-center gap-2">
                    <Shield size={14} /> Terms of Service
                </Link>
                <Link to="/terms" className="text-xs text-gray-500 hover:text-white transition flex items-center gap-2">
                    <Info size={14} /> Website Details
                </Link>
            </div>
        </div>

      </div>

      {/* PARTNER / REFERRAL BANNER */}
      <div className="flex justify-center py-8 border-t border-white/5 mt-8 bg-black/40">
          <a href="https://beta.publishers.adsterra.com/referral/R8fkj7ZJZA" target="_blank" rel="nofollow" className="hover:opacity-80 transition opacity-60">
              <img alt="banner" src="https://landings-cdn.adsterratech.com/referralBanners/gif/468x60_adsterra_reff.gif" className="rounded-lg border border-white/10" />
          </a>
      </div>
      
      <div className="max-w-5xl mx-auto px-6 pt-6 text-center md:text-left flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-[10px] text-gray-600 uppercase font-bold tracking-wider">
              &copy; {new Date().getFullYear()} Naxxivo Inc. All rights reserved.
          </p>
          <div className="flex items-center gap-4">
              <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
              <span className="text-[10px] text-green-500 font-bold uppercase tracking-widest">Systems Operational</span>
          </div>
      </div>
    </footer>
  );
};

export default Footer;
