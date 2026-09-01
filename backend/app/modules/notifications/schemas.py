from typing import Optional, List
from datetime import datetime
from pydantic import BaseModel, Field


class SendNotificationRequest(BaseModel):
    recipient_phone: str = Field(..., min_length=10)
    recipient_email: Optional[str] = None
    event_type: str = Field(..., description="ATTENDANCE_ABSENT, FEE_RECEIPT, CIRCULAR")
    student_name: str
    message: str


class NotificationSettingUpdate(BaseModel):
    channel: str = Field(..., pattern="^(WHATSAPP|SMS|EMAIL)$")
    is_enabled: bool
    api_key: Optional[str] = None
    api_secret: Optional[str] = None
    sender_id: Optional[str] = None
    whatsapp_phone_number_id: Optional[str] = None
    smtp_host: Optional[str] = None
    smtp_port: Optional[int] = 587
    smtp_user: Optional[str] = None
    smtp_password: Optional[str] = None


class NotificationLogResponse(BaseModel):
    id: str
    channel: str
    recipient: str
    event_type: str
    message_body: str
    status: str
    created_at: datetime

    class Config:
        from_attributes = True
