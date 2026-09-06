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
  BookOpen,
  Printer,
  Sparkles,
} from 'lucide-react';
import api from '../../api/client';

// Helper: Format 24h time to AM/PM
const formatTime = (timeStr) => {
  if (!timeStr) return '';
  const parts = timeStr.split(':');
  let h = parseInt(parts[0], 10);
  const m = parts[1] || '00';
  const ampm = h >= 12 ? 'PM' : 'AM';
  h = h % 12 || 12;
  return `${h}:${m} ${ampm}`;
};

// Helper: Check if current local time is within period start and end
const isLiveNow = (startTime, endTime) => {
  if (!startTime || !endTime) return false;
  const now = new Date();
  const currMin = now.getHours() * 60 + now.getMinutes();
  const [sH, sM] = startTime.split(':').map(Number);
  const [eH, eM] = endTime.split(':').map(Number);
  return currMin >= sH * 60 + sM && currMin < eH * 60 + eM;
};

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

  // Homework State
  const [homeworkList, setHomeworkList] = useState([]);
  const [loadingHomework, setLoadingHomework] = useState(false);

  // Timetable & Daily Routine State
  const [timetableData, setTimetableData] = useState(null);
  const [loadingTimetable, setLoadingTimetable] = useState(false);
  const [showWeeklyModal, setShowWeeklyModal] = useState(false);

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

  const selectedChild = children.find((c) => c.student_id === selectedChildId) || children[0];

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

  // 4. Fetch Homework for Selected Child's class & section
  const fetchHomework = async (cId, sId) => {
    if (!cId || !sId) {
      setHomeworkList([]);
      return;
    }
    setLoadingHomework(true);
    try {
      const res = await api.get('/academics/homework', {
        params: { class_id: cId, section_id: sId },
      });
      if (res.data) {
        setHomeworkList(res.data);
      }
    } catch (err) {
      console.error('Error fetching child homework:', err);
    } finally {
      setLoadingHomework(false);
    }
  };

  // 5. Fetch Daily & Weekly Timetable for Selected Child
  const fetchChildTimetable = async (childId) => {
    if (!childId || childId === 'st_01') {
      setTimetableData(null);
      return;
    }
    setLoadingTimetable(true);
    try {
      const res = await api.get(`/parent/children/${childId}/timetable`);
      if (res.data) {
        setTimetableData(res.data);
      }
    } catch (err) {
      console.error('Error fetching child timetable:', err);
    } finally {
      setLoadingTimetable(false);
    }
  };

  useEffect(() => {
    fetchLeaves();
    if (selectedChild?.class_id && selectedChild?.section_id) {
      fetchHomework(selectedChild.class_id, selectedChild.section_id);
    } else {
      setHomeworkList([]);
    }
    if (selectedChildId) {
      fetchChildTimetable(selectedChildId);
    }
  }, [selectedChildId, selectedChild?.class_id, selectedChild?.section_id]);

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
            {overview?.attendance?.attendance_percentage !== undefined ? `${overview.attendance.attendance_percentage}%` : 'N/A'}
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
          <div className="text-xl font-bold text-amber-500">
            {overview?.behavioral_rating || 'N/A'}
          </div>
          <div className="text-[11px] text-slate-500">
            {overview?.behavioral_rating ? 'Recent term evaluation' : 'No rating recorded yet'}
          </div>
        </div>
      </div>

      {/* Daily Class Routine & Timetable Section */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
        <div className="border-b border-slate-100 pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Clock size={16} className="text-blue-600" />
              <span>Today's Class Routine & Timetable</span>
              {timetableData?.today_name && (
                <span className="text-[11px] font-bold bg-blue-50 text-blue-700 px-2 py-0.5 rounded-md">
                  {timetableData.today_name}
                </span>
              )}
            </h3>
            <p className="text-xs text-slate-500">
              Daily period bells and assigned teachers for {selectedChild?.class_name || 'Class'} ({selectedChild?.section_name || 'Section'})
            </p>
          </div>
          <button
            onClick={() => setShowWeeklyModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors self-start sm:self-auto"
          >
            <Calendar size={13} />
            <span>Full Weekly Routine</span>
          </button>
        </div>

        {loadingTimetable ? (
          <div className="p-6 text-center text-xs text-slate-400">Loading today's schedule...</div>
        ) : !timetableData || !timetableData.today_routine || timetableData.today_routine.length === 0 ? (
          <div className="p-6 text-center text-xs text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200">
            No class periods scheduled for today ({timetableData?.today_name || 'Sunday / Holiday'}).
            <div className="mt-1">
              <button
                onClick={() => setShowWeeklyModal(true)}
                className="text-blue-600 font-semibold hover:underline"
              >
                Click here to view full weekly timetable
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {timetableData.today_routine.map((p) => {
              const live = isLiveNow(p.start_time, p.end_time);

              if (p.is_break) {
                return (
                  <div
                    key={p.period_id}
                    className="p-3.5 rounded-xl border border-amber-200 bg-amber-50/70 space-y-1.5 flex flex-col justify-between"
                  >
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="font-bold text-amber-900 uppercase tracking-wider text-[10px]">
                        ☕ {p.period_name}
                      </span>
                      {live && (
                        <span className="animate-pulse bg-amber-500 text-white font-bold text-[9px] px-1.5 py-0.2 rounded-full">
                          LIVE BREAK
                        </span>
                      )}
                    </div>
                    <div className="font-mono text-xs font-semibold text-amber-800">
                      {formatTime(p.start_time)} - {formatTime(p.end_time)}
                    </div>
                    <div className="text-[11px] text-amber-700 font-medium">Recess & Refreshment Time</div>
                  </div>
                );
              }

              return (
                <div
                  key={p.period_id}
                  className={`p-3.5 rounded-xl border transition-all space-y-2 flex flex-col justify-between ${
                    live
                      ? 'border-emerald-400 bg-emerald-50/40 shadow-sm ring-1 ring-emerald-400'
                      : p.subject_name
                      ? 'border-slate-200 bg-white hover:border-slate-300'
                      : 'border-dashed border-slate-200 bg-slate-50/60'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                      {p.period_name}
                    </span>
                    {live ? (
                      <span className="animate-pulse bg-emerald-600 text-white font-bold text-[9px] px-2 py-0.5 rounded-full flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-white"></span>
                        LIVE NOW
                      </span>
                    ) : (
                      <span className="font-mono text-[10px] text-slate-500 font-semibold">
                        {formatTime(p.start_time)} - {formatTime(p.end_time)}
                      </span>
                    )}
                  </div>

                  <div>
                    <h4 className="font-bold text-slate-900 text-xs">
                      {p.subject_name || <span className="text-slate-400 font-normal italic">Free Period</span>}
                    </h4>
                    {p.teacher_name && (
                      <div className="text-[11px] text-slate-600 flex items-center gap-1 mt-0.5 font-medium">
                        <User size={11} className="text-slate-400" />
                        <span>{p.teacher_name}</span>
                      </div>
                    )}
                  </div>

                  {p.room_number && (
                    <div className="pt-1 border-t border-slate-100 text-[10px] text-slate-400">
                      Room: <strong className="text-slate-600">{p.room_number}</strong>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Daily Homework & Tasks Section */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
        <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <FileText size={16} className="text-blue-600" />
              <span>Daily Homework & Classwork</span>
            </h3>
            <p className="text-xs text-slate-500">
              Tasks assigned by teachers for {selectedChild?.class_name || 'class'} - {selectedChild?.section_name || 'section'}
            </p>
          </div>
          <span className="text-xs bg-slate-100 text-slate-600 px-2.5 py-1 rounded-lg font-semibold">
            {homeworkList.length} Active {homeworkList.length === 1 ? 'Task' : 'Tasks'}
          </span>
        </div>

        {loadingHomework ? (
          <div className="p-6 text-center text-xs text-slate-400">Loading homework assignments...</div>
        ) : homeworkList.length === 0 ? (
          <div className="p-6 text-center text-xs text-slate-400">
            No homework assigned for this class and section today.
          </div>
        ) : (
          <div className="divide-y divide-slate-100 text-xs">
            {homeworkList.map((hw) => (
              <div key={hw.id} className="py-3.5 first:pt-0 last:pb-0 flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-700 font-bold text-[10px]">
                      {hw.subject_name}
                    </span>
                    <h4 className="font-bold text-slate-900">{hw.title}</h4>
                  </div>
                  <p className="text-slate-600 whitespace-pre-wrap">{hw.description}</p>
                </div>
                <div className="flex items-center gap-3 text-[11px] self-end md:self-auto shrink-0">
                  <span className="text-slate-400">Assigned by: <strong className="text-slate-600">{hw.assigned_by}</strong></span>
                  <div className="bg-amber-50 text-amber-800 px-2.5 py-1 rounded-lg font-bold border border-amber-200">
                    Due: {hw.due_date ? new Date(hw.due_date).toLocaleDateString() : 'N/A'}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
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

      {/* Modal: Full Weekly Schedule */}
      {showWeeklyModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-3xl w-full p-6 shadow-2xl space-y-4 text-xs max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                  <Calendar size={16} className="text-blue-600" />
                  <span>Weekly Timetable — {selectedChild?.student_name}</span>
                </h3>
                <p className="text-slate-500 text-[11px]">
                  {selectedChild?.class_name} - {selectedChild?.section_name} | Session {timetableData?.academic_year_name || 'Current'}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold flex items-center gap-1"
                >
                  <Printer size={13} /> Print
                </button>
                <button onClick={() => setShowWeeklyModal(false)} className="text-slate-400 hover:text-slate-600">
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Weekly Routine Matrix */}
            <div className="overflow-x-auto border border-slate-200 rounded-xl">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase text-[10px]">
                    <th className="py-2.5 px-3">Period / Time</th>
                    {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].map((d) => (
                      <th key={d} className="py-2.5 px-3">
                        {d}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {(timetableData?.today_routine?.length
                    ? timetableData.today_routine
                    : timetableData?.weekly_routine?.Monday || []
                  ).map((p) => (
                    <tr key={p.period_id} className={p.is_break ? 'bg-amber-50/40' : 'hover:bg-slate-50/60'}>
                      <td className="py-2.5 px-3 font-mono text-[11px] font-bold text-slate-700 whitespace-nowrap bg-slate-50/40">
                        <div>{p.period_name}</div>
                        <div className="text-[10px] text-slate-400 font-normal">
                          {formatTime(p.start_time)}
                        </div>
                      </td>
                      {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].map((d) => {
                        const daySlots = timetableData?.weekly_routine?.[d] || [];
                        const slot = daySlots.find((s) => s.period_id === p.period_id);

                        if (p.is_break) {
                          return (
                            <td key={d} className="py-2 px-2 text-center text-amber-800 font-bold text-[10px]">
                              Recess
                            </td>
                          );
                        }

                        return (
                          <td key={d} className="py-2 px-2 align-top">
                            {slot && slot.subject_name ? (
                              <div className="p-1.5 rounded-lg bg-blue-50 border border-blue-100 text-[10px]">
                                <div className="font-bold text-blue-900 truncate">{slot.subject_name}</div>
                                {slot.teacher_name && (
                                  <div className="text-slate-500 truncate text-[9px] mt-0.5">{slot.teacher_name}</div>
                                )}
                              </div>
                            ) : (
                              <span className="text-slate-300 text-[10px]">-</span>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setShowWeeklyModal(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-bold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
