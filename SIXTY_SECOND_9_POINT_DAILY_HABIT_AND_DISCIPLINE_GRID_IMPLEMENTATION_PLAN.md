# 🌟 60-Second 9-Point Daily Habit & Discipline Scoring Engine
## Master Implementation Blueprint & Architecture Specification

> **Document Code:** 7A-HABIT-MOD1-2026  
> **Version:** 1.0.0 (Enterprise Multi-Tenant Standard)  
> **Target Scale:** 5,000+ Schools (Urban CBSE Academies to Rural Trust Schools)  
> **Status:** Architecture Approved & Ready for Phased Implementation  
> **Scope:** Full-Stack Architecture (Database DDL, Python Backend Services & Routers, Exception-Only Fast UI Grid, Parent Journal, Principal Radar Heatmaps)

---

## 📑 Table of Contents
1. [Executive Vision & The 60-Second Innovation](#1-executive-vision--the-60-second-innovation)
2. [The 9 Daily Core Habits Taxonomy](#2-the-9-daily-core-habits-taxonomy)
3. [Database Schema (Multi-Tenant DDL)](#3-database-schema-multi-tenant-ddl)
4. [Backend API Architecture & Schemas](#4-backend-api-architecture--schemas)
5. [Mathematical Aggregation & Streak Algorithms](#5-mathematical-aggregation--streak-algorithms)
6. [Cross-Portal User Journeys & Frontend UI Specifications](#6-cross-portal-user-journeys--frontend-ui-specifications)
   - 6.1 Teacher 60-Second Fast Grid (`AttendanceMarker.jsx` & `TeacherCockpit.jsx`)
   - 6.2 Parent Daily Habit Journal & Weekly Radar (`ParentDashboard.jsx`)
   - 6.3 Principal Institutional Habit Heatmap (`Dashboard.jsx` & `DisciplineAndAwards.jsx`)
7. [Gap Analysis & Architectural Safeguards](#7-gap-analysis--architectural-safeguards)
8. [Phased Implementation Roadmap & Verification Plan](#8-phased-implementation-roadmap--verification-plan)

---

## 1. Executive Vision & The 60-Second Innovation

### 1.1 The Fundamental Flaw of Traditional School ERPs
Traditional school management software treats student behavioral assessment as a bureaucratic, once-a-term chore. Teachers are forced to fill out subjective comment boxes or grade 40 students across 10 drop-down menus at the end of the term. Because it is detached from daily reality:
- Habit building cannot happen retrospectively.
- Parents only discover behavioral or homework failures months later during report card distribution.
- Positive habits (punctuality, clean tiffin, tidy school bag) go unrewarded.

### 1.2 The 7A ERP Transformation
The **9-Point Daily Habit & Discipline Engine** turns character building into an active, positive daily ritual:
1. **Integrated with Morning Attendance:** Habit marking happens simultaneously with daily homeroom attendance.
2. **The 60-Second "Exception-Only" Fast Matrix:**
   - In a class of 45 students, clicking 9 buttons per student requires $45 \times 9 = 405$ clicks. Teachers will boycott this workflow.
   - **7A Exception Pattern:** Every student starts at **9/9 (ALL GREEN / FULL POINTS)** by default.
   - If a student is absent, marking `ABSENT` automatically zeroes out all points (0/9).
   - For present students, the teacher only taps the **1 specific red icon** if a habit was broken (e.g. Roll #5 forgot homework $\rightarrow$ tap 1 icon $\rightarrow$ score updates to 8/9).
   - Average class marking time: **Under 60 seconds (3–8 total taps for the entire class)**.

```
┌─────────────────────────────────────────────────────────────────────────────────────────────┐
│                          60-SECOND HOMEROOM EXCEPTION WORKFLOW                              │
├─────────────────────────────────────────────────────────────────────────────────────────────┤
│  1. OPEN HOMEROOM ROSTER ➔ ALL STUDENTS INITIALIZED AT 9/9 (ALL GREEN)                     │
│  2. MARK ABSENTEES ➔ AUTOMATIC 0/9 POINT SYNC                                               │
│  3. TAP EXCEPTIONS ONLY (e.g. Roll #4: No Uniform [👔], Roll #11: Incomplete HW [✍️])      │
│  4. 1-CLICK "SAVE ATTENDANCE & HABITS" ➔ ATOMIC COMMITTED IN < 60 SECONDS                   │
└─────────────────────────────────────────────────────────────────────────────────────────────┘
                                       │
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────────────────────┐
│                            AUTOMATED DOWNSTREAM REAL-TIME SYNC                              │
│  ├─ Parent Portal: Live "Today's Habit Score (8/9)" + Nightly Habit Journal                 │
│  ├─ Principal Cockpit: School-wide Habit Heatmap & Classroom Red Alerts                     │
│  └─ Awards Engine: Auto-nomination for "Star Student of the Week" (100% 9-Point Score)      │
└─────────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. The 9 Daily Core Habits Taxonomy

Every morning, students are evaluated against 9 clear, non-subjective dimensions:

| # | Habit Dimension | Code | Evaluation Criteria | Default State | Points Value |
|:---:|---|:---:|---|:---:|:---:|
| **1** | **Attendance** | `ATTENDANCE` | Present in class. (Absent = 0 pts for all 9 dimensions). | Present | 1 Pt |
| **2** | **Punctuality** | `PUNCTUALITY` | Arrived before assembly bell / school gate closure. | On-Time | 1 Pt |
| **3** | **Uniform & Grooming** | `UNIFORM` | Proper clean uniform, black/white shoes, trimmed nails/hair, ID card. | Compliant | 1 Pt |
| **4** | **Learning Materials** | `MATERIAL` | Brought required textbooks, notebooks, geometry/stationery kit. | Complete | 1 Pt |
| **5** | **Homework Completion** | `HOMEWORK` | Finished previous day's homework completely with parent initials. | Done | 1 Pt |
| **6** | **Classwork Engagement** | `CLASSWORK` | Active participation in class, completed workbook exercises. | Active | 1 Pt |
| **7** | **Healthy Lunch Box** | `HEALTHY_LUNCH` | Nutritious home-cooked tiffin (No packaged chips, kurkure, sodas). | Healthy | 1 Pt |
| **8** | **Discipline & Values** | `DISCIPLINE` | Respectful to peers/teachers, no foul language, queue discipline. | Well-behaved | 1 Pt |
| **9** | **Neatness & Hygiene** | `NEATNESS` | Tidy school bag, clean desk area, washed hands after break. | Clean | 1 Pt |

---

## 3. Database Schema (Multi-Tenant DDL)

To support 5,000+ schools with zero performance degradation, daily habit records use a compact, indexed table structure that integrates with `attendance_sessions`:

```sql
CREATE TABLE IF NOT EXISTS student_daily_habits (
    id VARCHAR(36) PRIMARY KEY,
    student_id VARCHAR(36) NOT NULL,
    academic_year_id VARCHAR(36) NOT NULL,
    class_id VARCHAR(36) NOT NULL,
    section_id VARCHAR(36) NOT NULL,
    habit_date DATE NOT NULL,
    
    -- Attendance Sync
    attendance_status VARCHAR(20) NOT NULL DEFAULT 'PRESENT', -- 'PRESENT', 'ABSENT', 'LATE', 'EXCUSED'
    
    -- 8 Core Habit Dimension Exception Flags (1 = Compliant/Green, 0 = Exception/Red)
    is_punctual TINYINT(1) NOT NULL DEFAULT 1,
    is_uniform_compliant TINYINT(1) NOT NULL DEFAULT 1,
    has_learning_materials TINYINT(1) NOT NULL DEFAULT 1,
    has_completed_homework TINYINT(1) NOT NULL DEFAULT 1,
    is_classwork_engaged TINYINT(1) NOT NULL DEFAULT 1,
    has_healthy_lunch TINYINT(1) NOT NULL DEFAULT 1,
    is_disciplined TINYINT(1) NOT NULL DEFAULT 1,
    is_neat_and_clean TINYINT(1) NOT NULL DEFAULT 1,
    
    -- Aggregated Daily Score (0 to 9)
    total_score INT NOT NULL DEFAULT 9,
    
    -- Optional teacher quick notes for exceptions (e.g. "Forgot Hindi workbook, unpolished shoes")
    exception_notes VARCHAR(255) NULL,
    recorded_by_teacher_id VARCHAR(36) NOT NULL,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
    FOREIGN KEY (academic_year_id) REFERENCES academic_years(id),
    FOREIGN KEY (class_id) REFERENCES classes(id),
    FOREIGN KEY (section_id) REFERENCES sections(id),
    FOREIGN KEY (recorded_by_teacher_id) REFERENCES users(id),
    
    UNIQUE KEY uk_student_habit_date (student_id, habit_date),
    INDEX idx_habit_cls_sec_date (class_id, section_id, habit_date),
    INDEX idx_habit_st_date (student_id, habit_date),
    INDEX idx_habit_score (habit_date, total_score)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

---

## 4. Backend API Architecture & Schemas

### 4.1 Pydantic Schemas (`backend/app/modules/development/schemas.py`)

```python
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import date

class DailyHabitStudentEntry(BaseModel):
    student_id: str
    attendance_status: str = "PRESENT" # "PRESENT", "ABSENT", "LATE", "EXCUSED"
    is_punctual: bool = True
    is_uniform_compliant: bool = True
    has_learning_materials: bool = True
    has_completed_homework: bool = True
    is_classwork_engaged: bool = True
    has_healthy_lunch: bool = True
    is_disciplined: bool = True
    is_neat_and_clean: bool = True
    exception_notes: Optional[str] = None

class SubmitDailyHabitsRequest(BaseModel):
    academic_year_id: str
    class_id: str
    section_id: str
    habit_date: date
    records: List[DailyHabitStudentEntry]

class StudentHabitSummaryResponse(BaseModel):
    student_id: str
    student_name: str
    admission_no: str
    habit_date: date
    today_score: int # 0 to 9
    weekly_average_percent: float # e.g. 94.4%
    current_perfect_streak_days: int # e.g. 7 days
    dimension_compliance: Dict[str, float] # {"UNIFORM": 100.0, "HOMEWORK": 80.0, ...}
    recent_exceptions: List[Dict[str, Any]]
```

### 4.2 Router Endpoints (`backend/app/modules/development/router.py`)

1. **`GET /api/v1/development/habits/grid`** (Teacher / Homeroom):
   - Query: `academic_year_id`, `class_id`, `section_id`, `habit_date`.
   - Returns: Enrolled students with today's saved habit states. If not marked today, pre-populates all active students with `9/9` default green states and approved leaves pre-set to `EXCUSED`.
2. **`POST /api/v1/development/habits/submit`** (Teacher / Homeroom):
   - Atomic submission: Computes `total_score` per student ($0 \le S_d \le 9$) and saves into `student_daily_habits`.
3. **`GET /api/v1/development/habits/student/{student_id}/journal`** (Parent & Student 360°):
   - Returns month-by-month calendar breakdown, weekly radar, and streak metrics.
4. **`GET /api/v1/development/habits/class-radar`** (Principal & Teacher Cockpit):
   - Returns Class Habit Index ($\text{CHI}$) and systemic red-flag radar across all 9 dimensions.

---

## 5. Mathematical Aggregation & Streak Algorithms

### 5.1 Daily Student Score ($S_d$)
For a given date $d$:
$$S_d = \text{Att} \times \left( \text{Punc} + \text{Unif} + \text{Mat} + \text{HW} + \text{CW} + \text{Lunch} + \text{Disc} + \text{Neat} + 1 \right)$$
*If $\text{Att} = 0$ (Absent), $S_d = 0$. If $\text{Att} = 1$ (Present) and all 8 habits are compliant, $S_d = 9$.*

### 5.2 Weekly Student Habit Average ($W_{\text{avg}}$)
For a week with $N$ instructional school days:
$$W_{\text{avg}} = \frac{\sum_{d=1}^{N} S_d}{9 \times N} \times 100\%$$

* **Grade Tiers:**
  - $\ge 90\%$: **Role Model (Tier 1 - Star Student Eligible)** ⭐
  - $75\% - 89\%$: **Good Standing (Tier 2)** 🟢
  - $60\% - 74\%$: **Attention Required (Tier 3)** 🟡
  - $< 60\%$: **Critical Behavioral Support (Tier 4)** 🔴

### 5.3 Class Habit Index ($\text{CHI}_{\text{dimension}}$)
To diagnose systemic problems in a classroom:
$$\text{CHI}_{\text{dim}} = \frac{\sum_{i=1}^{M} \text{Compliant Days}_{i, \text{dim}}}{M \times N} \times 100\%$$
*(Where $M$ is total students in section and $N$ is days in period).*
- If $\text{CHI}_{\text{HOMEWORK}} = 52\%$, Principal immediately alerts the Class Teacher to investigate textbook difficulty or parent engagement.

---

## 6. Cross-Portal User Journeys & Frontend UI Specifications

### 6.1 Teacher 60-Second Fast Grid (`AttendanceMarker.jsx` & `TeacherCockpit.jsx`)
* In `AttendanceMarker.jsx`, add tab toggle: **"Attendance Roster"** vs **"⭐ 9-Point Habit Fast Grid"**.
* **Table Layout:**
  - **Column 1:** Roll # & Student Name (with photo avatar).
  - **Column 2:** Attendance Status (Present / Absent / Excused).
  - **Column 3:** **The 8-Habit Interactive Ribbon**:
    - `[⏰ Punctual]` `[👔 Uniform]` `[📚 Books]` `[✍️ HW]` `[🎯 Classwork]` `[🍱 Lunch]` `[🤝 Discipline]` `[✨ Neatness]`
    - Each icon renders as a rounded green badge when compliant (1 pt) and red with an $\times$ when tapped (0 pt).
  - **Column 4:** Live Score Pill: `9/9 (100%)` in emerald, dynamically updating as exceptions are tapped.
  - **Column 5:** Quick Exception Note popover.
* **Header Bar:**
  - Fast Action: **"Reset All to 9/9"** button.
  - Timer widget: **"⏱️ Class Homeroom Time: 0:42 sec"**.
  - **"Save Attendance & 9-Point Habits"** primary button.

### 6.2 Parent Daily Habit Journal & Weekly Radar (`ParentDashboard.jsx`)
* Replaces the static `overview?.behavioral_rating` placeholder with a dynamic **"Daily 9-Point Character Score"** card:
  - Header: `⭐ Today's Habit Score: 9/9 (Role Model)`
  - 9 Habit Pills showing green checkmarks and any red exception with teacher note (e.g. `⚠️ Homework: Page 24 exercises incomplete`).
  - Weekly Habit Radar bar showing percentage across all 9 habits.
  - **"🔥 8-Day Perfect 9/9 Streak"** gamified badge.

### 6.3 Principal Institutional Habit Heatmap (`Dashboard.jsx` & `DisciplineAndAwards.jsx`)
* Visual heatmap showing all classes (Grade 1-A to Grade 10-B) across the 9 habit dimensions.
* Highlighted Red Alerts: Class sections with habit index $< 65\%$.
* 1-Click nomination for Friday Assembly Awards.

---

## 7. Gap Analysis & Architectural Safeguards

| # | Potential Gap / Failure Point | Root Cause | Architectural Safeguard |
|---|---|---|---|
| **1** | **Absent Student Habit Corruption** | Teacher marks student `ABSENT` in attendance, but habit flags remain `1` (True). | Backend & frontend validation: If `attendance_status == 'ABSENT'`, all 8 habit flags are automatically forced to `0` and `total_score = 0`. |
| **2** | **Duplicate Daily Submissions** | Multiple teachers or homeroom staff submitting habits for the same student on the same date. | Unique constraint `uk_student_habit_date (student_id, habit_date)` + atomic `ON DUPLICATE KEY UPDATE` / upsert service logic. |
| **3** | **Multi-Tenant Schema Migration on 5,000 DBs** | Existing tenant DBs failing with MySQL 1146 when table is queried. | Registered in `_ensure_tenant_schema_patches` in `core/database.py` AND `_initialize_tenant_schema` in `control_plane/services.py`. |
| **4** | **Excused Medical Leave Penalty** | Students with approved medical leave losing their weekly habit average. | Days with `attendance_status == 'EXCUSED'` are excluded from the weekly average denominator ($N$). |
| **5** | **Teacher Workload Bottleneck** | Slow rendering of 45 rows $\times$ 9 buttons causing input lag. | Pure local React state with zero debounce lag, batch saving via a single lightweight JSON payload. |
| **6** | **Attendance & Habit Ledger Divergence** | Teacher submits via standard attendance without opening habit tab. | In `AttendanceService.submit_attendance`, if `student_daily_habits` is not yet marked for today, auto-sync attendance status to maintain 100% ledger consistency. |
| **7** | **Parent Portal Early Morning / Holiday State** | Parent opens app before 8:00 AM homeroom or on Sunday/Holiday. | `ParentPortalService` returns `status: "PENDING_CHECK"`, rendering a friendly status with weekly average ($W_{\text{avg}}$) and streak instead of empty data. |
| **8** | **Teacher Homeroom Cockpit Quick-Access** | Class teachers having to manually browse dropdowns to find their section. | `TeacherCockpit.jsx` features a 1-click `"⭐ 60-Sec Homeroom Habit Matrix"` button pre-navigating with locked class & section IDs. |
| **9** | **Recurring Behavioral Incident Escalation** | Student getting repeated red flags in Discipline or Uniform going unnoticed. | If $\ge 3$ exceptions in 7 days, system alerts teacher with 1-click shortcut to log a formal `DisciplineIncident`. |
| **10** | **Assembly Honor Roll Printable Sheet** | Principal having to manually calculate Star Students for Friday morning assembly. | Dedicated **"Print Weekly Habit Honor Roll"** button in `DisciplineAndAwards.jsx` formatting top 9/9 streak students for assembly announcements. |

---

## 8. Phased Implementation Roadmap & Verification Plan

```
┌─────────────────────────────────────────────────────────────────────────────────────────────┐
│                          PHASED IMPLEMENTATION TIMELINE                                     │
├─────────────┬───────────────────────────────────────────────────────────────────────────────┤
│ **Step 1**  │ **Database Models & DDL Patches:**                                            │
│             │ • Define `StudentDailyHabit` in `development/models.py`.                      │
│             │ • Register table in `core/database.py` & `control_plane/services.py`.         │
├─────────────┼───────────────────────────────────────────────────────────────────────────────┤
│ **Step 2**  │ **Backend Services & Routers:**                                               │
│             │ • Implement `HabitService` with batch upsert, aggregation & radar algorithms.  │
│             │ • Add endpoints to `development/router.py` with RBAC permissions.             │
├─────────────┼───────────────────────────────────────────────────────────────────────────────┤
│ **Step 3**  │ **Teacher 60-Second Fast Grid:**                                              │
│             │ • Enhance `AttendanceMarker.jsx` with the 9-Point Exception Matrix.           │
│             │ • Add habit telemetry card to `TeacherCockpit.jsx`.                           │
├─────────────┼───────────────────────────────────────────────────────────────────────────────┤
│ **Step 4**  │ **Parent Habit Journal & Principal Heatmap:**                                 │
│             │ • Upgrade `ParentDashboard.jsx` with daily habit breakdown & streak radar.     │
│             │ • Add School-wide Habit Heatmap to `DisciplineAndAwards.jsx`.                 │
├─────────────┼───────────────────────────────────────────────────────────────────────────────┤
│ **Step 5**  │ **End-to-End Verification & Hardening:**                                      │
│             │ • Cross-check full journey (Teacher marks ➔ Parent views ➔ Principal audits).   │
└─────────────┴───────────────────────────────────────────────────────────────────────────────┘
```
