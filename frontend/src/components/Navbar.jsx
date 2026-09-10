import React, { useState, useEffect } from 'react';
import { LogOut, School, ShieldCheck, ChevronDown, RefreshCw } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTenant } from '../context/TenantContext';
import api from '../api/client';

export const Navbar = () => {
  const { user, logout } = useAuth();
  const { tenantSlug, switchTenant } = useTenant();
  const [availableTenants, setAvailableTenants] = useState([
    { slug: 'sample', name: 'Sample Model School' },
    { slug: '7aschoolerpuat', name: '7A School ERP UAT' },
  ]);

  useEffect(() => {
    // Optionally fetch active tenants from control plane
    const fetchTenants = async () => {
      try {
        const res = await api.get('/control/tenants');
        if (res.data && Array.isArray(res.data) && res.data.length > 0) {
          const list = res.data.map((t) => ({
            slug: t.slug,
            name: t.school_name || t.slug,
          }));
          setAvailableTenants(list);
        }
      } catch (e) {
        // Fallback to default presets
      }
    };
    fetchTenants();
  }, []);

  return (
    <header className="h-16 bg-white border-b border-slate-200 fixed top-0 right-0 left-64 z-20 flex items-center justify-between px-6">
      {/* Active Tenant / School Switcher or SuperAdmin Badge */}
      <div className="flex items-center gap-3">
        {user?.isSuperAdmin || user?.role === 'SUPER_ADMIN' ? (
          <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-lg text-xs font-semibold text-amber-800">
            <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
            <span>👑 SaaS Platform Operator Mode (All Tenants Overview)</span>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-700 shadow-sm">
              <School size={15} className="text-blue-600" />
              <span className="text-slate-500">School Database:</span>
              <select
                value={tenantSlug}
                onChange={(e) => switchTenant(e.target.value)}
                className="bg-white border border-slate-200 rounded-lg px-2 py-1 text-xs font-bold text-blue-700 focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
                title="Switch Active School Database"
              >
                {availableTenants.map((t) => (
                  <option key={t.slug} value={t.slug}>
                    {t.name} ({t.slug})
                  </option>
                ))}
                {!availableTenants.some((t) => t.slug === tenantSlug) && (
                  <option value={tenantSlug}>{tenantSlug}</option>
                )}
              </select>
            </div>

            <div className="hidden sm:flex items-center gap-1 text-[11px] bg-emerald-50 text-emerald-700 font-semibold px-2.5 py-1.5 rounded-xl border border-emerald-200">
              <ShieldCheck size={13} />
              <span>Multi-Tenant DB Active</span>
            </div>
          </div>
        )}
      </div>

      {/* Right User Bar */}
      <div className="flex items-center gap-4">
        <div className="text-right">
          <div className="text-xs font-bold text-slate-800">
            {user?.username || user?.full_name || 'Staff User'}
          </div>
          <div className="text-[10px] text-slate-500 font-medium">
            {user?.roles?.[0] || user?.role || 'Staff'}
          </div>
        </div>

        <button
          onClick={logout}
          className="flex items-center gap-1.5 text-xs font-semibold text-red-600 bg-red-50 hover:bg-red-100 border border-red-200 px-3 py-1.5 rounded-xl transition-colors shadow-sm"
          title="Sign out"
        >
          <LogOut size={14} />
          <span>Logout</span>
        </button>
      </div>
    </header>
  );
};
