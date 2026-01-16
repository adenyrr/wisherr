import React, { useEffect, useState } from 'react';
import { Trash } from 'lucide-react';
import { useConfirm } from '../../../shared/components/ConfirmDialog';
import api from '../../../shared/utils/api';
import { useTranslation } from 'react-i18next';

interface MetadataLog {
  id: number;
  url: string;
  wishlist_id?: number;
  item_id?: number;
  payload?: string;
  error?: string;
  created_at?: string;
}

export default function Admin() {
  const { t } = useTranslation();
  const { confirm, ConfirmDialogComponent } = useConfirm();
  const [logs, setLogs] = useState<MetadataLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const fetchLogs = async () => {
    setError('');
    setLoading(true);
    try {
      const res = await api.get('/metadata/logs');
      setLogs(res.data);
    } catch (e: any) {
      setError(t('Erreur lors de la récupération des logs'));
    } finally {
      setLoading(false);
    }
  };

  const [users, setUsers] = useState<any[]>([]);
  const fetchUsers = async () => {
    try {
      const res = await api.get('/admin/users');
      setUsers(res.data || []);
    } catch (e: any) {
      // ignore or show a light message
    }
  };

  const [createOpen, setCreateOpen] = useState(false);
  const [newUser, setNewUser] = useState({ username: '', email: '', password: '', is_admin: false });
  const [editUser, setEditUser] = useState<any | null>(null);
  const [snack, setSnack] = useState<{ open: boolean; severity: 'success' | 'error'; message: string }>({ open: false, severity: 'success', message: '' });
  const closeSnack = () => setSnack({ ...snack, open: false });

  const handleDeleteUser = async (userId: number) => {
    const confirmed = await confirm(
      t('Supprimer l\'utilisateur'),
      t('Êtes-vous sûr de vouloir supprimer cet utilisateur ? Toutes ses listes seront également supprimées.')
    );
    if (!confirmed) return;
    try {
      await api.delete(`/admin/users/${userId}`);
      fetchUsers();
      setSnack({ open: true, severity: 'success', message: t('User deleted') });
      setTimeout(closeSnack, 3000);
    } catch (e: any) {
      setSnack({ open: true, severity: 'error', message: t('Erreur lors de la suppression de l\'utilisateur') });
      setTimeout(closeSnack, 3000);
    }
  };

  const handleDeleteLog = async (logId: number) => {
    const confirmed = await confirm(
      t('Supprimer le log'),
      t('Êtes-vous sûr de vouloir supprimer ce log ?')
    );
    if (!confirmed) return;
    try {
      await api.delete(`/metadata/logs/${logId}`);
      fetchLogs();
      setSnack({ open: true, severity: 'success', message: t('Log deleted') });
      setTimeout(closeSnack, 3000);
    } catch (e: any) {
      setSnack({ open: true, severity: 'error', message: t('Erreur lors de la suppression du log') });
      setTimeout(closeSnack, 3000);
    }
  };

  useEffect(() => { fetchLogs(); fetchUsers(); }, []);

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('Admin')}</h1>
        <button className="bg-gradient-to-r from-gray-600 to-gray-700 hover:from-gray-700 hover:to-gray-800 text-white py-2 px-4 rounded-xl font-semibold shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-200 disabled:opacity-50" onClick={fetchLogs} disabled={loading}>
          {loading ? <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white inline-block mr-2"></div> : t('Refresh')}
        </button>
      </div>

      {error && <p className="text-red-600 dark:text-red-400 mb-4">{error}</p>}

      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">{t('Users')}</h2>
          <button className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white py-2 px-4 rounded-xl font-semibold shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-200" onClick={() => { setNewUser({ username: '', email: '', password: '', is_admin: false }); setCreateOpen(true); setEditUser(null); }}>{t('Create user')}</button>
        </div>
        <ul className="space-y-3">
          {users.map(u => (
            <li key={u.id} className="flex items-center justify-between p-4 bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-200 dark:border-gray-700 hover:bg-white/70 dark:hover:bg-gray-800/70 transition-all duration-200 group">
              <div>
                <div className="font-medium text-gray-900 dark:text-white">{u.username}{u.is_admin ? ' (admin)' : ''}</div>
                <div className="text-sm text-gray-500 dark:text-gray-400">{u.email}</div>
              </div>
              <div className="flex space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <button className="bg-yellow-500 hover:bg-yellow-600 text-white py-1 px-3 rounded-lg text-sm shadow-md hover:shadow-lg transform hover:-translate-y-0.5 transition-all" onClick={async () => {
                  try {
                    await api.put(`/admin/users/${u.id}`, { is_admin: !u.is_admin });
                    fetchUsers();
                    setSnack({ open: true, severity: 'success', message: t('User updated') });
                    setTimeout(closeSnack, 3000);
                  } catch (e: any) {
                    setSnack({ open: true, severity: 'error', message: t('Erreur lors de la mise à jour de l\'utilisateur') });
                    setTimeout(closeSnack, 3000);
                  }
                }}>{u.is_admin ? t('Revoke admin') : t('Make admin')}</button>
                <button className="bg-blue-500 hover:bg-blue-600 text-white py-1 px-3 rounded-lg text-sm shadow-md hover:shadow-lg transform hover:-translate-y-0.5 transition-all" onClick={() => { setEditUser(u); setNewUser({ username: u.username, email: u.email, password: '', is_admin: !!u.is_admin }); setCreateOpen(true); }}>{t('Edit')}</button>
                <button className="text-red-500 hover:text-red-700 p-1 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all" onClick={() => handleDeleteUser(u.id)}><Trash className="w-4 h-4" /></button>
              </div>
            </li>
          ))}
        </ul>
      </div>

      {createOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50" onClick={() => setCreateOpen(false)}>
          <div className="bg-white/95 dark:bg-gray-800/95 backdrop-blur-md rounded-2xl max-w-md w-full mx-4 shadow-2xl border border-gray-200 dark:border-gray-700" onClick={e => e.stopPropagation()}>
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{editUser ? t('Edit user') : t('Create user')}</h2>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">{t('Username')}</label>
                <input
                  type="text"
                  value={newUser.username}
                  onChange={(e) => setNewUser({ ...newUser, username: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">{t('Email')}</label>
                <input
                  type="email"
                  value={newUser.email}
                  onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">{t('Password')}</label>
                <input
                  type="password"
                  value={newUser.password}
                  onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                />
                {editUser && <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{t('Leave empty to keep current password')}</p>}
              </div>
              <div>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={newUser.is_admin}
                    onChange={(e) => setNewUser({ ...newUser, is_admin: e.target.checked })}
                    className="mr-3 w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
                  />
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{t('Is admin')}</span>
                </label>
              </div>
            </div>
            <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-3">
              <button className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors shadow-md" onClick={() => setCreateOpen(false)}>{t('Cancel')}</button>
              <button className="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-lg font-semibold shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-200" onClick={async () => {
                try {
                  if (editUser) {
                    const payload: any = { username: newUser.username, email: newUser.email, is_admin: newUser.is_admin };
                    if (newUser.password) payload.password = newUser.password;
                    await api.put(`/admin/users/${editUser.id}`, payload);
                    setSnack({ open: true, severity: 'success', message: t('User updated') });
                  } else {
                    await api.post('/admin/users', newUser);
                    setSnack({ open: true, severity: 'success', message: t('User created') });
                  }
                  setCreateOpen(false);
                  fetchUsers();
                  setTimeout(closeSnack, 3000);
                } catch (e: any) {
                  setSnack({ open: true, severity: 'error', message: t('Erreur lors de la sauvegarde de l\'utilisateur') });
                  setTimeout(closeSnack, 3000);
                }
              }}>{t('Save')}</button>
            </div>
          </div>
        </div>
      )}

      <ul className="space-y-3">
        {logs.map(l => (
          <li key={l.id} className="p-4 bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-200 dark:border-gray-700 hover:bg-white/70 dark:hover:bg-gray-800/70 transition-all duration-200 group">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="font-medium text-gray-900 dark:text-white">{l.url} — {l.created_at}</div>
                {l.error && <div className="text-red-600 dark:text-red-400 mt-1">{t('Error')}: {l.error}</div>}
                <div className="text-sm text-gray-500 dark:text-gray-400">{l.payload}</div>
                <div className="text-sm text-gray-500 dark:text-gray-400">{l.item_id ? ` item:${l.item_id}` : ''}{l.wishlist_id ? ` wishlist:${l.wishlist_id}` : ''}</div>
              </div>
              <button className="text-red-500 hover:text-red-700 p-2 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all opacity-0 group-hover:opacity-100" onClick={() => handleDeleteLog(l.id)}><Trash className="w-4 h-4" /></button>
            </div>
          </li>
        ))}
      </ul>

      {snack.open && (
        <div className={`fixed bottom-4 right-4 p-4 rounded-xl shadow-2xl border backdrop-blur-md ${snack.severity === 'success' ? 'bg-green-500/90 border-green-400' : 'bg-red-500/90 border-red-400'} text-white`}>
          <div className="flex items-center gap-3">
            <span className="font-semibold">{snack.message}</span>
            <button onClick={closeSnack} className="underline hover:no-underline font-medium">Fermer</button>
          </div>
        </div>
      )}
      <ConfirmDialogComponent />
    </div>
  );
}
