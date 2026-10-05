import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { api, clearSession, hasSession, saveSession } from './api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [ready, setReady] = useState(false);
  const [unread, setUnread] = useState(0);

  const refreshNotifications = async () => {
    if (!hasSession()) return setUnread(0);
    try {
      const { data } = await api.get('/notifications');
      setUnread(data.unread || 0);
    } catch {
      setUnread(0);
    }
  };

  useEffect(() => {
    if (!hasSession()) {
      setReady(true);
      return;
    }
    api.get('/auth/me')
      .then(({ data }) => { setUser(data.user); return refreshNotifications(); })
      .catch(() => { clearSession(); setUser(null); })
      .finally(() => setReady(true));
  }, []);

  const login = async (email, password) => {
    const { data } = await api.post('/auth/login', { email, password });
    saveSession(data.token);
    setUser(data.user);
    await refreshNotifications();
    return data.user;
  };

  const register = async (fields) => {
    const { data } = await api.post('/auth/register', fields);
    saveSession(data.token);
    setUser(data.user);
    return data.user;
  };

  const logout = async () => {
    try { await api.post('/auth/logout'); } catch { /* the local session is always cleared */ }
    clearSession();
    setUser(null);
    setUnread(0);
  };

  const updateUser = (updated) => setUser(updated);
  const value = useMemo(() => ({ user, ready, unread, setUnread, refreshNotifications, login, register, logout, updateUser }), [user, ready, unread]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
