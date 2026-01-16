import React, { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import LucideIcon from './LucideIcon';

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'warning' | 'info';
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel,
  cancelLabel,
  variant = 'danger',
  onConfirm,
  onCancel
}: ConfirmDialogProps) {
  const { t } = useTranslation();

  if (!open) return null;

  const variantConfig = {
    danger: {
      icon: 'alert-triangle',
      iconColor: 'text-red-400',
      iconBg: 'bg-red-500/20',
      confirmBg: 'bg-red-500 hover:bg-red-600',
    },
    warning: {
      icon: 'alert-circle',
      iconColor: 'text-amber-400',
      iconBg: 'bg-amber-500/20',
      confirmBg: 'bg-amber-500 hover:bg-amber-600',
    },
    info: {
      icon: 'info',
      iconColor: 'text-blue-400',
      iconBg: 'bg-blue-500/20',
      confirmBg: 'bg-blue-500 hover:bg-blue-600',
    }
  };

  const config = variantConfig[variant];

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
      <div className="w-full max-w-md rounded-2xl bg-gray-900 border border-white/10 shadow-2xl animate-slide-up">
        <div className="p-6">
          <div className="flex items-start gap-4">
            <div className={`flex-shrink-0 w-12 h-12 rounded-full ${config.iconBg} flex items-center justify-center`}>
              <LucideIcon name={config.icon} size={24} className={config.iconColor} />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-white mb-2">{title}</h3>
              <p className="text-gray-400 text-sm">{message}</p>
            </div>
          </div>
          
          <div className="flex justify-end gap-3 mt-6">
            <button
              onClick={onCancel}
              className="px-4 py-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
            >
              {cancelLabel || t('Annuler')}
            </button>
            <button
              onClick={onConfirm}
              className={`px-4 py-2 rounded-lg text-white transition-colors ${config.confirmBg}`}
            >
              {confirmLabel || t('Confirmer')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Hook pour gérer les confirmations

interface ConfirmState {
  open: boolean;
  title: string;
  message: string;
  variant: 'danger' | 'warning' | 'info';
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
}

export function useConfirm() {
  const [state, setState] = useState<ConfirmState>({
    open: false,
    title: '',
    message: '',
    variant: 'danger',
    confirmLabel: undefined,
    cancelLabel: undefined,
    onConfirm: () => {}
  });

  const confirm = useCallback((
    title: string,
    message: string,
    options?: {
      variant?: 'danger' | 'warning' | 'info';
      confirmLabel?: string;
      cancelLabel?: string;
    }
  ): Promise<boolean> => {
    return new Promise((resolve) => {
      setState({
        open: true,
        title,
        message,
        variant: options?.variant || 'danger',
        confirmLabel: options?.confirmLabel,
        cancelLabel: options?.cancelLabel,
        onConfirm: () => {
          setState(s => ({ ...s, open: false }));
          resolve(true);
        }
      });
    });
  }, []);

  const handleCancel = useCallback(() => {
    setState(s => ({ ...s, open: false }));
  }, []);

  const ConfirmDialogComponent = () => (
    <ConfirmDialog
      open={state.open}
      title={state.title}
      message={state.message}
      variant={state.variant}
      confirmLabel={state.confirmLabel}
      cancelLabel={state.cancelLabel}
      onConfirm={state.onConfirm}
      onCancel={handleCancel}
    />
  );

  return { confirm, ConfirmDialogComponent };
}
