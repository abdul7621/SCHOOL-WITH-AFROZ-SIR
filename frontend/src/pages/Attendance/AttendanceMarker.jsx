import React, { useState, useEffect } from 'react';
import { Calendar, Save, CheckCircle2, XCircle, Clock } from 'lucide-react';
import api from '../../api/client';

export const AttendanceMarker = () => {
  const [classes, setClasses] = useState([]);
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedSection, setSelectedSection] = useState('');
  const [attendanceDate, setAttendanceDate] = useState(new Date().toISOString().split('T')[0]);
  const [roster, setRoster] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  // Load Classes
  useEffect(() => {
    const fetchClasses = async () => {
      try {
        const res = await api.get('/academics/classes');
        if (res.data && res.data.length > 0) {
          setClasses(res.data);
          setSelectedClass(res.data[0].id);
          if (res.data[0].sections?.length > 0) {
            setSelectedSection(res.data[0].sections[0].id);
          }
        }
      } catch (e) {
        console.log('Error fetching classes:', e);
      }
    };
    fetchClasses();
  }, []);

  // Fetch Roster
  const loadRoster = async () => {
    if (!selectedClass || !selectedSection) return;
    setLoading(true);
    setSuccessMsg('');
    try {
      const res = await api.get('/attendance/roster', {
        params: {
          academic_year_id: 'default_year',
          class_id: selectedClass,
          section_id: selectedSection,
          attendance_date: attendanceDate,
        },
      });
      if (res.data && res.data.students) {
        // Default to PRESENT if unrecorded
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

  useEffect(() => {
    loadRoster();
  }, [selectedClass, selectedSection, attendanceDate]);

  const updateStudentStatus = (studentId, status) => {
    setRoster((prev) =>
      prev.map((s) => (s.student_id === studentId ? { ...s, status_code: status } : s))
    );
  };

  const markAll = (status) => {
    setRoster((prev) => prev.map((s) => ({ ...s, status_code: status })));
  };

  const saveAttendance = async () => {
    setSaving(true);
    try {
      const payload = {
        academic_year_id: 'default_year',
        class_id: selectedClass,
        section_id: selectedSection,
        attendance_date: attendanceDate,
        records: roster.map((s) => ({
          student_id: s.student_id,
          attendance_status_code: s.status_code,
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

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-lg font-bold text-slate-900">Daily Attendance Marker</h1>
          <p className="text-xs text-slate-500">Fast grid submission for class teachers</p>
        </div>

        {roster.length > 0 && (
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
            onChange={(e) => setSelectedClass(e.target.value)}
            className="border border-slate-200 rounded-lg px-3 py-1.5 bg-slate-50 font-semibold text-slate-800"
          >
            {classes.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
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
    </div>
  );
};
