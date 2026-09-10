from typing import Optional, List
from datetime import date, datetime
from pydantic import BaseModel, EmailStr, Field


class DepartmentCreate(BaseModel):
    name: str = Field(..., example="Mathematics")
    code: str = Field(..., example="MATH")


class DesignationCreate(BaseModel):
    title: str = Field(..., example="Senior Teacher (TGT)")
    code: str = Field(..., example="TGT")


class StaffCreateRequest(BaseModel):
    employee_id: str = Field(..., example="EMP-001")
    first_name: str = Field(..., example="Rashid")
    last_name: Optional[str] = Field(None, example="Khan")
    email: EmailStr
    phone: str = Field(..., min_length=10, max_length=20, example="9876543211")
    password: str = Field(..., min_length=6, example="StaffPass123!")
    designation_id: str
    department_id: Optional[str] = None
    role_id: str  # e.g. Role for TEACHER, ACCOUNTANT, PRINCIPAL
    qualification: Optional[str] = None
    joining_date: date
    emergency_contact: Optional[str] = None


class StaffUpdateRequest(BaseModel):
    employee_id: Optional[str] = None
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    designation_id: Optional[str] = None
    department_id: Optional[str] = None
    role_id: Optional[str] = None
    qualification: Optional[str] = None
    joining_date: Optional[date] = None
    emergency_contact: Optional[str] = None
    is_active: Optional[bool] = None
    password: Optional[str] = Field(None, min_length=6)


class StaffResetPasswordRequest(BaseModel):
    password: str = Field(..., min_length=6, example="NewSecurePass123!")

