# 🏫 7A SCHOOL ERP — EXHAUSTIVE END-TO-END SCHOOL LIFECYCLE & PERSONA JOURNEY BLUEPRINT

> **Standard:** Real-World Operational Intention Mapping (Day-0 Setup to Daily Operations to Annual Archival)  
> **Audited Portals:** Super Admin, School Principal, School Admin, Teacher Workspace, Fee Cashier, Parent Portal, Public Website  
> **Document Purpose:** Complete specification of every Actor, Intention, Exact Input, DB Storage, Output Rendered, Downstream Ripple Effect, and Codebase Reality / Gaps.

---

## 🧭 Master School Lifecycle Roadmap

An operational school follows a strict causal dependency chain. A school **cannot collect fees without demands**, **cannot generate demands without fee structures and admissions**, and **cannot admit students without academic sessions, classes, and sections**.

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│ PHASE 1: Day-0 SaaS Provisioning & Master Infrastructure                                │
│ (SuperAdmin provisions DB ➔ Admin configures Session, Classes, Subjects, Bell Schedule)│
└───────────────────────────────────┬────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────────────────────┐
│ PHASE 2: Staff & Teacher Onboarding                                                    │
│ (Departments ➔ Designations ➔ Staff Profiles ➔ Login Accounts ➔ Class Teacher Lock)    │
└───────────────────────────────────┬────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────────────────────┐
│ PHASE 3: Timetable & Anti-Clash Radar Scheduling                                       │
│ (Period Master ➔ Subject-Teacher-Room Matrix ➔ Collision Prevention ➔ Section Cloning) │
└───────────────────────────────────┬────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────────────────────┐
│ PHASE 4: Student Admissions & Guardian Linking                                         │
│ (Website Enquiry ➔ Admission Form ➔ Parent Profile ➔ Auto-Parent Login ➔ Roll Allocation)│
└───────────────────────────────────┬────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────────────────────┐
│ PHASE 5: Fee Architecture & Demand Rollout                                             │
│ (Fee Heads ➔ Annual Structures ➔ Installment Schedules ➔ Concessions ➔ Bulk Demands)   │
└───────────────────────────────────┬────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────────────────────┐
│ PHASE 6: Daily Campus & Counter Operations                                             │
│ (8:30 AM Attendance ➔ Timetable Pulse ➔ POS Fee Collection ➔ Homework ➔ Day-Book)     │
└───────────────────────────────────┬────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────────────────────┐
│ PHASE 7: Assessments, Annual Promotions & Certifications                               │
│ (Exam Marks ➔ Behavioral Stars ➔ Report Cards ➔ Annual Promotion ➔ Transfer TC)        │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 👑 PORTAL 1: SUPER ADMIN (SAAS CONTROL PLANE — `/superadmin`)

### Journey SA-1: Provisioning a New School Tenant from Scratch
* **Actor & Intention:** SaaS Platform Owner provisions a new client school (e.g. *Mount Mary Convent*).
* **Exact Inputs Given:**
  - School Name: `"Mount Mary High School"`
  - Tenant Slug: `"mountmary"`
  - Admin Email: `"principal@mountmary.edu"`
  - Admin Phone: `"9876543210"`
  - Primary Domain: `"mountmary.7aedu.com"`
* **Database & Storage Execution:**
  - `saas_control_db.tenants`: Inserts tenant metadata (`id, slug, db_name='tenant_mountmary_db', status='ACTIVE'`).
  - `saas_control_db.tenant_domains`: Inserts domain binding (`is_primary=True`).
  - MySQL Engine: Executes `CREATE DATABASE tenant_mountmary_db;` and runs all Alembic/DDL tables.
  - Seeds initial system lookups and default `admin` user account (`Admin123!`).
* **Output Rendered:**
  - SuperAdmin Tenant Directory shows new card: `Mount Mary High School [ACTIVE]`.
  - Display credentials badge with 1-click clipboard copy.
