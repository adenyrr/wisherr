import React, { useEffect, useState } from 'react';
import { Trash } from 'lucide-react';
import { useConfirm } from './ConfirmDialog';
import api from '../utils/api';
import { useTranslation } from 'react-i18next';

export default function CollaboratorsDialog({ open, onClose, wishlistId, canManage }: { open: boolean, onClose: () => void, wishlistId: number, canManage: boolean }) {
  const { t } = useTranslation();
  const { confirm, ConfirmDialogComponent } = useConfirm();
  const [users, setUsers] = useState<any[]>([]);
  const [audit, setAudit] = useState<any[]>([]);
  const [username, setUsername] = useState('');
  const [role, setRole] = useState('viewer');
  const [error, setError] = useState('');
  const [snack, setSnack] = useState<{ open: boolean; severity: 'success' | 'error'; message: string }>({ open: false, severity: 'success', message: '' });

  const fetch = async () => {
    setError('');
    try {
      const res = await api.get(`/wishlists/${wishlistId}/collaborators`);
      setUsers(res.data || []);
    } catch (e: any) {
      setError(t('Erreur lors de la récupération des collaborateurs'));
    }
  };

  const fetchAudit = async () => {
    try {
      const res = await api.get(`/wishlists/${wishlistId}/audit`);
      setAudit(res.data || []);
    } catch (e) {
      // ignore if not allowed
    }
  };

  useEffect(() => { if (open) { fetch(); fetchAudit(); } }, [open]);

  const handleAdd = async () => {
    try {
      await api.post(`/wishlists/${wishlistId}/collaborators`, { username, role });
      setUsername(''); setRole('viewer');
      fetch(); fetchAudit();
      setSnack({ open: true, severity: 'success', message: t('Collaborator added') });
      setTimeout(() => setSnack(s => ({ ...s, open: false })), 3000);
    } catch (e: any) {
      setError(t('Erreur lors de l\'ajout du collaborateur'));
      setSnack({ open: true, severity: 'error', message: t('Erreur lors de l\'ajout du collaborateur') });
      setTimeout(() => setSnack(s => ({ ...s, open: false })), 3000);
    }
  };

  const handleRemove = async (id: number) => {
    try {
      await api.delete(`/wishlists/${wishlistId}/collaborators/${id}`);
      fetch(); fetchAudit();
      setSnack({ open: true, severity: 'success', message: t('Collaborator removed') });
      setTimeout(() => setSnack(s => ({ ...s, open: false })), 3000);
    } catch (e) {
      setError(t('Erreur lors de la suppression du collaborateur'));
      setSnack({ open: true, severity: 'error', message: t('Erreur lors de la suppression du collaborateur') });
      setTimeout(() => setSnack(s => ({ ...s, open: false })), 3000);
    }
  };

  const handleRoleChange = async (id: number, newRole: string) => {
    try {
      await api.put(`/wishlists/${wishlistId}/collaborators/${id}`, { role: newRole });
      fetch(); fetchAudit();
      setSnack({ open: true, severity: 'success', message: t('Role updated') });
      setTimeout(() => setSnack(s => ({ ...s, open: false })), 3000);
    } catch (e) {
      setError(t('Erreur lors de la modification du rôle'));
      setSnack({ open: true, severity: 'error', message: t('Erreur lors de la modification du rôle') });
      setTimeout(() => setSnack(s => ({ ...s, open: false })), 3000);
    }
  };

  const handleTransfer = async (userId: number) => {
    const confirmed = await confirm(
      t('Transférer la propriété'),
      t('Confirmer le transfert de propriété à cet utilisateur ? Vous perdrez les droits de gestion sur cette liste.')
    );
    if (!confirmed) return;
    try {
      await api.put(`/wishlists/${wishlistId}/transfer_owner`, { user_id: userId });
      fetch(); fetchAudit();
      onClose();
      setSnack({ open: true, severity: 'success', message: t('Propriété transférée avec succès') });
      setTimeout(() => setSnack(s => ({ ...s, open: false })), 3000);
    } catch (e) {
      setError(t('Erreur lors du transfert de propriété'));
      setSnack({ open: true, severity: 'error', message: t('Erreur lors du transfert de propriété') });
      setTimeout(() => setSnack(s => ({ ...s, open: false })), 3000);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg max-w-md w-full mx-4 max-h-96 overflow-y-auto" onClick={e => e.stopPropagation()}>
        <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">{t('Collaborators')}</h2>
        <div>
          {error && <div className="mb-4 text-red-600 dark:text-red-400">{error}</div>}
          <div className="flex gap-2 mb-4">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">{t('Username')}</label>
              <input
                type="text"
                value={username}
                onChange={e => setUsername(e.target.value)}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:text-white"
              />
            </div>
            <div className="w-32">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">{t('Role')}</label>
              <select
                value={role}
                onChange={e => setRole(e.target.value)}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:text-white"
              >
                <option value="viewer">viewer</option>
                <option value="editor">editor</option>
              </select>
            </div>
            <button className="bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded disabled:opacity-50 self-end" onClick={handleAdd} disabled={!canManage}>{t('Add')}</button>
          </div>

          <div className="mb-4">
            <h3 className="text-lg font-semibold mb-2 text-gray-900 dark:text-white">{t('Audit')}</h3>
            <ul className="divide-y divide-gray-200 dark:divide-gray-700">
              {audit.map(a => (
                <li key={a.id} className="py-2">
                  <div className="font-medium text-gray-900 dark:text-white">{a.action} — {new Date(a.created_at).toLocaleString()}</div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">par user:{a.user_id}</div>
                </li>
              ))}
            </ul>
          </div>

          <ul className="divide-y divide-gray-200 dark:divide-gray-700">
            {users.map(u => (
              <li key={u.id} className="flex items-center justify-between py-4">
                <div className="flex-1">
                  <div className="font-medium text-gray-900 dark:text-white">{u.username} {u.role ? '(' + u.role + ')' : ''}</div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">{u.email}</div>
                </div>
                {canManage && (
                  <div className="flex items-center space-x-2">
                    <select
                      value={u.role || 'viewer'}
                      onChange={e => handleRoleChange(u.id, e.target.value)}
                      className="px-2 py-1 border border-gray-300 dark:border-gray-600 rounded dark:bg-gray-700 dark:text-white"
                    >
                      <option value="viewer">viewer</option>
                      <option value="editor">editor</option>
                    </select>
                    <button className="text-blue-600 hover:text-blue-800 text-sm" onClick={() => handleTransfer(u.user_id)}>{t('Transfer ownership')}</button>
                    <button className="text-red-500 hover:text-red-700 p-1" onClick={() => handleRemove(u.id)}><Trash className="w-4 h-4" /></button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        </div>
        <div className="flex justify-end mt-4">
          <button className="bg-gray-500 hover:bg-gray-600 text-white py-2 px-4 rounded" onClick={onClose}>{t('Close')}</button>
        </div>
        {snack.open && (
          <div className={`fixed bottom-4 right-4 p-4 rounded shadow-lg ${snack.severity === 'success' ? 'bg-green-500' : 'bg-red-500'} text-white`}>
            {snack.message}
          </div>
        )}
        <ConfirmDialogComponent />
      </div>
    </div>
  );
}
