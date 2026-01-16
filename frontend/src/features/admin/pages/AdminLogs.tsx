import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import Layout from '../../../shared/components/Layout';
import LucideIcon from '../../../shared/components/LucideIcon';
import { useToast } from '../../../shared/components/Toast';
import api from '../../../shared/utils/api';

interface LogEntry {
  id: number;
  created_at: string;
  action: string;
  target_type: string;
  target_id?: number;
  user_id?: number;
  username?: string;
}

interface InternalError {
  id: number;
  error_type: string;
  message: string;
  stack_trace?: string;
  request_path?: string;
  user_id?: number;
  created_at: string;
  resolved: boolean;
}

export default function AdminLogs() {
  const { t } = useTranslation();
  const { showSuccess, showError } = useToast();
  const [activeTab, setActiveTab] = useState<'logs' | 'errors'>('logs');
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [errors, setErrors] = useState<InternalError[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedError, setSelectedError] = useState<InternalError | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [logsRes, errorsRes] = await Promise.all([
        api.get('/admin/logs?limit=100').catch(() => ({ data: [] })),
        api.get('/admin/errors').catch(() => ({ data: [] }))
      ]);
      setLogs(logsRes.data || []);
      setErrors(errorsRes.data || []);
    } catch (err) {
      console.error('Failed to fetch logs:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleResolveError = async (errorId: number) => {
    try {
      await api.delete(`/admin/errors/${errorId}`);
      setErrors(prev => prev.filter(e => e.id !== errorId));
      setSelectedError(null);
      showSuccess(t('Erreur résolue et supprimée'));
    } catch (err: any) {
      showError(err.response?.data?.detail || t('Erreur lors de la suppression'));
    }
  };

  const getActionColor = (action: string) => {
    if (action.includes('created') || action.includes('added')) return 'text-green-400 bg-green-500/10';
    if (action.includes('deleted') || action.includes('removed')) return 'text-red-400 bg-red-500/10';
    if (action.includes('updated') || action.includes('modified')) return 'text-blue-400 bg-blue-500/10';
    if (action.includes('reserved')) return 'text-amber-400 bg-amber-500/10';
    if (action.includes('purchased')) return 'text-emerald-400 bg-emerald-500/10';
    if (action.includes('shared') || action.includes('share')) return 'text-purple-400 bg-purple-500/10';
    if (action.includes('login') || action.includes('logout')) return 'text-cyan-400 bg-cyan-500/10';
    return 'text-gray-400 bg-gray-500/10';
  };

  const formatTimestamp = (ts: string) => {
    return new Date(ts).toLocaleString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  return (
    <Layout>
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-white mb-1">
              <LucideIcon name="scroll-text" size={28} className="inline-block mr-3 text-amber-400" />
              {t('Logs & Erreurs')}
            </h1>
            <p className="text-gray-400">
              {t('Surveillance de l\'activité système')}
            </p>
          </div>
          <button
            onClick={fetchData}
            className="flex items-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-xl transition-colors"
          >
            <LucideIcon name="refresh-cw" size={18} />
            <span>{t('Actualiser')}</span>
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setActiveTab('logs')}
            className={`px-4 py-2 rounded-xl font-medium transition-colors ${
              activeTab === 'logs'
                ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                : 'text-gray-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <LucideIcon name="file-text" size={18} className="inline-block mr-2" />
            {t('Logs')} ({logs.length})
          </button>
          <button
            onClick={() => setActiveTab('errors')}
            className={`px-4 py-2 rounded-xl font-medium transition-colors ${
              activeTab === 'errors'
                ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                : 'text-gray-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <LucideIcon name="alert-triangle" size={18} className="inline-block mr-2" />
            {t('Erreurs')} ({errors.filter(e => !e.resolved).length})
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : activeTab === 'logs' ? (
          /* Logs View */
          <div className="rounded-2xl bg-gray-800/50 border border-white/10 overflow-hidden">
            {logs.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <LucideIcon name="file-text" size={48} className="mx-auto mb-4 opacity-50" />
                <p>{t('Aucun log disponible')}</p>
              </div>
            ) : (
              <div className="max-h-[600px] overflow-y-auto">
                <table className="w-full">
                  <thead className="sticky top-0 bg-gray-800">
                    <tr className="border-b border-white/10">
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase">
                        {t('Date')}
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase">
                        {t('Utilisateur')}
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase">
                        {t('Action')}
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase">
                        {t('Cible')}
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase">
                        {t('Détails')}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {logs.map((log: any) => (
                      <tr key={log.id} className="hover:bg-white/5">
                        <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">
                          {formatTimestamp(log.created_at)}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-300">
                          {log.username || '-'}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${getActionColor(log.action)}`}>
                            {log.action}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-500">
                          {log.target_type} #{log.target_id || '-'}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-300 max-w-xs truncate">
                          {log.target_name || '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        ) : (
          /* Errors View */
          <div className="space-y-4">
            {errors.filter(e => !e.resolved).length === 0 ? (
              <div className="text-center py-16 rounded-2xl bg-gray-800/50 border border-white/10">
                <LucideIcon name="check-circle" size={48} className="mx-auto mb-4 text-green-500 opacity-50" />
                <h3 className="text-lg font-medium text-white mb-2">{t('Aucune erreur')}</h3>
                <p className="text-gray-400">{t('Tout fonctionne correctement !')}</p>
              </div>
            ) : (
              errors.filter(e => !e.resolved).map((error) => (
                <div
                  key={error.id}
                  className="p-6 rounded-2xl bg-gray-800/50 border border-red-500/30"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="px-2 py-0.5 text-xs font-medium bg-red-500/20 text-red-400 rounded-full">
                          {error.error_type}
                        </span>
                        <span className="text-xs text-gray-500">
                          {formatTimestamp(error.created_at)}
                        </span>
                      </div>
                      <p className="text-white font-medium mb-1">{error.message}</p>
                      {error.request_path && (
                        <p className="text-sm text-gray-400">
                          <span className="text-gray-500">Path:</span> {error.request_path}
                        </p>
                      )}
                    </div>
                    <div className="flex gap-2">
                      {error.stack_trace && (
                        <button
                          onClick={() => setSelectedError(error)}
                          className="p-2 rounded-lg bg-gray-700 text-gray-400 hover:text-white transition-colors"
                          title={t('Voir la stack trace')}
                        >
                          <LucideIcon name="code" size={18} />
                        </button>
                      )}
                      <button
                        onClick={() => handleResolveError(error.id)}
                        className="p-2 rounded-lg bg-green-500/10 text-green-400 hover:bg-green-500/20 transition-colors"
                        title={t('Marquer comme résolu')}
                      >
                        <LucideIcon name="check" size={18} />
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Stack Trace Modal */}
        {selectedError && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="w-full max-w-4xl rounded-2xl bg-gray-900 border border-white/10 shadow-2xl max-h-[80vh] overflow-hidden flex flex-col">
              <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
                <h2 className="text-lg font-semibold text-white">{t('Stack Trace')}</h2>
                <button
                  onClick={() => setSelectedError(null)}
                  className="p-2 rounded-lg hover:bg-white/10 text-gray-400"
                >
                  <LucideIcon name="x" size={20} />
                </button>
              </div>
              <div className="p-6 overflow-auto flex-1">
                <pre className="text-sm text-gray-300 font-mono whitespace-pre-wrap bg-gray-800 p-4 rounded-xl overflow-x-auto">
                  {selectedError.stack_trace}
                </pre>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
