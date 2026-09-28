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
  TrendingUp,
  CheckSquare,
  ListTodo,
  BarChart3,
  BookCheck,
  Flame,
  Zap,
  Check,
  Trash2,
} from 'lucide-react';
import api from '../../api/client';

export const DisciplineAndAwards = () => {
  const [activeTab, setActiveTab] = useState('evaluations'); // evaluations, discipline, awards, radar, pmr, actions, audits

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

  // Tab 4: 9-Point Daily Habit Radar & Friday Honor Roll
  const [radarData, setRadarData] = useState(null);
  const [loadingRadar, setLoadingRadar] = useState(false);
  const [radarDate, setRadarDate] = useState(new Date().toISOString().split('T')[0]);
  const [conferringHonorStudentId, setConferringHonorStudentId] = useState(null);

  // Tab 5: Principal Monitoring Report (PMR) Scorecard
  const [pmrData, setPmrData] = useState(null);
  const [loadingPmr, setLoadingPmr] = useState(false);
  const [pmrWeekDate, setPmrWeekDate] = useState(new Date().toISOString().split('T')[0]);

  // Tab 6: Executive Action Item Tracker
  const [actionItems, setActionItems] = useState([]);
  const [loadingActions, setLoadingActions] = useState(false);
  const [showActionModal, setShowActionModal] = useState(false);
  const [submittingAction, setSubmittingAction] = useState(false);
  const [actionFilter, setActionFilter] = useState('ALL');
  const [actionForm, setActionForm] = useState({
    title: '',
    description: '',
    category: 'ACADEMIC',
    priority: 'HIGH',
    assigned_to_name: '',
    due_date: new Date(Date.now() + 86400000 * 3).toISOString().split('T')[0],
  });

  // Tab 7: Notebook Correction Audits
  const [notebookAudits, setNotebookAudits] = useState([]);
  const [loadingAudits, setLoadingAudits] = useState(false);
  const [showAuditModal, setShowAuditModal] = useState(false);
  const [submittingAudit, setSubmittingAudit] = useState(false);
  const [auditForm, setAuditForm] = useState({
    class_id: '',
    section_id: '',
    subject_name: 'Mathematics',
    teacher_name: '',
    audit_date: new Date().toISOString().split('T')[0],
    total_notebooks: 40,
    checked_notebooks: 38,
    red_pen_feedback_score: 5,
    parent_signature_verified: true,
    notes: 'Checked with thorough remarks and red pen corrections.',
  });

  const fetchRadarData = async () => {
    setLoadingRadar(true);
    try {
      const res = await api.get('/development/habits/school-radar', {
        params: {
          academic_year_id: academicYearId || undefined,
          target_date: radarDate,
        },
      });
      setRadarData(res.data || res);
    } catch (err) {
      console.error('Error fetching habit radar:', err);
    } finally {
      setLoadingRadar(false);
    }
  };

  const fetchPmrData = async () => {
    setLoadingPmr(true);
    try {
      const res = await api.get('/development/pmr/weekly-scorecard', {
        params: {
          week_start_date: pmrWeekDate,
          academic_year_id: academicYearId || undefined,
        },
      });
      setPmrData(res?.data?.data || res?.data || res);
    } catch (err) {
      console.error('Error fetching PMR scorecard:', err);
    } finally {
      setLoadingPmr(false);
    }
  };

  const fetchActionItems = async () => {
    setLoadingActions(true);
    try {
      const res = await api.get('/development/action-items');
      const data = res?.data?.data || res?.data || [];
      setActionItems(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Error fetching action items:', err);
    } finally {
      setLoadingActions(false);
    }
  };

  const fetchNotebookAudits = async () => {
    setLoadingAudits(true);
    try {
      const res = await api.get('/development/notebook-audits', {
        params: {
          class_id: classId || undefined,
          section_id: sectionId || undefined,
        },
      });
      const data = res?.data?.data || res?.data || [];
      setNotebookAudits(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Error fetching notebook audits:', err);
    } finally {
      setLoadingAudits(false);
    }
  };

  const handleAutoConferCertificate = async (st) => {
    setConferringHonorStudentId(st.student_id);
    try {
      const res = await api.post('/development/awards/confer-honor', {
        student_id: st.student_id,
        academic_year_id: academicYearId,
        award_name: `Friday Assembly Honor Roll (${st.badge || 'Star Performer'})`,
        citation: `Conferred for distinguished 9-point daily discipline, habit consistency (Avg: ${st.weekly_avg_score}/9.0), and leadership in school life.`,
      });
      const awardId = res?.data?.award_id || res?.data?.data?.award_id || res?.award_id;
      if (awardId) {
        const token = localStorage.getItem('token') || '';
        const tenantSlug = localStorage.getItem('tenant_slug') || '7aschoolerpuat';
        window.open(`/api/v1/documents/award-certificate/${awardId}/html?token=${encodeURIComponent(token)}&tenant_slug=${encodeURIComponent(tenantSlug)}`, '_blank');
      }
      fetchAwards();
    } catch (err) {
      alert('Failed to auto-confer award: ' + (err.response?.data?.message || err.message));
    } finally {
      setConferringHonorStudentId(null);
    }
  };

  const handleCreateActionItem = async (e) => {
    e.preventDefault();
    setSubmittingAction(true);
    try {
      await api.post('/development/action-items', actionForm);
      setShowActionModal(false);
      setActionForm({
        title: '',
        description: '',
        category: 'ACADEMIC',
        priority: 'HIGH',
        assigned_to_name: '',
        due_date: new Date(Date.now() + 86400000 * 3).toISOString().split('T')[0],
      });
      fetchActionItems();
    } catch (err) {
      alert('Failed to create action item: ' + (err.response?.data?.message || err.message));
    } finally {
      setSubmittingAction(false);
    }
  };

  const handleUpdateActionStatus = async (itemId, newStatus) => {
    try {
      await api.patch(`/development/action-items/${itemId}/status`, { status: newStatus });
      fetchActionItems();
    } catch (err) {
      alert('Failed to update status: ' + (err.response?.data?.message || err.message));
    }
  };

  const handleDeleteActionItem = async (itemId) => {
    if (!window.confirm('Are you sure you want to delete this action item?')) return;
    try {
      await api.delete(`/development/action-items/${itemId}`);
      fetchActionItems();
    } catch (err) {
      alert('Failed to delete item: ' + (err.response?.data?.message || err.message));
    }
  };

  const handleCreateNotebookAudit = async (e) => {
    e.preventDefault();
    setSubmittingAudit(true);
    try {
      await api.post('/development/notebook-audits', {
        ...auditForm,
        class_id: auditForm.class_id || classId,
        section_id: auditForm.section_id || sectionId,
      });
      setShowAuditModal(false);
      fetchNotebookAudits();
    } catch (err) {
      alert('Failed to save notebook audit: ' + (err.response?.data?.message || err.message));
    } finally {
      setSubmittingAudit(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'radar') {
      fetchRadarData();
    }
  }, [activeTab, radarDate, academicYearId]);

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
    } else if (activeTab === 'radar') {
      fetchRadarData();
    } else if (activeTab === 'pmr') {
      fetchPmrData();
    } else if (activeTab === 'actions') {
      fetchActionItems();
    } else if (activeTab === 'audits') {
      fetchNotebookAudits();
    }
  }, [activeTab, academicYearId, classId, sectionId, evaluationPeriod, radarDate, pmrWeekDate]);

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
        <div className="flex flex-wrap bg-slate-200 p-1 rounded-xl text-xs font-bold gap-1">
          <button
            onClick={() => setActiveTab('evaluations')}
            className={`px-3 py-1.5 rounded-lg transition-all ${
              activeTab === 'evaluations' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            5-Star Assessment
          </button>
          <button
            onClick={() => setActiveTab('discipline')}
            className={`px-3 py-1.5 rounded-lg transition-all ${
              activeTab === 'discipline' ? 'bg-white text-rose-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Discipline ({incidents.length})
          </button>
          <button
            onClick={() => setActiveTab('awards')}
            className={`px-3 py-1.5 rounded-lg transition-all ${
              activeTab === 'awards' ? 'bg-white text-amber-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Honors & Awards ({awards.length})
          </button>
          <button
            onClick={() => setActiveTab('radar')}
            className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1 ${
              activeTab === 'radar' ? 'bg-white text-indigo-700 shadow-sm font-black' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Sparkles size={13} className="text-amber-500" />
            <span>⭐ 9-Point Habits</span>
          </button>
          <button
            onClick={() => setActiveTab('pmr')}
            className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1 ${
              activeTab === 'pmr' ? 'bg-white text-blue-800 shadow-sm font-black' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <BarChart3 size={13} className="text-blue-600" />
            <span>📊 PMR Scorecard</span>
          </button>
          <button
            onClick={() => setActiveTab('actions')}
            className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1 ${
              activeTab === 'actions' ? 'bg-white text-rose-700 shadow-sm font-black' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <ListTodo size={13} className="text-rose-500" />
            <span>⚡ Action Items ({actionItems.filter(i => i.status !== 'RESOLVED').length})</span>
          </button>
          <button
            onClick={() => setActiveTab('audits')}
            className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1 ${
              activeTab === 'audits' ? 'bg-white text-emerald-700 shadow-sm font-black' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <BookCheck size={13} className="text-emerald-600" />
            <span>📖 Notebook Audits</span>
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
                          href={`/api/v1/documents/warning-letter/${inc.id}/html?token=${encodeURIComponent(localStorage.getItem('token') || '')}&tenant_slug=${encodeURIComponent(localStorage.getItem('tenant_slug') || '7aschoolerpuat')}`}
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
                      href={`/api/v1/documents/award-certificate/${aw.id}/html?token=${encodeURIComponent(localStorage.getItem('token') || '')}&tenant_slug=${encodeURIComponent(localStorage.getItem('tenant_slug') || '7aschoolerpuat')}`}
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

      {/* ========================================================================= */}
      {/* TAB 4: 9-POINT DAILY HABIT RADAR & ASSEMBLY HONOR ROLL */}
      {/* ========================================================================= */}
      {activeTab === 'radar' && (
        <div className="space-y-6">
          {/* Radar Header & Filter Bar */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-3 text-xs">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Academic Session</label>
                <select
                  value={academicYearId}
                  onChange={(e) => setAcademicYearId(e.target.value)}
                  className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg font-semibold text-slate-800"
                >
                  {academicYears.map((y) => (
                    <option key={y.id} value={y.id}>
                      {y.name} {y.is_current ? '(Current)' : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Target Date</label>
                <input
                  type="date"
                  value={radarDate}
                  onChange={(e) => setRadarDate(e.target.value)}
                  className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg font-semibold text-slate-800"
                />
              </div>

              <button
                onClick={fetchRadarData}
                disabled={loadingRadar}
                className="mt-4 px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-bold flex items-center gap-1.5 transition-colors"
              >
                <span>{loadingRadar ? 'Scanning...' : 'Refresh Radar'}</span>
              </button>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => window.print()}
                className="flex items-center gap-2 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow transition-all"
              >
                <Printer size={14} />
                <span>Print Friday Assembly Honor Roll</span>
              </button>
            </div>
          </div>

          {loadingRadar ? (
            <div className="py-16 text-center text-xs text-slate-400 bg-white rounded-2xl border border-slate-200">
              Compiling school-wide habit radar and Class Habit Indexes (CHI)...
            </div>
          ) : !radarData ? (
            <div className="py-16 text-center text-xs text-slate-400 bg-white rounded-2xl border border-slate-200">
              No habit radar evaluations found for the selected date.
            </div>
          ) : (
            <>
              {/* Telemetry Highlight Banner */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="bg-gradient-to-br from-indigo-900 to-slate-900 text-white rounded-2xl p-5 shadow-lg space-y-1">
                  <span className="text-[10px] font-black uppercase tracking-wider text-indigo-300">
                    School-Wide Habit Index
                  </span>
                  <div className="text-3xl font-black text-amber-300">
                    {radarData.overall_habit_index_percent}%
                  </div>
                  <p className="text-[11px] text-indigo-200 font-medium">Composite Campus Discipline</p>
                </div>

                <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                    Students Evaluated
                  </span>
                  <div className="text-3xl font-black text-slate-900">
                    {radarData.total_students_marked}
                  </div>
                  <p className="text-[11px] text-slate-500 font-medium">Across {radarData.total_classes_evaluated} Active Sections</p>
                </div>

                <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-rose-600">
                    Red Alert Flags (&lt;6/9)
                  </span>
                  <div className="text-3xl font-black text-rose-600">
                    {radarData.total_red_alerts}
                  </div>
                  <p className="text-[11px] text-rose-500 font-medium">Need Homeroom Counseling</p>
                </div>

                <div className="bg-gradient-to-br from-amber-500 to-orange-600 text-white rounded-2xl p-5 shadow-md space-y-1">
                  <span className="text-[10px] font-black uppercase tracking-wider text-amber-100">
                    Friday Honor Roll
                  </span>
                  <div className="text-3xl font-black">
                    {radarData.weekly_honor_roll?.length || 0}
                  </div>
                  <p className="text-[11px] text-amber-100 font-medium">⭐ 100% Exemplary Achievers</p>
                </div>
              </div>

              {/* Class Habit Heatmap Matrix */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
                <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                      <Sparkles size={16} className="text-indigo-600" />
                      <span>Class Habit Index (CHI) Heatmap</span>
                    </h3>
                    <p className="text-xs text-slate-500">
                      Homeroom dimension compliance and discipline tracking by section
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {radarData.class_breakdown?.map((item) => (
                    <div
                      key={`${item.class_id}-${item.section_id}`}
                      className={`p-4 rounded-2xl border transition-all ${
                        item.habit_index_percent >= 95
                          ? 'bg-emerald-50/40 border-emerald-200'
                          : item.habit_index_percent >= 85
                          ? 'bg-slate-50 border-slate-200'
                          : 'bg-amber-50/60 border-amber-300'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-white border border-slate-200 text-slate-700">
                            {item.total_students} Students
                          </span>
                          <h4 className="font-black text-slate-900 text-base mt-1">
                            {item.class_name} — Section {item.section_name}
                          </h4>
                        </div>
                        <div className="text-right">
                          <div className="text-lg font-black text-indigo-700">
                            {item.habit_index_percent}%
                          </div>
                          <span className="text-[10px] text-slate-500 font-semibold">CHI Score</span>
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-1.5 pt-3 text-[11px] font-medium text-slate-700">
                        <div className="p-1.5 bg-white rounded-lg border border-slate-100">
                          <span className="text-[10px] text-slate-400 block">👔 Uniform</span>
                          <strong>{item.compliance?.uniform_rate}%</strong>
                        </div>
                        <div className="p-1.5 bg-white rounded-lg border border-slate-100">
                          <span className="text-[10px] text-slate-400 block">✍️ Homework</span>
                          <strong>{item.compliance?.homework_rate}%</strong>
                        </div>
                        <div className="p-1.5 bg-white rounded-lg border border-slate-100">
                          <span className="text-[10px] text-slate-400 block">⏰ Punctual</span>
                          <strong>{item.compliance?.punctuality_rate}%</strong>
                        </div>
                      </div>

                      {item.red_alerts_count > 0 && (
                        <div className="mt-2.5 p-1.5 bg-rose-100 text-rose-800 rounded-lg text-[10px] font-bold flex items-center justify-between">
                          <span>⚠️ {item.red_alerts_count} student(s) below 6/9 score</span>
                          <span>Needs Followup</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Friday Assembly Honor Roll Print Table */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
                <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                      <Award size={16} className="text-amber-500" />
                      <span>Friday Assembly Weekly Habit Honor Roll (Top Achievers)</span>
                    </h3>
                    <p className="text-xs text-slate-500">
                      Students maintaining exemplary 9/9 or &gt;8.5/9 character scores over the past 7 days
                    </p>
                  </div>
                  <span className="text-xs font-mono font-bold bg-amber-50 text-amber-800 border border-amber-200 px-3 py-1 rounded-lg">
                    {radarData.weekly_honor_roll?.length || 0} Honorees
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
                        <th className="py-3 px-4">Rank</th>
                        <th className="py-3 px-4">Adm No</th>
                        <th className="py-3 px-4">Student Name</th>
                        <th className="py-3 px-4">Class & Section</th>
                        <th className="py-3 px-4 text-center">Weekly Average</th>
                        <th className="py-3 px-4 text-center">Days Evaluated</th>
                        <th className="py-3 px-4 text-center">Award Category</th>
                        <th className="py-3 px-4 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium">
                      {radarData.weekly_honor_roll?.length > 0 ? (
                        radarData.weekly_honor_roll.map((st, idx) => (
                          <tr key={st.student_id} className="hover:bg-amber-50/30 transition-colors">
                            <td className="py-3 px-4 font-black text-slate-700">#{idx + 1}</td>
                            <td className="py-3 px-4 font-mono text-blue-700">{st.admission_no}</td>
                            <td className="py-3 px-4 font-bold text-slate-900">{st.student_name}</td>
                            <td className="py-3 px-4 text-slate-600">
                              {st.class_name} ({st.section_name})
                            </td>
                            <td className="py-3 px-4 text-center font-black text-emerald-700">
                              ⭐ {st.weekly_avg_score} / 9.0
                            </td>
                            <td className="py-3 px-4 text-center text-slate-500">
                              {st.days_evaluated} Days
                            </td>
                            <td className="py-3 px-4 text-center">
                              <span className="px-3 py-1 rounded-full text-[10px] font-black bg-amber-100 text-amber-900 border border-amber-300">
                                {st.badge}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-right">
                              <button
                                onClick={() => handleAutoConferCertificate(st)}
                                disabled={conferringHonorStudentId === st.student_id}
                                className="px-3 py-1 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 rounded-lg font-black text-[10px] inline-flex items-center gap-1 shadow-sm transition-all disabled:opacity-50"
                                title="Instantly create digital certificate in Document Vault"
                              >
                                <Award size={12} />
                                <span>{conferringHonorStudentId === st.student_id ? 'Conferring...' : '🏆 Confer Certificate'}</span>
                              </button>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={8} className="text-center py-8 text-slate-400">
                            No students met the 8.5/9 weekly honor threshold for this period.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 5: PRINCIPAL MONITORING REPORT (PMR) SCORECARD */}
      {/* ========================================================================= */}
      {activeTab === 'pmr' && (
        <div className="space-y-6">
          {/* PMR Controls Bar */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <BarChart3 size={18} className="text-blue-600" />
              <div>
                <h3 className="font-bold text-slate-900 text-sm">Principal Weekly Governance Scorecard (PMR)</h3>
                <p className="text-xs text-slate-500">Live operational telemetry across Attendance, Fees, 9-Habits, Notebook Audits & Action Items</p>
              </div>
            </div>

            <div className="flex items-center gap-2 text-xs">
              <label className="font-bold text-slate-600">Week Start Date:</label>
              <input
                type="date"
                value={pmrWeekDate}
                onChange={(e) => setPmrWeekDate(e.target.value)}
                className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg font-mono font-semibold"
              />
              <button
                onClick={fetchPmrData}
                disabled={loadingPmr}
                className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-bold shadow"
              >
                {loadingPmr ? 'Calculating...' : 'Recalculate Scorecard'}
              </button>
            </div>
          </div>

          {loadingPmr ? (
            <div className="p-12 text-center text-xs text-slate-400">Compiling executive weekly telemetry scorecard...</div>
          ) : !pmrData ? (
            <div className="p-12 text-center text-xs text-slate-400 bg-white rounded-xl border border-slate-200">
              No PMR scorecard generated for this week. Click "Recalculate Scorecard".
            </div>
          ) : (
            <div className="space-y-6">
              {/* Executive Summary Velocity Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* 1. Attendance Velocity */}
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3">
                  <div className="flex items-center justify-between text-slate-400">
                    <span className="text-xs font-bold uppercase tracking-wider">Attendance Velocity</span>
                    <TrendingUp size={18} className="text-emerald-600" />
                  </div>
                  <div>
                    <div className="text-2xl font-black text-slate-900">
                      {pmrData.attendance_velocity?.attendance_percentage || 0}%
                    </div>
                    <p className="text-xs text-slate-500">
                      {pmrData.attendance_velocity?.present_count || 0} / {pmrData.attendance_velocity?.total_marked || 0} Student Logs
                    </p>
                  </div>
                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
                    <span className="text-slate-500">Punctuality Rate</span>
                    <span className="font-bold text-emerald-700">
                      {pmrData.attendance_velocity?.punctuality_rate || 0}% On-Time
                    </span>
                  </div>
                </div>

                {/* 2. Fee Collection Velocity */}
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3">
                  <div className="flex items-center justify-between text-slate-400">
                    <span className="text-xs font-bold uppercase tracking-wider">Fee Collection Pace</span>
                    <Flame size={18} className="text-amber-500" />
                  </div>
                  <div>
                    <div className="text-2xl font-black text-slate-900">
                      ₹{(pmrData.fee_velocity?.total_collected_this_week || 0).toLocaleString()}
                    </div>
                    <p className="text-xs text-slate-500">
                      {pmrData.fee_velocity?.transaction_count || 0} Receipts Issued This Week
                    </p>
                  </div>
                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
                    <span className="text-slate-500">Collection Pace</span>
                    <span className="font-bold text-amber-700">
                      {pmrData.fee_velocity?.pace_status || 'Optimal Velocity'}
                    </span>
                  </div>
                </div>

                {/* 3. 9-Point Habit Health */}
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3">
                  <div className="flex items-center justify-between text-slate-400">
                    <span className="text-xs font-bold uppercase tracking-wider">9-Point Habit Index</span>
                    <Sparkles size={18} className="text-indigo-600" />
                  </div>
                  <div>
                    <div className="text-2xl font-black text-slate-900 flex items-center gap-1.5">
                      <span>{pmrData.habit_health?.school_avg_score || 0} / 9.0</span>
                    </div>
                    <p className="text-xs text-slate-500">
                      {pmrData.habit_health?.total_evaluations_logged || 0} Daily Logs Processed
                    </p>
                  </div>
                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
                    <span className="text-slate-500">Friday Honor Candidates</span>
                    <span className="font-bold text-indigo-700">
                      {pmrData.habit_health?.honor_roll_candidates_count || 0} Students (&gt;8.5)
                    </span>
                  </div>
                </div>

                {/* 4. Notebook Audit Score */}
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3">
                  <div className="flex items-center justify-between text-slate-400">
                    <span className="text-xs font-bold uppercase tracking-wider">Notebook Audit Index</span>
                    <BookCheck size={18} className="text-purple-600" />
                  </div>
                  <div>
                    <div className="text-2xl font-black text-slate-900">
                      {pmrData.notebook_audit_score?.average_coverage_pct || 0}%
                    </div>
                    <p className="text-xs text-slate-500">
                      {pmrData.notebook_audit_score?.audits_conducted_count || 0} Section Audits Conducted
                    </p>
                  </div>
                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
                    <span className="text-slate-500">Red-Pen Feedback</span>
                    <span className="font-bold text-purple-700">
                      ⭐ {pmrData.notebook_audit_score?.average_red_pen_rating || 0} / 5.0
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Item Telemetry Alert Banner */}
              <div className="p-4 bg-gradient-to-r from-slate-900 to-slate-800 text-white rounded-2xl shadow flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-rose-500/20 text-rose-400 rounded-xl border border-rose-500/30">
                    <AlertTriangle size={20} />
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-white">
                      Executive Action Item Telemetry: {pmrData.action_item_telemetry?.overdue_count || 0} Overdue Action Items
                    </h4>
                    <p className="text-xs text-slate-300">
                      Total Open Items: <strong>{pmrData.action_item_telemetry?.open_count || 0}</strong> | In Progress: <strong>{pmrData.action_item_telemetry?.in_progress_count || 0}</strong> | Resolved: <strong>{pmrData.action_item_telemetry?.resolved_count || 0}</strong>
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => setActiveTab('actions')}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold shadow transition-all self-start sm:self-auto"
                >
                  ⚡ Open Executive Action Tracker
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 6: EXECUTIVE ACTION ITEM TRACKER */}
      {/* ========================================================================= */}
      {activeTab === 'actions' && (
        <div className="space-y-4">
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <ListTodo size={18} className="text-rose-600" />
              <div>
                <h3 className="font-bold text-slate-900 text-sm">Principal & Executive Action Items</h3>
                <p className="text-xs text-slate-500">Track and enforce administrative, academic, and compliance resolutions</p>
              </div>
            </div>

            <div className="flex items-center gap-2 text-xs">
              <div className="flex bg-slate-100 p-1 rounded-lg">
                {['ALL', 'OPEN', 'IN_PROGRESS', 'RESOLVED'].map((status) => (
                  <button
                    key={status}
                    onClick={() => setActionFilter(status)}
                    className={`px-2.5 py-1 rounded-md font-bold text-[11px] transition-all ${
                      actionFilter === status ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    {status.replace('_', ' ')}
                  </button>
                ))}
              </div>

              <button
                onClick={() => setShowActionModal(true)}
                className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded-lg font-bold shadow flex items-center gap-1"
              >
                <Plus size={14} />
                <span>New Action Item</span>
              </button>
            </div>
          </div>

          {loadingActions ? (
            <div className="p-12 text-center text-xs text-slate-400">Loading action items...</div>
          ) : actionItems.length === 0 ? (
            <div className="p-12 text-center text-xs text-slate-400 bg-white rounded-xl border border-slate-200">
              No executive action items found. Click "+ New Action Item" to create one.
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden divide-y divide-slate-100 text-xs">
              {actionItems
                .filter((item) => actionFilter === 'ALL' || item.status === actionFilter)
                .map((item) => {
                  const isOverdue = item.status !== 'RESOLVED' && item.due_date && new Date(item.due_date) < new Date();
                  const priorityColor =
                    item.priority === 'CRITICAL'
                      ? 'bg-rose-100 text-rose-800 border-rose-200'
                      : item.priority === 'HIGH'
                      ? 'bg-amber-100 text-amber-800 border-amber-200'
                      : 'bg-blue-100 text-blue-800 border-blue-200';

                  return (
                    <div
                      key={item.id}
                      className={`p-4 hover:bg-slate-50/80 transition-colors flex flex-col md:flex-row items-start md:items-center justify-between gap-4 ${
                        isOverdue ? 'border-l-4 border-rose-500 bg-rose-50/20' : ''
                      }`}
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-0.5 rounded-md font-bold text-[10px] border ${priorityColor}`}>
                            {item.priority}
                          </span>
                          <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 font-semibold text-[10px]">
                            {item.category}
                          </span>
                          <h4 className="font-bold text-slate-900 text-sm">{item.title}</h4>
                          {isOverdue && (
                            <span className="px-2 py-0.5 rounded-full bg-rose-600 text-white font-black text-[9px] animate-pulse">
                              OVERDUE
                            </span>
                          )}
                        </div>
                        {item.description && (
                          <p className="text-slate-600 text-xs line-clamp-2">{item.description}</p>
                        )}
                        <div className="text-[11px] text-slate-400 flex items-center gap-3 pt-1">
                          <span>Assigned To: <strong className="text-slate-700">{item.assigned_to_name || 'Principal'}</strong></span>
                          <span>•</span>
                          <span>Due Date: <strong className={isOverdue ? 'text-rose-600 font-bold' : 'text-slate-700'}>{item.due_date}</strong></span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {item.status !== 'RESOLVED' && (
                          <>
                            {item.status === 'OPEN' && (
                              <button
                                onClick={() => handleUpdateActionStatus(item.id, 'IN_PROGRESS')}
                                className="px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 rounded-lg text-xs font-bold"
                              >
                                Mark In-Progress
                              </button>
                            )}
                            <button
                              onClick={() => handleUpdateActionStatus(item.id, 'RESOLVED')}
                              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold flex items-center gap-1 shadow"
                            >
                              <Check size={13} />
                              <span>Resolve</span>
                            </button>
                          </>
                        )}
                        {item.status === 'RESOLVED' && (
                          <span className="px-3 py-1.5 rounded-lg bg-emerald-100 text-emerald-800 font-bold text-xs flex items-center gap-1">
                            <CheckCircle2 size={13} /> Resolved
                          </span>
                        )}
                        <button
                          onClick={() => handleDeleteActionItem(item.id)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg transition-colors"
                          title="Delete Action Item"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  );
                })}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 7: NOTEBOOK CORRECTION AUDITS */}
      {/* ========================================================================= */}
      {activeTab === 'audits' && (
        <div className="space-y-4">
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <BookCheck size={18} className="text-emerald-600" />
              <div>
                <h3 className="font-bold text-slate-900 text-sm">Notebook Correction Quality Audits</h3>
                <p className="text-xs text-slate-500">Monitor teacher notebook grading coverage %, red-pen remarks, and parent signature verification</p>
              </div>
            </div>

            <div className="flex items-center gap-2 text-xs">
              <select
                value={classId}
                onChange={(e) => handleClassChange(e.target.value)}
                className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg font-semibold"
              >
                <option value="">-- All Classes --</option>
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>

              <button
                onClick={() => setShowAuditModal(true)}
                className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-bold shadow flex items-center gap-1"
              >
                <Plus size={14} />
                <span>New Notebook Audit</span>
              </button>
            </div>
          </div>

          {loadingAudits ? (
            <div className="p-12 text-center text-xs text-slate-400">Loading notebook audits...</div>
          ) : notebookAudits.length === 0 ? (
            <div className="p-12 text-center text-xs text-slate-400 bg-white rounded-xl border border-slate-200">
              No notebook correction audits logged for this section. Click "+ New Notebook Audit".
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
                    <th className="py-3 px-4">Audit Date</th>
                    <th className="py-3 px-4">Class & Section</th>
                    <th className="py-3 px-4">Subject</th>
                    <th className="py-3 px-4">Teacher</th>
                    <th className="py-3 px-4 text-center">Coverage</th>
                    <th className="py-3 px-4 text-center">Red-Pen Feedback</th>
                    <th className="py-3 px-4 text-center">Parent Verified</th>
                    <th className="py-3 px-4">Observations</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {notebookAudits.map((a) => {
                    const covPct = a.total_notebooks > 0 ? Math.round((a.checked_notebooks / a.total_notebooks) * 100) : 0;
                    const badgeColor =
                      covPct >= 90
                        ? 'bg-emerald-100 text-emerald-800'
                        : covPct >= 75
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-rose-100 text-rose-800';

                    return (
                      <tr key={a.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-4 font-mono">{a.audit_date}</td>
                        <td className="py-3 px-4 font-bold text-slate-900">{a.class_name} ({a.section_name})</td>
                        <td className="py-3 px-4 text-blue-700 font-semibold">{a.subject_name}</td>
                        <td className="py-3 px-4 text-slate-700">{a.teacher_name}</td>
                        <td className="py-3 px-4 text-center">
                          <span className={`px-2.5 py-0.5 rounded-full font-bold text-[10px] ${badgeColor}`}>
                            {a.checked_notebooks} / {a.total_notebooks} ({covPct}%)
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center font-bold text-amber-600">
                          ⭐ {a.red_pen_feedback_score} / 5.0
                        </td>
                        <td className="py-3 px-4 text-center">
                          {a.parent_signature_verified ? (
                            <span className="text-emerald-700 font-bold flex items-center justify-center gap-1">
                              <CheckCircle2 size={13} /> Yes
                            </span>
                          ) : (
                            <span className="text-slate-400 font-semibold">Pending</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-slate-500 text-[11px] max-w-xs truncate">
                          {a.notes || '-'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
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

      {/* Modal: New Action Item */}
      {showActionModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-lg w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <ListTodo size={16} className="text-rose-600" />
                <span>Create Executive Action Item</span>
              </h3>
              <button onClick={() => setShowActionModal(false)} className="text-slate-400 hover:text-slate-600">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateActionItem} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">Action Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Audit Science Lab Fire Extinguishers & First Aid"
                  value={actionForm.title}
                  onChange={(e) => setActionForm({ ...actionForm, title: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Category *</label>
                  <select
                    value={actionForm.category}
                    onChange={(e) => setActionForm({ ...actionForm, category: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold"
                  >
                    <option value="ACADEMIC">Academic Excellence</option>
                    <option value="DISCIPLINARY">Disciplinary & Conduct</option>
                    <option value="INFRASTRUCTURE">Infrastructure & Facilities</option>
                    <option value="PARENT_RELATIONS">Parent Relations & Grievance</option>
                    <option value="COMPLIANCE">Statutory Compliance</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Priority Level *</label>
                  <select
                    value={actionForm.priority}
                    onChange={(e) => setActionForm({ ...actionForm, priority: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold"
                  >
                    <option value="CRITICAL">Critical (Immediate 24h)</option>
                    <option value="HIGH">High Priority</option>
                    <option value="MEDIUM">Medium Priority</option>
                    <option value="LOW">Low Priority</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Assigned Owner Name</label>
                  <input
                    type="text"
                    placeholder="e.g. Vice Principal / Academic In-Charge"
                    value={actionForm.assigned_to_name}
                    onChange={(e) => setActionForm({ ...actionForm, assigned_to_name: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Resolution Due Date *</label>
                  <input
                    type="date"
                    required
                    value={actionForm.due_date}
                    onChange={(e) => setActionForm({ ...actionForm, due_date: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Description & Expected Resolution</label>
                <textarea
                  rows={3}
                  value={actionForm.description}
                  onChange={(e) => setActionForm({ ...actionForm, description: e.target.value })}
                  placeholder="Detailed instructions and steps required..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowActionModal(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingAction}
                  className="px-5 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-lg font-bold shadow disabled:opacity-50"
                >
                  {submittingAction ? 'Creating...' : 'Create Action Item'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: New Notebook Correction Audit */}
      {showAuditModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-lg w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <BookCheck size={16} className="text-emerald-600" />
                <span>Log Notebook Correction Audit</span>
              </h3>
              <button onClick={() => setShowAuditModal(false)} className="text-slate-400 hover:text-slate-600">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateNotebookAudit} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Class *</label>
                  <select
                    required
                    value={auditForm.class_id || classId}
                    onChange={(e) => setAuditForm({ ...auditForm, class_id: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold"
                  >
                    {classes.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Section *</label>
                  <select
                    required
                    value={auditForm.section_id || sectionId}
                    onChange={(e) => setAuditForm({ ...auditForm, section_id: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold"
                  >
                    {sections.map((s) => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Subject Name *</label>
                  <input
                    type="text"
                    required
                    value={auditForm.subject_name}
                    onChange={(e) => setAuditForm({ ...auditForm, subject_name: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Teacher Inspected *</label>
                  <input
                    type="text"
                    required
                    placeholder="Faculty member name"
                    value={auditForm.teacher_name}
                    onChange={(e) => setAuditForm({ ...auditForm, teacher_name: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Total Enrolled Notebooks *</label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={auditForm.total_notebooks}
                    onChange={(e) => setAuditForm({ ...auditForm, total_notebooks: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Checked Notebooks *</label>
                  <input
                    type="number"
                    required
                    min={0}
                    value={auditForm.checked_notebooks}
                    onChange={(e) => setAuditForm({ ...auditForm, checked_notebooks: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Red-Pen Feedback (1 to 5 Stars) *</label>
                  <select
                    value={auditForm.red_pen_feedback_score}
                    onChange={(e) => setAuditForm({ ...auditForm, red_pen_feedback_score: parseInt(e.target.value) || 5 })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-amber-600"
                  >
                    <option value={5}>⭐⭐⭐⭐⭐ 5 - Exceptional Detailed Feedback</option>
                    <option value={4}>⭐⭐⭐⭐ 4 - Good Corrections & Remarks</option>
                    <option value={3}>⭐⭐⭐ 3 - Satisfactory (Tick-only)</option>
                    <option value={2}>⭐⭐ 2 - Sparse / Irregular Checks</option>
                    <option value={1}>⭐ 1 - Unchecked / Neglected</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Audit Date *</label>
                  <input
                    type="date"
                    required
                    value={auditForm.audit_date}
                    onChange={(e) => setAuditForm({ ...auditForm, audit_date: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Auditor Remarks / Feedback to Teacher</label>
                <textarea
                  rows={2}
                  value={auditForm.notes}
                  onChange={(e) => setAuditForm({ ...auditForm, notes: e.target.value })}
                  placeholder="Notes on handwriting, notebook neatness, and corrections..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="parent_sig_ver"
                  checked={auditForm.parent_signature_verified}
                  onChange={(e) => setAuditForm({ ...auditForm, parent_signature_verified: e.target.checked })}
                  className="rounded text-emerald-600"
                />
                <label htmlFor="parent_sig_ver" className="text-slate-700 font-semibold cursor-pointer">
                  Parent countersignature verified on test papers / diary
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAuditModal(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingAudit}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-bold shadow disabled:opacity-50"
                >
                  {submittingAudit ? 'Saving Audit...' : 'Save Notebook Audit'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
