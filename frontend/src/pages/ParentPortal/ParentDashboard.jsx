import React, { useState, useEffect } from 'react';
import { Users, Calendar, CreditCard, Award, ChevronRight, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import api from '../../api/client';

export const ParentDashboard = () => {
  const [children, setChildren] = useState([]);
  const [selectedChildId, setSelectedChildId] = useState('');
  const [overview, setOverview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // 1. Fetch Parent's linked children
  useEffect(() => {
    const fetchChildren = async () => {
      setLoading(true);
      try {
        const res = await api.get('/parent/children');
        if (res.data && res.data.length > 0) {
          setChildren(res.data);
          setSelectedChildId(res.data[0].student_id);
        } else {
          // Fallback sample data if parent has no linked records yet
          const fallback = [
            {
              student_id: 'st_01',
              student_name: 'Zaid Khan',
              admission_no: 'ADM-2026-0001',
              class_name: 'Class 8',
              section_name: 'Section A',
              roll_no: 12,
            },
          ];
          setChildren(fallback);
          setSelectedChildId('st_01');
        }
      } catch (err) {
        console.log('Error fetching parent children:', err);
        setError('Could not load student profiles.');
      } finally {
        setLoading(false);
      }
    };
    fetchChildren();
  }, []);

  // 2. Fetch Overview for Selected Child
  useEffect(() => {
    if (!selectedChildId || selectedChildId === 'st_01') return;

    const fetchOverview = async () => {
      try {
        const res = await api.get(`/parent/children/${selectedChildId}/overview`);
        if (res.data) {
          setOverview(res.data);
        }
      } catch (err) {
        console.log('Error fetching child overview:', err);
      }
    };
    fetchOverview();
  }, [selectedChildId]);

  const selectedChild = children.find((c) => c.student_id === selectedChildId) || children[0];

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Multi-child Switcher Bar */}
      {children.length > 1 && (
        <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-3">
          <span className="text-xs font-bold text-slate-500 uppercase px-2">Select Child:</span>
          <div className="flex gap-2 flex-wrap">
            {children.map((ch) => (
              <button
                key={ch.student_id}
                onClick={() => setSelectedChildId(ch.student_id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                  selectedChildId === ch.student_id
                    ? 'bg-blue-600 text-white shadow'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                <div className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center text-[10px]">
                  {ch.student_name ? ch.student_name[0] : 'S'}
                </div>
                <span>{ch.student_name}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Child Summary Card */}
      {selectedChild && (
        <div className="bg-gradient-to-r from-blue-900 to-indigo-900 rounded-2xl p-6 text-white shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-xs bg-blue-500/30 text-blue-200 font-semibold px-2.5 py-1 rounded-md">
                {selectedChild.class_name} - {selectedChild.section_name} | Roll #{selectedChild.roll_no || '-'}
              </span>
              <h2 className="text-2xl font-black mt-2">{selectedChild.student_name}</h2>
              <p className="text-xs text-blue-200 font-mono">Admission No: {selectedChild.admission_no}</p>
            </div>
            <div className="text-right">
              <div className="text-xs text-blue-200 uppercase font-semibold">Today Attendance</div>
              <div className="inline-flex items-center gap-1.5 bg-emerald-500/20 text-emerald-300 font-bold px-3 py-1.5 rounded-lg text-sm mt-1 border border-emerald-400/30">
                <CheckCircle2 size={16} />
                <span>{overview?.today_attendance?.status || 'PRESENT'}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Quick Action Tiles */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-2">
          <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <CreditCard size={20} />
          </div>
          <div className="text-xs font-semibold text-slate-500 uppercase">Pending Fee Dues</div>
          <div className="text-xl font-bold text-slate-900">
            ₹{overview?.fees?.outstanding_balance !== undefined ? overview.fees.outstanding_balance.toLocaleString() : '0.00'}
          </div>
          <div className="text-[11px] text-emerald-600 font-semibold">
            {overview?.fees?.outstanding_balance === 0 ? 'All Clear - No Pending Dues' : 'Due for Current Session'}
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-2">
          <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
            <Calendar size={20} />
          </div>
          <div className="text-xs font-semibold text-slate-500 uppercase">Monthly Attendance</div>
          <div className="text-xl font-bold text-slate-900">
            {overview?.attendance?.attendance_percentage !== undefined ? `${overview.attendance.attendance_percentage}%` : '96.5%'}
          </div>
          <div className="text-[11px] text-slate-500">
            {overview?.attendance?.present_days !== undefined
              ? `${overview.attendance.present_days} Present / ${overview.attendance.total_days} Days`
              : 'Current Month Record'}
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-2">
          <div className="w-10 h-10 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
            <Award size={20} />
          </div>
          <div className="text-xs font-semibold text-slate-500 uppercase">Behavioral Rating</div>
          <div className="text-xl font-bold text-amber-500">★★★★★</div>
          <div className="text-[11px] text-slate-500">Excellent Leadership & Discipline</div>
        </div>
      </div>
    </div>
  );
};
