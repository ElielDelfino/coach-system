import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api, { setAccessToken, setAuthHandlers, getAccessToken } from '../services/api';

const AuthContext = createContext(null);

function parseJwt(token) {
  try {
    const base64 = token.split('.')[1];
    return JSON.parse(atob(base64.replace(/-/g, '+').replace(/_/g, '/')));
  } catch {
    return null;
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [accessToken, setTokenState] = useState(null);
  const [booting, setBooting] = useState(true);
  const navigate = useNavigate();

  const clearSession = useCallback(() => {
    setAccessToken(null);
    setTokenState(null);
    setUser(null);
  }, []);

  const logout = useCallback(async () => {
    try {
      if (getAccessToken()) await api.post('/auth/logout');
    } catch {
      // ignore
    } finally {
      clearSession();
      navigate('/login', { replace: true });
    }
  }, [clearSession, navigate]);

  useEffect(() => {
    setAuthHandlers({
      onUnauthorized: () => {
        clearSession();
        navigate('/login', { replace: true });
      },
      onTokenRefreshed: (newToken) => {
        setTokenState(newToken);
      },
    });
  }, [clearSession, navigate]);

  // Restaura sessão automaticamente via refresh cookie no boot
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await api.post('/auth/refresh', {});
        if (cancelled) return;
        const token = res.data.accessToken;
        setAccessToken(token);
        setTokenState(token);
        const payload = parseJwt(token);
        if (payload) setUser({ id: payload.id, email: payload.email, role: payload.role });
      } catch {
        // sem sessão válida — segue para login
      } finally {
        if (!cancelled) setBooting(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const login = useCallback(async (email, senha) => {
    const res = await api.post('/auth/login', { email, senha });
    const { accessToken: token, user: u } = res.data;
    setAccessToken(token);
    setTokenState(token);
    setUser(u);
    return u;
  }, []);

  return (
    <AuthContext.Provider value={{ user, accessToken, login, logout, booting }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth deve ser usado dentro de AuthProvider');
  return ctx;
}
