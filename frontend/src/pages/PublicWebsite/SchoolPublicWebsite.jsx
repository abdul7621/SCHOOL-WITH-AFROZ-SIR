import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  School,
  Sparkles,
  BookOpen,
  Users,
  Award,
  Calendar,
  Send,
  Phone,
  Mail,
  MapPin,
  CheckCircle2,
  Globe,
  ArrowRight,
  ShieldCheck,
  Megaphone,
} from 'lucide-react';
import api from '../../api/client';
import { useTenant } from '../../context/TenantContext';

export const SchoolPublicWebsite = () => {
  const { settings } = useTenant();
  const [notices, setNotices] = useState([]);
  const [gallery, setGallery] = useState([]);

  // Admission Inquiry Form
  const [applicantName, setApplicantName] = useState('');
  const [parentName, setParentName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [targetClass, setTargetClass] = useState('Class 1');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    const fetchPublicData = async () => {
      try {
        const [nRes, gRes] = await Promise.all([
          api.get('/cms/notices/public'),
          api.get('/cms/gallery/public'),
        ]);
        if (nRes.data) setNotices(nRes.data);
        if (gRes.data) setGallery(gRes.data);
      } catch (e) {
        console.log(e);
      }
    };
    fetchPublicData();
  }, []);

  const handleInquirySubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.post('/cms/inquiries', {
        applicant_name: applicantName,
        parent_name: parentName,
        phone,
        email: email || undefined,
        target_class_name: targetClass,
        message,
      });
      setSubmitted(true);
      setApplicantName('');
      setParentName('');
      setPhone('');
      setMessage('');
    } catch (err) {
      alert('Error submitting inquiry: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-800 selection:bg-blue-600 selection:text-white">
      {/* Top Notification Bar */}
      <div className="bg-slate-900 text-slate-300 text-xs py-2 px-4 sm:px-8 flex justify-between items-center">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1"><Phone size={12} className="text-blue-400" /> {settings.contact_phone || '+91 98765 43210'}</span>
          <span className="hidden sm:flex items-center gap-1"><Mail size={12} className="text-blue-400" /> {settings.contact_email || `admissions@${settings.school_name?.toLowerCase().replace(/[^a-z0-9]/g, '') || 'school'}.com`}</span>
        </div>
        <div className="flex items-center gap-3">
          <Link to="/parent-portal" className="text-blue-400 hover:text-blue-300 font-semibold flex items-center gap-1">
            <span>Parent Portal</span> &rarr;
          </Link>
          <span className="text-slate-700">|</span>
          <Link to="/login" className="text-slate-300 hover:text-white font-semibold">
            Staff ERP Login
          </Link>
        </div>
      </div>

      {/* Main Navbar */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-8 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center font-black text-xl shadow-md">
              7A
            </div>
            <div>
              <div className="text-lg font-black text-slate-900 tracking-tight">{settings.school_name}</div>
              <div className="text-[11px] text-slate-500 font-semibold tracking-wider uppercase">Affiliated to CBSE / State Board</div>
            </div>
          </div>

          <nav className="hidden md:flex items-center gap-6 text-xs font-bold text-slate-600">
            <a href="#about" className="hover:text-blue-600 transition-colors">About Us</a>
            <a href="#academics" className="hover:text-blue-600 transition-colors">Academics</a>
            <a href="#facilities" className="hover:text-blue-600 transition-colors">Facilities</a>
            <a href="#notices" className="hover:text-blue-600 transition-colors">Circulars</a>
            <a href="#admissions" className="bg-blue-600 text-white px-4 py-2.5 rounded-xl hover:bg-blue-500 transition-colors shadow">
              Apply for Admission
            </a>
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <section className="bg-gradient-to-b from-blue-50/70 via-white to-slate-50 py-16 sm:py-24 border-b border-slate-200">
        <div className="max-w-5xl mx-auto px-4 text-center space-y-6">
          <div className="inline-flex items-center gap-2 bg-blue-100 text-blue-800 text-xs font-bold px-3.5 py-1.5 rounded-full">
            <Sparkles size={14} />
            <span>Admissions Open for Academic Session 2026-2027</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-black text-slate-900 tracking-tight leading-tight">
            Nurturing Excellence, Character & Innovation at <span className="text-blue-600">{settings.school_name}</span>
          </h1>

          <p className="text-slate-600 text-sm sm:text-base max-w-2xl mx-auto leading-relaxed">
            {settings.about_us || 'Providing holistic, values-driven modern education from Nursery to Senior Secondary with world-class facilities and individualized mentorship.'}
          </p>

          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <a
              href="#admissions"
              className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold px-6 py-3.5 rounded-xl shadow-lg shadow-blue-600/30 transition-all flex items-center gap-2"
            >
              <span>Submit Admission Inquiry</span>
              <ArrowRight size={14} />
            </a>
            <Link
              to="/parent-portal"
              className="bg-white hover:bg-slate-100 text-slate-800 text-xs font-bold px-6 py-3.5 rounded-xl border border-slate-300 transition-all"
            >
              Parent & Student Portal
            </Link>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section id="facilities" className="max-w-7xl mx-auto px-4 sm:px-8 py-16 space-y-8">
        <div className="text-center space-y-2">
          <h2 className="text-2xl font-black text-slate-900">Why Choose Our Campus</h2>
          <p className="text-xs text-slate-500">Comprehensive holistic environment for intellectual and character growth</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-3">
            <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center font-bold">
              <BookOpen size={20} />
            </div>
            <h3 className="font-bold text-slate-900 text-sm">CBSE / State Curriculum</h3>
            <p className="text-xs text-slate-500 leading-relaxed">Rigorous academic framework focused on conceptual mastery and critical thinking.</p>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center font-bold">
              <Users size={20} />
            </div>
            <h3 className="font-bold text-slate-900 text-sm">Dedicated Faculty</h3>
            <p className="text-xs text-slate-500 leading-relaxed">Experienced, trained educators with 1:25 student-teacher attention ratio.</p>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-3">
            <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-600 flex items-center justify-center font-bold">
              <Award size={20} />
            </div>
            <h3 className="font-bold text-slate-900 text-sm">Smart STEM Labs</h3>
            <p className="text-xs text-slate-500 leading-relaxed">Fully equipped modern computer labs, science discovery labs, and robotics club.</p>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-3">
            <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center font-bold">
              <ShieldCheck size={20} />
            </div>
            <h3 className="font-bold text-slate-900 text-sm">Safe & Secure Campus</h3>
            <p className="text-xs text-slate-500 leading-relaxed">24x7 CCTV surveillance, GPS-enabled transport fleet, and hygienic environment.</p>
          </div>
        </div>
      </section>

      {/* Notice Board & Admission Inquiry Section */}
      <section id="notices" className="bg-slate-100/70 py-16 border-y border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-8 grid grid-cols-1 lg:grid-cols-2 gap-12">
          {/* Public Notices */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Megaphone size={20} className="text-blue-600" />
              <h2 className="text-xl font-black text-slate-900">Latest Circulars & Announcements</h2>
            </div>
            <p className="text-xs text-slate-500">Official notifications, holiday circulars, and exam date-sheets</p>

            <div className="space-y-3">
              {notices.length > 0 ? (
                notices.slice(0, 4).map((n) => (
                  <div key={n.id} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-blue-600 uppercase bg-blue-50 px-2 py-0.5 rounded">{n.category}</span>
                      <span className="text-[11px] text-slate-400 flex items-center gap-1"><Calendar size={11} /> {n.published_date}</span>
                    </div>
                    <h4 className="font-bold text-slate-900 text-xs">{n.title}</h4>
                    <p className="text-xs text-slate-600 leading-relaxed">{n.content}</p>
                  </div>
                ))
              ) : (
                <div className="bg-white p-6 rounded-xl border border-slate-200 text-slate-400 text-xs text-center">
                  No active circulars at the moment.
                </div>
              )}
            </div>
          </div>

          {/* Admission Inquiry Lead Form */}
          <div id="admissions" className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-sm space-y-4">
            <div>
              <h3 className="text-lg font-black text-slate-900">Online Admission Enquiry (2026-2027)</h3>
              <p className="text-xs text-slate-500">Fill this form and our admissions team will contact you within 24 hours.</p>
            </div>

            {submitted ? (
              <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-6 rounded-2xl text-center space-y-2">
                <CheckCircle2 size={32} className="mx-auto text-emerald-600" />
                <h4 className="font-bold text-sm">Inquiry Submitted Successfully!</h4>
                <p className="text-xs text-emerald-700">Thank you for your interest in {settings.school_name}. Our counselor will reach out shortly.</p>
              </div>
            ) : (
              <form onSubmit={handleInquirySubmit} className="space-y-3 text-xs">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Student / Applicant Full Name</label>
                  <input
                    type="text"
                    required
                    value={applicantName}
                    onChange={(e) => setApplicantName(e.target.value)}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                    placeholder="e.g. Ayaan Khan"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">Parent / Guardian Name</label>
                    <input
                      type="text"
                      required
                      value={parentName}
                      onChange={(e) => setParentName(e.target.value)}
                      className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                      placeholder="e.g. Farhan Khan"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">Primary Phone Number</label>
                    <input
                      type="text"
                      required
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono"
                      placeholder="9876543210"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">Target Admission Class</label>
                    <select
                      value={targetClass}
                      onChange={(e) => setTargetClass(e.target.value)}
                      className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl font-semibold"
                    >
                      <option value="Nursery">Nursery</option>
                      <option value="LKG">LKG</option>
                      <option value="UKG">UKG</option>
                      <option value="Class 1">Class 1</option>
                      <option value="Class 2">Class 2</option>
                      <option value="Class 3">Class 3</option>
                      <option value="Class 4">Class 4</option>
                      <option value="Class 5">Class 5</option>
                      <option value="Class 6">Class 6</option>
                      <option value="Class 7">Class 7</option>
                      <option value="Class 8">Class 8</option>
                      <option value="Class 9">Class 9</option>
                      <option value="Class 10">Class 10</option>
                      <option value="Class 11">Class 11</option>
                      <option value="Class 12">Class 12</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">Email Address (Optional)</label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                      placeholder="parent@gmail.com"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Any Specific Inquiry or Previous School</label>
                  <textarea
                    rows={2}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                    placeholder="Previous school, marks or query..."
                  />
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl shadow-lg shadow-blue-600/30 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <Send size={14} />
                  <span>{submitting ? 'Submitting Inquiry...' : 'Submit Admission Inquiry'}</span>
                </button>
              </form>
            )}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-900 text-slate-400 py-12 text-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-8 grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="space-y-2">
            <div className="text-white font-bold text-base">{settings.school_name}</div>
            <p className="text-slate-500 leading-relaxed">Committed to academic rigor, discipline, moral values, and student growth.</p>
          </div>

          <div className="space-y-2">
            <div className="text-white font-bold">Contact Campus</div>
            <div className="flex items-center gap-2"><MapPin size={13} className="text-blue-500" /> Main Campus, Civil Lines</div>
            <div className="flex items-center gap-2"><Phone size={13} className="text-blue-500" /> +91 98765 43210</div>
            <div className="flex items-center gap-2"><Mail size={13} className="text-blue-500" /> info@7aedu.com</div>
          </div>

          <div className="space-y-2">
            <div className="text-white font-bold">Portals</div>
            <div><Link to="/parent-portal" className="hover:text-white">Parent Mobile Portal</Link></div>
            <div><Link to="/login" className="hover:text-white">Teacher & Staff ERP</Link></div>
            <div><Link to="/login" className="hover:text-white">Super Admin Console</Link></div>
          </div>
        </div>
        <div className="max-w-7xl mx-auto px-4 sm:px-8 pt-8 mt-8 border-t border-slate-800 text-center text-slate-500">
          Powered by 7A School ERP Engine &bull; Multi-Tenant SaaS (7aedu.com)
        </div>
      </footer>
    </div>
  );
};
