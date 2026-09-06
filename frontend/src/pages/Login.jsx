import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, User, Shield, School, ArrowRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTenant } from '../context/TenantContext';

export const Login = () => {
  const { login } = useAuth();
  const { settings, tenantSlug } = useTenant();
  const navigate = useNavigate();

  const [username, setUsername] = useState(() => (tenantSlug === 'sample' ? 'admin@sample.com' : ''));
  const [password, setPassword] = useState(() => (tenantSlug === 'sample' ? 'Admin123!' : ''));
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const userData = await login(username, password, isSuperAdmin);
      if (isSuperAdmin || userData?.isSuperAdmin || userData?.role === 'SUPER_ADMIN') {
        navigate('/superadmin');
      } else {
        navigate('/');
      }
    } catch (err) {
      setError(err.message || 'Login failed. Check credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-blue-600 font-black text-white text-2xl shadow-lg shadow-blue-600/30 mb-4">
          7A
        </div>
        <h2 className="text-2xl font-black text-white tracking-tight">
          {isSuperAdmin ? 'Platform Super Admin Portal' : settings.school_name}
        </h2>
        <p className="text-xs text-slate-400 mt-1 uppercase tracking-wider font-medium flex items-center justify-center gap-2">
          <span>{isSuperAdmin ? '7A Digital Solution — Control Plane' : 'Staff & Faculty ERP Login'}</span>
          {!isSuperAdmin && (
            <span className="bg-blue-900/60 text-blue-300 font-mono text-[10px] px-2 py-0.5 rounded-full border border-blue-700/50 lowercase">
              slug: {tenantSlug}
            </span>
          )}
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-slate-900 border border-slate-800 py-8 px-6 shadow-2xl rounded-2xl sm:px-10">
          {/* Mode Switcher */}
          <div className="flex bg-slate-950 p-1 rounded-lg mb-6 border border-slate-800">
            <button
              type="button"
              onClick={() => { setIsSuperAdmin(false); setUsername('admin@sample.com'); setPassword('Admin123!'); }}
              className={`flex-1 py-2 text-xs font-semibold rounded-md transition-all ${
                !isSuperAdmin ? 'bg-blue-600 text-white shadow' : 'text-slate-400 hover:text-white'
              }`}
            >
              School Principal / Staff
            </button>
            <button
              type="button"
              onClick={() => { setIsSuperAdmin(true); setUsername('superadmin@7aedu.com'); setPassword('AdminSecurePassword123!'); }}
              className={`flex-1 py-2 text-xs font-semibold rounded-md transition-all ${
                isSuperAdmin ? 'bg-amber-600 text-white shadow' : 'text-slate-400 hover:text-white'
              }`}
            >
              👑 Platform Super Admin
            </button>
          </div>

          {error && (
            <div className="mb-4 bg-red-500/10 border border-red-500/30 text-red-400 text-xs px-3 py-2.5 rounded-lg">
              {error}
            </div>
          )}

          <form className="space-y-4" onSubmit={handleSubmit}>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                {isSuperAdmin ? 'Super Admin Email' : 'Username / Email / Phone'}
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                  <User size={16} />
                </div>
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full pl-10 pr-3 py-2.5 bg-slate-950 border border-slate-800 rounded-lg text-sm text-white focus:outline-none focus:border-blue-500"
                  placeholder="Enter username"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Password</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                  <Lock size={16} />
                </div>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-3 py-2.5 bg-slate-950 border border-slate-800 rounded-lg text-sm text-white focus:outline-none focus:border-blue-500"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-blue-600 hover:bg-blue-500 text-white font-semibold text-sm rounded-lg shadow-lg shadow-blue-600/30 transition-all disabled:opacity-50"
            >
              <span>{loading ? 'Authenticating...' : 'Sign In'}</span>
              <ArrowRight size={16} />
            </button>
          </form>

          {/* Quick Demo Credentials Helper */}
          <div className="mt-6 pt-4 border-t border-slate-800 text-[11px] text-slate-400 space-y-1">
            <div className="font-semibold text-slate-300">Quick Test Credentials:</div>
            <div>Staff: <code className="text-blue-400">admin@sample.7aedu.com</code> / <code className="text-blue-400">SamplePass123!</code></div>
            <div>Super Admin: <code className="text-blue-400">superadmin@7aedu.com</code> / <code className="text-blue-400">AdminSecurePassword123!</code></div>
          </div>
        </div>
      </div>
    </div>
  );
};
