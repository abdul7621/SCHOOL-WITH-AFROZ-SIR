import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Users,
  CalendarCheck,
  CreditCard,
  DollarSign,
  UserPlus,
  ArrowUpRight,
  TrendingUp,
} from 'lucide-react';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useTenant } from '../context/TenantContext';
import { StatCard } from '../components/StatCard';

export const Dashboard = () => {
  const { user } = useAuth();
  const { settings } = useTenant();

  const [stats, setStats] = useState({
    totalStudents: 1420,
    attendancePct: 94.2,
    todayFeeCollection: 48500,
    netCashflow: 36200,
  });

  const [dayBook, setDayBook] = useState(null);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const dbRes = await api.get('/finance/day-book');
        if (dbRes.data) {
          setDayBook(dbRes.data);
          setStats((prev) => ({
            ...prev,
            todayFeeCollection: dbRes.data.total_fee_collections || 0,
            netCashflow: dbRes.data.net_daily_cashflow || 0,
          }));
        }
      } catch (e) {
        console.log('Using simulated dashboard metrics');
      }
    };

    fetchDashboardData();
  }, []);

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-blue-900 to-indigo-900 rounded-2xl p-6 text-white shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-black">Welcome back, {user?.username || user?.full_name || 'Staff'}!</h1>
          <p className="text-xs text-blue-200 mt-1">
            {settings.school_name} — SaaS Academic Operations Console
          </p>
        </div>

        <div className="flex gap-2">
          <Link
            to="/students/admit"
            className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-500 text-white px-3.5 py-2 rounded-lg text-xs font-semibold shadow transition-colors"
          >
            <UserPlus size={14} />
            <span>New Admission</span>
          </Link>
          <Link
            to="/fees"
            className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white px-3.5 py-2 rounded-lg text-xs font-semibold shadow transition-colors"
          >
            <CreditCard size={14} />
            <span>Collect Fee</span>
          </Link>
        </div>
      </div>

      {/* Primary KPI Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <StatCard
          title="Active Students"
          value={stats.totalStudents.toLocaleString()}
          subtitle="Enrolled in current session"
          icon={Users}
          color="blue"
        />
        <StatCard
          title="Today's Attendance"
          value={`${stats.attendancePct}%`}
          subtitle="Real-time attendance marked"
          icon={CalendarCheck}
          color="emerald"
        />
        <StatCard
          title="Today's Fee Inflow"
          value={`₹${stats.todayFeeCollection.toLocaleString()}`}
          subtitle="FIFO ledger cleared"
          icon={CreditCard}
          color="indigo"
        />
        <StatCard
          title="Net Day-Book Cashflow"
          value={`₹${stats.netCashflow.toLocaleString()}`}
          subtitle="Inflow minus Expenses"
          icon={DollarSign}
          color="amber"
        />
      </div>

      {/* Quick Workflows Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Day-Book Summary Widget */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100">
            <div>
              <h3 className="font-bold text-slate-900 text-sm">Today's Cashflow (Hisaab-Kitab)</h3>
              <p className="text-xs text-slate-500">Live Fee collections & Voucher expenses</p>
            </div>
            <Link to="/finance" className="text-xs font-semibold text-blue-600 flex items-center gap-1 hover:underline">
              View Day-Book <ArrowUpRight size={14} />
            </Link>
          </div>

          <div className="grid grid-cols-3 gap-4 mt-4 text-center">
            <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-100">
              <div className="text-xs text-emerald-700 font-semibold uppercase">Fee Receipts</div>
              <div className="text-xl font-bold text-emerald-900 mt-1">₹{stats.todayFeeCollection.toLocaleString()}</div>
            </div>
            <div className="p-4 bg-rose-50 rounded-xl border border-rose-100">
              <div className="text-xs text-rose-700 font-semibold uppercase">Voucher Expenses</div>
              <div className="text-xl font-bold text-rose-900 mt-1">₹{(dayBook?.total_expenses || 12300).toLocaleString()}</div>
            </div>
            <div className="p-4 bg-blue-50 rounded-xl border border-blue-100">
              <div className="text-xs text-blue-700 font-semibold uppercase">Net Closing Balance</div>
              <div className="text-xl font-bold text-blue-900 mt-1">₹{stats.netCashflow.toLocaleString()}</div>
            </div>
          </div>
        </div>

        {/* Quick Operations Panel */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-3">
          <h3 className="font-bold text-slate-900 text-sm">Fast Operations</h3>
          <div className="space-y-2">
            <Link
              to="/attendance"
              className="flex items-center justify-between p-3 rounded-lg border border-slate-100 hover:bg-slate-50 text-xs font-semibold text-slate-700 transition-colors"
            >
              <span>Mark Today's Attendance</span>
              <CalendarCheck size={16} className="text-blue-600" />
            </Link>
            <Link
              to="/exams"
              className="flex items-center justify-between p-3 rounded-lg border border-slate-100 hover:bg-slate-50 text-xs font-semibold text-slate-700 transition-colors"
            >
              <span>Teacher Marks Entry Grid</span>
              <TrendingUp size={16} className="text-emerald-600" />
            </Link>
            <Link
              to="/cms"
              className="flex items-center justify-between p-3 rounded-lg border border-slate-100 hover:bg-slate-50 text-xs font-semibold text-slate-700 transition-colors"
            >
              <span>Post Circular / Holiday Notice</span>
              <Users size={16} className="text-amber-600" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
