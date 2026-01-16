import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import Layout from '../../../shared/components/Layout';
import LucideIcon from '../../../shared/components/LucideIcon';
import { useAuthStore } from '../../../shared/utils/store';
import api from '../../../shared/utils/api';
import { useToast } from '../../../shared/components/Toast';
import { useConfirm } from '../../../shared/components/ConfirmDialog';

interface GroupMember {
  id: number;
  user_id: number;
  username: string;
  added_at: string;
}

interface Group {
  id: number;
  name: string;
  description: string | null;
  created_at: string;
  owner_id: number;
  member_count?: number;
  members?: GroupMember[];
}

export default function Groups() {
  const { t } = useTranslation();
  const currentUser = useAuthStore((s) => s.currentUser);
  const { showSuccess, showError } = useToast();
  const { confirm, ConfirmDialogComponent } = useConfirm();
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState<Group | null>(null);
  const [showMembersModal, setShowMembersModal] = useState<Group | null>(null);
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupDesc, setNewGroupDesc] = useState('');
  const [editGroupName, setEditGroupName] = useState('');
  const [editGroupDesc, setEditGroupDesc] = useState('');
  const [newMemberUsername, setNewMemberUsername] = useState('');

  useEffect(() => {
    fetchGroups();
  }, []);

  const fetchGroups = async () => {
    try {
      const res = await api.get('/groups');
      setGroups(res.data || []);
    } catch (err) {
      console.error('Failed to fetch groups:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/groups', { 
        name: newGroupName, 
        description: newGroupDesc || null 
      });
      setShowCreateModal(false);
      setNewGroupName('');
      setNewGroupDesc('');
      showSuccess('Groupe créé avec succès !');
      fetchGroups();
    } catch (err: any) {
      showError(err.response?.data?.detail || 'Erreur lors de la création');
    }
  };

  const handleDeleteGroup = async (groupId: number) => {
    const confirmed = await confirm(
      'Supprimer le groupe',
      'Êtes-vous sûr de vouloir supprimer ce groupe ? Cette action est irréversible.',
      { variant: 'danger', confirmLabel: 'Supprimer' }
    );
    if (!confirmed) return;
    try {
      await api.delete(`/groups/${groupId}`);
      showSuccess('Groupe supprimé avec succès !');
      fetchGroups();
    } catch (err: any) {
      showError(err.response?.data?.detail || 'Erreur lors de la suppression');
    }
  };

  const openEditModal = (group: Group) => {
    setEditGroupName(group.name);
    setEditGroupDesc(group.description || '');
    setShowEditModal(group);
  };

  const handleEditGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!showEditModal) return;
    try {
      await api.put(`/groups/${showEditModal.id}`, { 
        name: editGroupName, 
        description: editGroupDesc || null 
      });
      setShowEditModal(null);
      setEditGroupName('');
      setEditGroupDesc('');
      showSuccess('Groupe modifié avec succès !');
      fetchGroups();
    } catch (err: any) {
      showError(err.response?.data?.detail || 'Erreur lors de la modification');
    }
  };

  const handleAddMember = async (groupId: number) => {
    if (!newMemberUsername.trim()) {
      showError('Veuillez entrer un nom d\'utilisateur');
      return;
    }
    try {
      await api.post(`/groups/${groupId}/members`, { 
        username: newMemberUsername.trim() 
      });
      setNewMemberUsername('');
      showSuccess('Membre ajouté avec succès !');
      // Refresh group members
      const res = await api.get(`/groups/${groupId}`);
      setShowMembersModal(res.data);
      fetchGroups();
    } catch (err: any) {
      showError(err.response?.data?.detail || 'Erreur lors de l\'ajout');
    }
  };

  const handleRemoveMember = async (groupId: number, userId: number) => {
    const confirmed = await confirm(
      'Retirer le membre',
      'Êtes-vous sûr de vouloir retirer ce membre du groupe ?',
      { variant: 'warning', confirmLabel: 'Retirer' }
    );
    if (!confirmed) return;
    try {
      await api.delete(`/groups/${groupId}/members/${userId}`);
      showSuccess('Membre retiré avec succès !');
      // Refresh group members
      const res = await api.get(`/groups/${groupId}`);
      setShowMembersModal(res.data);
      fetchGroups();
    } catch (err: any) {
      showError(err.response?.data?.detail || 'Erreur lors du retrait');
    }
  };

  const handleLeaveGroup = async (groupId: number) => {
    const confirmed = await confirm(
      'Quitter le groupe',
      'Êtes-vous sûr de vouloir quitter ce groupe ?',
      { variant: 'warning', confirmLabel: 'Quitter' }
    );
    if (!confirmed) return;
    try {
      // Le membre se retire lui-même du groupe
      const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
      await api.delete(`/groups/${groupId}/members/${currentUser.id}`);
      showSuccess('Vous avez quitté le groupe');
      fetchGroups();
    } catch (err: any) {
      showError(err.response?.data?.detail || 'Erreur lors de la sortie du groupe');
    }
  };

  const openMembersModal = async (group: Group) => {
    try {
      const res = await api.get(`/groups/${group.id}`);
      setShowMembersModal(res.data);
      setNewMemberUsername('');
    } catch (err) {
      console.error('Failed to fetch group details:', err);
    }
  };

  return (
    <Layout>
      <ConfirmDialogComponent />
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-white mb-1">
              <LucideIcon name="users" size={28} className="inline-block mr-3 text-purple-400" />
              {t('Famille & Groupes')}
            </h1>
            <p className="text-gray-400">
              {t('Gérez vos groupes et leurs membres pour faciliter le partage de listes')}
            </p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-purple-500 hover:bg-purple-600 text-white rounded-xl transition-colors"
          >
            <LucideIcon name="plus" size={20} />
            <span>{t('Nouveau groupe')}</span>
          </button>
        </div>

        {/* Groups List */}
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : groups.length === 0 ? (
          <div className="text-center py-16 rounded-2xl bg-gray-800/50 border border-white/10">
            <LucideIcon name="users" size={48} className="mx-auto mb-4 text-gray-500 opacity-50" />
            <h3 className="text-lg font-medium text-white mb-2">{t('Aucun groupe')}</h3>
            <p className="text-gray-400 mb-6">
              {t('Créez votre premier groupe pour partager des listes avec votre famille ou vos amis')}
            </p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-purple-500/20 text-purple-400 rounded-lg hover:bg-purple-500/30 transition-colors"
            >
              <LucideIcon name="plus" size={18} />
              <span>{t('Créer un groupe')}</span>
            </button>
          </div>
        ) : (
          <div className="grid gap-4">
            {groups.map((group) => (
              <div
                key={group.id}
                className="p-6 rounded-2xl bg-gray-800/50 border border-white/10 hover:border-purple-500/30 transition-all"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-xl bg-purple-500/20 flex items-center justify-center">
                      <LucideIcon name="users" size={24} className="text-purple-400" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-white">{group.name}</h3>
                      {group.description && (
                        <p className="text-sm text-gray-400 mt-1">{group.description}</p>
                      )}
                      <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                        <span className="flex items-center gap-1">
                          <LucideIcon name="user" size={14} />
                          {group.member_count || 0} {t('membre(s)')}
                        </span>
                        <span>
                          {t('Créé le')} {new Date(group.created_at).toLocaleDateString('fr-FR')}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {/* Seul l'owner peut gérer les membres */}
                    {group.owner_id === currentUser?.id ? (
                      <>
                        <button
                          onClick={() => openMembersModal(group)}
                          className="p-2 rounded-lg bg-purple-500/10 text-purple-400 hover:bg-purple-500/20 transition-colors"
                          title={t('Gérer les membres')}
                        >
                          <LucideIcon name="user-plus" size={18} />
                        </button>
                        <button
                          onClick={() => openEditModal(group)}
                          className="p-2 rounded-lg bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 transition-colors"
                          title={t('Modifier')}
                        >
                          <LucideIcon name="edit" size={18} />
                        </button>
                        <button
                          onClick={() => handleDeleteGroup(group.id)}
                          className="p-2 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors"
                          title={t('Supprimer')}
                        >
                          <LucideIcon name="trash-2" size={18} />
                        </button>
                      </>
                    ) : (
                      /* Membre non-owner : peut quitter le groupe */
                      <button
                        onClick={() => handleLeaveGroup(group.id)}
                        className="p-2 rounded-lg bg-orange-500/10 text-orange-400 hover:bg-orange-500/20 transition-colors"
                        title={t('Quitter le groupe')}
                      >
                        <LucideIcon name="log-out" size={18} />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Create Group Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="w-full max-w-md rounded-2xl bg-gray-900 border border-white/10 shadow-2xl">
              <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
                <h2 className="text-lg font-semibold text-white">{t('Nouveau groupe')}</h2>
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="p-2 rounded-lg hover:bg-white/10 text-gray-400"
                >
                  <LucideIcon name="x" size={20} />
                </button>
              </div>
              <form onSubmit={handleCreateGroup} className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    {t('Nom du groupe')} *
                  </label>
                  <input
                    type="text"
                    value={newGroupName}
                    onChange={(e) => setNewGroupName(e.target.value)}
                    placeholder={t('Ex: Famille Dupont, Amis proches...')}
                    className="w-full px-4 py-3 rounded-xl bg-gray-800 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    {t('Description')} ({t('optionnel')})
                  </label>
                  <textarea
                    value={newGroupDesc}
                    onChange={(e) => setNewGroupDesc(e.target.value)}
                    placeholder={t('Une description pour ce groupe...')}
                    className="w-full px-4 py-3 rounded-xl bg-gray-800 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 resize-none"
                    rows={3}
                  />
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
                    className="px-4 py-2 bg-purple-500 hover:bg-purple-600 text-white rounded-lg transition-colors"
                  >
                    {t('Créer')}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Edit Group Modal */}
        {showEditModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="w-full max-w-md rounded-2xl bg-gray-900 border border-white/10 shadow-2xl">
              <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
                <h2 className="text-lg font-semibold text-white">{t('Modifier le groupe')}</h2>
                <button
                  onClick={() => setShowEditModal(null)}
                  className="p-2 rounded-lg hover:bg-white/10 text-gray-400"
                >
                  <LucideIcon name="x" size={20} />
                </button>
              </div>
              <form onSubmit={handleEditGroup} className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    {t('Nom du groupe')} *
                  </label>
                  <input
                    type="text"
                    value={editGroupName}
                    onChange={(e) => setEditGroupName(e.target.value)}
                    placeholder={t('Ex: Famille Dupont, Amis proches...')}
                    className="w-full px-4 py-3 rounded-xl bg-gray-800 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    {t('Description')} ({t('optionnel')})
                  </label>
                  <textarea
                    value={editGroupDesc}
                    onChange={(e) => setEditGroupDesc(e.target.value)}
                    placeholder={t('Une description pour ce groupe...')}
                    className="w-full px-4 py-3 rounded-xl bg-gray-800 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 resize-none"
                    rows={3}
                  />
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

        {/* Members Modal */}
        {showMembersModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="w-full max-w-lg rounded-2xl bg-gray-900 border border-white/10 shadow-2xl">
              <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
                <h2 className="text-lg font-semibold text-white">
                  {t('Membres de')} {showMembersModal.name}
                </h2>
                <button
                  onClick={() => setShowMembersModal(null)}
                  className="p-2 rounded-lg hover:bg-white/10 text-gray-400"
                >
                  <LucideIcon name="x" size={20} />
                </button>
              </div>
              <div className="p-6 space-y-4">
                {/* Add member form */}
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newMemberUsername}
                    onChange={(e) => setNewMemberUsername(e.target.value)}
                    placeholder={t('Pseudo ou email de l\'utilisateur...')}
                    className="flex-1 px-4 py-2 rounded-xl bg-gray-800 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500"
                  />
                  <button
                    onClick={() => handleAddMember(showMembersModal.id)}
                    className="px-4 py-2 bg-purple-500 hover:bg-purple-600 text-white rounded-xl transition-colors"
                  >
                    <LucideIcon name="user-plus" size={18} />
                  </button>
                </div>

                {/* Members list */}
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {(showMembersModal.members || []).map((member) => (
                    <div
                      key={member.id}
                      className="flex items-center justify-between p-3 rounded-xl bg-gray-800/50"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-purple-500/20 flex items-center justify-center text-purple-400 font-medium">
                          {member.username?.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="text-white font-medium">{member.username}</p>
                          <p className="text-xs text-gray-500">
                            {member.user_id === showMembersModal.owner_id ? t('Propriétaire') : t('Membre')}
                          </p>
                        </div>
                      </div>
                      {member.user_id !== showMembersModal.owner_id && showMembersModal.owner_id === currentUser?.id && (
                        <button
                          onClick={() => handleRemoveMember(showMembersModal.id, member.user_id)}
                          className="p-2 rounded-lg text-red-400 hover:bg-red-500/20 transition-colors"
                        >
                          <LucideIcon name="user-minus" size={18} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
