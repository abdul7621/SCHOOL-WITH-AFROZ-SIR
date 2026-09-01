from sqlalchemy import Column, String, Boolean, JSON
from app.shared.base_models import BaseTenantModel


class SystemSetting(BaseTenantModel):
    __tablename__ = "system_settings"

    setting_key = Column(String(100), unique=True, nullable=False, index=True)
    setting_value = Column(JSON, nullable=False)
    is_public = Column(Boolean, default=False, nullable=False, index=True)
    description = Column(String(255), nullable=True)
