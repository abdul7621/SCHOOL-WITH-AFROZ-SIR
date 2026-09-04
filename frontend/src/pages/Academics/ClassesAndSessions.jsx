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
} from 'lucide-react';
import api from '../../api/client';

export const ClassesAndSessions = () => {
  const [activeTab, setActiveTab] = useState('classes'); // 'classes', 'years', 'subjects'
  const [classes, setClasses] = useState([]);
  const [years, setYears] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(false);

  // Class Modal
  const [showClassModal, setShowClassModal] = useState(false);
  const [newClassName, setNewClassName] = useState('');
  const [newClassOrder, setNewClassOrder] = useState(1);
  const [newSections, setNewSections] = useState('A, B');

  // Year Modal
  const [showYearModal, setShowYearModal] = useState(false);
  const [newYearName, setNewYearName] = useState('2026-2027');
  const [startDate, setStartDate] = useState('2026-04-01');
  const [endDate, setEndDate] = useState('2027-03-31');

  // Subject Modal
  const [showSubjectModal, setShowSubjectModal] = useState(false);
  const [subCode, setSubCode] = useState('');
  const [subName, setSubName] = useState('');
  const [subType, setSubType] = useState('THEORY');

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [clsRes, yrRes, subRes] = await Promise.all([
        api.get('/academics/classes'),
        api.get('/academics/years'),
        api.get('/academics/subjects'),
      ]);
      if (clsRes.data) setClasses(clsRes.data);
      if (yrRes.data) setYears(yrRes.data);
      if (subRes.data) setSubjects(subRes.data);
    } catch (e) {
      console.log('Error loading academic data:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
  }, []);

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

  const handleCreateYear = async (e) => {
    e.preventDefault();
    try {
      await api.post('/academics/years', {
        name: newYearName,
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
    try {
      await api.post('/academics/subjects', {
        code: subCode.toUpperCase(),
        name: subName,
        subject_type: subType,
        is_elective: false,
      });
      setShowSubjectModal(false);
      setSubCode('');
      setSubName('');
      fetchAll();
    } catch (err) {
      alert('Error creating subject: ' + err.message);
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

        <div className="flex bg-slate-200 p-1 rounded-xl text-xs font-semibold">
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
                  <div className="font-bold text-slate-900 text-sm">{c.name}</div>
                  <span className="text-[10px] font-mono text-slate-400 font-bold">Order: #{c.numeric_order}</span>
                </div>

                <div>
                  <div className="text-[11px] font-semibold text-slate-400 mb-1.5 uppercase">Active Sections</div>
                  <div className="flex flex-wrap gap-1.5">
                    {c.sections?.map((s) => (
                      <span key={s.id} className="px-2.5 py-1 bg-blue-50 text-blue-700 font-bold rounded-lg text-xs">
                        Section {s.name} <span className="text-[10px] font-normal text-blue-400">({s.capacity} seats)</span>
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
                      {!y.is_current && (
                        <button
                          onClick={() => handleSetCurrentYear(y.id)}
                          className="px-3 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold rounded-lg text-xs transition-colors"
                        >
                          Set as Active
                        </button>
                      )}
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
                  </tr>
                ))}
              </tbody>
            </table>
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
    </div>
  );
};
