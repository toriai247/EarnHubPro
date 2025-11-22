import React, { useState } from 'react';
import GlassCard from '../components/GlassCard';
import { ChevronDown, ChevronUp, HelpCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const MotionDiv = motion.div as any;

const FAQs = [
    { q: "How do I deposit funds?", a: "Go to the Wallet page and click on 'Deposit'. Select your preferred payment method (Bkash, Nagad, or Crypto), enter the amount, and follow the instructions." },
    { q: "What is the minimum withdrawal?", a: "The minimum withdrawal amount is $50. Withdrawals are processed within 24 hours." },
    { q: "How does the investment work?", a: "Choose a plan from the 'Invest' page. Your capital is locked for the duration of the plan, and you receive daily returns. Principal + Profit is returned at the end." },
    { q: "Is my data safe?", a: "Yes, we use industry-standard encryption to protect your personal data and transaction history." },
    { q: "Can I earn without depositing?", a: "Absolutely! You can earn by completing daily tasks, watching videos, and inviting friends." },
    { q: "How do I refer friends?", a: "Go to the 'Invite' page, copy your unique referral code, and share it. You earn a percentage of their earnings." }
];

const FAQ: React.FC = () => {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <div className="pb-24 sm:pl-20 sm:pt-6 space-y-6">
      <header>
         <h1 className="text-2xl font-display font-bold text-white mb-2 flex items-center gap-2">
            <HelpCircle className="text-royal-400" /> Help Center
         </h1>
         <p className="text-gray-400 text-sm">Frequently Asked Questions</p>
      </header>

      <div className="space-y-3">
          {FAQs.map((faq, idx) => (
              <GlassCard key={idx} className="p-0 overflow-hidden">
                  <button 
                    onClick={() => setOpenIndex(openIndex === idx ? null : idx)}
                    className="w-full flex justify-between items-center p-4 text-left hover:bg-white/5 transition"
                  >
                      <span className="font-bold text-white text-sm">{faq.q}</span>
                      {openIndex === idx ? <ChevronUp size={18} className="text-neon-green" /> : <ChevronDown size={18} className="text-gray-500" />}
                  </button>
                  <AnimatePresence>
                      {openIndex === idx && (
                          <MotionDiv 
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="px-4 pb-4 text-sm text-gray-400 border-t border-white/5 pt-2"
                          >
                              {faq.a}
                          </MotionDiv>
                      )}
                  </AnimatePresence>
              </GlassCard>
          ))}
      </div>
    </div>
  );
};

export default FAQ;