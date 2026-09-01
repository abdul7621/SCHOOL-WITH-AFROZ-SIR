import React, { useState } from 'react';
import {
  X,
  User,
  Calendar,
  CreditCard,
  Award,
  FileText,
  Phone,
  MessageCircle,
  CheckCircle2,
  AlertCircle,
  Printer,
  ShieldCheck,
  Star,
} from 'lucide-react';

export const Student360Drawer = ({ student, isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState('overview');

  if (!isOpen || !student) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-slate-900/60 backdrop-blur-sm flex justify-end">
      <div className="bg-white w-full max-w-2xl h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
        {/* Header */}
        <div className="p-6 bg-slate-900 text-white flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-blue-600 flex items-center justify-center font-black text-2xl text-white shadow-lg">
              {student.full_name?.charAt(0) || 'S'}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-black">{student.full_name}</h2>
                <span className="bg-emerald-500/20 text-emerald-300 text-[10px] font-bold px-2 py-0.5 rounded-full border border-emerald-500/30">
                  ACTIVE
                </span>
              </div>
              <div className="text-xs text-slate-400 mt-0.5">
                Adm No: <span className="font-mono text-blue-400 font-bold">{student.admission_no}</span> &bull; {student.class_name} ({student.section_name}) &bull; Roll #{student.roll_no || 1}
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-800 rounded-xl text-slate-400 hover:text-white transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-slate-200 px-6 bg-slate-50 text-xs font-bold text-slate-600">
          <button
            onClick={() => setActiveTab('overview')}
            className={`py-3.5 px-3 border-b-2 transition-all flex items-center gap-1.5 ${
              activeTab === 'overview' ? 'border-blue-600 text-blue-600' : 'border-transparent'
            }`}
          >
            <User size={14} /> Profile & Bio
          </button>
          <button
            onClick={() => setActiveTab('attendance')}
            className={`py-3.5 px-3 border-b-2 transition-all flex items-center gap-1.5 ${
              activeTab === 'attendance' ? 'border-blue-600 text-blue-600' : 'border-transparent'
            }`}
          >
            <Calendar size={14} /> Attendance History
          </button>
          <button
            onClick={() => setActiveTab('fees')}
            className={`py-3.5 px-3 border-b-2 transition-all flex items-center gap-1.5 ${
              activeTab === 'fees' ? 'border-blue-600 text-blue-600' : 'border-transparent'
            }`}
          >
            <CreditCard size={14} /> Fee Ledger
          </button>
          <button
            onClick={() => setActiveTab('academics')}
            className={`py-3.5 px-3 border-b-2 transition-all flex items-center gap-1.5 ${
              activeTab === 'academics' ? 'border-blue-600 text-blue-600' : 'border-transparent'
            }`}
          >
            <Award size={14} /> Exams & Ratings
          </button>
          <button
            onClick={() => setActiveTab('documents')}
            className={`py-3.5 px-3 border-b-2 transition-all flex items-center gap-1.5 ${
              activeTab === 'documents' ? 'border-blue-600 text-blue-600' : 'border-transparent'
            }`}
          >
            <FileText size={14} /> TC & ID Card
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 text-xs">
          {/* TAB 1: Overview */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200">
                  <span className="text-slate-400 font-semibold uppercase text-[10px]">Gender & Blood</span>
                  <div className="font-bold text-slate-900 mt-1">{student.gender || 'MALE'} &bull; {student.blood_group || 'O+'}</div>
                </div>
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200">
                  <span className="text-slate-400 font-semibold uppercase text-[10px]">Date of Birth</span>
                  <div className="font-bold text-slate-900 mt-1">{student.dob || '2015-05-14'}</div>
                </div>
              </div>

              {/* Family & Contact Card */}
              <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-sm space-y-3">
                <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider flex items-center gap-2">
                  <Phone size={14} className="text-blue-600" /> Parent & Emergency Contact
                </h4>
                <div className="space-y-2 text-slate-700">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Father Name:</span>
                    <span className="font-bold text-slate-900">{student.father_name || 'Farhan Khan'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Mother Name:</span>
                    <span className="font-bold text-slate-900">{student.mother_name || 'Shabana Khan'}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400">Primary Phone:</span>
                    <div className="flex items-center gap-2 font-mono font-bold text-blue-700">
                      <span>{student.primary_phone || '9876543210'}</span>
                      <a
                        href={`https://wa.me/91${student.primary_phone || '9876543210'}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-emerald-600 hover:text-emerald-500"
                      >
                        <MessageCircle size={14} />
                      </a>
                    </div>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Residential Address:</span>
                    <span className="text-slate-700">{student.address || 'Civil Lines, Main Campus'}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: Attendance Heatmap */}
          {activeTab === 'attendance' && (
            <div className="space-y-6">
              <div className="p-5 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold text-emerald-800 uppercase">Overall Term Attendance</div>
                  <div className="text-2xl font-black text-emerald-950 mt-1">94.2%</div>
                  <div className="text-[11px] text-emerald-700 mt-0.5">24 Present &bull; 2 Absent &bull; 1 Late</div>
                </div>
                <div className="text-3xl">📅</div>
              </div>

              {/* 30-Day Grid */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3">
                <div className="font-bold text-slate-900">Recent 30 Days Attendance Matrix</div>
                <div className="grid grid-cols-6 gap-2 text-center font-mono text-[11px] font-bold">
                  {Array.from({ length: 24 }).map((_, i) => (
                    <div
                      key={i}
                      className={`p-2 rounded-lg ${
                        i === 4 || i === 18
                          ? 'bg-rose-100 text-rose-800 border border-rose-200'
                          : i === 11
                          ? 'bg-amber-100 text-amber-800 border border-amber-200'
                          : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                      }`}
                    >
                      Day {i + 1}
                      <div className="text-[9px] mt-0.5">{i === 4 || i === 18 ? 'ABS' : i === 11 ? 'LATE' : 'PRES'}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: Fee Ledger */}
          {activeTab === 'fees' && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-blue-50 rounded-2xl border border-blue-200">
                  <div className="text-slate-500 font-semibold text-[10px] uppercase">Total Paid</div>
                  <div className="text-xl font-black text-blue-900 mt-1">₹13,500</div>
                </div>
                <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-200">
                  <div className="text-emerald-700 font-semibold text-[10px] uppercase">Pending Balance</div>
                  <div className="text-xl font-black text-emerald-900 mt-1">₹0.00 (All Clear)</div>
                </div>
              </div>

              <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
                <div className="p-3.5 bg-slate-50 font-bold border-b border-slate-200">Recent Fee Receipts</div>
                <div className="divide-y divide-slate-100">
                  <div className="p-3 flex justify-between items-center">
                    <div>
                      <div className="font-mono font-bold text-blue-700">RCP-2026-1042</div>
                      <div className="text-slate-400 text-[10px]">Quarter 1 Tuition Fee &bull; UPI</div>
                    </div>
                    <div className="text-right">
                      <div className="font-black text-emerald-600">₹4,500.00</div>
                      <span className="text-[9px] bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded font-bold">CONFIRMED</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: Academics & Qualitative Ratings */}
          {activeTab === 'academics' && (
            <div className="space-y-6">
              <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-sm space-y-3">
                <div className="flex justify-between items-center">
                  <div className="font-bold text-slate-900">Mid-Term Examination Result</div>
                  <span className="px-2.5 py-1 bg-emerald-100 text-emerald-800 rounded-md font-bold text-[10px]">PASSED (88.4%)</span>
                </div>
                <div className="grid grid-cols-2 gap-2 font-medium">
                  <div className="p-2 bg-slate-50 rounded-lg flex justify-between">
                    <span>Mathematics:</span> <strong>92/100 (A1)</strong>
                  </div>
                  <div className="p-2 bg-slate-50 rounded-lg flex justify-between">
                    <span>Science:</span> <strong>86/100 (A2)</strong>
                  </div>
                  <div className="p-2 bg-slate-50 rounded-lg flex justify-between">
                    <span>English:</span> <strong>89/100 (A2)</strong>
                  </div>
                  <div className="p-2 bg-slate-50 rounded-lg flex justify-between">
                    <span>Social Science:</span> <strong>87/100 (A2)</strong>
                  </div>
                </div>
              </div>

              {/* 5-Star Behavioral Ratings */}
              <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-sm space-y-3">
                <div className="font-bold text-slate-900">Qualitative Behavioral Assessment</div>
                <div className="space-y-2">
                  <div className="flex justify-between items-center py-1.5 border-b border-slate-100">
                    <span>Cleanliness & Hygiene</span>
                    <span className="text-amber-500 font-bold">★★★★★ (5/5)</span>
                  </div>
                  <div className="flex justify-between items-center py-1.5 border-b border-slate-100">
                    <span>Discipline & Punctuality</span>
                    <span className="text-amber-500 font-bold">★★★★☆ (4/5)</span>
                  </div>
                  <div className="flex justify-between items-center py-1.5 border-b border-slate-100">
                    <span>Leadership & Teamwork</span>
                    <span className="text-amber-500 font-bold">★★★★★ (5/5)</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: Documents Vault */}
          {activeTab === 'documents' && (
            <div className="space-y-4">
              <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
                <div>
                  <div className="font-bold text-slate-900">School Leaving / Transfer Certificate (TC)</div>
                  <div className="text-slate-400 text-[10px]">With official security border and anti-tamper QR code verification</div>
                </div>
                <a
                  href={`/api/v1/documents/transfer-certificate/${student.id}/html`}
                  target="_blank"
                  rel="noreferrer"
                  className="px-3.5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold flex items-center gap-1.5 shadow"
                >
                  <Printer size={13} /> Print TC
                </a>
              </div>

              <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
                <div>
                  <div className="font-bold text-slate-900">Student Identity Card (CR-80 Format)</div>
                  <div className="text-slate-400 text-[10px]">Front + Back with photo box, emergency phone, and blood group</div>
                </div>
                <a
                  href={`/api/v1/documents/id-cards/batch/html?class_id=${student.class_id || ''}`}
                  target="_blank"
                  rel="noreferrer"
                  className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold flex items-center gap-1.5 shadow"
                >
                  <Printer size={13} /> Print ID Card
                </a>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
