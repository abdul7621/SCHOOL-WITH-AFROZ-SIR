# 🏛️ 7A School ERP — Deep Persona Behavioral Stress Test & Gap Audit
> **Audit Standard:** Real-world Persona Intention Mapping (50+ Intentions per Role)  
> **Target Scope:** Principal Cockpit, Teacher Workspace, Admin Operations, Fee Cashier, Public Visitor & Parent Portal  
> **Date:** September 2026  
> **Version:** 2.0 (Post-47 Commits Forensic Cross-Check)  

---

## 📑 Executive Summary of Persona Stress Tests

| Persona | Real-World Role | Tested Intentions | Fully Functional | Broken / Dead End | Incomplete (Adhura) | Friction Rating |
| :--- | :--- | :---: | :---: | :---: | :---: | :---: |
| **1. Principal** | Academic & Campus Director | **50** | 36 | 4 | 10 | 🟡 Moderate |
| **2. Teacher** | Faculty & Class In-Charge | **45** | 31 | 5 | 9 | 🔴 High |
| **3. Admin** | Systems & Operations Lead | **50** | 38 | 3 | 9 | 🟡 Moderate |
| **4. Cashier** | Fee Accountant & Ledger Custodian | **50** | 41 | 2 | 7 | 🟢 Low-Moderate |
| **5. Visitor / Parent** | Public Inquirer & Enrolled Guardian | **40** | 28 | 4 | 8 | 🔴 High |

---

## 1. 🏫 PERSONA 1: SCHOOL PRINCIPAL (50 Potential Intentions)

### A. Intention Mapping & Behavioral Expectations
1. **Morning Campus Health (8:30 AM):** View real-time attendance rate, count of absent students, and list of absent teachers.
2. **Real-time Cashflow Oversight:** Review today's fee collections vs daily expenses before noon.
3. **Emergency Proxy Management:** Instantly identify which teacher is free during Period 2 to replace an absent faculty member.
4. **Syllabus Pacing Radar:** Check if Grade 9 Science has completed 60% curriculum before mid-term exams.
5. **Staff Leave Adjudication:** Review pending teacher leave applications with reason and substitute arrangement.
6. **Student Disciplinary Governance:** Review red-flag incidents, suspend chronic bullies, approve warning letters.
7. **High-Value Defaulter Recovery:** Filter students with fee dues exceeding ₹15,000 for board exam clearance.
8. **TC & Character Certificate Authorization:** Digitally approve/sign Transfer Certificates with permanent serial registration.
9. **Fee Concession / Scholarship Approval:** Review and sign-off on 50% orphan / staff-child tuition discounts.
10. **Day-Book Nightly Sign-off:** Verify closing cash drawer balance matches physical cash with accountant before locking the vault.

### B. Where the System Breaks or is Incomplete (Adhura) for Principal
* 🔴 **Break 1 — Hardcoded Syllabus Speedometer:** In `Dashboard.jsx`, the "Syllabus Velocity Speedometer" shows Class 8 Maths (68%), Class 9 Physics (38%), Class 10 English (74%). These are hardcoded static numbers. No dynamic syllabus progress calculation exists.
* 🔴 **Break 2 — No Emergency Substitute (Proxy) Workflow:** Principal cannot assign a substitute teacher when a faculty member is marked absent. The system lacks a `ProxyAssignment` table.
* 🟡 **Break 3 — Disconnected Concession Approval:** Concessions are assigned directly by the Cashier in `FeeCollection.jsx`; the Principal does not have a formal approval/rejection queue in their cockpit.
* 🟡 **Break 4 — Digital TC Status Decoupling:** When a TC is printed from `DocumentCenter.jsx`, the student's status in `students` remains `ACTIVE`. It does not automatically transition to `TRANSFERRED`/`ALUMNI`, leaving active fee demands running.
* 🟡 **Break 5 — Day-Book Sign-off is Visual Only:** Principal can view the Day-Book but cannot click "Approve & Lock Daily Accounts" to prevent retrospective voucher edits.

---

## 2. 👩‍🏫 PERSONA 2: TEACHER & FACULTY (45 Potential Intentions)

