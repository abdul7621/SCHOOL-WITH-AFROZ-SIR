import React, { useState, useEffect } from 'react';
import {
  Calendar,
  Save,
  CheckCircle2,
  XCircle,
  Clock,
  ClipboardList,
  Check,
  X,
  AlertCircle,
  Sparkles,
  Star,
  Award,
  ShieldCheck,
  BookOpen,
  Utensils,
  RefreshCw,
  Zap,
} from 'lucide-react';
import api from '../../api/client';

export const AttendanceMarker = () => {
  const queryTab = new URLSearchParams(window.location.search).get('tab');
  const [activeTab, setActiveTab] = useState(
    queryTab === 'leaves' ? 'leaves' : queryTab === 'habits' ? 'habits' : 'roster'
  );
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

  // 9-Point Habit Grid State
  const [habitRows, setHabitRows] = useState([]);
  const [loadingHabits, setLoadingHabits] = useState(false);
  const [savingHabits, setSavingHabits] = useState(false);
  const [habitSuccessMsg, setHabitSuccessMsg] = useState('');

  const [currentUser] = useState(() => {
    try {
      const saved = localStorage.getItem('user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [isTeacherLocked, setIsTeacherLocked] = useState(false);
  const [assignedInfo, setAssignedInfo] = useState(null);

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

          const isAdminOrPrincipal =
            currentUser?.roles?.some((r) => ['ADMIN', 'SUPERADMIN', 'PRINCIPAL'].includes(r)) ||
            currentUser?.permissions?.includes('attendance:manage');

          let teacherAssignedClass = null;
          let teacherAssignedSection = null;

          if (!isAdminOrPrincipal && currentUser) {
            for (const c of clsRes.data) {
              for (const s of c.sections || []) {
                if (
                  s.class_teacher?.teacher_user_id === currentUser.id ||
                  s.class_teacher?.teacher_user_id === currentUser.user_id
                ) {
                  teacherAssignedClass = c.id;
                  teacherAssignedSection = s.id;
                  setAssignedInfo({ className: c.name, sectionName: s.name });
                  setIsTeacherLocked(true);
                  break;
                }
              }
              if (teacherAssignedClass) break;
            }
          }

          if (teacherAssignedClass) {
            setSelectedClass(teacherAssignedClass);
            setSelectedSection(teacherAssignedSection);
          } else {
            const classWithStudents =
              clsRes.data.find((c) => c.sections?.some((s) => (s.enrolled_count || 0) > 0)) ||
              clsRes.data[0];
            setSelectedClass(classWithStudents.id);
            if (classWithStudents.sections?.length > 0) {
              const secWithStudents =
                classWithStudents.sections.find((s) => (s.enrolled_count || 0) > 0) ||
                classWithStudents.sections[0];
              setSelectedSection(secWithStudents.id);
            }
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

  // Fetch Attendance Roster
  const loadRoster = async (keepMessage = false) => {
    if (!selectedClass || !selectedSection || !academicYearId) return;
    setLoading(true);
    if (!keepMessage) {
      setSuccessMsg('');
    }
    try {
      const res = await api.get('/attendance/roster', {
        params: {
          academic_year_id: academicYearId,
          class_id: selectedClass,
          section_id: selectedSection,
          attendance_date: attendanceDate,
        },
      });
      const dataObj = res?.data || res;
      if (dataObj && dataObj.students) {
        const updated = dataObj.students.map((s) => ({
          ...s,
          status_code: s.status_code || 'PRESENT',
        }));
        setRoster(updated);
      } else {
        setRoster([]);
      }
    } catch (e) {
      console.log('Error fetching roster:', e);
      setRoster([]);
    } finally {
      setLoading(false);
    }
  };

  // Fetch 9-Point Habit Grid
  const loadHabitGrid = async (keepMessage = false) => {
    if (!selectedClass || !selectedSection) return;
    setLoadingHabits(true);
    if (!keepMessage) {
      setHabitSuccessMsg('');
    }
    try {
      const res = await api.get('/development/habits/grid', {
        params: {
          academic_year_id: academicYearId || undefined,
          class_id: selectedClass,
          section_id: selectedSection,
          habit_date: attendanceDate,
        },
      });
      const dataObj = res?.data || res;
      if (dataObj && dataObj.rows) {
        setHabitRows(dataObj.rows);
      } else {
        setHabitRows([]);
      }
    } catch (e) {
      console.log('Error fetching habit grid:', e);
      setHabitRows([]);
    } finally {
      setLoadingHabits(false);
    }
  };

  const handleClassChange = (classId) => {
    setSuccessMsg('');
    setHabitSuccessMsg('');
    setSelectedClass(classId);
    const cls = classes.find((c) => c.id === classId);
    if (cls && cls.sections && cls.sections.length > 0) {
      const secWithStudents =
        cls.sections.find((s) => (s.enrolled_count || 0) > 0) || cls.sections[0];
      setSelectedSection(secWithStudents.id);
    } else {
      setSelectedSection('');
    }
  };

  useEffect(() => {
    if (activeTab === 'roster') {
      loadRoster();
    } else if (activeTab === 'habits') {
      loadHabitGrid();
    }
  }, [activeTab, selectedClass, selectedSection, attendanceDate, academicYearId]);

  const updateStudentStatus = (studentId, status) => {
    setRoster((prev) =>
      prev.map((s) => (s.student_id === studentId ? { ...s, status_code: status } : s))
    );
  };

  const markAll = (status) => {
    setRoster((prev) =>
      prev.map((s) =>
        s.has_approved_leave && s.status_code === 'EXCUSED' ? s : { ...s, status_code: status }
      )
    );
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
          attendance_status_id:
            statusMap[s.status_code] ||
            s.current_status_id ||
            s.attendance_status_id ||
            s.status_code ||
            'PRESENT',
          remarks: s.remarks || undefined,
        })),
      };
      await api.post('/attendance/submit', payload);
      setSuccessMsg("Today's Attendance marked & synchronized with daily habits successfully!");
      await loadRoster(true);
    } catch (e) {
      alert('Failed to save attendance: ' + (e.response?.data?.message || e.message));
    } finally {
      setSaving(false);
    }
  };

  // Habit Grid Handlers
  const toggleHabitDimension = (studentId, dimension) => {
    setHabitRows((prev) =>
      prev.map((r) => {
        if (r.student_id !== studentId) return r;
        const newVal = !r[dimension];
        const updated = { ...r, [dimension]: newVal };

        if (updated.attendance_status === 'ABSENT' || updated.attendance_status === 'EXCUSED') {
          updated.daily_score = 0;
        } else {
          let score = 1;
          if (updated.habit_punctuality) score += 1;
          if (updated.habit_uniform) score += 1;
          if (updated.habit_material) score += 1;
          if (updated.habit_homework) score += 1;
          if (updated.habit_classwork) score += 1;
          if (updated.habit_healthy_lunch) score += 1;
          if (updated.habit_discipline) score += 1;
          if (updated.habit_neatness) score += 1;
          updated.daily_score = score;
        }
        return updated;
      })
    );
  };

  const markAllHabitsPerfect = () => {
    setHabitRows((prev) =>
      prev.map((r) => {
        if (r.attendance_status === 'ABSENT' || r.attendance_status === 'EXCUSED') return r;
        return {
          ...r,
          habit_punctuality: true,
          habit_uniform: true,
          habit_material: true,
          habit_homework: true,
          habit_classwork: true,
          habit_healthy_lunch: true,
          habit_discipline: true,
          habit_neatness: true,
          daily_score: 9,
        };
      })
    );
  };

  const saveHabitGrid = async () => {
    if (!selectedClass || !selectedSection || habitRows.length === 0) return;
    setSavingHabits(true);
    try {
      const payload = {
        academic_year_id: academicYearId || undefined,
        class_id: selectedClass,
        section_id: selectedSection,
        habit_date: attendanceDate,
        habits: habitRows.map((r) => ({
          student_id: r.student_id,
          attendance_status: r.attendance_status,
          habit_punctuality: r.habit_punctuality,
          habit_uniform: r.habit_uniform,
          habit_material: r.habit_material,
          habit_homework: r.habit_homework,
          habit_classwork: r.habit_classwork,
          habit_healthy_lunch: r.habit_healthy_lunch,
          habit_discipline: r.habit_discipline,
          habit_neatness: r.habit_neatness,
          exception_notes: r.exception_notes || undefined,
        })),
      };
      await api.post('/development/habits/submit', payload);
      setHabitSuccessMsg(`9-Point Daily Habits saved successfully for ${habitRows.length} students!`);
      await loadHabitGrid(true);
    } catch (e) {
      alert('Failed to save daily habits: ' + (e.response?.data?.message || e.message));
    } finally {
      setSavingHabits(false);
    }
  };

  // Leave Requests Handling
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
    if (activeTab === 'leaves') {
      fetchLeaves();
    }
  }, [leaveFilter, activeTab]);

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

  // Habit metrics summary
  const totalHabitStudents = habitRows.length;
  const presentHabitStudents = habitRows.filter((r) => r.attendance_status !== 'ABSENT' && r.attendance_status !== 'EXCUSED');
  const perfectScoreCount = presentHabitStudents.filter((r) => r.daily_score === 9).length;
  const averageHabitScore =
    presentHabitStudents.length > 0
      ? (
          presentHabitStudents.reduce((acc, r) => acc + r.daily_score, 0) /
          presentHabitStudents.length
        ).toFixed(1)
      : '9.0';
  const totalExceptionsMarked = presentHabitStudents.reduce(
    (acc, r) => acc + (9 - r.daily_score),
    0
  );

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <span>Attendance & Daily Habit Discipline Engine</span>
            <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 border border-blue-200">
              Module 1: 60-Sec
            </span>
          </h1>
          <p className="text-xs text-slate-500">
            Rapid 1-tap exception scoring, daily punctuality & habit tracking
          </p>
        </div>

        <div className="flex bg-slate-200 p-1 rounded-xl text-xs font-semibold">
          <button
            onClick={() => setActiveTab('roster')}
            className={`px-3.5 py-1.5 rounded-lg transition-all ${
              activeTab === 'roster'
                ? 'bg-white text-blue-700 shadow font-bold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Attendance Roster
          </button>
          <button
            onClick={() => setActiveTab('habits')}
            className={`px-3.5 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
              activeTab === 'habits'
                ? 'bg-white text-amber-700 shadow font-bold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Sparkles size={13} className="text-amber-500" />
            ⭐ 9-Point Habit Grid
          </button>
          <button
            onClick={() => setActiveTab('leaves')}
            className={`px-3.5 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
              activeTab === 'leaves'
                ? 'bg-white text-blue-700 shadow font-bold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <ClipboardList size={13} />
            Leaves
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

        {activeTab === 'habits' && habitRows.length > 0 && (
          <button
            onClick={saveHabitGrid}
            disabled={savingHabits}
            className="flex items-center gap-2 bg-gradient-to-r from-amber-600 to-indigo-600 hover:from-amber-500 hover:to-indigo-500 text-white text-xs font-bold px-5 py-2.5 rounded-xl shadow-md shadow-amber-600/20 transition-all disabled:opacity-50"
          >
            <Zap size={14} className="text-amber-200" />
            <span>{savingHabits ? 'Saving 9-Point Habits...' : 'Submit 9-Point Habits'}</span>
          </button>
        )}
      </div>

      {/* Filter Bar (Shared across Roster & Habits) */}
      {activeTab !== 'leaves' && (
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-wrap items-center gap-4 text-xs font-medium">
          <div>
            <label className="block text-slate-500 mb-1">Academic Session</label>
            <select
              value={academicYearId}
              onChange={(e) => setAcademicYearId(e.target.value)}
              className="border border-slate-200 rounded-lg px-3 py-1.5 bg-slate-50 font-semibold text-slate-800"
            >
              {academicYears.map((y) => (
                <option key={y.id} value={y.id}>
                  {y.name} {y.is_current ? '(Current)' : ''}
                </option>
              ))}
            </select>
          </div>

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
            <label className="block text-slate-500 mb-1 flex items-center gap-1">
              Class
              {isTeacherLocked && (
                <span className="text-[10px] text-amber-600 bg-amber-50 px-1 rounded border border-amber-200">
                  Locked
                </span>
              )}
            </label>
            <select
              value={selectedClass}
              disabled={isTeacherLocked}
              onChange={(e) => handleClassChange(e.target.value)}
              className={`border border-slate-200 rounded-lg px-3 py-1.5 font-semibold text-slate-800 ${
                isTeacherLocked ? 'bg-slate-100 cursor-not-allowed opacity-80' : 'bg-slate-50'
              }`}
            >
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-slate-500 mb-1 flex items-center gap-1">
              Section
              {isTeacherLocked && (
                <span className="text-[10px] text-blue-600 bg-blue-50 px-1 rounded border border-blue-200">
                  Assigned
                </span>
              )}
            </label>
            <select
              value={selectedSection}
              disabled={isTeacherLocked}
              onChange={(e) => setSelectedSection(e.target.value)}
              className={`border border-slate-200 rounded-lg px-3 py-1.5 font-semibold text-slate-800 ${
                isTeacherLocked ? 'bg-slate-100 cursor-not-allowed opacity-80' : 'bg-slate-50'
              }`}
            >
              {(classes.find((c) => c.id === selectedClass)?.sections || []).map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name.toLowerCase().startsWith('section') ? s.name : `Section ${s.name}`}
                </option>
              ))}
            </select>
          </div>

          {isTeacherLocked && assignedInfo && (
            <div className="flex items-center gap-1 text-[11px] font-semibold text-blue-700 bg-blue-50 border border-blue-200 px-2.5 py-1.5 rounded-lg self-end">
              <span>
                🔒 Class Teacher: {assignedInfo.className} ({assignedInfo.sectionName})
              </span>
            </div>
          )}

          {activeTab === 'roster' && (
            <div className="flex flex-wrap items-end gap-2 ml-auto">
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
              <button
                onClick={() => setActiveTab('habits')}
                className="bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black px-3.5 py-1.5 rounded-lg text-xs flex items-center gap-1.5 shadow-sm transition-all"
                title="Open 60-second exception-only habit marking grid"
              >
                <Sparkles size={13} />
                <span>⭐ 9-Point Habits Grid</span>
              </button>
            </div>
          )}

          {activeTab === 'habits' && (
            <div className="flex items-end gap-2 ml-auto">
              <button
                onClick={markAllHabitsPerfect}
                className="bg-amber-50 text-amber-800 border border-amber-300 hover:bg-amber-100 px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm"
              >
                <Sparkles size={13} className="text-amber-600" />
                <span>Reset All to 9/9 Perfect</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* TAB 1: ATTENDANCE ROSTER */}
      {activeTab === 'roster' && (
        <>
          {successMsg && (
            <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs px-4 py-3 rounded-xl flex items-center justify-between gap-2 shadow-sm">
              <div className="flex items-center gap-2">
                <CheckCircle2 size={16} className="text-emerald-600" />
                <span className="font-semibold">{successMsg}</span>
              </div>
              <button
                onClick={() => setActiveTab('habits')}
                className="px-3 py-1 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-lg text-xs font-black flex items-center gap-1 shadow transition-all shrink-0"
              >
                <Sparkles size={12} />
                <span>Score 9-Habits in 60-Sec 👉</span>
              </button>
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
                      <td className="py-3 px-4 font-semibold text-slate-900">
                        <div className="flex items-center gap-2">
                          <span>{st.full_name}</span>
                          {st.has_approved_leave && (
                            <span
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-700 border border-purple-200"
                              title={st.leave_reason || 'Approved Leave'}
                            >
                              🌴 On Leave
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => updateStudentStatus(st.student_id, 'PRESENT')}
                            className={`px-2.5 py-1 rounded text-xs font-bold transition-all ${
                              st.status_code === 'PRESENT'
                                ? 'bg-emerald-600 text-white shadow-sm'
                                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                            }`}
                            title="Present"
                          >
                            P
                          </button>
                          <button
                            type="button"
                            onClick={() => updateStudentStatus(st.student_id, 'ABSENT')}
                            className={`px-2.5 py-1 rounded text-xs font-bold transition-all ${
                              st.status_code === 'ABSENT'
                                ? 'bg-rose-600 text-white shadow-sm'
                                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                            }`}
                            title="Absent"
                          >
                            A
                          </button>
                          <button
                            type="button"
                            onClick={() => updateStudentStatus(st.student_id, 'LATE')}
                            className={`px-2.5 py-1 rounded text-xs font-bold transition-all ${
                              st.status_code === 'LATE'
                                ? 'bg-amber-500 text-white shadow-sm'
                                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                            }`}
                            title="Late"
                          >
                            L
                          </button>
                          <button
                            type="button"
                            onClick={() => updateStudentStatus(st.student_id, 'EXCUSED')}
                            className={`px-2.5 py-1 rounded text-xs font-bold transition-all ${
                              st.status_code === 'EXCUSED'
                                ? 'bg-purple-600 text-white shadow-sm'
                                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                            }`}
                            title="Excused / Approved Leave"
                          >
                            E
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
      )}

      {/* TAB 2: 60-SECOND 9-POINT HABIT & DISCIPLINE GRID */}
      {activeTab === 'habits' && (
        <div className="space-y-4">
          {/* Summary Telemetry Ribbon */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-2xl p-3.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600">
                Total Enrolled
              </span>
              <div className="text-xl font-black text-blue-900 mt-0.5">{totalHabitStudents}</div>
              <span className="text-[11px] text-blue-700">Class Section Roster</span>
            </div>

            <div className="bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-200 rounded-2xl p-3.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600">
                Class Habit Index (Avg)
              </span>
              <div className="text-xl font-black text-emerald-900 mt-0.5">
                {averageHabitScore} <span className="text-xs text-emerald-700 font-semibold">/ 9.0</span>
              </div>
              <span className="text-[11px] text-emerald-700">Homeroom Discipline Rate</span>
            </div>

            <div className="bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200 rounded-2xl p-3.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-amber-600">
                ⭐ 9/9 Perfect Score
              </span>
              <div className="text-xl font-black text-amber-900 mt-0.5">{perfectScoreCount}</div>
              <span className="text-[11px] text-amber-700">Students with 100% Green</span>
            </div>

            <div className="bg-gradient-to-br from-rose-50 to-pink-50 border border-rose-200 rounded-2xl p-3.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-rose-600">
                Exceptions Marked
              </span>
              <div className="text-xl font-black text-rose-900 mt-0.5">{totalExceptionsMarked}</div>
              <span className="text-[11px] text-rose-700">1-Tap Red Flags Today</span>
            </div>
          </div>

          {habitSuccessMsg && (
            <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs px-4 py-3 rounded-xl flex items-center gap-2 shadow-sm">
              <CheckCircle2 size={16} className="text-emerald-600" />
              <span className="font-semibold">{habitSuccessMsg}</span>
            </div>
          )}

          {/* Habit Fast Grid Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs min-w-[900px]">
              <thead>
                <tr className="bg-slate-800 text-white font-semibold text-[11px] tracking-wide">
                  <th className="py-3 px-3 w-12 text-center">Roll</th>
                  <th className="py-3 px-3 w-24">Adm No</th>
                  <th className="py-3 px-3 min-w-[180px]">Student Name</th>
                  <th className="py-3 px-2 text-center" title="Punctuality & Arrival">⏰ Punctual</th>
                  <th className="py-3 px-2 text-center" title="Clean Uniform, Shoes & ID Card">👔 Uniform</th>
                  <th className="py-3 px-2 text-center" title="Books, Notebooks & Pencil Kit">📚 Material</th>
                  <th className="py-3 px-2 text-center" title="Daily Homework Done & Submitted">✍️ Homework</th>
                  <th className="py-3 px-2 text-center" title="Classwork & Attentiveness">📖 Classwork</th>
                  <th className="py-3 px-2 text-center" title="Healthy Tiffin / Wholesome Lunch">🍱 Lunch</th>
                  <th className="py-3 px-2 text-center" title="Conduct, Respect & Behavior">⭐ Discipline</th>
                  <th className="py-3 px-2 text-center" title="Neatness, Cleanliness & Desk Hygiene">✨ Neatness</th>
                  <th className="py-3 px-3 text-center w-20">Score</th>
                  <th className="py-3 px-3 min-w-[140px]">Quick Note</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {loadingHabits ? (
                  <tr>
                    <td colSpan={13} className="text-center py-12 text-slate-400">
                      Loading 60-second habit scoring matrix...
                    </td>
                  </tr>
                ) : habitRows.length === 0 ? (
                  <tr>
                    <td colSpan={13} className="text-center py-12 text-slate-400">
                      No enrolled students found in this class & section.
                    </td>
                  </tr>
                ) : (
                  habitRows.map((row) => {
                    const isAbsent = row.attendance_status === 'ABSENT';
                    const isExcused = row.attendance_status === 'EXCUSED';
                    const isInactive = isAbsent || isExcused;

                    return (
                      <tr
                        key={row.student_id}
                        className={`transition-colors ${
                          isAbsent
                            ? 'bg-rose-50/40 text-slate-400'
                            : isExcused
                            ? 'bg-purple-50/30 text-slate-400'
                            : row.daily_score === 9
                            ? 'hover:bg-emerald-50/20'
                            : row.daily_score < 6
                            ? 'bg-amber-50/40'
                            : 'hover:bg-slate-50/80'
                        }`}
                      >
                        <td className="py-3 px-3 font-bold text-center text-slate-700">
                          {row.roll_number || '-'}
                        </td>
                        <td className="py-3 px-3 font-mono text-blue-700 text-[11px]">
                          {row.admission_no}
                        </td>
                        <td className="py-3 px-3 font-bold text-slate-900">
                          <div className="flex items-center gap-1.5">
                            <span>{row.student_name}</span>
                            {isAbsent && (
                              <span className="text-[10px] font-black px-1.5 py-0.2 rounded bg-rose-100 text-rose-700 border border-rose-200">
                                ABSENT
                              </span>
                            )}
                            {isExcused && (
                              <span className="text-[10px] font-black px-1.5 py-0.2 rounded bg-purple-100 text-purple-700 border border-purple-200">
                                EXCUSED
                              </span>
                            )}
                          </div>
                        </td>

                        {/* 8 Exception Fast Toggles */}
                        {[
                          { key: 'habit_punctuality', title: 'Punctuality' },
                          { key: 'habit_uniform', title: 'Uniform' },
                          { key: 'habit_material', title: 'Books / Kit' },
                          { key: 'habit_homework', title: 'Homework' },
                          { key: 'habit_classwork', title: 'Classwork' },
                          { key: 'habit_healthy_lunch', title: 'Lunch' },
                          { key: 'habit_discipline', title: 'Discipline' },
                          { key: 'habit_neatness', title: 'Neatness' },
                        ].map((dim) => {
                          const isGreen = row[dim.key];
                          return (
                            <td key={dim.key} className="py-2.5 px-2 text-center">
                              <button
                                type="button"
                                disabled={isInactive}
                                onClick={() => toggleHabitDimension(row.student_id, dim.key)}
                                className={`w-8 h-8 rounded-lg text-xs font-black transition-all flex items-center justify-center mx-auto border ${
                                  isInactive
                                    ? 'bg-slate-100 text-slate-300 border-slate-200 cursor-not-allowed'
                                    : isGreen
                                    ? 'bg-emerald-500 hover:bg-emerald-600 text-white border-emerald-600 shadow-sm'
                                    : 'bg-rose-500 hover:bg-rose-600 text-white border-rose-600 shadow-md animate-pulse'
                                }`}
                                title={
                                  isInactive
                                    ? 'Student is not present'
                                    : isGreen
                                    ? `${dim.title}: Good (Click to flag exception)`
                                    : `${dim.title}: Exception Flagged (Click to mark good)`
                                }
                              >
                                {isGreen ? '✓' : '✕'}
                              </button>
                            </td>
                          );
                        })}

                        {/* Daily Score Pill */}
                        <td className="py-3 px-3 text-center">
                          {isInactive ? (
                            <span className="inline-block px-2 py-1 rounded-lg text-[11px] font-bold bg-slate-200 text-slate-500">
                              0/9
                            </span>
                          ) : (
                            <span
                              className={`inline-block px-2.5 py-1 rounded-xl text-xs font-black shadow-sm ${
                                row.daily_score === 9
                                  ? 'bg-emerald-600 text-white'
                                  : row.daily_score >= 7
                                  ? 'bg-blue-600 text-white'
                                  : row.daily_score >= 5
                                  ? 'bg-amber-500 text-white'
                                  : 'bg-rose-600 text-white'
                              }`}
                            >
                              {row.daily_score}/9
                            </span>
                          )}
                        </td>

                        {/* Quick Note Input */}
                        <td className="py-2 px-3">
                          <input
                            type="text"
                            disabled={isInactive}
                            placeholder={isInactive ? 'Absent' : 'e.g. No tie / Late 10m'}
                            value={row.exception_notes || ''}
                            onChange={(e) => {
                              const val = e.target.value;
                              setHabitRows((prev) =>
                                prev.map((r) =>
                                  r.student_id === row.student_id
                                    ? { ...r, exception_notes: val }
                                    : r
                                )
                              );
                            }}
                            className="w-full text-[11px] bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                          />
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: LEAVE APPLICATIONS */}
      {activeTab === 'leaves' && (
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
                      leaveFilter === st
                        ? 'bg-white text-blue-700 shadow-sm font-bold'
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    {st}
                  </button>
                ))}
              </div>
            </div>
            <button onClick={fetchLeaves} className="text-blue-600 hover:text-blue-700 font-semibold">
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
