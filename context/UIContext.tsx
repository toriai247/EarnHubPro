
import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { CheckCircle, AlertCircle, Info, X, AlertTriangle } from 'lucide-react';

type ToastType = 'success' | 'error' | 'info' | 'warning';

interface Toast {
  id: string;
  message: string;
  type: ToastType;
}

interface ConfirmOptions {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  type?: 'danger' | 'info' | 'success';
}

interface UIContextType {
  toast: {
    success: (msg: string) => void;
    error: (msg: string) => void;
    info: (msg: string) => void;
    warning: (msg: string) => void;
  };
  confirm: (message: string, title?: string) => Promise<boolean>;
}

const UIContext = createContext<UIContextType | undefined>(undefined);

export const UIProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    resolve: (val: boolean) => void;
  } | null>(null);

  // --- TOAST LOGIC ---
  const addToast = useCallback((message: string, type: ToastType) => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => removeToast(id), 4000);
  }, []);

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const toast = {
    success: (msg: string) => addToast(msg, 'success'),
    error: (msg: string) => addToast(msg, 'error'),
    info: (msg: string) => addToast(msg, 'info'),
    warning: (msg: string) => addToast(msg, 'warning'),
  };

  // --- CONFIRM LOGIC ---
  const confirm = useCallback((message: string, title: string = 'Are you sure?') => {
    return new Promise<boolean>((resolve) => {
      setConfirmDialog({
        isOpen: true,
        title,
        message,
        resolve,
      });
    });
  }, []);

  const handleConfirm = (result: boolean) => {
    if (confirmDialog) {
      confirmDialog.resolve(result);
      setConfirmDialog(null);
    }
  };

  return (
    <UIContext.Provider value={{ toast, confirm }}>
      {children}

      {/* TOAST CONTAINER */}
      <div className="fixed top-4 left-0 right-0 z-[100] flex flex-col items-center pointer-events-none gap-2 px-4">
        <AnimatePresence>
          {toasts.map((t) => (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, y: -20, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.9 }}
              className={`pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-xl shadow-2xl backdrop-blur-xl border min-w-[300px] max-w-md ${
                t.type === 'success' ? 'bg-green-900/80 border-green-500/30 text-white' :
                t.type === 'error' ? 'bg-red-900/80 border-red-500/30 text-white' :
                t.type === 'warning' ? 'bg-yellow-900/80 border-yellow-500/30 text-white' :
                'bg-royal-900/80 border-royal-500/30 text-white'
              }`}
            >
              <div className={`p-1 rounded-full ${
                 t.type === 'success' ? 'bg-green-500 text-black' :
                 t.type === 'error' ? 'bg-red-500 text-white' :
                 t.type === 'warning' ? 'bg-yellow-500 text-black' :
                 'bg-blue-500 text-white'
              }`}>
                {t.type === 'success' ? <CheckCircle size={16} /> :
                 t.type === 'error' ? <AlertCircle size={16} /> :
                 t.type === 'warning' ? <AlertTriangle size={16} /> :
                 <Info size={16} />}
              </div>
              <p className="text-sm font-medium flex-1">{t.message}</p>
              <button onClick={() => removeToast(t.id)} className="opacity-60 hover:opacity-100">
                <X size={16} />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* CONFIRM MODAL */}
      <AnimatePresence>
        {confirmDialog && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[110] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => handleConfirm(false)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-dark-900 border border-white/10 rounded-2xl p-6 w-full max-w-sm shadow-2xl relative overflow-hidden"
            >
              {/* Background FX */}
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-royal-600 via-neon-green to-royal-600"></div>
              
              <h3 className="text-xl font-bold text-white mb-2">{confirmDialog.title}</h3>
              <p className="text-gray-400 text-sm mb-6 leading-relaxed">
                {confirmDialog.message}
              </p>
              
              <div className="flex gap-3">
                <button
                  onClick={() => handleConfirm(false)}
                  className="flex-1 py-3 bg-white/5 hover:bg-white/10 text-white text-sm font-bold rounded-xl transition border border-white/5"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleConfirm(true)}
                  className="flex-1 py-3 bg-gradient-to-r from-royal-600 to-royal-500 hover:from-royal-500 hover:to-royal-400 text-white text-sm font-bold rounded-xl transition shadow-lg shadow-royal-600/20"
                >
                  Confirm
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </UIContext.Provider>
  );
};

export const useUI = () => {
  const context = useContext(UIContext);
  if (!context) {
    throw new Error('useUI must be used within a UIProvider');
  }
  return context;
};
