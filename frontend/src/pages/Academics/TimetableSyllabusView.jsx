import React, { useState, useEffect } from 'react';
import {
  Calendar,
  Clock,
  BookOpen,
  User,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  Printer,
  ChevronRight,
  Plus,
  Trash2,
  Edit3,
  Copy,
  RefreshCw,
  Layers,
  ShieldAlert,
  ArrowRight,
  X,
  Radio,
  DoorOpen,
} from 'lucide-react';
import api from '../../api/client';

// Days of academic week
const DAYS = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];

// Helper: Format 24h time '08:30:00' to '08:30 AM'
const formatTime = (timeStr) => {
  if (!timeStr) return '';
  const parts = timeStr.split(':');
  let h = parseInt(parts[0], 10);
  const m = parts[1] || '00';
  const ampm = h >= 12 ? 'PM' : 'AM';
  h = h % 12 || 12;
  return `${h}:${m} ${ampm}`;
};

// Helper: Duration in minutes
const getDurationMinutes = (startTime, endTime) => {
  if (!startTime || !endTime) return 0;
  const [sH, sM] = startTime.split(':').map(Number);
  const [eH, eM] = endTime.split(':').map(Number);
  return eH * 60 + eM - (sH * 60 + sM);
};

export const TimetableSyllabusView = () => {
  // Navigation Tabs: CLASS_TIMETABLE | TEACHER_SCHEDULE | PERIOD_MASTER | SYLLABUS
  const [activeTab, setActiveTab] = useState('CLASS_TIMETABLE');

  // Academic Structure State
  const [classes, setClasses] = useState([]);
  const [selectedClassId, setSelectedClassId] = useState('');
  const [selectedSectionId, setSelectedSectionId] = useState('');
  const [teachersList, setTeachersList] = useState([]);

  // Class Timetable Data State
  const [timetableData, setTimetableData] = useState({
    academic_year_id: null,
    periods: [],
    slots: [],
    mapped_subjects: [],
  });
  const [loadingTimetable, setLoadingTimetable] = useState(false);
  const [statusMessage, setStatusMessage] = useState({ type: '', text: '' });

  // Slot Modal State
  const [showSlotModal, setShowSlotModal] = useState(false);
  const [slotModalData, setSlotModalData] = useState({
    slotId: null,
    day: 'MONDAY',
    period: null,
    subjectId: '',
    teacherUserId: '',
    roomNumber: '',
  });
  const [slotModalError, setSlotModalError] = useState('');
  const [savingSlot, setSavingSlot] = useState(false);

  // Copy Timetable Modal State
  const [showCopyModal, setShowCopyModal] = useState(false);
  const [copyTargetClassId, setCopyTargetClassId] = useState('');
  const [copyTargetSectionId, setCopyTargetSectionId] = useState('');
  const [copyOverwrite, setCopyOverwrite] = useState(true);
  const [copyingTimetable, setCopyingTimetable] = useState(false);
  const [copyError, setCopyError] = useState('');

  // Period Master State
  const [periodList, setPeriodList] = useState([]);
  const [loadingPeriods, setLoadingPeriods] = useState(false);
  const [showPeriodModal, setShowPeriodModal] = useState(false);
  const [periodForm, setPeriodForm] = useState({
    id: null,
    period_number: 1,
    name: 'Period 1',
    start_time: '08:30',
    end_time: '09:15',
    is_break: false,
    sort_order: 1,
  });
  const [periodFormError, setPeriodFormError] = useState('');
  const [savingPeriod, setSavingPeriod] = useState(false);

  // Teacher Schedule Radar State
  const [selectedTeacherUserId, setSelectedTeacherUserId] = useState('');
  const [teacherScheduleData, setTeacherScheduleData] = useState(null);
  const [loadingTeacherSchedule, setLoadingTeacherSchedule] = useState(false);

  // Auto-dismiss status toast after 5s
  useEffect(() => {
    if (statusMessage.text) {
      const t = setTimeout(() => setStatusMessage({ type: '', text: '' }), 5000);
      return () => clearTimeout(t);
    }
  }, [statusMessage]);

  // 1. Initial Load: Fetch Classes and Teachers
  useEffect(() => {
    const initData = async () => {
      try {
        const [clsRes, tchRes] = await Promise.all([
          api.get('/academics/classes'),
          api.get('/academics/teachers').catch(() => ({ data: [] })),
        ]);

        if (clsRes.data && clsRes.data.length > 0) {
          setClasses(clsRes.data);
          const firstClass = clsRes.data[0];
          setSelectedClassId(firstClass.id);
          if (firstClass.sections && firstClass.sections.length > 0) {
            setSelectedSectionId(firstClass.sections[0].id);
          }
        }

        if (tchRes.data && tchRes.data.length > 0) {
          setTeachersList(tchRes.data);
          setSelectedTeacherUserId(tchRes.data[0].user_id);
        }
      } catch (err) {
        console.error('Error fetching academic setup:', err);
        setStatusMessage({ type: 'error', text: 'Failed to load classes or teachers.' });
      }
    };
    initData();
  }, []);

  // Update Section when Class changes
  const handleClassChange = (classId) => {
    setSelectedClassId(classId);
    const cls = classes.find((c) => c.id === classId);
    if (cls && cls.sections && cls.sections.length > 0) {
      setSelectedSectionId(cls.sections[0].id);
    } else {
      setSelectedSectionId('');
    }
  };

  // 2. Fetch Class-Section Timetable
  const fetchTimetable = async (cId, sId) => {
    const classIdToUse = cId || selectedClassId;
    const sectionIdToUse = sId || selectedSectionId;
    if (!classIdToUse || !sectionIdToUse) return;

    setLoadingTimetable(true);
    try {
      const res = await api.get(`/academics/timetable/classes/${classIdToUse}/sections/${sectionIdToUse}`);
      if (res.data) {
        setTimetableData(res.data);
        setPeriodList(res.data.periods || []);
      }
    } catch (err) {
      console.error('Error fetching timetable:', err);
      setStatusMessage({ type: 'error', text: err.response?.data?.detail || 'Could not load timetable schedule.' });
    } finally {
      setLoadingTimetable(false);
    }
  };

  useEffect(() => {
    if (selectedClassId && selectedSectionId) {
      fetchTimetable(selectedClassId, selectedSectionId);
    }
  }, [selectedClassId, selectedSectionId]);

  // 3. Fetch Standalone Periods for Period Master tab
  const fetchPeriods = async () => {
    setLoadingPeriods(true);
    try {
      const res = await api.get('/academics/timetable/periods');
      if (res.data) {
        setPeriodList(res.data);
      }
    } catch (err) {
      console.error('Error fetching periods:', err);
    } finally {
      setLoadingPeriods(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'PERIOD_MASTER') {
      fetchPeriods();
    }
  }, [activeTab]);

  // 4. Fetch Teacher Schedule Radar
  const fetchTeacherSchedule = async (teacherUserId) => {
    if (!teacherUserId) return;
    setLoadingTeacherSchedule(true);
    try {
      const res = await api.get(`/academics/timetable/teachers/${teacherUserId}`);
      if (res.data) {
        setTeacherScheduleData(res.data);
      }
    } catch (err) {
      console.error('Error loading teacher schedule:', err);
      setStatusMessage({ type: 'error', text: 'Failed to load teacher schedule routine.' });
    } finally {
      setLoadingTeacherSchedule(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'TEACHER_SCHEDULE' && selectedTeacherUserId) {
      fetchTeacherSchedule(selectedTeacherUserId);
    }
  }, [activeTab, selectedTeacherUserId]);

  // 5. Apply Standard 6-Period Template Action
  const handleApplyTemplate = async () => {
    if (!window.confirm('Apply standard 6-period + recess daily bell schedule?')) return;
    try {
      const res = await api.post('/academics/timetable/periods/apply-template');
      setStatusMessage({ type: 'success', text: res.message || 'Standard 6-period bell schedule applied successfully!' });
      await fetchTimetable(selectedClassId, selectedSectionId);
      await fetchPeriods();
    } catch (err) {
      setStatusMessage({ type: 'error', text: err.response?.data?.detail || 'Failed to apply bell schedule template.' });
    }
  };

  // 6. Open Slot Modal for Add / Edit
  const handleOpenSlotModal = (day, period, existingSlot = null) => {
    setSlotModalError('');
    if (existingSlot) {
      setSlotModalData({
        slotId: existingSlot.id,
        day: existingSlot.day_of_week,
        period: period,
        subjectId: existingSlot.subject_id,
        teacherUserId: existingSlot.teacher_user_id,
        roomNumber: existingSlot.room_number || '',
      });
    } else {
      const defaultSubjectId = timetableData.mapped_subjects?.[0]?.id || '';
      const defaultTeacherUserId = teachersList?.[0]?.user_id || '';
      setSlotModalData({
        slotId: null,
        day: day,
        period: period,
        subjectId: defaultSubjectId,
        teacherUserId: defaultTeacherUserId,
        roomNumber: '',
      });
    }
    setShowSlotModal(true);
  };

  // 7. Save Slot (Curriculum & Anti-Clash Protected)
  const handleSaveSlot = async (e) => {
    e.preventDefault();
    if (!slotModalData.subjectId) {
      setSlotModalError('Please select a subject from the mapped curriculum.');
      return;
    }
    if (!slotModalData.teacherUserId) {
      setSlotModalError('Please select a teacher.');
      return;
    }

    setSavingSlot(true);
    setSlotModalError('');

    try {
      await api.post('/academics/timetable/slots', {
        academic_year_id: timetableData.academic_year_id,
        class_id: selectedClassId,
        section_id: selectedSectionId,
        day_of_week: slotModalData.day,
        period_id: slotModalData.period.id,
        subject_id: slotModalData.subjectId,
        teacher_user_id: slotModalData.teacherUserId,
        room_number: slotModalData.roomNumber || null,
      });

      setShowSlotModal(false);
      setStatusMessage({ type: 'success', text: `Timetable slot saved for ${slotModalData.day} (${slotModalData.period.name}).` });
      fetchTimetable(selectedClassId, selectedSectionId);
    } catch (err) {
      const msg = err.response?.data?.detail || 'Failed to save timetable slot.';
      setSlotModalError(msg);
    } finally {
      setSavingSlot(false);
    }
  };

  // 8. Delete / Clear Slot (Back to Free Period)
  const handleClearSlot = async (slotId, slotName) => {
    if (!window.confirm(`Clear ${slotName || 'this slot'} back to Free Period?`)) return;
    try {
      await api.delete(`/academics/timetable/slots/${slotId}`);
      setStatusMessage({ type: 'success', text: 'Slot cleared back to Free Period.' });
      fetchTimetable(selectedClassId, selectedSectionId);
    } catch (err) {
      setStatusMessage({ type: 'error', text: err.response?.data?.detail || 'Failed to clear slot.' });
    }
  };

  // 9. Copy Timetable to Another Section
  const handleOpenCopyModal = () => {
    setCopyError('');
    const cls = classes.find((c) => c.id === selectedClassId);
    const otherSec = cls?.sections?.find((s) => s.id !== selectedSectionId);
    setCopyTargetClassId(selectedClassId);
    setCopyTargetSectionId(otherSec ? otherSec.id : '');
    setShowCopyModal(true);
  };

  const handleExecuteCopy = async (e) => {
    e.preventDefault();
    if (!copyTargetClassId || !copyTargetSectionId) {
      setCopyError('Please select a target class and section.');
      return;
    }
    if (copyTargetClassId === selectedClassId && copyTargetSectionId === selectedSectionId) {
      setCopyError('Target section cannot be the same as source section.');
      return;
    }

    setCopyingTimetable(true);
    setCopyError('');

    try {
      const res = await api.post('/academics/timetable/copy', {
        academic_year_id: timetableData.academic_year_id,
        source_class_id: selectedClassId,
        source_section_id: selectedSectionId,
        target_class_id: copyTargetClassId,
        target_section_id: copyTargetSectionId,
        overwrite: copyOverwrite,
      });
      setShowCopyModal(false);
      setStatusMessage({ type: 'success', text: res.message || 'Timetable duplicated successfully!' });
    } catch (err) {
      setCopyError(err.response?.data?.detail || 'Copy failed due to conflict.');
    } finally {
      setCopyingTimetable(false);
    }
  };

  // 10. Period Master: Create / Update Period
  const handleSavePeriod = async (e) => {
    e.preventDefault();
    setSavingPeriod(true);
    setPeriodFormError('');

    try {
      if (periodForm.id) {
        await api.put(`/academics/timetable/periods/${periodForm.id}`, {
          period_number: periodForm.period_number,
          name: periodForm.name,
          start_time: periodForm.start_time,
          end_time: periodForm.end_time,
          is_break: periodForm.is_break,
          sort_order: periodForm.sort_order,
        });
        setStatusMessage({ type: 'success', text: `Period '${periodForm.name}' updated successfully.` });
      } else {
        await api.post('/academics/timetable/periods', {
          period_number: periodForm.period_number,
          name: periodForm.name,
          start_time: periodForm.start_time,
          end_time: periodForm.end_time,
          is_break: periodForm.is_break,
          sort_order: periodForm.sort_order || periodForm.period_number,
        });
        setStatusMessage({ type: 'success', text: `Period '${periodForm.name}' added to bell schedule.` });
      }
      setShowPeriodModal(false);
      fetchPeriods();
      fetchTimetable(selectedClassId, selectedSectionId);
    } catch (err) {
      setPeriodFormError(err.response?.data?.detail || 'Failed to save period.');
    } finally {
      setSavingPeriod(false);
    }
  };

  const handleDeletePeriod = async (pId, pName) => {
    if (!window.confirm(`Delete period '${pName}' from school bell schedule?`)) return;
    try {
      await api.delete(`/academics/timetable/periods/${pId}`);
      setStatusMessage({ type: 'success', text: `Period '${pName}' deleted successfully.` });
      fetchPeriods();
      fetchTimetable(selectedClassId, selectedSectionId);
    } catch (err) {
      setStatusMessage({ type: 'error', text: err.response?.data?.detail || 'Cannot delete period.' });
    }
  };

  // Current class and section objects
  const selectedClass = classes.find((c) => c.id === selectedClassId);
  const selectedSection = selectedClass?.sections?.find((s) => s.id === selectedSectionId);

  // Syllabus Speedometer Sample Data (Kept intact for Tab 4)
  const syllabusItems = [
    { subject: 'Mathematics', teacher: 'Prof. Farhan Khan', totalChapters: 12, completedChapters: 8, pct: 68, status: 'ON_TRACK', currentTopic: 'Linear Equations in One Variable' },
    { subject: 'Science & Physics', teacher: 'Mrs. Shabana Khan', totalChapters: 14, completedChapters: 5, pct: 38, status: 'BEHIND', currentTopic: 'Force and Pressure (Chapter 4)' },
    { subject: 'English Language', teacher: 'Mr. Tariq Siddiqui', totalChapters: 10, completedChapters: 7, pct: 74, status: 'ON_TRACK', currentTopic: 'Direct and Indirect Speech' },
    { subject: 'Social Science', teacher: 'Mrs. Pooja Deshmukh', totalChapters: 16, completedChapters: 10, pct: 62, status: 'ON_TRACK', currentTopic: 'Our Past: The Nationalist Movement' },
    { subject: 'Hindi / Urdu Literature', teacher: 'Mr. Zubair Ali', totalChapters: 12, completedChapters: 9, pct: 75, status: 'AHEAD', currentTopic: 'Prose & Ghazal Analysis' },
  ];

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {statusMessage.text && (
        <div
          className={`p-3.5 rounded-xl border flex items-center justify-between text-xs font-semibold shadow-sm animate-fade-in ${
            statusMessage.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-rose-50 border-rose-200 text-rose-800'
          }`}
        >
          <div className="flex items-center gap-2">
            {statusMessage.type === 'success' ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
            <span>{statusMessage.text}</span>
          </div>
          <button onClick={() => setStatusMessage({ type: '', text: '' })} className="hover:opacity-75">
            <X size={14} />
          </button>
        </div>
      )}

      {/* Header & Tab Selector */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 print:hidden">
        <div>
          <h1 className="text-xl font-black text-slate-900 flex items-center gap-2">
            <span>Academic Timetable & Scheduling Engine</span>
            <span className="text-[10px] uppercase tracking-wider bg-blue-100 text-blue-800 px-2 py-0.5 rounded font-bold">
              Conflict-Free
            </span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Database-backed weekly master schedule, curriculum restrictions & teacher radar
          </p>
        </div>

        <div className="flex bg-white p-1 rounded-xl border border-slate-200 shadow-sm text-xs font-bold">
          <button
            onClick={() => setActiveTab('CLASS_TIMETABLE')}
            className={`px-3.5 py-2 rounded-lg transition-all flex items-center gap-1.5 ${
              activeTab === 'CLASS_TIMETABLE' ? 'bg-blue-600 text-white shadow' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Calendar size={14} /> Class Matrix
          </button>
          <button
            onClick={() => setActiveTab('TEACHER_SCHEDULE')}
            className={`px-3.5 py-2 rounded-lg transition-all flex items-center gap-1.5 ${
              activeTab === 'TEACHER_SCHEDULE' ? 'bg-blue-600 text-white shadow' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <User size={14} /> Teacher Radar
          </button>
          <button
            onClick={() => setActiveTab('PERIOD_MASTER')}
            className={`px-3.5 py-2 rounded-lg transition-all flex items-center gap-1.5 ${
              activeTab === 'PERIOD_MASTER' ? 'bg-blue-600 text-white shadow' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Clock size={14} /> Bell Schedule
          </button>
          <button
            onClick={() => setActiveTab('SYLLABUS')}
            className={`px-3.5 py-2 rounded-lg transition-all flex items-center gap-1.5 ${
              activeTab === 'SYLLABUS' ? 'bg-blue-600 text-white shadow' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Layers size={14} /> Syllabus
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: CLASS TIMETABLE MATRIX */}
      {/* ========================================================================= */}
      {activeTab === 'CLASS_TIMETABLE' && (
        <div className="space-y-4">
          {/* Class & Section Switcher Bar */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-wrap items-center justify-between gap-4 print:hidden">
            <div className="flex flex-wrap items-center gap-2.5 text-xs">
              <span className="font-bold text-slate-500 uppercase tracking-wider text-[11px]">Class:</span>
              <div className="flex flex-wrap gap-1.5">
                {classes.map((cls) => (
                  <button
                    key={cls.id}
                    onClick={() => handleClassChange(cls.id)}
                    className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
                      selectedClassId === cls.id
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'bg-slate-50 text-slate-700 hover:bg-slate-100 border border-slate-200'
                    }`}
                  >
                    {cls.name}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-2 text-xs">
              <span className="font-bold text-slate-500 uppercase tracking-wider text-[11px]">Section:</span>
              <div className="flex gap-1.5">
                {selectedClass?.sections?.length > 0 ? (
                  selectedClass.sections.map((sec) => (
                    <button
                      key={sec.id}
                      onClick={() => setSelectedSectionId(sec.id)}
                      className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
                        selectedSectionId === sec.id
                          ? 'bg-slate-900 text-white shadow'
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      Sec {sec.name}
                    </button>
                  ))
                ) : (
                  <span className="text-slate-400 italic">No sections created</span>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleOpenCopyModal}
                disabled={timetableData.slots.length === 0}
                className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-slate-700 hover:bg-slate-50 flex items-center gap-1.5 text-xs font-bold shadow-sm disabled:opacity-40"
              >
                <Copy size={13} /> Copy to Section
              </button>
              <button
                onClick={() => window.print()}
                className="px-3 py-1.5 bg-blue-50 border border-blue-200 rounded-lg text-blue-700 hover:bg-blue-100 flex items-center gap-1.5 text-xs font-bold shadow-sm"
              >
                <Printer size={13} /> Print Timetable
              </button>
            </div>
          </div>

          {/* Printable Header (Visible only when printing) */}
          <div className="hidden print:block mb-4 text-center border-b pb-3">
            <h2 className="text-xl font-black text-slate-900">
              WEEKLY CLASS TIMETABLE — {selectedClass?.name || 'Class'} (Section {selectedSection?.name || 'A'})
            </h2>
            <p className="text-xs text-slate-500 mt-1">Official School Academic Routine</p>
          </div>

          {/* Curriculum Mapping Alert if class has 0 subjects mapped */}
          {timetableData.mapped_subjects?.length === 0 && (
            <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertTriangle size={16} className="text-amber-600 shrink-0" />
                <span>
                  <strong>No Subjects Mapped to {selectedClass?.name || 'this class'}:</strong> You must map subjects
                  under <strong>Classes & Sessions → Curriculum Mapping</strong> before you can assign slots.
                </span>
              </div>
            </div>
          )}

          {/* Empty Periods State: Prompt Admin to Apply Template */}
          {timetableData.periods?.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-12 text-center space-y-4">
              <div className="w-16 h-16 rounded-2xl bg-blue-50 text-blue-600 mx-auto flex items-center justify-center">
                <Clock size={32} />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">No Bell Schedule / Periods Defined</h3>
                <p className="text-xs text-slate-500 max-w-md mx-auto mt-1">
                  A timetable matrix requires standard period start and end timings. Apply the standard 6-period daily
                  template or set custom bell timings.
                </p>
              </div>
              <div className="flex items-center justify-center gap-3 pt-2">
                <button
                  onClick={handleApplyTemplate}
                  className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl shadow flex items-center gap-2 transition-all"
                >
                  <Sparkles size={15} /> Apply Standard 6-Period Template
                </button>
                <button
                  onClick={() => setActiveTab('PERIOD_MASTER')}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-all"
                >
                  Configure Custom Periods
                </button>
              </div>
            </div>
          ) : (
            /* Full Weekly Schedule Matrix */
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden text-xs">
              <div className="p-3.5 bg-slate-50 border-b border-slate-200 flex justify-between items-center text-xs font-bold text-slate-800 print:hidden">
                <div className="flex items-center gap-2">
                  <Calendar size={14} className="text-blue-600" />
                  <span>
                    Schedule: {selectedClass?.name || 'Class'} — Section {selectedSection?.name || 'A'}
                  </span>
                  <span className="text-[11px] font-normal text-slate-500">
                    ({timetableData.slots?.length || 0} slots assigned)
                  </span>
                </div>
                <div className="text-[11px] text-slate-500 font-normal">
                  Click any slot to assign or replace subject & teacher
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-100/80 border-b border-slate-200 text-slate-700 font-bold uppercase text-[10px] tracking-wider">
                      <th className="py-3 px-3 w-32 border-r border-slate-200">Period / Time</th>
                      {DAYS.map((day) => (
                        <th key={day} className="py-3 px-3 min-w-[150px] border-r border-slate-200 last:border-r-0">
                          {day}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {timetableData.periods.map((period) => {
                      if (period.is_break) {
                        return (
                          <tr key={period.id} className="bg-amber-50/50">
                            <td className="py-2.5 px-3 bg-amber-100/40 border-r border-slate-200 font-mono font-bold text-amber-900">
                              <div className="flex items-center gap-1.5">
                                <Clock size={12} className="text-amber-700" />
                                <span>{period.name}</span>
                              </div>
                              <div className="text-[10px] text-amber-700 font-normal">
                                {formatTime(period.start_time)} - {formatTime(period.end_time)}
                              </div>
                            </td>
                            <td
                              colSpan={6}
                              className="py-2.5 px-4 text-center font-bold text-amber-800 uppercase tracking-widest text-[11px]"
                            >
                              ☕ {period.name} ({getDurationMinutes(period.start_time, period.end_time)} mins)
                            </td>
                          </tr>
                        );
                      }

                      return (
                        <tr key={period.id} className="hover:bg-slate-50/40 transition-colors">
                          {/* Period Info Column */}
                          <td className="py-3 px-3 bg-slate-50/60 border-r border-slate-200 font-mono font-bold text-slate-800 align-top">
                            <div className="text-xs">{period.name}</div>
                            <div className="text-[10px] text-slate-400 font-normal mt-0.5">
                              {formatTime(period.start_time)} - {formatTime(period.end_time)}
                            </div>
                            <div className="text-[9px] text-blue-600 font-semibold mt-1">
                              {getDurationMinutes(period.start_time, period.end_time)} mins
                            </div>
                          </td>

                          {/* Day Columns */}
                          {DAYS.map((day) => {
                            const slot = timetableData.slots?.find(
                              (s) => s.day_of_week === day && s.period_id === period.id
                            );

                            return (
                              <td
                                key={day}
                                className="py-2.5 px-2.5 border-r border-slate-200 last:border-r-0 align-top relative group"
                              >
                                {slot ? (
                                  <div className="bg-white p-2.5 rounded-xl border border-blue-200/80 shadow-sm hover:border-blue-400 transition-all space-y-1 relative">
                                    <div className="flex items-center justify-between gap-1">
                                      <span className="font-bold text-slate-900 text-xs truncate">
                                        {slot.subject_name}
                                      </span>
                                      <span className="text-[9px] px-1.5 py-0.2 rounded bg-blue-100 text-blue-800 font-bold uppercase">
                                        {slot.subject_code}
                                      </span>
                                    </div>

                                    <div className="text-[11px] text-slate-600 flex items-center gap-1 font-medium truncate">
                                      <User size={11} className="text-slate-400 shrink-0" />
                                      <span className="truncate">{slot.teacher_name}</span>
                                    </div>

                                    {slot.room_number && (
                                      <div className="text-[10px] text-slate-400 flex items-center gap-1">
                                        <DoorOpen size={10} className="shrink-0" />
                                        <span>{slot.room_number}</span>
                                      </div>
                                    )}

                                    {/* Slot Action Buttons on Hover */}
                                    <div className="pt-1 border-t border-slate-100 flex items-center justify-end gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity print:hidden">
                                      <button
                                        onClick={() => handleOpenSlotModal(day, period, slot)}
                                        className="p-1 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded"
                                        title="Edit Slot"
                                      >
                                        <Edit3 size={12} />
                                      </button>
                                      <button
                                        onClick={() => handleClearSlot(slot.id, `${slot.subject_name} on ${day}`)}
                                        className="p-1 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded"
                                        title="Clear Slot"
                                      >
                                        <Trash2 size={12} />
                                      </button>
                                    </div>
                                  </div>
                                ) : (
                                  /* Empty / Free Slot */
                                  <button
                                    onClick={() => handleOpenSlotModal(day, period, null)}
                                    className="w-full h-16 rounded-xl border border-dashed border-slate-200 hover:border-blue-400 hover:bg-blue-50/40 transition-all flex flex-col items-center justify-center text-slate-400 hover:text-blue-600 gap-1 print:hidden"
                                  >
                                    <Plus size={14} />
                                    <span className="text-[10px] font-semibold">Assign</span>
                                  </button>
                                )}
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: TEACHER SCHEDULE VIEW & FREE PERIOD RADAR */}
      {/* ========================================================================= */}
      {activeTab === 'TEACHER_SCHEDULE' && (
        <div className="space-y-4">
          {/* Teacher Selector Card */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <User size={18} className="text-blue-600" />
              <div>
                <h3 className="text-sm font-bold text-slate-900">Teacher Routine & Free Period Radar</h3>
                <p className="text-xs text-slate-500">Detect free periods for substitution and workload balance</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-600">Select Teacher:</span>
              <select
                value={selectedTeacherUserId}
                onChange={(e) => setSelectedTeacherUserId(e.target.value)}
                className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-800"
              >
                {teachersList.map((tch) => (
                  <option key={tch.user_id} value={tch.user_id}>
                    {tch.full_name} ({tch.designation || 'Teacher'})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {loadingTeacherSchedule ? (
            <div className="p-12 text-center text-xs text-slate-400 bg-white rounded-2xl border">
              Loading teacher schedule radar...
            </div>
          ) : teacherScheduleData ? (
            <div className="space-y-4">
              {/* Teacher Workload Summary KPI Tiles */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-1">
                  <div className="text-[11px] font-bold text-slate-500 uppercase">Assigned Teaching Periods</div>
                  <div className="text-2xl font-black text-blue-600">
                    {teacherScheduleData.total_assigned_periods}
                  </div>
                  <div className="text-[11px] text-slate-400">Total weekly classroom commitments</div>
                </div>

                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-1">
                  <div className="text-[11px] font-bold text-slate-500 uppercase">Unassigned / Free Periods</div>
                  <div className="text-2xl font-black text-emerald-600">
                    {teacherScheduleData.total_free_periods}
                  </div>
                  <div className="text-[11px] text-emerald-700 font-medium">Available for substitution coverage</div>
                </div>

                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-1">
                  <div className="text-[11px] font-bold text-slate-500 uppercase">Weekly Availability Score</div>
                  <div className="text-2xl font-black text-indigo-600">
                    {Math.round(
                      (teacherScheduleData.total_free_periods /
                        (teacherScheduleData.total_assigned_periods + teacherScheduleData.total_free_periods || 1)) *
                        100
                    )}
                    %
                  </div>
                  <div className="text-[11px] text-slate-400">Flexibility for remedial & substitutions</div>
                </div>
              </div>

              {/* Teacher Weekly Matrix */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden text-xs">
                <div className="p-3.5 bg-slate-50 border-b border-slate-200 font-bold text-slate-800 flex justify-between items-center">
                  <span>Weekly Timetable: {teacherScheduleData.teacher_name}</span>
                  <span className="text-[11px] text-slate-500 font-normal">Green = Free Period Radar</span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-100/70 border-b border-slate-200 text-slate-600 font-bold uppercase text-[10px]">
                        <th className="py-2.5 px-3 w-28 border-r border-slate-200">Period</th>
                        {DAYS.map((day) => (
                          <th key={day} className="py-2.5 px-3 border-r border-slate-200 last:border-r-0">
                            {day}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {teacherScheduleData.periods.map((p) => {
                        if (p.is_break) {
                          return (
                            <tr key={p.id} className="bg-amber-50/40">
                              <td className="py-2 px-3 border-r border-slate-200 font-bold text-amber-800 text-[10px]">
                                {p.name}
                              </td>
                              <td
                                colSpan={6}
                                className="py-2 px-3 text-center text-[10px] font-bold text-amber-700 tracking-wider"
                              >
                                RECESS / BREAK
                              </td>
                            </tr>
                          );
                        }

                        return (
                          <tr key={p.id}>
                            <td className="py-3 px-3 bg-slate-50/50 border-r border-slate-200 font-mono font-bold text-slate-700">
                              <div>{p.name}</div>
                              <div className="text-[10px] text-slate-400 font-normal">
                                {formatTime(p.start_time)}
                              </div>
                            </td>

                            {DAYS.map((day) => {
                              const slot = teacherScheduleData.slots.find(
                                (s) => s.day_of_week === day && s.period_id === p.id
                              );

                              return (
                                <td
                                  key={day}
                                  className="py-2 px-2 border-r border-slate-200 last:border-r-0 align-top"
                                >
                                  {slot ? (
                                    <div className="bg-blue-50/80 p-2 rounded-lg border border-blue-200 text-[11px] space-y-0.5">
                                      <div className="font-bold text-blue-900">
                                        {slot.class_name} ({slot.section_name})
                                      </div>
                                      <div className="text-slate-700 font-medium">{slot.subject_name}</div>
                                      {slot.room_number && (
                                        <div className="text-[9px] text-slate-500">Room: {slot.room_number}</div>
                                      )}
                                    </div>
                                  ) : (
                                    <div className="bg-emerald-50/60 p-2 rounded-lg border border-emerald-200/80 text-center">
                                      <span className="text-[10px] font-bold text-emerald-700">🟢 FREE</span>
                                    </div>
                                  )}
                                </td>
                              );
                            })}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-8 text-center text-xs text-slate-400 bg-white rounded-2xl border">
              Select a teacher to inspect weekly commitments and free periods.
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: BELL SCHEDULE & PERIOD TIMINGS MASTER */}
      {/* ========================================================================= */}
      {activeTab === 'PERIOD_MASTER' && (
        <div className="space-y-4">
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-wrap items-center justify-between gap-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900">School Bell Schedule & Period Timings</h3>
              <p className="text-xs text-slate-500">Configure period duration, start/end timings, and recess breaks</p>
            </div>

            <div className="flex items-center gap-2">
              {periodList.length === 0 && (
                <button
                  onClick={handleApplyTemplate}
                  className="px-3 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold shadow flex items-center gap-1.5"
                >
                  <Sparkles size={14} /> Apply 6-Period Template
                </button>
              )}
              <button
                onClick={() => {
                  setPeriodFormError('');
                  setPeriodForm({
                    id: null,
                    period_number: periodList.length + 1,
                    name: `Period ${periodList.length + 1}`,
                    start_time: '08:30',
                    end_time: '09:15',
                    is_break: false,
                    sort_order: periodList.length + 1,
                  });
                  setShowPeriodModal(true);
                }}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold shadow flex items-center gap-1.5"
              >
                <Plus size={14} /> Add Period
              </button>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden text-xs">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase text-[10px] tracking-wider">
                  <th className="py-3 px-3">#</th>
                  <th className="py-3 px-3">Period Name</th>
                  <th className="py-3 px-3">Start Time</th>
                  <th className="py-3 px-3">End Time</th>
                  <th className="py-3 px-3">Duration</th>
                  <th className="py-3 px-3">Type</th>
                  <th className="py-3 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {periodList.length > 0 ? (
                  periodList.map((p) => (
                    <tr key={p.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-3 font-mono font-bold text-slate-600">{p.period_number}</td>
                      <td className="py-3 px-3 font-bold text-slate-900">{p.name}</td>
                      <td className="py-3 px-3 font-mono text-slate-700">{formatTime(p.start_time)}</td>
                      <td className="py-3 px-3 font-mono text-slate-700">{formatTime(p.end_time)}</td>
                      <td className="py-3 px-3 font-bold text-blue-600">
                        {getDurationMinutes(p.start_time, p.end_time)} mins
                      </td>
                      <td className="py-3 px-3">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            p.is_break ? 'bg-amber-100 text-amber-800' : 'bg-blue-100 text-blue-800'
                          }`}
                        >
                          {p.is_break ? 'Recess / Break' : 'Teaching Period'}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right">
                        <div className="inline-flex items-center gap-2">
                          <button
                            onClick={() => {
                              setPeriodFormError('');
                              setPeriodForm({
                                id: p.id,
                                period_number: p.period_number,
                                name: p.name,
                                start_time: p.start_time?.slice(0, 5) || '08:30',
                                end_time: p.end_time?.slice(0, 5) || '09:15',
                                is_break: p.is_break,
                                sort_order: p.sort_order,
                              });
                              setShowPeriodModal(true);
                            }}
                            className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded"
                          >
                            <Edit3 size={13} />
                          </button>
                          <button
                            onClick={() => handleDeletePeriod(p.id, p.name)}
                            className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-400">
                      No periods configured yet. Click 'Apply 6-Period Template' or 'Add Period' to begin.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: SYLLABUS SPEEDOMETER */}
      {/* ========================================================================= */}
      {activeTab === 'SYLLABUS' && (
        <div className="space-y-4">
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
            <h3 className="text-sm font-bold text-slate-900">Curriculum Syllabus Speedometer</h3>
            <p className="text-xs text-slate-500">Track chapter completion pace versus academic calendar target</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {syllabusItems.map((s, idx) => (
              <div key={idx} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-bold text-slate-900 text-sm">{s.subject}</h3>
                    <div className="text-slate-500 text-[11px] flex items-center gap-1 mt-0.5">
                      <User size={12} /> {s.teacher}
                    </div>
                  </div>
                  <span
                    className={`px-2.5 py-0.5 rounded-full font-bold text-[10px] ${
                      s.status === 'ON_TRACK' || s.status === 'AHEAD'
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-rose-100 text-rose-800'
                    }`}
                  >
                    {s.status === 'ON_TRACK' ? '🟢 ON TRACK' : s.status === 'AHEAD' ? '⭐ AHEAD' : '🔴 12 DAYS BEHIND'}
                  </span>
                </div>

                <div>
                  <div className="flex justify-between text-xs font-bold mb-1">
                    <span className="text-slate-700">
                      {s.completedChapters} of {s.totalChapters} Chapters Completed
                    </span>
                    <span className={s.pct < 50 ? 'text-rose-600' : 'text-emerald-600'}>{s.pct}%</span>
                  </div>
                  <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        s.pct < 50 ? 'bg-rose-500' : s.pct > 70 ? 'bg-emerald-500' : 'bg-blue-600'
                      }`}
                      style={{ width: `${s.pct}%` }}
                    ></div>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
                  <span className="text-slate-400">Current Chapter / Topic:</span>
                  <span className="font-bold text-slate-800">{s.currentTopic}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 1: SLOT ASSIGNMENT MODAL (ANTI-CLASH & CURRICULUM ENFORCED) */}
      {/* ========================================================================= */}
      {showSlotModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 text-xs">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                  <Calendar size={16} className="text-blue-600" />
                  <span>
                    {slotModalData.slotId ? 'Edit Timetable Slot' : 'Assign Timetable Slot'}
                  </span>
                </h3>
                <p className="text-slate-500 text-[11px] mt-0.5">
                  {selectedClass?.name} - Section {selectedSection?.name} | {slotModalData.day} (
                  {slotModalData.period?.name})
                </p>
              </div>
              <button onClick={() => setShowSlotModal(false)} className="text-slate-400 hover:text-slate-600">
                <X size={18} />
              </button>
            </div>

            {/* Error / Conflict Alert */}
            {slotModalError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 flex items-start gap-2 text-[11px] font-semibold leading-relaxed">
                <ShieldAlert size={16} className="text-rose-600 shrink-0 mt-0.5" />
                <span>{slotModalError}</span>
              </div>
            )}

            <form onSubmit={handleSaveSlot} className="space-y-3.5">
              {/* Day & Period Info Pill */}
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 flex justify-between items-center text-[11px]">
                <span className="font-bold text-slate-700">Day: {slotModalData.day}</span>
                <span className="font-mono text-slate-500">
                  {formatTime(slotModalData.period?.start_time)} - {formatTime(slotModalData.period?.end_time)}
                </span>
              </div>

              {/* Subject Selection (Strictly Mapped Subjects) */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Subject * <span className="text-slate-400 font-normal">(Curriculum Mapped Only)</span>
                </label>
                {timetableData.mapped_subjects?.length > 0 ? (
                  <select
                    required
                    value={slotModalData.subjectId}
                    onChange={(e) => setSlotModalData({ ...slotModalData, subjectId: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg font-medium text-slate-800"
                  >
                    <option value="">-- Choose Subject --</option>
                    {timetableData.mapped_subjects.map((sub) => (
                      <option key={sub.id} value={sub.id}>
                        {sub.name} ({sub.code})
                      </option>
                    ))}
                  </select>
                ) : (
                  <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-lg text-amber-800 text-[11px]">
                    No subjects mapped to this class! Please map subjects in Curriculum Mapping first.
                  </div>
                )}
              </div>

              {/* Teacher Selection */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Teacher * <span className="text-slate-400 font-normal">(Anti-Clash Guard Enabled)</span>
                </label>
                <select
                  required
                  value={slotModalData.teacherUserId}
                  onChange={(e) => setSlotModalData({ ...slotModalData, teacherUserId: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg font-medium text-slate-800"
                >
                  <option value="">-- Choose Teacher --</option>
                  {teachersList.map((tch) => (
                    <option key={tch.user_id} value={tch.user_id}>
                      {tch.full_name} ({tch.designation || 'Staff'})
                    </option>
                  ))}
                </select>
              </div>

              {/* Room Number */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">Room / Lab (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. Room 102, Physics Lab, Computer Lab"
                  value={slotModalData.roomNumber}
                  onChange={(e) => setSlotModalData({ ...slotModalData, roomNumber: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg"
                />
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                {slotModalData.slotId ? (
                  <button
                    type="button"
                    onClick={() => {
                      setShowSlotModal(false);
                      handleClearSlot(slotModalData.slotId, 'this slot');
                    }}
                    className="px-3 py-2 text-rose-600 hover:bg-rose-50 rounded-lg font-bold flex items-center gap-1"
                  >
                    <Trash2 size={13} /> Clear Slot
                  </button>
                ) : (
                  <div />
                )}

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setShowSlotModal(false)}
                    className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-semibold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={savingSlot || timetableData.mapped_subjects?.length === 0}
                    className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-bold shadow disabled:opacity-50"
                  >
                    {savingSlot ? 'Checking Clashes...' : 'Save Slot'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: COPY TIMETABLE TO SECTION MODAL */}
      {/* ========================================================================= */}
      {showCopyModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 text-xs">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                  <Copy size={16} className="text-blue-600" />
                  <span>Duplicate Timetable to Section</span>
                </h3>
                <p className="text-slate-500 text-[11px]">
                  Copies all slots with pre-verification of teacher conflicts
                </p>
              </div>
              <button onClick={() => setShowCopyModal(false)} className="text-slate-400 hover:text-slate-600">
                <X size={18} />
              </button>
            </div>

            {copyError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 flex items-start gap-2 text-[11px] font-semibold leading-relaxed">
                <AlertTriangle size={16} className="text-rose-600 shrink-0 mt-0.5" />
                <span>{copyError}</span>
              </div>
            )}

            <form onSubmit={handleExecuteCopy} className="space-y-3.5">
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-1">
                <span className="text-[10px] uppercase font-bold text-slate-400">Source Section:</span>
                <div className="font-bold text-slate-900">
                  {selectedClass?.name} — Section {selectedSection?.name} ({timetableData.slots.length} slots)
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Target Class *</label>
                <select
                  required
                  value={copyTargetClassId}
                  onChange={(e) => {
                    setCopyTargetClassId(e.target.value);
                    const cls = classes.find((c) => c.id === e.target.value);
                    setCopyTargetSectionId(cls?.sections?.[0]?.id || '');
                  }}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg font-medium text-slate-800"
                >
                  {classes.map((cls) => (
                    <option key={cls.id} value={cls.id}>
                      {cls.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Target Section *</label>
                <select
                  required
                  value={copyTargetSectionId}
                  onChange={(e) => setCopyTargetSectionId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg font-medium text-slate-800"
                >
                  <option value="">-- Choose Target Section --</option>
                  {classes
                    .find((c) => c.id === copyTargetClassId)
                    ?.sections?.filter((s) => !(copyTargetClassId === selectedClassId && s.id === selectedSectionId))
                    .map((s) => (
                      <option key={s.id} value={s.id}>
                        Section {s.name}
                      </option>
                    ))}
                </select>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="copyOverwrite"
                  checked={copyOverwrite}
                  onChange={(e) => setCopyOverwrite(e.target.checked)}
                  className="w-4 h-4 rounded text-blue-600 border-slate-300 focus:ring-blue-500"
                />
                <label htmlFor="copyOverwrite" className="font-semibold text-slate-700">
                  Overwrite any existing slots in target section
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowCopyModal(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={copyingTimetable}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-bold shadow disabled:opacity-50"
                >
                  {copyingTimetable ? 'Validating & Copying...' : 'Copy Timetable'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: PERIOD ADD / EDIT MODAL */}
      {/* ========================================================================= */}
      {showPeriodModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 text-xs">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                  <Clock size={16} className="text-blue-600" />
                  <span>{periodForm.id ? 'Edit Bell Period' : 'Add New Bell Period'}</span>
                </h3>
                <p className="text-slate-500 text-[11px]">Configure period number and bell timings</p>
              </div>
              <button onClick={() => setShowPeriodModal(false)} className="text-slate-400 hover:text-slate-600">
                <X size={18} />
              </button>
            </div>

            {periodFormError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-[11px] font-semibold">
                {periodFormError}
              </div>
            )}

            <form onSubmit={handleSavePeriod} className="space-y-3.5">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Period Number *</label>
                  <input
                    type="number"
                    min="1"
                    max="20"
                    required
                    value={periodForm.period_number}
                    onChange={(e) =>
                      setPeriodForm({
                        ...periodForm,
                        period_number: parseInt(e.target.value, 10) || 1,
                      })
                    }
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Period Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Period 1 / Recess"
                    value={periodForm.name}
                    onChange={(e) => setPeriodForm({ ...periodForm, name: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg font-semibold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Start Time *</label>
                  <input
                    type="time"
                    required
                    value={periodForm.start_time}
                    onChange={(e) => setPeriodForm({ ...periodForm, start_time: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg font-mono"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">End Time *</label>
                  <input
                    type="time"
                    required
                    value={periodForm.end_time}
                    onChange={(e) => setPeriodForm({ ...periodForm, end_time: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg font-mono"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="periodIsBreak"
                  checked={periodForm.is_break}
                  onChange={(e) => setPeriodForm({ ...periodForm, is_break: e.target.checked })}
                  className="w-4 h-4 rounded text-amber-600 border-slate-300 focus:ring-amber-500"
                />
                <label htmlFor="periodIsBreak" className="font-semibold text-slate-700">
                  This period is a Recess / Break (No teaching subjects assigned)
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowPeriodModal(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingPeriod}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-bold shadow disabled:opacity-50"
                >
                  {savingPeriod ? 'Saving...' : 'Save Period'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
