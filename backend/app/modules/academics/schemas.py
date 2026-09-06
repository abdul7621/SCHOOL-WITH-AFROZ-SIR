from typing import List, Optional
from datetime import date, datetime, time
from pydantic import BaseModel, Field


# Academic Year
class AcademicYearCreate(BaseModel):
    name: str = Field(..., example="2026-2027")
    start_date: date
    end_date: date
    is_current: bool = False


class AcademicYearResponse(BaseModel):
    id: str
    name: str
    start_date: date
    end_date: date
    is_current: bool
    is_locked: bool
    created_at: datetime

    class Config:
        from_attributes = True


# Class Level & Section
class SectionCreate(BaseModel):
    name: str = Field(..., example="A")
    capacity: int = 45


class SectionResponse(BaseModel):
    id: str
    class_id: str
    name: str
    capacity: int

    class Config:
        from_attributes = True


class ClassLevelCreate(BaseModel):
    name: str = Field(..., example="Class 10")
    numeric_order: int = Field(..., example=10)
    description: Optional[str] = None
    initial_sections: Optional[List[str]] = None  # e.g. ["A", "B"]


class ClassLevelResponse(BaseModel):
    id: str
    name: str
    numeric_order: int
    description: Optional[str]
    sections: List[SectionResponse] = []

    class Config:
        from_attributes = True


# Subject
class SubjectCreate(BaseModel):
    code: str = Field(..., example="MATH_10")
    name: str = Field(..., example="Mathematics")
    subject_type: str = "THEORY"  # 'THEORY', 'PRACTICAL', 'BOTH'
    is_elective: bool = False


class SubjectResponse(BaseModel):
    id: str
    code: str
    name: str
    subject_type: str
    is_elective: bool

    class Config:
        from_attributes = True


class AssignSubjectsToClassRequest(BaseModel):
    subject_ids: List[str]


class CopyCurriculumRequest(BaseModel):
    source_class_id: str
    target_class_ids: List[str]
    copy_mode: str = "MERGE"  # 'MERGE' or 'REPLACE'


class ClassTeacherAssignRequest(BaseModel):
    academic_year_id: str
    class_id: str
    section_id: str
    teacher_user_id: str


class HomeworkCreateRequest(BaseModel):
    academic_year_id: str
    class_id: str
    section_id: str
    subject_id: str
    title: str
    description: str
    due_date: date
    attachment_url: Optional[str] = None


class HomeworkUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    due_date: Optional[date] = None
    subject_id: Optional[str] = None
    attachment_url: Optional[str] = None


class StudentLeaveSubmitRequest(BaseModel):
    student_id: str
    from_date: date
    to_date: date
    reason: str


class StudentLeaveStatusUpdateRequest(BaseModel):
    status: str
    approval_remarks: Optional[str] = None


class AcademicYearUpdate(BaseModel):
    name: Optional[str] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None


class ClassLevelUpdate(BaseModel):
    name: Optional[str] = None
    numeric_order: Optional[int] = None
    description: Optional[str] = None


class SectionUpdate(BaseModel):
    name: Optional[str] = None
    capacity: Optional[int] = None


class SubjectUpdate(BaseModel):
    code: Optional[str] = None
    name: Optional[str] = None
    subject_type: Optional[str] = None
    is_elective: Optional[bool] = None


class PeriodCreate(BaseModel):
    period_number: int
    name: str
    start_time: time
    end_time: time
    is_break: bool = False
    sort_order: Optional[int] = 1


class PeriodUpdate(BaseModel):
    period_number: Optional[int] = None
    name: Optional[str] = None
    start_time: Optional[time] = None
    end_time: Optional[time] = None
    is_break: Optional[bool] = None
    sort_order: Optional[int] = None


class TimetableSlotAssignRequest(BaseModel):
    class_id: str
    section_id: str
    day_of_week: str  # 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'
    period_id: str
    subject_id: str
    teacher_user_id: str
    room_number: Optional[str] = None
    academic_year_id: Optional[str] = None


class TimetableSlotCopyRequest(BaseModel):
    source_class_id: str
    source_section_id: str
    target_class_id: str
    target_section_id: str
    overwrite: bool = True
    academic_year_id: Optional[str] = None


