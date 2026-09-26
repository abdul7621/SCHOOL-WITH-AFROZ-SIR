import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { UserPlus, ArrowLeft, CheckCircle2, AlertCircle, Save, Camera, Upload, Trash2, User, Sparkles } from 'lucide-react';
import api from '../../api/client';

export const AdmissionForm = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const inquiryData = location.state?.inquiry;
  const fileInputRef = useRef(null);
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
  const [photoUrl, setPhotoUrl] = useState('');
  const [photoPreview, setPhotoPreview] = useState('');

  // Parent State
  const [fatherName, setFatherName] = useState('');
  const [motherName, setMotherName] = useState('');
  const [primaryPhone, setPrimaryPhone] = useState('');
  const [whatsappPhone, setWhatsappPhone] = useState('');
  const [address, setAddress] = useState('');

  const handlePhotoUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Please select a valid image file (JPG, PNG, WebP)');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      alert('Image size should be less than 5MB');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      // Auto-resize via HTML5 Canvas to standard passport size (~250x300) for compact storage & instant rendering
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 200;
        const MAX_HEIGHT = 240;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.75);
        setPhotoPreview(compressedDataUrl);
        setPhotoUrl(compressedDataUrl);
      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
  };

  const handleRemovePhoto = (e) => {
    e.stopPropagation();
    setPhotoPreview('');
    setPhotoUrl('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const cleanPhone = (val) => String(val || '').replace(/\D/g, '').slice(-10);

  useEffect(() => {
    const fetchFormData = async () => {
      setLoading(true);
      try {
        if (inquiryData) {
          const parts = (inquiryData.applicant_name || inquiryData.name || '').trim().split(' ');
          if (parts.length > 0 && parts[0]) setFirstName(parts[0]);
          if (parts.length > 1) setLastName(parts.slice(1).join(' '));
          if (inquiryData.parent_name || inquiryData.father_name) {
            setFatherName(inquiryData.parent_name || inquiryData.father_name);
          }
          if (inquiryData.phone) {
            const cleaned = cleanPhone(inquiryData.phone);
            setPrimaryPhone(cleaned);
            setWhatsappPhone(cleaned);
          }
        }

        const [clsRes, yrRes, genRes, bgRes] = await Promise.all([
          api.get('/academics/classes'),
          api.get('/academics/years'),
          api.get('/lookups/categories/GENDER/values').catch(() => ({ data: [] })),
          api.get('/lookups/categories/BLOOD_GROUP/values').catch(() => ({ data: [] })),
        ]);

        if (clsRes.data && clsRes.data.length > 0) {
          setClasses(clsRes.data);
          let targetCId = clsRes.data[0].id;
          let targetSId = clsRes.data[0].sections?.[0]?.id || '';

          if (inquiryData && inquiryData.target_class) {
            const qTarget = inquiryData.target_class.toLowerCase().trim();
            const matched = clsRes.data.find(
              (c) => c.name.toLowerCase().includes(qTarget) || qTarget.includes(c.name.toLowerCase())
            );
            if (matched) {
              targetCId = matched.id;
              targetSId = matched.sections?.[0]?.id || '';
            }
          }

          setClassId(targetCId);
          setSectionId(targetSId);
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
        profile_photo_url: photoUrl || undefined,
        academic_year_id: academicYearId,
        class_id: classId,
        section_id: sectionId,
        roll_no: rollNo ? parseInt(rollNo) : undefined,
        parent: {
          father_name: fatherName,
          mother_name: motherName || undefined,
          primary_phone: cleanPhone(primaryPhone),
          whatsapp_phone: cleanPhone(whatsappPhone || primaryPhone),
          address: address || undefined,
        },
      };

      const res = await api.post('/students/admit', payload);
      if (inquiryData?.id) {
        try {
          await api.patch(`/cms/inquiries/${inquiryData.id}/status`, { status: 'ENROLLED' });
        } catch {
          // Non-blocking status sync
        }
      }
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

      {inquiryData && (
        <div className="bg-indigo-50 border border-indigo-200 text-indigo-900 px-4 py-3 rounded-2xl flex items-center justify-between text-xs shadow-sm">
          <div className="flex items-center gap-2.5">
            <span className="p-1.5 bg-indigo-100 rounded-lg text-indigo-600 font-bold">🚀</span>
            <div>
              <div className="font-bold">Fast-Track Website Inquiry Conversion</div>
              <div className="text-slate-600 text-[11px]">
                Pre-filled student and parent particulars from website inquiry for <strong>{inquiryData.applicant_name || inquiryData.name || 'Applicant'}</strong>.
              </div>
            </div>
          </div>
          <span className="bg-indigo-600 text-white font-bold px-2.5 py-1 rounded-lg text-[10px] tracking-wide uppercase">
            Inquiry Linked
          </span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Section 1: Student Details & Passport Photo */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <h3 className="font-bold text-slate-900 text-sm">
              1. Student Information
            </h3>
            <span className="text-[11px] text-slate-400 font-medium">Passport photo will appear on Student ID Card & 360° Profile</span>
          </div>

          <div className="flex flex-col sm:flex-row gap-6 items-start">
            {/* Passport Photo Upload Box */}
            <div className="flex flex-col items-center gap-2 shrink-0">
              <input
                type="file"
                ref={fileInputRef}
                onChange={handlePhotoUpload}
                accept="image/*"
                className="hidden"
              />
              <div
                onClick={() => fileInputRef.current?.click()}
                className="w-32 h-40 border-2 border-dashed border-slate-300 hover:border-blue-500 rounded-2xl bg-slate-50 hover:bg-blue-50/40 flex flex-col items-center justify-center relative cursor-pointer group transition-all overflow-hidden shadow-inner"
              >
                {photoPreview ? (
                  <>
                    <img src={photoPreview} alt="Student" className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-slate-900/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-1 text-white">
                      <Camera size={20} />
                      <span className="text-[10px] font-bold">Change Photo</span>
                    </div>
                  </>
                ) : (
                  <div className="text-center p-3 flex flex-col items-center gap-1.5 text-slate-400 group-hover:text-blue-600 transition-colors">
                    <div className="w-10 h-10 rounded-full bg-slate-200/70 group-hover:bg-blue-100 flex items-center justify-center text-slate-500 group-hover:text-blue-600 transition-colors">
                      <Camera size={20} />
                    </div>
                    <span className="text-[11px] font-bold">Student Photo</span>
                    <span className="text-[9px] text-slate-400">Click to Upload</span>
                  </div>
                )}
              </div>

              {photoPreview ? (
                <button
                  type="button"
                  onClick={handleRemovePhoto}
                  className="flex items-center gap-1 text-[11px] text-rose-600 hover:text-rose-700 font-semibold transition-colors"
                >
                  <Trash2 size={12} />
                  <span>Remove Photo</span>
                </button>
              ) : (
                <span className="text-[10px] text-slate-400 font-medium">For ID Card (Max 5MB)</span>
              )}
            </div>

            {/* Student Fields Grid */}
            <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs font-semibold text-slate-700 w-full">
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
              <label className="block mb-1 flex items-center justify-between">
                <span>Roll Number</span>
                <span className="text-[10px] text-slate-400 font-normal">Auto if blank</span>
              </label>
              <input
                type="number"
                value={rollNo}
                onChange={(e) => setRollNo(e.target.value)}
                placeholder="Auto-assigned"
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-mono"
              />
            </div>
          </div>

          {(() => {
            const activeSec = currentSections.find((s) => s.id === sectionId);
            if (!activeSec) return null;
            const cap = activeSec.capacity || 40;
            const enrolled = activeSec.enrolled_count || 0;
            const vacant = activeSec.vacant_seats !== undefined ? activeSec.vacant_seats : Math.max(0, cap - enrolled);
            const isFull = vacant <= 0;
            const isNearlyFull = vacant <= 5 && !isFull;

            return (
              <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
                <span className="text-xs font-semibold text-slate-500">Section Capacity Radar:</span>
                <span className={`px-2.5 py-1 rounded-lg text-xs font-bold border flex items-center gap-1.5 ${
                  isFull
                    ? 'bg-rose-50 text-rose-700 border-rose-200'
                    : isNearlyFull
                    ? 'bg-amber-50 text-amber-700 border-amber-200'
                    : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                }`}>
                  <span>{isFull ? '🔴 FULL' : isNearlyFull ? '🟡 FILLING FAST' : '🟢 AVAILABLE'}</span>
                  <span>•</span>
                  <span>{enrolled} / {cap} Seats Occupied ({vacant} Remaining)</span>
                </span>
              </div>
            );
          })()}
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
