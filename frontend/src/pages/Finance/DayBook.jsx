import React, { useState, useEffect } from 'react';
import { DollarSign, Plus, ArrowDownLeft, ArrowUpRight, CheckCircle2 } from 'lucide-react';
import api from '../../api/client';

export const DayBook = () => {
  const [dayBook, setDayBook] = useState(null);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(false);
  const [showVoucherModal, setShowVoucherModal] = useState(false);
  const [categories, setCategories] = useState([]);
  const [paymentModes, setPaymentModes] = useState([]);
  const [paymentModeId, setPaymentModeId] = useState('');

  // Voucher form state
  const [voucherType, setVoucherType] = useState('EXPENSE');
  const [amount, setAmount] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [partyName, setPartyName] = useState('');
  const [description, setDescription] = useState('');

  // Fetch initial lookups
  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        const [catRes, modeRes] = await Promise.all([
          api.get('/finance/categories'),
          api.get('/lookups/payment-modes'),
        ]);
        if (catRes.data && catRes.data.length > 0) {
          setCategories(catRes.data);
          const filtered = catRes.data.filter((c) => c.category_type === 'EXPENSE');
          if (filtered.length > 0) setCategoryId(filtered[0].id);
          else setCategoryId(catRes.data[0].id);
        }
        if (modeRes.data && modeRes.data.length > 0) {
          setPaymentModes(modeRes.data);
          setPaymentModeId(modeRes.data[0].id);
        }
      } catch (e) {
        console.log('Error fetching finance lookups:', e);
      }
    };
    fetchInitialData();
  }, []);

  const fetchDayBook = async () => {
    setLoading(true);
    try {
      const res = await api.get('/finance/day-book', { params: { transaction_date: selectedDate } });
      if (res.data) setDayBook(res.data);
    } catch (e) {
      console.log(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDayBook();
  }, [selectedDate]);

  const handleCreateVoucher = async (e) => {
    e.preventDefault();
    if (!categoryId || !paymentModeId || !amount) {
      alert('Please select category, payment mode and enter amount');
      return;
    }
    try {
      const payload = {
        voucher_type: voucherType,
        transaction_date: selectedDate,
        amount: parseFloat(amount),
        category_id: categoryId,
        payment_mode_id: paymentModeId,
        party_name: partyName || undefined,
        description: description || undefined,
      };
      await api.post('/finance/vouchers', payload);
      setShowVoucherModal(false);
      setAmount('');
      setPartyName('');
      setDescription('');
      fetchDayBook();
    } catch (err) {
      alert('Voucher Creation Failed: ' + err.message);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-lg font-bold text-slate-900">Consolidated Day-Book & Cashflow (Hisaab-Kitab)</h1>
          <p className="text-xs text-slate-500">Live Fee collections + Other Incomes - Expenses = Net Balance</p>
        </div>

        <div className="flex items-center gap-3">
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="border border-slate-200 rounded-lg px-3 py-2 bg-white text-xs font-semibold text-slate-800 shadow-sm"
          />
          <button
            onClick={() => setShowVoucherModal(true)}
            className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold px-4 py-2 rounded-lg shadow transition-colors"
          >
            <Plus size={14} />
            <span>Add Voucher</span>
          </button>
        </div>
      </div>

      {/* Summary Row */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="text-xs text-slate-500 font-semibold uppercase">Fee Inflow</div>
          <div className="text-xl font-bold text-emerald-600 mt-1">₹{dayBook?.total_fee_collections?.toLocaleString() || 0}</div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="text-xs text-slate-500 font-semibold uppercase">Other Incomes</div>
          <div className="text-xl font-bold text-emerald-600 mt-1">₹{dayBook?.total_other_incomes?.toLocaleString() || 0}</div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="text-xs text-slate-500 font-semibold uppercase">Voucher Expenses</div>
          <div className="text-xl font-bold text-rose-600 mt-1">₹{dayBook?.total_expenses?.toLocaleString() || 0}</div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="text-xs text-slate-500 font-semibold uppercase">Net Daily Cashflow</div>
          <div className="text-xl font-bold text-blue-700 mt-1">₹{dayBook?.net_daily_cashflow?.toLocaleString() || 0}</div>
        </div>
      </div>

      {/* Transactions Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 font-bold text-slate-800 text-xs">
          Daily Transactions for {selectedDate}
        </div>
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider">
              <th className="py-3 px-4">Ref / Vch No</th>
              <th className="py-3 px-4">Type</th>
              <th className="py-3 px-4">Party / Student</th>
              <th className="py-3 px-4">Description</th>
              <th className="py-3 px-4 text-right">Inflow (Cr)</th>
              <th className="py-3 px-4 text-right">Outflow (Dr)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 font-medium">
            {dayBook?.vouchers?.length > 0 ? (
              dayBook.vouchers.map((v) => (
                <tr key={v.id} className="hover:bg-slate-50/80">
                  <td className="py-3 px-4 font-mono font-bold text-blue-700">{v.voucher_no}</td>
                  <td className="py-3 px-4">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      v.voucher_type === 'INCOME' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                    }`}>
                      {v.voucher_type}
                    </span>
                  </td>
                  <td className="py-3 px-4 font-semibold text-slate-800">{v.party_name || '-'}</td>
                  <td className="py-3 px-4 text-slate-500">{v.description || '-'}</td>
                  <td className="py-3 px-4 text-right text-emerald-600 font-bold">
                    {v.voucher_type === 'INCOME' ? `₹${v.amount}` : '-'}
                  </td>
                  <td className="py-3 px-4 text-right text-rose-600 font-bold">
                    {v.voucher_type === 'EXPENSE' ? `₹${v.amount}` : '-'}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={6} className="text-center py-8 text-slate-400">
                  No vouchers recorded for this date.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Add Voucher Modal */}
      {showVoucherModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <h3 className="font-bold text-slate-900 text-sm">Add Financial Voucher</h3>
            <form onSubmit={handleCreateVoucher} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">Voucher Type</label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setVoucherType('EXPENSE')}
                    className={`flex-1 py-2 font-bold rounded-lg border ${
                      voucherType === 'EXPENSE' ? 'bg-rose-600 text-white border-rose-600' : 'bg-slate-50 text-slate-700'
                    }`}
                  >
                    Expense (Outflow)
                  </button>
                  <button
                    type="button"
                    onClick={() => setVoucherType('INCOME')}
                    className={`flex-1 py-2 font-bold rounded-lg border ${
                      voucherType === 'INCOME' ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-slate-50 text-slate-700'
                    }`}
                  >
                    Direct Income (Inflow)
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Amount (₹)</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold"
                  placeholder="0.00"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Category</label>
                <select
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-800"
                >
                  {categories
                    .filter((c) => c.category_type === voucherType)
                    .map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Payment Mode</label>
                <select
                  value={paymentModeId}
                  onChange={(e) => setPaymentModeId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-800"
                >
                  {paymentModes.map((pm) => (
                    <option key={pm.id} value={pm.id}>{pm.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Party / Vendor Name</label>
                <input
                  type="text"
                  value={partyName}
                  onChange={(e) => setPartyName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                  placeholder="e.g. Electric Board / Stationery Vendor"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Description / Remarks</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                  rows={2}
                  placeholder="Details of expense or income..."
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowVoucherModal(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-semibold shadow"
                >
                  Save Voucher
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
