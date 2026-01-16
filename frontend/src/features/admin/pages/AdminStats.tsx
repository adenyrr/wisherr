import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import Layout from '../../../shared/components/Layout';
import LucideIcon from '../../../shared/components/LucideIcon';
import api from '../../../shared/utils/api';

interface Stats {
  total_users: number;
  total_wishlists: number;
  total_items: number;
  total_reservations: number;
  total_groups: number;
  total_shares: number;
  active_users_7d: number;
  new_users_30d: number;
  items_per_wishlist_avg: number;
}

export default function AdminStats() {
  const { t } = useTranslation();
  const [stats, setStats] = useState<Stats | null>(null);
  const [health, setHealth] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [statsRes, healthRes] = await Promise.all([
        api.get('/admin/stats'),
        api.get('/admin/health')
      ]);
      setStats(statsRes.data);
      setHealth(healthRes.data);
    } catch (err) {
      console.error('Failed to fetch stats:', err);
    } finally {
      setLoading(false);
    }
  };

  const StatCard = ({ 
    icon, 
    label, 
    value, 
    color 
  }: { 
    icon: string; 
    label: string; 
    value: number | string; 
    color: string;
  }) => (
    <div className="p-6 rounded-2xl bg-gray-800/50 border border-white/10">
      <div className="flex items-center gap-4">
        <div className={`w-12 h-12 rounded-xl ${color} flex items-center justify-center`}>
          <LucideIcon name={icon as any} size={24} className="text-white" />
        </div>
        <div>
          <p className="text-2xl font-bold text-white">{value}</p>
          <p className="text-sm text-gray-400">{label}</p>
        </div>
      </div>
    </div>
  );

  return (
    <Layout>
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-white mb-1">
              <LucideIcon name="bar-chart-3" size={28} className="inline-block mr-3 text-amber-400" />
              {t('Statistiques')}
            </h1>
            <p className="text-gray-400">
              {t('Vue d\'ensemble de l\'activité du site')}
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

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <>
            {/* Main Stats Grid */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              <StatCard 
                icon="users" 
                label={t('Utilisateurs')} 
                value={stats?.total_users || 0}
                color="bg-blue-500"
              />
              <StatCard 
                icon="list" 
                label={t('Listes')} 
                value={stats?.total_wishlists || 0}
                color="bg-indigo-500"
              />
              <StatCard 
                icon="gift" 
                label={t('Articles')} 
                value={stats?.total_items || 0}
                color="bg-purple-500"
              />
              <StatCard 
                icon="bookmark" 
                label={t('Réservations')} 
                value={stats?.total_reservations || 0}
                color="bg-pink-500"
              />
            </div>

            {/* Secondary Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              <StatCard 
                icon="users" 
                label={t('Groupes')} 
                value={stats?.total_groups || 0}
                color="bg-emerald-500"
              />
              <StatCard 
                icon="share-2" 
                label={t('Partages')} 
                value={stats?.total_shares || 0}
                color="bg-cyan-500"
              />
              <StatCard 
                icon="activity" 
                label={t('Actifs (7j)')} 
                value={stats?.active_users_7d || 0}
                color="bg-amber-500"
              />
              <StatCard 
                icon="user-plus" 
                label={t('Nouveaux (30j)')} 
                value={stats?.new_users_30d || 0}
                color="bg-green-500"
              />
            </div>

            {/* Health Status */}
            {health && (
              <div className="rounded-2xl bg-gray-800/50 border border-white/10 overflow-hidden">
                <div className="px-6 py-4 border-b border-white/10">
                  <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                    <LucideIcon name="activity" size={20} className="text-green-400" />
                    {t('État du système')}
                  </h2>
                </div>
                <div className="p-6">
                  <div className="grid md:grid-cols-3 gap-6">
                    {/* API Status */}
                    <div className="flex items-center gap-4">
                      <div className={`w-4 h-4 rounded-full ${health.status === 'healthy' ? 'bg-green-500' : 'bg-red-500'} animate-pulse`} />
                      <div>
                        <p className="text-white font-medium">API</p>
                        <p className="text-sm text-gray-400">{health.status}</p>
                      </div>
                    </div>

                    {/* Database Status */}
                    <div className="flex items-center gap-4">
                      <div className={`w-4 h-4 rounded-full ${health.database?.ok ? 'bg-green-500' : 'bg-red-500'} animate-pulse`} />
                      <div>
                        <p className="text-white font-medium">Base de données</p>
                        <p className="text-sm text-gray-400">
                          {health.database?.ok ? `${health.database.latency_ms || Math.round((health.database.latency_seconds || 0) * 1000)}ms` : (health.database?.error || 'Déconnectée')}
                        </p>
                      </div>
                    </div>

                    {/* Redis Status */}
                    <div className="flex items-center gap-4">
                      <div className={`w-4 h-4 rounded-full ${health.cache?.ok ? 'bg-green-500' : 'bg-yellow-500'} animate-pulse`} />
                      <div>
                        <p className="text-white font-medium">Cache (Redis)</p>
                        <p className="text-sm text-gray-400">
                          {health.cache?.ok ? `${health.cache.latency_ms || Math.round((health.cache.latency_seconds || 0) * 1000)}ms` : (health.cache?.configured === false ? 'Non configuré' : 'Déconnecté')}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Uptime */}
                  {health.uptime_seconds && (
                    <div className="mt-6 pt-6 border-t border-white/10">
                      <p className="text-sm text-gray-400">
                        {t('Temps de fonctionnement')}: {Math.floor(health.uptime_seconds / 3600)}h {Math.floor((health.uptime_seconds % 3600) / 60)}m
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </Layout>
  );
}
