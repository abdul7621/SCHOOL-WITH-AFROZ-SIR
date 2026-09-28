import React, { useState, useEffect } from 'react';
import { FileText, Printer, Search, ShieldCheck, CreditCard, Award, ArrowUpRight, Download, BookOpen, Sparkles, Database } from 'lucide-react';
import api from '../../api/client';

export const DocumentCenter = () => {
  const [students, setStudents] = useState([]);
  const [classes, setClasses] = useState([]);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedClass, setSelectedClass] = useState('');
  const [grClass, setGrClass] = useState('');
  const [udiseClass, setUdiseClass] = useState('');
  const [examTerms, setExamTerms] = useState([]);
  const [selectedTermId, setSelectedTermId] = useState('');
  const [leavingReason, setLeavingReason] = useState('Parent Relocation / Transferred to another city');
  const [conduct, setConduct] = useState('EXCELLENT');

  // Load Classes and Exam Terms
  useEffect(() => {
    const fetchInitial = async () => {
      try {
        const [clsRes, termRes] = await Promise.all([
          api.get('/academics/classes'),
          api.get('/exams/terms').catch(() => ({ data: [] })),
        ]);
        if (clsRes.data) {
          setClasses(clsRes.data);
          if (clsRes.data.length > 0) setSelectedClass(clsRes.data[0].id);
        }
        const tList = termRes?.data?.data || termRes?.data || [];
        if (Array.isArray(tList) && tList.length > 0) {
          setExamTerms(tList);
          setSelectedTermId(tList[0].id);
        }
      } catch (e) {
        console.log(e);
      }
    };
    fetchInitial();
  }, []);

  // Search Students
  useEffect(() => {
    if (searchQuery.length > 2) {
      const search = async () => {
        try {
          const res = await api.get('/students', { params: { search: searchQuery } });
          if (res.data) setStudents(res.data);
        } catch (e) {
          console.log(e);
        }
      };
      search();
    }
  }, [searchQuery]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg font-bold text-slate-900 flex items-center gap-2">
          <FileText size={20} className="text-blue-600" />
          <span>Official Documents & Certificate Generation Vault</span>
        </h1>
        <p className="text-xs text-slate-500">School Leaving Transfer Certificates (TC), Batch ID Cards, and Legal Transcripts</p>
      </div>

      {/* 2-Column Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Card 1: Transfer Certificate Generator */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
            <ShieldCheck size={18} className="text-blue-600" />
            <h3 className="font-bold text-slate-900 text-sm">Issue School Transfer Certificate (TC)</h3>
          </div>

          <div className="space-y-3 text-xs">
            <div>
              <label className="block text-slate-700 font-semibold mb-1">Search Student by Name or Admission No</label>
              <div className="relative">
                <Search size={14} className="absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Type student name..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                />
              </div>

              {students.length > 0 && !selectedStudent && (
                <div className="mt-2 divide-y divide-slate-100 border border-slate-100 rounded-lg max-h-36 overflow-y-auto">
                  {students.map((st) => (
                    <div
                      key={st.id}
                      onClick={() => { setSelectedStudent(st); setStudents([]); }}
                      className="p-2 hover:bg-blue-50 cursor-pointer font-medium"
                    >
                      <span className="font-bold text-blue-700">{st.admission_no}</span> — {st.full_name} ({st.class_name})
                    </div>
                  ))}
                </div>
              )}
            </div>

            {selectedStudent && (
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl space-y-2">
                <div className="flex justify-between items-center">
                  <div className="font-bold text-blue-900">{selectedStudent.full_name}</div>
                  <button onClick={() => setSelectedStudent(null)} className="text-blue-600 hover:underline">Change</button>
                </div>
                <div className="text-slate-600">Admission No: {selectedStudent.admission_no} | Class: {selectedStudent.class_name}</div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Reason for Leaving School</label>
                  <input
                    type="text"
                    value={leavingReason}
                    onChange={(e) => setLeavingReason(e.target.value)}
                    className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">General Conduct / Remarks</label>
                  <select
                    value={conduct}
                    onChange={(e) => setConduct(e.target.value)}
                    className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg font-semibold"
                  >
                    <option value="EXCELLENT">EXCELLENT</option>
                    <option value="VERY GOOD">VERY GOOD</option>
                    <option value="GOOD">GOOD</option>
                    <option value="SATISFACTORY">SATISFACTORY</option>
                  </select>
                </div>

                <a
                  href={`/api/v1/documents/transfer-certificate/${selectedStudent.id}/html?leaving_reason=${encodeURIComponent(leavingReason)}&conduct=${encodeURIComponent(conduct)}&token=${encodeURIComponent(localStorage.getItem('token') || '')}&tenant_slug=${encodeURIComponent(localStorage.getItem('tenant_slug') || '7aschoolerpuat')}`}
                  target="_blank"
                  rel="noreferrer"
                  className="w-full flex items-center justify-center gap-2 mt-2 bg-blue-600 hover:bg-blue-500 text-white font-bold py-2 rounded-lg transition-colors"
                >
                  <Printer size={14} />
                  <span>Generate Official TC Preview</span>
                </a>
              </div>
            )}
          </div>
        </div>

        {/* Card 2: Batch Student ID Card Generator */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
            <CreditCard size={18} className="text-emerald-600" />
            <h3 className="font-bold text-slate-900 text-sm">Batch Student ID Card Sheet (CR-80 Format)</h3>
          </div>

          <div className="space-y-4 text-xs">
            <p className="text-slate-600 leading-relaxed">
              Generates high-resolution printable ID cards sheet for an entire class with student photo box, emergency phone, blood group, and principal authorization seal.
            </p>

            <div>
              <label className="block text-slate-700 font-semibold mb-1">Select Class for Batch Printing</label>
              <select
                value={selectedClass}
                onChange={(e) => setSelectedClass(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg font-semibold text-slate-800"
              >
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            <a
              href={`/api/v1/documents/id-cards/batch/html?class_id=${selectedClass}&token=${encodeURIComponent(localStorage.getItem('token') || '')}&tenant_slug=${encodeURIComponent(localStorage.getItem('tenant_slug') || '7aschoolerpuat')}`}
              target="_blank"
              rel="noreferrer"
              className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2.5 rounded-lg transition-colors shadow"
            >
              <Printer size={14} />
              <span>Generate Printable ID Cards Sheet</span>
            </a>
          </div>
        </div>

        {/* Card 3: Student Cumulative Fee Card */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
            <CreditCard size={18} className="text-indigo-600" />
            <h3 className="font-bold text-slate-900 text-sm">Student Cumulative Fee Card (PDF 3 Sec 13)</h3>
          </div>

          <div className="space-y-4 text-xs">
            <p className="text-slate-600 leading-relaxed">
              Generates official statement of account showing demands, installment periods, payment receipts, concessions, late fines, and net outstanding dues balance.
            </p>

            {selectedStudent ? (
              <div className="p-3 bg-indigo-50 border border-indigo-200 rounded-xl space-y-2">
                <div className="font-bold text-indigo-900">{selectedStudent.full_name}</div>
                <div className="text-slate-600">Admission No: {selectedStudent.admission_no} | Class: {selectedStudent.class_name}</div>
                <a
                  href={`/api/v1/documents/fee-card/${selectedStudent.id}/html?token=${encodeURIComponent(localStorage.getItem('token') || '')}&tenant_slug=${encodeURIComponent(localStorage.getItem('tenant_slug') || '7aschoolerpuat')}`}
                  target="_blank"
                  rel="noreferrer"
                  className="w-full flex items-center justify-center gap-2 mt-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-2 rounded-lg transition-colors shadow"
                >
                  <Printer size={14} />
                  <span>Generate Printable Fee Card</span>
                </a>
              </div>
            ) : (
              <div className="p-4 bg-slate-50 border border-dashed border-slate-200 rounded-xl text-center text-slate-500">
                Please search and select a student in Card 1 to preview and print their cumulative Fee Card.
              </div>
            )}
          </div>
        </div>

        {/* Card 4: Academic Progress Report Card */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
            <Award size={18} className="text-purple-600" />
            <h3 className="font-bold text-slate-900 text-sm">Academic Progress Report Card</h3>
          </div>

          <div className="space-y-4 text-xs">
            <p className="text-slate-600 leading-relaxed">
              Generates official student examination progress report and transcript with grading breakdown, subject marks, qualitative development ratings, and pass/fail summary.
            </p>

            {examTerms.length > 0 && (
              <div>
                <label className="block text-slate-700 font-semibold mb-1">Select Exam Term</label>
                <select
                  value={selectedTermId}
                  onChange={(e) => setSelectedTermId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg font-semibold text-slate-800"
                >
                  {examTerms.map((t) => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              </div>
            )}

            {selectedStudent ? (
              <div className="p-3 bg-purple-50 border border-purple-200 rounded-xl space-y-2">
                <div className="font-bold text-purple-900">{selectedStudent.full_name}</div>
                <div className="text-slate-600">Admission No: {selectedStudent.admission_no} | Class: {selectedStudent.class_name}</div>
                <a
                  href={`/api/v1/documents/report-card/${selectedTermId || examTerms[0]?.id}/${selectedStudent.id}/html?token=${encodeURIComponent(localStorage.getItem('token') || '')}&tenant_slug=${encodeURIComponent(localStorage.getItem('tenant_slug') || '7aschoolerpuat')}`}
                  target="_blank"
                  rel="noreferrer"
                  className="w-full flex items-center justify-center gap-2 mt-2 bg-purple-600 hover:bg-purple-500 text-white font-bold py-2 rounded-lg transition-colors shadow"
                >
                  <Printer size={14} />
                  <span>Generate Printable Report Card</span>
                </a>
              </div>
            ) : (
              <div className="p-4 bg-slate-50 border border-dashed border-slate-200 rounded-xl text-center text-slate-500">
                Please search and select a student in Card 1 to preview and print their Academic Report Card.
              </div>
            )}
          </div>
        </div>

        {/* Card 5: Statutory 2-Page General Register (G.R. Ledger) */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
            <BookOpen size={18} className="text-amber-600" />
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-slate-900 text-sm">Statutory 2-Page General Register (G.R. Ledger Book)</h3>
              <span className="bg-amber-100 text-amber-800 font-extrabold text-[10px] px-2 py-0.5 rounded-md">GAZETTE A3 SPREAD</span>
            </div>
          </div>

          <div className="space-y-4 text-xs">
            <p className="text-slate-600 leading-relaxed">
              Official 2-page landscape dual spread (Left Page: Student Name breakdown, Caste, Birthplace, DOB in words, APAAR & Aadhaar ID; Right Page: 18-digit Gujarat UID, PEN, Previous School, RTE quota, Conduct & Discharge).
            </p>

            <div>
              <label className="block text-slate-700 font-semibold mb-1">Filter by Class (Optional)</label>
              <select
                value={grClass}
                onChange={(e) => setGrClass(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg font-semibold text-slate-800"
              >
                <option value="">-- All Classes & Enrolled Students --</option>
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            <a
              href={`/api/v1/documents/general-register/html?${grClass ? `class_id=${grClass}&` : ''}token=${encodeURIComponent(localStorage.getItem('token') || '')}&tenant_slug=${encodeURIComponent(localStorage.getItem('tenant_slug') || '7aschoolerpuat')}`}
              target="_blank"
              rel="noreferrer"
              className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-white font-bold py-2.5 rounded-lg transition-all shadow"
            >
              <Printer size={14} />
              <span>Open Statutory G.R. Ledger Book (A3 Landscape)</span>
            </a>
          </div>
        </div>

        {/* Card 6: UDISE+ SDMS 1-Click Schema Exporter */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
            <Database size={18} className="text-blue-600" />
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-slate-900 text-sm">UDISE+ SDMS 1-Click Schema Bulk Exporter</h3>
              <span className="bg-blue-100 text-blue-800 font-extrabold text-[10px] px-2 py-0.5 rounded-md">NIC 35-COLUMNS</span>
            </div>
          </div>

          <div className="space-y-4 text-xs">
            <p className="text-slate-600 leading-relaxed">
              Instantly generates the official 35-column Ministry of Education UDISE+ SDMS student spreadsheet with 11-digit PEN, APAAR ID, RTE quota, Aadhaar verification, and demographic codes for state portal uploads.
            </p>

            <div>
              <label className="block text-slate-700 font-semibold mb-1">Filter by Class (Optional)</label>
              <select
                value={udiseClass}
                onChange={(e) => setUdiseClass(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg font-semibold text-slate-800"
              >
                <option value="">-- All Enrolled Students (Full School) --</option>
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            <a
              href={`/api/v1/excel/export/udise-plus?${udiseClass ? `class_id=${udiseClass}&` : ''}token=${encodeURIComponent(localStorage.getItem('token') || '')}&tenant_slug=${encodeURIComponent(localStorage.getItem('tenant_slug') || '7aschoolerpuat')}`}
              target="_blank"
              rel="noreferrer"
              className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-bold py-2.5 rounded-lg transition-colors shadow"
            >
              <Download size={14} />
              <span>Download Official UDISE+ SDMS Excel File</span>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};

