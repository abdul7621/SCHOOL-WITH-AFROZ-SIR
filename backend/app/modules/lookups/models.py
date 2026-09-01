from sqlalchemy import Column, String, Integer, Boolean, ForeignKey, UniqueConstraint
from sqlalchemy.orm import relationship
from app.shared.base_models import BaseTenantModel


class LookupCategory(BaseTenantModel):
    __tablename__ = "lookup_categories"

    code = Column(String(50), unique=True, nullable=False, index=True)  # 'GENDER', 'BLOOD_GROUP', 'RELIGION', 'CASTE'
    name = Column(String(100), nullable=False)
    is_system = Column(Boolean, default=False, nullable=False)

    values = relationship("LookupValue", back_populates="category", cascade="all, delete-orphan")


class LookupValue(BaseTenantModel):
    __tablename__ = "lookup_values"

    category_id = Column(String(36), ForeignKey("lookup_categories.id", ondelete="CASCADE"), nullable=False, index=True)
    code = Column(String(50), nullable=False)   # 'MALE', 'FEMALE', 'O_POS'
    label = Column(String(100), nullable=False)
    numeric_value = Column(Integer, default=0)
    is_active = Column(Boolean, default=True, nullable=False)

    category = relationship("LookupCategory", back_populates="values")

    __table_args__ = (
        UniqueConstraint("category_id", "code", name="uk_cat_val_code"),
    )


class StudentStatus(BaseTenantModel):
    __tablename__ = "student_statuses"

    code = Column(String(50), unique=True, nullable=False, index=True)  # 'ACTIVE', 'SUSPENDED', 'TRANSFERRED', 'ALUMNI'
    name = Column(String(100), nullable=False)
    allow_attendance = Column(Boolean, default=True, nullable=False)
    allow_fee_demand = Column(Boolean, default=True, nullable=False)


class PaymentMode(BaseTenantModel):
    __tablename__ = "payment_modes"

    code = Column(String(50), unique=True, nullable=False, index=True)  # 'CASH', 'UPI_QR', 'BANK_TRANSFER', 'CHEQUE'
    name = Column(String(100), nullable=False)
    requires_reference_no = Column(Boolean, default=False, nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