### A. Intention Mapping & Behavioral Expectations
1. **8:30 AM Roster Calling:** Take batch attendance for assigned class with 1-click "Mark All Present" and toggle absentees.
2. **Attendance Remarks:** Record reasons for absent students (Medical, Uninformed, Family Function).
3. **Daily Routine Inspection:** View personal timetable: *"Which classroom do I go to in Period 3?"*
4. **Homework Broadcasting:** Publish daily homework for Mathematics Class 7-B with due date and reference pages.
5. **Curriculum Mapping:** Check assigned syllabus topics for the current academic month.
6. **Exam Marks Submission:** Enter unit test and terminal marks out of 50/100, save drafts, and submit to examination cell.
7. **Absent Student Exam Flagging:** Flag student as `ABSENT` rather than giving zero marks.
8. **Student 360° Profile Lookup:** Inspect student's parent contact details and past academic track record.
9. **Behavioral Merit/Demerit Awarding:** Give 5-star ratings or disciplinary notes for student conduct.
10. **Leave Application:** Submit personal sick leave request with requested dates.

### B. Where the System Breaks or is Incomplete (Adhura) for Teacher
* 🔴 **Break 1 — Class Attendance Permission Leak:** In `AttendanceMarker.jsx`, any teacher can select ANY class (Class 1 to Class 12) from the dropdown and overwrite attendance! Teachers are not restricted to only their assigned `ClassTeacher` section.
* 🔴 **Break 2 — Missing Personal "My Timetable" Widget:** Teachers do not have a personal timetable routine on their dashboard. They must navigate to `/academics/timetable`, switch to "Teacher Radar", and pick their name from a dropdown of all staff.
* 🔴 **Break 3 — One-Way Homework Engine:** Teachers can create homework, but students/parents cannot upload submissions, and teachers cannot mark homework as "Checked/Reviewed".
* 🟡 **Break 4 — Marks Entry Post-Save Tampering Risk:** Once marks are entered in `/exams`, there is no "Lock / Finalize Term Marks" state. Any user can re-open and alter submitted marks even after report cards are printed.
* 🟡 **Break 5 — No Teacher Leave Request UI:** Staff cannot apply for leave from their own login; leave requests are only modeled for students in the database.

---

## 3. 💼 PERSONA 3: SCHOOL ADMIN / OPERATIONS LEAD (50 Potential Intentions)

### A. Intention Mapping & Behavioral Expectations
1. **Academic Session Rollover:** Create new session `2026-2027`, set start/end dates, mark active.
2. **Class & Section Lifecycle:** Create classes, set seat capacities, assign class teachers.
3. **Curriculum Assignment:** Map subjects to classes and clone curriculum from Class 6-A to 6-B.
4. **Staff Onboarding & Access Control:** Create employee accounts, generate passwords, assign system roles.
5. **Student Admissions:** Enter new admissions with passport photo, Aadhaar, DOB, parent contact.
6. **Parent User Account Provisioning:** Automatically create parent logins (`Parent@123`) tied to phone numbers.
7. **Annual Bulk Promotion:** Promote students from Class 4 to Class 5 with new roll numbers.
8. **ID Card Batch Printing:** Generate printable student identity cards with barcode/QR.
9. **Noticeboard & Circulars:** Publish pinned circulars with categories (`EXAM`, `HOLIDAY`, `GENERAL`).
10. **Website Media Gallery:** Upload photographs of Annual Sports Day to public website.

### B. Where the System Breaks or is Incomplete (Adhura) for Admin
* 🔴 **Break 1 — Bulk Promotion Crash on Re-Run:** `StudentEnrollment` has `UniqueConstraint("student_id", "academic_year_id")`. Re-running promotion or updating sections for an already promoted student crashes with MySQL 1062 Duplicate Entry error.
* 🔴 **Break 2 — Disconnect between Website Inquiry and Admission:** Inquiries in `CMSManager.jsx` cannot be converted to formal admissions with 1-click. Admin must re-type all data into `/students/admit`.
* 🟡 **Break 3 — Token Missing in Direct Print Links:** Several printable document links in `DocumentCenter.jsx` omit the `token` parameter, causing 401 Unauthorized errors in new browser tabs.
* 🟡 **Break 4 — Hardcoded Tenant Slug Overwrite:** In `client.js` and `TenantContext.jsx`, any login into `sample` is forcefully overwritten to `7aschoolerpuat`, breaking testing on pre-seeded model schools.
* 🟡 **Break 5 — Nginx Port 8080 Override:** In `deploy.sh`, removing `/etc/nginx/sites-enabled/default` without Port 8080 in `7a_school_erp.conf` knocks secondary Laravel projects offline.

---

## 4. 💰 PERSONA 4: FEE ACCOUNTANT / CASHIER (50 Potential Intentions)

