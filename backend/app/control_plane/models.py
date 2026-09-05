from sqlalchemy import Column, String, Integer, Boolean, Text, ForeignKey, Enum
from sqlalchemy.orm import relationship
from app.shared.base_models import BaseControlModel


class TenantStatus(str):
    PROVISIONING = "PROVISIONING"
    ACTIVE = "ACTIVE"
    SUSPENDED = "SUSPENDED"
    MAINTENANCE = "MAINTENANCE"


class PlatformRole(str):
    SUPER_ADMIN = "SUPER_ADMIN"
    SUPPORT_STAFF = "SUPPORT_STAFF"


class Tenant(BaseControlModel):
    __tablename__ = "tenants"

    slug = Column(String(50), unique=True, nullable=False, index=True)  # 'sample', 'ume', 'mmms'
    school_name = Column(String(255), nullable=False)
    db_name = Column(String(100), nullable=False)                       # 'tenant_sample_db'
    db_user = Column(String(100), nullable=False)
    db_password_encrypted = Column(Text, nullable=False)
    db_host = Column(String(100), default="127.0.0.1", nullable=False)
    db_port = Column(Integer, default=3306, nullable=False)
    status = Column(String(30), default=TenantStatus.PROVISIONING, nullable=False, index=True)
    admin_email = Column(String(255), nullable=False)
    admin_phone = Column(String(20), nullable=True)

    domains = relationship("TenantDomain", back_populates="tenant", cascade="all, delete-orphan")
    module_toggles = relationship("TenantModuleToggle", back_populates="tenant", cascade="all, delete-orphan")

    @property
    def db_password(self) -> str:
        return self.db_password_encrypted


class TenantDomain(BaseControlModel):
    __tablename__ = "tenant_domains"

    tenant_id = Column(String(36), ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False, index=True)
    domain = Column(String(255), unique=True, nullable=False, index=True)  # 'ume-school.com', 'sample.7aedu.com'
    is_primary = Column(Boolean, default=False, nullable=False)
    is_verified = Column(Boolean, default=True, nullable=False)

    tenant = relationship("Tenant", back_populates="domains")


class PlatformUser(BaseControlModel):
    __tablename__ = "platform_users"

    email = Column(String(255), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    full_name = Column(String(150), nullable=False)
    role = Column(String(50), default=PlatformRole.SUPER_ADMIN, nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)


class TenantModuleToggle(BaseControlModel):
    __tablename__ = "tenant_module_toggles"

    tenant_id = Column(String(36), ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False, index=True)
    module_code = Column(String(50), nullable=False)  # 'FEES', 'ATTENDANCE', 'EXAMS', 'TRANSPORT'
    is_enabled = Column(Boolean, default=True, nullable=False)

    tenant = relationship("Tenant", back_populates="module_toggles")


class PlatformAuditLog(BaseControlModel):
    __tablename__ = "platform_audit_logs"

    user_id = Column(String(36), nullable=True)
    action = Column(String(100), nullable=False)
    entity_name = Column(String(50), nullable=False)
    entity_id = Column(String(50), nullable=True)
    details = Column(Text, nullable=True)
    ip_address = Column(String(45), nullable=True)
