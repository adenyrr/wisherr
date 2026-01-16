import React, { useEffect, useState } from 'react';
import api from '../shared/utils/api';
import ItemCard from '../shared/components/ItemCard';
import { useConfirm } from '../shared/components/ConfirmDialog';
import { useToast } from '../shared/components/Toast';
import { useAuthStore } from '../shared/utils/store';
import { useTranslation } from 'react-i18next';

interface Item {
  id: number;
  name: string;
  description?: string;
  url?: string;
  image_url?: string;
  price?: number;
}

export default function Items({ wishlistId, ownerId, role }: { wishlistId: number, ownerId?: number, role?: string }) {
  const { t } = useTranslation();
  const { showSuccess, showError } = useToast();
  const { confirm, ConfirmDialogComponent } = useConfirm();
  const token = useAuthStore((s: any) => s.token);
  const currentUser = useAuthStore((s: any) => s.currentUser);
  const [items, setItems] = useState<Item[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Item | null>(null);
  const [form, setForm] = useState<Partial<Item>>({ name: '', url: '' });

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setError('');
    if (token && wishlistId) {
      setLoading(true);
      api.get(`/items/wishlist/${wishlistId}`).then((res: any) => setItems(res.data)).catch(() => setError(t('Erreur lors de la récupération des items'))).finally(() => setLoading(false));
    }
  }, [token, wishlistId]);

  const handleAdd = async () => {
    setError('');
    setLoading(true);
    try {
      const res = await api.post('/items', { ...form, wishlist_id: wishlistId });
      setItems([...items, res.data]);
      setOpen(false);
      setForm({ name: '', url: '' });
    } catch (e) {
      setError(t("Erreur lors de l'ajout de l'item"));
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    const confirmed = await confirm(
      t('Supprimer l\'article'),
      t('Êtes-vous sûr de vouloir supprimer cet article ?')
    );
    if (!confirmed) return;
    try {
      await api.delete(`/items/${id}`);
      setItems(items.filter(i => i.id !== id));
      showSuccess(t('Article supprimé avec succès'));
    } catch (e) {
      showError(t('Erreur lors de la suppression de l\'article'));
    }
  };

  const startEdit = (item: Item) => {
    setEditing(item);
    setForm({ name: item.name, url: item.url });
  };

  const handleUpdate = async () => {
    if (!editing) return;
    setLoading(true);
    try {
      const res = await api.put(`/items/${editing.id}`, { name: form.name, url: form.url });
      setItems(items.map(i => i.id === res.data.id ? res.data : i));
      setEditing(null);
      setForm({ name: '', url: '' });
    } catch (e) {
      setError(t("Erreur lors de la modification de l'article"));
    } finally {
      setLoading(false);
    }
  };

  const canEdit = Boolean(currentUser && (currentUser.is_admin || currentUser.id === ownerId || role === 'editor'));

  return (
    <div className="p-6">
      <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">{t('Items')}</h2>
      {error && <div className="mb-4 text-red-600 dark:text-red-400">{error}</div>}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {items.map(item => (
          <div key={item.id}>
            <ItemCard item={item} onEdit={canEdit ? startEdit : undefined} onDelete={canEdit ? handleDelete : undefined} />
          </div>
        ))}
      </div>

      {canEdit && (
        <div className="mt-4">
          <button className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl font-semibold shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-200 disabled:opacity-50 px-6 py-3" onClick={() => setOpen(true)} disabled={loading}>
            {loading ? <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white inline-block mr-2"></div> : t('Add')}
          </button>
        </div>
      )}

      {open && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50" onClick={() => setOpen(false)}>
          <div className="bg-white/95 dark:bg-gray-800/95 backdrop-blur-md rounded-2xl max-w-md w-full mx-4 shadow-2xl border border-gray-200 dark:border-gray-700" onClick={e => e.stopPropagation()}>
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{t('Add')} {t('Item')}</h2>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">{t('Name')}</label>
                <input
                  type="text"
                  value={form.name || ''}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">{t('URL')}</label>
                <input
                  type="url"
                  value={form.url || ''}
                  onChange={e => setForm(f => ({ ...f, url: e.target.value }))}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                />
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400">{t('Seul le nom et le lien sont nécessaires. Le reste sera récupéré automatiquement.')}</p>
            </div>
            <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-3">
              <button className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors shadow-md" onClick={() => setOpen(false)}>{t('Cancel')}</button>
              <button className="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-lg font-semibold shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-200 disabled:opacity-50" onClick={handleAdd} disabled={loading}>
                {loading ? <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white inline-block mr-2"></div> : t('Add')}
              </button>
            </div>
          </div>
        </div>
      )}

      {editing && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50" onClick={() => setEditing(null)}>
          <div className="bg-white/95 dark:bg-gray-800/95 backdrop-blur-md rounded-2xl max-w-md w-full mx-4 shadow-2xl border border-gray-200 dark:border-gray-700" onClick={e => e.stopPropagation()}>
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{t('Edit')} {t('Item')}</h2>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">{t('Name')}</label>
                <input
                  type="text"
                  value={form.name || ''}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">{t('URL')}</label>
                <input
                  type="url"
                  value={form.url || ''}
                  onChange={e => setForm(f => ({ ...f, url: e.target.value }))}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                />
              </div>
            </div>
            <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-3">
              <button className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors shadow-md" onClick={() => setEditing(null)}>{t('Cancel')}</button>
              <button className="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-lg font-semibold shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-200 disabled:opacity-50" onClick={handleUpdate} disabled={loading}>
                {loading ? <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white inline-block mr-2"></div> : t('Save')}
              </button>
            </div>
          </div>
        </div>
      )}
      <ConfirmDialogComponent />
    </div>
  );
}
