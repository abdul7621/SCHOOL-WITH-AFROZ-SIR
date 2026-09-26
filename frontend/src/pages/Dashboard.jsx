import React, { useState, useEffect } from 'react';
import { Link, Navigate } from 'react-router-dom';
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
  FileText,
  ClipboardList,
  Stamp,
  PenTool,
  X,
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

  // FIX-10: Dynamic Syllabus State
  const [syllabusList, setSyllabusList] = useState([]);
  const [loadingSyllabus, setLoadingSyllabus] = useState(false);

  // FIX-11: Official Seal & Signature Studio States
  const [showStudioModal, setShowStudioModal] = useState(false);
  const [schoolSealUrl, setSchoolSealUrl] = useState('');
  const [principalSigUrl, setPrincipalSigUrl] = useState('');
  const [savingStudio, setSavingStudio] = useState(false);
  const [studioSuccess, setStudioSuccess] = useState('');

  const isAdmin =
    user?.role === 'ADMIN' ||
    user?.role === 'SUPER_ADMIN' ||
    user?.roles?.includes('ADMIN') ||
    user?.roles?.includes('SUPER_ADMIN');

  const isParentOnly =
    !isAdmin &&
    (user?.user_type === 'PARENT' || user?.roles?.includes('PARENT')) &&
    !user?.roles?.some((r) => ['ADMIN', 'PRINCIPAL', 'TEACHER', 'ACCOUNTANT', 'CASHIER'].includes(r));

  useEffect(() => {
    if (!isAdmin && user) {
      if (user.role === 'TEACHER' || user.roles?.includes('TEACHER')) {
        setActiveRoleView('TEACHER');
      } else if (
        user.role === 'CASHIER' ||
        user.role === 'ACCOUNTANT' ||
        user.roles?.includes('CASHIER') ||
        user.roles?.includes('ACCOUNTANT')
      ) {
        setActiveRoleView('CASHIER');
      }
    }
  }, [user, isAdmin]);

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

  const fetchSyllabusProgress = async () => {
    setLoadingSyllabus(true);
    try {
      const res = await api.get('/academics/syllabus/completion-summary');
      const items = Array.isArray(res.data) ? res.data : (res.data?.data || []);
      setSyllabusList(items);
    } catch (err) {
      console.warn('Could not load dynamic syllabus meter:', err);
    } finally {
      setLoadingSyllabus(false);
    }
  };

  const fetchSealSettings = async () => {
    try {
      const res = await api.get('/settings/public');
      if (res.data) {
        setSchoolSealUrl(res.data.school_seal_image || '');
        setPrincipalSigUrl(res.data.principal_signature_image || '');
      }
    } catch (err) {
      console.warn('Could not load seal settings:', err);
    }
  };

  useEffect(() => {
    if (isParentOnly) return;
    fetchDashboardStats();
    fetchSyllabusProgress();
    fetchSealSettings();
  }, [isParentOnly]);

  if (isParentOnly) {
    return <Navigate to="/parent-portal" replace />;
  }

  const handleSaveStudio = async (e) => {
    e.preventDefault();
    setSavingStudio(true);
    try {
      await api.post('/settings', {
        setting_key: 'school_seal_image',
        setting_value: schoolSealUrl.trim(),
        is_public: true,
        description: 'Official round seal and stamp of the school',
      });
      await api.post('/settings', {
        setting_key: 'principal_signature_image',
        setting_value: principalSigUrl.trim(),
        is_public: true,
        description: 'Authorized digital signature of the School Principal',
      });
      setStudioSuccess('Official Seal & Principal Signature synchronized successfully!');
      setTimeout(() => {
        setStudioSuccess('');
        setShowStudioModal(false);
      }, 1400);
    } catch (err) {
      alert(err.response?.data?.message || err.message || 'Failed to save studio settings');
    } finally {
      setSavingStudio(false);
    }
  };

  const cashInHand = stats.finance.mode_breakdown['CASH'] || stats.finance.mode_breakdown['Cash'] || 0.0;
  const upiInflow = stats.finance.mode_breakdown['UPI'] || stats.finance.mode_breakdown['Online'] || 0.0;

  return (
    <div className="space-y-6">
      {/* Role Preview Switcher Bar (Admins Only) */}
      {isAdmin && (
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
      )}

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
            {/* Syllabus Velocity Speedometer (FIX-10 Dynamic) */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2 font-bold text-slate-900 text-sm">
                  <Clock size={18} className="text-blue-600" />
                  <span>Syllabus Completion Speedometer</span>
                </div>
                <Link
                  to="/academics/timetable"
                  className="text-[10px] font-bold bg-blue-50 text-blue-700 hover:bg-blue-100 px-2.5 py-1 rounded-full transition-colors"
                >
                  View Timetable &rarr;
                </Link>
              </div>

              <div className="space-y-4 text-xs">
                {loadingSyllabus ? (
                  <div className="py-8 text-center text-slate-400 font-bold animate-pulse">
                    Computing real curriculum coverage velocity...
                  </div>
                ) : syllabusList.length > 0 ? (
                  syllabusList.slice(0, 4).map((s, idx) => {
                    const barColor =
                      s.status === 'ON_TRACK'
                        ? 'bg-emerald-500'
                        : s.status === 'SLIGHTLY_BEHIND'
                        ? 'bg-amber-500'
                        : 'bg-rose-500';
                    const textColor =
                      s.status === 'ON_TRACK'
                        ? 'text-emerald-600'
                        : s.status === 'SLIGHTLY_BEHIND'
                        ? 'text-amber-600'
                        : 'text-rose-600';

                    return (
                      <div key={idx}>
                        <div className="flex justify-between font-bold mb-1">
                          <span className="text-slate-800">
                            {s.class_name} &bull; {s.subject_name}
                          </span>
                          <span className={textColor}>
                            {s.completion_percentage}% ({s.status_label})
                          </span>
                        </div>
                        <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full ${barColor} rounded-full transition-all duration-500`}
                            style={{ width: `${Math.min(100, s.completion_percentage)}%` }}
                          ></div>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="py-6 text-center text-slate-400">
                    No curriculum subjects mapped yet.{' '}
                    <Link to="/academics" className="text-blue-600 font-bold underline">
                      Configure Subjects &rarr;
                    </Link>
                  </div>
                )}
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
                    to="/attendance?tab=leaves"
                    className="p-3 bg-slate-50 hover:bg-blue-50 border border-slate-200 rounded-xl font-bold text-slate-800 transition-colors block text-center"
                  >
                    📋 Review Leave Applications
                  </Link>
                  <Link
                    to="/documents"
                    className="p-3 bg-slate-50 hover:bg-blue-50 border border-slate-200 rounded-xl font-bold text-slate-800 transition-colors block text-center"
                  >
                    📄 Issue Transfer Certificate (TC)
                  </Link>
                  <button
                    type="button"
                    onClick={() => setShowStudioModal(true)}
                    className="p-3 bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-900 rounded-xl font-bold transition-colors block text-center flex items-center justify-center gap-1.5"
                  >
                    <Stamp size={14} className="text-amber-700" />
                    <span>Seal & Signature Studio</span>
                  </button>
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
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between border-b border-slate-100 pb-3 gap-3">
              <div>
                <h3 className="font-bold text-slate-900 text-sm">Teacher Workspace & Daily Routine</h3>
                <p className="text-xs text-slate-500">Attendance marker, daily homework, leave reviews, and behavioral assessment</p>
              </div>
              <div className="flex gap-2 flex-wrap">
                <Link
                  to="/attendance"
                  className="bg-blue-600 hover:bg-blue-500 text-white font-bold px-3 py-1.5 rounded-xl text-xs shadow flex items-center gap-1.5"
                >
                  <CalendarCheck size={14} /> Attendance
                </Link>
                <Link
                  to="/academics?tab=homework"
                  className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold px-3 py-1.5 rounded-xl text-xs shadow flex items-center gap-1.5"
                >
                  <FileText size={14} /> Assign Homework
                </Link>
                <Link
                  to="/attendance?tab=leaves"
                  className="bg-purple-600 hover:bg-purple-500 text-white font-bold px-3 py-1.5 rounded-xl text-xs shadow flex items-center gap-1.5"
                >
                  <ClipboardList size={14} /> Review Leaves
                </Link>
                <Link
                  to="/development"
                  className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold px-3 py-1.5 rounded-xl text-xs shadow flex items-center gap-1.5"
                >
                  <Award size={14} /> Behavior
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

      {/* Official School Seal & Principal Signature Studio Modal (FIX-11) */}
      {showStudioModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden border border-slate-200 animate-in zoom-in-95">
            <div className="p-5 bg-gradient-to-r from-amber-600 to-amber-700 text-white flex justify-between items-center">
              <div className="flex items-center gap-2.5">
                <Stamp size={20} />
                <div>
                  <h3 className="font-black text-sm">Official Seal & Principal Signature Studio</h3>
                  <p className="text-[10px] text-amber-200">Auto-embed on Transfer Certificates, Report Cards & Awards</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowStudioModal(false)}
                className="text-white/80 hover:text-white"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveStudio} className="p-5 space-y-4">
              {studioSuccess && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs font-bold flex items-center gap-2">
                  <CheckCircle2 size={16} className="shrink-0" />
                  <span>{studioSuccess}</span>
                </div>
              )}

              {/* School Seal */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                  <Stamp size={13} className="text-amber-600" />
                  <span>Official School Round Seal / Stamp Image URL</span>
                </label>
                <input
                  type="url"
                  value={schoolSealUrl}
                  onChange={(e) => setSchoolSealUrl(e.target.value)}
                  placeholder="https://example.com/assets/school-seal.png"
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium text-slate-800 outline-none focus:ring-2 focus:ring-amber-500 font-mono"
                />
              </div>

              {/* Principal Signature */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                  <PenTool size={13} className="text-blue-600" />
                  <span>Principal Authorized Signature Image URL</span>
                </label>
                <input
                  type="url"
                  value={principalSigUrl}
                  onChange={(e) => setPrincipalSigUrl(e.target.value)}
                  placeholder="https://example.com/assets/principal-signature.png"
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium text-slate-800 outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                />
              </div>

              {/* Live Preview Box */}
              <div className="p-4 bg-slate-50 border border-dashed border-slate-300 rounded-xl">
                <div className="text-[10px] uppercase font-bold text-slate-400 mb-3 text-center">
                  Live Certificate / TC Stamping Preview
                </div>
                <div className="flex items-center justify-between bg-white p-3 rounded-lg border border-slate-200">
                  <div className="text-center">
                    <div className="w-16 h-16 border-2 border-dashed border-slate-300 rounded-full flex items-center justify-center overflow-hidden mx-auto bg-slate-50">
                      {schoolSealUrl ? (
                        <img src={schoolSealUrl} alt="Seal Preview" className="w-full h-full object-contain p-1" />
                      ) : (
                        <span className="text-[9px] text-slate-400 font-bold">No Seal</span>
                      )}
                    </div>
                    <div className="text-[9px] font-bold text-slate-500 mt-1">School Seal</div>
                  </div>

                  <div className="text-center">
                    <div className="h-12 w-28 border-b border-slate-400 flex items-center justify-center overflow-hidden mx-auto">
                      {principalSigUrl ? (
                        <img src={principalSigUrl} alt="Signature Preview" className="max-h-10 object-contain" />
                      ) : (
                        <span className="text-[9px] text-slate-400 italic">No Signature</span>
                      )}
                    </div>
                    <div className="text-[10px] font-bold text-slate-700 mt-1">Principal (Authorized)</div>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  disabled={savingStudio}
                  onClick={() => setShowStudioModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingStudio}
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-xl font-bold text-xs shadow flex items-center gap-1.5"
                >
                  {savingStudio ? 'Synchronizing...' : 'Save & Synchronize Documents'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
