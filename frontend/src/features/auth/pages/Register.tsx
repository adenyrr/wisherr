import React, { useState, useEffect } from 'react';
import api from '../../../shared/utils/api';
import { useAuthStore, useSiteStore } from '../../../shared/utils/store';
import { useTranslation } from 'react-i18next';
import { useNavigate, Link } from 'react-router-dom';
import LucideIcon from '../../../shared/components/LucideIcon';
import WisherrBanner from '../../../shared/components/WisherrBanner';
import Footer from '../../../shared/components/Footer';

export default function Register() {
  const { t } = useTranslation();
  const token = useAuthStore((s) => s.token);
  const siteTitle = useSiteStore((s) => s.siteTitle);
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
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
    setSuccess(false);

    if (password !== confirmPassword) {
      setError(t('Les mots de passe ne correspondent pas'));
      return;
    }

    if (password.length < 8) {
      setError(t('Le mot de passe doit contenir au moins 8 caractères'));
      return;
    }

    setLoading(true);
    try {
      await api.post('/auth/register', { username, email, password });
      setSuccess(true);
    } catch (err: any) {
      const detail = err.response?.data?.detail || err.response?.data?.error;
      setError(detail || t("Erreur lors de l'inscription"));
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen flex flex-col bg-gray-900">
        <div className="flex-1 flex items-center justify-center px-4 py-8">
          <div className="text-center max-w-md space-y-6">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-green-500/20 mb-4">
              <LucideIcon name="check-circle" className="w-10 h-10 text-green-400" />
            </div>
            <h2 className="text-3xl font-bold text-white">{t('Inscription réussie !')}</h2>
            <p className="text-gray-400 text-lg">
              {t('Votre compte a été créé avec succès. Vous pouvez maintenant vous connecter.')}
            </p>
            <Link
              to="/login"
              className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-semibold rounded-xl transition-all shadow-lg shadow-purple-500/25"
            >
              <LucideIcon name="log-in" className="w-5 h-5" />
              {t('Se connecter')}
            </Link>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-900">
      <div className="flex-1 grid lg:grid-cols-2">
        <div className="hidden lg:flex flex-col justify-center px-8 xl:px-16 2xl:px-24 bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
          <div className="max-w-xl">
            <div className="mb-8">
              <WisherrBanner size="lg" />
            </div>
            <h1 className="text-4xl xl:text-5xl 2xl:text-6xl font-bold text-white leading-tight mb-6">
              {t('Rejoignez')} <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400">Wisherr</span>
            </h1>
            <p className="text-lg xl:text-xl text-gray-400 mb-12">
              {t('Créez votre compte gratuitement et commencez à partager vos souhaits avec vos proches.')}
            </p>
            
            <div className="space-y-6">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                  <LucideIcon name="zap" className="w-6 h-6 text-emerald-400" />
                </div>
                <div>
                  <h3 className="text-white font-semibold mb-1">{t('Rapide')}</h3>
                  <p className="text-sm text-gray-500">{t('Inscription en 2 minutes')}</p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center">
                  <LucideIcon name="shield-check" className="w-6 h-6 text-blue-400" />
                </div>
                <div>
                  <h3 className="text-white font-semibold mb-1">{t('Sécurisé')}</h3>
                  <p className="text-sm text-gray-500">{t('Vos données protégées')}</p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-amber-500/10 flex items-center justify-center">
                  <LucideIcon name="gift" className="w-6 h-6 text-amber-400" />
                </div>
                <div>
                  <h3 className="text-white font-semibold mb-1">{t('Gratuit')}</h3>
                  <p className="text-sm text-gray-500">{t('100% gratuit à vie')}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col justify-center px-4 py-8 sm:px-8 md:px-12 lg:px-8 xl:px-16 2xl:px-24 bg-gray-900">
          <div className="w-full max-w-md mx-auto lg:mx-0 lg:max-w-none">
            <div className="lg:hidden flex justify-center mb-8">
              <WisherrBanner size="lg" />
            </div>

            <div className="lg:max-w-md">
              <h2 className="text-2xl sm:text-3xl font-bold text-white mb-2 text-center lg:text-left">
                {t('Créer un compte')}
              </h2>
              <p className="text-gray-400 mb-8 text-center lg:text-left">
                {t('Remplissez le formulaire ci-dessous')}
              </p>

              <form onSubmit={handleSubmit} className="space-y-4">
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
                      placeholder={t("Choisissez un nom d'utilisateur")}
                      className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition-all"
                      required
                      autoFocus
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    {t('Email')}
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <LucideIcon name="mail" className="w-5 h-5 text-gray-500" />
                    </div>
                    <input
                      type="email"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      placeholder="exemple@email.com"
                      className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition-all"
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
                      className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition-all"
                      required
                    />
                  </div>
                  <p className="mt-1 text-xs text-gray-500">{t('Min. 8 caractères')}</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    {t('Confirmer le mot de passe')}
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <LucideIcon name="lock" className="w-5 h-5 text-gray-500" />
                    </div>
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={e => setConfirmPassword(e.target.value)}
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
                      {t('Inscription...')}
                    </>
                  ) : (
                    <>
                      <LucideIcon name="user-plus" className="w-5 h-5" />
                      {t("S'inscrire")}
                    </>
                  )}
                </button>
              </form>

              <div className="mt-8 pt-6 border-t border-white/10 text-center lg:text-left">
                <p className="text-gray-400">
                  {t('Déjà un compte ?')}{' '}
                  <Link to="/login" className="text-purple-400 hover:text-purple-300 font-semibold transition-colors">
                    {t('Se connecter')}
                  </Link>
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <Footer />
    </div>
  );
}
