# 7A SCHOOL ERP — CUSTOMER USER ACCEPTANCE TESTING (UAT) SCRIPT
**Intended For:** Afroz Sir, School Principal, Accounts Incharge & Management Committee  
**System URL:** `http://187.127.176.21` (Hostinger Production VPS)  
**Test Instructions:** Follow each numbered step. Check the box [ ] upon successful visual and functional verification. Sign off at the bottom of the document upon completion.

---

## Phase 1: School Identity & System Setup
- [ ] **Step 1.1 — Administrative Login:** Navigate to `/login`. Sign in using `admin@school.com` / `AdminPass123!`. Confirm redirection to Dashboard.
- [ ] **Step 1.2 — School Profile Setup:** Go to `Settings -> School Profile`. Update School Name, Affiliation Number, Contact Phone, and Address. Click Save. Confirm top navigation header displays the updated school name.
- [ ] **Step 1.3 — Academic Session Master:** Go to `Settings -> Academic Sessions`. Verify active session `2026-2027` is marked with a green `ACTIVE` badge.
- [ ] **Step 1.4 — User Management:** Go to `Settings -> User Management`. Create a new test teacher account. Verify the teacher appears in the user list with role `TEACHER`.

---

## Phase 2: Academic Structure & Teacher Workloads
- [ ] **Step 2.1 — Classes & Sections:** Go to `Academics -> Classes & Sections`. Verify list of classes (Grade 1 to 10) and sections (A, B).
- [ ] **Step 2.2 — Subject Master:** Go to `Academics -> Subjects`. Verify subjects (English, Urdu, Mathematics, Science, Social Studies, Islamic Studies).
- [ ] **Step 2.3 — Weekly Timetable:** Go to `Academics -> Timetable`. Select Grade 10-A. Verify periods (1 to 7) are scheduled with assigned subject teachers.
- [ ] **Step 2.4 — Teacher Workload:** Go to `Staff -> Staff Workload`. Confirm that teaching hours per week are calculated without period clashes.

---

## Phase 3: Student Enrollment & 360° Profile
- [ ] **Step 3.1 — New Admission:** Go to `Students -> Student Admission`. Fill out test admission for student:
  - First Name: *Zubair*, Last Name: *Khan*
  - Class: *Grade 9-A*, Gender: *Male*, DOB: *2011-05-12*
  - Father's Name: *Farooq Khan*, Mobile: *9876543210*
  - Click Submit. Verify system assigns unique Admission No (`ADM-YYYY-XXXX`).
- [ ] **Step 3.2 — Student Directory Filter:** Go to `Students -> Student Directory`. Filter by Class `Grade 9-A`. Confirm Zubair Khan appears in the list.
- [ ] **Step 3.3 — Student 360° Drawer:** Click on Zubair Khan's row. Verify right drawer slides open with 6 tabs:
  - [ ] Tab 1 (Personal & Family): Shows Farooq Khan and contact details.
  - [ ] Tab 2 (Attendance): Shows 100% presence calendar.
  - [ ] Tab 3 (Fee Ledger): Displays demanded, paid, and net balance dues.
  - [ ] Tab 4 (Academics): Displays GPA and exam performance cards.
  - [ ] Tab 5 (Documents): Contains quick-print triggers for TC, ID Card, and Fee Card.
  - [ ] Tab 6 (Conduct): Displays disciplinary and awards history.

---

## Phase 4: Daily Attendance & Leave Management
- [ ] **Step 4.1 — Batch Student Attendance:** Go to `Attendance -> Student Attendance`. Select Grade 9-A. Click "Mark All Present". Mark 1 student Absent. Click Save. Confirm status badge updates.
- [ ] **Step 4.2 — Attendance Defaulters:** Click "Defaulters" tab. Confirm students with attendance < 75% are highlighted with warning indicators.
- [ ] **Step 4.3 — Staff Attendance Register:** Go to `Staff Attendance -> Daily Attendance`. Verify punch-in status and late arrivals.
- [ ] **Step 4.4 — Staff Leave Approval:** Go to `Staff Attendance -> Leave Requests`. Inspect pending leave application. Click "Approve". Confirm leave balance automatically deducts.

---

