from typing import List, Optional
from datetime import datetime
from pydantic import BaseModel, EmailStr, Field


class PlatformLoginRequest(BaseModel):
    email: EmailStr
    password: str


class PlatformLoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user_id: str
    full_name: str
    email: str
    role: str


class TenantCreateRequest(BaseModel):
    slug: str = Field(..., min_length=2, max_length=50, pattern="^[a-z0-9_-]+$")
    school_name: str = Field(..., min_length=3, max_length=255)
    admin_email: EmailStr
    admin_phone: str = Field(..., min_length=10, max_length=20)
    admin_password: str = Field(..., min_length=8, max_length=100)
    primary_domain: str = Field(..., min_length=4, max_length=255)
    template_type: str = Field("CBSE_STANDARD", description="Preset: CBSE_STANDARD, STATE_BOARD, MISSION_SCHOOL, CUSTOM")
    theme_primary_color: str = Field("#1E40AF", description="Hex brand color e.g. #1E40AF or #059669")
    additional_domains: Optional[List[str]] = None
    enabled_modules: Optional[List[str]] = None


class TenantDomainSchema(BaseModel):
    id: str
    domain: str
    is_primary: bool
    is_verified: bool
    created_at: datetime

    class Config:
        from_attributes = True


class TenantResponse(BaseModel):
    id: str
    slug: str
    school_name: str
    db_name: str
    status: str
    admin_email: str
    admin_phone: Optional[str]
    domains: List[TenantDomainSchema] = []
    created_at: datetime

    class Config:
        from_attributes = True


class TenantStatusUpdateRequest(BaseModel):
    status: str = Field(..., pattern="^(ACTIVE|SUSPENDED|MAINTENANCE)$")
    reason: Optional[str] = None


class DomainAddRequest(BaseModel):
    domain: str
    is_primary: bool = False
