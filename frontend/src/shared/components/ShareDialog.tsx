import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import LucideIcon from './LucideIcon';
import { useToast } from './Toast';
import api from '../utils/api';

interface Group {
  id: number;
  name: string;
}

interface ShareDialogProps {
  wishlistId: number;
  wishlistName: string;
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

type ShareType = 'internal' | 'external';
type InternalTarget = 'user' | 'group';

export default function ShareDialog({ 
  wishlistId, 
  wishlistName, 
  open, 
  onClose,
  onSuccess 
}: ShareDialogProps) {
  const { t } = useTranslation();
  const [shareType, setShareType] = useState<ShareType>('internal');
  const [internalTarget, setInternalTarget] = useState<InternalTarget>('user');
  const [username, setUsername] = useState('');
  const [selectedGroupId, setSelectedGroupId] = useState<number | null>(null);
  const [permission, setPermission] = useState<'viewer' | 'editor'>('viewer');
  const [externalPassword, setExternalPassword] = useState('');
  const [expiresInDays, setExpiresInDays] = useState<number | null>(null);
  const [notifyOnReservation, setNotifyOnReservation] = useState(false);
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(false);
  const [generatedLink, setGeneratedLink] = useState('');
  const [generatedPassword, setGeneratedPassword] = useState('');
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedPassword, setCopiedPassword] = useState(false);
  const { showError, showSuccess } = useToast();

  useEffect(() => {
    if (open) {
      fetchGroups();
      resetForm();
    }
  }, [open]);

  const resetForm = () => {
    setShareType('internal');
    setInternalTarget('user');
    setUsername('');
    setSelectedGroupId(null);
    setPermission('viewer');
    setExternalPassword('');
    setExpiresInDays(null);
    setNotifyOnReservation(false);
    setGeneratedLink('');
    setGeneratedPassword('');
  };

  const fetchGroups = async () => {
    try {
      const res = await api.get('/groups');
      setGroups(res.data || []);
    } catch (err) {
      console.error('Failed to fetch groups:', err);
    }
  };

