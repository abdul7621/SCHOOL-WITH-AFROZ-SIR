from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field


class DevelopmentCriteriaCreate(BaseModel):
    name: str = Field(..., example="Cleanliness & Personal Hygiene")
    code: str = Field(..., example="CLEANLINESS")
    description: Optional[str] = None
    is_active: bool = True


class DevelopmentScaleCreate(BaseModel):
    name: str = Field(..., example="5-Star Behavioral Scale")
    scale_type: str = "STAR"  # 'STAR', 'GRADE', 'NUMERIC'
    options: List[Dict[str, Any]] = [
        {"label": "5 Stars - Outstanding", "value": "5"},
        {"label": "4 Stars - Very Good", "value": "4"},
        {"label": "3 Stars - Good", "value": "3"},
        {"label": "2 Stars - Needs Improvement", "value": "2"},
        {"label": "1 Star - Unsatisfactory", "value": "1"},
    ]


class DevelopmentRuleCreate(BaseModel):
    academic_year_id: str
    class_id: str
    criteria_id: str
    scale_id: str
    weightage: int = 1
    evaluation_frequency: str = "MONTHLY"  # 'MONTHLY', 'TERM_WISE'


class StudentEvaluationScoreItem(BaseModel):
    student_id: str
    criteria_id: str
    rating_value: str = Field(..., example="5")
    remarks: Optional[str] = None


class SubmitDevelopmentEvaluationsRequest(BaseModel):
    academic_year_id: str
    class_id: str
    evaluation_period: str = Field(..., example="Term-1")
    evaluations: List[StudentEvaluationScoreItem]


class DisciplineIncidentCreate(BaseModel):
    student_id: str
    incident_date: Optional[str] = None
    category: str = Field(..., example="BEHAVIORAL")
    severity_level: str = "LOW"  # 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL'
    action_taken: str = Field(..., example="VERBAL_WARNING")
    description: Optional[str] = None
    parent_notified: bool = False


class DisciplineIncidentResponse(BaseModel):
    id: str
    student_id: str
    incident_date: str
    category: str
    severity_level: str
    action_taken: str
    description: Optional[str]
    parent_notified: bool


class StudentAwardCreate(BaseModel):
    student_id: str
    academic_year_id: str
    award_name: str = Field(..., example="Student of the Month")
    award_category: str = "BEHAVIOR"  # 'ACADEMIC', 'ATTENDANCE', 'BEHAVIOR', 'SPORTS'
    award_date: Optional[str] = None
    description: Optional[str] = None
    certificate_issued: bool = True


class StudentAwardResponse(BaseModel):
    id: str
    student_id: str
    award_name: str
    award_category: str
    award_date: str
    description: Optional[str]
    certificate_issued: bool


# ==========================================
# Module 1: 9-Point Daily Habit Schemas
# ==========================================

class StudentHabitItem(BaseModel):
    student_id: str
    attendance_status: str = "PRESENT"  # 'PRESENT', 'ABSENT', 'LATE', 'EXCUSED'
    habit_punctuality: bool = True
    habit_uniform: bool = True
    habit_material: bool = True
    habit_homework: bool = True
    habit_classwork: bool = True
    habit_healthy_lunch: bool = True
    habit_discipline: bool = True
    habit_neatness: bool = True
    exception_notes: Optional[str] = None


class SubmitDailyHabitsRequest(BaseModel):
    academic_year_id: Optional[str] = None
    class_id: str
    section_id: str
    habit_date: str  # YYYY-MM-DD
    habits: List[StudentHabitItem]


class StudentHabitGridRow(BaseModel):
    student_id: str
    admission_no: str
    student_name: str
    roll_number: Optional[str] = None
    attendance_status: str = "PRESENT"
    habit_punctuality: bool = True
    habit_uniform: bool = True
    habit_material: bool = True
    habit_homework: bool = True
    habit_classwork: bool = True
    habit_healthy_lunch: bool = True
    habit_discipline: bool = True
    habit_neatness: bool = True
    daily_score: int = 9
    exception_notes: Optional[str] = None


class DailyHabitGridResponse(BaseModel):
    class_id: str
    section_id: str
    habit_date: str
    is_already_marked: bool
    total_students: int
    rows: List[StudentHabitGridRow]


# ==========================================
# Module 4: Principal Cockpit, Action Items & Notebook Audits
# ==========================================

class PrincipalActionItemCreate(BaseModel):
    title: str = Field(..., example="Lab gas pipe maintenance")
    description: str
    category: str = "ACADEMIC"  # 'ACADEMIC', 'DISCIPLINE', 'FACILITY', 'FEES', 'COMPLIANCE', 'STAFF'
    assigned_to_user_id: str
    deadline: str  # YYYY-MM-DD


class PrincipalActionItemStatusUpdate(BaseModel):
    status: str = Field(..., example="RESOLVED")  # 'OPEN', 'IN_PROGRESS', 'RESOLVED', 'OVERDUE'
    resolution_notes: Optional[str] = None


class PrincipalActionItemResponse(BaseModel):
    id: str
    title: str
    description: str
    category: str
    assigned_to_user_id: str
    assigned_to_name: Optional[str] = None
    deadline: str
    status: str
    resolution_notes: Optional[str] = None
    is_overdue: bool = False
    created_by_user_id: str
    created_at: Optional[str] = None


class NotebookCorrectionAuditCreate(BaseModel):
    academic_year_id: Optional[str] = None
    class_id: str
    section_id: str
    subject_id: str
    teacher_user_id: str
    audit_date: Optional[str] = None
    notebooks_checked_count: int = 5
    index_score: int = Field(..., ge=0, le=10)
    date_score: int = Field(..., ge=0, le=10)
    red_pen_correction_score: int = Field(..., ge=0, le=10)
    spelling_correction_score: int = Field(..., ge=0, le=10)
    teacher_signature_score: int = Field(..., ge=0, le=10)
    remarks: Optional[str] = None


class NotebookCorrectionAuditResponse(BaseModel):
    id: str
    teacher_user_id: str
    teacher_name: Optional[str] = None
    class_name: Optional[str] = None
    section_name: Optional[str] = None
    subject_name: Optional[str] = None
    audit_date: str
    total_score_pct: float
    grade_quality: str
    remarks: Optional[str] = None


class ConferHonorAwardRequest(BaseModel):
    student_id: str
    academic_year_id: Optional[str] = None
    award_name: str = "⭐ Star Student of the Week"
    award_category: str = "BEHAVIOR"
    award_date: Optional[str] = None
    description: Optional[str] = "For exemplary dedication, 9-point character habits, and weekly honor roll distinction."


