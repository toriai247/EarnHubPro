import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Bot, Bell, ShieldAlert, Zap, CheckCircle2, Info } from 'lucide-react';
import { AiNotificationType } from '../lib/aiHelper';

interface NotificationToastProps {
  id: string;
  title: string;
  message: string;
  type: string;
  onDismiss: (id: string) => void;
}

const NotificationToast: React.FC<NotificationToastProps> = ({ id, title, message, type, onDismiss }) => {
  const getIcon = () => {
    switch (type) {
      case 'success': return <CheckCircle2 className="text-green-400" size={20} />;
      case 'error': return <ShieldAlert className="text-red-400" size={20} />;
      case 'warning': return <Zap className="text-yellow-400" size={20} />;
      default: return <Bot className="text-blue-400" size={20} />;
    }
  };

  const getBorderColor = () => {
    switch (type) {
      case 'success': return 'border-green-500/30';
      case 'error': return 'border-red-500/30';
      case 'warning': return 'border-yellow-500/30';
      default: return 'border-blue-500/30';
    }
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: 50, scale: 0.9 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: 20, scale: 0.95 }}
      className={`w-full max-w-sm bg-[#0a0a0a]/90 backdrop-blur-xl border ${getBorderColor()} rounded-2xl p-4 shadow-[0_10px_40px_rgba(0,0,0,0.5)] pointer-events-auto relative overflow-hidden group`}
    >
      {/* Background Pulse for AI notifications */}
      {title.includes('AI Assistant') && (
          <div className="absolute top-0 left-0 w-1 h-full bg-blue-500 animate-pulse"></div>
      )}

      <div className="flex gap-4">
        <div className="flex-shrink-0 mt-1">
          <div className="p-2 rounded-xl bg-white/5 border border-white/10">
            {getIcon()}
          </div>
        </div>
        
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-black text-white leading-tight mb-1 truncate pr-6">
            {title}
          </h4>
          <p className="text-xs text-gray-400 leading-relaxed line-clamp-3">
            {message}
          </p>
        </div>

        <button 
          onClick={() => onDismiss(id)}
          className="absolute top-2 right-2 p-1.5 text-gray-600 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
        >
          <X size={14} />
        </button>
      </div>

      <div className="mt-3 pt-3 border-t border-white/5 flex items-center justify-between">
          <span className="text-[8px] font-black text-gray-600 uppercase tracking-widest">Sent via Realtime Protocol</span>
          <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-ping"></div>
      </div>
    </motion.div>
  );
};

export default NotificationToast;