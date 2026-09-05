from sqlalchemy import Column, String, Integer, Numeric, Boolean, Date, DateTime, Text, ForeignKey, UniqueConstraint
from sqlalchemy.orm import relationship
from app.shared.base_models import BaseTenantModel


class FeeHead(BaseTenantModel):
    __tablename__ = "fee_heads"

    name = Column(String(100), nullable=False)                  # 'Tuition Fee', 'Admission Fee', 'Exam Fee'
    code = Column(String(50), unique=True, nullable=False, index=True) # 'TUITION', 'ADMISSION', 'EXAM'
    is_recurring = Column(Boolean, default=True, nullable=False)
    priority_order = Column(Integer, default=1, nullable=False)  # Lower number = Higher priority in FIFO allocation
    description = Column(String(255), nullable=True)

    structure_items = relationship("FeeStructureItem", back_populates="fee_head")


class FeeStructure(BaseTenantModel):
    __tablename__ = "fee_structures"

    academic_year_id = Column(String(36), ForeignKey("academic_years.id"), nullable=False, index=True)
    class_id = Column(String(36), ForeignKey("classes.id"), nullable=False, index=True)
    name = Column(String(100), nullable=False)                  # 'Class 10 Standard Fee 2026-27'
    total_annual_amount = Column(Numeric(10, 2), default=0.00, nullable=False)

    academic_year = relationship("app.modules.academics.models.AcademicYear")
    class_level = relationship("app.modules.academics.models.ClassLevel")
    items = relationship("FeeStructureItem", back_populates="structure", cascade="all, delete-orphan")

    __table_args__ = (
        UniqueConstraint("academic_year_id", "class_id", name="uk_year_class_fee_structure"),
    )


class FeeStructureItem(BaseTenantModel):
    __tablename__ = "fee_structure_items"

    fee_structure_id = Column(String(36), ForeignKey("fee_structures.id", ondelete="CASCADE"), nullable=False, index=True)
    fee_head_id = Column(String(36), ForeignKey("fee_heads.id"), nullable=False)
    amount = Column(Numeric(10, 2), nullable=False)
    frequency = Column(String(50), default="MONTHLY", nullable=False)  # 'MONTHLY', 'QUARTERLY', 'ONE_TIME', 'TERM_WISE'

    structure = relationship("FeeStructure", back_populates="items")
    fee_head = relationship("FeeHead", back_populates="structure_items")


class FeeInstallmentSchedule(BaseTenantModel):
    __tablename__ = "fee_installment_schedules"

    academic_year_id = Column(String(36), ForeignKey("academic_years.id"), nullable=False, index=True)
    name = Column(String(100), nullable=False)                  # 'April 2026', 'Quarter 1', 'Term 1'
    installment_month = Column(Integer, nullable=True)          # 1 to 12
    due_date = Column(Date, nullable=False)
    grace_period_days = Column(Integer, default=5, nullable=False)
    late_fine_rate_per_day = Column(Numeric(10, 2), default=10.00, nullable=False)


class FeeConcessionType(BaseTenantModel):
    __tablename__ = "fee_concession_types"

    name = Column(String(100), nullable=False)                  # 'Sibling Concession 20%', 'Staff Child 50%'
    discount_type = Column(String(50), default="PERCENTAGE", nullable=False) # 'PERCENTAGE', 'FIXED_AMOUNT'
    discount_value = Column(Numeric(10, 2), nullable=False)
    description = Column(String(255), nullable=True)


class StudentFeeConcession(BaseTenantModel):
    __tablename__ = "student_fee_concessions"

    student_id = Column(String(36), ForeignKey("students.id", ondelete="CASCADE"), nullable=False, index=True)
    academic_year_id = Column(String(36), ForeignKey("academic_years.id"), nullable=False, index=True)
    concession_type_id = Column(String(36), ForeignKey("fee_concession_types.id"), nullable=False)
    fee_head_id = Column(String(36), ForeignKey("fee_heads.id"), nullable=True) # Null = Applies to all heads
    approved_by_user_id = Column(String(36), ForeignKey("users.id"), nullable=False)
    reason = Column(Text, nullable=True)

    student = relationship("app.modules.students.models.Student")
    concession_type = relationship("FeeConcessionType")
    fee_head = relationship("FeeHead")


