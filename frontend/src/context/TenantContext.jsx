import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../api/client';

const TenantContext = createContext(null);

export const TenantProvider = ({ children }) => {
  const [tenantSlug, setTenantSlug] = useState(() => localStorage.getItem('tenant_slug') || 'sample');
  const [settings, setSettings] = useState({
    school_name: '7A Model School',
    theme_primary_color: '#1E40AF',
    currency_symbol: '₹',
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTenantSettings = async () => {
      try {
        const res = await api.get('/settings/public');
        if (res.data) {
          setSettings((prev) => ({ ...prev, ...res.data }));
        }
      } catch (e) {
        console.warn('Using default school theme:', e.message);
      } finally {
        setLoading(false);
      }
    };

    fetchTenantSettings();
  }, [tenantSlug]);

  const switchTenant = (slug) => {
    localStorage.setItem('tenant_slug', slug);
    setTenantSlug(slug);
    window.location.reload();
  };

  return (
    <TenantContext.Provider value={{ tenantSlug, settings, switchTenant, loading }}>
      {children}
    </TenantContext.Provider>
  );
};

export const useTenant = () => useContext(TenantContext);