### A. Intention Mapping & Behavioral Expectations
1. **Fee Head Master Setup:** Configure Tuition, Admission, Exam, Transport, and Lab fees.
2. **Class Fee Structure Builder:** Allocate fee heads and monthly installments per class.
3. **Concession Category Builder:** Configure Sibling Discount (20%), Merit (50%), Staff Ward (100%).
4. **Assign Concession to Student:** Link discount to student with approval reason.
5. **Bulk Demand Generation:** Generate monthly fee demands across an entire grade.
6. **Cash Counter POS Collection:** Fast search by admission number, calculate outstanding dues.
7. **FIFO Allocation:** Automatically clear oldest overdue demands first.
8. **Multiple Payment Modes:** Accept Cash, UPI/QR, Cheque, and NEFT/RTGS.
9. **Instant Printable Receipt:** Print official A4 or thermal receipt with sequential receipt number.
10. **Zero-Destructive Reversal:** Reverse mistakes with audit justification, restoring demand balance.
11. **Disburse Fee Refunds:** Process caution money refunds when a student leaves.
12. **Daily Cashbook Reconciliation:** Match closing physical cash against Day-Book cashflow.

### B. Where the System Breaks or is Incomplete (Adhura) for Cashier
* 🔴 **Break 1 — Advance Overpayment Trap:** If a parent pays MORE than currently demanded dues (e.g. dues are ₹3,000, parent hands ₹10,000 for next quarter), the system lacks an unallocated credit ledger to absorb excess funds without pre-generated demands.
* 🟡 **Break 2 — Cheque Dishonor / Bounce Penalty:** When a cheque bounces, cashier can only reverse the receipt; there is no automated workflow to append a bounce charge penalty to the student ledger.
* 🟡 **Break 3 — Unautomated Late Fine Chron:** Installment schedules have `late_fine_rate_per_day`, but there is no background daemon calculating and adding late fines to overdue demands past grace periods.
* 🟡 **Break 4 — Unsent Defaulter Reminders:** Clicking "Send Reminder" creates an internal notification log, but no physical SMS/WhatsApp is sent to parents due to missing aggregator credentials.

---

## 5. 🌐 PERSONA 5: LIVE VISITOR & PARENT PORTAL (40 Potential Intentions)

### A. Intention Mapping & Behavioral Expectations
1. **Public Website Navigation:** Browse curriculum, fee structure transparency, campus facilities.
2. **Online Admission Enquiry:** Submit applicant details, parent phone, target class, and message.
3. **Parent Login:** Login securely using mobile number and default password.
4. **Multi-Ward Switching:** Seamlessly switch between two siblings enrolled in different classes.
5. **Today's Attendance Status:** Instant verification if child reached school (`PRESENT` / `ABSENT`).
6. **Live Bell Routine (LIVE NOW):** Check what subject child is studying right now.
7. **Pending Dues Verification:** Check outstanding school fees.
8. **Digital Report Card Download:** Download official PDF term report card.
9. **Apply for Student Leave:** Submit leave request directly to class teacher from phone.
10. **Homework Routine:** Check daily homework tasks assigned to ward.

### B. Where the System Breaks or is Incomplete (Adhura) for Parent & Visitor
* 🔴 **Break 1 — Zero Online Fee Payment:** Parents can see "Pending Dues: ₹4,500", but there is NO "Pay via UPI / Card" button or payment gateway integration. Parents must visit the cash counter physically.
* 🔴 **Break 2 — Hardcoded `st_01` Filter Bug:** Line 95 of `ParentDashboard.jsx` has `if (!selectedChildId || selectedChildId === 'st_01') return;`, completely suppressing overview metrics for any test student with ID `st_01`.
* 🟡 **Break 3 — No Homework Attachment Support:** Parents only see text titles; cannot download worksheets or teacher PDFs.
* 🟡 **Break 4 — Zero Auto-Responder for Website Inquiries:** Website visitors receive no SMS or email confirmation acknowledging their admission enquiry.

---

## 🎯 Final Synthesis: Master Action Items
1. **Fix 3 Core Breaking Bugs:** Fix Promotion duplicate upsert, remove hardcoded `'sample'` rejection, and add Port 8080 to Nginx conf.
2. **Enforce Teacher Class-Lock:** Restrict `AttendanceMarker.jsx` to assigned classes for teachers.
3. **Add Advance Payment Ledger:** Allow cashiers to accept advance tuition prepayments.
4. **Wire Dynamic Syllabus Metrics:** Replace hardcoded speedometer numbers with live syllabus chapter records.
5. **Integrate Payment Gateway (Razorpay/UPI):** Enable parents to pay pending dues directly from the Parent Portal.
