import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { UserPlus, Search, Filter, Eye, CreditCard, ChevronRight } from 'lucide-react';
import api from '../../api/client';

export const StudentList = () => {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const fetchStudents = async () => {
      try {
        const res = await api.get('/students', { params: { limit: 50, search: searchTerm || undefined } });
        if (res.data) {
          setStudents(res.data);
        }
      } catch (e) {
        console.log('Error fetching students:', e);
      } finally {
        setLoading(false);
      }
    };

    fetchStudents();
  }, [searchTerm]);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-lg font-bold text-slate-900">Student Directory</h1>
          <p className="text-xs text-slate-500">Active enrolled students roster</p>
        </div>

        <Link
          to="/students/admit"
          className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold px-4 py-2.5 rounded-lg shadow transition-colors"
        >
          <UserPlus size={14} />
          <span>New Admission</span>
        </Link>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm flex items-center gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search by student name, admission no, or parent phone..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500"
          />
        </div>
      </div>

      {/* Dense Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider">
              <th className="py-3 px-4">Adm No</th>
              <th className="py-3 px-4">Student Name</th>
              <th className="py-3 px-4">Class & Sec</th>
              <th className="py-3 px-4">Roll No</th>
              <th className="py-3 px-4">Father Name</th>
              <th className="py-3 px-4">Primary Phone</th>
              <th className="py-3 px-4">Status</th>
              <th className="py-3 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 font-medium">
            {students.length > 0 ? (
              students.map((st) => (
                <tr key={st.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-3 px-4 font-bold text-blue-700">{st.admission_no}</td>
                  <td className="py-3 px-4 font-semibold text-slate-900">{st.full_name}</td>
                  <td className="py-3 px-4">{st.class_name} - {st.section_name}</td>
                  <td className="py-3 px-4">{st.roll_no || '-'}</td>
                  <td className="py-3 px-4 text-slate-600">{st.father_name}</td>
                  <td className="py-3 px-4 text-slate-600">{st.primary_phone}</td>
                  <td className="py-3 px-4">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                      {st.status_name}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Link
                        to={`/fees?student_id=${st.id}`}
                        className="p-1 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded"
                        title="Fee Ledger"
                      >
                        <CreditCard size={14} />
                      </Link>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={8} className="text-center py-8 text-slate-400">
                  {loading ? 'Loading student roster...' : 'No students found matching your search.'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
