import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Shield,
  Sparkles,
  CheckCircle2,
  ArrowRight,
  Database,
  Smartphone,
  Globe,
  CreditCard,
  Zap,
  Star,
  Users,
  Layers,
  Award,
  Phone,
  Mail,
  Lock,
} from 'lucide-react';
import api from '../../api/client';

export const SaaSLandingPage = () => {
  const [selectedPlan, setSelectedPlan] = useState('GROWTH');
  const [showCheckoutModal, setShowCheckoutModal] = useState(false);

  // Auto-provisioning form
  const [schoolName, setSchoolName] = useState('');
  const [primaryDomain, setPrimaryDomain] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPhone, setAdminPhone] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [provisioning, setProvisioning] = useState(false);
  const [successData, setSuccessData] = useState(null);

  const plans = {
    STARTER: { name: 'Starter School', price: '₹35,000', billing: '/ year', maxStudents: 'Up to 400 Students' },
    GROWTH: { name: 'Growth Campus (Most Popular)', price: '₹65,000', billing: '/ year', maxStudents: 'Up to 1,200 Students' },
    ENTERPRISE: { name: 'Enterprise / Custom Plan', price: '₹1,50,000', billing: 'One-Time (+ ₹15k/mo Support)', maxStudents: 'Unlimited Students' },
  };

  const handleStartCheckout = (planKey) => {
    setSelectedPlan(planKey);
    setShowCheckoutModal(true);
    setSuccessData(null);
  };

  const handleRazorpayMockPurchase = async (e) => {
    e.preventDefault();
    setProvisioning(true);

    const slug = schoolName.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 15);
    const domain = primaryDomain || `${slug}-school.com`;

    try {
      const payload = {
        slug,
        school_name: schoolName,
        primary_domain: domain,
        admin_email: adminEmail,
        admin_phone: adminPhone,
        admin_password: adminPassword,
        template_type: 'CBSE_STANDARD',
        theme_primary_color: '#1E40AF',
      };

      const res = await api.post('/control/tenants', payload);
      setSuccessData({
        schoolName,
        slug,
        domain,
        adminEmail,
        password: adminPassword,
        db_name: `tenant_${slug}_db`,
      });
    } catch (err) {
      alert('Provisioning Error: ' + err.message);
    } finally {
      setProvisioning(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 font-sans selection:bg-blue-600 selection:text-white">
      {/* Top Banner */}
      <div className="bg-blue-600 text-white text-xs font-semibold py-2 px-4 text-center">
        🚀 Next-Gen Multi-Tenant School ERP SaaS Platform — Empowering 100+ Schools Across India
      </div>

      {/* Main SaaS Navbar */}
      <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center font-black text-white text-lg shadow-lg">
              7A
            </div>
            <div>
              <div className="text-lg font-black tracking-tight text-white">7A School ERP</div>
              <div className="text-[10px] text-blue-400 font-semibold tracking-wider uppercase">SaaS Digital Ecosystem</div>
            </div>
          </div>

          <nav className="hidden md:flex items-center gap-8 text-xs font-bold text-slate-300">
            <a href="#features" className="hover:text-blue-400 transition-colors">Features</a>
            <a href="#architecture" className="hover:text-blue-400 transition-colors">Architecture</a>
            <a href="#pricing" className="hover:text-blue-400 transition-colors">Pricing Plans</a>
            <a href="#security" className="hover:text-blue-400 transition-colors">Security</a>
          </nav>

          <div className="flex items-center gap-3">
            <Link
              to="/login"
              className="text-xs font-bold text-slate-300 hover:text-white px-3 py-2 rounded-lg"
            >
              Staff / Admin Login
            </Link>
            <a
              href="#pricing"
              className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-lg shadow-blue-600/30 transition-all"
            >
              Get Started
            </a>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="max-w-6xl mx-auto px-4 py-20 text-center space-y-8">
        <div className="inline-flex items-center gap-2 bg-blue-950/80 text-blue-400 border border-blue-800/60 text-xs font-bold px-4 py-1.5 rounded-full">
          <Sparkles size={14} />
          <span>Automated 30-Second School Provisioning Engine</span>
        </div>

        <h1 className="text-4xl sm:text-6xl font-black text-white tracking-tight leading-tight max-w-4xl mx-auto">
          The All-In-One Modern <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-300">Digital Campus & ERP</span> for Growing Schools
        </h1>

        <p className="text-slate-400 text-sm sm:text-lg max-w-2xl mx-auto leading-relaxed">
          Database-per-Tenant isolation, Penny-Perfect FIFO Fee Engine, 1-Click CBSE Report Cards, Parent Portal PWA, and Live Public School Website.
        </p>

        <div className="flex flex-wrap items-center justify-center gap-4 pt-4">
          <a
            href="#pricing"
            className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold px-8 py-4 rounded-2xl shadow-xl shadow-blue-600/40 transition-all flex items-center gap-2 text-sm"
          >
            <span>Launch Your School ERP Now</span>
            <ArrowRight size={16} />
          </a>
          <Link
            to="/website"
            className="bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold px-6 py-4 rounded-2xl border border-slate-700 transition-all text-sm"
          >
            View Live School Demo
          </Link>
        </div>

        <div className="pt-12 grid grid-cols-2 md:grid-cols-4 gap-6 border-t border-slate-800/80 text-left">
          <div className="p-4 bg-slate-800/40 rounded-2xl border border-slate-800">
            <div className="text-2xl font-black text-white">100%</div>
            <div className="text-xs text-slate-400 mt-1">Dedicated DB Isolation</div>
          </div>
          <div className="p-4 bg-slate-800/40 rounded-2xl border border-slate-800">
            <div className="text-2xl font-black text-emerald-400">0.00 ₹</div>
            <div className="text-xs text-slate-400 mt-1">FIFO Penny-Perfect Ledger</div>
          </div>
          <div className="p-4 bg-slate-800/40 rounded-2xl border border-slate-800">
            <div className="text-2xl font-black text-blue-400">&lt; 30s</div>
            <div className="text-xs text-slate-400 mt-1">1-Click Auto Provisioning</div>
          </div>
          <div className="p-4 bg-slate-800/40 rounded-2xl border border-slate-800">
            <div className="text-2xl font-black text-amber-400">12-in-1</div>
            <div className="text-xs text-slate-400 mt-1">Portals, Web & Admin Views</div>
          </div>
        </div>
      </section>

      {/* Pricing Table Section */}
      <section id="pricing" className="max-w-7xl mx-auto px-4 sm:px-8 py-20 space-y-12">
        <div className="text-center space-y-3">
          <div className="text-blue-400 font-bold text-xs uppercase tracking-wider">Transparent & Predictable Pricing</div>
          <h2 className="text-3xl sm:text-4xl font-black text-white">Choose the Right Plan for Your School</h2>
          <p className="text-xs text-slate-400">No hidden fees, no per-student penalties. Flat annual pricing that grows with you.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Plan 1: Starter */}
          <div className="bg-slate-800/60 p-8 rounded-3xl border border-slate-700 flex flex-col justify-between space-y-6">
            <div className="space-y-4">
              <div className="text-sm font-bold text-slate-300">Starter Campus</div>
              <div className="text-3xl font-black text-white">₹35,000 <span className="text-xs text-slate-400 font-normal">/ year</span></div>
              <p className="text-xs text-slate-400">Best for growing budget and primary schools.</p>
              <div className="pt-4 border-t border-slate-700 space-y-2.5 text-xs text-slate-300 font-medium">
                <div className="flex items-center gap-2"><CheckCircle2 size={14} className="text-emerald-400" /> Up to 400 Students</div>
                <div className="flex items-center gap-2"><CheckCircle2 size={14} className="text-emerald-400" /> Staff ERP & 1-Click Attendance</div>
                <div className="flex items-center gap-2"><CheckCircle2 size={14} className="text-emerald-400" /> FIFO Fee Collection & Receipts</div>
                <div className="flex items-center gap-2"><CheckCircle2 size={14} className="text-emerald-400" /> CBSE 8-Point Report Cards</div>
                <div className="flex items-center gap-2"><CheckCircle2 size={14} className="text-emerald-400" /> Excel Streaming Migration</div>
              </div>
            </div>
            <button
              onClick={() => handleStartCheckout('STARTER')}
              className="w-full py-3 bg-slate-700 hover:bg-slate-600 text-white font-bold rounded-xl text-xs transition-colors"
            >
              Get Starter Plan
            </button>
          </div>

          {/* Plan 2: Growth (Popular) */}
          <div className="bg-gradient-to-b from-blue-900/60 to-slate-800/90 p-8 rounded-3xl border-2 border-blue-500 relative shadow-2xl flex flex-col justify-between space-y-6">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-blue-500 text-white text-[10px] font-black uppercase tracking-wider px-3 py-1 rounded-full shadow">
              Most Popular Choice
            </div>
            <div className="space-y-4">
              <div className="text-sm font-bold text-blue-300">Growth Campus</div>
              <div className="text-3xl font-black text-white">₹65,000 <span className="text-xs text-slate-300 font-normal">/ year</span></div>
              <p className="text-xs text-blue-200">Full complete digital ecosystem for established private schools.</p>
              <div className="pt-4 border-t border-blue-700/60 space-y-2.5 text-xs text-slate-200 font-medium">
                <div className="flex items-center gap-2"><CheckCircle2 size={14} className="text-emerald-400" /> Up to 1,200 Students</div>
                <div className="flex items-center gap-2"><CheckCircle2 size={14} className="text-emerald-400" /> <strong>Dedicated Isolated Database</strong></div>
                <div className="flex items-center gap-2"><CheckCircle2 size={14} className="text-emerald-400" /> <strong>Public School Website Gateway</strong></div>
                <div className="flex items-center gap-2"><CheckCircle2 size={14} className="text-emerald-400" /> <strong>Parent Portal Mobile PWA</strong></div>
                <div className="flex items-center gap-2"><CheckCircle2 size={14} className="text-emerald-400" /> Automated WhatsApp & SMS Alerts</div>
                <div className="flex items-center gap-2"><CheckCircle2 size={14} className="text-emerald-400" /> School Day-Book & Finance Vouchers</div>
                <div className="flex items-center gap-2"><CheckCircle2 size={14} className="text-emerald-400" /> Transfer Certificate (TC) Vault with QR</div>
              </div>
            </div>
            <button
              onClick={() => handleStartCheckout('GROWTH')}
              className="w-full py-3.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-xs shadow-lg shadow-blue-600/40 transition-all"
            >
              Get Growth Plan (Instant Launch)
            </button>
          </div>

          {/* Plan 3: Enterprise */}
          <div className="bg-slate-800/60 p-8 rounded-3xl border border-slate-700 flex flex-col justify-between space-y-6">
            <div className="space-y-4">
              <div className="text-sm font-bold text-slate-300">Custom Implementation</div>
              <div className="text-3xl font-black text-white">₹1,50,000 <span className="text-xs text-slate-400 font-normal">One-Time</span></div>
              <p className="text-xs text-slate-400">Complete white-label setup with ₹15,000/mo ongoing maintenance.</p>
              <div className="pt-4 border-t border-slate-700 space-y-2.5 text-xs text-slate-300 font-medium">
                <div className="flex items-center gap-2"><CheckCircle2 size={14} className="text-emerald-400" /> Unlimited Students & Staff</div>
                <div className="flex items-center gap-2"><CheckCircle2 size={14} className="text-emerald-400" /> Custom Domain (e.g. ume-school.com)</div>
                <div className="flex items-center gap-2"><CheckCircle2 size={14} className="text-emerald-400" /> On-site Data Migration Support</div>
                <div className="flex items-center gap-2"><CheckCircle2 size={14} className="text-emerald-400" /> Dedicated Hostinger VPS Setup</div>
                <div className="flex items-center gap-2"><CheckCircle2 size={14} className="text-emerald-400" /> Priority 24x7 SLA Support</div>
              </div>
            </div>
            <button
              onClick={() => handleStartCheckout('ENTERPRISE')}
              className="w-full py-3 bg-slate-700 hover:bg-slate-600 text-white font-bold rounded-xl text-xs transition-colors"
            >
              Contact for Enterprise
            </button>
          </div>
        </div>
      </section>

      {/* Auto-Checkout & Provisioning Modal */}
      {showCheckoutModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl space-y-6">
            {!successData ? (
              <>
                <div className="border-b border-slate-800 pb-4">
                  <div className="text-xs font-bold text-blue-400 uppercase">Instant Self-Serve Checkout</div>
                  <h3 className="text-lg font-black text-white mt-1">
                    Subscribe to {plans[selectedPlan].name} ({plans[selectedPlan].price})
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Your school ERP instance will be automatically provisioned in 30 seconds upon checkout.
                  </p>
                </div>

                <form onSubmit={handleRazorpayMockPurchase} className="space-y-3.5 text-xs">
                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">School Name</label>
                    <input
                      type="text"
                      required
                      value={schoolName}
                      onChange={(e) => {
                        setSchoolName(e.target.value);
                        const slug = e.target.value.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 15);
                        setPrimaryDomain(`${slug}-school.com`);
                        setAdminEmail(`admin@${slug}-school.com`);
                      }}
                      className="w-full px-3.5 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white font-bold"
                      placeholder="e.g. UME English School"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">Primary Custom Domain</label>
                    <input
                      type="text"
                      required
                      value={primaryDomain}
                      onChange={(e) => setPrimaryDomain(e.target.value)}
                      className="w-full px-3.5 py-2 bg-slate-800 border border-slate-700 rounded-xl text-blue-400 font-mono"
                      placeholder="ume-school.com"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-slate-300 font-semibold mb-1">Principal / Admin Email</label>
                      <input
                        type="email"
                        required
                        value={adminEmail}
                        onChange={(e) => setAdminEmail(e.target.value)}
                        className="w-full px-3.5 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white"
                        placeholder="admin@school.com"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-300 font-semibold mb-1">Phone (for WhatsApp Alerts)</label>
                      <input
                        type="text"
                        required
                        value={adminPhone}
                        onChange={(e) => setAdminPhone(e.target.value)}
                        className="w-full px-3.5 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white font-mono"
                        placeholder="9876543210"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">Set Master Admin Password</label>
                    <input
                      type="password"
                      required
                      value={adminPassword}
                      onChange={(e) => setAdminPassword(e.target.value)}
                      className="w-full px-3.5 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white font-mono"
                      placeholder="••••••••••••"
                    />
                  </div>

                  <div className="p-3 bg-blue-950/60 border border-blue-800/80 rounded-xl text-[11px] text-blue-300 flex items-center gap-2">
                    <CreditCard size={16} className="text-blue-400" />
                    <span>Razorpay Secure Payment Gateway (UPI / Cards / NetBanking)</span>
                  </div>

                  <div className="flex justify-end gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => setShowCheckoutModal(false)}
                      disabled={provisioning}
                      className="px-4 py-2 text-slate-400 hover:text-white font-semibold"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={provisioning || !schoolName}
                      className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold shadow-lg shadow-blue-600/40 transition-all disabled:opacity-50"
                    >
                      {provisioning ? 'Provisioning Instance...' : `Pay ${plans[selectedPlan].price} & Launch`}
                    </button>
                  </div>
                </form>
              </>
            ) : (
              <div className="text-center space-y-4 py-4">
                <div className="w-14 h-14 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto border border-emerald-500/30">
                  <CheckCircle2 size={32} />
                </div>
                <h3 className="text-lg font-black text-white">{successData.schoolName} is Live!</h3>
                <p className="text-xs text-slate-400">
                  Dedicated MySQL Database <code className="text-blue-400">{successData.db_name}</code> has been initialized.
                </p>

                <div className="p-4 bg-slate-800/80 border border-slate-700 rounded-2xl text-left text-xs space-y-2">
                  <div><strong>Portal URL:</strong> <span className="text-blue-400">https://{successData.domain}</span></div>
                  <div><strong>Admin Email:</strong> {successData.adminEmail}</div>
                  <div><strong>Password:</strong> <span className="font-mono text-emerald-400">{successData.password}</span></div>
                </div>

                <button
                  onClick={() => setShowCheckoutModal(false)}
                  className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-xs transition-colors"
                >
                  Access School Admin Portal
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
