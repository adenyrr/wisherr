import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import Layout from '../../../shared/components/Layout';
import LucideIcon from '../../../shared/components/LucideIcon';
import ShareDialog from '../../../shared/components/ShareDialog';
import { useToast } from '../../../shared/components/Toast';
import { useConfirm } from '../../../shared/components/ConfirmDialog';
import api from '../../../shared/utils/api';

interface Wishlist {
  id: number;
  title: string;
}

interface Share {
  id: number;
  wishlist_id: number;
  wishlist_title: string;
  share_type: 'internal' | 'external';
  target_user_id?: number;
  target_group_id?: number;
  target_username?: string;
  target_group_name?: string;
  permission?: string;
  share_token?: string;
  share_url?: string;
  expires_at?: string;
  created_at: string;
  is_active: boolean;
}

interface SharedWithMeItem {
  id: number;
  wishlist_id: number;
  wishlist_title: string;
  owner_username: string;
  permission: string;
  created_at: string;
}

export default function SharesNew() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { showSuccess, showError } = useToast();
  const { confirm, ConfirmDialogComponent } = useConfirm();
  const [activeTab, setActiveTab] = useState<'mine' | 'shared'>('mine');
  const [myShares, setMyShares] = useState<Share[]>([]);
  const [sharedWithMe, setSharedWithMe] = useState<SharedWithMeItem[]>([]);
  const [wishlists, setWishlists] = useState<Wishlist[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);
  
  // Add share modal
  const [showAddShareModal, setShowAddShareModal] = useState(false);
  const [selectedWishlistId, setSelectedWishlistId] = useState<number | null>(null);
  const [showShareDialog, setShowShareDialog] = useState(false);
  
  // Edit permission modal
  const [editingShare, setEditingShare] = useState<Share | null>(null);
  const [editPermission, setEditPermission] = useState<'viewer' | 'editor'>('viewer');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [myRes, sharedRes, wishlistsRes] = await Promise.all([
        api.get('/shares'),
        api.get('/shares/shared-with-me'),
        api.get('/wishlists/mine')
      ]);
      setMyShares(myRes.data || []);
      setSharedWithMe(sharedRes.data || []);
      setWishlists(wishlistsRes.data || []);
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
      fetchData();
    } catch (err: any) {
      showError(err.response?.data?.detail || t('Erreur lors de la suppression'));
    }
  };

  const handleEditPermission = (share: Share) => {
    setEditingShare(share);
    setEditPermission(share.permission as 'viewer' | 'editor' || 'viewer');
  };

  const handleSavePermission = async () => {
    if (!editingShare) return;
    try {
      await api.put(`/shares/${editingShare.id}/permission`, {
        permission: editPermission
      });
      showSuccess(t('Permission modifiée avec succès'));
      setEditingShare(null);
      fetchData();
    } catch (err: any) {
      showError(err.response?.data?.detail || t('Erreur lors de la modification'));
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
      case 'telegram':
        url = `https://t.me/share/url?url=${link}&text=${text}`;
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

  const handleSelectWishlist = (wishlistId: number) => {
    setSelectedWishlistId(wishlistId);
    setShowAddShareModal(false);
    setShowShareDialog(true);
  };

  return (
    <Layout>
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-white mb-1">
              <LucideIcon name="share-2" size={28} className="inline-block mr-3 text-emerald-400" />
              {t('Gestion des partages')}
            </h1>
            <p className="text-gray-400">
              {t('Gérez les partages de vos listes et accédez aux listes partagées avec vous')}
            </p>
          </div>
          <button
            onClick={() => setShowAddShareModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl transition-colors"
          >
            <LucideIcon name="plus" size={20} />
            <span>{t('Nouveau partage')}</span>
          </button>
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
                onClick={() => setShowAddShareModal(true)}
                className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-500/20 text-emerald-400 rounded-lg hover:bg-emerald-500/30 transition-colors"
              >
                <LucideIcon name="plus" size={18} />
                <span>{t('Créer un partage')}</span>
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
                            {share.target_username && (
                              <span className="text-gray-400">
                                → {share.target_username}
                              </span>
                            )}
                            {share.target_group_name && (
                              <span className="text-gray-400">
                                → Groupe: {share.target_group_name}
                              </span>
                            )}
                            {share.permission && getPermissionBadge(share.permission)}
                          </>
                        ) : (
                          <>
                            <span className="px-2 py-0.5 text-xs font-medium bg-cyan-500/20 text-cyan-400 rounded-full">
                              {t('Externe')}
                            </span>
                            {!share.is_active && (
                              <span className="flex items-center gap-1 text-red-400">
                                <LucideIcon name="x-circle" size={12} />
                                {t('Désactivé')}
                              </span>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {/* Bouton modifier permission pour partages internes */}
                      {share.share_type === 'internal' && (
                        <button
                          onClick={() => handleEditPermission(share)}
                          className="p-2 rounded-lg bg-gray-700/50 text-gray-300 hover:bg-gray-700 transition-colors"
                          title={t('Modifier permission')}
                        >
                          <LucideIcon name="edit-2" size={18} />
                        </button>
                      )}
                      <button
                        onClick={() => handleDeleteShare(share.id)}
                        className="p-2 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors"
                      >
                        <LucideIcon name="trash-2" size={18} />
                      </button>
                    </div>
                  </div>

                  {/* External share actions */}
                  {share.share_type === 'external' && share.share_token && (
                    <div className="mt-4 pt-4 border-t border-white/10">
                      {/* Afficher le lien */}
                      <div className="mb-3 p-3 rounded-lg bg-gray-700/30 text-sm">
                        <p className="text-gray-400 text-xs mb-1">{t('Lien de partage :')}</p>
                        <code className="text-cyan-400 break-all">{share.share_url || `${window.location.origin}/shared/${share.share_token}`}</code>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <button
                          onClick={() => copyExternalLink(share.share_token!)}
                          className="flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-700/50 text-gray-300 hover:bg-gray-700 transition-colors text-sm"
                        >
                          <LucideIcon name={copiedToken === share.share_token ? 'check' : 'copy'} size={16} />
                          {copiedToken === share.share_token ? t('Copié !') : t('Copier le lien')}
                        </button>
                        <button
                          onClick={() => shareViaSocial(share.share_token!, 'whatsapp')}
                          className="flex items-center gap-2 px-3 py-2 rounded-lg bg-green-500/20 text-green-400 hover:bg-green-500/30 transition-colors text-sm"
                        >
                          <LucideIcon name="message-circle" size={16} />
                          WhatsApp
                        </button>
                        <button
                          onClick={() => shareViaSocial(share.share_token!, 'telegram')}
                          className="flex items-center gap-2 px-3 py-2 rounded-lg bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 transition-colors text-sm"
                        >
                          <LucideIcon name="send" size={16} />
                          Telegram
                        </button>
                        <button
                          onClick={() => shareViaSocial(share.share_token!, 'email')}
                          className="flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-500/20 text-gray-300 hover:bg-gray-500/30 transition-colors text-sm"
                        >
                          <LucideIcon name="mail" size={16} />
                          Email
                        </button>
                        <button
                          onClick={() => shareViaSocial(share.share_token!, 'facebook')}
                          className="flex items-center gap-2 px-3 py-2 rounded-lg bg-blue-600/20 text-blue-400 hover:bg-blue-600/30 transition-colors text-sm"
                        >
                          <LucideIcon name="facebook" size={16} />
                        </button>
                        <button
                          onClick={() => shareViaSocial(share.share_token!, 'twitter')}
                          className="flex items-center gap-2 px-3 py-2 rounded-lg bg-sky-500/20 text-sky-400 hover:bg-sky-500/30 transition-colors text-sm"
                        >
                          <LucideIcon name="twitter" size={16} />
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

        {/* Add Share Modal - Select wishlist first */}
        {showAddShareModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="w-full max-w-md rounded-2xl bg-gray-900 border border-white/10 shadow-2xl">
              <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
                <h2 className="text-lg font-semibold text-white">
                  {t('Nouveau partage')}
                </h2>
                <button
                  onClick={() => setShowAddShareModal(false)}
                  className="p-2 rounded-lg hover:bg-white/10 text-gray-400"
                >
                  <LucideIcon name="x" size={20} />
                </button>
              </div>
              <div className="p-6">
                <p className="text-gray-400 mb-4">
                  {t('Sélectionnez une liste à partager')}
                </p>
                
                {wishlists.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <LucideIcon name="list" size={40} className="mx-auto mb-3 opacity-50" />
                    <p>{t('Vous n\'avez aucune liste')}</p>
                    <button
                      onClick={() => { setShowAddShareModal(false); navigate('/wishlists/mine'); }}
                      className="mt-4 px-4 py-2 bg-indigo-500/20 text-indigo-400 rounded-lg hover:bg-indigo-500/30 transition-colors"
                    >
                      {t('Créer une liste')}
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {wishlists.map((wishlist) => (
                      <button
                        key={wishlist.id}
                        onClick={() => handleSelectWishlist(wishlist.id)}
                        className="w-full flex items-center gap-3 p-4 rounded-xl bg-gray-800/50 hover:bg-gray-700/50 transition-colors text-left"
                      >
                        <div className="w-10 h-10 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                          <LucideIcon name="list" size={20} className="text-emerald-400" />
                        </div>
                        <div className="flex-1">
                          <h4 className="text-white font-medium">{wishlist.title}</h4>
                        </div>
                        <LucideIcon name="chevron-right" size={18} className="text-gray-500" />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Share Dialog */}
        {showShareDialog && selectedWishlistId && (
          <ShareDialog
            open={showShareDialog}
            onClose={() => { setShowShareDialog(false); setSelectedWishlistId(null); }}
            wishlistId={selectedWishlistId}
            wishlistName={wishlists.find(w => w.id === selectedWishlistId)?.title || 'Liste'}
            onSuccess={() => { 
              setShowShareDialog(false); 
              setSelectedWishlistId(null);
              fetchData();
            }}
          />
        )}
        
        {/* Edit Permission Modal */}
        {editingShare && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="w-full max-w-md rounded-2xl bg-gray-900 border border-white/10 shadow-2xl">
              <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
                <h2 className="text-lg font-semibold text-white">
                  {t('Modifier la permission')}
                </h2>
                <button
                  onClick={() => setEditingShare(null)}
                  className="p-2 rounded-lg hover:bg-white/10 text-gray-400"
                >
                  <LucideIcon name="x" size={20} />
                </button>
              </div>
              <div className="p-6 space-y-4">
                <p className="text-gray-400 text-sm">
                  {t('Partage vers')} : <span className="text-white font-medium">{editingShare.target_username || editingShare.target_group_name}</span>
                </p>
                <p className="text-gray-400 text-sm">
                  {t('Liste')} : <span className="text-white font-medium">{editingShare.wishlist_title}</span>
                </p>
                
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    {t('Permission')}
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setEditPermission('viewer')}
                      className={`p-3 rounded-xl text-center transition-colors ${
                        editPermission === 'viewer'
                          ? 'bg-blue-500/20 border-blue-500/50 border text-blue-400'
                          : 'bg-gray-800 border border-white/10 text-gray-400 hover:border-gray-600'
                      }`}
                    >
                      <LucideIcon name="eye" size={20} className="mx-auto mb-1" />
                      <span className="text-sm">{t('Lecteur')}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditPermission('editor')}
                      className={`p-3 rounded-xl text-center transition-colors ${
                        editPermission === 'editor'
                          ? 'bg-amber-500/20 border-amber-500/50 border text-amber-400'
                          : 'bg-gray-800 border border-white/10 text-gray-400 hover:border-gray-600'
                      }`}
                    >
                      <LucideIcon name="edit-2" size={20} className="mx-auto mb-1" />
                      <span className="text-sm">{t('Éditeur')}</span>
                    </button>
                  </div>
                </div>
                
                <div className="flex justify-end gap-3 pt-4">
                  <button
                    onClick={() => setEditingShare(null)}
                    className="px-4 py-2 rounded-lg text-gray-400 hover:text-white transition-colors"
                  >
                    {t('Annuler')}
                  </button>
                  <button
                    onClick={handleSavePermission}
                    className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg transition-colors"
                  >
                    {t('Enregistrer')}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
        
        <ConfirmDialogComponent />
      </div>
    </Layout>
  );
}