* **Downstream Action:** School Principal receives login credentials and begins Phase 1 setup.
* **Codebase Reality / Gap:**
  - 🟢 **Backend:** `POST /api/v1/control/tenants` is fully implemented in `TenantProvisioningService`.
  - 🟡 **Gap:** If MySQL root user lacks `CREATE DATABASE` privilege on shared DB, provisioning fails silently without rolling back control plane record.

---

## 💼 PORTAL 2: SCHOOL ADMIN (CAMPUS ARCHITECT & GOVERNANCE)

### Journey AD-1: School Identity, Branding & Letterhead Setup
* **Actor & Intention:** Admin logs into a blank school to configure institutional identity.
* **Exact Inputs Given:**
  - School Name: `"Mount Mary High School, Malad"`
  - Affiliation Board: `"CBSE Affiliation No. 2130456"`
  - Official Address: `"SV Road, Malad West, Mumbai - 400064"`
  - Phone: `"+91 22 2888 1234"`, Email: `"office@mountmary.edu"`
  - Brand Primary Color: `#1E40AF` (Navy Blue)
  - Timezone: `"Asia/Kolkata"`
* **Database & Storage Execution:**
  - `tenant_mountmary_db.system_settings`: Upserts key-value rows (`school_name`, `affiliation_board`, `school_address`, `school_timezone`, `theme_primary_color`).
* **Output Rendered:**
  - Top Navigation header updates from `"7A School ERP"` to `"Mount Mary High School"`.
  - Letterhead of printable fee receipts and TC instantly renders new name and affiliation.
* **Downstream Action:** All generated PDFs, receipts, and public website reflect institutional branding.
* **Codebase Reality / Gap:**
  - 🟢 **Working:** `PUT /api/v1/settings` and `TenantContext` handle dynamic settings.
  - 🔴 **Gap:** No image uploader for School Official Seal / Principal Signature stamp. Stamp box remains blank on printed certificates.

### Journey AD-2: Academic Year & Session Activation
* **Actor & Intention:** Admin establishes the school operational calendar.
* **Exact Inputs Given:**
  - Session Name: `"2026-2027"`
  - Start Date: `2026-04-01`
  - End Date: `2027-03-31`
  - Toggle: `is_current = True`
* **Database Execution:**
  - `academic_years`: Inserts session row. Automatically flips previous session `is_current = False`.
* **Output Rendered:**
  - Session badge `"Current: 2026-2027"` appears across Attendance, Fees POS, and Student Lists.
* **Downstream Action:** All subsequent student enrollments and fee demands are automatically tagged to this session ID.
* **Codebase Reality / Gap:**
  - 🟢 **Working:** `POST /academics/years` and `PATCH /academics/years/{id}/set-current` are fully functional.

### Journey AD-3: Grade Structure, Sections & Seat Capacity Radar
* **Actor & Intention:** Admin models the academic physical structure.
* **Exact Inputs Given:**
  - Class Name: `"Grade 5"`, Numeric Order: `5`
  - Sections: `"A"`, Capacity: `45`; `"B"`, Capacity: `45`
* **Database Execution:**
  - `classes`: Row for Grade 5.
  - `sections`: 2 rows linked to Class ID (`name='A', max_capacity=45`, `name='B', max_capacity=45`).
* **Output Rendered:**
  - Class Management card shows `Grade 5 (Sections: A, B • Capacity: 90 Seats • Enrolled: 0)`.
  - Seat Radar displays `0/90 [100% Vacant]`.
* **Downstream Action:** Admission form dropdowns and timetable matrices now populate Grade 5-A and 5-B.
* **Codebase Reality / Gap:**
  - 🟢 **Working:** `POST /academics/classes` and inline section creator work cleanly.

### Journey AD-4: Subject Catalog & Curriculum Mapping
* **Actor & Intention:** Admin configures what subjects are taught in each grade.
* **Exact Inputs Given:**
  - Step 1: Create Subjects: `"English Language"` (Code: `ENG-01`), `"Mathematics"` (Code: `MATH-01`), `"General Science"` (Code: `SCI-01`).
  - Step 2: In Grade 5 Curriculum, select checkboxes for English, Maths, Science.
* **Database Execution:**
  - `subjects`: Inserts master subject records.
  - `class_subjects`: Inserts junction rows (`class_id, subject_id`).
