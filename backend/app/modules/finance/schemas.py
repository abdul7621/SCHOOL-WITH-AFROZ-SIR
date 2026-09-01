from typing import List, Optional, Dict, Any
from datetime import date, datetime
from decimal import Decimal
from pydantic import BaseModel, Field


class FinanceCategoryCreate(BaseModel):
    name: str = Field(..., example="Electricity & Generator Fuel")
    category_type: str = Field(..., pattern="^(INCOME|EXPENSE)$")
    code: str = Field(..., example="UTIL_POWER")


class FinanceVoucherCreate(BaseModel):
    voucher_type: str = Field(..., pattern="^(INCOME|EXPENSE|TRANSFER)$")
    transaction_date: Optional[date] = None
    amount: Decimal = Field(..., gt=0, example=1500.00)
    category_id: str
    payment_mode_id: str
    party_name: Optional[str] = Field(None, example="Stationery Vendor")
    reference_no: Optional[str] = Field(None, example="INV-8891")
    description: Optional[str] = None


class CancelVoucherRequest(BaseModel):
    cancellation_reason: str = Field(..., min_length=5, example="Cheque bounced by bank")


class DayBookSummaryResponse(BaseModel):
    report_date: date
    total_fee_collections: Decimal
    total_other_income: Decimal
    total_expenses: Decimal
    net_cashflow: Decimal
    mode_breakdown: Dict[str, Decimal]
