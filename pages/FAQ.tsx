
import React, { useState } from 'react';
import GlassCard from '../components/GlassCard';
import { ChevronDown, ChevronUp, HelpCircle, Search, Wallet, Shield, User, Zap, MessageCircle, FileText } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const MotionDiv = motion.div as any;

const CATEGORIES = [
  { id: 'all', label: 'All', icon: Grid },
  { id: 'financial', label: 'Financial', icon: Wallet },
  { id: 'account', label: 'Account', icon: User },
  { id: 'security', label: 'Security', icon: Shield },
  { id: 'general', label: 'General', icon: HelpCircle },
];

function Grid(props: any) {
    return (
        <svg
            {...props}
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <rect width="7" height="7" x="3" y="3" rx="1" />
            <rect width="7" height="7" x="14" y="3" rx="1" />
            <rect width="7" height="7" x="14" y="14" rx="1" />
            <rect width="7" height="7" x="3" y="14" rx="1" />
        </svg>
    )
}

const FAQs = [
    { 
        id: 1, 
        category: 'financial', 
        q: "How do I deposit funds?", 
        a: "Go to the Wallet page and click on 'Deposit'. Select your preferred payment method (Bkash, Nagad, or Crypto), enter the amount, transaction ID, and upload a screenshot if required. Admin approval typically takes 10-30 minutes." 
    },
    { 
        id: 2, 
        category: 'financial', 
        q: "What is the minimum withdrawal?", 
        a: "The minimum withdrawal amount varies by method but generally starts at $50. Withdrawals are processed within 24 hours. Check your 'Wallet' page for specific limits." 
    },
    { 
        id: 3, 
        category: 'general', 
        q: "How does the investment work?", 
        a: "Choose a plan from the 'Invest' page. Your capital is locked for the duration of the plan, and you receive daily returns automatically. Principal + Profit is returned to your wallet at the end of the term." 
    },
    { 
        id: 4, 
        category: 'security', 
        q: "Is my data safe?", 
        a: "Yes, we use industry-standard encryption (AES-256) to protect your personal data and transaction history. We do not share your data with third parties." 
    },
    { 
        id: 5, 
        category: 'general', 
        q: "Can I earn without depositing?", 
        a: "Absolutely! You can earn by completing daily tasks, watching videos, playing free games (if available), and inviting friends to join EarnHub Pro." 
    },
    { 
        id: 6, 
        category: 'account', 
        q: "How do I refer friends?", 
        a: "Go to the 'Invite' page, copy your unique referral code or link, and share it. You earn a 5% commission on their deposits and activity instantly." 
    },
    { 
        id: 7, 
        category: 'account', 
        q: "Can I change my password?", 
        a: "Yes, currently please contact support to reset credentials. A self-service password reset feature is coming soon in the Profile settings." 
    },
    { 
        id: 8, 
        category: 'security', 
        q: "What is Biometric Login?", 
        a: "Biometric login allows you to use your device's fingerprint or face ID (Passkey) to log in securely without typing your password. You can set this up in the Profile menu." 
    }
];

