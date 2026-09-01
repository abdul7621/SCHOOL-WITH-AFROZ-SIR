import React, { useState, useEffect } from 'react';
import { Globe, Plus, Pin, Calendar, CheckCircle2, Megaphone } from 'lucide-react';
import api from '../../api/client';

export const CMSManager = () => {
  const [notices, setNotices] = useState([]);
  const [inquiries, setInquiries] = useState([]);
  const [tab, setTab] = useState('notices');
  const [showModal, setShowModal] = useState(false);

  // New Notice form
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [category, setCategory] = useState('GENERAL');
  const [isPinned, setIsPinned] = useState(false);
  const [saving, setSaving] = useState(false);

  const fetchNotices = async () => {
    try {
      const res = await api.get('/cms/notices/public');
      if (res.data) setNotices(res.data);
    } catch (e) {
      console.log(e);
    }
  };

  const fetchInquiries = async () => {
    try {
      const res = await api.get('/cms/inquiries');
      if (res.data) setInquiries(res.data);
    } catch (e) {
      console.log(e);
    }
  };

  useEffect(() => {
    fetchNotices();
    fetchInquiries();
  }, []);

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

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <Globe size={20} className="text-blue-600" />
            <span>Public Website CMS & Communication</span>
          </h1>
          <p className="text-xs text-slate-500">Manage public notices, admission enquiry leads, and gallery</p>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex bg-slate-200 p-1 rounded-lg text-xs font-semibold">
            <button
              onClick={() => setTab('notices')}
              className={`px-3 py-1.5 rounded-md transition-all ${
                tab === 'notices' ? 'bg-white text-blue-700 shadow-sm font-bold' : 'text-slate-600'
              }`}
            >
              Public Notices ({notices.length})
            </button>
            <button
              onClick={() => setTab('inquiries')}
              className={`px-3 py-1.5 rounded-md transition-all ${
                tab === 'inquiries' ? 'bg-white text-blue-700 shadow-sm font-bold' : 'text-slate-600'
              }`}
            >
              Admission Inquiries ({inquiries.length})
            </button>
          </div>

          {tab === 'notices' && (
            <button
              onClick={() => setShowModal(true)}
              className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold px-4 py-2.5 rounded-lg shadow transition-colors"
            >
              <Plus size={14} />
              <span>Publish Notice</span>
            </button>
          )}
        </div>
      </div>

      {tab === 'notices' ? (
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
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider">
                <th className="py-3 px-4">Applicant Name</th>
                <th className="py-3 px-4">Parent Name</th>
                <th className="py-3 px-4">Phone</th>
                <th className="py-3 px-4">Target Class</th>
                <th className="py-3 px-4">Message</th>
                <th className="py-3 px-4">Status</th>
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
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-800">
                        {i.status}
                      </span>
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

      {/* Publish Notice Modal */}
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
    </div>
  );
};
