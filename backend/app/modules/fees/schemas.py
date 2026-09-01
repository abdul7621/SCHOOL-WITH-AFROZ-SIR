from typing import List, Optional, Dict, Any
from datetime import date, datetime
from decimal import Decimal
from pydantic import BaseModel, Field


# 1. Fee Heads
class FeeHeadCreate(BaseModel):
    name: str = Field(..., example="Tuition Fee")
    code: str = Field(..., example="TUITION")
    is_recurring: bool = True
    priority_order: int = 1
    description: Optional[str] = None


class FeeHeadResponse(BaseModel):
    id: str
    name: str
    code: str
    is_recurring: bool
    priority_order: int

    class Config:
        from_attributes = True


# 2. Fee Structures
class FeeStructureItemInput(BaseModel):
    fee_head_id: str
    amount: Decimal = Field(..., ge=0, example=1200.00)
    frequency: str = "MONTHLY"  # 'MONTHLY', 'QUARTERLY', 'ONE_TIME', 'TERM_WISE'


class FeeStructureCreate(BaseModel):
    academic_year_id: str
    class_id: str
    name: str = Field(..., example="Class 10 Standard Fee 2026-27")
    items: List[FeeStructureItemInput]


class FeeStructureResponse(BaseModel):
    id: str
    academic_year_id: str
    class_id: str
    name: str
    total_annual_amount: Decimal
    items: List[Dict[str, Any]] = []

    class Config:
        from_attributes = True


# 3. Installment Schedules
class FeeInstallmentScheduleCreate(BaseModel):
    academic_year_id: str
    name: str = Field(..., example="April 2026")
    installment_month: Optional[int] = Field(None, ge=1, le=12)
    due_date: date
    grace_period_days: int = 5
    late_fine_rate_per_day: Decimal = Decimal("10.00")


# 4. Concessions
class FeeConcessionTypeCreate(BaseModel):
    name: str = Field(..., example="Sibling Discount 20%")
    discount_type: str = "PERCENTAGE"  # 'PERCENTAGE', 'FIXED_AMOUNT'
    discount_value: Decimal = Field(..., ge=0, example=20.00)
    description: Optional[str] = None


class AssignStudentConcessionRequest(BaseModel):
    student_id: str
    academic_year_id: str
    concession_type_id: str
    fee_head_id: Optional[str] = None
    reason: Optional[str] = None


# 5. Bulk Fee Demand Generation
class GenerateBulkFeeDemandsRequest(BaseModel):
    academic_year_id: str
    installment_schedule_id: str
    class_id: Optional[str] = None  # If None, generates for all classes in that session


# 6. Fee Collection & Payment (Penny-Perfect)
class CollectFeePaymentRequest(BaseModel):
    student_id: str
    academic_year_id: str
    total_amount_paid: Decimal = Field(..., gt=0, example=2400.00)
    payment_mode_id: str
    transaction_reference_no: Optional[str] = None
    collection_date: Optional[date] = None
    remarks: Optional[str] = None
    # Optional manual allocation override; if empty, FIFO auto-allocation executes
    manual_allocations: Optional[List[Dict[str, Any]]] = None


class ReverseFeeReceiptRequest(BaseModel):
    reversal_reason: str = Field(..., min_length=5, example="Wrong student selected by cashier")


# 7. Fee Summaries & Receipts
class FeeReceiptResponse(BaseModel):
    receipt_no: str
    student_name: str
    admission_no: str
    class_name: str
    section_name: str
    collection_date: date
    total_amount_paid: Decimal
    payment_mode_name: str
    transaction_reference_no: Optional[str]
    collected_by_name: str
    status: str
    items: List[Dict[str, Any]] = []


class StudentFeeLedgerResponse(BaseModel):
    student_id: str
    admission_no: str
    student_name: str
    class_name: str
    section_name: str
    total_demanded: Decimal
    total_concession: Decimal
    total_fine: Decimal
    total_paid: Decimal
    net_balance_due: Decimal
    demands: List[Dict[str, Any]] = []
    receipts: List[Dict[str, Any]] = []
