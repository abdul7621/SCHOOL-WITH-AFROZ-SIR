import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../api/client';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('user');
    return saved ? JSON.parse(saved) : null;
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCurrentUser = async () => {
      const token = localStorage.getItem('token');
      if (token) {
        try {
          const res = await api.get('/auth/me');
          if (res.data) {
            setUser(res.data);
            localStorage.setItem('user', JSON.stringify(res.data));
          }
        } catch (e) {
          console.error('Session validation failed:', e);
          logout();
        }
      }
      setLoading(false);
    };

    fetchCurrentUser();
  }, []);

  const login = async (username_or_phone, password, isSuperAdmin = false) => {
    const endpoint = isSuperAdmin ? '/control/auth/login' : '/auth/login';
    const payload = isSuperAdmin ? { email: username_or_phone, password } : { username_or_phone, password };

    const res = await api.post(endpoint, payload);
    const token = isSuperAdmin ? res.access_token : res.access_token;
    const userData = isSuperAdmin ? { id: res.user_id, full_name: res.full_name, email: res.email, role: res.role, isSuperAdmin: true } : res;

    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(userData));
    setUser(userData);
    return userData;
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    window.location.href = '/login';
  };

  const hasPermission = (permissionCode) => {
    if (!user) return false;
    if (user.roles?.includes('ADMIN') || user.role === 'SUPER_ADMIN') return true;
    return user.permissions?.includes(permissionCode) || false;
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, hasPermission }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
