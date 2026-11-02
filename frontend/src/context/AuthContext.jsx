import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api, session, setUnauthorizedHandler } from '../api/client.js';
import { useToast } from './ToastContext.jsx';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const toast = useToast();
  const [user, setUser] = useState(() => session.getUser());

  const logout = useCallback((message) => {
    session.clear();
    setUser(null);
    if (/^#\/(admin|orders|account|checkout|track)/.test(window.location.hash)) window.location.hash = '#/';
    if (message) toast(message);
  }, [toast]);

  // Server says our token is expired/invalid -> log out automatically.
  useEffect(() => {
    setUnauthorizedHandler(() => logout('Session expired. Please log in again.'));
    return () => setUnauthorizedHandler(null);
  }, [logout]);

  const value = useMemo(() => ({
    user,
    isAdmin: user?.role === 'ADMIN',
    /** Open the login / sign-up page. After logging in the shopper returns to where they were. */
    openAuth: (mode = 'login') => {
      const here = window.location.hash;
      if (!here.startsWith('#/login')) { try { sessionStorage.setItem('shopeasyNext', here || '#/'); } catch { /* ignore */ } }
      window.location.hash = mode === 'login' ? '#/login' : `#/login?mode=${mode}`;
    },
    closeAuth: () => {},
    async login(email, password) {
      const result = await api.login({ email, password });
      session.save(result.token, result.user);
      setUser(result.user);
      return result.user;
    },
    async register(fullName, email, password) {
      const result = await api.register({ fullName, email, password });
      session.save(result.token, result.user);
      setUser(result.user);
      return result.user;
    },
    // Re-read the account from the server (e.g. after the email got verified) and keep the saved copy in sync.
    async refreshUser() {
      const fresh = await api.me();
      const token = session.getToken();
      if (token) session.save(token, fresh);
      setUser(fresh);
      return fresh;
    },
    logout,
  }), [user, logout]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
