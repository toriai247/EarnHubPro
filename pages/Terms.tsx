
import React, { useState } from 'react';
import GlassCard from '../components/GlassCard';
import { Shield, FileText, Lock, AlertTriangle, Scale, CheckCircle, Eye, Scroll, Ban } from 'lucide-react';
import { motion } from 'framer-motion';

const MotionDiv = motion.div as any;

const SECTIONS = [
    { id: 'intro', title: 'Introduction', icon: FileText },
    { id: 'disclaimer', title: 'Risk & Liability', icon: AlertTriangle },
    { id: 'eligibility', title: 'Eligibility', icon: CheckCircle },
    { id: 'financial', title: 'Financials', icon: Scale },
    { id: 'prohibited', title: 'Prohibited', icon: Ban },
];

const Terms: React.FC = () => {
  const [activeSection, setActiveSection] = useState('intro');

  const scrollToSection = (id: string) => {
      setActiveSection(id);
      const element = document.getElementById(id);
      if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
  };

  return (
    <div className="pb-24 sm:pl-20 sm:pt-6 space-y-6 px-4 sm:px-0 min-h-screen relative">
      
      {/* HEADER */}
      <div className="relative pt-4 mb-8">
         <h1 className="text-3xl font-display font-black text-white mb-2 flex items-center gap-3">
            <Shield className="text-neon-green fill-neon-green/10" size={32} /> 
            Legal Center
         </h1>
         <p className="text-gray-400 text-sm max-w-xl">
             Transparency is our core value. Please read these terms carefully before using Naxxivo.
             <br />
             <span className="text-xs text-gray-500 mt-2 block">Last Updated: March 15, 2024</span>
         </p>
      </div>

      <div className="flex flex-col lg:flex-row gap-8">
          
          {/* NAVIGATION (Sticky Sidebar) */}
          <div className="lg:w-64 shrink-0">
              <div className="sticky top-24 bg-surface/50 backdrop-blur-xl border border-white/10 rounded-2xl p-2 overflow-x-auto lg:overflow-visible flex lg:flex-col gap-1 no-scrollbar z-20">
                  {SECTIONS.map(section => (
                      <button
                        key={section.id}
                        onClick={() => scrollToSection(section.id)}
                        className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all whitespace-nowrap lg:whitespace-normal ${
                            activeSection === section.id 
                            ? 'bg-white text-black shadow-lg scale-[1.02]' 
                            : 'text-gray-400 hover:text-white hover:bg-white/5'
                        }`}
                      >
                          <section.icon size={16} className={activeSection === section.id ? 'text-blue-600' : 'opacity-50'} />
                          {section.title}
                      </button>
                  ))}
              </div>
          </div>

          {/* CONTENT AREA */}
          <div className="flex-1 space-y-8">
              
              <Section id="intro" title="1. Introduction" icon={FileText}>
                  <p>
                      Welcome to Naxxivo ("we," "our," or "us"). By accessing or using our website, mobile application, and services (collectively, the "Service"), you agree to be bound by these Terms of Service ("Terms") and our Privacy Policy.
                  </p>
                  <p>
                      If you do not agree to these Terms, you may not access or use the Service. We reserve the right to modify these Terms at any time. Continued use of the Service constitutes acceptance of updated Terms.
                  </p>
              </Section>

              <Section id="disclaimer" title="2. Risk & Liability Disclaimer" icon={AlertTriangle}>
                  <div className="bg-red-500/10 border-l-4 border-red-500 p-4 rounded-r-lg mb-4">
                      <p className="text-red-200 text-xs font-bold uppercase mb-2">IMPORTANT NOTICE</p>
                      <p className="text-sm text-gray-300">
                          This platform provides access to social gaming, tasks, and speculative digital activities. 
                      </p>
                  </div>
                  <ul className="list-disc pl-5 space-y-3 text-gray-300">
                      <li><strong>No Guarantees:</strong> Participation in games or investments does not guarantee profit. Losses are possible.</li>
                      <li><strong>User Responsibility:</strong> You acknowledge that betting or gambling may be prohibited in your jurisdiction or considered culturally/religiously restricted (Haram). You access this site at your own sole discretion and risk.</li>
                      <li><strong>Limitation of Liability:</strong> The Administrators, Owners, and Developers of Naxxivo are <span className="text-white font-bold">NOT responsible</span> for any financial losses, addiction, or legal consequences arising from your use of this platform.</li>
                      <li><strong>Virtual Currency:</strong> All balances are digital representations and do not constitute a legal banking deposit.</li>
                  </ul>
              </Section>

              <Section id="eligibility" title="3. User Eligibility" icon={CheckCircle}>
                  <ul className="list-disc pl-5 space-y-2 text-gray-300">
                      <li>You must be at least 18 years old or the age of majority in your jurisdiction to use this Service.</li>
                      <li>You must be a human. Accounts registered by "bots" or other automated methods are not permitted.</li>
                      <li>You must provide your legal full name, a valid email address, and any other information requested in order to complete the signup process.</li>
                      <li>One person may maintain only one account. Multiple accounts are strictly prohibited and will result in immediate ban and forfeiture of funds.</li>
                  </ul>
              </Section>

              <Section id="financial" title="4. Financial Transactions" icon={Scale}>
                  <p>
                      <strong>Deposits:</strong> Funds deposited into your account are used for investment plans and gaming. Deposits are non-refundable once used.
                  </p>
                  <p>
                      <strong>Withdrawals:</strong> You may request withdrawals of your "Withdrawable Balance" at any time, subject to minimum limits and processing times (typically 24 hours).
                  </p>
                  <p>
                      <strong>Fees:</strong> We reserve the right to charge transaction fees for deposits or withdrawals to cover network costs. Current fees are displayed on the respective pages.
                  </p>
              </Section>

              <Section id="prohibited" title="5. Prohibited Activities" icon={Ban}>
                  <p>The following activities result in immediate termination:</p>
                  <ul className="space-y-2 mt-2">
                      {[
                          "Using VPNs or Proxies to mask location.",
                          "Attempting to exploit bugs or glitches in games.",
                          "Creating multiple accounts to abuse referral bonuses.",
                          "Money laundering or funding illegal activities.",
                          "Harassing support staff or other users."
                      ].map((item, i) => (
                          <li key={i} className="flex items-center gap-2 text-red-300 bg-red-900/10 px-3 py-2 rounded-lg text-xs font-bold border border-red-900/20">
                              <span className="w-1.5 h-1.5 bg-red-500 rounded-full"></span> {item}
                          </li>
                      ))}
                  </ul>
              </Section>

              <div className="pt-8 border-t border-white/10 text-center">
                  <p className="text-gray-500 text-xs">
                      © 2024 Naxxivo. All rights reserved. <br/>
                      For legal inquiries, contact legal@naxxivo.com
                  </p>
              </div>

          </div>
      </div>
    </div>
  );
};

const Section = ({ id, title, icon: Icon, children }: { id: string, title: string, icon: any, children?: React.ReactNode }) => (
    <MotionDiv 
        id={id}
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-50px" }}
        className="scroll-mt-28"
    >
        <GlassCard className="border border-white/5 hover:border-white/10 transition-colors">
            <div className="flex items-center gap-3 mb-6 border-b border-white/5 pb-4">
                <div className="p-2 bg-white/5 rounded-lg text-neon-green">
                    <Icon size={24} />
                </div>
                <h2 className="text-xl font-bold text-white">{title}</h2>
            </div>
            <div className="text-gray-400 text-sm leading-7 space-y-4">
                {children}
            </div>
        </GlassCard>
    </MotionDiv>
);

export default Terms;
