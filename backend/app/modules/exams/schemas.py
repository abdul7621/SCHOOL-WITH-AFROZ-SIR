from typing import List, Optional, Dict, Any
from datetime import date, time, datetime
from decimal import Decimal
from pydantic import BaseModel, Field


# 1. Exam Terms
class ExamTermCreate(BaseModel):
    academic_year_id: str
    name: str = Field(..., example="Term 1 / Half-Yearly Exam")
    start_date: date
    end_date: date
    weightage_percent: Decimal = Decimal("100.00")
    is_published: bool = False


class ExamTermResponse(BaseModel):
    id: str
    academic_year_id: str
    name: str
    start_date: date
    end_date: date
    weightage_percent: Decimal
    is_published: bool

    class Config:
        from_attributes = True


# 2. Grading Scales
class GradingScaleTierInput(BaseModel):
    min_score_percent: Decimal = Field(..., ge=0, le=100, example=91.00)
    max_score_percent: Decimal = Field(..., ge=0, le=100, example=100.00)
    grade_letter: str = Field(..., example="A1")
    grade_point: Decimal = Field(..., ge=0, example=10.0)
    remarks: Optional[str] = "Outstanding"


class GradingScaleCreate(BaseModel):
    name: str = Field(..., example="CBSE 8-Point Secondary Scale")
    description: Optional[str] = None
    tiers: List[GradingScaleTierInput]


class GradingScaleResponse(BaseModel):
    id: str
    name: str
    description: Optional[str]
    tiers: List[Dict[str, Any]] = []

    class Config:
        from_attributes = True


# 3. Exam Schedules
class ExamScheduleCreate(BaseModel):
    exam_term_id: str
    class_id: str
    subject_id: str
    exam_date: date
    start_time: Optional[time] = None
    end_time: Optional[time] = None
    max_marks: Decimal = Field(..., gt=0, example=100.00)
    pass_marks: Decimal = Field(..., ge=0, example=33.00)
    grading_scale_id: Optional[str] = None


class ExamScheduleResponse(BaseModel):
    id: str
    exam_term_id: str
    class_id: str
    subject_id: str
    exam_date: date
    max_marks: Decimal
    pass_marks: Decimal
    grading_scale_id: Optional[str]

    class Config:
        from_attributes = True


# 4. Marks Entry Grid
class StudentMarkEntryItem(BaseModel):
    student_id: str
    marks_obtained: Optional[Decimal] = None
    is_absent: bool = False
    remarks: Optional[str] = None


class SubmitMarksGridRequest(BaseModel):
    exam_schedule_id: str
    marks: List[StudentMarkEntryItem]


class MarksRosterStudentItem(BaseModel):
    student_id: str
    admission_no: str
    full_name: str
    roll_no: Optional[int]
    marks_obtained: Optional[Decimal] = None
    is_absent: bool = False
    grade_letter: Optional[str] = None
    remarks: Optional[str] = None
