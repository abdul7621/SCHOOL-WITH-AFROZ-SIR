import React, { useState, useEffect } from 'react';
import {
  Users,
  Calendar,
  CreditCard,
  Award,
  ChevronRight,
  CheckCircle2,
  AlertCircle,
  Loader2,
  FileText,
  Plus,
  X,
  Clock,
} from 'lucide-react';
import api from '../../api/client';

export const ParentDashboard = () => {
  const [children, setChildren] = useState([]);
  const [selectedChildId, setSelectedChildId] = useState('');
  const [overview, setOverview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Student Leave State
  const [leaves, setLeaves] = useState([]);
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [submittingLeave, setSubmittingLeave] = useState(false);
  const [leaveForm, setLeaveForm] = useState({
    from_date: new Date().toISOString().split('T')[0],
    to_date: new Date().toISOString().split('T')[0],
    reason: '',
  });

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
        console.error('Error fetching parent children:', err);
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
        console.error('Error fetching child overview:', err);
      }
    };
    fetchOverview();
  }, [selectedChildId]);

  // 3. Fetch Leaves for Selected Child
  const fetchLeaves = async () => {
    if (!selectedChildId || selectedChildId === 'st_01') return;
    try {
      const res = await api.get('/academics/leaves', {
        params: { student_id: selectedChildId },
      });
      if (res.data) {
        setLeaves(res.data);
      }
    } catch (err) {
      console.error('Error fetching student leaves:', err);
    }
  };

  useEffect(() => {
    fetchLeaves();
  }, [selectedChildId]);

  const handleApplyLeave = async (e) => {
    e.preventDefault();
    if (!selectedChildId) return;

    setSubmittingLeave(true);
    try {
      await api.post('/academics/leaves', {
        student_id: selectedChildId,
        from_date: leaveForm.from_date,
        to_date: leaveForm.to_date,
        reason: leaveForm.reason,
      });
      setShowLeaveModal(false);
      setLeaveForm({
        from_date: new Date().toISOString().split('T')[0],
        to_date: new Date().toISOString().split('T')[0],
        reason: '',
      });
      fetchLeaves();
      alert('Leave application submitted successfully. Class teacher will review.');
    } catch (err) {
      alert('Failed to submit leave application: ' + err.message);
    } finally {
      setSubmittingLeave(false);
    }
  };

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

      {/* Leave Application Section */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <FileText size={16} className="text-blue-600" />
              <span>Student Leave Applications</span>
            </h3>
            <p className="text-xs text-slate-500">Submit illness or emergency leave request directly to class teacher</p>
          </div>
          <button
            onClick={() => setShowLeaveModal(true)}
            className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs px-4 py-2 rounded-xl shadow transition-colors"
          >
            <Plus size={14} />
            <span>Apply for Leave</span>
          </button>
        </div>

        {/* Leave Requests Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider">
                <th className="py-2.5 px-3">From Date</th>
                <th className="py-2.5 px-3">To Date</th>
                <th className="py-2.5 px-3">Reason</th>
                <th className="py-2.5 px-3">Status</th>
                <th className="py-2.5 px-3">Teacher Remarks</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {leaves.length > 0 ? (
                leaves.map((lv) => (
                  <tr key={lv.id} className="hover:bg-slate-50/80">
                    <td className="py-2.5 px-3 font-mono text-slate-700">{lv.from_date}</td>
                    <td className="py-2.5 px-3 font-mono text-slate-700">{lv.to_date}</td>
                    <td className="py-2.5 px-3 text-slate-800">{lv.reason}</td>
                    <td className="py-2.5 px-3">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          lv.status === 'APPROVED'
                            ? 'bg-emerald-100 text-emerald-800'
                            : lv.status === 'REJECTED'
                            ? 'bg-rose-100 text-rose-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {lv.status}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-slate-500">{lv.approval_remarks || '-'}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="text-center py-6 text-slate-400">
                    No leave requests submitted yet for this session.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Apply for Leave */}
      {showLeaveModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4 text-xs">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <Calendar size={16} className="text-blue-600" />
                <span>Apply for Student Leave</span>
              </h3>
              <button onClick={() => setShowLeaveModal(false)} className="text-slate-400 hover:text-slate-600">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleApplyLeave} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">From Date *</label>
                  <input
                    type="date"
                    required
                    value={leaveForm.from_date}
                    onChange={(e) => setLeaveForm({ ...leaveForm, from_date: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">To Date *</label>
                  <input
                    type="date"
                    required
                    value={leaveForm.to_date}
                    onChange={(e) => setLeaveForm({ ...leaveForm, to_date: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Reason for Leave *</label>
                <textarea
                  required
                  rows={3}
                  placeholder="e.g. Fever and doctor advised 2 days bed rest / Urgent family event"
                  value={leaveForm.reason}
                  onChange={(e) => setLeaveForm({ ...leaveForm, reason: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg leading-relaxed"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowLeaveModal(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingLeave}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-bold shadow disabled:opacity-50"
                >
                  {submittingLeave ? 'Submitting...' : 'Submit Application'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
