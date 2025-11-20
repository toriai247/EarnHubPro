
import React from 'react';
import GlassCard from '../components/GlassCard';
import { Shield, FileText } from 'lucide-react';

const Terms: React.FC = () => {
  return (
    <div className="pb-24 sm:pl-20 sm:pt-6 space-y-6">
      <header>
         <h1 className="text-2xl font-display font-bold text-white mb-2">Terms & Policies</h1>
      </header>

      <GlassCard className="space-y-6">
          <div className="flex items-center gap-3 mb-4">
              <Shield className="text-neon-green" size={24} />
              <h2 className="text-xl font-bold text-white">Privacy Policy</h2>
          </div>
          <div className="text-sm text-gray-400 space-y-3">
              <p>
                  At EarnHub Pro, we prioritize your privacy. We collect minimal data required to operate our service, such as your email and transaction history.
              </p>
              <p>
                  We do not sell your personal data to third parties. All financial transactions are encrypted.
              </p>
          </div>

          <div className="h-px bg-white/10 my-6"></div>

          <div className="flex items-center gap-3 mb-4">
              <FileText className="text-royal-400" size={24} />
              <h2 className="text-xl font-bold text-white">Terms of Service</h2>
          </div>
          <div className="text-sm text-gray-400 space-y-3">
              <p>
                  By using EarnHub Pro, you agree to the following terms:
              </p>
              <ul className="list-disc pl-5 space-y-1">
                  <li>You must be at least 18 years old.</li>
                  <li>Multiple accounts per person are strictly prohibited.</li>
                  <li>Any attempt to cheat or exploit the system will result in a permanent ban.</li>
                  <li>Withdrawals are subject to review and may take up to 24 hours.</li>
                  <li>Investment returns are estimated and not guaranteed in cases of extreme market volatility.</li>
              </ul>
          </div>
      </GlassCard>
    </div>
  );
};

export default Terms;
