import React, { useState, useEffect } from 'react';
import { Calendar, Save, CheckCircle2, XCircle, Clock, ClipboardList, Check, X, AlertCircle } from 'lucide-react';
import api from '../../api/client';

export const AttendanceMarker = () => {
  const queryTab = new URLSearchParams(window.location.search).get('tab');
  const [activeTab, setActiveTab] = useState(queryTab === 'leaves' ? 'leaves' : 'roster');
  const [classes, setClasses] = useState([]);
  const [academicYears, setAcademicYears] = useState([]);
  const [academicYearId, setAcademicYearId] = useState('');
  const [statusMap, setStatusMap] = useState({});
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedSection, setSelectedSection] = useState('');
  const [attendanceDate, setAttendanceDate] = useState(new Date().toISOString().split('T')[0]);
  const [roster, setRoster] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  // Leave Requests State
  const [leaves, setLeaves] = useState([]);
  const [loadingLeaves, setLoadingLeaves] = useState(false);
  const [updatingLeaveId, setUpdatingLeaveId] = useState(null);
  const [leaveFilter, setLeaveFilter] = useState('PENDING');

  // Load Classes, Academic Years, and Lookups
  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        const [clsRes, yrRes, valRes] = await Promise.all([
          api.get('/academics/classes'),
          api.get('/academics/years'),
          api.get('/lookups/categories/ATTENDANCE_STATUS/values'),
        ]);

        if (clsRes.data && clsRes.data.length > 0) {
          setClasses(clsRes.data);
          setSelectedClass(clsRes.data[0].id);
          if (clsRes.data[0].sections?.length > 0) {
            setSelectedSection(clsRes.data[0].sections[0].id);
          }
        }

        if (yrRes.data && yrRes.data.length > 0) {
          setAcademicYears(yrRes.data);
          const curr = yrRes.data.find((y) => y.is_current) || yrRes.data[0];
          setAcademicYearId(curr.id);
        }

        if (valRes.data && valRes.data.length > 0) {
          const map = {};
          valRes.data.forEach((v) => {
            map[v.code] = v.id;
          });
          setStatusMap(map);
        }
      } catch (e) {
        console.log('Error fetching initial data:', e);
      }
    };
    fetchInitialData();
  }, []);

  // Fetch Roster
  const loadRoster = async () => {
    if (!selectedClass || !selectedSection || !academicYearId) return;
    setLoading(true);
    setSuccessMsg('');
    try {
      const res = await api.get('/attendance/roster', {
        params: {
          academic_year_id: academicYearId,
          class_id: selectedClass,
          section_id: selectedSection,
          attendance_date: attendanceDate,
        },
      });
      if (res.data && res.data.students) {
        const updated = res.data.students.map((s) => ({
          ...s,
          status_code: s.status_code || 'PRESENT',
        }));
        setRoster(updated);
      }
    } catch (e) {
      console.log('Error fetching roster:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleClassChange = (classId) => {
    setSelectedClass(classId);
    const cls = classes.find((c) => c.id === classId);
    if (cls && cls.sections && cls.sections.length > 0) {
      setSelectedSection(cls.sections[0].id);
    } else {
      setSelectedSection('');
    }
  };

  useEffect(() => {
    loadRoster();
  }, [selectedClass, selectedSection, attendanceDate, academicYearId]);

  const updateStudentStatus = (studentId, status) => {
    setRoster((prev) =>
      prev.map((s) => (s.student_id === studentId ? { ...s, status_code: status } : s))
    );
  };

  const markAll = (status) => {
    setRoster((prev) => prev.map((s) => ({ ...s, status_code: status })));
  };

  const saveAttendance = async () => {
    if (!academicYearId || !selectedClass || !selectedSection) return;
    setSaving(true);
    try {
      const payload = {
        academic_year_id: academicYearId,
        class_id: selectedClass,
        section_id: selectedSection,
        attendance_date: attendanceDate,
        records: roster.map((s) => ({
          student_id: s.student_id,
          attendance_status_id: statusMap[s.status_code] || s.attendance_status_id || Object.values(statusMap)[0],
          remarks: s.remarks || undefined,
        })),
      };
      await api.post('/attendance/submit', payload);
      setSuccessMsg('Attendance marked & saved successfully!');
    } catch (e) {
      alert('Failed to save attendance: ' + e.message);
    } finally {
      setSaving(false);
    }
  };

  const fetchLeaves = async () => {
    setLoadingLeaves(true);
    try {
      const params = {};
      if (leaveFilter !== 'ALL') {
        params.status = leaveFilter;
      }
      const res = await api.get('/academics/leaves', { params });
      if (res.data) {
        setLeaves(res.data);
      }
    } catch (err) {
      console.error('Error fetching leave requests:', err);
    } finally {
      setLoadingLeaves(false);
    }
  };

  useEffect(() => {
    fetchLeaves();
  }, [leaveFilter]);

  const handleApproveLeave = async (leaveId) => {
    setUpdatingLeaveId(leaveId);
    try {
      await api.patch(`/academics/leaves/${leaveId}/status`, {
        status: 'APPROVED',
        approval_remarks: 'Approved by Class Teacher',
      });
      alert('Leave request approved successfully.');
      fetchLeaves();
      loadRoster();
    } catch (err) {
      alert('Failed to approve leave: ' + err.message);
    } finally {
      setUpdatingLeaveId(null);
    }
  };

  const handleRejectLeave = async (leaveId) => {
    const reason = window.prompt('Optional: Enter reason for rejection:', '');
    if (reason === null) return;
    setUpdatingLeaveId(leaveId);
    try {
      await api.patch(`/academics/leaves/${leaveId}/status`, {
        status: 'REJECTED',
        approval_remarks: reason || 'Application rejected by teacher',
      });
      alert('Leave request rejected.');
      fetchLeaves();
      loadRoster();
    } catch (err) {
      alert('Failed to reject leave: ' + err.message);
    } finally {
      setUpdatingLeaveId(null);
    }
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-lg font-bold text-slate-900">Attendance & Leave Management</h1>
          <p className="text-xs text-slate-500">Class roster marking and student leave application review</p>
        </div>

        <div className="flex bg-slate-200 p-1 rounded-xl text-xs font-semibold">
          <button
            onClick={() => setActiveTab('roster')}
            className={`px-3.5 py-1.5 rounded-lg transition-all ${
              activeTab === 'roster' ? 'bg-white text-blue-700 shadow font-bold' : 'text-slate-600'
            }`}
          >
            Attendance Roster
          </button>
          <button
            onClick={() => setActiveTab('leaves')}
            className={`px-3.5 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
              activeTab === 'leaves' ? 'bg-white text-blue-700 shadow font-bold' : 'text-slate-600'
            }`}
          >
            <ClipboardList size={13} />
            Leave Applications
            {leaves.filter((l) => l.status === 'PENDING').length > 0 && (
              <span className="bg-rose-500 text-white rounded-full text-[10px] px-1.5 py-0.2 font-bold">
                {leaves.filter((l) => l.status === 'PENDING').length}
              </span>
            )}
          </button>
        </div>

        {activeTab === 'roster' && roster.length > 0 && (
          <button
            onClick={saveAttendance}
            disabled={saving}
            className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold px-4 py-2.5 rounded-lg shadow transition-colors disabled:opacity-50"
          >
            <Save size={14} />
            <span>{saving ? 'Saving...' : 'Submit Attendance'}</span>
          </button>
        )}
      </div>

      {activeTab === 'roster' ? (
        <>
          {/* Filter Bar */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-wrap items-center gap-4 text-xs font-medium">
            <div>
              <label className="block text-slate-500 mb-1">Date</label>
              <input
                type="date"
                value={attendanceDate}
                onChange={(e) => setAttendanceDate(e.target.value)}
                className="border border-slate-200 rounded-lg px-3 py-1.5 bg-slate-50 font-semibold text-slate-800"
              />
            </div>

            <div>
              <label className="block text-slate-500 mb-1">Class</label>
              <select
                value={selectedClass}
                onChange={(e) => handleClassChange(e.target.value)}
                className="border border-slate-200 rounded-lg px-3 py-1.5 bg-slate-50 font-semibold text-slate-800"
              >
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-slate-500 mb-1">Section</label>
              <select
                value={selectedSection}
                onChange={(e) => setSelectedSection(e.target.value)}
                className="border border-slate-200 rounded-lg px-3 py-1.5 bg-slate-50 font-semibold text-slate-800"
              >
                {(classes.find((c) => c.id === selectedClass)?.sections || []).map((s) => (
                  <option key={s.id} value={s.id}>Section {s.name}</option>
                ))}
              </select>
            </div>

            <div className="flex items-end gap-2 ml-auto">
              <button
                onClick={() => markAll('PRESENT')}
                className="bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 px-3 py-1.5 rounded-lg text-xs font-semibold"
              >
                Mark All Present
              </button>
              <button
                onClick={() => markAll('ABSENT')}
                className="bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100 px-3 py-1.5 rounded-lg text-xs font-semibold"
              >
                Mark All Absent
              </button>
            </div>
          </div>

          {successMsg && (
            <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs px-4 py-3 rounded-xl flex items-center gap-2">
              <CheckCircle2 size={16} />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Roster Grid */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider">
                  <th className="py-3 px-4">Roll</th>
                  <th className="py-3 px-4">Adm No</th>
                  <th className="py-3 px-4">Student Name</th>
                  <th className="py-3 px-4 text-center">Status Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {roster.length > 0 ? (
                  roster.map((st) => (
                    <tr key={st.student_id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-4 font-bold text-slate-700">{st.roll_no || '-'}</td>
                      <td className="py-3 px-4 font-mono text-blue-700">{st.admission_no}</td>
                      <td className="py-3 px-4 font-semibold text-slate-900">{st.full_name}</td>
                      <td className="py-3 px-4">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => updateStudentStatus(st.student_id, 'PRESENT')}
                            className={`px-3 py-1 rounded text-xs font-bold transition-all ${
                              st.status_code === 'PRESENT'
                                ? 'bg-emerald-600 text-white shadow-sm'
                                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                            }`}
                          >
                            P
                          </button>
                          <button
                            onClick={() => updateStudentStatus(st.student_id, 'ABSENT')}
                            className={`px-3 py-1 rounded text-xs font-bold transition-all ${
                              st.status_code === 'ABSENT'
                                ? 'bg-rose-600 text-white shadow-sm'
                                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                            }`}
                          >
                            A
                          </button>
                          <button
                            onClick={() => updateStudentStatus(st.student_id, 'LATE')}
                            className={`px-3 py-1 rounded text-xs font-bold transition-all ${
                              st.status_code === 'LATE'
                                ? 'bg-amber-500 text-white shadow-sm'
                                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                            }`}
                          >
                            L
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={4} className="text-center py-8 text-slate-400">
                      {loading ? 'Loading class roster...' : 'No enrolled students found for this class & section.'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      ) : (
        <div className="space-y-4">
          {/* Leave Filter Bar */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-600">Filter Status:</span>
              <div className="flex gap-1 bg-slate-100 p-1 rounded-lg">
                {['PENDING', 'APPROVED', 'REJECTED', 'ALL'].map((st) => (
                  <button
                    key={st}
                    onClick={() => setLeaveFilter(st)}
                    className={`px-3 py-1 rounded-md font-semibold transition-all ${
                      leaveFilter === st ? 'bg-white text-blue-700 shadow-sm font-bold' : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    {st}
                  </button>
                ))}
              </div>
            </div>
            <button
              onClick={fetchLeaves}
              className="text-blue-600 hover:text-blue-700 font-semibold"
            >
              Refresh Inbox
            </button>
          </div>

          {/* Leaves Table */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider">
                  <th className="py-3 px-4">Student</th>
                  <th className="py-3 px-4">From Date</th>
                  <th className="py-3 px-4">To Date</th>
                  <th className="py-3 px-4">Reason</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {loadingLeaves ? (
                  <tr>
                    <td colSpan={6} className="text-center py-8 text-slate-400">
                      Loading leave applications...
                    </td>
                  </tr>
                ) : leaves.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-8 text-slate-400">
                      No leave applications found under "{leaveFilter}" status.
                    </td>
                  </tr>
                ) : (
                  leaves.map((lv) => (
                    <tr key={lv.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-4 font-bold text-slate-900">{lv.student_name}</td>
                      <td className="py-3 px-4 text-slate-600">{lv.from_date}</td>
                      <td className="py-3 px-4 text-slate-600">{lv.to_date}</td>
                      <td className="py-3 px-4 text-slate-700 max-w-xs">{lv.reason}</td>
                      <td className="py-3 px-4">
                        <span
                          className={`px-2.5 py-0.5 rounded-full font-bold text-[10px] ${
                            lv.status === 'APPROVED'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : lv.status === 'REJECTED'
                              ? 'bg-rose-50 text-rose-700 border border-rose-200'
                              : 'bg-amber-50 text-amber-700 border border-amber-200'
                          }`}
                        >
                          {lv.status}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        {lv.status === 'PENDING' ? (
                          <div className="flex items-center justify-center gap-2">
                            <button
                              disabled={updatingLeaveId === lv.id}
                              onClick={() => handleApproveLeave(lv.id)}
                              className="flex items-center gap-1 bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-1 rounded text-xs font-bold transition-all shadow-sm disabled:opacity-50"
                            >
                              <Check size={12} /> Approve
                            </button>
                            <button
                              disabled={updatingLeaveId === lv.id}
                              onClick={() => handleRejectLeave(lv.id)}
                              className="flex items-center gap-1 bg-rose-600 hover:bg-rose-500 text-white px-3 py-1 rounded text-xs font-bold transition-all shadow-sm disabled:opacity-50"
                            >
                              <X size={12} /> Reject
                            </button>
                          </div>
                        ) : (
                          <div className="text-center text-slate-400 text-[11px] italic">
                            {lv.approval_remarks || 'Decision recorded'}
                          </div>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
