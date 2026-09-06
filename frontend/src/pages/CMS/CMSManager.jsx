import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Globe,
  Plus,
  Pin,
  Calendar,
  CheckCircle2,
  Megaphone,
  Building2,
  Save,
  ExternalLink,
  Phone,
  Mail,
  MapPin,
  Sparkles,
} from 'lucide-react';
import api from '../../api/client';

export const CMSManager = () => {
  const [notices, setNotices] = useState([]);
  const [inquiries, setInquiries] = useState([]);
  const [gallery, setGallery] = useState([]);
  const [tab, setTab] = useState('notices'); // notices, inquiries, gallery, content
  const [showModal, setShowModal] = useState(false);
  const [showGalleryModal, setShowGalleryModal] = useState(false);

  // New Notice form
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [category, setCategory] = useState('GENERAL');
  const [isPinned, setIsPinned] = useState(false);
  const [saving, setSaving] = useState(false);

  // New Gallery form
  const [mediaTitle, setMediaTitle] = useState('');
  const [mediaAlbum, setMediaAlbum] = useState('Annual Function');
  const [mediaUrl, setMediaUrl] = useState('');
  const [mediaType, setMediaType] = useState('IMAGE');

  // Website Content Settings State
  const [schoolSettings, setSchoolSettings] = useState({
    school_name: '7A Model English School',
    about_us: 'Providing holistic, values-driven modern education with state-of-the-art infrastructure and individualized mentorship.',
    principal_message: 'Welcome to our institution where we ignite curiosity and instill discipline in every student.',
    vision_mission: 'To foster intellectual curiosity, moral integrity, and lifelong learning.',
    contact_phone: '+91 98765 43210',
    contact_email: 'info@school.com',
    contact_address: '123 Education Boulevard, Knowledge City',
    school_timezone: 'Asia/Kolkata',
  });
  const [savingSettings, setSavingSettings] = useState(false);
  const [settingsSavedSuccess, setSettingsSavedSuccess] = useState(false);

  const fetchNotices = async () => {
    try {
      const res = await api.get('/cms/notices/public');
      if (res.data) setNotices(res.data);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchInquiries = async () => {
    try {
      const res = await api.get('/cms/inquiries');
      if (res.data) setInquiries(res.data);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchGallery = async () => {
    try {
      const res = await api.get('/cms/gallery/public');
      if (res.data) setGallery(res.data);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchSettings = async () => {
    try {
      const res = await api.get('/settings');
      if (res.data && Array.isArray(res.data)) {
        const map = {};
        res.data.forEach((s) => {
          if (s.key) map[s.key] = s.value;
        });
        setSchoolSettings((prev) => ({ ...prev, ...map }));
      }
    } catch (e) {
      console.error('Error fetching school settings:', e);
    }
  };

  useEffect(() => {
    fetchNotices();
    fetchInquiries();
    fetchGallery();
    fetchSettings();
  }, []);

  const handleStatusChange = async (inquiryId, newStatus) => {
    try {
      await api.patch(`/cms/inquiries/${inquiryId}/status`, { status: newStatus });
      setInquiries((prev) =>
        prev.map((i) => (i.id === inquiryId ? { ...i, status: newStatus } : i))
      );
    } catch (e) {
      alert('Failed to update inquiry status: ' + e.message);
    }
  };

  const handleCreateNotice = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        title,
        content,
        category,
        is_pinned: isPinned,
        is_public: true,
      };
      await api.post('/cms/notices', payload);
      setShowModal(false);
      setTitle('');
      setContent('');
      fetchNotices();
    } catch (err) {
      alert('Error publishing notice: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleCreateGallery = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.post('/cms/gallery', {
        title: mediaTitle,
        album_name: mediaAlbum,
        media_url: mediaUrl,
        media_type: mediaType,
        is_published: true,
      });
      setShowGalleryModal(false);
      setMediaTitle('');
      setMediaUrl('');
      fetchGallery();
    } catch (err) {
      alert('Error adding gallery item: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleSaveSettings = async (e) => {
    e.preventDefault();
    setSavingSettings(true);
    setSettingsSavedSuccess(false);

    try {
      const keys = Object.keys(schoolSettings);
      for (const k of keys) {
        await api.post('/settings', {
          setting_key: k,
          setting_value: schoolSettings[k],
          is_public: true,
        });
      }
      setSettingsSavedSuccess(true);
      setTimeout(() => setSettingsSavedSuccess(false), 3000);
    } catch (err) {
      alert('Error saving school settings: ' + err.message);
    } finally {
      setSavingSettings(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <Globe size={20} className="text-blue-600" />
            <span>Public Website CMS & Communication</span>
          </h1>
          <p className="text-xs text-slate-500">
            Manage circular notices, admission inquiries, media gallery, and public website content
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Link
            to="/website"
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl shadow-sm transition-colors"
          >
            <ExternalLink size={14} />
            <span>Preview Website</span>
          </Link>

          <div className="flex bg-slate-200 p-1 rounded-xl text-xs font-semibold">
            <button
              onClick={() => setTab('notices')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                tab === 'notices' ? 'bg-white text-blue-700 shadow-sm font-bold' : 'text-slate-600'
              }`}
            >
              Notices ({notices.length})
            </button>
            <button
              onClick={() => setTab('inquiries')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                tab === 'inquiries' ? 'bg-white text-blue-700 shadow-sm font-bold' : 'text-slate-600'
              }`}
            >
              Inquiries ({inquiries.length})
            </button>
            <button
              onClick={() => setTab('gallery')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                tab === 'gallery' ? 'bg-white text-blue-700 shadow-sm font-bold' : 'text-slate-600'
              }`}
            >
              Gallery ({gallery.length})
            </button>
            <button
              onClick={() => setTab('content')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                tab === 'content' ? 'bg-white text-blue-700 shadow-sm font-bold' : 'text-slate-600'
              }`}
            >
              About & Content
            </button>
          </div>

          {tab === 'notices' && (
            <button
              onClick={() => setShowModal(true)}
              className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold px-4 py-2.5 rounded-xl shadow transition-colors"
            >
              <Plus size={14} />
              <span>Publish Notice</span>
            </button>
          )}

          {tab === 'gallery' && (
            <button
              onClick={() => setShowGalleryModal(true)}
              className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold px-4 py-2.5 rounded-xl shadow transition-colors"
            >
              <Plus size={14} />
              <span>Add Media Photo</span>
            </button>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: NOTICES */}
      {/* ========================================================================= */}
      {tab === 'notices' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {notices.length > 0 ? (
            notices.map((n) => (
              <div key={n.id} className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-2 relative">
                {n.is_pinned && (
                  <span className="absolute top-4 right-4 bg-amber-100 text-amber-800 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                    <Pin size={10} /> PINNED
                  </span>
                )}
                <div className="text-[11px] font-semibold text-blue-600 uppercase tracking-wider">{n.category}</div>
                <h3 className="font-bold text-slate-900 text-sm">{n.title}</h3>
                <p className="text-xs text-slate-600 leading-relaxed">{n.content}</p>
                <div className="text-[11px] text-slate-400 pt-2 border-t border-slate-100 flex items-center gap-1">
                  <Calendar size={12} />
                  <span>Published: {n.published_date}</span>
                </div>
              </div>
            ))
          ) : (
            <div className="col-span-2 text-center py-12 bg-white rounded-xl border border-slate-200 text-slate-400 text-xs">
              No notices published yet.
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: INQUIRIES */}
      {/* ========================================================================= */}
      {tab === 'inquiries' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider">
                <th className="py-3 px-4">Applicant Name</th>
                <th className="py-3 px-4">Parent Name</th>
                <th className="py-3 px-4">Phone</th>
                <th className="py-3 px-4">Target Class</th>
                <th className="py-3 px-4">Message</th>
                <th className="py-3 px-4">Status Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {inquiries.length > 0 ? (
                inquiries.map((i) => (
                  <tr key={i.id} className="hover:bg-slate-50/80">
                    <td className="py-3 px-4 font-bold text-slate-900">{i.applicant_name}</td>
                    <td className="py-3 px-4 text-slate-700">{i.parent_name}</td>
                    <td className="py-3 px-4 text-blue-700 font-mono">{i.phone}</td>
                    <td className="py-3 px-4">{i.target_class}</td>
                    <td className="py-3 px-4 text-slate-500 max-w-xs truncate">{i.message || '-'}</td>
                    <td className="py-3 px-4">
                      <select
                        value={i.status}
                        onChange={(e) => handleStatusChange(i.id, e.target.value)}
                        className={`px-2 py-1 rounded text-[11px] font-bold border ${
                          i.status === 'ENROLLED'
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                            : i.status === 'CONTACTED'
                            ? 'bg-amber-50 text-amber-800 border-amber-200'
                            : i.status === 'CLOSED'
                            ? 'bg-slate-100 text-slate-700 border-slate-200'
                            : 'bg-blue-50 text-blue-800 border-blue-200'
                        }`}
                      >
                        <option value="NEW">NEW</option>
                        <option value="CONTACTED">CONTACTED</option>
                        <option value="ENROLLED">ENROLLED</option>
                        <option value="CLOSED">CLOSED</option>
                      </select>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="text-center py-8 text-slate-400">
                    No admission inquiries received yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: GALLERY */}
      {/* ========================================================================= */}
      {tab === 'gallery' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {gallery.length > 0 ? (
            gallery.map((g) => (
              <div key={g.id} className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                <div className="h-44 bg-slate-100 overflow-hidden">
                  <img
                    src={g.media_url}
                    alt={g.title}
                    className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                    onError={(e) => {
                      e.target.src = 'https://images.unsplash.com/photo-1577896851231-70ef18881754?w=600';
                    }}
                  />
                </div>
                <div className="p-3">
                  <span className="text-[10px] font-bold text-blue-600 uppercase tracking-wider">{g.album_name}</span>
                  <h4 className="font-bold text-slate-900 text-xs mt-0.5">{g.title}</h4>
                </div>
              </div>
            ))
          ) : (
            <div className="col-span-3 text-center py-12 bg-white rounded-xl border border-slate-200 text-slate-400 text-xs">
              No gallery media uploaded yet.
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: SCHOOL INFO & ABOUT US CONTENT */}
      {/* ========================================================================= */}
      {tab === 'content' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Building2 size={16} className="text-blue-600" />
                <span>School Brand Profile & Website Content</span>
              </h3>
              <p className="text-xs text-slate-500">Updates the public school website, About Us, and contact information</p>
            </div>

            {settingsSavedSuccess && (
              <div className="flex items-center gap-1.5 text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-lg text-xs font-bold animate-fade-in">
                <CheckCircle2 size={14} />
                <span>Website Content Synchronized!</span>
              </div>
            )}
          </div>

          <form onSubmit={handleSaveSettings} className="space-y-4 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">Official School Name *</label>
                <input
                  type="text"
                  required
                  value={schoolSettings.school_name}
                  onChange={(e) => setSchoolSettings({ ...schoolSettings, school_name: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg font-bold text-slate-900 text-xs"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Contact Phone Number *</label>
                <input
                  type="text"
                  required
                  value={schoolSettings.contact_phone}
                  onChange={(e) => setSchoolSettings({ ...schoolSettings, contact_phone: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">Official Email Address *</label>
                <input
                  type="email"
                  required
                  value={schoolSettings.contact_email}
                  onChange={(e) => setSchoolSettings({ ...schoolSettings, contact_email: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Campus Physical Address</label>
                <input
                  type="text"
                  value={schoolSettings.contact_address}
                  onChange={(e) => setSchoolSettings({ ...schoolSettings, contact_address: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">School Timezone</label>
                <select
                  value={schoolSettings.school_timezone || 'Asia/Kolkata'}
                  onChange={(e) => setSchoolSettings({ ...schoolSettings, school_timezone: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-800"
                >
                  <option value="Asia/Kolkata">Asia/Kolkata (IST - UTC+5:30)</option>
                  <option value="Asia/Dubai">Asia/Dubai (GST - UTC+4:00)</option>
                  <option value="Asia/Karachi">Asia/Karachi (PKT - UTC+5:00)</option>
                  <option value="Asia/Riyadh">Asia/Riyadh (AST - UTC+3:00)</option>
                  <option value="UTC">UTC (Universal Coordinated)</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-slate-700 font-semibold mb-1">About Our School</label>
              <textarea
                rows={3}
                value={schoolSettings.about_us}
                onChange={(e) => setSchoolSettings({ ...schoolSettings, about_us: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs leading-relaxed"
              />
            </div>

            <div>
              <label className="block text-slate-700 font-semibold mb-1">Principal's Welcome Message</label>
              <textarea
                rows={3}
                value={schoolSettings.principal_message}
                onChange={(e) => setSchoolSettings({ ...schoolSettings, principal_message: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs leading-relaxed"
              />
            </div>

            <div>
              <label className="block text-slate-700 font-semibold mb-1">Vision & Mission Statement</label>
              <textarea
                rows={3}
                value={schoolSettings.vision_mission}
                onChange={(e) => setSchoolSettings({ ...schoolSettings, vision_mission: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs leading-relaxed"
              />
            </div>

            <div className="flex justify-end pt-3 border-t border-slate-100">
              <button
                type="submit"
                disabled={savingSettings}
                className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-500 text-white font-bold px-6 py-2.5 rounded-xl shadow transition-colors disabled:opacity-50"
              >
                <Save size={14} />
                <span>{savingSettings ? 'Saving Content...' : 'Save & Publish to Website'}</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Modal: Publish Notice */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <h3 className="font-bold text-slate-900 text-sm">Publish Circular / Public Notice</h3>
            <form onSubmit={handleCreateNotice} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">Notice Title</label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                  placeholder="e.g. Eid-ul-Fitr School Holiday Notice"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Category</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold"
                >
                  <option value="GENERAL">General Announcement</option>
                  <option value="HOLIDAY">Holiday & Vacations</option>
                  <option value="ACADEMIC">Academic & Syllabus</option>
                  <option value="EXAM">Examinations</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Content / Body</label>
                <textarea
                  required
                  rows={4}
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                  placeholder="Complete text of notice or circular..."
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="pin"
                  checked={isPinned}
                  onChange={(e) => setIsPinned(e.target.checked)}
                  className="rounded text-blue-600"
                />
                <label htmlFor="pin" className="text-slate-700 font-semibold cursor-pointer">
                  Pin to top of public website
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-semibold shadow disabled:opacity-50"
                >
                  {saving ? 'Publishing...' : 'Publish'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Add Gallery Media */}
      {showGalleryModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <h3 className="font-bold text-slate-900 text-sm">Add Public Gallery Media</h3>
            <form onSubmit={handleCreateGallery} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">Photo Title / Caption</label>
                <input
                  type="text"
                  required
                  value={mediaTitle}
                  onChange={(e) => setMediaTitle(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                  placeholder="e.g. Science Fair Prize Distribution"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Album / Event Name</label>
                <input
                  type="text"
                  required
                  value={mediaAlbum}
                  onChange={(e) => setMediaAlbum(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                  placeholder="e.g. Annual Function / Sports Meet"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Image URL</label>
                <input
                  type="url"
                  required
                  value={mediaUrl}
                  onChange={(e) => setMediaUrl(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                  placeholder="https://images.unsplash.com/..."
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowGalleryModal(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-semibold shadow disabled:opacity-50"
                >
                  {saving ? 'Adding...' : 'Add to Gallery'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
