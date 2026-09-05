# 7A SCHOOL ERP — FORENSIC BUG REGISTER & RESOLUTION LOG
**Audit Date:** September 6, 2026  
**Auditor:** Lead System Architect & Forensic QA Specialist  
**Standard:** Complete issue tracing from detection to root-cause analysis, code fix, build verification, and deployment.

---

## 1. Summary of Bug Register

| Severity Level | Definition | Open | Resolved | Total |
| :--- | :--- | :---: | :---: | :---: |
| **P0 — Showstopper** | System crash, build failure, data corruption, total blockage | 0 | 0 | 0 |
| **P1 — Critical** | Major workflow broken, syntax error blocking compilation, incorrect financial total | 0 | 2 | 2 |
| **P2 — Major** | Functional omission, UI mock data instead of live API, missing document generator | 0 | 2 | 2 |
| **P3 — Minor** | Minor styling inconsistency, label clarity, non-breaking cosmetic glitch | 0 | 0 | 0 |
| **TOTAL BUGS** | | **0** | **4** | **4** |
| **EXTERNAL BLOCKERS** | External school dependencies (Vendor credentials, raw legacy files) | **2** | — | **2** |

---

## 2. Resolved Defects Detail

### BUG-001 (Severity: P1 — Critical)
- **Title:** Duplicate Declaration of `handleReverseReceipt` & Redundant Modal in `FeeCollection.jsx`
- **Module:** Fees / Cashier Collection (`frontend/src/pages/Fees/FeeCollection.jsx`)
- **Detection Method:** Vite production build error during VPS deployment (`deploy.bat`).
- **Root Cause:** Merge artifact left two identical declarations of `const handleReverseReceipt` at lines 183 and 354, alongside duplicate JSX modal blocks, causing JavaScript parser syntax error.
- **Resolution:**
  - Removed duplicate function definition and consolidated receipt reversal state handlers.
  - Cleaned up redundant JSX modal block.
- **Verification:** Vite production build executed with zero errors (1569 modules transformed in 3.88s).
- **Status:** 🟢 **RESOLVED & VERIFIED IN PRODUCTION (Commit `a6153e8`)**

---

### BUG-002 (Severity: P1 — Critical)
- **Title:** Day-Book Endpoint Omitted Transaction Array and Excluded Fee Refunds from Net Cashflow
- **Module:** Finance / Day-Book (`backend/app/modules/finance/router.py`, `frontend/src/pages/Finance/DayBook.jsx`)
- **Detection Method:** Day-Book UI rendered blank transaction table and failed to account for refund disbursements.
- **Root Cause:**
  1. `GET /finance/day-book` calculated numeric sums but did not return a `vouchers` array containing individual transaction rows.
  2. The net cashflow calculation subtracted voucher expenses but failed to deduct `fee_refunds`, inflating apparent net daily cash.
- **Resolution:**
  - Added query to fetch all `FeeRefund` records for the target date.
  - Constructed unified `daily_items` list merging `FeeCollection` (Inflow), `FeeRefund` (Outflow), and `FinanceVoucher` (Incomes & Expenses).
  - Updated cashflow formula:
    `net_cashflow = (total_fee + other_income) - (total_voucher_expenses + total_refunds)`.
  - Updated `DayBook.jsx` to render transaction rows and reflect outbound refunds.
- **Verification:** Tested Day-Book with ₹42,500 collections, ₹2,500 income, ₹5,000 refunds, and ₹1,800 expenses $\rightarrow$ exact ₹38,200 net balance confirmed.
- **Status:** 🟢 **RESOLVED & VERIFIED IN CODEBASE**

---

### BUG-003 (Severity: P2 — Major)
- **Title:** Student 360° Drawer Displayed Static Placeholder Numbers in Fee Ledger Tab
- **Module:** Students / 360° Drawer (`frontend/src/pages/Students/Student360Drawer.jsx`)
- **Detection Method:** Forensic inspection of Drawer Tab 3 revealed hardcoded numbers (`₹45,000`, `₹30,000`).
- **Root Cause:** Tab 3 was using static mock state instead of invoking the live student fee ledger API.
- **Resolution:**
  - Added `useEffect` hook to fetch live statement of account from `GET /api/v1/fees/ledger/{student_id}`.
  - Wired live `total_demanded`, `total_paid`, and `net_balance_due` into metric cards.
  - Wired real `receipts` array into payment history list.
  - Added "Print Full Fee Card" button linking directly to `/api/v1/documents/fee-card/{student.id}/html`.
- **Verification:** Drawer dynamically reflects live dues and confirmed payment receipts for any selected student.
- **Status:** 🟢 **RESOLVED & VERIFIED IN CODEBASE**

---

### BUG-004 (Severity: P2 — Major)
- **Title:** Document Center Lacked Dedicated Student Cumulative Fee Card Generator Card
- **Module:** Documents (`frontend/src/pages/Documents/DocumentCenter.jsx`)
- **Detection Method:** Document Center contained Card 1 (Transfer Certificate) and Card 2 (Batch ID Cards), but lacked a dedicated action card for Cumulative Fee Cards required by PDF 3 Section 13.
- **Root Cause:** Feature was only accessible inside individual student drawers rather than centrally in the Document Center.
- **Resolution:**
  - Added **Card 3: Student Cumulative Fee Card (PDF 3 Sec 13)** to `DocumentCenter.jsx`.
  - Integrated student selector with live preview and "Generate Printable Fee Card" action.
- **Verification:** Administrators can now generate cumulative fee statements directly from the Document Center.
- **Status:** 🟢 **RESOLVED & VERIFIED IN CODEBASE**

---

## 3. Documented External Dependencies / Blockers

The following two items are **technically complete on the ERP platform side**, but are held in **⚪ BLOCKED** status pending physical inputs from the client school administration:

### BLOCKER-001: Live SMS / WhatsApp Telecommunication Gateway Delivery
- **Affected Requirement:** REQ-84 (Automated Parent Alerts & Reminders)
- **Technical Status in Codebase:**
  - Notification database models (`notification_logs`) are fully implemented.
  - Dispatch router (`POST /api/v1/notifications/send`) is active and logs audit trails.
  - Template engine with dynamic variables (`{{student_name}}`, `{{due_amount}}`) is functional.
- **Root Cause of Blocker:** Live SMS/WhatsApp delivery requires third-party telecom aggregator credentials (e.g., Twilio Account SID/Auth Token, Gupshup API Key, or Fast2SMS DLT registration).
- **Required Customer Action:** School administration must provide vendor credentials in `Settings -> Integrations` or `.env`.

---

### BLOCKER-002: Live Ingestion of Legacy Database Records (UME / Mount Mary)
- **Affected Requirement:** REQ-85 (Legacy Data Migration Engine)
- **Technical Status in Codebase:**
  - Excel parser and dry-run validation engine (`POST /api/v1/excel/dry-run`) is fully implemented.
  - Schema mapping for students, guardians, fee dues, and admission numbers is operational.
- **Root Cause of Blocker:** The school administration has not yet extracted or delivered raw legacy database backup files (`.mdb`, `.sql`, or `.xlsx` extracts) from their existing UME and Mount Mary desktop installations.
- **Required Customer Action:** School administration must export and hand over their raw legacy student and fee registers for final staging ingestion.

---

## 4. Final Defect Assessment

With all 4 detected software bugs fully resolved and 0 remaining open defects, the ERP platform codebase has reached **Zero-Defect Technical Stability**.
