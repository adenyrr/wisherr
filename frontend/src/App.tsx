import React, { useEffect, useState } from 'react';
import { useAuthStore, useSiteStore } from './shared/utils/store';
import AppRoutes from './routes';
import { useLocation } from 'react-router-dom';

function App() {
  const { token, setToken, setCurrentUser } = useAuthStore();
  const { setSiteTitle } = useSiteStore();
  const location = useLocation();

  // Pages où on affiche le header simple (login/register)
  const isAuthPage = ['/login', '/register'].includes(location.pathname);

  // Fetch site info (title) on mount
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await (await import('./shared/utils/api.js')).default.get('/public/site-info');
        if (mounted && res.data?.site_title) {
          setSiteTitle(res.data.site_title);
          document.title = res.data.site_title;
        }
      } catch (e) {
        // Fallback to default
      }
    })();
    return () => { mounted = false; };
  }, [setSiteTitle]);

  // fetch current user when token is present
  useEffect(() => {
    if (!token) {
      setCurrentUser(null);
      return;
    }
    let mounted = true;
    (async () => {
      try {
        const res = await (await import('./shared/utils/api.js')).default.get('/auth/me');
        if (mounted) setCurrentUser(res.data);
      } catch (e) {
        // token may be invalid; clear it
        setToken(null);
        setCurrentUser(null);
      }
    })();
    return () => { mounted = false; };
  }, [token, setCurrentUser, setToken]);

  // Also fetch user on initial mount if token exists
  useEffect(() => {
    if (token) {
      let mounted = true;
      (async () => {
        try {
          const res = await (await import('./shared/utils/api.js')).default.get('/auth/me');
          if (mounted) setCurrentUser(res.data);
        } catch (e) {
          // token may be invalid; clear it
          setToken(null);
          setCurrentUser(null);
        }
      })();
      return () => { mounted = false; };
    }
  }, []); // Empty dependency array - only run on mount

  // theme logic: if user has previously selected a theme we persist it, otherwise follow system preference
  const stored = localStorage.getItem('theme');
  const prefersDark = typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;

  const [mode, setMode] = useState<'light' | 'dark'>(() => {
    if (stored === 'dark') return 'dark';
    if (stored === 'light') return 'light';
    return prefersDark ? 'dark' : 'light';
  });

  // apply on body so non-react components (canvas) can read theme
  useEffect(() => {
    document.body.setAttribute('data-theme', mode);
  }, [mode]);

  // listen to system theme changes only when user has not explicitly chosen a theme
  useEffect(() => {
    if (stored === 'dark' || stored === 'light') return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = (e: MediaQueryListEvent) => setMode(e.matches ? 'dark' : 'light');
    if (mq.addEventListener) mq.addEventListener('change', handler);
    else mq.addListener && mq.addListener(handler);
    return () => {
      if (mq.removeEventListener) mq.removeEventListener('change', handler);
      else mq.removeListener && mq.removeListener(handler);
    };
  }, [stored]);

  // Si l'utilisateur est connecté et pas sur une page auth, Layout gère tout
  // Sinon, afficher juste les routes (login/register ont leur propre mise en page)
  if (token && !isAuthPage) {
    // Les pages protégées utilisent Layout qui gère la sidebar
    return <AppRoutes />;
  }

  // Pages d'authentification : affichage simple centré
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-900 to-gray-800 flex items-center justify-center">
      <AppRoutes />
    </div>
  );
}

export default App;
