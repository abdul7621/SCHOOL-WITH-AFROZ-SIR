import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  GraduationCap,
  ArrowRight,
  CheckSquare,
  Square,
  AlertTriangle,
  CheckCircle2,
  Users,
  RefreshCw,
  ChevronRight,
  ArrowLeft,
  Filter,
} from 'lucide-react';
import api from '../../api/client';

export const StudentPromotion = () => {
  const [academicYears, setAcademicYears] = useState([]);
  const [classes, setClasses] = useState([]);
  const [sourceYearId, setSourceYearId] = useState('');
  const [sourceClassId, setSourceClassId] = useState('');
  const [sourceSectionId, setSourceSectionId] = useState('');

  const [targetYearId, setTargetYearId] = useState('');
  const [targetClassId, setTargetClassId] = useState('');
  const [targetSectionId, setTargetSectionId] = useState('');

  const [students, setStudents] = useState([]);
  const [selectedStudentIds, setSelectedStudentIds] = useState(new Set());
  const [studentTargets, setStudentTargets] = useState({});

  const [loadingInitial, setLoadingInitial] = useState(true);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [promotionSuccess, setPromotionSuccess] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');

  // 1. Fetch Academic Years and Classes
  useEffect(() => {
    const fetchMeta = async () => {
      setLoadingInitial(true);
      try {
        const [yearsRes, classesRes] = await Promise.all([
          api.get('/academics/years'),
          api.get('/academics/classes'),
        ]);

        const years = yearsRes.data || [];
        const classList = classesRes.data || [];

        setAcademicYears(years);
        setClasses(classList);

        if (years.length > 0) {
          const currentYear = years.find((y) => y.is_current) || years[0];
          setSourceYearId(currentYear.id);

          // Find a subsequent year or default to current
          const currentIdx = years.findIndex((y) => y.id === currentYear.id);
          const nextYear = currentIdx < years.length - 1 ? years[currentIdx + 1] : currentYear;
          setTargetYearId(nextYear.id);
        }

        if (classList.length > 0) {
          setSourceClassId(classList[0].id);
          if (classList[0].sections?.length > 0) {
            setSourceSectionId(classList[0].sections[0].id);
          }

          // Target class defaults to the next class level in sequence
          const nextClass = classList.length > 1 ? classList[1] : classList[0];
          setTargetClassId(nextClass.id);
          if (nextClass.sections?.length > 0) {
            setTargetSectionId(nextClass.sections[0].id);
          }
        }
      } catch (err) {
        console.error('Error loading promotion initial data:', err);
        setErrorMessage('Failed to load academic sessions or classes. Please try again.');
      } finally {
        setLoadingInitial(false);
      }
    };
    fetchMeta();
  }, []);

  // 2. Auto-suggest next class when source class changes
  const handleSourceClassChange = (newSourceClassId) => {
    setSourceClassId(newSourceClassId);
    const selClass = classes.find((c) => c.id === newSourceClassId);
    if (selClass?.sections?.length > 0) {
      setSourceSectionId(selClass.sections[0].id);
    } else {
      setSourceSectionId('');
    }

    const currentIdx = classes.findIndex((c) => c.id === newSourceClassId);
    if (currentIdx !== -1 && currentIdx < classes.length - 1) {
      const nextCls = classes[currentIdx + 1];
      setTargetClassId(nextCls.id);
      if (nextCls.sections?.length > 0) {
        setTargetSectionId(nextCls.sections[0].id);
      }
    }
  };

  // 3. Fetch Students for the source class/section/year
  const fetchSourceStudents = async () => {
    if (!sourceClassId) return;
    setLoadingStudents(true);
    setErrorMessage('');
    setPromotionSuccess(null);
    try {
      const params = {
        limit: 100,
        class_id: sourceClassId,
      };
      if (sourceYearId) params.academic_year_id = sourceYearId;
      if (sourceSectionId) params.section_id = sourceSectionId;

      const res = await api.get('/students', { params });
      const list = res.data || [];
      setStudents(list);

      // By default, select all active students
      const initialSelected = new Set();
      const initialTargets = {};

      list.forEach((st, idx) => {
        initialSelected.add(st.id);
        initialTargets[st.id] = {
          targetClassId: targetClassId,
          targetSectionId: targetSectionId,
          targetRollNo: idx + 1,
          action: 'PROMOTE',
        };
      });

      setSelectedStudentIds(initialSelected);
      setStudentTargets(initialTargets);
    } catch (err) {
      console.error('Error fetching source students for promotion:', err);
      setErrorMessage('Failed to fetch students. Please check your network or credentials.');
    } finally {
      setLoadingStudents(false);
    }
  };

  // Trigger student fetch when source filters change
  useEffect(() => {
    if (sourceClassId) {
      fetchSourceStudents();
    }
  }, [sourceClassId, sourceSectionId, sourceYearId]);

  // Sync default target class and section across student targets when batch targets change
  const handleBatchTargetClassChange = (newTargetClassId) => {
    setTargetClassId(newTargetClassId);
    const selClass = classes.find((c) => c.id === newTargetClassId);
    const newSectionId = selClass?.sections?.length > 0 ? selClass.sections[0].id : '';
    setTargetSectionId(newSectionId);

    // Update students using batch target
    setStudentTargets((prev) => {
      const updated = { ...prev };
      Object.keys(updated).forEach((stId) => {
        if (updated[stId].action === 'PROMOTE') {
          updated[stId].targetClassId = newTargetClassId;
          updated[stId].targetSectionId = newSectionId;
        }
      });
      return updated;
    });
  };

  const handleBatchTargetSectionChange = (newTargetSectionId) => {
    setTargetSectionId(newTargetSectionId);
    setStudentTargets((prev) => {
      const updated = { ...prev };
      Object.keys(updated).forEach((stId) => {
        if (updated[stId].action === 'PROMOTE') {
          updated[stId].targetSectionId = newTargetSectionId;
        }
      });
      return updated;
    });
  };

  // Toggle single student selection
  const toggleStudentSelection = (studentId) => {
    setSelectedStudentIds((prev) => {
      const next = new Set(prev);
      if (next.has(studentId)) {
        next.delete(studentId);
      } else {
        next.add(studentId);
      }
      return next;
    });
  };

  // Toggle select all
  const toggleSelectAll = () => {
    if (selectedStudentIds.size === students.length) {
      setSelectedStudentIds(new Set());
    } else {
      setSelectedStudentIds(new Set(students.map((s) => s.id)));
    }
  };

  // Update specific student target
  const handleStudentTargetChange = (studentId, field, value) => {
    setStudentTargets((prev) => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        [field]: value,
      },
    }));
  };

  // Quick Action: Retain in same class
  const handleToggleRetain = (studentId) => {
    setStudentTargets((prev) => {
      const current = prev[studentId] || {};
      const isRetaining = current.action === 'RETAIN';
      return {
        ...prev,
        [studentId]: {
          ...current,
          action: isRetaining ? 'PROMOTE' : 'RETAIN',
          targetClassId: isRetaining ? targetClassId : sourceClassId,
          targetSectionId: isRetaining ? targetSectionId : sourceSectionId,
        },
      };
    });
  };

  // Execute Bulk Promotion
  const handleExecutePromotion = async () => {
    if (selectedStudentIds.size === 0) {
      alert('Please select at least one student to promote.');
      return;
    }

    if (!targetYearId) {
      alert('Please select a valid target academic year.');
      return;
    }

    if (sourceYearId === targetYearId && sourceClassId === targetClassId) {
      const confirmSame = window.confirm(
        'Warning: Source and target session & class are identical. Are you sure you want to proceed with section/roll-no rollover?'
      );
      if (!confirmSame) return;
    }

    const payloadPromotions = [];
    selectedStudentIds.forEach((stId) => {
      const config = studentTargets[stId] || {};
      if (config.action !== 'SKIP') {
        payloadPromotions.push({
          student_id: stId,
          target_class_id: config.targetClassId || targetClassId,
          target_section_id: config.targetSectionId || targetSectionId,
          target_roll_no: config.targetRollNo ? parseInt(config.targetRollNo, 10) : null,
        });
      }
    });

    if (payloadPromotions.length === 0) {
      alert('No students configured for promotion.');
      return;
    }

    const confirmMsg = `Are you sure you want to promote ${payloadPromotions.length} students to the next academic session?\n\nThis will create active enrollments in the target session and archive current session enrollments.`;
    if (!window.confirm(confirmMsg)) return;

    setSubmitting(true);
    setErrorMessage('');
    try {
      const res = await api.post('/students/promote', {
        source_academic_year_id: sourceYearId,
        target_academic_year_id: targetYearId,
        promotions: payloadPromotions,
      });

      setPromotionSuccess({
        count: res.data?.promoted_count ?? payloadPromotions.length,
        message: res.message || 'Promotion successfully processed',
      });
      // Refresh list
      fetchSourceStudents();
    } catch (err) {
      console.error('Error executing student promotion:', err);
      setErrorMessage(
        err.response?.data?.detail || 'Failed to complete annual student promotion. Please try again.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  const targetClassObj = classes.find((c) => c.id === targetClassId);
  const sourceClassObj = classes.find((c) => c.id === sourceClassId);
  const sourceYearObj = academicYears.find((y) => y.id === sourceYearId);
  const targetYearObj = academicYears.find((y) => y.id === targetYearId);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            to="/students"
            className="p-2 hover:bg-slate-200 rounded-xl text-slate-500 transition-colors"
            title="Back to Student Directory"
          >
            <ArrowLeft size={20} />
          </Link>
          <div>
            <h1 className="text-xl font-black text-slate-900 flex items-center gap-2">
              <GraduationCap className="text-indigo-600" size={24} />
              Annual Student Promotion & Session Rollover
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Bulk promote enrolled students to the next academic session and class level with automated enrollment archiving
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchSourceStudents}
            disabled={loadingStudents}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl text-xs font-bold text-slate-700 shadow-sm transition-all"
          >
            <RefreshCw size={14} className={loadingStudents ? 'animate-spin' : ''} />
            <span>Refresh</span>
          </button>
          <Link
            to="/students"
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-colors"
          >
            Exit Wizard
          </Link>
        </div>
      </div>

      {/* Success Banner */}
      {promotionSuccess && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center justify-between text-emerald-900 animate-in fade-in">
          <div className="flex items-center gap-3">
            <CheckCircle2 size={24} className="text-emerald-600 shrink-0" />
            <div>
              <div className="font-black text-sm">Promotion Batch Completed!</div>
              <div className="text-xs text-emerald-700 mt-0.5">
                Successfully promoted {promotionSuccess.count} students to{' '}
                <strong>{targetYearObj?.name || 'Target Session'}</strong> -{' '}
                <strong>{targetClassObj?.name || 'Target Class'}</strong>.
              </div>
            </div>
          </div>
          <Link
            to="/students"
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold text-xs shadow transition-colors shrink-0"
          >
            View Student Directory
          </Link>
        </div>
      )}

      {/* Error Banner */}
      {errorMessage && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl flex items-center gap-3 text-rose-900">
          <AlertTriangle size={20} className="text-rose-600 shrink-0" />
          <div className="text-xs font-semibold">{errorMessage}</div>
        </div>
      )}

      {/* STEP 1: Session & Class Mapping Card */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Source Configuration */}
        <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <span className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-[10px] font-bold">1</span>
              Source Origin (Current Enrollment)
            </span>
            <span className="text-[11px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
              {students.length} Students Found
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Academic Session</label>
              <select
                value={sourceYearId}
                onChange={(e) => setSourceYearId(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold outline-none focus:ring-2 focus:ring-blue-500"
              >
                {academicYears.map((y) => (
                  <option key={y.id} value={y.id}>
                    {y.name} {y.is_current ? '(Active)' : ''}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Class Level</label>
              <select
                value={sourceClassId}
                onChange={(e) => handleSourceClassChange(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold outline-none focus:ring-2 focus:ring-blue-500"
              >
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Section</label>
              <select
                value={sourceSectionId}
                onChange={(e) => setSourceSectionId(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Sections</option>
                {classes
                  .find((c) => c.id === sourceClassId)
                  ?.sections?.map((s) => (
                    <option key={s.id} value={s.id}>
                      Section {s.name}
                    </option>
                  ))}
              </select>
            </div>
          </div>
        </div>

        {/* Target Configuration */}
        <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <span className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-[10px] font-bold">2</span>
              Target Destination (Promoted Enrollment)
            </span>
            <span className="text-[11px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full">
              Rollover Target
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Next Session</label>
              <select
                value={targetYearId}
                onChange={(e) => setTargetYearId(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold outline-none focus:ring-2 focus:ring-indigo-500"
              >
                {academicYears.map((y) => (
                  <option key={y.id} value={y.id}>
                    {y.name} {y.is_current ? '(Current)' : ''}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Promote To Class</label>
              <select
                value={targetClassId}
                onChange={(e) => handleBatchTargetClassChange(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold outline-none focus:ring-2 focus:ring-indigo-500"
              >
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Section</label>
              <select
                value={targetSectionId}
                onChange={(e) => handleBatchTargetSectionChange(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold outline-none focus:ring-2 focus:ring-indigo-500"
              >
                {targetClassObj?.sections?.map((s) => (
                  <option key={s.id} value={s.id}>
                    Section {s.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* STEP 2: Promotion Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {/* Table Controls */}
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-4 font-bold text-slate-700">
            <button
              onClick={toggleSelectAll}
              className="flex items-center gap-1.5 hover:text-indigo-600 transition-colors"
            >
              {selectedStudentIds.size === students.length && students.length > 0 ? (
                <CheckSquare size={16} className="text-indigo-600" />
              ) : (
                <Square size={16} className="text-slate-400" />
              )}
              <span>
                {selectedStudentIds.size === students.length ? 'Deselect All' : 'Select All Students'}
              </span>
            </button>
            <span className="text-slate-300">|</span>
            <span>
              Selected:{' '}
              <strong className="text-indigo-600">{selectedStudentIds.size}</strong> of {students.length}
            </span>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleExecutePromotion}
              disabled={submitting || selectedStudentIds.size === 0}
              className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-xl font-bold text-xs shadow-md transition-all flex items-center gap-2"
            >
              {submitting ? (
                <RefreshCw size={14} className="animate-spin" />
              ) : (
                <GraduationCap size={16} />
              )}
              <span>
                {submitting
                  ? 'Processing Promotion...'
                  : `Promote ${selectedStudentIds.size} Selected Students`}
              </span>
            </button>
          </div>
        </div>

        {/* Table Content */}
        {loadingStudents ? (
          <div className="py-20 text-center text-slate-400 font-bold text-xs animate-pulse">
            Loading student roster from academic database...
          </div>
        ) : students.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-100 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider">
                  <th className="py-3 px-4 w-12 text-center">Select</th>
                  <th className="py-3 px-4">Adm No</th>
                  <th className="py-3 px-4">Student Name</th>
                  <th className="py-3 px-4">Current Class & Roll</th>
                  <th className="py-3 px-4 text-center">Action</th>
                  <th className="py-3 px-4">Target Class</th>
                  <th className="py-3 px-4">Target Section</th>
                  <th className="py-3 px-4 w-28">Target Roll No</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {students.map((st, index) => {
                  const isSelected = selectedStudentIds.has(st.id);
                  const config = studentTargets[st.id] || {
                    targetClassId: targetClassId,
                    targetSectionId: targetSectionId,
                    targetRollNo: index + 1,
                    action: 'PROMOTE',
                  };
                  const isRetain = config.action === 'RETAIN';

                  return (
                    <tr
                      key={st.id}
                      className={`hover:bg-indigo-50/40 transition-colors ${
                        isSelected ? 'bg-indigo-50/20' : 'opacity-60'
                      }`}
                    >
                      <td className="py-3 px-4 text-center">
                        <button
                          type="button"
                          onClick={() => toggleStudentSelection(st.id)}
                          className="text-slate-500 hover:text-indigo-600 transition-colors"
                        >
                          {isSelected ? (
                            <CheckSquare size={16} className="text-indigo-600" />
                          ) : (
                            <Square size={16} className="text-slate-300" />
                          )}
                        </button>
                      </td>
                      <td className="py-3 px-4 font-mono font-bold text-blue-700">
                        {st.admission_no}
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-900">{st.full_name}</div>
                        <div className="text-[10px] text-slate-400">
                          Parent: {st.father_name || 'N/A'}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-semibold text-slate-700">
                          {st.class_name} ({st.section_name})
                        </span>
                        <div className="text-[10px] text-slate-400 font-mono">
                          Roll #{st.roll_no || index + 1}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <button
                          type="button"
                          onClick={() => handleToggleRetain(st.id)}
                          className={`px-2.5 py-1 rounded-lg font-bold text-[10px] transition-colors ${
                            isRetain
                              ? 'bg-amber-100 text-amber-800 border border-amber-300'
                              : 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                          }`}
                        >
                          {isRetain ? '⚠️ RETAIN' : '✓ PROMOTE'}
                        </button>
                      </td>
                      <td className="py-3 px-4">
                        <select
                          disabled={!isSelected}
                          value={config.targetClassId || targetClassId}
                          onChange={(e) =>
                            handleStudentTargetChange(st.id, 'targetClassId', e.target.value)
                          }
                          className="px-2 py-1 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-800 outline-none focus:ring-1 focus:ring-indigo-500 disabled:opacity-50"
                        >
                          {classes.map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.name}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="py-3 px-4">
                        <select
                          disabled={!isSelected}
                          value={config.targetSectionId || targetSectionId}
                          onChange={(e) =>
                            handleStudentTargetChange(st.id, 'targetSectionId', e.target.value)
                          }
                          className="px-2 py-1 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-800 outline-none focus:ring-1 focus:ring-indigo-500 disabled:opacity-50"
                        >
                          {classes
                            .find((c) => c.id === (config.targetClassId || targetClassId))
                            ?.sections?.map((s) => (
                              <option key={s.id} value={s.id}>
                                Sec {s.name}
                              </option>
                            ))}
                        </select>
                      </td>
                      <td className="py-3 px-4">
                        <input
                          type="number"
                          disabled={!isSelected}
                          value={config.targetRollNo ?? index + 1}
                          onChange={(e) =>
                            handleStudentTargetChange(st.id, 'targetRollNo', e.target.value)
                          }
                          className="w-16 px-2 py-1 bg-white border border-slate-200 rounded-lg text-xs font-mono font-bold text-slate-800 outline-none focus:ring-1 focus:ring-indigo-500 disabled:opacity-50"
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-16 text-center text-slate-400 space-y-2">
            <Users size={32} className="mx-auto text-slate-300" />
            <div className="font-bold text-xs text-slate-600">
              No students found in the selected source class.
            </div>
            <p className="text-[11px] text-slate-400">
              Change the source class level or section in Step 1 to fetch enrolled students.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
export default StudentPromotion;
