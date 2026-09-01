from typing import List, Optional
from pydantic import BaseModel, EmailStr


class TenantLoginRequest(BaseModel):
    username_or_phone: str
    password: str


class TenantLoginResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    user_id: str
    username: str
    user_type: str
    roles: List[str]
    permissions: List[str]


class RefreshTokenRequest(BaseModel):
    refresh_token: str


class UserProfileResponse(BaseModel):
    id: str
    username: str
    email: Optional[str]
    phone: str
    user_type: str
    roles: List[str]
    permissions: List[str]
