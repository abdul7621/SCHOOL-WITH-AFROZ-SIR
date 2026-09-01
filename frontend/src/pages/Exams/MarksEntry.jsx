import React, { useState, useEffect } from 'react';
import { BookOpen, Save, CheckCircle2, Award, Printer } from 'lucide-react';
import api from '../../api/client';

export const MarksEntry = () => {
  const [terms, setTerms] = useState([]);
  const [selectedTerm, setSelectedTerm] = useState('');
  const [schedules, setSchedules] = useState([]);
  const [selectedSchedule, setSelectedSchedule] = useState('');
  const [roster, setRoster] = useState(null);
  const [marksData, setMarksData] = useState([]);
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  // Fetch Terms
  useEffect(() => {
    const fetchTerms = async () => {
      try {
        const res = await api.get('/exams/terms');
        if (res.data && res.data.length > 0) {
          setTerms(res.data);
          setSelectedTerm(res.data[0].id);
        }
      } catch (e) {
        console.log(e);
      }
    };
    fetchTerms();
  }, []);

  // Fetch Schedules
  useEffect(() => {
    if (!selectedTerm) return;
    const fetchSchedules = async () => {
      try {
        const res = await api.get('/exams/schedules', { params: { exam_term_id: selectedTerm } });
        if (res.data && res.data.length > 0) {
          setSchedules(res.data);
          setSelectedSchedule(res.data[0].id);
        } else {
          setSchedules([]);
          setSelectedSchedule('');
          setRoster(null);
        }
      } catch (e) {
        console.log(e);
      }
    };
    fetchSchedules();
  }, [selectedTerm]);

  // Fetch Roster
  useEffect(() => {
    if (!selectedSchedule) return;
    const fetchRoster = async () => {
      try {
        const res = await api.get(`/exams/schedules/${selectedSchedule}/roster`);
        if (res.data) {
          setRoster(res.data);
          setMarksData(res.data.students || []);
        }
      } catch (e) {
        console.log(e);
      }
    };
    fetchRoster();
  }, [selectedSchedule]);

  const updateMark = (studentId, value) => {
    setMarksData((prev) =>
      prev.map((s) =>
        s.student_id === studentId ? { ...s, marks_obtained: value ? parseFloat(value) : null } : s
      )
    );
  };

  const saveMarks = async () => {
    setSaving(true);
    setSuccessMsg('');
    try {
      const payload = {
        exam_schedule_id: selectedSchedule,
        marks: marksData.map((s) => ({
          student_id: s.student_id,
          marks_obtained: s.marks_obtained,
          is_absent: s.is_absent || false,
          remarks: s.remarks || undefined,
        })),
      };
      await api.post(`/exams/schedules/${selectedSchedule}/marks`, payload);
      setSuccessMsg('Examination marks recorded successfully!');
    } catch (e) {
      alert('Failed to save marks: ' + e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-lg font-bold text-slate-900">Teacher Marks Entry Grid</h1>
          <p className="text-xs text-slate-500">Record subject examination scores and calculate grades</p>
        </div>

        {marksData.length > 0 && (
          <button
            onClick={saveMarks}
            disabled={saving}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold px-4 py-2.5 rounded-lg shadow transition-colors disabled:opacity-50"
          >
            <Save size={14} />
            <span>{saving ? 'Saving...' : 'Save All Marks'}</span>
          </button>
        )}
      </div>

      {/* Selector */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-wrap gap-4 text-xs font-medium">
        <div>
          <label className="block text-slate-500 mb-1">Exam Term</label>
          <select
            value={selectedTerm}
            onChange={(e) => setSelectedTerm(e.target.value)}
            className="border border-slate-200 rounded-lg px-3 py-1.5 bg-slate-50 font-semibold text-slate-800"
          >
            {terms.map((t) => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-slate-500 mb-1">Exam Subject & Class</label>
          <select
            value={selectedSchedule}
            onChange={(e) => setSelectedSchedule(e.target.value)}
            className="border border-slate-200 rounded-lg px-3 py-1.5 bg-slate-50 font-semibold text-slate-800"
          >
            {schedules.map((s) => (
              <option key={s.id} value={s.id}>
                {s.class_name} — {s.subject_name} (Max: {s.max_marks})
              </option>
            ))}
          </select>
        </div>
      </div>

      {successMsg && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs px-4 py-3 rounded-xl flex items-center gap-2">
          <CheckCircle2 size={16} />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Grid */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider">
              <th className="py-3 px-4">Roll</th>
              <th className="py-3 px-4">Adm No</th>
              <th className="py-3 px-4">Student Name</th>
              <th className="py-3 px-4">Marks Obtained (Max: {roster?.max_marks || 100})</th>
              <th className="py-3 px-4">Grade Preview</th>
              <th className="py-3 px-4 text-right">Report Card</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 font-medium">
            {marksData.length > 0 ? (
              marksData.map((st) => (
                <tr key={st.student_id} className="hover:bg-slate-50/80">
                  <td className="py-3 px-4 font-bold text-slate-700">{st.roll_no || '-'}</td>
                  <td className="py-3 px-4 font-mono text-blue-700">{st.admission_no}</td>
                  <td className="py-3 px-4 font-semibold text-slate-900">{st.full_name}</td>
                  <td className="py-3 px-4">
                    <input
                      type="number"
                      max={roster?.max_marks || 100}
                      min={0}
                      value={st.marks_obtained !== null && st.marks_obtained !== undefined ? st.marks_obtained : ''}
                      onChange={(e) => updateMark(st.student_id, e.target.value)}
                      placeholder="Enter marks"
                      className="w-32 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-900 focus:outline-none focus:border-blue-500"
                    />
                  </td>
                  <td className="py-3 px-4">
                    <span className="font-bold text-blue-600 bg-blue-50 px-2.5 py-1 rounded border border-blue-100">
                      {st.grade_letter || '-'}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right">
                    <a
                      href={`/api/v1/documents/report-card/${selectedTerm}/${st.student_id}/html`}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-slate-500 hover:text-blue-600 p-1"
                      title="View Report Card"
                    >
                      <Printer size={14} />
                    </a>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={6} className="text-center py-8 text-slate-400">
                  No exam roster found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