* **Output Rendered:**
  - Grade 5 card lists badges: `[English] [Mathematics] [Science]`.
* **Downstream Action:** Homework creation, Timetable slotting, and Exam Marks Entry for Grade 5 are strictly restricted to these 3 subjects.
* **Codebase Reality / Gap:**
  - 🟢 **Working:** `POST /academics/classes/{id}/subjects` and 1-click curriculum cloning are functional.

### Journey AD-5: Bell Schedule & Period Master Setup
* **Actor & Intention:** Admin configures the daily school timing and bells.
* **Exact Inputs Given:**
  - Period 1: `08:30` to `09:15` (Name: "First Bell")
  - Period 2: `09:15` to `10:00` (Name: "Second Bell")
  - Period 3: `10:00` to `10:30` (Name: "Short Recess", `is_break=True`)
  - Period 4: `10:30` to `11:15` (Name: "Third Bell")
* **Database Execution:**
  - `timetable_periods`: Inserts records sorted by `period_number`.
* **Output Rendered:**
  - Weekly timetable matrix renders period headers with start/end time.
  - Parent Portal "LIVE NOW" routine reads period start/end times.
* **Codebase Reality / Gap:**
  - 🟢 **Working:** `POST /academics/timetable/periods` and 6-period auto-template are functional.

---

## 👥 PORTAL 3: STAFF ONBOARDING & HR REVENUE STRUCTURE

### Journey ST-1: Staff Profile Creation & User Account Generation
* **Actor & Intention:** Admin onboards a new Senior Maths Teacher (*Mrs. Fatima Shaikh*).
* **Exact Inputs Given:**
  - First Name: `"Fatima"`, Last Name: `"Shaikh"`
  - Employee ID: `"EMP-042"`
  - Email: `"fatima.maths@mountmary.edu"`, Phone: `"9820011223"`
  - Department: `"Secondary Wing"`, Designation: `"TGT Mathematics"`
  - Role: `"TEACHER"`
  - Password: `"Teacher@123"`
* **Database Execution:**
  - `users`: Inserts login user (`username=email, password_hash=hash, user_type='STAFF'`).
  - `user_roles`: Links `user.id` to `role_id` (`TEACHER`).
  - `staff_profiles`: Inserts profile (`user_id, employee_id='EMP-042', department_id, designation_id`).
* **Output Rendered:**
  - Staff Directory displays Mrs. Fatima's profile card with status badge `ACTIVE`.
  - "Copy Login Details" button generates: `"Login: fatima.maths@mountmary.edu | Pass: Teacher@123"`.
* **Downstream Action:** Mrs. Fatima logs into her teacher workspace using these credentials.
* **Codebase Reality / Gap:**
  - 🟢 **Working:** `POST /staff` handles atomic user + profile + role creation.

### Journey ST-2: Class Teacher In-Place Assignment
* **Actor & Intention:** Admin appoints Mrs. Fatima as the primary Class Teacher of Grade 5-A.
* **Exact Inputs Given:**
  - Navigates to `Classes & Sessions ➔ Grade 5 ➔ Section A`.
  - Selects Class Teacher dropdown: `"Mrs. Fatima Shaikh (EMP-042)"`.
  - Clicks Save.
* **Database Execution:**
  - `class_teachers`: Upserts row (`academic_year_id, class_id, section_id, teacher_user_id`).
* **Output Rendered:**
  - Section A badge shows: `Class Teacher: Mrs. Fatima Shaikh`.
* **Downstream Action Expected:** When Mrs. Fatima opens Attendance, Section 5-A should auto-select and lock.
* **⚠️ Codebase Gap / Broken Link:**
  - 🔴 **CRITICAL GAP:** `AttendanceMarker.jsx` does **NOT** filter class/section by `current_user.id`! Mrs. Fatima can currently select Class 10-A or Class 1-B and mark attendance for any class in the school!

---

## 📅 PORTAL 4: TIMETABLE & CONFLICT-FREE SCHEDULING

