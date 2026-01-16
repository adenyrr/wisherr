import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import Layout from '../../../shared/components/Layout';
import LucideIcon from '../../../shared/components/LucideIcon';
import { useToast } from '../../../shared/components/Toast';
import { useConfirm } from '../../../shared/components/ConfirmDialog';
import api from '../../../shared/utils/api';

interface Notification {
  id: number;
  type: string;
  title: string;
  message: string | null;
  icon: string;
  color: string;
  link: string | null;
  target_type: string | null;
  target_id: number | null;
  is_read: boolean;
  created_at: string;
  read_at: string | null;
}

export default function Notifications() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { showSuccess, showError } = useToast();
  const { confirm, ConfirmDialogComponent } = useConfirm();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState<'all' | 'unread'>('all');

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const params = filter === 'unread' ? { unread_only: true } : {};
      const res = await api.get('/notifications', { params });
      setNotifications(res.data);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Erreur lors du chargement');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, [filter]);

  const handleMarkAsRead = async (notifId: number) => {
    try {
      await api.post('/notifications/mark-read', { notification_ids: [notifId] });
      setNotifications(notifications.map(n => 
        n.id === notifId ? { ...n, is_read: true, read_at: new Date().toISOString() } : n
      ));
    } catch (err) {
      console.error('Failed to mark as read:', err);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await api.post('/notifications/mark-all-read');
      setNotifications(notifications.map(n => ({ ...n, is_read: true, read_at: new Date().toISOString() })));
    } catch (err) {
      console.error('Failed to mark all as read:', err);
    }
  };

  const handleDelete = async (notifId: number) => {
    try {
      await api.delete(`/notifications/${notifId}`);
      setNotifications(notifications.filter(n => n.id !== notifId));
    } catch (err) {
      console.error('Failed to delete notification:', err);
    }
  };

  const handleDeleteAll = async () => {
    const confirmed = await confirm(
      t('Supprimer toutes les notifications'),
      t('Êtes-vous sûr de vouloir supprimer toutes les notifications ? Cette action est irréversible.')
    );
    if (!confirmed) return;
    try {
      await api.delete('/notifications');
      setNotifications([]);
      showSuccess(t('Toutes les notifications ont été supprimées'));
    } catch (err) {
      console.error('Failed to delete all notifications:', err);
      showError(t('Erreur lors de la suppression des notifications'));
    }
  };

  const handleClick = async (notif: Notification) => {
    if (!notif.is_read) {
      await handleMarkAsRead(notif.id);
    }
    if (notif.link) {
      navigate(notif.link);
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return t('À l\'instant');
    if (minutes < 60) return t('Il y a {{count}} minute(s)', { count: minutes });
    if (hours < 24) return t('Il y a {{count}} heure(s)', { count: hours });
    if (days < 7) return t('Il y a {{count}} jour(s)', { count: days });
    return date.toLocaleDateString();
  };

  const unreadCount = notifications.filter(n => !n.is_read).length;

  return (
    <Layout>
      <div className="max-w-3xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-white mb-1">
              <LucideIcon name="bell" size={28} className="inline-block mr-3 text-indigo-400" />
              {t('Notifications')}
            </h1>
            <p className="text-gray-400">
              {unreadCount > 0 
                ? t('{{count}} notification(s) non lue(s)', { count: unreadCount })
                : t('Toutes les notifications sont lues')
              }
            </p>
          </div>
          <div className="flex gap-2">
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllAsRead}
                className="px-4 py-2 bg-indigo-500/20 text-indigo-400 rounded-lg hover:bg-indigo-500/30 transition-colors flex items-center gap-2"
              >
                <LucideIcon name="check-check" size={18} />
                <span className="hidden sm:inline">{t('Tout marquer comme lu')}</span>
              </button>
            )}
            {notifications.length > 0 && (
              <button
                onClick={handleDeleteAll}
                className="px-4 py-2 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30 transition-colors flex items-center gap-2"
              >
                <LucideIcon name="trash-2" size={18} />
                <span className="hidden sm:inline">{t('Tout supprimer')}</span>
              </button>
            )}
          </div>
        </div>

        {/* Filters */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded-lg transition-colors ${
              filter === 'all'
                ? 'bg-white/10 text-white'
                : 'text-gray-400 hover:text-white hover:bg-white/5'
            }`}
          >
            {t('Toutes')}
          </button>
          <button
            onClick={() => setFilter('unread')}
            className={`px-4 py-2 rounded-lg transition-colors flex items-center gap-2 ${
              filter === 'unread'
                ? 'bg-white/10 text-white'
                : 'text-gray-400 hover:text-white hover:bg-white/5'
            }`}
          >
            {t('Non lues')}
            {unreadCount > 0 && (
              <span className="px-2 py-0.5 bg-indigo-500 text-white text-xs rounded-full">
                {unreadCount}
              </span>
            )}
          </button>
        </div>

        {/* Loading */}
        {loading && (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 mb-6">
            {error}
          </div>
        )}

        {/* Empty state */}
        {!loading && !error && notifications.length === 0 && (
          <div className="text-center py-12">
            <LucideIcon name="bell-off" size={48} className="mx-auto mb-4 text-gray-600" />
            <p className="text-gray-400">
              {filter === 'unread' ? t('Aucune notification non lue') : t('Aucune notification')}
            </p>
          </div>
        )}

        {/* Notifications list */}
        {!loading && !error && notifications.length > 0 && (
          <div className="space-y-3">
            {notifications.map((notif) => (
              <div
                key={notif.id}
                className={`p-4 rounded-xl border transition-all cursor-pointer group ${
                  notif.is_read
                    ? 'bg-white/5 border-white/10 hover:bg-white/10'
                    : 'bg-indigo-500/10 border-indigo-500/30 hover:bg-indigo-500/20'
                }`}
                onClick={() => handleClick(notif)}
              >
                <div className="flex items-start gap-4">
                  {/* Icon */}
                  <div 
                    className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: `${notif.color}20`, color: notif.color }}
                  >
                    <LucideIcon name={notif.icon as any} size={20} />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className={`font-medium ${notif.is_read ? 'text-gray-300' : 'text-white'}`}>
                        {notif.title}
                      </h3>
                      {!notif.is_read && (
                        <span className="w-2 h-2 bg-indigo-500 rounded-full flex-shrink-0"></span>
                      )}
                    </div>
                    {notif.message && (
                      <p className="text-sm text-gray-400 line-clamp-2">{notif.message}</p>
                    )}
                    <p className="text-xs text-gray-500 mt-2">{formatDate(notif.created_at)}</p>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    {!notif.is_read && (
                      <button
                        onClick={(e) => { e.stopPropagation(); handleMarkAsRead(notif.id); }}
                        className="p-2 rounded-lg bg-green-500/10 text-green-400 hover:bg-green-500/20"
                        title={t('Marquer comme lu')}
                      >
                        <LucideIcon name="check" size={16} />
                      </button>
                    )}
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDelete(notif.id); }}
                      className="p-2 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20"
                      title={t('Supprimer')}
                    >
                      <LucideIcon name="x" size={16} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      <ConfirmDialogComponent />
    </Layout>
  );
}
