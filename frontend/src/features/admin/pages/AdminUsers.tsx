import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import Layout from '../../../shared/components/Layout';
import LucideIcon from '../../../shared/components/LucideIcon';
import api from '../../../shared/utils/api';
import { useToast } from '../../../shared/components/Toast';
import { useConfirm } from '../../../shared/components/ConfirmDialog';

interface User {
  id: number;
  username: string;
  email: string;
  is_admin: boolean;
  is_active: boolean;
  created_at: string;
  last_login?: string;
}

export default function AdminUsers() {
  const { t } = useTranslation();
  const { showSuccess, showError } = useToast();
  const { confirm, ConfirmDialogComponent } = useConfirm();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState<User | null>(null);
  const [newUser, setNewUser] = useState({ username: '', email: '', password: '', is_admin: false });
  const [editUser, setEditUser] = useState({ username: '', email: '', password: '', is_admin: false, locale: '' });
  const [oidcEnabled, setOidcEnabled] = useState(false);

  useEffect(() => {
    fetchUsers();
    checkOidcStatus();
  }, []);

  const checkOidcStatus = async () => {
    try {
      const res = await api.get('/admin/config');
      const oidc = res.data?.find((c: any) => c.key === 'oidc_enabled');
      setOidcEnabled(oidc?.value === 'true');
    } catch (err) {
      console.error('Failed to check OIDC status:', err);
    }
  };

  const fetchUsers = async () => {
    try {
      const res = await api.get('/admin/users');
      setUsers(res.data || []);
    } catch (err) {
      console.error('Failed to fetch users:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleAdmin = async (userId: number) => {
    try {
      const res = await api.put(`/admin/users/${userId}/toggle-admin`);
      // Mettre à jour localement immédiatement pour feedback visuel
      setUsers(prev => prev.map(u => 
        u.id === userId ? { ...u, is_admin: res.data?.is_admin ?? !u.is_admin } : u
      ));
      showSuccess(res.data?.is_admin ? 'Utilisateur promu admin' : 'Droits admin retirés');
    } catch (err: any) {
      showError(err.response?.data?.detail || err.response?.data?.error || 'Erreur');
      fetchUsers(); // Recharger en cas d'erreur pour sync
    }
  };

  const handleDeleteUser = async (userId: number, username: string) => {
    const confirmed = await confirm(
      'Supprimer l\'utilisateur',
      `Êtes-vous sûr de vouloir supprimer l'utilisateur "${username}" ? Cette action est irréversible.`,
      { variant: 'danger', confirmLabel: 'Supprimer' }
    );
    if (!confirmed) return;
    try {
      await api.delete(`/admin/users/${userId}`);
      showSuccess('Utilisateur supprimé avec succès !');
      fetchUsers();
    } catch (err: any) {
      showError(err.response?.data?.detail || 'Erreur lors de la suppression');
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/admin/users', newUser);
      setShowCreateModal(false);
      setNewUser({ username: '', email: '', password: '', is_admin: false });
      showSuccess('Utilisateur créé avec succès !');
      fetchUsers();
    } catch (err: any) {
      showError(err.response?.data?.detail || 'Erreur lors de la création');
    }
  };

  const openEditModal = (user: User) => {
    setEditUser({
      username: user.username,
      email: user.email,
      password: '',
      is_admin: user.is_admin,
      locale: ''
    });
    setShowEditModal(user);
  };

  const handleEditUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!showEditModal) return;
    try {
      const payload: any = {};
      if (editUser.username !== showEditModal.username) payload.username = editUser.username;
      if (editUser.email !== showEditModal.email) payload.email = editUser.email;
      if (editUser.password) payload.password = editUser.password;
      if (editUser.is_admin !== showEditModal.is_admin) payload.is_admin = editUser.is_admin;
      
      await api.put(`/admin/users/${showEditModal.id}`, payload);
      setShowEditModal(null);
      showSuccess('Utilisateur modifié avec succès !');
      fetchUsers();
    } catch (err: any) {
      showError(err.response?.data?.detail || 'Erreur lors de la modification');
    }
  };

  const filteredUsers = users.filter(u => 
    u.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  return (
    <Layout>
      <ConfirmDialogComponent />
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-white mb-1">
              <LucideIcon name="users" size={28} className="inline-block mr-3 text-amber-400" />
              {t('Gestion des membres')}
            </h1>
            <p className="text-gray-400">
              {users.length} {t('utilisateur(s) enregistré(s)')}
            </p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-black font-medium rounded-xl transition-colors"
          >
            <LucideIcon name="user-plus" size={20} />
            <span>{t('Nouvel utilisateur')}</span>
          </button>
        </div>

        {/* Search */}
        <div className="mb-6">
          <div className="relative">
            <LucideIcon 
              name="search" 
              size={20} 
              className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" 
            />
            <input
              type="text"
              placeholder={t('Rechercher par nom ou email...')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-3 rounded-xl bg-gray-800/50 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-amber-500"
            />
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="rounded-2xl bg-gray-800/50 border border-white/10 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/10">
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">
                      {t('Utilisateur')}
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">
                      {t('Email')}
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">
                      {t('Rôle')}
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">
                      {t('Inscription')}
                    </th>
                    <th className="px-6 py-4 text-right text-xs font-semibold text-gray-400 uppercase tracking-wider">
                      {t('Actions')}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {filteredUsers.map((user) => (
                    <tr key={user.id} className="hover:bg-white/5 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-medium">
                            {user.username.charAt(0).toUpperCase()}
                          </div>
                          <span className="text-white font-medium">{user.username}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-gray-400">
                        {user.email}
                      </td>
                      <td className="px-6 py-4">
                        {user.is_admin ? (
                          <span className="px-2 py-1 text-xs font-medium bg-amber-500/20 text-amber-400 rounded-full">
                            Admin
                          </span>
                        ) : (
                          <span className="px-2 py-1 text-xs font-medium bg-gray-500/20 text-gray-400 rounded-full">
                            Utilisateur
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-gray-500 text-sm">
                        {formatDate(user.created_at)}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-end gap-2">
                          {!oidcEnabled && (
                            <button
                              onClick={() => openEditModal(user)}
                              className="p-2 rounded-lg bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 transition-colors"
                              title={t('Modifier')}
                            >
                              <LucideIcon name="edit" size={18} />
                            </button>
                          )}
                          <button
                            onClick={() => handleToggleAdmin(user.id)}
                            className={`p-2 rounded-lg transition-colors ${
                              user.is_admin 
                                ? 'bg-amber-500/20 text-amber-400 hover:bg-amber-500/30'
                                : 'bg-gray-500/20 text-gray-400 hover:bg-gray-500/30'
                            }`}
                            title={user.is_admin ? t('Retirer admin') : t('Promouvoir admin')}
                          >
                            <LucideIcon name="shield" size={18} />
                          </button>
                          <button
                            onClick={() => handleDeleteUser(user.id, user.username)}
                            className="p-2 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors"
                            title={t('Supprimer')}
                          >
                            <LucideIcon name="trash-2" size={18} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {filteredUsers.length === 0 && (
              <div className="text-center py-12 text-gray-500">
                <LucideIcon name="users" size={48} className="mx-auto mb-4 opacity-50" />
                <p>{t('Aucun utilisateur trouvé')}</p>
              </div>
            )}
          </div>
        )}

        {/* Create User Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="w-full max-w-md rounded-2xl bg-gray-900 border border-white/10 shadow-2xl">
              <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
                <h2 className="text-lg font-semibold text-white">{t('Nouvel utilisateur')}</h2>
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="p-2 rounded-lg hover:bg-white/10 text-gray-400"
                >
                  <LucideIcon name="x" size={20} />
                </button>
              </div>
              <form onSubmit={handleCreateUser} className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    {t('Nom d\'utilisateur')} *
                  </label>
                  <input
                    type="text"
                    value={newUser.username}
                    onChange={(e) => setNewUser(prev => ({ ...prev, username: e.target.value }))}
                    className="w-full px-4 py-3 rounded-xl bg-gray-800 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-amber-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    {t('Email')} *
                  </label>
                  <input
                    type="email"
                    value={newUser.email}
                    onChange={(e) => setNewUser(prev => ({ ...prev, email: e.target.value }))}
                    className="w-full px-4 py-3 rounded-xl bg-gray-800 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-amber-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    {t('Mot de passe')} *
                  </label>
                  <input
                    type="password"
                    value={newUser.password}
                    onChange={(e) => setNewUser(prev => ({ ...prev, password: e.target.value }))}
                    className="w-full px-4 py-3 rounded-xl bg-gray-800 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-amber-500"
                    required
                  />
                </div>
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="is_admin"
                    checked={newUser.is_admin}
                    onChange={(e) => setNewUser(prev => ({ ...prev, is_admin: e.target.checked }))}
                    className="w-5 h-5 rounded bg-gray-800 border-white/10 text-amber-500 focus:ring-amber-500"
                  />
                  <label htmlFor="is_admin" className="text-gray-300">
                    {t('Administrateur')}
                  </label>
                </div>
                <div className="flex justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="px-4 py-2 rounded-lg text-gray-400 hover:text-white transition-colors"
                  >
                    {t('Annuler')}
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-black font-medium rounded-lg transition-colors"
                  >
                    {t('Créer')}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Edit User Modal */}
        {showEditModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="w-full max-w-md rounded-2xl bg-gray-900 border border-white/10 shadow-2xl">
              <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
                <h2 className="text-lg font-semibold text-white">{t('Modifier l\'utilisateur')}</h2>
                <button
                  onClick={() => setShowEditModal(null)}
                  className="p-2 rounded-lg hover:bg-white/10 text-gray-400"
                >
                  <LucideIcon name="x" size={20} />
                </button>
              </div>
              <form onSubmit={handleEditUser} className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    {t('Nom d\'utilisateur')}
                  </label>
                  <input
                    type="text"
                    value={editUser.username}
                    onChange={(e) => setEditUser(prev => ({ ...prev, username: e.target.value }))}
                    className="w-full px-4 py-3 rounded-xl bg-gray-800 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    {t('Email')}
                  </label>
                  <input
                    type="email"
                    value={editUser.email}
                    onChange={(e) => setEditUser(prev => ({ ...prev, email: e.target.value }))}
                    className="w-full px-4 py-3 rounded-xl bg-gray-800 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    {t('Nouveau mot de passe')} ({t('laisser vide pour ne pas changer')})
                  </label>
                  <input
                    type="password"
                    value={editUser.password}
                    onChange={(e) => setEditUser(prev => ({ ...prev, password: e.target.value }))}
                    placeholder="••••••••"
                    className="w-full px-4 py-3 rounded-xl bg-gray-800 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="edit_is_admin"
                    checked={editUser.is_admin}
                    onChange={(e) => setEditUser(prev => ({ ...prev, is_admin: e.target.checked }))}
                    className="w-5 h-5 rounded bg-gray-800 border-white/10 text-blue-500 focus:ring-blue-500"
                  />
                  <label htmlFor="edit_is_admin" className="text-gray-300">
                    {t('Administrateur')}
                  </label>
                </div>
                <div className="flex justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowEditModal(null)}
                    className="px-4 py-2 rounded-lg text-gray-400 hover:text-white transition-colors"
                  >
                    {t('Annuler')}
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors"
                  >
                    {t('Enregistrer')}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
