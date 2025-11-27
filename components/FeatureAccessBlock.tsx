
import React from 'react';
import { ShieldAlert, AlertTriangle, ArrowLeft, Ban } from 'lucide-react';
import { Link } from 'react-router-dom';
import GlassCard from './GlassCard';

interface FeatureAccessBlockProps {
  featureName?: string;
}

const FeatureAccessBlock: React.FC<FeatureAccessBlockProps> = ({ featureName = "System" }) => {
  return (
    <div className="min-h-[80vh] flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <div className="relative">
          {/* Animated Hazard Background */}
          <div className="absolute -inset-1 bg-gradient-to-r from-red-600 to-orange-600 rounded-2xl blur opacity-30 animate-pulse"></div>
          
          <GlassCard className="relative bg-black/90 border-red-500/50 p-8 text-center overflow-hidden">
            
            {/* Warning Stripes */}
            <div className="absolute top-0 left-0 right-0 h-2 bg-[repeating-linear-gradient(45deg,#ef4444,#ef4444_10px,transparent_10px,transparent_20px)] opacity-50"></div>

            <div className="w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-6 border-2 border-red-500/50 shadow-[0_0_30px_rgba(239,68,68,0.4)]">
              <ShieldAlert size={40} className="text-red-500" />
            </div>

            <h2 className="text-2xl font-black text-white uppercase tracking-widest mb-2">
              ACCESS DENIED
            </h2>
            
            <div className="bg-red-950/50 border border-red-900/50 rounded-lg p-3 mb-6">
              <p className="text-red-400 text-xs font-bold font-mono uppercase">
                ERROR: {featureName}_MODULE_DISABLED
              </p>
            </div>

            <p className="text-gray-300 text-sm leading-relaxed mb-6 font-medium">
              This system is currently <span className="text-white font-bold">OFFLINE</span> for maintenance or security reasons.
            </p>

            <div className="bg-white/5 rounded-xl p-4 mb-8 text-left border-l-4 border-yellow-500">
              <div className="flex items-center gap-2 mb-1">
                <AlertTriangle size={16} className="text-yellow-500" />
                <span className="text-yellow-500 font-bold text-xs uppercase">Security Notice</span>
              </div>
              <p className="text-[11px] text-gray-400">
                Unauthorized attempts to bypass system restrictions or force-access disabled routes are logged for security review. 
                <br/><br/>
                <span className="text-red-400 font-bold flex items-center gap-1">
                   <Ban size={10} /> Risk of Account Suspension (ID Ban).
                </span>
              </p>
            </div>

            <Link 
              to="/" 
              className="w-full py-3 bg-white text-black font-black rounded-xl hover:bg-gray-200 transition flex items-center justify-center gap-2 uppercase tracking-wider"
            >
              <ArrowLeft size={18} /> Return to Base
            </Link>

          </GlassCard>
        </div>
      </div>
    </div>
  );
};

export default FeatureAccessBlock;