### Journey TT-1: Slotting Weekly Periods & Anti-Clash Collision Prevention
* **Actor & Intention:** Vice Principal assigns Monday Period 1 for Grade 5-A.
* **Exact Inputs Given:**
  - Class: `Grade 5`, Section: `A`, Day: `MONDAY`, Period: `Period 1 (08:30-09:15)`
  - Subject: `Mathematics`, Teacher: `Mrs. Fatima Shaikh`, Room: `Room 102`
* **Database & Anti-Clash Verification:**
  - Query checks: Is Mrs. Fatima already slotted in another section on MONDAY Period 1?
  - Query checks: Is Room 102 already booked on MONDAY Period 1?
  - If clear, inserts into `timetable_slots`.
* **Output Rendered:**
  - Timetable cell displays: `Maths • Mrs. Fatima Shaikh • Room 102` (Blue accent).
  - If clashed: UI turns red with alert: *"Teacher Conflict: Mrs. Fatima is already assigned to Grade 8-B in Period 1!"*
* **Downstream Action:** Slot reflects in Mrs. Fatima's Radar and Parent Portal daily routine.
* **Codebase Reality / Gap:**
  - 🟢 **Working:** `POST /academics/timetable/slots` enforces strict anti-clash verification.

---

## 🎓 PORTAL 5: STUDENT ADMISSIONS & DATA MIGRATION

### Journey ADM-1: Public Website Enquiry to 1-Click Admission Conversion
* **Actor & Intention:** Parent submits inquiry on public site; Admin admits student without re-typing.
* **Inputs Given by Parent (`/website`):**
  - Applicant Name: `"Zaid Khan"`, Parent: `"Rashid Khan"`, Phone: `"9892011223"`
  - Target Grade: `"Grade 5"`, Message: `"Seeking admission for academic year 2026-27"`
* **Database Execution:** `inquiries` table receives record with status `NEW`.
* **Admin Review (`/cms`):** Admin inspects inquiry table.
* **⚠️ Codebase Gap / Broken Link:**
  - 🔴 **DISCONNECTED WORKFLOW:** There is **NO "Convert to Admission" action button** in `CMSManager.jsx`! The Admin must manually open `/students/admit` and re-type Zaid Khan, Rashid Khan, and phone number from scratch!

### Journey ADM-2: Direct Student Admission Entry & Parent Auto-Provisioning
* **Actor & Intention:** Admin completes official admission form for walk-in parent.
* **Exact Inputs Given:**
  - Student: First Name: `"Zaid"`, Last Name: `"Khan"`, DOB: `2016-07-14`, Gender: `"Male"`
  - Photo: Captured via webcam / canvas resized to 200x240 JPEG.
  - Academic Allotment: Grade `5`, Section `A`, Roll No: `12`, Session: `2026-2027`.
  - Parent Profile: Father: `"Rashid Khan"`, Primary Phone: `"9892011223"`, Address: `"Flat 402, Green Valley"`
* **Database Atomic Action (`StudentService.admit_student`):**
  1. Auto-generates sequential unique admission no: `ADM-2026-0001`.
  2. Queries `users` for phone `9892011223`. If not found, creates User (`username='9892011223', pass=Parent@123, user_type='PARENT'`).
  3. Inserts into `parents` (`user_id, father_name='Rashid Khan', primary_phone='9892011223'`).
  4. Inserts into `students` (`admission_no='ADM-2026-0001', first_name='Zaid', parent_id=parent.id`).
  5. Inserts into `student_enrollments` (`student_id, class_id, section_id, roll_no=12, is_active=True`).
* **Output Rendered:**
  - Success banner: `"Student Zaid Khan admitted successfully with Admission No: ADM-2026-0001"`.
  - Shows parent login credentials: `Phone: 9892011223 | Password: Parent@123`.
* **Downstream Action:**
  - Student appears in Class 5-A Attendance Roster, Fee Ledger, and Grade 5 roll list.
  - Mr. Rashid Khan can immediately log into Parent Portal using his mobile number.
* **Codebase Reality / Gap:**
  - 🟢 **Working:** Canvas photo compression and parent user provisioning work cleanly.

---

