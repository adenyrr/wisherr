import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import Layout from '../../../shared/components/Layout';
import LucideIcon from '../../../shared/components/LucideIcon';
import { useAuthStore } from '../../../shared/utils/store';
import api from '../../../shared/utils/api';

interface Activity {
  id: number;
  action_type: string;
  action_label: string;
  target_type: string;
  target_id: number;
  target_name: string;
  wishlist_id: number | null;
  wishlist_title: string | null;
  created_at: string;
  user_id: number | null;
  username: string | null;
  icon: string;
  color: string;
}

interface QuickStats {
  totalLists: number;
  totalItems: number;
  sharedWithMe: number;
  myGroups: number;
}

export default function Dashboard() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const currentUser = useAuthStore((s) => s.currentUser);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [stats, setStats] = useState<QuickStats>({
    totalLists: 0,
    totalItems: 0,
    sharedWithMe: 0,
    myGroups: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const [activitiesRes, wishlistsRes, groupsRes, sharesRes] = await Promise.all([
        api.get('/activities/feed?limit=10').catch(() => ({ data: [] })),
        api.get('/wishlists/mine').catch(() => ({ data: [] })),
        api.get('/groups').catch(() => ({ data: [] })),
        api.get('/shares/shared-with-me').catch(() => ({ data: [] }))
      ]);

      setActivities(activitiesRes.data || []);
      
      const lists = wishlistsRes.data || [];
      const totalItems = lists.reduce((sum: number, w: any) => sum + (w.item_count || 0), 0);
      
      setStats({
        totalLists: lists.length,
        totalItems,
        sharedWithMe: (sharesRes.data || []).length,
        myGroups: (groupsRes.data || []).length
      });
    } catch (err) {
      console.error('Dashboard error:', err);
    } finally {
      setLoading(false);
    }
  };

  const getActionIcon = (activity: Activity) => {
    return activity.icon || 'activity';
  };

  const getActionColor = (activity: Activity) => {
    const colorMap: Record<string, string> = {
      green: 'text-green-400',
      blue: 'text-blue-400',
      orange: 'text-amber-400',
      red: 'text-red-400',
      purple: 'text-purple-400',
      gray: 'text-gray-400'
    };
    return colorMap[activity.color] || 'text-gray-400';
  };

  const formatActivityMessage = (activity: Activity) => {
    const actor = activity.user_id === currentUser?.id ? 'Vous avez' : `${activity.username || 'Quelqu\'un'} a`;
    const targetName = activity.target_name || activity.wishlist_title || '';
    
    switch (activity.action_type) {
      case 'list_created':
        return `${actor} créé la liste « ${targetName} »`;
      case 'list_updated':
        return `${actor} modifié la liste « ${targetName} »`;
      case 'list_deleted':
        return `${actor} supprimé la liste « ${targetName} »`;
      case 'item_added':
        return `${actor} ajouté « ${targetName} »`;
      case 'item_updated':
        return `${actor} modifié « ${targetName} »`;
      case 'item_deleted':
        return `${actor} supprimé « ${targetName} »`;
      case 'item_reserved':
        return `${actor} réservé « ${targetName} »`;
      case 'item_purchased':
        return `${actor} marqué « ${targetName} » comme acheté`;
      case 'group_created':
        return `${actor} créé le groupe « ${targetName} »`;
      case 'group_deleted':
        return `${actor} supprimé le groupe « ${targetName} »`;
      case 'member_added':
        return `${actor} ajouté un membre au groupe « ${targetName} »`;
      case 'member_removed':
        return `${actor} retiré un membre du groupe « ${targetName} »`;
      case 'list_shared':
        return `${actor} partagé « ${targetName} »`;
      case 'list_shared_external':
        return `${actor} créé un lien de partage pour « ${targetName} »`;
      case 'user_login':
        return `${actor} connecté`;
      case 'login_failed':
        return `Tentative de connexion échouée pour ${targetName}`;
      case 'user_registered':
        return `${actor} créé son compte`;
      default:
        return activity.action_label || `${actor} ${activity.action_type.replace(/_/g, ' ')}`;
    }
  };

  const formatTimeAgo = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diff < 60) return 'À l\'instant';
    if (diff < 3600) return `Il y a ${Math.floor(diff / 60)} min`;
    if (diff < 86400) return `Il y a ${Math.floor(diff / 3600)} h`;
    if (diff < 604800) return `Il y a ${Math.floor(diff / 86400)} j`;
    return date.toLocaleDateString('fr-FR');
  };

  return (
    <Layout>
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">
            {t('Bonjour')}, {currentUser?.username || 'Utilisateur'} 👋
          </h1>
          <p className="text-gray-400">
            {t('Voici un aperçu de votre activité récente')}
          </p>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <button
            onClick={() => navigate('/wishlists/mine')}
            className="p-6 rounded-2xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 border border-indigo-500/30 hover:border-indigo-400/50 transition-all group"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-indigo-500/30 flex items-center justify-center group-hover:scale-110 transition-transform">
                <LucideIcon name="list" size={24} className="text-indigo-400" />
              </div>
              <div className="text-left">
                <p className="text-2xl font-bold text-white">{stats.totalLists}</p>
                <p className="text-sm text-gray-400">{t('Mes listes')}</p>
              </div>
            </div>
          </button>

          <button
            onClick={() => navigate('/wishlists/mine')}
            className="p-6 rounded-2xl bg-gradient-to-br from-blue-500/20 to-cyan-500/20 border border-blue-500/30 hover:border-blue-400/50 transition-all group"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-blue-500/30 flex items-center justify-center group-hover:scale-110 transition-transform">
                <LucideIcon name="gift" size={24} className="text-blue-400" />
              </div>
              <div className="text-left">
                <p className="text-2xl font-bold text-white">{stats.totalItems}</p>
                <p className="text-sm text-gray-400">{t('Articles')}</p>
              </div>
            </div>
          </button>

          <button
            onClick={() => navigate('/wishlists/shared')}
            className="p-6 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-teal-500/20 border border-emerald-500/30 hover:border-emerald-400/50 transition-all group"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-emerald-500/30 flex items-center justify-center group-hover:scale-110 transition-transform">
                <LucideIcon name="share-2" size={24} className="text-emerald-400" />
              </div>
              <div className="text-left">
                <p className="text-2xl font-bold text-white">{stats.sharedWithMe}</p>
                <p className="text-sm text-gray-400">{t('Partagées')}</p>
              </div>
            </div>
          </button>

          <button
            onClick={() => navigate('/groups')}
            className="p-6 rounded-2xl bg-gradient-to-br from-purple-500/20 to-pink-500/20 border border-purple-500/30 hover:border-purple-400/50 transition-all group"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-purple-500/30 flex items-center justify-center group-hover:scale-110 transition-transform">
                <LucideIcon name="users" size={24} className="text-purple-400" />
              </div>
              <div className="text-left">
                <p className="text-2xl font-bold text-white">{stats.myGroups}</p>
                <p className="text-sm text-gray-400">{t('Groupes')}</p>
              </div>
            </div>
          </button>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Activity Feed */}
          <div className="lg:col-span-2">
            <div className="rounded-2xl bg-gray-800/50 border border-white/10 overflow-hidden">
              <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                  <LucideIcon name="activity" size={20} className="text-indigo-400" />
                  {t('Activité récente')}
                </h2>
              </div>
              <div className="p-4">
                {loading ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                  </div>
                ) : activities.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    <LucideIcon name="inbox" size={48} className="mx-auto mb-4 opacity-50" />
                    <p>{t('Aucune activité récente')}</p>
                    <button
                      onClick={() => navigate('/wishlists/mine')}
                      className="mt-4 px-4 py-2 bg-indigo-500/20 text-indigo-400 rounded-lg hover:bg-indigo-500/30 transition-colors"
                    >
                      {t('Créer une liste')}
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {activities.map((activity) => (
                      <div
                        key={activity.id}
                        className="flex items-start gap-4 p-3 rounded-xl hover:bg-white/5 transition-colors"
                      >
                        <div className={`w-10 h-10 rounded-xl bg-gray-700/50 flex items-center justify-center ${getActionColor(activity)}`}>
                          <LucideIcon name={getActionIcon(activity)} size={20} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-gray-300">
                            {formatActivityMessage(activity)}
                          </p>
                          <p className="text-xs text-gray-500 mt-1">
                            {formatTimeAgo(activity.created_at)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="space-y-4">
            <div className="rounded-2xl bg-gray-800/50 border border-white/10 overflow-hidden">
              <div className="px-6 py-4 border-b border-white/10">
                <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                  <LucideIcon name="zap" size={20} className="text-amber-400" />
                  {t('Actions rapides')}
                </h2>
              </div>
              <div className="p-4 space-y-2">
                <button
                  onClick={() => navigate('/wishlists/mine')}
                  className="w-full flex items-center gap-3 p-3 rounded-xl bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/20 transition-colors"
                >
                  <LucideIcon name="plus" size={20} />
                  <span>{t('Nouvelle liste')}</span>
                </button>
                <button
                  onClick={() => navigate('/groups')}
                  className="w-full flex items-center gap-3 p-3 rounded-xl bg-purple-500/10 text-purple-400 hover:bg-purple-500/20 transition-colors"
                >
                  <LucideIcon name="users" size={20} />
                  <span>{t('Créer un groupe')}</span>
                </button>
                <button
                  onClick={() => navigate('/shares')}
                  className="w-full flex items-center gap-3 p-3 rounded-xl bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 transition-colors"
                >
                  <LucideIcon name="share-2" size={20} />
                  <span>{t('Gérer les partages')}</span>
                </button>
              </div>
            </div>

            {/* Tips */}
            <div className="rounded-2xl bg-gradient-to-br from-indigo-500/10 to-purple-500/10 border border-indigo-500/20 p-6">
              <h3 className="font-semibold text-white mb-2 flex items-center gap-2">
                <LucideIcon name="lightbulb" size={18} className="text-amber-400" />
                {t('Astuce')}
              </h3>
              <p className="text-sm text-gray-400">
                {t('Ajoutez des articles via URL pour récupérer automatiquement les informations du produit (image, prix, description).')}
              </p>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