const FAQ: React.FC = () => {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');

  const filteredFAQs = FAQs.filter(faq => {
      const matchesSearch = faq.q.toLowerCase().includes(searchQuery.toLowerCase()) || faq.a.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = activeCategory === 'all' || faq.category === activeCategory;
      return matchesSearch && matchesCategory;
  });

  return (
    <div className="pb-24 sm:pl-20 sm:pt-6 space-y-8 px-4 sm:px-0">
      
      {/* HEADER */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-royal-900 via-dark-900 to-black border border-white/10 p-8 text-center">
         <div className="absolute top-0 left-0 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
         <div className="relative z-10">
             <div className="w-16 h-16 mx-auto bg-white/5 rounded-2xl flex items-center justify-center mb-4 border border-white/10 shadow-lg backdrop-blur-sm">
                 <HelpCircle className="text-neon-green" size={32} />
             </div>
             <h1 className="text-3xl font-display font-black text-white mb-2 tracking-tight">How can we help?</h1>
             <p className="text-gray-400 text-sm max-w-md mx-auto">Search our knowledge base for answers to common questions about earning, payments, and security.</p>
             
             {/* SEARCH BAR */}
             <div className="mt-6 relative max-w-md mx-auto group">
                 <div className="absolute inset-0 bg-neon-green/20 blur-xl rounded-full opacity-0 group-focus-within:opacity-100 transition-opacity duration-500"></div>
                 <div className="relative flex items-center bg-black/50 border border-white/10 rounded-xl overflow-hidden backdrop-blur-md focus-within:border-neon-green transition-colors">
                     <Search className="ml-4 text-gray-500 group-focus-within:text-neon-green transition-colors" size={20} />
                     <input 
                        type="text" 
                        placeholder="Search for answers..." 
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full bg-transparent p-4 text-white placeholder-gray-500 outline-none"
                     />
                 </div>
             </div>
         </div>
      </div>

      {/* CATEGORY TABS */}
      <div className="flex overflow-x-auto no-scrollbar gap-3 pb-2">
          {CATEGORIES.map(cat => (
              <button
                key={cat.id}
                onClick={() => { setActiveCategory(cat.id); setOpenIndex(null); }}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border transition-all whitespace-nowrap text-xs font-bold uppercase tracking-wider ${
                    activeCategory === cat.id 
                    ? 'bg-white text-black border-white shadow-lg scale-105' 
                    : 'bg-white/5 text-gray-400 border-white/5 hover:bg-white/10 hover:text-white'
                }`}
              >
                  <cat.icon size={14} />
                  {cat.label}
              </button>
          ))}
      </div>

      {/* FAQ LIST */}
      <div className="grid gap-3">
          <AnimatePresence mode="popLayout">
              {filteredFAQs.length === 0 ? (
                  <motion.div 
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                    className="text-center py-12 bg-white/5 rounded-2xl border border-white/5"
                  >
                      <MessageCircle size={40} className="mx-auto text-gray-600 mb-2" />
                      <p className="text-gray-500">No results found.</p>
                  </motion.div>
              ) : (
                  filteredFAQs.map((faq, idx) => (
                      <MotionDiv
                        layout
                        key={faq.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        transition={{ duration: 0.2, delay: idx * 0.05 }}
                      >
                          <GlassCard className={`p-0 overflow-hidden transition-all duration-300 ${openIndex === faq.id ? 'border-neon-green/50 bg-white/10' : 'hover:bg-white/5'}`}>
                              <button 
                                onClick={() => setOpenIndex(openIndex === faq.id ? null : faq.id)}
                                className="w-full flex justify-between items-center p-5 text-left"
                              >
                                  <div className="flex items-center gap-4">
                                      <div className={`p-2 rounded-lg ${openIndex === faq.id ? 'bg-neon-green text-black' : 'bg-white/5 text-gray-400'}`}>
                                          <FileText size={18} />
                                      </div>
                                      <span className={`font-bold text-sm ${openIndex === faq.id ? 'text-white' : 'text-gray-300'}`}>{faq.q}</span>
                                  </div>
                                  {openIndex === faq.id ? <ChevronUp size={18} className="text-neon-green" /> : <ChevronDown size={18} className="text-gray-500" />}
                              </button>
                              
                              <AnimatePresence>
                                  {openIndex === faq.id && (
                                      <MotionDiv 
                                        initial={{ height: 0, opacity: 0 }}
                                        animate={{ height: 'auto', opacity: 1 }}
                                        exit={{ height: 0, opacity: 0 }}
                                        className="px-5 pb-5 pt-0"
                                      >
                                          <div className="pl-[52px] text-sm text-gray-400 leading-relaxed border-l-2 border-white/10 ml-4 py-2">
                                              {faq.a}
                                          </div>
                                      </MotionDiv>
                                  )}
                              </AnimatePresence>
                          </GlassCard>
                      </MotionDiv>
                  ))
              )}
          </AnimatePresence>
      </div>

      {/* SUPPORT CTA */}
      <div className="bg-gradient-to-r from-blue-600/20 to-purple-600/20 border border-blue-500/20 rounded-2xl p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
              <h3 className="font-bold text-white text-lg mb-1">Still have questions?</h3>
              <p className="text-sm text-blue-200">Our support team is available 24/7 to assist you.</p>
          </div>
          <button className="px-6 py-3 bg-white text-black font-bold rounded-xl hover:scale-105 transition shadow-lg flex items-center gap-2">
              <MessageCircle size={18} /> Contact Support
          </button>
      </div>

    </div>
  );
};

export default FAQ;
