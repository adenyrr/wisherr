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

  // Rediriger si déjà connecté
  useEffect(() => {
    if (token) {
      navigate('/dashboard', { replace: true });
    }
  }, [token, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess(false);

    // Validation mot de passe
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
            <p className="text-gray-400">{t('Créez votre compte')}</p>
          </div>

          {/* Register Card */}
          <div className="bg-white/5 backdrop-blur-xl rounded-2xl p-8 shadow-xl">
            {success ? (
              <div className="text-center py-8">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-emerald-500/20 mb-4">
                  <LucideIcon name="check-circle" className="w-8 h-8 text-emerald-400" />
                </div>
                <h2 className="text-xl font-semibold text-white mb-2">{t('Inscription réussie !')}</h2>
                <p className="text-gray-400 mb-6">{t('Vous pouvez maintenant vous connecter')}</p>
                <Link
                  to="/login"
                  className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-medium rounded-xl shadow-lg shadow-indigo-500/25 transition-all"
                >
                  <LucideIcon name="log-in" className="w-5 h-5" />
                  {t('Se connecter')}
                </Link>
              </div>
            ) : (
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
                      placeholder={t("Choisissez un nom d'utilisateur")}
                      className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
                      required
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
                  <p className="mt-1 text-xs text-gray-500">
                    {t('Min. 8 caractères, 1 majuscule, 1 chiffre, 1 caractère spécial')}
                  </p>
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
            )}

            {!success && (
              <div className="mt-6 pt-6 border-t border-white/10 text-center">
                <p className="text-gray-400">
                  {t('Déjà un compte ?')}{' '}
                  <Link to="/login" className="text-indigo-400 hover:text-indigo-300 font-medium transition-colors">
                    {t('Se connecter')}
                  </Link>
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Footer */}
      <Footer siteTitle={siteTitle} />
    </div>
  );
}
