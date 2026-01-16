import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import Layout from '../../../shared/components/Layout';
import LucideIcon from '../../../shared/components/LucideIcon';
import api from '../../../shared/utils/api';
import { useAuthStore } from '../../../shared/utils/store';
import { useToast } from '../../../shared/components/Toast';

interface SiteConfig {
  oidc_enabled?: string;
  oidc_provider_url?: string;
}

export default function ProfileNew() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const currentUser = useAuthStore((s) => s.currentUser);
  const setCurrentUser = useAuthStore((s) => s.setCurrentUser);
  const logout = useAuthStore((s) => s.logout);
  const { showSuccess, showError } = useToast();
  
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    username: '',
    email: '',
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
    locale: 'fr',
    theme: 'dark'
  });
  const [loading, setLoading] = useState(false);
  const [siteConfig, setSiteConfig] = useState<SiteConfig | null>(null);
  const [configLoading, setConfigLoading] = useState(true);

  useEffect(() => {
    if (currentUser) {
      setForm(prev => ({
        ...prev,
        username: currentUser.username || '',
        email: currentUser.email || '',
        locale: currentUser.locale || 'fr',
        theme: currentUser.theme || 'dark'
      }));
    }
    fetchSiteConfig();
  }, [currentUser]);

  const fetchSiteConfig = async () => {
    try {
      // Try to get OIDC config - this might fail for non-admins, that's ok
      const res = await api.get('/admin/config').catch(() => ({ data: [] }));
      const configs = Array.isArray(res.data) ? res.data : [];
      const configMap: SiteConfig = {};
      configs.forEach((c: any) => {
        configMap[c.key as keyof SiteConfig] = c.value;
      });
      setSiteConfig(configMap);
    } catch (err) {
      // Non-admin users can't access config, default to local auth
      setSiteConfig({ oidc_enabled: 'false' });
    } finally {
      setConfigLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (form.newPassword && form.newPassword !== form.confirmPassword) {
      showError('Les mots de passe ne correspondent pas');
      return;
    }
    
    if (form.newPassword && !form.currentPassword) {
      showError('Le mot de passe actuel est requis pour changer de mot de passe');
      return;
    }

    setLoading(true);
    try {
      const payload: any = {
        username: form.username,
        email: form.email,
        locale: form.locale,
        theme: form.theme
      };
      
      if (form.newPassword) {
        payload.current_password = form.currentPassword;
        payload.new_password = form.newPassword;
      }

      const res = await api.put('/auth/profile', payload);
      setCurrentUser(res.data);
      
      // Appliquer les changements de langue immédiatement
      if (form.locale) {
        import('../../../shared/utils/i18n').then(i18n => {
          i18n.default.changeLanguage(form.locale);
        });
      }
      
      showSuccess('Profil mis à jour avec succès !');
      setEditing(false);
      setForm(prev => ({ ...prev, currentPassword: '', newPassword: '', confirmPassword: '' }));
    } catch (err: any) {
      showError(err.response?.data?.detail || 'Erreur lors de la mise à jour du profil');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const isOidcEnabled = siteConfig?.oidc_enabled === 'true';

  if (!currentUser) {
    return (
      <Layout>
        <div className="max-w-2xl mx-auto px-4 py-16 text-center">
          <LucideIcon name="user-x" size={48} className="mx-auto mb-4 text-gray-500" />
          <h2 className="text-xl font-semibold text-white mb-4">{t('Non connecté')}</h2>
          <button
            onClick={() => navigate('/login')}
            className="px-4 py-2 bg-indigo-500 hover:bg-indigo-600 text-white rounded-lg transition-colors"
          >
            {t('Se connecter')}
          </button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-2xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-white mb-1">
            <LucideIcon name="user" size={28} className="inline-block mr-3 text-indigo-400" />
            {t('Mon profil')}
          </h1>
          <p className="text-gray-400">
            {t('Gérez vos informations personnelles')}
          </p>
        </div>

        {/* Profile Card */}
        <div className="rounded-2xl bg-gray-800/50 border border-white/10 overflow-hidden">
          {/* Avatar section */}
          <div className="p-6 border-b border-white/10 bg-gradient-to-r from-indigo-500/10 to-purple-500/10">
            <div className="flex items-center gap-4">
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-3xl font-bold">
                {currentUser.username?.charAt(0).toUpperCase()}
              </div>
              <div>
                <h2 className="text-xl font-semibold text-white">{currentUser.username}</h2>
                <p className="text-gray-400">{currentUser.email}</p>
                {currentUser.is_admin && (
                  <span className="inline-block mt-2 px-2 py-0.5 text-xs font-medium bg-amber-500/20 text-amber-400 rounded-full">
                    Administrateur
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="p-6">
            {configLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : isOidcEnabled ? (
              /* OIDC Mode - Read-only profile */
              <div className="text-center py-8">
                <div className="w-16 h-16 rounded-full bg-blue-500/20 flex items-center justify-center mx-auto mb-4">
                  <LucideIcon name="shield-check" size={32} className="text-blue-400" />
                </div>
                <h3 className="text-lg font-medium text-white mb-2">
                  {t('Authentification OIDC activée')}
                </h3>
                <p className="text-gray-400 mb-4 max-w-md mx-auto">
                  {t('Votre compte est géré par un fournisseur d\'identité externe. Pour modifier vos informations, veuillez contacter votre administrateur ou accéder directement au portail de votre fournisseur d\'identité.')}
                </p>
                {siteConfig?.oidc_provider_url && (
                  <a
                    href={siteConfig.oidc_provider_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2 bg-blue-500/20 text-blue-400 rounded-lg hover:bg-blue-500/30 transition-colors"
                  >
                    <LucideIcon name="external-link" size={18} />
                    {t('Accéder au portail OIDC')}
                  </a>
                )}
                
                {/* Read-only info */}
                <div className="mt-8 text-left space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-500 mb-1">
                      {t('Nom d\'utilisateur')}
                    </label>
                    <div className="px-4 py-3 rounded-xl bg-gray-700/50 text-white">
                      {currentUser.username}
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-500 mb-1">
                      {t('Email')}
                    </label>
                    <div className="px-4 py-3 rounded-xl bg-gray-700/50 text-white">
                      {currentUser.email || '-'}
                    </div>
                  </div>
                </div>
              </div>
            ) : editing ? (
              /* Edit Mode */
              <form onSubmit={handleSave} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    {t('Nom d\'utilisateur')}
                  </label>
                  <input
                    type="text"
                    value={form.username}
                    onChange={(e) => setForm({ ...form, username: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl bg-gray-800 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    {t('Email')}
                  </label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl bg-gray-800 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500"
                    required
                  />
                </div>

                <div className="border-t border-white/10 pt-4 mt-4">
                  <h4 className="text-sm font-medium text-gray-300 mb-4">
                    {t('Changer le mot de passe')} ({t('optionnel')})
                  </h4>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-400 mb-2">
                        {t('Mot de passe actuel')}
                      </label>
                      <input
                        type="password"
                        value={form.currentPassword}
                        onChange={(e) => setForm({ ...form, currentPassword: e.target.value })}
                        className="w-full px-4 py-3 rounded-xl bg-gray-800 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-400 mb-2">
                        {t('Nouveau mot de passe')}
                      </label>
                      <input
                        type="password"
                        value={form.newPassword}
                        onChange={(e) => setForm({ ...form, newPassword: e.target.value })}
                        className="w-full px-4 py-3 rounded-xl bg-gray-800 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-400 mb-2">
                        {t('Confirmer le nouveau mot de passe')}
                      </label>
                      <input
                        type="password"
                        value={form.confirmPassword}
                        onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
                        className="w-full px-4 py-3 rounded-xl bg-gray-800 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                  </div>
                </div>

                {/* Préférences */}
                <div className="border-t border-white/10 pt-4 mt-4">
                  <h4 className="text-sm font-medium text-gray-300 mb-4 flex items-center gap-2">
                    <LucideIcon name="settings" size={16} className="text-gray-400" />
                    {t('Préférences')}
                  </h4>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-400 mb-2">
                        {t('Langue')}
                      </label>
                      <select
                        value={form.locale}
                        onChange={(e) => setForm({ ...form, locale: e.target.value })}
                        className="w-full px-4 py-3 rounded-xl bg-gray-800 border border-white/10 text-white focus:outline-none focus:border-indigo-500"
                      >
                        <option value="fr">🇫🇷 Français</option>
                        <option value="en">🇬🇧 English</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-400 mb-2">
                        {t('Thème')}
                      </label>
                      <select
                        value={form.theme}
                        onChange={(e) => setForm({ ...form, theme: e.target.value })}
                        className="w-full px-4 py-3 rounded-xl bg-gray-800 border border-white/10 text-white focus:outline-none focus:border-indigo-500"
                      >
                        <option value="dark">{t('Sombre')}</option>
                        <option value="light">{t('Clair')}</option>
                        <option value="system">{t('Système')}</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setEditing(false);
                      setForm(prev => ({
                        ...prev,
                        username: currentUser.username || '',
                        email: currentUser.email || '',
                        currentPassword: '',
                        newPassword: '',
                        confirmPassword: ''
                      }));
                    }}
                    className="px-4 py-2 rounded-lg text-gray-400 hover:text-white transition-colors"
                  >
                    {t('Annuler')}
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex items-center gap-2 px-4 py-2 bg-indigo-500 hover:bg-indigo-600 disabled:opacity-50 text-white rounded-lg transition-colors"
                  >
                    {loading ? (
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <LucideIcon name="save" size={18} />
                    )}
                    <span>{t('Enregistrer')}</span>
                  </button>
                </div>
              </form>
            ) : (
              /* View Mode */
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">
                    {t('Nom d\'utilisateur')}
                  </label>
                  <div className="px-4 py-3 rounded-xl bg-gray-700/50 text-white">
                    {currentUser.username}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">
                    {t('Email')}
                  </label>
                  <div className="px-4 py-3 rounded-xl bg-gray-700/50 text-white">
                    {currentUser.email || '-'}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">
                    {t('Mot de passe')}
                  </label>
                  <div className="px-4 py-3 rounded-xl bg-gray-700/50 text-gray-400">
                    ••••••••
                  </div>
                </div>

                {/* Préférences en mode lecture */}
                <div className="border-t border-white/10 pt-4 mt-4">
                  <h4 className="text-sm font-medium text-gray-500 mb-3 flex items-center gap-2">
                    <LucideIcon name="settings" size={14} className="text-gray-500" />
                    {t('Préférences')}
                  </h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-500 mb-1">
                        {t('Langue')}
                      </label>
                      <div className="px-4 py-3 rounded-xl bg-gray-700/50 text-white">
                        {currentUser.locale === 'fr' ? '🇫🇷 Français' : '🇬🇧 English'}
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-500 mb-1">
                        {t('Thème')}
                      </label>
                      <div className="px-4 py-3 rounded-xl bg-gray-700/50 text-white">
                        {currentUser.theme === 'dark' ? t('Sombre') : currentUser.theme === 'light' ? t('Clair') : t('Système')}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex justify-between pt-4">
                  <button
                    onClick={() => setEditing(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-indigo-500/20 text-indigo-400 rounded-lg hover:bg-indigo-500/30 transition-colors"
                  >
                    <LucideIcon name="edit-2" size={18} />
                    <span>{t('Modifier')}</span>
                  </button>
                  <button
                    onClick={handleLogout}
                    className="flex items-center gap-2 px-4 py-2 bg-red-500/10 text-red-400 rounded-lg hover:bg-red-500/20 transition-colors"
                  >
                    <LucideIcon name="log-out" size={18} />
                    <span>{t('Déconnexion')}</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}
