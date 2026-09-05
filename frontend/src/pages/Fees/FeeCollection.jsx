import React, { useState, useEffect } from 'react';
import {
  CreditCard,
  Printer,
  Search,
  CheckCircle2,
  AlertCircle,
  RefreshCcw,
  Layers,
  Percent,
  FileSpreadsheet,
  Plus,
  Calendar,
  X,
  RotateCcw,
  Check,
  AlertTriangle,
  ArrowRight,
} from 'lucide-react';
import api from '../../api/client';

export const FeeCollection = () => {
  const [activeTab, setActiveTab] = useState('pos'); // pos, setup, concessions, register

  // Lookups
  const [paymentModes, setPaymentModes] = useState([]);
  const [academicYears, setAcademicYears] = useState([]);
  const [academicYearId, setAcademicYearId] = useState('');
  const [classes, setClasses] = useState([]);
  const [classId, setClassId] = useState('');
  const [sections, setSections] = useState([]);
  const [sectionId, setSectionId] = useState('');

  // Tab 1: POS State
  const [students, setStudents] = useState([]);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [ledger, setLedger] = useState(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentModeId, setPaymentModeId] = useState('');
  const [referenceNo, setReferenceNo] = useState('');
  const [posLoading, setPosLoading] = useState(false);
  const [receipt, setReceipt] = useState(null);
  const [showReverseModal, setShowReverseModal] = useState(false);
  const [reverseReceiptNo, setReverseReceiptNo] = useState('');
  const [reverseReason, setReverseReason] = useState('');
  const [reversing, setReversing] = useState(false);

  // Refund State
  const [showRefundModal, setShowRefundModal] = useState(false);
  const [refundForm, setRefundForm] = useState({
    student_id: '',
    fee_collection_id: '',
    refund_amount: '',
    payment_mode_id: '',
    reason: '',
  });
  const [refunding, setRefunding] = useState(false);

  // Tab 2: Setup State
  const [feeHeads, setFeeHeads] = useState([]);
  const [feeStructures, setFeeStructures] = useState([]);
  const [schedules, setSchedules] = useState([]);
  const [showHeadModal, setShowHeadModal] = useState(false);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [generatingBulk, setGeneratingBulk] = useState(false);
  const [headForm, setHeadForm] = useState({ name: '', code: '', is_recurring: true, priority_order: 1, description: '' });
  const [scheduleForm, setScheduleForm] = useState({ name: '', installment_month: 4, due_date: '', grace_period_days: 10, late_fine_rate_per_day: 5.0 });
  const [bulkForm, setBulkForm] = useState({ class_id: '', installment_schedule_id: '' });

  // Tab 3: Concessions State
  const [concessionTypes, setConcessionTypes] = useState([]);
  const [studentConcessions, setStudentConcessions] = useState([]);
  const [showConcessionTypeModal, setShowConcessionTypeModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [typeForm, setTypeForm] = useState({ name: '', discount_type: 'PERCENTAGE', discount_value: 20, description: '' });
  const [assignForm, setAssignForm] = useState({ student_id: '', concession_type_id: '', fee_head_id: '', reason: '' });

  // Tab 4: Register State
  const [registerRows, setRegisterRows] = useState([]);
  const [registerLoading, setRegisterLoading] = useState(false);

  // Load Initial Configurations
  useEffect(() => {
    const fetchInit = async () => {
      try {
        const [modeRes, yrRes, clsRes] = await Promise.all([
          api.get('/lookups/payment-modes'),
          api.get('/academics/years'),
          api.get('/academics/classes'),
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

        if (clsRes.data && clsRes.data.length > 0) {
          setClasses(clsRes.data);
          setClassId(clsRes.data[0].id);
          setBulkForm((prev) => ({ ...prev, class_id: clsRes.data[0].id }));
          if (clsRes.data[0].sections && clsRes.data[0].sections.length > 0) {
            setSections(clsRes.data[0].sections);
            setSectionId(clsRes.data[0].sections[0].id);
          }
        }
      } catch (e) {
        console.error('Error loading initial fee data:', e);
      }
    };
    fetchInit();
  }, []);

  // Search Students for POS
  useEffect(() => {
    if (searchQuery.length > 2) {
      const search = async () => {
        try {
          const res = await api.get('/students', { params: { search: searchQuery } });
          if (res.data) setStudents(res.data);
        } catch (e) {
          console.error(e);
        }
      };
      search();
    }
  }, [searchQuery]);

  // Load Student Ledger
  const loadStudentLedger = async (student) => {
    setSelectedStudent(student);
    setPosLoading(true);
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
      console.error('Error loading ledger:', e);
    } finally {
      setPosLoading(false);
    }
  };

  // Collect Payment
  const handleCollectPayment = async (e) => {
    e.preventDefault();
    if (!selectedStudent || !paymentAmount || !academicYearId || !paymentModeId) return;

    setPosLoading(true);
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
        loadStudentLedger(selectedStudent);
      }
    } catch (err) {
      alert('Fee Collection Failed: ' + err.message);
    } finally {
      setPosLoading(false);
    }
  };

  // Reverse Receipt
  const handleReverseReceipt = async (e) => {
    e.preventDefault();
    if (!reverseReceiptNo || !reverseReason) return;
    setReversing(true);
    try {
      await api.post(`/fees/receipts/${reverseReceiptNo}/reverse`, {
        reversal_reason: reverseReason,
      });
      alert(`Receipt ${reverseReceiptNo} reversed successfully.`);
      setShowReverseModal(false);
      setReverseReceiptNo('');
      setReverseReason('');
      if (selectedStudent) loadStudentLedger(selectedStudent);
    } catch (err) {
      alert('Reversal failed: ' + err.message);
    } finally {
      setReversing(false);
    }
  };

  // Tab 2: Load Setup Data
  const loadSetupData = async () => {
    try {
      const [headsRes, structRes, schedRes] = await Promise.all([
        api.get('/fees/heads'),
        api.get('/fees/structures', { params: academicYearId ? { academic_year_id: academicYearId } : {} }),
        api.get('/fees/schedules', { params: academicYearId ? { academic_year_id: academicYearId } : {} }),
      ]);
      if (headsRes.data) setFeeHeads(headsRes.data);
      if (structRes.data) setFeeStructures(structRes.data);
      if (schedRes.data) {
        setSchedules(schedRes.data);
        if (schedRes.data.length > 0) {
          setBulkForm((prev) => ({ ...prev, installment_schedule_id: schedRes.data[0].id }));
        }
      }
    } catch (e) {
      console.error('Error loading fee setup data:', e);
    }
  };

  // Tab 3: Load Concessions Data
  const loadConcessionsData = async () => {
    try {
      const [typesRes, listRes, headsRes] = await Promise.all([
        api.get('/fees/concessions/types'),
        api.get('/fees/concessions', { params: academicYearId ? { academic_year_id: academicYearId } : {} }),
        api.get('/fees/heads'),
      ]);
      if (typesRes.data) setConcessionTypes(typesRes.data);
      if (listRes.data) setStudentConcessions(listRes.data);
      if (headsRes.data) setFeeHeads(headsRes.data);
    } catch (e) {
      console.error('Error loading concession data:', e);
    }
  };

  // Tab 4: Load Register
  const loadRegister = async () => {
    if (!academicYearId || !classId) return;
    setRegisterLoading(true);
    try {
      const res = await api.get('/fees/register', {
        params: {
          academic_year_id: academicYearId,
          class_id: classId,
          section_id: sectionId || undefined,
        },
      });
      if (res.data) setRegisterRows(res.data);
    } catch (e) {
      console.error('Error loading class fee register:', e);
    } finally {
      setRegisterLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'setup') loadSetupData();
    if (activeTab === 'concessions') loadConcessionsData();
    if (activeTab === 'register') loadRegister();
  }, [activeTab, academicYearId, classId, sectionId]);

  // Create Head
  const handleCreateHead = async (e) => {
    e.preventDefault();
    try {
      await api.post('/fees/heads', {
        ...headForm,
        priority_order: parseInt(headForm.priority_order, 10),
      });
      setShowHeadModal(false);
      setHeadForm({ name: '', code: '', is_recurring: true, priority_order: 1, description: '' });
      loadSetupData();
    } catch (err) {
      alert('Error creating fee head: ' + err.message);
    }
  };

  // Create Schedule
  const handleCreateSchedule = async (e) => {
    e.preventDefault();
    try {
      await api.post('/fees/schedules', {
        ...scheduleForm,
        academic_year_id: academicYearId,
        installment_month: parseInt(scheduleForm.installment_month, 10),
        grace_period_days: parseInt(scheduleForm.grace_period_days, 10),
        late_fine_rate_per_day: parseFloat(scheduleForm.late_fine_rate_per_day),
      });
      setShowScheduleModal(false);
      setScheduleForm({ name: '', installment_month: 4, due_date: '', grace_period_days: 10, late_fine_rate_per_day: 5.0 });
      loadSetupData();
    } catch (err) {
      alert('Error creating schedule: ' + err.message);
    }
  };

  // Generate Bulk Demands
  const handleGenerateBulk = async (e) => {
    e.preventDefault();
    setGeneratingBulk(true);
    try {
      const res = await api.post('/fees/demands/generate-bulk', {
        academic_year_id: academicYearId,
        class_id: bulkForm.class_id,
        installment_schedule_id: bulkForm.installment_schedule_id,
      });
      alert(res.message || 'Bulk fee invoices generated successfully!');
      setShowBulkModal(false);
    } catch (err) {
      alert('Error generating bulk demands: ' + err.message);
    } finally {
      setGeneratingBulk(false);
    }
  };

  // Create Concession Type
  const handleCreateConcessionType = async (e) => {
    e.preventDefault();
    try {
      await api.post('/fees/concessions/types', {
        ...typeForm,
        discount_value: parseFloat(typeForm.discount_value),
      });
      setShowConcessionTypeModal(false);
      setTypeForm({ name: '', discount_type: 'PERCENTAGE', discount_value: 20, description: '' });
      loadConcessionsData();
    } catch (err) {
      alert('Error creating concession type: ' + err.message);
    }
  };

  // Assign Concession
  const handleAssignConcession = async (e) => {
    e.preventDefault();
    try {
      await api.post('/fees/concessions/assign', {
        ...assignForm,
        academic_year_id: academicYearId,
        fee_head_id: assignForm.fee_head_id || undefined,
      });
      setShowAssignModal(false);
      setAssignForm({ student_id: '', concession_type_id: '', fee_head_id: '', reason: '' });
      loadConcessionsData();
    } catch (err) {
      alert('Error assigning concession: ' + err.message);
    }
  };

  // Reverse Receipt Handler
  const handleReverseReceipt = async (e) => {
    e.preventDefault();
    setReversing(true);
    try {
      await api.post(`/fees/receipts/${reverseReceiptNo}/reverse`, {
        reason: reverseReason,
      });
      alert('Receipt successfully reversed and ledger demands restored.');
      setShowReverseModal(false);
      setReverseReceiptNo('');
      setReverseReason('');
      if (selectedStudent) loadStudentLedger(selectedStudent);
    } catch (err) {
      alert('Error reversing receipt: ' + (err.response?.data?.detail || err.message));
    } finally {
      setReversing(false);
    }
  };

  // Issue Fee Refund Handler
  const handleIssueRefund = async (e) => {
    e.preventDefault();
    setRefunding(true);
    try {
      const payload = {
        student_id: refundForm.student_id || selectedStudent?.id,
        fee_collection_id: refundForm.fee_collection_id || undefined,
        refund_amount: parseFloat(refundForm.refund_amount),
        payment_mode_id: refundForm.payment_mode_id || (paymentModes.length > 0 ? paymentModes[0].id : undefined),
        reason: refundForm.reason,
      };
      const res = await api.post('/fees/refunds', payload);
      alert('Fee Refund processed successfully! Refund No: ' + (res.data?.refund_no || 'Recorded'));
      setShowRefundModal(false);
      setRefundForm({ student_id: '', fee_collection_id: '', refund_amount: '', payment_mode_id: '', reason: '' });
      if (selectedStudent) loadStudentLedger(selectedStudent);
    } catch (err) {
      alert('Error processing fee refund: ' + (err.response?.data?.detail || err.message));
    } finally {
      setRefunding(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <CreditCard size={20} className="text-blue-600" />
            <span>Fee Management & Cashier POS</span>
          </h1>
          <p className="text-xs text-slate-500">
            Penny-perfect FIFO allocation, fee structures, concession rules & class fee registers
          </p>
        </div>

        {/* Tab Controls */}
        <div className="flex bg-slate-200 p-1 rounded-xl text-xs font-bold">
          <button
            onClick={() => setActiveTab('pos')}
            className={`px-3 py-1.5 rounded-lg transition-all ${
              activeTab === 'pos' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Cashier POS
          </button>
          <button
            onClick={() => setActiveTab('setup')}
            className={`px-3 py-1.5 rounded-lg transition-all ${
              activeTab === 'setup' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Structures & Heads ({feeStructures.length})
          </button>
          <button
            onClick={() => setActiveTab('concessions')}
            className={`px-3 py-1.5 rounded-lg transition-all ${
              activeTab === 'concessions' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Concessions & Mafi ({studentConcessions.length})
          </button>
          <button
            onClick={() => setActiveTab('register')}
            className={`px-3 py-1.5 rounded-lg transition-all ${
              activeTab === 'register' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Class Fee Register
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: CASHIER POS */}
      {/* ========================================================================= */}
      {activeTab === 'pos' && (
        <div className="space-y-6">
          {/* Top Search & Actions */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="relative flex-1 w-full">
              <Search size={16} className="absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search student by name, admission number, or phone..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500"
              />
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  if (selectedStudent) {
                    setRefundForm((prev) => ({ ...prev, student_id: selectedStudent.id }));
                  }
                  setShowRefundModal(true);
                }}
                className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-lg transition-colors whitespace-nowrap"
              >
                <RotateCcw size={13} />
                <span>Issue Fee Refund</span>
              </button>
              <button
                onClick={() => setShowReverseModal(true)}
                className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg transition-colors whitespace-nowrap"
              >
                <RotateCcw size={13} />
                <span>Reverse Receipt</span>
              </button>
            </div>
          </div>

          {/* Student Search Results Dropdown */}
          {students.length > 0 && !selectedStudent && (
            <div className="bg-white divide-y divide-slate-100 border border-slate-200 rounded-xl max-h-56 overflow-y-auto shadow-sm">
              {students.map((st) => (
                <div
                  key={st.id}
                  onClick={() => loadStudentLedger(st)}
                  className="p-3 hover:bg-blue-50 cursor-pointer flex items-center justify-between text-xs transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-800 font-bold flex items-center justify-center text-xs">
                      {st.full_name?.[0] || 'S'}
                    </div>
                    <div>
                      <div className="font-bold text-slate-900">
                        <span className="text-blue-700 font-mono font-bold mr-1">{st.admission_no}</span> — {st.full_name}
                      </div>
                      <div className="text-[11px] text-slate-400">Class: {st.class_name} | Guardian: {st.guardian_name || 'N/A'}</div>
                    </div>
                  </div>
                  <span className="text-slate-500 font-mono text-xs">{st.primary_phone}</span>
                </div>
              ))}
            </div>
          )}

          {/* Ledger & Payment Section */}
          {selectedStudent && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left 2 Cols: Unpaid Invoices & Demands */}
              <div className="lg:col-span-2 space-y-4">
                <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                    <div>
                      <h3 className="font-bold text-slate-900 text-sm">{selectedStudent.full_name}</h3>
                      <div className="text-xs text-slate-500">
                        Adm: <span className="font-mono font-bold text-blue-700">{selectedStudent.admission_no}</span> | Class: {selectedStudent.class_name}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <a
                        href={`/api/v1/documents/fee-card/${selectedStudent.id}/html?tenant_slug=${localStorage.getItem('tenant_slug') || 'sample'}`}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-lg text-xs font-bold transition-colors shadow-sm"
                      >
                        <Printer size={13} />
                        <span>Print Fee Card</span>
                      </a>
                      <div className="text-right">
                        <div className="text-[11px] font-semibold text-slate-400 uppercase">Net Outstanding Balance</div>
                        <div className="text-2xl font-black text-rose-600">
                          ₹{ledger?.net_outstanding_balance?.toLocaleString() || '0'}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Outstanding Demands Table */}
                  <div className="mt-4 overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200 uppercase tracking-wider">
                          <th className="py-2.5 px-3">Head</th>
                          <th className="py-2.5 px-3">Due Date</th>
                          <th className="py-2.5 px-3">Base</th>
                          <th className="py-2.5 px-3">Concession</th>
                          <th className="py-2.5 px-3">Paid</th>
                          <th className="py-2.5 px-3 font-bold text-rose-700">Balance</th>
                          <th className="py-2.5 px-3">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {ledger?.demands?.length > 0 ? (
                          ledger.demands.map((d) => (
                            <tr key={d.id} className="hover:bg-slate-50/60">
                              <td className="py-2.5 px-3 font-bold text-slate-800">{d.fee_head_name}</td>
                              <td className="py-2.5 px-3 text-slate-500 font-mono">{d.due_date}</td>
                              <td className="py-2.5 px-3">₹{d.base_amount}</td>
                              <td className="py-2.5 px-3 text-emerald-600 font-semibold">
                                {d.concession_amount > 0 ? `-₹${d.concession_amount}` : '-'}
                              </td>
                              <td className="py-2.5 px-3 text-blue-600 font-semibold">₹{d.paid_amount}</td>
                              <td className="py-2.5 px-3 font-black text-rose-600">₹{d.balance_amount}</td>
                              <td className="py-2.5 px-3">
                                <span
                                  className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                    d.status === 'PAID'
                                      ? 'bg-emerald-100 text-emerald-800'
                                      : d.status === 'PARTIALLY_PAID'
                                      ? 'bg-amber-100 text-amber-800'
                                      : 'bg-rose-100 text-rose-800'
                                  }`}
                                >
                                  {d.status}
                                </span>
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan={7} className="text-center py-6 text-slate-400 font-medium">
                              No pending fee demands for this student.
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
                  <CreditCard size={16} className="text-emerald-600" />
                  <span>Collect Payment (FIFO)</span>
                </h3>

                <form onSubmit={handleCollectPayment} className="space-y-3.5">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Amount to Pay (₹) *</label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      value={paymentAmount}
                      onChange={(e) => setPaymentAmount(e.target.value)}
                      className="w-full px-3 py-2 text-base font-black text-blue-900 bg-blue-50 border border-blue-200 rounded-lg focus:outline-none"
                      placeholder="0.00"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Payment Mode *</label>
                    <select
                      value={paymentModeId}
                      onChange={(e) => setPaymentModeId(e.target.value)}
                      className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg font-bold text-slate-800"
                    >
                      {paymentModes.map((pm) => (
                        <option key={pm.id} value={pm.id}>{pm.name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Transaction Ref / UTR / Cheque #</label>
                    <input
                      type="text"
                      value={referenceNo}
                      onChange={(e) => setReferenceNo(e.target.value)}
                      className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg"
                      placeholder="e.g. UPI-29482749 or CHQ-00124"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={posLoading || !paymentAmount || parseFloat(paymentAmount) <= 0}
                    className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow transition-colors disabled:opacity-50"
                  >
                    {posLoading ? 'Processing Settlement...' : 'Confirm & Collect Payment'}
                  </button>
                </form>

                {receipt && (
                  <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl space-y-2 text-xs">
                    <div className="flex items-center gap-1.5 text-emerald-800 font-bold">
                      <CheckCircle2 size={16} />
                      <span>Payment Settled!</span>
                    </div>
                    <div>Receipt No: <strong className="font-mono">{receipt.receipt_no}</strong></div>
                    <div>Amount Paid: <strong>₹{receipt.total_amount_paid}</strong></div>
                    <a
                      href={`/api/v1/documents/fee-receipt/${receipt.receipt_no}/html?tenant_slug=${localStorage.getItem('tenant_slug') || 'sample'}`}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 mt-2 bg-emerald-600 text-white px-3 py-1.5 rounded-lg font-bold text-xs hover:bg-emerald-700 shadow"
                    >
                      <Printer size={14} />
                      <span>Print Standard Fee Receipt</span>
                    </a>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: STRUCTURES & HEADS SETUP */}
      {/* ========================================================================= */}
      {activeTab === 'setup' && (
        <div className="space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-500 uppercase">Academic Year:</span>
              <select
                value={academicYearId}
                onChange={(e) => setAcademicYearId(e.target.value)}
                className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-800"
              >
                {academicYears.map((y) => (
                  <option key={y.id} value={y.id}>{y.name}</option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowHeadModal(true)}
                className="flex items-center gap-1 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold px-3 py-2 rounded-lg"
              >
                <Plus size={13} />
                <span>Add Fee Head</span>
              </button>
              <button
                onClick={() => setShowScheduleModal(true)}
                className="flex items-center gap-1 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold px-3 py-2 rounded-lg"
              >
                <Plus size={13} />
                <span>Add Installment Schedule</span>
              </button>
              <button
                onClick={() => setShowBulkModal(true)}
                className="flex items-center gap-1 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold px-3 py-2 rounded-lg"
              >
                <Layers size={13} />
                <span>Generate Invoices</span>
              </button>
            </div>
          </div>

          {/* Fee Heads List */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-3">
            <h3 className="font-bold text-slate-900 text-sm">Configured Fee Heads</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {feeHeads.map((h) => (
                <div key={h.id} className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[10px] font-bold text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded">{h.code}</span>
                    <span className="text-[10px] text-slate-400 font-semibold">Priority #{h.priority_order}</span>
                  </div>
                  <div className="font-bold text-slate-900 text-xs">{h.name}</div>
                  <div className="text-[11px] text-slate-500">{h.description || (h.is_recurring ? 'Monthly / Recurring' : 'One-Time')}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Class Fee Structures List */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-3">
            <h3 className="font-bold text-slate-900 text-sm">Class-Wise Fee Packages</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {feeStructures.length > 0 ? (
                feeStructures.map((s) => (
                  <div key={s.id} className="p-4 bg-white border border-slate-200 rounded-xl shadow-sm space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-blue-700 text-xs">{s.class_name}</span>
                      <span className="text-sm font-black text-slate-900">₹{s.total_annual_amount.toLocaleString()}</span>
                    </div>
                    <div className="text-[11px] text-slate-500 font-medium">{s.name}</div>
                    <div className="divide-y divide-slate-100 pt-2 border-t border-slate-100 text-[11px]">
                      {s.items?.map((it) => (
                        <div key={it.id} className="flex justify-between py-1 text-slate-600">
                          <span>{it.head_name}</span>
                          <span className="font-semibold">₹{it.amount} ({it.frequency})</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))
              ) : (
                <div className="col-span-3 text-center py-8 text-slate-400 text-xs">
                  No class fee structures configured for this academic year.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: CONCESSIONS & FEE MAFI */}
      {/* ========================================================================= */}
      {activeTab === 'concessions' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Concession Discount Rules & Fee Mafi</h3>
              <p className="text-xs text-slate-500">Manage sibling discounts, staff child scholarships, and approved mafi exemptions</p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setShowConcessionTypeModal(true)}
                className="flex items-center gap-1 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold px-3.5 py-2 rounded-lg"
              >
                <Plus size={13} />
                <span>Add Discount Rule</span>
              </button>
              <button
                onClick={() => setShowAssignModal(true)}
                className="flex items-center gap-1 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold px-3.5 py-2 rounded-lg"
              >
                <Plus size={13} />
                <span>Grant Concession / Mafi</span>
              </button>
            </div>
          </div>

          {/* Active Concession Rules */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {concessionTypes.map((ct) => (
              <div key={ct.id} className="p-4 bg-white border border-slate-200 rounded-xl shadow-sm space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-900 text-xs">{ct.name}</span>
                  <span className="text-xs font-black text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded">
                    {ct.discount_type === 'PERCENTAGE' ? `${ct.discount_value}% OFF` : `₹${ct.discount_value} FLAT`}
                  </span>
                </div>
                <p className="text-[11px] text-slate-500">{ct.description || 'Standard institutional discount rule'}</p>
              </div>
            ))}
          </div>

          {/* Assigned Concessions Table */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-100 font-bold text-slate-900 text-xs">
              Approved Student Concessions Register
            </div>
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider">
                  <th className="py-3 px-4">Adm #</th>
                  <th className="py-3 px-4">Student Name</th>
                  <th className="py-3 px-4">Rule Name</th>
                  <th className="py-3 px-4">Discount</th>
                  <th className="py-3 px-4">Applicable Head</th>
                  <th className="py-3 px-4">Reason / Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {studentConcessions.length > 0 ? (
                  studentConcessions.map((sc) => (
                    <tr key={sc.id} className="hover:bg-slate-50/80">
                      <td className="py-3 px-4 font-mono font-bold text-blue-700">{sc.admission_no}</td>
                      <td className="py-3 px-4 font-bold text-slate-900">{sc.student_name}</td>
                      <td className="py-3 px-4 text-slate-800">{sc.concession_type_name}</td>
                      <td className="py-3 px-4 text-emerald-600 font-bold">
                        {sc.discount_type === 'PERCENTAGE' ? `${sc.discount_value}%` : `₹${sc.discount_value}`}
                      </td>
                      <td className="py-3 px-4 text-slate-600">{sc.fee_head_name}</td>
                      <td className="py-3 px-4 text-slate-500">{sc.reason || '-'}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="text-center py-8 text-slate-400">
                      No active student concessions assigned for this session.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: CLASS FEE REGISTER */}
      {/* ========================================================================= */}
      {activeTab === 'register' && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Academic Year</label>
                <select
                  value={academicYearId}
                  onChange={(e) => setAcademicYearId(e.target.value)}
                  className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg font-semibold text-slate-800"
                >
                  {academicYears.map((y) => (
                    <option key={y.id} value={y.id}>{y.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Class</label>
                <select
                  value={classId}
                  onChange={(e) => {
                    setClassId(e.target.value);
                    const selected = classes.find((c) => c.id === e.target.value);
                    if (selected?.sections?.length) {
                      setSections(selected.sections);
                      setSectionId(selected.sections[0].id);
                    }
                  }}
                  className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg font-semibold text-slate-800"
                >
                  {classes.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Section</label>
                <select
                  value={sectionId}
                  onChange={(e) => setSectionId(e.target.value)}
                  className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg font-semibold text-slate-800"
                >
                  <option value="">All Sections</option>
                  {sections.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <button
              onClick={() => window.print()}
              className="flex items-center gap-1 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold px-4 py-2 rounded-lg shadow"
            >
              <Printer size={14} />
              <span>Print Class Register</span>
            </button>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider">
                    <th className="py-3 px-3 w-14">Roll #</th>
                    <th className="py-3 px-3 w-28">Adm #</th>
                    <th className="py-3 px-3">Student Name</th>
                    <th className="py-3 px-3 text-right">Total Annual Fee</th>
                    <th className="py-3 px-3 text-right text-emerald-600">Concession (Mafi)</th>
                    <th className="py-3 px-3 text-right text-orange-600">Fine</th>
                    <th className="py-3 px-3 text-right font-bold text-slate-900">Net Demand</th>
                    <th className="py-3 px-3 text-right text-blue-600 font-bold">Paid</th>
                    <th className="py-3 px-3 text-right text-rose-600 font-black">Balance Due</th>
                    <th className="py-3 px-3 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {registerLoading ? (
                    <tr>
                      <td colSpan={10} className="text-center py-8 text-slate-400">
                        Loading class fee register...
                      </td>
                    </tr>
                  ) : registerRows.length > 0 ? (
                    registerRows.map((row) => (
                      <tr key={row.student_id} className="hover:bg-slate-50/80">
                        <td className="py-3 px-3 font-mono font-bold text-slate-500">{row.roll_no || '-'}</td>
                        <td className="py-3 px-3 font-mono font-bold text-blue-700">{row.admission_no}</td>
                        <td className="py-3 px-3 font-bold text-slate-900">{row.student_name}</td>
                        <td className="py-3 px-3 text-right">₹{row.total_fee.toLocaleString()}</td>
                        <td className="py-3 px-3 text-right text-emerald-600">
                          {row.concession > 0 ? `-₹${row.concession.toLocaleString()}` : '₹0'}
                        </td>
                        <td className="py-3 px-3 text-right text-orange-600">₹{row.fine.toLocaleString()}</td>
                        <td className="py-3 px-3 text-right font-bold text-slate-900">₹{row.net_demand.toLocaleString()}</td>
                        <td className="py-3 px-3 text-right text-blue-600 font-bold">₹{row.paid.toLocaleString()}</td>
                        <td className="py-3 px-3 text-right text-rose-600 font-black">₹{row.balance.toLocaleString()}</td>
                        <td className="py-3 px-3 text-center">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              row.status === 'CLEAR'
                                ? 'bg-emerald-100 text-emerald-800'
                                : row.status === 'PARTIAL'
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-rose-100 text-rose-800'
                            }`}
                          >
                            {row.status}
                          </span>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={10} className="text-center py-10 text-slate-400">
                        No fee demands generated yet for this class section.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Reverse Receipt */}
      {showReverseModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4 text-xs">
            <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
              <RotateCcw size={16} className="text-rose-600" />
              <span>Reverse Fee Receipt (Zero-Destructive)</span>
            </h3>
            <p className="text-slate-500 text-[11px]">
              Reversing a receipt restores all cleared unpaid demands back to the student's ledger.
            </p>
            <form onSubmit={handleReverseReceipt} className="space-y-3">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">Receipt Number *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. REC-2026-0001"
                  value={reverseReceiptNo}
                  onChange={(e) => setReverseReceiptNo(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg font-mono font-bold"
                />
              </div>
              <div>
                <label className="block text-slate-700 font-semibold mb-1">Reversal Audit Reason *</label>
                <textarea
                  required
                  rows={3}
                  placeholder="Explain reason for reversal (e.g. Cheque bounce, wrong student credited)..."
                  value={reverseReason}
                  onChange={(e) => setReverseReason(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowReverseModal(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={reversing}
                  className="px-5 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-lg font-bold shadow disabled:opacity-50"
                >
                  {reversing ? 'Reversing...' : 'Confirm Reversal'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Add Fee Head */}
      {showHeadModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4 text-xs">
            <h3 className="font-bold text-slate-900 text-sm">Add New Fee Head</h3>
            <form onSubmit={handleCreateHead} className="space-y-3">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">Head Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Tuition Fee"
                  value={headForm.name}
                  onChange={(e) => setHeadForm({ ...headForm, name: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-slate-700 font-semibold mb-1">Code *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. TUITION"
                  value={headForm.code}
                  onChange={(e) => setHeadForm({ ...headForm, code: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg font-mono uppercase"
                />
              </div>
              <div>
                <label className="block text-slate-700 font-semibold mb-1">Allocation Priority Order *</label>
                <input
                  type="number"
                  required
                  value={headForm.priority_order}
                  onChange={(e) => setHeadForm({ ...headForm, priority_order: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowHeadModal(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-semibold"
                >
                  Cancel
                </button>
                <button type="submit" className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-bold">
                  Create Head
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Add Installment Schedule */}
      {showScheduleModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4 text-xs">
            <h3 className="font-bold text-slate-900 text-sm">Add Installment Schedule</h3>
            <form onSubmit={handleCreateSchedule} className="space-y-3">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">Schedule Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. April 2026 Installment"
                  value={scheduleForm.name}
                  onChange={(e) => setScheduleForm({ ...scheduleForm, name: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Month (1-12) *</label>
                  <input
                    type="number"
                    min="1"
                    max="12"
                    required
                    value={scheduleForm.installment_month}
                    onChange={(e) => setScheduleForm({ ...scheduleForm, installment_month: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Due Date *</label>
                  <input
                    type="date"
                    required
                    value={scheduleForm.due_date}
                    onChange={(e) => setScheduleForm({ ...scheduleForm, due_date: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg font-mono"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowScheduleModal(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-semibold"
                >
                  Cancel
                </button>
                <button type="submit" className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-bold">
                  Create Schedule
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Bulk Invoice Generation */}
      {showBulkModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4 text-xs">
            <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
              <Layers size={16} className="text-emerald-600" />
              <span>Generate Bulk Fee Invoices</span>
            </h3>
            <p className="text-slate-500 text-[11px]">
              Applies class fee structure minus approved student concessions and raises individual demands.
            </p>
            <form onSubmit={handleGenerateBulk} className="space-y-3">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">Class *</label>
                <select
                  value={bulkForm.class_id}
                  onChange={(e) => setBulkForm({ ...bulkForm, class_id: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg"
                >
                  {classes.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-slate-700 font-semibold mb-1">Installment Schedule *</label>
                <select
                  value={bulkForm.installment_schedule_id}
                  onChange={(e) => setBulkForm({ ...bulkForm, installment_schedule_id: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg"
                >
                  {schedules.map((sc) => (
                    <option key={sc.id} value={sc.id}>{sc.name} (Due: {sc.due_date})</option>
                  ))}
                </select>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowBulkModal(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={generatingBulk}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-bold disabled:opacity-50"
                >
                  {generatingBulk ? 'Generating...' : 'Generate Invoices'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Create Concession Type */}
      {showConcessionTypeModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4 text-xs">
            <h3 className="font-bold text-slate-900 text-sm">Add Concession Discount Rule</h3>
            <form onSubmit={handleCreateConcessionType} className="space-y-3">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">Rule Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Sibling Discount / Staff Child"
                  value={typeForm.name}
                  onChange={(e) => setTypeForm({ ...typeForm, name: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Type *</label>
                  <select
                    value={typeForm.discount_type}
                    onChange={(e) => setTypeForm({ ...typeForm, discount_type: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg"
                  >
                    <option value="PERCENTAGE">Percentage (%)</option>
                    <option value="FLAT">Flat Amount (₹)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Value *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={typeForm.discount_value}
                    onChange={(e) => setTypeForm({ ...typeForm, discount_value: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg font-bold"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowConcessionTypeModal(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-semibold"
                >
                  Cancel
                </button>
                <button type="submit" className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-bold">
                  Save Rule
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Grant Concession to Student */}
      {showAssignModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4 text-xs">
            <h3 className="font-bold text-slate-900 text-sm">Grant Student Concession / Fee Mafi</h3>
            <form onSubmit={handleAssignConcession} className="space-y-3">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">Select Student *</label>
                <select
                  required
                  value={assignForm.student_id}
                  onChange={(e) => setAssignForm({ ...assignForm, student_id: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg font-semibold"
                >
                  <option value="">-- Choose Student --</option>
                  {students.map((st) => (
                    <option key={st.id} value={st.id}>{st.admission_no} - {st.full_name} ({st.class_name})</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-slate-700 font-semibold mb-1">Concession Discount Rule *</label>
                <select
                  required
                  value={assignForm.concession_type_id}
                  onChange={(e) => setAssignForm({ ...assignForm, concession_type_id: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg font-semibold"
                >
                  <option value="">-- Select Rule --</option>
                  {concessionTypes.map((ct) => (
                    <option key={ct.id} value={ct.id}>
                      {ct.name} ({ct.discount_type === 'PERCENTAGE' ? `${ct.discount_value}%` : `₹${ct.discount_value}`})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-slate-700 font-semibold mb-1">Applicable Head (Leave empty for All Heads)</label>
                <select
                  value={assignForm.fee_head_id}
                  onChange={(e) => setAssignForm({ ...assignForm, fee_head_id: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg"
                >
                  <option value="">All Fee Heads</option>
                  {feeHeads.map((h) => (
                    <option key={h.id} value={h.id}>{h.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-slate-700 font-semibold mb-1">Reason / Approval Notes</label>
                <input
                  type="text"
                  placeholder="e.g. Sibling enrolled in Class 4 / Principal approval"
                  value={assignForm.reason}
                  onChange={(e) => setAssignForm({ ...assignForm, reason: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAssignModal(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-semibold"
                >
                  Cancel
                </button>
                <button type="submit" className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-bold">
                  Grant Concession
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Reverse Fee Receipt */}
      {showReverseModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4 text-xs">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <RotateCcw size={16} className="text-rose-600" />
                <span>Reverse Fee Receipt</span>
              </h3>
              <button onClick={() => setShowReverseModal(false)} className="text-slate-400 hover:text-slate-600">
                <X size={16} />
              </button>
            </div>
            <form onSubmit={handleReverseReceipt} className="space-y-3">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">Receipt Number *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. REC-2026-0001"
                  value={reverseReceiptNo}
                  onChange={(e) => setReverseReceiptNo(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg font-mono font-bold"
                />
              </div>
              <div>
                <label className="block text-slate-700 font-semibold mb-1">Reason for Reversal *</label>
                <textarea
                  required
                  rows={3}
                  placeholder="State reason (e.g. Wrong student selected / Cheque dishonoured)..."
                  value={reverseReason}
                  onChange={(e) => setReverseReason(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg"
                />
              </div>
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-[11px] leading-relaxed">
                ⚠️ Reversing a receipt will mark it as REVERSED, restore outstanding balances on student ledger demands, and generate an immutable audit log.
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowReverseModal(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={reversing}
                  className="px-5 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-lg font-bold disabled:opacity-50"
                >
                  {reversing ? 'Reversing...' : 'Confirm Reversal'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Issue Fee Refund */}
      {showRefundModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4 text-xs">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <RotateCcw size={16} className="text-amber-600" />
                <span>Issue Student Fee Refund</span>
              </h3>
              <button onClick={() => setShowRefundModal(false)} className="text-slate-400 hover:text-slate-600">
                <X size={16} />
              </button>
            </div>
            <form onSubmit={handleIssueRefund} className="space-y-3">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">Select Student *</label>
                <select
                  required
                  value={refundForm.student_id || selectedStudent?.id || ''}
                  onChange={(e) => setRefundForm({ ...refundForm, student_id: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg font-semibold"
                >
                  <option value="">-- Choose Student --</option>
                  {selectedStudent && (
                    <option value={selectedStudent.id}>
                      {selectedStudent.admission_no} - {selectedStudent.full_name} ({selectedStudent.class_name})
                    </option>
                  )}
                  {students.filter(s => s.id !== selectedStudent?.id).map((st) => (
                    <option key={st.id} value={st.id}>{st.admission_no} - {st.full_name} ({st.class_name})</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Refund Amount (₹) *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    placeholder="0.00"
                    value={refundForm.refund_amount}
                    onChange={(e) => setRefundForm({ ...refundForm, refund_amount: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg font-bold text-amber-900"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Disbursement Mode *</label>
                  <select
                    value={refundForm.payment_mode_id || (paymentModes[0]?.id || '')}
                    onChange={(e) => setRefundForm({ ...refundForm, payment_mode_id: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg font-semibold"
                  >
                    {paymentModes.map((pm) => (
                      <option key={pm.id} value={pm.id}>{pm.name}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-slate-700 font-semibold mb-1">Reason for Refund *</label>
                <textarea
                  required
                  rows={2}
                  placeholder="e.g. Excess payment received / Security deposit refund / School transfer..."
                  value={refundForm.reason}
                  onChange={(e) => setRefundForm({ ...refundForm, reason: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowRefundModal(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={refunding || !refundForm.refund_amount || parseFloat(refundForm.refund_amount) <= 0}
                  className="px-5 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-lg font-bold disabled:opacity-50"
                >
                  {refunding ? 'Processing Refund...' : 'Authorize & Disburse Refund'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
