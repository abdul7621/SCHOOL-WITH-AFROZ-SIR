from sqlalchemy import Column, String, Text, JSON
from app.shared.base_models import BaseTenantModel


class AuditLog(BaseTenantModel):
    __tablename__ = "audit_logs"

    user_id = Column(String(36), nullable=True, index=True)
    user_role = Column(String(50), nullable=True)
    action = Column(String(50), nullable=False, index=True)       # 'CREATE', 'UPDATE', 'REVERSE', 'LOGIN'
    entity_name = Column(String(50), nullable=False, index=True)  # 'FEE_RECEIPT', 'STUDENT', 'VOUCHER'
    entity_id = Column(String(50), nullable=True, index=True)
    old_values = Column(JSON, nullable=True)
    new_values = Column(JSON, nullable=True)
    ip_address = Column(String(45), nullable=True)
    user_agent = Column(Text, nullable=True)