## 💵 PORTAL 6: FEE STRUCTURE ARCHITECTURE & DEMAND GENERATION

### Journey FEE-1: Constructing Class Fee Structures & Installments
* **Actor & Intention:** Fee Accountant configures the annual billing terms for Grade 5.
* **Exact Inputs Given:**
  - Fee Heads:
    - `Tuition Fee` (Recurring monthly: ₹2,000)
    - `Annual Development Fee` (One-time: ₹3,000)
    - `Exam Fee` (Term 1 & Term 2: ₹1,000 each)
  - Total Annual Fee: ₹28,000.
  - Installment Schedule:
    - April 2026 Installment: Due Date: `2026-04-10`, Grace Period: `10 Days`, Late Fee: `₹10/day`.
* **Database Execution:**
  - `fee_structures`, `fee_structure_items`, `fee_installment_schedules`.
* **Output Rendered:**
  - Setup tab displays Grade 5 structure card with breakdown table.
* **Status:** 🟢 **Working.**

### Journey FEE-2: Student Concession Allotment
* **Actor & Intention:** Principal grants a 20% Sibling Concession to Zaid Khan (elder brother in Grade 8).
* **Exact Inputs Given:**
  - Student: `Zaid Khan (ADM-2026-0001)`
  - Concession Type: `"Sibling Discount (20%)"`
  - Target Fee Head: `"Tuition Fee"`
  - Reason: `"Elder brother Ayan Khan in Grade 8-B"`
* **Database Execution:**
  - `student_fee_concessions`: Row created (`student_id, fee_head_id, discount_percentage=20.0`).
* **Output Rendered:**
  - In Concession Register, Zaid Khan shows `20% Tuition Waiver [APPROVED]`.
* **Downstream Action:** When monthly fee demands are rolled out, Zaid's tuition fee will compute to ₹1,600 instead of ₹2,000.
* **Status:** 🟢 **Working.**

### Journey FEE-3: Monthly Bulk Fee Demand Rollout
* **Actor & Intention:** Accountant rolls out April 2026 billing for all 45 students in Grade 5.
* **Exact Inputs Given:**
  - Class: `Grade 5`, Schedule: `April 2026 Installment`.
  - Clicks: `"Generate Demands for Class"`.
* **Database Execution (`FeeService.generate_bulk_demands`):**
  - Iterates over all 45 enrolled students.
  - Calculates gross demand minus individual student concessions.
  - Inserts 45 rows into `student_fee_demands` with `status='UNPAID'`.
* **Output Rendered:**
  - Success toast: `"45 Demands generated. Total Invoiced: ₹1,26,000"`.
  - Student fee ledgers update with outstanding dues.
* **Downstream Action:** Parent Portal now reflects `"Pending Dues: ₹2,800"`.
* **Status:** 🟢 **Working.**

---

## 🏪 PORTAL 7: DAILY CASH COUNTER (POS CASHIER)

### Journey POS-1: Cash Counter Collection (FIFO Clearance)
* **Actor & Intention:** Parent arrives at counter to pay ₹2,800 dues in Cash.
* **Exact Inputs Given:**
  - Cashier enters: `ADM-2026-0001` (Zaid Khan).
  - System loads ledger: April Tuition (₹1,600) + Annual Dev (₹1,200) = Total ₹2,800.
  - Payment Amount: `2800`, Payment Mode: `CASH`.
  - Clicks `"Collect Fee"`.
* **Database Atomic Action (`FeeService.collect_fee_payment`):**
  1. Inserts into `fee_collections` (`receipt_no='RCP-2026-0042', amount=2800, mode='CASH', status='CONFIRMED'`).
  2. FIFO Allocation: Updates both April demands `balance_amount=0.00, status='PAID'`.
  3. Inserts 2 allocation rows into `fee_collection_items`.
* **Output Rendered:**
  - Modal pops up with official printable A4/thermal receipt.
  - Cashier clicks "Print" $\rightarrow$ Handed to parent.
* **Downstream Action:**
  - Student outstanding dues immediately drop to ₹0.00.
  - Day-Book Cash in Hand automatically increments by ₹2,800.
