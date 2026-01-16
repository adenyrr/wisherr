import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import Layout from '../../../shared/components/Layout';
import LucideIcon from '../../../shared/components/LucideIcon';
import api from '../../../shared/utils/api';

interface SharedList {
  id: number;
  wishlist_id: number;
  wishlist_title: string;
  owner_id: number;
  owner_username: string;
  permission: string;
  item_count?: number;
  occasion?: string;
  event_date?: string;
}

export default function SharedWithMe() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [lists, setLists] = useState<SharedList[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSharedLists();
  }, []);

  const fetchSharedLists = async () => {
    try {
      const res = await api.get('/shares/shared-with-me');
      setLists(res.data || []);
    } catch (err) {
      console.error('Failed to fetch shared lists:', err);
    } finally {
      setLoading(false);
    }
  };

  const getOccasionIcon = (occasion?: string) => {
    switch (occasion) {
      case 'birthday': return 'cake';
      case 'christmas': return 'gift';
      case 'wedding': return 'heart';
      case 'baby': return 'baby';
      default: return 'list';
    }
  };

  const getOccasionLabel = (occasion?: string) => {
    switch (occasion) {
      case 'birthday': return t('Anniversaire');
      case 'christmas': return t('Noël');
      case 'wedding': return t('Mariage');
      case 'baby': return t('Naissance');
      default: return t('Autre');
    }
  };

  const getPermissionBadge = (permission: string) => {
    if (permission === 'editor') {
      return (
        <span className="px-2 py-0.5 text-xs font-medium bg-amber-500/20 text-amber-400 rounded-full">
          {t('Éditeur')}
        </span>
      );
    }
    return (
      <span className="px-2 py-0.5 text-xs font-medium bg-blue-500/20 text-blue-400 rounded-full">
        {t('Lecteur')}
      </span>
    );
  };

  const formatEventDate = (dateStr?: string) => {
    if (!dateStr) return null;
    const date = new Date(dateStr);
    const now = new Date();
    const diff = Math.ceil((date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diff < 0) return null;
    if (diff === 0) return t('Aujourd\'hui');
    if (diff === 1) return t('Demain');
    if (diff <= 7) return `Dans ${diff} jours`;
    return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' });
  };

  return (
    <Layout>
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-white mb-1">
            <LucideIcon name="users" size={28} className="inline-block mr-3 text-emerald-400" />
            {t('Autres listes')}
          </h1>
          <p className="text-gray-400">
            {t('Listes partagées avec vous par vos proches')}
          </p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : lists.length === 0 ? (
          <div className="text-center py-16 rounded-2xl bg-gray-800/50 border border-white/10">
            <LucideIcon name="inbox" size={48} className="mx-auto mb-4 text-gray-500 opacity-50" />
            <h3 className="text-lg font-medium text-white mb-2">{t('Aucune liste partagée')}</h3>
            <p className="text-gray-400 max-w-sm mx-auto">
              {t('Personne n\'a encore partagé de liste avec vous. Demandez à vos proches de partager leurs listes !')}
            </p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {lists.map((list) => (
              <button
                key={list.id}
                onClick={() => navigate(`/wishlists/${list.wishlist_id}`)}
                className="p-6 rounded-2xl bg-gray-800/50 border border-white/10 hover:border-emerald-500/30 transition-all text-left group"
              >
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-emerald-500/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <LucideIcon 
                      name={getOccasionIcon(list.occasion)} 
                      size={24} 
                      className="text-emerald-400" 
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg font-semibold text-white truncate">{list.wishlist_title}</h3>
                    <p className="text-sm text-gray-400 mt-1">
                      {t('Par')} <span className="text-emerald-400">{list.owner_username}</span>
                    </p>
                    <div className="flex items-center flex-wrap gap-2 mt-3">
                      {list.occasion && (
                        <span className="px-2 py-0.5 text-xs font-medium bg-gray-700/50 text-gray-300 rounded-full">
                          {getOccasionLabel(list.occasion)}
                        </span>
                      )}
                      {getPermissionBadge(list.permission)}
                      {list.item_count !== undefined && (
                        <span className="text-xs text-gray-500">
                          {list.item_count} {t('article(s)')}
                        </span>
                      )}
                    </div>
                    {list.event_date && formatEventDate(list.event_date) && (
                      <div className="mt-3 flex items-center gap-2 text-sm text-amber-400">
                        <LucideIcon name="calendar" size={14} />
                        {formatEventDate(list.event_date)}
                      </div>
                    )}
                  </div>
                  <LucideIcon name="chevron-right" size={20} className="text-gray-500 group-hover:text-emerald-400 transition-colors" />
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}
