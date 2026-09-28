import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Clock,
  Calendar,
  BookOpen,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  Plus,
  CheckSquare,
  Users,
  Award,
  ChevronRight,
  ArrowRight,
  ShieldCheck,
  CalendarCheck,
  Coffee,
  School,
  RefreshCw,
  Send,
  ClipboardList,
  Layers,
  X,
  Trash2,
} from 'lucide-react';
import api from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { useTenant } from '../../context/TenantContext';

export const TeacherCockpit = () => {
  const { user } = useAuth();
  const { settings } = useTenant();
  const navigate = useNavigate();

  const [cockpitData, setCockpitData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  // Module 2: Tomorrow's Learning Dispatch State
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const defaultTomorrowStr = tomorrow.toISOString().split('T')[0];

  const [classesList, setClassesList] = useState([]);
  const [subjectsList, setSubjectsList] = useState([]);
  const [tomorrowsPlans, setTomorrowsPlans] = useState([]);
  const [showPlanModal, setShowPlanModal] = useState(false);
  const [submittingPlan, setSubmittingPlan] = useState(false);
  const [selectedPlanClassId, setSelectedPlanClassId] = useState('');
  const [selectedPlanSectionId, setSelectedPlanSectionId] = useState('');
  const [planForm, setPlanForm] = useState({
    class_id: '',
    section_id: '',
    subject_id: '',
    teaching_date: defaultTomorrowStr,
    topic_name: '',
    learning_objectives: '',
    materials_required: '',
    homework_preview: '',
    is_published: true,
  });

  const fetchCockpit = async (isManual = false) => {
    if (isManual) setRefreshing(true);
    try {
      const res = await api.get('/academics/teacher-cockpit');
      setCockpitData(res.data || res);
      setError('');
    } catch (err) {
      console.error('Failed to load teacher cockpit:', err);
      setError('Failed to fetch cockpit dashboard. Please try refreshing.');
    } finally {
      setLoading(false);
      if (isManual) setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchCockpit();
    const interval = setInterval(() => fetchCockpit(), 60000);
    return () => clearInterval(interval);
  }, []);

  // Fetch Classes & Subjects for Tomorrow's Learning
  useEffect(() => {
    const fetchDropdowns = async () => {
      try {
        const [cRes, sRes] = await Promise.all([
          api.get('/academics/classes'),
          api.get('/academics/subjects'),
        ]);
        if (cRes.data && cRes.data.length > 0) {
          setClassesList(cRes.data);
          setSelectedPlanClassId(cRes.data[0].id);
          if (cRes.data[0].sections && cRes.data[0].sections.length > 0) {
            setSelectedPlanSectionId(cRes.data[0].sections[0].id);
          }
        }
        if (sRes.data) setSubjectsList(sRes.data);
      } catch (e) {
        console.error('Error loading classes/subjects for learning dispatch:', e);
      }
    };
    fetchDropdowns();
  }, []);

  const fetchTomorrowsPlans = async (cId, sId) => {
    if (!cId || !sId) return;
    try {
      const res = await api.get(`/academics/tomorrows-learning/class/${cId}/${sId}`);
      const data = res?.data?.data || res?.data || [];
      setTomorrowsPlans(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error('Error fetching tomorrow learning plans:', e);
    }
  };

  useEffect(() => {
    if (selectedPlanClassId && selectedPlanSectionId) {
      fetchTomorrowsPlans(selectedPlanClassId, selectedPlanSectionId);
    }
  }, [selectedPlanClassId, selectedPlanSectionId]);

  const handlePlanClassChange = (cId) => {
    setSelectedPlanClassId(cId);
    const cls = classesList.find((c) => c.id === cId);
    if (cls && cls.sections && cls.sections.length > 0) {
      setSelectedPlanSectionId(cls.sections[0].id);
    } else {
      setSelectedPlanSectionId('');
    }
  };

  const handleSavePlan = async (e) => {
    e.preventDefault();
    setSubmittingPlan(true);
    try {
      await api.post('/academics/tomorrows-learning', {
        ...planForm,
        class_id: planForm.class_id || selectedPlanClassId,
        section_id: planForm.section_id || selectedPlanSectionId,
      });
      setShowPlanModal(false);
      setPlanForm({
        class_id: selectedPlanClassId,
        section_id: selectedPlanSectionId,
        subject_id: subjectsList[0]?.id || '',
        teaching_date: defaultTomorrowStr,
        topic_name: '',
        learning_objectives: '',
        materials_required: '',
        homework_preview: '',
        is_published: true,
      });
      fetchTomorrowsPlans(selectedPlanClassId, selectedPlanSectionId);
    } catch (err) {
      alert('Failed to save learning plan: ' + (err.response?.data?.message || err.message));
    } finally {
      setSubmittingPlan(false);
    }
  };

  const handleDeletePlan = async (planId) => {
    if (!window.confirm('Are you sure you want to withdraw this advance learning plan?')) return;
    try {
      await api.delete(`/academics/tomorrows-learning/${planId}`);
      fetchTomorrowsPlans(selectedPlanClassId, selectedPlanSectionId);
    } catch (err) {
      alert('Failed to delete plan: ' + (err.response?.data?.message || err.message));
    }
  };

  if (loading) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center p-8 space-y-3">
        <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">
          Loading Teacher Cockpit & Live Schedule...
        </p>
      </div>
    );
  }

  const currentPeriod = cockpitData?.current_period;
  const isTeachingNow = currentPeriod?.teaching_slot;
  const classTeacherSections = cockpitData?.class_teacher_sections || [];
  const todaySchedule = cockpitData?.today_schedule || [];
  const recentHomework = cockpitData?.recent_homework || [];

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* 1. Header Banner */}
      <div className="bg-gradient-to-r from-blue-700 via-indigo-700 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 translate-x-12 -translate-y-12 w-64 h-64 bg-white/5 rounded-full blur-2xl pointer-events-none"></div>

        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md text-blue-200 text-xs font-semibold">
              <Sparkles size={14} className="text-amber-400" />
              <span>Teacher Academic Command Cockpit</span>
              {cockpitData?.employee_id && (
                <span className="bg-white/20 px-2 py-0.2 rounded-full font-mono text-[10px]">
                  Emp #{cockpitData.employee_id}
                </span>
              )}
            </div>

            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
              Welcome back, {cockpitData?.teacher_name || user?.username}!
            </h1>

            <p className="text-xs sm:text-sm text-blue-100 flex flex-wrap items-center gap-3">
              <span className="flex items-center gap-1.5 font-medium">
                <Calendar size={15} className="text-blue-300" />
                {cockpitData?.today_day}, {cockpitData?.today_date}
              </span>
              <span>•</span>
              <span className="flex items-center gap-1.5 font-medium">
                <School size={15} className="text-blue-300" />
                {settings.school_name || 'Academic Institution'}
              </span>
            </p>
          </div>

          <div className="flex items-center gap-2 self-stretch sm:self-auto">
            <button
              onClick={() => fetchCockpit(true)}
              disabled={refreshing}
              className="px-4 py-2.5 bg-white/10 hover:bg-white/20 backdrop-blur-md rounded-xl text-xs font-bold text-white flex items-center justify-center gap-2 transition-all border border-white/10 shadow-sm"
              title="Refresh Cockpit Radar"
            >
              <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
              <span>{refreshing ? 'Syncing...' : 'Sync Radar'}</span>
            </button>
            <button
              onClick={() => navigate('/academics?tab=homework')}
              className="px-5 py-2.5 bg-blue-500 hover:bg-blue-400 text-white rounded-xl text-xs font-bold shadow-lg shadow-blue-500/30 flex items-center justify-center gap-2 transition-all"
            >
              <Plus size={15} />
              <span>Assign Homework</span>
            </button>
          </div>
        </div>

        {/* Live Period Banner */}
        <div className="mt-6 pt-5 border-t border-white/15 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="relative flex h-3.5 w-3.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-emerald-500"></span>
            </span>

            {currentPeriod ? (
              isTeachingNow ? (
                <div className="text-xs">
                  <span className="font-bold text-emerald-300 uppercase tracking-wider text-[11px] mr-2">
                    Live Now • {currentPeriod.name} ({currentPeriod.start_time} - {currentPeriod.end_time})
                  </span>
                  <span className="font-extrabold text-white">
                    {isTeachingNow.class_name} ({isTeachingNow.section_name}) — {isTeachingNow.subject_name}
                  </span>
                  {isTeachingNow.room_number && (
                    <span className="text-blue-200 ml-2 font-medium">Room {isTeachingNow.room_number}</span>
                  )}
                </div>
              ) : currentPeriod.is_break ? (
                <div className="text-xs font-semibold text-amber-300 flex items-center gap-1.5">
                  <Coffee size={14} /> Recess / Break Time in Progress ({currentPeriod.start_time} - {currentPeriod.end_time})
                </div>
              ) : (
                <div className="text-xs font-medium text-blue-200">
                  Current Period ({currentPeriod.name}): Free Period (No teaching assignment scheduled)
                </div>
              )
            ) : (
              <div className="text-xs font-medium text-blue-200">
                School Routine Inactive or Outside Bell Timings
              </div>
            )}
          </div>

          <div className="flex items-center gap-4 text-xs font-medium text-blue-200">
            <span>
              Classes Today: <strong className="text-white">{cockpitData?.total_classes_today || 0}</strong>
            </span>
            <span>•</span>
            <span>
              Pending Reviews: <strong className="text-amber-300">{cockpitData?.total_pending_grading || 0}</strong>
            </span>
          </div>
        </div>
      </div>

      {/* 2. Class Teacher Alert Cards */}
      {classTeacherSections.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-2">
            <ShieldCheck size={16} className="text-blue-600" />
            <span>Class Teacher Duty Status</span>
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {classTeacherSections.map((cts) => (
              <div
                key={`${cts.class_id}-${cts.section_id}`}
                className={`p-5 rounded-2xl border transition-all ${
                  cts.attendance_marked
                    ? 'bg-emerald-50/40 border-emerald-200'
                    : 'bg-amber-50/80 border-amber-300 shadow-sm'
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1">
                    <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-white border border-slate-200 text-slate-700">
                      Assigned Class Teacher
                    </span>
                    <h3 className="text-base font-extrabold text-slate-900">
                      {cts.class_name} — Section {cts.section_name}
                    </h3>
                    <p className="text-xs text-slate-600">
                      {cts.attendance_marked
                        ? "✅ Today's student attendance has been recorded and submitted."
                        : "⚠️ Today's student attendance is pending! Please take attendance for your class roster."}
                    </p>
                  </div>

                  <div className="flex flex-col sm:flex-row items-end sm:items-center gap-2">
                    {cts.attendance_marked ? (
                      <button
                        onClick={() => navigate('/attendance?tab=roster')}
                        className="px-3 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all"
                      >
                        <CalendarCheck size={14} /> Attendance
                      </button>
                    ) : (
                      <button
                        onClick={() => navigate('/attendance?tab=roster')}
                        className="px-3.5 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md shadow-amber-600/20 transition-all animate-pulse"
                      >
                        <CalendarCheck size={14} /> Mark Attendance
                      </button>
                    )}

                    <button
                      onClick={() => navigate('/attendance?tab=habits')}
                      className="px-3.5 py-2 bg-gradient-to-r from-amber-600 to-indigo-600 hover:from-amber-500 hover:to-indigo-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all"
                    >
                      <Sparkles size={14} className="text-amber-200" />
                      <span>9-Point Habits</span>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 3. Today's Teaching Schedule Radar */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-2">
            <Clock size={16} className="text-blue-600" />
            <span>Today's Daily Bell Schedule & Periods ({cockpitData?.today_day})</span>
          </h2>
          <button
            onClick={() => navigate('/academics/timetable')}
            className="text-xs text-blue-600 hover:text-blue-700 font-bold flex items-center gap-1"
          >
            <span>Full Weekly Timetable</span>
            <ChevronRight size={14} />
          </button>
        </div>

        {todaySchedule.length === 0 ? (
          <div className="bg-white p-8 rounded-2xl border border-slate-200 text-center text-xs text-slate-400">
            No bell periods configured yet for the school. Configure in Timetable & Syllabus Hub.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
            {todaySchedule.map((period) => {
              const slot = period.teaching_slot;
              const isNow = period.is_active_now;
              const isBreak = period.is_break;

              return (
                <div
                  key={period.period_id}
                  className={`p-4 rounded-2xl border transition-all flex flex-col justify-between min-h-[140px] ${
                    isNow
                      ? 'border-blue-500 bg-blue-50/50 shadow-md ring-2 ring-blue-500/20'
                      : isBreak
                      ? 'border-amber-200 bg-amber-50/30'
                      : slot
                      ? 'border-slate-200 bg-white hover:border-slate-300 shadow-sm'
                      : 'border-slate-100 bg-slate-50/50 text-slate-400'
                  }`}
                >
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs text-slate-900">{period.name}</span>
                      {isNow && (
                        <span className="px-2 py-0.5 rounded-full bg-blue-600 text-white font-extrabold text-[9px] uppercase tracking-wider">
                          Now
                        </span>
                      )}
                    </div>

                    <div className="font-mono text-[10px] text-slate-400 font-medium">
                      {period.start_time} - {period.end_time}
                    </div>

                    {isBreak ? (
                      <div className="pt-2 text-xs font-bold text-amber-700 flex items-center gap-1.5">
                        <Coffee size={14} /> Recess / Break
                      </div>
                    ) : slot ? (
                      <div className="pt-1 space-y-1">
                        <div className="font-bold text-slate-900 text-xs">{slot.subject_name}</div>
                        <div className="text-[11px] font-semibold text-blue-700">
                          {slot.class_name} ({slot.section_name})
                        </div>
                        {slot.room_number && (
                          <div className="text-[10px] text-slate-500">Room: {slot.room_number}</div>
                        )}
                      </div>
                    ) : (
                      <div className="pt-3 text-[11px] font-semibold text-slate-400 italic">
                        Free Period
                      </div>
                    )}
                  </div>

                  {slot && (
                    <div className="pt-3 border-t border-slate-100/80 mt-2">
                      <span className="text-[10px] font-bold text-blue-600 uppercase">Scheduled</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 4. Homework & Daily Assignments Station */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-2">
              <BookOpen size={16} className="text-blue-600" />
              <span>My Active Homework & Assignments</span>
            </h2>
            {cockpitData?.total_pending_grading > 0 && (
              <span className="px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[10px] font-bold">
                {cockpitData.total_pending_grading} Awaiting Review
              </span>
            )}
          </div>

          <button
            onClick={() => navigate('/academics?tab=homework')}
            className="text-xs text-blue-600 hover:text-blue-700 font-bold flex items-center gap-1"
          >
            <span>Manage All Homework</span>
            <ChevronRight size={14} />
          </button>
        </div>

        {recentHomework.length === 0 ? (
          <div className="bg-white p-8 rounded-2xl border border-slate-200 text-center space-y-3">
            <p className="text-xs text-slate-400">You haven't assigned any homework recently.</p>
            <button
              onClick={() => navigate('/academics?tab=homework')}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold shadow transition-all inline-flex items-center gap-1.5"
            >
              <Plus size={14} /> Assign Daily Homework
            </button>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden divide-y divide-slate-100 text-xs">
            {recentHomework.map((hw) => {
              const pendingReview = Math.max(0, hw.submission_count - hw.reviewed_count);

              return (
                <div
                  key={hw.id}
                  className="p-4 hover:bg-slate-50/70 transition-colors flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 font-bold text-[10px]">
                        {hw.subject_name}
                      </span>
                      <span className="font-semibold text-slate-500 text-[11px]">
                        {hw.class_name} ({hw.section_name})
                      </span>
                      <h4 className="font-bold text-slate-900 text-sm">{hw.title}</h4>
                    </div>
                    {hw.description && (
                      <p className="text-slate-600 text-xs line-clamp-1">{hw.description}</p>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-3 self-end md:self-auto shrink-0">
                    <div className="text-[11px] text-slate-400">
                      Due: <strong className="text-slate-700">{hw.due_date}</strong>
                    </div>

                    <div className="flex items-center gap-1.5 bg-slate-100 px-3 py-1 rounded-xl text-xs font-semibold text-slate-700">
                      <span>{hw.submission_count} Submitted</span>
                      <span>•</span>
                      <span className="text-emerald-700 font-bold">{hw.reviewed_count} Graded</span>
                    </div>

                    {pendingReview > 0 && (
                      <span className="px-2.5 py-1 rounded-xl bg-amber-100 text-amber-800 text-[11px] font-bold">
                        {pendingReview} to Grade
                      </span>
                    )}

                    <button
                      onClick={() => navigate('/academics?tab=homework')}
                      className="px-3.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors shadow-sm"
                    >
                      <CheckSquare size={13} />
                      <span>Review Submissions</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 5. Module 2: Tomorrow's Learning Dispatch (90-Second Advance Lesson Planner) */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
        <div className="border-b border-slate-100 pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <ClipboardList size={18} className="text-indigo-600" />
              <h3 className="font-bold text-slate-900 text-sm">Tomorrow's Learning Dispatch (Advance Planner)</h3>
              <span className="px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 text-[10px] font-black uppercase tracking-wider">
                90-SEC DISPATCH
              </span>
            </div>
            <p className="text-xs text-slate-500">
              Publish tomorrow's topics, materials checklist, and objectives so parents & students come prepared.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <select
              value={selectedPlanClassId}
              onChange={(e) => handlePlanClassChange(e.target.value)}
              className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700"
            >
              {classesList.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>

            {classesList.find((c) => c.id === selectedPlanClassId)?.sections?.length > 0 && (
              <select
                value={selectedPlanSectionId}
                onChange={(e) => setSelectedPlanSectionId(e.target.value)}
                className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700"
              >
                {classesList.find((c) => c.id === selectedPlanClassId).sections.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            )}

            <button
              onClick={() => {
                setPlanForm({
                  class_id: selectedPlanClassId,
                  section_id: selectedPlanSectionId,
                  subject_id: subjectsList[0]?.id || '',
                  teaching_date: defaultTomorrowStr,
                  topic_name: '',
                  learning_objectives: '',
                  materials_required: '',
                  homework_preview: '',
                  is_published: true,
                });
                setShowPlanModal(true);
              }}
              className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow transition-all"
            >
              <Plus size={14} />
              <span>Dispatch Lesson</span>
            </button>
          </div>
        </div>

        {tomorrowsPlans.length === 0 ? (
          <div className="p-6 text-center text-xs text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200 space-y-2">
            <div>No advance learning plans dispatched yet for {classesList.find(c => c.id === selectedPlanClassId)?.name || 'this class'} on tomorrow ({defaultTomorrowStr}).</div>
            <button
              onClick={() => {
                setPlanForm({
                  class_id: selectedPlanClassId,
                  section_id: selectedPlanSectionId,
                  subject_id: subjectsList[0]?.id || '',
                  teaching_date: defaultTomorrowStr,
                  topic_name: '',
                  learning_objectives: '',
                  materials_required: '',
                  homework_preview: '',
                  is_published: true,
                });
                setShowPlanModal(true);
              }}
              className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-lg text-xs font-bold inline-flex items-center gap-1"
            >
              <Plus size={13} />
              <span>Click to Dispatch in 90 Seconds</span>
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {tomorrowsPlans.map((plan) => (
              <div
                key={plan.id}
                className="p-4 rounded-xl border border-indigo-100 bg-gradient-to-br from-indigo-50/40 to-white shadow-sm space-y-2 flex flex-col justify-between"
              >
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="px-2.5 py-0.5 rounded-full bg-indigo-600 text-white font-black text-[10px]">
                      {plan.subject_name || 'Subject'}
                    </span>
                    <button
                      onClick={() => handleDeletePlan(plan.id)}
                      className="text-slate-400 hover:text-rose-600 transition-colors p-1"
                      title="Withdraw Plan"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>

                  <h4 className="font-bold text-slate-900 text-sm">
                    {plan.topic_name}
                  </h4>

                  {plan.learning_objectives && (
                    <div className="text-xs text-slate-600">
                      <strong className="text-slate-700 font-semibold">Objectives:</strong> {plan.learning_objectives}
                    </div>
                  )}

                  {plan.materials_required && (
                    <div className="text-[11px] bg-amber-50 border border-amber-200 text-amber-900 p-2 rounded-lg font-medium">
                      🎒 <strong>Bring to Class:</strong> {plan.materials_required}
                    </div>
                  )}

                  {plan.homework_preview && (
                    <div className="text-[11px] text-slate-500">
                      📝 <strong>Preview:</strong> {plan.homework_preview}
                    </div>
                  )}
                </div>

                <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-400">
                  <span>Date: <strong className="text-slate-700">{plan.teaching_date}</strong></span>
                  <span className="text-emerald-700 font-bold flex items-center gap-1">
                    <CheckCircle2 size={11} /> Published to Parents
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 6. Quick Shortcuts & Operations Dock */}
      <div className="space-y-3">
        <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-2">
          <Sparkles size={16} className="text-blue-600" />
          <span>Faculty Quick Utilities</span>
        </h2>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div
            onClick={() => navigate('/attendance')}
            className="p-4 bg-white hover:bg-slate-50 border border-slate-200 rounded-2xl shadow-sm cursor-pointer transition-all flex items-center gap-3 group"
          >
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center group-hover:scale-110 transition-transform">
              <CalendarCheck size={20} />
            </div>
            <div>
              <div className="font-bold text-xs text-slate-900">Take Attendance</div>
              <div className="text-[10px] text-slate-400">Daily roster marker</div>
            </div>
          </div>

          <div
            onClick={() => navigate('/academics?tab=homework')}
            className="p-4 bg-white hover:bg-slate-50 border border-slate-200 rounded-2xl shadow-sm cursor-pointer transition-all flex items-center gap-3 group"
          >
            <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center group-hover:scale-110 transition-transform">
              <BookOpen size={20} />
            </div>
            <div>
              <div className="font-bold text-xs text-slate-900">Homework Hub</div>
              <div className="text-[10px] text-slate-400">Assignments & notes</div>
            </div>
          </div>

          <div
            onClick={() => navigate('/development')}
            className="p-4 bg-white hover:bg-slate-50 border border-slate-200 rounded-2xl shadow-sm cursor-pointer transition-all flex items-center gap-3 group"
          >
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Award size={20} />
            </div>
            <div>
              <div className="font-bold text-xs text-slate-900">Awards & Merits</div>
              <div className="text-[10px] text-slate-400">Student recognition</div>
            </div>
          </div>

          <div
            onClick={() => navigate('/academics/timetable')}
            className="p-4 bg-white hover:bg-slate-50 border border-slate-200 rounded-2xl shadow-sm cursor-pointer transition-all flex items-center gap-3 group"
          >
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Clock size={20} />
            </div>
            <div>
              <div className="font-bold text-xs text-slate-900">Weekly Schedule</div>
              <div className="text-[10px] text-slate-400">Timetable radar</div>
            </div>
          </div>
        </div>
      </div>

      {/* Modal: Tomorrow's Learning Dispatch (90-Second Planner) */}
      {showPlanModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-lg w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <ClipboardList size={18} className="text-indigo-600" />
                <h3 className="font-bold text-slate-900 text-sm">Tomorrow's Learning Dispatch (90-Sec Planner)</h3>
              </div>
              <button onClick={() => setShowPlanModal(false)} className="text-slate-400 hover:text-slate-600">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSavePlan} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Subject *</label>
                  <select
                    required
                    value={planForm.subject_id}
                    onChange={(e) => setPlanForm({ ...planForm, subject_id: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold"
                  >
                    <option value="">-- Choose Subject --</option>
                    {subjectsList.map((s) => (
                      <option key={s.id} value={s.id}>{s.name} ({s.code})</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Teaching Date *</label>
                  <input
                    type="date"
                    required
                    value={planForm.teaching_date}
                    onChange={(e) => setPlanForm({ ...planForm, teaching_date: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Chapter / Topic Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Chapter 4: Fractions & Decimals / Photosynthesis"
                  value={planForm.topic_name}
                  onChange={(e) => setPlanForm({ ...planForm, topic_name: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Key Learning Objectives</label>
                <textarea
                  rows={2}
                  placeholder="What will students learn and practice tomorrow?"
                  value={planForm.learning_objectives}
                  onChange={(e) => setPlanForm({ ...planForm, learning_objectives: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                />
              </div>

              <div>
                <label className="block text-amber-800 font-semibold mb-1">🎒 Required Materials Checklist (Parents Alert)</label>
                <input
                  type="text"
                  placeholder="e.g. Geometry Box, Graph Paper, 30cm Ruler, Chart Paper"
                  value={planForm.materials_required}
                  onChange={(e) => setPlanForm({ ...planForm, materials_required: e.target.value })}
                  className="w-full px-3 py-2 bg-amber-50/60 border border-amber-200 rounded-lg text-xs font-medium text-amber-900"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Advance Homework / Read Preview</label>
                <input
                  type="text"
                  placeholder="e.g. Read Textbook pages 45 to 48 in advance"
                  value={planForm.homework_preview}
                  onChange={(e) => setPlanForm({ ...planForm, homework_preview: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowPlanModal(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingPlan}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-bold shadow disabled:opacity-50 flex items-center gap-1.5"
                >
                  <Send size={13} />
                  <span>{submittingPlan ? 'Dispatching...' : 'Publish to Parent Portal'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

