import React, { useState, useEffect } from 'react';
import { FileText, Printer, Search, ShieldCheck, CreditCard, Award, ArrowUpRight } from 'lucide-react';
import api from '../../api/client';

export const DocumentCenter = () => {
  const [students, setStudents] = useState([]);
  const [classes, setClasses] = useState([]);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedClass, setSelectedClass] = useState('');
  const [leavingReason, setLeavingReason] = useState('Parent Relocation / Transferred to another city');
  const [conduct, setConduct] = useState('EXCELLENT');

  // Load Classes
  useEffect(() => {
    const fetchClasses = async () => {
      try {
        const res = await api.get('/academics/classes');
        if (res.data) {
          setClasses(res.data);
          if (res.data.length > 0) setSelectedClass(res.data[0].id);
        }
      } catch (e) {
        console.log(e);
      }
    };
    fetchClasses();
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
                  href={`/api/v1/documents/transfer-certificate/${selectedStudent.id}/html?leaving_reason=${encodeURIComponent(leavingReason)}&conduct=${encodeURIComponent(conduct)}`}
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
              href={`/api/v1/documents/id-cards/batch/html?class_id=${selectedClass}`}
              target="_blank"
              rel="noreferrer"
              className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2.5 rounded-lg transition-colors shadow"
            >
              <Printer size={14} />
              <span>Generate Printable ID Cards Sheet</span>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};
