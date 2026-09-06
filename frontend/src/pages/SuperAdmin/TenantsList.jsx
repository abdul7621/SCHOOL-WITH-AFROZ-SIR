import React, { useState, useEffect } from 'react';
import { Shield, Plus, Globe, Database, CheckCircle2, RefreshCw, Sparkles, School, Key, Copy, ArrowRight, ExternalLink } from 'lucide-react';
import api from '../../api/client';

export const TenantsList = () => {
  const [tenants, setTenants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  // Form State
  const [schoolName, setSchoolName] = useState('');
  const [slug, setSlug] = useState('');
  const [primaryDomain, setPrimaryDomain] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPhone, setAdminPhone] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [templateType, setTemplateType] = useState('CBSE_STANDARD');
  const [brandColor, setBrandColor] = useState('#1E40AF');

  // Provisioning Progress State
  const [provisioning, setProvisioning] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [provisionedSchool, setProvisionedSchool] = useState(null);

  const fetchTenants = async () => {
    setLoading(true);
    try {
      const res = await api.get('/control/tenants');
      if (res.data) setTenants(res.data);
    } catch (e) {
      // Fallback display
      setTenants([
        {
          id: 't_sample',
          slug: 'sample',
          school_name: '7A Model School (Sandbox)',
          db_name: 'tenant_sample_db',
          status: 'ACTIVE',
          admin_email: 'admin@sample.7aedu.com',
          domains: [{ domain: 'sample.7aedu.com', is_primary: true }],
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTenants();
  }, []);

  // Auto-generate slug and domain when school name changes
  const handleNameChange = (name) => {
    setSchoolName(name);
    const generatedSlug = name.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 15);
    setSlug(generatedSlug);
    setPrimaryDomain(`${generatedSlug}-school.com`);
    setAdminEmail(`admin@${generatedSlug}-school.com`);
  };

  const handleProvisionTenant = async (e) => {
    e.preventDefault();
    setProvisioning(true);
    setCurrentStep(1);

    const stepsTimer = setInterval(() => {
      setCurrentStep((prev) => (prev < 4 ? prev + 1 : prev));
    }, 800);

    try {
      const payload = {
        slug: slug.toLowerCase(),
        school_name: schoolName,
        primary_domain: primaryDomain.toLowerCase(),
        admin_email: adminEmail,
        admin_phone: adminPhone,
        admin_password: adminPassword,
        template_type: templateType,
        theme_primary_color: brandColor,
      };

      const res = await api.post('/control/tenants', payload);
      clearInterval(stepsTimer);
      setCurrentStep(5);

      setProvisionedSchool({
        name: schoolName,
        slug: slug.toLowerCase(),
        domain: primaryDomain.toLowerCase(),
        db_name: `tenant_${slug.toLowerCase()}_db`,
        admin_email: adminEmail,
        admin_password: adminPassword,
        template: templateType,
      });

      fetchTenants();
    } catch (err) {
      clearInterval(stepsTimer);
      alert('School Provisioning Failed: ' + err.message);
      setProvisioning(false);
      setCurrentStep(0);
    }
  };

  const copyToClipboard = (text) => {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(text)
          .then(() => alert('Credentials copied to clipboard!'))
          .catch(() => fallbackCopy(text));
      } else {
        fallbackCopy(text);
      }
    } catch (e) {
      fallbackCopy(text);
    }
  };

  const fallbackCopy = (text) => {
    try {
      const textArea = document.createElement('textarea');
      textArea.value = text;
      textArea.style.position = 'fixed';
      textArea.style.top = '0';
      textArea.style.left = '0';
      textArea.style.width = '2em';
      textArea.style.height = '2em';
      textArea.style.padding = '0';
      textArea.style.border = 'none';
      textArea.style.outline = 'none';
      textArea.style.boxShadow = 'none';
      textArea.style.background = 'transparent';
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      const successful = document.execCommand('copy');
      document.body.removeChild(textArea);
      if (successful) {
        alert('Credentials copied to clipboard!');
      } else {
        window.prompt('Copy credentials: Press Ctrl+C, then Enter', text);
      }
    } catch (err) {
      window.prompt('Copy credentials: Press Ctrl+C, then Enter', text);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <Shield size={20} className="text-blue-600" />
            <span>Super Admin — Multi-Tenant School Provisioning Hub</span>
          </h1>
          <p className="text-xs text-slate-500">
            Create and launch new schools (UME, MMMS, etc.) instantly with 1-click presets without writing any code
          </p>
        </div>

        <button
          onClick={() => {
            setShowModal(true);
            setProvisionedSchool(null);
            setProvisioning(false);
            setCurrentStep(0);
          }}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-lg shadow-blue-600/30 transition-all"
        >
          <Plus size={16} />
          <span>Provision New School (1-Click)</span>
        </button>
      </div>

      {/* Tenants Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 font-bold text-xs text-slate-800 flex justify-between items-center">
          <span>Active Provisioned School Tenants ({tenants.length})</span>
          <span className="text-xs text-emerald-600 font-semibold bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-200">
            Isolated Database-Per-Tenant Architecture
          </span>
        </div>

        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider">
              <th className="py-3.5 px-4">School Name</th>
              <th className="py-3.5 px-4">Tenant Slug</th>
              <th className="py-3.5 px-4">Primary Custom Domain</th>
              <th className="py-3.5 px-4">Dedicated MySQL DB</th>
              <th className="py-3.5 px-4">Admin Contact</th>
              <th className="py-3.5 px-4">Status</th>
              <th className="py-3.5 px-4 text-center">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 font-medium">
            {tenants.map((t) => (
              <tr key={t.id || t.slug} className="hover:bg-slate-50/80 transition-colors">
                <td className="py-3.5 px-4 font-bold text-slate-900">{t.school_name}</td>
                <td className="py-3.5 px-4 font-mono font-bold text-blue-700">{t.slug}</td>
                <td className="py-3.5 px-4">
                  <div className="flex items-center gap-1.5 text-slate-700">
                    <Globe size={13} className="text-blue-600" />
                    <span className="font-semibold">{t.domains?.[0]?.domain || `${t.slug}-school.com`}</span>
                  </div>
                </td>
                <td className="py-3.5 px-4 font-mono text-slate-600">
                  <Database size={13} className="inline mr-1 text-slate-400" />
                  <span>{t.db_name}</span>
                </td>
                <td className="py-3.5 px-4 text-slate-500">{t.admin_email}</td>
                <td className="py-3.5 px-4">
                  <span className="px-2.5 py-1 rounded-md text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                    {t.status}
                  </span>
                </td>
                <td className="py-3.5 px-4 text-center">
                  <button
                    onClick={() => {
                      localStorage.setItem('tenant_slug', t.slug);
                      localStorage.removeItem('token');
                      localStorage.removeItem('user');
                      window.location.href = `/login?tenant=${t.slug}`;
                    }}
                    className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold rounded-lg text-xs inline-flex items-center gap-1 transition-colors shadow-sm"
                  >
                    <span>Login</span>
                    <ArrowRight size={12} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* 1-Click Multi-Template Provisioning Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-2xl w-full shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto">
            {!provisionedSchool ? (
              <>
                <div className="border-b border-slate-100 pb-4">
                  <h3 className="font-black text-slate-900 text-lg flex items-center gap-2">
                    <Sparkles size={20} className="text-blue-600" />
                    <span>1-Click School Provisioning Wizard</span>
                  </h3>
                  <p className="text-xs text-slate-500 mt-1">
                    Select a preset template to auto-configure classes (Nursery-12), subjects, fee heads, and CBSE grading.
                  </p>
                </div>

                <form onSubmit={handleProvisionTenant} className="space-y-4 text-xs">
                  {/* Template Picker */}
                  <div>
                    <label className="block text-slate-700 font-bold mb-2 uppercase tracking-wider text-[11px]">
                      1. Select School Academic & Fee Preset
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div
                        onClick={() => setTemplateType('CBSE_STANDARD')}
                        className={`p-3.5 rounded-2xl border cursor-pointer transition-all ${
                          templateType === 'CBSE_STANDARD'
                            ? 'border-blue-600 bg-blue-50/70 shadow-sm ring-2 ring-blue-600/20'
                            : 'border-slate-200 bg-slate-50 hover:bg-slate-100'
                        }`}
                      >
                        <div className="font-bold text-blue-900">CBSE English Standard</div>
                        <div className="text-[10px] text-slate-500 mt-1">Nursery-Class 12, CBSE 8-Pt GPA, Monthly Tuition, 9 Core Subjects</div>
                      </div>

                      <div
                        onClick={() => setTemplateType('MISSION_SCHOOL')}
                        className={`p-3.5 rounded-2xl border cursor-pointer transition-all ${
                          templateType === 'MISSION_SCHOOL'
                            ? 'border-blue-600 bg-blue-50/70 shadow-sm ring-2 ring-blue-600/20'
                            : 'border-slate-200 bg-slate-50 hover:bg-slate-100'
                        }`}
                      >
                        <div className="font-bold text-blue-900">Mission / State Board</div>
                        <div className="text-[10px] text-slate-500 mt-1">Primary-High School, Quarterly Fee Heads, State Board Grading</div>
                      </div>

                      <div
                        onClick={() => setTemplateType('CUSTOM')}
                        className={`p-3.5 rounded-2xl border cursor-pointer transition-all ${
                          templateType === 'CUSTOM'
                            ? 'border-blue-600 bg-blue-50/70 shadow-sm ring-2 ring-blue-600/20'
                            : 'border-slate-200 bg-slate-50 hover:bg-slate-100'
                        }`}
                      >
                        <div className="font-bold text-slate-900">Clean Slate</div>
                        <div className="text-[10px] text-slate-500 mt-1">Empty database with blank classes and fee heads for manual setup</div>
                      </div>
                    </div>
                  </div>

                  {/* School Metadata */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-slate-700 font-semibold mb-1">School Name</label>
                      <input
                        type="text"
                        required
                        value={schoolName}
                        onChange={(e) => handleNameChange(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900"
                        placeholder="e.g. UME English School / MMMS"
                      />
                    </div>

                    <div>
                      <label className="block text-slate-700 font-semibold mb-1">Unique Slug (DB Identifier)</label>
                      <input
                        type="text"
                        required
                        value={slug}
                        onChange={(e) => setSlug(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono font-bold text-blue-700"
                        placeholder="e.g. ume or mmms"
                      />
                    </div>

                    <div>
                      <label className="block text-slate-700 font-semibold mb-1">Primary Custom Domain</label>
                      <input
                        type="text"
                        required
                        value={primaryDomain}
                        onChange={(e) => setPrimaryDomain(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono text-slate-800"
                        placeholder="e.g. ume-school.com"
                      />
                    </div>

                    <div>
                      <label className="block text-slate-700 font-semibold mb-1">Brand Theme Color</label>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={brandColor}
                          onChange={(e) => setBrandColor(e.target.value)}
                          className="w-9 h-9 p-0 border border-slate-200 rounded-lg cursor-pointer"
                        />
                        <input
                          type="text"
                          value={brandColor}
                          onChange={(e) => setBrandColor(e.target.value)}
                          className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono text-xs"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Admin Credentials */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-slate-100">
                    <div>
                      <label className="block text-slate-700 font-semibold mb-1">Admin Email</label>
                      <input
                        type="email"
                        required
                        value={adminEmail}
                        onChange={(e) => setAdminEmail(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                        placeholder="admin@school.com"
                      />
                    </div>

                    <div>
                      <label className="block text-slate-700 font-semibold mb-1">Admin Phone</label>
                      <input
                        type="text"
                        required
                        value={adminPhone}
                        onChange={(e) => setAdminPhone(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                        placeholder="9876543210"
                      />
                    </div>

                    <div>
                      <label className="block text-slate-700 font-semibold mb-1">Initial Admin Password</label>
                      <input
                        type="text"
                        required
                        value={adminPassword}
                        onChange={(e) => setAdminPassword(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono"
                        placeholder="SecurePass123!"
                      />
                    </div>
                  </div>

                  {/* Live Progress Bar during Provisioning */}
                  {provisioning && (
                    <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 space-y-2">
                      <div className="flex items-center gap-2 font-bold text-blue-900 text-xs">
                        <RefreshCw size={14} className="animate-spin text-blue-600" />
                        <span>Provisioning Pipeline in Progress...</span>
                      </div>
                      <div className="space-y-1 text-[11px] text-blue-800">
                        <div className={currentStep >= 1 ? 'font-bold' : 'text-slate-400'}>✓ Step 1: Validating Domain & Slug Uniqueness</div>
                        <div className={currentStep >= 2 ? 'font-bold' : 'text-slate-400'}>✓ Step 2: Creating MySQL Database (tenant_{slug}_db)</div>
                        <div className={currentStep >= 3 ? 'font-bold' : 'text-slate-400'}>✓ Step 3: Executing Schema & Seeding Template (Nursery-12, Fees, Grading)</div>
                        <div className={currentStep >= 4 ? 'font-bold' : 'text-slate-400'}>✓ Step 4: Generating School Admin Account & Storage Folders</div>
                      </div>
                    </div>
                  )}

                  <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => setShowModal(false)}
                      disabled={provisioning}
                      className="px-5 py-2.5 text-slate-600 hover:bg-slate-100 rounded-xl font-semibold transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={provisioning || !schoolName || !slug}
                      className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold shadow-lg shadow-blue-600/30 transition-all disabled:opacity-50"
                    >
                      {provisioning ? 'Executing Pipeline...' : 'Start 1-Click Provisioning'}
                    </button>
                  </div>
                </form>
              </>
            ) : (
              /* Success Credential Card */
              <div className="space-y-5 text-center">
                <div className="w-16 h-16 rounded-3xl bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-inner">
                  <CheckCircle2 size={36} />
                </div>

                <div>
                  <h3 className="text-xl font-black text-slate-900">{provisionedSchool.name} is Ready!</h3>
                  <p className="text-xs text-slate-500 mt-1">
                    Dedicated Database <code className="font-bold text-blue-700">{provisionedSchool.db_name}</code> has been initialized with all classes, subjects, and fee heads.
                  </p>
                </div>

                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 text-left text-xs space-y-2.5">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500">Custom Domain:</span>
                    <span className="font-bold text-slate-900">{provisionedSchool.domain}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500">Tenant Slug:</span>
                    <span className="font-mono font-bold text-blue-700">{provisionedSchool.slug}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500">Admin Email:</span>
                    <span className="font-bold text-slate-900">{provisionedSchool.admin_email}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500">Temporary Password:</span>
                    <span className="font-mono font-bold text-emerald-700">{provisionedSchool.admin_password}</span>
                  </div>
                </div>

                <div className="flex justify-center gap-3">
                  <button
                    onClick={() => copyToClipboard(`School: ${provisionedSchool.name}\nDomain: ${provisionedSchool.domain}\nAdmin Email: ${provisionedSchool.admin_email}\nPassword: ${provisionedSchool.admin_password}`)}
                    className="flex items-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold px-4 py-2.5 rounded-xl transition-colors"
                  >
                    <Copy size={14} />
                    <span>Copy Credentials</span>
                  </button>

                  <button
                    onClick={() => {
                      localStorage.setItem('tenant_slug', provisionedSchool.slug);
                      localStorage.removeItem('token');
                      localStorage.removeItem('user');
                      window.location.href = `/login?tenant=${provisionedSchool.slug}`;
                    }}
                    className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold px-5 py-2.5 rounded-xl shadow transition-colors"
                  >
                    <span>🚀 Launch School</span>
                    <ArrowRight size={14} />
                  </button>

                  <button
                    onClick={() => setShowModal(false)}
                    className="flex items-center gap-2 bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-bold px-4 py-2.5 rounded-xl transition-colors"
                  >
                    <span>Done</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
