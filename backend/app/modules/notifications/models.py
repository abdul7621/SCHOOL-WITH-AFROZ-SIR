import uuid
from datetime import datetime
from sqlalchemy import Column, String, Text, Boolean, DateTime, Integer, ForeignKey
from sqlalchemy.dialects.mysql import VARCHAR, TIMESTAMP
from app.shared.base_models import TenantBase


class NotificationLog(TenantBase):
    __tablename__ = "notification_logs"

    id = Column(VARCHAR(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    channel = Column(VARCHAR(30), nullable=False)  # WHATSAPP, SMS, EMAIL
    recipient = Column(VARCHAR(100), nullable=False)  # Phone number or Email
    event_type = Column(VARCHAR(50), nullable=False)  # ATTENDANCE_ABSENT, FEE_RECEIPT, CIRCULAR
    template_name = Column(VARCHAR(100), nullable=True)
    message_body = Column(Text, nullable=False)
    status = Column(VARCHAR(30), default="SENT")  # PENDING, SENT, FAILED
    provider_response_id = Column(VARCHAR(255), nullable=True)
    error_message = Column(Text, nullable=True)
    created_at = Column(TIMESTAMP, default=datetime.utcnow)


class NotificationSetting(TenantBase):
    __tablename__ = "notification_settings"

    id = Column(VARCHAR(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    channel = Column(VARCHAR(30), unique=True, nullable=False)  # WHATSAPP, SMS, EMAIL
    is_enabled = Column(Boolean, default=False)
    api_key = Column(Text, nullable=True)
    api_secret = Column(Text, nullable=True)
    sender_id = Column(VARCHAR(50), nullable=True)
    whatsapp_phone_number_id = Column(VARCHAR(50), nullable=True)
    smtp_host = Column(VARCHAR(100), nullable=True)
    smtp_port = Column(Integer, default=587)
    smtp_user = Column(VARCHAR(100), nullable=True)
    smtp_password = Column(VARCHAR(255), nullable=True)
    updated_at = Column(TIMESTAMP, default=datetime.utcnow, onupdate=datetime.utcnow)
