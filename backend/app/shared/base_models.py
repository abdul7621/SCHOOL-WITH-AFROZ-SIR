import uuid
from datetime import datetime
from sqlalchemy import Column, String, DateTime, Boolean
from sqlalchemy.orm import DeclarativeBase, declared_attr


class Base(DeclarativeBase):
    pass


class UUIDPrimaryKeyMixin:
    @declared_attr
    def id(cls):
        return Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))


class TimestampMixin:
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)


class SoftDeleteMixin:
    is_deleted = Column(Boolean, default=False, nullable=False, index=True)
    deleted_at = Column(DateTime, nullable=True)


class BaseTenantModel(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    __abstract__ = True


TenantBase = BaseTenantModel


class BaseControlModel(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    __abstract__ = True

