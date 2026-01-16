import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import Layout from '../../../shared/components/Layout';
import LucideIcon from '../../../shared/components/LucideIcon';
import { useToast } from '../../../shared/components/Toast';
import api from '../../../shared/utils/api';
import { useAuthStore } from '../../../shared/utils/store';

interface Item {
  id: number;
  name: string;
  description?: string;
  url?: string;
  image_url?: string;
  price?: number;
  status?: string;
  reserved_by_name?: string;
}

interface Wishlist {
  id: number;
  owner_id: number;
  title: string;
  description?: string;
  occasion?: string;
  role?: string;
  created_at?: string;
}

export default function WishlistDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const currentUser = useAuthStore((s) => s.currentUser);
  const { showError, showSuccess } = useToast();

  const [wishlist, setWishlist] = useState<Wishlist | null>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [reserving, setReserving] = useState<number | null>(null);

  useEffect(() => {
    if (id) {
      fetchWishlist();
    }
  }, [id]);

  const fetchWishlist = async () => {
    try {
      const [wlRes, itemsRes] = await Promise.all([
        api.get(`/wishlists/${id}`),
        api.get(`/items/wishlist/${id}`)
      ]);
      setWishlist(wlRes.data);
      setItems(itemsRes.data || []);
    } catch (err: any) {
      showError(err.response?.data?.detail || 'Erreur lors du chargement de la liste');
      navigate('/wishlists/shared');
    } finally {
      setLoading(false);
    }
  };

  const handleReserve = async (itemId: number) => {
    setReserving(itemId);
    try {
      await api.post(`/items/${itemId}/reserve`);
      setItems(items.map(i => 
        i.id === itemId 
          ? { ...i, status: 'reserved', reserved_by_name: currentUser?.username }
          : i
      ));
      showSuccess('Article réservé avec succès !');
    } catch (err: any) {
      showError(err.response?.data?.detail || 'Erreur lors de la réservation');
    } finally {
      setReserving(null);
    }
  };

  const handleUnreserve = async (itemId: number) => {
    setReserving(itemId);
    try {
      await api.delete(`/items/${itemId}/reserve`);
      setItems(items.map(i => 
        i.id === itemId 
          ? { ...i, status: 'available', reserved_by_name: undefined }
          : i
      ));
      showSuccess('Réservation annulée !');
    } catch (err: any) {
      showError(err.response?.data?.detail || 'Erreur lors de l\'annulation');
    } finally {
      setReserving(null);
    }
  };

  const isOwner = wishlist?.owner_id === currentUser?.id;

  const getOccasionInfo = (occasion?: string) => {
    const occasions: { [key: string]: { icon: string; color: string; label: string } } = {
      birthday: { icon: 'cake', color: 'text-pink-400', label: 'Anniversaire' },
      christmas: { icon: 'gift', color: 'text-red-400', label: 'Noël' },
      wedding: { icon: 'heart', color: 'text-rose-400', label: 'Mariage' },
      birth: { icon: 'baby', color: 'text-blue-400', label: 'Naissance' },
      other: { icon: 'sparkles', color: 'text-purple-400', label: 'Autre' }
    };
    return occasions[occasion || 'other'] || occasions.other;
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[50vh]">
          <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
        </div>
      </Layout>
    );
  }

  if (!wishlist) {
    return (
      <Layout>
        <div className="text-center py-16">
          <LucideIcon name="alert-circle" size={48} className="mx-auto mb-4 text-gray-500" />
          <h2 className="text-xl font-semibold text-white mb-2">{t('Liste non trouvée')}</h2>
          <button
            onClick={() => navigate('/wishlists/shared')}
            className="text-indigo-400 hover:text-indigo-300"
          >
            {t('Retour aux listes')}
          </button>
        </div>
      </Layout>
    );
  }

  const occasionInfo = getOccasionInfo(wishlist.occasion);

  return (
    <Layout>
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => navigate(isOwner ? '/wishlists/mine' : '/wishlists/shared')}
            className="flex items-center gap-2 text-gray-400 hover:text-white mb-4 transition-colors"
          >
            <LucideIcon name="arrow-left" size={18} />
            {t('Retour')}
          </button>
          
          <div className="flex items-start gap-4">
            <div className={`w-14 h-14 rounded-2xl bg-gray-800/50 flex items-center justify-center`}>
              <LucideIcon name={occasionInfo.icon} size={28} className={occasionInfo.color} />
            </div>
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-white">{wishlist.title}</h1>
              {wishlist.description && (
                <p className="text-gray-400 mt-1">{wishlist.description}</p>
              )}
              <div className="flex items-center gap-3 mt-2">
                <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                  wishlist.role === 'owner' 
                    ? 'bg-indigo-500/20 text-indigo-400'
                    : wishlist.role === 'editor'
                    ? 'bg-amber-500/20 text-amber-400'
                    : 'bg-blue-500/20 text-blue-400'
                }`}>
                  {wishlist.role === 'owner' ? t('Propriétaire') : 
                   wishlist.role === 'editor' ? t('Éditeur') : t('Lecteur')}
                </span>
                <span className="text-sm text-gray-500">
                  {items.length} {t('article(s)')}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Items */}
        {items.length === 0 ? (
          <div className="text-center py-16 rounded-2xl bg-gray-800/50 border border-white/10">
            <LucideIcon name="package" size={48} className="mx-auto mb-4 text-gray-500 opacity-50" />
            <h3 className="text-lg font-medium text-white mb-2">{t('Aucun article')}</h3>
            <p className="text-gray-400">
              {isOwner 
                ? t('Ajoutez des articles à votre liste')
                : t('Cette liste est vide pour le moment')
              }
            </p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {items.map((item) => (
              <div
                key={item.id}
                className={`relative rounded-2xl bg-gray-800/50 border overflow-hidden transition-all ${
                  item.status === 'reserved' || item.status === 'purchased'
                    ? 'border-emerald-500/30 opacity-75'
                    : 'border-white/10 hover:border-indigo-500/30'
                }`}
              >
                {/* Status badge */}
                {item.status === 'reserved' && (
                  <div className="absolute top-3 right-3 z-10 px-2 py-1 rounded-lg bg-emerald-500/20 text-emerald-400 text-xs font-medium">
                    {t('Réservé')} {item.reserved_by_name && `par ${item.reserved_by_name}`}
                  </div>
                )}
                {item.status === 'purchased' && (
                  <div className="absolute top-3 right-3 z-10 px-2 py-1 rounded-lg bg-blue-500/20 text-blue-400 text-xs font-medium">
                    {t('Acheté')}
                  </div>
                )}

                {/* Image */}
                {item.image_url && (
                  <div className="aspect-video bg-gray-900 overflow-hidden">
                    <img 
                      src={item.image_url} 
                      alt={item.name}
                      className="w-full h-full object-contain"
                    />
                  </div>
                )}

                {/* Content */}
                <div className="p-4">
                  <h3 className="font-semibold text-white line-clamp-2">{item.name}</h3>
                  
                  {item.description && (
                    <p className="text-sm text-gray-400 mt-1 line-clamp-2">{item.description}</p>
                  )}

                  {item.price && (
                    <div className="text-lg font-bold text-emerald-400 mt-2">
                      {item.price.toFixed(2)} €
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex items-center gap-2 mt-4">
                    {item.url && (
                      <a
                        href={item.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 px-3 py-1.5 bg-gray-700/50 hover:bg-gray-700 text-gray-300 text-sm rounded-lg transition-colors"
                      >
                        <LucideIcon name="external-link" size={14} />
                        {t('Voir')}
                      </a>
                    )}
                    
                    {/* Reserve button - only for non-owners on available items */}
                    {!isOwner && item.status === 'available' && (
                      <button
                        onClick={() => handleReserve(item.id)}
                        disabled={reserving === item.id}
                        className="flex items-center gap-1 px-3 py-1.5 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 text-sm rounded-lg transition-colors disabled:opacity-50"
                      >
                        {reserving === item.id ? (
                          <div className="w-3 h-3 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <LucideIcon name="check" size={14} />
                        )}
                        {t('Réserver')}
                      </button>
                    )}

                    {/* Cancel reservation - only for the person who reserved */}
                    {item.status === 'reserved' && item.reserved_by_name === currentUser?.username && (
                      <button
                        onClick={() => handleUnreserve(item.id)}
                        disabled={reserving === item.id}
                        className="flex items-center gap-1 px-3 py-1.5 bg-red-500/20 hover:bg-red-500/30 text-red-400 text-sm rounded-lg transition-colors disabled:opacity-50"
                      >
                        {reserving === item.id ? (
                          <div className="w-3 h-3 border-2 border-red-400 border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <LucideIcon name="x" size={14} />
                        )}
                        {t('Annuler')}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}
