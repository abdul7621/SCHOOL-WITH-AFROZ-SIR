import React, { useState, useEffect } from 'react';
import {
  Users,
  UserPlus,
  Search,
  Mail,
  Phone,
  Calendar,
  Briefcase,
  Building2,
  CheckCircle2,
  Shield,
  Plus,
  X,
  Edit3,
  Key,
  Lock,
  Eye,
  EyeOff,
  Copy,
  Check,
  RefreshCw,
  AlertCircle,
} from 'lucide-react';
import api from '../../api/client';

export const StaffDirectory = () => {
  const [staffList, setStaffList] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [designations, setDesignations] = useState([]);
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState('');

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDept, setSelectedDept] = useState('');
  const [selectedDesig, setSelectedDesig] = useState('');

  // Modals State
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);
  const [showDeptModal, setShowDeptModal] = useState(false);
  const [showDesigModal, setShowDesigModal] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [toastMessage, setToastMessage] = useState('');

  // Add Staff Form
  const [formData, setFormData] = useState({
    employee_id: '',
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    password: '',
    designation_id: '',
    department_id: '',
    role_id: '',
    qualification: '',
    joining_date: new Date().toISOString().split('T')[0],
    emergency_contact: '',
  });

  // Edit Staff State
  const [editingStaff, setEditingStaff] = useState(null);
  const [editFormData, setEditFormData] = useState({
    employee_id: '',
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    designation_id: '',
    department_id: '',
    role_id: '',
    qualification: '',
    joining_date: '',
    emergency_contact: '',
    is_active: true,
  });

  // Reset Password State
  const [resetStaff, setResetStaff] = useState(null);
  const [newPassword, setNewPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [copied, setCopied] = useState(false);

  // Quick Add Dept / Desig
  const [newDeptName, setNewDeptName] = useState('');
  const [newDeptCode, setNewDeptCode] = useState('');
  const [newDesigTitle, setNewDesigTitle] = useState('');
  const [newDesigCode, setNewDesigCode] = useState('');

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 4000);
  };

  const loadData = async () => {
    setLoading(true);
    setFetchError('');
    try {
      const [staffRes, deptRes, desigRes, roleRes] = await Promise.all([
        api.get('/staff'),
        api.get('/staff/departments'),
        api.get('/staff/designations'),
        api.get('/staff/roles'),
      ]);
      if (staffRes.data) setStaffList(staffRes.data);
      if (deptRes.data) setDepartments(deptRes.data);
      if (desigRes.data) setDesignations(desigRes.data);
      if (roleRes.data) setRoles(roleRes.data);
    } catch (err) {
      console.error('Error loading staff directory data:', err);
      setFetchError(err.message || 'Failed to load staff list from server.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Open Edit Modal with prefilled data
  const handleOpenEdit = (staff) => {
    setEditingStaff(staff);
    setFormError('');
    setEditFormData({
      employee_id: staff.employee_id || '',
      first_name: staff.first_name || staff.full_name?.split(' ')[0] || '',
      last_name: staff.last_name || staff.full_name?.split(' ').slice(1).join(' ') || '',
      email: staff.email || '',
      phone: staff.phone || '',
      designation_id: staff.designation_id || (designations.find((d) => d.title === staff.designation)?.id || ''),
      department_id: staff.department_id || (departments.find((d) => d.name === staff.department)?.id || ''),
      role_id: staff.role_id || (roles.find((r) => r.code === staff.role_code)?.id || roles[0]?.id || ''),
      qualification: staff.qualification || '',
      joining_date: staff.joining_date || new Date().toISOString().split('T')[0],
      emergency_contact: staff.emergency_contact || '',
      is_active: staff.is_active ?? true,
    });
    setShowEditModal(true);
  };

  // Submit Edit Staff
  const handleUpdateStaff = async (e) => {
    e.preventDefault();
    if (!editingStaff) return;
    setSubmitting(true);
    setFormError('');

    try {
      const payload = {
        employee_id: editFormData.employee_id.trim(),
        first_name: editFormData.first_name.trim(),
        last_name: editFormData.last_name ? editFormData.last_name.trim() : null,
        email: editFormData.email.trim(),
        phone: editFormData.phone.trim(),
        designation_id: editFormData.designation_id,
        department_id: editFormData.department_id || null,
        role_id: editFormData.role_id || null,
        qualification: editFormData.qualification ? editFormData.qualification.trim() : null,
        joining_date: editFormData.joining_date,
        emergency_contact: editFormData.emergency_contact ? editFormData.emergency_contact.trim() : null,
        is_active: editFormData.is_active,
      };

      await api.put(`/staff/${editingStaff.id}`, payload);
      setShowEditModal(false);
      showToast(`Staff member "${payload.first_name}" updated successfully!`);
      loadData();
    } catch (err) {
      setFormError(err.message || 'Failed to update staff member');
    } finally {
      setSubmitting(false);
    }
  };

  // Open Reset Password Modal
  const handleOpenResetPassword = (staff) => {
    setResetStaff(staff);
    setNewPassword('Staff@123456');
    setShowPassword(true);
    setCopied(false);
    setFormError('');
    setShowResetModal(true);
  };

  // Submit Reset Password
  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (!resetStaff || !newPassword) return;
    setSubmitting(true);
    setFormError('');

    try {
      await api.put(`/staff/${resetStaff.id}/reset-password`, {
        password: newPassword.trim(),
      });
      setShowResetModal(false);
      showToast(`Password for ${resetStaff.full_name || resetStaff.email} reset successfully!`);
    } catch (err) {
      setFormError(err.message || 'Failed to reset password');
    } finally {
      setSubmitting(false);
    }
  };

  // Quick toggle status (Active / Inactive)
  const handleToggleStatus = async (staff) => {
    try {
      await api.put(`/staff/${staff.id}`, {
        is_active: !staff.is_active,
      });
      showToast(`Staff status updated to ${!staff.is_active ? 'Active' : 'Inactive'}`);
      loadData();
    } catch (err) {
      alert('Error updating status: ' + err.message);
    }
  };

  const handleCreateStaff = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setFormError('');

    try {
      const payload = {
        employee_id: formData.employee_id.trim(),
        first_name: formData.first_name.trim(),
        last_name: formData.last_name ? formData.last_name.trim() : undefined,
        email: formData.email.trim(),
        phone: formData.phone.trim(),
        password: formData.password.trim(),
        designation_id: formData.designation_id,
        department_id: formData.department_id || undefined,
        role_id: formData.role_id,
        qualification: formData.qualification ? formData.qualification.trim() : undefined,
        joining_date: formData.joining_date,
        emergency_contact: formData.emergency_contact ? formData.emergency_contact.trim() : undefined,
      };

      await api.post('/staff', payload);
      setShowAddModal(false);
      setFormData({
        employee_id: '',
        first_name: '',
        last_name: '',
        email: '',
        phone: '',
        password: '',
        designation_id: '',
        department_id: '',
        role_id: '',
        qualification: '',
        joining_date: new Date().toISOString().split('T')[0],
        emergency_contact: '',
      });
      showToast(`Staff member "${payload.first_name}" created successfully!`);
      loadData();
    } catch (err) {
      setFormError(err.message || 'Failed to create staff member');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreateDept = async (e) => {
    e.preventDefault();
    try {
      const res = await api.post('/staff/departments', {
        name: newDeptName.trim(),
        code: newDeptCode.trim().toUpperCase(),
      });
      if (res.data) {
        setDepartments((prev) => [...prev, res.data]);
        setFormData((prev) => ({ ...prev, department_id: res.data.id }));
        setEditFormData((prev) => ({ ...prev, department_id: res.data.id }));
      }
      setShowDeptModal(false);
      setNewDeptName('');
      setNewDeptCode('');
    } catch (err) {
      alert('Error creating department: ' + err.message);
    }
  };

  const handleCreateDesig = async (e) => {
    e.preventDefault();
    try {
      const res = await api.post('/staff/designations', {
        title: newDesigTitle.trim(),
        code: newDesigCode.trim().toUpperCase(),
      });
      if (res.data) {
        setDesignations((prev) => [...prev, res.data]);
        setFormData((prev) => ({ ...prev, designation_id: res.data.id }));
        setEditFormData((prev) => ({ ...prev, designation_id: res.data.id }));
      }
      setShowDesigModal(false);
      setNewDesigTitle('');
      setNewDesigCode('');
    } catch (err) {
      alert('Error creating designation: ' + err.message);
    }
  };

  const generateRandomPassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$%';
    let pass = 'Staff@';
    for (let i = 0; i < 6; i++) {
      pass += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setNewPassword(pass);
    setCopied(false);
  };

  const copyPasswordToClipboard = () => {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(newPassword);
      } else {
        const textArea = document.createElement('textarea');
        textArea.value = newPassword;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        textArea.style.top = '-999999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        document.execCommand('copy');
        textArea.remove();
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy password:', err);
    }
  };

  const filteredStaff = staffList.filter((s) => {
    const matchesSearch =
      !searchQuery ||
      s.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.employee_id?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.phone?.includes(searchQuery) ||
      s.email?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesDept = !selectedDept || s.department === selectedDept;
    const matchesDesig = !selectedDesig || s.designation === selectedDesig;

    return matchesSearch && matchesDept && matchesDesig;
  });

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-5 right-5 z-50 bg-emerald-600 text-white px-4 py-3 rounded-xl shadow-xl flex items-center gap-2 text-xs font-semibold animate-in fade-in slide-in-from-top-3">
          <CheckCircle2 size={16} />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <Users size={20} className="text-blue-600" />
            <span>Staff & Teacher Directory</span>
          </h1>
          <p className="text-xs text-slate-500">
            Manage faculty, administrative personnel, system roles, login credentials, and profile settings
          </p>
        </div>

        <button
          onClick={() => {
            setFormError('');
            setShowAddModal(true);
          }}
          className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold px-4 py-2.5 rounded-xl shadow transition-colors"
        >
          <UserPlus size={14} />
          <span>Add Staff Member</span>
        </button>
      </div>

      {/* KPI Stats Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-xs font-semibold text-slate-500">Total Staff</div>
            <div className="text-2xl font-black text-slate-900 mt-0.5">{staffList.length}</div>
          </div>
          <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
            <Users size={20} />
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-xs font-semibold text-slate-500">Teaching Faculty</div>
            <div className="text-2xl font-black text-emerald-600 mt-0.5">
              {staffList.filter(
                (s) =>
                  s.designation?.toLowerCase().includes('teacher') ||
                  s.designation?.toLowerCase().includes('faculty') ||
                  s.role_code === 'TEACHER'
              ).length || staffList.length}
            </div>
          </div>
          <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <Briefcase size={20} />
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-xs font-semibold text-slate-500">Departments</div>
            <div className="text-2xl font-black text-purple-600 mt-0.5">{departments.length}</div>
          </div>
          <div className="w-10 h-10 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
            <Building2 size={20} />
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-xs font-semibold text-slate-500">Active Logins</div>
            <div className="text-2xl font-black text-blue-600 mt-0.5">
              {staffList.filter((s) => s.is_active).length}
            </div>
          </div>
          <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
            <CheckCircle2 size={20} />
          </div>
        </div>
      </div>

      {/* Error alert if fetch failed */}
      {fetchError && (
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-2">
            <AlertCircle size={16} />
            <span>{fetchError}</span>
          </div>
          <button
            onClick={loadData}
            className="px-3 py-1 bg-rose-600 text-white rounded-lg font-semibold hover:bg-rose-500"
          >
            Retry Loading
          </button>
        </div>
      )}

      {/* Filter & Search Toolbar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative flex-1 w-full">
          <Search size={16} className="absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search by staff name, EMP ID, phone, or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <select
            value={selectedDept}
            onChange={(e) => setSelectedDept(e.target.value)}
            className="px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg font-medium text-slate-700 focus:outline-none"
          >
            <option value="">All Departments</option>
            {departments.map((d) => (
              <option key={d.id} value={d.name}>
                {d.name}
              </option>
            ))}
          </select>

          <select
            value={selectedDesig}
            onChange={(e) => setSelectedDesig(e.target.value)}
            className="px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg font-medium text-slate-700 focus:outline-none"
          >
            <option value="">All Designations</option>
            {designations.map((d) => (
              <option key={d.id} value={d.title}>
                {d.title}
              </option>
            ))}
          </select>

          <button
            onClick={loadData}
            title="Refresh List"
            className="p-2 text-slate-500 hover:text-slate-800 bg-slate-50 border border-slate-200 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* Staff Directory Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider">
                <th className="py-3 px-4">Employee ID</th>
                <th className="py-3 px-4">Staff Member</th>
                <th className="py-3 px-4">Designation & Role</th>
                <th className="py-3 px-4">Department</th>
                <th className="py-3 px-4">Contact</th>
                <th className="py-3 px-4">Joining Date</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {loading ? (
                <tr>
                  <td colSpan={8} className="text-center py-8 text-slate-400">
                    <div className="flex items-center justify-center gap-2">
                      <RefreshCw size={16} className="animate-spin text-blue-600" />
                      <span>Loading staff directory...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredStaff.length > 0 ? (
                filteredStaff.map((staff) => (
                  <tr key={staff.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-blue-700">
                      {staff.employee_id}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-slate-800 text-white font-bold flex items-center justify-center text-xs shadow">
                          {staff.full_name?.[0]?.toUpperCase() || 'S'}
                        </div>
                        <div>
                          <div className="font-bold text-slate-900">{staff.full_name}</div>
                          <div className="text-[11px] text-slate-400 flex items-center gap-1">
                            <Mail size={10} /> {staff.email || '-'}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="space-y-1">
                        <span className="inline-block bg-blue-50 text-blue-700 font-semibold px-2 py-0.5 rounded text-[11px] border border-blue-200">
                          {staff.designation || 'Staff'}
                        </span>
                        {staff.role_name && (
                          <div className="text-[10px] text-slate-500 font-mono flex items-center gap-1">
                            <Shield size={9} className="text-amber-500" />
                            <span>Role: {staff.role_name}</span>
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span className="bg-slate-100 text-slate-700 font-medium px-2 py-0.5 rounded text-[11px]">
                        {staff.department || 'General'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-600 font-mono">
                      <div className="flex items-center gap-1">
                        <Phone size={11} className="text-slate-400" />
                        <span>{staff.phone || '-'}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-slate-500">
                      <div className="flex items-center gap-1">
                        <Calendar size={11} className="text-slate-400" />
                        <span>{staff.joining_date}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <button
                        onClick={() => handleToggleStatus(staff)}
                        title="Click to toggle status"
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold transition-transform active:scale-95 ${
                          staff.is_active
                            ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200 border border-emerald-300'
                            : 'bg-rose-100 text-rose-800 hover:bg-rose-200 border border-rose-300'
                        }`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            staff.is_active ? 'bg-emerald-500' : 'bg-rose-500'
                          }`}
                        ></span>
                        <span>{staff.is_active ? 'Active' : 'Inactive'}</span>
                      </button>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => handleOpenEdit(staff)}
                          title="Edit Staff Member Details"
                          className="flex items-center gap-1 px-2.5 py-1.5 bg-blue-50 hover:bg-blue-600 text-blue-700 hover:text-white rounded-lg text-xs font-semibold border border-blue-200 transition-all shadow-sm"
                        >
                          <Edit3 size={12} />
                          <span>Edit</span>
                        </button>

                        <button
                          onClick={() => handleOpenResetPassword(staff)}
                          title="Reset / Set Staff Login Password"
                          className="flex items-center gap-1 px-2.5 py-1.5 bg-amber-50 hover:bg-amber-600 text-amber-800 hover:text-white rounded-lg text-xs font-semibold border border-amber-200 transition-all shadow-sm"
                        >
                          <Key size={12} />
                          <span>Password</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8} className="text-center py-12 text-slate-400">
                    No staff records found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Edit Staff Member */}
      {showEditModal && editingStaff && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-2xl w-full shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <Edit3 size={16} className="text-blue-600" />
                <span>Edit Staff Member: {editingStaff.full_name}</span>
              </h3>
              <button
                onClick={() => setShowEditModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X size={18} />
              </button>
            </div>

            {formError && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-lg flex items-center gap-2">
                <AlertCircle size={14} className="shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleUpdateStaff} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Employee ID *</label>
                  <input
                    type="text"
                    required
                    value={editFormData.employee_id}
                    onChange={(e) =>
                      setEditFormData({ ...editFormData, employee_id: e.target.value })
                    }
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">First Name *</label>
                  <input
                    type="text"
                    required
                    value={editFormData.first_name}
                    onChange={(e) =>
                      setEditFormData({ ...editFormData, first_name: e.target.value })
                    }
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Last Name</label>
                  <input
                    type="text"
                    value={editFormData.last_name}
                    onChange={(e) =>
                      setEditFormData({ ...editFormData, last_name: e.target.value })
                    }
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Official Email / Username *</label>
                  <input
                    type="email"
                    required
                    value={editFormData.email}
                    onChange={(e) => setEditFormData({ ...editFormData, email: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Mobile Phone *</label>
                  <input
                    type="text"
                    required
                    value={editFormData.phone}
                    onChange={(e) => setEditFormData({ ...editFormData, phone: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="block text-slate-700 font-semibold">Designation *</label>
                    <button
                      type="button"
                      onClick={() => setShowDesigModal(true)}
                      className="text-blue-600 hover:underline text-[10px] font-bold"
                    >
                      + New
                    </button>
                  </div>
                  <select
                    required
                    value={editFormData.designation_id}
                    onChange={(e) =>
                      setEditFormData({ ...editFormData, designation_id: e.target.value })
                    }
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-800"
                  >
                    <option value="">-- Select Designation --</option>
                    {designations.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.title} ({d.code})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="block text-slate-700 font-semibold">Department</label>
                    <button
                      type="button"
                      onClick={() => setShowDeptModal(true)}
                      className="text-blue-600 hover:underline text-[10px] font-bold"
                    >
                      + New
                    </button>
                  </div>
                  <select
                    value={editFormData.department_id}
                    onChange={(e) =>
                      setEditFormData({ ...editFormData, department_id: e.target.value })
                    }
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-800"
                  >
                    <option value="">-- Select Department --</option>
                    {departments.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name} ({d.code})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">System Role *</label>
                  <select
                    required
                    value={editFormData.role_id}
                    onChange={(e) => setEditFormData({ ...editFormData, role_id: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-blue-900 bg-blue-50"
                  >
                    <option value="">-- Assign Login Role --</option>
                    {roles.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.name} ({r.code})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Qualification</label>
                  <input
                    type="text"
                    value={editFormData.qualification}
                    onChange={(e) =>
                      setEditFormData({ ...editFormData, qualification: e.target.value })
                    }
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Joining Date *</label>
                  <input
                    type="date"
                    required
                    value={editFormData.joining_date}
                    onChange={(e) =>
                      setEditFormData({ ...editFormData, joining_date: e.target.value })
                    }
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Emergency Contact</label>
                  <input
                    type="text"
                    value={editFormData.emergency_contact}
                    onChange={(e) =>
                      setEditFormData({ ...editFormData, emergency_contact: e.target.value })
                    }
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 p-3 bg-slate-50 rounded-lg border border-slate-200">
                <input
                  type="checkbox"
                  id="edit_is_active"
                  checked={editFormData.is_active}
                  onChange={(e) => setEditFormData({ ...editFormData, is_active: e.target.checked })}
                  className="w-4 h-4 text-blue-600 rounded"
                />
                <label htmlFor="edit_is_active" className="text-xs font-bold text-slate-800 cursor-pointer">
                  Account Active & Enabled for Login
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-bold shadow disabled:opacity-50"
                >
                  {submitting ? 'Updating...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Reset Password */}
      {showResetModal && resetStaff && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <Key size={16} className="text-amber-600" />
                <span>Reset Staff Password</span>
              </h3>
              <button
                onClick={() => setShowResetModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
              <div className="text-xs font-bold text-slate-900">{resetStaff.full_name}</div>
              <div className="text-[11px] text-slate-500 font-mono">
                Email / Login: <span className="text-blue-700 font-bold">{resetStaff.email}</span>
              </div>
              <div className="text-[11px] text-slate-500 font-mono">
                Phone: <span className="text-slate-800">{resetStaff.phone}</span>
              </div>
            </div>

            {formError && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-lg flex items-center gap-2">
                <AlertCircle size={14} className="shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleResetPassword} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  New Password (Minimum 6 characters) *
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    minLength={6}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full pl-3 pr-20 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono font-bold text-slate-900 focus:outline-none focus:border-amber-500"
                    placeholder="Enter new password"
                  />
                  <div className="absolute right-2 top-2 flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="p-1 text-slate-400 hover:text-slate-700"
                      title={showPassword ? 'Hide Password' : 'Show Password'}
                    >
                      {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                    <button
                      type="button"
                      onClick={copyPasswordToClipboard}
                      className="p-1 text-slate-400 hover:text-slate-700"
                      title="Copy Password"
                    >
                      {copied ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between pt-1">
                <button
                  type="button"
                  onClick={generateRandomPassword}
                  className="text-blue-600 hover:underline text-xs font-semibold flex items-center gap-1"
                >
                  <RefreshCw size={12} />
                  <span>Generate Strong Password</span>
                </button>

                {copied && <span className="text-[11px] text-emerald-600 font-bold">Copied!</span>}
              </div>

              <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-[11px] text-amber-800">
                💡 <strong>Tip:</strong> The staff member can use this new password immediately to login with their email <code>{resetStaff.email}</code>, phone <code>{resetStaff.phone}</code>, or Employee ID <code>{resetStaff.employee_id}</code>.
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowResetModal(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-lg font-bold shadow disabled:opacity-50"
                >
                  {submitting ? 'Saving Password...' : 'Save New Password'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Add Staff Member */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-2xl w-full shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <UserPlus size={16} className="text-blue-600" />
                <span>Add New Staff Member</span>
              </h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X size={18} />
              </button>
            </div>

            {formError && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-lg flex items-center gap-2">
                <AlertCircle size={14} className="shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleCreateStaff} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Employee ID *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. EMP-001"
                    value={formData.employee_id}
                    onChange={(e) => setFormData({ ...formData, employee_id: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">First Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="First Name"
                    value={formData.first_name}
                    onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Last Name</label>
                  <input
                    type="text"
                    placeholder="Last Name"
                    value={formData.last_name}
                    onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Official Email *</label>
                  <input
                    type="email"
                    required
                    placeholder="staff@school.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Mobile Phone *</label>
                  <input
                    type="text"
                    required
                    placeholder="10-digit mobile"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Login Password *</label>
                  <input
                    type="password"
                    required
                    minLength={6}
                    placeholder="Min 6 characters"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="block text-slate-700 font-semibold">Designation *</label>
                    <button
                      type="button"
                      onClick={() => setShowDesigModal(true)}
                      className="text-blue-600 hover:underline text-[10px] font-bold"
                    >
                      + New
                    </button>
                  </div>
                  <select
                    required
                    value={formData.designation_id}
                    onChange={(e) => setFormData({ ...formData, designation_id: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-800"
                  >
                    <option value="">-- Select Designation --</option>
                    {designations.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.title} ({d.code})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="block text-slate-700 font-semibold">Department</label>
                    <button
                      type="button"
                      onClick={() => setShowDeptModal(true)}
                      className="text-blue-600 hover:underline text-[10px] font-bold"
                    >
                      + New
                    </button>
                  </div>
                  <select
                    value={formData.department_id}
                    onChange={(e) => setFormData({ ...formData, department_id: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-800"
                  >
                    <option value="">-- Select Department --</option>
                    {departments.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name} ({d.code})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">System Role *</label>
                  <select
                    required
                    value={formData.role_id}
                    onChange={(e) => setFormData({ ...formData, role_id: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-blue-900 bg-blue-50"
                  >
                    <option value="">-- Assign Login Role --</option>
                    {roles.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.name} ({r.code})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Qualification</label>
                  <input
                    type="text"
                    placeholder="e.g. M.Sc, B.Ed"
                    value={formData.qualification}
                    onChange={(e) => setFormData({ ...formData, qualification: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Joining Date *</label>
                  <input
                    type="date"
                    required
                    value={formData.joining_date}
                    onChange={(e) => setFormData({ ...formData, joining_date: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Emergency Contact</label>
                  <input
                    type="text"
                    placeholder="Relative Name & Phone"
                    value={formData.emergency_contact}
                    onChange={(e) => setFormData({ ...formData, emergency_contact: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-bold shadow disabled:opacity-50"
                >
                  {submitting ? 'Creating Staff Member...' : 'Save & Register Staff'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Quick Add Department */}
      {showDeptModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-5 max-w-sm w-full shadow-2xl space-y-3 text-xs animate-in fade-in zoom-in-95">
            <h4 className="font-bold text-slate-900 text-sm">Add New Department</h4>
            <form onSubmit={handleCreateDept} className="space-y-3">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">Department Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Science & STEM"
                  value={newDeptName}
                  onChange={(e) => setNewDeptName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-slate-700 font-semibold mb-1">Code *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. SCI"
                  value={newDeptCode}
                  onChange={(e) => setNewDeptCode(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg font-mono uppercase"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowDeptModal(false)}
                  className="px-3 py-1.5 text-slate-600 hover:bg-slate-100 rounded-lg font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-bold"
                >
                  Create
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Quick Add Designation */}
      {showDesigModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-5 max-w-sm w-full shadow-2xl space-y-3 text-xs animate-in fade-in zoom-in-95">
            <h4 className="font-bold text-slate-900 text-sm">Add New Designation</h4>
            <form onSubmit={handleCreateDesig} className="space-y-3">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">Designation Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Primary Teacher (PRT)"
                  value={newDesigTitle}
                  onChange={(e) => setNewDesigTitle(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-slate-700 font-semibold mb-1">Code *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. PRT"
                  value={newDesigCode}
                  onChange={(e) => setNewDesigCode(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg font-mono uppercase"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowDesigModal(false)}
                  className="px-3 py-1.5 text-slate-600 hover:bg-slate-100 rounded-lg font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-bold"
                >
                  Create
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
