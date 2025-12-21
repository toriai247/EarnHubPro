import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const FullscreenPrompt: React.FC = () => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const handleFullscreenChange = () => {
      if (document.fullscreenElement) {
        setIsVisible(true);
        // Hide after 4 seconds like native OS
        setTimeout(() => setIsVisible(false), 4000);
      } else {
        setIsVisible(false);
      }
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
    };
  }, []);

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ y: -100, opacity: 0 }}
          animate={{ y: 20, opacity: 1 }}
          exit={{ y: -100, opacity: 0 }}
          className="fixed top-0 left-0 right-0 z-[9999] flex justify-center pointer-events-none px-6"
        >
          <div className="bg-[#212121]/95 backdrop-blur-md border border-white/5 px-8 py-4 rounded-[2.5rem] shadow-2xl flex flex-col items-center gap-1 max-w-sm text-center">
            <p className="text-white font-medium text-[13px] leading-snug">
              Drag from top and swipe from the left or right edge to exit full screen.
            </p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default FullscreenPrompt;