class StudentFeeDemand(BaseTenantModel):
    __tablename__ = "student_fee_demands"

    student_id = Column(String(36), ForeignKey("students.id", ondelete="CASCADE"), nullable=False, index=True)
    academic_year_id = Column(String(36), ForeignKey("academic_years.id"), nullable=False, index=True)
    installment_schedule_id = Column(String(36), ForeignKey("fee_installment_schedules.id"), nullable=False, index=True)
    fee_head_id = Column(String(36), ForeignKey("fee_heads.id"), nullable=False, index=True)

    base_amount = Column(Numeric(10, 2), nullable=False)
    concession_amount = Column(Numeric(10, 2), default=0.00, nullable=False)
    fine_amount = Column(Numeric(10, 2), default=0.00, nullable=False)
    net_demand_amount = Column(Numeric(10, 2), nullable=False)   # (base - concession + fine)
    paid_amount = Column(Numeric(10, 2), default=0.00, nullable=False)
    balance_amount = Column(Numeric(10, 2), nullable=False)
    status = Column(String(30), default="UNPAID", nullable=False, index=True) # 'UNPAID', 'PARTIALLY_PAID', 'PAID', 'WAIVED'

    student = relationship("app.modules.students.models.Student")
    installment_schedule = relationship("FeeInstallmentSchedule")
    fee_head = relationship("FeeHead")

    __table_args__ = (
        UniqueConstraint("student_id", "installment_schedule_id", "fee_head_id", name="uk_student_schedule_head_demand"),
    )


class FeeCollection(BaseTenantModel):
    __tablename__ = "fee_collections"

    receipt_no = Column(String(50), unique=True, nullable=False, index=True) # 'RCP-2026-0001'
    student_id = Column(String(36), ForeignKey("students.id"), nullable=False, index=True)
    academic_year_id = Column(String(36), ForeignKey("academic_years.id"), nullable=False, index=True)
    collection_date = Column(Date, nullable=False, index=True)
    total_amount_paid = Column(Numeric(10, 2), nullable=False)
    payment_mode_id = Column(String(36), ForeignKey("payment_modes.id"), nullable=False)
    transaction_reference_no = Column(String(100), nullable=True)
    collected_by_user_id = Column(String(36), ForeignKey("users.id"), nullable=False)
    remarks = Column(Text, nullable=True)

    # Immutability & Reversal Tracking
    status = Column(String(30), default="CONFIRMED", nullable=False, index=True) # 'CONFIRMED', 'REVERSED'
    reversal_reason = Column(Text, nullable=True)
    reversed_by_user_id = Column(String(36), ForeignKey("users.id"), nullable=True)
    reversed_at = Column(DateTime, nullable=True)

    student = relationship("app.modules.students.models.Student")
    payment_mode = relationship("app.modules.lookups.models.PaymentMode")
    collected_by = relationship("app.modules.users_rbac.models.User", foreign_keys=[collected_by_user_id])
    items = relationship("FeeCollectionItem", back_populates="collection", cascade="all, delete-orphan")


class FeeCollectionItem(BaseTenantModel):
    __tablename__ = "fee_collection_items"

    fee_collection_id = Column(String(36), ForeignKey("fee_collections.id", ondelete="CASCADE"), nullable=False, index=True)
    student_fee_demand_id = Column(String(36), ForeignKey("student_fee_demands.id"), nullable=False, index=True)
    allocated_base_amount = Column(Numeric(10, 2), default=0.00, nullable=False)
    allocated_fine_amount = Column(Numeric(10, 2), default=0.00, nullable=False)
    total_allocated_amount = Column(Numeric(10, 2), nullable=False)

    collection = relationship("FeeCollection", back_populates="items")
    demand = relationship("StudentFeeDemand")


class FeeRefund(BaseTenantModel):
    __tablename__ = "fee_refunds"

    refund_no = Column(String(50), unique=True, nullable=False, index=True)  # 'REF-2026-0001'
    student_id = Column(String(36), ForeignKey("students.id"), nullable=False, index=True)
    fee_collection_id = Column(String(36), ForeignKey("fee_collections.id"), nullable=True, index=True)
    refund_amount = Column(Numeric(10, 2), nullable=False)
    refund_date = Column(Date, nullable=False, index=True)
    payment_mode_id = Column(String(36), ForeignKey("payment_modes.id"), nullable=False)
    reason = Column(Text, nullable=False)
    authorized_by_user_id = Column(String(36), ForeignKey("users.id"), nullable=False)

    student = relationship("app.modules.students.models.Student")
    collection = relationship("FeeCollection")
    payment_mode = relationship("app.modules.lookups.models.PaymentMode")
    authorized_by = relationship("app.modules.users_rbac.models.User", foreign_keys=[authorized_by_user_id])

