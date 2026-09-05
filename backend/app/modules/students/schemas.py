from typing import Any, Dict, List, Optional
from datetime import date, datetime
from pydantic import BaseModel, EmailStr, Field


class ParentInfoSchema(BaseModel):
    father_name: str = Field(..., example="Mohammad Ali")
    mother_name: Optional[str] = Field(None, example="Fatima Ali")
    primary_phone: str = Field(..., min_length=10, max_length=20, example="9876543210")
    whatsapp_phone: Optional[str] = None
    email: Optional[EmailStr] = None
    address: Optional[str] = None
    father_occupation: Optional[str] = None
    mother_occupation: Optional[str] = None


class StudentAdmissionRequest(BaseModel):
    admission_no: Optional[str] = None  # If not provided, auto-generated
    first_name: str = Field(..., example="Ayan")
    last_name: Optional[str] = Field(None, example="Ali")
    dob: date = Field(..., example="2012-05-15")
    gender_id: Optional[str] = None
    blood_group_id: Optional[str] = None
    religion_id: Optional[str] = None
    caste_category_id: Optional[str] = None
    status_id: Optional[str] = None     # Defaults to 'ACTIVE'
    profile_photo_url: Optional[str] = None
    emergency_contact: Optional[str] = None
    custom_attributes: Optional[Dict[str, Any]] = None  # Dynamic fields (e.g. BPL card no)

    # Parent Information
    parent: ParentInfoSchema

    # Initial Enrollment Information
    academic_year_id: str
    class_id: str
    section_id: str
    roll_no: Optional[int] = None
    enrollment_date: Optional[date] = None


class StudentUpdateRequest(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    dob: Optional[date] = None
    gender_id: Optional[str] = None
    blood_group_id: Optional[str] = None
    religion_id: Optional[str] = None
    caste_category_id: Optional[str] = None
    status_id: Optional[str] = None
    profile_photo_url: Optional[str] = None
    emergency_contact: Optional[str] = None
    custom_attributes: Optional[Dict[str, Any]] = None


class StudentListItemResponse(BaseModel):
    id: str
    admission_no: str
    full_name: str
    dob: date
    gender_label: Optional[str] = None
    class_name: str
    section_name: str
    roll_no: Optional[int] = None
    father_name: str
    primary_phone: str
    status_name: str
    is_active: bool
    profile_photo_url: Optional[str] = None

    class Config:
        from_attributes = True


class StudentDetailResponse(BaseModel):
    id: str
    admission_no: str
    first_name: str
    last_name: Optional[str]
    dob: date
    gender_id: Optional[str]
    blood_group_id: Optional[str]
    religion_id: Optional[str]
    caste_category_id: Optional[str]
    status_id: str
    status_name: str
    emergency_contact: Optional[str]
    custom_attributes: Optional[Dict[str, Any]]
    profile_photo_url: Optional[str]

    parent: Dict[str, Any]
    current_enrollment: Optional[Dict[str, Any]]
    documents: List[Dict[str, Any]] = []

    created_at: datetime


class StudentPromotionItem(BaseModel):
    student_id: str
    target_class_id: str
    target_section_id: str
    target_roll_no: Optional[int] = None


class BulkPromotionRequest(BaseModel):
    source_academic_year_id: str
    target_academic_year_id: str
    promotions: List[StudentPromotionItem]