* **Status:** 🟢 **Working.**

### Journey POS-2: Collecting Advance Tuition Prepayment (Major Gap)
* **Actor & Intention:** Parent wants to pay ₹12,000 for the entire next 6 months in advance.
* **What Happens in Current Code:**
  - Only April demands exist (₹2,800).
  - Cashier enters Amount: `12000`.
* **⚠️ Codebase Gap / Broken Link:**
  - 🔴 **CRITICAL GAP:** The FIFO engine checks demands. Since total demands are ₹2,800, the remaining ₹9,200 has **NO unallocated credit wallet / advance ledger**!
  - The payment fails or over-allocates without future demand linkage. System lacks an `advance_fee_ledgers` table.

### Journey POS-3: Receipt Reversal with Audit Justification
* **Actor & Intention:** Cashier mistakenly entered ₹28,000 instead of ₹2,800 on receipt `RCP-2026-0042`.
* **Exact Inputs Given:**
  - Navigates to Receipt Actions ➔ Clicks `"Reverse Receipt"`.
  - Enters Reason: `"Clerical typo: Extra zero entered in amount"`.
  - Clicks Confirm.
* **Database Execution:**
  - `fee_collections`: Sets `status='REVERSED', reversal_reason='Clerical typo', reversed_at=NOW()`.
  - Restores the exact unpaid balance on original `student_fee_demands`.
* **Output Rendered:**
  - Receipt displays red badge: `REVERSED`.
  - Day-Book recalculates net collections deducting the reversed ₹28,000.
* **Status:** 🟢 **Working (Zero-destructive audit compliance).**

### Journey POS-4: Consolidated Day-Book (Hisaab-Kitab) & Nightly Closing
* **Actor & Intention:** Accountant and Principal close the cash drawer at 4:30 PM.
* **Outputs Rendered (`/finance/day-book`):**
  - **Fee Collections (Inflow):** ₹42,500
  - **Other Incomes (Prospectus sale):** ₹2,000
  - **School Expenses (Electrician repair voucher):** ₹1,800
  - **Fee Refunds (Caution deposit return):** ₹5,000
  - **Closing Net Cashflow:** ₹37,700
  - **Mode Breakdown:** Cash: ₹22,000 | UPI/QR: ₹15,700.
* **Status:** 🟢 **Working (Fixed in Bug-002).**

---

## 👩‍🏫 PORTAL 8: TEACHER DAILY CLASSROOM ROUTINE

### Journey TCH-1: Morning Attendance Roster Calling (8:30 AM)
* **Actor & Intention:** Mrs. Fatima marks morning attendance for Grade 5-A.
* **Exact Inputs Given:**
  - Opens `/attendance` at 8:30 AM.
  - Selects Date: Today, Class: Grade 5, Section: A.
  - 45 students load with default `PRESENT` status.
  - Toggles Roll 7 (Aarav) to `ABSENT` and Roll 14 (Sara) to `LATE`.
  - Clicks `"Submit Attendance"`.
* **Database Execution (`AttendanceService.submit_attendance`):**
  - Inserts `attendance_sessions` (`class_id, section_id, attendance_date, marked_by_user_id`).
  - Inserts 45 rows in `student_daily_attendance` (`student_id, status_id, remarks`).
* **Output Rendered:**
  - Green banner: `"Attendance for Grade 5-A submitted successfully (43 Present, 1 Absent, 1 Late)"`.
* **Downstream Action:**
  - Principal Dashboard attendance rate dynamically updates.
  - Aarav's father logs into Parent Portal and sees `Today Attendance: ABSENT` in red.
* **Status:** 🟢 **Working (Fixed in async commit 397c6d5).**

### Journey TCH-2: Publishing Subject Homework
* **Actor & Intention:** Mrs. Fatima gives homework for Mathematics.
* **Exact Inputs Given:**
  - Class: `Grade 5`, Section: `A`, Subject: `Mathematics`.
  - Title: `"Fractions Exercise 4.2 (Q1 to Q10)"`.
  - Instructions: `"Solve all sub-questions in rough notebook. Show complete working steps."`
  - Due Date: `Tomorrow`.
