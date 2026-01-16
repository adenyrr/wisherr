import { create } from 'zustand';

interface CurrentUser {
  id: number;
  username: string;
  email?: string;
  is_admin?: boolean;
  locale?: string;
  theme?: string;
}

interface AuthState {
  token: string | null;
  currentUser: CurrentUser | null;
  setToken: (token: string | null) => void;
  setCurrentUser: (user: CurrentUser | null) => void;
  logout: () => void;
}

interface SiteState {
  siteTitle: string;
  setSiteTitle: (title: string) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  token: typeof window !== 'undefined' ? localStorage.getItem('token') : null,
  currentUser: null,
  setToken: (token) => {
    if (token) {
      try { localStorage.setItem('token', token); } catch (e) { /* ignore */ }
      set({ token });
    } else {
      try { localStorage.removeItem('token'); } catch (e) { /* ignore */ }
      set({ token: null, currentUser: null });
    }
  },
  setCurrentUser: (user) => set({ currentUser: user }),
  logout: () => {
    try { localStorage.removeItem('token'); } catch (e) { /* ignore */ }
    set({ token: null, currentUser: null });
  },
}));

export const useSiteStore = create<SiteState>((set) => ({
  siteTitle: 'Wisherr',
  setSiteTitle: (title) => set({ siteTitle: title }),
}));
