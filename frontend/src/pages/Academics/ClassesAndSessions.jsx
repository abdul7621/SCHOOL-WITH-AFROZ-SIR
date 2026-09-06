import React, { useState, useEffect } from 'react';
import {
  GraduationCap,
  Calendar,
  Layers,
  BookOpen,
  Plus,
  CheckCircle2,
  AlertCircle,
  Clock,
  ShieldCheck,
  FileText,
  Trash2,
  Edit2,
  Check,
  X,
} from 'lucide-react';
import api from '../../api/client';

export const ClassesAndSessions = () => {
  const queryTab = new URLSearchParams(window.location.search).get('tab');
  const [activeTab, setActiveTab] = useState(queryTab || 'classes'); // 'classes', 'years', 'subjects', 'homework'
  const [classes, setClasses] = useState([]);
  const [years, setYears] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(false);

  // Homework State
  const [homeworkClassId, setHomeworkClassId] = useState('');
  const [homeworkSectionId, setHomeworkSectionId] = useState('');
  const [homeworkSubjectId, setHomeworkSubjectId] = useState('');
  const [homeworkTitle, setHomeworkTitle] = useState('');
  const [homeworkDesc, setHomeworkDesc] = useState('');
  const [homeworkDueDate, setHomeworkDueDate] = useState(
    new Date(Date.now() + 86400000).toISOString().split('T')[0]
  );
  const [homeworkList, setHomeworkList] = useState([]);
  const [loadingHomework, setLoadingHomework] = useState(false);
  const [submittingHomework, setSubmittingHomework] = useState(false);
  const [showHomeworkModal, setShowHomeworkModal] = useState(false);

  // Class Modal & Edit State
  const [showClassModal, setShowClassModal] = useState(false);
  const [newClassName, setNewClassName] = useState('');
  const [newClassOrder, setNewClassOrder] = useState(1);
  const [newSections, setNewSections] = useState('A, B');
  const [editingClass, setEditingClass] = useState(null);

  // Section Quick Add & Edit State
  const [addingSectionClassId, setAddingSectionClassId] = useState(null);
  const [newSectionName, setNewSectionName] = useState('C');
  const [newSectionCapacity, setNewSectionCapacity] = useState(45);
  const [editingSection, setEditingSection] = useState(null);

  // Year Modal & Edit State
  const [showYearModal, setShowYearModal] = useState(false);
  const [newYearName, setNewYearName] = useState('2026-2027');
  const [startDate, setStartDate] = useState('2026-04-01');
  const [endDate, setEndDate] = useState('2027-03-31');
  const [editingYear, setEditingYear] = useState(null);

  // Subject Modal & Edit State
  const [showSubjectModal, setShowSubjectModal] = useState(false);
  const [subCode, setSubCode] = useState('');
  const [subName, setSubName] = useState('');
  const [subType, setSubType] = useState('THEORY');
  const [editingSubject, setEditingSubject] = useState(null);

  // Curriculum Mapping State
  const [curriculumClassId, setCurriculumClassId] = useState('');
  const [mappedSubjectIds, setMappedSubjectIds] = useState([]);
  const [loadingCurriculum, setLoadingCurriculum] = useState(false);
  const [savingCurriculum, setSavingCurriculum] = useState(false);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [clsRes, yrRes, subRes] = await Promise.all([
        api.get('/academics/classes'),
        api.get('/academics/years'),
        api.get('/academics/subjects'),
      ]);
      if (clsRes.data && clsRes.data.length > 0) {
        setClasses(clsRes.data);
        setHomeworkClassId((prev) => prev || clsRes.data[0].id);
        setCurriculumClassId((prev) => prev || clsRes.data[0].id);
        if (clsRes.data[0].sections?.length > 0) {
          setHomeworkSectionId((prev) => prev || clsRes.data[0].sections[0].id);
        }
      }
      if (yrRes.data) setYears(yrRes.data);
      if (subRes.data && subRes.data.length > 0) {
        setSubjects(subRes.data);
        setHomeworkSubjectId((prev) => prev || subRes.data[0].id);
      }
    } catch (e) {
      console.log('Error loading academic data:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
  }, []);

  const fetchHomework = async (cId, sId) => {
    const classIdToUse = cId || homeworkClassId;
    const sectionIdToUse = sId || homeworkSectionId;
    if (!classIdToUse || !sectionIdToUse) return;
    setLoadingHomework(true);
    try {
      const res = await api.get('/academics/homework', {
        params: { class_id: classIdToUse, section_id: sectionIdToUse },
      });
      if (res.data) setHomeworkList(res.data);
    } catch (e) {
      console.error('Error fetching homework:', e);
    } finally {
      setLoadingHomework(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'homework' && homeworkClassId && homeworkSectionId) {
      fetchHomework(homeworkClassId, homeworkSectionId);
    }
  }, [activeTab, homeworkClassId, homeworkSectionId]);

  const handleAssignHomework = async (e) => {
    e.preventDefault();
    if (!homeworkClassId || !homeworkSectionId || !homeworkSubjectId || !homeworkTitle) {
      alert('Please fill all required homework fields.');
      return;
    }
    const currentYear = years.find((y) => y.is_current) || years[0];
    if (!currentYear) {
      alert('No active academic session found. Please create one first.');
      return;
    }

    setSubmittingHomework(true);
    try {
      await api.post('/academics/homework', {
        academic_year_id: currentYear.id,
        class_id: homeworkClassId,
        section_id: homeworkSectionId,
        subject_id: homeworkSubjectId,
        title: homeworkTitle,
        description: homeworkDesc,
        due_date: homeworkDueDate,
      });
      setShowHomeworkModal(false);
      setHomeworkTitle('');
      setHomeworkDesc('');
      fetchHomework(homeworkClassId, homeworkSectionId);
      alert('Daily homework assigned successfully!');
    } catch (err) {
      alert('Failed to assign homework: ' + err.message);
    } finally {
      setSubmittingHomework(false);
    }
  };

  const handleCreateClass = async (e) => {
    e.preventDefault();
    try {
      const sectionsArray = newSections
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
      await api.post('/academics/classes', {
        name: newClassName,
        numeric_order: parseInt(newClassOrder),
        initial_sections: sectionsArray.length > 0 ? sectionsArray : ['A'],
      });
      setShowClassModal(false);
      setNewClassName('');
      fetchAll();
    } catch (err) {
      alert('Error creating class: ' + err.message);
    }
  };

  const handleUpdateClass = async (e) => {
    e.preventDefault();
    if (!editingClass) return;
    try {
      await api.put(`/academics/classes/${editingClass.id}`, {
        name: editingClass.name.trim(),
        numeric_order: parseInt(editingClass.numeric_order),
        description: editingClass.description,
      });
      setEditingClass(null);
      fetchAll();
      alert('Class updated successfully!');
    } catch (err) {
      alert('Error updating class: ' + err.message);
    }
  };

  const handleDeleteClass = async (classId, className) => {
    if (!window.confirm(`Are you sure you want to delete "${className}"? This action cannot be undone.`)) return;
    try {
      await api.delete(`/academics/classes/${classId}`);
      fetchAll();
      alert(`Class "${className}" deleted successfully.`);
    } catch (err) {
      let msg = err.message;
      if (err.dependencies && err.dependencies.length > 0) {
        msg += '\n\nLinked Records Preventing Deletion:\n' + err.dependencies.map((d) => `• ${d.resource}: ${d.count}`).join('\n');
      }
      alert(msg);
    }
  };

  const handleQuickAddSection = async (e) => {
    e.preventDefault();
    if (!addingSectionClassId) return;
    try {
      await api.post(`/academics/classes/${addingSectionClassId}/sections`, {
        name: newSectionName.trim().toUpperCase(),
        capacity: parseInt(newSectionCapacity),
      });
      setAddingSectionClassId(null);
      setNewSectionName('C');
      fetchAll();
      alert('Section added successfully!');
    } catch (err) {
      alert('Error adding section: ' + err.message);
    }
  };

  const handleUpdateSection = async (e) => {
    e.preventDefault();
    if (!editingSection) return;
    try {
      await api.put(`/academics/classes/${editingSection.class_id}/sections/${editingSection.id}`, {
        name: editingSection.name.trim().toUpperCase(),
        capacity: parseInt(editingSection.capacity),
      });
      setEditingSection(null);
      fetchAll();
      alert('Section updated successfully!');
    } catch (err) {
      alert('Error updating section: ' + err.message);
    }
  };

  const handleDeleteSection = async (classId, sectionId, sectionName) => {
    if (!window.confirm(`Are you sure you want to delete Section "${sectionName}"?`)) return;
    try {
      await api.delete(`/academics/classes/${classId}/sections/${sectionId}`);
      fetchAll();
      alert(`Section "${sectionName}" deleted successfully.`);
    } catch (err) {
      let msg = err.message;
      if (err.dependencies && err.dependencies.length > 0) {
        msg += '\n\nLinked Records Preventing Deletion:\n' + err.dependencies.map((d) => `• ${d.resource}: ${d.count}`).join('\n');
      }
      alert(msg);
    }
  };

  const handleCreateYear = async (e) => {
    e.preventDefault();
    const cleanName = newYearName.trim();
    if (!cleanName) {
      alert('Please enter a valid session name.');
      return;
    }
    if (years.some((y) => y.name.trim().toLowerCase() === cleanName.toLowerCase())) {
      alert(`Academic session '${cleanName}' already exists. Duplicate session names are not allowed.`);
      return;
    }
    try {
      await api.post('/academics/years', {
        name: cleanName,
        start_date: startDate,
        end_date: endDate,
        is_current: false,
      });
      setShowYearModal(false);
      fetchAll();
    } catch (err) {
      alert('Error creating session: ' + err.message);
    }
  };

  const handleUpdateYear = async (e) => {
    e.preventDefault();
    if (!editingYear) return;
    try {
      await api.put(`/academics/years/${editingYear.id}`, {
        name: editingYear.name.trim(),
        start_date: editingYear.start_date,
        end_date: editingYear.end_date,
      });
      setEditingYear(null);
      fetchAll();
      alert('Academic session updated successfully!');
    } catch (err) {
      alert('Error updating session: ' + err.message);
    }
  };

  const handleDeleteYear = async (yearId, yearName) => {
    if (!window.confirm(`Are you sure you want to delete session "${yearName}"? This action cannot be undone.`)) {
      return;
    }
    try {
      await api.delete(`/academics/years/${yearId}`);
      fetchAll();
      alert(`Academic session "${yearName}" deleted successfully.`);
    } catch (err) {
      let msg = err.message;
      if (err.dependencies && err.dependencies.length > 0) {
        msg += '\n\nLinked Records Preventing Deletion:\n' + err.dependencies.map((d) => `• ${d.resource}: ${d.count}`).join('\n');
      }
      alert(msg);
    }
  };

  const handleSetCurrentYear = async (yearId) => {
    try {
      await api.patch(`/academics/years/${yearId}/set-current`);
      fetchAll();
    } catch (err) {
      alert('Error switching session: ' + err.message);
    }
  };

  const handleCreateSubject = async (e) => {
    e.preventDefault();
    if (!subCode.trim() || !subName.trim()) {
      alert('Please fill in subject code and name.');
      return;
    }
    try {
      await api.post('/academics/subjects', {
        code: subCode.trim().toUpperCase(),
        name: subName.trim(),
        subject_type: subType,
      });
      setShowSubjectModal(false);
      setSubCode('');
      setSubName('');
      fetchAll();
      alert('Subject created successfully!');
    } catch (err) {
      alert('Error creating subject: ' + err.message);
    }
  };

  const handleUpdateSubject = async (e) => {
    e.preventDefault();
    if (!editingSubject) return;
    try {
      await api.put(`/academics/subjects/${editingSubject.id}`, {
        code: editingSubject.code.trim().toUpperCase(),
        name: editingSubject.name.trim(),
        subject_type: editingSubject.subject_type,
      });
      setEditingSubject(null);
      fetchAll();
      alert('Subject updated successfully!');
    } catch (err) {
      alert('Error updating subject: ' + err.message);
    }
  };

  const handleDeleteSubject = async (subjectId, subjectName) => {
    if (!window.confirm(`Are you sure you want to delete subject "${subjectName}"? This action cannot be undone.`)) {
      return;
    }
    try {
      await api.delete(`/academics/subjects/${subjectId}`);
      fetchAll();
      alert(`Subject "${subjectName}" deleted successfully.`);
    } catch (err) {
      let msg = err.message;
      if (err.dependencies && err.dependencies.length > 0) {
        msg += '\n\nLinked Records Preventing Deletion:\n' + err.dependencies.map((d) => `• ${d.resource}: ${d.count}`).join('\n');
      }
      alert(msg);
    }
  };

  const fetchCurriculum = async (classId) => {
    if (!classId) return;
    setLoadingCurriculum(true);
    try {
      const res = await api.get(`/academics/classes/${classId}/subjects`);
      if (res.data) {
        const ids = res.data.map((s) => s.id);
        setMappedSubjectIds(ids);
      }
    } catch (e) {
      console.error('Error fetching curriculum:', e);
    } finally {
      setLoadingCurriculum(false);
    }
  };

  const toggleSubjectMapping = (subId) => {
    setMappedSubjectIds((prev) =>
      prev.includes(subId) ? prev.filter((id) => id !== subId) : [...prev, subId]
    );
  };

  const handleSaveCurriculum = async () => {
    if (!curriculumClassId) return;
    setSavingCurriculum(true);
    try {
      await api.post(`/academics/classes/${curriculumClassId}/subjects`, {
        subject_ids: mappedSubjectIds,
      });
      alert('Curriculum mapping saved successfully!');
    } catch (err) {
      alert('Error saving curriculum: ' + err.message);
    } finally {
      setSavingCurriculum(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <GraduationCap size={22} className="text-blue-600" />
            <span>Academic Structure & Sessions Hub</span>
          </h1>
          <p className="text-xs text-slate-500">Configure academic sessions, class levels, sections, and subjects</p>
        </div>

        <div className="flex flex-wrap bg-slate-200 p-1 rounded-xl text-xs font-semibold gap-1">
          <button
            onClick={() => setActiveTab('classes')}
            className={`px-3.5 py-1.5 rounded-lg transition-all ${
              activeTab === 'classes' ? 'bg-white text-blue-700 shadow font-bold' : 'text-slate-600'
            }`}
          >
            Classes & Sections ({classes.length})
          </button>
          <button
            onClick={() => setActiveTab('years')}
            className={`px-3.5 py-1.5 rounded-lg transition-all ${
              activeTab === 'years' ? 'bg-white text-blue-700 shadow font-bold' : 'text-slate-600'
            }`}
          >
            Academic Sessions ({years.length})
          </button>
          <button
            onClick={() => setActiveTab('subjects')}
            className={`px-3.5 py-1.5 rounded-lg transition-all ${
              activeTab === 'subjects' ? 'bg-white text-blue-700 shadow font-bold' : 'text-slate-600'
            }`}
          >
            Subjects Directory ({subjects.length})
          </button>
          <button
            onClick={() => {
              setActiveTab('curriculum');
              if (!curriculumClassId && classes.length > 0) {
                setCurriculumClassId(classes[0].id);
                fetchCurriculum(classes[0].id);
              }
            }}
            className={`px-3.5 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
              activeTab === 'curriculum' ? 'bg-white text-blue-700 shadow font-bold' : 'text-slate-600'
            }`}
          >
            <BookOpen size={13} />
            Curriculum Mapping
          </button>
          <button
            onClick={() => setActiveTab('homework')}
            className={`px-3.5 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
              activeTab === 'homework' ? 'bg-white text-blue-700 shadow font-bold' : 'text-slate-600'
            }`}
          >
            <FileText size={13} />
            Daily Homework & Tasks
          </button>
        </div>
      </div>

      {/* TAB 1: CLASSES & SECTIONS */}
      {activeTab === 'classes' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button
              onClick={() => setShowClassModal(true)}
              className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow transition-colors"
            >
              <Plus size={14} /> Add New Class
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {classes.map((c) => (
              <div key={c.id} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                  <div>
                    <div className="font-bold text-slate-900 text-sm">{c.name}</div>
                    <span className="text-[10px] font-mono text-slate-400 font-bold">Order: #{c.numeric_order}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setEditingClass({ ...c })}
                      className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-500 hover:text-blue-600 transition-colors"
                      title="Edit Class"
                    >
                      <Edit2 size={13} />
                    </button>
                    <button
                      onClick={() => handleDeleteClass(c.id, c.name)}
                      className="p-1.5 hover:bg-rose-50 rounded-lg text-slate-400 hover:text-rose-600 transition-colors"
                      title="Delete Class"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between text-[11px] font-semibold text-slate-400 mb-1.5 uppercase">
                    <span>Active Sections</span>
                    <button
                      onClick={() => {
                        setAddingSectionClassId(c.id);
                        setNewSectionName('C');
                        setNewSectionCapacity(45);
                      }}
                      className="flex items-center gap-1 text-[11px] text-blue-600 hover:text-blue-700 font-bold"
                    >
                      <Plus size={12} /> Add Section
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {c.sections?.map((s) => (
                      <span
                        key={s.id}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-blue-50 text-blue-700 font-bold rounded-lg text-xs"
                      >
                        <span>{s.name.startsWith('Section') ? s.name : `Section ${s.name}`}</span>
                        <span className="text-[10px] font-normal text-blue-400">({s.capacity} seats)</span>
                        <button
                          onClick={() => setEditingSection({ ...s, class_id: c.id })}
                          className="text-blue-500 hover:text-blue-800 ml-0.5"
                          title="Edit Section"
                        >
                          <Edit2 size={11} />
                        </button>
                        <button
                          onClick={() => handleDeleteSection(c.id, s.id, s.name)}
                          className="text-rose-400 hover:text-rose-600"
                          title="Delete Section"
                        >
                          <Trash2 size={11} />
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 2: ACADEMIC SESSIONS */}
      {activeTab === 'years' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button
              onClick={() => setShowYearModal(true)}
              className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow transition-colors"
            >
              <Plus size={14} /> Add Academic Session
            </button>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden text-xs">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase">
                  <th className="py-3 px-4">Session Name</th>
                  <th className="py-3 px-4">Start Date</th>
                  <th className="py-3 px-4">End Date</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {years.map((y) => (
                  <tr key={y.id} className="hover:bg-slate-50">
                    <td className="py-3 px-4 font-bold text-slate-900">{y.name}</td>
                    <td className="py-3 px-4 font-mono text-slate-600">{y.start_date}</td>
                    <td className="py-3 px-4 font-mono text-slate-600">{y.end_date}</td>
                    <td className="py-3 px-4">
                      {y.is_current ? (
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                          CURRENT ACTIVE SESSION
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded text-[10px] text-slate-500 bg-slate-100 font-medium">
                          Archived
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {!y.is_current && (
                          <button
                            onClick={() => handleSetCurrentYear(y.id)}
                            className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold rounded-lg text-xs transition-colors"
                          >
                            Set as Active
                          </button>
                        )}
                        <button
                          onClick={() => setEditingYear({ ...y })}
                          className="p-1 hover:bg-slate-100 rounded text-slate-500 hover:text-blue-600 transition-colors"
                          title="Edit Session"
                        >
                          <Edit2 size={13} />
                        </button>
                        {!y.is_current && (
                          <button
                            onClick={() => handleDeleteYear(y.id, y.name)}
                            className="p-1 hover:bg-rose-50 rounded text-slate-400 hover:text-rose-600 transition-colors"
                            title="Delete Session"
                          >
                            <Trash2 size={13} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: SUBJECTS DIRECTORY */}
      {activeTab === 'subjects' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button
              onClick={() => setShowSubjectModal(true)}
              className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow transition-colors"
            >
              <Plus size={14} /> Add New Subject
            </button>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden text-xs">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase">
                  <th className="py-3 px-4">Subject Code</th>
                  <th className="py-3 px-4">Subject Name</th>
                  <th className="py-3 px-4">Type</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {subjects.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-50">
                    <td className="py-3 px-4 font-mono font-bold text-blue-700">{s.code}</td>
                    <td className="py-3 px-4 font-bold text-slate-900">{s.name}</td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded bg-slate-100 font-semibold text-slate-700 text-[10px]">
                        {s.subject_type || 'THEORY'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => setEditingSubject({ ...s })}
                          className="p-1 hover:bg-slate-100 rounded text-slate-500 hover:text-blue-600 transition-colors"
                          title="Edit Subject"
                        >
                          <Edit2 size={13} />
                        </button>
                        <button
                          onClick={() => handleDeleteSubject(s.id, s.name)}
                          className="p-1 hover:bg-rose-50 rounded text-slate-400 hover:text-rose-600 transition-colors"
                          title="Delete Subject"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: CURRICULUM MAPPING */}
      {activeTab === 'curriculum' && (
        <div className="space-y-4">
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                <span className="text-xs font-bold text-slate-700">Select Class:</span>
                <select
                  value={curriculumClassId}
                  onChange={(e) => {
                    const cid = e.target.value;
                    setCurriculumClassId(cid);
                    fetchCurriculum(cid);
                  }}
                  className="px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900"
                >
                  {classes.map((cls) => (
                    <option key={cls.id} value={cls.id}>
                      {cls.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-3">
                <span className="text-xs text-slate-500 font-medium">
                  Mapped: <strong className="text-blue-600">{mappedSubjectIds.length}</strong> of {subjects.length} subjects
                </span>
                <button
                  onClick={handleSaveCurriculum}
                  disabled={savingCurriculum || !curriculumClassId}
                  className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold shadow transition-colors disabled:opacity-50"
                >
                  <Check size={14} /> {savingCurriculum ? 'Saving...' : 'Save Curriculum'}
                </button>
              </div>
            </div>

            {loadingCurriculum ? (
              <div className="py-8 text-center text-xs text-slate-400">Loading curriculum mapping...</div>
            ) : subjects.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-400">No subjects created yet in Subjects Directory.</div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {subjects.map((sub) => {
                  const isAssigned = mappedSubjectIds.includes(sub.id);
                  return (
                    <div
                      key={sub.id}
                      onClick={() => toggleSubjectMapping(sub.id)}
                      className={`cursor-pointer p-3.5 rounded-xl border transition-all flex items-center justify-between ${
                        isAssigned
                          ? 'border-blue-500 bg-blue-50/50 shadow-sm'
                          : 'border-slate-200 bg-white hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <input
                          type="checkbox"
                          checked={isAssigned}
                          onChange={() => {}}
                          className="rounded text-blue-600 focus:ring-0 w-4 h-4 cursor-pointer"
                        />
                        <div>
                          <div className="font-bold text-xs text-slate-900">{sub.name}</div>
                          <div className="font-mono text-[10px] text-slate-400">{sub.code}</div>
                        </div>
                      </div>
                      <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-slate-100 text-slate-600">
                        {sub.subject_type || 'THEORY'}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 4: DAILY HOMEWORK & TASKS */}
      {activeTab === 'homework' && (
        <div className="space-y-4">
          {/* Action Bar & Filters */}
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
            <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-600">Class:</span>
                <select
                  value={homeworkClassId}
                  onChange={(e) => {
                    const newClassId = e.target.value;
                    setHomeworkClassId(newClassId);
                    const selectedClass = classes.find((c) => c.id === newClassId);
                    const firstSectionId = selectedClass?.sections?.[0]?.id || '';
                    setHomeworkSectionId(firstSectionId);
                    if (firstSectionId) fetchHomework(newClassId, firstSectionId);
                  }}
                  className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800"
                >
                  {classes.map((cls) => (
                    <option key={cls.id} value={cls.id}>
                      {cls.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-600">Section:</span>
                <select
                  value={homeworkSectionId}
                  onChange={(e) => {
                    const newSectionId = e.target.value;
                    setHomeworkSectionId(newSectionId);
                    fetchHomework(homeworkClassId, newSectionId);
                  }}
                  className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800"
                >
                  {(classes.find((c) => c.id === homeworkClassId)?.sections || []).map((sec) => (
                    <option key={sec.id} value={sec.id}>
                      Section {sec.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <button
              onClick={() => setShowHomeworkModal(true)}
              className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold px-4 py-2 rounded-xl shadow transition-colors"
            >
              <Plus size={14} /> Assign New Homework
            </button>
          </div>

          {/* Homework List */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden text-xs">
            {loadingHomework ? (
              <div className="p-8 text-center text-slate-400">Loading homework assignments...</div>
            ) : homeworkList.length === 0 ? (
              <div className="p-8 text-center text-slate-400">
                No homework assignments recorded for this class and section.
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {homeworkList.map((hw) => (
                  <div key={hw.id} className="p-4 hover:bg-slate-50 flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 font-bold text-[10px]">
                          {hw.subject_name}
                        </span>
                        <h4 className="font-bold text-slate-900 text-sm">{hw.title}</h4>
                      </div>
                      <p className="text-slate-600 text-xs whitespace-pre-wrap">{hw.description}</p>
                    </div>

                    <div className="flex items-center gap-4 text-[11px] text-slate-500 self-end md:self-auto shrink-0">
                      <div>
                        <span className="font-semibold text-slate-400">Assigned: </span>
                        {hw.assigned_date ? new Date(hw.assigned_date).toLocaleDateString() : 'N/A'}
                      </div>
                      <div className="bg-amber-50 text-amber-800 px-2.5 py-1 rounded-lg font-bold border border-amber-200">
                        Due: {hw.due_date ? new Date(hw.due_date).toLocaleDateString() : 'N/A'}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL 1: ADD CLASS */}
      {showClassModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <h3 className="font-bold text-slate-900 text-sm">Add New Class Level</h3>
            <form onSubmit={handleCreateClass} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">Class Name</label>
                <input
                  type="text"
                  required
                  value={newClassName}
                  onChange={(e) => setNewClassName(e.target.value)}
                  placeholder="e.g. Class 11 (Commerce)"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>
              <div>
                <label className="block text-slate-700 font-semibold mb-1">Numeric Order (for sorting)</label>
                <input
                  type="number"
                  required
                  value={newClassOrder}
                  onChange={(e) => setNewClassOrder(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono"
                />
              </div>
              <div>
                <label className="block text-slate-700 font-semibold mb-1">Initial Sections (comma separated)</label>
                <input
                  type="text"
                  value={newSections}
                  onChange={(e) => setNewSections(e.target.value)}
                  placeholder="A, B, C"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowClassModal(false)}
                  className="px-4 py-2 text-slate-500 hover:text-slate-800 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold"
                >
                  Save Class
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: ADD ACADEMIC YEAR */}
      {showYearModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <h3 className="font-bold text-slate-900 text-sm">Add Academic Session</h3>
            <form onSubmit={handleCreateYear} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">Session Name</label>
                <input
                  type="text"
                  required
                  value={newYearName}
                  onChange={(e) => setNewYearName(e.target.value)}
                  placeholder="e.g. 2027-2028"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Start Date</label>
                  <input
                    type="date"
                    required
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">End Date</label>
                  <input
                    type="date"
                    required
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowYearModal(false)}
                  className="px-4 py-2 text-slate-500 hover:text-slate-800 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold"
                >
                  Save Session
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: ADD SUBJECT */}
      {showSubjectModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <h3 className="font-bold text-slate-900 text-sm">Add New Subject</h3>
            <form onSubmit={handleCreateSubject} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">Subject Code</label>
                <input
                  type="text"
                  required
                  value={subCode}
                  onChange={(e) => setSubCode(e.target.value)}
                  placeholder="e.g. MATH_10 or URDU_08"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono uppercase"
                />
              </div>
              <div>
                <label className="block text-slate-700 font-semibold mb-1">Subject Name</label>
                <input
                  type="text"
                  required
                  value={subName}
                  onChange={(e) => setSubName(e.target.value)}
                  placeholder="e.g. Mathematics"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold"
                />
              </div>
              <div>
                <label className="block text-slate-700 font-semibold mb-1">Subject Type</label>
                <select
                  value={subType}
                  onChange={(e) => setSubType(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                >
                  <option value="THEORY">THEORY</option>
                  <option value="PRACTICAL">PRACTICAL</option>
                  <option value="BOTH">BOTH (Theory + Practical)</option>
                </select>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowSubjectModal(false)}
                  className="px-4 py-2 text-slate-500 hover:text-slate-800 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold"
                >
                  Save Subject
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 4: ASSIGN HOMEWORK */}
      {showHomeworkModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
              <FileText size={16} className="text-blue-600" />
              Assign Daily Homework / Task
            </h3>
            <form onSubmit={handleAssignHomework} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">Subject</label>
                <select
                  value={homeworkSubjectId}
                  onChange={(e) => setHomeworkSubjectId(e.target.value)}
                  required
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-800"
                >
                  {subjects.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.code})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Title / Topic</label>
                <input
                  type="text"
                  required
                  value={homeworkTitle}
                  onChange={(e) => setHomeworkTitle(e.target.value)}
                  placeholder="e.g. Chapter 4 Exercise 4.2 Q1-Q5"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Description / Instructions</label>
                <textarea
                  rows={3}
                  required
                  value={homeworkDesc}
                  onChange={(e) => setHomeworkDesc(e.target.value)}
                  placeholder="Provide details, reading material, or specific problems to solve..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Submission Due Date</label>
                <input
                  type="date"
                  required
                  value={homeworkDueDate}
                  onChange={(e) => setHomeworkDueDate(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowHomeworkModal(false)}
                  className="px-4 py-2 text-slate-500 hover:text-slate-800 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingHomework}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold shadow disabled:opacity-50"
                >
                  {submittingHomework ? 'Publishing...' : 'Publish Homework'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 5: EDIT CLASS */}
      {editingClass && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <h3 className="font-bold text-slate-900 text-sm">Edit Class</h3>
            <form onSubmit={handleUpdateClass} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">Class Name</label>
                <input
                  type="text"
                  required
                  value={editingClass.name}
                  onChange={(e) => setEditingClass({ ...editingClass, name: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold"
                />
              </div>
              <div>
                <label className="block text-slate-700 font-semibold mb-1">Numeric Order (for sorting)</label>
                <input
                  type="number"
                  required
                  value={editingClass.numeric_order}
                  onChange={(e) => setEditingClass({ ...editingClass, numeric_order: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono"
                />
              </div>
              <div>
                <label className="block text-slate-700 font-semibold mb-1">Description (Optional)</label>
                <input
                  type="text"
                  value={editingClass.description || ''}
                  onChange={(e) => setEditingClass({ ...editingClass, description: e.target.value })}
                  placeholder="e.g. Senior Secondary"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingClass(null)}
                  className="px-4 py-2 text-slate-500 hover:text-slate-800 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold shadow"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 6: QUICK ADD SECTION */}
      {addingSectionClassId && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 space-y-4 shadow-2xl">
            <h3 className="font-bold text-slate-900 text-sm">Add New Section</h3>
            <form onSubmit={handleQuickAddSection} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">Section Name</label>
                <input
                  type="text"
                  required
                  value={newSectionName}
                  onChange={(e) => setNewSectionName(e.target.value)}
                  placeholder="e.g. C, Rose, Yellow"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold uppercase"
                />
              </div>
              <div>
                <label className="block text-slate-700 font-semibold mb-1">Seat Capacity</label>
                <input
                  type="number"
                  required
                  min="1"
                  value={newSectionCapacity}
                  onChange={(e) => setNewSectionCapacity(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setAddingSectionClassId(null)}
                  className="px-4 py-2 text-slate-500 hover:text-slate-800 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold shadow"
                >
                  Add Section
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 7: EDIT SECTION */}
      {editingSection && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 space-y-4 shadow-2xl">
            <h3 className="font-bold text-slate-900 text-sm">Edit Section</h3>
            <form onSubmit={handleUpdateSection} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">Section Name</label>
                <input
                  type="text"
                  required
                  value={editingSection.name}
                  onChange={(e) => setEditingSection({ ...editingSection, name: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold uppercase"
                />
              </div>
              <div>
                <label className="block text-slate-700 font-semibold mb-1">Seat Capacity</label>
                <input
                  type="number"
                  required
                  min="1"
                  value={editingSection.capacity}
                  onChange={(e) => setEditingSection({ ...editingSection, capacity: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingSection(null)}
                  className="px-4 py-2 text-slate-500 hover:text-slate-800 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold shadow"
                >
                  Save Section
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 8: EDIT ACADEMIC YEAR */}
      {editingYear && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <h3 className="font-bold text-slate-900 text-sm">Edit Academic Session</h3>
            <form onSubmit={handleUpdateYear} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">Session Name</label>
                <input
                  type="text"
                  required
                  value={editingYear.name}
                  onChange={(e) => setEditingYear({ ...editingYear, name: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Start Date</label>
                  <input
                    type="date"
                    required
                    value={editingYear.start_date}
                    onChange={(e) => setEditingYear({ ...editingYear, start_date: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">End Date</label>
                  <input
                    type="date"
                    required
                    value={editingYear.end_date}
                    onChange={(e) => setEditingYear({ ...editingYear, end_date: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingYear(null)}
                  className="px-4 py-2 text-slate-500 hover:text-slate-800 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold shadow"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 9: EDIT SUBJECT */}
      {editingSubject && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <h3 className="font-bold text-slate-900 text-sm">Edit Subject</h3>
            <form onSubmit={handleUpdateSubject} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">Subject Code</label>
                <input
                  type="text"
                  required
                  value={editingSubject.code}
                  onChange={(e) => setEditingSubject({ ...editingSubject, code: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono uppercase"
                />
              </div>
              <div>
                <label className="block text-slate-700 font-semibold mb-1">Subject Name</label>
                <input
                  type="text"
                  required
                  value={editingSubject.name}
                  onChange={(e) => setEditingSubject({ ...editingSubject, name: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold"
                />
              </div>
              <div>
                <label className="block text-slate-700 font-semibold mb-1">Subject Type</label>
                <select
                  value={editingSubject.subject_type || 'THEORY'}
                  onChange={(e) => setEditingSubject({ ...editingSubject, subject_type: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-semibold"
                >
                  <option value="THEORY">THEORY</option>
                  <option value="PRACTICAL">PRACTICAL</option>
                  <option value="BOTH">BOTH (Theory + Practical)</option>
                </select>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingSubject(null)}
                  className="px-4 py-2 text-slate-500 hover:text-slate-800 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold shadow"
                >
                  Save Subject
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
