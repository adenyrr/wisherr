import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import LucideIcon from '../../../shared/components/LucideIcon';
import Footer from '../../../shared/components/Footer';
import api from '../../../shared/utils/api';

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

interface ShareInfo {
  wishlist_title: string;
  wishlist_description?: string;
  requires_password: boolean;
  occasion?: string;
  event_date?: string;
}

export default function PublicWishlist() {
  const { token } = useParams<{ token: string }>();
  const { t } = useTranslation();

  const [shareInfo, setShareInfo] = useState<ShareInfo | null>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [password, setPassword] = useState('');
  const [savedPassword, setSavedPassword] = useState('');
  const [loading, setLoading] = useState(true);
  const [accessGranted, setAccessGranted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [reserving, setReserving] = useState<number | null>(null);
  
  // Modal states
  const [reserveModal, setReserveModal] = useState<{ open: boolean; itemId: number | null; itemName: string }>({
    open: false,
    itemId: null,
    itemName: ''
  });
  const [visitorName, setVisitorName] = useState('');
  const [reserveError, setReserveError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    if (token) {
      fetchShareInfo();
    }
  }, [token]);

  // Auto-hide success message
  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => setSuccessMessage(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [successMessage]);

  const fetchShareInfo = async () => {
    try {
      const res = await api.get(`/shares/external/${token}`);
      setShareInfo(res.data);
      
      // Si pas de mot de passe requis, accéder directement (ne devrait plus arriver)
      if (!res.data.requires_password) {
        await accessShare('');
      }
    } catch (err: any) {
      setError(err.response?.data?.detail || t('Lien de partage invalide ou expiré'));
    } finally {
      setLoading(false);
    }
  };

  const accessShare = async (pwd: string) => {
    setPasswordError(null);
    try {
      const res = await api.post(`/shares/external/${token}/access`, { password: pwd || null });
      if (res.data.valid) {
        setItems(res.data.items || []);
        setAccessGranted(true);
        setSavedPassword(pwd);
      }
    } catch (err: any) {
      setPasswordError(err.response?.data?.detail || t('Mot de passe incorrect'));
    }
  };

  const handleSubmitPassword = (e: React.FormEvent) => {
    e.preventDefault();
    accessShare(password);
  };

  const openReserveModal = (itemId: number, itemName: string) => {
    setReserveModal({ open: true, itemId, itemName });
    setVisitorName('');
    setReserveError(null);
  };

  const closeReserveModal = () => {
    setReserveModal({ open: false, itemId: null, itemName: '' });
    setVisitorName('');
    setReserveError(null);
  };

  const handleReserve = async () => {
    if (!visitorName.trim() || visitorName.trim().length < 2) {
      setReserveError(t('Veuillez entrer votre nom (minimum 2 caractères)'));
      return;
    }

    const itemId = reserveModal.itemId;
    if (!itemId) return;

    setReserving(itemId);
    setReserveError(null);

    try {
      await api.post(`/shares/external/${token}/reserve/${itemId}`, {
        password: savedPassword,
        visitor_name: visitorName.trim()
      });
      
      setItems(items.map(i => 
        i.id === itemId 
          ? { ...i, status: 'reserved', reserved_by_name: visitorName.trim() }
          : i
      ));
      
      setSuccessMessage(t('Article réservé avec succès !'));
      closeReserveModal();
    } catch (err: any) {
      setReserveError(err.response?.data?.detail || t('Erreur lors de la réservation'));
    } finally {
      setReserving(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-900 to-gray-800 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-900 to-gray-800 flex flex-col">
        <div className="flex-1 flex items-center justify-center p-4">
          <div className="bg-gray-800/50 backdrop-blur-xl rounded-2xl p-8 max-w-md w-full text-center border border-white/10">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-500/20 flex items-center justify-center">
              <LucideIcon name="alert-circle" size={32} className="text-red-400" />
            </div>
            <h1 className="text-2xl font-bold text-white mb-2">{t('Lien invalide')}</h1>
            <p className="text-gray-400">{error}</p>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  if (!accessGranted && shareInfo?.requires_password) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-900 to-gray-800 flex flex-col">
        <div className="flex-1 flex items-center justify-center p-4">
          <div className="bg-gray-800/50 backdrop-blur-xl rounded-2xl p-8 max-w-md w-full border border-white/10">
            <div className="text-center mb-6">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-purple-500/30 to-pink-500/30 flex items-center justify-center">
                <LucideIcon name="gift" size={32} className="text-purple-400" />
              </div>
              <h1 className="text-2xl font-bold text-white mb-2">{shareInfo.wishlist_title}</h1>
              {shareInfo.wishlist_description && (
                <p className="text-gray-400 text-sm">{shareInfo.wishlist_description}</p>
              )}
              {shareInfo.occasion && (
                <span className="inline-block mt-3 px-3 py-1 bg-purple-500/20 text-purple-300 rounded-full text-sm">
                  {shareInfo.occasion}
                </span>
              )}
            </div>

            <form onSubmit={handleSubmitPassword} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  <LucideIcon name="lock" size={16} className="inline mr-2" />
                  {t('Mot de passe requis')}
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={t('Entrez le mot de passe')}
                  className="w-full px-4 py-3 bg-gray-700/50 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-all"
                  autoFocus
                />
                {passwordError && (
                  <div className="mt-2 flex items-center gap-2 text-sm text-red-400">
                    <LucideIcon name="alert-circle" size={14} />
                    <span>{passwordError}</span>
                  </div>
                )}
              </div>
              <button
                type="submit"
                className="w-full py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-medium rounded-xl transition-all shadow-lg shadow-purple-500/25"
              >
                {t('Accéder à la liste')}
              </button>
            </form>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-900 to-gray-800 flex flex-col">
      <div className="flex-1 p-4 md:p-8">
        <div className="max-w-4xl mx-auto">
          {/* Success Message Toast */}
          {successMessage && (
            <div className="fixed top-4 right-4 z-50 animate-slide-in">
              <div className="bg-green-500/20 backdrop-blur-xl border border-green-500/30 text-green-300 px-4 py-3 rounded-xl flex items-center gap-3 shadow-lg">
                <LucideIcon name="check-circle" size={20} />
                <span>{successMessage}</span>
                <button onClick={() => setSuccessMessage(null)} className="ml-2 hover:text-white">
                  <LucideIcon name="x" size={16} />
                </button>
              </div>
            </div>
          )}

          {/* Header */}
          <div className="bg-gray-800/50 backdrop-blur-xl rounded-2xl p-6 mb-6 border border-white/10">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center shadow-lg shadow-purple-500/25">
                <LucideIcon name="gift" size={28} className="text-white" />
              </div>
              <div className="flex-1">
                <h1 className="text-2xl font-bold text-white">{shareInfo?.wishlist_title}</h1>
                {shareInfo?.wishlist_description && (
                  <p className="text-gray-400 mt-1">{shareInfo.wishlist_description}</p>
                )}
              </div>
            </div>
            {(shareInfo?.occasion || shareInfo?.event_date) && (
              <div className="mt-4 flex items-center gap-3 flex-wrap">
                {shareInfo.occasion && (
                  <span className="px-3 py-1 bg-purple-500/20 text-purple-300 rounded-full text-sm">
                    {shareInfo.occasion}
                  </span>
                )}
                {shareInfo.event_date && (
                  <span className="flex items-center gap-2 text-gray-400 text-sm">
                    <LucideIcon name="calendar" size={14} />
                    {new Date(shareInfo.event_date).toLocaleDateString('fr-FR', { 
                      day: 'numeric', month: 'long', year: 'numeric' 
                    })}
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Items */}
          <div className="grid gap-4 md:grid-cols-2">
            {items.length === 0 ? (
              <div className="col-span-full bg-gray-800/30 backdrop-blur rounded-2xl p-12 text-center border border-white/5">
                <LucideIcon name="package" size={48} className="mx-auto mb-4 text-gray-600" />
                <p className="text-gray-400">{t('Cette liste ne contient aucun article')}</p>
              </div>
            ) : (
              items.map(item => (
                <div 
                  key={item.id} 
                  className={`bg-gray-800/50 backdrop-blur-xl rounded-2xl p-4 border transition-all ${
                    item.status === 'reserved' || item.status === 'purchased'
                      ? 'border-white/5 opacity-70'
                      : 'border-white/10 hover:border-purple-500/30 hover:shadow-lg hover:shadow-purple-500/5'
                  }`}
                >
                  <div className="flex gap-4">
                    {item.image_url ? (
                      <img 
                        src={item.image_url} 
                        alt={item.name}
                        className="w-24 h-24 object-cover rounded-xl flex-shrink-0"
                      />
                    ) : (
                      <div className="w-24 h-24 bg-gray-700/50 rounded-xl flex items-center justify-center flex-shrink-0">
                        <LucideIcon name="package" size={28} className="text-gray-500" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-white truncate">{item.name}</h3>
                      {item.description && (
                        <p className="text-sm text-gray-400 line-clamp-2 mt-1">{item.description}</p>
                      )}
                      {item.price != null && (
                        <p className="text-sm text-purple-400 font-semibold mt-2">{item.price.toFixed(2)} €</p>
                      )}
                      
                      {/* Status & Actions */}
                      <div className="mt-3">
                        {item.status === 'reserved' ? (
                          <div className="flex items-center gap-2 text-sm text-amber-400 bg-amber-500/10 px-3 py-1.5 rounded-lg inline-flex">
                            <LucideIcon name="check-circle" size={16} />
                            <span>{t('Réservé par')} {item.reserved_by_name}</span>
                          </div>
                        ) : item.status === 'purchased' ? (
                          <div className="flex items-center gap-2 text-sm text-green-400 bg-green-500/10 px-3 py-1.5 rounded-lg inline-flex">
                            <LucideIcon name="shopping-bag" size={16} />
                            <span>{t('Acheté')}</span>
                          </div>
                        ) : (
                          <div className="flex gap-2 flex-wrap">
                            {item.url && (
                              <a
                                href={item.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-700/50 hover:bg-gray-600/50 text-white text-sm rounded-lg transition-colors border border-white/10"
                              >
                                <LucideIcon name="external-link" size={14} />
                                {t('Voir')}
                              </a>
                            )}
                            <button
                              onClick={() => openReserveModal(item.id, item.name)}
                              disabled={reserving === item.id}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white text-sm rounded-lg transition-all disabled:opacity-50 shadow-md shadow-purple-500/20"
                            >
                              {reserving === item.id ? (
                                <div className="animate-spin h-4 w-4 border-2 border-white/30 border-t-white rounded-full" />
                              ) : (
                                <>
                                  <LucideIcon name="heart" size={14} />
                                  {t('Réserver')}
                                </>
                              )}
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <Footer />

      {/* Reserve Modal */}
      {reserveModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={closeReserveModal} />
          <div className="relative bg-gray-800 rounded-2xl p-6 w-full max-w-md border border-white/10 shadow-2xl">
            <button
              onClick={closeReserveModal}
              className="absolute top-4 right-4 p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
            >
              <LucideIcon name="x" size={20} />
            </button>

            <div className="text-center mb-6">
              <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-purple-500/20 flex items-center justify-center">
                <LucideIcon name="heart" size={24} className="text-purple-400" />
              </div>
              <h2 className="text-xl font-bold text-white">{t('Réserver cet article')}</h2>
              <p className="text-gray-400 mt-1 text-sm">{reserveModal.itemName}</p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  {t('Votre nom')}
                </label>
                <input
                  type="text"
                  value={visitorName}
                  onChange={(e) => setVisitorName(e.target.value)}
                  placeholder={t('Entrez votre nom ou pseudo')}
                  className="w-full px-4 py-3 bg-gray-700/50 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-all"
                  autoFocus
                  onKeyDown={(e) => e.key === 'Enter' && handleReserve()}
                />
                <p className="text-xs text-gray-500 mt-2">
                  {t('Ce nom sera visible par le propriétaire de la liste')}
                </p>
              </div>

              {reserveError && (
                <div className="flex items-center gap-2 text-sm text-red-400 bg-red-500/10 px-3 py-2 rounded-lg">
                  <LucideIcon name="alert-circle" size={16} />
                  <span>{reserveError}</span>
                </div>
              )}

              <div className="flex gap-3">
                <button
                  onClick={closeReserveModal}
                  className="flex-1 py-3 bg-gray-700/50 hover:bg-gray-600/50 text-white font-medium rounded-xl transition-colors border border-white/10"
                >
                  {t('Annuler')}
                </button>
                <button
                  onClick={handleReserve}
                  disabled={reserving !== null}
                  className="flex-1 py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-medium rounded-xl transition-all disabled:opacity-50 shadow-lg shadow-purple-500/25"
                >
                  {reserving !== null ? (
                    <div className="flex items-center justify-center gap-2">
                      <div className="animate-spin h-4 w-4 border-2 border-white/30 border-t-white rounded-full" />
                      <span>{t('Réservation...')}</span>
                    </div>
                  ) : (
                    t('Confirmer')
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
