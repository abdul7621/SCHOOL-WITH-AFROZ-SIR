import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  GraduationCap,
  CalendarCheck,
  CreditCard,
  FileSpreadsheet,
  BookOpen,
  DollarSign,
  Globe,
  ShieldAlert,
  FileText,
  BarChart3,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTenant } from '../context/TenantContext';

export const Sidebar = () => {
  const { user, hasPermission } = useAuth();
  const { settings } = useTenant();

  const navItems = [
    { to: '/', label: 'Dashboard', icon: LayoutDashboard, show: true },
    { to: '/students', label: 'Students & Admission', icon: Users, show: hasPermission('students:view') },
    { to: '/academics', label: 'Classes & Sessions', icon: GraduationCap, show: hasPermission('academics:manage') },
    { to: '/attendance', label: 'Daily Attendance', icon: CalendarCheck, show: hasPermission('attendance:view') },
    { to: '/fees', label: 'Fee Collection (FIFO)', icon: CreditCard, show: hasPermission('fees:view') },
    { to: '/exams', label: 'Exams & Marks', icon: BookOpen, show: hasPermission('academics:manage') },
    { to: '/finance', label: 'Day-Book & Finance', icon: DollarSign, show: hasPermission('finance:view') },
    { to: '/migration', label: 'Excel Data Migration', icon: FileSpreadsheet, show: hasPermission('excel:import_export') },
    { to: '/documents', label: 'Certificates & TC Vault', icon: FileText, show: hasPermission('documents:generate') },
    { to: '/reports', label: 'Reports & Analytics', icon: BarChart3, show: hasPermission('fees:view_reports') },
    { to: '/cms', label: 'Website CMS & Notices', icon: Globe, show: true },
    { to: '/parent-portal', label: 'Parent Portal View', icon: Users, show: true },
    { to: '/superadmin', label: 'Super Admin Control', icon: ShieldAlert, show: user?.role === 'SUPER_ADMIN' || user?.isSuperAdmin },
  ];

  return (
    <aside className="w-64 bg-slate-900 text-slate-300 flex flex-col h-screen fixed left-0 top-0 z-30 border-r border-slate-800">
      {/* Brand Header */}
      <div className="h-16 flex items-center px-6 gap-3 border-b border-slate-800">
        <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center font-black text-white text-lg">
          7A
        </div>
        <div className="overflow-hidden">
          <div className="font-bold text-white text-sm truncate">{settings.school_name}</div>
          <div className="text-[11px] text-blue-400 font-medium tracking-wide uppercase">School ERP SaaS</div>
        </div>
      </div>

      {/* Navigation List */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {navItems
          .filter((item) => item.show)
          .map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                  }`
                }
              >
                <Icon size={18} />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
      </nav>

      {/* User Info Footer */}
      <div className="p-4 border-t border-slate-800 bg-slate-950/50">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center font-bold text-white text-xs">
            {user?.username?.substring(0, 2).toUpperCase() || 'U'}
          </div>
          <div className="overflow-hidden">
            <div className="text-xs font-semibold text-white truncate">{user?.username || user?.full_name || 'User'}</div>
            <div className="text-[10px] text-slate-400 uppercase tracking-wider">{user?.roles?.[0] || user?.role || 'Staff'}</div>
          </div>
        </div>
      </div>
    </aside>
  );
};
