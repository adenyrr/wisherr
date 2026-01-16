import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import LucideIcon from './LucideIcon';
import api from '../utils/api';

interface ErrorToastProps {
  message: string;
  requestPath?: string;
  onClose: () => void;
}

export default function ErrorToast({ message, requestPath, onClose }: ErrorToastProps) {
  const { t } = useTranslation();
  const [reporting, setReporting] = useState(false);
  const [reported, setReported] = useState(false);

  const handleReport = async () => {
    setReporting(true);
    try {
      await api.post('/admin/report-error', {
        error_type: 'user_report',
        message: message,
        request_path: requestPath || window.location.pathname,
        stack_trace: `Page: ${window.location.href}\nUser-Agent: ${navigator.userAgent}\nTime: ${new Date().toISOString()}`
      });
      setReported(true);
      setTimeout(() => onClose(), 2000);
    } catch (err) {
      console.error('Failed to report error:', err);
    } finally {
      setReporting(false);
    }
  };

  return (
    <div className="fixed bottom-4 right-4 max-w-md bg-gray-800 border border-red-500/30 rounded-2xl shadow-2xl p-4 z-50 animate-slide-up">
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center">
          <LucideIcon name="alert-circle" size={20} className="text-red-400" />
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="text-white font-medium mb-1">{t('Une erreur est survenue')}</h4>
          <p className="text-gray-400 text-sm line-clamp-2">{message}</p>
          
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

// Hook personnalisé pour gérer les erreurs avec toast
export function useErrorToast() {
  const [errorState, setErrorState] = useState<{ message: string; path?: string } | null>(null);

  const showError = (message: string, path?: string) => {
    setErrorState({ message, path });
  };

  const hideError = () => {
    setErrorState(null);
  };

  const ErrorToastComponent = errorState ? (
    <ErrorToast
      message={errorState.message}
      requestPath={errorState.path}
      onClose={hideError}
    />
  ) : null;

  return { showError, hideError, ErrorToastComponent };
}
