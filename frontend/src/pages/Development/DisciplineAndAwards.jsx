import React, { useState, useEffect } from 'react';
import {
  Award,
  ShieldAlert,
  Star,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  AlertTriangle,
  FileText,
  Calendar,
  User,
  X,
  Save,
  Clock,
  Sparkles,
  Printer,
} from 'lucide-react';
import api from '../../api/client';

export const DisciplineAndAwards = () => {
  const [activeTab, setActiveTab] = useState('evaluations'); // evaluations, discipline, awards

  // Common Academic Lookups
  const [academicYears, setAcademicYears] = useState([]);
  const [academicYearId, setAcademicYearId] = useState('');
  const [classes, setClasses] = useState([]);
  const [classId, setClassId] = useState('');
  const [sections, setSections] = useState([]);
  const [sectionId, setSectionId] = useState('');
  const [students, setStudents] = useState([]);

  // Tab 1: Behavioral Evaluation Matrix
  const [evaluationPeriod, setEvaluationPeriod] = useState('Term-1');
  const [rosterData, setRosterData] = useState(null);
  const [scores, setScores] = useState({}); // { [studentId]: { [criteriaId]: { rating_value, remarks } } }
  const [savingEvaluations, setSavingEvaluations] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Tab 2: Disciplinary Incidents
  const [incidents, setIncidents] = useState([]);
  const [showIncidentModal, setShowIncidentModal] = useState(false);
  const [submittingIncident, setSubmittingIncident] = useState(false);
  const [incidentForm, setIncidentForm] = useState({
    student_id: '',
    incident_date: new Date().toISOString().split('T')[0],
    category: 'BEHAVIORAL',
    severity_level: 'LOW',
    action_taken: 'VERBAL_WARNING',
    description: '',
    parent_notified: false,
  });

  // Tab 3: Awards & Recognitions
  const [awards, setAwards] = useState([]);
  const [showAwardModal, setShowAwardModal] = useState(false);
  const [submittingAward, setSubmittingAward] = useState(false);
  const [awardForm, setAwardForm] = useState({
    student_id: '',
    academic_year_id: '',
    award_name: '',
    award_category: 'BEHAVIOR',
    award_date: new Date().toISOString().split('T')[0],
    description: '',
    certificate_issued: true,
  });

  // Load Initial Dropdowns
  useEffect(() => {
    const fetchInit = async () => {
      try {
        const [yrRes, clsRes, stdRes] = await Promise.all([
          api.get('/academics/years'),
          api.get('/academics/classes'),
          api.get('/students'),
        ]);

        if (yrRes.data && yrRes.data.length > 0) {
          setAcademicYears(yrRes.data);
          const curr = yrRes.data.find((y) => y.is_current) || yrRes.data[0];
          setAcademicYearId(curr.id);
          setAwardForm((prev) => ({ ...prev, academic_year_id: curr.id }));
        }

        if (clsRes.data && clsRes.data.length > 0) {
          setClasses(clsRes.data);
          setClassId(clsRes.data[0].id);
          if (clsRes.data[0].sections && clsRes.data[0].sections.length > 0) {
            setSections(clsRes.data[0].sections);
            setSectionId(clsRes.data[0].sections[0].id);
          }
        }

        if (stdRes.data) {
          setStudents(stdRes.data);
        }
      } catch (e) {
        console.error('Error fetching academic lookups:', e);
      }
    };
    fetchInit();
  }, []);

  // When class changes, update sections
  const handleClassChange = (newClassId) => {
    setClassId(newClassId);
    const selected = classes.find((c) => c.id === newClassId);
    if (selected && selected.sections && selected.sections.length > 0) {
      setSections(selected.sections);
      setSectionId(selected.sections[0].id);
    } else {
      setSections([]);
      setSectionId('');
    }
  };

  // Load Roster for Tab 1
  const fetchRoster = async () => {
    if (!academicYearId || !classId || !sectionId) return;
    try {
      const res = await api.get('/development/evaluations/roster', {
        params: {
          academic_year_id: academicYearId,
          class_id: classId,
          section_id: sectionId,
          evaluation_period: evaluationPeriod,
        },
      });

      if (res.data) {
        setRosterData(res.data);
        // Initialize scores state from existing evaluations
        const initialScores = {};
        res.data.students.forEach((st) => {
          initialScores[st.student_id] = {};
          res.data.criteria.forEach((crit) => {
            const existing = st.evaluations?.[crit.id];
            initialScores[st.student_id][crit.id] = {
              rating_value: existing?.rating_value || '5',
              remarks: existing?.remarks || '',
            };
          });
        });
        setScores(initialScores);
      }
    } catch (e) {
      console.error('Error loading evaluation roster:', e);
    }
  };

  // Tab 2: Load Incidents
  const fetchIncidents = async () => {
    try {
      const res = await api.get('/development/discipline/incidents');
      if (res.data) setIncidents(res.data);
    } catch (e) {
      console.error('Error loading discipline incidents:', e);
    }
  };

  // Tab 3: Load Awards
  const fetchAwards = async () => {
    try {
      const res = await api.get('/development/awards');
      if (res.data) setAwards(res.data);
    } catch (e) {
      console.error('Error loading student awards:', e);
    }
  };

  useEffect(() => {
    if (activeTab === 'evaluations') {
      fetchRoster();
    } else if (activeTab === 'discipline') {
      fetchIncidents();
    } else if (activeTab === 'awards') {
      fetchAwards();
    }
  }, [activeTab, academicYearId, classId, sectionId, evaluationPeriod]);

  // Handle Score Rating Change
  const handleScoreChange = (studentId, criteriaId, rating) => {
    setScores((prev) => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        [criteriaId]: {
          ...prev[studentId]?.[criteriaId],
          rating_value: rating,
        },
      },
    }));
  };

  // Save Batch Evaluations
  const handleSaveEvaluations = async () => {
    setSavingEvaluations(true);
    setSaveSuccess(false);

    try {
      const flatList = [];
      Object.entries(scores).forEach(([stId, critMap]) => {
        Object.entries(critMap).forEach(([cId, val]) => {
          if (val.rating_value) {
            flatList.push({
              student_id: stId,
              criteria_id: cId,
              rating_value: val.rating_value.toString(),
              remarks: val.remarks || undefined,
            });
          }
        });
      });

      const payload = {
        academic_year_id: academicYearId,
        class_id: classId,
        evaluation_period: evaluationPeriod,
        evaluations: flatList,
      };

      await api.post('/development/evaluations', payload);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      alert('Error saving behavioral evaluations: ' + err.message);
    } finally {
      setSavingEvaluations(false);
    }
  };

  // Submit Incident
  const handleCreateIncident = async (e) => {
    e.preventDefault();
    setSubmittingIncident(true);
    try {
      await api.post('/development/discipline/incidents', incidentForm);
      setShowIncidentModal(false);
      setIncidentForm({
        student_id: '',
        incident_date: new Date().toISOString().split('T')[0],
        category: 'BEHAVIORAL',
        severity_level: 'LOW',
        action_taken: 'VERBAL_WARNING',
        description: '',
        parent_notified: false,
      });
      fetchIncidents();
    } catch (err) {
      alert('Error logging incident: ' + err.message);
    } finally {
      setSubmittingIncident(false);
    }
  };

  // Submit Award
  const handleCreateAward = async (e) => {
    e.preventDefault();
    setSubmittingAward(true);
    try {
      await api.post('/development/awards', {
        ...awardForm,
        academic_year_id: awardForm.academic_year_id || academicYearId,
      });
      setShowAwardModal(false);
      setAwardForm({
        student_id: '',
        academic_year_id: academicYearId,
        award_name: '',
        award_category: 'BEHAVIOR',
        award_date: new Date().toISOString().split('T')[0],
        description: '',
        certificate_issued: true,
      });
      fetchAwards();
    } catch (err) {
      alert('Error conferring award: ' + err.message);
    } finally {
      setSubmittingAward(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <Award size={20} className="text-amber-500" />
            <span>Behavioral Assessment, Discipline & Awards</span>
          </h1>
          <p className="text-xs text-slate-500">
            5-Star qualitative grading, student incident logging, and achievement recognitions
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex bg-slate-200 p-1 rounded-xl text-xs font-bold">
          <button
            onClick={() => setActiveTab('evaluations')}
            className={`px-3 py-1.5 rounded-lg transition-all ${
              activeTab === 'evaluations' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            5-Star Assessment Sheet
          </button>
          <button
            onClick={() => setActiveTab('discipline')}
            className={`px-3 py-1.5 rounded-lg transition-all ${
              activeTab === 'discipline' ? 'bg-white text-rose-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Discipline Log ({incidents.length})
          </button>
          <button
            onClick={() => setActiveTab('awards')}
            className={`px-3 py-1.5 rounded-lg transition-all ${
              activeTab === 'awards' ? 'bg-white text-amber-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Student Honors & Awards ({awards.length})
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: 5-STAR BEHAVIORAL EVALUATION SHEET */}
      {/* ========================================================================= */}
      {activeTab === 'evaluations' && (
        <div className="space-y-4">
          {/* Filter Bar */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Academic Year</label>
                <select
                  value={academicYearId}
                  onChange={(e) => setAcademicYearId(e.target.value)}
                  className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg font-semibold text-slate-800"
                >
                  {academicYears.map((y) => (
                    <option key={y.id} value={y.id}>{y.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Class</label>
                <select
                  value={classId}
                  onChange={(e) => handleClassChange(e.target.value)}
                  className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg font-semibold text-slate-800"
                >
                  {classes.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Section</label>
                <select
                  value={sectionId}
                  onChange={(e) => setSectionId(e.target.value)}
                  className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg font-semibold text-slate-800"
                >
                  {sections.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Period</label>
                <select
                  value={evaluationPeriod}
                  onChange={(e) => setEvaluationPeriod(e.target.value)}
                  className="px-3 py-1.5 bg-blue-50 border border-blue-200 text-blue-900 font-bold rounded-lg"
                >
                  <option value="Term-1">Term 1 Evaluation</option>
                  <option value="Term-2">Term 2 Evaluation</option>
                  <option value="Annual">Annual / Final Assessment</option>
                </select>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {saveSuccess && (
                <div className="flex items-center gap-1.5 text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-lg text-xs font-bold animate-fade-in">
                  <CheckCircle2 size={14} />
                  <span>Ratings Saved Successfully!</span>
                </div>
              )}
              <button
                onClick={handleSaveEvaluations}
                disabled={savingEvaluations || !rosterData?.students?.length}
                className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold px-4 py-2 rounded-lg shadow transition-colors disabled:opacity-50"
              >
                <Save size={14} />
                <span>{savingEvaluations ? 'Saving Ratings...' : 'Save All Evaluations'}</span>
              </button>
            </div>
          </div>

          {/* Roster Table */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider">
                    <th className="py-3 px-4 w-16">Roll #</th>
                    <th className="py-3 px-4 w-48">Student Name</th>
                    {rosterData?.criteria?.map((c) => (
                      <th key={c.id} className="py-3 px-4 text-center">
                        <div className="font-bold text-slate-800">{c.name}</div>
                        <div className="text-[10px] text-slate-400 font-normal">Rating (1 to 5 Stars)</div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {rosterData?.students?.length > 0 ? (
                    rosterData.students.map((st) => (
                      <tr key={st.student_id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-3 px-4 font-mono font-bold text-slate-600">{st.roll_no || '-'}</td>
                        <td className="py-3 px-4">
                          <div className="font-bold text-slate-900">{st.student_name}</div>
                          <div className="text-[11px] text-slate-400 font-mono">{st.admission_no}</div>
                        </td>
                        {rosterData.criteria.map((crit) => {
                          const currentVal = scores[st.student_id]?.[crit.id]?.rating_value || '5';
                          return (
                            <td key={crit.id} className="py-3 px-4 text-center">
                              <div className="inline-flex items-center gap-1 bg-amber-50/80 px-2 py-1 rounded-lg border border-amber-200/50">
                                {[1, 2, 3, 4, 5].map((star) => (
                                  <button
                                    key={star}
                                    type="button"
                                    onClick={() => handleScoreChange(st.student_id, crit.id, star.toString())}
                                    className="focus:outline-none transition-transform hover:scale-125"
                                  >
                                    <Star
                                      size={15}
                                      className={`${
                                        star <= parseInt(currentVal, 10)
                                          ? 'fill-amber-400 text-amber-500'
                                          : 'text-slate-300'
                                      }`}
                                    />
                                  </button>
                                ))}
                                <span className="ml-1 text-[11px] font-bold text-amber-900">{currentVal}★</span>
                              </div>
                            </td>
                          );
                        })}
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} className="text-center py-12 text-slate-400">
                        No enrolled students found in this class section.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: DISCIPLINARY LOG & INCIDENTS */}
      {/* ========================================================================= */}
      {activeTab === 'discipline' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <ShieldAlert size={16} className="text-rose-600" />
                <span>Student Disciplinary Incident Log</span>
              </h3>
              <p className="text-xs text-slate-500">Record infractions, severity levels, corrective action, and parent notifications</p>
            </div>
            <button
              onClick={() => setShowIncidentModal(true)}
              className="flex items-center gap-1.5 bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow transition-colors"
            >
              <Plus size={14} />
              <span>Record Disciplinary Incident</span>
            </button>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider">
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Student</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">Severity</th>
                  <th className="py-3 px-4">Action Taken</th>
                  <th className="py-3 px-4">Description</th>
                  <th className="py-3 px-4">Parent Notified</th>
                  <th className="py-3 px-4">Reported By</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {incidents.length > 0 ? (
                  incidents.map((inc) => (
                    <tr key={inc.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-4 text-slate-500 font-mono">{inc.incident_date}</td>
                      <td className="py-3 px-4 font-bold text-slate-900">{inc.student_name}</td>
                      <td className="py-3 px-4">
                        <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded text-[11px] font-semibold">
                          {inc.category}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            inc.severity_level === 'CRITICAL'
                              ? 'bg-rose-100 text-rose-800'
                              : inc.severity_level === 'HIGH'
                              ? 'bg-orange-100 text-orange-800'
                              : inc.severity_level === 'MEDIUM'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-blue-100 text-blue-800'
                          }`}
                        >
                          {inc.severity_level}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-semibold text-slate-800">{inc.action_taken}</td>
                      <td className="py-3 px-4 text-slate-600 max-w-xs truncate">{inc.description || '-'}</td>
                      <td className="py-3 px-4">
                        {inc.parent_notified ? (
                          <span className="inline-flex items-center gap-1 text-emerald-700 font-bold text-[11px]">
                            <CheckCircle2 size={13} /> Yes
                          </span>
                        ) : (
                          <span className="text-slate-400 text-[11px]">No</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-slate-500">{inc.reported_by}</td>
                      <td className="py-3 px-4 text-right">
                        <a
                          href={`/api/v1/documents/warning-letter/${inc.id}/html?tenant_slug=${localStorage.getItem('tenant_slug') || 'sample'}`}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 px-2.5 py-1 rounded-lg font-bold text-[11px] transition-colors whitespace-nowrap"
                        >
                          <Printer size={11} />
                          <span>Warning Letter</span>
                        </a>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={9} className="text-center py-12 text-slate-400">
                      No disciplinary incidents recorded yet. Clean behavioral record!
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: STUDENT AWARDS & HONORS */}
      {/* ========================================================================= */}
      {activeTab === 'awards' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Sparkles size={16} className="text-amber-500" />
                <span>Student Honors & Achievement Recognitions</span>
              </h3>
              <p className="text-xs text-slate-500">Confer "Student of the Month", academic laurels, and sports excellence</p>
            </div>
            <button
              onClick={() => setShowAwardModal(true)}
              className="flex items-center gap-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold px-4 py-2.5 rounded-xl shadow transition-colors"
            >
              <Plus size={14} />
              <span>Confer Student Award</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {awards.length > 0 ? (
              awards.map((aw) => (
                <div key={aw.id} className="bg-white rounded-2xl border border-amber-200/80 p-5 shadow-sm space-y-3 relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-bl from-amber-400/20 to-transparent rounded-bl-full pointer-events-none"></div>
                  <div className="flex items-center justify-between">
                    <span className="bg-amber-100 text-amber-900 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase">
                      {aw.award_category}
                    </span>
                    <span className="text-[11px] text-slate-400 font-mono">{aw.award_date}</span>
                  </div>

                  <div>
                    <h4 className="font-black text-slate-900 text-sm leading-tight">{aw.award_name}</h4>
                    <div className="text-xs font-bold text-blue-700 mt-1">{aw.student_name}</div>
                  </div>

                  <p className="text-xs text-slate-600 leading-relaxed italic bg-amber-50/50 p-2.5 rounded-lg border border-amber-100">
                    "{aw.description || 'Awarded for exemplary conduct, dedication, and academic brilliance.'}"
                  </p>

                  <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-[11px] text-slate-500">
                    <span>Awarded by: <strong>{aw.awarded_by}</strong></span>
                    <a
                      href={`/api/v1/documents/award-certificate/${aw.id}/html?tenant_slug=${localStorage.getItem('tenant_slug') || 'sample'}`}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 px-2.5 py-1 rounded-lg font-bold text-[11px] transition-colors shadow-sm"
                    >
                      <Printer size={11} />
                      <span>Certificate</span>
                    </a>
                  </div>
                </div>
              ))
            ) : (
              <div className="col-span-3 text-center py-12 bg-white rounded-xl border border-slate-200 text-slate-400 text-xs">
                No awards conferred yet. Click "Confer Student Award" to celebrate student excellence!
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal: Record Disciplinary Incident */}
      {showIncidentModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-lg w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <ShieldAlert size={16} className="text-rose-600" />
                <span>Record Disciplinary Incident</span>
              </h3>
              <button onClick={() => setShowIncidentModal(false)} className="text-slate-400 hover:text-slate-600">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateIncident} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">Select Student *</label>
                <select
                  required
                  value={incidentForm.student_id}
                  onChange={(e) => setIncidentForm({ ...incidentForm, student_id: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold"
                >
                  <option value="">-- Choose Student --</option>
                  {students.map((st) => (
                    <option key={st.id} value={st.id}>
                      {st.admission_no} - {st.full_name} ({st.class_name})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Incident Date *</label>
                  <input
                    type="date"
                    required
                    value={incidentForm.incident_date}
                    onChange={(e) => setIncidentForm({ ...incidentForm, incident_date: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Category *</label>
                  <select
                    value={incidentForm.category}
                    onChange={(e) => setIncidentForm({ ...incidentForm, category: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold"
                  >
                    <option value="BEHAVIORAL">Behavioral / Misconduct</option>
                    <option value="UNIFORM">Uniform / Dress Code</option>
                    <option value="ATTENDANCE">Bunking / Truancy</option>
                    <option value="ACADEMIC">Cheating / Plagiarism</option>
                    <option value="VIOLENCE">Fighting / Bullying</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Severity Level *</label>
                  <select
                    value={incidentForm.severity_level}
                    onChange={(e) => setIncidentForm({ ...incidentForm, severity_level: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold"
                  >
                    <option value="LOW">Low (Minor Infraction)</option>
                    <option value="MEDIUM">Medium (Repeated Issue)</option>
                    <option value="HIGH">High (Serious Misconduct)</option>
                    <option value="CRITICAL">Critical (Suspension Review)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Action Taken *</label>
                  <select
                    value={incidentForm.action_taken}
                    onChange={(e) => setIncidentForm({ ...incidentForm, action_taken: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold"
                  >
                    <option value="VERBAL_WARNING">Verbal Warning</option>
                    <option value="WRITTEN_WARNING">Official Written Warning</option>
                    <option value="PARENT_CALLED">Parent Called to Office</option>
                    <option value="DETENTION">After-School Detention</option>
                    <option value="SUSPENSION">Suspension (1-3 Days)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Incident Details / Description *</label>
                <textarea
                  required
                  rows={3}
                  value={incidentForm.description}
                  onChange={(e) => setIncidentForm({ ...incidentForm, description: e.target.value })}
                  placeholder="Describe what occurred, witness accounts, and teacher notes..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="parent_notified"
                  checked={incidentForm.parent_notified}
                  onChange={(e) => setIncidentForm({ ...incidentForm, parent_notified: e.target.checked })}
                  className="rounded text-rose-600"
                />
                <label htmlFor="parent_notified" className="text-slate-700 font-semibold cursor-pointer">
                  Parent has been officially notified via call / SMS
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowIncidentModal(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingIncident}
                  className="px-5 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-lg font-bold shadow disabled:opacity-50"
                >
                  {submittingIncident ? 'Saving...' : 'Save Incident Record'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Confer Award */}
      {showAwardModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-lg w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <Award size={16} className="text-amber-500" />
                <span>Confer Student Award & Honor</span>
              </h3>
              <button onClick={() => setShowAwardModal(false)} className="text-slate-400 hover:text-slate-600">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateAward} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">Select Student *</label>
                <select
                  required
                  value={awardForm.student_id}
                  onChange={(e) => setAwardForm({ ...awardForm, student_id: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold"
                >
                  <option value="">-- Choose Student --</option>
                  {students.map((st) => (
                    <option key={st.id} value={st.id}>
                      {st.admission_no} - {st.full_name} ({st.class_name})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Award Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Student of the Month / 100% Attendance Star"
                  value={awardForm.award_name}
                  onChange={(e) => setAwardForm({ ...awardForm, award_name: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Award Category *</label>
                  <select
                    value={awardForm.award_category}
                    onChange={(e) => setAwardForm({ ...awardForm, award_category: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold"
                  >
                    <option value="BEHAVIOR">Exemplary Conduct & Leadership</option>
                    <option value="ACADEMIC">Academic Excellence</option>
                    <option value="ATTENDANCE">100% Punctuality & Attendance</option>
                    <option value="SPORTS">Sports & Athletic Champion</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Award Date *</label>
                  <input
                    type="date"
                    required
                    value={awardForm.award_date}
                    onChange={(e) => setAwardForm({ ...awardForm, award_date: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Citation / Description</label>
                <textarea
                  rows={3}
                  value={awardForm.description}
                  onChange={(e) => setAwardForm({ ...awardForm, description: e.target.value })}
                  placeholder="Citation recognizing the student's achievement..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="cert_issued"
                  checked={awardForm.certificate_issued}
                  onChange={(e) => setAwardForm({ ...awardForm, certificate_issued: e.target.checked })}
                  className="rounded text-amber-500"
                />
                <label htmlFor="cert_issued" className="text-slate-700 font-semibold cursor-pointer">
                  Issue Digital Certificate in Documents Vault
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAwardModal(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingAward}
                  className="px-5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-lg font-bold shadow disabled:opacity-50"
                >
                  {submittingAward ? 'Conferring...' : 'Confer Award & Publish'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