  const handleShare = async () => {
    setLoading(true);

    try {
      if (shareType === 'internal') {
        const payload: any = {
          wishlist_id: wishlistId,
          permission
        };
        
        if (internalTarget === 'user') {
          if (!username.trim()) {
            showError('Veuillez entrer un nom d\'utilisateur');
            setLoading(false);
            return;
          }
          payload.username = username.trim();
        } else {
          if (!selectedGroupId) {
            showError('Veuillez sélectionner un groupe');
            setLoading(false);
            return;
          }
          payload.group_id = selectedGroupId;
        }

        await api.post('/shares/internal', payload);
        showSuccess('Liste partagée avec succès !');
        onClose();
        onSuccess?.();
      } else {
        // External share - mot de passe obligatoire
        if (!externalPassword.trim() || externalPassword.trim().length < 4) {
          showError(t('Le mot de passe est obligatoire (minimum 4 caractères)'));
          setLoading(false);
          return;
        }
        
        const payload: any = {
          wishlist_id: wishlistId,
          password: externalPassword.trim(),
          notify_on_reservation: notifyOnReservation
        };
        
        if (expiresInDays && expiresInDays > 0) {
          payload.expires_in_days = expiresInDays;
        }

        const res = await api.post('/shares/external', payload);
        const token = res.data.share_token;
        const link = `${window.location.origin}/shared/${token}`;
        setGeneratedLink(link);
        setGeneratedPassword(externalPassword.trim());
        showSuccess(t('Lien de partage créé !'));
        onSuccess?.();
      }
    } catch (err: any) {
      showError(err.response?.data?.detail || 'Erreur lors du partage');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(generatedLink);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const shareViaSocial = (platform: string) => {
    const link = encodeURIComponent(generatedLink);
    const text = encodeURIComponent(`Découvre ma liste "${wishlistName}" sur Wisherr !`);
    
    let url = '';
    switch (platform) {
      case 'whatsapp':
        url = `https://wa.me/?text=${text}%20${link}`;
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
      case 'telegram':
        url = `https://t.me/share/url?url=${link}&text=${text}`;
        break;
    }
    window.open(url, '_blank');
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="w-full max-w-lg rounded-2xl bg-gray-900 border border-white/10 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <LucideIcon name="share-2" size={20} className="text-indigo-400" />
            {t('Partager')} "{wishlistName}"
          </h2>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-white/10 text-gray-400"
          >
            <LucideIcon name="x" size={20} />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Success with link */}
          {generatedLink && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-green-500/10 border border-green-500/30">
                <p className="text-green-400 text-sm mb-4 flex items-center gap-2">
                  <LucideIcon name="check-circle" size={18} />
                  {t('Lien de partage créé !')}
                </p>
                
                {/* Lien */}
                <div className="mb-4">
                  <label className="block text-xs font-medium text-gray-400 mb-1">{t('Lien de partage')}</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={generatedLink}
                      readOnly
                      className="flex-1 px-3 py-2 rounded-lg bg-gray-800 border border-white/10 text-gray-300 text-sm"
                    />
                    <button
                      onClick={copyToClipboard}
                      className="px-3 py-2 bg-indigo-500 hover:bg-indigo-600 text-white rounded-lg transition-colors flex items-center gap-1"
                    >
                      <LucideIcon name={copiedLink ? 'check' : 'copy'} size={18} />
                      {copiedLink && <span className="text-xs">{t('Copié')}</span>}
                    </button>
                  </div>
                </div>
                
                {/* Mot de passe */}
                {generatedPassword && (
                  <div>
                    <label className="block text-xs font-medium text-gray-400 mb-1">{t('Mot de passe à communiquer')}</label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={generatedPassword}
                        readOnly
                        className="flex-1 px-3 py-2 rounded-lg bg-gray-800 border border-amber-500/30 text-amber-300 text-sm font-mono"
                      />
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(generatedPassword);
                          setCopiedPassword(true);
                          setTimeout(() => setCopiedPassword(false), 2000);
                        }}
                        className="px-3 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg transition-colors flex items-center gap-1"
                      >
                        <LucideIcon name={copiedPassword ? 'check' : 'copy'} size={18} />
                        {copiedPassword && <span className="text-xs">{t('Copié')}</span>}
                      </button>
                    </div>
                    <p className="text-xs text-amber-400/70 mt-2">
                      ⚠️ {t('Conservez ce mot de passe. Il ne sera plus affiché.')}
                    </p>
                  </div>
                )}
              </div>

              {/* Social Sharing Buttons */}
              <div>
                <p className="text-sm text-gray-400 mb-3">{t('Partager via')}</p>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => shareViaSocial('whatsapp')}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-green-500/20 text-green-400 hover:bg-green-500/30 transition-colors"
                  >
                    <LucideIcon name="message-circle" size={18} />
                    WhatsApp
                  </button>
                  <button
                    onClick={() => shareViaSocial('telegram')}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 transition-colors"
                  >
                    <LucideIcon name="send" size={18} />
                    Telegram
                  </button>
                  <button
                    onClick={() => shareViaSocial('email')}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gray-500/20 text-gray-300 hover:bg-gray-500/30 transition-colors"
                  >
                    <LucideIcon name="mail" size={18} />
                    Email
                  </button>
                  <button
                    onClick={() => shareViaSocial('facebook')}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600/20 text-blue-400 hover:bg-blue-600/30 transition-colors"
                  >
                    <LucideIcon name="facebook" size={18} />
                    Facebook
                  </button>
                  <button
                    onClick={() => shareViaSocial('twitter')}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-sky-500/20 text-sky-400 hover:bg-sky-500/30 transition-colors"
                  >
                    <LucideIcon name="twitter" size={18} />
                    Twitter
                  </button>
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  onClick={onClose}
                  className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
                >
                  {t('Fermer')}
                </button>
              </div>
            </div>
          )}

          {/* Share Form */}
          {!generatedLink && (
            <>
              {/* Share Type Tabs */}
              <div className="flex gap-2 p-1 rounded-xl bg-gray-800/50">
                <button
                  onClick={() => setShareType('internal')}
                  className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                    shareType === 'internal'
                      ? 'bg-indigo-500 text-white'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  <LucideIcon name="users" size={18} />
                  {t('Interne')}
                </button>
                <button
                  onClick={() => setShareType('external')}
                  className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                    shareType === 'external'
                      ? 'bg-cyan-500 text-white'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  <LucideIcon name="link" size={18} />
                  {t('Lien externe')}
                </button>
              </div>

              {/* Internal Share Options */}
              {shareType === 'internal' && (
                <div className="space-y-4">
                  {/* Target type */}
                  <div className="flex gap-2">
                    <button
                      onClick={() => setInternalTarget('user')}
                      className={`flex-1 px-4 py-3 rounded-xl border transition-colors ${
                        internalTarget === 'user'
                          ? 'border-indigo-500 bg-indigo-500/10 text-white'
                          : 'border-white/10 text-gray-400 hover:border-white/20'
                      }`}
                    >
                      <LucideIcon name="user" size={20} className="mx-auto mb-1" />
                      <span className="text-sm">{t('Utilisateur')}</span>
                    </button>
                    <button
                      onClick={() => setInternalTarget('group')}
                      className={`flex-1 px-4 py-3 rounded-xl border transition-colors ${
                        internalTarget === 'group'
                          ? 'border-indigo-500 bg-indigo-500/10 text-white'
                          : 'border-white/10 text-gray-400 hover:border-white/20'
                      }`}
                    >
                      <LucideIcon name="users" size={20} className="mx-auto mb-1" />
                      <span className="text-sm">{t('Groupe')}</span>
                    </button>
                  </div>

                  {/* User input or Group select */}
                  {internalTarget === 'user' ? (
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        {t('Nom d\'utilisateur')}
                      </label>
                      <input
                        type="text"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        placeholder={t('Entrez un nom d\'utilisateur...')}
                        className="w-full px-4 py-3 rounded-xl bg-gray-800 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                  ) : (
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        {t('Groupe')}
                      </label>
                      {groups.length === 0 ? (
                        <p className="text-sm text-gray-500">
                          {t('Aucun groupe disponible. Créez d\'abord un groupe.')}
                        </p>
                      ) : (
                        <select
                          value={selectedGroupId || ''}
                          onChange={(e) => setSelectedGroupId(Number(e.target.value) || null)}
                          className="w-full px-4 py-3 rounded-xl bg-gray-800 border border-white/10 text-white focus:outline-none focus:border-indigo-500"
                        >
                          <option value="">{t('Sélectionner un groupe...')}</option>
                          {groups.map((g) => (
                            <option key={g.id} value={g.id}>{g.name}</option>
                          ))}
                        </select>
                      )}
                    </div>
                  )}

                  {/* Permission */}
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      {t('Permission')}
                    </label>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setPermission('viewer')}
                        className={`flex-1 px-4 py-2 rounded-xl border transition-colors ${
                          permission === 'viewer'
                            ? 'border-blue-500 bg-blue-500/10 text-blue-400'
                            : 'border-white/10 text-gray-400 hover:border-white/20'
                        }`}
                      >
                        <LucideIcon name="eye" size={18} className="inline-block mr-2" />
                        {t('Lecteur')}
                      </button>
                      <button
                        onClick={() => setPermission('editor')}
                        className={`flex-1 px-4 py-2 rounded-xl border transition-colors ${
                          permission === 'editor'
                            ? 'border-amber-500 bg-amber-500/10 text-amber-400'
                            : 'border-white/10 text-gray-400 hover:border-white/20'
                        }`}
                      >
                        <LucideIcon name="edit" size={18} className="inline-block mr-2" />
                        {t('Éditeur')}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* External Share Options */}
              {shareType === 'external' && (
                <div className="space-y-4">
                  <p className="text-sm text-gray-400">
                    {t('Créez un lien de partage que vous pouvez envoyer à n\'importe qui, même aux personnes sans compte.')}
                  </p>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      {t('Mot de passe')} <span className="text-amber-400">*</span>
                    </label>
                    <input
                      type="text"
                      value={externalPassword}
                      onChange={(e) => setExternalPassword(e.target.value)}
                      placeholder={t('Minimum 4 caractères')}
                      className={`w-full px-4 py-3 rounded-xl bg-gray-800 border text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500 ${
                        externalPassword.length > 0 && externalPassword.length < 4
                          ? 'border-red-500'
                          : 'border-white/10'
                      }`}
                    />
                    {externalPassword.length > 0 && externalPassword.length < 4 && (
                      <p className="text-xs text-red-400 mt-1">{t('Le mot de passe doit faire au moins 4 caractères')}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      {t('Expiration')}
                    </label>
                    <select
                      value={expiresInDays || ''}
                      onChange={(e) => setExpiresInDays(Number(e.target.value) || null)}
                      className="w-full px-4 py-3 rounded-xl bg-gray-800 border border-white/10 text-white focus:outline-none focus:border-cyan-500"
                    >
                      <option value="">{t('Jamais')}</option>
                      <option value="1">{t('1 jour')}</option>
                      <option value="7">{t('7 jours')}</option>
                      <option value="30">{t('30 jours')}</option>
                      <option value="90">{t('90 jours')}</option>
                    </select>
                  </div>

                  {/* Notification option */}
                  <div className="flex items-center gap-3 p-3 rounded-xl bg-gray-800/50 border border-white/5">
                    <button
                      type="button"
                      onClick={() => setNotifyOnReservation(!notifyOnReservation)}
                      className={`w-12 h-6 rounded-full transition-colors relative ${
                        notifyOnReservation ? 'bg-cyan-500' : 'bg-gray-600'
                      }`}
                    >
                      <span
                        className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${
                          notifyOnReservation ? 'left-7' : 'left-1'
                        }`}
                      />
                    </button>
                    <div>
                      <p className="text-sm text-white">{t('Notifications de réservation')}</p>
                      <p className="text-xs text-gray-400">{t('Recevoir un email quand quelqu\'un réserve un article')}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex justify-end gap-3 pt-2">
                <button
                  onClick={onClose}
                  className="px-4 py-2 rounded-lg text-gray-400 hover:text-white transition-colors"
                >
                  {t('Annuler')}
                </button>
                <button
                  onClick={handleShare}
                  disabled={loading}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                    shareType === 'internal'
                      ? 'bg-indigo-500 hover:bg-indigo-600 text-white'
                      : 'bg-cyan-500 hover:bg-cyan-600 text-white'
                  } disabled:opacity-50`}
                >
                  {loading ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <LucideIcon name="share-2" size={18} />
                  )}
                  {shareType === 'internal' ? t('Partager') : t('Créer le lien')}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
