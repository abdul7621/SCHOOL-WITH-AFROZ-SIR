from typing import Optional, List
from datetime import date, datetime
from pydantic import BaseModel, EmailStr, Field


class NoticeCreate(BaseModel):
    title: str = Field(..., example="School Summer Vacation Announcement")
    content: str
    category: str = "GENERAL"  # 'GENERAL', 'ACADEMIC', 'EXAM', 'HOLIDAY'
    published_date: Optional[date] = None
    is_pinned: bool = False
    is_public: bool = True
    attachment_url: Optional[str] = None


class AdmissionInquiryCreate(BaseModel):
    applicant_name: str = Field(..., example="Zaid Khan")
    parent_name: str = Field(..., example="Imran Khan")
    phone: str = Field(..., min_length=10, max_length=20, example="9876543210")
    email: Optional[EmailStr] = None
    target_class_name: str = Field(..., example="Class 5")
    message: Optional[str] = None


class GalleryMediaCreate(BaseModel):
    title: str = Field(..., example="Annual Sports Day 2026")
    album_name: str = "Annual Function"
    media_url: str
    media_type: str = "IMAGE"
    is_published: bool = True
