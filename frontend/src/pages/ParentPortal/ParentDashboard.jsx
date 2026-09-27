import React, { useState, useEffect } from 'react';
import {
  Users,
  Calendar,
  CreditCard,
  Award,
  ChevronRight,
  CheckCircle2,
  AlertCircle,
  Loader2,
  FileText,
  Plus,
  X,
  Clock,
  BookOpen,
  Printer,
  Sparkles,
  Upload,
  Star,
  Camera,
  Check,
  Smartphone,
  QrCode,
  Copy,
  ExternalLink,
  ShieldCheck,
  ArrowRight,
  RefreshCcw,
} from 'lucide-react';
import api from '../../api/client';

// Helper: Format 24h time to AM/PM
const formatTime = (timeStr) => {
  if (!timeStr) return '';
  const parts = timeStr.split(':');
  let h = parseInt(parts[0], 10);
  const m = parts[1] || '00';
  const ampm = h >= 12 ? 'PM' : 'AM';
  h = h % 12 || 12;
  return `${h}:${m} ${ampm}`;
};

// Helper: Check if current local time is within period start and end
const isLiveNow = (startTime, endTime) => {
  if (!startTime || !endTime) return false;
  const now = new Date();
  const currMin = now.getHours() * 60 + now.getMinutes();
  const [sH, sM] = startTime.split(':').map(Number);
  const [eH, eM] = endTime.split(':').map(Number);
  return currMin >= sH * 60 + sM && currMin < eH * 60 + eM;
};

