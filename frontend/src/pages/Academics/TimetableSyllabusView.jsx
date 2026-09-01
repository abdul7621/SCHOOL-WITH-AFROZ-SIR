import React, { useState } from 'react';
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
} from 'lucide-react';

export const TimetableSyllabusView = () => {
  const [selectedClass, setSelectedClass] = useState('Class 8');
  const [selectedSection, setSelectedSection] = useState('A');
  const [activeTab, setActiveTab] = useState('TIMETABLE'); // TIMETABLE or SYLLABUS

  const periods = [
    { no: 1, time: '08:30 - 09:15', mon: 'Mathematics (Mr. Farhan)', tue: 'Science (Mrs. Shabana)', wed: 'Mathematics (Mr. Farhan)', thu: 'English (Mr. Tariq)', fri: 'Hindi/Urdu (Mr. Zubair)', sat: 'Computer Lab' },
    { no: 2, time: '09:15 - 10:00', mon: 'Science (Mrs. Shabana)', tue: 'Mathematics (Mr. Farhan)', wed: 'Social Science (Mrs. Pooja)', thu: 'Mathematics (Mr. Farhan)', fri: 'Science (Mrs. Shabana)', sat: 'Art & Craft' },
    { no: 3, time: '10:15 - 11:00', mon: 'English (Mr. Tariq)', tue: 'Social Science (Mrs. Pooja)', wed: 'English (Mr. Tariq)', thu: 'Hindi/Urdu (Mr. Zubair)', fri: 'Mathematics (Mr. Farhan)', sat: 'Sports & Games' },
    { no: 4, time: '11:00 - 11:45', mon: 'Social Science (Mrs. Pooja)', tue: 'English (Mr. Tariq)', wed: 'Science (Mrs. Shabana)', thu: 'Science (Mrs. Shabana)', fri: 'Social Science (Mrs. Pooja)', sat: 'Library Reading' },
    { no: 5, time: '12:15 - 01:00', mon: 'Hindi/Urdu (Mr. Zubair)', tue: 'Hindi/Urdu (Mr. Zubair)', wed: 'Computer Theory', thu: 'Social Science (Mrs. Pooja)', fri: 'Moral Science / GK', sat: 'Weekly Quiz' },
    { no: 6, time: '01:00 - 01:45', mon: 'Computer Practical', tue: 'Art & Activity', wed: 'Physical Education', thu: 'Remedial Tutorial', fri: 'Debate / Speech', sat: 'Assembly & Dismissal' },
  ];

  const syllabusItems = [
    { subject: 'Mathematics', teacher: 'Prof. Farhan Khan', totalChapters: 12, completedChapters: 8, pct: 68, status: 'ON_TRACK', currentTopic: 'Linear Equations in One Variable' },
    { subject: 'Science & Physics', teacher: 'Mrs. Shabana Khan', totalChapters: 14, completedChapters: 5, pct: 38, status: 'BEHIND', currentTopic: 'Force and Pressure (Chapter 4)' },
    { subject: 'English Language', teacher: 'Mr. Tariq Siddiqui', totalChapters: 10, completedChapters: 7, pct: 74, status: 'ON_TRACK', currentTopic: 'Direct and Indirect Speech' },
    { subject: 'Social Science', teacher: 'Mrs. Pooja Deshmukh', totalChapters: 16, completedChapters: 10, pct: 62, status: 'ON_TRACK', currentTopic: 'Our Past: The Nationalist Movement' },
    { subject: 'Hindi / Urdu Literature', teacher: 'Mr. Zubair Ali', totalChapters: 12, completedChapters: 9, pct: 75, status: 'AHEAD', currentTopic: 'Prose & Ghazal Analysis' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-lg font-bold text-slate-900">Academic Schedule & Syllabus Speedometer</h1>
          <p className="text-xs text-slate-500">Weekly conflict-free master timetable & chapter progress tracking</p>
        </div>

        <div className="flex bg-white p-1 rounded-xl border border-slate-200 shadow-sm text-xs font-bold">
          <button
            onClick={() => setActiveTab('TIMETABLE')}
            className={`px-4 py-2 rounded-lg transition-all flex items-center gap-1.5 ${
              activeTab === 'TIMETABLE' ? 'bg-blue-600 text-white shadow' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Calendar size={14} /> Master Timetable
          </button>
          <button
            onClick={() => setActiveTab('SYLLABUS')}
            className={`px-4 py-2 rounded-lg transition-all flex items-center gap-1.5 ${
              activeTab === 'SYLLABUS' ? 'bg-blue-600 text-white shadow' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Clock size={14} /> Syllabus Speedometer
          </button>
        </div>
      </div>

      {/* Class Selector Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3 text-xs">
          <span className="font-bold text-slate-500 uppercase">Select Class:</span>
          {['Class 6', 'Class 7', 'Class 8', 'Class 9', 'Class 10'].map((cls) => (
            <button
              key={cls}
              onClick={() => setSelectedClass(cls)}
              className={`px-3 py-1.5 rounded-lg font-bold transition-colors ${
                selectedClass === cls ? 'bg-blue-100 text-blue-800' : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
              }`}
            >
              {cls}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 text-xs">
          <span className="font-bold text-slate-500 uppercase">Section:</span>
          {['A', 'B'].map((sec) => (
            <button
              key={sec}
              onClick={() => setSelectedSection(sec)}
              className={`px-2.5 py-1 rounded-lg font-bold transition-colors ${
                selectedSection === sec ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-700'
              }`}
            >
              Sec {sec}
            </button>
          ))}
        </div>
      </div>

      {/* TAB 1: MASTER TIMETABLE */}
      {activeTab === 'TIMETABLE' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden text-xs">
          <div className="p-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center font-bold text-slate-800">
            <span>Weekly Class Schedule — {selectedClass} (Section {selectedSection})</span>
            <button
              onClick={() => window.print()}
              className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-slate-700 hover:bg-slate-50 flex items-center gap-1 text-xs shadow-sm font-semibold"
            >
              <Printer size={13} /> Print Timetable
            </button>
          </div>

          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-100/70 border-b border-slate-200 text-slate-600 font-bold uppercase text-[10px]">
                <th className="py-3 px-3 w-28">Period</th>
                <th className="py-3 px-3">Monday</th>
                <th className="py-3 px-3">Tuesday</th>
                <th className="py-3 px-3">Wednesday</th>
                <th className="py-3 px-3">Thursday</th>
                <th className="py-3 px-3">Friday</th>
                <th className="py-3 px-3">Saturday</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {periods.map((p) => (
                <tr key={p.no} className="hover:bg-blue-50/30 transition-colors">
                  <td className="py-3.5 px-3 bg-slate-50/60 font-mono font-bold text-slate-700">
                    <div>Period {p.no}</div>
                    <div className="text-[10px] text-slate-400 font-normal">{p.time}</div>
                  </td>
                  <td className="py-3.5 px-3 font-semibold text-slate-900">{p.mon}</td>
                  <td className="py-3.5 px-3 font-semibold text-slate-900">{p.tue}</td>
                  <td className="py-3.5 px-3 font-semibold text-slate-900">{p.wed}</td>
                  <td className="py-3.5 px-3 font-semibold text-slate-900">{p.thu}</td>
                  <td className="py-3.5 px-3 font-semibold text-slate-900">{p.fri}</td>
                  <td className="py-3.5 px-3 font-semibold text-slate-700 bg-amber-50/40">{p.sat}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* TAB 2: SYLLABUS SPEEDOMETER */}
      {activeTab === 'SYLLABUS' && (
        <div className="space-y-4">
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
                    <span className="text-slate-700">{s.completedChapters} of {s.totalChapters} Chapters Completed</span>
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
    </div>
  );
};
