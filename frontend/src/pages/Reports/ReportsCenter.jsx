import React, { useState, useEffect } from 'react';
import {
  BarChart3,
  Download,
  Search,
  DollarSign,
  CalendarCheck,
  AlertTriangle,
  Filter,
  Printer,
  Phone,
  PhoneCall,
  History,
  CheckCircle2,
  Clock,
  X,
  Plus,
} from 'lucide-react';
import api from '../../api/client';

export const ReportsCenter = () => {
  const [activeTab, setActiveTab] = useState('defaulters');
  const [defaultersData, setDefaultersData] = useState(null);
  const [collectionsData, setCollectionsData] = useState(null);
  const [financeData, setFinanceData] = useState(null);
  const [loading, setLoading] = useState(false);

  const [academicYears, setAcademicYears] = useState([]);
  const [academicYearId, setAcademicYearId] = useState('');

  // Filters
  const [fromDate, setFromDate] = useState(new Date().toISOString().slice(0, 8) + '01');
  const [toDate, setToDate] = useState(new Date().toISOString().split('T')[0]);

  // Follow-up & Promise-to-Pay (PTP) State
  const [selectedStudentForFollowup, setSelectedStudentForFollowup] = useState(null);
  const [showFollowupModal, setShowFollowupModal] = useState(false);
  const [followupHistory, setFollowupHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [followupPhone, setFollowupPhone] = useState('');
  const [followupOutcome, setFollowupOutcome] = useState('PROMISED');
  const [followupPromiseDate, setFollowupPromiseDate] = useState('');
  const [followupPromisedAmount, setFollowupPromisedAmount] = useState('');
  const [followupNotes, setFollowupNotes] = useState('');
  const [savingFollowup, setSavingFollowup] = useState(false);

  const handleOpenFollowupModal = async (defaulter) => {
    setSelectedStudentForFollowup(defaulter);
    setFollowupPhone(defaulter.primary_phone || '');
    setFollowupOutcome('PROMISED');
    setFollowupPromiseDate(new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0]);
    setFollowupPromisedAmount(defaulter.total_outstanding_amount || '');
    setFollowupNotes('');
    setShowFollowupModal(true);
    setLoadingHistory(true);
    try {
      const res = await api.get(`/reports/fees/defaulters/${defaulter.student_id}/followups`);
      setFollowupHistory(res.data || []);
    } catch (err) {
      console.error('Error fetching followup history:', err);
      setFollowupHistory([]);
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleSaveFollowup = async (e) => {
    e.preventDefault();
    if (!selectedStudentForFollowup) return;
    setSavingFollowup(true);
    try {
      await api.post(`/reports/fees/defaulters/${selectedStudentForFollowup.student_id}/followup`, {
        contacted_phone: followupPhone.trim() || null,
        outcome: followupOutcome,
        promise_date: followupPromiseDate || null,
        promised_amount: followupPromisedAmount ? parseFloat(followupPromisedAmount) : null,
        notes: followupNotes.trim() || null,
      });
      alert('Fee follow-up call logged successfully!');
      setShowFollowupModal(false);
      fetchDefaulters();
    } catch (err) {
      alert('Failed to log follow-up: ' + (err.response?.data?.message || err.message));
    } finally {
      setSavingFollowup(false);
    }
  };

  // Load active academic year
  useEffect(() => {
    const fetchYears = async () => {
      try {
        const res = await api.get('/academics/years');
        if (res.data && res.data.length > 0) {
          setAcademicYears(res.data);
          const curr = res.data.find((y) => y.is_current) || res.data[0];
          setAcademicYearId(curr.id);
        }
      } catch (e) {
        console.log(e);
      }
    };
    fetchYears();
  }, []);

  const fetchDefaulters = async () => {
    setLoading(true);
    try {
      const res = await api.get('/reports/fees/defaulters', {
        params: academicYearId ? { academic_year_id: academicYearId } : { academic_year_id: 'default_year' },
      });
      if (res.data) setDefaultersData(res.data);
    } catch (e) {
      console.log(e);
    } finally {
      setLoading(false);
    }
  };

  const fetchCollections = async () => {
    setLoading(true);
    try {
      const res = await api.get('/reports/fees/collections', { params: { from_date: fromDate, to_date: toDate } });
      if (res.data) setCollectionsData(res.data);
    } catch (e) {
      console.log(e);
    } finally {
      setLoading(false);
    }
  };

  const fetchFinanceStatement = async () => {
    setLoading(true);
    try {
      const now = new Date();
      const res = await api.get('/reports/finance/income-expense', { params: { month: now.getMonth() + 1, year: now.getFullYear() } });
      if (res.data) setFinanceData(res.data);
    } catch (e) {
      console.log(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'defaulters') fetchDefaulters();
    if (activeTab === 'collections') fetchCollections();
    if (activeTab === 'finance') fetchFinanceStatement();
  }, [activeTab, academicYearId, fromDate, toDate]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <BarChart3 size={20} className="text-blue-600" />
            <span>Universal Analytics & Reporting Engine</span>
          </h1>
          <p className="text-xs text-slate-500">Comprehensive fee dues, collection registers, and financial statements</p>
        </div>

        <div className="flex bg-slate-200 p-1 rounded-xl text-xs font-semibold">
          <button
            onClick={() => setActiveTab('defaulters')}
            className={`px-3 py-1.5 rounded-lg transition-all ${
              activeTab === 'defaulters' ? 'bg-white text-rose-700 shadow font-bold' : 'text-slate-600'
            }`}
          >
            Fee Defaulters List
          </button>
          <button
            onClick={() => setActiveTab('collections')}
            className={`px-3 py-1.5 rounded-lg transition-all ${
              activeTab === 'collections' ? 'bg-white text-emerald-700 shadow font-bold' : 'text-slate-600'
            }`}
          >
            Collection Register
          </button>
          <button
            onClick={() => setActiveTab('finance')}
            className={`px-3 py-1.5 rounded-lg transition-all ${
              activeTab === 'finance' ? 'bg-white text-blue-700 shadow font-bold' : 'text-slate-600'
            }`}
          >
            Income vs Expense
          </button>
        </div>
      </div>

      {/* Content Tabs */}
      {activeTab === 'defaulters' && (
        <div className="space-y-4">
          {/* Defaulters Aggregate & Aging Ribbon */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            <div className="bg-rose-50 p-4 rounded-2xl border border-rose-200">
              <div className="text-[10px] font-bold text-rose-700 uppercase tracking-wider">Total Outstanding</div>
              <div className="text-xl font-black text-rose-950 mt-1">
                ₹{defaultersData?.total_outstanding_amount?.toLocaleString() || 0}
              </div>
              <div className="text-[10px] text-rose-600 mt-0.5 font-semibold">
                {defaultersData?.total_defaulters_count || 0} Defaulters
              </div>
            </div>

            <div className="bg-amber-50 p-4 rounded-2xl border border-amber-200">
              <div className="text-[10px] font-bold text-amber-700 uppercase tracking-wider">0 - 30 Days Overdue</div>
              <div className="text-xl font-black text-amber-950 mt-1">
                ₹{defaultersData?.aging_summary?.['0_30']?.toLocaleString() || 0}
              </div>
              <div className="text-[10px] text-amber-600 mt-0.5 font-medium">Recent Dues</div>
            </div>

            <div className="bg-orange-50 p-4 rounded-2xl border border-orange-200">
              <div className="text-[10px] font-bold text-orange-700 uppercase tracking-wider">31 - 60 Days Overdue</div>
              <div className="text-xl font-black text-orange-950 mt-1">
                ₹{defaultersData?.aging_summary?.['31_60']?.toLocaleString() || 0}
              </div>
              <div className="text-[10px] text-orange-600 mt-0.5 font-medium">1st Follow-up Window</div>
            </div>

            <div className="bg-red-50 p-4 rounded-2xl border border-red-200">
              <div className="text-[10px] font-bold text-red-700 uppercase tracking-wider">61 - 90 Days Overdue</div>
              <div className="text-xl font-black text-red-950 mt-1">
                ₹{defaultersData?.aging_summary?.['61_90']?.toLocaleString() || 0}
              </div>
              <div className="text-[10px] text-red-600 mt-0.5 font-medium">Notice Eligible</div>
            </div>

            <div className="bg-rose-950 text-white p-4 rounded-2xl border border-rose-900 shadow-md">
              <div className="text-[10px] font-bold text-rose-300 uppercase tracking-wider flex items-center gap-1">
                <AlertTriangle size={12} className="text-rose-400" />
                <span>90+ Days (Critical)</span>
              </div>
              <div className="text-xl font-black text-white mt-1">
                ₹{defaultersData?.aging_summary?.['90_plus']?.toLocaleString() || 0}
              </div>
              <div className="text-[10px] text-rose-300 mt-0.5 font-medium">Action Escalation</div>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-100 font-bold text-xs text-slate-800 flex flex-wrap justify-between items-center gap-3">
              <div>
                <span>Overdue Fee Defaulters Roster & Recovery Tracker</span>
                <span className="text-[11px] font-normal text-slate-400 ml-2">
                  (Showing Aging Buckets & Promise-to-Pay Logs)
                </span>
              </div>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-lg text-xs font-bold transition-colors shadow-sm"
                >
                  <Printer size={13} /> Print Roster
                </button>
                <a
                  href={`/api/v1/excel/export/students?token=${encodeURIComponent(localStorage.getItem('token') || '')}&tenant_slug=${encodeURIComponent(localStorage.getItem('tenant_slug') || '7aschoolerpuat')}`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1 text-emerald-700 hover:underline font-semibold"
                >
                  <Download size={14} /> Export to Excel
                </a>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider">
                    <th className="py-3 px-4">Adm No</th>
                    <th className="py-3 px-4">Student Name</th>
                    <th className="py-3 px-4">Class & Sec</th>
                    <th className="py-3 px-4">Parent Phone</th>
                    <th className="py-3 px-4">Aging Overdue</th>
                    <th className="py-3 px-4">Latest PTP / Call Status</th>
                    <th className="py-3 px-4 text-right">Balance Due</th>
                    <th className="py-3 px-4 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {defaultersData?.defaulters?.length > 0 ? (
                    defaultersData.defaulters.map((d) => {
                      const maxDays = d.max_overdue_days || 0;
                      const fup = d.latest_followup;

                      return (
                        <tr key={d.student_id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-3 px-4 font-mono font-bold text-blue-700">{d.admission_no}</td>
                          <td className="py-3 px-4">
                            <div className="font-bold text-slate-900">{d.student_name}</div>
                            <div className="text-[10px] text-slate-400 font-normal">Father: {d.father_name}</div>
                          </td>
                          <td className="py-3 px-4 font-semibold text-slate-700">
                            {d.class_name} - {d.section_name}
                          </td>
                          <td className="py-3 px-4 font-mono text-slate-600">{d.primary_phone || 'N/A'}</td>
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-1.5">
                              {maxDays > 90 ? (
                                <span className="px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 text-[10px] font-black border border-rose-200">
                                  90+ Days ({maxDays}d)
                                </span>
                              ) : maxDays > 60 ? (
                                <span className="px-2 py-0.5 rounded-full bg-red-50 text-red-700 text-[10px] font-bold border border-red-200">
                                  61-90 Days ({maxDays}d)
                                </span>
                              ) : maxDays > 30 ? (
                                <span className="px-2 py-0.5 rounded-full bg-orange-50 text-orange-800 text-[10px] font-bold border border-orange-200">
                                  31-60 Days ({maxDays}d)
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 text-[10px] font-bold border border-amber-200">
                                  0-30 Days ({maxDays}d)
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            {fup ? (
                              <div className="space-y-0.5">
                                <div className="flex items-center gap-1">
                                  <span className={`px-1.5 py-0.2 rounded text-[9px] font-bold uppercase ${
                                    fup.outcome === 'PROMISED'
                                      ? 'bg-blue-100 text-blue-800'
                                      : fup.outcome === 'DISPUTED'
                                      ? 'bg-rose-100 text-rose-800'
                                      : 'bg-slate-100 text-slate-700'
                                  }`}>
                                    {fup.outcome}
                                  </span>
                                  {fup.promise_date && (
                                    <span className="text-[10px] text-slate-600 font-medium">
                                      Pay by {fup.promise_date}
                                    </span>
                                  )}
                                </div>
                                {fup.notes && (
                                  <div className="text-[10px] text-slate-500 line-clamp-1 italic">
                                    "{fup.notes}"
                                  </div>
                                )}
                              </div>
                            ) : (
                              <span className="text-[10px] text-slate-400 italic">No calls logged yet</span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-right font-black text-rose-600">
                            ₹{d.total_outstanding_amount?.toLocaleString()}
                          </td>
                          <td className="py-3 px-4 text-center">
                            <button
                              type="button"
                              onClick={() => handleOpenFollowupModal(d)}
                              className="px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-lg text-xs font-bold inline-flex items-center gap-1 transition-colors shadow-sm"
                              title="Log Call Outcome or Promise-to-Pay"
                            >
                              <PhoneCall size={12} /> Log Call
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={8} className="text-center py-8 text-slate-400">
                        {loading ? 'Calculating outstanding balances...' : 'No fee defaulters found! All dues clear.'}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'collections' && (
        <div className="space-y-4">
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-wrap items-center gap-4 text-xs font-medium">
            <div>
              <label className="block text-slate-500 mb-1">From Date</label>
              <input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="border border-slate-200 rounded-lg px-3 py-1.5 bg-slate-50 font-semibold"
              />
            </div>
            <div>
              <label className="block text-slate-500 mb-1">To Date</label>
              <input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="border border-slate-200 rounded-lg px-3 py-1.5 bg-slate-50 font-semibold"
              />
            </div>
            <button
              onClick={fetchCollections}
              className="mt-4 bg-blue-600 text-white px-4 py-2 rounded-lg font-bold hover:bg-blue-500 shadow"
            >
              Filter Register
            </button>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-100 font-bold text-xs text-slate-800 flex justify-between items-center">
              <div>
                Total Inflow Collected: <span className="text-emerald-700 text-sm">₹{collectionsData?.total_amount_collected?.toLocaleString() || 0}</span> ({collectionsData?.total_collections_count || 0} Receipts)
              </div>
              <button
                type="button"
                onClick={() => window.print()}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-lg text-xs font-bold transition-colors shadow-sm"
              >
                <Printer size={13} /> Print Register
              </button>
            </div>
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider">
                  <th className="py-3 px-4">Receipt No</th>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Student Name</th>
                  <th className="py-3 px-4">Adm No</th>
                  <th className="py-3 px-4">Mode</th>
                  <th className="py-3 px-4 text-right">Amount Paid</th>
                  <th className="py-3 px-4">Cashier</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {collectionsData?.records?.length > 0 ? (
                  collectionsData.records.map((c) => (
                    <tr key={c.receipt_no} className="hover:bg-slate-50/80">
                      <td className="py-3 px-4 font-mono font-bold text-blue-700">
                        <div className="flex items-center gap-1.5">
                          <span>{c.receipt_no}</span>
                          <a
                            href={`/api/v1/documents/fee-receipt/${c.receipt_no}/html?token=${encodeURIComponent(localStorage.getItem('token') || '')}&tenant_slug=${encodeURIComponent(localStorage.getItem('tenant_slug') || '7aschoolerpuat')}`}
                            target="_blank"
                            rel="noreferrer"
                            title="Print / View Receipt"
                            className="p-1 bg-slate-100 hover:bg-emerald-50 text-slate-500 hover:text-emerald-700 rounded transition-colors"
                          >
                            <Printer size={11} />
                          </a>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-slate-500">{c.collection_date}</td>
                      <td className="py-3 px-4 font-bold text-slate-900">{c.student_name}</td>
                      <td className="py-3 px-4">{c.admission_no}</td>
                      <td className="py-3 px-4"><span className="bg-slate-100 px-2 py-0.5 rounded font-bold">{c.payment_mode}</span></td>
                      <td className="py-3 px-4 text-right font-black text-emerald-600">₹{c.amount?.toLocaleString()}</td>
                      <td className="py-3 px-4 text-slate-500">{c.cashier}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} className="text-center py-8 text-slate-400">
                      No collections found for this date range.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'finance' && financeData && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <h3 className="font-bold text-slate-900 text-sm">Monthly Summary</h3>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between py-2 border-b border-slate-100">
                <span className="text-slate-500">Gross Inflow (Fees + Incomes):</span>
                <span className="font-bold text-emerald-600">₹{financeData.total_income?.toLocaleString()}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-slate-100">
                <span className="text-slate-500">Total Operational Expenses:</span>
                <span className="font-bold text-rose-600">₹{financeData.total_expense?.toLocaleString()}</span>
              </div>
              <div className="flex justify-between py-2 font-bold text-sm bg-blue-50 p-2 rounded-lg">
                <span>Net Surplus / Deficit:</span>
                <span className={financeData.net_surplus_deficit >= 0 ? 'text-blue-900' : 'text-rose-600'}>
                  ₹{financeData.net_surplus_deficit?.toLocaleString()}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: PROMISE-TO-PAY (PTP) & CALL FOLLOWUP LOGGER */}
      {showFollowupModal && selectedStudentForFollowup && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden border border-slate-200 text-xs">
            {/* Header */}
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-full bg-rose-100 text-rose-800 font-bold text-[10px]">
                    Defaulter Recovery
                  </span>
                  <h3 className="font-bold text-slate-900 text-sm">
                    Fee Recovery Call & Promise-to-Pay (PTP)
                  </h3>
                </div>
                <p className="text-slate-500 text-[11px]">
                  {selectedStudentForFollowup.student_name} ({selectedStudentForFollowup.class_name}-{selectedStudentForFollowup.section_name}) • Total Balance: <strong className="text-rose-600">₹{selectedStudentForFollowup.total_outstanding_amount?.toLocaleString()}</strong>
                </p>
              </div>
              <button
                onClick={() => {
                  setShowFollowupModal(false);
                  setSelectedStudentForFollowup(null);
                }}
                className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-lg transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <div className="overflow-y-auto p-5 space-y-4 flex-1">
              {/* Previous Call Log History */}
              <div className="space-y-2">
                <div className="font-bold text-slate-700 flex items-center gap-1.5 uppercase text-[10px]">
                  <History size={13} className="text-blue-600" />
                  <span>Previous Recovery Call History</span>
                </div>

                {loadingHistory ? (
                  <div className="py-4 text-center text-slate-400">Loading call history...</div>
                ) : followupHistory.length === 0 ? (
                  <div className="p-3 bg-slate-50 rounded-xl text-center text-slate-400 italic text-[11px]">
                    No previous follow-up calls logged for this student.
                  </div>
                ) : (
                  <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                    {followupHistory.map((h) => (
                      <div key={h.id} className="p-2.5 rounded-xl border border-slate-200 bg-slate-50 space-y-1">
                        <div className="flex items-center justify-between text-[11px]">
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-slate-800">{h.followup_date}</span>
                            <span className="text-slate-400">by {h.recorded_by}</span>
                          </div>
                          <span className={`px-2 py-0.2 rounded-full font-bold text-[9px] uppercase ${
                            h.outcome === 'PROMISED'
                              ? 'bg-blue-100 text-blue-800'
                              : h.outcome === 'DISPUTED'
                              ? 'bg-rose-100 text-rose-800'
                              : 'bg-slate-200 text-slate-700'
                          }`}>
                            {h.outcome}
                          </span>
                        </div>
                        {h.promise_date && (
                          <div className="text-[11px] font-semibold text-emerald-700">
                            Promised: ₹{h.promised_amount?.toLocaleString() || 'Full'} by {h.promise_date}
                          </div>
                        )}
                        {h.notes && <p className="text-[11px] text-slate-600 italic">"{h.notes}"</p>}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Log New Call Form */}
              <form onSubmit={handleSaveFollowup} className="space-y-3 pt-3 border-t border-slate-100">
                <div className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                  <PhoneCall size={13} className="text-emerald-600" />
                  <span>Log New Follow-up Conversation</span>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-600 mb-1">Contacted Phone Number</label>
                    <input
                      type="text"
                      value={followupPhone}
                      onChange={(e) => setFollowupPhone(e.target.value)}
                      placeholder="e.g. 9876543210"
                      className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg font-mono font-bold"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-600 mb-1">Call Outcome *</label>
                    <select
                      value={followupOutcome}
                      onChange={(e) => setFollowupOutcome(e.target.value)}
                      className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg font-bold text-slate-800"
                    >
                      <option value="PROMISED">🤝 Promised to Pay (PTP)</option>
                      <option value="CALL_BACK">📞 Requested Callback Later</option>
                      <option value="DISPUTED">⚠️ Disputed Fee / Concession Issue</option>
                      <option value="REFUSED">🚫 Refused to Pay</option>
                      <option value="WRONG_NUMBER">❌ Wrong / Not Reachable Number</option>
                      <option value="RESOLVED">✅ Paid / Dues Resolved</option>
                    </select>
                  </div>
                </div>

                {followupOutcome === 'PROMISED' && (
                  <div className="grid grid-cols-2 gap-3 p-3 bg-blue-50/50 rounded-xl border border-blue-200">
                    <div>
                      <label className="block font-semibold text-blue-900 mb-1">Promise Date *</label>
                      <input
                        type="date"
                        required
                        value={followupPromiseDate}
                        onChange={(e) => setFollowupPromiseDate(e.target.value)}
                        className="w-full px-3 py-1.5 bg-white border border-blue-200 rounded-lg font-mono"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-blue-900 mb-1">Promised Amount (₹)</label>
                      <input
                        type="number"
                        step="0.01"
                        value={followupPromisedAmount}
                        onChange={(e) => setFollowupPromisedAmount(e.target.value)}
                        className="w-full px-3 py-1.5 bg-white border border-blue-200 rounded-lg font-mono font-bold"
                      />
                    </div>
                  </div>
                )}

                <div>
                  <label className="block font-semibold text-slate-600 mb-1">Conversation Notes / Remarks</label>
                  <textarea
                    rows={2}
                    value={followupNotes}
                    onChange={(e) => setFollowupNotes(e.target.value)}
                    placeholder="Enter discussion summary (e.g. parent requested salary release on 10th, will pay tuition fees then)..."
                    className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setShowFollowupModal(false)}
                    className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl font-semibold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={savingFollowup}
                    className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold shadow disabled:opacity-50"
                  >
                    {savingFollowup ? 'Saving...' : 'Save Follow-up Entry'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