export const ParentDashboard = () => {
  const [children, setChildren] = useState([]);
  const [selectedChildId, setSelectedChildId] = useState('');
  const [overview, setOverview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Student Leave State
  const [leaves, setLeaves] = useState([]);
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [submittingLeave, setSubmittingLeave] = useState(false);
  const [leaveForm, setLeaveForm] = useState({
    from_date: new Date().toISOString().split('T')[0],
    to_date: new Date().toISOString().split('T')[0],
    reason: '',
  });

  // Homework State
  const [homeworkList, setHomeworkList] = useState([]);
  const [loadingHomework, setLoadingHomework] = useState(false);
  const [selectedHwToSubmit, setSelectedHwToSubmit] = useState(null);
  const [submittingHw, setSubmittingHw] = useState(false);
  const [hwSubmissionForm, setHwSubmissionForm] = useState({
    submission_text: '',
    attachment_url: '',
  });

  // Timetable & Daily Routine State
  const [timetableData, setTimetableData] = useState(null);
  const [loadingTimetable, setLoadingTimetable] = useState(false);
  const [showWeeklyModal, setShowWeeklyModal] = useState(false);

  // Online Fee Payment State
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [activeGateways, setActiveGateways] = useState([]);
  const [loadingGateways, setLoadingGateways] = useState(false);
  const [payAmount, setPayAmount] = useState('');
  const [selectedGateway, setSelectedGateway] = useState('DIRECT_UPI_QR');
  const [paymentStep, setPaymentStep] = useState('AMOUNT'); // 'AMOUNT', 'QR_PAY', 'SUCCESS'
  const [currentOrder, setCurrentOrder] = useState(null);
  const [creatingOrder, setCreatingOrder] = useState(false);
  const [utrNumber, setUtrNumber] = useState('');
  const [submittingUtr, setSubmittingUtr] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);

  const handleOpenPaymentModal = async () => {
    setShowPaymentModal(true);
    setPaymentStep('AMOUNT');
    setCurrentOrder(null);
    setUtrNumber('');
    setPayAmount(overview?.fees?.outstanding_balance > 0 ? overview.fees.outstanding_balance : '');
    setLoadingGateways(true);
    try {
      const res = await api.get('/fees/gateways/active');
      const list = res.data || [];
      setActiveGateways(list);
      if (list.length > 0) {
        setSelectedGateway(list[0].provider);
      }
    } catch (err) {
      console.error('Error fetching active gateways:', err);
    } finally {
      setLoadingGateways(false);
    }
  };

  const handleCreateOrder = async (e) => {
    e.preventDefault();
    if (!payAmount || parseFloat(payAmount) <= 0 || !selectedChild) return;
    setCreatingOrder(true);
    try {
      const res = await api.post('/fees/online/create-order', {
        student_id: selectedChild.student_id,
        amount: parseFloat(payAmount),
        gateway_provider: selectedGateway,
      });
      setCurrentOrder(res.data);
      setPaymentStep('QR_PAY');
    } catch (err) {
      alert('Failed to generate payment order: ' + (err.response?.data?.detail || err.message));
    } finally {
      setCreatingOrder(false);
    }
  };

  const handleSubmitUtr = async (e) => {
    e.preventDefault();
    if (!utrNumber || utrNumber.trim().length < 6 || !currentOrder) {
      alert('Please enter a valid Bank Transaction Reference / UTR number.');
      return;
    }
    setSubmittingUtr(true);
    try {
      await api.post('/fees/online/submit-utr', {
        order_id: currentOrder.order_id,
        utr_number: utrNumber.trim().toUpperCase(),
      });
      setCurrentOrder(prev => ({ ...prev, status: 'VERIFICATION_PENDING', utr_number: utrNumber.trim().toUpperCase() }));
      setPaymentStep('SUCCESS');
    } catch (err) {
      alert('Failed to submit UTR: ' + (err.response?.data?.detail || err.message));
    } finally {
      setSubmittingUtr(false);
    }
  };

  const handleCopyVpa = (vpa) => {
    if (!vpa) return;
    navigator.clipboard.writeText(vpa);
    setCopySuccess(true);
    setTimeout(() => setCopySuccess(false), 2000);
  };

  // 1. Fetch Parent's linked children
  useEffect(() => {
    const fetchChildren = async () => {
      setLoading(true);
      try {
        const res = await api.get('/parent/children');
        if (res.data && res.data.length > 0) {
          setChildren(res.data);
          setSelectedChildId(res.data[0].student_id);
        } else {
          setChildren([]);
          setSelectedChildId('');
        }
      } catch (err) {
        console.error('Error fetching parent children:', err);
        setError('Could not load student profiles.');
      } finally {
        setLoading(false);
      }
    };
    fetchChildren();
  }, []);

  const selectedChild = children.find((c) => c.student_id === selectedChildId) || children[0];

  // 2. Fetch Overview for Selected Child
  useEffect(() => {
    if (!selectedChildId || selectedChildId === 'st_01') return;

    const fetchOverview = async () => {
      try {
        const res = await api.get(`/parent/children/${selectedChildId}/overview`);
        if (res.data) {
          setOverview(res.data);
        }
      } catch (err) {
        console.error('Error fetching child overview:', err);
      }
    };
    fetchOverview();
  }, [selectedChildId]);

  // 3. Fetch Leaves for Selected Child
  const fetchLeaves = async () => {
    if (!selectedChildId || selectedChildId === 'st_01') return;
    try {
      const res = await api.get('/academics/leaves', {
        params: { student_id: selectedChildId },
      });
      if (res.data) {
        setLeaves(res.data);
      }
    } catch (err) {
      console.error('Error fetching student leaves:', err);
    }
  };

  // 4. Fetch Homework for Selected Child's class & section
  const fetchHomework = async (cId, sId, childId) => {
    if (!cId || !sId) {
      setHomeworkList([]);
      return;
    }
    setLoadingHomework(true);
    try {
      const res = await api.get('/academics/homework', {
        params: { class_id: cId, section_id: sId, student_id: childId || selectedChildId },
      });
      if (res.data) {
        setHomeworkList(res.data);
      }
    } catch (err) {
      console.error('Error fetching child homework:', err);
    } finally {
      setLoadingHomework(false);
    }
  };

  const handleHomeworkPhotoUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new window.Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 1200;
        const scaleSize = MAX_WIDTH / img.width;
        canvas.width = img.width > MAX_WIDTH ? MAX_WIDTH : img.width;
        canvas.height = img.width > MAX_WIDTH ? img.height * scaleSize : img.height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        const compressedBase64 = canvas.toDataURL('image/jpeg', 0.7);
        setHwSubmissionForm((prev) => ({ ...prev, attachment_url: compressedBase64 }));
      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
  };

  const handleSubmitHomework = async (e) => {
    e.preventDefault();
    if (!selectedHwToSubmit || !selectedChildId) return;
    setSubmittingHw(true);
    try {
      await api.post(`/academics/homework/${selectedHwToSubmit.id}/submit`, {
        student_id: selectedChildId,
        submission_text: hwSubmissionForm.submission_text,
        attachment_url: hwSubmissionForm.attachment_url || undefined,
      });
      alert('Homework submitted successfully! Class teacher will review and grade.');
      setSelectedHwToSubmit(null);
      setHwSubmissionForm({ submission_text: '', attachment_url: '' });
      if (selectedChild?.class_id && selectedChild?.section_id) {
        fetchHomework(selectedChild.class_id, selectedChild.section_id, selectedChildId);
      }
    } catch (err) {
      alert('Failed to submit homework: ' + (err.response?.data?.message || err.message));
    } finally {
      setSubmittingHw(false);
    }
  };

  // 5. Fetch Daily & Weekly Timetable for Selected Child
  const fetchChildTimetable = async (childId) => {
    if (!childId || childId === 'st_01') {
      setTimetableData(null);
      return;
    }
    setLoadingTimetable(true);
    try {
      const res = await api.get(`/parent/children/${childId}/timetable`);
      if (res.data) {
        setTimetableData(res.data);
      }
    } catch (err) {
      console.error('Error fetching child timetable:', err);
    } finally {
      setLoadingTimetable(false);
    }
  };

  useEffect(() => {
    fetchLeaves();
    if (selectedChild?.class_id && selectedChild?.section_id) {
      fetchHomework(selectedChild.class_id, selectedChild.section_id, selectedChildId);
    } else {
      setHomeworkList([]);
    }
    if (selectedChildId) {
      fetchChildTimetable(selectedChildId);
    }
  }, [selectedChildId, selectedChild?.class_id, selectedChild?.section_id]);

  const handleApplyLeave = async (e) => {
    e.preventDefault();
    if (!selectedChildId) return;

    setSubmittingLeave(true);
    try {
      await api.post('/academics/leaves', {
        student_id: selectedChildId,
        from_date: leaveForm.from_date,
        to_date: leaveForm.to_date,
        reason: leaveForm.reason,
      });
      setShowLeaveModal(false);
      setLeaveForm({
        from_date: new Date().toISOString().split('T')[0],
        to_date: new Date().toISOString().split('T')[0],
        reason: '',
      });
      fetchLeaves();
      alert('Leave application submitted successfully. Class teacher will review.');
    } catch (err) {
      alert('Failed to submit leave application: ' + err.message);
    } finally {
      setSubmittingLeave(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Multi-child Switcher Bar */}
      {children.length > 1 && (
        <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-3">
          <span className="text-xs font-bold text-slate-500 uppercase px-2">Select Child:</span>
          <div className="flex gap-2 flex-wrap">
            {children.map((ch) => (
              <button
                key={ch.student_id}
                onClick={() => setSelectedChildId(ch.student_id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                  selectedChildId === ch.student_id
                    ? 'bg-blue-600 text-white shadow'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                <div className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center text-[10px]">
                  {ch.student_name ? ch.student_name[0] : 'S'}
                </div>
                <span>{ch.student_name}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Child Summary Card */}
      {selectedChild && (
        <div className="bg-gradient-to-r from-blue-900 to-indigo-900 rounded-2xl p-6 text-white shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-xs bg-blue-500/30 text-blue-200 font-semibold px-2.5 py-1 rounded-md">
                {selectedChild.class_name} - {selectedChild.section_name} | Roll #{selectedChild.roll_no || '-'}
              </span>
              <h2 className="text-2xl font-black mt-2">{selectedChild.student_name}</h2>
              <p className="text-xs text-blue-200 font-mono">Admission No: {selectedChild.admission_no}</p>
            </div>
            <div className="text-right">
              <div className="text-xs text-blue-200 uppercase font-semibold">Today Attendance</div>
              <div className="inline-flex items-center gap-1.5 bg-emerald-500/20 text-emerald-300 font-bold px-3 py-1.5 rounded-lg text-sm mt-1 border border-emerald-400/30">
                <CheckCircle2 size={16} />
                <span>{overview?.today_attendance?.status || 'PRESENT'}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Quick Action Tiles */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <CreditCard size={20} />
            </div>
            {selectedChild && (
              <a
                href={`/api/v1/documents/fee-card/${selectedChild.student_id}/html?token=${encodeURIComponent(localStorage.getItem('token') || '')}&tenant_slug=${encodeURIComponent(localStorage.getItem('tenant_slug') || '7aschoolerpuat')}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 px-2.5 py-1 rounded-lg transition-colors"
                title="View & Print Official Fee Card"
              >
                <Printer size={12} />
                <span>Fee Card</span>
              </a>
            )}
          </div>
          <div className="text-xs font-semibold text-slate-500 uppercase">Pending Fee Dues</div>
          <div className="text-xl font-bold text-slate-900">
            ₹{overview?.fees?.outstanding_balance !== undefined ? overview.fees.outstanding_balance.toLocaleString() : '0.00'}
          </div>
          <div className="text-[11px] text-emerald-600 font-semibold">
            {overview?.fees?.outstanding_balance === 0 ? 'All Clear - No Pending Dues' : 'Due for Current Session'}
          </div>
          <div className="pt-2">
            <button
              type="button"
              onClick={handleOpenPaymentModal}
              className="w-full py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm shadow-emerald-600/20 transition-all cursor-pointer"
            >
              <Smartphone size={14} />
              <span>Pay Online via UPI</span>
            </button>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-2">
          <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
            <Calendar size={20} />
          </div>
          <div className="text-xs font-semibold text-slate-500 uppercase">Monthly Attendance</div>
          <div className="text-xl font-bold text-slate-900">
            {overview?.attendance?.attendance_percentage !== undefined ? `${overview.attendance.attendance_percentage}%` : 'N/A'}
          </div>
          <div className="text-[11px] text-slate-500">
            {overview?.attendance?.present_days !== undefined
              ? `${overview.attendance.present_days} Present / ${overview.attendance.total_days} Days`
              : 'Current Month Record'}
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-2">
          <div className="w-10 h-10 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
            <Award size={20} />
          </div>
          <div className="text-xs font-semibold text-slate-500 uppercase">Behavioral Rating</div>
          <div className="text-xl font-bold text-amber-500">
            {overview?.behavioral_rating || 'N/A'}
          </div>
          <div className="text-[11px] text-slate-500">
            {overview?.behavioral_rating ? 'Recent term evaluation' : 'No rating recorded yet'}
          </div>
        </div>
      </div>

      {/* Daily Class Routine & Timetable Section */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
        <div className="border-b border-slate-100 pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Clock size={16} className="text-blue-600" />
              <span>Today's Class Routine & Timetable</span>
              {timetableData?.today_name && (
                <span className="text-[11px] font-bold bg-blue-50 text-blue-700 px-2 py-0.5 rounded-md">
                  {timetableData.today_name}
                </span>
              )}
            </h3>
            <p className="text-xs text-slate-500">
              Daily period bells and assigned teachers for {selectedChild?.class_name || 'Class'} ({selectedChild?.section_name || 'Section'})
            </p>
          </div>
          <button
            onClick={() => setShowWeeklyModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors self-start sm:self-auto"
          >
            <Calendar size={13} />
            <span>Full Weekly Routine</span>
          </button>
        </div>

        {loadingTimetable ? (
          <div className="p-6 text-center text-xs text-slate-400">Loading today's schedule...</div>
        ) : !timetableData || !timetableData.today_routine || timetableData.today_routine.length === 0 ? (
          <div className="p-6 text-center text-xs text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200">
            No class periods scheduled for today ({timetableData?.today_name || 'Sunday / Holiday'}).
            <div className="mt-1">
              <button
                onClick={() => setShowWeeklyModal(true)}
                className="text-blue-600 font-semibold hover:underline"
              >
                Click here to view full weekly timetable
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {timetableData.today_routine.map((p) => {
              const live = isLiveNow(p.start_time, p.end_time);

              if (p.is_break) {
                return (
                  <div
                    key={p.period_id}
                    className="p-3.5 rounded-xl border border-amber-200 bg-amber-50/70 space-y-1.5 flex flex-col justify-between"
                  >
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="font-bold text-amber-900 uppercase tracking-wider text-[10px]">
                        ☕ {p.period_name}
                      </span>
                      {live && (
                        <span className="animate-pulse bg-amber-500 text-white font-bold text-[9px] px-1.5 py-0.2 rounded-full">
                          LIVE BREAK
                        </span>
                      )}
                    </div>
                    <div className="font-mono text-xs font-semibold text-amber-800">
                      {formatTime(p.start_time)} - {formatTime(p.end_time)}
                    </div>
                    <div className="text-[11px] text-amber-700 font-medium">Recess & Refreshment Time</div>
                  </div>
                );
              }

              return (
                <div
                  key={p.period_id}
                  className={`p-3.5 rounded-xl border transition-all space-y-2 flex flex-col justify-between ${
                    live
                      ? 'border-emerald-400 bg-emerald-50/40 shadow-sm ring-1 ring-emerald-400'
                      : p.subject_name
                      ? 'border-slate-200 bg-white hover:border-slate-300'
                      : 'border-dashed border-slate-200 bg-slate-50/60'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                      {p.period_name}
                    </span>
                    {live ? (
                      <span className="animate-pulse bg-emerald-600 text-white font-bold text-[9px] px-2 py-0.5 rounded-full flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-white"></span>
                        LIVE NOW
                      </span>
                    ) : (
                      <span className="font-mono text-[10px] text-slate-500 font-semibold">
                        {formatTime(p.start_time)} - {formatTime(p.end_time)}
                      </span>
                    )}
                  </div>

                  <div>
                    <h4 className="font-bold text-slate-900 text-xs">
                      {p.subject_name || <span className="text-slate-400 font-normal italic">Free Period</span>}
                    </h4>
                    {p.teacher_name && (
                      <div className="text-[11px] text-slate-600 flex items-center gap-1 mt-0.5 font-medium">
                        <User size={11} className="text-slate-400" />
                        <span>{p.teacher_name}</span>
                      </div>
                    )}
                  </div>

                  {p.room_number && (
                    <div className="pt-1 border-t border-slate-100 text-[10px] text-slate-400">
                      Room: <strong className="text-slate-600">{p.room_number}</strong>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Daily Homework & Tasks Section */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
        <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <FileText size={16} className="text-blue-600" />
              <span>Daily Homework & Classwork</span>
            </h3>
            <p className="text-xs text-slate-500">
              Tasks assigned by teachers for {selectedChild?.class_name || 'class'} - {selectedChild?.section_name || 'section'}
            </p>
          </div>
          <span className="text-xs bg-slate-100 text-slate-600 px-2.5 py-1 rounded-lg font-semibold">
            {homeworkList.length} Active {homeworkList.length === 1 ? 'Task' : 'Tasks'}
          </span>
        </div>

        {loadingHomework ? (
          <div className="p-6 text-center text-xs text-slate-400">Loading homework assignments...</div>
        ) : homeworkList.length === 0 ? (
          <div className="p-6 text-center text-xs text-slate-400">
            No homework assigned for this class and section today.
          </div>
        ) : (
          <div className="divide-y divide-slate-100 text-xs">
            {homeworkList.map((hw) => {
              const sub = hw.my_submission;
              return (
                <div key={hw.id} className="py-4 first:pt-0 last:pb-0 space-y-3">
                  <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-700 font-bold text-[10px]">
                          {hw.subject_name}
                        </span>
                        <h4 className="font-bold text-slate-900">{hw.title}</h4>
                      </div>
                      <p className="text-slate-600 whitespace-pre-wrap">{hw.description}</p>
                    </div>

                    <div className="flex items-center gap-3 text-[11px] self-end md:self-auto shrink-0">
                      <span className="text-slate-400">
                        Assigned by: <strong className="text-slate-600">{hw.assigned_by}</strong>
                      </span>
                      <div className="bg-amber-50 text-amber-800 px-2.5 py-1 rounded-lg font-bold border border-amber-200">
                        Due: {hw.due_date ? new Date(hw.due_date).toLocaleDateString() : 'N/A'}
                      </div>
                    </div>
                  </div>

                  {/* Submission Telemetry Bar */}
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                    {sub ? (
                      <div className="space-y-1.5 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                              sub.status === 'REVIEWED'
                                ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                                : 'bg-blue-100 text-blue-800 border border-blue-200'
                            }`}
                          >
                            <Check size={11} />
                            {sub.status === 'REVIEWED' ? 'Reviewed & Graded' : 'Submitted for Teacher Review'}
                          </span>
                          <span className="text-[11px] text-slate-500 font-mono">
                            Submitted on: {new Date(sub.submitted_at).toLocaleDateString()}
                          </span>
                        </div>

                        {sub.status === 'REVIEWED' && (
                          <div className="flex items-center gap-3 pt-1">
                            <div className="flex items-center gap-1 text-amber-500">
                              {[...Array(sub.rating_stars || 5)].map((_, i) => (
                                <Star key={i} size={13} className="fill-amber-400 text-amber-400" />
                              ))}
                              <span className="text-xs font-bold text-slate-700 ml-1">
                                {sub.rating_stars} / 5 Stars
                              </span>
                            </div>
                            {sub.teacher_feedback && (
                              <div className="text-xs text-slate-600 italic bg-white px-2 py-0.5 rounded border border-slate-200">
                                💬 "{sub.teacher_feedback}"
                              </div>
                            )}
                          </div>
                        )}

                        {sub.submission_text && (
                          <div className="text-[11px] text-slate-600">
                            <strong>My Notes:</strong> {sub.submission_text}
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                          Pending Submission
                        </span>
                        <span className="text-xs text-slate-500">
                          Complete exercises in notebook and submit photo for teacher verification.
                        </span>
                      </div>
                    )}

                    <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
                      {sub?.attachment_url && (
                        <a
                          href={sub.attachment_url}
                          target="_blank"
                          rel="noreferrer"
                          className="px-2.5 py-1 text-[11px] font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg border border-blue-200 transition-colors"
                        >
                          View Uploaded Photo
                        </a>
                      )}
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedHwToSubmit(hw);
                          setHwSubmissionForm({
                            submission_text: sub?.submission_text || '',
                            attachment_url: sub?.attachment_url || '',
                          });
                        }}
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all shadow-sm ${
                          sub
                            ? 'bg-slate-200 hover:bg-slate-300 text-slate-800'
                            : 'bg-blue-600 hover:bg-blue-500 text-white shadow-blue-500/20'
                        }`}
                      >
                        <Upload size={13} />
                        <span>{sub ? 'Re-Submit' : 'Submit Homework'}</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Leave Application Section */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <FileText size={16} className="text-blue-600" />
              <span>Student Leave Applications</span>
            </h3>
            <p className="text-xs text-slate-500">Submit illness or emergency leave request directly to class teacher</p>
          </div>
          <button
            onClick={() => setShowLeaveModal(true)}
            className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs px-4 py-2 rounded-xl shadow transition-colors"
          >
            <Plus size={14} />
            <span>Apply for Leave</span>
          </button>
        </div>

        {/* Leave Requests Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider">
                <th className="py-2.5 px-3">From Date</th>
                <th className="py-2.5 px-3">To Date</th>
                <th className="py-2.5 px-3">Reason</th>
                <th className="py-2.5 px-3">Status</th>
                <th className="py-2.5 px-3">Teacher Remarks</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {leaves.length > 0 ? (
                leaves.map((lv) => (
                  <tr key={lv.id} className="hover:bg-slate-50/80">
                    <td className="py-2.5 px-3 font-mono text-slate-700">{lv.from_date}</td>
                    <td className="py-2.5 px-3 font-mono text-slate-700">{lv.to_date}</td>
                    <td className="py-2.5 px-3 text-slate-800">{lv.reason}</td>
                    <td className="py-2.5 px-3">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          lv.status === 'APPROVED'
                            ? 'bg-emerald-100 text-emerald-800'
                            : lv.status === 'REJECTED'
                            ? 'bg-rose-100 text-rose-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {lv.status}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-slate-500">{lv.approval_remarks || '-'}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="text-center py-6 text-slate-400">
                    No leave requests submitted yet for this session.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Apply for Leave */}
      {showLeaveModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4 text-xs">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <Calendar size={16} className="text-blue-600" />
                <span>Apply for Student Leave</span>
              </h3>
              <button onClick={() => setShowLeaveModal(false)} className="text-slate-400 hover:text-slate-600">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleApplyLeave} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">From Date *</label>
                  <input
                    type="date"
                    required
                    value={leaveForm.from_date}
                    onChange={(e) => setLeaveForm({ ...leaveForm, from_date: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">To Date *</label>
                  <input
                    type="date"
                    required
                    value={leaveForm.to_date}
                    onChange={(e) => setLeaveForm({ ...leaveForm, to_date: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Reason for Leave *</label>
                <textarea
                  required
                  rows={3}
                  placeholder="e.g. Fever and doctor advised 2 days bed rest / Urgent family event"
                  value={leaveForm.reason}
                  onChange={(e) => setLeaveForm({ ...leaveForm, reason: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg leading-relaxed"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowLeaveModal(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingLeave}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-bold shadow disabled:opacity-50"
                >
                  {submittingLeave ? 'Submitting...' : 'Submit Application'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Full Weekly Schedule */}
      {showWeeklyModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-3xl w-full p-6 shadow-2xl space-y-4 text-xs max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                  <Calendar size={16} className="text-blue-600" />
                  <span>Weekly Timetable — {selectedChild?.student_name}</span>
                </h3>
                <p className="text-slate-500 text-[11px]">
                  {selectedChild?.class_name} - {selectedChild?.section_name} | Session {timetableData?.academic_year_name || 'Current'}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold flex items-center gap-1"
                >
                  <Printer size={13} /> Print
                </button>
                <button onClick={() => setShowWeeklyModal(false)} className="text-slate-400 hover:text-slate-600">
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Weekly Routine Matrix */}
            <div className="overflow-x-auto border border-slate-200 rounded-xl">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase text-[10px]">
                    <th className="py-2.5 px-3">Period / Time</th>
                    {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].map((d) => (
                      <th key={d} className="py-2.5 px-3">
                        {d}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {(timetableData?.today_routine?.length
                    ? timetableData.today_routine
                    : timetableData?.weekly_routine?.Monday || []
                  ).map((p) => (
                    <tr key={p.period_id} className={p.is_break ? 'bg-amber-50/40' : 'hover:bg-slate-50/60'}>
                      <td className="py-2.5 px-3 font-mono text-[11px] font-bold text-slate-700 whitespace-nowrap bg-slate-50/40">
                        <div>{p.period_name}</div>
                        <div className="text-[10px] text-slate-400 font-normal">
                          {formatTime(p.start_time)}
                        </div>
                      </td>
                      {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].map((d) => {
                        const daySlots = timetableData?.weekly_routine?.[d] || [];
                        const slot = daySlots.find((s) => s.period_id === p.period_id);

                        if (p.is_break) {
                          return (
                            <td key={d} className="py-2 px-2 text-center text-amber-800 font-bold text-[10px]">
                              Recess
                            </td>
                          );
                        }

                        return (
                          <td key={d} className="py-2 px-2 align-top">
                            {slot && slot.subject_name ? (
                              <div className="p-1.5 rounded-lg bg-blue-50 border border-blue-100 text-[10px]">
                                <div className="font-bold text-blue-900 truncate">{slot.subject_name}</div>
                                {slot.teacher_name && (
                                  <div className="text-slate-500 truncate text-[9px] mt-0.5">{slot.teacher_name}</div>
                                )}
                              </div>
                            ) : (
                              <span className="text-slate-300 text-[10px]">-</span>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setShowWeeklyModal(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-bold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Homework Submission Modal */}
      {selectedHwToSubmit && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-blue-700 bg-blue-50 px-2 py-0.5 rounded">
                  {selectedHwToSubmit.subject_name}
                </span>
                <h3 className="text-base font-bold text-slate-900 mt-1">Submit Homework Assignment</h3>
                <p className="text-xs text-slate-500 font-medium truncate max-w-sm">{selectedHwToSubmit.title}</p>
              </div>
              <button
                onClick={() => setSelectedHwToSubmit(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmitHomework} className="p-6 space-y-4 overflow-y-auto flex-1">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Student Notes / Working Summary
                </label>
                <textarea
                  rows={3}
                  value={hwSubmissionForm.submission_text}
                  onChange={(e) => setHwSubmissionForm({ ...hwSubmissionForm, submission_text: e.target.value })}
                  placeholder="e.g. Completed all 10 questions of Exercise 4.2 in rough copy. Attached photo below."
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Upload Photo of Completed Notebook Page
                </label>
                <div className="border-2 border-dashed border-slate-200 rounded-xl p-4 text-center hover:border-blue-400 transition-colors bg-slate-50/50">
                  {hwSubmissionForm.attachment_url ? (
                    <div className="space-y-2">
                      <img
                        src={hwSubmissionForm.attachment_url}
                        alt="Notebook page"
                        className="max-h-48 mx-auto rounded-lg shadow-sm border border-slate-200 object-contain"
                      />
                      <button
                        type="button"
                        onClick={() => setHwSubmissionForm({ ...hwSubmissionForm, attachment_url: '' })}
                        className="text-xs text-rose-600 font-bold hover:underline"
                      >
                        Remove Photo & Re-upload
                      </button>
                    </div>
                  ) : (
                    <label className="cursor-pointer block space-y-2">
                      <div className="w-10 h-10 mx-auto rounded-full bg-blue-50 text-blue-600 flex items-center justify-center">
                        <Camera size={20} />
                      </div>
                      <div className="text-xs font-bold text-slate-700">Take Photo or Choose File</div>
                      <div className="text-[11px] text-slate-400">JPEG, PNG up to 10MB (auto-compressed)</div>
                      <input
                        type="file"
                        accept="image/*"
                        capture="environment"
                        onChange={handleHomeworkPhotoUpload}
                        className="hidden"
                      />
                    </label>
                  )}
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setSelectedHwToSubmit(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingHw}
                  className="flex items-center gap-1.5 px-5 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-500/20 transition-all"
                >
                  {submittingHw ? (
                    <>
                      <Loader2 size={13} className="animate-spin" />
                      <span>Submitting...</span>
                    </>
                  ) : (
                    <>
                      <Upload size={13} />
                      <span>Confirm & Submit</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Online Fee Payment via Direct UPI / Gateway */}
      {showPaymentModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl overflow-hidden border border-slate-100 flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-emerald-600 to-teal-700 p-5 text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-white/10 rounded-xl backdrop-blur-sm">
                  <Smartphone size={22} className="text-emerald-100" />
                </div>
                <div>
                  <h3 className="font-bold text-sm">Online Fee Payment</h3>
                  <p className="text-xs text-emerald-100">
                    {selectedChild?.student_name} (Class {selectedChild?.class_name})
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowPaymentModal(false)}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors text-white"
              >
                <X size={16} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-5 text-xs">
              {loadingGateways ? (
                <div className="py-12 text-center text-slate-400 space-y-2">
                  <Loader2 size={24} className="animate-spin mx-auto text-emerald-600" />
                  <p>Loading school payment gateway configuration...</p>
                </div>
              ) : activeGateways.length === 0 ? (
                <div className="py-8 text-center space-y-3 bg-amber-50 rounded-xl p-5 border border-amber-200">
                  <AlertCircle size={28} className="mx-auto text-amber-600" />
                  <div className="font-bold text-slate-800 text-sm">Online Payment Unavailable</div>
                  <p className="text-slate-600 text-xs">
                    This school has not enabled online payment gateways yet. Please make payment in cash or cheque at the school accounts counter.
                  </p>
                  <button
                    type="button"
                    onClick={() => setShowPaymentModal(false)}
                    className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg font-bold"
                  >
                    Close
                  </button>
                </div>
              ) : paymentStep === 'AMOUNT' ? (
                /* Step 1: Select Amount & Mode */
                <form onSubmit={handleCreateOrder} className="space-y-4">
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex items-center justify-between">
                    <div>
                      <div className="text-[11px] font-semibold text-slate-500 uppercase">Outstanding Balance</div>
                      <div className="text-xl font-black text-slate-900">
                        ₹{overview?.fees?.outstanding_balance !== undefined ? overview.fees.outstanding_balance.toLocaleString() : '0.00'}
                      </div>
                    </div>
                    <div className="text-right text-[11px] text-slate-500">
                      <div>Adm #: <span className="font-bold font-mono text-slate-700">{selectedChild?.admission_no}</span></div>
                      <div>Roll #: <span className="font-bold font-mono text-slate-700">{selectedChild?.roll_no || '-'}</span></div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-slate-700 font-bold mb-1">
                      Enter Amount to Pay (₹) <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="number"
                      step="1"
                      min="1"
                      required
                      placeholder="Enter amount"
                      value={payAmount}
                      onChange={(e) => setPayAmount(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-base text-slate-900 focus:outline-none focus:border-emerald-500 focus:bg-white transition-all"
                    />
                    {overview?.fees?.outstanding_balance > 0 && (
                      <div className="flex flex-wrap gap-2 mt-2">
                        <button
                          type="button"
                          onClick={() => setPayAmount(overview.fees.outstanding_balance.toString())}
                          className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 rounded-lg text-[11px] font-bold border border-emerald-200"
                        >
                          Pay Full Due (₹{overview.fees.outstanding_balance})
                        </button>
                        {overview.fees.outstanding_balance > 1000 && (
                          <button
                            type="button"
                            onClick={() => setPayAmount('1000')}
                            className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-[11px] font-semibold"
                          >
                            ₹1,000
                          </button>
                        )}
                        {overview.fees.outstanding_balance > 2500 && (
                          <button
                            type="button"
                            onClick={() => setPayAmount('2500')}
                            className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-[11px] font-semibold"
                          >
                            ₹2,500
                          </button>
                        )}
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-slate-700 font-bold mb-1">
                      Select Payment Method
                    </label>
                    <div className="space-y-2">
                      {activeGateways.map((gw) => (
                        <label
                          key={gw.provider}
                          className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                            selectedGateway === gw.provider
                              ? 'bg-emerald-50/60 border-emerald-500 shadow-sm'
                              : 'bg-white border-slate-200 hover:bg-slate-50'
                          }`}
                        >
                          <input
                            type="radio"
                            name="gateway"
                            value={gw.provider}
                            checked={selectedGateway === gw.provider}
                            onChange={(e) => setSelectedGateway(e.target.value)}
                            className="mt-0.5 text-emerald-600 focus:ring-emerald-500"
                          />
                          <div className="flex-1">
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-slate-800">
                                {gw.provider === 'DIRECT_UPI_QR'
                                  ? 'Direct School UPI (Google Pay, PhonePe, Paytm, BHIM)'
                                  : 'Cards / NetBanking (Razorpay)'}
                              </span>
                              {gw.provider === 'DIRECT_UPI_QR' && (
                                <span className="px-2 py-0.5 rounded text-[10px] font-black bg-emerald-100 text-emerald-800">
                                  0% Surcharge
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-slate-500 mt-0.5">
                              {gw.provider === 'DIRECT_UPI_QR'
                                ? `Pay directly to ${gw.upi_payee_name || 'School Bank Account'}`
                                : 'Debit/Credit card, Netbanking, or Wallet payment'}
                            </p>
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div className="pt-2">
                    <button
                      type="submit"
                      disabled={creatingOrder || !payAmount || parseFloat(payAmount) <= 0}
                      className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20 transition-all cursor-pointer"
                    >
                      {creatingOrder ? (
                        <>
                          <Loader2 size={15} className="animate-spin" />
                          <span>Generating Payment Order...</span>
                        </>
                      ) : (
                        <>
                          <span>Proceed to Pay ₹{parseFloat(payAmount || 0).toLocaleString()}</span>
                          <ArrowRight size={14} />
                        </>
                      )}
                    </button>
                  </div>
                </form>
              ) : paymentStep === 'QR_PAY' ? (
                /* Step 2: UPI QR Code & UTR Submission */
                <div className="space-y-4">
                  <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 flex items-center justify-between">
                    <div>
                      <div className="text-[10px] uppercase font-bold text-slate-400">Order Reference</div>
                      <div className="font-mono font-bold text-blue-700">{currentOrder?.order_number}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-[10px] uppercase font-bold text-slate-400">Amount Due</div>
                      <div className="font-black text-emerald-700 text-base">₹{currentOrder?.amount?.toLocaleString()}</div>
                    </div>
                  </div>

                  {/* QR Code Card */}
                  <div className="bg-gradient-to-b from-slate-50 to-white p-5 rounded-2xl border border-slate-200 text-center space-y-3">
                    <div className="inline-block p-2 bg-white rounded-xl shadow-sm border border-slate-200">
                      <img
                        src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(currentOrder?.upi_payment_link || '')}`}
                        alt="NPCI UPI QR Code"
                        className="w-44 h-44 mx-auto rounded-lg"
                      />
                    </div>

                    <div className="space-y-1">
                      <div className="font-bold text-slate-800 text-sm flex items-center justify-center gap-1.5">
                        <span>Scan & Pay via any UPI App</span>
                      </div>
                      <p className="text-[11px] text-slate-500">
                        Payee: <strong>{currentOrder?.upi_payee_name}</strong>
                      </p>
                    </div>

                    {/* VPA copy row */}
                    {currentOrder?.upi_vpa && (
                      <div className="flex items-center justify-center gap-2 max-w-xs mx-auto bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200">
                        <span className="font-mono font-bold text-slate-700 text-xs truncate">
                          {currentOrder.upi_vpa}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleCopyVpa(currentOrder.upi_vpa)}
                          className="text-blue-600 hover:text-blue-800 flex items-center gap-1 font-bold text-[11px] shrink-0"
                          title="Copy UPI ID"
                        >
                          <Copy size={12} />
                          <span>{copySuccess ? 'Copied!' : 'Copy'}</span>
                        </button>
                      </div>
                    )}

                    {/* Mobile App Deep Link Button */}
                    {currentOrder?.upi_payment_link && (
                      <div className="pt-1">
                        <a
                          href={currentOrder.upi_payment_link}
                          className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold shadow transition-all"
                        >
                          <ExternalLink size={13} />
                          <span>Open in PhonePe / GPay / Paytm</span>
                        </a>
                      </div>
                    )}
                  </div>

                  {/* Step-by-Step Instructions */}
                  <div className="bg-blue-50/70 p-3.5 rounded-xl border border-blue-200/60 text-[11px] text-blue-900 space-y-1.5">
                    <div className="font-bold flex items-center gap-1.5">
                      <ShieldCheck size={14} className="text-blue-600" />
                      <span>Next Steps after Payment:</span>
                    </div>
                    <ol className="list-decimal list-inside space-y-0.5 text-blue-800 font-medium pl-1">
                      <li>Complete transfer in your UPI app.</li>
                      <li>Find the <strong>12-digit UTR / UPI Ref ID</strong> on the success receipt.</li>
                      <li>Enter the 12-digit UTR below and click <strong>Submit Payment Reference</strong>.</li>
                    </ol>
                  </div>

                  {/* UTR Input Form */}
                  <form onSubmit={handleSubmitUtr} className="space-y-3 pt-1">
                    <div>
                      <label className="block text-slate-700 font-bold mb-1">
                        12-Digit Bank Transaction Reference / UTR <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. 423456789012 or T240927..."
                        value={utrNumber}
                        onChange={(e) => setUtrNumber(e.target.value.trim())}
                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono font-bold text-slate-800 uppercase tracking-wider focus:outline-none focus:border-blue-500 focus:bg-white"
                      />
                    </div>

                    <div className="flex items-center gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => setPaymentStep('AMOUNT')}
                        className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold transition-colors"
                      >
                        Back
                      </button>
                      <button
                        type="submit"
                        disabled={submittingUtr || utrNumber.length < 6}
                        className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-xl font-bold flex items-center justify-center gap-1.5 shadow-md shadow-emerald-600/20 transition-all cursor-pointer"
                      >
                        {submittingUtr ? (
                          <>
                            <Loader2 size={14} className="animate-spin" />
                            <span>Submitting Reference...</span>
                          </>
                        ) : (
                          <>
                            <CheckCircle2 size={14} />
                            <span>Submit Payment Reference</span>
                          </>
                        )}
                      </button>
                    </div>
                  </form>
                </div>
              ) : (
                /* Step 3: Success Confirmation */
                <div className="text-center py-6 space-y-4">
                  <div className="w-14 h-14 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-inner">
                    <CheckCircle2 size={32} />
                  </div>
                  <div>
                    <h4 className="text-base font-bold text-slate-900">Payment Reference Submitted!</h4>
                    <p className="text-slate-500 text-xs mt-1">
                      Your payment verification request has been queued for the school accounts desk.
                    </p>
                  </div>

                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-left space-y-2 text-xs">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Order Number:</span>
                      <span className="font-mono font-bold text-blue-700">{currentOrder?.order_number}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Amount Paid:</span>
                      <span className="font-bold text-emerald-700">₹{currentOrder?.amount?.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Submitted UTR:</span>
                      <span className="font-mono font-bold text-slate-800">{currentOrder?.utr_number}</span>
                    </div>
                    <div className="flex justify-between items-center pt-1 border-t border-slate-200">
                      <span className="text-slate-500">Current Status:</span>
                      <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 font-bold text-[10px] uppercase">
                        Verification Pending
                      </span>
                    </div>
                  </div>

                  <div className="p-3 bg-amber-50 rounded-xl border border-amber-200/70 text-[11px] text-amber-900 text-left">
                    💡 <strong>What happens next?</strong> The school cashier will verify this UTR against the school bank account statement. Once approved, your pending balance will clear and your official fee receipt will be immediately available.
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setShowPaymentModal(false);
                      if (selectedChildId) {
                        api.get(`/parent/children/${selectedChildId}/overview`).then(res => res.data && setOverview(res.data));
                      }
                    }}
                    className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold transition-all"
                  >
                    Done & Return to Dashboard
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
