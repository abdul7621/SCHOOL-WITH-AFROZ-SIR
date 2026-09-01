import React, { useState, useEffect } from 'react';
import { Users, Calendar, CreditCard, Award, ChevronRight, CheckCircle2 } from 'lucide-react';
import api from '../../api/client';

export const ParentDashboard = () => {
  const [children, setChildren] = useState([
    {
      student_id: 'st_01',
      student_name: 'Zaid Khan',
      admission_no: 'ADM-2026-0001',
      class_name: 'Class 8',
      section_name: 'Section A',
      roll_no: 12,
    },
  ]);
  const [selectedChild, setSelectedChild] = useState('st_01');

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Multi-child Switcher Bar */}
      <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-3">
        <span className="text-xs font-bold text-slate-500 uppercase px-2">Select Child:</span>
        <div className="flex gap-2">
          {children.map((ch) => (
            <button
              key={ch.student_id}
              onClick={() => setSelectedChild(ch.student_id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                selectedChild === ch.student_id
                  ? 'bg-blue-600 text-white shadow'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              <div className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center text-[10px]">
                {ch.student_name[0]}
              </div>
              <span>{ch.student_name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Child Summary Card */}
      <div className="bg-gradient-to-r from-blue-900 to-indigo-900 rounded-2xl p-6 text-white shadow-lg">
        <div className="flex items-center justify-between">
          <div>
            <span className="text-xs bg-blue-500/30 text-blue-200 font-semibold px-2.5 py-1 rounded-md">
              Class 8 - Section A | Roll #12
            </span>
            <h2 className="text-2xl font-black mt-2">Zaid Khan</h2>
            <p className="text-xs text-blue-200 font-mono">Admission No: ADM-2026-0001</p>
          </div>
          <div className="text-right">
            <div className="text-xs text-blue-200 uppercase font-semibold">Today Attendance</div>
            <div className="inline-flex items-center gap-1.5 bg-emerald-500/20 text-emerald-300 font-bold px-3 py-1.5 rounded-lg text-sm mt-1 border border-emerald-400/30">
              <CheckCircle2 size={16} />
              <span>PRESENT</span>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Action Tiles */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-2">
          <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <CreditCard size={20} />
          </div>
          <div className="text-xs font-semibold text-slate-500 uppercase">Pending Fee Dues</div>
          <div className="text-xl font-bold text-slate-900">₹0.00 (All Clear)</div>
          <div className="text-[11px] text-emerald-600 font-semibold">Next Installment due: 10th Oct</div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-2">
          <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
            <Calendar size={20} />
          </div>
          <div className="text-xs font-semibold text-slate-500 uppercase">Monthly Attendance</div>
          <div className="text-xl font-bold text-slate-900">96.5%</div>
          <div className="text-[11px] text-slate-500">22 Present / 23 Days</div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-2">
          <div className="w-10 h-10 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
            <Award size={20} />
          </div>
          <div className="text-xs font-semibold text-slate-500 uppercase">Behavioral Rating</div>
          <div className="text-xl font-bold text-amber-500">★★★★★</div>
          <div className="text-[11px] text-slate-500">Excellent Leadership & Discipline</div>
        </div>
      </div>
    </div>
  );
};
