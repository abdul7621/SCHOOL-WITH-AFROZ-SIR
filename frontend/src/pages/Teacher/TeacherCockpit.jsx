import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Clock,
  Calendar,
  BookOpen,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  Plus,
  CheckSquare,
  Users,
  Award,
  ChevronRight,
  ArrowRight,
  ShieldCheck,
  CalendarCheck,
  Coffee,
  School,
  RefreshCw,
} from 'lucide-react';
import api from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { useTenant } from '../../context/TenantContext';

export const TeacherCockpit = () => {
  const { user } = useAuth();
  const { settings } = useTenant();
  const navigate = useNavigate();

  const [cockpitData, setCockpitData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const fetchCockpit = async (isManual = false) => {
    if (isManual) setRefreshing(true);
    try {
      const res = await api.get('/academics/teacher-cockpit');
      setCockpitData(res.data || res);
      setError('');
    } catch (err) {
      console.error('Failed to load teacher cockpit:', err);
      setError('Failed to fetch cockpit dashboard. Please try refreshing.');
    } finally {
      setLoading(false);
      if (isManual) setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchCockpit();
    // Auto-refresh every 60 seconds to update live period indicators
    const interval = setInterval(() => fetchCockpit(), 60000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center p-8 space-y-3">
        <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">
          Loading Teacher Cockpit & Live Schedule...
        </p>
      </div>
    );
  }

  const currentPeriod = cockpitData?.current_period;
  const isTeachingNow = currentPeriod?.teaching_slot;
  const classTeacherSections = cockpitData?.class_teacher_sections || [];
  const todaySchedule = cockpitData?.today_schedule || [];
  const recentHomework = cockpitData?.recent_homework || [];

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* 1. Header Banner */}
      <div className="bg-gradient-to-r from-blue-700 via-indigo-700 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 translate-x-12 -translate-y-12 w-64 h-64 bg-white/5 rounded-full blur-2xl pointer-events-none"></div>

        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md text-blue-200 text-xs font-semibold">
              <Sparkles size={14} className="text-amber-400" />
              <span>Teacher Academic Command Cockpit</span>
              {cockpitData?.employee_id && (
                <span className="bg-white/20 px-2 py-0.2 rounded-full font-mono text-[10px]">
                  Emp #{cockpitData.employee_id}
                </span>
              )}
            </div>

            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
              Welcome back, {cockpitData?.teacher_name || user?.username}!
            </h1>

            <p className="text-xs sm:text-sm text-blue-100 flex flex-wrap items-center gap-3">
              <span className="flex items-center gap-1.5 font-medium">
                <Calendar size={15} className="text-blue-300" />
                {cockpitData?.today_day}, {cockpitData?.today_date}
              </span>
              <span>•</span>
              <span className="flex items-center gap-1.5 font-medium">
                <School size={15} className="text-blue-300" />
                {settings.school_name || 'Academic Institution'}
              </span>
            </p>
          </div>

          <div className="flex items-center gap-2 self-stretch sm:self-auto">
            <button
              onClick={() => fetchCockpit(true)}
              disabled={refreshing}
              className="px-4 py-2.5 bg-white/10 hover:bg-white/20 backdrop-blur-md rounded-xl text-xs font-bold text-white flex items-center justify-center gap-2 transition-all border border-white/10 shadow-sm"
              title="Refresh Cockpit Radar"
            >
              <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
              <span>{refreshing ? 'Syncing...' : 'Sync Radar'}</span>
            </button>
            <button
              onClick={() => navigate('/academics?tab=homework')}
              className="px-5 py-2.5 bg-blue-500 hover:bg-blue-400 text-white rounded-xl text-xs font-bold shadow-lg shadow-blue-500/30 flex items-center justify-center gap-2 transition-all"
            >
              <Plus size={15} />
              <span>Assign Homework</span>
            </button>
          </div>
        </div>

        {/* Live Period Banner */}
        <div className="mt-6 pt-5 border-t border-white/15 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="relative flex h-3.5 w-3.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-emerald-500"></span>
            </span>

            {currentPeriod ? (
              isTeachingNow ? (
                <div className="text-xs">
                  <span className="font-bold text-emerald-300 uppercase tracking-wider text-[11px] mr-2">
                    Live Now • {currentPeriod.name} ({currentPeriod.start_time} - {currentPeriod.end_time})
                  </span>
                  <span className="font-extrabold text-white">
                    {isTeachingNow.class_name} ({isTeachingNow.section_name}) — {isTeachingNow.subject_name}
                  </span>
                  {isTeachingNow.room_number && (
                    <span className="text-blue-200 ml-2 font-medium">Room {isTeachingNow.room_number}</span>
                  )}
                </div>
              ) : currentPeriod.is_break ? (
                <div className="text-xs font-semibold text-amber-300 flex items-center gap-1.5">
                  <Coffee size={14} /> Recess / Break Time in Progress ({currentPeriod.start_time} - {currentPeriod.end_time})
                </div>
              ) : (
                <div className="text-xs font-medium text-blue-200">
                  Current Period ({currentPeriod.name}): Free Period (No teaching assignment scheduled)
                </div>
              )
            ) : (
              <div className="text-xs font-medium text-blue-200">
                School Routine Inactive or Outside Bell Timings
              </div>
            )}
          </div>

          <div className="flex items-center gap-4 text-xs font-medium text-blue-200">
            <span>
              Classes Today: <strong className="text-white">{cockpitData?.total_classes_today || 0}</strong>
            </span>
            <span>•</span>
            <span>
              Pending Reviews: <strong className="text-amber-300">{cockpitData?.total_pending_grading || 0}</strong>
            </span>
          </div>
        </div>
      </div>

      {/* 2. Class Teacher Alert Cards */}
      {classTeacherSections.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-2">
            <ShieldCheck size={16} className="text-blue-600" />
            <span>Class Teacher Duty Status</span>
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {classTeacherSections.map((cts) => (
              <div
                key={`${cts.class_id}-${cts.section_id}`}
                className={`p-5 rounded-2xl border transition-all ${
                  cts.attendance_marked
                    ? 'bg-emerald-50/40 border-emerald-200'
                    : 'bg-amber-50/80 border-amber-300 shadow-sm'
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1">
                    <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-white border border-slate-200 text-slate-700">
                      Assigned Class Teacher
                    </span>
                    <h3 className="text-base font-extrabold text-slate-900">
                      {cts.class_name} — Section {cts.section_name}
                    </h3>
                    <p className="text-xs text-slate-600">
                      {cts.attendance_marked
                        ? "✅ Today's student attendance has been recorded and submitted."
                        : "⚠️ Today's student attendance is pending! Please take attendance for your class roster."}
                    </p>
                  </div>

                  <div>
                    {cts.attendance_marked ? (
                      <button
                        onClick={() => navigate('/attendance')}
                        className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all"
                      >
                        <CalendarCheck size={14} /> View Roster
                      </button>
                    ) : (
                      <button
                        onClick={() => navigate('/attendance')}
                        className="px-4 py-2.5 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md shadow-amber-600/20 transition-all animate-pulse"
                      >
                        <CalendarCheck size={14} /> Mark Attendance
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 3. Today's Teaching Schedule Radar */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-2">
            <Clock size={16} className="text-blue-600" />
            <span>Today's Daily Bell Schedule & Periods ({cockpitData?.today_day})</span>
          </h2>
          <button
            onClick={() => navigate('/academics/timetable')}
            className="text-xs text-blue-600 hover:text-blue-700 font-bold flex items-center gap-1"
          >
            <span>Full Weekly Timetable</span>
            <ChevronRight size={14} />
          </button>
        </div>

        {todaySchedule.length === 0 ? (
          <div className="bg-white p-8 rounded-2xl border border-slate-200 text-center text-xs text-slate-400">
            No bell periods configured yet for the school. Configure in Timetable & Syllabus Hub.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
            {todaySchedule.map((period) => {
              const slot = period.teaching_slot;
              const isNow = period.is_active_now;
              const isBreak = period.is_break;

              return (
                <div
                  key={period.period_id}
                  className={`p-4 rounded-2xl border transition-all flex flex-col justify-between min-h-[140px] ${
                    isNow
                      ? 'border-blue-500 bg-blue-50/50 shadow-md ring-2 ring-blue-500/20'
                      : isBreak
                      ? 'border-amber-200 bg-amber-50/30'
                      : slot
                      ? 'border-slate-200 bg-white hover:border-slate-300 shadow-sm'
                      : 'border-slate-100 bg-slate-50/50 text-slate-400'
                  }`}
                >
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs text-slate-900">{period.name}</span>
                      {isNow && (
                        <span className="px-2 py-0.5 rounded-full bg-blue-600 text-white font-extrabold text-[9px] uppercase tracking-wider">
                          Now
                        </span>
                      )}
                    </div>

                    <div className="font-mono text-[10px] text-slate-400 font-medium">
                      {period.start_time} - {period.end_time}
                    </div>

                    {isBreak ? (
                      <div className="pt-2 text-xs font-bold text-amber-700 flex items-center gap-1.5">
                        <Coffee size={14} /> Recess / Break
                      </div>
                    ) : slot ? (
                      <div className="pt-1 space-y-1">
                        <div className="font-bold text-slate-900 text-xs">{slot.subject_name}</div>
                        <div className="text-[11px] font-semibold text-blue-700">
                          {slot.class_name} ({slot.section_name})
                        </div>
                        {slot.room_number && (
                          <div className="text-[10px] text-slate-500">Room: {slot.room_number}</div>
                        )}
                      </div>
                    ) : (
                      <div className="pt-3 text-[11px] font-semibold text-slate-400 italic">
                        Free Period
                      </div>
                    )}
                  </div>

                  {slot && (
                    <div className="pt-3 border-t border-slate-100/80 mt-2">
                      <span className="text-[10px] font-bold text-blue-600 uppercase">Scheduled</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 4. Homework & Daily Assignments Station */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-2">
              <BookOpen size={16} className="text-blue-600" />
              <span>My Active Homework & Assignments</span>
            </h2>
            {cockpitData?.total_pending_grading > 0 && (
              <span className="px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[10px] font-bold">
                {cockpitData.total_pending_grading} Awaiting Review
              </span>
            )}
          </div>

          <button
            onClick={() => navigate('/academics?tab=homework')}
            className="text-xs text-blue-600 hover:text-blue-700 font-bold flex items-center gap-1"
          >
            <span>Manage All Homework</span>
            <ChevronRight size={14} />
          </button>
        </div>

        {recentHomework.length === 0 ? (
          <div className="bg-white p-8 rounded-2xl border border-slate-200 text-center space-y-3">
            <p className="text-xs text-slate-400">You haven't assigned any homework recently.</p>
            <button
              onClick={() => navigate('/academics?tab=homework')}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold shadow transition-all inline-flex items-center gap-1.5"
            >
              <Plus size={14} /> Assign Daily Homework
            </button>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden divide-y divide-slate-100 text-xs">
            {recentHomework.map((hw) => {
              const pendingReview = Math.max(0, hw.submission_count - hw.reviewed_count);

              return (
                <div
                  key={hw.id}
                  className="p-4 hover:bg-slate-50/70 transition-colors flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 font-bold text-[10px]">
                        {hw.subject_name}
                      </span>
                      <span className="font-semibold text-slate-500 text-[11px]">
                        {hw.class_name} ({hw.section_name})
                      </span>
                      <h4 className="font-bold text-slate-900 text-sm">{hw.title}</h4>
                    </div>
                    {hw.description && (
                      <p className="text-slate-600 text-xs line-clamp-1">{hw.description}</p>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-3 self-end md:self-auto shrink-0">
                    <div className="text-[11px] text-slate-400">
                      Due: <strong className="text-slate-700">{hw.due_date}</strong>
                    </div>

                    <div className="flex items-center gap-1.5 bg-slate-100 px-3 py-1 rounded-xl text-xs font-semibold text-slate-700">
                      <span>{hw.submission_count} Submitted</span>
                      <span>•</span>
                      <span className="text-emerald-700 font-bold">{hw.reviewed_count} Graded</span>
                    </div>

                    {pendingReview > 0 && (
                      <span className="px-2.5 py-1 rounded-xl bg-amber-100 text-amber-800 text-[11px] font-bold">
                        {pendingReview} to Grade
                      </span>
                    )}

                    <button
                      onClick={() => navigate('/academics?tab=homework')}
                      className="px-3.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors shadow-sm"
                    >
                      <CheckSquare size={13} />
                      <span>Review Submissions</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 5. Quick Shortcuts & Operations Dock */}
      <div className="space-y-3">
        <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-2">
          <Sparkles size={16} className="text-blue-600" />
          <span>Faculty Quick Utilities</span>
        </h2>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div
            onClick={() => navigate('/attendance')}
            className="p-4 bg-white hover:bg-slate-50 border border-slate-200 rounded-2xl shadow-sm cursor-pointer transition-all flex items-center gap-3 group"
          >
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center group-hover:scale-110 transition-transform">
              <CalendarCheck size={20} />
            </div>
            <div>
              <div className="font-bold text-xs text-slate-900">Take Attendance</div>
              <div className="text-[10px] text-slate-400">Daily roster marker</div>
            </div>
          </div>

          <div
            onClick={() => navigate('/academics?tab=homework')}
            className="p-4 bg-white hover:bg-slate-50 border border-slate-200 rounded-2xl shadow-sm cursor-pointer transition-all flex items-center gap-3 group"
          >
            <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center group-hover:scale-110 transition-transform">
              <BookOpen size={20} />
            </div>
            <div>
              <div className="font-bold text-xs text-slate-900">Homework Hub</div>
              <div className="text-[10px] text-slate-400">Assignments & notes</div>
            </div>
          </div>

          <div
            onClick={() => navigate('/development')}
            className="p-4 bg-white hover:bg-slate-50 border border-slate-200 rounded-2xl shadow-sm cursor-pointer transition-all flex items-center gap-3 group"
          >
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Award size={20} />
            </div>
            <div>
              <div className="font-bold text-xs text-slate-900">Awards & Merits</div>
              <div className="text-[10px] text-slate-400">Student recognition</div>
            </div>
          </div>

          <div
            onClick={() => navigate('/academics/timetable')}
            className="p-4 bg-white hover:bg-slate-50 border border-slate-200 rounded-2xl shadow-sm cursor-pointer transition-all flex items-center gap-3 group"
          >
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Clock size={20} />
            </div>
            <div>
              <div className="font-bold text-xs text-slate-900">Weekly Schedule</div>
              <div className="text-[10px] text-slate-400">Timetable radar</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
