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
    <div className="min-h-screen flex flex-col bg-gray-900">
      {/* Main content - full width */}
      <div className="flex-1 grid lg:grid-cols-2">
        {/* Left Panel - Branding (hidden on mobile, shown on lg+) */}
        <div className="hidden lg:flex flex-col justify-center px-8 xl:px-16 2xl:px-24 bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
          <div className="max-w-xl">
            <div className="mb-8">
              <WisherrBanner size="lg" />
            </div>
            <h1 className="text-4xl xl:text-5xl 2xl:text-6xl font-bold text-white leading-tight mb-6">
              {t('Bienvenue sur')} <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400">Wisherr</span>
            </h1>
            <p className="text-lg xl:text-xl text-gray-400 mb-12">
              {t('Créez et partagez vos listes de souhaits avec vos proches. Simple, rapide et gratuit.')}
            </p>
            
            {/* Features */}
            <div className="space-y-6">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-purple-500/10 flex items-center justify-center">
                  <LucideIcon name="list" className="w-6 h-6 text-purple-400" />
                </div>
                <div>
                  <h3 className="text-white font-semibold mb-1">{t('Listes illimitées')}</h3>
                  <p className="text-sm text-gray-500">{t('Créez autant de listes que vous le souhaitez')}</p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-pink-500/10 flex items-center justify-center">
                  <LucideIcon name="share-2" className="w-6 h-6 text-pink-400" />
                </div>
                <div>
                  <h3 className="text-white font-semibold mb-1">{t('Partage facile')}</h3>
                  <p className="text-sm text-gray-500">{t('Partagez avec vos proches en un clic')}</p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-indigo-500/10 flex items-center justify-center">
                  <LucideIcon name="gift" className="w-6 h-6 text-indigo-400" />
                </div>
                <div>
                  <h3 className="text-white font-semibold mb-1">{t('100% Gratuit')}</h3>
                  <p className="text-sm text-gray-500">{t('Toutes les fonctionnalités sans frais')}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Panel - Login Form (full width on mobile) */}
        <div className="flex flex-col justify-center px-4 py-8 sm:px-8 md:px-12 lg:px-8 xl:px-16 2xl:px-24 bg-gray-900">
          <div className="w-full max-w-md mx-auto lg:mx-0 lg:max-w-none">
            {/* Mobile logo */}
            <div className="lg:hidden flex justify-center mb-8">
              <WisherrBanner size="lg" />
            </div>

            <div className="lg:max-w-md">
              <h2 className="text-2xl sm:text-3xl font-bold text-white mb-2 text-center lg:text-left">
                {t('Connexion')}
              </h2>
              <p className="text-gray-400 mb-8 text-center lg:text-left">
                {t('Accédez à votre compte')}
              </p>

              <form onSubmit={handleSubmit} className="space-y-5">
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
                      className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition-all"
                      required
                      autoFocus
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
                      className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition-all"
                      required
                    />
                  </div>
                </div>

                {error && (
                  <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400">
                    <LucideIcon name="alert-circle" className="w-5 h-5 flex-shrink-0" />
                    <span className="text-sm">{error}</span>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3.5 px-4 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-semibold rounded-xl transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-purple-500/25"
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

              <div className="mt-8 pt-6 border-t border-white/10 text-center lg:text-left">
                <p className="text-gray-400">
                  {t("Pas encore de compte ?")}{' '}
                  <Link to="/register" className="text-purple-400 hover:text-purple-300 font-semibold transition-colors">
                    {t("S'inscrire gratuitement")}
                  </Link>
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Footer - full width */}
      <Footer />
    </div>
  );
}
