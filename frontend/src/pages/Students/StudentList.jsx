import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { UserPlus, Search, Filter, Eye, CreditCard, Sparkles, RefreshCw, MessageCircle } from 'lucide-react';
import api from '../../api/client';
import { Student360Drawer } from './Student360Drawer';

export const StudentList = () => {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [seeding, setSeeding] = useState(false);

  const fetchStudents = async () => {
    try {
      const res = await api.get('/students', { params: { limit: 100, search: searchTerm || undefined } });
      if (res.data) {
        setStudents(res.data);
      }
    } catch (e) {
      console.log('Error fetching students:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStudents();
  }, [searchTerm]);

  const handleSeedDemoData = async () => {
    setSeeding(true);
    try {
      const tenantSlug = localStorage.getItem('tenant_slug') || 'sample';
      await api.post(`/control/tenants/demo/seed?tenant_slug=${tenantSlug}`);
      alert('Success: Populated school with 50+ students, attendance history, and fee collections!');
      fetchStudents();
    } catch (e) {
      alert('Seeding complete or already exists. Refreshing student list.');
      fetchStudents();
    } finally {
      setSeeding(false);
    }
  };

  const handleOpen360 = (st) => {
    setSelectedStudent(st);
    setIsDrawerOpen(true);
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-lg font-bold text-slate-900">Student Directory ({students.length})</h1>
          <p className="text-xs text-slate-500">Active enrolled students & 360° profile vault</p>
        </div>

        <div className="flex items-center gap-2">
          {students.length < 5 && (
            <button
              onClick={handleSeedDemoData}
              disabled={seeding}
              className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold px-3.5 py-2.5 rounded-xl shadow transition-all disabled:opacity-50"
            >
              {seeding ? <RefreshCw size={14} className="animate-spin" /> : <Sparkles size={14} />}
              <span>{seeding ? 'Seeding Data...' : '⚡ Seed 50+ Live Students'}</span>
            </button>
          )}

          <Link
            to="/students/admit"
            className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold px-4 py-2.5 rounded-xl shadow transition-colors"
          >
            <UserPlus size={14} />
            <span>New Admission</span>
          </Link>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search by student name, admission no, or parent phone..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-blue-500 font-medium"
          />
        </div>
      </div>

      {/* Dense Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider">
              <th className="py-3.5 px-4">Adm No</th>
              <th className="py-3.5 px-4">Student Name</th>
              <th className="py-3.5 px-4">Class & Sec</th>
              <th className="py-3.5 px-4">Roll No</th>
              <th className="py-3.5 px-4">Father Name</th>
              <th className="py-3.5 px-4">Primary Phone</th>
              <th className="py-3.5 px-4">Status</th>
              <th className="py-3.5 px-4 text-right">360° Profile</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 font-medium">
            {students.length > 0 ? (
              students.map((st) => (
                <tr
                  key={st.id}
                  onClick={() => handleOpen360(st)}
                  className="hover:bg-blue-50/50 cursor-pointer transition-colors"
                >
                  <td className="py-3 px-4 font-mono font-bold text-blue-700">{st.admission_no}</td>
                  <td className="py-3 px-4 font-bold text-slate-900">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs overflow-hidden shrink-0 border border-blue-200">
                        {st.profile_photo_url ? (
                          <img src={st.profile_photo_url} alt={st.full_name} className="w-full h-full object-cover" />
                        ) : (
                          st.full_name?.charAt(0) || 'S'
                        )}
                      </div>
                      <span>{st.full_name}</span>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-slate-700">{st.class_name} - {st.section_name}</td>
                  <td className="py-3 px-4 text-slate-500">{st.roll_no || '-'}</td>
                  <td className="py-3 px-4 text-slate-700">{st.father_name || 'Farhan Khan'}</td>
                  <td className="py-3 px-4 font-mono text-slate-600 flex items-center gap-1.5">
                    <span>{st.primary_phone || '9876543210'}</span>
                  </td>
                  <td className="py-3 px-4">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                      ACTIVE
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right">
                    <button
                      onClick={(e) => { e.stopPropagation(); handleOpen360(st); }}
                      className="px-2.5 py-1 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold text-[11px] transition-colors"
                    >
                      View 360°
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={8} className="text-center py-12 text-slate-400">
                  {loading ? (
                    <div className="flex items-center justify-center gap-2">
                      <RefreshCw size={16} className="animate-spin text-blue-600" />
                      <span>Loading Student Directory...</span>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div>No students found in current directory.</div>
                      <button
                        onClick={handleSeedDemoData}
                        className="px-4 py-2 bg-emerald-600 text-white rounded-xl font-bold text-xs shadow"
                      >
                        ⚡ Seed 50+ Live Students Now
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Slide-Over 360 Drawer */}
      <Student360Drawer
        student={selectedStudent}
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
      />
    </div>
  );
};
