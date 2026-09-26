import React, { useState, useEffect } from 'react';
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
  Lock,
  Unlock,
  ShieldAlert,
  Wallet,
} from 'lucide-react';
import api from '../../api/client';

export const Student360Drawer = ({ student, isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState('overview');
  const [ledger, setLedger] = useState(null);
  const [loadingLedger, setLoadingLedger] = useState(false);
  const [attendanceSummary, setAttendanceSummary] = useState(null);
  const [loadingAttendance, setLoadingAttendance] = useState(false);
  const [examTerms, setExamTerms] = useState([]);
  const [selectedTermId, setSelectedTermId] = useState('');
  const [examReport, setExamReport] = useState(null);
  const [loadingExams, setLoadingExams] = useState(false);

  // Principal Fee Waiver Modal States (FIX-08)
  const [showWaiverModal, setShowWaiverModal] = useState(false);
  const [waiverReason, setWaiverReason] = useState('');
  const [waivingDues, setWaivingDues] = useState(false);
  const [waiverSuccess, setWaiverSuccess] = useState('');

  const token = localStorage.getItem('token') || '';
  const tenantSlug = localStorage.getItem('tenant_slug') || '7aschoolerpuat';

  // Check user authorization for Principal actions
  const userStr = localStorage.getItem('user');
  let userObj = null;
  try {
    userObj = userStr ? JSON.parse(userStr) : null;
  } catch (e) {}
  const userRoles = userObj?.roles || (userObj?.role ? [userObj.role] : []);
  const isPrivileged = userRoles.some((r) => ['ADMIN', 'PRINCIPAL', 'SUPERADMIN'].includes(r));

  useEffect(() => {
    if (isOpen && student?.id && (activeTab === 'fees' || activeTab === 'documents')) {
      const fetchLedger = async () => {
        setLoadingLedger(true);
        try {
          const res = await api.get(`/fees/ledger/${student.id}`);
          if (res.data) setLedger(res.data);
        } catch (err) {
          console.error('Error loading ledger in drawer:', err);
        } finally {
          setLoadingLedger(false);
        }
      };
      fetchLedger();
    }
  }, [isOpen, student?.id, activeTab]);

  useEffect(() => {
    if (isOpen && student?.id && activeTab === 'attendance') {
      const fetchAttendance = async () => {
        setLoadingAttendance(true);
        try {
          const res = await api.get(`/attendance/students/${student.id}/summary`);
          const attData = res?.data?.data || res?.data;
          if (attData) {
            setAttendanceSummary(attData);
          }
        } catch (err) {
          console.error('Error loading attendance summary in drawer:', err);
        } finally {
          setLoadingAttendance(false);
        }
      };
      fetchAttendance();
    }
  }, [isOpen, student?.id, activeTab]);

  useEffect(() => {
    if (isOpen && student?.id && activeTab === 'academics') {
      const fetchExams = async () => {
        setLoadingExams(true);
        try {
          const termsRes = await api.get('/exams/terms');
          const terms = Array.isArray(termsRes?.data) ? termsRes.data : (termsRes?.data?.data || []);
          setExamTerms(terms);
          const activeTerm = selectedTermId || (terms.length > 0 ? terms[0].id : null);
          if (activeTerm) {
            setSelectedTermId(activeTerm);
            const reportRes = await api.get(`/exams/terms/${activeTerm}/students/${student.id}/report-card`);
            const repData = reportRes?.data?.data || reportRes?.data;
            if (repData) {
              setExamReport(repData);
            }
          }
        } catch (err) {
          console.error('Error loading exam report in drawer:', err);
        } finally {
          setLoadingExams(false);
        }
      };
      fetchExams();
    }
  }, [isOpen, student?.id, activeTab]);

  const handleSelectTerm = async (termId) => {
    setSelectedTermId(termId);
    if (!termId || !student?.id) return;
    setLoadingExams(true);
    try {
      const reportRes = await api.get(`/exams/terms/${termId}/students/${student.id}/report-card`);
      const repData = reportRes?.data?.data || reportRes?.data;
      if (repData) {
        setExamReport(repData);
      } else {
        setExamReport(null);
      }
    } catch (err) {
      console.error('Error fetching term report:', err);
      setExamReport(null);
    } finally {
      setLoadingExams(false);
    }
  };

  const handleWaiveDues = async (e) => {
    e.preventDefault();
    if (!waiverReason.trim()) return;
    setWaivingDues(true);
    try {
      await api.post('/fees/demands/waive', {
        student_id: student.id,
        waiver_reason: waiverReason.trim(),
      });
      setWaiverSuccess('Fee dues successfully waived by Principal authorization!');
      const res = await api.get(`/fees/ledger/${student.id}`);
      if (res.data) setLedger(res.data);
      setTimeout(() => {
        setShowWaiverModal(false);
        setWaiverSuccess('');
        setWaiverReason('');
      }, 1400);
    } catch (err) {
      alert(err.response?.data?.message || err.message || 'Failed to authorize waiver');
    } finally {
      setWaivingDues(false);
    }
  };

  if (!isOpen || !student) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-slate-900/60 backdrop-blur-sm flex justify-end">
      <div className="bg-white w-full max-w-2xl h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
        {/* Header */}
        <div className="p-6 bg-slate-900 text-white flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-blue-600 flex items-center justify-center font-black text-2xl text-white shadow-lg overflow-hidden shrink-0 border border-blue-400/30">
              {student.profile_photo_url ? (
                <img src={student.profile_photo_url} alt={student.full_name} className="w-full h-full object-cover" />
              ) : (
                student.full_name?.charAt(0) || 'S'
              )}
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
              {loadingAttendance ? (
                <div className="py-12 text-center text-slate-400 font-bold text-xs animate-pulse">
                  Loading live attendance metrics...
                </div>
              ) : (
                <>
                  <div className="p-5 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center justify-between">
                    <div>
                      <div className="text-xs font-bold text-emerald-800 uppercase">Overall Term Attendance</div>
                      <div className="text-2xl font-black text-emerald-950 mt-1">
                        {attendanceSummary ? `${attendanceSummary.attendance_percentage}%` : '0%'}
                      </div>
                      <div className="text-[11px] text-emerald-700 mt-0.5">
                        {attendanceSummary && attendanceSummary.total_sessions > 0 ? (
                          `${attendanceSummary.present_count} Present • ${attendanceSummary.absent_count} Absent • ${attendanceSummary.late_count} Late • ${attendanceSummary.half_day_count} Half-Day (${attendanceSummary.total_sessions} Total Sessions)`
                        ) : (
                          'No attendance records found'
                        )}
                      </div>
                    </div>
                    <div className="text-3xl">📅</div>
                  </div>

                  {/* Recent Attendance Grid */}
                  <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3">
                    <div className="font-bold text-slate-900">Recent Attendance Records (Last 30 Sessions)</div>
                    {attendanceSummary?.recent_records?.length > 0 ? (
                      <div className="grid grid-cols-5 sm:grid-cols-6 gap-2 text-center font-mono text-[11px] font-bold">
                        {attendanceSummary.recent_records.map((rec, i) => {
                          const isAbs = ['ABSENT', 'A'].includes(rec.status_code);
                          const isLate = ['LATE', 'L'].includes(rec.status_code);
                          const isHalf = ['HALF_DAY', 'HD'].includes(rec.status_code);

                          let badgeClass = 'bg-emerald-100 text-emerald-800 border border-emerald-200';
                          let label = 'PRES';

                          if (isAbs) {
                            badgeClass = 'bg-rose-100 text-rose-800 border border-rose-200';
                            label = 'ABS';
                          } else if (isLate) {
                            badgeClass = 'bg-amber-100 text-amber-800 border border-amber-200';
                            label = 'LATE';
                          } else if (isHalf) {
                            badgeClass = 'bg-purple-100 text-purple-800 border border-purple-200';
                            label = 'HALF';
                          }

                          return (
                            <div key={i} className={`p-2 rounded-lg ${badgeClass}`} title={`${rec.date} - ${rec.status_name}`}>
                              <div className="text-[10px] truncate">{rec.date ? rec.date.slice(5) : `D${i+1}`}</div>
                              <div className="text-[9px] mt-0.5">{label}</div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="p-8 text-center text-slate-400 text-xs">
                        No daily attendance records have been registered for this student yet.
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          )}

          {/* TAB 3: Fee Ledger */}
          {activeTab === 'fees' && (
            <div className="space-y-6">
              {loadingLedger ? (
                <div className="py-12 text-center text-slate-400 font-bold text-xs animate-pulse">
                  Loading live statement of account...
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="p-3.5 bg-blue-50 rounded-2xl border border-blue-200">
                      <div className="text-slate-500 font-semibold text-[10px] uppercase">Total Demanded</div>
                      <div className="text-lg font-black text-blue-900 mt-1">₹{ledger?.total_demanded?.toLocaleString() || '0'}</div>
                    </div>
                    <div className="p-3.5 bg-emerald-50 rounded-2xl border border-emerald-200">
                      <div className="text-emerald-700 font-semibold text-[10px] uppercase">Total Paid</div>
                      <div className="text-lg font-black text-emerald-900 mt-1">₹{ledger?.total_paid?.toLocaleString() || '0'}</div>
                    </div>
                    <div className="p-3.5 bg-purple-50 rounded-2xl border border-purple-200">
                      <div className="text-purple-700 font-semibold text-[10px] uppercase flex items-center gap-1">
                        <Wallet size={11} /> Advance Wallet
                      </div>
                      <div className="text-lg font-black text-purple-900 mt-1">₹{ledger?.advance_wallet_balance?.toLocaleString() || '0'}</div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-4 bg-slate-50 border border-slate-200 rounded-2xl">
                    <div>
                      <div className="text-[10px] uppercase font-bold text-slate-500">Net Outstanding Balance</div>
                      <div className={`text-xl font-black ${ledger?.net_balance_due > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                        ₹{ledger?.net_balance_due?.toLocaleString() || '0'} {ledger?.net_balance_due <= 0 && '(All Clear)'}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {ledger?.net_balance_due > 0 && isPrivileged && (
                        <button
                          type="button"
                          onClick={() => setShowWaiverModal(true)}
                          className="px-3 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-xl font-bold text-xs flex items-center gap-1 shadow"
                        >
                          <ShieldCheck size={13} /> Principal Waiver
                        </button>
                      )}
                      <a
                        href={`/api/v1/documents/fee-card/${student.id}/html?token=${encodeURIComponent(token)}&tenant_slug=${encodeURIComponent(tenantSlug)}`}
                        target="_blank"
                        rel="noreferrer"
                        className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold text-xs flex items-center gap-1.5 shadow"
                      >
                        <Printer size={13} /> Print Full Fee Card
                      </a>
                    </div>
                  </div>

                  <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
                    <div className="p-3.5 bg-slate-50 font-bold border-b border-slate-200 text-xs">Payment Receipts History</div>
                    <div className="divide-y divide-slate-100">
                      {ledger?.receipts?.length > 0 ? (
                        ledger.receipts.map((r) => (
                          <div key={r.id} className="p-3 flex justify-between items-center text-xs">
                            <div>
                              <div className="font-mono font-bold text-blue-700">{r.receipt_no}</div>
                              <div className="text-slate-400 text-[10px]">{r.collection_date} &bull; {r.payment_mode || 'Cash'}</div>
                            </div>
                            <div className="text-right">
                              <div className="font-black text-emerald-600">₹{r.total_amount_paid?.toLocaleString()}</div>
                              <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold ${
                                r.status === 'CONFIRMED' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                              }`}>
                                {r.status}
                              </span>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="p-6 text-center text-slate-400 text-xs">No payment receipts recorded yet.</div>
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          {/* TAB 4: Academics & Qualitative Ratings */}
          {activeTab === 'academics' && (
            <div className="space-y-6">
              {/* Term Selector */}
              {examTerms.length > 0 && (
                <div className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200 rounded-xl">
                  <span className="text-xs font-bold text-slate-700">Select Exam Term:</span>
                  <select
                    value={selectedTermId}
                    onChange={(e) => handleSelectTerm(e.target.value)}
                    className="px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-semibold text-slate-800 outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {examTerms.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {loadingExams ? (
                <div className="py-12 text-center text-slate-400 font-bold text-xs animate-pulse">
                  Loading live exam scores and evaluations...
                </div>
              ) : examReport ? (
                <>
                  <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-sm space-y-3">
                    <div className="flex justify-between items-center">
                      <div>
                        <div className="font-bold text-slate-900">
                          {examReport.school_info?.term_name || 'Examination Result'}
                        </div>
                        <div className="text-[10px] text-slate-400">
                          Academic Session: {examReport.school_info?.session_name || 'Current'}
                        </div>
                      </div>
                      <span className={`px-2.5 py-1 rounded-md font-bold text-[10px] ${
                        examReport.summary?.result === 'PASSED'
                          ? 'bg-emerald-100 text-emerald-800'
                          : examReport.summary?.result === 'IN_PROGRESS'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-rose-100 text-rose-800'
                      }`}>
                        {examReport.summary?.result || 'PENDING'} ({examReport.summary?.overall_percentage || 0}%)
                      </span>
                    </div>

                    {examReport.subject_scores?.length > 0 ? (
                      <div className="grid grid-cols-2 gap-2 font-medium">
                        {examReport.subject_scores.map((s) => (
                          <div key={s.subject_code} className="p-2 bg-slate-50 rounded-lg flex justify-between items-center">
                            <span className="truncate mr-2">{s.subject_name}:</span>
                            <strong className="shrink-0 text-slate-900">
                              {s.is_absent
                                ? 'AB (Absent)'
                                : s.marks_obtained !== null
                                ? `${s.marks_obtained}/${s.max_marks} (${s.grade_letter})`
                                : '-- (Pending)'}
                            </strong>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="p-4 text-center text-slate-400 text-xs">
                        No subject exams configured or marks entered for this term yet.
                      </div>
                    )}
                  </div>

                  {/* Qualitative Assessment */}
                  <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-sm space-y-3">
                    <div className="font-bold text-slate-900">Qualitative Behavioral Assessment</div>
                    {examReport.qualitative_development?.length > 0 ? (
                      <div className="space-y-2">
                        {examReport.qualitative_development.map((crit, idx) => (
                          <div key={idx} className="flex justify-between items-center py-1.5 border-b border-slate-100">
                            <span>{crit.criteria_name}</span>
                            <span className="text-amber-500 font-bold">{crit.rating_value || 'Satisfactory'}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="p-4 text-center text-slate-400 text-xs">
                        No qualitative behavioral ratings entered for this academic term yet.
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <div className="p-8 text-center text-slate-400 text-xs bg-slate-50 border border-dashed border-slate-200 rounded-2xl">
                  {examTerms.length === 0
                    ? 'No examination terms configured in the academic calendar.'
                    : 'Select an examination term above to view academic scores.'}
                </div>
              )}
            </div>
          )}

          {/* TAB 5: Documents Vault */}
          {activeTab === 'documents' && (
            <div className="space-y-4">
              {/* Dues Clearance Warning / Banner */}
              {ledger?.net_balance_due > 0 && (
                <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl flex items-center justify-between text-xs">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-700 flex items-center justify-center shrink-0">
                      <ShieldAlert size={18} />
                    </div>
                    <div>
                      <div className="font-bold text-amber-900">
                        Fee Dues Pending: ₹{ledger.net_balance_due?.toLocaleString()}
                      </div>
                      <div className="text-amber-700 text-[11px]">
                        School Leaving Certificate (TC) release is restricted until full clearance or Principal waiver.
                      </div>
                    </div>
                  </div>
                  {isPrivileged && (
                    <button
                      type="button"
                      onClick={() => setShowWaiverModal(true)}
                      className="px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-white rounded-lg font-bold text-xs shrink-0 shadow"
                    >
                      Authorize Waiver
                    </button>
                  )}
                </div>
              )}

              {/* 1. School Leaving / Transfer Certificate (TC) */}
              <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900">School Leaving / Transfer Certificate (TC)</span>
                    {ledger?.net_balance_due > 0 ? (
                      <span className="bg-rose-100 text-rose-800 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                        <Lock size={10} /> Dues Pending (₹{ledger.net_balance_due?.toLocaleString()})
                      </span>
                    ) : (
                      <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                        <CheckCircle2 size={10} /> No-Dues Cleared
                      </span>
                    )}
                  </div>
                  <div className="text-slate-400 text-[10px] mt-0.5">With official security border and anti-tamper QR code verification</div>
                </div>

                {ledger?.net_balance_due > 0 && !isPrivileged ? (
                  <button
                    disabled
                    title="Transfer Certificate cannot be printed while fee dues are pending"
                    className="px-3.5 py-2 bg-slate-100 text-slate-400 border border-slate-200 rounded-xl font-bold flex items-center gap-1.5 cursor-not-allowed text-xs"
                  >
                    <Lock size={13} /> TC Locked
                  </button>
                ) : (
                  <a
                    href={`/api/v1/documents/transfer-certificate/${student.id}/html?token=${encodeURIComponent(token)}&tenant_slug=${encodeURIComponent(tenantSlug)}`}
                    target="_blank"
                    rel="noreferrer"
                    className={`px-3.5 py-2 ${
                      ledger?.net_balance_due > 0
                        ? 'bg-amber-600 hover:bg-amber-500'
                        : 'bg-blue-600 hover:bg-blue-500'
                    } text-white rounded-xl font-bold flex items-center gap-1.5 shadow text-xs`}
                  >
                    <Printer size={13} /> {ledger?.net_balance_due > 0 ? 'Print TC (Override)' : 'Print TC'}
                  </a>
                )}
              </div>

              {/* 2. Student Identity Card */}
              <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
                <div>
                  <div className="font-bold text-slate-900">Student Identity Card (CR-80 Format)</div>
                  <div className="text-slate-400 text-[10px]">Front + Back with photo box, emergency phone, and blood group</div>
                </div>
                <a
                  href={`/api/v1/documents/id-cards/batch/html?class_id=${student.class_id || ''}&token=${encodeURIComponent(token)}&tenant_slug=${encodeURIComponent(tenantSlug)}`}
                  target="_blank"
                  rel="noreferrer"
                  className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold flex items-center gap-1.5 shadow text-xs"
                >
                  <Printer size={13} /> Print ID Card
                </a>
              </div>

              {/* 3. Student Cumulative Fee Card */}
              <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
                <div>
                  <div className="font-bold text-slate-900">Student Cumulative Fee Card / Statement of Account</div>
                  <div className="text-slate-400 text-[10px]">Complete billing ledger with demands, payments, concessions, and outstanding dues</div>
                </div>
                <a
                  href={`/api/v1/documents/fee-card/${student.id}/html?token=${encodeURIComponent(token)}&tenant_slug=${encodeURIComponent(tenantSlug)}`}
                  target="_blank"
                  rel="noreferrer"
                  className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold flex items-center gap-1.5 shadow text-xs"
                >
                  <Printer size={13} /> Print Fee Card
                </a>
              </div>
            </div>
          )}
        </div>

        {/* Principal Fee Waiver Modal */}
        {showWaiverModal && (
          <div className="fixed inset-0 z-[60] bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden border border-slate-200 animate-in zoom-in-95">
              <div className="p-5 bg-gradient-to-r from-amber-600 to-amber-700 text-white flex justify-between items-center">
                <div className="flex items-center gap-2.5">
                  <ShieldCheck size={20} />
                  <div>
                    <h3 className="font-black text-sm">Principal Fee Waiver Authorization</h3>
                    <p className="text-[10px] text-amber-200">Official clearance for Transfer Certificate / Hardship</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowWaiverModal(false)}
                  className="text-white/80 hover:text-white"
                >
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleWaiveDues} className="p-5 space-y-4">
                {waiverSuccess && (
                  <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs font-bold flex items-center gap-2">
                    <CheckCircle2 size={16} className="shrink-0" />
                    <span>{waiverSuccess}</span>
                  </div>
                )}

                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs space-y-1">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Student:</span>
                    <strong className="text-slate-800">{student.full_name} ({student.admission_no})</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Outstanding Balance:</span>
                    <strong className="text-rose-600 font-black">₹{ledger?.net_balance_due?.toLocaleString()}</strong>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Waiver Authorization Reason & Justification *
                  </label>
                  <textarea
                    rows={3}
                    required
                    value={waiverReason}
                    onChange={(e) => setWaiverReason(e.target.value)}
                    placeholder="e.g. Approved by School Management under EWS / Discretionary Hardship Category for TC Clearance."
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium text-slate-800 outline-none focus:ring-2 focus:ring-amber-500"
                  />
                  <span className="text-[10px] text-slate-400">
                    * This action is recorded in the immutable audit log under your Principal/Admin ID.
                  </span>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    disabled={waivingDues}
                    onClick={() => setShowWaiverModal(false)}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-xs"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={waivingDues || !waiverReason.trim()}
                    className="px-4 py-2 bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white rounded-xl font-bold text-xs shadow flex items-center gap-1.5"
                  >
                    {waivingDues ? 'Authorizing...' : 'Authorize Waiver & Clear Dues'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
