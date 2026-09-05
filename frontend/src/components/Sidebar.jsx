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
  Layers,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTenant } from '../context/TenantContext';

export const Sidebar = () => {
  const { user, hasPermission } = useAuth();
  const { settings } = useTenant();

  const isSuperAdmin = user?.role === 'SUPER_ADMIN' || user?.isSuperAdmin;

  const superAdminNavItems = [
    { to: '/superadmin', label: 'Schools / Tenants Directory', icon: School, show: true },
    { to: '/landing', label: 'SaaS Platform Preview', icon: Globe, show: true },
  ];

  const schoolNavItems = [
    { to: '/', label: 'Principal Dashboard', icon: LayoutDashboard, show: true },
    { to: '/students', label: 'Students & 360° Profile', icon: Users, show: hasPermission('students:view') },
    { to: '/academics', label: 'Classes & Sessions', icon: Layers, show: true },
    { to: '/academics/timetable', label: 'Timetable & Syllabus', icon: GraduationCap, show: true },
    { to: '/attendance', label: 'Daily Attendance', icon: CalendarCheck, show: hasPermission('attendance:view') },
    { to: '/fees', label: 'Fee Collection (FIFO)', icon: CreditCard, show: hasPermission('fees:view') },
    { to: '/exams', label: 'Exams & Marks', icon: BookOpen, show: hasPermission('academics:manage') },
    { to: '/finance', label: 'Day-Book & Finance', icon: DollarSign, show: hasPermission('finance:view') },
    { to: '/migration', label: 'Excel Data Migration', icon: FileSpreadsheet, show: hasPermission('excel:import_export') },
    { to: '/documents', label: 'Certificates & TC Vault', icon: FileText, show: hasPermission('documents:generate') },
    { to: '/reports', label: 'Reports & Analytics', icon: BarChart3, show: hasPermission('fees:view_reports') },
    { to: '/cms', label: 'Website CMS & Notices', icon: Globe, show: true },
    { to: '/parent-portal', label: 'Parent Portal View', icon: Users, show: true },
  ];

  const navItems = isSuperAdmin ? superAdminNavItems : schoolNavItems;

  return (
    <aside className="w-64 bg-slate-900 text-slate-300 flex flex-col h-screen fixed left-0 top-0 z-30 border-r border-slate-800">
      {/* Brand Header */}
      <div className="h-16 flex items-center px-6 gap-3 border-b border-slate-800">
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-black text-white text-lg ${
          isSuperAdmin ? 'bg-amber-600 shadow-amber-600/30' : 'bg-blue-600 shadow-blue-600/30'
        }`}>
          7A
        </div>
        <div className="overflow-hidden">
          <div className="font-bold text-white text-sm truncate">
            {isSuperAdmin ? '7A Control Plane' : settings.school_name}
          </div>
          <div className={`text-[11px] font-medium tracking-wide uppercase ${
            isSuperAdmin ? 'text-amber-400' : 'text-blue-400'
          }`}>
            {isSuperAdmin ? 'Platform Super Admin' : 'School ERP Cockpit'}
          </div>
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
                      ? isSuperAdmin ? 'bg-amber-600 text-white shadow-sm' : 'bg-blue-600 text-white shadow-sm'
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
          <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-white text-xs ${
            isSuperAdmin ? 'bg-amber-600' : 'bg-slate-700'
          }`}>
            {user?.username?.substring(0, 2).toUpperCase() || (isSuperAdmin ? 'SA' : 'PR')}
          </div>
          <div className="overflow-hidden">
            <div className="text-xs font-semibold text-white truncate">
              {user?.username || user?.full_name || (isSuperAdmin ? 'Platform Admin' : 'Principal')}
            </div>
            <div className={`text-[10px] uppercase tracking-wider font-bold ${
              isSuperAdmin ? 'text-amber-400' : 'text-blue-400'
            }`}>
              {isSuperAdmin ? '👑 Super Admin' : '🎓 School Principal'}
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
};
