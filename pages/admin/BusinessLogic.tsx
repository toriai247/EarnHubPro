
import React from 'react';
import GlassCard from '../../components/GlassCard';
import { DollarSign, Briefcase, Gamepad2, ArrowRightLeft, ShieldCheck, AlertTriangle } from 'lucide-react';

const BusinessLogic: React.FC = () => {
  return (
    <div className="space-y-6 animate-fade-in pb-20">
      <header>
        <h1 className="text-3xl font-bold text-white">Admin Revenue Roadmap</h1>
        <p className="text-gray-400">How your platform generates profit and manages risk.</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Source 1: Tasks & Ads */}
        <GlassCard className="border-l-4 border-l-blue-500">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-blue-500/20 rounded-lg text-blue-400"><Briefcase size={24}/></div>
            <h2 className="text-xl font-bold text-white">1. Task Margin (The Spread)</h2>
          </div>
          <p className="text-gray-400 text-sm mb-4">
            You charge Advertisers/Dealers a higher price than you pay Users.
          </p>
          <div className="bg-black/30 p-4 rounded-xl border border-white/5 space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">Dealer Pays (Input)</span>
              <span className="text-green-400 font-bold">5.00 BDT / Task</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">User Earns (Cost)</span>
              <span className="text-red-400 font-bold">2.00 BDT / Task</span>
            </div>
            <div className="border-t border-white/10 pt-2 flex justify-between">
              <span className="text-white font-bold">Your Profit</span>
              <span className="text-blue-400 font-bold">3.00 BDT (60% Margin)</span>
            </div>
          </div>
        </GlassCard>

        {/* Source 2: Game Logic */}
        <GlassCard className="border-l-4 border-l-purple-500">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-purple-500/20 rounded-lg text-purple-400"><Gamepad2 size={24}/></div>
            <h2 className="text-xl font-bold text-white">2. The "Hook & Drain" Algorithm</h2>
          </div>
          <p className="text-gray-400 text-sm mb-4">
            Automated difficulty adjustment based on user winnings.
          </p>
          <div className="bg-black/30 p-4 rounded-xl border border-white/5 space-y-2 text-sm">
            <p className="text-gray-300"><strong className="text-green-400">Hook Phase:</strong> If user balance &lt; 5000, Win Rate = 65%. Keeps them interested.</p>
            <p className="text-gray-300"><strong className="text-red-400">Drain Phase:</strong> If user balance &gt; 5000, Win Rate drops to 25%. Slowly reclaims profit.</p>
            <div className="mt-2 text-xs bg-purple-500/10 p-2 rounded text-purple-300">
              *Warning: This logic applies automatically to Crash, Spin, and Dice.
            </div>
          </div>
        </GlassCard>

        {/* Source 3: Fees */}
        <GlassCard className="border-l-4 border-l-orange-500">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-orange-500/20 rounded-lg text-orange-400"><ArrowRightLeft size={24}/></div>
            <h2 className="text-xl font-bold text-white">3. Network Fees</h2>
          </div>
          <p className="text-gray-400 text-sm mb-4">
            Deductions from user movements.
          </p>
          <ul className="list-disc pl-5 space-y-2 text-sm text-gray-300">
            <li><strong className="text-white">Withdrawal Fee:</strong> e.g., 5% - 10% deducted when users cash out.</li>
            <li><strong className="text-white">P2P Transfer Fee:</strong> 2% - 5% fee when users send money to each other.</li>
            <li><strong className="text-white">Currency Swap:</strong> 5% fee when switching base currency.</li>
          </ul>
        </GlassCard>

        {/* Legal Shield */}
        <GlassCard className="border-l-4 border-l-red-500 bg-red-950/10">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-red-500/20 rounded-lg text-red-400"><ShieldCheck size={24}/></div>
            <h2 className="text-xl font-bold text-white">Auto-Security</h2>
          </div>
          <div className="text-sm text-gray-300 space-y-3">
            <p>
              The system auto-approves deposits under 25,000 to build trust.
            </p>
            <div className="bg-black/40 p-3 rounded-lg border border-red-500/20">
              <h4 className="text-red-400 font-bold mb-1 flex items-center gap-2"><AlertTriangle size={12}/> Fraud Trap</h4>
              <p className="text-xs text-gray-400">
                 If a user abuses auto-approve with fake Transaction IDs, use the <strong>"Fraud Ban"</strong> button in Finance Manager. This suspends them and reverses the balance immediately.
              </p>
            </div>
          </div>
        </GlassCard>

      </div>
    </div>
  );
};

export default BusinessLogic;
