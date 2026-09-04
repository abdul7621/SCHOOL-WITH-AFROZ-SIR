import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { UserPlus, ArrowLeft, CheckCircle2, AlertCircle, Save } from 'lucide-react';
import api from '../../api/client';

export const AdmissionForm = () => {
  const navigate = useNavigate();
  const [classes, setClasses] = useState([]);
  const [academicYears, setAcademicYears] = useState([]);
  const [genders, setGenders] = useState([]);
  const [bloodGroups, setBloodGroups] = useState([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form State
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [dob, setDob] = useState('2015-05-15');
  const [genderId, setGenderId] = useState('');
  const [bloodGroupId, setBloodGroupId] = useState('');
  const [academicYearId, setAcademicYearId] = useState('');
  const [classId, setClassId] = useState('');
  const [sectionId, setSectionId] = useState('');
  const [rollNo, setRollNo] = useState('');

  // Parent State
  const [fatherName, setFatherName] = useState('');
  const [motherName, setMotherName] = useState('');
  const [primaryPhone, setPrimaryPhone] = useState('');
  const [whatsappPhone, setWhatsappPhone] = useState('');
  const [address, setAddress] = useState('');

  useEffect(() => {
    const fetchFormData = async () => {
      setLoading(true);
      try {
        const [clsRes, yrRes, genRes, bgRes] = await Promise.all([
          api.get('/academics/classes'),
          api.get('/academics/years'),
          api.get('/lookups/categories/GENDER/values').catch(() => ({ data: [] })),
          api.get('/lookups/categories/BLOOD_GROUP/values').catch(() => ({ data: [] })),
        ]);

        if (clsRes.data && clsRes.data.length > 0) {
          setClasses(clsRes.data);
          setClassId(clsRes.data[0].id);
          if (clsRes.data[0].sections?.length > 0) {
            setSectionId(clsRes.data[0].sections[0].id);
          }
        }

        if (yrRes.data && yrRes.data.length > 0) {
          setAcademicYears(yrRes.data);
          const curr = yrRes.data.find((y) => y.is_current) || yrRes.data[0];
          setAcademicYearId(curr.id);
        }

        if (genRes.data) {
          setGenders(genRes.data);
          if (genRes.data.length > 0) setGenderId(genRes.data[0].id);
        }

        if (bgRes.data) {
          setBloodGroups(bgRes.data);
          if (bgRes.data.length > 0) setBloodGroupId(bgRes.data[0].id);
        }
      } catch (e) {
        console.log('Error fetching admission form lookups:', e);
      } finally {
        setLoading(false);
      }
    };
    fetchFormData();
  }, []);

  const handleClassChange = (newClassId) => {
    setClassId(newClassId);
    const selected = classes.find((c) => c.id === newClassId);
    if (selected && selected.sections?.length > 0) {
      setSectionId(selected.sections[0].id);
    } else {
      setSectionId('');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!firstName || !primaryPhone || !classId || !sectionId || !academicYearId) {
      alert('Please fill all mandatory fields (First Name, Phone, Class, Section, Academic Year)');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        first_name: firstName,
        last_name: lastName || undefined,
        dob: dob,
        gender_id: genderId || undefined,
        blood_group_id: bloodGroupId || undefined,
        academic_year_id: academicYearId,
        class_id: classId,
        section_id: sectionId,
        roll_no: rollNo ? parseInt(rollNo) : undefined,
        parent: {
          father_name: fatherName,
          mother_name: motherName || undefined,
          primary_phone: primaryPhone,
          whatsapp_phone: whatsappPhone || primaryPhone,
          address: address || undefined,
        },
      };

      const res = await api.post('/students/admit', payload);
      alert(`Student admitted successfully! Admission No: ${res.data.admission_no}`);
      navigate('/students');
    } catch (err) {
      alert('Admission failed: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const currentSections = classes.find((c) => c.id === classId)?.sections || [];

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            to="/students"
            className="p-2 bg-white hover:bg-slate-100 rounded-xl border border-slate-200 text-slate-600 transition-colors"
          >
            <ArrowLeft size={18} />
          </Link>
          <div>
            <h1 className="text-xl font-black text-slate-900 flex items-center gap-2">
              <UserPlus size={22} className="text-blue-600" />
              <span>New Student Admission Form</span>
            </h1>
            <p className="text-xs text-slate-500">Atomic registration, automated admission number & parent profile</p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Section 1: Student Details */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <h3 className="font-bold text-slate-900 text-sm border-b border-slate-100 pb-2">
            1. Student Information
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs font-semibold text-slate-700">
            <div>
              <label className="block mb-1">First Name <span className="text-rose-500">*</span></label>
              <input
                type="text"
                required
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="e.g. Ayaan"
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900"
              />
            </div>
            <div>
              <label className="block mb-1">Last Name / Surname</label>
              <input
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="e.g. Khan"
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900"
              />
            </div>
            <div>
              <label className="block mb-1">Date of Birth <span className="text-rose-500">*</span></label>
              <input
                type="date"
                required
                value={dob}
                onChange={(e) => setDob(e.target.value)}
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono text-slate-900"
              />
            </div>

            <div>
              <label className="block mb-1">Gender</label>
              <select
                value={genderId}
                onChange={(e) => setGenderId(e.target.value)}
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900"
              >
                {genders.map((g) => (
                  <option key={g.id} value={g.id}>{g.label || g.code}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block mb-1">Blood Group</label>
              <select
                value={bloodGroupId}
                onChange={(e) => setBloodGroupId(e.target.value)}
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900"
              >
                {bloodGroups.map((b) => (
                  <option key={b.id} value={b.id}>{b.label || b.code}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Section 2: Parent Information */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <h3 className="font-bold text-slate-900 text-sm border-b border-slate-100 pb-2">
            2. Parent / Guardian Details
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-semibold text-slate-700">
            <div>
              <label className="block mb-1">Father's Full Name <span className="text-rose-500">*</span></label>
              <input
                type="text"
                required
                value={fatherName}
                onChange={(e) => setFatherName(e.target.value)}
                placeholder="e.g. Farhan Khan"
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900"
              />
            </div>
            <div>
              <label className="block mb-1">Mother's Full Name</label>
              <input
                type="text"
                value={motherName}
                onChange={(e) => setMotherName(e.target.value)}
                placeholder="e.g. Shabana Khan"
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900"
              />
            </div>
            <div>
              <label className="block mb-1">Primary Phone (SMS Alerts) <span className="text-rose-500">*</span></label>
              <input
                type="tel"
                required
                value={primaryPhone}
                onChange={(e) => {
                  setPrimaryPhone(e.target.value);
                  if (!whatsappPhone) setWhatsappPhone(e.target.value);
                }}
                placeholder="10-digit mobile number"
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono text-slate-900"
              />
            </div>
            <div>
              <label className="block mb-1">WhatsApp Phone (Fee Receipts)</label>
              <input
                type="tel"
                value={whatsappPhone}
                onChange={(e) => setWhatsappPhone(e.target.value)}
                placeholder="10-digit mobile number"
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono text-slate-900"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block mb-1">Residential Address</label>
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="House No, Street, Landmark, City"
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900"
              />
            </div>
          </div>
        </div>

        {/* Section 3: Academic Enrollment */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <h3 className="font-bold text-slate-900 text-sm border-b border-slate-100 pb-2">
            3. Class & Section Allocation
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 text-xs font-semibold text-slate-700">
            <div>
              <label className="block mb-1">Academic Session <span className="text-rose-500">*</span></label>
              <select
                value={academicYearId}
                onChange={(e) => setAcademicYearId(e.target.value)}
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-bold"
              >
                {academicYears.map((y) => (
                  <option key={y.id} value={y.id}>{y.name} {y.is_current ? '(Current)' : ''}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block mb-1">Class Level <span className="text-rose-500">*</span></label>
              <select
                value={classId}
                onChange={(e) => handleClassChange(e.target.value)}
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-bold"
              >
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block mb-1">Section <span className="text-rose-500">*</span></label>
              <select
                value={sectionId}
                onChange={(e) => setSectionId(e.target.value)}
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-bold"
              >
                {currentSections.map((s) => (
                  <option key={s.id} value={s.id}>Section {s.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block mb-1">Roll Number</label>
              <input
                type="number"
                value={rollNo}
                onChange={(e) => setRollNo(e.target.value)}
                placeholder="e.g. 15"
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-mono"
              />
            </div>
          </div>
        </div>

        {/* Submit Bar */}
        <div className="flex justify-end gap-3">
          <Link
            to="/students"
            className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 rounded-xl text-xs font-bold text-slate-700 transition-colors"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={submitting}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold px-6 py-2.5 rounded-xl shadow-lg shadow-blue-600/30 transition-all disabled:opacity-50"
          >
            <Save size={15} />
            <span>{submitting ? 'Admitting Student...' : 'Complete Admission'}</span>
          </button>
        </div>
      </form>
    </div>
  );
};