* **Database Execution:** Inserts into `homework_tasks`.
* **Output Rendered:** Class homework feed lists the task with countdown timer.
* **Downstream Action:** Parent Portal displays homework alert under Maths.
* **Status:** 🟢 **Working.**

### Journey TCH-3: Exam Marks Entry & Automatic Grading
* **Actor & Intention:** Teacher enters Term 1 marks for Grade 5-A Mathematics.
* **Exact Inputs Given:**
  - Selects: Exam: `Term-1`, Class: `Grade 5`, Section: `A`, Subject: `Mathematics` (Max: 100).
  - Enters Zaid Khan: `92`, Aarav: `78`, Sara: `ABSENT` checkbox.
  - Clicks `"Save Marks"`.
* **Database Execution (`ExamService.submit_marks`):**
  - Inserts into `student_exam_marks` (`marks_obtained=92, grade_letter='A+', is_pass=True`).
  - Sara: `marks_obtained=None, is_absent=True, grade_letter='AB'`.
* **Output Rendered:** Table calculates percentage, grade letters, and pass/fail summary.
* **Downstream Action:** Official Report Card generator compiles marks into printable grade sheet.
* **Status:** 🟢 **Working.**

---

## 📱 PORTAL 9: PARENT PORTAL (GUARDIAN EXPERIENCE)

### Journey PR-1: Parent Mobile Login & Ward Synchronization
* **Actor & Intention:** Mr. Rashid Khan logs into mobile to check his son Zaid's progress.
* **Exact Inputs Given:**
  - Opens `http://187.127.176.21/login`.
  - Mode: `"School Portal"`.
  - Username: `"9892011223"`, Password: `"Parent@123"`.
* **Database Verification:**
  - Authenticates against `users` table where `user_type='PARENT'`.
  - Queries `parents` linked to this `user_id`.
  - Queries `students` where `parent_id == parent.id`.
* **Output Rendered:**
  - Automatically redirects to `/parent-portal`.
  - Header displays: `Zaid Khan | Grade 5 - Section A | Roll #12 | Adm: ADM-2026-0001`.
  - Today Attendance Badge: `PRESENT` 🟢.
  - Pending Dues: `₹0.00 [All Clear]`.
* **Status:** 🟢 **Working.**

### Journey PR-2: Live Class Routine & Period Bell Inspection
* **Actor & Intention:** Parent checks what class Zaid is attending right now at 10:45 AM.
* **Output Rendered:**
  - Daily routine lists Period 1, 2, Recess, Period 4.
  - Period 4 (10:30 - 11:15): Mathematics • Mrs. Fatima Shaikh • Room 102.
  - Green pulsing badge: `● LIVE NOW`.
* **Status:** 🟢 **Working.**

### Journey PR-3: Applying for Student Sick Leave
* **Actor & Intention:** Parent submits 2-day medical leave for Zaid.
* **Exact Inputs Given:**
  - From Date: `2026-09-23`, To Date: `2026-09-24`.
  - Reason: `"Severe fever and doctor advised rest"`.
  - Clicks `"Submit Leave Application"`.
* **Database Execution:** Inserts into `student_leaves` with status `PENDING`.
* **Output Rendered:** Leave status badge shows `PENDING APPROVAL (Orange)`.
* **Downstream Action:** Leave request immediately appears on Principal/Teacher `/attendance?tab=leaves` queue for approval.
* **Status:** 🟢 **Working.**

### Journey PR-4: Online Fee Payment (The Major Missing Link)
* **Actor & Intention:** Parent wants to pay quarterly fee from phone via UPI / GPay.
* **Current Experience:**
  - Dashboard shows: `Pending Dues: ₹2,800`.
* **⚠️ Codebase Gap / Broken Link:**
  - 🔴 **MAJOR BLOCKER:** There is **NO "Pay via UPI / Card" button**! No Razorpay, PhonePe, or payment gateway SDK is embedded. The parent must physically visit the school cashier during working hours.

---

## 🌐 PORTAL 10: PUBLIC WEBSITE & ENQUIRY PIPELINE

