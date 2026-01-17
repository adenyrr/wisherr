import React, { useState, useEffect } from 'react';
import api from '../../../shared/utils/api';
import { useAuthStore, useSiteStore } from '../../../shared/utils/store';
import { useTranslation } from 'react-i18next';
import { useNavigate, Link } from 'react-router-dom';
import LucideIcon from '../../../shared/components/LucideIcon';
import WisherrBanner from '../../../shared/components/WisherrBanner';
import Footer from '../../../shared/components/Footer';

export default function Login() {
  const { t } = useTranslation();
  const token = useAuthStore((s) => s.token);
  const setToken = useAuthStore((s) => s.setToken);
  const setCurrentUser = useAuthStore((s) => s.setCurrentUser);
  const siteTitle = useSiteStore((s) => s.siteTitle);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  // Rediriger si déjà connecté
  useEffect(() => {
    if (token) {
      navigate('/dashboard', { replace: true });
    }
  }, [token, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await api.post('/auth/login', { username, password });
      const accessToken = res.data.access_token;
      setToken(accessToken);

      // fetch current user before navigating so pages relying on it render correctly
      try {
        const me = await api.get('/auth/me');
        setCurrentUser(me.data);
        navigate('/dashboard');
      } catch {
        navigate('/dashboard');
      }
    } catch {
      setError(t('Identifiants invalides'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-gray-900 via-gray-900 to-gray-800">
      {/* Main Content */}
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="w-full">
          {/* Logo & Branding */}
          <div className="text-center mb-8">
            <div className="flex justify-center mb-6">
              <WisherrBanner size="lg" className="max-w-xs" />
            </div>
            <p className="text-gray-400">{t('Connectez-vous à votre compte')}</p>
          </div>

          {/* Login Card */}
          <div className="bg-white/5 backdrop-blur-xl rounded-2xl p-8 shadow-xl">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  {t("Nom d'utilisateur")}
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <LucideIcon name="user" className="w-5 h-5 text-gray-500" />
                  </div>
                  <input
                    type="text"
                    value={username}
                    onChange={e => setUsername(e.target.value)}
                    placeholder={t("Entrez votre nom d'utilisateur")}
                    className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  {t('Mot de passe')}
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <LucideIcon name="lock" className="w-5 h-5 text-gray-500" />
                  </div>
                  <input
                    type="password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
                    required
                  />
                </div>
              </div>

              {error && (
                <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400">
                  <LucideIcon name="alert-circle" className="w-5 h-5 flex-shrink-0" />
                  <span className="text-sm">{error}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 px-4 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-medium rounded-xl shadow-lg shadow-indigo-500/25 transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    {t('Connexion...')}
                  </>
                ) : (
                  <>
                    <LucideIcon name="log-in" className="w-5 h-5" />
                    {t('Se connecter')}
                  </>
                )}
              </button>
            </form>

            <div className="mt-6 pt-6 border-t border-white/10 text-center">
              <p className="text-gray-400">
                {t("Pas encore de compte ?")}{' '}
                <Link to="/register" className="text-indigo-400 hover:text-indigo-300 font-medium transition-colors">
                  {t("S'inscrire")}
                </Link>
              </p>
            </div>
          </div>

          {/* Features hint */}
          <div className="mt-8 grid grid-cols-3 gap-4 text-center">
            <div className="p-3 bg-white/5 rounded-xl border border-white/10">
              <LucideIcon name="list" className="w-6 h-6 text-indigo-400 mx-auto mb-2" />
              <span className="text-xs text-gray-400">{t('Listes de souhaits')}</span>
            </div>
            <div className="p-3 bg-white/5 rounded-xl border border-white/10">
              <LucideIcon name="share-2" className="w-6 h-6 text-purple-400 mx-auto mb-2" />
              <span className="text-xs text-gray-400">{t('Partage facile')}</span>
            </div>
            <div className="p-3 bg-white/5 rounded-xl border border-white/10">
              <LucideIcon name="users" className="w-6 h-6 text-pink-400 mx-auto mb-2" />
              <span className="text-xs text-gray-400">{t('Groupes')}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <Footer siteTitle={siteTitle} />
    </div>
  );
}
