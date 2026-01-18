import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import Layout from '../../../shared/components/Layout';
import LucideIcon from '../../../shared/components/LucideIcon';
import { useToast } from '../../../shared/components/Toast';
import api from '../../../shared/utils/api';

interface SiteConfigItem {
  key: string;
  value: string;
  description?: string;
}

export default function AdminConfig() {
  const { t } = useTranslation();
  const { showSuccess, showError } = useToast();
  const [config, setConfig] = useState<SiteConfigItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editedValues, setEditedValues] = useState<Record<string, string>>({});
  const [success, setSuccess] = useState('');

  useEffect(() => {
    fetchConfig();
  }, []);

  const fetchConfig = async () => {
    try {
      const res = await api.get('/admin/config');
      // API returns an array of {id, key, value, value_type, description, updated_at}
      const configData = res.data || [];
      const configArray = configData.map((item: any) => ({
        key: item.key,
        value: item.value || '',
        value_type: item.value_type,
        description: item.description || getConfigDescription(item.key)
      }));
      setConfig(configArray);
      const values: Record<string, string> = {};
      configArray.forEach((c: any) => { values[c.key] = c.value; });
      setEditedValues(values);
    } catch (err) {
      console.error('Failed to fetch config:', err);
    } finally {
      setLoading(false);
    }
  };

  const getConfigDescription = (key: string) => {
    switch (key) {
      case 'site_title': return 'Titre du site affiché dans le navigateur et le footer';
      case 'wisherr_url': return 'URL publique du site (utilisée pour générer les liens de partage)';
      case 'locale': return 'Langue par défaut du site';
      case 'enable_local_auth': return 'Activer l\'authentification locale (username/password)';
      case 'enable_oidc_auth': return 'Activer l\'authentification OIDC (OpenID Connect)';
      case 'oidc_client_id': return 'Client ID pour l\'authentification OIDC';
      case 'oidc_client_secret': return 'Client Secret pour l\'authentification OIDC';
      case 'oidc_provider_url': return 'URL du fournisseur OIDC (Discovery URL)';
      case 'registration_open': return 'Autoriser les nouvelles inscriptions';
      case 'max_wishlists_per_user': return 'Nombre maximum de listes par utilisateur';
      case 'max_items_per_wishlist': return 'Nombre maximum d\'articles par liste';
      case 'external_share_enabled': return 'Autoriser le partage externe par lien';
      case 'require_email_verification': return 'Exiger la vérification email';
      default: return '';
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setSuccess('');
    try {
      await api.put('/admin/config', { configs: editedValues });
      showSuccess(t('Configuration sauvegardée avec succès !'));
    } catch (err: any) {
      showError(err.response?.data?.detail || t('Erreur lors de la sauvegarde'));
    } finally {
      setSaving(false);
    }
  };

  const handleValueChange = (key: string, value: string) => {
    setEditedValues(prev => ({ ...prev, [key]: value }));
  };

  return (
    <Layout>
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-white mb-1">
              <LucideIcon name="settings" size={28} className="inline-block mr-3 text-amber-400" />
              {t('Configuration')}
            </h1>
            <p className="text-gray-400">
              {t('Paramètres globaux du site')}
            </p>
          </div>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-black font-medium rounded-xl transition-colors"
          >
            {saving ? (
              <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin" />
            ) : (
              <LucideIcon name="save" size={20} />
            )}
            <span>{t('Sauvegarder')}</span>
          </button>
        </div>

        {success && (
          <div className="mb-6 p-4 rounded-xl bg-green-500/10 border border-green-500/30 text-green-400 flex items-center gap-3">
            <LucideIcon name="check-circle" size={20} />
            {success}
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="space-y-4">
            {config.map((item) => (
              <div
                key={item.key}
                className="p-6 rounded-2xl bg-gray-800/50 border border-white/10"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <label className="text-white font-medium block mb-1">
                      {item.key}
                    </label>
                    {item.description && (
                      <p className="text-sm text-gray-500 mb-3">{item.description}</p>
                    )}
                  </div>
                  <div className="w-64">
                    {item.value === 'true' || item.value === 'false' ? (
                      <button
                        onClick={() => handleValueChange(item.key, editedValues[item.key] === 'true' ? 'false' : 'true')}
                        className={`relative w-14 h-7 rounded-full transition-colors ${
                          editedValues[item.key] === 'true' 
                            ? 'bg-amber-500' 
                            : 'bg-gray-600'
                        }`}
                      >
                        <div 
                          className={`absolute top-1 w-5 h-5 bg-white rounded-full transition-transform ${
                            editedValues[item.key] === 'true' 
                              ? 'translate-x-8' 
                              : 'translate-x-1'
                          }`}
                        />
                      </button>
                    ) : (
                      <input
                        type={item.key.includes('secret') || item.key.includes('password') ? 'password' : 'text'}
                        value={editedValues[item.key] || ''}
                        onChange={(e) => handleValueChange(item.key, e.target.value)}
                        placeholder={item.key.includes('secret') ? '••••••••' : ''}
                        className="w-full px-4 py-2 rounded-xl bg-gray-700 border border-white/10 text-white focus:outline-none focus:border-amber-500"
                      />
                    )}
                  </div>
                </div>
              </div>
            ))}

            {config.length === 0 && (
              <div className="text-center py-12 text-gray-500">
                <LucideIcon name="settings" size={48} className="mx-auto mb-4 opacity-50" />
                <p>{t('Aucune configuration définie')}</p>
              </div>
            )}
          </div>
        )}
      </div>
    </Layout>
  );
}