### Journey WEB-1: Prospective Parent Discovery to Admission Inquiry
* **Actor & Intention:** Parent searches for a school, visits website, and applies online.
* **Outputs Rendered (`/website`):**
  - Hero Banner with school photos and values.
  - Principal's Message with photograph.
  - Academic Programs (Primary, Middle, Secondary).
  - Public Circulars (Board Exam dates).
  - Online Admission Inquiry Form.
* **Parent Submits:** Name, Phone, Target Grade, Message.
* **Database:** Record stored in `inquiries`.
* **Status:** 🟢 **Working.**

---

## 🏆 PORTAL 11: END-OF-YEAR PROMOTION, CERTIFICATION & ARCHIVAL

### Journey PROM-1: Annual Bulk Student Promotion to Next Grade
* **Actor & Intention:** Admin promotes Grade 4 students to Grade 5 for session `2026-2027`.
* **Exact Inputs Given:**
  - Source: Grade 4, Section A, Session: `2025-2026`.
  - Target: Grade 5, Section A, Session: `2026-2027`.
  - Checks all 40 eligible students, sets new Roll Numbers (1 to 40).
  - Clicks `"Promote Selected Students"`.
* **Database Execution:**
  - Updates old `student_enrollments` where `academic_year='2025-2026'` to `is_active=False`.
  - Inserts new `student_enrollments` for `2026-2027` with `is_active=True`.
* **⚠️ Codebase Gap / Broken Link:**
  - 🔴 **CRITICAL DUPLICATE CRASH:** If admin runs promotion twice or re-adjusts roll numbers, `StudentEnrollment` unique constraint `(student_id, academic_year_id)` throws MySQL 1062 Duplicate Entry error and crashes! (Needs Upsert).

### Journey PROM-2: Transfer Certificate (TC) Issuance & Student Archival
* **Actor & Intention:** Student moves to another city; school issues formal Transfer Certificate.
* **Exact Inputs Given:**
  - Selects student `ADM-2026-0001`.
  - Reason: `"Father transferred to Delhi"`, Conduct: `"Good"`.
  - Clicks `"Generate Official TC"`.
* **Output Rendered:**
  - Official Gazette-standard Transfer Certificate generated with serial number, DOB in words, and conduct certificate.
* **⚠️ Codebase Gap / Broken Link:**
  - 🟡 **GAP:** Student's status in `students` table is **not automatically marked as `TRANSFERRED`**. Student remains `ACTIVE`, continuing to appear in attendance rosters and fee demand runs.

---

## 🎯 Master Architecture Gap Summary & Action Matrix

| Area | Module | Exact Gap / Friction in Current Code | Priority | Solution |
| :---: | :--- | :--- | :---: | :--- |
| **Admin** | Promotion | `promote_students_bulk` crashes on re-promotion due to duplicate key | 🔴 P0 | Implement DB upsert on `uk_student_year_enrollment` |
| **Teacher** | Attendance | Teacher can select and alter ANY class attendance | 🔴 P0 | Filter class list by logged-in `ClassTeacher` assignment |
| **Parent** | Fee Payment | Parent Portal displays dues but lacks Online UPI Payment | 🔴 P1 | Integrate Razorpay / Cashfree / UPI Gateway SDK |
| **Cashier** | Fees POS | Cashier cannot accept advance tuition without existing demand | 🔴 P1 | Implement `advance_fee_ledgers` credit wallet |
| **Principal** | Dashboard | Syllabus completion % is hardcoded (68%, 38%, 74%) | 🟡 P2 | Query dynamic chapter completion from curriculum table |
| **Admin** | Inquiries | Website inquiry has no 1-click "Convert to Admission" | 🟡 P2 | Add 1-click modal pre-populating `/students/admit` |
| **Documents**| TC Vault | Issuing TC does not auto-set student status to `TRANSFERRED` | 🟡 P2 | Add atomic status update on document issuance |
| **Deploy** | Nginx | `deploy.sh` deletes Port 8080 Laravel server block | 🔴 P0 | Preserve Port 8080 block in `7a_school_erp.conf` |
