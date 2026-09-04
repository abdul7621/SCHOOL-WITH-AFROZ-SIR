import React, { useState, useEffect } from 'react';
import { BarChart3, Download, Search, DollarSign, CalendarCheck, AlertTriangle, Filter } from 'lucide-react';
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
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-rose-50 p-5 rounded-2xl border border-rose-200 flex items-center justify-between">
              <div>
                <div className="text-xs font-bold text-rose-700 uppercase tracking-wider">Total Pending Dues</div>
                <div className="text-2xl font-black text-rose-950 mt-1">₹{defaultersData?.total_outstanding_amount?.toLocaleString() || 0}</div>
              </div>
              <div className="text-3xl">⚠️</div>
            </div>
            <div className="bg-white p-5 rounded-2xl border border-slate-200 flex items-center justify-between shadow-sm">
              <div>
                <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Defaulter Students</div>
                <div className="text-2xl font-black text-slate-900 mt-1">{defaultersData?.total_defaulters_count || 0}</div>
              </div>
              <div className="text-3xl">👥</div>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-100 font-bold text-xs text-slate-800 flex justify-between items-center">
              <span>Overdue Fee Defaulters Roster</span>
              <a
                href="/api/v1/excel/export/students"
                target="_blank"
                className="flex items-center gap-1 text-emerald-700 hover:underline font-semibold"
              >
                <Download size={14} /> Export to Excel
              </a>
            </div>
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider">
                  <th className="py-3 px-4">Adm No</th>
                  <th className="py-3 px-4">Student Name</th>
                  <th className="py-3 px-4">Class & Sec</th>
                  <th className="py-3 px-4">Father Name</th>
                  <th className="py-3 px-4">Parent Phone</th>
                  <th className="py-3 px-4 text-right">Total Due Balance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {defaultersData?.defaulters?.length > 0 ? (
                  defaultersData.defaulters.map((d) => (
                    <tr key={d.student_id} className="hover:bg-rose-50/40">
                      <td className="py-3 px-4 font-mono font-bold text-blue-700">{d.admission_no}</td>
                      <td className="py-3 px-4 font-bold text-slate-900">{d.student_name}</td>
                      <td className="py-3 px-4">{d.class_name} - {d.section_name}</td>
                      <td className="py-3 px-4 text-slate-600">{d.father_name}</td>
                      <td className="py-3 px-4 text-slate-600">{d.primary_phone}</td>
                      <td className="py-3 px-4 text-right font-black text-rose-600">₹{d.total_outstanding_amount?.toLocaleString()}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="text-center py-8 text-slate-400">
                      {loading ? 'Calculating outstanding balances...' : 'No fee defaulters found! All dues clear.'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
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
            <div className="p-4 border-b border-slate-100 font-bold text-xs text-slate-800">
              Total Inflow Collected: <span className="text-emerald-700 text-sm">₹{collectionsData?.total_amount_collected?.toLocaleString() || 0}</span> ({collectionsData?.total_collections_count || 0} Receipts)
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
                      <td className="py-3 px-4 font-mono font-bold text-blue-700">{c.receipt_no}</td>
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
    </div>
  );
};
