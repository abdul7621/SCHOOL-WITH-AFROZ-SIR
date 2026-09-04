import React, { useState, useEffect } from 'react';
import { BookOpen, Save, CheckCircle2, Award, Printer, Plus, X, Calendar } from 'lucide-react';
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

  // Modals
  const [showTermModal, setShowTermModal] = useState(false);
  const [showScheduleModal, setShowScheduleModal] = useState(false);

  // Lookups for Modals
  const [academicYears, setAcademicYears] = useState([]);
  const [classes, setClasses] = useState([]);
  const [subjects, setSubjects] = useState([]);

  // Form states
  const [termName, setTermName] = useState('Term 1 / Mid-Term Examination');
  const [termYearId, setTermYearId] = useState('');
  const [termStart, setTermStart] = useState(new Date().toISOString().split('T')[0]);
  const [termEnd, setTermEnd] = useState(new Date(Date.now() + 15 * 86400000).toISOString().split('T')[0]);
  const [termWeight, setTermWeight] = useState(50);

  const [schedClassId, setSchedClassId] = useState('');
  const [schedSubId, setSchedSubId] = useState('');
  const [schedDate, setSchedDate] = useState(new Date().toISOString().split('T')[0]);
  const [schedMaxMarks, setSchedMaxMarks] = useState(100);
  const [schedPassMarks, setSchedPassMarks] = useState(33);

  // Fetch Lookups
  useEffect(() => {
    const fetchLookups = async () => {
      try {
        const [yrRes, clsRes, subRes] = await Promise.all([
          api.get('/academics/years'),
          api.get('/academics/classes'),
          api.get('/academics/subjects'),
        ]);
        if (yrRes.data && yrRes.data.length > 0) {
          setAcademicYears(yrRes.data);
          const curr = yrRes.data.find((y) => y.is_current) || yrRes.data[0];
          setTermYearId(curr.id);
        }
        if (clsRes.data && clsRes.data.length > 0) {
          setClasses(clsRes.data);
          setSchedClassId(clsRes.data[0].id);
        }
        if (subRes.data && subRes.data.length > 0) {
          setSubjects(subRes.data);
          setSchedSubId(subRes.data[0].id);
        }
      } catch (e) {
        console.log('Error fetching exam lookups:', e);
      }
    };
    fetchLookups();
  }, []);

  // Fetch Terms
  const fetchTerms = async () => {
    try {
      const res = await api.get('/exams/terms');
      if (res.data && res.data.length > 0) {
        setTerms(res.data);
        if (!selectedTerm || !res.data.find((t) => t.id === selectedTerm)) {
          setSelectedTerm(res.data[0].id);
        }
      } else {
        setTerms([]);
        setSelectedTerm('');
      }
    } catch (e) {
      console.log(e);
    }
  };

  useEffect(() => {
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

  const handleCreateTerm = async (e) => {
    e.preventDefault();
    try {
      await api.post('/exams/terms', {
        name: termName,
        academic_year_id: termYearId,
        start_date: termStart,
        end_date: termEnd,
        weightage_percent: parseFloat(termWeight),
        is_published: false,
      });
      setShowTermModal(false);
      setTermName('');
      fetchTerms();
    } catch (err) {
      alert('Failed to create Exam Term: ' + err.message);
    }
  };

  const handleCreateSchedule = async (e) => {
    e.preventDefault();
    if (!selectedTerm || !schedClassId || !schedSubId) {
      alert('Please ensure Term, Class and Subject are selected.');
      return;
    }
    try {
      await api.post('/exams/schedules', {
        exam_term_id: selectedTerm,
        class_id: schedClassId,
        subject_id: schedSubId,
        exam_date: schedDate,
        max_marks: parseFloat(schedMaxMarks),
        pass_marks: parseFloat(schedPassMarks),
      });
      setShowScheduleModal(false);
      fetchSchedules();
    } catch (err) {
      alert('Failed to create Exam Schedule: ' + err.message);
    }
  };

  const tenantSlug = localStorage.getItem('tenant_slug') || 'sample';

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-lg font-bold text-slate-900">Teacher Marks Entry & Examination System</h1>
          <p className="text-xs text-slate-500">Record subject examination scores and generate student report cards</p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowTermModal(true)}
            className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold px-3.5 py-2.5 rounded-xl shadow transition-colors"
          >
            <Plus size={14} />
            <span>Add Exam Term</span>
          </button>

          {terms.length > 0 && (
            <button
              onClick={() => setShowScheduleModal(true)}
              className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold px-3.5 py-2.5 rounded-xl shadow transition-colors"
            >
              <Plus size={14} />
              <span>Schedule Subject Exam</span>
            </button>
          )}

          {marksData.length > 0 && (
            <button
              onClick={saveMarks}
              disabled={saving}
              className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold px-4 py-2.5 rounded-xl shadow transition-colors disabled:opacity-50"
            >
              <Save size={14} />
              <span>{saving ? 'Saving...' : 'Save All Marks'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Selector or Empty Terms State */}
      {terms.length > 0 ? (
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-wrap gap-4 text-xs font-medium">
          <div>
            <label className="block text-slate-500 mb-1 font-semibold">Exam Term</label>
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
            <label className="block text-slate-500 mb-1 font-semibold">Exam Subject & Class</label>
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
      ) : (
        <div className="bg-blue-50 border border-blue-200 rounded-2xl p-6 text-center space-y-3">
          <BookOpen size={32} className="mx-auto text-blue-600" />
          <h3 className="font-bold text-slate-900 text-sm">No Examination Terms Created Yet</h3>
          <p className="text-xs text-slate-600 max-w-md mx-auto">
            Set up your academic terms (e.g. Unit Test 1, Mid-Term, Annual Exams) to schedule subjects and record student marks.
          </p>
          <button
            onClick={() => setShowTermModal(true)}
            className="inline-flex items-center gap-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold px-4 py-2 rounded-xl shadow"
          >
            <Plus size={14} />
            <span>Create First Exam Term</span>
          </button>
        </div>
      )}

      {successMsg && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs px-4 py-3 rounded-xl flex items-center gap-2">
          <CheckCircle2 size={16} />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Grid */}
      {terms.length > 0 && (
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
                        href={`/api/v1/documents/report-card/${selectedTerm}/${st.student_id}/html?tenant_slug=${tenantSlug}`}
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
                  <td colSpan={6} className="text-center py-10 text-slate-400">
                    {schedules.length === 0 ? (
                      <div className="space-y-2">
                        <div>No subject scheduled under this exam term.</div>
                        <button
                          onClick={() => setShowScheduleModal(true)}
                          className="px-3.5 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-bold"
                        >
                          + Schedule Subject Exam Now
                        </button>
                      </div>
                    ) : (
                      'No enrolled students found for this scheduled class.'
                    )}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal 1: Create Exam Term */}
      {showTermModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <BookOpen size={16} className="text-blue-600" />
                <span>Create Examination Term</span>
              </h3>
              <button onClick={() => setShowTermModal(false)} className="text-slate-400 hover:text-slate-600">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateTerm} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">Term Name</label>
                <input
                  type="text"
                  required
                  value={termName}
                  onChange={(e) => setTermName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                  placeholder="e.g. Mid-Term Examination 2026"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Academic Session</label>
                <select
                  value={termYearId}
                  onChange={(e) => setTermYearId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold"
                >
                  {academicYears.map((y) => (
                    <option key={y.id} value={y.id}>{y.name} {y.is_current ? '(Current)' : ''}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Start Date</label>
                  <input
                    type="date"
                    required
                    value={termStart}
                    onChange={(e) => setTermStart(e.target.value)}
                    className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">End Date</label>
                  <input
                    type="date"
                    required
                    value={termEnd}
                    onChange={(e) => setTermEnd(e.target.value)}
                    className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Weightage (%) in Final Grade</label>
                <input
                  type="number"
                  min={1}
                  max={100}
                  value={termWeight}
                  onChange={(e) => setTermWeight(e.target.value)}
                  className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowTermModal(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-semibold shadow"
                >
                  Create Term
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 2: Schedule Exam */}
      {showScheduleModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <Calendar size={16} className="text-blue-600" />
                <span>Schedule Subject Examination</span>
              </h3>
              <button onClick={() => setShowScheduleModal(false)} className="text-slate-400 hover:text-slate-600">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateSchedule} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">Exam Term</label>
                <select
                  value={selectedTerm}
                  onChange={(e) => setSelectedTerm(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold"
                >
                  {terms.map((t) => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Class</label>
                <select
                  value={schedClassId}
                  onChange={(e) => setSchedClassId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold"
                >
                  {classes.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Subject</label>
                <select
                  value={schedSubId}
                  onChange={(e) => setSchedSubId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold"
                >
                  {subjects.map((s) => (
                    <option key={s.id} value={s.id}>{s.name} ({s.code})</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Date</label>
                  <input
                    type="date"
                    required
                    value={schedDate}
                    onChange={(e) => setSchedDate(e.target.value)}
                    className="w-full px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Max Marks</label>
                  <input
                    type="number"
                    required
                    value={schedMaxMarks}
                    onChange={(e) => setSchedMaxMarks(e.target.value)}
                    className="w-full px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Pass Marks</label>
                  <input
                    type="number"
                    required
                    value={schedPassMarks}
                    onChange={(e) => setSchedPassMarks(e.target.value)}
                    className="w-full px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowScheduleModal(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-semibold shadow"
                >
                  Schedule Exam
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
