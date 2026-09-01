from typing import List, Optional
from datetime import date
from pydantic import BaseModel, Field


class AttendanceMarkItem(BaseModel):
    student_id: str
    attendance_status_id: str  # Lookup value ID for 'PRESENT', 'ABSENT', 'LATE', etc.
    remarks: Optional[str] = None


class SubmitAttendanceRequest(BaseModel):
    academic_year_id: str
    class_id: str
    section_id: str
    attendance_date: date
    records: List[AttendanceMarkItem]


class AttendanceRosterItem(BaseModel):
    student_id: str
    admission_no: str
    full_name: str
    roll_no: Optional[int]
    current_status_id: Optional[str] = None
    remarks: Optional[str] = None


class DailySummaryStats(BaseModel):
    total_students: int
    total_present: int
    total_absent: int
    total_late: int
    total_half_day: int
    attendance_percentage: float
