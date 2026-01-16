import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import Layout from '../../../shared/components/Layout';
import LucideIcon from '../../../shared/components/LucideIcon';
import { useToast } from '../../../shared/components/Toast';
import { useConfirm } from '../../../shared/components/ConfirmDialog';
import api from '../../../shared/utils/api';

interface Share {
  id: number;
  wishlist_id: number;
  wishlist_title: string;
  share_type: 'internal' | 'external';
  shared_with_user_id?: number;
  shared_with_group_id?: number;
  permission?: string;
  external_token?: string;
  has_password: boolean;
  expires_at?: string;
  created_at: string;
  shared_with_username?: string;
  shared_with_group_name?: string;
}

interface SharedWithMeItem {
  id: number;
  wishlist_id: number;
  wishlist_title: string;
  owner_username: string;
  permission: string;
  created_at: string;
}

export default function Shares() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { showSuccess, showError } = useToast();
  const { confirm, ConfirmDialogComponent } = useConfirm();
  const [activeTab, setActiveTab] = useState<'mine' | 'shared'>('mine');
  const [myShares, setMyShares] = useState<Share[]>([]);
  const [sharedWithMe, setSharedWithMe] = useState<SharedWithMeItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);

  useEffect(() => {
    fetchShares();
  }, []);

  const fetchShares = async () => {
    try {
      const [myRes, sharedRes] = await Promise.all([
        api.get('/shares'),
        api.get('/shares/shared-with-me')
      ]);
      setMyShares(myRes.data || []);
      setSharedWithMe(sharedRes.data || []);
    } catch (err) {
      console.error('Failed to fetch shares:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteShare = async (shareId: number) => {
    const confirmed = await confirm(
      t('Supprimer le partage'),
      t('Êtes-vous sûr de vouloir supprimer ce partage ? Les personnes ayant ce lien ne pourront plus accéder à votre liste.')
    );
    if (!confirmed) return;
    try {
      await api.delete(`/shares/${shareId}`);
      showSuccess(t('Partage supprimé avec succès'));
      fetchShares();
    } catch (err: any) {
      showError(err.response?.data?.detail || t('Erreur lors de la suppression'));
    }
  };

  const copyExternalLink = (token: string) => {
    const link = `${window.location.origin}/shared/${token}`;
    navigator.clipboard.writeText(link);
    setCopiedToken(token);
    setTimeout(() => setCopiedToken(null), 2000);
  };

  const shareViaSocial = (token: string, platform: string) => {
    const link = encodeURIComponent(`${window.location.origin}/shared/${token}`);
    const text = encodeURIComponent('Découvre ma liste de souhaits sur Wisherr !');
    
    let url = '';
    switch (platform) {
      case 'whatsapp':
        url = `https://wa.me/?text=${text}%20${link}`;
        break;
      case 'messenger':
        url = `https://www.facebook.com/dialog/send?link=${link}&app_id=123456789`;
        break;
      case 'email':
        url = `mailto:?subject=${text}&body=${decodeURIComponent(link)}`;
        break;
      case 'facebook':
        url = `https://www.facebook.com/sharer/sharer.php?u=${link}`;
        break;
      case 'twitter':
        url = `https://twitter.com/intent/tweet?text=${text}&url=${link}`;
        break;
    }
    window.open(url, '_blank');
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

  return (
    <Layout>
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-white mb-1">
            <LucideIcon name="share-2" size={28} className="inline-block mr-3 text-emerald-400" />
            {t('Gestion des partages')}
          </h1>
          <p className="text-gray-400">
            {t('Gérez les partages de vos listes et accédez aux listes partagées avec vous')}
          </p>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setActiveTab('mine')}
            className={`px-4 py-2 rounded-xl font-medium transition-colors ${
              activeTab === 'mine'
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                : 'text-gray-400 hover:text-white hover:bg-white/5'
            }`}
          >
            {t('Mes partages')} ({myShares.length})
          </button>
          <button
            onClick={() => setActiveTab('shared')}
            className={`px-4 py-2 rounded-xl font-medium transition-colors ${
              activeTab === 'shared'
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                : 'text-gray-400 hover:text-white hover:bg-white/5'
            }`}
          >
            {t('Partagées avec moi')} ({sharedWithMe.length})
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : activeTab === 'mine' ? (
          /* My Shares */
          myShares.length === 0 ? (
            <div className="text-center py-16 rounded-2xl bg-gray-800/50 border border-white/10">
              <LucideIcon name="share-2" size={48} className="mx-auto mb-4 text-gray-500 opacity-50" />
              <h3 className="text-lg font-medium text-white mb-2">{t('Aucun partage')}</h3>
              <p className="text-gray-400 mb-6">
                {t('Vous n\'avez pas encore partagé de liste')}
              </p>
              <button
                onClick={() => navigate('/wishlists/mine')}
                className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-500/20 text-emerald-400 rounded-lg hover:bg-emerald-500/30 transition-colors"
              >
                <LucideIcon name="list" size={18} />
                <span>{t('Aller aux listes')}</span>
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {myShares.map((share) => (
                <div
                  key={share.id}
                  className="p-6 rounded-2xl bg-gray-800/50 border border-white/10 hover:border-emerald-500/30 transition-all"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="text-lg font-semibold text-white mb-1">{share.wishlist_title}</h3>
                      <div className="flex items-center gap-3 text-sm">
                        {share.share_type === 'internal' ? (
                          <>
                            <span className="px-2 py-0.5 text-xs font-medium bg-indigo-500/20 text-indigo-400 rounded-full">
                              {t('Interne')}
                            </span>
                            {share.shared_with_username && (
                              <span className="text-gray-400">
                                → {share.shared_with_username}
                              </span>
                            )}
                            {share.shared_with_group_name && (
                              <span className="text-gray-400">
                                → Groupe: {share.shared_with_group_name}
                              </span>
                            )}
                            {share.permission && getPermissionBadge(share.permission)}
                          </>
                        ) : (
                          <>
                            <span className="px-2 py-0.5 text-xs font-medium bg-cyan-500/20 text-cyan-400 rounded-full">
                              {t('Externe')}
                            </span>
                            {share.has_password && (
                              <span className="flex items-center gap-1 text-gray-400">
                                <LucideIcon name="lock" size={12} />
                                {t('Protégé')}
                              </span>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => handleDeleteShare(share.id)}
                      className="p-2 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors"
                    >
                      <LucideIcon name="trash-2" size={18} />
                    </button>
                  </div>

                  {/* External share actions */}
                  {share.share_type === 'external' && share.external_token && (
                    <div className="mt-4 pt-4 border-t border-white/10">
                      <div className="flex flex-wrap gap-2">
                        <button
                          onClick={() => copyExternalLink(share.external_token!)}
                          className="flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-700/50 text-gray-300 hover:bg-gray-700 transition-colors text-sm"
                        >
                          <LucideIcon name={copiedToken === share.external_token ? 'check' : 'copy'} size={16} />
                          {copiedToken === share.external_token ? t('Copié !') : t('Copier le lien')}
                        </button>
                        <button
                          onClick={() => shareViaSocial(share.external_token!, 'whatsapp')}
                          className="flex items-center gap-2 px-3 py-2 rounded-lg bg-green-500/20 text-green-400 hover:bg-green-500/30 transition-colors text-sm"
                        >
                          <LucideIcon name="message-circle" size={16} />
                          WhatsApp
                        </button>
                        <button
                          onClick={() => shareViaSocial(share.external_token!, 'email')}
                          className="flex items-center gap-2 px-3 py-2 rounded-lg bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 transition-colors text-sm"
                        >
                          <LucideIcon name="mail" size={16} />
                          Email
                        </button>
                        <button
                          onClick={() => shareViaSocial(share.external_token!, 'facebook')}
                          className="flex items-center gap-2 px-3 py-2 rounded-lg bg-blue-600/20 text-blue-400 hover:bg-blue-600/30 transition-colors text-sm"
                        >
                          <LucideIcon name="facebook" size={16} />
                          Facebook
                        </button>
                        <button
                          onClick={() => shareViaSocial(share.external_token!, 'twitter')}
                          className="flex items-center gap-2 px-3 py-2 rounded-lg bg-sky-500/20 text-sky-400 hover:bg-sky-500/30 transition-colors text-sm"
                        >
                          <LucideIcon name="twitter" size={16} />
                          Twitter
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )
        ) : (
          /* Shared With Me */
          sharedWithMe.length === 0 ? (
            <div className="text-center py-16 rounded-2xl bg-gray-800/50 border border-white/10">
              <LucideIcon name="inbox" size={48} className="mx-auto mb-4 text-gray-500 opacity-50" />
              <h3 className="text-lg font-medium text-white mb-2">{t('Aucune liste partagée')}</h3>
              <p className="text-gray-400">
                {t('Personne n\'a encore partagé de liste avec vous')}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {sharedWithMe.map((item) => (
                <button
                  key={item.id}
                  onClick={() => navigate(`/wishlists/${item.wishlist_id}`)}
                  className="w-full p-6 rounded-2xl bg-gray-800/50 border border-white/10 hover:border-emerald-500/30 transition-all text-left"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-semibold text-white mb-1">{item.wishlist_title}</h3>
                      <div className="flex items-center gap-3 text-sm">
                        <span className="text-gray-400">
                          {t('Par')} {item.owner_username}
                        </span>
                        {getPermissionBadge(item.permission)}
                      </div>
                    </div>
                    <LucideIcon name="chevron-right" size={20} className="text-gray-500" />
                  </div>
                </button>
              ))}
            </div>
          )
        )}
        <ConfirmDialogComponent />
      </div>
    </Layout>
  );
}
