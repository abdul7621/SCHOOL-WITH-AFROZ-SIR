import React from 'react';
import { Outlet, Navigate, Link } from 'react-router-dom';
import { LogOut, Globe, HeartHandshake, Shield, Sparkles } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTenant } from '../context/TenantContext';

export const ParentLayout = () => {
  const { user, loading, logout } = useAuth();
  const { settings } = useTenant();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900 text-white font-medium">
        Loading Parent Portal...
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      {/* Top Consumer Header (Full Width - Zero Admin Sidebar) */}
      <header className="h-16 bg-white border-b border-slate-200 sticky top-0 z-30 flex items-center justify-between px-4 sm:px-8 shadow-sm">
        {/* Brand / School Info */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-700 to-indigo-600 flex items-center justify-center font-black text-white text-base shadow-md shadow-blue-500/20">
            7A
          </div>
          <div>
            <div className="font-extrabold text-slate-900 text-sm sm:text-base leading-tight">
              {settings.school_name || 'School ERP Portal'}
            </div>
            <div className="text-[11px] font-semibold text-blue-600 flex items-center gap-1">
              <Sparkles size={11} />
              <span>Parent & Student Portal</span>
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-3 sm:gap-4">
          <Link
            to="/website"
            className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors"
          >
            <Globe size={14} className="text-slate-400" />
            <span>School Website</span>
          </Link>

          {/* User Badge */}
          <div className="hidden md:flex items-center gap-2 px-3 py-1 bg-slate-100 rounded-xl text-xs font-medium text-slate-700">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            <span className="font-semibold">{user?.username || user?.full_name || 'Guardian'}</span>
          </div>

          {/* Logout */}
          <button
            onClick={logout}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-xl text-xs font-bold transition-colors border border-rose-200/60"
            title="Log out of parent session"
          >
            <LogOut size={13} />
            <span className="hidden sm:inline">Logout</span>
          </button>
        </div>
      </header>

      {/* Main Content Viewport */}
      <main className="flex-1 p-4 sm:p-6 max-w-5xl w-full mx-auto">
        <Outlet />
      </main>

      {/* Clean Institutional Footer */}
      <footer className="py-4 border-t border-slate-200 bg-white text-center text-xs text-slate-500">
        <div className="flex items-center justify-center gap-2">
          <span>{settings.school_name || '7A School ERP'}</span>
          <span>•</span>
          <span className="text-[11px] text-slate-400">Institutional Parent Workspace</span>
        </div>
      </footer>
    </div>
  );
};
