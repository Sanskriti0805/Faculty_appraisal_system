import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

const AuthContext = createContext(null);

const API_BASE = `http://${window.location.hostname}:5001/api`;

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('auth_token'));
  const [loading, setLoading] = useState(true);

  const logout = useCallback(() => {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('auth_user');
    setToken(null);
    setUser(null);
  }, []);

  // Validate token on mount
  useEffect(() => {
    let isCancelled = false;

    const validateToken = async () => {
      const storedToken = localStorage.getItem('auth_token');
      if (!storedToken) {
        if (!isCancelled) setLoading(false);
        return;
      }

      const tokenAtStart = storedToken;
      try {
        const res = await fetch(`${API_BASE}/auth/me`, {
          headers: { Authorization: `Bearer ${storedToken}` }
        });
        const data = await res.json();
        if (isCancelled) return;

        if (data.success) {
          setUser(data.user);
          setToken(storedToken);
        } else {
          // Avoid logging out a fresh session if token changed while this request was in flight.
          if (localStorage.getItem('auth_token') === tokenAtStart) {
            logout();
          }
        }
      } catch {
        if (isCancelled) return;

        // Backend might be restarting — keep token, set user from cache
        const cached = localStorage.getItem('auth_user');
        if (cached) {
          setUser(JSON.parse(cached));
          setToken(localStorage.getItem('auth_token'));
        }
      } finally {
        if (!isCancelled) setLoading(false);
      }
    };
    validateToken();

    return () => {
      isCancelled = true;
    };
  }, [logout]);

  const login = async (email, password, role) => {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, role })
    });
    const data = await res.json();
    if (data.success) {
      localStorage.setItem('auth_token', data.token);
      localStorage.setItem('auth_user', JSON.stringify(data.user));
      setToken(data.token);
      setUser(data.user);
    }
    return data;
  };

  const refreshUser = useCallback(async () => {
    const storedToken = localStorage.getItem('auth_token');
    if (!storedToken) return;
    try {
      const res = await fetch(`${API_BASE}/auth/me`, {
        headers: { Authorization: `Bearer ${storedToken}` }
      });
      const data = await res.json();
      if (data.success) {
        setUser(data.user);
        localStorage.setItem('auth_user', JSON.stringify(data.user));
      }
    } catch {}
  }, []);

  const getAuthHeader = () => ({
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json'
  });

  const needsOnboarding = !!user && (user.onboarding_complete === 0 || user.onboarding_complete === false);

  return (
    <AuthContext.Provider value={{ user, token, loading, login, logout, getAuthHeader, isAuthenticated: !!user, needsOnboarding, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};

export default AuthContext;
