
import React, { useEffect, useState } from 'react';
import { Edit, Trash, Users } from 'lucide-react';
import CollaboratorsDialog from '../../../shared/components/CollaboratorsDialog';
import { useToast } from '../../../shared/components/Toast';
import { useConfirm } from '../../../shared/components/ConfirmDialog';
import api from '../../../shared/utils/api';
import { useAuthStore } from '../../../shared/utils/store';
import { useTranslation } from 'react-i18next';
import Items from '../../items/pages/Items';

interface Wishlist {
  id: number;
  owner_id: number;
  title: string;
  description?: string;
}

export default function Wishlists({ mode = 'mine' }: { mode?: 'mine' | 'others' }) {
  const { t } = useTranslation();
  const { showSuccess, showError } = useToast();
  const { confirm, ConfirmDialogComponent } = useConfirm();
  const token = useAuthStore((s: any) => s.token);
  const currentUser = useAuthStore((s: any) => s.currentUser);
  const [wishlists, setWishlists] = useState<Wishlist[]>([]);
  const [collaborators, setCollaborators] = useState<Wishlist[]>([]);
  const [viewers, setViewers] = useState<Wishlist[]>([]);
  const [selected, setSelected] = useState<number | null>(null);
  const [rolesMap, setRolesMap] = useState<Record<number, string>>({});

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setError('');
    if (!token) return;
    setLoading(true);
    api.get('/wishlists/with-roles')
      .then((res: any) => {
        const all: any[] = res.data || [];
        const map: Record<number, string> = {};
        all.forEach((w: any) => { map[w.id] = w.role; });
        setRolesMap(map);

        if (mode === 'mine') {
          const mine = all.filter(w => w.owner_id === currentUser?.id || (currentUser && currentUser.is_admin));
          setWishlists(mine);
        } else {
          const others = all.filter(w => w.owner_id !== currentUser?.id);
          const coll = others.filter(w => w.role === 'editor' || w.role === 'admin');
          const view = others.filter(w => w.role === 'viewer');
          setCollaborators(coll);
          setViewers(view);
          setWishlists([...coll, ...view]);
        }
      })
      .catch((err: any) => setError(t('Erreur lors de la récupération des listes')))
      .finally(() => setLoading(false));
  }, [token, mode, currentUser]);

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Wishlist | null>(null);
  const [form, setForm] = useState({ title: '', description: '' });
  const [collabOpen, setCollabOpen] = useState(false);

  const handleCreate = async () => {
    setError('');
    setLoading(true);
    try {
      const res = await api.post('/wishlists', { title: form.title, description: form.description });
      setWishlists(prev => [res.data, ...prev]);
      setForm({ title: '', description: '' });
      setOpen(false);
    } catch (e) {
      setError(t('Erreur lors de la création de la liste'));
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    const confirmed = await confirm(
      t('Supprimer la liste'),
      t('Êtes-vous sûr de vouloir supprimer cette liste ? Tous les articles seront également supprimés.')
    );
    if (!confirmed) return;
    try {
      await api.delete(`/wishlists/${id}`);
      setWishlists(wishlists.filter(w => w.id !== id));
      if (selected === id) setSelected(null);
      showSuccess(t('Liste supprimée avec succès'));
    } catch (e) {
      showError(t('Erreur lors de la suppression de la liste'));
    }
  };

  const startEdit = (wl: Wishlist) => {
    setEditing(wl);
    setForm({ title: wl.title, description: wl.description || '' });
  };

  const handleUpdate = async () => {
    if (!editing) return;
    setLoading(true);
    try {
      const res = await api.put(`/wishlists/${editing.id}`, { title: form.title, description: form.description });
      setWishlists(wishlists.map(w => w.id === res.data.id ? res.data : w));
      setEditing(null);
      setForm({ title: '', description: '' });
    } catch (e) {
      setError(t('Erreur lors de la modification de la liste'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4 text-gray-900 dark:text-white">{t('Wishlists')}</h1>
      {error && <div className="mb-4 text-red-600 dark:text-red-400">{error}</div>}
      {mode === 'others' ? (
        <>
          <h2 className="text-lg font-semibold mb-2 text-gray-900 dark:text-white">Collaborator lists</h2>
          <ul className="space-y-2">
            {collaborators.map(wl => (
            <li key={wl.id} className={`flex items-center p-4 rounded-xl transition-all duration-200 ${selected === wl.id ? 'bg-blue-50 dark:bg-blue-900/50 shadow-lg border border-blue-200 dark:border-blue-800' : 'hover:bg-gray-50 dark:hover:bg-gray-800/50 hover:shadow-md hover:border hover:border-gray-200 dark:hover:border-gray-700'} cursor-pointer group`}>
              <div className="flex-1" onClick={() => setSelected(wl.id)}>
                <div className="font-medium text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">{wl.title}</div>
                <div className="text-sm text-gray-500 dark:text-gray-400">{wl.description}</div>
                {rolesMap[wl.id] && <span className="inline-block bg-blue-100 dark:bg-blue-800 text-blue-800 dark:text-blue-200 text-xs font-medium px-2 py-1 rounded mt-1">{rolesMap[wl.id]}</span>}
              </div>
              {(currentUser && (currentUser.is_admin || rolesMap[wl.id] === 'editor')) && (
                <button onClick={() => startEdit(wl)} className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-all opacity-0 group-hover:opacity-100">
                  <Edit className="w-5 h-5" />
                </button>
                )}
              </li>
            ))}
          </ul>

          <h2 className="text-lg font-semibold mb-2 mt-4 text-gray-900 dark:text-white">Viewer lists</h2>
          <ul className="space-y-2">
            {viewers.map(wl => (
              <li key={wl.id} className={`flex items-center p-4 rounded-xl transition-all duration-200 ${selected === wl.id ? 'bg-blue-50 dark:bg-blue-900/50 shadow-lg border border-blue-200 dark:border-blue-800' : 'hover:bg-gray-50 dark:hover:bg-gray-800/50 hover:shadow-md hover:border hover:border-gray-200 dark:hover:border-gray-700'} cursor-pointer group`}>
                <div className="flex-1" onClick={() => setSelected(wl.id)}>
                  <div className="font-medium text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">{wl.title}</div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">{wl.description}</div>
                  {rolesMap[wl.id] && <span className="inline-block bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 text-xs font-medium px-2 py-1 rounded mt-1">{rolesMap[wl.id]}</span>}
                </div>
              </li>
            ))}
          </ul>
        </>
      ) : (
        <ul className="space-y-2">
          {wishlists.map(wl => (
            <li key={wl.id} className={`flex items-center p-4 rounded-xl transition-all duration-200 ${selected === wl.id ? 'bg-blue-50 dark:bg-blue-900/50 shadow-lg border border-blue-200 dark:border-blue-800' : 'hover:bg-gray-50 dark:hover:bg-gray-800/50 hover:shadow-md hover:border hover:border-gray-200 dark:hover:border-gray-700'} cursor-pointer group`}>
              <div className="flex-1" onClick={() => setSelected(wl.id)}>
                <div className="font-medium text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">{wl.title}</div>
                <div className="text-sm text-gray-500 dark:text-gray-400">{wl.description}</div>
                {(() => {
                  const r = currentUser?.is_admin ? 'admin' : (currentUser?.id === wl.owner_id ? 'owner' : rolesMap[wl.id] || null);
                  if (!r || r === 'none') return null;
                  return <span className="inline-block bg-blue-100 dark:bg-blue-800 text-blue-800 dark:text-blue-200 text-xs font-medium px-2 py-1 rounded mt-1">{t(r === 'owner' ? 'Owner' : r === 'editor' ? 'Editor' : r === 'viewer' ? 'Viewer' : r === 'admin' ? 'Admin' : r)}</span>;
                })()}
              </div>
              {(currentUser && (currentUser.is_admin || currentUser.id === wl.owner_id || rolesMap[wl.id] === 'editor')) && (
                <button onClick={() => startEdit(wl)} className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-all opacity-0 group-hover:opacity-100">
                  <Edit className="w-5 h-5" />
                </button>
              )}
            </li>
          ))}
        </ul>
      )}

      {mode === 'mine' && !loading && wishlists.length === 0 && (
        <div className="mt-4">
          <p className="text-gray-500 dark:text-gray-400">{t('Aucune liste personnelle trouvée. Les listes où vous êtes collaborateur ou viewer apparaissent sous "Autres".')}</p>
          <button className="mt-2 bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded" onClick={() => window.location.href = '/wishlists/others'}>{t('Voir Autres')}</button>
        </div>
      )}

      <button className="mt-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl font-semibold shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-200 disabled:opacity-50 px-6 py-3" onClick={() => setOpen(true)} disabled={loading}>
        {loading ? <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white inline-block mr-2"></div> : t('Add')}
      </button>

      {open && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50" onClick={() => setOpen(false)}>
          <div className="bg-white/95 dark:bg-gray-800/95 backdrop-blur-md rounded-2xl max-w-md w-full mx-4 shadow-2xl border border-gray-200 dark:border-gray-700" onClick={e => e.stopPropagation()}>
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{t('Add')} {t('Wishlist')}</h2>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">{t('Title')}</label>
                <input
                  type="text"
                  value={form.title}
                  onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">{t('Description')}</label>
                <input
                  type="text"
                  value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                />
              </div>
            </div>
            <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-3">
              <button className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors shadow-md" onClick={() => setOpen(false)}>{t('Cancel')}</button>
              <button className="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-lg font-semibold shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-200 disabled:opacity-50" onClick={handleCreate} disabled={loading}>
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
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{t('Edit')} {t('Wishlist')}</h2>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">{t('Title')}</label>
                <input
                  type="text"
                  value={form.title}
                  onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">{t('Description')}</label>
                <input
                  type="text"
                  value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
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

      <hr className="my-4 border-gray-300 dark:border-gray-600" />
      {selected && <Items wishlistId={selected} ownerId={wishlists.find(w => w.id === selected)?.owner_id} role={rolesMap[selected as number]} />}

      <CollaboratorsDialog open={collabOpen} onClose={() => setCollabOpen(false)} wishlistId={selected as number} canManage={Boolean(currentUser && (currentUser.is_admin || currentUser.id === wishlists.find(w => w.id === selected)?.owner_id))} />
      <ConfirmDialogComponent />
    </div>
  );
}
