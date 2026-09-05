import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Users,
  CalendarCheck,
  CreditCard,
  DollarSign,
  TrendingUp,
  AlertTriangle,
  BookOpen,
  Clock,
  CheckCircle2,
  Printer,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Award,
  RefreshCcw,
} from 'lucide-react';
import { StatCard } from '../components/StatCard';
import { useAuth } from '../context/AuthContext';
import { useTenant } from '../context/TenantContext';
import api from '../api/client';

export const Dashboard = () => {
  const { user } = useAuth();
  const { settings } = useTenant();
  const [activeRoleView, setActiveRoleView] = useState('PRINCIPAL'); // PRINCIPAL, TEACHER, CASHIER, ADMIN
  const [loading, setLoading] = useState(true);

  // Live KPI Stats State
  const [stats, setStats] = useState({
    date: new Date().toISOString().split('T')[0],
    total_students: 0,
    attendance: {
      total_marked: 0,
      present: 0,
      absent: 0,
      rate_percentage: 0.0,
    },
    finance: {
      today_collections: 0.0,
      mode_breakdown: {},
      total_outstanding: 0.0,
    },
    staff: {
      total_active: 0,
    },
    admissions: {
      pending_inquiries: 0,
    },
    recent_collections: [],
  });

  const fetchDashboardStats = async () => {
    setLoading(true);
    try {
      const res = await api.get('/reports/dashboard/stats');
      if (res.data) {
        setStats(res.data);
      }
    } catch (err) {
      console.error('Error fetching live dashboard metrics:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardStats();
  }, []);

  const cashInHand = stats.finance.mode_breakdown['CASH'] || stats.finance.mode_breakdown['Cash'] || 0.0;
  const upiInflow = stats.finance.mode_breakdown['UPI'] || stats.finance.mode_breakdown['Online'] || 0.0;

  return (
    <div className="space-y-6">
      {/* Role Preview Switcher Bar */}
      <div className="bg-slate-900 text-white p-3 sm:p-4 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-lg">
        <div className="flex items-center gap-2">
          <Sparkles size={16} className="text-amber-400" />
          <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
            Interactive Multi-Role View Switcher:
          </span>
        </div>

        <div className="flex bg-slate-800 p-1 rounded-xl text-xs font-bold">
          <button
            onClick={() => setActiveRoleView('PRINCIPAL')}
            className={`px-3 py-1.5 rounded-lg transition-all ${
              activeRoleView === 'PRINCIPAL' ? 'bg-blue-600 text-white shadow' : 'text-slate-400 hover:text-white'
            }`}
          >
            Principal Cockpit
          </button>
          <button
            onClick={() => setActiveRoleView('TEACHER')}
            className={`px-3 py-1.5 rounded-lg transition-all ${
              activeRoleView === 'TEACHER' ? 'bg-blue-600 text-white shadow' : 'text-slate-400 hover:text-white'
            }`}
          >
            Teacher Workspace
          </button>
          <button
            onClick={() => setActiveRoleView('CASHIER')}
            className={`px-3 py-1.5 rounded-lg transition-all ${
              activeRoleView === 'CASHIER' ? 'bg-blue-600 text-white shadow' : 'text-slate-400 hover:text-white'
            }`}
          >
            Cashier POS
          </button>
          <button
            onClick={() => setActiveRoleView('ADMIN')}
            className={`px-3 py-1.5 rounded-lg transition-all ${
              activeRoleView === 'ADMIN' ? 'bg-blue-600 text-white shadow' : 'text-slate-400 hover:text-white'
            }`}
          >
            Admin Overview
          </button>
        </div>
      </div>

      {/* VIEW 1: PRINCIPAL COCKPIT */}
      {activeRoleView === 'PRINCIPAL' && (
        <div className="space-y-6">
          {/* Top KPI Cards - 100% Live Dynamic Data */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              title="Today's Attendance Rate"
              value={stats.attendance.total_marked > 0 ? `${stats.attendance.rate_percentage}%` : '0%'}
              subtitle={`${stats.attendance.present} Present • ${stats.attendance.absent} Absent Today`}
              icon={CalendarCheck}
              trend={stats.attendance.rate_percentage > 90 ? 'High' : 'Normal'}
              color="emerald"
            />
            <StatCard
              title="Today's Fee Collections"
              value={`₹${stats.finance.today_collections.toLocaleString()}`}
              subtitle={`${stats.recent_collections.length} Recent Collections`}
              icon={CreditCard}
              trend="Live"
              color="blue"
            />
            <StatCard
              title="Total Active Students"
              value={stats.total_students.toString()}
              subtitle="Enrolled Across All Classes"
              icon={Users}
              color="indigo"
            />
            <StatCard
              title="Total Fee Dues"
              value={`₹${stats.finance.total_outstanding.toLocaleString()}`}
              subtitle="Unpaid Student Demands"
              icon={DollarSign}
              trend="Outstanding"
              color="amber"
            />
          </div>

          {/* 2-Column Grid: Syllabus Targets & Campus Actions */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Syllabus Velocity Speedometer */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2 font-bold text-slate-900 text-sm">
                  <Clock size={18} className="text-blue-600" />
                  <span>Syllabus Completion Speedometer</span>
                </div>
                <span className="text-[10px] font-bold bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full">
                  Term 1 Targets
                </span>
              </div>

              <div className="space-y-4 text-xs">
                <div>
                  <div className="flex justify-between font-bold mb-1">
                    <span className="text-slate-800">Class 8 — Mathematics</span>
                    <span className="text-emerald-600">68% (On Track)</span>
                  </div>
                  <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-500 rounded-full" style={{ width: '68%' }}></div>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between font-bold mb-1">
                    <span className="text-slate-800">Class 9 — Science & Physics</span>
                    <span className="text-rose-600">38% (12 Days Behind Schedule)</span>
                  </div>
                  <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-rose-500 rounded-full" style={{ width: '38%' }}></div>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between font-bold mb-1">
                    <span className="text-slate-800">Class 10 — English Language</span>
                    <span className="text-emerald-600">74% (On Track)</span>
                  </div>
                  <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-500 rounded-full" style={{ width: '74%' }}></div>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Actions & Recent Notices */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4 flex flex-col justify-between">
              <div>
                <div className="font-bold text-slate-900 text-sm mb-3 flex items-center gap-2">
                  <ShieldCheck size={18} className="text-emerald-600" />
                  <span>Campus Executive Actions</span>
                </div>
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <Link
                    to="/reports"
                    className="p-3 bg-slate-50 hover:bg-blue-50 border border-slate-200 rounded-xl font-bold text-slate-800 transition-colors block text-center"
                  >
                    📊 Overdue Fee Defaulters List
                  </Link>
                  <Link
                    to="/documents"
                    className="p-3 bg-slate-50 hover:bg-blue-50 border border-slate-200 rounded-xl font-bold text-slate-800 transition-colors block text-center"
                  >
                    📄 Issue Transfer Certificate (TC)
                  </Link>
                  <Link
                    to="/attendance"
                    className="p-3 bg-slate-50 hover:bg-blue-50 border border-slate-200 rounded-xl font-bold text-slate-800 transition-colors block text-center"
                  >
                    📅 Class Attendance Summary
                  </Link>
                  <Link
                    to="/development"
                    className="p-3 bg-slate-50 hover:bg-blue-50 border border-slate-200 rounded-xl font-bold text-slate-800 transition-colors block text-center"
                  >
                    ⭐ 5-Star Behavioral Ratings
                  </Link>
                </div>
              </div>
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-900 flex items-center justify-between">
                <span>Total Active Staff Members: <strong>{stats.staff.total_active}</strong></span>
                <Link to="/staff" className="font-bold underline text-blue-700">View Staff &rarr;</Link>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* VIEW 2: TEACHER WORKSPACE */}
      {activeRoleView === 'TEACHER' && (
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-bold text-slate-900 text-sm">Teacher Workspace & Daily Routine</h3>
                <p className="text-xs text-slate-500">Attendance marker, behavioral assessment, and class marks</p>
              </div>
              <div className="flex gap-2">
                <Link
                  to="/attendance"
                  className="bg-blue-600 hover:bg-blue-500 text-white font-bold px-4 py-2 rounded-xl text-xs shadow flex items-center gap-1.5"
                >
                  <CalendarCheck size={14} /> Take Attendance Now
                </Link>
                <Link
                  to="/development"
                  className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold px-4 py-2 rounded-xl text-xs shadow flex items-center gap-1.5"
                >
                  <Award size={14} /> Rate Behavior
                </Link>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl">
                <span className="text-[10px] font-bold text-blue-700 uppercase">Period 1 (08:30 - 09:15)</span>
                <div className="font-bold text-slate-900 mt-1">Mathematics (Class 8-A)</div>
                <div className="text-slate-500 text-[11px]">Topic: Linear Equations</div>
              </div>
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                <span className="text-[10px] font-bold text-slate-500 uppercase">Period 2 (09:15 - 10:00)</span>
                <div className="font-bold text-slate-500 mt-1">Free Period / Lesson Prep</div>
              </div>
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl">
                <span className="text-[10px] font-bold text-blue-700 uppercase">Period 3 (10:15 - 11:00)</span>
                <div className="font-bold text-slate-900 mt-1">Science Discovery (Class 9-B)</div>
                <div className="text-slate-500 text-[11px]">Topic: Chemical Reactions</div>
              </div>
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl">
                <span className="text-[10px] font-bold text-blue-700 uppercase">Period 5 (12:00 - 12:45)</span>
                <div className="font-bold text-slate-900 mt-1">Math Remedial (Class 8-B)</div>
                <div className="text-slate-500 text-[11px]">Practice session</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* VIEW 3: CASHIER POS */}
      {activeRoleView === 'CASHIER' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-5 bg-emerald-50 border border-emerald-200 rounded-2xl">
              <div className="text-xs font-bold text-emerald-800 uppercase">Today's Counter Collections</div>
              <div className="text-2xl font-black text-emerald-950 mt-1">
                ₹{stats.finance.today_collections.toLocaleString()}
              </div>
              <div className="text-xs text-emerald-700 mt-0.5">
                {stats.recent_collections.length} Confirmed Receipts
              </div>
            </div>
            <div className="p-5 bg-white border border-slate-200 rounded-2xl shadow-sm">
              <div className="text-xs font-bold text-slate-500 uppercase">Cash In Hand Today</div>
              <div className="text-2xl font-black text-slate-900 mt-1">
                ₹{cashInHand.toLocaleString()}
              </div>
            </div>
            <div className="p-5 bg-white border border-slate-200 rounded-2xl shadow-sm">
              <div className="text-xs font-bold text-slate-500 uppercase">Digital / UPI Inflow</div>
              <div className="text-2xl font-black text-blue-600 mt-1">
                ₹{upiInflow.toLocaleString()}
              </div>
            </div>
          </div>

          {/* Recent Collections Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-slate-900 text-sm">Recent Fee Collections</h3>
                <p className="text-xs text-slate-500">Live ledger transaction receipts</p>
              </div>
              <Link
                to="/fees"
                className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-4 py-2 rounded-xl text-xs shadow flex items-center gap-2"
              >
                <CreditCard size={14} /> Open Cashier POS
              </Link>
            </div>

            {stats.recent_collections.length > 0 ? (
              <div className="divide-y divide-slate-100 text-xs">
                {stats.recent_collections.map((rc, idx) => (
                  <div key={idx} className="py-2.5 flex items-center justify-between">
                    <div>
                      <span className="font-mono font-bold text-blue-700">{rc.receipt_no}</span>
                      <span className="mx-2 text-slate-300">•</span>
                      <span className="font-semibold text-slate-800">{rc.student_name}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded text-[11px] font-semibold">{rc.mode}</span>
                      <span className="font-black text-emerald-600">₹{rc.amount.toLocaleString()}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6 text-slate-400 text-xs">
                No fee collections recorded today yet.
              </div>
            )}
          </div>
        </div>
      )}

      {/* VIEW 4: ADMIN OVERVIEW */}
      {activeRoleView === 'ADMIN' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-5 bg-white border border-slate-200 rounded-2xl shadow-sm">
              <div className="text-xs font-bold text-slate-500 uppercase">Total Enrolled Students</div>
              <div className="text-2xl font-black text-slate-900 mt-1">{stats.total_students} Students</div>
              <Link to="/students" className="text-xs font-bold text-blue-600 hover:underline mt-1 block">
                View Directory &rarr;
              </Link>
            </div>
            <div className="p-5 bg-white border border-slate-200 rounded-2xl shadow-sm">
              <div className="text-xs font-bold text-slate-500 uppercase">Teaching & Staff Directory</div>
              <div className="text-2xl font-black text-slate-900 mt-1">{stats.staff.total_active} Members</div>
              <Link to="/staff" className="text-xs font-bold text-blue-600 hover:underline mt-1 block">
                Manage Staff & Roles &rarr;
              </Link>
            </div>
            <div className="p-5 bg-white border border-slate-200 rounded-2xl shadow-sm">
              <div className="text-xs font-bold text-slate-500 uppercase">Website Admission Inquiries</div>
              <div className="text-2xl font-black text-blue-600 mt-1">
                {stats.admissions.pending_inquiries} New Leads
              </div>
              <Link to="/cms" className="text-xs font-bold text-blue-600 hover:underline mt-1 block">
                Review Inquiries &rarr;
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
