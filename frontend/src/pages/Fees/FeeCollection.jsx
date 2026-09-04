import React, { useState, useEffect } from 'react';
import { CreditCard, Printer, Search, CheckCircle2, AlertCircle, RefreshCcw } from 'lucide-react';
import api from '../../api/client';

export const FeeCollection = () => {
  const [students, setStudents] = useState([]);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [ledger, setLedger] = useState(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentModes, setPaymentModes] = useState([]);
  const [paymentModeId, setPaymentModeId] = useState('');
  const [academicYears, setAcademicYears] = useState([]);
  const [academicYearId, setAcademicYearId] = useState('');
  const [referenceNo, setReferenceNo] = useState('');
  const [loading, setLoading] = useState(false);
  const [receipt, setReceipt] = useState(null);

  // Load Initial Configuration (Payment Modes & Academic Years)
  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const [modeRes, yrRes] = await Promise.all([
          api.get('/lookups/payment-modes'),
          api.get('/academics/years'),
        ]);

        if (modeRes.data && modeRes.data.length > 0) {
          setPaymentModes(modeRes.data);
          setPaymentModeId(modeRes.data[0].id);
        }

        if (yrRes.data && yrRes.data.length > 0) {
          setAcademicYears(yrRes.data);
          const curr = yrRes.data.find((y) => y.is_current) || yrRes.data[0];
          setAcademicYearId(curr.id);
        }
      } catch (e) {
        console.log('Error fetching fee collection config:', e);
      }
    };
    fetchConfig();
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

  // Load Student Ledger
  const loadStudentLedger = async (student) => {
    setSelectedStudent(student);
    setLoading(true);
    setReceipt(null);
    try {
      const res = await api.get(`/fees/ledger/${student.id}`, {
        params: academicYearId ? { academic_year_id: academicYearId } : {},
      });
      if (res.data) {
        setLedger(res.data);
        setPaymentAmount(res.data.net_outstanding_balance || '');
      }
    } catch (e) {
      console.log('Error loading ledger:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleCollectPayment = async (e) => {
    e.preventDefault();
    if (!selectedStudent || !paymentAmount || !academicYearId || !paymentModeId) return;

    setLoading(true);
    try {
      const payload = {
        student_id: selectedStudent.id,
        academic_year_id: academicYearId,
        total_amount_paid: parseFloat(paymentAmount),
        payment_mode_id: paymentModeId,
        transaction_reference_no: referenceNo || undefined,
      };
      const res = await api.post('/fees/collect', payload);
      if (res.data) {
        setReceipt(res.data);
        // Refresh ledger
        loadStudentLedger(selectedStudent);
      }
    } catch (err) {
      alert('Fee Collection Failed: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-lg font-bold text-slate-900">Cashier Fee Collection & FIFO Ledger</h1>
          <p className="text-xs text-slate-500">Penny-perfect allocation across oldest unpaid fee demands</p>
        </div>
      </div>

      {/* Student Selector */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <label className="block text-xs font-semibold text-slate-700 mb-2">Search Student for Fee Collection</label>
        <div className="relative">
          <Search size={16} className="absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="Type student name or admission number..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500"
          />
        </div>

        {students.length > 0 && !selectedStudent && (
          <div className="mt-3 divide-y divide-slate-100 border border-slate-100 rounded-lg max-h-48 overflow-y-auto">
            {students.map((st) => (
              <div
                key={st.id}
                onClick={() => loadStudentLedger(st)}
                className="p-2.5 hover:bg-blue-50 cursor-pointer flex items-center justify-between text-xs"
              >
                <div>
                  <span className="font-bold text-blue-700">{st.admission_no}</span> — {st.full_name} ({st.class_name})
                </div>
                <span className="text-slate-500">{st.primary_phone}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {selectedStudent && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left 2 Cols: Unpaid Invoices & Demands */}
          <div className="lg:col-span-2 space-y-4">
            <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">{selectedStudent.full_name}</h3>
                  <div className="text-xs text-slate-500">Adm: {selectedStudent.admission_no} | Class: {selectedStudent.class_name}</div>
                </div>
                <div className="text-right">
                  <div className="text-xs text-slate-500">Net Due Balance</div>
                  <div className="text-xl font-black text-rose-600">₹{ledger?.net_outstanding_balance?.toLocaleString() || '0'}</div>
                </div>
              </div>

              {/* Outstanding Demands Table */}
              <div className="mt-4 overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                      <th className="py-2.5 px-3">Head</th>
                      <th className="py-2.5 px-3">Due Date</th>
                      <th className="py-2.5 px-3">Total</th>
                      <th className="py-2.5 px-3">Paid</th>
                      <th className="py-2.5 px-3">Balance</th>
                      <th className="py-2.5 px-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {ledger?.demands?.length > 0 ? (
                      ledger.demands.map((d) => (
                        <tr key={d.id} className="hover:bg-slate-50/60">
                          <td className="py-2 px-3 font-semibold text-slate-800">{d.fee_head_name}</td>
                          <td className="py-2 px-3 text-slate-500">{d.due_date}</td>
                          <td className="py-2 px-3">₹{d.final_amount}</td>
                          <td className="py-2 px-3 text-emerald-600">₹{d.paid_amount}</td>
                          <td className="py-2 px-3 font-bold text-rose-600">₹{d.balance_amount}</td>
                          <td className="py-2 px-3">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              d.status === 'PAID' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                            }`}>
                              {d.status}
                            </span>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={6} className="text-center py-4 text-slate-400">
                          No pending fee demands.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Right Col: Collection Box */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-4">
            <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
              <CreditCard size={16} className="text-blue-600" />
              <span>Collect Fee</span>
            </h3>

            <form onSubmit={handleCollectPayment} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Amount to Pay (₹)</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  className="w-full px-3 py-2 text-sm font-bold text-blue-900 bg-blue-50 border border-blue-200 rounded-lg focus:outline-none"
                  placeholder="Enter amount"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Payment Mode</label>
                <select
                  value={paymentModeId}
                  onChange={(e) => setPaymentModeId(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg font-semibold text-slate-800"
                >
                  {paymentModes.map((pm) => (
                    <option key={pm.id} value={pm.id}>{pm.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Reference / UTR No (Optional)</label>
                <input
                  type="text"
                  value={referenceNo}
                  onChange={(e) => setReferenceNo(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg"
                  placeholder="e.g. UPI Ref No / Cheque No"
                />
              </div>

              <button
                type="submit"
                disabled={loading || !paymentAmount}
                className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-lg shadow transition-colors disabled:opacity-50"
              >
                {loading ? 'Processing FIFO Settlement...' : 'Confirm & Collect Payment'}
              </button>
            </form>

            {receipt && (
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl space-y-2 text-xs">
                <div className="flex items-center gap-1.5 text-emerald-800 font-bold">
                  <CheckCircle2 size={16} />
                  <span>Payment Recorded!</span>
                </div>
                <div>Receipt No: <strong>{receipt.receipt_no}</strong></div>
                <div>Amount: <strong>₹{receipt.total_amount_paid}</strong></div>
                <a
                  href={`/api/v1/documents/fee-receipt/${receipt.receipt_no}/html?tenant_slug=${localStorage.getItem('tenant_slug') || 'sample'}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 mt-2 bg-emerald-600 text-white px-3 py-1.5 rounded-md font-semibold text-xs hover:bg-emerald-700"
                >
                  <Printer size={14} />
                  <span>Print Receipt</span>
                </a>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
