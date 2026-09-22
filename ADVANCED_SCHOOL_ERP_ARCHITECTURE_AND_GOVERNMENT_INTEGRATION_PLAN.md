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

---

## 7. Government Compliance Portals & The Statutory G.R. Register

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
| PILLAR 1: Statutory G.R. (General Register) Print Engine                           |
|           - Exact reproduction of the state gazette ledger format                  |
|           - Matches the uploaded statutory photo (media_1790068035347.jpg)         |
|           - Includes APAAR ID, PEN, caste, birth place, and legal leaving records  |
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

### 7.3 Statutory G.R. Register Schema (As per Photo `media_1790068035347.jpg`)
The physical register requires 15 statutory columns:
1. **G.R. Number (General Register No.)**: Unique permanent sequential integer.
2. **Student Full Name**: Format: `[Surname] [Student Name] [Father's Name] [Mother's Name]`.
3. **Religion & Caste**: Detailed sub-caste specification (e.g. `Muslim - Sunni / Pinjara` or `Hindu - Luhana`).
4. **Place of Birth**: Full hierarchy: `[Village/Town]`, `[Taluka]`, `[District]`, `[State]`.
5. **Date of Birth**:
   - In Figures: `DD/MM/YYYY` (e.g., `14/08/2015`).
   - In Statutory Words: (e.g., `Fourteenth August Two Thousand Fifteen`).
6. **Previous School Attended & Last Standard Studied**.
7. **Date of Admission & Standard Admitted Into**.
8. **Progress & Moral Conduct Remarks**.
9. **Date of Leaving School**.
10. **Standard from which Leaving & Reason for Leaving**.
11. **School Leaving Certificate (LC) Number & Date of Issue**.
12. **APAAR ID** (Automated Permanent Academic Account Registry — 12-digit national Edu ID).
13. **PEN** (Permanent Education Number assigned under UDISE+).
14. **Student & Parent Aadhar Numbers**.
15. **Signature of Headmaster / Principal**.

---

## 8. Module 7: Dynamic Multi-School & Multi-Tenant Customization

Every school operates under different conditions. The architecture uses a **Dynamic Tenant Configuration Engine**:

```json
{
  "tenant_slug": "ume-welfare-trust",
  "school_name": "UME Welfare Trust English School",
  "board": "GSEB",
  "language": "EN_GUJ",
  "habit_tracking": {
    "enabled": true,
    "points_count": 9,
    "allow_lunch_override": true,
    "negative_marking": false
  },
  "awards": {
    "weekly_enabled": true,
    "max_winners_per_section": 1,
    "custom_frame_slugs": {
      "star_student": "ume_star_student_frame.png",
      "homework_hero": "ume_homework_hero_frame.png",
      "max_attendance": "ume_max_attendance_frame.png",
      "super_helper": "ume_super_helper_frame.png"
    }
  },
  "compliance": {
    "gr_number_prefix": "UME/GR/",
    "gr_number_digits": 5,
    "state": "Gujarat",
    "district": "Ahmedabad",
    "rte_quota_enabled": true
  }
}
```

- **School A (UME Welfare Trust)**: 9-point habits active, UME graphic certificate frames, Gujarat G.R. layout, RTE 25% tracking.
- **School B (Standard Private High School)**: 5-point habits (Attendance, Uniform, Homework, Discipline, Lunch), CBSE board, standard certificates.
- **Zero code branching**: All controlled through database-driven tenant configurations.

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
    admission_date DATE NOT NULL,
    leaving_date DATE NULL,
    leaving_standard VARCHAR(50) NULL,
    reason_for_leaving TEXT NULL,
    conduct_progress VARCHAR(100) DEFAULT 'Good',
    lc_number VARCHAR(50) NULL,
    lc_date DATE NULL,
    apaar_id VARCHAR(20) NULL,
    pen_number VARCHAR(20) NULL,
    aadhar_number VARCHAR(20) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uk_tenant_gr_number (tenant_id, gr_number)
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
