import React from 'react';
import { LogOut, School, ShieldCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTenant } from '../context/TenantContext';

export const Navbar = () => {
  const { user, logout } = useAuth();
  const { tenantSlug, switchTenant } = useTenant();

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
          <>
            <div className="flex items-center gap-2 bg-slate-100 border border-slate-200 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-700">
              <School size={14} className="text-blue-600" />
              <span>School Database:</span>
              <span className="font-bold text-blue-700">{tenantSlug}</span>
            </div>
            <div className="flex items-center gap-1 text-[11px] bg-emerald-50 text-emerald-700 font-medium px-2.5 py-1 rounded border border-emerald-200">
              <ShieldCheck size={12} />
              <span>Multi-Tenant DB Active</span>
            </div>
          </>
        )}
      </div>

      {/* Right User Bar */}
      <div className="flex items-center gap-4">
        <div className="text-right">
          <div className="text-xs font-bold text-slate-800">{user?.username || user?.full_name || 'Staff User'}</div>
          <div className="text-[10px] text-slate-500">{user?.roles?.[0] || user?.role || 'Staff'}</div>
        </div>

        <button
          onClick={logout}
          className="flex items-center gap-1.5 text-xs font-medium text-red-600 bg-red-50 hover:bg-red-100 border border-red-200 px-3 py-1.5 rounded-lg transition-colors"
          title="Sign out"
        >
          <LogOut size={14} />
          <span>Logout</span>
        </button>
      </div>
    </header>
  );
};
