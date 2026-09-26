import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { api, setUnauthorizedHandler } from './api.js';

const AuthCtx = createContext(null);

export function AuthProvider({ children }) {
  const [state, setState] = useState({ loading: true, admin: null, adapter: null });

  const refresh = useCallback(async () => {
    try {
      const { admin, adapter } = await api('/auth/me');
      setState({ loading: false, admin, adapter });
    } catch {
      setState({ loading: false, admin: null, adapter: null });
    }
  }, []);

  useEffect(() => {
    setUnauthorizedHandler(() => setState({ loading: false, admin: null, adapter: null }));
    refresh();
  }, [refresh]);

  const login = async (username, password) => {
    await api('/auth/login', { method: 'POST', body: { username, password } });
    await refresh();
  };
  const logout = async () => {
    await api('/auth/logout', { method: 'POST' }).catch(() => {});
    setState({ loading: false, admin: null, adapter: null });
  };
  const can = (perm) => Boolean(state.admin?.permissions.includes(perm));

  return <AuthCtx.Provider value={{ ...state, login, logout, can, refresh }}>{children}</AuthCtx.Provider>;
}

export const useAuth = () => useContext(AuthCtx);
