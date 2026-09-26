# 🏛️ 7A School ERP — Institutional Operating System Blueprint
## Complete Architecture: 9-Point Habit Tracking, Recognition Engine, Principal Cockpit, & Government Compliance Portals

---

## 📑 Table of Contents
1. [Executive Summary & Strategic Vision](#1-executive-summary--strategic-vision)
2. [Module 1: 9-Point Habit & Behavior Scoring Engine](#2-module-1-9-point-habit--behavior-scoring-engine)
3. [Module 2: Automated Awards & Recognition Engine](#3-module-2-automated-awards--recognition-engine)
4. [Module 3: "Tomorrow's Learning" Parent Dispatch Engine](#4-module-3-tomorrows-learning-parent-dispatch-engine)
5. [Module 4: Principal & Management Monitoring Cockpit (PMR)](#5-module-4-principal--management-monitoring-cockpit-pmr)
6. [Module 5: Fee Follow-Up, Targets & Defaulters Recovery Engine](#6-module-5-fee-follow-up-targets--defaulters-recovery-engine)
7. [Module 6: Government Compliance Portals & The Statutory G.R. Register](#7-module-6-government-compliance-portals--the-statutory-gr-register)
8. [Module 7: Dynamic Multi-School & Multi-Tenant Customization](#8-module-7-dynamic-multi-school--multi-tenant-customization)
9. [Detailed Technical Architecture & Data Schemas](#9-detailed-technical-architecture--data-schemas)
10. [Step-by-Step Implementation Roadmap](#10-step-by-step-implementation-roadmap)

---

## 1. Executive Summary & Strategic Vision

Most school ERPs on the market (such as Fedena, Eduflex, or SchoolMint) fail in low-to-mid fee private schools and trust-run schools (like UME Welfare Trust) because they act merely as passive digital filing cabinets. 

**7A School ERP's transformation** turns the system into an **Active Behavioral & Institutional Driver**:
- **Daily Discipline & Habit Building**: Tracking not just attendance, but 9 foundational character habits in 60 seconds per class.
- **High-Prestige Recognition**: Automatic award calculation (Weekly Star Student, Homework Hero, Maximum Attendance, Super Helper) rendered directly into the school's official decorative certificate templates (`media_1790067664931.jpg` - `media_1790067665006.jpg`).
- **Parent Alignment**: Replacing chaotic WhatsApp messages with structured **"Tomorrow's Learning"** dispatches so parents prepare their children the night before.
- **Administrative Transparency**: Empowering the Principal with a Weekly Monitoring Report (PMR), notebook correction audits, and an executive Action Tracker.
- **Statutory Compliance Without Headaches**: Delivering a true statutory General Register (G.R.) matching Gujarat Gazette standards (`media_1790068035347.jpg`) alongside UDISE+ and SSA auto-fill tools.

---

## 2. Module 1: 9-Point Habit & Behavior Scoring Engine

### 2.1 The 9 Daily Core Habits
Every morning during homeroom or first period, each student is evaluated across 9 objective habits:

| # | Habit Dimension | Code | Meaning & Criteria | Default State |
|---|-----------------|------|-------------------|---------------|
| 1 | **Attendance** | `ATTENDANCE` | Present in school (Absent = 0 pts for all points) | Present (1) |
| 2 | **Punctuality** | `PUNCTUALITY` | Arrived before assembly bell / school gate closure | On-Time (1) |
| 3 | **Uniform & Grooming** | `UNIFORM` | Proper clean uniform, black/white shoes, trimmed nails/hair, ID card | Compliant (1) |
| 4 | **Learning Materials** | `MATERIAL` | Brought required textbooks, notebooks, geometry/stationery kit | Complete (1) |
| 5 | **Homework Completion** | `HOMEWORK` | Finished previous day's homework completely with parent initials | Done (1) |
| 6 | **Classwork Engagement** | `CLASSWORK` | Active participation in class, completed exercises in workbooks | Active (1) |
| 7 | **Healthy Lunch Box** | `HEALTHY_LUNCH` | Nutritious home-cooked tiffin (No packaged chips, kurkure, sodas) | Healthy (1) |
| 8 | **Discipline & Moral Values**| `DISCIPLINE` | Respectful to peers/teachers, no foul language, queue discipline | Well-behaved (1) |
| 9 | **Neatness & Hygiene** | `NEATNESS` | Tidy school bag, clean desk area, washed hands after break | Clean (1) |

### 2.2 Teacher 60-Second "Exception-Only" Fast Grid
- **The Problem**: If a teacher has to click 9 buttons for 45 students, that is $45 \times 9 = 405$ clicks! Teachers will boycott the system.
- **The Solution**: **Exception-based Marking**:
  - The UI starts with **ALL STUDENTS AT 9/9 (ALL GREEN)**.
  - Teacher only taps on the specific icon of a student who failed that habit today (e.g., student forgot homework $\rightarrow$ tap 1 icon $\rightarrow$ turns red, score becomes 8/9).
  - Average time spent per class: **Under 60 seconds**.

### 2.3 Mathematical Aggregation & Radar Heatmaps
- **Daily Score**: $S_d = \sum_{i=1}^{9} H_i \quad (0 \le S_d \le 9)$
- **Weekly Student Average**: 
  $$W_{\text{avg}} = \frac{\sum_{d=1}^{N} S_d}{9 \times N} \times 100\%$$
- **Class Habit Index**:
  $$\text{CHI}_{\text{habit}} = \frac{\text{Total Positive Marks in Habit across Class}}{\text{Total Students} \times N} \times 100\%$$
- **Principal Habit Radar**:
  A visual heatmap on the Principal's dashboard highlights systemic gaps. For instance:
  - *Class 8-B Homework Completion*: **52% (Red Alert)**
  - *Class 4-A Healthy Lunch*: **94% (High Performer)**

---

## 3. Module 2: Automated Awards & Recognition Engine

### 3.1 Scarcity & High-Prestige Formula
Awards lose all psychological value if handed out to everyone. The ERP enforces **strictly limited quotas**:

```
+------------------------------------------------------------------------------------+
|                                RECOGNITION TIERS                                   |
+------------------------------------------------------------------------------------+
| 1. WEEKLY RECOGNITION (1-2 Students per section per category)                     |
|    - ⭐ Star Student of the Week                                                   |
|    - 📚 Homework Hero                                                             |
|    - ⏰ Maximum Attendance of the Week                                             |
|    - 🤝 Super Helper / 9-Point Role Model                                          |
+------------------------------------------------------------------------------------+
| 2. MONTHLY CITATIONS (Conferred on 1st of every month)                             |
|    - Best Attendance Award (Section & School-wide)                                 |
|    - Best Discipline & Character Award                                             |
|    - Academic Excellence & Homework Master                                         |
|    - Most Improved Student Award (Highest positive delta in 9-point score)         |
|    - 🏆 Best Class of the Month (Rotating School Banner for Morning Assembly)      |
+------------------------------------------------------------------------------------+
| 3. ANNUAL PRESTIGE TROPHIES (Conferred on Annual Day)                              |
|    - 🏆 All-Rounder of the Year                                                    |
|    - 🏆 Academic Dux / Topper                                                      |
|    - 🏆 100% Attendance Pillar                                                     |
|    - 🏆 9-Point Hall of Fame                                                       |
+------------------------------------------------------------------------------------+
```

### 3.2 Visual Graphic Rendering Engine (UME Welfare Trust Templates)
The ERP includes a high-resolution canvas/SVG-to-PDF compositor that uses the school's official graphical certificate frames:

| Certificate Frame Asset | Award Category | Auto-Nomination Rule |
|-------------------------|----------------|----------------------|
| `media_1790067664945.jpg` | **Star Student of the Week** | Highest weekly 9-point score + zero disciplinary incidents |
| `media_1790067664931.jpg` | **Homework Hero** | 100% Homework & Classwork points for the full week |
| `media_1790067664959.jpg` | **Maximum Attendance of the Week** | 100% Attendance + 100% Punctuality |
| `media_1790067665006.jpg` | **Super Helper** | Nominated by class teacher for peer support & cleanliness |

**Compositor Pipeline**:
1. High-resolution background frame loaded.
2. Dynamic typography overlaid (Student Name, Class & Section, Academic Year, Date, Award Badge).
3. Principal's digital signature and official school stamp applied.
4. Unique cryptographic verification QR code embedded at bottom-right.
5. Instant 1-click batch PDF print for Friday assembly + automatic WhatsApp message with PDF download link sent to parents.

---

## 4. Module 3: "Tomorrow's Learning" Parent Dispatch Engine

### 4.1 Proactive Learning vs. Homework
- **Traditional ERP Mistake**: Only sending homework late at night.
- **The "Tomorrow's Learning" Revolution**:
  - Educating parents on **what will be taught tomorrow**.
  - Allows illiterate or semi-literate parents to support their children by ensuring books, project supplies, or advance reading are prepared.

### 4.2 The Daily 3:00 PM – 5:00 PM Workflow
1. **Teacher Entry**: During daily *Focus Time*, subject teachers enter next day's objectives (takes 90 seconds per subject):
   - *Class 5 Science*: Chapter 6 "Parts of a Plant". Please bring a fresh green hibiscus or rose leaf.
   - *Class 5 Math*: Exercise 4.2 "Fractions". Ensure geometry ruler and pencil are in pouch.
2. **5:30 PM Parent Dispatch**:
   - The ERP compiles all subjects into a single, clean WhatsApp digest and Parent Portal card.
   - Eliminates 20 separate WhatsApp group messages from different teachers.

---

## 5. Module 4: Principal & Management Monitoring Cockpit (PMR)

### 5.1 Weekly Principal Monitoring Report (PMR)
Every Saturday afternoon, the system compiles the institutional scorecard:
1. **Student Attendance Velocity**: Weekly % compared against previous 4 weeks.
2. **Staff Punctuality & Leave Impact**: Teachers on leave, proxy classes arranged.
3. **Fee Target vs. Collection**: This week's collection vs. weekly target.
4. **Syllabus Progress Tracker**: Chapters completed vs. planned curriculum calendar.
5. **Notebook Correction Compliance %**: Random audit results across teachers.
6. **Habit Health Index**: School-wide 9-point habit compliance rate.

### 5.2 Executive Action Tracker
- Solves the problem of forgotten instructions from meetings:
  - Principal logs: `Issue` $\rightarrow$ `Assigned Staff` $\rightarrow$ `Deadline` $\rightarrow$ `Severity`.
  - Example: *"Class 9-A Science Lab gas pipe repair"* $\rightarrow$ Assigned to Admin Supervisor $\rightarrow$ Deadline: Thursday 4:00 PM.
  - Automated WhatsApp alerts sent to assignee 24 hours before deadline.
  - Items not closed change to **`OVERDUE (RED)`** on the Principal's dashboard and require an explanation note.

### 5.3 Notebook / Workbook Correction Tracker
- **Quality Audit Sampling**: Principal or Academic Coordinator randomly picks 5 notebooks per section weekly.
- **Scored Rubric (0 to 10 each)**:
  1. Index properly maintained?
  2. Date written on every assignment?
  3. Red pen correction done by teacher?
  4. Spelling mistakes circled and student made to rewrite 3 times?
  5. Teacher signature & date present?
- Aggregated Teacher Quality Index displayed on Principal cockpit.

### 5.4 Daily 1-Hour Staff Focus Time
- System enforces a protected non-teaching period (e.g., 2:30 PM to 3:30 PM).
- No parent walk-ins or non-urgent meetings allowed during this hour.
- Teachers complete their daily checklist:
  - [x] Class attendance & 9-point habit misses marked
  - [x] Today's homework logged
  - [x] Tomorrow's learning dispatched
  - [x] 5 student notebooks corrected

---

## 6. Module 5: Fee Follow-Up, Targets & Defaulters Recovery Engine

### 6.1 Target vs. Actual Collection Cockpit
- Trust/Management sets monthly targets (e.g., ₹6,00,000 for September).
- Real-time gauge showing: `Collected So Far`, `Current Pace Projected`, `Overdue Gap`.

### 6.2 Defaulter Aging & Recovery Pipeline

```mermaid
graph LR
    A["Bucket 1 (1-15 Days)"] -->|Gentle Reminder| B["Bucket 2 (16-30 Days)"]
    B -->|Tele-Calling Log| C["Bucket 3 (31-60 Days)"]
    C -->|PTP Tracking| D["Bucket 4 (60+ Days)"]
    D -->|Principal Interview / Trust Relief| E["Case Resolved"]
```

1. **Bucket 1 (1 - 15 Days Overdue)**: Automated polite WhatsApp message with instant UPI / Netbanking payment link.
2. **Bucket 2 (16 - 30 Days Overdue)**: Accounts clerk calling queue. Clerk logs: *Call Answered / Promised to pay on 10th / Switched off*.
3. **Bucket 3 (31 - 60 Days Overdue)**: **Promise-to-Pay (PTP) Tracker**. If parent promised 15th September, system pauses alerts until 15th. If unpaid on 16th, automatic escalation alert triggers.
4. **Bucket 4 (60+ Days Overdue)**: Case flagged for Trust Management review for Zakat / Charity fee subsidy or meeting with Principal.

### 6.3 Physical Fee Receipt Slip Generator (`media_1790068795318.jpg`)
Schools require paper/thermal slip receipts for cash and counter payments:
- **Receipt Prefix Sequencing**: Dynamic prefix per medium/wing (e.g. `PE/427` for Primary English, `PG/` for Primary Gujarati, `SE/` for Secondary English).
- **Header Structure**: School Branding, Address, Trust registration, Phone, Section (`PRIMARY (English) (PE)`), `School Copy` / `Parent Copy`.
- **Student Data**: Student Full Name, Std, Div, GR No, Period (e.g. `Jun - Aug`), Year (`2026-27`), Payment Mode (`Cash`, `UPI`, `Cheque`, `Bank Transfer`).
- **Fees Ledger**: Itemized break-up (`Education Fee: ₹3750.00`).
- **Total Amount**: Displayed in figures and statutory legal words (`THREE THOUSAND SEVEN HUNDRED FIFTY RUPEES ONLY`).
- **Cashier Signature & Verification**: Received By name, digital signature, and official school stamp.
- **Customizable Statutory Terms & Conditions**: Multilingual terms printed at footer (e.g. "Fees timing 9:00 AM to 1:00 PM", "Fees not transferable", "Cheque subject to realization").

### 6.4 Physical 2-Sided Student Fee Card Engine (`media_1790068814363.jpg` & `media_1790068822438.jpg`)
Every student receives a physical pocket Fee Card at the start of the academic year:
- **Front Face (`media_1790068822438.jpg`)**:
  - School Logo & Trust Name (e.g., `UME WELFARE TRUST / UME SCHOOL`).
  - School Address & Official Phone Numbers (`+91 910 600 3604 / +91 704 128 6032`).
  - Medium Checkboxes (`[ ] ENGLISH MEDIUM`, `[ ] GUJARATI MEDIUM`).
  - Section Checkboxes (`[ ] PRE-PRIMARY`, `[ ] PRIMARY`, `[ ] SECONDARY`).
  - Card Box: `Academic Year`, `Student Name`, `Mobile No.`, `Std`, `Division`, `G.R. No.`.
  - Multilingual Guidelines Box (in Hindi/Gujarati/English):
    *(1) Jab bhi fees jama karne aayen to Fee Card saath layen.*
    *(2) June, September, November aur January mahine ki 10 tareekh tak fees ke installment jama karayein.*
    *(3) Diye gaye waqt par fees jama karna zaroori hai.*
    *(4) Fees bharne ka samay: Subah 9:00 baje se 1:30 baje tak.*
- **Back Face (`media_1790068814363.jpg`) — Installment Grid**:
  - **The 4 Statutory Installments**:
    1. 🟢 `JUNE 1 TO 10 / 1ST INSTALMENT`
    2. 🌸 `SEPT. 1 TO 10 / 2ND INSTALMENT`
    3. 🟤 `NOV. 1 TO 10 / 3RD INSTALMENT`
    4. 🔵 `JAN. 1 TO 10 / 4TH INSTALMENT`
  - **Grid Row Columns**:
    - `INSTALMENT`
    - `PAY DATE`
    - `AMOUNT`
    - `RECEIPT NO.`
    - `CASHIER SIGN.`
- **Maximum Dynamic Rule**:
  - While UME Trust uses 4 quarterly installments (June, Sept, Nov, Jan), the engine is **100% dynamically configurable per tenant**:
    - Frequency: Monthly (12), Bi-Monthly (6), Quarterly (4), or Semi-Annual (2).
    - Custom due windows, colors, labels, and notice texts can be customized per school.

---

## 7. Government Compliance Portals & The Statutory 2-Page G.R. Register

### 7.1 The Hard Reality: Do Public Government APIs Exist?
> [!CAUTION]
> In India, **UDISE+ (NIC)**, **Gujarat SSA (Samagra Shiksha)**, **SwiftChat**, and **RTE DEO Portals** **DO NOT provide public bi-directional REST APIs** with open API keys for private third-party ERPs.
> 
> Claims made by some vendors that they have a "Direct Government Cloud API" are misleading. Official portals are guarded behind CAPTCHAs, two-factor SMS OTPs, and state-level security firewalls.

### 7.2 The Proven 3-Pillar Government Integration Architecture

```
+------------------------------------------------------------------------------------+
|                      3-PILLAR GOVERNMENT COMPLIANCE SUITE                          |
+------------------------------------------------------------------------------------+
| PILLAR 1: Statutory 2-Page G.R. (General Register) Print Engine                    |
|           - Exact reproduction of the state gazette 2-page ledger format           |
|           - Matches physical register photos (media_1790068787865 & 8805046)       |
|           - Includes 18-digit Child UID, 11-digit PEN, APAAR ID, DISE Code, RTE    |
|           - High-resolution A3 landscape print for permanent physical binding      |
+------------------------------------------------------------------------------------+
| PILLAR 2: 1-Click Statutory Schema Exporter                                        |
|           - Pre-formatted CSV / Excel spreadsheets formatted to 100% exact specs   |
|           - UDISE+ SDMS (Student Data Management System) bulk upload templates     |
|           - SSA Gujarat Student Tracking format                                    |
|           - R.T.E. 25% quota quarterly reimbursement claim tables for D.E.O.       |
+------------------------------------------------------------------------------------+
| PILLAR 3: 7A Smart Bridge (Chrome Browser Extension RPA Assistant)                 |
|           - School clerk logs into UDISE+ / SSA normally with school password+OTP  |
|           - Extension detects student entry page and injects 'Auto-Fill from 7A'   |
|           - Reads student data from 7A ERP API and populates all 35 fields in 1 sec|
|           - Zero manual data entry errors, 100% compliant with government security |
+------------------------------------------------------------------------------------+
```

### 7.3 Statutory 2-Page G.R. Register Schema (As per Photos `media_1790068787865.jpg` & `media_1790068805046.jpg`)
The physical register spans a **two-page landscape ledger** with bilingual headings (Gujarati & English):

#### 📖 Left Page (`media_1790068787865.jpg`): Student Identity & Birth Record
1. **School Name & Medium**: e.g., `Ume school`, Medium: `English`, `GENERAL REGISTER`.
2. **Col 1: General Reg. No. of the Student (`વિદ્યાર્થીનો જી.આર. નં.`)**: Sequential integer locked sequence (e.g. 2640, 2641, 2642...).
3. **Col 2: Full Name of the Student (`વિદ્યાર્થીનું પૂરું નામ`)**: Split across 4 distinct lines:
   - `Name : [Student First Name]`
   - `Father's Name : [Father's Name]`
   - `Surname : [Surname]`
   - `Mother's Name : [Mother's Name]`
4. **Col 3: Religion & Caste (`ધર્મ અને જાતિ`)**: Category (`GEN / EWS / OBC / SC / ST`), Religion & Sub-caste (e.g. `Islam / Muslim`).
5. **Col 4: Place of Birth with Taluka & District (`જન્મ સ્થળ તાલુકો - જિલ્લો સહિત`)**:
   - `Village/City`, `Di: [District]`, `St: [State]` (e.g., `Surat, Gujarat` or `Jambusar, Di: Bharuch, St: Gujarat`).
   - **Dedicated APAAR ID Box**: 12-digit national Automated Permanent Academic Account Registry box.
6. **Col 5: Date of Birth (`જન્મ તારીખ`)**:
   - In Figures: `DD/MM/YYYY` (e.g., `08/12/2018`).
   - In Words (Christian Calendar): (e.g., `Eight December Two Thousand Eighteen`, `Sixth July Two Thousand Eighteen`).

#### 📖 Right Page (`media_1790068805046.jpg`): Enrollment, State UIDs & Leaving Record
1. **Header**: `REGISTER`, **Dise Code: 24221501552** (Dynamic School UDISE Code), `Year: 2025-26`, `Page No: 1`.
2. **Col 6: Last School Attended & G.R. No. (`અભ્યાસ કર્યો હોય તે છેલ્લી શાળાનું નામ અને જી.આર. નં.`)**.
3. **Child Tracking UID No.**:
   - 18 individual boxes for Gujarat Child Tracking UID (e.g., `2 4 2 2 1 5 1 9 8 1 0 2 4 1 0 0 0 9`).
4. **PEN No. (Permanent Education Number)**:
   - 11 individual boxes for national UDISE+ PEN (e.g., `2 2 9 4 8 1 6 2 1 7 6`).
5. **Col 7: Date of Admission with Class (`પ્રવેશ તારીખ ધોરણ સહિત`)**:
   - Date: `DD/MM/YYYY` (e.g., `11/06/2025`).
   - Class & Division: `Std./Div: 1st - A`.
   - **R.T.E. Quota Stamp**: Bold annotation if admitted under Right to Education 25% disadvantaged quota.
6. **Col 8: Admi. in Std./Class / Stream (`ધો./વર્ગમાં દાખલ કર્યા હોય તે`)**.
7. **Col 9: Progress (`પ્રગતિ`)**: Qualitative progress remark.
8. **Col 10: Conduct (`વર્તણૂંક`)**: Moral behavior remark (e.g., `Good`).
9. **Col 11: Date of Leaving the School (`શાળા છોડ્યાની તારીખ`)**.
10. **Col 12: Std & Class at the time of Leaving the School (`શાળા છોડતી વખતે ધો./વર્ગ`)**.
11. **Col 13: Remarks (`વિશેષ નોંધ`)**: Reason for leaving school, Fees paid or unpaid, `Std./Div`, `L.C. No.` (Leaving Certificate Number), and Principal Signature.
15. **Signature of Headmaster / Principal**.

---

## 8. Module 7: Dynamic Multi-School & Multi-Tenant Customization

### 8.1 The Core SaaS Principle: 100% Modular, Zero Forced Requirements
Every school has its own culture, board affiliation, and administrative philosophy:
- **No Mandatory Features**: Koi bhi feature (jaise 9-Point Habits, Fee Cards, ya Weekly Awards) kisi school par mandatory nahi hai.
- **Starter Presets as Reference Examples**: New tenants jo banenge, unhe pehle se bani hui reference templates milengi. Woh inhe dekh kar samajh sakte hain aur chahein to 1-click me adopt kar sakte hain, ya poori tarah customize/disable kar sakte hain.

### 8.2 Ready-to-Use Example Starter Presets
When an admin registers or configures their school, they can choose from 3 starter archetypes:

```
+------------------------------------------------------------------------------------+
|                         PRE-CONFIGURED STARTER PRESETS                             |
+------------------------------------------------------------------------------------+
| 🟢 PRESET 1: "Gujarat Trust School Model" (UME Welfare Trust Example)             |
|    - 9-Point Character & Habit Scoring active                                      |
|    - 4 UME Certificate Frames pre-loaded (Star Student, Homework Hero, etc.)       |
|    - 4-Quarterly Installment Fee Model (June, Sept, Nov, Jan)                      |
|    - 2-Sided Pocket Fee Card Print active with Hindi/Gujarati notes                |
|    - 2-Page Statutory G.R. Register (GSEB Bilingual) with RTE 25% quota tracking   |
+------------------------------------------------------------------------------------+
| 🔵 PRESET 2: "Standard CBSE Private School Model"                                  |
|    - 5-Point Habit Scoring (Attendance, Uniform, Homework, Discipline, Lunch)      |
|    - Monthly Fee Collection Cycle (12 Monthly billing receipts)                    |
|    - Standard English Merit Certificates                                           |
|    - CBSE List of Candidates (LOC) and Single-Page G.R. format                     |
+------------------------------------------------------------------------------------+
| ⚪ PRESET 3: "Lean / Minimal School Model"                                         |
|    - Habit tracking completely DISABLED (Clean & simple interface)                 |
|    - Simple Daily Attendance + Standard Fee Collection                            |
|    - Digital-only fee receipts (Physical Fee Card disabled)                        |
|    - Standard Student Directory                                                    |
+------------------------------------------------------------------------------------+
```

### 8.3 Self-Serve Admin Customization Cockpit (Full CRUD & Deep Editing — Not Just Toggles!)
Every school admin gets full interactive control to edit, create, delete, and customize everything to match their operational reality:

```
+------------------------------------------------------------------------------------+
|                         DEEP SELF-SERVE EDITING SUITE                              |
+------------------------------------------------------------------------------------+
| 1. HABITS ENGINE FULL CRUD & REORDERING                                            |
|    - Add Custom Habits (e.g. "Quran Recitation", "Sportsmanship", "Book Reading")  |
|    - Edit Any Habit: Change Title, Description, Icon, Weight (1 pt, 2 pts)        |
|    - Delete / Deactivate unwanted habits with 1 click                              |
|    - Drag & Drop Reorder: Set exact order for teacher's daily 60-second screen     |
+------------------------------------------------------------------------------------+
| 2. AWARDS & CERTIFICATES DESIGNER                                                  |
|    - Add Custom Awards (e.g. "Best Athlete of Month", "Spelling Champion")        |
|    - Edit Nomination Rules: Set minimum attendance %, minimum habit score, zero-   |
|      discipline violation conditions                                               |
|    - Visual Frame Designer: Upload custom background frame image (PNG/JPG),        |
|      drag-and-drop placeholder boxes (Student Name, Class, QR Code, Signatures)    |
|      with custom font sizes and colors                                             |
+------------------------------------------------------------------------------------+
| 3. FEES, INSTALLMENTS & PHYSICAL FEE CARD EDITOR                                   |
|    - Full Installment Schedule Editor: Add/Edit installment names, change dates    |
|      (e.g. shift from June 1-10 to July 5-15), set percentage of total fee         |
|    - Multilingual Notice Box Editor: Full rich-text editor for Hindi, Gujarati,    |
|      Urdu, or English rules printed on the front of the student Fee Card           |
|    - Receipt Prefix & Numbering Patterns: Set custom prefixes per wing (PE/, PG/,  |
|      SEC/, HSEC/) and reset starting sequence numbers                              |
|    - Operating Hours & Counter Rules: Edit counter timings (9:00 AM to 1:30 PM)    |
+------------------------------------------------------------------------------------+
| 4. TOMORROW'S LEARNING WORKFLOW EDITOR                                             |
|    - Edit Teacher submission window (e.g. 2:00 PM to 4:30 PM)                      |
|    - Edit Parent WhatsApp evening dispatch time (e.g. 5:30 PM vs 6:30 PM)          |
|    - Edit parent message formatting template with dynamic tags                     |
+------------------------------------------------------------------------------------+
| 5. STATUTORY G.R. REGISTER CUSTOMIZER                                              |
|    - Add Custom Columns (e.g. BPL Card No, Ration Card No, Mother Tongue)          |
|    - Edit Bilingual Header Labels (Gujarati/English, Marathi/English, etc.)        |
|    - Toggle State-Specific Blocks (APAAR ID, PEN Number, 18-digit Child UID)       |
+------------------------------------------------------------------------------------+
```

### 8.4 Example Tenant Configuration Schema

```json
{
  "tenant_slug": "ume-welfare-trust",
  "school_name": "UME Welfare Trust English School",
  "board": "GSEB",
  "language": "EN_GUJ",
  "preset_applied": "GUJARAT_TRUST_MODEL",
  "habit_tracking": {
    "enabled": true,
    "points_count": 9,
    "allow_lunch_override": true,
    "negative_marking": false
  },
  "awards": {
    "enabled": true,
    "weekly_enabled": true,
    "monthly_enabled": true,
    "yearly_enabled": true,
    "max_winners_per_section": 1,
    "custom_frames": {
      "star_student": "ume_star_student_frame.png",
      "homework_hero": "ume_homework_hero_frame.png",
      "max_attendance": "ume_max_attendance_frame.png",
      "super_helper": "ume_super_helper_frame.png"
    }
  },
  "fees": {
    "installment_model": "QUARTERLY_4",
    "receipt_prefixes": {
      "primary_english": "PE/",
      "primary_gujarati": "PG/",
      "secondary_english": "SE/"
    },
    "fee_card_enabled": true,
    "custom_timings": "9:00 AM to 1:30 PM",
    "notice_language": "HI"
  },
  "compliance": {
    "gr_layout": "GUJARAT_2_PAGE_SPREAD",
    "gr_number_prefix": "UME/GR/",
    "state": "Gujarat",
    "dise_code": "24221501552",
    "rte_quota_enabled": true
  }
}
```

- **Zero Code Branching**: Changes made by one school in their settings panel only alter their tenant JSON; the core codebase remains pure, stable, and multi-tenant isolated.

---

## 9. Detailed Technical Architecture & Data Schemas

### 9.1 Database Tables to Add / Enhance

```sql
-- 1. Daily 9-Point Habits Table
CREATE TABLE student_daily_habits (
    id VARCHAR(36) PRIMARY KEY,
    tenant_id VARCHAR(36) NOT NULL,
    student_id VARCHAR(36) NOT NULL,
    academic_year_id VARCHAR(36) NOT NULL,
    class_id VARCHAR(36) NOT NULL,
    section_id VARCHAR(36) NOT NULL,
    record_date DATE NOT NULL,
    attendance_status ENUM('PRESENT', 'ABSENT', 'LATE') DEFAULT 'PRESENT',
    punctuality BOOLEAN DEFAULT TRUE,
    uniform BOOLEAN DEFAULT TRUE,
    learning_material BOOLEAN DEFAULT TRUE,
    homework_completed BOOLEAN DEFAULT TRUE,
    classwork_completed BOOLEAN DEFAULT TRUE,
    healthy_lunch BOOLEAN DEFAULT TRUE,
    discipline BOOLEAN DEFAULT TRUE,
    neatness BOOLEAN DEFAULT TRUE,
    total_points TINYINT UNSIGNED DEFAULT 9,
    remarks VARCHAR(255) NULL,
    recorded_by_user_id VARCHAR(36) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uk_tenant_student_date (tenant_id, student_id, record_date),
    INDEX idx_tenant_class_date (tenant_id, class_id, section_id, record_date)
);

-- 2. Enhanced Awards Table (Supporting Weekly UME Frames & Trophies)
CREATE TABLE student_awards_v2 (
    id VARCHAR(36) PRIMARY KEY,
    tenant_id VARCHAR(36) NOT NULL,
    student_id VARCHAR(36) NOT NULL,
    academic_year_id VARCHAR(36) NOT NULL,
    class_id VARCHAR(36) NOT NULL,
    section_id VARCHAR(36) NOT NULL,
    award_cycle ENUM('WEEKLY', 'MONTHLY', 'YEARLY') NOT NULL,
    award_type ENUM('STAR_STUDENT', 'HOMEWORK_HERO', 'MAX_ATTENDANCE', 'SUPER_HELPER', 
                    'ROLE_MODEL', 'MOST_IMPROVED', 'BEST_DISCIPLINE', 'ACADEMIC_EXCELLENCE', 
                    'ALL_ROUNDER') NOT NULL,
    cycle_reference VARCHAR(50) NOT NULL, -- e.g. '2026-W38', '2026-09', '2026-2027'
    points_earned FLOAT NOT NULL DEFAULT 0,
    certificate_url VARCHAR(500) NULL,
    awarded_by_user_id VARCHAR(36) NOT NULL,
    parent_notified_whatsapp BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_tenant_award_cycle (tenant_id, award_cycle, cycle_reference)
);

-- 3. Tomorrow's Learning Table
CREATE TABLE tomorrows_learning (
    id VARCHAR(36) PRIMARY KEY,
    tenant_id VARCHAR(36) NOT NULL,
    academic_year_id VARCHAR(36) NOT NULL,
    class_id VARCHAR(36) NOT NULL,
    section_id VARCHAR(36) NOT NULL,
    subject_id VARCHAR(36) NOT NULL,
    teaching_date DATE NOT NULL, -- The date when this topic will be taught
    topic_title VARCHAR(200) NOT NULL,
    topic_description TEXT NOT NULL,
    required_materials VARCHAR(500) NULL, -- e.g. 'Leaf, magnifying glass'
    teacher_user_id VARCHAR(36) NOT NULL,
    published_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_tenant_class_teaching_date (tenant_id, class_id, section_id, teaching_date)
);

-- 4. Principal Action Items Tracker
CREATE TABLE principal_action_items (
    id VARCHAR(36) PRIMARY KEY,
    tenant_id VARCHAR(36) NOT NULL,
    title VARCHAR(200) NOT NULL,
    description TEXT NOT NULL,
    category ENUM('ACADEMIC', 'DISCIPLINE', 'FACILITY', 'FEES', 'COMPLIANCE', 'STAFF') NOT NULL,
    assigned_to_user_id VARCHAR(36) NOT NULL,
    deadline DATE NOT NULL,
    status ENUM('OPEN', 'IN_PROGRESS', 'RESOLVED', 'OVERDUE') DEFAULT 'OPEN',
    resolution_notes TEXT NULL,
    created_by_user_id VARCHAR(36) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_tenant_status_deadline (tenant_id, status, deadline)
);

-- 5. Notebook Correction Audit Sampling
CREATE TABLE notebook_correction_audits (
    id VARCHAR(36) PRIMARY KEY,
    tenant_id VARCHAR(36) NOT NULL,
    academic_year_id VARCHAR(36) NOT NULL,
    class_id VARCHAR(36) NOT NULL,
    section_id VARCHAR(36) NOT NULL,
    subject_id VARCHAR(36) NOT NULL,
    teacher_user_id VARCHAR(36) NOT NULL,
    audit_date DATE NOT NULL,
    notebooks_checked_count TINYINT UNSIGNED DEFAULT 5,
    index_score TINYINT UNSIGNED NOT NULL, -- 0 to 10
    date_score TINYINT UNSIGNED NOT NULL, -- 0 to 10
    red_pen_correction_score TINYINT UNSIGNED NOT NULL, -- 0 to 10
    remarks_quality_score TINYINT UNSIGNED NOT NULL, -- 0 to 10
    teacher_signature_score TINYINT UNSIGNED NOT NULL, -- 0 to 10
    total_score_pct FLOAT NOT NULL,
    auditor_user_id VARCHAR(36) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 6. Statutory General Register (G.R.) Records
CREATE TABLE statutory_gr_records (
    id VARCHAR(36) PRIMARY KEY,
    tenant_id VARCHAR(36) NOT NULL,
    student_id VARCHAR(36) NOT NULL UNIQUE,
    gr_number VARCHAR(50) NOT NULL,
    surname VARCHAR(100) NOT NULL,
    student_name VARCHAR(100) NOT NULL,
    father_name VARCHAR(100) NOT NULL,
    mother_name VARCHAR(100) NOT NULL,
    religion VARCHAR(50) NOT NULL,
    caste VARCHAR(50) NOT NULL,
    caste_category ENUM('GEN', 'EWS', 'OBC', 'SC', 'ST') DEFAULT 'GEN',
    sub_caste VARCHAR(50) NULL,
    birth_place_village_city VARCHAR(100) NOT NULL,
    birth_place_taluka VARCHAR(100) NOT NULL,
    birth_place_district VARCHAR(100) NOT NULL,
    birth_place_state VARCHAR(100) NOT NULL,
    dob_figures DATE NOT NULL,
    dob_words VARCHAR(255) NOT NULL,
    previous_school VARCHAR(255) NULL,
    last_class_attended VARCHAR(50) NULL,
    admission_standard VARCHAR(50) NOT NULL,
    admission_division VARCHAR(10) NOT NULL,
    admission_date DATE NOT NULL,
    is_rte BOOLEAN DEFAULT FALSE,
    child_uid_number VARCHAR(18) NULL, -- 18-digit State Child Tracking ID
    pen_number VARCHAR(11) NULL,       -- 11-digit Permanent Education Number
    apaar_id VARCHAR(12) NULL,         -- 12-digit Edu ID
    aadhar_number VARCHAR(12) NULL,
    dise_code VARCHAR(20) NOT NULL,
    leaving_date DATE NULL,
    leaving_standard VARCHAR(50) NULL,
    reason_for_leaving TEXT NULL,
    conduct_progress VARCHAR(100) DEFAULT 'Good',
    lc_number VARCHAR(50) NULL,
    lc_date DATE NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uk_tenant_gr_number (tenant_id, gr_number)
);

-- 7. Physical Fee Receipts (Slip Prints)
CREATE TABLE physical_fee_receipts (
    id VARCHAR(36) PRIMARY KEY,
    tenant_id VARCHAR(36) NOT NULL,
    receipt_number VARCHAR(50) NOT NULL,
    receipt_prefix VARCHAR(20) NOT NULL DEFAULT 'PE',
    student_id VARCHAR(36) NOT NULL,
    gr_number VARCHAR(50) NOT NULL,
    academic_year_id VARCHAR(36) NOT NULL,
    class_id VARCHAR(36) NOT NULL,
    section_id VARCHAR(36) NOT NULL,
    receipt_date DATE NOT NULL,
    period_label VARCHAR(50) NOT NULL,
    installment_number TINYINT UNSIGNED NOT NULL DEFAULT 1,
    payment_mode ENUM('CASH', 'UPI', 'CHEQUE', 'BANK_TRANSFER') DEFAULT 'CASH',
    cheque_number VARCHAR(50) NULL,
    cheque_bank VARCHAR(100) NULL,
    fee_breakdown JSON NOT NULL,
    total_amount DECIMAL(10, 2) NOT NULL,
    amount_in_words VARCHAR(255) NOT NULL,
    received_by_user_id VARCHAR(36) NOT NULL,
    cashier_signature_url VARCHAR(500) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uk_tenant_receipt_num (tenant_id, receipt_number)
);

-- 8. Physical 2-Sided Student Fee Cards
CREATE TABLE student_fee_cards (
    id VARCHAR(36) PRIMARY KEY,
    tenant_id VARCHAR(36) NOT NULL,
    student_id VARCHAR(36) NOT NULL,
    academic_year_id VARCHAR(36) NOT NULL,
    card_serial_number VARCHAR(50) NOT NULL,
    medium VARCHAR(20) NOT NULL DEFAULT 'ENGLISH',
    division_level VARCHAR(20) NOT NULL DEFAULT 'PRIMARY',
    installments_config JSON NOT NULL,
    dynamic_notice_text TEXT NULL,
    issued_date DATE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uk_tenant_student_card (tenant_id, student_id, academic_year_id)
);
```

---

## 10. Step-by-Step Implementation Roadmap

```
Phase 1: Database Migration & Model Definition
└── Create Alembic migration for the 6 new tables.
└── Connect BaseTenantModel multi-tenant isolation.
└── Seed initial lookup types for habits, awards, and G.R. fields.

Phase 2: Core Backend Engine & Routers
└── 9-Point Habit fast-scoring router (bulk batch punch in <100ms).
└── Auto-Awards Nomination algorithm (Runs every Friday 3:00 PM).
└── "Tomorrow's Learning" dispatch service with WhatsApp queuing.
└── Principal Monitoring Report (PMR) aggregation service.
└── Statutory G.R. CRUD & sequence-locking service.

Phase 3: High-Resolution Graphic Certificate Engine
└── SVG/HTML canvas compositor for the 4 UME Welfare Trust frames.
└── Dynamic text positioning, Principal digital signature & QR code embed.
└── PDF batch generation for assembly distribution.

Phase 4: Frontend Dashboards & Teacher Quick-Grid
└── Teacher 60-second mobile-friendly 9-point habit grid.
└── Principal Cockpit: Habit Radar heatmap, PMR view, Action Tracker.
└── Parent Portal: "Tomorrow's Learning" feed & Award Digital Badges.
└── Fee Recovery: Defaulters Aging Bucket Cockpit.

Phase 5: Government Compliance Suite & RPA Assistant
└── Statutory G.R. Ledger A3 landscape printable view.
└── 1-Click UDISE+ & SSA bulk schema export engine.
└── 7A Smart Bridge browser extension manifest & content script for auto-filling.
```

---
*Document prepared for review and approval. Execution begins upon explicit user confirmation.*
