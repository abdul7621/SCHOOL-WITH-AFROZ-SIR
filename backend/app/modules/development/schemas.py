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
