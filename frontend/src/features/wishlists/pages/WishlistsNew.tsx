import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import Layout from '../../../shared/components/Layout';
import LucideIcon from '../../../shared/components/LucideIcon';
import ShareDialog from '../../../shared/components/ShareDialog';
import { useToast } from '../../../shared/components/Toast';
import { useConfirm } from '../../../shared/components/ConfirmDialog';
import api from '../../../shared/utils/api';

interface Item {
  id: number;
  name: string;
  description?: string;
  url?: string;
  image_url?: string;
  price?: number;
  status?: string;
  priority?: string;
  custom_attributes?: {
    tag_color?: string;
    tag_model?: string;
    tag_size?: string;
    tag_quantity?: string;
  };
}

interface Wishlist {
  id: number;
  owner_id: number;
  title: string;
  description?: string;
  occasion?: string;
  item_count?: number;
  created_at: string;
}

const OCCASIONS = [
  { value: 'birthday', label: 'Anniversaire', icon: 'cake' },
  { value: 'christmas', label: 'Noël', icon: 'gift' },
  { value: 'wedding', label: 'Mariage', icon: 'heart' },
  { value: 'birth', label: 'Naissance', icon: 'baby' },
  { value: 'other', label: 'Autre', icon: 'sparkles' },
];

export default function WishlistsNew() {
  const { t } = useTranslation();
  
  // Lists state
  const [wishlists, setWishlists] = useState<Wishlist[]>([]);
  const [selectedList, setSelectedList] = useState<Wishlist | null>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingItems, setLoadingItems] = useState(false);
  
  // Modals
  const [showCreateListModal, setShowCreateListModal] = useState(false);
  const [showAddItemModal, setShowAddItemModal] = useState(false);
  const [showShareDialog, setShowShareDialog] = useState(false);
  const [editingList, setEditingList] = useState<Wishlist | null>(null);
  const [editingTags, setEditingTags] = useState<Item | null>(null);
  const [tagsForm, setTagsForm] = useState({ tag_color: '', tag_model: '', tag_size: '', tag_quantity: '' });
  
  // Form state
  const [listForm, setListForm] = useState({ title: '', description: '', occasion: 'other', notify_owner_on_reservation: true });
  const [itemForm, setItemForm] = useState({ name: '', url: '' });
  const [scraping, setScraping] = useState(false);
  const { showError, showSuccess } = useToast();
  const { confirm, ConfirmDialogComponent } = useConfirm();

  useEffect(() => {
    fetchWishlists();
  }, []);

  useEffect(() => {
    if (selectedList) {
      fetchItems(selectedList.id);
    }
  }, [selectedList]);

  const fetchWishlists = async () => {
    try {
      const res = await api.get('/wishlists/mine');
      setWishlists(res.data || []);
      if (res.data?.length > 0 && !selectedList) {
        setSelectedList(res.data[0]);
      }
    } catch (err) {
      console.error('Failed to fetch wishlists:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchItems = async (wishlistId: number) => {
    setLoadingItems(true);
    try {
      const res = await api.get(`/items/wishlist/${wishlistId}`);
      setItems(res.data || []);
    } catch (err) {
      console.error('Failed to fetch items:', err);
    } finally {
      setLoadingItems(false);
    }
  };

  const handleCreateList = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await api.post('/wishlists', {
        title: listForm.title,
        description: listForm.description || null,
        occasion: listForm.occasion
      });
      setWishlists([res.data, ...wishlists]);
      setSelectedList(res.data);
      setShowCreateListModal(false);
      setListForm({ title: '', description: '', occasion: 'other', notify_owner_on_reservation: true });
      showSuccess('Liste créée avec succès !');
    } catch (err: any) {
      showError(err.response?.data?.detail || 'Erreur lors de la création');
    }
  };

  const handleUpdateList = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingList) return;
    try {
      const res = await api.put(`/wishlists/${editingList.id}`, {
        title: listForm.title,
        description: listForm.description || null,
        occasion: listForm.occasion
      });
      // Sauvegarder les paramètres de notification
      await api.put(`/wishlists/${editingList.id}/settings`, {
        notify_owner_on_reservation: listForm.notify_owner_on_reservation
      });
      setWishlists(wishlists.map(w => w.id === res.data.id ? res.data : w));
      if (selectedList?.id === res.data.id) {
        setSelectedList(res.data);
      }
      setEditingList(null);
      setListForm({ title: '', description: '', occasion: 'other', notify_owner_on_reservation: true });
      showSuccess('Liste modifiée avec succès !');
    } catch (err: any) {
      showError(err.response?.data?.detail || 'Erreur lors de la modification');
    }
  };

  const handleDeleteList = async (listId: number) => {
    const confirmed = await confirm(
      'Supprimer la liste',
      'Êtes-vous sûr de vouloir supprimer cette liste ? Tous les articles seront perdus.',
      { variant: 'danger', confirmLabel: 'Supprimer' }
    );
    if (!confirmed) return;
    try {
      await api.delete(`/wishlists/${listId}`);
      setWishlists(wishlists.filter(w => w.id !== listId));
      if (selectedList?.id === listId) {
        setSelectedList(wishlists.find(w => w.id !== listId) || null);
      }
      showSuccess('Liste supprimée avec succès !');
    } catch (err: any) {
      showError(err.response?.data?.detail || 'Erreur lors de la suppression');
    }
  };

  const handleScrapeAndAdd = async () => {
    if (!itemForm.name.trim()) {
      showError('Veuillez entrer un nom de produit');
      return;
    }
    
    setScraping(true);
    
    try {
      let itemData: any = {
        wishlist_id: selectedList?.id,
        name: itemForm.name.trim(),
        url: itemForm.url.trim() || null
      };
      
      // Tenter le scraping si une URL est fournie
      if (itemForm.url.trim()) {
        try {
          const scrapeRes = await api.post('/scrape', { url: itemForm.url.trim() });
          const data = scrapeRes.data;
          itemData = {
            ...itemData,
            name: itemForm.name.trim() || data.title || 'Article sans nom',
            description: data.description || null,
            image_url: data.image_url || data.images?.[0] || null,
            price: data.price || null
          };
        } catch (scrapeErr) {
          // Scraping a échoué, on continue avec les données de base
          console.warn('Scraping failed, adding with basic data');
        }
      }
      
      // Créer l'article (une seule fois)
      const itemRes = await api.post('/items', itemData);
      setItems([...items, itemRes.data]);
      setShowAddItemModal(false);
      setItemForm({ name: '', url: '' });
      showSuccess('Article ajouté avec succès !');
    } catch (err: any) {
      showError(err.response?.data?.detail || 'Erreur lors de l\'ajout de l\'article');
    } finally {
      setScraping(false);
    }
  };

  const handleDeleteItem = async (itemId: number) => {
    const confirmed = await confirm(
      'Supprimer l\'article',
      'Êtes-vous sûr de vouloir supprimer cet article ?',
      { variant: 'danger', confirmLabel: 'Supprimer' }
    );
    if (!confirmed) return;
    try {
      await api.delete(`/items/${itemId}`);
      setItems(items.filter(i => i.id !== itemId));
      showSuccess('Article supprimé avec succès !');
    } catch (err: any) {
      // Supprimer de l'UI même si erreur (l'article est probablement supprimé)
      setItems(items.filter(i => i.id !== itemId));
      showError(err.response?.data?.detail || 'Erreur lors de la suppression', `/items/${itemId}`);
    }
  };

  const openTagsEditor = (item: Item) => {
    setEditingTags(item);
    setTagsForm({
      tag_color: item.custom_attributes?.tag_color || '',
      tag_model: item.custom_attributes?.tag_model || '',
      tag_size: item.custom_attributes?.tag_size || '',
      tag_quantity: item.custom_attributes?.tag_quantity || ''
    });
  };

  const handleSaveTags = async () => {
    if (!editingTags) return;
    try {
      const res = await api.put(`/items/${editingTags.id}`, {
        custom_attributes: {
          ...(editingTags.custom_attributes || {}),
          tag_color: tagsForm.tag_color || null,
          tag_model: tagsForm.tag_model || null,
          tag_size: tagsForm.tag_size || null,
          tag_quantity: tagsForm.tag_quantity || null
        }
      });
      setItems(items.map(i => i.id === res.data.id ? res.data : i));
      setEditingTags(null);
      setTagsForm({ tag_color: '', tag_model: '', tag_size: '', tag_quantity: '' });
      showSuccess('Tags mis à jour !');
    } catch (err: any) {
      showError(err.response?.data?.detail || 'Erreur lors de la mise à jour des tags');
    }
  };

  const startEditList = async (list: Wishlist) => {
    setEditingList(list);
    setListForm({
      title: list.title,
      description: list.description || '',
      occasion: list.occasion || 'other',
      notify_owner_on_reservation: true // valeur par défaut
    });
    // Charger les paramètres de notification
    try {
      const res = await api.get(`/wishlists/${list.id}/settings`);
      setListForm(prev => ({
        ...prev,
        notify_owner_on_reservation: res.data.notify_owner_on_reservation ?? true
      }));
    } catch (err) {
      // Si erreur (403 par ex), garder la valeur par défaut
    }
  };

  const getOccasionInfo = (occasion?: string) => {
    return OCCASIONS.find(o => o.value === occasion) || OCCASIONS[4];
  };

  return (
    <Layout>
      <ConfirmDialogComponent />
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-white mb-1">
              <LucideIcon name="list" size={28} className="inline-block mr-3 text-indigo-400" />
              {t('Mes listes')}
            </h1>
            <p className="text-gray-400">
              {wishlists.length} {t('liste(s) de souhaits')}
            </p>
          </div>
          <button
            onClick={() => setShowCreateListModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-500 hover:bg-indigo-600 text-white rounded-xl transition-colors"
          >
            <LucideIcon name="plus" size={20} />
            <span>{t('Nouvelle liste')}</span>
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : wishlists.length === 0 ? (
          <div className="text-center py-16 rounded-2xl bg-gray-800/50 border border-white/10">
            <LucideIcon name="gift" size={48} className="mx-auto mb-4 text-gray-500 opacity-50" />
            <h3 className="text-lg font-medium text-white mb-2">{t('Aucune liste')}</h3>
            <p className="text-gray-400 mb-6">
              {t('Créez votre première liste de souhaits')}
            </p>
            <button
              onClick={() => setShowCreateListModal(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-500/20 text-indigo-400 rounded-lg hover:bg-indigo-500/30 transition-colors"
            >
              <LucideIcon name="plus" size={18} />
              <span>{t('Créer une liste')}</span>
            </button>
          </div>
        ) : (
          <div className="grid lg:grid-cols-3 gap-6">
            {/* Lists sidebar */}
            <div className="lg:col-span-1 space-y-3">
              {wishlists.map((list) => {
                const occasion = getOccasionInfo(list.occasion);
                return (
                  <button
                    key={list.id}
                    onClick={() => setSelectedList(list)}
                    className={`w-full p-4 rounded-xl text-left transition-all ${
                      selectedList?.id === list.id
                        ? 'bg-indigo-500/20 border-indigo-500/50 border'
                        : 'bg-gray-800/50 border border-white/10 hover:border-indigo-500/30'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                        selectedList?.id === list.id ? 'bg-indigo-500/30' : 'bg-gray-700/50'
                      }`}>
                        <LucideIcon 
                          name={occasion.icon as any} 
                          size={20} 
                          className={selectedList?.id === list.id ? 'text-indigo-400' : 'text-gray-400'} 
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className={`font-medium truncate ${
                          selectedList?.id === list.id ? 'text-indigo-400' : 'text-white'
                        }`}>
                          {list.title}
                        </h3>
                        <p className="text-sm text-gray-500 mt-0.5">
                          {occasion.label} • {list.item_count || 0} {t('article(s)')}
                        </p>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Selected list content */}
            <div className="lg:col-span-2">
              {selectedList ? (
                <div className="rounded-2xl bg-gray-800/50 border border-white/10 overflow-hidden">
                  {/* List header */}
                  <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between">
                    <div>
                      <h2 className="text-xl font-semibold text-white">{selectedList.title}</h2>
                      {selectedList.description && (
                        <p className="text-sm text-gray-400 mt-1">{selectedList.description}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setShowShareDialog(true)}
                        className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 transition-colors"
                        title={t('Partager')}
                      >
                        <LucideIcon name="share-2" size={18} />
                      </button>
                      <button
                        onClick={() => startEditList(selectedList)}
                        className="p-2 rounded-lg bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 transition-colors"
                        title={t('Modifier')}
                      >
                        <LucideIcon name="edit-2" size={18} />
                      </button>
                      <button
                        onClick={() => handleDeleteList(selectedList.id)}
                        className="p-2 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors"
                        title={t('Supprimer')}
                      >
                        <LucideIcon name="trash-2" size={18} />
                      </button>
                    </div>
                  </div>

                  {/* Items */}
                  <div className="p-6">
                    {loadingItems ? (
                      <div className="flex items-center justify-center py-8">
                        <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                      </div>
                    ) : items.length === 0 ? (
                      <div className="text-center py-8 text-gray-500">
                        <LucideIcon name="package" size={40} className="mx-auto mb-3 opacity-50" />
                        <p>{t('Aucun article dans cette liste')}</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {items.map((item) => (
                          <div
                            key={item.id}
                            className={`flex items-center gap-4 p-4 rounded-xl transition-colors group ${
                              item.status === 'reserved' || item.status === 'purchased'
                                ? 'bg-gray-800/60 opacity-50 border border-emerald-500/30'
                                : 'bg-gray-700/30 hover:bg-gray-700/50'
                            }`}
                          >
                            {item.image_url ? (
                              <img
                                src={item.image_url}
                                alt={item.name}
                                className="w-16 h-16 rounded-lg object-cover"
                              />
                            ) : (
                              <div className="w-16 h-16 rounded-lg bg-gray-600/50 flex items-center justify-center">
                                <LucideIcon name="image" size={24} className="text-gray-500" />
                              </div>
                            )}
                            <div className="flex-1 min-w-0">
                              <h4 className="font-medium text-white truncate">{item.name}</h4>
                              {item.description && (
                                <p className="text-sm text-gray-400 truncate mt-0.5">{item.description}</p>
                              )}
                              {/* Tags manuels */}
                              <div className="flex flex-wrap gap-1.5 mt-2">
                                {item.custom_attributes?.tag_color && (
                                  <span className="px-2 py-0.5 text-xs rounded-full bg-pink-500/20 text-pink-400">
                                    {item.custom_attributes.tag_color}
                                  </span>
                                )}
                                {item.custom_attributes?.tag_model && (
                                  <span className="px-2 py-0.5 text-xs rounded-full bg-blue-500/20 text-blue-400">
                                    {item.custom_attributes.tag_model}
                                  </span>
                                )}
                                {item.custom_attributes?.tag_size && (
                                  <span className="px-2 py-0.5 text-xs rounded-full bg-amber-500/20 text-amber-400">
                                    {item.custom_attributes.tag_size}
                                  </span>
                                )}
                                {item.custom_attributes?.tag_quantity && (
                                  <span className="px-2 py-0.5 text-xs rounded-full bg-purple-500/20 text-purple-400">
                                    ×{item.custom_attributes.tag_quantity}
                                  </span>
                                )}
                                {item.status === 'reserved' && (
                                  <span className="px-2 py-0.5 text-xs rounded-full bg-emerald-500/20 text-emerald-400">
                                    Réservé
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-3 mt-1 text-sm">
                                {item.price && (
                                  <span className="text-emerald-400 font-medium">{item.price.toFixed(2)} €</span>
                                )}
                                {item.url && (
                                  <a
                                    href={item.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-blue-400 hover:text-blue-300 flex items-center gap-1"
                                  >
                                    <LucideIcon name="external-link" size={12} />
                                    {t('Voir')}
                                  </a>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => openTagsEditor(item)}
                                className="p-2 rounded-lg text-gray-500 hover:text-indigo-400 hover:bg-indigo-500/10 transition-colors opacity-0 group-hover:opacity-100"
                                title={t('Modifier les tags')}
                              >
                                <LucideIcon name="tags" size={18} />
                              </button>
                              <button
                                onClick={() => handleDeleteItem(item.id)}
                                className="p-2 rounded-lg text-gray-500 hover:text-red-400 hover:bg-red-500/10 transition-colors opacity-0 group-hover:opacity-100"
                              >
                                <LucideIcon name="trash-2" size={18} />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Add item button */}
                    <button
                      onClick={() => setShowAddItemModal(true)}
                      className="mt-4 w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl border-2 border-dashed border-gray-600 text-gray-400 hover:border-indigo-500 hover:text-indigo-400 transition-colors"
                    >
                      <LucideIcon name="plus" size={20} />
                      <span>{t('Ajouter un article')}</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="text-center py-16 text-gray-500">
                  <LucideIcon name="mouse-pointer-click" size={48} className="mx-auto mb-4 opacity-50" />
                  <p>{t('Sélectionnez une liste pour voir son contenu')}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Create/Edit List Modal */}
        {(showCreateListModal || editingList) && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="w-full max-w-md rounded-2xl bg-gray-900 border border-white/10 shadow-2xl">
              <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
                <h2 className="text-lg font-semibold text-white">
                  {editingList ? t('Modifier la liste') : t('Nouvelle liste')}
                </h2>
                <button
                  onClick={() => { setShowCreateListModal(false); setEditingList(null); setListForm({ title: '', description: '', occasion: 'other', notify_owner_on_reservation: true }); }}
                  className="p-2 rounded-lg hover:bg-white/10 text-gray-400"
                >
                  <LucideIcon name="x" size={20} />
                </button>
              </div>
              <form onSubmit={editingList ? handleUpdateList : handleCreateList} className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    {t('Nom de la liste')} *
                  </label>
                  <input
                    type="text"
                    value={listForm.title}
                    onChange={(e) => setListForm({ ...listForm, title: e.target.value })}
                    placeholder={t('Ma liste de Noël')}
                    className="w-full px-4 py-3 rounded-xl bg-gray-800 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    {t('Occasion')}
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {OCCASIONS.map((occ) => (
                      <button
                        key={occ.value}
                        type="button"
                        onClick={() => setListForm({ ...listForm, occasion: occ.value })}
                        className={`p-3 rounded-xl text-center transition-colors ${
                          listForm.occasion === occ.value
                            ? 'bg-indigo-500/20 border-indigo-500/50 border text-indigo-400'
                            : 'bg-gray-800 border border-white/10 text-gray-400 hover:border-gray-600'
                        }`}
                      >
                        <LucideIcon name={occ.icon as any} size={20} className="mx-auto mb-1" />
                        <span className="text-xs">{occ.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    {t('Description')} ({t('optionnel')})
                  </label>
                  <textarea
                    value={listForm.description}
                    onChange={(e) => setListForm({ ...listForm, description: e.target.value })}
                    placeholder={t('Une description pour cette liste...')}
                    className="w-full px-4 py-3 rounded-xl bg-gray-800 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 resize-none"
                    rows={3}
                  />
                </div>
                {/* Toggle notifications réservation - seulement en mode édition */}
                {editingList && (
                  <div className="pt-2 border-t border-white/10">
                    <label className="flex items-center justify-between cursor-pointer group">
                      <div>
                        <span className="text-sm font-medium text-gray-300 group-hover:text-white transition-colors">
                          {t('Me notifier des réservations')}
                        </span>
                        <p className="text-xs text-gray-500">
                          {t('Recevoir une notification quand quelqu\'un réserve un article')}
                        </p>
                      </div>
                      <div className="relative">
                        <input
                          type="checkbox"
                          checked={listForm.notify_owner_on_reservation}
                          onChange={(e) => setListForm({ ...listForm, notify_owner_on_reservation: e.target.checked })}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-indigo-500 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-500"></div>
                      </div>
                    </label>
                  </div>
                )}
                <div className="flex justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => { setShowCreateListModal(false); setEditingList(null); }}
                    className="px-4 py-2 rounded-lg text-gray-400 hover:text-white transition-colors"
                  >
                    {t('Annuler')}
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-indigo-500 hover:bg-indigo-600 text-white rounded-lg transition-colors"
                  >
                    {editingList ? t('Enregistrer') : t('Créer')}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Add Item Modal - Simplified: just name and URL */}
        {showAddItemModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="w-full max-w-md rounded-2xl bg-gray-900 border border-white/10 shadow-2xl">
              <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
                <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                  <LucideIcon name="plus-circle" size={20} className="text-indigo-400" />
                  {t('Ajouter un article')}
                </h2>
                <button
                  onClick={() => { setShowAddItemModal(false); setItemForm({ name: '', url: '' }); }}
                  className="p-2 rounded-lg hover:bg-white/10 text-gray-400"
                >
                  <LucideIcon name="x" size={20} />
                </button>
              </div>
              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    {t('Nom du produit')} *
                  </label>
                  <input
                    type="text"
                    value={itemForm.name}
                    onChange={(e) => setItemForm({ ...itemForm, name: e.target.value })}
                    placeholder={t('Nom du produit')}
                    className="w-full px-4 py-3 rounded-xl bg-gray-800 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    {t('URL du produit')} *
                  </label>
                  <input
                    type="url"
                    value={itemForm.url}
                    onChange={(e) => setItemForm({ ...itemForm, url: e.target.value })}
                    placeholder="https://amazon.fr/..."
                    className="w-full px-4 py-3 rounded-xl bg-gray-800 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500"
                    required
                  />
                  <p className="text-xs text-gray-500 mt-2">
                    {t('Les informations (image, prix, description) seront récupérées automatiquement')}
                  </p>
                </div>
                <div className="flex justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => { setShowAddItemModal(false); setItemForm({ name: '', url: '' }); }}
                    className="px-4 py-2 rounded-lg text-gray-400 hover:text-white transition-colors">
                    {t('Annuler')}
                  </button>
                  <button
                    onClick={handleScrapeAndAdd}
                    disabled={scraping}
                    className="flex items-center gap-2 px-4 py-2 bg-indigo-500 hover:bg-indigo-600 disabled:opacity-50 text-white rounded-lg transition-colors"
                  >
                    {scraping ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span>{t('Import en cours...')}</span>
                      </>
                    ) : (
                      <>
                        <LucideIcon name="download" size={18} />
                        <span>{t('Importer')}</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Share Dialog */}
        {showShareDialog && selectedList && (
          <ShareDialog
            open={showShareDialog}
            onClose={() => setShowShareDialog(false)}
            wishlistId={selectedList.id}
            wishlistName={selectedList.title}
            onSuccess={() => setShowShareDialog(false)}
          />
        )}

        {/* Tags Editor Modal */}
        {editingTags && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="w-full max-w-md rounded-2xl bg-gray-900 border border-white/10 shadow-2xl">
              <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
                <h2 className="text-lg font-semibold text-white">
                  {t('Modifier les tags')}
                </h2>
                <button
                  onClick={() => { setEditingTags(null); setTagsForm({ tag_color: '', tag_model: '', tag_size: '', tag_quantity: '' }); }}
                  className="p-2 rounded-lg hover:bg-white/10 text-gray-400"
                >
                  <LucideIcon name="x" size={20} />
                </button>
              </div>
              <div className="p-6 space-y-4">
                <p className="text-sm text-gray-400 mb-4">
                  {t('Ajoutez des tags pour aider les personnes à choisir le bon article')} : <span className="text-white font-medium">{editingTags.name}</span>
                </p>
                
                <div>
                  <label className="flex items-center gap-2 text-sm font-medium text-gray-300 mb-2">
                    <span className="w-3 h-3 rounded-full bg-pink-500"></span>
                    {t('Couleur')}
                  </label>
                  <input
                    type="text"
                    value={tagsForm.tag_color}
                    onChange={(e) => setTagsForm({ ...tagsForm, tag_color: e.target.value })}
                    placeholder={t('Ex: Rouge, Bleu marine...')}
                    className="w-full px-4 py-2 rounded-lg bg-gray-800 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-pink-500"
                  />
                </div>
                
                <div>
                  <label className="flex items-center gap-2 text-sm font-medium text-gray-300 mb-2">
                    <span className="w-3 h-3 rounded-full bg-blue-500"></span>
                    {t('Modèle')}
                  </label>
                  <input
                    type="text"
                    value={tagsForm.tag_model}
                    onChange={(e) => setTagsForm({ ...tagsForm, tag_model: e.target.value })}
                    placeholder={t('Ex: Version Pro, Édition limitée...')}
                    className="w-full px-4 py-2 rounded-lg bg-gray-800 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
                  />
                </div>
                
                <div>
                  <label className="flex items-center gap-2 text-sm font-medium text-gray-300 mb-2">
                    <span className="w-3 h-3 rounded-full bg-amber-500"></span>
                    {t('Taille')}
                  </label>
                  <input
                    type="text"
                    value={tagsForm.tag_size}
                    onChange={(e) => setTagsForm({ ...tagsForm, tag_size: e.target.value })}
                    placeholder={t('Ex: M, 42, 128 Go...')}
                    className="w-full px-4 py-2 rounded-lg bg-gray-800 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-amber-500"
                  />
                </div>
                
                <div>
                  <label className="flex items-center gap-2 text-sm font-medium text-gray-300 mb-2">
                    <span className="w-3 h-3 rounded-full bg-purple-500"></span>
                    {t('Quantité')}
                  </label>
                  <input
                    type="text"
                    value={tagsForm.tag_quantity}
                    onChange={(e) => setTagsForm({ ...tagsForm, tag_quantity: e.target.value })}
                    placeholder={t('Ex: 2, 3 paires...')}
                    className="w-full px-4 py-2 rounded-lg bg-gray-800 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500"
                  />
                </div>

                <div className="flex justify-end gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => { setEditingTags(null); setTagsForm({ tag_color: '', tag_model: '', tag_size: '', tag_quantity: '' }); }}
                    className="px-4 py-2 rounded-lg text-gray-400 hover:text-white transition-colors"
                  >
                    {t('Annuler')}
                  </button>
                  <button
                    onClick={handleSaveTags}
                    className="px-4 py-2 bg-indigo-500 hover:bg-indigo-600 text-white rounded-lg transition-colors"
                  >
                    {t('Enregistrer')}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