## Phase 5: Fee Lifecycle & Counter Collection (PDF 3)
- [ ] **Step 5.1 — Fee Categories:** Go to `Fees -> Fee Categories`. Verify heads: Tuition Fee, Exam Fee, Lab Charges, Transport, and Caution Deposit.
- [ ] **Step 5.2 — 50% Concession Allocation:** Go to `Fees -> Concessions`. Assign a 50% Tuition Concession to a student. Confirm approval status.
- [ ] **Step 5.3 — Demand Generation:** Go to `Fees -> Fee Demands`. Generate batch demands for Grade 9. Verify concession student receives discounted net bill.
- [ ] **Step 5.4 — Cashier Collection & FIFO:** Go to `Fees -> Fee Collection`. Search student with multiple unpaid installments. Enter partial payment amount. Confirm FIFO engine allocates payment to oldest month first.
- [ ] **Step 5.5 — Dual Counterfoil Receipt:** Click "Collect & Print Receipt". Verify popup modal renders **Parent Copy** on the left and **Office Copy** on the right.
- [ ] **Step 5.6 — Receipt Reversal (Anti-Fraud):** Click "Reverse Receipt" on a recent payment. Enter reason: *"UAT Testing Cancellation"*. Confirm receipt status changes to CANCELLED and demand re-opens.
- [ ] **Step 5.7 — Fee Refund Disbursement:** Disburse a ₹1,000 security deposit refund. Confirm official refund voucher generates with signature block.

---

## Phase 6: Daily Day-Book Reconciliation (Hisaab-Kitab)
- [ ] **Step 6.1 — Open Daily Day-Book:** Go to `Finance -> Daily Day-Book`. Select today's date.
- [ ] **Step 6.2 — Verify Inflows:** Confirm Total Fee Collections and Petty Incomes match receipts.
- [ ] **Step 6.3 — Verify Outflows:** Confirm Total Fee Refunds and Petty Expenses are deducted.
- [ ] **Step 6.4 — Verify Net Daily Cashflow:** Confirm Net Cashflow card exactly equals cash in the register. Click "Print Day-Book" to generate principal sign-off sheet.

---

## Phase 7: Examinations & Progress Report Cards
- [ ] **Step 7.1 — Marks Entry Spreadsheet:** Go to `Exams -> Marks Entry`. Select Mid-Term Exam, Grade 9-A, Mathematics. Enter marks for 5 students. Try entering `105/100` — confirm error alert. Enter `92/100` — confirm Grade `A+`.
- [ ] **Step 7.2 — Report Card Generation:** Go to `Exams -> Report Cards`. Select a student. Click "Generate Report Card". Confirm board-compliant progress card renders with marks, percentage, grade, and attendance.

---

## Phase 8: Document Center (Statutory School Documents)
- [ ] **Step 8.1 — Transfer Certificate (TC):** Go to `Documents -> Document Center`. Card 1: Select student, select Reason for Leaving: *"Relocating to another city"*, Conduct: *"EXCELLENT"*. Click "Generate Official TC Preview". Verify formal layout with school seal.
- [ ] **Step 8.2 — Batch CR-80 ID Cards:** Card 2: Select Grade 9-A. Click "Generate Printable ID Cards Sheet". Confirm high-res CR-80 card grid with photo boxes and barcodes.
- [ ] **Step 8.3 — Student Cumulative Fee Card:** Card 3: Select student. Click "Generate Printable Fee Card". Confirm complete financial statement of account generates.

---

## Phase 9: Parent Portal (Mobile Experience)
- [ ] **Step 9.1 — Mobile Login:** Open smartphone browser to `http://187.127.176.21/parent/login`. Sign in with parent mobile number.
- [ ] **Step 9.2 — Multi-Ward Selector:** Toggle between Ward 1 and Ward 2. Verify all dashboard metrics refresh immediately.
- [ ] **Step 9.3 — Fee Dues & Payment:** Inspect pending fees. Click "Pay Online". Verify simulated payment gateway receipt.
- [ ] **Step 9.4 — Digital Report Card:** Open Report Card tab. Confirm student marksheet renders clearly on mobile screen.

---

## Phase 10: Public Website & Dynamic CMS Manager
- [ ] **Step 10.1 — Public Website:** Open `http://187.127.176.21/public`. Verify responsive layout, admissions banner, and facilities section.
- [ ] **Step 10.2 — CMS Manager:** Login as Admin, go to `CMS -> CMS Manager`. Edit Principal's Message text. Return to `/public` and confirm updated text renders immediately.
- [ ] **Step 10.3 — Admission Enquiry:** On the public page, click "Enquire Now". Submit parent and student details. Confirm enquiry appears in Admin Dashboard.

---

## UAT Sign-Off Certificate

| Stakeholder Role | Name | Signature | Date |
| :--- | :--- | :--- | :--- |
| **Project Lead / Client Representative** | Afroz Sir | ____________________ | ____ / ____ / 2026 |
| **School Principal** | ____________________ | ____________________ | ____ / ____ / 2026 |
| **Head Accountant** | ____________________ | ____________________ | ____ / ____ / 2026 |
| **Lead Auditor (7A Digital Solution)** | Antigravity Core Lead | ____________________ | 06 / 09 / 2026 |
