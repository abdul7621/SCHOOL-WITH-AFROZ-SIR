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
} from 'lucide-react';
import { StatCard } from '../components/StatCard';
import { useAuth } from '../context/AuthContext';
import { useTenant } from '../context/TenantContext';
import api from '../api/client';

export const Dashboard = () => {
  const { user } = useAuth();
  const { settings } = useTenant();
  const [activeRoleView, setActiveRoleView] = useState('PRINCIPAL'); // PRINCIPAL, TEACHER, CASHIER, ADMIN
  const [studentsCount, setStudentsCount] = useState(45);
  const [todayCollections, setTodayCollections] = useState(18500);

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
          {/* Top KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              title="Today's Attendance Rate"
              value="94.8%"
              subtitle="48 Present &bull; 3 Absent Today"
              icon={CalendarCheck}
              trend="+2.1%"
              color="emerald"
            />
            <StatCard
              title="Today's Fee Counter"
              value="₹18,500"
              subtitle="4 Receipts Confirmed"
              icon={CreditCard}
              trend="+12%"
              color="blue"
            />
            <StatCard
              title="Total Active Students"
              value={studentsCount.toString()}
              subtitle="Classes Nursery to 10"
              icon={Users}
              color="indigo"
            />
            <StatCard
              title="Day-Book Net Balance"
              value="₹1,85,400"
              subtitle="Current Cash/Bank in Hand"
              icon={DollarSign}
              trend="+₹12,400"
              color="amber"
            />
          </div>

          {/* 2-Column Grid: Syllabus Speedometer & Academic Alert */}
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
                    <span className="text-slate-800">Class 8 — Mathematics (Prof. Farhan)</span>
                    <span className="text-emerald-600">68% (On Track)</span>
                  </div>
                  <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-500 rounded-full" style={{ width: '68%' }}></div>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between font-bold mb-1">
                    <span className="text-slate-800">Class 9 — Science & Physics (Mrs. Shabana)</span>
                    <span className="text-rose-600">38% (12 Days Behind Schedule)</span>
                  </div>
                  <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-rose-500 rounded-full" style={{ width: '38%' }}></div>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between font-bold mb-1">
                    <span className="text-slate-800">Class 10 — English Language (Mr. Tariq)</span>
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
                    to="/cms"
                    className="p-3 bg-slate-50 hover:bg-blue-50 border border-slate-200 rounded-xl font-bold text-slate-800 transition-colors block text-center"
                  >
                    📢 Broadcast Circular to Parents
                  </Link>
                </div>
              </div>
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-900 flex items-center justify-between">
                <span>Next Term Exam starts in 18 Days</span>
                <Link to="/exams" className="font-bold underline text-blue-700">View Date-Sheet</Link>
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
                <h3 className="font-bold text-slate-900 text-sm">My Class Schedule Today (Class Teacher: 8-A)</h3>
                <p className="text-xs text-slate-500">3 Teaching Periods Assigned &bull; Room 104</p>
              </div>
              <Link
                to="/attendance"
                className="bg-blue-600 hover:bg-blue-500 text-white font-bold px-4 py-2 rounded-xl text-xs shadow flex items-center gap-1.5"
              >
                <CalendarCheck size={14} /> Take Attendance Now
              </Link>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl">
                <span className="text-[10px] font-bold text-blue-700 uppercase">Period 1 (08:30 - 09:15)</span>
                <div className="font-bold text-slate-900 mt-1">Mathematics (8-A)</div>
                <div className="text-slate-500 text-[11px]">Topic: Linear Equations</div>
              </div>
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                <span className="text-[10px] font-bold text-slate-500 uppercase">Period 2 (09:15 - 10:00)</span>
                <div className="font-bold text-slate-500 mt-1">Free Period / Lesson Prep</div>
              </div>
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl">
                <span className="text-[10px] font-bold text-blue-700 uppercase">Period 3 (10:15 - 11:00)</span>
                <div className="font-bold text-slate-900 mt-1">Science Discovery (9-B)</div>
                <div className="text-slate-500 text-[11px]">Topic: Chemical Reactions</div>
              </div>
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl">
                <span className="text-[10px] font-bold text-blue-700 uppercase">Period 5 (12:00 - 12:45)</span>
                <div className="font-bold text-slate-900 mt-1">Math Tutorial (8-B)</div>
                <div className="text-slate-500 text-[11px]">Remedial practice</div>
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
              <div className="text-2xl font-black text-emerald-950 mt-1">₹18,500.00</div>
              <div className="text-xs text-emerald-700 mt-0.5">4 Receipts Confirmed via UPI & Cash</div>
            </div>
            <div className="p-5 bg-white border border-slate-200 rounded-2xl shadow-sm">
              <div className="text-xs font-bold text-slate-500 uppercase">Cash In Hand</div>
              <div className="text-2xl font-black text-slate-900 mt-1">₹6,500.00</div>
            </div>
            <div className="p-5 bg-white border border-slate-200 rounded-2xl shadow-sm">
              <div className="text-xs font-bold text-slate-500 uppercase">Digital UPI Inflow</div>
              <div className="text-2xl font-black text-blue-600 mt-1">₹12,000.00</div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
            <div>
              <h3 className="font-bold text-slate-900 text-sm">Quick Fee Collection Counter</h3>
              <p className="text-xs text-slate-500">Collect tuition, admission, exam installments with penny-perfect FIFO allocation</p>
            </div>
            <Link
              to="/fees"
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-5 py-2.5 rounded-xl text-xs shadow flex items-center gap-2"
            >
              <CreditCard size={14} /> Open Cashier POS
            </Link>
          </div>
        </div>
      )}

      {/* VIEW 4: ADMIN OVERVIEW */}
      {activeRoleView === 'ADMIN' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-5 bg-white border border-slate-200 rounded-2xl shadow-sm">
              <div className="text-xs font-bold text-slate-500 uppercase">Total Enrolled Students</div>
              <div className="text-2xl font-black text-slate-900 mt-1">45 Students</div>
              <Link to="/students" className="text-xs font-bold text-blue-600 hover:underline mt-1 block">View Directory &rarr;</Link>
            </div>
            <div className="p-5 bg-white border border-slate-200 rounded-2xl shadow-sm">
              <div className="text-xs font-bold text-slate-500 uppercase">Teaching & Admin Staff</div>
              <div className="text-2xl font-black text-slate-900 mt-1">12 Members</div>
              <span className="text-xs text-slate-400 mt-1 block">All Roles Active</span>
            </div>
            <div className="p-5 bg-white border border-slate-200 rounded-2xl shadow-sm">
              <div className="text-xs font-bold text-slate-500 uppercase">Online Inquiries Today</div>
              <div className="text-2xl font-black text-blue-600 mt-1">3 New Leads</div>
              <Link to="/cms" className="text-xs font-bold text-blue-600 hover:underline mt-1 block">Review Inquiries &rarr;</Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
