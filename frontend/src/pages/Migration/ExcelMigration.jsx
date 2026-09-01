import React, { useState } from 'react';
import { FileSpreadsheet, Download, Upload, CheckCircle2, AlertTriangle, XCircle, ArrowRight, RefreshCw } from 'lucide-react';
import api from '../../api/client';

export const ExcelMigration = () => {
  const [file, setFile] = useState(null);
  const [academicYearId, setAcademicYearId] = useState('default_year');
  const [dryRunReport, setDryRunReport] = useState(null);
  const [loading, setLoading] = useState(false);
  const [committing, setCommitting] = useState(false);
  const [commitResult, setCommitResult] = useState(null);

  const handleDownloadTemplate = async () => {
    try {
      window.open('/api/v1/excel/template/students', '_blank');
    } catch (e) {
      alert('Error downloading template: ' + e.message);
    }
  };

  const handleDryRun = async (e) => {
    e.preventDefault();
    if (!file) return;

    setLoading(true);
    setCommitResult(null);
    setDryRunReport(null);

    const formData = new FormData();
    formData.append('file', file);
    formData.append('academic_year_id', academicYearId);

    try {
      const res = await api.post('/excel/import/students/dry-run', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      if (res.data) {
        setDryRunReport(res.data);
      }
    } catch (err) {
      alert('Dry Run Failed: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleExecuteCommit = async () => {
    if (!file || !dryRunReport?.can_proceed) return;

    setCommitting(true);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('academic_year_id', academicYearId);

    try {
      const res = await api.post('/excel/import/students/commit', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      if (res.data) {
        setCommitResult(res.data);
        setDryRunReport(null);
        setFile(null);
      }
    } catch (err) {
      alert('Atomic Database Commit Failed: ' + err.message);
    } finally {
      setCommitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <FileSpreadsheet size={20} className="text-emerald-600" />
            <span>Excel Data Migration Engine (5-Step Fail-Safe Pipeline)</span>
          </h1>
          <p className="text-xs text-slate-500">Bulk import student master registers and opening data with zero-data corruption</p>
        </div>

        <button
          onClick={handleDownloadTemplate}
          className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold px-4 py-2.5 rounded-lg shadow transition-colors"
        >
          <Download size={14} />
          <span>Download Standard Template (.xlsx)</span>
        </button>
      </div>

      {/* Step Pipeline Graphic */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-center text-xs">
        <div className="p-3 bg-white rounded-xl border border-slate-200 shadow-sm">
          <div className="font-bold text-blue-600">Step 1: Download</div>
          <div className="text-[11px] text-slate-500 mt-0.5">Get standardized format</div>
        </div>
        <div className="p-3 bg-white rounded-xl border border-slate-200 shadow-sm">
          <div className="font-bold text-blue-600">Step 2: Fill Data</div>
          <div className="text-[11px] text-slate-500 mt-0.5">Fill students & parents</div>
        </div>
        <div className="p-3 bg-white rounded-xl border border-slate-200 shadow-sm">
          <div className="font-bold text-blue-600">Step 3: Dry-Run Preview</div>
          <div className="text-[11px] text-slate-500 mt-0.5">Constraint & duplicate check</div>
        </div>
        <div className="p-3 bg-white rounded-xl border border-slate-200 shadow-sm">
          <div className="font-bold text-emerald-600">Step 4: Atomic Commit</div>
          <div className="text-[11px] text-slate-500 mt-0.5">Single-transaction save</div>
        </div>
      </div>

      {/* Upload Zone */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <h3 className="font-bold text-slate-900 text-sm">Upload Excel Spreadsheet (.xlsx)</h3>

        <form onSubmit={handleDryRun} className="space-y-4">
          <div className="border-2 border-dashed border-slate-200 hover:border-blue-500 rounded-xl p-8 text-center transition-colors">
            <Upload size={32} className="mx-auto text-slate-400 mb-2" />
            <label className="cursor-pointer">
              <span className="text-sm font-semibold text-blue-600 hover:underline">Choose .xlsx file</span>
              <input
                type="file"
                accept=".xlsx, .xls"
                onChange={(e) => setFile(e.target.files[0])}
                className="hidden"
              />
            </label>
            <p className="text-xs text-slate-400 mt-1">
              {file ? `Selected: ${file.name} (${(file.size / 1024).toFixed(1)} KB)` : 'Only .xlsx workbooks supported'}
            </p>
          </div>

          <div className="flex items-center justify-between">
            <div className="text-xs text-slate-500">
              * Dry-run will validate duplicate admission numbers and phone numbers without changing database.
            </div>

            <button
              type="submit"
              disabled={!file || loading}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold px-5 py-2.5 rounded-lg shadow transition-colors disabled:opacity-50"
            >
              {loading ? <RefreshCw size={14} className="animate-spin" /> : <ArrowRight size={14} />}
              <span>{loading ? 'Validating Constraints...' : 'Start Dry-Run Validation'}</span>
            </button>
          </div>
        </form>
      </div>

      {/* Success Commit Message */}
      {commitResult && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-5 rounded-2xl flex items-center gap-3">
          <CheckCircle2 size={24} className="text-emerald-600" />
          <div>
            <div className="font-bold text-sm">Import Completed Successfully!</div>
            <div className="text-xs text-emerald-700">
              Enrolled {commitResult.imported_count} students into active class rosters.
            </div>
          </div>
        </div>
      )}

      {/* Dry Run Report Results */}
      {dryRunReport && (
        <div className="space-y-4">
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-center">
                <div className="text-xs text-slate-500 uppercase font-semibold">Total Rows</div>
                <div className="text-lg font-black text-slate-900">{dryRunReport.total_rows}</div>
              </div>
              <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-100 text-center">
                <div className="text-xs text-emerald-700 uppercase font-semibold">Valid Rows</div>
                <div className="text-lg font-black text-emerald-700">{dryRunReport.valid_rows_count}</div>
              </div>
              <div className="p-3 bg-rose-50 rounded-xl border border-rose-100 text-center">
                <div className="text-xs text-rose-700 uppercase font-semibold">Errors Found</div>
                <div className="text-lg font-black text-rose-700">{dryRunReport.invalid_rows_count}</div>
              </div>
            </div>

            {dryRunReport.can_proceed ? (
              <button
                onClick={handleExecuteCommit}
                disabled={committing}
                className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold px-6 py-3 rounded-xl shadow-lg shadow-emerald-600/30 transition-all disabled:opacity-50"
              >
                {committing ? <RefreshCw size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
                <span>{committing ? 'Committing Database Transaction...' : 'Commit All to Database'}</span>
              </button>
            ) : (
              <div className="text-xs text-rose-600 font-semibold flex items-center gap-1.5 bg-rose-50 border border-rose-200 px-3 py-2 rounded-lg">
                <AlertTriangle size={16} />
                <span>Fix errors in Excel sheet before importing</span>
              </div>
            )}
          </div>

          {/* Errors List if any */}
          {dryRunReport.errors?.length > 0 && (
            <div className="bg-rose-50 border border-rose-200 rounded-2xl p-5 space-y-3">
              <h4 className="font-bold text-rose-900 text-xs uppercase tracking-wider flex items-center gap-1.5">
                <XCircle size={16} />
                <span>Row Validation Errors ({dryRunReport.errors.length})</span>
              </h4>
              <div className="space-y-1.5 max-h-60 overflow-y-auto text-xs">
                {dryRunReport.errors.map((err, i) => (
                  <div key={i} className="bg-white p-2.5 rounded-lg border border-rose-200 text-rose-800 flex items-center justify-between">
                    <div>
                      <strong>Row #{err.row_number}</strong> — Field: <code>{err.field}</code> ({err.error_message})
                    </div>
                    {err.value && <span className="font-mono text-[11px] text-slate-500">Value: "{err.value}"</span>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Preview Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-100 font-bold text-slate-900 text-xs">
              Excel Sheet Preview (First {dryRunReport.preview_data?.length || 0} Rows)
            </div>
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider">
                  <th className="py-3 px-4">Row</th>
                  <th className="py-3 px-4">Adm No</th>
                  <th className="py-3 px-4">Student Name</th>
                  <th className="py-3 px-4">Class & Sec</th>
                  <th className="py-3 px-4">Father Name</th>
                  <th className="py-3 px-4">Phone</th>
                  <th className="py-3 px-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {dryRunReport.preview_data?.map((p) => (
                  <tr key={p.row_number} className={p.has_error ? 'bg-rose-50/50' : 'hover:bg-slate-50/80'}>
                    <td className="py-3 px-4 font-mono font-bold text-slate-500">#{p.row_number}</td>
                    <td className="py-3 px-4 font-mono font-bold text-blue-700">{p.admission_no}</td>
                    <td className="py-3 px-4 font-semibold text-slate-900">{p.full_name}</td>
                    <td className="py-3 px-4">{p.class_name} - {p.section_name}</td>
                    <td className="py-3 px-4 text-slate-600">{p.father_name}</td>
                    <td className="py-3 px-4 text-slate-600">{p.primary_phone}</td>
                    <td className="py-3 px-4">
                      {p.has_error ? (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-800">ERROR</span>
                      ) : (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">VALID</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
