import React, { useState, useCallback, useEffect, createContext, useContext, ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import LucideIcon from './LucideIcon';
import api from '../utils/api';

// Types
export type ToastType = 'success' | 'error' | 'warning' | 'info';

interface ToastItem {
  id: string;
  type: ToastType;
  message: string;
  requestPath?: string;
  autoClose?: boolean;
}

interface ToastContextType {
  showToast: (type: ToastType, message: string, options?: { requestPath?: string; autoClose?: boolean }) => void;
  showSuccess: (message: string) => void;
  showError: (message: string, requestPath?: string) => void;
  showWarning: (message: string) => void;
  showInfo: (message: string) => void;
}

const ToastContext = createContext<ToastContextType | null>(null);

// Configuration des types de toast
const toastConfig = {
  success: {
    icon: 'check-circle',
    bgColor: 'bg-emerald-500/20',
    borderColor: 'border-emerald-500/30',
    iconColor: 'text-emerald-400',
    title: 'Succès'
  },
  error: {
    icon: 'alert-circle',
    bgColor: 'bg-red-500/20',
    borderColor: 'border-red-500/30',
    iconColor: 'text-red-400',
    title: 'Une erreur est survenue'
  },
  warning: {
    icon: 'alert-triangle',
    bgColor: 'bg-yellow-500/20',
    borderColor: 'border-yellow-500/30',
    iconColor: 'text-yellow-400',
    title: 'Attention'
  },
  info: {
    icon: 'info',
    bgColor: 'bg-blue-500/20',
    borderColor: 'border-blue-500/30',
    iconColor: 'text-blue-400',
    title: 'Information'
  }
};

// Composant Toast individuel
function ToastItemComponent({ toast, onClose }: { toast: ToastItem; onClose: () => void }) {
  const { t } = useTranslation();
  const [reporting, setReporting] = useState(false);
  const [reported, setReported] = useState(false);
  const config = toastConfig[toast.type];

  useEffect(() => {
    if (toast.autoClose !== false && toast.type !== 'error') {
      const timer = setTimeout(onClose, 4000);
      return () => clearTimeout(timer);
    }
  }, [toast, onClose]);

  const handleReport = async () => {
    setReporting(true);
    try {
      await api.post('/admin/report-error', {
        error_type: 'user_report',
        message: toast.message,
        request_path: toast.requestPath || window.location.pathname,
        stack_trace: `Page: ${window.location.href}\nUser-Agent: ${navigator.userAgent}\nTime: ${new Date().toISOString()}`
      });
      setReported(true);
      setTimeout(onClose, 2000);
    } catch (err) {
      console.error('Failed to report error:', err);
    } finally {
      setReporting(false);
    }
  };

  return (
    <div className={`bg-gray-800 border ${config.borderColor} rounded-2xl shadow-2xl p-4 animate-slide-up`}>
      <div className="flex items-start gap-3">
        <div className={`flex-shrink-0 w-10 h-10 rounded-full ${config.bgColor} flex items-center justify-center`}>
          <LucideIcon name={config.icon} size={20} className={config.iconColor} />
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="text-white font-medium mb-1">{t(config.title)}</h4>
          <p className="text-gray-400 text-sm line-clamp-2">{toast.message}</p>
          
          {toast.type === 'error' && (
            <div className="flex items-center gap-2 mt-3">
              {reported ? (
                <span className="flex items-center gap-1 text-emerald-400 text-sm">
                  <LucideIcon name="check" size={16} />
                  {t('Signalé !')}
                </span>
              ) : (
                <button
                  onClick={handleReport}
                  disabled={reporting}
                  className="flex items-center gap-1 px-3 py-1.5 bg-red-500/20 hover:bg-red-500/30 text-red-300 text-sm rounded-lg transition-colors disabled:opacity-50"
                >
                  <LucideIcon name="flag" size={14} />
                  {reporting ? t('Envoi...') : t('Signaler')}
                </button>
              )}
              <button
                onClick={onClose}
                className="px-3 py-1.5 text-gray-400 hover:text-white text-sm transition-colors"
              >
                {t('Fermer')}
              </button>
            </div>
          )}
        </div>
        <button
          onClick={onClose}
          className="flex-shrink-0 text-gray-500 hover:text-white transition-colors"
        >
          <LucideIcon name="x" size={18} />
        </button>
      </div>
    </div>
  );
}

// Provider de Toast
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const showToast = useCallback((type: ToastType, message: string, options?: { requestPath?: string; autoClose?: boolean }) => {
    const id = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    setToasts(prev => [...prev, { id, type, message, ...options }]);
  }, []);

  const showSuccess = useCallback((message: string) => showToast('success', message), [showToast]);
  const showError = useCallback((message: string, requestPath?: string) => showToast('error', message, { requestPath }), [showToast]);
  const showWarning = useCallback((message: string) => showToast('warning', message), [showToast]);
  const showInfo = useCallback((message: string) => showToast('info', message), [showToast]);

  return (
    <ToastContext.Provider value={{ showToast, showSuccess, showError, showWarning, showInfo }}>
      {children}
      <div className="fixed bottom-4 right-4 max-w-md z-50 flex flex-col gap-2">
        {toasts.map(toast => (
          <ToastItemComponent key={toast.id} toast={toast} onClose={() => removeToast(toast.id)} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

// Hook pour utiliser les toasts
export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}
