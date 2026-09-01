from sqlalchemy import Column, String, Numeric, Date, DateTime, Text, ForeignKey
from sqlalchemy.orm import relationship
from app.shared.base_models import BaseTenantModel


class FinanceCategory(BaseTenantModel):
    __tablename__ = "finance_categories"

    name = Column(String(100), nullable=False)                  # 'Electricity Bill', 'Building Rent', 'Office Supplies'
    category_type = Column(String(20), nullable=False)          # 'INCOME', 'EXPENSE'
    code = Column(String(50), unique=True, nullable=False, index=True)


class FinanceVoucher(BaseTenantModel):
    __tablename__ = "finance_vouchers"

    voucher_no = Column(String(50), unique=True, nullable=False, index=True) # 'VCH-2026-0001'
    voucher_type = Column(String(20), nullable=False, index=True)            # 'INCOME', 'EXPENSE', 'TRANSFER'
    transaction_date = Column(Date, nullable=False, index=True)
    amount = Column(Numeric(10, 2), nullable=False)
    category_id = Column(String(36), ForeignKey("finance_categories.id"), nullable=False)
    payment_mode_id = Column(String(36), ForeignKey("payment_modes.id"), nullable=False)
    party_name = Column(String(150), nullable=True)                          # 'Vendor / Payee / Donor'
    reference_no = Column(String(100), nullable=True)                        # Bill/Invoice No / Cheque No
    description = Column(Text, nullable=True)
    created_by_user_id = Column(String(36), ForeignKey("users.id"), nullable=False)

    # Immutability & Reversal Tracking
    status = Column(String(30), default="POSTED", nullable=False, index=True) # 'POSTED', 'CANCELLED'
    cancellation_reason = Column(Text, nullable=True)
    cancelled_by_user_id = Column(String(36), ForeignKey("users.id"), nullable=True)
    cancelled_at = Column(DateTime, nullable=True)

    category = relationship("FinanceCategory")
    payment_mode = relationship("app.modules.lookups.models.PaymentMode")
    created_by = relationship("app.modules.users_rbac.models.User", foreign_keys=[created_by_user_id])
